# Stack Research — v1.8 Additions

**Domain:** Cloud backup persistence (Firebase Firestore), static reference-data catalogue (MarvelCDB), touch counter widgets, stats screen — added to an already-shipped Nuxt 4 SSG/PWA app
**Researched:** 2026-09-07
**Confidence:** HIGH for versions/API shape (verified against npm registry + official docs + a live MarvelCDB API call), MEDIUM for some bundle-size and browser-storage-clearing claims (single-source or logically-derived, flagged inline)

This file covers **only the NEW additions for v1.8**. The existing stack (Nuxt 4.5.2, `@vite-pwa/nuxt`, `@vueuse/core`, Tailwind v4, Zod, Vitest/Playwright) is unchanged and not re-litigated here — see the stack section of `.planning/PROJECT.md` / `CLAUDE.md` for that.

## Recommended Stack

### Core Technologies (new)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `firebase` (bare modular SDK — `firebase/app` + `firebase/firestore` submodules only) | **12.18.0** (verified: `npm view firebase version` → `12.18.0`, published 2026-08-19) | Cloud backup for the game-history log | The user already chose Firestore; the only open question was *how*. The bare modular SDK's tree-shaking (ES modules, `import { initializeFirestore } from 'firebase/firestore'`) means you only pay for what you import — no need for `firebase/auth`, `firebase/analytics`, `firebase/storage`, etc. |
| `firebase/auth` (same `firebase` package, anonymous sign-in only) | 12.18.0 | Auth-free per-browser identity so Firestore rules can distinguish writers without a login screen | `signInAnonymously()` is the standard, documented way to let Firestore Security Rules require `request.auth != null` without ever showing a login UI. See section (b) below for the full trade-off. |
| Firestore Security Rules (`rules_version = '2'`, deployed via `firebase deploy --only firestore:rules` or the Firebase console) | Firestore Rules Language v2 | Server-side enforcement: anyone can append a game record, nobody can read anyone else's history, nobody can delete anything | This is not an npm package — it is config that lives in a `firestore.rules` file in the repo and is deployed via the Firebase CLI (`firebase-tools`, dev-only). It is the actual security boundary; the API key in the bundle is not. |

### What is explicitly NOT added for Firebase

| Not added | Why |
|-----------|-----|
| `vuefire` / `nuxt-vuefire` | See section (a) below — real value (`useDocument`/`useCollection` reactive bindings, SSR auth session cookies) targets apps with live server-rendering and multi-document reactive UI. This app is `nuxt generate` (fully static, no server at runtime) and needs exactly two calls: `addDoc()` on game-end and `getDocs()` on the stats screen. The bare SDK is *less* code, not more, for this shape. |
| `@nuxtjs/firebase` | **Abandoned.** `npm view @nuxtjs/firebase versions` shows the last real release, 8.2.2, published 2022-01-24 — no releases in 4+ years. It also depends on `firebase-admin` (a Node.js *server-side* SDK, wrong runtime entirely for a static client app) and predates the modular v9+ SDK. Do not use. |
| `firebase-admin` | Server-side only (service-account credentials, Node.js). This project has no server at runtime (`nuxt generate` + Vercel static hosting) and no reason to hold Firestore admin credentials anywhere. |
| `firebase/firestore/lite` (Firestore "Lite" build) | **Actively wrong for this project.** Lite trims exactly the piece the user picked Firestore *for*: its architecture omits the local mutation queue, so it has **no offline write queueing and no offline persistence at all** — confirmed via the official Firestore Lite solutions doc, which states Lite "omits latency compensation, offline caching, query resumption and snapshot listeners" and is meant for environments that "have connectivity." Since "never blocks gameplay" + "durable backup via the SDK's offline queue" is the entire rationale for choosing Firestore in `.planning/PROJECT.md`, using Lite would silently defeat that rationale. Use full `firebase/firestore`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new for the counter UI | — | Up/down stepper widgets, no keyboard | Plain Vue `ref`/`computed` + Tailwind — see section (d), no library earns its place here. |
| None new for the stats screen | — | Win % per hero / per villain | Plain composable computing percentages from the (small — dozens of rows) history array + Tailwind bars/text — see section (d). |

### Development Tools (new, dev-only)

