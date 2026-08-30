// Tests puros de resolveVoiceState/shouldAnnounce/hasSpanishVoice/
// detectSpanishVoice (D-40/D-45/D-47/VOZ-05/VOZ-06). NO se monta el
// composable useVoiceAnnouncer() aquí: el entorno es `node` y
// useSpeechSynthesis construiria un SpeechSynthesisUtterance inexistente.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectSpanishVoice, hasSpanishVoice, resolveVoiceState, shouldAnnounce } from '../useVoiceAnnouncer'

describe('resolveVoiceState (D-47: detección sin resolver es optimista)', () => {
  it('preferencia activada, disponibilidad sin resolver (null) -> on', () => {
    expect(resolveVoiceState(true, null)).toBe('on')
  })

  it('preferencia silenciada, disponibilidad sin resolver (null) -> muted', () => {
    expect(resolveVoiceState(false, null)).toBe('muted')
  })

  it('preferencia activada, disponible -> on', () => {
    expect(resolveVoiceState(true, true)).toBe('on')
  })

  it('preferencia silenciada, disponible -> muted', () => {
    expect(resolveVoiceState(false, true)).toBe('muted')
  })

  it('preferencia activada, NO disponible -> unavailable (la indisponibilidad gana)', () => {
    expect(resolveVoiceState(true, false)).toBe('unavailable')
  })

  it('preferencia silenciada, NO disponible -> unavailable', () => {
    expect(resolveVoiceState(false, false)).toBe('unavailable')
  })
})

describe('shouldAnnounce (D-40: Mesa lista no habla; VOZ-06: nunca sin síntesis)', () => {
  it('paso normal, voz on, con frase, síntesis soportada -> true', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: 'Hola', isSupported: true })).toBe(true)
  })

  it('kind summary (Mesa lista) nunca habla, aunque la voz esté on (D-40)', () => {
    expect(shouldAnnounce({ kind: 'summary', state: 'on', line: 'Hola', isSupported: true })).toBe(false)
  })

  it('kind null (sin nodo actual) no habla', () => {
    expect(shouldAnnounce({ kind: null, state: 'on', line: 'Hola', isSupported: true })).toBe(false)
  })

  it('voz muted no habla', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'muted', line: 'Hola', isSupported: true })).toBe(false)
  })

  it('voz unavailable no habla', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'unavailable', line: 'Hola', isSupported: true })).toBe(false)
  })

  it('línea vacía no habla (guarda WR-01 contra contenido sin frase)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: '', isSupported: true })).toBe(false)
  })

  it('sin síntesis soportada nunca se llama a speak() (VOZ-06)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: 'Hola', isSupported: false })).toBe(false)
  })
})

describe('hasSpanishVoice (03-RESEARCH.md §Pitfall 3: comparación gruesa deliberada)', () => {
  it('lista vacía -> false', () => {
    expect(hasSpanishVoice([])).toBe(false)
  })

  it('sin ninguna voz en-* -> false', () => {
    expect(hasSpanishVoice([{ lang: 'en-US' }, { lang: 'fr-FR' }])).toBe(false)
  })

  it('es-ES -> true', () => {
    expect(hasSpanishVoice([{ lang: 'es-ES' }])).toBe(true)
  })

  it('cualquier variante regional (es-MX) -> true', () => {
    expect(hasSpanishVoice([{ lang: 'es-MX' }])).toBe(true)
  })

  it('comparación insensible a mayúsculas (ES-es) -> true', () => {
    expect(hasSpanishVoice([{ lang: 'ES-es' }])).toBe(true)
  })

  it('basta con que una entrada sea es-* entre varias -> true', () => {
    expect(hasSpanishVoice([{ lang: 'en-US' }, { lang: 'es-419' }])).toBe(true)
  })
})

describe('detectSpanishVoice (T-03-09: carrera acotada, nunca bloquea la primera pintura)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('synth undefined (isSupported === false) llama a cb(false) una sola vez y de forma inmediata', () => {
    const cb = vi.fn()
    detectSpanishVoice(undefined, cb)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(false)
  })

  it('getVoices() ya no vacío llama a cb de inmediato sin listener ni temporizador', () => {
    const addEventListener = vi.fn()
    const synth = {
      getVoices: vi.fn(() => [{ lang: 'es-ES' }]),
      addEventListener,
    } as unknown as SpeechSynthesis
    const cb = vi.fn()

    detectSpanishVoice(synth, cb)

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(true)
    expect(addEventListener).not.toHaveBeenCalled()
  })

  it('getVoices() vacío registra voiceschanged con { once: true } y programa un temporizador; el listener llama a cb con el resultado de releer getVoices()', () => {
    let voiceschangedHandler: (() => void) | null = null
    const synth = {
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn((event: string, handler: () => void, options?: { once?: boolean }) => {
        expect(event).toBe('voiceschanged')
        expect(options).toEqual({ once: true })
        voiceschangedHandler = handler
      }),
    } as unknown as SpeechSynthesis
    const cb = vi.fn()

    detectSpanishVoice(synth, cb)

    expect(cb).not.toHaveBeenCalled()
    expect(voiceschangedHandler).not.toBeNull()

    ;(synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([{ lang: 'es-ES' }])
    voiceschangedHandler!()

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(true)
  })

  it('si voiceschanged no llega nunca, al agotarse el temporizador llama a cb exactamente una vez', () => {
    vi.useFakeTimers()
    const synth = {
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn(),
    } as unknown as SpeechSynthesis
    const cb = vi.fn()

    detectSpanishVoice(synth, cb, 2000)
    expect(cb).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(false)
  })

  it('nunca invoca el callback más de una vez, aunque el evento y el temporizador se disparen ambos', () => {
    vi.useFakeTimers()
    let voiceschangedHandler: (() => void) | null = null
    const synth = {
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        voiceschangedHandler = handler
      }),
    } as unknown as SpeechSynthesis
    const cb = vi.fn()

    detectSpanishVoice(synth, cb, 2000)
    ;(synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([{ lang: 'es-ES' }])
    voiceschangedHandler!()
    vi.advanceTimersByTime(2000)

    expect(cb).toHaveBeenCalledTimes(1)
  })
})
