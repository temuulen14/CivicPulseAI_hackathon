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


class AreaDetail(BaseModel):
    id: str
    name: str
    description: str | None
    year: int
    amount_meur: float | None
    share_of_total_pct: float | None
    pct_gdp: float | None
    source_id: str | None
    history: list[HistoryPoint]
    subareas: list[Subarea]
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


class Compare(BaseModel):
    area_id: str
    area_name: str
    year: int
    unit: Literal["pct_gdp"] = "pct_gdp"
    eu_median: float | None
    rows: list[CompareRow]
    source_id: str | None


class Source(BaseModel):
    id: str
    name: str
    publisher: str
    url: str
    license: str | None = None
    retrieved_at: str | None = None


class SourceList(BaseModel):
    sources: list[Source]
