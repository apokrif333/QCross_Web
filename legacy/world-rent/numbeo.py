"""Collect Numbeo property prices from the current city ranking and city pages."""

import argparse
import csv
from html.parser import HTMLParser
import os
from pathlib import Path
import random
import re
import socket
import statistics
import time
from urllib.parse import urlparse

from DrissionPage import ChromiumOptions, WebPage
from freeproxy.modules import BuildProxiedSession


RANKING_URL = "https://www.numbeo.com/property-investment/rankings_current.jsp"
COLUMNS = (
    "Rank",
    "City",
    "Apartment (1 bedroom) in City Centre",
    "Apartment (1 bedroom) Outside of Centre",
    "Apartment (3 bedrooms) in City Centre",
    "Apartment (3 bedrooms) Outside of Centre",
    "Price per Square Meter to Buy Apartment in City Centre",
    "Price per Square Meter to Buy Apartment Outside of Centre",
)
CITY_OUTPUT_COLUMNS = (
    "Location",
    "Country",
    "City",
    "Area",
    "Bedrooms",
    "AssumedSizeSqm",
    "MonthlyRentUSD",
    "PricePerSqmUSD",
    "EstimatedPurchasePriceUSD",
    "GrossRentalYieldPct",
    "YieldIsPlausible",
)
COUNTRY_OUTPUT_COLUMNS = (
    "Country",
    "Area",
    "Bedrooms",
    "AssumedSizeSqm",
    "CityCount",
    "MedianMonthlyRentUSD",
    "MedianPricePerSqmUSD",
    "MedianEstimatedPurchasePriceUSD",
    "MedianGrossRentalYieldPct",
)
LABELS = {
    "1 Bedroom Apartment in City Centre": COLUMNS[2],
    "1 Bedroom Apartment Outside of City Centre": COLUMNS[3],
    "3 Bedroom Apartment in City Centre": COLUMNS[4],
    "3 Bedroom Apartment Outside of City Centre": COLUMNS[5],
    "Price per Square Meter to Buy Apartment in City Centre": COLUMNS[6],
    "Price per Square Meter to Buy Apartment Outside of Centre": COLUMNS[7],
}
SCENARIOS = (
    ("City Centre", 1, 50, COLUMNS[2], COLUMNS[6]),
    ("Outside of Centre", 1, 50, COLUMNS[3], COLUMNS[7]),
    ("City Centre", 3, 110, COLUMNS[4], COLUMNS[6]),
    ("Outside of Centre", 3, 110, COLUMNS[5], COLUMNS[7]),
)
CITY_NAME_CORRECTIONS = {
    "Arhus": "Aarhus",
    "Astana (Nur-Sultan)": "Astana",
    "Marrakech": "Marrakesh",
    "The Hague (Den Haag)": "The Hague",
    "Panama City": "Panama",
    "Krakow (Cracow)": "Krakow",
    "Seville (Sevilla)": "Seville",
}


class RetryablePageError(RuntimeError):
    """The proxy returned a page that cannot be used as Numbeo data."""


def proxy_candidates():
    """Yield reachable proxy endpoints; WebPage checks Numbeo itself."""
    preferred = os.environ.get("NUMBEO_PROXY")
    if preferred:
        yield preferred
    candidates = []
    for source in ("FreeproxylistProxiedSession", "ProxydbProxiedSession"):
        try:
            session = BuildProxiedSession({"type": source, "max_pages": 1, "disable_print": True})
            candidates.extend(session.refreshproxies())
        except Exception as exc:
            print(f"Could not read {source}: {exc}", flush=True)
    random.shuffle(candidates)
    seen = set()
    for candidate in candidates:
        if candidate.protocol not in ("http", "https", "socks5"):
            continue
        scheme = "socks5" if candidate.protocol == "socks5" else "http"
        proxy = f"{scheme}://{candidate.ip}:{candidate.port}"
        if proxy in seen:
            continue
        seen.add(proxy)
        try:
            with socket.create_connection((candidate.ip, int(candidate.port)), timeout=2):
                pass
        except (OSError, ValueError):
            continue
        yield proxy


def iter_proxies(repeat: bool):
    while True:
        print("Refreshing proxy list from pyfreeproxy...", flush=True)
        yield from proxy_candidates()
        if not repeat:
            return
        print("Proxy list exhausted; refreshing again in 60 seconds. Ctrl+C to stop.", flush=True)
        time.sleep(60)


def fetch(page: WebPage, url: str) -> str:
    try:
        opened = page.get(url, retry=0)
    except Exception as exc:
        raise RuntimeError(f"Browser could not open {url}: {exc}") from exc
    if not opened or page.url.startswith("chrome-error://"):
        raise RuntimeError(f"Browser could not open {url}")
    html = page.html
    title = (page.title or "").strip().lower()
    restricted_titles = ("access restricted", "access denied", "too many requests", "service unavailable")
    if any(marker in title for marker in restricted_titles) or "429 Too Many Requests" in html:
        raise RuntimeError(f"Numbeo access is restricted in the browser: {url}")
    if not html:
        raise RuntimeError(f"Browser returned an empty page: {url}")
    return html


class RankingParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.in_city_cell = False
        self.link = None
        self.name = []
        self.cities = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "table" and (self.depth or attrs.get("id") == "t2"):
            self.depth += 1
        if not self.depth:
            return
        if tag == "td" and "cityOrCountryInIndicesTable" in attrs.get("class", "").split():
            self.in_city_cell = True
        elif tag == "a" and self.in_city_cell:
            self.link = attrs.get("href")
            self.name = []

    def handle_data(self, data):
        if self.link is not None:
            self.name.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self.link is not None:
            url = self.link
            parsed = urlparse(url)
            if parsed.netloc == "www.numbeo.com" and parsed.path.startswith("/property-investment/in/"):
                self.cities.append((" ".join("".join(self.name).split()), url))
            self.link = None
        elif tag == "td":
            self.in_city_cell = False
        elif tag == "table" and self.depth:
            self.depth -= 1


class PricesParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.cells = []
        self.row = []
        self.cell = None
        self.cell_class = ""
        self.values = {}

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag == "td":
            self.cell = []
            self.cell_class = dict(attrs).get("class", "")

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag == "td" and self.cell is not None:
            self.row.append((" ".join("".join(self.cell).split()), self.cell_class))
            self.cell = None
        elif tag == "tr" and len(self.row) >= 2:
            label = self.row[0][0]
            if label in LABELS and "priceValue" in self.row[1][1].split():
                value = self.row[1][0]
                if re.fullmatch(r"\$[\d,]+\.\d{2}", value):
                    self.values[LABELS[label]] = float(value[1:].replace(",", ""))


def parse_ranking(html: str) -> list[tuple[str, str]]:
    parser = RankingParser()
    parser.feed(html)
    if not parser.cities or len({url for _, url in parser.cities}) != len(parser.cities):
        raise RetryablePageError("Ranking page has no usable city links")
    return parser.cities


def parse_prices(html: str, city: str) -> dict:
    parser = PricesParser()
    parser.feed(html)
    missing = [column for column in COLUMNS[2:] if column not in parser.values]
    if missing:
        raise RetryablePageError(
            f"{city}: proxy returned a page without required USD prices: {', '.join(missing)}"
        )
    return parser.values


