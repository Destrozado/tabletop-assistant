---
phase: 05-cat-logo-de-h-roes-y-villanos
reviewed: 2026-09-07T19:50:28Z
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
  warning: 7
  info: 9
  total: 17
status: issues_found
---

# Fase 5: Informe de revisión de código

**Revisado:** 2026-09-07T19:50:28Z
**Profundidad:** standard
**Ficheros revisados:** 8
**Estado:** issues_found

## Summary

Se han revisado los 8 ficheros del alcance leyéndolos íntegros, ejercitando el esquema
con sondas fuera de la suite (parseos adversarios contra `CharacterCatalogueSchema` y
`GameDefinitionSchema` en un test temporal, ya borrado, sin tocar ningún fichero del
repo) y **verificando el catálogo committeado contra la propia API de MarvelCDB**.

Lo que sí se ha comprobado como correcto (para que el resto del informe se lea con la
calibración adecuada):

- **D-10 (determinismo) se cumple de verdad.** Se descargaron las 32 cartas declaradas
  (`HERO_CARDS` + `VILLAIN_STAGE_CARDS`), se reprodujo la proyección campo a campo del
  script y el resultado es **byte-idéntico** a `content/marvel-characters.json`
  (`out === committed` → `true`, `diff` vacío). No hay valores editados a mano, ni
  campos de fecha, ni deriva de orden.
- **Los 23 héroes tienen `linked_card.type_code === 'alter_ego'`** y, en los 23,
  `card.health === card.linked_card.health`, así que tomar `health` de `linked_card` no
  introduce ningún sesgo.
- **La premisa de CR-01 (dos tamaños de mano por cara) queda confirmada en los datos**:
  p. ej. Iron Man expone `hand_size: 1` en la cara de héroe y `6` en Tony Stark; el
  script y el esquema guardan los dos y ya no existe la clave legada `handSize`.
- **La corrección de CR-02 (carga perezosa) es real.** En los dos ficheros de test no
  queda ninguna lectura/parseo en ámbito de módulo ni en el cuerpo de un `describe()`;
  `it.each(...)` se alimenta de constantes literales, así que un catálogo roto ya no
  puede volatilizar la colección de la suite.
- Las 4 etapas alternativas de Kang II (`11002`/`11003`/`11004`/`11005`) comparten
  efectivamente `18/false/false`, tal como afirma el comentario del script.

Dicho eso, la revisión ha encontrado un defecto de fidelidad de reglas que el contrato
de datos hace estructuralmente irreparable sin cambiar la forma (CR-01), varias puertas
de validación que no muerden lo que su comentario asegura (WR-01, WR-03, WR-04, WR-06),
y una deriva de tipos que ningún paso de CI puede detectar porque **este repo no
typechequea nada** (WR-05). Ninguna vulnerabilidad de seguridad: no hay secretos, no hay
`eval`, la única red vive en un script manual excluido de build/CI y su gate de
aislamiento funciona.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: El catálogo no puede representar la salud de villano del modo Experto, y el contenido de la app ya manda usar esas cartas

**File:** `content/marvel-characters.json:214-237`
(y el contrato que lo fija: `engine/catalogueSchema.ts:38-43,56-60`,
`engine/types.ts:124-129,158-162`, `scripts/catalogue/fetch-marvelcdb.mjs:123-126`)

