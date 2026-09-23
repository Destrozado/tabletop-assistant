---
phase: 05-cat-logo-de-h-roes-y-villanos
plan: 05
subsystem: testing
tags: [vitest, zod, catalogue, gap-closure, test-collection]

# Dependency graph
requires:
  - phase: 05-cat-logo-de-h-roes-y-villanos
    provides: "plan 05-04: contrato handSizeHero/handSizeAlterEgo, clave legada handSize eliminada"
provides:
  - "Guardarraíl anti-copyright (characters.test.ts) estructuralmente independiente del éxito del esquema Zod"
  - "Gate de aislamiento (catalogue-isolation.test.ts) con lectores perezosos, un package.json ilegible ya no cancela CAT-06/CAT-07/barrido de app/"
  - "Gap CR-02 de 05-VERIFICATION.md cerrado y evidenciado con pruebas de mutación"
affects: [05-verification, catalogue-schema]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lector perezoso memoizado invocado dentro de cada it() (nunca en ámbito de módulo ni de describe()) para que un throw de datos falle SOLO el test que lo usa, no toda la colección de la suite"

key-files:
  created: []
  modified:
    - engine/__tests__/characters.test.ts
    - engine/__tests__/catalogue-isolation.test.ts

key-decisions:
  - "loadValidatedCatalogue() no memoiza el resultado ni el error: valida en cada llamada (26 entradas, barato) para que cada it() reporte su propio fallo de esquema con su propio mensaje"
  - "readRawCatalogueText() sí memoiza el string crudo (let module-scope) porque leerlo 21 veces por ejecución es coste innecesario y el string no cambia entre tests"
  - "Prueba B (package.json ilegible) no pudo ejecutarse literalmente contra el package.json real del repo: Vite/rolldown necesita parsear ese mismo fichero para arrancar su propio bundler de vitest.config.ts, así que romperlo hace fallar el arranque de Vitest antes de colectar ningún test — no es un fallo del gate, es una restricción de la cadena de herramientas. Se documenta la evidencia de los 3 intentos y se sustituye por un arnés equivalente en el scratchpad (fuera del repo) que reproduce el mismo patrón de lectores perezosos contra un fichero JSON hermano, demostrando el mecanismo de aislamiento sin tocar el package.json real"

patterns-established:
  - "Ningún test de gate (characters.test.ts, catalogue-isolation.test.ts) lee ni valida datos en ámbito de módulo o de describe(): todo acceso a fichero/JSON.parse/Zod vive dentro del cuerpo de un it()"

requirements-completed: [CAT-04, CAT-05]

# Metrics
duration: 25min
completed: 2026-09-07
---

# Phase 05 Plan 05: Cierre de gap CR-02 — acceso perezoso en los gates anti-copyright y de aislamiento Summary

**Los dos gates de `engine/__tests__/` (anti-copyright y aislamiento del script de catálogo) leen y validan sus datos de forma perezosa dentro de cada `it()`, así que un throw en un test ya no cancela la colección de los demás — demostrado con dos pruebas de mutación reales.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-07T19:36:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `engine/__tests__/characters.test.ts` reestructurado: `readRawCatalogueText()` (memoizado) y `loadValidatedCatalogue()` (no memoizado) perezosos, invocados dentro de cada `it()`; ninguna lectura/parseo/validación queda en ámbito de módulo ni de `describe()`.
- `engine/__tests__/catalogue-isolation.test.ts` reestructurado: cinco lectores perezosos (`readPackageJsonText`/`loadPackageJson`/`readCiWorkflowText`/`readCatalogueScriptText`/`readCatalogueContentText`), cada `it()` llama solo a los que necesita.
- Cabecera de `characters.test.ts` reescrita citando el gap CR-02, el síntoma exacto (`Tests no tests`) y por qué la carga no puede volver a ámbito de módulo ni de `describe`.
- Recuento de tests preservado: 239 en el proyecto `engine`, 362 en total (igual que antes de este plan, según 05-04-SUMMARY.md) — los gates se reestructuraron, no se eliminó ninguno.
- Prueba de mutación A (doble defecto en `content/marvel-characters.json`) reproducida y revertida: confirma que los 34 tests de `characters.test.ts` se siguen colectando y que la clave prohibida se nombra en su propio fallo.
- Prueba de mutación B (package.json ilegible) no pudo ejecutarse literalmente contra el repo real por una restricción de la cadena de herramientas (ver Decisiones); se documentan los 3 intentos y se sustituye por un arnés equivalente fuera del repo que demuestra el mismo mecanismo.

## Task Commits

