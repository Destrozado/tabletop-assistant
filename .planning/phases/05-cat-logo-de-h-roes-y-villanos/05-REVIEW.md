---
phase: 05-cat-logo-de-h-roes-y-villanos
reviewed: 2026-09-07T17:48:31Z
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
  critical: 2
  warning: 11
  info: 5
  total: 18
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-09-07T17:48:31Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The phase delivers what it claims structurally: hand-written zod-free types in `engine/types.ts`, a `z.strictObject`-only schema in `engine/catalogueSchema.ts`, a whitelist-projection generator in `scripts/catalogue/fetch-marvelcdb.mjs`, and three Vitest gate files. All 236 engine tests pass (`npx vitest run --project engine`). Security posture of the generator is clean: no secrets, no `eval`, no shell, no child processes, no user-controlled input, single hardcoded HTTPS host, and no path interpolation from network data.

That said, two defects are blocking and both sit inside the *guardrails themselves*, which is the worst place for them.

1. **Rules fidelity (CR-01).** `handSize` stores only the alter-ego hand size for every hero, and the script's D-09 comment asserts as fact that the hero-side `hand_size` "es un modificador de habilidad ... no el tamaño de mano real". The official Rules Reference v1.7 — the source `CLAUDE.md` §Constraints makes mandatory — contradicts this directly: Appendix III card anatomy item 14 defines Hand Size as a per-card value ("The number of cards this card's controller resets their hand to each round"), and the Spider-Man identity example prints `HAND SIZE 5 / HIT POINTS 10` on the hero side against `HAND SIZE 6 / HIT POINTS 10` on the Peter Parker side. The catalogue committed 6.
2. **The anti-copyright gate fails open (CR-02).** `engine/__tests__/characters.test.ts` validates the catalogue at *module scope*. I verified empirically that a module-scope throw makes Vitest report `Tests  no tests` for that file — so any schema failure silently skips all 20 `FORBIDDEN_KEYS` assertions and every shape invariant. The file's own header comment claims the raw-string gate is "una segunda barrera INDEPENDIENTE de z.strictObject"; it is not.

Beyond those, the isolation gate has a trivially-walkable hole (npm `pre*`/`prepare` lifecycle hooks), the CAT-06 remote-reference gate is case-sensitive substring matching that a capitalised URL evades, and `alterEgo` is the single field written verbatim from the network with zero validation — the one value-level channel through which arbitrary MarvelCDB text can enter the public repo.

The data itself samples correct against the Rules Reference and the phase research apart from CR-01: Kang I/II/III = 12 per-hero / 18 flat / 20 per-hero matches the split-stage-II design, and Setup step 1 ("placing their alter-ego side face up") means the stored value happens to be right for the *setup* draw specifically.

## Critical Issues

