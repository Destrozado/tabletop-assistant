<script setup lang="ts">
// Componente tonto. Modal bloqueante: SETUP-04 exige que la app nunca
// reanude en silencio, así que este componente deliberadamente NO expone
// ningún control de cierre, no escucha Escape y no se descarta al tocar
// fuera — la única salida es elegir una de las dos acciones (01-UI-SPEC
// §Resume-vs-new prompt).
import { ref } from 'vue'

defineProps<{
  savedSummary: string
  // mismatchWarning (plan 09-33): aviso opcional, sin copy propia en este
  // componente — el texto llega ya decidido desde useProgressMismatchMark.ts
  // (única vía: markProgressMismatch/readProgressMismatchWarning), calculado
  // a partir de la discrepancia que planGameEnd comprobó al cerrar la
  // última partida de este juego. `null` en cualquier otro caso.
  mismatchWarning?: string | null
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

      <!--
        Plan 09-33: aviso opcional cuando el último cierre de ESTA partida
        comprobó que el progreso guardado no correspondía al punto de fin de
        partida (useProgressMismatchMark.ts). Se lee ANTES del párrafo de
        decisión de abajo, para que se lea antes de decidir. No lleva NINGÚN
        atributo de región viva de accesibilidad propio: el contenedor de
        este modal (línea de arriba) ya se anuncia entero al aparecer, así
        que añadir aquí una región viva con v-if encima sería el
        anti-patrón que HistorySavedNotice.vue documenta y que WR-07
        encontró en MiniSetupScreen.vue.
      -->
      <p v-if="mismatchWarning" class="text-body font-normal text-warning">
        {{ mismatchWarning }}
      </p>

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
