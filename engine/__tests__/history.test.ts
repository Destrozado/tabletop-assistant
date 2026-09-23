import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildHistoryEntry,
  describeLossCause,
  formatEntryDate,
  formatEntryDuration,
  freezeEndInstant,
  sortEntriesByRecency,
} from '../history'
import type { EngineSession, GameHistoryEntry, RuntimeStepNode, SessionContext } from '../types'

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

// makeNode (quick 260923-3rm, WR-06 ronda 4): mismo patrón que
// engine/__tests__/resolve.test.ts — un nodo mínimo pero completo de
// RuntimeStepNode, para construir sesiones con `sequence[cursor]` real que
// `freezeEndInstant`/`buildHistoryEntry` puedan validar contra un
// `runtimeId` de verdad.
function makeNode(runtimeId: string): RuntimeStepNode {
  return {
    runtimeId,
    sectionId: 'test',
    sectionTitle: 'Test',
    sectionRepeats: false,
    phaseId: 'test.phase',
    phaseTitle: 'Fase',
    breadcrumb: 'Test › Fase',
    step: {
      id: runtimeId,
      title: 'Paso de prueba',
      kind: 'step',
      text: 'Texto base.',
    },
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

// BF-03 (09-17, barrido de fronteras — WR-06 de 09-REVIEW.md): tres cifras
// imposibles que formatEntryDuration podía pintar antes de este plan. Estos
// tests conviven en el mismo describe D-21 sin tocar los existentes de
// arriba — anti-regresión de las tres cadenas ya fijadas incluida al final.
describe('BF-03 (09-17): formatEntryDuration sin "1 h 0 min", sin "0 min" y sin negativos', () => {
  it('formatEntryDuration(3_600_000) (exactamente 1h) devuelve "1 h", nunca "1 h 0 min"', () => {
    expect(formatEntryDuration(3_600_000)).toBe('1 h')
  })

  it('formatEntryDuration(7_200_000) (exactamente 2h) devuelve "2 h"', () => {
    expect(formatEntryDuration(7_200_000)).toBe('2 h')
  })

  it('formatEntryDuration(20_000) (20 s) devuelve "1 min", nunca "0 min"', () => {
    expect(formatEntryDuration(20_000)).toBe('1 min')
  })

  it('formatEntryDuration(0) devuelve "1 min", nunca "0 min"', () => {
    expect(formatEntryDuration(0)).toBe('1 min')
  })

  it('formatEntryDuration(-6_000_000) (negativo) devuelve "—", nunca "-2 h -40 min"', () => {
    expect(formatEntryDuration(-6_000_000)).toBe('—')
  })

  it('formatEntryDuration(Number.NEGATIVE_INFINITY) devuelve "—"', () => {
    expect(formatEntryDuration(Number.NEGATIVE_INFINITY)).toBe('—')
  })

  it('anti-regresión: las tres cadenas ya fijadas por D-21 no cambian', () => {
    expect(formatEntryDuration(6_000_000)).toBe('1 h 40 min')
    expect(formatEntryDuration(120_000)).toBe('2 min')
    expect(formatEntryDuration(null)).toBe('—')
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

// IN-05 (09-REVIEW.md, cerrado en la quick 260923-3rl): el id deja de
// construirse con el sufijo base36 de Math.random (`Math.random() === 0`
// producía un sufijo vacío, incumpliendo el regex que el test antiguo
// fijaba) y pasa a usar crypto.randomUUID() cuando está disponible (Node 24
// lo expone). El regex antiguo `/^\d+-[a-z0-9]+$/` se sustituye aquí por el
// nuevo contrato — IN-05 pide expresamente actualizarlo, no conservarlo.
describe('id (IN-05): crypto.randomUUID con respaldo sin lanzar', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('con crypto.randomUUID disponible, el id cumple el formato UUID v4', () => {
    const entry = buildHistoryEntry(baseSession(), 'won', NOON_UTC_MS, emptyNames)
    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('dos entradas construidas con el mismo now tienen ids distintos', () => {
    const a = buildHistoryEntry(baseSession(), 'won', NOON_UTC_MS, emptyNames)
    const b = buildHistoryEntry(baseSession(), 'won', NOON_UTC_MS, emptyNames)
    expect(a.id).not.toBe(b.id)
  })

  it('sin crypto.randomUUID (contexto no seguro) y con Math.random forzado a 0, buildHistoryEntry no lanza y el id es exactamente `${NOON_UTC_MS}-0000000000` (el sufijo vacío que IN-05 describía queda cerrado)', () => {
    vi.stubGlobal('crypto', undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    let entry: GameHistoryEntry | undefined
    expect(() => {
      entry = buildHistoryEntry(baseSession(), 'won', NOON_UTC_MS, emptyNames)
    }).not.toThrow()

    expect(entry!.id).toBe(`${NOON_UTC_MS}-0000000000`)
  })
})

describe('CR-01 (ronda 2): buildHistoryEntry normaliza en origen y nunca propaga un hueco', () => {
  it('con context: {} la entrada tiene difficulty "normal", playerCount 0 y players de longitud 0, y las claves están presentes', () => {
    const session = baseSession({ context: {} as SessionContext })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.difficulty).toBe('normal')
    expect(entry.playerCount).toBe(0)
    expect(entry.players).toHaveLength(0)
    // Es justo lo que JSON.stringify eliminaba y lo que hacía desaparecer
    // la partida: la clave debe existir con un valor, no estar ausente.
    expect(Object.hasOwn(entry, 'difficulty')).toBe(true)
    expect(Object.hasOwn(entry, 'playerCount')).toBe(true)
  })

  it('difficulty solo es "expert" si context.difficulty es exactamente esa cadena; cualquier otra cosa cae a "normal"', () => {
    const imposible = buildHistoryEntry(
      baseSession({ context: baseContext({ difficulty: 'imposible' as never }) }),
      'won',
      NOON_UTC_MS,
      emptyNames,
    )
    expect(imposible.difficulty).toBe('normal')

    const indefinida = buildHistoryEntry(
      baseSession({ context: baseContext({ difficulty: undefined as never }) }),
      'won',
      NOON_UTC_MS,
      emptyNames,
    )
    expect(indefinida.difficulty).toBe('normal')

    const experto = buildHistoryEntry(
      baseSession({ context: baseContext({ difficulty: 'expert' }) }),
      'won',
      NOON_UTC_MS,
      emptyNames,
    )
    expect(experto.difficulty).toBe('expert')
  })

  it('un playerCount que no es entero positivo cae a players.length, en todos los casos hostiles', () => {
    for (const playerCount of [Number.NaN, -3, 2.5, undefined]) {
      const entry = buildHistoryEntry(
        baseSession({ context: baseContext({ playerCount: playerCount as never }) }),
        'won',
        NOON_UTC_MS,
        emptyNames,
      )
      expect(entry.playerCount).toBe(entry.players.length)
    }
  })

  it('con playerCount: 3 válido y tres héroes seleccionados, playerCount === 3 y players.length === 3 (camino feliz)', () => {
    const session = baseSession({
      context: baseContext({
        playerCount: 3,
        selection: {
          villainId: null,
          heroes: [
            { heroId: 'thor', playerName: 'Ana' },
            { heroId: 'she-hulk', playerName: 'Luis' },
            { heroId: 'spider-man', playerName: 'Marta' },
          ],
        },
      }),
    })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.playerCount).toBe(3)
    expect(entry.players).toHaveLength(3)
  })

  it('un round que no es entero >= 1 cae a 1, en todos los casos hostiles; round: 7 sigue devolviendo 7', () => {
    for (const round of [Number.NaN, 0, -4, 2.5]) {
      const entry = buildHistoryEntry(baseSession({ round: round as never }), 'won', NOON_UTC_MS, emptyNames)
      expect(entry.round).toBe(1)
    }
    const entry7 = buildHistoryEntry(baseSession({ round: 7 }), 'won', NOON_UTC_MS, emptyNames)
    expect(entry7.round).toBe(7)
  })
})

// CR-02 (ronda 3): las ocho claves heredadas de Object.prototype — declarada
// una sola vez aquí y reutilizada en el `it.each` de todo el describe, para
// que añadir una novena clave en el futuro sea una sola línea.
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

function sessionWithHeroId(heroId: string): EngineSession {
  return baseSession({
    context: baseContext({
      playerCount: 1,
      selection: { villainId: null, heroes: [{ heroId, playerName: 'Ana' }] },
    }),
  })
}

describe('CR-02 (ronda 3): el mapa de nombres congelados se indexa con dato no confiable — la cadena de prototipos no participa', () => {
  it.each(PROTOTYPE_KEYS)('un heroId igual a "%s" produce heroName null, nunca una función heredada de Object.prototype', (heroId) => {
    const entry = buildHistoryEntry(sessionWithHeroId(heroId), 'won', NOON_UTC_MS, emptyNames)
    expect(entry.players[0]!.heroName).toBeNull()
    // La aserción que describe el síntoma real observado por el
    // verificador: sin objeto sin prototipo, `heroName` era la FUNCIÓN
    // `Object`/`toString`/etc., no `undefined` ni `null`.
    expect(typeof entry.players[0]!.heroName !== 'function').toBe(true)
  })

  it.each(PROTOTYPE_KEYS)('la entrada resultante para "%s" supera el contrato de escritura (heroName null|string)', (heroId) => {
    const entry = buildHistoryEntry(sessionWithHeroId(heroId), 'won', NOON_UTC_MS, emptyNames)
    expect(entry.players.every(p => p.heroName === null || typeof p.heroName === 'string')).toBe(true)
  })

  it('camino feliz intacto: con heroNames creado con Object.create(null) y la clave spider-man, heroName es "Spider-Man"', () => {
    const heroNames: Record<string, string> = Object.create(null)
    heroNames['spider-man'] = 'Spider-Man'
    const entry = buildHistoryEntry(sessionWithHeroId('spider-man'), 'won', NOON_UTC_MS, { villainName: null, heroNames })
    expect(entry.players[0]!.heroName).toBe('Spider-Man')
  })

  it('camino feliz intacto (D-11): con heroNames literal {} y un heroId normal ausente, heroName sigue siendo null', () => {
    const entry = buildHistoryEntry(sessionWithHeroId('thor'), 'won', NOON_UTC_MS, { villainName: null, heroNames: {} })
    expect(entry.players[0]!.heroName).toBeNull()
  })

  it('valor presente pero de tipo equivocado (número): heroName es null, no el número', () => {
    const heroNames = { 'spider-man': 7 } as unknown as Record<string, string>
    const entry = buildHistoryEntry(sessionWithHeroId('spider-man'), 'won', NOON_UTC_MS, { villainName: null, heroNames })
    expect(entry.players[0]!.heroName).toBeNull()
  })

  it('heroNames que no es un objeto en absoluto (null y una cadena): buildHistoryEntry no lanza y heroName es null', () => {
    for (const heroNamesHostil of [null, 'no-es-un-objeto']) {
      let entry: GameHistoryEntry | undefined
      expect(() => {
        entry = buildHistoryEntry(
          sessionWithHeroId('spider-man'),
          'won',
          NOON_UTC_MS,
          { villainName: null, heroNames: heroNamesHostil as never },
        )
      }).not.toThrow()
      expect(entry!.players[0]!.heroName).toBeNull()
    }
  })

  it('villainName no-string (un número y un objeto) produce null; "Rhino" sigue viajando intacto', () => {
    const session = baseSession({
      context: baseContext({ selection: { villainId: 'rhino', heroes: [] } }),
    })

    for (const villainNameHostil of [7, { nombre: 'Rhino' }]) {
      const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, { villainName: villainNameHostil as never, heroNames: {} })
      expect(entry.villainName).toBeNull()
    }

    const entryFeliz = buildHistoryEntry(session, 'won', NOON_UTC_MS, { villainName: 'Rhino', heroNames: {} })
    expect(entryFeliz.villainName).toBe('Rhino')
  })
})

// WR-06 (ronda 4, quick 260923-3rm): congelar el instante del desenlace para
// que un reintento de registro (tras un fallo de escritura del histórico)
// mida la duración hasta el momento en que el grupo pulsó un resultado, no
// hasta el momento del reintento — sin tocar D-07 (startedAt nunca se
// reescribe) ni D-08 (reloj de pared sin tope, sin acumular tiempo activo).
describe('freezeEndInstant (WR-06 ronda 4): sella el primer instante en una posición y no lo pisa', () => {
  it('sesión sin sello: devuelve una sesión NUEVA con context.endedAt = { at, runtimeId, round } y no muta la entrada', () => {
    const node = makeNode('loop.turno.02')
    const session = baseSession({ sequence: [node], cursor: 0, round: 3 })
    const snapshot = JSON.stringify(session)

    const result = freezeEndInstant(session, NOON_UTC_MS)

    expect(result).not.toBe(session)
    expect(result.context.endedAt).toEqual({ at: NOON_UTC_MS, runtimeId: 'loop.turno.02', round: 3 })
    expect(JSON.stringify(session)).toBe(snapshot)
  })

  it('aplicado dos veces en la misma posición conserva el PRIMER at (misma referencia devuelta en la segunda llamada)', () => {
    const node = makeNode('loop.turno.02')
    const session = baseSession({ sequence: [node], cursor: 0, round: 3 })

    const first = freezeEndInstant(session, NOON_UTC_MS)
    const second = freezeEndInstant(first, NOON_UTC_MS + 3_600_000)

    expect(second).toBe(first)
    expect(second.context.endedAt).toEqual({ at: NOON_UTC_MS, runtimeId: 'loop.turno.02', round: 3 })
  })

  it('tras mover el cursor (otro runtimeId) sustituye el sello por uno nuevo con el now nuevo', () => {
    const nodeA = makeNode('loop.turno.02')
    const nodeB = makeNode('loop.turno.03')
    const session = baseSession({ sequence: [nodeA], cursor: 0, round: 3 })
    const sealed = freezeEndInstant(session, NOON_UTC_MS)

    const moved = { ...sealed, sequence: [nodeB], cursor: 0 }
    const resealed = freezeEndInstant(moved, NOON_UTC_MS + 3_600_000)

    expect(resealed.context.endedAt).toEqual({ at: NOON_UTC_MS + 3_600_000, runtimeId: 'loop.turno.03', round: 3 })
  })

  it('tras cambiar round sustituye el sello por uno nuevo con el now nuevo', () => {
    const node = makeNode('loop.turno.02')
    const session = baseSession({ sequence: [node], cursor: 0, round: 3 })
    const sealed = freezeEndInstant(session, NOON_UTC_MS)

    const roundChanged = { ...sealed, round: 4 }
    const resealed = freezeEndInstant(roundChanged, NOON_UTC_MS + 3_600_000)

    expect(resealed.context.endedAt).toEqual({ at: NOON_UTC_MS + 3_600_000, runtimeId: 'loop.turno.02', round: 4 })
  })

  it('con cursor fuera de rango devuelve la sesión sin cambios', () => {
    const session = baseSession({ sequence: [], cursor: 0, round: 1 })
    const result = freezeEndInstant(session, NOON_UTC_MS)
    expect(result).toBe(session)
  })

  it('con now no finito devuelve la sesión sin cambios', () => {
    const node = makeNode('loop.turno.02')
    const session = baseSession({ sequence: [node], cursor: 0, round: 3 })
    for (const now of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(freezeEndInstant(session, now)).toBe(session)
    }
  })
})

describe('buildHistoryEntry usa el sello congelado como instante de referencia (WR-06 ronda 4)', () => {
  it('con sello válido en la posición actual y now = sello + 24h: durationMs === sello - startedAt y recordedAt === new Date(sello).toISOString()', () => {
    const node = makeNode('loop.turno.02')
    const startedAt = NOON_UTC_MS - 6_000_000
    const sealedAt = NOON_UTC_MS
    const now = sealedAt + 24 * 60 * 60 * 1000
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 3,
      context: baseContext({ startedAt, endedAt: { at: sealedAt, runtimeId: 'loop.turno.02', round: 3 } }),
    })

    const entry = buildHistoryEntry(session, 'won', now, emptyNames)

    expect(entry.durationMs).toBe(sealedAt - startedAt)
    expect(entry.recordedAt).toBe(new Date(sealedAt).toISOString())
  })

  it('con sello de otra posición (runtimeId distinto): durationMs === now - startedAt y recordedAt de now (D-08 tal cual)', () => {
    const node = makeNode('loop.turno.03')
    const startedAt = NOON_UTC_MS - 6_000_000
    const now = NOON_UTC_MS + 24 * 60 * 60 * 1000
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 3,
      context: baseContext({ startedAt, endedAt: { at: NOON_UTC_MS, runtimeId: 'loop.turno.02', round: 3 } }),
    })

    const entry = buildHistoryEntry(session, 'won', now, emptyNames)

    expect(entry.durationMs).toBe(now - startedAt)
    expect(entry.recordedAt).toBe(new Date(now).toISOString())
  })

  it('con sello de otra posición (round distinta): durationMs === now - startedAt y recordedAt de now', () => {
    const node = makeNode('loop.turno.02')
    const startedAt = NOON_UTC_MS - 6_000_000
    const now = NOON_UTC_MS + 24 * 60 * 60 * 1000
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 4,
      context: baseContext({ startedAt, endedAt: { at: NOON_UTC_MS, runtimeId: 'loop.turno.02', round: 3 } }),
    })

    const entry = buildHistoryEntry(session, 'won', now, emptyNames)

    expect(entry.durationMs).toBe(now - startedAt)
    expect(entry.recordedAt).toBe(new Date(now).toISOString())
  })

  it('sello corrupto (at: NaN) se ignora y no lanza', () => {
    const node = makeNode('loop.turno.02')
    const now = NOON_UTC_MS
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 3,
      context: baseContext({ endedAt: { at: Number.NaN, runtimeId: 'loop.turno.02', round: 3 } }),
    })

    let entry: GameHistoryEntry | undefined
    expect(() => {
      entry = buildHistoryEntry(session, 'won', now, emptyNames)
    }).not.toThrow()
    expect(entry!.recordedAt).toBe(new Date(now).toISOString())
  })

  it('sello corrupto (at > now) se ignora — no se puede afirmar un desenlace en el futuro', () => {
    const node = makeNode('loop.turno.02')
    const now = NOON_UTC_MS
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 3,
      context: baseContext({ endedAt: { at: now + 1_000, runtimeId: 'loop.turno.02', round: 3 } }),
    })

    const entry = buildHistoryEntry(session, 'won', now, emptyNames)
    expect(entry.recordedAt).toBe(new Date(now).toISOString())
  })

  it('sello corrupto (at < startedAt) se ignora — un desenlace no puede preceder al inicio de la partida', () => {
    const node = makeNode('loop.turno.02')
    const startedAt = NOON_UTC_MS - 1_000
    const now = NOON_UTC_MS + 10_000
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 3,
      context: baseContext({ startedAt, endedAt: { at: startedAt - 1, runtimeId: 'loop.turno.02', round: 3 } }),
    })

    const entry = buildHistoryEntry(session, 'won', now, emptyNames)
    expect(entry.durationMs).toBe(now - startedAt)
    expect(entry.recordedAt).toBe(new Date(now).toISOString())
  })

  it('sello corrupto (endedAt no es un objeto) se ignora y no lanza', () => {
    const node = makeNode('loop.turno.02')
    const now = NOON_UTC_MS
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 3,
      context: { ...baseContext(), endedAt: 'no-es-un-objeto' as never },
    })

    let entry: GameHistoryEntry | undefined
    expect(() => {
      entry = buildHistoryEntry(session, 'won', now, emptyNames)
    }).not.toThrow()
    expect(entry!.recordedAt).toBe(new Date(now).toISOString())
  })

  it('sello corrupto (runtimeId no es cadena) se ignora y no lanza', () => {
    const node = makeNode('loop.turno.02')
    const now = NOON_UTC_MS
    const session = baseSession({
      sequence: [node],
      cursor: 0,
      round: 3,
      context: { ...baseContext(), endedAt: { at: now, runtimeId: 7, round: 3 } as never },
    })

    let entry: GameHistoryEntry | undefined
    expect(() => {
      entry = buildHistoryEntry(session, 'won', now, emptyNames)
    }).not.toThrow()
    expect(entry!.recordedAt).toBe(new Date(now).toISOString())
  })

  it('los tests existentes de durationMs (sin sello) siguen en verde: sin endedAt, durationMs es now - startedAt', () => {
    const startedAt = NOON_UTC_MS - 6_000_000
    const session = baseSession({ context: baseContext({ startedAt }) })
    const entry = buildHistoryEntry(session, 'won', NOON_UTC_MS, emptyNames)
    expect(entry.durationMs).toBe(NOON_UTC_MS - startedAt)
    expect(entry.recordedAt).toBe(new Date(NOON_UTC_MS).toISOString())
  })
})
