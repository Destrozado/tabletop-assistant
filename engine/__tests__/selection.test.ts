import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import {
  PLAYER_NAME_MAX_LENGTH,
  emptySelection,
  resolvePlayerSlots,
  resolveVillainId,
  setHero,
  setPlayerName,
  setVillain,
} from '../selection'
import type { EngineSession, GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

function baseSession(): EngineSession {
  return expand(tinyGame, context)
}

describe('desigualdad referencial (Pitfall 1 / SEL-08)', () => {
  it('setVillain devuelve objetos nuevos en los cinco niveles', () => {
    const session = setHero(setVillain(baseSession(), 'ultron'), 0, 'thor')
    const result = setVillain(session, 'rhino')

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.selection).not.toBe(session.context.selection)
    expect(result.context.selection!.heroes).not.toBe(session.context.selection!.heroes)
    // setVillain reconstruye heroes[] entero vía resolvePlayerSlots, así
    // que cada entrada es también un objeto nuevo, aunque villain sea lo
    // único que cambia semánticamente.
    expect(result.context.selection!.heroes[0]).not.toBe(session.context.selection!.heroes[0])
    // El contenido de la entrada no debe cambiar.
    expect(result.context.selection!.heroes[0]).toEqual(session.context.selection!.heroes[0])
  })

  it('setHero devuelve objetos nuevos en los cinco niveles, y la entrada no tocada conserva su contenido', () => {
    const session = setVillain(baseSession(), 'rhino')
    const result = setHero(session, 1, 'thor')

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.selection).not.toBe(session.context.selection)
    expect(result.context.selection!.heroes).not.toBe(session.context.selection!.heroes)
    expect(result.context.selection!.heroes[1]).not.toBe(session.context.selection!.heroes[1])
    // La entrada NO tocada (slot 0) no es un requisito de referencia, pero
    // su CONTENIDO no debe cambiar.
    expect(result.context.selection!.heroes[0]).toEqual(session.context.selection!.heroes[0])
  })

  it('setPlayerName devuelve objetos nuevos en los cinco niveles, y la entrada no tocada conserva su contenido', () => {
    const session = setHero(setVillain(baseSession(), 'rhino'), 1, 'thor')
    const result = setPlayerName(session, 1, 'Ana')

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.selection).not.toBe(session.context.selection)
    expect(result.context.selection!.heroes).not.toBe(session.context.selection!.heroes)
    expect(result.context.selection!.heroes[1]).not.toBe(session.context.selection!.heroes[1])
    expect(result.context.selection!.heroes[0]).toEqual(session.context.selection!.heroes[0])
    expect(result.context.selection!.heroes[2]).toEqual(session.context.selection!.heroes[2])
  })
})

describe('la entrada no se modifica', () => {
  it('setVillain no muta la sesión recibida', () => {
    const session = baseSession()
    const snapshot = JSON.stringify(session)
    setVillain(session, 'rhino')
    expect(JSON.stringify(session)).toBe(snapshot)
  })

  it('setHero no muta la sesión recibida', () => {
    const session = setVillain(baseSession(), 'rhino')
    const snapshot = JSON.stringify(session)
    setHero(session, 0, 'thor')
    expect(JSON.stringify(session)).toBe(snapshot)
  })

  it('setPlayerName no muta la sesión recibida', () => {
    const session = setHero(setVillain(baseSession(), 'rhino'), 0, 'thor')
    const snapshot = JSON.stringify(session)
    setPlayerName(session, 0, 'Ana')
    expect(JSON.stringify(session)).toBe(snapshot)
  })
})

describe('arranque sin selección', () => {
  it('setHero sobre un context sin selection produce heroes.length === playerCount con solo el hueco tocado', () => {
    const session = baseSession()
    expect(session.context.selection).toBeUndefined()

    const result = setHero(session, 1, 'thor')
    expect(result.context.selection!.heroes).toHaveLength(context.playerCount)
    expect(result.context.selection!.heroes[0]).toEqual({ heroId: null, playerName: '' })
    expect(result.context.selection!.heroes[1]).toEqual({ heroId: 'thor', playerName: '' })
    expect(result.context.selection!.heroes[2]).toEqual({ heroId: null, playerName: '' })
    expect(result.context.selection!.villainId).toBeNull()
  })
})

describe('no-op defensivo', () => {
  it.each([-1, context.playerCount, 1.5, Number.NaN])('setHero con slot %s devuelve la misma referencia de sesión', (slot) => {
    const session = baseSession()
    expect(setHero(session, slot, 'thor')).toBe(session)
  })

  it.each([-1, context.playerCount, 1.5, Number.NaN])('setPlayerName con slot %s devuelve la misma referencia de sesión', (slot) => {
    const session = baseSession()
    expect(setPlayerName(session, slot, 'Ana')).toBe(session)
  })
})

describe('tope de nombre', () => {
  it('setPlayerName con 20 caracteres guarda exactamente 14', () => {
    const session = baseSession()
    const result = setPlayerName(session, 0, 'a'.repeat(20))
    expect(result.context.selection!.heroes[0].playerName).toHaveLength(PLAYER_NAME_MAX_LENGTH)
    expect(result.context.selection!.heroes[0].playerName).toBe('a'.repeat(PLAYER_NAME_MAX_LENGTH))
  })

  it('un nombre vacío se guarda como cadena vacía, no como "Jugador N"', () => {
    const session = baseSession()
    const result = setPlayerName(session, 0, '')
    expect(result.context.selection!.heroes[0].playerName).toBe('')
  })
})

