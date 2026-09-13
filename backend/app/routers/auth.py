"""POST /api/auth/login + GET /api/auth/me."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.db import get_db
from app.errors import UnauthorizedError
from app.repositories import users as user_repo
from app.schemas import LoginRequest, TokenOut, UsuarioPublic
from app.services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> UsuarioPublic:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    try:
        payload = auth_service.decode_token(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Credenciales inválidas") from exc
    usuario = payload.get("sub")
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    user = user_repo.get_by_usuario(db, str(usuario))
    if user is None:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return UsuarioPublic(id=user.id, usuario=user.usuario, rol=user.rol, nombre=user.nombre)


@router.post("/login", response_model=TokenOut, response_model_exclude_none=True)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenOut:
    try:
        return auth_service.login(db, payload.usuario, payload.contrasena)
    except UnauthorizedError as exc:
        raise HTTPException(status_code=401, detail=exc.message) from exc


@router.get("/me", response_model=UsuarioPublic)
def me(current: UsuarioPublic = Depends(get_current_user)) -> UsuarioPublic:
    return current
