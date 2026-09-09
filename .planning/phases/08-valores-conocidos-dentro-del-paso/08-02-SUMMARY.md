---
phase: 08-valores-conocidos-dentro-del-paso
plan: 02
subsystem: engine
tags: [engine, pure-functions, marvel-champions, vitest]

# Dependency graph
requires:
  - phase: 08-valores-conocidos-dentro-del-paso
    plan: 01
    provides: "StepValueKind exportado desde engine/types.ts y StepDefinition.value? declarado en tipo y esquema, ya aplicado a los cuatro pasos de D-03"
  - phase: 07-contadores-y-compatibilidad
    provides: "computeInitialVillainHealth/computeInitialHeroHealth en engine/counters.ts, reutilizadas aquí sin reimplementar aritmética"
provides:
  - "engine/stepValues.ts: resolveStepValue(kind, context, catalogue) y resolveStepValueRows(kind, context, catalogue), puros, sin Vue/Nuxt/DOM"
  - "StepValueRow exportado: { slot, heroId, heroName, playerName, value }"
affects: ["08-03"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Módulo nuevo del motor que REUTILIZA computeInitialVillainHealth/computeInitialHeroHealth de counters.ts en vez de reimplementar la aritmética (D-04), mismo patrón de find(...) ?? null en el catálogo ya usado por counters.ts"
    - "handSizeAlterEgo se lee como campo plano del catálogo, sin función de cálculo (a diferencia de la vida)"

key-files:
  created:
    - engine/stepValues.ts
    - engine/__tests__/stepValues.test.ts
  modified: []

key-decisions:
  - "D-13 verificado por test y por guardarraíl de código fuente: engine/stepValues.ts no importa ni menciona resolveCounterValues fuera de comentarios"
  - "D-05 verificado con Spider-Man: handSizeAlterEgo (6) contrastado explícitamente contra handSizeHero (5), con mutación manual documentada"
  - "D-14: filas descartadas, no marcadas — sin héroe conocido no se emite fila, nunca con value: null ni marcador '—' (ese marcador es de la banda de contadores, superficie distinta)"

requirements-completed: [VAL-01, VAL-02, VAL-03]

# Metrics
duration: ~20min
completed: 2026-09-09
---

# Phase 08 Plan 02: Módulo puro que resuelve el valor conocido de un paso Summary

**`engine/stepValues.ts` resuelve la cifra a pintar para las tres formas del enum `StepValueKind` reutilizando `computeInitialVillainHealth`/`computeInitialHeroHealth` de `counters.ts`, con 18 tests que fijan por código la regla dura D-13 (nunca el contador congelado) y la corrección de fidelidad D-05 (`handSizeAlterEgo`, no `handSizeHero`).**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-09 (sesión continuada desde 08-01)
- **Completed:** 2026-09-09T10:03:20Z
- **Tasks:** 2 completed
- **Files modified:** 2 (ambos nuevos)

## Accomplishments

- `resolveStepValue(kind, context, catalogue)` devuelve la cifra única de mesa: solo `kind === 'villainHealth'` puede devolver un número, resolviendo el id de villano con `resolveVillainId` y delegando en `computeInitialVillainHealth`. Cualquier otro `kind` (incluidos literales desconocidos, `undefined`, `null`) devuelve `null`.
- `resolveStepValueRows(kind, context, catalogue)` devuelve filas por jugador: solo `'heroHealth'` y `'handSizeAlterEgo'` producen filas, iterando `resolvePlayerSlots(context)` y resolviendo con `computeInitialHeroHealth(hero)` o `hero.handSizeAlterEgo` (campo plano). Descarta la fila (no la emite) cuando el héroe no se encuentra, cuando `catalogue` es `null`, o cuando el valor no pasa `Number.isFinite` (D-14).
- `engine/stepValues.ts` no importa `resolveCounterValues` en ninguna rama y el comentario de cabecera deja escrita la regla dura de D-13 con el caso concreto (villano a 38 de 42 congelado, el paso sigue pintando 42).
- 18 tests nuevos en `engine/__tests__/stepValues.test.ts` cubren D-04, D-05, D-11, D-13, D-14, D-15, D-02 y la batería defensiva (playerCount 2.5/NaN/'3'/0/negativo, selection `null`/número/`heroes` no-array, `heroId`/`villainId` inexistentes, `catalogue` `null`), más un guardarraíl de código fuente que falla si `resolveCounterValues` reaparece fuera de un comentario.
- `npm test` en verde: 555/555 tests (537 base + 18 nuevos). `npm run build` completo sin errores (SSG + PWA, 62 entradas de precache).

## Task Commits

1. **Task 1: Crear `engine/stepValues.ts`** - `705616a` (feat)
2. **Task 2: Crear `engine/__tests__/stepValues.test.ts`** - `d1cf618` (test)

_Plan metadata commit pending — orchestrator handles shared-file writes in worktree mode._

## Files Created/Modified

- `engine/stepValues.ts` (nuevo, 121 líneas) - `StepValueRow`, `resolveStepValue`, `resolveStepValueRows`; importa solo de `./counters`, `./selection` y `./types`
- `engine/__tests__/stepValues.test.ts` (nuevo, 199 líneas) - suite completa, catálogo real cargado con el mismo patrón que `counters.test.ts`

## Decisions Made

- El comentario de cabecera evita citar literalmente el nombre `handSizeHero` (para satisfacer el criterio de aceptación de la Task 1 de cero ocurrencias en el fichero fuente) describiéndolo en su lugar como «el campo hermano de la cara Héroe del catálogo» — el propio test de D-05 sí nombra `handSizeHero` explícitamente para contrastar 6 contra 5.
- El comentario de D-14 evita la cadena literal `'—'` (el marcador entre comillas simples que usa la banda de contadores) para no disparar el grep de la Task 1 que verifica que este módulo no reutiliza ese marcador de superficie distinta; el concepto se explica sin citar el carácter entre comillas.
- Prueba de mutación manual documentada (criterio de aceptación de la Task 2): se cambió temporalmente `hero.handSizeAlterEgo` por `hero.handSizeHero` en `engine/stepValues.ts` — el test de Spider-Man falló (`expected 5 to be 6`), confirmando que la suite detecta la regresión de fidelidad D-05. Se revirtió el cambio y la suite volvió a estar en verde (18/18).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.nuxt/` regenerado con `nuxi prepare` antes de poder correr los tests**
- **Found during:** Verificación de Task 1 (`npx vitest`)
- **Issue:** Mismo síntoma que en 08-01: `.nuxt/` no existía en este worktree recién creado/reseteado a la base de la ola 2.
- **Fix:** `npx nuxt prepare`, que regenera `.nuxt/` de forma determinista. No se tocó ningún fichero versionado.
- **Files modified:** ninguno versionado (`.nuxt/` está gitignored)
- **Verification:** `npx vitest run engine/__tests__/stepValues.test.ts` pasó tras regenerar
- **Committed in:** n/a (artefacto de build no versionado)

---

**Total deviations:** 1 auto-fixed (1 blocking), idéntico al de 08-01.
**Impact on plan:** Ninguno sobre el código entregado.

## Issues Encountered

- El criterio de verificación de Task 1 (`npx tsc --noEmit` sin errores) no pudo ejecutarse: `tsc`/`vue-tsc` no están instalados en este entorno, tal como documentó el `08-01-SUMMARY.md` y confirmó la nota de contexto del wave 2. Instalar un paquete nuevo queda explícitamente excluido del auto-fix de Rule 3 (riesgo de paquete slopsquatted). Se usó `npm test` (555/555 verde) y `npm run build` (SSG + PWA completo sin errores) como gates alternativos, consistentes con la instrucción de la nota de contexto de esta ola.
- Dos criterios literales de grep del plan (`handSizeHero` = 0 y `'—'` = 0 en `engine/stepValues.ts`) exigían que el comentario de cabecera citara D-05/D-07 y D-14 sin poder usar las cadenas exactas que esos mismos criterios prohíben. Se resolvió describiendo el concepto en prosa sin la cadena literal — ver "Decisions Made" arriba. El significado (nunca la cara Héroe; nunca el marcador de la banda de contadores) queda intacto en el comentario.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `resolveStepValue`/`resolveStepValueRows` quedan disponibles para que 08-03 (`app/composables/useGameSession.ts` + `StepScreen.vue`) los consuma y pinte el paréntesis (VAL-01) y la lista por jugador (VAL-02) en pantalla.
- Ningún bloqueo conocido para 08-03. El catálogo (`CharacterCatalogue`) y el contrato defensivo ya están alineados con `resolvePlayerSlots`/`resolveVillainId`/`resolveCounters`, así que 08-03 no necesita inventar ninguna normalización nueva.

---
*Phase: 08-valores-conocidos-dentro-del-paso*
*Completed: 2026-09-09*
