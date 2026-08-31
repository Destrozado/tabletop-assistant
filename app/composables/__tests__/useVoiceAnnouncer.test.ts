// Tests puros de resolveVoiceState/shouldAnnounce/hasSpanishVoice/
// detectSpanishVoice/scheduleSpeakWatchdog (D-40/D-45/D-47/VOZ-05/VOZ-06/
// G-01). NO se monta el composable useVoiceAnnouncer() aquí: el entorno es
// `node` y useSpeechSynthesis construiria un SpeechSynthesisUtterance
// inexistente. scheduleSpeakWatchdog es la pieza extraída como función pura
// (mismo patrón que detectSpanishVoice) precisamente para poder testear el
// arreglo de G-01 sin necesitar jsdom ni montar el composable completo.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeAudioFallback, detectSpanishVoice, hasAudioStarted, hasSpanishVoice, resolveEffectiveAvailability, resolveVoiceState, scheduleAudioWatchdog, scheduleSpeakWatchdog, shouldAnnounce } from '../useVoiceAnnouncer'

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

  // Plan 03.1-05, VOZ-07: la locución no puede depender de las voces
  // instaladas en el sistema — con audio pregenerado disponible, la falta
  // de síntesis deja de ser motivo para callar.
  it('con audio pregenerado disponible, sin síntesis soportada -> true (VOZ-07)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: 'Hola', isSupported: false, hasAudio: true })).toBe(true)
  })

  it('con audio pregenerado disponible, voz silenciada -> false (el silencio manda también sobre el audio)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'muted', line: 'Hola', isSupported: false, hasAudio: true })).toBe(false)
  })

  it('con audio pregenerado disponible, kind summary -> false (D-40 sigue vigente)', () => {
    expect(shouldAnnounce({ kind: 'summary', state: 'on', line: 'Hola', isSupported: false, hasAudio: true })).toBe(false)
  })

  it('sin pasar hasAudio se comporta exactamente como antes de este plan (regresión de la Fase 3)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: 'Hola', isSupported: false })).toBe(false)
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: 'Hola', isSupported: true })).toBe(true)
  })

  it('hasAudio explícitamente false, con síntesis soportada -> true (equivalente al respaldo de la Fase 3)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: 'Hola', isSupported: true, hasAudio: false })).toBe(true)
  })

  it('con audio pregenerado disponible, estado unavailable -> false (la indisponibilidad sigue mandando)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'unavailable', line: 'Hola', isSupported: false, hasAudio: true })).toBe(false)
  })

  it('con audio pregenerado disponible, línea vacía -> false (WR-01 sigue vigente)', () => {
    expect(shouldAnnounce({ kind: 'step', state: 'on', line: '', isSupported: false, hasAudio: true })).toBe(false)
  })
})

describe('resolveEffectiveAvailability (plan 03.1-05, D-07/D-08: la banda solo aparece si fallan las DOS fuentes)', () => {
  it('audio disponible, con o sin voz española -> siempre true', () => {
    expect(resolveEffectiveAvailability(true, true)).toBe(true)
    expect(resolveEffectiveAvailability(true, false)).toBe(true)
    expect(resolveEffectiveAvailability(true, null)).toBe(true)
  })

  it('precarga de audio sin resolver (null) -> null, sin importar la voz española (no parpadea la banda)', () => {
    expect(resolveEffectiveAvailability(null, true)).toBe(null)
    expect(resolveEffectiveAvailability(null, false)).toBe(null)
    expect(resolveEffectiveAvailability(null, null)).toBe(null)
  })

  it('audio NO disponible -> se devuelve la disponibilidad de voz española tal cual', () => {
    expect(resolveEffectiveAvailability(false, true)).toBe(true)
    expect(resolveEffectiveAvailability(false, false)).toBe(false)
    expect(resolveEffectiveAvailability(false, null)).toBe(null)
  })
})

describe('scheduleAudioWatchdog (plan 03.1-05, T-03.1-17: clip que ni arranca ni falla)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('llama a onStall si hasStarted() sigue siendo false al vencer el retardo', () => {
    vi.useFakeTimers()
    const onStall = vi.fn()

    scheduleAudioWatchdog(() => false, onStall)
    vi.advanceTimersByTime(1200)

    expect(onStall).toHaveBeenCalledTimes(1)
  })

  it('NO llama a onStall si hasStarted() ya es true al vencer el retardo', () => {
    vi.useFakeTimers()
    const onStall = vi.fn()

    scheduleAudioWatchdog(() => true, onStall)
    vi.advanceTimersByTime(1200)

    expect(onStall).not.toHaveBeenCalled()
  })

  it('NO llama a onStall si se canceló antes de que venza el retardo', () => {
    vi.useFakeTimers()
    const onStall = vi.fn()

    const cancel = scheduleAudioWatchdog(() => false, onStall)
    cancel()
    vi.advanceTimersByTime(1200)

    expect(onStall).not.toHaveBeenCalled()
  })

  it('un onStall que lanza no propaga la excepción (VOZ-06)', () => {
    vi.useFakeTimers()
    const onStall = vi.fn(() => {
      throw new Error('boom')
    })

    scheduleAudioWatchdog(() => false, onStall)

    expect(() => vi.advanceTimersByTime(1200)).not.toThrow()
    expect(onStall).toHaveBeenCalledTimes(1)
  })

  it('respeta un delayMs personalizado y no dispara ni un instante antes', () => {
    vi.useFakeTimers()
    const onStall = vi.fn()

    scheduleAudioWatchdog(() => false, onStall, 500)

    vi.advanceTimersByTime(499)
    expect(onStall).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onStall).toHaveBeenCalledTimes(1)
  })

  it('el delayMs por defecto es 1200ms', () => {
    vi.useFakeTimers()
    const onStall = vi.fn()

    scheduleAudioWatchdog(() => false, onStall)

    vi.advanceTimersByTime(1199)
    expect(onStall).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onStall).toHaveBeenCalledTimes(1)
  })
})

