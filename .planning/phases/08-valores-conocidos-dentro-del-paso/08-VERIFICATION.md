---
phase: 08-valores-conocidos-dentro-del-paso
verified: 2026-09-09T13:10:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Con villano y héroes elegidos, el paso que cita la vida del villano la muestra entre paréntesis junto al texto («…al valor indicado (14)»)."
    status: partial
    reason: >
      Mechanically true for the tested/common case (Rhino, Ultron, or Kang in Normal
      difficulty), but FALSE for a real, reproducible combination: Kang + Expert difficulty.
      `computeInitialVillainHealth` (engine/counters.ts:34) deliberately selects
      `stage1.expert` when `context.difficulty === 'expert'`, and `content/marvel-characters.json`
      confirms Kang is the only villain of the three shipped with a stage-I `expert` figure
      (15/hero vs 12/hero normal). But the step that prints this number,
      `setup.escenario.02` ("Ajustad el dial de vida del villano al valor indicado en la
      carta de villano."), runs BEFORE `setup.escenario.04` ("Comprobad qué cartas de
      villano numeradas exige la dificultad elegida" → expert variant: "Sustituid las
      cartas de villano numeradas por las del modo Experto de este escenario."). At the
      point step .02 is read, in Expert mode the group is still holding the STANDARD
      stage-I card (12/hero), not the Expert one (15/hero) — the card swap has not
      happened yet. At 3 players the screen prints "(45)" while the physical card in the
      group's hands reads 36. No later step tells the group to re-adjust the dial after
      the .04 swap. This directly contradicts the project's hard constraint in CLAUDE.md
      ("un asistente que guía mal es peor que no tener asistente") and the module's own
      documented invariant that the printed figure is "la vida inicial impresa en la
      carta" — at that point in the sequence, for Kang/Expert, it is not.
    artifacts:
      - path: "content/marvel-champions.json"
        issue: "setup.escenario.02 (value: villainHealth) is sequenced before setup.escenario.04 (the difficulty-card swap step), so the difficulty-aware figure computed for the dial step can reference a card the group has not swapped in yet."
      - path: "engine/stepValues.ts"
        issue: "resolveStepValue delegates to computeInitialVillainHealth(villain, playerCount, difficulty) with no awareness of where the consuming step sits relative to the card-swap step — by design this phase's stepValues.ts has no step-sequence knowledge, so the defect is a content-ordering issue rather than a stepValues.ts bug per se."
    missing:
      - "Either reorder content so setup.escenario's difficulty-card-swap step runs before the dial step (content-only fix, renumbering ids), or give setup.escenario.02 an explicit expert-difficulty variant that does not print a number contradicting the card physically in hand at that point in the sequence, or add a step after the swap that re-confirms/re-adjusts the dial in Expert mode."
      - "A content.test.ts assertion pinning that any step declaring value:\"villainHealth\" is sequenced after the difficulty-card-swap step, so this ordering class of bug fails CI instead of shipping silently (per code review WR-04's suggestion)."
deferred: []
human_verification: []
---

# Phase 8: Valores conocidos dentro del paso Verification Report

**Phase Goal:** Los pasos que citan un valor conocido (vida del villano, vida inicial de
identidad, tamaño de mano) lo muestran en pantalla —entre paréntesis o en una lista por
jugador según el caso— sin tocar ni un carácter del texto guardado ni de los clips de voz
ya pregenerados.

**Verified:** 2026-09-09T13:10:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Villain-health step shows the value in parentheses next to the text | ⚠️ PARTIAL (BLOCKER) | Mechanically correct for Rhino/Ultron/Kang-Normal (confirmed rendering path + human-approved "Aprobado!" checkpoint for Rhino/Normal/3p). **FAILS for Kang + Expert difficulty**: the parenthesised figure (45 at 3p) contradicts the physical card the group is holding at `setup.escenario.02` (36 at 3p), because the difficulty-card swap doesn't happen until `setup.escenario.04`, two steps later. See gap below. |
| 2 | Per-player-value step shows a compact list "Jugador N · Héroe → número" under the text, never an inline parenthesis with all values | ✓ VERIFIED | `app/components/StepScreen.vue:136-148` renders a non-interactive `<div>` list (no `<button>`, no `›`, no `@click`, no `aria-label`) using `text-body`/`text-heading font-bold`, `max-w-[720px]`, `border-b border-accent/50`; `engine/stepValues.ts` produces rows only for `heroHealth`/`handSizeAlterEgo`; human checkpoint confirmed "Jugador 1 · Spider-Man 10", "Jugador 2 · Thor 14", "Jugador 3 · She-Hulk 15" and hand-size list showing 6/5/6 (Alter-Ego face, not Hero face) — "Aprobado!" |
| 3 | Without any selection, those same steps render exactly as before — no gap, no marker | ✓ VERIFIED | `stepValueSuffix ?? ''` renders empty string when no villain selected (resolveStepValue → null via resolveVillainId → null); `stepValueRows` computed returns `null` (not `[]`) when no rows resolve, and `v-if="stepValueRows && stepValueRows.length"` keeps the block entirely out of the DOM; human checkpoint step 7 confirmed "sin paréntesis, sin lista, sin renglón vacío ni hueco reservado" — "Aprobado!" |
| 4 | `git diff` on `content/marvel-champions.json` touches zero characters of any `text`/`speech` field — value added only in rendering | ✓ VERIFIED | Re-ran independently against base commit `41c2d4aa05802cf4f512afb0e20d79d7f746e7fd`: `git diff -U0` shows exactly 4 added lines (all `"value": "..."`), 0 removed lines; `git diff` (full context) shows zero `+`/`-` lines matching `"text"`/`"speech"` |
| 5 | `npm test` stays green with the 35 pregenerated audio clips intact, voice-drift gate green, narration still generic (no number) | ✓ VERIFIED | Re-ran independently: `npm test` → 563/563 passed (22 files); `npx vitest run engine/__tests__/voice-drift.test.ts` → 8/8 passed, no clip-regeneration requested; `ls public/audio/*.m4a` = 35, manifest entries = 35, `git status --porcelain public/audio scripts/voice/manifest.json` empty; `contentVersion` still 13; narration is driven by pregenerated audio ids keyed on step id (`engine/resolve.ts`), structurally incapable of carrying the dynamic number — confirmed no `speech`/`text` field was touched (truth 4) |

**Score:** 4/5 truths verified (truth 1 is a BLOCKER — partial, not failed outright, since it holds for the common/tested path but breaks for a specific real combination)

### Known Documentation Discrepancy (not a failure)

ROADMAP.md and REQUIREMENTS.md (VAL-05) both say "37 clips". The real, current count is
**35** `.m4a` files matching 35 manifest entries — verified independently (`ls
public/audio/*.m4a | wc -l` = 35; manifest `entries` keys = 35; both untouched by this
phase). The "37" figure is stale documentation predating this phase; the correct
verification criterion (both counts match and are unchanged) holds. Not treated as a gap.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `engine/types.ts` | `StepValueKind` exported, `StepDefinition.value?` field | ✓ VERIFIED | `StepValueKind = 'villainHealth' \| 'heroHealth' \| 'handSizeAlterEgo'` exported; used by `useGameSession.ts` |
| `engine/schema.ts` | `value: z.enum([...]).optional()` inside `StepSchema` | ✓ VERIFIED | Present, validates real content in CI (`npm test` green, `content.test.ts` passes) |
| `content/marvel-champions.json` | 4 `"value"` keys on the exact 4 D-03 steps, `ronda.jugadores.02` untouched | ✓ VERIFIED | Confirmed via direct JSON walk: `setup.heroes.03` → heroHealth, `setup.escenario.02` → villainHealth, `setup.manos.02`/`.03` → handSizeAlterEgo; `ronda.jugadores.02` carries no `value` key |
| `engine/stepValues.ts` | `resolveStepValue`/`resolveStepValueRows`, pure, reuse `counters.ts`, never call `resolveCounterValues` | ✓ VERIFIED | Read full file: imports only `./counters`, `./selection`, `./types`; zero mention of `resolveCounterValues` outside comments; reuses `computeInitialVillainHealth`/`computeInitialHeroHealth`; uses `hero.handSizeAlterEgo` (not `handSizeHero`) |
| `app/composables/useGameSession.ts` | `stepValueSuffix`/`stepValueRows` computeds, `buildStepValueSuffix`/`buildStepValueCells` pure helpers | ✓ VERIFIED | Present at lines 271-284, wired into the returned object; both consume `resolveStepValue`/`resolveStepValueRows` |
| `app/components/StepScreen.vue` | Suffix interpolated in same `<p>` node as `actionText`; list block as non-interactive `<div>` rows, no label | ✓ VERIFIED | Line 77: `{{ actionText }}{{ stepValueSuffix ?? '' }}`; lines 136-148: `<div>` rows, no `<button>`, no `›`, no `@click`, no `aria-label`, no heading label, positioned after `selectionRows` block and before `options` block (correct D-12 ordering) |
| `app/pages/[game]/index.vue` | Passes `:step-value-suffix`/`:step-value-rows` props, no engine import added | ✓ VERIFIED | Confirmed by SUMMARY grep evidence and prior review; page already imported `~~/engine/*` for unrelated pre-existing features (out of scope) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `content/marvel-champions.json` | `engine/schema.ts` | strict Zod validation in `content.test.ts` | ✓ WIRED | `npm test` green, content validates |
| `engine/types.ts` | `engine/schema.ts` | matching enum literals | ✓ WIRED | Confirmed identical three literals in both files |
| `engine/stepValues.ts` | `engine/counters.ts` | `computeInitialHeroHealth`/`computeInitialVillainHealth` import | ✓ WIRED | Confirmed in file read |
| `app/composables/useGameSession.ts` | `engine/stepValues.ts` | `resolveStepValue`/`resolveStepValueRows` import | ✓ WIRED | `import { resolveStepValue, resolveStepValueRows, type StepValueRow } from '~~/engine/stepValues'` at line 27 |
| `app/pages/[game]/index.vue` | `app/components/StepScreen.vue` | `:step-value-suffix`/`:step-value-rows` props | ✓ WIRED | Confirmed via prior grep evidence in SUMMARY, consistent with observed composable/component contract |
| `app/components/StepScreen.vue` | `app/composables/useGameSession.ts` | no engine import in component | ✓ WIRED | `grep -c "~~/engine" app/components/StepScreen.vue` = 0 (confirmed no such import in the file read) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `StepScreen.vue` `stepValueSuffix` prop | `stepValueSuffix` computed in `useGameSession.ts` | `resolveStepValue(step.value, context, catalogue)` → real catalogue lookup via `computeInitialVillainHealth` | Yes, for the general case | ⚠️ FLOWING BUT INCORRECT IN ONE CASE — see gap. The computed value is real (not static/hardcoded), but is wrong at `setup.escenario.02` for Kang+Expert because of content sequencing, not because the data pipe is broken. |
| `StepScreen.vue` `stepValueRows` prop | `stepValueRows` computed | `resolveStepValueRows(step.value, context, catalogue)` → real catalogue lookup (`hero.health`, `hero.handSizeAlterEgo`) | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Content diff is exactly 4 additive `"value"` lines, 0 removed | `git diff -U0 <base-commit> -- content/marvel-champions.json` | 4 added (`"value":` ×4), 0 removed | ✓ PASS |
| No `text`/`speech` line touched | `git diff <base-commit> -- content/marvel-champions.json \| grep '^[+-].*"text"\|"speech"'` | empty | ✓ PASS |
| Audio clips and manifest entries match, untouched | `ls public/audio/*.m4a \| wc -l` / manifest entries count / `git status --porcelain` | 35 = 35, clean | ✓ PASS |
| Voice-drift gate green | `npx vitest run engine/__tests__/voice-drift.test.ts` | 8/8 passed | ✓ PASS |
| Full test suite green | `npm test` | 563/563 passed (22 files) | ✓ PASS |
| Static build succeeds | `npm run generate` | Prerendered 6 routes, PWA precache 64 entries, no error | ✓ PASS |
| `contentVersion` unchanged | `grep -c '"contentVersion": 13,' content/marvel-champions.json` | 1 | ✓ PASS |
| Villain-health figure matches the physical card at the point it's read | Manual trace: `setup.escenario.02` (value step) vs `setup.escenario.04` (difficulty-card-swap step), plus `content/marvel-characters.json` Kang stage-I expert figures | Kang + Expert: printed 45 (3p) vs. card-in-hand 36 (3p) at the point the dial step is read | ✗ FAIL — see gap |

### Probe Execution

No `scripts/*/tests/probe-*.sh` conventional probes found for this phase; PLAN files do not declare any probe scripts. Step 7c: SKIPPED (no declared or conventional probes).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|--------------|--------|----------|
| VAL-01 | 08-02, 08-03 | Villain health shown in parentheses | ⚠️ PARTIALLY SATISFIED | Works for the common/tested path; fails for Kang + Expert difficulty (see gap) |
| VAL-02 | 08-02, 08-03 | Per-player values shown as compact list, never inline parenthesis | ✓ SATISFIED | Verified in code + human checkpoint |
| VAL-03 | 08-02, 08-03 | No selection → steps render exactly as before | ✓ SATISFIED | Verified in code + human checkpoint |
| VAL-04 | 08-01 | Content `text`/`speech` untouched, value added only in render | ✓ SATISFIED | Verified via independent `git diff` against base commit |
| VAL-05 | 08-01, 08-03 | Pregenerated audio clips remain valid, voice-drift gate green | ✓ SATISFIED (with stale "37" documentation figure noted, not a failure — real count 35=35) |
| VAL-06 | 08-01, 08-03 | Narration still says the generic phrase, no number | ✓ SATISFIED | Structurally guaranteed: audio ids are keyed on step id and `speech`/`text` fields are untouched (VAL-04); narration cannot carry a number that was never written into `speech` |

No orphaned requirements — REQUIREMENTS.md maps only VAL-01 through VAL-06 to Phase 8, and all six appear in at least one plan's `requirements` frontmatter.

### Anti-Patterns Found

No `TODO`/`FIXME`/`HACK`/`TBD`/`XXX`/placeholder markers found in files modified by this phase
(`engine/types.ts`, `engine/schema.ts`, `content/marvel-champions.json`, `engine/stepValues.ts`,
`engine/__tests__/stepValues.test.ts`, `app/composables/useGameSession.ts`,
`app/composables/__tests__/useGameSession.test.ts`, `app/components/StepScreen.vue`,
`app/pages/[game]/index.vue`). No `v-html` introduced. No hardcoded empty stub returns in the
new render paths.

The independently-confirmed code review (`08-REVIEW.md`) additionally flags 6 warnings and
6 info items not repeated here in full (missing schema/content tests for the new `value`
field, no defensive array-guard on `catalogue.villains`/`.heroes`, `StepValueKind` typed three
times with no compile-time link between the type and the engine's string-literal dispatch,
text-length budget not accounting for the rendered suffix, untested reactive wiring in
`useGameSession.ts`, and the value being visual-only/never spoken). None of these individually
block the phase goal — the resolved data does flow correctly for all combinations tested, and
the visual-only tradeoff is an accepted structural consequence of the pregenerated-audio
architecture, not new to this phase. They are test-coverage/robustness gaps, not functional
failures observed in the field, and are listed here as ℹ️ Info for awareness rather than as
phase-blocking gaps.

CR-02 (`optionsWarningDetail` dropped in `engine/resolve.ts`) is confirmed pre-existing —
`engine/resolve.ts` is not in the `files_modified` list of any 08-0x plan, and `git log`
shows it was last touched by "Quick 260831-fkb", before this phase. It is out of scope for
this phase's goal-backward verification and is not counted as a Phase 8 gap.

### Human Verification Required

None outstanding. The blocking checkpoint in plan 08-03 (Task 3) was already run and approved
by the human ("Aprobado!", recorded in `08-03-SUMMARY.md`) for the Rhino/Normal/3-player
scenario covering all 8 `<how-to-verify>` points. That approval is genuine and does not need
to be repeated. However, it did not exercise the Kang+Expert combination, which is exactly
where the CR-01 defect lives — the human never saw the bug because the approved test script
didn't include it.

### Gaps Summary

Four of five roadmap success criteria are cleanly and independently verified: the per-player
list (criterion 2), the no-selection regression guard (criterion 3), the content-diff purity
guarantee (criterion 4), and the test/audio-integrity gate (criterion 5) all hold under direct
re-verification against the live codebase, not just the SUMMARY narrative.

Criterion 1 (villain-health parenthesis) is where the phase's own difficulty-aware design
collides with content sequencing that predates this phase: `setup.escenario.02` (the step
this phase marked with `value: "villainHealth"`) is read by the group before
`setup.escenario.04` swaps in the Expert-mode villain cards. For Kang — the one villain of
the three shipped with a distinct Expert stage-I figure — the parenthesised number in Expert
mode (45 at 3 players) contradicts the card physically in the group's hands at that point (36
at 3 players), and nothing downstream tells the group to re-adjust the dial after the .04
swap. This was independently reproduced by tracing `engine/counters.ts:34`'s difficulty
branch against the real step order and the real catalogue figures — it is not speculative.

Per CLAUDE.md's explicit, non-negotiable constraint ("un asistente que guía mal es peor que no
tener asistente"), a feature whose entire purpose is to tell the group the number printed on
their card must not print a different number than the card in a real, reachable game state.
This is classified as a BLOCKER rather than a warning, even though it affects only one villain
in one difficulty mode, because the failure mode is exactly the one the project's rules-fidelity
constraint exists to prevent, and it is trivially reachable by any group that plays Kang on
Expert (a normal, supported combination — Expert difficulty and Kang are both fully shipped
features, not edge/unsupported configurations).

**Suggested fix paths** (from the independently-confirmed code review, not altered here):
content-only — either resequence `setup.escenario` so the difficulty-card swap (today's `.04`)
runs before the dial step (today's `.02`), or give the dial step an explicit `expert`-difficulty
text variant that does not state a number contradicting the as-yet-unswapped card. Either fix
stays inside the content layer and does not require touching `engine/stepValues.ts` or any
already-shipped test.

If the project owner judges this specific combination (Kang + Expert) an acceptable, documented
edge case rather than a blocker — for instance, if a future phase or quick-fix is already
planned to resequence the scenario steps — this gap can be closed with an override in this
file's frontmatter rather than a new closure plan.
