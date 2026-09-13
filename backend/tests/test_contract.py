from unittest.mock import MagicMock

from app.db import get_db
from app.main import app
from app.repositories import barrios as barrio_repo


def test_openapi_exposes_frozen_paths(client) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert "/health" in paths
    assert "/api/encuestas" in paths
    assert "/api/barrios" in paths
    assert "/api/mapa/reportes" in paths
    assert "/api/dashboard/resumen" in paths
    assert "/api/auth/login" in paths
    assert "/api/auth/me" in paths
    assert "/api/surveys" not in paths
    assert "/api/map/reports" not in paths


def test_create_encuesta_rejects_unknown_barrio(client, monkeypatch) -> None:
    monkeypatch.setattr(barrio_repo, "get_barrio_by_nombre", lambda db, nombre: None)

    def _db():
        yield MagicMock()

    app.dependency_overrides[get_db] = _db
    response = client.post(
        "/api/encuestas",
        json={
            "barrio": "No Existe",
            "category": "seguridad",
            "severity": "alta",
            "description": "Prueba",
        },
    )
    assert response.status_code == 422
    assert response.json() == {"detail": "Barrio no existe"}


def test_create_encuesta_rejects_invalid_category(client) -> None:
    response = client.post(
        "/api/encuestas",
        json={
            "barrio": "La Esperanza",
            "category": "inventada",
            "severity": "alta",
        },
    )
    assert response.status_code == 422