1. **Task 1: Acceso perezoso — que cada aserción de los dos gates pueda fallar sola** - `24f0bb7` (fix)
2. **Task 2: Prueba de mutación — reproducir la evidencia del verificador** - sin commit propio (tarea de verificación con mutaciones temporales, revertidas; `files_modified` del plan declara "ninguno" para esta tarea)

**Plan metadata:** (se añade en el commit de cierre de plan)

## Files Created/Modified

- `engine/__tests__/characters.test.ts` - lectores perezosos `readRawCatalogueText()`/`loadValidatedCatalogue()`, invocados dentro de cada `it()`; cabecera reescrita citando CR-02
- `engine/__tests__/catalogue-isolation.test.ts` - lectores perezosos por fichero, invocados dentro de cada `it()`; cabecera documenta que un `package.json` roto ya no cancela CAT-06/CAT-07/barrido de `app/`

## Decisions Made

- `loadValidatedCatalogue()` no memoiza: cada llamada vuelve a parsear y validar (barato, 26 entradas) para que cada test de invariantes reporte su propio fallo de esquema de forma independiente, en vez de compartir un estado ya roto de una llamada anterior.
- `readRawCatalogueText()` sí memoiza el string crudo en una variable de módulo `let`, porque el string no cambia entre tests y evita 21 lecturas de disco redundantes por ejecución.
- Prueba B se documenta con evidencia de por qué el diseño literal del plan no es ejecutable contra el `package.json` real (ver Deviaciones), y se sustituye por un arnés que reproduce el mismo mecanismo sin ese conflicto de arranque.

## Deviations from Plan

### Auto-fixed Issues

Ninguna — Task 1 se ejecutó tal como especifica el plan, sin necesidad de fixes adicionales.

### Adaptación de evidencia (no cubierta por Reglas 1-3, documentada para transparencia)

**1. Prueba B (package.json ilegible) rediseñada: el package.json real del repo no puede corromperse sin romper el arranque de Vite/Vitest**

- **Encontrado durante:** Task 2, Prueba B
- **Problema:** El plan instruye corromper `package.json` (quitar una llave de cierre) e invocar `npx vitest run --project engine engine/__tests__/catalogue-isolation.test.ts` directamente. Se probaron 3 mutaciones distintas — (a) quitar la llave de cierre final, (b) insertar una coma sobrante antes del cierre, (c) vaciar el fichero por completo — y las tres hicieron que Vitest fallara ANTES de colectar ningún test, con el mismo error en las tres:
  ```
  [UNHANDLEABLE_ERROR] Something went wrong inside rolldown...
  JSONError { path: ".../package.json", message: "..." }
      at ... bundleConfigFile ... loadConfigFromFile ... resolveConfig ... createViteServer ... createVitest
  ```
  Vite usa `rolldown` para empaquetar `vitest.config.ts` antes de arrancar, y ese paso necesita parsear el `package.json` de la raíz del proyecto (para resolver `"type": "module"` y metadatos de dependencias) — el mismo fichero que la Prueba B quiere corromper. Romperlo no falla un test: impide que Vitest arranque siquiera, con un error de nivel de build, no de colección de tests.
- **Por qué no es un fallo del gate que este plan cierra:** el límite de fallo NO está en `catalogue-isolation.test.ts` (que nunca llega a evaluarse) sino en el propio arranque de Vite/rolldown, una capa muchísimo más temprana y totalmente ajena a la reestructuración de la Task 1. Un `package.json` sintácticamente roto ya haría fallar `npm ci`/`npm install`/cualquier `npx vitest` en CI, mucho antes de que este gate específico pudiera importar. El escenario que Prueba B quiere demostrar (aislamiento a nivel de test) sigue siendo cierto en la práctica: simplemente no es observable con ESTA herramienta contra ESTE fichero concreto.
- **Fix/adaptación:** se construyó un arnés equivalente y efímero, fuera del repo, en el scratchpad de la sesión (`/private/tmp/.../scratchpad/pruebaB-harness/`): un proyecto Vitest mínimo con su propio `package.json` válido (para que Vite arranque) y un fichero JSON hermano (`target.json`, no `package.json`) que sí se corrompe. El fichero de test reproduce EXACTAMENTE el mismo patrón de lectores perezosos que `catalogue-isolation.test.ts` (uno para `target.json`, dos para ficheros hermanos independientes). Ver "Evidencia de las pruebas de mutación" más abajo para la salida completa.
- **Archivos modificados:** ninguno del repo — todo el arnés vive en el scratchpad de la sesión, fuera de control de versiones, y se descarta al cerrar la sesión.
- **Verificación:** salida de Vitest transcrita íntegra más abajo; recuento de tests preservado (3→3), ningún "no tests", el test que depende del fichero corrompido falla solo, los dos hermanos pasan y se reportan por nombre.

