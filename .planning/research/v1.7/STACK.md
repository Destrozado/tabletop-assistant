# Stack Research

**Domain:** Tablet-first, offline-capable, no-backend Nuxt 4 rules-flow assistant (Marvel Champions), Spanish TTS
**Researched:** 2026-08-28
**Confidence:** MEDIUM-HIGH (versions verified live via `npm view` and official docs; a few platform-support and "best practice" calls are WebSearch-derived and flagged individually)

## Verification method

All package versions below were checked live on 2026-08-28 via `npm view <pkg> version` (npm registry, not training data) plus WebFetch/WebSearch against `nuxt.com`, `tailwindcss.com`, `vite-pwa-org.netlify.app`, `vueuse.org`, `caniuse.com`, and `web.dev`. Where a claim is WebSearch-summary-only (not read from the primary source directly), it is marked LOW/MEDIUM and called out explicitly. Notable fact from this check: **Nuxt 3 reached end-of-life on 2026-07-31** (no more bug/security fixes) — this is not just the user's preference, Nuxt 4 is now the only supported line.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Nuxt | **4.5.2** (nuxi CLI 3.37.0) | App framework | Latest stable on the 4.x line as of 2026-08-28. Nuxt 3 is EOL (2026-07-31), so 4.x is mandatory, not optional. New projects scaffolded with `nuxi init` already default `future.compatibilityVersion: 4` and the `app/` directory layout — nothing extra to opt into. |
| Rendering mode: `nuxi generate` (SSG / full prerender) | — | Build output | **Decision, not left open:** use `nuxt generate`, NOT `ssr: false` (SPA-only). See rationale below. |
| `@vite-pwa/nuxt` | **1.1.1** (wraps `vite-plugin-pwa` 1.3.0, `workbox-window` 7.4.1) | PWA / offline caching | Still the standard, actively maintained PWA module for Nuxt (official Nuxt Modules listing). Zero-config Workbox service-worker generation over a prerendered static build is exactly this app's shape. |
| `@vueuse/core` + `@vueuse/nuxt` | **14.4.0** | Composable utility layer (TTS, localStorage, wake lock) | One dependency covers three of this project's hard requirements (`useSpeechSynthesis`, `useLocalStorage`, `useWakeLock`) with SSR-safe, well-tested wrappers around raw browser APIs — avoids hand-rolling three separate small utilities. |
| Tailwind CSS via `@tailwindcss/vite` | **4.3.3** (tailwindcss 4.3.3) | Styling | Official first-party Vite plugin is now the documented Nuxt integration path for Tailwind v4 (tailwindcss.com framework guide). See "What NOT to use" for why `@nuxtjs/tailwindcss` is the wrong choice now. |
| Zod | **4.4.3** | Build/test-time content schema validation | Validates every game JSON against a `GameDefinitionSchema` in a Vitest test that runs in CI — malformed content fails the build, never reaches the table. Runs in Node only (devDependency), never shipped to the client bundle, so its size is irrelevant here. |
| Vitest + `@nuxt/test-utils` | **4.1.11** / **4.2.0** | Testing the step-engine | Pure-function testing (given state + game JSON → next step) needs no DOM; fast, no browser needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vueuse/core` `useSpeechSynthesis` | 14.4.0 | Reactive wrapper around `window.speechSynthesis` | Always, for `isSupported`/`isPlaying`/`error` reactivity — see TTS gotchas below, VueUse does **not** remove them. |
| `@vueuse/core` `useLocalStorage` | 14.4.0 | Reactive, SSR-safe localStorage-backed ref | Use directly as the source of truth for in-progress game state (current game, step id, round, player count, difficulty, back-history). No IndexedDB needed at this data volume. |
| `@vueuse/core` `useWakeLock` | 14.4.0 | Reactive Screen Wake Lock wrapper | Request on game start (inside a user-gesture handler); it auto-requeues if the tab was hidden when `request()` was called and exposes `isActive`. |
| Zod-inferred TS types (`z.infer<typeof GameDefinitionSchema>`) | 4.4.3 | Single source of truth for the game-JSON shape | Derive the `GameDefinition` TypeScript type from the same Zod schema used to validate content, so the shape is never hand-duplicated in two places. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | Step-engine + content-validation test runner | Run content-schema test in CI as a required check before deploy — this is the "fail loudly at build" gate the project requires. |
| `@nuxt/test-utils` | Nuxt-aware test helpers | Needed only if a composable/plugin must be unit-tested inside a mocked Nuxt context; the step-engine logic itself should be framework-agnostic pure functions and not need it. |
| Playwright (`@playwright/test` 1.62.1) | PWA/offline smoke tests | **Defer past v1's first phase** — add once the step engine and PWA are both stable, as a small suite verifying service-worker registration, `context.setOffline(true)` behavior, and that TTS calls don't throw. Unit tests structurally cannot cover this; not urgent for the first working build though. |

## Installation

```bash
# Scaffold (current flow, verified 2026-08-28)
npx nuxi@latest init table-game-assistant
cd table-game-assistant

