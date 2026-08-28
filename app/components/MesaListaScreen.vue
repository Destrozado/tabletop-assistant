<script setup lang="ts">
// Componente tonto (D-03). La lista NO se teclea aquí: llega ya derivada de
// los `summaryLabel` del contenido desde `app/pages/[game]/index.vue`. Header
// propio (no reutiliza AppHeader.vue): el mockup de 01-UI-SPEC.md muestra
// "✓ Mesa lista" en token Heading, distinto del sectionLabel en token Label
// que usa AppHeader — reutiliza en cambio, literalmente, NavBand.vue.
defineProps<{
  checklist: string[]
  sessionContext: string
}>()

const emit = defineEmits<{
  back: []
  start: []
}>()
</script>

<template>
  <div class="h-dvh flex flex-col">
    <header class="h-16 shrink-0 bg-surface flex items-center justify-between px-lg gap-md">
      <h1 class="text-heading font-bold text-primary-text truncate">
        ✓ Mesa lista
      </h1>
      <span class="text-label font-bold text-secondary-text">{{ sessionContext }}</span>
    </header>

    <main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
      <div class="w-full max-w-[960px] flex flex-col gap-lg">
        <p class="text-body font-normal text-primary-text">
          Repasad antes de empezar:
        </p>
        <ul class="flex flex-col gap-md">
          <li
            v-for="(item, index) in checklist"
            :key="index"
            class="text-body font-normal text-primary-text flex gap-sm"
          >
            <span class="text-accent">✓</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>
    </main>

    <NavBand
      next-label="EMPEZAR A JUGAR"
      @back="emit('back')"
      @next="emit('start')"
    />
  </div>
</template>
