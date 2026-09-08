// engine/counters.ts
// Mutadores puros de los contadores de vida en mesa (Fase 7). Mismo
// contrato que engine/selection.ts: reciben un `EngineSession` y devuelven
// uno NUEVO, nunca mutan su argumento.
//
// Regla dura de esta fase (D-20, heredada de SEL-08): cada mutador devuelve
// un objeto NUEVO en TODOS los niveles que cambia — `session`, `context`,
// `counters`, `heroHealth` (cuando aplica) y la entrada tocada — porque el
// `watchDebounced` de `app/pages/[game]/index.vue` NO es profundo. Una
// mutación in situ actualizaría la pantalla igual (proxy reactivo
// profundo), pero NUNCA dispararía el guardado: los contadores se
// perderían al recargar, un bug invisible en `npm run dev`.
//
// `engine/persistence.ts` no se toca: `context` ya viaja entero dentro de
// `toPersistedPosition`/`resume()` (D-19), así que un mutador que reasigne
// correctamente no necesita ninguna fontanería de persistencia nueva.
import { resolvePlayerSlots, resolveVillainId } from './selection'
import type { CatalogueHero, CatalogueVillain, CharacterCatalogue, CounterState, Difficulty, EngineSession, SessionContext } from './types'

// D-11: la precarga es SIEMPRE la etapa I del villano y nada más — la banda
// no sabe de etapas II/III. Si no hay etapa I, no hay precarga posible.
// Un `playerCount` que no sea entero positivo devuelve null en vez de
// propagar un NaN. Nunca lanza.
export function computeInitialVillainHealth(
  villain: CatalogueVillain | null,
  playerCount: number,
  difficulty: Difficulty,
): number | null {
  if (villain === null) return null
  const stage1 = villain.stages[0]
  if (!stage1) return null
  if (!Number.isInteger(playerCount) || playerCount <= 0) return null

  const figures = difficulty === 'expert' && stage1.expert ? stage1.expert : stage1
  if (figures.healthPerHero) return figures.health * playerCount
  if (figures.healthPerGroup) return figures.health
  return figures.health
}

// La vida del héroe es siempre plana, nunca multiplicada por jugadores.
export function computeInitialHeroHealth(hero: CatalogueHero | null): number | null {
  if (hero === null) return null
  return hero.health
}

// Normalización defensiva de lo PERSISTIDO (COMP-02/D-12/T-07-04):
// `localStorage` es editable a mano, así que esta función no confía en
// NINGÚN campo persistido. Valida por TIPO, no por presencia. La longitud
// devuelta es SIEMPRE `context.playerCount` (0 si no es un entero
// positivo), nunca `context.counters.heroHealth.length`. `Number.isFinite`
// (no `typeof === 'number'`, que aceptaría NaN/Infinity) + `Math.trunc` +
// suelo en 0 saneen cualquier entrada manipulada en vez de propagarla. Sin
// tope superior a propósito (D-22). Nunca lanza, nunca devuelve `undefined`
// dentro del array.
export function resolveCounters(context: SessionContext): CounterState {
  const length = Number.isInteger(context.playerCount) && context.playerCount > 0
    ? context.playerCount
    : 0
  const raw = context.counters
  const hasRaw = raw !== null && typeof raw === 'object'

  const rawVillainHealth = hasRaw ? (raw as CounterState).villainHealth : undefined
  const villainHealth = Number.isFinite(rawVillainHealth)
    ? Math.max(0, Math.trunc(rawVillainHealth as number))
    : null

  const heroHealthRaw = hasRaw && Array.isArray((raw as CounterState).heroHealth)
    ? (raw as CounterState).heroHealth
    : []

  const heroHealth = Array.from({ length }, (_, i) => {
    const entry = heroHealthRaw[i]
    return Number.isFinite(entry) ? Math.max(0, Math.trunc(entry as number)) : null
  })

  return { villainHealth, heroHealth }
}

