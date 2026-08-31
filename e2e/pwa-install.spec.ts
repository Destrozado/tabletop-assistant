// e2e/pwa-install.spec.ts
//
// D-09: definición ejecutable y repetible de "la app se instala". Corre
// contra el build REAL de `nuxt generate` servido por `nuxi preview`
// (playwright.config.ts `webServer`) — nunca contra `nuxt dev`, que tiene
// `devOptions.enabled: false` y por tanto ningún service worker que
// registrar.
import { expect, test } from '@playwright/test'

test.describe('Instalación de la PWA (OFF-01)', () => {
  test('1. al cargar "/", el service worker acaba registrado y activo, y su scriptURL termina en /sw.js', async ({ page }) => {
    await page.goto('/')

    const scriptURL = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      return registration.active?.scriptURL ?? null
    })

    expect(scriptURL).not.toBeNull()
    expect(scriptURL).toMatch(/\/sw\.js$/)
  })

  test('2. GET /manifest.webmanifest responde 200 y tiene display standalone, start_url y scope "/", sin orientation', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest')
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    // D-08: no forzar orientación — decisión explícita del usuario.
    expect(manifest).not.toHaveProperty('orientation')
  })

  test('3. el manifiesto declara 3 iconos, uno maskable, y cada src responde 200 con content-type de imagen PNG', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest')
    const manifest = await response.json()

    expect(manifest.icons).toHaveLength(3)
    const maskableIcons = manifest.icons.filter((icon: { purpose?: string }) => icon.purpose === 'maskable')
    expect(maskableIcons).toHaveLength(1)

    for (const icon of manifest.icons as { src: string }[]) {
      const iconResponse = await page.request.get(icon.src)
      expect(iconResponse.status()).toBe(200)
      expect(iconResponse.headers()['content-type']).toContain('image/png')
    }
  })

  test('4. el HTML de "/" contiene un <link rel="apple-touch-icon"> y su href responde 200 (Pitfall 2: iOS solo mira esto)', async ({ page }) => {
    await page.goto('/')

    const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
    expect(href).toBeTruthy()

    const response = await page.request.get(href!)
    expect(response.status()).toBe(200)
  })
})
