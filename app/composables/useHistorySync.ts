// app/composables/useHistorySync.ts
//
// Fase 10 (D-02/D-03/D-05/D-06/D-12/D-13): módulo de red — la ÚNICA pieza de
// esta app que habla con un servicio externo desde el cliente. `record()`
// (useGameHistory.ts) lo invoca dispara-y-olvida tras escribir en local;
// aquí vive todo lo que decide SI de verdad hay algo que subir, y solo
// entonces carga el SDK de Firebase.
//
// TERCERA excepción documentada de estado de módulo en app/composables/ (la
// primera es useHistorySavedNotice.ts, la segunda useProgressMismatchMark.ts
// — ver su razonamiento extenso, citado aquí en vez de repetido): la
// configuración cacheada y la bandera «hay un flush en vuelo» necesitan
// sobrevivir entre invocaciones distintas de useHistorySync() (una por cada
// vez que useGameHistory() se instancia), y un `ref` creado dentro del
// cuerpo del composable no lo hace. La bandera evita que dos disparadores
// solapen el mismo trabajo de subida (este plan solo tiene uno, record();
// el listener `online` llega en el plan 10-03).
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
// `flush()`; `loadSyncedIds`/`saveSyncedIds` son el lector/escritor de
// `tga:history:synced` (D-01), inyectados para no repetir aquí el import de
// `usePersistedSession`.
async function syncPending(
  entries: GameHistoryEntry[],
  config: FirebaseSyncConfig,
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
      // D-03: un `permission-denied` (reintento de algo que el servidor ya
      // tenía) y un `unavailable` (sin red) se tratan IGUAL aquí — la
      // entrada sigue pendiente y se reintenta en el próximo flush. NUNCA
      // se marca como sincronizada dentro de este catch: eso enmascararía
      // unas reglas mal desplegadas.
    }
  }

  if (uploadedIds.length > 0) {
    const merged = new Set([...loadSyncedIds(), ...uploadedIds])
    saveSyncedIds([...merged])
  }
}

export function useHistorySync(): { flush: () => void } {
  if (!configRead) {
    cachedConfig = readSyncConfig()
    configRead = true
  }
  const { loadHistory, loadSyncedIds, saveSyncedIds } = usePersistedSession()

  // D-05/D-06/D-07: síncrona, devuelve void, NUNCA lanza. Guardas en este
  // orden exacto — el orden es lo que hace cierto SYNC-05 (el import()
  // dinámico solo ocurre si las cuatro se superan).
  function flush(): void {
    try {
      // (1) SSR/prerender: mismo idioma que toda la capa de persistencia.
      if (typeof window === 'undefined') return

      // (2) Pendientes = entradas cuyo id no esté ya subido. Sin ninguna, no
      // hay nada que hacer.
      const synced = new Set(loadSyncedIds())
      const pending = loadHistory().filter(entry => !synced.has(entry.id))
      if (pending.length === 0) return

      // (3) Guarda de configuración (D-13): sin projectId, no-op ANTES del
      // import() dinámico — build sin configurar, fork sin variables de
      // entorno, o app-logic de Vitest sin contexto de Nuxt.
      const config = cachedConfig
      if (!config || !config.firebaseProjectId) return

      // (4) Ya hay un flush en vuelo: no solapar el mismo trabajo.
      if (flushInFlight) return

      flushInFlight = true
      // Dispara-y-olvida (SYNC-02/D-05), mismo idioma que
      // `prefetchAll(...).catch(() => {})` en app/pages/[game]/index.vue:
      // cualquier fallo se resuelve en silencio, nunca se propaga hacia
      // record()/onOutcomeRecorded (D-07).
      void syncPending(pending, config, loadSyncedIds, saveSyncedIds)
        .catch(() => {
          // Silencio deliberado (D-07) — ver comentario de arriba.
        })
        .finally(() => {
          flushInFlight = false
        })
    }
    catch {
      // record() no puede propagar nada a su llamador.
    }
  }

  return { flush }
}
