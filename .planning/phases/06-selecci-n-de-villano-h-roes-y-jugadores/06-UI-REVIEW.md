> **NOTA DEL ORQUESTADOR (2026-09-08, run autónomo):** los tres warnings de
> prioridad quedaron ARREGLADOS en el mismo run, justo después de esta auditoría:
> (1) ambos modales pasan de `max-h-[80vh]` a `max-h-[80dvh]` — unidad ya usada en
> cuatro pantallas del proyecto, y que sí se encoge con el teclado en pantalla;
> **sigue pendiente confirmarlo en la tablet real**, la mitigación no es la prueba.
> (2) la copia del estado «sin catálogo» (IN-02) ya está en el Copywriting Contract
> y en las enmiendas de `06-UI-SPEC.md`. (3) las filas de héroe y de villano llevan
> `aria-label` que enuncia el `✓` y el `ya:`.

# Phase 6 — UI Review

**Audited:** 2026-09-08
**Baseline:** `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-UI-SPEC.md` (status: approved, with post-approval amendments IN-01/WR-01), inheriting `01-UI-SPEC.md` and `02-UI-SPEC.md` as the design system of record.
**Screenshots:** not captured — no dev server detected on :3000, :5173, or :8080 at audit time. This is a **code-only audit** (Tailwind class-list diff against the spec's literal snippets, state-coverage grep, token-source grep). Real-device/visual confirmation is still outstanding (see Known Gaps).

Files audited: `app/components/VillainPickerModal.vue`, `app/components/PlayerModal.vue`, `app/components/StepScreen.vue`, `app/pages/[game]/index.vue`, plus the pure-logic module they depend on (`app/composables/useHeroSearch.ts`), `app/composables/useStepShortcuts.ts`, `app/assets/css/main.css` (token source), and `app/components/WarningDetailModal.vue` / `app/components/IndexOverlay.vue` (precedent comparison).

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | All spec-mandated strings match verbatim, join-formula logic is correct for every documented case — but `PlayerModal.vue`'s "no catalogue" empty-state string was added post-approval (`06-REVIEW.md` IN-02) and never folded into `06-UI-SPEC.md`'s Copywriting Contract or its Amendments section, unlike IN-01/WR-01 which were. |
| 2. Visuals | 4/4 | D-04's focal point is intact (Display sentence never conditionally shrinks), icon-only close buttons carry `aria-label`, villano/jugador row uniformity matches the approved mockup and its own documented discretion note. No defects found. |
| 3. Color | 4/4 | Zero hardcoded hex/rgb in any of the four files; the load-bearing rule (`ya:` marker = Secondary text, never Warning) is honored exactly at `PlayerModal.vue:194`; Warning stays reserved for the one `⚠` line at `StepScreen.vue:94`. |
| 4. Typography | 4/4 | Only the 4 inherited sizes / 2 inherited weights appear; no new size/weight introduced; D-04's "Display never shrinks" is structurally true (unconditional class, no step-specific override). |
| 5. Spacing | 4/4 | 100% named-token spacing (`px-md`, `gap-sm`, etc.) — zero raw Tailwind numeric spacing utilities in any of the four files. Every interactive row/input/button is `min-h-12` or `w-12 h-12`/`h-16`, meeting the 48px floor. |
| 6. Experience Design | 3/4 | State coverage is unusually rigorous (D-12 double-guarded, D-13 instant save-and-close, D-16/D-32 non-clickable warning, defensive `null` fallback for a manipulated/stale `heroId`) — but `PlayerModal`'s Nombre/Héroe inputs sit in a non-scrolling zone of a `fixed inset-0` + `max-h-[80vh]`, vertically-centered panel with no `visualViewport` handling, which is a real (if explicitly deferred) risk to the single most-used text field in this phase once a tablet's on-screen keyboard is actually open. |

**Overall: 22/24**

---

## Top 3 Priority Fixes

1. **On-screen keyboard can push/overlap `PlayerModal`'s Nombre field on a real tablet** — user impact: typing a player's name is this phase's single most-used text interaction; if the virtual keyboard shrinks the visual viewport without the `fixed inset-0 … items-center` panel responding (no `visualViewport` resize listener, no `100dvh`/`svh` unit, only `max-h-[80vh]`), the focused input can end up partially hidden or the panel can jump unpredictably. **Concrete fix:** either swap `max-h-[80vh]` for `max-h-[80svh]` (small-viewport-height unit, auto-shrinks with the keyboard on modern mobile browsers, zero JS) or add a `visualViewport.resize` listener that reduces the panel's max-height while a modal with a text input is open. Verify on the actual group tablet per the outstanding device-verification debt.
   `app/components/PlayerModal.vue:83-141`

2. **`PlayerModal`'s "no catalogue" empty-state copy was never added to the approved `06-UI-SPEC.md` Copywriting Contract** — user impact: none today (Marvel Champions always ships 23 heroes, so the string is unreachable), but process impact is real: the design contract is the single source of truth this project's own convention relies on (see how carefully IN-01/WR-01 were folded back in), and this string is a silent gap in it. A future editor of `06-UI-SPEC.md` or a Phase-7+ planner reading only the contract would never learn this string exists. **Concrete fix:** add a row to the Copywriting Contract table (`Ningún héroe en el catálogo | "Este juego todavía no tiene catálogo de héroes"`) and a third bullet (IN-02) to the "Amendments after approval" section, matching the treatment IN-01/WR-01 already got.
   `app/components/PlayerModal.vue:162-167`, `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-UI-SPEC.md:642-652`

3. **Hero rows inside `PlayerModal` carry no accessible name distinct from their visible text** — user impact: a screen-reader user hears the row's raw DOM text order — Spanish name, then (conditionally) "✓", then (conditionally) "ya: {nombre}", then the catalogue-name/alter-ego line — which reads as a run-on, glyph-first announcement ("Avispa, check mark, ya: Ana, Wasp, punto medio, Janet van Dyne") with no indication of what "✓" or "ya:" mean structurally. The spec already solved this exact problem for the outer grid rows (`aria-label="Elegir héroe y nombre de {rowLabel}"`, decision #14) but didn't extend it to the modal's internal hero rows. **Concrete fix (should-fix, not contract-mandated):** add `:aria-label="hero.spanishName + (hero.id === selectedHeroId ? ', tu elección actual' : '') + (takenBy[hero.id] ? ', ya elegido por ' + takenBy[hero.id] : '')"` or similar, reusing the same accessible-naming discipline already applied one level up.
   `app/components/PlayerModal.vue:175-201`

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Verified matches (no findings needed, listed for completeness of adversarial diligence):**
- `ELECCIÓN`, `Villano`, `Jugador {n}`, `—`, `VILLANO`, `JUGADOR {n}`, `Sin elegir`, `Buscar héroe…`, `Nombre`, `Héroe` — all present verbatim (`StepScreen.vue:70,81`; `VillainPickerModal.vue:61,83`; `PlayerModal.vue:93,109,130,136,151`).
- `ya: {nombre}` join formula (`useHeroSearch.ts:129-136`, `joinNames`) correctly produces `A` / `A y B` / `A, B y C` for 1/2/3+ names, matching the spec's Copywriting Contract table exactly.
- Duplicate-hero `⚠` line (`useHeroSearch.ts:169-206`, `buildDuplicateWarningText`) correctly branches all four documented cases: single pair (`{A} y {B} llevan el mismo héroe`), single trio, the special-cased "Los 4 jugadores llevan el mismo héroe" (checked against `slots.length === 4`, so it does **not** misfire for a 3-of-3 share), and the two-separate-pairs case (`Héroes repetidos: {A y B} · {C y D}`). Verified by tracing the branch logic line-by-line — this is the one piece of copy logic complex enough to plausibly have an off-by-one, and it doesn't.
- Empty-filter message `Ningún héroe coincide con «{query}»` (`PlayerModal.vue:172`) matches the contract exactly, including the guillemets.

**Finding — spec drift (WARNING):** `PlayerModal.vue:162-167` renders `Este juego todavía no tiene catálogo de héroes` when `heroes.length === 0`. This string does not appear anywhere in `06-UI-SPEC.md`'s Copywriting Contract table, nor in its "Amendments after approval" section — even though `06-REVIEW.md` explicitly logs it as finding IN-02, marked `[FIXED 2026-09-08]`, the **same day** the spec's own two other amendments (IN-01, WR-01) were folded back into the contract. This is a real, if currently unreachable, gap between "what the approved contract says exists" and "what the code renders." Not a generic-copy defect (the string itself is fine, specific, and correctly scoped to a not-yet-built second game) — purely a governance/traceability gap. See Top 3 Fix #2.

### Pillar 2: Visuals (4/4)

- D-04 verified structurally, not just visually: `StepScreen.vue:57` renders `actionText` at `text-display font-bold text-primary-text` with **no conditional class binding** — there is no code path by which this step's action sentence could shrink, confirming the contract's hardest rule is enforced by the absence of an escape hatch, not just by convention.
- Both new modals' `✕` close buttons carry explicit `aria-label` (`"Cerrar selector de villano"` at `VillainPickerModal.vue:67`; `` `Cerrar jugador ${slotNumber}` `` at `PlayerModal.vue:99`) — the one icon-only, unlabeled-by-text button type this phase introduces is covered both times.
- Villano/jugador row visual identity: confirmed **intentionally** identical per the spec's own "Decisions Made Without User Input" #2 and the approved mockup — checked the code for any accidental divergence (icon, extra border, different chevron) and found none; this is compliance, not an oversight.
- Hero row's two-line, color-only dominant/secondary distinction (`PlayerModal.vue:182-200`) matches the spec's stated rule ("role is set by color, not size/weight") exactly — both lines are `text-body font-normal`, differentiated only by `text-primary-text` vs `text-secondary-text`.

### Pillar 3: Color (4/4)

- `grep` for `#[0-9a-fA-F]{3,8}|rgb(` across all four files returned zero matches — no hardcoded color anywhere in this phase's surfaces.
- Confirmed the single most load-bearing color rule in the entire spec: the `ya: {nombre}` marker at `PlayerModal.vue:194` is `text-secondary-text`, never `text-warning` — verified by grepping every use of `warning` in the three template files and confirming it appears exactly where the spec allows it (`StepScreen.vue:94,118,123,129,131,136` — all pre-existing or the one new duplicate-hero line) and nowhere near the `ya:` marker.
- Accent (`text-accent`/`border-accent`/`focus:border-accent`) usage counts: `VillainPickerModal.vue` 2, `PlayerModal.vue` 4, `StepScreen.vue` 5 — all on the exact reserved roles (chevron, `✓` current-pick, focus ring), none decorative/invented. No 60/30/10 violation: this phase adds no new accent surface area, only new instances of the same three pre-approved uses.
- Token source (`app/assets/css/main.css:14-45`) confirmed unchanged from Phase 1 — all five color roles, spacing scale, and type scale are defined once and referenced by name everywhere audited; no phase-6-local redefinition.

### Pillar 4: Typography (4/4)

- Font-size classes found across the four files: `text-display` (1), `text-heading` (4), `text-body` (18), `text-label` (4) — exactly the four contracted sizes, no `text-xs/sm/lg/xl/2xl…` Tailwind-default size anywhere.
- Font-weight classes found: `font-bold` (7), `font-normal` (18) — exactly the two contracted weights.
- Hero row's two lines (`PlayerModal.vue:183,198`) are both `text-body font-normal`, confirming the "differentiate by color only" rule is followed at the class level, not just visually.

### Pillar 5: Spacing (4/4)

- `grep` for raw Tailwind numeric spacing utilities (`p-4`, `gap-2`, `mx-1`, etc.) across all four files returned zero matches — every spacing value is a named token (`px-md`, `py-sm`, `gap-xs`, `gap-sm`, `gap-md`, `gap-lg`, `px-lg`, `px-xl`).
- Arbitrary bracket values present are exactly the ones the spec calls for by name and nothing else: `max-w-[640px]` (both new modal panels, matches `WarningDetailModal` precedent), `max-h-[80vh]` (both new modal panels, spec's new-this-phase exception), `max-w-[720px]` (the selection grid's row block, spec's explicit width), `max-w-[960px]` (StepScreen's outer content column, inherited from Phase 1 unchanged). No undocumented arbitrary value found.
- Touch targets: every row button is `min-h-12` (48px floor, `StepScreen.vue:77`; `VillainPickerModal.vue:80,91`; `PlayerModal.vue:117,138,148,179`); both modals' close buttons are `w-12 h-12` (48×48, `VillainPickerModal.vue:66`; `PlayerModal.vue:98`); both modals' title bars are `h-16` (64px, exceeding the floor). No sub-48px interactive element found in any of the four files.

### Pillar 6: Experience Design (3/4)

**Strong, verified state coverage:**
- D-03/D-09 "no gate": confirmed `StepScreen.vue`'s selection grid renders unconditionally with `—` placeholders and never disables/hides `SIGUIENTE` — no code path ties `selectionRows` to the nav band's disabled state.
- D-12 keyboard-shortcut suppression: traced end-to-end. `index.vue:573` feeds `hasActiveDetail: activeDetail.value !== null || activeSelectionModal.value !== null` into the pure `shortcutsEnabled()` (`useStepShortcuts.ts:96-108`), which is itself double-guarded by `isEditableTarget` inside `resolveShortcutAction` (`useStepShortcuts.ts:68-87`, returns `null` for any `INPUT`/`TEXTAREA`/`SELECT`/contenteditable target before ever reaching the key map). Typing "Bruno" into the Nombre field is protected twice over, exactly as the spec's D-12 section demands — verified, not assumed.
- D-13 instant-save-and-close: `onSelectVillain`/`onSelectHero` (`index.vue:328-337`) commit then immediately call `onDismissSelectionModal()`; `onPlayerNameInput` (`index.vue:341-344`) saves on every keystroke and **never** calls dismiss — the asymmetry the spec requires (name saves without closing, hero pick saves and closes) is implemented correctly, not conflated.
- Defensive rendering (D-20's spirit, extended): `findHeroOption`/`findVillainOption` (`useHeroSearch.ts:108-116`) return `null` for any `heroId`/`villainId` not present in the current catalogue — a stale or hand-edited `localStorage` value degrades to `—` instead of crashing or showing `undefined`.
- Empty states: catalogue-empty and filter-empty are correctly distinguished (IN-02, see Copywriting) even though only one is reachable today.

**Finding — real (deferred) risk (WARNING):** `PlayerModal.vue:79-141` — the modal's scrim (`fixed inset-0 … flex items-center justify-center`) centers a panel capped at `max-h-[80vh]`, and the Nombre/Héroe text inputs live in the panel's *fixed, non-scrolling* header zone (`PlayerModal.vue:106-141`), not inside the `flex-1 overflow-y-auto` region the spec's own "On-screen keyboard behavior" note relies on for native scroll-into-view. `vh` units and `position: fixed` do not respond to a mobile browser's visual-viewport shrink when the software keyboard opens — only `overflow-y-auto` content inside a container sized by `dvh`/`svh` (or explicit `visualViewport` JS) does. Since the spec explicitly flags this as "unverified on a real tablet (viewport-simulated only)," this is not a fresh defect introduced by the implementation — the implementation matches the contract precisely — but it is a genuine, concrete risk to the phase's single most-typed field, worth surfacing by name rather than folding into the general device-verification debt. See Top 3 Fix #1.

**Minor / nice-to-have:** the "two separate duplicate pairs" warning string (`Héroes repetidos: {A y B} · {C y D}`, only reachable at 4 players) has no authored character budget (correctly, per spec — it's computed, not authored) but in the worst case (four 14-character names) can run to ~80+ characters on one `<p>` with no `truncate`/`whitespace-nowrap`. It will wrap correctly (no overflow bug), but is worth a visual check once real content/names exist, since it's the single longest string this phase can ever render.

---

## Answers to the Audit's Specific Questions

1. **Does the implementation match the approved spec's exact class lists?** Yes, near-verbatim everywhere checked. The only differences found are *additive*, not *substitutive*: rows in both new modals and the grid carry `transition-transform duration-75 active:brightness-95` in addition to the spec's illustrative class-list snippets — this is the app-wide tap-feedback convention the spec's prose (not its code snippets) explicitly requires elsewhere ("Same immediate pressed-state feedback … as every other tappable element"), so it's a correct application of a rule stated outside the literal snippet, not a deviation. No regression-class divergence found.

2. **D-04 — is the action text still `text-display`, unshrunk, with the grid below it?** Yes, confirmed structurally at `StepScreen.vue:57` — no conditional binding exists that could shrink it, and the selection grid (`StepScreen.vue:68-97`) renders in a sibling block directly below it in DOM order, matching the mockup.

3. **D-16/D-32 — is the repeated-hero `⚠` genuinely non-interactive?** Yes. `StepScreen.vue:94-96` is a plain `<p>`, not a `<button>`; no `border`, no chevron span, no `@click` handler, no `cursor-pointer` class. Contrast with the two other warning treatments in the same file (`StepScreen.vue:115-125`, `128-135`) which correctly *do* become `<button>`s with borders/chevrons/click-handlers when a detail exists — confirming the file's own internal convention is applied consistently, not just present by coincidence in this one spot.

4. **Touch targets.** All ≥48px — see Pillar 5 findings above. No violation found in any of the four files.

5. **The `ya: {nombre}` marker — informative, not disabled?** Confirmed Secondary-text color (`PlayerModal.vue:194`, never `text-warning`), and the enclosing `<button>` (`PlayerModal.vue:175-201`) has no `disabled` attribute and no opacity-reduction class — the row is exactly as tappable as any other hero row, matching D-16's "sigue siendo elegible."

6. **Theme/contrast.** All color usage traced to the five `@theme` roles in `app/assets/css/main.css:16-23`; no new hex introduced. Per the spec's own carried-forward contrast math (Primary-on-Surface 14.5:1, Secondary-on-Background 6.9:1, Warning-on-Background 9.9:1), and given no new pairing was introduced this phase, no new contrast computation was needed and none was invented — correct restraint.

7. **Modals' scroll and keyboard behavior.** See Pillar 6 finding above — structurally matches the spec exactly, but the spec's own chosen approach (`max-h-[80vh]`, no `visualViewport` handling) carries a real, still-unverified risk for the Nombre/Héroe fields specifically, since they sit outside the scrollable zone. Flagged as Top 3 Fix #1, not scored as a fresh code defect since the code faithfully implements what the approved contract asked for.

---

## Known Gaps (not scored, not findings — carried forward per audit scope)

- No component-level unit tests exist for `VillainPickerModal.vue`/`PlayerModal.vue` (no jsdom environment configured) — explicitly out of scope per `06-07-PLAN.md`, covered by human verification instead.
- Spanish hero alias values (`app/data/spanish-hero-aliases.ts`) are unverified against the physical cards pending human review (D-07) — not a UI defect.
- No orientation lock — accepted per Phase 4's D-08.
- Real-device verification on the group's actual tablet (model/OS still unknown) remains outstanding debt from v1.7; all findings above were produced against a simulated viewport, not physical hardware.

---

## Registry Safety

`components.json` not present — no shadcn/component-registry tooling initialized in this project. Registry Safety audit does not apply; skipped per the audit's own gating rule.

---

## Files Audited

- `app/components/VillainPickerModal.vue`
- `app/components/PlayerModal.vue`
- `app/components/StepScreen.vue`
- `app/pages/[game]/index.vue`
- `app/composables/useHeroSearch.ts` (pure logic backing both modals' sort/filter/join/warning text)
- `app/composables/useStepShortcuts.ts` (D-12 shortcut-suppression contract)
- `app/assets/css/main.css` (color/spacing/type token source)
- `app/components/WarningDetailModal.vue`, `app/components/IndexOverlay.vue` (precedent comparison for scrim/title-bar/divider reuse)
- `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-UI-SPEC.md`
- `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-CONTEXT.md`
- `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-REVIEW.md`
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-UI-SPEC.md`
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-UI-SPEC.md` (referenced for `WarningDetailModal`/D-32 precedent)
