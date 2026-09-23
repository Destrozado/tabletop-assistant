---
phase: 09-hist-rico-y-estad-sticas
plan: 25
subsystem: testing
tags: [localstorage, persistence, typescript, vitest, resume]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-24 — `npm run typecheck` (vue-tsc, strict:true) instalado y en CI, cubriendo app/** + transitivos"
provides:
  - "`readProgress(gameId)` en `usePersistedSession.ts`: lectura de tres vías del progreso (ok/con posición, ok/sin posición, failed), con `load()` reescrito como envoltorio suyo"
  - "`app/composables/useStoredProgress.ts` (nuevo): `readStoredProgress(game)`, tipo `StoredProgress` ('resumable'|'absent'|'unknown'), `StoredProgressReport`, `PLACEHOLDER_CONTEXT` — la autoridad única para afirmar qué hay guardado en el dispositivo para un juego"
affects: ["09-26"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Distinguir 'he leído y no hay nada' de 'no he podido leer' con una unión discriminada de tres vías en el punto de lectura, no con un booleano — mismo patrón que `readEnvelope`/`EnvelopeRead` (CR-01 ronda 3) aplicado ahora también al progreso"
    - "Una autoridad de lectura reconstruye el mismo camino que el consumidor real (`expand` + lectura + `resume`) en vez de reimplementar la regla de reanudación, para que dos consumidores no puedan contradecirse nunca (causa raíz del BLOCKER de la ronda 5)"
    - "Import de fixture JSON vía módulo (`resolveJsonModule`), no `readFileSync`/`fileURLToPath`, en cualquier test bajo `app/**` — ese árbol SÍ pasa por `npm run typecheck` (09-24) y `node:fs`/`node:url` no tienen tipos sin `@types/node` (no instalado); el patrón de `engine/__tests__/audio-ids.test.ts` no es portable fuera de `engine/`"

key-files:
  created:
    - app/composables/useStoredProgress.ts
    - app/composables/__tests__/useStoredProgress.test.ts
  modified:
    - app/composables/usePersistedSession.ts
    - app/composables/__tests__/usePersistedSession.test.ts

key-decisions:
  - "Task 2: el test de la autoridad carga el fixture `tiny-game.json` con un import de módulo JSON en vez del patrón `readFileSync`+`fileURLToPath` de `audio-ids.test.ts` — desviación de la instrucción literal del `<read_first>` del plan, necesaria porque ese patrón rompía `npm run typecheck` (node:fs/node:url sin tipos bajo app/**, que sí está cubierto); ya hay precedente de import JSON directo en `useGameContent.ts`/`useCharacterCatalogue.ts`"

requirements-completed: [HIST-06, HIST-09]

# Metrics
duration: ~6min
completed: 2026-09-13
---

# Phase 09 Plan 25: La autoridad de lectura del progreso guardado Summary

**`readStoredProgress(game)` (nuevo, `useStoredProgress.ts`) responde con una lectura real del dispositivo y la misma regla de reanudación del motor si hay partida reintentable — distinguiendo por primera vez 'no hay' de 'no he podido comprobarlo'; plan puramente aditivo, sin consumidores todavía.**

## Performance

- **Duration:** ~6 min (commits `318eb02` → `dfc2773`)
- **Started:** 2026-09-13T13:51:41+02:00 (baseline de tests antes de tocar nada)
- **Completed:** 2026-09-13T13:55:11+02:00
- **Tasks:** 2
- **Files modified:** 4 (2 nuevos, 2 ampliados)

## Accomplishments
- `usePersistedSession.ts` gana `readProgress(gameId): ProgressRead`, con `{ read: 'ok', position: PersistedPosition | null }` para «he mirado, esto es lo que hay (o no hay nada utilizable)» y `{ read: 'failed' }` para «no he podido mirar». `load()` queda reescrito como envoltorio de una sola línea sobre `readProgress`, con la misma firma y el mismo comportamiento observable de antes — verificado por los 796→801 tests previos a este plan (ahora 809) sin ningún cambio de resultado.
- `useStoredProgress.ts` (nuevo) expone `readStoredProgress(game)`: reproduce exactamente los tres pasos que hoy vive escritos a mano en `onMounted` de `app/pages/[game]/index.vue` (`expand` → lectura → `resume`), y devuelve `StoredProgress` ('resumable' | 'absent' | 'unknown') junto al `outcome` y la `session` del motor. La invariante `stored === 'resumable' ⟺ outcome !== 'fresh'` queda documentada y verificada por los tests.
- 13 tests nuevos (5 de `readProgress` + 8 de `readStoredProgress`), todos con `toEqual`/`toBe` exactos, incluida la vía que cierra la clase: `getItem` que lanza produce `'unknown'`/`'failed'`, nunca `'absent'`.
- `npm run typecheck` (código 0), `npm run build` (código 0) y `npx vitest run` (809/809, código 0) verificados tras cada task y de nuevo al cierre del plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: la costura de almacenamiento distingue «he leído y no hay» de «no he podido leer», también para el progreso** — `318eb02` (feat)
2. **Task 2: la autoridad — una sola función contesta «¿qué hay realmente en el dispositivo para este juego?»** — `dfc2773` (feat)

**Plan metadata:** pendiente (este commit, ver más abajo)

## Files Created/Modified
- `app/composables/usePersistedSession.ts` — tipo `ProgressRead` exportado, función `readProgress` (única ruta de parseo del progreso), `load` reescrito como envoltorio de `readProgress`, `readProgress` exportado en el objeto de retorno del composable
- `app/composables/__tests__/usePersistedSession.test.ts` — describe nuevo `readProgress (CR-01 ronda 5)` con 5 tests (ausente, con valor, JSON corrupto, `getItem` que lanza, sin `window`)
- `app/composables/useStoredProgress.ts` (nuevo) — `StoredProgress`, `StoredProgressReport`, `PLACEHOLDER_CONTEXT`, `readStoredProgress(game)`
- `app/composables/__tests__/useStoredProgress.test.ts` (nuevo) — 8 tests de tabla de verdad sobre el fixture `tiny-game.json`

## Decisions Made
- Task 2: import de módulo JSON para el fixture en vez de `readFileSync`/`fileURLToPath` — ver `key-decisions` arriba y la sección de Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] El patrón de carga de fixture del `<read_first>` (`audio-ids.test.ts`) rompía `npm run typecheck` al aplicarse bajo `app/**`**
- **Found during:** Task 2, al ejecutar `npm run typecheck` tras escribir el test tal como describía la acción del plan.
- **Issue:** `readFileSync`/`fileURLToPath` con imports `node:fs`/`node:url` funcionan sin problema en `engine/__tests__/audio-ids.test.ts` porque ese fichero está FUERA del alcance de `npm run typecheck` (verificado y documentado por 09-24). `app/composables/__tests__/useStoredProgress.test.ts`, en cambio, SÍ está dentro del alcance (`app/**`), y el proyecto no tiene `@types/node` instalado — `nuxt typecheck` fallaba con `TS2307: Cannot find module 'node:fs'`.
- **Fix:** Sustituido por un import de módulo JSON directo del fixture (`import rawTinyGame from '../../../engine/__tests__/fixtures/tiny-game.json'`), aprovechando `resolveJsonModule: true` (ya activo en `.nuxt/tsconfig.*.json`) y el precedente ya existente en `useGameContent.ts`/`useCharacterCatalogue.ts`, que cargan contenido JSON exactamente así. No se instaló `@types/node` ni ningún paquete nuevo.
- **Files modified:** `app/composables/__tests__/useStoredProgress.test.ts`
- **Verification:** `npm run typecheck` pasa de código 2 a código 0; los 8 tests del fichero siguen pasando sin cambios de aserciones.
- **Committed in:** `dfc2773` (parte del commit de Task 2)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** El fixture cargado y validado es el mismo (`tiny-game.json` vía `validateGameDefinition`); solo cambió el mecanismo de import, elegido porque ya tiene precedente en el propio `app/composables/`. No hay scope creep — ningún fichero fuera de `files_modified` del plan quedó tocado.

## Issues Encountered
Ninguno más allá de la desviación documentada arriba.

## User Setup Required
None - no external service configuration required.

## Declaración obligatoria sobre el gap de la ronda 5

**Este plan NO cierra el gap de la ronda 5.** Es puramente aditivo: crea la autoridad de lectura
(`readStoredProgress`) y la costura de almacenamiento (`readProgress`) que la respalda, pero
**ningún consumidor la usa todavía** — verificado con `grep -rln "readStoredProgress" app`, que
solo devuelve `app/composables/useStoredProgress.ts` y su propio test. `app/pages/[game]/index.vue`
y `app/composables/useHistorySavedNotice.ts` siguen exactamente como estaban antes de este plan
(ningún `.vue` aparece en `git status --short` de las dos tasks). El BLOCKER de la ronda 5 — el
aviso de fin de partida y `ResumePrompt` pudiendo contradecirse sobre si hay algo que reintentar —
**sigue abierto** hasta que el plan **09-26** cablee ambos consumidores a esta autoridad.

## Next Phase Readiness
- `useStoredProgress.ts` expone el contrato exacto que 09-26 necesita consumir (`readStoredProgress`,
  `StoredProgress`, `StoredProgressReport`, `PLACEHOLDER_CONTEXT`), sin ninguna firma pública
  existente alterada.
- Nada bloquea el arranque de 09-26: `npm run typecheck`, `npm run build` y `npx vitest run`
  (809/809) están en verde al cierre de este plan.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*

## Self-Check: PASSED
