import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateGameDefinition } from '../schema'

const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const marvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))

// Gates de autoría genéricos (CONT-08/D-06, D-08): recorren sections[].phases[].steps[]
// sin enumerar los 3 ids a mano, para que el plan 01-03 solo tenga que ampliar este mismo
// bloque cuando añada los 18 pasos restantes.
function allSteps(game: any) {
  return game.sections.flatMap((section: any) =>
    section.phases.flatMap((phase: any) => phase.steps))
}

describe('content/marvel-champions.json', () => {
  it('valida contra GameDefinitionSchema', () => {
    expect(() => validateGameDefinition(marvelChampions)).not.toThrow()
  })

  it('cada paso lleva citation con source rules-reference o learn-to-play (CONT-08/D-06)', () => {
    const steps = allSteps(marvelChampions as any)
    expect(steps.length).toBeGreaterThan(0)
    for (const step of steps) {
      expect(step.citation).toBeDefined()
      expect(['rules-reference', 'learn-to-play']).toContain(step.citation.source)
    }
  })

  it('ningún text supera los 90 caracteres', () => {
    const steps = allSteps(marvelChampions as any)
    for (const step of steps) {
      expect(step.text.length).toBeLessThanOrEqual(90)
    }
  })

  it('ningún texto menciona un recuento real de jugadores (D-08)', () => {
    const steps = allSteps(marvelChampions as any)
    for (const step of steps) {
      expect(step.text).not.toMatch(/\d+\s*jugadores/i)
      if (step.warning) {
        expect(step.warning).not.toMatch(/\d+\s*jugadores/i)
      }
    }
  })
})
