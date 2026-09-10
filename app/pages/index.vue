<script setup lang="ts">
// Ruta / — selector de juego (SEL-01..04). Solo compone GameSelectorScreen
// alimentándolo con el índice real de useGameContent y navega al confirmar.
import { useGameContent } from '~/composables/useGameContent'

const { games } = useGameContent()

function onSelect(gameId: string) {
  navigateTo('/' + gameId)
}

// D-17/STAT-01: los dos accesos secundarios navegan desde la página, nunca
// dentro del componente tonto.
function onOpenHistory() {
  navigateTo('/historico')
}

function onOpenStatistics() {
  navigateTo('/estadisticas')
}
</script>

<template>
  <GameSelectorScreen
    :games="games"
    @select="onSelect"
    @open-history="onOpenHistory"
    @open-statistics="onOpenStatistics"
  />
</template>
