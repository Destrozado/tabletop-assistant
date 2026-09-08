---
phase: 6-selecci-n-de-villano-h-roes-y-jugadores
reviewed: 2026-09-08T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - engine/selection.ts
  - engine/types.ts
  - engine/schema.ts
  - engine/__tests__/selection.test.ts
  - engine/__tests__/schema.test.ts
  - engine/__tests__/persistence.test.ts
  - app/composables/useCharacterCatalogue.ts
  - app/composables/useHeroSearch.ts
  - app/data/spanish-hero-aliases.ts
  - app/composables/__tests__/useHeroSearch.test.ts
  - app/composables/__tests__/useStepShortcuts.test.ts
  - app/components/VillainPickerModal.vue
  - app/components/PlayerModal.vue
  - app/components/StepScreen.vue
  - app/composables/useGameSession.ts
  - app/pages/[game]/index.vue
  - content/marvel-champions.json
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-09-08
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found (no Critical findings; 1 Warning, 2 Info)

## Summary

This phase is unusually well executed for a five-agent parallel build. I went in
assuming the classic failure mode named in the brief — a mutator that mutates
`session.value.context.selection` (or a nested array) in place, which would update
the UI via Vue's reactive proxy but silently never fire the non-deep
`watchDebounced`, breaking SEL-08 only on reload. I traced every write path
(`engine/selection.ts` → `useGameSession.ts` → `app/pages/[game]/index.vue`) looking
for `.push(`, `.splice(`, direct nested-property assignment, or a shared-reference
leak between the old and new `heroes[]` arrays. **I could not find one.** Every
mutator in `engine/selection.ts` (`setVillain`, `setHero`, `setPlayerName`) rebuilds
`session`, `context`, `selection`, and `heroes` as new objects/arrays on every call
(verified by the phase's own referential-inequality test suite,
`engine/__tests__/selection.test.ts`, which explicitly asserts non-identity at all
five levels plus content-equality of untouched entries), and `useGameSession.ts`'s
wrapper functions do nothing but reassign `session.value`. All 465 existing/new
tests pass.

Defensive handling of corrupt/attacker-controlled `localStorage` (focus area 2) is
also thorough: `resolvePlayerSlots` normalizes by *type*, not by presence, always
returns exactly `playerCount` entries (truncating or padding as needed, never
trusting `selection.heroes.length`), and a dedicated D-20 test
(`persistence.test.ts`) constructs a session with a non-string `villainId`, a
40-character name, a `null` array entry, an empty-string `heroId`, and an
extra/orphaned 4th hero slot on a 3-player context, and asserts `resume()` resolves
all of it into clean, bounded, non-throwing output.

XSS surface (focus area 3): the player name is always rendered via `{{ }}`
interpolation or Vue attribute binding (`:aria-label`); no `v-html` appears anywhere
in the diff. Attribute-bound strings (aria-labels built from the typed name) are set
via the DOM property/attribute API, not string-concatenated into markup, so there is
no injection path even with special characters.

Contract seams between the five agents (focus area 4) line up: `StepScreen.vue`'s
new `selectionRows`/`duplicateWarningText` props and `select-row` emit match exactly
what `index.vue` passes/listens for; `VillainPickerModal`/`PlayerModal`'s props and
emits match their call sites; `useGameSession`'s `setVillain(id)` /
`setHero(slot, id)` / `setPlayerName(slot, name)` match `engine/selection.ts`'s
signatures one-for-one; `slotNumber` (1-indexed, for display) vs. `slot` (0-indexed,
for indexing) is converted correctly and consistently at the one point they cross
(`:slot-number="activeSelectionModal.slot + 1"`).

Locked-decision compliance (focus area 5) checked line-by-line against
`06-CONTEXT.md`/`06-UI-SPEC.md`: D-04 (`text-display`, no shrink), D-16/D-32 (the
`⚠` line is a plain `<p>`, never a `<button>`, no click handler), D-03/SEL-09 (no
gating of `SIGUIENTE`, `showsSelectionGrid`/`selectionRows` never block navigation),
D-15 (`maxlength="14"`), D-09 (no `autofocus` on either text input in `PlayerModal`;
initial focus goes to the `✕` button in both new modals), D-14 (no second
`localStorage` key — `selection` lives only inside the existing `SessionContext`)
all hold.

Accent/case-insensitive filtering (focus area 6): `normalizeForSearch` correctly
folds `ñ→n` (deliberate, documented, tested against `"ARAÑA" → "arana"`) and
capital accents (`"Capitán América" → "capitan america"`); a hero with no alias
falls back to its English catalogue name via `resolveHeroSpanishName` and is
covered by a dedicated non-throwing test.

The only defects worth flagging are two small pieces of quality/process drift, not
functional bugs — see below.

## Warnings

