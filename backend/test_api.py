"""Tests run against sample_dataset.json so they do not depend on real data."""

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


def test_compare_with_too_few_countries_has_no_median():
    body = client.get("/api/compare?area=GF07&year=2022").json()
    assert body["eu_median"] is None
    assert [r["country"] for r in body["rows"]] == ["ES"]


def test_sources():
    ids = [s["id"] for s in client.get("/api/sources").json()["sources"]]
    assert "eurostat_tran_hv_psmod" in ids
