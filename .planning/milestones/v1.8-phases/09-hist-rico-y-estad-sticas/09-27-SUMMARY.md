---
phase: 09-hist-rico-y-estad-sticas
plan: 27
subsystem: docs
tags: [requirements, deferred-items, audit, honesty, documentation]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-24 — npm run typecheck real en CI, cubriendo app/** + transitivos"
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-25 — readStoredProgress, StoredProgress (autoridad de lectura del progreso)"
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-26 — planGameEnd, los dos consumidores cableados a readStoredProgress, gate afirmacionesRespaldadas.test.ts, cierre de WR-01"
provides:
  - "REQUIREMENTS.md deja de afirmar que HIST-06 está cerrado; el checkbox vuelve a [ ] y la nota nombra readStoredProgress/StoredProgress/planGameEnd como la autoridad real que sostiene la interfaz, sin declarar un cierre que le corresponde a una ronda de verificación"
  - "Cuatro entradas nuevas en deferred-items.md (WR-04/WR-05/WR-06/WR-02, todas '(ronda 4)') con justificación de RIESGO, nunca de alcance de plan"
  - "Q5 en 09-AUDIT-AFIRMACIONES-UI.md: la pregunta de método que habría cazado la ronda 5 dentro del barrido de la ronda 4 (¿el dato que respalda la frase responde a la MISMA pregunta que la frase plantea?)"
  - "Fila de HistorySavedNotice.vue en §2 del audit corregida: su RESPALDADA de la ronda 4 queda marcada incompleta bajo Q5, con la situación real tras 09-24/09-25/09-26"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Una nota de cierre de hueco no declara un cierre que le corresponde a una ronda de verificación independiente confirmar — el propio texto nuevo de HIST-06 lo dice explícitamente para no repetir el patrón que motivó esta misma ronda"
    - "Un aplazamiento en deferred-items.md se justifica por evaluación de RIESGO (qué hace falta para alcanzarlo, qué pasa como mucho, por qué es asumible), nunca por alcance de plan — la ronda 4 ya invalidó ese motivo y este plan no lo repite"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
    - .planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-AFIRMACIONES-UI.md

key-decisions:
  - "El párrafo 'Ronda 4' de REQUIREMENTS.md no se borra ni se reemplaza entero: se corrige solo la afirmación final (de 'cerrada' a 'cerrada solo a medias'), conservando intacta la descripción de qué hizo cada plan (09-18/09-20/09-21), porque esa parte seguía siendo cierta y útil"
  - "Las cuatro entradas nuevas de deferred-items.md reutilizan la numeración WR- de 09-REVIEW.md (ronda 4) en vez de inventar identificadores nuevos, distinguidas solo por el sufijo '(ronda 4)' en el título — evita una tabla de correspondencias adicional entre dos documentos"

requirements-completed: [HIST-06]

# Metrics
duration: ~15min
completed: 2026-09-13
---

# Phase 09 Plan 27: Documentación honesta del cierre de la ronda 5 Summary

**`REQUIREMENTS.md` deja de afirmar que HIST-06 está cerrado — el checkbox vuelve a `[ ]`, la nota nombra `readStoredProgress`/`StoredProgress`/`planGameEnd` como la autoridad real sin declarar un cierre que no le corresponde a este documento declarar; cuatro diferidos nuevos llevan justificación de riesgo (nunca de alcance); y `09-AUDIT-AFIRMACIONES-UI.md` gana Q5, la pregunta de método que habría cazado la ronda 5 dentro del barrido de la ronda 4.**

## Performance

- **Duration:** ~15 min (commits `ffba6b1` → `bd03bda`)
- **Started:** 2026-09-13T14:15:00+02:00 (aprox., tras leer los tres SUMMARY previos y el estado del árbol)
- **Completed:** 2026-09-13T14:20:19Z
- **Tasks:** 2
- **Files modified:** 3 (ninguno bajo `app/` ni `engine/`)

## Accomplishments

- `REQUIREMENTS.md`: checkbox de HIST-06 vuelto a `[ ]` — un requisito no se remarca porque un plan diga haberlo cerrado, sino cuando una ronda de verificación lo confirme.
- El párrafo «Ronda 4» ya no dice que el lote 09-18/09-20/09-21 «queda cerrada» la reserva: dice que la cerró **solo a medias** (la mitad que `save()` devuelva el booleano real de escritura) y que la ronda 5 demostró que ese booleano **no bastaba** porque respondía una pregunta distinta de la que la copy planteaba.
- Nuevo párrafo «Ronda 5»: nombra el hallazgo en una frase, el cierre elegido (`readStoredProgress`, `StoredProgress`, `planGameEnd`, el gate `afirmacionesRespaldadas.test.ts`), el hallazgo colateral (la barrera de tipos no existía antes de 09-24) y el cierre de WR-01. Termina con la frase que el plan exige literalmente: este cierre no se da por bueno hasta que una ronda de verificación independiente lo confirme — cuatro notas anteriores de este mismo documento ya dieron por cerrado lo que no lo estaba.
- Tabla de trazabilidad: fila HIST-06 → «Reabierto en la ronda 5»; fila HIST-09 → rango ampliado a `(09-13..09-27)`, conservando `Satisfecho` (el requisito literal sigue cumpliéndose, verificado de forma independiente por la ronda 5).
- `deferred-items.md`: cuatro entradas nuevas, tituladas `## WR-04/05/06/02 (ronda 4)` para no confundirse con la entrada `WR-04` (ronda 1, ya cerrada) que ya vivía en el fichero. Cada una lleva evaluación de RIESGO (qué hace falta para alcanzarlo, qué pasa como mucho, por qué es asumible) — ninguna dice «fuera del alcance/perímetro de este plan», el motivo que la ronda 4 ya invalidó. La entrada WR-05 (ronda 4) termina recordando que DEV-02 (comprobación humana en tablet) sigue ABIERTA.
- `09-AUDIT-AFIRMACIONES-UI.md`: añadida Q5 al método («¿el dato que respalda esta frase responde a la MISMA pregunta que la frase plantea?»), explicando de dónde nace (Q4 comprobó que existía un booleano, no que ese booleano contestara la pregunta correcta). Corregida la fila de `HistorySavedNotice.vue` en §2 con tachado sobre la justificación original y la situación real tras 09-24/09-25/09-26. Añadido un addendum tras §3 dejando constancia, verificado con `git log`, de que ningún otro de los 24 `.vue` cambió desde que el documento se escribió — no se rehace el barrido íntegro.

## Task Commits

Each task was committed atomically:

1. **Task 1: `REQUIREMENTS.md` deja de afirmar un cierre que la ronda 5 desmintió** — `ffba6b1` (docs)
2. **Task 2: registrar lo aplazado con justificación de riesgo, y añadir la pregunta de método que faltaba** — `bd03bda` (docs)

**Plan metadata:** pendiente (este commit, ver más abajo)

## Files Created/Modified

- `.planning/REQUIREMENTS.md` — checkbox HIST-06 vuelto a `[ ]`; párrafo «Ronda 4» corregido (cierre a medias, no total); párrafo «Ronda 5» nuevo (hallazgo, cierre elegido, hallazgo colateral de la barrera de tipos, cierre de WR-01, frase de no-cierre-prematuro); tabla de trazabilidad (HIST-06 reabierto, HIST-09 rango ampliado)
- `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` — cuatro entradas nuevas `WR-04/05/06/02 (ronda 4)` con evaluación de riesgo; nota de DEV-02 abierta al final de WR-05 (ronda 4)
- `.planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-AFIRMACIONES-UI.md` — Q5 añadida a §1 Método; fila de `HistorySavedNotice.vue` corregida en §2; addendum tras §3 confirmando (por `git log`) que el resto del barrido sigue vigente sin rehacerse

## Decisions Made

Ver `key-decisions` en el frontmatter arriba.

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito. Las dos tareas se limitaron a los tres ficheros de `files_modified`; ningún fichero de `app/` ni `engine/` se tocó (confirmado por `git diff --stat` en cada commit y sobre el plan completo).

## Issues Encountered

Al redactar el addendum del §3 del audit, el primer borrador afirmaba «ninguno de los otros 23 tiene commits posteriores... salvo los ya citados en §3» sin haberlo comprobado — exactamente el tipo de afirmación sin respaldo que este mismo documento audita. Se corrigió antes de comitear: se ejecutó `git log --oneline 7a409b2..HEAD -- 'app/**/*.vue'` (`7a409b2` es el commit que creó el documento) y se verificó que el único commit que toca un `.vue` desde entonces es `4b02c0e` (plan 09-26), sobre un único fichero (`app/pages/[game]/index.vue`, ya `NO APLICA` en §2). El addendum se reescribió citando el comando y el resultado real en vez de una suposición.

