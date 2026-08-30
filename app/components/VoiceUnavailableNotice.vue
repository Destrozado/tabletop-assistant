<script setup lang="ts">
// Componente tonto: recibe props, emite eventos, no importa nada del motor
// puro ni de los composables (ARCHITECTURE.md §3/§5). Sin props — el mensaje
// es el mismo sea cual sea la causa (UI-SPEC §Layout 2): sin síntesis en
// absoluto o sin voz española, ambas producen silencio total desde el punto
// de vista del usuario y la app no puede distinguirlas con fiabilidad.
const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md">
    <div class="flex flex-col gap-sm">
      <h2 class="text-heading font-bold text-primary-text">
        Sin voz en este dispositivo
      </h2>
      <p class="text-body font-normal text-secondary-text">
        El juego sigue funcionando solo con texto. Si el dispositivo es Android, revisad Ajustes → Idiomas → Texto a voz — puede faltar el paquete de voz en español.
      </p>
    </div>
    <button
      type="button"
      class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
      aria-label="Cerrar aviso"
      @click="emit('dismiss')"
    >
      ✕
    </button>
  </div>
</template>
