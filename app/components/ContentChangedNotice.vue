<script setup lang="ts">
// Componente tonto. PERS-03 ya decidió el desenlace (inicio de sección,
// jugadores/dificultad conservados): no es una elección de dos ramas como
// ResumePrompt, así que expone exactamente un botón de reconocimiento.
import { ref } from 'vue'

defineProps<{
  sessionContext: string
  sectionLabel: string
}>()

const emit = defineEmits<{
  acknowledge: []
}>()

const ctaPressed = ref(false)
</script>

<template>
  <div role="dialog" aria-modal="true" class="fixed inset-0 z-40 bg-background flex items-center justify-center px-xl">
    <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
      <h1 class="text-heading font-bold text-primary-text">
        El contenido ha cambiado
      </h1>

      <p class="text-body font-normal text-secondary-text">
        La partida guardada ya no coincide con el contenido actual. Volvemos al inicio de {{ sectionLabel }}, con {{ sessionContext }}.
      </p>

      <div class="flex justify-end pt-sm">
        <button
          type="button"
          class="min-h-12 px-lg bg-accent text-on-accent text-label font-bold transition-transform duration-75"
          :class="ctaPressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="ctaPressed = true"
          @touchstart="ctaPressed = true"
          @mouseup="ctaPressed = false"
          @touchend="ctaPressed = false"
          @click="emit('acknowledge')"
        >
          ENTENDIDO ›
        </button>
      </div>
    </div>
  </div>
</template>
