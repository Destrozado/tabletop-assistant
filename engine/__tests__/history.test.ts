import { describe, expect, it } from 'vitest'
import {
  buildHistoryEntry,
  describeLossCause,
  formatEntryDate,
  formatEntryDuration,
  sortEntriesByRecency,
} from '../history'
import type { EngineSession, GameHistoryEntry, SessionContext } from '../types'

// Regla obligatoria de este fichero (09-01-PLAN.md): usar instantes ISO a
// mediodía UTC (p. ej. 2026-09-12T12:00:00.000Z) para que el desplazamiento
// horario del entorno de CI no cambie el día que `formatEntryDate` calcula.
const NOON_UTC_MS = Date.parse('2026-09-12T12:00:00.000Z')

function baseContext(overrides: Partial<SessionContext> = {}): SessionContext {
  return { playerCount: 3, difficulty: 'normal', ...overrides }
}

function baseSession(overrides: Partial<EngineSession> = {}): EngineSession {
  return {
    gameId: 'marvel-champions',
    contentVersion: 14,
    sequence: [],
    cursor: 0,
    round: 1,
    context: baseContext(),
    ...overrides,
  }
}

const emptyNames = { villainName: null, heroNames: {} }

describe('D-06: outcome → result/lossCause y describeLossCause', () => {
  it('outcome "won" produce result "won" y lossCause null', () => {
    const entry = buildHistoryEntry(baseSession(), 'won', NOON_UTC_MS, emptyNames)
    expect(entry.result).toBe('won')
    expect(entry.lossCause).toBeNull()
  })

  it('outcome "mainSchemeCompleted" produce result "lost" y ese lossCause exacto', () => {
    const entry = buildHistoryEntry(baseSession(), 'mainSchemeCompleted', NOON_UTC_MS, emptyNames)
    expect(entry.result).toBe('lost')
    expect(entry.lossCause).toBe('mainSchemeCompleted')
  })

  it('outcome "heroesEliminated" produce result "lost" y ese lossCause exacto', () => {
    const entry = buildHistoryEntry(baseSession(), 'heroesEliminated', NOON_UTC_MS, emptyNames)
    expect(entry.result).toBe('lost')
    expect(entry.lossCause).toBe('heroesEliminated')
  })

  it('describeLossCause devuelve las cadenas exactas contrastadas con el Rules Reference v1.7 p. 46', () => {
    expect(describeLossCause('mainSchemeCompleted')).toBe('Se completó el Plan Principal')
    expect(describeLossCause('heroesEliminated')).toBe('Todos los héroes eliminados')
  })
})

describe('D-08/D-10: durationMs — reloj de pared sin tope, null cuando no se puede saber', () => {
  it('con startedAt presente, durationMs es exactamente now - startedAt', () => {
    const startedAt = NOON_UTC_MS - 6_000_000 // 1h 40min antes
    const session = baseSession({ context: baseContext({ startedAt }) })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.durationMs).toBe(NOON_UTC_MS - startedAt)
  })

  it('sin startedAt, durationMs es null', () => {
    const session = baseSession()
    expect(session.context.startedAt).toBeUndefined()
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.durationMs).toBeNull()
  })

  it('con un startedAt posterior a now (dato manipulado), durationMs es null', () => {
    const session = baseSession({ context: baseContext({ startedAt: NOON_UTC_MS + 1_000 }) })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.durationMs).toBeNull()
  })

  it('con un startedAt no numérico, durationMs es null', () => {
    const session = baseSession({
      context: { ...baseContext(), startedAt: 'no-es-un-numero' as unknown as number },
    })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.durationMs).toBeNull()
  })
})

describe('D-09: round se copia tal cual, nunca round - 1', () => {
  it('una sesión en round: 7 guarda 7', () => {
    const session = baseSession({ round: 7 })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.round).toBe(7)
  })
})

