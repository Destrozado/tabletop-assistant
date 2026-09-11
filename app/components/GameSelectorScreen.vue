<script setup lang="ts">
// Componente tonto: la lista de juegos llega entera por prop (TECH-04) — este
// fichero no menciona ningún juego concreto ni en código ni en comentarios.
// Ningún estado inactivo salvo el de la propia tarjeta "coming-soon", que no
// es un control interactivo.
import { ref } from 'vue'

defineProps<{
  games: { id: string, title: string, status: 'available' | 'coming-soon' }[]
}>()

const emit = defineEmits<{
  select: [id: string]
  'open-history': []
  'open-statistics': []
}>()

// Estado de "pressed" por tarjeta (mismo criterio que NavBand: oscurecido +
// escala en mousedown/touchstart, liberado en mouseup/touchend). Los dos
// accesos secundarios (D-17) reutilizan el mismo ref con sus propias claves
// en vez de un ref aparte, para no duplicar el mecanismo de press-feedback.
const pressedId = ref<string | null>(null)
</script>

<template>
  <div class="h-dvh bg-background flex flex-col items-center justify-center gap-2xl px-2xl">
    <div class="flex flex-col items-center gap-md text-center max-w-[720px]">
      <h1 class="text-heading font-bold text-primary-text">
        ¿A qué juego vas a jugar?
      </h1>
      <p class="text-body font-normal text-secondary-text">
        Guía de flujo paso a paso — no es buscador de reglas ni contador de vida
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-lg">
      <template v-for="game in games" :key="game.id">
        <button
          v-if="game.status === 'available'"
          type="button"
          class="min-w-[220px] min-h-[120px] px-2xl py-lg flex items-center justify-center bg-surface text-heading font-bold text-primary-text border-2 transition-transform duration-75 focus-visible:outline-none"
          :class="pressedId === game.id ? 'brightness-95 scale-[0.98] border-accent' : 'border-transparent focus-visible:border-accent'"
          @mousedown="pressedId = game.id"
          @touchstart="pressedId = game.id"
          @mouseup="pressedId = null"
          @touchend="pressedId = null"
          @click="emit('select', game.id)"
        >
          {{ game.title }}
        </button>

        <div
          v-else
          class="min-w-[220px] min-h-[120px] px-2xl py-lg flex flex-col items-center justify-center gap-sm bg-surface opacity-40"
          aria-disabled="true"
        >
          <span class="text-heading font-bold text-primary-text">{{ game.title }}</span>
          <span class="text-label font-bold text-secondary-text">PRÓXIMAMENTE</span>
        </div>
      </template>
    </div>

    <!-- Accesos secundarios (D-17/STAT-01): fila propia debajo de las
         tarjetas de juego, sin reestructurar el bloque centrado. Cromado
         idéntico al botón NO destructivo de ConfirmDialog.vue — la forma
         "secundaria/neutra" ya establecida en este código. Ninguno se pinta
         nunca deshabilitado: las dos pantallas tienen estado vacío definido. -->
    <div class="flex gap-md">
      <button
        type="button"
        class="min-h-12 px-lg bg-surface text-primary-text text-label font-bold transition-transform duration-75"
        :class="pressedId === 'history' ? 'brightness-95 scale-[0.98]' : ''"
        @mousedown="pressedId = 'history'"
        @touchstart="pressedId = 'history'"
        @mouseup="pressedId = null"
        @touchend="pressedId = null"
        @click="emit('open-history')"
      >
        Histórico
      </button>
      <button
        type="button"
        class="min-h-12 px-lg bg-surface text-primary-text text-label font-bold transition-transform duration-75"
        :class="pressedId === 'statistics' ? 'brightness-95 scale-[0.98]' : ''"
        @mousedown="pressedId = 'statistics'"
        @touchstart="pressedId = 'statistics'"
        @mouseup="pressedId = null"
        @touchend="pressedId = null"
        @click="emit('open-statistics')"
      >
        Estadísticas
      </button>
    </div>
  </div>
</template>
