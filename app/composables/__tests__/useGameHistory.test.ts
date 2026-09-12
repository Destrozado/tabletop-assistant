// Tests puros de las funciones de vista exportadas por useGameHistory.ts
// (buildHistoryCardView, buildStatisticsView, resolveFrozenNames), MÁS el
// ciclo record/reload/remove con un `window`/`localStorage` de mentira —
// mismo arnés que ya usa usePersistedSession.test.ts, así que ninguno de
// estos tests necesita jsdom/happy-dom ni contexto de Nuxt. Corre en el
// proyecto `app-logic` (entorno node, vitest.config.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildHistoryCardView,
  buildStatisticsView,
  resolveFrozenNames,
  useGameHistory,
} from '../useGameHistory'
import { useCharacterCatalogue } from '../useCharacterCatalogue'
import type { StatisticsSummary } from '~~/engine/statistics'
import type { EngineSession, GameHistoryEntry, SessionContext } from '~~/engine/types'

function createFakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
  }
}

// Calcado del ejemplo de 09-UI-SPEC.md §4 (Kang · 3 jugadores, hasta la
// ronda 7, 1h40min) — así el test fija exactamente la cadena que el mockup
// ya declara correcta.
function makeEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId: 'marvel-champions',
    result: 'won',
    lossCause: null,
    villainId: 'kang',
    villainName: 'Kang',
    players: [
      { heroId: 'thor', heroName: 'Thor', playerName: 'Ana' },
      { heroId: 'she-hulk', heroName: 'Hulka', playerName: '' },
      { heroId: 'spider-man', heroName: 'Spider-Man', playerName: 'Luis' },
    ],
    difficulty: 'normal',
    playerCount: 3,
    round: 7,
    durationMs: 6_000_000, // 100 min = 1 h 40 min
    recordedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  }
}

function makeSession(overrides: Partial<SessionContext> = {}, round = 5): EngineSession {
  return {
    gameId: 'marvel-champions',
    contentVersion: 1,
    sequence: [],
    cursor: 0,
    round,
    context: {
      playerCount: 1,
      difficulty: 'normal',
      ...overrides,
    },
  }
}

