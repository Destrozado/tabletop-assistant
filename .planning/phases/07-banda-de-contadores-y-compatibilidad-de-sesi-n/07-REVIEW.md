---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
reviewed: 2026-09-08T15:39:36Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - app/components/CounterBand.vue
  - app/composables/__tests__/useGameSession.test.ts
  - app/composables/__tests__/useStepShortcuts.test.ts
  - app/composables/useGameSession.ts
  - app/composables/useStepShortcuts.ts
  - app/pages/[game]/index.vue
  - e2e/counter-band-behavior.spec.ts
  - e2e/counter-band-height.spec.ts
  - engine/__tests__/counters.test.ts
  - engine/__tests__/persistence.test.ts
  - engine/counters.ts
  - engine/types.ts
findings:
  critical: 1
  warning: 9
  info: 3
  total: 13
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-09-08T15:39:36Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The engine layer (`engine/counters.ts`) is the strongest part of this phase. Session compatibility holds up under adversarial reading: `formatVersion` was genuinely not bumped, `SessionContext.counters` is genuinely optional, `resume()` passes the persisted `context` through untouched, and `resolveCounters` validates by type rather than presence. I traced every path from a v1.7-shaped save (`{playerCount, difficulty}` only) and from a hand-edited `counters` blob through to `buildCounterCells`, and could not make `undefined` or `NaN` reach the screen or storage today. The reference-inequality discipline (D-20) is correctly implemented in all four mutators, so counter taps really do trigger the non-deep `watchDebounced` save.

The defects are concentrated in the **presentation layer**, which received far less adversarial attention than the engine.

The headline finding is a layout failure I reproduced empirically against the real production build (`.output/public`, Chromium, Playwright): **at narrow widths the counter band overflows its container and adjacent cells' tap targets overlap, so a tap can decrement the wrong player's life counter, and at 4 players the last player's ▲ is rendered entirely outside the viewport**. This happens at 412×915 — a viewport the project's own `e2e/portrait-usable.spec.ts` treats as supported. The new height spec measures only vertical budget and row ordering, which is exactly why this shipped.

Three further presentation issues are also empirically confirmed rather than theorised: a missing cell separator between VILLANO and Jugador 1 at the primary 1024×768 target, a pressed-state that sticks permanently, and counter arrows that are in the tab order but cannot be activated by any key.

Measurements below were taken by driving the built app in headless Chromium and reading `getBoundingClientRect()` / `getComputedStyle()` — no assertion here is inferred from reading CSS classes alone.

---

## Critical Issues

### CR-01: Counter cells overflow and overlap at narrow widths — a tap can hit the wrong player's counter, and Jugador 4's ▲ is off-screen

**File:** `app/components/CounterBand.vue:46-89`
**Severity:** BLOCKER

**Issue:**
Each cell's inner row has an irreducible minimum width of **152px**: `min-w-11` (44px) on each of the two arrow buttons plus `w-16 shrink-0` (64px) on the value span. The cell itself carries `flex-1 min-w-0`, so the *cell* shrinks below 152px, but its contents do not — they overflow, and there is no `overflow-hidden` anywhere in the band.

Measured against the production build:

| Viewport | Players | band `scrollWidth` / `clientWidth` | Result |
|---|---|---|---|
| 1024×768 | 4 | 1024 / 1024 | OK |
| 700×800 | 4 | **713 / 700** | Jugador 4 ▲ spans `669..713` — 13px clipped |
| 400×800 | 4 | **453 / 400** | Jugador 4 ▲ spans `409..453` — **entirely outside the viewport** |

The overlap is the more dangerous half. At 400×800 with 4 players:

```
Jugador 3 cell: x=199.5 w=100.3   buttons: ▼ 201..245   ▲ 309..353
Jugador 4 cell: x=299.8 w=100.3   buttons: ▼ 301..345   ▲ 409..453
                                             ^^^^^^^^^^^^^^^^^^
                        Jugador 3's ▲ (309..353) and Jugador 4's ▼ (301..345)
                        overlap on 309..345 — a 36px band.
```

