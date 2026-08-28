<script setup lang="ts">
// Componente tonto y genérico, reutilizado por el flujo "Empezar nueva" del
// ResumePrompt (01-UI-SPEC §Component Inventory). El único destino
// destructivo de toda la fase: relleno rojo solo cuando `destructive` es
// true (reserva de color del contrato).
import { ref } from 'vue'

defineProps<{
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  destructive: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmPressed = ref(false)
const cancelPressed = ref(false)
</script>

<template>
  <div role="dialog" aria-modal="true" class="fixed inset-0 z-50 bg-background flex items-center justify-center px-xl">
    <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
      <h1 class="text-heading font-bold text-primary-text">
        {{ title }}
      </h1>

      <p class="text-body font-normal text-secondary-text">
        {{ body }}
      </p>

      <div class="flex flex-wrap gap-md justify-end pt-sm">
        <button
          type="button"
          class="min-h-12 px-lg bg-surface text-primary-text text-label font-bold transition-transform duration-75"
          :class="cancelPressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="cancelPressed = true"
          @touchstart="cancelPressed = true"
          @mouseup="cancelPressed = false"
          @touchend="cancelPressed = false"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="min-h-12 px-lg text-label font-bold transition-transform duration-75"
          :class="[
            destructive ? 'bg-destructive text-on-accent' : 'bg-accent text-on-accent',
            confirmPressed ? 'brightness-95 scale-[0.98]' : '',
          ]"
          @mousedown="confirmPressed = true"
          @touchstart="confirmPressed = true"
          @mouseup="confirmPressed = false"
          @touchend="confirmPressed = false"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
