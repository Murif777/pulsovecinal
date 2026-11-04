"""Persistencia de respuestas (`survey_responses`)."""

from datetime import datetime

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.models import Barrio, Comuna, SurveyResponse


def _with_territory() -> Select:
    return (
        select(SurveyResponse)
        .options(joinedload(SurveyResponse.barrio).joinedload(Barrio.comuna))
        .order_by(SurveyResponse.fecha.desc(), SurveyResponse.id)
    )


def _apply_filters(
    stmt: Select,
    *,
    barrio: str | None,
    categoria: str | None,
    severidad: str | None,
    comuna: str | None,
    from_dt: datetime | None,
    to_dt: datetime | None,
    barrio_joined: bool,
    comuna_joined: bool = False,
) -> Select:
    if (barrio or comuna) and not barrio_joined:
        stmt = stmt.join(Barrio, SurveyResponse.barrio_id == Barrio.id)
    if comuna and not comuna_joined:
        stmt = stmt.join(Comuna, Barrio.comuna_id == Comuna.id)
    if comuna:
        stmt = stmt.where(Comuna.nombre == comuna)
    if barrio:
        stmt = stmt.where(Barrio.nombre == barrio)
    if categoria:
        stmt = stmt.where(SurveyResponse.categoria == categoria)
    if severidad:
        stmt = stmt.where(SurveyResponse.severidad == severidad)
    if from_dt is not None:
        stmt = stmt.where(SurveyResponse.fecha >= from_dt)
    if to_dt is not None:
        stmt = stmt.where(SurveyResponse.fecha <= to_dt)
    return stmt


def list_responses(
    db: Session,
    *,
    barrio: str | None = None,
    categoria: str | None = None,
    severidad: str | None = None,
    comuna: str | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> list[SurveyResponse]:
    stmt = _apply_filters(
        _with_territory(),
        barrio=barrio,
        categoria=categoria,
        severidad=severidad,
        comuna=comuna,
        from_dt=from_dt,
        to_dt=to_dt,
        barrio_joined=False,
    )
    if offset:
        stmt = stmt.offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)
    return list(db.execute(stmt).unique().scalars().all())


def create_response(
    db: Session,
    *,
    barrio_id: int,
    categoria: str,
    severidad: str,
    descripcion: str | None,
    encuestador: str | None,
    lat: float | None = None,
    lng: float | None = None,
    accuracy: float | None = None,
    consent_version: str | None = None,
) -> SurveyResponse:
    row = SurveyResponse(
        barrio_id=barrio_id,
        categoria=categoria,
        severidad=severidad,
        descripcion=descripcion,
        encuestador=encuestador,
        lat=lat,
        lng=lng,
        ubicacion_precision_m=accuracy,
        ubicacion_consent_at=func.now() if lat is not None else None,
        ubicacion_consent_version=consent_version if lat is not None else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    stmt = _with_territory().where(SurveyResponse.id == row.id)
    return db.execute(stmt).unique().scalar_one()


def list_responses_with_coords(
    db: Session,
    *,
    barrio: str | None = None,
    categoria: str | None = None,
    severidad: str | None = None,
    comuna: str | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> list[tuple[SurveyResponse, str, str, float, float]]:
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
    stmt = _apply_filters(
        stmt,
        barrio=barrio,
        categoria=categoria,
        severidad=severidad,
        comuna=comuna,
        from_dt=from_dt,
        to_dt=to_dt,
        barrio_joined=True,
        comuna_joined=True,
    )
    return list(db.execute(stmt).all())


def list_located_responses(
    db: Session,
    *,
    categoria: str | None = None,
    severidad: str | None = None,
    comuna: str | None = None,
    limit: int = 2000,
) -> list[SurveyResponse]:
    """Respuestas con ubicación y consentimiento registrado (las únicas publicables)."""
    stmt = (
        _with_territory()
        .where(SurveyResponse.lat.is_not(None))
        .where(SurveyResponse.lng.is_not(None))
        .where(SurveyResponse.ubicacion_consent_at.is_not(None))
    )
    if comuna:
        stmt = (
            stmt.join(Barrio, SurveyResponse.barrio_id == Barrio.id)
            .join(Comuna, Barrio.comuna_id == Comuna.id)
            .where(Comuna.nombre == comuna)
        )
    if categoria:
        stmt = stmt.where(SurveyResponse.categoria == categoria)
    if severidad:
        stmt = stmt.where(SurveyResponse.severidad == severidad)
    return list(db.execute(stmt.limit(limit)).unique().scalars().all())
