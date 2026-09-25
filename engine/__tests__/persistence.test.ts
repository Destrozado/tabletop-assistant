import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveCounters, resolveCounterValues } from '../counters'
import { resolveModuleIds } from '../encounterSets'
import { expand } from '../expand'
import { next } from '../navigator'
import { resume, toPersistedPosition } from '../persistence'
import type { PersistedPosition } from '../persistence'
import { validateGameDefinition } from '../schema'
import { resolvePlayerSlots, resolveVillainId } from '../selection'
import type { GameDefinition, SessionContext } from '../types'
import type { CharacterCatalogue } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

// Contenido real (mismo patrón de carga que navigator.test.ts): el test de
// D-20 usa gameId/contentVersion/runtimeId reales de marvel-champions.json,
// no del fixture mínimo, porque D-20 es sobre el estado normal de la app
// real, no sobre una sesión de juguete.
const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions: GameDefinition = validateGameDefinition(rawMarvelChampions)

// D-21: catálogo real cargado igual que el contenido de arriba, sin
// validador de esquema (eso ya lo cubre engine/__tests__/catalogueSchema.test.ts).
const cataloguePath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const rawCatalogue: unknown = JSON.parse(readFileSync(cataloguePath, 'utf-8'))
const catalogue = rawCatalogue as CharacterCatalogue

