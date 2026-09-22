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

  it('save() devuelve true cuando el progreso queda escrito de verdad (CR-01 ronda 4)', () => {
    const { save } = usePersistedSession()
    const result = save(makeSession('marvel-champions'))

    expect(result).toBe(true)
    expect(fakeStorage.setItem).toHaveBeenCalledWith('tga:progress:marvel-champions', expect.any(String))
  })

  it('save() devuelve false cuando setItem lanza (modo privado/cuota) — CR-01 ronda 4: es el único dato capaz de sostener lo que el aviso le dice al grupo', () => {
    fakeStorage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { save } = usePersistedSession()

    let result: boolean = true
    expect(() => {
      result = save(makeSession('marvel-champions'))
    }).not.toThrow()
    expect(result).toBe(false)
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

  it('CR-03: con formatVersion: 2 guardado, appendHistoryEntry devuelve false y el blob v2 sigue intacto', () => {
    const seeded = JSON.stringify({ formatVersion: 2, entries: [makeEntry({ id: 'v2-a' }), makeEntry({ id: 'v2-b' })] })
    fakeStorage.setItem('tga:history', seeded)

    const { appendHistoryEntry } = usePersistedSession()
    const result = appendHistoryEntry(makeEntry())

    expect(result).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBe(seeded)
  })

  it('CR-03: con JSON no parseable guardado, appendHistoryEntry devuelve false y la cadena sigue intacta', () => {
    const seeded = 'esto no es JSON válido {{{'
    fakeStorage.setItem('tga:history', seeded)

    const { appendHistoryEntry } = usePersistedSession()
    const result = appendHistoryEntry(makeEntry())

    expect(result).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBe(seeded)
  })

  it('CR-03: con formatVersion: 2 guardado, removeHistoryEntry no escribe nada', () => {
    const seeded = JSON.stringify({ formatVersion: 2, entries: [makeEntry({ id: 'v2-a' }), makeEntry({ id: 'v2-b' })] })
    fakeStorage.setItem('tga:history', seeded)
    fakeStorage.setItem.mockClear()

    const { removeHistoryEntry } = usePersistedSession()
    removeHistoryEntry('v2-a')

    expect(fakeStorage.setItem).not.toHaveBeenCalledWith('tga:history', expect.anything())
    expect(fakeStorage.getItem('tga:history')).toBe(seeded)
  })

  it('CR-03: una entrada ilegible sobrevive en disco a un removeHistoryEntry de otra entrada', () => {
    const keep = makeEntry({ id: 'keep' })
    const broken = { id: 'rota' } // no pasa isGameHistoryEntry (forma incompleta)
    const borrar = makeEntry({ id: 'borrar' })
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [keep, broken, borrar] }))

    const { removeHistoryEntry, loadHistory } = usePersistedSession()
    removeHistoryEntry('borrar')

    const persisted = JSON.parse(fakeStorage.getItem('tga:history')!)
    expect(persisted.entries).toHaveLength(2)
    expect(persisted.entries.some((e: { id: string }) => e.id === 'rota')).toBe(true)

    // Se filtra de cara a la PANTALLA, nunca de cara al DISCO.
    expect(loadHistory().map(e => e.id)).toEqual(['keep'])
  })

  it('CR-01: una entrada con players: [null] no supera loadHistory()', () => {
    const buena = makeEntry({ id: 'buena' })
    const rota = { ...makeEntry({ id: 'rota' }), players: [null] as never }
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [buena, rota] }))

    const { loadHistory } = usePersistedSession()
    expect(loadHistory().map(e => e.id)).toEqual(['buena'])
  })

  it('CR-01: una entrada con players: [{}] no supera loadHistory()', () => {
    const buena = makeEntry({ id: 'buena' })
    const rota = { ...makeEntry({ id: 'rota' }), players: [{}] as never }
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [buena, rota] }))

    const { loadHistory } = usePersistedSession()
    expect(loadHistory().map(e => e.id)).toEqual(['buena'])
  })

  it('CR-02: una entrada con villainId numérico y villainName null no supera loadHistory()', () => {
    const buena = makeEntry({ id: 'buena' })
    const rota = makeEntry({ id: 'rota', villainId: 5 as never, villainName: null })
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [buena, rota] }))

    const { loadHistory } = usePersistedSession()
    expect(loadHistory().map(e => e.id)).toEqual(['buena'])
  })

  it('CR-02: una entrada con players: [{ heroId: 7, ... }] no supera loadHistory()', () => {
    const buena = makeEntry({ id: 'buena' })
    const rota = makeEntry({ id: 'rota', players: [{ heroId: 7, heroName: null, playerName: 'Ana' }] as never })
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [buena, rota] }))

    const { loadHistory } = usePersistedSession()
    expect(loadHistory().map(e => e.id)).toEqual(['buena'])
  })

  it('WR-08: removeHistoryEntry elimina como máximo una entrada aunque dos compartan id', () => {
    const dup1 = makeEntry({ id: 'dup' })
    const dup2 = makeEntry({ id: 'dup' })
    fakeStorage.setItem('tga:history', JSON.stringify({ formatVersion: 1, entries: [dup1, dup2] }))

    const { removeHistoryEntry } = usePersistedSession()
    removeHistoryEntry('dup')

    const persisted = JSON.parse(fakeStorage.getItem('tga:history')!)
    expect(persisted.entries).toHaveLength(1)
  })
  it('CR-01 (ronda 2): appendHistoryEntry de una entrada sin difficulty devuelve false y no escribe nada', () => {
    const { appendHistoryEntry } = usePersistedSession()
    const result = appendHistoryEntry(makeEntry({ difficulty: undefined as never }))

    expect(result).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBeNull()
    expect(fakeStorage.setItem.mock.calls.some(call => call[0] === 'tga:history')).toBe(false)
  })

  it('CR-01 (ronda 2): appendHistoryEntry de una entrada sin playerCount devuelve false y no escribe nada', () => {
    const { appendHistoryEntry } = usePersistedSession()
    const result = appendHistoryEntry(makeEntry({ playerCount: undefined as never }))

    expect(result).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBeNull()
    expect(fakeStorage.setItem.mock.calls.some(call => call[0] === 'tga:history')).toBe(false)
  })

  it('CR-01 (ronda 2): appendHistoryEntry de una entrada con round: NaN devuelve false y no escribe nada', () => {
    const { appendHistoryEntry } = usePersistedSession()
    const result = appendHistoryEntry(makeEntry({ round: Number.NaN }))

    expect(result).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBeNull()
    expect(fakeStorage.setItem.mock.calls.some(call => call[0] === 'tga:history')).toBe(false)
  })

  it('CR-01 (ronda 2): una entrada válida sigue escribiéndose (el camino feliz no se degrada)', () => {
    const { appendHistoryEntry, loadHistory } = usePersistedSession()
    expect(appendHistoryEntry(makeEntry({ id: 'ok' }))).toBe(true)
    expect(loadHistory().map(e => e.id)).toEqual(['ok'])
  })

  it('CR-01 (ronda 2): con entradas previas, una entrada inválida no las toca (blob intacto byte a byte)', () => {
    const { appendHistoryEntry } = usePersistedSession()
    appendHistoryEntry(makeEntry({ id: 'previa' }))
    const seeded = fakeStorage.getItem('tga:history')

    const result = appendHistoryEntry(makeEntry({ difficulty: undefined as never }))

    expect(result).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBe(seeded)
  })

  it('WR-03: round/playerCount/durationMs con Infinity no superan loadHistory() (localStorage manipulado con el literal JSON `1e400`, que `JSON.parse` sí acepta y convierte a `Infinity` — `NaN`/`Infinity` no son literales JSON válidos, así que un blob real solo puede colar un número fuera de rango de esta forma, nunca `NaN`)', () => {
    const buena = makeEntry({ id: 'buena' })
    const rotaRound = makeEntry({ id: 'rota-round', round: 999 })
    const rotaPlayerCount = makeEntry({ id: 'rota-playercount', playerCount: 998 })
    const rotaDuration = makeEntry({ id: 'rota-duration', durationMs: 997 })
    let raw = JSON.stringify({
      formatVersion: 1,
      entries: [buena, rotaRound, rotaPlayerCount, rotaDuration],
    })
    raw = raw.replace('"round":999', '"round":1e400')
    raw = raw.replace('"playerCount":998', '"playerCount":1e400')
    raw = raw.replace('"durationMs":997', '"durationMs":1e400')
    fakeStorage.setItem('tga:history', raw)

    const { loadHistory } = usePersistedSession()
    expect(loadHistory().map(e => e.id)).toEqual(['buena'])
  })
})

