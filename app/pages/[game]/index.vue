<script setup lang="ts">
// Runner: compone las bandas y cablea la navegación, y resuelve la
// reanudación de partida guardada (PERS-02/03, SETUP-04/05) antes de mostrar
// nada. `expand`/`resume` son las dos únicas funciones puras del motor que
// esta página necesita para decidir con qué sesión arrancar antes de que
// exista una — el resto de la navegación sigue pasando siempre por
// useGameSession (la única costura reactiva).
import { useEventListener, useWakeLock } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
// `collectAudioIds` es tan función pura del motor como `expand`/`resume`/
// `tableOfContents` de aquí abajo: cálculo determinista sobre el
// `GameDefinition` que esta página ya tiene, sin I/O ni estado (VOZ-07,
// plan 03.1-02).
import { collectAudioIds } from '~~/engine/audio'
import { expand } from '~~/engine/expand'
import { resume } from '~~/engine/persistence'
// WR-01 (06-REVIEW.md): el tope de caracteres del nombre de jugador tiene una
// sola fuente, la constante del motor. Esta página la enlaza a PlayerModal por
// prop para que el componente siga siendo tonto (sin importar `~~/engine/*`) y
// para que no exista una segunda copia del número que pueda desincronizarse.
import { PLAYER_NAME_MAX_LENGTH } from '~~/engine/selection'
import { tableOfContents } from '~~/engine/toc'
import { useCharacterCatalogue } from '~/composables/useCharacterCatalogue'
import { useGameContent } from '~/composables/useGameContent'
import { useGameSession } from '~/composables/useGameSession'
import {
  buildDuplicateWarningText,
  buildHeroOptions,
  buildTakenByMap,
  buildVillainOptions,
  findHeroOption,
  findVillainOption,
  resolvePlayerLabel,
} from '~/composables/useHeroSearch'
import { usePersistedSession } from '~/composables/usePersistedSession'
import { usePreloadedAudio } from '~/composables/usePreloadedAudio'
import { shortcutsEnabled, useStepShortcuts } from '~/composables/useStepShortcuts'
import { useVoiceAnnouncer } from '~/composables/useVoiceAnnouncer'

const route = useRoute()
const gameId = route.params.game as string

const { getGame } = useGameContent()
const game = getGame(gameId)

// Fase 6: catálogo estático y sus listas ordenadas, calculados UNA sola vez
// junto a `game` de arriba — ordenar 23 nombres en cada render sería
// trabajo repetido sin motivo, y el catálogo no cambia en toda la vida de
// la página. Un `gameId` sin catálogo (Warhammer 40.000, `coming-soon`)
// deja las listas vacías sin romper nada — `getCatalogue` ya devuelve
// `null` en ese caso.
const { getCatalogue } = useCharacterCatalogue()
const catalogue = getCatalogue(gameId)
const heroOptions = catalogue ? buildHeroOptions(catalogue.heroes) : []
const villainOptions = catalogue ? buildVillainOptions(catalogue.villains) : []

const {
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
} = useGameSession()

const { load, save, clear } = usePersistedSession()

// D-09: precarga de los 35 audios pregenerados, disparada junto al wake lock
// en los tres puntos donde arranca una partida (ver onConfirm/
// onResumeContinue/onContentChangedAcknowledge más abajo).
const { prefetchAll } = usePreloadedAudio()

// Los 35 ids COMPLETOS (no solo los de la dificultad en curso): D-09 dice
// "los 35" (actualizado tras la fusión de setup.archienemigos.01+.02, quick
// 260901-jg1), así que una partida posterior con la otra dificultad ya
// encuentra sus variantes en caché aunque no haya red en ese momento.
const audioIds = computed(() => (game ? collectAudioIds(game) : []))

// Capa de locución (VOZ-01/02/04): recibe los computeds de useGameSession,
// nunca los obtiene por su cuenta (D-42's own single-seam discipline). La
// API de voz se queda encapsulada en el composable — esta página nunca
// importa useSpeechSynthesis.
const {
  voiceState,
  announce,
  silence,
  toggle: toggleVoice,
  showVoiceUnavailableNotice,
  dismissNotice,
} = useVoiceAnnouncer(currentNode, currentText, currentAudioId)

