// e2e/unreadable-storage.spec.ts
//
// Quick 260923-3rm — cierre de WR-02 (histórico ilegible sin salida) y WR-02
// ronda 6 (el primer autoguardado de una partida nueva sobrescribía un
// progreso que no se pudo leer). Los dos tests de este fichero demuestran
// en un navegador real lo que un test puro no puede: el ciclo completo
// interfaz → localStorage → interfaz de nuevo.
import { expect, test } from '@playwright/test'

test.describe('Un histórico o un progreso ilegibles (WR-02, WR-02 ronda 6)', () => {
  test('(a) histórico ilegible: /historico explica el estado, ofrece apartarlo y lo aparta de verdad', async ({ page }) => {
    await page.goto('/')
    // Aislamiento explícito frente al `localStorage` compartido entre specs
    // (`workers: 1`, mismo perfil de navegador) — mismo criterio que
    // e2e/offline-flow.spec.ts / e2e/counter-band-height.spec.ts.
    await page.evaluate(() => localStorage.clear())

    await page.evaluate(() => {
      localStorage.setItem('tga:history', '{roto')
    })
    await page.reload()

    await page.goto('/historico')
    await expect(page.getByRole('heading', { name: 'No se puede leer el histórico', exact: true })).toBeVisible()
    await expect(page.getByText('Todavía no hay partidas registradas')).toHaveCount(0)

    await page.getByRole('button', { name: 'Apartarlo y empezar uno nuevo' }).click()
    await expect(page.getByRole('heading', { name: '¿Apartar el histórico que no se puede leer?', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sí, apartarlo', exact: true }).click()

    await expect(page.getByText('Histórico apartado: la lista empieza de nuevo vacía.')).toBeVisible()

    const resultado = await page.evaluate(() => {
      const historico = localStorage.getItem('tga:history')
      const clavesDeBackup = Object.keys(localStorage).filter(k => k.startsWith('tga:history:backup-'))
      const backup = clavesDeBackup[0] ? localStorage.getItem(clavesDeBackup[0]) : null
      return { historico, clavesDeBackup, backup }
    })
    expect(resultado.historico).toBeNull()
    expect(resultado.clavesDeBackup.length).toBe(1)
    expect(resultado.backup).toBe('{roto')
  })

  test('(b) progreso no leído al montar: el aviso nuevo se pinta, y el primer autoguardado copia antes de sobrescribir', async ({ page }) => {
    // `Storage.prototype.getItem` se envuelve ANTES de que cargue ninguna
    // página (addInitScript se ejecuta en cada documento nuevo de este
    // test): lanza SOLO para la clave `tga:progress:marvel-champions` y
    // SOLO mientras `sessionStorage.getItem('tga-fail-read') === '1'` —
    // sessionStorage no sobrevive a un `page.reload()` con el mismo origen
    // en el mismo test, así que basta con volver a escribir el flag tras
    // cada navegación real.
    await page.addInitScript(() => {
      const originalGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = function (this: Storage, key: string) {
        if (key === 'tga:progress:marvel-champions' && window.sessionStorage.getItem('tga-fail-read') === '1') {
          throw new Error('SecurityError (simulada por el test)')
        }
        return originalGetItem.call(this, key)
      }
    })

    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    await page.evaluate(() => {
      localStorage.setItem('tga:progress:marvel-champions', 'BLOB-ANTERIOR')
      sessionStorage.setItem('tga-fail-read', '1')
    })
    await page.reload()

    await page.getByRole('button', { name: 'Marvel Champions', exact: true }).click()
    await expect(page.getByText('No hemos podido comprobar si este dispositivo tiene una partida guardada de este juego.')).toBeVisible()

    // Desactivar el flag: la lectura vuelve a funcionar para el resto del test.
    await page.evaluate(() => sessionStorage.setItem('tga-fail-read', '0'))

    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: 'Normal', exact: true }).click()
    await page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' }).click()

    // El debounce del autoguardado es de 300ms (PERS-01); 1.1s es un margen
    // generoso y determinista sin depender de temporizadores falsos.
    await page.waitForTimeout(1100)

    const resultado = await page.evaluate(() => {
      const principal = localStorage.getItem('tga:progress:marvel-champions')
      const clavesDeBackup = Object.keys(localStorage).filter(k => k.startsWith('tga:progress:marvel-champions:backup-'))
      const backup = clavesDeBackup[0] ? localStorage.getItem(clavesDeBackup[0]) : null
      return { principal, clavesDeBackup, backup }
    })

    expect(resultado.clavesDeBackup.length).toBe(1)
    expect(resultado.backup).toBe('BLOB-ANTERIOR')
    expect(resultado.principal).not.toBeNull()
    expect(resultado.principal).not.toBe('BLOB-ANTERIOR')
    expect(JSON.parse(resultado.principal!).formatVersion).toBeDefined()
  })

  test('(c) con la lectura SIEMPRE caída, el autoguardado nunca sobrescribe el blob anterior', async ({ page }) => {
    await page.addInitScript(() => {
      const originalGetItem = Storage.prototype.getItem
      Storage.prototype.getItem = function (this: Storage, key: string) {
        if (key === 'tga:progress:marvel-champions' && window.sessionStorage.getItem('tga-fail-read') === '1') {
          throw new Error('SecurityError (simulada por el test)')
        }
        return originalGetItem.call(this, key)
      }
    })

    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    await page.evaluate(() => {
      localStorage.setItem('tga:progress:marvel-champions', 'BLOB-ANTERIOR')
      sessionStorage.setItem('tga-fail-read', '1')
    })
    await page.reload()

    await page.getByRole('button', { name: 'Marvel Champions', exact: true }).click()
    await expect(page.getByText('No hemos podido comprobar si este dispositivo tiene una partida guardada de este juego.')).toBeVisible()

    // El flag NO se desactiva aquí — se mantiene armado durante todo el
    // arranque de la partida nueva.
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: 'Normal', exact: true }).click()
    await page.getByRole('button', { name: 'EMPEZAR PREPARACIÓN ›' }).click()

    await page.waitForTimeout(1100)

    // Se desactiva el flag SOLO dentro de este `evaluate`, justo antes de
    // leer, para poder comprobar el estado real sin que el propio `getItem`
    // de comprobación lance.
    const resultado = await page.evaluate(() => {
      sessionStorage.setItem('tga-fail-read', '0')
      const principal = localStorage.getItem('tga:progress:marvel-champions')
      const clavesDeBackup = Object.keys(localStorage).filter(k => k.startsWith('tga:progress:marvel-champions:backup-'))
      return { principal, clavesDeBackup }
    })

    expect(resultado.principal).toBe('BLOB-ANTERIOR')
    expect(resultado.clavesDeBackup).toEqual([])
  })
})
