<script setup lang="ts">
// Componente tonto: recibe props, emite eventos, no importa nada del motor
// puro ni de los composables (ARCHITECTURE.md §3/§5).
defineProps<{
  sectionLabel: string
  position: { current: number, total: number } | null
  sessionContext: string
}>()

const emit = defineEmits<{
  'index-open': []
}>()
</script>

<template>
  <header class="h-16 shrink-0 bg-surface flex items-center justify-between px-lg gap-md">
    <div class="text-label font-bold text-primary-text truncate">
      {{ sectionLabel }}<template v-if="position"> · {{ position.current }} de {{ position.total }}</template>
    </div>

    <!--
      Zona derecha: contenedor flex que admite MÁS de dos hijos — la Fase 3
      insertará aquí el icono de silencio (VOZ-02) sin reorganizar el layout.
    -->
    <div class="flex items-center gap-md">
      <span class="text-label font-bold text-secondary-text">{{ sessionContext }}</span>
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
        aria-label="Abrir índice"
        @click="emit('index-open')"
      >
        ≡
      </button>
    </div>
  </header>
</template>
