# Phase 9 — UI Review

**Audited:** 2026-09-22
**Baseline:** `09-UI-SPEC.md` (approved design contract)
**Screenshots:** not captured — no dev server / Playwright MCP available in this session; this is a **code-only audit**. All findings below are read directly from source, not observed rendering.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Nine rounds of adversarial verification already closed every overclaim; every conditional string traces to a `planGameEnd`/`readStoredProgress` fact, never a written-side boolean |
| 2. Visuals | 4/4 | Anchors, hierarchy and no-color-coding hard rule all implemented exactly as spec'd; no icon-only controls without labels |
| 3. Color | 4/4 | Zero new hex values; all classes resolve to `@theme` tokens; GANADA/PERDIDA never color-coded, confirmed in both dialog and card |
| 4. Typography | 4/4 | Exactly the 4 inherited sizes / 2 weights used, matched role-for-role to the spec table |
| 5. Spacing | 4/4 | All spacing classes are named tokens (`gap-sm`, `p-lg`, `px-2xl`, etc.); the only arbitrary-value classes present (`max-w-[640px]`, `min-w-[220px]`) are pre-existing Phase 1/6 precedents reused verbatim, not new exceptions |
| 6. Experience Design | 3/4 | Loading/empty/delete-confirm states are all covered, but the `useProgressMismatchMark` module-state mechanism has a documented, accepted gap (lost warning on full reload) that is a real (if disclosed) UX edge case |

**Overall: 23/24**

---

## Top 3 Priority Fixes

1. **None are blocking.** This phase has no BLOCKER-class findings — every hard rule in `09-UI-SPEC.md` (no color-coded outcome, equal-weight count/percentage, no false affordance on stat rows, truthful copy per branch) is implemented and matches the cited source lines.
2. **WARNING — `useProgressMismatchMark`'s in-memory mark is lost on a full browser reload** (`app/composables/useProgressMismatchMark.ts`), so a real discrepancy warning can silently stop showing after a refresh even though the underlying storage mismatch is unchanged. This is disclosed in code comments as accepted debt (plan 09-36/09-40), not a hidden defect — but it is still a real gap in "the group is warned when data might be wrong." No fix required by the contract; flagging so it isn't lost track of if a future phase touches this file.
3. **WARNING — no automated visual verification exists for this audit.** Every finding here is derived from static source reading (Tailwind classes, composable outputs, Vitest results), not a rendered screenshot at the tablet viewport this app is designed for. Recommend a follow-up pass with Playwright once a dev server/MCP browser is available, specifically to confirm at 1024×768-ish landscape tablet width: (a) the four-button `GameOutcomeDialog` never needs scroll on a real device, (b) history cards with 4 players + a long villain name don't overflow or truncate unexpectedly, (c) the `HistorySavedNotice` fixed-position banner doesn't visually collide with the home screen's `Histórico`/`Estadísticas` button row it explicitly documents avoiding.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Every string in the Copywriting Contract table was traced to its literal source and matches verbatim:
- `GameOutcomeDialog.vue:96,105,113` — button labels `GANADA` / `PERDIDA · Se completó el Plan Principal` / `PERDIDA · Todos los héroes eliminados` — exact D-06 corrected wording, not the shorter ASCII mockup placeholder.
- `app/composables/useGameEndCopy.ts` `buildEndGameBody` — the retained warning was rewritten in round 7 specifically to remove a promise (`podréis reintentar`) that was false in 2 of 4 device states; the current text only asserts what `preserveProgress = !historyRecorded` actually guarantees across all four branches. This is the single highest-value thing this phase's copy work did and it holds up under source inspection.
- `useHistorySavedNotice.ts` `NOTICE_HEADING`/`NOTICE_BODY` — five variants (`success`, `failure-recoverable`, `failure-stale`, `failure-unrecoverable`, `failure-unknown`), each keyed off `resolveNoticeVariant(historyRecorded, stored)` where `stored: StoredProgress` comes from a real read (`readStoredProgress`), never a write-side boolean. `failure-stale`'s text was rewritten a second time (plan 09-32) after a test (`avisoTrasRegistroFallido.test.ts` test 5) proved the round-6 wording asserted temporal ordering and a round-difference that the comparison function does not establish — the current text only claims "hay algo guardado, no coincide, no sabemos si es la misma partida," in modal (`podría`) language.
- `useProgressMismatchMark.ts` `PROGRESS_MISMATCH_WARNING` — sentence-by-sentence backing is documented and covered by its own test (`useProgressMismatchMark.test.ts`).
- `useGameHistory.ts:189-192` — `deleteAriaLabel`/`confirmTitle`/`confirmBody` match the Copywriting Contract's delete-confirmation row exactly, including the villain-null fallback (`'sin villano'`).
- History card cause line (`useGameHistory.ts:107`, `describeLossCause`) matches the button text minus the `PERDIDA ·` prefix, satisfying the spec's explicit cross-consistency requirement.