function basePersisted(overrides: Partial<PersistedPosition> = {}): PersistedPosition {
  return {
    formatVersion: 1,
    gameId: tinyGame.gameId,
    contentVersion: tinyGame.contentVersion,
    runtimeId: 'intro.prep.02',
    round: 1,
    context: { playerCount: 2, difficulty: 'expert' },
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('resume', () => {
  it('con persisted null devuelve outcome "fresh" y la sesión fresca intacta', () => {
    const fresh = expand(tinyGame, context)
    const result = resume(null, fresh)
    expect(result.outcome).toBe('fresh')
    expect(result.session).toEqual(fresh)
    expect(result.session.cursor).toBe(0)
    expect(result.session.round).toBe(1)
  })

  it('con contentVersion y runtimeId coincidentes devuelve outcome "resumed" con cursor, round y context persistidos', () => {
    const fresh = expand(tinyGame, context)
    const persisted = basePersisted({ runtimeId: 'loop.turno.02', round: 3 })
    const result = resume(persisted, fresh)
    expect(result.outcome).toBe('resumed')
    expect(result.session.cursor).toBe(4)
    expect(result.session.round).toBe(3)
    expect(result.session.context).toEqual(persisted.context)
  })

  it('con contentVersion distinta devuelve "content-changed" AUNQUE el runtimeId siga existiendo en la secuencia', () => {
    const fresh = expand(tinyGame, context)
    const persisted = basePersisted({ runtimeId: 'loop.turno.02', contentVersion: tinyGame.contentVersion + 1 })
    const result = resume(persisted, fresh)
    expect(result.outcome).toBe('content-changed')
    expect(result.session.cursor).toBe(0)
    expect(result.session.round).toBe(1)
    expect(result.session.context).toEqual(persisted.context)
  })

  it('con contentVersion coincidente pero runtimeId inexistente cae al mismo fallback', () => {
    const fresh = expand(tinyGame, context)
    const persisted = basePersisted({ runtimeId: 'no-existe' })
    const result = resume(persisted, fresh)
    expect(result.outcome).toBe('content-changed')
    expect(result.session.cursor).toBe(0)
    expect(result.session.round).toBe(1)
    expect(result.session.context).toEqual(persisted.context)
  })

  it('con formatVersion distinto de 1 devuelve "content-changed"', () => {
    const fresh = expand(tinyGame, context)
    const persisted = { ...basePersisted(), formatVersion: 2 } as unknown as PersistedPosition
    const result = resume(persisted, fresh)
    expect(result.outcome).toBe('content-changed')
    expect(result.session.cursor).toBe(0)
    expect(result.session.round).toBe(1)
  })

  it('nunca lanza y nunca devuelve un cursor fuera de rango, incluso con datos absurdos', () => {
    const fresh = expand(tinyGame, context)
    const garbage = basePersisted({ runtimeId: '¡¡¡corrupto!!!', round: -99 })
    expect(() => resume(garbage, fresh)).not.toThrow()
    const result = resume(garbage, fresh)
    expect(result.session.cursor).toBeGreaterThanOrEqual(0)
    expect(result.session.cursor).toBeLessThan(result.session.sequence.length)
  })

  it('CR-01 / WR-03 (ronda 3): con persisted parcial (context ausente, p.ej. residuo de una build antigua) nunca deja session.context indefinido', () => {
    const fresh = expand(tinyGame, context)
    // Simula lo que hoy puede sobrevivir a la validación insuficiente de
    // usePersistedSession.load() (solo comprueba 'formatVersion' in parsed):
    // un objeto que solo tiene formatVersion, sin contentVersion/runtimeId/round/context.
    const partial = { formatVersion: 1 } as unknown as PersistedPosition
    expect(() => resume(partial, fresh)).not.toThrow()
    const result = resume(partial, fresh)
    // WR-03 (ronda 3): un context ausente ya no cae en 'content-changed' —
    // la guarda única de resume() lo intercepta primero y degrada a
    // 'fresh', porque el contenido no ha cambiado, es la CONFIGURACIÓN la
    // que se ha perdido. Las otras tres aserciones se conservan: siguen
    // siendo ciertas y siguen siendo el punto del test.
    expect(result.outcome).toBe('fresh')
    expect(result.session.context).toBeDefined()
    expect(result.session.context.playerCount).toBeTypeOf('number')
    expect(result.session.context.difficulty).toBeTypeOf('string')
  })

  it('sobre el tramo repetible: reanuda en round 4 en el cierre del bucle y un next() posterior cierra correctamente', () => {
    const fresh = expand(tinyGame, context)
    // loop.turno.03 es el loopEndIndex (5) del fixture.
    const persisted = basePersisted({ runtimeId: 'loop.turno.03', round: 4, context })
    const result = resume(persisted, fresh)
    expect(result.outcome).toBe('resumed')
    expect(result.session.cursor).toBe(5)
    expect(result.session.round).toBe(4)

    const advanced = next(result.session)
    expect(advanced.cursor).toBe(3)
    expect(advanced.round).toBe(5)
  })
})

describe('toPersistedPosition', () => {
  it('produce formatVersion 1, runtimeId/round/context actuales y updatedAt en ISO', () => {
    const session = expand(tinyGame, context)
    const advanced = next(session)
    const persisted = toPersistedPosition(advanced)

    expect(persisted.formatVersion).toBe(1)
    expect(persisted.gameId).toBe(tinyGame.gameId)
    expect(persisted.contentVersion).toBe(tinyGame.contentVersion)
    expect(persisted.runtimeId).toBe(advanced.sequence[advanced.cursor].runtimeId)
    expect(persisted.round).toBe(advanced.round)
    expect(persisted.context).toEqual(context)
    expect(() => new Date(persisted.updatedAt).toISOString()).not.toThrow()
    expect(new Date(persisted.updatedAt).toISOString()).toBe(persisted.updatedAt)
  })
})

describe('D-20: resume() de una sesión persistida sin `selection` (Fase 6)', () => {
  const fresh = expand(marvelChampions, { playerCount: 3, difficulty: 'normal' })

  it('resume() devuelve "resumed" (ni content-changed ni fresh) — la clave nueva del paso no dispara ninguna de las tres comprobaciones', () => {
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: { playerCount: 3, difficulty: 'normal' }, // sin `selection`, forma pre-Fase-6
      updatedAt: '2026-09-08T00:00:00.000Z',
    }
    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')

    // D-03/SEL-09: `selection` ausente es el estado normal y permanente de
    // la app, no un fallo — StepScreen debe pintar «—» en los tres huecos,
    // nunca propagar un `undefined` sin resolver a la interfaz.
    expect(session.context.selection).toBeUndefined()

    const slots = resolvePlayerSlots(session.context)
    expect(slots).toHaveLength(3)
    expect(slots).toEqual([
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
    ])

    expect(resolveVillainId(session.context)).toBeNull()
  })

  it('D-20 (localStorage manipulado): un `selection` corrupto y desajustado se normaliza sin lanzar', () => {
    // `localStorage` es editable desde DevTools — esta es la defensa de la
    // que depende que la interfaz no reviente con datos manipulados.
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: {
        playerCount: 3,
        difficulty: 'normal',
        selection: {
          villainId: 42 as unknown as string, // villano no-cadena
          heroes: [
            { heroId: 'thor', playerName: 'x'.repeat(40) }, // nombre de 40 caracteres
            null as unknown as { heroId: string | null, playerName: string }, // entrada nula
            { heroId: '', playerName: 'Bruno' }, // heroId vacío
            { heroId: 'hulk', playerName: 'Ana' }, // cuarta entrada, playerCount es 3
          ],
        },
      },
      updatedAt: '2026-09-08T00:00:00.000Z',
    }

    expect(() => resume(persisted, fresh)).not.toThrow()
    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')

    const slots = resolvePlayerSlots(session.context)
    expect(slots).toHaveLength(3) // la cuarta entrada se descarta
    expect(slots[0]).toEqual({ heroId: 'thor', playerName: 'x'.repeat(14) }) // recortado a 14
    expect(slots[1]).toEqual({ heroId: null, playerName: '' }) // entrada nula cae al hueco vacío
    expect(slots[2]).toEqual({ heroId: null, playerName: 'Bruno' }) // heroId vacío cae a null

    expect(resolveVillainId(session.context)).toBeNull()
  })
})

