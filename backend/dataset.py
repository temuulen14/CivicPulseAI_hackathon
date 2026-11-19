"""Loads data/dataset.json once and answers simple lookups over it.

No database: the whole dataset is a few thousand rows, so it lives in
memory as plain dictionaries.
"""

import json
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).parent
REAL_DATASET = BACKEND_DIR.parent / "data" / "dataset.json"
SAMPLE_DATASET = BACKEND_DIR / "sample_dataset.json"

HOME_COUNTRY = "ES"


def default_path():
    """DATASET_PATH if set, else Mario's real dataset, else the sample."""
    if os.environ.get("DATASET_PATH"):
        return Path(os.environ["DATASET_PATH"])
    return REAL_DATASET if REAL_DATASET.exists() else SAMPLE_DATASET


def is_aggregate(country_code):
    """EU27_2020, EA20... are sums of countries, not countries."""
    return country_code.startswith(("EU", "EA"))


class Dataset:
    def __init__(self, path=None):
        raw = json.loads(Path(path or default_path()).read_text(encoding="utf-8"))

        self.generated_at = raw["generated_at"]
        self.countries = raw["countries"]
        self.sources = raw["sources"]
        self.crosses = raw.get("crosses", [])
        self.indicators = raw.get("indicators", [])

        self.country_names = {c["code"]: c["name"] for c in self.countries}
        self.areas = {a["id"]: a for a in raw["areas"]}
        self.legal_by_year = {item["year"]: item for item in raw.get("legal", [])}

        # (area_id, country, year) -> spending row
        self.spending_rows = {
            (row["area_id"], row["country"], row["year"]): row for row in raw["spending"]
        }
        self.years = sorted(
            year
            for (area_id, country, year) in self.spending_rows
            if area_id == "TOTAL" and country == HOME_COUNTRY
        )

    @property
    def latest_year(self):
        return self.years[-1]

    def spending(self, area_id, year, country=HOME_COUNTRY):
        return self.spending_rows.get((area_id, country, year))

    def top_level_areas(self):
        return [a for a in self.areas.values() if a["level"] == 1]

    def subareas(self, area_id):
        return [a for a in self.areas.values() if a["parent_id"] == area_id]

    def countries_spending(self, area_id, year):
        """Rows of every real country (no aggregates) with a % of GDP value."""
        rows = []
        for code in self.country_names:
            row = self.spending(area_id, year, code)
            if row and row["pct_gdp"] is not None and not is_aggregate(code):
                rows.append(row)
        return rows

    def latest_indicator(self, indicator_id, year, country=HOME_COUNTRY):
        """Most recent value of an indicator, not later than `year`.

        Usage statistics are often published a year behind spending,
        so an exact year match would hide most of them.
        """
        candidates = [
            i
            for i in self.indicators
            if i["id"] == indicator_id
            and i["country"] == country
            and i["year"] <= year
            and i["value"] is not None
        ]
        return max(candidates, key=lambda i: i["year"], default=None)

    def indicator_ids_for(self, area_ids):
        """Indicator ids linked to any of the given areas, in dataset order."""
        ids = []
        for indicator in self.indicators:
            if indicator["area_id"] in area_ids and indicator["id"] not in ids:
                ids.append(indicator["id"])
        return ids
