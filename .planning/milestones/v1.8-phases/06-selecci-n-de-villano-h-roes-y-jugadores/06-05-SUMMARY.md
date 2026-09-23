---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
plan: 05
subsystem: ui
tags: [vue, tailwind, composables, immutable-state, selection-grid]

requires:
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores (plan 01)
    provides: engine/selection.ts (setVillain/setHero/setPlayerName/resolvePlayerSlots/resolveVillainId, todos puros)
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores (plan 02)
    provides: useHeroSearch.ts (etiquetas por defecto, detección de duplicados) — no consumido aún, es del plan 06-06
provides:
  - "StepScreen.vue: props selectionRows?/duplicateWarningText? + emit select-row, rejilla de una columna"
  - "useGameSession.ts: setVillain/setHero/setPlayerName (mutadores por reasignación) + showsSelectionGrid/playerSlots/selectedVillainId"
affects: [06-06]

tech-stack:
  added: []
  patterns:
    - "Mutador de composable = guarda + una sola reasignación de session.value al valor devuelto por la función pura del motor (nunca escritura anidada)"
    - "Componente StepScreen sigue siendo tonto: la rejilla se resuelve fuera y llega ya compuesta en props, sin importar ningún tipo del motor"

key-files:
  created: []
  modified:
    - app/components/StepScreen.vue
    - app/composables/useGameSession.ts

key-decisions:
  - "El aviso de héroe repetido usa exclusivamente la rama <p> (nunca <button>) copiada verbatim del fallback ya existente para optionsWarningText, sin afordancia alguna (D-16/D-32)"
  - "showsSelectionGrid es el único punto de la capa de interfaz que lee step.selection === 'characters'; ningún otro fichero de app/ compara contra el id fijo del paso"

patterns-established: []

requirements-completed: [SEL-01, SEL-03, SEL-07, SEL-08, SEL-09]

duration: 20min
completed: 2026-09-08
---

# Phase 6 Plan 05: Rejilla de selección en StepScreen + mutadores en useGameSession Summary

**`StepScreen.vue` gana una rejilla de selección de una columna (props `selectionRows`/`duplicateWarningText`, emit `select-row`) y `useGameSession.ts` gana tres mutadores (`setVillain`/`setHero`/`setPlayerName`) que reasignan `session.value` entero delegando en los mutadores puros de `engine/selection.ts`, más las computeds `showsSelectionGrid`/`playerSlots`/`selectedVillainId`.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-08
- **Tasks:** 2/2 completados
- **Files modified:** 2

## Accomplishments

- `StepScreen.vue` extendido sin tocar una sola línea de su comportamiento actual: nuevo bloque de rejilla (`ELECCIÓN` + filas de una columna) insertado exactamente entre la frase de acción (`text-display`, intacta) y el bloque `options[]` existente, reutilizando literalmente la clase de fila `border-b border-accent/50` + chevron `›` que ya usaba `options[]`
- El aviso `⚠` de héroe repetido es un `<p>` sin borde, sin chevron y sin `@click` — no existe ninguna ruta desde ahí hacia ningún modal
- `useGameSession.ts` gana tres mutadores calcados línea a línea de `next`/`prev`/`jumpTo`: guardan `if (!session.value) return` y hacen una única reasignación `session.value = engineSetX(...)`, sin escribir en ninguna propiedad anidada — verificado con un grep que exige 0 escrituras del tipo `session.value.context.<algo> =` o indexado de `heroes[...]` fuera de comentarios
- `showsSelectionGrid` es el único sitio de toda la capa de interfaz que decide si un paso pinta la rejilla, leyendo `currentNode.value?.step.selection === 'characters'` — nunca comparando contra el id del paso
- `playerSlots`/`selectedVillainId` envuelven `resolvePlayerSlots`/`resolveVillainId` del motor puro (plan 06-01), heredando su normalización defensiva por tipo

## Task Commits

1. **Task 1: StepScreen.vue — rejilla de selección de una columna y línea ⚠ no pulsable** - `79f4684` (feat)
2. **Task 2: useGameSession.ts — mutadores por reasignación y computeds de selección** - `29fe1b9` (feat)

