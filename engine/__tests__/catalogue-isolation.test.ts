// engine/__tests__/catalogue-isolation.test.ts
//
// Gate de aislamiento (D-06 heredado de la Fase 3.1 + CAT-03/CAT-06/CAT-07).
// Protege: que scripts/catalogue/fetch-marvelcdb.mjs (el único escritor de
// content/marvel-characters.json, D-09) nunca se cuele en build, generate,
// postinstall, test, CI, ni sea alcanzable desde app/; que el catálogo
// committeado no lleve ninguna referencia remota; y que el punto de
// entrada (CAT-03) y el procedimiento de una fila (CAT-07) sigan
// documentados en el propio script.
//
// Este fichero es SOLO LECTOR: nunca hace peticiones de red, nunca lanza
// procesos hijos, nunca escribe en disco. Solo lee ficheros ya
// versionados y compara en memoria — CI corre en ubuntu-latest sin acceso
// a marvelcdb.com y este gate no lo necesita.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageJsonPath = fileURLToPath(new URL('../../package.json', import.meta.url))
const ciWorkflowPath = fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url))
const catalogueScriptPath = fileURLToPath(new URL('../../scripts/catalogue/fetch-marvelcdb.mjs', import.meta.url))
const catalogueContentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const appDirPath = fileURLToPath(new URL('../../app', import.meta.url))

const packageJsonText = readFileSync(packageJsonPath, 'utf-8')
const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> }
const ciWorkflowText = readFileSync(ciWorkflowPath, 'utf-8')
const catalogueScriptText = readFileSync(catalogueScriptPath, 'utf-8')
const catalogueContentText = readFileSync(catalogueContentPath, 'utf-8')

// Función pura local compartida entre el gate real y el test de "el gate
// muerde" (mismo patrón que findStaleAudio en engine/__tests__/voice-drift.test.ts):
// true si el texto referencia el script de generación del catálogo, por su
// entrada npm o por su ruta de fichero.
function referencesCatalogueScript(text: string): boolean {
  return text.includes('catalogue:generate') || text.includes('fetch-marvelcdb')
}

// Recorrido recursivo de app/ sin procesos hijos: lista de ficheros con
// extensión .vue/.ts/.js, para acotar la lectura si app/ creciera mucho.
function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(fullPath))
    }
    else if (/\.(vue|ts|js)$/.test(entry)) {
      files.push(fullPath)
    }
  }
  return files
}

describe('gate de aislamiento del script de catálogo (D-06 heredado)', () => {
  describe('D-06: el script nunca entra en los scripts npm de build/despliegue', () => {
    // Meter una llamada de red a marvelcdb.com en cualquiera de estas
    // entradas rompería "sin backend" (CLAUDE.md §Constraints) y haría el
    // despliegue dependiente de que un servicio de terceros esté levantado.
    const guardedEntries = ['build', 'generate', 'preview', 'dev', 'postinstall', 'test']

    it.each(guardedEntries)('package.json scripts["%s"] no referencia el script de catálogo', (entryName) => {
      const value = packageJson.scripts?.[entryName] ?? ''
      expect(
        referencesCatalogueScript(value),
        `scripts["${entryName}"] referencia el script de catálogo: "${value}"`,
      ).toBe(false)
    })
  })

  it('D-06: .github/workflows/ci.yml existe y no referencia el script de catálogo', () => {
    // CI corre en ubuntu-latest y no debe depender de una API de terceros
    // para pasar: si marvelcdb.com estuviera caído, la build no puede
    // verse afectada porque nada del pipeline la consulta.
    expect(ciWorkflowText.length).toBeGreaterThan(0)
    expect(referencesCatalogueScript(ciWorkflowText)).toBe(false)
  })

  it('el gate muerde: referencesCatalogueScript detecta la entrada npm y la ruta del script', () => {
    expect(referencesCatalogueScript('npm run catalogue:generate && nuxt build')).toBe(true)
    expect(referencesCatalogueScript('node scripts/catalogue/fetch-marvelcdb.mjs')).toBe(true)
    expect(referencesCatalogueScript('nuxt build')).toBe(false)
  })

  it('CAT-03: package.json declara catalogue:generate y el script existe en esa ruta', () => {
    expect(packageJson.scripts?.['catalogue:generate']).toBe('node scripts/catalogue/fetch-marvelcdb.mjs')
    expect(catalogueScriptText.length).toBeGreaterThan(0)
  })

  it('CAT-07: el script documenta el procedimiento de una fila para añadir un héroe o villano', () => {
    expect(catalogueScriptText).toContain('CÓMO AÑADIR UN HÉROE O VILLANO NUEVO')
    expect(catalogueScriptText).toContain('npm run catalogue:generate')
  })

  it('CAT-06: el catálogo committeado no contiene ninguna referencia remota', () => {
    // El catálogo viaja como fichero estático dentro del bundle (su
    // importación estática llega en la Fase 6) y no lleva ninguna URL ni
    // referencia de red que resolver en tiempo de ejecución.
    expect(catalogueContentText).not.toContain('http')
    expect(catalogueContentText).not.toContain('marvelcdb')
    expect(catalogueContentText).not.toContain('api')
  })

  it('CAT-06/T-01-19: ningún fichero de app/ referencia el script de generación ni la API de MarvelCDB', () => {
    const files = listSourceFiles(appDirPath)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const text = readFileSync(file, 'utf-8')
      expect(text, `${file} referencia fetch-marvelcdb`).not.toContain('fetch-marvelcdb')
      expect(text, `${file} referencia marvelcdb.com`).not.toContain('marvelcdb.com')
      expect(text, `${file} referencia catalogue:generate`).not.toContain('catalogue:generate')
    }
  })
})