## User Setup Required

None - no se requiere configuración externa. Este plan es documentación pura.

## Verificación final del plan

```
$ git diff --stat ffba6b1~1 HEAD
 .planning/REQUIREMENTS.md                          | 58 +++++++++++---
 .../09-AUDIT-AFIRMACIONES-UI.md                    | 39 +++++++-
 .../09-hist-rico-y-estad-sticas/deferred-items.md  | 98 ++++++++++++++++++++
 3 files changed, 183 insertions(+), 12 deletions(-)
```
Exactamente los tres ficheros de `files_modified`, ninguno bajo `app/` ni `engine/`.

```
$ npm run typecheck   → EXIT=0
$ npx vitest run      → 30 Test Files passed (30), 845 Tests passed (845) → EXIT=0
```
Idénticos a los del cierre de 09-26 — este plan no toca código, así que no había ninguna razón para que cambiaran, y no cambiaron.

`git status --short` sigue mostrando únicamente `?? GEMINI_QUICK_START.md`, ajeno a este plan y sin tocar.

## Declaración obligatoria sobre DEV-02

**Este plan NO ejecuta ni cierra la comprobación humana en tablet real.** DEV-02
(`REQUIREMENTS.md`, pendiente desde `09-22-SUMMARY.md`) sigue exactamente igual de abierta
que antes de este plan. La documentación tocada aquí la nombra explícitamente como ABIERTA
en tres sitios (`REQUIREMENTS.md` §Requisitos diferidos, `deferred-items.md` entrada WR-05
(ronda 4)) y en ningún sitio se ha escrito una frase que sugiera que está hecha.

## Next Phase Readiness

- La documentación de la fase 9 describe ahora el estado real de HIST-06: reabierto,
  respaldado por código nombrado (`readStoredProgress`), pendiente de confirmación por una
  ronda de verificación independiente.
- Los cuatro diferidos de la ronda 4 (WR-04/05/06/02) quedan registrados con evaluación de
  riesgo propia, listos para que una ronda de verificación decida si el riesgo sigue siendo
  asumible o si alguno merece un plan de cierre.
- El método de auditoría de afirmaciones (Q1-Q5) queda completo para cualquier auditoría
  futura de superficies `.vue` nuevas.
- Ninguna fase se marca completa aquí — corresponde a una ronda de verificación, fuera del
  `scope_boundary` de este plan.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*

## Self-Check: PASSED

Los tres ficheros modificados existen en disco con el contenido descrito; los dos commits
de task (`ffba6b1`, `bd03bda`) existen en `git log`.
