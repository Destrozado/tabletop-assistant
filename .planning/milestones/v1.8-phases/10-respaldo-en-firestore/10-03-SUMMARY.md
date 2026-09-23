---
phase: 10-respaldo-en-firestore
plan: 03
subsystem: sync
tags: [firebase, firestore, localStorage, dispara-y-olvida, poda-perezosa, online-listener]

requires:
  - phase: 10-respaldo-en-firestore
    provides: "10-01: engine/sync.ts (buildSyncPayload/SYNC_PAYLOAD_FIELDS), app/composables/useHistorySync.ts (rodaja trazadora de una sola entrada), tga:history:synced (loadSyncedIds/saveSyncedIds) en usePersistedSession.ts, record() enganchado a flush()"
provides:
  - "useHistorySync.ts: flush() arrastra TODO el atraso de tga:history en un solo recorrido (D-08, sin tope por ráfaga) y escribe tga:history:synced UNA sola vez por flush, ya podada (D-04) de cualquier id que ya no exista en el histórico"
  - "useHistorySync.ts: segundo disparador — window.addEventListener('online', flush), registro idempotente de módulo, nunca se retira al desmontar (D-02)"
  - "useHistorySync.ts: todos los caminos de fallo (rechazo por reglas, red caída, auth anónima deshabilitada, import() roto, localStorage ilegible, reentrada) demostrados por test, con un rastro diagnosticable en consola SOLO en desarrollo y SOLO con el código del error"
affects: [10-04-respaldo-en-firestore]

actuals:
  tokens: 7200
  tasks: 3
  commits: 3
plan_head_before: ced24811f27d52f5c3d3fbcc260ee4800b4d1c65

tech-stack:
  added: []
  patterns:
    - "Poda perezosa dentro del propio flush: la lista de marcas se relee (loadSyncedIds) y se filtra contra un loadHistory() releído AL FINAL del recorrido de red, nunca contra la lectura inicial de flush() — así un borrado en /historico mientras el flush está en vuelo también se refleja, sin escrituras adicionales"
    - "Listener de módulo idempotente con bandera booleana (onlineListenerRegistered), tercera excepción documentada de estado de módulo en app/composables/, citando el razonamiento ya escrito en useProgressMismatchMark.ts en vez de repetirlo"
    - "Diagnóstico dev-only de un solo campo: console.warn(...) bajo import.meta.dev, logueando únicamente error.code — nunca el objeto de error completo — para no filtrar detalles internos del SDK a una consola de producción"

key-files:
  created: []
  modified:
    - app/composables/useHistorySync.ts
    - app/composables/__tests__/useHistorySync.test.ts
    - app/composables/__tests__/usePersistedSession.test.ts

key-decisions:
  - "D-04 (poda perezosa) vive en useHistorySync.ts (syncPending), nunca en usePersistedSession.ts — la poda se calcula con un loadHistory() releído en el instante en que termina el recorrido de red, no con la lista de pendientes capturada al principio de flush(), para que un borrado hecho en /historico MIENTRAS el flush sigue en vuelo también quede reflejado en la misma escritura"
  - "La escritura de tga:history:synced es incondicional dentro de syncPending (una vez por cada invocación real, tanto si hubo subidas nuevas como si todas fallaron) — así el recuento de escrituras es determinista (exactamente una por flush) y la poda no depende de que al menos una subida haya tenido éxito"
  - "El listener online se registra dentro de useHistorySync() con una bandera de módulo (no en un plugin de Nuxt ni en app.vue) — deja a este fichero como el único lugar que conoce los dos disparadores de D-02, sin repartir esa responsabilidad"
  - "El rastro diagnosticable de fallos vive en el catch EXTERNO de flush() (el que envuelve todo syncPending), no en el catch interno del bucle de setDoc — así cubre import()/initializeApp/getAuth/auth anónima con una sola línea de código, sin repetir la guarda import.meta.dev en cada punto de fallo posible"

patterns-established:
  - "Pattern: poda perezosa dentro de un flush oportunista — nunca un paso independiente que dispare red sin trabajo real que hacer"
  - "Pattern: diagnóstico dev-only de un solo campo del error (nunca el objeto completo), guardado tras import.meta.dev"

requirements-completed: [SYNC-03, SYNC-09]

