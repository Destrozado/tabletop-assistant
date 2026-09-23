---
phase: 10-respaldo-en-firestore
verified: 2026-09-23T02:49:54Z
status: passed
score: 12/12 must-haves verified
covered_files: [".env.example", ".firebaserc", ".planning/REQUIREMENTS.md", ".planning/phases/10-respaldo-en-firestore/10-01-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-01-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-02-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-02-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-03-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-03-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-04-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-04-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-CONTEXT.md", ".planning/phases/10-respaldo-en-firestore/10-REVIEW.md", ".planning/quick/260923-3rj-wr-02-fase-10-planning-todos-pending-wr-02-sin-timeout-en-ll/260923-3rj-SUMMARY.md", ".planning/quick/260923-3rk-wr-03-planning-todos-pending-wr-03-workbox-precachea-el-sdk/260923-3rk-SUMMARY.md", "app/composables/__tests__/useHistorySync.test.ts", "app/composables/__tests__/usePersistedSession.test.ts", "app/composables/useGameHistory.ts", "app/composables/useHistorySync.ts", "app/composables/usePersistedSession.ts", "e2e/bundle-budget.spec.ts", "e2e/firestore-rules-contract.spec.ts", "e2e/offline-flow.spec.ts", "e2e/update-banner.spec.ts", "engine/__tests__/sync.test.ts", "engine/sync.ts", "firebase.json", "firestore.rules", "nuxt.config.ts", "package.json", "scripts/pwa/__tests__/firebase-sdk-precache.test.ts", "scripts/pwa/firebase-sdk-precache.ts"]
covered_digest: "v1:sha256:474c263e046596b2ddf2fcfad89a473dd5e3d562c6f3665642d4124fd17312a9"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 12/12
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 10: Respaldo en Firestore — Verification Report (ronda 3)

**Phase Goal:** Cada partida registrada se respalda en Firestore de forma silenciosa y nunca bloqueante, con autenticación anónima y reglas de seguridad que solo permiten crear registros con forma válida — y si Firestore falla por cualquier motivo (cuota, reglas, red, proyecto caído), jugar, registrar el resultado localmente y ver las estadísticas siguen funcionando exactamente igual. Estrictamente la última fase del hito, aislada a propósito.

**Verified:** 2026-09-23T02:49:54Z
**Status:** passed
**Re-verification:** Sí — la corrida anterior (`verified: 2026-09-23T00:30:33Z`, passed 12/12, digest re-sellado sobre HEAD `0b3d3d3`) quedó obsoleta porque el batch `260923-3rh` (commits `411cb73`…`09560e0`, HEAD actual) tocó varios de los ficheros que ese digest cubría: `app/composables/useHistorySync.ts` (WR-02, quick `260923-3rj`), `nuxt.config.ts` + `scripts/pwa/firebase-sdk-precache.ts` (WR-03, quick `260923-3rk`, ficheros nuevos), y `app/composables/usePersistedSession.ts` (quicks `260923-3rl`/`260923-3rm`, deuda de la Fase 9 — `HISTORY_MAX_ENTRIES`, `crypto.randomUUID`, `readHistoryState`/`interpretHistoryRaw`). Ninguno de estos cambios pertenece a un plan de la Fase 10: son quicks posteriores al cierre de fase que tocan ficheros que la Fase 10 sí posee o de los que depende.

## Qué se pidió comprobar en esta ronda y qué se encontró

### 1. Entradas de histórico podadas por `HISTORY_MAX_ENTRIES` vs `tga:history:synced`

