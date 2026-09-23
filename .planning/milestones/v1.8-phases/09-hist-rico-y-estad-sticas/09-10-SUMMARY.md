---
phase: 09-hist-rico-y-estad-sticas
plan: 10
subsystem: engine
tags: [vitest, typescript, defensive-programming, date-parsing]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-01/09-03/09-05: motor de histórico y estadísticas (engine/history.ts, engine/statistics.ts) y sus tests"
provides:
  - "engine/statistics.ts con coerción explícita a string (defensa en profundidad de CR-02) en extractHeroIds/extractVillainId"
  - "engine/history.ts con sortEntriesByRecency comparando instantes (Date.parse) en vez de colación de cadena (WR-06)"
  - "id de buildHistoryEntry con sufijo aleatorio de 10 caracteres base36 (mitad de WR-08 que vive en el motor)"
  - "8 tests de regresión nuevos: CR-02 (motor) y WR-06 (orden cronológico)"
affects: [09-09, verificación de cierre de fase 09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defensa en profundidad en dos capas: la frontera de storage valida tipos (09-09), el motor coerciona explícitamente (09-10) — ninguna de las dos depende de la otra para sostener el contrato 'nunca lanza'"
    - "Comparadores de orden temporal usan Date.parse + fallback a Number.NEGATIVE_INFINITY para datos ilegibles, nunca comparación de cadenas ISO"

key-files:
  created: []
  modified:
    - engine/statistics.ts
    - engine/history.ts
    - engine/__tests__/statistics.test.ts
    - engine/__tests__/history.test.ts

key-decisions:
  - "String(...) se aplica en el extractor (extractHeroIds/extractVillainId), no en el comparador de buildRows: mantiene la regla de coerción en un solo sitio en vez de duplicarla"
  - "sortEntriesByRecency usa Date.parse con NEGATIVE_INFINITY para NaN, preservando el sort estable nativo para no romper la garantía de anteposición de appendHistoryEntry"
  - "El sufijo aleatorio del id pasa de 6 a 10 caracteres base36 sin introducir crypto.randomUUID() ni contador de módulo, para no romper la disciplina de pureza del motor (nunca lee reloj real ni globals)"

patterns-established:
  - "Comentarios de cabecera de extractor citan el CR/WR que mitigan y explican por qué la coerción es defensa en profundidad, no desconfianza del tipo declarado"

requirements-completed: [STAT-02, STAT-03, HIST-07]

# Metrics
duration: 25min
completed: 2026-09-12
---

# Fase 9 Plan 10: Defensa en profundidad del motor (CR-02, WR-06, WR-08) Summary

**`aggregateStatistics`/`sortEntriesByRecency` en `engine/` ya no pueden lanzar ni desordenar por instante ante datos que violen su tipo declarado, cerrando el BLOCKER CR-02 con una segunda línea de defensa independiente de la validación de storage de 09-09.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-12T12:48:00Z (aprox., tras corrección de base de worktree)
- **Completed:** 2026-09-12T12:55:00Z
- **Tasks:** 3/3 completadas
- **Files modified:** 4

## Accomplishments
- `extractHeroIds`/`extractVillainId` en `engine/statistics.ts` coercionan `id` y `name` a `string` con `String(...)`, eliminando las aserciones `as string`/`p.heroId!` que asumían sin comprobar un tipo que en realidad viene de `localStorage`.
- `sortEntriesByRecency` en `engine/history.ts` ordena por instante real (`Date.parse`), no por `localeCompare` de cadena — una fecha ilegible cae al final de forma determinista, y el orden sigue siendo estable (preserva la garantía de `appendHistoryEntry`).
- El sufijo aleatorio del `id` de `buildHistoryEntry` pasa de 6 a 10 caracteres base36 (mitad de WR-08 que vive en el motor; la otra mitad —evitar que un borrado se lleve dos partidas por colisión— se cierra en `09-09-PLAN.md`).
- 8 tests de regresión nuevos cubren ambos hallazgos con ambos órdenes de inserción (el throw de CR-02 dependía de cuál fila caía primero en el comparador).

## Task Commits

Each task was committed atomically:

1. **Task 1: Coerción explícita a string en los extractores de estadísticas** - `6e393d9` (fix)
2. **Task 2: Orden cronológico real en sortEntriesByRecency y más entropía en el id** - `5f4d05b` (fix)
3. **Task 3: Tests de regresión de CR-02 y WR-06** - `cefdabf` (test)

**Plan metadata:** pendiente (commit final de este agente, en curso)

## Files Created/Modified
- `engine/statistics.ts` - `extractHeroIds`/`extractVillainId` coercionan `id`/`name` a string; se eliminan `as string` y `p.heroId!`
- `engine/history.ts` - `sortEntriesByRecency` compara instantes con `Date.parse`; sufijo aleatorio del `id` de `buildHistoryEntry` ampliado a 10 caracteres
- `engine/__tests__/statistics.test.ts` - describe `CR-02: defensa en profundidad ante id/name no-string` con 5 tests nuevos
- `engine/__tests__/history.test.ts` - describe `WR-06: orden cronológico real, no colación de cadena` con 3 tests nuevos

## Decisions Made
- La coerción va en el extractor, no en el comparador de `buildRows`, para no duplicar la regla en dos sitios que podrían divergir (instrucción explícita del plan, seguida tal cual).
- El par de fechas usado para el test WR-06 de "mismo instante, formatos distintos" (`'...+02:00'` vs `'...Z'`) se verificó con `Date.parse` en Node antes de escribir el test, confirmando que produce órdenes opuestos bajo comparación de cadena vs. de instante.

## Deviations from Plan

None — el plan se ejecutó tal y como estaba escrito. Los tres `<action>` de las tres tareas se implementaron literalmente, incluyendo las prohibiciones explícitas (no tocar la cascada de D-24 en el comparador, no introducir `crypto.randomUUID()` ni contador de módulo, no editar tests existentes).

### Nota sobre el entorno (no es una desviación del plan, es un hallazgo de infraestructura)

Este worktree se creó sin `node_modules`/`.nuxt` poblados (necesarios para que Vitest resuelva `tsconfig.app.json` y las dependencias). Se crearon symlinks locales `node_modules` → `node_modules` del checkout principal y `.nuxt` → `.nuxt` del checkout principal, únicamente para poder ejecutar `npx vitest` (lectura, sin generar artefactos de build). Estos symlinks quedan **sin trackear** (`git status` los marca `??`, nunca se les hizo `git add`) y no se han incluido en ningún commit de esta tarea.

Al intentar ejecutar el paso 6 de la `<verification>` del plan (`npx nuxt build`), el build falla con un error de resolución de módulos ESM ajeno a este plan: `Package import specifier "#internal/nuxt/paths" is not defined imported from .../node_modules/.cache/nuxt/.nuxt/dist/server/server.mjs`, originado dentro de `@tailwindcss/node`. Se reprodujo tras limpiar `node_modules/.cache/nuxt` y reintentar, con el mismo resultado. Este plan no toca `nuxt.config.ts` ni ninguna dependencia de build — los dos ficheros modificados (`engine/statistics.ts`, `engine/history.ts`) son TypeScript puro sin ningún import de Nuxt/Vite/Tailwind. Por disciplina de "Scope Boundary" (solo auto-arreglar lo causado por los cambios de esta tarea) y para no interferir con el agente concurrente que ejecuta el plan `09-09` sobre el mismo `node_modules`/`.nuxt` compartido del checkout principal, **no se ha intentado depurar ni arreglar este fallo de build aquí**. Queda como item a revisar por el orquestador/verificador en un entorno de build aislado y limpio (probablemente tras el merge de ambos worktrees). La evidencia de corrección de este plan se apoya en la suite de Vitest (649/649 en verde), no en el build de producción.

## Issues Encountered
- Ver nota de entorno arriba (symlinks de `node_modules`/`.nuxt`, fallo de `npx nuxt build` ajeno a los cambios de este plan).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`aggregateStatistics` y `sortEntriesByRecency` sostienen su contrato de "nunca lanza" por sí solos, sin depender de que `app/composables/usePersistedSession.ts` (plan 09-09) haya validado antes — las dos líneas de defensa son independientes, tal y como pedía `09-VERIFICATION.md` §CR-02. Pendiente de re-verificación de fase: confirmar en un entorno limpio que `npx nuxt build` termina con código 0 (fallo observado en este worktree parece ser de infraestructura compartida, no de código).

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: engine/statistics.ts
- FOUND: engine/history.ts
- FOUND: engine/__tests__/statistics.test.ts
- FOUND: engine/__tests__/history.test.ts
- FOUND: .planning/phases/09-hist-rico-y-estad-sticas/09-10-SUMMARY.md
- FOUND: 6e393d9 (Task 1 commit)
- FOUND: 5f4d05b (Task 2 commit)
- FOUND: cefdabf (Task 3 commit)
- FOUND: 57c911c (metadata commit)
