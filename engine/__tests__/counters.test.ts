// engine/__tests__/counters.test.ts
// Cobertura del motor de contadores (Fase 7, plan 02): precarga desde el
// catálogo real, resolución defensiva de lo persistido, y los cuatro
// mutadores puros. Analogo estructural directo de
// engine/__tests__/selection.test.ts (mismo fixture, mismo patrón de
// desigualdad referencial en cinco niveles, D-20/HP-08).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import { setHero, setVillain } from '../selection'
import {
  computeInitialHeroHealth,
  computeInitialVillainHealth,
  decrementHero,
  decrementVillain,
  incrementHero,
  incrementVillain,
  resolveCounters,
  resolveCounterValues,
} from '../counters'
import type { CharacterCatalogue, EngineSession, GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

// Catálogo real (mismo patrón de persistence.test.ts al cargar
// marvel-champions.json): sin validador de esquema, eso ya lo cubre
// engine/__tests__/catalogueSchema.test.ts.
const catalogueContentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const catalogue: CharacterCatalogue = JSON.parse(readFileSync(catalogueContentPath, 'utf-8'))

const rhino = catalogue.villains.find(v => v.id === 'rhino')!
const kang = catalogue.villains.find(v => v.id === 'kang')!
const ultron = catalogue.villains.find(v => v.id === 'ultron')!
const thor = catalogue.heroes.find(h => h.id === 'thor')!
const ironMan = catalogue.heroes.find(h => h.id === 'iron-man')!
const sheHulk = catalogue.heroes.find(h => h.id === 'she-hulk')!

const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

function baseSession(): EngineSession {
  return expand(tinyGame, context)
}

describe('precarga (D-09/D-11/HP-05)', () => {
  it('computeInitialVillainHealth: Rhino normal con 3 jugadores es 42', () => {
    expect(computeInitialVillainHealth(rhino, 3, 'normal')).toBe(42)
  })

  it('computeInitialVillainHealth: Kang normal con 3 jugadores es 36, experto es 45', () => {
    expect(computeInitialVillainHealth(kang, 3, 'normal')).toBe(36)
    expect(computeInitialVillainHealth(kang, 3, 'expert')).toBe(45)
  })

  it('computeInitialVillainHealth: Ultron normal con 3 jugadores es 51, y experto también 51 (sin cifras propias de experto)', () => {
    expect(computeInitialVillainHealth(ultron, 3, 'normal')).toBe(51)
    expect(computeInitialVillainHealth(ultron, 3, 'expert')).toBe(51)
  })

  it('D-11: Kang con 3 jugadores NUNCA usa la etapa II plana (18 ni 54)', () => {
    const normal = computeInitialVillainHealth(kang, 3, 'normal')
    const expert = computeInitialVillainHealth(kang, 3, 'expert')
    expect(normal).not.toBe(18)
    expect(normal).not.toBe(54)
    expect(expert).not.toBe(18)
    expect(expert).not.toBe(54)
  })

  it('computeInitialHeroHealth: vida plana de héroe, sin multiplicar por jugadores', () => {
    expect(computeInitialHeroHealth(thor)).toBe(14)
    expect(computeInitialHeroHealth(ironMan)).toBe(9)
    expect(computeInitialHeroHealth(sheHulk)).toBe(15)
  })

  it('villano/héroe null devuelven null, sin lanzar', () => {
    expect(computeInitialVillainHealth(null, 3, 'normal')).toBeNull()
    expect(computeInitialHeroHealth(null)).toBeNull()
  })
})

describe('resolveCounters — normalización defensiva (COMP-02/D-12)', () => {
  it('sin counters, devuelve villainHealth null y heroHealth de longitud playerCount, todo null', () => {
    const ctx: SessionContext = { playerCount: 3, difficulty: 'normal' }
    expect(resolveCounters(ctx)).toEqual({ villainHealth: null, heroHealth: [null, null, null] })
  })

  it('formas malformadas de counters, ninguna lanza y ninguna produce undefined/NaN/negativo', () => {
    const badContexts: SessionContext[] = [
      { playerCount: 3, difficulty: 'normal', counters: null as any },
      { playerCount: 3, difficulty: 'normal', counters: 42 as any },
      { playerCount: 3, difficulty: 'normal', counters: 'no-es-un-objeto' as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: null, heroHealth: 'no-es-un-array' } as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: null, heroHealth: [10] } as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: null, heroHealth: [1, 2, 3, 4, 5] } as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: null, heroHealth: ['12', undefined, null] } as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: null, heroHealth: [Number.NaN, Number.POSITIVE_INFINITY, -5] } as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: null, heroHealth: [2.7, 2.7, 2.7] } as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: 'muchos', heroHealth: [null, null, null] } as any },
      { playerCount: 3, difficulty: 'normal', counters: { villainHealth: Number.NaN, heroHealth: [null, null, null] } as any },
    ]

    for (const ctx of badContexts) {
      expect(() => resolveCounters(ctx)).not.toThrow()
      const result = resolveCounters(ctx)
      expect(result.heroHealth).toHaveLength(3)
      expect(result.heroHealth.every(v => v === null || Number.isInteger(v))).toBe(true)
      expect(result.heroHealth.every(v => v === null || !Number.isNaN(v))).toBe(true)
      expect(result.heroHealth.every(v => v === null || v >= 0)).toBe(true)
      expect(result.villainHealth === null || Number.isInteger(result.villainHealth)).toBe(true)
      expect(result.villainHealth === null || result.villainHealth! >= 0).toBe(true)
    }
  })

  it('-5 se sanea a 0 y 2.7 se trunca a 2 (nunca se propagan sin saneamiento)', () => {
    const ctx: SessionContext = {
      playerCount: 3,
      difficulty: 'normal',
      counters: { villainHealth: null, heroHealth: [-5, 2.7, null] } as any,
    }
    const result = resolveCounters(ctx)
    expect(result.heroHealth[0]).toBe(0)
    expect(result.heroHealth[1]).toBe(2)
    expect(result.heroHealth[2]).toBeNull()
  })

  it.each([0, -1, 2.5])('playerCount %s devuelve heroHealth vacío', (playerCount) => {
    const ctx: SessionContext = { playerCount, difficulty: 'normal' }
    expect(resolveCounters(ctx).heroHealth).toEqual([])
  })
})

