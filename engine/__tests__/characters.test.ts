// engine/__tests__/characters.test.ts
//
// Gate del catálogo real (CAT-04/CAT-05/CAT-07). Este fichero es SOLO
// LECTOR: nunca hace peticiones de red, nunca lanza procesos hijos, nunca
// escribe en disco. El script de generación (scripts/catalogue/fetch-marvelcdb.mjs)
// no corre en CI (D-06 heredado de la Fase 3.1) — este gate solo lee
// ficheros ya versionados (content/marvel-characters.json) y compara en
// memoria.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateCharacterCatalogue } from '../catalogueSchema'

const contentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))

// CR-02 (05-VERIFICATION.md): antes, la lectura del fichero, el JSON.parse y
// la validación con Zod se ejecutaban en ámbito de módulo (líneas 14-17 de
// la versión previa). El verificador reprodujo que, si esa llamada lanzaba
// —por ejemplo un catálogo con un id duplicado—, Vitest reportaba
// `Test Files 1 failed` pero `Tests no tests`: ninguno de los 20 tests
// `it.each(FORBIDDEN_KEYS)` llegaba siquiera a colectarse, y con ellos
// desaparecía la única barrera capaz de nombrar una fuga de clave con
// copyright. Mover la llamada al cuerpo de un `describe()` no lo arregla:
// el callback de `describe` también se evalúa en tiempo de colección y
// reproduce el mismo síntoma. El único sitio seguro es el cuerpo de un
// `it()`, que se ejecuta en tiempo de test y convierte un throw en el
// fallo de ESE test, con su propio nombre y mensaje — nunca en un error
// genérico de colección que se traga la suite entera.
//
// Por eso el guardarraíl anti-copyright de más abajo depende SÓLO de
// `readRawCatalogueText()`: un lector perezoso y memoizado que hace el
// `readFileSync` la primera vez que se le llama, dentro de un `it()`,
// nunca al evaluar este módulo ni al evaluar un `describe`. No pasa nunca
// por `JSON.parse` ni por el esquema — es una segunda barrera
// estructuralmente INDEPENDIENTE de z.strictObject, no un duplicado suyo:
// si el esquema se relajara algún día (o tuviera un bug), este gate seguiría
// pudiendo fallar por su cuenta, porque nunca mira el objeto ya validado.
let cachedRawText: string | undefined

function readRawCatalogueText(): string {
  if (cachedRawText === undefined) {
    cachedRawText = readFileSync(contentPath, 'utf-8')
  }
  return cachedRawText
}

// Cargador perezoso: parsea y valida en cada llamada (26 entradas, barato).
// No memoiza el resultado ni cachea el error — así cada test que necesite
// el catálogo validado reporta su propio fallo con su propio mensaje si el
// esquema no se cumple, en vez de compartir un estado ya roto de una
// llamada anterior.
function loadValidatedCatalogue() {
  return validateCharacterCatalogue(JSON.parse(readRawCatalogueText()))
}

// Las 20 claves de la blocklist son las claves reales devueltas por la API
// pública de MarvelCDB (05-RESEARCH.md §"Code Examples"), en su forma
// exacta de clave JSON (con comillas y dos puntos) para evitar falsos
// positivos por coincidencia parcial de subcadena.
const FORBIDDEN_KEYS = [
  '"text":',
  '"real_text":',
  '"flavor":',
  '"traits":',
  '"real_traits":',
  '"back_text":',
  '"back_flavor":',
  '"back_name":',
  '"imagesrc":',
  '"backimagesrc":',
  '"illustrator":',
  '"octgn_id":',
  '"url":',
  '"meta":',
  '"subname":',
  '"boost":',
  '"deck_requirements":',
  '"deck_options":',
  '"restrictions":',
  '"errata":',
]

// Función pura local compartida entre el gate real y el test de "el gate
// muerde" (mismo patrón que findStaleAudio en engine/__tests__/voice-drift.test.ts):
// una única implementación, ejercitada dos veces.
function findForbiddenKey(text: string, keys: string[]): string | undefined {
  return keys.find(key => text.includes(key))
}

