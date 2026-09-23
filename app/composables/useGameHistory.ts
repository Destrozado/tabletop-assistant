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
  freezeEndInstant,
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
import { useHistorySync } from './useHistorySync'
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
  durationLine: string
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
  // BF-02 (09-17, barrido de fronteras): `villainId`/`villainName` solo se
  // aceptan si son realmente `string` — un `entry` corrupto con
  // `villainId: 7` no debe pintar «7 · Normal · 3 jug» como si `7` fuera un
  // nombre de villano. `entry` viene en última instancia de `localStorage`,
  // y esta función es exportada y probada directamente: su contrato no
  // puede depender de que la frontera de almacenamiento la haya llamado
  // bien (mismo razonamiento que la normalización de `players` de abajo).
  const hasVillain = typeof entry.villainId === 'string'
  const villainDisplayName = hasVillain
    ? (typeof entry.villainName === 'string' ? entry.villainName : entry.villainId)
    : null

  // CR-01: `entry` viene en última instancia de `localStorage` — el tipo
  // TypeScript es una promesa de compilación, no una garantía de ejecución.
  // Una entrada corrupta puede degradar una tarjeta, pero nunca puede tumbar
  // la pantalla. Misma guarda que ya aplica `engine/statistics.ts` sobre el
  // mismo dato (`Array.isArray` + comprobación de objeto no nulo).
  //
  // BF-01 (09-17, barrido de fronteras, WR-01): el filtro anterior solo
  // descartaba `null` y no-objetos, sin normalizar el TIPO de `heroId`/
  // `heroName`/`playerName` — con `heroId: undefined` (p. ej.
  // `players: [{ playerName: 'Ana' }]`), `hasAnyHero` salía `true` por
  // comparar solo `!== null`, y la interpolación de más abajo pintaba
  // literalmente «Ana · undefined». Normalizar aquí, en la frontera de la
  // vista, con el MISMO predicado que `engine/statistics.ts:98`
  // (`heroId !== null && heroId !== undefined`, que tras esta normalización
  // se colapsa a `!== null`) es la regla: el módulo que pinta y el módulo
  // que agrega deben decidir «este hueco tiene héroe» con el mismo
  // criterio, o la pantalla y la estadística cuentan cosas distintas sobre
  // la misma partida.
  const players: HistoryPlayerEntry[] = (Array.isArray(entry.players) ? entry.players : [])
    .filter((player): player is HistoryPlayerEntry => player !== null && typeof player === 'object')
    .map(player => ({
      heroId: typeof player.heroId === 'string' ? player.heroId : null,
      heroName: typeof player.heroName === 'string' ? player.heroName : null,
      playerName: typeof player.playerName === 'string' ? player.playerName : '',
    }))
  const hasAnyHero = players.some(player => player.heroId !== null)

  let contextLine: string
  let playerLines: string[] | null
  let noSelectionLine: string | null

  // BF-02: `entry.playerCount` solo se usa si es finito — en caso
  // contrario, el mismo repliegue que `buildHistoryEntry` ya aplica en
  // origen (09-12): `players.length`. Defensa en
  // profundidad: la frontera de almacenamiento ya filtra estos casos, pero
  // esta función se prueba directamente y su contrato no puede depender de
  // que alguien la haya llamado bien.
  const safePlayerCount = Number.isFinite(entry.playerCount) ? entry.playerCount : players.length

  if (hasVillain || hasAnyHero) {
    // D-10 vs SEL-09: la ausencia de selección se dice con palabras — el
    // glifo «—» queda reservado para una cifra que no se puede saber
    // (duración), nunca para "no elegiste villano".
    contextLine = `${villainDisplayName ?? 'Sin villano'} · ${difficultyLabel} · ${safePlayerCount} jug`
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
    contextLine = `${difficultyLabel} · ${safePlayerCount} jug`
    playerLines = null
    noSelectionLine = 'Sin héroes ni villano anotados'
  }

  // Solo la duración: la ronda anotada no es realista — una vez dentro del
  // bucle el grupo deja de pulsar Siguiente, así que se quedaría corta.
  const durationLine = formatEntryDuration(entry.durationMs)

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
    durationLine,
    deleteAriaLabel,
    confirmTitle,
    confirmBody,
  }
}

