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
// número de botones es dinámico. Solo visual, nunca persistido. El estado de
// pulsado vuelve a reposo por cuatro caminos, no solo por el de soltar sobre
// el propio botón: salir el puntero, perder el foco, y que el sistema
// cancele el toque (notificación, rechazo de palma, gesto propio del SO) —
// en una tablet este último es el disparador realista, y con un número
// dinámico de botones una flecha podía quedarse hundida una ronda entera. La
// acción sigue atada solo al clic completo, nunca a estos manejadores.
const pressedKey = ref<string | null>(null)

// D-05/D-06: dos filas en viewport estrecho (villano arriba, jugadores
// abajo), una sola fila desde `sm:` — la partición de celdas por fila vive
// aquí para que la plantilla de la celda se escriba una única vez y ambas
// filas la reutilicen vía `v-for` anidado (07-UI-SPEC.md §Layout §3).
//
// Cada celda lleva además su índice GLOBAL, continuo a través de los dos
// grupos: el separador entre celdas ya no puede apoyarse en `:first-child`
// (evaluado contra el árbol del DOM, ciego a que `sm:contents` fusiona
// visualmente dos filas en una) porque eso deja dos celdas «primera» a la
// vez y borra el separador justo entre el villano y el primer jugador.
const rowGroups = computed(() => {
  const villainCell = props.cells.find(cell => cell.key === 'villano') ?? null
  const playerCells = props.cells.filter(cell => cell.key !== 'villano')
  const groups = [
    { rowKey: 'villano-row', rowCells: villainCell ? [villainCell] : [] },
    { rowKey: 'jugadores-row', rowCells: playerCells },
  ].filter(group => group.rowCells.length > 0)

  let globalIndex = 0
  return groups.map(group => ({
    rowKey: group.rowKey,
    entries: group.rowCells.map(cell => ({ cell, globalIndex: globalIndex++ })),
  }))
})

// La altura del cascarón se deriva del número real de filas que `rowGroups`
// produce, en vez de cablear «siempre dos»: una banda degenerada (sin
// celdas de jugador) no debe reservar una fila entera de espacio muerto que
// le roba altura al texto del paso.
const shellHeightClass = computed(() => rowGroups.value.length === 1 ? 'h-24' : 'h-48')
</script>

<template>
  <!--
    D-05/D-06: dos filas de h-24 apiladas en flex-col por debajo de `sm`
    suman 192px reales — el cascarón necesita `h-48` (12rem = 192px) ahí, no
    `h-24` (96px), o la segunda fila desbordaría el cascarón y se pintaría
    encima de `main`. Desde `sm:` las filas colapsan a `sm:contents` (una
    sola fila visual) y el cascarón vuelve a su `sm:h-24` de siempre. Con una
    sola fila real (banda degenerada) el cascarón baja a `h-24` en vez de
    reservar una fila muerta.
  -->
  <div :class="[shellHeightClass, 'sm:h-24 shrink-0 bg-surface flex flex-col sm:flex-row']">
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

        El separador ya no depende de `:first-child`: por debajo de `sm:` esa
        pseudoclase sigue siendo cierta para la primera celda de CADA fila
        (dos filas, dos primeras celdas), pero desde `sm:` las filas colapsan
        visualmente en una sola y dos celdas distintas seguirían siendo
        «primera» a la vez, borrando el separador justo donde más importa.
        En su lugar el borde se decide por el índice global de la celda
        (cero para la primera de toda la banda, presente para el resto) y se
        añade un reseteo acotado a anchos estrechos para que, ahí donde las
        filas SÍ son cajas independientes, la primera celda de cada fila
        tampoco pinte una raya suelta contra el borde de la banda.
      -->
      <div
        v-for="entry in group.entries"
        :key="entry.cell.key"
        :class="[
          'relative flex-1 min-w-0 h-24 border-background overflow-hidden max-sm:first:border-l-0',
          entry.globalIndex === 0 ? '' : 'border-l',
        ]"
      >
        <div class="h-24 flex items-stretch">
          <button
            type="button"
            class="flex-1 min-w-0 h-24 flex items-end justify-center pb-xs text-heading font-bold leading-none text-accent transition-[transform,filter] duration-75"
            :class="pressedKey === `${entry.cell.key}:down` ? 'brightness-95 scale-[0.98]' : ''"
            :aria-label="`Bajar vida de ${entry.cell.label}`"
            @mousedown="pressedKey = `${entry.cell.key}:down`"
            @mouseup="pressedKey = null"
            @mouseleave="pressedKey = null"
            @blur="pressedKey = null"
            @touchstart="pressedKey = `${entry.cell.key}:down`"
            @touchend="pressedKey = null"
            @touchcancel="pressedKey = null"
            @click="emit('decrement', entry.cell.key)"
          >
            ▼
          </button>

          <span class="min-w-12 sm:min-w-16 shrink-0 h-24 flex items-end justify-center pb-xs text-display font-bold leading-none text-primary-text tabular-nums">
            {{ entry.cell.displayValue }}
          </span>

          <button
            type="button"
            class="flex-1 min-w-0 h-24 flex items-end justify-center pb-xs text-heading font-bold leading-none text-accent transition-[transform,filter] duration-75"
            :class="pressedKey === `${entry.cell.key}:up` ? 'brightness-95 scale-[0.98]' : ''"
            :aria-label="`Subir vida de ${entry.cell.label}`"
            @mousedown="pressedKey = `${entry.cell.key}:up`"
            @mouseup="pressedKey = null"
            @mouseleave="pressedKey = null"
            @blur="pressedKey = null"
            @touchstart="pressedKey = `${entry.cell.key}:up`"
            @touchend="pressedKey = null"
            @touchcancel="pressedKey = null"
            @click="emit('increment', entry.cell.key)"
          >
            ▲
          </button>
        </div>

        <span
          class="pointer-events-none absolute inset-x-0 top-0 pt-xs px-xs text-center truncate text-label font-bold leading-none"
          :class="entry.cell.defeated ? 'text-warning' : 'text-primary-text'"
        >{{ entry.cell.label }}</span>
      </div>
    </div>
  </div>
</template>
