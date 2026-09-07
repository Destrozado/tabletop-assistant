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
const rawText = readFileSync(contentPath, 'utf-8')
const rawCatalogue: unknown = JSON.parse(rawText)
const catalogue = validateCharacterCatalogue(rawCatalogue)

// CR-01 (heredado de engine/__tests__/content.test.ts, comentario junto a
// findRawStep): un gate que afirma la AUSENCIA de una clave debe operar
// sobre el string CRUDO del fichero, nunca sobre el objeto ya validado por
// Zod. Con el esquema en modo estricto la clave desconocida ya lanzaría al
// parsear, pero si algún día se relajara el esquema (o hubiera un bug en
// él), un gate que mirase el objeto validado sería estructuralmente
// incapaz de fallar — la clave ya habría sido descartada antes de llegar
// a la aserción. Operar sobre `rawText` hace que este gate sea una
// segunda barrera INDEPENDIENTE de z.strictObject, no un duplicado suyo.
//
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
    expect(() => validateCharacterCatalogue(rawCatalogue)).not.toThrow()
  })

  describe('CAT-04: guardarraíl anti-copyright sobre el string crudo', () => {
    it.each(FORBIDDEN_KEYS)('el fichero committeado no contiene la clave %s de la API de MarvelCDB', (key) => {
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
      expect(catalogue.heroes.length).toBeGreaterThan(0)
    })

    it('todo héroe tiene name y alterEgo no vacíos tras trim()', () => {
      for (const hero of catalogue.heroes) {
        expect(hero.name.trim().length, `hero ${hero.id} tiene name vacío`).toBeGreaterThan(0)
        expect(hero.alterEgo.trim().length, `hero ${hero.id} tiene alterEgo vacío`).toBeGreaterThan(0)
      }
    })

    it('todo héroe tiene health y handSize enteros mayores que 0', () => {
      for (const hero of catalogue.heroes) {
        expect(Number.isInteger(hero.health), `hero ${hero.id} health no es entero`).toBe(true)
        expect(hero.health, `hero ${hero.id} health no es positivo`).toBeGreaterThan(0)
        expect(Number.isInteger(hero.handSize), `hero ${hero.id} handSize no es entero`).toBe(true)
        expect(hero.handSize, `hero ${hero.id} handSize no es positivo`).toBeGreaterThan(0)
      }
    })

    it('los id de héroe son únicos', () => {
      const ids = catalogue.heroes.map(h => h.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('invariantes de forma sobre villanos (sin enumerar ids a mano)', () => {
    it('villains no está vacío', () => {
      expect(catalogue.villains.length).toBeGreaterThan(0)
    })

    it('todo villano tiene al menos una etapa', () => {
      for (const villain of catalogue.villains) {
        expect(villain.stages.length, `villano ${villain.id} no tiene etapas`).toBeGreaterThan(0)
      }
    })

    it('las etapas de cada villano son consecutivas desde 1 y en orden', () => {
      for (const villain of catalogue.villains) {
        villain.stages.forEach((s, i) => {
          expect(s.stage, `villano ${villain.id} etapa en posición ${i} tiene stage ${s.stage}, se esperaba ${i + 1}`).toBe(i + 1)
        })
      }
    })

    it('toda etapa tiene health entero mayor que 0 y healthPerHero/healthPerGroup booleanos', () => {
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
    expect(catalogue.heroes.length).toBeGreaterThan(0)
    expect(catalogue.villains.length).toBeGreaterThan(0)
  })
})
