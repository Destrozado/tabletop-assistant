---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
verified: 2026-09-08T18:00:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Durante la partida hay una banda fija con «Vida villano» y un contador por jugador, ajustable solo con ▲/▼, fácil de tocar (criterio de éxito nº 2; HP-03, HP-04, HP-10)"
    status: failed
    reason: "Empirically reproduced (independent Playwright measurement, not from SUMMARY/REVIEW claims): each cell's minimum content width (44px + 64px + 44px = 152px) exceeds the flex-shrunk cell width at 3+ players on any viewport narrower than ~760px landscape or in the project's own supported portrait viewports (412x915, 3-4 players). Adjacent cells' arrow buttons visually and hit-test overlap. A tap dead-center on the button labeled 'Subir vida de Jugador 1' is captured by document.elementFromPoint as 'Bajar vida de Jugador 2' and actually decrements Jugador 2 instead of incrementing Jugador 1 — confirmed end-to-end with real session values (5→4 on the wrong player, Jugador 1 unchanged). This silently corrupts life totals the group is relying on, directly contradicting the project's core constraint ('un asistente que guía mal es peor que no tener asistente') and the phase goal's explicit 'fácil de tocar'."
    artifacts:
      - path: "app/components/CounterBand.vue"
        issue: "Lines 55-88: cell is `flex-1 min-w-0` but its two arrow buttons (`min-w-11` = 44px each) plus the value `span` (`w-16 shrink-0` = 64px) form an irreducible 152px row with no `overflow-hidden` anywhere in the band, so overflowing content paints over the next sibling cell instead of being clipped."
      - path: "e2e/counter-band-height.spec.ts"
        issue: "The only narrow-viewport test (400x800, 3 players) asserts only vertical height (192px), number font-size, and row y-ordering — never horizontal fit (`scrollWidth <= clientWidth`) or pairwise button non-overlap, so this shipped undetected."
      - path: "e2e/portrait-usable.spec.ts"
        issue: "Covers 820x1180 and 412x915 but only with 2 players and never navigates as far as the round loop / counter band, so it never exercises the exact viewport+player-count combination that breaks."
      - path: ".planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-07-SUMMARY.md"
        issue: "Human verification (checkpoint, blocking) was performed only against ~1024x768 landscape simulated viewport — it never covered the phone-portrait viewport (412x915) that `e2e/portrait-usable.spec.ts` itself already treats as supported, so this defect was outside the scope of both the automated suite and the human check."
    missing:
      - "Cap the value span and remove/relax the hard 44px arrow minimum below the `sm:` breakpoint (or an equivalent fix) so cells never overflow into a sibling's hit-test area at any supported viewport/player-count combination."
      - "Add horizontal-fit and pairwise-non-overlap assertions to the e2e height/behavior specs, parameterized over player count 1-4, at both the narrow landscape range (640-760px) and the project's declared-supported portrait viewports (412x915, 820x1180)."
      - "Re-run the blocking human verification (or an equivalent automated check) at 412x915 once fixed, since the original approval never covered that viewport."
deferred: []
human_verification: []
---

# Phase 7: Banda de contadores y compatibilidad de sesión Verification Report

**Phase Goal:** Durante la partida hay una banda de contadores de vida siempre visible y fácil de tocar, precargada con los valores correctos, dentro de un presupuesto de altura decidido antes de construirla — y la sesión ampliada con selección y contadores convive sin corromperse con las partidas que la versión de v1.7 ya desplegada tiene guardadas ahora mismo en una tablet real.