describe('D-21: resume() de una sesión persistida con forma de v1.7 (sin selection, sin counters)', () => {
  const fresh = expand(marvelChampions, { playerCount: 3, difficulty: 'normal' })

  it('una partida de v1.7 se reanuda y la banda pintaría «—» en todas las celdas', () => {
    // Forma v1.7 literal: ni `selection` ni `counters` existían todavía en
    // `context` cuando esta partida se guardó en la tablet real del grupo.
    // Este caso NO lo cubre el gate `contentVersion`/`formatVersion` de
    // `resume()` (esos dos campos coinciden con la build actual), así que
    // se prueba aparte, exactamente como D-20 probó `selection` aparte.
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: { playerCount: 3, difficulty: 'normal' },
      updatedAt: '2026-09-08T00:00:00.000Z',
    }

    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')

    expect(session.context.counters).toBeUndefined()

    const counters = resolveCounters(session.context)
    expect(counters).toEqual({ villainHealth: null, heroHealth: [null, null, null] })

    const counterValues = resolveCounterValues(session.context, catalogue)
    expect(counterValues).toEqual({ villainHealth: null, heroHealth: [null, null, null] })

    // La aserción por la que existe el test: ningún valor devuelto es
    // `undefined` ni `NaN` — sin villano ni héroes elegidos no hay nada que
    // calcular, y eso es el estado NORMAL de SEL-09, no un fallo.
    expect(counterValues.villainHealth === null || Number.isInteger(counterValues.villainHealth)).toBe(true)
    expect(counterValues.heroHealth.every(v => v === null || Number.isInteger(v))).toBe(true)
  })

  it('`localStorage` manipulado: un `counters` corrupto se normaliza sin lanzar', () => {
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: {
        playerCount: 3,
        difficulty: 'normal',
        counters: {
          villainHealth: 'muchos' as unknown as number,
          heroHealth: [42, Number.NaN, '12' as unknown as number, -7],
        },
      },
      updatedAt: '2026-09-08T00:00:00.000Z',
    }

    expect(() => resume(persisted, fresh)).not.toThrow()
    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')

    const counters = resolveCounters(session.context)
    expect(counters.heroHealth).toHaveLength(3) // la cuarta entrada se descarta: la longitud la manda playerCount
    expect(counters.villainHealth).toBeNull()
    expect(counters.heroHealth[0]).toBe(42)
    counters.heroHealth.forEach((entry) => {
      expect(entry === null || (Number.isInteger(entry) && !Number.isNaN(entry) && entry >= 0)).toBe(true)
    })
  })
})

// Quick 260925-mpj (D-06): moduleIds sobrevive a resume() igual que
// villainId/heroes (D-20) — es el mismo `context.selection` que ya viaja
// entero dentro de `toPersistedPosition`/`resume()`, sin fontanería nueva.
describe('quick 260925-mpj: resume() y moduleIds', () => {
  const fresh = expand(marvelChampions, { playerCount: 2, difficulty: 'expert' })

  it('una posición guardada sin moduleIds (villano ultron): outcome "resumed" y resolveModuleIds da el recomendado ["under-attack"]', () => {
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: { playerCount: 2, difficulty: 'expert', selection: { villainId: 'ultron', heroes: [] } },
      updatedAt: '2026-09-25T00:00:00.000Z',
    }
    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')
    expect(resolveModuleIds(session.context, catalogue)).toEqual(['under-attack'])
  })

  it('con moduleIds ["legions-of-hydra"] persistido: se conserva tras resume()', () => {
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: { playerCount: 2, difficulty: 'expert', selection: { villainId: 'ultron', heroes: [], moduleIds: ['legions-of-hydra'] } },
      updatedAt: '2026-09-25T00:00:00.000Z',
    }
    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')
    expect(resolveModuleIds(session.context, catalogue)).toEqual(['legions-of-hydra'])
  })
})

