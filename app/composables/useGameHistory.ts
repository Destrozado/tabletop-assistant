// app/composables/useGameHistory.ts
// La SEGUNDA costura reactiva de la app (la primera es useGameSession.ts):
// envuelve el motor puro del histórico (`~~/engine/history`,
// `~~/engine/statistics`) y la capa de almacenamiento (`usePersistedSession`)
// para que las pantallas de `/historico` y `/estadisticas` — y la pantalla
// de juego, al registrar — sigan siendo tontas. Ningún componente ni página
// puede importar `~~/engine/*`: si una pantalla necesitara algo del motor
// que no esté ya aquí, falta una computed en este fichero, no un import
// nuevo en el componente.
//
// Aquí viven además las dos cosas que el motor no puede hacer por
// disciplina propia: resolver el alias español congelado (D-11, los datos
// de alias viven en `app/data/`, fuera del alcance de `engine/`) y leer el
// reloj real, invocado aquí y solo aquí — el motor lo recibe siempre
// inyectado como argumento.
import { computed, ref } from 'vue'
import {
  buildHistoryEntry,
  describeLossCause,
  formatEntryDate,
  formatEntryDuration,
  sortEntriesByRecency,
} from '~~/engine/history'
import type { FrozenNames } from '~~/engine/history'
import { resolvePlayerSlots, resolveVillainId } from '~~/engine/selection'
import { aggregateStatistics } from '~~/engine/statistics'
import type { StatRow, StatisticsSummary } from '~~/engine/statistics'
import type {
  CharacterCatalogue,
  EngineSession,
  GameHistoryEntry,
  GameOutcome,
  HistoryPlayerEntry,
  SessionContext,
} from '~~/engine/types'
import { useCharacterCatalogue } from './useCharacterCatalogue'
import { resolveHeroSpanishName, resolvePlayerLabel } from './useHeroSearch'
import { usePersistedSession } from './usePersistedSession'

// resolveFrozenNames: responde a la Open Question 2 de 09-RESEARCH.md — el
// alias español (D-11) se resuelve AQUÍ, en la capa de interfaz, y llega al
// motor como dato plano vía `FrozenNames`. Nunca al revés.
//
// - `villainName`: busca `resolveVillainId(context)` en `catalogue.villains`
//   por `id`. `null` si no hay villano elegido o si el id ya no existe en
//   el catálogo. Los villanos no llevan alias español (`buildVillainOptions`
//   ya usa `villain.name` tal cual) — el nombre del catálogo ES el que se
//   vio en pantalla.
// - `heroNames`: por cada hueco con `heroId` no nulo, busca el héroe en
//   `catalogue.heroes` y resuelve su alias con `resolveHeroSpanishName`. Un
//   `heroId` que ya no exista en el catálogo (regenerado desde una API de
//   terceros, D-11) simplemente no entra en el mapa — `buildHistoryEntry`
//   dejará su `heroName` en `null` para ese hueco.
export function resolveFrozenNames(
  context: SessionContext,
  catalogue: CharacterCatalogue | null,
): FrozenNames {
  const villainId = resolveVillainId(context)
  const villainName = villainId !== null
    ? (catalogue?.villains.find(villain => villain.id === villainId)?.name ?? null)
    : null

  // CR-02 (ronda 3): este mapa se indexa con un `heroId` que viene en
  // última instancia de `localStorage` (editable a mano), así que un
  // objeto literal convierte `constructor`/`toString`/`__proto__` en
  // «claves que existen» heredadas de `Object.prototype`. Un objeto sin
  // prototipo solo puede contener lo que este bucle ha puesto. El
  // consumidor (`engine/history.ts`) aplica además su propia guarda
  // (`Object.hasOwn` + exigencia de `string`): la pareja es deliberada —
  // el motor no puede asumir que todo llamador le pase un mapa sin
  // prototipo, porque su cabecera declara que nunca lanza y que
  // normaliza por su cuenta.
  const heroNames: Record<string, string> = Object.create(null)
  for (const slot of resolvePlayerSlots(context)) {
    if (slot.heroId === null) continue
    const hero = catalogue?.heroes.find(candidate => candidate.id === slot.heroId)
    if (hero) heroNames[slot.heroId] = resolveHeroSpanishName(slot.heroId, hero.name)
  }

  return { villainName, heroNames }
}

