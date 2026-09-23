// app/composables/useHistorySync.ts
//
// Fase 10 (D-02/D-03/D-04/D-05/D-06/D-07/D-08/D-12/D-13): módulo de red — la ÚNICA pieza de
// esta app que habla con un servicio externo desde el cliente. `record()`
// (useGameHistory.ts) lo invoca dispara-y-olvida tras escribir en local, y
// desde este plan (10-03) el propio evento `online` del navegador dispara
// el mismo `flush()` — dos disparadores, un solo camino de subida (D-02).
// WR-02 (revisión de código, Fase 10): las cuatro esperas de red (import()
// del SDK, onAuthStateChanged, signInAnonymously, setDoc) tienen tope de
// tiempo (`SYNC_NETWORK_TIMEOUT_MS`) — una promesa que nunca se resuelve ya
// no deja el segundo disparador de D-02 inutilizado.
//
// TERCERA excepción documentada de estado de módulo en app/composables/ (la
// primera es useHistorySavedNotice.ts, la segunda useProgressMismatchMark.ts
// — ver su razonamiento extenso, citado aquí en vez de repetido): la
// configuración cacheada, la bandera «hay un flush en vuelo» y la bandera
// «el listener `online` ya está registrado» necesitan sobrevivir entre
// invocaciones distintas de useHistorySync() (una por cada vez que
// useGameHistory() se instancia), y un `ref` creado dentro del cuerpo del
// composable no lo hace. La bandera «en vuelo» evita que los dos
// disparadores (record() y el evento `online`) solapen el mismo trabajo de
// subida.
//
// SYNC-05: NINGUNA importación estática del SDK de Firebase en este fichero
// — las tres entradas (`firebase/app`, `firebase/auth`, `firebase/firestore`)
// entran SOLO por `import()` dentro del cuerpo de `syncPending`, la única
// función que las necesita. RESEARCH.md (Patrón 1) confirma que el sufijo
// `.client.ts` NO da ninguna garantía real para un composable en Nuxt 4 —
// la guarda real es código (`typeof window === 'undefined'`), no un nombre
// de fichero, y por eso este módulo no lo lleva. Los TIPOS del SDK se
// obtienen por consulta sobre el propio `import()` dinámico
// (`typeof import(...)`), nunca con una declaración `import`/`import type`
// de nivel superior — así ninguna línea de este fichero fuera del cuerpo de
// una función menciona 'firebase' en una declaración `import`.
import { buildSyncPayload } from '~~/engine/sync'
import type { GameHistoryEntry } from '~~/engine/types'
import type { HistoryRead } from './usePersistedSession'
import { usePersistedSession } from './usePersistedSession'

// Forma mínima de `runtimeConfig.public` que este fichero necesita (D-13) —
// declarada aquí, no importada de los tipos generados por Nuxt, mismo
// motivo que `UpdatePwaLike` en useUpdatePrompt.ts: poder testear sin
// contexto de Nuxt.
interface FirebaseSyncConfig {
  firebaseApiKey: string
  firebaseAuthDomain: string
  firebaseProjectId: string
  firebaseAppId: string
}

type FirebaseAuthModule = typeof import('firebase/auth')
type FirebaseAuth = import('firebase/auth').Auth
type FirebaseUser = import('firebase/auth').User

// Estado de módulo (ver cabecera del fichero): la configuración se lee UNA
// vez por carga de página y se reutiliza en cada `flush()` posterior, sin
// volver a leer `useRuntimeConfig()` cada vez.
let configRead = false
let cachedConfig: FirebaseSyncConfig | null = null
let flushInFlight = false
// D-02 (plan 10-03): el listener `online` se registra UNA sola vez por
// carga de página — la primera invocación de `useHistorySync()` lo
// registra, las siguientes no hacen nada. Ver el registro más abajo para el
// razonamiento completo de por qué nunca se retira al desmontar.
let onlineListenerRegistered = false

// WR-02 (revisión de código, Fase 10): 15 s es el extremo generoso del rango
// 10-15 s que propone 10-REVIEW.md WR-02, a propósito — un timeout falso no
// pierde datos (la escritura sigue en la cola en memoria del SDK y llega
// sola), pero su marca sí se pierde y, por D-11 create-only, ese reintento
// se rechazará con `permission-denied` para siempre (el ruido acotado que
// D-03 ya acepta); un plazo holgado lo hace raro en una wifi de mesa lenta.
export const SYNC_NETWORK_TIMEOUT_MS = 15_000

