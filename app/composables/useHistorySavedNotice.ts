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
// Import de SOLO TIPO (plan 09-26, cierre del BLOCKER de la ronda 5): la
// dependencia va en UNA sola dirección — este fichero conoce la forma que
// produce la autoridad de lectura del progreso, pero `useStoredProgress.ts`
// no sabe que existe ningún aviso. No hay ciclo en tiempo de ejecución
// porque el tipo desaparece al compilar.
import type { StoredProgress } from '~/composables/useStoredProgress'

export type NoticeVariant = 'success' | 'failure-recoverable' | 'failure-unrecoverable' | 'failure-unknown'

// D-03: «un aviso breve» que no pide ninguna acción se autocierra rápido; el
// de fallo tiene dos frases que hay que poder leer a un brazo de distancia
// desde la mesa, así que se le da mucho más margen. La asimetría es
// intencionada (ver test 3). Las TRES variantes de fallo comparten la misma
// duración larga — `failure-unknown` no es menos seria que las otras dos.
export const SUCCESS_AUTO_DISMISS_MS = 6000
export const FAILURE_AUTO_DISMISS_MS = 20000

export function resolveAutoDismissMs(variant: NoticeVariant): number {
  return variant === 'success' ? SUCCESS_AUTO_DISMISS_MS : FAILURE_AUTO_DISMISS_MS
}

// CIERRE DEL BLOCKER DE LA RONDA 5 (09-VERIFICATION.md, plan 09-26): el
// segundo argumento deja de ser un booleano de ESCRITURA (lo que devolvía
// `save()`) y pasa a ser la respuesta de una LECTURA real del dispositivo
// (`StoredProgress`, producida únicamente por `readStoredProgress` del plan
// 09-25). Confundir las dos preguntas — «¿ha funcionado esta escritura?»
// frente a «¿qué hay ahora mismo guardado?» — es exactamente lo que produjo
// la copy `failure-unrecoverable` («no hay nada que reintentar») mientras
// `ResumePrompt` seguía ofreciendo «Continuar» para la misma partida. Desde
// el plan 09-24 esta prohibición es comprobable de verdad: pasar un
// `boolean` en esta posición hace fallar `npm run typecheck`, no una promesa
// en un comentario.
//
// Tabla TOTAL sobre los tres valores de `StoredProgress`, sin ninguna rama
// más:
// - `historyRecorded === true` → 'success' (el histórico ya está escrito;
//   el estado del progreso es irrelevante porque no hay nada que
//   reintentar).
// - `stored === 'resumable'` → 'failure-recoverable'.
// - `stored === 'absent'` → 'failure-unrecoverable'.
// - `stored === 'unknown'` → 'failure-unknown'.
export function resolveNoticeVariant(historyRecorded: boolean, stored: StoredProgress): NoticeVariant {
  if (historyRecorded) return 'success'
  if (stored === 'resumable') return 'failure-recoverable'
  if (stored === 'absent') return 'failure-unrecoverable'
  return 'failure-unknown'
}

// GameEndPlan/planGameEnd (plan 09-26, cierre de WR-09 de `09-REVIEW.md`):
// la secuencia de fin de partida vivía repartida en cuatro líneas de una
// plantilla que ningún test podía ejecutar. Esta función existe para
// garantizar DOS cosas:
// (a) lo que se le dice al grupo (`variant`) y lo que se conserva en el
//     dispositivo (`preserveProgress`) se deciden en el MISMO sitio, así
//     que no pueden divergir nunca — la costura exacta que separó las dos
//     preguntas en la ronda 5.
// (b) `preserveProgress` NO depende de `stored` a propósito: «no borrar» es
//     siempre el lado seguro. Si el borrado dependiera de una lectura, una
//     lectura equivocada (o un `'unknown'` genuino) podría destruir datos
//     que en realidad seguían ahí. Por eso `preserveProgress` solo mira
//     `historyRecorded`, igual que hacía ya el `finishGame(!guardado)`
//     anterior a este plan.
export interface GameEndPlan {
  variant: NoticeVariant
  preserveProgress: boolean
}

export function planGameEnd(historyRecorded: boolean, stored: StoredProgress): GameEndPlan {
  return {
    variant: resolveNoticeVariant(historyRecorded, stored),
    preserveProgress: !historyRecorded,
  }
}

