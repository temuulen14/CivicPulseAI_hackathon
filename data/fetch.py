"""Descarga los datos oficiales y los guarda tal cual en data/raw/.

Uso: python data/fetch.py
"""

import json
from pathlib import Path

import requests

RAW_DIR = Path(__file__).parent / "raw"
EUROSTAT_API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"

COUNTRIES = ["ES"]
FIRST_YEAR = 2015


def fetch_eurostat(dataset: str, params: dict, filename: str) -> None:
    """Pide un dataset a Eurostat (JSON-stat 2.0) y guarda la respuesta en raw/."""
    url = f"{EUROSTAT_API}/{dataset}"
    response = requests.get(url, params={"format": "JSON", **params}, timeout=60)
    response.raise_for_status()
    (RAW_DIR / filename).write_text(response.text, encoding="utf-8")
    values = len(response.json().get("value", {}))
    print(f"{dataset} -> raw/{filename} ({values} valores)")


def fetch_spending() -> None:
    """Gasto de las administraciones públicas (S13) por función COFOG."""
    fetch_eurostat(
        "gov_10a_exp",
        {
            "geo": COUNTRIES,
            "unit": ["MIO_EUR", "PC_GDP"],
            "sector": "S13",
            "na_item": "TE",
            "sinceTimePeriod": FIRST_YEAR,
        },
        "gov_10a_exp.json",
    )


def fetch_spending_by_type() -> None:
    """El mismo gasto, repartido por tipo económico (personal, compras, inversión...).

    Los códigos de spending_types.json no se solapan y suman el total (TE).
    """
    types = json.loads((Path(__file__).parent / "spending_types.json").read_text(encoding="utf-8"))
    fetch_eurostat(
        "gov_10a_exp",
        {
            "geo": COUNTRIES,
            "unit": "MIO_EUR",
            "sector": "S13",
            "na_item": list(types),
            "sinceTimePeriod": FIRST_YEAR,
        },
        "gov_10a_exp_by_type.json",
    )


def main() -> None:
    RAW_DIR.mkdir(exist_ok=True)
    fetch_spending()
    fetch_spending_by_type()


if __name__ == "__main__":
    main()
