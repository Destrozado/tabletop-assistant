// app/composables/useHistorySavedNotice.ts
//
// Superficie visible de D-03 (09-UI-SPEC.md §8): un aviso «Partida
// registrada»/«No se pudo guardar la partida» que se dispara justo antes de
// `navigateTo('/')` en `app/pages/[game]/index.vue` y se pinta en
// `HistorySavedNotice.vue`, montado en `app/app.vue`.
//
// ÚNICA excepción de estado singleton en `app/composables/`, y necesita
// justificación por escrito: quien dispara el aviso (la página de juego) y
// quien lo pinta (la banda montada en app.vue) son dos llamantes distintos
// en dos rutas distintas — un `ref` construido dentro del cuerpo de un
// composable no se comparte entre dos invocaciones de dos componentes
// distintos, así que el aviso nunca se vería si el estado no viviera en el
// ámbito del módulo. Precedente más cercano en el repo: `dismissed` de
// `useUpdatePrompt.ts` SÍ vive dentro de la función (un solo llamante,
// `UpdateBanner.vue`); este fichero es el primero con dos llamantes.
import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'

type NoticeVariant = 'success' | 'failure'

// D-03: «un aviso breve» que no pide ninguna acción se autocierra rápido; el
// de fallo tiene dos frases que hay que poder leer a un brazo de distancia
// desde la mesa, así que se le da mucho más margen. La asimetría es
// intencionada (ver test 3).
export const SUCCESS_AUTO_DISMISS_MS = 6000
export const FAILURE_AUTO_DISMISS_MS = 20000

export function resolveAutoDismissMs(variant: NoticeVariant): number {
  return variant === 'success' ? SUCCESS_AUTO_DISMISS_MS : FAILURE_AUTO_DISMISS_MS
}

// Estado de módulo (ver justificación arriba). `setTimeout` existe igual en
// el entorno `node` de Vitest, así que este fichero es testeable sin jsdom y
// sin contexto de Nuxt (mismo criterio que `useUpdatePrompt.ts`): nada aquí
// toca el almacenamiento del navegador ni el DOM.
const variant = ref<NoticeVariant | null>(null)
let timeoutId: ReturnType<typeof setTimeout> | null = null

function clearPendingTimeout(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

// `saved` viene del booleano que devuelve `appendHistoryEntry` (plan 09-04):
// nunca se asume éxito, la variante la decide ese valor (T-09-06).
export function notifyHistorySaved(saved: boolean): void {
  clearPendingTimeout()

  const nextVariant: NoticeVariant = saved ? 'success' : 'failure'
  variant.value = nextVariant

  timeoutId = setTimeout(() => {
    variant.value = null
    timeoutId = null
  }, resolveAutoDismissMs(nextVariant))
}

// El `✕` manual: retira el aviso de inmediato y cancela cualquier
// temporizador pendiente para que no lo resucite después.
export function dismissHistorySavedNotice(): void {
  clearPendingTimeout()
  variant.value = null
}

export function useHistorySavedNotice(): {
  variant: ComputedRef<NoticeVariant | null>
  dismiss: () => void
} {
  return {
    variant: computed(() => variant.value),
    dismiss: dismissHistorySavedNotice,
  }
}
