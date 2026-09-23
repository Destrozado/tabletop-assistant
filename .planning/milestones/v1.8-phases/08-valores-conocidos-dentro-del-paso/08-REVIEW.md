---
phase: 08-valores-conocidos-dentro-del-paso
reviewed: 2026-09-09T15:05:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - app/components/StepScreen.vue
  - app/composables/__tests__/useGameSession.test.ts
  - app/composables/useGameSession.ts
  - app/pages/[game]/index.vue
  - content/marvel-champions.json
  - engine/__tests__/content.test.ts
  - engine/__tests__/stepValues.test.ts
  - engine/schema.ts
  - engine/stepValues.ts
  - engine/types.ts
findings:
  critical: 3
  warning: 8
  info: 8
  total: 19
status: issues_found
---

# Fase 8: Informe de revisión de código

**Revisado:** 2026-09-09T15:05:00Z
**Profundidad:** standard
**Ficheros revisados:** 10
**Estado:** issues_found

## Resumen

Esta es la segunda ronda de revisión de la Fase 8. `npx vitest run` está en verde
(22 ficheros, 567 tests) y las restricciones estructurales que la fase se impuso siguen
cumpliéndose de forma mecánica: `engine/stepValues.ts` no importa Vue/Nuxt/DOM, no menciona
`resolveCounterValues` (con test estructural que lo prueba), `StepScreen.vue` no importa
`~~/engine/*`, y `grep -rn "v-html|innerHTML|eval\(|dangerously" app/ engine/` no devuelve
nada — T-01-01 se respeta en toda la app.

**Verificación de los hallazgos de la ronda anterior (no asumida, comprobada):**

- **CR-01 (orden dial vs. sustitución por dificultad): CERRADO.** `setup.escenario.04` se lee
  ahora antes de `setup.escenario.02` (`content/marvel-champions.json:177` y `:201`), hay un
  gate en `engine/__tests__/content.test.ts:283-347` con test de mordida incluido, y
  `contentVersion` subió a 14 con su aserción actualizada (`content.test.ts:605-606`). La cifra
  que se pinta en Experto ya no contradice la carta física. **Pero el arreglo destapa un
  problema nuevo en el propio paso reordenado — ver CR-03.**
- **WR-04 (sin tests de esquema ni aserciones de contenido para `value`): PARCIALMENTE
  CERRADO.** El plan 08-04 añadió aserciones de contenido, pero solo para `villainHealth`.
  `grep -n "value" engine/__tests__/schema.test.ts` sigue sin devolver **nada**: el campo nuevo
  del esquema continúa con cero tests, mientras su hermano de la Fase 6 (`selection`) tiene tres
  (`schema.test.ts:212-230`). Ver WR-04.
- **CR-02 de la ronda anterior (`optionsWarningDetail` muerto): SIGUE ABIERTO.** Reproducido
  literalmente: `engine/resolve.ts:9-16` sigue sin copiar el campo. Se reabre como CR-02.

Hallazgo nuevo y más grave que todo lo anterior: **la app en producción devuelve una pantalla
de error 500 ante una URL trivial** (`/constructor`), verificado contra el despliegue real. No
lo introduce la Fase 8, pero vive en uno de los ficheros entregados y ninguna de las ocho
suites de e2e lo cubre.

## Hallazgos narrativos (revisor IA)

### Críticos

#### CR-01: `route.params.game` sin validar + búsqueda por cadena en un objeto literal → 500 en producción

**Fichero:** `app/pages/[game]/index.vue:41`, `:44`, `:53`, `:133`
(causa raíz: `app/composables/useGameContent.ts:18-20`, `app/composables/useCharacterCatalogue.ts:18-20`)

**Problema:** la página toma el parámetro de ruta sin validarlo y lo usa como clave de un objeto
literal:

