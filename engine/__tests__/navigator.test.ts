import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { flatten } from '../flatten'
import { expand } from '../expand'
import { next, prev, jumpTo } from '../navigator'
import type { GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

function noLoopGame(): GameDefinition {
  return {
    ...tinyGame,
    sections: [tinyGame.sections[0]],
  }
}

describe('flatten', () => {
  it('preserva el orden autorado y construye el breadcrumb', () => {
    const flat = flatten(tinyGame)
    expect(flat).toHaveLength(6)
    expect(flat[0].breadcrumb).toBe('Introducción › Preparación')
    expect(flat[3].breadcrumb).toBe('Bucle › Turno')
    expect(flat.map(n => n.step.id)).toEqual([
      'intro.prep.01', 'intro.prep.02', 'intro.prep.03',
      'loop.turno.01', 'loop.turno.02', 'loop.turno.03',
    ])
  })
})

describe('expand', () => {
  it('sin sección repeats:true deja loopStartIndex/loopEndIndex undefined', () => {
    const session = expand(noLoopGame(), context)
    expect(session.loopStartIndex).toBeUndefined()
    expect(session.loopEndIndex).toBeUndefined()
    expect(session.sequence).toHaveLength(3)
  })

  it('sobre el fixture calcula cursor, round y los índices de bucle', () => {
    const session = expand(tinyGame, context)
    expect(session.cursor).toBe(0)
    expect(session.round).toBe(1)
    expect(session.loopStartIndex).toBe(3)
    expect(session.loopEndIndex).toBe(5)
  })
})

describe('next', () => {
  it('clampa en el último índice de un juego sin sección repetible', () => {
    const session = expand(noLoopGame(), context)
    const atEnd = { ...session, cursor: 2 }
    const result = next(atEnd)
    expect(result.cursor).toBe(2)
    expect(result.round).toBe(1)
  })

  it('cierra el bucle e incrementa round al cruzar loopEndIndex', () => {
    const session = expand(tinyGame, context)
    const atLoopEnd = { ...session, cursor: 5 }
    const result = next(atLoopEnd)
    expect(result.cursor).toBe(3)
    expect(result.round).toBe(2)
  })

  it('no muta la sesión recibida', () => {
    const session = expand(tinyGame, context)
    const snapshot = JSON.parse(JSON.stringify(session))
    next(session)
    expect(session).toEqual(snapshot)
  })
})

describe('prev', () => {
  it('vuelve al final del bucle y decrementa round si round > 1', () => {
    const session = expand(tinyGame, context)
    const atLoopStart = { ...session, cursor: 3, round: 2 }
    const result = prev(atLoopStart)
    expect(result.cursor).toBe(5)
    expect(result.round).toBe(1)
  })

  it('se queda en el índice 0 si round es 1', () => {
    const session = expand(tinyGame, context)
    const result = prev(session)
    expect(result.cursor).toBe(0)
    expect(result.round).toBe(1)
  })

  it('no muta la sesión recibida', () => {
    const session = { ...expand(tinyGame, context), cursor: 3, round: 2 }
    const snapshot = JSON.parse(JSON.stringify(session))
    prev(session)
    expect(session).toEqual(snapshot)
  })
})

describe('jumpTo', () => {
  it('mueve el cursor sin cambiar round y un next() posterior cierra el bucle correctamente', () => {
    const session = expand(tinyGame, context)
    const jumped = jumpTo(session, 'loop.turno.02')
    expect(jumped.cursor).toBe(4)
    expect(jumped.round).toBe(1)

    const advanced = next(jumped)
    expect(advanced.cursor).toBe(5)
    const closed = next(advanced)
    expect(closed.cursor).toBe(3)
    expect(closed.round).toBe(2)
  })

  it('con un runtimeId inexistente devuelve la sesión sin cambios y no lanza', () => {
    const session = expand(tinyGame, context)
    expect(() => jumpTo(session, 'no-existe')).not.toThrow()
    const result = jumpTo(session, 'no-existe')
    expect(result).toEqual(session)
  })

  it('no muta la sesión recibida', () => {
    const session = expand(tinyGame, context)
    const snapshot = JSON.parse(JSON.stringify(session))
    jumpTo(session, 'loop.turno.02')
    expect(session).toEqual(snapshot)
  })
})
