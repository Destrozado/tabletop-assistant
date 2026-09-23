// app/composables/__tests__/useDialogFocusTrap.test.ts
//
// Tabla de verdad de las dos funciones puras de useDialogFocusTrap.ts
// (quick 260923-3rm, cierre de WR-02/WR-03 ronda 4 — trampa de foco de
// GameOutcomeDialog y restauración segura sobre un nodo desprendido). Test
// puro, entorno `node` del proyecto `app-logic`: ninguna de las dos
// funciones toca el DOM.
import { describe, expect, it } from 'vitest'
import { nextTrappedIndex, resolveRestoreTarget } from '../useDialogFocusTrap'

describe('nextTrappedIndex — ciclo de Tab/Shift+Tab dentro de una lista de N botones', () => {
  it('nextTrappedIndex(-1, 4, false) === 0 — foco fuera del diálogo, Tab hacia delante va al primero', () => {
    expect(nextTrappedIndex(-1, 4, false)).toBe(0)
  })

  it('nextTrappedIndex(-1, 4, true) === 3 — foco fuera del diálogo, Shift+Tab va al último', () => {
    expect(nextTrappedIndex(-1, 4, true)).toBe(3)
  })

  it('nextTrappedIndex(3, 4, false) === 0 — Tab en el último botón cicla al primero', () => {
    expect(nextTrappedIndex(3, 4, false)).toBe(0)
  })

  it('nextTrappedIndex(0, 4, true) === 3 — Shift+Tab en el primer botón cicla al último', () => {
    expect(nextTrappedIndex(0, 4, true)).toBe(3)
  })

  it('nextTrappedIndex(1, 4, false) === 2 — Tab en un botón intermedio avanza uno', () => {
    expect(nextTrappedIndex(1, 4, false)).toBe(2)
  })

  it('nextTrappedIndex(2, 4, true) === 1 — Shift+Tab en un botón intermedio retrocede uno', () => {
    expect(nextTrappedIndex(2, 4, true)).toBe(1)
  })

  it('nextTrappedIndex(-1, 0, false) === null — sin ningún botón enfocable, no hay a dónde ir', () => {
    expect(nextTrappedIndex(-1, 0, false)).toBeNull()
  })
})

describe('resolveRestoreTarget — restauración de foco solo sobre un nodo conectado (WR-03)', () => {
  it('resolveRestoreTarget(null) === null — nada que abrió el diálogo', () => {
    expect(resolveRestoreTarget(null)).toBeNull()
  })

  it('resolveRestoreTarget({ isConnected: false }) === null — el nodo se desprendió del DOM (las cuatro salidas reales)', () => {
    expect(resolveRestoreTarget({ isConnected: false })).toBeNull()
  })

  it('resolveRestoreTarget(x) === x cuando x.isConnected === true — un cierre no terminal sí restaura', () => {
    const x = { isConnected: true }
    expect(resolveRestoreTarget(x)).toBe(x)
  })
})