**Issue:**
`VillainStage` / `VillainSchema` modelan **una sola** tabla de etapas por villano, sin
ninguna dimensión de dificultad y sin ningún marcador de que lo guardado sea únicamente
el modo estándar. El script excluye a propósito los códigos `exp_kang`
(`11034`/`11035`/`11039`) y el comentario de las líneas 123-126 presenta esa exclusión
como una *protección* ("la puerta de expectedSetCode los atraparía si alguien los colara
por error"), no como un hueco del contrato.

Verificado en vivo contra la API (los 6 códigos descargados en esta revisión):

| Etapa | `card_set_code: kang` (committeado) | `card_set_code: exp_kang` (`card_set_name: "Expert Kang"`) |
|---|---|---|
| I | 12, per hero | **15**, per hero |
| II | 18, plana | **22**, plana |
| III | 20, per hero | **25**, per hero |

El problema no es teórico: el contenido de la Fase 2 **ya instruye ese cambio de cartas
en modo Experto**. `content/marvel-champions.json:210-212`, variante `expert`:
*"Sustituid las cartas de villano numeradas por las del modo Experto de este
escenario."* Es decir, la app dirá al grupo que ponga en mesa las cartas de Kang
Experto (15/22/25) y, en cuanto la Fase 6/7 lea este catálogo, será físicamente incapaz
de narrar otra cifra que la del modo estándar (12/18/20) — con la app pidiendo la
dificultad al usuario desde la pantalla de mini-setup (`Difficulty = 'normal' | 'expert'`,
`engine/types.ts:6`). Eso es exactamente "un asistente que guía mal", el fallo que
CLAUDE.md §Constraints declara peor que no tener asistente.

Contexto de honestidad: `05-RESEARCH.md:445` sí registró la existencia de `exp_kang` y
lo dejó "fuera de alcance de D-02/D-03 salvo decisión futura explícita". La deferencia
está documentada, pero **no llegó al contrato**: ni el esquema, ni `engine/types.ts`, ni
un solo test dejan constancia de que `stages` es normal-mode-only. Un consumidor de la
Fase 6/7 leerá `villain.stages[1].health === 18` y lo pintará en pantalla sin nada que
le avise. Y el coste de arreglarlo crece: la forma que se congele aquí es la que la
Fase 6 va a importar.

**Fix (dos salidas aceptables; la primera es la buena, la segunda es el mínimo honesto):**

1. Modelar la dificultad en la etapa y declarar las filas que faltan:

```ts
// engine/catalogueSchema.ts
const VillainStageSchema = z.strictObject({
  stage: z.number().int().positive(),
  health: z.number().int().positive(),
  healthPerHero: z.boolean(),
  healthPerGroup: z.boolean(),
  // Salud del set de villano del modo Experto cuando el escenario trae uno
  // (Kang: card_set_code "exp_kang"). Ausente = el modo Experto no cambia
  // las cartas numeradas de este villano (Rhino, Ultron).
  expert: z.strictObject({
    health: z.number().int().positive(),
    healthPerHero: z.boolean(),
    healthPerGroup: z.boolean(),
  }).optional(),
})
```

```js
// scripts/catalogue/fetch-marvelcdb.mjs — filas nuevas, no edición del esquema (CAT-07)
{ villainName: 'Kang', code: '11001', stage: 1, expectedSetCode: 'kang',
  expertCode: '11034', expectedExpertSetCode: 'exp_kang' },
{ villainName: 'Kang', code: '11002', stage: 2, expectedSetCode: 'kang',
  expertCode: '11035', expectedExpertSetCode: 'exp_kang' },
{ villainName: 'Kang', code: '11006', stage: 3, expectedSetCode: 'kang',
  expertCode: '11039', expectedExpertSetCode: 'exp_kang' },
```

2. Si se decide mantener el alcance actual: renombrar el campo a algo que no pueda
   leerse como universal (`standardStages`) **y** añadir un test que fije la limitación,
   para que la Fase 7 no pueda pintar salud de villano en partidas expertas sin tropezar
   con él:

```ts
it('el catálogo solo cubre el modo estándar: ninguna etapa declara cifras de Experto', () => {
  // Recordatorio ejecutable: Kang Experto es 15/22/25 (set exp_kang) y NO está aquí.
  // Si la Fase 7 muestra salud de villano, debe ocultarla/avisarla en difficulty:'expert'.
  const catalogue = loadValidatedCatalogue()
  expect(catalogue.villains.every(v => v.standardStages.length > 0)).toBe(true)
})
```

## Warnings

### WR-01: `villainName` y `expectedSetCode` son dos campos tecleados a mano sin ninguna puerta que los enfrente

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:111-130,219-251`

**Issue:** el nombre del villano **nunca** se lee de la carta (decisión correcta, D-02),
pero sus cifras sí. Nada comprueba que el `expectedSetCode` declarado tenga algo que ver
con el `villainName` declarado. Una fila así pasa **todas** las puertas del script y
además pasa el esquema y la suite entera:

```js
{ villainName: 'Rhino', code: '11034', stage: 1, expectedSetCode: 'exp_kang' }
// type_code 'villain' ✓ · card_set_code 'exp_kang' === expectedSetCode ✓
// stage 'I' → 1 === stage ✓ · health 15 entero positivo ✓ · booleanos ✓
// → escribe un "Rhino" con la salud de Kang Experto y CI pasa en verde
```

El resultado es una cifra equivocada narrada en la mesa cuya única barrera es que el
desarrollador se dé cuenta al revisar el diff (paso 3 del procedimiento CAT-07). La
puerta de `card_set_code` que el plan describe como la que "atrapa un `exp_kang` colado
por error" solo muerde si el `expectedSetCode` de la fila es el correcto — es decir,
protege del error de transcribir el `code` pero no del de transcribir el `expectedSetCode`.

**Fix:** añadir una segunda puerta independiente que ate el nombre declarado al conjunto
real de la carta (`card_set_name` viene en la respuesta: `"Rhino"`, `"Kang"`,
`"Expert Kang"`):

```js
if (slugify(card.card_set_name) !== slugify(villainName)) {
  throw new Error(`Código ${code} (${villainName} etapa ${stage}): la carta pertenece al conjunto "${card.card_set_name}", que no corresponde al villano declarado "${villainName}"`)
}
```

Esa comprobación cierra además el caso `exp_kang` por una vía distinta a
`expectedSetCode` (`"Expert Kang"` → `expert-kang` ≠ `kang`), que es lo que hace de ella
una segunda barrera y no un duplicado.

### WR-02: `alterEgo` es el único valor del catálogo que entra sin fijar ni acotar

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:180-215` (concretamente `:211`)

**Issue:** todos los demás campos de héroe están o fijados por declaración
(`name` contra `expectedName`, `:171-173`) o acotados por rango (`health`,
`handSizeHero`, `handSizeAlterEgo`, `:183-191`). `alterEgo: card.linked_card.name` no
tiene ni lo uno ni lo otro: es texto libre de un tercero que se escribe tal cual en un
fichero del repo público y acabará pintado en la tablet. Dos consecuencias concretas:

1. Si MarvelCDB cambia (o alguien vandaliza) ese campo, la regeneración lo arrastra en
   silencio; el guardarraíl anti-copyright de `characters.test.ts` mira **claves**, no
   **valores**, así que un párrafo con copyright metido en `linked_card.name` pasaría los
   20 tests de la blocklist y el esquema (`z.string().min(1)`) sin una queja. Eso choca
   de frente con CAT-04 y con CLAUDE.md §Constraints (legal).
2. Si el campo llega `undefined`, `JSON.stringify` **elimina la clave**: el script
   escribe un fichero sin `alterEgo` y solo lo caza CI después. Rompe el espíritu del
   "todo o nada" que el propio `main()` documenta (`:261-267`).

**Fix:**

```js
const alterEgo = card.linked_card.name
if (typeof alterEgo !== 'string' || alterEgo.trim() !== alterEgo || alterEgo.length < 1 || alterEgo.length > 40) {
  throw new Error(`Código ${code} ("${card.name}"): linked_card.name no es un nombre corto y limpio (${JSON.stringify(alterEgo)})`)
}
```

Mejor aún, y coherente con `expectedName`: declarar `expectedAlterEgo` en cada fila de
`HERO_CARDS` y abortar si no coincide — así el nombre del alter ego pasa a ser un dato
del repo verificado contra la API, no un dato de la API copiado al repo.

### WR-03: `STAGE_MAP` solo conoce I/II/III, y eso contradice la promesa CAT-07 que el esquema y dos tests celebran

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:65,229-232`

**Issue:** el esquema evita `.length(3)` a propósito y lo justifica: "CAT-07 exige que un
villano futuro con otro número de etapas sea **una fila más en el script**, no una
edición de este esquema" (`engine/catalogueSchema.ts:106-109`), y hay dos tests
positivos que consagran villanos de 2 y de 4 etapas
(`engine/__tests__/catalogueSchema.test.ts:155-173`). Pero el script mapea el numeral
romano con un objeto literal de tres entradas: un villano con etapa `IV` cae en
`mappedStage === undefined` y aborta (`:230-232`). La promesa "una fila más" es falsa a
partir de la cuarta etapa; hay que editar el script.

**Fix:** cubrir el rango o parsear el numeral en general.

```js
const STAGE_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5 }
```

### WR-04: el "gate muerde" de las claves prohibidas no ejercita el gate real

**File:** `engine/__tests__/characters.test.ts:83-105`

**Issue:** el comentario de `:83-85` afirma "una única implementación, ejercitada dos
veces", pero el gate de verdad (`:96-99`) usa `expect(rawText).not.toContain(key)` y
**no llama nunca a `findForbiddenKey`**. La función solo la usa su propio auto-test
(`:101-105`). Resultado: `findForbiddenKey` es código muerto para el gate, el test "el
gate muerde" no demuestra nada sobre la barrera que realmente protege el fichero, y las
dos rutas pueden derivar sin que nadie se entere. El fichero hermano
(`catalogue-isolation.test.ts:66-68,99,115-117`) sí cumple el patrón con
`referencesCatalogueScript`, lo que confirma que aquí es un desliz, no una convención.

**Fix:** hacer que el gate real pase por la función compartida.

```ts
it.each(FORBIDDEN_KEYS)('el fichero committeado no contiene la clave %s de la API de MarvelCDB', (key) => {
  expect(
    findForbiddenKey(readRawCatalogueText(), [key]),
    `Se encontró la clave prohibida ${key} en content/marvel-characters.json`,
  ).toBeUndefined()
})
```

### WR-05: la deriva entre las interfaces de `engine/types.ts` y los esquemas Zod es indetectable — y CI no typechequea nada

**File:** `engine/catalogueSchema.ts:121-123` (y el mismo patrón en `engine/schema.ts:214-216`)

**Issue:** `engine/types.ts:112-118` declara explícitamente que las interfaces viven ahí
—y no como `z.infer`— para que `app/` no roce zod. Correcto, pero el precio es que
**existen dos fuentes de verdad** y nada las enfrenta:

```ts
return CharacterCatalogueSchema.parse(json) as unknown as CharacterCatalogue
```

Ese `as unknown as` es precisamente el que borra el único punto donde el compilador
podría comparar la salida del esquema con la interfaz. Y no hay red de seguridad detrás:
verificado en este repo, **no existe ningún paso de typecheck** — `package.json` no
declara script `typecheck` ni la dependencia `typescript` (no está en `node_modules`), y
`.github/workflows/ci.yml` solo corre `npm run test` (`vitest run`, que transpila sin
comprobar tipos) y Playwright. Añadir `handSizeAlterEgo` al esquema y olvidarlo en la
interfaz (o al revés) se despliega en silencio; el consumidor de la Fase 6, que se tipa
solo con `~~/engine/types`, vería un contrato falso.

**Fix:** sustituir el doble cast por una equivalencia declarada en los dos sentidos, que
falla en el momento en que las dos definiciones dejen de coincidir:

```ts
type Inferred = z.infer<typeof CharacterCatalogueSchema>
// Si alguna de las dos asignaciones deja de compilar, esquema e interfaz han derivado.
const _schemaMatchesInterface: CharacterCatalogue = {} as Inferred
const _interfaceMatchesSchema: Inferred = {} as CharacterCatalogue

