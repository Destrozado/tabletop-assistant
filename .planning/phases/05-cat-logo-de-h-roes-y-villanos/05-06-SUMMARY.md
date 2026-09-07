---
phase: 05-cat-logo-de-h-roes-y-villanos
plan: 06
subsystem: content
tags: [zod, catalogue, marvelcdb, villain-difficulty]

# Dependency graph
requires:
  - phase: 05-01..05-05
    provides: contrato de tipos y esquema del catálogo, generador determinista, catálogo committeado de 23 héroes y 3 villanos
provides:
  - "VillainStage.expert opcional (health/healthPerHero/healthPerGroup) en engine/types.ts y engine/catalogueSchema.ts"
  - "content/marvel-characters.json regenerado con Kang llevando expert 15/22/25 por etapa; Rhino y Ultron sin la clave"
  - "Tests ejecutables que fijan las cifras Expertas de Kang y la ausencia deliberada en Rhino/Ultron"
  - "Cierre del gap de truth #8 de 05-VERIFICATION.md (CAT-02 pasa de PARCIAL a SATISFECHO)"
affects: [06-selección-de-personajes, 07-contadores-y-compatibilidad, 08-valores-conocidos]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sub-objeto opcional por etapa para modelar una dimensión de dificultad sin renombrar los campos existentes ni precomputar tablas"
    - "Helper de puertas compartido (extractStageFields) entre carta estándar y carta Experto en el generador, para no duplicar validación"

key-files:
  created: []
  modified:
    - engine/types.ts
    - engine/catalogueSchema.ts
    - engine/__tests__/catalogueSchema.test.ts
    - scripts/catalogue/fetch-marvelcdb.mjs
    - content/marvel-characters.json
    - engine/__tests__/characters.test.ts
    - .planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md

key-decisions:
  - "Se implementó la 'salida buena' del verificador: expert vive en la etapa como sub-objeto opcional, no un renombrado a standardStages"
  - "Rhino y Ultron salen del catálogo sin clave expert a propósito — la ausencia es un hecho del dominio, no un dato pendiente"
  - "El gate D-11 se reescribió para permitir expert como única clave extra por etapa, en vez de fijar una lista cerrada de cuatro claves"

patterns-established:
  - "Un sub-objeto de dificultad opcional por etapa es el patrón a seguir si un futuro villano trae más de un modo alternativo"

requirements-completed: [CAT-02, CAT-03, CAT-05]

# Metrics
duration: ~15min
completed: 2026-09-07
---

# Phase 05 Plan 06: Modo Experto en la etapa de villano (Kang) Summary

**`VillainStage` gana un sub-objeto `expert` opcional (15/22/25 de Kang, `card_set_code: exp_kang`) fijado por tests ejecutables, cerrando el gap de truth #8 de `05-VERIFICATION.md` sin renombrar ningún campo existente.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-07T20:56:00Z (aprox.)
- **Completed:** 2026-09-07T21:03:53Z
- **Tasks:** 3/3
- **Files modified:** 7

## Accomplishments

- `engine/types.ts` y `engine/catalogueSchema.ts` declaran `expert?: { health, healthPerHero, healthPerGroup }` como quinto campo opcional de `VillainStage`, sin tocar los cuatro campos estándar existentes ni sus nombres.
- El generador (`scripts/catalogue/fetch-marvelcdb.mjs`) declara las tres cartas del set `exp_kang` (11034/11035/11039) como `expertCode` de las filas estándar de Kang, valida la carta Experto con el mismo helper de puertas que la estándar (`extractStageFields`), y añade dos puertas propias (expertCode/expectedExpertSetCode van juntos o no van; expertCode ≠ code).
- `content/marvel-characters.json` regenerado: Kang lleva `expert` 15/22/25 con banderas true/false/true por etapa y `healthPerGroup: false` en las tres; Rhino y Ultron no llevan ninguna clave `expert`. Determinismo D-10 reconfirmado con `cmp` (dos ejecuciones consecutivas, byte a byte idénticas).
- Tests ejecutables fijan las seis cifras Expertas de Kang, la ausencia deliberada en Rhino/Ultron (comprobada con `'expert' in stage`), y el gate D-11 reescrito acepta `expert` como única clave extra permitida por etapa.
- `05-CONTEXT.md` registra la decisión bajo D-11, sin borrar el texto original, siguiendo el precedente literal del plan 05-04.

## Task Commits

Each task was committed atomically:

1. **Task 1: Contrato — VillainStage gana un sub-objeto expert opcional en tipos y esquema** - `7da47ac` (feat)
2. **Task 2: Generador — declarar los códigos exp_kang, validarlos con las mismas puertas y regenerar el catálogo** - `580dde7` (feat)
3. **Task 3: Gates del catálogo real — fijar 15/22/25 por test, actualizar el gate D-11 y registrar la decisión en CONTEXT** - `c383a29` (test)

**Plan metadata:** pendiente (commit final de este SUMMARY.md)

## Files Created/Modified

