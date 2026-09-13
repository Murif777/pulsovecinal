"""Autenticación de analistas: bcrypt del seed + JWT de sesión."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import UnauthorizedError
from app.repositories import users as user_repo
from app.schemas import TokenOut


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(usuario: str, rol: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": usuario,
        "rol": rol,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def login(db: Session, usuario: str, contrasena: str) -> TokenOut:
    user = user_repo.get_by_usuario(db, usuario)
    if user is None or not verify_password(contrasena, user.contrasena_hash):
        raise UnauthorizedError("credenciales inválidas")
    return TokenOut(
        access_token=create_access_token(user.usuario, user.rol),
        usuario=user.usuario,
        rol=user.rol,
        nombre=user.nombre,
    )
