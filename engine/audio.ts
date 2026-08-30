// engine/audio.ts
// ÚNICA fuente de verdad TS del catálogo de identificadores de audio pregenerado
// (VOZ-07). El generador `scripts/voice/generate.mjs` (plan 03.1-03) no puede
// importar TypeScript, así que mantiene una copia en JS plano de la misma lógica
// de recorrido; el gate de deriva de ese mismo plan es lo único que impide que
// las dos copias se separen sin que nadie se entere.
//
// Cero imports de Vue/Nuxt/DOM y cero I/O: este módulo lo importa tanto el
// cliente (precarga del plan 03.1-04) como un test de Node (T-03.1-07).
import type { GameDefinition } from './types'

export interface SpeechEntry {
  id: string
  speech: string
}

// Recorre sections -> phases -> steps en orden de documento (mismo estilo
// flatMap que `allSteps` de content.test.ts): nunca listas de ids tecleadas,
// para que añadir/quitar contenido no exija tocar este fichero. Por cada paso,
// si declara `speech` propio emite su entrada base; después, por cada variante
// de dificultad que declare su propio `speech`, emite una entrada adicional
// `${step.id}.${difficulty}`. La entrada base va siempre antes que sus variantes.
export function collectSpeechEntries(game: GameDefinition): SpeechEntry[] {
  return game.sections.flatMap(section =>
    section.phases.flatMap(phase =>
      phase.steps.flatMap((step) => {
        const entries: SpeechEntry[] = []
        if (step.speech !== undefined) {
          entries.push({ id: step.id, speech: step.speech })
        }
        const difficultyVariants = step.variants?.difficulty
        if (difficultyVariants !== undefined) {
          for (const difficulty of Object.keys(difficultyVariants)) {
            const variantSpeech = difficultyVariants[difficulty as keyof typeof difficultyVariants]?.speech
            if (variantSpeech !== undefined) {
              entries.push({ id: `${step.id}.${difficulty}`, speech: variantSpeech })
            }
          }
        }
        return entries
      }),
    ),
  )
}

export function collectAudioIds(game: GameDefinition): string[] {
  return collectSpeechEntries(game).map(entry => entry.id)
}
