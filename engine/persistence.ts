// engine/persistence.ts
// Forma persistida y resolución de reanudación, puras. Cero acceso al
// almacenamiento del navegador, cero globales del DOM, cero imports de
// Vue/Nuxt — la única costura de almacenamiento de la app vive en
// `app/composables/usePersistedSession.ts` (01-04), que serializa/deserializa
// objetos planos y llama a las funciones de aquí.
import type { EngineSession, SessionContext } from './types'

export interface PersistedPosition {
  formatVersion: 1
  gameId: string
  contentVersion: number
  runtimeId: string
  round: number
  context: SessionContext
  updatedAt: string
}

export type ResumeOutcome = 'fresh' | 'resumed' | 'content-changed'

export interface ResumeResult {
  session: EngineSession
  outcome: ResumeOutcome
}

export function toPersistedPosition(session: EngineSession): PersistedPosition {
  const node = session.sequence[session.cursor]
  return {
    formatVersion: 1,
    gameId: session.gameId,
    contentVersion: session.contentVersion,
    runtimeId: node?.runtimeId ?? '',
    round: session.round,
    context: session.context,
    updatedAt: new Date().toISOString(),
  }
}

// Válido en el sentido mínimo que este fallback necesita: un objeto con las
// dos claves que `SessionContext` exige. No es una revalidación completa del
// esquema (eso es responsabilidad de `engine/schema.ts`) — es la última
// línea de defensa del motor ante un `persisted` cuya forma no se puede dar
// por buena (CR-01: la capa de storage debería filtrar esto, pero el motor
// no puede asumir ciegamente que su entrada tiene la forma correcta).
function isValidContext(value: unknown): value is SessionContext {
  return !!value && typeof value === 'object'
    && typeof (value as SessionContext).playerCount === 'number'
    && typeof (value as SessionContext).difficulty === 'string'
}

// Fallback conservador ante versión desajustada o runtimeId ausente: inicio de
// sesión (round 1, cursor 0 — el punto en que `expand()` deja toda sesión
// fresca), conservando SOLO el `context` persistido para no repetir el
// mini-setup (jugadores/dificultad siguen siendo válidos aunque el contenido
// haya cambiado de forma). Nunca se intenta resolver `runtimeId` aquí —
// Anti-Patrón 4 de ARCHITECTURE.md: una coincidencia casual de id tras una
// reestructuración es peor que un reinicio honesto.
//
// Si `persisted.context` no tiene forma de `SessionContext` (dato parcial o
// corrupto que sobrevivió a la validación de la capa de storage), se cae al
// `context` de la sesión fresca en vez de propagar `undefined` (CR-01).
function contentChangedFallback(persisted: PersistedPosition, fresh: EngineSession): EngineSession {
  const context = isValidContext(persisted.context) ? persisted.context : fresh.context
  return { ...fresh, cursor: 0, round: 1, context }
}

export function resume(persisted: PersistedPosition | null, fresh: EngineSession): ResumeResult {
  if (persisted === null) {
    return { session: fresh, outcome: 'fresh' }
  }

  // Orden importa: primero formatVersion (la forma del propio storage), luego
  // contentVersion — solo si ambas coinciden se busca el runtimeId.
  if (persisted.formatVersion !== 1) {
    return { session: contentChangedFallback(persisted, fresh), outcome: 'content-changed' }
  }

  if (persisted.contentVersion !== fresh.contentVersion) {
    return { session: contentChangedFallback(persisted, fresh), outcome: 'content-changed' }
  }

  const cursor = fresh.sequence.findIndex(node => node.runtimeId === persisted.runtimeId)
  if (cursor === -1) {
    return { session: contentChangedFallback(persisted, fresh), outcome: 'content-changed' }
  }

  return {
    session: { ...fresh, cursor, round: persisted.round, context: persisted.context },
    outcome: 'resumed',
  }
}
