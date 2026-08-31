// e2e/portrait-usable.spec.ts
//
// Prueba de regresión de la quick 260831-mgd: existe para impedir que vuelva
// la guarda de orientación que se retira en esa quick. Se alinea con D-08 de
// la Fase 4 (el manifiesto no fuerza orientación; "no forzar" también debe
// cumplirse por CSS, no solo en el manifiesto). El truncamiento de la
// cabecera en 412px (`PREPARACIÓN · 1 de 23` -> `PREPAR...`) es un resultado
// ACEPTADO (D-Q1 de la quick), así que aquí NO se assertan textos de
// cabecera ni nada relacionado con su contenido en móvil.
import { expect, test } from '@playwright/test'

test.describe('Tablet en vertical (820x1180)', () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  test('el selector, el mini-setup y la pantalla de juego son usables sin la guarda de orientación', async ({ page }) => {
    await page.goto('/')

    // Aserción central: es justo lo que `portrait:hidden` hacía imposible.
    await expect(page.locator('#app-root')).toBeVisible()
    // La guarda ya no existe ni oculta.
    await expect(page.locator('#orientation-guard')).toHaveCount(0)

    // Selector.
    const gameButton = page.getByRole('button', { name: 'Marvel Champions', exact: true })
    await expect(gameButton).toBeVisible()

    // Defensa contra el estado que dejan otras specs (`workers: 1`, mismo
    // perfil de navegador, `localStorage` compartido): si hay una partida
    // guardada previa, se descarta antes de seguir el flujo del selector.
    // Mismo patrón que el segundo test de e2e/offline-flow.spec.ts (`.or()`).
    const savedGame = page.getByText('Partida guardada')
    if (await savedGame.isVisible().catch(() => false)) {
      await page.evaluate(() => localStorage.clear())
      await page.reload()
    }

    await gameButton.click()

    // Mini-setup.
    await expect(page.getByText('Nº de jugadores')).toBeVisible()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: 'Normal', exact: true }).click()
    await page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' }).click()

    // Pantalla de juego.
    const nextButton = page.getByRole('button', { name: 'SIGUIENTE ›' })
    const backButton = page.getByRole('button', { name: '‹ Atrás' })
    await expect(nextButton).toBeVisible()
    await expect(backButton).toBeVisible()
    await expect(page.locator('main p.text-display')).not.toHaveText('')

    // Solo se comprueba ausencia de scroll HORIZONTAL (D-Q4): el vertical
    // hoy también es falso, pero assertarlo sería frágil — un paso con
    // texto más largo podría legítimamente necesitar scroll vertical en el
    // futuro sin que nada esté roto.
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(
      overflow.scrollWidth > overflow.clientWidth,
      `scroll horizontal inesperado: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`,
    ).toBe(false)
  })
})

test.describe('Móvil en vertical (412x915)', () => {
  test.use({ viewport: { width: 412, height: 915 } })

  test('la app renderiza y no desborda horizontalmente (degradación de cabecera aceptada, D-Q1)', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('#app-root')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Marvel Champions', exact: true })).toBeVisible()

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(
      overflow.scrollWidth > overflow.clientWidth,
      `scroll horizontal inesperado: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`,
    ).toBe(false)
  })
})
