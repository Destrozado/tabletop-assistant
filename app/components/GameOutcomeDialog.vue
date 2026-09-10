<script setup lang="ts">
// Componente tonto y genérico (09-UI-SPEC.md §Layout 2): sin ningún import
// del motor ni de composables, y sin ningún acceso directo al almacenamiento
// del navegador — recibe `contextLine`/`warningBody` ya calculados por la
// página y emite la decisión del grupo, nada más.
//
// NOTA DE RECONCILIACIÓN (obligatoria, D-01/D-02/HIST-02): `dismiss` NO es
// «cancelar y seguir jugando». HIST-02 y el criterio de éxito nº 1 del
// ROADMAP exigen que «siempre se pueda cerrar la partida sin registrar
// nada», y D-01 fija exactamente cuatro opciones — así que las cuatro
// terminan la partida, y `dismiss` es la que la termina sin escribir en el
// histórico. Con este diálogo desaparece la opción «Cancelar» que tenía el
// `ConfirmDialog` anterior; es deliberado (D-02: el número de toques no
// cambia), no un olvido. Quien vaya a añadir un quinto botón debe leer D-01
// primero.
import { ref } from 'vue'

defineProps<{
  contextLine: string
  warningBody: string
}>()

const emit = defineEmits<{
  record: ['won' | 'mainSchemeCompleted' | 'heroesEliminated']
  dismiss: []
}>()

// Un ref de estado de pulsado por botón (mismo patrón de press-feedback que
// `ConfirmDialog.vue`), para que el toque en un botón no anime a los otros
// dos.
const wonPressed = ref(false)
const mainSchemePressed = ref(false)
const heroesEliminatedPressed = ref(false)
</script>

<template>
  <div role="dialog" aria-modal="true" class="fixed inset-0 z-50 bg-background flex items-center justify-center px-xl">
    <div class="w-full max-w-[640px] max-h-[90dvh] overflow-y-auto bg-surface p-2xl flex flex-col gap-lg">
      <h1 class="text-heading font-bold text-primary-text">
        ¿Cómo terminó la partida?
      </h1>

      <p class="text-body font-normal text-secondary-text">
        {{ contextLine }}
      </p>

      <p class="text-body font-normal text-secondary-text">
        {{ warningBody }}
      </p>

      <div class="flex flex-col gap-md">
        <button
          type="button"
          class="min-h-12 px-lg bg-surface text-primary-text text-body font-bold transition-transform duration-75"
          :class="wonPressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="wonPressed = true"
          @touchstart="wonPressed = true"
          @mouseup="wonPressed = false"
          @touchend="wonPressed = false"
          @click="emit('record', 'won')"
        >
          GANADA
        </button>
        <button
          type="button"
          class="min-h-12 px-lg bg-surface text-primary-text text-body font-bold transition-transform duration-75"
          :class="mainSchemePressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="mainSchemePressed = true"
          @touchstart="mainSchemePressed = true"
          @mouseup="mainSchemePressed = false"
          @touchend="mainSchemePressed = false"
          @click="emit('record', 'mainSchemeCompleted')"
        >
          PERDIDA · Se completó el Plan Principal
        </button>
        <button
          type="button"
          class="min-h-12 px-lg bg-surface text-primary-text text-body font-bold transition-transform duration-75"
          :class="heroesEliminatedPressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="heroesEliminatedPressed = true"
          @touchstart="heroesEliminatedPressed = true"
          @mouseup="heroesEliminatedPressed = false"
          @touchend="heroesEliminatedPressed = false"
          @click="emit('record', 'heroesEliminated')"
        >
          PERDIDA · Todos los héroes eliminados
        </button>
      </div>

      <button
        type="button"
        class="text-label font-bold text-secondary-text text-center"
        @click="emit('dismiss')"
      >
        Salir sin registrar
      </button>
    </div>
  </div>
</template>
