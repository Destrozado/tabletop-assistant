---
phase: 09-hist-rico-y-estad-sticas
plan: 08
subsystem: ui
tags: [vue, nuxt, playwright, historico, estadisticas, pwa, offline]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-06"
    provides: "app/pages/historico.vue, app/pages/estadisticas.vue — las dos pantallas a las que este plan añade acceso y prerender"
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-07"
    provides: "el punto de enganche que registra el resultado real al terminar una partida, ejercitado en el checkpoint humano de este plan"
provides:
  - "app/components/GameSelectorScreen.vue: dos botones secundarios Histórico/Estadísticas (emits open-history/open-statistics), sin mencionar ningún juego (TECH-04 intacto)"
  - "app/pages/index.vue: navegación a /historico y /estadisticas desde los emits nuevos"
  - "nuxt.config.ts: nitro.prerender.routes incluye las cuatro rutas de la app"
  - "e2e/offline-flow.spec.ts: dos tests que abren /historico y /estadisticas con context.setOffline(true)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Los dos botones secundarios reutilizan el ref pressedId existente con claves propias ('history'/'statistics') en vez de crear un ref por control — mismo mecanismo de press-feedback que las tarjetas de juego"
    - "La navegación vive en la página (index.vue), nunca dentro del componente tonto (GameSelectorScreen.vue solo emite)"
    - "Cada ruta prerenderizable se enumera a mano en nitro.prerender.routes porque crawlLinks es false y la navegación usa navigateTo() sin <NuxtLink> con href real"

key-files:
  created: []
  modified:
    - app/components/GameSelectorScreen.vue
    - app/pages/index.vue
    - nuxt.config.ts
    - e2e/offline-flow.spec.ts

key-decisions: []

requirements-completed: [STAT-01]

# Metrics
duration: 45min
completed: 2026-09-11
---

# Phase 9 Plan 8: Accesos desde el inicio, prerender offline y verificación humana del ciclo completo Summary

**Los dos botones secundarios `Histórico`/`Estadísticas` bajo las tarjetas de juego, las cuatro rutas de la app enumeradas en `nitro.prerender.routes` con su precache confirmado en una build real, y el ciclo completo (registrar, listar, agregar, borrar, abrir sin red) verificado a mano por el usuario sin ninguna discrepancia.**

## Performance

- **Duration:** ~45 min (incluye una interrupción para el checkpoint humano bloqueante)
- **Started:** 2026-09-10
- **Completed:** 2026-09-11 (tras la aprobación del usuario)
- **Tasks:** 3/3 completadas
- **Files modified:** 4

## Accomplishments

- `GameSelectorScreen.vue`: fila propia `flex gap-md` bajo las tarjetas de juego con dos botones `Histórico`/`Estadísticas`, cromado idéntico al botón no destructivo de `ConfirmDialog.vue` (`min-h-12 px-lg bg-surface text-primary-text text-label font-bold` + `brightness-95 scale-[0.98]`), sin reestructurar el bloque centrado que sigue teniendo «¿A qué juego vas a jugar?» como pregunta principal. Emits nuevos `open-history`/`open-statistics`; ningún botón se pinta deshabilitado. TECH-04 verificado: cero menciones a Marvel/Warhammer.
- `index.vue`: escucha los dos emits nuevos y navega con `navigateTo('/historico')` / `navigateTo('/estadisticas')` — la navegación vive en la página, el componente sigue siendo tonto.
- `nuxt.config.ts`: `nitro.prerender.routes` pasa de 2 a 4 rutas (`/`, `/marvel-champions`, `/historico`, `/estadisticas`), con el comentario existente ampliado citando D-16/Pitfall 4. Verificado sobre build real (`npm run generate`): `.output/public/historico/index.html` y `.output/public/estadisticas/index.html` existen, y `grep -c "historico" .output/public/sw.js` confirma que Workbox las precachea.
- `e2e/offline-flow.spec.ts`: dos tests hermanos del ya existente de `/marvel-champions`, uno por cada ruta nueva, que tras `waitForServiceWorkerControl(page)` cortan la red y comprueban con `page.goto` que el título de cabecera (`HISTÓRICO`/`ESTADÍSTICAS`) sigue visible. Ninguna aserción existente se relajó.
- **Checkpoint humano bloqueante (Task 3) aprobado sin discrepancias**: el usuario jugó el ciclo completo (dos victorias con causas distintas de derrota, una salida sin registrar, un borrado confirmado y cancelado, estadísticas cuadrando con lo jugado, ambas rutas nuevas abiertas con la red cortada) y respondió literalmente «aprobado».

## Task Commits

Each task was committed atomically:

1. **Task 1: accesos «Histórico» y «Estadísticas» en la pantalla de inicio (D-17/STAT-01)** - `2ec2aad` (feat)
2. **Task 2: prerender de las dos rutas nuevas y prueba offline (D-16/Pitfall 4)** - `38cb638` (feat)
3. **Task 3: verificación humana del ciclo completo** - checkpoint bloqueante, sin commit propio (no produce cambios de código); aprobado por el usuario el 2026-09-11 con la respuesta literal «aprobado»

**Plan metadata:** (pendiente — commit de cierre de este SUMMARY, lo hace el orquestador tras el merge)

## Files Created/Modified

- `app/components/GameSelectorScreen.vue` — fila de dos botones secundarios, emits `open-history`/`open-statistics`
- `app/pages/index.vue` — `onOpenHistory()`/`onOpenStatistics()` navegan a las rutas nuevas
- `nuxt.config.ts` — `nitro.prerender.routes` con las cuatro rutas; solo cambia esa lista y su comentario (confirmado con `git diff | grep -E "routeRules|globPatterns|navigateFallback|registerType"` devolviendo 0 líneas)
- `e2e/offline-flow.spec.ts` — dos tests nuevos, uno por ruta nueva

