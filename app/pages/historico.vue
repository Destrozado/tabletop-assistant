<script setup lang="ts">
// Ruta /historico (D-16). Página fina: compone useGameHistory(), la
// tarjeta tonta de cada entrada y el diálogo de confirmación reutilizado
// (D-20), sin calcular ni ordenar nada por su cuenta.
import { onMounted, ref } from 'vue'
import { DELETE_FAILED_BODY, DELETE_FAILED_HEADING, useGameHistory } from '~/composables/useGameHistory'
import type { HistoryCardView } from '~/composables/useGameHistory'

const { cardViews, isEmpty, reload, remove } = useGameHistory()

// El prerender no tiene localStorage (Pitfall 7, mismo criterio que
// resumeResolved en app/pages/[game]/index.vue): hasta que se resuelve el
// montaje y se recarga la lista, el cuerpo no afirma "no hay nada" ni pinta
// nada.
const cargado = ref(false)

onMounted(() => {
  reload()
  cargado.value = true
})

const pendienteDeBorrar = ref<HistoryCardView | null>(null)

// IN-11 (09-REVIEW.md, cerrado en la quick 260923-3rl): `remove()` ahora
// devuelve si el borrado quedó escrito. `borradoFallido` es estado local del
// `<script setup>` de esta página (nunca estado de módulo — no entra en el
// perímetro que audita invariantesDeMarcaDeEstado.test.ts). Decisión propia
// (documentada en el SUMMARY): NO se reutiliza `HistorySavedNotice.vue` —
// sus variantes son exclusivamente desenlaces de fin de partida producidos
// por `planGameEnd`, y Gate C prohíbe escribir un `NoticeVariant` fuera de
// `useHistorySavedNotice.ts` — así que este aviso es una banda propia, en el
// flujo (no `fixed`), con el mismo lenguaje visual.
const borradoFallido = ref(false)

function onAbrirBorrado(entry: HistoryCardView) {
  pendienteDeBorrar.value = entry
  // Un intento nuevo de borrado retira el aviso del intento anterior.
  borradoFallido.value = false
}

function onCancelarBorrado() {
  pendienteDeBorrar.value = null
}

function onConfirmarBorrado() {
  if (!pendienteDeBorrar.value) return
  const borrada = remove(pendienteDeBorrar.value.id)
  borradoFallido.value = !borrada
  pendienteDeBorrar.value = null
}
</script>

<template>
  <div class="h-dvh flex flex-col">
    <header class="h-16 shrink-0 bg-surface flex items-center justify-between px-lg gap-md">
      <button
        type="button"
        class="min-h-12 px-md text-label font-bold text-primary-text active:brightness-95"
        @click="navigateTo('/')"
      >
        ‹ Atrás
      </button>
      <h1 class="text-heading font-bold text-primary-text truncate">
        HISTÓRICO
      </h1>
      <button
        type="button"
        class="min-h-12 px-md text-label font-bold text-accent active:brightness-95"
        @click="navigateTo('/estadisticas')"
      >
        Estadísticas ›
      </button>
    </header>

    <!--
      IN-11: región viva PERMANENTE (sin v-if aquí) — mismo criterio que
      HistorySavedNotice.vue: un lector de pantalla solo anuncia los cambios
      de una región `aria-live` que YA estaba en el DOM cuando el contenido
      cambió. El v-if va en el contenido de dentro. shrink-0 + EN EL FLUJO
      (nunca fixed): dentro del flex-col h-dvh de esta página, el `main`
      flex-1 overflow-y-auto encoge en vez de que la banda empuje la
      pantalla fuera del viewport (evita la clase de WR-05(b)), y no tapa los
      botones de la cabecera (evita la clase de WR-05 ronda 4). Sin
      autocierre por temporizador: se retira con ✕ o con el siguiente
      intento de borrado.
    -->
    <div class="shrink-0" role="status" aria-live="polite">
      <div
        v-if="borradoFallido"
        class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md"
      >
        <div class="flex flex-col gap-sm">
          <h2 class="text-heading font-bold text-primary-text first-letter:text-warning">
            {{ DELETE_FAILED_HEADING }}
          </h2>
          <p class="text-body font-normal text-secondary-text">
            {{ DELETE_FAILED_BODY }}
          </p>
        </div>
        <button
          type="button"
          class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
          aria-label="Cerrar aviso"
          @click="borradoFallido = false"
        >
          ✕
        </button>
      </div>
    </div>

    <main class="flex-1 overflow-y-auto bg-background px-2xl py-lg">
      <template v-if="cargado">
        <div v-if="!isEmpty" class="flex flex-col gap-md">
          <HistoryEntryCard
            v-for="entry in cardViews"
            :key="entry.id"
            :result-label="entry.resultLabel"
            :date-label="entry.dateLabel"
            :cause-label="entry.causeLabel"
            :context-line="entry.contextLine"
            :player-lines="entry.playerLines"
            :no-selection-line="entry.noSelectionLine"
            :round-and-duration-line="entry.roundAndDurationLine"
            :delete-aria-label="entry.deleteAriaLabel"
            @delete="onAbrirBorrado(entry)"
          />
        </div>

        <div v-else class="flex flex-col items-center justify-center text-center gap-md h-full">
          <h2 class="text-heading font-bold text-primary-text">
            Todavía no hay partidas registradas
          </h2>
          <p class="text-body font-normal text-secondary-text">
            Al terminar una partida y pulsar «Partida terminada», la app pregunta cómo acabó — así es como se rellena esta lista.
          </p>
        </div>
      </template>
    </main>

    <ConfirmDialog
      v-if="pendienteDeBorrar"
      :title="pendienteDeBorrar.confirmTitle"
      :body="pendienteDeBorrar.confirmBody"
      confirm-label="Sí, borrar"
      cancel-label="Cancelar"
      :destructive="true"
      @confirm="onConfirmarBorrado"
      @cancel="onCancelarBorrado"
    />
  </div>
</template>