// Bloqueo de pantalla (UI-06/08, D-51): una sola instancia atada al ciclo de
// vida de ESTA página, nunca a un componente hijo que pueda montarse/
// desmontarse más a menudo que la sesión de partida. Ya trae su propio
// listener de visibilidad interno para volver a pedir el bloqueo al recuperar
// primer plano (no añadir aquí un useDocumentVisibility propio, D-45) y su
// propio tryOnScopeDispose para liberarlo al navegar fuera de esta página.
const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()

// Estado local del mini-setup (SETUP-01/02), previo a iniciar la sesión real.
const playerCount = ref<number | null>(null)
const difficulty = ref<'normal' | 'expert' | null>(null)

// Resolución de reanudación: `resumeResolved` es false hasta que `onMounted`
// (post-montaje, nunca durante SSR — Pitfall 7) decide entre fresh/resumed/
// content-changed. Mientras es false, la plantilla no muestra ni el paso 1
// ni el mini-setup, solo el estado de carga neutro.
const resumeResolved = ref(false)
const awaitingResumeChoice = ref(false)
const awaitingContentChangedAck = ref(false)
const awaitingDiscardConfirm = ref(false)
const awaitingEndConfirm = ref(false)

onMounted(() => {
  if (!game) {
    resumeResolved.value = true
    return
  }

  // Context placeholder: la secuencia y los índices de bucle no dependen del
  // context, solo la estructura del juego. Si hay partida guardada, resume()
  // sustituye este context por el persistido antes de que se muestre nada.
  const structural = expand(game, { playerCount: 1, difficulty: 'normal' })
  const persisted = load(gameId)
  const result = resume(persisted, structural)

  if (result.outcome === 'fresh') {
    resumeResolved.value = true
    return
  }

  session.value = result.session
  if (result.outcome === 'resumed') {
    awaitingResumeChoice.value = true
  }
  else {
    awaitingContentChangedAck.value = true
  }
  resumeResolved.value = true
})

// PERS-01: guardado automático al cambiar de paso, con debounce para no
// escribir en cada tecla de una ráfaga de taps. `session` se reasigna por
// completo en cada next/prev/jumpTo (nunca se muta in situ), así que un watch
// no profundo ya detecta cada cambio de cursor/round/context.
watchDebounced(
  session,
  (value) => {
    if (!value) return
    save(value)
  },
  { debounce: 300 },
)

// Hallazgo del plan 04-04 (fuera de su alcance original de nuxt.config.ts,
// documentado como desviación Regla 2 en su SUMMARY): una ráfaga de
// next()/prev() seguida de una recarga en menos de 300ms deja SIN GUARDAR el
// último paso — el `watchDebounced` de arriba nunca llega a disparar porque
// la página se descarga antes de que pase el periodo de silencio. Esto no es
// específico de offline (ocurriría igual con red), pero la suite de
// Playwright de OFF-02/OFF-03 lo expone al interactuar mucho más rápido que
// un dedo humano. `pagehide` cubre tanto recarga como cierre/navegación
// fuera, incluido el caso de Safari en iPad donde `beforeunload` es menos
// fiable (mismo criterio de "guardado nunca puede perder el último paso"
// que ya exige PERS-01). Guardar de más aquí es inofensivo: `save()` es
// idempotente sobre el mismo `session.value`.
useEventListener('pagehide', () => {
  if (session.value) save(session.value)
})

// D-43/D-40: entrar al primer paso desde el mini-setup no locuta. Es una
// decisión de configuración, se mira de cerca y se lee, no un paso guiado.
function onConfirm() {
  if (playerCount.value === null || difficulty.value === null) return
  start(gameId, { playerCount: playerCount.value, difficulty: difficulty.value })
  // UI-06/08 (D-51): pedir el bloqueo lo antes posible dentro del propio
  // toque que arranca la partida. UI-08 exige degradación silenciosa — un
  // rechazo (dispositivo sin soporte, o el issue de wake lock parcialmente
  // roto en iOS documentado en STACK.md) nunca debe escalar ni mostrar aviso.
  requestWakeLock('screen').catch(() => {})
  // D-09: dispara-y-olvida a propósito, SIN await — no puede retrasar ni la
  // aparición del primer paso ni el botón SIGUIENTE. Cualquier fallo (red,
  // caché, id ausente) se resuelve en silencio dentro de prefetchAll (D-07).
  prefetchAll(audioIds.value).catch(() => {})
}

