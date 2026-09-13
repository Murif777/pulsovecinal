"""GET /api/dashboard/resumen."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dates import parse_iso
from app.db import get_db
from app.domain import Category, Severity
from app.schemas import DashboardSummaryOut
from app.services import surveys as survey_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/resumen", response_model=DashboardSummaryOut)
def get_resumen(
    comuna: str | None = Query(default=None),
    category: Category | None = Query(default=None),
    severity: Severity | None = Query(default=None),
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> DashboardSummaryOut:
    return DashboardSummaryOut.model_validate(
        survey_service.dashboard_summary(
            db,
            comuna=comuna,
            category=category,
            severity=severity,
            from_dt=parse_iso(from_),
            to_dt=parse_iso(to, end_of_day=True),
        )
    )