### CR-01: `handSize` stores only the alter-ego value, justified by a false rules claim

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:187-197`, `engine/types.ts:131-141`, `content/marvel-characters.json` (all 23 heroes)

**Issue:** In Marvel Champions each *side* of an identity card prints its own Hand Size. Verified against `reference/mc_rulesreference_v17-compressed.pdf`:

- Appendix III, Card Anatomy item 14: *"Hand Size. The number of cards this card's controller resets their hand to each round."* — a property of the card side, not of the character.
- The same appendix's Spider-Man example prints `HAND SIZE 5 / HIT POINTS 10` (IDENTITY (HERO)) and `HAND SIZE 6 / HIT POINTS 10` (IDENTITY (ALTER-EGO), *peter parker*).
- Entry `HAND SIZE`: *"Each player checks their hand size at the end of the player phase, either discarding down to or drawing up to the number of cards indicated by their hand size value."*

So the hero-side `hand_size` returned by MarvelCDB is a real, rules-relevant number, not "un modificador de habilidad ... universal en las 23 cartas" as the D-09 comment asserts. Iron Man's hero-side `1` is his genuine printed hero hand size (his ability adds to it), which is exactly why it looks anomalous — it is not evidence that the field is bogus.

Consequences, in order of severity:

1. The comment encodes a wrong rules claim in the file that the project treats as the source of truth for extraction rules (D-09), so it will be trusted and propagated.
2. The catalogue permanently discards the hero-side value. Phase 7's end-of-player-phase step — which runs every round of the app's core loop — needs the value for the *current form*; with only `6` stored, a hero-form Spider-Man will be told to draw up to 6 instead of 5. That is precisely the "asistente que guía mal" outcome `CLAUDE.md` forbids.
3. Recovering the value later is not a schema tweak: it needs a script change plus a full re-fetch (32 requests, ~48 s).

Note the setup step is *not* wrong today: Appendix II Setup step 1 says *"Each player selects one identity, placing their alter-ego side face up"*, and step 14 draws to the hand size on the face-up side — so `6` is the correct setup number. The defect is the unqualified field name, the false justification, and the discarded hero value.

**Fix:** store both sides explicitly and delete the false claim.

```js
// scripts/catalogue/fetch-marvelcdb.mjs — extractHero
const { health, hand_size: alterEgoHandSize } = card.linked_card
const heroHandSize = card.hand_size
if (!Number.isInteger(heroHandSize) || heroHandSize <= 0) {
  throw new Error(`Código ${code} ("${card.name}"): hand_size del lado héroe no es un entero positivo (${heroHandSize})`)
}
return {
  id: slugify(card.name),
  name: card.name,
  alterEgo: card.linked_card.name,
  health,
  // RR v1.7 Apéndice III (anatomía de carta, punto 14): cada CARA imprime su
  // propio tamaño de mano (Spider-Man héroe 5 / Peter Parker 6). El chequeo de
  // final de fase de jugador usa el de la cara activa, así que hacen falta los
  // dos. Setup (Apéndice II, paso 1) empieza en alter ego -> alterEgoHandSize.
  handSizeHero: heroHandSize,
  handSizeAlterEgo: alterEgoHandSize,
}
```

Then rename in `engine/types.ts` / `engine/catalogueSchema.ts` accordingly (`handSizeHero`, `handSizeAlterEgo`, both `z.number().int().positive()`), regenerate, and check the two numbers per hero against the printed cards before committing. If storing both is out of scope for this phase, at minimum rename the field to `handSizeAlterEgo` so no downstream phase can mistake it for the hero-form value, and replace the D-09 comment with the RR citation.

### CR-02: the anti-copyright gate is structurally skipped whenever the schema fails

**File:** `engine/__tests__/characters.test.ts:14-17` (and the claim it falsifies, lines 19-27)

**Issue:** `rawText`, `rawCatalogue` and `catalogue` are computed at module scope, and line 17 calls `validateCharacterCatalogue(rawCatalogue)`, which throws on any schema violation. A throw during module evaluation is a *collection* failure in Vitest, not a test failure — every `it()` in the file is skipped. Verified empirically with an isolated probe file:

```
 FAIL  modulescope.test.ts [ modulescope.test.ts ]
Error: schema invalido
 Test Files  1 failed (1)
      Tests  no tests
```

So the moment the committed catalogue violates the schema for *any* reason (a stray key, a non-integer health, a duplicate id), all 20 `FORBIDDEN_KEYS` assertions and every shape invariant vanish from the run. The file header explicitly argues the raw-string gate exists to be independent of `z.strictObject` "si algún día se relajara el esquema (o hubiera un bug en él)" — but the coupling it warns about is exactly what the module-scope call creates. The `it('valida contra CharacterCatalogueSchema')` on line 64-66 also becomes a dead test: it can never be the thing that reports the failure.

This matters most in the scenario the gate was written for: a raw-key leak plus any second unrelated schema violation means CI reports a generic collection error and the copyright key is never named.

**Fix:** parse lazily inside the tests, and derive the validated object only where it is needed.

```ts
const contentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const rawText = readFileSync(contentPath, 'utf-8') // el gate crudo no necesita parseo

function loadValidatedCatalogue() {
  return validateCharacterCatalogue(JSON.parse(rawText))
}

