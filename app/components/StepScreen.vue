<script setup lang="ts">
// Componente tonto. Renderiza SIEMPRE con interpolación de texto — prohibida
// la directiva de HTML crudo en toda la app (T-01-01 del threat model: el
// texto de contenido nunca se trata como HTML confiado).
withDefaults(defineProps<{
  actionText: string
  warningText: string | null
  // D-32: null cuando el aviso no tiene consecuencia detallada — en ese
  // caso la línea se pinta exactamente como en la Fase 1 (sin afordancia
  // falsa: sin borde, sin chevron, sin ser pulsable).
  warningDetailText: string | null
  // C1/DC-10 (02-05-PLAN.md): lista breve y pulsable de opciones del turno,
  // null cuando el paso no la declara. Forma en línea, sin importar el tipo
  // del motor (componente tonto, como IndexOverlay.vue).
  options: { label: string, detail: string }[] | null
  // C2/DC-11: recordatorio siempre visible bajo la lista anterior, sin
  // afordancia (sin borde, sin chevron, no pulsable) porque D-32 exige
  // detalle para poder tocar y este campo no lo tiene.
  optionsWarningText: string | null
  // Quick 260831-fkb: equivalente de warningDetailText para el aviso de la
  // lista de opciones — null cuando el aviso no tiene consecuencia detallada
  // (misma regla D-32: sin afordancia falsa).
  optionsWarningDetailText: string | null
  // D-01/D-02 de la Fase 6: filas de la rejilla de selección de villano y
  // héroes, ya resueltas por el llamante (forma en línea, sin importar
  // ningún tipo del motor puro — este componente no sabe qué paso es ni
  // consulta ningún id, misma disciplina que `options` de arriba). `null`
  // cuando el paso actual no declara `selection: 'characters'` en los datos.
  selectionRows?: {
    key: string
    label: string
    valueLabel: string
    hasValue: boolean
    ariaLabel: string
  }[] | null
  // SEL-07/D-16: línea de héroe repetido, ya compuesta por el llamante y
  // SIN el glifo `⚠` (lo antepone esta plantilla, igual que las otras dos
  // líneas de aviso del fichero). `null` cuando no hay ningún héroe
  // repetido entre los huecos de jugador.
  duplicateWarningText?: string | null
  // D-08 (Fase 8, VAL-01): sufijo ya formateado (`' (42)'`) que se
  // interpola dentro del MISMO `<p>` de `actionText`, nunca en un `<span>`
  // ni un bloque propio. `null` cuando el paso no declara `value` o el
  // valor no se conoce (VAL-03/D-15): el `<p>` renderiza entonces
  // exactamente el mismo texto que antes de esta fase.
  stepValueSuffix?: string | null
  // D-09/D-10/D-12 (Fase 8, VAL-02): filas «Jugador N · Héroe → número» ya
  // resueltas por el llamante (forma en línea, sin importar ningún tipo
  // del motor — misma disciplina que `selectionRows`). `null` cuando el
  // paso no declara `value` o no hay ninguna fila conocida (VAL-03/D-15):
  // el bloque entero no existe en el DOM, no es que exista vacío.
  stepValueRows?: { key: string, label: string, value: number }[] | null
  // D-07 (quick 260925-mpj): línea ya resuelta por el llamante (join ' · ')
  // para el kind 'encounterSets' — no pulsable (D-32: sin afordancia, es
  // información, no una acción). `null` cuando el paso no declara `value`
  // 'encounterSets' o no hay nada que reunir (sin villano ni módulos).
  stepValueLine?: string | null
}>(), {
  selectionRows: null,
  duplicateWarningText: null,
  stepValueSuffix: null,
  stepValueRows: null,
  stepValueLine: null,
})

const emit = defineEmits<{
  'open-warning-detail': []
  'open-option-detail': [index: number]
  'open-options-warning-detail': []
  'select-row': [key: string]
}>()
</script>

