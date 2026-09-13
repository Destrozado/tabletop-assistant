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
    WR-05(b) (09-VERIFICATION.md ronda 4): esta banda se monta como hermana
    de `<NuxtPage/>` dentro de `#app-root` (app/app.vue), y todas las
    pantallas usan `h-dvh`. Sin sacarla del flujo, su altura se sumaba a los
    100dvh de la pantalla de destino y empujaba la fila inferior (p. ej. los
    botones «Histórico»/«Estadísticas» de GameSelectorScreen) fuera del borde
    de la tablet. `fixed top-0 inset-x-0` la saca del flujo; sin más, una
    banda `fixed` interceptaría los toques de la franja superior de la
    pantalla de debajo, así que el contenedor deja pasar los toques hacia lo
    que hay detrás (Tailwind: eventos de puntero desactivados a nivel de
    contenedor), y solo el CTA de recarga y el botón `✕` los recuperan para
    seguir siendo pulsables (Tailwind: eventos de puntero reactivados en cada
    control) — 09-UI-SPEC.md §8, «never blocks input».

    El nivel de apilamiento elegido la deja por debajo de los diálogos de
    decisión (GameOutcomeDialog, WarningDetailModal, ConfirmDialog,
    VillainPickerModal, PlayerModal, IndexOverlay, todos en la capa 50) —
    correcto, un diálogo que exige una decisión no puede quedar tapado por un
    aviso informativo. Pero `ResumePrompt.vue` y `ContentChangedNotice.vue`
    usan ESE MISMO nivel intermedio (capa 40): frente a esos dos, el número
    de capa NO basta por sí solo — la banda queda debajo de ellos únicamente
    porque `app/app.vue` la monta ANTES de `<NuxtPage/>` (a igual nivel de
    apilamiento, pinta encima el que va después en el DOM). Quien reordene
    ese montaje romperá esta banda sin tocar ningún número.

    Esta banda y `HistorySavedNotice.vue` reciben el mismo tratamiento a
    propósito: el hallazgo WR-05(b) nombra a las dos.
  -->
  <div
    v-if="showUpdateBanner"
    class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md fixed top-0 inset-x-0 z-40 pointer-events-none"
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
        class="bg-accent text-on-accent min-h-12 px-lg text-body font-bold self-start active:brightness-95 pointer-events-auto"
        @click="applyUpdate"
      >
        Actualizar
      </button>
    </div>
    <button
      type="button"
      class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95 pointer-events-auto"
      aria-label="Cerrar aviso"
      @click="dismissUpdate"
    >
      ✕
    </button>
  </div>
</template>