| Tool | Purpose | Notes |
|------|---------|-------|
| `firebase-tools` CLI (npx, not a project dependency) | Deploying `firestore.rules`, optionally running the Firestore emulator locally | Run via `npx firebase-tools@latest deploy --only firestore:rules` — no need to add it to `package.json`; it is a deploy-time tool, not a build-time or runtime dependency. |
| A one-off/dev Node script (`scripts/marvelcdb/fetch-catalogue.mjs`, plain `fetch()` + `fs.writeFile`, zero new dependencies — Node 18+ has global `fetch`) | Build the committed hero/villain catalogue JSON from MarvelCDB | Not an npm package at all — see section (c). Run manually when MarvelCDB data needs refreshing (new pack, errata); output is a committed JSON file, validated the same way other content is (a Zod schema exercised by a Vitest test, Node/test-time only, matching the project's existing "Zod never ships to the client" rule). |

## Installation

```bash
# Core (Firestore backup)
npm install firebase@^12.18.0

# Dev-only, not added to package.json — run via npx as needed
npx firebase-tools@latest deploy --only firestore:rules
```

No other new runtime dependencies for v1.8.

---

## (a) Firebase in a Nuxt 4 SSG app

**Package/version:** `firebase` npm package, current stable **12.18.0** (verified via `npm view firebase version` and `npm view firebase time.modified` → published 2026-08-19; `dist-tags.latest` confirms 12.18.0 is the intended stable release, not a canary/beta tag). HIGH confidence.

**Submodules needed:** `firebase/app` (required bootstrap) + `firebase/firestore` (full, not `firebase/firestore/lite` — see table above) + `firebase/auth` (for anonymous sign-in, section b). Nothing else — no `firebase/analytics`, `firebase/storage`, `firebase/functions`, `firebase/messaging`. The modular v9+ API is import-based (`import { initializeApp } from 'firebase/app'`), which is what makes tree-shaking possible; the deprecated `firebase/compat/*` namespaced API pulls in far more code and should not be used.

**Is `vuefire`/`nuxt-vuefire` worth it here?** No — MEDIUM-HIGH confidence, reasoned from official/community sources:
- `nuxt-vuefire` (npm `nuxt-vuefire@1.1.2`, verified via `npm view`, last published 2026-04-15) and `vuefire@3.2.3` are current and actively maintained (peer-dep on `firebase ^9 || ^10 || ^11 || ^12`, so 12.18.0 is compatible) — this is **not** a "don't use it, it's abandoned" case like `@nuxtjs/firebase`.
- But its distinguishing value — reactive `useDocument()`/`useCollection()` bindings that auto-update the UI as Firestore data changes, and (per the VueFire Nuxt auth docs and a corroborating community write-up, "Firebase auth on the server," github.com/vuejs/vuefire discussions) **SSR session-cookie auth, which explicitly requires `firebase-admin` and a service-account JSON file when both SSR and auth features are turned on** — targets a server-rendered app with live reactive data. This app is `nuxt generate`: there is no server at runtime, `ssr: true` only affects the build-time prerender pass, and Vercel serves static files afterward. Pulling in a module whose main feature requires provisioning a Google Cloud service account for a capability (SSR auth) this app structurally cannot use is the wrong trade.
- The actual v1.8 need is two calls: `addDoc(collection(db, 'games'), record)` on game-end, and `getDocs(collection(db, 'games'))` on the stats screen. That is less code written directly against `firebase/firestore` than the setup/config surface `nuxt-vuefire` asks for.
- **Verdict: bare modular SDK, not `nuxt-vuefire`.** Revisit only if the app later grows genuine multi-document *reactive* UI (e.g., live-updating a shared table across devices) — not in scope for v1.8's "read them all back once, on the stats screen" shape.

**Bundle cost — MEDIUM confidence, cite the one measured source found (miyauchi.dev's Firebase Modular SDK bundle-size comparison, cross-checked against Firebase's own blog post on Firestore bundle trimming):**
- `firebase/app` alone: small, single-digit KB gzipped (base bootstrap only) — not independently re-measured this session, treat as an estimate.
- Full `firebase/firestore` (not Lite): **≈196 KB raw / ≈61 KB gzipped** per the Firebase engineering blog's own comparison post ("Trim your JavaScript bundles with Firestore Lite," firebase.blog, 2023 — re-fetched and confirmed reachable/current this session). This is the number that matters here since Lite is ruled out (see table above).
- `firebase/auth` (anonymous-only usage) adds further weight on top; not independently measured this session — budget for it, flag as MEDIUM/estimate.
- **Recommendation regardless of the exact number:** this SDK slice must be **client-only and lazy-loaded**, not part of the initial bundle. Two independent reasons converge on the same fix:
  1. It is meaningfully large (tens of KB gzipped) relative to this app's current prerendered-static footprint, and it does nothing for first paint of the setup screen.
  2. It touches `window`/browser-only IndexedDB APIs, which is also the standard Nuxt SSR-safety pattern this codebase already follows for `useLocalStorage`/`useWakeLock` (SSR-safe wrappers, but the *action* only happens client-side).
  - Concretely: put Firebase init in a `.client.ts` plugin (`app/plugins/firebase.client.ts`) or behind a dynamic `import()` triggered only when a game actually ends (write) or the stats screen is opened (read) — never eagerly on every page load. This keeps the setup screen and the in-game step flow (the parts that must be fastest and must never depend on network) completely untouched by Firebase's weight.

**Offline persistence API — confirmed via official Firebase docs (fetched `firebase.google.com/docs/firestore/manage-data/enable-offline` this session):**
```ts
import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore'

const app = initializeApp(firebaseConfig)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
})
```
- **This is the current API.** `enableIndexedDbPersistence()` is the older pattern; `initializeFirestore(app, { localCache: persistentLocalCache(...) })` is what current official docs present as the way to configure offline caching. HIGH confidence (fetched directly from the official "Access data offline" doc this session).
- Constraints, HIGH confidence (same doc): default cache size threshold is 100 MB, configurable via `cacheSizeBytes` (minimum 1 MB), or `CACHE_SIZE_UNLIMITED` to disable eviction — irrelevant at this app's data volume (a few dozen small game records).
- Tab manager choice: `persistentSingleTabManager()` (default single-tab behavior) is the right choice for this app — it is used on one tablet, one tab, at a time. `persistentMultipleTabManager()` exists for apps opened in several tabs simultaneously; not this app's shape, don't add the complexity.
- **Offline queue behavior confirmed, MEDIUM-HIGH confidence (multiple corroborating sources, consistent with documented Firestore architecture):** writes made while offline (`addDoc()` called with no network) are queued in the IndexedDB-backed local cache and automatically flushed to the server once connectivity returns — **this survives a page reload / app relaunch**, because the queue lives in IndexedDB, not memory. This is exactly the property that makes it safe to write the game-history record the moment a game ends, unconditionally, without checking `navigator.onLine` first: offline is a transparently-handled state, not an error branch the app needs to write itself.
- Practically: never call anything that awaits the Firestore write before letting the group move on — fire `addDoc()` and don't block the UI on its promise resolving. This lines up exactly with the constraint "must NEVER block gameplay."

## (b) Auth-free writes

**Minimum viable, non-embarrassing approach: Firebase Anonymous Authentication.**

- **Requires `firebase/auth`.** `signInAnonymously(auth)` is the documented API (fetched `firebase.google.com/docs/auth/web/anonymous-auth` this session). There is no way to write to Firestore under an `if request.auth != null` rule without importing *some* auth module — that import cost is unavoidable if you want rules stronger than "wide open to the internet."
- **Bundle cost:** not independently re-measured this session for the auth-only slice; treat as an additional tens-of-KB-gzipped cost stacked on top of Firestore's ~61 KB. Flag as an estimate (LOW-MEDIUM confidence on the exact number), but the *direction* (non-trivial, worth lazy-loading alongside Firestore in the same client-only chunk) is not in doubt.
- **Does the anonymous UID survive a browser data clear? No — MEDIUM-HIGH confidence, reasoned from documented, uncontested Firebase Auth behavior rather than a single explicit doc sentence:** Firebase Auth's `local` persistence (the web default, per the official Auth State Persistence doc fetched this session) stores the session in browser storage (historically localStorage, migrated toward IndexedDB in more recent SDK versions per community/GitHub-issue corroboration). Browser "clear site data" wipes both mechanisms. **Consequence: clearing the tablet's browser data creates a brand-new anonymous UID on next launch, indistinguishable from a different device.** This matters directly for this project because:
  - The history log is written under `uid = auth.currentUser.uid` — after a data clear, old records under the previous UID become unreadable by the new UID if rules scope reads by UID (see below), and new records accrue under a fresh UID.
  - This is **fine and expected** given the project's own framing: Firestore is a **backup**, not the source of truth (`localStorage` is), and "an anonymous UID isn't stable forever" is a normal, disclosed limitation of anonymous auth — not a defect introduced by this integration. Worth stating plainly in the repo/docs so nobody is surprised later that a factory-reset tablet "loses" its old cloud history (it doesn't lose it server-side, it just can no longer prove it wrote it, per the security-rules pattern below).

**Firestore Security Rules for "anyone can append, nobody can read anyone else's, nobody can delete":**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /games/{gameId} {
      // Append-only: any signed-in (including anonymous) client may create,
      // provided the payload matches the expected shape and claims its own uid.
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.keys().hasOnly([
                         'uid', 'game', 'villain', 'heroes', 'playerNames',
                         'won', 'difficulty', 'playerCount', 'roundCount',
                         'durationSeconds', 'createdAt'
                       ])
                    && request.resource.data.createdAt == request.time;

      // Nobody reads anyone else's record from the client; the stats screen
      // reads via a query scoped to `uid == request.auth.uid`, OR (if cross-
      // device aggregate stats across every session are wanted later) reads
      // are opened up separately with an explicit, deliberate decision — not
      // by default.
      allow get, list: if request.auth != null
                        && resource.data.uid == request.auth.uid;

      // Nobody, ever, updates or deletes a history record from the client.
      allow update, delete: if false;
    }
  }
}
```

Confirmed syntax (`rules_version = '2'`, `service cloud.firestore`, `match .../documents`, `request.auth`, `request.resource.data`, `resource.data`, granular `create`/`update`/`delete`/`get`/`list`) against the official "Structuring Cloud Firestore Security Rules" doc, fetched this session. HIGH confidence on the syntax; the specific field list/`hasOnly()` validation is this research's own design recommendation (standard, widely-documented pattern for constraining write shape), not a copy of an official example.

**What a public API key in a static bundle does and does not expose — HIGH confidence, converging from multiple 2026 sources plus Firebase's own "API keys" doc:**
- **Does NOT expose:** it is not a secret or a password. It is a public per-project identifier, the same category of information as the project ID — Firebase's own docs and multiple independent security write-ups agree it is "designed to be public" and safe to commit to a public GitHub repo (directly relevant here since this repo is presumably public/visible to the group).
- **Does expose, if rules are misconfigured:** anyone who extracts the key (trivial — it is in the shipped JS bundle) can call Firebase Auth/Firestore REST endpoints directly, bypassing your UI entirely. With the rules above, the worst a stranger can do is: (1) sign in anonymously (free, unlimited, this is by design — anonymous auth *is* "no login"), and (2) create *well-formed* game records under their own fresh anonymous UID. They cannot read, update, or delete anyone's data, including their own after the fact, because rules forbid it. This is a "some stranger could pollute your free-tier write quota with junk documents" risk, not a data-breach risk — acceptable for a friend-group hobby app with no PII in the record shape above (no emails, no real identity, just hero/villain names and a result). If it ever became a real nuisance, adding Firebase App Check (attests requests come from your actual deployed app, not a script) is the documented next step — not needed to ship v1.8.

## (c) MarvelCDB data extraction

**Documented public API — verified this session via a direct WebFetch of `https://marvelcdb.com/api/doc` plus live `curl` calls against the real endpoints:**

