"""Resumen de criticidad para el dashboard municipal."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DashboardSummaryOut
from app.services import surveys as survey_service

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummaryOut:
    return DashboardSummaryOut.model_validate(survey_service.dashboard_summary(db))
