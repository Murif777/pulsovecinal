"""GET /api/mapa/reportes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.domain import Category, Severity
from app.schemas import MapPointOut, MapReportOut
from app.services import surveys as survey_service

router = APIRouter(prefix="/api/mapa", tags=["mapa"])


@router.get("/reportes", response_model=list[MapReportOut])
def list_reportes(
    comuna: str | None = Query(default=None),
    category: Category | None = Query(default=None),
    severity: Severity | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MapReportOut]:
    return [
        MapReportOut.model_validate(item)
        for item in survey_service.map_reports(
            db, comuna=comuna, category=category, severity=severity
        )
    ]


@router.get("/puntos", response_model=list[MapPointOut])
def list_puntos(
    comuna: str | None = Query(default=None),
    category: Category | None = Query(default=None),
    severity: Severity | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MapPointOut]:
    """Reportes con ubicación y consentimiento, sin datos personales."""
    return survey_service.map_points(db, comuna=comuna, category=category, severity=severity)
