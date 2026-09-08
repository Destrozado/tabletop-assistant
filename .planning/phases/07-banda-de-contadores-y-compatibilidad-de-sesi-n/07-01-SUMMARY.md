---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 01
subsystem: testing
tags: [playwright, vitest, typescript, engine-types, session-context]

# Dependency graph
requires:
  - phase: 06-selecci-n-de-villano-h-roes-y-jugadores
    provides: "SessionContext.selection?/HeroSelection como campo aditivo, patrón que este plan replica para counters"
provides:
  - "e2e/counter-band-height.spec.ts — presupuesto de altura de la banda (96px/12,5%) medido contra 1024x768, verde antes de que exista el componente de la banda"
  - "CounterState (villainHealth/heroHealth nullable) exportada desde engine/types.ts"
  - "SessionContext.counters? — campo aditivo consumido por los planes 02, 04, 05 y 06"
affects: ["07-02", "07-04", "07-05", "07-06"]

# Tech tracking
tech-stack:
  added: []
  patterns: ["null vs 0 como estados de tipo distintos (D-09/D-12)", "campo aditivo en SessionContext sin bump de versión (D-19, mismo patrón de la Fase 6)"]

key-files:
  created: [e2e/counter-band-height.spec.ts]
  modified: [engine/types.ts]

key-decisions:
  - "Se mide el scrollHeight del envoltorio interior de contenido (`main > div`), no el de `main`: `main` es flex-1 y su propia caja siempre ocupa el hueco completo del layout, tenga el contenido el alto que tenga, así que medirlo ahí habría producido un falso positivo/negativo estructural, no una señal real del contenido"
  - "Instalación independiente de node_modules en el worktree (en vez de symlink al repo principal): el symlink compartía node_modules/.cache/nuxt entre el repo principal y este worktree, y esa caché compartida producía builds corruptos (\"Package import specifier #internal/nuxt/paths is not defined\") de forma intermitente"

patterns-established:
  - "Constantes de presupuesto de altura (RESERVED_BAND_HEIGHT, HP_02_CEILING_RATIO, HEADER_HEIGHT, NAVBAND_HEIGHT) declaradas en el módulo de test, reutilizables por el plan 06 al ampliar esta misma spec"

requirements-completed: [HP-02, COMP-01]

duration: 15min
completed: 2026-09-08
---

# Phase 7 Plan 1: Presupuesto de altura de la banda y contrato de datos de contadores Summary

**Test Playwright que demuestra que 96px de banda caben en 1024×768 sin encoger el texto de 40px, más `CounterState`/`SessionContext.counters?` añadidos a `engine/types.ts` sin tocar `formatVersion`**

## Performance

- **Duration:** ~15 min (commits entre 16:19 y 16:27 CEST) + verificación posterior
- **Started:** 2026-09-08T14:19:34Z
- **Completed:** 2026-09-08T14:28:35Z
- **Tasks:** 2/2
- **Files modified:** 2 (1 creado, 1 modificado)

## Accomplishments
- Presupuesto de altura de HP-02 (96px = 12,5% de 768px) medido y registrado como test ejecutable, con el componente de la banda todavía sin construir — cierra el criterio de éxito nº 1 de la fase.
- Confirmado con medición real: quedan 512px libres para el contenido de cualquier paso tras reservar cabecera (64px), pie (96px) y la futura banda (96px), y el texto grande del paso mide 40px de línea base.
- `CounterState` (`villainHealth: number | null`, `heroHealth: (number | null)[]`) exportada desde `engine/types.ts`, con `null` y `0` documentados explícitamente como estados de tipo distintos (D-09/D-12).
- `SessionContext.counters?` añadido como campo aditivo, sin bumpear `formatVersion` (sigue en 1) ni tocar `engine/persistence.ts`.

## Task Commits

1. **Task 1: Medir el presupuesto de altura en el viewport objetivo, antes de construir la banda** - `48b15ae` (test)
2. **Task 2: Añadir `CounterState` y `SessionContext.counters?` sin bumpear `formatVersion`** - `d57ec2d` (feat)

**Plan metadata:** (pendiente — commit final de este plan)

## Files Created/Modified
- `e2e/counter-band-height.spec.ts` - Spec Playwright de 2 tests: aserción aritmética del ratio HP-02 y recorrido real del flujo (selector → mini-setup → preparación) midiendo alturas reales de `header`/`footer`/contenido del paso y el `fontSize` de `main p.text-display`.
- `engine/types.ts` - `CounterState` (nueva interfaz) + `SessionContext.counters?: CounterState` (campo aditivo, colocado tras `selection?`).

