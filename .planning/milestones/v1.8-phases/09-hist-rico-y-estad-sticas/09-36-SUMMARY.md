---
phase: 09-hist-rico-y-estad-sticas
plan: 36
subsystem: docs
tags: [documentation, requirements-traceability, ui-spec, roadmap, gap-closure]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "NOTICE_BODY['failure-stale']/useGameEndCopy.ts (09-32), useProgressMismatchMark.ts (09-33), gate por raíces con respaldo comprobable (09-34), Gate S ejerciendo las decisiones (09-35) — este plan documenta ese lote, no lo modifica"
provides:
  - "REQUIREMENTS.md: párrafo «Ronda 7» de la nota de cierre de HIST-06, con el hallazgo, el agravante, qué se hizo (09-32..09-35) y qué NO se hizo, terminando en la frase de no-cierre repetida; HIST-06 sigue `[ ]`"
  - "deferred-items.md: entrada de riesgo de la marca en memoria de progreso (qué cubre, qué no, por qué el residuo es aceptable hoy) y entrada de la sonda de bordes sin clasificar; nota de cierre de la ronda 7 nombrando uno a uno qué cierra cada plan"
  - "09-UI-SPEC.md: tres filas del Copywriting Contract actualizadas/añadidas citando literalmente el código tras el lote, comprobado carácter a carácter contra los .ts"
  - "ROADMAP.md: recuento de planes a 36/36 en las tres ubicaciones que lo citan, sin marcar la Fase 9 como verificada ni completa"
affects: []

# Actuals (#2632)
actuals:
  tokens: 7068
  tasks: 3
  commits: 3
plan_head_before: 1987faf7c515d333a441cadf3414c6b324e380ac

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Documentación de fase escrita SIEMPRE después del código, nunca antes: los tres textos citados en 09-UI-SPEC.md se verificaron con grep -F carácter a carácter contra el .ts real antes de darse por buenos"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
    - .planning/phases/09-hist-rico-y-estad-sticas/09-UI-SPEC.md
    - .planning/ROADMAP.md

key-decisions:
  - "El párrafo «Ronda 7» de REQUIREMENTS.md termina con 'cinco notas anteriores... dieron por cerrado lo que no lo estaba' (no cuatro): las rondas 5 y 6 ya usaban esa misma frase de cierre dos veces, así que la ronda 7 es la quinta afirmación de este tipo en el documento, no la cuarta — contado literalmente sobre el texto existente antes de escribir, no copiado del patrón de la ronda 6 sin verificar"
  - "La nota de cierre de la ronda 7 en deferred-items.md se añade como sección NUEVA al final del fichero (no sustituye la de la ronda 6): cada ronda deja su propio repaso, la de la ronda 6 sigue siendo el registro histórico de lo que esa ronda cerró"
  - "DEV-02 se AMPLÍA en las dos ubicaciones donde ya vivía (REQUIREMENTS.md y deferred-items.md), nunca se sustituye por una versión que suene a resuelta — siguiendo la prohibición explícita del plan"

requirements-completed: [HIST-04, HIST-06, HIST-09]

coverage:
  - id: D1
    description: "La nota de cierre de HIST-06 en REQUIREMENTS.md registra la octava cara del defecto (ronda 7): el hallazgo, el agravante del motivo falso en AFIRMACIONES_AUDITADAS, qué cerraron 09-32..09-35 y qué queda sin cerrar (esLaMismaPartida sin motivo estructurado, marca en memoria) — y HIST-06 sigue sin marcar"
    requirement: HIST-06
    verification:
      - kind: other
        ref: "grep -c \"^- \\[ \\] \\*\\*HIST-06\\*\\*\" .planning/REQUIREMENTS.md → 1 (medido tras el commit)"
        status: pass
      - kind: other
        ref: "grep -c \"09-13\\.\\.09-36\" .planning/REQUIREMENTS.md → 2 (filas HIST-06 y HIST-09)"
        status: pass
    human_judgment: false
  - id: D2
    description: "La deuda de la marca de progreso en memoria (useProgressMismatchMark.ts) queda documentada en deferred-items.md como riesgo evaluado —qué cubre, qué no cubre, por qué el residuo es aceptable hoy— con una acción sugerida concreta (tga:progress-mismatch:<gameId>), y la sonda de bordes sin clasificar queda registrada como hecho, no como aprobación"
    verification:
      - kind: other
        ref: "grep -c tga:progress-mismatch deferred-items.md → 1; grep -ci \"fuera del alcance de este plan\" deferred-items.md → 0 antes y después (ninguna entrada nueva usa esa justificación)"
        status: pass
    human_judgment: false
  - id: D3
    description: "El Copywriting Contract de 09-UI-SPEC.md cita el texto real que la app enseña tras el lote 09-32..09-35 (outcome dialog, failure-stale, y el aviso nuevo de ResumePrompt), comprobado carácter a carácter contra el .ts correspondiente"
    verification:
      - kind: other
        ref: "grep -F de las tres cadenas citadas contra useGameEndCopy.ts / useHistorySavedNotice.ts / useProgressMismatchMark.ts → las tres MATCH exacto (ver sección de este SUMMARY)"
        status: pass
    human_judgment: false
  - id: D4
    description: "ROADMAP.md cuenta 36/36 planes de la Fase 9 en las tres ubicaciones que citan el recuento, sin marcar la fase como verificada; la casilla de la Fase 9 sigue [ ]"
    verification:
      - kind: other
        ref: "grep -c \"^- \\[ \\] \\*\\*Phase 9:\" ROADMAP.md → 1; npm test → 976/976 sin cambios (regresión rápida, ningún fichero de app/ o engine/ tocado)"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 36: Documentación de fase al día tras el lote de cierre de la ronda 7 Summary

