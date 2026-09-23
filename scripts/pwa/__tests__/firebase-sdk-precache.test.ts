// scripts/pwa/__tests__/firebase-sdk-precache.test.ts
//
// 260923-3rk (WR-03), Task 2 — tests unitarios de la regla semilla + cierre
// de fachadas (ya caracterizados por el tracer, Task 1) y de las dos
// guardas (integridad + HTML), que este archivo lleva de RED a GREEN.
// Fuentes sintéticas mínimas que imitan la salida minificada real medida en
// <interfaces> del plan (Rolldown, sin espacio entre `}` y `from`).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  computeFirebaseSdkExclusions,
  excludeFirebaseSdkFromPrecache,
  FIREBASE_SDK_MARK,
  staticChunkImports,
} from '../firebase-sdk-precache'

describe('FIREBASE_SDK_MARK', () => {
  it('es la marca de ámbito real, nunca "firebase" a secas', () => {
    expect(FIREBASE_SDK_MARK).toBe('@firebase/')
  })
})

describe('staticChunkImports', () => {
  it('cuenta import{a as b}from"./X.js" (sin espacio antes de from, salida real de Rolldown)', () => {
    expect(staticChunkImports('import{a as b}from"./X.js";x(a,b);')).toEqual(['X.js'])
  })

  it('cuenta export*from\'./Y.js\'', () => {
    expect(staticChunkImports('export*from\'./Y.js\';')).toEqual(['Y.js'])
  })

  it('cuenta import"./Z.js" (import de solo efecto)', () => {
    expect(staticChunkImports('import"./Z.js";')).toEqual(['Z.js'])
  })

  it('cuenta la variante con backticks y espacios', () => {
    expect(staticChunkImports('import { a } from `./W.js` ;')).toEqual(['W.js'])
  })

  it('NO cuenta import(`./W.js`) dinámico', () => {
    expect(staticChunkImports('const p=import(`./W.js`);')).toEqual([])
  })

  it('NO cuenta las cadenas sueltas de un array __vite__mapDeps', () => {
    const source = 'const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=[["./V.js","./U.js"]])))=>i.map(i=>d[i]);'
    expect(staticChunkImports(source)).toEqual([])
  })

  it('deduplica nombres repetidos', () => {
    expect(staticChunkImports('import"./X.js";import"./X.js";')).toEqual(['X.js'])
  })
})

describe('computeFirebaseSdkExclusions — regla semilla + cierre de fachadas', () => {
  it('una semilla con @firebase/ queda excluida', () => {
    const chunks = new Map([['seed.js', 'contains @firebase/app-guts']])
    expect(computeFirebaseSdkExclusions(chunks)).toEqual(['seed.js'])
  })

  it('un chunk con firebaseApiKey y "firebase/app" (sin @firebase/) NO queda excluido', () => {
    const chunks = new Map([['app.js', 'const firebaseApiKey="x";import(`./seed.js`);/* firebase/app */']])
    expect(computeFirebaseSdkExclusions(chunks)).toEqual([])
  })

  it('una fachada que solo importa estáticamente la semilla queda excluida', () => {
    const chunks = new Map([
      ['seed.js', '@firebase/app'],
      ['facade.js', 'import{a as b}from"./seed.js";export{b as x};'],
    ])
    expect(computeFirebaseSdkExclusions(chunks)).toEqual(['facade.js', 'seed.js'])
  })

  it('una cadena de fachadas A->B->semilla deja fuera las tres', () => {
    const chunks = new Map([
      ['seed.js', '@firebase/app'],
      ['b.js', 'import"./seed.js";'],
      ['a.js', 'import"./b.js";'],
    ])
    expect(computeFirebaseSdkExclusions(chunks)).toEqual(['a.js', 'b.js', 'seed.js'])
  })

  it('un chunk que llega a la semilla solo por import dinámico + mapDeps, y que además importa estáticamente un chunk de la app, NO se excluye y no lanza', () => {
    const chunks = new Map([
      ['seed.js', '@firebase/app'],
      ['app-chunk.js', 'export const y=1;'],
      [
        'lazy-loader.js',
        'import"./app-chunk.js";const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=[["./seed.js"]])))=>i.map(i=>d[i]);const p=import(`./${__vite__mapDeps([0])[0]}`);',
      ],
    ])
    expect(() => computeFirebaseSdkExclusions(chunks)).not.toThrow()
    expect(computeFirebaseSdkExclusions(chunks)).toEqual(['seed.js'])
  })

  it('sin semillas, el resultado es [] y no lanza', () => {
    const chunks = new Map([['a.js', 'export const x=1;'], ['b.js', 'import"./a.js";']])
    expect(() => computeFirebaseSdkExclusions(chunks)).not.toThrow()
    expect(computeFirebaseSdkExclusions(chunks)).toEqual([])
  })

  it('GUARDA DE INTEGRIDAD: un chunk que importa estáticamente la semilla Y un chunk de la app lanza un Error que nombra ambos ficheros y cita SYNC-05', () => {
    const chunks = new Map([
      ['seed.js', '@firebase/app'],
      ['app-chunk.js', 'export const y=1;'],
      ['broken.js', 'import{a}from"./seed.js";import{y}from"./app-chunk.js";'],
    ])
    expect(() => computeFirebaseSdkExclusions(chunks)).toThrowError(/broken\.js.*seed\.js|seed\.js.*broken\.js/s)
    try {
      computeFirebaseSdkExclusions(chunks)
      expect.unreachable('debía lanzar')
    }
    catch (error) {
      const message = (error as Error).message
      expect(message).toContain('broken.js')
      expect(message).toContain('seed.js')
      expect(message).toContain('SYNC-05')
      expect(message.toLowerCase()).toMatch(/sin red|roto|varad/)
    }
  })

  it('GUARDA DE HTML: si un HTML prerenderizado contiene _nuxt/<excluido>, lanza un Error que nombra el HTML y el chunk', () => {
    const chunks = new Map([['seed.js', '@firebase/app']])
    const htmlFiles = new Map([['index.html', '<script src="_nuxt/seed.js"></script>']])
    try {
      computeFirebaseSdkExclusions(chunks, htmlFiles)
      expect.unreachable('debía lanzar')
    }
    catch (error) {
      const message = (error as Error).message
      expect(message).toContain('index.html')
      expect(message).toContain('seed.js')
    }
  })

  it('GUARDA DE HTML: sin HTML afectado no lanza', () => {
    const chunks = new Map([['seed.js', '@firebase/app']])
    const htmlFiles = new Map([['index.html', '<script src="_nuxt/other-chunk.js"></script>']])
    expect(() => computeFirebaseSdkExclusions(chunks, htmlFiles)).not.toThrow()
  })
})