**Verified:** 2026-09-08T18:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP §Phase 7 success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Presupuesto de altura de la banda (≤~15%) medido contra el viewport objetivo ANTES de construir el componente; nunca reduce el texto grande del paso | ✓ VERIFIED | `e2e/counter-band-height.spec.ts` measures 96px/768px = 12.5% both before (plan 01, `git log` shows it predates `CounterBand.vue`) and after mounting the real component; `main p.text-display` stays 40px in both runs. Re-ran `npx playwright test` myself: 24/24 pass, including these specs. |
| 2 | Banda fija con «Vida villano» + un contador por jugador, ajustable **solo** con ▲/▼, precargada correctamente (HP-03, HP-04, HP-05, HP-10) | ✗ **FAILED** | Precarga is correct (`computeInitialVillainHealth`/`computeInitialHeroHealth`, e2e "precarga la cifra correcta del catálogo" passes) and the ▲/▼-only mechanism is correct in isolation. But **"ajustable" and "fácil de tocar" are broken**: independently reproduced a tap on the visually-correct button hitting the wrong player's counter and silently changing the wrong life total, at viewports the project itself treats as supported. See gap detail below. |
| 3 | Un contador de héroe a 0 se marca derrotado sin bajar de 0, sin terminar partida ni abrir diálogo, y puede volver a subir | ✓ VERIFIED | `useGameSession.ts:71-77` (`defeated = health === 0`, single `DEFEATED_SUFFIX` literal), villain cell hardcoded `defeated: false` even at 0 (D-11). `e2e/counter-band-behavior.spec.ts` test "el tope en 0 marca SIN VIDA..." passed in my own run (24/24). |
| 4 | Recargar a mitad de partida conserva el valor exacto; ▲/▼ nunca avanza el paso ni cambia Espacio/Enter/← | ✓ VERIFIED | `useStepShortcuts.ts` D-17 comment + existing `BUTTON -> false` test unchanged; reload/persistence e2e test passed in my own run. D-20 reference-reassignment discipline confirmed by reading all four mutators in `engine/counters.ts` — every one reassigns `session`/`context`/`counters`/`heroHealth` fresh. |
| 5 | Partida guardada por v1.7 desplegada se reanuda sin corromperse; interfaz nueva se renderiza defensiva sin los campos nuevos | ✓ VERIFIED | `engine/__tests__/persistence.test.ts` has the `describe('D-21: resume() de una sesión persistida con forma de v1.7...')` block; `formatVersion` unchanged at 1; `engine/persistence.ts` not modified this phase (git diff confirms); `resolveCounters` validates by type, defaults to `length: 0`/`null` rather than throwing when fields are absent or malformed. |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `engine/types.ts` | `CounterState`, `SessionContext.counters?` | ✓ VERIFIED | Present, optional, additive; `formatVersion` untouched |
| `engine/counters.ts` | precarga + 4 mutadores puros | ✓ VERIFIED (substantive) — with WARNING | Exports match must_haves exactly. **WR-05 confirmed independently** (see below): a hand-edited `localStorage` with a non-integer `playerCount` (e.g. `2.5`) causes `incrementVillain`/`decrementVillain` to silently discard previously-frozen hero values (reproduced: `[5,7]` → `[]` after a single villain-only tap), because `resolveCounters`'s length guard and the mutators' own range guard use two different validity checks on the same field. This is a real, independently-reproduced bug, but requires manual `localStorage` tampering to trigger (not reachable through normal play), so it is reported as a WARNING rather than a blocking gap. |
| `app/composables/useGameSession.ts` | `showsCounterBand`, `counterCells`, mutadores | ✓ VERIFIED, WIRED | `sectionRepeats === true` drives visibility (grep confirms, not `ronda` id); no `~~/engine/*` import in any component |
| `app/components/CounterBand.vue` | banda pintada, celdas, feedback pulsado | ⚠️ **STUB-LIKE AT SCALE** — see CR-01 below | Renders correctly at exactly 1024×768 / ≤2 players. Breaks (wrong-target taps) at 3-4 players below ~760px and at the project's declared-supported portrait viewports. |
| `e2e/counter-band-height.spec.ts` / `counter-band-behavior.spec.ts` | height + behavior E2E | ✓ VERIFIED, but incomplete coverage | 24/24 pass (re-ran myself); never test horizontal fit or >2-3 players at narrow width — this blind spot is why CR-01 shipped. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/pages/[game]/index.vue` | `CounterBand.vue` | `v-if="showsCounterBand"` + `:cells` + `@increment`/`@decrement` | ✓ WIRED | Confirmed by grep and passing e2e |
| `engine/counters.ts` | `engine/selection.ts` | `resolvePlayerSlots`/`resolveVillainId` reuse | ✓ WIRED | Confirmed by import + read |
| `app/composables/useStepShortcuts.ts` | its test | `BUTTON -> false`, single test, D-17 comment | ✓ WIRED | Confirmed present, unique |

### Data-Flow Trace (Level 4)

`CounterBand.vue`'s `cells` prop is populated by `buildCounterCells` in `useGameSession.ts`, which reads `resolveCounterValues(session.value.context, catalogue.value)` — a real computed chain from persisted/live catalogue data, not a hardcoded or empty array. ✓ FLOWING. The defect (CR-01 below) is not a data-flow problem — the correct values genuinely reach the component; the failure is purely in the DOM geometry/hit-testing of that already-correct data.

### Independently Reproduced Findings (not taken from SUMMARY.md or 07-REVIEW.md — re-derived empirically with a standalone Playwright script against the live `nuxt generate` + `nuxi preview` build)

**CR-01 (BLOCKER) — Counter cells overlap at 3-4 players below ~760px, and a tap can silently change the wrong player's life total.**

Reproduced end-to-end with real session state (4-player game, Rhino, both `Jugador 1` and `Jugador 2` set to `5` at 1024×768, then resized to 412×915 — same page/session, no reload):

```
Narrow viewport (412x915). Center of "Subir vida de Jugador 1" button = (130, 208)
  -> document.elementFromPoint(130, 208) = "Bajar vida de Jugador 2"
