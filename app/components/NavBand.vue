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

const backPressed = ref(false)
const nextPressed = ref(false)
</script>

<template>
  <footer class="h-24 shrink-0 bg-surface flex">
    <button
      type="button"
      class="basis-[35%] flex items-center justify-center text-label font-bold text-primary-text transition-transform duration-75"
      :class="backPressed ? 'brightness-95 scale-[0.98]' : ''"
      @mousedown="backPressed = true"
      @mouseup="backPressed = false"
      @touchstart="backPressed = true"
      @touchend="backPressed = false"
      @click="emit('back')"
    >
      ‹ Atrás
    </button>
    <button
      type="button"
      class="basis-[65%] flex items-center justify-center gap-xs bg-accent text-label font-bold text-on-accent transition-transform duration-75"
      :class="nextPressed ? 'brightness-95 scale-[0.98]' : ''"
      @mousedown="nextPressed = true"
      @mouseup="nextPressed = false"
      @touchstart="nextPressed = true"
      @touchend="nextPressed = false"
      @click="emit('next')"
    >
      {{ nextLabel }} ›
    </button>
  </footer>
</template>
