"""Descarga los datos oficiales y los guarda tal cual en data/raw/.

Uso: python data/fetch.py
"""

import html
import json
import re
from pathlib import Path

import requests
import urllib3

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


def fetch_pensions() -> None:
    """Pensionistas por tipo de pensión en España, para los cruces de protección social."""
    fetch_eurostat(
        "spr_pns_ben",
        {
            "geo": HOME_COUNTRY,
            "sex": "T",
            "spdepm": "TOTAL",
            "spscheme": "TOTAL",
            "spdepb": ["OLD_TOT", "SRV", "DIS_TOT"],
            "sinceTimePeriod": FIRST_YEAR,
        },
        "spr_pns_ben.json",
    )


PGE_SITE = "https://www.sepg.pap.hacienda.gob.es/Presup/PGE{year}{kind}/MaestroDocumentos/PGE-ROM/"
# La web de Hacienda rechaza peticiones sin cabecera de navegador.
BROWSER_HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Firefox/130.0"}

# Qué documento de los PGE hay cada año (Ley, Prorroga o ninguno) está en legal.json.
LEGAL = json.loads((DATA_DIR / "legal.json").read_text(encoding="utf-8"))
PGE_DOCUMENTS = {
    int(year): law["pge_document"]
    for year, law in LEGAL.items()
    if not year.startswith("_") and law["pge_document"]
}


# El servidor de Hacienda corta alguna conexión cuando se le piden cientos de ficheros:
# se reintenta hasta 5 veces con espera creciente.
session = requests.Session()
session.headers.update(BROWSER_HEADERS)
session.mount("https://", requests.adapters.HTTPAdapter(
    max_retries=urllib3.util.Retry(total=5, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
))


def get_page_links(url: str) -> list[tuple[str, str]]:
    """Devuelve los enlaces (href, texto) de una página de la web de los PGE."""
    response = session.get(url, timeout=60)
    response.raise_for_status()
    page = response.content.decode("cp1252")
    links = []
    for href, text in re.findall(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', page, re.S):
        text = html.unescape(re.sub(r"<[^>]+>|\s+", " ", text)).strip()
        links.append((href, text))
    return links


def find_link(links: list[tuple[str, str]], text: str) -> str:
    return next(href for href, link_text in links if link_text.startswith(text))


def html_table_to_csv(page: bytes) -> bytes:
    """Convierte la tabla HTML de un programa en el mismo CSV que publica Hacienda.

    2015 y 2016 solo están en HTML (25 MB por año, casi todo estilos). La tabla tiene
    las mismas columnas que el CSV de otros años, así que se guarda en ese formato.
    """
    rows = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page.decode("cp1252"), re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        # Un ";" dentro de un texto movería las columnas del CSV: se cambia por ",".
        texts = (html.unescape(re.sub(r"<[^>]+>", "", c)).strip().replace(";", ",") for c in cells)
        rows.append(";".join(texts))
    return "\n".join(rows).encode("cp1252")


def download_program(site: str, name: str, out_dir: Path) -> None:
    """Guarda el CSV oficial de un programa; si no existe, lo extrae del HTML."""
    response = session.get(f"{site}doc/CSV/{name}.CSV", timeout=60)
    if response.status_code == 200:
        (out_dir / f"{name}.CSV").write_bytes(response.content)
        return
    response = session.get(f"{site}doc/HTM/{name}.HTM", timeout=60)
    response.raise_for_status()
    (out_dir / f"{name}.CSV").write_bytes(html_table_to_csv(response.content))


def fetch_pge(year: int) -> None:
    """Descarga el estado de gastos de cada programa de los PGE de un año (Ley o prórroga).

    Ruta en la web: Serie Roja > Gastos. Presupuesto por programas > cada sección
    (ministerio) > Presupuesto por programas > Estado de gastos > un fichero por programa.
    """
    kind = PGE_DOCUMENTS[year]
    site = PGE_SITE.format(year=year, kind=kind)
    prefix = f"N_{str(year)[2:]}{'P' if kind == 'Prorroga' else ''}_E_R_31"
    out_dir = RAW_DIR / f"pge_{year}"
    out_dir.mkdir(exist_ok=True)

    sections = [
        href for href, text in get_page_links(site + f"{prefix}.htm")
        if text.startswith("Sección")
    ]
    count = 0
    for section in sections:
        programs_page = find_link(get_page_links(site + section), "Presupuesto por programas")
        spending_page = find_link(get_page_links(site + programs_page), "Estado de gastos")
        for href, text in get_page_links(site + spending_page):
            if text.startswith("Programa ") and "Resumen" not in text and href.upper().endswith(".PDF"):
                download_program(site, Path(href).stem, out_dir)
                count += 1
    print(f"PGE {year} ({kind}) -> raw/pge_{year}/ ({len(sections)} secciones, {count} programas)")


OECD_API = "https://sdmx.oecd.org/public/rest/data/{flow}/{key}"


def fetch_oecd() -> None:
    """Gasto público por función (COFOG) y PIB de las grandes economías fuera de la UE.

    Las dos tablas vienen en moneda nacional; build.py calcula el % del PIB.
    """
    world = json.loads((DATA_DIR / "world_countries.json").read_text(encoding="utf-8"))
    areas = "+".join([code for code in world if not code.startswith("_")] + ["ESP"])
    # La clave SDMX lleva un valor (o vacío = todos) por dimensión, en orden.
    cofog_key = ".".join(["A", areas, "S13", "", "", "OTE", "", "", "XDC", "", "", "", ""])
    gdp_key = ".".join(["A", areas, "S1", "", "B1GQ", "", "", "", "XDC", "V", "", ""])
    for flow, key, filename in [
        ("OECD.SDD.NAD,DSD_NASEC10@DF_TABLE11,", cofog_key, "oecd_cofog.csv"),
        ("OECD.SDD.NAD,DSD_NAMAIN10@DF_TABLE1_EXPENDITURE,", gdp_key, "oecd_gdp.csv"),
    ]:
        url = OECD_API.format(flow=flow, key=key)
        params = {"startPeriod": FIRST_YEAR, "format": "csvfilewithlabels"}
        response = requests.get(url, params=params, timeout=120)
        response.raise_for_status()
        (RAW_DIR / filename).write_bytes(response.content)
        print(f"OCDE -> raw/{filename} ({response.text.count(chr(10)) - 1} filas)")


BOE_API = "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{boe_id}/metadatos"


def fetch_boe() -> None:
    """Metadatos (título, fecha) de cada ley de presupuestos de legal.json."""
    laws = LEGAL
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
    fetch_pensions()
    fetch_oecd()
    fetch_boe()
    for year in PGE_DOCUMENTS:
        fetch_pge(year)


if __name__ == "__main__":
    main()
