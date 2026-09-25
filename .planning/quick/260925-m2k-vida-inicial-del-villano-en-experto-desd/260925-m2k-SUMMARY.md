---
phase: quick-260925-m2k
plan: 01
subsystem: engine
tags: [zod, vitest, marvelcdb, rules-fidelity]

requires: []
provides:
  - "expertStartStage en CatalogueVillain (tipos + esquema Zod), dato a mano por villano, comprobado contra la carta 1A del plan principal"
  - "VILLAIN_SCENARIOS + checkExpertStartStage en scripts/catalogue/fetch-marvelcdb.mjs"
  - "computeInitialVillainHealth corregido: en Experto arranca en la etapa que marca expertStartStage, no siempre en la etapa I"
  - "Texto de setup.escenario.04 (variante Experto) explica que las cartas las marca el plan principal (caja básica: etapas II y III)"
affects: [catalogo, motor-de-contadores, setup-de-partida]

tech-stack:
  added: []
  patterns:
    - "Dato a mano con comprobación cruzada contra la API (la carta nunca es la fuente, solo valida el dato ya anotado; discrepancia = abort sin escribir)"

key-files:
  created: []
  modified:
    - engine/types.ts
    - engine/catalogueSchema.ts
    - engine/counters.ts
    - scripts/catalogue/fetch-marvelcdb.mjs
    - content/marvel-characters.json
    - content/marvel-champions.json
    - engine/__tests__/catalogueSchema.test.ts
    - engine/__tests__/characters.test.ts
    - engine/__tests__/counters.test.ts
    - engine/__tests__/stepValues.test.ts

key-decisions:
  - "Rhino y Ultron (Core Set) arrancan en etapa II en Experto (expertStartStage: 2); Kang se anota explícitamente en 1 (su Experto no cambia de etapa, va con las cifras propias del set exp_kang)"
  - "expertStartStage vive en el VILLANO, no en la etapa — distinto de expert (cifras propias de un set de villano Experto por etapa, caso Kang)"
  - "El dato a mano en VILLAIN_SCENARIOS manda; la carta 1A del plan principal (type_code main_scheme) solo se usa como comprobación cruzada — una discrepancia aborta el script sin escribir nada (D-05), nunca se copia texto de carta al catálogo (CAT-04)"
  - "Texto de setup.escenario.04 Experto reescrito con la redacción del orquestador (nombra 'plan principal' en vez del bare 'plan 1A'), 86/90 caracteres; el speech pregenerado no se toca (evita gasto de regeneración de audio)"

requirements-completed: [QUICK-260925-m2k]

duration: ~35min
completed: 2026-09-25
---

# Quick 260925-m2k: Vida inicial del villano en Experto Summary

**`computeInitialVillainHealth` ahora arranca en la etapa II para Rhino/Ultron en modo Experto (dato `expertStartStage` verificado contra la cara 1A del plan principal de MarvelCDB), en vez de precargar siempre la etapa I.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 completed
- **Files modified:** 10 (código + tests), más el todo movido (sin commitear)

## Accomplishments

- `CatalogueVillain.expertStartStage` (opcional, tipos + esquema Zod con rango validado contra el número de etapas del villano)
- `scripts/catalogue/fetch-marvelcdb.mjs`: `VILLAIN_SCENARIOS` (dato a mano) + `checkExpertStartStage` (comprobación cruzada contra la carta 1A del plan principal; aborta sin escribir si no coincide — verificado ejecutando el script con un valor mutado a propósito)
- Catálogo regenerado desde la API real: `rhino.expertStartStage = 2`, `kang.expertStartStage = 1`, `ultron.expertStartStage = 2`; ninguna cifra de vida ha cambiado (diff limitado a las tres claves nuevas)
- `computeInitialVillainHealth` reescrito: en Experto usa `villain.expertStartStage ?? 1`; localiza la etapa por `stage` (no por índice); guardas defensivas devuelven `null` sin lanzar ante un valor ausente, fuera de rango o no numérico
- `setup.escenario.04` (variante Experto): texto reescrito para nombrar el "plan principal" (86 caracteres), sin tocar ningún `speech` pregenerado
- Comentarios desfasados que decían que Rhino/Ultron "no cambian en Experto" corregidos en `engine/types.ts` y `scripts/catalogue/fetch-marvelcdb.mjs`
- Todo `experto-etapas-de-villano-rhino-ultron-por-verificar.md` movido a `completed/` con `status: completed`, `completed: 2026-09-25` y `resolved_by: quick 260925-m2k`

## Task Commits

