---
phase: 10-respaldo-en-firestore
reviewed: 2026-09-23T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - engine/sync.ts
  - engine/__tests__/sync.test.ts
  - app/composables/useHistorySync.ts
  - app/composables/usePersistedSession.ts
  - app/composables/useGameHistory.ts
  - app/composables/__tests__/useHistorySync.test.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - e2e/bundle-budget.spec.ts
  - e2e/firestore-rules-contract.spec.ts
  - e2e/offline-flow.spec.ts
  - e2e/update-banner.spec.ts
  - firestore.rules
  - firebase.json
  - .firebaserc
  - nuxt.config.ts
  - package.json
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Revisión adversarial del respaldo silencioso en Firestore (D-01 a D-16). El diseño está cuidadosamente documentado y las decisiones deliberadas descritas en `phase_context` (write-only, D-03/D-10, D-05/D-06, SYNC-05, SYNC-09, D-13, T-10-09) se respetan en el código: `flush()` es síncrona y nunca lanza, el SDK de Firebase entra únicamente por `import()` dinámico dentro de `syncPending`, `firestore.rules` deniega explícitamente `read/update/delete`, y `SYNC_PAYLOAD_FIELDS` coincide campo a campo (y en el mismo orden) con `GameHistoryEntry` en `engine/types.ts` y con la lista `hasOnly()` de `firestore.rules`.

No se han encontrado vulnerabilidades de seguridad ni bugs que bloqueen el registro local o la interacción de la mesa (el camino `record() → save() → flush()` sigue intacto y a prueba de fallos, confirmado también por el test de humo SYNC-08). Sí se han encontrado tres puntos de robustez que merecen atención antes de dar la fase por completamente cerrada, y dos observaciones menores de endurecimiento/documentación. Ninguno de ellos causa pérdida de datos locales ni compromete la barrera real de seguridad (`firestore.rules`), pero dos de ellos erosionan silenciosamente invariantes que el propio diseño se propuso mantener (la lista de marcas `tga:history:synced` y el "no-op completo sin configurar" de D-13).

## Warnings

### WR-01: La poda perezosa de D-04 puede vaciar `tga:history:synced` de forma permanente ante un fallo transitorio de lectura

**File:** `app/composables/useHistorySync.ts:165-183`
**Issue:**
`syncPending` recalcula `currentHistoryIds` con una llamada FRESCA a `loadHistory()` al final del recorrido (línea 179), tal como documenta el comentario de D-04. Pero `loadHistory()` (en `usePersistedSession.ts:435-439`) colapsa deliberadamente `'unreadable'` (fallo transitorio de `localStorage.getItem`, ver `readEnvelope`/`RawRead`) al mismo resultado que `'empty'` (histórico genuinamente vacío): ambos devuelven `[]`.

Si ese `getItem` transitorio falla justo en este punto concreto (una vez ya se han hecho los `setDoc`, y precisamente al recalcular `currentHistoryIds`), `currentHistoryIds` queda vacío aunque `tga:history` siga intacto en disco. Entonces:

```ts
const currentHistoryIds = new Set(loadHistory().map(historyEntry => historyEntry.id)) // {} por el fallo transitorio
const merged = new Set([...loadSyncedIds(), ...uploadedIds])
const pruned = [...merged].filter(id => currentHistoryIds.has(id)) // [] — TODO se poda
saveSyncedIds(pruned) // tga:history:synced pasa a "[]"
```

`tga:history:synced` se sobrescribe a `[]`, borrando las marcas de TODAS las partidas ya subidas con éxito, no solo la que estaba en curso. Y el efecto no se autocorrige: en el siguiente `flush()`, esas entradas antiguas se reintentan contra Firestore, son rechazadas por las reglas `create`-only (D-03, documento ya existente → `permission-denied`), `uploadedIds` vuelve a quedar vacío, y la poda vuelve a escribir `[]` — el mismo ciclo se repite indefinidamente en cada partida futura para TODO el histórico local, no solo para la entrada afectada por el glitch original.

El propio módulo (`usePersistedSession.ts`, comentario de `SYNCED_KEY`) y el resto de la capa de persistencia (CR-01 ronda 3) ya establecen el principio de no colapsar "no sé leer" con "no hay nada" quando el coste de equivocarse es perder una marca — aquí ese mismo principio se salta precisamente en el punto donde se usa para podar `tga:history:synced`.

