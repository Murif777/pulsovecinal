"""Pydantic espejo de src/lib/types.ts (camelCase via alias_generator)."""

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from app.domain import MAX_LOCATION_ACCURACY_M, Category, Severity


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class SurveyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    barrio: str = Field(max_length=100)
    category: Category
    severity: Severity
    description: str | None = Field(default=None, max_length=1000)
    encuestador: str | None = Field(default=None, max_length=100)
    # Ubicación opcional capturada por el navegador (GPS del ciudadano).
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    # Radio de precisión (m) que reportó el navegador al tomar la ubicación.
    accuracy: float | None = Field(default=None, ge=0)
    # Consentimiento expreso para guardar y mostrar la ubicación.
    consent: bool = False
    consent_version: str | None = Field(default=None, max_length=30)

    @model_validator(mode="after")
    def validate_location(self) -> "SurveyCreate":
        if (self.lat is None) != (self.lng is None):
            raise ValueError("lat y lng deben enviarse juntos")
        if self.lat is None:
            return self
        if not self.consent or not self.consent_version:
            raise ValueError("Debes autorizar el uso de tu ubicación")
        if self.accuracy is None:
            raise ValueError("Falta la precisión de la ubicación")
        if self.accuracy > MAX_LOCATION_ACCURACY_M:
            raise ValueError(
                f"Precisión insuficiente: se requiere {MAX_LOCATION_ACCURACY_M:.0f} m o menos"
            )
        return self

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


class MapPointOut(ApiModel):
    """Reporte con ubicación, listo para pintarse en el mapa público."""

    id: str
    barrio: str
    comuna: str
    lat: float
    lng: float
    category: Category
    severity: Severity
    date: str


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
