// scripts/pwa/firebase-sdk-precache.ts
//
// WR-03 (10-REVIEW.md, confirmado en .planning/todos/): excluye del precacheo
// de Workbox el grafo diferido del SDK de Firebase, identificado por su
// CONTENIDO — nunca por nombre de chunk, porque la salida de Vite/Rolldown
// usa nombres `[hash].js` sin ninguna pista legible.
//
// Código solo de Node: ningún fichero de `app/` debe importar este módulo.
//
// LA TRAMPA (ver también la cabecera de e2e/bundle-budget.spec.ts): un
// `import()` dinámico deja en el chunk que lo contiene el especificador del
// módulo diferido como cadena literal. Medido en este repo, dos falsos
// positivos con la subcadena `firebase` a secas:
//   - el chunk que agrupa `app/composables/useHistorySync.ts` (los tres
//     `import('firebase/...')` de `syncPending`);
//   - la fachada de `firebase/app` (681 B), que contiene la cadena
//     `firebase` en `registerVersion` pero NO la marca real del SDK.
// La marca que sí distingue el SDK real es `@firebase/` — el ÁMBITO interno
// de sus paquetes (`@firebase/app`, `@firebase/firestore`, `@firebase/auth`,
// etc.), que solo aparece dentro del código real del SDK.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Ver "LA TRAMPA" arriba: nunca usar 'firebase' a secas. */
export const FIREBASE_SDK_MARK = '@firebase/'

// `\b(?:import|export)` ancla en la palabra clave; `(?!\()` excluye el
// `import(` dinámico (con o sin backticks: `import(\`./W.js\`)`); el cuerpo
// `[^;()]*?` (perezoso, sin `;`/`(`/`)`) cubre la salida real minificada de
// Rolldown SIN espacio entre `}` y `from` (`import{a as b}from"./X.js"`, el
// caso real de la fachada de `firebase/app`), `export*from'./Y.js'`, y el
// import de solo efecto `import"./Z.js"`. Las cadenas sueltas de un array
// `__vite__mapDeps` (`["./V.js"]`) no van precedidas de `import`/`export`,
// así que nunca coinciden.
const STATIC_IMPORT_RE = /\b(?:import|export)(?!\()[^;()]*?["'`]\.\/([\w.-]+\.js)["'`]/g

/**
 * Nombres base, deduplicados, de los chunks hermanos importados
 * ESTÁTICAMENTE con especificador `./X.js` (formas `from"./X.js"`,
 * `import"./X.js"`, cualquier comilla, espacios opcionales u omitidos).
 * Excluye `import(` dinámico y las cadenas sueltas de un array
 * `__vite__mapDeps` — ninguna de las dos formas coincide con
 * STATIC_IMPORT_RE porque exige `import`/`export` justo antes de la cadena.
 */
export function staticChunkImports(source: string): string[] {
  const names = new Set<string>()
  for (const match of source.matchAll(STATIC_IMPORT_RE)) names.add(match[1]!)
  return [...names]
}

/**
 * Calcula, de forma pura, el conjunto de chunks a excluir del precacheo:
 * las semillas (contenido que incluye FIREBASE_SDK_MARK) más el cierre de
 * fachadas hasta punto fijo — un chunk no semilla entra si tiene al menos un
 * import estático y TODOS sus imports estáticos ya están en el conjunto.
 *
 * Sin semillas, el resultado es [] y no lanza.
 *
 * Tras el cierre se aplican dos guardas, ambas con throw en vez de degradar
 * a precachear todo (ver JSDoc de `excludeFirebaseSdkFromPrecache` para el
 * porqué):
 *   (i) GUARDA DE INTEGRIDAD — cualquier chunk NO excluido que importe
 *       estáticamente un chunk excluido dejaría ese chunk excluido varado
 *       sin red si de verdad se ejecutara: es la app importando el SDK de
 *       forma estática, contrario a SYNC-05 (solo `import()` dinámico desde
 *       useHistorySync.ts).
 *   (ii) GUARDA DE HTML — si se pasa `htmlFiles`, cualquier chunk excluido
 *        referenciado por un HTML de arranque significa que el SDK está en
 *        el arranque de esa ruta; excluirlo rompería esa ruta sin red.
 *
 * @param chunks clave = nombre relativo a `_nuxt/` (p. ej. `BcHXCJVE.js`), valor = contenido del fichero.
 * @param htmlFiles clave = ruta relativa del HTML, valor = contenido; opcional.
 */
export function computeFirebaseSdkExclusions(
  chunks: ReadonlyMap<string, string>,
  htmlFiles?: ReadonlyMap<string, string>,
): string[] {
  const excluded = new Set<string>()
  for (const [name, content] of chunks) {
    if (content.includes(FIREBASE_SDK_MARK)) excluded.add(name)
  }

  // Cierre de fachadas hasta punto fijo.
  let changed = true
  while (changed) {
    changed = false
    for (const [name, content] of chunks) {
      if (excluded.has(name)) continue
      const imports = staticChunkImports(content)
      if (imports.length === 0) continue
      if (imports.every(imported => excluded.has(imported))) {
        excluded.add(name)
        changed = true
      }
    }
  }

  // (i) GUARDA DE INTEGRIDAD: todo chunk NO excluido con un import estático
  // hacia un chunk excluido queda varado sin red si se ejecutara de verdad.
  for (const [name, content] of chunks) {
    if (excluded.has(name)) continue
    for (const imported of staticChunkImports(content)) {
      if (excluded.has(imported)) {
        throw new Error(
          `[pwa] WR-03: ${name} importa estáticamente ${imported}, que forma parte del SDK de Firebase excluido del precacheo — excluirlo dejaría ${name} roto sin red. SYNC-05 exige que Firebase solo se importe con import() dinámico desde useHistorySync.ts.`,
        )
      }
    }
  }

  // (ii) GUARDA DE HTML: si el SDK está referenciado desde el HTML de
  // arranque de alguna ruta, excluirlo rompería el arranque sin red de esa
  // ruta.
  if (htmlFiles) {
    for (const [htmlPath, html] of htmlFiles) {
      for (const excludedName of excluded) {
        if (html.includes(`_nuxt/${excludedName}`)) {
          throw new Error(
            `[pwa] WR-03: ${htmlPath} referencia _nuxt/${excludedName}, parte del SDK de Firebase excluido del precacheo — el SDK está en el arranque de esta ruta y excluirlo rompería su arranque sin red.`,
          )
        }
      }
    }
  }

  return [...excluded].sort()
}

interface WorkboxOptionsLike {
  workbox: {
    globDirectory?: string
    globIgnores?: string[]
  }
}

const NUXT_DIR_NAME = '_nuxt'

function collectHtmlFiles(rootDir: string): Map<string, string> {
  const result = new Map<string, string>()
  const stack: string[] = [rootDir]
  while (stack.length > 0) {
    const dir = stack.pop()!
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
      }
      else if (entry.isFile() && entry.name.endsWith('.html')) {
        result.set(relative(rootDir, fullPath), readFileSync(fullPath, 'utf-8'))
      }
    }
  }
  return result
}

