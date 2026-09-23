# Phase 5: Catálogo de héroes y villanos - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 7 (1 dato, 1 script, 2 esquema/test-esquema, 2 tests de contenido, 1 config)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `content/marvel-characters.json` | config (dato estático versionado) | batch (escritura determinista por script) | `content/marvel-champions.json` (dato, no leído por esta tarea pero mismo escalón — ver nota) / `content/games-index.ts` | role-match |
| `scripts/catalogue/fetch-marvelcdb.mjs` | utility (script CLI de generación, dev-only) | batch + request-response (fetch HTTP) | `scripts/voice/generate.mjs` | exact |
| `engine/catalogueSchema.ts` | model (esquema Zod) | transform (validación) | `engine/schema.ts` | exact |
| `engine/schema.ts` (cabecera, MODIFICADO) | model | transform | `engine/schema.ts` (mismo fichero, edición de comentario) | exact |
| `engine/__tests__/catalogueSchema.test.ts` | test | transform | `engine/__tests__/schema.test.ts` | exact |
| `engine/__tests__/characters.test.ts` | test | CRUD (lee fichero real + guardarraíl) | `engine/__tests__/content.test.ts` | exact |
| `package.json` (script `catalogue:generate`, MODIFICADO) | config | — | `package.json` (entradas `voice:generate`/`voice:probe`) | exact |

**Nota sobre el analog de `content/marvel-characters.json`:** esta fase NO importa ni lee `content/marvel-champions.json` en tiempo de ejecución (scope fence), pero es el precedente estructural correcto para "un fichero JSON por juego, committeado, en `content/`, escrito por un proceso reproducible". El precedente de *forma de escritura* (determinismo, `JSON.stringify(x, null, 2)` + `\n` final) viene de `scripts/voice/manifest.json`/`saveManifest()` en `scripts/voice/generate.mjs`, no de `marvel-champions.json` en sí (que se edita a mano, no se genera).

## Pattern Assignments

### `scripts/catalogue/fetch-marvelcdb.mjs` (utility, batch/request-response)

**Analog:** `scripts/voice/generate.mjs` (314 líneas, leído completo)

**Cabecera / contrato de documentación** (líneas 1-17):
```javascript
#!/usr/bin/env node
// scripts/voice/generate.mjs
//
// Qué es: CLI invocado A MANO por el desarrollador para generar los audios de
// locución (Gemini TTS -> PCM -> WAV -> AAC/M4A) de las 35 frases `speech` de
// content/marvel-champions.json.
//
// D-06: este script NUNCA se invoca desde `build`, `generate`, ni desde CI, ni
// desde Vercel. Meter una llamada de red a la API de Gemini (y la necesidad de
// la clave) en el build de despliegue rompería "sin backend". Requiere macOS
// (usa `afconvert`, nativo) y la variable de entorno de la clave de la API en
// un fichero `.env` no versionado.
//
// Este fichero es el ÚNICO escritor de scripts/voice/manifest.json (Pitfall 3
// de 03.1-RESEARCH.md): si alguien edita el manifiesto o los `.m4a` a mano sin
// pasar por aquí, el gate de deriva de CI (plan 03.1-03) puede quedar en un
// estado inconsistente. No lo hagas.
```
**Aplicar al nuevo script:** cabecera igual de larga, adaptando el "nunca se invoca desde build/generate/CI/Vercel" (D-06 heredado tal cual, según CONTEXT.md), y declarando que es el ÚNICO escritor de `content/marvel-characters.json` (nadie edita ese JSON a mano — D-09). **No requiere macOS** ni `afconvert` — omitir por completo el bloque 2 del análogo (líneas 50-57).

**Imports pattern** (líneas 19-26) — adaptar quitando lo audio-específico:
```javascript
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fingerprint } from './fingerprint.mjs'
import { ACTIVE_STYLE, PROBE_PHRASE, STYLES } from './styles.mjs'
import { wrapPcmAsWav } from './wav.mjs'
```
El nuevo script solo necesita `readFileSync`/`writeFileSync` de `node:fs` (sin `execFileSync`, sin módulos hermanos de audio) — es más simple que el análogo, no lo iguales en complejidad.

