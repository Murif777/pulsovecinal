# PLAN — PulsoVecinal · Entrega Base Inicial

- **Fecha**: 2026-08-22
- **Autor**: web-planner (murif-web)
- **Proyecto**: PulsoVecinal — plataforma web de encuestas ciudadanas georreferenciadas (Valledupar, Colombia)
- **Alcance**: entrega base inicial (skeleton sin backend/BD) para actividad académica con Trunk-Based Development

---

## 1. Stack elegido + justificación

| Capa | Elección |
|---|---|
| Build / SPA | Vite 5 + React 18 + TypeScript 5 (strict) |
| Estilos | Tailwind CSS 3.4.x (pipeline postcss clásico) |
| Routing | React Router DOM ^6 |
| Tests | Vitest ^3 + @testing-library/react + jsdom (smoke tests) |
| Lint/typecheck | ESLint (typescript-eslint) + `tsc --noEmit` |
| Node | LTS 22, pinned en `.nvmrc` + `engines` |
| CI | GitHub Actions: lint + typecheck + build + test en push/PR a `main` |

**Justificación (3 líneas)**: SPA client-heavy sin SSR ni SEO → Vite + React + TS es el estándar mínimo y "aburrido"; el build estático servible por nginx facilita la Dockerización de la siguiente fase; sin backend ni BD en esta entrega no se necesita nada más. Tailwind 3.4 por ser el pipeline más documentado y estable para estudiantes, Vitest por ser nativo de Vite (CI rápido).

**Convención de idioma**: toda la UI en español; identificadores, comentarios y nombres de archivo en **inglés** (evita problemas de encoding con acentos y mezcla de idiomas). Se declara en el README.

**SUPUESTO**: si el builder prefiere Tailwind v4, debe actualizar este plan antes de implementar (v3.4 es la elección por estabilidad).

---

## 2. Estructura de archivos

```
pulsovecinal/
├── .github/
│   └── workflows/
│       └── ci.yml                  ← lint + typecheck + build + test (push/PR a main)
├── .gitattributes                  ← eol=lf (evita problemas CRLF en Windows/CI)
├── .gitignore
├── .nvmrc                          ← 22
├── README.md                       ← español: intro, stack, run local, workflow TBD
├── index.html
├── package.json                    ← scripts: dev/build/preview/lint/typecheck/test
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── vite.config.ts                  ← plugin react + tailwindcss + vitest config
└── src/
    ├── main.tsx
    ├── App.tsx                     ← ROUTER (compartido, estable, se congela tras S2)
    ├── index.css                   ← directivas tailwind
    ├── components/
    │   └── layout/
    │       ├── AppLayout.tsx       ← shell con <Outlet/>
    │       ├── Navbar.tsx          ← links: /, /encuesta, /mapa, /dashboard
    │       └── Footer.tsx
    ├── features/                   ← UNA CARPETA POR FEATURE (regla TBD)
    │   ├── encuesta/
    │   │   └── EncuestaPage.tsx
    │   ├── mapa/
    │   │   └── MapaPage.tsx
    │   └── dashboard/
    │       └── DashboardPage.tsx
    ├── lib/                        ← compartido: SOLO se añade, no se modifica lo existente
    │   ├── types.ts                ← contratos TS (ver §3)
    │   └── mockData.ts             ← datos mock de Valledupar
    └── __tests__/
        ├── app.smoke.test.tsx      ← renderiza App + rutas
        └── mockData.test.ts        ← valida forma de los contratos
```

**Regla de oro TBD**: cada miembro toca SOLO `src/features/<su-feature>/`. `App.tsx` y `components/layout/` son compartidos y estables (se tocan una vez en S2 y quedan congelados). `lib/` es compartido pero solo se **añaden** tipos/datos, nunca se modifican los existentes.

---

## 3. Contratos de datos (resumen de `src/lib/types.ts`)

Documentados con JSDoc. Sin backend: los features desarrollan contra estos tipos + `mockData.ts`.

- `SurveyCategory = 'seguridad' | 'alcantarillado' | 'energia' | 'vias' | 'espacios_publicos' | 'otros'`
- `Severity = 'baja' | 'media' | 'alta' | 'critica'`
- `SurveyResponse { id: string; barrio: string; comuna: string; category: SurveyCategory; severity: Severity; date: string /* ISO */; notes?: string }`
- `MapReport { id: string; barrio: string; comuna: string; category: SurveyCategory; severity: Severity; count: number; lastReportedAt: string; lat?: number; lng?: number }` — `lat/lng` opcionales, reservados para Leaflet en fase futura
- `CriticalBarrio { barrio: string; comuna: string; score: number; topCategory: SurveyCategory }`
- `DashboardSummary { totalResponses: number; byCategory: Record<SurveyCategory, number>; bySeverity: Record<Severity, number>; criticalBarrios: CriticalBarrio[] }`

`src/lib/mockData.ts` exporta: `mockSurveyResponses: SurveyResponse[]` (8–10 registros realistas de barrios de Valledupar: La Nevada, Los Cortijos, El Prado, Novalito, Dangond, Garupal, San Joaquín, Villa Castilla, La Esperanza, 450 Años; comunas 1–6), `mockMapReports: MapReport[]` y `mockDashboardSummary: DashboardSummary` derivado de las respuestas.

---

## 4. Slices (orden de ejecución)

