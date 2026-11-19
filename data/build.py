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


TOLERANCE = 0.005  # 0,5 %: Eurostat redondea cada partida por separado
MIN_GAP_MEUR = 2.0  # en partidas pequeñas el redondeo pesa más que el 0,5 %


def sums_match(parts: float, total: float) -> bool:
    return abs(parts - total) <= max(MIN_GAP_MEUR, TOLERANCE * abs(total))


def check_parts_add_up(amounts: dict, children: dict, label: str) -> int:
    """Comprueba que las partes suman el todo. amounts: (área, país, año) -> M€.

    children: área madre -> lista de áreas hijas. Si falta alguna hija (Eurostat
    deja huecos en algunos países), esa combinación no se puede comprobar y se salta.
    Devuelve cuántas combinaciones se comprobaron.
    """
    checked = 0
    for (area, country, year), total in amounts.items():
        if area not in children or total is None:
            continue
        parts = [amounts.get((child, country, year)) for child in children[area]]
        if any(p is None for p in parts):
            continue
        if not sums_match(sum(parts), total):
            raise ValueError(f"{label}: {area} {country} {year} suma {sum(parts):.1f}, total {total:.1f}")
        checked += 1
    return checked


def validate_spending(spending: list[dict], areas: list[dict]) -> None:
    """Para el script si el gasto no es coherente. Esto se enseña al jurado."""
    keys = [(s["area_id"], s["country"], s["year"]) for s in spending]
    if len(keys) != len(set(keys)):
        raise ValueError("gasto: hay filas duplicadas (ámbito, país, año)")
    # En contabilidad nacional un subámbito puede ser negativo si se vende más de lo que
    # se compra (terrenos en Finlandia, material militar en Eslovaquia 2023). En el total
    # o en un ámbito de nivel 1 sería un error.
    negatives = [s for s in spending if (s["amount_meur"] or 0) < 0]
    if any(len(s["area_id"]) <= 5 for s in negatives):  # TOTAL o GFxx
        raise ValueError(f"gasto: importe negativo en total o ámbito: {negatives[0]}")

    amounts = {(s["area_id"], s["country"], s["year"]): s["amount_meur"] for s in spending}
    level1 = [a["id"] for a in areas if a["level"] == 1]
    children = {"TOTAL": level1}
    for a in areas:
        if a["level"] == 2:
            children.setdefault(a["parent_id"], []).append(a["id"])
    n_total = check_parts_add_up(amounts, {"TOTAL": level1}, "ámbitos vs TOTAL")
    n_sub = check_parts_add_up(amounts, {k: v for k, v in children.items() if k != "TOTAL"}, "subámbitos vs ámbito")
    provisional = sum(s["provisional"] for s in spending)
    print(f"validación gasto: {n_total} totales y {n_sub} ámbitos cuadran; "
          f"{provisional} filas provisionales marcadas; "
          f"{len(negatives)} subámbitos negativos admitidos (ventas de activos), "
          f"{sum(s['country'] == 'ES' for s in negatives)} de España")


def validate_spending_by_type(by_type: list[dict], spending: list[dict]) -> None:
    """Los tipos económicos de un ámbito deben sumar su gasto total."""
    totals = {(s["area_id"], s["country"], s["year"]): s["amount_meur"] for s in spending}
    sums: dict[tuple, float] = {}
    for row in by_type:
        key = (row["area_id"], row["country"], row["year"])
        sums[key] = sums.get(key, 0) + row["amount_meur"]
    for key, parts in sums.items():
        if totals.get(key) is not None and not sums_match(parts, totals[key]):
            raise ValueError(f"tipos de gasto: {key} suman {parts:.1f}, total {totals[key]:.1f}")
    print(f"validación tipos de gasto: {len(sums)} combinaciones cuadran")


def build_spending_types() -> list[dict]:
    types = load_json(DATA_DIR / "spending_types.json")
    return [{"id": code, **info} for code, info in types.items()]


