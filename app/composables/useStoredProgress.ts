// app/composables/useStoredProgress.ts
// La AUTORIDAD de lectura del progreso guardado (CR-01 ronda 5,
// `09-VERIFICATION.md`).
//
// La pregunta que este fichero contesta, literalmente: «si el grupo vuelve a
// entrar en este juego, ¿encontrará esta partida para poder reintentar el
// registro?». `readStoredProgress` es la ÚNICA función con autoridad para
// contestarla — cualquier frase de la interfaz sobre el progreso guardado del
// grupo tiene que salir de aquí, nunca deducirse por su cuenta.
//
// Esta función NUNCA infiere el estado del dispositivo a partir del valor de
// retorno de una escritura. `save()` (en `usePersistedSession.ts`) contesta
// «¿ha funcionado ESTA escritura?»; eso es una pregunta distinta. Confundir
// las dos es exactamente el BLOCKER de la ronda 5: la copy
// `failure-unrecoverable` («no hay nada que reintentar») afirmaba algo sobre
// el dispositivo apoyándose en un booleano que solo hablaba de una escritura
// — y es la quinta cara del mismo defecto que las rondas 1-4 ya cerraron en
// el motor (`resume`, ronda 3) y en la capa de almacenamiento
// (`readEnvelope`, ronda 3; `readProgress`, ronda 5).
//
// Por eso esta función llama a `resume()` del motor en vez de reimplementar
// su regla: el aviso de fin de partida y el `ResumePrompt` del montaje tienen
// que obtener su respuesta de la MISMA llamada a la MISMA función — si cada
// uno decidiera por su cuenta, podrían volver a contradecirse, que es
// literalmente lo que el BLOCKER de la ronda 5 describe (el aviso dice «no
// hay nada» y `ResumePrompt` ofrece «Continuar» para el mismo juego).
//
// Igual que `usePersistedSession.ts` documenta de sí mismo: este fichero NO
// es reactivo pese a vivir en `app/composables/` — no devuelve refs ni
// computeds, es una función imperativa que se llama y devuelve un resultado.
import { resume, toPersistedPosition } from '~~/engine/persistence'
import type { PersistedPosition, ResumeOutcome } from '~~/engine/persistence'
import { expand } from '~~/engine/expand'
import type { EngineSession, GameDefinition, SessionContext } from '~~/engine/types'
import { usePersistedSession } from './usePersistedSession'

// Cuatro respuestas posibles a la pregunta de arriba, y ninguna más:
//
// - 'resumable': sí, con certeza — la app le ofrecerá esa partida al volver a
//   entrar (reanudada, o con el aviso de contenido cambiado), y esa partida
//   ES la que se pasó como `esperada` (o no se pasó ninguna).
// - 'stale' (plan 09-28, séptima cara del defecto de esta fase): hay algo
//   reanudable en el dispositivo, pero NO es la partida que se pasó como
//   `esperada` — otro `runtimeId`, otra `round` o otro `context`. Solo puede
//   producirse cuando se llama con `esperada`: sin ese segundo argumento no
//   hay nada con qué comparar. Afirmar «esta partida sigue guardada» sobre
//   ese «algo» es exactamente lo que `NOTICE_BODY['failure-recoverable']`
//   hacía sin comprobarlo (Gap #1 de la ronda 6, `09-VERIFICATION.md`): el
//   reintento que esa frase ordena pasa por `ResumePrompt` → «Partida
//   terminada» → `record()` → `buildHistoryEntry`, que leería la `round` y
//   el `context` (héroes/villano) de ese autoguardado ANTERIOR, no los de la
//   partida que acaba de terminar — y el histórico es el único dato
//   irreconstruible de la app (D-13).
// - 'absent': no, con certeza — se ha leído el dispositivo correctamente y lo
//   que hay allí no produce ninguna partida que ofrecer; al volver a entrar
//   aparece el mini-setup.
// - 'unknown': no se puede contestar — la lectura del dispositivo ha
//   fallado. Este valor existe porque NO puede plegarse sobre ninguno de los
//   otros tres: plegarlo sobre 'absent' autoriza a afirmar una ausencia no
//   comprobada (la cara del defecto de la ronda 5) y plegarlo sobre
//   'resumable' autoriza a afirmar una presencia no comprobada (la de la
//   ronda 4). Distinguir un estado propio impide ambas.
export type StoredProgress = 'resumable' | 'stale' | 'absent' | 'unknown'

export interface StoredProgressReport {
  stored: StoredProgress
  outcome: ResumeOutcome
  session: EngineSession
}

// El mismo context de relleno que hoy vive escrito a mano en `onMounted`
// (`app/pages/[game]/index.vue`). La secuencia y los índices de bucle de
// `expand()` no dependen del context, solo de la estructura del juego —
// `resume()` sustituye este relleno por el context persistido antes de que
// se muestre nada, exactamente igual que en el montaje de la página.
//
// WR-07 (`09-REVIEW.md`, ronda 6): congelado + copia por llamada
// (`{ ...PLACEHOLDER_CONTEXT }` en `readStoredProgress`). `expand()` guarda
// el `context` por referencia, así que sin la copia un único objeto de
// módulo mutable quedaba alcanzable desde fuera y compartido por todas las
// llamadas de la vida de la página.
export const PLACEHOLDER_CONTEXT: SessionContext = Object.freeze({ playerCount: 1, difficulty: 'normal' })

