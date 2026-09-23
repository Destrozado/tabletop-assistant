---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
reviewed: 2026-09-09T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/components/CounterBand.vue
  - app/components/NavBand.vue
  - app/composables/__tests__/useGameSession.test.ts
  - app/composables/__tests__/useStepShortcuts.test.ts
  - app/composables/useGameSession.ts
  - app/composables/useStepShortcuts.ts
  - app/pages/[game]/index.vue
  - e2e/counter-band-behavior.spec.ts
  - e2e/counter-band-height.spec.ts
  - e2e/counter-band-overlap.spec.ts
  - engine/__tests__/counters.test.ts
  - engine/__tests__/persistence.test.ts
  - engine/counters.ts
  - engine/types.ts
findings:
  critical: 0
  warning: 9
  info: 7
  total: 16
status: issues_found
---

# Phase 07: Code Review Report (re-review after gap closure)

**Reviewed:** 2026-09-09
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found (no blockers)

## Summary

This is the second review of phase 07. The previous report (CR-01 + WR-01..WR-09 + IN-01..IN-03)
was the input to plans 07-08/07-09/07-10/07-11, now merged. I re-derived every closed finding
from the current source rather than from the summaries, and **the blocking finding CR-01 is
genuinely fixed** — not papered over. There are no blockers in the current state.

What I verified as actually resolved:

- **CR-01 — resolved.** `CounterBand.vue:119/141` drop `min-w-11` for `min-w-0`, `:134` replaces
  the fixed `w-16` with `min-w-12 sm:min-w-16 shrink-0`, and `:103` adds `overflow-hidden` to the
  cell. I recomputed the flex arithmetic by hand at all five matrix viewports: the irreducible
  cell content is now `max(48, digits)` px (`sm:` 64px) with zero-floor arrows, so the row can
  no longer exceed the cell box, and `overflow-hidden` clips rather than paints over the
  neighbour even if it did. `e2e/counter-band-overlap.spec.ts` guards it with four independent
  assertions (horizontal fit, per-button containment in band + viewport, pairwise
  non-intersection, and an `elementFromPoint` hit-test that each button's own centre resolves to
  itself) over 5 viewports × 4 player counts, plus two end-to-end "▲ of Jugador 1/4 moves only
  that cell" checks at the exact 412×915 that was reproduced broken. That is the right shape of
  guard: assertion 4 is what distinguishes "looks better" from "no longer steals the tap".
- **WR-01 — resolved.** The separator no longer relies on `:first-child`. `rowGroups` now carries
  a continuous `globalIndex` (`:48-52`) and the class list is `globalIndex === 0 ? '' : 'border-l'`
  plus a `max-sm:first:border-l-0` reset for the genuinely-independent narrow rows (`:103-105`).
  I confirmed in the built CSS (`entry.D48ZWsDF.css`) that the reset rule is emitted and both
  wins on specificity (`:first-child` adds a pseudo-class) and appears later in the file, and
  `counter-band-behavior.spec.ts:300-329` measures `borderLeftWidth` at both 1024×768 and
  400×800.
- **WR-02 — resolved in the two files under review** (four-path reset: `mouseup`, `mouseleave`,
  `blur`, `touchcancel`), with a real browser-measured regression test. See WR-02 below: the
  same defect survives in six other buttons that use the identical pattern.
- **WR-03 — resolved.** `tabindex="-1"` on both arrows, `useStepShortcuts.ts` untouched (D-17
  preserved), and the spec asserts both halves: `tabIndex === -1` on all 8 arrows *and* that 15
  Tab presses still reach SIGUIENTE — i.e. it guards against over-fixing.
- **WR-05 — resolved.** `resolveHeroHealthLength()` is now the single definition of the array
  length used by both `resolveCounters` and the two slot guards, and every `=== null` guard
  became `Number.isFinite`. I traced all four mutators with `playerCount` ∈
  {2.5, NaN, '3', null} and with `heroHealth: [5, 7]` already frozen: no path produces NaN, and
  the fallback-to-persisted-length genuinely prevents a tampered `playerCount` from discarding
  frozen values (which was the damaging half of WR-05).
