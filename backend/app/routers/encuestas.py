"""POST/GET /api/encuestas."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dates import parse_iso
from app.db import get_db
from app.domain import Category, Severity
from app.config import get_settings
from app.errors import UnprocessableError
from app.ratelimit import rate_limit
from app.schemas import SurveyCreate, SurveyOut
from app.services import surveys as survey_service

router = APIRouter(prefix="/api/encuestas", tags=["encuestas"])


@router.get("", response_model=list[SurveyOut])
def list_encuestas(
    barrio: str | None = Query(default=None),
    category: Category | None = Query(default=None),
    severity: Severity | None = Query(default=None),
    comuna: str | None = Query(default=None),
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000, description="Máximo de filas devueltas"),
    offset: int = Query(default=0, ge=0, description="Filas a saltar"),
    db: Session = Depends(get_db),
) -> list[SurveyOut]:
    return survey_service.list_surveys(
        db,
        barrio=barrio,
        category=category,
        severity=severity,
        comuna=comuna,
        from_dt=parse_iso(from_),
        to_dt=parse_iso(to, end_of_day=True),
        limit=limit,
        offset=offset,
    )


_settings = get_settings()
# Dos ventanas: ráfaga corta (por minuto) y volumen sostenido (por hora).
_burst_limit = rate_limit(_settings.rate_limit_surveys_per_minute, 60, "encuestas-min")
_hourly_limit = rate_limit(_settings.rate_limit_surveys_per_hour, 3600, "encuestas-hora")


@router.post(
    "",
    response_model=SurveyOut,
    status_code=201,
    dependencies=[Depends(_burst_limit), Depends(_hourly_limit)],
)
def create_encuesta(payload: SurveyCreate, db: Session = Depends(get_db)) -> SurveyOut:
    try:
        return survey_service.create_survey(db, payload)
    except UnprocessableError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc
