"""Persistencia de respuestas de encuesta (`survey_responses`)."""

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Barrio, Comuna, SurveyResponse


def _with_territory() -> Select:
    return (
        select(SurveyResponse)
        .options(joinedload(SurveyResponse.barrio).joinedload(Barrio.comuna))
        .order_by(SurveyResponse.fecha.desc(), SurveyResponse.id)
    )


def list_responses(
    db: Session,
    *,
    barrio: str | None = None,
    categoria: str | None = None,
    severidad: str | None = None,
) -> list[SurveyResponse]:
    stmt = _with_territory()
    if barrio:
        stmt = stmt.join(SurveyResponse.barrio).where(Barrio.nombre == barrio)
    if categoria:
        stmt = stmt.where(SurveyResponse.categoria == categoria)
    if severidad:
        stmt = stmt.where(SurveyResponse.severidad == severidad)
    return list(db.execute(stmt).unique().scalars().all())


def get_response(db: Session, response_id: UUID) -> SurveyResponse | None:
    stmt = _with_territory().where(SurveyResponse.id == response_id)
    return db.execute(stmt).unique().scalar_one_or_none()


def create_response(
    db: Session,
    *,
    barrio_id: int,
    categoria: str,
    severidad: str,
    descripcion: str,
    encuestador: str | None,
) -> SurveyResponse:
    row = SurveyResponse(
        barrio_id=barrio_id,
        categoria=categoria,
        severidad=severidad,
        descripcion=descripcion,
        encuestador=encuestador,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return get_response(db, row.id) or row


def list_responses_with_coords(
    db: Session,
) -> list[tuple[SurveyResponse, str, str, float, float]]:
    """Filas para el mapa: respuesta + territorio + lat/lng PostGIS."""
    stmt = (
        select(
            SurveyResponse,
            Barrio.nombre,
            Comuna.nombre,
            func.ST_Y(Barrio.geom),
            func.ST_X(Barrio.geom),
        )
        .join(Barrio, SurveyResponse.barrio_id == Barrio.id)
        .join(Comuna, Barrio.comuna_id == Comuna.id)
        .order_by(SurveyResponse.fecha, SurveyResponse.id)
    )
    return list(db.execute(stmt).all())
