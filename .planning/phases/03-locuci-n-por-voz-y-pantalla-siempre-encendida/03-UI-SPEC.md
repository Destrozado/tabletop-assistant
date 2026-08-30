---
phase: 3
slug: locuci-n-por-voz-y-pantalla-siempre-encendida
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-30
---

# Phase 3 — UI Design Contract

> Visual and interaction contract for the three surfaces Phase 3 actually adds: the voice on/off control in the header (VOZ-02), the dismissible "no hay voz" notice (VOZ-05/06), and the battery-cost line in the mini-setup screen (UI-07). **This is a delta document.** `01-UI-SPEC.md` is the design system of record (colors, spacing scale, type scale, three-band step layout, disabled-state policy, tap-feedback, orientation guard) and `02-UI-SPEC.md` is the second delta (clickable `⚠`, header composition inside the loop, index reordering). Both carry forward unchanged unless explicitly called out below. Nothing in this phase touches the step screen's action-sentence/warning layout, the nav band, or the index overlay — the wake lock and the speech engine have no dedicated screen of their own; they attach to screens that already exist.
>
> `03-CONTEXT.md` (D-38…D-53) already answered almost every design-contract question this phase could raise — this document turns those decisions into the concrete visual/interaction spec the checker, planner and executor need, and closes the handful of items CONTEXT.md explicitly left to "research/planner" discretion (icon shape and states, notice scope, unavailable-state treatment).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — no shadcn / no component library (unchanged from Phase 1; not reopened here, per Phase 2's own precedent of not revisiting a closed decision) |
| Preset | not applicable |
| Component library | none — hand-rolled Tailwind v4 components (unchanged) |
| Icon library | none — hand-rolled inline SVG, same philosophy as Phase 1's 5 fixed Unicode glyphs (`≡ ✕ ✓ ● ‹ › ⚠`). **This phase adds exactly 2 new glyphs** (speaker-on, speaker-off/muted) — the first two the app has ever needed as real SVG rather than a plain character, because a bare Unicode speaker emoji (🔊/🔇) renders in full-color platform emoji presentation on iPad Safari, breaking the app's monochrome `currentColor` icon language. See Layout §1 for exact markup |
| Font | Inter (self-hosted woff2), unchanged |

**Why SVG here and not another Unicode character (discretion item, resolved):** every existing glyph (`≡ ✕ ✓ ● ‹ › ⚠`) happens to have a monochrome text-presentation form that inherits `currentColor` via the type system. No such character exists for "speaker with sound waves" / "speaker with a slash" — the available Unicode code points (`🔊 U+1F50A`, `🔇 U+1F507`) are emoji-presentation by default and render as small colored bitmaps on iOS/iPadOS regardless of surrounding CSS `color`. Two small hand-authored inline `<svg>` elements (no icon package, no new dependency) keep the "no icon library" posture intact while guaranteeing the icon actually looks like the rest of the app.

---

## Spacing Scale

Inherited verbatim from `01-UI-SPEC.md` — no new tokens.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-label gaps |
| sm | 8px | Compact spacing |
| md | 16px | Default element spacing, gap between header's right-zone children |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks, notice banner horizontal padding |
| 3xl | 64px | Page-level spacing |

**Reused exceptions, no new ones:**
- **Tap targets: 44×44pt minimum, 48×48dp preferred.** The new voice-toggle button is `w-12 h-12` (48×48), copying the `≡` button's exact box — same reasoning, same floor.
- The notice banner's dismiss `✕` reuses `IndexOverlay`'s existing `✕` button treatment verbatim (same 48×48 box, same glyph).

---

## Typography

Inherited verbatim — still exactly 4 sizes, exactly 2 weights. No new size or weight introduced.

| Role | Size | Weight | Line Height | New use this phase |
|------|------|--------|-------------|----------|
| Display | 40px | 700 | 1.2 | none — untouched |
| Heading | 28px | 700 | 1.25 | Voice-unavailable notice heading |
| Body | 20px | 400 | 1.5 | Voice-unavailable notice body; mini-setup battery line |
| Label | 18px | 700 | 1.2 | Header text (unchanged; the voice-toggle icon carries no visible label, only an `aria-label`) |

### Content-authoring character budgets

| Field | Budget | Status |
|-------|--------|--------|
| `text` (action sentence) | ≤90 chars | Unchanged from Phase 1 |
| `warning` / `warningDetail` | ≤60 / ≤320 chars | Unchanged from Phase 2 |
| `speech` | **≤120 chars, no `⚠ × ›`** (`engine/schema.ts:60`) | **Gate widened this phase (D-38, D-41):** previously enforced only on the 10 round steps (`engine/__tests__/content.test.ts:362`); now required, non-empty, on **every `kind:'step'` node in every section**, including all 23 setup steps, and **on every difficulty variant that declares its own `text`** (D-41 — a variant with `text` but no `speech` would silently inherit the base `speech`, which can say the opposite of what's on screen). `kind:'summary'` nodes stay exempt, same treatment `citation` already gets (D-40) |

**Voice-vs-screen distinctness rule (VOZ-01, content-authoring contract, not a visual token but binding on the copy the plan/executor authors):** `speech` must never be a truncation or copy of `text` — it is a separately authored, shorter, curated sentence. Register: imperative, plural, present tense, no filler — identical register to the 10 already-authored round lines (`"Jugad vuestros turnos en orden de jugador."`, `"Enderezad todas vuestras cartas, incluidas las de encuentro agotadas."`). The `⚠` warning line is never voiced (D-39) — `speech` covers the action only.

---

## Color

Inherited verbatim — **no new hex value, no new role.** Every new visual state this phase is built from the 7 existing roles.

| Role | Value | New use this phase |
|------|-------|----------|
| Dominant (60%) `#14161C` | background | unchanged |
| Secondary (30%) `#1E212B` | surface | Voice-unavailable notice panel background |
| Primary text `#F2F3F5` | primary-text | Voice-toggle icon in the **on** state; notice heading + body; battery line is deliberately **not** this color, see below |
| Secondary text `#9AA0AC` | secondary-text | Voice-toggle icon in the **muted** state (dimmed but tappable, same "de-emphasized, still legible" reservation Phase 2 already extended to the loop's dimmed setup rows); mini-setup battery line |
| Accent `#2F81F7` | accent | **Not used by anything in this phase.** The voice toggle is a mode switch, not a "go forward" action — reusing accent here would blur its Phase 1 reservation ("Siguiente fill, index `●`/`✓`, selected segmented option") |
| Warning `#FFB020` | warning | **Explicitly NOT used for the voice-unavailable notice**, even though the notice is conceptually "a warning." Phase 1's Color contract reserves amber for exactly one meaning app-wide: "this step has a `⚠` trap" — reusing it here would make that signal ambiguous. The notice uses Secondary/Surface tones instead (see Layout) |
| Destructive `#FF5C5C` | destructive | unchanged — no destructive action this phase |

**Voice-toggle "unavailable" state — reused convention, not a new one:** rendered in `text-secondary-text` at **40% opacity**, `disabled`, no pointer cursor, no press feedback — the exact same recipe `01-UI-SPEC.md` already defined for `MiniSetupScreen`'s inactive confirm CTA and the selector's "Próximamente" card. No new contrast computation is claimed for this state, for the same reason Phase 1 didn't compute one for those two precedents: it is a non-interactive, informational-only affordance, not a text-legibility surface.

**Contrast (reused from Phase 1/2, no new pairs needed):**

| Pair | Ratio | Passes | Reused from |
|------|-------|--------|-------------|
| Primary text `#F2F3F5` on Surface `#1E212B` (notice heading + body) | 14.5:1 | AAA | `01-UI-SPEC.md` §Color |
| Secondary text `#9AA0AC` on Surface `#1E212B` (voice-toggle muted icon, sits on header's surface bg) | ~6.1:1 (computed: same formula as the already-verified `#9AA0AC` on `#14161C` pair, re-run against `#1E212B`) | AA | Extends `01-UI-SPEC.md` §Color's existing secondary-text verification to a second background it already uses elsewhere (header, index rows) |
| Secondary text `#9AA0AC` on Background `#14161C` (mini-setup battery line) | 6.9:1 | AA, near-AAA | `01-UI-SPEC.md` §Color |

---

## Layout

### 1. Voice toggle — header, right zone (D-48, VOZ-02)

Inserted between `sessionContext` and `≡`, inside the header's already-reserved right-zone `<div>` (`app/components/AppHeader.vue`'s own comment: *"la Fase 3 insertará aquí el icono de silencio... sin reorganizar el layout"*). Order, left to right: session context text → voice toggle → `≡`. `gap-md` (16px) between each, matching the existing gap already used between `sessionContext` and `≡`.

```
┌──────────────────────────────────────────────────────┐
│ PREPARACIÓN · 8 de 23         3 jug · Normal  🔊  ≡  │  ← voice ON (primary-text icon)
├──────────────────────────────────────────────────────┤
│ PREPARACIÓN · 8 de 23         3 jug · Normal  🔇  ≡  │  ← voice MUTED (secondary-text icon)
├──────────────────────────────────────────────────────┤
│ PREPARACIÓN · 8 de 23         3 jug · Normal  🔇  ≡  │  ← voice UNAVAILABLE
└──────────────────────────────────────────────────────┘    (secondary-text @ 40% opacity, disabled)
```
(`🔊`/`🔇` above stand in for the hand-drawn SVGs below — never render literal emoji.)

**Markup contract — both icons share the same speaker-cone base, differing only in the second path:**

```html
<!-- speaker-on (voice active) -->
<svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 9H7L11 5V19L7 15H4V9Z" fill="currentColor" />
  <path d="M14.5 8.5C15.5 9.5 16 10.7 16 12C16 13.3 15.5 14.5 14.5 15.5"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  <path d="M17 6C18.9 7.9 20 10 20 12C20 14 18.9 16.1 17 18"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>

<!-- speaker-off (muted OR unavailable — color/opacity/disabled differ, markup doesn't) -->
<svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 9H7L11 5V19L7 15H4V9Z" fill="currentColor" />
  <path d="M15 9L20 15M20 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
</svg>
```

- Button box: `w-12 h-12 flex items-center justify-center` (48×48, identical box to `≡`), icon rendered at 28×28 (`width="28" height="28"` on the `<svg>`) to visually match the `≡` glyph's rendered size at `text-heading` line-height.
- Color/opacity/interactivity per state (three states, one component):

| State | Icon shown | Color class | Opacity | `disabled` | Press feedback | `aria-label` |
|-------|-----------|-------------|---------|------------|-----------------|--------------|
| `on` | speaker-on | `text-primary-text` | 100% | no | yes (4% darken + 2% scale, standard) | `Silenciar voz` |
| `muted` | speaker-off | `text-secondary-text` | 100% | no | yes | `Activar voz` |
| `unavailable` | speaker-off | `text-secondary-text` | 40% | **yes** | none (matches the disabled-CTA/coming-soon-card precedent) | `Voz no disponible en este dispositivo` |

- **Default render before detection resolves:** show the `on` state (optimistic, matches D-47's "voice on by default"). Detection must not block first paint or flash a dimmed icon on every load — if the device turns out to have no Spanish voice, the icon switches to `unavailable` once detection settles (bounded; do not wait indefinitely on a `voiceschanged` that some Safari versions never fire — this timing/detection mechanism is an implementation detail left to the plan, per `03-CONTEXT.md`'s own discretion note, but the *visual* contract — optimistic-on, then switch if needed — is fixed here).
- **Tap behavior:** `on` ⇄ `muted` toggles the persisted preference (D-46/D-47) and — per D-45 — cuts any speech in progress immediately when transitioning to `muted`. `unavailable` is a real `disabled` button: no tap handler fires, consistent with the coming-soon-card and disabled-CTA conventions already in the app (never a dead click that silently does nothing without visual signal — the 40%-opacity + `disabled` combination already tells the user this control does nothing).
- **Visibility (D-49, unchanged from CONTEXT.md):** only mounted where `AppHeader` is mounted — i.e. only on step screens inside the guided flow. `GameSelectorScreen`, `MiniSetupScreen`, `ResumePrompt`, `MesaListaScreen` (its own bespoke header, per Phase 1's `01-05` decision) never show it, because none of them speak (D-40).

### 2. Voice-unavailable notice (D-50, VOZ-05/06)

A non-modal banner, not a dialog — it must never block "Siguiente" (VOZ-05/06's "sigue funcionando con normalidad"). Inserted as a new band between the 64px header and the content band, exactly the shape Phase 1's own Forward-Compatibility note anticipated ("a future top-of-screen banner... must be able to appear without pushing the header band's own layout math") — this phase is the first to actually build that band shape, and Phase 4's update-available banner should reuse the same pattern (see Forward-Compatibility below).

```
┌──────────────────────────────────────────────────────┐
│ PREPARACIÓN · 8 de 23         3 jug · Normal  🔇  ≡  │  ← header, 64px, unchanged
├──────────────────────────────────────────────────────┤
│  Sin voz en este dispositivo                      ✕  │  ← NEW band: surface bg,
│  El juego sigue funcionando solo con texto. Si       │     Heading 28/700 title,
│  el dispositivo es Android, revisad Ajustes →        │     Body 20/400 body,
│  Idiomas → Texto a voz — puede faltar el paquete     │     ✕ dismiss (48×48, same
│  de voz en español.                                   │     glyph/box as IndexOverlay)
├──────────────────────────────────────────────────────┤
│                                                        │
│         Apartad las 5 cartas de Archienemigo          │  ← content band, unchanged,
│              fuera de la partida                      │     pushed down only while
│                                                        │     the banner is visible
├──────────────────────────────────────────────────────┤
│   ‹ Atrás              │        SIGUIENTE  ›          │  ← nav band, unchanged, still
└──────────────────────────────────────────────────────┘     fully tappable underneath
```

- **Chrome:** `bg-surface`, `border-b border-background` hairline (same hairline treatment `02-UI-SPEC.md` already used under the index overlay's title bar), `px-2xl py-lg` (48px/24px), `flex items-start justify-between gap-md`. Height is content-driven (auto), not a fixed band like the header/nav — the copy wraps naturally inside the ~900–960px content column, same width constraint as the step content below it.
- **Not a scrim/overlay:** no backdrop, no focus trap, no `role="dialog"`. It's a static content band the user can ignore and keep playing through, or dismiss.
- **Visual hierarchy (unchanged by this band):** "Siguiente" in the nav band remains the primary visual anchor of the screen even while the notice is visible — the banner uses `bg-surface` (no accent, no warning amber, no fill that competes with the accent-filled CTA) precisely so the eye still lands on Siguiente first, then the step content, then the notice. The notice is informational chrome; it never becomes the focal point of a step screen.
- **Appears only on step screens** (same rule as the voice toggle, D-49) — never on the mini-setup, selector, resume prompt, or mesa-lista.
- **Trigger:** shown starting at the first step screen rendered after detection resolves "no compatible Spanish voice" — covers **both** discretion-item cases in one message: `speechSynthesis` not supported at all (`isSupported === false`) and supported-but-no-Spanish-voice-found. Both produce total silence from the user's point of view; a single honest, generic message ("no hay voz," not "your browser doesn't support X") avoids asserting a root cause the app can't reliably distinguish (per `STACK.md`'s own MEDIUM-confidence caveat on `getVoices()` behavior).
- **Persists across step navigation within the session** (Siguiente/Atrás/jumps do not re-trigger or hide it) until the user taps `✕`.
- **Scope of "shown once" (discretion item, resolved): session-only, not persisted to `localStorage`.** Reusing D-46's own reasoning against a persisted "already saw the resume/discard/battery info" flag: this is a narrow, honest, low-cost re-show (once per game session, not once per step) with no state to manage, and if a future session's underlying condition has changed (e.g. the Android voice pack got installed since), the user is not permanently denied a notice that may no longer even apply, nor stuck with a stale one. Keeps `usePersistedSession.ts` untouched by this feature entirely — the voice **preference** is the only new persisted key (D-46), never a "notice dismissed" flag.

### 3. Mini-setup battery line (D-52, UI-07)

```
┌────────────────────────────────────────────────────────┐
│  Marvel Champions — Preparar partida                    │
├────────────────────────────────────────────────────────┤
│  Nº de jugadores          ( 1 )  ( 2 )  ( 3 )  ( 4 )     │
│  Dificultad                ( Normal )   ( Experto )      │
├──────────────────────────────────────────────────────────┤
│                            │   EMPEZAR PREPARACIÓN  ›     │  ← unchanged button, same
│      La pantalla se mantendrá encendida durante la       │     position/style as
│      partida y esto consume más batería.                 │     Phase 1
└────────────────────────────────────────────────────────┘
```

- `MiniSetupScreen`'s footer becomes a two-row `flex flex-col`: the existing CTA row (unchanged: `justify-end`, same button, same style, same position) on top, this caption row directly beneath it.
- Caption: **Body (20px/400), `text-secondary-text`, centered, full width**, `px-lg pb-md` inside the footer. Body/secondary-text (not a new smaller size) is how "discreet" is expressed within a closed 4-size type scale — reused, not invented (same logic Phase 1 used for "400 always signals supporting information").
- **Copy — extends D-52's illustrative quote to literally satisfy UI-07:** CONTEXT.md's D-52 quotes the line as *"La pantalla se mantendrá encendida durante la partida"* — that sentence alone states the wake-lock fact but not explicitly "y que eso consume batería," which UI-07's own wording requires ("El usuario sabe que la pantalla permanecerá encendida **y que eso consume batería**"). This spec keeps D-52's sentence verbatim as its first clause and appends the battery consequence explicitly: **"La pantalla se mantendrá encendida durante la partida y esto consume más batería."** One line, no new persisted "seen" state (D-52), read once at the only moment someone looks closely at the tablet before playing.
- **No icon, no dismiss control, no repeat elsewhere in the app** — exactly D-52's rejection of "aviso descartable" (extra tap + state) and "icono permanente en cabecera" (already carries session context + voice toggle + `≡`).

---

## Component Inventory

Only components with a contract change or a new component this phase. Everything else in `01-UI-SPEC.md`/`02-UI-SPEC.md`'s inventory (`StepScreen`, `NavBand`, `IndexOverlay`, `GameSelectorScreen`, `ResumePrompt`, `ContentChangedNotice`, `MesaListaScreen`, `ConfirmDialog`, `WarningDetailModal`, `OrientationGuardOverlay`) is untouched.

| Component | Change | Props / States |
|-----------|--------|-----------------|
| `AppHeader` | **Extended.** Gains the voice-toggle icon inline in the existing right-zone `<div>` (not a new top-level component — matches the existing pattern where `≡`/`✕` are inline buttons, not extracted components) | New props: `voiceState: 'on' \| 'muted' \| 'unavailable'`. New emit: `voice-toggle: []`. Existing props (`sectionLabel`, `position`, `sessionContext`) and emit (`index-open`) unchanged |
| `VoiceUnavailableNotice` | **New component.** Static copy (no data-driven props needed — the message is the same regardless of which unavailable cause triggered it, see Layout §2) | Props: none. Emit: `dismiss: []` |
| `MiniSetupScreen` | **Extended.** Footer becomes two stacked rows; new row is static copy, not prop-driven | Existing props/emits unchanged; no new prop needed for the caption line |

**Accessible names (icon-only controls, extends Phase 1's existing list):**
- `AppHeader`'s voice toggle: `aria-label` is state-dependent per the table in Layout §1 above (`Silenciar voz` / `Activar voz` / `Voz no disponible en este dispositivo`) — never a static label, since the action it performs (or whether it performs one at all) changes with state.
- `VoiceUnavailableNotice`'s `✕`: `aria-label="Cerrar aviso"` (parallel construction to `IndexOverlay`'s existing `aria-label="Cerrar índice"`).

---

## Interaction & State Coverage

### Voice toggle — tap behavior

- `on` → tap → `muted`: persists the preference immediately (D-46), cuts any speech in progress **instantly**, not after the current sentence finishes (D-45 — "quien silencia lo hace porque justo ahora molesta").
- `muted` → tap → `on`: persists the preference; does not retroactively speak the current step's line (no "resume where it left off" — the next `speak()` call happens at the next natural trigger point: next/prev/jump/resume, per D-42's synchronous-in-gesture-handler rule).
- `unavailable`: native `disabled` button, no tap handler fires, no visual press feedback — same treatment as `MiniSetupScreen`'s disabled CTA and the selector's "Próximamente" card (both already established as non-interactive-and-visually-say-so in Phase 1).

### Speech cutoff — restated as the interaction contract this UI must trigger correctly (behavior fixed by `03-CONTEXT.md` D-42–D-45; recorded here so the checker/executor has one place that states it as a UI-visible contract, not just an engine note)

| Trigger | Cuts in-flight speech? |
|---------|------------------------|
| Siguiente / Atrás / jump-to (index) | Yes, always, before the new step's speech starts (VOZ-04) |
| Silence toggle (`on` → `muted`) | Yes, immediately |
| Tablet hidden/locked (visibility change) | Yes, and must not resume speaking on its own when the tablet returns |
| Opening the index overlay | **No** — the current line is short and finishes on its own |
| Opening the `⚠`/option detail modal | **No** — same reasoning |

### No repeat/replay control (D-44, explicit non-feature)

There is no icon, button, or tap-the-text affordance anywhere in this phase's surfaces to replay a missed line. The on-screen text is the permanent fallback source of truth. Do not add one — this is a deliberate omission, not an oversight (see `03-CONTEXT.md`'s Deferred Ideas for the reconsideration path if it's needed after a real playtest).

### Wake lock — no dedicated failure UI (asymmetry vs. voice, stated explicitly)

Unlike the voice-unavailable notice, **there is no visible indicator if the Wake Lock API is unsupported or fails** (UI-08's "sigue funcionando con normalidad" is satisfied by silent degradation, not by a second notice). This is a deliberate asymmetry: `03-CONTEXT.md` only specifies a notice requirement for voice (D-50/VOZ-05), never for wake lock — the mini-setup battery line (Layout §3) is the *only* wake-lock-related UI surface in this phase, and it is not conditional on wake-lock success or failure; it shows unconditionally, once, regardless of whether the lock will actually succeed on the device.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Voice toggle `aria-label`, state `on` | `Silenciar voz` |
| Voice toggle `aria-label`, state `muted` | `Activar voz` |
| Voice toggle `aria-label`, state `unavailable` | `Voz no disponible en este dispositivo` |
| Voice-unavailable notice heading | `Sin voz en este dispositivo` |
| Voice-unavailable notice body | `El juego sigue funcionando solo con texto. Si el dispositivo es Android, revisad Ajustes → Idiomas → Texto a voz — puede faltar el paquete de voz en español.` |
| Voice-unavailable notice dismiss | `✕` icon only, `aria-label="Cerrar aviso"` — no text button, matches `IndexOverlay`'s existing close pattern |
| Mini-setup battery line | `La pantalla se mantendrá encendida durante la partida y esto consume más batería.` |
| `speech` content register (all 23 setup steps + 4 variant lines, D-38/D-41) | Imperative, plural, present tense, ≤120 chars, no `⚠ × ›` glyphs. Must say the same thing as the step's `text` in fewer words — never the opposite (D-41's exact bug case: a difficulty variant's `speech` must match *that variant's* `text`, not fall back to the base step's `speech` when the variant's meaning diverges) |

**Destructive actions in this phase:** none new. The only destructive action in the whole app remains Phase 1's "Empezar nueva partida."

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none | not applicable — no component registry in use |
| third-party | none | not applicable |

No shadcn/registry tooling was initialized in Phase 1 and this phase does not reopen that decision. The registry vetting gate does not apply.

---

## Decisions Made Without User Input

`03-CONTEXT.md`'s own "Claude's Discretion" section explicitly left these open for research/planning. Listed here for review/override, same format Phase 2 used for its autonomous decisions.

1. **Two hand-drawn inline SVGs (speaker-on / speaker-off), not a Unicode emoji character.** Rejected `🔊`/`🔇` because they render in full-color platform emoji presentation on iPad Safari regardless of CSS `color`, breaking the monochrome icon language every other glyph in the app follows.
2. **Three icon states (`on` / `muted` / `unavailable`), not two.** A binary on/muted toggle would let the user "activate" a voice that structurally cannot speak, with no feedback about why nothing happens. A third, visually distinct, non-interactive state — reusing the app's existing disabled-CTA/coming-soon-card convention verbatim — answers "why is it silent" without inventing new visual language.
3. **`unavailable` covers both `isSupported === false` and "no Spanish voice found."** One honest, generic message rather than two differently-worded notices for a distinction the app cannot reliably detect (per `STACK.md`'s own MEDIUM-confidence flag on `getVoices()` behavior across browsers).
4. **Voice-unavailable notice is a non-modal banner, not a dialog.** A blocking `role="dialog"` would contradict VOZ-05/06's own "sigue funcionando con normalidad" — the whole point of the notice is that it must not get in the way of the one button the app protects most (Siguiente).
5. **Notice dismissal is session-only, never persisted to `localStorage`.** Mirrors D-46/D-52's existing minimal-state philosophy; avoids a stale "already saw it" flag surviving past whatever fixed (or newly broke) the underlying condition.
6. **Notice never uses the Warning (`#FFB020`) color**, even though it is conceptually a warning. Preserves Phase 1's app-wide reservation that amber means exactly one thing: "this step has a `⚠` trap."
7. **Mini-setup battery line's copy extends D-52's quoted sentence to explicitly name battery consumption**, because D-52's own quoted string doesn't literally say "batería" and UI-07's requirement text does. The addition is a minimal clause appended to the existing sentence, not a rewrite.
8. **Voice toggle order in the header: sessionContext → voice toggle → `≡`.** Keeps the newest control closest to the middle of the zone and the most-frequently-tapped existing control (`≡`) at the fixed far-right edge users already know, per Phase 1's D-11 header-stability contract.
9. **Default icon state before detection resolves is `on` (optimistic), never a loading/pulsing state.** Matches D-47's "voice on by default" and avoids a third transient visual state that would flicker on every page load.

---

## Forward-Compatibility Notes

- **Phase 4 (OFF-04, update-available banner):** the voice-unavailable notice (Layout §2) is the first real implementation of the "extra band between header and content, without disturbing the header's own layout math" pattern Phase 1's own Forward-Compatibility note anticipated. Phase 4's "nueva versión disponible" banner should reuse this exact shape (surface bg, hairline border, `✕`-only dismiss, non-modal, session-scoped visibility) rather than inventing a new banner pattern.
- **v2 AUDIO-01/AUDIO-02 (pregenerated audio, voice picker):** out of scope, and this phase's `VoiceUnavailableNotice` and voice-toggle contract are both scoped tightly to "the browser's own Web Speech API, `es-ES`, no picker" — if a future phase adds alternate audio sources, expect a new decision point on this contract, not a silent extension of it.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