describe('D-11: heroName sale de names.heroNames, nunca del id', () => {
  it('un héroe con nombre en el mapa lo congela', () => {
    const session = baseSession({
      context: baseContext({
        selection: { villainId: null, heroes: [{ heroId: 'thor', playerName: 'Ana' }, { heroId: null, playerName: '' }, { heroId: null, playerName: '' }] },
      }),
    })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, { villainName: null, heroNames: { thor: 'Thor' } })
    expect(entry.players[0]).toEqual({ heroId: 'thor', heroName: 'Thor', playerName: 'Ana' })
  })

  it('un heroId ausente del mapa deja heroName en null', () => {
    const session = baseSession({
      context: baseContext({
        selection: { villainId: null, heroes: [{ heroId: 'thor', playerName: 'Ana' }, { heroId: null, playerName: '' }, { heroId: null, playerName: '' }] },
      }),
    })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, { villainName: null, heroNames: {} })
    expect(entry.players[0]).toEqual({ heroId: 'thor', heroName: null, playerName: 'Ana' })
  })
})

describe('D-12: sin selección se construye igual, con villainId/heroId null y no lanza', () => {
  it('un context sin selection produce villainId null, villainName null y huecos con heroId null', () => {
    const session = baseSession({ context: baseContext() })
    expect(session.context.selection).toBeUndefined()

    let entry: GameHistoryEntry | undefined
    expect(() => {
      entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    }).not.toThrow()

    expect(entry!.villainId).toBeNull()
    expect(entry!.villainName).toBeNull()
    expect(entry!.players).toHaveLength(3)
    for (const player of entry!.players) {
      expect(player.heroId).toBeNull()
      expect(player.heroName).toBeNull()
    }
  })

  it('villainId presente pero sin villainName congelado deja villainName en null', () => {
    const session = baseSession({
      context: baseContext({ selection: { villainId: 'kang', heroes: [] } }),
    })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, { villainName: null, heroNames: {} })
    expect(entry.villainId).toBe('kang')
    expect(entry.villainName).toBeNull()
  })
})

describe('D-15: gameId se copia de la sesión', () => {
  it('gameId de la entrada coincide con el de la sesión', () => {
    const session = baseSession({ gameId: 'warhammer-40k' })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.gameId).toBe('warhammer-40k')
  })
})

describe('D-21: formatEntryDate y formatEntryDuration con cadenas exactas', () => {
  it('formatEntryDate sobre un ISO conocido devuelve "12 sep 2026"', () => {
    expect(formatEntryDate('2026-09-12T12:00:00.000Z')).toBe('12 sep 2026')
  })

  it('formatEntryDuration(6000000) devuelve "1 h 40 min"', () => {
    expect(formatEntryDuration(6_000_000)).toBe('1 h 40 min')
  })

  it('formatEntryDuration(120000) devuelve "2 min"', () => {
    expect(formatEntryDuration(120_000)).toBe('2 min')
  })

  it('formatEntryDuration(null) devuelve "—"', () => {
    expect(formatEntryDuration(null)).toBe('—')
  })

  it('una cadena no parseable en formatEntryDate devuelve "—"', () => {
    expect(formatEntryDate('esto-no-es-una-fecha')).toBe('—')
  })
})

describe('sortEntriesByRecency: orden descendente sin mutar el original', () => {
  function entryAt(recordedAt: string): GameHistoryEntry {
    return {
      id: `id-${recordedAt}`,
      gameId: 'marvel-champions',
      result: 'won',
      lossCause: null,
      villainId: null,
      villainName: null,
      players: [],
      difficulty: 'normal',
      playerCount: 1,
      round: 1,
      durationMs: null,
      recordedAt,
    }
  }

  it('ordena de la más reciente a la más antigua y devuelve un array nuevo', () => {
    const oldest = entryAt('2026-09-01T12:00:00.000Z')
    const middle = entryAt('2026-09-05T12:00:00.000Z')
    const newest = entryAt('2026-09-10T12:00:00.000Z')
    const entrada = [middle, oldest, newest]

    const resultado = sortEntriesByRecency(entrada)

    expect(resultado).toEqual([newest, middle, oldest])
    expect(resultado).not.toBe(entrada)
    // El original no se muta: conserva su orden de inserción.
    expect(entrada).toEqual([middle, oldest, newest])
  })
})

