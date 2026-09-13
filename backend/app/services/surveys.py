"""Orquestación de encuestas y agregaciones."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.errors import UnprocessableError
from app.iso import to_iso
from app.models import SurveyResponse
from app.repositories import barrios as barrio_repo
from app.repositories import surveys as survey_repo
from app.schemas import SurveyCreate, SurveyOut
from app.services.analytics import SurveyFact, build_dashboard_summary, build_map_reports


def to_survey_out(row: SurveyResponse) -> SurveyOut:
    return SurveyOut(
        id=str(row.id),
        barrio=row.barrio.nombre,
        comuna=row.barrio.comuna.nombre,
        category=row.categoria,  # type: ignore[arg-type]
        severity=row.severidad,  # type: ignore[arg-type]
        description=row.descripcion,
        date=to_iso(row.fecha),
        encuestador=row.encuestador,
    )


def list_surveys(
    db: Session,
    *,
    barrio: str | None = None,
    category: str | None = None,
    severity: str | None = None,
    comuna: str | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> list[SurveyOut]:
    rows = survey_repo.list_responses(
        db,
        barrio=barrio,
        categoria=category,
        severidad=severity,
        comuna=comuna,
        from_dt=from_dt,
        to_dt=to_dt,
    )
    return [to_survey_out(row) for row in rows]


def create_survey(db: Session, payload: SurveyCreate) -> SurveyOut:
    barrio = barrio_repo.get_barrio_by_nombre(db, payload.barrio)
    if barrio is None:
        raise UnprocessableError("Barrio no existe")
    row = survey_repo.create_response(
        db,
        barrio_id=barrio.id,
        categoria=payload.category,
        severidad=payload.severity,
        descripcion=payload.description,
        encuestador=payload.encuestador,
    )
    return to_survey_out(row)


def _facts_from_coords(
    db: Session,
    *,
    barrio: str | None = None,
    category: str | None = None,
    severity: str | None = None,
    comuna: str | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> list[SurveyFact]:
    facts: list[SurveyFact] = []
    rows = survey_repo.list_responses_with_coords(
        db,
        barrio=barrio,
        categoria=category,
        severidad=severity,
        comuna=comuna,
        from_dt=from_dt,
        to_dt=to_dt,
    )
    for row, barrio_nombre, comuna_nombre, lat, lng in rows:
        facts.append(
            SurveyFact(
                barrio=barrio_nombre,
                comuna=comuna_nombre,
                category=row.categoria,  # type: ignore[arg-type]
                severity=row.severidad,  # type: ignore[arg-type]
                date=to_iso(row.fecha),
                lat=float(lat),
                lng=float(lng),
            )
        )
    return facts


def map_reports(
    db: Session,
    *,
    comuna: str | None = None,
    category: str | None = None,
    severity: str | None = None,
) -> list[dict]:
    return build_map_reports(
        _facts_from_coords(db, comuna=comuna, category=category, severity=severity)
    )


def dashboard_summary(
    db: Session,
    *,
    comuna: str | None = None,
    category: str | None = None,
    severity: str | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> dict:
    facts = _facts_from_coords(
        db,
        comuna=comuna,
        category=category,
        severity=severity,
        from_dt=from_dt,
        to_dt=to_dt,
    )
    return build_dashboard_summary(facts)
