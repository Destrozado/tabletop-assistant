# Pitfalls Research — v1.8 (Selección de héroes, contadores en mesa, histórico)

**Domain:** Adding character selection, live counters, and a Firestore-backed history log to an existing, shipped, offline-first Nuxt 4 SSG/PWA board-game assistant.
**Researched:** 2026-09-07
**Confidence:** Mixed — see per-pitfall tags. Codebase-grounded claims (marked CODE) are HIGH confidence because they cite an actual file/test in this repo. Firestore behavioral claims are MEDIUM (WebSearch cross-checked against GitHub issues + official docs, not hands-on verified in this repo). MarvelCDB claims are MEDIUM (one official page found, no hands-on test of the API).

## How to read this file

Each pitfall is ranked by **expected cost × likelihood** within its group. "Phase to address" uses descriptive phase labels tied to the v1.8 feature list in `.planning/PROJECT.md` (Catalogue & Selection, Counter Band, History & Persistence, Firestore Backup, Stats Screen) — the roadmapper should map these onto actual phase numbers, but the grouping and ordering signal is deliberate: catalogue-and-selection pitfalls must be closed before counters can be built on top of them, and history/Firestore pitfalls must be closed before stats can trust the data they read.

---

## Critical Pitfalls

### Pitfall 1: Interpolating the known number directly into `step.text` instead of a render-time overlay

**What goes wrong:**
A developer implementing "show the number in parentheses" does the obviously-simplest thing: edits `content/marvel-champions.json`, appends `" (14)"` to the `text` field of the relevant steps, or builds the string in `engine/resolve.ts`'s `resolveText()` by concatenating a value onto `variant?.text ?? node.step.text`. Either change mutates the exact string that `engine/__tests__/voice-drift.test.ts` fingerprints against `scripts/voice/manifest.json`. The build goes red (`Audio desactualizado para: ...`), and if someone "fixes" the red build by running `npm run voice:generate` to match, real money is spent regenerating a clip for text that is now player-count/hero-dependent and can never be pregenerated correctly — the parenthetical number is only known once heroes/villain are chosen, downstream of the audio pipeline.

**Why it happens:**
The path of least resistance for "add text to a step" in this codebase IS editing `step.text` — that's exactly what every phase so far has done for real content changes. Nothing about the step JSON shape currently distinguishes "narrated text" from "on-screen-only text." The feature ask ("shown in parentheses... without touching stored text or clips") requires a *new* concept (a display-only annotation) that doesn't exist yet in `TextBlock`/`StepDefinition` (`engine/types.ts`), so it's easy to bolt the number onto the field that already exists instead of adding the field that should.

**How to avoid:**
Add a genuinely separate, optional field to `TextBlock`/`StepDefinition` (e.g. `knownValue` or a small structured placeholder token list) that `StepScreen.vue` renders next to/after `actionText` but that `resolveAudioId`/the voice pipeline never reads. Concretely: `engine/resolve.ts` must keep computing `speech`/audio id exactly as today (unchanged), and a *new*, separate resolver (e.g. `resolveDisplayText()` in a new `engine/knownValues.ts`) composes `text + " (" + value + ")"` only for on-screen rendering in `StepScreen.vue`, never touching what flows into `collectSpeechEntries`/`fingerprint()`. Add an explicit unit test asserting `collectSpeechEntries(marvelChampions)` output is byte-identical before and after the catalogue/counters feature lands — a regression here should fail a test *before* it ever reaches `voice-drift.test.ts`, since that test only catches drift in already-changed text, not the fact that a field was touched.

**Warning signs:**
- Any diff to `content/marvel-champions.json` touching a `"text"` or `"speech"` key during this milestone.
- `npm run voice:generate` invoked at all during this milestone outside of a genuine rules-text correction.
- `voice-drift.test.ts`'s "hay exactamente 35 entradas" count test needs updating to a new number that isn't explained by an actual new *spoken* step.

**Phase to address:** Catalogue & Selection / Parenthetical Numbers phase (this must be designed before any step-text change is made) — with a regression test added to the same phase, not deferred.

---

### Pitfall 2: `await` on a Firestore write in a click handler hangs "Siguiente"/end-of-game confirmation when offline

**What goes wrong:**
Firestore's write methods (`setDoc`, `addDoc`, `updateDoc`) return a promise that resolves **only once the server has acknowledged the write** — not when the local IndexedDB cache is updated. This is documented, cross-confirmed Firestore behavior (see `firebase/firebase-js-sdk` issues #6515, #1497, #8696) and it surprises nearly everyone who assumes "offline persistence" means the promise resolves locally. If a developer writes `await addDoc(historyCollection, entry)` inside the end-of-game "record win/loss" handler — the single most natural place to put it — that `await` will simply never resolve while the wifi is down, because this app's core constraint is "must work with the wifi caved mid-game." The confirmation dialog spins forever, or the app appears frozen, on the exact device/scenario (offline, mid-table, tablet) this whole project exists to handle correctly.

**Why it happens:**
Every other write in this app (`usePersistedSession.ts`'s `save()`) is synchronous and fire-and-forget by design — there is no precedent in the codebase for an async, potentially-hanging write, so nothing about the existing patterns warns against `await`ing here. The natural instinct writing new async code is to `await` it so errors can be caught with try/catch, which is correct practice everywhere else in typical web dev and wrong specifically here.

**How to avoid:**
Never `await` the Firestore write in the UI event path. Fire it (`addDoc(...).catch(() => {})` or equivalent) and immediately proceed with the UI flow using the localStorage write as the actual "did it save" signal — Firestore is a backup, not a gate. Concretely: the win/loss capture handler should call `usePersistedSession`'s (or a new `useHistoryLog`'s) synchronous localStorage write first, update UI/navigate away immediately, and kick off the Firestore write as an untracked side effect afterward, same shape as `useVoiceAnnouncer.ts`'s existing rule (comment in `useStepShortcuts.ts`: synchronous call, no `await`, no `setTimeout` in the hot path) applied to a new context. Add a test/manual check: simulate offline (`context.setOffline(true)`, same tool already used in `e2e/offline-flow.spec.ts`) and confirm the "game ended" screen still advances instantly.

**Warning signs:**
- Any `await` directly preceding a Firestore SDK call inside a component's click handler or a composable function invoked synchronously from one.
- No `.catch()` on a fire-and-forget Firestore call (an unhandled rejection from a queued-then-failed write should never surface as an uncaught error).
- Manual test: turn off wifi, finish a game, tap "confirm result" — if there's a visible stall, this pitfall has been hit.

**Phase to address:** Firestore Backup phase (and re-verified in an offline e2e test, extending the existing `e2e/offline-flow.spec.ts` pattern).

---

