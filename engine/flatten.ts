// engine/flatten.ts
// Recorre el árbol autorado (sección → fase → paso) una sola vez y devuelve
// el array ordenado de FlatStepNode. Puro, sin estado de módulo.
import type { FlatStepNode, GameDefinition } from './types'

export function flatten(game: GameDefinition): FlatStepNode[] {
  const nodes: FlatStepNode[] = []

  for (const section of game.sections) {
    for (const phase of section.phases) {
      for (const step of phase.steps) {
        nodes.push({
          step,
          sectionId: section.id,
          sectionTitle: section.title,
          sectionRepeats: section.repeats,
          phaseId: phase.id,
          phaseTitle: phase.title,
          breadcrumb: `${section.title} › ${phase.title}`,
        })
      }
    }
  }

  return nodes
}
