// e2e/counter-band-behavior.spec.ts
//
// Prueba de extremo a extremo, sobre el build de producción (`nuxt generate`
// + `nuxi preview`, ver playwright.config.ts), de los topes de los
// contadores de vida, la marca de «SIN VIDA», el no-avance del paso al tocar
// una flecha, y la persistencia del valor tras una recarga a mitad de
// partida (07-CONTEXT.md D-12, D-13, D-15, D-16, D-17, D-20).
//
// Cubre: repetición de toques (▲/▼ exactos, sin doble conteo ni repetición
// al mantener pulsado), topes en 0/sin cota superior, marca de derrotado,
// no-avance del paso mientras Espacio/← siguen igual que en v1.7, y
// persistencia tras recarga.
//
// NO cubre: el dedo real sobre un cristal ni la legibilidad a un brazo de
// distancia — eso sigue siendo manual (plan 07 de esta fase) porque el
// modelo y el sistema operativo de la tablet real de la mesa siguen sin
// identificarse (`STATE.md` §Blockers/Concerns).
//
// Localizar SIEMPRE por rol y aria-label, nunca por una cadena de clases de
// Tailwind — mismo criterio que e2e/counter-band-height.spec.ts.
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1024, height: 768 } })

// ---------------------------------------------------------------------------
// Helpers — copia explícita de los de e2e/counter-band-height.spec.ts (plan
// 06 Task 1): ningún fichero importa al otro porque ambos son módulos
// `.spec.ts` de Playwright y una importación cruzada registraría los tests
// del fichero importado una segunda vez.
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Localizador de la banda por relación ESTRUCTURAL (hermano inmediato de
// <header>) filtrado por el aria-label real de uno de sus botones — nunca
// por una cadena de clases de Tailwind.
function getCounterBand(page: import('@playwright/test').Page) {
  return page.locator('header + div').filter({
    has: page.getByRole('button', { name: 'Bajar vida de VILLANO', exact: true }),
  })
}

// `baseLabel` es el rótulo LIMPIO de la celda ('VILLANO', 'Jugador 1'…): el
// patrón acepta el sufijo opcional « · SIN VIDA» sin necesitar dos
// localizadores distintos según el estado de la celda.
function downButton(page: import('@playwright/test').Page, baseLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^Bajar vida de ${escapeRegExp(baseLabel)}(?: · SIN VIDA)?$`) })
}

function upButton(page: import('@playwright/test').Page, baseLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^Subir vida de ${escapeRegExp(baseLabel)}(?: · SIN VIDA)?$`) })
}

// La celda es el segundo ancestro `div` del botón ▼ (botón -> envoltorio
// interior de las dos flechas y el número -> celda con la etiqueta overlay),
// recorrido por XPath relativo — estructural, no una clase de Tailwind.
function getCell(page: import('@playwright/test').Page, baseLabel: string) {
  return downButton(page, baseLabel).locator('xpath=ancestor::div[2]')
}

// Dentro de la celda hay exactamente dos <span>: el valor (primero, dentro
// del envoltorio de las flechas) y la etiqueta overlay (segundo, hermano del
// envoltorio) — mismo orden de documento en cualquier celda.
function getCellValue(page: import('@playwright/test').Page, baseLabel: string) {
  return getCell(page, baseLabel).locator('span').first()
}

function getCellLabel(page: import('@playwright/test').Page, baseLabel: string) {
  return getCell(page, baseLabel).locator('span').nth(1)
}

async function tapUp(page: import('@playwright/test').Page, baseLabel: string) {
  await upButton(page, baseLabel).click()
}

async function tapDown(page: import('@playwright/test').Page, baseLabel: string) {
  await downButton(page, baseLabel).click()
}

async function startGame(page: import('@playwright/test').Page) {
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
}