export function validateCharacterCatalogue(json: unknown): CharacterCatalogue {
  return CharacterCatalogueSchema.parse(json)
}
```

…y, para que la comprobación sirva de algo, añadir el gate que hoy falta:
`"typecheck": "nuxi typecheck"` en `package.json` + un paso en `ci.yml` (con
`typescript`/`vue-tsc` como devDependency).

### WR-06: la puerta de etiquetas duplicadas de `options` no se aplica a las variantes de dificultad

**File:** `engine/schema.ts:164-173` (y el bucle de variantes en `:175-201`)

**Issue:** DC-10/T-02-12 razona que "dos opciones del mismo paso con la misma label
serían indistinguibles en pantalla y en el panel de detalle", pero la comprobación solo
recorre `step.options`. Las `options` declaradas dentro de
`variants.difficulty.normal|expert` —que son exactamente las que se pintan en esa
dificultad— no se revisan. Reproducido con una sonda contra `GameDefinitionSchema`:

```
variant dup labels -> OK   ← dos opciones "A" en la variante expert: valida
base dup labels    -> ZodError: Step "st" has duplicate option labels: A
```

Es el mismo defecto que este bloque ya arregló para `warningDetail`/`optionsWarning`
(donde sí calcula el valor efectivo variante-a-variante) y que aquí se quedó a medias.

**Fix:** extraer la comprobación y aplicarla al conjunto efectivo de cada variante.

```ts
const checkDupeLabels = (options: { label: string }[] | undefined, where: string) => {
  if (!options) return
  const labels = options.map(o => o.label)
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i)
  if (dupes.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${where} has duplicate option labels: ${[...new Set(dupes)].join(', ')}` })
  }
}
checkDupeLabels(step.options, `Step "${step.id}"`)
// dentro del bucle de variantes:
checkDupeLabels(variant.options ?? step.options, `Step "${step.id}" variant "${level}"`)
```

### WR-07: `summaryLabel` admite cadena vacía y eso borra la fase de la lista de repaso sin que nada falle

**File:** `engine/schema.ts:84`

**Issue:** `summaryLabel: z.string().optional()` es el único rótulo autorado del esquema
sin `.min(1)` (compárese con `title` en `:83`, `:90`, y `text` en `:33`). Verificado con
sonda: `summaryLabel: ''` valida sin problema. Y el consumidor filtra por verdad —
`app/pages/[game]/index.vue:272`: `.filter((label): label is string => Boolean(label))` —
así que un `""` tecleado por error no pinta un rótulo vacío (que se vería), sino que
**hace desaparecer esa fase de la checklist de "mesa lista"** en silencio, que es
justo el tipo de olvido que el Core Value del proyecto existe para evitar.

**Fix:**

```ts
summaryLabel: z.string().min(1).optional(),
```

## Info

### IN-01: `not.toContain('api')` es un gate frágil y a la vez ciego a mayúsculas

**File:** `engine/__tests__/catalogue-isolation.test.ts:133-141`
**Issue:** el test se llama "no contiene ninguna referencia remota" pero comprueba
subcadenas de tres letras sobre **todo** el fichero, valores incluidos: cualquier nombre
o alter ego futuro que contenga `api` reventaría CI por una razón que no tiene nada que
ver con una referencia remota. Y al revés, las tres comprobaciones son sensibles a
mayúsculas (`HTTP`, `API`, `MarvelCDB` pasarían). También hay asimetría con el barrido de
`app/` (`:148-150`), que busca `marvelcdb.com` mientras este busca `marvelcdb`.
**Fix:** normalizar y buscar patrones de referencia remota de verdad, no subcadenas
sueltas: `expect(catalogueContentText.toLowerCase()).not.toMatch(/https?:\/\/|marvelcdb/)`.

### IN-02: `fetch` sin timeout (y una espera inútil tras la última petición)

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:149-167`
**Issue:** el comentario de `:158-164` documenta que las ráfagas "empezaron a agotar el
tiempo de conexión", pero la llamada no lleva ningún límite: si una conexión se queda
colgada, el script espera indefinidamente sin escribir ni imprimir nada (y sin la red de
D-05, porque nunca lanza). Además el `sleep(1500)` se ejecuta también después de la
petición nº 32, regalando 1,5 s de espera que no espacia nada.
**Fix:** `fetch(url, { signal: AbortSignal.timeout(15000) })` y mover la pausa al bucle
de `main()` (o saltarla en la última iteración).

### IN-03: `CATALOGUE_PATH` es relativo al cwd, no al script

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:63,254-259`
**Issue:** invocado desde cualquier directorio que no sea la raíz del repo, el script
escribe en `<cwd>/content/marvel-characters.json` (o aborta por ENOENT) en vez de en el
fichero versionado. Es la convención ya establecida en `scripts/voice/generate.mjs:64-65`,
así que no es una desviación del repo, pero los tests de esta misma fase ya usan el
patrón robusto (`fileURLToPath(new URL(...))`).
**Fix:** `const CATALOGUE_PATH = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))`.

### IN-04: el gate de `package.json` pasa en vacío si la entrada npm desaparece o se renombra

**File:** `engine/__tests__/catalogue-isolation.test.ts:95-102`
**Issue:** `packageJson.scripts?.[entryName] ?? ''` convierte "la entrada no existe" en
"la entrada está limpia". Si mañana `build` pasa a llamarse `build:prod` con la llamada
al catálogo dentro, los seis tests de D-06 siguen en verde.
**Fix:** afirmar primero que las entradas que deben existir existen
(`expect(Object.keys(packageJson.scripts ?? {})).toContain('build')`), o comprobar la
condición sobre **todos** los valores de `scripts` en lugar de sobre una lista blanca de
nombres.

### IN-05: el `code` se interpola en la URL sin codificar ni validar

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:150`
**Issue:** `fetch(\`${API_BASE}/card/${code}.json\`)`. Hoy los `code` son constantes del
propio fichero, así que no hay superficie de ataque real, pero un `code` con `../`
saldría de la ruta del endpoint.
**Fix:** validar la forma en la puerta de entrada: `if (!/^[0-9a-z]+$/.test(code)) throw new Error(...)`.

### IN-06: `kind: ...default('step')` desmiente el comentario que asegura que el objeto validado es idéntico al crudo

**File:** `engine/schema.ts:19-21,71`
**Issue:** el bloque CR-01 afirma "con `strictObject` la clave desconocida lanza, y el
objeto validado vuelve a ser idéntico al crudo". No lo es mientras exista un `.default()`:
verificado con sonda, un paso sin `kind` sale de `parse()` con `kind: 'step'` inyectado,
mientras el navegador recibe el JSON sin la clave — la divergencia que obliga al
`step.kind ?? 'step'` de `app/pages/[game]/index.vue:271`.
**Fix:** acotar la afirmación del comentario a las claves desconocidas, o sustituir el
`.default('step')` por `z.enum([...]).optional()` y dejar el fallback donde ya está.

### IN-07: el test de la clave legada `handSize` no puede fallar por su propio motivo

**File:** `engine/__tests__/characters.test.ts:137-142`
**Issue:** `loadValidatedCatalogue()` valida con `z.strictObject`, así que un héroe con
`handSize` hace lanzar la carga antes de llegar al `expect`. El test nunca informará
"todavía lleva la clave legada handSize"; informará un ZodError. Da una sensación de
cobertura independiente que no existe (la comprobación real ya la hace el esquema y su
test unitario en `catalogueSchema.test.ts:63-67`).
**Fix:** hacer la comprobación sobre el objeto **crudo**, que es donde sí es
independiente: `expect(Object.keys(JSON.parse(readRawCatalogueText()).heroes[0])).not.toContain('handSize')`.

### IN-08: las dos copias de `slugify` no tienen ningún test que las enfrente

**File:** `engine/catalogueSchema.ts:24-33` y `scripts/catalogue/fetch-marvelcdb.mjs:134-143`
**Issue:** la duplicación es deliberada y la justificación ("si divergen, CI falla") solo
se sostiene para nombres **ya presentes** en el catálogo. Una divergencia que solo afecte
a entradas futuras (p. ej. si una copia añadiera transliteración de acentos) pasa CI hoy y
muerde el día que se compre la caja. Relacionado: ambas descartan lo no-ASCII en vez de
transliterar, así que un futuro "Ángel" produciría el id `ngel` — determinista y
espejado, pero mutilado y con riesgo de colisión.
**Fix:** un test de tabla compartida sobre casos frontera
(`['Ms. Marvel', 'ms-marvel'], ['X-23', 'x-23'], ['SP//dr', 'sp-dr'], ['Ángel', ???]`)
duplicado en los dos lados, o mover la función a un `.mjs` sin dependencias que ambos
importen.

### IN-09: `listSourceFiles` sigue enlaces simbólicos y no cubre todo el código cliente

**File:** `engine/__tests__/catalogue-isolation.test.ts:72-86,143-152`
**Issue:** el recorrido usa `statSync` (que sigue symlinks: un enlace cíclico dentro de
`app/` provocaría recursión infinita en CI) y limita el barrido a `app/`, dejando fuera
código que también se empaqueta para el navegador (`nuxt.config.ts`, `content/games-index.ts`,
`server/` si algún día existe).
**Fix:** usar `lstatSync` (o `readdirSync(dir, { withFileTypes: true })`) y ampliar las
raíces barridas a la lista de directorios que acaban en el bundle.

---

_Reviewed: 2026-09-07T19:50:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
