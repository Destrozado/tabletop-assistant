---
phase: 09-hist-rico-y-estad-sticas
plan: 01
subsystem: engine
tags: [typescript, vitest, pure-functions, historico]

# Dependency graph
requires:
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores
    provides: "resolvePlayerSlots/resolveVillainId (engine/selection.ts) — normalización defensiva de la selección"
  - phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
    provides: "precedente de campo aditivo en SessionContext (selection/counters) sin bump de versión"
provides:
  - "SessionContext.startedAt?: number (D-07), campo aditivo sin bump de formatVersion/contentVersion"
  - "LossCause, GameOutcome, HistoryPlayerEntry, GameHistoryEntry en engine/types.ts"
  - "engine/history.ts: buildHistoryEntry, describeLossCause, formatEntryDate, formatEntryDuration, sortEntriesByRecency, MONTHS_ES, FrozenNames"
  - "23 tests en engine/__tests__/history.test.ts cubriendo D-06/D-08/D-09/D-10/D-11/D-12/D-15/D-21"
affects: ["09-02", "09-03", "09-04", "09-05", "09-06", "09-07", "09-08"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Función pura del motor que construye un objeto plano a partir de una sesión (calcado de engine/counters.ts)"
    - "Formateadores puros deterministas sin toLocaleDateString/Intl, mismo papel que describeHeader"

key-files:
  created:
    - engine/history.ts
    - engine/__tests__/history.test.ts
  modified:
    - engine/types.ts

key-decisions:
  - "FrozenNames como cuarto argumento de buildHistoryEntry: el alias español se resuelve SIEMPRE en la capa de interfaz (plan 09-05), nunca dentro de engine/ — mantiene la frontera pura del motor"
  - "durationMs con guarda triple (typeof number + Number.isFinite + now >= startedAt): un startedAt manipulado en el futuro o no numérico cae a null, nunca a 0 ni a un negativo"

patterns-established:
  - "engine/history.ts sigue la disciplina de engine/selection.ts (normalización defensiva, nunca muta, nunca lanza) combinada con la de engine/header.ts (formateadores puros que devuelven cadenas listas para pintar)"

requirements-completed: [HIST-02, HIST-03, HIST-04, HIST-05]

# Metrics
duration: 25min
completed: 2026-09-10
---

# Phase 9 Plan 1: Tipos y motor puro del histórico Summary

**`engine/history.ts` construye una `GameHistoryEntry` completa (resultado, causa de derrota, villano, héroes con nombre congelado, dificultad, nº de jugadores, ronda y duración) a partir de una sesión viva, con formateadores de fecha/duración deterministas y sin depender del locale del entorno.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-10T09:32:00Z (aprox., según STATE.md)
- **Completed:** 2026-09-10T09:40:00Z
- **Tasks:** 3/3 completadas
- **Files modified:** 3 (1 modificado, 2 nuevos)

## Accomplishments
- `engine/types.ts` extendido de forma puramente aditiva: `SessionContext.startedAt`, `LossCause`, `GameOutcome`, `HistoryPlayerEntry` y `GameHistoryEntry`, sin tocar ni una línea existente ni bumpear ninguna versión.
- `engine/history.ts` nuevo: `buildHistoryEntry` lee la selección SIEMPRE por `resolvePlayerSlots`/`resolveVillainId` (nunca `context.selection` en crudo, T-09-01), calcula `durationMs` con la guarda triple de T-09-02, y `describeLossCause` fija las dos cadenas de D-06 contrastadas contra el Rules Reference v1.7 p. 46 ("Winning the Game") y "Eliminated".
- 23 tests en verde, uno o más por cada una de las 8 decisiones de dato de la fase, más `sortEntriesByRecency` y la garantía de no-mutación de `session`/`names`.

## Task Commits

1. **Task 1: Tipos aditivos del histórico en engine/types.ts** - `051151b` (feat)
2. **Task 2: engine/history.ts — construcción y formateo puros** - `af3e503` (feat)
3. **Task 3: engine/__tests__/history.test.ts** - `d5663bd` (test)

**Plan metadata:** (pendiente — commit de cierre de este SUMMARY)

## Files Created/Modified
- `engine/types.ts` - añade `startedAt?: number` a `SessionContext` y los cuatro tipos nuevos (`LossCause`, `GameOutcome`, `HistoryPlayerEntry`, `GameHistoryEntry`)
- `engine/history.ts` - `buildHistoryEntry`, `describeLossCause`, `MONTHS_ES`, `formatEntryDate`, `formatEntryDuration`, `sortEntriesByRecency`, interfaz `FrozenNames`
- `engine/__tests__/history.test.ts` - 23 tests, `describe` nombrados por la decisión que fijan

## Decisions Made

Ninguna decisión nueva más allá de las 26 ya cerradas en `09-CONTEXT.md`. Dos matices de implementación, ambos dentro del margen de "Claude's Discretion" que el contexto dejaba abierto:

- El alias español (`heroName`/`villainName` congelados) llega a `buildHistoryEntry` como cuarto argumento `FrozenNames` ya resuelto, en vez de que el motor intente resolverlo — así `engine/history.ts` nunca necesita importar nada de la capa de interfaz.
- El `id` de una entrada sigue la plantilla `${now}-${Math.random().toString(36).slice(2, 8)}` recomendada por el plan (sin `crypto.randomUUID`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/tsconfig.app.json` no existía, `npx vitest run engine` fallaba con `TSCONFIG_ERROR` en los 15 ficheros de test previos a este plan**
- **Found during:** Verificación de la Task 1 (primer `npx vitest run engine` de la sesión)
- **Issue:** El directorio `.nuxt/` no estaba generado en este worktree recién creado; Vitest no podía resolver el `tsconfig` que referencian los proyectos de test.
- **Fix:** `npx nuxi prepare` (genera los tipos y `tsconfig` sin tocar ningún fichero del repo versionado).
- **Files modified:** ninguno (solo genera `.nuxt/`, que ya está en `.gitignore`).
- **Verification:** `npx vitest run engine` pasó de 15 ficheros fallidos a 15 pasados (374 tests) inmediatamente después.
- **Committed in:** N/A — no produce cambios versionados.

**2. [Rule 1 - Bug] Dos comentarios explicativos citaban literalmente `Date.now()`/`toLocaleDateString`/`Intl.` y una ruta `app/data`, disparando en falso los greps de "prohibido en este fichero" de los criterios de aceptación de las Tasks 1 y 2**
- **Found during:** Verificación de criterios de aceptación de la Task 2 (`grep -Ec "Date\.now\(\)|toLocaleDateString|Intl\."` devolvía 2 en vez de 0; `grep -Ei "firestore|firebase|~/|app/data"` devolvía 1 en vez de 0)
- **Issue:** Los comentarios documentaban correctamente la prohibición ("nunca `Date.now()` interno", "nunca `toLocaleDateString` ni `Intl`", "no puede alcanzar `app/data/...`"), pero el grep mecánico de los criterios de aceptación no distingue entre uso real y mención en comentario.
- **Fix:** Reescritos los tres comentarios para transmitir la misma prohibición sin citar literalmente las cadenas vigiladas (p. ej. "nunca leído del reloj real aquí dentro", "sin depender de las utilidades de localización del runtime", "ningún módulo bajo la carpeta de la interfaz").
- **Files modified:** `engine/history.ts`
- **Verification:** ambos greps devuelven 0 tras el cambio; `npx vitest run engine` sigue en verde (374/374).
- **Committed in:** `af3e503` (parte del commit de la Task 2, antes de que existiera commit previo que revertir)

## Self-Check: PASSED

- FOUND: engine/types.ts
- FOUND: engine/history.ts
- FOUND: engine/__tests__/history.test.ts
- FOUND commit: 051151b
- FOUND commit: af3e503
- FOUND commit: d5663bd

## Verification Against Plan

- `npm test` termina con código 0: **23 test files, 590 tests, todos en verde.**
- `grep -rEi "firestore|firebase" engine/` no devuelve ninguna línea: **confirmado, vacío.**
- `git diff engine/persistence.ts` está vacío: **confirmado, `engine/persistence.ts` no aparece en ningún commit de este plan.**
- `engine/types.ts` exporta `LossCause`, `GameOutcome`, `HistoryPlayerEntry` y `GameHistoryEntry`; `SessionContext` admite `startedAt`, sin bump de `formatVersion` ni `contentVersion`: **confirmado.**
- `engine/history.ts` construye una entrada completa (HIST-04) y formatea fecha/duración con cadenas deterministas: **confirmado, 23 tests lo fijan.**

## Known Stubs

Ninguno. Este plan solo entrega funciones puras del motor con su test hermano; no hay componentes ni pantallas que puedan quedar con datos vacíos o placeholder.

## Threat Flags

Ninguno. Las cuatro mitigaciones del `<threat_model>` del plan (T-09-01, T-09-02, T-09-03, T-09-04) están implementadas y cubiertas por test; no se introduce superficie nueva fuera de lo ya registrado en el propio plan.
