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
import { isSuccessVariant, useHistorySavedNotice } from '~/composables/useHistorySavedNotice'

const { variant, heading, body, dismiss } = useHistorySavedNotice()
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
    <!--
      Quick 260923-3rm (WR-04/WR-05 ronda 4, sustituye el mecanismo `fixed`
      de 09-22): este bloque ya NO está posicionado — es un bloque EN FLUJO,
      hermano de `UpdateBanner.vue` dentro de la franja de avisos de
      `app/app.vue` (`<div class="shrink-0 flex flex-col">`). Al vivir en
      flujo normal, la franja entera resta su altura real a la página de
      debajo en vez de sumarla (WR-05(b) sigue cerrado, ahora por este
      mecanismo — ver la re-comprobación en deferred-items.md), y ningún
      toque sobre él puede atravesar hacia un control oculto de la pantalla
      de debajo, porque ya no hay nada debajo con lo que solaparse: la
      franja ocupa su propio espacio, no el de la pantalla (WR-05 ronda 4).
      Frente a `UpdateBanner.vue`, el orden en el DOM decide el orden visual
      dentro de la franja — este bloque va DESPUÉS (aviso de registro, menos
      urgente que una versión nueva), así que si los dos están visibles a la
      vez se apilan uno debajo del otro en vez de superponerse en el mismo
      rectángulo (WR-04 ronda 4): los dos quedan visibles y pulsables a la
      vez, sin que ninguno tape el `✕`/CTA del otro.

      Los diálogos de pantalla completa (GameOutcomeDialog, WarningDetailModal,
      ConfirmDialog, VillainPickerModal, PlayerModal, IndexOverlay, capa 50;
      ResumePrompt/ContentChangedNotice, capa 40) siguen pintando por encima
      de este bloque sin depender de su posición en el DOM: viven dentro de
      `<NuxtPage/>`, posicionados con `fixed inset-0`, así que su propia capa
      de apilamiento los saca del flujo de la franja — este bloque ya no
      necesita ningún número de capa para quedar debajo de ellos.
    -->
    <div
      v-if="variant !== null"
      class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md"
    >
      <div class="flex flex-col gap-sm">
        <!--
          CR-01 (ronda 4, 09-VERIFICATION.md): este componente ya no
          contiene NINGUNA afirmación propia sobre los datos del grupo. El
          texto lo decide `planGameEnd`/`resolveNoticeVariant`
          (useHistorySavedNotice.ts) a partir de DOS preguntas distintas: si
          el histórico llegó a escribirse (`record()`) y qué hay AHORA MISMO
          en el dispositivo comparado con la partida que acaba de terminar
          (`readStoredProgress`, la autoridad de lectura, plan 09-25/09-28) —
          y vive en `NOTICE_HEADING`/`NOTICE_BODY` precisamente para que un
          test puro pueda comprobarlo sin montar este componente. Antes de
          09-20/09-21 el `v-else` de aquí pintaba la misma frase de
          recuperación para las dos variantes de fallo, incluida la que no
          tiene nada que recuperar; esa es la promesa falsa que CR-01
          encontró. Regla para el futuro: ninguna frase que esta banda
          muestre puede escribirse aquí; si hace falta una nueva, se añade
          como variante en el composable, respaldada por una LECTURA real que
          conteste la MISMA pregunta que la frase plantea — nunca por el
          booleano de una escritura.
        -->
        <h2
          class="text-heading font-bold text-primary-text"
          :class="isSuccessVariant(variant) ? 'first-letter:text-accent' : 'first-letter:text-warning'"
        >
          {{ heading }}
        </h2>
        <p v-if="body" class="text-body font-normal text-secondary-text">
          {{ body }}
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
