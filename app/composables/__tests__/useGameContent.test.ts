// WR-08 (09-REVIEW.md, ronda 3): getGame y getCatalogue comparten el mismo
// defecto (objeto literal indexado por el parámetro de ruta, dato no
// confiable) y la misma línea corregida (Object.hasOwn en el punto de
// lectura). Un solo fichero con dos `describe`, uno por composable, para no
// duplicar la constante de las ocho claves heredadas sin ganar nada.
import { describe, expect, it } from 'vitest'
import { useGameContent } from '../useGameContent'
import { useCharacterCatalogue } from '../useCharacterCatalogue'

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

describe('useGameContent — WR-08: el parámetro de ruta no resuelve por la cadena de prototipos', () => {
  const { getGame } = useGameContent()

  it.each(PROTOTYPE_KEYS)('getGame("%s") es null, nunca la función heredada de Object.prototype', (gameId) => {
    const result = getGame(gameId)
    expect(result).toBeNull()
    expect(typeof result !== 'function').toBe(true)
  })

  it('getGame("marvel-champions") sigue devolviendo la definición real', () => {
    const game = getGame('marvel-champions')
    expect(game).not.toBeNull()
    expect(game!.gameId).toBe('marvel-champions')
  })

  it('getGame("no-existe") y getGame("") devuelven null', () => {
    expect(getGame('no-existe')).toBeNull()
    expect(getGame('')).toBeNull()
  })
})

describe('useCharacterCatalogue — WR-08: ídem', () => {
  const { getCatalogue } = useCharacterCatalogue()

  it.each(PROTOTYPE_KEYS)('getCatalogue("%s") es null, nunca la función heredada de Object.prototype', (gameId) => {
    const result = getCatalogue(gameId)
    expect(result).toBeNull()
    expect(typeof result).not.toBe('function')
  })

  it('getCatalogue("marvel-champions") sigue devolviendo un catálogo con heroes no vacío', () => {
    const catalogue = getCatalogue('marvel-champions')
    expect(catalogue).not.toBeNull()
    expect(catalogue!.heroes.length).toBeGreaterThan(0)
  })

  it('getCatalogue("no-existe") y getCatalogue("") devuelven null', () => {
    expect(getCatalogue('no-existe')).toBeNull()
    expect(getCatalogue('')).toBeNull()
  })
})