**REQUIREMENTS.md registra la octava cara del defecto sin cerrar HIST-06, `09-UI-SPEC.md` cita el texto real de la app tras 09-32..09-35 comprobado carácter a carácter, `deferred-items.md` evalúa por riesgo la marca en memoria del progreso, y `ROADMAP.md` cuenta 36/36 planes sin declarar la fase verificada.**

## Performance

- **Duration:** ~10 min (commits entre 2026-09-19T01:48:14+02:00 y 01:52:59+02:00, más la lectura previa de los cinco SUMMARY del lote y `09-VERIFICATION.md`)
- **Started:** 2026-09-19T01:40:00Z (aprox.)
- **Completed:** 2026-09-19T01:53:00Z
- **Tasks:** 3
- **Files modified:** 4 (los cuatro de `files_modified`, ninguno más)

## Accomplishments

- **REQUIREMENTS.md**: párrafo «Ronda 7» añadido al final de la nota de cierre de hueco de HIST-06, con el hallazgo en una frase (la copy nueva escrita para cerrar la séptima cara afirmaba anterioridad, identidad de partida y diferencia de ronda que `esLaMismaPartida` no establece), el agravante (motivo falso en `AFIRMACIONES_AUDITADAS` afirmando «cierto en las cuatro salidas»), qué se ha hecho con los cuatro planes del lote, qué NO se ha hecho y por qué (sin motivo estructurado en `esLaMismaPartida`, marca en memoria sin escritura en el dispositivo), y la frase de cierre repetida con el recuento correcto («cinco notas anteriores»). HIST-06 sigue `[ ]`, comprobado explícitamente. Tabla de trazabilidad sincronizada a mano: HIST-06 y HIST-09 a `Fase 9 (09-13..09-36)`; HIST-04 anota que el reintento sobre un snapshot ajeno queda señalizado al reentrar (plan 09-33) sin afirmar que el riesgo desaparezca. DEV-02 amplía su guion de pruebas pendiente con el texto reescrito de `failure-stale` y el aviso nuevo de `ResumePrompt`.
- **deferred-items.md**: nueva entrada «La marca de progreso que no coincide vive en memoria (ronda 7)» con evaluación de riesgo completa (por qué `'stale'` solo es alcanzable tras dos fallos de escritura consecutivos, qué cubre la marca en memoria y qué no, por qué el residuo —perder solo la advertencia, nunca afirmar algo falso— es aceptable hoy, y la acción sugerida concreta `tga:progress-mismatch:<gameId>` escrita en el siguiente arranque con éxito). Nueva entrada «La sonda de cobertura de bordes no clasificó ninguna fila (ronda 7)», registrando como hecho que las 14 filas de la fase volvieron `unclassified`/`unresolved`. Nota de cierre de la ronda 6 ampliada (no sustituida) con la actualización de DEV-02. Nueva sección final «Nota de cierre (ronda 7, planes 09-32..09-36)» nombrando uno a uno qué cierra cada plan y qué sigue abierto.
- **09-UI-SPEC.md**: fila «Outcome dialog retained warning» reescrita citando literalmente `buildEndGameBody` de `useGameEndCopy.ts` y explicando qué se retiró (la promesa de reintento, falsa en 2/4 estados) y por qué; fila `failure-stale` reescrita citando literalmente el `NOTICE_BODY` actual y nombrando las dos afirmaciones retiradas de la versión de la ronda 6 (anterioridad, diferencia de ronda) con el motivo de cada una; fila nueva «Resume prompt — aviso de progreso que no coincide» citando literalmente `PROGRESS_MISMATCH_WARNING`, con cuándo se muestra y qué no garantiza (una recarga completa la pierde); nota al pie de la ronda 7 en el mismo formato que la de la ronda 6.
- **ROADMAP.md**: recuento de planes actualizado a 36/36 en la línea de la lista de fases (con nota reescrita del lote de cierre ya ejecutado, sin afirmar verificación), en `**Plans**:` del bloque de detalle de la Fase 9, y en la tabla de Progress; `09-36-PLAN.md` marcado `[x]` en la lista de Wave 29; la casilla `- [ ] **Phase 9:` sigue sin marcar, comprobado explícitamente.

