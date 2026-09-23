---
phase: 10-respaldo-en-firestore
plan: 01
subsystem: sync
tags: [firebase, firestore, firebase-auth, localStorage, dispara-y-olvida, import-dinamico]

requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "GameHistoryEntry, la costura única de localStorage (usePersistedSession.ts) y la promesa aditiva D-14 que esta fase cumple con tga:history:synced"
provides:
  - "engine/sync.ts: buildSyncPayload/SYNC_PAYLOAD_FIELDS — proyección pura por lista blanca (D-09), lista para que el plan 10-02 compare mecánicamente contra firestore.rules"
  - "app/composables/useHistorySync.ts: useHistorySync().flush() — módulo de red completo (SDK diferido, auth anónima sin doble alta, setDoc idempotente por id local)"
  - "tga:history:synced en usePersistedSession.ts (loadSyncedIds/saveSyncedIds) — la cola de reintento en localStorage que sustituye la persistencia offline propia de Firestore (SYNC-09)"
  - "record() en useGameHistory.ts enganchado a flush() tras un guardado local con éxito, sin cambiar su firma síncrona"
  - "runtimeConfig.public con las cuatro claves de Firebase en nuxt.config.ts (D-13)"
affects: [10-02-respaldo-en-firestore, 10-03-respaldo-en-firestore, 10-04-respaldo-en-firestore]

actuals:
  tokens: 8412
  tasks: 3
  commits: 1

tech-stack:
  added: ["firebase@^12.19.0 (SDK modular: firebase/app, firebase/auth, firebase/firestore)"]
  patterns:
    - "Módulo de red único con SDK cargado SOLO por import() dinámico dentro del cuerpo de una función — nunca import estático de nivel superior, ni siquiera import type (los tipos se obtienen por typeof import(...) inline)"
    - "Guarda de entorno como CÓDIGO (typeof window === 'undefined'), nunca como sufijo de fichero (.client.ts) — confirmado por 10-RESEARCH.md que Nuxt 4 no documenta ese sufijo para composables"
    - "Auth anónima: esperar UNA vez a onAuthStateChanged (resolviendo una promesa y dándose de baja en el propio callback) antes de decidir si hace falta signInAnonymously — evita el uid duplicado por condición de carrera"

key-files:
  created:
    - engine/sync.ts
    - engine/__tests__/sync.test.ts
    - app/composables/useHistorySync.ts
    - app/composables/__tests__/useHistorySync.test.ts
  modified:
    - package.json
    - package-lock.json
    - nuxt.config.ts
    - app/composables/usePersistedSession.ts
    - app/composables/useGameHistory.ts

key-decisions:
  - "firebase@^12.19.0 aprobado por el usuario tras el checkpoint de legitimidad de paquetes (veredicto SUS/too-new — falso positivo esperado de un SDK oficial de alta cadencia de releases, repo github.com/firebase/firebase-js-sdk confirmado, sin postinstall)"
  - "D-03 (setDoc con el id local como id de documento) y D-10 (colección plana history/{id} con uid como campo) confirmados por el usuario en el checkpoint de puerta de un solo sentido antes de escribir la Task 3"
  - "syncPending fusiona (unión) los ids recién subidos con los que ya devuelve loadSyncedIds() antes de escribir con saveSyncedIds — nunca sobrescribe con solo el lote de esta pasada. La poda perezosa de D-04 (descartar de la lista los ids que ya no estén en tga:history) queda deliberadamente fuera de alcance de este plan: la Task 3 no la pide, y CONTEXT.md no la incluye entre los must_haves de esta fase — se deja para cuando/si haga falta"

patterns-established:
  - "Proyección por lista blanca campo a campo, nunca spread — mismo patrón que scripts/catalogue/fetch-marvelcdb.mjs, ahora también en engine/sync.ts para cualquier frontera futura hacia un servicio externo"
  - "Tipos del SDK externo por consulta typeof import('paquete').Tipo en vez de una declaración import/import type de nivel superior — permite auditar con grep que ninguna línea fuera de una función menciona el paquete, sin perder el tipado estricto"

requirements-completed: [SYNC-01, SYNC-02, SYNC-03, SYNC-05, SYNC-06, SYNC-09]