// Clase de módulo (no exportada): así el rastro existente solo-en-desarrollo
// del `.catch` de `flush()` (que imprime SOLO el campo `code`) informa de un
// timeout sin ningún cambio en ese `.catch`.
class SyncTimeoutError extends Error {
  readonly code = 'sync-timeout'
  constructor() {
    super('WR-02: la llamada de red venció su plazo de espera')
    this.name = 'SyncTimeoutError'
  }
}

// withTimeout: arma el `setTimeout` de forma SÍNCRONA al ser llamada (mismo
// idioma de tipo `ReturnType<typeof setTimeout>` que useHistorySavedNotice.ts)
// y hace `Promise.race` entre la promesa original y una que rechaza con
// `SyncTimeoutError` al vencer. `Promise.race` se suscribe a la promesa
// original, así que su resolución o rechazo tardío queda manejado y nunca
// produce `unhandledrejection`. El `.finally` limpia el temporizador para que
// ninguna llamada que resuelve a tiempo deje un temporizador vivo (test
// WR-02/6).
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new SyncTimeoutError()), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  })
}

// D-13: lee `useRuntimeConfig().public` DENTRO de un try/catch — no es
// defensa decorativa. En el proyecto `app-logic` de Vitest no hay
// auto-imports de Nuxt ni contexto de Nuxt, así que `useRuntimeConfig` no
// existe ahí, y D-13 exige que un build mal configurado degrade a no-op y
// nunca a una excepción.
function readSyncConfig(): FirebaseSyncConfig | null {
  try {
    const config = useRuntimeConfig().public as Record<string, unknown>
    return {
      firebaseApiKey: typeof config.firebaseApiKey === 'string' ? config.firebaseApiKey : '',
      firebaseAuthDomain: typeof config.firebaseAuthDomain === 'string' ? config.firebaseAuthDomain : '',
      firebaseProjectId: typeof config.firebaseProjectId === 'string' ? config.firebaseProjectId : '',
      firebaseAppId: typeof config.firebaseAppId === 'string' ? config.firebaseAppId : '',
    }
  }
  catch {
    return null
  }
}

// Pitfall 2 de RESEARCH.md: espera UNA vez a `onAuthStateChanged`
// (resolviendo una promesa y dándose de baja dentro del propio callback)
// antes de decidir si hace falta un alta nueva. Leer `auth.currentUser` de
// forma síncrona justo tras `getAuth()` puede devolver `null` mientras la
// restauración de sesión sigue en vuelo, y llamar a `signInAnonymously` en
// ese instante crearía un uid nuevo en cada recarga sin que nada lo señale.
//
// WR-02: la espera se envuelve en `withTimeout`. `unsubscribe` se copia a una
// variable exterior declarada ANTES de la promesa (asignada de forma
// síncrona por el propio ejecutor) para que, si el plazo vence, el `catch`
// pueda darla de baja — el `Unsubscribe` de Firebase es idempotente, así que
// la doble baja (un callback tardío tras el timeout) es inocua. En la
// práctica esta espera se resuelve desde la persistencia local sin red, y el
// tope es defensivo por WR-02. `signInAnonymously` también queda envuelta.
async function ensureAnonymousUser(authModule: FirebaseAuthModule, auth: FirebaseAuth): Promise<string> {
  let unsubscribe: (() => void) | undefined
  let user: FirebaseUser | null
  try {
    user = await withTimeout(new Promise<FirebaseUser | null>((resolve) => {
      unsubscribe = authModule.onAuthStateChanged(auth, (candidate) => {
        unsubscribe?.()
        resolve(candidate)
      })
    }), SYNC_NETWORK_TIMEOUT_MS)
  }
  catch (err) {
    unsubscribe?.()
    throw err
  }
  if (user) return user.uid
  const credential = await withTimeout(authModule.signInAnonymously(auth), SYNC_NETWORK_TIMEOUT_MS)
  return credential.user.uid
}

