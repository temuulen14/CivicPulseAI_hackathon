"""Une raw/ + areas.json y escribe dataset.json con la forma del contrato.

Uso: python data/build.py   (antes: python data/fetch.py)
"""

import itertools
import json
from datetime import date, datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent
RAW_DIR = DATA_DIR / "raw"

SPENDING_SOURCE = "eurostat_gov_10a_exp"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def flatten_jsonstat(data: dict) -> list[dict]:
    """Convierte un JSON-stat 2.0 en filas {dimensión: código, ..., value, status}.

    Los valores vienen en un diccionario índice -> valor. El índice recorre las
    dimensiones en el orden de `id`, con la última variando más rápido (como un
    número en base mixta con los tamaños de `size`). Los huecos no aparecen.
    """
    dims = data["id"]
    codes_per_dim = []
    for dim in dims:
        index = data["dimension"][dim]["category"]["index"]
        codes_per_dim.append(sorted(index, key=index.get))

    status = data.get("status", {})
    rows = []
    for position, combo in enumerate(itertools.product(*codes_per_dim)):
        value = data["value"].get(str(position))
        if value is None:
            continue
        row = dict(zip(dims, combo))
        row["value"] = value
        row["status"] = status.get(str(position))
        rows.append(row)
    return rows


def build_areas() -> list[dict]:
    names = load_json(DATA_DIR / "areas.json")
    areas = []
    for code, info in names.items():
        level = 1 if len(code) == 4 else 2
        areas.append({
            "id": code,
            "level": level,
            "parent_id": None if level == 1 else code[:4],
            "name": info["name"],
            "description": info.get("description"),
            "icon": info.get("icon"),
        })
    return areas


def build_spending() -> list[dict]:
    """Una fila por (ámbito, país, año) con importe en M€ y % del PIB."""
    rows = flatten_jsonstat(load_json(RAW_DIR / "gov_10a_exp.json"))
    by_key: dict[tuple, dict] = {}
    for row in rows:
        key = (row["cofog99"], row["geo"], int(row["time"]))
        entry = by_key.setdefault(key, {
            "area_id": key[0],
            "country": key[1],
            "year": key[2],
            "amount_meur": None,
            "pct_gdp": None,
            "provisional": False,
            "source_id": SPENDING_SOURCE,
        })
        field = "amount_meur" if row["unit"] == "MIO_EUR" else "pct_gdp"
        entry[field] = row["value"]
        if row["status"] == "p":
            entry["provisional"] = True
    return sorted(by_key.values(), key=lambda e: (e["country"], e["area_id"], e["year"]))


def build_sources() -> list[dict]:
    today = date.today().isoformat()
    return [
        {
            "id": SPENDING_SOURCE,
            "name": "Eurostat · Gasto de las administraciones públicas por función (COFOG)",
            "publisher": "Eurostat",
            "url": "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table",
            "license": "Reutilización libre con cita",
            "retrieved_at": today,
        },
    ]


def main() -> None:
    dataset = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "countries": [{"code": "ES", "name": "España"}],
        "areas": build_areas(),
        "spending": build_spending(),
        "indicators": [],
        "crosses": [],
        "legal": [],
        "sources": build_sources(),
    }
    out = DATA_DIR / "dataset.json"
    out.write_text(json.dumps(dataset, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"dataset.json: {len(dataset['areas'])} ámbitos, {len(dataset['spending'])} filas de gasto")


if __name__ == "__main__":
    main()
