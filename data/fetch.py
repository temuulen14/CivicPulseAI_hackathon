"""Descarga los datos oficiales y los guarda tal cual en data/raw/.

Uso: python data/fetch.py
"""

import html
import json
import re
from pathlib import Path

import requests

RAW_DIR = Path(__file__).parent / "raw"
EUROSTAT_API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"

DATA_DIR = Path(__file__).parent
COUNTRIES = list(json.loads((DATA_DIR / "countries.json").read_text(encoding="utf-8")))
HOME_COUNTRY = "ES"
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
    Solo España: para 28 países serían 240 000 filas que la app no enseña.
    """
    types = json.loads((DATA_DIR / "spending_types.json").read_text(encoding="utf-8"))
    fetch_eurostat(
        "gov_10a_exp",
        {
            "geo": HOME_COUNTRY,
            "unit": "MIO_EUR",
            "sector": "S13",
            "na_item": list(types),
            "sinceTimePeriod": FIRST_YEAR,
        },
        "gov_10a_exp_by_type.json",
    )


def fetch_enrolment() -> None:
    """Alumnado matriculado por etapa (ISCED) en España, para los cruces de educación."""
    fetch_eurostat(
        "educ_uoe_enra01",
        {
            "geo": HOME_COUNTRY,
            "sex": "T",
            "worktime": "TOTAL",
            "sector": ["PUB", "PRV_DEP"],
            "isced11": ["ED0", "ED1", "ED2", "ED3", "ED4", "ED5", "ED6", "ED7", "ED8"],
            "sinceTimePeriod": FIRST_YEAR,
        },
        "educ_uoe_enra01.json",
    )


PGE_SITE = "https://www.sepg.pap.hacienda.gob.es/Presup/PGE{year}Ley/MaestroDocumentos/PGE-ROM/"
# La web de Hacienda rechaza peticiones sin cabecera de navegador.
BROWSER_HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Firefox/130.0"}


def get_page_links(url: str) -> list[tuple[str, str]]:
    """Devuelve los enlaces (href, texto) de una página de la web de los PGE."""
    response = requests.get(url, headers=BROWSER_HEADERS, timeout=60)
    response.raise_for_status()
    page = response.content.decode("cp1252")
    links = []
    for href, text in re.findall(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', page, re.S):
        text = html.unescape(re.sub(r"<[^>]+>|\s+", " ", text)).strip()
        links.append((href, text))
    return links


def find_link(links: list[tuple[str, str]], text: str) -> str:
    return next(href for href, link_text in links if link_text == text)


def fetch_pge(year: int) -> None:
    """Descarga el estado de gastos de cada programa de los PGE de un año (CSV oficiales).

    Ruta en la web: Serie Roja > Gastos. Presupuesto por programas > cada sección
    (ministerio) > Presupuesto por programas > Estado de gastos > un CSV por programa.
    """
    site = PGE_SITE.format(year=year)
    out_dir = RAW_DIR / f"pge_{year}"
    out_dir.mkdir(exist_ok=True)
    short = str(year)[2:]

    sections = [
        href for href, text in get_page_links(site + f"N_{short}_E_R_31.htm")
        if text.startswith("Sección")
    ]
    count = 0
    for section in sections:
        programs_page = find_link(get_page_links(site + section), "Presupuesto por programas")
        spending_page = find_link(get_page_links(site + programs_page), "Estado de gastos")
        program = None
        for href, text in get_page_links(site + spending_page):
            if text.startswith("Programa "):
                program = text
            elif text == "CSV" and program and "Resumen" not in program:
                response = requests.get(site + href, headers=BROWSER_HEADERS, timeout=60)
                response.raise_for_status()
                (out_dir / Path(href).name).write_bytes(response.content)
                count += 1
    print(f"PGE {year} -> raw/pge_{year}/ ({count} programas)")


BOE_API = "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{boe_id}/metadatos"


def fetch_boe() -> None:
    """Metadatos (título, fecha) de cada ley de presupuestos de legal.json."""
    laws = json.loads((DATA_DIR / "legal.json").read_text(encoding="utf-8"))
    out_dir = RAW_DIR / "boe"
    out_dir.mkdir(exist_ok=True)
    boe_ids = sorted({law["boe_id"] for year, law in laws.items() if not year.startswith("_")})
    for boe_id in boe_ids:
        url = BOE_API.format(boe_id=boe_id)
        response = requests.get(url, headers={"Accept": "application/json"}, timeout=60)
        response.raise_for_status()
        (out_dir / f"{boe_id}.json").write_text(response.text, encoding="utf-8")
    print(f"BOE -> raw/boe/ ({len(boe_ids)} leyes)")


def main() -> None:
    RAW_DIR.mkdir(exist_ok=True)
    fetch_spending()
    fetch_spending_by_type()
    fetch_enrolment()
    fetch_boe()
    fetch_pge(2023)


if __name__ == "__main__":
    main()