### Pitfall 3: Bumping the persisted session shape without bumping `formatVersion`, corrupting or silently losing in-progress saved games

**What goes wrong:**
`engine/persistence.ts`'s `resume()` gate is deliberately strict: it checks `formatVersion` first, then `contentVersion`, and only trusts a persisted session if both match *and* the `runtimeId` is still found in the freshly-expanded sequence — anything else falls back to `contentChangedFallback` (fresh start, keeping only `context`). Adding selected-hero/villain/counter state to what gets persisted per game session is a natural, tempting place to extend `PersistedPosition` (`engine/persistence.ts`) or `SessionContext` (`engine/types.ts`) with new fields — but if those new fields are added without incrementing `formatVersion` (still hardcoded `1` today) or without updating `isPersistedPosition()`'s shape guard in `usePersistedSession.ts`, one of two bad things happens: (a) an old save from before v1.8 gets read as if it already has the new fields (`undefined` counters silently propagate into the counter band with no default, producing `NaN`/blank steppers on live TV-sized text at the table), or (b) a v1.8 save with the new shape, read by `isPersistedPosition()`'s current guard (which only checks `formatVersion`/`contentVersion`/`runtimeId`/`round`/`context` keys are *present*, not the new ones) gets accepted as valid even though the new fields it expects are missing, again producing undefined counter state mid-resume. Because "the app is in real use right now," a group whose tablet has an in-progress paused session on v1.7's shape when v1.8 ships is the realistic reproduction case, not a hypothetical.

**Why it happens:**
`formatVersion` is a compile-time-literal-typed constant (`formatVersion: 1`) that nothing forces a developer to touch — TypeScript won't complain if a new optional field is added to `PersistedPosition` without changing that literal, because optional fields are optional. The existing test suite tests `resume()`'s branching logic against the *current* shape; a new field added to the interface without a corresponding test for "old-shape save + new-shape expectations" will not fail any existing test.

**How to avoid:**
Treat "counters/selection persist across resume" as a `formatVersion: 2` change from day one of the Counter Band phase, not an incremental patch to `formatVersion: 1`. Update `isPersistedPosition()` in `usePersistedSession.ts` to require the new fields explicitly when `formatVersion === 2`, and update `resume()` in `engine/persistence.ts` so that a `formatVersion !== <current>` mismatch (already-existing branch) is the *only* path that handles a v1.7 save meeting v1.8 code — verify this with a dedicated test that hand-constructs a `formatVersion: 1`-shaped object (no counters/selection fields) and asserts `resume()` returns `outcome: 'content-changed'` with sane, fully-defined defaults for the new fields, never `undefined`. This mirrors the exact discipline already documented in `engine/persistence.ts`'s comments about "Anti-Patrón 4... una coincidencia casual de id tras una reestructuración es peor que un reinicio honesto" — apply the same honesty to a shape change, not just a content change.

**Warning signs:**
- A PR that adds fields to `PersistedPosition`/`SessionContext` without touching the `formatVersion` literal or `isPersistedPosition()`.
- Counter/hero-selection UI code anywhere doing `session.context.counters ?? someDefault` — a defensive fallback at the *render* site is a sign the *resume* site didn't guarantee the invariant, and the fallback value picked ad hoc at render time can silently differ from the one picked at resume time.
- No test in `engine/__tests__/` constructing an old-shaped persisted object and feeding it through `resume()`.

**Phase to address:** History & Persistence / Counter Band phase, whichever lands first (counters likely need session-shape changes before history does) — this is the single highest-risk phase for regressing a live, in-use app.

---

### Pitfall 4: Fixed counter band shrinks the big step text, undermining the app's core value

**What goes wrong:**
`StepScreen.vue` currently renders the step's `actionText` at `text-display` scale, centered, as effectively the entire screen's content between a header and a 96px-tall (`h-24`) `NavBand.vue` footer. Adding "a fixed counter band during play" (villain HP + HP1..HP4 with ▲/▼ steppers) as a naive additional fixed-height bar (header + counter band + step text + NavBand, all stacked) eats into the exact vertical space the text-at-arm's-length requirement depends on. The project's own stated core value is text large enough to read from a tablet lying next to the table — a counter band is explicitly a *secondary* concern (v1.8 goal says the app should "know your game," not that it should compete with the primary instruction for pixels) but is easy to build as if it were equally important, because it's the newest, most visually interesting piece of UI in the milestone.

**Why it happens:**
Nothing in the existing component tree has a concept of "persistent chrome that must never grow past N% of viewport height" — `AppHeader.vue` and `NavBand.vue` are both small, fixed, and were sized once, early, and never revisited under pressure from a competing element. A counter band with 5 numbers × 2 buttons each, laid out to be tappable at arm's length (large touch targets, per pitfall 12 below), naturally wants more space than a developer estimates from a design mockup on a laptop screen.

**How to avoid:**
Set an explicit, tested height/viewport-percentage budget for the counter band *before* building it (e.g. "counter band ≤ 15% of the 100dvh viewport in landscape on a reference tablet size," enforced as a Playwright/visual check, not just eyeballed), and make it collapsible/dismissible or auto-hidden during setup steps (it has no value before heroes/villain are chosen and HP is initialized) so it isn't stealing space during the setup section where step text is often longer. Route this through the existing `AppHeader`/`StepScreen`/`NavBand` layout as a fourth fixed-height flex child with `shrink-0`, exactly like `NavBand`'s own `h-24 shrink-0` pattern, so `StepScreen`'s `flex-1` text area is what shrinks/grows around it, never the reverse. Get a real tablet screenshot review (the project's own precedent: v1.7's Fase 03.1 human-test-on-real-device caught what code review couldn't) before considering this phase done.

**Warning signs:**
- The counter band is coded as `flex-1` or without an explicit height cap alongside `StepScreen`'s existing `flex-1`.
- No design/measurement decision recorded before implementation (compare to how `04-04` in v1.7 explicitly measured and documented the workbox precache size — this milestone should have an equivalent explicit space budget for the counter band).
- The counter band is visible during setup-section steps where it has no value yet.

**Phase to address:** Counter Band phase.

---

### Pitfall 5: Open Firestore security rules on a public repo — quota exhaustion and junk data, not "leaked API key"