- **WR-09 — resolved in the two files under review** (`transition-[transform,filter]`). Same
  incompleteness as WR-02; see WR-03 below.
- **IN-03 — resolved** by the new overlap matrix, which is exactly the horizontal/non-overlap
  coverage the old height spec lacked.

I also independently checked the residual item flagged in the handoff: the arrow widths
`07-UI-SPEC.md` documents for narrow viewports are *arithmetically consistent* with the
implemented formula. Re-deriving them gives 37.5px at 700×800, 33.5px at 660×800 and 27.0px at
412×915 against the documented ~38 / ~34 / ~27.5 — the sub-pixel deltas are the 1px cell
`border-l` the doc did not subtract. So the derived-not-measured numbers are not wrong. The
real gap is that nothing *asserts* any floor below 1024×768 (WR-07 below).

Where the gap closure is weaker than it reads: **three of the nine warnings below are the same
fix stopping at the two files in scope** while five to six other components keep the exact
defect the fix was written to eliminate, and the new code comments now assert a codebase-wide
pattern that no longer holds. Two more are carried-forward findings that plans 07-09/07-10
deferred *explicitly and in writing* (`07-09-SUMMARY.md:111`, `07-10-SUMMARY.md:127`) — an
honest deferral, but the defect is still in the tree, so it is still reported.

---

## Warnings

### WR-01: `computeInitialHeroHealth` got no guard while its villain twin did — the WR-07 fix is half-applied, and the file's own "never propagates NaN" contract now holds for only one of the two functions

**File:** `engine/counters.ts:44-48` (and `:34-41` for the asymmetry)
**Severity:** WARNING

**Issue:**
The WR-07 fix added a guard to the villain path and left the hero path untouched:

```ts
// villano — ahora guardado
if (!Number.isFinite(figures.health)) return null
return figures.healthPerHero ? figures.health * playerCount : figures.health

// héroe — sin ninguna guarda
export function computeInitialHeroHealth(hero: CatalogueHero | null): number | null {
  if (hero === null) return null
  return hero.health          // <- lo que venga en el catálogo, tal cual
}
```

The justification written into the code for guarding the villain (`:35-37`: the catalogue is
machine-written by `scripts/catalogue/fetch-marvelcdb.mjs` from a third-party API, so a
regeneration without usable `health` must not propagate NaN to the band) applies **identically**
to `hero.health` — same file, same generator, same third-party source. The file header still
claims the module never propagates a NaN; that is now true for the villain cell only.

The consequence is reachable end-to-end, not theoretical plumbing: `resolveCounterValues:133`
puts whatever `computeInitialHeroHealth` returns straight into the array, and
`useGameSession.ts:67/76` does `values.heroHealth[i] ?? null` — `NaN ?? null` is **NaN**, not
null — so `String(health)` renders the literal string `"NaN"` in 40px type at the table.
(`undefined` takes the `??` branch and is safe; NaN is not.)

Second half of the same asymmetry: the guard chosen is `Number.isFinite`, while the *persisted*
path 60 lines below normalizes with `Math.max(0, Math.trunc(entry))` (`:99`). So the same module
now applies two different sanitization standards to the same quantity: a catalogue `health` of
`-5` or `2.5` passes `isFinite` and reaches the band as `-20` / `7.5` for 4 players, whereas the
identical value coming from `localStorage` would be floored and truncated.

**Reachability, stated honestly:** `engine/catalogueSchema.ts:46/53/63` declares
`health: z.number().int().positive()` and `engine/__tests__/characters.test.ts` runs
`validateCharacterCatalogue` against the real `content/marvel-characters.json` in CI, and
`useCharacterCatalogue.ts:11` imports that file *statically* at build time. So a bad catalogue
cannot reach a user today. This is a defence-in-depth and contract-consistency defect, not a
live bug — but it is a one-line fix that makes the header contract true, and leaving the two
sibling functions asymmetric is exactly how the next regeneration slips through.

**Fix:**

