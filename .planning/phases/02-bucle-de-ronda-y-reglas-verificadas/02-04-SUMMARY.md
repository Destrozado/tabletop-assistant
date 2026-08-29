---
phase: 02-bucle-de-ronda-y-reglas-verificadas
plan: 04
subsystem: content
tags: [zod, vitest, marvel-champions, rules-fidelity, content-review]

# Dependency graph
requires:
  - phase: 02-01
    provides: sección `ronda` en content/marvel-champions.json con 10 pasos, avisos y citas
  - phase: 02-02
    provides: motor de bucle de ronda (avanzar/retroceder, cabecera relativa, índice reordenado)
  - phase: 02-03
    provides: modal de aviso clicable (`WarningDetailModal.vue`) reutilizado por `warningDetail`
provides:
  - Dossier de revisión humana `02-CONTENT-REVIEW.md` con veredicto literal del usuario, evidencia de que CONT-09/D-36 se cumplió con revisión humana real (Parte A contra el reglamento + Parte B jugada en la app)
  - 5 correcciones objetivas de citas y omisiones aplicadas y comprobadas contra el Rules Reference v1.7 (Tarea 1)
  - Registro explícito de dos correcciones pendientes (C1, C2) sobre `ronda.jugadores.01`, diferidas a un plan futuro por requerir capacidad de esquema/UI nueva
