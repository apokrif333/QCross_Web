"""Build interactive country and city rental-yield maps from Numbeo exports."""

from html import escape
from pathlib import Path
import re
import time
import unicodedata

from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim
import pandas as pd
import plotly.graph_objects as go


BASE_DIR = Path(__file__).parent
FILES_DIR = BASE_DIR / "files"
MAPS_DIR = BASE_DIR / "maps"
CITY_DATA = FILES_DIR / "numbeo_cities.csv"
COUNTRY_SUMMARY = FILES_DIR / "numbeo_country_summary.csv"
COORDINATE_CACHE = FILES_DIR / "numbeo_city_coordinates.csv"
LEGACY_COORDINATES = FILES_DIR / "CountryCities.csv"

COUNTRY_COLORSCALE = [
    [0.0, "#dceefa"],
    [0.25, "#a9d4ee"],
    [0.5, "#5aa7d2"],
    [0.75, "#1673a8"],
    [1.0, "#083f68"],
]

# The 1:110m world geometry used by Plotly has no drawable polygons for these
# small territories. Markers keep them visible on the country overview.
SMALL_COUNTRY_COORDINATES = {
    "Bahrain": (26.07, 50.56),
    "Hong Kong": (22.32, 114.17),
    "Kosovo": (42.66, 21.16),
    "Malta": (35.90, 14.51),
    "Singapore": (1.35, 103.82),
}


def _normalize(value: str) -> str:
    value = str(value).replace("’", "'").replace("–", "-")
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    value = re.sub(r"\s*\([^)]*\)", "", value)
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value).split())


def _coordinate_key(country: str, city: str) -> str:
    if country == "United States":
        city = re.sub(r",\s*[A-Z]{2}$", "", city)
    aliases = {
        "odesa": "odessa",
        "kyiv": "kiev",
        "saint petersburg": "st petersburg",
        "nur sultan": "astana",
    }
    normalized_city = _normalize(city)
    normalized_city = aliases.get(normalized_city, normalized_city)
    return f"{_normalize(country)}|{normalized_city}"


def _save_coordinates(rows: list[dict]) -> None:
    temporary = COORDINATE_CACHE.with_name(COORDINATE_CACHE.name + ".tmp")
    pd.DataFrame(rows).to_csv(temporary, index=False)
    temporary.replace(COORDINATE_CACHE)


def prepare_coordinates(city_data: pd.DataFrame) -> pd.DataFrame:
    unique_cities = city_data[["Location", "Country", "City"]].drop_duplicates().copy()
    unique_cities["Key"] = [
        _coordinate_key(country, city)
        for country, city in zip(unique_cities["Country"], unique_cities["City"])
    ]

    cached_rows = []
    if COORDINATE_CACHE.exists():
        cached_rows = pd.read_csv(COORDINATE_CACHE).to_dict("records")
    cached_keys = {row["Key"] for row in cached_rows}

    if LEGACY_COORDINATES.exists():
        legacy = pd.read_csv(LEGACY_COORDINATES)
        legacy = legacy.dropna(subset=["latitude", "longitude"])
        for row in legacy.itertuples(index=False):
            key = _coordinate_key(row.Country, row.City)
            if key in cached_keys:
                continue
            cached_rows.append({
                "Key": key,
                "Location": row.CountryCity,
                "Country": row.Country,
                "City": row.City,
                "Latitude": float(row.latitude),
                "Longitude": float(row.longitude),
                "Source": "legacy-cache",
            })
            cached_keys.add(key)

    missing = unique_cities[~unique_cities["Key"].isin(cached_keys)]
    if not missing.empty:
        geocoder = Nominatim(user_agent="qcross-world-rent-maps/1.0")
        geocode = RateLimiter(
            geocoder.geocode,
            min_delay_seconds=1.1,
            max_retries=2,
            error_wait_seconds=5,
            swallow_exceptions=True,
        )
        print(f"Geocoding {len(missing)} cities; results are cached for future runs.", flush=True)
        for number, row in enumerate(missing.itertuples(index=False), 1):
            location = geocode(row.Location, language="en", exactly_one=True, timeout=15)
            cached_rows.append({
                "Key": row.Key,
                "Location": row.Location,
                "Country": row.Country,
                "City": row.City,
                "Latitude": float(location.latitude) if location else "",
                "Longitude": float(location.longitude) if location else "",
                "Source": "nominatim" if location else "not-found",
            })
            cached_keys.add(row.Key)
            _save_coordinates(cached_rows)
            print(f"Coordinates {number}/{len(missing)}", flush=True)
            time.sleep(0.05)
    elif not COORDINATE_CACHE.exists():
        _save_coordinates(cached_rows)

    coordinates = pd.DataFrame(cached_rows)
    coordinates = coordinates.drop_duplicates("Key", keep="last")
    coordinates["Latitude"] = pd.to_numeric(coordinates["Latitude"], errors="coerce")
    coordinates["Longitude"] = pd.to_numeric(coordinates["Longitude"], errors="coerce")
    result = unique_cities.merge(coordinates[["Key", "Latitude", "Longitude"]], on="Key", how="left")
    return result