**Constantes declaradas arriba** (líneas 59-72) — mismo patrón para declarar la lista literal (D-04) en vez de un contrato de packs:
```javascript
const MODEL = 'gemini-2.5-flash-preview-tts'
const VOICE = 'Rasalgethi' // D-01: voz elegida por el usuario ("Informativa")
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const AUDIO_DIR = 'public/audio'
const MANIFEST_PATH = 'scripts/voice/manifest.json'
const CONTENT_PATH = 'content/marvel-champions.json'
const ID_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9-]+)*$/
const RETRY_BACKOFFS_MS = [5000, 15000, 45000] // ante 429/5xx: 5s, 15s, 45s
```
Traducir a: `CATALOGUE_PATH = 'content/marvel-characters.json'`, `API_BASE = 'https://marvelcdb.com/api/public'`, y las dos listas literales `HERO_CARDS`/`VILLAIN_STAGE_CARDS` de RESEARCH.md Pattern 1 en el lugar de este bloque. **NO copiar `RETRY_BACKOFFS_MS`** — RESEARCH.md Pitfall C es explícito: MarvelCDB no tiene 429/cuota, y reintentar un 500 (código inexistente) retrasaría el abort de D-05 en vez de ayudarlo. El fetch del nuevo script debe fallar en el primer intento sin retry.

**Fetch con manejo de error — patrón de estructura, sin el retry** (líneas 140-181, `synthesize()`):
```javascript
async function synthesize(text) {
  let attempt = 0
  for (;;) {
    const response = await fetch(ENDPOINT, { method: 'POST', headers: {...}, body: JSON.stringify({...}) })
    if (response.ok) {
      const json = await response.json()
      const base64 = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      if (!base64) {
        throw new Error('Respuesta de Gemini sin audio (candidates[0].content.parts[0].inlineData.data ausente)')
      }
      return Buffer.from(base64, 'base64')
    }
    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt >= RETRY_BACKOFFS_MS.length) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`Gemini respondió HTTP ${response.status}. Cuerpo (primeros 200 caracteres): ${bodyText.slice(0, 200)}`)
    }
    // ...reintento...
  }
}
```
**Adaptar a (sin el bucle de reintento):**
```javascript
async function fetchCard(code) {
  const response = await fetch(`${API_BASE}/card/${code}.json`)
  if (!response.ok) {
    // D-05/D-06: MarvelCDB devuelve HTTP 500 (no 404) para un código
    // inexistente — !response.ok ya lo captura. Sin retry (Pitfall C):
    // aquí un 500 es información ("código inválido"), no ruido transitorio.
    const bodyText = await response.text().catch(() => '')
    throw new Error(`Código ${code}: MarvelCDB respondió HTTP ${response.status}. Cuerpo: ${bodyText.slice(0, 200)}`)
  }
  return response.json()
}
```

**Abortar sin escribir nada ante el primer fallo (D-05/D-06)** — mismo patrón de `catch` que corta con `process.exit(1)` sin dejar estado a medias (líneas 299-303 de `runBatch`):
```javascript
catch (error) {
  console.error(`Fallo generando ${entry.id}: ${error.message}`)
  console.error(`Completados ${completed} de ${targets.length}. Para continuar: npm run voice:generate`)
  process.exit(1)
}
```
**Diferencia deliberada respecto al análogo:** el análogo es *incremental/reanudable* (escribe el manifiesto tras cada clip, D-11 de esa fase). El script de catálogo es **todo o nada** (D-05/D-09 de esta fase): resolver los 32 códigos completos en memoria primero, y solo al final —si los 32 tuvieron éxito— llamar a `writeFileSync` una vez. Ningún escritura parcial de `content/marvel-characters.json` debe ocurrir nunca. No copiar el patrón "escribe tras cada entrada" de `saveManifest()` dentro del bucle.

