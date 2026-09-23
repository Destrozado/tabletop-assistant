---
phase: 09-hist-rico-y-estad-sticas
plan: 09
subsystem: persistence
tags: [localStorage, discriminated-union, type-guards, vitest, gap-closure]

# Dependency graph
requires:
  - phase: 09-04
    provides: "usePersistedSession.ts con HISTORY_KEY/loadHistory/appendHistoryEntry/removeHistoryEntry ya cableados (D-13)"
provides:
  - "readEnvelope() — lectura del envoltorio crudo de tga:history con tres resultados distinguibles (empty/ok/unreadable)"
  - "appendHistoryEntry/removeHistoryEntry no destructivos: abortan ante un blob unreadable en vez de sobrescribirlo"
  - "isHistoryPlayerEntry — validador por tipo de un elemento de players[]"
  - "isGameHistoryEntry endurecido: valida villainId/villainName/difficulty/lossCause/durationMs y cada elemento de players"
  - "removeHistoryEntry(id) elimina como máximo UNA entrada aunque dos compartan id (WR-08)"
affects: [09-10, 09-11, 09-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated union EnvelopeRead ({kind:'empty'|'ok'|'unreadable'}) para separar 'leer el envoltorio en crudo' de 'leer las entradas válidas', permitiendo que la escritura sepa cuándo abortar sin machacar un blob ilegible"
    - "Filtrado de cara a la PANTALLA (loadHistory) nunca de cara al DISCO (append/remove operan sobre entries en crudo) — una entrada ilegible sobrevive indefinidamente hasta que algo la sepa interpretar"

key-files:
  created: []
  modified:
    - app/composables/usePersistedSession.ts
    - app/composables/__tests__/usePersistedSession.test.ts

key-decisions:
  - "readEnvelope() vive fuera del cuerpo de usePersistedSession(), junto a readRaw/writeRaw/removeRaw, porque no depende de nada del composable"
  - "recordedAt sigue exigiéndose solo como string — no se añade Date.parse (eso queda para 09-10, ordenar por instante, WR-06 mitad útil)"
  - "removeHistoryEntry escribe siempre que readEnvelope() devuelva 'ok' (incluso si el id no existe), igual que el comportamiento previo — solo 'empty'/'unreadable' abortan la escritura"

requirements-completed: [HIST-06, HIST-08]

# Metrics
duration: 35min
completed: 2026-09-12
---

# Phase 09 Plan 09: Escritura no destructiva del histórico y validación por tipo en la frontera de almacenamiento — Summary

**`readEnvelope()` distingue "clave ausente" de "blob ilegible" antes de escribir, así que `appendHistoryEntry`/`removeHistoryEntry` ya no pueden confundir un `formatVersion` desconocido o un JSON corrupto con un histórico vacío y sobrescribirlo; `isGameHistoryEntry`/`isHistoryPlayerEntry` ahora validan por tipo los 12 campos (antes 7), cerrando la causa raíz común de los tres BLOCKER de `09-VERIFICATION.md` (CR-01/CR-02/CR-03).**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-12T10:46:00Z (aprox.)
- **Completed:** 2026-09-12T10:54:10Z
- **Tasks:** 3/3 completadas
- **Files modified:** 2

## Accomplishments
- CR-03 cerrado: con `formatVersion: 2` o JSON corrupto ya en `tga:history`, `appendHistoryEntry` devuelve `false` y `removeHistoryEntry` no escribe nada — el blob previo sobrevive intacto byte a byte (verificado con `toBe` sobre la cadena capturada antes de la llamada).
- CR-01/CR-02 cerrados: `isGameHistoryEntry` rechaza `players: [null]`, `players: [{}]`, `villainId` numérico y `difficulty` desconocida — ya no llegan a `buildHistoryCardView` ni a `aggregateStatistics`, que es donde `09-VERIFICATION.md` reprodujo los `TypeError` que tumbaban `/historico` y `/estadisticas`.
- WR-08 (mitad de este fichero) cerrado: `removeHistoryEntry` elimina como máximo una entrada aunque dos compartan `id`.
- Una entrada que no pasa `isGameHistoryEntry` sobrevive en disco a un borrado de otra entrada — se filtra de cara a la pantalla (`loadHistory`), nunca de cara al disco.
- 9 tests de regresión nuevos, ninguno de los 27 tests preexistentes editado; suite completa del proyecto: 26 ficheros / 650 tests en verde (641 previos + 9 nuevos, coincide con el recuento de `09-VERIFICATION.md`).
- `npx nuxt build` termina en verde (prerender de las 4 rutas, generación de PWA, build de Nitro).

## Task Commits

Each task was committed atomically:

1. **Task 1: Separar la lectura del envoltorio de la lectura de entradas válidas y hacer no destructivas las dos escrituras (CR-03)** - `597bda6` (fix)
2. **Task 2: Endurecer por tipo la frontera de almacenamiento — isHistoryPlayerEntry y isGameHistoryEntry (causa raíz de CR-01 y CR-02)** - `33074b1` (fix)
3. **Task 3: Tests de regresión de CR-03 y de la frontera de tipos** - `57cfcf2` (test)

**Plan metadata:** (pendiente — commit de este SUMMARY.md, ver protocolo de worktree)

## Files Created/Modified
- `app/composables/usePersistedSession.ts` — `EnvelopeRead` (unión discriminada de 3 variantes), `readEnvelope()`, `loadHistory()`/`appendHistoryEntry()`/`removeHistoryEntry()` reescritos sobre `readEnvelope()`, `isHistoryPlayerEntry()` nuevo, `isGameHistoryEntry()` endurecido con 5 comprobaciones más.
- `app/composables/__tests__/usePersistedSession.test.ts` — 9 tests nuevos dentro del `describe` existente `'tga:history — clave independiente de la partida (D-13/HIST-09)'`, citando cada uno el hallazgo que cierra (CR-03 ×4, CR-01 ×2, CR-02 ×2, WR-08 ×1).

## Decisions Made
- `readEnvelope()` se ubica fuera del cuerpo de `usePersistedSession()`, junto a `readRaw`/`writeRaw`/`removeRaw`, tal como especifica el plan — no depende de ningún estado del composable.
- Los objetos `envelope` de `appendHistoryEntry`/`removeHistoryEntry` se dejan sin la anotación explícita `HistoryEnvelope` (con `entries: unknown[]` en vez de `GameHistoryEntry[]`) porque las entradas previas se conservan EN CRUDO — anotar como `HistoryEnvelope` habría exigido un cast forzado sin aportar seguridad de tipos real, dado que el propósito es preservar bytes que pueden no ser `GameHistoryEntry` válidos.
- No se tocó `recordedAt` ni se añadió `Date.parse` — WR-06 (ordenar por instante) queda explícitamente fuera de este cierre, tal como marca `<scope_boundary>` del plan; se cierra en `09-10-PLAN.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/` ausente en el worktree, los tests fallaban con `TSCONFIG_ERROR`**
- **Found during:** Verificación de Task 1 (primera ejecución de `npx vitest run`)
- **Issue:** El worktree se creó sin ejecutar `postinstall` (`nuxt prepare`), así que `.nuxt/tsconfig.app.json` no existía y Vitest no podía transformar los ficheros `.ts` del proyecto `app-logic`.
- **Fix:** Se ejecutó `npx nuxi prepare`, que regenera `.nuxt/` de forma determinista a partir de `nuxt.config.ts` — no modifica ningún fichero versionado ni instala paquetes nuevos.
- **Files modified:** Ninguno versionado (`.nuxt/` está en `.gitignore`).
- **Verification:** `npx vitest run app/composables/__tests__/usePersistedSession.test.ts` pasó a ejecutar sus 27 tests preexistentes en verde.

### Known Limitation (no bloqueante)

**Task 2, criterio de aceptación de typecheck no ejecutable tal cual está escrito.** El plan pide `npx nuxt typecheck` o, si no existe, `npx vue-tsc --noEmit`. Ninguno de los dos está disponible: `nuxt typecheck` exige instalar `vue-tsc` o `golar` como devDependency, y `package.json` no declara `typescript` ni `vue-tsc` en ningún sitio del repo (confirmado, no es un descuido de este plan — el proyecto nunca tuvo un paso de typecheck configurado). Instalar un paquete nuevo cae bajo la exclusión de RULE 3 (instalaciones de gestor de paquetes requieren un checkpoint humano de legitimidad, no un auto-fix), y el `<verification>` de nivel de plan no exige typecheck — solo `npx nuxt build`, que sí se ejecutó y terminó en verde, ejercitando la compilación real de Vite/Nitro sobre el fichero modificado sin errores. Se deja constancia aquí en vez de instalar nada por iniciativa propia; si el proyecto quiere un gate de tipos real, es una decisión de arquitectura para tratar en un plan/quick dedicado, no un efecto colateral de este cierre de hueco.

## Self-Check: PASSED

- FOUND: `app/composables/usePersistedSession.ts`
- FOUND: `app/composables/__tests__/usePersistedSession.test.ts`
- FOUND commit `597bda6`
- FOUND commit `33074b1`
- FOUND commit `57cfcf2`
