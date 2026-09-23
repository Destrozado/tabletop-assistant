<script setup lang="ts">
// Superficie visible de OFF-04 (D-01/D-02/D-03): calcado de la forma de
// VoiceUnavailableNotice.vue, pero esta banda SÍ necesita lógica propia (leer
// $pwa, decidir si se pinta, aplicar/descartar), así que a diferencia de su
// precedente llama a un composable en vez de recibir todo por props/emits.
// Se monta en app/app.vue (no en la pantalla de juego) porque una versión
// nueva puede detectarse en cualquier pantalla, incluido el selector de
// juego — app.vue es el único punto compartido por todas las rutas.
import { useUpdatePrompt } from '~/composables/useUpdatePrompt'

const { showUpdateBanner, dismissUpdate, applyUpdate } = useUpdatePrompt()
</script>

<template>
  <!--
    Quick 260923-3rm (WR-04/WR-05 ronda 4, sustituye el mecanismo `fixed` de
    09-22): esta banda ya NO está posicionada — es un bloque EN FLUJO,
    hermano de `HistorySavedNotice.vue` dentro de la franja de avisos de
    `app/app.vue` (`<div class="shrink-0 flex flex-col">`). Al vivir en
    flujo normal, la franja entera resta su altura real a la página de
    debajo en vez de sumarla (WR-05(b) sigue cerrado, ahora por este
    mecanismo — ver la re-comprobación en deferred-items.md), y ningún toque
    sobre ella puede atravesar hacia un control oculto de la pantalla de
    debajo, porque ya no hay nada debajo con lo que solaparse: la franja
    ocupa su propio espacio, no el de la pantalla (WR-05 ronda 4). Frente a
    `HistorySavedNotice.vue`, el orden en el DOM decide el orden visual
    dentro de la franja — esta banda va PRIMERO (versión nueva, más
    urgente), así que si las dos están visibles a la vez se apilan una
    encima de la otra en vez de superponerse en el mismo rectángulo (WR-04
    ronda 4): las dos quedan visibles y pulsables a la vez, sin que ninguna
    tape el CTA «Actualizar»/`✕` de la otra.

    Los diálogos de pantalla completa (GameOutcomeDialog, WarningDetailModal,
    ConfirmDialog, VillainPickerModal, PlayerModal, IndexOverlay, capa 50;
    ResumePrompt/ContentChangedNotice, capa 40) siguen pintando por encima de
    esta banda sin depender de su posición en el DOM: viven dentro de
    `<NuxtPage/>`, posicionados con `fixed inset-0`, así que su propia capa
    de apilamiento los saca del flujo de la franja — esta banda ya no
    necesita ningún número de capa para quedar debajo de ellos.
  -->
  <div
    v-if="showUpdateBanner"
    class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md"
  >
    <div class="flex flex-col gap-sm">
      <h2 class="text-heading font-bold text-primary-text">
        Nueva versión disponible
      </h2>
      <p class="text-body font-normal text-secondary-text">
        Podéis seguir jugando y aplicarla cuando queráis: la partida se reanuda en el mismo paso.
      </p>
      <button
        type="button"
        class="bg-accent text-on-accent min-h-12 px-lg text-body font-bold self-start active:brightness-95"
        @click="applyUpdate"
      >
        Actualizar
      </button>
    </div>
    <button
      type="button"
      class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
      aria-label="Cerrar aviso"
      @click="dismissUpdate"
    >
      ✕
    </button>
  </div>
</template>