// audio-corta-y-reinicia: el evento `playing` que `useVoiceAnnouncer`
// escucha para poner `audioStarted` a `true` puede no reflejarse a tiempo en
// Android/Chrome para un `<audio>` con `src` de tipo blob, aunque el clip SÍ
// esté sonando de forma audible. `hasAudioStarted` es la señal robusta que
// consulta scheduleAudioWatchdog: no depende en exclusiva de ese evento.
describe('hasAudioStarted (audio-corta-y-reinicia: señal robusta para el watchdog de audio)', () => {
  it('audioStarted true (el evento playing sí llegó) -> true, sin mirar el elemento', () => {
    expect(hasAudioStarted(true, null)).toBe(true)
    expect(hasAudioStarted(true, { currentTime: 0 })).toBe(true)
  })

  it('audioStarted false, pero currentTime > 0 (el clip suena aunque playing no ha llegado) -> true', () => {
    expect(hasAudioStarted(false, { currentTime: 0.05 })).toBe(true)
  })

  it('audioStarted false y currentTime en 0 (ni ha empezado a sonar, ni ha llegado el evento) -> false', () => {
    expect(hasAudioStarted(false, { currentTime: 0 })).toBe(false)
  })

  it('audioStarted false y audioEl null (T-03.1-17: el clip nunca llegó a montarse) -> false', () => {
    expect(hasAudioStarted(false, null)).toBe(false)
  })
})

// audio-corta-y-reinicia: el defecto real del bug. `speakFallback()` nunca
// llamaba a `stopAudio()` — si el watchdog disparaba con el clip realmente
// sonando (falso negativo de `playing`), `speechSynthesis.speak()` arrancaba
// ENCIMA del `<audio>` en curso. En Android, el TTS del sistema roba el foco
// de audio y pausa el elemento a media reproducción: "suena ~1s, se corta,
// la frase reinicia desde cero con otra voz" — exactamente el síntoma
// reportado. `composeAudioFallback` es el contrato que evita la regresión:
// stopAudio() SIEMPRE antes que speakFallback().
describe('composeAudioFallback (audio-corta-y-reinicia: el respaldo nunca debe solaparse con el clip)', () => {
  it('llama a stopAudio() antes que a speakFallback(), en ese orden', () => {
    const order: string[] = []
    const stopAudio = vi.fn(() => order.push('stopAudio'))
    const speakFallback = vi.fn(() => order.push('speakFallback'))

    composeAudioFallback(stopAudio, speakFallback)()

    expect(order).toEqual(['stopAudio', 'speakFallback'])
  })

  it('llama a ambas funciones exactamente una vez', () => {
    const stopAudio = vi.fn()
    const speakFallback = vi.fn()

    composeAudioFallback(stopAudio, speakFallback)()

    expect(stopAudio).toHaveBeenCalledTimes(1)
    expect(speakFallback).toHaveBeenCalledTimes(1)
  })

  it('con un <audio> falso: el elemento ya está pausado en el momento en que arranca el respaldo de síntesis', () => {
    // Modela el propio audioEl del composable: stopAudio() real llama a
    // audioEl.pause(), que en un elemento real detiene la reproducción de
    // forma síncrona. Este fake reproduce ese efecto observable.
    const fakeAudioEl = {
      paused: false,
      pause(this: { paused: boolean }): void {
        this.paused = true
      },
    }
    const stopAudio = (): void => fakeAudioEl.pause()
    let audioWasPausedWhenFallbackRan: boolean | null = null
    const speakFallback = vi.fn(() => {
      audioWasPausedWhenFallbackRan = fakeAudioEl.paused
    })

    composeAudioFallback(stopAudio, speakFallback)()

    // Antes de este arreglo, speakFallback() se llamaba sin pasar por
    // stopAudio(): esta aserción habría sido `false` (o `fakeAudioEl.paused`
    // ni siquiera se habría tocado), reproduciendo el solape que causaba el
    // corte y reinicio en Android.
    expect(audioWasPausedWhenFallbackRan).toBe(true)
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
