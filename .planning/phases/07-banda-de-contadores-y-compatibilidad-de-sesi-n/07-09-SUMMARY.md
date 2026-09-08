---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 09
subsystem: engine
tags: [vitest, tdd, defensive-programming, playerCount, counters]

requires:
  - phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
    provides: "engine/counters.ts y su suite de tests (planes 07-02/07-04), y 07-REVIEW.md con WR-05/WR-07 confirmados"
provides:
  - "resolveHeroHealthLength(): única definición de longitud de heroHealth compartida por resolveCounters y las guardas de rango de incrementHero/decrementHero"
  - "resolveCounterValues itera sobre lo persistido en vez de sobre resolvePlayerSlots directamente, así un playerCount manipulado no descarta vidas de héroe congeladas"
  - "Todos los mutadores y resolveCounterValues usan Number.isFinite en vez de comparación por identidad con null, cerrando el camino a NaN"
  - "computeInitialVillainHealth guarda que health del catálogo sea finito antes de multiplicar por jugadores (WR-07)"
affects: [engine, contadores, compatibilidad-de-sesion]

tech-stack:
  added: []
  patterns:
    - "Longitud de array derivada de una única función compartida (resolveHeroHealthLength), nunca de dos cálculos paralelos que puedan discrepar"
    - "Number.isFinite() en vez de `=== null` para decidir 'valor congelado válido', tratando undefined igual que null en vez de dejarlo propagarse a NaN"

key-files:
  created: []
  modified:
    - engine/counters.ts
    - engine/__tests__/counters.test.ts

key-decisions:
  - "resolveHeroHealthLength() no es un puerto literal de 'la misma fórmula' que sugería el texto del plan: cuando playerCount es inválido, el largo cae al de lo YA persistido en heroHealth (no a 0 sin más), porque un puerto literal seguía descartando las vidas congeladas que WR-05 exige preservar — verificado con traza manual antes de escribir código (Rule 1, el must_have manda sobre la prosa de la acción)"
  - "resolveCounterValues itera sobre persisted.heroHealth (ya con la longitud correcta) en vez de sobre resolvePlayerSlots(context) directamente, con slots[i] ?? {heroId:null,...} como respaldo — evita que dos funciones de dos ficheros distintos (counters.ts y selection.ts, éste último fuera de alcance del plan) puedan discrepar en longitud y tirar datos"

requirements-completed: [HP-05, HP-08]

duration: ~35min
completed: 2026-09-09
---

# Phase 07 Plan 09: Un playerCount manipulado ya no descarta vidas congeladas ni produce NaN Summary

**Una sola función de longitud (`resolveHeroHealthLength`) compartida por `resolveCounters` y las guardas de rango de `incrementHero`/`decrementHero`, más `Number.isFinite()` en vez de `=== null` en los cuatro mutadores y en `resolveCounterValues`, cierran WR-05 (playerCount manipulado descartaba `[5,7]` → `[]`) y WR-07 (catálogo sin `health` propagaba NaN).**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2/2 completadas
- **Files modified:** 2

## Accomplishments
- WR-05 cerrado: `incrementVillain`/`decrementVillain`/`incrementHero`/`decrementHero` con `playerCount` en `{2.5, NaN, '3', null}` conservan intactas las vidas de héroe ya congeladas, en vez de descartarlas a `[]`.
- WR-07 cerrado: `computeInitialVillainHealth` devuelve `null` (no `NaN`) cuando la etapa I del catálogo no trae una cifra de vida utilizable.
- `resolveCounterValues` nunca deja un `undefined` dentro de `heroHealth`, ni siquiera con un `playerCount` manipulado.
- Ninguna firma exportada cambió (8 `export function` antes y después); la fidelidad de precarga, topes, arranque en 1 y desigualdad referencial de D-20 se verificó intacta.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tests de regresión de WR-05/WR-07** - `592fc1a` (test) — RED confirmado: 17 tests nuevos fallan antes del arreglo.
2. **Task 2: Una sola definición de playerCount válido en engine/counters.ts** - `d33a25d` (fix) — GREEN: los 17 tests pasan, ninguno de los 514 preexistentes se rompe.

**Plan metadata:** (este commit, ver más abajo)

_Nota TDD: Task 1 llevaba `tdd="true"`; la secuencia RED→GREEN quedó en dos commits separados (`test` y luego `fix`), sin necesidad de un tercer commit de refactor porque no hizo falta limpieza adicional tras el GREEN._

## Files Created/Modified
- `engine/counters.ts` — `resolveHeroHealthLength()` (nueva, no exportada) como única fuente de longitud; `resolveCounters`, `incrementHero`, `decrementHero` la usan; `resolveCounterValues` itera sobre `persisted.heroHealth` en vez de sobre `resolvePlayerSlots` directamente; los cuatro mutadores y `resolveCounterValues` usan `Number.isFinite` en vez de `=== null`/`!== null`; `computeInitialVillainHealth` guarda `Number.isFinite(figures.health)` y colapsa la rama muerta de `healthPerGroup`.
- `engine/__tests__/counters.test.ts` — dos `describe` nuevos («playerCount manipulado a mano (WR-05)» y «catálogo sin cifra de vida utilizable (WR-07)») con 23 tests nuevos citando WR-05/WR-07 en el título; ningún test preexistente tocado salvo el import de tipos (se añadió `CatalogueVillain`).

## Decisions Made

