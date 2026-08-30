// Tests puros de resolveVoiceState/shouldAnnounce (D-40/D-45/D-47/VOZ-06). NO
// se monta el composable useVoiceAnnouncer() aquí: el entorno es `node` y
// useSpeechSynthesis construiria un SpeechSynthesisUtterance inexistente.
import { describe, expect, it } from 'vitest'
import { resolveVoiceState, shouldAnnounce } from '../useVoiceAnnouncer'

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