// D-42: la locución se llama de forma síncrona, como sentencia plana, en el
// mismo cuerpo del manejador del toque que ya invoca next()/prev() — nunca
// desde un watch. En iPad Safari una locución disparada fuera del gesto del
// usuario se descarta en silencio.
function onNext() {
  next()
  announce()
}

function onBack() {
  prev()
  announce()
}

// FLOW-06/D-13: overlay a pantalla completa, agrupado por bloques (fases del
// esquema, TECH-04). `blocks` se recalcula sobre cada cursor — D-14: marcas
// derivadas de la posición, sin ningún estado adicional que persistir.
const isIndexOpen = ref(false)
const blocks = computed(() =>
  session.value ? tableOfContents(session.value.sequence, session.value.cursor) : [],
)

// D-45: abrir el índice ni locuta ni corta la locución en curso — la frase es
// corta y termina sola.
function onIndexOpen() {
  isIndexOpen.value = true
}

function onIndexClose() {
  isIndexOpen.value = false
}

function onIndexJumpTo(runtimeId: string) {
  jumpTo(runtimeId)
  announce()
}

// D-32/DC-15: estado efímero de interfaz, nunca persistido (misma categoría
// que D-26 ya rechazó persistir). Cerrar el modal es una consulta de solo
// lectura: nunca toca cursor/round/context, y devuelve el foco al elemento
// que lo abrió. Con dos disparadores (el `⚠` y ahora cada opción del turno,
// C1) apuntando al mismo modal, un único `activeDetail` evita el estado
// imposible "ambos abiertos" que dos banderas paralelas permitirían.
// StepScreen emite sin payload de foco (componente tonto, sin acoplarse a
// cómo la página gestiona el foco), así que la referencia al disparador se
// captura aquí, en el sitio de la llamada, leyendo el elemento activo del
// documento en el instante del emit — el propio botón que disparó el click
// es el elemento con foco en ese momento.
const activeDetail = ref<{ heading: string, body: string, tone: 'warning' | 'neutral' } | null>(null)
const detailTriggerEl = ref<HTMLElement | null>(null)

// D-45: abrir el modal de detalle del ⚠/de una opción ni locuta ni corta la
// locución en curso — la frase es corta y termina sola.
function onOpenWarningDetail() {
  detailTriggerEl.value = document.activeElement as HTMLElement | null
  activeDetail.value = {
    heading: currentText.value.warning ?? '',
    body: currentText.value.warningDetail ?? '',
    tone: 'warning',
  }
}

// Quick 260831-fkb: mismo mecanismo que onOpenWarningDetail, pero para el
// aviso de la lista de opciones. tone 'warning' porque es un aviso, no una
// opción neutra — no reusa onOpenWarningDetail porque lee un par de campos
// distinto (optionsWarning/optionsWarningDetail).
function onOpenOptionsWarningDetail() {
  detailTriggerEl.value = document.activeElement as HTMLElement | null
  activeDetail.value = {
    heading: currentText.value.optionsWarning ?? '',
    body: currentText.value.optionsWarningDetail ?? '',
    tone: 'warning',
  }
}

function onOpenOptionDetail(index: number) {
  const option = currentText.value.options?.[index]
  if (!option) return
  detailTriggerEl.value = document.activeElement as HTMLElement | null
  activeDetail.value = {
    heading: option.label,
    body: option.detail,
    tone: 'neutral',
  }
}

function onDismissDetail() {
  activeDetail.value = null
  detailTriggerEl.value?.focus()
}

