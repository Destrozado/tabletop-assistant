# Phase 8: Valores conocidos dentro del paso - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 8 (2 modify-schema, 1 modify-content, 1 create-module, 1 create-test, 1 modify-composable, 1 modify-component, 1 modify-page)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `engine/schema.ts` | config (Zod schema) | transform (validate JSON → typed) | itself, `selection: z.enum(['characters']).optional()` at line 79 | exact (same file, direct precedent line) |
| `engine/types.ts` | model (TS interfaces) | transform | itself, `selection?: 'characters'` at line 55 | exact |
| `content/marvel-champions.json` | config (content data) | transform | itself, `setup.heroes.01`'s `"selection": "characters"` key | exact |
| `engine/stepValues.ts` (CREATE) | service (pure resolver) | transform | `engine/counters.ts` (computeInitialVillainHealth/computeInitialHeroHealth are inputs) + `engine/selection.ts` (defensive normalisation style) | role-match, structural sibling |
| `engine/__tests__/stepValues.test.ts` (CREATE) | test | transform | `engine/__tests__/counters.test.ts` + `engine/__tests__/selection.test.ts` | exact (structural sibling test suite) |
| `app/composables/useGameSession.ts` | provider (Vue↔engine seam) | transform | itself — `showsSelectionGrid`, `counterCells`, `buildCounterCells` (same file, same composable) | exact |
| `app/components/StepScreen.vue` | component | request-response (props in, emits out) | itself — `selectionRows` block (lines 59-97) | exact (literal mould per D-09) |
| `app/pages/[game]/index.vue` | route/page | request-response | itself — `selectionRows` computed (lines 378-411) + `<StepScreen>` prop wiring (lines 699-712) | exact |

## Pattern Assignments

### `engine/schema.ts` (config, transform)

**Analog:** itself, `StepSchema` definition

**Exact precedent to copy** (`engine/schema.ts:68-87`, the `StepSchema` extend block):
```typescript
const StepSchema = TextBlockSchema.extend({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  kind: z.enum(['step', 'summary']).default('step'),
  // D-02 (Fase 6): declara que este paso pinta la rejilla de selección de
  // villano/héroes. Enum de un solo miembro (no booleano) para que un
  // segundo valor futuro (p. ej. Warhammer 40.000) sea aditivo, no un
  // cambio incompatible ...
  selection: z.enum(['characters']).optional(),
  variants: z.strictObject({
    difficulty: z.strictObject({
      normal: TextBlockSchema.partial().optional(),
      expert: TextBlockSchema.partial().optional(),
    }).optional(),
  }).optional(),
  citation: CitationSchema.optional(),
})
```

**Pattern to apply:** add a sibling key, same shape as `selection`, e.g.:
```typescript
  value: z.enum(['villainHealth', 'heroHealth', 'handSizeAlterEgo']).optional(),
```
placed next to `selection` (both are single flags describing "which render branch", per `code_context` note). **Do not** add a `superRefine` rule for it — the context notes `selection` needed none ("no necesita regla en `superRefine`: ... es un flag solitario sin campo dependiente que pueda quedar huérfano"), and D-02 explicitly says `value` has the same property (no second "scope" field to keep in sync).

**Strictness reminder** (`engine/schema.ts:13-24` comment on `z.strictObject`): every object in this file is `z.strictObject`, never `z.object` — the new `value` key must be declared here or CI's schema test fails loudly, by design (CR-01).

---

### `engine/types.ts` (model, transform)

**Analog:** itself, `StepDefinition` interface

**Exact precedent to copy** (`engine/types.ts:43-60`):
```typescript
export interface StepDefinition extends TextBlock {
  id: string
  title: string
  kind: 'step' | 'summary'
  // D-02 (Fase 6): declara EN LOS DATOS que este paso pinta la rejilla de
  // selección de villano/héroes — nunca se cablea el id `setup.heroes.01`
  // en `app/` (TECH-04/D-24, misma disciplina que ya exige el índice de
  // salto). Enum de un solo miembro, no booleano, para que un segundo tipo
  // de rejilla (p. ej. Warhammer 40.000) sea aditivo en vez de un cambio
  // incompatible. No vive dentro de `TextBlock` porque no tiene ningún
  // campo dependiente y no debe poder variar por dificultad ...
  selection?: 'characters'
  variants?: {
    difficulty?: Partial<Record<Difficulty, Partial<TextBlock>>>
  }
  citation?: Citation
}
```

