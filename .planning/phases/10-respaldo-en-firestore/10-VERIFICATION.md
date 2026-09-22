---
phase: 10-respaldo-en-firestore
verified: 2026-09-22T23:43:13Z
status: passed
score: 12/12 must-haves verified
covered_files: [".env.example", ".firebaserc", ".planning/REQUIREMENTS.md", ".planning/phases/10-respaldo-en-firestore/10-01-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-01-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-02-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-02-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-03-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-03-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-04-PLAN.md", ".planning/phases/10-respaldo-en-firestore/10-04-SUMMARY.md", ".planning/phases/10-respaldo-en-firestore/10-CONTEXT.md", ".planning/phases/10-respaldo-en-firestore/10-REVIEW.md", "app/composables/__tests__/useHistorySync.test.ts", "app/composables/__tests__/usePersistedSession.test.ts", "app/composables/useGameHistory.ts", "app/composables/useHistorySync.ts", "app/composables/usePersistedSession.ts", "e2e/bundle-budget.spec.ts", "e2e/firestore-rules-contract.spec.ts", "e2e/offline-flow.spec.ts", "e2e/update-banner.spec.ts", "engine/__tests__/sync.test.ts", "engine/sync.ts", "firebase.json", "firestore.rules", "nuxt.config.ts", "package.json"]
covered_digest: "v1:sha256:0316686d49114a91eae42962269302ecc699e145ec736acf35cc1cab55082f92"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 12/12
  gaps_closed:
    - "WR-01 (10-REVIEW.md, warning no bloqueante sobre SC2/D-04): la poda perezosa de tga:history:synced ya no puede vaciar la lista entera ante una lectura ilegible transitoria de tga:history durante el recálculo final de syncPending. No era un must-have FALLIDO en la corrida anterior (12/12 ya entonces), sino una debilidad de robustez documentada; queda cerrada por el commit 0b3d3d3."
  gaps_remaining: []
  regressions: []
---

# Phase 10: Respaldo en Firestore — Verification Report

**Phase Goal:** Cada partida registrada se respalda en Firestore de forma silenciosa y nunca bloqueante, con autenticación anónima y reglas de seguridad que solo permiten crear registros con forma válida — y si Firestore falla por cualquier motivo (cuota, reglas, red, proyecto caído), jugar, registrar el resultado localmente y ver las estadísticas siguen funcionando exactamente igual. Estrictamente la última fase del hito, aislada a propósito.

**Verified:** 2026-09-22T23:43:13Z
**Status:** passed
**Re-verification:** Sí — la corrida anterior (`verified: 2026-09-23T01:35:00Z`, passed 12/12) quedó obsoleta porque el commit `0b3d3d3` (`fix(10): WR-01 - la poda de D-04 ya no vacía tga:history:synced ante lectura ilegible`) aterrizó después, tocando tres de los ficheros cubiertos (`app/composables/usePersistedSession.ts`, `app/composables/useHistorySync.ts`, `app/composables/__tests__/useHistorySync.test.ts`). No hay ningún otro cambio en el árbol desde esa corrida: HEAD es exactamente `0b3d3d3`, un commit por encima del que se verificó entonces.

## Qué cambió desde la corrida anterior y por qué se repite

El commit `0b3d3d3` cierra el hallazgo **WR-01** de `10-REVIEW.md` (una debilidad de robustez sobre SC2/D-04, ya documentada como *warning* no bloqueante en el informe anterior, no como must-have fallido): `syncPending` recalculaba las ids del histórico con `loadHistory()`, que colapsa deliberadamente `'unreadable'` y `'empty'` en el mismo `[]` de cara a pantalla; si esa lectura fallaba justo en el recálculo final de la poda (D-04), la poda vaciaba TODA la lista de marcas ya subidas, no solo la entrada en curso, y el efecto no se autocorregía (D-03 rechaza el reintento para siempre).

El arreglo añade `readHistory()` en `usePersistedSession.ts` (mismo precedente discriminado que `readProgress`/`ProgressRead`) y hace que `syncPending` lo use en vez de `loadHistory()`: el merge de marcas se calcula y escribe siempre; solo el filtrado por poda queda condicionado a que la lectura sea de fiar (`kind === 'ok'`). El contrato público de `loadHistory()` (colapsar a `[]` de cara a pantalla) queda intacto — sigue siendo un envoltorio de `readHistory()`.

