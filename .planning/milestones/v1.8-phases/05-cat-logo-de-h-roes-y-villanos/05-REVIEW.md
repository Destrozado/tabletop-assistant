---
phase: 05-cat-logo-de-h-roes-y-villanos
reviewed: 2026-09-07T23:30:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - content/marvel-characters.json
  - engine/__tests__/catalogue-isolation.test.ts
  - engine/__tests__/catalogueSchema.test.ts
  - engine/__tests__/characters.test.ts
  - engine/catalogueSchema.ts
  - engine/schema.ts
  - engine/types.ts
  - scripts/catalogue/fetch-marvelcdb.mjs
findings:
  critical: 1
  warning: 15
  info: 13
  total: 29
status: issues_found
---

# Fase 5: Informe de revisión de código

**Revisado:** 2026-09-07T23:30:00Z
**Profundidad:** standard
**Ficheros revisados:** 8
**Estado:** issues_found

> Este informe **sustituye** al de la oleada anterior y cubre la fase en su estado
> final, incluida la oleada 6 (sub-objeto `expert` opcional en la etapa de villano).
> El CR-01 del informe anterior ("el catálogo no puede representar la salud de
> villano del modo Experto") **está resuelto**: `expert` existe en el contrato, en el
> esquema, en el generador y en los datos, con tests propios. Varios WR/IN del
> informe anterior **siguen sin resolver** y se vuelven a reportar aquí con su
> estado actual.

## Summary

Lo que se comprobó y salió bien, para no volver a discutirlo:

- **Los 80 tests de los tres ficheros de test en scope pasan** (`npx vitest run engine/__tests__/{characters,catalogue-isolation,catalogueSchema}.test.ts` → 80/80).
- **`content/marvel-characters.json` es reproducible byte a byte** con la salida del
  generador: `JSON.stringify(obj, null, 2) + '\n'` reproduce el fichero committeado
  carácter a carácter, sin CRLF y con salto final (D-10 verificado, no asumido).
- **Forma del contrato correcta**: 23 héroes con exactamente el mismo juego de 6
  claves (`id|name|alterEgo|health|handSizeHero|handSizeAlterEgo`), 3 villanos, etapas
  1..3 consecutivas, `expert` solo en Kang. Sin fugas de claves de copyright.
- **`z.strictObject` en los cinco niveles funciona**, incluido dentro de `expert`
  (probado con fixtures propias). Se verificó además que Zod 4.4.3 **omite** el
  `superRefine` cuando el parseo base ya falló, así que `catalogue.heroes.map(...)`
  no puede reventar con un `TypeError` sobre datos malformados: sale `ZodError` en
  los seis casos degenerados probados (`{}`, `heroes` no-array, `stages` no-array,
  `stage: 'I'`, `null`, `[]`).
- **`handSizeHero`/`handSizeAlterEgo` es la lectura correcta del reglamento**:
  verificado contra el RR v1.7 local (`HAND SIZE`, p.21, y anatomía de carta, Apéndice
  III) — el chequeo es de la cara activa, así que guardar los dos valores es lo
  acertado, e `Iron Man handSizeHero: 1` es el valor impreso real y no un dato roto.
- Sin secretos, sin `eval`, sin `exec`/shell, sin deserialización insegura, sin
  escritura de rutas construidas con entrada externa.

Lo que no está bien:

El defecto de mayor impacto **no es de forma, es de fidelidad de reglas**. La oleada 6
registró correctamente que Rhino y Ultron no tienen set de villano de modo Experto,
pero justificó esa ausencia apuntando a un paso de contenido que ordena sustituir esas
cartas **incondicionalmente**. Con el catálogo en la mano, el propio repo demuestra que
en 2 de los 3 villanos enviados la app manda al grupo a buscar cartas que no existen
(CR-01). Alrededor de eso, la nueva dimensión `expert` llega **sin ninguna puerta de
integridad de punta a punta**: se puede declarar como carta "Experta" una carta del set
estándar y el generador la escribe en silencio (WR-02), y el esquema admite que un
villano tenga `expert` en unas etapas y no en otras — un estado imposible en el
dominio que además un test bendice explícitamente (WR-01).

Debajo de eso hay un problema transversal que debilita todo lo demás: **nada
typechequea este repo**. `typescript` no está instalado ni como devDependency, no hay
script `typecheck` y `ci.yml` no lo ejecuta; combinado con el `as unknown as
CharacterCatalogue` de `validateCharacterCatalogue`, el contrato de `engine/types.ts`
—que es el entregable central del plan 05-01— es prosa sin ninguna herramienta que lo
verifique (WR-03). Y varias de las "puertas" de la fase son más débiles de lo que su
propio nombre y sus comentarios afirman: el gate anti-copyright presume compartir
implementación con su test de mordida y no la comparte (WR-04), el gate CAT-06 no
detecta una URL real (WR-06), y el gate D-06 pasa en vacío y no cubre los hooks de
ciclo de vida que npm ejecuta solo (WR-07).

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: la app ordena sustituir las cartas de villano de modo Experto en escenarios que no tienen ninguna, y el catálogo lo demuestra

**Ficheros:**
- `engine/types.ts:126-141` (justificación del contrato)
- `scripts/catalogue/fetch-marvelcdb.mjs:120-137` (misma justificación)
- `content/marvel-characters.json:191-276` (rhino y ultron, sin `expert`)
- consumidor afectado: `content/marvel-champions.json:210-213` (fuera del scope de esta revisión)

**Issue:**
La oleada 6 justifica la ausencia de `expert` así (types.ts:138-141):

> «Quien consuma este catálogo en la Fase 6/7 debe leer `expert` cuando la sesión está
> en `difficulty: 'expert'` y hay `expert` disponible, porque
> `content/marvel-champions.json` (paso `setup.escenario.04`, variante `expert`) ya
> instruye al grupo sustituir esas cartas físicas en la mesa.»

Ese paso, verificado en el repo, dice literalmente y **sin condición alguna**:

```
"expert": {
  "text": "Sustituid las cartas de villano numeradas por las del modo Experto de este escenario."
}
```

El catálogo que esta fase acaba de generar afirma lo contrario para 2 de los 3
villanos enviados: Rhino y Ultron **no tienen** set de villano Experto (y el test
`'Rhino y Ultron: ninguna etapa lleva la clave expert'` lo fija como invariante).
El reglamento oficial respalda el catálogo, no el paso: RR v1.7, *Modes of Play*,
p.28 —

> «To play a standard game modified by expert mode, follow the content and setup
> instructions for the chosen scenario, **using the listed expert mode villain
> stages**, and add the Expert encounter set to encounter deck.»

«**the listed**» es condicional: solo se sustituyen si el escenario las lista. Para
Rhino y Ultron el modo Experto es solo «añadid el conjunto de encuentro Experto»
(que el contenido ya cubre bien en `content/marvel-champions.json:119`). Resultado hoy,
en mesa: una partida de Rhino o Ultron en dificultad Experta hace que la app —en texto
grande y en voz alta— mande al grupo a sustituir cartas inexistentes. Eso es
exactamente lo que CLAUDE.md §Constraints declara peor que no tener asistente, y la
fase que lo detectó lo dejó registrado como coherente en lugar de reconciliarlo.

Nada, además, conecta las dos fuentes: ningún test compara la presencia de `expert` en
el catálogo con lo que narra el paso `setup.escenario.04`, así que este desajuste no
puede fallar en CI.

**Fix:**
Dos piezas, y la primera es la urgente:

1. Reformular la variante `expert` del paso para que sea verdadera en todos los
   escenarios (fichero fuera de scope, pero es donde vive el síntoma):

```json
"expert": {
  "text": "Si el escenario trae cartas de villano de modo Experto, sustituid las numeradas por ellas.",
  "speech": "Si el escenario trae cartas de villano de modo Experto, sustituid las numeradas por ellas."
}
```

2. Corregir la justificación de `engine/types.ts:138-141` y de
   `scripts/catalogue/fetch-marvelcdb.mjs:120-137` para que cite el RR («using the
   listed expert mode villain stages», p.28) en vez de un paso de contenido que dice
   más de lo que el reglamento permite, y añadir en `engine/__tests__/characters.test.ts`
   el gate cruzado que hoy no existe: si ningún villano del catálogo tiene `expert`,
   ningún paso puede narrar la sustitución como obligatoria. Por ejemplo:

```ts
it('CR-01: la variante expert de setup.escenario.04 no ordena sustituir sin condición', () => {
  const game = JSON.parse(readFileSync(gamePath, 'utf-8'))
  const step = findStep(game, 'setup.escenario.04')
  const text = step.variants.difficulty.expert.text
  const catalogue = loadValidatedCatalogue()
  const someVillainHasNoExpert = catalogue.villains.some(v => v.stages.every(s => !s.expert))
  if (someVillainHasNoExpert) {
    expect(text, 'hay villanos sin set Experto: el paso debe condicionar la sustitución').toMatch(/^Si /)
  }
})
```

## Warnings

### WR-01: `expert` opcional **por etapa** admite un estado imposible en el dominio, y un test lo bendice

**Ficheros:** `engine/catalogueSchema.ts:56`, `engine/types.ts:134-136`, `engine/__tests__/catalogueSchema.test.ts:187-193`

**Issue:** El set de villano Experto de un escenario sustituye **todas** las cartas de
etapa numeradas de ese escenario, no unas sí y otras no. El esquema lo modela como
`expert: ExpertVillainStageSchema.optional()` dentro de la etapa, de forma que
`stages: [{...expert}, {...sin expert}, {...expert}]` valida sin problema — y el test
`'no lanza con un villano mixto: etapa 1 con expert, etapa 2 sin él'` lo declara
comportamiento deseado. La justificación citada (types.ts:134-136: «las banderas
difieren por etapa dentro del mismo villano») confunde dos cosas distintas: que los
*valores* varíen por etapa (cierto: Kang I true / II false / III true) no implica que
la *presencia del set* pueda variar por etapa (falso).

Consecuencia concreta y silenciosa: si en una regeneración futura una fila de Kang
pierde su `expertCode` (borrado accidental, conflicto de merge, fila nueva copiada mal),
el catálogo sale con `expert` en las etapas 1 y 3 y sin él en la 2; el esquema lo acepta,
el test `'invariante de forma general'` lo acepta, y la Fase 7 narraría 15 / **18** / 25
en una partida Experta — la etapa II con la cifra estándar. Hoy solo lo tapa un test
específico de Kang con cifras a mano; cualquier villano futuro no tiene esa red.

**Fix:** añadir la invariante por villano en el `superRefine` de
`engine/catalogueSchema.ts` (todo o nada), y cambiar el test que la contradice por su
negativo:

```ts
for (const villain of catalogue.villains) {
  const withExpert = villain.stages.filter(s => s.expert !== undefined).length
  if (withExpert !== 0 && withExpert !== villain.stages.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Villain "${villain.name}" has expert data on ${withExpert} of ${villain.stages.length} stages: an expert villain set replaces every numbered stage or none`,
    })
  }
}
```

Y en el generador, la puerta equivalente en `main()`: si una fila de un villano declara
`expertCode`, todas las filas de ese villano deben declararlo.

### WR-02: nada exige que la carta "Experta" pertenezca de verdad a un set Experto

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:275-309`