```ts
const gameId = route.params.game as string   // :41  — controlado por el usuario
const game = getGame(gameId)                 // :44
const catalogue = getCatalogue(gameId)       // :53
…
if (!game) { resumeResolved.value = true; return }   // :133  — la guarda "juego desconocido"
```

`getGame` hace `gamesById[gameId] ?? null` sobre un objeto literal, así que **cualquier clave de
`Object.prototype` devuelve un valor truthy** y derrota la guarda de `:133`:

```
$ node -e "const m={'marvel-champions':{}}; console.log(m['constructor'] ?? null)"
[Function: Object]
```

`game` pasa a ser la función `Object`, `expand(game, …)` llega a `flatten(game)` y revienta con
`sections is not iterable`. Comprobado **contra el despliegue real**, no en teoría — el host
sirve el fallback SPA (`200.html`) con HTTP 200 para rutas no prerenderizadas, así que la página
sí se monta en cliente:

```
$ curl -s -o /dev/null -w "%{http_code}" https://tabletop-assistant.vercel.app/constructor
200

# Chromium sobre el despliegue en vivo:
/foo         => "No encontramos ese juego. Volved al selector e intentadlo de nuevo."
/constructor => "500 | Internal Server Error | e.sections is not iterable"
```

Es decir: la ruta de degradación amable existe y funciona (`/foo`), y un puñado de nombres
(`constructor`, `toString`, `valueOf`, `hasOwnProperty`, `__proto__`…) la esquivan y tiran la
app. `getCatalogue` tiene exactamente el mismo defecto, y por él pasan las dos computeds nuevas
de esta fase (`useGameSession.ts:273` y `:280`): con `catalogue` = `Object`,
`catalogue.villains.find` es `undefined` y `resolveStepValue` lanza dentro de un computed de Vue
(ver también WR-01). Ninguna spec de `e2e/` navega a una ruta de juego inexistente.

**Corrección** (dos líneas, en las dos composables; la guarda de `:133` entonces vuelve a valer):

```ts
// app/composables/useGameContent.ts
const gamesById: Record<string, GameDefinition> = Object.assign(Object.create(null), {
  'marvel-champions': marvelChampions as GameDefinition,
})

function getGame(gameId: string): GameDefinition | null {
  return gamesById[gameId] ?? null   // ya sin cadena de prototipos
}
```

Alternativa equivalente sin cambiar la forma del literal:
`return Object.hasOwn(gamesById, gameId) ? gamesById[gameId]! : null`. Aplicar lo mismo en
`useCharacterCatalogue.ts`. Añadir una spec en `e2e/` que navegue a `/constructor` y afirme que
se ve «No encontramos ese juego» — sin ella, la regresión vuelve sin que nada la note.

---

#### CR-02: `optionsWarningDetail` nunca llega a la pantalla — 300 caracteres autorados y una ruta de emisión muertos

**Fichero:** `engine/resolve.ts:9-16` (causa raíz) → `app/pages/[game]/index.vue:707`, `:271-278`,
`:714` → `app/components/StepScreen.vue:23`, `:165-172`

**Problema:** `resolveText` reconstruye el `TextBlock` campo a campo y **omite**
`optionsWarningDetail`:

```ts
return {
  text: …, warning: …, warningDetail: …,
  options: …, optionsWarning: …, speech: …,   // falta optionsWarningDetail
}
```

Cadena completa del fallo, toda verificable leyendo los ficheros:

1. `index.vue:707` pasa `currentText.optionsWarningDetail ?? null` → **siempre `null`**.
2. `StepScreen.vue:166` (`v-if="optionsWarningText && optionsWarningDetailText"`) nunca puede ser
   cierto: la rama pulsable `⚠ … ›` es código inalcanzable, y con ella el emit
   `open-options-warning-detail` (`StepScreen.vue:63`) y su manejador
   `onOpenOptionsWarningDetail` (`index.vue:271-278`, que además leería `?? ''` como cuerpo).
