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
})
