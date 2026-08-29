---
phase: 2
slug: bucle-de-ronda-y-reglas-verificadas
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-29
---

# Phase 2 — UI Design Contract

> Visual and interaction contract for the three UI surfaces Phase 2 actually touches: the clickable `⚠` + its detail modal (new surface), the header inside the round loop (data-driven text change to an existing component), and the index overlay inside the round loop (reordering + dimming + `●`-only marking of an existing component). **This is a delta document.** `01-UI-SPEC.md` is the design system of record — every token, screen, and pattern it defines (colors, spacing scale, type scale, three-band step layout, disabled-state policy, tap-feedback, orientation guard, etc.) carries forward unchanged unless explicitly called out below. Nothing in this phase contradicts it.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — no shadcn / no component library (unchanged from Phase 1) |
| Preset | not applicable |
| Component library | none — hand-rolled Tailwind v4 components (unchanged) |
| Icon library | none — hand-rolled inline SVG / Unicode glyphs (unchanged) |
| Font | Inter (self-hosted woff2), fallback `system-ui, -apple-system, sans-serif` (unchanged) |

**No new icon this phase.** The clickable-`⚠` affordance reuses the `›` chevron already in the app's fixed glyph set (`≡ ✕ ✓ ● ‹ › ⚠`) — see Interaction & State Coverage. The 5-glyph budget from `01-UI-SPEC.md` stays a closed set; this phase composes existing glyphs rather than adding a 6th.

---

## Spacing Scale

Inherited verbatim from `01-UI-SPEC.md` — no new tokens.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gaps, tight inline padding |
| sm | 8px | Compact spacing (warning icon to warning text, modal-button gaps) |
| md | 16px | Default element spacing, index row internal padding |
| lg | 24px | Section padding, gap between action sentence and warning line, modal internal gaps |
| xl | 32px | Layout gaps, modal backdrop side padding |
| 2xl | 48px | Major section breaks, modal panel padding |
| 3xl | 64px | Page-level spacing, outer padding of full-screen overlays |

**Exceptions (all reused from Phase 1, none new):**
- **Tap targets: 44×44pt minimum, 48×48dp preferred.** Applies to the new clickable `⚠` trigger and the modal's single dismiss button, exactly as it already applies to every other tappable element in the app.
- **Nav band height: 96px.** Unchanged; the round loop uses the same `NavBand` component as setup.

**New application, not a new token:** the clickable `⚠` line's hit area is a `<button>` with `min-h-12` (48px) and `px-md py-sm` padding beyond the visible text — the same tap-floor treatment already used for `IndexOverlay` rows and the header's `≡`/`✕` icon buttons.

---

## Typography

Inherited verbatim — still exactly 4 sizes, exactly 2 weights. No new size or weight introduced for the modal or the composed header string.

