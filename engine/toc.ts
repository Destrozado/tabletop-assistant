// engine/toc.ts
// Índice de salto (FLOW-06, D-13): agrupa la secuencia aplanada por
// `phaseId` CONSECUTIVO (posición en el array, nunca un mapa por clave —
// romperia si una fase apareciera dos veces) y deriva las marcas `done`/
// `current`/null a partir de `cursor`, sin ningún estado adicional (D-14).
// D-24/D-25 (Fase 2): dentro del tramo repetitivo (`node.sectionRepeats`),
// las filas nunca llevan `done` — solo `current` en el cursor y null en el
// resto, porque un `✓` significa "hecho y no vuelve", falso en un bucle. Y
// cuando el cursor está dentro del tramo repetitivo, los bloques de ese
// tramo se listan primero en su orden natural y los del tramo lineal van
// detrás con `dimmed: true`, como zona de consulta. Fuera del tramo
// repetitivo el comportamiento es byte a byte el de la Fase 1 (orden
// natural, `dimmed: false` en todo). Ambas reglas leen únicamente
// `sectionRepeats`, nunca un id de sección concreto (TECH-04).
// Puro: misma entrada -> misma salida, nunca muta `sequence`. Cero imports
// de Vue/Nuxt/DOM y cero conocimiento de los bloques de un juego concreto:
// las etiquetas de grupo salen siempre de `phaseTitle`.
import type { RuntimeStepNode } from './types'

export interface TocRow {
  id: string
  label: string
  mark: 'done' | 'current' | null
}

export interface TocBlock {
  label: string
  steps: TocRow[]
  dimmed: boolean
}

interface WorkingBlock {
  phaseId: string
  label: string
  steps: TocRow[]
  sectionRepeats: boolean
}

export function tableOfContents(sequence: RuntimeStepNode[], cursor: number): TocBlock[] {
  const insideLoop = sequence[cursor]?.sectionRepeats === true

  const blocks: WorkingBlock[] = []

  sequence.forEach((node, index) => {
    // D-25: dentro del tramo repetitivo jamás se emite 'done' — solo
    // 'current' para la fila del cursor y null para el resto, incluidas las
    // filas ya recorridas en esta misma pasada por la ronda.
    const mark: TocRow['mark'] = node.sectionRepeats
      ? (index === cursor ? 'current' : null)
      : (index < cursor ? 'done' : index === cursor ? 'current' : null)
    const row: TocRow = { id: node.runtimeId, label: node.step.title, mark }

    const currentBlock = blocks[blocks.length - 1]
    if (currentBlock && currentBlock.phaseId === node.phaseId) {
      currentBlock.steps.push(row)
    }
    else {
      blocks.push({ phaseId: node.phaseId, label: node.phaseTitle, steps: [row], sectionRepeats: node.sectionRepeats })
    }
  })

  if (!insideLoop) {
    return blocks.map(({ label, steps }) => ({ label, steps, dimmed: false }))
  }

  // D-24: el cursor está dentro del tramo repetitivo — los bloques de ese
  // tramo van primero en su orden natural; los bloques del tramo lineal
  // (p. ej. la preparación) van detrás, atenuados, como zona de consulta.
  const repeatingBlocks = blocks.filter(block => block.sectionRepeats)
  const nonRepeatingBlocks = blocks.filter(block => !block.sectionRepeats)

  return [
    ...repeatingBlocks.map(({ label, steps }) => ({ label, steps, dimmed: false })),
    ...nonRepeatingBlocks.map(({ label, steps }) => ({ label, steps, dimmed: true })),
  ]
}