- `GET https://marvelcdb.com/api/public/cards/{pack_code}.json` — all cards in a given pack. **Verified live:** `curl https://marvelcdb.com/api/public/cards/core.json` returned a 320 KB JSON array of every Core Set card.
- `GET https://marvelcdb.com/api/public/card/{card_code}.json` — a single card.
- `GET https://marvelcdb.com/api/public/packs/` — list of all packs with `code`/`name`/`id` (needed to enumerate which pack codes to fetch for the 18 heroes + 3 villains).
- **No API key required** for any `/api/public/*` endpoint — confirmed both by the doc page and by successfully calling the endpoints with a bare `curl`, no auth header.
- **No documented rate limit** — the doc page states none explicitly; a live response header check (`curl -I`) showed `Cache-Control: max-age=600, public` and `Access-Control-Allow-Origin: *` (CORS wide open) but no `X-RateLimit-*` headers. `robots.txt` has no `Disallow` rules. MEDIUM confidence on "no limit exists at all" (absence of evidence, not a documented guarantee) — mitigated by the fact this project only needs to fetch ~4 small pack files (Core Set + whichever packs hold the other heroes/villains) **once**, as a dev-time script, not repeatedly or at runtime.
- **No explicit terms-of-use page was found** during this session's research restating fair-use conditions beyond what the project's own legal constraint already covers (names and numbers only, no card text/art) — this matches the community norm (MarvelCDB is itself a fan-run database whose own content is sourced this way), but flag as MEDIUM confidence / unverified against a dedicated ToS document, since none was located.