`appendHistoryEntry` (quick `260923-3rl`) corta el envoltorio a `HISTORY_MAX_ENTRIES = 500` tras anteponer la entrada nueva — la más antigua sale del disco. `syncPending` (`useHistorySync.ts`) sigue leyendo con `readHistory()` (WR-01 intacto) y filtrando `tga:history:synced` a solo los ids presentes en `currentHistoryRead.entries` cuando `kind === 'ok'`. Esta poda no distingue POR QUÉ un id ya no está en el histórico (borrado manual en `/historico`, o expulsado por el tope de 500) — el test genérico `useHistorySync.test.ts` "un id marcado cuya entrada ya no está en tga:history desaparece de la lista tras el flush (D-04, poda perezosa)" cubre el mecanismo con independencia del motivo, así que una entrada expulsada por el tope se poda de `tga:history:synced` en el siguiente flush exactamente igual que una borrada a mano — sin caso especial, sin regresión. El riesgo aceptado de que una entrada muy antigua se pierda del respaldo si sale del tope antes de subirse ya estaba documentado y aceptado en la propia quick `260923-3rl` (T-3rl-03, `deferred-items.md` de la Fase 9) — no es una garantía nueva que la Fase 10 rompa, es una decisión de producto ya tomada fuera de esta fase.

### 2. El SDK ya no precacheado — `import()` necesita red — ¿la partida sigue sin bloquearse?

Confirmado por lectura de código Y por tests pre-existentes que la quick `260923-3rk` NO tocó:
- `flush()` es síncrona (`function flush(): void`), nunca hace `await` de `syncPending(...)` — es `void syncPending(...).catch(...).finally(...)`. Ningún resultado de `syncPending` (éxito, rechazo, timeout, o un `import()` que cuelga sin red porque el chunk ya no está en Cache Storage) puede retrasar el retorno de `flush()`, así que `record()`/`onOutcomeRecorded` nunca esperan a la red — esto es una garantía de tipos y de control de flujo, no un comportamiento que dependa de que el `catch` "atrape a tiempo".
- El test `'un import() que rechaza no lanza'` (`useHistorySync.test.ts`) simula exactamente el escenario que WR-03 introduce como nuevo riesgo real (el `import()` de `firebase/app` lanzando, como pasaría con un chunk no descargable sin red): `flush()` no lanza y `setDoc` nunca se llama.
- El test de humo `'SYNC-08 ... con los tres módulos del SDK doblados para que TODO lo que exponen rechace, record() sigue devolviendo true y no lanza'` confirma la cadena completa hasta `record()`.
- Ambos tests ya existían antes de esta ronda (planes 10-01/10-03) y siguen en verde sin haber sido tocados por `260923-3rk` — la quick que quitó el precacheo del SDK no debilitó ninguna de las dos pruebas que sostienen esta garantía.
- `nuxt.config.ts` documenta el propio riesgo por escrito junto al hook nuevo: "sin red, el SDK ya no está precacheado... `syncPending` ya captura ese fallo de `import()` y las partidas siguen pendientes, sin pérdida de datos" — consistente con lo verificado arriba.

Nota de honestidad (idéntica a la de la corrida anterior, sin cambios): `e2e/offline-flow.spec.ts` (test 5, SYNC-04/SYNC-08) no ejercita una escritura real a Firestore ni un `import()` real fallando sin red — en CI `NUXT_PUBLIC_FIREBASE_*` están vacías, así que la guarda D-13 corta `flush()` en no-op antes de llegar a ningún `import()`. Esto ya estaba así antes de `260923-3rk` y sigue igual; la garantía de "nunca bloquea" para el camino con SDK real se sostiene en los tests unitarios citados arriba (SDK doblado, no en un e2e con Firebase real), exactamente el mismo nivel de evidencia que la corrida anterior aceptó como VERIFIED.

### 3. Un timeout NUNCA marca una entrada como sincronizada

Confirmado por lectura de `useHistorySync.ts`: dentro del bucle de `syncPending`, `uploadedIds.push(payload.id)` solo ocurre tras un `await withTimeout(setDoc(...), ...)` que resuelve — si `err instanceof SyncTimeoutError`, el `catch` hace `break` ANTES de llegar a ese `push`, así que el id nunca entra en `uploadedIds` ni, por tanto, en el merge que `saveSyncedIds` escribe. Tests `WR-02/1` y `WR-02/5` (`useHistorySync.test.ts`) ejercitan exactamente esto con temporizadores falsos: un `setDoc` que nunca resuelve vence el plazo, el id no aparece en `tga:history:synced`, y un `online` posterior vuelve a intentar la subida real.

