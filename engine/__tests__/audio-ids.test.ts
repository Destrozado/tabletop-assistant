import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { collectAudioIds, collectSpeechEntries } from '../audio'
import { expand } from '../expand'
import { resolveAudioId } from '../resolve'
import { validateGameDefinition } from '../schema'
import type { Difficulty, GameDefinition, RuntimeStepNode } from '../types'

const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions = validateGameDefinition(rawMarvelChampions)

// Mismo helper de recorrido genérico que content.test.ts (nunca listas de ids
// tecleadas): añadir/quitar contenido no debe exigir tocar este fichero.
function allSteps(game: GameDefinition) {
  return game.sections.flatMap(section =>
    section.phases.flatMap(phase => phase.steps))
}

const DIFFICULTIES: readonly Difficulty[] = ['normal', 'expert'] as const

describe('engine/audio.ts — collectSpeechEntries/collectAudioIds (VOZ-07/D-09)', () => {
  it('devuelve exactamente 37 entradas sobre el contenido real (33 base + 4 de variante)', () => {
    const entries = collectSpeechEntries(marvelChampions)
    expect(entries).toHaveLength(37)
  })

  it('todos los ids son únicos', () => {
    const ids = collectAudioIds(marvelChampions)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ningún id base termina en .normal ni en .expert (el sufijo de variante no puede colisionar con un id existente)', () => {
    const baseIds = allSteps(marvelChampions).map(step => step.id)
    for (const id of baseIds) {
      expect(id.endsWith('.normal')).toBe(false)
      expect(id.endsWith('.expert')).toBe(false)
    }
  })

  it('todos los ids encajan en /^[a-z0-9]+(\\.[a-z0-9-]+)*$/ (seguros como nombre de fichero y segmento de URL, T-03.1-06)', () => {
    const ids = collectAudioIds(marvelChampions)
    const pattern = /^[a-z0-9]+(\.[a-z0-9-]+)*$/
    for (const id of ids) {
      expect(id).toMatch(pattern)
    }
  })

  it('ninguna entrada tiene speech vacío tras trim()', () => {
    const entries = collectSpeechEntries(marvelChampions)
    for (const entry of entries) {
      expect(entry.speech.trim().length).toBeGreaterThan(0)
    }
  })

  it('cobertura total (mata el Pitfall 4): en normal y en expert, todo resolveAudioId no nulo de la secuencia expandida pertenece al catálogo de collectAudioIds', () => {
    const catalog = new Set(collectAudioIds(marvelChampions))
    for (const difficulty of DIFFICULTIES) {
      const session = expand(marvelChampions, { playerCount: 2, difficulty })
      for (const node of session.sequence) {
        const audioId = resolveAudioId(node, session.context)
        if (audioId !== null) {
          expect(catalog.has(audioId)).toBe(true)
        }
      }
    }
  })

  it('resolveAudioId devuelve null para un nodo kind:summary', () => {
    const session = expand(marvelChampions, { playerCount: 2, difficulty: 'normal' })
    const summaryNode = session.sequence.find(node => node.step.kind === 'summary')
    if (!summaryNode) throw new Error('No se encontró ningún nodo kind:summary en la secuencia expandida')
    expect(resolveAudioId(summaryNode, session.context)).toBeNull()
  })

  it('resolveAudioId devuelve null para un paso sin speech (construido a mano: el contenido real no tiene ninguno kind:step sin speech)', () => {
    const session = expand(marvelChampions, { playerCount: 2, difficulty: 'normal' })
    const anyNode = session.sequence[0]
    const stepWithoutSpeech: RuntimeStepNode = {
      ...anyNode,
      step: { ...anyNode.step, speech: undefined, variants: undefined },
    }
    expect(resolveAudioId(stepWithoutSpeech, session.context)).toBeNull()
  })

  it('los 2 pasos con variants.difficulty (derivados por recorrido) resuelven a ${id}.normal en normal y a ${id}.expert en experto', () => {
    const variedSteps = allSteps(marvelChampions).filter(step => step.variants?.difficulty)
    expect(variedSteps.length).toBeGreaterThan(0)

    for (const difficulty of DIFFICULTIES) {
      const session = expand(marvelChampions, { playerCount: 2, difficulty })
      for (const step of variedSteps) {
        const node = session.sequence.find(n => n.step.id === step.id)
        if (!node) throw new Error(`No se encontró el paso ${step.id} en la secuencia aplanada`)
        expect(resolveAudioId(node, session.context)).toBe(`${step.id}.${difficulty}`)
      }
    }
  })

  // "Gate que muerde" (D-04/D-05): demuestra que el test de cobertura total
  // (arriba) sí falla si resolveAudioId llegara a pedir un id fuera del
  // catálogo. Se muta una COPIA en memoria del catálogo, nunca el contenido
  // real ni el fichero fuente.
  it('el gate de cobertura muerde: un catálogo sin una entrada real hace fallar la comprobación', () => {
    const fullCatalog = new Set(collectAudioIds(marvelChampions))
    const [missingId] = fullCatalog
    const incompleteCatalog = new Set(fullCatalog)
    incompleteCatalog.delete(missingId)

    const session = expand(marvelChampions, { playerCount: 2, difficulty: 'normal' })
    const offendingNode = session.sequence.find(
      node => resolveAudioId(node, session.context) === missingId,
    )
    if (!offendingNode) throw new Error(`No se encontró el nodo que resuelve a ${missingId}`)

    expect(() => {
      const audioId = resolveAudioId(offendingNode, session.context)
      if (audioId !== null && !incompleteCatalog.has(audioId)) {
        throw new Error(
          `Audio desactualizado para: ${audioId}\n`
          + `Ejecuta: npm run voice:generate -- ${audioId}`,
        )
      }
    }).toThrow(/Audio desactualizado para/)
  })
})
