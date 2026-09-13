"""CRUD mínimo de encuestas ciudadanas."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.domain import Category, Severity
from app.errors import NotFoundError
from app.routers.http import not_found
from app.schemas import SurveyCreate, SurveyOut
from app.services import surveys as survey_service

router = APIRouter(prefix="/api", tags=["surveys"])


@router.get("/surveys", response_model=list[SurveyOut])
def list_surveys(
    barrio: str | None = Query(default=None),
    category: Category | None = Query(default=None),
    severity: Severity | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[SurveyOut]:
    return survey_service.list_surveys(
        db,
        barrio=barrio,
        category=category,
        severity=severity,
    )


@router.get("/surveys/{response_id}", response_model=SurveyOut)
def get_survey(response_id: UUID, db: Session = Depends(get_db)) -> SurveyOut:
    try:
        return survey_service.get_survey(db, response_id)
    except NotFoundError as exc:
        raise not_found(exc) from exc


@router.post("/surveys", response_model=SurveyOut, status_code=201)
def create_survey(payload: SurveyCreate, db: Session = Depends(get_db)) -> SurveyOut:
    try:
        return survey_service.create_survey(db, payload)
    except NotFoundError as exc:
        raise not_found(exc) from exc