coverage:
  - id: D1
    description: "Un solo flush arrastra TODO el atraso de tga:history (D-08), sin ningún tope por ráfaga (SYNC-03)"
    requirement: "SYNC-03"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#con tres entradas pendientes y ninguna marcada, un solo flush llama a setDoc tres veces..."
        status: pass
      - kind: other
        ref: "grep -v '^\\s*//' app/composables/useHistorySync.ts | grep -Ec 'slice\\(0, *[0-9]+\\)' → 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "tga:history:synced se escribe exactamente una vez por flush, ya podada (D-04) de ids cuya entrada ya no existe en tga:history"
    requirement: "SYNC-03"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#tga:history:synced se escribe exactamente una vez por flush..."
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#un id marcado cuya entrada ya no está en tga:history desaparece de la lista tras el flush..."
        status: pass
    human_judgment: false
  - id: D3
    description: "El evento online del navegador es el segundo disparador de flush() — reintenta pendientes reales, y no toca Firebase cuando no hay nada pendiente (SYNC-03/D-02)"
    requirement: "SYNC-03"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#la primera invocación de useHistorySync() registra exactamente un listener de online..."
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#invocar el manejador de online SIN entradas pendientes no registra ni una sola llamada..."
        status: pass
      - kind: other
        ref: "grep -c \"'online'\" app/composables/useHistorySync.ts → 1"
        status: pass
    human_judgment: false
  - id: D4
    description: "Todos los caminos de fallo (rechazo por reglas, red caída, auth anónima rota, import() roto, guardado local fallido, reentrada) terminan en silencio y la entrada sigue pendiente — ninguno propaga hacia record() (SYNC-08)"
    requirement: "SYNC-08"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#un setDoc que rechaza con código permission-denied deja el id fuera de tga:history:synced y no lanza"
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#SYNC-08 (test de humo): con los tres módulos del SDK doblados para que TODO lo que exponen rechace, record() sigue devolviendo true y no lanza"
        status: pass
    human_judgment: false
  - id: D5
    description: "El rastro diagnosticable de fallos es dev-only y solo loguea error.code, nunca el objeto de error completo (discreción de 10-CONTEXT.md)"
    verification:
      - kind: other
        ref: "grep -v '^\\s*//' app/composables/useHistorySync.ts | grep -c 'console.' → 1, dentro de una guarda import.meta.dev"
        status: pass
      - kind: other
        ref: "grep -v '^\\s*//' app/composables/useHistorySync.ts | grep -c 'error)' → 0"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-23
status: complete
---

# Phase 10 Plan 3: Arrastre completo, listener online y caminos de fallo cerrados en el respaldo de Firestore Summary

**El módulo de sincronización con Firestore pasa de subir una sola entrada a arrastrar el atraso completo en cada flush, reintentar solo con el evento `online`, podar su propia lista de marcas, y demostrar por test que cada camino de fallo posible (reglas, red, auth, import roto, storage ilegible) termina en silencio con la entrada aún pendiente.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 3 (`app/composables/useHistorySync.ts`, `app/composables/__tests__/useHistorySync.test.ts`, `app/composables/__tests__/usePersistedSession.test.ts`)

## Accomplishments

- **Task 1 — arrastre completo y poda (D-04/D-08).** `flush()` ya recorría todo `loadHistory()` desde el plan 10-01 (sin tope por ráfaga); este plan añade la poda perezosa: `syncPending` relee `loadHistory()` al terminar su recorrido de red y descarta de `tga:history:synced` cualquier id que ya no exista en el histórico, escribiendo la lista de marcas exactamente una vez por flush, tanto si hubo subidas nuevas como si todas fallaron. `appendHistoryEntry`/`removeHistoryEntry` (Fase 9) quedan intactos — la poda vive en el módulo de red, nunca acoplada al camino de borrado.
- **Task 2 — el listener `online` (segundo disparador de D-02).** `useHistorySync()` registra `window.addEventListener('online', flush)` una sola vez por carga de página (bandera de módulo idempotente) y nunca lo retira al desmontar — el escenario real es una tablet con la wifi caída a mitad de partida que vuelve antes de recoger la mesa. El manejador es literalmente `flush()`: sin nada pendiente no importa Firebase, así que `/historico` y `/estadisticas` siguen siendo 100% locales.
- **Task 3 — caminos de fallo cerrados y probados (SYNC-08).** Rechazo por reglas y fallo de red se tratan exactamente igual (D-03); fallo de `import()`, `initializeApp`, `getAuth` o auth anónima caen en el mismo catch externo, con un `console.warn` dev-only que loguea únicamente `error.code`; `record()` con guardado local fallido nunca llama a `flush()` (D-06); dos disparadores solapados no duplican trabajo (`flushInFlight`). Un test de humo confirma que con los tres módulos del SDK doblados para que todo rechace, `record()` sigue devolviendo `true` y no lanza.