### Slice 1 — Scaffold + CI + repo local
**Toca**: `package.json`, `vite.config.ts`, `tsconfig*`, `index.html`, `src/main.tsx`, `src/index.css`, `.nvmrc`, `.gitignore`, `.gitattributes`, `eslint.config.js`, `.github/workflows/ci.yml`
**Implementa**: proyecto Vite React-TS con Tailwind 3.4 y React Router instalados; scripts `lint`/`typecheck`/`build`/`test`; workflow CI con `node-version-file: .nvmrc` corriendo `npm ci` + lint + typecheck + build + test; `git init -b main` + commit inicial.
**Listo cuando**: `npm run lint`, `npm run typecheck`, `npm run build` y `npm run test` pasan localmente; `git log` muestra el commit inicial en `main`; el YAML de CI existe y es válido.
**Tests**: los 4 comandos npm locales (el CI los replica).
**Complejidad**: media

### Slice 2 — Layout + routing + landing
**Toca**: `src/App.tsx`, `src/components/layout/*`, `src/features/*` (3 páginas placeholder mínimas con título), `src/__tests__/app.smoke.test.tsx`
**Implementa**: `AppLayout` con `Navbar` (links a `/`, `/encuesta`, `/mapa`, `/dashboard`) y `Footer`; router con las 4 rutas; landing con tagline **"Toma el pulso a tu barrio"** + descripción del proyecto.
**Listo cuando**: `npm run dev` muestra la landing en `/` con el tagline; los 3 links navegan a sus rutas; el smoke test renderiza `App` y encuentra el tagline y los 3 links.
**Tests**: `npm run test` (smoke test de App).
**Complejidad**: media

### Slice 3 — Capa de datos mock + contratos
**Toca**: `src/lib/types.ts`, `src/lib/mockData.ts`, `src/__tests__/mockData.test.ts`
**Implementa**: interfaces TS documentadas + datos mock realistas de Valledupar.
**Listo cuando**: `npm run typecheck` pasa; el test unitario valida que `mockDashboardSummary.byCategory` cubre las 6 categorías, que `totalResponses === suma(byCategory)` y que cada `SurveyResponse` tiene `category`/`severity` válidos.
**Tests**: `npm run test` (`mockData.test.ts`).
**Complejidad**: baja

### Slice 4 — Páginas placeholder de las 3 features
**Toca**: `src/features/encuesta/EncuestaPage.tsx`, `src/features/mapa/MapaPage.tsx`, `src/features/dashboard/DashboardPage.tsx`
**Implementa**: cada página con título claro, descripción de la feature futura y badge visible **"En construcción"**; estructura mínima para que cada miembro arranque su feature sin tocar archivos compartidos.
**Listo cuando**: navegando a `/encuesta`, `/mapa` y `/dashboard` se ve título + descripción + "En construcción"; el smoke test de rutas pasa (renderiza cada ruta con `MemoryRouter` y encuentra su título y el badge).
**Tests**: `npm run test` (extensión del smoke test con las 3 rutas).
**Complejidad**: baja

### Slice 5 — README + docs TBD + push a GitHub
**Toca**: `README.md`, (opcional) `.github/PULL_REQUEST_TEMPLATE.md`
**Implementa**: README en español (intro, stack, cómo correr local, workflow TBD: naming `feat/<nombre>`, ramas cortas desde `main`, PR → review → squash merge, asignación de features: miembro A → encuesta, B → mapa, C → dashboard); crear repo público `Murif777/pulsovecinal`, `git remote add origin`, push de `main`; verificar CI verde en GitHub.
**Listo cuando**: README completo y renderizado en GitHub; repo público accesible; el workflow CI pasa en el primer push; `git log --oneline` muestra el commit inicial en `main`.
**Tests**: verificación manual en GitHub (Actions green, README renderizado).
**Complejidad**: baja

---

## 5. Estrategia de tests por slice (qué corre @web-tester)

| Slice | Comandos / verificación |
|---|---|
| S1 | `npm run lint` · `npm run typecheck` · `npm run build` · `npm run test` (los 4 en verde) |
| S2 | `npm run test` (smoke: tagline + 3 links) · `npm run dev` manual: navegación entre rutas |
| S3 | `npm run test` (mockData.test.ts) · `npm run typecheck` |
| S4 | `npm run test` (smoke de rutas: título + badge por ruta) · `npm run dev` manual: click en navbar |
| S5 | Manual en GitHub: Actions verde en primer push, README renderizado, repo público |

---

## 6. Out of scope (explícito)

- Backend/API real, base de datos, auth/roles de usuario
- Integración Leaflet/OpenStreetMap y librerías de charts (recharts, etc.)
- Implementación real de las 3 features (formulario de encuesta, mapa interactivo, dashboard con datos)
- PWA/offline, i18n, exportación PDF/Excel, notificaciones
- **Dockerfile / imagen DockerHub / deployment** (fase siguiente, tras merge de features)
- Tests más allá de smoke + unit de la capa mock

---

## 7. Riesgos y notas

- **Windows**: CRLF → `.gitattributes` con `* text=auto eol=lf`; el working dir tiene espacios en la ruta (`...\Proyectos\Encuestas Ciudadanas Georreferenciadas`) → citar rutas en comandos.
- **Git**: verificado que el directorio NO es repo aún → S1 hace `git init -b main`.
- **gh CLI**: disponibilidad/auth desconocida → si `gh auth status` falla, crear el repo por web UI y `git remote add origin https://github.com/Murif777/pulsovecinal.git`.
- **Node**: versión local desconocida → `.nvmrc` = 22; el builder verifica `node --version` antes de instalar.
- **Versiones**: Tailwind 3.4.x y React Router ^6 elegidos por documentación estable; el builder resuelve el último patch.
- **SUPUESTO**: la asignación A/B/C de features se documenta en el README; los nombres reales los define el equipo.