- **`resolveHeroHealthLength` no es un puerto literal de "la misma regla" que describía la prosa de la Task 2.** El texto del plan sugería extraer una función que "normalice `context.playerCount` con la MISMA regla que ya usa `resolveCounters` (entero > 0, si no 0)". Una traza manual antes de escribir código mostró que un puerto literal de esa fórmula (0 cuando el playerCount es inválido, sin más) seguía dejando `resolveCounters`/`incrementVillain` con `heroHealth: []` cuando `playerCount` se manipula a `2.5` — exactamente el síntoma de WR-05, sin arreglar. La función implementada cae al **largo de lo ya persistido en `heroHealth`** cuando `playerCount` es inválido, en vez de a `0` sin más; si tampoco hay nada persistido, sigue siendo `0` como antes (no rompe `it.each([0, -1, 2.5])('playerCount %s devuelve heroHealth vacío'` preexistente, que usa un contexto sin `counters`). Documentado aquí como aplicación de la Regla 1 (auto-fix de bug): los `must_haves` del plan son la autoridad final sobre la prosa de la acción, y la traza mostró que seguir la prosa al pie de la letra no alcanzaba los `must_haves` del propio plan.
- **`resolveCounterValues` itera sobre `persisted.heroHealth`, no sobre `resolvePlayerSlots(context)` directamente.** `resolvePlayerSlots` vive en `engine/selection.ts`, fuera del alcance de ficheros de este plan, y sigue devolviendo un array de longitud `0` cuando `playerCount` es inválido (no hereda el respaldo de `resolveHeroHealthLength`). Si `resolveCounterValues` siguiera iterando sobre `slots.map(...)`, el `.map` nunca se ejecutaría con `slots=[]` y el resultado sería `[]` sin importar el arreglo de `resolveCounters` — el mismo síntoma de WR-05 reaparecería por otra vía. Iterar sobre `persisted.heroHealth` (ya con el largo correcto) y usar `slots[i] ?? { heroId: null, playerName: '' }` como respaldo resuelve esto sin tocar `selection.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `resolveHeroHealthLength` con respaldo al largo persistido, no un puerto literal de "misma regla, 0 si inválido"**
- **Found during:** Task 2, antes de escribir código — traza manual del flujo `incrementVillain → resolveCounters` con `playerCount=2.5`.
- **Issue:** Seguir la prosa de la acción al pie de la letra (una función que solo replica la fórmula existente de `resolveCounters`) no cierra WR-05: con `playerCount` inválido la longitud seguiría siendo `0`, así que `heroHealth` seguiría colapsando a `[]` pese a tener datos persistidos.
- **Fix:** La función cae al largo de `context.counters.heroHealth` (si existe y es un array) en vez de a `0`, solo cuando `playerCount` es inválido.
- **Files modified:** `engine/counters.ts`
- **Verification:** los 17 tests RED de la Task 1 pasan a verde; los tests preexistentes de `resolveCounters` (incluido `playerCount %s devuelve heroHealth vacío` con `[0,-1,2.5]` sin `counters`) siguen en verde sin modificarse.
- **Committed in:** `d33a25d`

**2. [Rule 1 - Bug] `resolveCounterValues` itera sobre lo persistido, no sobre `resolvePlayerSlots` directamente**
- **Found during:** Task 2 — misma traza manual, siguiente paso de la cadena (`incrementHero` → `resolveCounterValues` → `resolvePlayerSlots`).
- **Issue:** `resolvePlayerSlots` (en `engine/selection.ts`, fuera de `<files>` de este plan) sigue devolviendo longitud `0` con `playerCount` inválido; un `.map` sobre ese array vacío descartaría las vidas persistidas sin importar el arreglo de `resolveCounters`.
- **Fix:** `resolveCounterValues` itera sobre `persisted.heroHealth` (con el largo ya corregido) y usa `slots[i] ?? { heroId: null, playerName: '' }` como respaldo por si `resolvePlayerSlots` es más corto.
- **Files modified:** `engine/counters.ts`
- **Verification:** los tests de `incrementHero`/`decrementHero` con `playerCount` manipulado y slot dentro del rango real de datos congelados pasan a verde; ninguna firma exportada cambió.
- **Committed in:** `d33a25d`

---

**Total deviations:** 2 auto-fixed (ambas Regla 1 — necesarias para que el código realmente cumpla los `must_haves` de WR-05 que el propio plan declara como criterio de éxito, no solo su prosa de acción).
**Impact on plan:** Ninguna firma exportada cambió, ningún fichero fuera de `<files_modified>` se tocó, y los 514 tests preexistentes + `npm run e2e` (24/24) + `npm run generate` siguen en verde. Sin scope creep — el ajuste queda íntegramente dentro de `engine/counters.ts`.

## Issues Encountered

- `npm run test`/`npm run generate` fallaban al arrancar el worktree porque `.nuxt/tsconfig.app.json` no existía todavía (no se había corrido `nuxt prepare` en este checkout). Se ejecutó `npx nuxt prepare` una vez al inicio de la sesión — no es un cambio de código, no se commitea nada, y no es un fallo del plan sino del entorno recién creado del worktree.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Los dos únicos avisos del motor confirmados de forma independiente por el verificador en `07-REVIEW.md` (WR-05, WR-07) quedan cerrados con evidencia RED→GREEN y sin regresión.
- Diferido explícitamente (no descartado): añadir `typescript`/`vue-tsc` y un `typecheck` en CI (mitad de la sugerencia de WR-06) — fuera de alcance de esta fase por el gate de cero dependencias nuevas de `07-RESEARCH.md` §Package Legitimacy Audit (A2); candidato a `/gsd:quick` o a una fase de endurecimiento futura.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-09*