// syncPending: única función de todo el módulo (y de toda la app) que carga
// el SDK de Firebase. `entries` son las pendientes ya calculadas por
// `flush()`; `readHistory` se vuelve a invocar al FINAL del recorrido (no se
// reutiliza la lectura que hizo `flush()` al principio) para que la poda de
// D-04 vea el estado más reciente de `tga:history` — incluida una entrada
// que el grupo borró MIENTRAS este flush estaba en vuelo. WR-01: se inyecta
// `readHistory` (el lector que SÍ distingue `'unreadable'`), no `loadHistory`
// — la poda necesita saber cuándo NO confiar en la lectura, cosa que
// `loadHistory` (colapsado a `[]` para las pantallas) no puede contarle.
// `loadSyncedIds`/`saveSyncedIds` son el lector/escritor de
// `tga:history:synced` (D-01), inyectados para no repetir aquí el import de
// `usePersistedSession`.
async function syncPending(
  entries: GameHistoryEntry[],
  config: FirebaseSyncConfig,
  readHistory: () => HistoryRead,
  loadSyncedIds: () => string[],
  saveSyncedIds: (ids: string[]) => void,
): Promise<void> {
  // WR-02: en cuanto el hermano 260923-3rk excluya los chunks de `@firebase/`
  // del precacheo de Workbox, este `import()` pasa a ser una descarga de red
  // real en la primera subida, y una wifi «conectada pero sin salida» puede
  // dejarla pendiente minutos. Los tres `import()` siguen dentro del cuerpo
  // de la función (SYNC-05 intacto, ninguna declaración de importación
  // nueva de nivel superior).
  const [appModule, authModule, firestoreModule] = await withTimeout(Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]), SYNC_NETWORK_TIMEOUT_MS)

  const existingApps = appModule.getApps()
  const app = existingApps.length > 0
    ? existingApps[0]!
    : appModule.initializeApp({
        apiKey: config.firebaseApiKey,
        authDomain: config.firebaseAuthDomain,
        projectId: config.firebaseProjectId,
        appId: config.firebaseAppId,
      })

  const auth = authModule.getAuth(app)
  const uid = await ensureAnonymousUser(authModule, auth)
  // SYNC-09: sin `initializeFirestore` ni `persistentLocalCache` ni
  // `enableIndexedDbPersistence` — el caché de Firestore se queda en
  // memoria por defecto, a propósito.
  const db = firestoreModule.getFirestore(app)

  const uploadedIds: string[] = []
  for (const entry of entries) {
    const payload = buildSyncPayload(entry)
    try {
      await withTimeout(firestoreModule.setDoc(firestoreModule.doc(db, 'history', payload.id), {
        ...payload,
        uid,
        createdAt: firestoreModule.serverTimestamp(),
      }), SYNC_NETWORK_TIMEOUT_MS)
      uploadedIds.push(payload.id)
    }
    catch (err) {
      // D-03: un rechazo por reglas (`permission-denied`, un reintento de
      // algo que el servidor ya tenía), un fallo de red/servidor caído
      // (`unavailable`) y un timeout WR-02 (`SyncTimeoutError`, la promesa
      // de `setDoc` nunca resolvió dentro de `SYNC_NETWORK_TIMEOUT_MS`) se
      // tratan EXACTAMENTE IGUAL aquí — ninguno de los tres añade el id a la
      // lista de subidos, y ninguno por sí solo enmascara un intento no
      // confirmado por el servidor como si fuera una subida. Tratar un
      // `permission-denied` como éxito enmascararía unas reglas mal
      // desplegadas, que es justo el fallo que la verificación humana del
      // plan 10-02 busca detectar. Consecuencia aceptada: un reintento
      // contra un documento que el servidor ya tenía se rechaza y esa
      // entrada queda pendiente para siempre, reintentándose una vez por
      // partida futura — ruido acotado, invisible y sin coste.
      //
      // WR-02: un timeout SÍ corta el recorrido de esta vuelta (`break`,
      // decisión distinta de un `permission-denied`/`unavailable`, que nunca
      // interrumpen nada). Un timeout significa «ahora no hay red»: seguir
      // intentando las demás entradas colgaría cada una otro plazo completo
      // y, con el atraso de D-08 (decenas de partidas de golpe), mantendría
      // `flushInFlight` bloqueado N×15 s justo cuando el `online` más
      // importa, además de encolar en memoria del SDK N escrituras cuyas
      // marcas se perderían igual. Las entradas no intentadas siguen
      // pendientes para el siguiente disparador (D-02). La poda/merge de
      // D-04 se ejecuta igual justo debajo, con una sola llamada a
      // `saveSyncedIds` (WR-01 intacto): lo subido antes del timeout en esta
      // misma vuelta queda marcado.
      if (err instanceof SyncTimeoutError) break
    }
  }

  // D-04 (plan 10-03): poda perezosa de la lista de marcas, DENTRO del
  // propio flush, con una sola escritura — tanto si hubo subidas nuevas
  // como si TODAS las subidas de este recorrido fallaron. Se descarta
  // cualquier id que no esté en el conjunto de ids de `readHistory()` leído
  // en ESTE instante (no el capturado al principio de `flush()`), así que
  // una entrada que el grupo borró en `/historico` mientras el flush seguía
  // en vuelo también queda podada sin esperar a la próxima vez.
  // `removeHistoryEntry` (usePersistedSession.ts) no se toca: esta poda
  // vive aquí, nunca acoplada al camino de borrado que CR-01/CR-03/WR-08
  // (Fase 9) blindaron. Nota importante, fácil de leer al revés: borrar una
  // partida en el dispositivo NO borra su respaldo en Firestore, y eso es
  // deliberado — un respaldo que se borra solo cuando borras el original no
  // es un respaldo; la poda solo limpia la LISTA DE MARCAS local, nunca el
  // documento remoto.
  //
  // WR-01 (revisión de código, Fase 10): el merge (unión de las marcas ya
  // guardadas con las recién subidas) SIEMPRE se calcula y SIEMPRE se
  // escribe — eso es lo que evita perder `uploadedIds` ante cualquier
  // desenlace. Lo único condicional es el FILTRADO por poda: si
  // `readHistory()` devuelve `'unreadable'` (un `getItem` que lanza justo en
  // este instante, JSON corrupto, `formatVersion` desconocido), no hay
  // ningún `currentHistoryIds` del que fiarse, así que esta vuelta NO poda
  // nada — se limita a persistir el merge tal cual. Podar sobre un conjunto
  // vacío por culpa de un fallo transitorio de lectura borraría TODAS las
  // marcas ya subidas con éxito, no solo la entrada en curso, y el efecto no
  // se autocorrige (D-03: el reintento se rechaza con `permission-denied`
  // para siempre). Mismo principio que `appendHistoryEntry` ya aplica en
  // sentido contrario (CR-03, Fase 9): nunca se actúa sobre una lectura que
  // no se ha sabido interpretar.
  const currentHistoryRead = readHistory()
  const merged = new Set([...loadSyncedIds(), ...uploadedIds])
  if (currentHistoryRead.kind === 'ok') {
    const currentHistoryIds = new Set(currentHistoryRead.entries.map(historyEntry => historyEntry.id))
    saveSyncedIds([...merged].filter(id => currentHistoryIds.has(id)))
  }
  else {
    saveSyncedIds([...merged])
  }
}