describe('content/marvel-characters.json', () => {
  it('valida contra CharacterCatalogueSchema', () => {
    expect(() => loadValidatedCatalogue()).not.toThrow()
  })

  // ...los gates de CAT-04 siguen operando solo sobre `rawText`, sin depender del parseo

  describe('invariantes de forma sobre héroes', () => {
    const catalogue = loadValidatedCatalogue() // dentro del describe, no en el módulo
    // ...
  })
})
```

The same pattern applies to `engine/__tests__/catalogue-isolation.test.ts:26-30` — see WR-01.

## Warnings

### WR-01: the D-06 isolation gate misses every npm lifecycle hook, and passes vacuously on missing keys

**File:** `engine/__tests__/catalogue-isolation.test.ts:63-71`

**Issue:** `guardedEntries = ['build','generate','preview','dev','postinstall','test']` is an allowlist of six literal script names. Three concrete bypasses:

1. `"prebuild": "npm run catalogue:generate"` — npm runs `prebuild` automatically before `build`. The gate never looks at it. Same for `pregenerate`, `pretest`, `prepare` and `preinstall`. Guarding `postinstall` but not `prepare`/`preinstall` (both of which `npm ci` runs in CI, per `.github/workflows/ci.yml`) is an arbitrary line.
2. `packageJson.scripts?.[entryName] ?? ''` means a *renamed* entry passes silently. If `build` becomes `build:prod`, the guard for `build` still asserts `false === false` on an empty string and reports green.
3. The check is non-transitive: `"build": "npm run prep && nuxt build"` with `"prep": "npm run catalogue:generate"` passes.

Also `expect(ciWorkflowText.length).toBeGreaterThan(0)` on line 78 is a dead assertion — `readFileSync` at line 28 throws at module scope if `ci.yml` is missing, so the "existe" half of that test can never fail (same root cause as CR-02).

**Fix:** invert to a denylist over *all* scripts, and read files inside the tests.

```ts
it('D-06: ninguna entrada de scripts salvo catalogue:generate referencia el script', () => {
  const entries = Object.entries(packageJson.scripts ?? {})
  const offenders = entries
    .filter(([name]) => name !== 'catalogue:generate')
    .filter(([, value]) => referencesCatalogueScript(value))
    .map(([name, value]) => `${name}: ${value}`)
  expect(offenders, `entradas que referencian el script de catálogo: ${offenders.join(' | ')}`).toEqual([])
})
```

### WR-02: the CAT-06 remote-reference gate is case-sensitive substring matching and is evadable

**File:** `engine/__tests__/catalogue-isolation.test.ts:98-105`

**Issue:** The gate is three `not.toContain` calls on the raw JSON: `'http'`, `'marvelcdb'`, `'api'`. All are case-sensitive. A value such as `"HTTPS://MarvelCDB.com/card/01001a"` contains none of the three lowercase needles and passes all three assertions — and `MarvelCDB` is the *canonical* spelling used throughout this repo's own docs, so it is the most likely literal to appear.

The opposite failure also exists: `'api'` is an unanchored three-letter substring tested against arbitrary card names. It happens not to collide with the current 23 heroes and 3 villains (`Captain` is `c-a-p-t-a-i-n`, no `api`), but a future name or alter ego containing that trigram fails the build with a message that says nothing about why. A brittle gate that both over- and under-matches will be deleted the first time it fires spuriously.

**Fix:** lowercase once and assert on URL-shaped patterns rather than the trigram `api`.

```ts
const lowered = catalogueContentText.toLowerCase()
expect(lowered).not.toMatch(/https?:\/\//)
expect(lowered).not.toContain('marvelcdb')
expect(lowered).not.toContain('/api/')
```

### WR-03: `alterEgo` is the only field written verbatim from the network with no validation

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:180-197`

**Issue:** `health` and `handSize` get explicit `Number.isInteger(...) && > 0` gates, `card.name` is pinned against `expectedName`, `type_code` is pinned, `linked_card` presence is pinned. `card.linked_card.name` is pinned against nothing and validated as nothing. Two consequences:

1. If `linked_card.name` is missing, `alterEgo` becomes `undefined`, `JSON.stringify` **drops the key entirely**, `writeCatalogue` succeeds, and the script prints `Escritos 23 héroes ...` and exits 0. A schema-invalid catalogue is now on disk with a success message; only a later `npm test` catches it.
2. It is the sole *value*-level channel into the repo. The whitelist projection (CAT-04) protects against unexpected *keys*, but nothing constrains the *content* of this string — an API glitch, a vandalised entry, or a mis-keyed `code` puts arbitrary MarvelCDB text into a public repo, which is the exact risk CAT-04 exists to close. `05-02-PLAN.md:105` already tabulates the expected alter ego per hero, so pinning is free.

**Fix:** add `expectedAlterEgo` to each `HERO_CARDS` row and gate it like `expectedName`.

```js
{ code: '01001a', expectedName: 'Spider-Man', expectedAlterEgo: 'Peter Parker' },
// ...
if (card.linked_card.name !== expectedAlterEgo) {
  throw new Error(`Código ${code} ("${card.name}"): se esperaba alter ego "${expectedAlterEgo}" pero la API devolvió "${card.linked_card.name}"`)
}
```

### WR-04: the generator can write a schema-invalid catalogue and report success

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:236-270`

**Issue:** `main()` has no pre-write consistency check over the assembled object and no post-write validation, so several developer mistakes produce a written file plus a green success line:

- A duplicated `HERO_CARDS` row (easy when adding a hero by copy-paste) yields two heroes with the same `id` — written, success, then CI fails on the schema's dupe check.
- Villain stage rows declared out of order (e.g. Rhino 3 before Rhino 1) yield `stages: [3,1,2]`, because grouping preserves declaration order — written, success, then CI fails on the consecutiveness check.
- `alterEgo: undefined` (WR-03).

The header's D-05/D-09 comment promises "Ninguna escritura parcial ... puede ocurrir jamás", but the invariant that actually matters — *nothing invalid gets written* — is not enforced anywhere in the script. The `zod` schema is a devDependency and this script is dev-only, so there is no isolation reason not to use it.

**Fix:** validate before writing. Minimum viable version without importing the TS schema:

```js
function assertCatalogueSelfConsistent(heroes, villains) {
  const heroIds = heroes.map(h => h.id)
  const dupeHeroes = heroIds.filter((id, i) => heroIds.indexOf(id) !== i)
  if (dupeHeroes.length) throw new Error(`Ids de héroe duplicados: ${[...new Set(dupeHeroes)].join(', ')}`)
  for (const h of heroes) {
    if (typeof h.alterEgo !== 'string' || h.alterEgo.trim() === '') {
      throw new Error(`Héroe "${h.name}": alterEgo vacío o ausente`)
    }
  }
  for (const v of villains) {
    if (!v.stages.every((s, i) => s.stage === i + 1)) {
      throw new Error(`Villano "${v.name}": etapas no consecutivas (${v.stages.map(s => s.stage).join(', ')}) — revisa el orden de las filas en VILLAIN_STAGE_CARDS`)
    }
  }
}
```

Call it immediately before `writeCatalogue(heroes, villains)`.

### WR-05: `STAGE_MAP` caps villains at three stages, contradicting CAT-07 and its own tests

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:65`, `engine/catalogueSchema.ts:103-115`, `engine/__tests__/catalogueSchema.test.ts:149-158`

**Issue:** The schema comment states that CAT-07 requires a future villain with a different stage count to be "una fila más en el script, no una edición de este esquema", and `catalogueSchema.test.ts` proves the schema accepts 2- and 4-stage villains. But `STAGE_MAP = { I: 1, II: 2, III: 3 }` has no `IV`, so a stage-IV card throws `valor de stage no mapeable ("IV")` and requires editing the script's constants — i.e. the documented one-row extension path does not actually hold for the case the tests advertise. The schema is flexible; the generator is not, and only the schema says so.

**Fix:** derive the mapping instead of enumerating it, and keep the abort for genuinely unparseable values.

```js
const ROMAN_VALUES = { I: 1, V: 5, X: 10 }
function parseRomanStage(value) {
  if (typeof value !== 'string' || !/^[IVX]+$/.test(value)) return undefined
  let total = 0
  for (let i = 0; i < value.length; i++) {
    const current = ROMAN_VALUES[value[i]]
    const next = ROMAN_VALUES[value[i + 1]]
    total += next > current ? -current : current
  }
  return total
}
```

### WR-06: `id === slugify(name)` makes duplicate identity titles unrepresentable

**File:** `engine/catalogueSchema.ts:82-101` (combined with the uniqueness check on lines 64-80)

**Issue:** The schema enforces both "ids are unique" and "id is exactly the slug of name". Together these force *names* to be unique — an assumption the game itself breaks. The Rules Reference v1.7 deckbuilding section states: *"If two unique cards share the same title, but their subtitles/alter-egos differ, they may coexist in the deck."* In practice that is the Spider-Man (Peter Parker) / Spider-Man (Miles Morales) case, and Miles is a shipped hero.

Adding him therefore requires editing `engine/catalogueSchema.ts` and `scripts/catalogue/fetch-marvelcdb.mjs`, not "una fila más" — the opposite of CAT-07. Worse, the natural disambiguator (`subname`) is on the `FORBIDDEN_KEYS` blocklist in `characters.test.ts:47`, so there is currently no sanctioned way to tell the two apart. The failure mode is at least loud (the dupe check fires), but the extension path documented in three places is blocked.

**Fix:** allow the row to declare an explicit id suffix while keeping the derivation checkable.

```js
// HERO_CARDS
{ code: '22001a', expectedName: 'Spider-Man', idSuffix: 'miles-morales' }
// id = [slugify(name), idSuffix].filter(Boolean).join('-')
```

In the schema, relax DC-02 from equality to prefix-with-slug:

```ts
if (hero.id !== expected && !hero.id.startsWith(`${expected}-`)) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Hero "${hero.name}" has id "${hero.id}", expected "${expected}" or "${expected}-<sufijo>"`,
  })
}
```

### WR-07: `fetch` has no timeout, and JSON-parse failures lose all card context

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:149-167`, `272-276`