// Modelo de vista de una tarjeta del histórico (UI-SPEC §4): cada campo es
// una cadena ya formateada o `null` — el componente que la pinte no compone
// ni interpola nada, solo renderiza.
export interface HistoryCardView {
  id: string
  resultLabel: string
  dateLabel: string
  causeLabel: string | null
  contextLine: string
  playerLines: string[] | null
  noSelectionLine: string | null
  roundAndDurationLine: string
  deleteAriaLabel: string
  confirmTitle: string
  confirmBody: string
}

// buildHistoryCardView: función PURA, sin Vue, calcada del patrón de
// `buildCounterCells`/`buildStepValueCells` en `useGameSession.ts` — produce
// exactamente el modelo de vista que el componente de la Fase 9-06 pinta.
export function buildHistoryCardView(entry: GameHistoryEntry): HistoryCardView {
  const dateLabel = formatEntryDate(entry.recordedAt)
  const difficultyLabel = entry.difficulty === 'expert' ? 'Experto' : 'Normal'
  const resultLabel = entry.result === 'won' ? 'GANADA' : 'PERDIDA'
  const causeLabel = entry.lossCause !== null ? describeLossCause(entry.lossCause) : null

  // T-09-16: un `villainId`/`heroId` congelado puede quedar huérfano tras
  // regenerar el catálogo — el nombre se congeló al registrar (D-11), y si
  // faltara, se pinta el propio id antes que dejar un hueco. Distinto de
  // "no había villano/héroe elegido", que es la rama de abajo.
  const hasVillain = entry.villainId !== null
  const villainDisplayName = hasVillain ? (entry.villainName ?? entry.villainId) : null

  // CR-01: `entry` viene en última instancia de `localStorage` — el tipo
  // TypeScript es una promesa de compilación, no una garantía de ejecución.
  // Una entrada corrupta puede degradar una tarjeta, pero nunca puede tumbar
  // la pantalla. Misma guarda que ya aplica `engine/statistics.ts` sobre el
  // mismo dato (`Array.isArray` + comprobación de objeto no nulo).
  const players: HistoryPlayerEntry[] = (Array.isArray(entry.players) ? entry.players : [])
    .filter((player): player is HistoryPlayerEntry => player !== null && typeof player === 'object')
  const hasAnyHero = players.some(player => player.heroId !== null)

  let contextLine: string
  let playerLines: string[] | null
  let noSelectionLine: string | null

  if (hasVillain || hasAnyHero) {
    // D-10 vs SEL-09: la ausencia de selección se dice con palabras — el
    // glifo «—» queda reservado para una cifra que no se puede saber
    // (duración), nunca para "no elegiste villano".
    contextLine = `${villainDisplayName ?? 'Sin villano'} · ${difficultyLabel} · ${entry.playerCount} jug`
    playerLines = players.map((player, index) => {
      const label = resolvePlayerLabel(index, player.playerName)
      return player.heroId !== null ? `${label} · ${player.heroName ?? player.heroId}` : label
    })
    noSelectionLine = null
  }
  else {
    // D-12: nunca N filas de jugador vacías. Dificultad y nº de jugadores
    // SIEMPRE se conocen (se fijan en el mini-setup), así que se conservan
    // en la línea de contexto aunque no hubiera nada elegido.
    contextLine = `${difficultyLabel} · ${entry.playerCount} jug`
    playerLines = null
    noSelectionLine = 'Sin héroes ni villano anotados'
  }

  // D-09: siempre "hasta la ronda N", nunca "N rondas".
  const roundAndDurationLine = `Hasta la ronda ${entry.round} · ${formatEntryDuration(entry.durationMs)}`

  const villainForCopy = villainDisplayName ?? 'sin villano'
  const deleteAriaLabel = `Borrar partida del ${dateLabel} contra ${villainForCopy}`
  const confirmTitle = '¿Borrar esta partida del histórico?'
  const resultado = entry.result === 'won' ? 'Ganada' : 'Perdida'
  const confirmBody = `${resultado} del ${dateLabel} contra ${villainForCopy}. Esta acción no se puede deshacer.`

  return {
    id: entry.id,
    resultLabel,
    dateLabel,
    causeLabel,
    contextLine,
    playerLines,
    noSelectionLine,
    roundAndDurationLine,
    deleteAriaLabel,
    confirmTitle,
    confirmBody,
  }
}

// Fila ya formateada de la tabla de estadísticas — el componente no vuelve
// a componer `{wins} de {played} · {pct} %` (D-25).
export interface StatRowView {
  id: string
  name: string
  valueLabel: string
}

