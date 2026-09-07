# Phase 5: Catálogo de héroes y villanos - Research

**Researched:** 2026-09-07
**Domain:** Extracción de datos vía API pública (MarvelCDB), validación Zod de contenido estático, script de generación reproducible
**Confidence:** HIGH — todos los hallazgos críticos (códigos de carta, forma de `linked_card`, trampa de `hand_size`, estructura de Kang, códigos de error de la API) están verificados en vivo esta misma sesión contra `https://marvelcdb.com`, no solo citados de `STACK.md`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** El catálogo contiene **solo lo que el grupo tiene en casa: 23 héroes y
  3 villanos**, no todo lo que MarvelCDB conozca. Descartado meter los ~60 héroes
  de MarvelCDB y filtrar en la app.
- **D-02:** **Villanos (3):** Rhino, Kang, Ultron. **Klaw queda fuera a propósito**
  aunque venga en el Core Set — el grupo no lo juega. Ningún test debe "corregirlo".
- **D-03:** **Héroes (23):** Core Set (5): Spider-Man, Captain Marvel, She-Hulk,
  Iron Man, Black Panther. De packs sueltos (18): Captain America, Ms. Marvel,
  Thor, Black Widow, Doctor Strange, Hulk, Ant-Man, Wasp, Quicksilver, Scarlet
  Witch, Drax, Valkyrie, Vision, Nova, Storm, Deadpool, Iceman, Jubilee. Los
  nombres los dictó el usuario; los códigos de carta estaban sin resolver — este
  research los resuelve.
- **D-04:** Qué entra se declara como una **lista explícita de ids de carta al
  principio del script**. Un héroe = una fila. Descartado declarar códigos de
  pack y barrer sus héroes, y descartado un fichero de datos aparte con la lista.
- **D-05:** Si un id de la lista **no aparece** en MarvelCDB, el script **aborta
  sin escribir nada** e informa de cuál falta. Descartado escribir lo encontrado
  con un aviso por consola. Descartado también fijar el recuento exacto (23+3)
  dentro del test de Vitest.
- **D-06:** **Kang recibe el mismo trato.** Si el script no consigue mapear sus
  etapas limpiamente, **aborta** en vez de escribir a Kang parcial.
- **D-07:** El catálogo guarda **únicamente el nombre de MarvelCDB, en inglés,
  tal cual, en una sola columna** — sin etiqueta traducida. Descartado guardar
  solo el nombre español a mano.
- **D-08:** Atenuante registrado, no trabajo de esta fase: los nombres de alter
  ego no se traducen, así que el filtro por alter ego seguirá funcionando aunque
  las cartas estén en español.
- **D-09:** **No hay capa de overrides y nadie edita el JSON a mano, nunca.** Un
  número equivocado significa que la regla de extracción está mal, y se corrige
  en el script. Caso concreto: el `hand_size` correcto vive en la carta de
  **alter ego** (`linked_card`), no en la de héroe.
- **D-10:** El fichero es **determinista puro: sin `generatedAt` ni ninguna marca
  temporal**. Re-ejecutar el script sin cambios en MarvelCDB debe dejar `git diff`
  **vacío**. Descartado explícitamente el patrón de `scripts/voice/manifest.json`
  (que sí lleva `generatedAt`), y descartada también la variante "sin fecha pero
  con versión de packs".
- **D-11:** La vida del villano se guarda **por etapa, como base + banderas, tal
  como la da la API**: `{ health, healthPerHero, healthPerGroup }`. La
  multiplicación por nº de jugadores la hace la app en la **Fase 7**. Descartado
  precomputar la tabla `healthByStage[etapa][jugadores]`. Descartado guardar
  ambas cosas. La etapa llega como numeral romano en string (`"I"|"II"|"III"`),
  no como entero — hay que mapearla explícitamente.

### Claude's Discretion

El usuario no quiso discutir estas y quedan a criterio de research/planning,
siempre que respeten las decisiones de arriba:
- Nombre y ubicación del fichero (la investigación propone
  `content/marvel-characters.json`, mismo escalón que `content/marvel-champions.json`).
- Un fichero o dos (héroes y villanos juntos vs. separados).
- Nombre y ubicación del script (la investigación propone `scripts/catalogue/` o
  `scripts/marvelcdb/`, siguiendo `scripts/voice/`).
- Qué cifras de héroe entran además de vida y tamaño de mano — CAT-01 exige
  nombre de héroe, nombre de alter ego, vida y tamaño de mano como mínimo.
- Forma exacta del guardarraíl anti-copyright de CAT-04 (proyección de lista
  blanca en el script + algún test que rechace claves como `text`, `flavor`,
  `imagesrc`). Que exista no es discrecional; su forma sí.
- Estructura del esquema Zod — la investigación propone un segundo fichero
  (`engine/catalogueSchema.ts`) en vez de ampliar `engine/schema.ts`.
- Cómo se documenta el procedimiento de CAT-03/CAT-07 (cabecera del script,
  entrada en `package.json`, o ambas).

### Deferred Ideas (OUT OF SCOPE)

- **Alias en español para el filtro de héroes** — idea para la Fase 6, no se
  toma ninguna decisión sobre ella ahora.
- **Que el catálogo tenga todos los héroes de MarvelCDB con una pantalla de "qué
  cajas tengo"** — descartado por D-01 para v1.8.
