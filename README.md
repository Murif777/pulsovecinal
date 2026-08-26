# PulsoVecinal

[![CI](https://github.com/Murif777/pulsovecinal/actions/workflows/ci.yml/badge.svg)](https://github.com/Murif777/pulsovecinal/actions/workflows/ci.yml)

**Toma el pulso a tu barrio** 🩺📍

PulsoVecinal es una plataforma de encuestas ciudadanas georreferenciadas para priorizar las necesidades barriales de **Valledupar, Colombia**. Los habitantes reportan problemas de su barrio (seguridad, alcantarillado, energía, vías, espacios públicos), indican qué tan urgente es cada uno, y la plataforma concentra esa información en un mapa interactivo y un dashboard de criticidad para que la voz de la comunidad oriente las decisiones locales.

> ⚠️ **Estado actual**: el mapa interactivo (`/mapa`) ya está implementado con Leaflet + OpenStreetMap, el formulario de encuestas (`/encuesta`) está conectado a la capa de datos y el dashboard de criticidad (`/dashboard`) ya muestra KPIs, ranking de barrios, gráficas y filtro por comuna, protegido por un login de demostración (`/login`). Los datos provienen de una capa mock (`src/lib/mockData.ts`) más los reportes ciudadanos guardados en `localStorage` desde `/encuesta`, que el mapa y el dashboard integran automáticamente (el dashboard los incluye por defecto). Sin backend ni base de datos todavía.

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

## Cómo correr el proyecto localmente

Requisitos: **Node.js 22** (o superior) y npm.

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo → http://localhost:5173
```

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

```bash
docker compose up --build
```

La app queda en http://localhost:8080 (nginx sirve el build de Vite; las rutas de React Router caen en `index.html`).

Equivalente sin Compose:

```bash
docker build -t pulsovecinal:local .
docker run --rm -p 8080:80 pulsovecinal:local
```

Para detener Compose: `docker compose down`.

Desde Docker Hub (sin clonar el repo):

```bash
docker run --rm -p 8080:80 miguecaramirez/pulsovecinal:latest
```

Imagen: [miguecaramirez/pulsovecinal](https://hub.docker.com/r/miguecaramirez/pulsovecinal)

## Estructura del proyecto

```
pulsovecinal/
├── .github/workflows/ci.yml       ← CI: lint + typecheck + build + test
├── Dockerfile                     ← imagen multi-stage (Vite → nginx)
├── docker-compose.yml             ← `docker compose up --build` → :8080
├── nginx.conf                     ← SPA fallback + gzip
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
│   │   ├── types.ts               ← contratos TS compartidos
│   │   ├── mockData.ts            ← datos mock de Valledupar + agregadores
│   │   ├── surveyStorage.ts       ← persistencia localStorage de encuestas (compartido)
│   │   └── __tests__/             ← tests unitarios de la capa de datos
│   └── __tests__/                 ← smoke tests de rutas
└── index.html
```

## Flujo de datos

Sin backend todavía, los datos viven en dos capas del navegador:

1. **Dataset mock** (`src/lib/mockData.ts`): 20 respuestas de referencia de Valledupar, la base con la que arrancan el mapa y el dashboard.
2. **Reportes ciudadanos** (`localStorage`): cada envío del formulario `/encuesta` se persiste en la clave `pulsovecinal.surveyResponses` a través de `src/lib/surveyStorage.ts`, el módulo compartido de persistencia (validación de payloads corruptos + derivación de comuna). `/encuesta` escribe; `/mapa` y `/dashboard` leen.

```
/encuesta (formulario)
   │  appendSurveyResponse() → localStorage['pulsovecinal.surveyResponses']
   ▼
src/lib/surveyStorage.ts   ← fuente única de persistencia
   │
   ├──► /mapa      getMapReports([...mock, ...ciudadanos]) → marcadores extra
   └──► /dashboard mergeResponses(mock, includeCitizen)    → KPIs / ranking / gráficas
```

- El **mapa** fusiona los reportes ciudadanos con el dataset mock al montar la página; un refresh recoge los nuevos registros.
- El **dashboard** incluye los reportes ciudadanos **por defecto** (`EMPTY_FILTERS.includeCitizen = true`); el toggle "Incluir reportes ciudadanos" del panel solo los oculta.
- `src/features/encuesta/storage.ts` es un shim que re-exporta `src/lib/surveyStorage.ts` para mantener intacta la superficie pública de la feature.

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
- [ ] **Fase futura**: backend/API real y base de datos, reemplazando la capa mock.

## Licencia

Proyecto académico — uso educativo.
