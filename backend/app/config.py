"""Settings desde env: DATABASE_URL, JWT_SECRET, CORS_ORIGINS."""

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://pulso@db:5432/pulsovecinal"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    cors_origins: str = "http://localhost:5173,http://localhost:8080"
    # Límite de frecuencia por IP (ver app/ratelimit.py).
    rate_limit_enabled: bool = True
    rate_limit_surveys_per_minute: int = 5
    rate_limit_surveys_per_hour: int = 30
    rate_limit_login_per_minute: int = 10
    # Proxies de confianza delante de la API (ALB = 1; ALB + nginx = 2).
    trusted_proxy_hops: int = 1

    @property
    def sqlalchemy_url(self) -> str:
        return self.database_url

    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
