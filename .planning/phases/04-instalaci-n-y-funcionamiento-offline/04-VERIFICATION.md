---
phase: 04-instalaci-n-y-funcionamiento-offline
verified: 2026-08-31T15:27:08Z
status: human_needed
score: 4/4 truths verified by code+automation+Android device evidence; 1 target-device confirmation still open
overrides_applied: 0
human_verification:
  - test: "Confirmar modelo exacto de tablet y versión de SO/navegador, e instalar/usar la app en ESA tablet (no un móvil Android) siguiendo el guion completo de 04-06-PLAN.md <how-to-verify>."
    expected: "Instalación a pantalla completa, flujo offline completo (incluida voz) y banda de actualización descartable funcionan igual que en el móvil Android probado."
    why_human: "Bloqueante abierto desde la Fase 1, preguntado dos veces, nunca respondido. Todo el testing de dispositivo real de esta fase se hizo en un móvil Android, no en la tablet de mesa que es el dispositivo objetivo del ROADMAP (tablet en horizontal, a un brazo de distancia)."
  - test: "Con la banda 'Nueva versión disponible' visible durante una partida en curso, comprobar visualmente que no tapa ni desplaza el botón SIGUIENTE ni el texto del paso."
    expected: "El botón SIGUIENTE sigue siendo tocable y visible con la banda desplegada arriba."
    why_human: "El usuario solo confirmó poder seguir jugando tras descartarla/actualizar, lo cual implica pero no prueba directamente que el layout no se superponga. Playwright no hace ninguna aserción visual de layout sobre esto."
gaps_deferred_from_earlier_plans_but_resolved_in_main: []
---

# Phase 4: Instalación y funcionamiento offline — Verification Report

**Phase Goal:** Un grupo puede instalar la app en la tablet, abrirla a pantalla completa, y jugar una partida entera aunque la wifi se caiga a mitad de partida; cuando se publica una versión nueva, la app espera la decisión del usuario en vez de recargarse sola.

**Verified:** 2026-08-31T15:27:08Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Method

Every command below was re-run independently in this session, from the repo root, against the current `main` tree (commit `a0413b3`) — not copied from any SUMMARY. Production checks hit the live `https://tabletop-assistant.vercel.app/` deployment.

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | El usuario puede instalar la app en la tablet y abrirla a pantalla completa, sin barra del navegador. | ✓ VERIFIED (code+Android) / ? UNCERTAIN (actual tablet) | See "SC1" below. |
| 2 | Con la app visitada una vez, el flujo completo (selector, mini-setup, preparación y bucle de ronda, con voz y sin ella) funciona sin conexión a internet. | ✓ VERIFIED | See "SC2" below. |
| 3 | Si la conexión se cae a mitad de partida, la app sigue funcionando sin interrupción. | ✓ VERIFIED | See "SC3" below. |
| 4 | Cuando hay una versión nueva publicada, la app avisa y espera la decisión del usuario; nunca se recarga sola a mitad de ronda. | ✓ VERIFIED | See "SC4" below. |

**Score:** 4/4 truths are backed by real code evidence, a green automated suite, and a genuine device test — but truth 1's literal wording ("en la tablet") is only confirmed on an Android **phone**, not the target tablet. This is why overall status is `human_needed`, not `passed`.

#### SC1 — Instalación y pantalla completa

