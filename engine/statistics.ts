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
  // entriesWithVillain (WR-07, 09-REVIEW.md, cerrado en el quick
  // 260923-3rm): hermano de `entriesWithHeroes` con el MISMO criterio —
  // cuántas entradas alimentan la tabla de villanos de verdad, con el mismo
  // predicado que `extractVillainId` (villainId no nulo/no indefinido).
  // Antes de este cierre, la pantalla solo declaraba la muestra de héroes
  // encima de las dos tablas, así que una partida con villano y sin héroes
  // alimentaba «% DE VICTORIAS POR VILLANO» mientras el pie decía «sin
  // anotar» — la leyenda no describía la muestra de la tabla que tenía
  // delante.
  entriesWithVillain: number
}

interface RowAccumulator {
  name: string
  wins: number
  played: number
}

// IN-13 (09-REVIEW.md, cerrado en la quick 260923-3rl): `Math.round` podía
// anunciar «100 %» sin pleno exacto (199 de 200 redondeaba a 100) y la
// etiqueta completa («199 de 200 · 100 %») desmentía al propio porcentaje en
// la misma línea. `winPercentage` es la única vía de cálculo — `100` solo si
// `wins >= played` (pleno exacto), `0` solo si `wins <= 0` (ninguna
// victoria) o si `played` no es positivo (nunca jugado); en cualquier otro
// caso el redondeo de siempre, acotado al intervalo 1..99. Decisión propia
// (documentada en el SUMMARY): se acota TAMBIÉN el extremo bajo (1 de 201 ya
// no pinta «0 %» con al menos una victoria) — es el mismo defecto en la
// misma línea, y la cabecera de `engine/history.ts` ya registra como
// antipatrón de esta fase endurecer un lado del contrato y dejar el vecino
// sin revisar.
export function winPercentage(wins: number, played: number): number {
  if (played <= 0) return 0
  if (wins >= played) return 100
  if (wins <= 0) return 0
  return Math.min(99, Math.max(1, Math.round((wins / played) * 100)))
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
    pct: winPercentage(row.wins, row.played),
  }))

  // D-24: cascada EXACTA — % descendente, después partidas jugadas
  // descendente, después alfabético en español. Determinista y testeable,
  // nunca dependiente del orden de inserción. Copia antes de `.sort()`:
  // el array ya es nuevo (viene de `.map`), pero se deja explícito por
  // disciplina del resto del motor (nunca ordenar in situ algo que
  // pudiera venir de fuera).
  return [...rows].sort((a, b) => b.pct - a.pct || b.played - a.played || a.name.localeCompare(b.name, 'es'))
}

// CR-02 (defensa en profundidad): `entry` viene en última instancia de
// `localStorage` a través de `loadHistory()`, y el tipo `GameHistoryEntry`
// es una promesa de compilación, no una garantía de ejecución — un dato que
// viole el tipo puede cruzar la frontera sin que nada lo impida.
// `app/composables/usePersistedSession.ts` (plan 09-09) valida el tipo en la
// frontera de almacenamiento; esta es la SEGUNDA línea de defensa, no la
// primera: el motor declara en su cabecera que nunca lanza, y ese contrato
// no puede depender de que el llamador haya validado antes. La coerción
// explícita con `String(...)` garantiza que `id`/`name` son siempre string
// aunque el dato de origen no lo sea, para que la cascada de orden de D-24
// (línea 81, comparador alfabético español) nunca reciba un número.
function extractHeroIds(entry: GameHistoryEntry): { id: string, name: string }[] {
  const players = Array.isArray(entry.players) ? entry.players : []
  return players
    .filter(p => p !== null && typeof p === 'object' && p.heroId !== null && p.heroId !== undefined)
    .map(p => ({ id: String(p.heroId), name: String(p.heroName ?? p.heroId) }))
}

// CR-02 (defensa en profundidad): ver comentario de `extractHeroIds`.
function extractVillainId(entry: GameHistoryEntry): { id: string, name: string }[] {
  if (entry.villainId === null || entry.villainId === undefined) return []
  return [{ id: String(entry.villainId), name: String(entry.villainName ?? entry.villainId) }]
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

  // WR-07: MISMO predicado que alimenta `extractVillainId` (línea ~123) —
  // si algún día ese predicado cambiara, este debe cambiar con él, o la
  // leyenda de la tabla de villanos volvería a describir una muestra
  // distinta de la que la tabla agrega de verdad.
  const entriesWithVillain = validEntries.filter(entry => (
    entry.villainId !== null && entry.villainId !== undefined
  )).length

  return {
    heroRows,
    villainRows,
    totalEntries: validEntries.length,
    entriesWithHeroes,
    entriesWithVillain,
  }
}