**Issue:** Three related robustness gaps in the only network path:

1. `await fetch(...)` has no `AbortSignal`. Node's fetch will wait indefinitely on a stalled connection, so `main()` never settles and the process hangs with no output and no exit code. The comment on lines 158-164 documents that connection-timeout behaviour was *actually observed* against marvelcdb.com after ~9 requests, which makes an unbounded wait the empirically likely failure, not a theoretical one.
2. `await response.json()` is outside the error-context wrapper. If MarvelCDB returns HTTP 200 with an HTML interstitial, the thrown `SyntaxError` mentions neither the card code nor the URL — the developer sees `Unexpected token '<'` after ~48 s of pacing with no idea which of 32 requests failed.
3. `main().catch(error => console.error(error.message))` prints `undefined` for a non-`Error` rejection and discards the stack for every failure.

**Fix:**

```js
const REQUEST_TIMEOUT_MS = 15000

async function fetchCard(code) {
  const url = `${API_BASE}/card/${code}.json`
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) { /* ...igual que ahora... */ }
  let json
  try {
    json = await response.json()
  }
  catch (cause) {
    throw new Error(`Código ${code}: ${url} devolvió HTTP 200 con un cuerpo que no es JSON (${cause.message})`)
  }
  await sleep(REQUEST_DELAY_MS)
  return json
}
```

