---
phase: 09-hist-rico-y-estad-sticas
plan: 07
subsystem: app-composables
tags: [vue, nuxt, vitest, historico, engine-session]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-02"
    provides: "GameOutcomeDialog.vue (contextLine/warningBody, emits record/dismiss), useHistorySavedNotice.ts (notifyHistorySaved)"
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-05"
    provides: "useGameHistory.ts: record(session, outcome): boolean"
provides:
  - "app/composables/useGameSession.ts: withStartedAt(context, now) — startedAt sellado UNA vez en start(), nunca reescrito al reanudar"
  - "app/pages/[game]/index.vue: finishGame()/onOutcomeRecorded()/onOutcomeDismiss() sustituyen a onEndGameConfirm/onEndGameCancel"
  - "app/pages/[game]/index.vue: outcomeContextLine (villano · n jug · dificultad · ronda N, villano omitido si no hay ninguno)"
  - "GameOutcomeDialog cableado en la plantilla, reemplazando el ConfirmDialog de «Partida terminada»"
affects: ["09-08"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "finishGame(): cola de limpieza extraída sin reordenar (D-U4) para que ningún llamante pueda invocar por accidente sus tres pasos antes de registrar"

key-files:
  created: []
  modified:
    - app/composables/useGameSession.ts
    - app/composables/__tests__/useGameSession.test.ts
    - app/pages/[game]/index.vue

key-decisions:
  - "El registro (record + notifyHistorySaved) se inserta ENTRE silence() y finishGame(), nunca dentro de finishGame() ni después: finishGame() es exactamente los tres pasos que ya destruían la sesión (D-U4), y moverlos habría sido el error de un carácter que produce un histórico vacío en silencio (Pitfall 1)."
  - "onEndGameRequest() y onDiscardConfirm() no se tocaron ni una línea, tal y como exigía el plan (D-05: descartar una partida para empezar otra no es terminarla, no hay resultado que registrar)."

requirements-completed: [HIST-01, HIST-02, HIST-03, HIST-05]

# Metrics
duration: 25min
completed: 2026-09-10
---

# Phase 09 Plan 07: Punto de enganche — sellar el inicio y registrar el resultado Summary

**`withStartedAt` sella el instante de inicio en `start()` una sola vez, y `index.vue` sustituye el `ConfirmDialog` de «Partida terminada» por `GameOutcomeDialog`, registrando la entrada del histórico entre `silence()` y la cola de limpieza que antes borraba la sesión.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-10 (tras corregir la base del worktree con `git reset --hard` al commit de cierre de la ola 3)
- **Completed:** 2026-09-10
- **Tasks:** 3/3 completadas
- **Files modified:** 3

## Accomplishments

- `withStartedAt(context, now)`: función pura exportada a nivel de módulo, hermana de `buildCounterCells`/`buildStepValueCells`; `start()` la usa para sellar `startedAt` con `Date.now()` una sola vez. `engine/persistence.ts` queda intacto — `resume()` restaura el `context` persistido entero y nunca pasa por `start()`, así que una partida guardada por v1.7 se reanuda con `startedAt: undefined` sin que nadie lo reescriba.
- `finishGame()`: extracción literal de los tres pasos finales de `onEndGameConfirm` (`session.value = null`, `clear(gameId)`, `navigateTo('/')`), con sus comentarios intactos, para que ningún llamante pueda alterar el orden D-U4 por accidente.
- `onOutcomeRecorded(outcome)`: registra con `record(session.value, outcome)` y avisa con `notifyHistorySaved(guardado)` **entre** `silence()` y `finishGame()` — el único punto donde `session.value` todavía existe y la sesión aún no se ha destruido.
- `onOutcomeDismiss()`: termina la partida sin escribir en el histórico (HIST-02), documentado con la nota de reconciliación que exige el plan.
- `outcomeContextLine`: compone `{villano} · {n} jug · {dificultad} · ronda {N}`, omitiendo el segmento del villano por completo cuando no hay ninguno elegido (SEL-09/D-12), reutilizando `findVillainOption`/`sessionContextLabel` ya existentes.
- `GameOutcomeDialog` sustituye al `ConfirmDialog` de «Partida terminada» en la plantilla, en la misma posición (hermano justo después de `IndexOverlay`, D-U3), sin tocar el `ConfirmDialog` del descarte (D-05).

## Task Commits

Each task was committed atomically:

1. **Task 1: startedAt se sella en start() (D-07/HIST-05)** - `c088919` (feat)
2. **Task 2: manejadores de fin de partida en index.vue** - `541a553` (feat)
3. **Task 3: sustituir el ConfirmDialog por GameOutcomeDialog en la plantilla** - `a7f1335` (feat)

**Plan metadata:** (pendiente — commit de cierre de este SUMMARY, lo hace el orquestador tras el merge)

## Files Created/Modified

- `app/composables/useGameSession.ts` — `withStartedAt(context, now)` exportada; `start()` la usa para sellar `startedAt`
- `app/composables/__tests__/useGameSession.test.ts` — `describe('withStartedAt (D-07)')`: sella el valor recibido, devuelve un objeto nuevo sin mutar el original, conserva `playerCount`/`difficulty`/`selection`/`counters`
- `app/pages/[game]/index.vue` — `useGameHistory().record`, `notifyHistorySaved`, `outcomeContextLine`, `finishGame()`, `onOutcomeRecorded()`, `onOutcomeDismiss()` sustituyen a `onEndGameConfirm()`/`onEndGameCancel()`; plantilla cablea `GameOutcomeDialog` en vez de `ConfirmDialog` para `awaitingEndConfirm`

## Decisions Made

Ninguna decisión nueva más allá de las ya cerradas en `09-CONTEXT.md`/`09-UI-SPEC.md`. Ver **key-decisions** arriba para el matiz de orden (D-U4/Pitfall 1) que el propio plan marcaba como "EXACTO, no cosmético".

## Deviations from Plan

None - plan ejecutado tal como estaba escrito. Los tres tasks se ejecutaron en el orden y con el contenido exacto que el plan especificaba, incluida la cita textual de D-07/D-08/D-10 en el comentario de `withStartedAt` y la nota de reconciliación de `onOutcomeDismiss`.

### Nota de proceso: criterio de aceptación mecánico no coincide literalmente

- **Encontrado durante:** verificación de criterios de aceptación de la Task 2.
- **Detalle:** el criterio dice `grep -c "notifyHistorySaved" ... devuelve 1`; el resultado real es `2` (una línea de `import`, una línea de uso dentro de `onOutcomeRecorded`). Mismo patrón ya documentado por los planes 09-01, 09-04 y 09-05: cualquier función importada por nombre y usada una sola vez produce como mínimo dos coincidencias de grep por su propio nombre. No es un bug de código — la funcionalidad es correcta y verificada por `npm test` (641 tests) y `npx nuxt build`.
- **No se modificó nada para forzar el conteo a 1.**

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El punto de enganche de toda la Fase 9 queda cerrado: toda partida nueva sella su instante de inicio, y las cuatro opciones del diálogo de resultado terminan la partida por el mismo camino de limpieza (`finishGame()`), tres de ellas registrando en el histórico y una sin hacerlo.
- `npm test` (26 test files, 641 tests) y `npx nuxt build` en verde tras las tres tareas.
- Ningún fichero de esta fase toca `engine/persistence.ts` ni `app/components/ConfirmDialog.vue` (verificado por `git diff --stat`, ambos vacíos).
- Listo para que el plan 09-08 (si aplica) construya sobre un histórico que ya recibe entradas reales desde la pantalla de juego.

## Self-Check

- FOUND: app/composables/useGameSession.ts
- FOUND: app/composables/__tests__/useGameSession.test.ts
- FOUND: app/pages/[game]/index.vue
- FOUND commit: c088919
- FOUND commit: 541a553
- FOUND commit: a7f1335

## Verification Against Plan

- `npx vitest run app/composables/__tests__/useGameSession.test.ts` termina con código 0: **21 tests, todos en verde.**
- `npm test` termina con código 0: **26 test files, 641 tests, todos en verde.**
- `npx nuxt build` termina con código 0: **confirmado, dos veces (tras Task 2 y tras Task 3).**
- `git diff --stat engine/persistence.ts` vacío: **confirmado.**
- `git diff --stat app/components/ConfirmDialog.vue` vacío: **confirmado.**
- `grep -rEi "firestore|firebase" app/pages/[game]/index.vue` no devuelve ninguna línea: **confirmado, vacío.**
- `grep -rln "startedAt" app/ --include=*.ts --include=*.vue | grep -v __tests__` devuelve únicamente `app/composables/useGameSession.ts`: **confirmado.**

## Known Stubs

Ninguno. Este plan cablea superficies ya construidas por los planes 09-02 y 09-05 (ambos sin stubs registrados); no introduce ningún componente ni ruta nueva.

## Threat Flags

Ninguno. Las cuatro mitigaciones del `<threat_model>` del plan están implementadas:
- T-09-21: el registro ocurre entre `silence()` y `finishGame()`, verificado leyendo el cuerpo de `onOutcomeRecorded` (orden: `silence()` → `record(...)` → `notifyHistorySaved(...)` → `finishGame()`).
- T-09-22: `notifyHistorySaved(guardado)` recibe exactamente el booleano devuelto por `record`, sin `|| true` ni valor por defecto.
- T-09-23: `finishGame()` solo llama a `clear(gameId)` (plan 09-04, no toca `tga:history`); `git diff --stat engine/persistence.ts` vacío confirma que la ruta de persistencia no se tocó.
- T-09-24: `atajosActivos`/`shortcutsEnabled` siguen consultando `awaitingEndConfirm`, la misma bandera que monta `GameOutcomeDialog` — verificado, no rediseñado.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-10*
