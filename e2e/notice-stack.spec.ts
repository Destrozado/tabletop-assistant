// e2e/notice-stack.spec.ts
//
// Quick 260923-3rm — cierre de WR-04 (ronda 4, solape UpdateBanner/
// HistorySavedNotice) y WR-05 (ronda 4, toques invisibles sobre la cabecera
// de /historico), más comprobación en navegador real de que ninguna
// pantalla queda empujada fuera del viewport (WR-05(b)).
//
// Viewport por defecto de playwright.config.ts (1280x800): no se sobrescribe
// aquí a propósito.
//
// NO se simula la banda de "versión nueva" (UpdateBanner) en este fichero:
// prohibido por T-04-15 (ver la cabecera de e2e/update-banner.spec.ts) —
// forzar `$pwa.needRefresh` exigiría servir dos builds distintas desde el
// mismo origen o colar un flag de depuración en producción. La mitad de
// WR-04 que trata el solape estructural entre las dos bandas la cubre el
// gate estructural (app/composables/__tests__/pilaDeAvisos.test.ts, punto
// (a)/(b)): comprueba que ninguna de las dos lleva `fixed`/`z-40`/etc. y que
// viven en flujo, una detrás de otra, dentro de la misma franja. Esta spec
// demuestra la mitad que SÍ se puede demostrar contra un build real: que el
// aviso de registro (HistorySavedNotice) vive en flujo, no tapa ni deja
// pasar toques hacia lo que hay debajo, y que ninguna pantalla se sale del
// viewport mientras está visible.
import { expect, test } from '@playwright/test'

test.describe('Franja de avisos en flujo (WR-04/WR-05 ronda 4, WR-05(b))', () => {
  test('el aviso de registro no tapa ni deja pasar toques hacia la cabecera de /historico, y ninguna pantalla se sale del viewport', async ({ page }) => {
    await page.goto('/')

    // Defensa contra el estado que dejan otras specs (`workers: 1`, mismo
    // perfil de navegador, `localStorage` compartido) — mismo patrón que
    // e2e/offline-flow.spec.ts / e2e/counter-band-height.spec.ts.
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

    // Terminar la partida por el camino real de la interfaz.
    await page.getByRole('button', { name: 'Abrir índice' }).click()
    await page.getByRole('button', { name: 'Partida terminada' }).click()
    await page.getByRole('button', { name: 'GANADA', exact: true }).click()

    // De vuelta en «/»: el encabezado de éxito es visible.
    const heading = page.getByRole('heading', { name: '✓ Partida registrada', exact: true })
    await expect(heading).toBeVisible()

    // Un toque en el centro del encabezado cae DENTRO del aviso — nunca
    // atraviesa hacia un control invisible de la pantalla de debajo
    // (WR-05 ronda 4: el `pointer-events-none` de 09-22 ya no existe, y en
    // flujo tampoco hace falta).
    const headingBox = await heading.boundingBox()
    expect(headingBox, 'no se pudo medir el encabezado del aviso de éxito').not.toBeNull()
    const centroDelAviso = {
      x: headingBox!.x + headingBox!.width / 2,
      y: headingBox!.y + headingBox!.height / 2,
    }
    const cayeEnElAviso = await page.evaluate(({ x, y }) => {
      const elemento = document.elementFromPoint(x, y)
      return elemento !== null && elemento.closest('[role="status"]') !== null
    }, centroDelAviso)
    expect(cayeEnElAviso, 'un toque en el centro del encabezado del aviso no cayó dentro de [role="status"]').toBe(true)

    // Navegar a /historico por el botón del selector (navegación de
    // cliente): el aviso sigue vivo dentro de su ventana de 6s.
    await page.getByRole('button', { name: 'Histórico' }).click()
    await expect(page.getByRole('heading', { name: 'HISTÓRICO', exact: true })).toBeVisible()
    await expect(heading, 'el aviso de éxito no sobrevivió a la navegación de cliente hacia /historico').toBeVisible()

    // El botón «Estadísticas ›» de la cabecera no queda tapado: su caja
    // empieza en o por debajo del borde inferior del aviso, y un toque en
    // su centro cae en él (o en un descendiente suyo), nunca en el aviso.
    const estadisticasButton = page.getByRole('button', { name: 'Estadísticas ›' })
    await expect(estadisticasButton).toBeVisible()
    const avisoBox = await heading.boundingBox()
    const estadisticasBox = await estadisticasButton.boundingBox()
    expect(avisoBox, 'no se pudo medir el aviso en /historico').not.toBeNull()
    expect(estadisticasBox, 'no se pudo medir el botón Estadísticas ›').not.toBeNull()
    const bordeInferiorDelAviso = avisoBox!.y + avisoBox!.height
    expect(
      estadisticasBox!.y,
      `el botón «Estadísticas ›» (y=${estadisticasBox!.y}) empieza por encima del borde inferior del aviso (${bordeInferiorDelAviso}) — quedaría tapado`,
    ).toBeGreaterThanOrEqual(bordeInferiorDelAviso)

    const centroDelBoton = {
      x: estadisticasBox!.x + estadisticasBox!.width / 2,
      y: estadisticasBox!.y + estadisticasBox!.height / 2,
    }
    const tocaElBoton = await page.evaluate(({ x, y }) => {
      const elemento = document.elementFromPoint(x, y)
      const boton = document.evaluate(
        '//button[contains(., "Estadísticas")]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue
      return elemento !== null && boton !== null && (elemento === boton || boton.contains(elemento))
    }, centroDelBoton)
    expect(tocaElBoton, 'un toque en el centro de «Estadísticas ›» no cae en ese botón (o un descendiente)').toBe(true)

    // WR-05(b): nada queda empujado fuera del viewport mientras el aviso
    // está visible — el documento no crece más allá de la altura de la
    // ventana.
    const desbordamiento = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }))
    expect(
      desbordamiento.scrollHeight,
      `document.documentElement.scrollHeight (${desbordamiento.scrollHeight}) supera window.innerHeight (${desbordamiento.innerHeight}) — algo quedó empujado fuera del viewport`,
    ).toBeLessThanOrEqual(desbordamiento.innerHeight)

    // Cerrar el aviso con su ✕: la cabecera de /historico pasa a empezar en
    // y = 0 — confirma que la franja restaba altura de verdad, no que
    // flotaba encima sin ocupar espacio.
    await page.getByRole('button', { name: 'Cerrar aviso' }).click()
    await expect(heading).not.toBeVisible()
    const header = page.locator('header')
    await expect(header).toBeVisible()
    const headerBox = await header.boundingBox()
    expect(headerBox?.y, 'la cabecera de /historico no empieza en y=0 tras cerrar el aviso').toBe(0)
  })
})
