---
phase: 05-cat-logo-de-h-roes-y-villanos
plan: 03
subsystem: content-schema
tags: [vitest, catalogue, marvel-champions, ci-gate, copyright-guardrail]

# Dependency graph
requires:
  - phase: 05-01
    provides: "engine/catalogueSchema.ts (CharacterCatalogueSchema, validateCharacterCatalogue)"
  - phase: 05-02
    provides: "content/marvel-characters.json (catálogo real) y package.json (entrada catalogue:generate)"
provides:
  - "engine/__tests__/characters.test.ts: valida content/marvel-characters.json contra CharacterCatalogueSchema, guardarraíl anti-copyright sobre el crudo (FORBIDDEN_KEYS), invariantes de forma sobre héroes/villanos sin recuento literal"
  - "engine/__tests__/catalogue-isolation.test.ts: gate que impide que el script de catálogo entre en build/generate/postinstall/test/CI, verifica CAT-03/CAT-07 documentados, y que ni el catálogo ni app/ tengan referencias remotas"
affects: [06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Segundo par de gates SOLO LECTOR (característico de engine/__tests__/voice-drift.test.ts): función pura local compartida entre el gate real y un test de 'el gate muerde' (findForbiddenKey / referencesCatalogueScript)"
    - "Guardarraíl anti-copyright grep-based sobre el string crudo (readFileSync), independiente de z.strictObject, siguiendo el patrón CR-01 de content.test.ts"

key-files:
  created:
    - engine/__tests__/characters.test.ts
    - engine/__tests__/catalogue-isolation.test.ts
  modified: []

key-decisions:
  - "Ningún test de characters.test.ts fija toHaveLength(23)/toHaveLength(3) ni enumera nombres de héroe/villano — verificado con grep negativo en los criterios de aceptación (CAT-07)"
  - "Los comentarios de characters.test.ts que explican qué NO se hace se redactaron evitando la subcadena literal que el propio grep de aceptación busca (mismo ajuste de redacción que documentó 05-02 para RETRY_BACKOFFS_MS), para no producir un falso positivo contra el propio gate anti-recuento"

requirements-completed: [CAT-04, CAT-05, CAT-06, CAT-07]

# Metrics
duration: 25min
completed: 2026-09-07
---

# Phase 5 Plan 03: Gates de CI del catálogo de personajes Summary

**Dos suites Vitest SOLO LECTOR que cierran el catálogo de personajes como artefacto de confianza: `characters.test.ts` valida el JSON real contra el esquema y grep-ea el crudo contra 20 claves de copyright de MarvelCDB, y `catalogue-isolation.test.ts` prueba con mutaciones reales revertidas que el script generador no puede colarse en build ni en CI.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-07T17:34:00Z (aprox.)
- **Completed:** 2026-09-07T17:38:35Z
- **Tasks:** 2 completed
- **Files modified:** 2 (2 creados, 0 modificados)

## Accomplishments

- `engine/__tests__/characters.test.ts` (168 líneas): espejo estructural de `engine/__tests__/content.test.ts` sin `expand`/`resolveText`. Un test de entrada (`valida contra CharacterCatalogueSchema`), un `describe` con 20 tests `it.each` sobre `FORBIDDEN_KEYS` que operan sobre el **string crudo** del fichero (nunca sobre el objeto ya validado), un test que demuestra que el gate muerde sobre un string sintético, invariantes de forma sobre héroes (name/alterEgo no vacíos, health/handSize enteros positivos, ids únicos, no vacío) y villanos (al menos una etapa, etapas consecutivas desde 1, health/booleanos válidos, ids únicos, no vacío), un test D-11 que verifica que cada etapa expone exactamente `stage`/`health`/`healthPerHero`/`healthPerGroup` (ni una clave precomputada por jugadores más), y un test CAT-07 que documenta la ausencia deliberada de recuento fijo.
- `engine/__tests__/catalogue-isolation.test.ts` (117 líneas): espejo del patrón SOLO LECTOR de `voice-drift.test.ts`, con `referencesCatalogueScript()` como función pura compartida entre el gate real y el test de "el gate muerde". Comprueba que ninguna de las seis entradas guardadas de `package.json` (`build`, `generate`, `preview`, `dev`, `postinstall`, `test`) ni `.github/workflows/ci.yml` referencian `catalogue:generate` o `fetch-marvelcdb`; que el punto de entrada CAT-03 está declarado con su valor exacto y el script existe; que el marcador de procedimiento CAT-07 sigue en el script; que el catálogo committeado no contiene `http`/`marvelcdb`/`api`; y que ningún fichero `.vue`/`.ts`/`.js` de `app/` referencia el script ni la API.
- Los cuatro ensayos de mutación exigidos por el plan se ejecutaron y revirtieron con éxito (ver tabla abajo): cada uno hace fallar la suite en verde y, tras `git checkout --` del fichero mutado, la suite vuelve a exit code 0.
- `npm run test` termina en verde con 359 tests (347 previos de la Fase 5 Plan 01/02 + 12 nuevos de `catalogue-isolation.test.ts` + los ya contados de `characters.test.ts`; recuento exacto: 314 base tras 05-02 → 33 de `characters.test.ts` (325→347 tras recuento de suite) → +12 de `catalogue-isolation.test.ts` = 359).
- `npx vitest run --project engine` sigue en verde con la suite completa del motor (236 tests, 12 ficheros).

## Ensayos de Mutación (verificación §2 del plan)

| # | Fichero mutado | Cambio | Resultado antes de revertir | Resultado tras `git checkout --` |
|---|-----------------|--------|------------------------------|-----------------------------------|
| 1 | `content/marvel-characters.json` | Insertada la clave `"flavor": "test copyright text"` en el primer héroe | Exit 1 (Zod: `Unrecognized key: "flavor"`) | Exit 0 |
| 2 | `content/marvel-characters.json` | `handSize` del primer héroe cambiado de `6` a `0` | Exit 1 (Zod: `Too small: expected number to be >0`) | Exit 0 |
| 3 | `package.json` | Prefijado `npm run catalogue:generate && ` al script `build` | Exit 1 (`scripts["build"]` referencia el script de catálogo) | Exit 0 |
| 4 | `.github/workflows/ci.yml` | Añadido paso `run: npm run catalogue:generate` tras "Run tests" | Exit 1 (`referencesCatalogueScript(ciWorkflowText)` → true) | Exit 0 |

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate del catálogo real — esquema, forma y guardarraíl anti-copyright** - `9140957` (test)
2. **Task 2: Gate de aislamiento — el script nunca entra en build ni en CI, y el catálogo no pide red** - `dce77dd` (test)

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator finalizes STATE.md/ROADMAP.md after merge)