Before tap: J1=5 J2=5
AFTER tapping dead-center of the button VISUALLY LABELED "Subir vida de Jugador 1": J1=5 J2=4
```

Jugador 1 (intended target) did not change; Jugador 2 (occluding sibling) silently decremented. Also confirmed at 700×800 with 4 players (three adjacent-pair overlaps, `Jugador 4`'s ▲ clipped 13px outside the band) and at 412×915 the same viewport `e2e/portrait-usable.spec.ts:68` already declares supported (three adjacent-pair overlaps of 39px each, `Jugador 4`'s ▲ entirely off-canvas: `x=417.8` against `clientWidth=412`).

Root cause: each cell (`▼` 44px + value `64px` + `▲` 44px = 152px irreducible) is `flex-1 min-w-0` with no `overflow-hidden`; below the width where 152px×N cells fit, buttons overflow visually into the next DOM sibling, which paints on top and wins hit-testing.

Neither `e2e/counter-band-height.spec.ts` (only checks vertical dimensions, only 3 players) nor `e2e/portrait-usable.spec.ts` (only 2 players, never reaches the round loop) nor the blocking human verification (07-07, explicitly scoped to ~1024×768 landscape only) exercises this combination.

**WR-05 (WARNING, independently confirmed) — corrupted `playerCount` silently discards frozen hero values.** See artifact table above; requires manual `localStorage` edit to trigger, not reachable in normal play.

**WR-02/WR-03 (WARNING, confirmed by direct code read of `CounterBand.vue`/`useStepShortcuts.ts`, not re-run empirically)** — pressed visual state has no `mouseleave`/`touchcancel`/`blur` handler (can stick indefinitely on real touch devices per `touchcancel`), and the ▼/▲ buttons are focusable (native `<button>`, no `tabindex="-1"`) but neither Space nor Enter can activate them because `isEditableTarget` returns `false` for `BUTTON` — a focusable-but-inoperable control (WCAG 2.1.1). Both match the independently-authored `07-REVIEW.md` (same commit range, same files, same line numbers verified by my own read of the current source) — the review's code-level claims here check out on inspection, not just on trust of its narrative.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| HP-01 | 07-04 | Banda fija y siempre visible durante la partida | ✓ SATISFIED | `showsCounterBand` derived from `sectionRepeats === true`; e2e "aparece en primera ronda" passes |
| HP-02 | 07-01/06 | Presupuesto ≤~15%, medido antes de implementar | ✓ SATISFIED | 96px/768px = 12.5%, measured pre- and post-build |
| HP-03 | 07-04 | Contador «Vida villano» + uno por jugador | ✗ **BLOCKED** | Structurally present, but see CR-01 — a per-player counter that can be silently mistargeted is not a working "un contador por jugador" |
| HP-04 | 07-02/06 | Ajuste solo con ▲/▼, sin teclado | ✗ **BLOCKED** (partial) | The ±1-only mechanism itself is correct (confirmed by test + code read); CR-01 breaks *which* counter actually receives the tap at 3-4 players below ~760px / at 412x915 |
| HP-05 | 07-02/04 | Precarga correcta según villano/héroe/nº jugadores | ✓ SATISFIED | `computeInitialVillainHealth`/`computeInitialHeroHealth`; e2e "precarga la cifra correcta del catálogo" passes |
| HP-06 | 07-02/04 | Contador a 0 marca derrotado, no termina partida | ✓ SATISFIED | Code + e2e confirmed |
| HP-07 | 07-02 | Derrotado puede volver a subir | ✓ SATISFIED | Code + e2e confirmed |
| HP-08 | 07-02/04/05 | Persistencia tras recarga | ✓ SATISFIED | D-20 reassignment discipline confirmed in all 4 mutators; reload e2e passes. WR-05 is a narrower, tampering-only edge case, noted separately. |
| HP-09 | 07-03/05 | ▲/▼ nunca avanza el paso; atajos igual que v1.7 | ✓ SATISFIED | D-17 comment + unique `BUTTON -> false` test; e2e confirms Space/← unaffected. WR-03 (focusable-but-inoperable) is an accessibility warning, not a functional regression of the shortcuts themselves. |
| HP-10 | 07-05/06/07 | Legible y accionable a un brazo de distancia | ✗ **BLOCKED** | Human verification approved this only at ~1024×768 landscape; the tap-target correctness genuinely fails at supported narrower/portrait viewports (CR-01) |
| COMP-01 | 07-03 | Campos nuevos no corrompen partida v1.7 | ✓ SATISFIED | D-21 test block; `formatVersion` untouched; `engine/persistence.ts` untouched |
| COMP-02 | 07-03 | Renderizado defensivo sin campos nuevos | ✓ SATISFIED | `resolveCounters` validates by type not presence; D-21 test covers missing-field case explicitly |

**Documentation note (not a functional gap):** `.planning/REQUIREMENTS.md` still shows `HP-01`, `HP-03`, `HP-05`, `COMP-01`, `COMP-02` as unchecked (`[ ]`) and the traceability table still marks all Phase 7 requirement rows `Pendiente`, even though the last relevant commit (`54b3810`) only checked off `HP-02/04/06/07/08/09/10`. This looks like an incomplete bookkeeping pass rather than a signal of missing work (HP-01/05/COMP-01/COMP-02 do check out above), but it means the requirements ledger cannot currently be trusted as a completion signal for this phase without cross-checking the code, which is exactly what this report had to do.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/components/CounterBand.vue` | 55 | `flex-1 min-w-0` cell with a 152px irreducible content minimum and no `overflow-hidden` | 🛑 Blocker | Root cause of CR-01 |
| `app/components/CounterBand.vue` | 63-66, 81-84 | Pressed-state cleared only on same-element `mouseup`/`touchend`, no `mouseleave`/`touchcancel`/`blur` | ⚠️ Warning | Can stick indefinitely on real touch input |
| `app/composables/useStepShortcuts.ts` + `CounterBand.vue` | 68-90 / 58, 76 | Counter arrows are in the tab order (no `tabindex="-1"`) but neither Space nor Enter activates them | ⚠️ Warning | Focusable-but-inoperable control (WCAG 2.1.1) |
| `engine/counters.ts` | 144, 162 vs. `resolveCounters:55-57` | Two different validity checks on the same `context.playerCount` field (raw vs. `Number.isInteger && >0`) | ⚠️ Warning | Confirmed: silently discards frozen hero values under a hand-edited non-integer `playerCount` |