```ts
// engine/counters.ts
export function computeInitialHeroHealth(hero: CatalogueHero | null): number | null {
  if (hero === null) return null
  return Number.isInteger(hero.health) && hero.health > 0 ? hero.health : null
}

// y en computeInitialVillainHealth, el mismo estándar que lo persistido:
if (!Number.isInteger(figures.health) || figures.health <= 0) return null
```

Add the mirror of the existing WR-07 test (`counters.test.ts:387-410`) for a hero whose `health`
is absent / NaN / negative, asserting `null` and asserting that
`buildCounterCells` renders `'—'` rather than `'NaN'`.

---

### WR-02: WR-02's four-path pressed reset was applied to 2 of 8 buttons that use the pattern — six can still stick depressed, and the new comment asserting a shared pattern is now false

**Files:** `app/components/NavBand.vue:18-23` (the false claim);
`app/components/ConfirmDialog.vue:41-44, 56-59`; `app/components/ResumePrompt.vue:47-50, 59-62`;
`app/components/GameSelectorScreen.vue:39-42`; `app/components/ContentChangedNotice.vue:35-38`
**Severity:** WARNING

**Issue:**
The fix is correct where it was applied. But `NavBand.vue:18-23` now states the reason for
applying it there was "mismo juego de manejadores que CounterBand.vue, para que el comentario de
cabecera que dice que este patrón se reutiliza literalmente siga siendo cierto". Grepping the
pattern shows it is reused literally in **six more buttons**, none of which were updated:

```
ConfirmDialog.vue:41-44         @mousedown/@touchstart/@mouseup/@touchend   (cancelPressed)
ConfirmDialog.vue:56-59         idem                                        (confirmPressed)
ResumePrompt.vue:47-50          idem                                        (newGamePressed)
ResumePrompt.vue:59-62          idem                                        (continuePressed)
GameSelectorScreen.vue:39-42    idem                                        (pressedId)
ContentChangedNotice.vue:35-38  idem                                        (ctaPressed)
```

All six reproduce WR-02 exactly: `touchcancel` (the realistic trigger on the target tablet —
notification, palm rejection, OS gesture) and pointer-leave-before-release leave the button
visually depressed with no path back. `GameSelectorScreen.vue` is the worst of the six because
its pressed class also adds `border-accent` (`:38`), so a cancelled touch leaves a game card
looking *selected* on the very first screen until a different card is pressed — and
`pressedId` being a single shared ref means it is overwritten, never reset, exactly the failure
mode the CounterBand comment describes.

So the codebase now carries two dialects of one pattern, and the file that documents the pattern
documents the minority dialect as if it were universal. That is worse than before the fix: a
reader copying from `ConfirmDialog.vue` (four handlers) has no signal that the correct pattern is
the seven-handler one.

**Fix:** Apply the same four-path reset to the six sites above, or — better, since this is the
eighth copy of the same eight lines — extract it once:

```ts
// app/composables/usePressedState.ts
export function usePressedState<T = boolean>() {
  const pressed = ref<T | null>(null)
  const release = () => { pressed.value = null }
  function bind(value: T) {
    return {
      onMousedown: () => { pressed.value = value },
      onTouchstart: () => { pressed.value = value },
      onMouseup: release, onMouseleave: release, onBlur: release,
      onTouchend: release, onTouchcancel: release,
    }
  }
  return { pressed, bind, release }
}
```

If extraction is out of scope for this phase, at minimum correct `NavBand.vue:18-23` so it stops
claiming a consistency that does not exist, and record the six sites as a follow-up.

---

### WR-03: WR-09's `transition-[transform,filter]` fix also stopped at 2 of 8 sites — the brightness still snaps in six components

**Files:** `app/components/ConfirmDialog.vue:39, 51`; `app/components/ContentChangedNotice.vue:33`;
`app/components/ResumePrompt.vue:45, 57`; `app/components/GameSelectorScreen.vue:37`
**Severity:** WARNING

