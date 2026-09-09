// app/composables/useGameSession.ts
// La ÚNICA costura reactiva entre el motor puro (`~~/engine/*`) y Vue. Ningún
// componente importa `~~/engine/*` directamente: si algún componente necesitara
// algo del motor, falta una computed aquí (ARCHITECTURE.md §3/§5).
//
// `next`/`prev`/`jumpTo` del motor son puras y devuelven sesiones NUEVAS — este
// composable solo reasigna el ref, nunca muta `session.value` in situ.
import { computed, ref } from 'vue'
import {
  decrementHero as engineDecrementHero,
  decrementVillain as engineDecrementVillain,
  incrementHero as engineIncrementHero,
  incrementVillain as engineIncrementVillain,
  resolveCounterValues,
} from '~~/engine/counters'
import { expand } from '~~/engine/expand'
import { describeHeader } from '~~/engine/header'
import { jumpTo as engineJumpTo, next as engineNext, prev as enginePrev } from '~~/engine/navigator'
import { resolveAudioId, resolveText } from '~~/engine/resolve'
import {
  resolvePlayerSlots,
  resolveVillainId,
  setHero as engineSetHero,
  setPlayerName as engineSetPlayerName,
  setVillain as engineSetVillain,
} from '~~/engine/selection'
import { resolveStepValue, resolveStepValueRows, type StepValueRow } from '~~/engine/stepValues'
import type { CounterState, EngineSession, RuntimeStepNode, SessionContext, TextBlock } from '~~/engine/types'
import { useCharacterCatalogue } from './useCharacterCatalogue'
import { useGameContent } from './useGameContent'
import { resolvePlayerLabel } from './useHeroSearch'

export interface CounterCell {
  key: string
  label: string
  displayValue: string
  defeated: boolean
}

// StepValueCell (Fase 8, D-09): forma que StepScreen.vue recibe para la
// lista por jugador — hermana de CounterCell, pero sin `displayValue`
// (string) ni `defeated`: esta lista no es pulsable y su valor siempre es
// un número conocido (D-14 descarta la fila entera cuando no lo es, nunca
// emite un marcador).
export interface StepValueCell {
  key: string
  label: string
  value: number
}

// D-16: literal ÚNICO de toda la app para el sufijo de héroe derrotado —
// ninguna pantalla futura debe teclear una segunda redacción. Nótese que
// HP-06 usa la palabra "derrotado" para describir la condición en la
// documentación de producto, pero el literal en pantalla (definido abajo,
// mayúsculas, sin tilde, sin concordancia de género que resolver, D-15) es
// otra redacción: esta diferencia entre la palabra de producto y el
// literal de UI es deliberada, no una inconsistencia a corregir.
const DEFEATED_SUFFIX = ' · SIN VIDA'

// buildCounterCells: función PURA, sin Vue, que transforma los valores ya
// resueltos por engine/counters.ts (`resolveCounterValues`) y los huecos de
// jugador (`resolvePlayerSlots`) en el modelo de vista que CounterBand.vue
// pinta directamente. La celda del villano va primero, con etiqueta fija
// "VILLANO" y `defeated` SIEMPRE `false` — incluso a 0 (D-11), porque la
// banda no reacciona a que el villano llegue a 0. El número de celdas es
// siempre `slots.length + 1`.
export function buildCounterCells(
  values: CounterState,
  slots: { heroId: string | null, playerName: string }[],
): CounterCell[] {
  const villainCell: CounterCell = {
    key: 'villano',
    label: 'VILLANO',
    displayValue: values.villainHealth === null ? '—' : String(values.villainHealth),
    defeated: false,
  }

  const heroCells: CounterCell[] = slots.map((slot, i) => {
    const health = values.heroHealth[i] ?? null
    // Comparación estricta `=== 0`, nunca `!valor`: eso colapsaría `null`
    // (sin valor conocido) con `0` (a cero pulsaciones), exactamente lo que
    // D-12 prohíbe.
    const defeated = health === 0
    const baseLabel = resolvePlayerLabel(i, slot.playerName)
    return {
      key: `jugador-${i}`,
      label: defeated ? `${baseLabel}${DEFEATED_SUFFIX}` : baseLabel,
      displayValue: health === null ? '—' : String(health),
      defeated,
    }
  })

  return [villainCell, ...heroCells]
}

// buildStepValueSuffix (D-08, VAL-01/VAL-03): el sufijo que se interpola
// DENTRO del mismo `<p>` de la frase grande, nunca en un bloque propio —
// `' (42)'`, un espacio inicial y paréntesis normales, sin espacios dentro.
// `null` ante cualquier cosa que no sea un número finito (incluidos `null`,
// `undefined` y `NaN`): es lo que hace que D-15 sea mecánico, sin selección
// el `<p>` interpola `null ?? ''` y el texto renderizado queda idéntico al
// de antes de esta fase, carácter por carácter.
export function buildStepValueSuffix(value: number | null): string | null {
  return Number.isFinite(value) ? ` (${value})` : null
}