// Pulsa «SIGUIENTE ›» y, cuando aparezca, «EMPEZAR A JUGAR ›», cortando en
// cuanto `target` esté visible — nunca por un número de pasos cableado
// (TECH-04): el contenido puede crecer sin que este helper deba conocer
// cuántos pasos tiene la preparación.
async function advanceUntilVisible(page: import('@playwright/test').Page, target: ReturnType<typeof getCounterBand>) {
  const nextButton = page.getByRole('button', { name: 'SIGUIENTE ›' })
  const startButton = page.getByRole('button', { name: 'EMPEZAR A JUGAR ›' })
  const MAX_ITERATIONS = 40

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (await target.isVisible().catch(() => false)) break
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

  await expect(target, 'destino no alcanzado tras recorrer 40 pasos como máximo').toBeVisible()
}

async function goToRoundLoop(page: import('@playwright/test').Page) {
  await startGame(page)
  await advanceUntilVisible(page, getCounterBand(page))
}

// Recorre selector -> mini-setup -> preparación hasta el paso de selección de
// personajes (D-02 lo identifica por el dato `selection: 'characters'`, no
// por un id de paso cableado), elige el villano Rhino y asigna Thor al
// Jugador 1, y continúa hasta el bucle de rondas.
async function goToRoundLoopWithRhinoAndThor(page: import('@playwright/test').Page) {
  await startGame(page)

  const villainRow = page.getByRole('button', { name: 'Elegir villano' })
  await advanceUntilVisible(page, villainRow)
  await villainRow.click()
  await page.getByRole('button', { name: 'Rhino', exact: true }).click()

  const playerRow = page.getByRole('button', { name: 'Elegir héroe y nombre de Jugador 1' })
  await expect(playerRow).toBeVisible()
  await playerRow.click()
  await page.getByRole('button', { name: 'Thor', exact: true }).click()

  await advanceUntilVisible(page, getCounterBand(page))
}

