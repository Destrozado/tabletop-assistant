<script setup lang="ts">
// Componente tonto. Modal bloqueante: SETUP-04 exige que la app nunca
// reanude en silencio, así que este componente deliberadamente NO expone
// ningún control de cierre, no escucha Escape y no se descarta al tocar
// fuera — la única salida es elegir una de las dos acciones (01-UI-SPEC
// §Resume-vs-new prompt).
import { ref } from 'vue'

defineProps<{
  savedSummary: string
}>()

const emit = defineEmits<{
  resume: []
  'new-game': []
}>()

const newGamePressed = ref(false)
const continuePressed = ref(false)
</script>

<template>
  <div role="dialog" aria-modal="true" class="fixed inset-0 z-40 bg-background flex items-center justify-center px-xl">
    <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
      <h1 class="text-heading font-bold text-primary-text">
        Partida guardada
      </h1>

      <div class="flex flex-col gap-sm">
        <p class="text-body font-normal text-secondary-text">
          Tenéis una partida en curso:
        </p>
        <p class="text-label font-bold text-primary-text">
          {{ savedSummary }}
        </p>
      </div>

      <p class="text-body font-normal text-secondary-text">
        ¿Continuar o empezar una partida nueva? Empezar una nueva borrará el progreso guardado.
      </p>

      <div class="flex flex-wrap gap-md justify-end pt-sm">
        <button
          type="button"
          class="min-h-12 px-lg border border-destructive text-destructive text-label font-bold transition-transform duration-75"
          :class="newGamePressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="newGamePressed = true"
          @touchstart="newGamePressed = true"
          @mouseup="newGamePressed = false"
          @touchend="newGamePressed = false"
          @click="emit('new-game')"
        >
          Empezar nueva
        </button>
        <button
          type="button"
          class="min-h-12 px-lg bg-accent text-on-accent text-label font-bold transition-transform duration-75"
          :class="continuePressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="continuePressed = true"
          @touchstart="continuePressed = true"
          @mouseup="continuePressed = false"
          @touchend="continuePressed = false"
          @click="emit('resume')"
        >
          CONTINUAR ›
        </button>
      </div>
    </div>
  </div>
</template>