3. Los 300+ caracteres autorados en `content/marvel-champions.json:410` («Aturdido cancela el
   próximo ataque…») no se muestran jamás.

`engine/schema.ts:168-173` incluso valida que `optionsWarningDetail` exija `optionsWarning`, así
que la puerta de build confirma que el contenido está bien formado mientras el runtime lo tira a
la basura una función más allá. TypeScript no lo detecta porque el campo es opcional en
`TextBlock`.

Es **preexistente** (viene de la quick 260831-fkb, no de la Fase 8) y `engine/resolve.ts` no está
en la lista de ficheros entregados, pero se reporta de nuevo porque (a) sigue abierto tras la
ronda anterior, (b) el contrato roto vive en dos de los ficheros revisados, y (c) una fase cuyo
trabajo entero es «aflorar un valor dentro del paso» no debería cerrarse con un campo hermano
descartado silenciosamente.

**Corrección:**

```ts
// engine/resolve.ts
return {
  text: variant?.text ?? node.step.text,
  warning: variant?.warning ?? node.step.warning,
  warningDetail: variant?.warningDetail ?? node.step.warningDetail,
  options: variant?.options ?? node.step.options,
  optionsWarning: variant?.optionsWarning ?? node.step.optionsWarning,
  optionsWarningDetail: variant?.optionsWarningDetail ?? node.step.optionsWarningDetail,
  speech: variant?.speech ?? node.step.speech,
}
```

Y un test de regresión que compare el **conjunto de claves** de `TextBlock` con el conjunto de
claves que devuelve `resolveText` (no una aserción por campo), para que el próximo campo añadido
no pueda olvidarse igual.

---

#### CR-03: en Experto, el paso reordenado ordena sustituir cartas que no existen para 2 de los 3 villanos del catálogo

**Fichero:** `content/marvel-champions.json:189-190` (paso `setup.escenario.04`, variante
`expert`) — contradicho por `engine/types.ts:193-199` y `content/marvel-characters.json`

**Problema:** el arreglo de CR-01 de la ronda anterior colocó `setup.escenario.04` como la
**puerta inmediatamente anterior** al dial de vida del villano. Su variante `expert` dice, sin
condición alguna:

> «Sustituid las cartas de villano numeradas por las del modo Experto de este escenario.»

Pero el propio repositorio documenta que eso es falso para la mayoría de los escenarios
disponibles. `engine/types.ts:193-199`:

> «Su ausencia es un hecho del dominio, no un dato pendiente: significa que el modo Experto de
> ese escenario **no sustituye** las cartas de villano numeradas (caso de Rhino y Ultron,
> villanos del Core Set).»

Y el catálogo lo confirma dato a dato (`content/marvel-characters.json`, 3 villanos en total):

| villano | etapas con `expert` |
|---|---|
| `rhino`  | ninguna |
| `ultron` | ninguna |
| `kang`   | las tres (12/18/20 → 15/22/25) |

Es decir: **en 2 de los 3 villanos jugables el asistente manda al grupo a buscar unas cartas que
no existen**, justo antes de decirles que ajusten el dial. El grupo se para, rebusca en la caja,
no encuentra nada y sigue sin saber si se ha saltado algo. Es exactamente el modo de fallo que
CLAUDE.md llama peor que no tener asistente («fidelidad de reglas: un asistente que guía mal es
peor que no tener asistente»).

Nada lo cubre: el gate nuevo de `content.test.ts:283-347` comprueba el **orden** de este paso,
nunca si su texto es cierto para el villano en curso, y `content.test.ts:244-252` solo comprueba
que los dos textos de dificultad difieran entre sí.

**Corrección (solo contenido, sin tocar `text`/`speech` base ni ningún id):** redactar la
variante en condicional, que es lo que el propio dato del catálogo respalda:

```jsonc
"expert": {
  "text": "Si el escenario trae cartas de villano de modo Experto, sustituidlas ahora.",
  "speech": "Si el escenario trae cartas de villano de modo Experto, sustituidlas ahora."
}
```