// Fase 6 (D-12/D-13): un `ref` PROPIO, no se reutiliza `activeDetail` porque
// `activeDetail` está tipado para el modal informativo de un solo botón
// (`heading`/`body`/`tone`) y forzar ahí un modal de elección desdibujaría
// los dos; un único `ref` para los dos modales de selección sí evita el
// estado imposible «los dos abiertos», exactamente el mismo razonamiento
// que el comentario de `activeDetail` de arriba ya documenta para sus dos
// disparadores.
const activeSelectionModal = ref<{ kind: 'villain' } | { kind: 'player', slot: number } | null>(null)
const selectionTriggerEl = ref<HTMLElement | null>(null)

// D-45: abrir un modal de selección ni locuta ni corta la locución en
// curso — abrir un modal es mirar, no avanzar, mismo criterio que
// onOpenWarningDetail de arriba. `StepScreen` emite sin carga de foco
// (componente tonto), así que el disparador se captura aquí, en el sitio de
// la llamada, leyendo el elemento activo del documento en el instante del
// emit — mismo mecanismo que onOpenWarningDetail.
function onSelectRow(key: string) {
  selectionTriggerEl.value = document.activeElement as HTMLElement | null
  if (key === 'villain') {
    activeSelectionModal.value = { kind: 'villain' }
    return
  }
  const match = /^player-(\d+)$/.exec(key)
  if (!match) return // clave desconocida: no-op silencioso
  const slot = Number(match[1])
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerSlots.value.length) return
  activeSelectionModal.value = { kind: 'player', slot }
}

// Calcado de onDismissDetail: cierra y devuelve el foco a la fila que abrió
// el modal, por cualquiera de las tres vías (✕, velo, Escape).
function onDismissSelectionModal() {
  activeSelectionModal.value = null
  selectionTriggerEl.value?.focus()
}

// D-13: elegir guarda Y cierra; tocar la opción ya elegida es idempotente y
// no necesita caso especial.
function onSelectVillain(villainId: string | null) {
  setVillain(villainId)
  onDismissSelectionModal()
}

function onSelectHero(heroId: string | null) {
  if (activeSelectionModal.value?.kind !== 'player') return
  setHero(activeSelectionModal.value.slot, heroId)
  onDismissSelectionModal()
}

// D-13: el nombre se guarda según se escribe; solo tocar un héroe cierra el
// modal — este manejador NUNCA llama a onDismissSelectionModal.
function onPlayerNameInput(value: string) {
  if (activeSelectionModal.value?.kind !== 'player') return
  setPlayerName(activeSelectionModal.value.slot, value)
}

// Datos del hueco que `PlayerModal` necesita mientras está abierto —
// `null`/valores neutros cuando no hay ningún modal de jugador activo (la
// plantilla solo monta `PlayerModal` con `v-if`, así que estas computeds
// nunca se leen en ese caso, pero se mantienen totales por consistencia).
const activePlayerName = computed(() =>
  activeSelectionModal.value?.kind === 'player'
    ? (playerSlots.value[activeSelectionModal.value.slot]?.playerName ?? '')
    : '',
)

const activePlayerHeroId = computed(() =>
  activeSelectionModal.value?.kind === 'player'
    ? (playerSlots.value[activeSelectionModal.value.slot]?.heroId ?? null)
    : null,
)

const activePlayerTakenBy = computed(() =>
  activeSelectionModal.value?.kind === 'player'
    ? buildTakenByMap(playerSlots.value, activeSelectionModal.value.slot)
    : {},
)

