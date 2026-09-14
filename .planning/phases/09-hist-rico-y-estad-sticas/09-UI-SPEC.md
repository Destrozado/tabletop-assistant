---
phase: 9
slug: hist-rico-y-estad-sticas
status: draft
shadcn_initialized: false
preset: none
created: 2026-09-09
---

# Phase 9 — UI Design Contract

> Visual and interaction contract for the three new surfaces Phase 9 adds: the end-of-game
> outcome dialog (`GameOutcomeDialog`, replacing the existing `ConfirmDialog` call on
> «Partida terminada»), the history screen (`/historico`), and the statistics screen
> (`/estadisticas`) — plus two small secondary access points on the home screen and a
> transient "saved" notice. **This is a delta document.** `01-UI-SPEC.md` remains the
> design system of record (colors, spacing scale, type scale, tap-feedback pattern,
> orientation guard); `06-UI-SPEC.md` added the first modal-with-list and text-input
> shapes; `07-UI-SPEC.md` added the stepper-cell pattern and amended the touch-target
> floor. **All three carry forward completely unchanged — this phase introduces zero new
> colors, zero new font sizes, zero new spacing tokens.** Every visual decision below is
> either a direct application of an existing pattern or a locked decision from
> `09-CONTEXT.md`.
>
> Compiled from 26 locked decisions (D-01..D-26) and three user-approved ASCII mockups
> (the outcome dialog, the history card, the statistics table) in `09-CONTEXT.md` — every
> design question this phase raises was already answered during `/gsd:discuss-phase`. No
> further questions were put to the user in this session: the only gaps were the ones
> `09-CONTEXT.md` explicitly named as **Claude's Discretion** (file/route/component names,
> exact button/label wording within what D-06 fixes, the empty-state copy for statistics,
> and the mechanism/copy for the D-03 save-result notice). Every choice made to close
> those gaps is listed in **Decisions Made Without User Input** at the end, for review —
> none of them reopens or contradicts D-01..D-26.
>
> **Firestore does not exist in this phase's contract.** Nothing below mentions sync
> status, upload state, or a "pending" badge — that is Phase 10's document to write.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — no shadcn / no component library. shadcn is a React-only tool (built on Radix UI); this is a Vue/Nuxt project, so it has never applied and does not apply here either (unchanged since Phase 1, confirmed again in `07-UI-SPEC.md`) |
| Preset | not applicable |
| Component library | none — hand-rolled Tailwind v4 components (unchanged) |
| Icon library | none — hand-rolled Unicode glyphs (unchanged). Existing closed set through Phase 8: `≡ ✕ ✓ ● ‹ › ⚠ ▼ ▲`. **This phase adds no new glyph** — the outcome dialog uses plain text buttons (no glyph), the history card's delete control is a plain text label ("Borrar"), and the save-result notice reuses `✓` (success) and `⚠` (failure), both already in the set |
| Font | Inter (self-hosted woff2), fallback `system-ui, -apple-system, sans-serif` (unchanged) |

---

## Spacing Scale

