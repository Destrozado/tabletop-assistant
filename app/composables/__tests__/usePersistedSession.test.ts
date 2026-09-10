// Tests puros de normalizeVoicePreference (D-46/D-47), MÁS (WR-02/WR-03)
// tests de las funciones con estado load/save/clear/loadVoicePreference/
// saveVoicePreference. Desde el fix de WR-02 estas funciones ya NO pasan por
// useLocalStorage/@vueuse — leen/escriben `window.localStorage` de forma
// directa e imperativa, así que son perfectamente testeables en el entorno
// `node` del proyecto `app-logic` con un `window`/`localStorage` de mentira:
// no hace falta jsdom/happy-dom ni contexto de Nuxt.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeVoicePreference, usePersistedSession } from '../usePersistedSession'
import type { EngineSession, GameHistoryEntry } from '~~/engine/types'

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

function makeSession(gameId: string, round = 1): EngineSession {
  return {
    gameId,
    contentVersion: 1,
    sequence: [],
    cursor: 0,
    round,
    context: { playerCount: 2, difficulty: 'normal' },
  }
}

function makeEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId: 'marvel-champions',
    result: 'won',
    lossCause: null,
    villainId: 'rhino',
    villainName: 'Rhino',
    players: [{ heroId: 'spider-man', heroName: 'Spider-Man', playerName: 'Jugador 1' }],
    difficulty: 'normal',
    playerCount: 1,
    round: 5,
    durationMs: 1_200_000,
    recordedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('normalizeVoicePreference (D-47: por defecto, la voz está activada)', () => {
  it('conserva true', () => {
    expect(normalizeVoicePreference(true)).toBe(true)
  })

  it('conserva false', () => {
    expect(normalizeVoicePreference(false)).toBe(false)
  })

  it('sin preferencia guardada (undefined) activa la voz por defecto', () => {
    expect(normalizeVoicePreference(undefined)).toBe(true)
  })

  it('null (dato ausente) activa la voz por defecto', () => {
    expect(normalizeVoicePreference(null)).toBe(true)
  })

  it('un string corrupto no silencia la app (solo el booleano false exacto silencia)', () => {
    expect(normalizeVoicePreference('false')).toBe(true)
  })

  it('un 0 numérico no silencia la app', () => {
    expect(normalizeVoicePreference(0)).toBe(true)
  })
})

describe('tga:voice-enabled — clave independiente de la partida (D-46)', () => {
  it('la clave de voz no comparte prefijo con las claves de progreso', () => {
    const KEY_PREFIX = 'tga:progress:'
    const VOICE_KEY = 'tga:voice-enabled'
    expect(VOICE_KEY.startsWith(KEY_PREFIX)).toBe(false)
  })
})

describe('usePersistedSession — funciones con estado (WR-02: sin listeners `window` de sobra; WR-03: cobertura nueva)', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>
  let addEventListener: ReturnType<typeof vi.fn>
  let removeEventListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage()
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeStorage,
      addEventListener,
      removeEventListener,
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    vi.restoreAllMocks()
  })

  it('D-46: clear() borra el progreso de la partida pero NUNCA la preferencia de voz', () => {
    const { save, clear, saveVoicePreference, load, loadVoicePreference } = usePersistedSession()

    saveVoicePreference(false)
    save(makeSession('marvel-champions'))

    expect(load('marvel-champions')).not.toBeNull()
    expect(loadVoicePreference()).toBe(false)

    clear('marvel-champions')

    expect(load('marvel-champions')).toBeNull()
    expect(loadVoicePreference()).toBe(false) // sobrevive a clear() — D-46
  })

  it('repetir save() en cada paso de partida no acumula listeners `window` (regresión WR-02: el useLocalStorage() por llamada previo registraba uno cada vez)', () => {
    const { save } = usePersistedSession()
    for (let i = 0; i < 20; i++) {
      save(makeSession('marvel-champions', i))
    }
    expect(addEventListener).not.toHaveBeenCalled()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('repetir toggle (saveVoicePreference) tampoco acumula listeners `window`', () => {
    const { saveVoicePreference } = usePersistedSession()
    for (let i = 0; i < 20; i++) {
      saveVoicePreference(i % 2 === 0)
    }
    expect(addEventListener).not.toHaveBeenCalled()
  })

  it('load() sobrevive a un localStorage que lanza al leer (modo privado/contexto restringido) — trata el fallo como ausencia de dato', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { load } = usePersistedSession()
    expect(() => load('marvel-champions')).not.toThrow()
    expect(load('marvel-champions')).toBeNull()
  })

  it('loadVoicePreference() sobrevive a un localStorage que lanza al leer y cae al valor por defecto activado (D-47)', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { loadVoicePreference } = usePersistedSession()
    expect(loadVoicePreference()).toBe(true)
  })

  it('save()/saveVoicePreference() sobreviven a un localStorage que lanza al escribir (cuota llena) sin romper la interacción', () => {
    fakeStorage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { save, saveVoicePreference } = usePersistedSession()
    expect(() => save(makeSession('marvel-champions'))).not.toThrow()
    expect(() => saveVoicePreference(false)).not.toThrow()
  })

  it('clear() sobrevive a un localStorage que lanza al borrar', () => {
    fakeStorage.removeItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { clear } = usePersistedSession()
    expect(() => clear('marvel-champions')).not.toThrow()
  })

  it('sin `window` (SSR/prerender): las lecturas devuelven valores por defecto y las escrituras no lanzan', () => {
    delete (globalThis as { window?: unknown }).window
    const { load, save, clear, loadVoicePreference, saveVoicePreference } = usePersistedSession()

    expect(load('marvel-champions')).toBeNull()
    expect(loadVoicePreference()).toBe(true)
    expect(() => save(makeSession('marvel-champions'))).not.toThrow()
    expect(() => clear('marvel-champions')).not.toThrow()
    expect(() => saveVoicePreference(false)).not.toThrow()
  })
})

