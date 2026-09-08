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

// ---------------------------------------------------------------------------
// Plan 06: la banda ya existe (plan 05). Lo de arriba es el registro
// ANTES/DESPUÉS que exige el criterio de éxito nº 1 — nada de lo anterior se
// borra ni se reescribe. Lo de aquí abajo mide la banda ya montada.
//
// Helper y localizador compartidos por copia explícita con
// e2e/counter-band-behavior.spec.ts (07-06-PLAN.md Task 1): ninguno de los
// dos ficheros importa al otro porque ambos son módulos `.spec.ts` de
// Playwright y una importación cruzada registraría los tests del fichero
// importado una segunda vez.
// ---------------------------------------------------------------------------

// Localizador de la banda por relación ESTRUCTURAL (hermano inmediato de
// <header>, nunca junto a <footer>: 07-CONTEXT.md D-03) filtrado además por
// el aria-label real de uno de sus botones — nunca por una cadena de clases
// de Tailwind.
function getCounterBand(page: import('@playwright/test').Page) {
  return page.locator('header + div').filter({
    has: page.getByRole('button', { name: 'Bajar vida de VILLANO', exact: true }),
  })
}

// Recorre selector -> mini-setup (3 jugadores, Normal) -> preparación hasta
// que la banda de contadores esté visible, pulsando «SIGUIENTE ›» y, cuando
// aparezca, «EMPEZAR A JUGAR ›». Cortar por la APARICIÓN de la banda, nunca
// por un número de pasos cableado (TECH-04): el contenido puede crecer sin
// que este helper deba conocer cuántos pasos tiene la preparación.
async function goToRoundLoop(page: import('@playwright/test').Page) {
  await page.goto('/')

  // Defensa contra el estado que dejan otras specs (`workers: 1`, mismo
  // perfil de navegador, `localStorage` compartido) — mismo patrón que
  // e2e/portrait-usable.spec.ts / e2e/offline-flow.spec.ts.
  const savedGame = page.getByText('Partida guardada')
  if (await savedGame.isVisible().catch(() => false)) {
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  }

  const gameButton = page.getByRole('button', { name: 'Marvel Champions', exact: true })
  await expect(gameButton).toBeVisible()
  await gameButton.click()

  await expect(page.getByText('Nº de jugadores')).toBeVisible()
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: 'Normal', exact: true }).click()
  await page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' }).click()

  const nextButton = page.getByRole('button', { name: 'SIGUIENTE ›' })
  const startButton = page.getByRole('button', { name: 'EMPEZAR A JUGAR ›' })
  const band = getCounterBand(page)
  const MAX_ITERATIONS = 40

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (await band.isVisible().catch(() => false)) break
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click()
      continue
    }
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click()
      continue
    }
    break
  }

  await expect(band, 'la banda de contadores no apareció tras recorrer la preparación (máximo 40 pasos)').toBeVisible()
}