**Issue:**
Same shape as WR-02. `CounterBand.vue` and `NavBand.vue` now use
`transition-[transform,filter] duration-75`; the six sites above still pair
`transition-transform duration-75` with a `brightness-95` filter in the bound `:class`, so half
the press feedback animates and half snaps — the exact defect WR-09 described. The prior review
said the inconsistency was "duplicated in two components"; it was actually in eight, and the
gap closure reduced it to six while creating a second dialect.

**Fix:** `transition-[transform,filter] duration-75` (or `transition-all duration-75`) at the
six sites. If `usePressedState` is extracted per WR-02, put the class string next to it so the
two halves of the pattern cannot drift again.

---

### WR-04: `CounterBand.vue` still parses the `'villano'` key while `useGameSession.ts` still claims the format lives in exactly one place (carried forward — explicitly deferred)

**Files:** `app/components/CounterBand.vue:41-42`; `app/composables/useGameSession.ts:221-223`
**Severity:** WARNING

**Issue:**
This is the *first* defect of the old WR-04. Plan 07-10 closed only the second (shell height) and
recorded the deferral in writing (`07-10-PLAN.md:74`, `07-10-SUMMARY.md:127`), so this is not a
silent miss. It is still a defect in the merged tree, and the code still asserts the opposite:

```ts
// useGameSession.ts:221-223
// el formato de clave ('villano' | 'jugador-{índice base 0}') vive solo aquí

// CounterBand.vue:41-42
const villainCell = props.cells.find(cell => cell.key === 'villano') ?? null
const playerCells = props.cells.filter(cell => cell.key !== 'villano')
```

The component's own header (`:2-4`) also says it "recibe los valores ya resueltos … y no
distingue" — but it does distinguish, by parsing a magic string produced in another module.
The failure mode is silent, which is what makes it a warning rather than a note: rename the key
in `buildCounterCells` (a plausible move for Warhammer 40.000, where "villano" is the wrong
noun) and nothing throws — `villainCell` becomes `null`, `rowGroups` filters the villain row
away, all cells collapse into `jugadores-row`, and the only symptom is a narrow-viewport layout
that silently stops splitting. No unit test fails.

**Fix:** as previously proposed — let the data carry the partition so the component stops
parsing keys:

```ts
// useGameSession.ts
export interface CounterCell {
  key: string
  row: 'villain' | 'players'
  label: string
  displayValue: string
  defeated: boolean
}
```

```ts
// CounterBand.vue
const groups = [
  { rowKey: 'villano-row', rowCells: props.cells.filter(c => c.row === 'villain') },
  { rowKey: 'jugadores-row', rowCells: props.cells.filter(c => c.row === 'players') },
].filter(g => g.rowCells.length > 0)
```

---

### WR-05: still no type checker anywhere, and this phase's new code contains a site that would fail the strictness the project declares (carried forward — explicitly deferred)

**Files:** `package.json:5-17`; `.github/workflows/ci.yml`; `engine/__tests__/persistence.test.ts:234`
**Severity:** WARNING

**Issue:**
Re-verified against the current tree, not the old report:

- `typescript` and `vue-tsc` are absent from `package.json` **and** from `node_modules`
  (`ls node_modules/typescript` → No such file or directory).
- There is no `typecheck` script (`package.json:5-17`).
- `.github/workflows/ci.yml` runs `npm run test` and `npx playwright test` only.

`.nuxt/tsconfig.*.json` still declares `"strict": true` and `"noUncheckedIndexedAccess": true`,
and this phase's own code is written to that standard almost everywhere (`cells[0]!`,
`rects[i]!`, `catalogue.villains.find(...)!`). The exception is the new D-21 block added by this
phase:

```ts
// engine/__tests__/persistence.test.ts:234 (y :249, :263)
runtimeId: fresh.sequence[0].runtimeId,   // sin `!` — TS18048 bajo noUncheckedIndexedAccess
```

`engine/__tests__/counters.test.ts` two directories over uses `cells[0]!` in the same situation.
Nothing reports the difference, because nothing type-checks. The deferral is documented
(`07-09-SUMMARY.md:111`, citing the zero-new-dependency gate of `07-RESEARCH.md` §A2), which is
a legitimate reason to defer — but the consequence stands: the declared strictness is
aspirational, and WR-05 of the previous review (a real NaN-producing bug) existed precisely
because nothing checked it.

