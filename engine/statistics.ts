// engine/statistics.ts
// Agregación pura del histórico en dos tablas (héroes/villanos) ya
// ordenadas, más el tamaño de la muestra (Fase 9, plan 03). Mismo contrato
// de pureza que el resto del motor (`counters.ts`, `history.ts`): nunca
// muta su argumento, nunca lanza, cero Vue/DOM/zod. La pantalla del plan
// 09-06 se limita a pintar lo que esta función devuelve, sin reordenar ni
// recalcular nada.
//
// D-14/STAT-04: `aggregateStatistics` tiene UN SOLO parámetro — el
// histórico ya cargado — y no admite ninguna bandera de «fuente» ni rama
// que pudiera leer de otro sitio (ningún acceso a red en este fichero).
import type { GameHistoryEntry } from './types'

export interface StatRow {
  id: string
  name: string
  wins: number
  played: number
  pct: number
}

export interface StatisticsSummary {
  heroRows: StatRow[]
  villainRows: StatRow[]
  totalEntries: number
  entriesWithHeroes: number
}

interface RowAccumulator {
  name: string
  wins: number
  played: number
}

// D-26: agrupa por id DISTINTO, no por hueco — la app permite el mismo
// héroe en dos huecos (SEL-07), así que una entrada con el mismo `heroId`
// repetido solo puede sumar `played`/`wins` UNA vez para ese id. `entries`
// llega del más reciente al más antiguo (mismo orden que entrega
// `loadHistory`, plan 09-04), así que el primer nombre visto al recorrer en
// ESE orden es el nombre congelado más reciente — y es el que gana, porque
// nunca se sobrescribe una vez fijado en el `Map`.
function buildRows(
  entries: GameHistoryEntry[],
  extractIds: (entry: GameHistoryEntry) => { id: string, name: string }[],
): StatRow[] {
  const byId = new Map<string, RowAccumulator>()

  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object') continue
    const won = entry.result === 'won'
    const distinctIds = new Map<string, string>()
    for (const { id, name } of extractIds(entry)) {
      if (!distinctIds.has(id)) distinctIds.set(id, name)
    }
    for (const [id, name] of distinctIds) {
      const row = byId.get(id)
      if (row === undefined) {
        byId.set(id, { name, wins: won ? 1 : 0, played: 1 })
      }
      else {
        row.played += 1
        if (won) row.wins += 1
      }
    }
  }

  const rows: StatRow[] = Array.from(byId.entries()).map(([id, row]) => ({
    id,
    name: row.name,
    wins: row.wins,
    played: row.played,
    pct: row.played > 0 ? Math.round((row.wins / row.played) * 100) : 0,
  }))

  // D-24: cascada EXACTA — % descendente, después partidas jugadas
  // descendente, después alfabético en español. Determinista y testeable,
  // nunca dependiente del orden de inserción. Copia antes de `.sort()`:
  // el array ya es nuevo (viene de `.map`), pero se deja explícito por
  // disciplina del resto del motor (nunca ordenar in situ algo que
  // pudiera venir de fuera).
  return [...rows].sort((a, b) => b.pct - a.pct || b.played - a.played || a.name.localeCompare(b.name, 'es'))
}

function extractHeroIds(entry: GameHistoryEntry): { id: string, name: string }[] {
  const players = Array.isArray(entry.players) ? entry.players : []
  return players
    .filter(p => p !== null && typeof p === 'object' && p.heroId !== null && p.heroId !== undefined)
    .map(p => ({ id: p.heroId as string, name: p.heroName ?? p.heroId! }))
}

function extractVillainId(entry: GameHistoryEntry): { id: string, name: string }[] {
  if (entry.villainId === null || entry.villainId === undefined) return []
  return [{ id: entry.villainId, name: entry.villainName ?? entry.villainId }]
}

// D-23: la función nunca inventa filas a cero — solo conoce ids que
// realmente aparecen en `entries`, así que nunca lista a quien no ha
// jugado. D-25: sin umbral mínimo de partidas en ningún punto. D-12: una
// entrada sin héroes ni villano queda fuera de las dos tablas pero sigue
// contando en `totalEntries` — `entriesWithHeroes` es el dato que permite a
// la pantalla declarar la muestra («12 partidas registradas · 10 con
// héroes anotados») sin que el % parezca comerse partidas.
export function aggregateStatistics(entries: GameHistoryEntry[]): StatisticsSummary {
  const list = Array.isArray(entries) ? entries : []
  const validEntries = list.filter(e => e !== null && typeof e === 'object')

  const heroRows = buildRows(validEntries, extractHeroIds)
  const villainRows = buildRows(validEntries, extractVillainId)

  const entriesWithHeroes = validEntries.filter((entry) => {
    const players = Array.isArray(entry.players) ? entry.players : []
    return players.some(p => p !== null && typeof p === 'object' && p.heroId !== null && p.heroId !== undefined)
  }).length

  return {
    heroRows,
    villainRows,
    totalEntries: validEntries.length,
    entriesWithHeroes,
  }
}
