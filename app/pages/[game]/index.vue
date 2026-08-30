<script setup lang="ts">
// Runner: compone las bandas y cablea la navegación, y resuelve la
// reanudación de partida guardada (PERS-02/03, SETUP-04/05) antes de mostrar
// nada. `expand`/`resume` son las dos únicas funciones puras del motor que
// esta página necesita para decidir con qué sesión arrancar antes de que
// exista una — el resto de la navegación sigue pasando siempre por
// useGameSession (la única costura reactiva).
import { useWakeLock } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { expand } from '~~/engine/expand'
import { resume } from '~~/engine/persistence'
import { tableOfContents } from '~~/engine/toc'
import { useGameContent } from '~/composables/useGameContent'
import { useGameSession } from '~/composables/useGameSession'
import { usePersistedSession } from '~/composables/usePersistedSession'
import { useVoiceAnnouncer } from '~/composables/useVoiceAnnouncer'

const route = useRoute()
const gameId = route.params.game as string

const { getGame } = useGameContent()
const game = getGame(gameId)

const {
  session,
  start,
  next,
  prev,
  jumpTo,
  currentNode,
  currentText,
  sectionLabel,
  plainSectionTitle,
  position,
  sessionContextLabel,
} = useGameSession()

const { load, save, clear } = usePersistedSession()

// Capa de locución (VOZ-01/02/04): recibe los computeds de useGameSession,
// nunca los obtiene por su cuenta (D-42's own single-seam discipline). La
// API de voz se queda encapsulada en el composable — esta página nunca
// importa useSpeechSynthesis.
const {
  voiceState,
  announce,
  toggle: toggleVoice,
  showVoiceUnavailableNotice,
  dismissNotice,
} = useVoiceAnnouncer(currentNode, currentText)

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
// captura aquí, en el sitio de la llamada, leyendo `document.activeElement`
// en el instante del emit — el propio botón que disparó el click es el
// elemento con foco en ese momento.
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

// D-43: mismo razonamiento que onResumeContinue — el CTA de reconocimiento
// del aviso de contenido cambiado locuta el paso recuperado.
function onContentChangedAcknowledge() {
  awaitingContentChangedAck.value = false
  announce()
  // UI-06/08 (D-51): D-43 clasifica este CTA como gesto de reanudación igual
  // que «Continuar» — resume() deja una sesión real y jugable, así que abre
  // partida en curso a efectos del bloqueo de pantalla.
  requestWakeLock('screen').catch(() => {})
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
        @open-warning-detail="onOpenWarningDetail"
        @open-option-detail="onOpenOptionDetail"
      />
      <NavBand @back="onBack" @next="onNext" />
      <IndexOverlay
        v-if="isIndexOpen"
        :title="plainSectionTitle"
        :blocks="blocks"
        @jump-to="onIndexJumpTo"
        @close="onIndexClose"
      />
      <WarningDetailModal
        v-if="activeDetail"
        :heading="activeDetail.heading"
        :body="activeDetail.body"
        :tone="activeDetail.tone"
        @dismiss="onDismissDetail"
      />
    </div>
  </ClientOnly>
</template>
