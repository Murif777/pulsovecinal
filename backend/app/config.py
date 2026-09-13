"""Configuración por variables de entorno (sin secretos en el código)."""

from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Contrato de conexión alineado con `db/.env.example` y `db/README.md`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_user: str = "pulso"
    postgres_password: str = ""
    postgres_db: str = "pulsovecinal"
    postgres_host: str = "db"
    postgres_port: int = 5432
    database_url: str | None = None

    jwt_secret: str = "cambia-esta-clave-en-produccion"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    @property
    def sqlalchemy_url(self) -> str:
        if self.database_url:
            return self.database_url
        password = quote_plus(self.postgres_password)
        return (
            f"postgresql+psycopg://{self.postgres_user}:{password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