// IN-11 (09-REVIEW.md, cerrado en la quick 260923-3rl): copy del aviso en
// línea que `/historico` pinta cuando `remove(id)` devuelve `false` — mismo
// precedente que `emptyTitle`/`emptyBody` de `buildStatisticsView` (más
// abajo): la copy vive como dato comprobable fuera del componente. Solo
// afirma lo que `removeHistoryEntry` garantiza cuando devuelve `false`: con
// un envoltorio ilegible no se intentó escribir, y con `setItem` lanzando el
// almacenamiento no cambió — en los dos casos es cierto que «no ha cambiado
// nada». No nombra ninguna causa (modo privado, cuota) que la app no ha
// comprobado.
export const DELETE_FAILED_HEADING = '⚠ No se pudo borrar la partida'
export const DELETE_FAILED_BODY = 'La app no ha conseguido leer o escribir el histórico en este navegador, así que no ha cambiado nada. Podéis volver a intentarlo más tarde.'

// WR-02 (quick 260923-3rm): copy del estado «histórico ilegible» — vive como
// dato comprobable fuera del componente, mismo criterio que
// `DELETE_FAILED_HEADING`/`DELETE_FAILED_BODY` de arriba. Cada frase describe
// SOLO lo que `readHistoryState()` ha comprobado de verdad para cada motivo
// de ilegibilidad — nunca una causa (modo privado, cuota) que la app no
// puede saber.
export interface UnreadableHistoryView {
  title: string
  body: string
  statisticsBody: string
  canArchive: boolean
}

export const UNREADABLE_HISTORY_STATISTICS_BODY = 'Las estadísticas salen del histórico, y ahora mismo la app no puede leerlo. En «Histórico» se explica qué podéis hacer.'

export const UNREADABLE_HISTORY_ARCHIVE_BUTTON_LABEL = 'Apartarlo y empezar uno nuevo'
export const UNREADABLE_HISTORY_CONFIRM_TITLE = '¿Apartar el histórico que no se puede leer?'
export const UNREADABLE_HISTORY_CONFIRM_BODY = 'La app hará una copia aparte y empezará un histórico vacío. Esa copia no se muestra en ninguna pantalla.'
export const UNREADABLE_HISTORY_CONFIRM_LABEL = 'Sí, apartarlo'
export const UNREADABLE_HISTORY_CANCEL_LABEL = 'Cancelar'

export const ARCHIVE_RESULT_SUCCESS_MESSAGE = 'Histórico apartado: la lista empieza de nuevo vacía.'
export const ARCHIVE_RESULT_FAILURE_MESSAGE = 'No se pudo apartar el histórico. Podéis intentarlo de nuevo más tarde.'

// buildUnreadableHistoryView: función pura, calcada del patrón de
// `buildStatisticsView` — decide la copy exacta según el ÚNICO motivo real
// de ilegibilidad que el llamador ya ha comprobado (`readHistoryState()`).
export function buildUnreadableHistoryView(state: 'read-failed' | 'uninterpretable'): UnreadableHistoryView {
  if (state === 'uninterpretable') {
    return {
      title: 'No se puede leer el histórico',
      body: 'Hay un histórico anterior que la app no sabe interpretar. Mientras siga ahí, no se muestra ninguna partida y no se pueden registrar partidas nuevas. Podéis apartarlo como copia y empezar un histórico nuevo: la copia se queda aparte, sin tocar.',
      statisticsBody: UNREADABLE_HISTORY_STATISTICS_BODY,
      canArchive: true,
    }
  }
  return {
    title: 'No se ha podido leer el histórico',
    body: 'La app no ha conseguido leerlo en este momento, así que no puede saber qué partidas hay registradas. Puede deberse al modo privado del navegador. Volved a abrir esta pantalla más tarde.',
    statisticsBody: UNREADABLE_HISTORY_STATISTICS_BODY,
    canArchive: false,
  }
}

