---
phase: 02-bucle-de-ronda-y-reglas-verificadas
reviewed: 2026-08-29T22:06:57Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - app/components/AppHeader.vue
  - app/components/IndexOverlay.vue
  - app/components/StepScreen.vue
  - app/components/WarningDetailModal.vue
  - app/composables/useGameSession.ts
  - app/pages/[game]/index.vue
  - content/marvel-champions.json
  - engine/__tests__/content.test.ts
  - engine/__tests__/header.test.ts
  - engine/__tests__/navigator.test.ts
  - engine/__tests__/resolve.test.ts
  - engine/__tests__/schema.test.ts
  - engine/__tests__/toc.test.ts
  - engine/header.ts
  - engine/resolve.ts
  - engine/schema.ts
  - engine/toc.ts
  - engine/types.ts
findings:
  critical: 1
  warning: 7
  info: 7
  total: 15
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-29T22:06:57Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The round loop itself is arithmetically sound. I traced every loop-boundary path
(`next` at `loopEndIndex`, `prev` at `loopStartIndex` with round 1 and round > 1,
`jumpTo` into and out of the loop, `mesa-lista` → `ronda.jugadores.01`) against the
real 34-node sequence and found no off-by-one and no round counter incremented or
decremented in the wrong place. `describeHeader`'s phase-relative counter is correct
in both arms, `tableOfContents`'s D-24/D-25 rules read only `sectionRepeats`, and
`resolveText` merges field-by-field as documented. Content passes its structural
gates: no duplicate ids, no duplicate phase titles, every `kind:'step'` carries a
citation, every documented budget is respected. Baseline confirmed: 133 tests, green.

The defects are elsewhere, and they cluster in three places.

**The content gate does not gate what it claims to.** `GameDefinitionSchema` is built
from plain `z.object()`, which strips unknown keys rather than rejecting them, and the
browser never sees the validated object at all — `useGameContent.ts` imports the raw
JSON and casts it. So the object the tests inspect and the object the tablet renders
are two different objects, and any divergence between them is invisible to CI by
construction. I verified this by probe, not by reading: injecting `branches`,
`warningDetails`, and a top-level unknown key all pass validation silently. The one
test written specifically to enforce D-33 (`content.test.ts:299`) is therefore
incapable of failing.

**The modal is not modal.** `WarningDetailModal` sets `aria-modal="true"` but nothing
behind it is inert and there is no focus trap, so the `SIGUIENTE` button and the `≡`
button remain keyboard-reachable underneath. That gives a path to a stale detail panel
describing a step you are no longer on — precisely the "guía mal" failure the project
constraints call worse than no assistant. Separately, the focus-return mechanism is
built on `document.activeElement`, which on the primary target device (iPad Safari,
where `<button>` does not take focus on tap) captures `<body>` and silently no-ops,
failing the contract written at `02-UI-SPEC.md:247`.

**Several new gates were written so they cannot bite.** Four assertions in
`content.test.ts` re-check limits the module-scope `validateGameDefinition` call has
already enforced, one schema test is a byte-equivalent duplicate of another, and the
loop boundary — the phase's core value — is never exercised through an actual
`next()`/`prev()` round transition composed with `describeHeader`/`tableOfContents`.

No CLAUDE.md "What NOT to Use" violations found. `netlify.toml` was correctly removed,
cache headers live in `nitro.routeRules`, `zod` stays a devDependency and never crosses
into `app/`, and no component imports `~~/engine/*` except through `useGameSession`.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01: Content schema strips unknown keys, so the CI gate cannot see what ships to the tablet

**File:** `engine/schema.ts:12-89` (every `z.object` call), `engine/__tests__/content.test.ts:295-300`, `app/composables/useGameContent.ts:9-13`

**Issue:** All six object schemas (`CitationSchema`, `TextBlockSchema`, `StepSchema`,
`PhaseSchema`, `SectionSchema`, `GameDefinitionSchema`) use plain `z.object()`, whose
default behaviour is *strip*, not *reject*. Meanwhile `useGameContent.ts:12` ships the
**raw, unvalidated** JSON to the browser (`marvelChampions as GameDefinition`). The two
objects are not the same object, and the difference is exactly the set of keys Zod
silently deleted.

