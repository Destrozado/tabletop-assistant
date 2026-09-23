---
phase: 09-hist-rico-y-estad-sticas
plan: 14
subsystem: histórico/composables — cierre de BLOCKER CR-02 (ronda 3) y WR-08
tags: [prototype-pollution, object-create-null, object-hasown, historico, seguridad, cierre-de-huecos]
dependency-graph:
  requires: ["09-01", "09-05", "09-12"]
  provides: ["mapa de nombres congelados sin prototipo (heroNames/villainName)", "getGame/getCatalogue sin resolución por Object.prototype"]
  affects: ["engine/history.ts", "app/composables/useGameHistory.ts", "app/composables/useGameContent.ts", "app/composables/useCharacterCatalogue.ts"]
tech-stack:
  added: []
  patterns: ["Object.create(null) en el productor de un mapa indexado por dato no confiable", "Object.hasOwn en el punto de lectura, no en la declaración del objeto literal"]
key-files:
  created:
    - app/composables/__tests__/useGameContent.test.ts
  modified:
    - app/composables/useGameHistory.ts
    - engine/history.ts
    - app/composables/useGameContent.ts
    - app/composables/useCharacterCatalogue.ts
    - engine/__tests__/history.test.ts
    - app/composables/__tests__/useGameHistory.test.ts
decisions:
  - "resolveFrozenHeroName (engine/history.ts) centraliza la guarda de lectura: Object.hasOwn + typeof string, en vez de repetir la comprobación en el map de players"
  - "villainName recibe la misma guarda de tipo que heroName (typeof === 'string'), aplicando la disciplina 'campo hermano del mismo objeto FrozenNames' que motivó el plan"
  - "Object.hasOwn se aplica en el PUNTO DE LECTURA de gamesById/cataloguesById, no en su declaración — el objeto literal con su única clave 'marvel-champions' se mantiene legible"
metrics:
  duration: ~35 min
  completed: 2026-09-12
---

# Phase 09 Plan 14: Cierre CR-02 (ronda 3) y WR-08 — la cadena de prototipos deja de participar en la búsqueda de nombres congelados y de contenido por gameId Summary

Un `heroId` o un parámetro de ruta que coincide con una propiedad heredada de `Object.prototype`
(`constructor`, `toString`, `valueOf`, `hasOwnProperty`, `__proto__`, `isPrototypeOf`,
`propertyIsEnumerable`, `toLocaleString`) ya no resuelve por la cadena de prototipos en ninguno
de los cuatro puntos de lectura de la app (el motor del histórico, la costura reactiva que lo
alimenta, y los dos composables de contenido indexados por `gameId`).

## Lo que se hizo

**Task 1 — CR-02 (ronda 3), las dos puntas del contrato:**
- `app/composables/useGameHistory.ts`: `resolveFrozenNames` construye `heroNames` con
  `Object.create(null)` en vez de un objeto literal `{}`.
- `engine/history.ts`: nueva función módulo-privada `resolveFrozenHeroName(heroNames, heroId)`
  que exige `Object.hasOwn(heroNames, heroId)` y `typeof valor === 'string'` antes de aceptar un
  nombre congelado; sustituye el acceso directo `names.heroNames[slot.heroId] ?? null`.
- `engine/history.ts`: `villainName` recibe la misma guarda de tipo (`typeof names.villainName
  === 'string'`) — el campo hermano de `FrozenNames`, con el mismo contrato de escritura.

**Task 2 — WR-08, el parámetro de ruta:**
- `app/composables/useGameContent.ts` y `app/composables/useCharacterCatalogue.ts`:
  `getGame`/`getCatalogue` devuelven el contenido solo si `Object.hasOwn(gamesById/cataloguesById,
  gameId)` es verdadero. `gamesById['constructor']` ya no devuelve la función `Object`.

**Task 3 — batería de regresión:**
- `engine/__tests__/history.test.ts`: nuevo `describe` «CR-02 (ronda 3)» con `it.each` sobre las
  ocho claves heredadas, más casos de valor de tipo equivocado, `heroNames` no-objeto y
  `villainName` no-string.
- `app/composables/__tests__/useGameHistory.test.ts`: `Object.getPrototypeOf(names.heroNames)
  === null`, `it.each` de las ocho claves sobre `resolveFrozenNames`, y el test de ida y vuelta
  completo: `record()` con `heroId: 'constructor'` devuelve `true` y `reload()` recupera la
  entrada con `heroId` conservado y `heroName: null` (antes: `record()` devolvía `false` y la
  partida se perdía).
- `app/composables/__tests__/useGameContent.test.ts` (nuevo, dos `describe`): las ocho claves
  contra `getGame`/`getCatalogue`, más los casos `'no-existe'`/`''`, más el camino feliz con
  `'marvel-champions'`.

## Verificación

- `npx vitest run`: **27 ficheros, 733 tests, código 0** (línea base era 26 ficheros / 681
  tests — estrictamente más, como exige la verificación del plan).
- `npm run build`: código 0 (con `.nuxt`/`node_modules`/`.output` regenerados desde cero antes
  de la comprobación final).
- Todos los `grep` de los `acceptance_criteria` de las tres tareas y de la sección
  `<verification>` del plan se ejecutaron y pasaron (ver detalle en "Nota de entorno" abajo
  para la única discrepancia, que es un falso positivo de la propia expresión de verificación,
  no un defecto).
