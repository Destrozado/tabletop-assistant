// e2e/bundle-budget.spec.ts
//
// 10-04-PLAN.md Task 1 — D-16/SYNC-05: gate PERMANENTE que falla la build si
// el SDK de Firebase entra en el arranque de `/` o de `/marvel-champions`, o
// si el peso de ese arranque crece por encima de un techo medido. Vive en
// `e2e/`, nunca en Vitest (10-RESEARCH.md §Pitfall 3): `.output/public` solo
// existe dentro del `webServer` de Playwright (`npm run generate && npx
// nuxi preview`, playwright.config.ts) — `npm run test` no lo genera y un
// test bajo `engine/__tests__/`/`app/composables/__tests__/` fallaría
// siempre por "fichero no encontrado", nunca por detectar el SDK de verdad.
//
// LA TRAMPA (por qué la marca de búsqueda NO puede ser 'firebase' a secas):
// un `import()` dinámico deja en el chunk que lo contiene el ESPECIFICADOR
// del módulo diferido como cadena literal. Medido en este mismo repo
// (`npm run generate`, 2026-09-23, fase 10 completa — planes 10-01 a
// 10-03): el chunk que agrupa `app/composables/useHistorySync.ts` SÍ
// contiene la subcadena `firebase` (los tres `import('firebase/...')` de
// `syncPending`) aunque el SDK real nunca se ejecute en el arranque. Buscar
// `firebase` a secas encontraría esa referencia diferida — que es
// EXACTAMENTE lo que SYNC-05 exige que exista — y la confundiría con el SDK
// cargado de verdad, dando un gate que se dispara por lo correcto y calla
// ante lo incorrecto. La marca que sí distingue una cosa de la otra es
// `@firebase/` — el ÁMBITO (scope) interno de los paquetes reales del SDK
// (`@firebase/app`, `@firebase/firestore`, `@firebase/auth`, etc.), que solo
// aparece dentro del código real del SDK, nunca en un especificador de
// `import()` ni en un nombre de chunk.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const PUBLIC_DIR = join(process.cwd(), '.output/public')
const NUXT_DIR = join(PUBLIC_DIR, '_nuxt')

// Confirmado por lectura real del HTML generado en esta sesión: cada ruta
// prerenderizada tiene su propio `index.html` bajo `.output/public/<ruta>/`
// (la raíz vive en `.output/public/index.html`).
const ENTRY_HTML_FILES = [
  join(PUBLIC_DIR, 'index.html'),
  join(PUBLIC_DIR, 'marvel-champions/index.html'),
]

// Las referencias a chunks siguen el patrón `_nuxt/<hash>.<js|css>` tanto en
// `<script>` como en `<link>` — confirmado por lectura directa del HTML real.
const CHUNK_REF = /_nuxt\/[\w.-]+\.(?:js|css)/g

// Marca del SDK real — ver "LA TRAMPA" en la cabecera del fichero. NUNCA
// 'firebase' a secas.
const FIREBASE_SDK_MARK = '@firebase/'

// Presupuesto de bytes — MEDIDO contra un `npm run generate` real de este
// repo el 2026-09-23, con la Fase 10 ya completa (planes 10-01/10-03,
// incluidos guardas, listener `online` y poda perezosa): 12 chunks `.js`
// referenciados por `/` y `/marvel-champions`, 308 668 bytes sin comprimir
// en total (dato exacto en 10-04-SUMMARY.md). El techo se fija en 340 KiB
// (348 160 bytes) — ~13 % de margen sobre lo medido, para el crecimiento
// normal del proyecto (contenido nuevo, pantallas nuevas), NUNCA para que
// quepa el SDK de Firebase: de los tres chunks reales del SDK medidos en
// este mismo build, el más pequeño pesa ya 31 999 bytes por sí solo y el
// mayor 555 902 — cualquiera de los dos agotaría el margen de sobra si
// acabara entrando en el arranque. Quien suba esta cifra en el futuro DEBE
// volver a medir con `npm run generate` sobre su propio build y anotar aquí
// cuándo y sobre qué build lo hizo — subir el número sin medir de nuevo es
// exactamente "el gate ajustado a la realidad que mide", el fallo contra el
// que D-16 existe (10-04-PLAN.md §scope_boundary).
const MAX_INITIAL_JS_BYTES = 340 * 1024

