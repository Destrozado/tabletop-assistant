import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { flatten } from '../flatten'
import { expand } from '../expand'
import { next, prev, jumpTo } from '../navigator'
import { validateGameDefinition } from '../schema'
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

// Contenido real (mismo patrón de carga que content.test.ts líneas 9-11):
// FLOW-03/04/07/08 deben cubrirse contra los datos reales de la ronda, no
// solo contra el fixture de 3+3 pasos.
const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions: GameDefinition = validateGameDefinition(rawMarvelChampions)

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

describe('bucle de ronda sobre el contenido real (FLOW-03/04/07/08)', () => {
  it('expand(marvelChampions, ctx) produce sequence.length 33 y los índices de bucle 24/32', () => {
    const session = expand(marvelChampions, context)
    expect(session.sequence).toHaveLength(33)
    // El valor sigue siendo 24 (el paso fusionado vivía dentro del bucle, no
    // antes de él), pero la sección ronda pasa de 10 a 9 pasos tras la fusión
    // de ronda.jugadores.02+.03 (260831-pym): la expresión debe reflejarlo.
    expect(session.loopStartIndex).toBe(33 - 9)
    expect(session.loopEndIndex).toBe(32)
  })

  it('next() con cursor en loopEndIndex (32) cierra el bucle: cursor 24, round 2 (FLOW-03/04)', () => {
    const session = expand(marvelChampions, context)
    const atLoopEnd = { ...session, cursor: session.loopEndIndex!, round: 1 }
    const result = next(atLoopEnd)
    expect(result.cursor).toBe(session.loopStartIndex)
    expect(result.round).toBe(2)
  })

  it('next() desde setup.mesa-lista.01 avanza a ronda.jugadores.01 (deja de ser el NO-OP documentado)', () => {
    const session = expand(marvelChampions, context)
    const mesaListaIndex = session.sequence.findIndex(n => n.runtimeId === 'setup.mesa-lista.01')
    expect(mesaListaIndex).toBeGreaterThan(-1)
    const atMesaLista = { ...session, cursor: mesaListaIndex }
    const result = next(atMesaLista)
    expect(result.sequence[result.cursor].runtimeId).toBe('ronda.jugadores.01')
  })

  it('prev() con cursor en loopStartIndex (24) y round 2 vuelve al loopEndIndex (33) y decrementa round', () => {
    const session = expand(marvelChampions, context)
    const atLoopStart = { ...session, cursor: session.loopStartIndex!, round: 2 }
    const result = prev(atLoopStart)
    expect(result.cursor).toBe(session.loopEndIndex)
    expect(result.round).toBe(1)
  })

  it('prev() con cursor en loopStartIndex (24) y round 1 sale del bucle hacia la preparación sin decrementar', () => {
    const session = expand(marvelChampions, context)
    const atLoopStart = { ...session, cursor: session.loopStartIndex!, round: 1 }
    const result = prev(atLoopStart)
    expect(result.cursor).toBe(session.loopStartIndex! - 1)
    expect(result.round).toBe(1)
  })

  it('jumpTo("ronda.villano.03") deja round intacto y dos next() seguidos recorren villano.04 y villano.05 (FLOW-07)', () => {
    const session = expand(marvelChampions, context)
    const atRound4 = { ...session, round: 4 }
    const jumped = jumpTo(atRound4, 'ronda.villano.03')
    expect(jumped.round).toBe(4)
    expect(jumped.sequence[jumped.cursor].runtimeId).toBe('ronda.villano.03')

    const advancedOnce = next(jumped)
    expect(advancedOnce.sequence[advancedOnce.cursor].runtimeId).toBe('ronda.villano.04')
    expect(advancedOnce.round).toBe(4)

    const advancedTwice = next(advancedOnce)
    expect(advancedTwice.sequence[advancedTwice.cursor].runtimeId).toBe('ronda.villano.05')
    expect(advancedTwice.round).toBe(4)
  })

  it('jumpTo("setup.heroes.01") deja round intacto (FLOW-08), y avanzar hasta loopEndIndex incrementa round a 5', () => {
    const session = expand(marvelChampions, context)
    const atRound4 = { ...session, round: 4 }
    const jumped = jumpTo(atRound4, 'setup.heroes.01')
    expect(jumped.round).toBe(4)
    expect(jumped.sequence[jumped.cursor].runtimeId).toBe('setup.heroes.01')

    // Bucle acotado por sequence.length (nunca por condición de igualdad con
    // loopEndIndex): si loopEndIndex es undefined -aún sin la sección ronda-
    // next() clampa en el último índice para siempre y una condición de
    // igualdad no acotada nunca terminaría.
    let advancing = jumped
    for (let i = 0; i < jumped.sequence.length && advancing.cursor !== session.loopEndIndex; i++) {
      advancing = next(advancing)
    }
    expect(advancing.cursor).toBe(session.loopEndIndex)
    const closed = next(advancing)
    expect(closed.round).toBe(5)
  })
})
