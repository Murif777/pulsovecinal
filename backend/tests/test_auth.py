from app.config import get_settings
from app.services.auth import create_access_token, decode_token, verify_password

SEED_HASH = "$2b$12$dIUeLEtnCMyUm/cOZQNHM.KQP16HBI7CE/DnYxY38M9XljezJiJa6"


def test_seed_password_matches_db_hash() -> None:
    assert verify_password("pulso2026", SEED_HASH)
    assert not verify_password("otra-clave", SEED_HASH)


def test_jwt_roundtrip() -> None:
    token = create_access_token("analista", "analista")
    payload = decode_token(token)
    assert payload["sub"] == "analista"
    assert payload["rol"] == "analista"
    assert payload["exp"] > payload["iat"]


def test_jwt_uses_configured_secret() -> None:
    token = create_access_token("analista", "analista")
    payload = decode_token(token)
    assert payload["sub"] == "analista"
    assert get_settings().jwt_algorithm == "HS256"
