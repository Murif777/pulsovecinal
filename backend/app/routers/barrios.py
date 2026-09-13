"""GET /api/barrios."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories import barrios as barrio_repo
from app.schemas import BarrioOut

router = APIRouter(prefix="/api", tags=["barrios"])


@router.get("/barrios", response_model=list[BarrioOut])
def list_barrios(db: Session = Depends(get_db)) -> list[BarrioOut]:
    rows = barrio_repo.list_barrios(db)
    return [
        BarrioOut(
            nombre=row.nombre,
            comuna=row.comuna,
            lat=float(row.lat),
            lng=float(row.lng),
        )
        for row in rows
    ]