describe('resolveCounterValues (D-09/D-12)', () => {
  it('sin selección y sin counters, todos los valores son null', () => {
    const session = baseSession()
    const result = resolveCounterValues(session.context, catalogue)
    expect(result.villainHealth).toBeNull()
    expect(result.heroHealth).toEqual([null, null, null])
  })

  it('con villano y héroe seleccionados, resuelve la precarga en vivo', () => {
    const session = setHero(setVillain(baseSession(), 'rhino'), 0, 'thor')
    const result = resolveCounterValues(session.context, catalogue)
    expect(result.villainHealth).toBe(42)
    expect(result.heroHealth[0]).toBe(14)
    expect(result.heroHealth[1]).toBeNull()
    expect(result.heroHealth[2]).toBeNull()
  })

  it('un valor congelado gana al calculado en vivo', () => {
    const session = setHero(setVillain(baseSession(), 'rhino'), 0, 'thor')
    session.context.counters = { villainHealth: null, heroHealth: [8, null, null] }
    const result = resolveCounterValues(session.context, catalogue)
    expect(result.heroHealth[0]).toBe(8)
  })

  it('un heroId inexistente en el catálogo resuelve null, sin lanzar', () => {
    const session = setHero(baseSession(), 0, 'heroe-inventado')
    expect(() => resolveCounterValues(session.context, catalogue)).not.toThrow()
    const result = resolveCounterValues(session.context, catalogue)
    expect(result.heroHealth[0]).toBeNull()
  })

  it('con catalogue null, todo resuelve null sin lanzar', () => {
    const session = setHero(setVillain(baseSession(), 'rhino'), 0, 'thor')
    expect(() => resolveCounterValues(session.context, null)).not.toThrow()
    const result = resolveCounterValues(session.context, null)
    expect(result.villainHealth).toBeNull()
    expect(result.heroHealth).toEqual([null, null, null])
  })
})

describe('desigualdad referencial (D-20/HP-08)', () => {
  it('incrementVillain devuelve objetos nuevos en los niveles que toca', () => {
    const session = setVillain(baseSession(), 'rhino')
    const originalValue = session.context.counters?.villainHealth
    const result = incrementVillain(session, catalogue)

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.counters).not.toBe(session.context.counters)
    expect(result.context.counters!.villainHealth).not.toBe(session.context.counters?.villainHealth)
    expect(session.context.counters?.villainHealth).toBe(originalValue)
  })

  it('decrementVillain devuelve objetos nuevos en los niveles que toca', () => {
    const session = incrementVillain(setVillain(baseSession(), 'rhino'), catalogue)
    const originalValue = session.context.counters?.villainHealth
    const result = decrementVillain(session, catalogue)

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.counters).not.toBe(session.context.counters)
    expect(result.context.counters!.villainHealth).not.toBe(session.context.counters?.villainHealth)
    expect(session.context.counters?.villainHealth).toBe(originalValue)
  })

  it('incrementHero devuelve objetos nuevos en los cinco niveles', () => {
    const session = setHero(baseSession(), 0, 'thor')
    const originalValue = session.context.counters?.heroHealth[0]
    const result = incrementHero(session, 0, catalogue)

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.counters).not.toBe(session.context.counters)
    expect(result.context.counters!.heroHealth).not.toBe(session.context.counters?.heroHealth)
    expect(result.context.counters!.heroHealth[0]).not.toBe(session.context.counters?.heroHealth[0])
    expect(session.context.counters?.heroHealth[0]).toBe(originalValue)
  })

  it('decrementHero devuelve objetos nuevos en los cinco niveles', () => {
    const session = incrementHero(setHero(baseSession(), 0, 'thor'), 0, catalogue)
    const originalValue = session.context.counters?.heroHealth[0]
    const result = decrementHero(session, 0, catalogue)

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.counters).not.toBe(session.context.counters)
    expect(result.context.counters!.heroHealth).not.toBe(session.context.counters?.heroHealth)
    expect(result.context.counters!.heroHealth[0]).not.toBe(session.context.counters?.heroHealth[0])
    expect(session.context.counters?.heroHealth[0]).toBe(originalValue)
  })
})