Both cells are `position: relative`, so the later DOM sibling (Jugador 4) paints and hit-tests on top. **A tap in the region that visually shows Jugador 3's ▲ decrements Jugador 4 instead.** This is not cosmetic: it silently corrupts the life totals the group is relying on, which is exactly the failure mode the project's core constraint ("un asistente que guía mal es peor que no tener asistente") is written against.

This is not limited to 4 players. At 412×915 (the phone-portrait viewport `e2e/portrait-usable.spec.ts:68` already treats as supported) with **3** players, cells are ~137px against a 152px minimum, producing a ~15px overlap between every adjacent pair. There is also a landscape window between 640px (the `sm:` breakpoint, where all N+1 cells collapse into one row) and ~760px where the same overlap occurs with 4 players.

Neither e2e spec catches this: `e2e/counter-band-height.spec.ts:266-290` is the only narrow-viewport test, it uses 3 players, and it asserts only `boundingBox().height === 192` and that the player row's `y` is below the villain's.

**Fix:**
Make the value column shrinkable and drop the hard arrow minimum below `sm:`, then assert horizontal fit in the spec.

```html
<!-- app/components/CounterBand.vue -->
<div class="h-24 flex items-stretch overflow-hidden">
  <button
    type="button"
    class="flex-1 min-w-0 sm:min-w-11 h-24 flex items-end justify-center pb-xs
           text-heading font-bold leading-none text-accent transition-transform duration-75"
    ...
  >▼</button>

  <span class="w-12 sm:w-16 shrink min-w-0 h-24 flex items-end justify-center pb-xs
               text-display font-bold leading-none text-primary-text tabular-nums">
    {{ cell.displayValue }}
  </span>
  ...
</div>
```

If the 44px arrow minimum is a hard requirement (touch-target contract), the alternative is to wrap the player row at two cells per line below `sm:` and grow the shell from `h-48` to `h-72` for 3-4 players — but then the shell height must be derived from `rowGroups.length`, not hardcoded (see WR-04).

Add to `e2e/counter-band-height.spec.ts`, at 412×915 and 700×800 with **4** players:

```ts
const fits = await band.evaluate(el => el.scrollWidth <= el.clientWidth)
expect(fits, 'la banda no debe desbordar horizontalmente su cascarón').toBe(true)
// y ninguna pareja de botones adyacentes debe solaparse
```

---

## Warnings

### WR-01: Missing separator between VILLANO and Jugador 1 in landscape — `first:` does not survive `sm:contents`

**File:** `app/components/CounterBand.vue:50, 55`
**Severity:** WARNING

**Issue:**
Cells carry `border-l border-background first:border-l-0`. `first:` compiles to `&:first-child`, which is evaluated against the **DOM tree**, and `display: contents` on the row wrapper does not change parentage. Below `sm:` there are two row wrappers, so exactly one cell per row is `:first-child` — correct. From `sm:` the wrappers become `sm:contents` and the cells all become visual siblings in one row, but **two** of them are still `:first-child`: the villain cell (first in `villano-row`) *and* Jugador 1 (first in `jugadores-row`).

Measured at 1024×768 with 4 players:

```
cell "VILLANO"   x=0.0    borderLeft=0px   <- intended
cell "Jugador 1" x=204.2  borderLeft=0px   <- BUG: no separator from VILLANO
cell "Jugador 2" x=408.4  borderLeft=1px
cell "Jugador 3" x=613.6  borderLeft=1px
cell "Jugador 4" x=818.8  borderLeft=1px
```

The one separator that matters most — between the villain's life and the first player's — is the one that is missing, on the primary target viewport.

**Fix:** Stop relying on `:first-child` and mark the globally-first cell in `rowGroups`:

```ts
const rowGroups = computed(() => {
  const villainCell = props.cells.find(cell => cell.key === 'villano') ?? null
  const playerCells = props.cells.filter(cell => cell.key !== 'villano')
  const groups = [
    { rowKey: 'villano-row', rowCells: villainCell ? [villainCell] : [] },
    { rowKey: 'jugadores-row', rowCells: playerCells },
  ].filter(group => group.rowCells.length > 0)
  // índice global de cada celda, para que el separador no dependa de :first-child
  let n = 0
  return groups.map(g => ({ ...g, rowCells: g.rowCells.map(cell => ({ cell, globalIndex: n++ })) }))
})
```

