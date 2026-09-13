// Test de regresión exigido por CR-01 (ronda 4, 09-VERIFICATION.md): el
// aviso de HistorySavedNotice.vue afirmaba "la partida... sigue guardada en
// el dispositivo" apoyándose únicamente en que finishGame(!guardado) NO
// borraba el progreso — pero "no borrar" no es "hay algo que preservar". En
// modo privado del navegador o con la cuota llena, `tga:progress:<gameId>`
// puede no haberse escrito NUNCA durante toda la partida, y la app no tenía
// forma de saberlo porque `save()` (usePersistedSession.ts) descartaba a
// propósito el booleano de `writeRaw`.
//
// Este test cruza DELIBERADAMENTE dos composables (usePersistedSession y
// useHistorySavedNotice): la regresión no vivía dentro de ninguno de los
// dos por separado, sino en la costura entre lo que uno escribe (save(),
// appendHistoryEntry()) y lo que el otro afirma (resolveNoticeVariant(),
// NOTICE_BODY). Un test que solo mockeara uno de los dos lados no la habría
// atrapado.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NOTICE_BODY, resolveNoticeVariant } from '../useHistorySavedNotice'
import { usePersistedSession } from '../usePersistedSession'
import type { EngineSession, GameHistoryEntry } from '~~/engine/types'

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

describe('CR-01 (ronda 4): con el almacenamiento caído en toda la partida, el aviso no afirma que la partida siga guardada', () => {
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

    const primerResultado = save(makeSession('marvel-champions', 1))
    const segundoResultado = save(makeSession('marvel-champions', 2))
    const tercerResultado = save(makeSession('marvel-champions', 3))

    expect(primerResultado).toBe(false)
    expect(segundoResultado).toBe(false)
    expect(tercerResultado).toBe(false)
  })

  it('2. el registro del histórico también falla, y la variante resultante es la no recuperable', () => {
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorage() }
    const { save, appendHistoryEntry } = usePersistedSession()

    const historyRecorded = appendHistoryEntry(makeEntry())
    const progressSecured = save(makeSession('marvel-champions'))

    expect(historyRecorded).toBe(false)
    expect(progressSecured).toBe(false)
    expect(resolveNoticeVariant(historyRecorded, progressSecured)).toBe('failure-unrecoverable')
  })

  it('3. EL TEST DE REGRESIÓN: el texto que leería el grupo no contiene ninguna promesa sobre el dispositivo', () => {
    // Si alguien vuelve a colapsar las dos variantes de fallo en una sola
    // con la copy optimista ("sigue guardada..."), este test se pone rojo.
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorage() }
    const { save, appendHistoryEntry } = usePersistedSession()

    const historyRecorded = appendHistoryEntry(makeEntry())
    const progressSecured = save(makeSession('marvel-champions'))
    const variante = resolveNoticeVariant(historyRecorded, progressSecured)
    const cuerpo = NOTICE_BODY[variante]

    expect(cuerpo).not.toContain('sigue guardada')
    expect(cuerpo).not.toContain('no se ha perdido')
    expect(cuerpo).not.toContain('Partida terminada')
  })

  it('4. el contraste que demuestra que el Test 3 no pasa por casualidad: cuando el progreso SÍ se escribe, la promesa reaparece', () => {
    // Solo la clave del histórico está rota (blob ilegible ya sembrado);
    // `save()` escribe en `tga:progress:<gameId>`, una clave distinta, y
    // debe poder hacerlo con normalidad.
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: createFakeLocalStorageWithBrokenHistoryKey() }
    const { save, appendHistoryEntry } = usePersistedSession()

    const historyRecorded = appendHistoryEntry(makeEntry())
    const progressSecured = save(makeSession('marvel-champions'))

    expect(historyRecorded).toBe(false)
    expect(progressSecured).toBe(true)

    const variante = resolveNoticeVariant(historyRecorded, progressSecured)
    expect(variante).toBe('failure-recoverable')
    expect(NOTICE_BODY[variante]).toContain('sigue guardada en el dispositivo')
  })
})
