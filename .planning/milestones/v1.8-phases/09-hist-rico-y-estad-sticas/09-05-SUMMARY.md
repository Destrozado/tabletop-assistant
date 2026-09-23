---
phase: 09-hist-rico-y-estad-sticas
plan: 05
subsystem: app-composables
tags: [vue, vitest, composable, historico, estadisticas]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-01"
    provides: "engine/history.ts: buildHistoryEntry, describeLossCause, formatEntryDate, formatEntryDuration, sortEntriesByRecency, FrozenNames"
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-03"
    provides: "engine/statistics.ts: aggregateStatistics, StatRow, StatisticsSummary"
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-04"
    provides: "usePersistedSession(): loadHistory/appendHistoryEntry/removeHistoryEntry (tga:history)"
provides:
  - "app/composables/useGameHistory.ts: segunda costura reactiva de la app (hermana de useGameSession.ts)"
  - "resolveFrozenNames(context, catalogue): FrozenNames — resuelve alias español (D-11) y nombre de villano en app/, nunca en engine/"
  - "buildHistoryCardView(entry): HistoryCardView — todas las cadenas exactas que /historico pinta (UI-SPEC §4)"
  - "buildStatisticsView(summary): StatisticsView — filas ya formateadas + sampleCaption + isEmpty (STAT-05)"
  - "useGameHistory(): { entries, cardViews, statisticsView, isEmpty, reload, remove, record }"
