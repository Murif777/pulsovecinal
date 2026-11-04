"""Límite de frecuencia por IP (ventana deslizante en memoria).

Limitaciones conocidas: el contador vive en el proceso. Con varios workers o
varias instancias detrás del ALB cada uno cuenta por separado, así que el tope
efectivo es `límite × procesos`. Para un tope global usar una regla rate-based
de AWS WAF en el ALB (o Redis). Esto frena abuso casual y fuerza bruta simple.
"""

import time
from collections import deque
from collections.abc import Callable
from threading import Lock

from fastapi import HTTPException, Request

from app.config import get_settings

_MAX_KEYS = 10_000


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, key: str, now: float | None = None) -> float:
        """Registra un intento. Devuelve 0 si pasa o los segundos a esperar si se excede."""
        current = time.monotonic() if now is None else now
        cutoff = current - self.window
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.limit:
                return max(hits[0] + self.window - current, 1.0)
            hits.append(current)
            if len(self._hits) > _MAX_KEYS:
                self._prune(cutoff)
            return 0.0

    def _prune(self, cutoff: float) -> None:
        for key in [k for k, v in self._hits.items() if not v or v[-1] <= cutoff]:
            del self._hits[key]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def client_ip(request: Request, trusted_hops: int) -> str:
    """IP del cliente. Con N proxies de confianza se toma la N-ésima desde la derecha
    de X-Forwarded-For (lo que antepone el proxy más cercano no se puede falsear)."""
    forwarded = request.headers.get("x-forwarded-for", "")
    parts = [part.strip() for part in forwarded.split(",") if part.strip()]
    if trusted_hops > 0 and len(parts) >= trusted_hops:
        return parts[-trusted_hops]
    return request.client.host if request.client else "unknown"


ALL_LIMITERS: list[SlidingWindowLimiter] = []


def rate_limit(limit: int, window_seconds: float, scope: str) -> Callable[[Request], None]:
    """Dependencia de FastAPI: responde 429 + Retry-After al exceder `limit` por ventana."""
    limiter = SlidingWindowLimiter(limit, window_seconds)
    ALL_LIMITERS.append(limiter)

    def dependency(request: Request) -> None:
        settings = get_settings()
        if not settings.rate_limit_enabled:
            return
        wait = limiter.check(f"{scope}:{client_ip(request, settings.trusted_proxy_hops)}")
        if wait > 0:
            raise HTTPException(
                status_code=429,
                detail="Demasiados intentos. Espera un momento e intenta de nuevo.",
                headers={"Retry-After": str(int(wait) + 1)},
            )

    return dependency


def reset_all() -> None:
    for limiter in ALL_LIMITERS:
        limiter.reset()
