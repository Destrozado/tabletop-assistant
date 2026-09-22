// app/composables/__tests__/useHistorySync.test.ts
//
// Prueba de extremo a extremo del camino de escritura del módulo de sync con
// el SDK doblado (`vi.doMock`) y sin contexto de Nuxt real: `useRuntimeConfig`
// se simula como global, mismo patrón que `useGameHistory.test.ts` usa para
// `window`/`localStorage`. Cada test usa `vi.resetModules()` y un
// `await import('../useHistorySync')` propio para que el estado de módulo
// (config cacheada, bandera «en vuelo») no se filtre entre casos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SYNC_PAYLOAD_FIELDS } from '~~/engine/sync'
import type { GameHistoryEntry } from '~~/engine/types'

function createFakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
  }
}

function baseEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    id: 'entry-1',
    gameId: 'marvel-champions',
    result: 'won',
    lossCause: null,
    villainId: 'rhino',
    villainName: 'Rhino',
    players: [{ heroId: 'spider-man', heroName: 'Spider-Man', playerName: 'Ana' }],
    difficulty: 'normal',
    playerCount: 1,
    round: 3,
    durationMs: 900_000,
    recordedAt: '2026-09-22T12:00:00.000Z',
    ...overrides,
  }
}

const HISTORY_KEY = 'tga:history'
const SYNCED_KEY = 'tga:history:synced'

function seedHistory(fakeStorage: ReturnType<typeof createFakeLocalStorage>, entries: GameHistoryEntry[]): void {
  fakeStorage.setItem(HISTORY_KEY, JSON.stringify({ formatVersion: 1, entries }))
}

function stubRuntimeConfig(projectId: string): void {
  (globalThis as unknown as { useRuntimeConfig: () => unknown }).useRuntimeConfig = () => ({
    public: {
      firebaseApiKey: projectId ? 'test-key' : '',
      firebaseAuthDomain: projectId ? 'test.firebaseapp.com' : '',
      firebaseProjectId: projectId,
      firebaseAppId: projectId ? 'test-app-id' : '',
    },
  })
}

// Doble de auth/app «camino feliz» reutilizado por los tests nuevos de este
// plan (10-03) que no necesitan variar el uid ni la resolución de
// onAuthStateChanged — mismo patrón asíncrono (queueMicrotask) que el
// primer test de abajo documenta en detalle.
function mockWorkingAuthAndApp(uid = 'anon-uid'): void {
  const onAuthStateChanged = vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    queueMicrotask(() => callback({ uid }))
    return vi.fn()
  })
  vi.doMock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})), onAuthStateChanged, signInAnonymously: vi.fn() }))
  vi.doMock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})), getApps: vi.fn(() => []) }))
}

function windowAddEventListenerMock(): ReturnType<typeof vi.fn> {
  return (globalThis as unknown as { window: { addEventListener: ReturnType<typeof vi.fn> } }).window.addEventListener
}

