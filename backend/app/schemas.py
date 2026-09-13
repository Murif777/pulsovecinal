"""Pydantic espejo de src/lib/types.ts (camelCase via alias_generator)."""

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from app.domain import Category, Severity


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class SurveyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    barrio: str
    category: Category
    severity: Severity
    description: str | None = None
    encuestador: str | None = None

    @field_validator("barrio")
    @classmethod
    def required_trim(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("no puede estar vacío")
        return trimmed

    @field_validator("description", "encuestador")
    @classmethod
    def optional_trim(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class SurveyOut(ApiModel):
    id: str
    barrio: str
    comuna: str
    category: Category
    severity: Severity
    description: str | None = None
    date: str
    encuestador: str | None = None


class BarrioOut(ApiModel):
    nombre: str
    comuna: str
    lat: float
    lng: float


class MapReportOut(ApiModel):
    id: str
    barrio: str
    comuna: str
    lat: float
    lng: float
    category: Category
    severity: Severity
    count: int
    last_reported_at: str


class CriticalBarrioOut(ApiModel):
    barrio: str
    comuna: str
    score: int
    top_category: Category


class SummaryPeriodOut(ApiModel):
    start: str
    end: str


class DashboardSummaryOut(ApiModel):
    total_responses: int
    by_category: dict[Category, int]
    by_severity: dict[Severity, int]
    critical_barrios: list[CriticalBarrioOut]
    period: SummaryPeriodOut


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    usuario: str = Field(min_length=1)
    contrasena: str = Field(min_length=1)

    @field_validator("usuario", "contrasena")
    @classmethod
    def required_trim(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("no puede estar vacío")
        return trimmed


class UsuarioPublic(ApiModel):
    id: int
    usuario: str
    rol: str
    nombre: str | None = None


class TokenOut(ApiModel):
    token: str
    usuario: UsuarioPublic
