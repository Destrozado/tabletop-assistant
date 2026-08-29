import { describe, expect, it } from 'vitest'
import { GameDefinitionSchema } from '../schema'

// D-37: exactamente una sección repeats:true. baseGame() debe incluir SIEMPRE
// una sección repetible para que los tests negativos de este fichero (id
// vacío, text de 120, etc.) lancen por el motivo que dicen comprobar, y no
// por la invariante de repetición (02-RESEARCH.md Pitfall 2).
function baseGame() {
  return {
    gameId: 'test-game',
    title: 'Test Game',
    locale: 'es' as const,
    contentVersion: 1,
    sections: [
      {
        id: 'setup',
        title: 'Preparación',
        repeats: false,
        phases: [
          {
            id: 'setup.intro',
            title: 'Intro',
            steps: [
              { id: 'setup.intro.01', title: 'Paso 1', text: 'Haced algo.' },
            ],
          },
        ],
      },
      {
        id: 'ronda',
        title: 'Ronda',
        repeats: true,
        phases: [
          {
            id: 'ronda.turno',
            title: 'Jugadores',
            steps: [
              { id: 'ronda.turno.01', title: 'Paso ronda', text: 'Haced otra cosa.' },
            ],
          },
        ],
      },
    ],
  }
}

describe('GameDefinitionSchema', () => {
  it('acepta un juego mínimo válido', () => {
    expect(() => GameDefinitionSchema.parse(baseGame())).not.toThrow()
  })

  it('lanza ZodError con un paso sin id', () => {
    const game = baseGame()
    delete (game.sections[0].phases[0].steps[0] as any).id
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('lanza ZodError con dos secciones marcadas repeats:true', () => {
    const game = baseGame()
    game.sections[0].repeats = true
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('lanza ZodError con cero secciones repeats:true', () => {
    const game = baseGame()
    game.sections[1].repeats = false
    expect(game.sections.every(s => s.repeats === false)).toBe(true)
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('lanza ZodError con un text de 120 caracteres', () => {
    const game = baseGame()
    game.sections[0].phases[0].steps[0].text = 'a'.repeat(120)
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('lanza ZodError con un warning de 80 caracteres', () => {
    const game = baseGame()
    ;(game.sections[0].phases[0].steps[0] as any).warning = 'a'.repeat(80)
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('lanza ZodError con dos pasos que comparten el mismo id', () => {
    const game = baseGame()
    game.sections[0].phases[0].steps.push({
      id: game.sections[0].phases[0].steps[0].id,
      title: 'Paso duplicado',
      text: 'Otra acción.',
    })
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('acepta ids con guiones dentro de un segmento', () => {
    const game = baseGame()
    game.sections[0].phases[0].steps = [
      { id: 'setup.jugador-inicial', title: 'Jugador inicial', text: 'Decidid quién empieza.' },
      { id: 'setup.mesa-lista', title: 'Mesa lista', text: 'Revisad que todo esté en su sitio.' },
    ]
    expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
  })

  it('aplica kind: "step" por defecto cuando el paso no lo declara', () => {
    const game = baseGame()
    const parsed = GameDefinitionSchema.parse(game)
    expect(parsed.sections[0].phases[0].steps[0].kind).toBe('step')
  })

  it('WR-06: minPlayers/maxPlayers son opcionales; sin ellos no lanza', () => {
    const game = baseGame()
    expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
  })

  it('WR-06: acepta minPlayers/maxPlayers válidos', () => {
    const game = { ...baseGame(), minPlayers: 1, maxPlayers: 4 }
    const parsed = GameDefinitionSchema.parse(game)
    expect(parsed.minPlayers).toBe(1)
    expect(parsed.maxPlayers).toBe(4)
  })

  it('WR-06: lanza ZodError si minPlayers > maxPlayers', () => {
    const game = { ...baseGame(), minPlayers: 5, maxPlayers: 4 }
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })
})
