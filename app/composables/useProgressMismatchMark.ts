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
// como deuda explícita en el plan 09-36.
//
// CAMBIO DE FONDO (plan 09-38, GREEN del RED→GREEN que empezó el plan
// 09-37): la marca ya NO le pide a sus llamantes que la invaliden en cada
// punto donde su referente podría desaparecer — la ronda 8 de verificación
// (09-VERIFICATION.md) confirmó, por NOVENA vez en esta fase, que enumerar
// los puntos de invalidación es el mecanismo que falla (`onResumeContinue`
// no invalidaba, CR-01). El arreglo de fondo es que la marca transporta,
// junto al `gameId`, la HUELLA (`useStoredProgress.ts`,
// `huellaDelProgreso`) del progreso que había en el dispositivo cuando se
// puso. Leer exige pasar la huella de lo que hay AHORA: sin coincidencia
// estricta, no hay aviso — sin que nadie haya tenido que enumerar el
// camino que sustituyó el referente. El autoguardado, un borrado, una
// edición en DevTools, o un camino que todavía no existe: los tres dan el
// mismo resultado correcto, por construcción del propio mecanismo, no por
// una lista de llamadas a invalidar cada vez más larga.
//
// QUÉ PASA CUANDO LA MARCA NO ESTÁ (párrafo reescrito, plan 09-38: el
// anterior afirmaba en términos absolutos algo que el mecanismo de
// entonces no sostenía). Hay DOS casos distintos, y solo uno de los dos es
// el que la ronda 8 encontró sin contemplar:
// (a) LA MARCA SE PIERDE — una recarga completa del navegador, una pestaña
//     cerrada, o una reescritura del progreso que cambia su huella (el
//     propio autoguardado tras «Continuar», por ejemplo). En este caso el
//     grupo deja de recibir una advertencia que le habría sido útil: es
//     una PÉRDIDA de aviso, evaluada y aceptada por escrito (deuda del
//     plan 09-36, ampliada por la Task 3 del plan 09-40 con el nuevo
//     camino de pérdida que la validación de huella introduce).
// (b) LA MARCA SOBREVIVE a la sustitución de su propio referente y se
//     muestra cuando ya NO corresponde — ese es el caso que CR-01/WR-01
//     confirmaron en la ronda 8, el que el texto anterior no cubría, y el
//     que la validación de huella de este plan hace IMPOSIBLE por
//     construcción: el lector compara la huella guardada con la huella de
//     lo que hay ahora, y sin coincidencia estricta no hay aviso.
// Lo único que este mecanismo demuestra es la comparación de huellas —y
// las dos defensas explícitas de onResumeContinue/onContentChangedAcknowledge—,
// nunca una garantía absoluta sobre todo lo que la app puede o no puede
// llegar a afirmar.
const juegosConProgresoQueNoCoincide = new Map<string, string>()

// Comprobación de respaldo, oración a oración (Task 3, plan 09-33): el
// motivo escrito de una afirmación es lo que 09-VERIFICATION.md (ronda 7)
// encontró falsificado en `failure-stale`, así que aquí se deja explícito y
// comprobable por test — ver useProgressMismatchMark.test.ts, describe
// «PROGRESS_MISMATCH_WARNING — respaldo oración a oración»:
// - «al terminar la última partida de este juego» ← el invariante de esta
//   marca: se pone en el cierre de partida (onOutcomeRecorded) y se retira
//   en cuanto un cierre posterior no encuentra discrepancia o el progreso
//   que describe se borra — nunca se afirma sobre nada más antiguo que eso.
//   RESPALDO REFORZADO (plan 09-38): desde este plan, ya no basta con que
//   alguien haya recordado retirarla — el lector exige además la huella del
//   progreso que hay AHORA (`huellaDelProgreso`, useStoredProgress.ts) y
//   compara con la huella de cuando se puso. Si el progreso ha cambiado por
//   CUALQUIER vía (autoguardado, borrado, edición manual), la huella deja de
//   coincidir y el aviso deja de mostrarse — la afirmación queda respaldada
//   estructuralmente, no solo por la disciplina de invalidación explícita.
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

// Poner la marca es idempotente: `Map.set` sobre una clave ya presente
// SOBRESCRIBE la huella anterior con la nueva (nunca las combina) — es el
// comportamiento correcto: si esta partida se cierra dos veces con
// discrepancia (no debería, pero si ocurriera), la huella que importa es la
// del cierre más reciente, no la del primero. Se llama desde
// `onOutcomeRecorded` (app/pages/[game]/index.vue) en el mismo instante en
// que `planGameEnd` decide que hubo discrepancia.
//
// `huella` es OBLIGATORIO (plan 09-38, no opcional): sin ella, la marca no
// se podría validar más tarde y sería otra afirmación sin respaldo — por
// eso `app/pages/[game]/index.vue` solo llama a esta función cuando
// `huellaDelProgreso` pudo calcularse (ver el comentario de
// `onOutcomeRecorded` para el caso, inalcanzable en el escenario canónico,
// en el que no se pudo).
export function markProgressMismatch(gameId: string, huella: string): void {
  juegosConProgresoQueNoCoincide.set(gameId, huella)
}

// Retirar una marca que no existe no lanza (`Map.delete` devuelve `false`
// en silencio, igual que hacía `Set.delete`). La firma NO cambia en este
// plan (plan 09-38, Task 2 amplía las llamadas, no esta función): se llama
// desde `onOutcomeRecorded` (un cierre posterior de la misma partida que NO
// encuentra discrepancia), desde `onDiscardConfirm`/`finishGame` (los dos
// sitios que borran el progreso guardado) y, desde este plan, TAMBIÉN desde
// `onResumeContinue` y `onContentChangedAcknowledge` (CR-01/WR-01: la
// SEGUNDA defensa, independiente de la validación de huella de más abajo)
// — en los cinco casos la marca deja de tener referente, y afirmar algo con
// ella seguiría siendo hacer una afirmación, esta vez ya falsa.
export function clearProgressMismatch(gameId: string): void {
  juegosConProgresoQueNoCoincide.delete(gameId)
}

// Devuelve el texto exacto SOLO si se cumplen las TRES condiciones: (1) hay
// una entrada para este `gameId`, (2) `huellaActual` no es `null` — sin
// poder huellar lo que hay ahora, no se puede afirmar que siga siendo lo
// mismo que cuando se puso la marca — y (3) esa huella coincide, por
// comparación ESTRICTA (`===`), con la huella guardada. `null` en cualquier
// otro caso, incluida una recarga completa de la página, que vacía este
// módulo entero: es la forma ejecutable de la limitación documentada
// arriba.
//
// `huellaActual` es OBLIGATORIO (plan 09-38, no opcional): un lector que
// pudiera omitirlo volvería a ser el lector de un solo argumento que CR-01
// explotaba — el gate de invariantes (`invariantesDeMarcaDeEstado.test.ts`,
// Pata 1) lo exige por construcción.
export function readProgressMismatchWarning(gameId: string, huellaActual: string | null): string | null {
  if (huellaActual === null) return null
  const huellaGuardada = juegosConProgresoQueNoCoincide.get(gameId)
  return huellaGuardada !== undefined && huellaGuardada === huellaActual ? PROGRESS_MISMATCH_WARNING : null
}