**Fix:**

```bash
npm add -D typescript vue-tsc
```

```json
"scripts": { "typecheck": "nuxt typecheck" }
```

```yaml
# .github/workflows/ci.yml — antes de "Run tests"
- name: Typecheck
  run: npm run typecheck
```

Expect `persistence.test.ts:234/249/263` to fail on the first run; adding `!` is the whole fix.

---

### WR-06: the villain counter still presents a stage-I preload as if the group had set it (carried forward — explicitly deferred)

**Files:** `engine/counters.ts:24-42`; `app/composables/useGameSession.ts:59-64`
**Severity:** WARNING

**Issue:**
Unchanged from the previous review and deferred in writing (`07-10-PLAN.md:83`). Restated
because it is the finding with the most direct bearing on the project's stated fidelity
constraint, and because the numbers are now confirmed against the real catalogue: stage-I
preloads at 4 players are Rhino 56, Kang 48 (expert 60), Ultron 68 — while Ultron's stage III at
4 players is 108. A group that never touches the villain arrows keeps reading `68` in 40px type
while the physical villain card has flipped to a stage whose printed health is 108, and the band
renders that derived figure with the exact styling, size and cell as a value the group actually
maintains. There is no affordance distinguishing the two.

**Fix:** unchanged and cheap — `buildCounterCells` already emits a `defeated` boolean; a parallel
`derived: boolean` (true when `context.counters?.villainHealth == null`) costs one field, no
engine change, and lets `CounterBand.vue` render the unfrozen villain figure in secondary text or
with a small `I` marker. If that is still out of scope, record it in the phase summary as a
**known gap** rather than as a closed decision.

---

### WR-07: no assertion of a minimum arrow width anywhere below 1024×768 — the matrix already measures `width` and throws it away

**File:** `e2e/counter-band-overlap.spec.ts:118-138, 197-225, 279-291`
**Severity:** WARNING

**Issue:**
D-02 is locked: arrows shrink on purpose below 760px and a human verified 412×915 by hand. That
decision accepts *shrinking*; it does not accept *zero*, and nothing in the suite distinguishes
the two. `collectButtonRects` already returns `width` for every button (`:130`), and the only
place it is used is the 1024×768-only test at `:282-290`. At the other four matrix viewports the
field is collected and discarded.

Why this matters given the CR-01 fix specifically: the fix's mechanism is "arrows have a zero
floor and the value span has `shrink-0`". That means arrow width is now a *residual*
(`(cellWidth − spanWidth) / 2`), so any future change to the span (a wider `min-w-*`, a longer
`displayValue`, an added element) reduces arrow width silently. A regression that drove an arrow
to 0px would pass assertion 1 (fits), assertion 2 (contained) and assertion 3 (non-overlap —
a zero-width rect has negative `overlapX` with everything). Only assertion 4 might catch it, and
only by accident: `elementFromPoint` at the centre of a zero-width rect lands exactly on a box
boundary, where which element is returned is not something a test should rely on.

Related coverage note: the matrix never selects a villain or heroes, so every cell it measures
renders `'—'`. I checked the arithmetic and this is nearly worst-case anyway (the em dash is
~40px at 40px type, below the 48/64px `min-w` floor, and the widest realistic value — Ultron's
108 — only widens the span by ~8px), so this is a small gap, not a hole. The missing floor is
the real one.

**Fix:** two lines inside the existing per-rect loop at `:172`, using the D-02-documented
values as the floor rather than inventing a number:

```ts
// e2e/counter-band-overlap.spec.ts
const MIN_ARROW_WIDTH = viewport.width >= 1024 ? 44 : 20   // D-02: sin suelo de 44 por debajo de 760px, pero nunca 0
expect(
  rect.width,
  `«${rect.label}» mide ${rect.width.toFixed(1)}px de ancho (${context})`,
).toBeGreaterThanOrEqual(MIN_ARROW_WIDTH)
```

