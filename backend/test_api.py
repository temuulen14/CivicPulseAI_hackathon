"""Tests run against sample_dataset.json so the expected numbers never change.

test_real_dataset.py checks the real data/dataset.json.
"""

import os
from pathlib import Path

os.environ["DATASET_PATH"] = str(Path(__file__).parent / "sample_dataset.json")

from fastapi.testclient import TestClient  # noqa: E402

from alerts import international_outlier, usage_mismatch  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app)


# --- rules -------------------------------------------------------------------


def test_usage_mismatch_levels():
    assert usage_mismatch(10, 9, 2.0) is None  # similar shares
    assert usage_mismatch(20, 10, 2.0) == "warning"  # exactly at the threshold
    assert usage_mismatch(40, 10, 2.0) == "critical"  # twice the threshold


def test_usage_mismatch_works_both_ways():
    assert usage_mismatch(10, 20, 2.0) == "warning"  # under-funded for its use


def test_usage_mismatch_missing_or_zero_data():
    assert usage_mismatch(None, 10, 2.0) is None
    assert usage_mismatch(10, None, 2.0) is None
    assert usage_mismatch(10, 0, 2.0) is None


def test_international_outlier_levels():
    assert international_outlier(7.0, 7.5) is None
    assert international_outlier(5.0, 7.0) == "info"  # 28.6 % below
    assert international_outlier(3.0, 7.0) == "warning"  # 57 % below
    assert international_outlier(11.0, 7.0) == "warning"  # 57 % above
    assert international_outlier(None, 7.0) is None
    assert international_outlier(5.0, None) is None


# --- endpoints ---------------------------------------------------------------


def test_meta():
    body = client.get("/api/meta").json()
    assert body["years"] == [2022, 2023]
    assert body["latest_year"] == 2023


def test_areas_defaults_to_latest_year_and_computes_shares():
    body = client.get("/api/areas").json()
    assert body["year"] == 2023
    assert body["total_meur"] == 680225.0
    assert body["provisional"] is True

    assert [a["id"] for a in body["areas"]] == ["GF07", "GF04", "GF09"]  # by amount
    health = body["areas"][0]
    assert health["share_of_total_pct"] == 14.5  # 98900 / 680225
    assert health["yoy_change_pct"] == 5.9  # 93400 -> 98900


def test_areas_first_year_has_no_yoy():
    body = client.get("/api/areas?year=2022").json()
    assert all(a["yoy_change_pct"] is None for a in body["areas"])


def test_area_carries_its_alert_summary():
    body = client.get("/api/areas").json()
    economic = next(a for a in body["areas"] if a["id"] == "GF04")
    assert economic["alert_count"] == 1
    assert economic["max_severity"] == "critical"


def test_unknown_year_and_area_return_404():
    assert client.get("/api/areas?year=1990").status_code == 404
    assert client.get("/api/areas/GF99").status_code == 404
    assert client.get("/api/compare?area=GF99").status_code == 404


def test_area_detail():
    body = client.get("/api/areas/GF04").json()
    assert [h["year"] for h in body["history"]] == [2022, 2023]
    assert body["subareas"] == [
        {"id": "GF0405", "name": "Transporte", "amount_meur": 28897.0, "share_of_area_pct": 38.6}
    ]
    # Indicators are from 2022 but still shown for 2023 (latest available).
    assert {i["id"] for i in body["indicators"]} == {"modal_split_train", "modal_split_bus"}
    assert body["legal"]["boe_id"] == "BOE-A-2022-22128"
    assert [a["type"] for a in body["alerts"]] == ["usage_mismatch"]


def test_area_detail_without_law_for_that_year():
    assert client.get("/api/areas/GF04?year=2022").json()["legal"] is None


def test_usage_alert_content():
    body = client.get("/api/alerts?type=usage_mismatch").json()
    assert body["count"] == 1  # rail fires, bus (10 % vs 6.7 %) does not
    alert = body["alerts"][0]
    assert alert["severity"] == "critical"
    assert alert["area_id"] == "GF04"
    assert alert["subarea_id"] == "GF0405"
    assert [e["value"] for e in alert["evidence"]] == [55.0, 9.3]
    assert alert["source_ids"] == ["eurostat_tran_hv_psmod"]


def test_alerts_filter_by_severity():
    body = client.get("/api/alerts?severity=info").json()
    assert all(a["severity"] == "info" for a in body["alerts"])
    assert client.get("/api/alerts?severity=nope").status_code == 422


def test_alerts_sorted_most_severe_first():
    severities = [a["severity"] for a in client.get("/api/alerts").json()["alerts"]]
    order = {"critical": 3, "warning": 2, "info": 1}
    assert severities == sorted(severities, key=order.get, reverse=True)


def test_compare_ranks_and_median():
    body = client.get("/api/compare?area=GF07").json()
    assert body["eu_median"] == 7.1  # of 6.6, 6.9, 7.1, 8.2, 8.8
    assert [r["country"] for r in body["rows"]] == ["FR", "DE", "PT", "IT", "ES"]
    assert body["rows"][-1] == {
        "country": "ES", "name": "España", "value": 6.6, "rank": 5, "provisional": True,
    }


def test_compare_country_filter_keeps_overall_rank():
    body = client.get("/api/compare?area=GF07&countries=es,fr").json()
    assert [(r["country"], r["rank"]) for r in body["rows"]] == [("FR", 1), ("ES", 5)]
    assert body["eu_median"] == 7.1


