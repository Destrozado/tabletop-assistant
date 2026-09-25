<script setup lang="ts">
// Componente tonto de ELECCIÓN MULTISELECCIÓN (quick 260925-mpj, D-04) —
// calcado de VillainPickerModal.vue (mismo velo, panel, cabecera, ✕ con
// foco al montar, Escape) con una diferencia deliberada: aquí NO se cierra
// al marcar (D-13 no aplica a esta multiselección — el grupo puede querer
// marcar varios módulos seguidos), así que el pie lleva un botón «Hecho»
// explícito. Sección de sets base INFORMATIVA (no pulsable, sin chevron,
// sin @click, regla D-32 de afordancia): «Normal» siempre, «Experto» solo
// en dificultad Experta — la resuelve el llamante (buildBaseSetLabels).
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{
  baseSets: string[]
  modules: { id: string, name: string, difficulty?: number, recommended: boolean }[]
  selectedIds: string[]
}>()

const emit = defineEmits<{
  toggle: [moduleId: string]
  dismiss: []
}>()

const dismissButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('dismiss')
  }
}

onMounted(() => {
  dismissButton.value?.focus()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="module-picker-heading"
    class="fixed inset-0 z-50 bg-background/80 flex items-center justify-center px-xl"
    @click.self="emit('dismiss')"
  >
    <div class="w-full max-w-[640px] max-h-[80dvh] bg-surface flex flex-col">
      <div class="h-16 shrink-0 flex items-center justify-between px-lg border-b border-background">
        <h1 id="module-picker-heading" class="text-heading font-bold text-primary-text truncate">
          MÓDULOS
        </h1>
        <button
          ref="dismissButton"
          type="button"
          class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
          aria-label="Cerrar selector de módulos"
          @click="emit('dismiss')"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <p class="px-md pt-md text-label font-bold uppercase text-secondary-text">
          Sets base
        </p>
        <!-- D-32: fila INFORMATIVA, no pulsable — sin chevron, sin @click,
             sin active:brightness-95. -->
        <div
          v-for="baseSet in baseSets"
          :key="baseSet"
          class="w-full min-h-12 px-md py-sm flex items-center text-body font-normal text-primary-text"
        >
          {{ baseSet }}
        </div>

        <p class="px-md pt-md text-label font-bold uppercase text-secondary-text">
          Módulos adicionales
        </p>
        <p v-if="!modules.length" class="px-md py-sm text-body font-normal text-secondary-text">
          No hay módulos en el catálogo.
        </p>
        <button
          v-for="module in modules"
          :key="module.id"
          type="button"
          role="checkbox"
          :aria-checked="selectedIds.includes(module.id)"
          class="w-full min-h-12 px-md py-sm flex items-center gap-md text-left transition-transform duration-75 active:brightness-95"
          :aria-label="[
            module.name,
            module.recommended ? 'recomendado' : null,
            typeof module.difficulty === 'number' ? `dificultad ${module.difficulty}` : null,
          ].filter(Boolean).join(', ')"
          @click="emit('toggle', module.id)"
        >
          <span class="w-6 h-6 shrink-0 border border-accent flex items-center justify-center">
            <span v-if="selectedIds.includes(module.id)" class="text-accent">✓</span>
          </span>
          <span class="min-w-0 flex-1 flex items-center gap-sm">
            <span class="truncate text-body font-normal text-primary-text">{{ module.name }}</span>
            <span v-if="module.recommended" class="shrink-0 text-label font-bold uppercase text-accent">Recomendado</span>
            <span v-if="typeof module.difficulty === 'number'" class="shrink-0 text-label text-secondary-text">Dificultad {{ module.difficulty }}</span>
          </span>
        </button>
      </div>

      <div class="shrink-0 border-t border-background">
        <button
          type="button"
          class="w-full min-h-12 px-md py-sm text-body font-bold text-primary-text active:brightness-95"
          @click="emit('dismiss')"
        >
          Hecho
        </button>
      </div>
    </div>
  </div>
</template>
