// Tests puros de resolveVoiceState/shouldAnnounce/hasSpanishVoice/
// detectSpanishVoice/scheduleSpeakWatchdog (D-40/D-45/D-47/VOZ-05/VOZ-06/
// G-01). NO se monta el composable useVoiceAnnouncer() aquí: el entorno es
// `node` y useSpeechSynthesis construiria un SpeechSynthesisUtterance
// inexistente. scheduleSpeakWatchdog es la pieza extraída como función pura
// (mismo patrón que detectSpanishVoice) precisamente para poder testear el
// arreglo de G-01 sin necesitar jsdom ni montar el composable completo.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectSpanishVoice, hasSpanishVoice, resolveVoiceState, scheduleSpeakWatchdog, shouldAnnounce } from '../useVoiceAnnouncer'

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

// WR-01/WR-03: regresión del dangling listener + setTimeout de
// detectSpanishVoice. Antes del fix, la función devolvía `void` — el propio
// `const cancel = detectSpanishVoice(...); cancel()` de estos tests habría
// lanzado "cancel is not a function" contra el código previo. Cubre ambos
// caminos de resolución (evento y temporizador) y el camino de cancelación
// antes de que cualquiera de los dos dispare.
describe('detectSpanishVoice — limpieza del listener/temporizador al cancelar (WR-01)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('siempre devuelve una función de cancelación, incluso en los caminos que resuelven de forma síncrona', () => {
    expect(typeof detectSpanishVoice(undefined, vi.fn())).toBe('function')

    const synthWithVoices = {
      getVoices: vi.fn(() => [{ lang: 'es-ES' }]),
      addEventListener: vi.fn(),
    } as unknown as SpeechSynthesis
    expect(typeof detectSpanishVoice(synthWithVoices, vi.fn())).toBe('function')
  })

  it('cancelar ANTES de que voiceschanged o el temporizador disparen impide cualquier invocación posterior de cb', () => {
    vi.useFakeTimers()
    let voiceschangedHandler: (() => void) | null = null
    const removeEventListener = vi.fn()
    const synth = {
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        voiceschangedHandler = handler
      }),
      removeEventListener,
    } as unknown as SpeechSynthesis
    const cb = vi.fn()

    const cancel = detectSpanishVoice(synth, cb, 2000)
    cancel()

    // Ni un evento tardío...
    voiceschangedHandler!()
    // ...ni el temporizador de respaldo deben llegar a llamar a cb tras cancelar.
    vi.advanceTimersByTime(2000)

    expect(cb).not.toHaveBeenCalled()
    expect(removeEventListener).toHaveBeenCalledWith('voiceschanged', voiceschangedHandler)
  })

  it('resolver por voiceschanged limpia también el temporizador de respaldo (nada queda pendiente tras desmontar)', () => {
    vi.useFakeTimers()
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    let voiceschangedHandler: (() => void) | null = null
    const synth = {
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        voiceschangedHandler = handler
      }),
      removeEventListener: vi.fn(),
    } as unknown as SpeechSynthesis
    const cb = vi.fn()

    const cancel = detectSpanishVoice(synth, cb, 2000)
    ;(synth.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([{ lang: 'es-ES' }])
    voiceschangedHandler!()
    cancel()

    expect(cb).toHaveBeenCalledTimes(1)
    expect(clearTimeoutSpy).toHaveBeenCalled()
  })

  it('resolver por el temporizador de respaldo deja limpiable el listener — cancel() posterior no lanza ni repite cb', () => {
    vi.useFakeTimers()
    const removeEventListener = vi.fn()
    const synth = {
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn(),
      removeEventListener,
    } as unknown as SpeechSynthesis
    const cb = vi.fn()

    const cancel = detectSpanishVoice(synth, cb, 2000)
    vi.advanceTimersByTime(2000)
    expect(cb).toHaveBeenCalledTimes(1)

    expect(() => cancel()).not.toThrow()
    expect(removeEventListener).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })
})