describe('excludeFirebaseSdkFromPrecache', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tga-wr03-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('sin _nuxt/ deja globIgnores intacto', () => {
    const options = { workbox: { globDirectory: dir, globIgnores: ['a', 'b'] } }
    excludeFirebaseSdkFromPrecache(options)
    expect(options.workbox.globIgnores).toEqual(['a', 'b'])
  })

  it('con _nuxt/ añade _nuxt/<semilla>.js y conserva los patrones previos', () => {
    const nuxtDir = join(dir, '_nuxt')
    mkdirSync(nuxtDir)
    writeFileSync(join(nuxtDir, 'seed.js'), '@firebase/app')
    writeFileSync(join(nuxtDir, 'other.js'), 'export const x=1;')

    const options = { workbox: { globDirectory: dir, globIgnores: ['existing-pattern'] } }
    excludeFirebaseSdkFromPrecache(options)

    expect(options.workbox.globIgnores).toContain('existing-pattern')
    expect(options.workbox.globIgnores).toContain('_nuxt/seed.js')
    expect(options.workbox.globIgnores).not.toContain('_nuxt/other.js')
  })

  it('dos llamadas seguidas no duplican nada, y el array original pasado no se muta', () => {
    const nuxtDir = join(dir, '_nuxt')
    mkdirSync(nuxtDir)
    writeFileSync(join(nuxtDir, 'seed.js'), '@firebase/app')

    const originalArray = ['existing-pattern']
    const options = { workbox: { globDirectory: dir, globIgnores: originalArray } }
    excludeFirebaseSdkFromPrecache(options)
    excludeFirebaseSdkFromPrecache(options)

    const seedEntries = options.workbox.globIgnores!.filter(p => p === '_nuxt/seed.js')
    expect(seedEntries).toHaveLength(1)
    expect(originalArray).toEqual(['existing-pattern']) // nunca mutado
    expect(options.workbox.globIgnores).not.toBe(originalArray) // siempre un array nuevo
  })

  it('si un HTML temporal referencia la semilla, lanza', () => {
    const nuxtDir = join(dir, '_nuxt')
    mkdirSync(nuxtDir)
    writeFileSync(join(nuxtDir, 'seed.js'), '@firebase/app')
    writeFileSync(join(dir, 'index.html'), '<script src="_nuxt/seed.js"></script>')

    const options = { workbox: { globDirectory: dir, globIgnores: [] } }
    expect(() => excludeFirebaseSdkFromPrecache(options)).toThrow()
  })

  it('sin globDirectory no toca nada', () => {
    const options = { workbox: { globIgnores: ['x'] } }
    excludeFirebaseSdkFromPrecache(options)
    expect(options.workbox.globIgnores).toEqual(['x'])
  })
})
