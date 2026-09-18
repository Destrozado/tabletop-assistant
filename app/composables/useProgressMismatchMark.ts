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

// Comprobación de respaldo, oración a oración (Task 3, plan 09-33): el
// motivo escrito de una afirmación es lo que 09-VERIFICATION.md (ronda 7)
// encontró falsificado en `failure-stale`, así que aquí se deja explícito y
// comprobable por test — ver useProgressMismatchMark.test.ts, describe
// «PROGRESS_MISMATCH_WARNING — respaldo oración a oración»:
// - «al terminar la última partida de este juego» ← el invariante de esta
//   marca: se pone en el cierre de partida (onOutcomeRecorded) y se retira
//   en cuanto un cierre posterior no encuentra discrepancia o el progreso
//   que describe se borra — nunca se afirma sobre nada más antiguo que eso.
// - «la app no pudo registrarla» ← la marca solo se pone cuando el
//   histórico no llegó a escribirse (GameEndPlan.progressMismatch exige
//   historyRecorded === false).
// - «comprobó que lo que había guardado no era el punto en el que habíais
//   terminado» ← la comparación de posiciones de la autoridad de lectura
//   del progreso devolvió que no coinciden. Se dice «el punto», que es
//   justo lo que esa comparación representa, y no se dice qué campo
//   difirió, que es lo que esa comparación no sabe identificar.
// - «Puede que…», «podría…» ← forma modal a propósito: el histórico solo
//   registra un subconjunto pequeño de campos (ronda y contexto), así que
//   cuando la única diferencia real está en otro campo, la entrada
//   resultante podría ser idéntica a la de la partida real — afirmarlo con
//   certeza sería otra afirmación sin respaldo, la misma clase de defecto
//   que esta fase lleva ocho caras cerrando.
// - No contiene «anterior»: no hay ningún orden temporal comprobado. No
//   contiene «la ronda» ni ninguna mención al campo que difirió: la
//   comparación no lo sabe identificar. No ordena ningún «reintentar»:
//   este aviso informa, no instruye — las tres, prohibidas por aserción
//   negativa en el test.
export const PROGRESS_MISMATCH_WARNING = 'Aviso: al terminar la última partida de este juego, la app no pudo registrarla y comprobó que lo que había guardado no era el punto en el que habíais terminado. Puede que esta partida no sea la que terminasteis: si la continuáis y la registráis, el histórico podría quedar con datos que no son los de aquella partida.'

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
