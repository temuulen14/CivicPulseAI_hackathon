"""HTTP API. Routes only: data lookups live in dataset.py, rules in alerts.py.

Run with:  uvicorn main:app --reload   (docs at http://localhost:8000/docs)
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import models
from alerts import SEVERITY_ORDER, build_alerts, eu_median
from dataset import Dataset

app = FastAPI(title="Presupuestos públicos: gasto, uso y avisos")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # public read-only data, no credentials
    allow_methods=["GET"],
    allow_headers=["*"],
)

data = Dataset()


def resolve_year(year):
    """Default to the latest year; reject years we have no data for."""
    if year is None:
        return data.latest_year
    if year not in data.years:
        raise HTTPException(404, f"Año sin datos: {year}")
    return year


def get_area(area_id):
    area = data.areas.get(area_id)
    if area is None:
        raise HTTPException(404, f"Área no encontrada: {area_id}")
    return area


def percentage(part, whole):
    """part as % of whole, or None if either is missing."""
    if part is None or not whole:
        return None
    return round(part / whole * 100, 1)


def amount(row):
    return row["amount_meur"] if row else None


def yoy_change(area_id, year):
    """Change in amount against the previous year, in percent."""
    current = amount(data.spending(area_id, year))
    previous = amount(data.spending(area_id, year - 1))
    if current is None or not previous:
        return None
    return round((current - previous) / previous * 100, 1)


@app.get("/api/meta", response_model=models.Meta)
def meta():
    return {
        "years": data.years,
        "latest_year": data.latest_year,
        "countries": data.countries,
        "generated_at": data.generated_at,
    }


@app.get("/api/areas", response_model=models.AreaList)
def list_areas(year: int | None = None):
    year = resolve_year(year)
    total = data.spending("TOTAL", year)
    alerts = build_alerts(data, year)

    areas = []
    for area in data.top_level_areas():
        row = data.spending(area["id"], year)
        area_alerts = [a for a in alerts if a["area_id"] == area["id"]]
        worst = max((a["severity"] for a in area_alerts), key=SEVERITY_ORDER.get, default=None)
        areas.append(
            {
                "id": area["id"],
                "name": area["name"],
                "description": area["description"],
                "icon": area["icon"],
                "amount_meur": amount(row),
                "share_of_total_pct": percentage(amount(row), amount(total)),
                "pct_gdp": row["pct_gdp"] if row else None,
                "yoy_change_pct": yoy_change(area["id"], year),
                "alert_count": len(area_alerts),
                "max_severity": worst,
            }
        )
    areas.sort(key=lambda a: a["amount_meur"] or 0, reverse=True)

    return {
        "year": year,
        "total_meur": amount(total),
        "provisional": bool(total and total["provisional"]),
        "areas": areas,
    }


@app.get("/api/areas/{area_id}", response_model=models.AreaDetail)
def area_detail(area_id: str, year: int | None = None):
    area = get_area(area_id)
    year = resolve_year(year)
    row = data.spending(area_id, year)
    total = data.spending("TOTAL", year)

    history = []
    for past_year in data.years:
        past = data.spending(area_id, past_year)
        if past:
            history.append(
                {
                    "year": past_year,
                    "amount_meur": past["amount_meur"],
                    "pct_gdp": past["pct_gdp"],
                    "provisional": past["provisional"],
                }
            )

    subareas = []
    for sub in data.subareas(area_id):
        sub_amount = amount(data.spending(sub["id"], year))
        subareas.append(
            {
                "id": sub["id"],
                "name": sub["name"],
                "amount_meur": sub_amount,
                "share_of_area_pct": percentage(sub_amount, amount(row)),
            }
        )
    subareas.sort(key=lambda s: s["amount_meur"] or 0, reverse=True)

    # Indicators attached to this area or to any of its subareas.
    related_ids = [area_id] + [s["id"] for s in subareas]
    indicators = []
    for indicator_id in data.indicator_ids_for(related_ids):
        indicator = data.latest_indicator(indicator_id, year)
        if indicator:
            indicators.append(indicator)

    alerts = [
        a for a in build_alerts(data, year) if area_id in (a["area_id"], a["subarea_id"])
    ]

    return {
        "id": area_id,
        "name": area["name"],
        "description": area["description"],
        "year": year,
        "amount_meur": amount(row),
        "share_of_total_pct": percentage(amount(row), amount(total)),
        "pct_gdp": row["pct_gdp"] if row else None,
        "source_id": row["source_id"] if row else None,
        "history": history,
        "subareas": subareas,
        "indicators": indicators,
        "alerts": alerts,
        "legal": data.legal_by_year.get(year),
    }


@app.get("/api/alerts", response_model=models.AlertList)
def list_alerts(
    year: int | None = None,
    severity: models.Severity | None = None,
    type: models.AlertType | None = None,
):
    year = resolve_year(year)
    alerts = build_alerts(data, year)
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    if type:
        alerts = [a for a in alerts if a["type"] == type]
    return {"year": year, "count": len(alerts), "alerts": alerts}


@app.get("/api/compare", response_model=models.Compare)
def compare(
    area: str,
    year: int | None = None,
    countries: str | None = Query(None, description="Códigos separados por comas: ES,FR,DE"),
):
    area_info = get_area(area)
    year = resolve_year(year)

    # Rank and median always use every country, so they do not change
    # when the user filters which countries to show.
    rows = sorted(data.countries_spending(area, year), key=lambda r: r["pct_gdp"], reverse=True)
    ranked = [
        {
            "country": row["country"],
            "name": data.country_names[row["country"]],
            "value": row["pct_gdp"],
            "rank": position,
            "provisional": row["provisional"],
        }
        for position, row in enumerate(rows, start=1)
    ]

    if countries:
        wanted = {code.strip().upper() for code in countries.split(",")}
        ranked = [r for r in ranked if r["country"] in wanted]

    return {
        "area_id": area,
        "area_name": area_info["name"],
        "year": year,
        "eu_median": eu_median(data, area, year),
        "rows": ranked,
        "source_id": rows[0]["source_id"] if rows else None,
    }


@app.get("/api/sources", response_model=models.SourceList)
def sources():
    return {"sources": data.sources}
