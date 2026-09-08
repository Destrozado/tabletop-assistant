<script setup lang="ts">
// Componente tonto de elección + edición. D-11 metió el campo de nombre
// DENTRO de este modal en parte por seguridad de interacción:
// useStepShortcuts hace que espacio/intro avancen el paso durante la
// partida, y un campo de texto suelto en la pantalla del paso haría que
// escribir un nombre avanzase la preparación con cada espacio. Aquí el
// campo nace protegido por partida doble — la guarda de campo editable de
// la propia función pura y la bandera de modal abierto que cablea
// app/pages/[game]/index.vue (D-12) — pero este componente NO implementa
// ninguna de las dos: no reimplementa ni un trozo de esa condición (D-Q2).
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { filterHeroOptions } from '~/composables/useHeroSearch'

const props = defineProps<{
  slotNumber: number
  name: string
  heroes: { id: string, spanishName: string, catalogueName: string, alterEgo: string }[]
  selectedHeroId: string | null
  takenBy: Record<string, string>
  // WR-01 (06-REVIEW.md): el tope de caracteres llega SIEMPRE por prop, nunca
  // como cifra escrita a mano en la plantilla. La fuente única es
  // PLAYER_NAME_MAX_LENGTH en el motor, y quien monta este componente la
  // enlaza. Este componente sigue siendo tonto (no importa `~~/engine/*`),
  // pero ya no puede desincronizarse del límite que el motor reimpone al
  // guardar: antes eran dos copias del 14 sin nada que las atara.
  nameMaxLength: number
}>()

const emit = defineEmits<{
  'name-input': [value: string]
  'select-hero': [heroId: string | null]
  'dismiss': []
}>()

// Estado local, nunca persistido — se reinicia en cada apertura del modal.
const query = ref('')

// 06-UI-SPEC.md §Layout 4 exige que el campo muestre "Jugador {n}" como
// VALOR REAL editable, no como placeholder. Se inicializa una sola vez al
// montar y no se emite nada en ese momento, así que el dato guardado sigue
// siendo cadena vacía hasta que alguien teclee — y una cadena vacía se
// sigue rotulando "Jugador N" por D-15, de modo que las dos vistas
// coinciden sin necesidad de guardar el valor por defecto.
const draftName = ref(props.name !== '' ? props.name : `Jugador ${props.slotNumber}`)

const visibleHeroes = computed(() => filterHeroOptions(props.heroes, query.value))

const dismissButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('dismiss')
  }
}

