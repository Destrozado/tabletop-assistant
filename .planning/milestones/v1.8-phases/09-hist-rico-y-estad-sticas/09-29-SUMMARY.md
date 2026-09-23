---
phase: 09-hist-rico-y-estad-sticas
plan: 29
subsystem: ui-state
tags: [vitest, vue, onMounted, StoredProgress, gate-de-clase]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas (plan 09-28)
    provides: "readStoredProgress(game, esperada?) con el cuarto valor 'stale', esLaMismaPartida, failure-stale en useHistorySavedNotice"
provides:
  - "planProgressMount(stored, outcome): decisión de montaje pura y total sobre los cuatro valores de StoredProgress, con guarda `never` exhaustiva"
  - "UNVERIFIED_PROGRESS_NOTICE: copy exportada del aviso de lectura fallida en el mini-setup"
  - "onMounted (app/pages/[game]/index.vue) consumiendo informe.stored vía planProgressMount, ya no colapsando 'absent'/'unknown' sobre informe.outcome"
  - "MiniSetupScreen con la prop unverifiedProgressNotice, renderizada como <p role=status> tras el <h1>"
  - "avisoTrasRegistroFallido.test.ts: test 5 exige 'failure-stale' en vez de fijar el defecto de la ronda 6, más dos tests de contraste (sin esperada / con esperada = misma sesión)"