describe('CR-01 (ronda 2) / WR-03 (ronda 3): la rama `resumed` valida el context igual que `content-changed`', () => {
  it('WR-03 (ronda 3): con context: {} persistido, resume() devuelve "fresh" y la sesión fresca ENTERA (no una mezcla)', () => {
    const fresh = expand(tinyGame, context)
    const persisted = basePersisted({ context: {} as SessionContext })
    const result = resume(persisted, fresh)
    // Cambio de expectativa respecto al comportamiento antiguo (ronda 2):
    // entonces "resumed" con el context fresco adoptado en silencio; ahora
    // la guarda única de resume() degrada a "fresh" explícitamente, porque
    // un context inválido no es una partida reanudable.
    expect(result.outcome).toBe('fresh')
    expect(result.session.context).toEqual(fresh.context)
    expect(result.session.cursor).toBe(0)
    expect(result.session.round).toBe(1)
  })

  it('con un context con forma válida, resume() sigue devolviendo el context persistido intacto (anti-regresión del camino feliz)', () => {
    const fresh = expand(tinyGame, context)
    const persisted = basePersisted({ context: { playerCount: 2, difficulty: 'expert' } })
    const result = resume(persisted, fresh)
    expect(result.outcome).toBe('resumed')
    expect(result.session.context).toEqual(persisted.context)
  })

  it('con round: NaN persistido, session.round cae a 1; con round: 3, se mantiene 3', () => {
    const fresh = expand(tinyGame, context)

    const persistedNaN = basePersisted({ round: Number.NaN as unknown as number })
    expect(resume(persistedNaN, fresh).session.round).toBe(1)

    const persistedValid = basePersisted({ round: 3 })
    expect(resume(persistedValid, fresh).session.round).toBe(3)
  })
})

describe('WR-03 (ronda 3): un context que no se puede validar no es una partida reanudable', () => {
  it('playerCount: NaN con difficulty válida degrada a "fresh"', () => {
    const fresh = expand(tinyGame, context)
    const persisted = basePersisted({ context: { playerCount: Number.NaN, difficulty: 'normal' } })
    const result = resume(persisted, fresh)
    expect(result.outcome).toBe('fresh')
  })

  it('playerCount fuera de rango (0, no-entero) degrada a "fresh"', () => {
    const fresh = expand(tinyGame, context)
    const zero = resume(basePersisted({ context: { playerCount: 0, difficulty: 'normal' } }), fresh)
    expect(zero.outcome).toBe('fresh')

    const fractional = resume(basePersisted({ context: { playerCount: 2.5, difficulty: 'normal' } }), fresh)
    expect(fractional.outcome).toBe('fresh')
  })

  it('difficulty que no es "normal" ni "expert" degrada a "fresh"', () => {
    const fresh = expand(tinyGame, context)
    const imposible = resume(basePersisted({ context: { playerCount: 2, difficulty: 'imposible' as unknown as SessionContext['difficulty'] } }), fresh)
    expect(imposible.outcome).toBe('fresh')

    const numerica = resume(basePersisted({ context: { playerCount: 2, difficulty: 7 as unknown as SessionContext['difficulty'] } }), fresh)
    expect(numerica.outcome).toBe('fresh')
  })

  it('context: null y context: [] (superan isPersistedPosition en la capa de storage) degradan a "fresh" sin lanzar', () => {
    const fresh = expand(tinyGame, context)

    const withNull = basePersisted({ context: null as unknown as SessionContext })
    expect(() => resume(withNull, fresh)).not.toThrow()
    expect(resume(withNull, fresh).outcome).toBe('fresh')

    const withArray = basePersisted({ context: [] as unknown as SessionContext })
    expect(() => resume(withArray, fresh)).not.toThrow()
    expect(resume(withArray, fresh).outcome).toBe('fresh')
  })

  it('anti-regresión: las ocho combinaciones legítimas de playerCount (1-4) × difficulty siguen "resumed" con el context intacto', () => {
    const fresh = expand(tinyGame, context)
    const difficulties: SessionContext['difficulty'][] = ['normal', 'expert']

    for (const playerCount of [1, 2, 3, 4]) {
      for (const difficulty of difficulties) {
        const legitContext = { playerCount, difficulty }
        const persisted = basePersisted({ context: legitContext })
        const result = resume(persisted, fresh)
        expect(result.outcome).toBe('resumed')
        expect(result.session.context).toEqual(legitContext)
      }
    }
  })
})
