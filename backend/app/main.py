"""FastAPI app, CORS, routers y /health."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, barrios, dashboard, encuestas, mapa


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="PulsoVecinal API",
        description="Capa de backend FastAPI de PulsoVecinal.",
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

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    application.include_router(auth.router)
    application.include_router(barrios.router)
    application.include_router(encuestas.router)
    application.include_router(mapa.router)
    application.include_router(dashboard.router)
    return application


app = create_app()
