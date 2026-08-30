import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateGameDefinition } from '../schema'
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

// Lee un paso por su id, nunca por índice de array (02-01-PLAN.md tarea 3):
// insertar un paso en el futuro debe romper el recuento, no desplazar en
// silencio las comprobaciones semánticas de otro paso.
function findStep(game: GameDefinition, id: string) {
  const step = allSteps(game).find(s => s.id === id)
  if (!step) throw new Error(`No se encontró el paso ${id}`)
  return step
}

// CR-01 (revisión 02): un gate que afirma la AUSENCIA de un campo debe leer el
// JSON CRUDO, no el validado. Con el esquema en modo strip, Zod borraba la clave
// desconocida antes de que la aserción la mirase, así que era estructuralmente
// incapaz de fallar. El esquema ya es estricto (engine/schema.ts) y lanzaría,
// pero la aserción sigue leyendo el crudo a propósito: es el objeto que
// useGameContent.ts importa y que de verdad llega a la tablet.
function findRawStep(id: string) {
  return findStep(rawMarvelChampions as GameDefinition, id)
}

function rondaSteps(game: GameDefinition) {
  const ronda = game.sections.find(s => s.id === 'ronda')
  if (!ronda) throw new Error('No se encontró la sección ronda')
  return ronda.phases.flatMap(p => p.steps)
}

