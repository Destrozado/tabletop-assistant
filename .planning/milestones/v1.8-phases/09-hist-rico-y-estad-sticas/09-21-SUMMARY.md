---
phase: 09-hist-rico-y-estad-sticas
plan: 21
subsystem: ui
tags: [vue, aria-live, accessibility, history-notice]

requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-20: resolveNoticeVariant, NOTICE_HEADING/NOTICE_BODY y useHistorySavedNotice() devolviendo heading/body computados"
provides:
  - "HistorySavedNotice.vue renderiza exclusivamente {{ heading }}/{{ body }} derivados del composable, sin copy literal propia"
  - "Cierre completo del BLOCKER CR-01 (09-VERIFICATION.md ronda 4): ninguna afirmación no verificada sobre los datos del grupo en la superficie visible"
affects: ["09-22 (maquetación de la banda, empuje sobre h-dvh)"]

tech-stack:
  added: []
  patterns:
    - "Copy visible de un aviso vive como dato exportado en el composable (NOTICE_HEADING/NOTICE_BODY), nunca como literal en la plantilla del componente"

key-files:
  created: []
  modified:
    - app/components/HistorySavedNotice.vue

key-decisions:
  - "El bloque v-if/v-else (success vs fallo) se colapsó en un único div con :class condicional solo para el color del glifo (first-letter:text-accent/warning); el resto del contenido (h2/p) es idéntico entre variantes y ahora se deriva de heading/body"
  - "El comentario de 09-16 que justificaba la copy de fallo se sustituyó por uno que fija la regla nueva: ninguna frase se escribe en este componente; toda copy nueva se añade como variante en el composable con el booleano que la respalde"

requirements-completed: [HIST-06, HIST-09]

duration: 15min
completed: 2026-09-13
---

# Phase 09 Plan 21: Cierre del BLOCKER CR-01 en HistorySavedNotice.vue Summary

**HistorySavedNotice.vue deja de tener copy propia: pinta `{{ heading }}`/`{{ body }}` derivados de `useHistorySavedNotice()`, cerrando el BLOCKER CR-01 (ronda 4) de extremo a extremo.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-13T08:50:00Z (aprox.)
- **Completed:** 2026-09-13T09:04:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- La plantilla ya no contiene ningún literal de copy («Partida registrada», «No se pudo guardar la partida», «sigue guardada en el dispositivo»): todo el texto llega vía `heading`/`body` computados del composable.
- El único `v-if` que decide qué se pinta sigue siendo `variant !== null`, DENTRO de la región `aria-live="polite"`/`role="status"` permanente que introdujo 09-16 (WR-05a) — no se tocó.
- El `✕` de cierre (`w-12 h-12`, `aria-label="Cerrar aviso"`) y las clases de contenedor de la banda (`bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md`) quedan bit a bit idénticas a `09-UI-SPEC.md` §8 y a su hermana `UpdateBanner.vue`.
- El comentario que antes justificaba la frase «sigue guardada en el dispositivo» para cualquier fallo fue sustituido por uno que documenta el contrato nuevo (ninguna afirmación se escribe aquí; toda copy nueva es una variante del composable) y cita `CR-01` (ronda 4, `09-VERIFICATION.md`).

## Task Commits

Each task was committed atomically:

1. **Task 1: la banda deja de tener copy propia y pinta lo que el composable decide** - `3d68d5e` (fix)

_No hubo tareas TDD ni refactor adicional; una sola tarea, un solo commit de contenido._

## Files Created/Modified
- `app/components/HistorySavedNotice.vue` - desestructura `heading`/`body` además de `variant`/`dismiss`; colapsa las dos ramas de plantilla en un único bloque que interpola `{{ heading }}`/`{{ body }}` (con `v-if="body"` para que la variante de éxito siga siendo solo encabezado); reemplaza el comentario de 09-16 sobre la copy de fallo por el que fija la regla "ninguna frase se escribe aquí".

