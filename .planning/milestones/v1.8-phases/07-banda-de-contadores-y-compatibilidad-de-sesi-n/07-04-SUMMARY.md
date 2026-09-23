---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 04
subsystem: ui
tags: [vue, composable, vitest, typescript, counters]

# Dependency graph
requires:
  - phase: 07-01
    provides: "CounterState (villainHealth/heroHealth nullable) y SessionContext.counters? exportados desde engine/types.ts"
  - phase: 07-02
    provides: "engine/counters.ts — resolveCounterValues/incrementVillain/decrementVillain/incrementHero/decrementHero"
provides:
  - "app/composables/useGameSession.ts ampliado — buildCounterCells (función pura exportada), CounterCell (interfaz exportada), showsCounterBand, counterCells, incrementCounter, decrementCounter"
  - "app/composables/__tests__/useGameSession.test.ts — 10 tests que fijan el literal «SIN VIDA», el EM DASH «—», el formato de claves 'villano'/'jugador-N' y el fallback «Jugador N»"
affects: ["07-05"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Función pura exportada a nivel de módulo, al lado de su cableado reactivo (mismo patrón que useStepShortcuts.ts): buildCounterCells es testeable sin Vue"
    - "Mutador de una sola sentencia de reasignación de session.value por rama de clave, sin duplicar la guarda de rango que el motor ya aplica"
    - "Visibilidad derivada de un flag de dato (sectionRepeats === true), nunca de un id de contenido hardcodeado"

key-files:
  created: [app/composables/__tests__/useGameSession.test.ts]
  modified: [app/composables/useGameSession.ts]

key-decisions:
  - "Tarea 1 (tdd=\"true\") no incluye un fichero de test en su files_modified — la fijación permanente del comportamiento es explícitamente el objeto de la Tarea 2. Se verificó el comportamiento de buildCounterCells contra el bloque <behavior> antes de comprometer el commit de la Tarea 1, y la suite completa (vitest run) se mantuvo en verde en todo momento; la fijación con test formal llegó en el commit de la Tarea 2, tal como el propio plan lo estructura."
  - "Import del test vía ruta relativa ../useGameSession, no ~/composables/useGameSession como sugería el texto del plan — replica el patrón ya establecido y verificado en useHeroSearch.test.ts (mismo proyecto app-logic, mismo entorno node); ambas formas resuelven al mismo módulo bajo vitest.config.ts, se eligió la que ya tiene precedente en el repo."

requirements-completed: [HP-01, HP-03, HP-05, HP-06, HP-07]

duration: 20min
completed: 2026-09-08
---

# Phase 7 Plan 4: Costura reactiva de los contadores (visibilidad, celdas y mutadores) Summary

**`useGameSession.ts` ampliado con `buildCounterCells` (función pura), `showsCounterBand`/`counterCells` y dos mutadores de una sola sentencia — fijado con 10 tests que pinnean el literal «SIN VIDA», el EM DASH y el formato de claves**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-08T14:22:00Z (aprox., tras el reset a la base fa22a19)
- **Completed:** 2026-09-08T14:44:13Z
- **Tasks:** 2/2
- **Files modified:** 2 (1 modificado, 1 creado)

## Accomplishments
- `buildCounterCells(values, slots)` exportada como función pura a nivel de módulo: celda de villano fija con etiqueta «VILLANO» y `defeated` siempre `false` (D-11, incluso a 0), celdas de jugador con `resolvePlayerLabel` reutilizado para el fallback «Jugador N» y el sufijo exacto `· SIN VIDA` (constante única `DEFEATED_SUFFIX`) cuando el valor es `0` por comparación estricta (D-12).
- `showsCounterBand` deriva de `currentNode.value?.sectionRepeats === true`, sin ninguna comparación contra el id de contenido `'ronda'` en todo `app/` (confirmado por grep).
- `counterCells` compone `resolveCounterValues` (motor) + `resolvePlayerSlots` (motor) + `getCatalogue` (`useCharacterCatalogue`, instanciado una sola vez dentro de `useGameSession()`) y devuelve el modelo de vista listo para `CounterBand.vue` sin que ese componente necesite importar `~~/engine/*`.
- `incrementCounter(key)`/`decrementCounter(key)`: guarda `if (!session.value) return` + una única sentencia de reasignación por rama (`'villano'` → `engineIncrementVillain`/`engineDecrementVillain`; `'jugador-N'` → `engineIncrementHero`/`engineDecrementHero`), sin validar el rango de `slot` (el motor ya es no-op seguro), cualquier otra clave es un no-op silencioso.
- 10 tests nuevos en `app/composables/__tests__/useGameSession.test.ts` que fijan: EM DASH para valor desconocido, celda de villano primera con etiqueta fija, número como cadena (incluido `0`), fallback «Jugador N» base 1, etiqueta `'Ana · SIN VIDA'` carácter a carácter en 0, reversibilidad a etiqueta limpia en 1, inmunidad del villano a `defeated` en 0, formato exacto de claves, conteo `slots.length + 1` con 1-4 jugadores, y la no-colapsión estricta de `null` vs `0`.
- `npx vitest run` completo: 512/512 en verde (502 preexistentes + 10 nuevos). Diff limitado exactamente a los dos ficheros de `files_modified`.

## Task Commits

1. **Task 1: Añadir `buildCounterCells`, `showsCounterBand`, `counterCells` y los mutadores a `useGameSession.ts`** - `2feaa3f` (feat)
2. **Task 2: Fijar con test el literal «SIN VIDA», el «—», el formato de claves y el fallback «Jugador N»** - `b99a79b` (test)

**Plan metadata:** (pendiente — commit final de este plan, gestionado por el orquestador tras la fusión de la ola)

## Files Created/Modified

- `app/composables/useGameSession.ts` - Ampliado con `CounterCell` (interfaz exportada), `buildCounterCells` (función pura exportada a nivel de módulo), `showsCounterBand`/`counterCells` (computeds) e `incrementCounter`/`decrementCounter` (mutadores), añadidos al objeto `return`.
- `app/composables/__tests__/useGameSession.test.ts` - 118 líneas, 1 `describe` con 10 `it`, uno por regla de `buildCounterCells`.

## Decisions Made

- **Estructura tdd de la Tarea 1 sin fichero de test propio:** el plan asigna `tdd="true"` a la Tarea 1 pero limita sus `files_modified` a `useGameSession.ts` únicamente, dejando la fijación con test para la Tarea 2 (sin el atributo `tdd`). Se respetó la estructura explícita del plan: se verificó el comportamiento de `buildCounterCells` contra el bloque `<behavior>` de la Tarea 1 antes de comprometer su commit (`npx vitest run` completo en verde en todo momento, sin ninguna regresión), y la fijación permanente por test llegó en el commit de la Tarea 2, tal como el plan lo estructura literalmente. No es una desviación: es la secuencia de tareas tal como está escrita.
- **Import relativo en el test (`../useGameSession`) en vez de `~/composables/useGameSession`:** el bloque `<action>` de la Tarea 2 sugiere la ruta con alias `~`, pero el análogo directo del propio plan (`useHeroSearch.test.ts`) usa import relativo dentro del mismo proyecto `app-logic`/entorno `node`. Se siguió el patrón con precedente real en el repo; ambas rutas resuelven al mismo módulo bajo la configuración de alias de `vitest.config.ts`, así que no hay pérdida de cobertura ni de fidelidad al contrato.
- **Instanciación de `useCharacterCatalogue()` a nivel de `useGameSession()`, no dentro de `start()`:** el plan pedía colocarla «al lado de `useGameContent()`», pero `useGameContent()` solo se llama dentro de `start(gameId, context)`, no a nivel de módulo. Se instanció `getCatalogue` una sola vez al inicio de `useGameSession()` (junto a `const session = ref(...)`) porque `counterCells`/`incrementCounter`/`decrementCounter` la necesitan disponible en cualquier momento del ciclo de vida del composable, no solo durante `start()`. Fidelidad a la intención del plan (instanciar una sola vez, sin recrear el objeto en cada llamada), ajustando el punto exacto de colocación a la estructura real del fichero.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comentarios propios duplicaban literales que sus propios gates de acceptance_criteria comprobaban**
- **Found during:** Task 1 (verificación de `acceptance_criteria` tras la implementación)
- **Issue:** Los comentarios explicativos añadidos junto a `showsCounterBand` y `DEFEATED_SUFFIX` citaban textualmente `sectionRepeats === true`, `'ronda'` y `SIN VIDA` en prosa, haciendo que los grep de `acceptance_criteria` (que exigen exactamente 1 ocurrencia de cada literal en todo el fichero, o 0 para `'ronda'`) fallaran por un segundo match dentro del propio comentario — no del código.
- **Fix:** Se reescribieron los tres comentarios para describir la misma regla sin repetir el literal exacto que el propio criterio fija como único (p. ej. "se deriva del flag `sectionRepeats` del motor" en vez de citar `sectionRepeats === true`; "el id de contenido del paso de rondas" en vez de `'ronda'`; referencia al literal "definido abajo" en vez de repetir `SIN VIDA` en el comentario de `DEFEATED_SUFFIX`).
- **Files modified:** `app/composables/useGameSession.ts`
- **Verification:** Los 13 grep de `acceptance_criteria` de la Tarea 1 se re-ejecutaron uno a uno tras el ajuste — todos devuelven el conteo exacto esperado (`sectionRepeats === true` → 1, `'ronda'` en el fichero → 0, `SIN VIDA` → 1, y `grep -rc "'ronda'"`/`grep -rc 'SIN VIDA'` en `app/` señalan únicamente este fichero, sin ninguna otra línea).
- **Committed in:** `2feaa3f` (commit de la Tarea 1; el ajuste se hizo antes de comprometer, no hubo un commit intermedio roto)

---

**Total deviations:** 1 auto-fijado (bug de documentación, sin impacto en comportamiento)
**Impact on plan:** El fix es puramente de comentarios (prosa explicativa), cero cambio de lógica o de comportamiento. Sin scope creep sobre el contrato de datos ni sobre la forma de las funciones pactada en el plan.

## Issues Encountered

- El worktree arrancó con HEAD por detrás de la base esperada (`fa22a19...`): la verificación de `<worktree_branch_check>` detectó que el HEAD real era ancestro de la base, no igual a ella, y aplicó el `git reset --hard` previsto para ese caso exacto (ya contemplado en el propio protocolo de arranque, no una desviación de este plan).
- `.nuxt/tsconfig.app.json` no existía al arrancar (necesario para que `vitest`/`vite:oxc` resuelva los `import type` de Nuxt) — se ejecutó `npx nuxt prepare` para regenerarlo antes de correr cualquier test; operación de preparación de entorno, no una instalación de paquete nuevo (no aplica la exclusión de Rule 3).
- Se intentó `npx vue-tsc --noEmit` como verificación adicional de tipos más allá de `vitest`; falló por un problema de resolución de módulos del propio `vue-tsc` descargado por `npx` (`ERR_PACKAGE_PATH_NOT_EXPORTED` contra la versión de `typescript` instalada), no relacionado con el código de este plan. El proyecto no declara ningún script `typecheck` en `package.json`, así que esta verificación queda fuera del alcance real de CI del repo; se confió en `npx vitest run` completo (que sí transforma y ejecuta el TypeScript de los ficheros tocados) como gate de correctness.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `CounterBand.vue` (plan 05) puede consumir `showsCounterBand`/`counterCells`/`incrementCounter`/`decrementCounter` de `useGameSession()` tal cual quedaron fijados aquí, sin reinterpretar la forma de `CounterCell` ni el formato de claves (`'villano'` | `` `jugador-${i}` ``).
- Sin bloqueos para el plan 05 de esta ola.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: app/composables/useGameSession.ts
- FOUND: app/composables/__tests__/useGameSession.test.ts
- FOUND: 07-04-SUMMARY.md
- FOUND: 2feaa3f (feat commit)
- FOUND: b99a79b (test commit)
- FOUND: dd4c341 (docs commit)