**Issue:** Las puertas de la dimensión Experta comprueban (a) que `expertCode` y
`expectedExpertSetCode` se declaren juntos y (b) que `expertCode !== code`. Falta la
tercera, que es la que importa: **nada comprueba que `expectedExpertSetCode` sea
distinto de `expectedSetCode`**. Con una fila así:

```js
{ villainName: 'Kang', code: '11002', stage: 2, expectedSetCode: 'kang',
  expertCode: '11003', expectedExpertSetCode: 'kang' }
```

el script descarga 11003 (Iron Lad, set **estándar** `kang`, 18/false/false), pasa
`extractStageFields` sin una sola queja (el `card_set_code` coincide con el declarado)
y escribe `expert: { health: 18, ... }` — cifras estándar disfrazadas de Experto,
indistinguibles a ojo en el diff y aceptadas por el esquema y por todos los tests de
forma. La única barrera actual es el test de Kang con cifras a mano, que no cubriría a
ningún villano nuevo.

**Fix:** añadir la puerta en `extractVillainStage`, junto a las otras dos, y una
comprobación numérica de cordura:

```js
if (expertCode !== undefined && expectedExpertSetCode === expectedSetCode) {
  throw new Error(`Fila ${villainName} etapa ${stage}: expectedExpertSetCode ("${expectedExpertSetCode}") no puede ser el mismo set que expectedSetCode — el set de villano Experto es un card_set_code distinto`)
}
// ...tras extraer las dos caras:
if (expertFields.health === standardFields.health
  && expertFields.healthPerHero === standardFields.healthPerHero
  && expertFields.healthPerGroup === standardFields.healthPerGroup) {
  throw new Error(`Fila ${villainName} etapa ${stage}: la carta Experto ${expertCode} tiene cifras idénticas a la estándar ${code} — revisa si el código declarado es el correcto`)
}
```

