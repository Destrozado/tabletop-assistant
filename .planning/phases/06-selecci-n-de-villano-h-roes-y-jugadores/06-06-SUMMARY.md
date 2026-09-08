---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
plan: 06
subsystem: ui
tags: [vue, cableado, foco, atajos-de-teclado, seleccion-heroes]

requires:
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores (plan 01)
    provides: engine/selection.ts (setVillain/setHero/setPlayerName/resolvePlayerSlots/resolveVillainId, todos puros)
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores (plan 02)
    provides: useHeroSearch.ts (buildHeroOptions/buildVillainOptions/findHeroOption/findVillainOption/resolvePlayerLabel/buildTakenByMap/buildDuplicateWarningText), useCharacterCatalogue.ts
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores (plan 04)
    provides: VillainPickerModal.vue y PlayerModal.vue (props/emits ya implementados)
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores (plan 05)
    provides: "StepScreen.vue (selectionRows/duplicateWarningText/select-row), useGameSession.ts (showsSelectionGrid/playerSlots/selectedVillainId/setVillain/setHero/setPlayerName)"
provides:
  - "app/pages/[game]/index.vue cableado por completo: rejilla → apertura de modal → guardado instantáneo → cierre con devolución de foco → supresión de atajos"
  - "Test de regresión D-12 en useStepShortcuts.test.ts"
affects: [06-07 (verificación humana en navegador)]

tech-stack:
  added: []
  patterns:
    - "activeSelectionModal: un único ref discriminado ({kind:'villain'}|{kind:'player',slot}|null) para dos modales de elección, mismo razonamiento que activeDetail para sus dos disparadores informativos"
    - "onSelectRow valida la clave de fila (villain / player-N en rango) ANTES de abrir nada — ninguna cadena arbitraria llega a setHero con un slot fuera de rango"
    - "hasActiveDetail se extiende con un OR, nunca se reimplementa la condición de shortcutsEnabled fuera de la función pura (D-Q2)"

key-files:
  created: []
  modified:
    - "app/pages/[game]/index.vue"
    - "app/composables/__tests__/useStepShortcuts.test.ts"

key-decisions:
  - "Los dos comentarios explicativos que citaban literalmente la cadena `document.activeElement` (uno preexistente, uno nuevo) se reescribieron en prosa sin backticks para que el gate de acceptance-criteria (exactamente 4 apariciones = los 4 sitios de código real) no contara también los comentarios — mismo patrón de falso positivo ya documentado en 06-02/06-04/06-05-SUMMARY.md"

requirements-completed: [SEL-01, SEL-02, SEL-03, SEL-04, SEL-06, SEL-07, SEL-08, SEL-09]

duration: 45min
completed: 2026-09-08
---

# Phase 6 Plan 06: Cableado de la rejilla, los dos modales de selección y supresión de atajos (D-12) Summary

**`app/pages/[game]/index.vue` gana la rejilla de selección (villano + N jugadores), el montaje condicional de `VillainPickerModal`/`PlayerModal` con devolución de foco por las tres vías de cierre, y el único cambio de una línea que cierra D-12: `activeSelectionModal` entra en `hasActiveDetail` sin tocar `useStepShortcuts.ts`.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-08
- **Tasks:** 2/2 completadas
- **Files modified:** 2

## Accomplishments

