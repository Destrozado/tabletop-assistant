// app/composables/useHistorySync.ts
//
// Fase 10 (D-02/D-03/D-04/D-05/D-06/D-07/D-08/D-12/D-13): módulo de red — la ÚNICA pieza de
// esta app que habla con un servicio externo desde el cliente. `record()`
// (useGameHistory.ts) lo invoca dispara-y-olvida tras escribir en local, y
// desde este plan (10-03) el propio evento `online` del navegador dispara
// el mismo `flush()` — dos disparadores, un solo camino de subida (D-02).
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
async function ensureAnonymousUser(authModule: FirebaseAuthModule, auth: FirebaseAuth): Promise<string> {
  const user = await new Promise<FirebaseUser | null>((resolve) => {
    const unsubscribe = authModule.onAuthStateChanged(auth, (candidate) => {
      unsubscribe()
      resolve(candidate)
    })
  })
  if (user) return user.uid
  const credential = await authModule.signInAnonymously(auth)
  return credential.user.uid
}

// syncPending: única función de todo el módulo (y de toda la app) que carga
// el SDK de Firebase. `entries` son las pendientes ya calculadas por
// `flush()`; `loadHistory` se vuelve a invocar al FINAL del recorrido (no se
// reutiliza la lectura que hizo `flush()` al principio) para que la poda de
// D-04 vea el estado más reciente de `tga:history` — incluida una entrada
// que el grupo borró MIENTRAS este flush estaba en vuelo;
// `loadSyncedIds`/`saveSyncedIds` son el lector/escritor de
// `tga:history:synced` (D-01), inyectados para no repetir aquí el import de
// `usePersistedSession`.
async function syncPending(
  entries: GameHistoryEntry[],
  config: FirebaseSyncConfig,
  loadHistory: () => GameHistoryEntry[],
  loadSyncedIds: () => string[],
  saveSyncedIds: (ids: string[]) => void,
): Promise<void> {
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])

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
      await firestoreModule.setDoc(firestoreModule.doc(db, 'history', payload.id), {
        ...payload,
        uid,
        createdAt: firestoreModule.serverTimestamp(),
      })
      uploadedIds.push(payload.id)
    }
    catch {
      // D-03: un rechazo por reglas (`permission-denied`, un reintento de
      // algo que el servidor ya tenía) y un fallo de red/servidor caído
      // (`unavailable`) se tratan EXACTAMENTE IGUAL aquí — ninguno de los
      // dos añade el id a la lista de subidos, y ninguno interrumpe el
      // recorrido del resto de pendientes. Tratar un `permission-denied`
      // como éxito enmascararía unas reglas mal desplegadas, que es justo
      // el fallo que la verificación humana del plan 10-02 busca detectar.
      // Consecuencia aceptada: un reintento contra un documento que el
      // servidor ya tenía se rechaza y esa entrada queda pendiente para
      // siempre, reintentándose una vez por partida futura — ruido
      // acotado, invisible y sin coste.
    }
  }

  // D-04 (plan 10-03): poda perezosa de la lista de marcas, DENTRO del
  // propio flush, con una sola escritura — tanto si hubo subidas nuevas
  // como si TODAS las subidas de este recorrido fallaron. Se descarta
  // cualquier id que no esté en el conjunto de ids de `loadHistory()` leído
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
  const currentHistoryIds = new Set(loadHistory().map(historyEntry => historyEntry.id))
  const merged = new Set([...loadSyncedIds(), ...uploadedIds])
  const pruned = [...merged].filter(id => currentHistoryIds.has(id))
  saveSyncedIds(pruned)
}

export function useHistorySync(): { flush: () => void } {
  if (!configRead) {
    cachedConfig = readSyncConfig()
    configRead = true
  }
  const { loadHistory, loadSyncedIds, saveSyncedIds } = usePersistedSession()

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
      // listener online): no solapar el mismo trabajo.
      if (flushInFlight) return

      flushInFlight = true
      // Dispara-y-olvida (SYNC-02/D-05), mismo idioma que
      // `prefetchAll(...).catch(() => {})` en app/pages/[game]/index.vue:
      // cualquier fallo se resuelve en silencio, nunca se propaga hacia
      // record()/onOutcomeRecorded (D-07).
      void syncPending(pending, config, loadHistory, loadSyncedIds, saveSyncedIds)
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
