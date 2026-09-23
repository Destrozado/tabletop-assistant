# Project Research Summary

**Project:** TableGameAssistant
**Domain:** Tablet-first, offline-capable, no-backend guided rules-flow assistant (Nuxt 4 PWA), starting with Marvel Champions LCG, Spanish TTS, later Warhammer 40.000
**Researched:** 2026-08-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a narrow, well-precedented product category once you separate the two things it is *not*: it is not a card database/deckbuilder (MC Companion, MC Card Codex), and it is not a game-state tracker (Gloomhaven Helper, jwtr/mcc). It is a **guided phase/step narrator** — the same shape as the 40k wargame turn trackers (40K Battle Flow, Wargame Toolbox), which independently validate "tappable flowchart + jump-to-step + persistent round/phase header" as a proven pattern in an adjacent domain, but nobody has built that shape for Marvel Champions, and nobody in either domain has paired it with voice narration done well. All four research tracks (stack, features, architecture, pitfalls) converge, unprompted, on the same build order: build a pure, framework-free step-flow engine first and prove its correctness (round-boundary wrap, jump-to-any-step, stale-save fallback) against a small fake fixture game, author real content and scaffold Nuxt in parallel, then wire up the Vue component layer, with speech synthesis, wake lock, and PWA/offline treated throughout as feature-detected progressive enhancements that must never block the core "Siguiente" flow. The recommended stack — Nuxt 4 + `nuxt generate` (not SPA mode), `@vite-pwa/nuxt` with `registerType: 'prompt'`, `@vueuse/core` for TTS/localStorage/wake-lock, Zod-validated JSON content instead of `@nuxt/content`, a plain composable instead of Pinia — is all off-the-shelf and low-risk; there is no exotic technology here.

The single biggest risk this project carries is not technical, it is **rules fidelity**. The pitfalls researcher went further than a literature review: it directly cross-checked the user's own hand-written Marvel Champions summary against the local official Rules Reference v1.7 PDF and found concrete, specific errors already baked into the draft content — the villain phase is 6 official steps, not 4; obligations are "one or more per identity," not exactly one per player; only the villain (and minions with the Villainous keyword) draw boost cards, not all minions; and the user's premise that "Expert Mode" changes villain-phase structure is itself wrong — that behavior belongs to Heroic Mode, a separate, combinable difficulty axis. Because this app's entire value proposition is "never open the rulebook," a confidently wrong step is worse than no app at all. This means rules verification cannot be a late QA pass bolted onto finished content — it must be its own dedicated phase, and the content schema must carry a per-step `source`/citation field (rules-reference page + section) from the very first version of the schema, not retrofitted later once dozens of steps already exist without provenance.

The recommended mitigation shape, synthesized across all four docs: Phase 1 builds and unit-tests the flow engine against a throwaway fixture (not real content) so the hardest correctness problem — round-boundary wrap-around, jump re-entry into the loop, and persistence fallback on a stale/mismatched save — is solved cheaply and fast, in parallel with a dedicated rules-verification pass over the existing draft using the checklist the pitfalls research already produced. TTS must be designed as a first-class content field (a short curated spoken line distinct from the long displayed text) from the schema's inception, because retrofitting "don't re-read the whole paragraph" and "don't repeat on back-navigation" onto content that already conflates displayed and spoken text is expensive — and because the closest real-world analog (Dized) is disliked specifically for getting this wrong. Several platform behaviors (Web Speech es-ES voice availability and the iOS gesture requirement, Wake Lock support/reliability, service-worker update flow) are well-documented in general but must be verified on the actual iPad the group owns, not assumed from desktop testing — and the target device/OS version is currently unknown, which the roadmap should resolve early. Finally, all of the user's Out of Scope decisions (no calculators, no live counters, no in-app rules lookup, no content editor, no multi-language) are independently corroborated by the features research as correct anti-features to hold the line on; the main scope-discipline risk is a natural pull toward adding "just a little" state tracking, or generalizing the engine for Warhammer 40k, before Marvel Champions has been validated end-to-end in a real playthrough.