def prepare_country_summary(city_data: pd.DataFrame) -> pd.DataFrame:
    plausible = city_data[city_data["YieldIsPlausible"].astype(str).str.lower().isin(("true", "1"))].copy()
    summary = plausible.groupby("Country", as_index=False).agg(
        CityCount=("Location", "nunique"),
        MedianGrossRentalYieldPct=("GrossRentalYieldPct", "median"),
    )
    summary["MedianGrossRentalYieldPct"] = summary["MedianGrossRentalYieldPct"].round(2)
    summary.sort_values("MedianGrossRentalYieldPct", ascending=False, inplace=True)
    summary.to_csv(COUNTRY_SUMMARY, index=False)
    return summary


def create_country_map(summary: pd.DataFrame) -> Path:
    output = MAPS_DIR / "countries_rental_yield.html"
    figure = go.Figure(go.Choropleth(
        locations=summary["Country"],
        locationmode="country names",
        z=summary["MedianGrossRentalYieldPct"],
        text=summary["CityCount"],
        colorscale=COUNTRY_COLORSCALE,
        zmin=4,
        zmax=10,
        marker_line_color="#ffffff",
        marker_line_width=0.5,
        colorbar={
            "title": {"text": "Валовая арендная доходность, %", "side": "bottom"},
            "orientation": "h",
            "x": 0.77,
            "xanchor": "center",
            "y": -0.06,
            "len": 0.32,
            "thickness": 14,
            "tickvals": [4, 6, 8, 10],
            "ticktext": ["< 4%", "6%", "8%", "> 10%"],
        },
        customdata=summary[["CityCount"]],
        hovertemplate=(
            "<b>%{location}</b><br>"
            "Медианная доходность: %{z:.2f}%<br>"
            "Городов в расчёте: %{customdata[0]}<extra></extra>"
        ),
    ))
    small = summary[summary["Country"].isin(SMALL_COUNTRY_COORDINATES)].copy()
    if not small.empty:
        figure.add_trace(go.Scattergeo(
            lat=[SMALL_COUNTRY_COORDINATES[country][0] for country in small["Country"]],
            lon=[SMALL_COUNTRY_COORDINATES[country][1] for country in small["Country"]],
            text=small["Country"],
            customdata=small[["CityCount", "MedianGrossRentalYieldPct"]],
            mode="markers",
            hovertemplate=(
                "<b>%{text}</b><br>"
                "Медианная доходность: %{customdata[1]:.2f}%<br>"
                "Городов в расчёте: %{customdata[0]}<extra></extra>"
            ),
            marker={
                "size": 8,
                "color": small["MedianGrossRentalYieldPct"],
                "colorscale": COUNTRY_COLORSCALE,
                "cmin": 4,
                "cmax": 10,
                "showscale": False,
                "line": {"color": "#ffffff", "width": 0.8},
            },
            showlegend=False,
        ))

    figure.update_layout(
        title={"text": "Арендная доходность по странам", "x": 0.02, "y": 0.97},
        margin={"l": 8, "r": 8, "t": 50, "b": 70},
        paper_bgcolor="#ffffff",
        geo={
            "projection_type": "natural earth",
            "showframe": False,
            "showcoastlines": False,
            "showcountries": True,
            "countrycolor": "#ffffff",
            "showland": True,
            "landcolor": "#edf1f5",
            "showocean": True,
            "oceancolor": "#ffffff",
            "bgcolor": "#ffffff",
        },
    )
    figure.write_html(output, include_plotlyjs=True, full_html=True)
    return output


