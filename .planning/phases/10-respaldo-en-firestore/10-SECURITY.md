---
phase: "10"
slug: "respaldo-en-firestore"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-23"
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Fase 10 (respaldo del histórico en Firestore) es la primera fase del proyecto que
abre una llamada de red saliente en producción. El register consolida los cuatro
`<threat_model>` autorizados en tiempo de plan (10-01 … 10-04): 20 amenazas STRIDE,
sin amenazas nuevas acuñadas en esta auditoría.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| navegador → Firestore (`firestore.googleapis.com`) | Primera llamada de red saliente del cliente en producción. Todo lo que cruza es, por definición, no confiable para el servidor. | Documento de partida: 12 campos proyectados + `uid` + `createdAt` |
| `GameHistoryEntry` local → documento de Firestore | Frontera de proyección: lo que no cruza aquí nunca sale del dispositivo. | Lista blanca `SYNC_PAYLOAD_FIELDS` (12 campos), sin `spread` |
| bundle público (repo público) → configuración de Firebase | La config web viaja en el build y cualquiera puede leerla. No es un secreto; la barrera real son las reglas. | `apiKey`, `authDomain`, `projectId`, `appId` — públicos por diseño |
| cliente anónimo cualquiera → colección `history/` | Cualquiera con la config del bundle puede autenticarse anónimamente e intentar escribir. Las reglas son la única barrera. | Intentos de `create`; `read`/`update`/`delete` denegados |
| fichero committeado → reglas evaluadas por Google | Si el despliegue no sale del fichero del repo, lo que protege el proyecto no es lo que nadie ha revisado. | Texto de `firestore.rules` |
| respuesta de Firestore → cliente | Solo vuelve un ACK o un rechazo; ningún dato entra. Una respuesta hostil no puede alterar el estado local más allá de «sigue pendiente». | Nada — camino de una sola dirección |
| evento `online` del navegador → `flush()` | Disparador que el código no controla y que puede llegar en cualquier momento. | Ninguno (dispara trabajo, no transporta datos) |
| salida de build (`.output/public`) → navegador | Última oportunidad de detectar que el arranque engordó o que el SDK se coló en el chunk inicial. | Chunks JS servidos a la tablet |
| service worker instalado → build nueva | Decide si una tablet en mitad de partida se recarga sola. | Precache manifest / cabeceras de caché |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-10-01 | Information Disclosure | `engine/sync.ts` (`buildSyncPayload`) | medium | mitigate | Proyección por lista blanca campo a campo; `SYNC_PAYLOAD_FIELDS` exportada. Verificado: `engine/sync.ts:28-41` construye los 12 campos sin `spread`, y `engine/__tests__/sync.test.ts:66-79` afirma que un campo extra inyectado (`unexpectedField`, `secretToken`) no sobrevive a la proyección. | closed |
| T-10-02 | Denial of Service | `useGameHistory.record()` | high | mitigate | Dispara-y-olvida sin `await`, `try`/`catch` envolvente y guarda de configuración antes del `import()`. Verificado: `app/composables/useGameHistory.ts:292-301` (`record()` sigue siendo síncrona y devuelve `boolean`; `if (recorded) flush()`), `useHistorySync.ts` `flush()` con `try`/`catch` externo y `void syncPending(...)`. Cubierto además por el e2e offline de fin de partida. | closed |
| T-10-03 | Spoofing | `ensureAnonymousUser` | low | accept | Cualquiera puede obtener un uid anónimo válido; el uid expresa propiedad sintáctica, no identidad verificada. Aceptado en D-11 (AR-10-01). | closed |
| T-10-04 | Information Disclosure | `runtimeConfig.public` en el bundle | low | accept | La config web de Firebase no es un secreto; la seguridad la dan las reglas. Lo que sí se mitiga (uso del proyecto ajeno desde un fork) está cubierto por la guarda de D-13: `nuxt.config.ts:28-31` deja los cuatro valores vacíos por defecto y `useHistorySync.ts` corta en no-op sin `firebaseProjectId`. Aceptado (AR-10-02). | closed |
| T-10-05 | Tampering | `setDoc` con `createdAt` del cliente | medium | mitigate | El cliente envía `serverTimestamp()` y la regla exige `request.resource.data.createdAt == request.time`. Verificado en `firestore.rules` (última condición del `allow create`) y en `useHistorySync.ts` (`createdAt: firestoreModule.serverTimestamp()`). | closed |
| T-10-SC | Tampering | `npm install firebase` | high | mitigate | Gate de legitimidad ejecutado en `10-RESEARCH.md:167-175` (veredicto `SUS`/`too-new`) + checkpoint humano bloqueante antes de instalar. Verificado: repo oficial `github.com/firebase/firebase-js-sdk` confirmado, `postinstall: null`, aprobación textual del usuario registrada en `10-01-SUMMARY.md:156`. | closed |
| T-10-06 | Information Disclosure | regla `read` de `history/{docId}` | high | mitigate | `allow read, update, delete: if false` explícito en `firestore.rules`. Ninguna pantalla lee de la nube. Gate mecánico: `e2e/firestore-rules-contract.spec.ts:76` («las reglas deniegan explícitamente read/update/delete»). | closed |
| T-10-07 | Tampering | reglas `update`/`delete` de `history/{docId}` | high | mitigate | Misma línea `allow read, update, delete: if false`: un hostil puede añadir basura, nunca corromper ni borrar las partidas reales. Mismo gate mecánico que T-10-06. | closed |
| T-10-08 | Tampering | regla `create`, documento malformado o sobredimensionado | high | mitigate | `hasOnly()` sobre 14 claves + `hasAll()` sobre las 10 obligatorias + tipo por campo + `players.size() <= 8` + `recordedAt.size() <= 64`. Verificado en `firestore.rules`; el acoplamiento con `SYNC_PAYLOAD_FIELDS` lo comprueba mecánicamente `e2e/firestore-rules-contract.spec.ts:47`. | closed |
| T-10-09 | Tampering | `players[]` anidado | medium | accept | El lenguaje de reglas no puede iterar `players[]` para validar la forma de cada elemento. Acotado por tamaño (`<= 8`) y aceptado por escrito por el usuario en el bloque C del checkpoint de la Task 3 (`10-02-SUMMARY.md:144`). Peor caso: basura parcialmente inválida en un campo anidado de un documento write-only que ninguna pantalla lee (AR-10-03). | closed |
| T-10-10 | Denial of Service | cuota del plan gratuito (20.000 escrituras/día) | medium | accept | Aceptado en D-08 y `PITFALLS.md` §5: el respaldo deja de sincronizar hasta el reinicio diario; `localStorage` (fuente de verdad) no se ve afectado. Palanca siguiente registrada como idea diferida: App Check (AR-10-04). | closed |
| T-10-11 | Repudiation | divergencia entre el fichero committeado y las reglas desplegadas | high | mitigate | D-15: despliegue desde el fichero committeado con `npx firebase-tools deploy --only firestore:rules` y comparación carácter a carácter contra la consola. Verificado: bloque A del checkpoint humano **CONFORME** y bloque B (seis puntos, incl. auth anónima habilitada) **CONFORME** (`10-02-SUMMARY.md:141-143`). `firebase-tools` no es dependencia del proyecto (`grep -c 'firebase-tools' package.json` == 0). | closed |
| T-10-12 | Denial of Service | `flush()` disparado por `online` | medium | mitigate | Las cuatro guardas se evalúan antes del `import()` y la bandera `flushInFlight` corta la reentrada. Verificado en `app/composables/useHistorySync.ts` (guardas 1–4 en orden, `flushInFlight = true` antes del `void syncPending(...)`, reset en `.finally()`); el listener `online` se registra una sola vez (`onlineListenerRegistered`). | closed |
| T-10-13 | Tampering | `tga:history:synced` manipulado desde devtools | low | accept | La clave es reconstruible: vaciarla provoca reintentos que D-03 hace inocuos; llenarla con ids falsos solo impide subir esas entradas. `tga:history` no se toca nunca desde el camino de red (AR-10-05). | closed |
| T-10-14 | Information Disclosure | rastro de diagnóstico en consola | low | mitigate | Solo bajo `import.meta.dev` y solo el campo `code` del error, nunca el objeto completo. Verificado en el `.catch()` de `flush()` (`app/composables/useHistorySync.ts`). | closed |
| T-10-15 | Repudiation | un rechazo por reglas tratado como éxito | high | mitigate | El `catch` de `setDoc` nunca marca: `uploadedIds.push(payload.id)` está **dentro** del `try`, después del `await setDoc(...)`, y el `catch` está vacío a propósito (`app/composables/useHistorySync.ts`, bucle de `syncPending`). Es lo que mantiene detectable un despliegue de reglas equivocado. Cubierto por test nominal. | closed |
| T-10-16 | Denial of Service | chunk inicial de `/` y `/marvel-champions` | high | mitigate | Gate de D-16 en `e2e/bundle-budget.spec.ts` con las cuatro aserciones (descubrimiento no vacío, ausencia de la marca del SDK, techo de bytes, chunk del SDK no referenciado). Verificado: el spec existe con sus `expect` en las líneas 79-122 y corre en CI. | closed |
| T-10-17 | Denial of Service | flujo de fin de partida sin red | high | mitigate | Test e2e con la red cortada y timeout corto en la aserción de vuelta al inicio: `e2e/offline-flow.spec.ts:170` («terminar una partida sin red registra el resultado, vuelve al inicio en un plazo corto…», SYNC-04/SYNC-08), más las rutas `/historico` y `/estadisticas` abiertas offline. | closed |
| T-10-18 | Tampering | configuración del camino de actualización de la PWA | medium | mitigate | Guarda de regresión en `e2e/update-banner.spec.ts:102` que afirma el **valor** de `registerType` (`'prompt'`, una sola ocurrencia), cero entradas `runtimeCaching` y las cuatro cabeceras de caché de `routeRules`. Verificado contra `nuxt.config.ts:58-59` (`no-cache` en `/sw.js` y `/manifest.webmanifest`) y `nuxt.config.ts:124` (`registerType: 'prompt'`). El *stale service worker trap* sigue cerrado. | closed |
| T-10-19 | Repudiation | un gate que pasa en verde sin comprobar nada | high | mitigate | Las specs afirman primero que su propio descubrimiento encontró algo, y cada gate se ejecutó contra una mutación real para verlo ponerse rojo. Verificado: `bundle-budget.spec.ts:79` (chunks no vacíos) y `firestore-rules-contract.spec.ts:55` (la extracción de `hasOnly([...])` falla explícitamente si el formato del fichero cambió). | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (`high`) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-10-01 | T-10-03 | No hay cuentas de usuario y no se pretende que las haya (D-11). Un uid anónimo expresa propiedad sintáctica, no identidad verificada: cualquiera puede obtener uno. Peor caso: un desconocido escribe documentos propios en una colección que nadie lee. | Víctor Company Bernal (D-11, plan 10-01) | 2026-09-22 |
| AR-10-02 | T-10-04 | La configuración web de Firebase es pública por diseño y viaja en el bundle de un repo público. La barrera real son las reglas de Firestore, no el secreto de la config. El uso del proyecto desde un fork queda cortado por la guarda de `firebaseProjectId` vacío (D-13). | Víctor Company Bernal (D-11/D-13, plan 10-01) | 2026-09-22 |
| AR-10-03 | T-10-09 | El lenguaje de reglas de Firestore no puede recorrer `players[]` para validar la forma de cada elemento: un documento con `players: [{ basura: 'x' }]` pasaría la regla respetando el tope de 8. Peor caso aceptado: basura parcialmente inválida en un campo anidado de un documento write-only que ninguna pantalla de la app lee jamás. | Víctor Company Bernal — aceptación textual en el bloque C del checkpoint bloqueante de la Task 3 (plan 10-02) | 2026-09-23 |
| AR-10-04 | T-10-10 | Agotar la cuota gratuita (20.000 escrituras/día) detiene el respaldo hasta el reinicio diario, sin tocar `localStorage`, que es la fuente de verdad: jugar sigue igual. Un grupo de amigos está órdenes de magnitud por debajo del límite. Palanca siguiente si dejara de ser tolerable: App Check, ya registrada como idea diferida. | Víctor Company Bernal (D-08, plan 10-02) | 2026-09-22 |
| AR-10-05 | T-10-13 | `tga:history:synced` es una lista de marcas reconstruible, no un dato: vaciarla provoca reintentos que D-03 hace inocuos, y llenarla con ids falsos solo impide subir esas entradas. `tga:history` (la fuente de verdad) no se escribe nunca desde el camino de red. | Víctor Company Bernal (D-03, plan 10-03) | 2026-09-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-23 | 20 | 20 | 0 | /gsd-secure-phase (orquestador, L1 grep-depth; register autorizado en tiempo de plan) |

**Nota de método.** `register_authored_at_plan_time: true` (los cuatro planes 10-01…10-04
traen un `<threat_model>` parseable) y `asvs_level: 1`, así que esta auditoría **verifica
que las mitigaciones declaradas existen** — no escanea buscando amenazas nuevas. Con
`threats_open: 0` tras la clasificación, aplica el short-circuit del workflow: la
profundidad L1 es suficiente y no se despliega el subagente de verificación profunda
(L2/L3). Dos de las mitigaciones no son código sino revisión humana bloqueante
(T-10-SC y T-10-11); la evidencia de ambas es el veredicto registrado en los SUMMARY,
no una aserción automatizable.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-23