<template>
  <main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
    <div class="w-full max-w-[960px] flex flex-col items-center gap-lg text-center">
      <!-- D-08 (Fase 8, VAL-01): el sufijo va en el MISMO nodo de texto que
           `actionText`, nunca en un `<span>` ni con `text-accent` — el
           paréntesis se lee como parte de la misma frase, no como un dato
           destacado de otro color. Con `stepValueSuffix` null (VAL-03/D-15)
           `?? ''` deja el texto renderizado idéntico, carácter por
           carácter, al de antes de esta fase. -->
      <p class="text-display font-bold text-primary-text">{{ actionText }}{{ stepValueSuffix ?? '' }}</p>

      <!-- D-07 (quick 260925-mpj): línea de conjuntos de encuentro a
           reunir, justo debajo de la frase grande — no pulsable (D-32),
           interpolación de texto, nunca HTML crudo (T-01-01). -->
      <p v-if="stepValueLine" class="text-heading font-bold text-primary-text">{{ stepValueLine }}</p>

      <!-- D-01/D-02 (Fase 6): rejilla de selección de villano/héroes. Fila
           tonta reutilizada literalmente del bloque `options` de abajo
           (mismo `border-b border-accent/50` + chevron), con UNA sola
           diferencia deliberada: aquí es de una única columna
           (`grid-cols-1`, sin `sm:grid-cols-2`) porque D-04 rechaza
           explícitamente 2 columnas para esta rejilla — un nombre de héroe
           no cabe en una columna tan estrecha. No "unificar" este bloque
           con el de `options` de más abajo: son rejillas con reglas de
           ancho distintas a propósito. -->
      <div v-if="selectionRows && selectionRows.length" class="w-full flex flex-col items-center gap-sm">
        <p class="text-label font-bold uppercase text-secondary-text">
          ELECCIÓN
        </p>
        <div class="w-full max-w-[720px] grid grid-cols-1">
          <button
            v-for="row in selectionRows"
            :key="row.key"
            type="button"
            class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left text-body font-normal border-b border-accent/50 transition-transform duration-75 active:brightness-95"
            :aria-label="row.ariaLabel"
            @click="emit('select-row', row.key)"
          >
            <span class="min-w-0 truncate text-primary-text">{{ row.label }}</span>
            <span class="min-w-0 flex-1 text-right truncate" :class="row.hasValue ? 'text-primary-text' : 'text-secondary-text'">
              {{ row.valueLabel }}
            </span>
            <span class="text-accent shrink-0">›</span>
          </button>
        </div>
        <!-- D-16/D-32: aviso de héroe repetido, SIEMPRE un `<p>`, nunca un
             `<button>` — sin borde, sin chevron, sin `@click`, sin
             `cursor-pointer`. Es la misma regla dura ya codificada abajo
             para `optionsWarningText` sin detalle, aplicada aquí verbatim:
             este aviso no tiene detalle que mostrar, así que no puede tener
             afordancia de ningún tipo. -->
        <p v-if="duplicateWarningText" class="text-body font-normal text-warning">
          ⚠ {{ duplicateWarningText }}
        </p>
      </div>

      <!-- D-09/D-10/D-11/D-12/D-32 (Fase 8, VAL-02): lista «Jugador N ·
           Héroe → número», copiando la anatomía de fila de `selectionRows`
           de arriba (mismo `max-w-[720px]`, mismo `border-b
           border-accent/50`, misma jerarquía etiqueta-pequeña/cifra-grande
           que la banda de contadores). D-10: SIN rótulo — la frase grande
           justo encima ya dice qué es la lista, a diferencia de `ELECCIÓN`
           y `Opciones`. D-11: con un solo jugador la lista es de una fila,
           no se colapsa a paréntesis — una sola regla para cualquier
           `playerCount`. D-12: va aquí, entre la frase grande y los avisos
           `⚠`, porque ocupa el mismo hueco que la rejilla `ELECCIÓN` en
           `setup.heroes.01`. D-32: la fila es un `<div>`, NUNCA un
           `<button>` — sin `type="button"`, sin `@click`, sin
           `:aria-label`, sin `active:brightness-95`/`transition-transform`
           y sin el chevron `›` final: no hay acción, así que no hay
           afordancia. No "unificar" con el bloque de `selectionRows` de
           arriba en una revisión futura: esa rejilla SÍ es pulsable, esta
           lista NUNCA lo es. -->
      <div v-if="stepValueRows && stepValueRows.length" class="w-full flex flex-col items-center gap-sm">
        <div class="w-full max-w-[720px] grid grid-cols-1">
          <div
            v-for="stepValueRow in stepValueRows"
            :key="stepValueRow.key"
            class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left border-b border-accent/50"
          >
            <span class="min-w-0 truncate text-body font-normal text-primary-text">{{ stepValueRow.label }}</span>
            <span class="shrink-0 text-heading font-bold text-primary-text">{{ stepValueRow.value }}</span>
          </div>
        </div>
      </div>

      <div v-if="options && options.length" class="w-full flex flex-col items-center gap-sm">
        <p class="text-label font-bold uppercase text-secondary-text">
          Opciones
        </p>
        <div class="w-full max-w-[720px] grid grid-cols-1 sm:grid-cols-2 gap-x-lg">
          <button
            v-for="(option, index) in options"
            :key="option.label"
            type="button"
            class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left text-body font-normal text-primary-text border-b border-accent/50 transition-transform duration-75 active:brightness-95"
            @click="emit('open-option-detail', index)"
          >
            <span>{{ option.label }}</span>
            <span class="text-accent">›</span>
          </button>
        </div>
        <button
          v-if="optionsWarningText && optionsWarningDetailText"
          type="button"
          class="min-h-12 px-md py-sm text-body font-normal text-warning border-b border-warning/50 transition-transform duration-75 active:brightness-95"
          @click="emit('open-options-warning-detail')"
        >
          ⚠ {{ optionsWarningText }} ›
        </button>
        <p v-else-if="optionsWarningText" class="text-body font-normal text-warning">
          ⚠ {{ optionsWarningText }}
        </p>
      </div>

      <button
        v-if="warningText && warningDetailText"
        type="button"
        class="min-h-12 px-md py-sm text-body font-normal text-warning border-b border-warning/50 transition-transform duration-75 active:brightness-95"
        @click="emit('open-warning-detail')"
      >
        ⚠ {{ warningText }} ›
      </button>
      <p v-else-if="warningText" class="text-body font-normal text-warning">
        ⚠ {{ warningText }}
      </p>
    </div>
  </main>
</template>
