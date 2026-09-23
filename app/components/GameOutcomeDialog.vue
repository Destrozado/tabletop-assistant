<script setup lang="ts">
// Componente tonto y genérico (09-UI-SPEC.md §Layout 2): sin ningún import
// del motor ni de composables, y sin ningún acceso directo al almacenamiento
// del navegador — recibe `contextLine`/`warningBody` ya calculados por la
// página y emite la decisión del grupo, nada más.
//
// NOTA DE RECONCILIACIÓN (obligatoria, D-01/D-02/HIST-02): `dismiss` NO es
// «cancelar y seguir jugando». HIST-02 y el criterio de éxito nº 1 del
// ROADMAP exigen que «siempre se pueda cerrar la partida sin registrar
// nada», y D-01 fija exactamente cuatro opciones — así que las cuatro
// terminan la partida, y `dismiss` es la que la termina sin escribir en el
// histórico. Con este diálogo desaparece la opción «Cancelar» que tenía el
// `ConfirmDialog` anterior; es deliberado (D-02: el número de toques no
// cambia), no un olvido. Quien vaya a añadir un quinto botón debe leer D-01
// primero.
//
// NOTA DE RECONCILIACIÓN — `Escape` (WR-04, cierre en 09-19): este diálogo NO
// escucha `Escape` y NO se cierra al tocar el velo, A PROPÓSITO.
// `09-UI-SPEC.md` §Layout 2 fija esto como contrato de diseño de la fase («no
// backdrop-tap-dismiss and no Escape-to-dismiss on this dialog … a diálogo
// this consequential requires an explicit tap on one of its four options,
// never an accidental one»), y la razón de fondo es que las cuatro salidas
// terminan la partida (D-01/HIST-02): un cierre accidental por `Escape`
// terminaría una partida en curso. Es la misma postura de «sin descarte
// accidental» que `ConfirmDialog.vue` ya tiene.
// `WarningDetailModal.vue` sí escucha `Escape` y no es contradicción: ese
// modal es informativo y `dismiss` vuelve exactamente al mismo sitio; este
// diálogo no — sus cuatro salidas son terminales.
// La salida por teclado existe igualmente sin necesidad de `Escape`: `Tab`
// hasta el botón de cierre sin registrar y `Enter`.
// Ver `deferred-items.md` §WR-04 y `09-VERIFICATION.md` (ronda 4, «Sobre los
// dos diferidos reclasificados») — esto es una decisión contrastada, no un
// olvido pendiente. Re-comprobada por el quick 260923-3rm: sigue cerrada, y
// la trampa de foco nueva (WR-02 r4) la complementa sin reabrirla.
import { ref } from 'vue'
import { useDialogFocusTrap } from '~/composables/useDialogFocusTrap'

defineProps<{
  contextLine: string
  warningBody: string
}>()

const emit = defineEmits<{
  record: ['won' | 'mainSchemeCompleted' | 'heroesEliminated']
  dismiss: []
}>()

// Un ref de estado de pulsado por botón (mismo patrón de press-feedback que
// `ConfirmDialog.vue`), para que el toque en un botón no anime a los otros
// dos.
const wonPressed = ref(false)
const mainSchemePressed = ref(false)
const heroesEliminatedPressed = ref(false)

// Foco gestionado y ATRAPADO (WR-02 r4, quick 260923-3rm): el panel entra en
// foco al abrirse, `Tab`/`Shift+Tab` ciclan SOLO entre los botones de este
// diálogo (nunca escapan hacia «SIGUIENTE» ni ningún otro control detrás del
// velo), y el foco vuelve a donde estaba al cerrarse SOLO si ese nodo sigue
// conectado al DOM (WR-03 r4: nunca `.focus()` sobre un nodo desprendido).
// Extraído a `useDialogFocusTrap` (mismo patrón de alta/baja de listener que
// `WarningDetailModal.vue`, pero con el ciclo de Tab añadido) — ver la
// cabecera de ese fichero para el razonamiento completo, incluido por qué la
// restauración es un no-op intencional en las cuatro salidas reales de este
// diálogo.
//
// El foco inicial va al PANEL, no a ningún botón, y esa es la diferencia
// deliberada con `WarningDetailModal.vue` (que sí enfoca su único botón
// «Entendido» porque ahí no hay elección que sesgar). D-02 prohíbe empujar al
// grupo hacia un resultado: los tres botones de registro son deliberadamente
// iguales en peso visual, y depositar el foco sobre el primer botón de
// resultado sería exactamente ese empujón, en la capa de accesibilidad en vez
// de en la visual. Enfocar el panel mete al usuario de teclado dentro del
// diálogo (el siguiente `Tab` cae en el primer botón de resultado, el
// `Shift+Tab` en el botón de cierre sin registrar) sin preseleccionar nada.
const panel = ref<HTMLElement | null>(null)
useDialogFocusTrap(panel)
</script>

<template>
  <div role="dialog" aria-modal="true" aria-labelledby="game-outcome-heading" class="fixed inset-0 z-50 bg-background flex items-center justify-center px-xl">
    <div ref="panel" tabindex="-1" class="w-full max-w-[640px] max-h-[90dvh] overflow-y-auto bg-surface p-2xl flex flex-col gap-lg">
      <h1 id="game-outcome-heading" class="text-heading font-bold text-primary-text">
        ¿Cómo terminó la partida?
      </h1>

      <p class="text-body font-normal text-secondary-text">
        {{ contextLine }}
      </p>

      <p class="text-body font-normal text-secondary-text">
        {{ warningBody }}
      </p>

      <div class="flex flex-col gap-md">
        <button
          type="button"
          class="min-h-12 px-lg bg-surface text-primary-text text-body font-bold transition-transform duration-75"
          :class="wonPressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="wonPressed = true"
          @touchstart="wonPressed = true"
          @mouseup="wonPressed = false"
          @touchend="wonPressed = false"
          @click="emit('record', 'won')"
        >
          GANADA
        </button>
        <button
          type="button"
          class="min-h-12 px-lg bg-surface text-primary-text text-body font-bold transition-transform duration-75"
          :class="mainSchemePressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="mainSchemePressed = true"
          @touchstart="mainSchemePressed = true"
          @mouseup="mainSchemePressed = false"
          @touchend="mainSchemePressed = false"
          @click="emit('record', 'mainSchemeCompleted')"
        >
          PERDIDA · Se completó el Plan Principal
        </button>
        <button
          type="button"
          class="min-h-12 px-lg bg-surface text-primary-text text-body font-bold transition-transform duration-75"
          :class="heroesEliminatedPressed ? 'brightness-95 scale-[0.98]' : ''"
          @mousedown="heroesEliminatedPressed = true"
          @touchstart="heroesEliminatedPressed = true"
          @mouseup="heroesEliminatedPressed = false"
          @touchend="heroesEliminatedPressed = false"
          @click="emit('record', 'heroesEliminated')"
        >
          PERDIDA · Todos los héroes eliminados
        </button>
      </div>

      <button
        type="button"
        class="text-label font-bold text-secondary-text text-center"
        @click="emit('dismiss')"
      >
        Salir sin registrar
      </button>
    </div>
  </div>
</template>