| Role | Size | Weight | Line Height | Used for (this phase's additions) |
|------|------|--------|-------------|----------|
| Display | 2.5rem / 40px | 700 | 1.2 | unchanged — round-loop step action sentences use the same token as setup |
| Heading | 1.75rem / 28px | 700 | 1.25 | **NEW use:** the `⚠` detail modal's heading (repeats the warning text, see Component Inventory) |
| Body | 1.25rem / 20px | 400 | 1.5 | unchanged for the warning line itself; **NEW use:** the modal's body paragraph (`warningDetail` text) |
| Label | 1.125rem / 18px | 700 | 1.2 | unchanged — header text (both zones), including the longer composed `RONDA 4 · Villano · 3 de 6` string; index block-group headers, including the new "PREPARACIÓN (CONSULTA)" divider label |

### Character budgets (content authoring contract)

| Field | Budget | Status |
|-------|--------|--------|
| `text` (action sentence) | ≤90 chars | Unchanged from Phase 1 |
| `warning` | ≤60 chars | Unchanged from Phase 1 — D-31's "recordar mirar, no explicar" principle is exactly what keeps 60 chars sufficient even for round content |
| **`warningDetail` (NEW)** | **≤320 chars, hard cap** | **New this phase — the open question `02-RESEARCH.md` flagged as unresolved by `01-UI-SPEC.md` is closed here** |

**Reasoning for the 320-character `warningDetail` cap:**
- The longest authored consequence this phase's content will need is the villain-defeat procedure (D-30: remove stage, reveal next, adjust dial, what's kept vs. not) — drafted at ~250 characters in `02-RESEARCH.md`'s sketch. 320 gives roughly 25% headroom above that worst case without inviting a second rulebook paragraph.
- D-32's own rationale is "se cierra fácilmente para seguir jugando" — a quick consult, not a reading session. 320 characters is ~50–60 words — at a skim pace of ~150 words/minute (slower than sustained reading, appropriate for a modal glanced at mid-game), that's roughly 20–24 seconds to read in full, and most authored details will be shorter (a sentence or two, ~4–8 seconds). This stays well inside "cierra fácilmente."
- No manual line breaks in the field — the modal body wraps naturally inside its fixed-width column (see Layout); do not author `\n` into the string, since it renders via `{{ }}` interpolation and would collapse under normal CSS whitespace handling instead of producing a visible line break.
- Enforce with the same mechanism as `text`/`warning`: a Zod `.max(320)` on the new field plus (recommended, per `02-RESEARCH.md`'s Pattern 3) a content-test assertion — this is a schema/CI decision for the plan to implement, stated here as the number the plan must use, not implemented by this document.
- **Content rule the schema/CI gate must also enforce:** a step must not declare `warningDetail` without also declaring `warning` on the same text block (an orphaned detail with no visible `⚠` trigger is unreachable UI). This is a UI/content contract stated here; the actual `superRefine`/test implementation is an engine-side task for the plan.

---

## Color

Inherited verbatim — no new hex value, no new role. Every new visual state in this phase is built from the existing 5 roles.

| Role | Value | Usage (unchanged reservations, extended below) |
|------|-------|--------|
| Dominant (60%) — background | `#14161C` | App background; **NEW use:** the modal's translucent scrim, see below |
| Secondary (30%) — surface | `#1E212B` | Header, nav band, index overlay panel; **NEW use:** the `⚠` detail modal panel |
| Primary text | `#F2F3F5` | Hero sentence, headings; **NEW use:** the modal's body paragraph (see rationale below) |
| Secondary text | `#9AA0AC` | **NEW use:** the entire dimmed setup-blocks zone inside the loop's index overlay (text, group headers, and their `✓` marks — see Interaction & State Coverage) |
| Accent (10%) | `#2F81F7` | **Reservation extended, not broken:** same list as Phase 1 (Siguiente fill, index `●`/`✓`, selected segmented option) — the round loop's `●` current-step mark is the *same* role, not a new one; the modal's "Entendido" button fill also uses this reservation, same as every other primary/single CTA in the app |
| Warning | `#FFB020` | **Reservation extended, not broken:** the `⚠` icon + warning text (unchanged) **plus** its trailing `›` chevron and bottom-border affordance when clickable, **plus** the modal's heading (which repeats the same warning text) — all of it is still "this step/detail has a trap," never used elsewhere |
| Destructive | `#FF5C5C` | Unchanged — no destructive action in this phase's new surfaces |

**New surface, no new hex — the modal's translucent scrim:** `bg-background/80` (the existing Dominant token at 80% alpha), not a new color. See Layout for why this deliberately differs from `ConfirmDialog`'s fully opaque backdrop.

**Why the modal's body uses Primary text, not Secondary text (a deliberate divergence from `ConfirmDialog`):** `ConfirmDialog`'s body is supporting/secondary context under a heading that carries the actual decision ("¿Empezar una partida nueva?"). This modal is the inverse: the heading merely repeats what the user already read on the step screen (the `⚠` line), and the body is the *entire reason the user tapped* — the sought-after payload, not supporting color commentary. It gets the same weight as primary content elsewhere in the app.

**Why "dimmed" is a color-token swap, not opacity (a deliberate, contrast-preserving decision):** reducing opacity on `#F2F3F5` primary text would drag its 16.3:1 contrast ratio down proportionally, risking a WCAG failure on a list of rows that remain fully tappable (the user can still jump into setup from here — FLOW-08). Swapping to the existing Secondary-text role instead keeps a verified 6.9:1 ratio (already AA, near-AAA) with zero new computation needed — `01-UI-SPEC.md`'s Secondary-text reservation already lists "unvisited index rows" as a use case; this phase extends that same semantic ("de-emphasized, still legible") to a whole trailing zone instead of individual rows.

**Verified contrast (no new pairs beyond what `01-UI-SPEC.md` already verified — reused, not recomputed):**

| Pair | Ratio | Passes | Reused from |
|------|-------|--------|-------------|
| Primary text `#F2F3F5` on Surface `#1E212B` (modal panel body) | 14.5:1 | AAA | `01-UI-SPEC.md` §Color |
| Warning `#FFB020` on Background `#14161C` (clickable `⚠` + chevron) | 9.9:1 | AAA | `01-UI-SPEC.md` §Color |
| Secondary text `#9AA0AC` on Background `#14161C` (dimmed setup rows) | 6.9:1 | AA, near-AAA | `01-UI-SPEC.md` §Color |
| Dark navy `#0B1220` on Accent `#2F81F7` (modal "Entendido" fill) | 5.00:1 | AA | `01-UI-SPEC.md` §Color |

No new contrast computation was needed this phase — every new visual state maps onto a pair `01-UI-SPEC.md` already verified.

---

## Layout

### 1. The clickable `⚠` and its modal (new surface)

**Trigger — step screen extension:**

```
┌──────────────────────────────────────────────────────┐
│ RONDA 4 · Villano · 3 de 6          3 jug · Normal  ≡│
├──────────────────────────────────────────────────────┤
│                                                        │
│         Repartid una carta de encuentro               │
│              a cada jugador                           │
│                                                        │
│         ⚠  Atentos al dial del villano  ›             │  ← CLICKABLE: warning-color
│         ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔               bottom border + trailing ›
│                                                        │
├──────────────────────────────────────────────────────┤
│   ‹ Atrás              │        SIGUIENTE  ›          │
└──────────────────────────────────────────────────────┘
```

vs. the non-clickable case (unchanged from Phase 1 — no border, no chevron, plain `<p>`):

```
         ⚠  Uno por jugador, en orden de jugador — sin saltarse a nadie
```

- **Affordance rule:** a warning line renders as a `<button>` with a warning-colored bottom border (`border-b border-warning/50`) and a trailing ` ›` chevron **only when** `warningDetail` is present on the resolved text block. Absent that field, it renders exactly as today — a plain `<p>`, no border, no chevron, no `cursor-pointer`. This is the literal implementation of D-32's "sin afordancia falsa."
- **Hit area:** the whole line (icon + text + chevron) is one button, `min-h-12` (48px), `px-md py-sm`, horizontally centered like the rest of the content band — clears the 44/48pt floor even though the visible text is shorter than that height.
- **Position/spacing unchanged:** still 24px (`lg`) below the action sentence, still part of the same vertically-centered content block (`StepScreen`'s existing layout — see `01-UI-SPEC.md` §Layout).

**Modal:**

```
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                    ░  (dimmed step content visible    ░
                    ░   through an 80%-opacity scrim)  ░
                    ░                                  ░
                    ░ ┌──────────────────────────────┐ ░
                    ░ │  ⚠ Atentos al dial del        │ ░  ← Heading 28/700,
                    ░ │    villano                     │ ░     repeats the trigger
                    ░ │                                │ ░     text verbatim
                    ░ │  Retirad la etapa actual del   │ ░  ← Body 20/400,
                    ░ │  villano y revelad la          │ ░     PRIMARY text color
                    ░ │  siguiente; ajustad el dial a  │ ░     (not secondary —
                    ░ │  su vida impresa. Si el título │ ░     see Color rationale)
                    ░ │  de la nueva etapa es el       │ ░
                    ░ │  mismo, conservad mejoras y    │ ░
                    ░ │  estados (no fichas de daño);  │ ░
                    ░ │  si es distinto, no se         │ ░
                    ░ │  conservan.                    │ ░
                    ░ │                                │ ░
                    ░ │                  ( Entendido ) │ ░  ← accent fill,
                    ░ └──────────────────────────────┘ ░     single CTA, NO
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     trailing chevron
```

- **Chrome (reused from `ConfirmDialog.vue`):** `role="dialog" aria-modal="true"`, `fixed inset-0 z-50`, panel `max-w-[640px]`, `bg-surface`, `p-2xl` (48px), `flex flex-col gap-lg` (24px between heading/body/button).
- **Deliberate divergence — scrim, not opaque backdrop:** `bg-background/80` instead of `ConfirmDialog`'s solid `bg-background`. `ConfirmDialog` always appears before any game content is visible (resume prompt, discard confirm) — there is nothing to glimpse behind it. This modal opens **over a live step screen mid-game**; a translucent scrim lets the player still sense the step behind it, reinforcing "you're pausing to check something, not leaving the step" (D-32: "sigues jugando").
- **Heading = the trigger's own warning text, not a new authored field.** No separate "modal title" is authored in content — `warningDetail` is the only new schema field. Keeps the schema minimal and keeps trigger/modal visually and semantically the same statement, just expanded.
- **Single dismiss button, no confirm/cancel pair:** unlike `ConfirmDialog` (built for a binary choice), this is purely informational — one button, copy "Entendido" (no trailing chevron — see Copywriting Contract for why).

### 2. Header inside the loop (D-22/D-23)

No new component, no new prop — a **CSS fix plus a data-format contract** on the existing `AppHeader.vue`.

```
┌─────────────────────────────────────────────┐
│ RONDA 4 · Villano · 3 de 6     3 jug · Normal ≡│  ← typical width: fits comfortably
└─────────────────────────────────────────────┘

┌───────────────────────────┐
│ RONDA 12 · Jugad…  3 jug…  ≡│  ← only under an extreme narrow-viewport
└───────────────────────────┘     edge case (see below)
```

- **Data contract:** `sectionLabel` (left zone) becomes `RONDA {round} · {phaseTitle}` while inside the loop (unchanged: plain `sectionTitle.toUpperCase()` during setup — D-23's accepted asymmetry). `AppHeader.vue`'s existing template already appends `· {current} de {total}` from the separate `position` prop, so **no template change is needed** in `AppHeader.vue` itself — the composed string `RONDA 4 · Villano · 3 de 6` is fully assembled by string interpolation already present in the component; only the composable feeding `sectionLabel`/`position` needs to branch by `sectionRepeats` (an engine/composable concern, out of this document's scope, already sketched in `02-RESEARCH.md` Pattern 1).
- **Layout bug to fix (found during this research, not present in `01-UI-SPEC.md`):** the left zone (`text-label font-bold text-primary-text truncate`) has no `min-w-0`/`flex-1`, and the right zone has no explicit `shrink-0`. In a `flex justify-between` row, a flex item without `min-w-0` cannot shrink below its own content width, so `truncate`'s `overflow-hidden`/`text-overflow: ellipsis` silently does nothing under width pressure — the longer composed loop string could instead squeeze or push the right-hand `3 jug · Normal ≡` zone, which the header's own D-11 contract forbids ("nunca cambia la estructura de la cabecera"). **Fix required:** add `min-w-0 flex-1` to the left zone's wrapping `div`, add `shrink-0` to the right zone's wrapping `div`. This is a two-class CSS fix, not a redesign — flagged explicitly so the plan doesn't miss it.
- **Truncation behavior once fixed:** left zone truncates with an ellipsis on overflow, single line, never wraps (64px fixed header height, unchanged). Right zone (`3 jug · Normal` + `≡`) never shrinks or truncates under any composed-label length — it is a fixed-content zone, protected by `shrink-0`.
- **Content-authoring rule (Pitfall 5, closed here):** round-phase titles must be authored in **Title Case** (`"Jugadores"`, `"Villano"`), not the all-caps convention used for setup phase titles (`"HÉROES"`, `"ARCHIENEMIGOS"`) — the composed-label formula does not uppercase `phaseTitle` in the repeating-section branch, by design, to match the approved `RONDA 4 · Villano` mockup exactly. An all-caps-authored round phase title would render as `RONDA 4 · VILLANO`, visually inconsistent with the locked mockup.

### 3. Index overlay inside the loop (D-24/D-25)

```
┌───────────────────────────────────────┐
│  RONDA                              ✕ │  ← plain section name, NOT the
├───────────────────────────────────────┤     composed header string
│  JUGADORES                             │
│   1   Jugad vuestros turnos            │  ← no mark (not '✓', not current)
│   2   Descartad                        │
│   3 ● Robad hasta el tamaño de mano    │  ← ONLY the current step marked
│   4   Enderezad                        │
│                                         │
│  VILLANO                               │
│   5   Colocad amenaza                  │
│   6   Los enemigos activan             │
│   7   Repartid cartas de encuentro     │
│   8   Revelad cartas de encuentro      │
│   9   Pasad la ficha de jugador inicial│
│  10   Fin de la fase del villano       │
│ ───────── PREPARACIÓN (CONSULTA) ───────│  ← divider, Label 18/700,
│  11 ✓ Decidid héroes                   │     secondary-text, uppercase,
│  12 ✓ Identidad en Alter-Ego           │     centered — all rows below
│   …                                     │     it in secondary-text
└───────────────────────────────────────┘
```

- **Title source, not the composed header label:** `IndexOverlay`'s `title` prop must be sourced as the plain `sectionTitle.toUpperCase()` (`"RONDA"`), the exact same source setup already uses (`"PREPARACIÓN"`) — **never** the header's composed `sectionLabel` (`"RONDA 4 · Villano"`). These are two distinct strings from the same underlying data; wiring the overlay to the header's prop unchanged would show the whole composed string as a title-bar heading, which is visually wrong (the title bar is a section name, not a position readout — `01-UI-SPEC.md`'s setup mockup title bar is `"PREPARACIÓN"`, never `"PREPARACIÓN · 8 de 21"`).
- **Reordering (D-24), only while inside the loop:** all blocks belonging to the repeating section (`JUGADORES`, `VILLANO`, in their natural sequence order) render first; all non-repeating blocks (the six setup blocks) render after, as a single visually-separated trailing zone. While the cursor is still inside setup (unchanged Phase 1 state), the overlay's block order is untouched — natural document order, no divider, no dimming. The reordering condition is "is the current node inside a repeating section," never a hardcoded section id (TECH-04).
- **Divider between the two zones:** a single hairline (`border-t border-background`, the same hairline treatment already used under the overlay's own title bar in `01-UI-SPEC.md`) plus a centered Label-size (18/700), uppercase, secondary-text caption: **"PREPARACIÓN (CONSULTA)"** — makes the transition legible at a glance rather than an unexplained style change partway down the list.
- **Dimming (D-24), color-token swap only:** every row, glyph, and block-group header in the trailing setup zone uses Secondary-text color (`#9AA0AC`) instead of the normal done/current/upcoming color logic — including rows that would otherwise be `✓` (primary-text + accent glyph) under the unmodified Phase 1 formula. This keeps the zone legible (still AA contrast, still tappable per FLOW-08) while visually receding behind the round content, consistent with the Color section's rationale above.
- **`●`-only inside the loop (D-25):** for rows belonging to the repeating section, the mark is `'current'` (`●`, accent color, exactly as today) for the cursor's own row and `null` (no mark, same styling as an unvisited upcoming row: secondary-text, no glyph) for every other row in that section — **regardless of whether that row's step already happened earlier in this same round pass.** There is no third "done-but-repeats" visual state; a `⚠`-recount line (D-21) is the app's stated mitigation for "did we already do this," not a checkmark, because a checkmark's meaning ("done, not coming back") is false in a loop.
- **Setup rows below the divider keep their normal `✓`/derived-from-cursor logic** (every setup row reads as `done`, since the cursor has moved past all of them into the loop) — just recolored to secondary-text per the dimming rule above. No contradiction with D-25: D-25 only forbids `✓` for *repeating-section* rows; the trailing setup zone is not the loop.
- **No new interaction:** tapping a dimmed setup row still closes the overlay and jumps there (FLOW-08, unchanged mechanism from `01-UI-SPEC.md` §Index overlay open/close) — "atenuada" is a visual treatment only, not a disabled or read-only state.

---

## Component Inventory

Only components with a contract change or a new component this phase. Everything else in `01-UI-SPEC.md`'s inventory (`GameSelectorScreen`, `MiniSetupScreen`, `ResumePrompt`, `ContentChangedNotice`, `MesaListaScreen`, `OrientationGuardOverlay`) is untouched.

| Component | Change | Props / States |
|-----------|--------|-----------------|
| `StepScreen` | **Extended.** Gains a third input and a new emit. | `actionText: string`, `warningText: string \| null`, `warningDetailText: string \| null` (NEW — `null` means "not clickable"); emits `open-warning-detail: []` (NEW). States: no-warning / plain-warning (unchanged) / **clickable-warning (NEW)** |
| `AppHeader` | **CSS fix only, no prop/contract change.** | Same props as Phase 1 (`sectionLabel`, `position`, `sessionContext`). Fix: `min-w-0 flex-1` on left zone, `shrink-0` on right zone (see Layout §2) |
| `IndexOverlay` | **Extended.** `blocks` entries gain a `dimmed` flag; caller must pass the plain section title, not the composed header label. | `title: string` (**contract clarified**, not changed in shape — must be plain, see Layout §3), `blocks: [{label, steps, dimmed: boolean}]` (dimmed is NEW), `onJumpTo`, `onClose` — unchanged otherwise |
| `WarningDetailModal` | **NEW component.** Single-dismiss informational modal, chrome borrowed from `ConfirmDialog` (see Layout §1). | `heading: string` (the warning text, reused verbatim), `body: string` (`warningDetail`), `onDismiss: () => void`. No `destructive` prop — always the same accent-filled single button |

**Accessible names / focus contract for the new component:**
- The `⚠` trigger button: no `aria-label` needed — its own visible text (`⚠ {warning} ›`) already is its accessible name, same as `NavBand`'s `‹ Atrás` / `SIGUIENTE ›` buttons.
- `WarningDetailModal`: `role="dialog" aria-modal="true" aria-labelledby="{heading-id}"` pointing at its own Heading element.
- **On open:** focus moves to the "Entendido" button (the modal's only interactive control — a safe default, nothing else to accidentally trigger).
- **On close (any path):** focus returns to the `⚠` trigger button that opened it. The page-level component must keep a reference to that trigger element across the open/close cycle (`WarningDetailModal` itself stays a dumb, stateless-of-session component, consistent with the project's presentational-component rule — the ref lives at the call site, not inside the modal).
- **Noted, not fixed:** `ConfirmDialog.vue` currently has no equivalent focus management. This phase does not retrofit it — out of scope — but the gap is recorded here so it isn't mistaken for an intentional pattern to copy.

---

## Interaction & State Coverage

### Clickable `⚠` — open

- Trigger: tap/click on the `⚠` line **only when `warningDetailText` is non-null**. Same immediate pressed-state feedback (4% darken + 2% scale-down) as every other tappable element in the app (`01-UI-SPEC.md` §Interaction — reused, not reinvented).
- No confirmation step — opens immediately, same "cheap to open, cheap to close" philosophy already applied to `IndexOverlay` jumps in Phase 1.

### `WarningDetailModal` — dismiss (three equivalent paths, all close identically)

1. Tap "Entendido."
2. Tap the scrim (anywhere outside the panel).
3. `Esc` key.

All three: modal unmounts, focus returns to the `⚠` trigger, underlying step screen is untouched (same cursor, same round, same everything — this is a read-only consultation, never a navigation).

**Why more permissive than existing dialogs (stated, not accidental):** `ConfirmDialog` is button-only (a destructive choice must be deliberate); `IndexOverlay` is `✕`-only (a full-bleed overlay has no "outside" to tap). This modal is neither — it floats over visible content with a real "outside," and D-32 explicitly asks for "se cierra fácilmente." Offering all three common dismiss patterns matches that explicit requirement rather than importing the stricter precedent from a differently-shaped surface.

### Header — no new interaction

Purely a text/data change; the `≡` tap-to-open-index behavior is identical inside and outside the loop.

### Index overlay inside the loop — no new interaction beyond existing jump/close

Reordering and dimming are rendering-only; `01-UI-SPEC.md`'s existing open/close/jump interaction rules (§Index overlay open/close) apply unchanged, including to dimmed rows.

### Disabled states

No new disabled state this phase. `01-UI-SPEC.md`'s existing stance holds: `Siguiente`/`Atrás` are never disabled inside the loop either (every loop step has a valid next/prev by construction — that's the whole point of a loop), and the new modal's single button is never disabled (nothing to wait on, no async state).

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Clickable warning trigger (on-screen) | `⚠ {warningText} ›` — same warning text as the non-clickable case, chevron appended only when clickable. Author writes only `warning` (≤60 chars); the `›` is chrome, not authored text |
| Modal heading | Repeats the trigger verbatim: `⚠ {warningText}` — no separately authored title field |
| Modal body | `{warningDetail}` — author's own original wording, ≤320 chars, imperative/plural register matching the rest of the app's voice (per D-31's "recordar mirar, no explicar" and the project's no-verbatim-reglamento legal constraint — paraphrase + citation-in-data only, never copied Rules Reference text) |
| Modal dismiss CTA | `Entendido` — **no trailing chevron**, unlike `ENTENDIDO ›` in Phase 1's `ContentChangedNotice`. Rationale: that chevron signals forward motion (acknowledging returns you to a *new* place — the start of a section); this dismissal returns you to *exactly where you were*, so a forward-motion glyph would misrepresent the action |
| Header (loop, composed) | `RONDA {round} · {Phase title}` — phase title in Title Case (see Layout §2's content-authoring rule); position suffix `{i} de {n}` supplied by the existing `AppHeader` template, unchanged |
| Header (setup, unchanged) | `PREPARACIÓN · {i} de {n}` — identical to Phase 1, no change |
| Index overlay title (loop) | `RONDA` — plain, uppercase, same convention as `PREPARACIÓN` |
| Index overlay divider label | `PREPARACIÓN (CONSULTA)` — uppercase, states plainly that this trailing zone is for reference, not for "what's next" |
| Round-phase step voice (content rule, carried from Phase 1's D-07/D-08/D-10) | Imperative, plural, ≤90 chars, formulas unresolved, never states the real player count in step text — unchanged, this phase's new content must follow the identical rule |

**Destructive actions in this phase:** none new. The only destructive action in the whole app remains Phase 1's "Empezar nueva partida" (unchanged).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none | not applicable — no component registry in use |
| third-party | none | not applicable |

No shadcn/registry tooling was initialized in Phase 1 and this phase does not reopen that decision (`02-RESEARCH.md`'s Standard Stack: "Introducing any new library... would contradict `01-UI-SPEC.md`'s explicit 'no component library' decision"). The registry vetting gate does not apply.

---

## Decisions Made Without User Input

Per this session's autonomous (`yolo`) mode, no interactive questions were asked. Every design choice below was decided from `01-UI-SPEC.md`, `02-CONTEXT.md`, `02-RESEARCH.md`, and the current component code — listed here explicitly for review/override.

1. **Clickable-warning affordance = reused `›` chevron + warning-colored bottom border.** No new icon, stays inside Phase 1's closed 5-glyph vocabulary (the chevron was already in use for `‹ Atrás`/`SIGUIENTE ›`). Alternative considered and rejected: a new "info" glyph — unnecessary dependency on a 6th icon for a fixed, tiny icon set philosophy Phase 1 already established.
2. **Touch target for the trigger = `min-h-12` button with `px-md py-sm`.** Directly reuses the 44/48pt floor already declared in `01-UI-SPEC.md`'s Spacing exceptions; no new sizing rule invented.
3. **New `WarningDetailModal` component, not an extended `ConfirmDialog`.** `02-RESEARCH.md`'s Assumption A4 flagged this as low-risk either way; chosen because the semantics differ (informational single-dismiss vs. binary confirm/cancel) and forcing one component to serve both would need conditional prop plumbing (`destructive`, `cancelLabel` becoming optional) for no real code reuse benefit beyond shared visual chrome, which is already achievable by reusing the same Tailwind token classes without inheritance.
4. **Scrim = `bg-background/80`, not `ConfirmDialog`'s opaque backdrop.** Justified in Color/Layout above: this modal opens over live, meaningful step content the player should still sense is there; `ConfirmDialog`'s existing opaque backdrop always appears over no-content states (pre-session prompts).
5. **Modal heading = the warning text itself, no new authored title field.** Keeps the schema addition to exactly one field (`warningDetail`) rather than two, and keeps trigger/modal content provably consistent (same string, can't drift).
6. **Modal body text color = Primary text, diverging from `ConfirmDialog`'s Secondary-text body.** Justified in Color above — this modal's body is the sought payload, not supporting color.
7. **Dismiss CTA = "Entendido" with no chevron**, diverging from `ContentChangedNotice`'s "ENTENDIDO ›". Justified in Copywriting above — no forward navigation occurs.
8. **Three dismiss paths (button / scrim tap / Esc)**, more permissive than any existing dialog in the app. Justified by D-32's explicit "se cierra fácilmente" requirement.
9. **New focus management (mount-focus + return-focus) added to `WarningDetailModal` only, not retrofitted to `ConfirmDialog`.** Treated as new-component hygiene, not a Phase-1 regression fix — flagged as an existing gap, out of scope to close here.
10. **`warningDetail` character budget = 320, hard-capped via a future `.max(320)`.** Reasoned from the longest known real content (villain-defeat procedure, ~250 chars) plus headroom, and a "quick consult" reading-time target. This is the number `02-RESEARCH.md`'s Open Question 2 explicitly deferred to this document.
11. **Content rule: `warningDetail` requires `warning` on the same block.** Stated as a UI/content contract; actual schema/test enforcement is left to the plan, per `02-RESEARCH.md`'s Pattern 3 recommendation.
12. **`AppHeader` needs a 2-class CSS fix (`min-w-0 flex-1` / `shrink-0`), not a redesign.** Found by inspecting the actual current template against the longer composed loop string — flagged as a concrete, small bug for the plan to fix, not a design change (D-11's three-zone structure is otherwise untouched).
13. **Round-phase titles must be authored in Title Case, not the existing setup convention's ALL-CAPS.** Required by the header's composed-label formula (which intentionally does not uppercase `phaseTitle` in the loop) matching the already-approved `RONDA 4 · Villano` mockup exactly.
14. **`IndexOverlay`'s `title` prop must be sourced separately from the header's composed `sectionLabel`** — always the plain, uppercased section name. Prevents the overlay's title bar from showing the fully composed string, a cosmetic bug `02-RESEARCH.md`'s Pattern 2/Assumption A3 flagged and this document resolves by specifying the correct source explicitly.
15. **Dimming implemented via Secondary-text color swap, never CSS opacity.** Chosen specifically to avoid degrading contrast on a zone that remains fully interactive (still jumpable per FLOW-08) — verified against `01-UI-SPEC.md`'s already-computed contrast table, no new computation needed.
16. **A hairline + centered "PREPARACIÓN (CONSULTA)" label separates the two overlay zones**, reusing the exact divider treatment already used under the overlay's own title bar, rather than inventing a new separator style.
17. **Reordering/dimming only activates when the current cursor is inside the repeating section** — while still in setup, the overlay is pixel-identical to Phase 1 (no divider, no dimming, natural order). Preserves D-23's "cada tramo muestra lo que allí es útil" symmetry and avoids any regression to the Phase-1-verified setup flow.
18. **No opacity/scale/motion changes beyond what Phase 1 already defined** (180ms fade+slide for `IndexOverlay`, 75ms press feedback) — the new modal reuses the identical press-feedback timing already declared for `ConfirmDialog`'s buttons; no new animation curve was invented for the modal's own open/close (a simple mount/unmount, no motion beyond what a dialog "just appearing" implies, consistent with the app's overall minimal-motion posture).

---

## Forward-Compatibility Notes

- **Phase 3 (VOZ-02 mute icon, header right zone):** unaffected by this phase's `shrink-0` fix — if anything, the fix makes the right zone's reserved slot behavior *more* robust for a future third child, since it now explicitly never shrinks under left-zone pressure.
- **v2 REF-01/REF-02 (full keyword-linking + search):** this phase's `WarningDetailModal` is deliberately *not* built as a generic "info panel" component reusable for arbitrary keyword lookups — it is scoped tightly to the single `⚠`-triggers-modal pattern D-32 authorized. If REF-01 lands in v2, expect a new, more general surface (likely reusing this modal's visual chrome, not its component contract as-is).

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
