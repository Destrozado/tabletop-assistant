<script setup lang="ts">
// Componente tonto. Ningún estado inactivo en esta fase (01-UI-SPEC
// §Disabled states): en el primer y el último paso los botones siguen
// activos y el motor hace clamp — no declarar ese atributo aquí.
import { ref } from 'vue'

withDefaults(defineProps<{
  nextLabel?: string
}>(), {
  nextLabel: 'SIGUIENTE',
})

const emit = defineEmits<{
  back: []
  next: []
}>()

// El estado de pulsado vuelve a reposo por cuatro caminos, no solo al
// soltar sobre el propio botón: salir el puntero, perder el foco, y que el
// sistema cancele el toque — mismo juego de manejadores que CounterBand.vue,
// para que el comentario de cabecera que dice que este patrón se reutiliza
// literalmente siga siendo cierto. La acción sigue atada solo al clic
// completo.
const backPressed = ref(false)
const nextPressed = ref(false)
</script>

<template>
  <footer class="h-24 shrink-0 bg-surface flex">
    <button
      type="button"
      class="basis-[35%] flex items-center justify-center text-label font-bold text-primary-text transition-[transform,filter] duration-75"
      :class="backPressed ? 'brightness-95 scale-[0.98]' : ''"
      @mousedown="backPressed = true"
      @mouseup="backPressed = false"
      @mouseleave="backPressed = false"
      @blur="backPressed = false"
      @touchstart="backPressed = true"
      @touchend="backPressed = false"
      @touchcancel="backPressed = false"
      @click="emit('back')"
    >
      ‹ Atrás
    </button>
    <button
      type="button"
      class="basis-[65%] flex items-center justify-center gap-xs bg-accent text-label font-bold text-on-accent transition-[transform,filter] duration-75"
      :class="nextPressed ? 'brightness-95 scale-[0.98]' : ''"
      @mousedown="nextPressed = true"
      @mouseup="nextPressed = false"
      @mouseleave="nextPressed = false"
      @blur="nextPressed = false"
      @touchstart="nextPressed = true"
      @touchend="nextPressed = false"
      @touchcancel="nextPressed = false"
      @click="emit('next')"
    >
      {{ nextLabel }} ›
    </button>
  </footer>
</template>
