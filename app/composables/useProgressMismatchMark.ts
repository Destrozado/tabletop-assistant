// app/composables/useProgressMismatchMark.ts
//
// Transporta en el tiempo un hecho que la app ya comprobó al terminar una
// partida (plan 09-33, cierre del tercer hallazgo de SC3 en
// `09-VERIFICATION.md` ronda 7): que lo que ha quedado guardado en el
// dispositivo no corresponde al punto en el que el grupo acaba de terminar.
// `planGameEnd` (useHistorySavedNotice.ts) es quien decide ESE hecho, en el
// mismo sitio donde ya decide todo lo demás sobre el fin de partida; este
// fichero solo lo transporta hasta el instante en que vuelve a importar: el
// modal de reanudación, la próxima vez que el grupo entre en el mismo
// juego.
//
// `onMounted` (app/pages/[game]/index.vue) comprueba el dispositivo SIN
// ninguna sesión con la que comparar — correcto y documentado allí: al
// montar no hay ninguna partida recién terminada. Por eso la comparación
// que respalda el aviso de este fichero es estructuralmente inalcanzable en
// el montaje: solo el CIERRE de una partida anterior pudo haberla hecho.
// Sin este fichero, ese conocimiento se perdería entre el cierre y el
// siguiente montaje.
//
// SEGUNDA excepción de estado de módulo en app/composables/ — la primera es
// useHistorySavedNotice.ts, que documenta el mismo razonamiento por
// extenso y a la que se cita aquí en vez de repetirla entera: quien pone la
// marca (el cierre de la partida anterior, en una invocación de
// app/pages/[game]/index.vue) y quien la lee (el montaje de la MISMA
// página, en una invocación distinta, tras pasar por /) son dos llamadas
// separadas al mismo componente. Un `ref` creado dentro del cuerpo de un
// composable no sobrevive entre invocaciones distintas; solo el estado de
// módulo lo hace.
//
// POR QUÉ NO SE ESCRIBE EN EL ALMACENAMIENTO PERSISTENTE DEL NAVEGADOR: el
// aviso de este fichero solo puede activarse cuando dos escrituras seguidas
// YA han fallado — el registro en el histórico y, además, el guardado de
// cierre (si el guardado hubiera funcionado, lo que habría en el
// dispositivo sería exactamente la partida que termina, y no habría nada
// que avisar). Una tercera escritura justo en ese instante sería la
// operación menos fiable de todo el sistema, y una marca que no se puede
// escribir en su propio escenario no es una mitigación: es otra afirmación
// sin respaldo. El estado de módulo, en cambio, sobrevive a la navegación
// de cliente real del grupo — el recorrido juego → inicio → juego no
// recarga la página (SPA tras la hidratación del prerender de Nuxt; ver el
// SUMMARY de este plan para cómo se comprobó) — sin escribir nada en el
// dispositivo. Lo que NO sobrevive es una recarga completa del navegador:
// esa es la limitación que este fichero acepta por escrito, registrada
// como deuda explícita en el plan 09-36. Cuando la marca no está, esta app
// no afirma nada — nunca afirma algo falso.
const juegosConProgresoQueNoCoincide = new Set<string>()

// PROGRESS_MISMATCH_WARNING lleva aquí un texto PROVISIONAL (GREEN de la
// Task 1 de 09-33-PLAN.md): basta con declararlo y usarlo para que el
// camino completo funcione de extremo a extremo. El texto DEFINITIVO, con
// su comprobación de respaldo oración a oración contra 09-VERIFICATION.md
// ronda 7, lo fija la Task 3 de este mismo plan mediante su propio ciclo
// RED → GREEN.
export const PROGRESS_MISMATCH_WARNING = 'Aviso: la última partida de este juego no pudo registrarse correctamente. (Texto provisional, pendiente de la Task 3 de 09-33-PLAN.md.)'

// Poner la marca es idempotente: `Set.add` sobre una clave ya presente no
// duplica nada. Se llama desde `onOutcomeRecorded`
// (app/pages/[game]/index.vue) en el mismo instante en que `planGameEnd`
// decide que hubo discrepancia.
export function markProgressMismatch(gameId: string): void {
  juegosConProgresoQueNoCoincide.add(gameId)
}

// Retirar una marca que no existe no lanza (`Set.delete` devuelve `false`
// en silencio). Se llama desde tres puntos de app/pages/[game]/index.vue:
// un cierre posterior de la misma partida que NO encuentra discrepancia, y
// los dos sitios que borran el progreso guardado (`finishGame`,
// `onDiscardConfirm`) — en los tres casos la marca deja de tener referente,
// y afirmar algo con ella seguiría siendo hacer una afirmación, esta vez ya
// falsa.
export function clearProgressMismatch(gameId: string): void {
  juegosConProgresoQueNoCoincide.delete(gameId)
}

// Devuelve el texto exacto si hay una marca puesta para este juego, o
// `null` en cualquier otro caso — incluida una recarga completa de la
// página, que vacía este módulo entero: es la forma ejecutable de la
// limitación documentada arriba.
export function readProgressMismatchWarning(gameId: string): string | null {
  return juegosConProgresoQueNoCoincide.has(gameId) ? PROGRESS_MISMATCH_WARNING : null
}
