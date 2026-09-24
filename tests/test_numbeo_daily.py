"""Daily Numbeo schedule tests without network access or a real browser."""

from contextlib import ExitStack
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch


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


class FakePage:
    def __init__(self, **_kwargs):
        pass

    def quit(self, **_kwargs):
        pass


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

    def test_proxy_failure_resumes_only_remaining_cities_today(self):
        original = numbeo.parse_prices
        failed = False

        def fail_once(html, city):
            nonlocal failed
            if city == "City 2, Country" and not failed:
                failed = True
                raise numbeo.RetryablePageError("temporary proxy failure")
            return original(html, city)

        with patch.object(numbeo, "parse_prices", side_effect=fail_once):
            self.assertTrue(self.collect())
        self.assertEqual(len(numbeo.read_daily_state(self.source)["results"]), 2)

        self.assertTrue(self.collect())
        self.assertEqual(len(numbeo.read_daily_state(self.source)["results"]), 5)
        self.assertEqual(len({url.split("?", 1)[0] for url in self.fetched}), 5)
        numbeo.mark_daily_published(self.source)
        self.assertFalse(self.collect())

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


if __name__ == "__main__":
    unittest.main()