## Comprobación cruzada carácter a carácter (Task 3, acceptance criterion)

Las tres cadenas citadas en `09-UI-SPEC.md` se comprobaron con `grep -F` contra el `.ts` real DESPUÉS de escribir la tabla, no antes:

```
1) buildEndGameBody (useGameEndCopy.ts) → MATCH exacto
2) NOTICE_BODY['failure-stale'] (useHistorySavedNotice.ts) → MATCH exacto
3) PROGRESS_MISMATCH_WARNING (useProgressMismatchMark.ts) → MATCH exacto
```

Las tres coincidieron a la primera; ninguna tabla tuvo que corregirse.

## Task Commits

Cada task se comprometió atómicamente, sin tocar ningún fichero de código:

1. **Task 1: `REQUIREMENTS.md` registra la octava cara y no da nada por cerrado** — `ca6b213` (docs)
2. **Task 2: la deuda que este lote deja, evaluada por riesgo y no por alcance de plan** — `4a82665` (docs)
3. **Task 3: el contrato de copy dice el texto que la app enseña, y el ROADMAP cuenta los planes reales** — `fe839fb` (docs)

**Plan metadata:** (pendiente — commit de cierre de este plan, ver más abajo)

## Files Created/Modified

- `.planning/REQUIREMENTS.md` — párrafo «Ronda 7», trazabilidad de HIST-04/06/09 sincronizada, DEV-02 ampliada
- `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` — dos entradas nuevas evaluadas por riesgo, DEV-02 ampliada, nota de cierre de la ronda 7
- `.planning/phases/09-hist-rico-y-estad-sticas/09-UI-SPEC.md` — tres filas del Copywriting Contract al día, nota al pie de la ronda 7
- `.planning/ROADMAP.md` — recuento de planes a 36/36 en tres ubicaciones, `09-36` marcado ejecutado, Fase 9 sin marcar

## Decisions Made

Ver `key-decisions` del frontmatter. Resumen: la frase de cierre de la ronda 7 dice «cinco notas anteriores» (contado literalmente, no copiado del patrón de la ronda 6); la nota de cierre de la ronda 7 en `deferred-items.md` es una sección nueva, no sustituye a la de la ronda 6; DEV-02 se amplía, nunca se sustituye.

## Deviations from Plan

### Documentado, no un fix — acceptance criterion del plan factualmente incompleto

**1. El recuento exacto de `grep -c "36/36"` sobre `ROADMAP.md`**

