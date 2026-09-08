// e2e/counter-band-height.spec.ts
//
// Registro ejecutable del presupuesto de altura de la banda de contadores
// (D-01, D-06 de la Fase 7) contra el criterio de éxito nº 1 de la fase:
// "el presupuesto de altura (96px fijos = 12,5% de 768px) queda medido
// contra el viewport apaisado objetivo ANTES de que exista el componente
// de la banda".
//
// Este fichero se escribió y se ejecutó ANTES de construir el componente de
// la banda: NO asserta la presencia de la banda (no existe todavía), sino
// que el hueco que va a ocupar cabe sin encoger el texto grande del paso
// (`main p.text-display`, 40px de referencia). El plan 06 amplía esta spec
// cuando el componente de la banda ya exista, para comprobar que mide
// exactamente esos 96px.
//
// Salvedad honesta (07-RESEARCH.md §Assumptions Log A1, STATE.md §Blockers):
// 1024×768 es el viewport apaisado ASUMIDO porque el modelo y el sistema
// operativo de la tablet real de la mesa siguen sin identificarse. El
// presupuesto del ~15% (HP-02) se mide SOLO en apaisado (D-06); el viewport
// estrecho no entra en esta medición.
import { expect, test } from '@playwright/test'

const TARGET_VIEWPORT = { width: 1024, height: 768 }
const RESERVED_BAND_HEIGHT = 96
const HP_02_CEILING_RATIO = 0.15
const HEADER_HEIGHT = 64
const NAVBAND_HEIGHT = 96

test.describe('Presupuesto de altura de la banda de contadores (viewport 1024x768)', () => {
  test.use({ viewport: TARGET_VIEWPORT })

  test('el presupuesto de 96px cumple HP-02 en el viewport objetivo', () => {
    const ratio = RESERVED_BAND_HEIGHT / TARGET_VIEWPORT.height
    const percent = (ratio * 100).toFixed(1)
    expect(
      ratio,
      `RESERVED_BAND_HEIGHT (${RESERVED_BAND_HEIGHT}px) es ${percent}% de ${TARGET_VIEWPORT.height}px, por encima del techo HP-02 de ${HP_02_CEILING_RATIO * 100}%`,
    ).toBeLessThanOrEqual(HP_02_CEILING_RATIO)
  })

  test('reservar 96px no obliga a encoger el texto grande de ningún paso', async ({ page }) => {
    await page.goto('/')

    // Defensa contra el estado que dejan otras specs (`workers: 1`, mismo
    // perfil de navegador, `localStorage` compartido): si hay una partida
    // guardada previa, se descarta antes de seguir el flujo del selector.
    // Mismo patrón que e2e/portrait-usable.spec.ts / e2e/offline-flow.spec.ts.
    const savedGame = page.getByText('Partida guardada')
    if (await savedGame.isVisible().catch(() => false)) {
      await page.evaluate(() => localStorage.clear())
      await page.reload()
    }

    const gameButton = page.getByRole('button', { name: 'Marvel Champions', exact: true })
    await expect(gameButton).toBeVisible()
    await gameButton.click()

    // Mini-setup: 3 jugadores, Normal.
    await expect(page.getByText('Nº de jugadores')).toBeVisible()
    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: 'Normal', exact: true }).click()
    await page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' }).click()

    // Las alturas de las que se deriva el hueco disponible se COMPRUEBAN,
    // no se asumen: son las raíces reales del DOM (AppHeader/NavBand).
    const header = page.locator('header')
    const footer = page.locator('footer')
    await expect(header).toBeVisible()
    await expect(footer).toBeVisible()

    const headerBox = await header.boundingBox()
    const footerBox = await footer.boundingBox()
    expect(headerBox?.height, 'la altura real de <header> no coincide con HEADER_HEIGHT').toBe(HEADER_HEIGHT)
    expect(footerBox?.height, 'la altura real de <footer> no coincide con NAVBAND_HEIGHT').toBe(NAVBAND_HEIGHT)

    const available = TARGET_VIEWPORT.height - HEADER_HEIGHT - NAVBAND_HEIGHT - RESERVED_BAND_HEIGHT // 512px

    // Línea base (criterio de éxito nº 1): el texto grande del paso mide
    // 40px ANTES de que exista la banda. El plan 06 deberá demostrar que
    // sigue midiendo 40px DESPUÉS de construirla.
    const firstStepFontSize = await page.locator('main p.text-display').evaluate(
      el => getComputedStyle(el).fontSize,
    )
    expect(firstStepFontSize).toBe('40px')

    // Recorrido acotado por los pasos, registrando en cada uno la altura
    // real que ocupa el contenido del paso — es la medida real de "cuánto
    // alto necesita el paso", no una suposición.
    //
    // Se mide el `scrollHeight` del envoltorio de contenido (`main > div`),
    // NO el de `main` en sí: `main` es `flex-1` dentro del layout de página
    // (cabecera + main + pie), así que su propia caja SIEMPRE ocupa el
    // hueco vertical completo que le deja el layout, tenga el contenido el
    // alto que tenga (con `overflow-y-auto` y contenido que cabe, su
    // `scrollHeight` coincide con su `clientHeight`, que es esa caja
    // completa, no el contenido). El envoltorio interior, en cambio, está
    // centrado con `items-center`/`justify-center` (nunca estirado), así
    // que su altura sí refleja el contenido real del paso.
    const nextButton = page.getByRole('button', { name: 'SIGUIENTE ›' })
    let maxScrollHeight = 0
    let maxScrollHeightStep = -1
    const MAX_ITERATIONS = 40

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const scrollHeight = await page.locator('main > div').first().evaluate(el => el.scrollHeight)
      if (scrollHeight > maxScrollHeight) {
        maxScrollHeight = scrollHeight
        maxScrollHeightStep = i
      }

      const startButton = page.getByRole('button', { name: 'EMPEZAR A JUGAR ›' })
      if (await startButton.isVisible().catch(() => false)) break
      if (!(await nextButton.isVisible().catch(() => false))) break

      await nextButton.click()
    }

    expect(
      maxScrollHeight,
      `el paso ${maxScrollHeightStep} necesitó ${maxScrollHeight}px, más de los ${available}px disponibles tras reservar la banda de contadores`,
    ).toBeLessThanOrEqual(available)
  })
})
