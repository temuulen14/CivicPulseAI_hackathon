"""Presupuestos Generales del Estado (PGE): year -> policy -> program -> lines.

Plain functions that take the dataset and return the dictionaries the API sends.
Amounts stay in thousands of euros (`_keur`), exactly as Hacienda publishes them,
so any figure can be checked against the official document.

These are budgeted credits of the central State (plus Social Security when the
document includes it). They are not comparable with the Eurostat amounts of the
rest of the API, which are executed spending of every administration.
"""

# Extension documents (2019, 2024, 2025) leave Social Security out, so the only
# series that can be compared across years is the one without this section.
SOCIAL_SECURITY_SECTION = "60"

# The length of an economic code gives its depth in the official classification.
LEVEL_BY_CODE_LENGTH = {1: 1, 2: 2, 3: 3, 5: 4}  # chapter, article, concept, subconcept


def add_up(rows, field="total_keur"):
    return round(sum(row[field] for row in rows), 2)


def totals(programs):
    """The three totals shown everywhere, or nulls when there is nothing to add."""
    if not programs:
        return {
            "total_keur": None,
            "total_without_social_security_keur": None,
            "eu_recovery_keur": None,
        }
    state_only = [p for p in programs if p["section_id"] != SOCIAL_SECURITY_SECTION]
    return {
        "total_keur": add_up(programs),
        "total_without_social_security_keur": add_up(state_only),
        "eu_recovery_keur": add_up(programs, "eu_recovery_keur"),
    }


def share(part, whole):
    if part is None or not whole:
        return None
    return round(part / whole * 100, 1)


def policy_programs(dataset, policy_id, year):
    return [p for p in dataset.programs(year) if p["policy_id"] == policy_id]


def years_series(dataset):
    """Every budget year with its context, for the evolution chart."""
    return {
        "years": [dataset.budget_years[year] for year in sorted(dataset.budget_years)],
        "governments": dataset.governments,
    }


def year_overview(dataset, year):
    """One year: its totals, who drafted and executed it, and every policy."""
    info = dataset.budget_years[year]
    programs = dataset.programs(year)

    policies = []
    for policy in dataset.budget_policies.values():
        own = [p for p in programs if p["policy_id"] == policy["id"]]
        if not own:
            continue
        sums = totals(own)
        policies.append(
            {
                **policy,
                **sums,
                "share_of_total_pct": share(sums["total_keur"], info["total_keur"]),
                "program_count": len({p["program_id"] for p in own}),
            }
        )
    policies.sort(key=lambda p: p["total_keur"], reverse=True)

    return {
        **info,
        "legal": dataset.legal_by_year.get(year),
        "source_id": programs[0]["source_id"] if programs else None,
        "policies": policies,
    }


def policy_detail(dataset, policy, year):
    """One policy: its evolution over the decade and its programs in `year`."""
    history = []
    for past_year in sorted(dataset.budget_years):
        own = policy_programs(dataset, policy["id"], past_year)
        history.append(
            {
                "year": past_year,
                "document": dataset.budget_years[past_year]["document"],
                **totals(own),
            }
        )

    # A program can be split between several ministries (sections): one row each.
    by_program = {}
    for row in policy_programs(dataset, policy["id"], year):
        by_program.setdefault(row["program_id"], []).append(row)

    programs = [
        {
            "program_id": program_id,
            "name": rows[0]["name"],
            "section_names": [row["section_name"] for row in rows],
            "total_keur": add_up(rows),
            "eu_recovery_keur": add_up(rows, "eu_recovery_keur"),
        }
        for program_id, rows in by_program.items()
    ]
    programs.sort(key=lambda p: p["total_keur"], reverse=True)

    current = policy_programs(dataset, policy["id"], year)
    return {
        **policy,
        "year": year,
        **totals(current),
        "source_id": current[0]["source_id"] if current else None,
        "history": history,
        "programs": programs,
    }


def program_detail(dataset, program_id, year):
    """One program down to the last line of the law, or None if it does not exist."""
    rows = [p for p in dataset.programs(year) if p["program_id"] == program_id]
    if not rows:
        return None

    sections = []
    for row in rows:
        lines = [
            {**line, "level": LEVEL_BY_CODE_LENGTH.get(len(line["economic_code"]))}
            for line in row["lines"]
        ]
        sections.append(
            {
                "section_id": row["section_id"],
                "section_name": row["section_name"],
                "total_keur": row["total_keur"],
                "organics": row["organics"],
                "lines": lines,
            }
        )

    first = rows[0]
    policy = dataset.budget_policies.get(first["policy_id"])
    return {
        "program_id": program_id,
        "name": first["name"],
        "year": year,
        "document": first["document"],
        "policy_id": first["policy_id"],
        "policy_name": policy["name"] if policy else None,
        "total_keur": add_up(rows),
        "eu_recovery_keur": add_up(rows, "eu_recovery_keur"),
        "source_id": first["source_id"],
        "sections": sections,
    }


def area_policies(dataset, area_id, year):
    """Budget policies we map to a spending area, with their total that year."""
    found = []
    for policy in dataset.budget_policies.values():
        if policy["area_id"] == area_id:
            found.append({**policy, **totals(policy_programs(dataset, policy["id"], year))})
    found.sort(key=lambda p: p["total_keur"] or 0, reverse=True)
    return found
