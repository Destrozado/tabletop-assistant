// engine/expand.ts
// Aplana el árbol y calcula loopStartIndex/loopEndIndex a partir de la única
// sección con repeats:true (o los deja undefined si no hay ninguna — hallazgo #3
// de 01-RESEARCH.md, vigente mientras esta fase relaja la invariante a "cero o una").
// No expande por jugador: no existe perPlayer (D-02/D-08).
import { flatten } from './flatten'
import type { EngineSession, GameDefinition, RuntimeStepNode, SessionContext } from './types'

export function expand(game: GameDefinition, context: SessionContext): EngineSession {
  const flat = flatten(game)
  const sequence: RuntimeStepNode[] = flat.map(node => ({
    ...node,
    runtimeId: node.step.id,
  }))

  const repeatingSectionId = game.sections.find(section => section.repeats)?.id

  let loopStartIndex: number | undefined
  let loopEndIndex: number | undefined
  if (repeatingSectionId !== undefined) {
    sequence.forEach((node, index) => {
      if (node.sectionId === repeatingSectionId) {
        if (loopStartIndex === undefined) {
          loopStartIndex = index
        }
        loopEndIndex = index
      }
    })
  }

  return {
    gameId: game.gameId,
    contentVersion: game.contentVersion,
    sequence,
    cursor: 0,
    round: 1,
    context,
    loopStartIndex,
    loopEndIndex,
  }
}