## Decisions Made
- **Medición correcta del "alto que necesita el paso":** el plan pedía leer el `scrollHeight` de `main`, pero `main` es `flex-1` dentro del layout de página (cabecera + main + pie) y su caja siempre se estira para ocupar todo el hueco vertical disponible, independientemente del contenido — con `overflow-y-auto` y contenido que cabe, `scrollHeight` coincide con `clientHeight` (la caja completa, no el contenido). Verificado empíricamente: medir `main` directamente producía un fallo (608px necesarios cuando el presupuesto post-banda es 512px) en el primer paso, un falso negativo estructural que se repetiría en TODOS los pasos, no una señal real de contenido. Se corrigió midiendo el envoltorio interior (`main > div`, centrado con `items-center`/`justify-center`, nunca estirado), que sí refleja la altura real del contenido. Con esta corrección los 2 tests pasan en verde.
- **node_modules independiente en el worktree:** se intentó primero un symlink a `node_modules` del repo principal para ahorrar tiempo de instalación; la caché compartida (`node_modules/.cache/nuxt`) producía builds de Nitro corruptos de forma intermitente (`Package import specifier "#internal/nuxt/paths" is not defined`) al mezclar artefactos de build de dos checkouts distintos del mismo paquete. Se sustituyó por `npm ci` real dentro del worktree (mismo `package-lock.json`, sin instalar ningún paquete nuevo ni distinto — no aplica la exclusión de Rule 3 sobre instalación de paquetes).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Medición de altura corregida de `main` a `main > div`**
- **Found during:** Task 1 (verificación del test recién escrito)
- **Issue:** El test, tal como estaba escrito siguiendo la instrucción literal del plan (`scrollHeight` de `main`), fallaba porque `main` es `flex-1` y su caja se estira siempre al hueco vertical completo del layout — la medición no reflejaba el contenido real del paso, sino el contenedor.
- **Fix:** Se cambió el locator de `main` a `main > div` (el envoltorio de contenido centrado, no estirado) para el registro de altura por paso. La medición de `header`/`footer`/`fontSize` no cambió.
- **Files modified:** `e2e/counter-band-height.spec.ts`
- **Verification:** `npm run e2e -- e2e/counter-band-height.spec.ts` → 2 passed.
- **Committed in:** `48b15ae` (parte del commit de Task 1, no se hizo commit intermedio en rojo)

**2. [Rule 3 - Blocking] node_modules independiente en vez de symlink al repo principal**
- **Found during:** Verificación final del plan (segunda ejecución de `npm run e2e`)
- **Issue:** El symlink `node_modules -> <repo principal>/node_modules` compartía `node_modules/.cache/nuxt` entre el repo principal y este worktree; el build de `nuxt generate` fallaba intermitentemente con "Package import specifier `#internal/nuxt/paths` is not defined", un error de caché de Nitro cruzada entre dos checkouts.
- **Fix:** Se borró el symlink y se ejecutó `npm ci` dentro del worktree para obtener una instalación de `node_modules` propia e independiente, usando el mismo `package-lock.json` ya presente en el repo (ningún paquete nuevo, ninguna versión distinta).
- **Files modified:** ninguno rastreado por git (`node_modules/` está en `.gitignore`).
- **Verification:** `npm run e2e -- e2e/counter-band-height.spec.ts` → 2 passed (repetible); `npx vitest run` → 465 passed.
- **Committed in:** N/A (no rastreado por git).

---

**Total deviations:** 2 auto-fixed (1 bug de medición, 1 bloqueo de entorno de ejecución)
**Impact on plan:** Ambos auto-fixes eran necesarios para que la spec midiera lo que dice medir y para que el entorno de verificación funcionara; no hay scope creep sobre el contrato de datos ni sobre la forma de la spec pactada en el plan.

## Issues Encountered
- La primera acceptance criteria (`grep -c 'zod' engine/types.ts` debe devolver 0) resultó ser un criterio ya incumplido ANTES de este plan: `engine/types.ts` ya contenía la palabra `zod` en un comentario preexistente de la Fase 5 (línea ~165, "...un módulo que importa zod (T-01-19, DC-03)."), sin relación con este plan y fuera de su alcance. Se verificó explícitamente que el diff de esta plan (`git diff engine/types.ts | grep -c 'zod'`) añade CERO ocurrencias nuevas — el criterio en sí, tal como está redactado a nivel de fichero completo, es un falso negativo estructural que ya existía antes de este plan, no un incumplimiento introducido aquí. No se modificó el comentario preexistente por estar fuera del alcance de la Task 2 (Scope Boundary).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `engine/counters.ts` (plan 02) y `useGameSession.ts` (plan 04) pueden importar `CounterState`/`SessionContext.counters?` tal cual quedaron fijados aquí, sin necesidad de reinterpretar la forma.
- `e2e/counter-band-height.spec.ts` queda lista para ser ampliada por el plan 06 cuando el componente de la banda exista, reutilizando las mismas constantes (`RESERVED_BAND_HEIGHT`, `HP_02_CEILING_RATIO`, `HEADER_HEIGHT`, `NAVBAND_HEIGHT`).
- Sin bloqueos para los planes dependientes de esta ola.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-08*
