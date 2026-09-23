---
phase: 10-respaldo-en-firestore
plan: 04
subsystem: testing
tags: [playwright, e2e, firebase, pwa, bundle-budget, gate-ci]

requires:
  - phase: 10-respaldo-en-firestore
    provides: "10-01: engine/sync.ts, app/composables/useHistorySync.ts (rodaja trazadora, import() dinámico del SDK, guarda de configuración D-13); 10-03: arrastre completo del atraso, listener online, poda perezosa y todos los caminos de fallo cerrados (SYNC-08)"
provides:
  - "e2e/bundle-budget.spec.ts: gate permanente de D-16/SYNC-05 sobre .output/public — el SDK de Firebase no entra en el arranque de / ni de /marvel-champions, verificado contra un npm run generate real y con una mutación ejecutada y revertida"
  - "e2e/offline-flow.spec.ts: quinto test — verificación (a) del ROADMAP, fin de partida sin red con timeout corto y deliberado, histórico y estadísticas siguen funcionando"
  - "e2e/update-banner.spec.ts: guarda de regresión de COMP-03 sobre nuxt.config.ts (registerType, ausencia de runtimeCaching, cabeceras de routeRules, rutas prerenderizadas)"
affects: []

actuals:
  tokens: 4800
  tasks: 3
  commits: 3
plan_head_before: ace57c7a24a4033faa47bfee9772e24ac498599e

tech-stack:
  added: []
  patterns:
    - "Gate de configuración por lectura de texto con node:fs (nunca evaluación del módulo TypeScript), mismo patrón que e2e/firestore-rules-contract.spec.ts aplica a firestore.rules — extractPrerenderRoutes() en update-banner.spec.ts recorta el array de nitro.prerender.routes igual que extractHasOnlyFields() recorta hasOnly([...])"
    - "Marca de búsqueda del SDK real: '@firebase/' (el ámbito interno de los paquetes), nunca 'firebase' a secas — un import() dinámico deja el especificador del módulo como cadena literal en el chunk que lo contiene, así que buscar 'firebase' encontraría esa referencia diferida (justo lo que SYNC-05 exige que exista) y la confundiría con el SDK cargado de verdad. Confirmado en este mismo build: el chunk que agrupa useHistorySync.ts contiene la subcadena 'firebase' sin que el SDK real se ejecute en el arranque"

key-files:
  created:
    - e2e/bundle-budget.spec.ts
  modified:
    - e2e/offline-flow.spec.ts
    - e2e/update-banner.spec.ts

key-decisions:
  - "Presupuesto de bytes fijado en 340 KiB (348160 bytes) tras medir el build real de esta fase ya completa (npm run generate, 2026-09-23): 308668 bytes reales en 12 chunks .js iniciales, ~13% de margen — nunca se estimó a priori, se midió después de que 10-01/10-03 ya estuvieran implementados, tal como exige la Task 1"
  - "El test nuevo de offline-flow.spec.ts elige villano (Rhino) y héroe (Thor) durante la preparación, no solo mini-setup — sin esa selección /estadisticas cae en su propio estado vacío (buildStatisticsView: heroRows/villainRows vacíos si nadie eligió nada) y el test no podría demostrar 'renderiza con datos, no el estado vacío'"
  - "El timeout de la aserción de vuelta al inicio se fija en 5000ms explícitos, con comentario — nunca el timeout global de Playwright, que convertiría un cuelgue real en una espera de minuto y medio antes de fallar"

patterns-established:
  - "Regresión de configuración leída como texto (node:fs), no como comportamiento de navegador — extiende el patrón que e2e/firestore-rules-contract.spec.ts ya estableció para firestore.rules a nuxt.config.ts"

requirements-completed: [SYNC-04, SYNC-05, SYNC-08, COMP-03]

