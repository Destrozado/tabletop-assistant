// engine/__tests__/statistics.test.ts
// Cobertura de la agregación estadística (Fase 9, plan 03): D-23/D-24/D-25/
// D-26/D-12. `describe` nombrados por la decisión que fijan, mismo patrón
// que engine/__tests__/history.test.ts. Ayudante local que construye
// `GameHistoryEntry` a mano, sin fixtures de fichero.
import { describe, expect, it } from 'vitest'
import { aggregateStatistics, winPercentage } from '../statistics'
import type { GameHistoryEntry, HistoryPlayerEntry } from '../types'

function makePlayer(overrides: Partial<HistoryPlayerEntry> = {}): HistoryPlayerEntry {
  return {
    heroId: 'thor',
    heroName: 'Thor',
    playerName: 'Ana',
    ...overrides,
  }
}

function makeEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    id: `${Math.random().toString(36).slice(2, 8)}`,
    gameId: 'marvel-champions',
    result: 'won',
    lossCause: null,
    villainId: 'rhino',
    villainName: 'Rhino',
    players: [makePlayer()],
    difficulty: 'normal',
    playerCount: 1,
    round: 3,
    durationMs: 1000,
    recordedAt: '2026-09-10T09:00:00.000Z',
    ...overrides,
  }
}

// IN-13 (09-REVIEW.md, cerrado en la quick 260923-3rl): Math.round podía
// anunciar «100 %» sin pleno exacto (199 de 200 redondeaba a 100 %) — la
// etiqueta completa («199 de 200 · 100 %») desmentía al porcentaje en la
// misma línea. Decisión propia (documentada en el SUMMARY): se acota
// también el extremo bajo (1 de 201 ya no pinta «0 %»), el mismo defecto en
// la misma línea que el propio IN-05/engine/history.ts señala como
// antipatrón de esta fase — endurecer un lado del contrato y dejar el
// vecino sin revisar.
describe('IN-13: winPercentage nunca anuncia un extremo que el recuento no respalda', () => {
  it('199 de 200 (pleno casi exacto) da 99, nunca 100', () => {
    expect(winPercentage(199, 200)).toBe(99)
  })

  it('200 de 200 (pleno exacto) da 100', () => {
    expect(winPercentage(200, 200)).toBe(100)
  })

  it('1 de 1 (pleno exacto) da 100', () => {
    expect(winPercentage(1, 1)).toBe(100)
  })

  it('1 de 201 (casi ninguna victoria) da 1, nunca 0', () => {
    expect(winPercentage(1, 201)).toBe(1)
  })

  it('0 de 5 (ninguna victoria) da 0', () => {
    expect(winPercentage(0, 5)).toBe(0)
  })

  it('1 de 2 da 50 (redondeo normal, sin acotar)', () => {
    expect(winPercentage(1, 2)).toBe(50)
  })

  it('2 de 3 da 67', () => {
    expect(winPercentage(2, 3)).toBe(67)
  })

  it('3 de 4 da 75', () => {
    expect(winPercentage(3, 4)).toBe(75)
  })

  it('0 de 0 (nunca jugado) da 0', () => {
    expect(winPercentage(0, 0)).toBe(0)
  })
})

describe('IN-13: aggregateStatistics usa winPercentage y respeta la cascada D-24 con el pct acotado', () => {
  it('un héroe a 199 de 200 sale con pct 99 y queda por debajo de otro a 1 de 1 (pct 100)', () => {
    const entries: GameHistoryEntry[] = []
    for (let i = 0; i < 199; i++) {
      entries.push(makeEntry({
        result: 'won',
        players: [makePlayer({ heroId: 'casi-pleno', heroName: 'Casi Pleno' })],
      }))
    }
    entries.push(makeEntry({
      result: 'lost',
      lossCause: 'heroesEliminated',
      players: [makePlayer({ heroId: 'casi-pleno', heroName: 'Casi Pleno' })],
    }))
    entries.push(makeEntry({
      result: 'won',
      players: [makePlayer({ heroId: 'pleno', heroName: 'Pleno' })],
    }))

    const summary = aggregateStatistics(entries)
    const byId = Object.fromEntries(summary.heroRows.map(r => [r.id, r]))
    expect(byId['casi-pleno']).toMatchObject({ wins: 199, played: 200, pct: 99 })
    expect(byId.pleno).toMatchObject({ wins: 1, played: 1, pct: 100 })

    const order = summary.heroRows.map(r => r.id)
    expect(order.indexOf('pleno')).toBeLessThan(order.indexOf('casi-pleno'))
  })
})