affects: [09-30, 09-31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decisión de montaje como función pura y total con guarda `const _exhaustivo: never = stored` en el default del switch, mismo patrón que planGameEnd/resolveNoticeVariant"
    - "Excepción documentada y provisional en el gate de clase (FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO) con marca TODO(09-30) cuando un fichero nuevo traduce StoredProgress a una decisión sin inventarlo"

key-files:
  created:
    - app/composables/useProgressMountPlan.ts
    - app/composables/__tests__/useProgressMountPlan.test.ts
  modified:
    - "app/pages/[game]/index.vue"
    - app/components/MiniSetupScreen.vue
    - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts

key-decisions:
  - "planProgressMount trata 'stale' como inalcanzable en la práctica (onMounted llama a readStoredProgress sin esperada) pero la rama existe igual, porque la función tiene que ser total sobre los cuatro valores del tipo, no solo sobre los que se producen hoy"
  - "La excepción del gate de clase para useProgressMountPlan.ts se documenta con TODO(09-30) en vez de reformar el gate, tal como exige el <scope_boundary> del plan"

requirements-completed: [HIST-06, HIST-09]

# Metrics
duration: 8min
completed: 2026-09-14
---

# Phase 09 Plan 29: El montaje deja de presentar el mini-setup como si hubiera comprobado el dispositivo — Summary

**`planProgressMount` sustituye la comparación `informe.outcome === 'fresh'` de `onMounted`: ahora el mini-setup distingue en pantalla «no hay nada» de «no he podido comprobarlo», y el test que fijaba en verde el defecto de la ronda 6 exige `failure-stale`.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-09-14T09:58:00Z
- **Completed:** 2026-09-14T10:05:16Z
- **Tasks:** 3
- **Files modified:** 6 (5 planificados + 1 desviación acotada, autorizada por `<scope_boundary>`)

## Accomplishments

- `planProgressMount(stored, outcome)` es una función pura y total sobre los cuatro valores de `StoredProgress`, con guarda `const _exhaustivo: never = stored` en el `default` del `switch` — un quinto valor futuro hace fallar `npm run typecheck`, no una rama `else` silenciosa. Confirmado en vivo: añadir temporalmente un quinto literal a `StoredProgress` produjo `error TS2322: Type '"quinto-valor-temporal"' is not assignable to type 'never'` señalando la línea exacta del `default`; revertido y `npm run typecheck` vuelve a 0.
- `'absent'` y `'unknown'` producen resultados DISTINTOS: `{ action: 'mini-setup', unverifiedNotice: null }` frente a `{ action: 'mini-setup', unverifiedNotice: UNVERIFIED_PROGRESS_NOTICE }` — el hueco exacto de CR-02/Gap #1 de la ronda 6, con aserción explícita en el test.
- `onMounted` ya no compara `informe.outcome === 'fresh'` (0 coincidencias verificado por grep); la única lectura de `outcome` que queda es el argumento que se le pasa a `planProgressMount`.
- `MiniSetupScreen.vue` enseña el aviso de lectura fallida como un `<p role="status">` inmediatamente debajo del `<h1>`, con la copy interpolada desde la prop — ni una palabra escrita en la plantilla (`grep -c "No hemos podido comprobar"` da 0 en los dos `.vue`/`.vue` de la página).
- El test 5 de `avisoTrasRegistroFallido.test.ts` —el propio test de regresión de la ronda 5 que la ronda 6 encontró fijando el defecto en verde— exige ahora `informe.stored === 'stale'` y `variant === 'failure-stale'`, con comprobación negativa ejecutada en vivo (quitar `esperada` lo pone en rojo, restaurado después). Dos tests nuevos protegen la invarianza sin `esperada` y el contraste con `esperada` = la misma sesión guardada.
- Suite completa: 875 → 877 tests (Δ+9 en `useProgressMountPlan.test.ts` menos 0 netos en `avisoTrasRegistroFallido.test.ts` porque el test 5 se reescribió en vez de duplicarse, más los 2 nuevos: 875 → 877), `npm run typecheck` y `npm run build` en verde.

## Task Commits

1. **Task 1: la decisión de montaje deja de ser cuatro líneas en `onMounted` y pasa a ser una función pura y total** - `086e6f3` (feat)
2. **Task 2: cablear el montaje y enseñarle al grupo, en el mini-setup, que la lectura falló** - `64d9c21` (feat)
3. **Task 3: retirar el test que fija el defecto en verde y sembrar el que lo caza** - `30f05ac` (fix)

**Plan metadata:** pendiente (commit de cierre de este SUMMARY)

## Files Created/Modified

- `app/composables/useProgressMountPlan.ts` — `MountAction`, `ProgressMountPlan`, `UNVERIFIED_PROGRESS_NOTICE`, `planProgressMount(stored, outcome)` con guarda `never`
- `app/composables/__tests__/useProgressMountPlan.test.ts` — 9 tests: las 6 viñetas de `<behavior>`, la aserción de distinción `'absent'`/`'unknown'`, un test de totalidad recorriendo los 4×3 combinaciones, y las tres frases prohibidas ausentes de la copy
- `app/pages/[game]/index.vue` — `onMounted` reescrito para consumir `planProgressMount(informe.stored, informe.outcome)`, nuevo ref `avisoProgresoNoComprobado`, comentario del bloque reescrito citando CR-02/WR-02/Gap #1; plantilla con `:unverified-progress-notice="avisoProgresoNoComprobado"` en `<MiniSetupScreen>`
- `app/components/MiniSetupScreen.vue` — prop opcional `unverifiedProgressNotice?: string | null`, `<p role="status">` tras el `<h1>`, sin copy escrita en la plantilla
- `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` — test 5 reescrito (`'stale'`/`'failure-stale'`), dos tests nuevos (invarianza sin `esperada`, contraste con `esperada` = misma sesión), cabecera del fichero ampliada con el párrafo de la ronda 6 sin borrar el de la ronda 5
- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — desviación acotada, ver abajo

## Decisions Made

- **`'stale'` se trata como rama viva, no como código muerto, dentro de `planProgressMount`:** `onMounted` llama a `readStoredProgress` sin `esperada` (no hay sesión con la que comparar al montar), así que `'stale'` es inalcanzable en la práctica desde este punto de entrada — pero la función existe para ser total sobre el TIPO `StoredProgress`, no solo sobre los valores que un llamante concreto produce hoy. Quitar la rama habría hecho la función parcial otra vez, y un futuro llamante con `esperada` la habría heredado sin darse cuenta.
- **La excepción del gate de clase se documenta, no se retoca:** siguiendo el `<scope_boundary>` explícito del plan, `useProgressMountPlan.ts` se añadió a `FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO` con un comentario y `TODO(09-30)` en vez de reformar `afirmacionesRespaldadas.test.ts` — la reforma del gate para cubrir `'stale'` de forma total es explícitamente el trabajo del plan 09-30.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Gate C de `afirmacionesRespaldadas.test.ts` rompía por el `switch (stored)` de `useProgressMountPlan.ts`**
- **Found during:** Task 2, al ejecutar `npx vitest run` completo tras cablear el montaje.
- **Issue:** Los dos tests de Gate C (`app/composables/__tests__/afirmacionesRespaldadas.test.ts`) recorren todo `.ts`/`.vue` fuera de `__tests__/` buscando los literales `'resumable'`/`'absent'`/`'unknown'` o el patrón `stored === '...'`, y solo lo permiten en cuatro ficheros ya autorizados. `useProgressMountPlan.ts` (creado en la Task 1 de este mismo plan) nombra los cuatro valores de `StoredProgress` en su `switch` y en sus comentarios — el mismo papel que `useHistorySavedNotice.ts` ya tiene en la lista (traducir el estado del dispositivo a una decisión), pero el gate no lo conocía todavía.
- **Fix:** Se añadió `app/composables/useProgressMountPlan.ts` a `FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO`, con un comentario que explica el paralelismo con `useHistorySavedNotice.ts` y una marca `TODO(09-30)` explícita: la entrada definitiva de auditoría (con el razonamiento completo, igual que las otras cuatro) la escribe el plan 09-30, que es quien reforma este gate para cubrir también `'stale'`/`'failure-stale'` de forma total. Tal como exige el `<scope_boundary>` de este plan, el gate en sí NO se ha tocado más allá de esa entrada — ni su lógica, ni sus otros comentarios.
- **Files modified:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts`
- **Verification:** `npx vitest run` completo (877/877) tras el cambio.
- **Committed in:** `64d9c21` (parte del commit de Task 2)

---

**Total deviations:** 1 auto-fixed (1 blocking, Rule 3)
**Impact on plan:** Necesaria para que `npx vitest run` saliera 0 con la suite completa, tal como exige `<verification>`. Cambio de una entrada (con su comentario) en el único fichero que el `<scope_boundary>` explícitamente contempla como excepción cuando la copy/código nuevo pone el gate en rojo. Sin scope creep: la lógica del gate no se tocó; su reforma sigue siendo el plan 09-30.

## Issues Encountered

**Precisión de una aserción de `<verification>` del plan, no un bloqueo:** el plan pide que `grep -rn "informe.outcome" app/` devuelva exactamente una coincidencia en todo el árbol `app/`. La aserción por-fichero de la Task 2 (`grep -c "informe.outcome" "app/pages/[game]/index.vue"` = 1) se cumple, pero el grep sin acotar a ese fichero también encuentra: el comentario de cabecera de `useProgressMountPlan.ts` (que narra por qué existía el colapso), un comentario del test nuevo de `useProgressMountPlan.test.ts`, y la aserción `expect(informe.outcome).toBe('resumed')` del test 5 de `avisoTrasRegistroFallido.test.ts` — esta última YA EXISTÍA antes de este plan (verificado con `git log` sobre ese fichero) y prueba algo legítimo y sin relación con el colapso `absent`/`unknown` que este plan cierra: que `ResumePrompt` seguirá ofreciendo "Continuar". Ninguna de las tres coincidencias adicionales es la comparación `informe.outcome === 'fresh'` que el plan quiere erradicar (esa sí da 0, verificado por separado). Se documenta aquí en vez de silenciarse: la redacción de esa línea de `<verification>` es más estricta de lo que el propio texto del plan necesita (compara con la aserción de Task 2, que sí está acotada al fichero correcto).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El plan 09-30 tiene el trabajo pendiente explícito de reformar `afirmacionesRespaldadas.test.ts` (Gate B/Gate C) para cubrir `'stale'`/`'failure-stale'` de forma total y sustituir la entrada `TODO(09-30)` de `useProgressMountPlan.ts` por su versión definitiva.
- El plan 09-31 sigue teniendo pendiente, como riesgo evaluado (no como olvido), decidir si se corta o condiciona el autoguardado cuando la lectura ha fallado — explícitamente FUERA del alcance de este plan (`<scope_boundary>`, T-09-29-02 del threat register).
- Ningún bloqueante nuevo para continuar la fase.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-14*

## Self-Check: PASSED

Los seis ficheros modificados/creados y este propio SUMMARY.md existen en disco; los tres commits de tarea (`086e6f3`, `64d9c21`, `30f05ac`) están presentes en `git log`.
