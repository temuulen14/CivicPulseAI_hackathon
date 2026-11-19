"""Checks against the real data/dataset.json: every endpoint answers for every
year and the totals the API computes agree with the ones Mario's pipeline wrote.

Skipped if the real dataset is not there.
"""

import pytest
from fastapi.testclient import TestClient

import main
from dataset import REAL_DATASET, Dataset

pytestmark = pytest.mark.skipif(not REAL_DATASET.exists(), reason="no data/dataset.json")


@pytest.fixture(scope="module")
def client():
    """The app, serving the real dataset for the tests of this file only."""
    previous = main.data
    main.data = Dataset(REAL_DATASET)
    yield TestClient(main.app)
    main.data = previous


def get(client, url):
    response = client.get(url)
    assert response.status_code == 200, f"{url}: {response.text[:200]}"
    return response.json()


def test_every_area_answers_for_every_year(client):
    meta = get(client, "/api/meta")
    assert len(meta["years"]) >= 10
    for year in meta["years"]:
        areas = get(client, f"/api/areas?year={year}")["areas"]
        assert len(areas) == 10
        assert round(sum(a["share_of_total_pct"] for a in areas)) == 100
        get(client, f"/api/alerts?year={year}")
        for area in areas:
            get(client, f"/api/areas/{area['id']}?year={year}")
            get(client, f"/api/compare?area={area['id']}&year={year}")


def test_spending_types_add_up_to_the_area(client):
    for area in get(client, "/api/areas")["areas"]:
        detail = get(client, f"/api/areas/{area['id']}")
        by_type = sum(t["amount_meur"] for t in detail["spending_by_type"])
        assert by_type == pytest.approx(detail["amount_meur"], rel=0.005, abs=2)


def test_compare_has_the_27_countries_and_no_aggregate(client):
    rows = get(client, "/api/compare?area=GF07&year=2023")["rows"]
    assert len(rows) == 27
    assert not any(row["country"].startswith("EU") for row in rows)


def test_compare_has_the_five_non_eu_countries(client):
    body = get(client, "/api/compare?area=GF07&year=2023")
    assert {row["country"] for row in body["world_rows"]} == {"USA", "JPN", "GBR", "KOR", "AUS"}
    assert body["world_source_id"] in {s["id"] for s in get(client, "/api/sources")["sources"]}


def test_budget_policies_add_up_to_the_year_total(client):
    for year in get(client, "/api/budget/years")["years"]:
        overview = get(client, f"/api/budget?year={year['year']}")
        if year["document"] is None:
            assert overview["policies"] == []
            continue
        for field in ("total_keur", "total_without_social_security_keur", "eu_recovery_keur"):
            added = sum(p[field] for p in overview["policies"])
            assert added == pytest.approx(year[field], abs=1), (year["year"], field)


def test_every_policy_and_program_of_the_latest_budget_answers(client):
    for policy in get(client, "/api/budget")["policies"]:
        detail = get(client, f"/api/budget/policies/{policy['id']}")
        assert len(detail["programs"]) == policy["program_count"]
        assert sum(p["total_keur"] for p in detail["programs"]) == pytest.approx(
            policy["total_keur"], abs=1
        )
        for program in detail["programs"]:
            get(client, f"/api/budget/programs/{program['program_id']}")


def test_eu_recovery_adds_up_to_the_year_total(client):
    for year in get(client, "/api/budget/years")["years"]:
        body = get(client, f"/api/budget/eu-recovery?year={year['year']}")
        assert body["eu_recovery_keur"] == year["eu_recovery_keur"]
        if year["eu_recovery_keur"]:
            for rows in (body["policies"], body["programs"]):
                added = sum(row["eu_recovery_keur"] for row in rows)
                assert added == pytest.approx(year["eu_recovery_keur"], abs=1)
        else:
            assert body["programs"] == []


def test_search_answers_for_every_budget_year(client):
    for year in get(client, "/api/meta")["budget_years"]:
        body = get(client, f"/api/budget/search?q=becas&year={year}")
        assert len(body["results"]) <= 30
        for result in body["results"]:
            assert result["name_match"] or result["lines"]
