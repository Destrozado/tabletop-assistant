// Test de regresión exigido originalmente por CR-01 (ronda 4,
// 09-VERIFICATION.md) y reescrito por el plan 09-26 contra el BLOCKER de la
// ronda 5: el aviso de fin de partida afirmaba algo sobre el dispositivo
// («sigue guardada»/«no hay nada que reintentar») a partir de un booleano de
// ESCRITURA (`save()`), nunca de una lectura real. Desde el plan 09-25/09-26
// esa afirmación sale de `readStoredProgress` (la autoridad) vía
// `planGameEnd`/`resolveNoticeVariant`, que ya no aceptan un `boolean` en esa
// posición — un `StoredProgress` real, o el typecheck falla.
//
// Este test cruza DELIBERADAMENTE tres piezas (usePersistedSession,
// useStoredProgress y useHistorySavedNotice): la regresión de la ronda 5 no
// vivía dentro de ninguna por separado, sino en la costura entre lo que se
// escribe (`save()`, `appendHistoryEntry()`), lo que la autoridad LEE
// (`readStoredProgress`) y lo que el aviso AFIRMA
// (`resolveNoticeVariant`/`planGameEnd`, `NOTICE_BODY`). Un test que solo
// mockeara una de las tres no la habría atrapado.
//
// RONDA 6 (Gap #1 de `09-VERIFICATION.md`, plan 09-29): el propio test 5 de
// este fichero —el test de regresión que el plan 09-26 escribió para cerrar
// el BLOCKER de la ronda 5— sembraba el escenario exacto de la séptima cara
// del defecto (tres autoguardados válidos con `cursor: 0/1/2` y un cierre
// fallido con `cursor: 3`) y AFIRMABA EN VERDE que la variante correcta era
// `failure-recoverable`, sin comprobar que lo que hay en el dispositivo sea
// la partida que terminó. Ese razonamiento —«la clave sigue en el
// dispositivo, luego sigue guardada»— es exactamente el defecto: lo que hay
// bajo esa clave es `cursor: 2` (un autoguardado ANTERIOR), y la partida que
// terminó estaba en `cursor: 3`. El test 5 se ha reescrito para exigir
// `'failure-stale'` (plan 09-28, cuarto valor de `StoredProgress`), y el
// test 5 ANTERIOR —el que fijaba el defecto en verde— no se restaura por
// parecer «el que ya estaba»: era el propio hallazgo de la ronda 6.
import { afterEach, describe, expect, it } from 'vitest'
import rawTinyGame from '../../../engine/__tests__/fixtures/tiny-game.json'
import { expand } from '~~/engine/expand'
import { validateGameDefinition } from '~~/engine/schema'
import type { EngineSession, GameHistoryEntry } from '~~/engine/types'
import { toPersistedPosition } from '~~/engine/persistence'
import { NOTICE_BODY, planGameEnd, resolveNoticeVariant } from '../useHistorySavedNotice'
import { usePersistedSession } from '../usePersistedSession'
import { readStoredProgress } from '../useStoredProgress'

const tinyGame = validateGameDefinition(rawTinyGame)