- `nuxt.config.ts` — `pwa.manifest` has `display: 'standalone'`, no `orientation` key (D-08 respected), 3 icons declared. Re-verified by direct read (lines ~99–127).
- `app/app.vue` — `<NuxtPwaManifest />` is placed **above `#app-root`**, in the template root, as required. Re-verified: `grep` shows it renders before the `#app-root` div.
- Build evidence (`npm run generate`, re-run this session): both prerendered pages (`.output/public/index.html` and `.output/public/marvel-champions/index.html`) contain `rel="manifest" href="/manifest.webmanifest"` and `rel="apple-touch-icon" href="/icons/apple-touch-icon.png"`.
- Live manifest at `https://tabletop-assistant.vercel.app/manifest.webmanifest` returns 200 with `display: standalone`, no `orientation`, 3 icons — confirmed with `curl` against production in this session.
- `e2e/pwa-install.spec.ts` (4 tests) re-run this session: **4/4 PASS** (SW registered/active, manifest 200, 3 icons incl. maskable each 200 `image/png`, apple-touch-icon present and 200).
- **Human evidence (04-06-SUMMARY.md):** Android phone, production URL — "He instalado la APP y se ha instalado bien y se abre en pantalla completa" + icon confirmed as the project's own triangle icon, not a generic one.
- **Open:** tablet model/OS/browser — never provided, asked twice since Phase 1. All device testing above is Android phone, not the target tablet. `04-06-PLAN.md`'s own `<acceptance_criteria>` explicitly required recording "el modelo y la versión de sistema operativo/navegador de la tablet" — this was **not met**, and `04-06-SUMMARY.md` says so itself rather than papering over it.

#### SC2 — Flujo completo offline tras una visita

- `nuxt.config.ts` `pwa.workbox.globPatterns` covers `**/*.{js,css,html}`, `audio/*.m4a`, `icons/*.png`, `fonts/*.woff2`, `favicon.ico`, `manifest.webmanifest` — built from scratch in plan 04-04 after 04-03 proved the default precache had only 5 metadata entries and zero HTML.
- Re-ran `npm run generate` this session: `PWA v1.3.0 mode generateSW precache 66 entries (1719.86 KiB)`.
- Re-verified against the freshly-built `.output/public/sw.js`: **37 audio files precached / 37 present on disk** (`ls public/audio/*.m4a | wc -l` = 37, precache manifest audio entries = 37 — exact match). **Zero** `_probe` references, **zero** `voice-probe` references in the generated service worker.
- `e2e/offline-flow.spec.ts` re-run this session with the network genuinely cut via `context.setOffline(true)`: full path selector → mini-setup → preparation steps (5 advances + 1 back, each asserting the step text actually changed) → audio fetch (`fetch('/audio/<id>.m4a')` returns 200 with content-length > 0, fully offline) → reload with resume ("Partida guardada" shown, "CONTINUAR" resumes at the same step) — **PASS**. Second test: `/marvel-champions` opened directly via `page.goto` while offline — **PASS**.
- **Human evidence (Android, production):** "tras poner el modo avion se sigue pudiendo avanzar y retroceder y suenan los audios"; closing and relaunching the app while still offline correctly showed "Partida guardada" and resumed at the same step (exercising the `pagehide` flush fix from plan 04-04).
- Note: the automated e2e test exercises table-setup steps specifically (it does not force-advance all the way into the round loop), but the underlying mechanism (full client-side SPA + Workbox precache of all JS/HTML/audio) applies uniformly to every step regardless of phase — there is no per-round network call other than the already-precached audio fetches. This is architecturally sound, not merely assumed.

#### SC3 — Caída de conexión a mitad de partida

- Same precache mechanism as SC2 — a mid-game disconnect is not distinguishable from "offline from the start" once the SW controls the page and content is cached.
- **Human evidence (Android, production, real mid-game airplane-mode toggle, the literal D-10 test):** the user started the game, enabled airplane mode mid-session, and confirmed continued forward/back navigation and audio playback. The known audio-cutting regression (`audio-corta-y-reinicia`) was explicitly checked and **not reproduced**, even while advancing rapidly through several steps in a row with the service worker in the audio path.
- `e2e/update-banner.spec.ts` test 2, re-run this session, independently confirms the app never spontaneously reloads/changes controller over a real 10-second window with the SW active — relevant background guarantee for "no interruption."

#### SC4 — Aviso de versión nueva, nunca recarga sola