_Nota: este plan no lleva commit de metadata separado — el orquestador cierra STATE.md/ROADMAP.md tras la ola completa._

## Files Created/Modified

- `app/components/StepScreen.vue` - Props `selectionRows`/`duplicateWarningText` (`withDefaults`), emit `select-row`, bloque de rejilla de una columna + línea `⚠` no pulsable
- `app/composables/useGameSession.ts` - Import de `engine/selection.ts` con alias `engineX`; mutadores `setVillain`/`setHero`/`setPlayerName`; computeds `showsSelectionGrid`/`playerSlots`/`selectedVillainId`; las seis entradas añadidas al `return` final sin reordenar las existentes

## Decisions Made

- Ninguna decisión arquitectónica nueva — el plan especifica el markup y las firmas al carácter y ambas tareas se ejecutaron replicando exactamente los patrones señalados (`options[]` para la fila, `next`/`prev`/`jumpTo` para los mutadores)
- Dos comentarios explicativos tuvieron que reformularse para no contener literalmente las cadenas `engine/` y `setup.heroes.01` (ver Deviations) — no afecta al comportamiento, solo a la prosa del comentario

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - bug propio, detectado antes de commitear] Comentarios explicativos citaban literalmente las cadenas prohibidas por los gates de acceptance-criteria**
- **Found during:** verificación de acceptance criteria de ambas tareas, antes de cada commit
- **Issue:** al explicar en prosa qué NO se importa/qué NO se compara, un comentario de `StepScreen.vue` citaba literalmente `` `~~/engine/*` `` (activando el gate `grep -c "engine/" ... devuelve 0`) y un comentario de `useGameSession.ts` citaba literalmente `` `setup.heroes.01` `` (activando el gate `grep -rc "setup.heroes.01" app/` sin coincidencias). Ambos eran falsos positivos: el código en sí cumplía la regla, pero el texto explicativo reproducía la cadena que el propio gate prohíbe.
- **Fix:** reescritos ambos comentarios para transmitir el mismo significado sin reproducir la cadena literal exacta ("ningún tipo del motor puro" en vez de la ruta `~~/engine/*`; "el identificador fijo del paso de héroes" en vez de citar el id literal)
- **Files modified:** `app/components/StepScreen.vue`, `app/composables/useGameSession.ts`
- **Commit:** incluido en `79f4684` y `29fe1b9` (corregido antes de cada commit, no como commit separado)

---

**Total deviations:** 1 auto-fixed (1 bug propio de comentario, sin impacto de comportamiento)
**Impact on plan:** Ninguno sobre el comportamiento — ambos ajustes son puramente de prosa en comentarios, verificados contra los gates exactos del plan tras la corrección.

## Issues Encountered

Ninguno más allá de lo documentado arriba. El baseline de 19 ficheros / 464 tests se confirmó verde antes de empezar (tras `npx nuxt prepare` para regenerar `.nuxt/`, no versionado) y se mantuvo verde tras ambas tareas.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

El contrato de interfaz que 06-06 necesita ya existe tal cual lo describe `<interfaces>` del plan: `StepScreen.vue` acepta `selectionRows`/`duplicateWarningText` y emite `select-row`; `useGameSession()` expone `showsSelectionGrid`/`playerSlots`/`selectedVillainId`/`setVillain`/`setHero`/`setPlayerName`. Ningún fichero de `app/pages/` fue tocado en este plan (`git diff app/pages/` vacío) — el cableado de la página (abrir `VillainPickerModal`/`PlayerModal`, gestión de foco, `activeSelectionModal`, atajos de teclado) queda íntegro para el plan 06-06, sin ninguna suposición prematura asumida aquí.

Sin bloqueantes conocidos para el plan siguiente.

---
*Phase: 06-selecci-n-de-villano-h-roes-y-jugadores*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: app/components/StepScreen.vue
- FOUND: app/composables/useGameSession.ts
- FOUND: .planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-05-SUMMARY.md
- FOUND: commit 79f4684 (Task 1)
- FOUND: commit 29fe1b9 (Task 2)