No `TBD`/`FIXME`/`XXX`/unresolved `TODO` markers found in any file modified by this phase.

### Human Verification Required

None required as a *new* ask — the failure mode above (CR-01) is fully reproducible by automation and does not need a human judgment call. It should be fixed and covered by an automated regression (horizontal-fit + non-overlap assertions, parameterized over player count and the project's declared-supported viewports), and only re-run through the existing blocking human-verify step at 412×915 as a confirmation, not as new exploratory testing.

### Gaps Summary

The engine and compatibility layers (`engine/counters.ts`, `engine/persistence.ts`, `useGameSession.ts`) are solid: precarga, defeat marking, reload persistence, reference-reassignment discipline, and v1.7 compatibility all check out against independent re-testing (514/514 vitest, 24/24 e2e both re-run myself) and direct code reading, not just against SUMMARY.md narrative.

The phase fails on its own explicit "fácil de tocar" goal clause and on HP-03/HP-04/HP-10: `CounterBand.vue`'s fixed-minimum-width cells overlap and mis-hit-test at exactly the player counts (3-4) and viewports (412×915, and the 640-760px landscape band) the app is supposed to support, silently changing the wrong player's life total on a tap that visually looks correct. This was independently reproduced end-to-end (not inferred from Tailwind classes, not taken from `07-REVIEW.md`'s narrative — re-measured with `getBoundingClientRect()`/`elementFromPoint()`/real session state myself) and is a data-corrupting UI bug, which the project's own core value statement treats as worse than having no assistant at all. Neither the automated E2E suite nor the blocking human-verification step (scoped only to 1024×768 landscape) caught it, because neither tested the failing viewport/player-count combination.

A closure plan should: (1) fix the cell layout so no adjacent-button overlap is possible at any supported viewport/player-count combination, (2) add the missing horizontal-fit/non-overlap e2e assertions parameterized over player count, and (3) re-run the human-verify checkpoint at 412×915 once fixed. WR-05 (corrupted `playerCount` discards frozen hero values) and WR-02/WR-03 (stuck press state, keyboard trap) are real but lower-severity and can be folded into the same or a follow-up closure plan.

---

_Verified: 2026-09-08T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
