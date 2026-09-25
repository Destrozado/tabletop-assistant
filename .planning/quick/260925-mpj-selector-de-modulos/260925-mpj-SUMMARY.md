---
phase: quick-260925-mpj
plan: 01
subsystem: content-catalogue
tags: [zod, marvelcdb, encounter-sets, selection-ui, vue, marvel-champions]

requires:
  - phase: quick-260925-m2k
    provides: computeInitialVillainHealth con expertStartStage por villano
provides:
  - Klaw en el catálogo de villanos (core, set klaw)
  - baseSets/modules en content/marvel-characters.json (D-01)
  - engine/encounterSets.ts (resolveModuleIds/orderModulesForVillain/setModules/toggleModule/resolveEncounterSetNames)
  - HeroSelection.moduleIds y StepValueKind 'encounterSets'
  - Fila «Módulos» + ModulePickerModal.vue + línea de conjuntos en StepScreen
affects: [selección de personajes, setup.encuentros, catálogo de MarvelCDB]

tech-stack:
  added: []
  patterns:
    - "Módulo puro engine/encounterSets.ts hermano de selection.ts/counters.ts, importa de selection.ts en un único sentido para evitar ciclos"
    - "Tercera forma de salida de stepValues (resolveStepValueText) junto a resolveStepValue/resolveStepValueRows"
    - "moduleIds como campo aditivo de HeroSelection, mismo patrón que selection/counters/startedAt en SessionContext"

key-files:
  created:
    - engine/encounterSets.ts
    - engine/__tests__/encounterSets.test.ts
    - app/components/ModulePickerModal.vue
  modified:
    - scripts/catalogue/fetch-marvelcdb.mjs
    - content/marvel-characters.json
    - content/marvel-champions.json
    - engine/types.ts
    - engine/catalogueSchema.ts
    - engine/schema.ts
    - engine/selection.ts
    - engine/stepValues.ts
    - app/composables/useGameSession.ts
    - app/components/StepScreen.vue
    - "app/pages/[game]/index.vue"

key-decisions:
  - "Klaw entra al catálogo (core, set klaw): 01113/01114/01115, expertStartStage 2, comprobado contra la carta 1A (01116a)"
  - "recommendedModuleId y encounterSetName son obligatorios en CatalogueVillain; el script aborta sin escribir si el recomendado a mano no coincide con el texto de la carta 1A"
  - "moduleIds vive dentro de HeroSelection, undefined = recomendado del villano, [] explícito = el grupo desmarcó todo"
  - "setVillain reinicia moduleIds al cambiar de villano, lo conserva si es el mismo villano (D-05)"
  - "La línea de setup.encuentros.01 usa encounterSetName (nombre español de la carta), no el name inglés del catálogo"
  - "exp_kang queda excluido de ENCOUNTER_MODULES a propósito: es el set de villano Experto de Kang, ya cubierto por setup.escenario.04"

patterns-established:
  - "Pattern: nuevo StepValueKind con su propia función resolveStepValueXxx en stepValues.ts, sin tocar las existentes"
  - "Pattern: modal multiselección calcado de un modal de elección única existente (ModulePickerModal de VillainPickerModal), con botón 'Hecho' explícito en vez de cierre-al-tocar"

requirements-completed: [QUICK-260925-mpj]

duration: 55min
completed: 2026-09-25
---

# Quick 260925-mpj: Selector de módulos de encuentro Summary

**Klaw añadido al catálogo con módulo recomendado verificado contra MarvelCDB, selector multiselección de módulos de encuentro (Core Set + Antiguo y futuro Kang) con el recomendado del villano por defecto, y línea "Rino · Normal · Experto · Amenaza de bomba" en el paso de reunir conjuntos.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3
- **Files modified/created:** 20 (17 modified, 3 nuevos: engine/encounterSets.ts, engine/__tests__/encounterSets.test.ts, app/components/ModulePickerModal.vue)

## Accomplishments