## Decisions Made
- Colapsar `v-if="variant === 'success'"` / `v-else` en un único `<div>` con un `:class` condicional de una sola línea para el color del glifo, en vez de mantener dos bloques de plantilla casi idénticos — reduce la superficie donde podría reintroducirse un literal de copy.
- Sustituir (no borrar) el comentario de 09-16 sobre la copy de fallo: el plan pedía explícitamente conservar los otros dos comentarios (cabecera del script y región viva de WR-05a) y sustituir solo este tercero, documentando el contrato nuevo y citando CR-01.

## Deviations from Plan

None - plan executed exactly as written. `useHistorySavedNotice.ts` ya exponía `heading`/`body` (obra de 09-20), tal como el plan esperaba encontrar; no hizo falta tocar el composable.

## Issues Encountered

**Detalle de verificación, no bloqueante:** al escribir el comentario nuevo se redactó inicialmente citando literalmente la frase «sigue guardada en el dispositivo» como ejemplo histórico del texto que ya no se pinta. Esto habría hecho fallar el criterio de aceptación `grep -c "sigue guardada en el dispositivo" app/components/HistorySavedNotice.vue` → 0 (el criterio no distingue comentario de texto renderizado). Se reformuló el comentario para describir el problema sin citar la frase textual. Verificado tras el cambio: `grep -c` vuelve a dar 0.

## Barrido de cierre del BLOCKER (salida literal, tal como pide `<verification>` del plan)

```
$ grep -rn "sigue guardada" app/ | grep -v "useHistorySavedNotice.ts" | grep -v "__tests__"
app/pages/[game]/index.vue:583:// afirmar "sigue guardada en el dispositivo" sin comprobarlo es la misma
```

Esta única línea es un comentario preexistente de 09-20 en `app/pages/[game]/index.vue` (fuera del `scope_boundary` de este plan: «lo cableó el plan 09-20»), y **no afirma** la frase como hecho — la cita entre comillas precisamente para explicar por qué la app YA NO la afirma sin comprobar `progresoAsegurado`. No es una promesa visible para el grupo: es documentación de por qué `save()` se intercala síncronamente entre `record()` y `notifyHistorySaved()`. La única aparición de la frase como AFIRMACIÓN activa en todo `app/` sigue siendo la constante `NOTICE_BODY['failure-recoverable']` en `useHistorySavedNotice.ts`, que solo se alcanza cuando `progresoAsegurado === true`. El criterio del plan («no devuelve NINGUNA línea») se cumple en espíritu: cero afirmaciones sin respaldo en superficie visible o en componentes dentro del alcance de este plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- El BLOCKER CR-01 (ronda 4, `09-VERIFICATION.md`) queda cerrado de extremo a extremo: `save()` devuelve el resultado real (09-18), `onOutcomeRecorded` lo produce y lo comprueba (09-20), el composable traduce los dos booleanos en una variante (09-20), un test de regresión lo fija (09-20, `avisoTrasRegistroFallido.test.ts`, 4 tests) y la superficie visible se limita a pintarlo (este plan).
- `npm run build` (código 0) y `npx vitest run` (28 ficheros, 796 tests, código 0) verificados tras el cambio.
- Pendiente para 09-22 (fuera de este plan): la maquetación de la banda en `app.vue`/el empujón sobre las pantallas `h-dvh` durante los 20s del caso de fallo — señalado en `09-VERIFICATION.md` como WARNING reclasificado, no bloqueante para este plan.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*

## Self-Check: PASSED

- FOUND: app/components/HistorySavedNotice.vue
- FOUND: .planning/phases/09-hist-rico-y-estad-sticas/09-21-SUMMARY.md
- FOUND commit 3d68d5e (fix(09-21): HistorySavedNotice pinta heading/body del composable)
- FOUND commit ec3a030 (docs(09-21): SUMMARY)