### 4. Bookkeeping D-02/D-03/D-04 (ids sincronizados) y guarda del camino de actualización

- D-02 (listener `online`, disparador único junto a `record()`): sin cambios de código en esta zona; el listener sigue registrándose una sola vez por página (`onlineListenerRegistered`).
- D-03 (reintento inocuo ante `permission-denied`/`unavailable`): sin cambios; el comentario del `catch` documenta ahora explícitamente que un timeout WR-02 se trata igual que esos dos códigos salvo por el `break` (que es una optimización de la MISMA vuelta, no un cambio de tratamiento del id).
- D-04 (poda perezosa con `readHistory`, nunca `loadHistory`): intacto, WR-01 sigue vigente y su test de regresión sigue en verde (visto en la corrida anterior, reconfirmado aquí por la ejecución completa de la suite).
- COMP-03 (guarda de actualización PWA): `nuxt.config.ts` sigue con `registerType: 'prompt'` (una sola declaración, valor exacto verificado por regex) y `e2e/update-banner.spec.ts` (sin cambios de código, confirmado por `git diff --stat` vacío) sigue comprobando ese valor además de las cuatro reglas de `routeRules` y las cuatro rutas prerenderizadas — el hook nuevo `pwa:beforeBuildServiceWorker` no toca ninguna de esas superficies.

## Evidencia verificada de forma independiente en esta ronda

- `git rev-parse HEAD` → `09560e0a1b903db71f283be54a0aba74944a9fdd`; `git status --short` sin cambios de código pendientes (solo `.gsd/` no versionado).
- `git diff --stat 633ef20..09560e0 -- firestore.rules engine/sync.ts .firebaserc .env.example firebase.json package.json e2e/update-banner.spec.ts e2e/firestore-rules-contract.spec.ts` → sin salida: ninguno de estos ficheros cambió desde el digest sellado más antiguo de esta fase.
- Lectura línea a línea de `app/composables/useHistorySync.ts` completo (391 líneas): confirma `withTimeout` envolviendo las cuatro esperas de red, `break` en el `catch` de `setDoc` solo para `SyncTimeoutError`, y el prune condicional `readHistory().kind === 'ok'` (WR-01) sin alterar.
- Lectura línea a línea de `app/composables/usePersistedSession.ts` completo (779 líneas): confirma que `readHistory()` sigue siendo un envoltorio de `readHistoryState()`/`interpretHistoryRaw()` que colapsa a `{kind:'ok', entries}` / `{kind:'unreadable'}` — el contrato que `useHistorySync.ts` consume no cambió pese al refactor interno (WR-02 de la quick `260923-3rm`); confirma `HISTORY_MAX_ENTRIES = 500` y el filtrado/tope en `appendHistoryEntry`.
- Lectura completa de `nuxt.config.ts` y de `scripts/pwa/firebase-sdk-precache.ts`: el hook `pwa:beforeBuildServiceWorker` amplía `globIgnores` en tiempo de build por marca de contenido (`@firebase/`), con dos guardas que lanzan (integridad + HTML) en vez de degradar en silencio; `registerType: 'prompt'` y las cuatro `routeRules` de caché siguen presentes.
- Lectura completa de `e2e/bundle-budget.spec.ts` y de `e2e/offline-flow.spec.ts`: el gate D-16/SYNC-05 y su oráculo independiente WR-03 (sobre `sw.js` real) siguen midiendo lo que decían medir; el test 5 de `offline-flow.spec.ts` (fin de partida sin red) documenta honestamente sus límites (sin Firebase real en CI) sin haber cambiado desde la corrida anterior.
- `npx vitest run app/composables/__tests__/useHistorySync.test.ts app/composables/__tests__/usePersistedSession.test.ts` ejecutado de forma independiente en esta sesión: **115/115 en verde**.
- `npx vitest run scripts/pwa/__tests__/firebase-sdk-precache.test.ts` ejecutado de forma independiente: **22/22 en verde**.
- `npx vitest run` (suite completa) ejecutado de forma independiente en esta sesión: **40 ficheros, 1284/1284 tests en verde** — coincide con lo que reportó el orquestador.
- `npm run typecheck` ejecutado de forma independiente: **exit 0**, sin salida.
- `grep` sobre `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`: la lista auditada de estado de módulo sigue siendo exactamente `useHistorySavedNotice.ts` + `useProgressMismatchMark.ts` — el estado de módulo propio de `useHistorySync.ts` (documentado en su propia cabecera como "TERCERA excepción", pero de un patrón distinto al que audita este gate) no es nuevo de esta ronda y ya pasaba antes.
- `.planning/todos/pending/` confirmado sin `wr-02-*` ni `wr-03-*`; ambos presentes en `.planning/todos/completed/` con `resolved_by` apuntando a `260923-3rj`/`260923-3rk`.
- No se ha ejecutado Playwright en esta ronda (instrucción explícita — otro verificador corre en paralelo sobre el mismo puerto); se toma como hecho establecido la evidencia ya aportada por el coordinador (`CI=1 npx playwright test` → 47 passed, incluye el oráculo de presupuesto de bundle WR-03, la guarda de `update-banner` COMP-03, y el flujo offline) — coherente con la lectura estática de esos mismos specs hecha en esta ronda.

