// e2e/game-outcome-dialog.spec.ts
//
// Quick 260923-3rm — cierre de WR-02 (ronda 4: `GameOutcomeDialog` declaraba
// `aria-modal` sin atrapar el foco) y WR-03 (ronda 4: la restauración de
// foco al cerrar era inalcanzable en las cuatro salidas reales). Esta spec
// demuestra en un navegador real lo que un test puro no puede: que `Tab`/
// `Shift+Tab` repetidos nunca sacan el foco del diálogo, con independencia
// de cuántas veces se pulsen, y que la salida por teclado («Salir sin
// registrar» + `Enter`) sigue funcionando sin `Escape` (WR-04, ya cerrado,
// re-comprobado por este mismo quick).
import { expect, test } from '@playwright/test'

test.describe('GameOutcomeDialog — trampa de foco (WR-02/WR-03 ronda 4)', () => {
  test('Tab y Shift+Tab repetidos nunca sacan el foco del diálogo; Escape no lo cierra; "Salir sin registrar" + Enter sí', async ({ page }) => {
    await page.goto('/')

    // Defensa contra el estado que dejan otras specs (`workers: 1`, mismo
    // perfil de navegador, `localStorage` compartido) — mismo patrón que
    // e2e/offline-flow.spec.ts / e2e/notice-stack.spec.ts.
    const savedGame = page.getByText('Partida guardada')
    if (await savedGame.isVisible().catch(() => false)) {
      await page.evaluate(() => localStorage.clear())
      await page.reload()
    }

    const gameButton = page.getByRole('button', { name: 'Marvel Champions', exact: true })
    await expect(gameButton).toBeVisible()
    await gameButton.click()

    // Mini-setup: 2 jugadores, Normal.
    await expect(page.getByText('Nº de jugadores')).toBeVisible()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: 'Normal', exact: true }).click()
    await page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' }).click()

    await page.getByRole('button', { name: 'Abrir índice' }).click()
    await page.getByRole('button', { name: 'Partida terminada' }).click()

    const heading = page.getByRole('heading', { name: '¿Cómo terminó la partida?', exact: true })
    await expect(heading).toBeVisible()

    // Doce Tab y después doce Shift+Tab, comprobando TRAS CADA pulsación que
    // el foco sigue dentro del diálogo y en un BUTTON — el diálogo real solo
    // tiene 4 botones, así que 12 pulsaciones dan tres vueltas completas al
    // ciclo en cada sentido.
    async function activeElementSigueEnElDialogo(): Promise<boolean> {
      return page.evaluate(() => {
        const activo = document.activeElement
        if (activo === null) return false
        const dentroDelDialogo = activo.closest('[aria-labelledby="game-outcome-heading"]') !== null
        return dentroDelDialogo && activo.tagName === 'BUTTON'
      })
    }

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await activeElementSigueEnElDialogo(), `tras Tab nº ${i + 1}, el foco salió del diálogo o no está en un BUTTON`).toBe(true)
    }

    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Shift+Tab')
      expect(await activeElementSigueEnElDialogo(), `tras Shift+Tab nº ${i + 1}, el foco salió del diálogo o no está en un BUTTON`).toBe(true)
    }

    // Escape sigue sin cerrar el diálogo (WR-04, re-comprobado por este
    // quick — decisión contrastada de 09-UI-SPEC.md §Layout 2, no un olvido).
    await page.keyboard.press('Escape')
    await expect(heading).toBeVisible()

    // Salida por teclado real: enfocar «Salir sin registrar» y pulsar Enter.
    const exitButton = page.getByRole('button', { name: 'Salir sin registrar', exact: true })
    await exitButton.focus()
    await page.keyboard.press('Enter')

    await expect(gameButton).toBeVisible()
  })
})
