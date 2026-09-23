---
phase: 09-hist-rico-y-estad-sticas
plan: 31
subsystem: documentation
tags: [requirements-traceability, audit-method, deferred-risk, copywriting-contract]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas (planes 09-28/09-29/09-30)
    provides: "readStoredProgress(game, esperada?) con 'stale', esLaMismaPartida, failure-stale, planProgressMount, gate reescrito con regionVigilada/AFIRMACIONES_AUDITADAS, endGameBody honesto"
provides:
  - "REQUIREMENTS.md: nota de cierre de hueco de la ronda 6 (séptima variante), HIST-06 sigue [ ], trazabilidad de HIST-04/06/09 sincronizada a mano, DEV-02 con dos puntos de guion nuevos"
  - "09-AUDIT-AFIRMACIONES-UI.md: Q6 (¿la lectura mide el MISMO objeto del que habla la frase?), regla de exclusión por acción futura reescrita, filas de HistorySavedNotice.vue/GameOutcomeDialog.vue corregidas, MiniSetupScreen.vue y useProgressMountPlan.ts añadidos"
  - "deferred-items.md: WR-02 (ronda 6) con evaluación de riesgo y el supuesto NO verificado sobre la correlación lectura/escritura, nota de cierre explícita de qué SÍ y qué NO se cerró de la ronda 5"
  - "09-UI-SPEC.md: Copywriting Contract con las cuatro variantes de fallo citadas literalmente, endGameBody actualizado, fila nueva del aviso de mini-setup"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fidelidad de copy verificada por grep en ambos lados (documento y fichero de código), nunca de memoria"
    - "Una nota de cierre de hueco documenta el hallazgo, el agravante, la causa de proceso y el cierre elegido, y termina con la frase que prohíbe darlo por bueno sin verificación independiente"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-AFIRMACIONES-UI.md
    - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
    - .planning/phases/09-hist-rico-y-estad-sticas/09-UI-SPEC.md

key-decisions:
  - "No se ejecutó `requirements.mark-complete` del gsd-sdk: REQUIREMENTS.md se editó a mano en la Task 1 con el estado final correcto (HIST-06 sigue [ ]); ejecutar la herramienta habría vuelto a marcar HIST-06 como [x] (el mismo efecto que 09-28 tuvo que revertir) y habría exigido deshacerlo. Se evita el problema entero editando a mano desde el principio, tal como exige la nota de la Fase 09-27 en STATE.md."
  - "El perímetro original de 09-AUDIT-AFIRMACIONES-UI.md (exactamente los 24 .vue) se amplía en un fichero .ts (useProgressMountPlan.ts) sin reescribir la declaración de perímetro de §0 — se documenta la excepción en el addendum de la ronda 6 en vez de fingir que el barrido siempre cubrió .ts"
  - "El diagrama ASCII de fallo en §8 de 09-UI-SPEC.md no se redibuja (instrucción explícita del plan); se añade una nota aparte señalando que desde el plan 09-28 existen cuatro variantes, no una, con el Copywriting Contract como fuente de la copy literal"

requirements-completed: []

# Metrics
duration: 20min
completed: 2026-09-14
---

# Phase 09 Plan 31: La documentación de la fase pasa a describir lo que 09-28/09-29/09-30 construyeron de verdad, sin declarar HIST-06 cerrado — Summary

**Cuatro documentos de `.planning/` puestos al día con el código real (`esLaMismaPartida`, `planProgressMount`, `regionVigilada`, `endGameBody`): la nota de HIST-06 registra la séptima variante y su cierre elegido pero mantiene el checkbox `[ ]`, el método de auditoría gana Q6 y cierra la regla de exclusión que dejó pasar `endGameBody` durante tres rondas, el riesgo del autoguardado tras una lectura fallida queda evaluado por escrito con su supuesto no verificado, y el contrato de copy cita literalmente las cuatro variantes de fallo del aviso de guardado.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-14T12:17:00Z
- **Completed:** 2026-09-14T12:37:15Z
- **Tasks:** 3
- **Files modified:** 4 (exactamente los de `files_modified`, ninguno de código)