Esta corrida re-confirma el must-have que WR-01 debilitaba (truth #5, ligada a SYNC-03/D-04) y comprueba explícitamente que el arreglo no debilitó nada de lo ya verificado: que `syncPending` sigue sin lanzar nunca, que `record()`/`flush()` siguen síncronas y no bloqueantes, que el contrato de `loadHistory()` de cara a pantalla sigue sin cambios, y que la propiedad de frescura de D-04 (releer al FINAL del flush, no la copia capturada al principio) se mantiene — ahora a través de `readHistory()` en vez de `loadHistory()`.

## Evidencia verificada de forma independiente en esta corrida (no solo por los hechos establecidos)

- `git rev-parse HEAD` → `0b3d3d347aa2c0376503601cd0f95638f0762412`; `git status --short` sin cambios de código pendientes (solo artefactos de planning no versionados).
- `git show 0b3d3d3` leído íntegro: el diff coincide exactamente con lo descrito en `<why_this_rerun>` — 3 ficheros, `HistoryRead`/`readHistory()` aditivos, `loadHistory()` reescrito como envoltorio de `readHistory()` sin cambiar su tipo de retorno ni su colapso a `[]`.
- `grep -rn "loadHistory\b"` en `app/`/`engine/` confirma que `useGameHistory.ts` (la única pantalla que consume el histórico) sigue llamando a `loadHistory()`, no a `readHistory()` — el contrato de pantalla no cambió de llamador.
- Lectura directa de `useHistorySync.ts`: `flush()` sigue declarada `function flush(): void`, con la guarda `flushInFlight` intacta y `void syncPending(...).catch(...)` sin `await`; `readHistory` se pasa a `syncPending` y se invoca DENTRO de `syncPending` (tras el `Promise.all` de imports SDK + auth), es decir, al final del recorrido — la misma frescura de D-04 que antes, solo que ahora con un lector que distingue `'unreadable'`.
- `app/composables/useGameHistory.ts:299`: `if (recorded) flush()` — sin `await`, confirmando SYNC-02.
- `npx vitest run app/composables/__tests__/useHistorySync.test.ts app/composables/__tests__/usePersistedSession.test.ts` ejecutado de forma independiente en esta sesión: **81/81 en verde** (18 tests de `useHistorySync` + el nuevo de WR-01 + los de `usePersistedSession`).
- `npx vitest run ... -t "WR-01"` ejecutado de forma aislada: el test de regresión nombrado por el commit pasa (1 passed, 18 skipped por el filtro `-t`).
- `npm run typecheck` ejecutado de forma independiente: limpio, sin errores.
- No se ha vuelto a ejecutar la suite completa de Vitest ni Playwright en esta corrida (evitando repetir un full-run innecesario); se toman como hecho establecido los recuentos del orquestador (1129/1129 Vitest, 41/41 Playwright, build exit 0) porque el propio orquestador ya declaró haber hecho el chequeo de mutación (revertir el bloque de poda hace fallar el nuevo test con el mensaje exacto de WR-01, y restauró el fichero byte-a-byte after) — ese es precisamente el tipo de evidencia que este verificador exige para un truth de comportamiento (Step 7b), y aquí ya viene aportada y descrita con precisión suficiente para no re-derivarla.

## Goal Achievement

### Observable Truths (Success Criteria del ROADMAP + must_haves de los 4 planes)

| # | Truth | Status | Evidencia |
|---|-------|--------|-----------|
| 1 | SC1: Cada partida registrada se intenta subir «dispara y olvida» — `record()` nunca hace `await` de la escritura | ✓ VERIFIED | `useGameHistory.ts:299` `if (recorded) flush()` sin `await`; `flush()` síncrona, `void syncPending(...).catch().finally()`. Sin cambios desde la corrida anterior — confirmado de nuevo por lectura directa |
| 2 | SC1: Con wifi apagada, registrar resultado, listar histórico y ver estadísticas funcionan igual, sin bloqueo visible | ✓ VERIFIED | `e2e/offline-flow.spec.ts` (5º test) sin cambios en este commit; hecho establecido: 41/41 Playwright en HEAD `0b3d3d3` |
| 3 | SC2/D-01: Cada registro lleva marca de sincronizado propia en `localStorage` (`tga:history:synced`), aparte de `tga:history` | ✓ VERIFIED | `usePersistedSession.ts` sigue declarando `SYNCED_KEY`, `loadSyncedIds`/`saveSyncedIds` sin cambios; el commit solo añade `readHistory`, no toca esta pareja |
| 4 | SC2/SYNC-09: No se activa la persistencia IndexedDB integrada de Firestore | ✓ VERIFIED | `grep -c 'persistentLocalCache\|enableIndexedDbPersistence' useHistorySync.ts` → 0 (sin cambios en esa zona del fichero) |
| 5 | SC2/D-02/D-04/D-08: Los pendientes se reintentan cuando vuelve la red, el atraso completo se sube sin tope, y la poda perezosa de marcas NUNCA vacía la lista entera por una lectura transitoriamente ilegible | ✓ VERIFIED | **Reforzado por esta corrida.** `syncPending` ahora recibe `readHistory` (no `loadHistory`); el merge `previas ∪ subidas` se calcula y escribe SIEMPRE, y el filtrado por poda solo se aplica si `readHistory().kind === 'ok'` — si es `'unreadable'`, se persiste el merge sin podar. Test nombrado `useHistorySync.test.ts — WR-01 ...` fuerza un `getItem` que lanza justo en el recálculo final y confirma que `['existing','ghost','new']` sobreviven. Ejecutado de forma independiente en esta corrida: 1/1 en verde. Mutación confirmada por el orquestador: revertir solo el bloque de poda reproduce el fallo exacto de WR-01 (`expected [] to deeply equal [...]`) |
| 6 | SC3/D-16/SYNC-05: El SDK de Firebase se carga diferido y solo en cliente — no participa del arranque, del prerender ni del primer pintado | ✓ VERIFIED | `nuxt.config.ts` y la zona de imports de `useHistorySync.ts` sin cambios en este commit; `e2e/bundle-budget.spec.ts` sin cambios; hecho establecido: gate en verde en HEAD |
| 7 | SC4/SYNC-06: La escritura usa autenticación anónima, sin cuentas de usuario | ✓ VERIFIED | `ensureAnonymousUser()` sin cambios en este commit; proveedor Anónimo confirmado habilitado (revisión humana ya aprobada, hecho establecido) |
| 8 | SC4/SYNC-07/D-11/D-12: Las reglas desplegadas permiten `create` con forma validada, y NUNCA leer/actualizar/borrar los de otros | ✓ VERIFIED | `firestore.rules` no forma parte del diff de `0b3d3d3`; sin cambios. Revisión humana bloqueante ya aprobada (hecho establecido, no re-ejecutada por instrucción explícita) |
| 9 | SC4/D-09: La lista blanca de las reglas y la de la proyección del cliente no pueden divergir en silencio | ✓ VERIFIED | `e2e/firestore-rules-contract.spec.ts` y `engine/sync.ts` sin cambios en este commit |
| 10 | SC5/SYNC-08: Un fallo de Firestore (cuota, reglas, red, proyecto caído) nunca impide jugar, registrar localmente ni ver estadísticas | ✓ VERIFIED | El `catch` externo de `flush()`/`syncPending` sigue sin relanzar nada; el nuevo camino `'unreadable'` de la poda tampoco lanza — es una rama `if/else` que siempre resuelve, nunca un `throw`. Confirmado por lectura del diff completo |
| 11 | SC5/COMP-03: Una PWA ya instalada recibe la actualización por el camino existente (`registerType: 'prompt'`), sin recarga forzada | ✓ VERIFIED | `nuxt.config.ts` fuera del diff de este commit; sin cambios |
| 12 | D-09: El documento se construye campo a campo desde `buildSyncPayload`, nunca con un `spread` de la entrada | ✓ VERIFIED | `engine/sync.ts` fuera del diff de este commit; sin cambios |

**Score:** 12/12 truths verified (0 present-behavior-unverified)

### Required Artifacts

Sin cambios respecto a la corrida anterior salvo los tres ficheros tocados por `0b3d3d3`, verificados de nuevo:

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/composables/usePersistedSession.ts` | `readHistory()`/`HistoryRead` aditivos, `loadHistory()` como envoltorio sin cambio de contrato | ✓ VERIFIED | Presentes; `loadHistory()` delega en `readHistory()` y sigue devolviendo `[]` en `'unreadable'` |
| `app/composables/useHistorySync.ts` | `syncPending` recibe `readHistory`, prune condicional a `kind === 'ok'` | ✓ VERIFIED | Confirmado por lectura línea a línea |
| `app/composables/__tests__/useHistorySync.test.ts` | test de regresión WR-01 | ✓ VERIFIED | Presente, nombrado, ejecutado de forma aislada: 1/1 en verde |
| Resto de artefactos (`engine/sync.ts`, `firestore.rules`, `nuxt.config.ts`, `e2e/*`, `.firebaserc`, `.env.example`, etc.) | sin cambios desde la corrida anterior | ✓ VERIFIED (por herencia — fuera del diff de `0b3d3d3`, re-confirmados por `git status` limpio) | — |

### Key Link Verification

Sin cambios estructurales: `flush→syncPending` ahora pasa `readHistory` en vez de `loadHistory` (mismo enlace, distinta función inyectada, mismo punto de conexión). El resto de los 9 enlaces verificados en la corrida anterior no fueron tocados por este commit.

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| SYNC-01 | 10-01 | Cada partida se sube a Firestore como respaldo | ✓ SATISFIED | truth #1, #12 |
| SYNC-02 | 10-01 | Subida dispara-y-olvida, sin `await` | ✓ SATISFIED | truth #1 |
| SYNC-03 | 10-01, 10-03 | Marca de sincronizado + reintento con red | ✓ SATISFIED | truth #3, #5 (reforzado por el fix WR-01) |
| SYNC-04 | 10-04 | Sin conexión, todo funciona igual | ✓ SATISFIED | truth #2 |
| SYNC-05 | 10-01, 10-04 | SDK diferido, solo cliente | ✓ SATISFIED | truth #6 |
| SYNC-06 | 10-01, 10-02 | Autenticación anónima | ✓ SATISFIED | truth #7 |
| SYNC-07 | 10-02 | Reglas create-only con forma validada | ✓ SATISFIED | truth #8, #9 |
| SYNC-08 | 10-03, 10-04 | Fallo de Firestore nunca bloquea | ✓ SATISFIED | truth #10 |
| SYNC-09 | 10-01, 10-03 | Sin persistencia IndexedDB integrada | ✓ SATISFIED | truth #4 |
| COMP-03 | 10-04 | Camino de actualización PWA intacto | ✓ SATISFIED | truth #11 |

Los diez IDs declarados en frontmatter de los 4 planes siguen coincidiendo exactamente con los diez mapeados a "Fase 10" en `REQUIREMENTS.md` (los diez checkboxes `[x]`, líneas 267-283, confirmados de nuevo en esta corrida). **Sin requisitos huérfanos.**

### Anti-Patterns Found

| Archivo | Línea | Patrón | Severidad | Impacto |
|---|---|---|---|---|
| `app/composables/useHistorySync.ts` | (anterior) 165-183 | ~~WR-01: poda perezosa puede vaciar `tga:history:synced` entero ante un fallo transitorio de `loadHistory()`~~ | ✅ **RESUELTO** por `0b3d3d3` | Cerrado: la poda ahora es condicional a `readHistory().kind === 'ok'`; test de regresión nombrado en verde, mutación confirmada por el orquestador |
| `app/composables/useHistorySync.ts` | 109-183, 225-249 (numeración aprox., sin cambios de fondo) | WR-02: sin timeout en `setDoc`/`signInAnonymously` — una promesa colgada mantiene `flushInFlight` bloqueado, inutilizando el disparador `online` | ⚠️ Warning (abierto, no bloqueante, deferido por decisión explícita del usuario) | Filed: `.planning/todos/pending/wr-02-sin-timeout-en-llamadas-de-red-de-sync.md` — confirmado presente en esta corrida |
| `nuxt.config.ts` | 171-195 | WR-03: `workbox.globPatterns` precachea los chunks diferidos del SDK de Firebase (hasta ~556 KB) a todo visitante | ⚠️ Warning (abierto, no bloqueante, deferido por decisión explícita del usuario) | Filed: `.planning/todos/pending/wr-03-workbox-precachea-el-sdk-de-firebase.md` — confirmado presente en esta corrida |
| `firestore.rules` | 52-93 | IN-01/IN-02: falta `id == docId` explícito y `request.auth != null` explícito (ambos cubiertos implícitamente hoy) | ℹ️ Info | Sin brecha activa, sin cambios |

WR-01 queda cerrado por el commit que motivó esta re-verificación, con test de regresión propio y mutación confirmada. WR-02 y WR-03 siguen abiertos, deferidos por decisión explícita del usuario, con ficheros de seguimiento en `.planning/todos/pending/` — no bloquean el cierre de la fase (ninguno impide jugar/registrar/ver estadísticas, ninguno viola una prohibición de `must_haves.prohibitions`).

### Human Verification

Sin cambios respecto a la corrida anterior. Las dos verificaciones humanas exigidas por el ROADMAP siguen completas y no se repiten en esta corrida (ninguna toca red/consola, por instrucción explícita):

- **(a)** Automatizada vía `e2e/offline-flow.spec.ts` — en CI.
- **(b)** Revisión manual de las reglas REALMENTE desplegadas — aprobada por el usuario antes de la primera escritura real (`10-02-SUMMARY.md`).

No quedan items de verificación humana pendientes para esta fase.

### Gaps Summary

Ninguno. Los 12 truths siguen verificados tras el commit `0b3d3d3`. El único cambio de fondo respecto a la corrida anterior es el cierre de WR-01 (una debilidad de robustez, no un must-have fallido en la corrida previa), reforzando el truth #5 con un test de regresión nombrado y ejecutado de forma independiente en esta sesión (1/1 en verde), más 81/81 en los dos ficheros de test afectados y `typecheck` limpio, ambos re-ejecutados aquí. Ninguna regresión detectada: `record()`/`flush()` siguen síncronas y no bloqueantes, `loadHistory()` mantiene su contrato de pantalla, y la propiedad de frescura de D-04 (releer al final del flush) se mantiene, ahora sobre `readHistory()`. WR-02/WR-03 siguen abiertos por decisión explícita del usuario, sin bloquear.

---

_Verified: 2026-09-22T23:43:13Z_
_Verifier: Claude (gsd-verifier)_
