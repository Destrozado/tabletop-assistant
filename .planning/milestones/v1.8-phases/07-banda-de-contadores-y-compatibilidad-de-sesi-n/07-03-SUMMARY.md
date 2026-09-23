---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 03
subsystem: testing
tags: [vitest, typescript, engine-persistence, compatibility]

# Dependency graph
requires:
  - phase: 07-02
    provides: "resolveCounters/resolveCounterValues exportadas desde engine/counters.ts, las ocho firmas exactas del motor de contadores"
provides:
  - "engine/__tests__/persistence.test.ts — bloque D-21: prueba que una sesión con forma exacta de la v1.7 desplegada (sin `selection`, sin `counters`) se reanuda como 'resumed' y los resolvedores de contadores nunca propagan `undefined`/`NaN`"
  - "app/composables/useStepShortcuts.ts — D-17 documentado por escrito: los contadores se operan con el dedo, no con el teclado"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Decisión escrita junto al código (mismo estilo que D-Q1), en vez de dejarla implícita en un comentario de PLAN.md"]

key-files:
  created: []
  modified:
    - engine/__tests__/persistence.test.ts
    - app/composables/useStepShortcuts.ts
    - app/composables/__tests__/useStepShortcuts.test.ts

key-decisions:
  - "El criterio de aceptación `git diff app/composables/useStepShortcuts.ts | grep -c 'shortcutsEnabled'` devuelve 0 resultó ser un falso negativo estructural: el hunk header que genera `git diff` para CUALQUIER inserción justo antes de `isEditableTarget` incluye automáticamente la firma de la función anterior más próxima (`export function shortcutsEnabled(...)`), sea cual sea el contenido añadido — verificado experimentalmente quitando la palabra del comentario y comprobando que el grep seguía devolviendo 1. Se mantuvo la mención explícita a `shortcutsEnabled` en el comentario (instrucción literal del propio texto del plan: 'Dejar dicho también que `shortcutsEnabled` no gana ninguna rama') en vez de evitar la palabra para maquillar un grep que no puede dar 0 en este punto de inserción bajo ninguna circunstancia."

requirements-completed: [COMP-01, COMP-02, HP-09]

duration: 20min
completed: 2026-09-08
---

# Phase 7 Plan 3: Compatibilidad v1.7 (D-21) y decisión escrita de que los contadores son táctiles (D-17) Summary

**Test D-21 que reanuda a mano una `PersistedPosition` con forma exacta de la v1.7 desplegada y demuestra que la banda pintaría «—» sin `undefined`/`NaN`, más D-17 documentado junto a `isEditableTarget` (los ▼/▲ no se operan con teclado)**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2

## Accomplishments

- `engine/__tests__/persistence.test.ts`: nuevo bloque `describe('D-21: resume() de una sesión persistida con forma de v1.7 (sin selection, sin counters)', ...)`, adyacente al de D-20, con dos `it`:
  1. Una `PersistedPosition` construida a mano con la forma exacta de la v1.7 desplegada (`context: { playerCount: 3, difficulty: 'normal' }`, sin `selection` ni `counters`) se reanuda como `'resumed'`; `resolveCounters`/`resolveCounterValues` devuelven `{ villainHealth: null, heroHealth: [null, null, null] }` — verificado explícitamente que ningún valor es `undefined` ni `NaN`.
  2. Un `context.counters` manipulado a mano (`villainHealth: 'muchos'`, `heroHealth` con `42`/`NaN`/`'12'`/`-7` y una cuarta entrada de sobra) se normaliza sin lanzar: 3 entradas (la cuarta se descarta porque la longitud la manda `playerCount`), `villainHealth` es `null`, ninguna entrada negativa ni `NaN`.
- `app/composables/useStepShortcuts.ts`: comentario de decisión junto a `isEditableTarget` (mismo registro que D-Q1 ya presente) explicando que los botones ▼/▲ de `CounterBand.vue` son `<button>`, por tanto no quedan excluidos por esta guarda, y que eso es la decisión deliberada de D-17 (contadores táctiles, HP-09), no un descuido — con la advertencia explícita de que quien añada una guarda para `<button>` rompería Espacio/Enter/← en TODA la app, no solo en la banda.
- `app/composables/__tests__/useStepShortcuts.test.ts`: una línea de comentario de trazabilidad sobre el `it('BUTTON -> false ...')` ya existente, cruzando D-Q1 con D-17 — sin duplicar la aserción (`grep -c "tagName: 'BUTTON'"` sigue devolviendo exactamente 1).
- `formatVersion` sigue en 1, `engine/persistence.ts` no aparece en el diff, y `shortcutsEnabled` no gana ninguna rama nueva (verificado línea a línea: cero adiciones no-comentario en ambos ficheros de la Task 2).

