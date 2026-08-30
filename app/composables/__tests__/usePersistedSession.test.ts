// Tests puros de normalizeVoicePreference (D-46/D-47). NO se llama aquí a
// load/save/clear/loadVoicePreference/saveVoicePreference: esas funciones
// dependen de useLocalStorage, que en el entorno `node` del proyecto
// `app-logic` (sin contexto de Nuxt) no existe. Importar el módulo es
// seguro porque useLocalStorage solo se referencia dentro de cuerpos de
// función, nunca a nivel de módulo.
import { describe, expect, it } from 'vitest'
import { normalizeVoicePreference } from '../usePersistedSession'

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