That also converts the derived-not-measured widths in `07-UI-SPEC.md` (~38 / ~34 / ~27.5px) from
documentation into an executable record, which is the residual item the handoff flagged.

---

### WR-08: the overlap matrix's "wait for the band to settle" is a single measurement, not a wait, and five viewports share one test

**File:** `e2e/counter-band-overlap.spec.ts:145-153, 142-240`
**Severity:** WARNING

**Issue:**
Two test-reliability defects in the spec that is now the sole guard for the phase's blocking
finding.

1. `:150-153` reads:

   ```ts
   // Esperar a que la banda se estabilice tras el cambio de viewport
   // antes de medir: misma técnica con la que 07-VERIFICATION.md
   // reprodujo el fallo (mismo `page`, sin recarga).
   await band.boundingBox()
   ```

   `boundingBox()` does not wait for layout to settle — it takes one measurement and discards it.
   It provides no retry, no polling and no stability condition. If Chromium has not reflowed
   after `setViewportSize`, every subsequent measurement in that iteration (`scrollWidth`,
   all the rects, all the hit-tests, the 96/192px height) reads stale geometry from the
   *previous* viewport, and the run either flakes or — worse — passes vacuously. The comment
   asserts a synchronization guarantee the call does not provide, which is how this stops being
   maintained.

2. The matrix is 4 tests × 5 viewports rather than 20 tests. A failure at viewport #1 (1024×768,
   the non-regression guard) aborts before #2–#5 are measured, so a diagnosis says "1024 broke"
   and stays silent about whether 412×915 also broke. For a spec whose whole purpose is to
   localize a viewport-dependent layout failure, that hides the information the spec exists to
   produce.

**Fix:**

