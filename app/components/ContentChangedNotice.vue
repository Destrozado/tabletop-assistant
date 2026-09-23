<script setup lang="ts">
// Componente tonto. PERS-03 ya decidió el desenlace (inicio de sección,
// jugadores/dificultad conservados): no es una elección de dos ramas como
// ResumePrompt, así que expone exactamente un botón de reconocimiento.
import { ref } from 'vue'

defineProps<{
  sessionContext: string
  sectionLabel: string
  // mismatchWarning (plan 09-38, cierre de WR-01): aviso opcional, sin copy
  // propia en este componente — el texto llega ya decidido desde
  // useProgressMismatchMark.ts (única vía: markProgressMismatch/
  // readProgressMismatchWarning). Prop idéntica en forma a la de
  // ResumePrompt.vue: `null` en cualquier otro caso.
  mismatchWarning?: string | null
}>()

const emit = defineEmits<{
  acknowledge: []
}>()

const ctaPressed = ref(false)
</script>

<template>
  <div role="dialog" aria-modal="true" class="fixed inset-0 z-40 bg-background flex items-center justify-center px-xl">
    <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
      <h1 class="text-heading font-bold text-primary-text">
        El contenido ha cambiado
      </h1>

      <!--
        Plan 09-38 (WR-01): aviso opcional cuando el último cierre de ESTA
        partida comprobó que el progreso guardado no correspondía al punto
        de fin de partida (useProgressMismatchMark.ts). Se lee ANTES del
        párrafo que explica el desenlace, para que se lea antes de pulsar el
        único botón. No lleva NINGÚN atributo de región viva de
        accesibilidad propio: el contenedor de este modal (línea de arriba)
        ya se anuncia entero al aparecer, así que añadir aquí una región
        viva con v-if encima sería el anti-patrón que ResumePrompt.vue
        documenta y que HistorySavedNotice.vue documenta también.
      -->
      <p v-if="mismatchWarning" class="text-body font-normal text-warning">
        {{ mismatchWarning }}
      </p>

      <p class="text-body font-normal text-secondary-text">
        La partida guardada ya no coincide con el contenido actual. Volvemos al inicio de {{ sectionLabel }}, con {{ sessionContext }}.
      </p>

      <div class="flex justify-end pt-sm">
        <button
          type="button"
          class="min-h-12 px-lg bg-accent text-on-accent text-label font-bold transition-transform duration-75"
          :class="ctaPressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="ctaPressed = true"
          @touchstart="ctaPressed = true"
          @mouseup="ctaPressed = false"
          @touchend="ctaPressed = false"
          @click="emit('acknowledge')"
        >
          ENTENDIDO ›
        </button>
      </div>
    </div>
  </div>
</template>
