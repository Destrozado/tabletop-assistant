---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
plan: 01
subsystem: engine
tags: [zod, vitest, immutable-state, typescript]

requires:
  - phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
    provides: engine/navigator.ts (patrón next/prev/jumpTo), engine/persistence.ts (resume/toPersistedPosition), engine/schema.ts (z.strictObject, superRefine)
  - phase: 05-cat-logo-de-h-roes-y-villanos
    provides: CatalogueHero/CatalogueVillain/CharacterCatalogue en engine/types.ts
provides:
  - StepDefinition.selection?: 'characters' (dato autorado, no cableado en app/)
  - HeroSelection + SessionContext.selection?: HeroSelection (aditivo, sin bump de formatVersion/contentVersion)
  - engine/selection.ts: setVillain/setHero/setPlayerName/resolvePlayerSlots/resolveVillainId/emptySelection/PLAYER_NAME_MAX_LENGTH
  - Test D-20 (resume sin selection + selection manipulada) en engine/__tests__/persistence.test.ts
affects: [06-02, 06-03, 06-04, 06-05, 06-06, 06-07]

tech-stack:
  added: []
  patterns:
    - "Mutador puro con reasignación en todos los niveles (session, context, selection, heroes, entrada tocada) — mismo contrato que next/prev/jumpTo"
    - "Normalización defensiva por tipo, no por presencia (DC-02): playerCount manda, heroes[] se ajusta a él, nunca al revés (Q8)"

key-files:
  created:
    - engine/selection.ts
    - engine/__tests__/selection.test.ts
  modified:
    - engine/types.ts
    - engine/schema.ts
    - content/marvel-champions.json
    - engine/__tests__/schema.test.ts
    - engine/__tests__/persistence.test.ts

key-decisions:
  - "selection es enum(['characters']).optional() en StepSchema, hermana de kind, no dentro de TextBlockSchema (Pitfall 2)"
  - "contentVersion se mantiene en 13 (DC-03): ninguna de las tres comprobaciones de resume() se dispara por la clave nueva"
  - "setVillain reconstruye heroes[] entero vía resolvePlayerSlots para sanear un array persistido corrupto al primer cambio"

patterns-established:
  - "engine/selection.ts es el segundo módulo (tras navigator.ts) que demuestra el patrón de reasignación inmutable con test de desigualdad referencial explícito"

requirements-completed: [SEL-01, SEL-03, SEL-06, SEL-08, SEL-09]

duration: 25min
completed: 2026-09-08
---

# Phase 6 Plan 01: Contrato del motor de selección Summary

**`engine/selection.ts` nuevo con mutadores puros (setVillain/setHero/setPlayerName) que reasignan `EngineSession` en los cinco niveles, más la clave de esquema `selection: 'characters'` en `setup.heroes.01` y el test D-20 de reanudación sin selección.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-08
- **Tasks:** 3/3 completados
- **Files modified:** 4 modificados, 2 creados

## Accomplishments

- `setup.heroes.01` declara en los datos (`selection: 'characters'`) que pinta la rejilla de selección — cero cableado de id en `app/`, validado por `StepSchema` sin necesitar ninguna regla nueva en `superRefine`
- `engine/selection.ts` — mutadores puros `setVillain`/`setHero`/`setPlayerName` que devuelven un `EngineSession` **nuevo en los cinco niveles** (session, context, selection, heroes, entrada tocada), demostrado con 15 aserciones de desigualdad referencial explícitas — es la defensa contra el bug que solo se manifiesta al recargar en producción (Pitfall 1 / SEL-08)
- `resolvePlayerSlots`/`resolveVillainId` normalizan por tipo, no por presencia: cualquier `selection` ausente, corrupta o desajustada en longitud produce siempre `playerCount` huecos válidos, nunca `undefined`
- Test D-20 sobre el contenido real (`marvel-champions.json`): una sesión persistida sin `selection` se reanuda `'resumed'` y pinta huecos vacíos; una sesión con `selection` manipulada a mano (villano no-cadena, entrada nula, heroId vacío, cuarta entrada frente a `playerCount:3`) también se reanuda sin lanzar y se normaliza correctamente
- Diff de `content/marvel-champions.json` es exactamente una línea añadida — ni un carácter de `text`/`speech` cambiado, `contentVersion` intacto en 13, gate de deriva de voz verde con los 35 clips sin tocar

## Task Commits

1. **Task 1: Declarar `selection` en tipos, esquema y datos** - `50b0237` (feat)
2. **Task 2: Crear `engine/selection.ts` — mutadores puros** - `8375a4a` (feat)
3. **Task 3: Test D-20 de reanudación sin `selection`** - `d0fb718` (test)