I confirmed this empirically rather than inferring it. Injecting into a copy of
`content/marvel-champions.json`:

- `step.branches = [{a:1}]` → **accepted**, stripped from output
- `step.warningDetails = '…'` (typo for `warningDetail`) → **accepted**, stripped
- top-level `game.totallyUnknown = 1` → **accepted**, stripped

Three concrete consequences:

1. **`content.test.ts:299` is provably incapable of failing.** That assertion —
   `expect((step as unknown as { branches?: unknown }).branches).toBeUndefined()` —
   exists to enforce D-33 ("sin campo `branches`"). It reads `marvelChampions`, the
   *validated* object, from which `branches` has already been deleted. Adding
   `"branches": [...]` to the JSON file leaves `npx vitest run` green and ships the
   field to the tablet. The single gate protecting a locked decision is decorative.

2. **A misspelled field silently degrades the table experience.** An author adding a
   round step in Phase 3 who writes `"warningDetails"` instead of `"warningDetail"`
   gets a green build. On the tablet, `resolveText` returns `warningDetail: undefined`,
   `StepScreen`'s `v-if="warningText && warningDetailText"` falls through to the plain
   `<p>` branch, and the `⚠` renders without a chevron — silently non-tappable. The
   consequence the modal exists to explain never reaches the players. The current
   id-wired list at `content.test.ts:367-378` happens to catch this for the six
   *existing* steps only; any new step is unprotected.

3. **It reproduces the exact failure mode CLAUDE.md chose Zod to avoid.** The stack
   decision rejects `@nuxt/content` because "its content validation explicitly skips in
   CI … the opposite of 'fail loudly at build'." A strip-mode schema over an object the
   runtime never consumes is functionally the same silent pass.

**Fix:** Make every object schema strict, and point the `branches` gate at the raw JSON.

```ts
// engine/schema.ts — z.strictObject for all six (or .strict() on each z.object).
// NOTE: .strict() must be applied to the inner object BEFORE .superRefine(),
// which returns a wrapper that has no .strict().
const CitationSchema = z.strictObject({ /* … */ })
const TextBlockSchema = z.strictObject({ /* … */ })   // .extend()/.partial() preserve strictness
const PhaseSchema = z.strictObject({ /* … */ })
const SectionSchema = z.strictObject({ /* … */ })
export const GameDefinitionSchema = z.strictObject({ /* … */ }).superRefine(/* … */)
```

```ts
// engine/__tests__/content.test.ts — assert against the RAW parse, not the stripped one.
it('ADAPT-04 (D-33): … sin campo branches', () => {
  const rawStep = (rawMarvelChampions as GameDefinition).sections
    .flatMap(s => s.phases).flatMap(p => p.steps)
    .find(s => s.id === 'ronda.villano.02')!
  expect((rawStep as unknown as { branches?: unknown }).branches).toBeUndefined()
})
```

Add a gate-that-bites alongside it: `expect(() => validateGameDefinition({ ...raw, sections: [...withUnknownKeyOnAStep] })).toThrow()`.

---

### Warnings

#### WR-01: Duplicate option labels inside a difficulty variant bypass the schema refinement and collide as `v-for` keys

**File:** `engine/schema.ts:137-146`, `app/components/StepScreen.vue:39-40`

**Issue:** The duplicate-label refinement inspects `step.options` only. It never walks
`step.variants.difficulty.{normal,expert}.options`, even though the neighbouring
`optionsWarning` check three lines above (`schema.ts:159-165`) *does* handle variants
via `variant.options ?? step.options`. The asymmetry is not documented as deliberate.

Verified by probe: attaching
`variants.difficulty.expert.options = [{label:'Dup',…},{label:'Dup',…}]` to
`ronda.jugadores.01` **passes** `validateGameDefinition`.

The failure lands in the UI, not the schema. `resolveText` returns
`variant.options ?? step.options` unchanged, and `StepScreen.vue:40` keys the grid on
`:key="option.label"`. Two identical keys make Vue reuse a single DOM node for both
entries: one option vanishes from the grid, and `@click="emit('open-option-detail', index)"`
on the surviving node carries whichever `index` Vue's patcher settled on — so the modal
opens the *wrong rule detail*, with a heading that matches what was tapped. In a rules
assistant that is a silent wrong-answer, not a rendering glitch.