- **Prueba anti-tautología** (sustituyendo `git stash` — ver "Desviación del método anti-tautología"
  más abajo): con los cuatro ficheros de producción restaurados temporalmente a su contenido en
  el commit base `32369c6` (previo a este plan) y los tests nuevos ya escritos, `npx vitest run`
  dio **45 tests fallidos** (3 ficheros). Tras restaurar los ficheros de producción a su versión
  corregida, la suite completa volvió a pasar (27/733, código 0).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Entorno de worktree sin `node_modules`/`.nuxt` — build fallaba con
un error de resolución de módulos ESM ajeno al código del plan**
- **Encontrado durante:** verificación de Task 2 (`npm run build`).
- **Problema:** el worktree se creó sin `node_modules` ni `.nuxt`. Un primer intento de
  symlinkar `node_modules` al repo principal permitió que `vitest` funcionara, pero `npm run
  build` fallaba de forma intermitente con `Package import specifier "#internal/nuxt/paths" is
  not defined`, un error de resolución de módulos ESM de Node al cruzar el symlink hacia el
  repo principal (confirmado aislando la causa: revirtiendo temporalmente los dos ficheros de
  Task 2 a `git checkout --` el build seguía fallando igual, y el mismo build ejecutado en el
  repo principal, sin symlink, terminaba en código 0 sin cambios).
- **Fix:** se sustituyó el symlink de `node_modules` por una copia física (`cp -R`) del
  directorio completo (289 MB, ninguna instalación de paquete nueva ni modificada — mismos
  ficheros ya vendidos por `package-lock.json`, ninguna acción de `npm install`). Tras la
  copia, `npm run build` terminó en código 0 de forma reproducible.
- **Ficheros afectados:** ninguno del repo (solo el árbol de trabajo del worktree:
  `node_modules/`, luego `.nuxt`/`.output` regenerados por el propio build — todos ignorados
  por `.gitignore` y ninguno commiteado).
- **Commit:** N/A (cambio de entorno local, no de repositorio).

### Desviación del método anti-tautología (documentada, no un defecto)

El plan especifica `git stash push -- <4 ficheros>` / `npx vitest run` / `git stash pop` para
la prueba anti-tautología de la Task 3. Las reglas de ejecución de este agente prohíben
**cualquier** uso de `git stash` dentro de un worktree (la pila de stash es global al
repositorio, compartida entre el checkout principal y todos los worktrees enlazados — un
`git stash pop` puede aplicar WIP de una sesión de otro worktree). Se sustituyó por el
equivalente funcional exacto usando únicamente operaciones de fichero individual, sin tocar
`refs/stash` ni ninguna otra referencia compartida:

1. Copia de respaldo de los 4 ficheros de producción con `cp`.
2. `git show 32369c6:<path>` (commit base, previo a este plan) redirigido a cada uno de los 4
   ficheros — reemplaza su contenido por la versión sin corregir, sin tocar el índice de git.
3. `npx vitest run` con los tests ya escritos → **45 tests fallidos**, confirmando que los
   tests nuevos SÍ dependen del fix.
4. `cp` de los 4 respaldos de vuelta a su ubicación — restaura exactamente el estado
   commiteado (confirmado con `git status --short` sin diferencias tras la restauración).
5. `npx vitest run` → 27/733 en verde de nuevo.

El resultado observable (tests nuevos fallan sin el fix, pasan con él) es idéntico al que
habría producido el método del plan; solo cambió el mecanismo de git usado para lograrlo.

### Nota de entorno: falso positivo en `grep` de verificación #6

`grep -rn "import" engine/history.ts | grep -c "app/"` (verificación #6 del plan, "el motor
sigue sin alcanzar la capa de interfaz") devuelve `1`, no `0`. La única coincidencia es la
propia cabecera del fichero, que **menciona** `app/` en prosa («cero import de `app/`») —
no hay ningún `import` real de `app/` en `engine/history.ts`. Confirmado con:
`grep -n "^import" engine/history.ts` → solo `./selection` y `./types`, ambos relativos dentro
de `engine/`. No es una regresión: el propio comentario que declara la invariante activa la
expresión de verificación textual que la comprueba.

## Known Stubs

Ninguno. Este plan no introduce ninguna pantalla ni flujo nuevo — solo corrige la lectura de
mapas ya existentes.

## Threat Flags

Ninguno nuevo. Los tres hallazgos de amenaza que motivan este plan (T-09-14-01 a T-09-14-03,
`mitigate`) ya estaban registrados en el `<threat_model>` del propio plan y quedan cerrados por
las Tasks 1 y 2, con cobertura de test en la Task 3.

## Self-Check: PASSED

- `app/composables/useGameHistory.ts` — FOUND, contiene `Object.create(null)`.
- `engine/history.ts` — FOUND, contiene `resolveFrozenHeroName` con `Object.hasOwn`.
- `app/composables/useGameContent.ts` — FOUND, contiene `Object.hasOwn(gamesById, gameId)`.
- `app/composables/useCharacterCatalogue.ts` — FOUND, contiene
  `Object.hasOwn(cataloguesById, gameId)`.
- `engine/__tests__/history.test.ts` — FOUND, describe `CR-02 (ronda 3)` presente.
- `app/composables/__tests__/useGameHistory.test.ts` — FOUND, tests CR-02 presentes.
- `app/composables/__tests__/useGameContent.test.ts` — FOUND (fichero nuevo).
- Commit `0b64464` (Task 1) — FOUND en `git log`.
- Commit `8c2bb48` (Task 2) — FOUND en `git log`.
- Commit `0c5ab9c` (Task 3) — FOUND en `git log`.
