<!-- GSD:project-start source:PROJECT.md -->
## Project

**TableGameAssistant**

Una web-asistente para juegos de mesa complejos, pensada para usarse en una tablet apoyada al lado de la partida. Eliges el juego, indicas nº de jugadores y dificultad, y a partir de ahí solo pulsas **Siguiente**: la app te dice —en texto grande y en voz alta— **qué sucede ahora**, paso a paso, desde la preparación de mesa hasta el bucle infinito de rondas. Es para jugar con amigos, no un producto comercial: primero Marvel Champions (el juego al que juegan ahora), después Warhammer 40.000.

**Core Value:** Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.

### Constraints

- **Tech stack**: Nuxt en su última versión (4.x) — decisión del usuario
- **Sin backend**: contenido en ficheros JSON del repo, estado en el navegador — nada que administrar ni pagar
- **Dispositivo objetivo**: tablet en horizontal junto a la mesa; legible a un brazo de distancia
- **Offline**: debe funcionar con la wifi caída a media partida
- **Idioma**: español, incluida la locución
- **Fidelidad de reglas**: el contenido de Marvel Champions debe contrastarse con el Rules Reference oficial v17 antes de darse por bueno; un asistente que guía mal es peor que no tener asistente
- **Legal**: contenido de reglas para uso privado del grupo; no se reproducen cartas, arte ni textos extensos con copyright
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Verification method
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
# Scaffold (current flow, verified 2026-08-28)
# Core
# Styling
# Content validation + tests
# Add later (post-v1 hardening phase)
# Build
## Rationale for the two decisions the brief asked to be made explicitly
### 1. `nuxt generate` (SSG/prerender), not `ssr:false` (SPA)
- Content is 100% static and known at build time (JSON in the repo) — there is nothing `ssr:false` buys that prerendering doesn't already give for free.
- `@vite-pwa/nuxt`'s whole job is precaching a static build; a prerendered output (stable, hashed HTML/JS/CSS/JSON files, no server) is the cleanest thing for Workbox to precache and for the app to work with literally zero network from the very first load.
- Prerendering gives instant first paint at the table (no client boot delay) even before the service worker has taken control on first visit.
### 2. `@vite-pwa/nuxt` config to avoid the "stale service worker" trap
- **`registerType: 'prompt'`, not `'autoUpdate'`.** `autoUpdate` silently reloads all open tabs the moment it detects a new build — during a live game that would yank the screen mid-step. `prompt` instead lets the app show a small "Nueva versión disponible" banner the group can dismiss until a natural break (end of round), while still detecting updates on every load.
- **Explicit `Cache-Control: no-cache` on `/sw.js` and `/manifest.webmanifest`** at the hosting layer (see Hosting section). Workbox bakes a versioned precache manifest into `sw.js` at build time, but if the host serves that file itself with long-lived cache headers, the browser never notices a new build exists. This is a hosting-config concern, not just a module-config one — call it out explicitly wherever the roadmap covers deployment.
## Text-to-Speech: what's real vs assumed for iPad/Android in 2026
| Gotcha | Reality (2026) | Confidence | Mitigation |
|---|---|---|---|
| `speak()` requires a user gesture on iOS Safari | Confirmed: WebKit drops utterances called outside a tap/click handler on mobile Safari. | MEDIUM (WebSearch-sourced, consistent across sources, not re-verified against a 2026 WebKit release note) | Call `speak()` synchronously inside the "Siguiente" button's own click handler — never behind a timer, `setTimeout`, or async callback. Any future "auto-advance" feature will silently fail TTS on iPad unless triggered by the same tap. |
| `getVoices()` returns `[]` until `voiceschanged` fires | Long-standing async-load behavior across all engines (Chrome, Firefox); Safari has historically been worse — some older Safari versions return nothing at all, and switching between listed voices has been reported to not change output. | MEDIUM — the "Safari returns nothing" claim is from a source describing Safari 15.4/15.5-era behavior; not re-verified on a current iPadOS 18/26 build. | Don't build a voice picker UI. Just set `utterance.lang = 'es-ES'` and let the OS/browser choose its own default Spanish voice. Register the `voiceschanged` listener anyway as a best-effort improvement, but never block on it. |
| Android Chrome voice-pack gaps | `getVoices()` on Android Chrome can return generic language/region entries rather than concrete named voices; if the on-device Spanish TTS voice pack was never downloaded (Android TTS voice data is a separate OS-level download under Settings), Chrome silently falls back to an English voice instead of erroring. | MEDIUM (WebSearch-sourced from Chromium issue trackers + community write-ups) | Nothing to fix in code — document it: users should confirm Android Settings → Languages → Text-to-Speech has a Spanish voice installed. This matters more here than usual because the app must also work **offline**, so the voice pack must have been downloaded while online at some point before. |
| `speak()` queues rather than interrupts | Calling `speak()` while a previous utterance is still active/queued does not cancel it — utterances play back-to-back. Repeated taps on "Siguiente" would otherwise queue up stale narration. | HIGH (documented, uncontested platform behavior) | Always call `speechSynthesis.cancel()` immediately before every new `speak()` for the current step. On iOS this pairing can occasionally be flaky right after the previous utterance ends — wrap in try/catch as a defensive measure. |
| No offline guarantee for some voices | Some higher-quality "enhanced"/cloud-backed voices on iOS/Android require network the first time; the plain system default voice is the one guaranteed to work fully offline. | LOW-MEDIUM (general platform knowledge, not verified against a specific 2026 OS release) | Don't select a specific named voice; rely on the OS default for the set `lang`, which is what's already downloaded/available offline. |
## Screen Wake Lock
## Local Persistence & Schema Migration
## State Management: composable, not Pinia
## Content: plain typed JSON + Zod, not `@nuxt/content`
## Testing
## Hosting: Vercel (in use)
**Live at https://tabletop-assistant.vercel.app/ — deployed from `Destrozado/tabletop-assistant`, auto-deploy on push to `main`.**

