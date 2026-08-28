import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import { next } from '../navigator'
import { resume, toPersistedPosition } from '../persistence'
import type { PersistedPosition } from '../persistence'
import type { GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

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
