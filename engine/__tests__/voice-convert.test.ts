// engine/__tests__/voice-convert.test.ts
//
// Test puro (260923-3ri) del constructor de comandos WAV->M4A por conversor.
// Nunca lanza procesos, nunca toca disco ni red (CI corre en ubuntu-latest
// sin garantía de ffmpeg y sin clave). Solo compara arrays en memoria.
import { describe, expect, it } from 'vitest'
import { buildM4aCommand, SUPPORTED_CONVERTERS } from '../../scripts/voice/convert.mjs'

const WAV_PATH = '/tmp/x.wav'
const M4A_PATH = '/tmp/x.m4a'

describe('buildM4aCommand (260923-3ri)', () => {
  it('afconvert: comando y argumentos históricos de generate.mjs (8 elementos, mismo orden)', () => {
    const { command, args } = buildM4aCommand('afconvert', WAV_PATH, M4A_PATH)
    expect(command).toBe('afconvert')
    expect(args).toEqual(['-f', 'm4af', '-d', 'aac', '-b', '64000', WAV_PATH, M4A_PATH])
  })

  it('ffmpeg: comando ffmpeg, pares adyacentes correctos, -y presente, W tras -i, M al final', () => {
    const { command, args } = buildM4aCommand('ffmpeg', WAV_PATH, M4A_PATH)
    expect(command).toBe('ffmpeg')
    expect(args).toContain('-y')
    const codecIndex = args.indexOf('-c:a')
    expect(args[codecIndex + 1]).toBe('aac')
    const bitrateIndex = args.indexOf('-b:a')
    expect(args[bitrateIndex + 1]).toBe('64k')
    const formatIndex = args.indexOf('-f')
    expect(args[formatIndex + 1]).toBe('ipod')
    const inputIndex = args.indexOf('-i')
    expect(args[inputIndex + 1]).toBe(WAV_PATH)
    expect(args[args.length - 1]).toBe(M4A_PATH)
  })

  it('conversor desconocido lanza un Error cuyo mensaje nombra el conversor recibido', () => {
    expect(() => buildM4aCommand('sox', WAV_PATH, M4A_PATH)).toThrowError(/sox/)
  })

  it('SUPPORTED_CONVERTERS es exactamente [afconvert, ffmpeg] (orden de preferencia)', () => {
    expect(SUPPORTED_CONVERTERS).toEqual(['afconvert', 'ffmpeg'])
  })
})
