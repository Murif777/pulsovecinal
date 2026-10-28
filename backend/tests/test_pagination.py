"""Paginación del listado de encuestas (límite y desplazamiento)."""

from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.routers import encuestas as encuestas_router
from app.schemas import SurveyOut
from app.services import surveys as survey_service


def _survey(i: int) -> SurveyOut:
    return SurveyOut(
        id=f"00000000-0000-4000-8000-{i:012d}",
        barrio="La Esperanza",
        comuna="Comuna 1",
        category="seguridad",
        severity="alta",
        description=f"registro {i}",
        date="2026-10-27T10:00:00-05:00",
        encuestador="analista",
    )


def _client(monkeypatch, rows_count: int) -> TestClient:
    """Sustituye el servicio por uno que respeta limit/offset sobre filas válidas."""

    def fake_list_surveys(db, **kwargs):
        limit = kwargs.get("limit")
        offset = kwargs.get("offset") or 0
        rows = [_survey(i) for i in range(rows_count)][offset:]
        if limit is not None:
            rows = rows[:limit]
        return rows

    monkeypatch.setattr(encuestas_router.survey_service, "list_surveys", fake_list_surveys)

    def _db():
        yield MagicMock()

    app.dependency_overrides[get_db] = _db
    return TestClient(app)


def test_listado_sin_parametros_usa_limite_por_defecto(monkeypatch) -> None:
    client = _client(monkeypatch, 900)
    try:
        response = client.get("/api/encuestas")
        assert response.status_code == 200
        assert len(response.json()) == 500  # tope por defecto
    finally:
        app.dependency_overrides.clear()


def test_listado_respeta_limit_y_offset(monkeypatch) -> None:
    client = _client(monkeypatch, 100)
    try:
        response = client.get("/api/encuestas?limit=10&offset=5")
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 10
        assert body[0]["description"] == "registro 5"
    finally:
        app.dependency_overrides.clear()


def test_listado_rechaza_limite_fuera_de_rango(monkeypatch) -> None:
    client = _client(monkeypatch, 10)
    try:
        assert client.get("/api/encuestas?limit=0").status_code == 422
        assert client.get("/api/encuestas?limit=2001").status_code == 422
        assert client.get("/api/encuestas?offset=-1").status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_servicio_propaga_limit_y_offset() -> None:
    """El servicio debe reenviar limit y offset al repositorio."""
    capturado = {}

    def fake_repo(db, **kwargs):
        capturado.update(kwargs)
        return []

    original = survey_service.survey_repo.list_responses
    survey_service.survey_repo.list_responses = fake_repo
    try:
        survey_service.list_surveys(MagicMock(), limit=25, offset=50)
    finally:
        survey_service.survey_repo.list_responses = original

    assert capturado["limit"] == 25
    assert capturado["offset"] == 50