Ojo: cambiar `speech` obliga a regenerar el clip `setup.escenario.04.expert` y a actualizar
`scripts/voice/manifest.json` — `engine/__tests__/voice-drift.test.ts` lo detectará. Si se
prefiere no tocar audio en esta fase, cambiar solo `text` y dejar `speech` como está es una
mejora parcial legítima, pero debe registrarse como deuda explícita, no darse por cerrado.

### Advertencias

#### WR-01: `catalogue.villains` / `catalogue.heroes` se asumen arrays; una regeneración mala lanza dentro de un computed de Vue

**Fichero:** `engine/stepValues.ts:66`, `:98`

**Problema:** ambas búsquedas solo se defienden de `catalogue === null`:

```ts
const villain = catalogue !== null ? catalogue.villains.find(v => v.id === villainId) ?? null : null
…
const hero = catalogue !== null ? catalogue.heroes.find(h => h.id === slot.heroId) ?? null : null
```

`content/marvel-characters.json` lo escribe un script contra una API de terceros
(`scripts/catalogue/fetch-marvelcdb.mjs`), y `useCharacterCatalogue.ts` lo importa **sin pasar
por `engine/catalogueSchema.ts`** (que es Node-only por T-01-19). Si una regeneración deja
`heroes`/`villains` ausentes, renombrados o serializados como objeto, `.find` es `undefined` y
las dos funciones lanzan un `TypeError` dentro de `stepValueSuffix`/`stepValueRows`
(`useGameSession.ts:271-284`), es decir dentro de un computed: pantalla en blanco a media
partida, sin red para recargar nada. El mismo camino se alcanza hoy vía CR-01 con
`getCatalogue('constructor')`.

El resto del módulo es escrupulosamente defensivo (`Number.isFinite`, `kind !== 'villainHealth'`,
`slot.heroId` normalizado) — esta es la única suposición sin cubrir, y el test
`stepValues.test.ts:180-186` solo prueba `catalogue = null`, nunca un catálogo con forma
inesperada.

**Corrección:**

```ts
const villains = Array.isArray(catalogue?.villains) ? catalogue.villains : []
const villain = villains.find(v => v.id === villainId) ?? null
```

…y su equivalente para `heroes`. Añadir al bloque «Batería defensiva» de
`engine/__tests__/stepValues.test.ts` un caso con `{ gameId: 'x' } as CharacterCatalogue` y otro
con `{ heroes: 'no-es-un-array' }`.

---

#### WR-02: el salto de `contentVersion` reinicia la posición pero conserva los contadores congelados de la partida abandonada

**Fichero:** `content/marvel-champions.json:5` (13→14) + `engine/persistence.ts:62-65`

**Problema:** al subir `contentVersion`, `resume()` cae en `contentChangedFallback`, que devuelve
`{ ...fresh, cursor: 0, round: 1, context }` **conservando `context` entero**. Desde la Fase 7,
`context` incluye `counters` (`engine/types.ts:164`). Consecuencia concreta con este despliegue:

1. El grupo va por la ronda 5 con el villano a 12 de vida (congelado en `context.counters`).
2. Se despliega la Fase 8 → `contentVersion` 14.
3. Al reabrir, la app los devuelve al **paso 1 de la preparación** con `round: 1`… pero
   `context.counters.villainHealth` sigue valiendo 12.
4. En `setup.escenario.02` la pantalla pinta correctamente `(42)` (D-13 manda: cifra impresa,
   nunca el contador). En cuanto vuelven al bucle de ronda, la banda de contadores muestra 12.

Dos superficies de la misma app dando dos vidas distintas para el mismo villano en la misma
partida recién reiniciada. Conservar `selection` en el fallback es deseable; conservar `counters`
no lo es: son estado de una partida que la propia app acaba de declarar irrecuperable.
`engine/__tests__/persistence.test.ts` no cubre este caso (sus fixtures de `content-changed` no
llevan `counters`).

