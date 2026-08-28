---
phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
plan: 07
subsystem: engine
tags: [zod, vitest, tdd, engine-pure, content]

requires: ["01-01"]
provides:
  - "engine/ puro (types.ts, schema.ts, flatten.ts, expand.ts, navigator.ts, resolve.ts) con 0 imports de Vue/Nuxt/DOM"
  - "GameDefinitionSchema (Zod) que rompe `npm run test`/CI ante contenido mal formado, único importador de zod del repo"
  - "next/prev/jumpTo puros con cierre de bucle, clamp, salto e inmutabilidad probados sobre fixture (TECH-03 parcial)"
  - "resolveText() que fusiona variantes de dificultad sin aritmética (D-07/D-08)"
  - "content/marvel-champions.json real: bloque HÉROES (3 pasos citados, RR p.49), sección setup repeats:false"
  - "content/games-index.ts: índice de juegos con campo title, warhammer-40k como coming-soon"
affects: ["01-08", "01-02", "01-03", "01-04", "01-05", "01-06"]

tech-stack:
  added: []
  patterns: ["engine/ como módulo TypeScript puro, cero estado de módulo, funciones que devuelven objetos nuevos", "Zod schema con superRefine relajado a repeats<=1 (TODO fase 2)", "tests de esquema construidos en memoria (mutando una base válida), nunca como fixtures inválidos sueltos"]

key-files:
  created:
    - engine/types.ts
    - engine/schema.ts
    - engine/flatten.ts
    - engine/expand.ts
    - engine/navigator.ts
    - engine/resolve.ts
    - engine/__tests__/schema.test.ts
    - engine/__tests__/fixtures/tiny-game.json
    - engine/__tests__/navigator.test.ts
    - engine/__tests__/resolve.test.ts
    - engine/__tests__/content.test.ts
    - content/games-index.ts
    - content/marvel-champions.json
  modified: []

key-decisions:
  - "resolveText() siempre devuelve las tres claves de TextBlock (text/warning/speech), con undefined explícito cuando ni la variante ni el base las definen — más simple que omitir la clave y equivalente para todo consumidor que use acceso por propiedad"
  - "jumpTo() con runtimeId inexistente devuelve la MISMA referencia de sesión (no una copia), cumpliendo 'sin cambios y no lanza' sin necesidad de clonar en el caso no-op"

requirements-completed: [TECH-01, TECH-02, TECH-03, TECH-04, CONT-08]

duration: 20min
completed: 2026-08-28
---

# Fase 1 Plan 07: Motor de flujo puro y primer contenido real de Marvel Champions Summary

**Motor TypeScript puro (`engine/`) con esquema Zod que rompe el build, cierre de bucle/salto/clamp probados sobre un fixture agnóstico, y el bloque HÉROES real de Marvel Champions (3 pasos citados contra RR v1.7 p.49) validando en la suite que ejecuta CI.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-28T13:48 (sesión)
- **Completed:** 2026-08-28T13:53
- **Tasks:** 3/3 completadas
- **Files modified:** 13 nuevos (0 modificados), todos dentro de la lista planificada en `files_modified`

## Accomplishments

- `engine/` vive en la raíz del repo, fuera de `srcDir`, sin ningún import de Vue/Nuxt/DOM (`grep -rE "from ['\"](vue|nuxt|#app|#imports)" engine/` no devuelve nada) y sin ninguna palabra de Marvel Champions ni en código ni en comentarios (`grep -riE "marvel|champion|villano|h(e|é)roe" engine/*.ts engine/__tests__/fixtures/` no devuelve nada — TECH-04).
- `GameDefinitionSchema` (Zod) es el único fichero del repo fuera de `node_modules` que importa `zod`; rechaza contenido mal formado (id ausente, dos secciones `repeats:true`, `text`>90, `warning`>60, ids duplicados) y acepta explícitamente cero secciones repetibles e ids con guiones por segmento.
- El motor puro (`flatten`/`expand`/`next`/`prev`/`jumpTo`/`resolveText`) pasa 29 tests en `npx vitest run --project engine` (0 código de salida), incluyendo cierre de bucle con incremento de `round`, clamp sin sección repetible, salto (`jumpTo`) dentro y fuera del tramo repetible con `round` intacto, inmutabilidad de las tres funciones de navegación, y resolución de variantes de dificultad sin tocar fórmulas ni tokens numéricos.
- `content/marvel-champions.json` tiene contenido real y citado (bloque HÉROES, 3 pasos, cita RR v1.7 p.49 cada uno) que valida contra el esquema real dentro de `engine/__tests__/content.test.ts`, con gates genéricos (citation, presupuesto de 90 caracteres, ausencia de recuento de jugadores) que recorren `sections[].phases[].steps[]` sin enumerar ids a mano — el plan 01-03 solo tiene que ampliar el JSON, no reescribir el test.
- `content/games-index.ts` expone `title` (nunca `name`) y marca `warhammer-40k` como `status: 'coming-soon'`.
- `npm run test` (el comando que ejecuta `.github/workflows/ci.yml`) termina en verde con **29 tests, 4 ficheros de test**.

