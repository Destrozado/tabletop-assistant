---
phase: 09-hist-rico-y-estad-sticas
plan: 04
subsystem: app-composables
tags: [localstorage, vitest, historico, wr-02]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-01"
    provides: "GameHistoryEntry, HistoryPlayerEntry, LossCause en engine/types.ts"
provides:
  - "tga:history: tercera clave independiente de localStorage (D-13), sin sufijo de gameId"
  - "loadHistory(), appendHistoryEntry(entry): boolean, removeHistoryEntry(id) en usePersistedSession()"
  - "writeRaw ahora devuelve boolean (D-03); save/saveVoicePreference siguen ignorándolo"
affects: ["09-02", "09-03", "09-05", "09-06", "09-07", "09-08"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tercera clave de localStorage sin sufijo de gameId, calcada de VOICE_KEY/D-46 pero para el histórico (D-13/HIST-09)"
    - "Lectura defensiva entrada a entrada que descarta lo ilegible sin tirar el array completo (mismo criterio que isPersistedPosition)"
    - "Única función `void`-breaker del fichero (appendHistoryEntry: boolean) documentada explícitamente para resistir refactors futuros"

key-files:
  created: []
  modified:
    - app/composables/usePersistedSession.ts
    - app/composables/__tests__/usePersistedSession.test.ts

key-decisions:
  - "writeRaw propaga el resultado del try interno en vez de comparar readRaw antes/después (evita falso negativo si el contenido no cambia y una lectura/parseo de más) — resuelve la Open Question 1 de 09-RESEARCH.md"
  - "HISTORY_KEY = 'tga:history' sin sufijo de gameId: es lo único que hace posible que clear(gameId) nunca pueda borrar el histórico"

requirements-completed: [HIST-06, HIST-09, STAT-04]

# Metrics
duration: 20min
completed: 2026-09-10
---

# Phase 9 Plan 4: Persistencia del histórico (tga:history) Summary

**`usePersistedSession.ts` gana una tercera clave de `localStorage` independiente de la partida — `tga:history` — con lectura defensiva entrada a entrada, escritura que informa de si logró escribir (`appendHistoryEntry` es la única función `boolean` del fichero) y borrado por id que reasigna en vez de mutar.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-10 (tras corregir la base del worktree con `git reset --hard` al commit de cierre de la ola 1)
- **Completed:** 2026-09-10
- **Tasks:** 3/3 completadas
- **Files modified:** 2

## Accomplishments

- `HISTORY_KEY = 'tga:history'` y `HISTORY_FORMAT_VERSION = 1` añadidos junto a `VOICE_KEY`, con el mismo razonamiento de D-46 aplicado a D-13/HIST-09: la clave no deriva de `storageKey(gameId)`, así que `clear(gameId)` nunca puede tocarla.
- `writeRaw` cambia de `void` a `boolean` (propaga el resultado real del `try`/`catch` interno). `save`/`saveVoicePreference` no cambian ni una línea — siguen ignorando el valor devuelto, preservando VOZ-06/D-51 (un fallo de almacenamiento nunca rompe la interacción).
- `isGameHistoryEntry` valida forma mínima (id, gameId, result, recordedAt, players, round, playerCount) sin lanzar nunca, mismo criterio que `isPersistedPosition`.
- `loadHistory()` descarta JSON corrupto y `formatVersion` distinto devolviendo `[]`; filtra entrada a entrada con `isGameHistoryEntry`, así que un array de tres con una rota devuelve las dos buenas.
- `appendHistoryEntry(entry): boolean` antepone la entrada nueva (`[entry, ...current]`, HIST-07: histórico ya ordenado de más reciente a más antigua) y devuelve el booleano de `writeRaw` — la única función `void`-breaker del fichero, documentada para resistir un futuro intento de "homogeneizar" la firma (D-03).
- `removeHistoryEntry(id): void` reasigna con `.filter()`, nunca `splice` in situ.
- 12 tests nuevos (27 en total en el fichero, 609 en el proyecto), incluido el calco exacto del test D-46 de voz para probar HIST-09 mecánicamente.

## Task Commits

1. **Task 1 + Task 2: writeRaw boolean, HISTORY_KEY/envoltorio/loadHistory, appendHistoryEntry/removeHistoryEntry** — `1b458c1` (feat)
2. **Task 3: tests de la clave tga:history** — `d02f370` (test)

**Plan metadata:** (pendiente — commit de cierre de este SUMMARY, lo hace el orquestador tras el merge)

## Files Created/Modified

- `app/composables/usePersistedSession.ts` — `HISTORY_KEY`, `HISTORY_FORMAT_VERSION`, `HistoryEnvelope`, `isGameHistoryEntry`, `writeRaw` ahora `boolean`, `loadHistory`, `appendHistoryEntry`, `removeHistoryEntry` añadidas al objeto devuelto por `usePersistedSession()`
- `app/composables/__tests__/usePersistedSession.test.ts` — `makeEntry()` y el bloque `describe('tga:history — clave independiente de la partida (D-13/HIST-09)', ...)` con 12 tests

## Decisions Made

Ninguna decisión nueva más allá de las ya cerradas en `09-CONTEXT.md`. El plan ya resolvía explícitamente la Open Question 1 de `09-RESEARCH.md` (propagar el resultado del `try` interno de `writeRaw` en vez de comparar `readRaw` antes/después); se implementó tal cual sin margen de discreción adicional.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] El comentario de cabecera del fichero (línea 8, preexistente antes de este plan) citaba literalmente `` `useLocalStorage`/`useStorage` `` de VueUse, disparando en falso el criterio de aceptación de la Task 1 `grep -Ec "useLocalStorage|useStorage" ... devuelve 0`**
- **Found during:** Verificación de criterios de aceptación de la Task 1 (el grep devolvía 1 en vez de 0 tras mis cambios, sin que yo hubiera tocado esa línea)
- **Issue:** El comentario documentaba correctamente por qué el fichero NO usa esos composables de VueUse, pero mencionarlos por su nombre literal hace que un grep mecánico de "prohibido en este fichero" no distinga entre uso real y mención en prosa explicativa — mismo patrón que el plan 09-01 ya había encontrado y corregido en `engine/history.ts`.
- **Fix:** Reescrita la frase para transmitir el mismo razonamiento sin citar los nombres literales ("los envoltorios reactivos de VueUse" en vez de los nombres de función).
- **Files modified:** `app/composables/usePersistedSession.ts` (línea 8, fuera del alcance directo de las Tasks pero bloqueaba su criterio de aceptación mecánico)
- **Verification:** el grep devuelve 0 tras el cambio; los 27 tests del fichero y los 609 del proyecto siguen en verde.
- **Committed in:** `1b458c1` (dentro del commit de la Task 1+2, antes de que existiera un commit previo del que separarlo)

