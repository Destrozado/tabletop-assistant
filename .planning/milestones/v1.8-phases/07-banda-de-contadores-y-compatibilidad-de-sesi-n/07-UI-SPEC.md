---
phase: 7
slug: banda-de-contadores-y-compatibilidad-de-sesi-n
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-08
---

# Phase 7 — UI Design Contract

> Visual and interaction contract for the one new surface Phase 7 adds: the fixed
> counter band (`CounterBand.vue`) shown only during the repeating round loop. **This is
> a delta document.** `01-UI-SPEC.md` is the design system of record (colors, spacing
> scale, type scale, three-band screen layout, tap-feedback pattern, orientation guard);
> `06-UI-SPEC.md` extended it with the first text inputs and the second modal shape. Both
> carry forward unchanged. **One exception:** this phase narrows a legacy claim inherited
> from `01-UI-SPEC.md` — the unconditional 44px touch-target width floor — because the
> CR-01 overlap fix (plan 07-08) had to let the `▼`/`▲` arrows shrink below it at narrow
> viewports to stop cells stealing each other's taps. See the amended **Touch targets**
> bullet below for the exact scope of that narrowing; nothing else in either inherited
> document is touched.
>
> COMP-01/COMP-02 (session-compatibility with a v1.7 save) touch no visual surface — they
> are covered by the "defensive rendering" rules called out inline below (D-12/D-21) and
> by an engine-level test, not by anything new in this document.
>
> Compiled from 22 locked decisions (D-01..D-22) and four user-approved ASCII mockups in
> `07-CONTEXT.md` — every design question this phase raises was already answered during
> `/gsd:discuss-phase`. The only gaps left to close here are the ones `07-CONTEXT.md`
> explicitly named as **Claude's Discretion** (component name, exact `counters` shape's
> UI-facing consequences, the narrow-width breakpoint, cell anatomy at the pixel level).
> Every choice made to close those gaps is listed in **Decisions Made Without User
> Input** at the end, for review — none of them reopens or contradicts D-01..D-22.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — no shadcn / no component library (unchanged since Phase 1) |
| Preset | not applicable |
| Component library | none — hand-rolled Tailwind v4 components (unchanged) |
| Icon library | none — hand-rolled inline SVG / Unicode glyphs (unchanged) |
| Font | Inter (self-hosted woff2), fallback `system-ui, -apple-system, sans-serif` (unchanged) |

**Two new glyphs this phase: `▼` and `▲`.** The closed set through Phase 6 was
`≡ ✕ ✓ ● ‹ › ⚠` (six roles, all navigation/status). `▼`/`▲` are a new role —
**stepper controls**, not navigation — and are exactly the characters the user's
approved mockup in `07-CONTEXT.md` shows (`▼ 42 ▲`). No plus/minus (`+`/`−`) glyph was
considered: `07-CONTEXT.md`'s own mockups fix the glyph, so this isn't an open choice.
No new icon library is introduced to render them — same Unicode-glyph approach already
used for every other symbol in the app.

---

## Spacing Scale

Inherited verbatim from `01-UI-SPEC.md` — no new tokens.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Cell label top padding; gap between glyph and number where needed |
| sm | 8px | — (not newly used this phase) |
| md | 16px | — (not newly used this phase) |
| lg | 24px | — (not newly used this phase) |
| xl | 32px | — (not newly used this phase) |
| 2xl | 48px | — (not newly used this phase) |
| 3xl | 64px | — (not newly used this phase) |

**Exceptions (all reused or extended from prior phases, none arbitrary):**
- **Band height: `h-24` (96px), `shrink-0` — reused verbatim from `NavBand.vue`.**
  This is D-01, locked before construction, per HP-02: at the tablet-landscape target
  viewport (assumed 1024×768, since the table tablet's exact model/OS remains
  unidentified — see `STATE.md` Blockers) this is **12.5%** of viewport height, under
  the ~15% ceiling with ~22px of margin. **Prohibited:** the band must never carry
  `flex-1` or render without a height cap — `StepScreen` is the only `flex-1` child of
  the page's root flex column.