describe('buildHistoryCardView', () => {
  it('victoria con villano y tres jugadores (uno sin nombre): cadenas exactas del mockup de UI-SPEC §4', () => {
    const view = buildHistoryCardView(makeEntry())

    expect(view.resultLabel).toBe('GANADA')
    expect(view.causeLabel).toBeNull()
    expect(view.contextLine).toBe('Kang · Normal · 3 jug')
    expect(view.playerLines).toEqual([
      'Ana · Thor',
      'Jugador 2 · Hulka',
      'Luis · Spider-Man',
    ])
    expect(view.noSelectionLine).toBeNull()
    expect(view.roundAndDurationLine).toBe('Hasta la ronda 7 · 1 h 40 min')
  })

  it('derrota: causeLabel es la cadena de describeLossCause y resultLabel es PERDIDA', () => {
    const view = buildHistoryCardView(makeEntry({
      result: 'lost',
      lossCause: 'mainSchemeCompleted',
      villainId: 'rhino',
      villainName: 'Rhino',
      difficulty: 'expert',
      playerCount: 2,
      players: [
        { heroId: 'thor', heroName: 'Thor', playerName: 'Ana' },
        { heroId: 'spider-man', heroName: 'Spider-Man', playerName: 'Luis' },
      ],
    }))

    expect(view.resultLabel).toBe('PERDIDA')
    expect(view.causeLabel).toBe('Se completó el Plan Principal')
    expect(view.contextLine).toBe('Rhino · Experto · 2 jug')
  })

  it('con durationMs null (D-10): la línea de ronda termina en «· —»', () => {
    const view = buildHistoryCardView(makeEntry({ durationMs: null }))

    expect(view.roundAndDurationLine).toBe('Hasta la ronda 7 · —')
  })

  it('sin villano pero con héroes: la contextLine empieza por «Sin villano»', () => {
    const view = buildHistoryCardView(makeEntry({ villainId: null, villainName: null }))

    expect(view.contextLine).toBe('Sin villano · Normal · 3 jug')
    expect(view.playerLines).not.toBeNull()
  })

  it('sin nada elegido (D-12): playerLines es null y noSelectionLine es la línea exacta', () => {
    const view = buildHistoryCardView(makeEntry({
      villainId: null,
      villainName: null,
      difficulty: 'normal',
      playerCount: 2,
      players: [
        { heroId: null, heroName: null, playerName: '' },
        { heroId: null, heroName: null, playerName: '' },
      ],
    }))

    expect(view.playerLines).toBeNull()
    expect(view.noSelectionLine).toBe('Sin héroes ni villano anotados')
    expect(view.contextLine).toBe('Normal · 2 jug')
  })

  it('un hueco sin héroe: esa línea es solo la etiqueta del jugador, sin · final', () => {
    const view = buildHistoryCardView(makeEntry({
      players: [
        { heroId: 'thor', heroName: 'Thor', playerName: 'Ana' },
        { heroId: null, heroName: null, playerName: 'Luis' },
      ],
      playerCount: 2,
    }))

    expect(view.playerLines).toEqual(['Ana · Thor', 'Luis'])
  })

  it('confirmBody y deleteAriaLabel: cadenas exactas, con villano', () => {
    const view = buildHistoryCardView(makeEntry({ recordedAt: '2026-09-12T10:00:00.000Z' }))

    expect(view.confirmTitle).toBe('¿Borrar esta partida del histórico?')
    expect(view.deleteAriaLabel).toBe('Borrar partida del 12 sep 2026 contra Kang')
    expect(view.confirmBody).toBe('Ganada del 12 sep 2026 contra Kang. Esta acción no se puede deshacer.')
  })

  it('confirmBody y deleteAriaLabel: caso «sin villano»', () => {
    const view = buildHistoryCardView(makeEntry({
      villainId: null,
      villainName: null,
      result: 'lost',
      lossCause: 'heroesEliminated',
      recordedAt: '2026-09-09T10:00:00.000Z',
    }))

    expect(view.deleteAriaLabel).toBe('Borrar partida del 9 sep 2026 contra sin villano')
    expect(view.confirmBody).toBe('Perdida del 9 sep 2026 contra sin villano. Esta acción no se puede deshacer.')
  })

  it('CR-01: una entrada con players: [null] no lanza', () => {
    const entry = makeEntry({ players: [null] as never })

    expect(() => buildHistoryCardView(entry)).not.toThrow()

    const view = buildHistoryCardView(entry)
    expect(typeof view.id).toBe('string')
    expect(typeof view.resultLabel).toBe('string')
    expect(typeof view.roundAndDurationLine).toBe('string')
  })

  it('CR-01: una entrada con players: [{}] no lanza', () => {
    const entry = makeEntry({ players: [{}] as never })

    expect(() => buildHistoryCardView(entry)).not.toThrow()

    const view = buildHistoryCardView(entry)
    expect(typeof view.id).toBe('string')
    expect(typeof view.resultLabel).toBe('string')
    expect(typeof view.roundAndDurationLine).toBe('string')
  })

  it('CR-01: un hueco inválido se descarta pero los válidos se siguen pintando', () => {
    const view = buildHistoryCardView(makeEntry({
      villainId: 'kang',
      villainName: 'Kang',
      players: [null, { heroId: 'thor', heroName: 'Thor', playerName: 'Ana' }] as never,
    }))

    expect(view.playerLines).toHaveLength(1)
    expect(view.playerLines).toContain('Ana · Thor')
  })

  it('CR-01: una entrada corrupta no impide renderizar el resto de la lista', () => {
    const entries = [
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b', players: [null] as never }),
      makeEntry({ id: 'c' }),
    ]

    let views: ReturnType<typeof buildHistoryCardView>[] = []
    expect(() => {
      views = entries.map(buildHistoryCardView)
    }).not.toThrow()
    expect(views).toHaveLength(3)
  })
})