## Files Created/Modified

- `engine/__tests__/characters.test.ts` - Nuevo. Gate del catálogo real: esquema + guardarraíl anti-copyright sobre el crudo + invariantes de forma
- `engine/__tests__/catalogue-isolation.test.ts` - Nuevo. Gate de aislamiento: el script de generación nunca entra en build/CI, sin referencias remotas

## Decisions Made

Ninguna decisión de diseño nueva más allá de las que ya cerraron los planes 05-01/05-02 (DC-01, DC-02, DC-03, D-05, D-06, D-09, D-10, D-11), aplicadas literalmente en forma de test:

- El guardarraíl anti-copyright de `characters.test.ts` opera sobre `rawText` (`readFileSync`), nunca sobre el objeto `catalogue` ya validado por Zod — mismo motivo que documenta el comentario CR-01 junto a `findRawStep` en `content.test.ts`: un gate de ausencia sobre el objeto validado sería estructuralmente incapaz de fallar.
- Un ajuste de redacción (no una deviation de comportamiento): el comentario del test CAT-07 en `characters.test.ts` inicialmente citaba literalmente `toHaveLength(23) ni toHaveLength(3)`, lo que el propio grep de aceptación (`toHaveLength\(23\)|toHaveLength\(3\)`) detectaba como un falso positivo dentro de un comentario. Se reformuló sin cambiar el significado ("jamás una longitud fija de héroes ni de villanos"), mismo patrón que 05-02 documentó para `RETRY_BACKOFFS_MS`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Regenerado `.nuxt/` con `nuxt prepare` antes de poder ejecutar la suite**
- **Found during:** inicio de ejecución (verificación previa a Task 1)
- **Issue:** El worktree no tenía `.nuxt/tsconfig.app.json` generado (directorio gitignored). Mismo problema de infraestructura ya documentado en 05-01-SUMMARY.md, no causado por código de este plan.
- **Fix:** Ejecutado `npx nuxt prepare` una vez.
- **Files modified:** ninguno versionado (solo `.nuxt/`, gitignored)
- **Verification:** `npx vitest run --project engine` pasó de fallar por tsconfig a 191 tests en verde antes de empezar Task 1.
- **Committed in:** N/A (nada que comitear)