## Goal Achievement

### Observable Truths (Success Criteria del ROADMAP + must_haves de los 4 planes)

| # | Truth | Status | Evidencia |
|---|-------|--------|-----------|
| 1 | SC1: Cada partida registrada se intenta subir «dispara y olvida» — `record()` nunca hace `await` de la escritura | ✓ VERIFIED | `useGameHistory.ts:299` `if (recorded) flush()` sin `await`; `flush()` síncrona, `void syncPending(...).catch().finally()`. Sin cambios de fondo en este batch |
| 2 | SC1: Con wifi apagada, registrar resultado, listar histórico y ver estadísticas funcionan igual, sin bloqueo visible | ✓ VERIFIED | `e2e/offline-flow.spec.ts` test 5 sin cambios de código; hecho establecido: 47/47 Playwright en HEAD `09560e0` (incluye este spec) |
| 3 | SC2/D-01: Cada registro lleva marca de sincronizado propia en `localStorage` (`tga:history:synced`), aparte de `tga:history` | ✓ VERIFIED | `usePersistedSession.ts` sigue declarando `SYNCED_KEY`, `loadSyncedIds`/`saveSyncedIds` sin cambios de contrato pese al refactor interno de `readHistoryState`/`interpretHistoryRaw` |
| 4 | SC2/SYNC-09: No se activa la persistencia IndexedDB integrada de Firestore | ✓ VERIFIED | `grep -c 'persistentLocalCache\|enableIndexedDbPersistence' useHistorySync.ts` → 0 |
| 5 | SC2/D-02/D-04/D-08: Los pendientes se reintentan cuando vuelve la red, el atraso completo se sube sin tope, y la poda perezosa de marcas NUNCA vacía la lista entera por una lectura transitoriamente ilegible, ni por una entrada expulsada del histórico por el tope de 500 (IN-04) | ✓ VERIFIED | WR-01 intacto (test de regresión nombrado, re-ejecutado en esta ronda). La interacción con `HISTORY_MAX_ENTRIES` (quick `260923-3rl`) se cubre por el mismo mecanismo genérico de poda por ausencia en `tga:history`, ejercitado por el test "un id marcado cuya entrada ya no está en tga:history desaparece de la lista tras el flush" — no distingue el motivo de la ausencia, así que cubre también la expulsión por tope sin caso especial |
| 6 | SC2/WR-02: Ninguna espera de red (import() del SDK, auth, `signInAnonymously`, `setDoc`) puede dejar `flushInFlight` enclavado para siempre; un timeout NUNCA marca una entrada como sincronizada | ✓ VERIFIED (nuevo en este batch, quick `260923-3rj`) | Las cuatro esperas envueltas en `withTimeout`/`Promise.race` (`SYNC_NETWORK_TIMEOUT_MS = 15_000`); `uploadedIds.push` ocurre estrictamente DESPUÉS de que `setDoc` resuelva, así que un `SyncTimeoutError` (que hace `break` antes de ese `push`) nunca añade el id. Tests `WR-02/1`…`WR-02/6` (25 tests del describe WR-02) re-ejecutados en esta ronda dentro de la corrida completa (1284/1284) |
| 7 | SC3/D-16/SYNC-05: El SDK de Firebase se carga diferido y solo en cliente — no participa del arranque, del prerender ni del primer pintado, y ya NO se precachea con Workbox (WR-03) sin que eso pueda bloquear el fin de partida sin red | ✓ VERIFIED | `nuxt.config.ts` sin importaciones estáticas del SDK; `e2e/bundle-budget.spec.ts` (gate D-16/SYNC-05 + oráculo independiente WR-03 sobre `sw.js`) leído completo, coherente con lo medido; la garantía de "nunca bloquea" se sostiene en los tests unitarios de la truth #6 y en la sincronía de `flush()` (control de flujo, no solo manejo de errores) |
| 8 | SC4/SYNC-06: La escritura usa autenticación anónima, sin cuentas de usuario | ✓ VERIFIED | `ensureAnonymousUser()` sin cambios de fondo (solo envuelta en `withTimeout`); proveedor Anónimo confirmado habilitado (revisión humana ya aprobada, hecho heredado) |
| 9 | SC4/SYNC-07/D-11/D-12: Las reglas desplegadas permiten `create` con forma validada, y NUNCA leer/actualizar/borrar los de otros | ✓ VERIFIED | `firestore.rules` fuera de todo diff desde `633ef20`; revisión humana bloqueante ya aprobada, no re-ejecutada por instrucción explícita (hecho heredado) |
| 10 | SC4/D-09: La lista blanca de las reglas y la de la proyección del cliente no pueden divergir en silencio | ✓ VERIFIED | `e2e/firestore-rules-contract.spec.ts` y `engine/sync.ts` fuera de todo diff desde `633ef20` |
| 11 | SC5/SYNC-08: Un fallo de Firestore (cuota, reglas, red, proyecto caído, o ahora también un `import()` sin red por falta de precacheo) nunca impide jugar, registrar localmente ni ver estadísticas | ✓ VERIFIED | El `catch` externo de `flush()`/`syncPending` sigue sin relanzar nada; ningún camino nuevo (timeout, prune condicional, exclusión de precacheo) introduce un `throw` no capturado — confirmado por lectura completa del fichero y por el test de humo SYNC-08 |
| 12 | SC5/COMP-03: Una PWA ya instalada recibe la actualización por el camino existente (`registerType: 'prompt'`), sin recarga forzada, incluso con el hook nuevo `pwa:beforeBuildServiceWorker` | ✓ VERIFIED | `registerType: 'prompt'` una sola declaración (regex), `e2e/update-banner.spec.ts` sin cambios de código, gate re-ejecutado por el orquestador (47/47 Playwright) |

