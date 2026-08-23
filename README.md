# PulsoVecinal

[![CI](https://github.com/Murif777/pulsovecinal/actions/workflows/ci.yml/badge.svg)](https://github.com/Murif777/pulsovecinal/actions/workflows/ci.yml)

**Toma el pulso a tu barrio** 🩺📍

PulsoVecinal es una plataforma de encuestas ciudadanas georreferenciadas para priorizar las necesidades barriales de **Valledupar, Colombia**. Los habitantes reportan problemas de su barrio (seguridad, alcantarillado, energía, vías, espacios públicos), indican qué tan urgente es cada uno, y la plataforma concentra esa información en un mapa interactivo y un dashboard de criticidad para que la voz de la comunidad oriente las decisiones locales.

> ⚠️ **Estado actual**: entrega base inicial (skeleton). Las tres features son páginas placeholder "En construcción"; los datos provienen de una capa mock (`src/lib/mockData.ts`). Sin backend ni base de datos todavía.

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

## Estructura del proyecto

```
pulsovecinal/
├── .github/workflows/ci.yml       ← CI: lint + typecheck + build + test
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
│   │   └── __tests__/             ← tests unitarios de la capa de datos
│   └── __tests__/                 ← smoke tests de rutas
└── index.html
```

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

- [ ] **Fase 1 — Features reales**: formulario de encuesta conectado a la capa de datos (A), mapa Leaflet con marcadores por barrio (B), dashboard con gráficas y ranking de criticidad (C).
- [ ] **Fase 2 — Dockerización**: `Dockerfile` multi-stage (build Vite → nginx), imagen publicada en DockerHub.
- [ ] **Fase 3 — Demo con Docker**: `docker run -p 8080:80 <usuario>/pulsovecinal` como demostración de despliegue.
- [ ] **Fase futura**: backend/API real y base de datos, reemplazando la capa mock.

## Licencia

Proyecto académico — uso educativo.