### WR-03: nada typechequea este repo, así que el contrato de `engine/types.ts` no lo verifica ninguna herramienta

**Ficheros:** `engine/catalogueSchema.ts:135-137`, `engine/types.ts:112-193`, `package.json`, `.github/workflows/ci.yml`

**Issue:** Comprobado, no supuesto:

- `node_modules/typescript` **no existe**: `typescript` no es dependencia ni
  devDependency del proyecto.
- `package.json` no tiene ningún script `typecheck` / `vue-tsc` / `nuxi typecheck`.
- `.github/workflows/ci.yml` ejecuta `npm run test` (Vitest, que **transpila** TS sin
  comprobar tipos) y Playwright. Nada más.

Encima de eso, `validateCharacterCatalogue` hace `CharacterCatalogueSchema.parse(json)
as unknown as CharacterCatalogue`: el doble cast a través de `unknown` **desactiva por
completo** la única comprobación estructural que podría haber existido entre el esquema
Zod y la interfaz escrita a mano. El plan 05-01 entrega precisamente ese contrato
duplicado a propósito (para que `app/` no arrastre zod, T-01-19/DC-03), pero sin
typecheck ni asignación comprobada, la duplicación no tiene ninguna red: el `expert`
de la oleada 6 se añadió a los dos ficheros por disciplina humana, y si se hubiera
añadido solo a uno, ningún test ni CI lo habría dicho.

**Fix:** (a) añadir la afirmación de tipo, que es gratis y vive donde zod ya está
permitido —`engine/catalogueSchema.ts`, nunca en `app/`—:

```ts
import type { z as _z } from 'zod'
// Falla la compilación si el esquema y la interfaz derivan en cualquier dirección.
type SchemaShape = _z.infer<typeof CharacterCatalogueSchema>
const _schemaMatchesContract: SchemaShape = {} as CharacterCatalogue
const _contractMatchesSchema: CharacterCatalogue = {} as SchemaShape
void _schemaMatchesContract
void _contractMatchesSchema
```

y (b) hacer que eso signifique algo: `npm i -D typescript vue-tsc`, script
`"typecheck": "nuxt typecheck"` y un paso `- run: npm run typecheck` en `ci.yml` antes
de `npm run test`. Sin (b), (a) es decorativo.

### WR-04: el test "el gate muerde" no ejercita el gate real, y el comentario que dice que sí es falso

**Fichero:** `engine/__tests__/characters.test.ts:83-105`

**Issue:** El comentario afirma:

> «Función pura local compartida entre el gate real y el test de "el gate muerde" […]:
> una única implementación, ejercitada dos veces.»

No es cierto. El gate real (líneas 96-99) usa `expect(rawText).not.toContain(key)`; el
test de mordida (101-105) usa `findForbiddenKey(...)`. Son dos implementaciones
distintas, y `findForbiddenKey` **no se usa en ningún otro sitio del repo** (verificado
por grep): es código muerto cuyo único consumidor es el test que lo prueba. Por eso el
test de mordida no demuestra nada sobre el gate que protege el catálogo: si mañana el
gate real se relajara (p. ej. a `expect(rawText.toLowerCase()).not.toContain(key.slice(1))`
o a un bucle que no recorre toda la lista), el test de mordida seguiría verde.

**Fix:** que el gate real llame a la misma función, para que la afirmación del
comentario sea verdad:

```ts
it.each(FORBIDDEN_KEYS)('el fichero committeado no contiene la clave %s de la API de MarvelCDB', (key) => {
  expect(
    findForbiddenKey(readRawCatalogueText(), [key]),
    `Se encontró la clave prohibida ${key} en content/marvel-characters.json`,
  ).toBeUndefined()
})
```

### WR-05: `STAGE_MAP` solo conoce I/II/III y eso desmiente la promesa CAT-07 que el esquema y dos tests celebran

**Ficheros:** `scripts/catalogue/fetch-marvelcdb.mjs:73`, `engine/catalogueSchema.ts:120-123`, `engine/__tests__/catalogueSchema.test.ts:152-173`

