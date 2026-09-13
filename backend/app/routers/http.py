"""Traducción de errores de negocio a respuestas HTTP."""

from fastapi import HTTPException

from app.errors import NotFoundError


def not_found(exc: NotFoundError) -> HTTPException:
    return HTTPException(status_code=404, detail=exc.message)