test.describe('Presupuesto del bundle inicial (D-16, SYNC-05)', () => {
  test('ni "/" ni "/marvel-champions" cargan el SDK real de Firebase en su arranque, y el peso no crece sin control', () => {
    // (1) El descubrimiento encontró algo. Si el patrón de nombrado de la
    // salida de build cambiara (otra convención de Vite/Nitro), este
    // conjunto estaría vacío y las aserciones de abajo pasarían en verde sin
    // haber comprobado nada de verdad — fallar aquí es la señal correcta en
    // vez de un verde silencioso.
    const referencedChunks = new Set<string>()
    for (const htmlPath of ENTRY_HTML_FILES) {
      const html = readFileSync(htmlPath, 'utf-8')
      for (const match of html.matchAll(CHUNK_REF)) referencedChunks.add(match[0])
    }
    expect(
      referencedChunks.size,
      'No se encontró ningún chunk _nuxt/* en el HTML de "/" ni de "/marvel-champions" — el patrón de nombrado de la salida de build cambió y este gate ya no sabe leerlo (revisar CHUNK_REF en este fichero).',
    ).toBeGreaterThan(0)

    // (2) Ningún chunk inicial contiene la marca del SDK real, y (3) el
    // techo de bytes sobre la suma de esos mismos `.js` — se miden en el
    // mismo recorrido porque ambas aserciones necesitan leer cada chunk una
    // vez.
    let totalInitialJsBytes = 0
    for (const chunk of referencedChunks) {
      if (!chunk.endsWith('.js')) continue // el CSS no puede contener un import() de Firebase
      const contents = readFileSync(join(PUBLIC_DIR, chunk), 'utf-8')
      totalInitialJsBytes += Buffer.byteLength(contents, 'utf-8')
      expect(
        contents.includes(FIREBASE_SDK_MARK),
        `${chunk} (referenciado por "/" o "/marvel-champions") contiene la marca "${FIREBASE_SDK_MARK}" del SDK real de Firebase — el SDK entró en el arranque.`,
      ).toBe(false)
    }
    expect(
      totalInitialJsBytes,
      `el JS inicial de "/" y "/marvel-champions" pesa ${totalInitialJsBytes} bytes, por encima del presupuesto de ${MAX_INITIAL_JS_BYTES} bytes (ver el comentario de MAX_INITIAL_JS_BYTES en este fichero).`,
    ).toBeLessThanOrEqual(MAX_INITIAL_JS_BYTES)

    // (4) El chunk del SDK es diferido DE VERDAD. Si ningún chunk de
    // `_nuxt/` contuviera la marca del SDK, el `import()` dinámico de
    // `useHistorySync.ts` no habría llegado a la salida de build y este gate
    // estaría protegiendo un código que no existe — eso también debe
    // fallar, no pasar en silencio. Y si alguno de esos chunks SÍ apareciera
    // referenciado por los dos HTML de entrada, no sería un chunk diferido
    // de verdad, sería el mismo fallo que la aserción (2) ya busca, visto
    // desde el otro lado.
    const allChunkFiles = readdirSync(NUXT_DIR).filter(name => name.endsWith('.js'))
    const sdkChunks = allChunkFiles.filter((name) => {
      const contents = readFileSync(join(NUXT_DIR, name), 'utf-8')
      return contents.includes(FIREBASE_SDK_MARK)
    })
    expect(
      sdkChunks.length,
      'Ningún chunk de _nuxt/ contiene la marca del SDK real de Firebase — el import() dinámico de useHistorySync.ts no llegó a la salida de build; este gate no puede proteger un código que no está.',
    ).toBeGreaterThan(0)

    for (const sdkChunk of sdkChunks) {
      expect(
        referencedChunks.has(`_nuxt/${sdkChunk}`),
        `${sdkChunk} contiene la marca del SDK real de Firebase Y está referenciado por "/" o "/marvel-champions" — no es un chunk diferido de verdad, es el SDK cargado en el arranque.`,
      ).toBe(false)
    }
  })
})