**2. [Rule 1 - Bug] Reformulado un comentario de `characters.test.ts` que producía un falso positivo contra su propio grep de aceptación**
- **Found during:** Task 1 (verificación del criterio de aceptación `grep -Ec "toHaveLength\(23\)|toHaveLength\(3\)|..."` debe devolver 0)
- **Issue:** El primer borrador del comentario del test CAT-07 citaba literalmente `toHaveLength(23) ni toHaveLength(3)` para explicar qué está prohibido — el propio grep de aceptación, que busca esa subcadena en todo el fichero (código y comentarios por igual), lo detectaba como si el test mismo fijara un recuento.
- **Fix:** Reformulado el comentario sin usar esa subcadena literal, preservando el significado.
- **Files modified:** `engine/__tests__/characters.test.ts`
- **Verification:** `grep -Ec "toHaveLength\(23\)|toHaveLength\(3\)|length === 23|length === 3" engine/__tests__/characters.test.ts` devuelve 0; la suite sigue en verde.
- **Committed in:** `9140957` (Task 1 commit, no hubo commit intermedio con la versión incorrecta)

---

**Total deviations:** 2 auto-fixed (1 blocking de infraestructura de entorno, 1 bug de redacción sin impacto de comportamiento)
**Impact on plan:** Ninguno sobre el alcance ni las decisiones de diseño del plan. Ambos ajustes son de entorno/redacción, no de lógica de test ni de esquema.

## Issues Encountered

Ninguno más allá de las deviations documentadas arriba.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CAT-05 satisfecho: un catálogo malformado hace fallar `npm run test` (demostrado con dos mutaciones reales revertidas).
- CAT-04 satisfecho con doble barrera comprobada: `z.strictObject` (plan 05-01) + blocklist sobre el crudo (este plan), con prueba de que la segunda muerde por sí sola sobre un string sintético.
- CAT-06 satisfecho en lo que esta fase puede satisfacer: el catálogo no contiene ninguna referencia remota y un gate impide que su generación se cuele en build o CI; además ningún fichero de `app/` lo referencia todavía (no hay consumidor: eso llega en la Fase 6).
- CAT-07 satisfecho de forma comprobable: ningún test fija un recuento de personajes (verificado por grep negativo), y el procedimiento de una fila sigue documentado en el script, comprobado por un gate automatizado.
- La Fase 6 puede empezar a construir los selectores de héroe/villano por jugador con la certeza de que `content/marvel-characters.json` seguirá siendo válido en cada push, y que el script que lo genera nunca podrá acabar cableado en su propio build.
- Ningún bloqueo conocido. `npm run test` cierra en verde con 359 tests.

## Self-Check: PASSED

- FOUND: engine/__tests__/characters.test.ts
- FOUND: engine/__tests__/catalogue-isolation.test.ts
- FOUND: .planning/phases/05-cat-logo-de-h-roes-y-villanos/05-03-SUMMARY.md
- FOUND commit 9140957 (Task 1)
- FOUND commit dce77dd (Task 2)

---
*Phase: 05-cat-logo-de-h-roes-y-villanos*
*Completed: 2026-09-07*
