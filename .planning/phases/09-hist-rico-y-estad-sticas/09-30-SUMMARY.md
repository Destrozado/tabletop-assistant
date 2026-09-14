---
phase: 09-hist-rico-y-estad-sticas
plan: 30
subsystem: testing
tags: [vitest, vue, gate-de-clase, static-analysis, StoredProgress, NoticeVariant]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas (planes 09-28/09-29)
    provides: "readStoredProgress con el cuarto valor 'stale', esLaMismaPartida, 'failure-stale' en NOTICE_BODY, planProgressMount, y las dos entradas TODO(09-30) en FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO que este plan resuelve"
provides:
  - "regionVigilada(sfc): barrido del fichero COMPLETO menos comentarios y <style>, sustituyendo el extraerTemplate que solo veía el 1,9% de index.vue (Gap #2, CR-03 de 09-REVIEW.md)"
  - "Gate A ampliado a app/**/*.ts (además de .vue), con AFIRMACIONES_AUDITADAS: mapa ruta -> frases permitidas con motivo escrito, sustituyendo la lista plana FICHEROS_CON_AFIRMACION_AUDITADA"
  - "Gate B cubre las cuatro variantes de NoticeVariant (incluida failure-stale) sobre los cuatro valores de StoredProgress"
  - "Gate C: literal 'stale' vigilado, WR-03 (literales de NoticeVariant fuera de useHistorySavedNotice.ts) e IN-05 (normalización de comillas) cerrados"
  - "Gate S: auto-verificación del propio gate con 7 tests sobre SFC sintéticos"
  - "endGameBody honesto en las cuatro salidas de GameOutcomeDialog (IN-03/WR-04, defecto abierto desde la ronda 4)"
