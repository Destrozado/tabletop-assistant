// e2e/offline-flow.spec.ts
//
// D-09/D-10: definición ejecutable de OFF-02/OFF-03 — el recorrido real
// (selector -> mini-setup -> preparación) con `context.setOffline(true)`,
// no solo aserciones sobre el precache manifest en abstracto.
//
// Expectativa DELIBERADA de este plan (04-03-PLAN.md): los pasos 1-6 y 8
// deberían pasar ya (el precacheo por defecto de Workbox cubre HTML/JS/CSS).
// El paso 7 (fetch de un .m4a offline) está previsto que FALLE hasta el plan
// 04-04, que añade `workbox.globPatterns` para los audios. Ninguna aserción
// de este fichero debe relajarse, comentarse ni desactivarse para maquillar
// el resultado — un fallo real aquí es la señal que necesita 04-04.
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

// El id de audio del paso 7 se deriva del contenido REAL de public/audio/
// (excluyendo public/audio/_probe/, artefactos de la 03.1), para que la
// prueba no dependa de qué clips se hayan generado ya (hoy 9 de 37, ver
// 04-CONTEXT.md).
const AUDIO_DIR = join(process.cwd(), 'public/audio')
const firstAudioFile = readdirSync(AUDIO_DIR, { withFileTypes: true })
  .find(entry => entry.isFile() && entry.name.endsWith('.m4a'))
  ?.name

if (!firstAudioFile) {
  throw new Error('No se encontró ningún clip .m4a en public/audio/ — el paso 7 necesita al menos uno.')
}

const AUDIO_ID = firstAudioFile.replace(/\.m4a$/, '')

// Ayuda compartida: primera visita CON red + recarga, hasta que el service
// worker controla la página. Cortar la red antes de este punto mediría el
// comportamiento de un navegador cualquiera sin PWA, no el de esta app.
async function waitForServiceWorkerControl(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
}

test.describe('Flujo completo sin conexión (OFF-02, OFF-03)', () => {
  test('selector -> mini-setup -> preparación con la red cortada, navegación, avance/retroceso, audio y recarga', async ({ page, context }) => {
    // 1. Primera visita con red, hasta que el SW controla la página.
    await waitForServiceWorkerControl(page)

    // 2. Cortar la red.
    await context.setOffline(true)

    // 3. La app arranca sin red.
    await page.reload()
    const gameButton = page.getByRole('button', { name: 'Marvel Champions: El Juego de Cartas' })
    await expect(gameButton).toBeVisible()

    // 4. Navegación entre las DOS rutas prerenderizadas, sin red. Esta
    // aserción concreta caza el Pitfall 1 de 04-RESEARCH.md (_payload.json
    // con query string que Workbox `generateSW` no resuelve offline): si
    // algo va a fallar por esa causa exacta, falla aquí.
    await gameButton.click()
    await expect(page.getByText('Nº de jugadores')).toBeVisible()

    // 5. Mini-setup sin red.
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: 'Normal', exact: true }).click()
    await page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' }).click()

    const nextButton = page.getByRole('button', { name: 'SIGUIENTE ›' })
    const backButton = page.getByRole('button', { name: '‹ Atrás' })
    await expect(nextButton).toBeVisible()
    await expect(backButton).toBeVisible()

    // 6. Avanzar cinco veces comprobando que el texto del paso cambia entre
    // pulsación y pulsación, y retroceder uno para comprobar que vuelve al
    // paso anterior.
    const stepText = page.locator('main p.text-display')
    const seenTexts: string[] = [await stepText.innerText()]
    for (let i = 0; i < 5; i++) {
      await nextButton.click()
      const text = await stepText.innerText()
      expect(text, `el texto del paso ${i + 1} no cambió tras pulsar SIGUIENTE`).not.toBe(seenTexts[seenTexts.length - 1])
      seenTexts.push(text)
    }
    await backButton.click()
    await expect(stepText).toHaveText(seenTexts[seenTexts.length - 2])

    // 7. Un clip de audio se sirve sin red. PREVISTO PARA FALLAR: el bloque
    // `workbox.globPatterns` que precachea los .m4a es del plan 04-04, no de
    // este. Si esta aserción falla, es la señal esperada de que 04-04 tiene
    // trabajo que hacer — no relajar ni comentar.
    const audioResult = await page.evaluate(async (id) => {
      try {
        const response = await fetch(`/audio/${id}.m4a`)
        return {
          ok: response.ok,
          status: response.status,
          contentLength: Number(response.headers.get('content-length') ?? '0'),
        }
      }
      catch (error) {
        return { ok: false, status: 0, contentLength: 0, error: String(error) }
      }
    }, AUDIO_ID)
    expect(audioResult.ok, `fetch('/audio/${AUDIO_ID}.m4a') offline: ${JSON.stringify(audioResult)}`).toBe(true)
    expect(audioResult.status).toBe(200)
    expect(audioResult.contentLength).toBeGreaterThan(0)

    // 8. La partida sobrevive a una recarga sin red: la reanudación explícita
    // de la Fase 1 sigue funcionando y la app vuelve a arrancar.
    await page.reload()
    await expect(page.getByText('Partida guardada')).toBeVisible()
    await page.getByRole('button', { name: 'CONTINUAR ›' }).click()
    await expect(nextButton).toBeVisible()
    await expect(backButton).toBeVisible()
  })

  test('la ruta /marvel-champions se puede abrir directamente sin red (page.goto), no solo por navegación desde el selector', async ({ page, context }) => {
    // Visita previa con red, hasta que el SW controla la página.
    await waitForServiceWorkerControl(page)

    await context.setOffline(true)
    await page.goto('/marvel-champions')
    await expect(page.getByText('Nº de jugadores').or(page.getByText('Partida guardada'))).toBeVisible()
  })
})
