---
phase: 05-cat-logo-de-h-roes-y-villanos
plan: 01
subsystem: content-schema
tags: [zod, typescript, vitest, catalogue, marvel-champions]

# Dependency graph
requires: []
provides:
  - "engine/types.ts amplia con CharacterCatalogue, CatalogueHero, CatalogueVillain, VillainStage (sin import de zod)"
  - "engine/catalogueSchema.ts: CharacterCatalogueSchema (z.strictObject en todo nivel) + validateCharacterCatalogue()"
  - "engine/schema.ts cabecera corregida: ya no afirma ser el único importador de zod"
  - "engine/__tests__/catalogueSchema.test.ts: 20 tests sobre fixtures sintéticas"
affects: [05-02, 05-03, 06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Segundo esquema Zod en el repo espejo estructural de engine/schema.ts (z.strictObject + superRefine tras cerrar el objeto)"
    - "Tipos de contrato en engine/types.ts, sin z.infer, para que app/ pueda tiparlos sin arrastrar zod (DC-03/T-01-19)"

key-files:
  created:
    - engine/catalogueSchema.ts
    - engine/__tests__/catalogueSchema.test.ts
  modified:
    - engine/types.ts
    - engine/schema.ts

key-decisions:
  - "DC-01: stages no se fija a longitud 3; se exige consecutividad desde 1 vía superRefine (CAT-07)"
  - "DC-02: el id de cada personaje debe ser el slug determinista de su name, comprobado en el esquema (D-09)"
  - "DC-03: los tipos viven en engine/types.ts, no se derivan con z.infer en catalogueSchema.ts (T-01-19)"

requirements-completed: [CAT-01, CAT-02, CAT-04, CAT-05]

# Metrics
duration: 15min
completed: 2026-09-07
---

# Phase 5 Plan 01: Contrato del catálogo de personajes Summary

**Esquema Zod estricto (z.strictObject en los 4 niveles) y tipos TS libres de zod para el catálogo de héroes/villanos de Marvel Champions, con invariantes DC-01 (etapas consecutivas sin longitud fija) y DC-02 (id = slug del nombre) probadas en 20 tests unitarios.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-07T16:55:00Z
- **Completed:** 2026-09-07T17:10:00Z
- **Tasks:** 3 completed
- **Files modified:** 4 (2 creados, 2 modificados)

## Accomplishments
- `engine/types.ts` exporta `CharacterCatalogue`, `CatalogueHero`, `CatalogueVillain`, `VillainStage` sin ninguna dependencia de zod, listas para que la Fase 6 las importe desde `app/` vía `~~/engine/types`.
- `engine/catalogueSchema.ts` nuevo: espejo estructural de `engine/schema.ts`, con los cuatro objetos anidados declarados `z.strictObject` (nunca `z.object`) y las invariantes DC-01/DC-02 aplicadas en `superRefine`.
- `engine/schema.ts` cabecera corregida: ya no afirma ser el único fichero del repo que importa zod; nombra a `engine/catalogueSchema.ts` como el segundo.
- `engine/__tests__/catalogueSchema.test.ts`: 20 tests sobre fixtures sintéticas — positivo mínimo, rechazo de 4 claves de copyright de MarvelCDB por nivel de anidamiento, tipos/rangos, DC-02 (incluido el caso "Ms. Marvel" → "ms-marvel"), DC-01 (hueco/desorden/duplicado como negativos; 2 y 4 etapas como positivos que prueban CAT-07), unicidad de ids, y un test explícito de D-05 (sin recuento fijo de personajes).

## Task Commits

Each task was committed atomically:

1. **Task 1: Declarar los tipos del catálogo en engine/types.ts y corregir la cabecera de engine/schema.ts** - `014baa1` (feat)
2. **Task 2: Crear engine/catalogueSchema.ts con z.strictObject en todo nivel** - `765eba6` (feat)
3. **Task 3: Tests unitarios del esquema sobre fixtures sintéticas** - `cb3c27a` (test)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator finalizes STATE.md/ROADMAP.md after merge)