```html
<div :class="['relative flex-1 min-w-0 h-24 border-background',
              entry.globalIndex === 0 ? '' : 'border-l sm:border-l',
              /* debajo de sm la primera celda de cada fila tampoco lleva borde */ ]">
```

(Or simpler, if the two-row split can be expressed without a wrapper element: drop `sm:contents` in favour of `flex-wrap` on the shell, which makes `:first-child` meaningful again.)

---

### WR-02: Pressed feedback sticks forever — no `mouseleave` / `touchcancel` / `blur` handler

**File:** `app/components/CounterBand.vue:63-66, 81-84`
**Severity:** WARNING

**Issue:**
`pressedKey` is set on `mousedown`/`touchstart` and cleared only on `mouseup`/`touchend` **on the same button**. Neither fires if the pointer leaves the button before release (mouse) or if the OS cancels the touch (`touchcancel`: notification, palm rejection, gesture takeover, scroll capture). Reproduced against the production build:

```
idle class has scale?                                   false
while pressed class has scale?                          true
AFTER releasing OUTSIDE the button, still pressed?      true
class: ... transition-transform duration-75 brightness-95 scale-[0.98]
```

The arrow stays visually depressed indefinitely. On the target device (tablet, touch-only) `touchcancel` is the realistic trigger, and the stuck state persists until the user happens to press a *different* arrow — because a single shared `pressedKey` is overwritten rather than reset. `NavBand.vue` has the same omission, but there it self-corrects on the next tap of the same two fixed buttons; here the number of buttons is dynamic and a stuck arrow can sit there for a whole round.

**Fix:**

```html
<button
  ...
  @mousedown="pressedKey = `${cell.key}:down`"
  @mouseup="pressedKey = null"
  @mouseleave="pressedKey = null"
  @blur="pressedKey = null"
  @touchstart="pressedKey = `${cell.key}:down`"
  @touchend="pressedKey = null"
  @touchcancel="pressedKey = null"
  @click="emit('decrement', cell.key)"
>
```

Apply the same four-handler set to both arrows, and add the missing handlers to `NavBand.vue` while you are there so the two components stay literally identical as the header comment claims.

---

### WR-03: Counter arrows are focusable but cannot be activated by any key (WCAG 2.1.1 keyboard trap)

**Files:** `app/composables/useStepShortcuts.ts:68-90, 128-133, 149-179`; `app/components/CounterBand.vue:58, 76`
**Severity:** WARNING

**Issue:**
`isEditableTarget` returns `false` for `BUTTON`, so `resolveShortcutAction` maps Space/Enter to `'next'` regardless of which button has focus, and `useStepShortcuts` then calls `event.preventDefault()` (line 168), which suppresses the browser's native activation of the focused control. The e2e suite asserts this is intentional (`e2e/counter-band-behavior.spec.ts:257-259`: "Espacio no debe cambiar el valor del contador enfocado").

The consequence, which D-17's comment does not address, is that the ▼/▲ buttons are native `<button>` elements — therefore in the tab order — but **no key can operate them**: Space and Enter are hijacked to advance the step, and no alternative binding exists. A keyboard or switch-control user can tab onto twelve controls (4 players × 2 arrows + villain × 2 at 4 players) and none of them does anything. That is a focusable-but-inoperable control, which is a genuine accessibility defect rather than a taste question.

D-17's stated reasoning ("los contadores se operan con el dedo, no con el teclado, HP-09") is a coherent product decision, but it argues for removing the arrows from the keyboard surface, not for leaving them in it as dead stops.

**Fix:** Take the arrows out of the tab order so the decision is honest and the trap disappears, without touching `useStepShortcuts.ts` (D-17 preserved):

```html
<button
  type="button"
  tabindex="-1"
  ...
>▼</button>
```

If keyboard operation is later wanted instead, the narrower change is to exempt only these buttons (e.g. a `data-counter-arrow` attribute checked in the wiring), never to add a blanket `BUTTON` guard to `isEditableTarget` — that would break Space/Enter for every button in the app, exactly as D-17 warns.

---

### WR-04: `CounterBand.vue` hardcodes the `'villano'` key, duplicating a format `useGameSession.ts` claims is single-sourced

**Files:** `app/components/CounterBand.vue:29-30`; `app/composables/useGameSession.ts:221-228`
**Severity:** WARNING