affects: [02-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dossier de revisión humana versionado en el repo como evidencia de gate (T-02-09, no repudiation)"
    - "Correcciones de contenido con veredicto ambiguo o que exceden el esquema actual se registran como PENDIENTES en el dossier, nunca se fuerzan dentro de presupuestos de campo existentes"

key-files:
  created: []
  modified:
    - .planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTENT-REVIEW.md

key-decisions:
  - "CONT-09/D-36 satisfecho en proceso: la revisión humana ocurrió, cubrió Parte A (reglamento) y Parte B (partida jugada), y el veredicto quedó versionado literal en el dossier"
  - "El contenido de ronda.jugadores.01 NO se da por definitivo: el veredicto trae dos correcciones (C1, C2) que exigen un campo options[] nuevo en el esquema, ausente hoy. Se difieren a plan 02-05, no se aprueban ni se descartan"
  - "content/marvel-champions.json y engine/__tests__/content.test.ts quedan sin tocar en esta tarea: no hay corrección aplicable con el esquema vigente sin falsear el veredicto o desbordar presupuestos de texto"
  - "contentVersion permanece en 9 (regla del plan: solo sube si el contenido cambia)"
  - "Las dos preguntas abiertas del dossier quedan resueltas sin cambios: convención de mesa 'izquierda' confirmada correcta en ronda.villano.05; redacción del aviso de Estados en ronda.villano.02 confirmada perfecta tal cual"

patterns-established:
  - "Cuando un veredicto de revisión humana pide una capacidad que el esquema actual no soporta, se documenta como corrección PENDIENTE con su id de paso y su razón de esquema, y se difiere a un plan dedicado — no se fuerza ni se descarta"

requirements-completed: [CONT-09]

# Metrics
duration: 12min
completed: 2026-08-29
---

# Phase 2 Plan 4: Revisión humana del contenido de la ronda (CONT-09/D-36) Summary

**Veredicto humano registrado sobre los 10 pasos de la ronda contra el Rules Reference v1.7 y una partida jugada en la app; dos correcciones de fondo sobre `ronda.jugadores.01` quedan pendientes de una capacidad de esquema que no existe todavía, diferidas al plan `02-05`.**

## Performance

- **Duration (esta continuación, Tarea 3):** 12 min
- **Started:** 2026-08-29T23:24:00Z (aprox.)
- **Completed:** 2026-08-29T23:36:00Z (aprox.)
- **Tasks:** 1 (Tarea 3 de 3; Tareas 1 y 2 completadas en sesiones previas)
- **Files modified:** 1

## Accomplishments

- El dossier `02-CONTENT-REVIEW.md` cierra con el veredicto literal del usuario, fechado, cubriendo tanto la revisión contra el reglamento (Parte A) como la partida jugada en la app (Parte B) — la evidencia que exige D-36 para dar el gate de CONT-09 por proceso cumplido.
- Las dos preguntas abiertas de la Tarea 1 quedan resueltas explícitamente y sin cambios de contenido: la convención "izquierda" en `ronda.villano.05` es correcta; el aviso de Estados de `ronda.villano.02` es correcto tal cual está redactado.
- Las dos correcciones de fondo del veredicto (C1: lista de opciones clicables del turno; C2: falta de recordatorio de Estados en la fase de jugadores) quedan registradas como **pendientes**, con su id de paso (`ronda.jugadores.01`), su razón de esquema y su plan de destino (`02-05`) — no aprobadas, no aplicadas, no descartadas.
- Las 5 correcciones objetivas de la Tarea 1 (dos páginas de cita en `ronda.jugadores.01`, página en tres pasos de "End of Player Phase", página en "Boost Cards", omisión de continuidad en `ronda.villano.04`, omisión de la cláusula 6a en `ronda.villano.06`) siguen en pie, sin tocar en esta tarea.

## Task Commits

Esta continuación ejecutó únicamente la Tarea 3 (Tareas 1 y 2 ya completadas en sesiones previas, ver tabla de continuación en el prompt de este agente):

1. **Tarea 1: Re-verificación automática y dossier de revisión** — `d1ba9d8` (fix) — completada en sesión previa
2. **Tarea 2: Revisión humana (checkpoint D-36)** — resuelta por el usuario, sin commit propio (es un gate humano)
3. **Tarea 3: Registrar veredicto y diferir C1/C2** — `3754d41` (docs)

**Plan metadata:** commit final pendiente (ver más abajo, `docs({phase}-{plan}): complete plan`)

_Nota: no hubo cambios de contenido ni de tests en esta tarea, por lo que no hay commits `feat`/`test`._

## Files Created/Modified

- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTENT-REVIEW.md` - Añadida sección final con el veredicto literal del usuario, resolución de las dos preguntas abiertas, y registro de C1/C2 como pendientes con su razón de esquema y destino (`02-05`)

## Decisions Made

- **CONT-09 se cumple en proceso, no en contenido definitivo.** La revisión humana ocurrió y produjo un veredicto versionado — eso satisface la letra de D-36 ("el usuario revisa a mano... antes de darlo por definitivo"). Pero el veredicto trae correcciones de fondo (C1, C2) que el esquema actual no puede expresar sin falsear el veredicto (concatenar en `text`, sustituir el aviso existente, o desbordar presupuestos). Por tanto **el contenido de `ronda.jugadores.01` no se declara definitivo** en esta tarea; queda abierto hasta `02-05`.
- **No se fuerza C1/C2 dentro del esquema vigente.** Las tres alternativas disponibles con el esquema actual (un `warning`+`warningDetail` por paso) fueron descartadas explícitamente por romper presupuestos de campo o por perder el aviso ya aprobado de «Atentos al dial del villano». Se prefiere diferir a construir la capacidad correcta (`options[]` + render clicable con `WarningDetailModal.vue`) en un plan dedicado.
- **Ambas preguntas abiertas se resuelven sin cambio de contenido.** El usuario confirmó explícitamente ambos puntos tal y como están redactados; no había nada que corregir en `ronda.villano.05` ni en `ronda.villano.02`.
- **`contentVersion` permanece en 9.** Regla del plan: solo sube si el contenido cambia; esta tarea no cambia `content/marvel-champions.json`.

## Deviations from Plan

None — el orquestador ya acotó explícitamente el alcance de la Tarea 3 (ver `<scope_ruling_for_task_3>` en el prompt de este agente): no tocar `content/marvel-champions.json`, no subir `contentVersion`, no tocar `content.test.ts`, y limitarse a documentar el veredicto y diferir C1/C2. Se siguió esa acotación al pie de la letra.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

No hay stubs de datos ni componentes sin fuente de datos introducidos en esta tarea (solo se editó un documento de planificación, no código de producto).

## Threat Flags

Ninguno nuevo. Las mitigaciones T-02-09 (repudiation — veredicto versionado con fecha) y T-02-10 (tampering — error cazado a mano convertido en test) del `threat_model` del plan siguen aplicando a las 5 correcciones de la Tarea 1, ya cubiertas por tests existentes en `engine/__tests__/content.test.ts`. No se introduce superficie nueva en esta tarea.

## Next Phase Readiness

- **Pendiente para plan `02-05`:** añadir un campo tipo `options[]` al esquema de contenido (Zod) para pasos `kind:'step'`, con render clicable reutilizando `WarningDetailModal.vue` por opción, y aplicar C1 (lista de opciones del turno en `ronda.jugadores.01`: Cambiar Alter-Ego/Héroe · Poner cartas en juego · Utilizar eventos · Activar acciones) y C2 (recordatorio de Estados equivalente al de `ronda.villano.02`, en la opción "Activar acciones" o en el paso, para cuando atacan los personajes).
- **La fase 02 no se marca completa hasta que `02-05` incorpore C1 y C2** — así lo establece explícitamente el orquestador en la acotación de esta tarea.
- El resto del contenido de la ronda (los 10 pasos, las 5 correcciones objetivas de citas/omisiones, las 4 correcciones confirmadas del borrador, el bucle, la cabecera, el índice y los 5 modales de aviso con consecuencia) queda aprobado por el usuario sin más cambios pendientes.

---
*Phase: 02-bucle-de-ronda-y-reglas-verificadas*
*Completed: 2026-08-29*