- El catálogo (`content/marvel-characters.json`) regenerado por `scripts/catalogue/fetch-marvelcdb.mjs` desde datos reales de MarvelCDB (ES/EN): Klaw añadido, `baseSets`/`modules` (8 módulos: 5 de core + 3 de Kang con dificultad 4/6/8), y `encounterSetName`/`recommendedModuleId` por villano — el script comprobó cada recomendado contra el texto de la carta 1A antes de escribir (verificado con una corrupción deliberada de prueba que abortó sin escribir, revertida).
- Motor puro `engine/encounterSets.ts`: resolución defensiva de `moduleIds` (localStorage editable), orden con el recomendado primero, mutadores puros `setModules`/`toggleModule`, y `resolveEncounterSetNames` para la línea de texto.
- Interfaz: fila «Módulos» en la rejilla de selección, modal `ModulePickerModal.vue` (sets base informativos + módulos adicionales multiselección con «Recomendado»/«Dificultad N»), y línea de conjuntos bajo la frase grande de `setup.encuentros.01` — sin tocar ningún `speech` (verificado: `git diff` de `scripts/voice/manifest.json` vacío).

## Task Commits

Each task was committed atomically:

1. **Task 1: Catálogo — Klaw, sets base, módulos y recomendado por villano** - `646e41f` (feat)
2. **Task 2: Motor — moduleIds en la selección, resolución por defecto defensiva y valor de paso encounterSets** - `ae05f41` (feat)
3. **Task 3: Interfaz — fila «Módulos», ModulePickerModal y línea de conjuntos en StepScreen** - `841f786` (feat)

_Nota: las tres tareas son `tdd="true"` en el plan pero, salvo excepciones puntuales, la implementación y los tests se escribieron y verificaron juntos dentro del mismo commit de tarea (no ciclos RED/GREEN separados en commits distintos) — cada commit incluye tanto el código como los tests que lo ejercitan, y la suite completa se ejecutó en verde antes de cada commit._

## Files Created/Modified

- `scripts/catalogue/fetch-marvelcdb.mjs` - Klaw, `ENCOUNTER_MODULES`/`ENCOUNTER_PACKS`/`EXCLUDED_MODULAR_CODES`, `fetchPackEncounterSets`, `checkMainScheme` (antes `checkExpertStartStage`) con la puerta del módulo recomendado
- `content/marvel-characters.json` - Regenerado: Klaw, `baseSets`, `modules`, `encounterSetName`/`recommendedModuleId` por villano
- `content/marvel-champions.json` - `setup.encuentros.01` gana `"value": "encounterSets"` (único cambio, `text`/`speech` intactos)
- `engine/types.ts` - `CatalogueModule`, `CatalogueBaseSets`, `CatalogueVillain.encounterSetName`/`recommendedModuleId`, `CharacterCatalogue.baseSets`/`modules`, `StepValueKind` gana `'encounterSets'`, `HeroSelection.moduleIds`
- `engine/catalogueSchema.ts` - `ModuleSchema`/`BaseSetsSchema`, validación de recomendado existente en `modules`, ids de módulo únicos
- `engine/schema.ts` - `value` enum gana `'encounterSets'`
- `engine/encounterSets.ts` (nuevo) - `ModuleOption`, `orderModulesForVillain`, `resolveModuleIds`, `setModules`, `toggleModule`, `resolveEncounterSetNames`
- `engine/selection.ts` - `setVillain` aplica la regla D-05 sobre `moduleIds`
- `engine/stepValues.ts` - `resolveStepValueText` (tercera forma de salida, línea unida con ` · `)
- `app/composables/useGameSession.ts` - `moduleOptions`/`selectedModuleIds`/`baseSetLabels`/`toggleModule`/`stepValueLine`, funciones puras `buildModulesValueLabel`/`buildBaseSetLabels`
- `app/components/ModulePickerModal.vue` (nuevo) - Modal «Módulos» multiselección
- `app/components/StepScreen.vue` - Prop `stepValueLine`, línea bajo la frase grande
- `app/pages/[game]/index.vue` - Fila «Módulos», montaje de `ModulePickerModal`, `:step-value-line`
- Tests: `engine/__tests__/{catalogueSchema,characters,counters,encounterSets,selection,stepValues,persistence,content}.test.ts`, `app/composables/__tests__/{useGameSession,useHeroSearch}.test.ts`

## Decisions Made