**Score:** 12/12 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/composables/useHistorySync.ts` | Timeout en las 4 esperas de red (WR-02), `break` solo ante `SyncTimeoutError`, prune condicional WR-01 intacto | ✓ VERIFIED | Leído completo; confirmado por lectura directa, no solo por el SUMMARY |
| `app/composables/usePersistedSession.ts` | `readHistory()` sigue devolviendo el contrato `HistoryRead` sin cambios pese al refactor `readHistoryState`/`interpretHistoryRaw`; `HISTORY_MAX_ENTRIES` presente | ✓ VERIFIED | Leído completo; el contrato de `useHistorySync.ts` no se ve afectado |
| `nuxt.config.ts` | Hook `pwa:beforeBuildServiceWorker` nuevo, `registerType: 'prompt'` intacto, sin importaciones estáticas de Firebase | ✓ VERIFIED | Leído completo |
| `scripts/pwa/firebase-sdk-precache.ts` (nuevo) | Exclusión por marca de contenido `@firebase/`, cierre de fachadas, dos guardas con `throw` | ✓ VERIFIED | Leído completo; 22/22 tests unitarios propios en verde, re-ejecutados en esta ronda |
| `e2e/bundle-budget.spec.ts` | Gate D-16/SYNC-05 + oráculo independiente WR-03 sobre `sw.js` | ✓ VERIFIED | Leído completo; no ejecutado en esta ronda (Playwright reservado al otro verificador), hecho establecido por el orquestador |
| Resto (`engine/sync.ts`, `firestore.rules`, `.firebaserc`, `.env.example`, `firebase.json`, `package.json`, `e2e/firestore-rules-contract.spec.ts`, `e2e/update-banner.spec.ts`) | Sin cambios desde el digest sellado más antiguo (`633ef20`) | ✓ VERIFIED (por diff vacío, confirmado con `git diff --stat`) | — |

### Key Link Verification

Sin cambios estructurales respecto a la corrida anterior: `record()→flush()→syncPending()→buildSyncPayload()→setDoc` sigue siendo la misma cadena; lo nuevo es que cada tramo de red dentro de `syncPending` pasa ahora por `withTimeout` (mismo punto de enganche, plazo añadido) y que el `import()` dinámico ya no tiene garantía de estar precacheado (mismo enlace lógico, distinta garantía de red subyacente, sin cambio de forma).

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| SYNC-01 | 10-01 | Cada partida se sube a Firestore como respaldo | ✓ SATISFIED | truth #1 |
| SYNC-02 | 10-01 | Subida dispara-y-olvida, sin `await` | ✓ SATISFIED | truth #1 |
| SYNC-03 | 10-01, 10-03 | Marca de sincronizado + reintento con red | ✓ SATISFIED | truth #3, #5, #6 (reforzado por WR-02) |
| SYNC-04 | 10-04 | Sin conexión, todo funciona igual | ✓ SATISFIED | truth #2 |
| SYNC-05 | 10-01, 10-04 | SDK diferido, solo cliente | ✓ SATISFIED | truth #7 (reforzado por WR-03: ya no precacheado, y confirmado que eso no rompe SYNC-08) |
| SYNC-06 | 10-01, 10-02 | Autenticación anónima | ✓ SATISFIED | truth #8 |
| SYNC-07 | 10-02 | Reglas create-only con forma validada | ✓ SATISFIED | truth #9, #10 |
| SYNC-08 | 10-03, 10-04 | Fallo de Firestore nunca bloquea | ✓ SATISFIED | truth #11 (reforzado por WR-02/WR-03) |
| SYNC-09 | 10-01, 10-03 | Sin persistencia IndexedDB integrada | ✓ SATISFIED | truth #4 |
| COMP-03 | 10-04 | Camino de actualización PWA intacto | ✓ SATISFIED | truth #12 |

Los diez IDs siguen coincidiendo exactamente con los diez marcados `[x]` para la Fase 10 en `REQUIREMENTS.md` (líneas 267-283). Sin requisitos huérfanos.

### Anti-Patterns Found

| Archivo | Línea | Patrón | Severidad | Impacto |
|---|---|---|---|---|
| `app/composables/useHistorySync.ts` | 165-183, 244 | ~~WR-01: poda perezosa puede vaciar `tga:history:synced` entero ante un fallo transitorio~~ | ✅ RESUELTO (ronda anterior, `0b3d3d3`) | Sigue resuelto; sin regresión en este batch |
| `app/composables/useHistorySync.ts` | 67-102, 138-286 | ~~WR-02: sin timeout en `setDoc`/`signInAnonymously`~~ | ✅ **RESUELTO en este batch** (`260923-3rj`) | `SYNC_NETWORK_TIMEOUT_MS`/`withTimeout` en las cuatro esperas de red; 25 tests del describe WR-02 en verde; todo movido a `.planning/todos/completed/` |
| `nuxt.config.ts` | 171-260 | ~~WR-03: `workbox.globPatterns` precachea los chunks diferidos del SDK de Firebase~~ | ✅ **RESUELTO en este batch** (`260923-3rk`) | Hook `pwa:beforeBuildServiceWorker` + `scripts/pwa/firebase-sdk-precache.ts`, dos guardas con `throw`, oráculo independiente en `e2e/bundle-budget.spec.ts`; todo movido a `.planning/todos/completed/` |
| `firestore.rules` | 52-93 | IN-01/IN-02: falta `id == docId` explícito y `request.auth != null` explícito (ambos cubiertos implícitamente hoy) | ℹ️ Info | Sin brecha activa, sin cambios en este batch |

No quedan hallazgos WR abiertos sobre la Fase 10. Los dos únicos que seguían pendientes tras la corrida anterior (WR-02, WR-03) se cierran en este mismo batch de quicks, con test de regresión propio para cada uno.

### Human Verification

Sin cambios respecto a la corrida anterior. Las dos verificaciones humanas exigidas por el ROADMAP siguen completas:

- **(a)** Automatizada vía `e2e/offline-flow.spec.ts` — en CI, hecho establecido (47/47 Playwright).
- **(b)** Revisión manual de las reglas REALMENTE desplegadas — aprobada por el usuario antes de la primera escritura real (`10-02-SUMMARY.md`), sin cambios en `firestore.rules` desde entonces.

No quedan items de verificación humana pendientes para esta fase.

### Gaps Summary

Ninguno. Los 12 truths del ROADMAP/planes de la Fase 10 siguen verificados tras el batch `260923-3rh` (commits `411cb73`…`09560e0`). Los dos hallazgos WR abiertos que la corrida anterior dejaba documentados como deuda no bloqueante (WR-02, WR-03) se cierran en este mismo batch con test de regresión propio, y la interacción de esos cierres con el resto del sistema (poda de `tga:history:synced` frente al tope de 500 de `HISTORY_MAX_ENTRIES`, y la garantía de "nunca bloquea" ahora que el SDK ya no se precachea) se comprobó explícitamente y no introduce ninguna regresión: `record()`/`flush()` siguen síncronas y no bloqueantes por construcción de tipos (no solo por manejo de errores), un timeout nunca marca una entrada como sincronizada, y el contrato de `readHistory()` que `useHistorySync.ts` consume no cambió pese al refactor interno de `usePersistedSession.ts`. 115/115 tests de los dos ficheros de composable, 22/22 del helper de precacheo, y 1284/1284 de la suite completa re-ejecutados de forma independiente en esta ronda; `typecheck` limpio.

---

## Corridas anteriores (preservadas para historial)

### Ronda 2 — 2026-09-23T00:30:33Z (passed 12/12, digest re-sellado sobre HEAD `0b3d3d3`)

**Qué cambió:** commit `0b3d3d3` cerró WR-01 (poda perezosa vaciando `tga:history:synced` ante lectura ilegible transitoria) con `readHistory()`/`HistoryRead` aditivos en `usePersistedSession.ts` y `syncPending` consumiéndolo en vez de `loadHistory()`.

**Evidencia clave de esa ronda:** `npx vitest run` de los dos ficheros afectados → 81/81; test nombrado de WR-01 aislado → 1/1; `typecheck` limpio; mutación confirmada por el orquestador (revertir el bloque de poda reproduce el fallo exacto de WR-01).

**Nota de re-sellado de esa ronda:** el informe había quedado marcado `stale` sin deriva real de código — el único delta hasta el árbol de esa ronda era el volteo contable de `REQUIREMENTS.md` (`Pendiente`→`Satisfecho`), cero cambios en código/tests/reglas/config. Decisión tomada por el usuario en sesión de UAT (17/17, 0 incidencias).

### Ronda 1 — 2026-09-22T23:43:13Z (passed 12/12, corrida original tras el cierre de los 4 planes de fase)

Verificación inicial de los 4 planes (10-01 a 10-04): rodaja trazadora, reglas `create`-only + revisión humana, cola de pendientes con listener `online` y poda perezosa (D-04), y los tres gates permanentes (presupuesto de bundle D-16/SYNC-05, e2e offline de fin de partida, guarda de regresión COMP-03). 12/12 truths verificados, 0 gaps.

---

_Verified: 2026-09-23T02:49:54Z_
_Verifier: Claude (gsd-verifier)_
