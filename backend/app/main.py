"""Punto de entrada de la API PulsoVecinal."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import barrios, dashboard, health, map_reports, surveys


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="PulsoVecinal API",
        description="Capa de negocio de la arquitectura de tres capas.",
        version="1.0.0",
    )
    origins = settings.cors_origin_list()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health.router)
    application.include_router(barrios.router)
    application.include_router(surveys.router)
    application.include_router(map_reports.router)
    application.include_router(dashboard.router)
    return application


app = create_app()