**Corrección:**

```ts
// engine/persistence.ts
function contentChangedFallback(persisted: PersistedPosition, fresh: EngineSession): EngineSession {
  const base = isValidContext(persisted.context) ? persisted.context : fresh.context
  // Reiniciar a cursor 0/round 1 invalida los contadores de mesa: son estado de
  // una partida que ya se ha declarado no reanudable. `selection` sí sobrevive.
  const { counters: _discarded, ...context } = base
  return { ...fresh, cursor: 0, round: 1, context }
}
```

---

#### WR-03: `StepValueKind` está escrito tres veces y ninguna copia obliga a las otras

**Fichero:** `engine/types.ts:18`, `engine/schema.ts:84`, `engine/stepValues.ts:62` y `:91`

**Problema:** el comentario de `types.ts:8-17` afirma que el alias existe «para que
`StepDefinition.value` y `StepSchema` citen el mismo enum sin teclearlo dos veces». No es lo que
hace el código:

```ts
// engine/types.ts:18
export type StepValueKind = 'villainHealth' | 'heroHealth' | 'handSizeAlterEgo'
// engine/schema.ts:84  — literales tecleados otra vez, sin referencia al alias
value: z.enum(['villainHealth', 'heroHealth', 'handSizeAlterEgo']).optional(),
// engine/stepValues.ts:62 y :91 — tercera copia, como strings sueltos
if (kind !== 'villainHealth') return null
if (kind !== 'heroHealth' && kind !== 'handSizeAlterEgo') return []
```

Añadir un cuarto miembro al alias compila sin un solo error: el esquema lo rechazará en CI (bien)
pero `stepValues.ts` lo tratará como desconocido y no pintará nada (mal, y en silencio). La firma
laxa `kind: string | null | undefined` está bien justificada (el navegador consume el JSON crudo),
pero eso no obliga a duplicar los literales.

**Corrección:** derivar el esquema del alias y comprobar la exhaustividad en `stepValues.ts`:

```ts
// engine/schema.ts
import type { StepValueKind } from './types'
const STEP_VALUE_KINDS = ['villainHealth', 'heroHealth', 'handSizeAlterEgo'] as const
// falla en compilación si el alias y esta tupla divergen:
const _exhaustive: readonly StepValueKind[] = STEP_VALUE_KINDS
type _Covered = Exclude<StepValueKind, typeof STEP_VALUE_KINDS[number]> extends never ? true : never
…
value: z.enum(STEP_VALUE_KINDS).optional(),
```

---

#### WR-04: el campo `value` del esquema sigue con cero tests, y el gate de contenido solo cubre un tercio del enum

**Fichero:** `engine/schema.ts:84`, `engine/__tests__/content.test.ts:283-347`

**Problema:** comprobado, no supuesto:

```
$ grep -n "value" engine/__tests__/schema.test.ts
(sin resultados)
```

`selection`, su hermano de la Fase 6 y con exactamente la misma forma (enum opcional fuera de
`TextBlock`), tiene tres tests en `schema.test.ts:212-230`, incluido el que prueba que declararlo
**dentro de una variante de dificultad** lanza. `value` no tiene ninguno, y precisamente ese
tercer caso es el que protege la afirmación de `types.ts:72-74` («no debe poder variar por
dificultad»): hoy depende únicamente de que `TextBlockSchema.partial()` conserve la estrictez,
cosa que el comentario de `schema.ts:24` asegura haber verificado a mano en zod 4.4.3 pero que
ningún test ejerce.

En contenido, el gate nuevo del plan 08-04 solo enumera `villainHealth`
(`content.test.ts:320-323`). No hay ninguna aserción sobre qué pasos declaran `heroHealth` o
`handSizeAlterEgo`, así que añadir `"value": "heroHealth"` a cualquier paso —o, peor, un
`"value": "villainHealth"` a un paso de la sección `ronda`, donde D-13 haría pintar la vida
impresa mientras el villano lleva media partida golpeado— no rompe nada en CI. El gate de orden
no lo cubre: solo mira posiciones relativas dentro de `allSteps()`.