def _city_card(location: str, rows: pd.DataFrame, median_yield: float) -> str:
    body = []
    for row in rows.sort_values(["Bedrooms", "Area"]).itertuples(index=False):
        area = "Центр" if row.Area == "City Centre" else "Вне центра"
        yield_class = " qcm-yield-high" if row.GrossRentalYieldPct >= 6 else ""
        body.append(
            "<tr>"
            f'<td class="qcm-object">{row.Bedrooms} спальни<span>{area}</span></td>'
            f"<td>${row.EstimatedPurchasePriceUSD:,.0f}</td>"
            f"<td>${row.MonthlyRentUSD:,.0f}</td>"
            f'<td class="qcm-yield{yield_class}">{row.GrossRentalYieldPct:.1f}%</td>'
            "</tr>"
        )
    return (
        '<div class="qcm-card-header">'
        f'<strong>{escape(location)}</strong>'
        f'<span>Медиана <b>{median_yield:.1f}%</b></span>'
        "</div>"
        '<table class="qcm-card-table">'
        "<thead><tr><th>Объект</th><th>Стоимость</th><th>Аренда / мес.</th><th>Доходность</th></tr></thead>"
        f"<tbody>{''.join(body)}</tbody>"
        "</table>"
        '<div class="qcm-card-note">Расчёт стоимости: 50 м² для 1 спальни, 110 м² для 3 спален</div>'
    )


CITY_CARD_SCRIPT = r"""
const plot = document.getElementById('{plot_id}');
const style = document.createElement('style');
style.textContent = `
  .qcm-map-card {
    position: fixed; z-index: 10000; display: none; width: 520px;
    max-width: calc(100vw - 24px); overflow: hidden; pointer-events: none;
    color: #263b4d; background: #fff; border: 1px solid #d7e0e7;
    border-radius: 7px; box-shadow: 0 10px 30px rgba(25, 49, 70, .18);
    font: 12px/1.25 Arial, sans-serif;
  }
  .qcm-card-header {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 10px 12px; background: #f5f8fa; border-bottom: 1px solid #dce4ea;
  }
  .qcm-card-header strong { color: #17344c; font-size: 14px; }
  .qcm-card-header span { color: #637887; white-space: nowrap; }
  .qcm-card-header b { color: #17344c; }
  .qcm-card-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .qcm-card-table th {
    padding: 7px 10px; color: #36556d; background: #eaf0f4; font-size: 10px;
    font-weight: 600; text-align: right; white-space: nowrap;
  }
  .qcm-card-table th:first-child { text-align: left; }
  .qcm-card-table td {
    padding: 7px 10px; border-top: 1px solid #e4eaee; text-align: right; white-space: nowrap;
  }
  .qcm-card-table tbody tr:nth-child(even) { background: #fafcfd; }
  .qcm-card-table td.qcm-object { color: #29465d; font-weight: 600; text-align: left; }
  .qcm-object span { display: block; margin-top: 1px; color: #7a8c99; font-size: 10px; font-weight: 400; }
  .qcm-card-table td.qcm-yield { color: #284760; font-weight: 700; }
  .qcm-card-table td.qcm-yield-high { color: #f04455; }
  .qcm-card-note { padding: 7px 12px 8px; color: #82919c; background: #fff; font-size: 10px; }
`;
document.head.appendChild(style);

const card = document.createElement('div');
card.className = 'qcm-map-card';
document.body.appendChild(card);
let pointerX = 0;
let pointerY = 0;
let hideTimer;

plot.addEventListener('pointermove', event => {
  pointerX = event.clientX;
  pointerY = event.clientY;
});

function positionCard() {
  const gap = 14;
  const bounds = card.getBoundingClientRect();
  let left = pointerX + gap;
  let top = pointerY + gap;
  if (left + bounds.width > window.innerWidth - 8) left = pointerX - bounds.width - gap;
  if (top + bounds.height > window.innerHeight - 8) top = pointerY - bounds.height - gap;
  card.style.left = Math.max(8, left) + 'px';
  card.style.top = Math.max(8, top) + 'px';
}

plot.on('plotly_hover', data => {
  clearTimeout(hideTimer);
  card.innerHTML = data.points[0].customdata;
  card.style.display = 'block';
  requestAnimationFrame(positionCard);
});
plot.on('plotly_unhover', () => {
  hideTimer = setTimeout(() => { card.style.display = 'none'; }, 40);
});
"""


