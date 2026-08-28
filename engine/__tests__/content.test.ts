import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateGameDefinition } from '../schema'
import { flatten } from '../flatten'
import { expand } from '../expand'
import { resolveText } from '../resolve'
import type { GameDefinition, RuntimeStepNode } from '../types'

const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions = validateGameDefinition(rawMarvelChampions)

// Gates de autoría genéricos (CONT-08/D-06, D-08): recorren sections[].phases[].steps[]
// sin enumerar ids a mano, para que futuras fases solo tengan que ampliar el contenido,
// no reescribir este test.
function allSteps(game: GameDefinition) {
  return game.sections.flatMap(section =>
    section.phases.flatMap(phase => phase.steps))
}

// D-08: ningún dígito ni numeral escrito (uno/dos/tres/cuatro) seguido de "jugador(es)".
// La fórmula genérica ("número de jugadores") no cae aquí: no lleva dígito ni numeral escrito.
const PLAYER_COUNT_PATTERN = /(\d+\s*jugadores?)|(\b(un|dos|tres|cuatro)\s+jugadores?\b)/i

function findRuntimeNode(sequence: RuntimeStepNode[], stepId: string): RuntimeStepNode {
  const node = sequence.find(n => n.step.id === stepId)
  if (!node) throw new Error(`No se encontró el paso ${stepId} en la secuencia aplanada`)
  return node
}