## Task Commits

1. **Tarea 1 — RED (test para GameDefinitionSchema)** - `9774860` (test)
2. **Tarea 1 — GREEN (types.ts + schema.ts)** - `7555f6b` (feat)
3. **Tarea 2 — RED (fixture + tests de flatten/expand/navigator/resolve)** - `8278c5f` (test)
4. **Tarea 2 — GREEN (flatten.ts, expand.ts, navigator.ts, resolve.ts + fix de comentario en schema.ts)** - `db12559` (feat)
5. **Tarea 3 — contenido real de Marvel Champions y gate de contenido** - `638966c` (feat, sin TDD — la tarea no lleva `tdd="true"`)

No hubo fase REFACTOR en ninguna tarea: el código quedó limpio tras GREEN sin necesitar limpieza adicional.

## Files Created/Modified

- `engine/types.ts` - contratos de tipos: `warning`/`speech` (no `detail`), `kind: 'step'|'summary'`, sin `perPlayer` ni `branches`, `SessionContext` abierto
- `engine/schema.ts` - Zod: `idPattern` con guiones por segmento, presupuesto 90/60, `repeats<=1` (`TODO(fase 2)`), ids únicos en todo el fichero; único importador de `zod` del repo
- `engine/flatten.ts` - recorre sección→fase→paso una vez, construye `breadcrumb`
- `engine/expand.ts` - calcula `loopStartIndex`/`loopEndIndex` a partir de la única sección `repeats:true` (o los deja `undefined`)
- `engine/navigator.ts` - `next`/`prev`/`jumpTo` puros, guards `!== undefined`, `jumpTo` no-op ante `runtimeId` inexistente
- `engine/resolve.ts` - `resolveText()` fusiona campo a campo la variante de dificultad sobre el bloque base
- `engine/__tests__/schema.test.ts` - 9 tests, casos inválidos construidos en memoria mutando una base válida
- `engine/__tests__/fixtures/tiny-game.json` - 6 pasos, 2 secciones, la segunda `repeats:true` de 3 pasos, un paso con `variants.difficulty.expert`; sin terminología de Marvel Champions
- `engine/__tests__/navigator.test.ts` - 12 tests: `flatten` (1), `expand` (2), `next` (3), `prev` (3), `jumpTo` (3)
- `engine/__tests__/resolve.test.ts` - 4 tests de `resolveText`
- `engine/__tests__/content.test.ts` - 4 tests que validan el contenido real contra el esquema y recorren los pasos de forma genérica
- `content/games-index.ts` - `games: GameIndexEntry[]` con `title`/`status`
- `content/marvel-champions.json` - bloque HÉROES (3 pasos), sección `setup` (`repeats:false`), `contentVersion: 1`

## Decisions Made

