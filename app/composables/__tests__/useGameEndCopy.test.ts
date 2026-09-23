// app/composables/__tests__/useGameEndCopy.test.ts
//
// Test puro de `buildDiscardBody`/`buildEndGameBody` (plan 09-32, Task 2):
// sin `window`, sin jsdom, sin contexto de Nuxt — mismo criterio que
// `useProgressMountPlan.test.ts` y `useHistorySavedNotice.test.ts`. El
// proyecto `app-logic` de `vitest.config.ts` no monta componentes, así que
// la copy sobre datos persistidos del grupo tiene que vivir en un `.ts` con
// test propio para poder tener test en absoluto.
//
// `09-VERIFICATION.md` (ronda 7) encontró que `endGameBody` prometía «la app
// conservará el progreso para que podáis reintentarlo» ANTES de leer el
// dispositivo — falsa en 2 de los 4 estados (`absent`: no hay nada que
// reintentar; `stale`: el reintento es justo lo que no se debe hacer). Las
// dos aserciones negativas de abajo (`not.toContain('conservar')`,
// `not.toContain('reintentar')`) existen para que esa promesa no vuelva.
import { describe, expect, it } from 'vitest'
import { buildDiscardBody, buildEndGameBody } from '../useGameEndCopy'

describe('buildEndGameBody (función pura)', () => {
  it('1. interpola el resumen entre paréntesis', () => {
    expect(buildEndGameBody('Rhino · 2 jug · Normal')).toContain('(Rhino · 2 jug · Normal)')
  })

  it('2. no contiene ninguna forma de "conservar" — 09-VERIFICATION.md ronda 7: promesa falsa en 2 de los 4 estados del dispositivo', () => {
    expect(buildEndGameBody('Rhino · 2 jug · Normal')).not.toContain('conservar')
  })

  it('3. no contiene ninguna forma de "reintentar" — mismo motivo que el punto 2', () => {
    expect(buildEndGameBody('Rhino · 2 jug · Normal')).not.toContain('reintentar')
  })

  it('4. contiene "el progreso no se borrará" — la única promesa que preserveProgress = !historyRecorded garantiza en las cuatro salidas', () => {
    expect(buildEndGameBody('Rhino · 2 jug · Normal')).toContain('el progreso no se borrará')
  })

  it('5. es pura: dos llamadas con el mismo argumento devuelven la misma cadena', () => {
    const resumen = 'Ultron · 3 jug · Experto'
    expect(buildEndGameBody(resumen)).toBe(buildEndGameBody(resumen))
  })
})

describe('buildDiscardBody (función pura)', () => {
  it('6. devuelve exactamente el texto actual de discardBody, carácter a carácter', () => {
    expect(buildDiscardBody('Rhino · 2 jug · Normal')).toBe(
      'Se borrará el progreso guardado de la partida en curso (Rhino · 2 jug · Normal). Esta acción no se puede deshacer.',
    )
  })

  it('7. es pura: dos llamadas con el mismo argumento devuelven la misma cadena', () => {
    const resumen = 'Kang · 4 jug · Normal'
    expect(buildDiscardBody(resumen)).toBe(buildDiscardBody(resumen))
  })
})
