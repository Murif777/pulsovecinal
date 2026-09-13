"""Consultas del catálogo territorial (comunas + barrios + geometría)."""

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models import Barrio, Comuna


def _barrio_catalog_stmt() -> Select:
    return (
        select(
            Barrio.id,
            Barrio.nombre,
            Comuna.nombre.label("comuna"),
            func.ST_Y(Barrio.geom).label("lat"),
            func.ST_X(Barrio.geom).label("lng"),
        )
        .join(Comuna, Barrio.comuna_id == Comuna.id)
        .order_by(Barrio.nombre)
    )


def list_barrios(db: Session) -> list[tuple[int, str, str, float, float]]:
    return list(db.execute(_barrio_catalog_stmt()).all())


def get_barrio_by_nombre(db: Session, nombre: str) -> Barrio | None:
    return db.execute(select(Barrio).where(Barrio.nombre == nombre)).scalar_one_or_none()
