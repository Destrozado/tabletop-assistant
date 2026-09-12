<script setup lang="ts">
// Superficie visible de D-03 (09-UI-SPEC.md §8): calcado de la forma de
// UpdateBanner.vue/VoiceUnavailableNotice.vue, pero al igual que
// UpdateBanner esta banda SÍ necesita lógica propia (leer la variante
// pendiente, autocerrarse, descartarse a mano), así que llama a un
// composable en vez de recibir todo por props. Se monta en app/app.vue
// (no en la pantalla de juego) por el mismo motivo que UpdateBanner: el
// aviso se dispara en `/[game]` justo antes de volver a `/`, así que ya se
// ve en la pantalla de destino — app.vue es el único punto compartido por
// todas las rutas.
import { useHistorySavedNotice } from '~/composables/useHistorySavedNotice'

const { variant, dismiss } = useHistorySavedNotice()
</script>

<template>
  <!--
    09-16 (WR-05, 09-REVIEW.md ronda 3): la región viva es PERMANENTE — se
    renderiza siempre, sin v-if, y sin ninguna clase de maquetación (sin
    contenido ocupa cero altura, así que la disposición visual es idéntica a
    la de antes). Un lector de pantalla solo anuncia los cambios de una
    región `aria-live` que YA estaba en el DOM cuando el contenido cambió;
    poner `aria-live` sobre el mismo elemento que lleva el v-if no anuncia
    nada, porque la región y el texto aparecen a la vez. Este aviso es el
    ÚNICO resultado observable del gesto «terminar partida», así que tiene
    que ser el que un lector de pantalla sí anuncia.
  -->
  <div role="status" aria-live="polite">
    <div
      v-if="variant !== null"
      class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md"
    >
      <div v-if="variant === 'success'" class="flex flex-col gap-sm">
        <h2 class="text-heading font-bold text-primary-text first-letter:text-accent">
          ✓ Partida registrada
        </h2>
      </div>
      <div v-else class="flex flex-col gap-sm">
        <h2 class="text-heading font-bold text-primary-text first-letter:text-warning">
          ⚠ No se pudo guardar la partida
        </h2>
        <!--
          09-16 (WR-02, 09-REVIEW.md): el texto viejo AFIRMABA una causa
          técnica que la app no ha comprobado («el dispositivo no permitió
          escribir…») — con el cierre de 09-13 hay al menos tres motivos
          distintos detrás del mismo `false` de record(), y la app no sabe
          cuál es. Este texto dice primero lo que SÍ es seguro (gracias a la
          Task 1 de este mismo plan: la partida sigue en el dispositivo,
          porque finishGame ya no borra el progreso cuando el registro
          falla), después qué hacer (el nombre del botón coincide
          literalmente con el de IndexOverlay.vue), y solo al final enumera
          como posibilidades — en condicional, sin afirmar ninguna — lo que
          antes se daba por causa cierta.
        -->
        <p class="text-body font-normal text-secondary-text">
          La partida no se ha perdido: sigue guardada en el dispositivo. Volved a entrar en la partida y pulsad «Partida terminada» otra vez para reintentar el registro. Si vuelve a fallar, puede deberse al modo privado del navegador, a la memoria llena, o a un histórico anterior que la app no consigue leer.
        </p>
      </div>
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
        aria-label="Cerrar aviso"
        @click="dismiss"
      >
        ✕
      </button>
    </div>
  </div>
</template>