**Corrección:** tres tests en `schema.test.ts` calcados de los de `selection` (acepta el enum,
rechaza un literal fuera del enum, rechaza `value` dentro de `variants.difficulty.normal`) y un
gate de enumeración en `content.test.ts` del mismo estilo que el de `warning`
(`content.test.ts:184-201`):

```ts
it('exactamente 4 pasos declaran value, todos en la sección setup', () => {
  const withValue = allSteps(marvelChampions).filter(s => s.value)
  expect(withValue.map(s => `${s.id}:${s.value}`).sort()).toEqual([
    'setup.escenario.02:villainHealth',
    'setup.heroes.03:heroHealth',
    'setup.manos.02:handSizeAlterEgo',
    'setup.manos.03:handSizeAlterEgo',
  ])
  const ronda = marvelChampions.sections.find(s => s.id === 'ronda')!
  expect(ronda.phases.flatMap(p => p.steps).filter(s => s.value)).toEqual([])
})
```

---

#### WR-05: el presupuesto duro de 90 caracteres se aplica a `text`, pero lo que se pinta es `text + sufijo`

**Fichero:** `engine/schema.ts:33` vs. `app/components/StepScreen.vue:77`

**Problema:** el esquema acota `text` a 90 caracteres («presupuesto duro de 01-UI-SPEC.md»), pero
desde esta fase el `<p>` renderiza `{{ actionText }}{{ stepValueSuffix ?? '' }}` — una cadena que
el gate no mide. Hoy no rompe por poco: el único paso con sufijo es `setup.escenario.02`, 77
caracteres + `' (42)'` = 82. Con un `text` de 88 caracteres y un sufijo de 3 dígitos se pasa de
90 sin que nada avise, y el margen no está documentado en ningún sitio.

**Corrección:** bajar el tope de `text` para los pasos que declaren `value`, en el `superRefine`
que ya recorre todos los pasos (`schema.ts:147-217`):