And in the tail handler: `console.error(error instanceof Error ? error.stack : String(error))`.

### WR-08: heroes and the catalogue root have no exhaustive-key check; the denylist covers ~20 of ~50 API keys

**File:** `engine/__tests__/characters.test.ts:33-54`, `148-155`

**Issue:** The strongest gate in the file is the D-11 test, which asserts the exact key set of each villain stage (`Object.keys(s).sort()` equals four names). That structural check is applied *only* to villain stages. Heroes and the catalogue root are protected solely by `z.strictObject` (which CR-02 shows can be skipped) plus a 20-entry denylist over the ~50 keys the API actually returns (enumerated in `05-RESEARCH.md:369`).

Notable omissions from the denylist: `"real_name":` (a verbatim card title, and explicitly present in the API response) and `"linked_card":` (an entire nested raw card object — the single highest-yield leak if anyone ever spreads the raw response). A denylist is the wrong shape for an "absence" guarantee: it must be maintained in lockstep with a third-party API's schema, and CAT-04's whole point is that the *only* acceptable keys are the nine known ones.

**Fix:** extend the D-11 pattern to heroes and the root, keeping the raw-string denylist as the belt-and-braces second layer.

```ts
it('CAT-04: las claves de cada héroe son exactamente las cinco previstas', () => {
  const expectedKeys = ['id', 'name', 'alterEgo', 'health', 'handSize'].sort()
  for (const hero of loadValidatedCatalogue().heroes) {
    expect(Object.keys(hero).sort(), `héroe ${hero.id} tiene claves inesperadas`).toEqual(expectedKeys)
  }
})

it('CAT-04: las claves de la raíz son exactamente gameId/heroes/villains', () => {
  expect(Object.keys(JSON.parse(rawText)).sort()).toEqual(['gameId', 'heroes', 'villains'])
})
```

