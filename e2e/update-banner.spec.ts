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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

// 10-04-PLAN.md Task 3 — guarda de regresión de COMP-03. Este bloque NO
// prueba el navegador ni el service worker (eso es el test.describe de
// arriba): lee `nuxt.config.ts` con `node:fs` y afirma sobre su TEXTO, mismo
// patrón que e2e/firestore-rules-contract.spec.ts usa para `firestore.rules`
// — comprobación de configuración, no de comportamiento en tiempo de
// ejecución.
//
// Qué demuestra: que la CONFIGURACIÓN del camino de actualización sigue
// intacta tras la Fase 10 — que es lo que COMP-03 le pide a esta fase
// concreta (10-CONTEXT.md declara explícitamente que esta fase no toca
// `nuxt.config.ts` salvo por el bloque `runtimeConfig.public` de D-13).
// Qué NO demuestra: la aparición real de la banda "Nueva versión disponible"
// con una build nueva de verdad publicada — eso sigue exigiendo dos builds
// servidas desde el mismo origen, y el plan 04-05 ya lo declaró fuera de
// alcance por escrito (ver la cabecera de este fichero).
test.describe('Guarda de configuración del camino de actualización (COMP-03)', () => {
  const NUXT_CONFIG_PATH = join(process.cwd(), 'nuxt.config.ts')

  // Recorta el array de `nitro.prerender.routes` — mismo patrón de recorte
  // de texto que `extractHasOnlyFields` en
  // e2e/firestore-rules-contract.spec.ts (buscar el marcador, cortar hasta
  // el cierre correspondiente, leer las cadenas entrecomilladas de dentro).
  function extractPrerenderRoutes(configText: string): string[] {
    const start = configText.indexOf('routes: [')
    if (start === -1) return []
    const openBracket = start + 'routes: ['.length - 1
    const close = configText.indexOf(']', openBracket)
    if (close === -1) return []
    const inner = configText.slice(openBracket + 1, close)
    const matches = inner.match(/'([^']*)'/g) ?? []
    return matches.map(m => m.slice(1, -1))
  }

  test('registerType, runtimeCaching, las cabeceras de caché de routeRules y las rutas prerenderizadas siguen intactos', () => {
    const configText = readFileSync(NUXT_CONFIG_PATH, 'utf-8')

    // 1. registerType sigue en modo aviso descartable. Se comprueba el
    // VALOR, no solo que la clave `registerType` aparezca — y que aparece
    // una única vez, porque una segunda declaración haría ambiguo cuál gana.
    const registerTypeMatches = [...configText.matchAll(/registerType:\s*'([^']*)'/g)]
    expect(
      registerTypeMatches.length,
      `registerType debería aparecer exactamente una vez en nuxt.config.ts; aparece ${registerTypeMatches.length} veces`,
    ).toBe(1)
    expect(
      registerTypeMatches[0]![1],
      `registerType vale '${registerTypeMatches[0]![1]}' — CLAUDE.md "What NOT to Use" prohíbe expresamente cualquier valor distinto de 'prompt': 'autoUpdate' recargaría todas las pestañas abiertas en cuanto detectase una build nueva, interrumpiendo una partida a mitad de ronda.`,
    ).toBe('prompt')

    // 2. Ninguna entrada runtimeCaching. firestore.googleapis.com es
    // cross-origin y los globPatterns actuales solo cubren salida de build
    // del mismo origen (10-CONTEXT.md §Integration Points punto 3) — una
    // entrada de caché en tiempo de ejecución sería una decisión nueva que
    // nadie tomó en esta fase.
    const runtimeCachingCount = (configText.match(/runtimeCaching/g) ?? []).length
    expect(
      runtimeCachingCount,
      `nuxt.config.ts contiene ${runtimeCachingCount} ocurrencia(s) de "runtimeCaching" — la Fase 10 no debía añadir ninguna entrada de caché en tiempo de ejecución`,
    ).toBe(0)

    // 3. Las cuatro reglas de cabeceras de caché de routeRules siguen
    // presentes: assets con hash, fuentes, el par service worker + manifest
    // sin caché, y audios con revalidación (CLAUDE.md §Hosting sobre el
    // "stale service worker trap").
    expect(configText, 'falta la regla de cabecera de /_nuxt/** (assets con hash en el nombre)').toContain('\'/_nuxt/**\'')
    expect(configText, 'falta la regla de cabecera de /fonts/** (fuente autoalojada)').toContain('\'/fonts/**\'')
    expect(configText, 'falta la regla de cabecera de /sw.js — nunca cacheado, cierre del stale service worker trap').toContain('\'/sw.js\'')
    expect(configText, 'falta la regla de cabecera de /manifest.webmanifest — nunca cacheado, mismo motivo que /sw.js').toContain('\'/manifest.webmanifest\'')
    expect(configText, 'falta la regla de cabecera de /audio/** (revalidación, D-10/D-11 de la Fase 3.1)').toContain('\'/audio/**\'')

    // 4. La lista de rutas prerenderizadas sigue conteniendo las cuatro que
    // ya había (D-16/09-RESEARCH.md Pitfall 4: sin ellas, /historico y
    // /estadisticas no tendrían HTML que Workbox pudiera precachear).
    const prerenderRoutes = extractPrerenderRoutes(configText)
    expect(
      prerenderRoutes.length,
      'No se encontró ninguna ruta dentro de nitro.prerender.routes en nuxt.config.ts — el formato del fichero cambió y este gate ya no sabe leerlo (revisar extractPrerenderRoutes en este spec).',
    ).toBeGreaterThan(0)
    for (const route of ['/', '/marvel-champions', '/historico', '/estadisticas']) {
      expect(prerenderRoutes, `falta la ruta prerenderizada "${route}" en nitro.prerender.routes`).toContain(route)
    }
  })
})
