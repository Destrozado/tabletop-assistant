<script setup lang="ts">
// Componente tonto de ELECCIÓN (no informativo) — distinto de
// WarningDetailModal.vue, que es un modal informativo de un solo botón y su
// propia cabecera ya lo dice explícitamente. No se retrofita ese componente
// para esto, igual que la Fase 2 no retrofitó ConfirmDialog para
// WarningDetailModal (06-UI-SPEC.md §Component Inventory).
//
// Sin filtro a propósito (D-10): son solo 3 entradas de catálogo, así que un
// buscador sería fricción sin beneficio. Tocar cualquier fila guarda y cierra
// (D-13) — las tres vías de cierre (✕, tocar el velo, la tecla de escape)
// son equivalentes porque no hay nada que confirmar ni que descartar; tocar
// la fila ya elegida es idempotente, no hace falta un caso especial.
import { onMounted, onUnmounted, ref } from 'vue'

defineProps<{
  villains: { id: string, name: string }[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [villainId: string | null]
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
    aria-labelledby="villain-picker-heading"
    class="fixed inset-0 z-50 bg-background/80 flex items-center justify-center px-xl"
    @click.self="emit('dismiss')"
  >
    <!--
      El tope de altura de este panel es nuevo respecto a
      WarningDetailModal.vue: ese panel no desplaza nada, este sí (hasta 3
      filas de villano más la fila para vaciar la elección), así que
      necesita su propio límite vertical y flex-col para poder ceder la zona
      de scroll al cuerpo.
    -->
    <div class="w-full max-w-[640px] max-h-[80dvh] bg-surface flex flex-col">
      <div class="h-16 shrink-0 flex items-center justify-between px-lg border-b border-background">
        <h1 id="villain-picker-heading" class="text-heading font-bold text-primary-text truncate">
          VILLANO
        </h1>
        <button
          ref="dismissButton"
          type="button"
          class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
          aria-label="Cerrar selector de villano"
          @click="emit('dismiss')"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <!-- D-17: vaciar la elección es una entrada más de la lista, cero
             gestos nuevos — tocarla guarda `null` y cierra, igual que
             cualquier otra fila. -->
        <button
          type="button"
          class="w-full min-h-12 px-md py-sm flex items-center justify-between text-left text-body font-normal text-primary-text transition-transform duration-75 active:brightness-95 border-b border-background"
          @click="emit('select', null)"
        >
          <span>Sin elegir</span>
          <span v-if="selectedId === null" class="text-accent">✓</span>
        </button>

        <!-- 06-UI-REVIEW.md: mismo criterio que en PlayerModal — el `✓` es
             estado transmitido sólo por un glifo, así que el aria-label lo
             enuncia. -->
        <button
          v-for="villain in villains"
          :key="villain.id"
          type="button"
          class="w-full min-h-12 px-md py-sm flex items-center justify-between text-left text-body font-normal text-primary-text transition-transform duration-75 active:brightness-95"
          :aria-label="villain.id === selectedId ? `${villain.name}, elegido actualmente` : villain.name"
          @click="emit('select', villain.id)"
        >
          <span>{{ villain.name }}</span>
          <span v-if="villain.id === selectedId" class="text-accent">✓</span>
        </button>
      </div>
    </div>
  </div>
</template>
