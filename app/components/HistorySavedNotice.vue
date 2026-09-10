<script setup lang="ts">
// Superficie visible de D-03 (09-UI-SPEC.md §8): calcado de la forma de
// UpdateBanner.vue/VoiceUnavailableNotice.vue, pero al igual que
// UpdateBanner esta banda SÍ necesita lógica propia (leer la variante
// pendiente, autocerrarse, descartarse a mano), así que llama a un
// composable en vez de recibir todo por props. Se monta en app/app.vue
// (no en la pantalla de juego) por el mismo motivo que UpdateBanner: el
// aviso se dispara en `/[game]` justo antes de volver a `/`, así que ya se
// ve en la pantalla de destino — app.vue es el único punto compartido por
// todas las rutas.
import { useHistorySavedNotice } from '~/composables/useHistorySavedNotice'

const { variant, dismiss } = useHistorySavedNotice()
</script>

<template>
  <div
    v-if="variant !== null"
    class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md"
  >
    <div v-if="variant === 'success'" class="flex flex-col gap-sm">
      <h2 class="text-heading font-bold text-primary-text first-letter:text-accent">
        ✓ Partida registrada
      </h2>
    </div>
    <div v-else class="flex flex-col gap-sm">
      <h2 class="text-heading font-bold text-primary-text first-letter:text-warning">
        ⚠ No se pudo guardar la partida
      </h2>
      <p class="text-body font-normal text-secondary-text">
        El dispositivo no permitió escribir en su almacenamiento (modo privado, cuota agotada u otro bloqueo similar). Revisad el modo privado del navegador o el espacio libre antes de la próxima partida.
      </p>
    </div>
    <button
      type="button"
      class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
      aria-label="Cerrar aviso"
      @click="dismiss"
    >
      ✕
    </button>
  </div>
</template>
