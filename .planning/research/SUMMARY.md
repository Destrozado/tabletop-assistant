# Project Research Summary

**Project:** TableGameAssistant — v1.8 "Elección de personajes, contadores en mesa e histórico de partidas"
**Domain:** Feature milestone on an already-shipped Nuxt 4 SSG/PWA board-game companion (character selection, live HP counters, game-history log with cloud backup) — not a greenfield build
**Researched:** 2026-09-07
**Confidence:** MEDIUM-HIGH overall — codebase-grounded claims (architecture, pitfalls tied to actual files) are HIGH confidence; Firestore SDK behavior and MarvelCDB API details are MEDIUM (WebSearch/WebFetch-verified, not hands-on tested in this repo); rules claims were checked directly against the local Rules Reference v1.7 PDF and are HIGH confidence but still require the project's own D-36 human sign-off before being encoded as behavior.

## Executive Summary

This milestone bolts three genuinely new capabilities onto a working, in-active-use app: per-player hero/villain selection with a filtered picker, a fixed on-screen HP counter band (villain + up to 4 heroes) with prefilled starting values, and a persistent win/loss history with a free Firestore backup and a two-metric stats screen. None of this is a rewrite — all four research files converge on the same finding: almost everything slots into existing seams (`SessionContext`'s open index signature, the existing debounced-save/resume machinery, the existing `text`/`speech` separation, the existing single-localStorage-seam composable) with additive, non-breaking changes. The stack is settled (`firebase` 12.18.0 modular SDK, no `vuefire`, no charting library, no stepper library, a plain dev-time Node script against MarvelCDB's real public API) and the feature scope is disciplined (two stats percentages, not a rating system; villain HP + hero HP only, not threat/status tracking; a soft warning not a hard block on duplicate heroes).

