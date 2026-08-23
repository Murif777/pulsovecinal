# WORKFLOW_STATE
estado_global: planificado
slice_actual: ninguno
## planner
- PLAN.md escrito: 2026-08-22
- slices totales: 5
## builder
slice_1: completado 2026-08-22
archivos: [package.json, package-lock.json, tsconfig.json, tsconfig.app.json, tsconfig.node.json, vite.config.ts, eslint.config.js, tailwind.config.js, postcss.config.js, index.html, src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts, src/__tests__/app.smoke.test.tsx, .nvmrc, .gitignore, .gitattributes, .github/workflows/ci.yml]
desviaciones:
  - Node local v24.18.0 (no LTS 22): fijado .nvmrc=22 y engines.node=">=22.0.0" en package.json; los 4 comandos verificados en local con node 24, CI usará 22 vía node-version-file.
  - .codegraph/ añadido a .gitignore (caché binaria local regenerable, no es código del proyecto).
  - tsconfig.app.json con 2 flags estrictos extra sobre el template oficial: noUncheckedIndexedAccess y verbatimModuleSyntax (plan exige TS strict).
  - src/main.tsx usa guard explícito en vez del non-null assertion (!) del template.
  - README.md NO creado: el plan §4 lo asigna al Slice 5.
verificación: npm run lint ✓ · npm run typecheck ✓ · npm run build ✓ · npm run test ✓ (1 test) · YAML de ci.yml validado con js-yaml · git init -b main + 1 commit (3953098) en main
slice_2: completado 2026-08-22
archivos: [src/App.tsx, src/components/layout/AppLayout.tsx, src/components/layout/Navbar.tsx, src/components/layout/Footer.tsx, src/features/landing/LandingPage.tsx, src/features/encuesta/EncuestaPage.tsx, src/features/mapa/MapaPage.tsx, src/features/dashboard/DashboardPage.tsx, src/__tests__/app.smoke.test.tsx]
desviaciones:
  - LandingPage ubicada en src/features/landing/LandingPage.tsx: el árbol del plan (§2) no le asignaba archivo propio; se sigue la convención features/<nombre>/ para dejar App.tsx como router puro (congelable tras S2). AppRoutes se exporta nombrado para que el smoke test use MemoryRouter.
  - Stubs de features aún más mínimos que "páginas placeholder mínimas con título" del plan S2: título + línea "Sección en construcción", sin badge ni descripción larga (instrucción explícita del orquestador: el placeholder completo con badge "En construcción" es S4).
  - Iconos SVG inline propios estilo Lucide en la landing (sin librería de iconos, según instrucción).
verificación: npm run lint ✓ · npm run typecheck ✓ · npm run build ✓ · npm run test ✓ (5 tests: tagline + 3 hrefs + navegación por click en navbar ×3)
slice_3: completado 2026-08-22
archivos: [src/lib/types.ts, src/lib/mockData.ts, src/lib/__tests__/mockData.test.ts]
desviaciones:
  - Contratos según instrucción del orquestador (prevalece sobre PLAN.md §3): tipo ComplaintCategory (plan decía SurveyCategory), Severity con 3 niveles baja/media/alta (plan tenía 4 con 'critica'), campos description/encuestador/date (plan: notes/date), 20 registros mock (plan: 8-10), helpers getDashboardSummary()/getMapReports() con parámetro opcional para testeabilidad (plan: constantes derivadas exportadas).
  - Test unitario ubicado en src/lib/__tests__/mockData.test.ts (ruta explícita del orquestador) en vez de src/__tests__/ del árbol del plan §2; el glob de vitest (src/**/*.test.*) cubre ambas ubicaciones.
verificación: npm run typecheck ✓ · npm run test ✓ (8 tests nuevos: categorías válidas ×6, severidades válidas, comunas geocodificables, totales consistentes con el array, ranking descendente, periodo min/max, agregación sin pérdida, coordenadas dentro de Valledupar)
slice_4: completado 2026-08-22
archivos: [src/components/PlaceholderPage.tsx, src/features/encuesta/EncuestaPage.tsx, src/features/mapa/MapaPage.tsx, src/features/dashboard/DashboardPage.tsx, src/__tests__/app.smoke.test.tsx]
desviaciones:
  - Placeholder compartido en src/components/PlaceholderPage.tsx (archivo nuevo, aditivo; no toca lo congelado de S2): evita triplicar el markup y garantiza consistencia visual con la landing; las 3 páginas quedan en ~10 líneas.
  - Warnings de React Router v7 future flags en tests dejados tal cual (instrucción del orquestador: inofensivos; App.tsx permanece congelado tras S2).
verificación: npm run lint ✓ · npm run typecheck ✓ · npm run build ✓ · npm run test ✓ (16 tests totales; smoke ampliado: título h1 + badge "En construcción" + nota "Feature asignada" en /encuesta, /mapa y /dashboard)
## tester
(vacío)
## reviewer
(vacío)