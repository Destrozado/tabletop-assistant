// scripts/voice/convert.mjs
//
// Qué es: constructor PURO del comando de conversión WAV -> M4A, uno por cada
// conversor soportado. No ejecuta nada, no importa módulos de Node (ni de
// procesos ni de ficheros): solo construye `{ command, args }` para que
// generate.mjs se lo pase a `execFileSync` (nunca shell).
//
// Qué decisión satisface: DQ-2 de 260923-3ri — el generador de voz solo corría
// en macOS porque exigía `afconvert` a ciegas. Este módulo añade `ffmpeg` como
// respaldo (Linux/WSL) SIN cambiar ni un argumento de la rama `afconvert`, que
// sigue siendo la primera opción en macOS (ver SUPPORTED_CONVERTERS).
//
// Qué NO debe hacer: no detecta qué conversor hay instalado (eso es cosa de
// generate.mjs), no lanza procesos, no lee ni escribe ficheros.

/**
 * Conversores soportados, en orden de preferencia: macOS conserva `afconvert`
 * como primera opción; `ffmpeg` es el respaldo para Linux/WSL.
 * @type {readonly ['afconvert', 'ffmpeg']}
 */
export const SUPPORTED_CONVERTERS = ['afconvert', 'ffmpeg']

/**
 * Construye el comando y los argumentos para convertir un WAV (24000 Hz,
 * mono, 16 bit, como lo entrega `wrapPcmAsWav`) a M4A (AAC LC, 64 kbps).
 *
 * @param {'afconvert' | 'ffmpeg'} converter
 * @param {string} wavPath - ruta del WAV de entrada
 * @param {string} m4aPath - ruta del M4A de salida
 * @returns {{ command: string, args: string[] }}
 */
export function buildM4aCommand(converter, wavPath, m4aPath) {
  if (converter === 'afconvert') {
    // Argumentos históricos de generate.mjs (antes de 260923-3ri): idénticos,
    // byte a byte, en el mismo orden.
    return {
      command: 'afconvert',
      args: ['-f', 'm4af', '-d', 'aac', '-b', '64000', wavPath, m4aPath],
    }
  }
  if (converter === 'ffmpeg') {
    // El WAV ya viene a 24000 Hz mono de wrapPcmAsWav: no remuestrear ni
    // forzar canales. -f ipod produce un contenedor M4A (major_brand=M4A),
    // no el .mp4 por defecto de ffmpeg.
    return {
      command: 'ffmpeg',
      args: [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        wavPath,
        '-c:a',
        'aac',
        '-b:a',
        '64k',
        '-f',
        'ipod',
        m4aPath,
      ],
    }
  }
  throw new Error(`Conversor desconocido: ${converter}. Soportados: ${SUPPORTED_CONVERTERS.join(', ')}`)
}