## Accomplishments

- `REQUIREMENTS.md` gana el párrafo «Ronda 6» al final de la nota de cierre de hueco de HIST-06:
  el hallazgo (la lectura sustituta contestaba «¿hay ALGUNA?» en vez de «¿es ÉSTA?»), el agravante
  (el propio test de regresión de la ronda 5 fijaba la respuesta defectuosa en verde), el hallazgo
  de proceso (el gate inspeccionaba el 1,9% de la plantilla) y el cierre elegido, nombrando código
  real (`readStoredProgress(game, esperada?)`, `esLaMismaPartida`, `planProgressMount`,
  `regionVigilada`, `endGameBody`). HIST-06 sigue `[ ]`. La tabla de trazabilidad se sincronizó a
  mano: HIST-06/HIST-09 amplían su rango a `(09-13..09-31)`, HIST-04 añade `09-28` con su matiz de
  riesgo. DEV-02 gana dos puntos de guion nuevos sin marcarse como hecho.
- `09-AUDIT-AFIRMACIONES-UI.md` gana Q6 (¿la lectura mide el MISMO objeto del que habla la frase?)
  en §1, distinguiendo «alguna vs ésta» de la «escritura vs lectura» de Q5 — y deja escrito que
  aprobar Q5 no exime de Q6. La regla de exclusión por «acción futura» se reescribe: una promesa
  que la app ejecuta con una rama en la que no la ejecuta SÍ entra en el barrido. La fila de
  `HistorySavedNotice.vue` se corrige otra vez (esta vez bajo Q6, citando el código real del plan
  09-28); la fila de `GameOutcomeDialog.vue` deja de ser `NO APLICA` y pasa a `DEFECTO (rondas
  4-6) → CORREGIDO en 09-30`, con la tabla de veracidad de `endGameBody` resumida. Dos filas
  nuevas (`MiniSetupScreen.vue`, `useProgressMountPlan.ts`) documentan el aviso de lectura no
  comprobada. §4 (recuento) y §5 (regla para el futuro) actualizados.
- `deferred-items.md` gana la entrada `WR-02 (ronda 6)`: el primer autoguardado tras una lectura
  fallida sigue machacando una posición no comprobada (09-29 solo cierra la mitad del aviso, no el
  autoguardado), con evaluación de riesgo explícita y, siguiendo el hallazgo del verificador de
  planes, un párrafo que deja constar por escrito que la correlación «lectura falla ⟹ escritura
  falla igual» está SUPUESTA, no comprobada contra `usePersistedSession.ts`. Una nota de cierre
  nombra uno a uno qué SÍ se cerró de la ronda 5 (WR-05/WR-06/WR-07 por 09-28, WR-03/WR-04/IN-05
  por 09-30) y qué sigue abierto sin cambios (WR-04/WR-05 de la ronda 4, DEV-02).
- `09-UI-SPEC.md`: la fila única de «Save-result notice — failure (D-03)» del Copywriting
  Contract se sustituye por las cuatro filas reales (`failure-recoverable`, `failure-stale`,
  `failure-unrecoverable`, `failure-unknown`), cada una con el texto copiado literalmente de
  `NOTICE_BODY`. La fila de `endGameBody` se actualiza con el texto real tras el plan 09-30. Fila
  nueva para el aviso de mini-setup (`UNVERIFIED_PROGRESS_NOTICE`). §8 gana un párrafo señalando
  que son cuatro variantes desde el plan 09-28, sin redibujar el diagrama ASCII.
- **Comprobación de fidelidad ejecutada** (obligatoria antes de dar el contrato por bueno): los
  seis textos citados en `09-UI-SPEC.md` se compararon por `grep` contra el fichero de código que
  los define — ver tabla abajo. Los seis pares coinciden 1:1.
