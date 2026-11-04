from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

from app.db import get_db
from app.main import app
from app.ratelimit import SlidingWindowLimiter, client_ip
from app.schemas import MapPointOut, SurveyCreate
from app.services import surveys as survey_service

BASE = {"barrio": "La Esperanza", "category": "seguridad", "severity": "alta"}
LOCATED = {
    **BASE,
    "lat": 10.47213,
    "lng": -73.24051,
    "accuracy": 12.5,
    "consent": True,
    "consent_version": "2026-11-v1",
}


def test_located_survey_requires_consent() -> None:
    with pytest.raises(ValidationError, match="autorizar"):
        SurveyCreate(**{**LOCATED, "consent": False})
    with pytest.raises(ValidationError, match="autorizar"):
        SurveyCreate(**{**LOCATED, "consent_version": None})


def test_located_survey_requires_accuracy_within_20_m() -> None:
    assert SurveyCreate(**{**LOCATED, "accuracy": 20}).accuracy == 20
    with pytest.raises(ValidationError, match="Precisión insuficiente"):
        SurveyCreate(**{**LOCATED, "accuracy": 20.5})
    with pytest.raises(ValidationError, match="precisión"):
        SurveyCreate(**{**LOCATED, "accuracy": None})


def test_survey_without_location_needs_no_consent() -> None:
    assert SurveyCreate(**BASE).lat is None


def test_survey_rejects_oversized_text() -> None:
    with pytest.raises(ValidationError):
        SurveyCreate(**{**BASE, "description": "x" * 1001})
    with pytest.raises(ValidationError):
        SurveyCreate(**{**BASE, "barrio": "b" * 101})


def test_sliding_window_limiter_blocks_then_recovers() -> None:
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60)
    assert limiter.check("ip", now=0) == 0
    assert limiter.check("ip", now=1) == 0
    assert limiter.check("ip", now=2) > 0
    assert limiter.check("other", now=2) == 0  # otra IP no se ve afectada
    assert limiter.check("ip", now=61) == 0  # la ventana ya venció


class _FakeRequest:
    def __init__(self, forwarded: str | None, host: str = "10.0.0.9") -> None:
        self.headers = {"x-forwarded-for": forwarded} if forwarded else {}
        self.client = MagicMock(host=host)


def test_client_ip_uses_trusted_hop_from_the_right() -> None:
    spoofed = _FakeRequest("1.1.1.1, 200.1.2.3")  # el cliente falseó el primero
    assert client_ip(spoofed, trusted_hops=1) == "200.1.2.3"
    assert client_ip(_FakeRequest("200.1.2.3, 172.31.0.5"), trusted_hops=2) == "200.1.2.3"
    assert client_ip(_FakeRequest(None), trusted_hops=1) == "10.0.0.9"


def test_post_encuestas_returns_429_after_burst(client, monkeypatch) -> None:
    monkeypatch.setattr(survey_service, "create_survey", lambda db, payload: pytest.fail("no debe"))
    app.dependency_overrides[get_db] = lambda: iter([MagicMock()])
    invalid = {"barrio": "x", "category": "inventada", "severity": "alta"}
    statuses = [client.post("/api/encuestas", json=invalid).status_code for _ in range(7)]
    assert statuses[:5] == [422] * 5
    assert statuses[5] == 429
    blocked = client.post("/api/encuestas", json=invalid)
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) >= 1


def test_login_is_rate_limited(client) -> None:
    statuses = [
        client.post("/api/auth/login", json={"usuario": "", "contrasena": ""}).status_code
        for _ in range(12)
    ]
    assert statuses[:10] == [422] * 10
    assert 429 in statuses[10:]


def test_map_points_endpoint_serializes_public_fields(client, monkeypatch) -> None:
    point = MapPointOut(
        id="abc",
        barrio="La Esperanza",
        comuna="Comuna 2",
        lat=10.4721,
        lng=-73.2405,
        category="seguridad",
        severity="alta",
        date="2026-08-20T10:00:00Z",
    )
    monkeypatch.setattr(survey_service, "map_points", lambda db, **kwargs: [point])
    app.dependency_overrides[get_db] = lambda: iter([MagicMock()])
    response = client.get("/api/mapa/puntos?category=seguridad")
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "abc",
            "barrio": "La Esperanza",
            "comuna": "Comuna 2",
            "lat": 10.4721,
            "lng": -73.2405,
            "category": "seguridad",
            "severity": "alta",
            "date": "2026-08-20T10:00:00Z",
        }
    ]


def test_map_points_rounds_public_coordinates() -> None:
    row = MagicMock()
    row.id = "id-1"
    row.barrio.nombre = "La Esperanza"
    row.barrio.comuna.nombre = "Comuna 2"
    row.lat = 10.472139
    row.lng = -73.240551
    row.categoria = "seguridad"
    row.severidad = "alta"
    row.fecha = __import__("datetime").datetime(2026, 8, 20, 10, 0)
    monkey = MagicMock(return_value=[row])
    original = survey_service.survey_repo.list_located_responses
    survey_service.survey_repo.list_located_responses = monkey
    try:
        [point] = survey_service.map_points(MagicMock())
    finally:
        survey_service.survey_repo.list_located_responses = original
    assert (point.lat, point.lng) == (10.4721, -73.2406)
