---
phase: 09-hist-rico-y-estad-sticas
plan: 11
subsystem: view-layer
tags: [defensive-programming, vitest, vue, empty-state, gap-closure]

# Dependency graph
requires:
  - phase: 09-09
    provides: "usePersistedSession.ts endurecido por tipo (isGameHistoryEntry/isHistoryPlayerEntry) — frontera de almacenamiento"
  - phase: 09-10
    provides: "engine/statistics.ts y engine/history.ts con coerción de tipos y orden cronológico real"
provides:
  - "buildHistoryCardView con normalización defensiva de entry.players (misma guarda que engine/statistics.ts) — CR-01 cerrado en la capa de vista"
  - "StatisticsView.isEmpty redefinido como 'no hay ninguna fila que mostrar', con emptyTitle/emptyBody compuestos por variante — WR-01 cerrado"
  - "onOutcomeRecorded no notifica fallo de guardado cuando no hubo intento de escritura — WR-04 cerrado"
affects: [09-VERIFICATION, cierre de fase 09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defensa en profundidad replicada literalmente entre capas independientes: la misma guarda Array.isArray + comprobación de objeto no nulo vive ahora tanto en engine/statistics.ts como en app/composables/useGameHistory.ts, sin que ninguna dependa de la otra para sostener 'nunca lanza'"
    - "StatisticsView compone su propia copy de estado vacío (emptyTitle/emptyBody) en vez de dejar que la plantilla interpole cadenas literales — misma disciplina de cabecera del fichero (el componente no compone ni interpola)"

key-files:
  created: []
  modified:
    - app/composables/useGameHistory.ts
    - app/composables/__tests__/useGameHistory.test.ts
    - app/pages/estadisticas.vue
    - "app/pages/[game]/index.vue"

key-decisions:
  - "isEmpty pasa de 'summary.totalEntries === 0' a 'heroRows.length === 0 && villainRows.length === 0': cubre tanto el histórico vacío como el caso 'hay partidas pero ninguna con héroe ni villano anotados', que antes dejaba la pantalla sin tablas y sin estado vacío"
  - "emptyBody de la variante 'hay partidas pero ninguna fila' es copy NUEVA (UI-SPEC §7 solo definía el histórico vacío); reutiliza el mismo bloque visual y la misma pluralización que sampleCaption"
  - "onOutcomeRecorded usa un if (session.value) { ... } en vez de un ternario que siempre llama a notifyHistorySaved — 'no había sesión que registrar' deja de tratarse como sinónimo de 'falló la escritura'"

requirements-completed: [HIST-07, HIST-08, STAT-05]

# Metrics
duration: 25min
completed: 2026-09-12
---

# Phase 09 Plan 11: Defensa en profundidad de la capa de vista (CR-01, WR-01, WR-04) Summary

**`buildHistoryCardView` ya no desreferencia `entry.players` sin filtrar (misma guarda que `engine/statistics.ts`), `statisticsView.isEmpty` cubre también «hay partidas pero ninguna fila» con copy propia, y el aviso de fallo de guardado ya no se pinta cuando no hubo ningún intento de escritura.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-12T12:58:00Z (aprox.)
- **Completed:** 2026-09-12T13:02:00Z
- **Tasks:** 3/3 completadas
- **Files modified:** 4

## Accomplishments

- CR-01 cerrado en la capa de vista (defensa en profundidad, independiente de la validación de storage de 09-09): `buildHistoryCardView` deriva una constante `players` normalizada con `Array.isArray(entry.players) ? entry.players : []` filtrada por un type guard `player !== null && typeof player === 'object'`, y sustituye los dos usos previos de `entry.players` (el `.some` y el `.map`). Una entrada con `players: [null]` o `players: [{}]` ya no lanza, y una entrada corrupta en medio de una lista de tres deja las tres vistas construidas — el botón de borrar que permitiría eliminar la entrada culpable sigue disponible.
- WR-01 cerrado: `StatisticsView` gana `emptyTitle`/`emptyBody` (null exactamente cuando `isEmpty` es `false`), y `buildStatisticsView` redefine `isEmpty` como `heroRows.length === 0 && villainRows.length === 0`. La copy de histórico vacío (UI-SPEC §7, invariable) se movió de la plantilla al composable; la variante «hay partidas pero ninguna con héroe ni villano anotados» es copy nueva con la misma pluralización que `sampleCaption`.
- WR-04 cerrado: `onOutcomeRecorded` ya no llama a `notifyHistorySaved` cuando `session.value` es `null` — solo se invoca dentro de la rama en la que sí hubo un intento real de escritura. El orden D-U4 (`silence()` → `record()` → `finishGame()`) se conserva intacto.
- 7 tests de regresión nuevos (4 de CR-01, 3 de WR-01); ningún test preexistente editado. Suite completa: 26 archivos / 665 tests en verde (658 previos + 7 nuevos).

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalizar players en buildHistoryCardView y redefinir el estado vacío de estadísticas (CR-01, WR-01)** - `2134d11` (fix)
2. **Task 2: Tests de regresión de CR-01 y WR-01** - `b45d914` (test)
3. **Task 3: Estado vacío de /estadisticas alimentado por la vista y aviso de guardado honesto (WR-01, WR-04)** - `8ea1a19` (fix)

**Plan metadata:** este SUMMARY.md, commit pendiente al final del protocolo de worktree.

## Files Created/Modified

- `app/composables/useGameHistory.ts` — `buildHistoryCardView` normaliza `players` antes de desreferenciarlo (CR-01); `StatisticsView` gana `emptyTitle`/`emptyBody`; `buildStatisticsView` redefine `isEmpty` y compone las dos variantes de copy de estado vacío (WR-01).
- `app/composables/__tests__/useGameHistory.test.ts` — 4 tests nuevos de CR-01 sobre `buildHistoryCardView` (incluido el que prueba que una entrada corrupta no impide renderizar el resto de la lista) y 3 tests nuevos de WR-01 sobre `buildStatisticsView`.
- `app/pages/estadisticas.vue` — el bloque de estado vacío interpola `statisticsView.emptyTitle`/`statisticsView.emptyBody` en vez de llevar copy literal.
- `app/pages/[game]/index.vue` — `onOutcomeRecorded` solo llama a `record()`/`notifyHistorySaved` dentro de `if (session.value)`; sin sesión, se pasa directamente a `finishGame()` sin avisar de nada.

## Decisions Made

- La copy de "histórico vacío" (UI-SPEC §7) se movió palabra por palabra de la plantilla al composable — no se reescribió ni una coma, verificado con `grep -c "En cuanto registréis vuestra primera partida en el histórico"` = 1 en `useGameHistory.ts` y = 0 en `estadisticas.vue`.
- La copy de la variante nueva ("hay partidas pero ninguna fila") reutiliza el mismo bloque visual y el mismo criterio de pluralización que `sampleCaption`, sin abrir ninguna variante visual nueva en la plantilla.
- `onOutcomeRecorded` pasó de un ternario (`session.value ? record(...) : false` seguido de `notifyHistorySaved` incondicional) a un `if (session.value) { record(...); notifyHistorySaved(...) }`: la llamada a `notifyHistorySaved` queda estrictamente dentro de la rama donde hubo un intento real de escritura.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `node_modules`/`.nuxt` ausentes en el worktree**
- **Found during:** Antes de la Task 1, al intentar ejecutar `npx vitest run`.
- **Issue:** El worktree se creó sin `node_modules`/`.nuxt` poblados, igual que documentó `09-10-SUMMARY.md` para su propio worktree.
- **Fix:** Se crearon symlinks locales `node_modules` → `node_modules` del checkout principal y `.nuxt` → `.nuxt` del checkout principal, únicamente para poder ejecutar Vitest (lectura, sin generar artefactos de build). Quedan sin trackear (`git status` los marca `??`), nunca se les hizo `git add`, y no forman parte de ningún commit de esta tarea.
- **Files modified:** Ninguno versionado.
- **Verification:** `npx vitest run app/composables/__tests__/useGameHistory.test.ts` pasó a ejecutar sus 17 tests preexistentes en verde.

### Documentation-only discrepancy (no es un defecto funcional)

**Acceptance criterion de Task 3 sobre el recuento literal de `notifyHistorySaved`.** El plan pide `grep -c "notifyHistorySaved" "app/pages/[game]/index.vue"` = 1, "una sola llamada, dentro de la rama en la que sí hubo escritura". El fichero, tanto antes como después de este plan, importa `notifyHistorySaved` en la cabecera (`import { notifyHistorySaved } from '~/composables/useHistorySavedNotice'`) además de invocarlo una vez — el `grep -c` real es 2 (import + 1 llamada), no 1, y ya lo era antes de este plan (el `import` no cambió). La intención funcional del criterio —una sola invocación, solo dentro de la rama con escritura real— sí se cumple: hay exactamente una llamada a `notifyHistorySaved(...)` en todo el fichero, y vive dentro de `if (session.value) { ... }`. Se documenta aquí en vez de forzar el conteo literal eliminando el import, que rompería la compilación.

### Known Limitation (no bloqueante, heredada del entorno de worktree)

**`npx nuxt build` falla en este worktree con `Package import specifier "#internal/nuxt/paths" is not defined`.** Mismo fallo documentado en `09-10-SUMMARY.md` (originado en `@tailwindcss/node` al resolver un `node_modules` compartido por symlink desde un worktree). Los cuatro ficheros modificados por este plan son TypeScript/Vue puro sin cambios en `nuxt.config.ts` ni en dependencias de build. Por disciplina de scope (solo auto-arreglar lo causado por los cambios de esta tarea) no se ha intentado depurar este fallo aquí; el orquestador ya verificó que `npm run build` es verde en el checkout principal en esta misma base. La evidencia de corrección de este plan se apoya en `npx vitest run` (26 archivos / 665 tests en verde), no en el build de producción.

**Ni `vue-tsc` ni `nuxt typecheck` están instalados en este repo** (confirmado también por `09-09-SUMMARY.md`). No se ha instalado ningún paquete para cubrir un paso de typecheck opcional que el `<verification>` de este plan no exige; se deja constancia en vez de actuar por iniciativa propia.

## Issues Encountered

- Ver notas de entorno arriba (symlinks de `node_modules`/`.nuxt`, fallo de `npx nuxt build` ajeno a los cambios de este plan, typecheck no configurado en el repo).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Los tres cierres de hueco que restaban tras `09-VERIFICATION.md` (CR-01 en la capa de vista, WR-01, WR-04) quedan resueltos con tests de regresión permanentes. `WR-02`, `WR-03`, `WR-05` y `WR-07` quedan explícitamente fuera de alcance de este plan (ver `<scope_boundary>` de `09-11-PLAN.md`), sin que este cierre los toque ni los oculte. Pendiente de re-verificación de fase: confirmar en un entorno de build limpio (fuera de worktree) que `npx nuxt build` sigue en verde con estos cuatro ficheros modificados — el fallo observado aquí es de infraestructura compartida de worktree, no de código, consistente con lo ya reportado en `09-10-SUMMARY.md`.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: app/composables/useGameHistory.ts
- FOUND: app/composables/__tests__/useGameHistory.test.ts
- FOUND: app/pages/estadisticas.vue
- FOUND: app/pages/[game]/index.vue
- FOUND: .planning/phases/09-hist-rico-y-estad-sticas/09-11-SUMMARY.md
- FOUND commit 2134d11 (Task 1)
- FOUND commit b45d914 (Task 2)
- FOUND commit 8ea1a19 (Task 3)