**Pattern to apply:** add `value?: 'villainHealth' | 'heroHealth' | 'handSizeAlterEgo'` next to `selection?`, mirroring the enum literally (this is the one file `app/` imports directly — no zod here, per header comment lines 1-4: "Cero imports de Vue/Nuxt/DOM ... este módulo se importa desde `app/`").

Also relevant in the same file — the catalogue types the resolver will read (`engine/types.ts:219-226, 192-202`):
```typescript
export interface CatalogueHero {
  id: string
  name: string
  alterEgo: string
  health: number
  handSizeHero: number
  handSizeAlterEgo: number
}
```
`stepValues.ts` reads `hero.handSizeAlterEgo` directly per D-07 (not `computeInitialHeroHandSize` — no such helper exists or is needed; it's a flat catalogue field, unlike health which needs `computeInitialHeroHealth`).

---

### `content/marvel-champions.json` (config/content, transform)

**Analog:** itself, `setup.heroes.01`'s existing `"selection": "characters"` key

**Exact precedent** (`content/marvel-champions.json:20-24`):
```json
{
  "id": "setup.heroes.01",
  "title": "Elegir villano y héroes",
  "kind": "step",
  "selection": "characters",
  "text": "Decidid, como grupo, qué villano vais a enfrentar y qué héroe llevará cada jugador.",
```
`selection` sits as a sibling key right after `"kind"`, before `"text"`. Copy the same insertion point for `"value"` in each of the four target steps.

**The four exact steps to modify** (add `"value": "..."` only, touching zero characters of `text`/`speech`):

1. `setup.escenario.02` (line 176-179 today):
```json
{
  "id": "setup.escenario.02",
  "title": "Ajustar dial de vida del villano",
  "kind": "step",
  "text": "Ajustad el dial de vida del villano al valor indicado en la carta de villano.",
```
→ insert `"value": "villainHealth",` after `"kind": "step",`.

2. `setup.heroes.03` (line 45-48):
```json
{
  "id": "setup.heroes.03",
  "title": "Ajustar dial de salud",
  "kind": "step",
  "text": "Ajustad vuestro dial de salud a la vida inicial de vuestra identidad.",
```
→ insert `"value": "heroHealth",`.

3. `setup.manos.02` (line 302-306):
```json
{
  "id": "setup.manos.02",
  "title": "Robar mano inicial",
  "kind": "step",
  "text": "Robad cartas hasta completar vuestra mano inicial.",
```
→ insert `"value": "handSizeAlterEgo",`.

4. `setup.manos.03` (line 314-320, the mulligan step — note it also carries `"warning"`, which stays untouched):
```json
{
  "id": "setup.manos.03",
  "title": "Mulligan",
  "kind": "step",
  "text": "Podéis descartar cartas de vuestra mano y robar de nuevo hasta vuestra mano inicial.",
  "warning": "No barajéis las descartadas de vuelta al mazo todavía",
```
→ insert `"value": "handSizeAlterEgo",` after `"kind": "step",`, before `"text"`.

**`contentVersion` stays at 13** (`content/marvel-champions.json:5`) — do not bump, per D-01 and the Phase 6 precedent of adding `selection` without bumping.

> **Addendum (plan 08-04, cierre de hueco).** Lo anterior sigue siendo cierto para los
> planes 08-01..03, que solo *añaden* la clave `value`. El plan **08-04 sí sube
> `contentVersion` 13 → 14**, y por tanto **se aparta de D-01 de forma deliberada y
> justificada**: reordenar `setup.escenario.04` delante de `.02` cambia lo que *significa*
> un cursor guardado, no solo lo que hay en el paso. Sin la subida, una partida reanudada
> en `setup.escenario.02`/`.03` caería **después** del paso de sustitución de cartas y
> nunca lo vería, reproduciendo exactamente el fallo CR-01 que 08-04 cierra. Ver la
> sección `<audit>` de `08-04-PLAN.md` para el razonamiento completo y el precedente
> PERS-03. No leas este bloque sin ese addendum.

---

### `engine/stepValues.ts` (CREATE — service, transform)

**Analogs:** `engine/counters.ts` (arithmetic to reuse + defensive style) and `engine/selection.ts` (normalisation contract: validate by TYPE, never throw, never return `undefined`)

**Imports pattern** (from `engine/counters.ts:1-18`, adapt paths):
```typescript
import { resolvePlayerSlots, resolveVillainId } from './selection'
import type { CatalogueHero, CatalogueVillain, CharacterCatalogue, Difficulty, EngineSession, SessionContext } from './types'
```
`stepValues.ts` additionally needs `computeInitialVillainHealth, computeInitialHeroHealth` from `./counters` (D-04: reuse, never reimplement):
```typescript
import { computeInitialHeroHealth, computeInitialVillainHealth } from './counters'
```

**Header-comment convention to imitate** (`engine/counters.ts:1-16`, `engine/selection.ts:1-18`): explain what contract this module follows (pure, no Vue) and what it does NOT do — for `stepValues.ts` the load-bearing negative is D-13: **must not import `resolveCounterValues`** in any branch (that function reads *frozen/persisted* counter state; this module must always read the catalogue's printed/base figures instead).

**Core pattern — per-player resolution, mirrors `resolveCounterValues`'s hero loop** (`engine/counters.ts:128-134`, structural template only — do NOT import `resolveCounterValues` itself, D-13):
```typescript
const slots = resolvePlayerSlots(context)
const heroHealth = persisted.heroHealth.map((frozen, i) => {
  if (Number.isFinite(frozen)) return frozen as number
  const slot = slots[i] ?? { heroId: null, playerName: '' }
  const hero = catalogue !== null ? catalogue.heroes.find(h => h.id === slot.heroId) ?? null : null
  return computeInitialHeroHealth(hero)
})
```
Adapt this shape for `stepValues.ts`'s per-player row builder: iterate `resolvePlayerSlots(context)`, look up each slot's hero in `catalogue.heroes`, and resolve either `computeInitialHeroHealth(hero)` or `hero.handSizeAlterEgo` (flat field, no compute function) depending on which `value` the step declares. **Skip rows with no hero found** (D-14 — partial selection, row-by-row, never all-or-nothing; do not fill a `null`/`'—'` placeholder — that's the deliberate difference from `resolveCounters`'s `'—'` convention, per D-14's note that this is NOT the same contract as the counter band).

**Villain lookup pattern** (`engine/counters.ts:113-117`, structural template only):
```typescript
const villainId = resolveVillainId(context)
const villain = catalogue !== null ? catalogue.villains.find(v => v.id === villainId) ?? null : null
const villainHealth = computeInitialVillainHealth(villain, context.playerCount, context.difficulty)
```
(No frozen-value branch here — D-13 forbids ever reading persisted/frozen counters for this module.)

**Defensive-normalisation contract to copy verbatim in spirit** (`engine/selection.ts:38-46` comment + `engine/counters.ts:74-82` comment): validate by TYPE not presence, never throw, never return `undefined` — if `catalogue` is `null` or an id isn't found, return `null` for that slot/value and let the caller (`useGameSession.ts`) decide to omit it from the rendered list (D-15: no selection at all → nothing renders; D-14: partial selection → only known rows render).

**Suggested exported shape** (per `Claude's Discretion` in CONTEXT.md — exact names open): a function resolving the villain-health parenthetical number (`number | null`) and a function resolving the per-player rows (array of `{ slot: number, heroId: string | null, playerName: string, value: number | null }` or similar, filtered to known values only by the caller/computed in `useGameSession.ts`, consistent with `buildCounterCells`'s split of "pure computation" vs "view-model shaping" — see below).

---

### `engine/__tests__/stepValues.test.ts` (CREATE — test, transform)

**Analog:** `engine/__tests__/counters.test.ts` (structure) + `engine/__tests__/selection.test.ts` (fixture/style)

**Fixture-loading pattern to copy exactly** (`engine/__tests__/counters.test.ts:1-38`):
```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import {
  computeInitialHeroHealth,
  computeInitialVillainHealth,
  // ... resolvers under test from '../stepValues'
} from '../counters'
import type { CatalogueVillain, CharacterCatalogue, EngineSession, GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

// Catálogo real (mismo patrón de persistence.test.ts al cargar
// marvel-champions.json): sin validador de esquema, eso ya lo cubre
// engine/__tests__/catalogueSchema.test.ts.
const catalogueContentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const catalogue: CharacterCatalogue = JSON.parse(readFileSync(catalogueContentPath, 'utf-8'))

const rhino = catalogue.villains.find(v => v.id === 'rhino')!
const thor = catalogue.heroes.find(h => h.id === 'thor')!
```
Reuse the exact same real fixtures/villains/heroes already proven in `counters.test.ts` (Rhino 3-player normal = 42, Thor health = 14) so numbers cross-check against the existing suite rather than inventing new expected values.

**Malformed-input coverage pattern to copy** (`engine/__tests__/counters.test.ts:88-100`, `describe('resolveCounters — normalización defensiva ...')`): a battery of bad `SessionContext`/`selection` shapes (`null`, wrong types, mismatched-length arrays, `NaN`), each asserted to not throw and to resolve to `null`/skipped rather than propagate garbage — apply the same battery to `stepValues.ts`'s resolvers.

**Villain-health reuse-of-arithmetic assertions to mirror** (`engine/__tests__/counters.test.ts:47-59`):
```typescript
it('computeInitialVillainHealth: Rhino normal con 3 jugadores es 42', () => {
  expect(computeInitialVillainHealth(rhino, 3, 'normal')).toBe(42)
})
```
`stepValues.test.ts` should assert its villain-health resolver returns the same 42 for the same fixture — proving D-04's "reuse, don't reimplement" and D-13's "always base/printed value, never frozen" simultaneously (e.g. seed `context.counters.villainHealth = 38` and still expect the step resolver to return 42, the literal D-13 scenario from CONTEXT.md).

**D-05 rules-fidelity assertion (load-bearing, must be in the suite):**
```typescript
// D-05: la mano inicial de setup.manos.02 usa handSizeAlterEgo, no handSizeHero.
it('handSizeAlterEgo de Spider-Man es 6, no 5 (handSizeHero)', () => {
  const spiderMan = catalogue.heroes.find(h => h.id === 'spider-man')!
  expect(spiderMan.handSizeAlterEgo).toBe(6)
})
```

---

### `app/composables/useGameSession.ts` (provider, transform)

**Analog:** itself — `showsSelectionGrid` (visibility-from-data pattern), `counterCells`/`buildCounterCells` (pure-function-plus-computed split), `currentText` (per-node resolution)

**Import block to extend** (`app/composables/useGameSession.ts:9-30`):
```typescript
import {
  decrementHero as engineDecrementHero,
  decrementVillain as engineDecrementVillain,
  incrementHero as engineIncrementHero,
  incrementVillain as engineIncrementVillain,
  resolveCounterValues,
} from '~~/engine/counters'
import { expand } from '~~/engine/expand'
import { describeHeader } from '~~/engine/header'
import { jumpTo as engineJumpTo, next as engineNext, prev as enginePrev } from '~~/engine/navigator'
import { resolveAudioId, resolveText } from '~~/engine/resolve'
import {
  resolvePlayerSlots,
  resolveVillainId,
  setHero as engineSetHero,
  setPlayerName as engineSetPlayerName,
  setVillain as engineSetVillain,
} from '~~/engine/selection'
import type { CounterState, EngineSession, RuntimeStepNode, SessionContext, TextBlock } from '~~/engine/types'
import { useCharacterCatalogue } from './useCharacterCatalogue'
import { useGameContent } from './useGameContent'
import { resolvePlayerLabel } from './useHeroSearch'
```
Add `import { /* resolver names */ } from '~~/engine/stepValues'`.

**Visibility-from-data precedent to copy exactly** (`app/composables/useGameSession.ts:184-192`):
```typescript
// showsSelectionGrid (D-02/TECH-04): único sitio de toda la app que
// decide qué paso pinta la rejilla de selección, y lo decide leyendo la
// clave del dato, jamás comparando contra el identificador fijo del paso
// de héroes ... La comparación es de igualdad estricta a propósito: el
// contenido llega al navegador como JSON crudo sin pasar por el validador
// de esquema, así que la clave puede estar simplemente ausente.
const showsSelectionGrid = computed<boolean>(() => currentNode.value?.step.selection === 'characters')
```
Pattern to apply for the new computeds: read `currentNode.value?.step.value` (strict equality against each of the three enum members, not a truthy check), matching the same "raw JSON, key may be absent" caveat.

**Pure-function + computed split to copy** (`app/composables/useGameSession.ts:48-82, 213-219`, `buildCounterCells` and `counterCells`):
```typescript
export function buildCounterCells(
  values: CounterState,
  slots: { heroId: string | null, playerName: string }[],
): CounterCell[] {
  // ... pure transform, exported and unit-testable
}
// ...
const counterCells = computed<CounterCell[]>(() => {
  if (!session.value) return []
  const catalogue = getCatalogue(session.value.gameId)
  const values = resolveCounterValues(session.value.context, catalogue)
  const slots = resolvePlayerSlots(session.value.context)
  return buildCounterCells(values, slots)
})
```
Apply the same split: a small pure "view-model" builder (either co-located here, exported and tested, or living entirely in `engine/stepValues.ts` per D-04's "logic vive en el motor" — CONTEXT.md's discretion note leaves this open, but the engine-first placement is consistent with D-04's explicit rejection of "resolverlo como computed en `useGameSession.ts`: sacaría lógica pura de la capa que tiene tests unitarios"). The computed here should be a thin wrapper: call `getCatalogue(session.value.gameId)`, call the `engine/stepValues.ts` resolver with `currentNode.value.step.value`, `session.value.context`, and `catalogue`.

**Player-label reuse precedent** (`app/composables/useGameSession.ts:66-79`, inside `buildCounterCells`):
```typescript
const heroCells: CounterCell[] = slots.map((slot, i) => {
  const health = values.heroHealth[i] ?? null
  const defeated = health === 0
  const baseLabel = resolvePlayerLabel(i, slot.playerName)
  return {
    key: `jugador-${i}`,
    label: defeated ? `${baseLabel}${DEFEATED_SUFFIX}` : baseLabel,
    displayValue: health === null ? '—' : String(health),
    defeated,
  }
})
```
Use `resolvePlayerLabel(i, slot.playerName)` the same way for the new list's "Jugador N · HeroName" label (D-04 of Phase 7, reiterated by CONTEXT.md discretion note) — but per D-14, **rows with no resolvable value must be filtered out entirely, not rendered with `'—'`** (unlike `displayValue: health === null ? '—' : ...` above — do not copy the `'—'` fallback here, that convention is explicitly rejected for this feature).

**Return object to extend** (`app/composables/useGameSession.ts:255-278`): add the two new computeds (suggested names left to Claude's Discretion per CONTEXT.md, e.g. `valueSuffix` and `valueRows`) alongside `showsSelectionGrid`, `counterCells` in the returned object.

---

### `app/components/StepScreen.vue` (component, request-response)

**Analog:** itself — the `selectionRows` prop + template block (D-09 calls this "the literal mould")

**Props pattern to copy** (`app/components/StepScreen.vue:29-44`):
```typescript
  // D-01/D-02 de la Fase 6: filas de la rejilla de selección de villano y
  // héroes, ya resueltas por el llamante (forma en línea, sin importar
  // ningún tipo del motor puro — este componente no sabe qué paso es ni
  // consulta ningún id, misma disciplina que `options` de arriba). `null`
  // cuando el paso actual no declara `selection: 'characters'` en los datos.
  selectionRows?: {
    key: string
    label: string
    valueLabel: string
    hasValue: boolean
    ariaLabel: string
  }[] | null
```
defaulted via `withDefaults(..., { selectionRows: null, ... })`. Apply the same inline-shape, defaulted-to-`null`, no-engine-type-import pattern for the new `valueSuffix: string | null` and `valueRows: { key, label, value }[] | null` props (shape per CONTEXT.md's Claude's Discretion suggestion).

**Template block to copy AND strip down** (`app/components/StepScreen.vue:59-97`, the `selectionRows` block) — this is the explicit literal mould for D-09, with `<button>`, `@click`, `aria-label`, and the `›` chevron all **removed**:
```html
<p class="text-display font-bold text-primary-text">{{ actionText }}</p>

<div v-if="selectionRows && selectionRows.length" class="w-full flex flex-col items-center gap-sm">
  <p class="text-label font-bold uppercase text-secondary-text">
    ELECCIÓN
  </p>
  <div class="w-full max-w-[720px] grid grid-cols-1">
    <button
      v-for="row in selectionRows"
      :key="row.key"
      type="button"
      class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left text-body font-normal border-b border-accent/50 transition-transform duration-75 active:brightness-95"
      :aria-label="row.ariaLabel"
      @click="emit('select-row', row.key)"
    >
      <span class="min-w-0 truncate text-primary-text">{{ row.label }}</span>
      <span class="min-w-0 flex-1 text-right truncate" :class="row.hasValue ? 'text-primary-text' : 'text-secondary-text'">
        {{ row.valueLabel }}
      </span>
      <span class="text-accent shrink-0">›</span>
    </button>
  </div>
</div>
```
**D-08 (parenthetical):** interpolate directly inside the same `<p class="text-display font-bold text-primary-text">`:
```html
<p class="text-display font-bold text-primary-text">{{ actionText }}{{ valueSuffix ?? '' }}</p>
```
(no new element, no `text-accent` color — D-08 explicitly rejects highlighting the number).

**D-09 (per-player list) — new block, NO `<button>`, NO chevron, NO `@click`, NO label/rótulo (D-10):**
```html
<div v-if="valueRows && valueRows.length" class="w-full flex flex-col items-center gap-sm">
  <div class="w-full max-w-[720px] grid grid-cols-1">
    <div
      v-for="row in valueRows"
      :key="row.key"
      class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left border-b border-accent/50"
    >
      <span class="min-w-0 truncate text-body font-normal text-primary-text">{{ row.label }}</span>
      <span class="shrink-0 text-heading font-bold text-primary-text">{{ row.value }}</span>
    </div>
  </div>
</div>
```
Note the deliberate differences from the `selectionRows` mould per D-09/D-10: `<div>` not `<button>`, no `type="button"`, no `@click`, no `:aria-label`, no trailing chevron `<span class="text-accent shrink-0">›</span>`, no `ELECCIÓN`-style label `<p>` above the grid, left cell is `text-body` (20px) not the row-label style used for selection, right cell is `text-heading font-bold` (28px) not `text-body`.

**Ordering (D-12):** place the new block between `actionText`'s `<p>` (already holds the D-08 suffix) and the existing `warningText`/`options` blocks — i.e., immediately after the closing `</div>` of any `selectionRows` block if present, before the `options` `v-if` block. Frase grande → lista de valores → aviso `⚠`, exactly the template's current top-to-bottom order.

---

### `app/pages/[game]/index.vue` (route/page, request-response)

**Analog:** itself — `selectionRows` computed + its prop wiring into `<StepScreen>`

**Computed-then-wire pattern to copy** (`app/pages/[game]/index.vue:378-411` for the computed style, `699-712` for the prop wiring):
```typescript
const selectionRows = computed(() => {
  if (!showsSelectionGrid.value) return null
  // ... build rows from playerSlots.value + catalogue lookups
  return rows
})
```
```html
<StepScreen
  :action-text="currentText.text"
  :warning-text="currentText.warning ?? null"
  :warning-detail-text="currentText.warningDetail ?? null"
  :options="currentText.options ?? null"
  :options-warning-text="currentText.optionsWarning ?? null"
  :options-warning-detail-text="currentText.optionsWarningDetail ?? null"
  :selection-rows="selectionRows"
  :duplicate-warning-text="duplicateWarningText"
  @open-warning-detail="onOpenWarningDetail"
  @open-option-detail="onOpenOptionDetail"
  @open-options-warning-detail="onOpenOptionsWarningDetail"
  @select-row="onSelectRow"
/>
```
**Pattern to apply:** since the two new computeds (`valueSuffix`/`valueRows`, names per Claude's Discretion) are meant to live in `useGameSession.ts` (not recomputed here — see D-04's rejection of putting pure logic in `useGameSession.ts`'s computed layer, which by extension also rules out putting it in the page), this file's job is thinner than `selectionRows`'s: just destructure the two new values out of `useGameSession()`'s return object (same destructuring already happening for `showsSelectionGrid`, `counterCells`, etc. — see line 70, 77 grep hits) and pass them straight through as two new props on `<StepScreen>`, no local `computed()` needed here at all. This mirrors how `showsCounterBand`/`counterCells` are consumed directly from the composable without a page-local computed wrapper.

---

## Shared Patterns

### "Componentes tontos" (dumb components) — no engine imports
**Source:** `app/composables/useGameSession.ts` header comment (lines 2-4) and `code_context`'s "Established Patterns" section.
**Apply to:** `StepScreen.vue`, `app/pages/[game]/index.vue`. Neither may import `~~/engine/*`; if the component needs a computed value, it must come from `useGameSession.ts`. `valueSuffix`/`valueRows` are exactly this: new computeds in the composable, not new engine imports in the component.

### Defensive normalisation contract (validate by type, never throw, never `undefined`)
**Source:** `engine/selection.ts:38-46` (comment above `emptySelection`/`resolvePlayerSlots`) and `engine/counters.ts:74-82` (comment above `resolveCounters`).
```typescript
// Normalización defensiva (DC-02): `localStorage` es editable a mano
// (DevTools), así que esta función no confía en NINGÚN campo persistido.
// Valida por TIPO, no por presencia. ... Nunca lanza, nunca devuelve
// `undefined` dentro del array.
```
**Apply to:** every exported function in `engine/stepValues.ts` — a manipulated `playerCount`, `selection`, or missing catalogue entry must degrade to `null`/an empty/filtered result, never throw and never propagate `NaN`/`undefined`.

### `z.strictObject` — new schema keys must be declared or CI fails loudly
**Source:** `engine/schema.ts:13-24` (comment above `CitationSchema`).
**Apply to:** `engine/schema.ts`'s `StepSchema` — the new `value` enum key is not optional to add; a step declaring `value` without the schema knowing about it makes the whole content file fail to validate (this is the intended "fail loudly at build" behavior, not a bug to work around).

### Interpolation only, never raw HTML
**Source:** `app/components/StepScreen.vue:2-4` (header comment, T-01-01).
**Apply to:** both new `StepScreen.vue` render surfaces (D-08 parenthetical, D-09 list) — always `{{ }}`, never `v-html`.

### Fixed typographic scale, no new sizes
**Source:** `app/assets/css/main.css:35-42` (`--text-display: 2.5rem` / `--text-heading: 1.75rem` / `--text-body: 1.25rem` / `--text-label: 1.125rem`).
**Apply to:** `StepScreen.vue`'s new list block — left column uses `text-body`, right column (the number) uses `text-heading font-bold`, matching D-09 exactly. No new Tailwind/CSS size token needed.

## No Analog Found

None — all 8 files in scope have a direct or structural-sibling analog already in the codebase (Phases 6 and 7 solved the identical shape of problem: a new step-schema flag, a new pure engine resolver reusing existing arithmetic, a new `StepScreen.vue` render block modelled on an existing one, and a matching composable seam).

## Metadata

**Analog search scope:** `engine/*.ts`, `engine/__tests__/*.ts`, `app/composables/*.ts`, `app/components/StepScreen.vue`, `app/pages/[game]/index.vue`, `content/marvel-champions.json`, `app/assets/css/main.css`.
**Files scanned:** 12 (schema.ts, types.ts, selection.ts, counters.ts, selection.test.ts, counters.test.ts, StepScreen.vue, useGameSession.ts, useHeroSearch.ts, useCharacterCatalogue.ts, index.vue, main.css) plus targeted greps across `content/marvel-champions.json`.
**Pattern extraction date:** 2026-09-09
