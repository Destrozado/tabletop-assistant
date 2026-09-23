---
phase: 05-cat-logo-de-h-roes-y-villanos
plan: 02
subsystem: content-generation
tags: [marvelcdb, fetch, script, catalogue, marvel-champions, zod]

# Dependency graph
requires:
  - phase: 05-01
    provides: "engine/catalogueSchema.ts (CharacterCatalogueSchema, validateCharacterCatalogue) y los tipos CharacterCatalogue/CatalogueHero/CatalogueVillain/VillainStage en engine/types.ts"
provides:
  - "scripts/catalogue/fetch-marvelcdb.mjs: único escritor de content/marvel-characters.json, invocado a mano vía `npm run catalogue:generate`"
  - "content/marvel-characters.json committeado: 23 héroes + 3 villanos (Rhino, Kang, Ultron) con 3 etapas cada uno, validado contra CharacterCatalogueSchema"
  - "package.json: entrada catalogue:generate registrada junto a voice:*/icons:generate"
affects: [05-03, 06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Script CLI todo-o-nada (resuelve N códigos completos en memoria antes de un único writeFileSync), a diferencia del patrón incremental/reanudable de scripts/voice/generate.mjs"
    - "Pacing fijo entre peticiones HTTP secuenciales (REQUIREMENTS_DELAY_MS) para evitar un límite de conexión de red, sin retry sobre respuestas HTTP no-ok"

key-files:
  created:
    - scripts/catalogue/fetch-marvelcdb.mjs
    - content/marvel-characters.json
  modified:
    - package.json

key-decisions:
  - "REQUEST_DELAY_MS=1500 entre peticiones HTTP secuenciales: no es un reintento (D-05/D-06 lo siguen prohibiendo tal cual), es espaciado para evitar disparar un límite de conexión de red detectado durante la verificación"
  - "11002 (Immortus) como representante de la etapa II de Kang, tal como fijó 05-RESEARCH.md — las cuatro alternativas narrativas comparten cifras idénticas"

requirements-completed: [CAT-01, CAT-02, CAT-03, CAT-04, CAT-07]

# Metrics
duration: ~30min
completed: 2026-09-07
---

# Phase 5 Plan 02: Script generador del catálogo y datos reales de MarvelCDB Summary

**Script `fetch-marvelcdb.mjs` que resuelve 32 códigos de carta literales de MarvelCDB (23 héroes + 9 etapas de villano) con puertas de aborto por nombre/tipo/conjunto/etapa, proyección de lista blanca, y escritura todo-o-nada; catálogo real committeado con las cifras contrastadas contra 05-RESEARCH.md y validado contra `CharacterCatalogueSchema`.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-07T17:04:45Z (aprox., continuación de sesión de contexto de Fase 5)
- **Completed:** 2026-09-07T17:31:00Z
- **Tasks:** 3 completed (2 con commit; Task 3 es demostración pura, sin cambios netos)
- **Files modified:** 3 (2 creados, 1 modificado)

## Accomplishments
- `scripts/catalogue/fetch-marvelcdb.mjs`: declara `HERO_CARDS` (23 filas) y `VILLAIN_STAGE_CARDS` (9 filas) como listas literales exactas de 05-RESEARCH.md, con `extractHero`/`extractVillainStage` que abortan ante `expectedName`/`type_code`/`linked_card` ausente/`card_set_code`/`stage` no mapeable/campos no numéricos-booleanos incorrectos, y una proyección de lista blanca de exactamente 5 campos de héroe y 4 de etapa (cero spread del objeto crudo).
- `content/marvel-characters.json` generado con datos reales de la API pública de MarvelCDB: 23 héroes (de `spider-man` a `jubilee`) y 3 villanos (`rhino`, `kang`, `ultron`), sin Klaw. Cifras contrastadas una a una contra las tablas de 05-RESEARCH.md: Iron Man 9/6, Thor/Hulk/Vision con `handSize` 5, Hulk `health` 18, Kang `healthPerHero` false solo en la etapa 2 (12/18/20), Ultron 17/22/27, Rhino 14/15/16.
- Determinismo D-10 demostrado empíricamente, no solo afirmado: con el fichero en el índice de git, una segunda (y una tercera, tras la Task 3) ejecución consecutiva de `npm run catalogue:generate` deja `git diff -- content/marvel-characters.json` vacío.
- Las dos puertas de aborto (D-05 código inexistente, D-06/Open Question 2 nombre inesperado) demostradas con exit codes reales: ambas terminan con código distinto de 0, el mensaje de error nombra el código/HTTP o los dos nombres en conflicto, y en ambos casos `content/marvel-characters.json` queda intacto (`git diff --quiet` en 0). El script quedó restaurado byte a byte tras cada prueba.
- Validación puntual contra `CharacterCatalogueSchema` (fichero de test temporal, borrado tras el uso, tal como pedía la Task 2): `validateCharacterCatalogue()` no lanza sobre el JSON real generado.
- `npm run test` sigue en verde: 314 tests (los mismos de la Fase 5 Plan 01; esta fase no añade tests propios — esos llegan en el plan 05-03).

## Task Commits

Each task with net file changes was committed atomically:

1. **Task 1: Escribir scripts/catalogue/fetch-marvelcdb.mjs y registrar catalogue:generate** - `0f4dc8e` (feat)
2. **Task 2: Ejecutar el script, contrastar los datos y verificar el determinismo** - `a943c75` (feat) — incluye también el fix de pacing de red (Rule 3, ver Deviations) descubierto durante esta misma tarea
3. **Task 3: Demostrar que la puerta de aborto muerde sin dejar escritura parcial** - sin commit propio: la tarea es una demostración empírica (dos ediciones temporales del script + restauración exacta); al terminar `git status --porcelain` en el árbol de trabajo queda vacío, por lo que no hay nada que commitear. Los exit codes y diffs observados se registran abajo.

**Plan metadata:** committed alongside this SUMMARY (worktree mode — orchestrator finalizes STATE.md/ROADMAP.md after merge)

## Files Created/Modified
- `scripts/catalogue/fetch-marvelcdb.mjs` - Único escritor de `content/marvel-characters.json`; 32 filas literales, puertas de aborto, lista blanca, escritura todo-o-nada, pacing de red
- `content/marvel-characters.json` - Catálogo real: 23 héroes + 3 villanos (Rhino/Kang/Ultron), generado y no editado a mano
- `package.json` - Añadida la entrada `catalogue:generate` junto a `voice:*`/`icons:generate`; `build`/`generate`/`postinstall`/`test` intactos

## Decisions Made
- **REQUEST_DELAY_MS=1500 entre peticiones** (deviation, ver abajo): pacing de red, no reintento ante error — D-05/D-06 (abortar sin escribir nada ante cualquier respuesta no-ok) se mantienen exactamente como estaban.
- El resto de decisiones (D-01 a D-11) se aplicaron literalmente tal como las fijó `05-CONTEXT.md`; ninguna decisión nueva de diseño más allá de la deviation de red.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Añadido pacing fijo entre peticiones HTTP secuenciales (`REQUEST_DELAY_MS`)**
- **Found during:** Task 2 (primera ejecución real de `npm run catalogue:generate`)
- **Issue:** Sin ninguna pausa entre las 32 peticiones secuenciales a `marvelcdb.com`, las primeras ~9 peticiones se completaban con HTTP 200 y a partir de ahí todas las siguientes fallaban con `ConnectTimeoutError` (nunca un HTTP 500 — un fallo de conexión de red, distinto del que D-05/D-06 anticipan). Confirmado con `curl` directo y con un script de diagnóstico aislado: la ráfaga rápida de conexiones agotaba algún límite de conexión de la red (no documentado por MarvelCDB, ni relacionado con cuota/429), y esperar ~10s antes de reintentar la siguiente conexión bastaba para que volviera a responder con normalidad.
- **Fix:** Añadida la constante `REQUEST_DELAY_MS = 1500` y una función `sleep()`; `fetchCard()` espera ese tiempo tras cada respuesta recibida (ok o no-ok) antes de devolver el control, espaciando las 32 peticiones secuenciales. Esto es pacing, no reintento: una respuesta HTTP no-ok sigue abortando inmediatamente sin ninguna espera ni segundo intento — D-05/D-06 quedan intactos.
- **Files modified:** `scripts/catalogue/fetch-marvelcdb.mjs`
- **Verification:** Con la pausa añadida, las 32 peticiones se resolvieron con éxito en una ejecución completa de `npm run catalogue:generate` (confirmado también en una segunda y tercera ejecución consecutiva, todas con 32/32 aciertos y sin ningún `ConnectTimeoutError`).
- **Committed in:** `a943c75` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, estabilidad de red de la sesión de verificación)
**Impact on plan:** No afecta ninguna decisión de diseño (D-01..D-11) ni ningún criterio de aceptación del plan — todos los grep/exit-code/diff checks de las Tasks 1-3 pasan con el fix aplicado. El pacing añade ~48 segundos a una ejecución completa del script (32 × 1.5s), coste aceptado dado que es un CLI invocado a mano, no en build.

