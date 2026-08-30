// scripts/voice/wav.mjs
//
// Qué es: envuelve PCM crudo (el formato que devuelve la API de Gemini TTS,
// verificado en 03.1-FINDINGS.md: mono, 24kHz, 16-bit) en una cabecera
// RIFF/WAVE canónica de 44 bytes, para que `afconvert` tenga un `.wav` válido
// como entrada.
//
// Qué decisión satisface: 03.1-RESEARCH.md §Don't Hand-Roll — el caso es fijo
// (mono/16-bit/24kHz, sin metadatos extra), así que este helper NO es un
// parser/writer de WAV genérico. No añadir soporte de otros chunks, otras
// tasas de muestreo variables en runtime, ni canales estéreo: si algún día
// hiciera falta, es una función nueva, no una ampliación de esta.
//
// Qué NO debe hacer: no lee ficheros, no habla con la red, no conoce Gemini.

/**
 * Construye un Buffer WAV completo (cabecera de 44 bytes + PCM) a partir de
 * PCM crudo sin contenedor.
 *
 * @param {Buffer} pcm - datos PCM crudos (little-endian, como los entrega Gemini TTS)
 * @param {number} [sampleRate=24000]
 * @param {number} [bitsPerSample=16]
 * @param {number} [channels=1]
 * @returns {Buffer}
 */
export function wrapPcmAsWav(pcm, sampleRate = 24000, bitsPerSample = 16, channels = 1) {
  const blockAlign = channels * (bitsPerSample / 8)
  const byteRate = sampleRate * blockAlign
  const header = Buffer.alloc(44)

  header.write('RIFF', 0) // ChunkID
  header.writeUInt32LE(36 + pcm.length, 4) // ChunkSize = 36 + Subchunk2Size
  header.write('WAVE', 8) // Format
  header.write('fmt ', 12) // Subchunk1ID
  header.writeUInt32LE(16, 16) // Subchunk1Size (PCM = 16)
  header.writeUInt16LE(1, 20) // AudioFormat (1 = PCM lineal)
  header.writeUInt16LE(channels, 22) // NumChannels
  header.writeUInt32LE(sampleRate, 24) // SampleRate
  header.writeUInt32LE(byteRate, 28) // ByteRate
  header.writeUInt16LE(blockAlign, 32) // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34) // BitsPerSample
  header.write('data', 36) // Subchunk2ID
  header.writeUInt32LE(pcm.length, 40) // Subchunk2Size

  return Buffer.concat([header, pcm])
}
