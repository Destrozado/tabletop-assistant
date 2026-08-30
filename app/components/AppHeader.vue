<script setup lang="ts">
// Componente tonto: recibe props, emite eventos, no importa nada del motor
// puro ni de los composables (ARCHITECTURE.md §3/§5).
defineProps<{
  sectionLabel: string
  position: { current: number, total: number } | null
  sessionContext: string
  voiceState: 'on' | 'muted' | 'unavailable'
}>()

const emit = defineEmits<{
  'index-open': []
  'voice-toggle': []
}>()
</script>

<template>
  <header class="h-16 shrink-0 bg-surface flex items-center justify-between px-lg gap-md">
    <div class="min-w-0 flex-1 text-label font-bold text-primary-text truncate">
      {{ sectionLabel }}<template v-if="position"> · {{ position.current }} de {{ position.total }}</template>
    </div>

    <!--
      Zona derecha: contenedor flex que admite MÁS de dos hijos — la Fase 3
      insertará aquí el icono de silencio (VOZ-02) sin reorganizar el layout.
      shrink-0: nunca se encoge, aunque la etiqueta compuesta de la izquierda
      (p. ej. "RONDA 4 · Villano · 3 de 6") sea más larga que la de la
      preparación (D-11/T-02-06 — solo `min-w-0 flex-1` en la izquierda
      permite que `truncate` recorte en vez de comprimir esta zona).
    -->
    <div class="shrink-0 flex items-center gap-md">
      <span class="text-label font-bold text-secondary-text">{{ sessionContext }}</span>
      <!-- Control de silencio de 3 estados (VOZ-02, D-48/D-49). Componente
           tonto: solo pinta según la prop voiceState y emite voice-toggle;
           quien decide el estado es useVoiceAnnouncer, en la página. -->
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center"
        :class="voiceState === 'on'
          ? 'text-primary-text active:brightness-95'
          : voiceState === 'muted'
            ? 'text-secondary-text active:brightness-95'
            : 'text-secondary-text opacity-40'"
        :disabled="voiceState === 'unavailable'"
        :aria-label="voiceState === 'on'
          ? 'Silenciar voz'
          : voiceState === 'muted'
            ? 'Activar voz'
            : 'Voz no disponible en este dispositivo'"
        @click="emit('voice-toggle')"
      >
        <svg v-if="voiceState === 'on'" viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 9H7L11 5V19L7 15H4V9Z" fill="currentColor" />
          <path
            d="M14.5 8.5C15.5 9.5 16 10.7 16 12C16 13.3 15.5 14.5 14.5 15.5"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
          />
          <path
            d="M17 6C18.9 7.9 20 10 20 12C20 14 18.9 16.1 17 18"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 9H7L11 5V19L7 15H4V9Z" fill="currentColor" />
          <path d="M15 9L20 15M20 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <button
        type="button"
        class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
        aria-label="Abrir índice"
        @click="emit('index-open')"
      >
        ≡
      </button>
    </div>
  </header>
</template>