def create_city_map(city_data: pd.DataFrame, coordinates: pd.DataFrame) -> Path:
    output = MAPS_DIR / "cities_rental_yield.html"
    merged = city_data.merge(
        coordinates[["Location", "Latitude", "Longitude"]], on="Location", how="left"
    )
    found = merged.dropna(subset=["Latitude", "Longitude"])
    missing_count = merged.loc[merged["Latitude"].isna(), "Location"].nunique()
    if missing_count:
        print(f"City map skips {missing_count} cities without coordinates.", flush=True)

    latitudes = []
    longitudes = []
    yields = []
    cards = []
    for location, rows in found.groupby("Location", sort=False):
        plausible = rows[rows["YieldIsPlausible"].astype(str).str.lower().isin(("true", "1"))]
        median_yield = float(plausible["GrossRentalYieldPct"].median())
        latitudes.append(float(rows["Latitude"].iloc[0]))
        longitudes.append(float(rows["Longitude"].iloc[0]))
        yields.append(median_yield)
        cards.append(_city_card(location, rows, median_yield))

    figure = go.Figure(go.Scattergeo(
        lat=latitudes,
        lon=longitudes,
        customdata=cards,
        mode="markers",
        hoverinfo="none",
        marker={
            "size": 8,
            "color": yields,
            "colorscale": [
                [0.0, "#4338ca"],
                [0.4, "#7c3aed"],
                [0.7, "#c026d3"],
                [1.0, "#f43f5e"],
            ],
            "cmin": 2,
            "cmax": 10,
            "opacity": 0.9,
            "line": {"color": "#ffffff", "width": 0.7},
            "colorbar": {
                "title": {"text": "Медианная доходность, %", "side": "bottom"},
                "orientation": "h",
                "x": 0.78,
                "xanchor": "center",
                "y": -0.06,
                "len": 0.32,
                "thickness": 14,
                "tickvals": [2, 4, 6, 8, 10],
            },
        },
    ))
    figure.update_layout(
        title={"text": "Арендная доходность и стоимость объектов по городам", "x": 0.02, "y": 0.97},
        margin={"l": 8, "r": 8, "t": 50, "b": 70},
        paper_bgcolor="#ffffff",
        geo={
            "projection_type": "natural earth",
            "showframe": False,
            "showcoastlines": False,
            "showcountries": True,
            "countrycolor": "#ffffff",
            "showland": True,
            "landcolor": "#edf1f5",
            "showocean": True,
            "oceancolor": "#ffffff",
            "bgcolor": "#ffffff",
        },
    )
    figure.write_html(
        output,
        include_plotlyjs=True,
        full_html=True,
        post_script=CITY_CARD_SCRIPT,
    )
    return output


def build_maps() -> tuple[Path, Path]:
    MAPS_DIR.mkdir(parents=True, exist_ok=True)
    if not CITY_DATA.exists():
        raise FileNotFoundError(f"Prepare Numbeo exports first: {CITY_DATA}")
    city_data = pd.read_csv(CITY_DATA)
    summary = prepare_country_summary(city_data)
    coordinates = prepare_coordinates(city_data)
    country_map = create_country_map(summary)
    city_map = create_city_map(city_data, coordinates)
    print(f"Country map: {country_map}", flush=True)
    print(f"City map: {city_map}", flush=True)
    return country_map, city_map


if __name__ == "__main__":
    build_maps()