affects: ["09-06", "09-07", "09-08"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composable hermano de useGameSession.ts: funciones puras exportadas a nivel de módulo + useXxx() con refs/computeds, mismo patrón que buildCounterCells/buildStepValueCells"
    - "Fallback nombre→id ante heroId/villainId huérfano tras regenerar el catálogo (T-09-16), aplicado simétricamente a héroe y villano aunque el plan solo detallaba el caso de héroe"

key-files:
  created:
    - app/composables/useGameHistory.ts
    - app/composables/__tests__/useGameHistory.test.ts
  modified: []

key-decisions:
  - "villainDisplayName distingue explícitamente 'sin villano elegido' (villainId null → 'Sin villano') de 'villano elegido pero con nombre huérfano' (villainId no nulo, villainName null → se pinta el propio villainId) — el plan solo detallaba esta distinción para heroId (T-09-16), pero el mismo razonamiento de D-11 aplica simétricamente al villano, así que se generalizó."

requirements-completed: [HIST-04, HIST-07, HIST-08, STAT-02, STAT-03, STAT-05]

# Metrics
duration: 35min
completed: 2026-09-10
---

# Phase 9 Plan 5: useGameHistory — costura reactiva del histórico Summary

**`useGameHistory.ts` envuelve `engine/history.ts` y `engine/statistics.ts` sobre `usePersistedSession()`, resolviendo el alias español congelado (D-11) y produciendo las cadenas exactas que las pantallas de `/historico` y `/estadisticas` (plan 09-06) van a pintar sin componer nada por su cuenta.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-10 (tras corregir la base del worktree con `git reset --hard` al commit de cierre de la ola 2)
- **Completed:** 2026-09-10
- **Tasks:** 3/3 completadas
- **Files modified:** 2 (ambos nuevos)

## Accomplishments

- `resolveFrozenNames(context, catalogue)`: resuelve el villano por `resolveVillainId`/catálogo y cada héroe elegido por `resolvePlayerSlots`/`resolveHeroSpanishName` — el alias español se congela AQUÍ, en `app/`, nunca dentro de `engine/` (resuelve la Open Question 2 de `09-RESEARCH.md`, ya cerrada por el plan 09-01).
- `record(session, outcome)`: único punto de la app donde se lee el reloj real (`Date.now()`) para construir una entrada del histórico; síncrono de principio a fin, sin ninguna rama de red — verificado mecánicamente con grep (`async |await `, `firestore|firebase|sync`, ambos en 0 coincidencias).
- `buildHistoryCardView(entry)`: produce las 10 cadenas exactas que la tarjeta de `/historico` pinta (UI-SPEC §4), incluida la distinción D-10 vs SEL-09 (`Sin villano` con palabras, `—` solo para duración desconocida) y el colapso D-12 a una sola línea `Sin héroes ni villano anotados` cuando no hubo ninguna selección.
- `buildStatisticsView(summary)`: envuelve `aggregateStatistics` sin reordenar nada, con `sampleCaption` (singular/plural/`null`) y `isEmpty` — la garantía mecánica de STAT-05 (nunca una tabla con cero filas ni un `0 %`).
- `useGameHistory()`: `entries`/`cardViews`/`statisticsView`/`isEmpty` como refs/computeds, `reload()`/`remove()`/`record()` como funciones imperativas — ni una sola mutación in situ del ref `entries`.
- 17 tests nuevos (638 en el proyecto), incluida cobertura de cadena exacta de las 7 verdades del `must_haves` del plan y del ciclo completo record→reload→record→reload→remove→remove con `localStorage` falso.

## Task Commits

Each task was committed atomically:

1. **Task 1: lado de escritura — resolveFrozenNames y record()** - `990811c` (feat)
2. **Task 2: lado de lectura — entradas, vistas de tarjeta y vista de estadísticas** - `45dfc90` (feat)
3. **Task 3: app/composables/__tests__/useGameHistory.test.ts** - `a1e2004` (test)

**Plan metadata:** (pendiente — commit de cierre de este SUMMARY, lo hace el orquestador tras el merge)

## Files Created/Modified

- `app/composables/useGameHistory.ts` — `resolveFrozenNames`, `buildHistoryCardView`, `buildStatisticsView`, interfaces `HistoryCardView`/`StatRowView`/`StatisticsView`, y `useGameHistory()` con `record`/`reload`/`remove`/`cardViews`/`statisticsView`/`isEmpty`
- `app/composables/__tests__/useGameHistory.test.ts` — 17 tests: `buildHistoryCardView` (7 casos), `buildStatisticsView` (5 casos), `resolveFrozenNames` (3 casos), ciclo record/reload/remove (1 caso end-to-end con `localStorage` falso)

## Decisions Made

Ninguna decisión nueva más allá de las ya cerradas en `09-CONTEXT.md`. Un matiz de implementación dentro del margen de "Claude's Discretion" que el plan dejaba abierto:

- El plan detallaba el fallback "nombre congelado → id huérfano" (T-09-16) solo para `heroId`/`heroName`, pero el mismo razonamiento de D-11 (un id congelado puede quedar huérfano tras regenerar el catálogo) aplica igual de bien al villano. Se generalizó `villainDisplayName` con la misma guarda (`villainId no nulo` + `villainName ?? villainId`), distinguiéndola explícitamente de "no había villano elegido" (que sigue pintando `Sin villano`, nunca el id). Cubierto por los tests de `confirmBody`/`deleteAriaLabel` y por el propio `contextLine`.

## Deviations from Plan

### Auto-fixed Issues

Ninguna — ni bugs ni funcionalidad faltante encontrados durante la ejecución.

### Nota de proceso: criterio de aceptación mecánico de la Task 2 no coincide literalmente

- **Encontrado durante:** verificación de criterios de aceptación de la Task 2.
- **Detalle:** el criterio dice `grep -c "sortEntriesByRecency" app/composables/useGameHistory.ts` devuelve `1`; el resultado real es `2` (una línea de `import`, una línea de uso dentro de `reload()`). Con un import nombrado (el mismo estilo que usa todo el resto del repo, incluidos `useGameSession.ts` y `engine/history.ts`), cualquier función importada y usada una sola vez produce como mínimo dos líneas que contienen su nombre — la única forma de bajar a 1 sería un `import * as history from '~~/engine/history'` con acceso por namespace, que rompería la convención establecida sin ganar nada a cambio.
- **No es un bug de código:** la funcionalidad es correcta (`sortEntriesByRecency` se usa exactamente una vez, en `reload()`) y los 17 tests + los 638 del proyecto están en verde. Se trata como una imprecisión del propio criterio mecánico del plan, mismo patrón ya documentado por los planes 09-01 y 09-04 (comentarios/imports que disparan en falso un grep pensado para "prohibido en este fichero", aquí al revés: un grep de "debe aparecer" que no contempla el import).
- **No se modificó nada para forzar el conteo a 1.**

## Self-Check

- FOUND: app/composables/useGameHistory.ts
- FOUND: app/composables/__tests__/useGameHistory.test.ts
- FOUND commit: 990811c
- FOUND commit: 45dfc90
- FOUND commit: a1e2004

## Verification Against Plan

- `npm test` termina con código 0: **26 test files, 638 tests, todos en verde.**
- `grep -rEi "firestore|firebase" app/composables/useGameHistory.ts` no devuelve ninguna línea: **confirmado, vacío.**
- `grep -rn "~~/engine" app/components/` sigue sin devolver ninguna línea de import real (las dos coincidencias son comentarios que documentan la disciplina, no imports): **confirmado.**
- `useGameHistory()` expone `record`, `reload`, `remove`, `cardViews`, `statisticsView` e `isEmpty`, y es el único fichero de `app/` que importa `~~/engine/history` y `~~/engine/statistics`: **confirmado.**
- Las tres funciones puras exportadas (`resolveFrozenNames`, `buildHistoryCardView`, `buildStatisticsView`) están cubiertas por tests de cadena exacta: **confirmado, 17 tests.**

## Known Stubs

Ninguno. Este plan solo entrega un composable y su test hermano; las pantallas que lo consumen (`/historico`, `/estadisticas`) llegan en el plan 09-06, todavía no escrito.

## Threat Flags

Ninguno. Las tres mitigaciones del `<threat_model>` del plan (T-09-15, T-09-16, T-09-17) están implementadas:
- T-09-15: `HistoryCardView` produce solo cadenas planas; ningún componente de esta fase usa `v-html`/`innerHTML` (no hay componentes en este plan).
- T-09-16: cubierto simétricamente para héroe y villano (ver Decisions Made).
- T-09-17: `reload()` llama únicamente a `loadHistory()`, sin parámetros de fuente ni ramas de red — verificado por grep en los criterios de aceptación de la Task 1.