_Nota: este plan no lleva commit de metadata separado — el orquestador cierra STATE.md/ROADMAP.md tras la ola completa._

## Files Created/Modified

- `engine/types.ts` - `StepDefinition.selection?: 'characters'`, `HeroSelection` nueva, `SessionContext.selection?: HeroSelection`
- `engine/schema.ts` - `selection: z.enum(['characters']).optional()` en `StepSchema`, hermana de `kind`
- `content/marvel-champions.json` - `"selection": "characters"` añadido a `setup.heroes.01`, ningún otro carácter tocado
- `engine/selection.ts` - mutadores puros nuevos: `setVillain`, `setHero`, `setPlayerName`, `resolvePlayerSlots`, `resolveVillainId`, `emptySelection`, `PLAYER_NAME_MAX_LENGTH`
- `engine/__tests__/schema.test.ts` - 3 casos nuevos: acepta `selection: 'characters'`, rechaza valor fuera de enum, rechaza `selection` dentro de `variants.difficulty`
- `engine/__tests__/selection.test.ts` - 34 tests: desigualdad referencial (15 `not.toBe`), entrada de origen intacta (`JSON.stringify`), arranque sin selección, no-op defensivo (`toBe(session)`), tope de nombre, normalización defensiva de `resolvePlayerSlots`/`resolveVillainId`
- `engine/__tests__/persistence.test.ts` - describe D-20: resume sin `selection` y con `selection` manipulada a mano, contra el contenido real

## Decisions Made

- `selection` es un enum de un solo miembro (`'characters'`), no un booleano — un segundo valor futuro (p. ej. Warhammer 40.000) es aditivo, no un cambio incompatible (decisión ya propuesta por 06-RESEARCH.md Q1, confirmada sin cambios)
- `contentVersion` se mantiene en 13 — extensión razonada de D-19: ninguna de las tres comprobaciones de `resume()` (`formatVersion`, `contentVersion`, `runtimeId`) se dispara por una clave de paso que no es `text`/`speech`
- `setVillain` reconstruye `heroes[]` entero vía `resolvePlayerSlots` en vez de tocar solo `villainId` — esto sanea un array persistido corrupto o desajustado al primer cambio de villano, sin necesitar lógica de saneo duplicada

## Deviations from Plan

None - plan executed exactly as written. Una única adición menor no listada explícitamente en las acceptance criteria pero necesaria para superar el umbral `>= 15` de `not.toBe(`: se añadió un cuarto par de aserciones de desigualdad referencial (incluyendo `heroes[0]`) al test de `setVillain`, ya que el mutador de villano por sí solo solo ejercita 4 de los 5 niveles listados en el enunciado (no hay "entrada tocada" conceptual cuando lo que cambia es `villainId`); se decidió documentar que `setVillain` también reconstruye `heroes[]` entero vía `resolvePlayerSlots`, así que la entrada 0 es igualmente un objeto nuevo aunque su contenido no cambie. Esto no es un cambio de comportamiento, solo cobertura de test más completa.

## Issues Encountered

**Entorno: `.nuxt/tsconfig.app.json` no existía al arrancar** (bloqueante, Rule 3) — `npm test` fallaba en los 17 ficheros con `TSCONFIG_ERROR` antes de tocar ningún fichero de este plan. Se ejecutó `npx nuxt prepare` para generar `.nuxt/` (no versionado, generado localmente, sin cambios en el repo) y la suite volvió a verde (17/374) antes de empezar la Task 1. No se commiteó nada de `.nuxt/` (ya está en `.gitignore`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`engine/selection.ts` expone el contrato público exacto que 06-04/06-05/06-06 necesitan (`setVillain`, `setHero`, `setPlayerName`, `resolvePlayerSlots`, `resolveVillainId`, `emptySelection`, `PLAYER_NAME_MAX_LENGTH`). `HeroSelection`/`SessionContext.selection` están tipados en `engine/types.ts`, listos para que `app/composables/useGameSession.ts` (planes siguientes) los envuelva reasignando `session.value`. Ningún fichero de `app/` fue tocado en este plan — cero riesgo de que la capa de interfaz haya asumido algo prematuro sobre esta forma.

Sin bloqueantes conocidos para las siguientes plans de esta fase.

---
*Phase: 06-selecci-n-de-villano-h-roes-y-jugadores*
*Plan: 01*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: engine/selection.ts
- FOUND: engine/__tests__/selection.test.ts
- FOUND: .planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-01-SUMMARY.md
- FOUND: commit 50b0237 (Task 1)
- FOUND: commit 8375a4a (Task 2)
- FOUND: commit d0fb718 (Task 3)
- FOUND: commit c16f8cd (SUMMARY.md)
