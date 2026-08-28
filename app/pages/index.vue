<script setup lang="ts">
// Ruta / — selector de juego (SEL-01..04). Solo compone GameSelectorScreen
// alimentándolo con el índice real de useGameContent y navega al confirmar.
import { useGameContent } from '~/composables/useGameContent'

const { games } = useGameContent()

function onSelect(gameId: string) {
  navigateTo('/' + gameId)
}
</script>

<template>
  <GameSelectorScreen :games="games" @select="onSelect" />
</template>