Inherited verbatim from `01-UI-SPEC.md` — no new tokens, no new exceptions.

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | Gap between a history card's stacked detail lines where `gap-sm` would be too loose |
| sm | 8px | Gap between a history card's cause line and its context line |
| md | 16px | Gap between the two secondary home-screen buttons (Histórico / Estadísticas); horizontal padding inside list rows |
| lg | 24px | History card internal padding (`p-lg`); gap between the outcome dialog's heading/context/warning block |
| xl | 32px | Page body horizontal padding on `/historico` and `/estadisticas` (matches `GameSelectorScreen`'s `px-2xl`... see note below) |
| 2xl | 48px | Page body horizontal padding on `/historico` and `/estadisticas` (reuses the exact `px-2xl` already used by `VoiceUnavailableNotice`/`UpdateBanner`'s banner shape and `MesaListaScreen`'s body) |
| 3xl | 64px | Not newly used this phase |

Exceptions: none.

---

## Typography

Inherited verbatim — still exactly 4 sizes, exactly 2 weights (400 / 700). No new size, no new weight, no new use of Display.

| Role | Size | Weight | Line Height | Use in this phase |
|------|------|--------|-------------|----------|
| Heading | 28px | 700 | 1.25 | Screen titles `HISTÓRICO` / `ESTADÍSTICAS` (own `h-16` headers, same treatment as `MesaListaScreen`'s custom header); the outcome dialog's question (`¿Cómo terminó la partida?`); empty-state headings on both screens |
| Body | 20px | 400 (regular text) / 700 (the four outcome-dialog buttons, the result word, player/hero rows) | 1.5 | History card content lines (context, player rows, round+duration); statistics table rows; outcome dialog's context line and retained warning paragraph; empty-state body copy; save-result notice body |
| Label | 18px | 700 | 1.2 | `GANADA` / `PERDIDA` result word; date; cause line's category treatment is Body, not Label (see Copywriting Contract); `Borrar` control; statistics section headers (`% DE VICTORIAS POR HÉROE` / `% DE VICTORIAS POR VILLANO`, uppercase, same treatment as `IndexOverlay`'s block labels); `‹ Atrás` and the cross-link control in both new headers; the D-12 sample-size caption line |
| Display | 40px | 700 | 1.2 | Not used this phase — no new large numeric value is introduced (percentages and counts stay at Body per D-25, see Color/hard-rule note below) |

---

## Color

Inherited verbatim — **zero new hex values.** Existing reservations gain new uses; none of them is a new *role*.

| Role | Value | Usage (unchanged reservations, extended below) |
|------|-------|--------|
| Dominant (60%) — background | `#14161C` | `/historico` and `/estadisticas` page background (same "content area" role `StepScreen`/`GameSelectorScreen` already have); outcome dialog's opaque backdrop (same shell as `ConfirmDialog`) |
| Secondary (30%) — surface | `#1E212B` | Both new screens' `h-16` headers; each history card's fill; the outcome dialog's panel; the save-result banner's fill (same "chrome" role already given to `AppHeader`/`NavBand`/`UpdateBanner`) |
| Primary text | `#F2F3F5` | Card/table body text, dialog heading and buttons, screen titles — no new use, just more of the same role |
| Secondary text | `#9AA0AC` | Cause line, context line (villain·dificultad·jug·ronda), round+duration line, empty-state body copy, sample-size caption, the "Sin héroes ni villano anotados" fallback line |
| Accent (10%) | `#2F81F7` | **NEW use, extending the existing "interactive control" reservation** (already covers `Siguiente`'s fill, the index `●`/`✓`, the grid `✓`, the counter `▼`/`▲`): the `✓` glyph on the save-result notice's success variant, and both cross-link controls (`Estadísticas ›` from Histórico, `Histórico ›` from Estadísticas) — a navigation affordance, same family as `NavBand`'s `‹`/`›` glyphs |
| Warning | `#FFB020` | **NEW use, extending the existing reservation** (already covers every `⚠` in the app): the `⚠` glyph and heading text on the save-result notice's *failure* variant only |
| Destructive | `#FF5C5C` | **NEW use, extending the existing reservation** (outline/text treatment already used by `IndexOverlay`'s "Partida terminada" trigger): the `Borrar` text control on each history card, and the confirm-fill inside the reused `ConfirmDialog` when it opens for a delete |

**Hard rule — GANADA/PERDIDA are never color-coded.** No green, no red, no accent fill on the result word or on any of the three outcome-recording buttons. This app has never used color to encode a game's win/loss outcome, only to encode interactive controls (accent) and problems (warning/destructive) — inventing a "green = win" convention here would be a new color *meaning*, not an extension of an existing one, and nothing in `09-CONTEXT.md` asks for it. The three recording buttons (`GANADA`, both `PERDIDA · …`) all use the **exact same neutral chrome** already established by `ConfirmDialog`'s non-destructive button (`bg-surface text-primary-text`) — see Layout §2.

**Hard rule — the statistics count and percentage share identical visual weight (D-25).** Both render in the same size/weight/color (Body, 400, Primary text) on the same line. No dimming, no smaller count, no bolded percentage — D-25's entire defense against a misleading percentage is that the sample size sits right next to it with equal weight, never demoted.

**No new contrast computation needed** — same surface/background pairs `01-UI-SPEC.md` already computed.

---

## Layout

### 1. Home screen — two secondary access points (D-17)

```
┌─────────────────────────────────────────────┐
│                                               │
│         ¿A qué juego vas a jugar?            │
│   Guía de flujo paso a paso — no es...       │
│                                               │
│   [ Marvel Champions ]   [ PRÓXIMAMENTE ]    │
│                                               │
│           Histórico     Estadísticas         │
│                                               │
└─────────────────────────────────────────────┘
```

- Inserted as one more row in `GameSelectorScreen`'s existing centered `flex flex-col
  gap-2xl` column — **the block's structure is not restructured**, per D-17. The two
  access buttons sit in their own `flex gap-md` row below the game-card row.
- **Chrome: identical to `ConfirmDialog`'s non-destructive button** (`min-h-12 px-lg
  bg-surface text-primary-text text-label font-bold`, same press feedback
  `brightness-95 scale-[0.98]`) — this is the established "secondary/neutral button"
  shape in this codebase, reused rather than inventing a link-style treatment. This is
  what makes them read as secondary next to the game cards' larger `bg-surface
  text-heading` tiles, without adding a new color.
- Each navigates with `navigateTo('/historico')` / `navigateTo('/estadisticas')`. Neither
  button ever renders as disabled — both screens have a defined empty state (D-22 and its
  mirror), so there is never a reason to block entry.

### 2. `GameOutcomeDialog` — replaces the `ConfirmDialog` call on «Partida terminada» (D-01/D-02)

**Ancla visual:** the question `¿Cómo terminó la partida?` — the only Heading/700 text in
the panel (context line and retained warning are Body/secondary-text, the three recording
buttons Body/700, `Salir sin registrar` Label), and the first element in the panel, so it
is visible before any scroll on a short viewport. The three recording buttons are
deliberately *equal* in weight to each other — no primary/secondary treatment, since D-02
forbids nudging the group toward one outcome — which is precisely why the anchor has to be
the question rather than a button.

Same shell as `ConfirmDialog` (opaque `fixed inset-0 z-50 bg-background flex
items-center justify-center px-xl`, panel `w-full max-w-[640px] bg-surface p-2xl flex
flex-col gap-lg`), extended with a scroll safety the four-button content needs that
`ConfirmDialog` never did: `max-h-[90dvh] overflow-y-auto` on the panel (same safety
`VillainPickerModal`'s panel already carries for its own taller content).

```
┌──────────────────────────────────────┐
│  ¿Cómo terminó la partida?            │  Heading, bold
│  Kang · 3 jug · Normal · ronda 7      │  Body, secondary-text (context line)
│  Se borrará el progreso guardado      │  Body, secondary-text (retained D-02 warning)
│  (Kang · 3 jug · Normal · ronda 7) y  │
│  volveréis a la pantalla de inicio.   │
│  Esta acción no se puede deshacer.    │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ GANADA                           │ │  bg-surface, text-primary-text, Body/700
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ PERDIDA · Se completó el Plan    │ │  same neutral chrome, no color hierarchy
│  │ Principal                        │ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ PERDIDA · Todos los héroes       │ │  same neutral chrome
│  │ eliminados                       │ │
│  └──────────────────────────────────┘ │
│                                        │
│              Salir sin registrar      │  plain text, no box (Label, secondary-text)
└──────────────────────────────────────┘
```

- **Reconciling the ASCII mockup with D-06's corrected wording:** `09-CONTEXT.md`'s
  original sketch used the short forms `PERDIDA · plan principal` /
  `PERDIDA · héroes eliminados`; D-06 (the rules-reference contrast) fixes the accurate
  final wording as `Se completó el Plan Principal` / `Todos los héroes eliminados`. This
  document uses **the corrected, longer wording on the buttons themselves** — the short
  mockup forms were illustrative placement, not the literal final copy, and the two
  wordings must match exactly between the button and the history card's cause line (see
  Copywriting Contract) so the group never reads two different sentences for the same
  fact.
- **Context line** (`{villano} · {n} jug · {dificultad} · ronda {round}`): omits the
  villain segment entirely when `villainId` is `null` (SEL-09/D-12 — selection stays
  optional end to end) rather than showing a placeholder; player count and difficulty are
  always known (fixed at mini-setup), so those two segments never fall back. Building this
  string is a composable/engine concern (mirrors `sessionContextLabel`'s existing
  `${playerCount} jug · ${difficulty label}` composition) — this document fixes only the
  visible text and its fallback rule.
- **Retained warning text**: this is the *exact same* computed body `ConfirmDialog`
  already renders today (`endGameBody`) — D-02 requires it not disappear, only relocate
  inside the new dialog, directly under the context line.
- **Buttons stack full-width, vertically**, one tap each = one outcome recorded — no
  intermediate step, no second confirmation (D-01). All three recording buttons share
  identical chrome (see Color hard rule above).
- **`Salir sin registrar`** is the only element in this dialog **without a box** — plain
  text, Label size, secondary-text color, centered, matching the mockup's own visual
  absence of a border around it. It is functionally equivalent to `ConfirmDialog`'s old
  "Cancelar" and produces the exact same side effect as clicking outside used to *not*
  produce — no backdrop-tap-dismiss and no Escape-to-dismiss on this dialog (same
  no-accidental-dismiss posture `ConfirmDialog` already has): a diálogo this consequential
  requires an explicit tap on one of its four options, never an accidental one.
- **Same appears every time «Partida terminada» is pressed, including mid-setup** (D-04)
  — zero conditional branches on `sectionRepeats` or similar.

### 3. `/historico` and `/estadisticas` — shared header shape (D-16/D-18)

**Ancla visual — `/historico`:** the first (most recent) card in the scrollable body.
The `HISTÓRICO` title is the largest text on the screen (Heading/700) but is deliberately
*not* the anchor — it is a fixed orientation label in the quiet `bg-surface` band, identical
on every visit, so it carries no information after the first half-second. The eye should
land on the top card instead: it is the first thing on the darker `bg-background`, its
`GANADA`/`PERDIDA` is the first Label/700 in the reading order, and landing there is what
makes the "más reciente primero" ordering (D-19) obvious without having to compare dates.

**Ancla visual — `/estadisticas`:** the first section header,
`% DE VICTORIAS POR HÉROE` (Label/700, uppercase, rule underneath) — again the first
element inside the scrolling body, with the Heading/700 `ESTADÍSTICAS` title playing the
same fixed-orientation role as on `/historico`. Deliberately *not* any number: §6's hard
rule keeps `{wins} de {total}` and `{pct} %` at identical Body/400 weight so no percentage
can out-shout its own sample size. That leaves the two section headers as the only
emphasis inside the body, so the eye lands on the grouping and reads each block whole —
exactly the reading D-25 wants.

On both screens the empty state (§5/§7) substitutes its own Heading as the anchor, so
there is never a screen whose focal point is an empty container.

```
┌──────────────────────────────────────────────┐
│ ‹ Atrás        HISTÓRICO      Estadísticas ›  │   h-16, bg-surface
├──────────────────────────────────────────────┤
│                                                │
│   [ card ]                                    │   scrollable body,
│   [ card ]                                    │   bg-background,
│   [ card ]                                    │   px-2xl py-lg
│                                                │
└──────────────────────────────────────────────┘
```

- Own `h-16 shrink-0 bg-surface flex items-center justify-between px-lg` header — same
  established precedent as `MesaListaScreen`'s custom header (a page-specific header is
  acceptable when the mockup calls for a distinct arrangement; this one needs three zones,
  which `AppHeader` doesn't have).
- Left: `‹ Atrás` — plain text button (`min-h-12 px-md text-label font-bold
  text-primary-text active:brightness-95`, same glyph literally reused from `NavBand`),
  `navigateTo('/')`.
- Center/left of remaining space: the screen title, `HISTÓRICO` / `ESTADÍSTICAS`,
  Heading/700, uppercase (matches the all-caps convention already used for `VILLANO`,
  `PRÓXIMAMENTE`, `SIGUIENTE`).
- Right: the cross-link (D-18) — `Estadísticas ›` on `/historico`, `Histórico ›` on
  `/estadisticas`. Text button, Label/700, **accent color** (a navigation affordance, see
  Color). Tapping it is a whole-screen navigation, **not a filtered drill-down** — see
  Decisions Made Without User Input for why a per-hero/per-villain filtered jump is
  explicitly out of scope here.
- Body: `flex-1 overflow-y-auto bg-background px-2xl py-lg`, same scrolling-body pattern
  `VillainPickerModal`'s list area already uses.

### 4. History card anatomy (D-19)

```
┌────────────────────────────────────┐
│ GANADA              12 sep 2026    │  Label/700 · Label/400 (justify-between)
│ Kang · Normal · 3 jug              │  Body/400, secondary-text
│ Ana · Thor                         │  Body/400, primary-text
│ Jugador 2 · Hulka                  │
│ Luis · Spider-Man                  │
│ Hasta la ronda 7 · 1 h 40 min      │  Body/400, secondary-text
│                            Borrar  │  Label/700, destructive, right-aligned
└────────────────────────────────────┘
```

```
┌────────────────────────────────────┐
│ PERDIDA              9 sep 2026    │
│ Se completó el Plan Principal      │  Body/400, secondary-text (cause line — loss only)
│ Rhino · Experto · 2 jug            │
│ …                                  │
└────────────────────────────────────┘
```

- **Root**: `bg-surface p-lg flex flex-col gap-sm` — everything visible, nothing behind a
  tap except `Borrar` (D-19 explicitly rejects a detail modal). Cards stack in a `flex
  flex-col gap-md` list, most recent first (HIST-07).
- **Row 1** (`flex justify-between`): result word (`GANADA` / `PERDIDA`, Label/700,
  primary-text — **never color-coded**, see Color hard rule) and the date (Label/400,
  secondary-text), formatted `12 sep 2026` (D-21 — abbreviated month in letters, produced
  by a pure engine formatter, never `toLocaleDateString`).
- **Cause line** (loss only): `Se completó el Plan Principal` or
  `Todos los héroes eliminados` — the exact same string used on the dialog button minus
  the `PERDIDA ·` prefix (the result word above already carries that). Absent entirely for
  a win — no blank line reserved.
- **Context line**: `{villano} · {dificultad} · {n} jug`. When `villainId` is `null`,
  render `Sin villano` in its place (reuses the tone of `VillainPickerModal`'s own
  `Sin elegir` null-selection row) — never a blank gap, never `—` (the `—` glyph is
  reserved for "a numeric value that cannot be known," per `07-UI-SPEC.md`'s own
  precedent; a missing selection is a different kind of unknown and gets words, not a
  dash).
- **Player rows**: one line per player, `{playerLabel} · {heroName}`.
  `resolvePlayerLabel` (from `useHeroSearch.ts`, already tested) supplies `{playerLabel}`
  — `Jugador N` when the name is empty. When a given player's `heroId` is `null`, that
  row renders `{playerLabel}` alone, no `·` and no trailing text.
  - **Fully-unselected entry (D-12, both `villainId` and every hero null):** the villain
    line and every player row collapse into a **single** line,
    `Sin héroes ni villano anotados` (secondary-text, Body) — never N empty-looking player
    rows in a row. This entry is still counted in the total registered games, only
    excluded from the two %-of-victories tables (D-12).
- **Round + duration line**: `Hasta la ronda {round} · {duration}`, always "hasta la ronda
  N," never "N rondas" (D-09). Duration is `1 h 40 min`-style or `—` when `durationMs` is
  `null` (D-10 — a v1.7-era resumed session with no `startedAt`) — this **is** a case for
  the dash glyph, because it is a genuinely unknowable numeric quantity, unlike the
  villain-selection case above.
- **`Borrar`**: bottom-right, Label/700, `text-destructive`, no border (an inline text
  control, not a boxed button — matches the card's otherwise chrome-free, all-text
  anatomy). Tapping it opens the existing `ConfirmDialog` (D-20) — see Component
  Inventory.

### 5. Empty state — `/historico` (D-22)

```
┌─────────────────────────────────────────────┐
│                                               │
│      Todavía no hay partidas registradas     │  Heading/700
│                                               │
│   Al terminar una partida y pulsar «Partida  │  Body/400, secondary-text
│   terminada», la app pregunta cómo acabó —   │
│   así es como se rellena esta lista.         │
│                                               │
└─────────────────────────────────────────────┘
```

Centered in the scrollable body, same `flex flex-col items-center justify-center
text-center gap-md` treatment `MesaListaScreen`'s empty affordances use — no button, no
illustration, no new component (D-22 explicitly rejects a "go to selector" button as
redundant with the header's own `‹ Atrás`).

### 6. Statistics table anatomy (D-23/D-24/D-25/D-26)

```
% DE VICTORIAS POR HÉROE
────────────────────────────────
Thor            3 de 4  ·  75 %
Hulka           1 de 2  ·  50 %
Spider-Man      2 de 5  ·  40 %

% DE VICTORIAS POR VILLANO
────────────────────────────────
Rhino           3 de 3  · 100 %
Kang            2 de 5  ·  40 %
```

- **Section header**: `% DE VICTORIAS POR HÉROE` / `% DE VICTORIAS POR VILLANO`, Label/700,
  uppercase, `text-secondary-text`, `border-b border-background pb-xs` — the exact
  treatment `IndexOverlay`'s own block labels (`h2.text-label.font-bold.uppercase
  .text-secondary-text`) already use, rotated from a step-index grouping to a stats
  grouping.
- **Row**: a plain `<div>`, **never a `<button>`** — same "no false affordance" rule Phase
  8 fixed for `stepValueRows` (D-09 of `08-CONTEXT.md`): nothing here is tappable, so
  nothing renders with a chevron, a hover/press state, or an `aria-label`. `flex
  justify-between items-baseline min-h-12 px-md`, name on the left (`flex-1 truncate`),
  `{wins} de {total} · {pct} %` on the right — both halves Body/400, primary-text, **equal
  visual weight** (Color hard rule above).
- **Order (D-24)**: rows arrive pre-sorted from the engine/composable (% descending, then
  games-played descending, then alphabetical) — the component never re-sorts; this keeps
  it a dumb, testable render of an already-ordered array, same discipline as every other
  list in this app.
- **Only rows for entities that have been played at least once** (D-23) — 20 heroes at
  "0 de 0" would bury the 3 with real data; the 3 villains happen to satisfy this
  trivially since all 3 are always in the catalogue's active rotation.
- **No minimum-games threshold, ever** (D-25) — `1 de 1 · 100 %` renders exactly like any
  other row; the count sitting at equal weight next to the percentage is the entire
  defense against it reading as misleading.
- **Sample-size caption** (only rendered when at least one entry with a partial/no
  selection exists, per D-12): a single Label/700, secondary-text line above both tables,
  e.g. `12 partidas registradas · 10 con héroes anotados` — exact plural handling is a
  composable concern, this document fixes only the pattern and that it must always
  appear together (never percentage tables without this caption when the numbers would
  otherwise look like they "ate" games).

### 7. Empty state — `/estadisticas` (mirror of D-22, per Claude's Discretion)

```
┌─────────────────────────────────────────────┐
│                                               │
│        Todavía no hay estadísticas           │  Heading/700
│                                               │
│   En cuanto registréis vuestra primera       │  Body/400, secondary-text
│   partida en el histórico, aquí aparecerá    │
│   el % de victorias por héroe y por villano. │
│                                               │
└─────────────────────────────────────────────┘
```

Same centered treatment as `/historico`'s empty state — this is STAT-05's "clear empty
state, not an error, not a misleading percentage," satisfied by never rendering a table
shell (headers with zero rows) at all when the history is empty.

### 8. Save-result notice (D-03)

Reuses the exact banner shape already established by `UpdateBanner.vue`/
`VoiceUnavailableNotice.vue` (`bg-surface border-b border-background px-2xl py-lg flex
items-start justify-between gap-md`), mounted the same way — in `app/app.vue`, above
whatever page currently renders, since the group lands back on `/` right after
`onEndGameConfirm`'s `navigateTo('/')` (same reasoning `UpdateBanner`'s own header
comment gives for living in `app.vue`: a detectable-anywhere condition needs the one
route-independent mount point).

**Success:**
```
┌──────────────────────────────────────────────┐
│ ✓ Partida registrada                          │  Heading/700, ✓ in accent
└──────────────────────────────────────────────┘
```

**Failure** (`appendHistoryEntry` returned `false`):
```
┌──────────────────────────────────────────────┐
│ ⚠ No se pudo guardar la partida               │  Heading/700, ⚠ in warning
│ El dispositivo no permitió escribir en su     │  Body/400, secondary-text
│ almacenamiento (modo privado, cuota agotada    │
│ u otro bloqueo similar).                       │
│ Revisad el modo privado del navegador o el     │
│ espacio libre antes de la próxima partida.     │
└──────────────────────────────────────────────┘
```

**Nota (ronda 6, plan 09-31):** el diagrama de fallo de arriba no se redibuja (mantiene la
copy original de D-03 tal y como este documento la fijó), pero **desde el plan 09-28 no
existe una única variante de fallo: son cuatro** (`failure-recoverable`, `failure-stale`,
`failure-unrecoverable`, `failure-unknown`), decididas por `planGameEnd(historyRecorded,
stored)` a partir de `StoredProgress`. `app/composables/useHistorySavedNotice.ts`
(`NOTICE_HEADING`/`NOTICE_BODY`) es la fuente de verdad del texto exacto de cada una — ver
el «Copywriting Contract» abajo, donde las cuatro están citadas literalmente. El
razonamiento de diseño («aviso breve»/duración/no bloquea nunca) descrito debajo aplica
igual a las cuatro: todas comparten `FAILURE_AUTO_DISMISS_MS` (20 s).

- Both variants carry the same `✕` dismiss control (`w-12 h-12`, top-right, same as its
  two precedents) **and** auto-dismiss after a fixed duration — this is the "aviso breve"
  language in D-03: the success variant is genuinely brief (no action needed, so it
  should not linger), while the failure variant staying up long enough to be read matters
  more, but neither should require a mandatory dismiss the way a dialog does. Exact
  timing is a composable concern (`useHistorySavedNotice` or similar), not fixed by this
  document beyond "auto-dismiss + manual dismiss both exist."
- **Never blocks input** — no overlay, no `role="dialog"`, exactly like its two
  precedents. The group can start picking a new game while it is still visible.

---

## Component Inventory

| Component | Change | Props / States |
|-----------|--------|-----------------|
| `GameOutcomeDialog` | **NEW component** (`app/components/GameOutcomeDialog.vue`, suggested name — replaces the `ConfirmDialog` instance currently wired to `awaitingEndConfirm` in `app/pages/[game]/index.vue`). Dumb — no engine import. | `contextLine: string`, `warningBody: string` (the retained D-02 text, computed by the page exactly as `endGameBody` is today), plus no other props — the four choices are fixed. Emits: `record: ['won' \| 'mainSchemeCompleted' \| 'heroesEliminated']`, `dismiss: []` (the "Salir sin registrar" case). |
| `ConfirmDialog` | **Unchanged**, reused as-is for the history card's delete flow (D-20) — no new prop, `destructive: true` already exists. | Title `¿Borrar esta partida del histórico?`, body citing the entry (`Ganada del 12 sep 2026 contra Kang`), confirm `Sí, borrar`, cancel `Cancelar`. |
| `HistoryEntryCard` (suggested; a flat `v-for` row is equally acceptable per this codebase's stated preference — see `07-UI-SPEC.md` Decision 1) | **NEW.** Dumb — renders one already-formatted entry, no date/duration math inside it. | `result`, `causeLabel \| null`, `contextLine`, `playerLines: string[] \| null`, `noSelectionLine: string \| null`, `dateLabel`, `roundAndDurationLine`. Emits `delete: []`. |
| `app/pages/historico.vue` | **NEW page** (suggested route `/historico`, per D-16). Composes the shared header (§3), the card list or empty state (§5), `ConfirmDialog` for delete. | — |
| `app/pages/estadisticas.vue` | **NEW page** (suggested route `/estadisticas`). Composes the shared header, the two stats tables or empty state. | — |
| `GameSelectorScreen` | **Extended**, not replaced — gains the two secondary buttons (§1). Still a dumb component (TECH-04): it mentions no specific game, and the two new buttons are generic navigation, not game-specific. | New emits `open-history: []`, `open-statistics: []` (or the page wires `navigateTo` directly in the template — either is acceptable, this document fixes only the visible result). |
| Save-result notice (suggested name `HistorySavedNotice.vue`) | **NEW**, mounted in `app.vue` alongside `UpdateBanner`/`VoiceUnavailableNotice`. | `variant: 'success' \| 'failure'` (or simply not rendered when neither is pending). No props needed beyond that — copy is fixed per variant (§8). |

**Accessible names:**
- `GameOutcomeDialog`'s four controls need no `aria-label` beyond their own visible text
  (each is a complete sentence already, unlike the counter band's icon-only `▼`/`▲`).
- `Borrar` on each card: `aria-label="Borrar partida del ${dateLabel} contra ${villano ?? 'sin villano'}"` — same "spoken name stays accurate" precedent `06-UI-SPEC.md`/`07-UI-SPEC.md` both set for their own dynamic labels.
- Statistics rows carry **no `aria-label` and no interactive role** at all (D-09 precedent from Phase 8) — they are inert `<div>`s.

---

## Interaction & State Coverage

### One tap = one outcome, no intermediate state (D-01/HIST-01/HIST-02/HIST-03)

Tapping any of `GANADA` / either `PERDIDA · …` button immediately calls
`appendHistoryEntry(...)` with the corresponding enum value baked in — there is no
"pending cause" state to render, because the enum's two values already encode both
result and cause together (same reasoning as Phase 8's D-02 flat-enum precedent). No
loading spinner either: `localStorage` writes are synchronous.

### The dialog always appears, with zero conditional branches (D-04)

Whether «Partida terminada» is pressed mid-setup or mid-round, the same
`GameOutcomeDialog` renders with the same four options. The context line may simply be
shorter (no villain segment) — that is a data fallback, not a different dialog.

### Existing shortcut-suppression guard already covers this dialog (inherited, not new)

`GameOutcomeDialog` replaces the component wired to the same `awaitingEndConfirm` flag
that already suppresses `useStepShortcuts` while any overlay is open — no new guard
branch is needed, and this document does not ask for one. Verify, don't re-derive.

### Save-result notice never blocks (D-03)

Non-modal, no `role="dialog"`, no focus trap — same posture as `UpdateBanner`. Its only
job is to make a silent `writeRaw()` failure visible; it must never gate navigation back
to the game selector, which has already happened by the time it renders.

### Delete requires an explicit second tap, same posture as every other destructive action in this app (D-20)

`Borrar` never deletes on its own tap — it opens the existing `ConfirmDialog`. Canceling
leaves the entry untouched. Confirming removes exactly one entry by reassigning a new
`entries` array (never an in-place `splice`), same discipline `07-UI-SPEC.md` already
established for `counters` mutators (D-19/D-20 there) — required here too, because
`localStorage` writes need a reassignment to be observed by whatever watcher persists
`tga:history`.

### Cross-link is whole-screen navigation only, not a filtered drill-down (D-18, scoped explicitly)

Tapping `Estadísticas ›` / `Histórico ›` in either header is equivalent to tapping the
home-screen access button for that screen — it does **not** pre-filter the destination
screen by hero or villain. No requirement in `REQUIREMENTS.md` asks for a filtered
history view, and building one now would be exactly the kind of "since the data's already
grouped, filtering is basically free" scope creep `09-CONTEXT.md`'s own §Domain warns
against (`PITFALLS.md` §14). If a filtered drill-down is ever wanted, it needs its own
requirement.

### Empty states never render a percentage or a table shell with zero rows (STAT-05/D-25)

`/estadisticas` with zero history entries shows **only** the empty-state block (§7) —
never `% DE VICTORIAS POR HÉROE` with no rows under it, and never a `0 %` anywhere. This
is the literal mechanism behind "no un error ni porcentajes engañosos."

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Home screen — secondary access (D-17) | `Histórico` · `Estadísticas` |
| Outcome dialog heading (D-01) | `¿Cómo terminó la partida?` |
| Outcome dialog context line | `{villano ?? omit} · {n} jug · {Normal\|Experto} · ronda {round}` |
| Outcome dialog retained warning (D-02, text corrected in ronda 6, plan 09-30) | Today's `endGameBody`, copied literally from `app/pages/[game]/index.vue`: `El progreso guardado de esta partida ({resumen}) se borrará y volveréis a la pantalla de inicio. Si el registro en el histórico falla, la app conservará el progreso para que podáis reintentarlo.` — D-02 required the warning text not disappear, only relocate; ronda 6 (`09-VERIFICATION.md`) found the original text false in the `preserveProgress: true` branch (failed history write), because it always promised an unconditional, irreversible deletion. D-02's *intent* (warn before ending the game) is kept; the *fact it asserts* is corrected. |
| Outcome button — win | `GANADA` |
| Outcome button — loss, cause 1 (D-06) | `PERDIDA · Se completó el Plan Principal` |
| Outcome button — loss, cause 2 (D-06) | `PERDIDA · Todos los héroes eliminados` |
| Outcome dialog — decline to record (D-01/D-05) | `Salir sin registrar` |
| History card — result word | `GANADA` / `PERDIDA` |
| History card — cause line (loss only, must match the button text minus the `PERDIDA ·` prefix) | `Se completó el Plan Principal` / `Todos los héroes eliminados` |
| History card — no villain selected | `Sin villano` |
| History card — fully-unselected entry (D-12) | `Sin héroes ni villano anotados` |
| History card — date (D-21, pure formatter, not `toLocaleDateString`) | `12 sep 2026` |
| History card — round + duration (D-09/D-21) | `Hasta la ronda {n} · {Xh Ymin}` / `Hasta la ronda {n} · —` when `durationMs` is `null` |
| History card — delete control | `Borrar` |
| Delete confirmation (D-20, reusing `ConfirmDialog`) | Title: `¿Borrar esta partida del histórico?` · Body: `{Ganada\|Perdida} del {fecha} contra {villano ?? "sin villano"}. Esta acción no se puede deshacer.` · Confirm: `Sí, borrar` · Cancel: `Cancelar` |
| Histórico empty state (D-22) | Heading: `Todavía no hay partidas registradas` · Body: `Al terminar una partida y pulsar «Partida terminada», la app pregunta cómo acabó — así es como se rellena esta lista.` |
| Estadísticas empty state (mirror, Claude's Discretion) | Heading: `Todavía no hay estadísticas` · Body: `En cuanto registréis vuestra primera partida en el histórico, aquí aparecerá el % de victorias por héroe y por villano.` |
| Estadísticas section headers (D-23) | `% DE VICTORIAS POR HÉROE` / `% DE VICTORIAS POR VILLANO` |
| Estadísticas row (D-24/D-25) | `{nombre}` … `{ganadas} de {jugadas} · {pct} %` |
| Estadísticas sample-size caption (D-12) | `{N} partida(s) registrada(s) · {M} con héroes anotados` (only rendered when `N ≠ M`) |
| Screen headers | `HISTÓRICO` / `ESTADÍSTICAS` (uppercase, matches `VILLANO`/`SIGUIENTE` convention) |
| Back control (both new screens) | `‹ Atrás` (glyph reused verbatim from `NavBand`) |
| Cross-link controls (D-18) | `Estadísticas ›` (on `/historico`) / `Histórico ›` (on `/estadisticas`) |
| Save-result notice — success (D-03) | `✓ Partida registrada` |
| Save-result notice — failure, `failure-recoverable` (ronda 6, plan 09-28) | Heading: `⚠ No se pudo guardar la partida` · Body, copied literally from `NOTICE_BODY` in `app/composables/useHistorySavedNotice.ts`: `La partida no se ha perdido: sigue guardada en el dispositivo. Volved a entrar en ella y pulsad «Partida terminada» otra vez para reintentar el registro. Si vuelve a fallar, puede deberse al modo privado del navegador, a la memoria llena, o a un histórico anterior que la app no consigue leer.` |
| Save-result notice — failure, `failure-stale` (new in ronda 6, plan 09-28) | Heading: `⚠ No se pudo guardar la partida` · Body, copied literally from `NOTICE_BODY`: `La partida no se ha registrado. En el dispositivo solo queda una versión anterior de esta partida —no la ronda en la que habéis terminado—, así que volver a entrar y registrarla desde ahí guardaría en el histórico datos que no son los de esta partida. Suele deberse al modo privado del navegador o a la memoria llena.` — the variant that closes the séptima cara del defecto (Gap #1, `09-VERIFICATION.md`): it does not promise game identity nor order the retry the other failure variants order. |
| Save-result notice — failure, `failure-unrecoverable` (ronda 5, plan 09-26) | Heading: `⚠ No se pudo guardar la partida` · Body, copied literally from `NOTICE_BODY`: `Al volver a entrar en el juego no encontraréis esta partida, así que esta vez no hay nada que reintentar. Suele deberse al modo privado del navegador o a la memoria llena: revisadlo antes de la próxima partida.` |
| Save-result notice — failure, `failure-unknown` (ronda 5, rewritten ronda 6, plan 09-28) | Heading: `⚠ No se pudo guardar la partida` · Body, copied literally from `NOTICE_BODY`: `No hemos podido comprobar si la partida sigue en el dispositivo. Volved a entrar en el juego: si os ofrece continuar, pulsad «Partida terminada» otra vez para reintentar el registro. Si no os la ofrece, puede que siga ahí y la app no consiga leerla: el modo privado del navegador y la memoria llena son las dos causas habituales.` |
| Mini-setup — lectura del progreso no comprobada (ronda 6, plan 09-29) | `unverifiedProgressNotice`, copied literally from `UNVERIFIED_PROGRESS_NOTICE` in `app/composables/useProgressMountPlan.ts`: `No hemos podido comprobar si este dispositivo tiene una partida guardada de este juego. Podéis empezar una nueva, pero si había alguna, al guardar la nueva podríais sustituirla.` — rendered only when `planProgressMount` produces `stored === 'unknown'`; never asserts a game exists or doesn't. |

*Note (ronda 6, plan 09-31): the four failure rows above reflect the state after planes 09-24..09-30 — four `NoticeVariant` failure branches instead of one. The original D-03 copy this table cited for the single failure row (`El dispositivo no permitió escribir en su almacenamiento…`) was already retired in earlier rounds for asserting a cause the app could never actually verify; this table now cites the literal, current `NOTICE_BODY` text for each of the four variants instead.*
| Primary CTA of this phase | There is no single primary CTA — the phase adds a 4-way choice (outcome dialog) and two read-only screens. The closest analogue, `Partida terminada` in `IndexOverlay`, is **unchanged text**. |
| Destructive actions in this phase | Exactly one: deleting a history entry (D-20), covered above. Recording a loss is **not** treated as destructive — it is a true fact about the game, not a data-loss action. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none | not applicable — no component registry in use |
| third-party | none | not applicable |

No shadcn/registry tooling was initialized in Phase 1 and this phase does not reopen
that decision (confirmed again, third time, following `06-UI-SPEC.md`/`07-UI-SPEC.md`).

---

## Decisions Made Without User Input

Every choice below fills a gap `09-CONTEXT.md` explicitly left to research/planning
discretion (see its `<decisions>` §"Claude's Discretion") — none reopens or contradicts
D-01..D-26.

1. **Route names: `/historico` and `/estadisticas`**, exactly the names `09-CONTEXT.md`
   itself already suggested — kept as-is rather than inventing alternatives.
2. **Component names**: `GameOutcomeDialog.vue`, `HistoryEntryCard.vue` (or an inline
   `v-for` row, equally acceptable per this codebase's own stated preference for
   avoiding a subcomponent for a simple repeated row — see `07-UI-SPEC.md` Decision 1),
   `HistorySavedNotice.vue`. All are suggestions, not mandates, per `09-CONTEXT.md`'s
   own framing of file/symbol names as open.
3. **Outcome-dialog button wording uses D-06's corrected long form**
   (`Se completó el Plan Principal` / `Todos los héroes eliminados`), not the shorter
   ASCII-mockup placeholder text — see the explicit reconciliation note in Layout §2.
   This is a copy-precision fix, not a new design decision; the mockup's own visual
   arrangement (three stacked full-width buttons, one plain-text decline below) is
   unchanged.
4. **GANADA/PERDIDA are never color-coded** — flagged explicitly as a hard rule (Color
   section) precisely because "green for a win" is an easy, unrequested addition; this
   spec forecloses it so a future pass doesn't "improve" the dialog or the card with an
   unrequested color meaning.
5. **The save-result notice (D-03) reuses the existing banner shape** (`UpdateBanner`/
   `VoiceUnavailableNotice`'s `bg-surface border-b border-background` pattern, mounted in
   `app.vue`) rather than inventing a floating toast — this is the only existing
   "transient/dismissible notice" pattern in the codebase, and D-03 asked only for "a
   brief notice," not a new visual language. Auto-dismiss + manual `✕` both present,
   exact timing left to the planner.
6. **Cross-link (D-18) is whole-screen navigation only**, explicitly **not** a
   filtered/drill-down link — flagged under Interaction & State Coverage because a
   per-hero filtered history view is the single most tempting "since the data's already
   there" addition this phase could make, and no requirement asks for it.
7. **A fully-unselected entry (D-12) collapses its villain+player detail into one
   line** (`Sin héroes ni villano anotados`) rather than rendering N empty-looking rows —
   necessary to keep the card legible when SEL-09's "selection stays entirely optional"
   produces the common case of a group that never touched the selectors.
8. **`Borrar`'s color reuses the existing destructive-outline reservation** (the same
   family `IndexOverlay`'s "Partida terminada" trigger already uses) rather than the
   filled `bg-destructive` reserved for the confirm button itself — the trigger and the
   confirm are two different visual weights of the same reservation, matching precedent.
9. **Statistics rows are plain, non-interactive `<div>`s** — a direct reuse of Phase 8's
   `stepValueRows` precedent (D-09 of `08-CONTEXT.md`: "es un div, nunca un button — sin
   chevron, sin click, sin aria-label"), applied here because nothing about a stats row
   is more actionable than a step-value row was.

---

## Forward-Compatibility Notes

- **Phase 10 (Firestore sync)** will need to indicate sync status somewhere eventually,
  but **nothing in this document reserves a spot for it** — per `09-CONTEXT.md`'s D-14,
  that field doesn't exist yet, and this phase's own success criterion nº 5 depends on
  that absence being real, not just unrendered. When Phase 10 lands, it gets its own UI
  delta document; it must not retrofit a sync badge into `HistoryEntryCard`'s anatomy
  without a fresh design pass.
- **STAT-06 (per-player %) / STAT-07 (per-difficulty breakdown)**, if ever built, are new
  tables alongside the two this phase ships — never a third column bolted onto the
  existing hero/villain rows, which are already at their intended visual density (D-25).
- **HIST-10 (editing an entry)**, if ever built, needs its own dialog — the `Borrar`
  control's chrome is not a hint at where an "Editar" control would go; this phase
  deliberately ships delete-only, per D-11's own reasoning (frozen names, no edit path).

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** aprobado — gsd-ui-checker, registrado en `.planning/STATE.md` ("Phase 9 UI-SPEC approved"). Reconfirmado por gsd-plan-checker durante `/gsd:plan-phase 9` (2026-09-10).