describe('content/marvel-champions.json', () => {
  it('valida contra GameDefinitionSchema', () => {
    expect(() => validateGameDefinition(rawMarvelChampions)).not.toThrow()
  })

  it('WR-06: declara minPlayers 1 y maxPlayers 4', () => {
    expect(marvelChampions.minPlayers).toBe(1)
    expect(marvelChampions.maxPlayers).toBe(4)
  })

  it('el contenido aplanado produce exactamente 34 nodos: 33 kind step y 1 kind summary', () => {
    const steps = allSteps(marvelChampions)
    expect(steps.length).toBe(34)
    expect(steps.filter(s => (s.kind ?? 'step') === 'step').length).toBe(33)
    expect(steps.filter(s => s.kind === 'summary').length).toBe(1)
  })

  it('cada paso con kind step lleva citation con source rules-reference o learn-to-play y page entero positivo (CONT-08/D-06)', () => {
    const steps = allSteps(marvelChampions).filter(s => (s.kind ?? 'step') === 'step')
    expect(steps.length).toBeGreaterThan(0)
    for (const step of steps) {
      expect(step.citation).toBeDefined()
      expect(['rules-reference', 'learn-to-play']).toContain(step.citation!.source)
      expect(Number.isInteger(step.citation!.page)).toBe(true)
      expect(step.citation!.page!).toBeGreaterThan(0)
    }
  })

  it('el paso kind summary no lleva citation', () => {
    const summarySteps = allSteps(marvelChampions).filter(s => s.kind === 'summary')
    expect(summarySteps.length).toBe(1)
    expect(summarySteps[0].citation).toBeUndefined()
  })

  it('DC-1 (D-38): todo paso kind:step declara speech no vacío de <=120 caracteres, sin ⚠, × ni ›', () => {
    const steps = allSteps(marvelChampions).filter(s => (s.kind ?? 'step') === 'step')
    expect(steps).toHaveLength(33)
    for (const step of steps) {
      expect(step.speech).toBeDefined()
      expect(step.speech!.length).toBeGreaterThan(0)
      expect(step.speech!.length).toBeLessThanOrEqual(120)
      expect(step.speech).not.toMatch(/[⚠×›]/)
    }
  })

  it('D-41: toda variante de dificultad que declara text declara también speech', () => {
    for (const step of allSteps(marvelChampions)) {
      const variants = step.variants?.difficulty
      if (!variants) continue
      for (const [level, variant] of Object.entries(variants)) {
        if (variant?.text !== undefined) {
          expect(variant.speech, `${step.id} variant "${level}" tiene text pero no speech`).toBeDefined()
          expect(variant.speech!.length, `${step.id} variant "${level}" speech vacío`).toBeGreaterThan(0)
          expect(variant.speech!.length, `${step.id} variant "${level}" speech supera 120 caracteres`).toBeLessThanOrEqual(120)
          expect(variant.speech, `${step.id} variant "${level}" speech contiene glifo prohibido`).not.toMatch(/[⚠×›]/)
        }
      }
    }
  })

  it('D-39: ninguna frase speech reproduce el warning de su paso', () => {
    const steps = allSteps(marvelChampions).filter(s => (s.kind ?? 'step') === 'step' && s.warning)
    expect(steps.length).toBeGreaterThan(0)
    for (const step of steps) {
      expect(step.speech).toBeDefined()
      expect(step.speech, `${step.id} speech repite su propio warning`).not.toContain(step.warning!)
    }
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

  it('ningún text, warning, warningDetail, title, optionsWarning ni options[].label/detail menciona un recuento concreto de jugadores (D-08, extendido en 02-05 para C1/C2)', () => {
    const steps = allSteps(marvelChampions)
    for (const step of steps) {
      expect(step.text).not.toMatch(PLAYER_COUNT_PATTERN)
      expect(step.title).not.toMatch(PLAYER_COUNT_PATTERN)
      if (step.warning) {
        expect(step.warning).not.toMatch(PLAYER_COUNT_PATTERN)
      }
      if (step.warningDetail) {
        expect(step.warningDetail).not.toMatch(PLAYER_COUNT_PATTERN)
      }
      if (step.optionsWarning) {
        expect(step.optionsWarning).not.toMatch(PLAYER_COUNT_PATTERN)
      }
      if (step.options) {
        for (const option of step.options) {
          expect(option.label).not.toMatch(PLAYER_COUNT_PATTERN)
          expect(option.detail).not.toMatch(PLAYER_COUNT_PATTERN)
        }
      }
      if (step.variants?.difficulty) {
        for (const variant of Object.values(step.variants.difficulty)) {
          if (variant?.text) expect(variant.text).not.toMatch(PLAYER_COUNT_PATTERN)
          if (variant?.warning) expect(variant.warning).not.toMatch(PLAYER_COUNT_PATTERN)
          if (variant?.warningDetail) expect(variant.warningDetail).not.toMatch(PLAYER_COUNT_PATTERN)
          if (variant?.optionsWarning) expect(variant.optionsWarning).not.toMatch(PLAYER_COUNT_PATTERN)
          if (variant?.options) {
            for (const option of variant.options) {
              expect(option.label).not.toMatch(PLAYER_COUNT_PATTERN)
              expect(option.detail).not.toMatch(PLAYER_COUNT_PATTERN)
            }
          }
        }
      }
    }
  })

  it('el dial de vida del villano usa el valor de la carta de villano, sin mencionar jugadores (corrección de reglas confirmada)', () => {
    const step = allSteps(marvelChampions).find(s => s.id === 'setup.escenario.02')
    expect(step).toBeDefined()
    expect(step!.text).toMatch(/valor indicado en la carta de villano/i)
    expect(step!.text).not.toMatch(PLAYER_COUNT_PATTERN)
    expect(step!.text).not.toMatch(/jugadores?/i)
  })

  it('exactamente 11 pasos declaran warning (D-05, D-21/D-29 aplicados a la ronda)', () => {
    const steps = allSteps(marvelChampions)
    const warned = steps.filter(s => s.warning)
    expect(warned.map(s => s.id).sort()).toEqual([
      'ronda.jugadores.01',
      'ronda.jugadores.03',
      'ronda.jugadores.04',
      'ronda.villano.01',
      'ronda.villano.02',
      'ronda.villano.03',
      'ronda.villano.04',
      'ronda.villano.06',
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
    expect(normalSession.sequence.length).toBe(34)
  })

  it('toda fase con al menos un paso kind step declara summaryLabel no vacío', () => {
    for (const section of marvelChampions.sections) {
      for (const phase of section.phases) {
        const hasStepKind = phase.steps.some(s => (s.kind ?? 'step') === 'step')
        if (hasStepKind) {
          expect(phase.summaryLabel).toBeDefined()
          expect(phase.summaryLabel!.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('el gate muerde: un text de 120 caracteres construido en memoria hace fallar la validación (sin tocar el fichero real)', () => {
    const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
    mutated.sections[0].phases[0].steps[0].text = 'x'.repeat(120)
    expect(() => validateGameDefinition(mutated)).toThrow()
  })

  describe('sección ronda (D-34/D-35, CONT-02/03/04/05/06/07, ADAPT-04)', () => {
    it('existe una sección ronda con repeats:true, exactamente 2 fases; jugadores tiene 4 pasos kind step y villano exactamente 6; el último paso es ronda.villano.06', () => {
      const ronda = marvelChampions.sections.find(s => s.id === 'ronda')
      expect(ronda).toBeDefined()
      expect(ronda!.repeats).toBe(true)
      expect(ronda!.phases).toHaveLength(2)

      const jugadores = ronda!.phases.find(p => p.id === 'ronda.jugadores')!
      const villano = ronda!.phases.find(p => p.id === 'ronda.villano')!
      expect(jugadores.steps.filter(s => (s.kind ?? 'step') === 'step')).toHaveLength(4)
      expect(villano.steps.filter(s => (s.kind ?? 'step') === 'step')).toHaveLength(6)

      const allRondaSteps = rondaSteps(marvelChampions)
      expect(allRondaSteps[allRondaSteps.length - 1].id).toBe('ronda.villano.06')
    })

    it('las fases de la ronda van en Title Case, no en mayúsculas (Pitfall 5)', () => {
      const ronda = marvelChampions.sections.find(s => s.id === 'ronda')!
      const jugadores = ronda.phases.find(p => p.id === 'ronda.jugadores')!
      const villano = ronda.phases.find(p => p.id === 'ronda.villano')!
      expect(jugadores.title).toBe('Jugadores')
      expect(villano.title).toBe('Villano')
      expect(jugadores.title).not.toBe(jugadores.title.toUpperCase())
      expect(villano.title).not.toBe(villano.title.toUpperCase())
    })

    it('CONT-02: orden de fin de fase — descartar, robar, enderezar, en ese orden de ids', () => {
      const ronda = marvelChampions.sections.find(s => s.id === 'ronda')!
      const jugadores = ronda.phases.find(p => p.id === 'ronda.jugadores')!
      expect(jugadores.steps.map(s => s.id)).toEqual([
        'ronda.jugadores.01',
        'ronda.jugadores.02',
        'ronda.jugadores.03',
        'ronda.jugadores.04',
      ])
      expect(findStep(marvelChampions, 'ronda.jugadores.02').text).toMatch(/descartad/i)
      expect(findStep(marvelChampions, 'ronda.jugadores.03').text).toMatch(/robad/i)
      expect(findStep(marvelChampions, 'ronda.jugadores.04').text).toMatch(/enderezad/i)
    })

    it('CONT-04: ronda.villano.05 pasa la ficha de jugador inicial y ronda.villano.06 existe como paso real', () => {
      expect(findStep(marvelChampions, 'ronda.villano.05').text).toMatch(/ficha de jugador inicial/i)
      const step06 = findStep(marvelChampions, 'ronda.villano.06')
      expect(step06.kind ?? 'step').toBe('step')
    })

    it('CONT-05: agotamiento del mazo de jugador y del mazo de encuentros son avisos distintos', () => {
      const jugadorWarning = findStep(marvelChampions, 'ronda.jugadores.03').warning!
      const encuentrosWarning = findStep(marvelChampions, 'ronda.villano.04').warning!
      expect(jugadorWarning).toMatch(/barajad el descarte/i)
      expect(jugadorWarning).not.toMatch(/aceleración/i)
      expect(encuentrosWarning).toMatch(/aceleración/i)
      expect(jugadorWarning).not.toBe(encuentrosWarning)
    })

    it('CONT-06: aviso de cambio de fase del villano remite al dial del villano', () => {
      expect(findStep(marvelChampions, 'ronda.jugadores.01').warning).toMatch(/dial del villano/i)
    })

    it('CONT-07: aviso de los enemigos activan remite a los Estados', () => {
      expect(findStep(marvelChampions, 'ronda.villano.02').warning).toMatch(/estados/i)
    })

    it('ADAPT-04 (D-33): ronda.villano.02 muestra la rama héroe y la rama alter-ego a la vez, sin campo branches', () => {
      // CR-01: se lee del CRUDO, no del validado, para que la última aserción pueda fallar de verdad.
      const step = findRawStep('ronda.villano.02')
      expect(step.text).toMatch(/héroe/i)
      expect(step.text).toMatch(/alter-ego/i)
      expect((step as unknown as { branches?: unknown }).branches).toBeUndefined()
    })

    it('gate CR-01/D-33 que muerde: añadir branches a un paso de una copia en memoria hace fallar la validación', () => {
      const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
      const step = findStep(mutated, 'ronda.villano.02')
      ;(step as unknown as { branches?: unknown[] }).branches = [{ label: 'Héroe' }]
      expect(() => validateGameDefinition(mutated)).toThrow()
    })

    it('gate CR-01 que muerde: la errata warningDetails (por warningDetail) hace fallar la validación en vez de colarse muda hasta la mesa', () => {
      const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
      const step = findStep(mutated, 'ronda.jugadores.01')
      ;(step as unknown as { warningDetails?: string }).warningDetails = step.warningDetail
      expect(() => validateGameDefinition(mutated)).toThrow()
    })

    it('gate CR-01 que muerde: una clave desconocida en la raíz del juego hace fallar la validación', () => {
      const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
      ;(mutated as unknown as { totallyUnknown?: number }).totallyUnknown = 1
      expect(() => validateGameDefinition(mutated)).toThrow()
    })

    it('error confirmado nº2: ningún text ni warning de la ronda dice "una por jugador"', () => {
      for (const step of rondaSteps(marvelChampions)) {
        expect(step.text).not.toMatch(/una por jugador/i)
        expect(step.warning ?? '').not.toMatch(/una por jugador/i)
      }
    })

    it('error confirmado nº3 (negativo): ningún campo de la ronda dice "todos los esbirros"', () => {
      for (const step of rondaSteps(marvelChampions)) {
        expect(step.text).not.toMatch(/todos los esbirros/i)
        expect(step.warning ?? '').not.toMatch(/todos los esbirros/i)
        expect(step.warningDetail ?? '').not.toMatch(/todos los esbirros/i)
      }
    })

    it('error confirmado nº3 (positivo, 02-03): ronda.villano.02.warningDetail casa con "palabra clave Villano" y con "carta de aumento"', () => {
      const detail = findStep(marvelChampions, 'ronda.villano.02').warningDetail!
      expect(detail).toMatch(/palabra clave Villano/i)
      expect(detail).toMatch(/carta de aumento/i)
    })

    it('error confirmado nº4: ningún paso de la ronda declara variants.difficulty ni menciona "experto"/"heroico"', () => {
      for (const step of rondaSteps(marvelChampions)) {
        expect(step.variants?.difficulty).toBeUndefined()
        expect(step.text).not.toMatch(/experto|heroico/i)
        expect(step.warning ?? '').not.toMatch(/experto|heroico/i)
      }
    })

    it('ningún warning ni optionsWarning del fichero contiene el glifo ⚠, y ninguna options[].label/detail tampoco (los glifos los antepone la plantilla, extendido en 02-05)', () => {
      for (const step of allSteps(marvelChampions)) {
        if (step.warning) {
          expect(step.warning).not.toMatch(/⚠/)
        }
        if (step.optionsWarning) {
          expect(step.optionsWarning).not.toMatch(/⚠/)
        }
        if (step.options) {
          for (const option of step.options) {
            expect(option.label).not.toMatch(/⚠/)
            expect(option.detail).not.toMatch(/⚠/)
          }
        }
      }
    })

    it('gate D-37 que muerde: poner repeats:false en la sección ronda de una copia en memoria hace fallar la validación', () => {
      const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
      const ronda = mutated.sections.find((s: { id: string }) => s.id === 'ronda')
      ronda.repeats = false
      expect(() => validateGameDefinition(mutated)).toThrow()
    })

    it('D-32: exactamente 6 pasos declaran warningDetail, en esta lista ordenada de ids', () => {
      const steps = allSteps(marvelChampions)
      const withDetail = steps.filter(s => s.warningDetail)
      expect(withDetail.map(s => s.id).sort()).toEqual([
        'ronda.jugadores.01',
        'ronda.jugadores.03',
        'ronda.jugadores.04',
        'ronda.villano.02',
        'ronda.villano.04',
        'ronda.villano.06',
      ])
    })

    it('D-32: ningún warningDetail supera 320 caracteres ni contiene el carácter de salto de línea', () => {
      const steps = allSteps(marvelChampions).filter(s => s.warningDetail)
      expect(steps.length).toBeGreaterThan(0)
      for (const step of steps) {
        expect(step.warningDetail!.length).toBeLessThanOrEqual(320)
        expect(step.warningDetail).not.toMatch(/\n/)
      }
    })

    it('DC-8: todo paso que declara warningDetail declara también warning (nunca huérfano)', () => {
      const steps = allSteps(marvelChampions).filter(s => s.warningDetail)
      expect(steps.length).toBeGreaterThan(0)
      for (const step of steps) {
        expect(step.warning).toBeDefined()
      }
    })

    it('gate DC-8 que muerde: borrar el warning de ronda.villano.02 dejando su warningDetail hace fallar la validación', () => {
      const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
      const step = mutated.sections
        .flatMap((s: { phases: { steps: { id: string, warning?: string }[] }[] }) => s.phases)
        .flatMap((p: { steps: { id: string, warning?: string }[] }) => p.steps)
        .find((s: { id: string }) => s.id === 'ronda.villano.02')
      delete step.warning
      expect(() => validateGameDefinition(mutated)).toThrow()
    })

    describe('options[] y optionsWarning (C1/C2, DC-10/DC-11)', () => {
      it('exactamente un paso declara options, y es ronda.jugadores.01', () => {
        const withOptions = allSteps(marvelChampions).filter(s => s.options)
        expect(withOptions.map(s => s.id)).toEqual(['ronda.jugadores.01'])
      })

      it('ese paso declara exactamente 6 opciones, en el orden literal de <content_spec>', () => {
        const step = findStep(marvelChampions, 'ronda.jugadores.01')
        expect(step.options).toHaveLength(6)
        expect(step.options!.map(o => o.label)).toEqual([
          'Cambiar Alter-Ego / Héroe',
          'Poner cartas en juego',
          'Utilizar eventos',
          'Usar un poder básico',
          'Activar aliados',
          'Activar habilidades «Acción»',
        ])
      })

      it('ninguna label supera 40 caracteres ni ningún detail supera 320; ninguno contiene salto de línea; las labels son únicas', () => {
        const step = findStep(marvelChampions, 'ronda.jugadores.01')
        const labels = step.options!.map(o => o.label)
        expect(new Set(labels).size).toBe(labels.length)
        for (const option of step.options!) {
          expect(option.label.length).toBeLessThanOrEqual(40)
          expect(option.detail.length).toBeLessThanOrEqual(320)
          expect(option.label).not.toMatch(/\n/)
          expect(option.detail).not.toMatch(/\n/)
        }
      })

      it('C2 bajo gate de igualdad: ronda.jugadores.01.optionsWarning es exactamente igual a ronda.villano.02.warning, y ambos casan con /estados/i', () => {
        const jugadores = findStep(marvelChampions, 'ronda.jugadores.01')
        const villano = findStep(marvelChampions, 'ronda.villano.02')
        expect(jugadores.optionsWarning).toBe(villano.warning)
        expect(jugadores.optionsWarning).toMatch(/estados/i)
        expect(villano.warning).toMatch(/estados/i)
      })

      it('nada de 02-03 se pierde: ronda.jugadores.01 sigue con warning sobre el dial del villano y con warningDetail', () => {
        const step = findStep(marvelChampions, 'ronda.jugadores.01')
        expect(step.warning).toMatch(/dial del villano/i)
        expect(step.warningDetail).toBeDefined()
      })

      it('ronda.villano.02 intacto: su warning sigue siendo exactamente "Atentos a los Estados en los personajes"', () => {
        const step = findStep(marvelChampions, 'ronda.villano.02')
        expect(step.warning).toBe('Atentos a los Estados en los personajes')
      })

      it('contentVersion es exactamente 10 (PERS-03)', () => {
        expect(marvelChampions.contentVersion).toBe(10)
      })

      it('la citation.section de ronda.jugadores.01 casa con /Player Turn \\(p\\. 34\\)/', () => {
        const step = findStep(marvelChampions, 'ronda.jugadores.01')
        expect(step.citation!.section).toMatch(/Player Turn \(p\. 34\)/)
      })

      it('gate que muerde: borrar options de ronda.jugadores.01 dejando su optionsWarning huérfano hace fallar la validación', () => {
        const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
        const step = mutated.sections
          .flatMap((s: { phases: { steps: { id: string, options?: unknown }[] }[] }) => s.phases)
          .flatMap((p: { steps: { id: string, options?: unknown }[] }) => p.steps)
          .find((s: { id: string }) => s.id === 'ronda.jugadores.01')
        delete step.options
        expect(() => validateGameDefinition(mutated)).toThrow()
      })

      it('gate que muerde: duplicar la label de la primera opción en la segunda hace fallar la validación', () => {
        const mutated: GameDefinition = JSON.parse(JSON.stringify(rawMarvelChampions))
        const step = mutated.sections
          .flatMap((s: { phases: { steps: { id: string, options?: { label: string }[] }[] }[] }) => s.phases)
          .flatMap((p: { steps: { id: string, options?: { label: string }[] }[] }) => p.steps)
          .find((s: { id: string }) => s.id === 'ronda.jugadores.01')
        step.options[1].label = step.options[0].label
        expect(() => validateGameDefinition(mutated)).toThrow()
      })
    })
  })
})
