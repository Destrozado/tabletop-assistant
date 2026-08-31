<script setup lang="ts">
// Componente tonto: recibe `blocks` ya agrupado por `tableOfContents` (engine
// puro) desde la página — nunca importa ~~/engine directamente
// (ARCHITECTURE.md §3/§5). D-13: overlay a pantalla completa, sin
// atenuación de fondo (no hay "fuera" que atenuar). D-14: las marcas llegan
// ya derivadas de la posición, este componente no guarda ningún estado propio
// sobre qué se ha visitado. D-U1: la barra inferior con «Partida terminada»
// vive aquí porque este overlay es la única salida alcanzable de la pantalla
// de juego con la app instalada como PWA (sin barra de direcciones ni botón
// atrás) — deliberadamente a tres toques del borrado real (≡ → botón →
// confirmar en la página).
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  title: string
  blocks: {
    label: string
    steps: { id: string, label: string, mark: 'done' | 'current' | null }[]
    dimmed: boolean
  }[]
}>()

const emit = defineEmits<{
  'jump-to': [id: string]
  'close': []
  'end-game': []
}>()

// Transición de apertura (180ms, fade + 8px hacia arriba). Cierre: solo con
// el botón ✕, no hay toque fuera porque no hay "fuera" en un overlay a
// pantalla completa.
const entered = ref(false)
onMounted(() => {
  requestAnimationFrame(() => {
    entered.value = true
  })
})

// Mismo patrón de pulsado que el botón destructivo de ResumePrompt.vue.
const endPressed = ref(false)

// Numeración continua de filas a través de todos los bloques (la maqueta
// aprobada en 01-CONTEXT.md numera 1..N de forma corrida, no por bloque).
// Con el reordenado de D-24 esto numera la ronda como 1..9 y la preparación
// como 10..33, tal como pide la maqueta — sin tocar esta lógica.
const numberedBlocks = computed(() => {
  let order = 0
  return props.blocks.map(block => ({
    label: block.label,
    dimmed: block.dimmed,
    steps: block.steps.map(step => {
      order += 1
      return { ...step, order }
    }),
  }))
})

// D-24: el índice del primer bloque atenuado — solo ahí se inserta el
// divisor "PREPARACIÓN (CONSULTA)". -1 cuando no hay ningún bloque atenuado
// (fuera del bucle), y entonces el divisor nunca se renderiza.
const firstDimmedIndex = computed(() => props.blocks.findIndex(block => block.dimmed))

function onRowClick(row: { id: string, mark: 'done' | 'current' | null }) {
  // Tocar la fila current cierra sin navegar (equivale a cancelar, D-13).
  // Tocar cualquier otra fila cierra y salta, sin confirmación.
  emit('close')
  if (row.mark !== 'current') {
    emit('jump-to', row.id)
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-surface flex flex-col transition-all duration-[180ms] ease-out"
    :class="entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'"
  >
    <!-- Barra de título fijada. -->
    <div class="h-16 shrink-0 flex items-center justify-between px-lg border-b border-background">
      <h1 class="text-heading font-bold text-primary-text truncate">
        {{ title }}
      </h1>
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
        aria-label="Cerrar índice"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>

    <!-- Cuerpo desplazable independientemente del título. -->
    <div class="flex-1 overflow-y-auto px-lg pb-lg">
      <template v-for="(block, index) in numberedBlocks" :key="block.label">
        <!--
          D-24: divisor solo antes del PRIMER bloque atenuado — separa la
          ronda (zona de juego) de la preparación (zona de consulta). Nunca
          se renderiza fuera del bucle (firstDimmedIndex === -1).
        -->
        <div
          v-if="index === firstDimmedIndex"
          class="mt-lg pt-lg border-t border-background"
        >
          <p class="text-label font-bold uppercase text-secondary-text text-center">
            PREPARACIÓN (CONSULTA)
          </p>
        </div>
        <div class="mt-lg">
          <h2 class="text-label font-bold uppercase text-secondary-text px-sm">
            {{ block.label }}
          </h2>
          <button
            v-for="row in block.steps"
            :key="row.id"
            type="button"
            class="w-full min-h-12 flex items-center gap-md px-sm text-left transition-transform duration-75 active:brightness-95"
            :class="block.dimmed ? 'text-secondary-text' : (row.mark === 'current' ? 'text-primary-text' : row.mark === 'done' ? 'text-primary-text' : 'text-secondary-text')"
            @click="onRowClick(row)"
          >
            <span class="w-8 shrink-0 text-body font-normal text-secondary-text text-right">{{ row.order }}</span>
            <span
              class="w-6 shrink-0 text-body font-normal text-center"
              :class="block.dimmed ? 'text-secondary-text' : 'text-accent'"
            >
              <template v-if="row.mark === 'done'">✓</template>
              <template v-else-if="row.mark === 'current'">●</template>
            </span>
            <span class="text-body font-normal">{{ row.label }}</span>
          </button>
        </div>
      </template>
    </div>

    <!-- Barra inferior fija (D-U1): única salida alcanzable de la partida en
         curso. shrink-0 impide que se comprima cuando la lista de pasos es
         larga; el cuerpo de arriba es flex-1 overflow-y-auto, así que esta
         barra queda siempre visible al pie sin position:fixed propio. -->
    <div class="shrink-0 border-t border-background px-lg py-md flex justify-end">
      <button
        type="button"
        class="min-h-12 px-lg border border-destructive text-destructive text-label font-bold transition-transform duration-75"
        :class="endPressed ? 'brightness-95 scale-[0.98]' : ''"
        @mousedown="endPressed = true"
        @touchstart="endPressed = true"
        @mouseup="endPressed = false"
        @touchend="endPressed = false"
        @click="emit('end-game')"
      >
        Partida terminada
      </button>
    </div>
  </div>
</template>