describe('content/marvel-characters.json', () => {
  it('valida contra CharacterCatalogueSchema', () => {
    expect(() => loadValidatedCatalogue()).not.toThrow()
  })

  describe('CAT-04: guardarraíl anti-copyright sobre el string crudo', () => {
    it.each(FORBIDDEN_KEYS)('el fichero committeado no contiene la clave %s de la API de MarvelCDB', (key) => {
      const rawText = readRawCatalogueText()
      expect(rawText, `Se encontró la clave prohibida ${key} en content/marvel-characters.json`).not.toContain(key)
    })

    it('el gate muerde: detecta una clave prohibida en un string sintético que sí la contiene', () => {
      const synthetic = `{"id":"test-hero","name":"Test","flavor":"cita de sabor con copyright"}`
      expect(findForbiddenKey(synthetic, FORBIDDEN_KEYS)).toBe('"flavor":')
      expect(findForbiddenKey('{"id":"test-hero","name":"Test"}', FORBIDDEN_KEYS)).toBeUndefined()
    })
  })

  describe('invariantes de forma sobre héroes (sin enumerar ids a mano)', () => {
    it('heroes no está vacío', () => {
      const catalogue = loadValidatedCatalogue()
      expect(catalogue.heroes.length).toBeGreaterThan(0)
    })

    it('todo héroe tiene name y alterEgo no vacíos tras trim()', () => {
      const catalogue = loadValidatedCatalogue()
      for (const hero of catalogue.heroes) {
        expect(hero.name.trim().length, `hero ${hero.id} tiene name vacío`).toBeGreaterThan(0)
        expect(hero.alterEgo.trim().length, `hero ${hero.id} tiene alterEgo vacío`).toBeGreaterThan(0)
      }
    })

    it('todo héroe tiene health, handSizeHero y handSizeAlterEgo enteros mayores que 0', () => {
      const catalogue = loadValidatedCatalogue()
      for (const hero of catalogue.heroes) {
        expect(Number.isInteger(hero.health), `hero ${hero.id} health no es entero`).toBe(true)
        expect(hero.health, `hero ${hero.id} health no es positivo`).toBeGreaterThan(0)
        expect(Number.isInteger(hero.handSizeHero), `hero ${hero.id} handSizeHero no es entero`).toBe(true)
        expect(hero.handSizeHero, `hero ${hero.id} handSizeHero no es positivo`).toBeGreaterThan(0)
        expect(Number.isInteger(hero.handSizeAlterEgo), `hero ${hero.id} handSizeAlterEgo no es entero`).toBe(true)
        expect(hero.handSizeAlterEgo, `hero ${hero.id} handSizeAlterEgo no es positivo`).toBeGreaterThan(0)
      }
    })

    // CR-01: regresión del gap — ningún héroe del catálogo lleva la clave
    // legada handSize, ahora que el contrato guarda los dos tamaños de mano
    // por separado (handSizeHero / handSizeAlterEgo).
    it('ningún héroe lleva la clave legada handSize', () => {
      const catalogue = loadValidatedCatalogue()
      for (const hero of catalogue.heroes) {
        expect(Object.keys(hero), `hero ${hero.id} todavía lleva la clave legada handSize`).not.toContain('handSize')
      }
    })

    it('los id de héroe son únicos', () => {
      const catalogue = loadValidatedCatalogue()
      const ids = catalogue.heroes.map(h => h.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('invariantes de forma sobre villanos (sin enumerar ids a mano)', () => {
    it('villains no está vacío', () => {
      const catalogue = loadValidatedCatalogue()
      expect(catalogue.villains.length).toBeGreaterThan(0)
    })

    it('todo villano tiene al menos una etapa', () => {
      const catalogue = loadValidatedCatalogue()
      for (const villain of catalogue.villains) {
        expect(villain.stages.length, `villano ${villain.id} no tiene etapas`).toBeGreaterThan(0)
      }
    })

    it('las etapas de cada villano son consecutivas desde 1 y en orden', () => {
      const catalogue = loadValidatedCatalogue()
      for (const villain of catalogue.villains) {
        villain.stages.forEach((s, i) => {
          expect(s.stage, `villano ${villain.id} etapa en posición ${i} tiene stage ${s.stage}, se esperaba ${i + 1}`).toBe(i + 1)
        })
      }
    })

    it('toda etapa tiene health entero mayor que 0 y healthPerHero/healthPerGroup booleanos', () => {
      const catalogue = loadValidatedCatalogue()
      for (const villain of catalogue.villains) {
        for (const s of villain.stages) {
          expect(Number.isInteger(s.health), `villano ${villain.id} etapa ${s.stage} health no es entero`).toBe(true)
          expect(s.health, `villano ${villain.id} etapa ${s.stage} health no es positivo`).toBeGreaterThan(0)
          expect(typeof s.healthPerHero, `villano ${villain.id} etapa ${s.stage} healthPerHero no es booleano`).toBe('boolean')
          expect(typeof s.healthPerGroup, `villano ${villain.id} etapa ${s.stage} healthPerGroup no es booleano`).toBe('boolean')
        }
      }
    })

    it('los id de villano son únicos', () => {
      const catalogue = loadValidatedCatalogue()
      const ids = catalogue.villains.map(v => v.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  // D-11: ninguna etapa lleva una tabla precomputada por número de
  // jugadores. La multiplicación de health por playerCount es
  // responsabilidad de la Fase 7, nunca de este catálogo — si alguien
  // añadiera un campo extra (p. ej. `healthByPlayerCount`), este test debe
  // fallar.
  it('D-11: ninguna etapa de villano lleva claves distintas a stage/health/healthPerHero/healthPerGroup', () => {
    const catalogue = loadValidatedCatalogue()
    const expectedKeys = ['stage', 'health', 'healthPerHero', 'healthPerGroup'].sort()
    for (const villain of catalogue.villains) {
      for (const s of villain.stages) {
        expect(Object.keys(s).sort(), `villano ${villain.id} etapa ${s.stage} tiene claves inesperadas`).toEqual(expectedKeys)
      }
    }
  })

  // CAT-07: el catálogo es "una fila = un héroe/villano nuevo" en el
  // script generador. Este gate documenta, de forma comprobable, que
  // ningún test de esta suite fija un recuento literal de personajes:
  // comprar una caja nueva y regenerar el catálogo no debe obligar a tocar
  // ningún test. Las únicas aserciones sobre el tamaño de los arrays en
  // todo este fichero son estas dos comprobaciones de "no vacío" — jamás
  // una longitud fija de héroes ni de villanos.
  it('CAT-07: ningún test de este fichero fija un recuento de personajes, solo que las listas no estén vacías', () => {
    const catalogue = loadValidatedCatalogue()
    expect(catalogue.heroes.length).toBeGreaterThan(0)
    expect(catalogue.villains.length).toBeGreaterThan(0)
  })
})
