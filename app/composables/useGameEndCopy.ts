// app/composables/useGameEndCopy.ts
//
// Copy del diálogo de fin de partida y del descarte de progreso (plan
// 09-32, Task 2): `09-VERIFICATION.md` (ronda 7) encontró que `endGameBody`
// prometía «la app conservará el progreso para que podáis reintentarlo»
// ANTES de que la app hubiera leído el dispositivo, y que el motivo escrito
// que la auditaba en `app/pages/[game]/index.vue` afirmaba «es cierto en
// las cuatro salidas» — un motivo FALSO sellando un hueco: la promesa era
// falsa en 2 de los 4 estados del dispositivo (sin nada reanudable: el aviso
// posterior dice que no hay nada que reintentar; con un autoguardado que no
// coincide con el punto de fin de partida: el aviso posterior deliberadamente
// NO ordena el reintento, plan 09-32 Task 1).
//
// La copy sobre datos persistidos del grupo vive desde ahora en un `.ts`
// con test puro —mismo criterio que `NOTICE_BODY` (`useHistorySavedNotice.ts`)
// y `UNVERIFIED_PROGRESS_NOTICE` (`useProgressMountPlan.ts`)— porque el
// proyecto `app-logic` de Vitest no monta componentes, y un literal dentro
// del SFC no puede tener test.

// discardBody: `onDiscardConfirm` (`app/pages/[game]/index.vue`) llama a
// `clear(gameId)` de forma INCONDICIONAL, así que «se borrará» es cierto
// siempre que este texto se muestra — no hay rama en la que no ocurra.
// Trasladado íntegro desde el `computed` que lo justificaba antes de este
// plan, sin cambiar ni un carácter del texto.
export function buildDiscardBody(savedSummary: string): string {
  return `Se borrará el progreso guardado de la partida en curso (${savedSummary}). Esta acción no se puede deshacer.`
}

// buildEndGameBody: comprobación de veracidad rama por rama de las CUATRO
// salidas de `<GameOutcomeDialog>` — la corrección del motivo FALSO que
// `09-VERIFICATION.md` (ronda 7) señala en `app/pages/[game]/index.vue`:
//
// - «Salir sin registrar» → `onOutcomeDismiss` → `finishGame()` sin
//   argumento → `preserveProgress` es `false` → SE BORRA. Cierta.
// - Registro con éxito → `planGameEnd(true, stored).preserveProgress` es
//   `false` (`!historyRecorded`) → SE BORRA. Cierta.
// - Registro fallido, en CUALQUIERA de los cuatro estados del dispositivo →
//   `planGameEnd(false, stored).preserveProgress` es `true` → NO SE BORRA,
//   y `notifyHistorySaved(plan.variant)` se invoca siempre en esa misma
//   rama, así que el grupo siempre recibe el aviso correspondiente. Cierta.
//
// Qué se ha retirado y por qué: la promesa de poder REINTENTAR no la
// respalda `preserveProgress` —que solo mira `historyRecorded`— sino el
// estado del dispositivo, que en el punto donde este texto se COMPONE
// (antes de pulsar «Partida terminada») todavía no se ha leído. Es falsa
// cuando ese estado resulta ser el de "no queda nada que reintentar"
// (`NOTICE_BODY['failure-unrecoverable']`) o el de "hay un autoguardado que
// no coincide con el punto de fin de partida" (el reintento es justo lo que
// la variante `failure-stale` de la Task 1 de este mismo plan NO ordena).
// La única promesa que este texto puede hacer con certeza es
// la que `preserveProgress` garantiza de verdad: que el progreso no se
// borrará si el registro falla, sea cual sea el estado del dispositivo.
export function buildEndGameBody(savedSummary: string): string {
  return `El progreso guardado de esta partida (${savedSummary}) se borrará y volveréis a la pantalla de inicio. Si el registro en el histórico falla, el progreso no se borrará y la app os avisará.`
}
