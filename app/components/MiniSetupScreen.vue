<script setup lang="ts">
// Componente tonto: no importa nada del motor ni de los composables
// (ARCHITECTURE.md §3/§5). El único estado deshabilitado legítimo de la fase
// vive aquí (01-UI-SPEC §Interaction & State Coverage): el CTA de confirmación
// hasta que ambos campos estén elegidos.
import { computed, ref } from 'vue'

const props = defineProps<{
  playerCount: number | null
  difficulty: 'normal' | 'expert' | null
  gameTitle: string
}>()

const emit = defineEmits<{
  'update:playerCount': [value: number]
  'update:difficulty': [value: 'normal' | 'expert']
  confirm: []
  back: []
}>()

const canConfirm = computed(() => props.playerCount !== null && props.difficulty !== null)

const ctaPressed = ref(false)

function onConfirmClick() {
  if (!canConfirm.value) return
  emit('confirm')
}
</script>

<template>
  <div class="h-dvh bg-background flex flex-col">
    <header class="h-16 shrink-0 bg-surface flex items-center px-lg">
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none"
        aria-label="Volver al selector de juego"
        @click="emit('back')"
      >
        ‹
      </button>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center gap-2xl px-2xl overflow-y-auto">
      <h1 class="text-heading font-bold text-primary-text text-center">
        {{ gameTitle }} — Preparar partida
      </h1>

      <div class="w-full max-w-[640px] flex flex-col gap-xl">
        <div class="flex flex-col gap-md">
          <span class="text-label font-bold text-primary-text">Nº de jugadores</span>
          <div class="flex gap-md">
            <button
              v-for="n in [1, 2, 3, 4]"
              :key="n"
              type="button"
              class="flex-1 min-h-12 min-w-12 flex items-center justify-center text-label font-bold"
              :class="playerCount === n ? 'bg-accent text-on-accent' : 'bg-surface text-primary-text'"
              @click="emit('update:playerCount', n)"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-md">
          <span class="text-label font-bold text-primary-text">Dificultad</span>
          <div class="flex gap-md">
            <button
              type="button"
              class="flex-1 min-h-12 flex items-center justify-center text-label font-bold"
              :class="difficulty === 'normal' ? 'bg-accent text-on-accent' : 'bg-surface text-primary-text'"
              @click="emit('update:difficulty', 'normal')"
            >
              Normal
            </button>
            <button
              type="button"
              class="flex-1 min-h-12 flex items-center justify-center text-label font-bold"
              :class="difficulty === 'expert' ? 'bg-accent text-on-accent' : 'bg-surface text-primary-text'"
              @click="emit('update:difficulty', 'expert')"
            >
              Experto
            </button>
          </div>
        </div>
      </div>
    </main>

    <footer class="h-24 shrink-0 bg-surface flex items-center justify-end px-lg">
      <button
        type="button"
        class="h-14 px-2xl flex items-center justify-center gap-xs text-label font-bold transition-transform duration-75"
        :class="canConfirm
          ? (ctaPressed ? 'bg-accent text-on-accent brightness-95 scale-[0.98]' : 'bg-accent text-on-accent')
          : 'opacity-40 text-primary-text cursor-default'"
        :disabled="!canConfirm"
        @mousedown="canConfirm && (ctaPressed = true)"
        @touchstart="canConfirm && (ctaPressed = true)"
        @mouseup="ctaPressed = false"
        @touchend="ctaPressed = false"
        @click="onConfirmClick"
      >
        EMPEZAR PREPARACIÓN ›
      </button>
    </footer>
  </div>
</template>