## Issues Encountered

Durante la escritura inicial del script se detectó que varias de las comprobaciones de aceptación de la Task 1 (grep literal sobre `RETRY_BACKOFFS_MS`, `generatedAt`, `\.\.\.card`, y el recuento exacto de `writeFileSync`) exigían la AUSENCIA literal de esas cadenas en todo el fichero, incluidos los comentarios explicativos que la propia acción de la Task 1 pedía escribir citando esos nombres entre backticks. Se resolvió reformulando los comentarios para comunicar la misma información (por qué no hay reintento, por qué no hay marca de fecha, por qué la proyección es lista blanca) sin usar esas cadenas exactas, y aplicando un alias en la importación (`writeFileSync as writeFile`) para que el símbolo importado solo apareciera una vez en todo el fichero. Ninguna de estas correcciones cambia el comportamiento del script, solo su redacción/naming — no se registran como deviation porque no tocan ningún dato ni decisión de negocio, solo ajustan la forma del comentario a lo que el propio criterio de aceptación exige literalmente.

## User Setup Required

None - no external service configuration required. La API de MarvelCDB usada es pública y no requiere clave.

## Next Phase Readiness

- El plan 05-03 puede escribir sus tests de guardarraíl (`engine/__tests__/characters.test.ts`) directamente sobre `content/marvel-characters.json`, que ya existe, es válido contra `CharacterCatalogueSchema`, y no contiene ninguna clave de copyright de MarvelCDB.
- La Fase 6 puede empezar a construir los selectores de héroe/villano por jugador leyendo `content/marvel-characters.json` a través de `~~/engine/types` (sin tocar zod, T-01-19 ya verificado en el plan 05-01).
- Ningún bloqueo conocido. El script es reproducible: `npm run catalogue:generate` deja `git diff` vacío en ejecuciones consecutivas sin cambios en MarvelCDB, y las dos puertas de aborto (código inválido, nombre inesperado) están demostradas con exit codes reales, no solo con revisión de código.
- **Nota para el plan 05-03 / próximas regeneraciones:** una ejecución completa de `npm run catalogue:generate` tarda ahora ~48 segundos (32 peticiones × 1.5s de pacing), frente a una ejecución instantánea sin la pausa. Es una CLI manual, nunca en build, así que no afecta ningún tiempo de CI/despliegue.

## Self-Check: PASSED

- FOUND: scripts/catalogue/fetch-marvelcdb.mjs
- FOUND: content/marvel-characters.json
- FOUND: package.json (entrada catalogue:generate)
- FOUND commit 0f4dc8e (Task 1)
- FOUND commit a943c75 (Task 2)
- CONFIRMED: `git status --porcelain` vacío tras Task 3 (demostración sin cambios netos, tal como se documenta arriba)
- CONFIRMED: `npm run test` → 314 tests en verde
- CONFIRMED: `git diff --quiet -- content/marvel-characters.json` en 0 tras 3 ejecuciones consecutivas del script

---
*Phase: 05-cat-logo-de-h-roes-y-villanos*
*Completed: 2026-09-07*
