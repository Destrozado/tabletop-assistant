// e2e/firestore-rules-contract.spec.ts
//
// Fase 10 (D-09/D-16-local): gate de contrato entre la proyección pura del
// cliente (`engine/sync.ts`, `SYNC_PAYLOAD_FIELDS`) y la lista blanca que
// `firestore.rules` exige con `hasOnly()`. Las dos listas viven en ficheros
// distintos y nada del lenguaje las ata entre sí — sin este gate, el día que
// alguien añada un campo a la proyección sin añadirlo a las reglas, la
// escritura se rechazaría en producción sin que nadie se enterara (nada lee
// de la nube, D-07/D-11).
//
// Vive en `e2e/`, no en `engine/__tests__/` ni `app/composables/__tests__/`:
// es una comprobación de texto sobre ficheros del repo, no un test de
// comportamiento del motor ni de un composable — mismo patrón de lectura de
// artefactos reales con `node:fs` que `e2e/offline-flow.spec.ts` ya usa
// (10-RESEARCH.md §Pitfall 3, sobre por qué el gate de bundle también vive
// aquí y no en Vitest).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { SYNC_PAYLOAD_FIELDS } from '../engine/sync'

const RULES_PATH = join(process.cwd(), 'firestore.rules')

// D-12: el cliente añade estos dos FUERA de la proyección pura de
// engine/sync.ts (uid + createdAt de servidor) — así que la lista que las
// reglas deben aceptar es SYNC_PAYLOAD_FIELDS más estos dos, nunca
// SYNC_PAYLOAD_FIELDS a secas.
const EXPECTED_FIELDS = [...SYNC_PAYLOAD_FIELDS, 'uid', 'createdAt']

/**
 * Extrae la lista de claves entrecomilladas del primer `hasOnly([...])` que
 * aparezca en el texto de las reglas. Recorta entre `hasOnly([` y el `])`
 * que lo cierra y se queda con las cadenas entrecomilladas de dentro.
 */
function extractHasOnlyFields(rulesText: string): string[] {
  const start = rulesText.indexOf('hasOnly([')
  if (start === -1) return []
  const openBracket = start + 'hasOnly(['.length - 1
  const close = rulesText.indexOf('])', openBracket)
  if (close === -1) return []
  const inner = rulesText.slice(openBracket + 1, close)
  const matches = inner.match(/'([^']*)'/g) ?? []
  return matches.map(m => m.slice(1, -1))
}

test.describe('Contrato firestore.rules <-> engine/sync.ts (D-09)', () => {
  test('la lista de hasOnly() de las reglas es exactamente SYNC_PAYLOAD_FIELDS + uid + createdAt', () => {
    const rulesText = readFileSync(RULES_PATH, 'utf-8')
    const actualFields = extractHasOnlyFields(rulesText)

    // Si el recorte no encontró ninguna clave, el gate no puede haber
    // comprobado nada de verdad — fallar con un mensaje que diga que el
    // formato del fichero de reglas cambió, en vez de pasar en verde por
    // accidente.
    expect(
      actualFields.length,
      'No se encontró ninguna clave dentro de hasOnly([...]) en firestore.rules — el formato del fichero de reglas cambió y este gate ya no sabe leerlo. Revisar extractHasOnlyFields() en este spec.',
    ).toBeGreaterThan(0)

    const expectedSorted = [...EXPECTED_FIELDS].sort()
    const actualSorted = [...actualFields].sort()

    const missing = expectedSorted.filter(field => !actualSorted.includes(field))
    const extra = actualSorted.filter(field => !expectedSorted.includes(field))

    expect(
      missing,
      `Faltan en firestore.rules los campos: ${missing.join(', ') || '(ninguno)'} — presentes en SYNC_PAYLOAD_FIELDS + uid/createdAt pero no en hasOnly()`,
    ).toEqual([])
    expect(
      extra,
      `Sobran en firestore.rules los campos: ${extra.join(', ') || '(ninguno)'} — presentes en hasOnly() pero no en SYNC_PAYLOAD_FIELDS + uid/createdAt`,
    ).toEqual([])
  })

  test('las reglas deniegan explícitamente read/update/delete', () => {
    const rulesText = readFileSync(RULES_PATH, 'utf-8')
    expect(
      rulesText,
      'firestore.rules ya no contiene la denegación explícita "allow read, update, delete: if false" (D-11)',
    ).toContain('allow read, update, delete: if false')
  })
})