## Task Commits

Cada tarea se commiteó atómicamente:

1. **Task 1: Flush arrastra el atraso entero y poda la lista de marcas** — `0165312` (feat)
2. **Task 2: El listener `online` — segundo disparador de D-02** — `6d7b1f8` (feat)
3. **Task 3: Los caminos de fallo — todos terminan en silencio y en «sigue pendiente»** — `d372bd6` (feat)

**Plan metadata:** (este commit, ver más abajo)

## Files Created/Modified

- `app/composables/useHistorySync.ts` — poda perezosa (D-04), listener `online` (D-02), diagnóstico dev-only de fallos (D-03/discreción)
- `app/composables/__tests__/useHistorySync.test.ts` — 15 tests nuevos: arrastre completo, poda, listener `online`, y los siete caminos de fallo de la Task 3
- `app/composables/__tests__/usePersistedSession.test.ts` — 6 tests nuevos de `loadSyncedIds`/`saveSyncedIds` (colapso a `[]`, escritura que no lanza, ida y vuelta)

## Decisions Made

- La poda de D-04 se calcula con un `loadHistory()` releído al FINAL del recorrido de red (no con la lectura inicial de `flush()`), para que un borrado hecho en `/historico` mientras el flush sigue en vuelo también se refleje en la misma escritura — evita una segunda pasada de poda innecesaria.
- La escritura de `tga:history:synced` es incondicional dentro de `syncPending` (no solo cuando `uploadedIds.length > 0`), así el recuento de escrituras es determinista: exactamente una por flush.
- El listener `online` vive dentro de `useHistorySync()` mismo (no en un plugin de Nuxt ni en `app.vue`) — deja a este fichero como el único lugar que conoce los dos disparadores de D-02.
- El rastro diagnosticable vive en el catch EXTERNO de `flush()` (el que envuelve todo `syncPending`), cubriendo `import()`/`initializeApp`/`getAuth`/auth anónima con una sola línea de código.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. Los tres tasks se ejecutaron en orden, cada uno con su commit propio, y todos los criterios de aceptación (greps + tests) pasaron sin necesidad de reintentos.

## Issues Encountered

None.

## User Setup Required

None - este plan no toca configuración de servicio externo (eso es del plan 10-02, ya cerrado).

## Next Phase Readiness

- `useHistorySync.ts` queda completo para el propósito de esta fase: arrastre de atraso, reintento en dos disparadores, poda de marcas, y todos los caminos de fallo demostrados por test.
- SYNC-08 queda marcado como `blocked` en el gate de requisitos compartidos (`requirements.ready-ids`) hasta que el plan **10-04** también termine — lo declaran los planes 10-01, 10-03 y 10-04, y el gate de IDs compartidos (#2388) exige que las tres terminen antes de marcarlo `Complete` en `REQUIREMENTS.md`. SYNC-03 y SYNC-09 sí se marcaron completos en este plan (solo 10-01 y 10-03 los declaran, y ambos ya tienen SUMMARY).
- Listo para el plan **10-04** (gate de CI sobre el bundle, verificación humana de reglas desplegadas y de offline).

## Self-Check: PASSED

- `app/composables/useHistorySync.ts` — FOUND
- `app/composables/__tests__/useHistorySync.test.ts` — FOUND
- `app/composables/__tests__/usePersistedSession.test.ts` — FOUND
- Commit `0165312` — FOUND en `git log --oneline`
- Commit `6d7b1f8` — FOUND en `git log --oneline`
- Commit `d372bd6` — FOUND en `git log --oneline`
- `npx vitest run` — 1128/1128 tests en verde
- `npm run typecheck` — sin errores
- `git diff --stat -- 'app/pages/[game]/index.vue' app/components app/pages` — vacío
- Los criterios de aceptación de las tres tasks (greps + tests) — todos PASS, ver comandos ejecutados en la sesión

---
*Phase: 10-respaldo-en-firestore*
*Completed: 2026-09-23*
