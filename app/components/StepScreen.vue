<script setup lang="ts">
// Componente tonto. Renderiza SIEMPRE con interpolación de texto — prohibida
// la directiva de HTML crudo en toda la app (T-01-01 del threat model: el
// texto de contenido nunca se trata como HTML confiado).
defineProps<{
  actionText: string
  warningText: string | null
}>()
</script>

<template>
  <main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
    <div class="w-full max-w-[960px] flex flex-col items-center gap-lg text-center">
      <p class="text-display font-bold text-primary-text">{{ actionText }}</p>
      <p v-if="warningText" class="text-body font-normal text-warning">
        ⚠ {{ warningText }}
      </p>
    </div>
  </main>
</template>