The single largest open architectural question — and the one place research disagrees with itself — is **how Firestore's offline durability should be implemented**: enable Firestore's own built-in IndexedDB offline queue (STACK.md's recommendation, less code) or hand-roll a `syncedToFirestore` retry flag in localStorage and never touch Firestore's own persistence (ARCHITECTURE.md's recommendation, no new IndexedDB store, full control). This is a named decision below, not smoothed over — see "Decision Required" in Roadmap Implications. Independent of which option wins, one constraint holds unconditionally and is the single most dangerous default to get wrong: Firestore write promises resolve only on server ACK, never on local cache write, so `await`ing one in the end-of-game handler hangs forever offline — the write must be fire-and-forget, always, with localStorage as the synchronous, blocking source of truth.

The second-largest risk isn't technical at all: the counter band is new UI competing for the exact screen real estate the app's entire core value (large, readable text at arm's length) depends on, and it needs an explicit height budget decided before implementation, not eyeballed against a laptop mockup. Close behind are two rules-fidelity traps that are easy to get backwards from what "feels right": a hero at 0 HP does **not** end a Marvel Champions game (confirmed directly against the local Rules Reference), and blocking duplicate hero picks is **not** a written rule (the RR is silent — recommend a soft warning per this project's own D-32 pattern, never a hard block). FEATURES.md closes with 17 concrete undecided behavior questions that gate real implementation choices; four of them — what happens at 0 HP, whether duplicate heroes are blocked, when the duration clock starts, and whether "Partida terminada" always forces a win/loss/abandoned choice — change the shape of entire phases and should be resolved before roadmap phases are locked, not discovered mid-build.

## Key Findings

### Recommended Stack

The existing stack (Nuxt 4.5.2, `@vite-pwa/nuxt`, `@vueuse/core`, Tailwind v4, Zod, Vitest/Playwright) is unchanged. Three new pieces are added, all confirmed via npm registry / official docs / live API calls:

**Core technologies:**
- `firebase` 12.18.0, bare modular SDK (`firebase/app` + `firebase/firestore`, full — not `firestore/lite`, + `firebase/auth` for anonymous sign-in) — chosen because the offline mutation queue is exactly why Firestore was picked over Supabase; `firestore/lite` deliberately omits that queue and would silently defeat the whole rationale. `nuxt-vuefire`/`vuefire` are current and not abandoned, but their value (SSR reactive bindings, SSR auth requiring `firebase-admin` + a service account) targets a server-rendered app; this is `nuxt generate` with no runtime server, and the actual need is two calls (`addDoc`/`getDocs`) — bare SDK is less code. `@nuxtjs/firebase` is abandoned (last release 2022) and must not be used.
- Firestore Security Rules (`rules_version = '2'`), deployed via `firebase-tools` CLI (dev-only, not a project dependency) — the real security boundary; the public API key in the bundle is not a secret and is safe to commit.
- No new dependency for the counter UI (plain Vue `ref`/`computed` + Tailwind) and none for the stats screen (a `reduce()` over a small array + Tailwind bars) — a charting library or stepper library would be pure bytes for a dataset of dozens of rows and single-digit HP swings.
- A plain, zero-dependency Node script (`scripts/marvelcdb/fetch-catalogue.mjs`, Node 18+ global `fetch`) hits MarvelCDB's real public API (`/api/public/cards/{pack}.json`, no key required, confirmed live) and writes a committed, Zod-validated catalogue JSON — never a runtime fetch, which would break the offline constraint outright.

Both Firebase pieces must be **client-only and lazy-loaded** (dynamic `import()` inside a `.client.ts`-suffixed file, triggered only when a game ends or the stats screen opens) — never a static top-level import, and never touched during the SSG prerender pass, since the full Firestore slice is a non-trivial ~61 KB gzipped and does nothing for first paint of the setup screen.

### Expected Features

**Must have (table stakes):**
- Tap-a-slot → modal → filtered list picker for villain (3, no filter) and hero (18, filter by name **and** alter-ego, accent-insensitive) — reuses the existing `WarningDetailModal.vue` interaction shape, no new UI language
- Optional editable player name, default "Jugador N"
- Fixed always-visible counter band, ▲▼ steppers only, no keyboard, 44–48px touch targets, disable (not hide) at bounds, prefilled from the catalogue + selection + player count
- Parenthetical known values in step text ("…al valor indicado (14)") — this is new engine/schema surface (no existing value-slot concept), not a content-only edit
- Win/loss result capture with the full field set (villano, héroes, nombres, fecha, dificultad, nº jugadores, duración, rondas), persisted to localStorage, backed up to Firestore
- Basic stats screen: win % per hero, win % per villain
- Edit/delete a mis-logged history entry — not named explicitly in the milestone but cheap and expected by every comparable app (BG Stats, Board Games Tracker)

**Should have (near-zero marginal cost once result-capture UI exists):**
- Loss reason captured (scheme completed vs. all heroes eliminated) — a genuine, RAW-grounded differentiator no comparable app tracks
- Distinct "abandoned/unfinished" outcome for a session that never reached a real win/loss
- Soft, dismissible warning (not a hard block) on duplicate hero selection, once the rules question gets human sign-off

**Defer (v2+):**
- Per-player win rate / streaks / per-difficulty breakdown — for a fixed 4-person co-op group, this is nearly identical to overall win rate and reads as vanity metrics
- Recently-used ordering in the picker, press-and-hold stepper repeat — real but minor polish, safe to add after first ship
- Module/aspect selection with auto-filtering, deck-builder features, live multi-device sync, gamification/badges/ELO, a numeric-keyboard counter fallback, freeform hero/villain text entry — all explicitly identified as anti-features for this app's scope and constraints

### Architecture Approach

Almost nothing needs a new subsystem. New game-in-progress state (`selection`, `counters`, `startedAt`) extends `SessionContext`'s existing open index signature and rides the existing debounced-save/resume machinery for free — no new persistence plumbing. A new optional `showsValue` field on `TextBlock`/`StepDefinition`, resolved by a brand-new pure `engine/valueDisplay.ts` and surfaced only through a new `displayText` computed, keeps the number-in-parentheses feature structurally invisible to the voice pipeline and the voice-drift test gate, because it never touches `text` or `speech`. History gets a new, separate, append-only localStorage key (extending `usePersistedSession.ts`, the app's one declared localStorage seam) that survives "Partida terminada" clearing the game-session key, exactly mirroring how the existing `VOICE_KEY` already survives it. The hero/villain catalogue is a new, statically-imported, Zod-validated committed JSON file (`content/marvel-characters.json`) — same pattern as the existing game content, automatically covered by the existing Workbox glob with zero new PWA configuration. Firestore sits behind a new, lazily-imported, client-only composable invoked only at the history-write hook — a one-directional, write-only boundary; the app never reads Firestore at runtime in this milestone.

**Major components (new):**
1. `content/marvel-characters.json` + `engine/catalogueSchema.ts` + `useCharacterCatalogue.ts` — the numeric ground truth for pickers and counters
2. `HeroVillainPicker.vue` + `SessionContext.selection` — per-player identity selection, feeding everything downstream
3. `CounterBand.vue` + `SessionContext.counters` — the fixed HP band, depends on (2)
4. `engine/valueDisplay.ts` + `showsValue` schema field — parenthetical numbers, depends on (1)+(2), independent of (3)
5. `engine/history.ts` + `usePersistedSession.ts` extensions + `estadisticas.vue` — result capture and stats, entirely functional offline before Firestore is touched
6. `useHistorySync.client.ts` — lazy Firestore mirror, strictly last, app remains fully functional if this chunk fails or is deferred

### Critical Pitfalls

1. **Interpolating the known number directly into `step.text`/`speech`** instead of a separate render-time overlay — the "obvious" fix breaks the voice-drift test and, if "fixed" by regenerating clips, spends real money regenerating a clip for a number that's only known after hero/villain selection and can never be pregenerated correctly. Avoid by adding a genuinely separate `showsValue`-driven display layer that `engine/audio.ts` and `resolveText()` never read.
2. **`await`ing a Firestore write in a UI click handler** hangs the end-of-game confirmation forever when offline, because Firestore write promises resolve only on server ACK, never on local cache write. Always fire-and-forget with `.catch()`; localStorage is the synchronous source of truth.
3. **Extending the persisted session shape without a version bump** silently corrupts or blank-defaults an in-progress saved game on a currently-in-use tablet the moment v1.8 ships alongside a v1.7-shaped save. Treat counters/selection persistence as a `formatVersion: 2` change with an explicit old-shape-through-`resume()` test, not an incremental patch.
4. **The counter band shrinking the big step text** — the single biggest threat to the app's stated core value, because nothing in the existing layout has a "never exceed N% of viewport" concept for a new persistent-chrome element. Needs an explicit, tested height budget before implementation, not an eyeballed one.
5. **Open Firestore security rules** (`if true` on write) on a public repo turn "no auth" into a quota-exhaustion and junk-data risk (bounded, not a data breach, but real) — ship shape-validated, create-only rules from day one, never `update`/`delete`.
6. **The dual-source-of-truth trap**: the moment any screen reads from Firestore even partially, every classic sync-engine problem (duplication, ordering, partial sync) reappears without anyone deciding to build a sync engine. **The stats screen must read localStorage only, never Firestore** — this should be a phase success criterion, not a footnote.

## Decision Required: Firestore Offline Persistence Mechanism

**This is the single most consequential open technical decision of this milestone, and the two research files disagree on it. Present here for the user/roadmapper to decide explicitly — do not let it default silently to either option.**

| | Option A — Firestore's built-in offline queue (STACK.md) | Option B — Hand-rolled retry flag (ARCHITECTURE.md) |
|---|---|---|
| **Mechanism** | `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) })`. Firestore's SDK queues offline writes in its own IndexedDB store and auto-flushes on reconnect, surviving a page reload. | Never call `persistentLocalCache`/`enableIndexedDbPersistence`. Add a `syncedToFirestore: boolean` flag to each localStorage history entry; a fire-and-forget mirror write attempts the sync at write time; an opportunistic `flushPending()` (triggered by an `online` event or the next app start) retries unsynced entries. |
| **Code owned by this project** | Minimal — one config object, trust the SDK | The retry/flush logic itself — small but real, and now a thing this project must get right and test |
| **New browser storage** | A second IndexedDB store, living alongside the existing Workbox service worker's own caches | None — stays consistent with the project's existing explicit "no IndexedDB" stance (already rejected for the app's own progress persistence) |
| **Bundle/runtime cost** | Pulls in Firestore's persistence machinery for a feature that writes a handful of tiny documents per month | No additional SDK surface beyond the bare write/read calls |
| **Failure mode if it silently doesn't work** | Firestore's own persistence can fail to initialize (private/incognito mode, multi-tab contention, first-cold-load-offline) and silently fall back to memory-only cache — an offline queued write is then lost on tab close, with no error surfaced, unless the init promise's rejection is explicitly checked (PITFALLS.md Pitfall 7) | A missed `flushPending()` trigger just means a `syncedToFirestore: false` entry sits unsynced longer — visible, inspectable, no silent data loss since localStorage already has it |
| **Testability** | Requires mocking/exercising a real SDK persistence layer | Trivially unit-testable as plain functions (mirrors this project's existing pure-function-testing philosophy) |

**What both agree on, unconditionally:** Firestore write promises resolve only on server ACK, never on local cache write — `await`ing one in the end-of-game handler hangs forever offline (Critical Pitfall 2 above). This holds regardless of which option is chosen; the write must always be fire-and-forget.

**Recommendation, stated as a recommendation, not a settled fact:** lean toward **Option B (hand-rolled flag)** for this specific milestone, because it keeps the project's own explicit "no IndexedDB, no dependency for a job this small" philosophy internally consistent (the same reasoning already used to reject IndexedDB for the app's own progress and to reject Pinia), it fails visibly rather than silently, and Firestore here is explicitly a low-volume, best-effort backup — not a feature that needs the SDK's full sync-engine sophistication. Option A is the better choice only if minimizing new code is weighted above architectural consistency with the app's existing storage philosophy. **This should be confirmed with the user before Chunk 6 (Firestore Backup) is planned in detail** — both are defensible, and the roadmapper should not silently pick one.

## Implications for Roadmap

Based on combined research (ARCHITECTURE.md's dependency graph and PITFALLS.md's phase groupings converge on the same order), suggested phase structure:

### Phase 1: Catalogue & Data Foundation
**Rationale:** Everything else (picker contents, counter prefill values, parenthetical numbers) reads from this; it has zero dependency on session state or UI and is fully testable via Vitest alone.
**Delivers:** `content/marvel-characters.json`, `engine/catalogueSchema.ts`, `engine/__tests__/characters.test.ts`, `useCharacterCatalogue.ts`, the re-runnable `scripts/marvelcdb/fetch-catalogue.mjs`.
**Addresses:** "Catálogo de datos de los 18 héroes y 3 villanos" from PROJECT.md.
**Avoids:** Pitfall 10 (flattened villain HP — schema must model stage × player-count from the start), Pitfall 11 (non-reproducible one-off scrape), Pitfall 12 (accidentally committing copyrighted card text/art via a wholesale API-response dump — explicit field allow-list required), Pitfall 9 (must be a static import, never a runtime `fetch()`, to stay Workbox-covered and offline-safe).

### Phase 2: Character Selection
**Rationale:** Depends on Phase 1 for names/ids to populate the picker; everything downstream (counters, parenthetical values, history) needs to know who's playing before it can do anything.
**Delivers:** `SessionContext.selection`, selection mutator functions in `useGameSession.ts`, `HeroVillainPicker.vue`, wiring at `setup.heroes.01`.
**Addresses:** Villano/héroe picker with filter-by-name-and-alter-ego, accent-insensitive matching, optional player names.
**Avoids:** Scope creep into scenario/modular-set selection (explicitly deferred per PROJECT.md); asserting duplicate-hero blocking as a hard rule when the Rules Reference is silent (soft warning only, per D-32 pattern).
**Requires a decision before this phase starts:** can the group proceed past `setup.heroes.01` with slots unpicked, and is duplicate-hero picking blocked, warned, or unrestricted?

### Phase 3: Counter Band (can run in parallel with Phase 4 once Phase 2 lands)
**Rationale:** Needs the selection (who/how many players) and the catalogue (starting HP values) to prefill correctly.
**Delivers:** `SessionContext.counters`, counter mutator, `CounterBand.vue`, wiring into the round-loop rendering, an explicit measured height budget.
**Addresses:** "Banda de contadores fija durante la partida" with ▲▼, no keyboard, prefilled values.
**Avoids:** Pitfall 4 (counter band shrinking step text — needs a real-device/reference-viewport check before done), Pitfall 13 (touch-UX regressions: mis-taps, runaway hold-repeat, ghost double-counts on iOS Safari — reuse `NavBand.vue`'s existing press-state/action split), Pitfall 3 (persisted-shape version bump required for counters to survive resume correctly).
**Requires decisions before this phase starts:** behavior at 0 HP for heroes (does NOT end the game per Rules Reference — must not trigger game-over) and for villain HP (passive stop, or a prompt?); clamping behavior at 0 and at max; whether press-and-hold repeat is in scope for launch.

### Phase 4: Parenthetical Known Values (can run in parallel with Phase 3 once Phase 2 lands)
**Rationale:** Depends on Phase 1 (catalogue numbers) and Phase 2 (selection), not on Phase 3 — the three concrete steps this applies to all read static setup-time values, not live counters.
**Delivers:** New `showsValue` field on `TextBlock`/`StepDefinition`, `engine/valueDisplay.ts` + tests, `displayText` computed in `useGameSession.ts`, `StepScreen` prop rebind.
**Addresses:** "los pasos que citan un valor lo muestran entre paréntesis."
**Avoids:** Pitfall 1 (the single most expensive mistake in this milestone — never touch `text`/`speech`, verify `voice-drift.test.ts` and `collectSpeechEntries()` output are byte-identical before/after).
**Requires a decision before this phase starts:** `setup.heroes.03` and `ronda.jugadores.02` are shared steps whose value differs per player — the milestone's own "(14)" example only covers the single-shared-value villain-health case; the per-player display format (e.g. "Jugador 1: 10 · Jugador 2: 8") is unresolved and must be pinned down here, not discovered mid-implementation.

### Phase 5: History & Statistics
**Rationale:** Depends on Phases 2/3 for the data it records, but the pure functions (`buildHistoryEntry`, aggregation) can be built and unit-tested against hand-built fixtures before the UI is fully wired — don't block this on the others' UI work. Must ship and be fully verified **entirely offline, zero Firestore involvement**, before Phase 6 is touched.
**Delivers:** `HISTORY_KEY` + `appendHistoryEntry`/`loadHistory` in `usePersistedSession.ts`, the outcome-choice UI inserted into the existing `onEndGameConfirm` flow, `engine/history.ts`, `engine/statistics.ts`, `app/pages/estadisticas.vue`.
**Addresses:** Result capture (win/loss/+recommended loss-reason/+recommended abandoned), persistent history, basic stats screen.
**Avoids:** Pitfall 8's stats-screen half (stats reads localStorage only — this is the phase where that rule must be enforced structurally, not just documented) and Pitfall 3's history-adjacent shape risk.
**Requires decisions before this phase starts:** does "Partida terminada" always force a win/loss/abandoned choice, or can it be dismissed? Is loss reason required, optional, or v2? When does the duration clock start, and does "rondas jugadas" report the in-progress round as N or N-1 if the game ends mid-round? Is edit/delete of a past entry in scope for launch (research recommends yes — cheap, and a permanently wrong entry is worse UX than the build cost)?

### Phase 6: Firestore Backup
**Rationale:** Strictly last; depends only on Phase 5's `appendHistoryEntry` call site existing as the hook point. If deferred or if it fails entirely in production, Phases 1-5 remain fully functional — this is the one chunk touching network/third-party config.
**Delivers:** `firebase` dependency (dynamically imported only), `useHistorySync.client.ts`, Firestore Security Rules, runtime config, the resolved offline-persistence mechanism from the Decision Required section above.
**Addresses:** "Firebase Firestore gratis como respaldo duradero."
**Avoids:** Pitfall 2 (never `await` the write), Pitfall 5 (open security rules — write rules before the first real deploy, not after "it works"), Pitfall 6 (eager SDK import blocking first paint), Pitfall 7 (silent persistence-init failure, if Option A is chosen), Pitfall 8's write-idempotency half (client-generated ids + `setDoc`, not `addDoc`, to make retried writes idempotent regardless of which offline-persistence option is chosen).
**Requires the Decision Required resolved** before implementation, and a manual/e2e offline check (extending `e2e/offline-flow.spec.ts`) confirming no stall on the end-of-game confirmation with wifi off.

### Phase Ordering Rationale

- Catalogue-first is forced by data dependency: nothing else can prefill a real number without it.
- Selection before counters/values is forced by the same logic one level up: you can't prefill a hero's HP before you know which hero was picked.
- Counters and parenthetical values are architecturally independent of each other (verified by reading the actual content — the three `showsValue` steps read static setup values, not live counters) and can be built in parallel once selection lands, shortening the critical path.
- History/stats is deliberately sequenced to be fully correct and verified **offline before Firestore exists at all** — this directly avoids Pitfall 8 (dual-source-of-truth) by construction: the localStorage-only stats screen is built and tested before there's even a Firestore write to accidentally read from.
- Firestore is last and isolated specifically so that a failure, delay, or scope cut on that one phase cannot regress anything else — matches this project's own established pattern of never letting an enhancement become a blocker for core function.
- Every phase should restate the standing "don't add threat/status counters, don't add scenario selection, don't add accounts, don't add a catalogue editor UI" exclusions (Pitfall 14) — these are the natural, feature-adjacent temptations of exactly the infrastructure each phase builds, not a one-time reminder.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Parenthetical Known Values):** the per-player-list display format is a genuine, unresolved UX/content design question (not just an implementation detail) — needs its own small design pass before content-JSON tagging begins.
- **Phase 6 (Firestore Backup):** the Decision Required (built-in queue vs. hand-rolled flag) must be resolved with the user first; whichever option is chosen, the specific retry/flush design or the `persistentLocalCache` failure-handling design needs to be worked out in phase planning, not assumed from this summary.

Phases with standard, well-documented patterns (research-phase during planning likely unnecessary):
- **Phase 1 (Catalogue):** MarvelCDB API shape is directly verified (live `curl` calls), the Zod/Vitest content-validation pattern already exists in this codebase and is being copied, not invented.
- **Phase 2 (Character Selection) and Phase 3 (Counter Band):** touch-target sizing, filter/picker UX, and stepper interaction patterns are extremely well-documented (HIG/Material/NN-g convergence) and the codebase already has directly reusable precedent (`WarningDetailModal.vue`, `NavBand.vue`'s press/action split).
- **Phase 5 (History & Statistics):** the field set and localStorage-seam extension pattern are both already established in this exact codebase; only the specific product-behavior decisions (listed above) need resolving, not further research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH for versions/API shape (npm registry + official docs + live MarvelCDB API calls); MEDIUM for exact bundle-size figures (single 2023-dated source, not re-measured this session) |
| Features | MEDIUM-HIGH — UX/stepper/picker patterns cross-verified across multiple sources; Marvel Champions rules claims checked directly against the local Rules Reference v1.7 PDF (HIGH); direct MC-specific competitor apps only reachable via search-result summaries, not live-tested (MEDIUM) |
| Architecture | HIGH — every claim grounded in a direct read of this repo's actual files with cited path:line references; Firestore SDK behavioral claims are MEDIUM (reasoned/WebSearch-verified, not hands-on tested in this repo) |
| Pitfalls | Mixed by pitfall — codebase-grounded pitfalls (voice-drift, persistence versioning, layout) are HIGH; Firestore behavioral pitfalls are MEDIUM (cross-checked GitHub issues + official docs); MarvelCDB legal/API pitfalls are MEDIUM (one official page, no hands-on API test of edge cases) |

**Overall confidence:** MEDIUM-HIGH — high enough to roadmap directly, with the Firestore persistence mechanism, the per-player value-display format, and the 17 open behavior questions flagged as items to resolve during phase/requirements planning rather than research gaps.

### Gaps to Address

- **Firestore offline-persistence mechanism (built-in queue vs. hand-rolled flag):** genuine, named disagreement between STACK.md and ARCHITECTURE.md — must be decided with the user before Phase 6 is planned in detail (see Decision Required section above).
- **`setup.heroes.03` / `ronda.jugadores.02` per-player value display format:** no existing pattern in this app or in the milestone's own "(14)" example covers a per-player-varying value read once for the whole table — needs a small design decision before Phase 4.
- **`contentVersion`/`formatVersion` resume-gate blind spot:** confirmed as a real gap in already-shipped code, not hypothetical — `isValidContext` only checks `playerCount`/`difficulty`, so a resumed session (old-shape or freshly-created-but-not-yet-selected) can return with `selection`/`counters` undefined regardless of version bumps. Every UI that reads these fields (picker, counter band, `displayText`) must render defensively by construction, and this should be an explicit test case, not an assumption.
- **17 open behavior questions in FEATURES.md** (full list in that file) — the four with the largest scope impact are: (1) does a hero/villain HP counter hitting 0 do anything beyond stopping there, (2) is duplicate-hero selection blocked/warned/unrestricted, (3) does "Partida terminada" always force an outcome choice or can it be dismissed, (4) when does the duration clock start and how is an in-progress round counted at game-end. These should be resolved during requirements/roadmap definition, not left for implementers to guess.
- **Counter band height budget:** no number exists yet ("≤15% of viewport" is this research's suggestion, not a decided constraint) — needs to be decided and tested against a reference tablet viewport before Phase 3 implementation, given the actual target tablet model remains unknown (carried-over v1.7 debt).

## Sources

### Primary (HIGH confidence)
- Local Rules Reference v1.7 PDF (`~/Downloads/mc_rulesreference_v17-compressed.pdf`), consulted directly via `pdftotext -layout` + grep — Player Elimination, Winning the Game, Villain Defeat, Unique/deck-building rules.
- Direct repo reads: `engine/types.ts`, `engine/persistence.ts`, `engine/resolve.ts`, `engine/audio.ts`, `engine/__tests__/voice-drift.test.ts`, `usePersistedSession.ts`, `useGameSession.ts`, `app/pages/[game]/index.vue`, `app/components/NavBand.vue`, `nuxt.config.ts`, `.planning/PROJECT.md`.
- `npm view firebase/vuefire/nuxt-vuefire/@nuxtjs/firebase` (versions, dist-tags, dependencies) — 2026-09-07.
- Live `curl` calls against `marvelcdb.com/api/public/packs/` and `.../cards/core.json` — verified JSON shape (hero `hand_size`/`health`, villain `stage`/`health`/`health_per_hero`/`health_per_group`, linked alter-ego cards), response headers, no-auth-required.
- `firebase.google.com/docs/firestore/manage-data/enable-offline`, `.../auth/web/anonymous-auth`, `.../firestore/security/rules-structure` — official API shape, fetched 2026-09-07.

### Secondary (MEDIUM confidence)
- `firebase.blog` Firestore Lite bundle-size comparison post (2023-dated, not independently re-measured this session).
- `firebase/firebase-js-sdk` GitHub issues #6515/#1497/#8696 — write-promise-resolves-on-server-ack behavior, cross-confirmed across multiple issues.
- BoardGameGeek "Duplicate character question" thread — community consensus, not official errata.
- WebSearch on BG Stats / MC Digital Tracker / M Champions Deck Builder / jwtr-mcc — app-store/marketing-copy summaries, none independently installed/tested.
- Google Cloud Firestore quotas doc (Spark plan: 50k reads/20k writes/20k deletes per day, 1 GiB storage) — WebSearch summary of official docs, not re-verified against a live console.

### Tertiary (LOW confidence)
- General 2026 hosting/security write-ups on Firebase API-key public-by-design consensus (used only for corroboration; the official Firebase "API keys" doc is the primary source for that specific claim).

---
*Research completed: 2026-09-07*
*Ready for roadmap: yes*