Not reachable with today's content (`content.test.ts:323-329` asserts no round step
declares `variants.difficulty`), which is why this is a Warning rather than a Blocker —
but the guard that keeps it unreachable is content, not code.

**Fix:** Two independent changes; do both.

```ts
// engine/schema.ts — hoist the check into a helper and run it on base + each variant.
function checkDuplicateLabels(
  options: { label: string }[] | undefined, stepId: string, where: string, ctx: z.RefinementCtx,
) {
  if (!options) return
  const labels = options.map(o => o.label)
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i)
  if (dupes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Step "${stepId}"${where} has duplicate option labels: ${[...new Set(dupes)].join(', ')}`,
    })
  }
}
// base:      checkDuplicateLabels(step.options, step.id, '', ctx)
// variants:  checkDuplicateLabels(variant.options, step.id, ` variant "${level}"`, ctx)
```

```vue
<!-- app/components/StepScreen.vue:40 — key on position, which is unique by construction -->
<button v-for="(option, index) in options" :key="index" …>
```

---

#### WR-02: `WarningDetailModal` declares `aria-modal` but traps nothing — background controls stay reachable, allowing a stale detail panel

**File:** `app/components/WarningDetailModal.vue:52-58`, `app/pages/[game]/index.vue:300-331`

**Issue:** The dialog sets `role="dialog" aria-modal="true"` but does not trap focus,
does not mark the background `inert`, and does not restrict Tab. Every control behind
it — `NavBand`'s `‹ Atrás` / `SIGUIENTE ›`, `AppHeader`'s `≡`, the other option buttons —
remains in the DOM, focusable, and activatable by a hardware keyboard (a Bluetooth
keyboard on a tablet is ordinary, and the app is also used on desktop during
development).

Two concrete failures, both of which the review brief asks about explicitly:

1. **Stale detail.** Open the option detail for `ronda.jugadores.01` → `Tab` until focus
   reaches `SIGUIENTE` (behind the veil) → `Enter`. `next()` advances the cursor;
   `StepScreen` re-renders behind the still-open modal. `activeDetail` is a *snapshot*
   taken at open time (`index.vue:144-148`), so the panel now displays a turn-option
   explanation for a step the group has already left. The rules assistant is showing a
   rule that does not apply to what is on screen.

2. **Two overlays at once.** Same path, but activate `≡` instead: `isIndexOpen` and
   `activeDetail` are independent refs, both overlays render at `z-50`. The modal wins
   on DOM order; pressing `Esc` dismisses it and leaves the index overlay open on top of
   a step nobody asked to see. The single-`activeDetail` refactor correctly eliminated
   "two details open at once", but the modal-vs-index pair was left unguarded.

Follow-on: after case 1, `detailTriggerEl` (`index.vue:129`) points at an option button
that no longer exists, so `onDismissDetail`'s `detailTriggerEl.value?.focus()` targets a
detached node and focus is lost to `<body>`. `detailTriggerEl` is also never reset to
`null`, so it holds a DOM reference for the rest of the session.

**Fix:** Make the modal actually modal, and clear the trigger ref on dismiss.

```vue
<!-- WarningDetailModal.vue — trap Tab inside the panel -->
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { emit('dismiss'); return }
  if (event.key === 'Tab') {
    // one interactive control: keep focus on it
    event.preventDefault()
    dismissButton.value?.focus()
  }
}
```

```ts
// app/pages/[game]/index.vue — clear the ref, and make the two overlays exclusive
function onDismissDetail() {
  const trigger = detailTriggerEl.value
  activeDetail.value = null
  detailTriggerEl.value = null
  if (trigger?.isConnected) trigger.focus()
}
function onIndexOpen() {
  if (activeDetail.value) return   // never stack the index on top of an open detail
  isIndexOpen.value = true
}
```

Alternatively mark the `<div class="h-dvh flex flex-col">` wrapper `:inert="!!activeDetail"`,
which closes both cases at once and is a one-line change.

---

#### WR-03: Focus return is captured via `document.activeElement`, which is `<body>` on the target device — the UI-SPEC focus contract silently does not hold on an iPad

**File:** `app/pages/[game]/index.vue:131-154`

**Issue:** `02-UI-SPEC.md:247` states the contract: *"the page-level component must keep
a reference to that trigger element across the open/close cycle."* The implementation
instead infers the trigger by reading `document.activeElement` at emit time
(`index.vue:132` and `:143`). That inference is only valid on engines that focus a
`<button>` on click. WebKit does not: on iOS/iPadOS Safari — the project's stated
primary device ("tablet en horizontal junto a la mesa") — tapping a `<button>` fires
`click` without moving focus, so `document.activeElement` is `<body>`.

Concrete failure: on the iPad, `detailTriggerEl` is set to `document.body`, and
`onDismissDetail`'s `document.body.focus()` is a no-op (`<body>` is not focusable
without `tabindex`). After the modal unmounts, focus is nowhere. A VoiceOver user is
dropped back to the top of the document and has to re-navigate the whole step screen to
find the `⚠` line they were reading. The three-dismissal-paths guarantee at
`02-UI-SPEC.md:265` ("focus returns to the `⚠` trigger") does not hold on the device
the app was designed for. There is no test and no manual-verification step that would
catch this, because it works in desktop Chrome.

This does not break touch usability — it is an accessibility/contract defect, not a
crash — but it is the difference between the spec being implemented and being
approximated.

**Fix:** Pass the element explicitly rather than inferring it. `StepScreen` can stay a
dumb component by sending the DOM node from its own handler:

```vue
<!-- StepScreen.vue -->
const emit = defineEmits<{
  'open-warning-detail': [trigger: HTMLElement]
  'open-option-detail': [index: number, trigger: HTMLElement]
}>()
<!-- template -->
@click="emit('open-warning-detail', $event.currentTarget as HTMLElement)"
@click="emit('open-option-detail', index, $event.currentTarget as HTMLElement)"
```

`$event.currentTarget` is the button regardless of engine focus policy. If changing the
emit signature is unacceptable, the minimum viable fix is to reject a useless capture:
`detailTriggerEl.value = document.activeElement === document.body ? null : (document.activeElement as HTMLElement)`
and give the modal's dismiss button `focus()` on mount (already present) — at least the
degradation becomes visible rather than silent.

---

#### WR-04: `round` is restored from `localStorage` with no type or range validation — a non-numeric round string-concatenates on every loop close

**File:** `engine/persistence.ts:82-90` (consumed by `engine/header.ts:54` and `engine/navigator.ts:9`), `app/composables/usePersistedSession.ts:28-37`

**Issue:** This phase surfaced `round` in the UI for the first time (`header.ts:54`
composes `RONDA ${session.round} · …`) and made it mutate on every loop close
(`navigator.ts:9`). Nothing on the path from storage to that string validates it.
`isPersistedPosition` (`usePersistedSession.ts:31-37`) checks only key *presence*
(`'round' in candidate`), never `typeof candidate.round === 'number'`. `resume()`
(`persistence.ts:88`) then assigns `round: persisted.round` verbatim — unlike `context`,
which does get a shape check via `isValidContext`.

Concrete failure with `{"…","round":"4"}` in `tga:progress:marvel-champions` (hand-edited
in DevTools, or a partial write from a future storage-format change):

- Header renders `RONDA 4 · Villano · 3 de 6` — looks correct, so nothing signals a problem.
- Reaching `loopEndIndex` and tapping `SIGUIENTE` runs `session.round + 1` on a string:
  `"4" + 1 === "41"`. The header jumps to **`RONDA 41`** mid-game.
- Tapping `Atrás` at `loopStartIndex` runs `session.round - 1`, which *does* coerce:
  `"41" - 1 === 40`. The counter now oscillates between string-concatenation forward and
  numeric subtraction backward.
- `{"round": null}` also passes presence-checking: `null + 1 === 1`, so the round silently
  resets to 1 at the first loop close.

`round` is the one piece of session state a group at the table cannot reconstruct from
the physical board — the cards do not record which round it is. Corrupting it is the
one persistence bug with no recovery path.

**Fix:** Validate at both the storage boundary and the engine boundary (the engine
already has the `isValidContext` precedent, and the comment there explains exactly why:
*"el motor no puede asumir ciegamente que su entrada tiene la forma correcta"*).

```ts
// app/composables/usePersistedSession.ts
return typeof candidate.formatVersion === 'number'
  && typeof candidate.contentVersion === 'number'
  && typeof candidate.runtimeId === 'string'
  && Number.isInteger(candidate.round) && (candidate.round as number) >= 1
  && typeof candidate.context === 'object' && candidate.context !== null