export function useHistorySync(): { flush: () => void } {
  if (!configRead) {
    cachedConfig = readSyncConfig()
    configRead = true
  }
  const { loadHistory, readHistory, loadSyncedIds, saveSyncedIds } = usePersistedSession()

  // D-05/D-06/D-07: síncrona, devuelve void, NUNCA lanza. Guardas en este
  // orden exacto — el orden es lo que hace cierto SYNC-05 (el import()
  // dinámico solo ocurre si las cuatro se superan) y D-02 (el listener
  // `online`, registrado más abajo, no importa Firebase mientras no haya
  // nada pendiente: la guarda (2) se evalúa antes que cualquier import()).
  function flush(): void {
    try {
      // (1) SSR/prerender: mismo idioma que toda la capa de persistencia.
      if (typeof window === 'undefined') return

      // (2) Pendientes = TODAS las entradas de tga:history cuyo id no esté
      // ya subido — D-08: sin ningún `slice`/`take`/tope por ráfaga. El día
      // del despliegue, todas las partidas ya registradas en la Fase 9
      // cuentan como pendientes y se suben de golpe: un grupo de amigos
      // tiene decenas de partidas al año, muy lejos del límite gratuito de
      // 20.000 escrituras/día, así que un tope sería código y estado nuevos
      // para un problema que este proyecto no tiene (mismo razonamiento con
      // el que ya se descartaron IndexedDB y Pinia). Sin ninguna pendiente,
      // no hay nada que hacer.
      const synced = new Set(loadSyncedIds())
      const pending = loadHistory().filter(entry => !synced.has(entry.id))
      if (pending.length === 0) return

      // (3) Guarda de configuración (D-13): sin projectId, no-op ANTES del
      // import() dinámico — build sin configurar, fork sin variables de
      // entorno, o app-logic de Vitest sin contexto de Nuxt.
      const config = cachedConfig
      if (!config || !config.firebaseProjectId) return

      // (4) Ya hay un flush en vuelo (disparado por record() o por el
      // listener online): no solapar el mismo trabajo. WR-02: desde este
      // plan la bandera en vuelo está acotada en el tiempo, porque cada
      // espera de red de `syncPending` tiene tope `SYNC_NETWORK_TIMEOUT_MS`
      // — nunca queda enclavada por una promesa que no se resuelve nunca.
      if (flushInFlight) return

      flushInFlight = true
      // Dispara-y-olvida (SYNC-02/D-05), mismo idioma que
      // `prefetchAll(...).catch(() => {})` en app/pages/[game]/index.vue:
      // cualquier fallo se resuelve en silencio, nunca se propaga hacia
      // record()/onOutcomeRecorded (D-07).
      void syncPending(pending, config, readHistory, loadSyncedIds, saveSyncedIds)
        .catch((err: unknown) => {
          // Cubre TODO lo que no tiene su propio catch interno: el
          // import() dinámico, initializeApp, getAuth, la auth anónima
          // (incluido el proveedor Anónimo deshabilitado en la consola de
          // Firebase) — cualquiera de estos falla en silencio absoluto en
          // producción, exactamente igual que un setDoc rechazado (D-07).
          // Único rastro permitido: SOLO en desarrollo (import.meta.dev),
          // y SOLO el campo `code` del error — nunca el objeto completo,
          // que podría llevar detalles internos del SDK a la consola.
          if (import.meta.dev) {
            const code = err && typeof err === 'object' && 'code' in err
              ? (err as { code: unknown }).code
              : undefined
            console.warn('[useHistorySync] flush() falló en silencio, código:', code)
          }
        })
        .finally(() => {
          flushInFlight = false
        })
    }
    catch {
      // record() no puede propagar nada a su llamador.
    }
  }

  // D-02 (plan 10-03): segundo disparador — el evento `online` del
  // navegador. Registro idempotente (bandera de módulo): la primera
  // invocación de useHistorySync() en la vida de la página lo registra, las
  // siguientes no hacen nada. Detrás de la misma guarda SSR que el resto
  // del módulo: durante el prerender no hay `window`.
  //
  // NO se retira al desmontar, y el motivo hay que dejarlo escrito: el
  // escenario real de D-02 es una tablet apoyada en la mesa durante horas
  // cuya wifi se cayó a mitad de partida y vuelve antes de recoger — un
  // listener que muriera con el componente sería un listener que no está
  // cuando hace falta. Es estado de módulo deliberado (ver cabecera del
  // fichero), la TERCERA excepción de app/composables/, con el mismo
  // razonamiento ya escrito en useProgressMismatchMark.ts (citado, no
  // repetido).
  //
  // Esto NO contradice el compromiso de que /historico y /estadisticas
  // sigan siendo pantallas 100% locales: lo que D-02 descarta es un empujón
  // al ABRIR esas pantallas. Aquí el disparador es la recuperación de la
  // red, nunca una navegación; el camino sigue siendo de una sola dirección
  // (nada se lee de la nube); y sin nada pendiente, flush() no hace
  // absolutamente nada (guarda (2) de arriba) — el listener no importa
  // Firebase hasta que hay algo que subir Y hay red.
  if (typeof window !== 'undefined' && !onlineListenerRegistered) {
    onlineListenerRegistered = true
    window.addEventListener('online', flush)
  }

  return { flush }
}