Also add `'"real_name":'` and `'"linked_card":'` to `FORBIDDEN_KEYS`.

### WR-09: nothing checks that the catalogue's `gameId` matches the game definition

**File:** `engine/catalogueSchema.ts:60`, `engine/__tests__/characters.test.ts`

**Issue:** `gameId` is validated only as a kebab-case slug. `content/marvel-characters.json` declares `"marvel-champions"` and `content/marvel-champions.json` declares `"marvel-champions"`, but that agreement is coincidental — no test asserts it. A typo (`marvel-champion`) or a copy-paste when Warhammer 40.000 arrives passes every gate in this phase and only surfaces in Phase 6, where the catalogue would be silently paired with the wrong game (or with none). The field exists precisely to bind catalogue to game; the binding is unenforced.

**Fix:** add a cross-file gate in `characters.test.ts` (both files are already read-only fixtures there):

```ts
it('el gameId del catálogo coincide con el de la definición de juego', () => {
  const gamePath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
  const game = JSON.parse(readFileSync(gamePath, 'utf-8')) as { gameId: string }
  expect(loadValidatedCatalogue().gameId).toBe(game.gameId)
})
```

### WR-10: `as unknown as CharacterCatalogue` severs the only link between schema and types, and CI never typechecks

**File:** `engine/catalogueSchema.ts:118-120`