Ningún test actual de `useHistorySync.test.ts` cubre este camino (todos los que tocan `loadHistory` simulan o bien lecturas correctas o bien una entrada realmente borrada, nunca un `getItem` que lanza justo en el recálculo final de `syncPending`).

**Fix:**
```ts
// syncPending, justo antes de la poda:
const historyRead = usePersistedSession() // o inyectar un lector que exponga el discriminante
// Alternativa mínima sin cambiar la firma inyectada: exponer también
// `loadHistorySafe(): { ok: boolean, ids: Set<string> }` desde
// usePersistedSession (reutilizando readEnvelope) y, si `ok` es false,
// omitir la poda de esta vuelta en vez de tratarla como "histórico vacío":

const currentHistoryRead = loadHistoryOrUnreadable() // nueva variante que distingue 'unreadable'
if (currentHistoryRead.kind === 'ok') {
  const currentHistoryIds = new Set(currentHistoryRead.entries.map(e => e.id))
  const merged = new Set([...loadSyncedIds(), ...uploadedIds])
  saveSyncedIds([...merged].filter(id => currentHistoryIds.has(id)))
}
else {
  // Fallo transitorio: no podar esta vuelta, pero sí conservar los ids
  // recién subidos con éxito (uploadedIds) para no perderlos.
  saveSyncedIds([...new Set([...loadSyncedIds(), ...uploadedIds])])
}
```

### WR-02: `setDoc`/`signInAnonymously` sin ningún timeout — un flush iniciado offline puede dejar `flushInFlight` bloqueado de forma indefinida

**File:** `app/composables/useHistorySync.ts:109-183, 225-249`
**Issue:**
`flushInFlight` solo se libera en el `.finally()` de la promesa que envuelve `syncPending(...)` (líneas 230-249). Eso depende de que esa promesa termine SIEMPRE resolviendo o rechazando en un tiempo acotado.

El comportamiento documentado del SDK web de Firestore es que una escritura (`setDoc`) lanzada mientras el dispositivo está genuinamente sin red no rechaza de inmediato con un código de error — la promesa puede quedar pendiente sin resolver hasta que la conectividad real se restablezca (justo el escenario que D-02 describe explícitamente: "una tablet apoyada en la mesa durante horas cuya wifi se cayó a mitad de partida"). Ninguna llamada de este fichero (`ensureAnonymousUser`, `setDoc`, `signInAnonymously`) está envuelta en un `Promise.race` con un timeout.

Mientras esa promesa original siga sin resolver:
- `flushInFlight` permanece `true`.
- Cualquier `flush()` posterior — incluido el disparado por el propio listener `online` (D-02), pensado exactamente para este caso — se corta en la guarda (4) y no hace nada.
- Cualquier partida NUEVA registrada durante esa ventana (`record()` → `flush()`) tampoco añade sus entradas a la subida en curso: ese `pending` se calculó una sola vez, al principio de la llamada a `syncPending` original.

El diseño se recupera solo porque el SIGUIENTE `record()` (la siguiente partida) volverá a calcular `pending` desde cero y a intentar un nuevo flush cuando `flushInFlight` ya se haya liberado — pero mientras la escritura original siga colgada, el segundo disparador explícito de D-02 (el evento `online`, pensado justamente para "la wifi vuelve antes de recoger") queda inutilizado en la práctica, y ningún test (`useHistorySync.test.ts`) simula un `setDoc`/`signInAnonymously` cuya promesa nunca se resuelve — todos los casos de fallo simulados rechazan de inmediato (`mockRejectedValue`), nunca simulan "queda pendiente para siempre".

**Fix:** Envolver la parte de red de `syncPending` en un timeout explícito (p. ej. 10-15 s) con `Promise.race`, de forma que un intento colgado libere `flushInFlight` y deje la entrada pendiente para el siguiente disparador, en vez de bloquear silenciosamente el segundo camino de subida que D-02 introdujo a propósito:
```ts
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('sync-timeout')), ms)),
  ])
}
```

### WR-03: El precacheo de Workbox probablemente descarga el/los chunk(s) diferidos del SDK de Firebase a todos los dispositivos, aunque nunca se ejecuten

