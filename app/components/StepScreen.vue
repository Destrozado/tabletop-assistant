<script setup lang="ts">
// Componente tonto. Renderiza SIEMPRE con interpolación de texto — prohibida
// la directiva de HTML crudo en toda la app (T-01-01 del threat model: el
// texto de contenido nunca se trata como HTML confiado).
defineProps<{
  actionText: string
  warningText: string | null
  // D-32: null cuando el aviso no tiene consecuencia detallada — en ese
  // caso la línea se pinta exactamente como en la Fase 1 (sin afordancia
  // falsa: sin borde, sin chevron, sin ser pulsable).
  warningDetailText: string | null
}>()

const emit = defineEmits<{
  'open-warning-detail': []
}>()
</script>

<template>
  <main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
    <div class="w-full max-w-[960px] flex flex-col items-center gap-lg text-center">
      <p class="text-display font-bold text-primary-text">{{ actionText }}</p>
      <button
        v-if="warningText && warningDetailText"
        type="button"
        class="min-h-12 px-md py-sm text-body font-normal text-warning border-b border-warning/50 transition-transform duration-75 active:brightness-95"
        @click="emit('open-warning-detail')"
      >
        ⚠ {{ warningText }} ›
      </button>
      <p v-else-if="warningText" class="text-body font-normal text-warning">
        ⚠ {{ warningText }}
      </p>
    </div>
  </main>
</template>
