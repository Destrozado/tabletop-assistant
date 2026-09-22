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
// (enganche de limpieza añadido en la Task 2, más abajo) para no filtrar
// estado a los siguientes — mismo criterio que useHistorySavedNotice.test.ts.
import { afterEach, describe, expect, it } from 'vitest'
import { planGameEnd } from '../useHistorySavedNotice'
import {
  PROGRESS_MISMATCH_WARNING,
  clearProgressMismatch,
  markProgressMismatch,
  readProgressMismatchWarning,
} from '../useProgressMismatchMark'

// Los dos gameId que usan estos tests, tal y como los nombra el propio plan
// (09-33-PLAN.md, <behavior> de la Task 1): una marca sobre uno no puede
// afectar al otro.
const JUEGO_A = 'marvel-champions'
const JUEGO_B = 'tiny-game'

// Huellas usadas en TODOS los tests de este fichero desde el plan 09-38
// (firma de dos argumentos, testigo del referente obligatorio): dos huellas
// DISTINTAS para poder demostrar, donde haga falta, que el lector detecta
// la SUSTITUCIÓN del referente y no solo su ausencia — leer con la misma
// huella con la que se puso no demuestra nada sobre esa sustitución (ver
// `faltaPruebaDeCicloDeVidaEn`, invariantesDeMarcaDeEstado.test.ts). Los
// quince `it` originales (Task 1/Task 2 del plan 09-33) usan HUELLA_A sin
// necesitar distinguir nada más; los que sí necesitan demostrar sustitución
// (Task 1 del plan 09-38 en adelante) usan las dos.
const HUELLA_A = 'huella-a'
const HUELLA_B = 'huella-b'

// El estado es de módulo (ver justificación en useProgressMismatchMark.ts)
// y se comparte entre tests de este fichero: cada test que lo modifique
// debe dejarlo limpio para no filtrar estado al siguiente. `clearProgressMismatch`
// ya es la vía pública para eso — no se exporta ninguna función de reinicio
// solo para los tests (el propio `clearProgressMismatch` es además una
// comprobación extra de que retirar una marca inexistente no lanza).
afterEach(() => {
  clearProgressMismatch(JUEGO_A)
  clearProgressMismatch(JUEGO_B)
})

describe('useProgressMismatchMark — camino completo (Task 1, plan 09-33)', () => {
  it('1. camino de discrepancia: planGameEnd(false, \'stale\').progressMismatch → markProgressMismatch(gameId, huella) → readProgressMismatchWarning(gameId, huella) devuelve el aviso', () => {
    const plan = planGameEnd(false, 'stale')
    expect(plan.progressMismatch).toBe(true)

    markProgressMismatch(JUEGO_A, HUELLA_A)

    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(PROGRESS_MISMATCH_WARNING)
  })

  it('2. camino de retirada: tras clearProgressMismatch(gameId), readProgressMismatchWarning(gameId, huella) vuelve a devolver null', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)
    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(PROGRESS_MISMATCH_WARNING)

    clearProgressMismatch(JUEGO_A)

    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(null)
  })
})

describe('useProgressMismatchMark — tabla de verdad completa del ciclo de vida (Task 2, plan 09-33)', () => {
  // Forma ejecutable de la limitación documentada en el propio fichero: una
  // recarga completa del navegador vacía este módulo, así que el estado
  // inicial (y el estado tras el enganche de limpieza de este fichero)
  // tiene que ser exactamente "sin ninguna marca" — nunca null como
  // ausencia de dato, sino null como garantía de que la app no afirma nada.
  it('3. el módulo arranca sin ninguna marca: readProgressMismatchWarning devuelve null antes de poner ninguna', () => {
    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(null)
    expect(readProgressMismatchWarning(JUEGO_B, HUELLA_A)).toBe(null)
  })

  it('4. poner y leer: tras markProgressMismatch(gameId, huella), readProgressMismatchWarning(gameId, huella) devuelve el aviso exacto', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)
    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(PROGRESS_MISMATCH_WARNING)
  })

  it('5. retirar tras poner: clearProgressMismatch(gameId) deja readProgressMismatchWarning(gameId, huella) en null', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)
    clearProgressMismatch(JUEGO_A)
    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(null)
  })

  it('6. poner dos veces seguidas es idempotente: un único clearProgressMismatch la deja retirada (es un mapa, no un contador)', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)
    markProgressMismatch(JUEGO_A, HUELLA_A)

    clearProgressMismatch(JUEGO_A)

    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(null)
  })

  it('7. retirar una marca que no existe no lanza', () => {
    expect(() => clearProgressMismatch(JUEGO_A)).not.toThrow()
    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(null)
  })

  it('8. dos gameId distintos no se interfieren: marcar uno no afecta al otro', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)

    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(PROGRESS_MISMATCH_WARNING)
    expect(readProgressMismatchWarning(JUEGO_B, HUELLA_A)).toBe(null)
  })

  it('9. dos gameId distintos no se interfieren: retirar uno no afecta al otro que sigue marcado', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)
    markProgressMismatch(JUEGO_B, HUELLA_B)

    clearProgressMismatch(JUEGO_A)

    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(null)
    expect(readProgressMismatchWarning(JUEGO_B, HUELLA_B)).toBe(PROGRESS_MISMATCH_WARNING)
  })
})

