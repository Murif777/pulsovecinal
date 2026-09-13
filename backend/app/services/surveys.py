"""Orquestación de encuestas: valida territorio y arma el contrato del frontend."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.errors import NotFoundError
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
) -> list[SurveyOut]:
    rows = survey_repo.list_responses(
        db,
        barrio=barrio,
        categoria=category,
        severidad=severity,
    )
    return [to_survey_out(row) for row in rows]


def get_survey(db: Session, response_id: UUID) -> SurveyOut:
    row = survey_repo.get_response(db, response_id)
    if row is None:
        raise NotFoundError("Encuesta no encontrada")
    return to_survey_out(row)


def create_survey(db: Session, payload: SurveyCreate) -> SurveyOut:
    barrio = barrio_repo.get_barrio_by_nombre(db, payload.barrio)
    if barrio is None:
        raise NotFoundError(f'Barrio no registrado: "{payload.barrio}"')
    row = survey_repo.create_response(
        db,
        barrio_id=barrio.id,
        categoria=payload.category,
        severidad=payload.severity,
        descripcion=payload.description,
        encuestador=payload.encuestador,
    )
    return to_survey_out(row)


def map_reports(db: Session) -> list[dict]:
    facts: list[SurveyFact] = []
    for row, barrio_nombre, comuna_nombre, lat, lng in survey_repo.list_responses_with_coords(db):
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
    return build_map_reports(facts)


def dashboard_summary(db: Session) -> dict:
    facts: list[SurveyFact] = []
    for row in survey_repo.list_responses(db):
        facts.append(
            SurveyFact(
                barrio=row.barrio.nombre,
                comuna=row.barrio.comuna.nombre,
                category=row.categoria,  # type: ignore[arg-type]
                severity=row.severidad,  # type: ignore[arg-type]
                date=to_iso(row.fecha),
            )
        )
    return build_dashboard_summary(facts)