// Montaje copiado literalmente de usePersistedSession.test.ts (createFakeLocalStorage,
// makeSession): no se reinventa, se reutiliza el mismo doble de prueba.
function createFakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (_key: string, _value: string) => {
      throw new Error('QuotaExceededError (simulado): el almacenamiento está caído en toda la partida')
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

// Variante del doble de arriba para el Test 4: solo la clave del histórico
// falla (blob ilegible ya sembrado), el resto del almacenamiento funciona
// con normalidad — mismo patrón que usePersistedSession.test.ts para
// "histórico anterior ilegible".
function createFakeLocalStorageWithBrokenHistoryKey() {
  const store = new Map<string, string>()
  store.set('tga:history', '{ esto no es JSON válido')
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

// NUEVO (plan 09-26) — el punto entero de esta tarea: `createFakeLocalStorage`
// lanzaba desde la PRIMERA llamada a `setItem` (IN-02 de `09-REVIEW.md`), así
// que la suite no podía representar el estado «hay un progreso VIEJO escrito
// de verdad, y AHORA la escritura falla» — que es exactamente el estado en
// que vivía el BLOCKER de la ronda 5: el autoguardado escribe
// `tga:progress:<gameId>` con éxito varias veces durante la partida, la
// cuota se agota al final, la escritura de cierre falla, y la clave SIGUE
// ahí. `getItem` funciona SIEMPRE (igual que en un almacenamiento real que
// solo ha empezado a fallar en escritura, nunca en lectura).
function createFakeLocalStorageFailingAfter(n: number) {
  const store = new Map<string, string>()
  let calls = 0
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      calls += 1
      if (calls > n) {
        throw new Error('QuotaExceededError (simulado): la escritura empieza a fallar tras la partida ya arrancada')
      }
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

function makeSession(gameId: string, round = 1): EngineSession {
  return {
    gameId,
    contentVersion: 1,
    sequence: [],
    cursor: 0,
    round,
    context: { playerCount: 2, difficulty: 'normal' },
  }
}

function makeEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId: 'marvel-champions',
    result: 'won',
    lossCause: null,
    villainId: 'rhino',
    villainName: 'Rhino',
    players: [{ heroId: 'spider-man', heroName: 'Spider-Man', playerName: 'Jugador 1' }],
    difficulty: 'normal',
    playerCount: 1,
    round: 5,
    durationMs: 1_200_000,
    recordedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('El escenario de la ronda 5, extremo a extremo, con un doble que falla TARDE', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('1. con setItem lanzando en TODAS las llamadas, save() durante la partida devuelve false', () => {
    // Este test elige `save()` (no `record()`/`appendHistoryEntry()`, que
    // necesitan un contexto de Nuxt vía useCharacterCatalogue) porque es lo
    // que el `watchDebounced` del autoguardado invoca de verdad durante la
    // partida (app/pages/[game]/index.vue). El punto entero del gap es que
    // en modo privado/cuota falla TODO el origen, no solo la llamada del
    // histórico.
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorage() }
    const { save } = usePersistedSession()

    const primerResultado = save(makeSession('tiny-game', 1))
    const segundoResultado = save(makeSession('tiny-game', 2))
    const tercerResultado = save(makeSession('tiny-game', 3))

    expect(primerResultado).toBe(false)
    expect(segundoResultado).toBe(false)
    expect(tercerResultado).toBe(false)
  })

  it('2. el registro del histórico también falla, la autoridad confirma que no hay nada, y la variante es la no recuperable', () => {
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorage() }
    const { appendHistoryEntry } = usePersistedSession()

    const historyRecorded = appendHistoryEntry(makeEntry())
    const informe = readStoredProgress(tinyGame)

    expect(historyRecorded).toBe(false)
    expect(informe.stored).toBe('absent')
    expect(planGameEnd(historyRecorded, informe.stored).variant).toBe('failure-unrecoverable')
  })

  it('3. EL TEST DE REGRESIÓN: el texto que leería el grupo no contiene ninguna promesa sobre el dispositivo', () => {
    // Si alguien vuelve a colapsar las variantes de fallo en una sola con la
    // copy optimista ("sigue guardada..."), este test se pone rojo.
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorage() }
    const { appendHistoryEntry } = usePersistedSession()

    const historyRecorded = appendHistoryEntry(makeEntry())
    const informe = readStoredProgress(tinyGame)
    const variante = resolveNoticeVariant(historyRecorded, informe.stored)
    const cuerpo = NOTICE_BODY[variante]

    expect(cuerpo).not.toContain('sigue guardada')
    expect(cuerpo).not.toContain('no se ha perdido')
    expect(cuerpo).not.toContain('Partida terminada')
  })

  it('4. contraste: solo la clave del histórico está rota, save() sí escribe, y la promesa de presencia reaparece', () => {
    // Solo la clave del histórico está rota (blob ilegible ya sembrado);
    // `save()` escribe en `tga:progress:<gameId>`, una clave distinta, y
    // debe poder hacerlo con normalidad.
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorageWithBrokenHistoryKey() }
    const { save } = usePersistedSession()

    const guardado = save(expand(tinyGame, { playerCount: 2, difficulty: 'normal' }))
    expect(guardado).toBe(true)

    const informe = readStoredProgress(tinyGame)
    expect(informe.stored).toBe('resumable')

    const variante = resolveNoticeVariant(false, informe.stored)
    expect(variante).toBe('failure-recoverable')
    expect(NOTICE_BODY[variante]).toContain('sigue guardada en el dispositivo')
  })

  it('5. EL TEST DE LA RONDA 6/RONDA 7 (plan 09-32): el dispositivo conserva un autoguardado que no coincide con el punto en el que ha terminado la partida — el texto no afirma nada sobre la ronda, y aquí queda escrito el contraejemplo de por qué no puede', () => {
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorageFailingAfter(3) }
    const { save, appendHistoryEntry, readProgress } = usePersistedSession()

    // El autoguardado escribe tres veces con éxito durante la partida —
    // progreso VIEJO escrito de verdad, no una suposición.
    const base = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    const primerAutoguardado = save({ ...base, cursor: 0 })
    const segundoAutoguardado = save({ ...base, cursor: 1 })
    const tercerAutoguardado = save({ ...base, cursor: 2 })

    expect(primerAutoguardado).toBe(true)
    expect(segundoAutoguardado).toBe(true)
    expect(tercerAutoguardado).toBe(true)

    // A partir de aquí toda escritura falla (cuota agotada al final de la
    // partida): tanto el registro del histórico como el intento de guardado
    // de cierre.
    const historyRecorded = appendHistoryEntry(makeEntry())
    const guardadoDeCierre = save({ ...base, cursor: 3 })

    expect(historyRecorded).toBe(false)
    expect(guardadoDeCierre).toBe(false)

    // RONDA 6 (Gap #1 de `09-VERIFICATION.md`): la clave `tga:progress:tiny-game`
    // SIGUE en el dispositivo (cierto: el tercer autoguardado la dejó ahí),
    // pero lo que hay bajo ella es `cursor: 2` — la partida que ha terminado
    // estaba en `cursor: 3`. Afirmar «sigue guardada» sobre eso es hablar de
    // OTRA partida: el reintento que esa frase ordenaría escribiría en el
    // histórico —irreconstruible (D-13)— la ronda y la selección de
    // héroes/villano del autoguardado ANTERIOR, no los de la partida que
    // acaba de terminar. Por eso la lectura pasa la sesión que acaba de
    // terminar (`{ ...base, cursor: 3 }`) como `esperada`: es la comparación
    // que el test anterior de esta misma línea no hacía.
    const partidaQueTermina = { ...base, cursor: 3 }
    const informe = readStoredProgress(tinyGame, partidaQueTermina)

    // El nombre del hallazgo: hay algo reanudable, pero NO es esta partida.
    expect(informe.stored).toBe('stale')
    expect(planGameEnd(historyRecorded, informe.stored).variant).toBe('failure-stale')

    // La mitad que SÍ protegía el test anterior se conserva tal cual: la app
    // seguirá ofreciendo "Continuar" para este juego, así que el aviso no
    // puede decir "no hay nada que reintentar".
    expect(informe.outcome).toBe('resumed')

    // El texto que leería el grupo no promete identidad de partida ni ordena
    // el reintento peligroso.
    const variante = planGameEnd(historyRecorded, informe.stored).variant
    const cuerpo = NOTICE_BODY[variante]
    expect(cuerpo).not.toContain('sigue guardada')
    expect(cuerpo).not.toContain('no se ha perdido')
    expect(cuerpo).not.toContain('Partida terminada')

    // PLAN 09-32 (octava cara del defecto, `09-VERIFICATION.md` ronda 7): el
    // texto anterior afirmaba «no la ronda en la que habéis terminado», y esa
    // frase es literalmente falsa en este mismo montaje — la aserción que
    // faltaba en el test 5 original.
    expect(cuerpo).not.toContain('no la ronda')
    expect(cuerpo).toContain('no coincide con el punto en el que habéis terminado')

    // EL CONTRAEJEMPLO ESCRITO: se lee la posición que quedó en disco (el
    // tercer autoguardado, `cursor: 2`) y se construye la de la partida que
    // termina (`cursor: 3`) con la misma función que usa la app
    // (`toPersistedPosition`). `expand()` fija `round` una sola vez y ningún
    // `{ ...base, cursor: n }` posterior lo toca, así que las dos `round` son
    // IGUALES aquí — la diferencia real está en `runtimeId` (el paso de la
    // secuencia), no en la ronda. Por eso la frase retirada («no la ronda en
    // la que habéis terminado») era falsa exactamente en este escenario.
    const lecturaEnDisco = readProgress('tiny-game')
    if (lecturaEnDisco.read !== 'ok' || lecturaEnDisco.position === null) {
      throw new Error('el test 5 espera una posición legible en disco tras el tercer autoguardado')
    }
    const posicionEnDisco = lecturaEnDisco.position
    const posicionQueTermina = toPersistedPosition(partidaQueTermina)

    expect(posicionEnDisco.round).toBe(posicionQueTermina.round)
    expect(posicionEnDisco.runtimeId).not.toBe(posicionQueTermina.runtimeId)
  })

  it('6. sin `esperada`, el mismo montaje sigue dando `failure-recoverable` — la prueba de que el segundo argumento es lo que cambia la respuesta', () => {
    // Mismo montaje EXACTO que el test 5, pero llamando a `readStoredProgress`
    // sin `esperada`: sin nada con que comparar, `'stale'` es inalcanzable
    // (documentado en `useStoredProgress.ts`) y la respuesta es la misma que
    // devolvía el código anterior a este plan. Esto demuestra que el defecto
    // de la ronda 6 era exactamente la AUSENCIA del segundo argumento, no un
    // fallo de `readStoredProgress` en sí.
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorageFailingAfter(3) }
    const { save, appendHistoryEntry } = usePersistedSession()

    const base = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    save({ ...base, cursor: 0 })
    save({ ...base, cursor: 1 })
    save({ ...base, cursor: 2 })

    const historyRecorded = appendHistoryEntry(makeEntry())
    save({ ...base, cursor: 3 })

    const informe = readStoredProgress(tinyGame)
    expect(informe.stored).toBe('resumable')
    expect(planGameEnd(historyRecorded, informe.stored).variant).toBe('failure-recoverable')
  })

  it('7. contraste: histórico roto, `esperada` es la MISMA sesión guardada → sigue siendo `resumable`/`failure-recoverable` con su promesa intacta', () => {
    // Mismo montaje que el test 4 (solo la clave del histórico está rota),
    // pero ahora se pasa `esperada` — la MISMA sesión que se guardó. Si
    // `esLaMismaPartida` se disparara de más, este test se pondría rojo:
    // demuestra que `'stale'` no aparece cuando la partida guardada SÍ es la
    // que se está comprobando.
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorageWithBrokenHistoryKey() }
    const { save } = usePersistedSession()

    const sesionGuardada = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    const guardado = save(sesionGuardada)
    expect(guardado).toBe(true)

    const informe = readStoredProgress(tinyGame, sesionGuardada)
    expect(informe.stored).toBe('resumable')

    const variante = resolveNoticeVariant(false, informe.stored)
    expect(variante).toBe('failure-recoverable')
    expect(NOTICE_BODY[variante]).toContain('sigue guardada en el dispositivo')
  })

  it('8. lectura imposible (getItem que lanza): el dispositivo no autoriza ni presencia ni ausencia', () => {
    const fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        ...fakeStorage,
        getItem: () => {
          throw new Error('SecurityError (simulado): la lectura del dispositivo falla')
        },
      },
    }

    const informe = readStoredProgress(tinyGame)
    expect(informe.stored).toBe('unknown')

    const variante = resolveNoticeVariant(false, informe.stored)
    expect(variante).toBe('failure-unknown')
    expect(NOTICE_BODY[variante]).not.toContain('no hay nada que reintentar')
    expect(NOTICE_BODY[variante]).not.toContain('sigue guardada en el dispositivo')
  })

  it('9. planGameEnd().preserveProgress es true en las tres variantes de fallo y false en success (mecánica de 09-16, ahora fijada por test)', () => {
    expect(planGameEnd(false, 'resumable').preserveProgress).toBe(true)
    expect(planGameEnd(false, 'absent').preserveProgress).toBe(true)
    expect(planGameEnd(false, 'unknown').preserveProgress).toBe(true)
    expect(planGameEnd(true, 'absent').preserveProgress).toBe(false)
  })
})