- **Cualquier UI para añadir o editar héroes desde la app** — sigue explícitamente
  fuera de alcance (Pitfall 14 y la exclusión permanente "editor de juegos desde
  la web" de `PROJECT.md`).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | Catálogo versionado de los 23 héroes con nombre, alter ego, vida inicial y tamaño de mano | Tabla completa de 23 héroes verificada en vivo (códigos, alter ego, health, handSize) — ver "Confirmación completa — tabla de 23 héroes" |
| CAT-02 | Catálogo versionado de los 3 villanos con vida por etapa, indicando si es por jugador o total | Tabla completa de 9 cartas de etapa (Rhino/Kang/Ultron) con `health`/`healthPerHero`/`healthPerGroup` verificados — ver "Confirmación completa — 3 villanos" |
| CAT-03 | Script committeado regenera el catálogo desde la API pública, uso documentado | Pattern 1-4 (Architecture Patterns), script `scripts/catalogue/fetch-marvelcdb.mjs` recomendado, mismo precedente que `scripts/voice/generate.mjs` |
| CAT-04 | Lista blanca de campos; ningún texto/cita/imagen entra al repo | Enumeración completa de claves reales de la API (hero + villain) y blocklist explícito en "Code Examples"; test de guardarraíl propuesto |
| CAT-05 | Esquema Zod validado en test de Vitest en CI | `engine/catalogueSchema.ts` propuesto con `z.strictObject`; `catalogueSchema.test.ts` + `characters.test.ts` mirroring el patrón existente |
| CAT-06 | Catálogo viaja en el bundle, cero red en ejecución | Confirmado por `ARCHITECTURE.md` §d — import estático cubierto por el `globPatterns` existente de Workbox; sin trabajo adicional en esta fase (el import en sí es Fase 6) |
| CAT-07 | Añadir héroe/villano nuevo documentado como procedimiento de una fila | Pattern 1 — lista literal de códigos declarada al principio del script; añadir una fila = añadir un héroe |

</phase_requirements>

## Summary

Esta fase no tiene incertidumbre de "qué API usar" — eso ya lo resolvió `STACK.md` — sino de "qué códigos de carta concretos y qué forma de esquema". Este research resuelve ambas cosas con datos reales: se ejecutaron 40+ llamadas HTTP contra `https://marvelcdb.com/api/public/*` esta sesión (packs, cards-por-pack, card-por-código) para los 23 héroes y los 3 villanos que dicta `05-CONTEXT.md` D-02/D-03, confirmando cada código de carta, cada trampa documentada en `STACK.md`, y descubriendo dos trampas nuevas que `STACK.md` no cubría: (1) el filtro correcto para packs con dos cartas `type_code:hero` (Ant-Man/Wasp tienen una forma alternativa "Giant-Man"/"Wasp" sin `linked_card`, hay que descartarla explícitamente), y (2) MarvelCDB devuelve **HTTP 500**, no 404, para un código de carta inexistente — importante para el `fetch()` que implementa D-05.

La estructura de Kang resultó ser exactamente tan distinta de Rhino/Ultron como D-06 anticipaba: su etapa II tiene **cuatro cartas alternativas** (Immortus / Iron Lad / Rama-Tut / Scarlet Centurion) bajo el mismo villano, más un segundo conjunto completo de dificultad "experta" (`card_set_code: exp_kang`) con salud más alta. La buena noticia, verificada en vivo: las cuatro alternativas de etapa II comparten idénticos `health`/`health_per_hero`/`health_per_group` (18/false/false), así que el catálogo puede tomar **cualquiera** de las cuatro como representante numérico sin perder información — el script no necesita abortar por esto, siempre que el `name` del villano se declare literalmente en la lista del script (no se derive del campo `name` de la carta de etapa II, que varía por alternativa).

**Primary recommendation:** un único fichero `content/marvel-characters.json`, un script `scripts/catalogue/fetch-marvelcdb.mjs` que declara 32 códigos de carta literales (23 héroes + 9 cartas de etapa de villano) y los resuelve vía `GET /api/public/card/{code}.json` (que ya embebe `linked_card`, sin llamada adicional), un segundo esquema `engine/catalogueSchema.ts` con `z.strictObject` en todo, y dos ficheros de test (`catalogueSchema.test.ts` + `characters.test.ts`) que replican el patrón ya existente de `schema.test.ts`/`content.test.ts`.

## Architectural Responsibility Map

Este proyecto no tiene backend (`CLAUDE.md` §Constraints); las "capas" reales son build-time tooling, contenido estático y navegador.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Obtención de datos de MarvelCDB | Build-time tooling (script Node, dev-only) | — | D-06 heredado de `scripts/voice/`: nunca corre en build/CI/Vercel; solo invocación manual del desarrollador |
| Proyección de lista blanca / guardarraíl anti-copyright | Build-time tooling | CI (test) | La proyección vive en el script; el test de CI es la red de seguridad redundante, no la única barrera |
| Validación de esquema (Zod) | CI / Node test-time | — | `zod` nunca cruza a `app/` (T-01-19); corre solo en Vitest |
| Almacenamiento del catálogo | Contenido estático (`content/*.json`) | — | Mismo escalón que `content/marvel-champions.json`, committeado, sin backend |
| Consumo en tiempo de ejecución (selector, contadores) | Browser/Client (bundle prerenderizado) | — | **Fuera de alcance de esta fase** — ninguna importación estática desde `app/` se crea aquí; es trabajo de la Fase 6 |

## Standard Stack

### Core
No hay dependencias nuevas que instalar. La fase reutiliza exactamente lo que ya está en `package.json`:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `^4.4.3` instalado (`npm view zod version` → `4.5.4` disponible en el registro, compatible con el rango `^4.4.3` ya fijado) [VERIFIED: npm registry] | Esquema del catálogo (`engine/catalogueSchema.ts`) | Ya es la herramienta de validación de contenido del proyecto (`engine/schema.ts`); ninguna razón para introducir una segunda librería de validación |
| Node global `fetch` | Node 22.17.1 en este entorno (`node --version`) [VERIFIED: entorno local] | Llamadas HTTP a MarvelCDB | Mismo patrón que `scripts/voice/generate.mjs` (Node 18+ trae `fetch` nativo); cero dependencias nuevas |

### Supporting
Ninguna. No hace falta un cliente HTTP de terceros, ni una librería de slugify (la función de slug es trivial y determinista, ver Code Examples), ni un CLI de scraping.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `GET /api/public/card/{code}.json` por carta (32 llamadas) | `GET /api/public/cards/{pack_code}.json` por pack (20 llamadas) | El endpoint por-pack es más eficiente en número de llamadas, pero obliga a filtrar dentro de un array grande (con la trampa Ant-Man/Wasp de dos cartas `hero`) y a conocer el `pack_code` de cada héroe. El endpoint por-carta declara exactamente D-04 ("una lista explícita de ids de carta... un héroe = una fila") sin ambigüedad ni paso de filtrado — se recomienda por-carta. |
| `content/marvel-characters.json` único | Dos ficheros (`content/marvel-heroes.json` + `content/marvel-villains.json`) | Separarlos no aporta nada aquí: mismo `gameId`, mismo ciclo de vida, mismos tres consumidores futuros (Fases 6/7/8) que casi siempre necesitan ambos a la vez. Un fichero es más simple y sigue el precedente de `content/marvel-champions.json` (un fichero por juego). |

## Package Legitimacy Audit

**No aplica: esta fase no instala ningún paquete npm nuevo.** `zod` ya es devDependency (`^4.4.3` en `package.json`, verificado con `npm view zod version` → registro sirve `4.5.4`, compatible). El script de generación usa exclusivamente el `fetch` global de Node — cero dependencias nuevas, cero superficie de auditoría de slopcheck que ejecutar.

## Architecture Patterns

### System Architecture Diagram

```
[Desarrollador, a mano — nunca build/CI/Vercel, D-06]
        │
        │ npm run catalogue:generate
        ▼
scripts/catalogue/fetch-marvelcdb.mjs
        │
        │ GET https://marvelcdb.com/api/public/card/{code}.json  × 32
        │   (23 códigos de héroe + 9 códigos de etapa de villano,
        │    declarados literalmente al principio del script — D-04)
        ▼
┌───────────────────────────────────────────────────┐
│ Por cada código:                                   │
│  1. fetch → si !response.ok (incl. HTTP 500 de     │
│     código inexistente) → abortar sin escribir      │
│     nada, informar qué código falló (D-05/D-06)     │
│  2. proyección de lista blanca (whitelist), NUNCA   │
│     spread del objeto crudo (guardarraíl CAT-04)    │
│  3. héroe: leer `hand_size` y `health` del          │
│     `linked_card` (alter-ego), NUNCA del lado héroe  │
│     (D-09, trampa confirmada en las 23 cartas)      │
│  4. villano: `name` viene de la lista declarada del  │
│     script, NUNCA del campo `name` de la API         │
│     (Kang varía por alternativa de etapa II)         │
│  5. `stage` romano → entero explícito (D-11)         │
└───────────────────────────────────────────────────┘
        │
        │ escribe determinista (D-10): sin generatedAt,
        │ orden de claves fijo, orden de array = orden
        │ declarado en el script, 2 espacios + \n final
        ▼
content/marvel-characters.json   (committeado, git diff vacío en re-ejecución sin cambios)
        │
        │ import estático (Anti-Patrón 3, mismo patrón que useGameContent.ts)
        │ — ESTA IMPORTACIÓN ES TRABAJO DE LA FASE 6, NO DE ESTA FASE
        ▼
[Bundle prerenderizado — Fase 6/7/8, fuera de alcance aquí]

═══════════ Camino de validación, en paralelo, en CI ═══════════

content/marvel-characters.json
        │
        ▼
engine/catalogueSchema.ts (z.strictObject en todo, CharacterCatalogueSchema)
        │
        ▼
engine/__tests__/characters.test.ts  (Vitest, corre en `npm test` / CI)
        │  también: grep/substring guard contra claves de copyright
        │  (text, flavor, imagesrc, real_text, traits, illustrator...)
        ▼
Build falla si el catálogo está malformado o contiene una clave de copyright
```

### Recommended Project Structure
```
content/
└── marvel-characters.json       # NUEVO — heroes[] + villains[], gameId 'marvel-champions'
engine/
├── catalogueSchema.ts           # NUEVO — segundo (y único otro) fichero que importa zod
├── schema.ts                    # MODIFICADO — solo la cabecera (ya no es "único fichero...")
└── __tests__/
    ├── catalogueSchema.test.ts  # NUEVO — tests unitarios del esquema (objetos sintéticos)
    └── characters.test.ts       # NUEVO — valida el fichero real + guardarraíl CAT-04
scripts/
└── catalogue/
    └── fetch-marvelcdb.mjs      # NUEVO — script de generación, invocado a mano
package.json                     # MODIFICADO — nuevo script "catalogue:generate"
```
**Nada bajo `app/` se toca en esta fase** (confirmado por CONTEXT.md; ver nota en Common Pitfalls sobre el alcance real de "ni el motor").

### Pattern 1: Extracción por código de carta declarado literalmente
**What:** el script declara arriba, como constante, la lista completa de 32 códigos con su nombre esperado — no pack codes, no barrido de packs.
**When to use:** exactamente el caso de esta fase (D-04).
**Example (verificado en vivo esta sesión):**
```javascript
// scripts/catalogue/fetch-marvelcdb.mjs — extracto ilustrativo
const HERO_CARDS = [
  { code: '01001a', expectedName: 'Spider-Man' },
  { code: '01010a', expectedName: 'Captain Marvel' },
  { code: '01019a', expectedName: 'She-Hulk' },
  { code: '01029a', expectedName: 'Iron Man' },
  { code: '01040a', expectedName: 'Black Panther' },
  { code: '03001a', expectedName: 'Captain America' },
  { code: '05001a', expectedName: 'Ms. Marvel' },
  { code: '06001a', expectedName: 'Thor' },
  { code: '08001a', expectedName: 'Black Widow' },
  { code: '09001a', expectedName: 'Doctor Strange' },
  { code: '10001a', expectedName: 'Hulk' },
  { code: '12001a', expectedName: 'Ant-Man' },   // NO 12001c (forma "Giant-Man", ver Pitfalls)
  { code: '13001a', expectedName: 'Wasp' },      // NO 13001c
  { code: '14001a', expectedName: 'Quicksilver' },
  { code: '15001a', expectedName: 'Scarlet Witch' },
  { code: '19001a', expectedName: 'Drax' },
  { code: '25001a', expectedName: 'Valkyrie' },
  { code: '26001a', expectedName: 'Vision' },
  { code: '28001a', expectedName: 'Nova' },
  { code: '36001a', expectedName: 'Storm' },
  { code: '44001a', expectedName: 'Deadpool' },
  { code: '46001a', expectedName: 'Iceman' },
  { code: '47001a', expectedName: 'Jubilee' },
]

const VILLAIN_STAGE_CARDS = [
  { villainName: 'Rhino', code: '01094', stage: 1 },
  { villainName: 'Rhino', code: '01095', stage: 2 },
  { villainName: 'Rhino', code: '01096', stage: 3 },
  { villainName: 'Ultron', code: '01134', stage: 1 },
  { villainName: 'Ultron', code: '01135', stage: 2 },
  { villainName: 'Ultron', code: '01136', stage: 3 },
  // Kang: etapa II tiene 4 alternativas narrativas (Immortus/Iron Lad/
  // Rama-Tut/Scarlet Centurion) con salud IDÉNTICA (18/false/false,
  // verificado en vivo). Se toma 11002 (Immortus) como representante
  // porque el número es indiferente entre alternativas. NUNCA usar el
  // card_set_code "exp_kang" (dificultad Experta alternativa, salud más
  // alta: 15/22/25) — este catálogo modela solo el modo estándar.
  { villainName: 'Kang', code: '11001', stage: 1 },
  { villainName: 'Kang', code: '11002', stage: 2 },
  { villainName: 'Kang', code: '11006', stage: 3 },
]
```

### Pattern 2: Lectura de `hand_size`/`health` desde `linked_card`, nunca del lado héroe
**What:** el campo `hand_size` del lado héroe es un modificador de habilidad (mismo nombre de campo, dato distinto); el real vive en `linked_card.hand_size`.
**Verificado en vivo para las 23 cartas, no solo para Iron Man** (tabla completa en Assumptions Log / cuerpo de este documento — ver sección "Confirmación completa").
```javascript
function extractHero({ code, expectedName }) {
  // GET https://marvelcdb.com/api/public/card/{code}.json
  // la respuesta YA incluye `linked_card` embebido, sin llamada adicional
  const card = /* ...fetch... */
  if (card.name !== expectedName) {
    throw new Error(`Código ${code}: esperaba "${expectedName}", API devolvió "${card.name}"`)
  }
  return {
    id: slug(card.name),
    name: card.name,                       // D-07: nombre inglés de MarvelCDB, verbatim
    alterEgo: card.linked_card.name,       // D-09: SIEMPRE del linked_card
    health: card.linked_card.health,       // idéntico en ambos lados, pero se fija UNA fuente
    handSize: card.linked_card.hand_size,  // D-09: SIEMPRE del linked_card, nunca card.hand_size
  }
}
```

### Pattern 3: Etapa romana → entero explícito
```javascript
const STAGE_MAP = { I: 1, II: 2, III: 3 }

function extractVillainStage({ villainName, code, stage }) {
  const card = /* ...fetch... */
  const apiStage = STAGE_MAP[card.stage]
  if (apiStage !== stage) {
    throw new Error(`Código ${code}: se declaró etapa ${stage} pero la API dice "${card.stage}" (${apiStage})`)
  }
  return {
    stage,
    health: card.health,
    healthPerHero: card.health_per_hero,
    healthPerGroup: card.health_per_group,
  }
}
```

### Pattern 4: Determinismo (D-10)
```javascript
function writeCatalogue(heroes, villains) {
  // Orden = orden de HERO_CARDS/VILLAIN_STAGE_CARDS declarado arriba,
  // NUNCA orden de resolución de promesas (si se paraleliza el fetch,
  // reordenar antes de escribir).
  const catalogue = {
    gameId: 'marvel-champions',
    heroes,    // ya en el orden declarado
    villains,  // agrupado por villano, stages en 1,2,3
  }
  // Mismo patrón de formato que manifest.json, SIN generatedAt (D-10
  // descarta explícitamente ese campo para este fichero).
  writeFileSync('content/marvel-characters.json', `${JSON.stringify(catalogue, null, 2)}\n`)
}
```

### Anti-Patterns to Avoid
- **Spread del objeto crudo de la API en el catálogo:** `{ ...card }` metería `text`, `flavor`, `imagesrc`, `traits`, `illustrator` — exactamente lo que CAT-04 prohíbe. Usar siempre una proyección explícita campo a campo.
- **Derivar el `name` del villano de la carta de etapa II de Kang:** varía entre "Immortus"/"Iron Lad"/"Rama-Tut"/"Scarlet Centurion" según qué alternativa se declare. El nombre del villano debe salir de la lista declarada en el script (D-02), nunca del campo `name` de esa carta concreta.
- **Asumir que "hero-side `hand_size`" es un caso especial de Iron Man:** es universal. Verificado: las 23 cartas de héroe tienen `hand_size` de lado-héroe distinto (o casualmente igual, Vision) del real; el real SIEMPRE está en `linked_card.hand_size`.
- **Tratar HTTP no-200 solo como "404 = no existe":** MarvelCDB devuelve **500** para un código inexistente, con cuerpo `{"error":{"code":500,"message":"Internal Server Error"}}`. `!response.ok` ya lo captura correctamente (fetch marca `.ok = false` para 500 también) — pero no asumir que solo hay que comprobar `status === 404`.
- **Asumir que un pack con "un héroe" tiene una sola carta `type_code: hero`:** `ant.json` y `wsp.json` tienen DOS cada uno (`12001a`/`13001a` con `linked_card`, y `12001c`/`13001c` sin él — una forma alternativa "Giant-Man"/variante de Wasp sin identidad secreta separada). El criterio correcto es "la carta con `linked_card` presente", no "la única carta de tipo hero del pack".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cliente HTTP con reintentos | Un wrapper de `fetch` con retry/backoff genérico | `fetch()` global desnudo, sin retry | Este script es dev-time, de un solo uso por regeneración, con ~32 llamadas triviales; `scripts/voice/generate.mjs` SÍ necesita retry (429 de Gemini, cuota de pago) — MarvelCDB no tiene rate limit documentado ni observado, así que el retry ahí sería complejidad sin problema que resolver |
| Slugify de nombres a id | Una librería `slugify`/`kebab-case` de npm | Una función de 2 líneas (`toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`) | Los 26 nombres (23 héroes + 3 villanos) son ASCII simple, sin acentos ni caracteres especiales más allá de un punto ("Ms. Marvel") y espacios — una librería es peso sin beneficio para este dominio cerrado |
| Tabla precalculada `healthByStage[stage][jugadores]` | Multiplicar `health × N` en el script y guardar el resultado | Guardar `{health, healthPerHero, healthPerGroup}` crudo, multiplicar en Fase 7 | D-11 ya lo decide así explícitamente — no reabrir |

**Key insight:** todo en esta fase es deliberadamente pequeño y de un solo uso (26 filas, 32 llamadas HTTP, un script invocado a mano un puñado de veces al año). Cualquier abstracción genérica (cliente HTTP reutilizable, motor de slugs, sistema de plugins de extracción) sería sobre-ingeniería para el tamaño real del problema.

## Common Pitfalls

### Pitfall A: El alcance de "ni el motor" en CONTEXT.md no significa "cero archivos en `engine/`"
**What goes wrong:** un planner lee literalmente "esta fase no toca... ni el motor" y evita crear `engine/catalogueSchema.ts` o actualizar la cabecera de `engine/schema.ts`, dejando la cabecera ("único fichero que importa zod") falsa.
**Why it happens:** la frase de CONTEXT.md es ambigua fuera de contexto; pero el propio CONTEXT.md, en `<code_context>`, pide explícitamente actualizar esa cabecera "en el mismo cambio".
**How to avoid:** interpretar "ni el motor" como "ninguna lógica de flujo/paso existente cambia de comportamiento" (expand.ts, resolve.ts, navigator.ts, persistence.ts, GameDefinitionSchema y su lógica de validación de pasos quedan intactos) — no como "cero archivos nuevos o de cabecera en el directorio `engine/`". Añadir `engine/catalogueSchema.ts` como fichero nuevo y corregir la cabecera de `engine/schema.ts` es obligatorio, no una violación de alcance.
**Warning signs:** un plan que omite la tarea de actualizar la cabecera de `engine/schema.ts`.

### Pitfall B: Confundir "no consumido esta fase" con "no hay que decidir su forma"
**What goes wrong:** como Fase 6/7/8 son quienes leen el catálogo, es tentador dejar el `id` de cada héroe/villano sin definir ("ya lo decidirá quien lo consuma"). Pero el esquema Zod de ESTA fase debe fijar la forma exacta (incluida la clave `id`) porque es lo que CAT-05 valida.
**How to avoid:** fijar `id` como slug kebab-case determinista ahora, documentado en el esquema, para que Fase 6 no tenga que negociar una forma retroactivamente.

### Pitfall C: El HTTP 500 de un código inexistente puede confundirse con un fallo transitorio de red
**What goes wrong:** si el script implementa cualquier lógica de "reintentar en 5xx" (copiada, por ejemplo, del patrón de `scripts/voice/generate.mjs`, que SÍ reintenta 429/5xx de Gemini porque ahí sí son transitorios), un código de carta mal escrito generaría 3 reintentos inútiles antes de abortar, en vez de abortar inmediatamente con un mensaje claro.
**How to avoid:** NO copiar el patrón de retry de `scripts/voice/generate.mjs` para este script — MarvelCDB no tiene cuota de pago ni 429 documentado; un 500 aquí es información ("código inválido"), no ruido transitorio. Abortar en el primer fallo (D-05), sin retry.
**Warning signs:** el script de catálogo importa o reimplementa `RETRY_BACKOFFS_MS`.

### Pitfall D: Confiar en que `stage` sea siempre string romano en TODOS los `type_code`
**What goes wrong:** en el pack `toafk` las cartas `main_scheme` (no `villain`) usan `stage` como string arábigo (`"1"`, `"1A"`, `"2"`...), no romano. Un mapeo `STAGE_MAP` que se aplique ciegamente a cualquier carta con campo `stage` (en vez de solo a las 9 declaradas de `type_code: villain`) fallaría de forma confusa.
**How to avoid:** el script solo toca los 9 códigos de etapa de villano explícitamente declarados (Pattern 1); no recorre packs completos buscando cartas con `stage`.

### Pitfall E: Confirmado — Pitfall 10/11/12 de PITFALLS.md (vida plana, scrape irreproducible, texto con copyright)
Ya cubiertos por D-09/D-10/D-11/D-04 del CONTEXT.md; este research no añade matices nuevos más allá de confirmar en vivo que el guardarraíl de lista blanca es viable y necesario (ver enumeración completa de claves en la sección siguiente).

## Code Examples

### Enumeración de claves REALES observadas en una carta de héroe (verificado en vivo: `GET /api/public/card/01029a.json`, Iron Man)
Lado héroe: `pack_code, pack_name, pack_legacy, type_code, type_name, faction_code, faction_name, card_set_code, card_set_name, card_set_type_name_code, linked_to_code, linked_to_name, position, code, name, real_name, cost_per_hero, cost_star, text, real_text, quantity, hand_size, health, health_per_group, health_per_hero, thwart, attack, defense, base_threat_fixed, base_threat_per_group, base_threat_star, escalation_threat_fixed, threat_fixed, threat_per_group, deck_limit, traits, real_traits, meta, flavor, is_unique, hidden, permanent, double_sided, octgn_id, attack_star, thwart_star, defense_star, health_star, recover_star, scheme_star, boost_star, threat_star, escalation_threat_star, url, imagesrc, linked_card`.

`linked_card` (alter-ego, Tony Stark): añade además `pack_wave, id, set_position, subname, cost, boost, resource_energy, resource_physical, resource_mental, resource_wild, thwart_cost, scheme, attack_cost, defense_cost, recover, recover_cost, base_threat, escalation_threat, scheme_crisis, scheme_acceleration, scheme_amplify, scheme_hazard, threat, stage, deck_requirements, deck_options, restrictions, illustrator, back_text, back_flavor, back_name, errata, backimagesrc, card_set_parent_code`.

Enumeración de claves en una carta de villano (verificado: Rhino `01094` + Kang `11002`): `pack_code, pack_name, pack_legacy, type_code, type_name, faction_code, faction_name, card_set_code, card_set_name, card_set_type_name_code, position, set_position, code, name, real_name, cost_per_hero, cost_star, quantity, health, health_per_group, health_per_hero, scheme, attack, base_threat_fixed, base_threat_per_group, base_threat_star, escalation_threat_fixed, threat_fixed, threat_per_group, stage, traits, real_traits, flavor, is_unique, hidden, permanent, double_sided, octgn_id, attack_star, thwart_star, defense_star, health_star, recover_star, scheme_star, boost_star, threat_star, escalation_threat_star, url, imagesrc, spoiler, text (presente en algunas etapas, ausente en otras), illustrator (idem)`.

**Lista blanca (whitelist) recomendada — únicas claves que entran al catálogo committeado:**
- Héroe: `name` (lado héroe), `linked_card.name`, `linked_card.health` (o `health` del lado héroe — idénticos, se recomienda `linked_card.health` por consistencia con `handSize`), `linked_card.hand_size`.
- Villano: `name` (declarado en el script, no leído de la API), `stage` (mapeado a entero), `health`, `health_per_hero`, `health_per_group`.

**Blocklist explícito para el test de guardarraíl (CAT-04):** `text`, `real_text`, `flavor`, `traits`, `real_traits`, `back_text`, `back_flavor`, `back_name`, `imagesrc`, `backimagesrc`, `illustrator`, `octgn_id`, `url`, `meta`, `subname`, `boost`, `deck_requirements`, `deck_options`, `restrictions`, `errata`.

### Test de guardarraíl anti-copyright (además del `z.strictObject` del esquema)
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
Esto es redundante con `z.strictObject` (que ya rechazaría cualquiera de estas claves si el script las hubiera escrito), pero barato y sigue el mismo espíritu que Pitfall 12 de `PITFALLS.md` pide explícitamente: una segunda barrera independiente del esquema.

## Confirmación completa — tabla de 23 héroes (verificado en vivo esta sesión)

| Héroe (EN) | Código carta héroe | Pack | Alter ego | Código linked_card | Health | HandSize (linked_card) |
|---|---|---|---|---|---|---|
| Spider-Man | 01001a | core | Peter Parker | 01001b | 10 | 6 |
| Captain Marvel | 01010a | core | Carol Danvers | 01010b | 12 | 6 |
| She-Hulk | 01019a | core | Jennifer Walters | 01019b | 15 | 6 |
| Iron Man | 01029a | core | Tony Stark | 01029b | 9 | 6 |
| Black Panther | 01040a | core | T'Challa | 01040b | 11 | 6 |
| Captain America | 03001a | cap | Steve Rogers | 03001b | 11 | 6 |
| Ms. Marvel | 05001a | msm | Kamala Khan | 05001b | 10 | 6 |
| Thor | 06001a | thor | Odinson | 06001b | 14 | 5 |
| Black Widow | 08001a | bkw | Natasha Romanoff | 08001b | 9 | 6 |
| Doctor Strange | 09001a | drs | Stephen Strange | 09001b | 10 | 6 |
| Hulk | 10001a | hlk | Bruce Banner | 10001b | 18 | 5 |
| Ant-Man | 12001a | ant | Scott Lang | 12001b | 12 | 6 |
| Wasp | 13001a | wsp | Nadia Van Dyne | 13001b | 11 | 6 |
| Quicksilver | 14001a | qsv | Pietro Maximoff | 14001b | 9 | 6 |
| Scarlet Witch | 15001a | scw | Wanda Maximoff | 15001b | 10 | 6 |
| Drax | 19001a | drax | Drax | 19001b | 14 | 6 |
| Valkyrie | 25001a | valk | Brunnhilde | 25001b | 12 | 6 |
| Vision | 26001a | vision | Vision | 26001b | 11 | 5 |
| Nova | 28001a | nova | Sam Alexander | 28001b | 10 | 6 |
| Storm | 36001a | storm | Ororo Munroe | 36001b | 10 | 6 |
| Deadpool | 44001a | deadpool | Wade Wilson | 44001b | 9 | 6 |
| Iceman | 46001a | iceman | Bobby Drake | 46001b | 11 | 6 |
| Jubilee | 47001a | jubilee | Jubilation Lee | 47001b | 9 | 6 |

**Notas importantes:**
- **Vision** y **Drax** no tienen identidad secreta narrativa distinta — su `alterEgo` en la API es literalmente su propio nombre ("Vision", "Drax"). Esto es dato real de la API, no un error de extracción; el esquema debe aceptarlo sin advertencia especial.
- **Vision** es la única excepción de `handSize` distinta a 6 en `linked_card` además de Thor/Hulk (5): confirmado que `linked_card.hand_size` **no es universalmente 6** — el script debe leer el valor real en cada caso, nunca asumir 6 como constante.
- El campo `health` es **idéntico** entre lado héroe y `linked_card` en los 23 casos verificados (es el mismo personaje, una sola vida física en la mesa) — no hay divergencia que resolver ahí, a diferencia de `hand_size`.

## Confirmación completa — 3 villanos, 9 cartas de etapa (verificado en vivo)

| Villano | Etapa | Código | Pack | health | health_per_hero | health_per_group |
|---|---|---|---|---|---|---|
| Rhino | I | 01094 | core | 14 | true | false |
| Rhino | II | 01095 | core | 15 | true | false |
| Rhino | III | 01096 | core | 16 | true | false |
| Ultron | I | 01134 | core | 17 | true | false |
| Ultron | II | 01135 | core | 22 | true | false |
| Ultron | III | 01136 | core | 27 | true | false |
| Kang | I | 11001 | toafk (`card_set_code: kang`) | 12 | true | false |
| Kang | II | 11002 (representante; ver nota) | toafk (`card_set_code: kang`) | 18 | **false** | false |
| Kang | III | 11006 | toafk (`card_set_code: kang`) | 20 | true | false |

**Nota crítica sobre Kang (confirma D-06 exactamente):**
- El pack `toafk` (The Once and Future Kang) contiene, bajo `card_set_code: kang`, **6 cartas `villain`**, no 3: etapa I (1 carta, código `11001`), etapa II (**4 alternativas** — `11002` Immortus, `11003` Iron Lad, `11004` Rama-Tut, `11005` Scarlet Centurion, elegidas narrativamente durante la partida según decisiones previas), etapa III (1 carta, código `11006`).
- Las 4 alternativas de etapa II tienen **`health`, `health_per_hero`, `health_per_group` idénticos** (18/false/false) — verificado directamente. Esto significa que, a efectos puramente numéricos (que es todo lo que este catálogo guarda), **da igual cuál de las 4 se declare como representante** — se recomienda `11002` (Immortus, la primera en orden de `position`) sin que esto sea una decisión con impacto real en los datos.
- El pack también contiene un segundo conjunto paralelo completo bajo `card_set_code: exp_kang` (dificultad "Experta" alternativa del propio Kang, con salud más alta: 15/22/25 en vez de 12/18/20) — **el script debe declarar únicamente códigos de `card_set_code: kang`** (los enumerados arriba: `11001`, `11002`, `11006`), nunca los de `exp_kang` (`11034`, `11035`, `11039`), salvo que una decisión futura explícita quiera modelar también el modo experto (fuera de alcance de D-02/D-03 tal como están escritos).
- **`health_per_hero` difiere por etapa dentro del mismo villano** (true en I y III, false en II) — confirma que D-11's shape `{health, healthPerHero, healthPerGroup}` por etapa es indispensable; un esquema que asumiera "un solo flag por villano" (en vez de por etapa) fallaría silenciosamente aquí.
- **Ninguna de las 9 cartas de etapa requirió abortar** — la "estructura distinta" de Kang que D-06 anticipaba (4 alternativas en etapa II) sí es real, pero se resuelve limpiamente porque las 4 alternativas son numéricamente indistinguibles. El planner puede tratar Kang como un caso normal de 3 filas, documentando en el propio script (comentario) por qué se eligió `11002` entre las 4 posibles.

## Trampas de la API verificadas en vivo esta sesión

1. **`hand_size` del lado héroe es un modificador de habilidad, no el tamaño de mano real — confirmado universal, no solo Iron Man.** Verificado en las 23 cartas de héroe: el valor de `linked_card.hand_size` (6, salvo Thor=5, Hulk=5, Vision=5) es siempre distinto o coincidente por casualidad con el del lado héroe, y es el único correcto. [VERIFIED: llamada directa a la API]

2. **`linked_card` viene embebido en AMBOS endpoints** — se probó explícitamente: `GET /api/public/cards/{pack}.json` (array completo del pack) Y `GET /api/public/card/{code}.json` (carta individual) devuelven el objeto `linked_card` completo sin necesidad de una segunda llamada. No hace falta nunca resolver el alter-ego con una llamada aparte. [VERIFIED: dos llamadas directas comparadas]

3. **`stage` llega como string romano (`"I"`/`"II"`/`"III"`) en las 9 cartas de villano verificadas** — confirmado, hay que mapearlo explícitamente (`STAGE_MAP`). Ojo: en el mismo pack (`toafk`), las cartas `type_code: main_scheme` usan un formato de `stage` completamente distinto (arábigo con sufijo de letra: `"1"`, `"1A"`, `"2"`...) — el mapeo romano solo aplica a las cartas `type_code: villain`. [VERIFIED]

4. **Enumeración completa de claves con copyright** — ver sección "Code Examples" arriba; confirmado con JSON completo de Iron Man (héroe+alter-ego) y de Rhino/Kang (villano).

5. **Volumen de peticiones y ausencia de rate limit:**
   - Estrategia por-carta (recomendada, Pattern 1): **32 llamadas HTTP** (23 héroe + 9 etapa-villano).
   - Estrategia por-pack (alternativa considerada): 20 llamadas (packs distintos: `core` + 18 packs de héroe + `toafk`).
   - `curl -I` a `/api/public/cards/core.json` esta sesión: sin cabeceras `X-RateLimit-*`; `Cache-Control: max-age=600, public`; `Access-Control-Allow-Origin: *`. `robots.txt` sin reglas `Disallow`. `GET /api/doc` (vía WebFetch esta sesión) no menciona límite de tasa ni autenticación para `/api/public/*`. [VERIFIED, MEDIUM — ausencia de evidencia de límite, no garantía documentada de que no exista; irrelevante en la práctica dado que son 32 llamadas de un script dev-time ejecutado esporádicamente]
   - **Nuevo hallazgo no cubierto por STACK.md: un código de carta inexistente devuelve HTTP 500** (no 404), cuerpo `{"error":{"code":500,"message":"Internal Server Error"}}`. Verificado con el código sintético `99999z`. `!response.ok` de `fetch()` ya captura esto correctamente (500 también hace `.ok === false`) — no hace falta lógica adicional, pero si se copia el patrón de retry de `scripts/voice/generate.mjs` (que SÍ reintenta 5xx porque en Gemini son transitorios) esto retrasaría innecesariamente el abort de D-05. Ver Pitfall C.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Recomendación de mapear `stage` a entero (1/2/3) en vez de mantener el string romano en el esquema committeado | Pattern 3, esquema propuesto | Bajo — es una decisión de forma de dato, no de contenido; si se prefiere mantener el enum de string romano, el cambio es mecánico y no afecta la extracción ya verificada |
| A2 | Recomendación de tomar `11002` (Immortus) como representante de la etapa II de Kang entre las 4 alternativas | Confirmación de Kang | Ninguno numérico (las 4 alternativas son idénticas en `health`/flags, verificado) — solo importaría si una fase futura quisiera mostrar el nombre narrativo de la forma elegida, que no es el caso de CAT-01/02 |
| A3 | Recomendación de un único fichero `content/marvel-characters.json` (heroes+villains juntos) en vez de dos ficheros | Standard Stack / Alternatives Considered | Bajo — es reversible con un refactor menor; no hay decisión de CONTEXT.md que lo bloquee, es discrecional según el propio CONTEXT.md |
| A4 | Recomendación de nombrar el script `scripts/catalogue/fetch-marvelcdb.mjs` (no `scripts/marvelcdb/`) | Recommended Project Structure | Ninguno funcional — es una preferencia de naming consistente con `scripts/voice/`, ambas opciones ya estaban propuestas por CONTEXT.md como discrecionales |
| A5 | "No hay Terms of Use dedicado en marvelcdb.com que restrinja este uso más allá de lo que ya cubre la restricción legal propia del proyecto" | Trampas de la API, punto 5 | Bajo-Medio — ninguna sesión de research (esta ni la de `STACK.md`) ha localizado una página de ToS dedicada; si existiera y prohibiera scraping automatizado de nombres/cifras, habría que revisar el enfoque. Recomendado: si surge duda legal real, es una pregunta para el usuario, no una que este research pueda cerrar por sí solo |

## Open Questions

1. **¿El esquema debe fijar `stages` como array de longitud exactamente 3, o algo más flexible?**
   - What we know: los 3 villanos de esta fase tienen exactamente 3 etapas cada uno.
   - What's unclear: si un futuro villano comprado (fuera del alcance actual, pero CAT-07 anticipa "comprar una caja") tuviera 2 o 4 etapas, `z.array(VillainStageSchema).length(3)` fallaría y habría que tocar el esquema, no solo añadir una fila — matiz menor a D-04's "una sola fila", inherente al dominio (algunos villanos de Marvel Champions sí tienen recuentos de etapa distintos de 3 en general, aunque no estos 3).
   - Recommendation: aceptarlo como matiz documentado del script/esquema (comentario explícito), no bloqueante para esta fase — los 3 villanos actuales son homogéneos.

2. **¿Se debe verificar el `expectedName` contra el nombre real devuelto por la API, o basta con el código?**
   - What we know: el patrón propuesto (Pattern 1) incluye una aserción `card.name !== expectedName` como salvaguarda contra un código mal transcrito que por azar exista pero sea de otra carta.
   - What's unclear: si esto debe ser parte del gate de D-05 (abortar) o solo un aviso.
   - Recommendation: parte del gate de D-05 — un nombre inesperado es exactamente el tipo de "algo cambió y nadie lo decidió" que D-05 quiere capturar en vez de escribir en silencio.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (fetch global) | Script de generación | ✓ | 22.17.1 (verificado en este entorno) | — |
| Acceso de red a `marvelcdb.com` | Ejecución puntual del script (solo dev-time, nunca en build/CI) | ✓ | — (verificado con `curl`, 200 en todos los endpoints usados esta sesión) | Si la red falla en el momento de regenerar, el desarrollador simplemente reintenta más tarde — no bloquea build/CI porque el script nunca corre ahí |
| `zod` (ya instalado) | Esquema y tests | ✓ | `^4.4.3` en package.json / `4.5.4` en el registro | — |
| macOS / `afconvert` | — | N/A | — | Este script, a diferencia de `scripts/voice/generate.mjs`, **no necesita macOS** — no genera audio, solo JSON |

**Missing dependencies with no fallback:** ninguna.
**Missing dependencies with fallback:** ninguna — todo lo necesario ya está disponible en el entorno.

## Security Domain

Sin `security_enforcement: false` en `.planning/config.json`, se incluye esta sección por defecto, aunque la mayoría de categorías no aplican: esta fase no expone superficie de usuario final, no maneja sesiones ni autenticación, y su único "input externo" es una API pública de solo lectura consumida en tiempo de desarrollo, nunca en producción.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | El script no autentica contra nada; MarvelCDB no requiere clave para `/api/public/*` (verificado) |
| V3 Session Management | No | No hay sesión de usuario involucrada en esta fase |
| V4 Access Control | No | No hay control de acceso — es un script dev-time sin superficie expuesta |
| V5 Input Validation | Sí | El esquema Zod (`z.strictObject` en todo) es el control estándar — mismo patrón que `GameDefinitionSchema` |
| V6 Cryptography | No | No hay criptografía en esta fase |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Filtración de contenido con copyright al repo público (arte/texto de MarvelCDB) | Information Disclosure | Proyección de lista blanca explícita en el script + `z.strictObject` + test de guardarraíl independiente (ver Code Examples) |
| Catálogo escrito a medias (parcial) por un fallo silencioso a mitad de ejecución | Tampering (de los datos servidos a la mesa) | D-05/D-06: abortar sin escribir nada ante cualquier fallo, nunca escribir un fichero parcial |
| Suplantación de un código de carta por otro (transcripción errónea que por azar existe) | Tampering | Aserción `expectedName === card.name` antes de aceptar el dato (Pattern 1 + Open Question 2) |

## Sources

### Primary (HIGH confidence — verificado en vivo esta sesión, 2026-09-07)
- `https://marvelcdb.com/api/public/packs/` — lista completa de 63 packs, códigos confirmados (`curl`, HTTP 200)
- `https://marvelcdb.com/api/public/cards/core.json` — 205 cartas del Core Set; 5 héroes, Rhino (3 etapas), Ultron (3 etapas), Klaw (3 etapas, excluido por D-02) extraídos y verificados
- `https://marvelcdb.com/api/public/cards/toafk.json` — 58 cartas de "The Once and Future Kang"; estructura de 6+6 cartas de villano (kang/exp_kang) y 14 main_scheme confirmada
- `https://marvelcdb.com/api/public/cards/{cap,msm,thor,bkw,drs,hlk,ant,wsp,qsv,scw,drax,valk,vision,nova,storm,deadpool,iceman,jubilee}.json` — 18 packs de héroe individuales, un héroe cada uno confirmado (más las 2 cartas alternativas sin `linked_card` de `ant`/`wsp`)
- `https://marvelcdb.com/api/public/card/{code}.json` — endpoint por-carta individual probado directamente con 4 códigos válidos + 1 inválido (`99999z` → HTTP 500)
- `curl -I https://marvelcdb.com/api/public/cards/core.json` — cabeceras de caché/CORS, ausencia de `X-RateLimit-*`
- `curl https://marvelcdb.com/robots.txt` — sin reglas `Disallow`
- `WebFetch https://marvelcdb.com/api/doc` — confirma ausencia de mención de rate limit/auth/ToS en la documentación pública
- `content/marvel-champions.json`, `engine/schema.ts`, `engine/__tests__/{content,schema}.test.ts`, `scripts/voice/generate.mjs`, `app/composables/useGameContent.ts`, `content/games-index.ts`, `package.json` — leídos directamente del repo esta sesión

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` §c y `.planning/research/ARCHITECTURE.md` §d — investigación del hito, ahora re-verificada y ampliada en vivo por este research de fase

### Tertiary (LOW confidence)
- Ninguna — todos los hallazgos críticos de esta fase están verificados en vivo, no solo citados

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — cero dependencias nuevas, versiones verificadas contra el registro npm
- Códigos de carta / estructura de la API: HIGH — verificado en vivo con 40+ llamadas HTTP reales esta sesión, no solo citado de investigación previa
- Estructura de Kang: HIGH — verificado en vivo, incluida la salud idéntica entre las 4 alternativas de etapa II
- Ausencia de rate limit / ToS: MEDIUM — ausencia de evidencia documentada, no garantía positiva; irrelevante en la práctica dado el volumen trivial de llamadas

**Research date:** 2026-09-07
**Valid until:** MarvelCDB es una base de datos comunitaria estable de un juego con soporte activo; los códigos de carta de cartas ya publicadas no cambian salvo erratas raras. 90 días es razonable antes de re-verificar si la fase se retrasa mucho; si se planifica en las próximas 1-2 semanas, esta investigación sigue siendo válida sin re-chequeo.