**Issue:**
`useGameSession.ts:222-223` states the key format `'villano' | 'jugador-{índice base 0}'` "vive solo aquí". It does not — `CounterBand.vue:29-30` parses it:

```ts
const villainCell = props.cells.find(cell => cell.key === 'villano') ?? null
const playerCells = props.cells.filter(cell => cell.key !== 'villano')
```

If the key is ever renamed in `buildCounterCells` (a plausible move when Warhammer 40.000 lands, where "villano" is the wrong noun), this code does not throw — `villainCell` becomes `null`, the villain row is filtered out by line 34, and **all** cells silently collapse into `jugadores-row`. The two-row narrow layout degrades with no error, no test failure in the unit suite, and only an indirect symptom in e2e. A shared string parsed in two places with a silent-degradation failure mode is a latent bug, not a style issue.

Secondary defect in the same block: the shell height `h-48` (line 46) hardcodes "exactly two rows" while `rowGroups` can produce one (if `playerCells` is empty, e.g. a corrupted `playerCount`). That leaves 96px of dead space stealing height from the step text.

**Fix:** Let the composable declare the row, and derive the shell height:

```ts
// useGameSession.ts
export interface CounterCell {
  key: string
  row: 'villain' | 'players'   // <- la partición viaja con el dato
  label: string
  displayValue: string
  defeated: boolean
}
```

```ts
// CounterBand.vue
const rowGroups = computed(() => ([
  { rowKey: 'villano-row', rowCells: props.cells.filter(c => c.row === 'villain') },
  { rowKey: 'jugadores-row', rowCells: props.cells.filter(c => c.row === 'players') },
].filter(g => g.rowCells.length > 0)))

const shellHeight = computed(() => rowGroups.value.length === 1 ? 'h-24' : 'h-48')
```

```html
<div :class="[shellHeight, 'sm:h-24 shrink-0 bg-surface flex flex-col sm:flex-row']">
```

---

### WR-05: `undefined` slips past the `=== null` guards; the slot range check and the array length use two different definitions of `playerCount`

**File:** `engine/counters.ts:94-99, 142-158, 160-177`
**Severity:** WARNING

**Issue:**
Two related soundness gaps, both contradicting the file's own header contract ("nunca devuelve `undefined` dentro del array", "Un `playerCount` que no sea entero positivo devuelve null en vez de propagar un NaN"):

1. **Guards test `=== null`, not `== null`.** `incrementHero:147` reads `resolveCounterValues(...).heroHealth[slot]`, then `base === null ? 1 : base + 1`. If that index is out of range the value is `undefined`, `undefined === null` is `false`, and `nextValue` becomes **`NaN`**. The same pattern is at `decrementHero:165-167` and at `resolveCounterValues:95-96` (`if (frozen !== null) return frozen` would return `undefined` into a `(number | null)[]`).

2. **Two sources of truth for the length.** The range guard (`incrementHero:144`, `decrementHero:162`) compares against the **raw** `session.context.playerCount`, while both array lengths come from the `Number.isInteger(...) && > 0`-validated one. They disagree for any non-integer `playerCount`. With `context.playerCount = 3.5` (reachable via a hand-edited `localStorage`, which this module explicitly treats as untrusted), `slot = 3` passes `3 >= 3.5 === false`, `resolvePlayerSlots` returns length 0, `base` is `undefined`, and `base + 1` is `NaN`.

The `NaN` does not currently reach storage only because `counters.heroHealth.map(...)` on the same run operates on an empty array and swallows the write. That is coincidence, not defence — and the same input *does* cause real damage in `incrementVillain`/`decrementVillain`, which rebuild `counters.heroHealth` from `resolveCounters` and would therefore **discard any previously frozen hero values** for that session.

**Fix:**

```ts
// engine/counters.ts — una sola definición de la longitud
function normalizedPlayerCount(context: SessionContext): number {
  return Number.isInteger(context.playerCount) && context.playerCount > 0 ? context.playerCount : 0
}

export function incrementHero(session: EngineSession, slot: number, catalogue: CharacterCatalogue | null): EngineSession {
  const playerCount = normalizedPlayerCount(session.context)   // <- validado, no crudo
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerCount) return session

  const base = resolveCounterValues(session.context, catalogue).heroHealth[slot]
  const nextValue = typeof base === 'number' ? base + 1 : 1   // <- undefined también arranca en 1
  ...
}
```

