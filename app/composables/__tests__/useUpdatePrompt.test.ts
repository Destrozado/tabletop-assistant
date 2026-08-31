// Tests de app/composables/useUpdatePrompt.ts (D-01: descarte de sesión;
// D-02/D-03: applyUpdate nunca lanza; OFF-04).
//
// `shouldShowUpdateBanner` es una función pura sin Nuxt ni navegador: se
// testea de forma directa (casos 1-5). Para el descarte de sesión y el
// try/catch de `applyUpdate()` (casos 6-7) se usa `buildUpdatePrompt(pwa)`,
// que acepta un doble de `$pwa` sin pasar por `useNuxtApp()`.
// `useUpdatePrompt()` en sí — la única función del fichero que llama a
// `useNuxtApp()` — NO se invoca en ningún test de este fichero: eso es lo
// que permite importar el módulo en el entorno `node` de Vitest sin contexto
// de Nuxt sin que reviente. Cubrir `useUpdatePrompt()` completo (el
// cableado real con `$pwa` inyectado por @vite-pwa/nuxt) queda para el
// checkpoint humano del plan 04-06, contra un despliegue real — ver el
// SUMMARY del plan 04-05 para el detalle de qué queda cubierto por Vitest y
// qué no.
import { describe, expect, it, vi } from 'vitest'
import { buildUpdatePrompt, shouldShowUpdateBanner } from '../useUpdatePrompt'

describe('shouldShowUpdateBanner (función pura, D-01)', () => {
  it('1. con needRefresh=true y dismissed=false, devuelve true — hay versión nueva y no se ha descartado', () => {
    expect(shouldShowUpdateBanner(true, false)).toBe(true)
  })

  it('2. con needRefresh=true y dismissed=true, devuelve false — descartada, no vuelve (D-01)', () => {
    expect(shouldShowUpdateBanner(true, true)).toBe(false)
  })

  it('3. con needRefresh=false y dismissed=false, devuelve false — no hay versión nueva', () => {
    expect(shouldShowUpdateBanner(false, false)).toBe(false)
  })

  it('4. con needRefresh=null, devuelve false — el tri-estado "aún no se sabe" nunca pinta la banda por si acaso', () => {
    expect(shouldShowUpdateBanner(null, false)).toBe(false)
  })

  it('5. con needRefresh=undefined ($pwa puede no estar inyectado), devuelve false y no rompe nada', () => {
    expect(shouldShowUpdateBanner(undefined, false)).toBe(false)
  })
})

describe('buildUpdatePrompt (D-01: descarte de sesión; D-02/D-03: applyUpdate nunca lanza)', () => {
  it('6. tras dismissUpdate(), showUpdateBanner es false aunque needRefresh siga en true, y sigue en false si needRefresh vuelve a ponerse a true en la misma sesión', () => {
    const pwa = { needRefresh: true, updateServiceWorker: vi.fn() }
    const { showUpdateBanner, dismissUpdate } = buildUpdatePrompt(pwa)

    expect(showUpdateBanner.value).toBe(true)

    dismissUpdate()
    expect(showUpdateBanner.value).toBe(false)

    // needRefresh vuelve a true en la misma sesión: el descarte sigue
    // ganando, no reaparece hasta reabrir la app (D-01).
    pwa.needRefresh = false
    pwa.needRefresh = true
    expect(showUpdateBanner.value).toBe(false)
  })

  it('7. applyUpdate() no lanza nunca, ni con $pwa undefined, ni con updateServiceWorker reventando de forma síncrona, ni con una promesa rechazada', () => {
    const { applyUpdate: applyWithUndefinedPwa } = buildUpdatePrompt(undefined)
    expect(() => applyWithUndefinedPwa()).not.toThrow()

    const throwingSync = {
      needRefresh: true,
      updateServiceWorker: vi.fn(() => {
        throw new Error('updateServiceWorker síncrono revienta')
      }),
    }
    const { applyUpdate: applyThrowingSync } = buildUpdatePrompt(throwingSync)
    expect(() => applyThrowingSync()).not.toThrow()

    const rejectingAsync = {
      needRefresh: true,
      updateServiceWorker: vi.fn(() => Promise.reject(new Error('updateServiceWorker asíncrono revienta'))),
    }
    const { applyUpdate: applyRejectingAsync } = buildUpdatePrompt(rejectingAsync)
    expect(() => applyRejectingAsync()).not.toThrow()
  })
})
