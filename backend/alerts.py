"""Alerts.

Top half: the two rules, as pure functions that take numbers and return a
severity ("info", "warning", "critical") or None when nothing is worth flagging.
Bottom half: apply those rules to the dataset and write the alert texts.
"""

from statistics import median

# usage_mismatch: the threshold comes from each cross (Mario's call).
# Twice the threshold or more is treated as critical.
CRITICAL_FACTOR = 2.0

# international_outlier: relative distance from the EU median, in percent.
OUTLIER_INFO_PCT = 25.0
OUTLIER_WARNING_PCT = 50.0

SEVERITY_ORDER = {"info": 1, "warning": 2, "critical": 3}


def usage_mismatch(spend_share, usage_share, threshold_ratio):
    """Compare the share of spending with the share of use.

    Example: rail gets 55% of the money and carries 9.3% of travellers.
    The ratio is 5.9; with a threshold of 2 that is a critical mismatch.
    It works both ways: too much spending for the use, or too little.
    """
    if spend_share is None or usage_share is None:
        return None
    if spend_share <= 0 or usage_share <= 0 or threshold_ratio <= 1:
        return None

    ratio = spend_share / usage_share
    if ratio < 1:
        ratio = 1 / ratio  # under-funded relative to use: same distance, other side

    if ratio >= threshold_ratio * CRITICAL_FACTOR:
        return "critical"
    if ratio >= threshold_ratio:
        return "warning"
    return None


def international_outlier(spain_pct_gdp, eu_median):
    """Flag when Spain spends much more or less than the EU median (% of GDP)."""
    if spain_pct_gdp is None or not eu_median:
        return None

    distance_pct = abs(relative_difference_pct(spain_pct_gdp, eu_median))
    if distance_pct >= OUTLIER_WARNING_PCT:
        return "warning"
    if distance_pct >= OUTLIER_INFO_PCT:
        return "info"
    return None


def relative_difference_pct(value, reference):
    """How far `value` is from `reference`, as a signed percentage."""
    return (value - reference) / reference * 100


# --- Building alerts from the dataset ---------------------------------------

MIN_COUNTRIES_FOR_MEDIAN = 3


def es_number(value):
    """1234.5 -> '1234,5' (Spanish decimal comma, one decimal)."""
    return f"{value:.1f}".replace(".", ",")


def eu_median(dataset, area_id, year):
    """Median % of GDP across the countries in the dataset, or None if too few."""
    values = [row["pct_gdp"] for row in dataset.countries_spending(area_id, year)]
    if len(values) < MIN_COUNTRIES_FOR_MEDIAN:
        return None
    return round(median(values), 2)


def build_alerts(dataset, year):
    """All alerts for one year, most severe first."""
    found = usage_alerts(dataset, year) + outlier_alerts(dataset, year)
    found.sort(key=lambda alert: SEVERITY_ORDER[alert["severity"]], reverse=True)
    return found


def usage_alerts(dataset, year):
    found = []
    for cross in dataset.crosses:
        indicator = dataset.latest_indicator(cross["usage_indicator_id"], year)
        if indicator is None:
            continue

        spend_share = cross["spend_share_pct"]
        usage_share = indicator["value"]
        severity = usage_mismatch(spend_share, usage_share, cross["threshold_ratio"])
        if severity is None:
            continue

        area = dataset.areas[cross["area_id"]]
        is_subarea = area["level"] == 2
        evidence = cross.get("evidence") or [
            {"label": "Cuota de gasto", "value": spend_share, "unit": "%", "source_id": None},
            {
                "label": f"Cuota de uso ({indicator['year']})",
                "value": usage_share,
                "unit": "%",
                "source_id": indicator["source_id"],
            },
        ]
        found.append(
            {
                "id": f"{cross['id']}-{year}",
                "type": "usage_mismatch",
                "severity": severity,
                "area_id": area["parent_id"] if is_subarea else area["id"],
                "subarea_id": area["id"] if is_subarea else None,
                "year": year,
                "title": cross["title"],
                "message": (
                    f"Recibe el {es_number(spend_share)} % del gasto y supone el "
                    f"{es_number(usage_share)} % del uso. Merece una mirada."
                ),
                "evidence": evidence,
                "analyst_note": cross.get("analyst_note"),
                "source_ids": sorted({e["source_id"] for e in evidence if e.get("source_id")}),
            }
        )
    return found


def outlier_alerts(dataset, year):
    found = []
    for area in dataset.top_level_areas():
        spain = dataset.spending(area["id"], year)
        reference = eu_median(dataset, area["id"], year)
        if spain is None or reference is None:
            continue

        severity = international_outlier(spain["pct_gdp"], reference)
        if severity is None:
            continue

        difference = relative_difference_pct(spain["pct_gdp"], reference)
        direction = "más" if difference > 0 else "menos"
        found.append(
            {
                "id": f"{area['id']}-international_outlier-{year}",
                "type": "international_outlier",
                "severity": severity,
                "area_id": area["id"],
                "subarea_id": None,
                "year": year,
                "title": f"España gasta {direction} que la mediana europea en {area['name']}",
                "message": (
                    f"España dedica el {es_number(spain['pct_gdp'])} % del PIB; la mediana "
                    f"de los países comparados es el {es_number(reference)} % "
                    f"(un {es_number(abs(difference))} % {direction}). "
                    "Otros países lo reparten de forma distinta."
                ),
                "evidence": [
                    {"label": "España", "value": spain["pct_gdp"], "unit": "% del PIB", "source_id": spain["source_id"]},
                    {"label": "Mediana europea", "value": reference, "unit": "% del PIB", "source_id": spain["source_id"]},
                ],
                "analyst_note": None,
                "source_ids": [spain["source_id"]],
            }
        )
    return found
