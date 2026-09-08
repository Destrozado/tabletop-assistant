---
phase: 6
slug: selecci-n-de-villano-h-roes-y-jugadores
status: approved
shadcn_initialized: false
preset: none
created: 2026-09-08
approved: 2026-09-08
---

# Phase 6 — UI Design Contract

> Visual and interaction contract for the three surfaces Phase 6 touches: the selection
> grid rendered inside step `setup.heroes.01` (an extension of `StepScreen.vue`), the
> villain-picker modal (new), and the player modal — name field + hero picker with
> filter (new). **This is a delta document.** `01-UI-SPEC.md` is the design system of
> record (colors, spacing scale, type scale, three-band step layout, tap-feedback,
> orientation guard) and `02-UI-SPEC.md` established the first modal precedent
> (`WarningDetailModal`, focus management, three-dismiss-paths). Both carry forward
> unchanged. Nothing in this phase contradicts either.
>
> Generated autonomously (`mode: yolo`) from 20 locked decisions (D-01..D-20) and three
> user-approved ASCII mockups in `06-CONTEXT.md`. Every open gap those decisions leave is
> closed below and logged in **Decisions Made Without User Input** at the end, for
> review — none of them reopen or contradict a locked decision.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — no shadcn / no component library (unchanged from Phase 1/2) |
| Preset | not applicable |
| Component library | none — hand-rolled Tailwind v4 components (unchanged) |
| Icon library | none — hand-rolled inline SVG / Unicode glyphs (unchanged) |
| Font | Inter (self-hosted woff2), fallback `system-ui, -apple-system, sans-serif` (unchanged) |

**No new glyph this phase.** The closed 5-glyph set (`≡ ✕ ✓ ● ‹ › ⚠`) already covers
everything this phase needs: `›` for every tappable grid row (villano/jugador, exactly
like the existing `options[]` rows), `✕` for both new modals' close buttons, `✓` for
marking a slot's currently-chosen entry inside its modal (new use of an existing
reservation — see Color), and `⚠` for the repeated-hero line under the grid (D-16, never
clickable — see Interaction & State Coverage). No search/magnifying-glass icon is added
for the filter field — the placeholder text alone (`Buscar héroe…`) carries that meaning,
consistent with the project's "fixed, tiny icon set" philosophy already stated twice
(`01-UI-SPEC.md`, `02-UI-SPEC.md`).

---

## Spacing Scale

Inherited verbatim from `01-UI-SPEC.md` — no new tokens.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gaps; gap between a hero row's two stacked lines |
| sm | 8px | Compact spacing; gap between "ELECCIÓN" label and the grid; modal internal gaps |
| md | 16px | Default element spacing; row internal padding (`px-md`) |
| lg | 24px | Section padding; gap between action sentence and the grid; modal header/body gaps |
| xl | 32px | Layout gaps; modal backdrop side padding |
| 2xl | 48px | Major section breaks; modal panel padding |
| 3xl | 64px | Page-level spacing |

**Exceptions (all reused from Phase 1, none new):**
- **Tap targets: 44×44pt / 48×48dp floor.** Applies to every grid row, both modals'
  close buttons, every hero/villain row, the `Sin elegir` row, and the Nombre/filter text
  inputs. `min-h-12` (48px) is the floor for all of them.
- **Modal panel: `max-w-[640px]`, `max-h-[80vh]`.** Same max-width already used by
  `WarningDetailModal`; the height cap is new (this phase's modals scroll a list,
  `WarningDetailModal` did not) — see Layout.
- **Text-input focus border: `border-b-2` (2px).** NEW and canonical. These are the
  first text inputs in the app, so there was no precedent to inherit. The convention is
  `border-b-2 border-transparent focus:border-accent outline-none` — a 2px bottom border
  that is transparent at rest and takes the accent color on focus, so the input's height
  never shifts between states. **Any future text input (Phase 7+) reuses this exact
  treatment** rather than inventing a second one; it is recorded here as the
  design-system addition of this phase.

---

## Typography

