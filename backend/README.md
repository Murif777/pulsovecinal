# PulsoVecinal — Capa de negocio (API)

API REST de PulsoVecinal. Es la **capa intermedia** de la arquitectura de tres capas:

| Capa | Carpeta / imagen | Responsabilidad |
|---|---|---|
| Presentación | raíz del repo → `pulsovecinal:local` (nginx) | SPA React |
| Negocio | `backend/` → `pulsovecinal-api:local` | FastAPI, reglas y JWT |
| Datos | `db/` → `postgis/postgis:16-3.4-alpine` | PostgreSQL + PostGIS |

Esta carpeta **no** incluye el frontend ni el esquema SQL. Consume el contrato de `db/init/01-schema.sql` y el DSN documentado en `db/README.md`.

## Estructura

```
backend/
├── app/
│   ├── routers/         ← HTTP (presentación de la API)
│   ├── services/        ← reglas de negocio (agregaciones, auth)
│   ├── repositories/    ← acceso a PostgreSQL / PostGIS
│   ├── models.py        ← ORM espejo del esquema (no crea tablas)
│   └── main.py
├── tests/               ← pytest (sin Docker)
├── Dockerfile           ← imagen solo de la API
└── .env.example
```

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Liveness (no toca la BD) |
| GET | `/ready` | Readiness (`SELECT 1` a PostgreSQL) |
| GET | `/api/barrios` | Catálogo con `lat`/`lng` (PostGIS) |
| GET | `/api/surveys` | Lista de encuestas (filtros: `barrio`, `category`, `severity`) |
| GET | `/api/surveys/{id}` | Detalle |
| POST | `/api/surveys` | Crea encuesta (barrio, category, severity, description) |
| GET | `/api/map/reports` | Agregados para el mapa |
| GET | `/api/dashboard/summary` | Criticidad del dashboard |
| POST | `/api/auth/login` | JWT (`usuario` + `contrasena`) |
| GET | `/api/auth/me` | Usuario del token |

El JSON de encuestas usa los mismos nombres que `src/lib/types.ts` (`category`, `severity`, `description`, `date`).

Usuario demo del seed: `analista` / `pulso2026` (solo académico).

## Correr solo la imagen de la API

```bash
docker build -t pulsovecinal-api:local ./backend
docker run --rm -p 8000:8000 --env-file .env pulsovecinal-api:local
```

Desde el host, `POSTGRES_HOST` debe ser `host.docker.internal` (Windows/macOS) o la IP de la BD; el puerto interno de PostgreSQL es `5432`. En Compose el hostname es `db`.

DSN (mismo contrato que la capa de datos):

```
postgresql+psycopg://pulso:${POSTGRES_PASSWORD}@db:5432/pulsovecinal
```

Docs interactivas: http://localhost:8000/docs

## Compose (tres imágenes)

Con el `.env` de la raíz (copia `db/.env.example` y asigna `POSTGRES_PASSWORD`):

```bash
docker compose up --build -d db api
```

La API queda en http://localhost:8000 y espera a que `db` esté `healthy`. El servicio `web` se construye por separado (`docker compose up --build web`).

## Desarrollo local (sin Docker)

Requisito: Python 3.12 (o 3.11) y una BD ya levantada (`docker compose up -d db`).

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Git Bash / Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
# Si la BD corre en el host:
#   $env:POSTGRES_HOST="localhost"; $env:POSTGRES_PORT="5433"
uvicorn app.main:app --reload --port 8000
```

```bash
pytest
```

## Variables de entorno

Ver `.env.example`. Secretos solo en el `.env` de la raíz (no se versiona).