## Files Created/Modified
- `engine/types.ts` - Añade las cuatro interfaces del contrato de catálogo, sin import de zod
- `engine/schema.ts` - Cabecera reescrita (líneas 1-4): ya no afirma unicidad como importador de zod
- `engine/catalogueSchema.ts` - Nuevo. `CharacterCatalogueSchema` + `validateCharacterCatalogue()`
- `engine/__tests__/catalogueSchema.test.ts` - Nuevo. 20 tests unitarios sobre fixtures sintéticas

## Decisions Made
Ninguna decisión nueva más allá de las tres ya cerradas en el propio PLAN.md (DC-01, DC-02, DC-03), aplicadas literalmente:
- DC-01: `stages` es `z.array(VillainStageSchema).min(1)` + invariante de consecutividad `stages[i].stage === i + 1`, nunca `.length(3)`.
- DC-02: `id === slugifyCharacterName(name)`, comprobado en `superRefine`; la función está duplicada a propósito en el script del plan 05-02 (comentario explícito en el código apuntando a la duplicación intencional).
- DC-03: los tipos del catálogo viven en `engine/types.ts`, no como `z.infer` dentro de `catalogueSchema.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generado `.nuxt/` con `nuxt prepare` antes de poder ejecutar la suite**
- **Found during:** Task 1 (verificación `npx vitest run --project engine`)
- **Issue:** El worktree no tenía `.nuxt/tsconfig.app.json` generado (directorio gitignored, nunca comprometido); todos los proyectos de Vitest fallaban con `[TSCONFIG_ERROR] Failed to load tsconfig '.nuxt/tsconfig.app.json'`. No es un problema causado por el código de esta tarea — es infraestructura del entorno del worktree que normalmente genera `npm install` vía el hook `postinstall`.
- **Fix:** Ejecutado `npx nuxt prepare` una vez, que regenera `.nuxt/` (ignorado por git, no se comitea nada).
- **Files modified:** ninguno versionado (solo `.nuxt/`, gitignored)
- **Verification:** `npx vitest run --project engine` pasó de 9 suites fallidas a 171 tests en verde
- **Committed in:** N/A (no hay nada que comitear; `.nuxt/` está en `.gitignore`)

---

**Total deviations:** 1 auto-fixed (1 blocking, infraestructura de entorno, no de código)
**Impact on plan:** Ninguno sobre el alcance del plan. El fix es puramente de entorno de ejecución (regenerar artefactos gitignored de Nuxt), no toca ningún fichero versionado ni ninguna decisión de diseño.

## Issues Encountered
Ninguno más allá de la deviation documentada arriba.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

El contrato del catálogo (tipos + esquema + tests) queda cerrado y ejecutable:
- El plan 05-02 puede escribir `content/marvel-characters.json` y el script `fetch-marvelcdb.mjs` importando `validateCharacterCatalogue`/`CharacterCatalogueSchema` de este mismo fichero, con la forma exacta ya decidida y probada.
- El plan 05-03 puede validar el JSON real contra este mismo esquema sin negociar la forma sobre la marcha.
- La Fase 6 puede tipar componentes de `app/` importando solo `~~/engine/types`, sin que ninguna importación suya alcance un módulo que importe zod — verificado (`grep -c "from 'zod'" engine/types.ts` devuelve 0).
- Ningún bloqueo conocido. `npm run test` cierra en verde con 314 tests (294 preexistentes + 20 nuevos).

## Self-Check: PASSED

- FOUND: engine/types.ts
- FOUND: engine/schema.ts
- FOUND: engine/catalogueSchema.ts
- FOUND: engine/__tests__/catalogueSchema.test.ts
- FOUND: .planning/phases/05-cat-logo-de-h-roes-y-villanos/05-01-SUMMARY.md
- FOUND commit 014baa1 (Task 1)
- FOUND commit 765eba6 (Task 2)
- FOUND commit cb3c27a (Task 3)

---
*Phase: 05-cat-logo-de-h-roes-y-villanos*
*Completed: 2026-09-07*