def build_spending_by_type() -> list[dict]:
    """Una fila por (ámbito, país, año, tipo económico) con importe en M€."""
    rows = flatten_jsonstat(load_json(RAW_DIR / "gov_10a_exp_by_type.json"))
    result = [
        {
            "area_id": row["cofog99"],
            "country": row["geo"],
            "year": int(row["time"]),
            "type_id": row["na_item"],
            "amount_meur": row["value"],
            "provisional": row["status"] == "p",
            "source_id": SPENDING_SOURCE,
        }
        for row in rows
    ]
    return sorted(result, key=lambda e: (e["country"], e["area_id"], e["year"], e["type_id"]))


PGE_SOURCE = "sepg_pge_estado_gastos"
PGE_YEARS = [2023]


def parse_amount(text: str) -> float | None:
    """'1.071.624,66' -> 1071624.66 (formato español)."""
    text = text.strip()
    return float(text.replace(".", "").replace(",", ".")) if text else None


def cell(cells: list[str], i: int) -> str:
    return cells[i] if i < len(cells) else ""


def parse_pge_csv(path: Path, year: int) -> dict:
    """Lee el CSV oficial del estado de gastos de un programa de los PGE.

    Importes en miles de euros. Estructura del CSV:
      - cabecera con 'Sección: 17 ...' y 'Programa: 453B ...'
      - una fila por organismo ('17.38;;DIRECCIÓN GENERAL DE CARRETERAS')
      - filas económicas: capítulo (1 cifra), artículo (2), concepto (3), subconcepto (5)
      - filas 'TOTAL <nombre>' que cierran capítulo, organismo y programa
    Los subconceptos llevan el importe en la columna 3; el resto, en la 4.
    """
    program = {"year": year, "organics": [], "lines": []}
    organic = None
    chapter = None
    for row in path.read_bytes().decode("cp1252").splitlines():
        cells = [c.strip() for c in row.split(";")]
        if len(cells) < 3:
            continue
        if cells[1].startswith("Sección:"):
            program["section_id"], program["section_name"] = cells[1].removeprefix("Sección:").strip().split(" ", 1)
        elif cells[1].startswith("Programa:"):
            program["program_id"], program["name"] = cells[1].removeprefix("Programa:").strip().split(" ", 1)
        elif cells[0][:1].isdigit() and not cells[1]:
            organic = {"organic_id": cells[0], "name": cells[2], "total_keur": parse_amount(cell(cells, 4))}
            program["organics"].append(organic)
        elif cells[1].isdigit():
            amount = parse_amount(cell(cells, 3)) if cell(cells, 3) else parse_amount(cell(cells, 4))
            line = {"organic_id": organic["organic_id"], "economic_code": cells[1],
                    "description": cells[2], "amount_keur": amount}
            program["lines"].append(line)
            chapter = line if len(cells[1]) == 1 else chapter
        elif cells[2].startswith("TOTAL"):
            label = cells[2].removeprefix("TOTAL").strip()
            amount = parse_amount(cell(cells, 4))
            if chapter and label == chapter["description"]:
                chapter["amount_keur"] = amount
                chapter = None
            elif organic and label == organic["name"] and organic["total_keur"] is None:
                organic["total_keur"] = amount
            elif label == program.get("name"):
                program["total_keur"] = amount
    return program


def add_undetailed(program: dict) -> None:
    """Para cada organismo, la parte del total que el documento no reparte por capítulos.

    Pasa con los organismos autónomos: la Ley da su total pero no siempre su desglose.
    """
    for organic in program["organics"]:
        chapters = sum(
            line["amount_keur"] or 0 for line in program["lines"]
            if line["organic_id"] == organic["organic_id"] and len(line["economic_code"]) == 1
        )
        organic["undetailed_keur"] = round(organic["total_keur"] - chapters, 2)


def validate_pge(program: dict, name: str) -> None:
    if program.get("total_keur") is None:
        raise ValueError(f"{name}: programa sin total")
    if any(o["total_keur"] is None for o in program["organics"]):
        raise ValueError(f"{name}: organismo sin total")
    organics = sum(o["total_keur"] for o in program["organics"])
    if abs(organics - program["total_keur"]) > 0.05:
        raise ValueError(f"{name}: organismos suman {organics}, programa {program['total_keur']}")
    if any(o["undetailed_keur"] < -0.05 for o in program["organics"]):
        raise ValueError(f"{name}: los capítulos suman más que el organismo")


