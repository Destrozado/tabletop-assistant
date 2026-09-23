---
phase: 09-hist-rico-y-estad-sticas
plan: 03
subsystem: engine
tags: [typescript, vitest, pure-functions, estadisticas]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "engine/types.ts::GameHistoryEntry/HistoryPlayerEntry (plan 09-01)"
provides:
  - "engine/statistics.ts: aggregateStatistics, StatRow, StatisticsSummary"
  - "12 tests en engine/__tests__/statistics.test.ts cubriendo D-12/D-23/D-24/D-25/D-26"
affects: ["09-05", "09-06"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agregación por Map con guardas de tipo, calcada de engine/counters.ts::resolveCounterValues"
    - "Desempate en cascada de tres criterios (%/partidas/alfabético es) fijado por .sort() puro sobre copia"

key-files:
  created:
    - engine/statistics.ts
    - engine/__tests__/statistics.test.ts
  modified: []

key-decisions:
  - "aggregateStatistics tiene un único parámetro (entries) sin rama de fuente ni bandera alguna — D-14/STAT-04, verificado también por grep mecánico en el propio plan"
  - "El nombre congelado ganador es el primero visto al recorrer entries en el orden recibido (más reciente a más antiguo), documentado en comentario junto a buildRows"

patterns-established:
  - "engine/statistics.ts sigue la disciplina de engine/counters.ts: agrupación en Map, guardas Array.isArray/typeof por entrada, nunca muta ni lanza"

requirements-completed: [STAT-02, STAT-03, STAT-05]

# Metrics
duration: 18min
completed: 2026-09-10
---

# Phase 9 Plan 3: Agregación estadística Summary

**`engine/statistics.ts` recorre el histórico una sola vez y devuelve las tablas de héroes y villanos ya ordenadas por la cascada % → partidas jugadas → alfabético en español, más el tamaño de muestra que necesita la línea de D-12.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-10T09:30:00Z (aprox.)
- **Completed:** 2026-09-10T09:47:00Z
- **Tasks:** 2/2 completadas
- **Files modified:** 2 (ambos nuevos)

## Accomplishments
- `aggregateStatistics(entries: GameHistoryEntry[])` con un único parámetro, sin ninguna rama de «fuente» ni de red (D-14/STAT-04), verificado mecánicamente con grep.
- `buildRows` agrupa por id DISTINTO dentro de cada entrada (D-26: mismo héroe en dos huecos cuenta una vez) y atribuye el resultado a TODOS los héroes de la partida (D-26: cooperativo).
- Orden final en cascada exacta de D-24 (`pct` descendente → `played` descendente → `localeCompare(..., 'es')`), sin umbral mínimo de partidas (D-25) y sin inventar filas a cero (D-23).
- `entriesWithHeroes`/`totalEntries` alimentan la línea de muestra declarada de D-12 sin que las entradas sin héroe distorsionen el %.
- 12 tests en verde, uno o más por cada decisión, incluidos los tres criterios de la cascada de orden por separado y la garantía de no-mutación.

## Task Commits

Each task was committed atomically:

1. **Task 1: engine/statistics.ts** - `3554a9b` (feat)
2. **Task 2: engine/__tests__/statistics.test.ts** - `c8fe508` (test)

**Plan metadata:** (pendiente — commit de cierre de este SUMMARY, aplicado por el orquestador tras la ola)

## Files Created/Modified
- `engine/statistics.ts` - `aggregateStatistics`, `StatRow`, `StatisticsSummary`, función interna `buildRows`
- `engine/__tests__/statistics.test.ts` - 12 tests, `describe` nombrados por la decisión que fijan

## Decisions Made

Ninguna decisión nueva más allá de las 26 ya cerradas en `09-CONTEXT.md`. Un matiz de implementación dentro del margen de "Claude's Discretion" que el plan dejaba abierto:

- El desempate alfabético se probó con un par de nombres que fuerza la comparación real (`Angela` vs `Úlfric`), en vez de dos nombres que ya empezaran por letras distintas sin tilde de por medio — así el test ejercita `localeCompare('es')` de verdad y no solo un orden ASCII que hubiera coincidido por casualidad.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`aggregateStatistics` queda lista para que el plan 09-05 (composable `useGameHistory`/`useGameStatistics`) la envuelva y el plan 09-06 (`estadisticas.vue`) se limite a pintar `heroRows`/`villainRows`/`totalEntries`/`entriesWithHeroes` sin reordenar ni recalcular nada. Sin bloqueos.

## Self-Check: PASSED

- FOUND: engine/statistics.ts
- FOUND: engine/__tests__/statistics.test.ts
- FOUND commit: 3554a9b
- FOUND commit: c8fe508

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-10*
