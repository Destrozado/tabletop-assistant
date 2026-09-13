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

export type NoticeVariant = 'success' | 'failure-recoverable' | 'failure-unrecoverable'

// D-03: «un aviso breve» que no pide ninguna acción se autocierra rápido; el
// de fallo tiene dos frases que hay que poder leer a un brazo de distancia
// desde la mesa, así que se le da mucho más margen. La asimetría es
// intencionada (ver test 3).
export const SUCCESS_AUTO_DISMISS_MS = 6000
export const FAILURE_AUTO_DISMISS_MS = 20000

export function resolveAutoDismissMs(variant: NoticeVariant): number {
  return variant === 'success' ? SUCCESS_AUTO_DISMISS_MS : FAILURE_AUTO_DISMISS_MS
}

// CR-01 (ronda 4, 09-VERIFICATION.md): cada variante corresponde a una
// combinación de valores de retorno REALES; ninguna afirmación del aviso
// puede existir sin el booleano que la respalda. `historyRecorded` es lo
// que devuelve `record()` (appendHistoryEntry); `progressSecured` es lo que
// devuelve `save()` (plan 09-18) — solo se mira cuando el histórico falló,
// porque si el histórico se escribió no hay nada que reintentar.
export function resolveNoticeVariant(historyRecorded: boolean, progressSecured: boolean): NoticeVariant {
  if (historyRecorded) return 'success'
  return progressSecured ? 'failure-recoverable' : 'failure-unrecoverable'
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

// Copy de las tres variantes, exportada como dato en vez de vivir suelta en
// `HistorySavedNotice.vue`: es la afirmación que la app le hace al grupo
// sobre sus propios datos, y una afirmación así tiene que ser comprobable
// por un test puro — precedente del repo: `emptyTitle`/`emptyBody` de
// `statisticsView` en `useGameHistory.ts` ya calculan copy visible fuera del
// componente. Tener el texto suelto en la plantilla es lo que permitió que
// 09-16 introdujera una promesa sobre el dispositivo sin respaldo (CR-01
// ronda 4) sin que ningún test se enterara.
export const NOTICE_HEADING: Record<NoticeVariant, string> = {
  'success': '✓ Partida registrada',
  'failure-recoverable': '⚠ No se pudo guardar la partida',
  'failure-unrecoverable': '⚠ No se pudo guardar la partida',
}

// `failure-unrecoverable` NO contiene "sigue guardada" ni la instrucción
// "pulsad «Partida terminada» otra vez": en ese estado la partida ya no
// existe en el dispositivo, y volver a entrar en el juego lleva al
// mini-setup, así que esa instrucción sería imposible de seguir (tercer
// punto de `missing:` de CR-01 ronda 4).
export const NOTICE_BODY: Record<NoticeVariant, string | null> = {
  'success': null,
  'failure-recoverable': 'La partida no se ha perdido: sigue guardada en el dispositivo. Volved a entrar en ella y pulsad «Partida terminada» otra vez para reintentar el registro. Si vuelve a fallar, puede deberse al modo privado del navegador, a la memoria llena, o a un histórico anterior que la app no consigue leer.',
  'failure-unrecoverable': 'Tampoco se ha podido conservar la partida en el dispositivo, así que esta vez no hay nada que reintentar. Suele deberse al modo privado del navegador o a la memoria llena: revisadlo antes de la próxima partida.',
}

// `historyRecorded` viene del booleano que devuelve `appendHistoryEntry`
// (plan 09-04) vía `record()`; `progressSecured` viene del booleano que
// devuelve `save()` (plan 09-18). Ninguno de los dos se asume: la variante
// la deciden esos dos valores de retorno reales (CR-01 ronda 4).
export function notifyHistorySaved(historyRecorded: boolean, progressSecured: boolean): void {
  clearPendingTimeout()

  const nextVariant = resolveNoticeVariant(historyRecorded, progressSecured)
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
  heading: ComputedRef<string | null>
  body: ComputedRef<string | null>
  dismiss: () => void
} {
  return {
    variant: computed(() => variant.value),
    heading: computed(() => (variant.value === null ? null : NOTICE_HEADING[variant.value])),
    body: computed(() => (variant.value === null ? null : NOTICE_BODY[variant.value])),
    dismiss: dismissHistorySavedNotice,
  }
}