**Issue:** El esquema documenta y prueba que un villano con otro número de etapas «sea
una fila más en el script, no una edición de este esquema» (comentario DC-01, más los
dos tests positivos de 2 y 4 etapas). Pero el generador traduce el numeral romano con
`const STAGE_MAP = { I: 1, II: 2, III: 3 }`: un villano con etapa IV hace que
`STAGE_MAP[card.stage]` sea `undefined` y el script aborte. Es decir, «añadir un villano
de 4 etapas» **sí** exige editar el script, en un sitio (una constante arriba del
fichero) que el procedimiento documentado de CAT-07 no menciona en ninguno de sus 4
pasos. El fallo es ruidoso, no silencioso —eso está bien— pero la promesa que la fase
firma es falsa y el mensaje de error no dirige al desarrollador a la constante.

**Fix:** convertir la traducción en algo genérico y quitar el tope implícito:

```js
const ROMAN = { I: 1, V: 5, X: 10 }
function romanToInt(roman) {
  if (typeof roman !== 'string' || !/^[IVX]+$/.test(roman)) return undefined
  let total = 0
  for (let i = 0; i < roman.length; i++) {
    const v = ROMAN[roman[i]]
    const next = ROMAN[roman[i + 1]]
    total += next && next > v ? -v : v
  }
  return total
}
```

Si se prefiere mantener el mapa explícito, entonces corregir el paso 1 del
procedimiento CAT-07 y el comentario DC-01 del esquema para decir la verdad: «un
villano con más de tres etapas exige además ampliar `STAGE_MAP`».

### WR-06: el gate CAT-06 es a la vez demasiado amplio y ciego a una URL real

**Fichero:** `engine/__tests__/catalogue-isolation.test.ts:133-141`

**Issue:** El gate «el catálogo committeado no contiene ninguna referencia remota» son
tres `not.toContain` sobre el texto crudo: `'http'`, `'marvelcdb'`, `'api'`. Los tres
problemas:

1. **No detecta una referencia remota real.** `"icon": "//cdn.example.com/kang.png"`,
   `"src": "cards.fantasyflight.net/x.jpg"` o cualquier cosa con `HTTP` en mayúsculas
   pasan los tres filtros y el gate sigue verde. El gate no comprueba lo que su nombre
   promete.
2. **Es sensible a mayúsculas**, así que `HTTPS://…` o `MarvelCDB` lo esquivan.
3. **`'api'` es una subcadena de tres letras** contrastada contra un fichero lleno de
   nombres propios en inglés generados desde una API de terceros; el día que un nombre
   legítimo de héroe, alter ego o villano la contenga, el gate romperá CI por un motivo
   que no tiene nada que ver con referencias remotas, y el arreglo natural (borrar el
   assert) se llevará por delante la poca protección que había.

**Fix:** contrastar formas de URL, en minúsculas, y quitar la subcadena suelta:

```ts
const REMOTE_PATTERNS = [/https?:\/\//i, /:\/\//, /\/\/[a-z0-9-]+\.[a-z]{2,}/i, /marvelcdb/i, /\bwww\./i]
it('CAT-06: el catálogo committeado no contiene ninguna referencia remota', () => {
  const text = readCatalogueContentText()
  for (const pattern of REMOTE_PATTERNS) {
    expect(pattern.test(text), `el catálogo contiene una referencia remota (${pattern})`).toBe(false)
  }
})
```

### WR-07: el gate D-06 pasa en vacío y no cubre los hooks que npm ejecuta por su cuenta

**Fichero:** `engine/__tests__/catalogue-isolation.test.ts:89-102`

**Issue:** Dos agujeros en la misma puerta:

1. **Pasa por ausencia.** `const value = packageJson.scripts?.[entryName] ?? ''` — si
   alguien renombra o borra `build`, el test de `build` sigue verde contrastando la
   cadena vacía. Un gate que pasa cuando desaparece lo que vigila no es un gate.
2. **La lista de entradas vigiladas es incompleta por construcción.**
   `guardedEntries = ['build', 'generate', 'preview', 'dev', 'postinstall', 'test']` no
   incluye los hooks de ciclo de vida que **npm ejecuta automáticamente**: `prepare`
   (en cada `npm ci` / `npm install`), `prebuild`, `pregenerate`, `pretest`,
   `predev`, `prepublish`, `postbuild`… Una entrada `"prebuild": "npm run
   catalogue:generate"` metería una llamada de red a marvelcdb.com en **todos** los
   `npm run build` (incluido el de Vercel) y este gate no la vería. Exactamente el
   escenario que D-06 existe para impedir.

**Fix:** invertir el gate — barrer todos los scripts salvo el propio punto de entrada,
y exigir que las entradas críticas existan:

```ts
it('D-06: ninguna entrada npm salvo catalogue:generate referencia el script de catálogo', () => {
  const scripts = loadPackageJson().scripts ?? {}
  for (const [name, value] of Object.entries(scripts)) {
    if (name === 'catalogue:generate') continue
    expect(referencesCatalogueScript(value), `scripts["${name}"] referencia el script de catálogo: "${value}"`).toBe(false)
  }
  // El gate no puede pasar por ausencia de lo que vigila:
  for (const required of ['build', 'generate', 'test', 'postinstall']) {
    expect(scripts[required], `scripts["${required}"] ha desaparecido: el gate D-06 estaría vigilando el vacío`).toBeDefined()
  }
})
```

### WR-08: la duplicación de `slugify` no tiene ningún test que la enfrente, y `slug(name)` no es único sobre los nombres de MarvelCDB

**Ficheros:** `engine/catalogueSchema.ts:24-33`, `engine/catalogueSchema.ts:99-118`, `scripts/catalogue/fetch-marvelcdb.mjs:157-166`

**Issue:** Dos problemas encadenados en la invariante DC-02.

1. La afirmación «si las dos derivan, este esquema hace fallar CI»
   (catalogueSchema.ts:24-27) solo es cierta si **alguien vuelve a ejecutar el
   generador**. CI nunca ejecuta el script (D-06, correcto), el script no exporta nada
   (no tiene `export`, así que ningún test puede importar su `slugify`), y el JSON
   committeado no cambia por sí solo. Si la copia del script deriva, el repo queda en
   verde indefinidamente y el error aparece meses después, dentro de un diff de
   regeneración que el desarrollador leerá como «vaya, cambiaron ids».