describe('buildStatisticsView', () => {
  it('valueLabel con el formato exacto «3 de 4 · 75 %»', () => {
    const summary: StatisticsSummary = {
      heroRows: [{ id: 'thor', name: 'Thor', wins: 3, played: 4, pct: 75 }],
      villainRows: [],
      totalEntries: 4,
      entriesWithHeroes: 4,
    }

    const view = buildStatisticsView(summary)

    expect(view.heroRows).toEqual([{ id: 'thor', name: 'Thor', valueLabel: '3 de 4 · 75 %' }])
  })

  it('sampleCaption es null cuando todas las partidas tienen héroes anotados', () => {
    const summary: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 5,
      entriesWithHeroes: 5,
    }

    expect(buildStatisticsView(summary).sampleCaption).toBeNull()
  })

  it('sampleCaption es la cadena exacta cuando no todas tienen héroes anotados', () => {
    const summary: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 12,
      entriesWithHeroes: 10,
    }

    expect(buildStatisticsView(summary).sampleCaption).toBe('12 partidas registradas · 10 con héroes anotados')
  })

  it('sampleCaption usa el singular correcto con una sola partida', () => {
    const summary: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 1,
      entriesWithHeroes: 0,
    }

    expect(buildStatisticsView(summary).sampleCaption).toBe('1 partida registrada · 0 con héroes anotados')
  })

  it('isEmpty es true con el resumen vacío', () => {
    const summary: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 0,
      entriesWithHeroes: 0,
    }

    expect(buildStatisticsView(summary).isEmpty).toBe(true)
  })

  it('WR-01: con partidas registradas pero cero filas, isEmpty es true', () => {
    const summary: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 3,
      entriesWithHeroes: 0,
    }

    expect(buildStatisticsView(summary).isEmpty).toBe(true)
  })

  it('WR-01: la copy del estado vacío distingue los dos motivos', () => {
    const historicoVacio: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 0,
      entriesWithHeroes: 0,
    }
    expect(buildStatisticsView(historicoVacio).emptyBody).toBe(
      'En cuanto registréis vuestra primera partida en el histórico, aquí aparecerá el % de victorias por héroe y por villano.',
    )

    const sinFilas: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 3,
      entriesWithHeroes: 0,
    }
    expect(buildStatisticsView(sinFilas).emptyBody).toBe(
      '3 partidas registradas, pero ninguna con héroe ni villano anotados. En cuanto anotéis quién jugó o contra quién, aquí aparecerá el % de victorias.',
    )

    const unaPartida: StatisticsSummary = {
      heroRows: [],
      villainRows: [],
      totalEntries: 1,
      entriesWithHeroes: 0,
    }
    expect(buildStatisticsView(unaPartida).emptyBody).toBe(
      '1 partida registrada, pero ninguna con héroe ni villano anotados. En cuanto anotéis quién jugó o contra quién, aquí aparecerá el % de victorias.',
    )
  })

  it('WR-01: con al menos una fila, isEmpty es false y emptyTitle/emptyBody son null', () => {
    const summary: StatisticsSummary = {
      heroRows: [{ id: 'thor', name: 'Thor', wins: 1, played: 1, pct: 100 }],
      villainRows: [],
      totalEntries: 1,
      entriesWithHeroes: 1,
    }

    const view = buildStatisticsView(summary)
    expect(view.isEmpty).toBe(false)
    expect(view.emptyTitle).toBeNull()
    expect(view.emptyBody).toBeNull()
  })
})

describe('resolveFrozenNames', () => {
  const { getCatalogue } = useCharacterCatalogue()
  const catalogue = getCatalogue('marvel-champions')

  it('resuelve el alias español de un héroe real del catálogo (she-hulk → Hulka, distinto del nombre inglés)', () => {
    const context: SessionContext = {
      playerCount: 1,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [{ heroId: 'she-hulk', playerName: 'Ana' }] },
    }

    const names = resolveFrozenNames(context, catalogue)

    expect(names.heroNames['she-hulk']).toBe('Hulka')
    expect(names.heroNames['she-hulk']).not.toBe('She-Hulk')
  })

  it('deja fuera del mapa un heroId inexistente en el catálogo', () => {
    const context: SessionContext = {
      playerCount: 1,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [{ heroId: 'heroe-fantasma', playerName: 'Ana' }] },
    }

    const names = resolveFrozenNames(context, catalogue)

    expect(names.heroNames['heroe-fantasma']).toBeUndefined()
  })

  it('devuelve villainName: null sin villano elegido', () => {
    const context: SessionContext = {
      playerCount: 1,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [{ heroId: null, playerName: '' }] },
    }

    expect(resolveFrozenNames(context, catalogue).villainName).toBeNull()
  })

  // CR-02 (ronda 3): las ocho claves heredadas de Object.prototype —
  // declarada aquí y en engine/__tests__/history.test.ts (deliberadamente
  // duplicada: cada fichero de test es autocontenido, sin depender de un
  // import cruzado entre proyectos vitest distintos).
  const PROTOTYPE_KEYS = [
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '__proto__',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
  ] as const

  it('CR-02 (ronda 3): el mapa devuelto no tiene prototipo', () => {
    const context: SessionContext = {
      playerCount: 1,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [{ heroId: 'thor', playerName: 'Ana' }] },
    }

    const names = resolveFrozenNames(context, catalogue)

    expect(Object.getPrototypeOf(names.heroNames)).toBeNull()
  })

  it.each(PROTOTYPE_KEYS)('CR-02 (ronda 3): un heroId igual a "%s" (ausente del catálogo) no resuelve por la cadena de prototipos — el mapa devuelve undefined, nunca una función', (heroId) => {
    const context: SessionContext = {
      playerCount: 1,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [{ heroId, playerName: 'Ana' }] },
    }

    const names = resolveFrozenNames(context, catalogue)

    expect(names.heroNames[heroId]).toBeUndefined()
    expect(typeof names.heroNames[heroId]).not.toBe('function')
  })
})