**Escritura determinista de fichero de salida (D-10)** — patrón de formato, sin `generatedAt`:
```javascript
function saveManifest(manifest) {
  const sortedEntries = {}
  for (const key of Object.keys(manifest.entries).sort()) {
    sortedEntries[key] = manifest.entries[key]
  }
  const toWrite = { ...manifest, entries: sortedEntries }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(toWrite, null, 2)}\n`)
}
```
El nuevo `writeCatalogue()` reutiliza `JSON.stringify(catalogue, null, 2)` + `\n` final (RESEARCH.md Pattern 4 ya da el cuerpo exacto), pero **sin `sortedEntries` por clave** — el orden debe ser el orden literal declarado en `HERO_CARDS`/`VILLAIN_STAGE_CARDS` (D-04), no alfabético, y **sin ningún campo de fecha** (D-10 descarta explícitamente el patrón `generatedAt` de este mismo análogo).

**No copiar:** el modo `--probe` (líneas 200-222), el manejo de argumentos CLI (`--force`, `--delay=`, líneas 74-80) — nada de esto tiene equivalente en D-01..D-11 de esta fase; el script de catálogo no tiene modos ni flags, se invoca sin argumentos.

---

### `engine/catalogueSchema.ts` (model, transform)

**Analog:** `engine/schema.ts` (215 líneas, leído completo)

**Cabecera — patrón de la afirmación "único fichero que importa zod", que YA NO será cierta** (líneas 1-4):
```typescript
// engine/schema.ts
// Único fichero del repo (fuera de node_modules) que importa `zod`. `zod` es
// devDependency y no debe cruzar nunca a `app/` — este esquema corre solo en
// Node/CI (Vitest), nunca en el navegador (T-01-19).
```
**Acción obligatoria en el mismo cambio (Pitfall A de RESEARCH.md):** reescribir esta cabecera para que ya no afirme unicidad, por ejemplo: `// engine/schema.ts y engine/catalogueSchema.ts son los dos únicos ficheros del repo que importan \`zod\`...` — mantener el resto de la frase (devDependency, nunca a `app/`, T-01-19) intacto. `engine/catalogueSchema.ts` debe llevar una cabecera equivalente que se remita a esta.

**Patrón `z.strictObject` en todo (CR-01)** — aplicar literalmente, es el guardarraíl anti-copyright de CAT-04:
```typescript
const CitationSchema = z.strictObject({
  source: z.enum(['rules-reference', 'learn-to-play']),
  section: z.string().min(1),
  page: z.number().int().positive().optional(),
})
```
Cada objeto del nuevo esquema (`HeroSchema`, `VillainStageSchema`, `VillainSchema`, `CharacterCatalogueSchema`) debe declararse con `z.strictObject`, nunca `z.object` — una clave desconocida (p. ej. `text`, `flavor`, `imagesrc` si algún día alguien las cuela) debe lanzar, no descartarse en silencio. Esto es la misma disciplina, mismo motivo (CR-01) que ya está documentado en el análogo.

**Patrón de id con regex** (línea 10, reutilizable para el `id` slug de héroe/villano — Pitfall B):
```typescript
const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/
```
El nuevo esquema puede reutilizar el mismo patrón kebab-case para el campo `id` de cada héroe/villano (slug determinista, D-B de RESEARCH.md), sin el segmento con puntos (`.`) que no aplica aquí — o bien, más simple, `^[a-z0-9]+(-[a-z0-9]+)*$`.

**Patrón `superRefine` para invariantes cruzadas** (líneas 107-117, ejemplo de una invariante concreta):
```typescript
}).superRefine((game, ctx) => {
  const repeating = game.sections.filter(s => s.repeats)
  if (repeating.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Exactly one section must have repeats:true, found ${repeating.length}`,
    })
  }
  ...