describe('CR-01 (ronda 3): un fallo TRANSITORIO de lectura de localStorage nunca autoriza a reconstruir el histórico', () => {
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

  it('CR-01 (ronda 3): dos partidas registradas sobreviven a un getItem que lanza una única vez', () => {
    const { appendHistoryEntry, loadHistory } = usePersistedSession()

    expect(appendHistoryEntry(makeEntry({ id: 'partida-1' }))).toBe(true)
    expect(appendHistoryEntry(makeEntry({ id: 'partida-2' }))).toBe(true)
    expect(loadHistory().map(e => e.id)).toEqual(['partida-2', 'partida-1'])

    const seeded = fakeStorage.getItem('tga:history')

    fakeStorage.getItem.mockImplementationOnce(() => {
      throw new Error('SecurityError')
    })

    const result = appendHistoryEntry(makeEntry({ id: 'partida-3' }))

    expect(result).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBe(seeded)
    expect(loadHistory().map(e => e.id)).toEqual(['partida-2', 'partida-1'])
  })

  it('CR-01 (ronda 3): con la lectura caída, setItem no llega a invocarse para tga:history', () => {
    const { appendHistoryEntry } = usePersistedSession()

    appendHistoryEntry(makeEntry({ id: 'partida-1' }))
    appendHistoryEntry(makeEntry({ id: 'partida-2' }))
    fakeStorage.setItem.mockClear()

    fakeStorage.getItem.mockImplementationOnce(() => {
      throw new Error('SecurityError')
    })
    appendHistoryEntry(makeEntry({ id: 'partida-3' }))

    expect(fakeStorage.setItem.mock.calls.filter(call => call[0] === 'tga:history')).toHaveLength(0)
  })

  it('CR-01 (ronda 3): removeHistoryEntry con la lectura caída no escribe nada y el blob sigue intacto', () => {
    const seeded = JSON.stringify({ formatVersion: 1, entries: [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })] })
    fakeStorage.setItem('tga:history', seeded)
    fakeStorage.setItem.mockClear()

    fakeStorage.getItem.mockImplementationOnce(() => {
      throw new Error('SecurityError')
    })

    const { removeHistoryEntry } = usePersistedSession()
    expect(() => removeHistoryEntry('a')).not.toThrow()

    expect(fakeStorage.setItem.mock.calls.some(call => call[0] === 'tga:history')).toBe(false)
    expect(fakeStorage.getItem('tga:history')).toBe(seeded)
  })

  it('CR-01 (ronda 3): el contrato hacia la pantalla no cambia — loadHistory() devuelve [] sin lanzar con getItem siempre lanzando', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const { loadHistory } = usePersistedSession()
    expect(() => loadHistory()).not.toThrow()
    expect(loadHistory()).toEqual([])
  })

  it('CR-01 (ronda 3): anti-regresión de la vía legítima — tga:history genuinamente ausente sigue permitiendo escribir', () => {
    const { appendHistoryEntry, loadHistory } = usePersistedSession()

    const result = appendHistoryEntry(makeEntry({ id: 'primera' }))

    expect(result).toBe(true)
    expect(loadHistory().map(e => e.id)).toEqual(['primera'])
    expect(JSON.parse(fakeStorage.getItem('tga:history')!).formatVersion).toBe(1)
  })

  it('CR-01 (ronda 3): SSR/prerender — sin window, loadHistory/appendHistoryEntry/removeHistoryEntry ni leen ni escriben el histórico', () => {
    delete (globalThis as { window?: unknown }).window
    const { loadHistory, appendHistoryEntry, removeHistoryEntry } = usePersistedSession()

    expect(loadHistory()).toEqual([])
    expect(appendHistoryEntry(makeEntry())).toBe(false)
    expect(() => removeHistoryEntry('x')).not.toThrow()
  })

  it('CR-01 (ronda 3): el endurecimiento no se propaga a los datos reconstruibles — load()/loadVoicePreference() siguen degradando en silencio', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const { load, loadVoicePreference } = usePersistedSession()
    expect(load('marvel-champions')).toBeNull()
    expect(loadVoicePreference()).toBe(true)
  })
})

