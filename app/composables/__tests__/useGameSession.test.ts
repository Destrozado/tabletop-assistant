// Tests puros de buildCounterCells (app/composables/useGameSession.ts). NO
// se monta ningún componente ni se cablea el composable reactivo — mismo
// criterio que D-Q2 de useStepShortcuts.ts: el cableado (session, computeds
// de Vue) queda fuera del test a propósito y solo se fijan las funciones
// puras exportadas. Corre en el proyecto `app-logic` (entorno node,
// vitest.config.ts), con los alias `~`/`~~` resueltos a mano igual que en
// useHeroSearch.test.ts.
import { describe, expect, it } from 'vitest'
import { buildCounterCells } from '../useGameSession'
import type { CounterCell } from '../useGameSession'
import type { CounterState } from '~~/engine/types'

function slots(...playerNames: string[]): { heroId: string | null, playerName: string }[] {
  return playerNames.map(playerName => ({ heroId: null, playerName }))
}

describe('buildCounterCells (D-04/D-12/D-15/D-16)', () => {
  it('sin ningún valor conocido, todas las celdas pintan «—» (EM DASH, no un guion normal)', () => {
    const values: CounterState = { villainHealth: null, heroHealth: [null, null] }
    const cells = buildCounterCells(values, slots('', ''))

    expect(cells).toHaveLength(3)
    for (const cell of cells) {
      expect(cell.displayValue).toBe('—')
      expect(cell.displayValue).toBe('—') // EM DASH, no HYPHEN-MINUS
    }
  })

  it('la celda del villano va primera, con etiqueta VILLANO fija', () => {
    const values: CounterState = { villainHealth: 42, heroHealth: [14] }
    const cells = buildCounterCells(values, slots(''))

    expect(cells[0]).toEqual<CounterCell>({
      key: 'villano',
      label: 'VILLANO',
      displayValue: '42',
      defeated: false,
    })
  })

  it('el número llega como cadena, incluido el 0', () => {
    const values: CounterState = { villainHealth: 42, heroHealth: [14] }
    const cells = buildCounterCells(values, slots(''))

    expect(cells[0]!.displayValue).toBe('42')
    expect(typeof cells[0]!.displayValue).toBe('string')
    expect(cells[1]!.displayValue).toBe('14')
    expect(cells.some(cell => cell.defeated)).toBe(false)

    const zeroValues: CounterState = { villainHealth: null, heroHealth: [0] }
    const zeroCells = buildCounterCells(zeroValues, slots(''))
    expect(zeroCells[1]!.displayValue).toBe('0')
    expect(typeof zeroCells[1]!.displayValue).toBe('string')
  })

  it('un jugador sin nombre se etiqueta Jugador N con N base 1', () => {
    const values: CounterState = { villainHealth: null, heroHealth: [null, null] }
    const cells = buildCounterCells(values, slots('', ''))

    expect(cells[1]!.label).toBe('Jugador 1')
    expect(cells[2]!.label).toBe('Jugador 2')
  })

  it('un contador de héroe en 0 añade el sufijo · SIN VIDA y marca defeated', () => {
    const values: CounterState = { villainHealth: null, heroHealth: [0] }
    const cells = buildCounterCells(values, slots('Ana'))

    expect(cells[1]!.label).toBe('Ana · SIN VIDA')
    expect(cells[1]!.label).toBe('Ana · SIN VIDA')
    expect(cells[1]!.defeated).toBe(true)
    expect(cells[1]!.label).not.toContain('DERROTADO')
    expect(cells[1]!.label).not.toContain('DERROTADA')
  })

  it('en 1 la etiqueta vuelve al nombre limpio y defeated es false (HP-07, reversibilidad)', () => {
    const values: CounterState = { villainHealth: null, heroHealth: [1] }
    const cells = buildCounterCells(values, slots('Ana'))

    expect(cells[1]!.label).toBe('Ana')
    expect(cells[1]!.defeated).toBe(false)
  })

  it('el villano con valor 0 no se marca como derrotado y conserva su etiqueta (D-11)', () => {
    const values: CounterState = { villainHealth: 0, heroHealth: [] }
    const cells = buildCounterCells(values, [])

    expect(cells[0]!.label).toBe('VILLANO')
    expect(cells[0]!.defeated).toBe(false)
    expect(cells[0]!.displayValue).toBe('0')
  })

  it('las claves son \'villano\' y \'jugador-{índice base 0}\'', () => {
    const values: CounterState = { villainHealth: null, heroHealth: [null, null, null] }
    const cells = buildCounterCells(values, slots('', '', ''))

    expect(cells.map(cell => cell.key)).toEqual(['villano', 'jugador-0', 'jugador-1', 'jugador-2'])
  })

  it('hay siempre una celda más que jugadores', () => {
    for (const count of [1, 2, 3, 4]) {
      const values: CounterState = { villainHealth: null, heroHealth: Array.from({ length: count }, () => null) }
      const cells = buildCounterCells(values, slots(...Array.from({ length: count }, () => '')))
      expect(cells).toHaveLength(count + 1)
    }
  })

  it('`null` y `0` no se colapsan: mismo slot, valores distintos', () => {
    const nullValues: CounterState = { villainHealth: null, heroHealth: [null] }
    const nullCells = buildCounterCells(nullValues, slots(''))
    expect(nullCells[1]!.displayValue).toBe('—')
    expect(nullCells[1]!.defeated).toBe(false)

    const zeroValues: CounterState = { villainHealth: null, heroHealth: [0] }
    const zeroCells = buildCounterCells(zeroValues, slots(''))
    expect(zeroCells[1]!.displayValue).toBe('0')
    expect(zeroCells[1]!.defeated).toBe(true)
  })
})