coverage:
  - id: D1
    description: "Gate de D-16 en e2e/bundle-budget.spec.ts: el SDK de Firebase no está en los chunks iniciales de / ni de /marvel-champions, con techo de bytes medido y prueba de que el chunk que contiene el SDK real no está referenciado (SYNC-05)"
    requirement: "SYNC-05"
    verification:
      - kind: e2e
        ref: "e2e/bundle-budget.spec.ts#ni \"/\" ni \"/marvel-champions\" cargan el SDK real de Firebase en su arranque, y el peso no crece sin control"
        status: pass
      - kind: other
        ref: "mutación ejecutada: MAX_INITIAL_JS_BYTES bajado a 100*1024 puso el test en rojo (fallo real capturado, ver Deviations/Task Commits); revertido antes del commit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Verificación (a) del ROADMAP: con la red cortada, terminar una partida por el camino real de la interfaz registra el resultado, vuelve al inicio en un plazo corto (no se cuelga), y /historico y /estadisticas siguen mostrando los mismos datos que con red (SYNC-04, SYNC-08)"
    requirement: "SYNC-04"
    verification:
      - kind: e2e
        ref: "e2e/offline-flow.spec.ts#terminar una partida sin red registra el resultado, vuelve al inicio en un plazo corto, y el histórico/estadísticas siguen funcionando (SYNC-04/SYNC-08)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Guarda de regresión de COMP-03: el camino de actualización de la PWA (registerType en modo aviso, sin runtimeCaching, cabeceras de routeRules intactas, rutas prerenderizadas intactas) sigue siendo el existente tras la Fase 10"
    requirement: "COMP-03"
    verification:
      - kind: e2e
        ref: "e2e/update-banner.spec.ts#registerType, runtimeCaching, las cabeceras de caché de routeRules y las rutas prerenderizadas siguen intactos"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-09-23
status: complete
---

# Phase 10 Plan 4: Gates permanentes de bundle, fin de partida sin red y actualización de PWA Summary

**Tres gates de Playwright que convierten en permanentes los criterios de la Fase 10 que ningún test unitario puede demostrar: el SDK de Firebase nunca entra en el arranque (medido contra un build real, 308 668 bytes en 12 chunks iniciales, techo en 340 KiB), terminar una partida sin red no se cuelga (timeout corto y deliberado de 5000ms), y la configuración del camino de actualización de la PWA sigue intacta.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 3 (1 nuevo, 2 extendidos)

## Accomplishments

- **Task 1 — Gate de D-16 (SYNC-05).** `e2e/bundle-budget.spec.ts` nuevo, con cuatro aserciones sobre `.output/public` de un `npm run generate` real ejecutado en esta sesión: (1) el descubrimiento de chunks referenciados por `/` y `/marvel-champions` no está vacío (12 chunks `.js`); (2) ninguno de esos chunks contiene la marca `@firebase/` del SDK real; (3) el peso total (308 668 bytes) no supera el techo de 340 KiB fijado tras medir; (4) existen tres chunks reales que sí contienen el SDK (31 999 / 127 233 / 555 902 bytes) y ninguno está referenciado por los dos HTML de entrada. La mutación exigida por el plan (bajar el techo por debajo de lo medido) se ejecutó de verdad y puso el test en rojo; se revirtió antes de commitear.
- **Task 2 — Verificación (a) del ROADMAP (SYNC-04/SYNC-08).** Quinto `test()` en `e2e/offline-flow.spec.ts`, dentro del `test.describe` existente: con la red cortada tras el primer registro con red, recorre selector → mini-setup → selección de villano (Rhino) y héroe (Thor) → termina la partida por el camino real de la interfaz (índice → «Partida terminada» → «GANADA») → afirma la vuelta al selector con un `timeout` explícito de 5000ms → abre `/historico` sin red y confirma la partida recién terminada → abre `/estadisticas` sin red y confirma que renderiza datos reales (no su propio estado vacío). Ninguna aserción preexistente del fichero se tocó.
- **Task 3 — Guarda de regresión de COMP-03.** `test.describe` nuevo en `e2e/update-banner.spec.ts` (los tres tests existentes intactos) que lee `nuxt.config.ts` con `node:fs` y afirma: `registerType` vale `'prompt'` y aparece una única vez; `runtimeCaching` aparece 0 veces; las cinco reglas de cabecera de `routeRules` (`/_nuxt/**`, `/fonts/**`, `/sw.js`, `/manifest.webmanifest`, `/audio/**`) siguen presentes; y las cuatro rutas prerenderizadas siguen en `nitro.prerender.routes`.
- Suite Playwright completa: **41/41 tests en verde** con la Fase 10 dentro (incluidas las specs de contadores, PWA y orientación de fases 4/6/7). `npx vitest run`: **1128/1128**. `npm run typecheck`: sin errores. `npm run build` (SSR) y `npm run generate` (SSG) ambos exit 0.

## Task Commits

Cada tarea se commiteó atómicamente:

1. **Task 1: Gate de D-16 — el SDK no está en el arranque** — `6f73e38` (feat)
2. **Task 2: Verificación (a) del ROADMAP — fin de partida sin red no se cuelga** — `f34050e` (feat)
3. **Task 3: COMP-03 — guarda de regresión del camino de actualización de la PWA** — `1602d95` (feat)

**Plan metadata:** (este commit, ver más abajo)

## Files Created/Modified

- `e2e/bundle-budget.spec.ts` — gate permanente de D-16/SYNC-05 sobre el bundle prerenderizado real
- `e2e/offline-flow.spec.ts` — quinto test: fin de partida sin red (verificación (a) del ROADMAP)
- `e2e/update-banner.spec.ts` — guarda de regresión de configuración de COMP-03

## Decisions Made

- **Presupuesto de bytes medido, no estimado**: 340 KiB (348 160 bytes) fijado DESPUÉS de ejecutar `npm run generate` sobre la Fase 10 ya completa (308 668 bytes reales en 12 chunks `.js` iniciales de `/` y `/marvel-champions`), con ~13% de margen para crecimiento normal del proyecto — nunca para que quepa el SDK, cuyo chunk más pequeño ya pesa 31 999 bytes por sí solo.
- **Selección de villano/héroe añadida al test de fin de partida sin red**: sin ella, `buildStatisticsView` no produce `heroRows`/`villainRows` y `/estadisticas` caería en su propio estado vacío — no en el estado "con datos" que el test necesita demostrar.
- **Timeout corto explícito (5000ms)** en la aserción de vuelta al inicio, documentado con un comentario que explica por qué un timeout largo convertiría un cuelgue real en una espera indistinguible de la lentitud.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. La medición previa a escribir el gate (Task 1) y la mutación ejecutada y revertida se hicieron tal como exigía el `<scope_boundary>` del plan.

## Issues Encountered

- Durante la verificación de este plan se observó `.firebaserc` modificado en el árbol de trabajo (placeholder `<firebase-project-id>` sustituido por un id de proyecto real), cambio que **no** se originó en esta ejecución — este plan nunca toca `.firebaserc` (pertenece al plan 10-02, pausado en un checkpoint humano) y ninguna de sus tres tareas invoca `firebase`/`firebase-tools`. Se dejó sin commitear y sin revertir, fuera del alcance de este plan; el usuario debe confirmar el origen del cambio antes de que el plan 10-02 continúe.

## User Setup Required

None - este plan no toca configuración de servicio externo.

## Next Phase Readiness

- Los tres gates permanentes de la Fase 10 quedan escritos, verificados en verde y (el de bundle) probado contra una mutación real.
- SYNC-04, SYNC-05, SYNC-08 y COMP-03 quedan listos para marcarse completos en `REQUIREMENTS.md` (gate de IDs compartidos #2388: SYNC-05 y SYNC-08 los declaran también 10-01/10-03, ambos ya con SUMMARY; `gsd-tools query requirements.ready-ids` confirma los 4/4 listos).
- El plan 10-02 (reglas de Firestore + revisión humana del despliegue real) sigue pausado en su checkpoint — no se completó en esta ejecución; SYNC-06/SYNC-07 siguen abiertos hasta que ese plan termine.
- Bloqueo a vigilar: `.firebaserc` modificado sin commitear (ver Issues Encountered) — revisar antes de retomar el plan 10-02.

## Self-Check: PASSED

- `e2e/bundle-budget.spec.ts` — FOUND
- `e2e/offline-flow.spec.ts` (5 tests) — FOUND
- `e2e/update-banner.spec.ts` (4 tests) — FOUND
- Commit `6f73e38` — FOUND en `git log --oneline`
- Commit `f34050e` — FOUND en `git log --oneline`
- Commit `1602d95` — FOUND en `git log --oneline`
- `npx playwright test --reporter=list` — 41/41 en verde
- `npx vitest run` — 1128/1128 en verde
- `npm run typecheck` — sin errores
- `npm run build` y `npm run generate` — exit 0 ambos
- `git diff --stat -- nuxt.config.ts app engine content` — vacío (este plan solo escribe en `e2e/`)
- Los criterios de aceptación de las tres tareas (greps + tests + mutación) — todos PASS, ver comandos ejecutados en la sesión

---
*Phase: 10-respaldo-en-firestore*
*Completed: 2026-09-23*