Netlify was the original recommendation; the project deployed to Vercel instead and the decision was updated to match reality rather than the other way round. The one property that actually drove the original choice — being able to force `Cache-Control: no-cache` on `/sw.js` and `/manifest.webmanifest`, closing the stale-SW trap — is fully satisfied on Vercel.

**Cache headers live in `nitro.routeRules` in `nuxt.config.ts`, NOT in host config.** Nitro compiles them into whatever preset is targeted (verified: a `NITRO_PRESET=vercel` build emits all four rules into `.vercel/output/config.json`). This keeps one source of truth and leaves the app portable — moving hosts requires no header rewrite. Do not reintroduce `netlify.toml` or add a `vercel.json` for headers; a hand-written `vercel.json` can be bypassed by the generated Build Output config anyway.

- **Netlify** — still a perfectly good fit (zero-config Nuxt/Nitro preset, atomic immutable deploys). Not in use; nothing about it was found wanting.
- **Cloudflare Pages** — comparable header control via a `_headers` file and excellent edge performance, but per 2026 sources Cloudflare is actively steering *new* projects toward Workers+Static Assets, with Pages left in maintenance mode — not worth adopting fresh for a new project right now.
- **Vercel** — *this is what the project uses.* Auto-detects Nuxt, builds with Nitro's `vercel` preset, honours `routeRules` headers. The earlier reservation (free tier oriented around heavier commercial usage) has not been a problem in practice for a hobby project of this size.
- **GitHub Pages** — free and simplest to set up for a public repo, but **cannot set custom response headers at all**, so there is no way to force `Cache-Control: no-cache` on the service-worker file — exactly the mechanism this project needs to avoid the stale-SW trap — and project-page URLs are served under a `/reponame/` subpath, complicating `base`/PWA-scope config for no real benefit here.
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| `nuxt generate` (SSG) | `ssr: false` (SPA) | If the app ever needs a genuinely dynamic backend-driven route set where prerendering all routes at build time stops being feasible — not the case here (content is static JSON known at build time). |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Nuxt UI (4.11.0) | If the mini-setup screen's radio/select inputs need richer built-in accessibility behavior than a couple of hand-styled native `<input>`/`<button>` elements — reasonable to add later, not needed for v1's minimal surface (one screen, one button). |
| Tailwind CSS v4 | UnoCSS (66.8.1) | If build-speed at a much larger scale becomes a real bottleneck — Tailwind v4's native Vite engine already closed most of the historical speed gap that used to justify UnoCSS. |
| Composable + `useLocalStorage` | Pinia (4.0.3 / `@pinia/nuxt` 1.0.2) | If the app grows multiple independent, simultaneously-active "engines" (e.g. running two games' state at once) or needs devtools time-travel debugging across many stores — not needed for a single linear/looping step machine. |
| Zod (4.4.3) | Valibot (1.4.2) | If content validation ever needs to run in the browser at runtime (shipped to the client bundle) — then Valibot's much smaller footprint would matter. Here validation is Node/test-time only, so bundle size is moot. |
| Vercel (in use) | Netlify / Cloudflare Pages | If Vercel's hobby-tier limits ever bite, or global edge latency for a much larger audience becomes a real concern — irrelevant for a friend-group hobby app. Migration cost is low: cache headers live in `routeRules`, not host config. |
| VueUse `useSpeechSynthesis`/`useWakeLock` | Raw browser APIs, hand-rolled | If a dependency-minimal build is a hard requirement — the composables are thin enough that hand-rolling saves little, but it's a legitimate simplification if avoiding @vueuse/core entirely is desired. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `@nuxtjs/tailwindcss` (community module, currently 6.14.0) | Built around Tailwind v3's PostCSS pipeline; tailwindcss.com's own Nuxt framework guide now documents the official `@tailwindcss/vite` plugin as the integration path for v4 — the community module is not the current recommendation for a fresh v4 project. | `@tailwindcss/vite` (4.3.3) directly in `vite.plugins`. |
| `@nuxt/content` (3.16.0) for this project's game data | Designed for prose/markdown collections, not a programmatically-traversed step-machine graph; its content validation explicitly skips in CI/non-interactive environments per its own docs — the opposite of "fail loudly at build." | Plain typed JSON/TS imports + a Zod schema exercised by a Vitest test that runs in CI. |
| IndexedDB for progress persistence | Massive complexity (async transactions, versioned object stores) for a payload of a few dozen bytes to a few KB — solving a problem this app doesn't have. | `localStorage` via VueUse's `useLocalStorage`. |
| `registerType: 'autoUpdate'` in `@vite-pwa/nuxt` for this app | Silently force-reloads every open tab the instant a new build is detected — would interrupt an in-progress step/round at the table. | `registerType: 'prompt'` with a dismissible "update available" banner. |
| GitHub Pages for this deployment | No custom response-header support at all, so `Cache-Control: no-cache` cannot be forced on `/sw.js` — directly reintroducing the stale-service-worker trap this stack is built to avoid. | Vercel (in use); Netlify or Cloudflare Pages as alternatives. |
| A voice-picker UI for TTS | `getVoices()` behavior is inconsistent across Safari/Android (empty lists, non-functional voice switching, language-pack gaps) — building UI around it invites visible breakage. | Set `utterance.lang = 'es-ES'` only and let the OS pick its default. |
## Stack Patterns by Variant
- Reconsider Pinia at that point.
- Because the current composable-based approach assumes one active game/session at a time, matching this project's actual v1+v2 scope.
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