// buildStepValueCells (D-09/D-14): mapea cada fila ya resuelta por
// `engine/stepValues.ts` a la celda que StepScreen.vue pinta. Misma
// etiqueta de jugador que `buildCounterCells` de arriba (`resolvePlayerLabel`)
// y el mismo glifo separador ` · ` que ya usa `DEFEATED_SUFFIX` en este
// fichero. NO introduce ningún marcador de ausencia: D-14 ya filtra en el
// motor las filas sin valor conocido, así que aquí no puede llegar ninguna
// (ese marcador es de la banda de contadores, superficie distinta). NO trunca
// la etiqueta en JS — el truncado es de CSS (`truncate`) en el componente.
// La clave `valor-{slot}` es deliberadamente distinta de `jugador-{i}`
// porque estas filas no son pulsables y su clave no viaja en ningún evento.
export function buildStepValueCells(rows: StepValueRow[]): StepValueCell[] {
  return rows.map(row => ({
    key: `valor-${row.slot}`,
    label: `${resolvePlayerLabel(row.slot, row.playerName)} · ${row.heroName}`,
    value: row.value,
  }))
}

export function useGameSession() {
  const session = ref<EngineSession | null>(null)
  const { getCatalogue } = useCharacterCatalogue()

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

  // Mutadores de selección de villano/héroes (Fase 6). Calcados línea a
  // línea de next/prev/jumpTo de arriba: guarda `if (!session.value) return`
  // y UNA sola sentencia de reasignación de `session.value` al valor
  // devuelto por la función pura correspondiente. Ninguno escribe en una
  // propiedad anidada (`session.value.context.selection…`, `heroes[i].x =`,
  // etc.) — es la razón por la que SEL-08 funciona sin fontanería nueva: el
  // `watchDebounced(session, …)` de `app/pages/[game]/index.vue` NO lleva
  // `{ deep: true }`, así que solo dispara cuando cambia la identidad de
  // `session.value`. Una mutación anidada actualizaría la pantalla igual
  // (proxy reactivo profundo del `ref`) pero perdería la selección al
  // recargar — el fallo se manifestaría solo en producción, nunca mirando
  // la pantalla en desarrollo.
  function setVillain(villainId: string | null) {
    if (!session.value) return
    session.value = engineSetVillain(session.value, villainId)
  }

  function setHero(slot: number, heroId: string | null) {
    if (!session.value) return
    session.value = engineSetHero(session.value, slot, heroId)
  }

  function setPlayerName(slot: number, playerName: string) {
    if (!session.value) return
    session.value = engineSetPlayerName(session.value, slot, playerName)
  }

  const currentNode = computed<RuntimeStepNode | null>(() => {
    if (!session.value) return null
    return session.value.sequence[session.value.cursor] ?? null
  })

  const currentText = computed<TextBlock>(() => {
    if (!session.value || !currentNode.value) return { text: '' }
    return resolveText(currentNode.value, session.value.context)
  })

  // currentAudioId (VOZ-07/plan 03.1-05): la voz no puede calcular esto por
  // su cuenta — el comentario de cabecera de useVoiceAnnouncer.ts le prohíbe
  // importar valores de `~~/engine/*` (solo `import type`), así que la
  // traducción nodo+dificultad → id de audio pregenerado vive aquí, al lado
  // de currentText, con la misma computed que ya resuelve el texto. Las dos
  // no pueden desincronizarse porque ambas leen la misma rama de variante
  // del motor (misma rama `speech` que ya usa resolveText, arriba).
  const currentAudioId = computed<string | null>(() => {
    if (!session.value || !currentNode.value) return null
    return resolveAudioId(currentNode.value, session.value.context)
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

  // showsSelectionGrid (D-02/TECH-04): único sitio de toda la app que
  // decide qué paso pinta la rejilla de selección, y lo decide leyendo la
  // clave del dato, jamás comparando contra el identificador fijo del paso
  // de héroes — misma disciplina que D-24 impuso al índice de salto. La
  // comparación es de igualdad estricta a propósito: el contenido llega al
  // navegador como JSON crudo sin pasar por el validador de esquema, así
  // que la clave puede estar simplemente ausente (mismo motivo que el
  // fallback `?? 'step'` de WR-01).
  const showsSelectionGrid = computed<boolean>(() => currentNode.value?.step.selection === 'characters')

  // playerSlots: la longitud la manda `context.playerCount`, nunca
  // `selection.heroes.length` (Q8); la normalización defensiva vive en la
  // función pura del motor —y por eso está testeada— y no aquí.
  const playerSlots = computed(() => (session.value ? resolvePlayerSlots(session.value.context) : []))

  const selectedVillainId = computed(() => (session.value ? resolveVillainId(session.value.context) : null))

  // showsCounterBand (D-07/TECH-04): se deriva del flag `sectionRepeats`
  // del motor —igualdad estricta a propósito, mismo motivo que
  // `showsSelectionGrid`— y NUNCA compara contra el id de contenido del
  // paso de rondas. "Durante la partida" de HP-01 se interpreta como
  // "durante el bucle de rondas": toda la preparación conserva el alto
  // íntegro para el texto grande.
  const showsCounterBand = computed<boolean>(() => currentNode.value?.sectionRepeats === true)

  // counterCells: alimenta CounterBand.vue ya resuelto (D-04/D-09/D-12) —
  // el componente no importa ~~/engine/*, todo llega por aquí. La longitud
  // la manda `playerCount`, porque la manda `resolvePlayerSlots`/
  // `resolveCounterValues`; este fichero no vuelve a derivarla.
  const counterCells = computed<CounterCell[]>(() => {
    if (!session.value) return []
    const catalogue = getCatalogue(session.value.gameId)
    const values = resolveCounterValues(session.value.context, catalogue)
    const slots = resolvePlayerSlots(session.value.context)
    return buildCounterCells(values, slots)
  })

  // stepValueSuffix/stepValueRows (D-08/D-09/D-14/D-15, Fase 8): la costura
  // reactiva que expone `engine/stepValues.ts` a la pantalla. Ambas leen
  // `currentNode.value?.step.value` y NO comparan contra ningún id de paso:
  // la decisión de qué se pinta vive en el dato (D-01/TECH-04), igual que
  // `showsSelectionGrid`. D-08: el sufijo se interpola dentro de la frase
  // grande, no es un bloque propio. D-14/D-15: fila a fila; sin ninguna
  // fila conocida, `null` — no un array vacío — porque `null` es lo que
  // hace que el bloque de lista no exista en el DOM, igual que el valor
  // por defecto de `selectionRows` en StepScreen.vue.
  const stepValueSuffix = computed<string | null>(() => {
    if (!session.value) return null
    const catalogue = getCatalogue(session.value.gameId)
    const value = resolveStepValue(currentNode.value?.step.value, session.value.context, catalogue)
    return buildStepValueSuffix(value)
  })

  const stepValueRows = computed<StepValueCell[] | null>(() => {
    if (!session.value) return null
    const catalogue = getCatalogue(session.value.gameId)
    const rows = resolveStepValueRows(currentNode.value?.step.value, session.value.context, catalogue)
    const cells = buildStepValueCells(rows)
    return cells.length ? cells : null
  })

  // incrementCounter/decrementCounter (D-20/HP-08): el formato de clave
  // ('villano' | 'jugador-{índice base 0}') vive solo aquí, que es también
  // quien lo produce en `buildCounterCells`; `index.vue` no debe conocerlo.
  // Cada rama es una ÚNICA sentencia de reasignación de `session.value`,
  // ninguna escribe en una propiedad anidada. Sin validar el rango de slot
  // aquí: el motor ya devuelve la misma referencia con un slot inválido y
  // duplicar la guarda sería una segunda fuente de verdad. Cualquier otra
  // clave es un no-op silencioso.
  function incrementCounter(key: string) {
    if (!session.value) return
    const catalogue = getCatalogue(session.value.gameId)
    if (key === 'villano') {
      session.value = engineIncrementVillain(session.value, catalogue)
      return
    }
    if (key.startsWith('jugador-')) {
      const slot = Number.parseInt(key.slice('jugador-'.length), 10)
      session.value = engineIncrementHero(session.value, slot, catalogue)
    }
  }

  function decrementCounter(key: string) {
    if (!session.value) return
    const catalogue = getCatalogue(session.value.gameId)
    if (key === 'villano') {
      session.value = engineDecrementVillain(session.value, catalogue)
      return
    }
    if (key.startsWith('jugador-')) {
      const slot = Number.parseInt(key.slice('jugador-'.length), 10)
      session.value = engineDecrementHero(session.value, slot, catalogue)
    }
  }

  return {
    session,
    start,
    next,
    prev,
    jumpTo,
    currentNode,
    currentText,
    currentAudioId,
    sectionLabel,
    plainSectionTitle,
    position,
    sessionContextLabel,
    showsSelectionGrid,
    playerSlots,
    selectedVillainId,
    setVillain,
    setHero,
    setPlayerName,
    showsCounterBand,
    counterCells,
    stepValueSuffix,
    stepValueRows,
    incrementCounter,
    decrementCounter,
  }
}