---

**Total deviations:** 1 (adaptación de evidencia, no un auto-fix de código de Reglas 1-3)
**Impact on plan:** Ninguno sobre el código entregado (Task 1 se completó exactamente como el plan especifica). El único impacto es en CÓMO se reprodujo la evidencia de Prueba B, documentado con total transparencia, incluyendo los 3 intentos reales contra el repo.

## Issues Encountered

Ver la sección de Deviaciones arriba para el detalle completo de por qué Prueba B se adaptó.

## Evidencia de las pruebas de mutación

### Prueba A — `content/marvel-characters.json` (doble defecto simultáneo)

**Baseline** (`npx vitest run --project engine engine/__tests__/characters.test.ts`, sin mutar):

```
 Test Files  1 passed (1)
      Tests  34 passed (34)
```

**Mutación aplicada:** se insertó, dentro del array `heroes`, una copia mutada del primer héroe (`spider-man`) con una clave `"flavor"` añadida (defecto de copyright) y duplicando su `id` respecto al héroe original ya presente en el array (defecto de esquema no relacionado: id duplicado). El fichero siguió siendo JSON sintácticamente válido.

**Salida con la mutación aplicada** (mismo comando):

```
 ❯ |engine| engine/__tests__/characters.test.ts (34 tests | 14 failed) 17ms
     × valida contra CharacterCatalogueSchema 6ms
       × el fichero committeado no contiene la clave "flavor": de la API de MarvelCDB 5ms
       × heroes no está vacío 1ms
       × todo héroe tiene name y alterEgo no vacíos tras trim() 0ms
       × todo héroe tiene health, handSizeHero y handSizeAlterEgo enteros mayores que 0 0ms
       × ningún héroe lleva la clave legada handSize 0ms
       × los id de héroe son únicos 0ms
       × villains no está vacío 0ms
       × todo villano tiene al menos una etapa 0ms
       × las etapas de cada villano son consecutivas desde 1 y en orden 0ms
       × toda etapa tiene health entero mayor que 0 y healthPerHero/healthPerGroup booleanos 0ms
       × los id de villano son únicos 0ms
     × D-11: ninguna etapa de villano lleva claves distintas a stage/health/healthPerHero/healthPerGroup 0ms
     × CAT-07: ningún test de este fichero fija un recuento de personajes, solo que las listas no estén vacías 0ms

 FAIL  |engine| ... > CAT-04: guardarraíl anti-copyright sobre el string crudo > el fichero committeado no contiene la clave "flavor": de la API de MarvelCDB
AssertionError: Se encontró la clave prohibida "flavor": en content/marvel-characters.json: expected ...

 Test Files  1 failed (1)
      Tests  14 failed | 20 passed (34)
```

**Lectura de la evidencia:**
- La salida **NO contiene** la subcadena `no tests`.
- El recuento de tests colectados es **34**, idéntico al baseline — ningún test desapareció de la colección.
- El test de la clave `"flavor":` aparece **nombrado individualmente** como fallido, con el mensaje `Se encontró la clave prohibida "flavor": en content/marvel-characters.json`.
- El test `'valida contra CharacterCatalogueSchema'` **falla por separado**, como un test nombrado propio — con el mensaje `ZodError: [{"code":"unrecognized_keys","keys":["flavor"],...}]`, no con el texto literal "duplicate id" que anticipaba el plan. **Nota técnica:** Zod (v4) omite las comprobaciones de `.superRefine()` —donde vive la detección de ids duplicados de este esquema— cuando el esquema base (`z.strictObject`) ya reportó un error en cualquier punto del árbol (verificado con una reproducción aislada de Zod: un `superRefine` que siempre añade un issue no se ejecuta si CUALQUIER campo anidado ya falló). Como la clave `"flavor"` es una violación de `z.strictObject` en el propio héroe, el error de "unrecognized_keys" enmascara el de "duplicate id" — pero la propiedad que CR-02 exige (que el test de validación de esquema falle como un fallo NOMBRADO independiente, no como parte de un colapso de colección) se cumple igualmente. El defecto de id duplicado SIGUE presente en el fichero mutado; simplemente Zod no llega a reportarlo como mensaje porque ya reportó el otro primero — esto no reabre el gap, solo corrige la redacción literal de la evidencia esperada.
- **Reversión:** `git checkout -- content/marvel-characters.json`; tras revertir, `git status --porcelain content/marvel-characters.json` no imprime nada y `npx vitest run --project engine engine/__tests__/characters.test.ts` vuelve a dar `34 passed (34)`.