1. **Task 1: Dato a mano expertStartStage en el script, comprobado contra la carta 1A, esquema/tipos y catálogo regenerado** - `5c8a9a2` (fix)
2. **Task 2: computeInitialVillainHealth arranca en la etapa de Experto, tests del motor y texto del paso setup.escenario.04** - `f3ef014` (fix)

_Sin ciclo TDD RED→GREEN→REFACTOR con commits separados: cada task se ejecutó verificando RED (tests fallando) antes de implementar y GREEN después, pero el commit se hizo una sola vez por task con test+implementación juntos, siguiendo el patrón `fix(...)` que el propio PLAN.md pedía para cada task (no se pidieron commits `test(...)`/`feat(...)` separados)._

**Plan metadata:** (pendiente — lo commitea el orquestador, junto con este SUMMARY.md, STATE.md y el todo movido)

## Files Created/Modified

- `engine/types.ts` - `CatalogueVillain.expertStartStage?: number`; comentario de `VillainStage` corregido (ya no dice que Rhino/Ultron no cambian en Experto)
- `engine/catalogueSchema.ts` - `VillainSchema.expertStartStage` (entero positivo opcional) + regla en `superRefine` (`expertStartStage <= stages.length`)
- `engine/counters.ts` - `computeInitialVillainHealth` localiza la etapa de arranque según `expertStartStage` en vez de fijar siempre `stages[0]`
- `scripts/catalogue/fetch-marvelcdb.mjs` - `VILLAIN_SCENARIOS`, `checkExpertStartStage`, validaciones previas en `main()`, comentarios CAT-07/VILLAIN_STAGE_CARDS corregidos
- `content/marvel-characters.json` - regenerado: `expertStartStage` en los tres villanos
- `content/marvel-champions.json` - `setup.escenario.04.variants.difficulty.expert.text` reescrito
- `engine/__tests__/catalogueSchema.test.ts` - describe nuevo `expertStartStage` (acepta/rechaza)
- `engine/__tests__/characters.test.ts` - test de Rhino/Ultron actualizado (expertStartStage=2) + test nuevo de Kang (expertStartStage=1)
- `engine/__tests__/counters.test.ts` - cifras reales (Rhino/Ultron 2 jug Experto) + batería defensiva de `expertStartStage`
- `engine/__tests__/stepValues.test.ts` - caso Ultron en Experto vía `resolveStepValue`

## Decisions Made

- `expertStartStage` en el villano (no en la etapa): la ausencia de set de villano Experto con cifras propias sigue viviendo en `expert` por etapa (caso Kang); el cambio de etapa en Experto sin cifras nuevas (caso Rhino/Ultron) es un concepto distinto y necesitaba su propio campo.
- La carta de MarvelCDB nunca es la fuente del dato: solo comprobación cruzada. Verificado en vivo ejecutando el script con un `expertStartStage` mutado a propósito — abortó con un mensaje claro y no escribió nada en el catálogo.
- Ajuste del orquestador aplicado sobre el texto propuesto por el plan: en vez de "el plan 1A", el texto nombra "el plan principal" («Usad las cartas de villano que marca el plan principal (caja básica: etapas II y III).», 86/90 caracteres) — pasa `content.test.ts` (contiene "cartas de villano", distinto de normal/base) sin tocar `speech`.

## Deviations from Plan

None - plan ejecutado tal como estaba escrito (con el único ajuste de redacción del texto de Experto que pidió el orquestador, ya incorporado como parte de la Task 2, no como desviación de las reglas de ejecución).

## Issues Encountered

None. La regeneración del catálogo tuvo éxito a la primera con la red disponible; la prueba deliberada de fallo (mutar `expertStartStage` de Rhino a 1) confirmó que el script aborta sin escribir nada ante una discrepancia con la carta.

## User Setup Required

None - no se requiere configuración externa.

## Next Phase Readiness

- El dial de vida inicial de Rhino y Ultron en Experto ya es correcto (etapa II); Kang y Normal quedan intactos.
- El todo `experto-etapas-de-villano-rhino-ultron-por-verificar` queda resuelto y movido a `completed/`.
- Pendiente relacionado (fuera de alcance de este quick): Klaw sigue sin catálogo (exclusión deliberada, D-02); si se añade en el futuro, necesitará su propia fila en `VILLAIN_SCENARIOS`.

---
*Quick task: 260925-m2k*
*Completed: 2026-09-25*

## Self-Check: PASSED

Todos los ficheros modificados/movidos existen en disco y los dos commits de task (`5c8a9a2`, `f3ef014`) están en el historial de `develop`.