Inherited verbatim — still exactly 4 sizes, exactly 2 weights. No new size, no new
weight, and — per the established rule that role is set by **color, not size/weight**
for list rows (`IndexOverlay`'s row-label convention) — both lines of a hero row use the
**same** size/weight token, differentiated only by text color.

| Role | Size | Weight | Line Height | New use this phase |
|------|------|--------|-------------|----------|
| Display | 40px | 700 | 1.2 | unchanged — `setup.heroes.01`'s action sentence stays at Display, no exception (D-04) |
| Heading | 28px | 700 | 1.25 | Villain-modal / player-modal title bar (`VILLANO`, `JUGADOR {n}`) — same size/role `IndexOverlay`'s title bar already uses |
| Body | 20px | 400 | 1.5 | Hero row's dominant line (Spanish name) AND secondary line (English · alter ego) — **color, not size, is what makes one "dominant"** (see Color); `Sin elegir` row; Nombre/filter input text and placeholder; empty-filter message; grid row label + value |
| Label | 18px | 700 | 1.2 | "ELECCIÓN" section label (reuses the exact `text-label font-bold uppercase text-secondary-text` class list already used for `StepScreen`'s "Opciones" label); "Nombre" / "Héroe" field labels |

### Character budgets

| Field | Budget | Status |
|-------|--------|--------|
| `text` / `warning` (authored content) | ≤90 / ≤60 chars | Unchanged — this phase adds no new authored `text`/`warning`/`speech` field (D-02 touches schema structure only, never a character-bearing field) |
| **Player name (Nombre field, NEW)** | **14 characters, hard `maxlength`** | New this phase — closes D-15's "cifra exacta" gap. See rationale below. |
| Repeated-hero grid warning line (⚠, NEW) | not budgeted as authored content | **Computed at render time from player names, not authored** — the 60-char authored-content rule does not apply; keep the join formula in Copywriting Contract short regardless |

**Rationale for the 14-character name cap (closes D-15's open cifra):** D-15 asks for "del
orden de 12–16," measured against the grid row and against Phase 7's future counter band.
14 sits at the midpoint. At `text-body` (20px), 14 Latin characters comfortably fit the
grid row's value column without truncation even in the worst case (a name that long next
to a long hero value like "Bruja Escarlata"), so **no ellipsis/truncation logic is needed
anywhere this phase touches** — the cap itself is the truncation mechanism, exactly as
D-15 asks. `maxlength="14"` on the `<input>` is sufficient; no JS clamp needed beyond the
native attribute.

---

## Color

Inherited verbatim — no new hex value, no new role. Every new visual state this phase
introduces is built from the five existing roles, extending (never breaking) their
stated reservations.

| Role | Value | Usage (unchanged reservations, extended below) |
|------|-------|--------|
| Dominant (60%) — background | `#14161C` | App background; **NEW use:** both modals' translucent scrim (`bg-background/80`, same token WarningDetailModal already uses at that alpha); the Nombre/filter input's own fill (`bg-background`, reads as an inset field against the `bg-surface` modal panel) |
| Secondary (30%) — surface | `#1E212B` | Header, nav band, index overlay panel, `WarningDetailModal` panel; **NEW use:** both new modal panels |
| Primary text | `#F2F3F5` | Hero sentence, headings; **NEW use:** hero row's dominant (Spanish) line, `Sin elegir` row, grid row label/value when filled, modal title bar, Nombre/filter input text |
| Secondary text | `#9AA0AC` | Dimmed setup rows in the loop's index overlay; **NEW use:** hero row's secondary line (English · alter ego), the `ya: {nombre}` marker (see below), grid row value when empty (`—`), input placeholder text, empty-filter message |
| Accent (10%) | `#2F81F7` | Siguiente fill, index `●`/`✓`, selected segmented option, `Entendido` fill; **NEW use, extending the same reservation:** every grid row's trailing `›` chevron (identical role to `options[]`'s existing chevron use); the `✓` marking a slot's **currently-chosen** entry inside its own modal (new use of the exact same "done/selected" semantic `IndexOverlay`'s `✓`/`●` already carry); the Nombre/filter input's focus ring (`focus:border-accent`, extending the "selected state" reservation `MiniSetupScreen`'s segmented control already established) |
| Warning | `#FFB020` | **Reservation extended, not broken:** the grid's repeated-hero `⚠` line (D-16) — same "this needs your attention" meaning as every other `⚠` in the app, still never clickable here (see Interaction & State Coverage) |
| Destructive | `#FF5C5C` | Unchanged — no destructive action in this phase (see Copywriting Contract) |

**Critical color rule — the `ya: {nombre}` marker is Secondary text, NEVER Warning.**
This is the single most important color decision in this phase's contract: it would be
easy to reach for the warning color for "already taken," but `01-UI-SPEC.md`'s Warning
reservation is explicit — "reserved for exactly: the `⚠` icon + warning-line text… never
used for anything else, so its appearance always means 'this step has a trap.'" The
`ya:` marker is informative, not a trap warning (D-16: the hero "sigue siendo elegible" —
it is not an error state), so it must read as calm supporting text: Secondary text color,
`text-body font-normal`, no icon, no border. Using Warning color here would silently
break the app-wide invariant that Warning-colored text always means "this step has a
trap" — a real risk the checker should verify against.