// T-09-28-02: comparación normalizada de un `context` que puede venir de
// `JSON.parse` de `localStorage` — entrada NO fiable (otra pestaña, una
// extensión, una edición manual en DevTools). Se normaliza a un array de
// pares `[clave, valorNormalizado]`, NUNCA a un objeto nuevo construido con
// las claves del dato: indexar por una clave que viene del dato reabriría la
// vía `__proto__`/`constructor` que CR-02 de la ronda 3 ya tuvo que cerrar en
// `heroNames[heroId]`. Con pares no se indexa nunca por una clave no fiable.
// El orden de los ARRAYS sí es significativo (se conserva tal cual): afecta
// a `heroes[]` y a los contadores, donde la posición importa.
function normalizar(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizar)
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .map(clave => [clave, normalizar((value as Record<string, unknown>)[clave])])
  }
  return value
}

// Se exporta para que tenga test propio, no porque nadie fuera vaya a
// llamarla. Compara exactamente estos campos y ninguno más: `gameId`,
// `contentVersion`, `formatVersion`, `runtimeId`, `round` y `context`.
//
// `updatedAt` queda EXCLUIDO por escrito: cambia en cada escritura (incluso
// de la misma partida en el mismo punto), así que incluirlo en la
// comparación haría `'stale'` a todas las partidas sin excepción.
export function esLaMismaPartida(enDisco: PersistedPosition, objetivo: PersistedPosition): boolean {
  return (
    enDisco.gameId === objetivo.gameId
    && enDisco.contentVersion === objetivo.contentVersion
    && enDisco.formatVersion === objetivo.formatVersion
    && enDisco.runtimeId === objetivo.runtimeId
    && enDisco.round === objetivo.round
    && JSON.stringify(normalizar(enDisco.context)) === JSON.stringify(normalizar(objetivo.context))
  )
}

// NO añadir caché, memoización ni estado de módulo: cada llamada vuelve a
// leer el dispositivo. Una respuesta cacheada es, por definición, una
// afirmación sin comprobar — justo lo que este fichero existe para prohibir.
//
// `esperada` es OPCIONAL a propósito (plan 09-28): el montaje (`onMounted`)
// no tiene ninguna sesión con la que comparar, y forzarle a inventarse una
// sería exactamente el gesto que esta fase prohíbe. Sin `esperada`, la
// función contesta «¿hay algo reanudable?»; con `esperada`, contesta «¿es
// ESTO lo que hay?». Son dos preguntas distintas y el tipo de retorno lo
// refleja: `'stale'` es INALCANZABLE sin `esperada`.
export function readStoredProgress(game: GameDefinition, esperada?: EngineSession): StoredProgressReport {
  const { readProgress } = usePersistedSession()
  const structural = expand(game, { ...PLACEHOLDER_CONTEXT })
  const lectura = readProgress(game.gameId)

  if (lectura.read === 'failed') {
    // `outcome: 'fresh'` es lo que la app puede HACER (mostrar el
    // mini-setup, exactamente igual que hoy: `load()` también devolvía
    // `null` en este caso). `stored: 'unknown'` es lo que la app puede
    // AFIRMAR (nada). Separar las dos cosas es el punto entero de esta
    // función.
    return { stored: 'unknown', outcome: 'fresh', session: structural }
  }

  const result = resume(lectura.position, structural)

  // Plan 09-28: solo tiene sentido comparar identidad de partida cuando (a)
  // hay algo reanudable que ofrecer (`outcome !== 'fresh'`), (b) se ha dado
  // una partida con la que comparar (`esperada !== undefined`) y (c) existe
  // de verdad una posición en disco (`lectura.position !== null` — siempre
  // cierto cuando (a) se cumple, pero la guarda evita depender de ese
  // acoplamiento implícito y le da a TypeScript un valor no nulo).
  if (result.outcome !== 'fresh' && esperada !== undefined && lectura.position !== null) {
    const mismaPartida = esLaMismaPartida(lectura.position, toPersistedPosition(esperada))
    if (!mismaPartida) {
      return { stored: 'stale', outcome: result.outcome, session: result.session }
    }
  }

  // Invariante (ampliado en el plan 09-28, cierra Gap #1 de la ronda 6):
  // `(stored === 'resumable' || stored === 'stale')` ⟺ `outcome !== 'fresh'`
  // ⟺ la app mostrará `ResumePrompt` o `ContentChangedNotice` al volver a
  // entrar. `'stale'` no cambia lo que la app puede HACER (seguirá
  // ofreciendo esa partida al reentrar, porque está ahí), cambia lo que la
  // app puede AFIRMAR sobre ella.
  //
  // Caso 'content-changed': 'resumable' es correcto aquí porque la partida
  // SÍ sigue en el dispositivo y el grupo SÍ puede volver a pulsar «Partida
  // terminada»; que el registro resultante tenga la ronda reiniciada es un
  // asunto distinto, registrado como deuda (WR-06 de `09-REVIEW.md`) y no una
  // excepción a esta clasificación.
  return {
    stored: result.outcome === 'fresh' ? 'absent' : 'resumable',
    outcome: result.outcome,
    session: result.session,
  }
}
