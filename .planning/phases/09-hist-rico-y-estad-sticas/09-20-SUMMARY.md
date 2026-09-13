---
phase: 09-hist-rico-y-estad-sticas
plan: 20
subsystem: ui
tags: [vue, vitest, localStorage, aviso, history]

requires:
  - phase: 09-18
    provides: "save(session): boolean — usePersistedSession.ts devuelve el resultado real de writeRaw() en vez de descartarlo"
provides:
  - "resolveNoticeVariant(historyRecorded, progressSecured): NoticeVariant — función pura, tabla de verdad de tres estados"
  - "NoticeVariant = 'success' | 'failure-recoverable' | 'failure-unrecoverable', con NOTICE_HEADING/NOTICE_BODY exportados como datos comprobables"
  - "notifyHistorySaved(historyRecorded, progressSecured) con firma de dos argumentos"
  - "onOutcomeRecorded asegura el progreso síncronamente (save()) cuando record() falla, y pasa el resultado real a notifyHistorySaved"
  - "test de regresión CR-01 ronda 4: con localStorage caído en toda la partida, el aviso nunca promete que la partida sigue guardada"
affects: [09-21]

tech-stack:
  added: []
  patterns:
    - "Copy de aviso como dato exportado (NOTICE_HEADING/NOTICE_BODY), comprobable por test puro — mismo precedente que emptyTitle/emptyBody de useGameHistory.ts"
    - "Decisión de qué decirle al grupo como función pura de dos booleanos de retorno reales, nunca de una inferencia sobre 'no borré'"

key-files:
  created:
    - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
  modified:
    - app/composables/useHistorySavedNotice.ts
    - app/composables/__tests__/useHistorySavedNotice.test.ts
    - app/pages/[game]/index.vue

key-decisions:
  - "Se implementaron las DOS variantes de fallo (recoverable/unrecoverable) en vez de la corrección mínima de retirar la frase — ver <objective> del plan: retirarla también en el caso recuperable (histórico anterior ilegible) escondería que el reintento SÍ funciona"
  - "save() se intercala SÍNCRONAMENTE entre record() y notifyHistorySaved() dentro de onOutcomeRecorded, nunca delegado al watchDebounced de 300ms — finishGame pone session.value=null inmediatamente después y cancelaría cualquier escritura pendiente"
  - "El test de regresión usa save()/appendHistoryEntry() directamente, no record() — record() necesita useCharacterCatalogue (contexto de Nuxt); save()/appendHistoryEntry() son las funciones reales que el flujo de autoguardado y de registro invocan sin ese contexto"

requirements-completed: [HIST-06, HIST-09]

duration: ~25min
completed: 2026-09-13
---

# Phase 09 Plan 20: Cierre del BLOCKER CR-01 (ronda 4) — el aviso ya no promete lo que no ha comprobado Summary

**La decisión de qué le dice la app al grupo sobre su partida pasó de basarse en "no borré el progreso" a basarse en dos booleanos de retorno reales (`record()` y el nuevo `save(): boolean` del plan 09-18), con tres variantes de aviso — éxito, fallo recuperable, fallo no recuperable — cuya copy es un dato exportado y comprobable por test, más el test de regresión exigido por el verificador.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-13
- **Tasks:** 3
- **Files modified:** 3 (1 creado, 3 modificados — `useHistorySavedNotice.ts` y su test cuentan una vez cada uno en la lista de arriba)

## Accomplishments
- `useHistorySavedNotice.ts` gana un tercer estado (`failure-unrecoverable`) y una función pura `resolveNoticeVariant` que es la ÚNICA que decide la variante — su copy vive en `NOTICE_HEADING`/`NOTICE_BODY`, exportada como dato en vez de suelta en el `.vue`.
- `onOutcomeRecorded` (`app/pages/[game]/index.vue`) reescribe el progreso síncronamente con `save(session.value)` cuando el registro del histórico falla, y usa ESE resultado (`progresoAsegurado`) — no una inferencia sobre "no borré" — para decidir qué variante de aviso mostrar. El orden D-U4 (`silence() → record() → save() → notifyHistorySaved() → finishGame()`) se conserva literalmente, verificado por posición de línea, no por afirmación.
- Nuevo test de regresión (`avisoTrasRegistroFallido.test.ts`) que cruza a propósito `usePersistedSession` y `useHistorySavedNotice`: con un `localStorage` que lanza en TODAS las llamadas de la partida, el cuerpo del aviso resultante nunca contiene "sigue guardada" ni "Partida terminada" — y un cuarto test de contraste confirma que la promesa SÍ reaparece cuando el progreso se escribe con normalidad.
- Demostración manual de que el test de regresión detecta la regresión real: se revirtió temporalmente `NOTICE_BODY['failure-unrecoverable']` a la copy optimista y el Test 3 se puso en rojo (`AssertionError: expected '...sigue guardada...' not to contain 'sigue guardada'`); se deshizo el cambio y se confirmó el verde de nuevo (4/4 tests, `git diff` vacío tras revertir).

