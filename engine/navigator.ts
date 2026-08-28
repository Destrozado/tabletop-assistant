// engine/navigator.ts
// next/prev/jumpTo puros sobre EngineSession. Reproduce el pseudocódigo de
// 01-RESEARCH.md §Motor de flujo. Los guards comparan con `!== undefined`,
// nunca por veracidad: loopStartIndex/loopEndIndex pueden legítimamente ser 0.
import type { EngineSession } from './types'

export function next(session: EngineSession): EngineSession {
  if (session.loopEndIndex !== undefined && session.cursor === session.loopEndIndex) {
    return { ...session, cursor: session.loopStartIndex!, round: session.round + 1 }
  }
  return { ...session, cursor: Math.min(session.cursor + 1, session.sequence.length - 1) }
}

export function prev(session: EngineSession): EngineSession {
  if (
    session.loopStartIndex !== undefined
    && session.cursor === session.loopStartIndex
    && session.round > 1
  ) {
    return { ...session, cursor: session.loopEndIndex!, round: session.round - 1 }
  }
  return { ...session, cursor: Math.max(session.cursor - 1, 0) }
}

export function jumpTo(session: EngineSession, runtimeId: string): EngineSession {
  const cursor = session.sequence.findIndex(node => node.runtimeId === runtimeId)
  if (cursor === -1) {
    // runtimeId desconocido: no lanza, no deja un cursor inválido — sesión sin cambios.
    return session
  }
  // round no cambia — un salto es "mirar", no transicionar de ronda.
  return { ...session, cursor }
}