- **Touch targets: 44×44pt / 48×48dp floor (inherited) — split into its two axes, since
  plan 07-08's CR-01 fix made the old single-sentence version false.**
  - **Height: unconditional, no exception.** Every `▼`/`▲` button spans the band's full
    96px in every viewport, at every player count — this is D-02 (the tap zone spans the
    cell's complete height), it is locked, and this amendment does not touch it.
  - **Width: bounded to `>=760px` of viewport width.** The 44px floor holds from **760px
    of viewport width with the worst case of 4 players** — the target landscape viewport
    (1024x768) sits well inside that, at ~70px per arrow (per `07-08-SUMMARY.md`'s
    key-decisions) — and the threshold is lower still with fewer players
    (`152 * nº de celdas`). **Below that threshold the arrow shrinks on purpose:**
    applying the actual formula the 07-08 fix ships (`ancho de flecha = (ancho_viewport /
    (n+1) - suelo_del_número) / 2`, with the number's floor at `sm:min-w-16`=64px or,
    below the `sm` breakpoint, `min-w-12`=48px) to the app's own supported narrow
    viewports at 4 players gives: **~38px at 700x800, ~34px at 660x800, ~27.5px at
    412x915** (two rows below `sm`, player-cell width 103px). Human verification (07-11)
    confirmed the narrow 412x915 arrows are usable with a finger ("Sí, se aciertan
    bien") — so this is a deliberate, verified trade-off, not an unverified regression.
  - **Why shrinking is correct, not a degradation accepted lightly.** The alternative was
    CR-01's cell overflow, where a tap silently changed the wrong player's life total. A
    narrow target that responds to whoever taps it is strictly better than a wide one
    that steals the tap from its neighbor.
  - **Provenance of the claim being narrowed**, in one line, so nobody restores it from
    memory: D-02 fixes only the height, never a width; HP-10's touch-target clause is
    scoped to "en tablet horizontal"; and the 44x48pt floor is inherited from UI-02 of
    Phase 1 (`v1.7-REQUIREMENTS.md`), absent from the current `REQUIREMENTS.md`.
  - **What guards this now:** the touch-target assertion in
    `e2e/counter-band-overlap.spec.ts` (44px width as a hard guard AT 1024x768) and the
    human verdict of 07-11's Task 1 for the narrow widths below 760px.
- **NEW: `▼`/`▲` tap zone spans the cell's full height (96px), not just the row
  the glyph visually sits in.** D-02's explicit instruction ("las flechas son zonas
  pulsables de los 96px completos de alto") — the single largest touch target the
  96px budget allows without spending an extra pixel. See Layout for the DOM shape that
  achieves this without shrinking the visible label row.
- **NEW: hairline divider `border-l border-background` between cells**, `first:border-l-0`
  on the leftmost cell. Reuses `IndexOverlay`'s existing hairline-divider token
  (`border-background`, previously used as `border-t`), rotated to a vertical rule —
  needed because, unlike `NavBand`'s two buttons (already visually distinct: plain vs.
  accent-filled), every cell here has identical styling and would otherwise read as one
  unbroken strip.

---

## Typography

Inherited verbatim — still exactly 4 sizes, exactly 2 weights. **One new use of an
existing size, explicitly authorized by D-02:** Display, previously reserved solely for
the step's action sentence (`06-UI-SPEC.md`: "unchanged — no exception"), now also
renders the counter's numeric value — D-02 states this outright ("el número a
text-display, el mismo tamaño que el texto del paso"), because legibility "a un brazo de
distancia" (HP-10, `CLAUDE.md` §Constraints) is exactly what Display exists for, and a
life total is exactly the kind of value a group needs to read across the table without
squinting.

| Role | Size | Weight | Line Height | Use in this phase |
|------|------|--------|-------------|----------|
| Display | 40px | 700 | 1.2 | **NEW use:** the counter's numeric value (or `—`) in every cell — same weight/size as the step's action sentence, never smaller |
| Heading | 28px | 700 | 1.25 | **NEW use:** the `▼`/`▲` glyphs themselves — same size already used for `AppHeader`'s `≡` icon (`text-heading leading-none`) |
| Body | 20px | 400 | 1.5 | Not used inside the band this phase |
| Label | 18px | 700 | 1.2 | Cell label (`VILLANO`, player name, or `Jugador {n}`) — same token+weight `AppHeader`'s `sectionLabel` already uses (`text-label font-bold`) |

### Copy budgets

| Field | Budget | Status |
|-------|--------|--------|
| Player-cell label | **`PLAYER_NAME_MAX_LENGTH` = 14 characters** | Reused verbatim from `engine/selection.ts` (D-04) — not a new number. Fits the cell column at any player count (1–4 cells sharing the band's width). |
| `VILLANO` label | fixed, 8 characters | Never varies |
| Defeated suffix `· SIN VIDA` | fixed, 11 characters incl. separator | D-16's exact literal — see Copywriting Contract |
| Counter value | up to 3 digits (max realistic value: Ultron 51, or a group that has pushed ▲ well past any precharge) | No truncation logic needed — `text-display` at 3 digits still fits the ~`w-16` number column comfortably (verified against the same column width `NavBand`'s glyphs use) |

---

## Color

Inherited verbatim — no new hex value. Two existing reservations gain a new use; both
are extensions, not new roles, and neither breaks an existing invariant.

| Role | Value | Usage (unchanged reservations, extended below) |
|------|-------|--------|
| Dominant (60%) — background | `#14161C` | **NEW use:** the vertical hairline divider between cells (`border-background`, same token as `IndexOverlay`'s hairline, rotated) |
| Secondary (30%) — surface | `#1E212B` | **NEW use:** the band's own background (`bg-surface`) — same "chrome" role already given to `AppHeader` and `NavBand`, the two other fixed bands in the screen's flex column |
| Primary text | `#F2F3F5` | **NEW use:** cell label at rest (name / `VILLANO` / `Jugador {n}`); the counter's numeric value in every state, **including 0** (see the hard rule below) |
| Secondary text | `#9AA0AC` | Not newly used this phase |
| Accent (10%) | `#2F81F7` | **NEW use, extending the existing "interactive control" reservation** (already covers `Siguiente`'s fill, the index `●`/`✓`, `06-UI-SPEC.md`'s grid chevron): every `▼`/`▲` glyph, in every state, on every cell — they are always the interactive color, never dimmed, never disabled-looking (see Interaction & State Coverage) |
| Warning | `#FFB020` | **NEW use, extending the existing reservation** (already covers every `⚠` in the app): the defeated cell's **label only** (`{name} · SIN VIDA`), per D-15/D-16 |
| Destructive | `#FF5C5C` | Unchanged — no destructive action in this phase |

**Hard rule — the counter's numeric value is NEVER `text-warning`, not even at 0.**
D-15 is explicit that only the **label** (the line above the number) changes color when
a hero cell hits 0; the number itself stays Primary text always. This is the single most
important color rule in this phase, mirroring `06-UI-SPEC.md`'s equivalent rule for the
`ya:` marker: **the reservation that "warning color always means this needs attention"
must land on exactly one line (the label), not bleed into the number**, which is a plain
value the group reads dozens of times a round and must never be misread as an error
state.

**No new contrast computation needed.** Primary-on-Surface (14.5:1, AAA),
Accent-on-Surface (verified in `01-UI-SPEC.md` against `bg-surface` for NavBand's own
accent fill), Warning-on-Surface — no new hex, so no new math; the band's `bg-surface`
background is the same surface color every existing contrast ratio in `01-UI-SPEC.md`
was already computed against.

---

## Layout

### 1. Screen stack (unchanged elsewhere, one insertion)

```
┌──────────────────────────────────────────────────────┐
│ AppHeader                                    h-16     │  ← unchanged
├──────────────────────────────────────────────────────┤
│ CounterBand (round loop only, v-if)          h-24     │  ← NEW, D-03/D-07
├──────────────────────────────────────────────────────┤
│                                                        │
│              StepScreen                     flex-1    │  ← unchanged, still the
│                                                        │     only flex-1 child
├──────────────────────────────────────────────────────┤
│ NavBand                                      h-24     │  ← unchanged
└──────────────────────────────────────────────────────┘
```

- **Visibility (D-07):** `v-if` on a computed derived from `currentNode.value?.sectionRepeats
  === true` — the exact same derivation pattern `showsSelectionGrid` already uses for
  `section.selection === 'characters'` in `useGameSession.ts`. **Never** compare against
  the content id `ronda` (TECH-04). During all of setup the band is entirely absent —
  `StepScreen` keeps its full height for the large action-sentence text, which is where
  `PITFALLS.md` §4 says it matters most.
- **No fold/collapse control anywhere** (D-08). Nothing is added to `AppHeader`.
- **Position (D-03):** directly under `AppHeader`, never adjacent to `NavBand` — keeps
  every `▼`/`▲` at least 96px away from `SIGUIENTE`'s tap zone at all times.

### 2. Cell anatomy — the wide/target viewport (single row, all cells equal width)

```
┌────────────┬────────────┬────────────┬────────────┐
│  VILLANO   │    Ana     │   Bruno    │   Carla    │
│ ▼   42   ▲ │ ▼   14   ▲ │ ▼   12   ▲ │ ▼    9   ▲ │
└────────────┴────────────┴────────────┴────────────┘
   ^18px            ^40px
```

Every cell (villano and each player, no visual distinction beyond label text — same
"one uniform row pattern" precedent `06-UI-SPEC.md` set for its own grid rows) shares
this exact DOM shape. The label overlays the top of the cell **without consuming
height**, so the `▼`/`▲` buttons underneath can span the cell's **complete** 96px
(D-02's hard requirement):

```html
<div class="relative flex-1 min-w-0 h-24 border-l border-background first:border-l-0">
  <!-- Full-height tappable row: decrement | value | increment.
       items-end + pb-xs so the glyph/number visually sit in the lower two-thirds,
       leaving room for the label overlay above, WITHOUT reducing the tap zone. -->
  <div class="h-24 flex items-stretch">
    <button
      type="button"
      class="flex-1 min-w-11 h-24 flex items-end justify-center pb-xs text-heading font-bold leading-none text-accent transition-transform duration-75"
      :class="pressedKey === cell.key + ':down' ? 'brightness-95 scale-[0.98]' : ''"
      :aria-label="`Bajar vida de ${cell.label}`"
      @mousedown="pressedKey = cell.key + ':down'"
      @mouseup="pressedKey = null"
      @touchstart="pressedKey = cell.key + ':down'"
      @touchend="pressedKey = null"
      @click="emit('decrement', cell.key)"
    >▼</button>

    <span class="w-16 shrink-0 h-24 flex items-end justify-center pb-xs text-display font-bold leading-none text-primary-text">
      {{ cell.displayValue }}
    </span>

    <button
      type="button"
      class="flex-1 min-w-11 h-24 flex items-end justify-center pb-xs text-heading font-bold leading-none text-accent transition-transform duration-75"
      :class="pressedKey === cell.key + ':up' ? 'brightness-95 scale-[0.98]' : ''"
      :aria-label="`Subir vida de ${cell.label}`"
      @mousedown="pressedKey = cell.key + ':up'"
      @mouseup="pressedKey = null"
      @touchstart="pressedKey = cell.key + ':up'"
      @touchend="pressedKey = null"
      @click="emit('increment', cell.key)"
    >▲</button>
  </div>

  <!-- Label overlay: pointer-events-none so it never steals the tap zone below it. -->
  <span
    class="pointer-events-none absolute inset-x-0 top-0 pt-xs px-xs text-center truncate text-label font-bold leading-none"
    :class="cell.defeated ? 'text-warning' : 'text-primary-text'"
  >{{ cell.label }}</span>
</div>
```

- **`pressedKey` (D-14, reused literally from `NavBand.vue`'s pattern):** a single
  component-scoped `ref<string | null>` storing which specific button is currently
  pressed (`'{cellKey}:down'` / `'{cellKey}:up'`), because — unlike `NavBand`'s two
  static buttons — this component renders a dynamic number of buttons and needs one
  shared, keyed piece of visual-only state rather than one `ref` per button.
  **The increment/decrement action lives ONLY in `@click`, never in `@touchstart`**
  — the hard rule D-14 states verbatim, to avoid iOS Safari's ghost double-tap.
- **`▼`/`▲` are NEVER rendered as disabled, dimmed, or with reduced opacity in any
  state** — not at `—`, not at 0. Both remain full-accent-color and fully tappable at
  all times; only their *effect* is a silent no-op at the two boundaries (D-12: `▼` on
  `—` does nothing; D-15: `▼` at 0 does nothing). This is a deliberate absence of an
  affordance, matching this phase's stated aversion to any new confirmable/blockable
  state — do not add a `disabled` attribute or `opacity-40` treatment here.
- **Uniform cell width:** every cell (villano included) takes equal share of the band's
  width (`flex-1`), same "no visual distinction" precedent as `06-UI-SPEC.md`'s grid
  rows. No cell is ever wider just because its label ("VILLANO") is shorter/longer than
  another's.

### 3. Narrow viewport — two stacked rows (D-05/D-06)

```
┌──────────────────────────────────────────────────────┐
│                       VILLANO                          │  h-24 (row 1)
│                    ▼      42      ▲                     │
├──────────────────────────────────────────────────────┤
│      Ana        │      Bruno       │      Carla        │  h-24 (row 2)
│  ▼   14   ▲      │  ▼    12    ▲    │  ▼     9    ▲     │
└──────────────────────────────────────────────────────┘
```

- **Breakpoint: Tailwind `sm` (640px), the same breakpoint already in use in this
  codebase** (`StepScreen`'s `options` grid switches `grid-cols-1` → `sm:grid-cols-2`
  at this exact width) — chosen instead of a new value or a container query so this
  phase introduces no new responsive-design tooling. Below `640px`: two rows, each
  `h-24`, villano alone on top, all player cells sharing the row below (total band
  height 192px in that state). At `640px` and above (the tablet-landscape target):
  villano and every player cell flatten into the single row described in §2.
  **HP-02's ≤15% budget is measured ONLY at the target viewport (D-06)** — the 192px
  narrow-width total is an explicit, accepted decision, not a budget violation, and the
  human verification pass must not measure the 15% ceiling against a narrow/portrait
  viewport.
- **Implementation approach (suggested, not mandated syntax):** two wrapper `<div>`s
  (villano row, players row), each `h-24 shrink-0 flex` by default so they stack via the
  parent's `flex-col`; apply `sm:contents` to both wrappers and `sm:flex-row` to the
  parent so, at `sm:` and above, the wrapper boxes disappear from the layout and every
  cell becomes a direct flex child of one single-row container — no cell markup needs
  to change between the two states, only the two wrapper divs' own classes.
- **Number stays at `text-display` (40px) in both states** (D-05) — never shrinks in the
  narrow layout.

---

## Component Inventory

| Component | Change | Props / States |
|-----------|--------|-----------------|
| `CounterBand` | **NEW component** (`app/components/CounterBand.vue`). Dumb — no import from `~~/engine/*`, receives already-resolved display values. | `cells: { key: string, label: string, displayValue: string, defeated: boolean }[]` — `key` is `'villano'` or `'jugador-{slot}'`; `displayValue` is either a plain number as a string or `'—'` (already resolved by the caller — component never distinguishes `null` from a real value itself); `defeated` is `true` only for a hero cell whose live value is exactly `0`. Emits: `increment: [key: string]`, `decrement: [key: string]`. Internal-only state: `pressedKey` (visual press feedback, never persisted, resets on blur/unmount). |
| `StepScreen` | **Unchanged.** Confirmed NOT touched — the band is a sibling in the page template, never a child of `StepScreen` (per `07-CONTEXT.md`'s own Integration Points note). | — |
| `AppHeader` | **Unchanged.** Confirmed NOT extended — `07-CONTEXT.md` explicitly closes this door (D-08 references D-18 of Phase 6). | — |
| `NavBand` | **Unchanged.** Its pressed-state/click-only pattern is the literal template `CounterBand` copies (D-14), but the file itself is not modified. | — |

**Where the `cells` array comes from (context only, not this document's contract to
fix):** a computed in `useGameSession.ts` assembles it from the catalogue (Phase 5),
the current selection (Phase 6), and the new `context.counters` field — resolving each
entry to a live calculated value when untouched (`null`) or the frozen touched value
otherwise (D-09), and to `'—'` when no value is knowable yet (D-12). The exact shape of
that resolver is an engine/composable concern left to planning, not a visual contract
question — this document only fixes what the **component** renders and emits.

**Accessible names:**
- Every `▼`/`▲` button: `aria-label="Bajar vida de {cell.label}"` /
  `aria-label="Subir vida de {cell.label}"`, using the cell's **current** label (so the
  spoken name stays accurate as a player's name changes or a cell becomes defeated) —
  same "accurate at all times" precedent `06-UI-SPEC.md` set for its own grid-row
  `aria-label`s.
- No `role` override needed on the band itself — it is a plain `<div>` region, not a
  dialog; nothing here opens or closes, so none of `WarningDetailModal`'s modal-specific
  accessibility machinery applies.

---

## Interaction & State Coverage

### One tap = one step, no exceptions (D-13/HP-04/HP-10)

Every `▼`/`▲` tap changes the underlying value by exactly 1. **No press-and-hold
repeat exists anywhere in this component** — this is the entire mechanism by which
HP-10's "sin repetición descontrolada" is satisfied: there is no repetition to lose
control of. Do not add `setInterval`/`requestAnimationFrame`-based repetition; it was
explicitly considered and rejected (see `07-CONTEXT.md` Discussion Log) because the
"finger slides off the button" failure mode it would introduce can only be verified on
a real touch device, which this project does not yet have identified.

### Boundaries are silent no-ops, never disabled-looking (D-12/D-15)

- `▼` on a cell showing `—`: nothing happens. `▲` on `—`: the cell becomes `1`.
- `▼` on a hero cell at `0`: nothing happens (never goes negative).
- `▲` on a hero cell at `0`: becomes `1`, and the label immediately reverts from
  `{name} · SIN VIDA` to the plain name (D-15/D-07 reversibility, HP-07).
- None of these boundaries change the button's appearance. See Layout §2's explicit
  rule against disabled/dimmed states.

### Defeated marker — label only, no dialog, no game-end (D-15/D-16/HP-06)

When a hero cell's live value is exactly `0`: that cell's **label** (not the number)
switches to `{name-or-"Jugador N"} · SIN VIDA` in `text-warning`. **No modal, no
confirmation, no navigation, no change to the round loop.** The villain cell never
shows this state (D-11 — the band does not track villain stages or "defeat").

### Tapping `▼`/`▲` never advances the step, and existing shortcuts are untouched (D-17/HP-09)

`Espacio`/`Enter`/`←` behave **identically** to v1.7. This phase adds a one-line comment
in `app/composables/useStepShortcuts.ts` documenting *why* no new guard branch is
needed (a focused `<button>` is not one of `isEditableTarget`'s excluded element types,
so `Espacio`'s existing `preventDefault()` already suppresses the native button
activation while still advancing the step — exactly like today) plus a test that pins
this behavior. **`shortcutsEnabled`'s pure function gains zero new branches.** This is a
documented decision, not an oversight — do not "fix" it by adding a guard.

### Persistence — free, by construction, if mutators reassign correctly (D-19/D-20/HP-08)

`counters` is an **optional** field on `SessionContext`, exactly like `selection`.
`formatVersion` stays at `1`. `engine/persistence.ts` is not modified. HP-08 (surviving
a mid-game reload) requires nothing new in this component or in persistence code — it
requires only that every counter mutator in the engine **reassign** a new object at
every level it touches (`session`, `context`, `counters`, the array, the entry), because
`watchDebounced(session, …, 300ms)` in `app/pages/[game]/index.vue` is **not** deep. An
in-place mutation would still repaint the screen (Vue's reactive proxy) but would never
trigger a save — a bug invisible in development, real in production.

### Compatibility with a v1.7 save (COMP-01/COMP-02) — a rendering contract, not a visual one

A `PersistedPosition` built by the currently-deployed v1.7 has `context.counters`
**absent entirely**. This component and its data source must treat that exactly like
"nobody has touched this counter yet" (D-12's `null`/`—` state) — **never** `undefined`
or `NaN` reaching `displayValue`, and never a crash. This is the same contract
`resolvePlayerSlots` in `engine/selection.ts` already models for `selection`: validate by
type, never trust presence, derive array length from `playerCount` (never from
`counters.heroHealth.length`), never throw. A dedicated engine test (D-21) constructs
exactly this v1.7-shaped session by hand and asserts the band would render `—`
everywhere with no undefined value — that test is this phase's actual proof for
COMP-01/COMP-02, not anything visual.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Villain cell label | `VILLANO` (fixed, uppercase, never changes) |
| Player cell label (unnamed) | `Jugador {n}` — `n` = 1..4, identical fallback to `06-UI-SPEC.md`'s grid row |
| Player cell label (named) | the player's typed name, unchanged case, capped at 14 chars (`PLAYER_NAME_MAX_LENGTH`, reused not reinvented) |
| No value known | `—` — same glyph and meaning as `06-UI-SPEC.md`'s empty grid-row value (D-12) |
| Defeated label suffix | `{label} · SIN VIDA` — e.g. `Ana · SIN VIDA`, or `Jugador 2 · SIN VIDA` if unnamed. **`SIN VIDA` is the exact, invariant literal (D-16)** — never `DERROTADO/A`, never `K.O.` |
| `▼` button accessible name | `Bajar vida de {label}` |
| `▲` button accessible name | `Subir vida de {label}` |
| Primary CTA (unchanged, no new CTA this phase) | `SIGUIENTE` — this phase adds no gate, no required action, and the band has no confirm/save affordance of its own |
| Empty state | Not applicable — the band always renders once visible (D-07); `—` is its own per-cell "nothing to show yet" state, not a separate empty-state screen |
| Error state | Not applicable — no network call, no async operation, no validation gate anywhere in this phase (catalogue and selection both already ship in the bundle) |
| Destructive confirmation | **None.** Every counter change is a single reversible step (▲ undoes ▼ and vice versa, D-18) — no diminishing-to-zero action is treated as destructive, per HP-06's explicit "no ends the game, no dialog" |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none | not applicable — no component registry in use |
| third-party | none | not applicable |

No shadcn/registry tooling was initialized in Phase 1 and this phase does not reopen
that decision.

---

## Decisions Made Without User Input

Every choice below fills a gap `07-CONTEXT.md` explicitly left to research/planning
discretion (see its `<decisions>` §"Claude's Discretion") — none reopens or contradicts
D-01..D-22.

1. **Component name: `CounterBand.vue`**, matching `ARCHITECTURE.md`'s own proposed
   name, as a single flat component with no `CounterCell` subcomponent — mirrors this
   codebase's existing preference for inline `v-for` row markup over an extra file for
   a simple repeated row (`StepScreen`'s own `selectionRows`/`options` rows do the same).
2. **Narrow-width breakpoint: Tailwind `sm` (640px)**, reusing the exact breakpoint
   value already used elsewhere (`StepScreen`'s `options` grid) rather than introducing
   a new value or a container query — no new responsive-design tooling this phase.
3. **Cell DOM shape: a full-height tappable row (`▼`/number/`▲`) with the label as a
   `pointer-events-none` absolute overlay on top**, rather than a two-row cell (label
   row + button row) — the only way to satisfy D-02's literal instruction that the
   arrows' tap zone spans the *complete* 96px, not 96px minus a label row.
4. **`▼`/`▲` glyph size: Heading (28px)**, reusing the exact size/weight already used
   for `AppHeader`'s `≡` icon, rather than introducing a new icon size for this phase.
5. **A vertical hairline divider (`border-l border-background`) between cells** —
   necessary because, unlike `NavBand`'s two visually-distinct buttons, every cell here
   shares identical styling and would otherwise read as one unbroken strip; reuses
   `IndexOverlay`'s existing hairline color token, rotated from horizontal to vertical.
6. **Band background: `bg-surface`** — matches the "chrome band" treatment already given
   to `AppHeader` and `NavBand` (the other two fixed, non-content bands in the screen's
   flex column), as opposed to `StepScreen`'s `bg-background`.
7. **`pressedKey` as one shared, keyed `ref<string | null>`** rather than one `ref` per
   button — necessary because this component renders a dynamic number of buttons
   (unlike `NavBand`'s fixed two), while still satisfying D-14's literal instruction to
   separate visual press-state from the `@click` action.
8. **`▼`/`▲` are never rendered as disabled/dimmed at any boundary state** — a deliberate
   reading of D-12/D-15's "silent no-op" language as "no visual affordance change
   either," consistent with this phase's stated aversion to adding any new confirmable
   state; flagged explicitly so a future pass doesn't "improve" this into a disabled
   button by habit.
9. **Aria-labels on the arrow buttons use the cell's live label**, not a static string —
   mirrors `06-UI-SPEC.md`'s own precedent of keeping spoken names accurate as
   selections/names change, extended here to the defeated-label case too.

---

## Forward-Compatibility Notes

- **Phase 8 (parenthetical known values):** renders a number **inside the step's text**
  (`StepScreen`'s action sentence / options), never inside this band — the two surfaces
  show the same underlying catalogue numbers from two different places with no layout
  overlap to coordinate.
- **Villain stages (deferred, not built):** the catalogue already stores all three
  stages (Phase 5) and nothing in this component's contract blocks adding a stage
  control later — if that ever happens, it is a **new element** in the villain cell
  (or a new row), not a rework of the anatomy specified here.
- **`SIN VIDA` is now a fixed literal used by this document** — any future screen that
  needs to describe a hero at 0 health (e.g. a future histórico/estadísticas detail
  view) should reuse this exact string rather than inventing a second phrasing.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