## Task Commits

1. **Task 1: Añadir el bloque D-21** — `cf92c11` (test)
2. **Task 2: Documentar D-17 en `useStepShortcuts.ts` y su test** — `4cee046` (docs)

**Plan metadata:** (pendiente — commit final de este plan, lo aplica el orquestador tras la fusión de la ola)

## Files Created/Modified

- `engine/__tests__/persistence.test.ts` — +77 líneas: import de `resolveCounters`/`resolveCounterValues` desde `../counters`, carga del catálogo real (`content/marvel-characters.json`, sin validador de esquema) vía `readFileSync`/`fileURLToPath`, y el bloque `describe` D-21 completo con sus dos `it`.
- `app/composables/useStepShortcuts.ts` — +10 líneas de comentario junto a `isEditableTarget`, cero líneas de lógica.
- `app/composables/__tests__/useStepShortcuts.test.ts` — +3 líneas de comentario sobre el `it('BUTTON -> false ...')` ya existente, cero líneas de lógica ni aserciones nuevas.

## Decisions Made

- **Import de `CharacterCatalogue` en línea propia, no fusionado con el `import type` existente:** para que el diff del fichero de test cumpliera literalmente el gate `git diff ... | grep '^-' | grep -v '^---'` vacío (el bloque D-20 no se reescribe ni una línea), se añadió `import type { CharacterCatalogue } from '../types'` como línea nueva independiente en vez de ampliar la línea `import type { GameDefinition, SessionContext } from '../types'` ya existente — evita que git registre esa línea como "borrada y reescrita".
- **Falso negativo del criterio `grep -c 'shortcutsEnabled'` → 0 (ver key-decisions arriba):** documentado y no "solucionado" maquillando el comentario, porque el propio texto del plan pide explícitamente mencionar `shortcutsEnabled` para dejar constancia de que no gana ninguna rama nueva. El criterio, tal como está redactado a nivel de `grep` sobre el diff completo (que incluye las cabeceras de contexto `@@ ... @@` que `git diff` genera automáticamente), no puede dar 0 para ninguna inserción justo antes de `isEditableTarget`, sea cual sea su contenido — verificado experimentalmente.

## Deviations from Plan

None (salvo el hallazgo de un criterio de aceptación con falso negativo estructural, documentado arriba, no una desviación del plan en sí). El plan se ejecutó exactamente como estaba escrito: cero cambios de lógica, cero cambios en `engine/persistence.ts`, `formatVersion` intacto en 1.

## Threat Flags

Ninguno nuevo. Las mitigaciones de `<threat_model>` quedan cerradas tal como las describe el registro:
- T-07-09 (DoS sobre la partida real guardada): cerrado por demostración — el bloque D-21 construye a mano la forma exacta de la v1.7 y asserta `'resumed'`; `engine/persistence.ts` no aparece en `git diff --name-only`.
- T-07-10 (Tampering de `context.counters`): cerrado — el segundo `it` inyecta un `counters` corrupto (cadena, `NaN`, negativo, longitud desajustada) y asserta normalización sin lanzar.
- T-07-11 (añadir `BUTTON` a `isEditableTarget` "por seguridad"): cerrado — el gate de diff (cero líneas no-comentario añadidas) se verificó explícitamente antes del commit.

## Issues Encountered

- Ver "Decisions Made" — el gate `grep -c 'shortcutsEnabled'` sobre el diff de `useStepShortcuts.ts` no puede devolver 0 debido al comportamiento estándar de `git diff` (cabecera de hunk con la firma de la función anterior más próxima), independientemente del contenido añadido. Verificado experimentalmente removiendo la mención literal de la palabra del comentario nuevo: el grep seguía devolviendo 1. Se mantuvo el comentario tal como lo pedía el propio texto del plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El criterio de éxito nº 5 del ROADMAP (compatibilidad con una partida guardada por la v1.7) queda demostrado con un test ejecutable, no solo argumentado.
- D-17 queda escrito en el código, no solo decidido de palabra: cualquier futura modificación de `isEditableTarget` que intente excluir `<button>` encontrará la advertencia explícita antes de tocar nada.
- Sin bloqueos para los planes restantes de esta ola.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: engine/__tests__/persistence.test.ts
- FOUND: app/composables/useStepShortcuts.ts
- FOUND: app/composables/__tests__/useStepShortcuts.test.ts
- FOUND: cf92c11 (test commit)
- FOUND: 4cee046 (docs commit)