test.describe('Contadores de vida — comportamiento de extremo a extremo (D-12/D-13/D-15/D-16/D-17/D-20)', () => {
  test('sin selección, todas las celdas pintan «—» y ninguna dice SIN VIDA (D-12, COMP-02)', async ({ page }) => {
    await goToRoundLoop(page)

    for (const label of ['VILLANO', 'Jugador 1', 'Jugador 2', 'Jugador 3']) {
      const value = await getCellValue(page, label).innerText()
      expect(value, `la celda «${label}» debería pintar «—» sin selección`).toBe('—')
    }

    await expect(page.getByText('SIN VIDA')).toHaveCount(0)
  })

  test('▲ sobre «—» arranca en 1 y ▼ sobre «—» no hace nada (D-12)', async ({ page }) => {
    await goToRoundLoop(page)

    await tapDown(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1')).toHaveText('—')

    await tapUp(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1')).toHaveText('1')
  })

  test('un toque cambia el valor en exactamente ±1, sin repetición al mantener pulsado (D-13, HP-04, HP-10)', async ({ page }) => {
    await goToRoundLoop(page)

    // «Desde 1»: arranca la celda con un solo toque en ▲ sobre «—».
    await tapUp(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1')).toHaveText('1')

    await tapUp(page, 'Jugador 1')
    await tapUp(page, 'Jugador 1')
    await tapUp(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1'), 'tres toques en ▲ desde 1 deben dar exactamente 4').toHaveText('4')

    await tapDown(page, 'Jugador 1')
    await tapDown(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1'), 'dos toques en ▼ desde 4 deben dar exactamente 2').toHaveText('2')

    // Toque MANTENIDO explícito (HP-10, parte automatizable): 1200ms sujeto
    // sobre ▲ debe producir exactamente +1, nunca repetición.
    const before = await getCellValue(page, 'Jugador 1').innerText()
    await upButton(page, 'Jugador 1').hover()
    await page.mouse.down()
    await page.waitForTimeout(1200)
    await page.mouse.up()
    const after = await getCellValue(page, 'Jugador 1').innerText()
    expect(Number(after) - Number(before), 'mantener pulsado ▲ 1200ms debe cambiar el valor en exactamente +1').toBe(1)
  })

  test('el tope en 0 marca SIN VIDA, no baja de 0, no abre diálogo, no avanza el paso, y se puede recuperar con ▲ (D-15, D-16, HP-06, HP-07)', async ({ page }) => {
    await goToRoundLoop(page)

    const stepTextBefore = await page.locator('main p.text-display').innerText()

    await tapUp(page, 'Jugador 1')
    await tapDown(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1'), 'el valor visible en el tope debe ser 0, no —').toHaveText('0')
    await expect(getCellLabel(page, 'Jugador 1')).toHaveText('Jugador 1 · SIN VIDA')
    await expect(downButton(page, 'Jugador 1')).toHaveAttribute('aria-label', 'Bajar vida de Jugador 1 · SIN VIDA')
    await expect(upButton(page, 'Jugador 1')).toHaveAttribute('aria-label', 'Subir vida de Jugador 1 · SIN VIDA')

    // Sin diálogo abierto y sin fin de partida: la banda y el paso siguen
    // exactamente donde estaban.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(getCounterBand(page)).toBeVisible()
    const stepTextAtZero = await page.locator('main p.text-display').innerText()
    expect(stepTextAtZero, 'llegar a 0 no debe avanzar ni cambiar el paso').toBe(stepTextBefore)

    // ▼ otra vez sobre 0 sigue en 0 (D-15: no baja de 0).
    await tapDown(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1')).toHaveText('0')

    // ▲ recupera: vuelve a 1 y la etiqueta pierde «SIN VIDA» (D-16).
    await tapUp(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1')).toHaveText('1')
    await expect(getCellLabel(page, 'Jugador 1')).toHaveText('Jugador 1')
    await expect(page.getByText('SIN VIDA')).toHaveCount(0)
  })

  test('tocar las flechas nunca avanza el paso; Espacio y ← siguen como en v1.7 (D-17, HP-09)', async ({ page }) => {
    await goToRoundLoop(page)

    const stepText = page.locator('main p.text-display')
    const stepTextBefore = await stepText.innerText()
    const headerTextBefore = await page.locator('header').innerText()

    // Ráfaga de seis toques alternos en ▲/▼ de distintas celdas.
    await tapUp(page, 'VILLANO')
    await tapDown(page, 'Jugador 1')
    await tapUp(page, 'Jugador 2')
    await tapDown(page, 'Jugador 3')
    await tapUp(page, 'Jugador 1')
    await tapDown(page, 'VILLANO')

    expect(await stepText.innerText(), 'la ráfaga de toques en la banda no debe cambiar el texto del paso').toBe(stepTextBefore)
    expect(await page.locator('header').innerText(), 'la ráfaga de toques en la banda no debe cambiar la cabecera').toBe(headerTextBefore)

    // Foco en una flecha, Espacio SÍ avanza (comportamiento v1.7 intacto,
    // D-17) y NO toca el valor del contador enfocado.
    const villainUp = upButton(page, 'VILLANO')
    await villainUp.focus()
    const villainValueBeforeSpace = await getCellValue(page, 'VILLANO').innerText()

    await page.keyboard.press('Space')
    expect(await stepText.innerText(), 'Espacio con el foco en ▲ debe avanzar el paso').not.toBe(stepTextBefore)
    expect(await getCellValue(page, 'VILLANO').innerText(), 'Espacio no debe cambiar el valor del contador enfocado').toBe(villainValueBeforeSpace)

    await page.keyboard.press('ArrowLeft')
    expect(await stepText.innerText(), '← debe retroceder al paso anterior').toBe(stepTextBefore)
  })

  test('recargar a mitad de partida conserva el valor exacto de los contadores (D-20, HP-08)', async ({ page }) => {
    await goToRoundLoop(page)

    await tapUp(page, 'Jugador 1')
    await tapUp(page, 'Jugador 1')
    await expect(getCellValue(page, 'Jugador 1')).toHaveText('2')

    await tapUp(page, 'VILLANO')
    await tapUp(page, 'VILLANO')
    await tapUp(page, 'VILLANO')
    await expect(getCellValue(page, 'VILLANO')).toHaveText('3')

    // El watchDebounced de la página guarda a los 300ms; se espera un margen
    // determinista en vez de depender de la carrera del `pagehide`.
    await page.waitForTimeout(400)

    await page.reload()
    await expect(page.getByText('Partida guardada')).toBeVisible()
    await page.getByRole('button', { name: 'CONTINUAR ›' }).click()

    await expect(getCounterBand(page)).toBeVisible()
    await expect(getCellValue(page, 'Jugador 1')).toHaveText('2')
    await expect(getCellValue(page, 'VILLANO')).toHaveText('3')
  })

  test('un héroe elegido precarga la cifra correcta del catálogo (HP-05, criterio de éxito nº 2)', async ({ page }) => {
    await goToRoundLoopWithRhinoAndThor(page)

    // Thor: 14 de vida plana (sin multiplicar por jugadores). Rhino arranca
    // en 14 × 3 jugadores (healthPerHero) = 42. Ninguno de los dos toques en
    // ninguna flecha: es la precarga sola.
    await expect(getCellValue(page, 'Jugador 1'), 'Thor debería precargar 14 sin tocar ninguna flecha').toHaveText('14')
    await expect(getCellValue(page, 'VILLANO'), 'Rhino con 3 jugadores debería precargar 42 sin tocar ninguna flecha').toHaveText('42')
  })

  test('separador visible entre celdas, ausente solo en la primera de la banda (WR-01, medido)', async ({ page }) => {
    await goToRoundLoop(page)

    // El viewport por defecto de este fichero es 1024x768 (test.use arriba):
    // desde `sm:` las dos filas colapsan en una sola visualmente, así que
    // solo la celda global 0 (VILLANO) debe medir 0px de borde izquierdo.
    for (const [label, expected] of [
      ['VILLANO', '0px'],
      ['Jugador 1', '1px'],
      ['Jugador 2', '1px'],
      ['Jugador 3', '1px'],
    ] as const) {
      const borderLeftWidth = await getCell(page, label).evaluate(el => getComputedStyle(el).borderLeftWidth)
      expect(borderLeftWidth, `borderLeftWidth de la celda «${label}» a 1024x768`).toBe(expected)
    }

    // A 400x800 las dos filas vuelven a ser cajas independientes: la primera
    // celda de CADA fila (VILLANO y Jugador 1) mide 0px, no solo la global.
    await page.setViewportSize({ width: 400, height: 800 })

    for (const [label, expected] of [
      ['VILLANO', '0px'],
      ['Jugador 1', '0px'],
      ['Jugador 2', '1px'],
      ['Jugador 3', '1px'],
    ] as const) {
      const borderLeftWidth = await getCell(page, label).evaluate(el => getComputedStyle(el).borderLeftWidth)
      expect(borderLeftWidth, `borderLeftWidth de la celda «${label}» a 400x800`).toBe(expected)
    }
  })

  test('el estado de pulsado se limpia al soltar fuera y al cancelar el toque; la acción sigue solo en el clic completo (WR-02, D-14)', async ({ page }) => {
    await goToRoundLoop(page)

    const villainUp = upButton(page, 'VILLANO')
    const isPressed = () => villainUp.evaluate(el => el.className.includes('scale-[0.98]'))

    // Punto de partida numérico (arranca en «—»): un toque completo lo lleva
    // a 1 y deja una base sobre la que medir «no cambió».
    await villainUp.click()
    const baseline = await getCellValue(page, 'VILLANO').innerText()

    // Secuencia 1: apretar el ratón, comprobar que el estado de pulsado se
    // aplica, moverlo FUERA del botón y soltar ahí — el botón debe volver a
    // reposo antes incluso de soltar, y el valor no debe haber cambiado.
    const box = await villainUp.boundingBox()
    if (!box) throw new Error('el botón ▲ de VILLANO no tiene boundingBox')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    expect(await isPressed(), 'tras apretar el botón debe mostrar el estado de pulsado').toBe(true)
    await page.mouse.move(box.x + box.width + 40, box.y + box.height / 2)
    expect(await isPressed(), 'salir del botón con el puntero apretado debe limpiar el estado de pulsado').toBe(false)
    await page.mouse.up()
    expect(await getCellValue(page, 'VILLANO').innerText(), 'soltar fuera del botón no debe cambiar el valor').toBe(baseline)

    // Secuencia 2: el disparador realista en una tablet — el sistema cancela
    // el toque en curso (notificación, rechazo de palma, gesto propio).
    await villainUp.dispatchEvent('touchstart')
    expect(await isPressed(), 'tras un touchstart el botón debe mostrar el estado de pulsado').toBe(true)
    await villainUp.dispatchEvent('touchcancel')
    expect(await isPressed(), 'un touchcancel debe limpiar el estado de pulsado').toBe(false)
    expect(await getCellValue(page, 'VILLANO').innerText(), 'un touchcancel no debe cambiar el valor').toBe(baseline)

    // Secuencia 3 (D-13, sin temporizador): mantener el ratón apretado ~1s
    // sobre el propio botón y soltar ahí — el valor debe cambiar en
    // exactamente +1, nunca en más, aunque la acción quede atada solo al
    // clic completo.
    await villainUp.hover()
    await page.mouse.down()
    await page.waitForTimeout(1000)
    await page.mouse.up()
    const afterHold = await getCellValue(page, 'VILLANO').innerText()
    expect(Number(afterHold) - Number(baseline), 'mantener pulsado ~1s y soltar sobre el botón debe producir exactamente +1').toBe(1)
  })

  test('las flechas de la banda quedan fuera del recorrido de tabulación, sin llevarse por delante el resto del teclado (WR-03, D-17)', async ({ page }) => {
    await goToRoundLoop(page)

    // (a) medido en el navegador: los 8 botones de contador (VILLANO + 3
    // jugadores × 2 flechas) tienen tabIndex === -1.
    const arrowLabels = ['VILLANO', 'Jugador 1', 'Jugador 2', 'Jugador 3']
    for (const label of arrowLabels) {
      expect(await downButton(page, label).evaluate(el => el.tabIndex), `tabIndex de «Bajar vida de ${label}»`).toBe(-1)
      expect(await upButton(page, label).evaluate(el => el.tabIndex), `tabIndex de «Subir vida de ${label}»`).toBe(-1)
    }

    // (b)+(c): partiendo del body, 15 tabulaciones nunca dejan el foco en
    // una flecha de contador, y en esa misma pasada el foco SÍ llega en
    // algún momento al botón «SIGUIENTE» de NavBand — guardia contra
    // llevarse por delante la navegación por teclado del resto de la
    // pantalla.
    await page.evaluate(() => document.body.focus())

    let reachedNext = false
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        return { ariaLabel: el?.getAttribute('aria-label') ?? null, textContent: el?.textContent?.trim() ?? null }
      })
      expect(
        focused.ariaLabel?.startsWith('Bajar vida de') || focused.ariaLabel?.startsWith('Subir vida de'),
        `la tabulación nº ${i + 1} no debe dejar el foco en una flecha de contador (aria-label: ${focused.ariaLabel})`,
      ).toBeFalsy()
      if (focused.textContent?.includes('SIGUIENTE')) reachedNext = true
    }

    expect(reachedNext, 'el foco debe llegar al botón SIGUIENTE en algún momento de las 15 tabulaciones').toBe(true)
  })
})