```ts
// El <p> pinta `text` + ' (NNN)' — el presupuesto de 90 es del texto RENDERIZADO.
if (step.value === 'villainHealth' && step.text.length > 84) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Step "${step.id}" declares value:"villainHealth"; text must be <= 84 chars to leave room for the suffix`,
  })
}
```

---

#### WR-06: toda la superficie renderizada de la fase está sin cobertura — ni componente ni e2e

**Fichero:** `app/composables/__tests__/useGameSession.test.ts:121-187`, `app/components/StepScreen.vue:71-147`

**Problema:** los tests nuevos cubren únicamente las dos funciones puras (`buildStepValueSuffix`,
`buildStepValueCells`) y el módulo del motor. Lo que **no** está cubierto por ningún test de este
repositorio:

- Las computeds `stepValueSuffix` y `stepValueRows` (`useGameSession.ts:271-284`) — la única
  costura reactiva de la fase. El propio fichero de test lo declara a propósito («el cableado
  queda fuera del test»), pero eso deja sin verificar el detalle que sí importa: que
  `stepValueRows` devuelva `null` y no `[]` cuando no hay filas, que es lo único que hace que el
  bloque no exista en el DOM.
- La plantilla: que el sufijo caiga dentro del mismo nodo de texto (D-08), que la lista sea
  `<div>` y no `<button>` (D-32), que con `stepValueSuffix` a `null` el `<p>` quede idéntico
  carácter por carácter al de antes de la fase (D-15).

No hay `@vue/test-utils` en el proyecto y ninguna de las ocho specs de `e2e/` toca la Fase 8
(`grep -rln "Jugador 1 ·" e2e/` no devuelve nada). Todas esas decisiones están defendidas hoy
únicamente por comentarios en la plantilla que piden explícitamente que no se «unifiquen» los
bloques — un comentario no es un gate.

**Corrección:** una spec de Playwright que recorra el setup con 2 jugadores y héroes elegidos y
afirme (a) que en `setup.escenario.02` el `p.text-display` termina en `' (42)'`, (b) que en
`setup.heroes.03` hay dos filas y que `page.locator('main button', { hasText: 'Thor' })` tiene
count 0 (D-32: no pulsable), y (c) que sin ninguna selección el `<p>` no contiene `'('`.

---

#### WR-07: `items-center` + `overflow-y-auto` en el mismo elemento recorta el desbordamiento y lo hace inalcanzable

**Fichero:** `app/components/StepScreen.vue:69`

**Problema:**

```html
<main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
```

En un contenedor flex con `align-items: center`, un hijo más alto que el contenedor desborda
**por arriba** con margen negativo y el scroll no puede alcanzarlo: la primera línea del texto
grande queda cortada de forma permanente. Es un fallo conocido de CSS, y esta fase empuja
directamente hacia él: `setup.heroes.03` con 4 jugadores añade 4 filas de `min-h-12` (192 px) más
`gap-lg` bajo un `text-display` de 40 px/48 px de interlineado, sobre una pantalla que ya lleva
`AppHeader` y `NavBand`. `e2e/portrait-usable.spec.ts:52-63` comprueba explícitamente **solo** el
desbordamiento horizontal («el vertical hoy también es falso, pero assertarlo sería frágil»), así
que nada vigila esto.

**Corrección:** quitar el centrado del contenedor y centrar con márgenes automáticos en el hijo,
que sí es compatible con scroll:

```html
<main class="flex-1 bg-background flex flex-col px-2xl overflow-y-auto">
  <div class="w-full max-w-[960px] mx-auto my-auto flex flex-col items-center gap-lg text-center py-lg">
