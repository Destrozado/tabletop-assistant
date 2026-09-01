import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import { describeHeader } from '../header'
import { validateGameDefinition } from '../schema'
import type { EngineSession, GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))
const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions = validateGameDefinition(rawMarvelChampions)

// Índices de la estructura real tras 02-01 (interfaces del plan 02-02),
// actualizados en 260831-pym tras fusionar ronda.jugadores.02+.03, y de nuevo
// en 260901-jg1 tras fusionar setup.archienemigos.01+.02:
// 0-21 setup kind:step, 22 setup kind:summary, 23-25 fase repetible A (3
// pasos), 26-31 fase repetible B (6 pasos).
const SETUP_STEP_INDEX = 6 // setup.encuentros.03 — 7º paso kind:step del tramo lineal
const SETUP_SUMMARY_INDEX = 22 // setup.mesa-lista.01
const PHASE_A_INDEX = 25 // ronda.jugadores.04 — 3er paso de "Jugadores"
const PHASE_B_INDEX = 28 // ronda.villano.03 — 3er paso de "Villano"
const PHASE_B_LAST_INDEX = 31 // ronda.villano.06 — 6º y último paso de "Villano"

function withCursorAndRound(session: EngineSession, cursor: number, round: number): EngineSession {
  return { ...session, cursor, round }
}

describe('describeHeader', () => {
  it('nodo de setup kind:step: sectionLabel/plainSectionTitle planos y posición global sobre el tramo lineal', () => {
    const session = expand(marvelChampions, context)
    const info = describeHeader(withCursorAndRound(session, SETUP_STEP_INDEX, 1))

    expect(info).toEqual({
      sectionLabel: 'PREPARACIÓN',
      plainSectionTitle: 'PREPARACIÓN',
      position: { current: 7, total: 22 },
    })
  })

  it('nodo kind:summary: sin posición, sectionLabel plano', () => {
    const session = expand(marvelChampions, context)
    const info = describeHeader(withCursorAndRound(session, SETUP_SUMMARY_INDEX, 1))

    expect(info).toEqual({
      sectionLabel: 'PREPARACIÓN',
      plainSectionTitle: 'PREPARACIÓN',
      position: null,
    })
  })

  it('nodo del tramo repetitivo, fase A, ronda 4: etiqueta compuesta y posición relativa a la fase (no a la sección)', () => {
    const session = expand(marvelChampions, context)
    const info = describeHeader(withCursorAndRound(session, PHASE_A_INDEX, 4))

    expect(info).toEqual({
      sectionLabel: 'RONDA 4 · Jugadores',
      plainSectionTitle: 'RONDA',
      position: { current: 3, total: 3 },
    })
  })

  it('nodo del tramo repetitivo, fase B, ronda 4: "3 de 6", NUNCA "7 de 10"', () => {
    const session = expand(marvelChampions, context)
    const info = describeHeader(withCursorAndRound(session, PHASE_B_INDEX, 4))

    expect(info).toEqual({
      sectionLabel: 'RONDA 4 · Villano',
      plainSectionTitle: 'RONDA',
      position: { current: 3, total: 6 },
    })
  })

  it('nodo del tramo repetitivo, fase B, ronda 12, último paso: "6 de 6"', () => {
    const session = expand(marvelChampions, context)
    const info = describeHeader(withCursorAndRound(session, PHASE_B_LAST_INDEX, 12))

    expect(info).toEqual({
      sectionLabel: 'RONDA 12 · Villano',
      plainSectionTitle: 'RONDA',
      position: { current: 6, total: 6 },
    })
  })

  it('cursor fuera de rango devuelve null', () => {
    const session = expand(marvelChampions, context)
    expect(describeHeader(withCursorAndRound(session, session.sequence.length, 1))).toBeNull()
    expect(describeHeader(withCursorAndRound(session, -1, 1))).toBeNull()
  })

  it('secuencia vacía devuelve null', () => {
    const session = expand(marvelChampions, context)
    const emptySession: EngineSession = { ...session, sequence: [], cursor: 0 }
    expect(describeHeader(emptySession)).toBeNull()
  })

  it('es puro: dos llamadas con la misma sesión devuelven objetos iguales y no mutan session.sequence', () => {
    const session = expand(marvelChampions, context)
    const withCursor = withCursorAndRound(session, PHASE_B_INDEX, 4)
    const sequenceCopy = JSON.parse(JSON.stringify(withCursor.sequence))

    const first = describeHeader(withCursor)
    const second = describeHeader(withCursor)

    expect(first).toEqual(second)
    expect(withCursor.sequence).toEqual(sequenceCopy)
  })

  it('sobre el fixture tiny-game.json, la sección repetible "Bucle" compone "BUCLE 2 · Turno" — nada cableado contra ronda/Villano/Jugadores (TECH-04)', () => {
    const session = expand(tinyGame, context)
    // El bucle del fixture arranca en el índice 3 (tras los 3 pasos de "Introducción").
    const info = describeHeader(withCursorAndRound(session, 3, 2))

    expect(info).toEqual({
      sectionLabel: 'BUCLE 2 · Turno',
      plainSectionTitle: 'BUCLE',
      position: { current: 1, total: 3 },
    })
  })
})