- `selectionRows` (computed) traduce el catálogo + la sesión en las filas que `StepScreen` ya sabe pintar: `null` fuera de `selection: 'characters'` (SEL-09 — el resto de pasos no cambia respecto a v1.7), fila de villano seguida de una fila por hueco de `playerSlots`, con `'—'` para lo no elegido y `aria-label` exacto por fila.
- `duplicateWarningText` reutiliza `buildDuplicateWarningText` tal cual, sin recomponer la lógica de agrupación aquí (SEL-07/D-16 — avisa, nunca bloquea; ni `onNext` ni `NavBand.vue` se tocan).
- `activeSelectionModal`/`selectionTriggerEl`: un `ref` propio y discriminado para los dos modales de elección — no se reutiliza `activeDetail` (tipado para el modal informativo de un solo botón), evitando el estado imposible "los dos abiertos" con el mismo razonamiento que ya documenta el bloque de `activeDetail`.
- `onSelectRow` valida la clave ANTES de abrir nada: `'villain'` o `player-N` con `N` entero dentro de `[0, playerSlots.length)`; cualquier otra clave es un no-op silencioso — ningún `slot` fuera de rango llega nunca a `setHero`/`setPlayerName` (T-06-19).
- `onSelectVillain`/`onSelectHero` guardan y cierran (D-13); `onPlayerNameInput` guarda en cada pulsación y **nunca** cierra el modal — la única diferencia de comportamiento entre "elegir" y "escribir" que exige D-13.
- `onDismissSelectionModal` es el calco exacto de `onDismissDetail`: cierra y devuelve el foco a `selectionTriggerEl`, cubriendo las tres vías equivalentes (✕/velo/Escape) que ya implementa cada componente modal.
- **D-12, el único cambio real de comportamiento fuera del cableado nuevo:** la línea `hasActiveDetail: activeDetail.value !== null,` pasa a `hasActiveDetail: activeDetail.value !== null || activeSelectionModal.value !== null,` — ni una línea de `useStepShortcuts.ts` tocada, la condición sigue viviendo entera en `shortcutsEnabled` (D-Q2). Con el modal de jugador abierto, Espacio ya no puede colarse por detrás y avanzar el paso mientras alguien teclea un nombre.
- `VillainPickerModal`/`PlayerModal` montados como hermanos posteriores a `WarningDetailModal` (mismo razonamiento D-U3 de apilamiento sin `z-index` nuevo); `PlayerModal` lleva `:key="activeSelectionModal.slot"` para remontarse al cambiar de jugador (el borrador de nombre y la consulta del filtro se reinician, tal como exige `06-UI-SPEC.md`).
- Test de regresión añadido a `useStepShortcuts.test.ts` que nombra explícitamente el caso D-12/modal de jugador, sin tocar ninguno de los tests existentes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Filas de la rejilla, aviso de repetido y listas del catálogo** - `7202d78` (feat)
2. **Task 2: Montaje de los dos modales, devolución de foco y supresión de atajos (D-12)** - `4328a99` (feat)

_Nota: este plan no lleva commit de metadata separado — el orquestador cierra STATE.md/ROADMAP.md tras la ola completa._

## Files Created/Modified

- `app/pages/[game]/index.vue` - Imports de `useCharacterCatalogue`/`useHeroSearch`; `catalogue`/`heroOptions`/`villainOptions` no reactivos; `selectionRows`/`duplicateWarningText` computed; `activeSelectionModal`/`selectionTriggerEl`; `onSelectRow`/`onDismissSelectionModal`/`onSelectVillain`/`onSelectHero`/`onPlayerNameInput`; computeds `activePlayerName`/`activePlayerHeroId`/`activePlayerTakenBy`; el único cambio de `atajosActivos` (D-12); `<StepScreen>` recibe `selection-rows`/`duplicate-warning-text`/`@select-row`; `<VillainPickerModal>`/`<PlayerModal>` montados como hermanos posteriores a `<WarningDetailModal>`.
- `app/composables/__tests__/useStepShortcuts.test.ts` - Un test de regresión nuevo (D-12/modal de jugador) sobre `shortcutsEnabled`, sin modificar ninguno de los existentes.

## Decisions Made

