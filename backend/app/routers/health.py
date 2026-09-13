"""Liveness de la imagen API y readiness contra PostgreSQL."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "pulsovecinal-api"}


@router.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="base de datos no disponible") from exc
    return {"status": "ready", "service": "pulsovecinal-api"}
