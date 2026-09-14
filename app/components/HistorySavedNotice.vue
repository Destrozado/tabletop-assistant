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
      WR-05(b) (09-VERIFICATION.md ronda 4): esta banda se monta como hermana
      de `<NuxtPage/>` dentro de `#app-root` (app/app.vue), y todas las
      pantallas usan `h-dvh`. Sin sacarla del flujo, su altura se sumaba a
      los 100dvh de la pantalla de destino y empujaba la fila inferior (p.
      ej. los botones «Histórico»/«Estadísticas» de GameSelectorScreen) fuera
      del borde de la tablet. `fixed top-0 inset-x-0` la saca del flujo; sin
      más, una banda `fixed` interceptaría los toques de la franja superior
      de la pantalla de debajo, así que el contenedor deja pasar los toques
      hacia lo que hay detrás (Tailwind: eventos de puntero desactivados a
      nivel de contenedor), y solo el botón `✕` los recupera para seguir
      siendo pulsable (Tailwind: eventos de puntero reactivados en el propio
      control) — 09-UI-SPEC.md §8, «never blocks input».

      El nivel de apilamiento elegido la deja por debajo de los diálogos de
      decisión (GameOutcomeDialog, WarningDetailModal, ConfirmDialog,
      VillainPickerModal, PlayerModal, IndexOverlay, todos en la capa 50) —
      correcto, un diálogo que exige una decisión no puede quedar tapado por
      un aviso informativo. Pero `ResumePrompt.vue` y
      `ContentChangedNotice.vue` usan ESE MISMO nivel intermedio (capa 40):
      frente a esos dos, el número de capa NO basta por sí solo — la banda
      queda debajo de ellos únicamente porque `app/app.vue` la monta ANTES de
      `<NuxtPage/>` (a igual nivel de apilamiento, pinta encima el que va
      después en el DOM). Quien reordene ese montaje romperá esta banda sin
      tocar ningún número.

      Esta banda y `UpdateBanner.vue` reciben el mismo tratamiento a
      propósito: el hallazgo WR-05(b) nombra a las dos.
    -->
    <div
      v-if="variant !== null"
      class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md fixed top-0 inset-x-0 z-40 pointer-events-none"
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
          :class="variant === 'success' ? 'first-letter:text-accent' : 'first-letter:text-warning'"
        >
          {{ heading }}
        </h2>
        <p v-if="body" class="text-body font-normal text-secondary-text">
          {{ body }}
        </p>
      </div>
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95 pointer-events-auto"
        aria-label="Cerrar aviso"
        @click="dismiss"
      >
        ✕
      </button>
    </div>
  </div>
</template>