def build_budget_programs() -> list[dict]:
    """Programas de gasto de los PGE con su desglose económico línea a línea."""
    policies = load_json(DATA_DIR / "pge_policies.json")
    programs = []
    for year in PGE_YEARS:
        for path in sorted((RAW_DIR / f"pge_{year}").glob("*.CSV")):
            program = parse_pge_csv(path, year)
            if program["program_id"] == "000X":  # transferencias internas: contarlas duplicaría
                continue
            add_undetailed(program)
            validate_pge(program, path.name)
            program["policy_id"] = program["program_id"][:2]
            if program["policy_id"] not in policies:
                raise ValueError(f"{path.name}: política {program['policy_id']} sin nombre")
            program["source_id"] = PGE_SOURCE
            programs.append(program)
    return sorted(programs, key=lambda p: (p["year"], p["program_id"], p["section_id"]))


def build_budget_policies() -> list[dict]:
    policies = load_json(DATA_DIR / "pge_policies.json")
    return [{"id": code, **info} for code, info in policies.items() if not code.startswith("_")]


def build_legal() -> list[dict]:
    """Ley de presupuestos de cada año, con el título que devuelve la API del BOE."""
    laws = load_json(DATA_DIR / "legal.json")
    legal = []
    for year, law in laws.items():
        if year.startswith("_"):
            continue
        metadata = load_json(RAW_DIR / "boe" / f"{law['boe_id']}.json")["data"]
        metadata = metadata[0] if isinstance(metadata, list) else metadata
        if "Presupuestos Generales del Estado" not in metadata["titulo"]:
            raise ValueError(f"{law['boe_id']} no es una ley de presupuestos: {metadata['titulo']}")
        legal.append({
            "year": int(year),
            "law_title": metadata["titulo"].rstrip("."),
            "boe_id": law["boe_id"],
            "boe_url": f"https://www.boe.es/buscar/act.php?id={law['boe_id']}",
            "note": law["note"],
        })
    return legal


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
        {
            "id": "boe_legislacion_consolidada",
            "name": "BOE · Legislación consolidada (leyes de Presupuestos Generales del Estado)",
            "publisher": "Agencia Estatal Boletín Oficial del Estado",
            "url": "https://www.boe.es/datosabiertos/",
            "license": "Reutilización libre con cita",
            "retrieved_at": today,
        },
        {
            "id": PGE_SOURCE,
            "name": "Presupuestos Generales del Estado · Estado de gastos por programas (Serie Roja)",
            "publisher": "Ministerio de Hacienda · Secretaría de Estado de Presupuestos y Gastos",
            "url": "https://www.sepg.pap.hacienda.gob.es/Presup/PGE2023Ley/MaestroDocumentos/PGE-ROM/N_23_E_R_31.htm",
            "license": "Reutilización libre con cita",
            "retrieved_at": today,
        },
    ]


def main() -> None:
    areas = build_areas()
    spending = build_spending()
    spending_by_type = build_spending_by_type()
    validate_spending(spending, areas)
    validate_spending_by_type(spending_by_type, spending)
    dataset = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "countries": [
            {"code": code, "name": name}
            for code, name in load_json(DATA_DIR / "countries.json").items()
        ],
        "areas": areas,
        "spending": spending,
        "spending_types": build_spending_types(),
        "spending_by_type": spending_by_type,
        "budget_policies": build_budget_policies(),
        "budget_programs": build_budget_programs(),
        "indicators": [],
        "crosses": [],
        "legal": build_legal(),
        "sources": build_sources(),
    }
    out = DATA_DIR / "dataset.json"
    out.write_text(json.dumps(dataset, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"dataset.json: {len(dataset['areas'])} ámbitos, {len(dataset['spending'])} filas de gasto")


if __name__ == "__main__":
    main()
