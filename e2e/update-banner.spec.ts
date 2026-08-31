// e2e/update-banner.spec.ts
//
// D-09: cierra la garantía dura de OFF-04 — la app NUNCA se recarga sola —
// que es justo lo que un test unitario no puede demostrar (necesita un
// service worker real registrado en un navegador real).
//
// La aparición REAL de la banda ("Nueva versión disponible") con una versión
// nueva de verdad publicada NO se simula aquí: requeriría servir dos builds
// distintas desde el mismo origen, o colar en producción un parámetro de
// query / flag de depuración / "modo demo" para forzar `$pwa.needRefresh` a
// `true` — prohibido explícitamente por el plan 04-05 (T-04-15). Esta suite
// demuestra solo lo que SÍ se puede demostrar de verdad con un build real:
// que sin versión nueva la banda no aparece, y sobre todo, que la app no se
// recarga ni cambia de controlador por su cuenta mientras espera. La
// aparición real de la banda contra un despliegue real queda para el
// checkpoint humano del plan 04-06 — no es un olvido, está declarado en
// 04-05-PLAN.md <success_criteria>.
import { expect, test } from '@playwright/test'

test.describe('Banda de versión nueva (OFF-04)', () => {
  test('1. sin versión nueva publicada, la banda "Nueva versión disponible" no aparece', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => navigator.serviceWorker.ready)

    await expect(page.getByText('Nueva versión disponible')).not.toBeVisible()
  })

  test('2. la app no se recarga sola: un marcador puesto en window sobrevive al menos 10s con el service worker activo, y no hay controllerchange espontáneo', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(async () => navigator.serviceWorker.ready)

    // Marcador que CUALQUIER recarga (aunque sea a la misma URL) borraría:
    // `window` se recrea desde cero en cada navegación/reload.
    await page.evaluate(() => {
      (window as unknown as { __tgaNoReloadMarker: string }).__tgaNoReloadMarker = 'still-here'
      ;(window as unknown as { __tgaControllerChangeCount: number }).__tgaControllerChangeCount = 0
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        (window as unknown as { __tgaControllerChangeCount: number }).__tgaControllerChangeCount++
      })
    })

    // 10s reales de espera con el SW activo: es la garantía dura de OFF-04 y
    // la razón exacta por la que `registerType: 'autoUpdate'` está prohibido
    // (D-03, CLAUDE.md "What NOT to Use") — ese modo recargaría todas las
    // pestañas abiertas en cuanto detectase una build nueva.
    await page.waitForTimeout(10000)

    const marker = await page.evaluate(() => (window as unknown as { __tgaNoReloadMarker?: string }).__tgaNoReloadMarker)
    expect(marker).toBe('still-here')

    const controllerChangeCount = await page.evaluate(() => (window as unknown as { __tgaControllerChangeCount?: number }).__tgaControllerChangeCount)
    expect(controllerChangeCount).toBe(0)
  })

  test('3. registration.waiting es null mientras no haya build nueva servida', async ({ page }) => {
    await page.goto('/')

    const waiting = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      return registration.waiting
    })

    expect(waiting).toBeNull()
  })
})