- Ver `key-decisions` en el frontmatter: dos comentarios (uno preexistente en el bloque de `activeDetail`, uno nuevo en `onSelectRow`) citaban literalmente `` `document.activeElement` ``, lo que hacía que el grep de acceptance-criteria (que exige exactamente 4 — los 4 sitios de código real) contara 6. Se reescribieron ambos en prosa sin backticks, sin cambiar el comportamiento del código, dejando el conteo real en 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - falso positivo de redacción, detectado antes de commitear] Comentarios citaban literalmente la cadena que su propio gate de acceptance-criteria cuenta por grep**
- **Found during:** Task 2, verificación de acceptance criteria antes de commitear.
- **Issue:** El comentario preexistente del bloque `activeDetail` (línea ~239, ya presente antes de este plan) y el nuevo comentario de `onSelectRow` citaban ambos, entre backticks, la cadena literal `document.activeElement` — sumando 2 apariciones de comentario a las 4 de código real, y el criterio del plan exige exactamente 4 (los 4 sitios de código).
- **Fix:** reescritos ambos comentarios en prosa ("leyendo el elemento activo del documento") sin reproducir la cadena literal exacta. Cero cambio de comportamiento — solo texto explicativo.
- **Files modified:** `app/pages/[game]/index.vue`.
- **Verification:** `grep -c "document.activeElement" 'app/pages/[game]/index.vue'` devuelve 4 tras el ajuste; `npm test`/`npm run build` en verde.
- **Committed in:** `4328a99` (Task 2) — corregido antes del commit, no como commit separado.

---

**Total deviations:** 1 auto-fixed (1 falso positivo de redacción de comentario, ningún cambio de comportamiento).
**Impact on plan:** Ninguno sobre el comportamiento — el patrón ya estaba documentado como riesgo conocido en 06-02/06-04/06-05-SUMMARY.md y se resolvió de la misma forma.

## Issues Encountered

**Entorno: `.nuxt/tsconfig.app.json` no existía al arrancar** (bloqueante, Rule 3) — `npm test` fallaba en los 19 ficheros con `TSCONFIG_ERROR` antes de tocar ningún fichero de este plan (mismo hallazgo ya documentado en 06-01/06-02-SUMMARY.md para worktrees recién creados). Se ejecutó `npx nuxt prepare` para regenerar `.nuxt/` (no versionado, gitignored, sin cambios en el repo) y la suite volvió a verde (19/464) antes de empezar la Task 1.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `app/pages/[game]/index.vue` queda completamente cableado: la rejilla de selección se pinta solo en el paso que declara `selection: 'characters'`, los dos modales se abren/cierran/guardan según el contrato de `06-UI-SPEC.md`, el foco vuelve a la fila que abrió cada modal, y D-12 queda cerrado sin tocar `useStepShortcuts.ts`.
- `npm test`: 19 ficheros / **465** tests en verde (baseline al empezar: 19/464 — +1 test, el de regresión D-12).
- `npm run build` sale con exit code 0.
- `git diff --name-only 776d04f HEAD` lista exactamente los dos ficheros declarados en `files_modified` del plan — ningún otro fichero tocado.
- **Sin verificación visual en navegador** — eso es tarea explícita del plan 06-07 (no hay entorno de test de componentes, `06-RESEARCH.md` Q7, decisión ya heredada de 06-04-SUMMARY.md).
- Sin bloqueantes conocidos para el plan siguiente.

## Known Stubs

Ninguno. Toda la lógica añadida es funcional y consumible tal cual — no hay datos mock, ninguna rama sin implementar, ningún placeholder de texto.

## Threat Flags

Ninguno. La superficie nueva de este plan (validación de la clave de fila en `onSelectRow`, el `heroId`/`villainId` que puede no existir en el catálogo, el nombre del jugador interpolado) coincide exactamente con la ya prevista en el `<threat_model>` del plan (T-06-18/T-06-19/T-06-20/T-06-21/T-06-22) y queda mitigada tal como se especifica ahí: `useStepShortcuts.ts` sin tocar, `onSelectRow` valida rango antes de abrir, `findHeroOption`/`findVillainOption` resuelven a `null`→`'—'`, ningún `v-html`, `onNext`/`NavBand.vue` intactos.

---
*Phase: 06-selecci-n-de-villano-h-roes-y-jugadores*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: `app/pages/[game]/index.vue`
- FOUND: `app/composables/__tests__/useStepShortcuts.test.ts`
- FOUND: `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-06-SUMMARY.md`
- FOUND: commit `7202d78` (Task 1)
- FOUND: commit `4328a99` (Task 2)
- FOUND: commit `ef348d1` (SUMMARY.md)