- Ver `key-decisions` en el frontmatter.
- El desglose de 21 pasos y las notas de reordenamiento de `01-RESEARCH.md` quedan intactas para el plan 01-03: esta tarea solo autora las filas 1-3 (bloque HÉROES) tal como pedía el plan, sin adelantar contenido de bloques posteriores.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comentario de `engine/schema.ts` mencionaba "HÉROES"/"ARCHIENEMIGOS" (nombres de bloques de Marvel Champions)**
- **Found during:** Tarea 2, verificación previa al commit (`grep -riE "marvel|champion|villano|h(e|é)roe" engine/*.ts engine/__tests__/fixtures/`, gate explícito del `<verify>` de esa tarea)
- **Issue:** el comentario junto a `PhaseSchema.title` (copiado literalmente del ejemplo de código de `01-RESEARCH.md`) citaba `"HÉROES", "ARCHIENEMIGOS"...` como ejemplo de rótulos de bloque. El grep de la Tarea 2 incluye `h(e|é)roe`, así que ese comentario habría hecho fallar el gate de agnosticismo del motor (TECH-04) aunque el código en sí no dependiera de Marvel Champions — el motor no debe conocer el juego ni en comentarios.
- **Fix:** reescrito a `// rótulo de bloque autorado — fuente del índice de salto`, sin ningún nombre de bloque concreto.
- **Files modified:** `engine/schema.ts`
- **Verification:** `! grep -riE "marvel|champion|villano|h(e|é)roe" engine/*.ts engine/__tests__/fixtures/ && echo ENGINE_GAME_AGNOSTIC_OK` → `ENGINE_GAME_AGNOSTIC_OK`
- **Committed in:** `db12559` (Tarea 2)

---

**Total deviations:** 1 auto-fixed (bug de comentario, sin impacto funcional). Ninguna es un cambio arquitectónico (Rule 4 no aplicó).

### Nota sobre una inconsistencia menor del propio plan (no requirió decisión, documentada por transparencia)

El `<verify>` de la Tarea 2 usa el patrón `marvel|champion|villano|h(e|é)roe`, mientras que los `<acceptance_criteria>` de esa misma tarea y el `<verification>` global del plan solo mencionan `marvel|champion`. Se ejecutó y satisfizo el patrón más estricto (el del `<verify>`) en todo `engine/`, que es un superconjunto del más laxo — no hubo necesidad de elegir entre ambos ni de detenerse a preguntar.

## Issues Encountered

Ninguno. El esquema Zod validó el contenido real de Marvel Champions al primer intento, sin necesitar ningún ajuste adicional respecto a la propuesta de `01-RESEARCH.md` (además del fix de comentario documentado arriba, que no toca la lógica del esquema).

## Next Phase Readiness

- El plan `01-08` puede consumir `engine/navigator.ts`, `engine/expand.ts`, `engine/resolve.ts` y `content/*` con los alias `~~/engine/...`/`~~/content/...` ya disponibles desde 01-01, sin explorar el código del motor.
- El plan `01-03` puede ampliar `content/marvel-champions.json` con los 18 pasos restantes y la pantalla "mesa lista" (bloques ARCHIENEMIGOS, MAZO DE ENCUENTROS, ESCENARIO DEL VILLANO, MANOS INICIALES, JUGADOR INICIAL) ampliando `engine/__tests__/content.test.ts` en vez de reescribirlo, y recordando incrementar `contentVersion` en cada edición futura, sin excepciones (disciplina de versión vigente desde este commit).
- La invariante `repeating.length <= 1` de `engine/schema.ts` queda con su `TODO(fase 2)` explícito: cuando la Fase 2 autore la sección `round` (`repeats:true`), habrá que endurecerla a `=== 1`.

## Self-Check

```
FOUND: engine/types.ts
FOUND: engine/schema.ts
FOUND: engine/flatten.ts
FOUND: engine/expand.ts
FOUND: engine/navigator.ts
FOUND: engine/resolve.ts
FOUND: engine/__tests__/schema.test.ts
FOUND: engine/__tests__/fixtures/tiny-game.json
FOUND: engine/__tests__/navigator.test.ts
FOUND: engine/__tests__/resolve.test.ts
FOUND: engine/__tests__/content.test.ts
FOUND: content/games-index.ts
FOUND: content/marvel-champions.json
FOUND commit: 9774860
FOUND commit: 7555f6b
FOUND commit: 8278c5f
FOUND commit: db12559
FOUND commit: 638966c
```

## Self-Check: PASSED

---
*Phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa*
*Plan: 07*
*Completed: 2026-08-28*