describe('useHistorySync — extremo a extremo con el SDK doblado', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    vi.resetModules()
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { useRuntimeConfig?: unknown }).useRuntimeConfig
    vi.doUnmock('firebase/app')
    vi.doUnmock('firebase/auth')
    vi.doUnmock('firebase/firestore')
    vi.restoreAllMocks()
  })

  it('con projectId configurado y una entrada pendiente, setDoc se llama una vez con la referencia history/<id> y un documento con las doce claves de SYNC_PAYLOAD_FIELDS más uid/createdAt, y el id acaba en tga:history:synced', async () => {
    const entry = baseEntry()
    seedHistory(fakeStorage, [entry])
    stubRuntimeConfig('test-project')

    const setDoc = vi.fn().mockResolvedValue(undefined)
    const doc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }))
    const serverTimestamp = vi.fn(() => '__server_timestamp__')
    vi.doMock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})), doc, setDoc, serverTimestamp }))

    // onAuthStateChanged real de Firebase SIEMPRE invoca su callback de
    // forma ASÍNCRONA (incluso con una sesión ya restaurada) — `queueMicrotask`
    // reproduce eso aquí. Invocarlo de forma síncrona (antes de que
    // `unsubscribe` termine de asignarse en ensureAnonymousUser) dispararía
    // un `ReferenceError` de zona muerta temporal en el propio patrón que
    // RESEARCH.md documenta como correcto — el doble de prueba debe imitar
    // el comportamiento real del SDK, no el patrón ingenuo.
    const onAuthStateChanged = vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
      queueMicrotask(() => callback({ uid: 'anon-uid-1' }))
      return vi.fn()
    })
    const signInAnonymously = vi.fn()
    vi.doMock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})), onAuthStateChanged, signInAnonymously }))
    vi.doMock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})), getApps: vi.fn(() => []) }))

    const { useHistorySync } = await import('../useHistorySync')
    const { flush } = useHistorySync()

    flush()

    // El setDoc real ocurre tras el import() dinámico + Promise.all: esperar
    // a que ese trabajo asíncrono corra.
    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1))

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'history', entry.id)
    const documentBody = setDoc.mock.calls[0]![1] as Record<string, unknown>
    expect(Object.keys(documentBody).sort()).toEqual([...SYNC_PAYLOAD_FIELDS, 'uid', 'createdAt'].sort())
    expect(documentBody.uid).toBe('anon-uid-1')
    expect(documentBody.createdAt).toBe('__server_timestamp__')
    expect(signInAnonymously).not.toHaveBeenCalled()

    await vi.waitFor(() => {
      const raw = fakeStorage.getItem(SYNCED_KEY)
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw as string)).toEqual([entry.id])
    })
  })

  it('sin projectId, ninguno de los tres import() del SDK llega a ejecutarse y tga:history:synced no se escribe', async () => {
    const entry = baseEntry()
    seedHistory(fakeStorage, [entry])
    stubRuntimeConfig('')

    const getApps = vi.fn()
    vi.doMock('firebase/app', () => ({ getApps, initializeApp: vi.fn() }))
    const getAuth = vi.fn()
    vi.doMock('firebase/auth', () => ({ getAuth, onAuthStateChanged: vi.fn(), signInAnonymously: vi.fn() }))
    const getFirestore = vi.fn()
    vi.doMock('firebase/firestore', () => ({ getFirestore, doc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn() }))

    const { useHistorySync } = await import('../useHistorySync')
    const { flush } = useHistorySync()

    flush()

    // Sin ningún `await`: la guarda de configuración corta de forma
    // SÍNCRONA, antes de cualquier import() dinámico.
    expect(getApps).not.toHaveBeenCalled()
    expect(getAuth).not.toHaveBeenCalled()
    expect(getFirestore).not.toHaveBeenCalled()
    expect(fakeStorage.getItem(SYNCED_KEY)).toBeNull()
  })

  it('ensureAnonymousUser SÍ llama a signInAnonymously cuando onAuthStateChanged no entrega usuario, y NO cuando sí lo entrega', async () => {
    const entry = baseEntry({ id: 'entry-2' })
    seedHistory(fakeStorage, [entry])
    stubRuntimeConfig('test-project')

    const setDoc = vi.fn().mockResolvedValue(undefined)
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
      setDoc,
      serverTimestamp: vi.fn(() => '__server_timestamp__'),
    }))

    // Ver comentario del primer test sobre por qué el mock invoca de forma
    // asíncrona, no síncrona.
    const onAuthStateChanged = vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
      queueMicrotask(() => callback(null))
      return vi.fn()
    })
    const signInAnonymously = vi.fn().mockResolvedValue({ user: { uid: 'anon-uid-2' } })
    vi.doMock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})), onAuthStateChanged, signInAnonymously }))
    vi.doMock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})), getApps: vi.fn(() => []) }))

    const { useHistorySync } = await import('../useHistorySync')
    const { flush } = useHistorySync()

    flush()

    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1))
    expect(signInAnonymously).toHaveBeenCalledTimes(1)
    const documentBody = setDoc.mock.calls[0]![1] as Record<string, unknown>
    expect(documentBody.uid).toBe('anon-uid-2')
  })
})

