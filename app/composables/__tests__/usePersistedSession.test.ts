// Tests puros de normalizeVoicePreference (D-46/D-47), MÁS (WR-02/WR-03)
// tests de las funciones con estado load/save/clear/loadVoicePreference/
// saveVoicePreference. Desde el fix de WR-02 estas funciones ya NO pasan por
// useLocalStorage/@vueuse — leen/escriben `window.localStorage` de forma
// directa e imperativa, así que son perfectamente testeables en el entorno
// `node` del proyecto `app-logic` con un `window`/`localStorage` de mentira:
// no hace falta jsdom/happy-dom ni contexto de Nuxt.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeVoicePreference, usePersistedSession } from '../usePersistedSession'
import type { EngineSession } from '~~/engine/types'

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
