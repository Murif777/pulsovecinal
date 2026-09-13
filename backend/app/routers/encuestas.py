"""POST/GET /api/encuestas."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dates import parse_iso
from app.db import get_db
from app.domain import Category, Severity
from app.errors import UnprocessableError
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
    )


@router.post("", response_model=SurveyOut, status_code=201)
def create_encuesta(payload: SurveyCreate, db: Session = Depends(get_db)) -> SurveyOut:
    try:
        return survey_service.create_survey(db, payload)
    except UnprocessableError as exc:
        raise HTTPException(status_code=422, detail=exc.message) from exc
