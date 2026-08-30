// scripts/voice/fingerprint.mjs
//
// Qué es: huella (hash) de una cadena `speech`, usada para detectar deriva
// entre el contenido (content/marvel-champions.json) y el audio ya generado
// (D-03/D-04 de 03.1-CONTEXT.md).
//
// Qué decisión satisface: D-03 (guardar huella junto a cada audio) y el
// anti-patrón explícito de 03.1-RESEARCH.md "Normalizar/recortar la cadena
// speech antes de hashear" — NO se hace `trim()` ni `toLowerCase()` aquí a
// propósito. Cualquier cambio, por mínimo que sea (un espacio, una tilde),
// debe cambiar la huella y marcar el audio como obsoleto.
//
// Qué NO debe hacer: no lee ficheros, no sabe nada de ids ni de rutas.

import { createHash } from 'node:crypto'

/**
 * @param {string} speech - la cadena `speech` EXACTA tal y como aparece en el JSON
 * @returns {string} 16 caracteres hex (sha256 truncado)
 */
export function fingerprint(speech) {
  return createHash('sha256').update(speech, 'utf-8').digest('hex').slice(0, 16)
}
