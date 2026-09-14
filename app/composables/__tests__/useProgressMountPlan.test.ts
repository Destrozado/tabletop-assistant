// app/composables/__tests__/useProgressMountPlan.test.ts
//
// Tabla de verdad de `planProgressMount` (plan 09-29, cierre de la mitad de
// montaje del Gap #1 de la ronda 6 y de CR-02/WR-02 de `09-REVIEW.md`). Test
// puro: no necesita `window`, ni jsdom, ni contexto de Nuxt — mismo criterio
// que `useHistorySavedNotice.test.ts`.
import { describe, expect, it } from 'vitest'
import { UNVERIFIED_PROGRESS_NOTICE, planProgressMount } from '../useProgressMountPlan'
import type { StoredProgress } from '../useStoredProgress'

// Las cuatro respuestas posibles de la autoridad de lectura
// (`readStoredProgress`), escritas como constante del test — nunca se
// inventa un quinto valor.
const TODOS_LOS_ESTADOS_DEL_DISPOSITIVO: StoredProgress[] = ['resumable', 'stale', 'absent', 'unknown']

describe('planProgressMount — la decisión de montaje, pura y total', () => {
  it('1. resumable + resumed → resume-prompt, sin aviso', () => {
    expect(planProgressMount('resumable', 'resumed')).toEqual({ action: 'resume-prompt', unverifiedNotice: null })
  })

  it('2. resumable + content-changed → content-changed-notice, sin aviso', () => {
    expect(planProgressMount('resumable', 'content-changed')).toEqual({
      action: 'content-changed-notice',
      unverifiedNotice: null,
    })
  })

  it("3. stale + resumed → resume-prompt, sin aviso — 'stale' no cambia lo que la app puede HACER al montar", () => {
    // Al montar no hay ninguna sesión con la que `readStoredProgress` pudiera
    // comparar (`onMounted` la llama sin `esperada`), así que la partida se
    // sigue ofreciendo igual: la app no tiene nada que contradecir todavía.
    expect(planProgressMount('stale', 'resumed')).toEqual({ action: 'resume-prompt', unverifiedNotice: null })
  })

  it('4. stale + content-changed → content-changed-notice, sin aviso', () => {
    expect(planProgressMount('stale', 'content-changed')).toEqual({
      action: 'content-changed-notice',
      unverifiedNotice: null,
    })
  })

  it('5. absent + fresh → mini-setup, sin aviso — se ha comprobado el dispositivo y no hay nada', () => {
    expect(planProgressMount('absent', 'fresh')).toEqual({ action: 'mini-setup', unverifiedNotice: null })
  })

  it('6. unknown + fresh → mini-setup, CON aviso — la única entrada que produce aviso', () => {
    expect(planProgressMount('unknown', 'fresh')).toEqual({
      action: 'mini-setup',
      unverifiedNotice: UNVERIFIED_PROGRESS_NOTICE,
    })
  })

  it("7. 'absent' y 'unknown' producen resultados DISTINTOS — el hueco que este plan cierra", () => {
    // Antes de este plan, el montaje consumía `informe.outcome` (que vale
    // 'fresh' tanto para 'absent' como para 'unknown') y no podía
    // distinguir «he comprobado y no hay nada» de «no he podido
    // comprobarlo». Este test es la aserción explícita de que ahora sí.
    expect(planProgressMount('absent', 'fresh')).not.toEqual(planProgressMount('unknown', 'fresh'))
  })

  it('8. la función es total: los cuatro valores de StoredProgress producen cuatro resultados definidos, ninguno lanza', () => {
    for (const stored of TODOS_LOS_ESTADOS_DEL_DISPOSITIVO) {
      for (const outcome of ['fresh', 'resumed', 'content-changed'] as const) {
        const plan = planProgressMount(stored, outcome)
        expect(plan).toBeDefined()
        expect(plan.action).toBeDefined()
        expect(plan.unverifiedNotice === null || typeof plan.unverifiedNotice === 'string').toBe(true)
      }
    }
  })

  it('9. UNVERIFIED_PROGRESS_NOTICE no contiene ninguna de las frases prohibidas', () => {
    expect(UNVERIFIED_PROGRESS_NOTICE).not.toContain('ya no está')
    expect(UNVERIFIED_PROGRESS_NOTICE).not.toContain('sigue guardada')
    expect(UNVERIFIED_PROGRESS_NOTICE).not.toContain('no hay')
  })
})