**No new contrast computation needed.** Every new pairing reuses a ratio `01-UI-SPEC.md`
already verified: Primary-on-Surface (14.5:1, AAA), Secondary-on-Background (6.9:1, AA),
Warning-on-Background (9.9:1, AAA), Accent-on-Background as a graphical mark (4.83:1,
passes WCAG 1.4.11's 3:1 non-text floor) — no new hex, so no new math.

---

## Layout

### 1. The selection grid inside `setup.heroes.01` (extends `StepScreen`)

```
┌──────────────────────────────────────────────────────┐
│ HÉROES · 3 de 21                    3 jug · Normal  ≡│  ← unchanged AppHeader
├──────────────────────────────────────────────────────┤
│                                                        │
│         Decidid, como grupo, qué villano vais         │  ← Display 40/700,
│           a enfrentar y qué héroe llevará              │     UNCHANGED (D-04) —
│                cada jugador.                            │     never shrinks
│                                                        │
│   ELECCIÓN                                             │  ← Label 18/700, uppercase,
│   ┌──────────────────────────────────────────────┐    │     secondary-text (reuses
│   │ Villano                    —                ›│    │     "Opciones" label class)
│   │ Jugador 1                  —                ›│    │
│   │ Jugador 2                  —                ›│    │  ← single column
│   │ Jugador 3                  —                ›│    │    (grid-cols-1, NOT
│   └──────────────────────────────────────────────┘    │    sm:grid-cols-2 — D-04
│                                                        │    rejects 2-col: too
│   ⚠ Ana y Bruno llevan el mismo héroe                  │    narrow for hero names)
│                                                        │
├──────────────────────────────────────────────────────┤
│   ‹ Atrás              │        SIGUIENTE  ›          │  ← unchanged, no gate (D-03)
└──────────────────────────────────────────────────────┘
```

- **Container:** the grid lives inside `StepScreen`'s existing vertically-centered,
  `max-w-[960px]` content column, same as the action sentence. The row block itself is
  capped at `max-w-[720px]`, same width `options[]` already uses — **only the column
  count changes** (1 instead of `sm:grid-cols-2`), per D-04's explicit rejection of a
  2-column layout for this step.
- **Gap above the grid:** `lg` (24px) below the action sentence — same gap the warning
  line already uses in every other step, so this step doesn't introduce a new rhythm.
- **"ELECCIÓN" label:** `text-label font-bold uppercase text-secondary-text`, `gap-sm`
  (8px) above the row block — literally the same class list as `StepScreen`'s existing
  "Opciones" label, renamed.
- **Row anatomy (villano row and each jugador row, visually identical — see rationale
  below):**
  ```
  <button class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md
                  text-left text-body font-normal border-b border-accent/50
                  transition-transform duration-75 active:brightness-95">
    <span class="min-w-0 truncate text-primary-text">{{ rowLabel }}</span>
    <span class="min-w-0 flex-1 text-right truncate"
          :class="hasValue ? 'text-primary-text' : 'text-secondary-text'">
      {{ valueLabel }}
    </span>
    <span class="text-accent shrink-0">›</span>
  </button>
  ```
  This is the **exact** `border-b border-accent/50` / chevron treatment `options[]`
  already uses (D-01's literal instruction) — the only addition is the middle "current
  value" span, which `options[]` doesn't have (its rows are pure labels, no state).
- **Row label:** `Villano` for the first row (fixed, never changes); `Jugador {n}`
  (default) or the player's typed name once set, for each player row — the mockup's own
  rule ("una vez puestos los nombres, la etiqueta… es su nombre").
- **Row value:** `—` (Secondary text) when nothing is chosen; the chosen entry's display
  name (Primary text) once set. For a villain: the catalogue `name` as-is (`Rhino`,
  `Ultron`, `Kang` — no Spanish alias layer exists for villains, D-05 is heroes-only).
  For a hero: the **Spanish alias** if the alias map has one, else the catalogue English
  `name` (D-05's stated fallback — "un héroe sin alias… nunca falla").
- **No visual distinction between the villano row and jugador rows** beyond their label
  text. Nothing in `06-CONTEXT.md` asks for one, the approved mockup renders them
  identically, and D-01's whole premise is reusing one uniform row pattern — inventing a
  villain-specific accent (icon, border color, etc.) would be an unrequested visual
  variant this phase doesn't need.
- **Row order:** Villano always first, then Jugador 1..N in mini-setup order. Never
  reordered, never conditionally hidden (D-03 — always visible, always all rows).
- **Accessible name per row (recommended, low cost):** since the visible text alone would
  read awkwardly to a screen reader (`"Villano — ›"`), set an explicit `aria-label` per
  row: `Elegir villano` for the villain row, `Elegir héroe y nombre de {rowLabel}` for
  each player row (using the row's *current* label, so it stays accurate as names
  change).

### 2. The repeated-hero warning line (D-16, grid-level)

```html
<p class="text-body font-normal text-warning">⚠ {{ duplicateWarningText }}</p>
```

- **Never a `<button>`.** No border, no chevron, not `cursor-pointer` — D-16's explicit
  rule, same mechanism D-32 already established in Phase 2 for a `⚠` with no detail.
  Does **not** open `WarningDetailModal` or anything else.
- **Position:** directly below the row block, at `gap-sm` (8px) inside the same flex
  column as the rows — the **exact** spacing the existing non-clickable
  `optionsWarningText` fallback already uses, so this doesn't invent a new rhythm.
- **Visible only when at least one hero is duplicated across player slots** (villains
  can't duplicate — one slot). Absent entirely otherwise — no empty placeholder line.
- **Copy formula (computed, not authored — see Copywriting Contract for exact strings).**

### 3. Villain-picker modal (NEW component: `VillainPickerModal.vue`)

```
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░ ┌──────────────────────────────┐ ░
                    ░ │  VILLANO                    ✕ │ ░  ← h-16 title bar,
                    ░ ├──────────────────────────────┤ ░     border-b border-background,
                    ░ │  Sin elegir                    │ ░     Heading 28/700 title
                    ░ │ ──────────────────────────────  │ ░  ← hairline divider
                    ░ │  Kang                        ✓ │ ░  ← ✓ = currently chosen
                    ░ │  Rhino                         │ ░     (accent), only ONE
                    ░ │  Ultron                        │ ░     row ever has it
                    ░ └──────────────────────────────┘ ░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

- **Chrome:** `fixed inset-0 z-50 bg-background/80 flex items-center justify-center
  px-xl` scrim (same token/opacity `WarningDetailModal` uses — see rationale below),
  wrapping a panel `w-full max-w-[640px] max-h-[80vh] bg-surface flex flex-col`.
- **Title bar (fixed, non-scrolling):** `h-16 shrink-0 flex items-center justify-between
  px-lg border-b border-background` — literally `IndexOverlay`'s own title-bar markup,
  reused verbatim. Title: `VILLANO`, `text-heading font-bold text-primary-text`. Close
  button: `✕`, `w-12 h-12`, `aria-label="Cerrar selector de villano"`.
  `role="dialog" aria-modal="true" aria-labelledby="{title-id}"`.
  **`click.self` on the scrim closes** — same as `WarningDetailModal`.
- **Body (scrollable, `flex-1 overflow-y-auto`):** `Sin elegir` row first, then the 3
  villains, alphabetically by their catalogue `name` (`Kang`, `Rhino`, `Ultron`) — no
  alias layer exists for villains, so there's no "which name sorts first" ambiguity D-06
  had to resolve for heroes.
- **No filter field** (D-10 — 3 entries). No `Nombre` field (villains don't have one).
- **Row anatomy:** single-line, `min-h-12 px-md py-sm flex items-center justify-between
  text-left text-body font-normal text-primary-text w-full`, plus a trailing `✓`
  (`text-accent`) **only** on the row matching the currently-selected villain (or on
  `Sin elegir` if none is selected yet). Tapping any row (including the already-selected
  one) saves and closes (D-13 — idempotent, no special-case needed).
- **Focus on open:** the `✕` button (safe default — no text field to worry about here,
  but keeps the contract identical to the player modal below).
- **Focus on close (any of the 3 paths):** returns to the `Villano` grid row that opened
  it (`detailTriggerEl`-style capture at the call site, same mechanism `onOpenWarningDetail`
  already uses in `app/pages/[game]/index.vue`).

### 4. Player modal (NEW component: `PlayerModal.vue`)

```
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░ ┌──────────────────────────────┐ ░
                    ░ │  JUGADOR 1                  ✕ │ ░  ← title is the SLOT number,
                    ░ ├──────────────────────────────┤ ░     never the typed name —
                    ░ │  Nombre                        │ ░     stays "JUGADOR 1" even
                    ░ │  ┌────────────────────────┐    │ ░     after naming "Ana"
                    ░ │  │ Jugador 1               │    │ ░  ← Nombre field, fixed
                    ░ │  └────────────────────────┘    │ ░     (non-scrolling) zone
                    ░ │                                │ ░
                    ░ │  Héroe                         │ ░
                    ░ │  ┌────────────────────────┐    │ ░
                    ░ │  │ Buscar héroe…           │    │ ░  ← filter, NOT autofocus
                    ░ │  └────────────────────────┘    │ ░     (D-09)
                    ░ ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤ ░  ← from here down: SCROLLS
                    ░ │  Sin elegir                    │ ░
                    ░ │ ──────────────────────────────  │ ░  ← hairline divider
                    ░ │  Antman                        │ ░
                    ░ │  Ant-Man · Scott Lang          │ ░
                    ░ │                                │ ░
                    ░ │  Avispa               ya: Ana ✓│ ░  ← "ya:" (secondary-text,
                    ░ │  Wasp · Janet van Dyne          │ ░     never warning-color) +
                    ░ │                                │ ░     ✓ (this slot's own pick)
                    ░ │  Bruja Escarlata               │ ░     can co-occur (D-16 allows
                    ░ │  Scarlet Witch · Wanda Maximoff│ ░     the SAME hero in 2 slots)
                    ░ └──────────────────────────────┘ ░
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

- **Chrome:** identical scrim/panel/title-bar contract to the villain modal above —
  `bg-background/80` scrim, `max-w-[640px] max-h-[80vh] bg-surface` panel, `h-16`
  title bar reused from `IndexOverlay`. `role="dialog" aria-modal="true"
  aria-labelledby`. Close button `aria-label="Cerrar jugador {n}"` (the slot number, same
  reasoning as the title — stable regardless of the typed name).
- **Title = `JUGADOR {n}`, the slot's fixed position — never the player's current
  name.** Matches the approved mockup exactly (stays "JUGADOR 1" even once "Ana" is
  typed into the Nombre field below it) and avoids a title that visibly changes while
  the user is still typing.
- **Fixed (non-scrolling) zone, top of panel:** `Nombre` label (`text-label font-bold
  text-primary-text`) + text input, then `Héroe` label + filter text input. Both inputs
  share one visual treatment:
  ```html
  <input class="w-full min-h-12 px-md bg-background text-body font-normal
                text-primary-text placeholder:text-secondary-text
                border-b-2 border-transparent focus:border-accent outline-none" />
  ```
  — `bg-background` reads as an inset field against the `bg-surface` panel; the
  `focus:border-accent` ring is the only visual "focused" feedback (no native browser
  outline needed, `outline-none` removes it deliberately since the accent border already
  serves that role — consistent contrast-verified accent use).
- **Nombre input:** value defaults to `Jugador {n}` (real text, not a placeholder —
  visible and immediately editable/selectable), `maxlength="14"` (see Typography). Saves
  on every keystroke (`@input`, D-13) — no debounce needed in the UI layer, the existing
  page-level `watchDebounced(session, …, 300ms)` already covers persistence.
- **Filter input:** placeholder `Buscar héroe…`, **`autofocus` explicitly NOT set** (D-09
  — the modal opens with the keyboard down and the full list visible). Matching is
  case- and accent-insensitive, OR'd across the Spanish alias, the catalogue English
  name, and the alter ego (D-08) — substring match anywhere in any of the three fields,
  not prefix-only.
- **Divider:** a hairline (`border-t border-background`, `IndexOverlay`'s own divider
  treatment) separates the fixed Nombre/Héroe zone from the scrollable list below it.
- **Scrollable zone (`flex-1 overflow-y-auto`):** `Sin elegir` row first
  (`min-h-12 px-md py-sm text-body font-normal text-primary-text border-b
  border-background`, plus a trailing `✓` if `heroId` is currently `null` for this slot),
  then the (filtered) hero list, sorted alphabetically by Spanish alias (D-06).
  **`Sin elegir` is never filtered out** — it's a fixed anchor, always reachable
  regardless of what's typed in the filter field.
- **Hero row anatomy (two lines, same size/weight, color-only distinction — see
  Typography):**
  ```html
  <button class="w-full min-h-12 px-md py-sm flex flex-col items-start gap-xs text-left
                  transition-transform duration-75 active:brightness-95">
    <div class="w-full flex items-baseline justify-between gap-sm">
      <span class="min-w-0 truncate text-body font-normal text-primary-text">
        {{ spanishAlias }}
      </span>
      <span class="shrink-0 flex items-center gap-xs text-body font-normal">
        <template v-if="isThisSlotsCurrentPick"><span class="text-accent">✓</span></template>
        <template v-if="takenByOthers.length">
          <span class="text-secondary-text">ya: {{ joinedNames(takenByOthers) }}</span>
        </template>
      </span>
    </div>
    <span class="min-w-0 truncate text-body font-normal text-secondary-text">
      {{ catalogueName }} · {{ alterEgo }}
    </span>
  </button>
  ```
  - Line 1 (dominant, Primary text): the Spanish alias — falls back to the catalogue
    English name if no alias exists (D-05).
  - Line 2 (secondary, Secondary text): `{catalogue English name} · {alter ego}`,
    exactly as the approved mockup shows.
  - **`ya: {nombre}` marker:** shows the name(s) of every **other** player slot currently
    holding this same hero — never this slot's own selection. Secondary-text color,
    never warning (see Color's critical rule above). Row stays **fully tappable** —
    no `disabled`, no opacity reduction; D-16 is explicit that a taken hero "sigue siendo
    elegible."
  - **`✓` current-pick marker:** shown when this row's hero is **this slot's own**
    current selection. Can co-occur with `ya:` in the same row, because D-16 explicitly
    permits the same hero in two slots — e.g. editing Bruno's modal while Bruno already
    has Thor and Ana also has Thor shows both `✓` and `ya: Ana` on Thor's row.
- **Empty-filter state:** when the typed query matches zero heroes, the hero-row list is
  replaced by a single centered line — `text-body font-normal text-secondary-text` — see
  Copywriting Contract for exact copy. `Sin elegir` remains visible above it regardless.
- **Name-join formula (reused for both the `ya:` marker and the grid's ⚠ line):** 1 name
  → `{A}`; 2 names → `{A} y {B}`; 3+ names → `{A}, {B} y {C}` (Oxford-less Spanish list
  join, comma-separated except the final "y").
- **Focus on open:** the `✕` button — **not** the Nombre field, **not** the filter field
  (D-09 extends to both text inputs: neither steals focus on open, so the on-screen
  keyboard never appears uninvited).
- **Focus on close (any of the 3 paths):** returns to the `Jugador {n}` grid row that
  opened it.
- **On-screen keyboard behavior:** the panel's `max-h-[80vh]` cap leaves headroom so
  that even with a tablet's virtual keyboard open, the panel's own internal scroll
  (`flex-1 overflow-y-auto` on the hero-row zone) can bring a focused field into view via
  the browser's native "scroll input into view on focus" behavior. No custom
  `visualViewport` handling is built for this phase — consistent with the project's
  "don't build machinery you don't have evidence you need yet" posture, and this exact
  behavior is called out in the Roadmap as unverified on a real tablet (viewport-simulated
  only) until the device question is resolved.

**Why a translucent scrim (`bg-background/80`), not `ConfirmDialog`'s opaque backdrop,
for both new modals:** these modals open over a **live, meaningful step screen** — the
grid behind them still shows the other rows' current selections. `ConfirmDialog`'s
opaque backdrop is reserved for pre-session states with nothing behind them to sense
(resume prompt, discard confirm). This is the exact same reasoning `02-UI-SPEC.md`
already used for `WarningDetailModal`, extended here to a second modal shape rather than
re-litigated.

**No focus-trap.** Neither `WarningDetailModal` nor `IndexOverlay` implements one; this
phase doesn't add one either — initial-focus + focus-return-on-close is the established
and sufficient contract in this codebase.

---

## Component Inventory

Only components with a contract change or a new component this phase.

| Component | Change | Props / States |
|-----------|--------|-----------------|
| `StepScreen` | **Extended.** Gains a selection-grid rendering mode. | NEW: `selectionRows: { key: string, label: string, valueLabel: string, hasValue: boolean }[] \| null` (null = step is not a selection step); `duplicateWarningText: string \| null` (pre-computed by the caller, plain warning line, never clickable — D-16). NEW emit: `select-row: [key: string]`. Existing `options[]`/`warningText` props and states unchanged. |
| `VillainPickerModal` | **NEW component.** | `villains: { id: string, name: string }[]`, `selectedId: string \| null`, `onSelect: (id: string \| null) => void`, `onDismiss: () => void`. Sorted alphabetically by `name` at the call site (component stays dumb — receives an already-sorted list, per the "no component imports `~~/engine`" rule). |
| `PlayerModal` | **NEW component.** | `slotNumber: number`, `name: string`, `onNameInput: (value: string) => void`, `heroes: { id: string, spanishName: string, catalogueName: string, alterEgo: string }[]` (already sorted by `spanishName`), `selectedHeroId: string \| null`, `takenBy: Record<string, string>` (heroId → an ALREADY-JOINED label string, composed at the call site by `buildTakenByMap` in `useHeroSearch.ts`), `nameMaxLength: number` (bound from `PLAYER_NAME_MAX_LENGTH` in `engine/selection.ts`), `onSelectHero: (id: string \| null) => void`, `onDismiss: () => void`. Internal-only state: filter query text (component-local, never persisted — resets each time the modal opens). |

**Not built as a shared/generic component.** `VillainPickerModal` and `PlayerModal` are
two separate files, per `06-CONTEXT.md`'s own discretion note ("si compartir componente
exige condicionales por todas partes, dos componentes es legítimo") — sharing one
component would need conditional prop plumbing for the filter field, the Nombre field,
and the sort/alias logic, for a payoff limited to shared Tailwind class strings that are
already achievable without inheritance (same reasoning `02-UI-SPEC.md` used to justify a
new `WarningDetailModal` instead of retrofitting `ConfirmDialog`).

**`WarningDetailModal.vue` is NOT retrofitted or extended for this phase** (per
`06-CONTEXT.md`'s explicit "no discrecional" note) — it stays a single-button
informational modal; these are choice modals, a different semantic, same as Phase 2's
own reasoning for not reusing `ConfirmDialog` for `WarningDetailModal`.

**Accessible names:**
- `VillainPickerModal` close: `aria-label="Cerrar selector de villano"`.
- `PlayerModal` close: `aria-label="Cerrar jugador {slotNumber}"`.
- Grid rows: `aria-label="Elegir villano"` / `aria-label="Elegir héroe y nombre de
  {rowLabel}"` (see Layout §1).
- The `Nombre` and `Héroe` text inputs use a real `<label for>` element (the visible
  "Nombre"/"Héroe" text), not a placeholder-only or visually-hidden label — placeholders
  are not a reliable accessible name across browsers/screen readers.

---

## Interaction & State Coverage

### Grid — no disabled state, no gate (D-03/SEL-09)

Every row is always tappable, always visible, with `—` in every empty slot. `SIGUIENTE`
is **never** disabled, gated, or accompanied by a confirmation because of this step's
selection state — reusing `01-UI-SPEC.md`'s existing "no disabled Siguiente" stance
unchanged, now explicitly confirmed to extend to this step too.

### Grid row tap → opens the matching modal

- Villano row → `VillainPickerModal`.
- Any Jugador row → `PlayerModal` for that slot.
- Same immediate pressed-state feedback (4% darken + 2% scale, `active:brightness-95`)
  as every other tappable element — no new interaction primitive.

### Modal dismiss — three equivalent paths, same as `WarningDetailModal`

1. Tap `✕`.
2. Tap the scrim (`click.self`).
3. `Esc` key.

All three: unmounts, focus returns to the triggering grid row, **nothing is discarded**
(D-13 — everything already saved on the tap that produced it, not on close).

### Row tap inside a modal → saves and closes (D-13)

Tapping `Sin elegir` or any villain/hero row: (1) commits that value to
`SessionContext.selection` immediately, (2) closes the modal, (3) returns focus to the
triggering grid row. **No confirm step, no "Listo" button, no dirty state.** Tapping the
row that is *already* the current selection is idempotent — same three effects, no
special-cased no-op needed.

### Keyboard shortcuts — off while either modal is open (D-12)

`useStepShortcuts`'s `shortcutsEnabled` pure function already turns Espacio/Enter/←
off whenever `hasActiveDetail` is true. **Contract this phase must satisfy, not
implementation:** opening `VillainPickerModal` or `PlayerModal` must produce the same
effect — either by reusing the existing `hasActiveDetail`-style flag (adding both new
modals to whatever makes it `true`) or by adding a new flag that's OR'd into
`shortcutsEnabled`'s existing guard. **Not discretionary:** the guard's logic must
continue to live entirely inside the pure, tested function (D-Q2) — never reimplemented
inline at the call site. This matters most for `PlayerModal`: typing "Bruno" into the
Nombre field must never trigger a step advance on the space between "Br" and the rest,
exactly the trap D-12 names explicitly.

### Repeated-hero `⚠` line — never clickable (D-16/D-32)

Plain `<p>`, warning color, no border, no chevron, `cursor: default`. Does not open
`WarningDetailModal` or anything else. This is a hard rule carried over from Phase 2's
D-32, applied here verbatim, not reinterpreted.

### Filter — substring, case/accent-insensitive, OR across three fields (D-08)

Matching normalizes both the query and each candidate field (lowercase, strip
diacritics) before a substring test; a hero matches if **any** of its Spanish alias,
catalogue English name, or alter ego contains the normalized query. No prefix-only
restriction, no library — `06-CONTEXT.md`/`FEATURES.md §c` both confirm this is a
straightforward two/three-field OR at N=23, no special tooling needed.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Grid section label | `ELECCIÓN` |
| Grid row — villain label | `Villano` (fixed, never changes) |
| Grid row — player label (default) | `Jugador {n}` (`n` = 1..4, per mini-setup player count) |
| Grid row — empty value | `—` |
| Villain modal title | `VILLANO` |
| Player modal title | `JUGADOR {n}` — the fixed slot number, never the typed name |
| `Sin elegir` entry | `Sin elegir` |
| Filter placeholder | `Buscar héroe…` |
| Nombre field label | `Nombre` |
| Héroe field label | `Héroe` |
| Nombre field default value | `Jugador {n}` |
| Taken-by marker | `ya: {nombre(s)}` — join formula: 1 → `ya: {A}`; 2 → `ya: {A} y {B}`; 3+ → `ya: {A}, {B} y {C}` |
| Repeated-hero grid line (⚠, computed) | 1 duplicate pair → `⚠ {A} y {B} llevan el mismo héroe`. 1 duplicate trio → `⚠ {A}, {B} y {C} llevan el mismo héroe`. All 4 share one hero → `⚠ Los 4 jugadores llevan el mismo héroe`. Two separate pairs (only possible at 4 players) → `⚠ Héroes repetidos: {A} y {B} · {C} y {D}` |
| Empty-filter message | `Ningún héroe coincide con «{query}»` |
| Primary CTA (unchanged, no new CTA this phase) | `SIGUIENTE` — this step introduces no gate, no new required action, and no modal in this phase has its own "Listo"/save button (D-13) |
| Empty state (step-level) | Not applicable beyond the grid's own `—` placeholders — the step is always shown, selection is always optional (D-03/D-09) |
| Error state | Not applicable — no network call, no async operation, no validation gate exists anywhere in this phase (catalogue and alias map both ship in the bundle, D-19/CAT-06) |
| Destructive confirmation | **None.** Emptying a slot via `Sin elegir` is trivially reversible (D-17) and explicitly rejected a confirmation gesture; there is no other destructive action in this phase |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none | not applicable — no component registry in use |
| third-party | none | not applicable |

No shadcn/registry tooling was initialized in Phase 1 and this phase does not reopen
that decision. The registry vetting gate does not apply.

---

## Decisions Made Without User Input

Per this session's autonomous (`yolo`) mode, no interactive questions were asked. Every
choice below fills a gap `06-CONTEXT.md` explicitly left open (see `<specifics>` and
`<decisions>` §Claude's Discretion) or a gap the `<specific_gaps_to_close>` brief named
directly — listed here for review. None reopens or contradicts D-01..D-20.

1. **Grid row reuses `options[]`'s exact `border-b border-accent/50` + `›` chevron
   treatment**, single-column instead of 2-column (D-04 forces this), with one added
   "current value" span `options[]` doesn't have. Not a new visual language — the
   smallest extension of an existing one.
2. **No visual distinction between the villano row and jugador rows** beyond label text
   — the approved mockup renders them identically and nothing in CONTEXT.md asks for a
   villain-specific accent.
3. **Player-name cap = 14 characters**, `maxlength` only, no truncation/ellipsis logic
   anywhere — chosen as the midpoint of D-15's "12–16" range, sized against the grid
   row's typical column width.
4. **Two separate new components (`VillainPickerModal`, `PlayerModal`), not one shared
   component with conditional props** — explicitly legitimized by `06-CONTEXT.md`'s own
   discretion note; mirrors Phase 2's identical reasoning for not retrofitting
   `ConfirmDialog`.
5. **Both new modals use a translucent `bg-background/80` scrim**, matching
   `WarningDetailModal`'s precedent (live, meaningful content behind them), not
   `ConfirmDialog`'s opaque backdrop (reserved for no-content pre-session states).
6. **A `✓` marks the slot's own currently-chosen entry when reopening its modal** — not
   explicitly requested by any D-01..D-20, but a necessary usability fill: without it,
   reopening a modal to change a choice would give zero feedback about what's currently
   selected. Reuses the existing accent "done/selected" glyph reservation, no new color.
7. **The `ya: {nombre}` marker uses Secondary-text color, explicitly never Warning
   color** — protects the app-wide invariant that Warning color always means "this step
   has a trap," which the marker (an informative, non-blocking notice) would otherwise
   silently violate if reached for by habit.
8. **A `✓` and a `ya: {nombre}` marker can co-occur on the same hero row** (this slot's
   own pick, also held by another slot) — a direct, necessary consequence of D-16
   explicitly allowing duplicate heroes across slots; not designing for this case would
   leave an unspecified visual collision.
9. **One shared name-join formula** (`A` / `A y B` / `A, B y C`) reused for both the
   `ya:` marker and the grid's `⚠` line, rather than two separate ad hoc phrasings —
   keeps the two related surfaces consistent and testable as one small pure function.
10. **Modal titles use the fixed slot identity (`VILLANO`, `JUGADOR {n}`), never the
    live selection state** — `JUGADOR 1` stays `JUGADOR 1` even after "Ana" is typed,
    matching the approved mockup literally and avoiding a title that visibly changes
    while the user is mid-edit.
11. **No focus-trap in either new modal** — neither existing modal in the codebase
    (`WarningDetailModal`, `ConfirmDialog`) implements one; adding one here would be a
    new pattern, not a consistent extension of the existing one.
12. **Modal panel gets a `max-h-[80vh]` cap (new, `WarningDetailModal` has none)** —
    necessary because these modals scroll a list up to 23 rows long; sized to leave
    headroom for an on-screen keyboard without introducing `visualViewport` JS machinery
    this phase has no evidence it needs yet (flagged for the pending real-device
    verification the Roadmap already calls out as open).
13. **Filter and Nombre inputs share one visual treatment** (`bg-background` fill,
    `focus:border-accent` ring, no native outline) — the app's first text inputs; chosen
    to read as "inset field on a surface panel" using only already-declared tokens, no
    new color introduced.
14. **Grid rows get an explicit `aria-label`** distinct from their visible text (`Elegir
    villano` / `Elegir héroe y nombre de {rowLabel}`) — low-cost accessibility
    improvement; visible-text-as-accessible-name alone would read the `—`/chevron
    awkwardly to a screen reader.

---

## Forward-Compatibility Notes

- **Phase 7 (counter band precharge):** the 14-character name cap this phase sets is
  designed to also fit Phase 7's future counter-band row labels without renegotiating the
  number — Phase 7 should reuse it, not pick a new one.
- **Phase 7 (change hero mid-round):** re-opening `PlayerModal` mid-game (via the
  existing jump-index mechanism, D-18) and picking a different hero is already fully
  specified by this document (D-13's instant-save covers it) — what Phase 7 must still
  decide is what happens to an *already-adjusted* HP counter when that happens (flagged
  as deferred in `06-CONTEXT.md`, not this phase's problem).
- **Phase 8 (parenthetical known values):** this phase's grid and modals never render a
  numeric value (health, hand size) — that's Phase 8's entire scope. Nothing here should
  be read as reserving layout space for it; Phase 8 plans its own placement.
- **v2 (remembering names across sessions):** deliberately not built (D-14) — if it ever
  is, the Nombre field's visual contract here (default value, 14-char cap, instant save)
  should carry over unchanged; only the persistence lifetime would change.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Amendments after approval (2026-09-08, same day, from `06-REVIEW.md`):**
- **IN-01** — `PlayerModal`'s `takenBy` was specified as `Record<string, string[]>`
  (array of labels, joined in the template). The implementation pre-joins into
  `Record<string, string>` so the component composes nothing, which is strictly
  dumber and therefore more in keeping with this document's own component
  philosophy. The Component Inventory row above has been corrected to match the
  code. This is a spec correction, not a code deviation to fix — Phase 7 should
  read the corrected shape.
- **WR-01** — `nameMaxLength` added to the same row: the 14-character cap is now
  passed by prop from `PLAYER_NAME_MAX_LENGTH`, instead of being written twice
  (once in the engine constant, once as a bare `maxlength="14"` literal).

**Approval:** APPROVED 2026-09-08 by `gsd-ui-checker` — 6/6 dimensions PASS, plus all
project-specific hard rules (D-03, D-04, D-09, D-06, D-13, D-15, D-16/D-32, touch
targets, legal, phase scope) verified compliant. Two non-blocking recommendations were
raised and both have been applied: the `border-b-2` text-input treatment is now recorded
as a canonical convention under Spacing Scale, and a drafting artifact in Layout §2 was
copy-edited.
