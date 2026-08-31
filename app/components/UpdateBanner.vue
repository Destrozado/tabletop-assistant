<script setup lang="ts">
// Superficie visible de OFF-04 (D-01/D-02/D-03): calcado de la forma de
// VoiceUnavailableNotice.vue, pero esta banda SÍ necesita lógica propia (leer
// $pwa, decidir si se pinta, aplicar/descartar), así que a diferencia de su
// precedente llama a un composable en vez de recibir todo por props/emits.
// Se monta en app/app.vue (no en la pantalla de juego) porque una versión
// nueva puede detectarse en cualquier pantalla, incluido el selector de
// juego — app.vue es el único punto compartido por todas las rutas.
import { useUpdatePrompt } from '~/composables/useUpdatePrompt'

const { showUpdateBanner, dismissUpdate, applyUpdate } = useUpdatePrompt()
</script>

<template>
  <div
    v-if="showUpdateBanner"
    class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md"
  >
    <div class="flex flex-col gap-sm">
      <h2 class="text-heading font-bold text-primary-text">
        Nueva versión disponible
      </h2>
      <p class="text-body font-normal text-secondary-text">
        Podéis seguir jugando y aplicarla cuando queráis: la partida se reanuda en el mismo paso.
      </p>
      <button
        type="button"
        class="bg-accent text-on-accent min-h-12 px-lg text-body font-bold self-start active:brightness-95"
        @click="applyUpdate"
      >
        Actualizar
      </button>
    </div>
    <button
      type="button"
      class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
      aria-label="Cerrar aviso"
      @click="dismissUpdate"
    >
      ✕
    </button>
  </div>
</template>