describe('D-26 (atribución cooperativa)', () => {
  it('una victoria a 3 jugadores suma 1 victoria a los tres héroes distintos', () => {
    const entry = makEntryConVarios()
    const summary = aggregateStatistics([entry])
    const byId = Object.fromEntries(summary.heroRows.map(r => [r.id, r]))
    expect(byId.thor).toMatchObject({ wins: 1, played: 1 })
    expect(byId['iron-man']).toMatchObject({ wins: 1, played: 1 })
    expect(byId['she-hulk']).toMatchObject({ wins: 1, played: 1 })
  })
})

function makEntryConVarios(): GameHistoryEntry {
  return makeEntry({
    result: 'won',
    players: [
      makePlayer({ heroId: 'thor', heroName: 'Thor', playerName: 'Ana' }),
      makePlayer({ heroId: 'iron-man', heroName: 'Iron Man', playerName: 'Luis' }),
      makePlayer({ heroId: 'she-hulk', heroName: 'Hulka', playerName: 'Jugador 3' }),
    ],
  })
}

describe('D-26 (una vez por héroe distinto, no por hueco)', () => {
  it('una entrada con el mismo heroId en dos huecos suma played: 1 a ese héroe, no 2', () => {
    const entry = makeEntry({
      result: 'won',
      players: [
        makePlayer({ heroId: 'thor', heroName: 'Thor', playerName: 'Ana' }),
        makePlayer({ heroId: 'thor', heroName: 'Thor', playerName: 'Luis' }),
      ],
    })
    const summary = aggregateStatistics([entry])
    expect(summary.heroRows).toHaveLength(1)
    expect(summary.heroRows[0]).toMatchObject({ id: 'thor', played: 1, wins: 1 })
  })
})

describe('D-24 (cascada de orden)', () => {
  it('dos filas con % distinto se ordenan por %', () => {
    const entries = [
      makeEntry({ result: 'won', players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] }),
      makeEntry({ result: 'lost', lossCause: 'heroesEliminated', players: [makePlayer({ heroId: 'iron-man', heroName: 'Iron Man' })] }),
    ]
    const summary = aggregateStatistics(entries)
    expect(summary.heroRows.map(r => r.id)).toEqual(['thor', 'iron-man'])
  })

  it('dos filas con el mismo % se ordenan por partidas jugadas', () => {
    const entries = [
      makeEntry({ result: 'won', players: [makePlayer({ heroId: 'iron-man', heroName: 'Iron Man' })] }),
      makeEntry({ result: 'won', players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] }),
      makeEntry({ result: 'won', players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] }),
    ]
    const summary = aggregateStatistics(entries)
    // ambos al 100%, Thor con 2 partidas jugadas frente a 1 de Iron Man
    expect(summary.heroRows.map(r => r.id)).toEqual(['thor', 'iron-man'])
  })

  it('dos filas con el mismo % y las mismas partidas se ordenan alfabéticamente en español', () => {
    const entries = [
      makeEntry({ result: 'won', players: [makePlayer({ heroId: 'union-jack', heroName: 'Úlfric' })] }),
      makeEntry({ result: 'won', players: [makePlayer({ heroId: 'angela', heroName: 'Angela' })] }),
    ]
    const summary = aggregateStatistics(entries)
    // ambos 1 de 1 · 100%: "Angela" va antes que "Úlfric" en orden alfabético español
    expect(summary.heroRows.map(r => r.name)).toEqual(['Angela', 'Úlfric'])
  })
})

describe('D-25 (sin umbral)', () => {
  it('una fila «1 de 1» aparece con pct: 100', () => {
    const entry = makeEntry({ result: 'won', players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] })
    const summary = aggregateStatistics([entry])
    expect(summary.heroRows[0]).toMatchObject({ played: 1, wins: 1, pct: 100 })
  })
})

describe('D-23 (solo jugados)', () => {
  it('un héroe que no aparece en ninguna entrada no produce fila', () => {
    const entry = makeEntry({ players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] })
    const summary = aggregateStatistics([entry])
    expect(summary.heroRows.find(r => r.id === 'iron-man')).toBeUndefined()
  })

  it('con entries vacío, heroRows y villainRows son arrays vacíos y totalEntries es 0', () => {
    const summary = aggregateStatistics([])
    expect(summary.heroRows).toEqual([])
    expect(summary.villainRows).toEqual([])
    expect(summary.totalEntries).toBe(0)
    expect(summary.entriesWithHeroes).toBe(0)
  })
})

describe('D-12 (muestra declarada)', () => {
  it('con 3 entradas de las que 1 no tiene ningún héroe, totalEntries es 3 y entriesWithHeroes es 2', () => {
    const sinHeroes = makeEntry({
      villainId: null,
      villainName: null,
      players: [makePlayer({ heroId: null, heroName: null, playerName: 'Jugador 1' })],
    })
    const conHeroes1 = makeEntry({ players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] })
    const conHeroes2 = makeEntry({ players: [makePlayer({ heroId: 'iron-man', heroName: 'Iron Man' })] })
    const summary = aggregateStatistics([sinHeroes, conHeroes1, conHeroes2])
    expect(summary.totalEntries).toBe(3)
    expect(summary.entriesWithHeroes).toBe(2)
    expect(summary.heroRows).toHaveLength(2)
  })
})