- **Found during:** Task 3, al verificar los criterios de aceptación tras editar `ROADMAP.md`.
- **Issue:** El criterio dice que `grep -c "36/36" .planning/ROADMAP.md` debe devolver exactamente 1. El `<action>` del propio plan pide, sin embargo, tres actualizaciones distintas para que el documento no se contradiga a sí mismo: (a) «actualizar el recuento de planes ... en la línea de la lista de fases» (línea del listado de fases), y dos consecuencias directas de dejar el ROADMAP internamente coherente: (b) la línea `**Plans**: 35/36 plans executed ... 31 ejecutados + 5 planificados` del bloque de detalle de la Fase 9, que habría quedado literalmente falsa (ya no hay "5 planificados pendientes") si no se tocaba, y (c) la fila de la tabla de Progress al final del fichero, que el propio verbo `roadmap update-plan-progress` (invocado más abajo en `update_requirements`/`state_updates` de este mismo flujo de ejecución) recalcula de todas formas desde el disco. Medido: el recuento real tras las tres actualizaciones es **3**, no 1.
- **Por qué no se "arregla":** revertir (b) o (c) para forzar el recuento a 1 dejaría el documento diciendo, en una misma sección, que el lote "sigue planificado" (línea 183, si no se tocara) mientras la línea de la lista de fases (línea 36) ya lo cuenta como ejecutado — exactamente la clase de desincronización de recuento que la propia ronda 7 de `09-VERIFICATION.md` señaló como nota de trazabilidad para el ROADMAP en una ronda anterior. Las tres ubicaciones dicen lo mismo (36/36) y son coherentes entre sí; forzar un recuento de grep sería preferir un número más bonito a un documento correcto — exactamente lo que el `<phase_context>` de este dispatch prohíbe.
- **Files modified:** ninguno adicional — es un hallazgo sobre el propio texto del plan, mismo patrón que los cuatro hallazgos ya documentados en los SUMMARY de los planes 09-32/09-33/09-34.
- **Verification:** `grep -n "36/36" .planning/ROADMAP.md` → 3 líneas, las tres consistentes (línea 36 del listado de fases, línea 183 del bloque `**Plans**:`, línea 356 de la tabla de Progress). `git diff --stat -- .planning/ROADMAP.md` → 4 inserciones/4 borrados (8 líneas), muy por debajo del umbral de 20 líneas que el propio criterio de aceptación fija como señal de reemplazo no acotado.
- **Committed in:** N/A (hallazgo, no cambio de código; las tres ediciones en sí están en `fe839fb`)

---

**Total deviations:** 0 auto-fixed; 1 documentado sin fix (criterio de plan que no contempló las tres actualizaciones que su propio `<action>` implica).
**Impact on plan:** Ninguno de los cuatro ficheros modificados es código; `npm test` confirma 976/976 sin cambios. El hallazgo sobre el recuento de `ROADMAP.md` no afecta a la corrección del documento: las tres ubicaciones que citan el recuento de planes dicen lo mismo (36/36) y ninguna afirma que la Fase 9 esté verificada.

## Issues Encountered

Ninguno relevante para el resultado.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Este plan no cierra HIST-06 ni ningún otro requisito además de sincronizar su trazabilidad — **HIST-06 sigue `[ ]`** y así debe seguir hasta que una ronda de verificación independiente lo confirme (esta es la sexta nota de este tipo, tras cinco anteriores que dieron algo por cerrado sin serlo).
- **DEV-02 sigue ABIERTA** en `REQUIREMENTS.md` y en `deferred-items.md`, ahora con dos puntos más de guion (el texto reescrito de `failure-stale` y el aviso nuevo de `ResumePrompt`) — ninguno de los dos se ha comprobado en dispositivo real.
- La ronda de verificación siguiente puede citar directamente este SUMMARY y los cuatro anteriores (09-32..09-35) para reconstruir qué cambió y qué sigue siendo deuda: la marca de discrepancia en memoria (recarga completa la pierde), `esLaMismaPartida` sin motivo estructurado (decisión explícita de no construirlo, ver 09-32), y la sonda de cobertura de bordes sin clasificar ninguna de las 14 filas de la fase.
- Ningún bloqueante nuevo. Ningún fichero de `app/` o `engine/` fue tocado por este plan (`git diff --stat -- app/ engine/ package.json package-lock.json` vacío, confirmado antes de cada commit).

## Self-Check: PASSED

- `.planning/REQUIREMENTS.md` — FOUND, contiene "Ronda 7", HIST-06 sigue `[ ]`
- `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` — FOUND, contiene "tga:progress-mismatch" y "(ronda 7)"
- `.planning/phases/09-hist-rico-y-estad-sticas/09-UI-SPEC.md` — FOUND, contiene "PROGRESS_MISMATCH_WARNING"
- `.planning/ROADMAP.md` — FOUND, contiene "36/36" (×3) y la Fase 9 sigue sin marcar
- Commits `ca6b213`, `4a82665`, `fe839fb` — all FOUND in `git log --oneline --all`
- `npm test` — 976/976 passed (33/33 files), idéntico a la baseline — este plan no toca código
- Plan-level `<verification>`: `git diff --stat -- app/ engine/ package.json package-lock.json` vacío; `git diff --name-only` (desde `1987faf`) lista exactamente los cuatro ficheros de `files_modified`, ninguno más

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-19*