describe('WR-06: orden cronológico real, no colación de cadena', () => {
  function entryAt(recordedAt: string): GameHistoryEntry {
    return {
      id: `id-${recordedAt}`,
      gameId: 'marvel-champions',
      result: 'won',
      lossCause: null,
      villainId: null,
      villainName: null,
      players: [],
      difficulty: 'normal',
      playerCount: 1,
      round: 1,
      durationMs: null,
      recordedAt,
    }
  }

  it('WR-06: el orden es por instante, no por colación de cadena', () => {
    // Mismo instante representado con formatos distintos: '...+02:00' es
    // 2026-09-10T12:00:00.000Z (12:00 UTC) y '...Z' es 2026-09-10T13:00:00.000Z
    // (13:00 UTC) — la segunda es la MÁS RECIENTE por instante, pero una
    // comparación de cadenas la coloca antes porque '13' < '14' lexicográficamente.
    // Verificado con Date.parse al escribir el test: ambos casos dan órdenes opuestos.
    const conOffset = entryAt('2026-09-10T14:00:00.000+02:00') // instante: 12:00 UTC
    const conZ = entryAt('2026-09-10T13:00:00.000Z') // instante: 13:00 UTC, más reciente

    const resultado = sortEntriesByRecency([conOffset, conZ])

    expect(resultado).toEqual([conZ, conOffset])
  })

  it('WR-06: una entrada con recordedAt no parseable queda al final y no altera el orden relativo de las demás', () => {
    const masReciente = entryAt('2026-09-10T12:00:00.000Z')
    const masAntigua = entryAt('2026-09-01T12:00:00.000Z')
    const ilegible = entryAt('ayer')

    const resultado = sortEntriesByRecency([ilegible, masReciente, masAntigua])

    expect(resultado).toEqual([masReciente, masAntigua, ilegible])
  })

  it('WR-06: dos entradas con el mismo recordedAt conservan su orden de inserción (estabilidad)', () => {
    const primera = entryAt('2026-09-10T12:00:00.000Z')
    const segunda = entryAt('2026-09-10T12:00:00.000Z')
    const masAntigua = entryAt('2026-09-01T12:00:00.000Z')

    const resultado = sortEntriesByRecency([primera, segunda, masAntigua])

    expect(resultado).toEqual([primera, segunda, masAntigua])
  })
})

describe('no-mutación: buildHistoryEntry no modifica session ni names', () => {
  it('la sesión recibida no cambia', () => {
    const session = baseSession({
      context: baseContext({
        selection: { villainId: 'rhino', heroes: [{ heroId: 'thor', playerName: 'Ana' }, { heroId: null, playerName: '' }, { heroId: null, playerName: '' }] },
        startedAt: NOON_UTC_MS - 1_000,
      }),
    })
    const snapshot = JSON.stringify(session)
    const names = { villainName: 'Rhino', heroNames: { thor: 'Thor' } }
    buildHistoryEntry(session, 'won', NOON_UTC_MS, names)
    expect(JSON.stringify(session)).toBe(snapshot)
  })

  it('el objeto names recibido no cambia', () => {
    const session = baseSession({
      context: baseContext({
        selection: { villainId: 'rhino', heroes: [{ heroId: 'thor', playerName: 'Ana' }, { heroId: null, playerName: '' }, { heroId: null, playerName: '' }] },
      }),
    })
    const names = { villainName: 'Rhino', heroNames: { thor: 'Thor' } }
    const snapshot = JSON.stringify(names)
    buildHistoryEntry(session, 'won', NOON_UTC_MS, names)
    expect(JSON.stringify(names)).toBe(snapshot)
  })
})

describe('id: aleatorio, con la forma esperada', () => {
  it('cumple /^\\d+-[a-z0-9]+$/', () => {
    const entry = buildHistoryEntry(baseSession(), 'won', NOON_UTC_MS, emptyNames)
    expect(entry.id).toMatch(/^\d+-[a-z0-9]+$/)
  })
})
