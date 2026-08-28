<script setup lang="ts">
// Runner: compone las tres bandas y cablea la navegación. Lee el parámetro de
// ruta, obtiene el GameDefinition real y conecta next/back al motor a través
// de useGameSession (la única costura). Este componente sigue siendo "tonto"
// respecto al motor: no importa nada de ~~/engine, solo el composable.
import { onMounted } from 'vue'
import { useGameContent } from '~/composables/useGameContent'
import { useGameSession } from '~/composables/useGameSession'

const route = useRoute()
const gameId = route.params.game as string

const { getGame } = useGameContent()
const game = getGame(gameId)

const {
  start,
  next,
  prev,
  currentText,
  sectionLabel,
  position,
  sessionContextLabel,
} = useGameSession()

onMounted(() => {
  if (!game) return
  // STUB: sustituido por el mini-setup en el plan 01-02 (SETUP-01/02/03).
  start(gameId, { playerCount: 2, difficulty: 'normal' })
})

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
    Guard de cliente (Pitfall 7): estructura lista para que los planes 01-02 y
    01-04 aporten estado de navegador (localStorage) sin reorganizar la página.
    Aún no hay localStorage en esta tarea; el contexto de sesión es el STUB de
    arriba, calculado siempre igual en servidor y cliente.
  -->
  <ClientOnly v-else>
    <template #fallback>
      <div class="h-dvh bg-background flex items-center justify-center">
        <p class="text-body font-normal text-secondary-text">Cargando…</p>
      </div>
    </template>
    <div class="h-dvh flex flex-col">
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
