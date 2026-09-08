<script setup lang="ts">
// Componente tonto. Sin ningún import del motor (ni de sus submódulos) ni de
// ningún composable: recibe los valores ya resueltos (incluido «—») desde
// `useGameSession` y no distingue `null` de un número — esa distinción ya la
// hizo el composable (D-09/D-12). Ningún estado inactivo aquí tampoco (mismo
// precedente que `NavBand.vue`): las flechas ▼/▲ siempre se pintan activas y
// a color completo; sus topes son no-ops silenciosos que resuelve el motor.
import { computed, ref } from 'vue'

const props = defineProps<{
  cells: { key: string, label: string, displayValue: string, defeated: boolean }[]
}>()

const emit = defineEmits<{
  increment: [key: string]
  decrement: [key: string]
}>()

// D-14 (reutilizado literalmente de NavBand.vue): un único ref compartido y
// con clave, porque a diferencia de los dos botones fijos de NavBand aquí el
// número de botones es dinámico. Solo visual, nunca persistido.
const pressedKey = ref<string | null>(null)

// D-05/D-06: dos filas en viewport estrecho (villano arriba, jugadores
// abajo), una sola fila desde `sm:` — la partición de celdas por fila vive
// aquí para que la plantilla de la celda se escriba una única vez y ambas
// filas la reutilicen vía `v-for` anidado (07-UI-SPEC.md §Layout §3).
const rowGroups = computed(() => {
  const villainCell = props.cells.find(cell => cell.key === 'villano') ?? null
  const playerCells = props.cells.filter(cell => cell.key !== 'villano')
  return [
    { rowKey: 'villano-row', rowCells: villainCell ? [villainCell] : [] },
    { rowKey: 'jugadores-row', rowCells: playerCells },
  ].filter(group => group.rowCells.length > 0)
})
</script>

<template>
  <!--
    D-05/D-06: dos filas de h-24 apiladas en flex-col por debajo de `sm`
    suman 192px reales — el cascarón necesita `h-48` (12rem = 192px) ahí, no
    `h-24` (96px), o la segunda fila desbordaría el cascarón y se pintaría
    encima de `main`. Desde `sm:` las filas colapsan a `sm:contents` (una
    sola fila visual) y el cascarón vuelve a su `sm:h-24` de siempre.
  -->
  <div class="h-48 sm:h-24 shrink-0 bg-surface flex flex-col sm:flex-row">
    <div
      v-for="group in rowGroups"
      :key="group.rowKey"
      class="h-24 shrink-0 flex sm:contents"
    >
      <!--
        CR-01 (07-VERIFICATION.md): esta celda ya no puede robarle el toque a
        su hermana. Las flechas se declaran con un suelo de anchura de cero:
        siguen absorbiendo el espacio sobrante donde lo hay (apaisado), y
        ENCOGEN en vez de desbordar donde no lo hay (estrecho + varios
        jugadores). El recorte de la celda es la garantía de última
        instancia: aunque algún día un valor desbordase la aritmética,
        quedaría recortado dentro de su propio rectángulo en vez de pintarse
        encima del contador vecino y ganarle el hit-test.
      -->
      <div
        v-for="cell in group.rowCells"
        :key="cell.key"
        class="relative flex-1 min-w-0 h-24 border-l border-background first:border-l-0 overflow-hidden"
      >
        <div class="h-24 flex items-stretch">
          <button
            type="button"
            class="flex-1 min-w-0 h-24 flex items-end justify-center pb-xs text-heading font-bold leading-none text-accent transition-transform duration-75"
            :class="pressedKey === `${cell.key}:down` ? 'brightness-95 scale-[0.98]' : ''"
            :aria-label="`Bajar vida de ${cell.label}`"
            @mousedown="pressedKey = `${cell.key}:down`"
            @mouseup="pressedKey = null"
            @touchstart="pressedKey = `${cell.key}:down`"
            @touchend="pressedKey = null"
            @click="emit('decrement', cell.key)"
          >
            ▼
          </button>

          <span class="min-w-12 sm:min-w-16 shrink-0 h-24 flex items-end justify-center pb-xs text-display font-bold leading-none text-primary-text tabular-nums">
            {{ cell.displayValue }}
          </span>

          <button
            type="button"
            class="flex-1 min-w-0 h-24 flex items-end justify-center pb-xs text-heading font-bold leading-none text-accent transition-transform duration-75"
            :class="pressedKey === `${cell.key}:up` ? 'brightness-95 scale-[0.98]' : ''"
            :aria-label="`Subir vida de ${cell.label}`"
            @mousedown="pressedKey = `${cell.key}:up`"
            @mouseup="pressedKey = null"
            @touchstart="pressedKey = `${cell.key}:up`"
            @touchend="pressedKey = null"
            @click="emit('increment', cell.key)"
          >
            ▲
          </button>
        </div>

        <span
          class="pointer-events-none absolute inset-x-0 top-0 pt-xs px-xs text-center truncate text-label font-bold leading-none"
          :class="cell.defeated ? 'text-warning' : 'text-primary-text'"
        >{{ cell.label }}</span>
      </div>
    </div>
  </div>
</template>
