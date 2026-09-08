// e2e/counter-band-overlap.spec.ts
//
// Registro ejecutable del hueco bloqueante CR-01 de `07-VERIFICATION.md`: en
// combinaciones de viewport estrecho y varios jugadores, las celdas de la
// banda de contadores se solapan visualmente y el toque en el centro de un
// botón ▼/▲ puede acabar mutando el contador de la celda vecina en vez del
// que el botón rotula. Este fichero mide, para una matriz de viewport × nº
// de jugadores, que la banda no desborda su cascarón, que ningún par de
// botones se solapa, y —la aserción decisiva— que el centro de cada botón
// hace hit-test sobre sí mismo (`elementFromPoint`), no sobre su vecino.
//
// Los helpers de este fichero son COPIA EXPLÍCITA de los de
// e2e/counter-band-height.spec.ts y e2e/counter-band-behavior.spec.ts, nunca
// una importación cruzada: un `.spec.ts` de Playwright registra sus
// `test()`/`test.describe()` en cuanto el módulo se carga, así que importar
// uno desde el otro ejecutaría sus tests una segunda vez bajo este título
// (mismo criterio documentado en 07-06-SUMMARY.md §Decisions Made).
import { expect, test } from '@playwright/test'

// Los cinco viewports de la matriz, cada uno con su motivo:
const VIEWPORTS = [
  // Apaisado objetivo: guardia de no-regresión, es donde D-02/HP-10 exigen
  // el objetivo táctil más grande posible.
  { width: 1024, height: 768 },
  // Los dos viewports que e2e/portrait-usable.spec.ts ya declara soportados.
  { width: 820, height: 1180 },
  { width: 412, height: 915 },
  // La ventana estrecha que 07-VERIFICATION.md midió rota, y el borde justo
  // por encima del breakpoint `sm` de Tailwind (640px).
  { width: 700, height: 800 },
  { width: 660, height: 800 },
]

const PLAYER_COUNTS = [1, 2, 3, 4]

// El `sm:` de Tailwind que D-05/07-UI-SPEC.md §3 fijaron para partir la
// banda en dos filas por debajo de este ancho — no una cifra inventada aquí.
const SM_BREAKPOINT = 640

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

