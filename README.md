# PulsoVecinal

[![CI](https://github.com/Murif777/pulsovecinal/actions/workflows/ci.yml/badge.svg)](https://github.com/Murif777/pulsovecinal/actions/workflows/ci.yml)

**Toma el pulso a tu barrio** 🩺📍

PulsoVecinal es una plataforma de encuestas ciudadanas georreferenciadas para priorizar las necesidades barriales de **Valledupar, Colombia**. Los habitantes reportan problemas de su barrio (seguridad, alcantarillado, energía, vías, espacios públicos), indican qué tan urgente es cada uno, y la plataforma concentra esa información en un mapa interactivo y un dashboard de criticidad para que la voz de la comunidad oriente las decisiones locales.

> ⚠️ **Estado actual**: el mapa interactivo (`/mapa`) está implementado con Leaflet + OpenStreetMap, el formulario de encuestas (`/encuesta`) consume la API real y el dashboard de criticidad (`/dashboard`) muestra KPIs, ranking de barrios, gráficas y filtros por comuna/categoría/severidad, protegido por un login de demostración (`/login`: `analista` / `pulso2026`). Arquitectura de 3 capas: el frontend consume el backend **FastAPI** (`/api`), que persiste en **PostgreSQL + PostGIS** (`db/`); el navegador solo conserva el token JWT de sesión.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Build / SPA | Vite 5 + React 18 |
| Lenguaje | TypeScript 5 (strict) |
| Estilos | Tailwind CSS 3.4 |
| Routing | React Router DOM 6 |
| Tests | Vitest 3 + Testing Library + jsdom |
| Lint / tipos | ESLint 9 (typescript-eslint) + `tsc -b` |
| Node | LTS 22 (`.nvmrc` + `engines`) |
| CI | GitHub Actions: lint + typecheck + build + test |
| Contenedor | Docker multi-stage: Node 22 (build) → nginx 1.27 |
| API (backend/) | FastAPI — contrato congelado en `/api` |
| Base de datos (db/) | PostgreSQL 16 + PostGIS 3.4 |

## Cómo correr el proyecto localmente

Requisitos: **Node.js 22** (o superior) y npm.

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo → http://localhost:5173
```

> ℹ️ El servidor de desarrollo proxya `/api` hacia el backend (`http://localhost:8000`). Para levantar la API y la base de datos ver [Cómo correr con Docker](#cómo-correr-con-docker) o el [README del backend](backend/README.md).

Scripts disponibles:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Typecheck + build de producción a `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run test` | Corre la suite de tests (Vitest) |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run typecheck` | Verificación de tipos (`tsc -b`) |

Antes de cada commit se recomienda correr los cuatro checks:

```bash
npm run lint && npm run typecheck && npm run build && npm run test
```

## Cómo correr con Docker

Requisito: **Docker Desktop** (motor en marcha).

> ⚠️ Antes del primer `docker compose up`, crea el `.env` desde la plantilla (`Copy-Item db\.env.example .env`) y asigna `POSTGRES_PASSWORD` (ver [db/README.md](db/README.md)).

```bash
docker compose up --build
```

La app queda en http://localhost:8080 (nginx sirve el build de Vite; las rutas de React Router caen en `index.html` y `/api` se proxya al backend). Compose levanta las tres capas: `web` (nginx → :8080), `backend` (FastAPI → :8000, Swagger en http://localhost:8000/docs) y `db` (PostgreSQL + PostGIS → :5433).

Equivalente sin Compose:

```bash
docker build -t pulsovecinal:local .
docker run --rm -p 8080:80 pulsovecinal:local
```

Para detener Compose: `docker compose down`.

Desde Docker Hub (sin clonar el repo):

```bash
docker run --rm -p 8080:80 miguecaramirez/pulsovecinal:latest
docker run --rm -p 8000:8000 miguecaramirez/pulsovecinal-backend:latest
docker run --rm -p 5433:5432 -e POSTGRES_USER=pulso -e POSTGRES_PASSWORD=TU_PASSWORD -e POSTGRES_DB=pulsovecinal miguecaramirez/pulsovecinal-db:latest
```

| Capa | Imagen |
|---|---|
| Front | [miguecaramirez/pulsovecinal](https://hub.docker.com/r/miguecaramirez/pulsovecinal) |
| Back | [miguecaramirez/pulsovecinal-backend](https://hub.docker.com/r/miguecaramirez/pulsovecinal-backend) |
| BD | [miguecaramirez/pulsovecinal-db](https://hub.docker.com/r/miguecaramirez/pulsovecinal-db) |

Cada push a `main` reconstruye y publica las tres (`latest` y el SHA del commit) con GitHub Actions. Hay que definir en el repo los secrets `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN` (Settings → Secrets and variables → Actions). El token se crea en Docker Hub: Account Settings → Personal access tokens.

## Estructura del proyecto

```
pulsovecinal/
├── .github/workflows/ci.yml              ← CI: lint + typecheck + build + test
├── .github/workflows/docker-publish.yml  ← push a main → imágenes front, back y db en Hub
├── Dockerfile                     ← imagen multi-stage (Vite → nginx)
├── docker-compose.yml             ← `docker compose up --build` → web :8080 + backend :8000 + db :5433
├── nginx.conf                     ← SPA fallback + proxy `/api` → backend:8000
├── backend/                       ← API FastAPI (contrato `/api`) — ver backend/README.md
├── db/                            ← PostgreSQL 16 + PostGIS (schema + seed) — ver db/README.md
├── src/
│   ├── App.tsx                    ← router compartido (congelado tras S2)
│   ├── components/
│   │   ├── layout/                ← AppLayout, Navbar, Footer (compartido)
│   │   └── PlaceholderPage.tsx    ← layout común de placeholders
│   ├── features/                  ← UNA CARPETA POR FEATURE (regla TBD)
│   │   ├── landing/               ← página de inicio ("/")
│   │   ├── encuesta/              ← Integrante A → /encuesta
│   │   ├── mapa/                  ← Integrante B → /mapa
│   │   └── dashboard/             ← Integrante C → /dashboard
│   ├── lib/
│   │   ├── api.ts                 ← cliente de la API (`/api`): apiGet/apiPost + sesión 401
│   │   ├── types.ts               ← contratos TS compartidos
│   │   ├── mockData.ts            ← fixtures espejo del backend + agregadores (tests)
│   │   └── __tests__/             ← tests unitarios de la capa de datos
│   └── __tests__/                 ← smoke tests de rutas
└── index.html
```

## Flujo de datos (front ↔ API)

Arquitectura de 3 capas: el frontend (React) consume la API **FastAPI** (`/api`), que persiste en **PostgreSQL + PostGIS**. El navegador no guarda datos de dominio: solo conserva el token JWT de sesión.

```
                 /encuesta        /mapa        /dashboard
                     │              │               │
                     ▼              ▼               ▼
               src/lib/api.ts  ← cliente único (base `/api`)
                     │
   nginx (prod :8080) / Vite (dev :5173) proxyan `/api` sin rewrite
                     │
                     ▼
            backend FastAPI (:8000, host `backend`)
                     │
                     ▼
     PostgreSQL + PostGIS (`db`)      ← fuente de verdad
```

Endpoints consumidos por el front:

| Endpoint | Uso |
|---|---|
| `POST /api/auth/login` | Login demo (`analista` / `pulso2026`) → `{ token, usuario }` |
| `GET /api/barrios` | Catálogo territorial del formulario `/encuesta` |
| `POST /api/encuestas` | Registra un reporte ciudadano (201) |
| `GET /api/encuestas` | Lista de reportes del formulario |
| `GET /api/mapa/reportes` | Reportes agregados del mapa |
| `GET /api/dashboard/resumen` | KPIs, ranking y gráficas del dashboard |

- El **dashboard** aplica los filtros (comuna/categoría/severidad) en cliente sobre el resumen y los reportes obtenidos de la API.
- Un **401** de cualquier endpoint limpia la sesión y redirige a `/login` (`src/lib/api.ts`).
- `src/lib/mockData.ts` ya no alimenta la UI: queda como fixture espejo del seed del backend para los tests (agregadores `getMapReports` / `getDashboardSummary`).

**Convención de idioma**: la UI está en español; identificadores, comentarios y nombres de archivo en inglés.

## Flujo de trabajo — Trunk-Based Development

El equipo trabaja contra una sola rama longeva (`main`) con ramas de vida corta:

1. **Nombres de rama**: `feat/<nombre>` (ej. `feat/mapa`, `feat/dashboard-charts`).
2. **Ramas cortas**: se crean siempre desde el `main` más reciente y viven pocos días.
3. **Commits pequeños**: un commit = un cambio coherente y verificable.
4. **PR obligatorio**: todo cambio entra a `main` vía Pull Request → revisión de un compañero → **Squash and merge**.
5. **CI en verde**: el workflow de GitHub Actions (lint + typecheck + build + test) debe pasar antes del merge.
6. **Regla de oro**: cada integrante toca SOLO su carpeta `src/features/<su-feature>/`. `App.tsx`, `components/` y `lib/` son compartidos: solo se **añade**, nunca se modifica lo existente sin acordarlo con el equipo.

### Asignación de features

| Integrante | Feature | Ruta | Carpeta |
|---|---|---|---|
| Integrante A | Encuestas (formulario de reporte ciudadano) | `/encuesta` | `src/features/encuesta/` |
| Integrante B | Mapa interactivo (Leaflet + OpenStreetMap) | `/mapa` | `src/features/mapa/` |
| Integrante C | Dashboard de criticidad (charts + ranking) | `/dashboard` | `src/features/dashboard/` |

### Paso a paso para cada integrante

Los comandos son idénticos para A, B y C; solo cambia el nombre de la rama y la carpeta. Ejemplo para el **Integrante B** (Mapa):

```bash
# 1. Actualizar main y crear la rama de trabajo desde él
git checkout main
git pull origin main
git checkout -b feat/mapa

# 2. Desarrollar SOLO dentro de tu carpeta
#    src/features/mapa/MapaPage.tsx (+ archivos nuevos que necesites ahí)

# 3. Verificar localmente antes de subir (los 4 checks en verde)
npm run lint && npm run typecheck && npm run build && npm run test

# 4. Commits pequeños y descriptivos
git add src/features/mapa
git commit -m "feat(mapa): renderiza reportes mock en mapa Leaflet"

# 5. Subir la rama y abrir el Pull Request hacia main
git push -u origin feat/mapa
gh pr create --base main --title "feat(mapa): ..." --fill
#    (sin gh CLI: abre el PR desde github.com → botón "Compare & pull request")

# 6. Tras la revisión de un compañero y CI en verde → "Squash and merge"
# 7. Limpiar la rama local
git checkout main
git pull origin main
git branch -d feat/mapa
```

Para el Integrante A usa `feat/encuesta` y `src/features/encuesta/`; para el Integrante C usa `feat/dashboard` y `src/features/dashboard/`.

## Roadmap

- [ ] **Fase 1 — Features reales**
  - [x] Formulario de encuesta conectado a la capa de datos (A).
  - [x] Mapa interactivo en `/mapa` (B): Leaflet + OpenStreetMap con un `CircleMarker` por barrio (radio ∝ reportes, color = semáforo de severidad), popups con desglose por categoría, filtros por categoría/severidad/comuna y leyenda.
  - [x] Dashboard con gráficas y ranking de criticidad (C): KPIs, ranking de barrios más críticos, distribución por categoría/severidad (recharts), filtro por comuna y login simulado en `/login` (demo académica — **no es seguridad real**).
- [x] **Fase 2 — Dockerización**: `Dockerfile` multi-stage (build Vite → nginx), `docker compose up --build` e imagen en Docker Hub: `miguecaramirez/pulsovecinal`.
- [x] **Fase 3 — Demo con Docker**: `docker run --rm -p 8080:80 miguecaramirez/pulsovecinal:latest`.
- [x] **Fase 4 — Backend y base de datos**: API FastAPI en `backend/` (contrato congelado en `/api`) y PostgreSQL 16 + PostGIS en `db/`. El front consume la API; el almacenamiento en `localStorage` fue reemplazado (el navegador solo conserva el token JWT).
- [ ] **Fase futura**: ampliaciones sobre la base actual (roles reales, moderación de reportes, exportación de datos).

## Licencia

Proyecto académico — uso educativo.