def read_progress(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        if reader.fieldnames != ["URL", *COLUMNS]:
            raise ValueError(f"Unexpected checkpoint columns: {path}")
        return {row["URL"]: row for row in reader}


def save_csv(path: Path, columns, rows) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    os.replace(temporary, path)


def split_location(location: str) -> tuple[str, str]:
    city, separator, country = location.rpartition(",")
    if not separator or not city.strip() or not country.strip():
        raise ValueError(f"Cannot split city and country: {location!r}")
    city = CITY_NAME_CORRECTIONS.get(city.strip(), city.strip())
    country = country.strip().replace(" (China)", "").replace(" (Disputed Territory)", "")
    if country == "Bosnia And Herzegovina":
        country = "Bosnia and Herzegovina"
    return city, country


def prepare_exports(source: Path) -> tuple[Path, Path]:
    """Build normalized city scenarios and country medians from numbeo.csv."""
    with source.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        missing_columns = [column for column in COLUMNS if column not in (reader.fieldnames or [])]
        if missing_columns:
            raise ValueError(f"Missing source columns: {', '.join(missing_columns)}")
        source_rows = list(reader)
    if not source_rows:
        raise ValueError(f"Numbeo source file is empty: {source}")
    locations = [row["City"].strip() for row in source_rows]
    if len(locations) != len(set(locations)):
        raise ValueError("Numbeo source contains duplicate cities")

    city_rows = []
    for row in source_rows:
        location = row["City"].strip()
        city, country = split_location(location)
        for area, bedrooms, size_sqm, rent_column, sqm_column in SCENARIOS:
            try:
                monthly_rent = float(row[rent_column])
                price_per_sqm = float(row[sqm_column])
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid price for {location}, {area}, {bedrooms} bedroom") from exc
            if monthly_rent <= 0 or price_per_sqm <= 0:
                raise ValueError(f"Non-positive price for {location}, {area}, {bedrooms} bedroom")
            purchase_price = price_per_sqm * size_sqm
            gross_yield = monthly_rent * 12 / purchase_price * 100
            city_rows.append({
                "Location": location,
                "Country": country,
                "City": city,
                "Area": area,
                "Bedrooms": bedrooms,
                "AssumedSizeSqm": size_sqm,
                "MonthlyRentUSD": round(monthly_rent, 2),
                "PricePerSqmUSD": round(price_per_sqm, 2),
                "EstimatedPurchasePriceUSD": round(purchase_price, 2),
                "GrossRentalYieldPct": round(gross_yield, 4),
                "YieldIsPlausible": 1 <= gross_yield <= 25,
            })

    grouped = {}
    for row in city_rows:
        key = (row["Country"], row["Area"], row["Bedrooms"], row["AssumedSizeSqm"])
        grouped.setdefault(key, []).append(row)
    country_rows = []
    for (country, area, bedrooms, size_sqm), rows in grouped.items():
        plausible_yields = [row["GrossRentalYieldPct"] for row in rows if row["YieldIsPlausible"]]
        country_rows.append({
            "Country": country,
            "Area": area,
            "Bedrooms": bedrooms,
            "AssumedSizeSqm": size_sqm,
            "CityCount": len(rows),
            "MedianMonthlyRentUSD": round(statistics.median(row["MonthlyRentUSD"] for row in rows), 2),
            "MedianPricePerSqmUSD": round(statistics.median(row["PricePerSqmUSD"] for row in rows), 2),
            "MedianEstimatedPurchasePriceUSD": round(
                statistics.median(row["EstimatedPurchasePriceUSD"] for row in rows), 2
            ),
            "MedianGrossRentalYieldPct": (
                round(statistics.median(plausible_yields), 4) if plausible_yields else ""
            ),
        })
    country_rows.sort(key=lambda row: (row["Country"], row["Area"], row["Bedrooms"]))

    cities_output = source.with_name("numbeo_cities.csv")
    countries_output = source.with_name("numbeo_countries.csv")
    save_csv(cities_output, CITY_OUTPUT_COLUMNS, city_rows)
    save_csv(countries_output, COUNTRY_OUTPUT_COLUMNS, country_rows)
    print(f"Prepared {len(city_rows)} city scenarios: {cities_output}", flush=True)
    print(f"Prepared {len(country_rows)} country scenarios: {countries_output}", flush=True)
    return cities_output, countries_output


def collect(output: Path, delay: float = 3.0, limit: int | None = None, proxy_attempts: int = 0) -> int:
    checkpoint = output.with_name(output.stem + ".partial.csv")
    completed = read_progress(checkpoint)
    attempts = 0
    last_error = None
    cities = None
    for proxy in iter_proxies(repeat=proxy_attempts == 0):
        attempts += 1
        budget = f"/{proxy_attempts}" if proxy_attempts else ""
        print(f"Trying proxy {attempts}{budget}: {proxy}", flush=True)
        options = ChromiumOptions().auto_port().headless().set_proxy(proxy).set_timeouts(page_load=20)
        page = None
        try:
            page = WebPage(mode="d", chromium_options=options)
            if cities is None:
                cities = parse_ranking(fetch(page, RANKING_URL))
                if limit is not None:
                    cities = cities[:limit]
            print(f"Numbeo ranking: {len(cities)} cities; already fetched: {len(completed)}", flush=True)
            for number, (city, url) in enumerate(cities, 1):
                if url in completed:
                    continue
                if number > 1:
                    time.sleep(delay)
                page_url = url + ("&" if "?" in url else "?") + "displayCurrency=USD"
                prices = parse_prices(fetch(page, page_url), city)
                completed[url] = {"URL": url, "Rank": "", "City": city, **prices}
                save_csv(checkpoint, ["URL", *COLUMNS], completed.values())
                print(f"{number}/{len(cities)} {city}", flush=True)
            rows = [completed[url] for _, url in cities]
            save_csv(output, COLUMNS, rows)
            checkpoint.unlink()
            print(f"Saved {len(rows)} cities to {output}", flush=True)
            return len(rows)
        except RuntimeError as exc:
            last_error = exc
            print(f"Proxy/page failed; retrying the same city with another proxy: {exc}", flush=True)
        finally:
            if page is not None:
                page.quit(del_data=True)
        if proxy_attempts and attempts >= proxy_attempts:
            break
    raise RuntimeError(f"No usable proxy after {attempts} browser attempts: {last_error}")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--output", type=Path)
    cli.add_argument("--delay", type=float, default=3.0, help="Seconds between city requests")
    cli.add_argument("--limit", type=int, help="Fetch only the first N ranking cities")
    cli.add_argument("--proxy-attempts", type=int, default=0, help="Maximum browser proxy attempts; 0 retries until complete or Ctrl+C")
    cli.add_argument("--prepare-only", action="store_true", help="Build city and country files from an existing numbeo.csv")
    args = cli.parse_args()
    if args.delay < 0 or (args.limit is not None and args.limit < 1) or args.proxy_attempts < 0:
        cli.error("delay and proxy-attempts must be nonnegative; limit must be positive")
    if args.limit is not None and args.output is None:
        cli.error("--limit requires --output so a sample cannot replace numbeo.csv")
    output = args.output or Path(__file__).parent / "files" / "numbeo.csv"
    try:
        if not args.prepare_only:
            collect(output, args.delay, args.limit, args.proxy_attempts)
        prepare_exports(output)
    except (RuntimeError, ValueError) as exc:
        cli.exit(1, f"{exc}\nCompleted cities remain in the checkpoint.\n")
    except KeyboardInterrupt:
        cli.exit(130, "Stopped. Completed cities remain in the checkpoint.\n")
