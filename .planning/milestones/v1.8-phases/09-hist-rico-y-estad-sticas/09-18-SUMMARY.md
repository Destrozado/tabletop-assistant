---
phase: 09-hist-rico-y-estad-sticas
plan: 18
subsystem: persistence
tags: [localStorage, typescript, vitest, boolean-contract]

# Dependency graph
requires:
  - phase: 09-16
    provides: appendHistoryEntry() valida la entrada antes de escribir y ya devuelve boolean
  - phase: 09-17
    provides: (paralelo, sin dependencia directa de código)
provides:
  - "save(session): boolean — propaga si window.localStorage.setItem completó sin lanzar para tga:progress:<gameId>"
  - "comentario de writeRaw() que documenta los DOS llamadores que miran el resultado (appendHistoryEntry, save) y los que lo ignoran deliberadamente (saveVoicePreference, los dos callers de save() en [game]/index.vue)"
  - "dos tests de contrato: save() devuelve true al escribir de verdad, false cuando setItem lanza"
affects: [09-20, 09-21]

# Tech tracking
tech-stack:
  added: []
  patterns: ["un valor de retorno real que respalda cualquier promesa por escrito de la interfaz sobre un dato (D-03 extendido)"]

key-files:
  created: []
  modified:
    - app/composables/usePersistedSession.ts
    - app/composables/__tests__/usePersistedSession.test.ts

key-decisions:
  - "save() cambia de : void a : boolean devolviendo directamente writeRaw(...) — cero comportamiento observable nuevo, nadie consume el retorno todavía"
  - "El comentario de writeRaw ya no dice que appendHistoryEntry es el ÚNICO llamador que mira el resultado; ahora enumera los dos (appendHistoryEntry, save) y por qué, sin dejar de citar VOZ-06/D-51 para los que lo ignoran"

patterns-established:
  - "Un dato del que la app hace una promesa por escrito al grupo no puede seguir escribiéndose con un fallo silencioso — el valor de retorno tiene que existir aunque nadie lo consuma todavía"

requirements-completed: [HIST-06, HIST-09]

# Metrics
duration: 25min
completed: 2026-09-13
---

# Phase 09 Plan 18: Contrato booleano de save() Summary

**`save()` deja de descartar el booleano de `writeRaw()` — ahora devuelve `: boolean` propagando si `tga:progress:<gameId>` quedó escrito de verdad, cerrando la causa raíz del BLOCKER CR-01 (ronda 4) sin cambiar ningún comportamiento observable todavía.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-13T08:26:00Z (aprox.)
- **Completed:** 2026-09-13T08:51:08Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- `save(session: EngineSession): boolean` propaga el resultado real de `writeRaw()` en vez de descartarlo — existe ahora un dato que responde «¿se escribió el progreso de esta partida?»
- El comentario de `writeRaw` ya no contiene la frase que desautorizaba tocar la firma de `save()` (hallazgo de `09-REVIEW.md` líneas 455-469); ahora enumera los dos llamadores que miran el resultado (`appendHistoryEntry`, `save`) y por qué los otros (`saveVoicePreference`, los dos callers del autoguardado en `[game]/index.vue`) siguen ignorándolo deliberadamente, amparados por VOZ-06/D-51
- Dos tests de contrato nuevos fijan el comportamiento: `save()` devuelve `true` al escribir de verdad y `false` cuando `setItem` lanza, sin lanzar en ningún caso — verificado manualmente que el test de `false` falla si `save()` vuelve a descartar el booleano (revertido de inmediato tras confirmar el fallo)

## Task Commits

Each task was committed atomically:

1. **Task 1: `save()` devuelve si el progreso quedó escrito de verdad** - `cb0774c` (feat)
2. **Task 2: el comentario de `writeRaw` deja de desautorizar el arreglo de CR-01** - `99189a9` (docs)
3. **Task 3: tests de contrato de `save()`** - `adaf800` (test)

**Plan metadata:** (pendiente — commit de este SUMMARY.md, ejecutado como agente en worktree paralelo; el orquestador central actualiza STATE.md/ROADMAP.md tras el merge de la ola)

## Files Created/Modified
- `app/composables/usePersistedSession.ts` - `save()` cambia de `: void` a `: boolean`; comentario de `writeRaw` reescrito con los dos llamadores que miran el resultado
- `app/composables/__tests__/usePersistedSession.test.ts` - dos tests nuevos: «save() devuelve true cuando el progreso queda escrito de verdad (CR-01 ronda 4)» y «save() devuelve false cuando setItem lanza… CR-01 ronda 4»

## Decisions Made
- Se mantiene sin tocar `saveVoicePreference` (`: void`), `writeRaw`, `removeRaw`, `readRaw`, `load`, `clear` y ambos llamadores de `save()` en `app/pages/[game]/index.vue` — exactamente el alcance mínimo que el plan definió, verificado con grep tras cada task
- Ninguna decisión arquitectónica nueva: es un cambio de firma + documentación + tests, sin tocar comportamiento

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. El único paso adicional fue ejecutar `npx nuxt prepare` al inicio porque el worktree no traía `.nuxt/` generado (necesario para que Vitest/Nitro resolvieran `tsconfig.app.json`) — entorno de ejecución, no cambio de alcance del plan.

## Issues Encountered
- Vitest fallaba en todos los ficheros con `TSCONFIG_ERROR: Tsconfig not found '.nuxt/tsconfig.app.json'` al arrancar en este worktree recién creado. Resuelto ejecutando `npx nuxt prepare`, que regenera `.nuxt/` sin tocar ningún fichero versionado. Tras eso, `npx vitest run` y `npm run build` corrieron en verde en las tres verificaciones del plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- El dato que faltaba para cerrar CR-01 (ronda 4) ya existe: `save(): boolean`. Los planes 09-20 (que consumirá el retorno en `useHistorySavedNotice.ts`) y 09-21 (que lo consumirá en `[game]/index.vue` y `HistorySavedNotice.vue`) pueden ejecutarse ya — su `depends_on` en este plan queda satisfecho.
- Sin bloqueantes nuevos. La suite completa (785 tests previos + 2 nuevos = 787) y el build de producción terminan en verde.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*

## Self-Check: PASSED

- FOUND: app/composables/usePersistedSession.ts
- FOUND: app/composables/__tests__/usePersistedSession.test.ts
- FOUND: .planning/phases/09-hist-rico-y-estad-sticas/09-18-SUMMARY.md
- FOUND: commit cb0774c (Task 1)
- FOUND: commit 99189a9 (Task 2)
- FOUND: commit adaf800 (Task 3)
- FOUND: commit 57773ca (SUMMARY.md commit)