coverage:
  - id: D1
    description: "Cada partida registrada con éxito produce un setDoc a history/{id} con el id local como id de documento (SYNC-01)"
    requirement: "SYNC-01"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#con projectId configurado y una entrada pendiente, setDoc se llama una vez con la referencia history/<id>..."
        status: pass
    human_judgment: false
  - id: D2
    description: "La subida es dispara-y-olvida: record() nunca espera (await) a la subida a Firestore y sigue devolviendo su booleano de forma síncrona (SYNC-02)"
    requirement: "SYNC-02"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useGameHistory.test.ts#record() devuelve true, reload() deja una entrada..."
        status: pass
    human_judgment: false
  - id: D3
    description: "La marca tga:history:synced registra los ids ya subidos tras un setDoc resuelto, apartada de tga:history — la parte de SYNC-03 que entrega este plan (el listener online y el arrastre del atraso son el plan 10-03)"
    requirement: "SYNC-03"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#...y el id acaba en tga:history:synced"
        status: pass
    human_judgment: false
  - id: D4
    description: "El SDK de Firebase se carga solo por import() dinámico, nunca de forma estática, y con projectId vacío ninguno de los tres módulos llega a ejecutarse (SYNC-05, la parte de esta fase que este plan entrega — el gate de CI sobre el bundle real es el plan 10-04)"
    requirement: "SYNC-05"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#sin projectId, ninguno de los tres import() del SDK llega a ejecutarse..."
        status: pass
      - kind: other
        ref: "grep -v '^\\s*//' app/composables/useHistorySync.ts | grep -Ec \"^import .*'firebase\" → 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Auth anónima resuelta esperando una vez a onAuthStateChanged antes de decidir si hace falta signInAnonymously, evitando un uid duplicado por condición de carrera (SYNC-06)"
    requirement: "SYNC-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySync.test.ts#ensureAnonymousUser SÍ llama a signInAnonymously cuando onAuthStateChanged no entrega usuario, y NO cuando sí lo entrega"
        status: pass
    human_judgment: false
  - id: D6
    description: "Ninguna llamada a persistentLocalCache ni a enableIndexedDbPersistence — el caché de Firestore queda en memoria por defecto (SYNC-09)"
    requirement: "SYNC-09"
    verification:
      - kind: other
        ref: "grep -v '^\\s*//' app/composables/useHistorySync.ts | grep -Ec 'persistentLocalCache|enableIndexedDbPersistence' → 0"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-09-22
status: complete
---

# Phase 10 Plan 1: Rodaja trazadora de respaldo en Firestore Summary

**Una partida registrada localmente dispara, sin esperar nada, un `setDoc` a `history/{id}` en Firestore con auth anónima y SDK cargado solo por `import()` dinámico — inerte por completo sin `NUXT_PUBLIC_FIREBASE_PROJECT_ID`.**

## Performance

- **Duration:** 45 min (aprox., incluyendo los dos checkpoints humanos previos)
- **Started:** 2026-09-22T20:20:47Z (sesión de contexto de fase) — ejecución de Task 3 en esta continuación
- **Completed:** 2026-09-22
- **Tasks:** 3 (Task 1 checkpoint aprobado, Task 2 checkpoint confirmado, Task 3 tracer implementada y verificada)
- **Files modified:** 9 (4 nuevos, 5 modificados)

## Accomplishments

- `firebase@^12.19.0` instalado como dependencia real (`dependencies`, nunca `devDependencies`), tras verificación humana de legitimidad del paquete.
- `engine/sync.ts` nuevo: `buildSyncPayload`/`SYNC_PAYLOAD_FIELDS`, la proyección pura por lista blanca (D-09) que el plan 10-02 usará para comparar mecánicamente contra `firestore.rules`.
- `app/composables/useHistorySync.ts` nuevo: el único módulo de la app que habla con un servicio externo — guarda SSR, guarda de configuración (D-13), auth anónima sin doble alta (Pitfall 2 de RESEARCH.md), `setDoc` idempotente con el id local como id de documento (D-03/D-10).
- `tga:history:synced` nueva en `usePersistedSession.ts` (`loadSyncedIds`/`saveSyncedIds`), aparte del envoltorio de `tga:history` — nunca reescribe el camino que CR-01/CR-03 de la Fase 9 blindaron.
- `record()` en `useGameHistory.ts` engancha `flush()` tras un `appendHistoryEntry` con éxito (D-05/D-06), sin cambiar su firma síncrona ni el orden D-U4 de `onOutcomeRecorded`.
- Dos suites de test nuevas en verde (`engine/__tests__/sync.test.ts`, `app/composables/__tests__/useHistorySync.test.ts`), la suite completa (1107 tests) y el typecheck sin errores.

## Task Commits

Las Tasks 1 y 2 son checkpoints (`checkpoint:human-verify` / `checkpoint:decision`) sin cambios de fichero — no producen commit. La Task 3 (tracer completa) se commiteó como una unidad porque las cinco piezas (dependencia, config de runtime, proyección pura, costura de storage, módulo de red + enganche) forman una sola rodaja end-to-end verificable:

1. **Task 1: Verificación humana de legitimidad de `firebase`** — sin commit (checkpoint aprobado)
2. **Task 2: Puerta de un solo sentido (D-03/D-10)** — sin commit (checkpoint confirmado)
3. **Task 3: Rodaja de extremo a extremo** - `29e8468` (feat)

