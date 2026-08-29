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

  describe('options[] y optionsWarning (C1/C2)', () => {
    it('devuelve las dos claves siempre presentes, con undefined explícito cuando ni base ni variante las definen', () => {
      const node = makeNode({})
      const context: SessionContext = { playerCount: 2, difficulty: 'normal' }
      const resolved = resolveText(node, context)
      expect('options' in resolved).toBe(true)
      expect('optionsWarning' in resolved).toBe(true)
      expect(resolved.options).toBeUndefined()
      expect(resolved.optionsWarning).toBeUndefined()
    })

    it('hereda options/optionsWarning del base cuando la variante activa no los define', () => {
      const node = makeNode({
        options: [{ label: 'Opción A', detail: 'Detalle A.' }, { label: 'Opción B', detail: 'Detalle B.' }],
        optionsWarning: 'Recordatorio base.',
        variants: { difficulty: { expert: { text: 'Texto experto.' } } },
      })
      const context: SessionContext = { playerCount: 2, difficulty: 'expert' }
      const resolved = resolveText(node, context)
      expect(resolved.options).toHaveLength(2)
      expect(resolved.optionsWarning).toBe('Recordatorio base.')
    })

    it('la variante activa sustituye el array entero de options en vez de fusionar elemento a elemento', () => {
      const node = makeNode({
        options: [{ label: 'Opción A', detail: 'Detalle A.' }, { label: 'Opción B', detail: 'Detalle B.' }],
        variants: {
          difficulty: {
            expert: {
              options: [{ label: 'Solo experto', detail: 'Detalle único.' }, { label: 'Otra', detail: 'Detalle otra.' }, { label: 'Tercera', detail: 'Detalle tercera.' }],
            },
          },
        },
      })
      const context: SessionContext = { playerCount: 2, difficulty: 'expert' }
      const resolved = resolveText(node, context)
      expect(resolved.options).toHaveLength(3)
      expect(resolved.options?.[0].label).toBe('Solo experto')
    })
  })
})
