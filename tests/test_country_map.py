"""Check that countries with city data remain present in the generated map."""

import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import pandas as pd


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "legacy" / "world-rent"))
import maps  # noqa: E402


class CountryMapTests(unittest.TestCase):
    def test_new_zealand_has_a_colored_polygon_and_three_cities(self):
        city_data = pd.read_csv(maps.CITY_DATA)
        summary = maps.prepare_country_summary(city_data)
        new_zealand = summary.set_index("Country").loc["New Zealand"]
        self.assertEqual(int(new_zealand["CityCount"]), 3)

        with TemporaryDirectory() as directory, patch.object(maps, "MAPS_DIR", Path(directory)):
            html = maps.create_country_map(summary).read_text(encoding="utf-8")

        country_line = next(
            line.strip() for line in html.splitlines() if line.strip().startswith("const countryData = ")
        )
        countries = json.loads(country_line.removeprefix("const countryData = ").removesuffix(";"))
        new_zealand_features = [
            feature for feature in countries["features"]
            if "New Zealand" in feature["properties"]["card"]
        ]
        self.assertEqual(len(new_zealand_features), 1)
        self.assertEqual(new_zealand_features[0]["properties"]["yield"], float(new_zealand["MedianGrossRentalYieldPct"]))
        self.assertIn("Городов в расчёте</th><td>3</td>", new_zealand_features[0]["properties"]["card"])

        marker_line = next(
            line.strip() for line in html.splitlines() if line.strip().startswith("const smallCountryData = ")
        )
        markers = json.loads(marker_line.removeprefix("const smallCountryData = ").removesuffix(";"))
        self.assertTrue(any(
            feature["geometry"]["coordinates"] == [174.75, -41.25]
            and "New Zealand" in feature["properties"]["card"]
            for feature in markers["features"]
        ))


if __name__ == "__main__":
    unittest.main()