// archiveResultMessage: traduce el resultado de `archiveUnreadableHistory`
// (usePersistedSession.ts) a la única frase que la interfaz puede pintar —
// `null` para `'not-needed'` porque no hubo ningún cambio que anunciar.
export function archiveResultMessage(result: 'archived' | 'not-needed' | 'failed'): string | null {
  if (result === 'archived') return ARCHIVE_RESULT_SUCCESS_MESSAGE
  if (result === 'failed') return ARCHIVE_RESULT_FAILURE_MESSAGE
  return null
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
  // WR-07 (09-REVIEW.md, cerrado en el quick 260923-3rm): `sampleCaption`
  // (compartida por las dos tablas) se sustituye por una leyenda POR TABLA
  // — cada una describe la muestra que su propia tabla agrega, nunca la del
  // vecino.
  heroSampleCaption: string | null
  villainSampleCaption: string | null
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
  const partidasLabel = summary.totalEntries === 1 ? 'partida registrada' : 'partidas registradas'

  // WR-07: cada leyenda es `null` solo cuando su propia tabla cuenta TODAS
  // las entradas — nunca cuando la del vecino lo hace. Copy de 09-UI-SPEC
  // sin cambiar una coma.
  const heroSampleCaption = summary.totalEntries === summary.entriesWithHeroes
    ? null
    : `${summary.totalEntries} ${partidasLabel} · ${summary.entriesWithHeroes} con héroes anotados`

  const villainSampleCaption = summary.totalEntries === summary.entriesWithVillain
    ? null
    : `${summary.totalEntries} ${partidasLabel} · ${summary.entriesWithVillain} con villano anotado`

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
    heroSampleCaption,
    villainSampleCaption,
    isEmpty,
    emptyTitle,
    emptyBody,
  }
}