2. **`slug(name)` no es inyectivo sobre el catálogo de MarvelCDB.** El `id` se deriva
   exclusivamente de `name`, y MarvelCDB tiene más de un héroe con el mismo `name` —el
   caso claro es Spider-Man: el de Peter Parker (`01001a`, ya en el catálogo) y el de
   Miles Morales, ambos con `name: "Spider-Man"`. Añadir el segundo produce dos
   `id: "spider-man"`, el `superRefine` de ids duplicados aborta CI, y **no hay ningún
   mecanismo de escape** (ni un `idOverride` por fila ni un desempate por alter ego).
   O sea: la promesa CAT-07 «una fila más y listo» se rompe con un héroe perfectamente
   normal, y la salida sería editar a mano el JSON, que es justo lo que D-09 prohíbe.

**Fix:** (a) mover `slugify` a un módulo compartido sin dependencias que ambos lados
importen —p. ej. `scripts/catalogue/slugify.mjs`, importado por el script y por
`engine/catalogueSchema.ts`— o, si la duplicación se quiere mantener, exportarla desde
el `.mjs` y añadir un test que compare las dos implementaciones sobre una tabla de
casos (`'Ms. Marvel'`, `'SP//dr'`, `'X-23'`, `'Spider-Man'`, `'  '`). (b) añadir a la
fila un `id` explícito opcional, con el esquema exigiendo `id === (row.id ?? slug(name))`
y el generador propagándolo:

```js
{ code: '24001a', expectedName: 'Spider-Man', id: 'spider-man-miles-morales' },
```

### WR-09: el `gameId` del catálogo no se contrasta con nada, y usa un patrón de id distinto al del resto del motor

**Ficheros:** `engine/catalogueSchema.ts:22`, `engine/catalogueSchema.ts:77`, `engine/__tests__/characters.test.ts`

**Issue:** `gameId: z.string().regex(characterIdPattern)` valida solo la *forma*.
Ningún test compara `content/marvel-characters.json` → `gameId` con
`content/marvel-champions.json` → `gameId` ni con los `id` de `content/games-index.ts`
(verificado por grep: `gameId` no aparece en ningún test junto a los dos ficheros).
Un `"gameId": "marvel-champion"` (una letra menos) pasa el esquema, pasa los 31 tests
de `characters.test.ts` y solo se manifestará en la Fase 6 como «no hay héroes para
este juego», sin ningún mensaje que apunte al typo.

Además, el mismo campo lógico se valida con dos expresiones distintas en el repo:
`idPattern` en `engine/schema.ts:11` (admite segmentos con punto) y
`characterIdPattern` en `engine/catalogueSchema.ts:22` (no los admite). Un `gameId`
legal para una definición de juego puede ser ilegal para su catálogo.

**Fix:** un test cruzado en `engine/__tests__/characters.test.ts`, que además es la red
que la Fase 6 necesita antes de importar el fichero:

```ts
it('el gameId del catálogo coincide con la definición de juego y con el índice', () => {
  const catalogue = loadValidatedCatalogue()
  const game = JSON.parse(readFileSync(gamePath, 'utf-8'))
  expect(catalogue.gameId).toBe(game.gameId)
  expect(games.map(g => g.id)).toContain(catalogue.gameId)
})
```

### WR-10: 24 tests negativos prometen en su nombre un `ZodError` por una clave concreta y solo comprueban «lanza algo»

**Fichero:** `engine/__tests__/catalogueSchema.test.ts:36-255`

**Issue:** Todos los negativos son `expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()`
sin matcher. `toThrow()` acepta *cualquier* excepción, así que un test titulado
`'lanza ZodError con una clave "flavor" en un héroe'` pasa igual si el esquema rechaza
el catálogo por un motivo completamente distinto (o si el propio fixture está roto y
lanza un `TypeError`). En la práctica esto ya ocurrió y quedó documentado en
`05-05-SUMMARY.md:157`: la mutación de copyright hizo que el error reportado fuese
`unrecognized_keys` y **enmascarara** el de id duplicado. Con `toThrow()` a secas, esa
clase de enmascaramiento es invisible: los 24 negativos pueden estar pasando todos por
el mismo motivo equivocado.

**Fix:** afirmar el motivo, al menos en los negativos que sostienen CAT-04 y DC-01/DC-02:

```ts
function expectIssue(catalogue: unknown, code: string, pathIncludes?: string) {
  const result = CharacterCatalogueSchema.safeParse(catalogue)
  expect(result.success).toBe(false)
  const issues = result.error!.issues
  expect(issues.some(i => i.code === code && (!pathIncludes || i.path.includes(pathIncludes))), JSON.stringify(issues)).toBe(true)
}

it('lanza ZodError con una clave "flavor" en un héroe', () => {
  const catalogue = baseCatalogue()
  ;(catalogue.heroes[0] as any).flavor = 'Texto de sabor con copyright.'
  expectIssue(catalogue, 'unrecognized_keys', 'heroes')
})
```

### WR-11: la etapa II de Kang no es «una de cuatro alternativas narrativas», y el catálogo no puede expresar lo que sí es

**Ficheros:** `scripts/catalogue/fetch-marvelcdb.mjs:143-149`, `engine/types.ts:180-182`, `content/marvel-characters.json:229-239`

**Issue:** El comentario que justifica declarar solo `11002` dice:

> «Etapa II de Kang tiene cuatro alternativas narrativas con cifras idénticas […] Se
> declara 11002 como representante; cuál de las cuatro da igual a efectos numéricos.»

