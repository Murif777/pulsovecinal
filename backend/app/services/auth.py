"""Autenticación: passlib/bcrypt + JWT HS256 (python-jose)."""

from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import UnauthorizedError
from app.repositories import users as user_repo
from app.schemas import TokenOut, UsuarioPublic

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except (ValueError, TypeError):
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
        raise UnauthorizedError("Credenciales inválidas")
    return TokenOut(
        token=create_access_token(user.usuario, user.rol),
        usuario=UsuarioPublic(id=user.id, usuario=user.usuario, rol=user.rol),
    )