No instance of generic labels (`Submit`/`OK`/`Cancel`) was found in the audited files; `Cancelar`/`Sí, borrar` are the pre-existing `ConfirmDialog` vocabulary, unchanged.

### Pillar 2: Visuals (4/4)

- Anchors match spec: `GameOutcomeDialog`'s heading is the first element and only Heading/700 in the panel (`GameOutcomeDialog.vue:87`); `/historico`'s first card and `/estadisticas`'s first section header play the anchor role the spec assigns them, with the screen-title `h1` deliberately not competing (both are `text-heading` but sit in the quiet header band, not the scrolling body).
- Icon-only controls: the `✕` dismiss on `HistorySavedNotice.vue:96` carries `aria-label="Cerrar aviso"`; `Borrar` on `HistoryEntryCard.vue` carries a dynamic `aria-label` built from date+villain. No bare icon-only control found unlabeled.
- Hierarchy: GANADA/PERDIDA buttons in `GameOutcomeDialog.vue` are visually identical to each other (`bg-surface text-primary-text text-body font-bold`, same press-feedback class), correctly implementing D-02's "don't nudge toward an outcome."
- Statistics rows are plain `<div>`s with no chevron/hover/aria-label (`estadisticas.vue:65-73`), matching the D-09/Phase-8 "no false affordance" precedent explicitly required by the spec.

### Pillar 3: Color (4/4)

- `grep` across `app/assets/css/main.css` confirms all color roles used by this phase's files (`bg-background`, `bg-surface`, `text-primary-text`, `text-secondary-text`, `text-accent`, `text-warning`, `text-destructive`, `text-on-accent`) resolve to the existing `@theme` tokens — zero hardcoded hex/`rgb()` found in any of the 6 audited component/page files.
- Hard rule verified directly: `GameOutcomeDialog.vue` renders all three recording buttons with identical `bg-surface text-primary-text` chrome — no accent/warning/destructive fill on any of them, and the history card's result word (`HistoryEntryCard.vue:26`) uses plain `text-primary-text`, never conditionally colored by outcome.
- Accent is scoped to the two documented new uses: the cross-link controls (`text-accent` on `Estadísticas ›` / `Histórico ›` in both pages) and the `first-letter:text-accent`/`first-letter:text-warning` split in `HistorySavedNotice.vue` for the ✓/⚠ glyph — matches spec's "extending the interactive-control reservation" framing exactly, no new role invented.
- Destructive color confined to `Borrar` (text-only, no fill) — matches the spec's explicit distinction between the trigger's outline/text weight and the confirm button's filled weight.

### Pillar 4: Typography (4/4)