function downButton(page: import('@playwright/test').Page, baseLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^Bajar vida de ${escapeRegExp(baseLabel)}(?: · SIN VIDA)?$`) })
}

function upButton(page: import('@playwright/test').Page, baseLabel: string) {
  return page.getByRole('button', { name: new RegExp(`^Subir vida de ${escapeRegExp(baseLabel)}(?: · SIN VIDA)?$`) })
}

function getCell(page: import('@playwright/test').Page, baseLabel: string) {
  return downButton(page, baseLabel).locator('xpath=ancestor::div[2]')
}

function getCellValue(page: import('@playwright/test').Page, baseLabel: string) {
  return getCell(page, baseLabel).locator('span').first()
}

// Igual que `goToRoundLoop` de los otros dos ficheros, pero pulsando el
// botón del mini-setup rotulado con la cifra de `playerCount` recibida en
// vez del '3' cableado. Corte por APARICIÓN de la banda (TECH-04), nunca por
// un número de pasos fijo.
async function goToRoundLoopWithPlayers(page: import('@playwright/test').Page, playerCount: number) {
  await page.goto('/')

  // Defensa contra el estado que dejan otras specs (`workers: 1`, mismo
  // perfil de navegador, `localStorage` compartido) — mismo patrón que las
  // otras dos specs de la banda.
  const savedGame = page.getByText('Partida guardada')
  if (await savedGame.isVisible().catch(() => false)) {
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  }

  const gameButton = page.getByRole('button', { name: 'Marvel Champions', exact: true })
  await expect(gameButton).toBeVisible()
  await gameButton.click()

  await expect(page.getByText('Nº de jugadores')).toBeVisible()
  await page.getByRole('button', { name: String(playerCount), exact: true }).click()
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

// Recoge, en una sola llamada `evaluate`, el rectángulo y el aria-label de
// todos los botones ▼/▲ de la banda — evita N idas y vueltas al DOM por
// botón, que multiplicarían el coste de la matriz.
async function collectButtonRects(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('button[aria-label^="Bajar vida de"], button[aria-label^="Subir vida de"]'),
    )
    return buttons.map((button) => {
      const rect = button.getBoundingClientRect()
      return {
        label: button.getAttribute('aria-label') ?? '',
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      }
    })
  })
}

test.describe('Ajuste, no-solapamiento y hit-test de la banda de contadores (matriz viewport × nº de jugadores)', () => {
  for (const playerCount of PLAYER_COUNTS) {
    test(`nº de jugadores = ${playerCount}: la banda cabe, no se solapa, y cada botón se toca a sí mismo en los cinco viewports`, async ({ page }) => {
      await goToRoundLoopWithPlayers(page, playerCount)

      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport)

        const band = getCounterBand(page)
        await expect(band, `la banda no está visible en ${viewport.width}x${viewport.height} con ${playerCount} jugadores`).toBeVisible()
        // Esperar a que la banda se estabilice tras el cambio de viewport
        // antes de medir: misma técnica con la que 07-VERIFICATION.md
        // reprodujo el fallo (mismo `page`, sin recarga).
        await band.boundingBox()

        const context = `viewport ${viewport.width}x${viewport.height}, ${playerCount} jugadores`

        // 1. Ajuste horizontal: la banda no desborda su cascarón.
        const fitsHorizontally = await band.evaluate(el => el.scrollWidth <= el.clientWidth)
        expect(fitsHorizontally, `la banda desborda horizontalmente (${context})`).toBe(true)

        const bandBox = await band.boundingBox()
        expect(bandBox, `no se pudo medir el rectángulo de la banda (${context})`).not.toBeNull()

        const rects = await collectButtonRects(page)
        expect(rects.length, `no se encontraron botones de contador en la banda (${context})`).toBeGreaterThan(0)

        const TOLERANCE = 0.5

        // 2. Contención: cada botón cae dentro del rectángulo de la banda
        // (con tolerancia de 0.5px por lado) y no supera el clientWidth del
        // viewport.
        for (const rect of rects) {
          if (bandBox) {
            expect(
              rect.left >= bandBox.x - TOLERANCE,
              `«${rect.label}» sale por la izquierda de la banda (${context})`,
            ).toBe(true)
            expect(
              rect.top >= bandBox.y - TOLERANCE,
              `«${rect.label}» sale por arriba de la banda (${context})`,
            ).toBe(true)
            expect(
              rect.right <= bandBox.x + bandBox.width + TOLERANCE,
              `«${rect.label}» sale por la derecha de la banda (${context})`,
            ).toBe(true)
            expect(
              rect.bottom <= bandBox.y + bandBox.height + TOLERANCE,
              `«${rect.label}» sale por abajo de la banda (${context})`,
            ).toBe(true)
          }
          expect(
            rect.right <= viewport.width + TOLERANCE,
            `«${rect.label}» queda fuera del viewport (borde derecho ${rect.right} > ${viewport.width}) (${context})`,
          ).toBe(true)
        }

        // 3. No-solapamiento por pares: ningún rectángulo se interseca con
        // otro más allá de compartir borde (<= 0.5px en algún eje).
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i]!
            const b = rects[j]!
            const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left)
            const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
            const overlaps = overlapX > TOLERANCE && overlapY > TOLERANCE
            expect(
              overlaps,
              `«${a.label}» y «${b.label}» se solapan ${overlapX.toFixed(1)}x${overlapY.toFixed(1)}px (${context})`,
            ).toBe(false)
          }
        }

        // 4. Prueba de impacto: el centro de cada botón hace hit-test sobre
        // sí mismo, no sobre su vecino. Es la aserción que distingue «se ve
        // mejor» de «ya no roba el toque».
        for (const rect of rects) {
          const hitLabel = await page.evaluate(
            ({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label') ?? null,
            { x: rect.centerX, y: rect.centerY },
          )
          expect(
            hitLabel,
            `el centro de «${rect.label}» hace hit-test sobre «${hitLabel}» en vez de sobre sí mismo (${context})`,
          ).toBe(rect.label)
        }

        // 5. Decisiones de altura y tipografía intactas (D-01/D-05/D-06):
        // sin referenciar aquí el techo del 15% de HP-02, que D-06 acota al
        // viewport apaisado objetivo únicamente.
        const expectedHeight = viewport.width >= SM_BREAKPOINT ? 96 : 192
        expect(
          bandBox?.height,
          `la altura de la banda no es ${expectedHeight}px (${context})`,
        ).toBe(expectedHeight)

        const counterFontSize = await band.locator('span.text-display').first().evaluate(el => getComputedStyle(el).fontSize)
        expect(counterFontSize, `el número de la banda no mide 40px (${context})`).toBe('40px')
      }
    })
  }
})

test.describe('Comportamiento de extremo a extremo en 412x915 con 4 jugadores (el caso reproducido en 07-VERIFICATION.md)', () => {
  test.use({ viewport: { width: 412, height: 915 } })

  test('▲ de Jugador 1 sube solo Jugador 1; VILLANO y Jugador 2/3/4 quedan intactos', async ({ page }) => {
    await goToRoundLoopWithPlayers(page, 4)

    const labels = ['VILLANO', 'Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4']
    const before: Record<string, string> = {}
    for (const label of labels) before[label] = await getCellValue(page, label).innerText()

    await upButton(page, 'Jugador 1').click()

    expect(await getCellValue(page, 'Jugador 1').innerText(), 'Jugador 1 debería haber subido').toBe('1')
    for (const label of labels) {
      if (label === 'Jugador 1') continue
      expect(await getCellValue(page, label).innerText(), `«${label}» no debería haber cambiado tras tocar ▲ de Jugador 1`).toBe(before[label])
    }
  })

  test('▲ de Jugador 4 (el botón que 07-VERIFICATION.md midió fuera del viewport) sube solo Jugador 4', async ({ page }) => {
    await goToRoundLoopWithPlayers(page, 4)

    const labels = ['VILLANO', 'Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4']
    const before: Record<string, string> = {}
    for (const label of labels) before[label] = await getCellValue(page, label).innerText()

    await upButton(page, 'Jugador 4').click()

    expect(await getCellValue(page, 'Jugador 4').innerText(), 'Jugador 4 debería haber subido').toBe('1')
    for (const label of labels) {
      if (label === 'Jugador 4') continue
      expect(await getCellValue(page, label).innerText(), `«${label}» no debería haber cambiado tras tocar ▲ de Jugador 4`).toBe(before[label])
    }
  })
})

test.describe('Objetivo táctil en el viewport apaisado objetivo (1024x768, 4 jugadores)', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test('cada botón ▼/▲ mide 44px de ancho o más (D-02/HP-10: el arreglo no degrada el objetivo táctil donde sí hay sitio)', async ({ page }) => {
    await goToRoundLoopWithPlayers(page, 4)

    const rects = await collectButtonRects(page)
    expect(rects.length).toBeGreaterThan(0)
    for (const rect of rects) {
      expect(rect.width, `«${rect.label}» mide ${rect.width.toFixed(1)}px de ancho, menos de 44px`).toBeGreaterThanOrEqual(44)
    }
  })
})
