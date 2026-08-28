// app/composables/useGameSession.ts
// La ÚNICA costura reactiva entre el motor puro (`~~/engine/*`) y Vue. Ningún
// componente importa `~~/engine/*` directamente: si algún componente necesitara
// algo del motor, falta una computed aquí (ARCHITECTURE.md §3/§5).
//
// `next`/`prev`/`jumpTo` del motor son puras y devuelven sesiones NUEVAS — este
// composable solo reasigna el ref, nunca muta `session.value` in situ.
import { computed, ref } from 'vue'
import { expand } from '~~/engine/expand'
import { jumpTo as engineJumpTo, next as engineNext, prev as enginePrev } from '~~/engine/navigator'
import { resolveText } from '~~/engine/resolve'
import type { EngineSession, RuntimeStepNode, SessionContext, TextBlock } from '~~/engine/types'
import { useGameContent } from './useGameContent'

export function useGameSession() {
  const session = ref<EngineSession | null>(null)

  function start(gameId: string, context: SessionContext) {
    const { getGame } = useGameContent()
    const game = getGame(gameId)
    session.value = game ? expand(game, context) : null
  }

  function next() {
    if (!session.value) return
    session.value = engineNext(session.value)
  }

  function prev() {
    if (!session.value) return
    session.value = enginePrev(session.value)
  }

  function jumpTo(runtimeId: string) {
    if (!session.value) return
    session.value = engineJumpTo(session.value, runtimeId)
  }

  const currentNode = computed<RuntimeStepNode | null>(() => {
    if (!session.value) return null
    return session.value.sequence[session.value.cursor] ?? null
  })

  const currentText = computed<TextBlock>(() => {
    if (!session.value || !currentNode.value) return { text: '' }
    return resolveText(currentNode.value, session.value.context)
  })

  // Derivada del nodo actual, nunca codificada contra el id 'setup': es el punto
  // de extensión de D-11 para la cabecera de la Fase 2 (`RONDA 4 · Villano`).
  const sectionLabel = computed<string>(() => {
    if (!currentNode.value) return ''
    return currentNode.value.sectionTitle.toUpperCase()
  })

  // Solo cuenta nodos kind === 'step'. null cuando el nodo actual es
  // kind === 'summary' (D-03: la pantalla de repaso no es "el paso 24 de 24").
  // Fallback ?? 'step' (WR-01): el `.default('step')` de GameDefinitionSchema
  // solo se aplica en Vitest/CI (validateGameDefinition); el contenido real
  // llega al navegador como JSON crudo sin pasar por Zod, así que un paso que
  // omita `kind` confiando en ese default llegaría aquí con `kind: undefined`
  // si no se replica el mismo fallback en tiempo de ejecución.
  const position = computed<{ current: number, total: number } | null>(() => {
    if (!session.value || !currentNode.value) return null
    if (currentNode.value.step.kind === 'summary') return null

    const stepNodes = session.value.sequence.filter(node => (node.step.kind ?? 'step') === 'step')
    const index = stepNodes.findIndex(node => node.runtimeId === currentNode.value!.runtimeId)
    if (index === -1) return null

    return { current: index + 1, total: stepNodes.length }
  })

  const sessionContextLabel = computed<string>(() => {
    if (!session.value) return ''
    const { playerCount, difficulty } = session.value.context
    return `${playerCount} jug · ${difficulty === 'expert' ? 'Experto' : 'Normal'}`
  })

  return {
    session,
    start,
    next,
    prev,
    jumpTo,
    currentNode,
    currentText,
    sectionLabel,
    position,
    sessionContextLabel,
  }
}
