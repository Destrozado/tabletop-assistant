// scripts/voice/styles.mjs
//
// Qué es: catálogo de estilos de locución (D-02 de 03.1-CONTEXT.md) y el
// estilo activo. Única fuente de verdad compartida por el generador
// (scripts/voice/generate.mjs) y, más adelante, el gate de CI del plan
// 03.1-03 (que compara `style` contra lo grabado en manifest.json).
//
// Qué decisión satisface: D-02 — antes de generar las 36 frases, el usuario
// debe elegir uno de estos tres estilos escuchando la MISMA frase (PROBE_PHRASE)
// en los tres. D-11 — cambiar ACTIVE_STYLE implica regenerar con `--force`.
//
// Qué NO debe hacer: no construye el cuerpo de la petición a Gemini (eso es
// cosa de generate.mjs), no decide qué frases se locutan.

/**
 * Prefijo de estilo que se antepone a cada frase antes de enviarla a Gemini
 * TTS. Cadena vacía = sin instrucción de estilo (voz "en plano").
 */
export const STYLES = {
  plano: '',
  pausado: 'Di lo siguiente con un tono pausado e instructivo, como quien explica una regla de un juego de mesa: ',
  monitor: 'Di lo siguiente con un tono cercano y animado, como un monitor de juegos que guía a un grupo de amigos: ',
  'plano-agil': 'Di lo siguiente en tono neutro e informativo, con ritmo ágil y sin pausas largas, sin alegría ni entusiasmo: ',
}

/**
 * Estilo que usa el generador hoy. Fijado por el plan 03.1-03 (2026-08-31) con
 * la elección real del usuario en el checkpoint D-02 de 03.1-01-PLAN.md, tras
 * dos rondas de escucha sobre las 4 variantes: "El D esta bien, si" (ver
 * 03.1-01-SUMMARY.md §Decisiones, D-02). Cambiar este valor a mano invalida
 * todo el audio ya generado con el estilo anterior: hay que regenerar con
 * `--force` (D-11) tras el cambio.
 */
export const ACTIVE_STYLE = 'plano-agil'

/**
 * Frase de referencia usada para comparar estilos/voces. Es el `speech` real
 * de `setup.archienemigos.01` en content/marvel-champions.json — se reutiliza
 * aquí en vez de inventar una frase nueva para que la prueba de estilo suene
 * exactamente como sonará en la mesa.
 */
export const PROBE_PHRASE = 'Buscad el conjunto de Archienemigo (Nemesis) de vuestra identidad.'