describe('tga:history — clave independiente de la partida (D-13/HIST-09)', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    vi.restoreAllMocks()
  })

  it('HIST-09: clear(gameId) borra el progreso pero NUNCA el histórico', () => {
    const { save, clear, load, appendHistoryEntry, loadHistory } = usePersistedSession()

    save(makeSession('marvel-champions'))
    appendHistoryEntry(makeEntry())

    expect(load('marvel-champions')).not.toBeNull()
    expect(loadHistory()).toHaveLength(1)

    clear('marvel-champions')

    expect(load('marvel-champions')).toBeNull()
    expect(loadHistory()).toHaveLength(1) // sobrevive a clear() — D-13/HIST-09
  })

  it('HISTORY_KEY no comparte prefijo con KEY_PREFIX', () => {
    const KEY_PREFIX = 'tga:progress:'
    const HISTORY_KEY = 'tga:history'
    expect(HISTORY_KEY.startsWith(KEY_PREFIX)).toBe(false)
  })

  it('sin dato guardado, loadHistory() devuelve []', () => {
    const { loadHistory } = usePersistedSession()
    expect(loadHistory()).toEqual([])
  })

  it('JSON corrupto en tga:history devuelve [] y no lanza', () => {
    fakeStorage.setItem('tga:history', 'esto no es JSON válido {{{')
    const { loadHistory } = usePersistedSession()
    expect(() => loadHistory()).not.toThrow()
    expect(loadHistory()).toEqual([])
  })

  it('un envoltorio con formatVersion: 2 devuelve [] (punto de migración de D-13)', () => {
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 2, entries: [makeEntry()] }))
    const { loadHistory } = usePersistedSession()
    expect(loadHistory()).toEqual([])
  })

  it('un envoltorio con tres entradas de las que una está rota devuelve exactamente las dos buenas', () => {
    const good1 = makeEntry({ id: 'a' })
    const good2 = makeEntry({ id: 'b' })
    const broken = { ...makeEntry(), id: undefined } // sin id: forma inválida
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [good1, broken, good2] }))

    const { loadHistory } = usePersistedSession()
    const result = loadHistory()

    expect(result).toHaveLength(2)
    expect(result.map(e => e.id)).toEqual(['a', 'b'])
  })

  it('una entrada con result inválido se descarta sin tirar el resto', () => {
    const good = makeEntry({ id: 'good' })
    const brokenResult = { ...makeEntry({ id: 'bad' }), result: 'draw' }
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [good, brokenResult] }))

    const { loadHistory } = usePersistedSession()
    expect(loadHistory().map(e => e.id)).toEqual(['good'])
  })

  it('orden: dos appendHistoryEntry seguidos dejan la última entrada la primera del array', () => {
    const { appendHistoryEntry, loadHistory } = usePersistedSession()
    appendHistoryEntry(makeEntry({ id: 'first' }))
    appendHistoryEntry(makeEntry({ id: 'second' }))

    const result = loadHistory()
    expect(result[0]!.id).toBe('second')
    expect(result[1]!.id).toBe('first')
  })

  it('D-03: con un setItem que lanza (modo privado/cuota), appendHistoryEntry devuelve false y no lanza', () => {
    fakeStorage.setItem.mockImplementation(() => {
      throw new Error('quota')
    })
    const { appendHistoryEntry } = usePersistedSession()
    let result: boolean = true
    expect(() => {
      result = appendHistoryEntry(makeEntry())
    }).not.toThrow()
    expect(result).toBe(false)
  })

  it('D-03: con el localStorage falso normal, appendHistoryEntry devuelve true', () => {
    const { appendHistoryEntry } = usePersistedSession()
    expect(appendHistoryEntry(makeEntry())).toBe(true)
  })

  it('removeHistoryEntry(id) deja las demás entradas intactas', () => {
    const { appendHistoryEntry, removeHistoryEntry, loadHistory } = usePersistedSession()
    appendHistoryEntry(makeEntry({ id: 'keep-1' }))
    appendHistoryEntry(makeEntry({ id: 'remove-me' }))
    appendHistoryEntry(makeEntry({ id: 'keep-2' }))

    removeHistoryEntry('remove-me')

    const result = loadHistory()
    expect(result.map(e => e.id).sort()).toEqual(['keep-1', 'keep-2'])
  })

  it('removeHistoryEntry con un id inexistente no cambia nada ni lanza', () => {
    const { appendHistoryEntry, removeHistoryEntry, loadHistory } = usePersistedSession()
    appendHistoryEntry(makeEntry({ id: 'a' }))
    appendHistoryEntry(makeEntry({ id: 'b' }))

    expect(() => removeHistoryEntry('no-existe')).not.toThrow()
    expect(loadHistory().map(e => e.id).sort()).toEqual(['a', 'b'])
  })
})
