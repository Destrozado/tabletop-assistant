<script setup lang="ts">
// Ruta /estadisticas (D-16). Misma cabecera de tres zonas que /historico,
// invertida (enlace cruzado hacia Histórico). Las filas llegan ya
// ordenadas por la cascada de D-24 desde la costura reactiva del
// histórico: este componente no ordena, no filtra y no calcula porcentajes.
import { onMounted, ref } from 'vue'
import { useGameHistory } from '~/composables/useGameHistory'

const { statisticsView, reload } = useGameHistory()

// Mismo patrón que /historico: el prerender no tiene localStorage, así que
// hasta resolver el montaje el cuerpo no pinta ni las tablas ni el estado
// vacío.
const cargado = ref(false)

onMounted(() => {
  reload()
  cargado.value = true
})
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
        ESTADÍSTICAS
      </h1>
      <button
        type="button"
        class="min-h-12 px-md text-label font-bold text-accent active:brightness-95"
        @click="navigateTo('/historico')"
      >
        Histórico ›
      </button>
    </header>

    <main class="flex-1 overflow-y-auto bg-background px-2xl py-lg">
      <template v-if="cargado">
        <div v-if="statisticsView.isEmpty" class="flex flex-col items-center justify-center text-center gap-md h-full">
          <h2 class="text-heading font-bold text-primary-text">
            {{ statisticsView.emptyTitle }}
          </h2>
          <p class="text-body font-normal text-secondary-text">
            {{ statisticsView.emptyBody }}
          </p>
        </div>

        <div v-else class="flex flex-col gap-lg">
          <p v-if="statisticsView.sampleCaption" class="text-label font-bold text-secondary-text">
            {{ statisticsView.sampleCaption }}
          </p>

          <div v-if="statisticsView.heroRows.length > 0">
            <h2 class="text-label font-bold uppercase text-secondary-text border-b border-background pb-xs">
              % DE VICTORIAS POR HÉROE
            </h2>
            <div
              v-for="row in statisticsView.heroRows"
              :key="row.id"
              class="flex justify-between items-baseline min-h-12 px-md"
            >
              <span class="flex-1 truncate text-body font-normal text-primary-text">{{ row.name }}</span>
              <span class="text-body font-normal text-primary-text">{{ row.valueLabel }}</span>
            </div>
          </div>

          <div v-if="statisticsView.villainRows.length > 0">
            <h2 class="text-label font-bold uppercase text-secondary-text border-b border-background pb-xs">
              % DE VICTORIAS POR VILLANO
            </h2>
            <div
              v-for="row in statisticsView.villainRows"
              :key="row.id"
              class="flex justify-between items-baseline min-h-12 px-md"
            >
              <span class="flex-1 truncate text-body font-normal text-primary-text">{{ row.name }}</span>
              <span class="text-body font-normal text-primary-text">{{ row.valueLabel }}</span>
            </div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
