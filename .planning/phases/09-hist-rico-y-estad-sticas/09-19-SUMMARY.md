---
phase: 09-hist-rico-y-estad-sticas
plan: 19
subsystem: ui
tags: [vue, accessibility, aria, focus-management, gap-closure]

# Dependency graph
requires:
  - phase: 09-16
    provides: "GameOutcomeDialog cableado en app/pages/[game]/index.vue con las cuatro salidas (HIST-01/02/03)"
  - phase: 09-17
    provides: "09-AUDIT-FRONTERAS.md y 09-VERIFICATION.md ronda 4, que reclasifican WR-04 de 'diferido' a 'hallazgo real'"
provides:
  - "GameOutcomeDialog.vue con nombre accesible (aria-labelledby), foco gestionado al abrir/cerrar y nota de reconciliación escrita sobre la ausencia deliberada de Escape"
  - "Cierre de WR-04 (deferred-items.md), el motivo de alcance ya no aplica"
affects: [09-23]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Foco de entrada al panel (tabindex=-1), no al primer control interactivo, cuando ese control representaría un empujón hacia una opción (D-02) — distinto del patrón de WarningDetailModal.vue, que sí enfoca su único botón porque no hay elección que sesgar"
    - "Restauración de foco al cerrar guardando document.activeElement en onMounted y restaurándolo en onUnmounted"
    - "Ausencia deliberada de un listener (Escape) documentada por escrito en el propio componente, citando el contrato de diseño y el ítem de deferred-items.md que la originó, para que no se reabra como olvido"

key-files:
  created: []
  modified:
    - app/components/GameOutcomeDialog.vue

key-decisions:
  - "El foco inicial va al panel (tabindex=\"-1\"), nunca a ninguno de los tres botones de registro: D-02 prohíbe empujar al grupo hacia un resultado, y un foco inicial en 'GANADA' sería ese empujón en la capa de accesibilidad"
  - "Escape y el tocar el velo NO cierran el diálogo, a propósito: 09-UI-SPEC.md §Layout 2 lo fija como contrato de diseño porque las cuatro salidas terminan la partida (D-01/HIST-02); la decisión queda documentada en el propio componente, no solo en deferred-items.md"
  - "No se añadió aria-describedby: la línea de contexto y el aviso retenido son dos párrafos distintos y 09-UI-SPEC.md no fija ninguna descripción accesible para ellos"

patterns-established: []

requirements-completed: [HIST-01, HIST-02, HIST-03]

# Metrics
duration: 20min
completed: 2026-09-13
---

# Phase 09 Plan 19: Foco y nombre accesible en GameOutcomeDialog Summary

**GameOutcomeDialog.vue gana `aria-labelledby`, foco gestionado al abrir/cerrar (sin depositarse en ningún botón de resultado) y una nota de reconciliación que documenta por escrito por qué `Escape` no se implementa — cierra WR-04.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-13T08:35:00Z (aprox.)
- **Completed:** 2026-09-13T08:49:37Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- El diálogo de fin de partida ahora tiene nombre accesible: `aria-labelledby="game-outcome-heading"` en el `div role="dialog"`, apuntando al `id` del `<h1>` con la pregunta «¿Cómo terminó la partida?».
- El foco entra en el panel (`tabindex="-1"`) al abrirse el diálogo y vuelve al elemento previamente enfocado (guardado desde `document.activeElement`) al cerrarse — sin depositarse nunca en «GANADA» ni en ningún otro botón de resultado (D-02).
- La ausencia de `Escape` queda documentada como decisión de diseño contrastada contra `09-UI-SPEC.md` §Layout 2 y D-01/D-02/HIST-02, citando `deferred-items.md` §WR-04 y `09-VERIFICATION.md` ronda 4 — deja de apoyarse en un motivo de alcance.

## Task Commits

Each task was committed atomically:

1. **Task 1: nombre accesible y foco gestionado, sin empujar hacia ningún resultado** - `2e93b8c` (fix)

**Plan metadata:** (pendiente — se añade en el commit de cierre de este SUMMARY)

## Files Created/Modified
- `app/components/GameOutcomeDialog.vue` - `aria-labelledby`/`id` en el `<h1>`, `tabindex="-1"` + `ref` en el panel interior, `onMounted`/`onUnmounted` para foco de entrada/salida, y nota de reconciliación sobre `Escape` en la cabecera del `<script setup>`.

## Decisions Made
- El foco inicial va al panel, no a ningún botón de resultado (ver `key-decisions` arriba).
- `Escape` y el tocar el velo no cierran el diálogo, a propósito, documentado en el propio fichero.
- No se añadió `aria-describedby` ni trampa de foco (focus trap) cíclica: ninguno de los dos está pedido por `09-UI-SPEC.md`.

## Deviations from Plan

None - plan executed exactly as written. La única corrección durante la ejecución fue de redacción interna: los primeros borradores de los comentarios citaban literalmente los textos de los botones («GANADA», «Salir sin registrar»), lo que habría hecho que los `grep -c` de los criterios de aceptación devolvieran 2-3 en vez de exactamente 1. Se reformularon los comentarios para referirse a "el primer botón de resultado" / "el botón de cierre sin registrar" en vez de citar el texto literal, sin perder claridad. No es un deviation de las reglas 1-4 (no afecta comportamiento ni corrige un bug); se documenta aquí por transparencia sobre el proceso de escritura.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

WR-04 queda cerrado: las dos piezas accionables (nombre accesible, gestión de foco) están implementadas y verificadas por `npm run build` (exit 0) y `npx vitest run` (785 tests, exit 0); la tercera pieza (`Escape`) queda resuelta como decisión de diseño documentada, no pendiente. El cierre formal de la entrada WR-04 en `deferred-items.md` lo escribe el plan 09-23, fuera del alcance de este plan.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*
