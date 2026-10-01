---
phase: quick-261001-o3p
plan: 01
status: complete
completed: 2026-10-01
commits:
  - d02062e  # Task 1: esquema, tipos y motor de módulos
  - 5ac86b4  # Task 2: generador + catálogo regenerado
  - a9f8e71  # Task 3: tests
---

# Quick 261001-o3p: Brigada de Demolición como villano placeholder

«Brigada de Demolición» (pack `twc`) es ahora un villano seleccionable con vida inicial 0 (Normal y Experto), sin mecánica propia, sin módulo recomendado y con id propio `brigada-de-demolicion` para histórico y estadísticas.

## Qué se hizo

- **Task 1 (d02062e):** `health` de etapa estándar pasa a nonnegative (`expert.health` sigue positive); `recommendedModuleId` opcional en esquema y tipos; `resolveModuleIds` devuelve `[]` sin recomendado; `slugifyCharacterName` pliega acentos (NFD).
- **Task 2 (5ac86b4):** `PLACEHOLDER_VILLAINS` + `PLACEHOLDER_STAGE` en el generador, `checkMainSchemeIdentity` (refactor de `checkMainScheme`), `twc` en `ENCOUNTER_PACKS`, `slugify` con plegado NFD. Catálogo regenerado con `npm run catalogue:generate` («Escritos 24 héroes, 5 villanos y 8 módulos»). Diff del JSON: +14/-0, solo la fila nueva.
- **Task 3:** tests en characters, counters y encounterSets con la fila real.

## Verificación

- `npx vitest run`: 41 ficheros, 1388 tests pasan.
- `npm run typecheck`: exit 0.
- `content/marvel-champions.json` intacto.

## Nota aceptada (U-03)

La línea de conjuntos de encuentro mostrará «Normal»/«Experto» para este escenario, aunque su hoja de reglas no los usa. Se acepta tal cual.

## Deviations from Plan

Ninguna: el plan se ejecutó tal cual. (El diff numstat del JSON fue +14/-0 en lugar de +14/-1 porque la línea de cierre de Ultron no llevaba coma final.)

## Self-Check: PASSED