La premisa «cuál de las cuatro da igual» sostiene una conclusión numérica correcta
(las cuatro son 18/false/false) sobre una descripción del escenario que no lo es: en
*The Once and Future Kang* la etapa II no elige una de las cuatro, **reparte una a cada
jugador**, que la enfrenta por separado. Eso explica por qué esa etapa es la única con
`healthPerHero: false` de todo el catálogo —no es asimetría caprichosa de MarvelCDB,
es que hay un Kang II por jugador con 18 PS cada uno— y significa que la Fase 7, leyendo
`{ stage: 2, health: 18, healthPerHero: false }`, narrará «el villano tiene 18 puntos de
salud» mientras en la mesa hay N villanos de 18. El catálogo no tiene ninguna clave que
distinga «una carta de villano por jugador» de «una carta compartida», y ningún
comentario avisa al consumidor futuro.

*Confianza: media-alta sobre la estructura del escenario (no verificable contra el RR
v1.7, que es anterior a TOAFK); la conclusión de que el comentario induce a error en la
Fase 7 no depende de ese detalle.*

**Fix:** verificar la estructura de la etapa II contra las instrucciones del escenario
antes de que la Fase 6/7 consuma el dato y, según el resultado, o corregir el
comentario para que no afirme «da igual cuál» sino «las cuatro comparten cifras, pero
la etapa II reparte una por jugador — la Fase 7 debe tratarla como N villanos», o añadir
al contrato la bandera que hoy falta (p. ej. `perPlayerCard: true` en la etapa) para que
la interfaz no tenga que adivinarlo.

### WR-12: `CATALOGUE_PATH` es relativo al cwd, contra el patrón `import.meta.url` que usa el resto del repo

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:71`, `scripts/catalogue/fetch-marvelcdb.mjs:314-319`

**Issue:** `const CATALOGUE_PATH = 'content/marvel-characters.json'` se resuelve contra
el directorio de trabajo. Los tres tests de esta fase resuelven sus rutas con
`fileURLToPath(new URL('../../content/...', import.meta.url))` — el script es el único
sitio que no lo hace. Ejecutado como `node scripts/catalogue/fetch-marvelcdb.mjs` desde
cualquier subdirectorio (algo que el propio encabezado del script documenta como su
forma de invocación, líneas 54-60), o desde un editor con otro cwd, el resultado tras
~53 s de descargas es un `ENOENT` (si no hay `content/` en el cwd) o —peor— un
`content/marvel-characters.json` escrito **en otro sitio**, con el del repo intacto y
en verde en CI: datos viejos que nadie sabe que son viejos, exactamente el fallo que
D-09 quiere evitar.

**Fix:**

```js
import { fileURLToPath } from 'node:url'
const CATALOGUE_PATH = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
```

### WR-13: `fetch` sin timeout, y el manejador de errores tira el stack y el contexto

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:172-190`, `scripts/catalogue/fetch-marvelcdb.mjs:352-356`

**Issue:** Tres cosas que se agravan entre sí:

1. `await fetch(...)` no lleva `AbortSignal.timeout(...)`. El propio comentario de
   `fetchCard` cuenta que durante la verificación las peticiones «empezaron a agotar el
   tiempo de conexión» — es decir, el modo de fallo observado es precisamente el que no
   está acotado. Con 35 peticiones secuenciales, una conexión colgada deja el CLI
   parado indefinidamente, sin salida y sin error: lo contrario de D-05 «fallar alto».
2. Si la respuesta es `ok` pero el cuerpo no es JSON (página de error HTML con 200,
   proxy cautivo de una wifi de hotel), `await response.json()` lanza un `SyntaxError`
   **sin el código de carta**: el único mensaje que el desarrollador verá es
   `Unexpected token '<'…`, sin saber cuál de los 35 códigos falló.
3. `main().catch(error => console.error(error.message))` descarta el stack y asume que
   lo lanzado es un `Error` (si no lo fuera, imprime `undefined` y sale con 1).

**Fix:**

```js
async function fetchCard(code) {
  const response = await fetch(`${API_BASE}/card/${encodeURIComponent(code)}.json`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) { /* ...igual que ahora... */ }
  let json
  try { json = await response.json() }
  catch (cause) { throw new Error(`Código ${code}: la respuesta no es JSON válido (${cause.message})`, { cause }) }
  await sleep(REQUEST_DELAY_MS)
  return json
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error))
  console.error('No se ha escrito nada en content/marvel-characters.json (D-05).')
  process.exit(1)
})
```

### WR-14: `summaryLabel` admite la cadena vacía y eso borra la fase de la lista de repaso sin que nada falle *(sin resolver del informe anterior)*

**Fichero:** `engine/schema.ts:84`

**Issue:** `summaryLabel: z.string().optional()` es el único rótulo del esquema sin
`.min(1)` (comparar con `title: z.string().min(1)` en las tres líneas contiguas: 82, 90,
97). `"summaryLabel": ""` valida, y el consumidor de la lista de repaso recibirá una
etiqueta vacía en lugar de nada — una fila en blanco en pantalla, indistinguible de un
fallo de renderizado, y sin ningún gate que lo detecte en CI. Es el mismo razonamiento
de "interfaz inalcanzable" que el esquema aplica con rigor a `warningDetail`,
`optionsWarning` y `optionsWarningDetail`.

**Fix:** `summaryLabel: z.string().min(1).optional(),`

### WR-15: la puerta de etiquetas duplicadas de `options` no se aplica a las variantes de dificultad *(sin resolver del informe anterior)*

**Fichero:** `engine/schema.ts:163-173` (bloque de `step.options` en el `superRefine`), `engine/schema.ts:186`

