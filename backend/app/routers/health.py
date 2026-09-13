"""Liveness de la imagen API (no toca la base de datos)."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "pulsovecinal-api"}