/**
 * Hook `pwa:beforeBuildServiceWorker`: amplía `options.workbox.globIgnores`
 * con los chunks del grafo diferido del SDK de Firebase justo antes de que
 * Workbox genere `sw.js`, para que ningún visitante los descargue al
 * instalar la PWA (WR-03).
 *
 * Por qué lanza en vez de degradar a precachear todo si algo no cuadra: con
 * el throw, la cadena de hooks de @vite-pwa/nuxt (toda con `await`) aborta
 * `nuxt generate`. Vercel despliega en cada push a `main` con independencia
 * del CI (CLAUDE.md §Hosting), así que un fallo silencioso que solo un e2e
 * de CI detectara llegaría antes a la tablet de la mesa que la corrección.
 * Con el throw, el despliegue con el bug no llega a publicarse y sigue
 * sirviéndose el despliegue anterior, que funciona.
 *
 * Nunca `push` sobre `options.workbox.globIgnores`: es la MISMA referencia
 * de array que declara nuxt.config.ts, y este hook puede correr más de una
 * vez (p. ej. si @vite-pwa/nuxt reintenta la generación) — siempre se asigna
 * un array NUEVO, unión sin duplicados de lo ya presente más lo añadido
 * aquí, así que dos llamadas seguidas no duplican nada.
 */
export function excludeFirebaseSdkFromPrecache(options: WorkboxOptionsLike): void {
  const { globDirectory } = options.workbox
  if (!globDirectory) return

  const nuxtDir = join(globDirectory, NUXT_DIR_NAME)
  if (!existsSync(nuxtDir)) return

  const chunks = new Map<string, string>()
  for (const name of readdirSync(nuxtDir)) {
    if (!name.endsWith('.js')) continue
    chunks.set(name, readFileSync(join(nuxtDir, name), 'utf-8'))
  }

  const htmlFiles = collectHtmlFiles(globDirectory)
  const excludedNames = computeFirebaseSdkExclusions(chunks, htmlFiles)

  if (excludedNames.length === 0) return

  const existing = options.workbox.globIgnores ?? []
  const additions = excludedNames.map(name => `${NUXT_DIR_NAME}/${name}`)
  const merged = new Set([...existing, ...additions])
  options.workbox.globIgnores = [...merged]

  const totalBytes = excludedNames.reduce((sum, name) => sum + Buffer.byteLength(chunks.get(name)!, 'utf-8'), 0)
  // eslint-disable-next-line no-console
  console.info(`[pwa] WR-03: ${excludedNames.length} chunk(s) del SDK de Firebase excluidos del precacheo, ${totalBytes} bytes totales`)
}
