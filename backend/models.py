"""Response models. They mirror docs/API_CONTRACT.md one to one."""

from typing import Literal

from pydantic import BaseModel

Severity = Literal["info", "warning", "critical"]
AlertType = Literal["usage_mismatch", "international_outlier"]


class Country(BaseModel):
    code: str
    name: str


class Meta(BaseModel):
    years: list[int]
    latest_year: int
    countries: list[Country]
    generated_at: str
    budget_years: list[int]
    latest_budget_year: int | None


class Evidence(BaseModel):
    label: str
    value: float
    unit: str
    source_id: str | None = None


class Alert(BaseModel):
    id: str
    type: AlertType
    severity: Severity
    area_id: str
    subarea_id: str | None = None
    year: int
    title: str
    message: str
    evidence: list[Evidence]
    analyst_note: str | None = None
    source_ids: list[str]


class AreaSummary(BaseModel):
    id: str
    name: str
    description: str | None
    icon: str | None
    amount_meur: float | None
    share_of_total_pct: float | None
    pct_gdp: float | None
    yoy_change_pct: float | None
    alert_count: int
    max_severity: Severity | None


class AreaList(BaseModel):
    year: int
    total_meur: float | None
    provisional: bool
    areas: list[AreaSummary]


class HistoryPoint(BaseModel):
    year: int
    amount_meur: float | None
    pct_gdp: float | None
    provisional: bool


class Subarea(BaseModel):
    id: str
    name: str
    amount_meur: float | None
    share_of_area_pct: float | None


class Indicator(BaseModel):
    id: str
    name: str
    value: float | None
    unit: str
    year: int
    source_id: str


class Legal(BaseModel):
    law_title: str
    boe_id: str
    boe_url: str
    note: str | None = None


class SpendingType(BaseModel):
    type_id: str
    name: str
    description: str | None
    amount_meur: float | None
    share_of_area_pct: float | None


class BudgetTotals(BaseModel):
    """Thousands of euros, as in the official document. Null when not published."""

    total_keur: float | None
    total_without_social_security_keur: float | None
    eu_recovery_keur: float | None


class AreaBudgetPolicy(BudgetTotals):
    id: str
    name: str
    area_id: str


class AreaDetail(BaseModel):
    id: str
    name: str
    description: str | None
    year: int
    amount_meur: float | None
    share_of_total_pct: float | None
    pct_gdp: float | None
    yoy_change_pct: float | None
    source_id: str | None
    history: list[HistoryPoint]
    subareas: list[Subarea]
    spending_by_type: list[SpendingType]
    budget_policies: list[AreaBudgetPolicy]
    indicators: list[Indicator]
    alerts: list[Alert]
    legal: Legal | None


class AlertList(BaseModel):
    year: int
    count: int
    alerts: list[Alert]


class CompareRow(BaseModel):
    country: str
    name: str
    value: float
    rank: int
    provisional: bool


class WorldRow(BaseModel):
    """A country outside the EU: no rank, it is not part of the EU ranking."""

    country: str
    name: str
    value: float


class Compare(BaseModel):
    area_id: str
    area_name: str
    year: int
    unit: Literal["pct_gdp"] = "pct_gdp"
    eu_median: float | None
    rows: list[CompareRow]
    source_id: str | None
    world_rows: list[WorldRow]
    world_source_id: str | None


class Source(BaseModel):
    id: str
    name: str
    publisher: str
    url: str
    license: str | None = None
    retrieved_at: str | None = None


class SourceList(BaseModel):
    sources: list[Source]


# --- Presupuestos Generales del Estado ---------------------------------------


class Government(BaseModel):
    id: str
    president: str
    parties: list[str]
    start: str
    end: str | None
    appointment_boe_id: str | None = None
    appointment_boe_url: str | None = None
    coalition_boe_id: str | None = None
    party_source_url: str | None = None
    coalition_source_url: str | None = None
    note: str | None = None


class ExecutedBy(BaseModel):
    government_id: str
    days: int


class BudgetYear(BudgetTotals):
    year: int
    document: Literal["Ley", "Prorroga"] | None
    includes_social_security: bool
    drafted_by: str | None
    executed_by: list[ExecutedBy]
    note: str | None


class BudgetYears(BaseModel):
    years: list[BudgetYear]
    governments: list[Government]


class BudgetPolicy(AreaBudgetPolicy):
    share_of_total_pct: float | None
    program_count: int


class BudgetOverview(BudgetYear):
    legal: Legal | None
    source_id: str | None
    policies: list[BudgetPolicy]


class PolicyHistoryPoint(BudgetTotals):
    year: int
    document: Literal["Ley", "Prorroga"] | None


class ProgramSummary(BaseModel):
    program_id: str
    name: str
    section_names: list[str]
    total_keur: float
    eu_recovery_keur: float


class PolicyDetail(AreaBudgetPolicy):
    year: int
    source_id: str | None
    history: list[PolicyHistoryPoint]
    programs: list[ProgramSummary]


class Organic(BaseModel):
    organic_id: str
    name: str
    total_keur: float
    undetailed_keur: float


class BudgetLine(BaseModel):
    organic_id: str
    economic_code: str
    level: int | None
    description: str
    amount_keur: float | None


class ProgramSection(BaseModel):
    section_id: str
    section_name: str
    total_keur: float
    organics: list[Organic]
    lines: list[BudgetLine]


class ProgramDetail(BaseModel):
    program_id: str
    name: str
    year: int
    document: Literal["Ley", "Prorroga"] | None
    policy_id: str
    policy_name: str | None
    total_keur: float
    eu_recovery_keur: float
    source_id: str
    sections: list[ProgramSection]