## Task Commits

Each task was committed atomically:

1. **Task 1: tres variantes de aviso, con la copy como dato exportado y comprobable** - `9f80cf1` (feat)
2. **Task 2: `onOutcomeRecorded` asegura el progreso y comprueba el resultado antes de avisar** - `e679d7f` (fix)
3. **Task 3: el test de regresión que el verificador exige** - `49f25dc` (test)

**Plan metadata:** (worktree mode — commit final de SUMMARY.md pendiente, ver nota de cierre)

## Files Created/Modified
- `app/composables/useHistorySavedNotice.ts` - `NoticeVariant` de tres estados, `resolveNoticeVariant` pura, `NOTICE_HEADING`/`NOTICE_BODY` exportados, `notifyHistorySaved` con firma de dos argumentos, `heading`/`body` añadidos a `useHistorySavedNotice()`
- `app/composables/__tests__/useHistorySavedNotice.test.ts` - 7 tests existentes migrados a la firma nueva + `describe` nuevo de 5 tests para `resolveNoticeVariant`/`NOTICE_BODY` (12 tests en total)
- `app/pages/[game]/index.vue` - `onOutcomeRecorded` reescribe el progreso síncronamente y pasa `progresoAsegurado` a `notifyHistorySaved`
- `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` (nuevo) - 4 tests de regresión de la cadena completa `save()`+`appendHistoryEntry()`+aviso bajo un `localStorage` que lanza siempre

## Decisions Made
- Se implementaron las dos variantes de fallo, no la corrección mínima de retirar la frase — el gap ofrecía ambas opciones y esta elección conserva la información verdadera de que el reintento SÍ funciona cuando el progreso queda escrito (p. ej. histórico anterior ilegible).
- `save()` se llama dentro de `onOutcomeRecorded`, no se delega al `watchDebounced` de 300ms del autoguardado — ese debounce quedaría cancelado por `finishGame` antes de disparar.
- El test de regresión usa `save()`/`appendHistoryEntry()` en vez de `record()`, documentado en un comentario del propio test: `record()` necesita `useCharacterCatalogue` (contexto de Nuxt) que un test en el proyecto `node`/`app-logic` no tiene, y además `save()`/`appendHistoryEntry()` son las funciones reales que la app invoca durante el autoguardado y el registro.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Fresh worktree sin `.nuxt/`: `npx vitest run` y `npm run build` fallaban con `Tsconfig not found` hasta ejecutar `npx nuxt prepare` — arreglo de entorno documentado en las instrucciones de ejecución, no una desviación del plan.

## Scope note — el gap NO queda cerrado del todo con este plan

Tal como exige la sección `<verification>` del plan: `app/components/HistorySavedNotice.vue` **todavía pinta su texto antiguo** ("sigue guardada en el dispositivo…") para AMBAS variantes de fallo — su `v-else` no distingue `failure-recoverable` de `failure-unrecoverable`, así que hoy mismo, en el estado no recuperable, la interfaz seguiría mostrando visualmente la promesa que la lógica de este plan ya no hace. El componente sigue compilando sin tocarlo porque `useHistorySavedNotice()` conserva `variant`/`dismiss` con la misma forma. **El cierre real de CR-01 (ronda 4) requiere el plan 09-21**, que reescribe `HistorySavedNotice.vue` para usar `heading`/`body` (ya expuestos por este plan) y pintar las tres variantes de forma distinta.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El contrato que el plan 09-21 consume ya existe y está verificado: `NoticeVariant`, `resolveNoticeVariant`, `notifyHistorySaved(historyRecorded, progressSecured)`, `NOTICE_HEADING`/`NOTICE_BODY`, y `heading`/`body` en `useHistorySavedNotice()`.
- Bloqueante para dar la fase por cerrada: 09-21 debe ejecutarse antes de que el BLOCKER CR-01 (ronda 4) se pueda marcar como cerrado de verdad — la interfaz visible todavía no refleja las tres variantes.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*
