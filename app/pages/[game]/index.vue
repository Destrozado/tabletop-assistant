<script setup lang="ts">
// Runner: compone las bandas y cablea la navegación, y resuelve la
// reanudación de partida guardada (PERS-02/03, SETUP-04/05) antes de mostrar
// nada. `expand`/`resume` son las dos únicas funciones puras del motor que
// esta página necesita para decidir con qué sesión arrancar antes de que
// exista una — el resto de la navegación sigue pasando siempre por
// useGameSession (la única costura reactiva).
import { onMounted, ref } from 'vue'
import { expand } from '~~/engine/expand'
import { resume } from '~~/engine/persistence'
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
  currentText,
  sectionLabel,
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

function onIndexOpen() {
  // El índice de salto llega en el plan 01-05; sin handler todavía.
}
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

    <!-- Placeholder de la Tarea 3 (ResumePrompt real, con ConfirmDialog de descarte). -->
    <div v-else-if="awaitingResumeChoice" class="h-dvh bg-background flex items-center justify-center">
      <p class="text-body font-normal text-secondary-text">Resolviendo partida guardada…</p>
    </div>

    <!-- Placeholder de la Tarea 3 (ContentChangedNotice real). -->
    <div v-else-if="awaitingContentChangedAck" class="h-dvh bg-background flex items-center justify-center">
      <p class="text-body font-normal text-secondary-text">El contenido ha cambiado…</p>
    </div>

    <MiniSetupScreen
      v-else-if="!session"
      :player-count="playerCount"
      :difficulty="difficulty"
      :game-title="game.title"
      @update:player-count="playerCount = $event"
      @update:difficulty="difficulty = $event"
      @confirm="onConfirm"
      @back="navigateTo('/')"
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
    </div>
  </ClientOnly>
</template>