// Fase 6 (SEL-01/02/03/04/09): filas de la rejilla de selección, resueltas
// aquí a partir del catálogo y de la sesión. `null` en cualquier paso que no
// declare `selection: 'characters'` en los datos — así el resto de pasos se
// renderiza exactamente igual que en v1.7, sin comparar contra el
// identificador fijo del paso de héroes en ningún sitio de este fichero
// (esa decisión ya vive en `showsSelectionGrid`, que lee el dato).
const selectionRows = computed(() => {
  if (!showsSelectionGrid.value) return null

  const villainOption = findVillainOption(villainOptions, selectedVillainId.value)
  const rows = [
    {
      key: 'villain',
      label: 'Villano',
      valueLabel: villainOption?.name ?? '—',
      hasValue: villainOption !== null,
      ariaLabel: 'Elegir villano',
    },
  ]

  playerSlots.value.forEach((slot, index) => {
    const heroOption = findHeroOption(heroOptions, slot.heroId)
    const label = resolvePlayerLabel(index, slot.playerName)
    rows.push({
      key: `player-${index}`,
      label,
      // '—' es un guion largo (em dash), el mismo carácter del Copywriting
      // Contract. hasValue:false es lo que hace que el valor se pinte en
      // texto secundario. Un heroId que no exista en el catálogo cae en
      // findHeroOption(...) === null y por tanto se muestra como «sin
      // elegir» — defensa ante un localStorage manipulado, no un caso
      // imposible.
      valueLabel: heroOption?.spanishName ?? '—',
      hasValue: heroOption !== null,
      // El rótulo ACTUAL de la fila (no "Jugador N" fijo), para que el
      // aria-label siga siendo exacto cuando el jugador se ponga nombre.
      ariaLabel: `Elegir héroe y nombre de ${label}`,
    })
  })

  return rows
})

// SEL-07/D-16: avisa y nunca bloquea; SIGUIENTE no cambia de comportamiento
// por esto (no se toca onNext, ni NavBand, ni se añade ninguna
// confirmación).
const duplicateWarningText = computed(() =>
  showsSelectionGrid.value ? buildDuplicateWarningText(playerSlots.value) : null,
)

// D-03: la lista de repaso se deriva de los summaryLabel de las fases con al
// menos un paso kind:step (la fase "mesa lista" queda excluida por no tener
// ninguno) — nunca tecleada dos veces. WR-03: acotada a la SECCIÓN del nodo
// summary actual (currentNode.value.sectionId), no a game.sections completo
// — en cuanto la Fase 2 añada la sección "round" con sus propias fases y
// summaryLabel, "mesa lista" (que se muestra antes de jugar ninguna ronda)
// no debe listar resúmenes de fases que el jugador todavía no ha recorrido.
const checklist = computed<string[]>(() => {
  if (!game || !currentNode.value) return []
  const section = game.sections.find(s => s.id === currentNode.value!.sectionId)
  if (!section) return []
  return section.phases
    .filter(phase => phase.steps.some(step => (step.kind ?? 'step') === 'step'))
    .map(phase => phase.summaryLabel)
    .filter((label): label is string => Boolean(label))
})

// Resumen "PREPARACIÓN · 8 de 23 · 3 jug · Normal" compuesto SIEMPRE con las
// computeds del composable (sectionLabel/position/sessionContextLabel),
// nunca con cadenas tecleadas a mano — vale tanto para el ResumePrompt como
// para el cuerpo del ConfirmDialog de descarte.
const savedSummary = computed(() => {
  const parts = [sectionLabel.value]
  if (position.value) {
    parts.push(`${position.value.current} de ${position.value.total}`)
  }
  parts.push(sessionContextLabel.value)
  return parts.join(' · ')
})

const discardBody = computed(() =>
  `Se borrará el progreso guardado de la partida en curso (${savedSummary.value}). Esta acción no se puede deshacer.`,
)

const endGameBody = computed(() =>
  `Se borrará el progreso guardado (${savedSummary.value}) y volveréis a la pantalla de inicio. Esta acción no se puede deshacer.`,
)

// D-43: «Continuar» de la reanudación locuta el paso recuperado — es un
// toque del usuario (funciona también en iPad) y volver de un bloqueo de
// tablet es justo cuando oír dónde ibais tiene valor.
function onResumeContinue() {
  awaitingResumeChoice.value = false
  announce()
  // UI-06/08 (D-51): «Continuar» también es un toque que abre partida en
  // curso. Degradación silenciosa igual que en onConfirm — sin aviso de
  // fallo (UI-08).
  requestWakeLock('screen').catch(() => {})
  // D-09: mismo dispara-y-olvida que en onConfirm — «Continuar» también
  // arranca una partida jugable, sin await, sin bloquear nada.
  prefetchAll(audioIds.value).catch(() => {})
}

function onResumeNewGame() {
  awaitingDiscardConfirm.value = true
}