- `registerType: 'prompt'` confirmed in `nuxt.config.ts`; `grep -rn "autoUpdate"` across the repo (excluding `node_modules`/`.output`) finds it only inside comments explaining why it must never be used — never as an actual config value.
- `app/composables/useUpdatePrompt.ts` and `app/components/UpdateBanner.vue` exist, are wired into `app/app.vue` (mounted globally, above `<NuxtPage />`, wrapped in `<ClientOnly>`), and are exercised by 7 unit tests (`app/composables/__tests__/useUpdatePrompt.test.ts`) plus 3 Playwright tests.
- Re-ran the full suite this session: `npm run test` → **293/293 PASS**. `npx playwright test` → **11/11 PASS** (`offline-flow` 2, `portrait-usable` 2, `pwa-install` 4, `update-banner` 3).
- `e2e/update-banner.spec.ts` test 2 (re-run, PASS): a marker set on `window` survives 10 real seconds with the SW active with **zero** `controllerchange` events — the hardest, most literal proof available short of a real deploy that the app never force-reloads.
- **Human evidence (Android, production, two real deployments):** update banner appeared only after connectivity returned (expected — offline can't discover a new deploy); clicking "Actualizar" applied immediately and resumed the game at the same step (D-02); clicking "✕" allowed continued play (D-01). The banner correctly did NOT reappear after fully closing and relaunching the app post-update — `04-06-SUMMARY.md` correctly identifies this as expected service-worker behavior (the waiting worker activates when the last client closes), not a defect, and flags its own earlier verification script as having had an incorrect expectation about this.
- **Open, not fully confirmed:** whether the banner visually overlaps or displaces the SIGUIENTE button during an active round — the human only confirmed being able to "keep playing," which implies but does not directly verify layout non-interference.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `nuxt.config.ts` (`pwa` block) | `registerType:'prompt'`, no `orientation`, `workbox.globPatterns`/`globIgnores` | ✓ VERIFIED | Read directly; re-built and inspected `.output/public/sw.js`/`manifest.webmanifest` this session. |
| `app/app.vue` | `<NuxtPwaManifest />` placed, `<UpdateBanner />` mounted | ✓ VERIFIED | Both present, correct position, confirmed in generated HTML of both prerendered routes. |
| `app/components/UpdateBanner.vue` | Dismissible, non-modal, Actualizar/Cerrar buttons | ✓ VERIFIED | Read directly; matches `VoiceUnavailableNotice.vue` pattern; `v-if="showUpdateBanner"`. |
| `app/composables/useUpdatePrompt.ts` | Pure `shouldShowUpdateBanner` + testable `buildUpdatePrompt` + real `useUpdatePrompt` | ✓ VERIFIED | Read directly; 7 unit tests pass; used correctly by `UpdateBanner.vue`. |
| `app/composables/usePreloadedAudio.ts` | Unmodified since Phase 03.1 (D-05, second cache layer) | ✓ VERIFIED | `git log` shows last touched by `4faa60f` (Phase 03.1 plan 04), zero commits from Phase 4 touch this file. |
| `scripts/pwa/generate-icons.mjs` + `public/icons/*.png` | Zero-dependency icon generator, 4 PNGs, no copyrighted art | ✓ VERIFIED | Read script; zero `readFileSync`/`fetch` calls; geometric triangle, project's own accent colors. |
| `e2e/*.spec.ts` (4 files) + `playwright.config.ts` | Real-build-backed browser suite | ✓ VERIFIED | 11/11 pass, re-run this session against a freshly generated build. |
| `.github/workflows/ci.yml` | Playwright wired into existing `test` job | ✓ VERIFIED | Confirmed steps present in correct order; `webServer` in `playwright.config.ts` self-builds via `npm run generate && npx nuxi preview`, so CI needs no separate build step. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `nuxt.config.ts` `routeRules` | Vercel build output | `NITRO_PRESET=vercel npm run generate` → `.vercel/output/config.json` | ✓ WIRED | Re-ran this session: `/sw.js` and `/manifest.webmanifest` rules both emit `cache-control: no-cache`; `/audio/**` emits `max-age=0, must-revalidate`; `/fonts/**`/`/_nuxt/**` emit `immutable`. |
| Production headers | Live deployment | `curl -I https://tabletop-assistant.vercel.app/sw.js` and `/manifest.webmanifest` | ✓ WIRED | Both return `HTTP/2 200` + `cache-control: no-cache` on the live site, checked this session. |
| `@vite-pwa/nuxt` `$pwa` | `UpdateBanner.vue` | `useUpdatePrompt()` → `useNuxtApp().$pwa` | ✓ WIRED | Confirmed by reading source; `needRefresh` normalizer documented and tested for both `boolean` and `{value}` shapes. |
| Workbox precache | `/audio/*.m4a` fetch offline | `globPatterns: ['audio/*.m4a', ...]` | ✓ WIRED | 37/37 audio files precached, confirmed by grepping the generated `sw.js` this session, and by the offline `fetch()` assertion in `e2e/offline-flow.spec.ts` passing. |
| `pagehide` flush | Session persistence | `useEventListener('pagehide', ...)` in `app/pages/[game]/index.vue` | ✓ WIRED | Confirmed present; fixes a real (non-offline-specific) data-loss bug exposed by Playwright's fast interaction speed; validated in production by the human test (close+relaunch offline → "Partida guardada" → resumes at same step). |

### Behavioral Spot-Checks (re-run live, this session)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Vitest suite | `npm run test` | 293/293 passed | ✓ PASS |
| Playwright suite | `npx playwright test --reporter=list` | 11/11 passed | ✓ PASS |
| Static build precache size | `npm run generate` | `precache 66 entries (1719.86 KiB)` | ✓ PASS |
| Audio precache completeness | grep `.output/public/sw.js` vs `ls public/audio/*.m4a` | 37 == 37 | ✓ PASS |
| Zero probe leakage | grep `_probe`/`voice-probe` in `sw.js` | 0, 0 | ✓ PASS |
| No `autoUpdate` config value anywhere | `grep -rn autoUpdate` (excl. node_modules/.output) | only in explanatory comments | ✓ PASS |
| Manifest orientation absence | `grep orientation .output/public/manifest.webmanifest` | not found | ✓ PASS |
| Vercel preset headers | `NITRO_PRESET=vercel npm run generate` → `.vercel/output/config.json` | `no-cache` rules present for sw.js/manifest | ✓ PASS |
| Production headers | `curl -I` against live `/sw.js`, `/manifest.webmanifest` | 200, `no-cache` | ✓ PASS |
| `voice-probe.html` on production | `curl -o /dev/null -w '%{http_code}' https://tabletop-assistant.vercel.app/voice-probe.html` | **200** | ⚠️ See "Known limitation" below |
| Invented URL on production | same, against a made-up path | **200** | Confirms the 200 above is the SPA fallback (`200.html`), not a real file |
| `_probe` audio on production | `curl` against `/audio/_probe/anything.m4a` | **404** | ✓ genuinely absent from the build |

### Known limitation — `voice-probe.html` threat-model criterion (not silently passed)

The Phase 03.1 threat-model criterion expected `voice-probe.html` to return a literal **404** in production. Verified directly against the live site this session: it returns **200**, and so does a completely invented URL — because Nuxt's static/SSG output serves `200.html` as an SPA fallback for any path that isn't a real static file, which is how the hosting is configured (not something Phase 4 introduced or could avoid without changing the SSG/hosting model). The underlying risk the criterion cared about — that a leftover developer probe page might still exist and be reachable in production — **is genuinely closed**: the file is absent from `.output/public` and `.vercel/output/static`, and the actual `_probe` audio clips return a clean 404. The literal "404 status code" wording of the criterion is not met and cannot be met with this hosting model; the intent is met. This is recorded as an open documentation/criterion-wording mismatch, not silently marked passed.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| OFF-01 | 04-01, 04-02, 04-06 | Instalar y abrir a pantalla completa, sin barra de navegador | ✓ SATISFIED (Android) / ? tablet unconfirmed | See SC1. |
| OFF-02 | 04-01, 04-03, 04-04, 04-06 | Flujo completo funciona offline tras una visita | ✓ SATISFIED | See SC2. |
| OFF-03 | 04-04, 04-06 | Caída de conexión a mitad de partida sin interrupción | ✓ SATISFIED | See SC3. |
| OFF-04 | 04-01, 04-05, 04-06 | Aviso de versión nueva, espera decisión, nunca recarga sola | ✓ SATISFIED | See SC4. |

**Note on `.planning/REQUIREMENTS.md`:** as of this verification, that file still shows OFF-01 through OFF-04 as unchecked (`- [ ]`) and "Pending" in its status table, even though ROADMAP.md marks Phase 4 complete and this report finds all four requirements satisfied by code+test+device evidence. Per this task's instructions, `REQUIREMENTS.md` is owned by the orchestrator and was not edited here — flagging the discrepancy for the orchestrator to reconcile rather than silently ignoring it.

### Anti-Patterns Found

None. Scanned every file touched by Phase 4 plans (`nuxt.config.ts`, `app/app.vue`, `app/components/UpdateBanner.vue`, `app/composables/useUpdatePrompt.ts`, `app/composables/usePreloadedAudio.ts`, `app/pages/[game]/index.vue`, `scripts/pwa/generate-icons.mjs`, `playwright.config.ts`, all `e2e/*.spec.ts`, `.github/workflows/ci.yml`) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub-return patterns. The only match ("Context placeholder" in `app/pages/[game]/index.vue`) is an explanatory code comment about a naming choice, not a debt marker or unfinished implementation — confirmed by reading the surrounding logic, which is fully implemented.

### Cross-check: quick task `260831-mgd` (orientation guard removal)

This quick task landed mid-phase and removed the forced-landscape overlay from `app/app.vue` and updated `playwright.config.ts`'s comment (viewport value itself unchanged: 1280×800) and `e2e/portrait-usable.spec.ts`. Re-running the full test suite (293/293 Vitest, 11/11 Playwright) against the current tree — which includes this change — confirms it did not break anything Phase 4 depends on: `<NuxtPwaManifest />` and `<UpdateBanner />` in `app.vue` are both still present and correctly positioned after the diff.

### Human Verification Required

See `human_verification` in the frontmatter. Two items:

1. **Tablet model/OS confirmation and a full re-run of the 04-06 checkpoint on the actual target tablet** (not the Android phone used so far). This is the single most significant open item — a blocker asked twice since Phase 1, never answered, and explicitly required by 04-06-PLAN.md's own acceptance criteria, which were not met.
2. **Visual confirmation that the update banner never covers/displaces the SIGUIENTE button** during an active round — only implied, not directly confirmed, by the human tester's account.

### Gaps Summary

There are no code-level gaps: every artifact required by the plans exists, is substantive, is wired correctly, and is backed by a green automated suite (293 Vitest + 11 Playwright, both re-run independently in this session) plus a genuine mid-game airplane-mode test on a real Android device against production. The `voice-probe.html` 404-vs-200 mismatch is a criterion-wording issue with the intent satisfied, not a functional gap, and is documented rather than glossed over.

What remains open is device-scope, not code-scope: the phase's own target device — a tablet — was never used for verification, and the model/OS/browser identity of that tablet has been an unanswered blocker since Phase 1. This is exactly why `status: human_needed` rather than `passed`: the four ROADMAP success criteria are all backed by strong evidence, but the literal word "tablet" in the goal and in Success Criterion 1 has only Android-phone evidence behind it.

---

*Verified: 2026-08-31T15:27:08Z*
*Verifier: Claude (gsd-verifier)*