export interface StatisticsView {
  heroRows: StatRowView[]
  villainRows: StatRowView[]
  sampleCaption: string | null
  isEmpty: boolean
  // WR-01: `emptyTitle`/`emptyBody` son `null` exactamente cuando `isEmpty`
  // es `false` — la plantilla de `estadisticas.vue` deja de llevar copy
  // literal, así que el componente no compone ni interpola nada (misma
  // disciplina que el resto de este fichero).
  emptyTitle: string | null
  emptyBody: string | null
}

function toStatRowView(row: StatRow): StatRowView {
  return {
    id: row.id,
    name: row.name,
    valueLabel: `${row.wins} de ${row.played} · ${row.pct} %`,
  }
}

// buildStatisticsView: no reordena nada — las filas llegan ya ordenadas por
// `aggregateStatistics` (D-24). `isEmpty` es lo que impide que la pantalla
// pinte alguna vez una tabla con cero filas o un «0 %» (STAT-05).
export function buildStatisticsView(summary: StatisticsSummary): StatisticsView {
  const sampleCaption = summary.totalEntries === summary.entriesWithHeroes
    ? null
    : `${summary.totalEntries} ${summary.totalEntries === 1 ? 'partida registrada' : 'partidas registradas'} · ${summary.entriesWithHeroes} con héroes anotados`

  // WR-01: "no hay NADA que enseñar" — antes solo cubría el histórico
  // vacío (`totalEntries === 0`), dejando sin estado vacío el caso "hay
  // partidas pero ninguna con héroe ni villano anotados", que dejaba
  // `/estadisticas` sin tablas y sin estado vacío (pantalla sin salida).
  const isEmpty = summary.heroRows.length === 0 && summary.villainRows.length === 0

  let emptyTitle: string | null = null
  let emptyBody: string | null = null

  if (isEmpty) {
    // UI-SPEC §7: copy fijada, sin cambiar ni una coma. Antes vivía literal
    // en la plantilla de estadisticas.vue; ahora se mueve aquí.
    emptyTitle = 'Todavía no hay estadísticas'
    emptyBody = summary.totalEntries === 0
      ? 'En cuanto registréis vuestra primera partida en el histórico, aquí aparecerá el % de victorias por héroe y por villano.'
      : `${summary.totalEntries} ${summary.totalEntries === 1 ? 'partida registrada' : 'partidas registradas'}, pero ninguna con héroe ni villano anotados. En cuanto anotéis quién jugó o contra quién, aquí aparecerá el % de victorias.`
  }

  return {
    heroRows: summary.heroRows.map(toStatRowView),
    villainRows: summary.villainRows.map(toStatRowView),
    sampleCaption,
    isEmpty,
    emptyTitle,
    emptyBody,
  }
}

export function useGameHistory() {
  const { getCatalogue } = useCharacterCatalogue()
  const { loadHistory, appendHistoryEntry, removeHistoryEntry } = usePersistedSession()

  const entries = ref<GameHistoryEntry[]>([])

  // record: resuelve el catálogo, congela los nombres en esta capa (D-11) y
  // construye la entrada con el motor puro. El reloj real se lee AQUÍ y
  // solo aquí — el resto del fichero, y todo `engine/`, lo reciben
  // inyectado. Ninguna escritura de este fichero espera nada de red: la
  // firma es totalmente síncrona por diseño (una fase futura es quien
  // podría cambiar esto, no esta).
  function record(session: EngineSession, outcome: GameOutcome): boolean {
    const catalogue = getCatalogue(session.gameId)
    const names = resolveFrozenNames(session.context, catalogue)
    const entry = buildHistoryEntry(session, outcome, Date.now(), names)
    return appendHistoryEntry(entry)
  }

  // reload: HIST-07 se garantiza aquí, no se confía en el orden almacenado.
  // Reasignación completa del ref, nunca mutación in situ (misma disciplina
  // que el resto de composables de esta app). Se invoca desde `onMounted`
  // en las páginas — durante el prerender no hay `localStorage`.
  function reload(): void {
    entries.value = sortEntriesByRecency(loadHistory())
  }

  function remove(id: string): void {
    removeHistoryEntry(id)
    reload()
  }

  const cardViews = computed(() => entries.value.map(buildHistoryCardView))
  const statisticsView = computed(() => buildStatisticsView(aggregateStatistics(entries.value)))
  const isEmpty = computed(() => entries.value.length === 0)

  return {
    entries,
    cardViews,
    statisticsView,
    isEmpty,
    reload,
    remove,
    record,
  }
}