# Core
npm install @vite-pwa/nuxt @vueuse/core @vueuse/nuxt

# Styling
npm install tailwindcss @tailwindcss/vite

# Content validation + tests
npm install -D zod vitest @nuxt/test-utils

# Add later (post-v1 hardening phase)
npm install -D @playwright/test
```

```ts
// nuxt.config.ts (essentials)
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: true,               // generate mode: keep default SSR-in-build, prerender everything
  nitro: { prerender: { crawlLinks: true } },
  vite: { plugins: [tailwindcss()] },
  css: ['~/assets/css/main.css'],
  modules: ['@vite-pwa/nuxt', '@vueuse/nuxt'],
  pwa: {
    registerType: 'prompt',           // NOT 'autoUpdate' — see PWA rationale below
    workbox: {
      globPatterns: ['**/*.{js,css,html,json,png,svg,woff2}'],
      cleanupOutdatedCaches: true,
    },
    manifest: { lang: 'es', /* name, icons, display: 'standalone', ... */ },
  },
})
```

```bash
# Build
npx nuxi generate   # NOT `npx nuxi build` with ssr:false
```

## Rationale for the two decisions the brief asked to be made explicitly

### 1. `nuxt generate` (SSG/prerender), not `ssr:false` (SPA)

Official Nuxt deployment docs (nuxt.com/docs) confirm `nuxt generate` is the documented path for a fully static, backend-less site, producing prerendered HTML per route plus `200.html`/`404.html` fallbacks. `ssr:false` produces a single blank HTML shell that must boot the whole Vue app client-side before any content paints; the docs themselves note SPA mode loses prerendering benefits and pushes you toward `<ClientOnly>` workarounds. For this app specifically:
- Content is 100% static and known at build time (JSON in the repo) — there is nothing `ssr:false` buys that prerendering doesn't already give for free.
- `@vite-pwa/nuxt`'s whole job is precaching a static build; a prerendered output (stable, hashed HTML/JS/CSS/JSON files, no server) is the cleanest thing for Workbox to precache and for the app to work with literally zero network from the very first load.
- Prerendering gives instant first paint at the table (no client boot delay) even before the service worker has taken control on first visit.
Confidence: HIGH on the official-docs comparison itself; MEDIUM-HIGH on "therefore prerender is the right choice for PWA precaching" (that specific synthesis is not spelled out verbatim in a single official source, but follows directly from how `@vite-pwa/nuxt`/Workbox precaching works).

### 2. `@vite-pwa/nuxt` config to avoid the "stale service worker" trap

The single most-repeated real issue across `vite-pwa/nuxt` and `vite-plugin-pwa` GitHub discussions is users getting stuck on an old cached build. Two concrete mitigations, both included above:
- **`registerType: 'prompt'`, not `'autoUpdate'`.** `autoUpdate` silently reloads all open tabs the moment it detects a new build — during a live game that would yank the screen mid-step. `prompt` instead lets the app show a small "Nueva versión disponible" banner the group can dismiss until a natural break (end of round), while still detecting updates on every load.
- **Explicit `Cache-Control: no-cache` on `/sw.js` and `/manifest.webmanifest`** at the hosting layer (see Hosting section). Workbox bakes a versioned precache manifest into `sw.js` at build time, but if the host serves that file itself with long-lived cache headers, the browser never notices a new build exists. This is a hosting-config concern, not just a module-config one — call it out explicitly wherever the roadmap covers deployment.

Confidence: MEDIUM-HIGH — the `autoUpdate` vs `prompt` trade-off and the header requirement are both corroborated across multiple GitHub issues/discussions and the module's own docs, but no single official doc states "for a live-session app use prompt" — that inference is project-specific.

## Text-to-Speech: what's real vs assumed for iPad/Android in 2026

**Recommendation:** raw `window.speechSynthesis`, wrapped with VueUse's `useSpeechSynthesis` (14.4.0) for reactive `isSupported`/`isPlaying`/`error` state — but the platform gotchas below are **not** solved by VueUse or any wrapper; they must be handled in the app:

| Gotcha | Reality (2026) | Confidence | Mitigation |
|---|---|---|---|
| `speak()` requires a user gesture on iOS Safari | Confirmed: WebKit drops utterances called outside a tap/click handler on mobile Safari. | MEDIUM (WebSearch-sourced, consistent across sources, not re-verified against a 2026 WebKit release note) | Call `speak()` synchronously inside the "Siguiente" button's own click handler — never behind a timer, `setTimeout`, or async callback. Any future "auto-advance" feature will silently fail TTS on iPad unless triggered by the same tap. |
| `getVoices()` returns `[]` until `voiceschanged` fires | Long-standing async-load behavior across all engines (Chrome, Firefox); Safari has historically been worse — some older Safari versions return nothing at all, and switching between listed voices has been reported to not change output. | MEDIUM — the "Safari returns nothing" claim is from a source describing Safari 15.4/15.5-era behavior; not re-verified on a current iPadOS 18/26 build. | Don't build a voice picker UI. Just set `utterance.lang = 'es-ES'` and let the OS/browser choose its own default Spanish voice. Register the `voiceschanged` listener anyway as a best-effort improvement, but never block on it. |
| Android Chrome voice-pack gaps | `getVoices()` on Android Chrome can return generic language/region entries rather than concrete named voices; if the on-device Spanish TTS voice pack was never downloaded (Android TTS voice data is a separate OS-level download under Settings), Chrome silently falls back to an English voice instead of erroring. | MEDIUM (WebSearch-sourced from Chromium issue trackers + community write-ups) | Nothing to fix in code — document it: users should confirm Android Settings → Languages → Text-to-Speech has a Spanish voice installed. This matters more here than usual because the app must also work **offline**, so the voice pack must have been downloaded while online at some point before. |
| `speak()` queues rather than interrupts | Calling `speak()` while a previous utterance is still active/queued does not cancel it — utterances play back-to-back. Repeated taps on "Siguiente" would otherwise queue up stale narration. | HIGH (documented, uncontested platform behavior) | Always call `speechSynthesis.cancel()` immediately before every new `speak()` for the current step. On iOS this pairing can occasionally be flaky right after the previous utterance ends — wrap in try/catch as a defensive measure. |
| No offline guarantee for some voices | Some higher-quality "enhanced"/cloud-backed voices on iOS/Android require network the first time; the plain system default voice is the one guaranteed to work fully offline. | LOW-MEDIUM (general platform knowledge, not verified against a specific 2026 OS release) | Don't select a specific named voice; rely on the OS default for the set `lang`, which is what's already downloaded/available offline. |

**Bottom line:** TTS must be treated as a progressive enhancement, never a hard dependency — this already matches the project's design (the big on-screen text is always the source of truth; narration is additive). If `isSupported` is false or `speak()` throws, do nothing but log; never block the "Siguiente" flow on it.

## Screen Wake Lock

**Recommendation: include it.** Per caniuse.com (checked directly), the Screen Wake Lock API is supported on **Safari on iOS/iPadOS from version 16.4 onward**, and on Chrome from version 84 (desktop and Android). Global support was reported above ~94% as of mid-2026. Confidence: HIGH for the iOS-16.4-plus figure (read directly from caniuse); MEDIUM on the "94% global" figure (WebSearch-summarized, not independently re-verified). Use VueUse's `useWakeLock` (14.4.0) — it already handles the "request while hidden gets queued, activates on visibility" dance, which is exactly the risk when a tablet briefly locks between game sessions. There is at least one open VueUse GitHub issue describing partially-broken behavior specifically on iOS — feature-detect with `isSupported` and degrade silently (screen dimming is an annoyance, not a functional break; a tap wakes it back up) rather than treating it as a hard requirement.

## Local Persistence & Schema Migration

**localStorage, not IndexedDB.** The data that must survive a reload/unlock is tiny — current game id, player count, difficulty, current step id, round number, and a small back-history array of step ids — nowhere near localStorage's ~5MB ceiling and with no need for IndexedDB's transactional/async complexity. Use VueUse's `useLocalStorage(key, defaultValue)` directly as the reactive state itself (it is SSR-safe: returns the default on the server during prerender, hydrates from `localStorage` only on the client) rather than layering Nuxt's `useState` on top — `useState` is for state that needs to survive *within* an SSR request/hydration cycle, not across real page reloads/tablet unlocks, which is a documented point of confusion in Nuxt's own GitHub discussions (`useState persisted?`, discussion #16067).

**Migration for "saved step no longer exists":** store the persisted object with an explicit `schemaVersion: number` (bumped manually whenever a game JSON's step-id shape changes) plus `gameId`/`stepId`. On load, run three cheap checks with no library needed: (1) does `schemaVersion` match the currently built content's version, (2) does `gameId` still exist in the game registry, (3) does `stepId` still exist in that game's step list. If any check fails, discard the saved state and route back to the setup/selector screen — never crash, never strand the user on a dead route. This is deliberately dependency-free (a handful of `if` checks against the already-loaded game JSON's own step-id set); Zod is reserved for build/test-time content validation, not runtime state validation, keeping runtime bundle weight minimal. Confidence: MEDIUM — the localStorage-vs-IndexedDB sizing call is uncontested/HIGH, but the exact migration mechanics are this research's own design synthesis; no official "Nuxt localStorage schema migration" guide exists (confirmed absent via WebSearch).

## State Management: composable, not Pinia

Skip Pinia for v1. This is a single global step-machine (current game, step, round, history) — exactly the shallow, single-consumer reactive state a plain composable (a `useGameProgress()` wrapping the `useLocalStorage` ref above) handles without any extra machinery. Pinia's value — multiple independent stores, devtools time-travel, modularity across a large app — has no payoff here. Revisit only if a later phase (W40k, multiple simultaneous "engines," more screens) meaningfully grows the state surface. Confidence: HIGH (well-established Vue/Nuxt community consensus on when Pinia earns its keep).

## Content: plain typed JSON + Zod, not `@nuxt/content`

`@nuxt/content` (current version 3.16.0) is built for prose/markdown collections backed by a build-time SQLite content layer (`content.config.ts`, `queryCollection()`) — designed for blogs/docs, not for a strongly-typed step-machine graph that the app's own code must traverse programmatically (conditionals, branches, round loops). Two concrete reasons to avoid it here:
1. It adds an unnecessary query layer between the data and the step-engine code that has to walk `nextStepId` pointers and round-loop logic.
2. Per its own documentation/community reports, its content validation "runs by default... and skips automatically in CI and non-interactive terminals" — the **opposite** of the project's explicit requirement that malformed content "must fail loudly at build, not at the table."

**Instead:** plain TypeScript/JSON data modules, statically imported (`import marvelChampions from '~/content/games/marvel-champions.json'`), typed via a `GameDefinition` interface derived from a Zod schema (`z.infer<typeof GameDefinitionSchema>`). Validate every file under `content/games/*.json` in a dedicated Vitest test that runs in CI on every push — including cross-field checks like "every `nextStepId` referenced must exist in this same file" — so a broken reference fails the test suite (and therefore blocks deploy) rather than surfacing as a dead-end at the table. Zod (4.4.3) is recommended over Valibot here specifically because this validation is Node/test-time only (bundle size is irrelevant — it never ships to the browser), and Zod's `.refine()` cross-field checks plus type inference are more mature/documented than Valibot's for this use case. Confidence: HIGH.

## Testing

Vitest (4.1.11) + `@nuxt/test-utils` (4.2.0) for the step-engine (pure functions: given state + game JSON, compute the next step) and for the content-schema Vitest suite described above — both are DOM-free and fast. Playwright (`@playwright/test` 1.62.1) is worth adding for PWA/offline smoke coverage (service-worker registration, `context.setOffline(true)`, confirming TTS calls don't throw) but should be its own later phase once the step engine and PWA config have stabilized — not a day-one requirement, since it adds CI runtime/complexity that doesn't pay off until there's a stable build to test against. **Flag for the roadmap: this likely deserves its own small phase/task rather than being bundled into the first build-out phase.**

## Hosting: Netlify

For a `nuxi generate` static output with a service worker, Netlify is the pick — with the explicit caveat that **any** of the four common options would technically work fine for a hobby project with a handful of users (a friend group); the differentiator is which host minimizes PWA-specific footguns with the least setup:
- **Netlify** — first-class, effectively zero-config Nuxt/Nitro static preset; atomic immutable deploys (no window where an old HTML references a since-deleted hashed JS chunk); a simple `netlify.toml` `_headers`-equivalent lets us set `Cache-Control: no-cache` on `/sw.js` and `/manifest.webmanifest` — directly closing the stale-SW trap above.
- **Cloudflare Pages** — comparable header control via a `_headers` file and excellent edge performance, but per 2026 sources Cloudflare is actively steering *new* projects toward Workers+Static Assets, with Pages left in maintenance mode — not worth adopting fresh for a new project right now.
- **Vercel** — auto-detects Nuxt fine, but its free tier and workflow are oriented around commercial/Next.js-style usage patterns that are heavier than this project needs.
- **GitHub Pages** — free and simplest to set up for a public repo, but **cannot set custom response headers at all**, so there is no way to force `Cache-Control: no-cache` on the service-worker file — exactly the mechanism this project needs to avoid the stale-SW trap — and project-page URLs are served under a `/reponame/` subpath, complicating `base`/PWA-scope config for no real benefit here.

Confidence: MEDIUM — this is a reasoned trade-off synthesized from 2026 comparison articles and official docs snippets, not a single authoritative "use Netlify for PWAs" source.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| `nuxt generate` (SSG) | `ssr: false` (SPA) | If the app ever needs a genuinely dynamic backend-driven route set where prerendering all routes at build time stops being feasible — not the case here (content is static JSON known at build time). |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Nuxt UI (4.11.0) | If the mini-setup screen's radio/select inputs need richer built-in accessibility behavior than a couple of hand-styled native `<input>`/`<button>` elements — reasonable to add later, not needed for v1's minimal surface (one screen, one button). |
| Tailwind CSS v4 | UnoCSS (66.8.1) | If build-speed at a much larger scale becomes a real bottleneck — Tailwind v4's native Vite engine already closed most of the historical speed gap that used to justify UnoCSS. |
| Composable + `useLocalStorage` | Pinia (4.0.3 / `@pinia/nuxt` 1.0.2) | If the app grows multiple independent, simultaneously-active "engines" (e.g. running two games' state at once) or needs devtools time-travel debugging across many stores — not needed for a single linear/looping step machine. |
| Zod (4.4.3) | Valibot (1.4.2) | If content validation ever needs to run in the browser at runtime (shipped to the client bundle) — then Valibot's much smaller footprint would matter. Here validation is Node/test-time only, so bundle size is moot. |
| Netlify | Cloudflare Pages | If global edge latency for a much larger/public audience becomes a real concern — irrelevant for a friend-group hobby app. |
| VueUse `useSpeechSynthesis`/`useWakeLock` | Raw browser APIs, hand-rolled | If a dependency-minimal build is a hard requirement — the composables are thin enough that hand-rolling saves little, but it's a legitimate simplification if avoiding @vueuse/core entirely is desired. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `@nuxtjs/tailwindcss` (community module, currently 6.14.0) | Built around Tailwind v3's PostCSS pipeline; tailwindcss.com's own Nuxt framework guide now documents the official `@tailwindcss/vite` plugin as the integration path for v4 — the community module is not the current recommendation for a fresh v4 project. | `@tailwindcss/vite` (4.3.3) directly in `vite.plugins`. |
| `@nuxt/content` (3.16.0) for this project's game data | Designed for prose/markdown collections, not a programmatically-traversed step-machine graph; its content validation explicitly skips in CI/non-interactive environments per its own docs — the opposite of "fail loudly at build." | Plain typed JSON/TS imports + a Zod schema exercised by a Vitest test that runs in CI. |
| IndexedDB for progress persistence | Massive complexity (async transactions, versioned object stores) for a payload of a few dozen bytes to a few KB — solving a problem this app doesn't have. | `localStorage` via VueUse's `useLocalStorage`. |
| `registerType: 'autoUpdate'` in `@vite-pwa/nuxt` for this app | Silently force-reloads every open tab the instant a new build is detected — would interrupt an in-progress step/round at the table. | `registerType: 'prompt'` with a dismissible "update available" banner. |
| GitHub Pages for this deployment | No custom response-header support at all, so `Cache-Control: no-cache` cannot be forced on `/sw.js` — directly reintroducing the stale-service-worker trap this stack is built to avoid. | Netlify (or Cloudflare Pages as a close second). |
| A voice-picker UI for TTS | `getVoices()` behavior is inconsistent across Safari/Android (empty lists, non-functional voice switching, language-pack gaps) — building UI around it invites visible breakage. | Set `utterance.lang = 'es-ES'` only and let the OS pick its default. |

## Stack Patterns by Variant

**If a future game (e.g. Warhammer 40k) needs meaningfully different state shape or simultaneous multi-engine state:**
- Reconsider Pinia at that point.
- Because the current composable-based approach assumes one active game/session at a time, matching this project's actual v1+v2 scope.

**If TTS or Wake Lock is unsupported/unavailable on a given tablet:**
- Feature-detect (`isSupported`) and silently degrade — big on-screen text remains the source of truth either way.
- Because neither feature is allowed to become a hard blocker per the project's own design (Web Speech/Wake Lock are enhancements, not requirements).

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `nuxt@4.5.2` | `@vite-pwa/nuxt@1.1.1`, `vite-plugin-pwa@1.3.0` | `@vite-pwa/nuxt`'s own docs historically stated a floor of Vite 5+/Nuxt 3.9+; Nuxt 4.5.x ships a current Vite major, so no conflict expected — verify in a throwaway `nuxi init` before committing if this becomes a blocker. |
| `nuxt@4.5.2` | `@tailwindcss/vite@4.3.3` | Official Tailwind Nuxt framework guide's documented path; no known incompatibility. |
| `nuxt@4.5.2` | `@vueuse/nuxt@14.4.0` | VueUse ships a dedicated Nuxt module for auto-imports; matches current Nuxt majors. |
| `zod@4.4.3` | Node-only usage (Vitest) | Keep all schema code under a `content/` or `scripts/` path that is never imported into client-bundled Vue components, so it's tree-shaken/never bundled to the browser. |

## Sources

- npm registry (`npm view <pkg> version`), checked 2026-08-28 — all version numbers in this document.
- https://nuxt.com/blog/v4 — Nuxt 4 announcement, `app/` directory, data-fetching changes, compatibility flags (WebFetch summary).
- https://nuxt.com/docs/getting-started/deployment — SSG vs SPA guidance, `200.html`/`404.html` static fallback behavior (WebFetch summary).
- https://nuxt.com/docs/4.x/getting-started/upgrade — Nuxt 3 EOL date (2026-07-31), `compatibilityVersion: 4` default (WebSearch summary).
- https://vite-pwa-org.netlify.app/frameworks/nuxt.html — `@vite-pwa/nuxt` config shape, current version (WebFetch, partial — several specifics not covered by the fetched page, flagged as such).
- https://github.com/vite-pwa/vite-plugin-pwa (issues/discussions) — `registerType`/auto-update stale-SW discussion (WebSearch summary, MEDIUM confidence).
- https://tailwindcss.com/docs/installation/framework-guides/nuxt — official Tailwind v4 + Nuxt integration path (WebSearch summary of official docs).
- https://vueuse.org/core/usespeechsynthesis/, https://vueuse.org/core/usewakelock/ — composable APIs (WebSearch summary of official VueUse docs).
- https://weboutloud.io/bulletin/speech_synthesis_in_safari/ — Safari SpeechSynthesis known issues, dated to Safari ~15.4/15.5 era (WebFetch summary — flagged as not re-verified against current Safari).
- https://caniuse.com/wake-lock — Screen Wake Lock API support table, read directly (WebFetch), iOS Safari 16.4+ confirmed HIGH confidence.
- https://content.nuxt.com/docs/collections/validators and related GitHub discussions — `@nuxt/content` Zod/Valibot support and CI validation-skip behavior (WebSearch summary).
- 2026 hosting comparison articles (danubedata.ro, pandastack.io, bootstrap.build) — Netlify/Cloudflare Pages/GitHub Pages trade-offs (WebSearch summary, MEDIUM confidence — no single authoritative source).

---
*Stack research for: Tablet-first, offline-capable Nuxt 4 rules-flow assistant (Marvel Champions), Spanish TTS*
*Researched: 2026-08-28*