```

```ts
// engine/persistence.ts:87-90
const round = Number.isInteger(persisted.round) && persisted.round >= 1 ? persisted.round : 1
return { session: { ...fresh, cursor, round, context: persisted.context }, outcome: 'resumed' }
```

Add a `persistence.test.ts` case per corrupt shape (`"4"`, `null`, `0`, `-1`, `1.5`).

---

#### WR-05: `TocBlock` exposes no stable id, so `IndexOverlay` keys its blocks on `phaseTitle` — which the schema never constrains to be unique

**File:** `engine/toc.ts:26-30` and `:63,:73-74`, `app/components/IndexOverlay.vue:87`, `engine/schema.ts:63-68`

**Issue:** `tableOfContents` groups by `phaseId` (correct — the comment at `toc.ts:2-4`
even explains why position-based grouping beats a keyed map) but then **discards
`phaseId`** when mapping `WorkingBlock` → `TocBlock` at lines 63 and 73-74. The public
type has only `{ label, steps, dimmed }`. `IndexOverlay.vue:87` therefore has nothing
stable to key on and falls back to `:key="block.label"`, i.e. the phase title.

`PhaseSchema` (`schema.ts:65`) constrains `title` to `z.string().min(1)` and nothing
more. Phase *ids* are covered by the global duplicate-id refinement; phase *titles* are
not. Today's nine titles happen to be distinct (verified), so the bug is latent.

Concrete failure: the very next content addition is the natural trigger. A second
repeating phase named `Villano` (the round's villain phase already uses it, and Warhammer
40.000 — the stated next game — has phases that recur by name across sections), or simply
a `PREPARACIÓN` block reused in a second game definition, produces duplicate `v-for`
keys. Vue emits `Duplicate keys found during update` and reuses one block's DOM for the
other: the index shows one block twice, hides another entirely, and the continuous
numbering at `IndexOverlay.vue:38-48` desynchronises from the actual sequence. Since
tapping a row calls `jumpTo(row.id)` with the row's `runtimeId`, the group can end up
jumping to a step that is not the one they read.

**Fix:** Carry the id through the public type — it is already sitting in `WorkingBlock`.

```ts
// engine/toc.ts
export interface TocBlock { id: string, label: string, steps: TocRow[], dimmed: boolean }
// …
if (!insideLoop) return blocks.map(({ phaseId, label, steps }) => ({ id: phaseId, label, steps, dimmed: false }))
return [
  ...repeatingBlocks.map(({ phaseId, label, steps }) => ({ id: phaseId, label, steps, dimmed: false })),
  ...nonRepeatingBlocks.map(({ phaseId, label, steps }) => ({ id: phaseId, label, steps, dimmed: true })),
]
```

```vue
<!-- IndexOverlay.vue:87 -->
<template v-for="(block, index) in numberedBlocks" :key="block.id">
```

`numberedBlocks` must forward `id`. `toc.test.ts` should gain an id-wired assertion on
the block ids for the loop-reordered case, matching the existing label assertion at
`toc.test.ts:94-104`.

---

#### WR-06: Once the cursor leaves the loop the round number vanishes from every surface, and the resume prompt then misreports the saved position

**File:** `engine/header.ts:67-75`, `app/pages/[game]/index.vue:177-184`, `engine/toc.ts:48-50`

**Issue:** D-26 deliberately rejected a "Volver a la ronda" button and rejected
remembering the exit point. It did not decide that the round *number* should become
invisible — but that is the emergent behaviour, and it makes the persistence layer lie.

Trace: at round 5, the group opens the index and jumps to `setup.escenario.02` to
re-check the villain's health dial (exactly the "zona de consulta" use D-24 built the
dimmed block for). `jumpTo` correctly preserves `round: 5`. Now:

- **Header** takes the non-repeating branch (`header.ts:67-75`) → `PREPARACIÓN · 10 de 23`. No round.
- **Index** now has `insideLoop === false`, so the round rows carry `mark: null` and no
  dimming (`toc.ts:48-50`, `:62-63`) — the round blocks look identical to unvisited setup
  blocks. No round.
- **`sessionContextLabel`** is `3 jug · Normal`. No round.

The number 5 exists in `session.round` and in `localStorage`, and is displayed nowhere.

The sharp failure is on resume. `savedSummary` (`index.vue:177-184`) is composed from
`sectionLabel` + `position` + `sessionContextLabel` — all three of which drop the round
in this state. Close the tab while consulting setup at round 5; reopen. `ResumePrompt`
reads **"PREPARACIÓN · 10 de 23 · 3 jug · Normal"**. The group has no way to tell whether
continuing resumes a round-5 game or a first-time setup, and the obvious action
(`SIGUIENTE` × 14) walks them back through the remaining setup steps before returning to
the round — at which point the header reads `RONDA 5` with no explanation of where 5 came
from. The alternative reading — that they are genuinely at setup step 10 of a fresh game
— is equally consistent with everything on screen.

**Fix:** Surface the retained round wherever the saved position is summarised. The
cheapest change that closes the misreport without touching D-23's header contract is to
append it in `savedSummary` only:

```ts
const savedSummary = computed(() => {
  const parts = [sectionLabel.value]
  if (position.value) parts.push(`${position.value.current} de ${position.value.total}`)
  // Ronda retenida tras un salto fuera del bucle (D-26): el resumen de reanudación
  // es el único sitio donde perderla es irrecuperable para el grupo.
  const round = session.value?.round ?? 1
  const inLoop = currentNode.value?.sectionRepeats === true
  if (!inLoop && round > 1) parts.push(`ronda ${round} en curso`)
  parts.push(sessionContextLabel.value)
  return parts.join(' · ')
})
```

A second option worth raising with the user: keep the round blocks visually distinct in
the index when `round > 1` and the cursor is outside the loop (the mirror of D-24's
dimming), so "there is a round in progress" is visible without changing the header.

---

#### WR-07: Loop-boundary coverage gap — no test composes the navigator with `describeHeader`/`tableOfContents`, and no test covers the cursor-in-setup-while-round>1 state

**File:** `engine/__tests__/header.test.ts:26-28,53-84`, `engine/__tests__/toc.test.ts:89-127`

**Issue:** Every `describeHeader` test builds its input with
`withCursorAndRound(session, cursor, round)` (`header.test.ts:26-28`) — a hand-set
cursor/round pair. `tableOfContents` is likewise always called with a literal cursor.
Neither file imports `next` or `prev`. So the two functions this phase added or rewrote
are never exercised on a session that an actual round transition produced.

The gap is not theoretical. These assertions would pass unchanged if:

- `next()` set `round` before moving the cursor rather than after (a plausible refactor;
  the header would then render `RONDA 5` on the last step of round 4),
- `prev()` decremented `round` without restoring the cursor to `loopEndIndex`, or
- `expand()` computed `loopStartIndex` off by one.

`navigator.test.ts:137-212` does cover the transitions, but it only asserts `cursor` and
`round` — never what the header or the index would render at those positions. Nothing
joins the two halves, which is where a phase-relative counter is easiest to get subtly
wrong.

Second, distinct gap: no test in either file covers `cursor` in the setup section while
`round > 1`. Every `toc.test.ts` loop-reorder case uses a fresh `expand()` (round 1), and
`header.test.ts`'s setup cases all pass `round: 1`. That state is created by the very
feature D-24/D-26 introduced (jump out of the loop to consult setup) and is where WR-06
lives.

**Fix:** Add the composition tests. Both are short and both bite.

```ts
// header.test.ts — the loop boundary, driven by the navigator, not by hand
it('cruzar loopEndIndex con next() cambia la cabecera de "6 de 6" ronda N a "1 de 4" ronda N+1', () => {
  const base = expand(marvelChampions, context)
  const atEnd = { ...base, cursor: base.loopEndIndex!, round: 4 }
  expect(describeHeader(atEnd)).toEqual({
    sectionLabel: 'RONDA 4 · Villano', plainSectionTitle: 'RONDA',
    position: { current: 6, total: 6 },
  })
  expect(describeHeader(next(atEnd))).toEqual({
    sectionLabel: 'RONDA 5 · Jugadores', plainSectionTitle: 'RONDA',
    position: { current: 1, total: 4 },
  })
})

