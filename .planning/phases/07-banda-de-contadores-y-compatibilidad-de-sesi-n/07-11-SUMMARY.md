---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 11
subsystem: testing
tags: [checkpoint, human-verify, counter-band, uat, requirements-ledger, ui-spec]

# Dependency graph
requires:
  - phase: 07-08
    provides: "solapamiento/hit-test de celdas cerrado (CR-01) con matriz medida de 5 viewports x 4 nº de jugadores, e.g. anchuras reales de flecha por viewport"
  - phase: 07-09
    provides: "playerCount manipulado ya no descarta vidas congeladas ni produce NaN (WR-05/WR-07)"
  - phase: 07-10
    provides: "separador de celda, limpieza de pulsado en 4 rutas, flechas fuera del recorrido de tabulación (WR-01/WR-02/WR-03/WR-04/WR-09)"
provides:
  - "Firma humana registrada, acotada a los tres viewports (1024x768, 412x915, 700x800 con 4 jugadores) que la aprobación original de 07-07 nunca cubrió"
  - "07-UI-SPEC.md sin la afirmación incondicional de 44px de ancho que el arreglo del plan 07-08 dejó falsa"
  - "REQUIREMENTS.md con la Fase 7 al día: casillas y trazabilidad reflejando la evidencia real, no un libro de cuentas no fiable"
affects: [verificación de cierre de la Fase 7]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-UI-SPEC.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "El veredicto humano se transcribe literal y se distingue explícitamente entre la aprobación libre («aprobado! Se ve muy bien la verdad, va a ser muy util», que no nombró ningún viewport) y la cobertura de los tres viewports, que se obtuvo por confirmación estructurada explícita, no por prosa espontánea — para no repetir el error de alcance de 07-07."
  - "El puerto real de nuxi preview en este proyecto es 3000 (sirve public/ con npx serve), no 4173 como dice el how-to-verify del plan; documentado aquí, no corregido en el plan."

patterns-established: []

requirements-completed: [HP-01, HP-03, HP-04, HP-05, HP-10, COMP-01, COMP-02]

# Metrics
duration: pending
completed: pending
---

# Phase 07 Plan 11: Cierre de los tres últimos huecos de 07-VERIFICATION.md Summary

**Firma humana acotada a los tres viewports que 07-07 nunca cubrió, `07-UI-SPEC.md` corregido para dejar de afirmar un suelo de 44px de ancho que el arreglo de 07-08 volvió falso, y `REQUIREMENTS.md` puesto al día con evidencia citada para la Fase 7**

## Task 1: Firma humana acotada en los viewports que la aprobación original nunca cubrió

**Estado:** APROBADO por el usuario. Registrado aquí de forma literal, tal y como exige el plan.

### Precondiciones automáticas verificadas antes de abrir el checkpoint

- `npm test` (vitest): **537/537 passed, 21 files** — verde sobre el merge de 07-08 + 07-09 + 07-10.
- `npm run e2e` (Playwright): **34/34 passed** — verde sobre el mismo merge. Incluye la matriz completa de solapamiento/hit-test de 07-08 (5 viewports x 4 nº de jugadores, `elementFromPoint`) y las 3 nuevas aserciones medidas de 07-10.
- `npm run generate`: verde.
- Build real servido para la comprobación humana. **Nota de corrección:** el `how-to-verify` del plan dice `http://localhost:4173`, pero el puerto real que usa `nuxi preview` en este proyecto es **`http://localhost:3000`** (ejecuta `npx serve public`). El plan queda con el dato equivocado; aquí se deja constancia del real.

La lista completa y sin abreviar de `<how-to-verify>` se presentó al usuario literalmente, con los tres viewports incluidos, sin resumir ni recortar ninguno.

### Veredicto humano (transcripción literal)

Aprobación en texto libre, tal cual la escribió el usuario:

> "aprobado! Se ve muy bien la verdad, va a ser muy util"

Como esa aprobación de texto libre no nombró ningún viewport, **no se dio por buena como cobertura de los tres viewports** — hacerlo habría repetido exactamente el defecto de alcance de 07-07 (aprobación de bloque heredada sin más). Se le pidió al usuario declarar el alcance explícitamente, y respondió con las siguientes confirmaciones estructuradas:

- **Viewports efectivamente comprobados con 4 jugadores:** 1024x768 (apaisado), 412x915 (móvil vertical), 700x800 (ventana estrecha) — **los tres confirmados**.
- **¿Flechas estrechas en 412x915, usables con el dedo?** — **"Sí, se aciertan bien"** (usando las palabras del usuario). Por tanto HP-10 queda firmado en ese ancho sin ninguna salvedad, y **no hay ninguna escalada de decisión de producto sobre D-05** (la alternativa prevista en el plan para el caso "no son usables" no aplica).

**Cobertura por punto pedida en `acceptance_criteria`** (separador visible, toque siempre sobre la celda correcta, ▲ de Jugador 4 dentro de pantalla, pulsado que se limpia, usabilidad de las flechas estrechas en 412x915): esta cobertura se atribuye a la **confirmación estructurada de los tres viewports** del usuario, no a frases sueltas que el usuario nunca pronunció por punto. No se inventa ninguna cita por viñeta que no se dijo literalmente — la única prosa libre del usuario es la aprobación citada arriba, y el resto de la cobertura procede de su respuesta explícita a la pregunta de alcance (los tres viewports) y a la pregunta de juicio sobre las flechas estrechas ("Sí, se aciertan bien").

### Salvedad honesta que se mantiene

Como en 07-07, esto sigue siendo un viewport **simulado**, no la tablet real de la mesa, cuyo modelo y sistema operativo siguen sin identificarse (`STATE.md` §Blockers). No se presenta como confirmación en el dispositivo objetivo.

### Acceptance criteria de la Task 1

- [x] El usuario confirma explícitamente los tres viewports (1024x768, 412x915, 700x800) con 4 jugadores — no solo el apaisado.
- [x] Veredicto registrado con sus palabras sobre: separador visible, toque siempre sobre la celda correcta, ▲ de Jugador 4 dentro de pantalla, pulsado que se limpia, y usabilidad de las flechas estrechas en 412x915 (vía confirmación de alcance + juicio explícito sobre las flechas).
- [x] N/A — el veredicto sobre las flechas estrechas fue positivo ("se aciertan bien"), así que no hay hallazgo que escalar como decisión de producto sobre D-05.
- [x] Ninguna casilla de `REQUIREMENTS.md` se marcó antes de esta aprobación (se marcan en la Task 3, después de este registro).

**Esta tarea no modifica ficheros de código** (`files: —` en el plan); su commit es este propio SUMMARY.md, junto con las Tasks 2 y 3 que dependen de su aprobación.