function onDiscardCancel() {
  awaitingDiscardConfirm.value = false
}

function onDiscardConfirm() {
  clear(gameId)
  session.value = null
  awaitingResumeChoice.value = false
  awaitingDiscardConfirm.value = false
  // UI-06/08 (D-51): liberación EXPLÍCITA y obligatoria. Esta transición no
  // desmonta la página (misma instancia, misma ruta), así que el
  // tryOnScopeDispose interno de useWakeLock no se dispara aquí — sin esta
  // línea la tablet seguiría sin apagarse tras descartar la partida.
  releaseWakeLock().catch(() => {})
}

// D-U3: pedir la confirmación de «Partida terminada» NO cierra el índice —
// el diálogo se apila ENCIMA (mismo apilamiento que ResumePrompt/su
// ConfirmDialog de descarte). Cancelar significa «no era esto», no «cierra
// el menú».
function onEndGameRequest() {
  awaitingEndConfirm.value = true
}

function onEndGameCancel() {
  awaitingEndConfirm.value = false
}

// D-U4: orden EXACTO, no cosmético.
function onEndGameConfirm() {
  awaitingEndConfirm.value = false
  isIndexOpen.value = false
  // Corta la locución en curso: el tryOnScopeDispose de useVoiceAnnouncer
  // pausa el <audio> pregenerado al desmontar, pero speechSynthesis (el
  // camino de respaldo) no se detiene solo al cambiar de ruta — sin esto la
  // voz seguiría oyéndose ya en el selector de juego.
  silence()
  // session.value = null ANTES de clear(gameId): el autoguardado es un
  // watchDebounced de 300ms. Si hubiera una escritura pendiente con la
  // sesión antigua, se ejecutaría DESPUÉS del borrado y resucitaría la
  // clave. Asignar null reprograma esa invocación pendiente con null, que
  // la guarda `if (!value) return` del watch descarta (mismo truco que
  // onDiscardConfirm).
  session.value = null
  clear(gameId)
  // NO se llama a releaseWakeLock() aquí: navigateTo desmonta esta página y
  // el tryOnScopeDispose interno de useWakeLock ya libera el bloqueo solo
  // (mismo razonamiento que el «Atrás» del mini-setup, líneas 434-439 más
  // abajo) — al contrario que onDiscardConfirm, que sí libera a mano porque
  // esa transición no desmonta la página.
  navigateTo('/')
}

// D-43: mismo razonamiento que onResumeContinue — el CTA de reconocimiento
// del aviso de contenido cambiado locuta el paso recuperado.
function onContentChangedAcknowledge() {
  awaitingContentChangedAck.value = false
  announce()
  // UI-06/08 (D-51): D-43 clasifica este CTA como gesto de reanudación igual
  // que «Continuar» — resume() deja una sesión real y jugable, así que abre
  // partida en curso a efectos del bloqueo de pantalla.
  requestWakeLock('screen').catch(() => {})
  // D-09: mismo dispara-y-olvida que en onConfirm/onResumeContinue — este
  // CTA también abre una partida jugable.
  prefetchAll(audioIds.value).catch(() => {})
}

// NO-OP INTENCIONAL (documentado para la Fase 2, ver 01-05-SUMMARY.md):
// "EMPEZAR A JUGAR" en la pantalla "mesa lista" llama al mismo next() que el
// resto de la app. Como esta fase no autora ninguna sección con repeats:true,
// next() deja el cursor clampeado en el mismo índice (último de la
// secuencia) — no navega a ningún sitio. Esto NO es un bug: es el punto de
// enganche reservado para el bucle de ronda que la Fase 2 añadirá autorando
// la sección "round". No añadir lógica especial aquí para "arreglarlo".
// D-40/D-43: por el mismo motivo, la voz tampoco se engancha aquí — "Mesa
// lista" es kind:'summary' y nunca habla.