## Decisions Made

Ninguna decisión nueva más allá de las ya cerradas en `09-UI-SPEC.md` (D-16/D-17). Todo lo construido sigue al pie de la letra el Layout §1 del contrato de diseño.

## Deviations from Plan

### 1. [Rule 1 - Bug] Ajuste del comentario nuevo en `nuxt.config.ts` para evitar un falso positivo de grep

- **Encontrado durante:** verificación de los criterios de aceptación de la Task 2.
- **Issue:** el criterio exige `grep -c "'/historico'" nuxt.config.ts` = 1 y lo mismo para `'/estadisticas'`; la primera redacción del comentario nuevo citaba ambas rutas entre comillas simples en prosa, lo que hacía que el grep devolviera 2 (comentario + array real) para las dos rutas.
- **Fix:** se reescribió el comentario sin comillas simples alrededor de los nombres de ruta (usando «el histórico y las estadísticas» en vez de `'/historico' y '/estadisticas'`), dejando intacta la explicación de D-16/Pitfall 4.
- **Files modified:** `nuxt.config.ts`
- **Commit:** `38cb638`

### 2. [Rule 1 - Bug] Locator ambiguo en los dos tests nuevos de Playwright

- **Encontrado durante:** primera ejecución de `npx playwright test e2e/offline-flow.spec.ts` tras escribir los dos tests nuevos.
- **Issue:** el locator `page.getByText('HISTÓRICO').or(page.getByText('Todavía no hay partidas registradas'))` (calcado del `<how-to-verify>` del plan, que pide comprobar "el título HISTÓRICO **o** el encabezado del estado vacío") resolvía a **dos** elementos simultáneamente cuando el histórico está vacío — el título de cabecera y el encabezado del estado vacío coexisten en la misma pantalla — lo que Playwright rechaza en modo estricto (`strict mode violation`). Mismo problema en `/estadisticas`.
- **Fix:** se simplificó el locator a `page.getByRole('heading', { name: 'HISTÓRICO', exact: true })` (y su equivalente en `/estadisticas`), que está siempre presente con o sin entradas y no depende de si el estado vacío también renderiza su propio encabezado. No es un bug de la app — ambos textos se ven correctamente en pantalla, verificado a simple vista; era el test el que pedía una condición ambigua.
- **Files modified:** `e2e/offline-flow.spec.ts`
- **Commit:** `38cb638`

## Issues Encountered

Ninguno más allá de las dos desviaciones documentadas arriba, ambas resueltas en la propia tarea.

## User Setup Required

None - no external service configuration required.

## Human Verification (Task 3)

**Resultado: APROBADO sin discrepancias.**

El usuario ejecutó los once pasos del checkpoint (`<how-to-verify>` del plan) sobre la build real (`npm run generate && npx nuxi preview`, puerto 4173): dos botones secundarios visibles desde el inicio sin desplazar la pregunta principal; estado vacío correcto en ambas pantallas nuevas antes de jugar; una partida completa con victoria registrada y la banda `✓ Partida registrada`; una segunda partida terminada en derrota con la causa exacta visible en la tarjeta y apareciendo primera en el histórico; una tercera partida cerrada con «Salir sin registrar» sin añadir entrada ni banda, con las dos entradas previas intactas (HIST-09); borrado confirmado y cancelado correctamente; estadísticas cuadrando con lo jugado y ordenadas de mayor a menor porcentaje; y ambas rutas nuevas abriéndose con la red cortada. Respuesta literal del usuario: **"aprobado"**. No hay ninguna discrepancia que corregir ni diferir.

## Next Phase Readiness

- Fase 9 completa: las tres piezas (registro de resultado, histórico + estadísticas, accesos + prerender offline) están construidas, verificadas por código y por prueba humana real.
- `STAT-01` queda marcado como Satisfecho en `.planning/REQUIREMENTS.md` (única fila tocada de las seis del frontmatter del plan; `HIST-07`, `HIST-08`, `HIST-09`, `STAT-04` y `STAT-05` ya estaban Satisfecho por los planes 09-06/09-07).
- Sin bloqueos conocidos. Candidato natural siguiente: Fase 10 (Firestore), que puede apoyarse en un histórico 100% verificado offline sin ninguna dependencia de red — la separación deliberada de fases (09/10) que el ROADMAP fijó desde el principio.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno. Las tres mitigaciones del `<threat_model>` del plan están confirmadas:
- T-09-25: las cuatro rutas están en `nitro.prerender.routes`, comprobado sobre build real (`.output/public/historico/index.html`, `.output/public/estadisticas/index.html`, `sw.js` las precachea) y con `npx playwright test e2e/offline-flow.spec.ts` (4/4 en verde, incluidos los dos tests nuevos con `setOffline(true)`).
- T-09-26: `git diff nuxt.config.ts | grep -E "routeRules|globPatterns|navigateFallback|registerType"` no devuelve ninguna línea — solo cambiaron `prerender.routes` y su comentario.
- T-09-27: el checkpoint humano bloqueante de once pasos se ejecutó de verdad antes de dar la fase por buena, y el usuario respondió aprobando explícitamente sin discrepancias.

## Self-Check

- FOUND: app/components/GameSelectorScreen.vue
- FOUND: app/pages/index.vue
- FOUND: nuxt.config.ts
- FOUND: e2e/offline-flow.spec.ts
- FOUND commit: 2ec2aad
- FOUND commit: 38cb638

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-11*
