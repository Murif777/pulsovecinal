# PulsoVecinal — Backend FastAPI

Capa de negocio del proyecto. Consume el esquema de `db/` (no lo modifica) y expone el contrato congelado en `/api`.

## Levantar

```bash
# Desde la raíz del repo, con Docker Desktop y .env creado (Copy-Item db\.env.example .env)
docker compose up -d db
docker compose up -d --build backend
```

- Health: http://localhost:8000/health → `{"status":"ok"}`
- Swagger: http://localhost:8000/docs

## Endpoints

| Método | Ruta | Contrato |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| POST | `/api/encuestas` | crea `SurveyResponse` (201; 422 si el barrio no existe) |
| GET | `/api/encuestas` | `?barrio=&category=&severity=&comuna=&from=&to=` |
| GET | `/api/barrios` | `{ nombre, comuna, lat, lng }` |
| GET | `/api/mapa/reportes` | `?comuna=&category=&severity=` |
| GET | `/api/dashboard/resumen` | `?comuna=&category=&severity=&from=&to=` |
| POST | `/api/auth/login` | `{ token, usuario: { id, usuario, rol } }` |
| GET | `/api/auth/me` | Bearer JWT |

## Ejemplos curl

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/barrios
curl http://localhost:8000/api/mapa/reportes
curl http://localhost:8000/api/dashboard/resumen
curl -X POST http://localhost:8000/api/encuestas -H "Content-Type: application/json" -d "{\"barrio\":\"La Esperanza\",\"category\":\"seguridad\",\"severity\":\"alta\",\"description\":\"Prueba\"}"
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"usuario\":\"analista\",\"contrasena\":\"pulso2026\"}"
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

Usuario demo del seed: `analista` / `pulso2026`.

Cada push a `main` publica `miguecaramirez/pulsovecinal-backend` en Docker Hub
(`latest` y el SHA), con los secrets `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN`.

## Tests (sin PostgreSQL)

```bash
pip install -r backend/requirements.txt
pytest backend -q
```

## Desarrollo local sin Compose (API)

Con la BD ya arriba (`docker compose up -d db`) y `backend/.env` copiado de `.env.example` (host `localhost`, puerto `5433`):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
