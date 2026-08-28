import { describe, expect, it } from 'vitest'
import { GameDefinitionSchema } from '../schema'

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
    game.sections.push({
      id: 'round',
      title: 'Ronda',
      repeats: true,
      phases: [
        {
          id: 'round.jugadores',
          title: 'Jugadores',
          steps: [
            { id: 'round.jugadores.01', title: 'Paso', text: 'Haced otra cosa.' },
          ],
        },
      ],
    })
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('NO lanza con cero secciones repeats:true', () => {
    const game = baseGame()
    expect(game.sections.every(s => s.repeats === false)).toBe(true)
    expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
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
})
