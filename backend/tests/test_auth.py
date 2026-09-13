from unittest.mock import MagicMock

from app.db import get_db
from app.main import app
from app.repositories import users as user_repo
from app.services.auth import create_access_token, decode_token, verify_password

SEED_HASH = "$2b$12$dIUeLEtnCMyUm/cOZQNHM.KQP16HBI7CE/DnYxY38M9XljezJiJa6"


class _User:
    id = 1
    usuario = "analista"
    contrasena_hash = SEED_HASH
    rol = "analista"
    nombre = "Analista Municipal"


def test_seed_password_matches_db_hash() -> None:
    assert verify_password("pulso2026", SEED_HASH)
    assert not verify_password("otra-clave", SEED_HASH)


def test_jwt_roundtrip() -> None:
    token = create_access_token("analista", "analista")
    payload = decode_token(token)
    assert payload["sub"] == "analista"
    assert payload["rol"] == "analista"
    assert payload["exp"] > payload["iat"]


def test_login_and_me_with_mocked_user(client, monkeypatch) -> None:
    monkeypatch.setattr(user_repo, "get_by_usuario", lambda db, usuario: _User())

    def _db():
        yield MagicMock()

    app.dependency_overrides[get_db] = _db

    login = client.post("/api/auth/login", json={"usuario": "analista", "contrasena": "pulso2026"})
    assert login.status_code == 200
    body = login.json()
    assert "token" in body
    assert body["usuario"] == {"id": 1, "usuario": "analista", "rol": "analista"}

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200
    assert me.json()["id"] == 1
    assert me.json()["usuario"] == "analista"


def test_login_rejects_bad_password(client, monkeypatch) -> None:
    monkeypatch.setattr(user_repo, "get_by_usuario", lambda db, usuario: _User())

    def _db():
        yield MagicMock()

    app.dependency_overrides[get_db] = _db
    response = client.post("/api/auth/login", json={"usuario": "analista", "contrasena": "mala"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Credenciales inválidas"}
