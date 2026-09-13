"""Usuarios del dashboard (tabla `usuarios`)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Usuario


def get_by_usuario(db: Session, usuario: str) -> Usuario | None:
    return db.execute(select(Usuario).where(Usuario.usuario == usuario)).scalar_one_or_none()