**What goes wrong:**
Firebase's web config object (API key, project id, etc.) is not a secret — it's meant to ship in a public client bundle, and this project's own `.gitignore` already anticipates the repo being public ("El repositorio es PÚBLICO: nada de esto debe salir nunca" — for actual secrets, not this). The real risk is **security rules**, and the fastest way to get Firestore "working" during development is `allow read, write: if true;` (or the default open-test-mode rules Firebase's console offers, which expire after 30 days but are trivially easy to leave in place or copy verbatim into production rules). With a public GitHub repo, the Firebase project id and collection names are discoverable by anyone reading the source — reproducing the exact write call from devtools/a script is a five-minute exercise, not a sophisticated attack. Realistic abuse surface for a hobby app with no auth: (a) a bored visitor or script kiddie hammering the write endpoint until the 20,000 writes/day free-tier quota (Spark plan, MEDIUM confidence, WebSearch-sourced against Google Cloud's own quotas page) is exhausted for the day, silently breaking the backup feature for the actual group until the next day; (b) junk documents polluting the `history` collection, which the stats screen would then read and display as real game results, corrupting the win/loss percentages the whole stats feature exists to show accurately; (c) in the worst case, hitting the 1 GiB storage cap with junk writes, requiring manual cleanup.

**Why it happens:**
"No auth, no backend to administer" is a deliberate project constraint, and adding real user auth just to gate Firestore writes would violate that constraint's spirit — so there's a real temptation to reach for "open rules, ship it" as the path that doesn't reintroduce the auth complexity the project has twice explicitly avoided. Firebase's own quickstart/console tooling nudges toward test-mode rules that are open by default.

**How to avoid:**
Minimum non-embarrassing rule set for this exact shape (no auth, single trusted group, backup-only data): validate the *shape* of writes even without validating *identity* — e.g. `allow create: if request.resource.data.keys().hasOnly([...expected fields...]) && request.resource.data.gameId is string && request.resource.data.result in ['win', 'loss'] && request.resource.data.timestamp is timestamp;`, `allow read: if true` (stats need to be readable, and there's nothing sensitive in it), **never `allow update, delete`** (history entries are append-only — closing the update/delete surface means even a hostile writer can only add junk rows, never corrupt or erase real ones), and a hard field-count/size cap in the rule to make spam at least bounded per document. This does not require auth and does not require a backend to administer — it's a static rules file (`firestore.rules`) committed alongside the app. Additionally: since the free tier hard-stops (not overages-bills) on Spark plan, document in the app that the *worst case* of quota exhaustion is "history stops syncing for the rest of the day," never a surprise bill — this is worth stating explicitly in `PROJECT.md`'s Key Decisions so a future contributor doesn't panic and reach for the Blaze (pay-as-you-go) plan to "fix" a self-solving problem.

**Warning signs:**
- `firestore.rules` (or the console's rule editor) contains `if true` on `write` or `update`/`delete` allowed at all.
- No field-shape validation in the rules — any object shape is accepted.
- The Firestore console's default 30-day test-mode rules are still active past the point the feature "worked."

**Phase to address:** Firestore Backup phase — the rules file should be written and reviewed *before* the first real write ships, not retrofitted after "it works."

---

### Pitfall 6: Firestore SDK loaded eagerly, blocking first paint of a prerendered page

**What goes wrong:**
This app's entire rendering strategy (`nuxt generate`, SSG) exists so the tablet gets instant first paint from static, hashed HTML/JS before the service worker or any network call is involved (documented rationale in `CLAUDE.md`). Firebase's modular SDK (`firebase/app`, `firebase/firestore`) is not huge, but importing it at the top level of a plugin that runs on every page load (rather than lazily, only when history/stats screens are actually visited) adds parse/init cost to the boot path of every screen, including the setup/step screens that have nothing to do with history — directly working against the reason SSG was chosen over `ssr: false` in the first place.

**Why it happens:**
The standard Firebase web quickstart pattern is "initialize once at app startup" via a top-level `initializeApp()` call in a global plugin — this is correct advice for most SPAs but wrong for a project whose explicit, documented architectural goal is minimal, static-first boot.

**How to avoid:**
Initialize Firestore inside a Nuxt client-only plugin (`.client.ts` suffix, following the SSR-safety pattern `usePersistedSession.ts` already hand-rolls with `typeof window === 'undefined'` guards) and import the Firebase modules with a dynamic `await import('firebase/app')`/`await import('firebase/firestore')` triggered only when a write or the stats screen is actually reached — not at module top-level. Verify with the build's own bundle output (`nuxt generate` + inspect `.output/public/_nuxt/*.js` chunk sizes, the same kind of check the project already did for the audio precache budget in Fase 4) that the initial route chunks for `/` and `/marvel-champions` don't grow materially from this milestone.

**Warning signs:**
- `import { initializeApp } from 'firebase/app'` (or `firestore`) appears as a static top-level import in any file that's part of the app's initial/shared chunk (e.g., `app.vue`, a non-`.client` plugin, or a composable imported from the step-play page).
- Lighthouse/first-paint timing on the setup screen regresses after this milestone with no counters/selection UI even visible yet.

**Phase to address:** Firestore Backup phase.

---

### Pitfall 7: Silent Firestore persistence failure mirrors the localStorage failure mode this codebase already knows about — but nobody wires the same defense

**What goes wrong:**
`usePersistedSession.ts` already documents, in detail, that `window.localStorage` can throw (private browsing, quota, restricted context) and treats that as "absence of data, never an error that breaks the interaction" (`writeRaw`/`removeRaw`'s try/catch comments). Firestore's `persistentLocalCache` (or the older `enableIndexedDbPersistence`) has the *exact same* failure shape — it can fail to open IndexedDB (private/incognito mode, browser storage restrictions, a second tab already holding single-tab persistence, or the very first cold load on a device offline before persistence ever successfully initialized) and falls back to a memory-only cache. Memory-only cache means: any queued offline write is lost the moment the tab/PWA is closed or reloaded, with no error surfaced anywhere — the "durable backup" silently isn't durable at all in exactly the scenario (tablet at the table, wifi down, page reload after the tablet auto-locks) this project's other layer (localStorage/progress) was explicitly hardened against.

**Why it happens:**
Firestore's offline persistence is opt-in but "just works" in the common case, so it's easy to enable it once, see it work in a normal dev-machine Chrome tab, and never test the private-mode/multi-tab/first-cold-load-offline paths — the same class of gap this project's own precedent (VOZ-08, the untested silent-fallback path called out as known debt in v1.7) already shows this team is honest about but has been bitten by before.

**How to avoid:**
Explicitly call the persistence-enable function and **check its resolution/rejection** rather than assuming success (`persistentLocalCache`'s failure surfaces as a thrown/rejected promise from `initializeFirestore`, or `enableIndexedDbPersistence`'s well-known `'failed-precondition'`/`'unimplemented'` rejection codes) — on failure, fall back explicitly to `memoryLocalCache()` and, critically, **do not claim to the user that history has a durable backup** if persistence failed to initialize (a quiet internal flag is enough; this is a backup feature, not core value, so no UI is strictly required, but the code should know the difference). Because localStorage is the source of truth per the Key Decision in `PROJECT.md`, the actual safety net here is: never treat a successful `localStorage` write to history as insufficient — Firestore is best-effort on top, and its failure must never be allowed to imply the local record was also lost.

**Warning signs:**
- `initializeFirestore`/`enableIndexedDbPersistence` called without a `.catch()`/try-catch around it.
- No test or manual check for "open the stats/history screen in a second browser tab while the installed PWA also has it open" (multi-tab persistence contention).
- No manual check for "install the PWA on a device that has never had network access, log a game result, reload" — mirrors the "first cold load with no network" scenario this document was asked to dig into.

**Phase to address:** Firestore Backup phase.

---

### Pitfall 8: The dual-source-of-truth trap — same game logged twice, or lost silently, with no reconciliation

**What goes wrong:**
Enumerated concretely for this app's shape (single tablet, occasionally multiple browser contexts):
1. **Double-logging:** if the "record result" action writes to localStorage *and* fires the Firestore write, and the user double-taps the confirm button (a mis-tap at arm's length, see Pitfall 12) before the button disables, two near-identical history entries land in both stores with different timestamps — the stats screen then shows an inflated game count with no way to tell which entry is the duplicate.
2. **Silent write failure, never retried:** per Pitfall 2/7, an offline Firestore write is queued by the SDK, but if the tab/PWA is closed before the SDK reconnects and flushes it (device auto-locks, app is force-closed, browser storage was memory-only per Pitfall 7), the queued write is gone — with no error, no retry, and nothing in localStorage recording "this entry hasn't synced yet," a future stats-vs-Firestore reconciliation has no way to tell "this entry never made it" from "this entry was never meant to sync."
3. **Clock skew on timestamps:** if `Timestamp.now()`/server timestamp semantics on the Firestore side and `new Date().toISOString()` on the localStorage side (the same pattern already used in `engine/persistence.ts`'s `toPersistedPosition`) are captured at different moments — write time vs. server-ack time, which per Pitfall 2 can be much later when reconnecting after an offline session — a history entry's Firestore timestamp can end up hours after its actual localStorage timestamp, making a stats screen that sorts/dedupes by "most recent by timestamp" silently pick the wrong source of truth for ordering.
4. **Partial sync leaving stats looking wrong:** if the stats screen reads from Firestore (or merges Firestore + localStorage) rather than exclusively from localStorage, any of the above produces a stats screen whose numbers don't match what a user remembers playing.

**Why it happens:**
"Firestore as backup, localStorage as source of truth" sounds like it avoids needing a sync engine, but the moment *any* screen (the stats screen, explicitly, per this milestone) reads from Firestore even partially, all the classic sync-engine problems (idempotency, ordering, conflict resolution) reappear without anyone having decided to build a sync engine.

**How to avoid:**
Enforce, as a hard design rule for the whole Stats Screen phase: **the stats screen only ever reads localStorage. Firestore is write-only from the app's perspective, in the running lifetime of this milestone.** This one rule collapses nearly all four failure modes above into "who cares if Firestore missed an entry or has a stray duplicate — the user never looks at it directly, it's disaster recovery for 'the tablet was lost/reset,' not a live data source." Give every history entry a client-generated stable id (e.g. a UUID or a hash of gameId+timestamp+context) at the moment it's created in localStorage, and write that *same* id as the Firestore document id (`setDoc(doc(col, id), ...)` rather than `addDoc`) — this makes the Firestore write naturally idempotent: a retried/duplicated write with the same id overwrites rather than duplicates, closing failure mode 1 for free without building retry logic. Use `serverTimestamp()` for a `syncedAt` field distinct from the entry's own `playedAt` (captured once, locally, at game end) — never conflate "when this was played" with "when this happened to sync."

**Warning signs:**
- Any code path where the Stats Screen phase reads from `getDocs`/`onSnapshot` on the Firestore history collection.
- `addDoc()` (auto-generated id) used instead of `setDoc(doc(col, clientGeneratedId), ...)`.
- No single, obviously-named `playedAt`/`recordedAt` field set once at creation time in localStorage, separate from anything Firestore stamps.

**Phase to address:** History & Persistence phase (id scheme + local-only stats read designed together) and Firestore Backup phase (idempotent write).

---

### Pitfall 9: Service-worker precache glob misses new static assets, stranding the offline hero/villain catalogue or a new prerendered route

**What goes wrong:**
`nuxt.config.ts`'s `pwa.workbox.globPatterns` is an explicit, hand-curated list (`'**/*.{js,css,html}'`, `'audio/*.m4a'`, `'icons/*.png'`, `'fonts/*.woff2'`, `'favicon.ico'`, `'manifest.webmanifest'`) — it is not a catch-all. The project's own comments show this has already bitten the team once (the 04-04 pitfall about `audio/**` vs `audio/*.m4a` recursion, and the note that Workbox `generateSW` doesn't scan `.output/public` at all without the `workbox` block). If the hero/villain catalogue is served as a runtime-fetched static JSON file under `public/data/` (rather than statically imported like `content/marvel-champions.json` already is, per `useGameContent.ts`), it will not match any existing glob pattern and will not be precached — meaning the very first time the app is opened fully offline after an update, the hero-selection modal's data fails to load, breaking the single scariest scenario this project exists to survive ("la wifi puede caerse en mitad de la partida").

**Why it happens:**
Fetching a JSON file at runtime *feels* more natural for "a data catalogue" than a static TS/JSON import, especially since the catalogue is generated by a separate scraping script and might feel like it "belongs" in `public/` as a data asset rather than in `content/` as bundled content.

**How to avoid:**
Follow the exact existing precedent, not a new pattern: put the catalogue at `content/heroes.json` (or `content/marvel-champions-catalogue.json`) and import it statically into a new `app/composables/useCharacterCatalogue.ts`, the same way `useGameContent.ts` statically imports `content/marvel-champions.json`. A statically-imported JSON module gets compiled into the JS bundle and is automatically covered by the existing `'**/*.{js,css,html}'` glob — zero new Workbox configuration needed, and the file is protected by the exact same offline guarantee the game content already has. If a new prerendered route is added for the stats screen (`/marvel-champions/estadisticas` or similar), it must be added to `nitro.prerender.routes` in `nuxt.config.ts` exactly like `/marvel-champions` was — `crawlLinks: false` means it will not be auto-discovered.

**Warning signs:**
- Any `fetch('/data/...')` or `fetch('/heroes.json')` call anywhere in `app/`.
- A new route added to the app without a corresponding new entry in `nitro.prerender.routes`.
- Testing the hero-selection modal only ever happens with network available / service worker not yet installed (i.e., in `nuxt dev`, where the project's own devOptions comment says the service worker is deliberately disabled) — this pitfall only shows up in a `nuxt generate` + offline test, same as the rest of the PWA verification the project already does.

**Phase to address:** Catalogue & Selection phase (for the catalogue file itself) and Stats Screen phase (for the new route), verified by extending `e2e/offline-flow.spec.ts`.

---

### Pitfall 10: Villain HP encoded as a single number when it varies per stage AND per player count

**What goes wrong:**
Marvel Champions villains have multi-stage fights (Stage I / II / III, or module-based multi-stage in some scenarios) where each stage has its own HP, and that HP is *also* scaled by player count (typically per-player HP values that get summed or use a scaling table, not a flat total). A catalogue schema that stores `villainHealth: number` (one number per villain) will be wrong for every player count except whichever one the scraper happened to capture, and wrong for every stage past the first. Because the app pre-fills the counter band's initial value from this table, a flattened schema doesn't just display a wrong number in a parenthetical (low stakes, per the project's own explicit decision) — it pre-loads the *live counter* wrong, which is the actual feature deliverable, and does so silently and consistently (the same wrong number every time that hero/villain/player-count combo is chosen), unlike a one-off manual mistake that a group would notice and shrug off.

**Why it happens:**
"Villain HP" sounds like a single fact when scraping a card's front face casually — the per-stage, per-player-count structure is a rules detail, not a UI detail, and is easy to under-model if the catalogue schema is designed by looking at one card image rather than by cross-checking the Rules Reference's stage-health rules.

**How to avoid:**
Model the catalogue schema as `villainHealth: Record<stageId, Record<playerCount, number>>` (or an equivalent nested structure) from the start — even if the initial scrape only fully populates stage I accurately, the *shape* should not need a breaking change when stage II/III data is added later. Cross-check the schema shape itself (not the individual numbers — the project's own decision explicitly deprioritizes number-perfection, "un valor de vida equivocado no es un fallo crítico") against the Rules Reference's villain setup section before writing the scraper, the same discipline `.planning/PROJECT.md` already applies to rules *text* — this is a one-time structural check, not the full D-36 human-review ceremony for every number.

**Warning signs:**
- The catalogue schema (wherever it's defined — likely a Zod schema alongside `engine/schema.ts`'s pattern) has a flat `number` field for villain health with no stage or player-count dimension.
- The counter band's pre-fill logic does a single lookup with no player-count parameter.

**Phase to address:** Catalogue & Selection phase.

---

### Pitfall 11: One-off manual scrape that nobody can reproduce, and no path for a 19th hero

**What goes wrong:**
"Scraped once from MarvelCDB" is easy to do as a one-time manual copy-paste into a JSON file, verified by eye, and then never touched again — which technically satisfies the milestone's literal ask but leaves the project unable to add hero #19 (a real, near-certain future event — new Marvel Champions hero packs release regularly) without someone reverse-engineering what the original process even was. This is exactly the class of debt the project has explicitly flagged as unacceptable elsewhere (contrast with `scripts/voice/generate.mjs`, a real, re-runnable, documented script for a similarly "generate once" task).

**Why it happens:**
The milestone description says "obtenido de MarvelCDB con el procedimiento documentado en el repo," which already anticipates this — but "documented" is easy to satisfy with a paragraph of prose describing manual steps rather than an actual script, especially under time pressure, since a script has to handle edge cases (network errors, HTML structure changes) that a one-off manual pass doesn't.

**How to avoid:**
MarvelCDB has a public API (`https://marvelcdb.com/api/` — public endpoints need no registration; OAuth2 endpoints exist for more but aren't needed here) rather than only raw HTML — write a small, committed, re-runnable Node script (`scripts/catalogue/fetch-marvelcdb.mjs`, mirroring the existing `scripts/voice/generate.mjs` pattern of a documented, invocable-from-`package.json` script) that hits the public API's card/pack endpoints, extracts *only* numeric fields (health, hand size, per-stage villain health) and names, and writes `content/heroes.json` deterministically. This makes "add hero #19" a matter of re-running the script and reviewing the diff, not repeating archaeology. Document the exact API endpoints used and any manual cross-referencing against the Rules Reference for per-player-count scaling (which may not be a raw field on the card) directly in the script's header comment, the same way `voice-drift.test.ts`'s header comments explain its own constraints.

**Warning signs:**
- No script exists anywhere in `scripts/` for regenerating the catalogue — only a JSON file appeared in a commit.
- The only "documentation" of the procedure is prose in a planning doc, not an executable command.
- The catalogue JSON has no `generatedAt`/source-version metadata (contrast with `scripts/voice/manifest.json`'s `generatedAt` field, which this milestone should mirror).

**Phase to address:** Catalogue & Selection phase.

---

### Pitfall 12: Accidentally pulling card/flavor text or art into the committed, public repo

**What goes wrong:**
MarvelCDB's own card data ("All texts are copyrighted by Fantasy Flight Games," confirmed on their API page) includes ability text, flavor text, and card images alongside the numeric stats this milestone actually needs. A scraper (or a careless manual copy-paste) that captures the full API/HTML response and stores it wholesale — rather than deliberately projecting out only `name`, `health`, `handSize`, per-stage HP fields, etc. — will commit copyrighted card text or image URLs/binaries into a **public** repository, directly violating this project's own stated legal constraint ("no se reproducen cartas, arte ni textos extensos con copyright").

**Why it happens:**
The path of least resistance when scraping/calling an API is to store the whole response object "in case it's useful later" — deliberately discarding fields takes an explicit design decision that's easy to skip when the immediate goal is just "get the numbers I need."

**How to avoid:**
Write an explicit allow-list projection in the fetch script (per Pitfall 11) — map the API response to a narrow, hand-defined interface (`{ name, alterEgo, health, handSize, ... }`) rather than spreading/passing through the raw response. Add a lightweight content check (even a simple grep/test asserting the committed `content/heroes.json` contains none of a small blocklist of known long-text field names like `text`, `flavor`, `imagesrc` from the MarvelCDB API shape) as a cheap CI guard, the same spirit as the schema's `z.strictObject` decision in Phase 2 of v1.7 ("el esquema de contenido rechaza claves desconocidas, no las descarta") — apply that same "reject unknown/unwanted keys" discipline to the catalogue schema.

**Warning signs:**
- The catalogue-fetch script does `JSON.stringify(apiResponse)` or similar wholesale-object writes rather than an explicit field projection.
- Any `image`/`imagesrc`/`text`/`flavor` key present in `content/heroes.json`.
- Committed catalogue file size is much larger than "18 heroes × ~6 numbers + 3 villains × per-stage table" would suggest.

**Phase to address:** Catalogue & Selection phase.

---

### Pitfall 13: Touch-UX regressions on the counter band — mis-taps, runaway hold-repeat, ghost double-counts, and keyboard-shortcut interaction

**What goes wrong:**
Several distinct failure modes bundled into one new UI surface:
- **Mis-taps at arm's length with no undo:** a single ▲/▼ tap that's easy to fat-finger, with no confirmation or easy correction, is more annoying on a life-total counter than elsewhere in this app because HP tracking accumulates error over many taps across a long session — unlike a `next()`/`prev()` step navigation, which the existing `resume()`/`content-changed` machinery already treats as fully reversible.
- **Press-and-hold repeat running away:** if a "hold to repeat-decrement fast" interaction is added (natural for a counter that might need to move from 14 to 2 in one hit), an unbounded `setInterval`-style repeat that doesn't stop cleanly on `touchend`/`pointercancel` (common bug: `touchend` doesn't fire reliably if the finger slides off the button, or a background tab throttles timers unpredictably) can send a counter far past the intended value with no easy way to notice until it's absurd.
- **Ghost double-counting on iOS Safari:** `NavBand.vue`'s existing pattern deliberately separates the *visual* press-state (`@touchstart`/`@touchend`/`@mousedown`/`@mouseup` toggling a `ref`) from the *actual* action (`@click` only). A counter button that instead wires the actual increment/decrement to `@touchstart` directly (for perceived lower latency) risks the classic mobile-Safari double-fire where both the touch handler and the subsequent synthesized `click` (or a second touch event from a slightly-off double-tap) both increment, especially since counters have no natural "settle" state the way navigation does.
- **State loss on reload mid-game:** per Pitfall 3, if counter values aren't included correctly in the persisted session shape, a tablet auto-lock/reload mid-game silently resets HP trackers to their pre-filled defaults, which is worse than not having live counters at all (a player would trust a wrong-because-reset number more than they'd trust their own memory).
- **Keyboard-shortcut interaction:** `useStepShortcuts.ts`'s global `keydown` listener maps Space/Enter to `next()` and treats *any* focused control the same way (its `isEditableTarget` guard only excludes `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable`, not buttons) — a counter ▲/▼ `<button>` retaining focus after a tap, followed by a Space press on an attached Bluetooth keyboard, will correctly trigger "next" (not double-decrement, since `preventDefault()` already suppresses the focused button's native activation per `useStepShortcuts.ts`'s own D-Q1 comment) — but this means a keyboard user has no way to keyboard-operate the counters at all, silently. That's an acceptable gap for a touch-first tablet app, but only if it's a *deliberate* decision, not an accident nobody noticed because the whole team tests on touch devices.

**Why it happens:**
The counter band is the first genuinely new *interactive* (as opposed to navigational) widget type in the app — every existing tappable element (`NavBand`, `WarningDetailModal`'s trigger, `StepScreen`'s options list) is a one-shot action with an obvious, single correct outcome. Counters are the first thing in this codebase where "how many times did that actually register" matters and accumulates.

**How to avoid:**
Reuse `NavBand.vue`'s established split between press-state (visual only, `@touchstart`/`@touchend`) and action (`@click` only, fired exactly once per confirmed tap) for every counter button — do not wire increments to `touchstart`. If hold-to-repeat is built, cap it with a hard maximum duration/step count and clear the interval defensively on `pointercancel`/`pointerleave`/component unmount, not just `touchend`/`mouseup`. Give every counter a visible, always-available way to see (and ideally briefly undo) the last change — even a simple "long-press to reset to the pre-filled default" satisfies "no undo" cheaply without building a full history/undo stack. Explicitly decide and document (a one-line comment, same style as the rest of this codebase) that keyboard shortcuts do not operate the counters, so it reads as a decision rather than an oversight next time someone touches `useStepShortcuts.ts`. Test state survival with the same "reload mid-step" manual check the project already applies to session resume.

**Warning signs:**
- Any `@touchstart` handler on a counter button that also increments/decrements state (not just toggles a visual press ref).
- A `setInterval`/`requestAnimationFrame` repeat loop with no maximum bound and only a `touchend`/`mouseup` cleanup path (missing `pointercancel`).
- No test exercising "reload the page mid-game, counters should show the last value, not the pre-filled default."

**Phase to address:** Counter Band phase.

---

### Pitfall 14: Scope creep — the four reverted exclusions become a wedge for the ones that weren't reverted

**What goes wrong:**
`.planning/PROJECT.md`'s "Out of Scope" section is explicit that v1.8 reverts *exactly* four prior exclusions (live counters for HP only, known-number display, hero/villain selection, and Firestore-as-backup-only) and explicitly keeps several adjacent things out: threat/amenaza counters, per-player status-effect tracking (Aturdido/Confundido/Duro), scenario/modular-set selection, real backend/user accounts, and a rules-lookup screen beyond the existing `⚠` detail modal. Once the counter band exists for HP, "just add a threat counter too, it's the same component" is an extremely natural mid-build suggestion — it uses the exact same UI pattern (▲/▼ stepper) already being built, so the *marginal* engineering cost looks small even though the project explicitly separated it out as still-excluded. Similarly, once Firestore is wired for history, "let's add simple auth so stats could be per-player-account" or "let's make the catalogue editable from a web UI" are the kind of small-sounding asks that directly reopen constraints ("sin backend," "editor de juegos desde la web") this project has twice already decided against.

**Why it happens:**
Feature-adjacency bias: once the infrastructure for X exists (a stepper component, a Firestore connection, a hero data model), every feature that reuses that infrastructure feels nearly free — but "nearly free to build" is not the same as "in scope," and each of these adjacent asks was excluded for a load-bearing reason (amenaza/status tracking was excluded because it multiplies the counter surface and touch-target crowding problem from Pitfall 4; scenario selection was excluded because modular sets are a much larger data-modeling problem than heroes/villains; accounts/backend were excluded to keep "nothing to administer or pay for" true).

**How to avoid:**
Name the specific temptations explicitly in the roadmap/phase plans so they can be recognized and declined in the moment, rather than relying on general discipline: (1) a threat/amenaza counter alongside the HP steppers — decline, it's explicitly still out of scope; (2) status-effect (Aturdido/Confundido/Duro) tracking as toggle chips near the counter band — decline, same reason; (3) any UI to add/edit a hero or villain from within the app — decline, content stays developer-authored data per the standing "editor de juegos desde la web" exclusion; (4) authentication/per-player accounts once Firestore exists — decline, "sin backend... nada que administrar ni pagar" and "cuentas de usuario" both remain explicitly excluded even after the Firestore revision; (5) scenario/modular-set selection riding along with hero/villain selection in the same setup-step UI — decline, `CONF-02/03` are explicitly deferred to a later milestone in `PROJECT.md`'s "Candidatos para hitos posteriores."

**Warning signs:**
- Any PR/plan touching the counter band that adds a second counter type beyond villain HP + HP1..4.
- Any UI control that writes to `content/heroes.json`/the catalogue from within the running app.
- Any Firestore security rule or schema field referencing a user/account/login concept.

**Phase to address:** All phases — this is a standing constraint the roadmapper should restate at the top of each v1.8 phase, not a single phase's job.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Manual one-off MarvelCDB scrape, no script | Faster to ship the first 18 heroes/3 villains | No way to add hero #19 without re-deriving the process; no `generatedAt`/provenance metadata | Never — the milestone explicitly asks for a documented, repeatable procedure |
| Flat villain HP number (no stage/player-count dimension) | Simpler schema, faster first pass | Wrong pre-filled counter for every stage/player-count except one; a schema migration later touches every catalogue entry | Never for the schema shape; acceptable to leave stage II/III numbers *unpopulated* (with the shape ready) if time is short |
| `allow read, write: if true` Firestore rules during local development | Unblocks development immediately without writing rules first | Trivial to forget to tighten before the first real deploy; repo is public, so the project id is discoverable | Acceptable only inside the Firebase emulator suite / a local-only project, never against the real project id that ships in the deployed bundle |
| Reading Firestore directly from the stats screen instead of localStorage-only | Feels like "real" cloud-backed stats, marginally fresher across devices | Reopens every dual-source-of-truth problem (Pitfall 8) the project explicitly tried to avoid by calling Firestore "backup, not source of truth" | Never, for this milestone's stated architecture — revisit only if a real multi-device sync feature is later scoped deliberately |
| Bumping `PersistedPosition` fields without `formatVersion` | Avoids writing a migration/fallback test | Corrupts or silently defaults a currently-in-progress saved game on a live user's tablet | Never — this app is in active use right now |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Firestore writes | `await`ing a write inside a UI click handler, hanging offline (Pitfall 2) | Fire-and-forget with `.catch()`; localStorage write is the synchronous, blocking source of truth |
| Firestore offline persistence | Assuming `enableIndexedDbPersistence`/`persistentLocalCache` always succeeds silently | Check the returned promise; fall back explicitly to memory cache and don't claim durability if it failed (Pitfall 7) |
| Firestore multi-tab | Default single-tab persistence throws/degrades silently if a second tab/context opens Firestore | Configure `persistentMultipleTabManager()` explicitly if any scenario opens the app in two contexts at once (installed PWA + a browser tab checking stats), or accept and document single-tab-only support |
| Firestore write ids | `addDoc()` auto-ids create duplicates on retried/duplicated writes | `setDoc(doc(col, clientGeneratedId), ...)` for idempotent writes keyed by a locally-generated id (Pitfall 8) |
| MarvelCDB | Scraping raw HTML/full API responses and passing them through wholesale | Use MarvelCDB's public API (`marvelcdb.com/api/`) with an explicit field allow-list projection, discarding text/art fields (Pitfalls 11–12) |
| Workbox precache | Serving new catalogue/data as a runtime `fetch()` from `public/`, missing existing `globPatterns` | Statically import new content the same way `content/marvel-champions.json` already is, so it's covered by the existing `**/*.{js,css,html}` glob for free (Pitfall 9) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Firebase SDK imported eagerly at module top-level | First paint on `/` and `/marvel-champions` regresses; larger shared JS chunk | Dynamic `import()` inside a `.client.ts` plugin, only loaded when history/stats is actually used (Pitfall 6) | Noticeable at the very first milestone build; won't "grow" further, but starts wrong if done wrong |
| Firestore free-tier quota exhaustion from open/abusable writes | Backup silently stops working for the rest of the day, resets at Pacific midnight | Tight, shape-validated, append-only security rules (Pitfall 5) | As soon as anyone (bored visitor, bot, or accidental double-write loop) sends >20,000 writes/day |
| Counter-band hold-to-repeat with unbounded interval | HP counter races far past intended value, especially if a touch event is missed | Hard step/time cap on repeat, defensive cleanup on `pointercancel` (Pitfall 13) | On the very first real hold-and-slide-finger-off interaction, not a scale issue |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Open Firestore security rules (`if true` on write/update/delete) | Junk data corrupting the stats screen's win/loss percentages; quota exhaustion breaking the backup feature for the day | Shape-validated, create-only rules; never allow `update`/`delete` from the client (Pitfall 5) |
| Treating the public Firebase config as if it needed hiding | Wasted effort trying to "protect" a non-secret, while the actual risk (rules) goes unaddressed | Understand and document that the API key is not the security boundary — the rules are |
| Committing copyrighted card text/art into the public repo via a careless scrape | Legal exposure under this project's own stated constraint; embarrassing since MarvelCDB itself states "All texts are copyrighted by Fantasy Flight Games" | Explicit field allow-list in the fetch script; a cheap CI grep-guard against known long-text field names (Pitfall 12) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Counter band crowds out the large step text | Undermines the single thing this app exists to do — readable text at arm's length | Explicit height budget, `shrink-0` fixed band, hidden during setup steps that don't need it (Pitfall 4) |
| No undo/confirmation on counter taps | Small mis-taps accumulate into a wrong HP total nobody trusts, worse than the physical dial it replaced | Long-press-to-reset-to-default as a cheap undo; consider a brief "±1" visual flash to confirm each tap registered |
| Counter state lost on reload mid-game | Silent reset to pre-filled defaults reads as a bug, is worse than not having live counters | Persist counters in the same session shape as everything else, versioned correctly (Pitfall 3) |
| Stats screen reads a partially-synced or duplicated Firestore history | Numbers don't match what the group remembers playing, eroding trust in the whole history feature | Stats screen reads localStorage only, never Firestore, for the lifetime of this milestone (Pitfall 8) |

## "Looks Done But Isn't" Checklist

- [ ] **Parenthetical known values:** Often missing a genuine separation from `speech`/audio text — verify `collectSpeechEntries(marvelChampions)` output is unchanged by diffing against the pre-milestone baseline, not just that `voice-drift.test.ts` passes (it only catches drift in text that's already changed, not the fact that the wrong field was touched).
- [ ] **Session resume after v1.8:** Often missing a test for "a v1.7-shaped save opened by v1.8 code" — verify by hand-constructing an old-shape `PersistedPosition` object and asserting `resume()` degrades gracefully with fully-defined new-field defaults, not `undefined`.
- [ ] **Firestore write path:** Often missing an offline test — verify by running the existing offline e2e pattern (`context.setOffline(true)`) against the end-of-game confirmation flow and confirming no stall.
- [ ] **Firestore security rules:** Often missing shape validation and an explicit `update`/`delete` deny — verify by reading the actual deployed `firestore.rules` content, not just "it works when I write from the app."
- [ ] **Catalogue reproducibility:** Often missing an actual re-runnable script — verify a documented npm script exists and running it twice on the same source data produces byte-identical output.
- [ ] **Catalogue legal scope:** Often missing a check for accidentally-included text/art fields — verify by grepping the committed catalogue JSON for long-text or image-URL-shaped values.
- [ ] **Counter band layout:** Often missing a real-device or realistic-viewport check — verify the step text area doesn't shrink below its pre-milestone size in landscape at the target tablet aspect ratio.
- [ ] **PWA offline catalogue access:** Often missing an update to the offline e2e test — verify the hero-selection modal has its data available with the service worker installed and network disabled.
- [ ] **Villain HP schema:** Often missing the per-stage/per-player-count dimension — verify the schema shape (not just the populated numbers) against the Rules Reference's stage/scaling rules.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|-----------------|
| Voice-drift/audio orphaned by a text change | LOW | Revert the `content/marvel-champions.json` text change; the parenthetical value belongs in a separate display-only field, not in `text`/`speech` — no audio needs regenerating if this is caught before merge |
| In-progress saved game corrupted by a shape change | MEDIUM | Bump `formatVersion`, ship a fix so old shapes fall back to `content-changed` (fresh setup context preserved) rather than crashing or showing undefined counters — acceptable one-time loss of *mid-round position* (not context) for whoever is affected, consistent with the existing `contentChangedFallback` philosophy |
| Firestore quota exhausted for the day | LOW | Nothing to do but wait for the Pacific-midnight reset; localStorage (source of truth) is unaffected — this is why "backup, not source of truth" matters |
| Junk data in Firestore from open rules discovered post-launch | MEDIUM | Tighten `firestore.rules` immediately (append-only, shape-validated); manually delete junk documents via the console; since the stats screen reads localStorage only (Pitfall 8's prevention), user-visible stats were never affected |
| Catalogue accidentally includes copyrighted text/art | MEDIUM–HIGH | Force-push a history-scrubbing rewrite is disproportionate for a hobby repo; at minimum, remove the offending fields in a follow-up commit immediately and treat it as a genuine incident given the explicit legal constraint, not routine cleanup |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|--------------|
| 1. Text/audio drift from parenthetical numbers | Catalogue & Selection / Parenthetical Numbers | `voice-drift.test.ts` stays green with zero content diffs; new test diffs `collectSpeechEntries` output byte-for-byte |
| 2. `await`ed Firestore write hangs offline | Firestore Backup | Offline e2e test on the end-of-game confirmation flow, `context.setOffline(true)` |
| 3. Persisted session shape breaks resume | Counter Band / History & Persistence (whichever lands first) | New `engine/persistence.test.ts` case: old-shape object through `resume()` |
| 4. Counter band shrinks step text | Counter Band | Explicit height-budget check against a reference tablet viewport, real-device screenshot review |
| 5. Open Firestore security rules | Firestore Backup | Manual read of deployed `firestore.rules`; confirm no `if true` on write, no `update`/`delete` allowed |
| 6. Firebase SDK blocks first paint | Firestore Backup | Bundle-size diff on `.output/public/_nuxt` for the `/` and `/marvel-champions` chunks before/after |
| 7. Silent Firestore persistence failure | Firestore Backup | Manual check: private-mode tab, and second-tab-while-installed-PWA-open, confirm no crash and no false "synced" claim |
| 8. Dual-source-of-truth desync | History & Persistence + Firestore Backup + Stats Screen | Code review rule: stats screen has zero Firestore reads; idempotent `setDoc` with client-generated id |
| 9. Service-worker glob misses new assets | Catalogue & Selection + Stats Screen | Extend `e2e/offline-flow.spec.ts` to open the hero-selection modal and the stats route fully offline |
| 10. Villain HP flattened incorrectly | Catalogue & Selection | Schema review against Rules Reference stage/scaling section before scraper is written |
| 11. Non-reproducible scrape | Catalogue & Selection | A committed, documented npm script exists (`scripts/catalogue/fetch-marvelcdb.mjs`) with a `generatedAt` manifest field |
| 12. Copyrighted text/art in repo | Catalogue & Selection | Grep-guard test on `content/heroes.json` for disallowed field names; manual review before merge |
| 13. Counter touch-UX regressions | Counter Band | Manual real-device test: rapid taps, hold-repeat, reload mid-game, Bluetooth keyboard Space press |
| 14. Scope creep into excluded features | All phases | Each phase plan restates the specific excluded adjacent features from `PROJECT.md`'s Out of Scope section |

## Sources

- `.planning/PROJECT.md` — v1.8 scope, explicit Out-of-Scope reversions, Key Decisions (CODE, direct read).
- `CLAUDE.md` — stack decisions, `registerType: 'prompt'` rationale, "What NOT to Use" table (CODE, direct read).
- `app/composables/usePersistedSession.ts`, `engine/persistence.ts`, `engine/types.ts`, `engine/resolve.ts` — persisted session shape, resume gate, text/speech resolution (CODE, direct read, HIGH confidence).
- `engine/__tests__/voice-drift.test.ts`, `scripts/voice/manifest.json` pattern — voice-drift gate mechanics (CODE, direct read, HIGH confidence).
- `nuxt.config.ts` — Workbox `globPatterns`/`globIgnores`, `nitro.prerender.routes`, route-rule cache headers (CODE, direct read, HIGH confidence).
- `app/composables/useStepShortcuts.ts`, `app/components/NavBand.vue`, `app/components/StepScreen.vue` — keyboard-shortcut/touch-press patterns already established in this codebase (CODE, direct read, HIGH confidence).
- `app/composables/useGameContent.ts` — static-import content pattern, confirms game JSON is bundled into JS, not runtime-fetched (CODE, direct read, HIGH confidence).
- `firebase/firebase-js-sdk` GitHub issues #6515, #1497, #8696 — Firestore write-promise-resolves-on-server-ack behavior (WebSearch, MEDIUM confidence, cross-confirmed across multiple issues and official-docs-adjacent blog summaries).
- Firebase/Google Cloud Firestore documentation (`firebase.google.com/docs/firestore/manage-data/enable-offline`, `docs.cloud.google.com/firestore/quotas`) — `persistentLocalCache`/`persistentMultipleTabManager` API shape, Spark plan quotas (50k reads/day, 20k writes/day, 20k deletes/day, 1 GiB storage) (WebSearch summary of official docs, MEDIUM confidence — not independently re-verified against the live console in 2026).
- `https://marvelcdb.com/api/` — MarvelCDB public API existence, OAuth2 vs public endpoints, explicit copyright statement on card text (WebFetch-adjacent WebSearch summary of an official first-party page, MEDIUM confidence).
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-RESEARCH.md` — origin of "Anti-Patrón 3/4" referenced in code comments (CODE, direct grep match, HIGH confidence for the fact these anti-patterns are an established project vocabulary).

---
*Pitfalls research for: TableGameAssistant v1.8 milestone*
*Researched: 2026-09-07*
