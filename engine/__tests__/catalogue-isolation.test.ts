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
//
// CR-02 (05-VERIFICATION.md): antes, las cinco lecturas/parseos de fichero
// (packageJsonText/packageJson/ciWorkflowText/catalogueScriptText/
// catalogueContentText) se ejecutaban en ámbito de módulo. Un `package.json`
// ilegible o inválido lanzaba al evaluar el módulo, y Vitest reportaba
// `Test Files 1 failed` / `Tests no tests`: los tests de CAT-06 (sin
// referencias remotas), CAT-07 (marcador documentado) y el barrido de
// app/ — que no dependen en absoluto de package.json — desaparecían de la
// colección junto con los que sí lo usan. Por eso cada lector vive ahora
// perezoso, invocado dentro del cuerpo de un `it()`: un `package.json` roto
// hace fallar SÓLO los tests que lo leen; el resto se sigue colectando y
// ejecutando por separado, y cada uno reporta su propio nombre y mensaje.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const packageJsonPath = fileURLToPath(new URL('../../package.json', import.meta.url))
const ciWorkflowPath = fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url))
const catalogueScriptPath = fileURLToPath(new URL('../../scripts/catalogue/fetch-marvelcdb.mjs', import.meta.url))
const catalogueContentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const appDirPath = fileURLToPath(new URL('../../app', import.meta.url))

// Lectores perezosos, uno por fichero: cada uno lee/parsea SOLO cuando un
// it() lo llama, nunca al evaluar este módulo ni el cuerpo de un describe()
// (el callback de describe también corre en tiempo de colección — moverlos
// ahí reproduciría el mismo defecto).
function readPackageJsonText(): string {
  return readFileSync(packageJsonPath, 'utf-8')
}

function loadPackageJson(): { scripts?: Record<string, string> } {
  return JSON.parse(readPackageJsonText()) as { scripts?: Record<string, string> }
}

function readCiWorkflowText(): string {
  return readFileSync(ciWorkflowPath, 'utf-8')
}

function readCatalogueScriptText(): string {
  return readFileSync(catalogueScriptPath, 'utf-8')
}

function readCatalogueContentText(): string {
  return readFileSync(catalogueContentPath, 'utf-8')
}

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
      const packageJson = loadPackageJson()
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
    const ciWorkflowText = readCiWorkflowText()
    expect(ciWorkflowText.length).toBeGreaterThan(0)
    expect(referencesCatalogueScript(ciWorkflowText)).toBe(false)
  })

  it('el gate muerde: referencesCatalogueScript detecta la entrada npm y la ruta del script', () => {
    expect(referencesCatalogueScript('npm run catalogue:generate && nuxt build')).toBe(true)
    expect(referencesCatalogueScript('node scripts/catalogue/fetch-marvelcdb.mjs')).toBe(true)
    expect(referencesCatalogueScript('nuxt build')).toBe(false)
  })

  it('CAT-03: package.json declara catalogue:generate y el script existe en esa ruta', () => {
    const packageJson = loadPackageJson()
    const catalogueScriptText = readCatalogueScriptText()
    expect(packageJson.scripts?.['catalogue:generate']).toBe('node scripts/catalogue/fetch-marvelcdb.mjs')
    expect(catalogueScriptText.length).toBeGreaterThan(0)
  })

  it('CAT-07: el script documenta el procedimiento de una fila para añadir un héroe o villano', () => {
    const catalogueScriptText = readCatalogueScriptText()
    expect(catalogueScriptText).toContain('CÓMO AÑADIR UN HÉROE O VILLANO NUEVO')
    expect(catalogueScriptText).toContain('npm run catalogue:generate')
  })

  it('CAT-06: el catálogo committeado no contiene ninguna referencia remota', () => {
    // El catálogo viaja como fichero estático dentro del bundle (su
    // importación estática llega en la Fase 6) y no lleva ninguna URL ni
    // referencia de red que resolver en tiempo de ejecución.
    const catalogueContentText = readCatalogueContentText()
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
