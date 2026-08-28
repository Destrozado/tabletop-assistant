<script setup lang="ts">
// Runner: compone las bandas y cablea la navegación. Lee el parámetro de
// ruta, obtiene el GameDefinition real y conecta next/back al motor a través
// de useGameSession (la única costura). Este componente sigue siendo "tonto"
// respecto al motor: no importa nada de ~~/engine, solo el composable.
import { ref } from 'vue'
import { useGameContent } from '~/composables/useGameContent'
import { useGameSession } from '~/composables/useGameSession'

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

// Estado local del mini-setup (SETUP-01/02), previo a iniciar la sesión real.
const playerCount = ref<number | null>(null)
const difficulty = ref<'normal' | 'expert' | null>(null)

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
    Guard de cliente (Pitfall 7): estructura lista para que el plan 01-04
    aporte estado de navegador (localStorage) sin reorganizar la página.
  -->
  <ClientOnly v-else>
    <template #fallback>
      <div class="h-dvh bg-background flex items-center justify-center">
        <p class="text-body font-normal text-secondary-text">Cargando…</p>
      </div>
    </template>

    <MiniSetupScreen
      v-if="!session"
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
