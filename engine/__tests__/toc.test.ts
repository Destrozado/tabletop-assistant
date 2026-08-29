import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import { flatten } from '../flatten'
import { validateGameDefinition } from '../schema'
import { tableOfContents } from '../toc'
import type { GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))
const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions = validateGameDefinition(rawMarvelChampions)

describe('tableOfContents', () => {
  it('agrupa los nodos consecutivos que comparten phaseId, usando phaseTitle como etiqueta', () => {
    const flat = flatten(tinyGame).map(node => ({ ...node, runtimeId: node.step.id }))
    const blocks = tableOfContents(flat, 0)

    expect(blocks).toHaveLength(2)
    expect(blocks[0].label).toBe('Preparación')
    expect(blocks[1].label).toBe('Turno')
    expect(blocks[0].steps).toHaveLength(3)
    expect(blocks[1].steps).toHaveLength(3)
  })

  it('cada fila lleva id igual al runtimeId y label igual al title del paso', () => {
    const flat = flatten(tinyGame).map(node => ({ ...node, runtimeId: node.step.id }))
    const blocks = tableOfContents(flat, 0)

    expect(blocks[0].steps[0]).toEqual({ id: 'intro.prep.01', label: 'Paso 1', mark: 'current' })
    expect(blocks[0].steps[1]).toEqual({ id: 'intro.prep.02', label: 'Paso 2', mark: null })
  })

  it('marca done los anteriores al cursor, current el del cursor y null los posteriores', () => {
    const session = expand(tinyGame, context)
    const blocks = tableOfContents(session.sequence, 2)
    const allRows = blocks.flatMap(b => b.steps)

    expect(allRows.filter(r => r.mark === 'done')).toHaveLength(2)
    expect(allRows.filter(r => r.mark === 'current')).toHaveLength(1)
    expect(allRows.filter(r => r.mark === null)).toHaveLength(3)
    expect(allRows[2].mark).toBe('current')
  })

  it('saltar hacia atrás hace que las marcas done posteriores desaparezcan en la siguiente llamada', () => {
    const session = expand(tinyGame, context)
    const forward = tableOfContents(session.sequence, 2)
    expect(forward.flatMap(b => b.steps).filter(r => r.mark === 'done')).toHaveLength(2)

    // Ningún estado adicional: recalcular con cursor menor basta.
    const backward = tableOfContents(session.sequence, 0)
    expect(backward.flatMap(b => b.steps).filter(r => r.mark === 'done')).toHaveLength(0)
    expect(backward.flatMap(b => b.steps)[0].mark).toBe('current')
  })

  it('sobre el contenido real de Marvel Champions con cursor 0 devuelve los 9 bloques en orden, con Jugadores y Villano al final', () => {
    const session = expand(marvelChampions, context)
    const blocks = tableOfContents(session.sequence, 0)

    // Con cursor 0 el nodo actual NO está en la sección repetible, así que el
    // orden es el natural del documento (sin reordenado; el reordenado D-24
    // llega en el plan 02-02).
    expect(blocks.map(b => b.label)).toEqual([
      'HÉROES',
      'ARCHIENEMIGOS',
      'MAZO DE ENCUENTROS',
      'ESCENARIO DEL VILLANO',
      'MANOS INICIALES',
      'JUGADOR INICIAL',
      'MESA LISTA',
      'Jugadores',
      'Villano',
    ])
  })

  it('con cursor 5 hay exactamente 5 filas done y exactamente 1 current sobre el contenido real', () => {
    const session = expand(marvelChampions, context)
    const blocks = tableOfContents(session.sequence, 5)
    const allRows = blocks.flatMap(b => b.steps)

    expect(allRows.filter(r => r.mark === 'done')).toHaveLength(5)
    expect(allRows.filter(r => r.mark === 'current')).toHaveLength(1)
  })

  it('es pura: misma entrada produce misma salida y no muta la secuencia recibida', () => {
    const session = expand(tinyGame, context)
    const sequenceCopy = JSON.parse(JSON.stringify(session.sequence))

    const first = tableOfContents(session.sequence, 3)
    const second = tableOfContents(session.sequence, 3)

    expect(first).toEqual(second)
    expect(session.sequence).toEqual(sequenceCopy)
  })
})
