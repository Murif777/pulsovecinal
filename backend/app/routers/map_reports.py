"""Reportes agregados para el mapa (un punto por barrio + categoría)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import MapReportOut
from app.services import surveys as survey_service

router = APIRouter(prefix="/api", tags=["map"])


@router.get("/map/reports", response_model=list[MapReportOut])
def list_map_reports(db: Session = Depends(get_db)) -> list[MapReportOut]:
    return [MapReportOut.model_validate(item) for item in survey_service.map_reports(db)]