describe('useHistorySync — Task 1 (plan 10-03): arrastre del atraso completo y poda de la lista de marcas (D-04/D-08)', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    vi.resetModules()
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { useRuntimeConfig?: unknown }).useRuntimeConfig
    vi.doUnmock('firebase/app')
    vi.doUnmock('firebase/auth')
    vi.doUnmock('firebase/firestore')
    vi.restoreAllMocks()
  })

  it('con tres entradas pendientes y ninguna marcada, un solo flush llama a setDoc tres veces y deja los tres ids marcados — sin tope por ráfaga (D-08)', async () => {
    const entries = [baseEntry({ id: 'a' }), baseEntry({ id: 'b' }), baseEntry({ id: 'c' })]
    seedHistory(fakeStorage, entries)
    stubRuntimeConfig('test-project')

    const setDoc = vi.fn().mockResolvedValue(undefined)
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
      setDoc,
      serverTimestamp: vi.fn(() => '__server_timestamp__'),
    }))
    mockWorkingAuthAndApp()

    const { useHistorySync } = await import('../useHistorySync')
    const { flush } = useHistorySync()
    flush()

    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(3))

    await vi.waitFor(() => {
      const raw = fakeStorage.getItem(SYNCED_KEY)
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw as string).sort()).toEqual(['a', 'b', 'c'])
    })
  })

  it('con dos de tres entradas ya marcadas, solo se sube la tercera', async () => {
    const entries = [baseEntry({ id: 'a' }), baseEntry({ id: 'b' }), baseEntry({ id: 'c' })]
    seedHistory(fakeStorage, entries)
    fakeStorage.setItem(SYNCED_KEY, JSON.stringify(['a', 'b']))
    stubRuntimeConfig('test-project')

    const setDoc = vi.fn().mockResolvedValue(undefined)
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
      setDoc,
      serverTimestamp: vi.fn(() => '__server_timestamp__'),
    }))
    mockWorkingAuthAndApp()

    const { useHistorySync } = await import('../useHistorySync')
    const { flush } = useHistorySync()
    flush()

    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1))
    expect(setDoc.mock.calls[0]![0]).toEqual(expect.objectContaining({ id: 'c' }))
  })

  it('un id marcado cuya entrada ya no está en tga:history desaparece de la lista tras el flush (D-04, poda perezosa)', async () => {
    // 'keep' ya está marcado y sigue en el histórico; 'stale' está marcado
    // pero su partida ya no existe en tga:history (se borró en /historico);
    // 'new' está en el histórico pero no marcado — es lo que hace que este
    // flush tenga trabajo real que hacer (la poda es OPORTUNISTA, dentro
    // del propio flush, nunca un paso aparte sin nada pendiente).
    seedHistory(fakeStorage, [baseEntry({ id: 'keep' }), baseEntry({ id: 'new' })])
    fakeStorage.setItem(SYNCED_KEY, JSON.stringify(['keep', 'stale']))
    stubRuntimeConfig('test-project')

    const setDoc = vi.fn().mockResolvedValue(undefined)
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
      setDoc,
      serverTimestamp: vi.fn(() => '__server_timestamp__'),
    }))
    mockWorkingAuthAndApp()

    const { useHistorySync } = await import('../useHistorySync')
    const { flush } = useHistorySync()
    flush()

    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => {
      const raw = fakeStorage.getItem(SYNCED_KEY)
      expect(JSON.parse(raw as string).sort()).toEqual(['keep', 'new'])
    })
  })

  it('tga:history:synced se escribe exactamente una vez por flush, contando llamadas a setItem con esa clave', async () => {
    seedHistory(fakeStorage, [baseEntry({ id: 'a' }), baseEntry({ id: 'b' })])
    stubRuntimeConfig('test-project')

    const setDoc = vi.fn().mockResolvedValue(undefined)
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
      setDoc,
      serverTimestamp: vi.fn(() => '__server_timestamp__'),
    }))
    mockWorkingAuthAndApp()

    const { useHistorySync } = await import('../useHistorySync')
    const { flush } = useHistorySync()
    flush()

    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(2))
    await vi.waitFor(() => expect(fakeStorage.getItem(SYNCED_KEY)).not.toBeNull())

    const syncedKeyWrites = fakeStorage.setItem.mock.calls.filter(call => call[0] === SYNCED_KEY)
    expect(syncedKeyWrites).toHaveLength(1)
  })
})

describe('useHistorySync — Task 2 (plan 10-03): el listener `online`, segundo disparador de D-02', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    vi.resetModules()
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { useRuntimeConfig?: unknown }).useRuntimeConfig
    vi.doUnmock('firebase/app')
    vi.doUnmock('firebase/auth')
    vi.doUnmock('firebase/firestore')
    vi.restoreAllMocks()
  })

  it('la primera invocación de useHistorySync() registra exactamente un listener de online y una segunda invocación no registra ninguno más', async () => {
    stubRuntimeConfig('test-project')
    vi.doMock('firebase/firestore', () => ({ getFirestore: vi.fn(), doc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn() }))
    mockWorkingAuthAndApp()

    const { useHistorySync } = await import('../useHistorySync')
    useHistorySync()
    useHistorySync()

    const addEventListener = windowAddEventListenerMock()
    expect(addEventListener).toHaveBeenCalledTimes(1)
    expect(addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
  })

  it('invocar el manejador de online con entradas pendientes y projectId configurado produce las llamadas a setDoc esperadas', async () => {
    seedHistory(fakeStorage, [baseEntry({ id: 'online-entry' })])
    stubRuntimeConfig('test-project')

    const setDoc = vi.fn().mockResolvedValue(undefined)
    vi.doMock('firebase/firestore', () => ({
      getFirestore: vi.fn(() => ({})),
      doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
      setDoc,
      serverTimestamp: vi.fn(() => '__server_timestamp__'),
    }))
    mockWorkingAuthAndApp()

    const { useHistorySync } = await import('../useHistorySync')
    useHistorySync()

    const onlineHandler = windowAddEventListenerMock().mock.calls[0]![1] as () => void
    onlineHandler()

    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1))
  })

  it('invocar el manejador de online SIN entradas pendientes no registra ni una sola llamada en los tres módulos doblados del SDK', async () => {
    // tga:history vacío — equivalente a que nadie haya terminado nunca una
    // partida en este dispositivo.
    stubRuntimeConfig('test-project')

    const getApps = vi.fn()
    vi.doMock('firebase/app', () => ({ getApps, initializeApp: vi.fn() }))
    const getAuth = vi.fn()
    vi.doMock('firebase/auth', () => ({ getAuth, onAuthStateChanged: vi.fn(), signInAnonymously: vi.fn() }))
    const getFirestore = vi.fn()
    vi.doMock('firebase/firestore', () => ({ getFirestore, doc: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn() }))

    const { useHistorySync } = await import('../useHistorySync')
    useHistorySync()

    const onlineHandler = windowAddEventListenerMock().mock.calls[0]![1] as () => void
    onlineHandler()

    expect(getApps).not.toHaveBeenCalled()
    expect(getAuth).not.toHaveBeenCalled()
    expect(getFirestore).not.toHaveBeenCalled()
  })
})
