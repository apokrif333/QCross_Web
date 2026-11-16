"""Daily Numbeo schedule tests without network access or a real browser."""

from contextlib import ExitStack
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "legacy" / "world-rent"))
import numbeo  # noqa: E402


class FakeOptions:
    def auto_port(self):
        return self

    def headless(self):
        return self

    def set_proxy(self, _proxy):
        return self

    def set_timeouts(self, **_kwargs):
        return self

    def set_argument(self, _argument):
        return self


class FakePage:
    def __init__(self, **_kwargs):
        pass

    def quit(self, **_kwargs):
        pass


class PriceParsingTests(unittest.TestCase):
    def prices_html(self, imperial=False):
        rows = []
        for label in numbeo.LABELS:
            if imperial:
                label = label.replace("Square Meter", "Square Feet")
            rows.append(f'<tr><td>{label}</td><td class="priceValue"><span>$100.00</span></td></tr>')
        return "<table>" + "".join(rows) + "</table>"

    def test_metric_prices_are_preserved(self):
        values = numbeo.parse_prices(self.prices_html(), "Presov, Slovakia")
        self.assertEqual(values, {column: 100.0 for column in numbeo.COLUMNS[2:]})

    def test_square_feet_prices_are_normalized_without_changing_rent(self):
        values = numbeo.parse_prices(self.prices_html(imperial=True), "Presov, Slovakia")
        self.assertEqual([values[column] for column in numbeo.COLUMNS[2:6]], [100.0] * 4)
        self.assertEqual(values[numbeo.COLUMNS[6]], 1076.39)
        self.assertEqual(values[numbeo.COLUMNS[7]], 1076.39)

    def test_metric_quotes_take_precedence_in_either_row_order(self):
        metric = self.prices_html()
        imperial = self.prices_html(imperial=True)
        for html in (metric + imperial, imperial + metric):
            with self.subTest(html=html):
                values = numbeo.parse_prices(html, "Presov, Slovakia")
                self.assertEqual(values[numbeo.COLUMNS[6]], 100.0)
                self.assertEqual(values[numbeo.COLUMNS[7]], 100.0)

    def test_missing_or_non_usd_price_is_not_replaced_with_another_value(self):
        for html in (
            self.prices_html(imperial=True).replace("$100.00", "?"),
            self.prices_html(imperial=True).replace("$100.00", "€100.00"),
        ):
            with self.subTest(html=html):
                with self.assertRaisesRegex(numbeo.RetryablePageError, "observed purchase rows"):
                    numbeo.parse_prices(html, "Presov, Slovakia")


class DailyCollectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "numbeo.csv"
        self.ranking = [(f"City {number}, Country", f"https://www.numbeo.com/property-investment/in/{number}")
                        for number in range(12)]
        self.day = "2026-09-24"
        self.fetched = []
        rows = [{"Rank": "", "City": city, **{column: "1.00" for column in numbeo.COLUMNS[2:]}}
                for city, _ in self.ranking]
        numbeo.save_csv(self.source, numbeo.COLUMNS, rows)

        self.real_parse_prices = numbeo.parse_prices
        self.patches = ExitStack()
        self.addCleanup(self.patches.close)
        self.patches.enter_context(patch.object(numbeo, "ChromiumOptions", FakeOptions))
        self.patches.enter_context(patch.object(numbeo, "WebPage", FakePage))
        self.patches.enter_context(patch.object(numbeo, "iter_proxies", side_effect=lambda **_kwargs: iter(["proxy"])))
        self.patches.enter_context(patch.object(numbeo, "parse_ranking", side_effect=lambda _html: self.ranking))
        self.patches.enter_context(patch.object(numbeo, "parse_prices", side_effect=self.fake_prices))
        self.patches.enter_context(patch.object(numbeo, "fetch", side_effect=self.fake_fetch))
        self.patches.enter_context(patch.object(numbeo, "today", side_effect=lambda: self.day))
        self.patches.enter_context(patch.object(numbeo.time, "sleep"))

    def fake_fetch(self, _page, url):
        if url != numbeo.RANKING_URL:
            self.fetched.append(url)
        return url

    def fake_prices(self, _html, _city):
        return {column: "2.00" for column in numbeo.COLUMNS[2:]}

    def collect(self):
        return numbeo.collect_daily(self.source, proxy_attempts=1)

    def test_five_per_day_no_catchup_and_cycle_wrap(self):
        self.assertTrue(self.collect())
        numbeo.mark_daily_published(self.source)
        self.assertEqual(len(self.fetched), 5)
        self.assertFalse(self.collect())
        self.assertEqual(len(self.fetched), 5)

        self.day = "2026-09-25"
        self.assertTrue(self.collect())
        numbeo.mark_daily_published(self.source)
        self.assertEqual(len(self.fetched), 10)

        self.day = "2026-09-29"  # Three missed days do not create extra work.
        self.ranking.insert(0, ("New City, Country", "https://www.numbeo.com/property-investment/in/new"))
        self.assertTrue(self.collect())
        numbeo.mark_daily_published(self.source)
        self.assertEqual(len(self.fetched), 13)
        self.assertEqual(len(numbeo.read_source(self.source)), 13)
        self.assertIn("New City, Country", numbeo.read_source(self.source))

        self.day = "2026-09-30"
        self.assertTrue(self.collect())
        self.assertEqual(len(self.fetched), 18)

    def test_saved_result_replays_after_crash_without_refetch(self):
        city, url = self.ranking[0]
        result = {"Rank": "", "City": city, **{column: "3.00" for column in numbeo.COLUMNS[2:]}}
        state = {"cycle_done": [url], "day": self.day, "planned": [{"city": city, "url": url}],
                 "results": {url: result}, "published": False}
        numbeo.save_daily_state(self.source, state)
        self.assertTrue(self.collect())
        self.assertEqual(self.fetched, [])
        self.assertEqual(numbeo.read_source(self.source)[city][numbeo.COLUMNS[2]], "3.00")
        numbeo.mark_daily_published(self.source)
        self.assertFalse(self.collect())

    def test_direct_failure_resumes_only_remaining_cities_with_proxy(self):
        original = numbeo.parse_prices
        failed = False

        def fail_once(html, city):
            nonlocal failed
            if city == "City 2, Country" and not failed:
                failed = True
                raise numbeo.RetryablePageError("temporary proxy failure")
            return original(html, city)

        with (
            patch.object(numbeo, "parse_prices", side_effect=fail_once),
            patch.object(numbeo, "browser_options", wraps=numbeo.browser_options) as options,
        ):
            self.assertTrue(self.collect())
        self.assertEqual([call.args[0] for call in options.call_args_list], [None, "proxy"])
        self.assertEqual(len(numbeo.read_daily_state(self.source)["results"]), 5)
        self.assertEqual(len(self.fetched), 6)  # Only the failed city was retried.
        self.assertEqual(len({url.split("?", 1)[0] for url in self.fetched}), 5)
        numbeo.mark_daily_published(self.source)
        self.assertFalse(self.collect())

    def test_direct_success_does_not_load_proxies_even_when_configured(self):
        with (
            patch.dict(numbeo.os.environ, {"NUMBEO_PROXY": "http://configured:3128"}),
            patch.object(numbeo, "iter_proxies") as proxies,
            patch.object(numbeo, "browser_options", wraps=numbeo.browser_options) as options,
        ):
            self.assertTrue(self.collect())
        options.assert_called_once_with(None)
        proxies.assert_not_called()
        self.assertEqual(len(self.fetched), 5)

    def test_square_feet_city_pages_complete_directly_without_proxy_fallback(self):
        html = PriceParsingTests().prices_html(imperial=True)
        # Restore the real parser patched by setUp for this end-to-end path.
        with (
            patch.object(numbeo, "parse_prices", side_effect=self.real_parse_prices),
            patch.object(numbeo, "fetch", return_value=html),
            patch.object(numbeo, "iter_proxies") as proxies,
        ):
            self.assertTrue(self.collect())
        proxies.assert_not_called()
        state = numbeo.read_daily_state(self.source)
        self.assertEqual(len(state["results"]), 5)
        self.assertTrue(all(row[numbeo.COLUMNS[6]] == 1076.39 for row in state["results"].values()))

    def test_proxy_attempt_limit_excludes_initial_direct_attempt(self):
        with (
            patch.object(numbeo, "iter_proxies", return_value=iter(["first", "second"])),
            patch.object(numbeo, "fetch", side_effect=numbeo.RetryablePageError("blocked")),
            patch.object(numbeo, "browser_options", wraps=numbeo.browser_options) as options,
        ):
            with self.assertRaisesRegex(RuntimeError, "after 1 attempts"):
                self.collect()
        self.assertEqual([call.args[0] for call in options.call_args_list], [None, "first"])

    def test_bulk_collection_also_tries_direct_before_proxy(self):
        output = self.source.with_name("sample.csv")
        calls = []

        def fail_direct_once(page, url):
            calls.append(url)
            if len(calls) == 1:
                raise numbeo.RetryablePageError("direct access blocked")
            return self.fake_fetch(page, url)

        with (
            patch.object(numbeo, "fetch", side_effect=fail_direct_once),
            patch.object(numbeo, "browser_options", wraps=numbeo.browser_options) as options,
        ):
            self.assertEqual(numbeo.collect(output, limit=2, proxy_attempts=1), 2)
        self.assertEqual([call.args[0] for call in options.call_args_list], [None, "proxy"])
        self.assertEqual(len(numbeo.read_source(output)), 2)

    def test_default_mode_keeps_rotating_past_ten_failed_proxies(self):
        attempts = 0

        def fail_twelve_rankings(_page, url):
            nonlocal attempts
            if url == numbeo.RANKING_URL:
                attempts += 1
                if attempts <= 12:
                    raise numbeo.RetryablePageError("blocked proxy")
            return self.fake_fetch(_page, url)

        with (
            patch.object(numbeo, "iter_proxies", return_value=iter(f"proxy-{number}" for number in range(13))) as proxies,
            patch.object(numbeo, "fetch", side_effect=fail_twelve_rankings),
        ):
            self.assertTrue(numbeo.collect_daily(self.source))

        proxies.assert_called_once_with(repeat=True)
        self.assertEqual(attempts, 13)
        self.assertEqual(len(numbeo.read_daily_state(self.source)["results"]), 5)


    def test_thread_exhaustion_stops_before_trying_another_proxy(self):
        with (
            patch.object(numbeo, "iter_proxies", return_value=iter(["first", "second"])),
            patch.object(numbeo, "WebPage", side_effect=RuntimeError("can't start new thread")) as page,
        ):
            with self.assertRaisesRegex(numbeo.BrowserResourceError, "resources exhausted"):
                numbeo.collect_daily(self.source)
        self.assertEqual(page.call_count, 1)

    def test_navigation_resource_error_stops_rotation(self):
        with patch.object(numbeo, "fetch", side_effect=numbeo.BrowserResourceError("out of memory")):
            with self.assertRaises(numbeo.BrowserResourceError):
                numbeo.collect_daily(self.source)


