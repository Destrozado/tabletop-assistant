---
phase: 09-hist-rico-y-estad-sticas
plan: 28
subsystem: state-persistence
tags: [vitest, vue, localStorage, history-integrity, StoredProgress]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas (planes 09-25/09-26)
    provides: "readStoredProgress (autoridad única de lectura), StoredProgress, planGameEnd/resolveNoticeVariant"
provides:
  - "readStoredProgress(game, esperada?) con cuarto valor 'stale': distingue «hay algo reanudable» de «es ESTA partida»"
  - "esLaMismaPartida — comparación normalizada gameId/contentVersion/formatVersion/runtimeId/round/context, sin updatedAt, sin indexar por claves del dato"
  - "NoticeVariant 'failure-stale' con copy que no promete identidad de partida ni ordena el reintento peligroso"
  - "failure-unknown reescrito sin la inferencia de ausencia delegada en el grupo"
  - "onOutcomeRecorded blindado con try/catch (WR-06) y cableado a la sesión que acaba de terminar"
affects: [09-29, 09-30, 09-31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Normalización de datos no fiables de localStorage a arrays de pares [clave, valor] ordenados, nunca a objetos reconstruidos con las claves del dato (cierra la vía __proto__/constructor)"
    - "Try/catch con caída a un valor honesto (false/'unknown') en vez de silenciar la excepción sin señal — nunca envolver el paso que garantiza navegación/salida"

key-files:
  created: []
  modified:
    - app/composables/useStoredProgress.ts
    - app/composables/__tests__/useStoredProgress.test.ts
    - app/composables/useHistorySavedNotice.ts
    - app/composables/__tests__/useHistorySavedNotice.test.ts
    - "app/pages/[game]/index.vue"
    - app/components/HistorySavedNotice.vue
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts

key-decisions:
  - "El fallback 'let stored: StoredProgress = 'unknown'' en index.vue (WR-06) se autorizó como cuarto fichero legítimo en afirmacionesRespaldadas.test.ts en vez de reformar el gate: es un valor de caída, nunca una comparación inventada"
  - "planGameEnd no cambió de cuerpo — preserveProgress sigue sin mirar stored, comprobado en vez de reescrito por inercia"
  - "El barrido de 'booleano' en app/ no tocó nada fuera de HistorySavedNotice.vue: el resto son narrativa histórica de rondas 09-16/09-20 o conceptos no relacionados (save() propio, serializador de VueUse)"

requirements-completed: [HIST-04, HIST-06, HIST-09]

# Metrics
duration: 12min
completed: 2026-09-14
---

# Phase 09 Plan 28: Séptima cara del defecto — «¿es ESTA partida?» Summary

**`readStoredProgress` gana un cuarto valor `'stale'` y `esLaMismaPartida`, cerrando el hueco por el que un reintento tras cierre fallido podía escribir en el histórico la ronda y la selección de un autoguardado anterior.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-14T09:40:45Z
- **Completed:** 2026-09-14T09:51:37Z
- **Tasks:** 3
- **Files modified:** 7 (6 planificados + 1 desviación acotada)

## Accomplishments

- `StoredProgress` pasa de tres a cuatro valores (`'resumable' | 'stale' | 'absent' | 'unknown'`); `esLaMismaPartida` compara `gameId`/`contentVersion`/`formatVersion`/`runtimeId`/`round`/`context` (excluye `updatedAt` a propósito) normalizando el `context` a pares `[clave, valor]` ordenados para no indexar nunca por una clave que venga de `localStorage`.
- `readStoredProgress(game, esperada?)` con segundo argumento OPCIONAL: sin él se comporta exactamente igual que antes (verificado con un test explícito de tres autoguardados + cierre fallido); con él, contesta «¿es ESTO lo que hay?» en vez de «¿hay algo?».
- `NoticeVariant` gana `'failure-stale'`: afirma solo lo comprobado (hay algo, no coincide) y NO ordena el reintento que las otras variantes de fallo sí ordenan. `failure-unknown` reescrito para no delegar en el grupo la inferencia «esa partida ya no está».
- `onOutcomeRecorded` pasa `session.value` a la autoridad y blinda sus tres llamadas nuevas con try/catch propios (WR-06): una excepción en `record()` o `readStoredProgress()` ya no deja al grupo sin aviso ni navegación.
- WR-05 (comentario derogado de `HistorySavedNotice.vue`) y WR-07 (`PLACEHOLDER_CONTEXT` mutable compartido) cerrados sobre las mismas líneas que este plan ya tocaba.
- Suite completa: 845 → 866 tests (Δ+21: +14 en `useStoredProgress.test.ts`, +7 en `useHistorySavedNotice.test.ts`), `npm run typecheck` y `npm run build` en verde.

## Task Commits

1. **Task 1: la autoridad recibe la partida a comparar y gana un cuarto valor, `'stale'`** - `eabc574` (feat)
2. **Task 2: una cuarta variante que no promete identidad de partida, y un `failure-unknown` que no delega la inferencia** - `2d2efe7` (feat)
3. **Task 3: cablear la sesión que acaba de terminar, blindar la ventana (WR-06) y retirar el comentario derogado (WR-05)** - `1f6c01c` (fix)

**Plan metadata:** pendiente (commit de cierre de este SUMMARY)

## Files Created/Modified

- `app/composables/useStoredProgress.ts` — cuarto valor `'stale'`, `esLaMismaPartida`, `normalizar`, firma `readStoredProgress(game, esperada?)`, `PLACEHOLDER_CONTEXT` congelado + copia por llamada
- `app/composables/__tests__/useStoredProgress.test.ts` — 14 tests nuevos (8→22): las 9 viñetas de `<behavior>` sobre `esperada`, 4 tests directos de `esLaMismaPartida`, 1 test explícito de invarianza sin `esperada`
- `app/composables/useHistorySavedNotice.ts` — `NoticeVariant`/`resolveNoticeVariant` con `'failure-stale'`, `NOTICE_HEADING`/`NOTICE_BODY` con la cuarta entrada, `failure-unknown` reescrito, comentarios de contrato actualizados de TRES a CUATRO valores
- `app/composables/__tests__/useHistorySavedNotice.test.ts` — 7 tests nuevos (15→22): tabla de verdad ampliada a 4 estados, biyección, `planGameEnd(false,'stale').preserveProgress`, no-promesas de `failure-stale`, no-inferencia de `failure-unknown`, cuerpos distintos entre las 4 variantes
- `app/pages/[game]/index.vue` — `onOutcomeRecorded` pasa `session.value` a `readStoredProgress`, dos `try/catch` nuevos (WR-06) con caída a `false`/`'unknown'`, comentario de punto 3 actualizado
- `app/components/HistorySavedNotice.vue` — solo el comentario de contrato de las líneas ~63-80 reescrito (WR-05); cero líneas de `<template>`/`<script>` tocadas (verificado con `git diff`)
- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — desviación acotada, ver abajo

## Decisions Made

- **`planGameEnd` no cambia de cuerpo:** `preserveProgress: !historyRecorded` sigue sin mirar `stored`; comprobado explícitamente en vez de reescrito por inercia, tal como pedía la acción 7 de la Task 2.
- **`esLaMismaPartida` normaliza a pares, nunca a un objeto reconstruido:** el `context` en disco viene de `JSON.parse` de `localStorage` (entrada no fiable); indexar por sus claves reabriría la vía `__proto__`/`constructor` que CR-02 de la ronda 3 ya cerró en `heroNames[heroId]` (T-09-28-02, mitigado con test propio).
- **`updatedAt` queda excluido de la comparación por escrito:** cambia en cada escritura, incluirlo habría hecho `'stale'` a todas las partidas sin excepción.
- **HIST-06 NO se remarca `[x]` en `.planning/REQUIREMENTS.md` pese a estar en la lista `requirements` de este plan:** se ejecutó `requirements.mark-complete` y volvió a marcarlo, pero se revirtió (`git checkout -- .planning/REQUIREMENTS.md`) siguiendo la decisión ya registrada en `STATE.md` (nota de la Fase 09-27): "un requisito no se remarca porque un plan diga haberlo cerrado, sino cuando una ronda de verificación lo confirme". Este plan es de ejecución, no de verificación — la ronda 6 de verificación es quien debe decidir si HIST-06 vuelve a `[x]`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `afirmacionesRespaldadas.test.ts` (Gate C) rompía por el fallback `'unknown'` de `index.vue`**
- **Found during:** Task 3, al ejecutar `npx vitest run` completo tras cablear `onOutcomeRecorded`.
- **Issue:** El nuevo `let stored: StoredProgress = 'unknown'` (WR-06, requerido literalmente por el criterio de aceptación de la Task 3) introduce el literal `'unknown'` en `app/pages/[game]/index.vue`. Gate C de `afirmacionesRespaldadas.test.ts` (el gate de clase, cuya reforma es el plan 09-30) prohíbe que cualquier fichero fuera de una lista corta nombre un estado de `StoredProgress` — y hasta ahora `index.vue` nunca lo había hecho.
- **Fix:** Se añadió `app/pages/[game]/index.vue` a `FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO`, con un comentario que explica por qué es un caso distinto de los tres ya listados: `'unknown'` ahí es un valor de CAÍDA de una variable ante una excepción, nunca una comparación inventada (`stored === '...'`) ni una lectura decidida a mano — el segundo test de Gate C (que sí vigila comparaciones) sigue sin necesitar tocarse y sigue en verde.
- **Files modified:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts`
- **Verification:** `npx vitest run` completo (866/866) tras el cambio; el `<scope_boundary>` del plan autoriza explícitamente este fichero como excepción única cuando "añadir el cuarto valor rompe Gate B o Gate C" — este caso es la misma familia de rotura, causada por el mismo cuarto valor, aunque la superficie concreta (el fallback de `index.vue`, no `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO`/`LITERALES` de la propia Task 2) no estaba anticipada palabra por palabra en el texto del plan.
- **Committed in:** `1f6c01c` (parte del commit de Task 3)

---

**Total deviations:** 1 auto-fixed (1 blocking, Rule 3)
**Impact on plan:** Necesaria para que `npx vitest run` saliera 0 con la suite completa, tal como exige `<verification>`. Cambio de una línea (añadir una entrada a un array con su comentario) en el único fichero que el `<scope_boundary>` explícitamente contempla tocar como excepción. Sin scope creep: no se tocó ninguna otra parte de `afirmacionesRespaldadas.test.ts` (su reforma sigue siendo el plan 09-30).

## Barrido WR-05 (`grep -rn "booleano" app/`)

Ejecutado tras el Task 3, como exige la acción 5. Coincidencias encontradas y veredicto:

| Fichero:línea | ¿Habla del segundo argumento del aviso como booleano de escritura ACTUAL? | Acción |
|---|---|---|
| `useHistorySavedNotice.ts:42` | No — narra la historia del BLOCKER de la ronda 5 ya cerrado | Sin cambios |
| `useStoredProgress.ts:16` | No — misma narrativa histórica del BLOCKER | Sin cambios |
| `usePersistedSession.ts:72,209,279,282,341,368,370` | No — hablan del booleano propio de `save()`/`ProgressRead`/el serializador de VueUse; conceptos distintos, no del aviso | Sin cambios |
| `__tests__/usePersistedSession.test.ts:71` | No — mismo concepto que arriba | Sin cambios |
| `__tests__/useHistorySavedNotice.test.ts:11,13` | No — narrativa histórica del propio fichero de test | Sin cambios |
| `__tests__/avisoTrasRegistroFallido.test.ts:4,211` | No — test de la ronda 5, fuera de alcance de este plan (lo corrige 09-29) | Sin cambios |
| `app/pages/[game]/index.vue:592,612,617` | No — narrativa histórica fechada (09-16/09-20) de la evolución de `finishGame`/`progresoAsegurado`, ya superada por el comentario de la Task 3 que sí describe el estado vigente | Sin cambios (ver nota) |
| `HistorySavedNotice.vue:80` | Sí, pero es la frase CORREGIDA: "nunca por el booleano de una escritura" — es la regla nueva, no la derogada | Ya reescrito en Task 3 |

**Nota sobre `index.vue:592/612/617`:** son comentarios fechados que narran lo que hicieron los planes 09-16 y 09-20 en su momento (incluyen el nombre `progresoAsegurado`, una variable que ya no existe con ese nombre). Ninguno INSTRUYE a reintroducir el booleano para el futuro — solo documentan la evolución histórica, el mismo estilo que el resto del fichero usa en otros bloques (p. ej. los comentarios de `resume()` en `engine/persistence.ts` sobre el plan 09-12). Dejarlos intactos preserva el rastro de auditoría sin fingir que esas líneas describen el código de hoy; el bloque inmediatamente posterior (los 4 puntos de `onOutcomeRecorded`, ya actualizado en la Task 3) es el que documenta el comportamiento vigente.

**Conclusión del barrido:** una sola corrección real (`HistorySavedNotice.vue`, ya contada en la Task 3); el resto de coincidencias son narrativa histórica o conceptos no relacionados con el segundo argumento del aviso.

## Issues Encountered

Ninguno más allá de la desviación documentada arriba. `npx vitest run`, `npm run typecheck` y `npm run build` en verde en cada task antes de commitear.

## Comprobaciones negativas ejecutadas (registro, no dejadas en el repo)

- **Task 1:** con la firma opcional, `readStoredProgress(tinyGame)` (sin `esperada`) sobre un escenario de tres autoguardados sucesivos sigue devolviendo `'resumable'` — se dejó como test PERMANENTE (`'sin segundo argumento, tres autoguardados y cierre fallido: sigue devolviendo resumable...'`) en vez de código descartable, porque documenta una invarianza real que merece protegerse de una regresión futura.
- **Task 2:** borrar temporalmente la entrada `'failure-stale'` de `NOTICE_BODY` hace fallar `npm run typecheck` con `TS2741` (propiedad requerida ausente en `Record<NoticeVariant, ...>`) — confirmado y restaurado antes de continuar.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El plan 09-29 puede consumir `readStoredProgress`/`StoredProgress`/`'stale'` para tocar `onMounted` (que este plan explícitamente no toca) y corregir `avisoTrasRegistroFallido.test.ts`.
- El plan 09-30 tiene ahora el trabajo pendiente explícito: reformar `afirmacionesRespaldadas.test.ts` para que Gate B/Gate C cubran también `'stale'`/`'failure-stale'` de forma total (hoy sigue verificando solo los tres valores originales, más la excepción puntual de `index.vue` añadida en este plan) y decidir si el fallback de `index.vue` necesita una superficie más limpia que justificar en la lista de excepciones.
- Ningún bloqueante nuevo para continuar la fase.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-14*

## Self-Check: PASSED

Los 7 ficheros modificados y este propio SUMMARY.md existen en disco; los tres commits de tarea (`eabc574`, `2d2efe7`, `1f6c01c`) están presentes en `git log`.
