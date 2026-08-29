<script setup lang="ts">
// Runner: compone las bandas y cablea la navegación, y resuelve la
// reanudación de partida guardada (PERS-02/03, SETUP-04/05) antes de mostrar
// nada. `expand`/`resume` son las dos únicas funciones puras del motor que
// esta página necesita para decidir con qué sesión arrancar antes de que
// exista una — el resto de la navegación sigue pasando siempre por
// useGameSession (la única costura reactiva).
import { computed, onMounted, ref } from 'vue'
import { expand } from '~~/engine/expand'
import { resume } from '~~/engine/persistence'
import { tableOfContents } from '~~/engine/toc'
import { useGameContent } from '~/composables/useGameContent'
import { useGameSession } from '~/composables/useGameSession'
import { usePersistedSession } from '~/composables/usePersistedSession'

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

function onConfirm() {
  if (playerCount.value === null || difficulty.value === null) return
  start(gameId, { playerCount: playerCount.value, difficulty: difficulty.value })
}

// FLOW-06/D-13: overlay a pantalla completa, agrupado por bloques (fases del
// esquema, TECH-04). `blocks` se recalcula sobre cada cursor — D-14: marcas
// derivadas de la posición, sin ningún estado adicional que persistir.
const isIndexOpen = ref(false)
const blocks = computed(() =>
  session.value ? tableOfContents(session.value.sequence, session.value.cursor) : [],
)

function onIndexOpen() {
  isIndexOpen.value = true
}

function onIndexClose() {
  isIndexOpen.value = false
}

function onIndexJumpTo(runtimeId: string) {
  jumpTo(runtimeId)
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

function onResumeContinue() {
  awaitingResumeChoice.value = false
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
}

function onContentChangedAcknowledge() {
  awaitingContentChangedAck.value = false
}

// NO-OP INTENCIONAL (documentado para la Fase 2, ver 01-05-SUMMARY.md):
// "EMPEZAR A JUGAR" en la pantalla "mesa lista" llama al mismo next() que el
// resto de la app. Como esta fase no autora ninguna sección con repeats:true,
// next() deja el cursor clampeado en el mismo índice (último de la
// secuencia) — no navega a ningún sitio. Esto NO es un bug: es el punto de
// enganche reservado para el bucle de ronda que la Fase 2 añadirá autorando
// la sección "round". No añadir lógica especial aquí para "arreglarlo".
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
      D-03: "mesa lista" es un paso autorado más (kind:summary), nunca un
      centinela de posición — el despacho de pantalla mira SIEMPRE
      currentNode.step.kind, jamás compara el cursor con sequence.length.
    -->
    <MesaListaScreen
      v-else-if="currentNode?.step.kind === 'summary'"
      :checklist="checklist"
      :session-context="sessionContextLabel"
      @back="prev"
      @start="next"
    />

    <div v-else class="h-dvh flex flex-col">
      <AppHeader
        :section-label="sectionLabel"
        :position="position"
        :session-context="sessionContextLabel"
        @index-open="onIndexOpen"
      />
      <StepScreen
        :action-text="currentText.text"
        :warning-text="currentText.warning ?? null"
      />
      <NavBand @back="prev" @next="next" />
      <IndexOverlay
        v-if="isIndexOpen"
        :title="plainSectionTitle"
        :blocks="blocks"
        @jump-to="onIndexJumpTo"
        @close="onIndexClose"
      />
    </div>
  </ClientOnly>
</template>