class BrowserLifecycleTests(unittest.TestCase):
    def test_direct_browser_explicitly_disables_proxy(self):
        with patch.dict(numbeo.os.environ, {"NUMBEO_PROXY": "http://configured:3128"}):
            options = numbeo.browser_options(None)
        self.assertIn("--no-proxy-server", options.arguments)
        self.assertFalse(any(arg.startswith("--proxy-server=") for arg in options.arguments))

    def test_proxy_browser_uses_selected_proxy(self):
        options = numbeo.browser_options("http://selected:3128")
        self.assertIn("--proxy-server=http://selected:3128", options.arguments)
        self.assertNotIn("--no-proxy-server", options.arguments)

    def start_child(self):
        process = subprocess.Popen(
            [sys.executable, "-c", "import time; time.sleep(60)"],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )

        def cleanup():
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)

        self.addCleanup(cleanup)
        return process

    def test_failed_constructor_reaps_its_child_and_preserves_existing_child(self):
        existing = self.start_child()
        spawned = []

        def fail_start(**_kwargs):
            spawned.append(self.start_child())
            raise RuntimeError("can't start new thread")

        with patch.object(numbeo, "WebPage", side_effect=fail_start):
            with self.assertRaises(numbeo.BrowserResourceError):
                with numbeo.browser_page("http://example.invalid:3128"):
                    self.fail("A failed constructor must not yield a page")

        self.assertIsNotNone(spawned[0].poll())
        self.assertIsNone(existing.poll())

    def test_failed_quit_still_reaps_browser_process(self):
        spawned = []
        page = Mock()
        page.quit.side_effect = RuntimeError("driver disconnected")

        def start(**_kwargs):
            spawned.append(self.start_child())
            return page

        with patch.object(numbeo, "WebPage", side_effect=start):
            with self.assertRaisesRegex(numbeo.BrowserResourceError, "cleanup failed"):
                with numbeo.browser_page("http://example.invalid:3128"):
                    pass

        self.assertIsNotNone(spawned[0].poll())

    def test_fetch_reports_original_navigation_error(self):
        page = Mock()
        page.get.side_effect = ConnectionError("net::ERR_PROXY_CONNECTION_FAILED")
        with self.assertRaisesRegex(RuntimeError, "net::ERR_PROXY_CONNECTION_FAILED"):
            numbeo.fetch(page, numbeo.RANKING_URL)
        page.get.assert_called_once_with(numbeo.RANKING_URL, retry=0, show_errmsg=True)

    def test_fetch_does_not_hide_thread_exhaustion_as_page_failure(self):
        page = Mock()
        page.get.side_effect = RuntimeError("can't start new thread")
        with self.assertRaises(numbeo.BrowserResourceError):
            numbeo.fetch(page, numbeo.RANKING_URL)


if __name__ == "__main__":
    unittest.main()