// Quick 260831-g2s: Espacio/Enter/flecha izquierda en un portátil. D-Q2: la
// condición vive por completo en la función pura ya testeada
// (shortcutsEnabled) — no se reimplementa en línea. D-Q5: "Mesa lista"
// (hasSession true, kind:'summary') queda deliberadamente incluida, sin
// caso especial: sus botones ya llaman a los mismos next()/onBack().
const atajosActivos = computed(() =>
  shortcutsEnabled({
    resumeResolved: resumeResolved.value,
    hasSession: session.value !== null,
    awaitingResumeChoice: awaitingResumeChoice.value,
    awaitingContentChangedAck: awaitingContentChangedAck.value,
    awaitingDiscardConfirm: awaitingDiscardConfirm.value,
    awaitingEndConfirm: awaitingEndConfirm.value,
    isIndexOpen: isIndexOpen.value,
    // D-12 se cierra AQUÍ y SOLO aquí: la condición sigue viviendo entera
    // dentro de `shortcutsEnabled` (D-Q2), lo único que cambia es qué se le
    // pasa como argumento — `app/composables/useStepShortcuts.ts` no se
    // toca. Esta es la segunda de las dos guardas que protegen el campo de
    // nombre: la primera, `isEditableTarget`, ya devuelve `null` para
    // Espacio con el foco en un `<input>`; esta cubre además `←` con el
    // foco en el `✕` o en una fila del modal.
    hasActiveDetail: activeDetail.value !== null || activeSelectionModal.value !== null,
  }),
)

// D-Q3: reutiliza EXACTAMENTE los mismos onNext/onBack que NavBand — ni una
// línea duplicada de la lógica de avance/retroceso ni de la locución.
useStepShortcuts(atajosActivos, { onNext, onBack })
</script>

