---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
verified: 2026-09-08T23:12:16Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Durante la partida hay una banda fija con «Vida villano» y un contador por jugador, ajustable solo con ▲/▼, fácil de tocar (criterio de éxito nº 2; HP-03, HP-04, HP-10) — CR-01 (celdas que se solapaban y robaban el toque de su vecina a 3-4 jugadores por debajo de ~760px) queda cerrado."
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 7: Banda de contadores y compatibilidad de sesión Verification Report

**Phase Goal:** Durante la partida hay una banda de contadores de vida siempre visible y fácil de tocar, precargada con los valores correctos, dentro de un presupuesto de altura decidido antes de construirla — y la sesión ampliada con selección y contadores convive sin corromperse con las partidas que la versión de v1.7 ya desplegada tiene guardadas ahora mismo en una tablet real.

**Verified:** 2026-09-08T23:12:16Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 07-08, 07-09, 07-10, 07-11)

## Goal Achievement

### Observable Truths (ROADMAP §Phase 7 success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Presupuesto de altura de la banda (≤~15%) medido contra el viewport objetivo ANTES de construir el componente; nunca reduce el texto grande del paso | ✓ VERIFIED (unchanged from previous pass) | `git log --diff-filter=A` confirms `e2e/counter-band-height.spec.ts` (commit `48b15ae`, plan 07-01) predates `app/components/CounterBand.vue` (commit `e54dba3`, plan 07-05) — the budget test genuinely predates the component. 96px/768px = 12.5%, re-measured by re-running the spec myself; `main p.text-display` stays 40px. D-06 (`07-CONTEXT.md`) explicitly scopes the ~15% ceiling to landscape only, per instructions. |
| 2 | Banda fija con «Vida villano» + un contador por jugador, ajustable **solo** con ▲/▼, precargada correctamente y fácil de tocar (HP-03, HP-04, HP-05, HP-10) | ✓ VERIFIED — **previous BLOCKER (CR-01) now closed** | Read `app/components/CounterBand.vue` directly: arrow buttons are `flex-1 min-w-0` (no 44px floor), value span is `min-w-12 sm:min-w-16 shrink-0`, cell has `overflow-hidden` — the 152px-irreducible-row defect from the last verification is gone. Independently re-ran `e2e/counter-band-overlap.spec.ts` myself (not trusting SUMMARY/REVIEW): 7/7 pass, including the exact 412×915/4-player end-to-end reproduction from the previous VERIFICATION.md ("▲ de Jugador 1 sube solo Jugador 1" / "▲ de Jugador 4 ... sube solo Jugador 4"). Human verification (07-11) confirmed usability at 1024×768, 412×915 and 700×800 with 4 players, with an explicit judgment on the narrow arrows ("Sí, se aciertan bien") — properly scoped this time, distinguished from the free-text approval per the transcript in `07-11-SUMMARY.md`. |
| 3 | Un contador de héroe a 0 se marca derrotado sin bajar de 0, sin terminar partida ni abrir diálogo, y puede volver a subir | ✓ VERIFIED (unchanged) | `useGameSession.ts:71` (`defeated = health === 0`), villain cell hardcoded `defeated: false` even at 0 (D-11, line 63). `decrementHero`/`decrementVillain` in `engine/counters.ts` no-op at 0 (`if (base === 0) return session`). `e2e/counter-band-behavior.spec.ts` passed in my own full-suite run. |
| 4 | Recargar a mitad de partida conserva el valor exacto; ▲/▼ nunca avanza el paso ni cambia Espacio/Enter/← | ✓ VERIFIED (unchanged, and now more robust) | All four mutators in `engine/counters.ts` reassign fresh objects at every level (D-20). `useStepShortcuts.ts`'s `isEditableTarget` returns `true` for `BUTTON`, so Space/Enter never double-fire the arrows — and since plan 07-10 additionally added `tabindex="-1"` to both arrows (WR-03 closure), they can no longer even receive keyboard focus, which strengthens this guarantee rather than weakening it. Reload/persistence e2e passed in my own run. |
| 5 | Partida guardada por v1.7 desplegada se reanuda sin corromperse; interfaz nueva se renderiza defensiva sin los campos nuevos | ✓ VERIFIED (unchanged) | `engine/persistence.ts` confirmed untouched since phase 1 (`git log` shows only phase-1 commits). `engine/__tests__/persistence.test.ts`'s `describe('D-21: resume() de una sesión persistida con forma de v1.7...')` block resumes a `context` with no `selection`/`counters` fields at all and asserts `resolveCounters`/`resolveCounterValues` return `{villainHealth: null, heroHealth: [null,null,null]}` — never `undefined`/`NaN`, never throws. A second test in the same block resumes a hand-corrupted `counters` object and asserts normalization without throwing. Both pass in my own re-run (73/73 in `counters.test.ts` + `persistence.test.ts`). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `engine/types.ts` | `CounterState`, `SessionContext.counters?` | ✓ VERIFIED | Present, optional, additive |
| `engine/counters.ts` | precarga + 4 mutadores puros | ✓ VERIFIED (substantive), WIRED — see WARNING below | `resolveHeroHealthLength` now the single source of array length (WR-05 closed: traced all four mutators with `playerCount` ∈ {2.5, NaN, '3', null} plus frozen `heroHealth`; no path discards frozen values or produces NaN). **New WARNING found on direct code read** (not from SUMMARY): `computeInitialVillainHealth` (line 39) has a `Number.isFinite(figures.health)` guard but its twin `computeInitialHeroHealth` (lines 44-46) has none — confirmed by reading both functions myself. See "Assessment of flagged review findings" below. |
| `app/components/CounterBand.vue` | banda pintada, celdas sin solapamiento, feedback pulsado | ✓ VERIFIED, WIRED — **CR-01 confirmed fixed by direct code read** | `overflow-hidden` (line ~103), `min-w-0` on both arrow buttons (no fixed 44px floor), `min-w-12 sm:min-w-16 shrink-0` on the value span, `tabindex="-1"` on both arrows, four-path press reset (`mouseup`/`mouseleave`/`blur`/`touchcancel`), separator keyed off a continuous `globalIndex` rather than `:first-child`. All confirmed by reading the current file, not the SUMMARY narrative. |
| `e2e/counter-band-overlap.spec.ts` | horizontal-fit + pairwise-non-overlap + hit-test matrix (5 viewports × 4 player counts) | ✓ VERIFIED, WIRED | Independently re-ran: 7/7 pass. This is the exact missing coverage the previous VERIFICATION.md's "missing" list called for. |
| `e2e/counter-band-height.spec.ts` / `counter-band-behavior.spec.ts` | height + behavior E2E | ✓ VERIFIED | Passed in full-suite re-run (34/34 e2e total) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/pages/[game]/index.vue` | `CounterBand.vue` | `v-if="showsCounterBand"` + `:cells` + `@increment`/`@decrement` | ✓ WIRED | Confirmed by grep and passing e2e |
| `engine/counters.ts` | `engine/selection.ts` | `resolvePlayerSlots`/`resolveVillainId` reuse | ✓ WIRED | Confirmed by import + read |
| `app/composables/useStepShortcuts.ts` | its test | `isEditableTarget(BUTTON) -> true`, D-17 comment | ✓ WIRED | Confirmed present, unchanged |

### Data-Flow Trace (Level 4)

`CounterBand.vue`'s `cells` prop is populated by `buildCounterCells` in `useGameSession.ts`, which reads `resolveCounterValues(session.context, catalogue)` — a real computed chain from persisted/live catalogue data. ✓ FLOWING. Unchanged from previous pass; the CR-01 fix was purely a geometry/hit-testing fix, not a data-flow change, and this was re-confirmed by re-reading the chain.

### Behavioral Spot-Checks / Independent Re-Reproduction

Re-ran (myself, not from SUMMARY/REVIEW claims) the exact reproduction steps documented as broken in the previous `07-VERIFICATION.md`:

```
npx vitest run                              → 537/537 passed, 21 files (matches orchestrator's reported figure exactly)
npx playwright test                          → 34/34 passed (matches orchestrator's reported figure exactly)
npx playwright test e2e/counter-band-overlap.spec.ts  → 7/7 passed in isolation
```

Also independently stress-tested the WR-08 finding from `07-REVIEW.md` (the claim that `band.boundingBox()` in the overlap spec is a discarded, non-waiting "settle" step that could let assertions pass vacuously on stale geometry). I wrote a standalone throwaway Playwright test that resizes the viewport to 412×915 with **zero wait at all** (more aggressive than the shipped spec, which at least calls `boundingBox()` once) and compared immediate vs. 500ms-delayed measurements of the real `CounterBand.vue` in the live app: `scrollWidth`, `clientWidth` and `getBoundingClientRect().height` were byte-identical between the immediate and delayed reads (192px height, 412px width, both times). This confirms that in this codebase/Playwright-Chromium combination, `page.setViewportSize()` fully applies (CSS media queries reflowed) before it resolves, and DOM geometry reads (`getBoundingClientRect`, `scrollWidth`) force synchronous layout regardless. **The review's WR-08 finding is a legitimate code-quality/comment-accuracy nitpick (the comment overclaims what `boundingBox()` does, and the matrix design does reduce diagnostic granularity across viewports on a single failing assertion) but does NOT appear to produce a false pass in practice** — downgraded from "undermines the evidence behind criteria 2 and the CR-01 closure" (as the task's verification_context asked me to assess) to a confirmed-but-non-blocking test-hygiene WARNING.

### Assessment of flagged review findings (per verification_context instructions)

**1. WR-07/asymmetric NaN guard (`computeInitialVillainHealth` guarded, `computeInitialHeroHealth` not) — judged HALF-SATISFIED, not a blocker.**

Confirmed by direct read of `engine/counters.ts:24-46`: the villain path has `if (!Number.isFinite(figures.health)) return null`; the hero path (`computeInitialHeroHealth`) returns `hero.health` raw, no guard. Traced the consequence myself: `useGameSession.ts:67` does `values.heroHealth[i] ?? null`, and `NaN ?? null` evaluates to `NaN` (confirmed: only `undefined`/`null` trigger `??`'s fallback), so `displayValue` at line 76 (`health === null ? '—' : String(health)`) would render the literal string `"NaN"` if a NaN ever reached that array position.

**Plainly: 07-09's stated must_have truth ("una entrada de catálogo sin `health` utilizable devuelve `null` ... la banda nunca puede pintar «NaN»") is satisfied for the villain path and NOT satisfied for the symmetric hero path — it is a half-implemented fix, not a fully-closed one.** However, I independently confirmed the reachability claim: `engine/catalogueSchema.ts:46/53/63` declares `health: z.number().int().positive()`, and `engine/__tests__/characters.test.ts` runs `validateCharacterCatalogue` against the real, statically-imported `content/marvel-characters.json` in CI. So today, with the current catalogue and current CI gate, a bad `hero.health` cannot reach a real user. **Verdict: this is a real, correctly-diagnosed contract-consistency defect (WARNING), not a currently-reachable bug, and does not fail phase 07's observable truth #2 as currently deployed.** It should be fixed (one line, mirroring the existing villain guard) but does not block phase closure.

**2. No arrow-width floor asserted below 1024×768 — confirmed accurate, judged WARNING not blocker.**

Confirmed by reading `e2e/counter-band-overlap.spec.ts:279-291`: the only width-floor assertion (`toBeGreaterThanOrEqual(44)`) is scoped to a `test.describe` block hard-locked to `{ width: 1024, height: 768 }`. The matrix at the other four viewports collects `width` in `collectButtonRects` but never asserts a floor on it. This is real and matches the review's finding exactly. Per the locked decisions (D-02: no width floor below 760px is the accepted trade-off that closed CR-01) this is not a regression of a locked decision, but the review is correct that nothing today would catch an arrow shrinking to 0px width at the narrow viewports — the existing containment/non-overlap/hit-test assertions would pass vacuously in that specific degenerate case. This is a legitimate WARNING for a follow-up plan (add a `MIN_ARROW_WIDTH` floor per viewport, as the review proposes), not a blocker for this phase: the human verification explicitly confirmed the narrow arrows are usable today ("Sí, se aciertan bien"), so the currently-shipped geometry is fine — the gap is in the automated regression guard, not in the current behavior.

**3. `band.boundingBox()` "settle" step discards its result without polling — assessed empirically above and downgraded from "undermines the evidence" to a confirmed-but-non-impactful test-hygiene WARNING.**

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| HP-01 | 07-04/05/07 | Banda fija y siempre visible durante la partida | ✓ SATISFIED | `showsCounterBand` derived from `sectionRepeats === true`; e2e passes |
| HP-02 | 07-01/06/07 | Presupuesto ≤~15%, medido antes de implementar | ✓ SATISFIED | 96px/768px = 12.5%, measured pre- and post-build; sequencing confirmed via `git log` |
| HP-03 | 07-04/05/08/10/11 | Contador «Vida villano» + uno por jugador | ✓ SATISFIED | CR-01 closed; matrix + human sign-off confirm per-player counters are correctly targetable |
| HP-04 | 07-02/05/06/07/08/11 | Ajuste solo con ▲/▼, sin teclado | ✓ SATISFIED | Mechanism correct + CR-01 (which cell receives the tap) now closed; `tabindex="-1"` added |
| HP-05 | 07-02/04/09 | Precarga correcta según villano/héroe/nº jugadores | ✓ SATISFIED (with WARNING) | `computeInitialVillainHealth`/`computeInitialHeroHealth`; e2e passes. Asymmetric NaN guard is a real but unreachable-today defense-in-depth gap — see assessment above |
| HP-06 | 07-02/04/06 | Contador a 0 marca derrotado, no termina partida | ✓ SATISFIED | Code + e2e confirmed |
| HP-07 | 07-02/04/06 | Derrotado puede volver a subir | ✓ SATISFIED | Code + e2e confirmed |
| HP-08 | 07-02/05/06/09 | Persistencia tras recarga | ✓ SATISFIED | D-20 reassignment discipline in all 4 mutators; reload e2e passes; WR-05 (localStorage tampering edge case) now closed |
| HP-09 | 07-03/06 | ▲/▼ nunca avanza el paso; atajos igual que v1.7 | ✓ SATISFIED | D-17 comment + `isEditableTarget` test; arrows now also out of tab order (`tabindex="-1"`), strengthening this guarantee |
| HP-10 | 07-05/06/07/08/10/11 | Legible y accionable a un brazo de distancia | ✓ SATISFIED | CR-01 closed; human verification explicitly re-scoped and re-confirmed at 1024×768, 412×915, 700×800 with 4 players, including explicit judgment on narrow-arrow usability |
| COMP-01 | 07-01/03 | Campos nuevos no corrompen partida v1.7 | ✓ SATISFIED | D-21 test block; `formatVersion` unchanged; `engine/persistence.ts` untouched since phase 1 |
| COMP-02 | 07-03 | Renderizado defensivo sin campos nuevos | ✓ SATISFIED | `resolveCounters` validates by type not presence; D-21 test covers missing-field case explicitly |

All 12 requirement IDs declared across the 11 plans are accounted for; none orphaned. `.planning/REQUIREMENTS.md` checkboxes (`HP-01..10`, `COMP-01`, `COMP-02`) and the Phase 7 traceability rows now correctly read `[x]`/`Satisfecho` — verified by direct grep, not by trusting the SUMMARY claim, and each row's evidence citation was spot-checked above. This corrects the previous verification's "documentation note" (stale ledger).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `engine/counters.ts` | 44-46 | `computeInitialHeroHealth` has no `Number.isFinite` guard while its villain twin does | ⚠️ Warning | Contract-consistency / defense-in-depth gap; not reachable today (Zod schema + CI test on real catalogue) |
| `e2e/counter-band-overlap.spec.ts` | 279-291 | Arrow-width floor (44px) only asserted at 1024×768; other four matrix viewports collect `width` but discard it | ⚠️ Warning | A future change that drove an arrow to 0px width at narrow viewports would not be caught by this suite |
| `e2e/counter-band-overlap.spec.ts` | ~150-153 | `await band.boundingBox()` comment claims it "waits for settle"; it is a single discarded measurement, no poll | ℹ️ Info (empirically confirmed non-impactful — see Behavioral Spot-Checks above) | Misleading comment / test-hygiene, not a functional gap in this codebase's observed behavior |
| `app/components/NavBand.vue`, `ConfirmDialog.vue`, `ResumePrompt.vue`, `GameSelectorScreen.vue`, `ContentChangedNotice.vue` | various | Same "stuck pressed state" (WR-02) and "brightness not transitioned" (WR-09) patterns fixed in `CounterBand.vue`/`NavBand.vue` remain in 6 other buttons outside this phase's artifact scope | ℹ️ Info | Outside phase 07's must_haves (none of these files are declared artifacts of this phase's plans); flagged for awareness, not counted against this phase's goal |

No `TBD`/`FIXME`/`XXX` markers found in any file modified by this phase (checked all 14 files listed in `07-REVIEW.md`'s `files_reviewed_list` plus the two composables' test files).

### Human Verification Required

None. The blocking human-verify checkpoint was re-run in plan 07-11 with the scope explicitly widened past the original 07-07 coverage gap, and the transcript in `07-11-SUMMARY.md` distinguishes free-text approval from the structured per-viewport confirmation (1024×768, 412×915, 700×800, all with 4 players), including an explicit judgment call on the narrow 412×915 arrow usability ("Sí, se aciertan bien"). This satisfies the "missing" item #3 from the previous verification report. The remaining caveat — this is still a simulated viewport, not the real physical tablet (model/OS unidentified per `STATE.md` §Blockers) — was true of the *previous* passing truths as well (criteria 3/4/5 never required physical-device confirmation), is honestly disclosed in both 07-07 and 07-11 summaries, and does not gate this phase's success criteria as written.

### Gaps Summary

No gaps remain. The single blocking finding from the previous verification (CR-01 — counter cells overlapping and mis-hit-testing at 3-4 players below ~760px / at the app's own declared-supported portrait viewport 412×915) is genuinely fixed, confirmed by:
1. Direct reading of the current `CounterBand.vue` source (not the SUMMARY narrative) — the specific defect (fixed 44px arrow floor + fixed 64px value span + no `overflow-hidden` = irreducible 152px row) is gone.
2. Independently re-running `e2e/counter-band-overlap.spec.ts` myself — 7/7 pass, including the exact 412×915/4-player scenario reproduced broken last time.
3. A properly-scoped human re-verification (07-11) that explicitly covers the viewport the original 07-07 approval never touched, and explicitly asks (rather than assumes) about narrow-arrow usability.

Two lower-severity findings surfaced by the fresh code review were independently re-derived against the current source and are accurately characterized as WARNINGs, not blockers:
- The hero-health NaN guard asymmetry (WR-07/WR-01) is real but unreachable today given the Zod schema + CI catalogue validation gate.
- The missing arrow-width floor below 1024×768 in the e2e matrix is a real automated-regression gap, but the human verification already covers the current behavior at the viewports that matter, and D-02 explicitly accepts shrinking (not a zero floor) as the trade-off.

The `band.boundingBox()` "settle" comment concern was independently stress-tested (not merely re-stated from the review) and found not to produce a false pass in this codebase's current behavior — downgraded to an informational test-hygiene note.

Phase 07's goal is achieved: the counter band is present, correctly pre-loaded, correctly sized against a budget measured before construction, and each ▲/▼ now reliably targets only its own cell across the full supported viewport × player-count matrix — and v1.7-era saved sessions resume without corruption, with defensive rendering confirmed by a dedicated test for the exact shape (no `selection`, no `counters`) that a real save on the deployed tablet would have.

---

_Verified: 2026-09-08T23:12:16Z_
_Verifier: Claude (gsd-verifier)_