// Valores A PINTAR (D-09): el número congelado si existe, si no el
// calculado en vivo a partir del catálogo, si no `null`. Este es el punto
// donde D-09 se cumple sin ningún "instante de precarga": no hay momento
// mágico que pueda perderse ni duplicarse. `catalogue` a `null` o un id
// ausente del catálogo dan `null`, nunca un error.
export function resolveCounterValues(context: SessionContext, catalogue: CharacterCatalogue | null): CounterState {
  const persisted = resolveCounters(context)

  const villainId = resolveVillainId(context)
  const villain = catalogue !== null ? catalogue.villains.find(v => v.id === villainId) ?? null : null
  const villainHealth = persisted.villainHealth !== null
    ? persisted.villainHealth
    : computeInitialVillainHealth(villain, context.playerCount, context.difficulty)

  const slots = resolvePlayerSlots(context)
  const heroHealth = slots.map((slot, i) => {
    const frozen = persisted.heroHealth[i]
    if (frozen !== null) return frozen
    const hero = catalogue !== null ? catalogue.heroes.find(h => h.id === slot.heroId) ?? null : null
    return computeInitialHeroHealth(hero)
  })

  return { villainHealth, heroHealth }
}

// ▲/▼ sobre el villano. El valor base se calcula con `resolveCounterValues`
// — es lo que hace que el primer toque congele el número que el grupo está
// VIENDO (D-09). Si el base es null, ▲ escribe 1 y ▼ es no-op de misma
// referencia. Si el base es un número, ▲ suma 1 y ▼ resta 1 salvo que sea
// 0, en cuyo caso ▼ es no-op (D-15). El objeto `counters` de partida se
// toma SIEMPRE de `resolveCounters`, nunca de `session.context.counters`
// directamente ni con un spread de esa propiedad (T-07-05): así ninguna
// clave desconocida de un JSON manipulado se propaga hacia adelante.
export function incrementVillain(session: EngineSession, catalogue: CharacterCatalogue | null): EngineSession {
  const base = resolveCounterValues(session.context, catalogue).villainHealth
  const nextValue = base === null ? 1 : base + 1
  const counters = resolveCounters(session.context)
  return {
    ...session,
    context: {
      ...session.context,
      counters: { villainHealth: nextValue, heroHealth: counters.heroHealth },
    },
  }
}

export function decrementVillain(session: EngineSession, catalogue: CharacterCatalogue | null): EngineSession {
  const base = resolveCounterValues(session.context, catalogue).villainHealth
  if (base === null) return session
  if (base === 0) return session
  const counters = resolveCounters(session.context)
  return {
    ...session,
    context: {
      ...session.context,
      counters: { villainHealth: base - 1, heroHealth: counters.heroHealth },
    },
  }
}

// ▲/▼ sobre el héroe de un `slot`. Misma guarda de rango que `setHero`
// (`Number.isInteger(slot) && slot >= 0 && slot < playerCount`); no-op de
// misma referencia si falla, nunca lanza.
export function incrementHero(session: EngineSession, slot: number, catalogue: CharacterCatalogue | null): EngineSession {
  const { playerCount } = session.context
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerCount) {
    return session
  }
  const base = resolveCounterValues(session.context, catalogue).heroHealth[slot]
  const nextValue = base === null ? 1 : base + 1
  const counters = resolveCounters(session.context)
  const heroHealth = counters.heroHealth.map((entry, i) => (i === slot ? nextValue : entry))
  return {
    ...session,
    context: {
      ...session.context,
      counters: { villainHealth: counters.villainHealth, heroHealth },
    },
  }
}

export function decrementHero(session: EngineSession, slot: number, catalogue: CharacterCatalogue | null): EngineSession {
  const { playerCount } = session.context
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerCount) {
    return session
  }
  const base = resolveCounterValues(session.context, catalogue).heroHealth[slot]
  if (base === null) return session
  if (base === 0) return session
  const counters = resolveCounters(session.context)
  const heroHealth = counters.heroHealth.map((entry, i) => (i === slot ? base - 1 : entry))
  return {
    ...session,
    context: {
      ...session.context,
      counters: { villainHealth: counters.villainHealth, heroHealth },
    },
  }
}