**Issue:** El `superRefine` comprueba las etiquetas duplicadas solo en
`step.options` (líneas 165-172, el bloque base). Las variantes de dificultad, que
**pueden sustituir la lista entera** (`const effectiveOptions = variant.options ?? step.options`,
línea 186), no pasan por esa comprobación: un paso cuya variante
`expert` declare dos opciones con la misma `label` valida sin queja y llega a la tablet
con dos botones indistinguibles que abren paneles distintos. La justificación de la
puerta (DC-10/T-02-12: «dos opciones del mismo paso con la misma label serían
indistinguibles en pantalla y en el panel de detalle») se aplica palabra por palabra a
la variante.

**Fix:** extraer la comprobación y llamarla también por variante:

```ts
function checkDuplicateLabels(options: { label: string }[] | undefined, stepId: string, scope: string, ctx: z.RefinementCtx) {
  if (!options) return
  const labels = options.map(o => o.label)
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i)
  if (dupes.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Step "${stepId}"${scope} has duplicate option labels: ${[...new Set(dupes)].join(', ')}` })
  }
}
// base:
checkDuplicateLabels(step.options, step.id, '', ctx)
// y dentro del bucle de variantes:
checkDuplicateLabels(variant.options, step.id, ` variant "${level}"`, ctx)
```

## Info

### IN-01: `heroes` y `villains` pueden ser arrays vacíos según el esquema

**Fichero:** `engine/catalogueSchema.ts:78-79`
**Issue:** `stages` lleva `.min(1)` pero `heroes` y `villains` no, así que
`{"gameId":"marvel-champions","heroes":[],"villains":[]}` valida (probado). Lo único
que lo tapa son dos tests sobre el fichero real; un catálogo vacío pasaría el esquema
que la Fase 6 usará para validar cualquier juego nuevo.
**Fix:** `heroes: z.array(HeroSchema).min(1)` y `villains: z.array(VillainSchema).min(1)`, o dejar constancia en el comentario de D-05 de que la no-vaciedad es responsabilidad exclusiva de `characters.test.ts`.

### IN-02: `STAGE_MAP[card.stage]` indexa un objeto plano con una clave que viene de la API

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:255-258`
**Issue:** Si la API devolviese `stage: "constructor"` (o `"toString"`), la búsqueda no
da `undefined` sino una función heredada del prototipo, así que la puerta
`mappedStage === undefined` no muerde; el fallo se produce una línea más abajo con un
mensaje engañoso («la API dice stage "constructor" (mapea a function Object…)»). Falla
seguro hoy, pero es la clase de acceso que conviene no dejar suelta.
**Fix:** `const STAGE_MAP = new Map([['I', 1], ['II', 2], ['III', 3]])` y `STAGE_MAP.get(card.stage)`, o `Object.hasOwn(STAGE_MAP, card.stage)` antes de indexar.

### IN-03: el tipo de `expert` es anónimo e inline, y duplica el shape del esquema

**Fichero:** `engine/types.ts:149-153`
**Issue:** `expert?: { health: number; healthPerHero: boolean; healthPerGroup: boolean }`
no tiene nombre, así que la Fase 6/7 no puede escribir `function narrate(e: ExpertVillainStage)`
sin volver a teclear la forma (o recurrir a `NonNullable<VillainStage['expert']>`). El
esquema sí le puso nombre (`ExpertVillainStageSchema`), así que la asimetría es gratuita.
**Fix:** `export interface ExpertVillainStage { health: number; healthPerHero: boolean; healthPerGroup: boolean }` y `expert?: ExpertVillainStage`.

