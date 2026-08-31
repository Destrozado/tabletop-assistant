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

  it('sobre el contenido real de Marvel Champions con cursor 0 (fuera del bucle) devuelve los 9 bloques en orden natural, todos dimmed:false', () => {
    const session = expand(marvelChampions, context)
    const blocks = tableOfContents(session.sequence, 0)

    // Con cursor 0 el nodo actual NO está en la sección repetible, así que el
    // orden es el natural del documento — sin reordenado, sin atenuado (D-24).
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
    expect(blocks.every(b => b.dimmed === false)).toBe(true)
  })

  it('con cursor 5 hay exactamente 5 filas done y exactamente 1 current sobre el contenido real', () => {
    const session = expand(marvelChampions, context)
    const blocks = tableOfContents(session.sequence, 5)
    const allRows = blocks.flatMap(b => b.steps)

    expect(allRows.filter(r => r.mark === 'done')).toHaveLength(5)
    expect(allRows.filter(r => r.mark === 'current')).toHaveLength(1)
  })

  it('D-24: con el cursor dentro del bucle, los bloques Jugadores/Villano van primero en orden natural y los de la preparación van detrás, atenuados', () => {
    const session = expand(marvelChampions, context)
    // Índice 26 = ronda.jugadores.04 (interfaces del plan 02-02): dentro del bucle.
    const blocks = tableOfContents(session.sequence, 26)

    expect(blocks.map(b => b.label)).toEqual([
      'Jugadores',
      'Villano',
      'HÉROES',
      'ARCHIENEMIGOS',
      'MAZO DE ENCUENTROS',
      'ESCENARIO DEL VILLANO',
      'MANOS INICIALES',
      'JUGADOR INICIAL',
      'MESA LISTA',
    ])
    expect(blocks.slice(0, 2).every(b => b.dimmed === false)).toBe(true)
    expect(blocks.slice(2).every(b => b.dimmed === true)).toBe(true)
  })

  it('D-25: con el cursor dentro del bucle, ninguna fila del tramo repetitivo lleva done, ni siquiera las de pasos ya recorridos en esta misma ronda', () => {
    const session = expand(marvelChampions, context)
    // Índice 30 = ronda.villano.04: ya se recorrieron ronda.jugadores.01, .02 y
    // .04, y ronda.villano.01-03 en esta misma pasada por la ronda.
    const blocks = tableOfContents(session.sequence, 30)
    const loopRows = blocks.slice(0, 2).flatMap(b => b.steps)

    expect(loopRows.filter(r => r.mark === 'done')).toHaveLength(0)
    expect(loopRows.filter(r => r.mark === 'current')).toHaveLength(1)
    expect(loopRows.filter(r => r.mark === null)).toHaveLength(loopRows.length - 1)
  })

  it('las filas de la preparación conservan su marca done (por detrás del cursor) cuando el cursor está dentro del bucle — solo cambia el atenuado, no la marca', () => {
    const session = expand(marvelChampions, context)
    const blocks = tableOfContents(session.sequence, 26)
    const setupRows = blocks.slice(2).flatMap(b => b.steps)

    expect(setupRows.every(r => r.mark === 'done')).toBe(true)
  })

  it('sobre el fixture tiny-game.json, con el cursor dentro de la sección repetible "loop", el bloque "Turno" se lista antes que "Preparación" y queda dimmed:true', () => {
    const session = expand(tinyGame, context)
    // Índice 3 = loop.turno.01: primer paso de la sección repetible.
    const blocks = tableOfContents(session.sequence, 3)

    expect(blocks.map(b => b.label)).toEqual(['Turno', 'Preparación'])
    expect(blocks[0].dimmed).toBe(false)
    expect(blocks[1].dimmed).toBe(true)
    expect(blocks[1].steps.every(r => r.mark === 'done')).toBe(true)
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