affects: [09-31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Región vigilada = fichero completo menos comentarios/<style>, nunca un delimitador de bloque (<template>) que un slot anidado puede romper en silencio"
    - "Excepciones de gate de clase auditadas POR FRASE (mapa ruta -> frases[]), no por fichero completo — auditar un fichero no exime frases futuras"
    - "Normalización de comillas antes de comparar literales de código en un test estático, para cerrar la evasión por comillas dobles/backticks"

key-files:
  created: []
  modified:
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts
    - "app/pages/[game]/index.vue"

key-decisions:
  - "Gate B se extiende a los CUATRO valores de StoredProgress/NoticeVariant (TODOS_LOS_ESTADOS_DEL_DISPOSITIVO y VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD), no solo a los tres originales: consecuencia directa y necesaria de hacer la comparación insensible a mayúsculas (WR-04), que hace que el cuerpo de 'failure-stale' entre en el barrido de NOTICE_BODY. No estaba en la letra de la Task 3 pero sí en el 'trabajo pendiente explícito' que los SUMMARY de 09-28 y 09-29 asignan a este plan."
  - "El nuevo test WR-03 (literales de NoticeVariant) aplica quitarComentarios antes de comparar, a diferencia de los dos tests originales de Gate C: medido en vivo, useStoredProgress.ts narra en comentarios históricos el razonamiento de rondas anteriores citando 'failure-recoverable' entre comillas sin invocar nunca notifyHistorySaved a mano — vigilar comentarios habría puesto el gate rojo por narrativa, no por código."
  - "HIST-06/HIST-09 no se remarcan [x] en REQUIREMENTS.md: siguiendo la decisión ya registrada en STATE.md (nota de la Fase 09-27), un requisito se marca cuando una ronda de VERIFICACIÓN lo confirma, no cuando un plan de ejecución dice haberlo cerrado."

requirements-completed: []

# Metrics
duration: 35min
completed: 2026-09-14
---

# Phase 09 Plan 30: El gate de clase pasa a barrer el fichero entero y se autocomprueba — Summary

**`regionVigilada` sustituye el `extraerTemplate` que solo veía el 1,9% de `index.vue` (Gap #2 de la ronda 6): el gate ahora barre `.vue` y `.ts` completos, audita excepciones por frase con motivo escrito, y `endGameBody` deja de prometer un borrado que no siempre ocurre.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-14T12:11:00Z
- **Completed:** 2026-09-14T12:23:30Z
- **Tasks:** 3
- **Files modified:** 2 (exactamente los del `scope_boundary`)

## Accomplishments

- `extraerTemplate`/`quitarComentariosHtml` (cuantificador perezoso, cortaba en el PRIMER `</template>` — el `<template #fallback>` de `ClientOnly`) se sustituyen por `quitarComentarios`/`regionVigilada`, que barren el fichero completo menos comentarios HTML/JS y bloques `<style>`. **Medición obligatoria:** `regionVigilada(index.vue)` = **16.936 caracteres** frente a **485** de la captura vieja (extraída con la regex perezosa, sin comentarios) — **34,9x**, muy por encima del umbral de 10x exigido.
- Nuevo `describe` **Gate S** (7 tests): SFC sintéticos demuestran que una frase colocada DESPUÉS de un `<template>` anidado entra en la región vigilada (con la aserción de contraste explícita de que la regex vieja NO la capturaba), que comentarios HTML/JS/`<style>` NO entran, que `<script setup>` SÍ entra, y dos aserciones de cobertura real: `regionVigilada(index.vue)` contiene `'GameOutcomeDialog'` y `'endGameBody'`.
- Gate A amplía el barrido a `app/**/*.ts` (antes solo `.vue`), y sustituye la lista plana `FICHEROS_CON_AFIRMACION_AUDITADA` por `AFIRMACIONES_AUDITADAS: Record<string, string[]>` — auditar un fichero ya no exime cualquier frase futura, solo las frases explícitamente listadas para ese fichero (T-09-30-06).
- `FRASES_SOBRE_LOS_DATOS_DEL_GRUPO` gana las cinco de WR-04 (`'se borrará'`, `'progreso guardado'`, `'partida guardada'`, `'ya no está'`, `'no encontraréis'`), con comparación insensible a mayúsculas.
- **Demostrado por inyección real** (ver detalle abajo): la frase `Vuestra partida sigue guardada en el dispositivo` puesta dentro del bloque `<ResumePrompt>` y, por separado, como constante dentro de `<script setup>`, ponen Gate A en ROJO nombrando `app/pages/[game]/index.vue` y las frases exactas — ambas inyecciones revertidas, `git diff --stat` limpio tras revertir.
- `endGameBody` (IN-03/WR-04, defecto vivo desde la ronda 4) reescrito para ser cierto en las cuatro salidas de `<GameOutcomeDialog>` — ver tabla de veracidad más abajo. Se retira «Esta acción no se puede deshacer», que convertía la descripción en una promesa absoluta y además es falsa para el histórico (reversible desde `/historico`, HIST-08).
- Gate C: `'stale'` añadido a `LITERALES`; nuevo test **WR-03** vigila los cuatro literales de `NoticeVariant` fuera de `useHistorySavedNotice.ts`; **IN-05** normaliza comillas dobles/backtick antes de comparar en los tres tests, cerrando la evasión por comillas.
- Suite completa: 877 → 899 tests (Δ+22: +7 Gate S en la Task 1, +14 por el barrido ampliado de Gate A a `.ts` y +1 test WR-03 en la Task 3), `npm run typecheck` y `npm run build` en verde en las tres tasks.

## Task Commits

1. **Task 1: la región vigilada pasa a ser el fichero entero menos comentarios y `<style>`, y el gate se autocomprueba** - `a25e18d` (feat)
2. **Task 2: `endGameBody` deja de afirmar un borrado que no siempre ocurre** - `10ed585` (fix)
3. **Task 3: vocabulario ampliado, excepciones auditadas por frase con motivo, y Gate C sin vías de evasión** - `0cc1ddb` (feat)

**Plan metadata:** pendiente (commit de cierre de este SUMMARY)

## Files Created/Modified

- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — `quitarComentarios`/`regionVigilada`, Gate A ampliado a `.ts` con `AFIRMACIONES_AUDITADAS`, Gate B con los cuatro valores/variantes, Gate C con `'stale'`/WR-03/IN-05, describe Gate S nuevo, cabecera reescrita (4 gates)
- `app/pages/[game]/index.vue` — `endGameBody` reescrito con comentario de veracidad rama por rama; `discardBody` sin cambios (verificado, no reescrito)

## Decisions Made

- **Gate B extendido a los cuatro valores/variantes**, no solo los tres originales: necesario porque la comparación insensible a mayúsculas exigida por WR-04 hace que el cuerpo de `NOTICE_BODY['failure-stale']` (que contiene «En el dispositivo») entre en el barrido de Gate B; sin extender `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO`/`VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD` a cuatro, el primer test de Gate B se habría puesto rojo y el segundo (biyección) habría quedado inconsistente con el primero. Documentado como consecuencia directa de un cambio de esta misma Task 3, no como scope creep: 09-28 y 09-29 ya habían anotado explícitamente en sus SUMMARY que «el plan 09-30 tiene el trabajo pendiente de reformar Gate B/Gate C para cubrir también 'stale'/'failure-stale' de forma total».
- **WR-03 aplica `quitarComentarios` antes de comparar**, a diferencia de los dos tests preexistentes de Gate C: medido en vivo (ver «Hallazgos de la medición» abajo), sin este paso `useStoredProgress.ts` habría puesto el test en rojo por un comentario histórico que cita `'failure-recoverable'` entre comillas sin invocar `notifyHistorySaved` a mano. Vigilar comentarios habría sido vigilar narrativa, no código.
- **`discardBody` no se toca**: verificado que `onDiscardConfirm` llama a `clear(gameId)` de forma incondicional, así que su frase es cierta tal cual estaba. Entra en `AFIRMACIONES_AUDITADAS['app/pages/[game]/index.vue']` junto con `endGameBody`.
- **HIST-06/HIST-09 no se remarcan `[x]`** en `.planning/REQUIREMENTS.md`: siguiendo la decisión ya registrada en `STATE.md` (nota de la Fase 09-27, repetida en 09-28/09-29), un requisito se marca completo cuando una ronda de VERIFICACIÓN lo confirma, no cuando un plan de ejecución dice haberlo cerrado. Este plan es de ejecución (cierre de gaps de verificación), no de verificación.

## Medición del punto 1 de la Task 3 (obligatoria, antes de escribir ninguna excepción)

Con el alcance ampliado a `.vue`+`.ts`, el vocabulario ampliado con las cinco de WR-04, y comparación insensible a mayúsculas — con la lista de excepciones todavía vacía — estos son EXACTAMENTE los ficheros y frases que se pusieron rojos:

```
app/components/ContentChangedNotice.vue -> [ 'partida guardada' ]
app/components/ResumePrompt.vue -> [ 'progreso guardado', 'partida guardada' ]
app/composables/useHistorySavedNotice.ts -> [
  'en el dispositivo',
  'sigue guardada',
  'nada que reintentar',
  'no se ha perdido',
  'no encontraréis'
]
app/composables/useProgressMountPlan.ts -> [ 'partida guardada' ]
app/pages/[game]/index.vue -> [ 'se borrará', 'progreso guardado' ]
```

Coincide EXACTAMENTE con la lista prevista por WR-04/el texto del plan — **ningún fichero ni frase apareció fuera de lo anticipado**, así que no hay ningún hallazgo nuevo que registrar en `deferred-items.md`. Cada entrada se auditó en `AFIRMACIONES_AUDITADAS` con su motivo escrito (ver el fichero, sección de constantes).

## Demostración obligatoria de inyección (Task 3)

**Inyección 1 — dentro del bloque `<ResumePrompt>`:**
```
Error: app/pages/[game]/index.vue afirma sobre los datos guardados del grupo
(en el dispositivo, sigue guardada) sin pasar por la autoridad y sin estar en
AFIRMACIONES_AUDITADAS con su motivo escrito. [...]
```
Gate A se puso ROJO, nombrando el fichero exacto y las dos frases exactas. Revertido inmediatamente después (`git diff --stat` limpio).

**Inyección 2 — constante dentro de `<script setup>`** (`const INYECCION_TEMPORAL_09_30 = 'Vuestra partida sigue guardada en el dispositivo'`):
```
Error: app/pages/[game]/index.vue afirma sobre los datos guardados del grupo
(en el dispositivo, sigue guardada) sin pasar por la autoridad y sin estar en
AFIRMACIONES_AUDITADAS con su motivo escrito. [...]
```
Mismo resultado: Gate A se puso ROJO también dentro de `<script setup>`. Revertido inmediatamente después.

Tras revertir ambas inyecciones, `git diff --stat 5d39d125d7448fc68a265514c176b07b98435a62..HEAD` muestra exclusivamente los dos ficheros del `scope_boundary`:
```
 .../__tests__/afirmacionesRespaldadas.test.ts      | 198 ++++++++++++++++++---
 app/pages/[game]/index.vue                         |  23 ++-
 2 files changed, 194 insertions(+), 27 deletions(-)
```

## Tabla de veracidad de `endGameBody` (Task 2)

| Salida del diálogo | Camino | `preserveProgress` | Frase que lo cubre |
|---|---|---|---|
| «Salir sin registrar» | `onOutcomeDismiss` → `finishGame()` sin argumento | `false` | «se borrará…y volveréis a la pantalla de inicio» — cierta |
| Registro con éxito | `planGameEnd(true, stored).preserveProgress` = `!true` = `false` | `false` | «se borrará…y volveréis a la pantalla de inicio» — cierta |
| Registro fallido (cualquiera de los 4 estados del dispositivo) | `planGameEnd(false, stored).preserveProgress` = `!false` = `true` | `true` | «Si el registro en el histórico falla, la app conservará el progreso para que podáis reintentarlo» — la frase que faltaba |

Texto final:
> El progreso guardado de esta partida (`${savedSummary.value}`) se borrará y volveréis a la pantalla de inicio. Si el registro en el histórico falla, la app conservará el progreso para que podáis reintentarlo.

`grep -c "Esta acción no se puede deshacer"` pasa de 2 (discardBody + endGameBody) a **1** (solo discardBody, verificado cierto porque `onDiscardConfirm` llama a `clear()` sin condición).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gate B se rompía tras hacer la comparación de frases insensible a mayúsculas, por no cubrir los cuatro valores de StoredProgress/NoticeVariant**
- **Found during:** Task 3, al implementar la comparación `toLowerCase()` exigida por WR-04 y ejecutar la suite completa.
- **Issue:** `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO` y `VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD` seguían con los tres valores/variantes originales desde el plan 09-26, sin `'stale'`/`'failure-stale'` (añadidos por el plan 09-28). Con la comparación case-sensitive anterior, el cuerpo de `NOTICE_BODY['failure-stale']` («…**E**n el dispositivo solo queda…») no coincidía con la frase vigilada `'en el dispositivo'` (minúscula) por la mayúscula inicial, así que el hueco quedaba oculto por casualidad. Al hacer la comparación insensible a mayúsculas (acción explícita de esta misma Task 3), la coincidencia aparece y el primer test de Gate B lanza porque `'failure-stale'` no está en la lista respaldada.
- **Fix:** se añadió `'stale'` a `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO` y `'failure-stale'` a `VARIANTES_RESPALDADAS_POR_LA_AUTORIDAD`, y se actualizaron los comentarios y los textos de los tres tests de Gate B para hablar de «cuatro» en vez de «tres».
- **Files modified:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts`
- **Verification:** `npx vitest run` completo (899/899) tras el cambio; `npm run typecheck` y `npm run build` en verde.
- **Committed in:** `0cc1ddb` (parte del commit de Task 3)

**2. [Rule 1 - Bug] El nuevo test WR-03 (literales de NoticeVariant) se rompía por comentarios narrativos de `useStoredProgress.ts`**
- **Found during:** Task 3, al ejecutar el gate ampliado con el nuevo test WR-03 recién escrito.
- **Issue:** `useStoredProgress.ts` documenta en comentarios (líneas ~15 y ~47) el razonamiento histórico de rondas anteriores, citando literalmente `'failure-recoverable'`/`'failure-unrecoverable'` entre comillas simples como parte de la narrativa — sin invocar nunca `notifyHistorySaved` a mano. El test WR-03, tal como se escribió inicialmente (sin filtrar comentarios, igual que los dos tests preexistentes de Gate C), se ponía en rojo señalando ese fichero.
- **Fix:** se aplicó `quitarComentarios` (ya existente desde la Task 1) al contenido antes de comparar en el test WR-03 específicamente, con un comentario explicando por qué este test SÍ filtra comentarios y los dos anteriores de Gate C no lo necesitan (ninguno de los otros dos literales aparece en comentarios fuera de los ficheros ya permitidos).
- **Files modified:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts`
- **Verification:** `npx vitest run` completo (899/899) tras el cambio.
- **Committed in:** `0cc1ddb` (parte del commit de Task 3)

---

**Total deviations:** 2 auto-fixed (2 bugs, Rule 1)
**Impact on plan:** Ambas son consecuencias mecánicas necesarias de cambios que la propia Task 3 exige (comparación insensible a mayúsculas; nuevo test WR-03) — sin ellas la suite no habría salido en verde, tal como exige `<verification>`. Ninguna toca ficheros fuera del `scope_boundary`; ambas están dentro del único fichero que la Task 3 modifica.

## Issues Encountered

Ninguno más allá de las dos desviaciones documentadas arriba. `npx vitest run`, `npm run typecheck` y `npm run build` en verde tras cada task, antes de commitear.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Para el plan 09-31 (fuera del alcance de este plan, `scope_boundary`):**
- El texto de `endGameBody` ha cambiado (ver tabla de veracidad arriba); la fila «Outcome dialog retained warning (D-02, unchanged text, only relocated)» del «Copywriting Contract» de `09-UI-SPEC.md` queda desactualizada y necesita reflejar el nuevo texto.
- La regla «excluido por acción futura» del §1 de `09-AUDIT-AFIRMACIONES-UI.md` —la que dejó pasar `endGameBody` como pendiente en vez de exigir su arreglo inmediato— necesita revisión, ya que ese "futuro" es este mismo plan.
- `ResumePrompt.vue` y `ContentChangedNotice.vue` ya estaban auditados como RESPALDADA en `09-AUDIT-AFIRMACIONES-UI.md` §2; las entradas nuevas de `AFIRMACIONES_AUDITADAS` en el gate (este plan) son coherentes con esos motivos, no los contradicen.
- Ningún hallazgo nuevo que registrar en `deferred-items.md`: la medición del punto 1 de la Task 3 coincidió exactamente con lo previsto por WR-04.
- Ningún bloqueante nuevo para continuar la fase.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-14*

## Self-Check: PASSED

Los dos ficheros modificados (`app/composables/__tests__/afirmacionesRespaldadas.test.ts`,
`app/pages/[game]/index.vue`) y este propio SUMMARY.md existen en disco; los tres commits de
tarea (`a25e18d`, `10ed585`, `0cc1ddb`) están presentes en `git log`.