<template>
  <!-- id desconocido: mensaje neutro, sin filtrar el id ni sugerir juegos (T-01-06) -->
  <div v-if="!game" class="h-dvh bg-background flex items-center justify-center px-2xl">
    <p class="text-body font-normal text-secondary-text text-center max-w-[600px]">
      No encontramos ese juego. Volved al selector e intentadlo de nuevo.
    </p>
  </div>

  <!--
    Guard de cliente (Pitfall 7): la resolución de reanudación (almacenamiento
    persistente del navegador) ocurre solo tras montar, dentro de onMounted —
    nunca durante SSR.
  -->
  <ClientOnly v-else>
    <template #fallback>
      <div class="h-dvh bg-background flex items-center justify-center">
        <p class="text-body font-normal text-secondary-text">Cargando…</p>
      </div>
    </template>

    <!-- Estado de carga neutro mientras onMounted no ha resuelto la reanudación todavía (Pitfall 7). -->
    <div v-if="!resumeResolved" class="h-dvh bg-background flex items-center justify-center">
      <p class="text-body font-normal text-secondary-text">Cargando…</p>
    </div>

    <!-- SETUP-04: nunca se reanuda en silencio. ConfirmDialog se apila encima al pedir "Empezar nueva" (SETUP-05). -->
    <div v-else-if="awaitingResumeChoice" class="h-dvh">
      <ResumePrompt
        :saved-summary="savedSummary"
        @resume="onResumeContinue"
        @new-game="onResumeNewGame"
      />
      <ConfirmDialog
        v-if="awaitingDiscardConfirm"
        title="¿Empezar una partida nueva?"
        :body="discardBody"
        confirm-label="Sí, empezar nueva"
        cancel-label="Cancelar"
        :destructive="true"
        @confirm="onDiscardConfirm"
        @cancel="onDiscardCancel"
      />
    </div>

    <!-- PERS-03: el desenlace ya está decidido, un único CTA de reconocimiento. -->
    <ContentChangedNotice
      v-else-if="awaitingContentChangedAck"
      :session-context="sessionContextLabel"
      :section-label="sectionLabel"
      @acknowledge="onContentChangedAcknowledge"
    />

    <MiniSetupScreen
      v-else-if="!session"
      :player-count="playerCount"
      :difficulty="difficulty"
      :game-title="game.title"
      :min-players="game.minPlayers ?? 1"
      :max-players="game.maxPlayers ?? 4"
      @update:player-count="playerCount = $event"
      @update:difficulty="difficulty = $event"
      @confirm="onConfirm"
      @back="navigateTo('/')"
    />
    <!--
      UI-06/08 (D-51): sin llamada de liberación explícita aquí a propósito,
      no un olvido — navigateTo desmonta esta página y el tryOnScopeDispose
      interno de useWakeLock ya libera el bloqueo solo. Añadirla sería
      redundante sobre un bloqueo que ya se está liberando.
    -->

    <!--
      D-03: "mesa lista" es un paso autorado más (kind:summary), nunca un
      centinela de posición — el despacho de pantalla mira SIEMPRE
      currentNode.step.kind, jamás compara el cursor con sequence.length.
    -->
    <MesaListaScreen
      v-else-if="currentNode?.step.kind === 'summary'"
      :checklist="checklist"
      :session-context="sessionContextLabel"
      @back="onBack"
      @start="next"
    />

    <div v-else class="h-dvh flex flex-col">
      <AppHeader
        :section-label="sectionLabel"
        :position="position"
        :session-context="sessionContextLabel"
        :voice-state="voiceState"
        @index-open="onIndexOpen"
        @voice-toggle="toggleVoice"
      />
      <VoiceUnavailableNotice
        v-if="showVoiceUnavailableNotice"
        @dismiss="dismissNotice"
      />
      <StepScreen
        :action-text="currentText.text"
        :warning-text="currentText.warning ?? null"
        :warning-detail-text="currentText.warningDetail ?? null"
        :options="currentText.options ?? null"
        :options-warning-text="currentText.optionsWarning ?? null"
        :options-warning-detail-text="currentText.optionsWarningDetail ?? null"
        :selection-rows="selectionRows"
        :duplicate-warning-text="duplicateWarningText"
        @open-warning-detail="onOpenWarningDetail"
        @open-option-detail="onOpenOptionDetail"
        @open-options-warning-detail="onOpenOptionsWarningDetail"
        @select-row="onSelectRow"
      />
      <NavBand @back="onBack" @next="onNext" />
      <IndexOverlay
        v-if="isIndexOpen"
        :title="plainSectionTitle"
        :blocks="blocks"
        @jump-to="onIndexJumpTo"
        @close="onIndexClose"
        @end-game="onEndGameRequest"
      />
      <!--
        D-U3: hermano JUSTO DESPUÉS de IndexOverlay — ambos son fixed
        inset-0 z-50, así que el que va después en el DOM pinta encima sin
        tocar ningún z-index (mismo apilamiento que ResumePrompt/su
        ConfirmDialog de descarte).
      -->
      <ConfirmDialog
        v-if="awaitingEndConfirm"
        title="¿Dar la partida por terminada?"
        :body="endGameBody"
        confirm-label="Sí, terminar"
        cancel-label="Cancelar"
        :destructive="true"
        @confirm="onEndGameConfirm"
        @cancel="onEndGameCancel"
      />
      <WarningDetailModal
        v-if="activeDetail"
        :heading="activeDetail.heading"
        :body="activeDetail.body"
        :tone="activeDetail.tone"
        @dismiss="onDismissDetail"
      />
      <!--
        D-U3: hermanos JUSTO DESPUÉS de WarningDetailModal — ambos son fixed
        inset-0 z-50, así que el que va después en el DOM pinta encima sin
        tocar ningún z-index (mismo apilamiento ya usado arriba entre
        IndexOverlay y ConfirmDialog).
      -->
      <VillainPickerModal
        v-if="activeSelectionModal?.kind === 'villain'"
        :villains="villainOptions"
        :selected-id="selectedVillainId"
        @select="onSelectVillain"
        @dismiss="onDismissSelectionModal"
      />
      <PlayerModal
        v-if="activeSelectionModal?.kind === 'player'"
        :key="activeSelectionModal.slot"
        :slot-number="activeSelectionModal.slot + 1"
        :name="activePlayerName"
        :heroes="heroOptions"
        :selected-hero-id="activePlayerHeroId"
        :taken-by="activePlayerTakenBy"
        :name-max-length="PLAYER_NAME_MAX_LENGTH"
        @name-input="onPlayerNameInput"
        @select-hero="onSelectHero"
        @dismiss="onDismissSelectionModal"
      />
    </div>
  </ClientOnly>
</template>