describe('topes y arranque (D-12/D-13/D-15/HP-06/HP-07)', () => {
  it('incrementHero sobre null sin héroe seleccionado arranca en 1', () => {
    const session = baseSession()
    const result = incrementHero(session, 0, catalogue)
    expect(result.context.counters!.heroHealth[0]).toBe(1)
  })

  it('decrementHero sobre null (sin héroe) es no-op de misma referencia', () => {
    const session = baseSession()
    const result = decrementHero(session, 0, catalogue)
    expect(result).toBe(session)
  })

  it('con Thor seleccionado (vivo en 14), incrementHero congela 15 y decrementHero congela 13', () => {
    const session = setHero(baseSession(), 0, 'thor')
    const incremented = incrementHero(session, 0, catalogue)
    expect(incremented.context.counters!.heroHealth[0]).toBe(15)

    const decremented = decrementHero(session, 0, catalogue)
    expect(decremented.context.counters!.heroHealth[0]).toBe(13)
  })

  it('bajando desde 1: decrementHero deja 0, y otro decrementHero es no-op de misma referencia en 0', () => {
    const base = setHero(baseSession(), 0, 'thor')
    // Contador ya congelado en 1 (equivalente a haber bajado desde 14 hasta 1
    // a base de toques): se construye directamente para no depender de 13
    // llamadas encadenadas.
    const atOne = { ...base, context: { ...base.context, counters: { villainHealth: null, heroHealth: [1, null, null] } } }
    const atZero = decrementHero(atOne, 0, catalogue)
    expect(atZero.context.counters!.heroHealth[0]).toBe(0)

    const stillZero = decrementHero(atZero, 0, catalogue)
    expect(stillZero).toBe(atZero)
    expect(stillZero.context.counters!.heroHealth[0]).toBe(0)

    const backToOne = incrementHero(atZero, 0, catalogue)
    expect(backToOne.context.counters!.heroHealth[0]).toBe(1)
  })

  it('un toque cambia el valor en exactamente ±1, nunca ±5', () => {
    const session = setHero(baseSession(), 0, 'thor')
    const incremented = incrementHero(session, 0, catalogue)
    expect(incremented.context.counters!.heroHealth[0]).toBe(15)
    expect(incremented.context.counters!.heroHealth[0]).not.toBe(19)
  })

  it('decrementVillain en 0 no baja de 0', () => {
    let session = setVillain(baseSession(), 'rhino')
    session = { ...session, context: { ...session.context, counters: { villainHealth: 0, heroHealth: [null, null, null] } } }
    const result = decrementVillain(session, catalogue)
    expect(result).toBe(session)
    expect(result.context.counters!.villainHealth).toBe(0)
  })
})

describe('no-op de slot fuera de rango', () => {
  it.each([-1, 3, 1.5, Number.NaN])('incrementHero con slot %s devuelve la misma referencia de sesión, sin lanzar', (slot) => {
    const session = baseSession()
    expect(() => incrementHero(session, slot, catalogue)).not.toThrow()
    expect(incrementHero(session, slot, catalogue)).toBe(session)
  })

  it.each([-1, 3, 1.5, Number.NaN])('decrementHero con slot %s devuelve la misma referencia de sesión, sin lanzar', (slot) => {
    const session = baseSession()
    expect(() => decrementHero(session, slot, catalogue)).not.toThrow()
    expect(decrementHero(session, slot, catalogue)).toBe(session)
  })
})

describe('D-10 (cambio de héroe a media ronda)', () => {
  it('un contador congelado conserva su cifra al cambiar de héroe', () => {
    const session = incrementHero(setHero(baseSession(), 0, 'thor'), 0, catalogue)
    expect(session.context.counters!.heroHealth[0]).toBe(15)

    const changed = setHero(session, 0, 'iron-man')
    const result = resolveCounterValues(changed.context, catalogue)
    expect(result.heroHealth[0]).toBe(15)
    expect(result.heroHealth[0]).not.toBe(9)
  })

  it('un slot sin tocar se recalcula solo al cambiar de héroe', () => {
    const session = setHero(baseSession(), 0, 'thor')
    expect(resolveCounterValues(session.context, catalogue).heroHealth[0]).toBe(14)

    const changed = setHero(session, 0, 'iron-man')
    expect(resolveCounterValues(changed.context, catalogue).heroHealth[0]).toBe(9)
  })
})