> **WR-01 quedó arreglado** en el mismo run autónomo, antes de cerrar la fase.
> `PlayerModal.vue` recibe ahora el tope por prop (`nameMaxLength`) y
> `app/pages/[game]/index.vue` lo enlaza desde `PLAYER_NAME_MAX_LENGTH`. Ya no
> existe una segunda copia del 14. El componente sigue sin importar
> `~~/engine/*` (regla de componente tonto): quien importa la constante es la
> página, que ya importaba otras funciones puras del motor.

### WR-01 [FIXED 2026-09-08]: `PLAYER_NAME_MAX_LENGTH` is duplicated as a bare literal in `PlayerModal.vue` instead of being derived from the single source of truth

**File:** `app/components/PlayerModal.vue:108`
**Issue:** `engine/selection.ts:25` defines `export const PLAYER_NAME_MAX_LENGTH = 14`
specifically so that "cualquier fase futura que muestre el nombre debe reutilizar
esta constante, no elegir otra" (comment at `engine/selection.ts:22-24`). The
`<input maxlength="14">` in `PlayerModal.vue:108` is a second, independent copy of
the same number. Nothing connects the two: a future change to
`PLAYER_NAME_MAX_LENGTH` (e.g. to fit a future Phase 7 counter-band redesign) would
silently leave the HTML `maxlength` attribute stale, and no test in the suite would
catch the drift (`grep` confirms zero cross-references between the two files, and
no test asserts `document`/component `maxlength` against the constant — there can't
be one today, since there's no jsdom/component-test environment, per Q7 of
`06-RESEARCH.md`). This is a real, if low-probability, correctness risk: the UI
would let a user type past the "true" cap and rely entirely on the invisible
server-side (`setPlayerName`) truncation to fix it up silently, with no visible
feedback that characters beyond the (changed) limit were dropped.
**Fix:** Since components must not import `~~/engine/*` directly (established
"componente tonto" rule), thread the cap through as a prop instead of hardcoding it
twice, e.g.:
```ts
// app/pages/[game]/index.vue
import { PLAYER_NAME_MAX_LENGTH } from '~~/engine/selection' // page already imports engine/*
...
<PlayerModal :name-max-length="PLAYER_NAME_MAX_LENGTH" ... />
```
```html
<!-- PlayerModal.vue -->
<input :maxlength="nameMaxLength" ... >
```
At minimum, add a comment at `PlayerModal.vue:108` cross-referencing
`engine/selection.ts:25` explicitly by name so a future editor greps for it before
changing either value (weaker fix, but better than the current one-way comment that
only points from engine → UI, never UI → engine).

## Info

### IN-01: `PlayerModal`'s `takenBy` prop type deviates from the approved `06-UI-SPEC.md` contract without updating the spec

**File:** `app/components/PlayerModal.vue:19`, `app/composables/useHeroSearch.ts:144-164`
**Issue:** `06-UI-SPEC.md`'s Component Inventory table specifies
`takenBy: Record<string, string[]>` (heroId → array of other slots' labels,
composed at the call site). The actual implementation instead has
`buildTakenByMap` pre-join the names into a single ready-to-render string
(`Record<string, string>`), with an explicit code comment explaining the choice
("para que `PlayerModal.vue` siga siendo tonto y no tenga que componer nada").
Functionally this is arguably *better* (it removes a join operation from the
template, keeping the component dumber) and is applied consistently everywhere it's
used — it's not a bug. But it is an undocumented deviation from a document marked
`status: approved` in its own frontmatter, and the Checker Sign-Off in
`06-UI-SPEC.md` doesn't reflect it. Left un-reconciled, a future reader of
`06-UI-SPEC.md` (including a future planner authoring Phase 7, which is told to
reuse this contract) will see a prop type that no longer matches the code.
**Fix:** Amend `06-UI-SPEC.md`'s Component Inventory row for `PlayerModal` to read
`takenBy: Record<string, string>` (pre-joined label), with a one-line note pointing
at the rationale already captured in `useHeroSearch.ts`.

### IN-02: Empty-filter message can read as a false "no match" when the catalogue itself is empty

**File:** `app/components/PlayerModal.vue:146-151`
**Issue:** `<p v-if="visibleHeroes.length === 0">Ningún héroe coincide con «{{ query }}»</p>`
fires whenever the filtered list is empty, without distinguishing "23 heroes exist
but none match the typed query" from "the hero catalogue for this game is empty"
(e.g. a future `getCatalogue(gameId)` returning `null` for a not-yet-cataloged
game, which `index.vue` already defensively handles by passing `heroOptions = []`).
In the latter case, with an empty `query`, the message would read
`Ningún héroe coincide con «»` — a confusing empty-quotes string implying a failed
search rather than "this game has no catalogue yet." Not reachable today (Marvel
Champions' catalogue always has 23 heroes), so not a Warning, but worth a defensive
guard before it becomes reachable for a second game (Warhammer 40.000).
**Fix:** Distinguish the two cases, e.g. `heroes.length === 0 ? 'Sin catálogo de héroes disponible' : 'Ningún héroe coincide con «{{ query }}»'`, or simply guard on `query.trim() !== ''` before showing the "no coincide" message.

---

_Reviewed: 2026-09-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