- `npx vitest run` (899/899), `npm run typecheck` y (tras `npx nuxt prepare`, necesario solo para
  que Vitest resuelva `.nuxt/tsconfig.app.json` en este worktree — no un cambio de código) en
  verde: este plan no toca ningún fichero de `app/` ni `engine/`, así que la suite no debía
  cambiar y no cambió.

## Task Commits

1. **Task 1: `REQUIREMENTS.md` registra la séptima variante sin declarar un cierre** - `7b4556d` (docs)
2. **Task 2: el método de auditoría gana la pregunta que faltaba y las filas afectadas se corrigen** - `f0d8785` (docs)
3. **Task 3: registrar por escrito lo que queda abierto, y el contrato de copy al día** - `1302978` (docs)

**Plan metadata:** este propio SUMMARY.md (commit de cierre pendiente tras este fichero)

## Files Created/Modified

- `.planning/REQUIREMENTS.md` — párrafo «Ronda 6» en la nota de cierre de hueco de HIST-06;
  trazabilidad de HIST-04/HIST-06/HIST-09 sincronizada a mano; DEV-02 con dos puntos nuevos
- `.planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-AFIRMACIONES-UI.md` — Q6 en §1, regla de
  acción futura reescrita, filas de `HistorySavedNotice.vue`/`GameOutcomeDialog.vue` corregidas,
  filas nuevas de `MiniSetupScreen.vue`/`useProgressMountPlan.ts`, §3/§4/§5 actualizados
- `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` — entrada `WR-02 (ronda 6)` con
  evaluación de riesgo y supuesto no verificado; nota de cierre de qué se cerró/qué sigue abierto
- `.planning/phases/09-hist-rico-y-estad-sticas/09-UI-SPEC.md` — Copywriting Contract con las
  cuatro variantes de fallo, `endGameBody` actualizado, fila del aviso de mini-setup, párrafo en §8

## Decisions Made

- **No se ejecutó `requirements.mark-complete` del gsd-sdk.** `REQUIREMENTS.md` se editó a mano
  desde el principio con el estado final correcto (HIST-06 sigue `[ ]`), evitando el ciclo de
  «ejecutar la herramienta → verla marcar HIST-06 como `[x]` → revertir esa línea» que 09-28 tuvo
  que atravesar. La tabla de trazabilidad, que la herramienta deja desincronizada en silencio
  (memoria del usuario `gsd-sdk-requirements-tabla-espanol.md`), se sincronizó a mano en la Task 1
  exactamente para las tres filas que este lote toca (HIST-04/HIST-06/HIST-09), tal como exige el
  `<scope_boundary>` del plan.
- **`requirements-completed: []` en el frontmatter de este SUMMARY**, pese a que el frontmatter
  del plan lista `[HIST-04, HIST-06, HIST-09]`: este es un plan de documentación, no de
  verificación, y la política de la Fase 09-27 (registrada en `STATE.md`) es que un requisito se
  marca completo cuando una ronda de verificación lo confirma, nunca cuando un plan de ejecución
  dice haberlo cerrado. Ninguno de los tres requisitos cambia de estado por este plan.
- **El perímetro de `09-AUDIT-AFIRMACIONES-UI.md` gana un fichero `.ts`** (`useProgressMountPlan.ts`)
  sin reescribir la declaración de §0 («exactamente los 24 `.vue`»): se documenta como excepción
  explícita en el addendum de la ronda 6, porque el criterio de inclusión de §1 nunca excluyó los
  `.ts` por diseño — el barrido original simplemente no tuvo ninguno que auditar hasta ahora.
