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
  // C1/DC-10 (02-05-PLAN.md): lista breve y pulsable de opciones del turno,
  // null cuando el paso no la declara. Forma en línea, sin importar el tipo
  // del motor (componente tonto, como IndexOverlay.vue).
  options: { label: string, detail: string }[] | null
  // C2/DC-11: recordatorio siempre visible bajo la lista anterior, sin
  // afordancia (sin borde, sin chevron, no pulsable) porque D-32 exige
  // detalle para poder tocar y este campo no lo tiene.
  optionsWarningText: string | null
  // Quick 260831-fkb: equivalente de warningDetailText para el aviso de la
  // lista de opciones — null cuando el aviso no tiene consecuencia detallada
  // (misma regla D-32: sin afordancia falsa).
  optionsWarningDetailText: string | null
}>()

const emit = defineEmits<{
  'open-warning-detail': []
  'open-option-detail': [index: number]
  'open-options-warning-detail': []
}>()
</script>

<template>
  <main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
    <div class="w-full max-w-[960px] flex flex-col items-center gap-lg text-center">
      <p class="text-display font-bold text-primary-text">{{ actionText }}</p>

      <div v-if="options && options.length" class="w-full flex flex-col items-center gap-sm">
        <p class="text-label font-bold uppercase text-secondary-text">
          Opciones
        </p>
        <div class="w-full max-w-[720px] grid grid-cols-1 sm:grid-cols-2 gap-x-lg">
          <button
            v-for="(option, index) in options"
            :key="option.label"
            type="button"
            class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left text-body font-normal text-primary-text border-b border-accent/50 transition-transform duration-75 active:brightness-95"
            @click="emit('open-option-detail', index)"
          >
            <span>{{ option.label }}</span>
            <span class="text-accent">›</span>
          </button>
        </div>
        <button
          v-if="optionsWarningText && optionsWarningDetailText"
          type="button"
          class="min-h-12 px-md py-sm text-body font-normal text-warning border-b border-warning/50 transition-transform duration-75 active:brightness-95"
          @click="emit('open-options-warning-detail')"
        >
          ⚠ {{ optionsWarningText }} ›
        </button>
        <p v-else-if="optionsWarningText" class="text-body font-normal text-warning">
          ⚠ {{ optionsWarningText }}
        </p>
      </div>

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