```ts
// 1. una condición de estabilidad de verdad
await expect
  .poll(async () => (await band.boundingBox())?.height, { timeout: 2000 })
  .toBe(viewport.width >= SM_BREAKPOINT ? 96 : 192)

// 2. un test por combinación: el bucle de viewports pasa a ser un bucle de test()
for (const playerCount of PLAYER_COUNTS) {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height}, ${playerCount} jugadores: cabe, no se solapa y cada botón se toca a sí mismo`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await goToRoundLoopWithPlayers(page, playerCount)
      // …las cinco aserciones tal cual…
    })
  }
}
```

Setting the viewport *before* navigating also removes the mid-test resize entirely, which makes
defect 1 moot.

---

### WR-09: duplicate byte-identical assertions claiming to check a character the test never distinguishes

**File:** `app/composables/__tests__/useGameSession.test.ts:24-25, 68-69`
**Severity:** WARNING

**Issue:**

```ts
expect(cell.displayValue).toBe('—')
expect(cell.displayValue).toBe('—') // EM DASH, no HYPHEN-MINUS
```

I dumped both lines through `od -c`: the two literals are byte-identical (`e2 80 94` both
times). The second assertion is an exact duplicate of the first and cannot fail unless the first
already has. The trailing comment advertises the one thing the pair does not do — distinguish
U+2014 from U+002D — so a reader (or the next person auditing D-12's "—" contract) concludes
that character-level check exists when it does not. Same pattern at `:68-69` for
`'Ana · SIN VIDA'`.

This is false confidence in a test file, which is the one case where test-file findings are in
scope. `buildCounterCells` is where the em dash literal is authored (`useGameSession.ts:62/76`),
and it is the *only* place in the app that produces it, so a silent HYPHEN-MINUS swap in that
literal would ship green.

**Fix:** make the second assertion assert something, and drop it if it cannot:

```ts
expect(cell.displayValue).toBe('—')
expect(cell.displayValue.codePointAt(0)).toBe(0x2014) // EM DASH, no HYPHEN-MINUS (0x2D)
```

```ts
expect(cells[1]!.label).toBe('Ana · SIN VIDA')
expect(cells[1]!.label).toContain('·')  // MIDDLE DOT, no '*' ni '-'
```

---

## Info

### IN-01: every counter tap normalizes the persisted state twice (carried forward)

**File:** `engine/counters.ts:147-214`
**Issue:** All four mutators call `resolveCounterValues(...)` (which calls `resolveCounters`
internally at `:111`) and then call `resolveCounters(...)` again on the same `context`.
`incrementHero`/`decrementHero` additionally re-scan the catalogue via `resolveCounterValues` for
every tap. Not a correctness problem — noted because the duplication makes the module's central
"single normalization point" invariant harder to verify by reading, which is the property WR-05
was fixed to restore.
**Fix:** have `resolveCounterValues` return `{ values, persisted }`, or accept an
already-resolved `persisted` argument.

### IN-02: counter changes are silent to assistive tech, and the arrow's accessible name carries the defeat suffix (carried forward)

**File:** `app/components/CounterBand.vue:121, 134, 143`
**Issue:** The value `<span>` has no `aria-live`, so nothing is announced when a counter changes.
Separately, both `aria-label`s interpolate `entry.cell.label`, which already contains
`DEFEATED_SUFFIX`, producing `"Bajar vida de Jugador 1 · SIN VIDA"`.
`counter-band-behavior.spec.ts:212-213` locks that string in, so it is intentional, but it reads
as a malformed sentence. Note this is *not* in tension with D-17: D-17 removes the arrows from
the keyboard, it does not make the band's numbers unannounceable.
**Fix:** `aria-live="polite"` on the value span; build the arrow labels from a separate
`baseLabel` field on `CounterCell` rather than from the display label.

### IN-03: `shellHeightClass` tests `=== 1`, so zero rows falls through to 192px of empty band

**File:** `app/components/CounterBand.vue:59`
**Issue:** `rowGroups.value.length === 1 ? 'h-24' : 'h-48'` maps a *zero*-row band to `h-48`,
i.e. 192px of dead space stealing height from the step text — the exact failure the branch was
added to prevent. It is unreachable today (`v-if="showsCounterBand"` in `index.vue:690` cannot be
true without a session, and `buildCounterCells` always emits the villain cell), so this is a
robustness note, not a bug.
**Fix:** `rowGroups.value.length <= 1 ? 'h-24' : 'h-48'`, which also states the intent
("one row or fewer → one row of height") instead of a coincidence.

### IN-04: `resolveHeroHealthLength` duplicates the array-shape guard that `resolveCounters` performs 25 lines later

**File:** `engine/counters.ts:63-72` vs `:83-95`
**Issue:** The function introduced as "única fuente de la longitud … de todo el fichero" contains
its own copy of the `raw !== null && typeof raw === 'object' && Array.isArray((raw as
CounterState).heroHealth)` extraction that `resolveCounters` then repeats verbatim. Unifying the
length while duplicating the shape guard trades one drift risk for another.
**Fix:** extract the extraction once and have both callers use it:
```ts
function persistedHeroHealth(context: SessionContext): (number | null)[] {
  const raw = context.counters
  return raw !== null && typeof raw === 'object' && Array.isArray((raw as CounterState).heroHealth)
    ? (raw as CounterState).heroHealth
    : []
}
```

### IN-05: the hero-health array length has no upper bound, and no layer type-checks `playerCount`

**Files:** `engine/counters.ts:63-72`; `app/composables/usePersistedSession.ts:60-69`;
`engine/persistence.ts:81-89`
**Issue:** `isPersistedPosition` validates only that `context` is a non-null object — it never
looks at `playerCount` — and `resume()`'s happy path (`persistence.ts:87`) passes
`persisted.context` through without calling `isValidContext`. So `playerCount: 500000000`
survives into the session, satisfies `Number.isInteger(...) && > 0`, and makes
`Array.from({ length })` allocate on every render and every tap. Self-inflicted via devtools
only (there is no server and no other writer), so this is not a security boundary — and
`resolvePlayerSlots` (`engine/selection.ts:50-52`) has had the identical shape since phase 6, so
the new function copied a pattern rather than introducing one. Worth a cap because the module's
stated contract is "no confía en NINGÚN campo persistido".
**Fix:** clamp once, next to the game's own declared range (`GameDefinition.minPlayers/
maxPlayers` already exist in `engine/types.ts:111-112`), e.g.
`Math.min(context.playerCount, MAX_SUPPORTED_PLAYERS)`.

### IN-06: `sessionContextLabel` interpolates raw `playerCount`, so a partial persisted context renders "undefined jug" in the header

**File:** `app/composables/useGameSession.ts:178-182`
**Issue:** `return \`${playerCount} jug · ${...}\`` with no validation. A persisted
`context: {}` passes `isPersistedPosition` (it only checks that `context` is an object) and
`resume()`'s resumed path, giving `"undefined jug · Normal"` in the header and on the "mesa
lista" screen. This is unchanged pre-phase-7 code, flagged only because it is the same
untrusted-`playerCount` class that this phase went to real lengths to harden in `counters.ts`,
in the same file, left unhardened — the inconsistency is the finding, not the string.
**Fix:** reuse the engine's normalization rather than adding a second one:
`const n = Number.isInteger(playerCount) && playerCount > 0 ? playerCount : null` and render
`''` when `n === null`.

