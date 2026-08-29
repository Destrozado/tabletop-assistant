import { describe, expect, it } from 'vitest'
import { resolveText } from '../resolve'
import type { RuntimeStepNode, SessionContext, StepDefinition } from '../types'

function makeNode(stepOverrides: Partial<StepDefinition> = {}): RuntimeStepNode {
  return {
    runtimeId: 'test.step',
    sectionId: 'test',
    sectionTitle: 'Test',
    sectionRepeats: false,
    phaseId: 'test.phase',
    phaseTitle: 'Fase',
    breadcrumb: 'Test › Fase',
    step: {
      id: 'test.step',
      title: 'Paso de prueba',
      kind: 'step',
      text: 'Texto base.',
      ...stepOverrides,
    },
  }
}

describe('resolveText', () => {
  it('devuelve el texto experto cuando context.difficulty === "expert"', () => {
    const node = makeNode({
      variants: { difficulty: { expert: { text: 'Texto experto.' } } },
    })
    const context: SessionContext = { playerCount: 2, difficulty: 'expert' }
    expect(resolveText(node, context).text).toBe('Texto experto.')
  })

  it('devuelve el texto base cuando context.difficulty === "normal"', () => {
    const node = makeNode({
      variants: { difficulty: { expert: { text: 'Texto experto.' } } },
    })
    const context: SessionContext = { playerCount: 2, difficulty: 'normal' }
    expect(resolveText(node, context).text).toBe('Texto base.')
  })

  it('conserva del bloque base los campos ausentes en la variante', () => {
    const node = makeNode({
      warning: 'Aviso base.',
      variants: { difficulty: { expert: { text: 'Texto experto.' } } },
    })
    const context: SessionContext = { playerCount: 2, difficulty: 'expert' }
    const resolved = resolveText(node, context)
    expect(resolved.text).toBe('Texto experto.')
    expect(resolved.warning).toBe('Aviso base.')
  })

  it('no hace aritmética ni sustituye tokens numéricos: una fórmula sale idéntica', () => {
    const formula = 'Ajustad el dial a su valor impreso × nº de jugadores.'
    const node = makeNode({ text: formula })
    const context: SessionContext = { playerCount: 4, difficulty: 'normal' }
    expect(resolveText(node, context).text).toBe(formula)
  })

  describe('warningDetail (D-32)', () => {
    it('devuelve la clave warningDetail siempre presente, con undefined explícito cuando ni base ni variante la definen', () => {
      const node = makeNode({})
      const context: SessionContext = { playerCount: 2, difficulty: 'normal' }
      const resolved = resolveText(node, context)
      expect('warningDetail' in resolved).toBe(true)
      expect(resolved.warningDetail).toBeUndefined()
    })

    it('hereda el warningDetail del base cuando la variante activa no lo define', () => {
      const node = makeNode({
        warning: 'Aviso base.',
        warningDetail: 'Detalle base.',
        variants: { difficulty: { expert: { text: 'Texto experto.' } } },
      })
      const context: SessionContext = { playerCount: 2, difficulty: 'expert' }
      expect(resolveText(node, context).warningDetail).toBe('Detalle base.')
    })

    it('la variante activa sobrescribe el warningDetail del base cuando lo define', () => {
      const node = makeNode({
        warning: 'Aviso base.',
        warningDetail: 'Detalle base.',
        variants: { difficulty: { expert: { warning: 'Aviso experto.', warningDetail: 'Detalle experto.' } } },
      })
      const context: SessionContext = { playerCount: 2, difficulty: 'expert' }
      const resolved = resolveText(node, context)
      expect(resolved.warningDetail).toBe('Detalle experto.')
      expect(resolved.warning).toBe('Aviso experto.')
    })
  })
})