onMounted(() => {
  // D-09: el teclado de la tablet no debe aparecer sin que nadie lo pida —
  // el foco inicial va SIEMPRE al botón cerrar, nunca a ninguno de los dos
  // campos de texto de abajo.
  dismissButton.value?.focus()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

// D-13: se guarda según se escribe, sin debounce propio en este
// componente — el watchDebounced de 300 ms de la página ya cubre la
// escritura en disco.
function onNameInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  draftName.value = value
  emit('name-input', value)
}
</script>

<template>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="player-modal-heading"
    class="fixed inset-0 z-50 bg-background/80 flex items-center justify-center px-xl"
    @click.self="emit('dismiss')"
  >
    <div class="w-full max-w-[640px] max-h-[80vh] bg-surface flex flex-col">
      <div class="h-16 shrink-0 flex items-center justify-between px-lg border-b border-background">
        <!-- El título es el número de hueco fijo, nunca el nombre tecleado
             — sigue diciendo "JUGADOR 1" incluso después de escribir un
             nombre en el campo de abajo, para no cambiar de rótulo mientras
             el usuario todavía está editando. -->
        <h1 id="player-modal-heading" class="text-heading font-bold text-primary-text truncate">
          JUGADOR {{ slotNumber }}
        </h1>
        <button
          ref="dismissButton"
          type="button"
          class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
          :aria-label="`Cerrar jugador ${slotNumber}`"
          @click="emit('dismiss')"
        >
          ✕
        </button>
      </div>

      <div class="shrink-0 px-lg py-md flex flex-col gap-md">
        <div class="flex flex-col gap-xs">
          <label for="player-modal-name-input" class="text-label font-bold text-primary-text">
            Nombre
          </label>
          <input
            id="player-modal-name-input"
            type="text"
            :value="draftName"
            :maxlength="nameMaxLength"
            autocomplete="off"
            class="w-full min-h-12 px-md bg-background text-body font-normal text-primary-text placeholder:text-secondary-text border-b-2 border-transparent focus:border-accent outline-none"
            @input="onNameInput"
          >
          <!-- Cifra fijada por 06-UI-SPEC.md §Typography cerrando el rango
               12-16 de D-15, recibida por prop desde la constante única del
               motor (WR-01 de 06-REVIEW.md) en vez de escrita aquí a mano.
               El motor reimpone además el mismo límite al guardar la sesión,
               como defensa de escritura por si este límite del cliente se
               sortea. -->
        </div>

        <div class="flex flex-col gap-xs">
          <label for="player-modal-hero-filter-input" class="text-label font-bold text-primary-text">
            Héroe
          </label>
          <input
            id="player-modal-hero-filter-input"
            v-model="query"
            type="text"
            placeholder="Buscar héroe…"
            autocomplete="off"
            class="w-full min-h-12 px-md bg-background text-body font-normal text-primary-text placeholder:text-secondary-text border-b-2 border-transparent focus:border-accent outline-none"
          >
        </div>
      </div>

      <div class="flex-1 overflow-y-auto border-t border-background">
        <!-- Fila fija: nunca se filtra, siempre alcanzable escriba lo que
             escriba el usuario en el campo de arriba (D-17). -->
        <button
          type="button"
          class="w-full min-h-12 px-md py-sm flex items-center justify-between text-left text-body font-normal text-primary-text transition-transform duration-75 active:brightness-95 border-b border-background"
          @click="emit('select-hero', null)"
        >
          <span>Sin elegir</span>
          <span v-if="selectedHeroId === null" class="text-accent">✓</span>
        </button>

        <!-- IN-02 (06-REVIEW.md): dos vacíos distintos, dos mensajes distintos.
             «No hay catálogo» no es «no coincide nada»: con la lista vacía y sin
             texto escrito, un único mensaje diría «Ningún héroe coincide con «»»,
             que suena a búsqueda fallida en vez de a juego sin catálogo. Hoy no
             es alcanzable —Marvel Champions siempre trae sus 23 héroes— pero lo
             será en cuanto exista un segundo juego (Warhammer 40.000), donde
             `index.vue` ya pasa `heroOptions = []` de forma defensiva. -->
        <p
          v-if="heroes.length === 0"
          class="text-body font-normal text-secondary-text text-center py-md"
        >
          Este juego todavía no tiene catálogo de héroes
        </p>
        <p
          v-else-if="visibleHeroes.length === 0"
          class="text-body font-normal text-secondary-text text-center py-md"
        >
          Ningún héroe coincide con «{{ query }}»
        </p>

        <button
          v-for="hero in visibleHeroes"
          :key="hero.id"
          type="button"
          class="w-full min-h-12 px-md py-sm flex flex-col items-start gap-xs text-left transition-transform duration-75 active:brightness-95"
          @click="emit('select-hero', hero.id)"
        >
          <div class="w-full flex items-baseline justify-between gap-sm">
            <span class="min-w-0 truncate text-body font-normal text-primary-text">{{ hero.spanishName }}</span>
            <span class="shrink-0 flex items-center gap-xs text-body font-normal">
              <!-- D-16 permite el mismo héroe en dos huecos a la vez: el
                   check de "esta es mi elección actual" y el aviso de "ya
                   lo lleva otro jugador" pueden aparecer juntos en la misma
                   fila (p. ej. editando a Bruno mientras Bruno y Ana llevan
                   los dos a Thor). -->
              <template v-if="hero.id === selectedHeroId">
                <span class="text-accent">✓</span>
              </template>
              <template v-if="takenBy[hero.id]">
                <span class="text-secondary-text">ya: {{ takenBy[hero.id] }}</span>
              </template>
            </span>
          </div>
          <span class="min-w-0 truncate text-body font-normal text-secondary-text">
            {{ hero.catalogueName }} · {{ hero.alterEgo }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
