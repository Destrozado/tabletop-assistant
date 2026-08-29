// app/composables/useGameSession.ts
// La ÚNICA costura reactiva entre el motor puro (`~~/engine/*`) y Vue. Ningún
// componente importa `~~/engine/*` directamente: si algún componente necesitara
// algo del motor, falta una computed aquí (ARCHITECTURE.md §3/§5).
//
// `next`/`prev`/`jumpTo` del motor son puras y devuelven sesiones NUEVAS — este
// composable solo reasigna el ref, nunca muta `session.value` in situ.
import { computed, ref } from 'vue'
import { expand } from '~~/engine/expand'
import { describeHeader } from '~~/engine/header'
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

  // sectionLabel/plainSectionTitle/position se derivan de una única función
  // pura del motor (engine/header.ts, D-22/D-23) en vez de tres cómputos
  // independientes — así cabecera, título del overlay del índice y resumen
  // de reanudación (savedSummary en app/pages/[game]/index.vue) no pueden
  // desincronizarse entre sí. El fallback `?? 'step'` de WR-01 y el resto de
  // la lógica de derivación viven ahora en engine/header.ts, no aquí.
  const headerInfo = computed(() => (session.value ? describeHeader(session.value) : null))

  // Compuesta (`RONDA 4 · Villano` dentro del bucle, `PREPARACIÓN` fuera) —
  // alimenta la cabecera (AppHeader.sectionLabel), nunca el título del overlay.
  const sectionLabel = computed<string>(() => headerInfo.value?.sectionLabel ?? '')

  // Plana (`RONDA`, `PREPARACIÓN`) — alimenta el título del IndexOverlay,
  // nunca la cabecera (Pitfall 4 de 02-RESEARCH.md).
  const plainSectionTitle = computed<string>(() => headerInfo.value?.plainSectionTitle ?? '')

  // null cuando el nodo actual es kind === 'summary' (D-03: la pantalla de
  // repaso no es "el paso 24 de 24").
  const position = computed<{ current: number, total: number } | null>(() => headerInfo.value?.position ?? null)

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
    plainSectionTitle,
    position,
    sessionContextLabel,
  }
}