describe('content/marvel-champions.json', () => {
  it('valida contra GameDefinitionSchema', () => {
    expect(() => validateGameDefinition(rawMarvelChampions)).not.toThrow()
  })

  it('la sección setup aplanada produce exactamente 22 nodos: 21 kind step y 1 kind summary', () => {
    const steps = allSteps(marvelChampions)
    expect(steps.length).toBe(22)
    expect(steps.filter(s => (s.kind ?? 'step') === 'step').length).toBe(21)
    expect(steps.filter(s => s.kind === 'summary').length).toBe(1)
  })

  it('cada paso con kind step lleva citation con source rules-reference o learn-to-play y page entero positivo (CONT-08/D-06)', () => {
    const steps = allSteps(marvelChampions).filter(s => (s.kind ?? 'step') === 'step')
    expect(steps.length).toBeGreaterThan(0)
    for (const step of steps) {
      expect(step.citation).toBeDefined()
      expect(step.citation!.source).toBe('rules-reference')
      expect(Number.isInteger(step.citation!.page)).toBe(true)
      expect(step.citation!.page!).toBeGreaterThan(0)
    }
  })

  it('el paso kind summary no lleva citation', () => {
    const summarySteps = allSteps(marvelChampions).filter(s => s.kind === 'summary')
    expect(summarySteps.length).toBe(1)
    expect(summarySteps[0].citation).toBeUndefined()
  })

  it('ningún text supera los 90 caracteres y ningún warning supera los 60 (presupuesto de 01-UI-SPEC.md)', () => {
    const steps = allSteps(marvelChampions)
    for (const step of steps) {
      expect(step.text.length).toBeLessThanOrEqual(90)
      if (step.warning) {
        expect(step.warning.length).toBeLessThanOrEqual(60)
      }
    }
  })

  it('ningún text, warning ni title menciona un recuento concreto de jugadores (D-08)', () => {
    const steps = allSteps(marvelChampions)
    for (const step of steps) {
      expect(step.text).not.toMatch(PLAYER_COUNT_PATTERN)
      expect(step.title).not.toMatch(PLAYER_COUNT_PATTERN)
      if (step.warning) {
        expect(step.warning).not.toMatch(PLAYER_COUNT_PATTERN)
      }
      if (step.variants?.difficulty) {
        for (const variant of Object.values(step.variants.difficulty)) {
          if (variant?.text) expect(variant.text).not.toMatch(PLAYER_COUNT_PATTERN)
          if (variant?.warning) expect(variant.warning).not.toMatch(PLAYER_COUNT_PATTERN)
        }
      }
    }
  })

  it('la fórmula genérica del dial de vida del villano pasa el patrón de recuento de jugadores (sin dígito ni numeral escrito)', () => {
    const step = allSteps(marvelChampions).find(s => s.id === 'setup.escenario.02')
    expect(step).toBeDefined()
    expect(step!.text).toMatch(/número de jugadores/i)
    expect(step!.text).not.toMatch(PLAYER_COUNT_PATTERN)
  })

  it('exactamente 3 pasos declaran warning (D-05)', () => {
    const steps = allSteps(marvelChampions)
    const warned = steps.filter(s => s.warning)
    expect(warned.map(s => s.id).sort()).toEqual([
      'setup.archienemigos.02',
      'setup.encuentros.04',
      'setup.manos.03',
    ])
  })

  it('el paso de obligaciones dice "una o más" y nunca "una por jugador" (corrección de reglas confirmada)', () => {
    const step = allSteps(marvelChampions).find(s => s.id === 'setup.encuentros.04')
    expect(step).toBeDefined()
    expect(step!.text).toMatch(/una o más/i)
    expect(step!.text).not.toMatch(/una por jugador/i)
    expect(step!.warning ?? '').not.toMatch(/una por jugador/i)
  })

  it('ninguna cita al Apéndice II usa la página 48 (desfase confirmado por 01-RESEARCH)', () => {
    const steps = allSteps(marvelChampions).filter(s => s.citation)
    for (const step of steps) {
      if (/Apéndice II/i.test(step.citation!.section)) {
        expect(step.citation!.page).not.toBe(48)
      }
    }
  })

  it('exactamente 2 pasos declaran variants.difficulty, ambos con normal y expert (ADAPT-01)', () => {
    const steps = allSteps(marvelChampions)
    const varied = steps.filter(s => s.variants?.difficulty)
    expect(varied.map(s => s.id).sort()).toEqual([
      'setup.encuentros.03',
      'setup.escenario.04',
    ])
    for (const step of varied) {
      expect(step.variants!.difficulty!.normal).toBeDefined()
      expect(step.variants!.difficulty!.expert).toBeDefined()
    }
  })

  it('resolveText sobre setup.encuentros.03 devuelve textos distintos por dificultad, y ambos difieren del base', () => {
    const session = expand(marvelChampions, { playerCount: 3, difficulty: 'normal' })
    const node = findRuntimeNode(session.sequence, 'setup.encuentros.03')
    const baseText = node.step.text
    const normalText = resolveText(node, { playerCount: 3, difficulty: 'normal' }).text
    const expertText = resolveText(node, { playerCount: 3, difficulty: 'expert' }).text

    expect(normalText).not.toBe(expertText)
    expect(normalText).not.toBe(baseText)
    expect(expertText).not.toBe(baseText)
  })

  it('resolveText sobre setup.escenario.04 devuelve textos distintos por dificultad, y ambos difieren del base', () => {
    const session = expand(marvelChampions, { playerCount: 3, difficulty: 'normal' })
    const node = findRuntimeNode(session.sequence, 'setup.escenario.04')
    const baseText = node.step.text
    const normalText = resolveText(node, { playerCount: 3, difficulty: 'normal' }).text
    const expertText = resolveText(node, { playerCount: 3, difficulty: 'expert' }).text

    expect(normalText).not.toBe(expertText)
    expect(normalText).not.toBe(baseText)
    expect(expertText).not.toBe(baseText)
  })

  it('el número de nodos aplanados es idéntico con dificultad normal y con dificultad expert (ningún paso aparece/desaparece por dificultad)', () => {
    const normalSession = expand(marvelChampions, { playerCount: 3, difficulty: 'normal' })
    const expertSession = expand(marvelChampions, { playerCount: 3, difficulty: 'expert' })
    expect(normalSession.sequence.length).toBe(expertSession.sequence.length)
    expect(normalSession.sequence.length).toBe(22)
  })

  it('toda fase con al menos un paso kind step declara summaryLabel no vacío', () => {
    for (const phase of marvelChampions.sections[0].phases) {
      const hasStepKind = phase.steps.some(s => (s.kind ?? 'step') === 'step')
      if (hasStepKind) {
        expect(phase.summaryLabel).toBeDefined()
        expect(phase.summaryLabel!.length).toBeGreaterThan(0)
      }
    }
  })

  it('el gate muerde: un text de 120 caracteres construido en memoria hace fallar la validación (sin tocar el fichero real)', () => {
    const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
    mutated.sections[0].phases[0].steps[0].text = 'x'.repeat(120)
    expect(() => validateGameDefinition(mutated)).toThrow()
  })
})