// Estado de módulo (ver justificación arriba). `setTimeout` existe igual en
// el entorno `node` de Vitest, así que este fichero es testeable sin jsdom y
// sin contexto de Nuxt (mismo criterio que `useUpdatePrompt.ts`): nada aquí
// toca el almacenamiento del navegador ni el DOM.
const activeVariant = ref<NoticeVariant | null>(null)
let timeoutId: ReturnType<typeof setTimeout> | null = null

function clearPendingTimeout(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

// Copy de las cuatro variantes, exportada como dato en vez de vivir suelta en
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
  'failure-unknown': '⚠ No se pudo guardar la partida',
}

// `failure-unrecoverable` NO contiene la promesa de presencia ni la
// instrucción de reintento de `failure-recoverable`: en ese estado la
// partida ya no existe en el dispositivo, y volver a entrar en el juego
// lleva al mini-setup, así que esa instrucción sería imposible de seguir
// (tercer punto de `missing:` de CR-01 ronda 4).
//
// `failure-unrecoverable` (reescrito en el plan 09-26, cierre del BLOCKER de
// la ronda 5): el texto anterior afirmaba algo sobre la ESCRITURA («tampoco
// se ha podido conservar…»), que no es lo que la autoridad de lectura mide.
// El texto nuevo afirma exactamente lo que `readStoredProgress` ha
// comprobado — que al volver a entrar aparece el mini-setup — ni una
// palabra más.
//
// `failure-unknown` (nueva en el plan 09-26): existe porque un fallo de
// LECTURA no autoriza a afirmar ni presencia (ronda 4) ni ausencia (ronda
// 5) del progreso. La única frase honesta es decir que no se ha podido
// comprobar y explicar cómo lo comprueba el grupo con sus propios ojos al
// volver a entrar en el juego.
export const NOTICE_BODY: Record<NoticeVariant, string | null> = {
  'success': null,
  'failure-recoverable': 'La partida no se ha perdido: sigue guardada en el dispositivo. Volved a entrar en ella y pulsad «Partida terminada» otra vez para reintentar el registro. Si vuelve a fallar, puede deberse al modo privado del navegador, a la memoria llena, o a un histórico anterior que la app no consigue leer.',
  'failure-unrecoverable': 'Al volver a entrar en el juego no encontraréis esta partida, así que esta vez no hay nada que reintentar. Suele deberse al modo privado del navegador o a la memoria llena: revisadlo antes de la próxima partida.',
  'failure-unknown': 'No hemos podido comprobar si la partida sigue en el dispositivo. Volved a entrar en el juego: si os ofrece continuar, pulsad «Partida terminada» otra vez para reintentar el registro; si os pide jugadores y dificultad, esa partida ya no está.',
}

// `notifyHistorySaved` recibe la variante YA decidida, en vez de decidirla:
// desde el plan 09-26 la única decisión de fin de partida vive en
// `planGameEnd`, que es la que consulta la autoridad de lectura. La app
// tiene un único productor de `NoticeVariant` fuera de los tests
// (`planGameEnd`, invocado desde `app/pages/[game]/index.vue`); escribir
// aquí una variante a mano en vez de obtenerla de `planGameEnd` es
// exactamente el gesto que el gate de clase (`afirmacionesRespaldadas.test.ts`)
// persigue.
export function notifyHistorySaved(variant: NoticeVariant): void {
  clearPendingTimeout()

  activeVariant.value = variant

  timeoutId = setTimeout(() => {
    activeVariant.value = null
    timeoutId = null
  }, resolveAutoDismissMs(variant))
}

// El `✕` manual: retira el aviso de inmediato y cancela cualquier
// temporizador pendiente para que no lo resucite después.
export function dismissHistorySavedNotice(): void {
  clearPendingTimeout()
  activeVariant.value = null
}

export function useHistorySavedNotice(): {
  variant: ComputedRef<NoticeVariant | null>
  heading: ComputedRef<string | null>
  body: ComputedRef<string | null>
  dismiss: () => void
} {
  return {
    variant: computed(() => activeVariant.value),
    heading: computed(() => (activeVariant.value === null ? null : NOTICE_HEADING[activeVariant.value])),
    body: computed(() => (activeVariant.value === null ? null : NOTICE_BODY[activeVariant.value])),
    dismiss: dismissHistorySavedNotice,
  }
}
