---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 02
subsystem: engine
tags: [vitest, typescript, engine-counters, tdd]

# Dependency graph
requires:
  - phase: 07-01
    provides: "CounterState (villainHealth/heroHealth nullable) y SessionContext.counters? exportados desde engine/types.ts"
provides:
  - "engine/counters.ts — resolveCounters/resolveCounterValues/computeInitialVillainHealth/computeInitialHeroHealth/incrementVillain/decrementVillain/incrementHero/decrementHero, las ocho firmas exactas que consumen los planes 03 y 04"
  - "engine/__tests__/counters.test.ts — 37 tests que fijan las cifras de precarga, los topes, la desigualdad referencial y la normalización defensiva"
affects: ["07-03", "07-04", "07-05", "07-06"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mutador puro con reasignación completa en cinco niveles (session/context/counters/heroHealth/entrada), copiado estructuralmente de engine/selection.ts"
    - "Normalización defensiva por TIPO con Number.isFinite + Math.trunc + Math.max(0, …), nunca typeof === 'number' (acepta NaN/Infinity)"
    - "Valor congelado gana al calculado en vivo: resolveCounterValues nunca tiene un 'instante de precarga' que perder o duplicar"

key-files:
  created: [engine/counters.ts, engine/__tests__/counters.test.ts]
  modified: []

key-decisions:
  - "Ninguna desviación del plan: engine/counters.ts implementa las ocho exportaciones exactamente como fija el bloque <interfaces>, sin dependencias nuevas y sin zod"

requirements-completed: [HP-03, HP-05, HP-06, HP-07, HP-08]

duration: 20min
completed: 2026-09-08
---

# Phase 7 Plan 2: Motor de contadores (precarga, resolución defensiva y mutadores puros) Summary

**`engine/counters.ts` con precarga desde el catálogo (villano etapa I × jugadores × dificultad, héroe plano), resolución defensiva de lo persistido y cuatro mutadores puros con reasignación completa — escrito con test primero (RED/GREEN)**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2

## Accomplishments

- `engine/__tests__/counters.test.ts` escrito primero, en rojo por la razón correcta (`../counters` no existía) — 7 describes, 37 tests, cifras de precarga verificadas de primera mano contra `content/marvel-characters.json` (Rhino 42, Kang normal 36/experto 45, Ultron 51, Thor 14, Iron Man 9, She-Hulk 15 con 3 jugadores).
- `engine/counters.ts` implementado hasta poner los 37 tests en verde: precarga leyendo solo `stages[0]` (D-11), normalización defensiva con `Number.isFinite`/`Math.trunc`/`Math.max(0, …)` (mejora explícita sobre el borrador de RESEARCH.md, que usaba `typeof === 'number'` y por tanto aceptaba `NaN`/`Infinity`), valor congelado que gana al calculado en vivo (D-09), tope en 0 y arranque en 1 (D-12/D-15), y los cuatro mutadores con la cadena completa de reasignación en cinco niveles (D-20/HP-08).
- `npx vitest run --project engine`: 327/327 en verde (ninguna suite preexistente rota, incluida `voice-drift.test.ts` con sus 8 tests intactos). `npx vitest run` completo (proyectos `engine` + `app-logic`): 502/502 en verde.
- Diff limitado a los dos ficheros del plan: `engine/counters.ts` y `engine/__tests__/counters.test.ts`. Ningún cambio en `engine/persistence.ts`, `engine/schema.ts` ni `content/`.

## Task Commits

1. **Task 1: Escribir `engine/__tests__/counters.test.ts` primero (RED)** - `0085214` (test)
2. **Task 2: Implementar `engine/counters.ts` hasta poner el test en verde (GREEN)** - `3dbc7d6` (feat)

**Plan metadata:** (pendiente — commit final de este plan)

## Files Created/Modified

- `engine/__tests__/counters.test.ts` — 312 líneas, 7 describes (precarga, normalización defensiva, `resolveCounterValues`, desigualdad referencial, topes y arranque, no-op de slot, D-10), 37 tests.
- `engine/counters.ts` — 177 líneas, 8 exportaciones (`computeInitialVillainHealth`, `computeInitialHeroHealth`, `resolveCounters`, `resolveCounterValues`, `incrementVillain`, `decrementVillain`, `incrementHero`, `decrementHero`).

## Decisions Made

- Ninguna desviación del plan. La única mejora explícitamente pedida por el propio plan (validar con `Number.isFinite` en vez de `typeof === 'number'`, saneando con `Math.trunc`/`Math.max(0, …)`) se aplicó tal cual estaba especificada — no es una desviación de las reglas de ejecución, es la instrucción literal del plan.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. El único ajuste respecto al borrador de RESEARCH.md (validación por `Number.isFinite` en vez de `typeof`) estaba ya prescrito en el propio texto del plan, no es un descubrimiento de ejecución.

## Threat Flags

Ninguno nuevo. Las tres mitigaciones de `<threat_model>` (T-07-04, T-07-05, T-07-06, T-07-07) quedan implementadas tal como las describe el registro: validación por tipo con `Number.isFinite`/`Math.trunc`/suelo en 0, `counters` nuevo construido siempre desde `resolveCounters` (nunca desde un spread de `context.counters`), cero `throw`/`try`/`catch` en el fichero, y guarda de rango de `slot` idéntica a `setHero`.

## Issues Encountered

Ninguno. `node_modules` no existía en el worktree (no era un symlink corrupto, simplemente no estaba instalado); se resolvió con `npm ci` estándar, mismo `package-lock.json`, sin instalar ningún paquete nuevo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useGameSession.ts` (plan 04) y `CounterBand.vue` (plan 05) pueden importar las ocho firmas de `engine/counters.ts` tal cual quedaron fijadas aquí, sin reinterpretar la forma.
- Sin bloqueos para los planes dependientes de esta ola.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: engine/counters.ts
- FOUND: engine/__tests__/counters.test.ts
- FOUND: 07-02-SUMMARY.md
- FOUND: 0085214 (test commit)
- FOUND: 3dbc7d6 (feat commit)
- FOUND: 2668b39 (docs commit)