describe('useGameHistory — ciclo record/reload/remove con localStorage falso', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = {
      localStorage: fakeStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    vi.restoreAllMocks()
  })

  it('record() devuelve true, reload() deja una entrada, un segundo record() la coloca primero, remove(id) la quita y isEmpty vuelve a true', () => {
    const { record, reload, remove, entries, isEmpty } = useGameHistory()

    const session1 = makeSession({
      selection: { villainId: 'rhino', heroes: [{ heroId: 'spider-man', playerName: 'Ana' }] },
    })
    expect(record(session1, 'won')).toBe(true)

    reload()
    expect(entries.value).toHaveLength(1)
    const firstId = entries.value[0]!.id

    const session2 = makeSession({
      selection: { villainId: 'kang', heroes: [{ heroId: 'thor', playerName: 'Luis' }] },
    })
    expect(record(session2, 'mainSchemeCompleted')).toBe(true)

    reload()
    expect(entries.value).toHaveLength(2)
    expect(entries.value[0]!.id).not.toBe(firstId)
    const secondId = entries.value[0]!.id

    remove(secondId)
    expect(entries.value).toHaveLength(1)
    expect(entries.value[0]!.id).toBe(firstId)

    remove(firstId)
    expect(entries.value).toHaveLength(0)
    expect(isEmpty.value).toBe(true)
  })

  it('CR-01 (ronda 2): una entrada construida desde context: {} sobrevive a un ciclo record() → loadHistory()', () => {
    const { record, reload, entries } = useGameHistory()

    const session: EngineSession = {
      gameId: 'marvel-champions',
      contentVersion: 1,
      sequence: [],
      cursor: 0,
      round: Number.NaN as unknown as number,
      context: {} as SessionContext,
    }

    expect(record(session, 'won')).toBe(true)

    reload()
    expect(entries.value).toHaveLength(1)
    const entry = entries.value[0]!
    expect(entry.difficulty).toBe('normal')
    expect(entry.playerCount).toBe(0)
    expect(entry.round).toBe(1)
    expect(entry.players).toHaveLength(0)
  })

  it('la misma ida y vuelta con una sesión normal conserva playerCount y round tal cual (camino feliz)', () => {
    const { record, reload, entries } = useGameHistory()

    const session = makeSession({
      selection: { villainId: 'rhino', heroes: [{ heroId: 'spider-man', playerName: 'Ana' }] },
    })

    expect(record(session, 'won')).toBe(true)

    reload()
    expect(entries.value).toHaveLength(1)
    const entry = entries.value[0]!
    expect(entry.playerCount).toBe(1)
    expect(entry.round).toBe(session.round)
  })

  it('CR-02 (ronda 3): un heroId "constructor" se REGISTRA — record() devuelve true y reload() la recupera con heroId conservado y heroName null', () => {
    const { record, reload, entries } = useGameHistory()

    const session = makeSession({
      selection: { villainId: null, heroes: [{ heroId: 'constructor', playerName: 'Ana' }] },
    })

    // Contra el código previo a este plan, record() devolvía false (la
    // entrada tenía heroName: Object, que isHistoryPlayerEntry rechazaba) y
    // entries.value quedaba vacío: la partida se perdía sin diagnóstico
    // correcto (notifyHistorySaved(false) culpaba al almacenamiento).
    expect(record(session, 'won')).toBe(true)

    reload()
    expect(entries.value).toHaveLength(1)
    const entry = entries.value[0]!
    expect(entry.players[0]!.heroId).toBe('constructor')
    expect(entry.players[0]!.heroName).toBeNull()
  })

  it('CR-02 (ronda 3): la variante con un heroId real (spider-man) sigue recuperando el alias congelado (camino feliz)', () => {
    const { record, reload, entries } = useGameHistory()

    const session = makeSession({
      selection: { villainId: null, heroes: [{ heroId: 'spider-man', playerName: 'Ana' }] },
    })

    expect(record(session, 'won')).toBe(true)

    reload()
    expect(entries.value).toHaveLength(1)
    const entry = entries.value[0]!
    expect(entry.players[0]!.heroId).toBe('spider-man')
    expect(entry.players[0]!.heroName).toBe('Spider-Man')
  })
})
