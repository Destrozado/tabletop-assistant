// app/composables/__tests__/useProgressMismatchMark.test.ts
//
// Tests de app/composables/useProgressMismatchMark.ts (plan 09-33, cierre
// del tercer hallazgo de SC3 en 09-VERIFICATION.md ronda 7): la marca en
// memoria por gameId que transporta hasta el modal de reanudación el hecho
// de que el último cierre de esta partida comprobó una discrepancia entre
// lo guardado y el punto de fin de partida.
//
// El estado es de módulo (ver justificación en el propio fichero), así que
// se comparte entre tests: cada test que lo modifique debe dejarlo limpio
// (afterEach, añadido en la Task 2) para no filtrar estado a los
// siguientes — mismo criterio que useHistorySavedNotice.test.ts.
import { describe, expect, it } from 'vitest'
import { planGameEnd } from '../useHistorySavedNotice'
import {
  PROGRESS_MISMATCH_WARNING,
  clearProgressMismatch,
  markProgressMismatch,
  readProgressMismatchWarning,
} from '../useProgressMismatchMark'

describe('useProgressMismatchMark — camino completo (Task 1, plan 09-33)', () => {
  it('1. camino de discrepancia: planGameEnd(false, \'stale\').progressMismatch → markProgressMismatch(gameId) → readProgressMismatchWarning(gameId) devuelve el aviso', () => {
    const plan = planGameEnd(false, 'stale')
    expect(plan.progressMismatch).toBe(true)

    markProgressMismatch('marvel-champions')

    expect(readProgressMismatchWarning('marvel-champions')).toBe(PROGRESS_MISMATCH_WARNING)
  })

  it('2. camino de retirada: tras clearProgressMismatch(gameId), readProgressMismatchWarning(gameId) vuelve a devolver null', () => {
    markProgressMismatch('marvel-champions')
    expect(readProgressMismatchWarning('marvel-champions')).toBe(PROGRESS_MISMATCH_WARNING)

    clearProgressMismatch('marvel-champions')

    expect(readProgressMismatchWarning('marvel-champions')).toBe(null)
  })
})
