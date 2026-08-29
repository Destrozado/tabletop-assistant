<script setup lang="ts">
// Componente tonto (D-32): consulta informativa de un solo botón, distinta
// de ConfirmDialog.vue en tres puntos deliberados (02-UI-SPEC.md §Color/
// §Layout 1): velo translúcido en vez de fondo opaco (el paso sigue
// entreviéndose detrás — "sigues jugando"), cuerpo en texto PRIMARIO (no
// secundario: aquí el cuerpo es el motivo por el que se tocó, no contexto
// de apoyo), y un único CTA de reconocimiento sin chevron (DC-7: no hay
// navegación, se vuelve exactamente al mismo sitio).
//
// Añade gestión de foco y tres vías de cierre equivalentes que
// ConfirmDialog.vue NO tiene (D-32: "se cierra fácilmente") — no se
// retrofita a ConfirmDialog, es un hueco conocido y registrado, no un
// patrón a copiar (02-UI-SPEC.md §Component Inventory).
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{
  heading: string
  body: string
}>()

const emit = defineEmits<{
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
    aria-labelledby="warning-detail-heading"
    class="fixed inset-0 z-50 bg-background/80 flex items-center justify-center px-xl"
    @click.self="emit('dismiss')"
  >
    <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
      <h1 id="warning-detail-heading" class="text-heading font-bold text-primary-text">
        ⚠ {{ heading }}
      </h1>

      <p class="text-body font-normal text-primary-text">
        {{ body }}
      </p>

      <div class="flex justify-end pt-sm">
        <button
          ref="dismissButton"
          type="button"
          class="min-h-12 px-lg bg-accent text-on-accent text-label font-bold transition-transform duration-75 active:brightness-95"
          @click="emit('dismiss')"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
</template>