### IN-04: las puertas «ANTES de descargar nada» corren después de ~40 s de descargas

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:276-283`
**Issue:** El comentario dice «Puertas propias de la dimensión Experta, ANTES de
descargar nada (D-05: fallar alto antes que escribir un dato dudoso)». Viven dentro de
`extractVillainStage`, que se invoca por fila: cuando la primera fila de Kang se
valida, ya se han descargado 23 héroes y 3 etapas de Rhino (~40 s). Son puertas
puramente declarativas (comparan campos de la fila entre sí, sin tocar la red), así que
podrían correr para las 9 filas antes de la primera petición.
**Fix:** extraerlas a un `validateRows()` llamado al principio de `main()`, y ajustar el comentario.

### IN-05: el test `CAT-07` no comprueba lo que su nombre promete y duplica dos aserciones existentes

**Fichero:** `engine/__tests__/characters.test.ts:279-290`
**Issue:** `it('CAT-07: ningún test de este fichero fija un recuento de personajes, solo que las listas no estén vacías')`
solo repite `heroes.length > 0` y `villains.length > 0`, exactamente las mismas dos
aserciones de las líneas 109-112 y 152-155. No inspecciona el fichero de test, así que
no puede fallar por su motivo declarado; y de hecho la afirmación es discutible, porque
la línea 233 sí fija un recuento (`kang!.stages.length).toBe(3)`).
**Fix:** o convertirlo en el gate que su nombre promete (leer el propio fichero con `readFileSync(import.meta.url)` y comprobar que no contiene `toHaveLength(` ni `.length).toBe(` sobre `heroes`/`villains`), o eliminarlo y dejar la afirmación como comentario.

### IN-06: `extractHero` mezcla estilos y no cruza los datos redundantes de las dos caras

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:192-239`
**Issue:** Tres detalles menores en la misma función: (a) devuelve
`fetchCard(code).then(...)` mientras el resto del fichero es `async/await`; (b) valida
`type_code === 'hero'` de la cara de héroe pero no `linked_card.type_code === 'alter_ego'`,
que es la comprobación simétrica del peligro `a`/`b`/`c` que el encabezado documenta
en seis líneas; (c) toma `health` solo de `linked_card` sin cruzarlo con `card.health`,
aunque los PS son la misma cifra impresa en las dos caras — un cruce gratis que
atraparía un `code` equivocado.
**Fix:** `async function extractHero(...)` con `await`, más `if (card.linked_card.type_code !== 'alter_ego') throw …` y `if (card.health !== undefined && card.health !== health) throw …`.

### IN-07: el test de la clave legada `handSize` no puede fallar con su propio mensaje

**Fichero:** `engine/__tests__/characters.test.ts:137-142`
**Issue:** El test llama a `loadValidatedCatalogue()`, que rechaza el catálogo por
`unrecognized_keys` en cuanto un héroe trae `handSize`. La aserción posterior
(`expect(Object.keys(hero)).not.toContain('handSize')`) nunca se ejecuta en el caso que
pretende cubrir, así que su mensaje —«hero X todavía lleva la clave legada handSize»—
es inalcanzable.
**Fix:** hacer la comprobación sobre el objeto **sin validar** (`JSON.parse(readRawCatalogueText())`), que es el único punto donde puede fallar por su propio motivo.

### IN-08: `sleep` también tras la última petición, y recuentos/tiempos codificados a mano en comentarios

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:181-189`, `scripts/catalogue/fetch-marvelcdb.mjs:322-329`
**Issue:** `fetchCard` espera 1500 ms después de *toda* petición, incluida la última
(1,5 s de más por ejecución). Y el comentario de `main()` codifica «los 35 códigos (23
héroes + 9 etapas estándar + 3 etapas Experto)» y «~53 s»: cifras correctas hoy que se
quedan obsoletas en cuanto se añada la fila que CAT-07 promete que es trivial añadir.
**Fix:** hacer el pacing responsabilidad del bucle llamante (`if (!isLast) await sleep(...)`), o simplemente redactar el comentario en términos de la fórmula (`HERO_CARDS.length + filas de villano + filas con expertCode`, × `REQUEST_DELAY_MS`).

### IN-09: `listSourceFiles` sigue enlaces simbólicos y solo barre `app/`

**Fichero:** `engine/__tests__/catalogue-isolation.test.ts:72-86`
**Issue:** Usa `statSync` (sigue symlinks), así que un enlace a un directorio ancestro
provoca recursión infinita en el test; y el barrido T-01-19 cubre solo `app/`, cuando
el bundle del cliente también puede alcanzar `content/`, `plugins/` o `engine/`.
**Fix:** `readdirSync(dir, { withFileTypes: true })` y `entry.isDirectory()` (no sigue enlaces), y ampliar el barrido a los directorios que la Fase 6 vaya a importar desde `app/`.

### IN-10: `passWithNoTests: true` puede hacer desaparecer en verde toda la protección de esta fase

**Fichero:** `vitest.config.ts` (fuera del scope de esta revisión, pero condiciona los tres ficheros de test revisados)
**Issue:** El proyecto `engine` declara `include: ['engine/**/*.test.ts']` con
`passWithNoTests: true` (y también a nivel raíz). Si un glob dejara de casar (renombrar
el directorio, mover los tests, un typo en el patrón), los 80 tests de esta fase
desaparecerían y `npm run test` seguiría en verde — el mismo síntoma «Tests no tests»
que CR-02 de `05-VERIFICATION.md` invirtió mucho esfuerzo en eliminar dentro de los
ficheros, dejando la puerta abierta un nivel más arriba.
**Fix:** quitar `passWithNoTests` del proyecto `engine` ahora que sí tiene tests (el comentario que lo justifica dice literalmente «`engine/` doesn't exist yet — it lands in plan 01-07»: la premisa caducó), o añadir un gate que afirme un mínimo de ficheros de test colectados.

### IN-11: el `code` se interpola en la URL sin codificar

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:173`
**Issue:** `fetch(\`${API_BASE}/card/${code}.json\`)` — hoy los 35 códigos son
constantes del propio fichero, así que no hay entrada externa y no es explotable; pero
un `code` con `../` o `?` (typo al copiar de una URL de marvelcdb.com) alteraría la
ruta o la query en lugar de fallar de forma legible.
**Fix:** `encodeURIComponent(code)` y/o un `if (!/^[0-9]{5}[a-c]?$/.test(code)) throw` como puerta de forma junto a las demás.

### IN-12: `kind: ….default('step')` desmiente el comentario que asegura que el objeto validado es idéntico al crudo

**Fichero:** `engine/schema.ts:71` (`StepSchema.kind`), comentario CR-01 del encabezado (líneas 15-25)
**Issue:** El comentario del encabezado defiende `strictObject` con el argumento de que
«el objeto validado vuelve a ser idéntico al crudo» —porque el navegador consume el
JSON crudo, no el validado—. `kind: z.enum(['step','summary']).default('step')` es la
excepción: introduce en el objeto validado una clave que el crudo puede no tener, que es
justo por lo que `app/` necesita el `?? 'step'` que los demás comentarios advierten de no
imitar.
**Fix:** matizar el comentario del encabezado («idéntico al crudo salvo `kind`, el único campo con `.default()`, ver WR-01 de la revisión 02»), o hacer `kind` obligatorio en el JSON y quitar el `.default()` junto con el fallback de `app/`.

### IN-13: `alterEgo` es el único valor del catálogo que entra sin ninguna puerta de valor esperado

**Fichero:** `scripts/catalogue/fetch-marvelcdb.mjs:234`
**Issue:** `name` se contrasta contra `expectedName`, `type_code` contra `'hero'`,
`health`/`hand_size` contra «entero positivo», `card_set_code` y `stage` contra la fila.
`alterEgo: card.linked_card.name` entra tal cual: si viniese `undefined`,
`JSON.stringify` elimina la clave y el fallo aparece más tarde, en CI, como «falta
alterEgo», sin decir qué código de carta lo provocó ni impedir que el fichero ya se
haya escrito.
**Fix:** `if (typeof card.linked_card.name !== 'string' || card.linked_card.name.trim() === '') throw new Error(\`Código ${code} ("${card.name}"): linked_card.name (alter ego) vacío o ausente\`)`.

---

_Revisado: 2026-09-07T23:30:00Z_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidad: standard_
