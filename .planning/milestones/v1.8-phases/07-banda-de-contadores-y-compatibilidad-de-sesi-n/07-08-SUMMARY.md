---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 08
subsystem: ui
tags: [playwright, e2e, tailwind, flexbox, hit-testing, accessibility]

# Dependency graph
requires:
  - phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n (planes 07-05/07-06)
    provides: "CounterBand.vue con props/emits fijados, banda de altura 96px/192px ya medida"
provides:
  - "e2e/counter-band-overlap.spec.ts: matriz ejecutable de 5 viewports x 4 nº de jugadores que mide ajuste horizontal, contención, no-solapamiento por pares y hit-test (elementFromPoint) de la banda de contadores"
  - "CounterBand.vue sin celdas que puedan desbordar sobre su hermana: flechas encogibles (min-w-0), número con suelo de anchura responsivo, celda con overflow-hidden como garantía estructural"
affects: [07-09, 07-10, 07-11, verificación de cierre de la Fase 7]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regresión e2e parametrizada por (viewport, nº de jugadores) con una sola navegación por nº de jugadores y page.setViewportSize() para recorrer los viewports sin recargar — misma técnica con la que 07-VERIFICATION.md reprodujo el fallo"
    - "Prueba de impacto document.elementFromPoint(cx, cy) sobre el centro de cada botón para distinguir 'se ve mejor' de 'ya no roba el toque'"
    - "Celda flex que encoge (min-w-0) en vez de desbordar, con overflow-hidden en el contenedor como garantía estructural de última instancia"

key-files:
  created:
    - e2e/counter-band-overlap.spec.ts
  modified:
    - app/components/CounterBand.vue

key-decisions:
  - "Se descartó encoger el número (D-05 lo prohíbe), partir en más filas (D-05 fija dos) y el scroll horizontal (HP-01/D-08 lo rechazan); se eligió que la flecha encoja (min-w-11 -> min-w-0) porque ningún D- fija ese mínimo de 44px fuera del viewport apaisado objetivo, donde el arreglo no cambia nada (cada flecha sigue en ~70px)"
  - "overflow-hidden en la celda como garantía estructural de última instancia, no como arreglo principal: aunque un valor de 4+ cifras desbordase algún día, quedaría recortado dentro de su propia celda en vez de robarle el toque a la vecina"
  - "El número pasa de w-16 fijo a min-w-12 sm:min-w-16 (suelo de anchura, no techo): conserva 64px en apaisado (contrato visual de UI-SPEC intacto) y baja a 48px en estrecho, pero puede crecer más allá si una cifra de tres dígitos lo exige, sin recortarse nunca"
  - "Helpers de la nueva spec (getCounterBand, downButton/upButton, getCell, getCellValue, goToRoundLoopWithPlayers) duplicados por copia explícita de los otros dos ficheros .spec.ts de la banda, nunca importados — un .spec.ts de Playwright registra sus tests en cuanto se carga el módulo (convención ya fijada en 07-06-SUMMARY.md)"

patterns-established:
  - "Matriz viewport x nº de jugadores en Playwright: una sola navegación por nº de jugadores, después page.setViewportSize() sobre la misma page/sesión para recorrer los viewports sin recargar (evita 20 navegaciones completas)"

requirements-completed: [HP-03, HP-04, HP-10]

# Metrics
duration: 15min
completed: 2026-09-09
---

# Phase 07 Plan 08: Cierre del hueco CR-01 (solapamiento de celdas de la banda de contadores) Summary

**Flechas de la banda de contadores encogibles (`min-w-0`) en vez de con mínimo fijo de 44px, más `overflow-hidden` en la celda, cerrando el toque-en-vecino que `07-VERIFICATION.md` marcó como bloqueante (CR-01)**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2/2 completadas
- **Files modified:** 2 (1 creado, 1 modificado)

## Accomplishments

- Nueva spec e2e (`e2e/counter-band-overlap.spec.ts`) que reproduce mecánicamente el hueco CR-01 en una matriz de 5 viewports × 4 nº de jugadores (20 combinaciones), con la prueba decisiva `elementFromPoint` que distingue "se ve mejor" de "ya no roba el toque a la celda vecina"
- Arreglo de layout en `CounterBand.vue` (3 cambios de clase, sin tocar props/emits/estructura) que hace desaparecer el defecto en las 20 combinaciones sin degradar el objetivo táctil de 44px en el viewport apaisado objetivo
- Confirmado en dos direcciones: RED real contra el código sin modificar (Task 1) y GREEN real tras el arreglo (Task 2), no solo una descripción de lo que "debería" pasar

## Task Commits

Cada tarea se comprometió atómicamente:

1. **Task 1: Spec de regresión que reproduce el toque en el contador equivocado** - `baae1ce` (test)
2. **Task 2: Arreglar la celda para que no pueda desbordar sobre su hermana (GREEN)** - `d56801f` (fix)

_Nota: plan TDD de facto (RED explícito en Task 1, GREEN explícito en Task 2), aunque el frontmatter del plan no lleva `tdd="true"` por tarea — la secuencia RED->GREEN se siguió igualmente porque el propio `<objective>` del plan la exige._

## Registro RED (Task 1, contra `CounterBand.vue` SIN modificar)

`npm run e2e -- e2e/counter-band-overlap.spec.ts` → **3 failed, 4 passed** de 7 tests:

```
✓ nº de jugadores = 1: ... (2.5s)
✓ nº de jugadores = 2: ... (841ms)
✘ nº de jugadores = 3: ... (700ms)
✘ nº de jugadores = 4: ... (1.7s)
✘ ▲ de Jugador 1 sube solo Jugador 1; VILLANO y Jugador 2/3/4 quedan intactos (30.0s, timeout)
✓ ▲ de Jugador 4 (el botón que 07-VERIFICATION.md midió fuera del viewport) sube solo Jugador 4 (1.7s)
✓ cada botón ▼/▲ mide 44px de ancho o más (668ms)
```

Fallos concretos:

1. `nº de jugadores = 3`: **"la banda desborda horizontalmente (viewport 412x915, 3 jugadores)"** — `scrollWidth <= clientWidth` da `false`.
2. `nº de jugadores = 4`: mismo fallo, mismo viewport (`412x915`).
3. El test de extremo a extremo de 412x915/4 jugadores **hace timeout a los 30s**, con el log de Playwright reproduciendo textualmente el defecto:
   ```
   waiting for getByRole('button', { name: /^Subir vida de Jugador 1.../ })
   - locator resolved to <button ... aria-label="Subir vida de Jugador 1">
   - <button ... aria-label="Bajar vida de Jugador 2"> ... subtree intercepts pointer events
   ```
   Es decir: Playwright localiza correctamente el botón "Subir vida de Jugador 1" pero **no puede pulsarlo** porque el botón "Bajar vida de Jugador 2" se pinta encima y le roba el toque — la reproducción exacta y mecánica de CR-01, no una descripción de oídas.

Este registro confirma que la spec nueva reproduce el hueco (no solo lo describe) antes de tocar el componente.

## Mediciones GREEN (Task 2, tras el arreglo)

- `npm run e2e -- e2e/counter-band-overlap.spec.ts` → **7/7 passed** (14.3s), las 20 combinaciones de la matriz en verde.
- `npm run e2e` completo → **31/31 passed** (37.4s): los 24 tests preexistentes siguen verdes + los 7 nuevos.
- `npm run test` (Vitest) → **514/514 passed** (1.27s) — este plan no tocó `engine/` ni composables, tal y como preveía el plan.
- `npm run generate` → build en verde (6 rutas prerenderizadas, PWA precache de 64 entradas, sin errores).

## Files Created/Modified

- `e2e/counter-band-overlap.spec.ts` (creado) - Matriz de 5 viewports × 4 nº de jugadores midiendo ajuste horizontal (`scrollWidth`/`clientWidth`), contención de cada botón dentro de la banda, no-solapamiento por pares (`getBoundingClientRect`), hit-test (`elementFromPoint`), altura/tipografía intactas (D-01/D-05/D-06), comportamiento de extremo a extremo en 412x915/4 jugadores (Jugador 1 y Jugador 4), y objetivo táctil ≥44px en el viewport apaisado objetivo
- `app/components/CounterBand.vue` (modificado) - `overflow-hidden` en el envoltorio de celda; `min-w-11` → `min-w-0` en ambos botones ▼/▲; `w-16` → `min-w-12 sm:min-w-16` + `tabular-nums` en el `span` del número; comentario explicativo en el `<template>` citando CR-01

## Decisions Made

Ver `key-decisions` en el frontmatter — resumen: se optó por encoger la flecha (mínimo no fijado por ninguna decisión bloqueada, D-02 solo protege el alto de 96px, no el ancho de 44px fuera del viewport apaisado) en vez de las tres alternativas descartadas explícitamente por el propio plan (encoger el número, partir en más filas, scroll horizontal), con `overflow-hidden` como red de seguridad estructural adicional.

## Deviations from Plan

None - plan executed exactly as written. Los tres cambios de clase, el comentario y la secuencia RED→GREEN coinciden exactamente con lo especificado en `07-08-PLAN.md`.

## Issues Encountered

None. El único punto de atención operativo (matar un `nuxi preview` vivo en el puerto 4173 antes de re-ejecutar Playwright, para no medir el build antiguo) se verificó como innecesario en este entorno: no había ningún proceso previo en el puerto 4173.

## Known Stubs

None. No se introdujo ningún dato vacío, texto de relleno ni componente sin fuente de datos.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CR-01 queda cerrado con prueba de regresión ejecutable: HP-03, HP-04 y HP-10 dejan de estar bloqueados por este defecto específico (la verificación de fase deberá re-confirmarlo formalmente, no solo este plan).
- Los planes 07-09/07-10/07-11 (cierre de otros huecos de `07-VERIFICATION.md`, si aplican WR-02/WR-03/WR-05) no dependen de este plan y pueden ejecutarse en cualquier orden respecto a él.
- Pendiente, fuera de alcance de este plan (no mencionado en `07-VERIFICATION.md` como bloqueante de CR-01): re-ejecutar el checkpoint de verificación humana en 412×915 como confirmación visual, tal y como recomienda `07-VERIFICATION.md` §Human Verification Required — no es un nuevo hallazgo exploratorio, solo la confirmación visual de un defecto ya cerrado por automatización.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-09*

## Self-Check: PASSED

All created/modified files verified present on disk; all three task/plan commits (baae1ce, d56801f, 8c18f48) verified present in git log.