test.describe('Banda ya montada — medición real (viewport 1024x768)', () => {
  test.use({ viewport: TARGET_VIEWPORT })

  test('la banda mide 96px reales y cumple HP-02 en el viewport objetivo', async ({ page }) => {
    await goToRoundLoop(page)

    const band = getCounterBand(page)
    const bandBox = await band.boundingBox()
    expect(bandBox?.height, 'la altura real de la banda no coincide con RESERVED_BAND_HEIGHT (96px)').toBe(RESERVED_BAND_HEIGHT)

    const ratio = (bandBox?.height ?? 0) / TARGET_VIEWPORT.height
    const percent = (ratio * 100).toFixed(1)
    expect(
      ratio,
      `la banda mide ${percent}% de ${TARGET_VIEWPORT.height}px, por encima del techo HP-02 de ${HP_02_CEILING_RATIO * 100}%`,
    ).toBeLessThanOrEqual(HP_02_CEILING_RATIO)

    // La banda no ha crecido a costa de header/footer: ambos siguen en su
    // altura fija de siempre.
    const header = page.locator('header')
    const footer = page.locator('footer')
    const headerBox = await header.boundingBox()
    const footerBox = await footer.boundingBox()
    expect(headerBox?.height, 'la altura real de <header> no coincide con HEADER_HEIGHT').toBe(HEADER_HEIGHT)
    expect(footerBox?.height, 'la altura real de <footer> no coincide con NAVBAND_HEIGHT').toBe(NAVBAND_HEIGHT)

    // main es el único que crece (flex-1): su clientHeight real debe
    // coincidir con el presupuesto teórico, descontando el aviso de voz si
    // estuviera visible — se COMPRUEBA y se descuenta explícitamente, nunca
    // se asume su ausencia. El aviso, si existe, es el hermano `div` que
    // sigue a la banda (header + div + div); si no existe, ese selector no
    // encuentra nada porque el siguiente hermano de la banda es `main`, no
    // un `div`.
    const noticeAfterBand = page.locator('header + div + div')
    const noticeVisible = await noticeAfterBand.isVisible().catch(() => false)
    const noticeHeight = noticeVisible ? ((await noticeAfterBand.boundingBox())?.height ?? 0) : 0

    const mainClientHeight = await page.locator('main').evaluate(el => el.clientHeight)
    const expectedMainHeight = TARGET_VIEWPORT.height - HEADER_HEIGHT - NAVBAND_HEIGHT - RESERVED_BAND_HEIGHT - noticeHeight
    expect(
      mainClientHeight,
      `main debería medir ${expectedMainHeight}px (768 - header - footer - banda${noticeVisible ? ' - aviso de voz' : ''})`,
    ).toBe(expectedMainHeight)
  })

  test('la banda no ha reducido el texto grande del paso (criterio de éxito nº 1: par antes/después del test de arriba)', async ({ page }) => {
    await goToRoundLoop(page)

    // Línea base tomada ANTES de construir la banda (primer test de este
    // fichero, plan 01): 40px. Este es el DESPUÉS del mismo par.
    const stepFontSize = await page.locator('main p.text-display').evaluate(el => getComputedStyle(el).fontSize)
    expect(stepFontSize).toBe('40px')

    // D-05: el número de la banda también debe mantenerse a 40px, en
    // cualquier ancho — no solo el texto del paso.
    const band = getCounterBand(page)
    const counterNumberFontSize = await band.locator('span.text-display').first().evaluate(el => getComputedStyle(el).fontSize)
    expect(counterNumberFontSize).toBe('40px')
  })

  test('la banda no lleva flex-1 y main sigue siendo el único que crece (síntoma nº 1 de PITFALLS.md §4)', async ({ page }) => {
    await goToRoundLoop(page)

    const band = getCounterBand(page)
    const bandFlexGrow = await band.evaluate(el => getComputedStyle(el).flexGrow)
    expect(bandFlexGrow, 'la banda no debe crecer: su flexGrow computado debe ser 0').toBe('0')

    const mainFlexGrow = await page.locator('main').evaluate(el => getComputedStyle(el).flexGrow)
    expect(mainFlexGrow, 'main debe seguir siendo el único flex-1 de la pila').toBe('1')
  })
})

test.describe('Banda en ancho estrecho (400x800) — partido en dos filas', () => {
  test.use({ viewport: { width: 400, height: 800 } })

  test('en ancho estrecho la banda se parte en dos filas de 192px — decisión explícita (D-06), NO un incumplimiento de HP-02: el techo del ~15% se mide SOLO en apaisado, no aquí', async ({ page }) => {
    await goToRoundLoop(page)

    const band = getCounterBand(page)
    const bandBox = await band.boundingBox()
    expect(bandBox?.height, 'en ancho estrecho la banda debe partirse en dos filas de 192px (D-06)').toBe(192)

    const counterNumberFontSize = await band.locator('span.text-display').first().evaluate(el => getComputedStyle(el).fontSize)
    expect(counterNumberFontSize).toBe('40px')

    // Villano (fila 1) y jugadores (fila 2) deben quedar en filas visualmente
    // distintas: la coordenada `y` de la flecha del jugador debe ser mayor
    // que la del villano.
    const villainUp = page.getByRole('button', { name: 'Subir vida de VILLANO', exact: true })
    const playerUp = page.getByRole('button', { name: 'Subir vida de Jugador 1', exact: true })
    const villainBox = await villainUp.boundingBox()
    const playerBox = await playerUp.boundingBox()
    expect(
      (playerBox?.y ?? 0) > (villainBox?.y ?? 0),
      'villano y jugadores deben estar en filas distintas: la fila de jugadores debe quedar por debajo',
    ).toBe(true)
  })
})