// G-01 (03-VERIFICATION.md): en Chrome/Android, useSpeechSynthesis().speak()
// de @vueuse/core ejecuta synth.cancel() + synth.speak() de forma sincrona y
// consecutiva (confirmado leyendo node_modules/@vueuse/core/dist/index.js:
// 6578-6581); cancel() se procesa ahi de forma asincrona y puede descartar
// el utterance que speak() acaba de encolar en el mismo tick, sin lanzar
// ningun error — la locucion del paso destino nunca arranca. Reproducido en
// Samsung Galaxy S21 / Android 15 / Chrome; NO reproducible esperando a que
// la frase actual termine antes de pulsar SIGUIENTE.
describe('scheduleSpeakWatchdog (G-01: reintento acotado tras la carrera cancel()/speak() de Android)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // Modela el propio speak() de @vueuse/core (cancel()+speak() sincronos) con
  // un fake synth cuyo cancel() "gana la carrera" la PRIMERA vez y descarta
  // el utterance que speak() acaba de encolar en el mismo tick (onstart
  // nunca llega -> status se queda en 'init'). A partir de la segunda
  // llamada (el reintento del watchdog) ya no hay nada que descartar, asi
  // que speak() sobrevive y onstart si dispara — la misma asimetria
  // observada en el dispositivo real.
  function makeAndroidRaceHarness() {
    let status: 'init' | 'play' = 'init'
    let callCount = 0
    const fakeSynth = {
      cancel: vi.fn(),
      speak: vi.fn((utterance: { onstart: () => void }) => {
        callCount += 1
        if (callCount === 1) return // la carrera: este utterance se pierde
        utterance.onstart()
      }),
    }
    function speak(): void {
      fakeSynth.cancel()
      fakeSynth.speak({ onstart: () => { status = 'play' } })
    }
    return { speak, getStatus: () => status, fakeSynth }
  }

  it('reintenta speak() exactamente una vez cuando el primer intento se pierde por la carrera cancel()/speak() de Android', () => {
    vi.useFakeTimers()
    const { speak, getStatus, fakeSynth } = makeAndroidRaceHarness()

    speak() // intento sincrono en el tap (announce()) — se pierde por la carrera
    expect(getStatus()).toBe('init')
    expect(fakeSynth.speak).toHaveBeenCalledTimes(1)

    scheduleSpeakWatchdog(speak, getStatus)
    vi.advanceTimersByTime(200)

    expect(fakeSynth.speak).toHaveBeenCalledTimes(2) // el watchdog reintento UNA vez
    expect(getStatus()).toBe('play') // el reintento si arranco
  })

  it('NO reintenta si el intento sincrono ya arranco antes de expirar el retraso (camino iOS/desktop, sin carrera)', () => {
    vi.useFakeTimers()
    let status: 'init' | 'play' = 'init'
    const fakeSynth = {
      cancel: vi.fn(),
      speak: vi.fn((utterance: { onstart: () => void }) => utterance.onstart()),
    }
    function speak(): void {
      fakeSynth.cancel()
      fakeSynth.speak({ onstart: () => { status = 'play' } })
    }

    speak() // arranca en la misma llamada, sin carrera
    expect(status).toBe('play')
    expect(fakeSynth.speak).toHaveBeenCalledTimes(1)

    scheduleSpeakWatchdog(speak, () => status)
    vi.advanceTimersByTime(200)

    expect(fakeSynth.speak).toHaveBeenCalledTimes(1) // el watchdog fue un no-op
  })

  it('una segunda navegacion (cancel() del watchdog) impide el reintento — nunca se encola ni repite (VOZ-04)', () => {
    vi.useFakeTimers()
    const speak = vi.fn()

    const cancelWatchdog = scheduleSpeakWatchdog(speak, () => 'init')
    cancelWatchdog() // equivalente a que announce()/silence() se llamen de nuevo

    vi.advanceTimersByTime(1000)

    expect(speak).not.toHaveBeenCalled()
  })

  it('el reintento es acotado a UNO: si tras reintentar el estado sigue en \'init\', no se programa un segundo watchdog', () => {
    vi.useFakeTimers()
    const speak = vi.fn() // nunca hace avanzar status — simula que el reintento tambien fallo

    scheduleSpeakWatchdog(speak, () => 'init')
    vi.advanceTimersByTime(200)
    expect(speak).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(10_000)
    expect(speak).toHaveBeenCalledTimes(1) // sigue en 1: nunca se convierte en un bucle
  })

  it('un throw durante el reintento no se propaga (VOZ-06: jamas debe romper next()/prev())', () => {
    vi.useFakeTimers()
    const speak = vi.fn(() => {
      throw new Error('boom')
    })

    scheduleSpeakWatchdog(speak, () => 'init')

    expect(() => vi.advanceTimersByTime(200)).not.toThrow()
    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('respeta un delayMs personalizado y no dispara ni un instante antes', () => {
    vi.useFakeTimers()
    const speak = vi.fn()

    scheduleSpeakWatchdog(speak, () => 'init', 250)

    vi.advanceTimersByTime(249)
    expect(speak).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(speak).toHaveBeenCalledTimes(1)
  })

  it('el delayMs por defecto es 200ms', () => {
    vi.useFakeTimers()
    const speak = vi.fn()

    scheduleSpeakWatchdog(speak, () => 'init')

    vi.advanceTimersByTime(199)
    expect(speak).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(speak).toHaveBeenCalledTimes(1)
  })
})
