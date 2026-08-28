// engine/toc.ts
// Índice de salto (FLOW-06, D-13): agrupa la secuencia aplanada por
// `phaseId` CONSECUTIVO (posición en el array, nunca un mapa por clave —
// romperia si una fase apareciera dos veces) y deriva las marcas `done`/
// `current`/null a partir de `cursor`, sin ningún estado adicional (D-14).
// Puro: misma entrada -> misma salida, nunca muta `sequence`. Cero imports
// de Vue/Nuxt/DOM y cero conocimiento de los bloques de Marvel Champions
// (TECH-04): las etiquetas de grupo salen siempre de `phaseTitle`.
import type { RuntimeStepNode } from './types'

export interface TocRow {
  id: string
  label: string
  mark: 'done' | 'current' | null
}

export interface TocBlock {
  label: string
  steps: TocRow[]
}

interface WorkingBlock extends TocBlock {
  phaseId: string
}

export function tableOfContents(sequence: RuntimeStepNode[], cursor: number): TocBlock[] {
  const blocks: WorkingBlock[] = []

  sequence.forEach((node, index) => {
    const mark: TocRow['mark'] = index < cursor ? 'done' : index === cursor ? 'current' : null
    const row: TocRow = { id: node.runtimeId, label: node.step.title, mark }

    const currentBlock = blocks[blocks.length - 1]
    if (currentBlock && currentBlock.phaseId === node.phaseId) {
      currentBlock.steps.push(row)
    }
    else {
      blocks.push({ phaseId: node.phaseId, label: node.phaseTitle, steps: [row] })
    }
  })

  return blocks.map(({ label, steps }) => ({ label, steps }))
}