export function useGameHistory() {
  const { getCatalogue } = useCharacterCatalogue()
  const { appendHistoryEntry, removeHistoryEntry, readHistoryState, archiveUnreadableHistory } = usePersistedSession()
  const { flush } = useHistorySync()

  const entries = ref<GameHistoryEntry[]>([])
  // historyReadState (WR-02, quick 260923-3rm): el motivo real por el que
  // `entries` está vacío ahora mismo — `'ok'` cuando de verdad no hay
  // partidas o la lectura ha ido bien; `'read-failed'`/`'uninterpretable'`
  // cuando `reload()` no ha podido leer el histórico de verdad. Sin este
  // estado, `/historico` no podía distinguir «no hay nada» de «hay algo que
  // no se sabe interpretar».
  const historyReadState = ref<'ok' | 'read-failed' | 'uninterpretable'>('ok')

  // record: resuelve el catálogo, congela los nombres en esta capa (D-11) y
  // construye la entrada con el motor puro. El reloj real se lee AQUÍ y
  // solo aquí — el resto del fichero, y todo `engine/`, lo reciben
  // inyectado. La firma SIGUE siendo totalmente síncrona de cara a su
  // llamador y sigue devolviendo boolean: el orden D-U4 de
  // `onOutcomeRecorded` (silence() → record() → save() →
  // notifyHistorySaved() → finishGame()) no cambia ni una línea. Pero desde
  // la Fase 10 (D-05) ha dejado de ser una función libre de efectos: un
  // registro local con éxito dispara, dispara-y-olvida, la subida a
  // Firestore (`useHistorySync().flush()`) — nunca espera nada de red.
  function record(session: EngineSession, outcome: GameOutcome): boolean {
    const catalogue = getCatalogue(session.gameId)
    const names = resolveFrozenNames(session.context, catalogue)
    const entry = buildHistoryEntry(session, outcome, Date.now(), names)
    const recorded = appendHistoryEntry(entry)
    // D-06: si el guardado local falla, no se sube nada — mantiene el
    // invariante localStorage-fuente-de-verdad/Firestore-sombra.
    if (recorded) flush()
    return recorded
  }

  // reload: HIST-07 se garantiza aquí, no se confía en el orden almacenado.
  // Reasignación completa del ref, nunca mutación in situ (misma disciplina
  // que el resto de composables de esta app). Se invoca desde `onMounted`
  // en las páginas — durante el prerender no hay `localStorage`.
  //
  // WR-02 (quick 260923-3rm): lee `readHistoryState()` en vez de
  // `loadHistory()` para poder guardar el motivo real de un histórico vacío
  // — `entries` sigue siendo `[]` en cualquier caso no-`'ok'` (mismo
  // contrato observable que antes para quien solo mire `entries`), pero
  // `historyReadState` ahora sabe distinguirlos.
  function reload(): void {
    const state = readHistoryState()
    historyReadState.value = state.kind
    entries.value = state.kind === 'ok' ? sortEntriesByRecency(state.entries) : []
  }

  // IN-11 (quick 260923-3rl): devuelve el booleano de `removeHistoryEntry`
  // en vez de descartarlo — `/historico` lo usa para decidir si pinta el
  // aviso de borrado fallido. `reload()` se ejecuta siempre, haya fallado o
  // no el borrado: si falló, `entries` sigue reflejando lo que de verdad
  // hay en disco (la tarjeta sigue ahí), y si funcionó, refleja la lista sin
  // esa entrada.
  function remove(id: string): boolean {
    const removed = removeHistoryEntry(id)
    reload()
    return removed
  }

  // stampEndOfGame (WR-06 ronda 4, quick 260923-3rm): el reloj real se lee
  // AQUÍ y solo aquí — mismo criterio que `record()` arriba con `Date.now()`
  // — y se delega en `freezeEndInstant` (motor puro, `engine/history.ts`)
  // para decidir si hace falta un sello nuevo o si el que ya hubiera sigue
  // aplicando. El llamador (`app/pages/[game]/index.vue`, `onOutcomeRecorded`)
  // reasigna `session.value` con el resultado ANTES de llamar a `record()`,
  // así que `record()`, el guardado del fallo y la lectura de
  // `readStoredProgress` ven todas la misma sesión ya sellada.
  function stampEndOfGame(session: EngineSession): EngineSession {
    return freezeEndInstant(session, Date.now())
  }

  // unreadableView (WR-02, quick 260923-3rm): `null` exactamente cuando
  // `historyReadState` es `'ok'` — las pantallas usan esto para decidir si
  // pintan su contenido normal o el estado «histórico ilegible».
  const unreadableView = computed<UnreadableHistoryView | null>(() => (
    historyReadState.value === 'ok' ? null : buildUnreadableHistoryView(historyReadState.value)
  ))

  // archiveUnreadable (WR-02, quick 260923-3rm): delega en
  // `archiveUnreadableHistory` (usePersistedSession.ts, el reloj real leído
  // AQUÍ y solo aquí, mismo criterio que `record()`/`stampEndOfGame()`
  // arriba) y siempre recarga después — con éxito, `unreadableView` pasa a
  // `null` y `entries`/`isEmpty` reflejan el histórico vacío recién creado;
  // con fallo, `historyReadState` sigue reflejando lo que de verdad hay en
  // disco.
  function archiveUnreadable(): 'archived' | 'not-needed' | 'failed' {
    const result = archiveUnreadableHistory(Date.now())
    reload()
    return result
  }

  const cardViews = computed(() => entries.value.map(buildHistoryCardView))
  const statisticsView = computed(() => buildStatisticsView(aggregateStatistics(entries.value)))
  const isEmpty = computed(() => entries.value.length === 0)

  return {
    entries,
    cardViews,
    statisticsView,
    isEmpty,
    unreadableView,
    archiveUnreadable,
    reload,
    remove,
    record,
    stampEndOfGame,
  }
}
