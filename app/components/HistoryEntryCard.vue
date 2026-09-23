<script setup lang="ts">
// Componente tonto (plan 09-06): recibe una entrada ya formateada por la
// costura reactiva del histórico (buildHistoryCardView) y no calcula nada —
// ni fechas, ni duraciones, ni etiquetas de jugador. Sin import del motor ni
// de ningún composable. Solo emite `delete`; borrar de verdad lo decide la
// página tras el `ConfirmDialog` (D-20).
defineProps<{
  resultLabel: string
  dateLabel: string
  causeLabel: string | null
  contextLine: string
  playerLines: string[] | null
  noSelectionLine: string | null
  durationLine: string
  deleteAriaLabel: string
}>()

const emit = defineEmits<{
  delete: []
}>()
</script>

<template>
  <div class="bg-surface p-lg flex flex-col gap-sm">
    <div class="flex justify-between items-baseline">
      <span class="text-label font-bold text-primary-text">{{ resultLabel }}</span>
      <span class="text-label font-normal text-secondary-text">{{ dateLabel }}</span>
    </div>

    <p v-if="causeLabel" class="text-body font-normal text-secondary-text">
      {{ causeLabel }}
    </p>

    <p class="text-body font-normal text-secondary-text">
      {{ contextLine }}
    </p>

    <p
      v-for="(line, index) in playerLines"
      :key="index"
      class="text-body font-normal text-primary-text"
    >
      {{ line }}
    </p>

    <p v-if="noSelectionLine" class="text-body font-normal text-secondary-text">
      {{ noSelectionLine }}
    </p>

    <p class="text-body font-normal text-secondary-text">
      {{ durationLine }}
    </p>

    <button
      type="button"
      class="self-end min-h-12 px-md text-label font-bold text-destructive active:brightness-95"
      :aria-label="deleteAriaLabel"
      @click="emit('delete')"
    >
      Borrar
    </button>
  </div>
</template>