```
Si el nuevo esquema necesita invariantes propias (p. ej. "cada villano declara exactamente 3 stages, en orden 1,2,3" — ver Open Question 1 de RESEARCH.md, aceptado como matiz no bloqueante), este es el patrón: `.superRefine((catalogue, ctx) => { ...ctx.addIssue({ code: z.ZodIssueCode.custom, message: '...' }) })`.

**Función exportada de validación** (líneas 213-215):
```typescript
export function validateGameDefinition(json: unknown): GameDefinition {
  return GameDefinitionSchema.parse(json) as unknown as GameDefinition
}
```
Espejo directo para `engine/catalogueSchema.ts`: `export function validateCharacterCatalogue(json: unknown): CharacterCatalogue { return CharacterCatalogueSchema.parse(json) as unknown as CharacterCatalogue }`.

---

### `engine/__tests__/catalogueSchema.test.ts` (test, transform)

**Analog:** `engine/__tests__/schema.test.ts` (331 líneas; leídas cabecera + bloque "claves desconocidas rechazadas")

**Imports + helper de fixture mínima** (líneas 1-46):
```typescript
import { describe, expect, it } from 'vitest'
import { GameDefinitionSchema } from '../schema'

function baseGame() {
  return { gameId: 'test-game', title: 'Test Game', locale: 'es' as const, contentVersion: 1, sections: [ /* ... */ ] }
}