describe('readProgress (CR-01 ronda 5): «no he podido leer» deja de confundirse con «no hay nada»', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: fakeStorage }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    vi.restoreAllMocks()
  })

  it('clave ausente (nada escrito) → { read: "ok", position: null }', () => {
    const { readProgress } = usePersistedSession()
    expect(readProgress('marvel-champions')).toEqual({ read: 'ok', position: null })
  })

  it('tras save() → { read: "ok", position: <no nulo> } con el gameId correcto', () => {
    const { save, readProgress } = usePersistedSession()
    save(makeSession('marvel-champions'))

    const lectura = readProgress('marvel-champions')
    expect(lectura.read).toBe('ok')
    expect(lectura.read === 'ok' ? lectura.position?.gameId : undefined).toBe('marvel-champions')
  })

  it('JSON corrupto → { read: "ok", position: null } — lectura correcta, contenido inservible', () => {
    fakeStorage.setItem('tga:progress:marvel-champions', '{ esto no es JSON')

    const { readProgress } = usePersistedSession()
    expect(readProgress('marvel-champions')).toEqual({ read: 'ok', position: null })
  })

  it('getItem que lanza → { read: "failed" }, y load() sigue devolviendo null (el contrato viejo no cambia)', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const { readProgress, load } = usePersistedSession()
    expect(readProgress('marvel-champions')).toEqual({ read: 'failed' })
    expect(load('marvel-champions')).toBeNull()
  })

  it('sin window → { read: "failed" }', () => {
    delete (globalThis as { window?: unknown }).window

    const { readProgress } = usePersistedSession()
    expect(readProgress('marvel-champions')).toEqual({ read: 'failed' })
  })
})