**Plan metadata:** (este commit, ver más abajo)

## Files Created/Modified

- `engine/sync.ts` — proyección pura `buildSyncPayload`/`SYNC_PAYLOAD_FIELDS` (D-09)
- `engine/__tests__/sync.test.ts` — cobertura de la lista blanca
- `app/composables/useHistorySync.ts` — módulo de red: `flush()`, `syncPending()`, `ensureAnonymousUser()`
- `app/composables/__tests__/useHistorySync.test.ts` — prueba de extremo a extremo con el SDK doblado
- `app/composables/usePersistedSession.ts` — nueva clave `tga:history:synced` + `loadSyncedIds`/`saveSyncedIds`
- `app/composables/useGameHistory.ts` — `record()` engancha `useHistorySync().flush()`
- `nuxt.config.ts` — sección `runtimeConfig.public` nueva con las cuatro claves de Firebase
- `package.json` / `package-lock.json` — dependencia `firebase@^12.19.0`

## Decisions Made

- **Aprobación de `firebase@^12.19.0`** (Task 1): veredicto `SUS`/`too-new` del gate de legitimidad, interpretado y aprobado por el usuario como falso positivo esperado de un SDK first-party de alta cadencia de releases (repo oficial `github.com/firebase/firebase-js-sdk` confirmado, sin `postinstall`, 7,4M descargas/semana).
- **Confirmación de D-03 + D-10** (Task 2): el id local del histórico ES el id del documento de Firestore, en una colección plana `history/{id}` con `uid` como campo — ambas puertas de un solo sentido, confirmadas explícitamente antes de escribir la Task 3.
- **Fusión (unión) de ids sincronizados**: `syncPending` combina los ids recién subidos con los que ya trae `loadSyncedIds()` antes de escribir, en vez de sobrescribir con solo el lote de la pasada actual — evita perder marcas de subidas anteriores. La poda perezosa de D-04 (retirar de la lista los ids que ya no estén en `tga:history`) se deja fuera de este plan a propósito: no la pide la Task 3 ni los `must_haves` de `10-CONTEXT.md`.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito.

## Issues Encountered

- Al escribir el test de auth anónima, el primer doble de `onAuthStateChanged` invocaba su callback de forma SÍNCRONA (antes de que `unsubscribe` terminara de asignarse dentro de `ensureAnonymousUser`), lo que producía un `ReferenceError` de zona muerta temporal capturado en silencio por el `catch` de dispara-y-olvida — el síntoma era que `setDoc` nunca llegaba a llamarse, sin ningún error visible. La causa no era un bug en el código de producción (el patrón `const unsubscribe = onAuthStateChanged(...)` es exactamente el que `10-RESEARCH.md` documenta como correcto, y Firebase real invoca `onAuthStateChanged` siempre de forma asíncrona, incluso con una sesión ya restaurada) sino un doble de prueba poco realista. Se corrigió el mock (`queueMicrotask`) para reproducir el comportamiento asíncrono real del SDK, sin tocar `useHistorySync.ts`.

## User Setup Required

None - no se requiere configuración de servicio externo en este plan. La configuración real de un proyecto Firebase (variables `NUXT_PUBLIC_FIREBASE_*`, despliegue de `firestore.rules`) es explícitamente del plan 10-02 (`user_setup` declarado ahí).

## Next Phase Readiness

- Listo para los planes **10-02** (reglas de Firestore + config real) y **10-03** (listener `online` + arrastre del atraso), ambos de la ola 2 y dependientes solo de este plan — pueden ejecutarse en paralelo.
- `SYNC_PAYLOAD_FIELDS` queda exportado y estable para que 10-02 compare mecánicamente la lista blanca contra `firestore.rules` (`hasOnly()`).
- Sin bloqueos: la guarda de configuración (D-13) deja la app 100% inerte respecto a Firebase mientras no exista un proyecto real configurado, así que ni `npm run dev` ni el resto de la fase 10 sin terminar afectan al resto de la app.

## Self-Check: PASSED

- `engine/sync.ts` — FOUND
- `engine/__tests__/sync.test.ts` — FOUND
- `app/composables/useHistorySync.ts` — FOUND
- `app/composables/__tests__/useHistorySync.test.ts` — FOUND
- Commit `29e8468` — FOUND en `git log --oneline`
- `npx vitest run` — 1107/1107 tests en verde
- `npm run typecheck` — sin errores
- Los 10 criterios de aceptación de la Task 3 (greps + tests) — todos PASS, ver comandos ejecutados en la sesión

---
*Phase: 10-respaldo-en-firestore*
*Completed: 2026-09-22*