**Right shape: a committed, dev-time script writing a JSON file — confirmed correct, not "almost certainly wrong":**
- This is not actually in question given the project's own hard offline constraint — a runtime `fetch()` to marvelcdb.com would break the "works with wifi down mid-game" requirement outright, and would also mean an uncached third-party dependency sits between the tablet and displaying a hero's health.
- Concretely: a plain Node script (`scripts/marvelcdb/fetch-catalogue.mjs`, no new npm dependency needed — Node 18+ ships a global `fetch`) that calls the pack endpoints above, extracts only `name`, `real_name` (alter ego, from the linked `alter_ego` card via `linked_card`), `hand_size`, and `health` for heroes, and `name`, `health`, `stage` for villain stage cards, and writes a small committed `content/marvel-champions-catalogue.json`. Validate it with a Zod schema exercised by a Vitest test — same pattern the project already uses for game-step content, same "Zod never ships to the client" rule (Node/test-time only).
- Re-run the script by hand only when MarvelCDB data changes (new pack, FAQ errata) — not on every build, and definitely not on every page load.

**How villain cards encode health-per-player and stage numbering — confirmed via a live API call this session (`curl https://marvelcdb.com/api/public/cards/core.json`, inspected the three Rhino villain-stage cards):**
- Each villain has **one card per stage**, sharing a `card_set_code` (e.g. `"rhino"`) but distinct `code`s (`01094`, `01095`, `01096`).
- **Stage numbering** is a Roman-numeral string field: `"stage": "I"`, `"II"`, `"III"` — not an integer. Parse/map this explicitly (`{ I: 1, II: 2, III: 3 }`) rather than assuming a numeric field exists.
- **Health-per-player encoding:** `"health": 14` (a base number) plus a boolean flag `"health_per_hero": true`. When that flag is true, the printed/effective health for an N-player game is `health × N` (this is the standard, documented Marvel Champions rule for scaling villain health by player count, and matches why the field is named `health_per_hero` rather than a flat number) — the catalogue script must carry both the base `health` number and the `health_per_hero` boolean through to the app, and the app's precompute step (already planned in v1.8 for "precargados con el valor correcto según la selección y el nº de jugadores") does the multiplication at setup time, not MarvelCDB.
- There is also a `health_per_group` boolean (false on all three Rhino stages) for the rarer case of a villain whose health scales per-*group* of heroes rather than per individual hero — worth carrying through the schema even if unused by the initial 3-villain set, since it is a real, documented alternate encoding in the same data.
- Hero cards separately expose `hand_size` directly as a flat integer (confirmed: Iron Man's hero-side card has `"hand_size": 1` — this is a bonus/modifier value specific to that card's ability text, not the hero's actual starting hand size) — **note this pitfall explicitly:** the *actual* starting hand size for most heroes is the flat value on the **alter-ego** side (`linked_card`), not the hero side; confirmed live: Tony Stark's `linked_card` object carries `"hand_size": 6`, the correct "Marvel Champions starting hand is 6 cards" baseline, while the hero-front-side `hand_size: 1` is really "Iron Man gets +1 hand size per Tech upgrade," a card-text-derived number that happens to share the same JSON field name. **Read the alter-ego card's `hand_size`, not the hero card's, when populating the catalogue** — this is exactly the kind of "looks right, is wrong" trap the project's own D-36 practice (human review of extracted data, not just schema validation) should catch.

## (d) Anything else genuinely needed?

**No new dependency for the counter UI.** An up/down stepper is a `<button>` + a bound `ref<number>` + Tailwind classes for large touch targets (matching this app's existing "legible a un brazo de distancia" / large-touch-target conventions from v1). There is no meaningful gap a stepper library fills here that plain Vue doesn't already cover in ~10 lines per widget, and adding one would be exactly the kind of unnecessary dependency this project's existing "What NOT to Use" table already warns against in spirit (e.g. rejecting a whole UI kit for "a couple of hand-styled native inputs").

**No new dependency for the stats screen.** "Win % per hero / per villain" over a history log of, realistically, dozens to low hundreds of rows (a friend group's play sessions) is a `reduce()` over an array producing a handful of percentages, rendered as text and/or simple Tailwind-styled horizontal bars (a `<div>` with `width: {pct}%`). A charting library (Chart.js, ApexCharts, etc.) would be justified for multi-series time trends, tooltips, zooming, or dozens of simultaneous data series — none of which this screen needs. Revisit only if a future milestone asks for something a `<div>` bar genuinely can't express (e.g., a real time-series graph of win rate over months) — not a v1.8 need.

## (e) What NOT to add — explicit warnings

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Pinia | Unchanged project decision (see existing `CLAUDE.md`/PROJECT.md stack table) — the app still has one active game/session at a time; the new history log and catalogue are read/write-once-per-event data, not reactive multi-store state that needs Pinia's devtools/time-travel. `useLocalStorage` (existing history-as-source-of-truth) plus a plain composable wrapping the Firestore calls is sufficient. | Composables + `useLocalStorage`, as already established. |
| Any charting library for the stats screen | Dataset is small (dozens of rows), the ask is simple percentages, and no interactivity (zoom/tooltip/multi-series) is in scope. A charting library would be pure bytes for no user-visible gain at this data volume — see (d). | Plain Vue + Tailwind bars/text. |
| `@nuxtjs/firebase` | Unmaintained — last real release 2022-01-24 (v8.2.2), depends on the server-only `firebase-admin` package, predates the modular v9+ SDK entirely. Confirmed via `npm view @nuxtjs/firebase versions`/`time`. | Bare `firebase` package (12.18.0), modular imports. |
| Shipping Zod to the client for the new MarvelCDB catalogue or the Firestore write payload | The project's own existing rule (Zod is Node/test-time only, validates content in CI, never bundled to the browser) applies identically to the new catalogue JSON and to validating the shape of a game-history record before writing it. Validate the catalogue at build/dev time with a Vitest test; validate the outgoing Firestore payload with a plain hand-written TypeScript type/shape check in the client composable (or, if runtime validation is truly wanted client-side, that is exactly the documented case for reaching for Valibot instead — see the existing "Alternatives Considered" table — not a reason to ship Zod). | Zod stays a devDependency; a plain TS interface (or Valibot, only if client-side runtime validation is later judged necessary) types the Firestore write. |
| `firebase/firestore/lite` | Defeats the entire reason Firestore was chosen — Lite has no offline write queue at all (confirmed via official Firestore Lite solutions doc). | Full `firebase/firestore` with `persistentLocalCache`. |
| `nuxt-vuefire` for this v1.8 scope | Not abandoned, but its differentiators (SSR reactive bindings, SSR auth session cookies requiring `firebase-admin` + a service account) target a server-rendered app; this app has no server at runtime. Two `addDoc()`/`getDocs()` calls against the bare SDK are simpler than provisioning a module built around a runtime model this app doesn't have. | Bare modular `firebase` SDK, `.client.ts` plugin, lazy-loaded. |
| A voice-picker-style "which auth provider" UI, or any real login (email/password, Google sign-in, etc.) | Explicit project requirement: no user accounts, ever. Anonymous auth is chosen specifically because it needs zero UI. | `signInAnonymously()`, silent, on first Firestore interaction. |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `firebase@12.18.0` | `nuxt@4.5.2` | Firebase's modular SDK is framework-agnostic ESM; no Nuxt-specific compatibility constraint exists because it's used directly, not via a Nuxt module. Must be wrapped in a `.client.ts` plugin or dynamic import to stay out of the SSR/prerender pass (the existing `ssr: true` setting only governs the build-time prerender; Firebase must never execute during that pass, since it touches `window`/IndexedDB). |
| `firebase@12.18.0` | `vuefire@3.2.3` / `nuxt-vuefire@1.1.2` | Peer-dependency compatible (`vuefire`'s stated peer range is `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0 \|\| ^12.0.0`) if this recommendation is revisited later — not a blocker either way, just not chosen for v1.8. |
| MarvelCDB fetch script | Node 18+ (for global `fetch`) | This repo's existing `scripts/voice/generate.mjs` and `scripts/pwa/generate-icons.mjs` establish the pattern of plain `.mjs` dev scripts with no new dependency; the MarvelCDB script follows the same convention. |
| Firestore Security Rules (`rules_version = '2'`) | Firestore in Native mode (the only mode a new Firebase project offers by default) | Not a package-compatibility concern, but note explicitly: Datastore mode (the legacy alternative) uses a different, GQL-based rules concept and is not what a new "Create database" flow in the Firebase console produces today — verify Native mode is selected when the Firestore database is provisioned. |

## Sources

- `npm view firebase version` / `npm view firebase time.modified` / `npm view firebase --json` (dist-tags) — 2026-09-07, confirms `12.18.0` current stable.
- `npm view @nuxtjs/firebase versions` / `time --json` / `dependencies` — 2026-09-07, confirms last real release 8.2.2 published 2022-01-24, depends on `firebase-admin`.
- `npm view vuefire version` / `peerDependencies`, `npm view nuxt-vuefire version` / `dependencies` — 2026-09-07, confirms current versions (3.2.3 / 1.1.2) and firebase 12.x peer-compatibility.
- https://firebase.google.com/docs/firestore/manage-data/enable-offline — WebFetch, 2026-09-07 — `initializeFirestore`/`persistentLocalCache` current API, cache size defaults, HIGH confidence.
- https://firebase.google.com/docs/auth/web/anonymous-auth — WebFetch, 2026-09-07 — `signInAnonymously`, `firebase/auth` requirement, HIGH confidence on the API shape.
- https://firebase.google.com/docs/auth/web/auth-state-persistence — WebFetch, 2026-09-07 — default `local` persistence confirmed; storage-clearing consequence reasoned from this plus corroborating community/GitHub sources (MEDIUM-HIGH confidence, not a single explicit doc sentence).
- https://firebase.google.com/docs/firestore/security/rules-structure — WebFetch, 2026-09-07 — confirmed exact rules syntax (`rules_version`, `service cloud.firestore`, `match`, `request.auth`, `request.resource.data`, `resource.data`), HIGH confidence.
- https://firebase.blog/posts/2023/03/trim-javascript-bundles-firestore-lite — WebFetch, 2026-09-07 — Firestore Lite vs full bundle-size numbers (196K/61K gzip full vs 54.3K/16.9K gzip lite) and Lite's lack of offline persistence, HIGH confidence on the "Lite has no offline queue" claim (matches independent corroboration below), MEDIUM confidence on the exact KB figures (single source, 2023-dated, not independently re-measured this session).
- WebSearch corroboration ("firebase/firestore/lite offline persistence support queue writes") — multiple independent sources (DeepWiki architecture breakdown, official Firestore Lite solutions doc) agree Lite omits the LocalStore/MutationQueue entirely — MEDIUM-HIGH confidence via convergence.
- https://marvelcdb.com/api/doc — WebFetch, 2026-09-07 — public endpoint list, no-auth-required confirmation.
- Live `curl` calls against `https://marvelcdb.com/api/public/packs/` and `https://marvelcdb.com/api/public/cards/core.json` — 2026-09-07 — HIGH confidence, directly observed JSON shape for hero cards (`hand_size`, `health`, linked alter-ego card), villain stage cards (`stage` as Roman numeral, `health`, `health_per_hero`, `health_per_group` booleans), and response headers (no rate-limit headers present, `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=600`).
- `curl -I https://marvelcdb.com/api/public/cards/core.json` and `curl https://marvelcdb.com/robots.txt` — 2026-09-07 — no `Disallow` rules, no explicit rate-limit response headers (absence of evidence, MEDIUM confidence that no limit exists at all).
- Firebase API-key public-by-design consensus — WebSearch across multiple independent 2026 security write-ups (iloveblogs.blog, aakashx.com, ismysitehackable.com) plus Firebase's own "API keys" doc — HIGH confidence via convergence: the key is a public identifier, real protection is Security Rules (and, if ever needed, App Check).
- WebSearch ("nuxt-vuefire SSR admin SDK service account setup required auth session") — corroborating GitHub discussions (vuejs/vuefire #1592, #1329) and a Medium write-up describing the `firebase-admin` + service-account requirement for VueFire's SSR auth session-cookie feature — MEDIUM-HIGH confidence via convergence, not a single official doc page fetched directly (the official VueFire Nuxt auth doc page returned insufficiently detailed content on WebFetch).

---
*Stack research for: TableGameAssistant v1.8 (Firebase Firestore backup, MarvelCDB catalogue, counters, stats)*
*Researched: 2026-09-07*
