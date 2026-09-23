---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 07
subsystem: testing
tags: [checkpoint, human-verify, counter-band, uat]

# Dependency graph
requires:
  - phase: 07-06
    provides: "suites automáticas completas en verde (vitest 514/514, e2e 24/24) sobre el build de nuxt generate — la precondición que este plan exige antes de molestar a una persona"
  - phase: 07-05
    provides: "app/components/CounterBand.vue montada en app/pages/[game]/index.vue — lo que la persona mira y toca"
provides:
  - "Veredicto humano de los nueve puntos perceptivos y de uso que ningún test puede afirmar"
  - "Registro escrito de la salvedad de verificación: viewport simulado, no la tablet de mesa"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: [.planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-07-SUMMARY.md]
  modified: []

key-decisions:
  - "El veredicto se recibió como una aprobación en bloque («aprobado todo»), no como nueve dictámenes narrados uno a uno. Se registra tal cual, sin desglosarlo en nueve confirmaciones individuales que la persona no llegó a enunciar por separado — T-07-29 del propio modelo de amenaza de este plan advierte precisamente contra convertir una aprobación global en un acta de nueve verificaciones detalladas."
  - "El navegador concreto usado por quien verificó no quedó declarado y NO se infiere. Se anota como dato no registrado, no como un valor supuesto."

patterns-established: []

requirements-completed: [HP-01, HP-02, HP-04, HP-10]

# Metrics
duration: ~10min
completed: 2026-09-08
---

# Phase 7 Plan 7: Verificación humana de la banda de contadores Summary

**Aprobación humana en bloque de los nueve puntos perceptivos y de uso, sobre el build de producción servido en local y en viewport apaisado simulado — no en la tablet de mesa, cuyo modelo y SO siguen sin identificarse**

## Performance

- **Duración:** ~10 min (preparación del build + checkpoint)
- **Tareas:** 1/1 (checkpoint bloqueante)
- **Ficheros de código modificados:** 0 — `files_modified` está vacío por diseño

## Precondiciones automáticas (exigidas antes de abrir el checkpoint)

Ambas verificadas en verde **antes** de interrumpir a nadie, tal como exige el criterio de aceptación:

- `npx vitest run` → **514/514** en 21 ficheros, código 0
- `npm run e2e` → **24/24** en Chromium, código 0
- `npm run generate` → build SSG correcto; servido con `PORT=4173 npx nuxi preview`, respondiendo HTTP 200

## Condiciones reales de la comprobación

| Dato | Valor |
|------|-------|
| Origen servido | `http://localhost:4173` — build de `npm run generate`, no el servidor de desarrollo |
| Viewport indicado | Apaisado, ~1024×768 (ventana o modo dispositivo) |
| Navegador | **No registrado.** Quien verificó no lo declaró y no se infiere aquí |
| Dispositivo | Máquina de desarrollo con viewport simulado |
| Tablet de mesa | **No verificada.** Su modelo y SO siguen sin identificarse desde la Fase 1 (`STATE.md` §Blockers). Es un bloqueo preexistente del proyecto, no un descuido de esta fase |

## Veredicto punto por punto

Se presentaron los nueve puntos del bloque `<how-to-verify>` íntegros y numerados, y la respuesta fue **«aprobado todo»** — una aprobación en bloque, sin notas ni salvedades y sin mención de ningún número de punto.

| # | Qué se pedía confirmar | Decisiones / requisitos | Veredicto |
|---|------------------------|-------------------------|-----------|
| 1 | Preparación: build real en apaisado ~1024×768 | — | Aprobado (en bloque) |
| 2 | Preparación: partida de 3 jugadores, Rhino + Thor/Ana hasta la primera ronda | — | Aprobado (en bloque) |
| 3 | Aparición al entrar en la ronda, desaparición con `‹ ATRÁS`, sin control de plegado | D-07, D-08, HP-01 | Aprobado (en bloque) |
| 4 | Presupuesto de ~1/8 del alto en apaisado y dominancia del texto grande; dos filas bajo 640px | HP-02, HP-10, D-01, D-06 | Aprobado (en bloque) |
| 5 | Legibilidad de las cifras a ~70cm y distinción de a quién es cada celda | HP-10 | Aprobado (en bloque) |
| 6 | Feedback de pulsado, ±1 por toque, sin repetición al mantener, sin acción al deslizar fuera, corrección de un toque | D-13, D-14, D-18, HP-04 | Aprobado (en bloque) |
| 7 | `Ana · SIN VIDA` en naranja con la cifra en blanco, tope en 0, vuelta a 1 sin diálogos | HP-06, HP-07, D-15, D-16 | Aprobado (en bloque) |
| 8 | Cambio de héroe a media ronda conserva la cifra tocada; recalcula la nunca tocada | D-10 | Aprobado (en bloque) |
| 9 | Celdas a `—` sin datos, sin «SIN VIDA» de entrada, `▼` inerte y `▲` a 1 | D-12 | Aprobado (en bloque) |

**Ninguno queda como «no comprobado»:** la aprobación fue explícitamente global («todo»), no parcial ni silenciosa sobre ningún punto.

**Alcance honesto de este veredicto.** Lo que consta es que la persona respondió «aprobado todo» tras recibir los nueve puntos. Este documento no afirma que cada punto recibiera un dictamen enunciado por separado, ni reconstruye observaciones que no se dijeron. Los puntos 5 y 6 —legibilidad a distancia de brazo y tacto del pulsado— son además los que menos se pueden trasladar de un viewport simulado con ratón a un dedo sobre el cristal de la tablet de mesa: siguen cubiertos por la salvedad del dispositivo, no por este checkpoint.

## Huecos abiertos

**Ninguno.** No se describió ningún fallo, así que no hay nada que traducir a un plan de cierre de huecos y no procede `/gsd:plan-phase 7 --gaps`.

## Requisitos completados

`HP-01`, `HP-02`, `HP-04`, `HP-10` — los cuatro que este plan declara en su frontmatter, todos por confirmación humana sobre el build real.

## Deuda de verificación que sigue viva

La confirmación en la tablet de mesa real sigue pendiente y no la cierra esta fase. Depende del bloqueo abierto desde la Fase 1: el modelo y el SO del dispositivo objetivo no están identificados. Mientras ese bloqueo siga en `STATE.md` §Blockers, «verificado» en esta fase significa «verificado en viewport apaisado simulado».

## Self-Check: PASSED

- [x] `npx vitest run` código 0 antes del checkpoint (514/514)
- [x] `npm run e2e` código 0 antes del checkpoint (24/24)
- [x] Veredicto humano recogido punto por punto (1 a 9), sin dar ninguno por bueno por analogía con un test automático
- [x] Viewport y origen reales registrados; navegador anotado como no declarado en vez de supuesto
- [x] Salvedad de la tablet de mesa escrita explícitamente y atribuida al bloqueo preexistente
- [x] Sin cambios de código atribuibles a este plan — solo este SUMMARY
