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

// Válida por RANGO y por VALOR, no por `typeof` (WR-03, `09-REVIEW.md`,
// ronda 3). No es una revalidación completa del esquema (eso es
// responsabilidad de `engine/schema.ts`) — es la última línea de defensa
// del motor ante un `persisted` cuya forma no se puede dar por buena
// (CR-01: la capa de storage debería filtrar esto, pero el motor no puede
// asumir ciegamente que su entrada tiene la forma correcta).
//
// El plan 09-12 descartó a propósito este endurecimiento: entonces habría
// convertido sesiones reanudables en reinicios SILENCIOSOS (la rama
// `resumed` adoptaba el context fresco pero seguía anunciándose como
// reanudada). Ahora (09-15) el reinicio es explícito — `resume()` degrada
// a `outcome: 'fresh'` en vez de mentir bajo `'resumed'` — así que esa
// objeción ya no aplica. Un `context` escrito por el propio mini-setup NO
// puede fallar estas comprobaciones: `playerCount` sale de un selector de
// 1 a 4 (entero positivo, mismo criterio que `resolvePlayerSlots` y
// `emptySelection` en `engine/selection.ts`) y `difficulty` de un par de
// botones (`'normal'` o `'expert'`, las dos únicas que `isGameHistoryEntry`
// en `usePersistedSession.ts` acepta al escribir en el histórico). Lo
// único que esta guarda puede rechazar es un dato manipulado, corrupto o
// de otra versión.
function isValidContext(value: unknown): value is SessionContext {
  return !!value && typeof value === 'object'
    && Number.isInteger((value as SessionContext).playerCount) && (value as SessionContext).playerCount > 0
    && ((value as SessionContext).difficulty === 'normal' || (value as SessionContext).difficulty === 'expert')
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
// `context` de la sesión fresca en vez de propagar `undefined` (CR-01). Tras
// la guarda añadida en `resume()` (WR-03, ronda 3) esta expresión es
// inalcanzable DESDE `resume()` — la guarda de arriba ya descarta cualquier
// `context` inválido devolviendo `'fresh'` antes de que `formatVersion`
// llegue a comprobarse. Se conserva como defensa en profundidad: su valor
// es impedir que un llamador futuro invoque `contentChangedFallback`
// directamente con un `persisted` sin validar. NO se borra: borrarla es
// exactamente el gesto que ha reabierto esta fase tres rondas seguidas.
function contentChangedFallback(persisted: PersistedPosition, fresh: EngineSession): EngineSession {
  const context = isValidContext(persisted.context) ? persisted.context : fresh.context
  return { ...fresh, cursor: 0, round: 1, context }
}

export function resume(persisted: PersistedPosition | null, fresh: EngineSession): ResumeResult {
  if (persisted === null) {
    return { session: fresh, outcome: 'fresh' }
  }

  // WR-03 (`09-REVIEW.md`, ronda 3): guarda única de `context`, ANTES de
  // formatVersion/contentVersion/runtimeId. Un `context` que no se puede
  // validar no es una partida reanudable: es una partida cuya
  // configuración se ha perdido. Sin esta guarda, la rama `resumed` de más
  // abajo adoptaba el relleno de la página (`{ playerCount: 1, difficulty:
  // 'normal' }`) pero seguía devolviendo `outcome: 'resumed'` — la banda de
  // contadores, la cabecera y `buildHistoryEntry` acababan afirmando una
  // configuración que nadie eligió, indistinguible de una correcta. Se
  // elige `'fresh'` y NO `'content-changed'` porque el contenido no ha
  // cambiado — decir lo contrario sería otra afirmación falsa, y la
  // pantalla de «el contenido ha cambiado» ofrece un CTA que abre partida,
  // que es justo lo que aquí no se puede ofrecer. Con `'fresh'`,
  // `session.value` queda en `null` y la plantilla vuelve a mostrar el
  // mini-setup, que pregunta de nuevo jugadores y dificultad.
  if (!isValidContext(persisted.context)) {
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

  // WR-03 (ronda 3): el criterio de «qué context puede entrar en la sesión
  // viva» ya no vive aquí — vive en la guarda única al principio de
  // `resume()`, que ha devuelto `'fresh'` si `persisted.context` no era
  // válido. Llegar hasta este punto ya implica `isValidContext(persisted.context)
  // === true`, así que `persisted.context` se adopta tal cual, sin volver a
  // comprobarlo. Esto es deliberado: mover el criterio a un único sitio
  // impide que esta rama y `contentChangedFallback` vuelvan a divergir,
  // que es justo lo que el comentario anterior (cierre 09-12) pedía y no
  // conseguía al vivir duplicado en dos sitios.
  const context = persisted.context
  // `isPersistedPosition` (capa de storage) solo comprueba que la clave
  // `round` exista, no su tipo — de ahí la misma guarda que ya aplica
  // `buildHistoryEntry`. `round` no forma parte de `isValidContext` y sigue
  // necesitando su propia guarda.
  const round = Number.isInteger(persisted.round) && persisted.round >= 1 ? persisted.round : fresh.round

  return {
    session: { ...fresh, cursor, round, context },
    outcome: 'resumed',
  }
}