Apply `normalizedPlayerCount` in `decrementHero` too, and change `resolveCounterValues:95` to `if (typeof frozen === 'number') return frozen`. Add a regression case to `engine/__tests__/counters.test.ts` alongside the existing out-of-range `it.each`:

```ts
it.each([2.5, Number.NaN, '3' as unknown as number])('playerCount %s: ningún mutador produce NaN ni descarta valores congelados', (playerCount) => { /* ... */ })
```

---

### WR-06: No type checker exists anywhere, and this phase's code depends on the strictness it declares

**Files:** `package.json:5-16`; `.github/workflows/ci.yml`; `engine/counters.ts:73, 95-96, 147, 165`; `engine/__tests__/persistence.test.ts` (new `D-21` block)
**Severity:** WARNING

**Issue:**
`.nuxt/tsconfig.app.json:129-130` and `.nuxt/tsconfig.shared.json:126-127` declare `"strict": true` and `"noUncheckedIndexedAccess": true`, and the codebase visibly writes to that standard (`cells[0]!`, `catalogue.villains.find(...)!` throughout the test suites). But:

- `typescript` and `vue-tsc` are absent from `package.json` **and** from `node_modules` — `npx nuxt typecheck` fails with "A type checker is required".
- There is no `typecheck` script.
- `.github/workflows/ci.yml` runs `npm run test` (Vitest) and `npx playwright test` only.

So the declared strictness is aspirational, and this phase relies on it: under `noUncheckedIndexedAccess`, `resolveCounterValues:95-96` returns `number | undefined` into a `(number | null)[]`, `incrementHero:147` / `decrementHero:165` do arithmetic on `number | undefined`, and the new `engine/__tests__/persistence.test.ts` D-21 block indexes `fresh.sequence[0].runtimeId` without the `!` the rest of that file uses. None of these are reported by any gate. WR-05 exists precisely because nothing checks this.

**Fix:**

```bash
npm add -D typescript vue-tsc
```

```json
// package.json
"scripts": {
  "typecheck": "nuxt typecheck"
}
```

```yaml
# .github/workflows/ci.yml — antes de "Run tests"
- name: Typecheck
  run: npm run typecheck
```

Expect the four sites above to fail on the first run; fixing them is WR-05.

---

### WR-07: `computeInitialVillainHealth` has a dead branch and no guard on the catalogue figure

**File:** `engine/counters.ts:34-37`
**Severity:** WARNING

**Issue:**

```ts
const figures = difficulty === 'expert' && stage1.expert ? stage1.expert : stage1
if (figures.healthPerHero) return figures.health * playerCount
if (figures.healthPerGroup) return figures.health
return figures.health          // <- idéntico a la línea anterior
```

The `healthPerGroup` branch is dead — it returns the same expression as the fallthrough. A reader (or a future Warhammer 40.000 contributor) reasonably assumes the flag does something, and will eventually change one of the two identical returns and not the other.

More importantly, the function guards `playerCount` against `NaN` (line 32) but never guards `figures.health`. If a future `content/marvel-characters.json` entry ever lacked `health` — the file is machine-written by `scripts/catalogue/fetch-marvelcdb.mjs` from a third-party API — `figures.health * playerCount` yields `NaN`, and `resolveCounterValues` **does not sanitize computed values** (it only sanitizes persisted ones, lines 55-77). The `NaN` would flow straight to `String(NaN)` → the band renders `"NaN"` at the table. The function's docstring claims it "Nunca lanza" and returns `null` rather than "propagar un NaN"; that promise only holds for the `playerCount` input.

**Fix:**

```ts
const figures = difficulty === 'expert' && stage1.expert ? stage1.expert : stage1
if (!Number.isFinite(figures.health)) return null      // el catálogo también es entrada
return figures.healthPerHero ? figures.health * playerCount : figures.health
```

Add a test with a hand-built villain whose `stages[0].health` is `undefined`, asserting `null` rather than `NaN`.

---

### WR-08: The villain counter presents a stage-I preload as the current value for the whole game