### Nota de proceso: Tasks 1 y 2 en un solo commit

Las ediciones de la Task 1 (writeRaw boolean, HISTORY_KEY, envoltorio, loadHistory) y la Task 2 (appendHistoryEntry, removeHistoryEntry) se aplicaron de forma secuencial sobre el mismo fichero antes de la primera verificación intermedia, así que ambas quedaron en el mismo commit `1b458c1` en vez de en dos commits separados. No afecta al contenido final: los criterios de aceptación de ambas tasks se verificaron por separado y ambos pasan.

## Self-Check: PASSED

- FOUND: app/composables/usePersistedSession.ts
- FOUND: app/composables/__tests__/usePersistedSession.test.ts
- FOUND commit: 1b458c1
- FOUND commit: d02f370

## Verification Against Plan

- `npm test` termina con código 0: **24 test files, 609 tests, todos en verde.**
- `grep -rEi "firestore|firebase|syncedToFirestore" app/composables/usePersistedSession.ts` no devuelve ninguna línea: **confirmado, vacío.**
- El cuerpo de `clear()` sigue siendo exactamente una línea con `removeRaw(storageKey(gameId))`: **confirmado.**
- `tga:history` es una tercera clave independiente que convive con las de progreso y voz: **confirmado, sin sufijo de `gameId`.**
- Un test prueba que «Partida terminada» (que llama a `clear`) no puede tocar el histórico: **confirmado, test HIST-09 calcado del de D-46.**

## Known Stubs

Ninguno. Este plan solo extiende la costura de `localStorage` con funciones puras/imperativas y su test hermano; no hay componentes ni pantallas involucradas todavía (llegan en planes posteriores de esta fase).

## Threat Flags

Ninguno. Las tres mitigaciones del `<threat_model>` del plan (T-09-11, T-09-12, T-09-13) están implementadas y cubiertas por test; T-09-14 (información en claro) se acepta explícitamente en el propio plan, sin superficie nueva fuera de lo ya registrado.
