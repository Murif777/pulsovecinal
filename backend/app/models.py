"""Modelos ORM que espejan `db/init/01-schema.sql` (la API no migra ni crea tablas)."""

from datetime import datetime
from uuid import UUID

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import ENUM, UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


complaint_category = ENUM(
    "seguridad",
    "alcantarillado",
    "energia",
    "vias",
    "espacios_publicos",
    "otros",
    name="complaint_category",
    create_type=False,
)

severity_level = ENUM(
    "baja",
    "media",
    "alta",
    "critica",
    name="severity_level",
    create_type=False,
)


class Comuna(Base):
    __tablename__ = "comunas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    barrios: Mapped[list["Barrio"]] = relationship(back_populates="comuna")


class Barrio(Base):
    __tablename__ = "barrios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    comuna_id: Mapped[int] = mapped_column(ForeignKey("comunas.id"), nullable=False)
    geom: Mapped[object] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326),
        nullable=False,
    )

    comuna: Mapped[Comuna] = relationship(back_populates="barrios")
    responses: Mapped[list["SurveyResponse"]] = relationship(back_populates="barrio")


class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    barrio_id: Mapped[int] = mapped_column(ForeignKey("barrios.id"), nullable=False)
    categoria: Mapped[str] = mapped_column(complaint_category, nullable=False)
    severidad: Mapped[str] = mapped_column(severity_level, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    encuestador: Mapped[str | None] = mapped_column(String(100))
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    barrio: Mapped[Barrio] = relationship(back_populates="responses")


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(30), nullable=False, default="analista")
    nombre: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