## Key Findings

### Recommended Stack

Nuxt 4.5.2 (Nuxt 3 reached end-of-life 2026-07-31, so 4.x is now mandatory, not just a preference) built with `nuxi generate` (full static prerender), not `ssr: false` SPA mode — prerendering gives instant first paint and a clean, stable set of files for the service worker to precache, which matters directly for the offline requirement. `@vite-pwa/nuxt` (1.1.1) handles PWA/offline caching, configured with `registerType: 'prompt'` (never `'autoUpdate'`, which would silently reload mid-round) plus explicit `Cache-Control: no-cache` on `/sw.js` at the hosting layer to avoid the well-documented "stuck on a stale cached build" trap. `@vueuse/core`/`@vueuse/nuxt` (14.4.0) supplies SSR-safe reactive wrappers for the three hard browser-API requirements (`useSpeechSynthesis`, `useLocalStorage`, `useWakeLock`) without hand-rolling them, though the platform gotchas underneath (iOS gesture requirement, empty `getVoices()`, Wake Lock's release-on-hide behavior) are not solved by any wrapper and must be handled explicitly in app code. Content is plain typed JSON validated by Zod (4.4.3) in a Vitest suite that runs in CI — deliberately *not* `@nuxt/content`, whose validation is documented to skip in CI/non-interactive environments, the opposite of "fail loudly at build." State management is a single composable over `useLocalStorage`, not Pinia — this is one shallow, single-consumer state machine, and Pinia's value (multiple stores, devtools time-travel) has no payoff here. Recommended host: Netlify, for zero-config atomic static deploys and header control needed to defeat stale-service-worker caching (GitHub Pages is explicitly ruled out — it cannot set custom response headers at all).

**Core technologies:**
- Nuxt 4 (`nuxt generate`) — static, backend-less app framework; SSG output is what makes offline PWA caching clean
- `@vite-pwa/nuxt` + Workbox — offline caching with `registerType: 'prompt'` to avoid mid-session silent updates
- `@vueuse/core` (`useSpeechSynthesis`, `useLocalStorage`, `useWakeLock`) — reactive wrappers around the three hard browser APIs this app needs
- Zod + Vitest — build/CI-time content schema validation, so malformed game JSON fails the build, never reaches the table
- Plain composable (no Pinia) — the step-session state is a single shallow machine, not a multi-store app

### Expected Features

No existing product does exactly this — the closest analogs are 40k wargame phase-trackers (validating the guided-flow shape) and Dized (a cautionary tale on nearly every risk axis: intrusive monetization, robotic full-paragraph TTS, clunky multi-game navigation). Every dedicated Marvel Champions fan tool in the wild is either a card database/deckbuilder or a stat/HP/threat tracker — confirming that "just a narrator, not a tracker" is a real, deliberate fork in this ecosystem, not an oversight.

**Must have (table stakes):**
- Next/Back + jump-to-any-step with correct loop re-entry — validated directly by 40K Battle Flow's tappable-flowchart precedent
- Persistent, always-visible round + phase + step orientation header — no product studied gets away without this in a forever-looping flow
- Progress persistence across reload/lock — directly targets Gloomhaven Helper's most-cited failure (losing state)
- Large text, big tap targets, locked landscape, dark mode, wake lock — the single most-complained-about miss (Gloomhaven Helper, Descent app) when absent
- Offline PWA — matches the explicit wifi-can-drop-mid-session constraint

**Should have (differentiators):**
- TTS narration scoped to a short curated line per step, with an obvious mute toggle and cancel-never-queue on navigation — genuinely unattempted elsewhere; the standard to beat is Dized's badly-done version (robotic, repeats full paragraphs, no easy off switch)
- Difficulty/player-count-aware step text — no competitor personalizes text this way
- Content explicitly verified against the official Rules Reference before shipping — directly targets the "app disagrees with the rulebook" trust-killer

**Defer (v2+):**
- In-app rules/keyword quick-reference — add only if users still reach for the physical rulebook for things outside the turn structure
- Hero/scenario/modular-set selection in mini-setup
- Pre-generated high-quality audio, multi-language, any form of state/counter tracking — the last of these is rejected outright, not merely deferred

### Architecture Approach

A two-layer flow model: authors write a nested `game → section (repeats?) → phase → step` JSON tree (auditable line-by-line against the PDF), which a pure `flatten()` + `expand()` transformation turns into a flat, ordered runtime array with two precomputed integers (`loopStartIndex`/`loopEndIndex`) — navigation (`next`/`prev`/`jumpTo`) then operates only on that flat array, reducing the entire round-boundary/wrap correctness question to two `if` statements, fully unit-testable with plain objects and no framework. Player-count/difficulty adaptation is done via literal token substitution and variant text blocks — deliberately no formula evaluator or condition language, matching the "no calculation" philosophy and keeping content auditable. An `engine/` directory lives outside Nuxt's `app/` srcDir entirely (zero Vue/Nuxt/DOM imports), a thin composable layer is the only seam that knows both the engine and Vue reactivity exist, and presentational components stay dumb. Adding Warhammer 40k later is designed to require zero engine changes — just a new content file conforming to the same schema and a registry flip — as long as it fits the "one setup, one repeating round" shape already assumed (a documented, currently-hypothetical limitation).

**Major components:**
1. `engine/` (pure TypeScript: schema validation, flatten, expand, navigator, persistence/resume logic) — framework-free, unit-tested against a hand-written fixture game, not real content
2. `content/*.json` (hand-authored game definitions with per-step `citation`/`source` fields) — the auditable source of truth
3. `app/composables/` (`useGameContent`, `useGameSession`, `usePersistedSession`, `useSpeech`) — the sole seam between the pure engine and Vue reactivity
4. `app/components/` (`StepDisplay`, `NextPrevControls`, `StepIndexOverlay`, `MiniSetupForm`, `SpeechToggle`) — dumb, presentational, tablet-first

### Critical Pitfalls

1. **Rules-fidelity errors already present in the hand-written draft summary** — verified directly against the official Rules Reference v1.7 (villain phase is 6 steps not 4; obligations are one-or-more per identity, not one-per-player; only the villain/Villainous-keyword minions draw boost cards; "Expert Mode" does not change villain-phase structure, Heroic Mode does). Avoid by treating a dedicated line-by-line rules-verification phase (using the research's own checklist) as a hard prerequisite before content is considered fixed.
2. **No per-step provenance/citation** — without a `source: {doc, page, section}` field designed into the schema from day one, a wrong step becomes untraceable and expensive to retrofit later. Build this into the content schema in the same phase the schema itself is designed, not after content exists.
3. **Wrong step granularity for a one-tap flow** — too fine becomes an annoying tap-fest, too coarse buries the one forgettable detail inside a paragraph, recreating the exact problem the app exists to solve. Design one step = one unmistakable physical action, validated with a real playtest before content is called final.
4. **Web Speech API fails silently on the real tablet, not the dev laptop** — iOS requires the first `speak()` inside a user gesture; `getVoices()` can return empty; repeated calls queue instead of replace. Avoid by treating TTS as a progressive enhancement (app fully usable text-only if it fails), always calling `cancel()` before `speak()`, and testing specifically on the target iPad in Safari — not just desktop Chrome.
5. **Stale PWA cache stranding users on a broken/old build, and silent resume of a stale saved session** — both require explicit design: `registerType: 'prompt'` plus a deploy-v1-then-v2 acceptance test for the former; an explicit "continuar vs. empezar nueva" prompt (never silent auto-resume) plus content-version-aware fallback-to-session-start for the latter.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Flow Engine Core (framework-free)
**Rationale:** All three of the stack, architecture, and pitfalls research independently converge on this as the starting point — the round-boundary wrap, jump-to-step re-entry, and stale-save fallback logic are the highest-risk correctness problems in the whole project, and they are fully solvable and testable in isolation, in hours, against a hand-written 6-step fixture, before any real content or UI exists.
**Delivers:** `engine/` (types, Zod schema, flatten, expand, navigator, persistence/resume) with an exhaustive Vitest suite covering round-wrap, jump navigation, and version-mismatch/stale-save fallback.
**Addresses:** Jump-to-any-step navigation, round-loop correctness, persistence fallback (FEATURES.md P1 items).
**Avoids:** Pitfall 7 (SSR/hydration — decide client-only handling for stateful pieces early), Pitfall 8 (silent resume of stale session — build the resume-vs-new-game decision into `persistence.ts` from the start).

### Phase 2: Rules Verification + Content Authoring (parallel to Phase 1/3)
**Rationale:** The project's core risk is rules fidelity, not code; PROJECT.md's own requirement ("contenido verificado antes de fijarlo") and the pitfalls research's line-by-line PDF cross-check make this non-negotiable and separable from engine/UI work — it can run in parallel with Phase 1's fixture-based engine work since it doesn't depend on the engine being done.
**Delivers:** A verified Marvel Champions content JSON (conforming to the schema designed in Phase 1/3) with a `source`/citation on every rule-bearing step, checked against the specific corrections already identified (villain phase step count, boost-card eligibility, obligation cadence, Expert vs. Heroic Mode, nemesis-set handling, player/encounter deck depletion asymmetry, status-card timing).
**Addresses:** "Content verified against official rulebook" (FEATURES.md differentiator); directly resolves Pitfall 1 and Pitfall 2.
**Avoids:** Pitfall 10 (copyrighted verbatim text — author original short imperative steps, cite but don't quote).

### Phase 3: Nuxt Scaffold + Schema Wiring
**Rationale:** Needs Phase 1's schema/types to exist so the content shape is settled, but the routing/build skeleton itself is independent grunt work that can start immediately alongside Phase 1.
**Delivers:** Nuxt 4 project scaffold (`nuxi generate` target), `/` game-picker page, `/[game]` dynamic runner route, `nitro.prerender.routes` wired to `content/games-index.ts`, Tailwind v4 styling baseline.
**Uses:** Nuxt 4.5.2, `@tailwindcss/vite`, static JSON imports (not runtime fetch).
**Implements:** The routing/component-boundary shape from ARCHITECTURE.md §4.

### Phase 4: Composable/State Layer + Presentational Components
**Rationale:** Needs both the proven engine (Phase 1) and a scaffold to mount into (Phase 3); this is where the pure engine becomes an actual playable app.
**Delivers:** `useGameContent`, `useGameSession`, `usePersistedSession` composables; `StepDisplay`, `NextPrevControls`, `MiniSetupForm` components; a fully playable text-only Marvel Champions setup + round loop, walkable start to finish with real (verified) content from Phase 2.
**Addresses:** Persistent orientation header, mini-setup, tablet-first baseline (large text, tap targets, locked landscape, dark mode) — all FEATURES.md P1 items.
**Avoids:** Pitfall 3 (step granularity — this is the phase to playtest and adjust before content is "final").

### Phase 5: Progressive Enhancements — Speech, Wake Lock, Offline PWA
**Rationale:** All three (features research, architecture, stack) explicitly flag these as feature-detected additive layers that must never block the core flow, and each has real platform gotchas that only surface on the actual target hardware — so they belong after the core text-only flow is proven, and each needs its own hands-on-device verification rather than desktop-only testing.
**Delivers:** `useSpeech()` wired to a short curated per-step spoken field with mute toggle and cancel-before-speak; Wake Lock with visibility-based re-acquire; `@vite-pwa/nuxt` configured with `registerType: 'prompt'` and a verified deploy-v1-then-v2 update-prompt test; jump/index overlay (`StepIndexOverlay`).
**Addresses:** TTS differentiator, offline PWA, wake lock (FEATURES.md P1/differentiator items).
**Avoids:** Pitfall 4 (Web Speech silent failures), Pitfall 5 (stale cached build), Pitfall 6 (Wake Lock gaps on older/un-updated iPads).

### Phase Ordering Rationale

- The engine (Phase 1) and rules-verification/content (Phase 2) are independent research/implementation tracks that can run in parallel — neither blocks the other, and both must land before Phase 4 can produce a real, correct, playable experience. All three research docs (STACK, ARCHITECTURE, PITFALLS) independently arrived at this same "engine-first, content-parallel" ordering, which is a strong signal, not a coincidence.
- Progressive enhancements (speech, wake lock, offline) are deliberately sequenced last and treated as optional layers throughout, per explicit convergence across FEATURES, STACK, and PITFALLS research that none of these may become a hard blocker to the core "Siguiente" flow — this also means their platform-specific gotchas (iOS gesture requirement, Wake Lock's 16.4+/18.4-bugfix history, stale service-worker caching) don't threaten the critical path if they slip.
- Warhammer 40k content and any engine generalization beyond what Marvel Champions needs are explicitly excluded from this initial phase set — PITFALLS.md's Pitfall 9 recommends a hard milestone gate ("Marvel Champions engine validated via a real playthrough") before that work begins at all, and it is not part of the roadmap implications above by design.

### Research Flags

Needs research (`/gsd:plan-phase --research-phase <N>`):
- **Phase 2 (Rules Verification):** Domain-specific research already substantially done by PITFALLS.md's checklist, but each additional rules corner not yet covered (or any FAQ/errata beyond v1.7) will need the same PDF-grounded verification method repeated.
- **Phase 5 (Progressive Enhancements):** Needs on-device verification (target iPad model/OS currently unknown) for Web Speech es-ES voice availability, the iOS user-gesture requirement, Wake Lock support (16.4+, installed-PWA bug fixed only in 18.4), and the service-worker deploy-v1-then-v2 update flow — none of this can be confirmed on a development laptop.

Standard patterns (skip research-phase):
- **Phase 1 (Flow Engine Core):** Fully specified in ARCHITECTURE.md with pseudocode, TypeScript types, and a Zod schema sketch — implementation-ready.
- **Phase 3 (Nuxt Scaffold):** Documented, current, verified-live Nuxt 4/Tailwind v4/@vite-pwa/nuxt integration paths — standard, well-trodden setup.
- **Phase 4 (Composable/Component layer):** Straightforward Vue/Nuxt composable and component work following the architecture's documented component-boundary rules.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Package versions verified live via `npm view` and official docs on 2026-08-28; TTS/Wake Lock platform gotchas and the Netlify-vs-alternatives hosting call are WebSearch-derived and explicitly flagged as such within STACK.md |
| Features | MEDIUM-HIGH | Marvel Champions competitor landscape confirmed directly from app stores/GitHub (HIGH for named products); table-stakes tablet UX and TTS patterns cross-verified across multiple product categories; some app-store review sentiment is WebSearch-derived (MEDIUM) |
| Architecture | HIGH | Nuxt 4 structure/prerendering verified against current official docs (HIGH); the flow-model/schema design itself is original engineering synthesis, not a copied precedent — internally consistent and traced through explicit pseudocode, but no third-party reference implementation exists to benchmark against (flagged MEDIUM specifically for that novelty, not for correctness) |
| Pitfalls | HIGH | Rules-fidelity findings verified directly against the local official Rules Reference v1.7 PDF (HIGH, primary source); Web Speech/service-worker/Wake Lock pitfalls verified against MDN, Chromium/WebKit bug trackers, and multiple corroborating GitHub issues (HIGH/MEDIUM); Nuxt-specific hydration pitfalls verified against official docs + GitHub discussions (MEDIUM); legal/copyright section explicitly advisory only, not legal advice (LOW) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Target tablet model/OS version is unknown.** This blocks confident verification of Web Speech es-ES voice availability, the iOS TTS gesture requirement, Wake Lock support (a real functional gap exists before iOS 18.4 for installed PWAs), and general tap-target/legibility assumptions. Resolve early — ideally before or during Phase 5 planning — by identifying the actual iPad model and current OS version the group uses.
- **PROJECT.md's own content draft is known-inaccurate.** PROJECT.md states the existing summary has "Fase del villano (4 pasos)" — the pitfalls research confirms this is wrong (6 official steps) and flags several other concrete corrections (see Critical Pitfalls above and the full checklist in PITFALLS.md). The roadmap and PROJECT.md itself should be updated to reflect that the "existing summary" is a rough draft requiring correction, not a validated map of the flow, before content work treats it as ground truth.
- **Whether Marvel Champions has exactly one repeating round loop with no nested independent cycles** is assumed by the architecture and appears correct for the game as currently understood, but should be explicitly reconfirmed during Phase 2's rules verification, since the engine's `loopStartIndex`/`loopEndIndex` model depends on this holding.
- **Hosting choice (Netlify) is a reasoned trade-off, not a single-sourced fact** — fine to proceed on, but worth a quick sanity check (e.g., a throwaway deploy) early in Phase 5 rather than assuming zero friction.
- **`@vite-pwa/nuxt` compatibility with Nuxt 4.5.x** is inferred from version ranges rather than directly confirmed (STACK.md flags this as "verify in a throwaway `nuxi init` before committing if this becomes a blocker") — worth a five-minute spike at the start of Phase 3.

## Sources

### Primary (HIGH confidence)
- `mc_rulesreference_v17-compressed.pdf` (Marvel Champions Rules Reference v1.7), read directly via `pdftotext` — all rules-fidelity findings in PITFALLS.md
- npm registry (`npm view <pkg> version`), checked live 2026-08-28 — all package versions in STACK.md
- https://nuxt.com/docs/4.x/directory-structure, /getting-started/prerendering, /getting-started/deployment, /guide/best-practices/hydration — Nuxt 4 structure, SSG behavior, hydration guidance
- https://caniuse.com/wake-lock — Screen Wake Lock browser support table
- jwtr/mcc GitHub README — direct confirmation of the stat-tracker anti-feature category

### Secondary (MEDIUM confidence)
- vite-pwa-org.netlify.app, tailwindcss.com framework guides, vueuse.org — module/integration configuration details (WebFetch/WebSearch summarized)
- GitHub issues/discussions: `vite-pwa/vite-plugin-pwa`, `nuxt-community/pwa-module`, `vite-pwa/nuxt`, `nuxt/nuxt` #25500 — stale-service-worker and hydration-mismatch corroboration
- Chromium issue tracker, Mozilla Bugzilla #1522074, WebKit developer forum, weboutloud.io — Web Speech API cross-browser/platform gotchas
- App store listings and aggregated reviews for Dized, Gloomhaven Helper, Descent: Legends of the Dark, Mansions of Madness — competitor UX failure-mode evidence
- 2026 hosting comparison articles (danubedata.ro, pandastack.io, bootstrap.build) — Netlify/Cloudflare Pages/GitHub Pages trade-off synthesis

### Tertiary (LOW confidence)
- MC Companion / MC Card Codex app-store listings — limited page content retrieved, title/description-level only
- Marvel Champions Digital (kitze.io) prototype page — not publicly released, described secondhand
- Legal/copyright guidance in PITFALLS.md — explicitly advisory, not legal advice; revisit before any wider public distribution

---
*Research completed: 2026-08-28*
*Ready for roadmap: yes*