def test_compare_adds_non_eu_countries_apart():
    body = client.get("/api/compare?area=GF07").json()
    # Highest first, with no rank: they are outside the EU ranking and median.
    assert body["world_rows"] == [
        {"country": "USA", "name": "Estados Unidos", "value": 10.0},
        {"country": "JPN", "name": "Japón", "value": 7.8},
    ]
    assert body["world_source_id"] == "oecd_cofog_table11"
    assert body["eu_median"] == 7.1 and len(body["rows"]) == 5  # unchanged


def test_compare_without_non_eu_data():
    body = client.get("/api/compare?area=GF0405").json()  # OECD data is level 1 only
    assert body["world_rows"] == [] and body["world_source_id"] is None


def test_compare_country_filter_also_applies_to_non_eu():
    body = client.get("/api/compare?area=GF07&countries=es,usa").json()
    assert [r["country"] for r in body["world_rows"]] == ["USA"]


def test_compare_with_too_few_countries_has_no_median():
    body = client.get("/api/compare?area=GF07&year=2022").json()
    assert body["eu_median"] is None
    assert [r["country"] for r in body["rows"]] == ["ES"]


def test_sources():
    ids = [s["id"] for s in client.get("/api/sources").json()["sources"]]
    assert "eurostat_tran_hv_psmod" in ids


def test_area_detail_has_yoy_and_spending_by_type():
    body = client.get("/api/areas/GF04").json()
    assert body["yoy_change_pct"] == -2.6  # 76900 -> 74900
    types = body["spending_by_type"]
    assert len(types) == 10
    amounts = [t["amount_meur"] for t in types]
    assert amounts == sorted(amounts, reverse=True)
    assert types[0]["name"] and types[0]["share_of_area_pct"] is not None


def test_area_detail_links_budget_policies():
    body = client.get("/api/areas/GF04").json()
    assert [p["id"] for p in body["budget_policies"]] == ["45", "44"]  # by total
    assert body["budget_policies"][1]["total_keur"] == 84279.24  # program 441P


# --- Presupuestos Generales del Estado ---------------------------------------
# The sample holds a few real programs of 2022 and 2023, and 2020 without document.


def test_meta_lists_budget_years():
    body = client.get("/api/meta").json()
    assert body["budget_years"] == [2020, 2022, 2023]
    assert body["latest_budget_year"] == 2023


def test_budget_years_series_with_governments():
    body = client.get("/api/budget/years").json()
    assert [y["year"] for y in body["years"]] == [2020, 2022, 2023]
    government_ids = {g["id"] for g in body["governments"]}
    for year in body["years"]:
        assert year["drafted_by"] in government_ids
        assert all(e["government_id"] in government_ids for e in year["executed_by"])


def test_budget_overview_groups_programs_by_policy():
    body = client.get("/api/budget").json()
    assert body["year"] == 2023
    assert body["document"] == "Ley"
    assert body["legal"]["boe_id"] == "BOE-A-2022-22128"
    assert [p["id"] for p in body["policies"]] == ["21", "45", "44", "32"]  # by total

    pensions = body["policies"][0]  # program 212A: 4100.0 (State) + 2803945.6 (Social Security)
    assert pensions["total_keur"] == 2808045.6
    assert pensions["total_without_social_security_keur"] == 4100.0
    assert pensions["program_count"] == 1

    infrastructure = body["policies"][1]  # 453N + 453O + 45DA (two ministries)
    assert infrastructure["total_keur"] == 95840.63
    assert infrastructure["eu_recovery_keur"] == 48339.06
    assert infrastructure["program_count"] == 3


def test_budget_year_without_document_has_nulls_and_a_note():
    body = client.get("/api/budget?year=2020").json()
    assert body["document"] is None
    assert body["total_keur"] is None
    assert body["policies"] == []
    assert "prorrogado" in body["note"]


def test_budget_policy_detail():
    body = client.get("/api/budget/policies/45?year=2023").json()
    assert body["name"] == "Infraestructuras"
    assert body["area_id"] == "GF04"
    assert [p["program_id"] for p in body["programs"]] == ["45DA", "453N", "453O"]
    assert len(body["programs"][0]["section_names"]) == 2
    assert [(h["year"], h["total_keur"]) for h in body["history"]] == [
        (2020, None),  # no document: null, never 0
        (2022, 49747.83),
        (2023, 95840.63),
    ]


def test_budget_program_detail_with_line_levels():
    body = client.get("/api/budget/programs/453o?year=2023").json()  # case-insensitive
    assert body["name"] == "Comisión de Investigación de Accidentes Ferroviarios"
    assert body["policy_name"] == "Infraestructuras"
    assert body["total_keur"] == 516.15
    lines = body["sections"][0]["lines"]
    assert [(line["economic_code"], line["level"]) for line in lines] == [
        ("1", 1), ("12", 2), ("16", 2), ("16000", 4), ("2", 1), ("22", 2), ("23", 2),
    ]
    chapters = sum(line["amount_keur"] for line in lines if line["level"] == 1)
    assert round(chapters, 2) == body["total_keur"]


def test_budget_program_split_between_ministries():
    body = client.get("/api/budget/programs/45DA").json()
    assert [s["section_id"] for s in body["sections"]] == ["23", "28"]
    assert body["total_keur"] == 78860.96  # 49828.41 + 29032.55


def test_budget_unknowns_return_404():
    assert client.get("/api/budget?year=1990").status_code == 404
    assert client.get("/api/budget/policies/99").status_code == 404
    assert client.get("/api/budget/programs/999Z").status_code == 404
    assert client.get("/api/budget/programs/212A?year=2022").status_code == 404  # only in 2023