describe('GameDefinitionSchema', () => {
  it('acepta un juego mínimo válido', () => {
    expect(() => GameDefinitionSchema.parse(baseGame())).not.toThrow()
  })
```
Espejo: `import { CharacterCatalogueSchema } from '../catalogueSchema'`, una función `baseCatalogue()` que devuelve un objeto sintético mínimo válido (un héroe, un villano de 3 etapas), y el mismo primer test "acepta un catálogo mínimo válido".

**Patrón de tests negativos "claves desconocidas rechazadas" (CR-01)** — el test más directamente reutilizable para CAT-04 (líneas 130-145):
```typescript
describe('claves desconocidas rechazadas (CR-01)', () => {
  function step(game: ReturnType<typeof baseGame>) {
    return game.sections[0].phases[0].steps[0] as any
  }

  it('lanza ZodError con una clave desconocida en la raíz del juego (GameDefinitionSchema)', () => {
    const game = { ...baseGame(), totallyUnknown: 1 }
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })

  it('lanza ZodError con una clave desconocida en una sección (SectionSchema)', () => {
    const game = baseGame()
    ;(game.sections[0] as any).unknownKey = true
    expect(() => GameDefinitionSchema.parse(game)).toThrow()
  })
```
Replicar exactamente esta forma para `CharacterCatalogueSchema`: un test por cada objeto anidado (`HeroSchema`, `VillainSchema`, `VillainStageSchema`) que añade una clave sintética `unknownKey`/`text`/`flavor` y espera `.toThrow()`. Esto es el equivalente unitario, en memoria, del guardarraíl CAT-04 — complementario, no sustituto, del test de `characters.test.ts` que grep-ea el fichero real.

**Patrón de tests negativos de rango/tipo** (líneas 52-56, 71-80):
```typescript
it('lanza ZodError con un paso sin id', () => {
  ...
  expect(() => GameDefinitionSchema.parse(game)).toThrow()
})
it('lanza ZodError con un text de 120 caracteres', () => {
  ...
  expect(() => GameDefinitionSchema.parse(game)).toThrow()
})
```
Mismo patrón para `health`/`healthPerHero`/`healthPerGroup`/`handSize` fuera de rango o de tipo incorrecto, y para `stage` fuera de `{1,2,3}` si se decide un enum entero.

---

### `engine/__tests__/characters.test.ts` (test, CRUD + guardarraíl)

**Analog:** `engine/__tests__/content.test.ts` (598 líneas; leídas cabecera + lista completa de `it(...)`)

**Imports + carga del fichero real** (líneas 1-11):
```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateGameDefinition } from '../schema'
import { expand } from '../expand'
import { resolveText } from '../resolve'
import type { GameDefinition, RuntimeStepNode } from '../types'

const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions = validateGameDefinition(rawMarvelChampions)
```
Espejo exacto para el catálogo (sin `expand`/`resolveText`, que no aplican — no hay pasos ni dificultad aquí):
```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateCharacterCatalogue } from '../catalogueSchema'

const contentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const rawCatalogue: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
```

**Patrón "leer el crudo, no el validado, para afirmar AUSENCIA de una clave" (líneas 39-45)** — directamente aplicable al guardarraíl CAT-04:
```typescript
// CR-01 (revisión 02): un gate que afirma la AUSENCIA de un campo debe leer el
// JSON CRUDO, no el validado. Con el esquema en modo strip, Zod borraba la clave
// desconocida antes de que la aserción la mirase, así que era estructuralmente
// incapaz de fallar. El esquema ya es estricto (engine/schema.ts) y lanzaría,
// pero la aserción sigue leyendo el crudo a propósito: es el objeto que
// useGameContent.ts importa y que de verdad llega a la tablet.
function findRawStep(id: string) {
  return findStep(rawMarvelChampions as GameDefinition, id)
}
```
El test de guardarraíl anti-copyright de CAT-04 (ver RESEARCH.md "Code Examples") debe operar igual: sobre el **string crudo del fichero** (`readFileSync(contentPath, 'utf-8')`), nunca sobre el objeto ya validado por Zod, exactamente por el mismo motivo documentado aquí — de lo contrario el test sería estructuralmente incapaz de fallar.

**Primer test, patrón "valida contra el esquema"** (líneas 56-59):
```typescript
describe('content/marvel-champions.json', () => {
  it('valida contra GameDefinitionSchema', () => {
    expect(() => validateGameDefinition(rawMarvelChampions)).not.toThrow()
  })
```
Espejo: `describe('content/marvel-characters.json', () => { it('valida contra CharacterCatalogueSchema', () => { expect(() => validateCharacterCatalogue(rawCatalogue)).not.toThrow() }) })`.

**Patrón de test de recuento por recorrido genérico, no hardcodeado (D-05 descarta fijar 23+3 en el test, así que NO copiar literalmente este patrón para el recuento total — sí para la forma del recorrido)** (líneas 66-71):
```typescript
it('el contenido aplanado produce exactamente 32 nodos: 31 kind step y 1 kind summary', () => {
  ...
})
```
**No replicar un test equivalente que fije "23 héroes y 3 villanos"** — D-05/D-09 de esta fase lo descartan explícitamente (endurecería de más, contradice CAT-07 "una fila = un héroe"). En su lugar, los tests de `characters.test.ts` deben comprobar invariantes de **forma** (todo héroe tiene `name`/`alterEgo`/`health`/`handSize` no vacíos; todo villano tiene exactamente sus `stages` con `health` positivo), nunca un recuento literal de filas.

**Patrón de test de guardarraíl textual sobre el crudo** — construir siguiendo el ejemplo ya dado en RESEARCH.md "Code Examples" (más abajo, en Shared Patterns), que a su vez sigue la forma de `findRawStep` de este análogo.

---

### `package.json` (config)

**Analog:** entradas `voice:generate`/`voice:probe` ya existentes (líneas 12-13):
```json
"voice:generate": "node scripts/voice/generate.mjs",
"voice:probe": "node scripts/voice/generate.mjs --probe",
```
**Añadir:** `"catalogue:generate": "node scripts/catalogue/fetch-marvelcdb.mjs"` en el mismo bloque `scripts`, siguiendo la convención `<dominio>:<verbo>` ya establecida (`voice:generate`, `icons:generate`).

---

## Shared Patterns

### "Fail loudly, nunca escritura parcial" (D-05/D-06/D-09)
**Source:** `scripts/voice/generate.mjs` líneas 299-303 (patrón de `catch` + `process.exit(1)`) combinado con la disciplina de `engine/schema.ts` línea 12-24 (CR-01: `z.strictObject`, "fail loudly at build").
**Apply to:** `scripts/catalogue/fetch-marvelcdb.mjs` (abortar sin escribir el JSON ante cualquier código de carta fallido o `expectedName` inesperado) y a `engine/catalogueSchema.ts`/tests (esquema estricto + tests de guardarraíl que hacen fallar CI ante contenido malformado).
**Diferencia clave respecto al análogo de script:** el análogo escribe *incrementalmente* (reanudable, D-11 de la Fase 03.1); este script escribe *todo o nada* (D-05/D-09 de esta fase) — no mezclar los dos patrones.

### Determinismo de escritura de JSON (D-10)
**Source:** `scripts/voice/generate.mjs` líneas 130-137 (`saveManifest`, patrón de `JSON.stringify(x, null, 2)` + `\n` final), adaptado eliminando `generatedAt` y el ordenamiento alfabético (aquí el orden es el declarado en las listas literales, no alfabético).
**Apply to:** `scripts/catalogue/fetch-marvelcdb.mjs` → `writeCatalogue()`.

### `z.strictObject` en todo (CR-01, guardarraíl CAT-04)
**Source:** `engine/schema.ts` líneas 12-24 (comentario CR-01 completo) + cualquier declaración `z.strictObject({...})` del fichero (p. ej. líneas 25-29, 31-65, 80-85).
**Apply to:** `engine/catalogueSchema.ts` — cada objeto anidado del esquema del catálogo.

### Cabecera de "único fichero que importa zod" — actualización obligatoria en el mismo cambio
**Source:** `engine/schema.ts` líneas 1-4.
**Apply to:** editar ese comentario en el mismo cambio que crea `engine/catalogueSchema.ts` (Pitfall A de RESEARCH.md) — no es opcional ni un fichero aparte; es una edición de una línea en `engine/schema.ts` que debe entrar en el mismo plan/commit que introduce el segundo esquema.

### Leer el JSON crudo para afirmar ausencia de clave (nunca el objeto ya validado por Zod)
**Source:** `engine/__tests__/content.test.ts` líneas 39-45 (comentario + función `findRawStep`).
**Apply to:** `engine/__tests__/characters.test.ts` — el test de guardarraíl anti-copyright de CAT-04 (blocklist de `text`, `flavor`, `imagesrc`, etc.) debe operar sobre el string crudo (`readFileSync(...)`), exactamente como aquí, para que sea estructuralmente capaz de fallar.

### Test de guardarraíl anti-copyright (propuesto por RESEARCH.md, mismo espíritu que el bloque "claves desconocidas rechazadas" de `schema.test.ts`)
**Source:** RESEARCH.md §"Code Examples" (extracto ya dado, redundante-pero-independiente del `z.strictObject`):
```typescript
// engine/__tests__/characters.test.ts — extracto
const FORBIDDEN_KEYS = ['"text":', '"real_text":', '"flavor":', '"traits":', '"imagesrc":', '"illustrator":', '"back_text":', '"octgn_id":']

it('CAT-04: el catálogo committeado no contiene ninguna clave de la API de MarvelCDB con texto/arte con copyright', () => {
  const raw = readFileSync('content/marvel-characters.json', 'utf-8')
  for (const key of FORBIDDEN_KEYS) {
    expect(raw).not.toContain(key)
  }
})
```
**Apply to:** `engine/__tests__/characters.test.ts`, como segunda barrera independiente de `z.strictObject` (si el esquema tuviera un bug, este test grep-based sigue protegiendo).

### Convención de scripts npm `<dominio>:<verbo>`
**Source:** `package.json` líneas 12-14 (`voice:generate`, `voice:probe`, `icons:generate`).
**Apply to:** nueva entrada `catalogue:generate`.

## No Analog Found

Ninguno — los 7 ficheros de esta fase tienen un analog exacto o de rol equivalente ya identificado arriba. El único matiz es que `content/marvel-characters.json` en sí (el dato) no tiene un "generador" análogo que produzca JSON puro sin timestamp dentro del repo — el patrón de escritura determinista se compone combinando `saveManifest()` (formato de escritura) menos su campo `generatedAt` (D-10 lo prohíbe explícitamente), no un único análogo 1:1.

## Metadata

**Analog search scope:** `scripts/voice/`, `engine/`, `engine/__tests__/`, `app/composables/`, `content/`, `package.json` — exactamente los ficheros nombrados en CONTEXT.md §Existing Code Insights. No se buscó más allá de ese conjunto (ya cubre 3-5+ analogs fuertes por fichero nuevo, y CONTEXT.md ya identificó los candidatos correctos con precisión).
**Files scanned:** 7 (todos leídos íntegros salvo `content.test.ts` y `schema.test.ts`, de los que se leyeron cabecera + índice de `it(...)` + bloques concretos citados arriba, sin releer rangos).
**Pattern extraction date:** 2026-09-07