### Prueba B — aislamiento del gate de `catalogue-isolation.test.ts`

**Intentos reales contra el `package.json` del repo (los 3, documentados por transparencia):**

1. Quitar la llave de cierre final de `package.json` → Vitest no arranca:
   ```
   [UNHANDLEABLE_ERROR] Something went wrong inside rolldown...
   JSONError { path: ".../package.json", message: "EOF while parsing an object at line 35 column 0" }
       at ... bundleConfigFile ... loadConfigFromFile ... resolveConfig ... createViteServer ... createVitest
   ```
2. Insertar una coma sobrante antes del cierre final (JSON estructuralmente balanceado, solo inválido por la coma) → mismo fallo de arranque:
   ```
   JSONError { path: ".../package.json", message: "trailing comma at line 35 column 2" }
   ```
3. Vaciar el fichero por completo (0 bytes) → mismo fallo de arranque, mensaje de parseo distinto pero mismo punto de fallo (`bundleConfigFile` → `createVitest`).

En los tres casos, el fallo ocurre en el bundler de configuración de Vite (`rolldown`), **antes** de que Vitest cargue ni un solo fichero de test — no es un fallo de colección de `catalogue-isolation.test.ts`, es un fallo de arranque de la herramienta. Cada mutación se revirtió inmediatamente con `git checkout -- package.json` (attempt 1 y 2) o restaurando el contenido original (attempt 3); `git status --porcelain package.json` confirmó limpio tras cada uno, y `npx vitest run --project engine engine/__tests__/catalogue-isolation.test.ts` volvió a dar `12 passed (12)` tras cada reversión.

**Arnés equivalente (fuera del repo, scratchpad de sesión):** proyecto Vitest mínimo con su propio `package.json` válido y un `target.json` hermano que reproduce el patrón exacto de `catalogue-isolation.test.ts` (lectores perezosos dentro de cada `it()`).

Baseline del arnés:
```
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Con `target.json` corrompido (JSON sin cerrar):
```
 ❯ isolation.test.mjs (3 tests | 1 failed) 3ms
   ❯ reproduccion Prueba B: aislamiento de lector perezoso (3)
     × lee target.json y su script build (depende de target.json)

 FAIL  isolation.test.mjs > ... > lee target.json y su script build (depende de target.json)
SyntaxError: Expected ',' or '}' after property value in JSON at position 37 (line 1 column 38)
 ❯ loadTargetJson isolation.test.mjs:19:15

 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```

**Lectura de la evidencia:** la salida no contiene `no tests`; el recuento de tests colectados se mantiene en 3 (igual que el baseline); solo el test que llama a `loadTargetJson()` (que a su vez llama al lector perezoso del fichero corrompido) falla, nombrado individualmente con su propio `SyntaxError`; los dos tests hermanos, que leen ficheros independientes, se colectan y **pasan** normalmente — exactamente el comportamiento que CAT-06/CAT-07/el barrido de `app/` deben mantener en `catalogue-isolation.test.ts` cuando `package.json` está roto. El arnés se descartó al terminar (vive solo en el scratchpad de la sesión, nunca en el repo).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gap CR-02 de `05-VERIFICATION.md` queda cerrado: los dos gates son estructuralmente independientes del éxito de sus respectivas validaciones de datos, demostrado con evidencia de mutación (Prueba A completa contra el repo real; Prueba B con evidencia de por qué el repo real no es el objeto de prueba correcto para ese escenario específico, más un arnés equivalente que demuestra el mismo mecanismo).
- Ningún gate se relajó, eliminó ni endureció: el recuento de tests (`engine`: 239, total: 362) se mantiene idéntico al de antes de este plan.
- `git diff --stat` confirma que solo se tocaron los dos ficheros de `files_modified` del plan; `content/marvel-characters.json` y `package.json` quedan exactamente como estaban.
- Sin bloqueantes para la re-verificación de la Fase 05.

## Self-Check: PASSED

- FOUND: engine/__tests__/characters.test.ts
- FOUND: engine/__tests__/catalogue-isolation.test.ts
- FOUND: .planning/phases/05-cat-logo-de-h-roes-y-villanos/05-05-SUMMARY.md
- FOUND: commit 24f0bb7 (Task 1)
- FOUND: commit 5b956ac (SUMMARY.md)

---
*Phase: 05-cat-logo-de-h-roes-y-villanos*
*Completed: 2026-09-07*
