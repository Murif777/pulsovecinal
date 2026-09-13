"""DTOs HTTP: mismos nombres de campo que `src/lib/types.ts`."""

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain import Category, Severity


class SurveyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    barrio: str
    category: Category
    severity: Severity
    description: str
    encuestador: str | None = None

    @field_validator("barrio", "description")
    @classmethod
    def required_trim(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("no puede estar vacío")
        return trimmed

    @field_validator("encuestador")
    @classmethod
    def optional_trim(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None


class SurveyOut(BaseModel):
    id: str
    barrio: str
    comuna: str
    category: Category
    severity: Severity
    description: str | None = None
    date: str
    encuestador: str | None = None


class BarrioOut(BaseModel):
    id: int
    nombre: str
    comuna: str
    lat: float
    lng: float


class MapReportOut(BaseModel):
    id: str
    barrio: str
    comuna: str
    lat: float
    lng: float
    category: Category
    severity: Severity
    count: int
    lastReportedAt: str


class CriticalBarrioOut(BaseModel):
    barrio: str
    comuna: str
    score: int
    topCategory: Category


class SummaryPeriodOut(BaseModel):
    start: str
    end: str


class DashboardSummaryOut(BaseModel):
    totalResponses: int
    byCategory: dict[Category, int]
    bySeverity: dict[Severity, int]
    criticalBarrios: list[CriticalBarrioOut]
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


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: str
    rol: str
    nombre: str | None = None


class UserOut(BaseModel):
    usuario: str
    rol: str
    nombre: str | None = None
