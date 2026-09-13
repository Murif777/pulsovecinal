"""Login JWT alineado al usuario demo de `db/init/02-seed.sql`."""

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import UnauthorizedError
from app.repositories import users as user_repo
from app.schemas import LoginRequest, TokenOut, UserOut
from app.services import auth as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> UserOut:
    if credentials is None:
        raise HTTPException(status_code=401, detail="token requerido")
    try:
        payload = auth_service.decode_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="token inválido") from exc
    usuario = payload.get("sub")
    if not usuario:
        raise HTTPException(status_code=401, detail="token inválido")
    user = user_repo.get_by_usuario(db, str(usuario))
    if user is None:
        raise HTTPException(status_code=401, detail="token inválido")
    return UserOut(usuario=user.usuario, rol=user.rol, nombre=user.nombre)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenOut:
    try:
        return auth_service.login(db, payload.usuario, payload.contrasena)
    except UnauthorizedError as exc:
        raise HTTPException(status_code=401, detail=exc.message) from exc


@router.get("/me", response_model=UserOut)
def me(current: UserOut = Depends(get_current_user)) -> UserOut:
    return current