```

---

#### WR-08: la batería defensiva de `resolveStepValue` solo comprueba «no lanza», nunca el valor devuelto

**Fichero:** `engine/__tests__/stepValues.test.ts:146-156`

**Problema:** para los `playerCount` manipulados (`2.5`, `NaN`, `'3'`, `0`, `-1`), el test
afirma `Number.isFinite(r.value)` sobre las filas… pero de `resolveStepValue` solo comprueba
`.not.toThrow()`. Nunca se afirma qué devuelve. Hoy `computeInitialVillainHealth` lo protege
(`engine/counters.ts:32`), pero esa guarda vive en otro módulo y otra fase: si alguien la relaja,
`resolveStepValue('villainHealth', { playerCount: 2.5, … })` devolvería `35` y
`buildStepValueSuffix` lo daría por bueno (`Number.isFinite(35)`), pintando « (35)» a partir de
un `localStorage` editado a mano. El módulo se documenta como «nunca NaN», y eso no se prueba.

**Corrección:** añadir la aserción que falta en el mismo bucle:

```ts
const single = resolveStepValue('villainHealth', ctx, catalogue)
expect(single === null || Number.isInteger(single)).toBe(true)
```

### Info

#### IN-01: `StepValueRow.heroId` no lo consume nadie en producción

**Fichero:** `engine/stepValues.ts:39`, `:113`
El único consumidor real, `buildStepValueCells` (`useGameSession.ts:117-123`), usa `slot`,
`playerName`, `heroName` y `value`; `heroId` solo aparece en aserciones de test
(`stepValues.test.ts:89-90`, `:118`). O se usa (p. ej. como `key` en vez de `valor-{slot}`) o se
quita del contrato.

#### IN-02: el guardarraíl estructural de D-13 filtra comentarios con una regex de prefijo de línea

**Fichero:** `engine/__tests__/stepValues.test.ts:189-198`
`filter(line => !/^\s*\/\//.test(line) …)` solo descarta comentarios que **empiezan** la línea.
Un comentario al final (`const x = 1 // ojo con resolveCounterValues`) haría fallar el gate sin
que haya ninguna llamada; y a la inversa, `counters['resolveCounter' + 'Values']` lo esquivaría.
Es un guardarraíl razonable, pero conviene documentar la limitación junto al test para que quien
lo vea fallar no lo «arregle» debilitándolo.

#### IN-03: `slot` nombra dos cosas distintas dentro del mismo bucle de diez líneas

**Fichero:** `engine/stepValues.ts:96-118`
`slots.forEach((slot, index) => …)` usa `slot` para el **objeto de hueco** (`slot.heroId`,
`slot.playerName`) mientras el campo `slot` de la fila emitida es el **índice** (`slot: index`).
Renombrar el parámetro a `entry` (como ya hace `resolvePlayerSlots` en `selection.ts:59`) elimina
la colisión.

#### IN-04: nada impide que un paso declare `selection` y `value` a la vez

**Fichero:** `engine/schema.ts:79`, `:84`; `app/components/StepScreen.vue:88`, `:136`
Los dos flags son independientes en el esquema, y la plantilla pintaría la rejilla `ELECCIÓN` y
la lista de valores una debajo de otra — un estado que ninguna decisión de la fase contempla. Un
`superRefine` de dos líneas lo cierra, o un test que afirme que la intersección está vacía.

#### IN-05: no existe script `typecheck` ni `lint`, y CI no ejecuta ninguno

**Fichero:** `package.json:6-16`, `.github/workflows/ci.yml`
El workflow corre `npm run test` y Playwright. No hay `vue-tsc --noEmit` ni ESLint en ningún
sitio del repositorio, así que un error de tipos en una plantilla `.vue` (justo donde viven las
props nuevas de esta fase) no rompe la build. Es la única puerta que CLAUDE.md nombra —«fail
loudly at build»— y está a medias.

#### IN-06: el valor se ve pero nunca se locuta

**Fichero:** `content/marvel-champions.json:204-208`, `app/components/StepScreen.vue:77`
La pantalla dice «Ajustad el dial de vida del villano al valor indicado en la carta de villano.
**(42)**» y la voz dice la frase sin el número. La propuesta de valor del proyecto es «te dice —en
texto grande y **en voz alta**— qué sucede ahora». Está **fuera de alcance a propósito**
(VAL-04/05/06 y 08-CONTEXT.md:32-39 congelan `text`, `speech` y los 35 clips), así que no es un
defecto de la entrega — se deja registrado como deuda para que no se pierda al cerrar la fase.

#### IN-07: el comentario de `buildStepValueSuffix` promete manejar entradas que su firma prohíbe

**Fichero:** `app/composables/useGameSession.ts:99-105`
El comentario dice «ante cualquier cosa que no sea un número finito (incluidos `null`,
`undefined` y `NaN`)», pero la firma es `(value: number | null)`: `undefined` no compila y `NaN`
no es alcanzable desde `resolveStepValue`. O se amplía la firma a `number | null | undefined`
(coherente con el estilo defensivo del resto del fichero), o se recorta el comentario a lo que la
firma permite.

#### IN-08: convención de props inconsistente en `StepScreen`

**Fichero:** `app/components/StepScreen.vue:5-58`
`warningText`, `options`, `optionsWarningText`… son **requeridas** con `| null`; `selectionRows`,
`duplicateWarningText`, `stepValueSuffix` y `stepValueRows` son **opcionales con default `null`**.
Las dos convenciones conviven en el mismo `defineProps` sin que nada explique la diferencia, y la
opcional es la más débil: olvidar `:step-value-suffix` en un llamador futuro no da ningún error.
Unificar en «requerida y nullable», que es la mayoría y la que TypeScript vigila.

---

_Revisado: 2026-09-09T15:05:00Z_
_Revisor: Claude (gsd-code-reviewer)_
_Profundidad: standard_