it('prev() en loopStartIndex con round 4 devuelve la cabecera a "6 de 6" de la ronda 3', () => {
  const base = expand(marvelChampions, context)
  const atStart = { ...base, cursor: base.loopStartIndex!, round: 4 }
  expect(describeHeader(prev(atStart))).toEqual({
    sectionLabel: 'RONDA 3 · Villano', plainSectionTitle: 'RONDA',
    position: { current: 6, total: 6 },
  })
})
```

```ts
// toc.test.ts — the consultation state D-24/D-26 create
it('cursor en la preparación con round 4 (salto de consulta): orden natural, sin atenuar, y ninguna fila de la ronda lleva done', () => {
  const base = expand(marvelChampions, context)
  const consulting = jumpTo({ ...base, cursor: base.loopEndIndex!, round: 4 }, 'setup.escenario.02')
  expect(consulting.round).toBe(4)
  const blocks = tableOfContents(consulting.sequence, consulting.cursor)
  expect(blocks.every(b => b.dimmed === false)).toBe(true)
  const loopRows = blocks.slice(7).flatMap(b => b.steps)   // Jugadores + Villano
  expect(loopRows.every(r => r.mark === null)).toBe(true)
})
```

---

### Info

#### IN-01: Four `content.test.ts` assertions re-check limits the schema already enforced and cannot fail independently

**File:** `engine/__tests__/content.test.ts:80-88`, `:380-387`, `:426-436`

**Issue:** `content.test.ts:11` runs `validateGameDefinition(rawMarvelChampions)` at
module scope. Any budget violation throws there and fails the entire file before a
single `it()` runs. So `text.length <= 90` / `warning.length <= 60` (line 83-86),
`warningDetail.length <= 320` (line 384), and `label.length <= 40` / `detail.length <= 320`
(line 431-432) are all downstream of a gate that has already enforced exactly those
numbers via `z.string().max(…)`. Same for `expect(new Set(labels).size).toBe(labels.length)`
at line 429, which the `superRefine` at `schema.ts:137-146` already guarantees.

These are not harmful, but they read as independent gates and are not — someone relaxing
`max(90)` in the schema would see zero test failures from this file's "budget" test. The
genuinely independent checks in the same tests (`not.toMatch(/\n/)` at lines 385 and
433-434, since the schema does not forbid newlines) are the ones carrying real weight.

**Fix:** Either drop the duplicated length assertions and keep only the newline checks,
or add a comment marking them as redundant-by-design belt-and-braces so a future reader
does not mistake them for the enforcing gate. Where a real second gate is wanted, assert
against `rawMarvelChampions` rather than the validated object.

---

#### IN-02: `schema.test.ts:108-111` is a semantic duplicate of `schema.test.ts:48-50`

**File:** `engine/__tests__/schema.test.ts:108-111`

**Issue:** `it('WR-06: minPlayers/maxPlayers son opcionales; sin ellos no lanza')` calls
`expect(() => GameDefinitionSchema.parse(baseGame())).not.toThrow()` — byte-identical to
`it('acepta un juego mínimo válido')` at line 48-50, since `baseGame()` never sets
`minPlayers`/`maxPlayers`. It adds a test-count of 1 and zero coverage.

**Fix:** Make it actually test optionality against a game that sets one but not the other
(`{ ...baseGame(), minPlayers: 2 }` — currently unasserted, and the `superRefine` at
`schema.ts:172` explicitly guards for that shape with its `!== undefined &&` pair), or
delete it.

---

#### IN-03: Both `index === -1` guards in `describeHeader` are unreachable

**File:** `engine/header.ts:56` and `:74`

**Issue:** In the repeating branch, `node` is drawn from `session.sequence`, and the
filter selects on `n.phaseId === node.phaseId` plus `kind === 'step'` — `node` satisfies
both (the `summary` case returned at line 42). In the linear branch the filter is
`!n.sectionRepeats`, and we only reach it when `node.sectionRepeats` is falsy. `runtimeId`
is globally unique (schema duplicate-id refinement). `findIndex` therefore cannot return
`-1` in either arm; `position: null` is dead in both.

Harmless defensiveness, but it obscures the invariant. **Fix:** either drop the ternaries
and return `{ current: index + 1, total: … }` directly, or keep them with a one-line
comment stating why they are belt-and-braces (matching the style used for the `?? 'step'`
fallback at line 34-39, which *is* genuinely reachable and is well explained).

---

#### IN-04: Redundant ternary arms in `IndexOverlay`'s row class binding

**File:** `app/components/IndexOverlay.vue:110`

**Issue:** `row.mark === 'current' ? 'text-primary-text' : row.mark === 'done' ? 'text-primary-text' : 'text-secondary-text'`
— the `current` and `done` arms produce the same class, so the nested ternary collapses
to a single condition. Written this way it reads as though the two marks are styled
differently, inviting a future edit that changes one arm and silently diverges from the
UI spec.

**Fix:** `:class="block.dimmed || row.mark === null ? 'text-secondary-text' : 'text-primary-text'"`.

---

#### IN-05: Hardcoded DOM id in `WarningDetailModal`

**File:** `app/components/WarningDetailModal.vue:55` and `:60`

**Issue:** `aria-labelledby="warning-detail-heading"` / `id="warning-detail-heading"` are
literals. Safe today because `index.vue:325` mounts at most one instance via
`v-if="activeDetail"`, but a second mount point (a modal over `MesaListaScreen`, or over
the resume flow) yields duplicate ids and an `aria-labelledby` that resolves to the wrong
heading for screen-reader users.

**Fix:** `const headingId = useId()` (Nuxt 4 provides it, SSR-stable) and bind both.

Related, same file: the panel uses `<h1>` (line 60) while `IndexOverlay` also uses `<h1>`
(line 72) and `StepScreen`'s action text is a `<p>` — the document has no consistent
heading hierarchy. Worth a pass in the Phase 3 accessibility work rather than here.

---

#### IN-06: The header counter and the index numbering disagree for the same loop step

**File:** `engine/header.ts:54-56`, `app/components/IndexOverlay.vue:38-48`

**Issue:** Inside the loop, `describeHeader` gives a *phase-relative* counter (D-22:
`RONDA 4 · Villano · 3 de 6`) while `IndexOverlay` numbers rows continuously across all
blocks (documented at lines 34-37: round as 1..10, setup as 11..34). The same step is
therefore "3" in the header and "7" in the index. Outside the loop the two agree only by
coincidence — setup's 23 `kind:'step'` nodes precede the single `summary`, so both
number a setup step identically.

Both behaviours are individually specified (D-22 and the approved 01-CONTEXT mock), so
this is not a defect against the contract — but at a tablet at arm's length, two numbers
for one step is a plausible source of "which one is the step number?" confusion.

**Fix:** Nothing to change in code. Worth surfacing to the user as a deliberate-or-not
question before Phase 3 adds voice, which will read one of these numbers aloud.

---

#### IN-07: The `tiny-game.json` fixture is never validated against the schema it stands in for

**File:** `engine/__tests__/header.test.ts:9-10`, `engine/__tests__/toc.test.ts:10-11`, `engine/__tests__/navigator.test.ts:10-11`

**Issue:** All three files load the fixture with `JSON.parse(...)` and cast directly to
`GameDefinition`; only `content/marvel-champions.json` goes through
`validateGameDefinition`. The fixture is the TECH-04 canary — its whole purpose is to
prove the engine is not wired against `ronda`/`Villano`/`Jugadores` — so a fixture that
has silently drifted out of schema conformance would keep passing while proving less than
the tests claim. (It conforms today; D-37's "revisar el fixture" note was honoured, and
it does carry a `repeats: true` section.)

**Fix:** One line per file: `const tinyGame = validateGameDefinition(JSON.parse(readFileSync(fixturePath, 'utf-8')))`.
Note that `navigator.test.ts`'s `noLoopGame()` (line 15-20) must keep bypassing validation
on purpose — it constructs a zero-repeating-section game that D-37 forbids, in order to
exercise `expand`'s `undefined` loop indices. Worth a comment saying so.

---

_Reviewed: 2026-08-29T22:06:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