- `engine/types.ts` - `VillainStage.expert?` opcional, comentario ampliado explicando estándar vs Experto y por qué vive en la etapa
- `engine/catalogueSchema.ts` - `ExpertVillainStageSchema` (z.strictObject, quinto del fichero) referenciado con `.optional()` en `VillainStageSchema`, sin `.default()`
- `engine/__tests__/catalogueSchema.test.ts` - describe nuevo `expert: dimensión de dificultad en la etapa de villano` con 9 tests (aceptación ausente/presente/mixto, rechazo de clave desconocida/campo faltante/tipos inválidos/anidamiento)
- `scripts/catalogue/fetch-marvelcdb.mjs` - filas de Kang con `expertCode`/`expectedExpertSetCode`; `extractStageFields` compartido; dos puertas nuevas; comentario de exclusión sustituido; CAT-07 documenta el caso; contador de códigos 32→35
- `content/marvel-characters.json` - regenerado con `expert` en las tres etapas de Kang
- `engine/__tests__/characters.test.ts` - gate D-11 reescrito; describe nuevo `CAT-02: modo Experto en la etapa de villano` con 3 tests (fidelidad de Kang, ausencia en Rhino/Ultron, invariante de forma general)
- `.planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md` - ampliación de D-11 registrando la decisión de cierre del gap de truth #8

## Decisions Made

- Se implementó la "salida buena" del verificador (dificultad en la etapa, sub-objeto `expert` opcional), no la alternativa de renombrar a `standardStages` y diferir — decisión del usuario ya tomada en el plan, ejecutada sin reabrirla.
- El gate D-11 pasó de una lista cerrada `toEqual(['stage','health','healthPerHero','healthPerGroup'])` a una comprobación de "contiene las cuatro obligatorias, no contiene nada fuera de la lista permitida (+ expert), y si expert está presente sus claves son exactamente las tres esperadas" — conserva el propósito de prohibir tablas precomputadas también dentro de `expert`.

## Deviations from Plan

None - plan ejecutado tal como estaba escrito. Los tres criterios `<read_first>` marcados como "verificado en vivo durante la planificación" (cifras 15/22/25, banderas por etapa, cuatro alternativas narrativas de la etapa II Experta) coincidieron exactamente con lo que devolvió `npm run catalogue:generate` — no hubo que parar ni reportar ningún cambio de origen.

## Datos verificados frente a los esperados del plan

| Etapa | health estándar | expert.health esperado | expert.health obtenido | expert.healthPerHero esperado | obtenido | expert.healthPerGroup esperado | obtenido |
|-------|------------------|--------------------------|--------------------------|-------------------------------|----------|----------------------------------|----------|
| I     | 12               | 15                        | 15                        | true                           | true     | false                             | false    |
| II    | 18               | 22                        | 22                        | false                          | false    | false                             | false    |
| III   | 20               | 25                        | 25                        | true                           | true     | false                             | false    |

Coinciden exactamente con la tabla de `<interfaces>` del plan. Ningún ajuste manual.

## Resultado del determinismo (D-10)

```
TMPDIR=/private/tmp/claude-501/.../scratchpad
cp content/marvel-characters.json "$TMPDIR/cat-run1.json"
npm run catalogue:generate   # segunda ejecución independiente
cmp "$TMPDIR/cat-run1.json" content/marvel-characters.json
# exit code 0, sin salida — ficheros byte a byte idénticos
```

## Salida real de la mutación que prueba que el gate D-11/CAT-02 muerde

Se borró temporalmente `kang.stages[0].expert` de `content/marvel-characters.json` y se ejecutó
`npx vitest run --project engine engine/__tests__/characters.test.ts`:

```
❯ |engine| engine/__tests__/characters.test.ts (37 tests | 1 failed)
       × Kang: expert.health y sus banderas son 15/22/25 con true/false/true por etapa, per-group siempre false
AssertionError: kang etapa 1: no lleva expert: expected undefined to be defined
Test Files  1 failed (1)
     Tests  1 failed | 36 passed (37)
```

- (a) el fichero se reportó como `failed` ✓
- (b) el test de fidelidad de Kang falló individualmente y por su nombre ✓
- (c) no apareció `no tests`; el recuento de tests colectados (37) es el mismo que en verde (confirmado re-ejecutando tras restaurar el fichero: `37 passed (37)`) ✓

Fichero restaurado desde la copia de `$TMPDIR` inmediatamente después; `git diff --exit-code -- content/marvel-characters.json` devolvió 0.

## Recuentos de tests antes y después

| Ámbito | Antes (baseline de planificación) | Después |
|--------|-------------------------------------|---------|
| `--project engine` | 12 ficheros, 239 tests | 12 ficheros, 251 tests (+12) |
| `npm run test` (suite completa) | — (no medido explícitamente en planificación) | 17 ficheros, 374 tests |

Desglose del +12: 9 tests nuevos en `catalogueSchema.test.ts` (describe `expert`) + 3 tests nuevos en `characters.test.ts` (describe `CAT-02`). El gate D-11 se reescribió en el sitio (mismo test, no uno adicional).

## Estructura CR-02 verificada

`grep -n "readFileSync\|JSON.parse\|validateCharacterCatalogue(" engine/__tests__/characters.test.ts` solo devuelve líneas dentro de:
- El import (línea 9)
- Comentarios explicativos (líneas 16-34)
- El cuerpo de `readRawCatalogueText()` (línea 42)
- El cuerpo de `loadValidatedCatalogue()` (línea 53)

Ninguna lectura, parseo ni validación vive en ámbito de módulo ni de `describe()`. Estructura intacta.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

El contrato que la Fase 6 va a importar (`engine/types.ts`) ya declara `expert` como campo opcional y documenta qué significa su ausencia. Truth #8 de `05-VERIFICATION.md` puede darse por VERIFICADO y CAT-02 pasa de ⚠️ PARCIAL a SATISFECHO. Ningún fichero fuera de los 7 de `files_modified` fue tocado (`git status --porcelain` vacío tras el commit final). Sin bloqueantes para continuar con la Fase 6.

---
*Phase: 05-cat-logo-de-h-roes-y-villanos*
*Completed: 2026-09-07*