Ver `key-decisions` en el frontmatter. Ninguna decisión nueva fuera de las ya cerradas (`<locked_decisions>`) o discrecionales (`<discretion_choices>`) del plan — se ejecutaron tal cual.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `useHeroSearch.test.ts` fijaba un recuento literal de 3 villanos**
- **Found during:** Task 3 (verificación con `npx vitest run` de la suite completa)
- **Issue:** `buildVillainOptions` test afirmaba `villainOptions.length === 3` a mano; Klaw (añadido en la Task 1 de este mismo quick) hace que el catálogo real tenga 4 villanos, y el test rompía — efecto colateral directo de este quick, no un defecto preexistente sin relación.
- **Fix:** El test ahora compara contra `marvelCharacters.villains.length` (derivado del fichero real, mismo criterio CAT-07 que ya sigue el resto de la suite de catálogo) en vez de un número tecleado a mano.
- **Files modified:** `app/composables/__tests__/useHeroSearch.test.ts`
- **Verification:** `npx vitest run` completo en verde (1369 tests)
- **Committed in:** `841f786` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug directo de este mismo quick)
**Impact on plan:** Ajuste mínimo y esperable — comprar/catalogar un villano nuevo (Klaw) es precisamente lo que el comentario CAT-07 del propio repo pide no fijar con un número literal. Sin scope creep.

## Issues Encountered

None.

## Verification Results

- `npx vitest run` (suite completa): **1369 tests, 0 fallos** (incluye `voice-drift`, `content`, `characters`, `catalogue-isolation`, `encounterSets` nuevo).
- `npm run typecheck`: **0 errores**.
- `npm run generate` (build real, `nuxt generate`): **éxito**, 10 rutas prerenderizadas, PWA precache 72 entradas, sin advertencias más allá del aviso estándar de tamaño de chunk ya presente antes de este quick.
- `git diff --quiet -- scripts/voice/manifest.json`: **vacío** (ningún clip de voz tocado).
- `git diff -- content/marvel-champions.json`: **solo añade** `"value": "encounterSets"` en `setup.encuentros.01`; ningún `text`/`speech` cambiado.
- `grep -c '"recommendedModuleId"' content/marvel-characters.json`: **4** (uno por villano: rhino, klaw, kang, ultron).
- `grep -q 'exp-kang' content/marvel-characters.json`: **no encontrado** (excluido a propósito, D-01).
- Prueba deliberada de fallo del script (Task 1): corromper a mano `recommendedModuleCode` de Rhino a `masters_of_evil` hizo abortar `npm run catalogue:generate` con el mensaje `"Fila Rhino: el módulo recomendado a mano es... pero la carta 01097a dice 'Bomb Scare' — el dato a mano está desfasado"`, sin escribir el JSON; revertido antes de continuar.

## Human Verification Needed (Task 3 `<human-check>`, no bloqueante)

No se pudo ejercitar en un dispositivo real durante esta ejecución (agente sin tablet/navegador manual). Automatizado lo posible (`vitest`, `typecheck`, `generate`); queda pendiente en la tablet del grupo:

1. `npm run dev`, abrir Marvel Champions, 2 jugadores, Experto.
2. En «Elegir villano y héroes» elegir **Rhino** → la fila debe leer «Módulos: Amenaza de bomba».
3. Abrir el modal «Módulos» → debe mostrar «Normal», «Experto» (sets base, no pulsables), y en «Módulos adicionales»: **Amenaza de bomba** primero con la etiqueta «Recomendado», y **Temporal** con «Dificultad 4» (además de Amo del tiempo «Dificultad 6» y Anacronautas «Dificultad 8»).
4. Marcar **Legiones de Hydra**, cerrar con «Hecho», cambiar el villano a **Klaw** → la fila «Módulos» debe pasar a «Señores del Mal» (el recomendado de Klaw, reinicio automático).
5. Recargar la página → la selección de módulos debe sobrevivir.
6. Avanzar hasta el paso «Reunir conjuntos de encuentro» (`setup.encuentros.01`) → debe leerse «Klaw · Normal · Experto · Señores del Mal» bajo la frase grande, y el audio de ese paso NO debe haber cambiado de contenido (sigue narrando "Reunid los conjuntos de encuentro que indique el Plan Principal, cara 1A.").

## User Setup Required

None - no external service configuration required. (El script `catalogue:generate` ya se ejecutó como parte de esta ejecución, usando la API pública y de solo lectura de MarvelCDB; no requiere clave ni cuenta.)

## Next Phase Readiness

- El catálogo, el motor y la interfaz quedan completos y verificados automáticamente; solo falta la comprobación humana en tablet listada arriba (D-08 del plan: fuera de alcance de este quick cualquier ampliación a modo heroico, campaña, otros packs o clips de voz).
- Sin bloqueantes para el resto del roadmap.

## Self-Check: PASSED

All 14 key files verified present on disk; all 3 task commit hashes (646e41f, ae05f41, 841f786) verified in `git log`.

---
*Phase: quick-260925-mpj*
*Completed: 2026-09-25*