describe('resolvePlayerSlots', () => {
  it('longitud igual a playerCount cuando no hay selection', () => {
    const ctx: SessionContext = { playerCount: 3, difficulty: 'normal' }
    expect(resolvePlayerSlots(ctx)).toEqual([
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
    ])
  })

  it('rellena cuando heroes es más corto que playerCount', () => {
    const ctx: SessionContext = {
      playerCount: 3,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [{ heroId: 'thor', playerName: 'Ana' }] },
    }
    expect(resolvePlayerSlots(ctx)).toEqual([
      { heroId: 'thor', playerName: 'Ana' },
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
    ])
  })

  it('trunca cuando heroes es más largo que playerCount', () => {
    const ctx: SessionContext = {
      playerCount: 2,
      difficulty: 'normal',
      selection: {
        villainId: null,
        heroes: [
          { heroId: 'thor', playerName: 'Ana' },
          { heroId: 'hulk', playerName: 'Bruno' },
          { heroId: 'wasp', playerName: 'Carla' },
        ],
      },
    }
    expect(resolvePlayerSlots(ctx)).toEqual([
      { heroId: 'thor', playerName: 'Ana' },
      { heroId: 'hulk', playerName: 'Bruno' },
    ])
  })

  it('cuando selection es null, un número o una cadena, cae a huecos vacíos', () => {
    for (const badSelection of [null, 42, 'no-es-un-objeto']) {
      const ctx = { playerCount: 2, difficulty: 'normal', selection: badSelection } as unknown as SessionContext
      expect(resolvePlayerSlots(ctx)).toEqual([
        { heroId: null, playerName: '' },
        { heroId: null, playerName: '' },
      ])
    }
  })

  it('cuando heroes no es un array, cae a huecos vacíos', () => {
    const ctx = {
      playerCount: 2,
      difficulty: 'normal',
      selection: { villainId: null, heroes: 'no-es-un-array' },
    } as unknown as SessionContext
    expect(resolvePlayerSlots(ctx)).toEqual([
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
    ])
  })

  it('cuando una entrada es null, cae al hueco vacío', () => {
    const ctx = {
      playerCount: 2,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [null, { heroId: 'thor', playerName: 'Ana' }] },
    } as unknown as SessionContext
    expect(resolvePlayerSlots(ctx)).toEqual([
      { heroId: null, playerName: '' },
      { heroId: 'thor', playerName: 'Ana' },
    ])
  })

  it('cuando heroId es un número o una cadena vacía, cae a null', () => {
    const ctx = {
      playerCount: 2,
      difficulty: 'normal',
      selection: { villainId: null, heroes: [{ heroId: 42, playerName: '' }, { heroId: '', playerName: '' }] },
    } as unknown as SessionContext
    expect(resolvePlayerSlots(ctx)).toEqual([
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
    ])
  })

  it('cuando playerName es un objeto, cae a cadena vacía; y cuando mide 40 caracteres, se recorta a 14', () => {
    const ctx = {
      playerCount: 2,
      difficulty: 'normal',
      selection: {
        villainId: null,
        heroes: [
          { heroId: null, playerName: { nested: true } },
          { heroId: null, playerName: 'a'.repeat(40) },
        ],
      },
    } as unknown as SessionContext
    const result = resolvePlayerSlots(ctx)
    expect(result[0].playerName).toBe('')
    expect(result[1].playerName).toBe('a'.repeat(PLAYER_NAME_MAX_LENGTH))
  })

  it('ningún caso lanza y ninguno devuelve undefined dentro del array', () => {
    const badContexts: SessionContext[] = [
      { playerCount: 2, difficulty: 'normal' },
      { playerCount: 2, difficulty: 'normal', selection: null as any },
      { playerCount: 2, difficulty: 'normal', selection: { villainId: null, heroes: [undefined] as any } },
    ]
    for (const ctx of badContexts) {
      expect(() => resolvePlayerSlots(ctx)).not.toThrow()
      const result = resolvePlayerSlots(ctx)
      expect(result.every(entry => entry !== undefined)).toBe(true)
    }
  })
})

describe('resolveVillainId', () => {
  it('devuelve el id cuando es una cadena', () => {
    const ctx: SessionContext = {
      playerCount: 2,
      difficulty: 'normal',
      selection: { villainId: 'rhino', heroes: [] },
    }
    expect(resolveVillainId(ctx)).toBe('rhino')
  })

  it.each([
    ['sin selection', { playerCount: 2, difficulty: 'normal' } as SessionContext],
    ['villainId null', { playerCount: 2, difficulty: 'normal', selection: { villainId: null, heroes: [] } } as SessionContext],
    ['villainId cadena vacía', { playerCount: 2, difficulty: 'normal', selection: { villainId: '', heroes: [] } } as SessionContext],
    ['villainId número', { playerCount: 2, difficulty: 'normal', selection: { villainId: 42 as any, heroes: [] } } as SessionContext],
    ['villainId objeto', { playerCount: 2, difficulty: 'normal', selection: { villainId: {} as any, heroes: [] } } as SessionContext],
  ])('devuelve null cuando %s', (_label, ctx) => {
    expect(resolveVillainId(ctx)).toBeNull()
  })
})

describe('emptySelection', () => {
  it('construye tantos huecos vacíos como playerCount', () => {
    expect(emptySelection(3)).toEqual({
      villainId: null,
      heroes: [
        { heroId: null, playerName: '' },
        { heroId: null, playerName: '' },
        { heroId: null, playerName: '' },
      ],
    })
  })

  it('nunca lanza con playerCount no entero o no positivo', () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      expect(() => emptySelection(value)).not.toThrow()
      expect(emptySelection(value).heroes).toHaveLength(0)
    }
  })
})