**Files:** `engine/counters.ts:20-38`; `app/composables/useGameSession.ts:59-64`
**Severity:** WARNING

**Issue:**
`computeInitialVillainHealth` reads `villain.stages[0]` only, and `resolveCounterValues` uses that live figure for as long as `counters.villainHealth` is `null`. That is D-11 as designed. The un-designed consequence is what the table sees: a group that never touches the villain arrows keeps reading e.g. `42` (Rhino stage I × 3) on screen while the villain has physically flipped to stage II, whose printed health is different. The band presents that number in the same 40px type, in the same cell, with the same styling as a value the group actually set — there is no affordance distinguishing "cifra derivada de la etapa I" from "cifra que el grupo mantiene".

Given the project's stated fidelity constraint, a confidently-displayed wrong life total is worse than an em dash. The cost of correcting it manually is ~20 taps at ±1 with no repeat behaviour (D-13/HP-04), which the group will not do mid-round.

**Fix:** Not necessarily code in this phase — but the current state should not ship as-is silently. Cheapest honest option: render the *unfrozen* villain value in secondary text (or with a small `I` marker) so "derivado de la etapa I" is visually distinct from "el grupo lo mantiene", and note the limitation in the phase summary as a known gap rather than a closed decision. `buildCounterCells` already carries a `defeated` boolean; a parallel `derived: boolean` (true when `context.counters?.villainHealth == null`) costs one field and no engine change.

---

### WR-09: `transition-transform` does not cover `brightness-95`, so half the pressed feedback is instantaneous

**File:** `app/components/CounterBand.vue:60, 78`
**Severity:** WARNING

**Issue:**
The pressed class applies two effects — `scale-[0.98]` (a transform) and `brightness-95` (a `filter`) — but the transition property is `transition-transform duration-75`. Only the scale animates; the brightness snaps. On a 96px-tall button the brightness step is the more visible of the two, so the feedback reads as a flicker rather than a press. Copied verbatim from `NavBand.vue:26, 38`, so the inconsistency is now duplicated in two components.

**Fix:** `transition-[transform,filter] duration-75` (or `transition-all duration-75`) in both `CounterBand.vue` and `NavBand.vue`.

---

## Info

### IN-01: Every counter tap normalizes the persisted state twice

**File:** `engine/counters.ts:112-177`
**Issue:** All four mutators call `resolveCounterValues(...)` (which internally calls `resolveCounters`) and then call `resolveCounters(...)` again on the same `context`. `incrementHero`/`decrementHero` additionally re-scan the full 23-hero / 3-villain catalogue for every slot on every tap via `resolveCounterValues`.
**Fix:** Have `resolveCounterValues` return both layers, e.g. `{ values, persisted }`, or accept an already-resolved `persisted` argument. Not a correctness problem; noted only because the duplication makes the "single normalization point" invariant harder to verify by reading.

### IN-02: Counter changes are silent to assistive tech, and the accessible name carries the defeat suffix

**File:** `app/components/CounterBand.vue:60, 72-74, 78`
**Issue:** The value `<span>` has no `aria-live`, so a screen reader announces nothing when a counter changes. Separately, the arrow `aria-label`s interpolate `cell.label`, which already contains `DEFEATED_SUFFIX`, producing `"Bajar vida de Jugador 1 · SIN VIDA"`. `e2e/counter-band-behavior.spec.ts:212-213` locks this in, so it is intentional, but it reads as a malformed sentence.
**Fix:** `aria-live="polite"` on the value span; build the arrow labels from a separate `baseLabel` field on `CounterCell` rather than from the display label.

### IN-03: The narrow-viewport e2e test measures the axis that was already correct

**File:** `e2e/counter-band-height.spec.ts:266-290`
**Issue:** The only narrow test uses 3 players and asserts `boundingBox().height === 192`, the number font size, and the relative `y` of two buttons. It never asserts horizontal fit or non-overlap, which is why CR-01 shipped despite a dedicated layout spec existing.
**Fix:** Parameterize the narrow test over `[1, 2, 3, 4]` players and add, for each, `expect(await band.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)` plus a pairwise non-overlap check across all `getBoundingClientRect()` of the band's buttons.

---

_Reviewed: 2026-09-08T15:39:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