**Issue:** `CharacterCatalogueSchema.parse(json) as unknown as CharacterCatalogue` is a double cast, so TypeScript verifies nothing about the relationship between the zod schema and the hand-written interface. `engine/types.ts:112-118` explains *why* the interfaces are hand-written rather than `z.infer`ed (keeping `zod` out of `app/`'s import graph, T-01-19/DC-03) — a sound reason — but the consequence is two independent declarations of the same shape with zero enforced correspondence. Rename `handSize` in one and not the other, or add a schema field, and nothing anywhere fails.

This is aggravated by `.github/workflows/ci.yml` having no typecheck step (only `npm run test` and Playwright) and `package.json` having no `typecheck` script, so even a real type error in this file would not fail CI.

Note this follows existing precedent (`engine/schema.ts:214-215` does the same for `GameDefinition`), so it is a pattern-level issue rather than a Phase 5 regression — but it now covers a second contract, which doubles the drift surface.

**Fix:** add a compile-time bidirectional assertion in `catalogueSchema.ts` — zero runtime cost, no `zod` leakage into `app/`:

```ts
import type { z as zTypes } from 'zod'

// Si el esquema y la interfaz derivan, estas dos líneas dejan de compilar.
type SchemaOutput = zTypes.infer<typeof CharacterCatalogueSchema>
const _schemaMatchesInterface: CharacterCatalogue = {} as SchemaOutput
const _interfaceMatchesSchema: SchemaOutput = {} as CharacterCatalogue
```

And add a `"typecheck": "nuxt typecheck"` step to `ci.yml`, without which the assertion never runs.

### WR-11: the catalogue carries no version marker, while persistence invalidates on `contentVersion`

**File:** `content/marvel-characters.json:1-3`, `engine/catalogueSchema.ts:59-62`

**Issue:** `engine/persistence.ts:78` discards a stored session when `persisted.contentVersion !== fresh.contentVersion`, and `content/marvel-champions.json` carries `contentVersion: 13` for exactly that purpose. The character catalogue has no equivalent field. Once Phase 6 persists a chosen hero id (`spider-man`) into `localStorage`, a later `npm run catalogue:generate` that renames or removes an id — or CR-01's inevitable `handSize` rename — leaves a mid-game session pointing at a hero that no longer exists, with no version mismatch to trigger invalidation. The rehydration path would have to defend against it by id lookup, which is a Phase 6 landmine created here.

D-10 correctly forbids a *timestamp* (it would break determinism), but a hand-bumped integer is deterministic and is already the established project pattern.

**Fix:** add `contentVersion: z.number().int().positive()` to `CharacterCatalogueSchema`, emit it from a `CATALOGUE_VERSION` constant in the generator (bumped by hand whenever the shape or the id derivation changes), and have Phase 6 treat a mismatch the way `persistence.ts` already treats the game's.

## Info

### IN-01: `CATALOGUE_PATH` is resolved against `process.cwd()`

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:63`, `240`

**Issue:** `writeFile('content/marvel-characters.json', ...)` depends on the shell's working directory. Run from anywhere but the repo root, the script either throws `ENOENT` after ~48 s of successful fetching or silently writes into an unrelated `content/` directory. Every test file in this phase resolves paths via `fileURLToPath(new URL(..., import.meta.url))`; the scripts do not (`scripts/voice/generate.mjs:64-65` has the same relative-path style, so this is existing convention rather than a new deviation).

**Fix:** `const CATALOGUE_PATH = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))`.

### IN-02: the pacing `sleep` also runs after the final request, and lives inside the fetch helper

**File:** `scripts/catalogue/fetch-marvelcdb.mjs:158-166`

**Issue:** `sleep(REQUEST_DELAY_MS)` sits after the JSON parse inside `fetchCard`, so the 32nd request also waits 1.5 s for a request that never comes. It also couples "fetch a card" to "pace the loop", which makes the helper harder to reuse and means a future parallel-fetch refactor would silently keep the delay while losing its purpose.

**Fix:** move the pause to the call sites in `main()` (`if (index < rows.length - 1) await sleep(REQUEST_DELAY_MS)`), or accept it as-is and note the 1.5 s as deliberate.

### IN-03: `heroes` and `villains` lack `.min(1)` while `stages` has it

**File:** `engine/catalogueSchema.ts:61-62`

**Issue:** `z.array(VillainStageSchema).min(1)` guards empty stages, but `heroes: z.array(HeroSchema)` and `villains: z.array(VillainSchema)` accept `[]`. An empty catalogue is schema-valid; only the separate non-empty assertions in `characters.test.ts:81-83`/`108-110` catch it — and per CR-02 those are the assertions that get skipped when the schema is the thing failing. Inconsistent strictness within one schema.

**Fix:** `heroes: z.array(HeroSchema).min(1)` and `villains: z.array(VillainSchema).min(1)`. This does not conflict with D-05 (no fixed count of 23/3 is imposed).

### IN-04: `VillainStage` breaks the `Catalogue*` naming convention and three exports are unused

**File:** `engine/types.ts:124-156`

**Issue:** `CatalogueHero` and `CatalogueVillain` carry the disambiguating prefix; `VillainStage` does not, in a module that also exports `StepDefinition`, `PhaseDefinition`, `SectionDefinition` and `GameDefinition` from a different domain. `CatalogueHero`, `CatalogueVillain` and `VillainStage` currently have no importers (`engine/catalogueSchema.ts` imports only `CharacterCatalogue`) — intentional, as they are the Phase 6 contract, but worth confirming they get consumed rather than re-declared there.

**Fix:** rename to `CatalogueVillainStage` for consistency while nothing imports it yet.

### IN-05: the intentional slugify duplication only fails CI for a subset of divergences, and mangles non-ASCII names

**File:** `engine/catalogueSchema.ts:24-33`, `scripts/catalogue/fetch-marvelcdb.mjs:134-143`

**Issue:** Two points on the deliberate duplication:

1. The stated safety property — "si las dos funciones divergen ... CI falla" — only holds for a divergence that changes the slug of a name *already in the committed catalogue*. A divergence affecting only characters absent from the current 26 names (a different apostrophe rule, say) is undetectable until someone adds an affected row.
2. Both implementations strip non-ASCII before slugifying, so an accented name silently loses characters rather than being transliterated: `"Ángel"` → `"ngel"`, which still matches `characterIdPattern` and therefore passes every gate. Irrelevant for the current English MarvelCDB names, but this is the same slug helper the Warhammer 40.000 phase will inherit.

**Fix:** for (1), add a shared table-driven test exercising both directions on edge names (`'Ms. Marvel'`, `'Spider-Man'`, `"T'Challa"`, `'SP//dr'`, `'X-23'`) so the two implementations are compared on inputs beyond the committed set. For (2), normalise before stripping: `name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()` — applied to *both* copies in the same commit.

---

_Reviewed: 2026-09-07T17:48:31Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
