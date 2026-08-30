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

  // CR-01 (revisión 02): el esquema estaba en el modo por defecto de Zod
  // (*strip*), que acepta la clave desconocida y la borra en silencio. Como el
  // navegador consume el JSON crudo y no este objeto validado, cualquier clave
  // que Zod borrase seguía llegando a la tablet sin que CI la viera. Estos
  // gates fijan lo contrario para los seis objetos del esquema: la clave
  // desconocida LANZA.
  describe('claves desconocidas rechazadas (CR-01)', () => {
    function step(game: ReturnType<typeof baseGame>) {
      return game.sections[0].phases[0].steps[0] as any
    }

    it('lanza ZodError con una clave desconocida en la raíz del juego (GameDefinitionSchema)', () => {
      const game = { ...baseGame(), totallyUnknown: 1 }
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una clave desconocida en una sección (SectionSchema)', () => {
      const game = baseGame()
      ;(game.sections[0] as any).unknownKey = true
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una clave desconocida en una fase (PhaseSchema)', () => {
      const game = baseGame()
      ;(game.sections[0].phases[0] as any).unknownKey = true
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una clave desconocida en un paso (StepSchema)', () => {
      const game = baseGame()
      step(game).unknownKey = true
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('D-33: lanza ZodError con un campo branches en un paso (decisión bloqueada)', () => {
      const game = baseGame()
      step(game).branches = [{ label: 'Héroe' }]
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con warningDetails, la errata de warningDetail que antes se colaba muda', () => {
      const game = baseGame()
      step(game).warning = 'Aviso.'
      step(game).warningDetails = 'Consecuencia mal tecleada.'
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una clave desconocida en una citation (CitationSchema)', () => {
      const game = baseGame()
      step(game).citation = { source: 'rules-reference', section: 'Setup (p. 1)', unknownKey: true }
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una clave desconocida en una entrada de options', () => {
      const game = baseGame()
      step(game).options = [
        { label: 'Opción 1', detail: 'Detalle 1.', unknownKey: true },
        { label: 'Opción 2', detail: 'Detalle 2.' },
      ]
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una clave desconocida dentro de una variante de dificultad (TextBlockSchema.partial sigue siendo estricto)', () => {
      const game = baseGame()
      step(game).variants = { difficulty: { expert: { text: 'Otra cosa.', unknownKey: true } } }
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con un nivel de dificultad desconocido', () => {
      const game = baseGame()
      step(game).variants = { difficulty: { heroico: { text: 'Otra cosa.' } } }
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('el objeto validado sigue siendo idéntico al de entrada salvo por el default de kind', () => {
      const game = baseGame()
      const parsed = GameDefinitionSchema.parse(game)
      const expected = baseGame()
      for (const section of expected.sections) {
        for (const phase of section.phases) {
          for (const st of phase.steps) (st as any).kind = 'step'
        }
      }
      expect(parsed).toEqual(expected)
    })
  })

  describe('warningDetail (D-32)', () => {
    it('lanza ZodError con un warningDetail de 400 caracteres', () => {
      const game = baseGame()
      ;(game.sections[0].phases[0].steps[0] as any).warning = 'Aviso.'
      ;(game.sections[0].phases[0].steps[0] as any).warningDetail = 'a'.repeat(400)
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con warningDetail declarado sin warning en el mismo paso', () => {
      const game = baseGame()
      ;(game.sections[0].phases[0].steps[0] as any).warningDetail = 'Consecuencia detallada.'
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('acepta un paso que declara warning sin warningDetail', () => {
      const game = baseGame()
      ;(game.sections[0].phases[0].steps[0] as any).warning = 'Aviso sin detalle.'
      expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
    })

    it('acepta un paso que declara warning y warningDetail juntos, dentro del tope de 320', () => {
      const game = baseGame()
      ;(game.sections[0].phases[0].steps[0] as any).warning = 'Aviso.'
      ;(game.sections[0].phases[0].steps[0] as any).warningDetail = 'a'.repeat(320)
      expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
    })

    it('lanza ZodError cuando una variante de dificultad declara warningDetail sin warning propio ni heredado del base', () => {
      const game = baseGame()
      const step = game.sections[0].phases[0].steps[0] as any
      step.variants = { difficulty: { expert: { warningDetail: 'Consecuencia solo en experto.' } } }
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('acepta una variante que declara warningDetail cuando el paso base ya declara warning', () => {
      const game = baseGame()
      const step = game.sections[0].phases[0].steps[0] as any
      step.warning = 'Aviso base.'
      step.variants = { difficulty: { expert: { warningDetail: 'Consecuencia solo en experto.' } } }
      expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
    })
  })

  describe('options[] y optionsWarning (C1/C2, DC-10)', () => {
    function withOptions(count = 2) {
      const game = baseGame()
      const step = game.sections[0].phases[0].steps[0] as any
      step.options = Array.from({ length: count }, (_, i) => ({
        label: `Opción ${i + 1}`,
        detail: `Detalle de la opción ${i + 1}.`,
      }))
      return game
    }

    it('lanza ZodError con una label de 60 caracteres', () => {
      const game = withOptions()
      ;(game.sections[0].phases[0].steps[0] as any).options[0].label = 'a'.repeat(60)
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con un detail de 400 caracteres', () => {
      const game = withOptions()
      ;(game.sections[0].phases[0].steps[0] as any).options[0].detail = 'a'.repeat(400)
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una opción sin detail', () => {
      const game = withOptions()
      delete (game.sections[0].phases[0].steps[0] as any).options[0].detail
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una lista de una sola opción', () => {
      const game = withOptions(1)
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con una lista de nueve opciones', () => {
      const game = withOptions(9)
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con dos opciones que comparten la misma label en el mismo paso', () => {
      const game = withOptions()
      const step = game.sections[0].phases[0].steps[0] as any
      step.options[1].label = step.options[0].label
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con un optionsWarning de 80 caracteres', () => {
      const game = withOptions()
      ;(game.sections[0].phases[0].steps[0] as any).optionsWarning = 'a'.repeat(80)
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('lanza ZodError con optionsWarning declarado sin options', () => {
      const game = baseGame()
      ;(game.sections[0].phases[0].steps[0] as any).optionsWarning = 'Recordatorio huérfano.'
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })

    it('acepta un paso con options y sin optionsWarning', () => {
      const game = withOptions()
      expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
    })

    it('acepta un paso con options y optionsWarning dentro de los topes', () => {
      const game = withOptions()
      ;(game.sections[0].phases[0].steps[0] as any).optionsWarning = 'Recordatorio válido.'
      expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
    })

    it('lanza ZodError cuando una variante declara optionsWarning sin que ella ni el base declaren options', () => {
      const game = baseGame()
      const step = game.sections[0].phases[0].steps[0] as any
      step.variants = { difficulty: { expert: { optionsWarning: 'Recordatorio solo en experto.' } } }
      expect(() => GameDefinitionSchema.parse(game)).toThrow()
    })
  })
})