### IN-07: the new WR-05 regression predicates are near-tautologies

**File:** `engine/__tests__/counters.test.ts:343, 352, 359, 367`
**Issue:** `heroHealth.every(v => v === null || !Number.isNaN(v))` is satisfied by `undefined`,
by strings, and by objects — `Number.isNaN` does not coerce, so it only ever returns true for a
literal NaN. The stated intent of these tests ("ningún mutador produce NaN ni descarta valores
congelados") is actually carried by the neighbouring `toEqual([5, 7])` and
`heroHealth[1]).toBe(7)` assertions; the predicate contributes almost nothing beyond them, while
reading like a strong invariant. The `resolveCounterValues` case at `:371-378` does check
`undefined` explicitly, which is the right pattern.
**Fix:** assert the shape you mean —
`expect(heroHealth.every(v => v === null || Number.isInteger(v))).toBe(true)` — which rejects
`undefined`, strings and fractions as well as NaN.

---

## Prior findings: disposition

| Prior ID | Status now | Evidence |
|---|---|---|
| CR-01 (blocker) | **Resolved** | `CounterBand.vue:103, 119, 134, 141`; `e2e/counter-band-overlap.spec.ts` (5 viewports × 4 player counts, hit-test) |
| WR-01 separator | **Resolved** | `CounterBand.vue:48-52, 103-105`; measured at 1024×768 and 400×800 in `counter-band-behavior.spec.ts:300-329` |
| WR-02 stuck pressed | **Resolved in scope**, open in 6 other buttons | `CounterBand.vue:122-128`; `NavBand.vue:34-40` → new WR-02 above |
| WR-03 keyboard trap | **Resolved** | `tabindex="-1"` at `CounterBand.vue:118, 140`; `counter-band-behavior.spec.ts:375-408` |
| WR-04 `'villano'` key / shell height | **Half resolved** (height yes, key no) | `CounterBand.vue:59` vs `:41-42` → new WR-04 above |
| WR-05 NaN / two length sources | **Resolved** | `engine/counters.ts:63-72, 149, 162, 180-185, 198-204`; `counters.test.ts:323-379` |
| WR-06 no type checker | **Open** (deferred in writing) | `package.json`, `ci.yml`, missing `node_modules/typescript` → new WR-05 above |
| WR-07 dead branch / unguarded health | **Half resolved** (villain yes, hero no) | `engine/counters.ts:40-41` vs `:44-48` → new WR-01 above |
| WR-08 stage-I preload | **Open** (deferred in writing) | no `derived` field on `CounterCell` → new WR-06 above |
| WR-09 `brightness` not transitioned | **Resolved in scope**, open in 6 other buttons | → new WR-03 above |
| IN-01 double normalization | Open | → IN-01 above |
| IN-02 aria-live / label suffix | Open | → IN-02 above |
| IN-03 narrow test measures wrong axis | **Resolved** | `e2e/counter-band-overlap.spec.ts` |

---

_Reviewed: 2026-09-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