// RED registrado (Task 1, plan 09-38): este describe se escribió ANTES de
// tocar useProgressMismatchMark.ts y se ejecutó contra el código sin
// cambiar. El test 16 falló porque el lector de un solo argumento ignora la
// huella y sigue devolviendo el aviso — el mensaje literal de ese fallo
// vive en 09-38-SUMMARY.md. Tras el arreglo (Task 1, puntos 1-5) el mismo
// test pasa a verde por la validación de huella, sin haber cambiado el
// test.
describe('useProgressMismatchMark — ciclo de vida completo con testigo del referente (Task 1, plan 09-38)', () => {
  it('16. pone con una huella y lee con OTRA distinta: el lector devuelve null porque el referente ya no es el mismo', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)
    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_B)).toBe(null)
  })

  it('17. pone con una huella y lee con la MISMA: el lector devuelve el aviso', () => {
    markProgressMismatch(JUEGO_A, HUELLA_A)
    expect(readProgressMismatchWarning(JUEGO_A, HUELLA_A)).toBe(PROGRESS_MISMATCH_WARNING)
  })
})

// PROGRESS_MISMATCH_WARNING — respaldo oración a oración (Task 3, plan
// 09-33): cada aserción de este describe se puede señalar a un hecho
// comprobado por otro fichero de este mismo repo (ver la tabla de respaldo
// que acompaña a la constante en useProgressMismatchMark.ts). Las tres
// aserciones negativas existen porque 09-VERIFICATION.md (ronda 7) encontró
// exactamente esas tres afirmaciones sin respaldo en `failure-stale`
// (useHistorySavedNotice.ts) — «anterior», «la ronda» y una instrucción de
// reintento — y este aviso nuevo no puede repetir la misma cara del
// defecto.
describe('PROGRESS_MISMATCH_WARNING — respaldo oración a oración (Task 3, plan 09-33)', () => {
  it('10. contiene «no pudo registrarla»: respaldo — la marca solo se pone cuando historyRecorded es false', () => {
    expect(PROGRESS_MISMATCH_WARNING).toContain('no pudo registrarla')
  })

  it('11. contiene «no era el punto en el que habíais terminado»: respaldo — la comparación de posiciones de la autoridad de lectura devolvió que no coinciden', () => {
    expect(PROGRESS_MISMATCH_WARNING).toContain('no era el punto en el que habíais terminado')
  })

  it('12. contiene «podría» en la oración sobre el histórico: modal a propósito, nunca certeza — buildHistoryEntry solo lee round/context', () => {
    expect(PROGRESS_MISMATCH_WARNING).toContain('podría')
  })

  it('13. NO contiene «anterior»: no hay ningún orden temporal comprobado (09-VERIFICATION.md ronda 7)', () => {
    expect(PROGRESS_MISMATCH_WARNING).not.toContain('anterior')
  })

  it('14. NO contiene «la ronda»: la comparación no identifica qué campo difirió (09-VERIFICATION.md ronda 7)', () => {
    expect(PROGRESS_MISMATCH_WARNING).not.toContain('la ronda')
  })

  it('15. NO contiene ninguna forma de «reintentar»: el aviso informa, no ordena ninguna acción (09-VERIFICATION.md ronda 7)', () => {
    expect(PROGRESS_MISMATCH_WARNING).not.toContain('reintentar')
    expect(PROGRESS_MISMATCH_WARNING).not.toMatch(/reintentar/i)
  })
})