describe('tga:history:synced (D-01/D-04, plan 10-03): la marca de sincronizado con Firestore', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>
  const SYNCED_KEY = 'tga:history:synced'

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

  it('sin clave guardada, loadSyncedIds() devuelve []', () => {
    const { loadSyncedIds } = usePersistedSession()
    expect(loadSyncedIds()).toEqual([])
  })

  it('con JSON corrupto en tga:history:synced, loadSyncedIds() devuelve [] y no lanza — colapso deliberado (D-01), la clave es reconstruible', () => {
    fakeStorage.setItem(SYNCED_KEY, 'esto no es JSON válido {{{')
    const { loadSyncedIds } = usePersistedSession()
    expect(() => loadSyncedIds()).not.toThrow()
    expect(loadSyncedIds()).toEqual([])
  })

  it('con un getItem que lanza, loadSyncedIds() devuelve [] y no lanza — mismo colapso que loadVoicePreference, nunca el de tga:history', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const { loadSyncedIds } = usePersistedSession()
    expect(() => loadSyncedIds()).not.toThrow()
    expect(loadSyncedIds()).toEqual([])
  })

  it('saveSyncedIds() escribe un array JSON de ids', () => {
    const { saveSyncedIds } = usePersistedSession()
    saveSyncedIds(['a', 'b'])
    expect(JSON.parse(fakeStorage.getItem(SYNCED_KEY)!)).toEqual(['a', 'b'])
  })

  it('saveSyncedIds() no lanza cuando setItem lanza (cuota llena) — mismo criterio que saveVoicePreference, un fallo aquí solo produce un reintento de más', () => {
    fakeStorage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { saveSyncedIds } = usePersistedSession()
    expect(() => saveSyncedIds(['a'])).not.toThrow()
  })

  it('un ida y vuelta saveSyncedIds() → loadSyncedIds() conserva los ids', () => {
    const { saveSyncedIds, loadSyncedIds } = usePersistedSession()
    saveSyncedIds(['x', 'y', 'z'])
    expect(loadSyncedIds()).toEqual(['x', 'y', 'z'])
  })
})

