---
phase: 08-valores-conocidos-dentro-del-paso
plan: 01
subsystem: content
tags: [zod, typescript, json-schema, marvel-champions]

# Dependency graph
requires:
  - phase: 07-contadores-y-compatibilidad
    provides: "CounterState y SessionContext.counters ya definidos en engine/types.ts, precedente de patrón para campos opcionales aditivos"
provides:
  - "StepValueKind exportado desde engine/types.ts (villainHealth | heroHealth | handSizeAlterEgo)"
  - "StepDefinition.value?: StepValueKind, hermano de selection?: 'characters'"
  - "StepSchema.value: z.enum([...]).optional() en engine/schema.ts, mismo enum literal por literal"
  - "content/marvel-champions.json con los cuatro pasos de D-03 marcados: setup.escenario.02 (villainHealth), setup.heroes.03 (heroHealth), setup.manos.02 y setup.manos.03 (handSizeAlterEgo)"
affects: ["08-02", "08-03"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Campo de dato declarado en engine/types.ts + engine/schema.ts + contenido JSON, mismo patrón de tres capas ya usado para `selection` (Fase 6)"

key-files:
  created: []
  modified:
    - engine/types.ts
    - engine/schema.ts
    - content/marvel-champions.json

key-decisions:
  - "value vive fuera de TextBlock (igual que selection): no puede variar por dificultad"
  - "Sin regla superRefine nueva: value es un flag solitario sin campo dependiente, igual que selection"
  - "ronda.jugadores.02 deliberadamente sin value (D-06): el tamaño de mano de ronda depende de la cara boca arriba de cada jugador, que la app no rastrea"
  - "contentVersion se mantiene en 13: el campo es aditivo y no invalida ninguna partida en curso"

requirements-completed: [VAL-04, VAL-05, VAL-06]

# Metrics
duration: 15min
completed: 2026-09-09
---

# Phase 08 Plan 01: Declarar la clave `value` en tipo, esquema y contenido Summary

**Enum `StepValueKind` de tres miembros (villainHealth/heroHealth/handSizeAlterEgo) declarado en `engine/types.ts` y `engine/schema.ts`, y aplicado a los cuatro pasos exactos de D-03 en `content/marvel-champions.json` sin tocar texto ni voz.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-09-09T09:48:01Z
- **Completed:** 2026-09-09T09:54:04Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- `StepValueKind` exportado como único alias de los tres valores conocidos, citado literal por literal en `engine/schema.ts` sin duplicar el enum.
- `StepDefinition.value?: StepValueKind` colocado junto a `selection?: 'characters'`, fuera de `TextBlock`, sin nueva regla `superRefine` (flag solitario, mismo precedente que `selection`).
- Los cuatro pasos de D-03 marcados en el contenido real (`setup.escenario.02` → `villainHealth`, `setup.heroes.03` → `heroHealth`, `setup.manos.02`/`setup.manos.03` → `handSizeAlterEgo`), `ronda.jugadores.02` intacto (D-06), `contentVersion` sin bumpear.
- 537 tests en verde (`npm test`), incluidos `content.test.ts`, `schema.test.ts` y `voice-drift.test.ts`; los 35 clips de `public/audio/` y las 35 entradas de `scripts/voice/manifest.json` quedan sin tocar.

## Task Commits

1. **Task 1: Declarar la clave `value` en el tipo y en el esquema** - `7ea3ca5` (feat)
2. **Task 2: Marcar los cuatro pasos de D-03 en el contenido, sin tocar texto ni voz** - `f28ec9a` (feat)

_Plan metadata commit pending — orchestrator handles shared-file writes in worktree mode._

## Files Created/Modified
- `engine/types.ts` - Nuevo alias `StepValueKind` exportado; `StepDefinition.value?: StepValueKind` añadido junto a `selection`
- `engine/schema.ts` - `StepSchema.value: z.enum(['villainHealth', 'heroHealth', 'handSizeAlterEgo']).optional()` añadido junto a `selection`, sin nueva regla `superRefine`
- `content/marvel-champions.json` - Cuatro líneas `"value"` añadidas en los pasos exactos de D-03; `contentVersion` sin cambios (13); ningún carácter de `text`/`speech` tocado

## Decisions Made
- `value` fuera de `TextBlock`, como `selection`: no puede variar por dificultad (misma disciplina, mismo precedente literal).
- Sin regla `superRefine` nueva: es un flag solitario sin campo dependiente que pueda quedar huérfano.
- `ronda.jugadores.02` deliberadamente sin marcar (D-06): depende de la cara boca arriba de cada jugador, dato que la app no rastrea.
- `contentVersion` se mantiene en 13: campo aditivo, ninguna partida en curso se descarta.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generado `.nuxt/` con `nuxi prepare` antes de poder correr los tests**
- **Found during:** Task 1 (verificación automática)
- **Issue:** `npx vitest run engine/__tests__/schema.test.ts engine/__tests__/content.test.ts` fallaba con `TSCONFIG_ERROR: Failed to load tsconfig '.nuxt/tsconfig.app.json'` porque el directorio `.nuxt/` no existía en este worktree recién creado.
- **Fix:** Ejecutado `npx nuxt prepare`, que regenera `.nuxt/` de forma determinista a partir de `nuxt.config.ts`. No se tocó ningún fichero versionado.
- **Files modified:** ninguno versionado (`.nuxt/` está gitignored)
- **Verification:** `npx vitest run engine/__tests__/schema.test.ts engine/__tests__/content.test.ts` pasó (98 tests) tras regenerar
- **Committed in:** n/a (artefacto de build no versionado, no requiere commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necesario únicamente para poder ejecutar la verificación automática en este worktree; no afecta al código entregado.

## Issues Encountered
- El criterio de aceptación de Task 1 pedía `npx tsc --noEmit` (o `npx nuxt typecheck`) sin errores nuevos. Ninguna de las dos herramientas está instalada en este entorno (`npx tsc` cae al aviso "This is not the tsc command you are looking for"; `npx nuxi typecheck` pide instalar `vue-tsc` o `golar`, que no están presentes). Instalar un paquete nuevo está explícitamente excluido del auto-fix de Rule 3 (riesgo de paquete slopsquatted); como este es un criterio de verificación, no un bloqueo del propio código, se documenta como omitido en vez de detener el plan. El resto de criterios automatizados de la Task 1 (greps de tipo/esquema, `superRefine` sin nueva regla, suite de Vitest) pasaron sin problema.
- El criterio literal `git diff content/marvel-champions.json | grep -c '"text"\|"speech"'` (esperado 0) devolvió `8` porque `git diff` sin `-U0` incluye 3 líneas de contexto sin cambiar alrededor de cada inserción, y esas líneas de contexto contienen `"text"`/`"speech"` sin haber sido tocadas. Confirmado con el diff completo: ninguna línea de `text` o `speech` aparece con prefijo `+`/`-`; el criterio real (0 líneas modificadas de texto/voz) se cumple, el conteo literal del grep sencillamente cuenta contexto no modificado.
- El criterio literal `grep -c "zod" engine/types.ts` (esperado 0) devuelve `1` por un comentario preexistente en la sección del catálogo de personajes (línea ~185, "...un módulo que importa zod...") que ya estaba en el fichero antes de este plan y queda fuera de alcance (Scope Boundary). La comprobación real que importa —cero `import` de zod— se verificó por separado (`grep -n "^import" engine/types.ts` no devuelve nada).
- El criterio literal `grep -c "superRefine" engine/schema.ts` (esperado: mismo número que antes del cambio) subió de 3 a 4 porque el comentario nuevo que documenta por qué `value` no necesita `superRefine` (siguiendo la instrucción explícita del plan de imitar el comentario ya existente de `selection`) menciona la palabra "superRefine" en prosa. El conteo real de invocaciones (`grep -c "\.superRefine("`) se mantiene en 1 antes y después; no se añadió ninguna regla de validación nueva.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `StepValueKind` y `value` quedan disponibles para que 08-02 (`engine/stepValues.ts`) resuelva el número concreto a partir del catálogo, y para que 08-03 (`app/composables/useGameSession.ts`) lo pinte entre paréntesis en pantalla.
- Ningún bloqueo conocido para 08-02/08-03.

---
*Phase: 08-valores-conocidos-dentro-del-paso*
*Completed: 2026-09-09*