- **El diagrama ASCII de fallo en §8 de `09-UI-SPEC.md` no se redibuja**, siguiendo la instrucción
  explícita de la Task 3 (acción 8): se añade un párrafo aparte junto al diagrama señalando que
  desde el plan 09-28 existen cuatro variantes, con el Copywriting Contract como fuente de la copy
  literal actualizada.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. Ningún fichero de `app/` ni `engine/` fue
tocado; verificado con `git diff --stat` tras cada task y al final del plan completo.

## Tabla de comprobación de fidelidad (Task 3, obligatoria)

| Documento (09-UI-SPEC.md) | Fichero de código | Fragmento comparado | Coincide en ambos lados |
|---|---|---|---|
| Copywriting Contract, `failure-recoverable` | `app/composables/useHistorySavedNotice.ts` | «La partida no se ha perdido: sigue guardada en el dispositivo» | ✓ (1/1) |
| Copywriting Contract, `failure-stale` | `app/composables/useHistorySavedNotice.ts` | «En el dispositivo solo queda una versión anterior de esta partida» | ✓ (1/1) |
| Copywriting Contract, `failure-unrecoverable` | `app/composables/useHistorySavedNotice.ts` | «Al volver a entrar en el juego no encontraréis esta partida» | ✓ (1/1) |
| Copywriting Contract, `failure-unknown` | `app/composables/useHistorySavedNotice.ts` | «No hemos podido comprobar si la partida sigue en el dispositivo» | ✓ (1/1) |
| Outcome dialog retained warning (`endGameBody`) | `app/pages/[game]/index.vue` | «El progreso guardado de esta partida» | ✓ (1/1) |
| Mini-setup — lectura no comprobada | `app/composables/useProgressMountPlan.ts` | «No hemos podido comprobar si este dispositivo tiene una partida guardada» | ✓ (1/1) |

## Issues Encountered

`npx vitest run` fallaba en los 31 ficheros de test con `TSCONFIG_ERROR: Failed to load tsconfig
'.nuxt/tsconfig.app.json'` antes de tocar nada — el directorio `.nuxt/` (gitignored, generado)
no existía en este worktree recién creado. Se ejecutó `npx nuxt prepare` para regenerarlo (no
toca ningún fichero versionado; `.nuxt/` está en `.gitignore`) y la suite completa volvió a pasar
(899/899). Documentado aquí porque no es un cambio del plan ni una desviación de código — es
utillaje de entorno necesario para poder correr `<verification>` en un worktree limpio.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HIST-06 sigue `[ ]`, a la espera de una séptima ronda de verificación independiente que
  confirme (o no) el cierre de la séptima cara del defecto. Este plan no puede ni debe cerrarlo.
- La comprobación visual humana en tablet horizontal (DEV-02, `REQUIREMENTS.md`, pendiente desde
  `09-22-SUMMARY.md`) sigue ABIERTA; este lote añade dos puntos a su guion (aviso de lectura no
  comprobada del mini-setup, variante `failure-stale`) pero no la realiza.
- WR-02 (ronda 6) queda en `deferred-items.md` como riesgo evaluado y aceptado, con su supuesto no
  verificado dejado por escrito para que una ronda futura pueda revisarlo sin volver a deducirlo.
- Ningún bloqueante nuevo para la fase. `npx vitest run` (899/899) y `npm run typecheck` en verde;
  ningún fichero de código fue tocado por este plan.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-14*

## Self-Check: PASSED

Los cuatro ficheros modificados y este propio SUMMARY.md existen en disco; los tres commits de
tarea (`7b4556d`, `f0d8785`, `1302978`) están presentes en `git log`. Todos los criterios de
aceptación automatizados de las tres tareas (`grep -c` sobre `REQUIREMENTS.md`,
`09-AUDIT-AFIRMACIONES-UI.md`, `deferred-items.md` y `09-UI-SPEC.md`) se re-verificaron tras cada
edición y pasaron. `git diff --stat` del plan completo contra la base (`f94a389`) toca
exclusivamente los cuatro ficheros de `.planning/` listados en `files_modified`.