**File:** `nuxt.config.ts:171-195`
**Issue:**
`workbox.globPatterns` incluye `'**/*.{js,css,html}'` sin ninguna exclusión para los chunks de `_nuxt/`. El propio comentario de `e2e/bundle-budget.spec.ts:56-59` confirma, con datos medidos contra un build real de esta fase, que existen chunks reales del SDK de Firebase en la salida de build (el más pequeño de 31 999 bytes, el mayor de 555 902 bytes) que NO están referenciados por el HTML de entrada de `/` ni `/marvel-champions` (de ahí que el gate de presupuesto pase). Pero un glob `**/*.js` sin exclusión no distingue "referenciado por el HTML de entrada" de "chunk diferido de `import()`" — Workbox `generateSW` los precachea a TODOS por igual en la instalación del service worker.

Esto significa que, en la primera visita, cualquier dispositivo — incluido uno sin ninguna variable `NUXT_PUBLIC_FIREBASE_*` configurada, que según D-13 debería comportarse como "no-op completo" — descarga varios cientos de KB de SDK de Firebase al Cache Storage del navegador sin que ninguna partida se haya terminado nunca. No es un fallo de ejecución (el SDK sigue sin ejecutarse hasta que `flush()` decide que hay algo que subir), pero sí contradice el espíritu de "no-op completo sin configurar" y de carga perezosa que motiva SYNC-05, y tiene un coste real de datos/almacenamiento en una tablet — precisamente el dispositivo objetivo de este proyecto.

**Fix:** Excluir explícitamente los chunks que contienen la marca del SDK real del precacheo de Workbox, o mover la carga de Firebase a un `runtimeCaching` bajo demanda en vez de precache incondicional:
```ts
workbox: {
  globPatterns: ['**/*.{js,css,html}', /* ... */],
  // Excluir cualquier chunk que contenga el import() diferido de Firebase
  // del precacheo incondicional — que siga siendo un import() perezoso de
  // verdad también en el Service Worker, no solo en el arranque de la página.
  globIgnores: ['**/node_modules/**', 'voice-probe.html', 'audio/_probe/**', '_nuxt/*firebase*.js'],
},
```
(El patrón exacto de nombre de chunk debe confirmarse contra un build real, igual que exige el propio comentario de `MAX_INITIAL_JS_BYTES` en `bundle-budget.spec.ts` para cualquier cifra medida.)

## Info

### IN-01: `firestore.rules` no exige que el campo `id` del documento coincida con el id del propio documento (`docId`)

**File:** `firestore.rules:52-93`
**Issue:** D-03 fija como decisión que "el id local ES el id del documento de Firestore", y el cliente (`useHistorySync.ts:143`) siempre escribe en `doc(db, 'history', payload.id)` con `payload.id === entry.id`. Pero la regla `allow create` no comprueba `request.resource.data.id == docId` — solo que `id` sea un `string` cualquiera. Hoy esto es inofensivo porque el único escritor es este propio cliente, pero la regla, tal y como está escrita, no impide que un documento `history/<algo>` contenga un campo `id` distinto de `<algo>`, lo que rompería silenciosamente esa invariante documentada si algún día cambia el cliente o se escribe a mano desde la consola.
**Fix:** Añadir `request.resource.data.id == docId` a la condición de `allow create`, reforzando en la única barrera real de seguridad la misma invariante que D-03 ya da por sentada en el cliente.

### IN-02: La denegación implícita de escritura sin autenticar depende de un comportamiento no explicitado en el propio fichero

**File:** `firestore.rules:91`
**Issue:** `request.resource.data.uid == request.auth.uid` deniega correctamente una escritura sin autenticar porque acceder a `.uid` sobre `request.auth == null` produce un error de evaluación que Firestore trata como denegación — pero esa garantía no está escrita en ningún sitio de este fichero, que por lo demás documenta con mucho cuidado cada decisión de seguridad (ver comentario D-11 sobre por qué se prefiere una denegación explícita a una implícita, cabecera del fichero).
**Fix:** Hacer explícita la guarda, coherente con el resto del fichero: `request.auth != null && request.resource.data.uid == request.auth.uid`.

---

_Reviewed: 2026-09-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