describe('Villanos', () => {
  it('agrupa por villainId y el nombre congelado ganador es el más reciente', () => {
    // entries llega del más reciente al más antiguo (mismo orden que loadHistory)
    const masReciente = makeEntry({ villainId: 'kang', villainName: 'Kang el Conquistador' })
    const masAntigua = makeEntry({ villainId: 'kang', villainName: 'Kang' })
    const summary = aggregateStatistics([masReciente, masAntigua])
    expect(summary.villainRows).toHaveLength(1)
    expect(summary.villainRows[0]).toMatchObject({ id: 'kang', name: 'Kang el Conquistador', played: 2 })
  })

  it('una entrada con villainId: null no produce fila', () => {
    const entry = makeEntry({ villainId: null, villainName: null })
    const summary = aggregateStatistics([entry])
    expect(summary.villainRows).toEqual([])
  })
})

describe('CR-02: defensa en profundidad ante id/name no-string', () => {
  it('CR-02: con dos entradas de villano y una con villainId numérico, aggregateStatistics no lanza (orden A)', () => {
    const numerica = makeEntry({ villainId: 5 as never, villainName: null })
    const normal = makeEntry({ villainId: 'rhino', villainName: 'Rhino' })
    expect(() => aggregateStatistics([numerica, normal])).not.toThrow()
    const summary = aggregateStatistics([numerica, normal])
    expect(summary.villainRows).toHaveLength(2)
    for (const row of summary.villainRows) {
      expect(typeof row.id).toBe('string')
      expect(typeof row.name).toBe('string')
    }
  })

  it('CR-02: con dos entradas de villano y una con villainId numérico, aggregateStatistics no lanza (orden B, invertido)', () => {
    const numerica = makeEntry({ villainId: 5 as never, villainName: null })
    const normal = makeEntry({ villainId: 'rhino', villainName: 'Rhino' })
    expect(() => aggregateStatistics([normal, numerica])).not.toThrow()
    const summary = aggregateStatistics([normal, numerica])
    expect(summary.villainRows).toHaveLength(2)
    for (const row of summary.villainRows) {
      expect(typeof row.id).toBe('string')
      expect(typeof row.name).toBe('string')
    }
  })

  it('CR-02: con dos entradas de héroe y una con heroId numérico, aggregateStatistics no lanza (orden A)', () => {
    const numerico = makeEntry({ players: [makePlayer({ heroId: 7 as never, heroName: null })] })
    const normal = makeEntry({ players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] })
    expect(() => aggregateStatistics([numerico, normal])).not.toThrow()
    const summary = aggregateStatistics([numerico, normal])
    expect(summary.heroRows).toHaveLength(2)
    for (const row of summary.heroRows) {
      expect(typeof row.id).toBe('string')
      expect(typeof row.name).toBe('string')
    }
  })

  it('CR-02: con dos entradas de héroe y una con heroId numérico, aggregateStatistics no lanza (orden B, invertido)', () => {
    const numerico = makeEntry({ players: [makePlayer({ heroId: 7 as never, heroName: null })] })
    const normal = makeEntry({ players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] })
    expect(() => aggregateStatistics([normal, numerico])).not.toThrow()
    const summary = aggregateStatistics([normal, numerico])
    expect(summary.heroRows).toHaveLength(2)
    for (const row of summary.heroRows) {
      expect(typeof row.id).toBe('string')
      expect(typeof row.name).toBe('string')
    }
  })

  it('CR-02: el id de la fila también se coerciona (villainId numérico 5 produce id "5")', () => {
    const numerica = makeEntry({ villainId: 5 as never, villainName: null })
    const normal = makeEntry({ villainId: 'rhino', villainName: 'Rhino' })
    const summary = aggregateStatistics([numerica, normal])
    const fila = summary.villainRows.find(r => r.id === '5')
    expect(fila).toBeDefined()
    expect(fila!.id).toBe('5')
  })
})

describe('No-mutación', () => {
  it('aggregateStatistics no modifica el array recibido ni sus entradas', () => {
    const entries = [
      makeEntry({ players: [makePlayer({ heroId: 'thor', heroName: 'Thor' })] }),
      makeEntry({ villainId: null, villainName: null, players: [makePlayer({ heroId: null, heroName: null })] }),
    ]
    const copy = JSON.parse(JSON.stringify(entries))
    aggregateStatistics(entries)
    expect(entries).toEqual(copy)
  })
})
