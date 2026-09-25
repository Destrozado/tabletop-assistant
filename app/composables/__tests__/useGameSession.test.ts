// Tests puros de buildCounterCells (app/composables/useGameSession.ts). NO
// se monta ningún componente ni se cablea el composable reactivo — mismo
// criterio que D-Q2 de useStepShortcuts.ts: el cableado (session, computeds
// de Vue) queda fuera del test a propósito y solo se fijan las funciones
// puras exportadas. Corre en el proyecto `app-logic` (entorno node,
// vitest.config.ts), con los alias `~`/`~~` resueltos a mano igual que en
// useHeroSearch.test.ts.
import { describe, expect, it } from 'vitest'
import {
  buildBaseSetLabels,
  buildCounterCells,
  buildModulesValueLabel,
  buildStepValueCells,
  buildStepValueSuffix,
  withStartedAt,
} from '../useGameSession'
import type { CounterCell } from '../useGameSession'
import type { CatalogueBaseSets, CounterState, SessionContext } from '~~/engine/types'
import type { StepValueRow } from '~~/engine/stepValues'

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

// D-13/D-15 (Fase 8): las funciones no montan nada ni cablean sesión — solo
// las dos funciones puras que la costura reactiva (stepValueSuffix/
// stepValueRows) delega para dar forma al sufijo y a las filas.
function row(overrides: Partial<StepValueRow> = {}): StepValueRow {
  return {
    slot: 0,
    heroId: 'spider-man',
    heroName: 'Spider-Man',
    playerName: '',
    value: 6,
    ...overrides,
  }
}

describe('buildStepValueSuffix (D-08/D-15/VAL-03)', () => {
  it('un número finito produce el sufijo con un espacio inicial y paréntesis normales', () => {
    expect(buildStepValueSuffix(42)).toBe(' (42)')
  })

  it('0 sigue siendo un valor conocido, no se colapsa con ausencia', () => {
    expect(buildStepValueSuffix(0)).toBe(' (0)')
  })

  it('`null` no produce sufijo (VAL-03/D-15): el `<p>` queda idéntico al de antes de la fase', () => {
    expect(buildStepValueSuffix(null)).toBeNull()
  })
})

describe('buildStepValueCells (D-09/D-14)', () => {
  it('sin filas, devuelve un array vacío', () => {
    expect(buildStepValueCells([])).toEqual([])
  })

  it('una fila sin playerName se etiqueta Jugador 1 (base 1) con clave valor-0 (slot base 0)', () => {
    const cells = buildStepValueCells([row({ slot: 0, playerName: '', heroName: 'Spider-Man', value: 6 })])

    expect(cells).toHaveLength(1)
    expect(cells[0]!.key).toBe('valor-0')
    expect(cells[0]!.label).toBe('Jugador 1 · Spider-Man')
    expect(cells[0]!.value).toBe(6)
  })

  it('una fila con playerName produce «Ana · Thor»', () => {
    const cells = buildStepValueCells([row({ slot: 1, playerName: 'Ana', heroName: 'Thor', value: 14 })])

    expect(cells[0]!.label).toBe('Ana · Thor')
  })

  it('selección parcial (slots 0 y 2): las claves se conservan y ninguna celda intermedia se inventa', () => {
    const cells = buildStepValueCells([
      row({ slot: 0, heroName: 'Spider-Man' }),
      row({ slot: 2, heroName: 'Thor' }),
    ])

    expect(cells).toHaveLength(2)
    expect(cells.map(cell => cell.key)).toEqual(['valor-0', 'valor-2'])
  })

  it('ninguna celda contiene el marcador «—» (ese es de la banda de contadores, no de esta lista)', () => {
    const cells = buildStepValueCells([row(), row({ slot: 1 })])

    for (const cell of cells) {
      expect(cell.label).not.toContain('—')
      expect(String(cell.value)).not.toContain('—')
    }
  })
})

// Quick 260925-mpj (D-04): funciones puras de la fila «Módulos» y del modal
// «Módulos» — el cableado reactivo (moduleOptions/selectedModuleIds/
// baseSetLabels/toggleModule) queda fuera del test a propósito, mismo
// criterio que el resto del fichero.
describe('buildModulesValueLabel (D-04)', () => {
  it('sin ningún módulo elegido: «—» (em dash)', () => {
    expect(buildModulesValueLabel([])).toBe('—')
  })

  it('un módulo elegido: su nombre tal cual', () => {
    expect(buildModulesValueLabel(['Amenaza de bomba'])).toBe('Amenaza de bomba')
  })

  it('dos o más módulos: unidos por ", "', () => {
    expect(buildModulesValueLabel(['Amenaza de bomba', 'Legiones de Hydra'])).toBe('Amenaza de bomba, Legiones de Hydra')
  })
})

describe('buildBaseSetLabels (D-04)', () => {
  const baseSets: CatalogueBaseSets = { standard: 'Normal', expert: 'Experto' }

  it('dificultad normal: solo «Normal»', () => {
    expect(buildBaseSetLabels(baseSets, 'normal')).toEqual(['Normal'])
  })

  it('dificultad expert: «Normal» y «Experto»', () => {
    expect(buildBaseSetLabels(baseSets, 'expert')).toEqual(['Normal', 'Experto'])
  })

  it('baseSets null: []', () => {
    expect(buildBaseSetLabels(null, 'normal')).toEqual([])
    expect(buildBaseSetLabels(null, 'expert')).toEqual([])
  })
})

describe('withStartedAt (D-07)', () => {
  it('sella startedAt con el valor recibido', () => {
    const context: SessionContext = { playerCount: 3, difficulty: 'normal' }
    const result = withStartedAt(context, 1234567890)

    expect(result.startedAt).toBe(1234567890)
  })

  it('devuelve un objeto nuevo y no muta el original', () => {
    const context: SessionContext = { playerCount: 3, difficulty: 'normal' }
    const result = withStartedAt(context, 1234567890)

    expect(result).not.toBe(context)
    expect(context.startedAt).toBeUndefined()
  })

  it('conserva playerCount, difficulty y cualquier campo aditivo previo (selection, counters)', () => {
    const context: SessionContext = {
      playerCount: 4,
      difficulty: 'expert',
      selection: { villainId: 'kang', heroes: [] },
      counters: { villainHealth: 42, heroHealth: [14] },
    }
    const result = withStartedAt(context, 42)

    expect(result.playerCount).toBe(4)
    expect(result.difficulty).toBe('expert')
    expect(result.selection).toEqual(context.selection)
    expect(result.counters).toEqual(context.counters)
    expect(result.startedAt).toBe(42)
  })
})
