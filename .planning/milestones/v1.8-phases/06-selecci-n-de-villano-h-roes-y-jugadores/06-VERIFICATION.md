---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
verified: 2026-09-08T00:00:00Z
status: passed
score: 5/5 roadmap success criteria verified, 9/9 SEL requirements verified
overrides_applied: 0
---

# Phase 6: Selección de villano, héroes y jugadores — Verification Report

**Phase Goal:** Un grupo puede elegir, dentro del paso «Decidid, como grupo…», qué villano enfrenta y qué héroe lleva cada jugador —con nombre opcional—, sin que elegir sea obligatorio y sin perder la selección si la página se recarga a mitad de partida.

**Verified:** 2026-09-08
**Status:** passed
**Re-verification:** No — initial verification

**Method:** Goal-backward, against the code, not against SUMMARY.md claims. All commands below were re-run independently by the verifier in this session (`npm test`, `npm run build`, `npm run generate`, and the exact `grep`/`git diff` gates in `06-07-GATES.md`), and every mutator/component/composable file was read in full and traced by hand, not assumed from the SUMMARYs' prose.

## Goal Achievement

### Observable Truths (ROADMAP §Phase 6 — 5 success criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Un grupo puede tocar el selector de Villano en «Decidid, como grupo…» y elegir uno de los 3 villanos en un modal | ✓ VERIFIED | `StepScreen.vue` renders a `Villano` row (`selectionRows[0]`) that emits `select-row('villain')`; `app/pages/[game]/index.vue:onSelectRow` opens `activeSelectionModal={kind:'villain'}`; `VillainPickerModal.vue` renders exactly `villains` (3 catalogue entries, `buildVillainOptions`) + "Sin elegir", each tap emits `select` → `onSelectVillain` → `setVillain()` → `onDismissSelectionModal()` (D-13 save-and-close). |
| 2 | Un grupo puede tocar un selector de héroe por jugador (tantos como el nº elegido en el mini-setup) y filtrar los 23 héroes escribiendo el nombre del héroe o del alter ego, insensible a mayúsculas y a acentos | ✓ VERIFIED | `playerSlots` (from `resolvePlayerSlots(context)`) always has exactly `playerCount` entries; one row per slot in `selectionRows`. `PlayerModal.vue`'s filter field is `v-model="query"` feeding `filterHeroOptions` → `matchesHeroQuery`, which checks `hero.spanishName`/`catalogueName`/`alterEgo` via `normalizeForSearch` (`.toLowerCase().normalize('NFD').replace(COMBINING_MARKS_REGEX,'')`) — confirmed by 51 passing tests in `useHeroSearch.test.ts`, including the literal `'ARAÑA'→'arana'` case. |
| 3 | Cada jugador tiene un nombre editable con valor por defecto «Jugador 1»…«Jugador 4», y elegir el mismo héroe en dos huecos se marca visualmente como repetido sin bloquear la partida | ✓ VERIFIED | `PlayerModal.vue` name `<input maxlength="14">` bound to `draftName` initialized to `Jugador ${slotNumber}` when empty; `resolvePlayerLabel` returns `Jugador N` for empty/whitespace names. Duplicate marking: `buildDuplicateWarningText`/`buildTakenByMap` produce the `⚠`/`ya:` text; `StepScreen.vue`'s `⚠` line is a plain `<p>` — no `<button>`, no `@click`, no border/chevron (D-16/D-32) — and `NavBand.vue` (untouched, `git diff` empty) has no disabled state tied to selection, confirming SIGUIENTE is never blocked. |
| 4 | Recargar la página a mitad de partida conserva exactamente la selección hecha (villano, héroes, nombres) | ✓ VERIFIED | Every mutator in `engine/selection.ts` (`setVillain`/`setHero`/`setPlayerName`) rebuilds `session`, `context`, `selection`, and `heroes[]` as brand-new objects/arrays on every call (traced by hand, no `.push`/`.splice`/nested-property write found anywhere in the write path `engine/selection.ts → useGameSession.ts → index.vue`); `useGameSession.ts`'s wrappers do a single `session.value = engineX(...)` reassignment; `watchDebounced(session, ..., {debounce:300})` in `index.vue` has **no** `{deep:true}`, so it only fires on identity change of `session.value` — exactly the pattern the mutators guarantee. `engine/persistence.ts` untouched (`git diff e773f7c` empty) and `toPersistedPosition`/`resume()` already persist `context` whole (D-19), so no new persistence plumbing was needed. Independently confirmed by the user's human verification (14/14, item #12: "recargar conserva villano, héroes y nombre"). |
| 5 | Un grupo que no toca ningún selector juega exactamente como en v1.7, sin ningún hueco ni exigencia nueva | ✓ VERIFIED | `showsSelectionGrid` is the single point in `app/` reading `step.selection === 'characters'` — no other file compares against the hardcoded id `setup.heroes.01` (`grep -rn "setup.heroes.01" app/` → empty). `selectionRows`/`duplicateWarningText` return `null` for any step not declaring `selection:'characters'`, so `StepScreen.vue`'s `v-if="selectionRows && selectionRows.length"` never renders for any other step. `NavBand.vue` and `onNext` are untouched and carry no gating on selection state. `content/marvel-champions.json` diff is exactly 1 line added, 0 `text`/`speech` characters touched (re-verified independently). |

**Score:** 5/5 truths verified

### Requirements Coverage (SEL-01..SEL-09)

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| SEL-01 | Selector de Villano en el paso | ✓ SATISFIED | `StepScreen.vue` selection grid row `key:'villain'`, wired in `index.vue`. |
| SEL-02 | Tocar el selector de villano abre modal con 3 villanos | ✓ SATISFIED | `VillainPickerModal.vue` renders `buildVillainOptions(catalogue.villains)` — 3 entries, no filter (D-10, intentional). |
| SEL-03 | Selector de héroe por jugador, tantos como el nº elegido | ✓ SATISFIED | `playerSlots` derived from `resolvePlayerSlots(context)`, length always `context.playerCount`. |
| SEL-04 | Tocar un selector de héroe abre modal con los 23 héroes | ✓ SATISFIED | `PlayerModal.vue` receives `buildHeroOptions(catalogue.heroes)` (23 entries) as `heroes` prop. |
| SEL-05 | Filtro de texto que busca por nombre de héroe y alter ego, insensible a mayúsculas/acentos | ✓ SATISFIED | `matchesHeroQuery` checks `spanishName`+`catalogueName`+`alterEgo` via `normalizeForSearch`; 51 tests including accent/case/ñ cases pass. |
| SEL-06 | Nombre editable y opcional, default «Jugador 1»…«Jugador 4» | ✓ SATISFIED | `PlayerModal.vue` name field, `resolvePlayerLabel` fallback, `PLAYER_NAME_MAX_LENGTH=14` enforced both client (`maxlength`) and engine (`slice`). |
| SEL-07 | Héroe repetido se marca visualmente sin bloquear | ✓ SATISFIED | `buildDuplicateWarningText`/`buildTakenByMap`; non-clickable `<p>` warning line (D-16/D-32); `NavBand` untouched. |
| SEL-08 | Selección persiste con la sesión y sobrevive a recarga | ✓ SATISFIED | Reassignment-only mutators + non-deep `watchDebounced` + `persistence.ts` untouched (D-19); human-verified reload test passed. |
| SEL-09 | Elegir es opcional; sin selección, la app se comporta como v1.7 | ✓ SATISFIED | `showsSelectionGrid` gates the grid to the one declared step only; `SIGUIENTE`/`NavBand` never gated on selection state. |

**Score:** 9/9 requirements satisfied. No orphaned requirements found — the SEL block in `.planning/REQUIREMENTS.md` (SEL-01..SEL-09) is exactly the set claimed across the 06-01..06-07 SUMMARYs.

**Note (non-blocking, documentation only):** `.planning/REQUIREMENTS.md`'s checkboxes and its coverage table still show SEL-01..SEL-09 as unchecked / "Pendiente." This is a bookkeeping lag, not a code gap — the equivalent Phase 5 update happened in a dedicated `docs(phase-05): complete phase execution` commit that runs *after* phase closure, and the current HEAD (`b800c11`) predates that step for Phase 6 (the uncommitted `ROADMAP.md` diff already marks Phase 6 complete, evidently written by this same closing pass). Flagged here so the closing commit doesn't skip it, not as a phase-goal failure.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `engine/selection.ts` | Pure mutators (`setVillain`/`setHero`/`setPlayerName`) + normalizers, full reassignment | ✓ VERIFIED | Read in full. Every mutator spreads `session`/`context`/`selection`/`heroes` at every level; `resolvePlayerSlots`/`resolveVillainId` normalize by type, never trust presence/length. |
| `engine/types.ts` | `StepDefinition.selection?`, `HeroSelection`, `SessionContext.selection?` | ✓ VERIFIED | `selection?: 'characters'` (types.ts:55), `selection?: HeroSelection` (types.ts:122). |
| `engine/schema.ts` | `selection: z.enum(['characters']).optional()` on `StepSchema` | ✓ VERIFIED | schema.ts:79, sibling of `kind`, not nested in `TextBlockSchema`. |
| `app/composables/useCharacterCatalogue.ts` | Static import of catalogue, no zod, no network | ✓ VERIFIED | Read in full — static `import marvelCharacters from '~~/content/marvel-characters.json'`, no zod import. |
| `app/composables/useHeroSearch.ts` | Pure filter/sort/label/duplicate-detection functions | ✓ VERIFIED | Read in full — 12 exported pure functions, no Vue import, no `ref`/`computed`. |
| `app/data/spanish-hero-aliases.ts` | 23 human-reviewed Spanish aliases | ✓ VERIFIED | Exactly 23 entries, no `PENDIENTE`/`D-07: confirmar` markers remain, `she-hulk → Hulka` correction present with the recorded human verdict. |
| `app/components/VillainPickerModal.vue` | Modal, 3 entries + "Sin elegir", no filter, D-13 save-and-close | ✓ VERIFIED | Read in full — matches. |
| `app/components/PlayerModal.vue` | Modal, name field + hero filter + list, taken-by marker, D-09 no autofocus | ✓ VERIFIED | Read in full — matches, including the post-review select-on-focus improvement and the IN-02 empty-catalogue-vs-no-match distinction. |
| `app/components/StepScreen.vue` | Selection grid (1-column), non-clickable `⚠` line | ✓ VERIFIED | Grid renders only when `selectionRows` non-null/non-empty; `⚠` line is a plain `<p>`. |
| `app/pages/[game]/index.vue` | Full wiring: rows → modal → save → close+focus-return → shortcut suppression | ✓ VERIFIED | `onSelectRow` validates the row key (`villain` or `player-N` in range) before opening anything; `onDismissSelectionModal` returns focus; D-12 line confirmed (`hasActiveDetail: ... || activeSelectionModal.value !== null`). |
| `content/marvel-champions.json` | Exactly 1 line added (`"selection": "characters"`), 0 `text`/`speech` touched | ✓ VERIFIED | Re-run independently: `git diff -U0 e773f7c` → 1 added line, 0 removed lines, 0 text/speech matches. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `StepScreen.vue` row tap | `index.vue:onSelectRow` | `@select-row="onSelectRow"` emit | ✓ WIRED | Confirmed in template (`index.vue:691`). |
| `onSelectRow` | `VillainPickerModal`/`PlayerModal` mount | `activeSelectionModal` ref + `v-if` | ✓ WIRED | Both components mounted conditionally with correct props (`index.vue:732-749`). |
| `VillainPickerModal`/`PlayerModal` selection | `useGameSession` mutators | `onSelectVillain`/`onSelectHero`/`onPlayerNameInput` → `setVillain`/`setHero`/`setPlayerName` | ✓ WIRED | Handlers call the composable mutators directly, no intermediate state. |
| `useGameSession` mutators | `engine/selection.ts` | Direct function delegation + single `session.value =` reassignment | ✓ WIRED | Confirmed line-by-line, calqued on `next`/`prev`/`jumpTo`. |
| `session` ref | `localStorage` persistence | `watchDebounced(session, save, {debounce:300})` (non-deep) + `pagehide` flush | ✓ WIRED | Confirmed no `{deep:true}`; relies entirely on the mutators' reassignment discipline, which was independently verified. |
| `activeSelectionModal` | `useStepShortcuts` suppression (D-12) | `hasActiveDetail: activeDetail.value !== null \|\| activeSelectionModal.value !== null` | ✓ WIRED | Confirmed at `index.vue:573`; double-guarded further by `isEditableTarget` inside `resolveShortcutAction` in `useStepShortcuts.ts`. Regression test present in `useStepShortcuts.test.ts` (D-12). |

### Behavioral / Mechanical Spot-Checks (independently re-run, not taken from GATES.md)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full test suite | `npm test` | `Test Files 19 passed (19)` / `Tests 465 passed (465)` | ✓ PASS |
| Voice-drift gate (35 clips, unregenerated) | `npx vitest run --project engine engine/__tests__/voice-drift.test.ts` | `1 passed`, `8 passed` | ✓ PASS |
| Clip count matches manifest | `ls public/audio/*.m4a \| wc -l` vs `scripts/voice/manifest.json` | `35` both | ✓ PASS |
| Production build | `npm run build` | exit 0, `✨ Build complete!` | ✓ PASS |
| Static generation | `npm run generate` | exit 0, `✨ You can now deploy .output/public...` | ✓ PASS |
| Catalogue + Spanish aliases ship in bundle, no network | `grep -rl "captain-marvel"/"Bruja Escarlata" .output/public/_nuxt/` | Found in `_nuxt/UeKNFKXk.js` | ✓ PASS |
| Content diff — exactly 1 line, 0 text/speech | `git diff -U0 e773f7c -- content/marvel-champions.json` | 1 line added, 0 text/speech matches | ✓ PASS |
| `persistence.ts`/`usePersistedSession.ts`/`useStepShortcuts.ts` untouched | `git diff --name-only e773f7c -- <3 files>` | empty | ✓ PASS |
| `formatVersion` not bumped | `grep -n "formatVersion !== 1" engine/persistence.ts` | still `!== 1` | ✓ PASS |
| `contentVersion` unchanged | `grep -n "contentVersion" content/marvel-champions.json` | `13` | ✓ PASS |
| No dependency/test-env additions | `git diff --name-only e773f7c -- package.json package-lock.json vitest.config.ts` | empty | ✓ PASS |
| `zod` unreachable from `app/`, no `v-html` | `grep -rn "from 'zod'"/"v-html" app/` | empty (both) | ✓ PASS |
| Step-id not hardcoded in `app/` | `grep -rn "setup.heroes.01" app/` | empty | ✓ PASS |

### Data-Flow Trace (Level 4)

- `selectionRows`/`playerSlots`/`selectedVillainId` all trace back to `session.value.context` — real reactive state, not static/mock data. `resolvePlayerSlots`/`resolveVillainId` read `context.selection` (or normalize its absence), which is written exclusively by the three engine mutators. No hardcoded-empty prop passing was found at any call site (`selectionRows`/`duplicateWarningText` are computeds, not literals).
- `heroOptions`/`villainOptions` trace to `useCharacterCatalogue().getCatalogue(gameId)` → static import of `content/marvel-characters.json` (Phase 5's real, CI-validated 23-hero/3-villain catalogue) — not a stub, not an empty array (verified non-empty in the built bundle).
- **Status: FLOWING** for all data-bearing artifacts checked.

### Anti-Patterns Found

None. Scanned all 11 phase-6 touched/created files for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|not implemented|coming soon`; the only regex hits were false positives (substring matches inside unrelated Spanish prose — "TODOS", "TODO objeto" — not actual debt markers). No `return null`/empty-stub render paths found that aren't explicitly-designed defensive fallbacks (`findHeroOption`/`findVillainOption` returning `null` is the documented, tested defensive contract, not a stub).

### Independent Code Review / UI Review Findings

`06-REVIEW.md` (code review, standard depth, 17 files): 0 Critical, 1 Warning (WR-01, duplicated `maxlength` literal), 2 Info (IN-01 spec drift, IN-02 empty-state ambiguity). **All three fixed the same day**, verified in the current code: `PlayerModal.vue` now receives `nameMaxLength` as a prop sourced from `PLAYER_NAME_MAX_LENGTH` in `index.vue` (no duplicated literal); `06-UI-SPEC.md` amended for IN-01; `PlayerModal.vue` now distinguishes "no catalogue" from "no match" (IN-02).

`06-UI-REVIEW.md` (design audit, code-only — no dev server at audit time): 22/24, three priority warnings (keyboard-viewport risk, spec-drift copy, hero-row aria-label gap). **All three fixed same day**: `max-h-[80vh]→[80dvh]` on both modal panels (mitigation, real-device confirmation still pending — see Known Limitation below), IN-02 copy folded into `06-UI-SPEC.md`, `aria-label` added to hero rows in `PlayerModal.vue` (confirmed present at read time: `:aria-label="[hero.spanishName, ...].filter(Boolean).join(', ')"`).

### Human Verification

**Already complete — not a gap.** Per the task's explicit instruction, the user personally ran all 14 browser checks on 2026-09-08 (transcribed verdict in `06-07-SUMMARY.md`: "Aprobado! […] Por lo demás, funciona perfecto."), including the three checks no automated test can cover: D-12 keyboard-shortcut suppression while typing a name, the non-clickable repeated-hero `⚠`, and selection surviving a page reload. The user also reviewed all 23 Spanish aliases against the physical cards (`06-03-SUMMARY.md`), correcting one (`she-hulk → Hulka`).

**Outstanding, but explicitly non-blocking per ROADMAP.md:** verification on the group's actual table tablet — model and OS unknown since Phase 1 (DEV-01/DEV-02). All verification to date (code review, UI review, and the user's 14-item pass) was performed in a simulated laptop/tablet viewport, not physical hardware. Specifically still unconfirmed on real hardware:
- On-screen keyboard behavior against the modal panels' `max-h-[80dvh]` (mitigated from `80vh`, not device-tested).
- The deferred `select()` on the name-field focus handler, particularly its `setTimeout(0)` workaround for Safari iOS's gesture-cancellation behavior.
- Touch targets at arm's length on the actual tablet.

This is carried-forward v1.7 device debt (DEV-01/DEV-02), not something Phase 6 introduced, and the ROADMAP states explicitly it is not blocking for closing this phase.

### Gaps Summary

No gaps found. All 5 ROADMAP success criteria and all 9 SEL requirements are independently verified against the code (not SUMMARY claims), with hand-traced data flow, a fully re-run mechanical gate suite, and human verification already complete per the phase's own process. The one documentation lag noted (REQUIREMENTS.md checkboxes/table not yet marked "Satisfecho") is a bookkeeping item for the phase-closing commit, not a functional or contractual gap, and does not affect the status determination.

---

_Verified: 2026-09-08_
_Verifier: Claude (gsd-verifier)_