`grep` of `text-(display|heading|body|label)` across the six audited files returns only the four inherited sizes — no new size introduced, no `text-display` used anywhere in this phase (matches spec's explicit "not used this phase"). Weight distribution matches the role table: Heading is always `font-bold`, Body splits 400 (content lines) / 700 (dialog buttons, result word — confirmed at `HistoryEntryCard.vue:26` and `GameOutcomeDialog.vue:96`), Label is always `font-bold` except the card's date (`text-label font-normal`, correctly matching the spec's one explicitly-called-out exception at Layout §4).

### Pillar 5: Spacing (4/4)

Every spacing class in the six files is a named token from the inherited scale (`gap-xs/sm/md/lg`, `p-lg`, `px-lg/2xl`, `py-lg`). The only bracketed arbitrary values present are `max-w-[640px]` (the pre-existing `ConfirmDialog`/dialog-panel width, reused verbatim per the spec's own note) and `min-w-[220px]`/`min-h-[120px]` on `GameSelectorScreen.vue`'s game-card tiles, which predate this phase and were not touched by it (the two new secondary buttons added by this phase, `Histórico`/`Estadísticas`, use only named tokens: `min-h-12 px-lg`). No new arbitrary-value spacing was introduced by this phase's own additions.

### Pillar 6: Experience Design (3/4)

Coverage found:
- **Loading/hydration guard**: both `historico.vue` and `estadisticas.vue` gate their body render behind a `cargado` ref set in `onMounted`, correctly avoiding a false "empty" flash during prerender before `localStorage` is available (documented against Pitfall 7).
- **Empty states**: both screens render the exact copy from the Copywriting Contract, with no percentage or table shell rendered when history is empty (`estadisticas.vue:47-52`), satisfying the STAT-05 hard rule.
- **Destructive confirmation**: delete flow requires an explicit second tap through the reused `ConfirmDialog` (`historico.vue:88-98`), never deletes on first tap.
- **Non-blocking notice**: `HistorySavedNotice.vue` is `role="status" aria-live="polite"`, permanently mounted (not `v-if` on the live region itself) so screen readers actually announce the change — a subtlety the code comments show was specifically fixed after an earlier round found the naive `v-if`-on-live-region pattern announces nothing.
- **Gap found**: `useProgressMismatchMark.ts` stores its discrepancy mark as in-module state (`Map`, not `localStorage`) by design — the file's own comments disclose that a full browser reload silently loses the mark, meaning the mismatch warning can stop appearing even though the underlying stale-progress condition is unchanged. This is an accepted, documented trade-off (not a defect the phase missed), but it is a genuine "the group might not be warned" edge case worth carrying forward rather than treating as fully closed. This is why the pillar is 3/4 rather than 4/4 — the mechanism is honest about its own limits, but the limit itself is a real gap in state coverage for a destructive/consequential-adjacent flow.

No loading spinners are needed per the spec (synchronous `localStorage` writes), and none were added — correct per D-01/HIST-03.

---

## Files Audited

- `app/pages/historico.vue`
- `app/pages/estadisticas.vue`
- `app/components/GameOutcomeDialog.vue`
- `app/components/HistoryEntryCard.vue`
- `app/components/HistorySavedNotice.vue`
- `app/components/ResumePrompt.vue`
- `app/components/GameSelectorScreen.vue`
- `app/composables/useGameEndCopy.ts`
- `app/composables/useHistorySavedNotice.ts`
- `app/composables/useProgressMismatchMark.ts`
- `app/composables/useGameHistory.ts` (partial — grepped for copy-producing lines)
- `app/assets/css/main.css` (`@theme` token definitions)
- `nuxt.config.ts` (`nitro.prerender.routes`)
- `09-UI-SPEC.md`, `09-CONTEXT.md` (design contract, read in full)
- Test suite: `npx vitest run --project app-logic` — 638/638 passed

Not read in full (sampled via grep only): `useProgressMountPlan.ts`, remainder of `useGameHistory.ts` (statistics aggregation body), `ConfirmDialog.vue` (assumed unchanged per spec's own "Unchanged" note in Component Inventory — not independently re-verified against its current source in this pass).
