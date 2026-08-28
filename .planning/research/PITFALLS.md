# Pitfalls Research

**Domain:** Tablet-first offline PWA that guides players step-by-step through Marvel Champions LCG rules, with Spanish Web Speech TTS, built on Nuxt 4, no backend, JSON content
**Researched:** 2026-08-28
**Confidence:** HIGH for rules-fidelity (verified directly against local official PDF `mc_rulesreference_v17-compressed.pdf`, Rules Reference v1.7); HIGH/MEDIUM for Web Speech, service worker and Wake Lock behavior (verified against MDN, Chrome/WebKit docs, and multiple corroborating community reports); MEDIUM for Nuxt 4-specific pitfalls (official docs + GitHub issues); LOW/advisory for legal section (not legal advice).

---

## Critical Pitfalls

### Pitfall 1: Rules-fidelity errors inherited from the hand-written summary

**What goes wrong:**
The existing Marvel Champions summary (drafted with another AI) is used as-is to author JSON content, silently carrying forward plausible-but-wrong mental models of the villain phase, boost cards, acceleration, minion activation, obligations, the nemesis set, and status-card timing. Because the app's whole value proposition is "never open the rulebook," a wrong step is worse than no app — the group will follow it confidently and misplay.

**Why it happens:**
Rules summaries written by an LLM or from memory tend to average together several editions/FAQ answers, over-simplify multi-step sequences into round numbers ("4 steps of the villain phase" when the reference lists 6), and conflate mechanically similar but distinct card flows (e.g., "boost cards" vs "encounter cards dealt to players").

**How to avoid:**
Treat every step of the JSON content as a claim that must cite its source in the official Rules Reference v1.7 (page + section name) before being marked "verified." Do a dedicated verification phase (see checklist below) that goes line-by-line through the hand-written summary against the PDF, not a spot check.

**Warning signs:**
- Any step whose wording doesn't map to a specific page/section of the Rules Reference.
- Round numbers in the summary ("4 steps", "one obligation per player") that don't match the reference's actual enumeration.
- Any step that was written from "how we've been playing it" rather than the rulebook.

**Phase to address:**
A dedicated "Rules verification" phase, before or tightly coupled to the content-authoring phase for Marvel Champions (matches the existing `PROJECT.md` requirement: "Contenido de Marvel Champions verificado contra el reglamento oficial antes de fijarlo").

---

### Pitfall 2: No provenance/citation per step — a wrong step can't be traced or fixed

**What goes wrong:**
Months later, someone at the table says "the app told us to do X, but the rulebook says Y." Without a citation trail, fixing it means re-deriving where that step's wording came from, whether it was deliberate paraphrasing or a bug, and whether other steps share the same wrong assumption.

**Why it happens:**
JSON content that's just `{ "text": "..." }` has no way to answer "why does this step say this?" — the provenance lived only in the author's head or in AI chat history that's since been discarded.

**How to avoid:**
Give every step (or at least every step that encodes a rule, not just flavor/UX text) a `source` field: `{ doc: "rules-reference-v1.7", page: 45, section: "Villain Phase" }`, plus an optional `note` field for anything paraphrased or inferred rather than quoted. Store the exact reference version (`v1.7`) the content was checked against as metadata on the game file itself, so a future re-verification pass after an errata update knows exactly what changed underneath it.

**Warning signs:**
- Steps added or edited without updating/adding a `source` field.
- No changelog or version marker in the game JSON indicating which Rules Reference version it was last checked against.

**Phase to address:**
Content schema design phase (before or alongside the JSON authoring phase) — the `source` field must exist in the schema from the start; retrofitting it onto already-written content is much more expensive.

---

### Pitfall 3: Steps sliced at the wrong granularity for a one-button "Siguiente" flow

**What goes wrong:**
Two failure modes, both real at a physical table:
- **Too fine:** each micro-action (draw a card, then draw another, then flip it) becomes its own tap, turning the assistant into an annoying tap-fest that competes with actually playing cards.
- **Too coarse:** several distinct actions get merged into one paragraph of prose, so the one detail someone forgets (e.g., "pass the first player token") is buried mid-paragraph and skipped anyway — reproducing the exact problem the app exists to solve.

**Why it happens:**
Step granularity was designed for reading, not for standing at a table glancing at a tablet an arm's length away mid-turn. It's tempting to mirror the Rules Reference's own bullet structure (which is written for lookup, not for sequential execution) rather than deriving an "instruction size" appropriate for one tap = one unmistakable physical action.

**How to avoid:**
Design steps around **one player-visible physical action or single decision point** per step (e.g., "Coloca la amenaza indicada" is one step; "El villano activa contra [Jugador]" is a separate step per player, in player order, even though the Rules Reference presents it as one bullet). Use bold/short imperative sentences, not descriptive rulebook prose. Where the reference bundles multiple sub-actions (e.g., boost card resolution: flip → resolve Boost ability → add ATK → discard), collapse them into one step only if they are truly a single atomic beat with no independent forgettable action — otherwise split.

**Warning signs:**
- A step with more than ~2 sentences or more than one imperative verb doing unrelated things.
- A play-test group taps through 10+ steps for a single round with visible frustration ("just let us play").
- A play-test group skips a sub-clause inside a paragraph step because they didn't re-read the whole thing.

**Phase to address:**
Content/step-model design phase, validated in a "phase 1 playtest" milestone with the actual group before content is considered final.

---

### Pitfall 4: Web Speech API fails silently on the real tablet, not in the demo

**What goes wrong:**
The feature works perfectly in a desktop browser during development, then at the table: iPadOS Safari refuses to speak anything because `speak()` wasn't called from within a user gesture; `getVoices()` returns an empty array on first paint so the Spanish voice is never selected; navigating to the next step queues a second utterance instead of replacing the first, so two steps get read aloud on top of each other; or the app is read out for 30+ seconds because it's speaking the same long text that's on screen, which is unbearable at a game table.

**Why it happens:**
The Web Speech API's real-world behavior differs by browser/OS in ways that don't show up in casual desktop testing:
- Safari (iOS/iPadOS) enforces that `speechSynthesis.speak()` must be triggered by a user gesture (tap), or WebKit silently drops it — no error is thrown. (Verified: WebKit forum reports, community writeups.)
- Voice lists load **synchronously in Safari** but **asynchronously in Chrome/Edge/Firefox** — `getVoices()` can return `[]` on the very first call in Chromium browsers, and the `voiceschanged` event that's supposed to fix this is documented by MDN and reported in the wild as unreliable, firing inconsistently across browsers.
- On Android Chrome, `getVoices()` can list a Spanish voice that has no actual installed voice pack on that device; if the OS voice pack for that exact locale/region isn't installed, TTS silently falls back to an English voice instead of erroring.
- `speechSynthesis` is a global, single, cancel-and-queue system: calling `speak()` again without first calling `cancel()` **appends** to a queue rather than replacing, so a rapid step change (double-tap "Siguiente", or a Vue re-render firing the watcher twice) produces overlapping/queued speech; conversely, calling `cancel()` immediately followed by `speak()` on Chrome is known to sometimes silently swallow the new utterance (Chromium bug reports: `speaking` becomes true but the `start` event never fires).

**How to avoid:**
- Always trigger the very first `speak()` call from directly inside a tap handler (the "Siguiente"/"Comenzar" button), never from a `watch`/`onMounted` timer — this satisfies the iOS gesture requirement and should be treated as a hard rule for the entire session, since some browsers only "unlock" audio after the first in-gesture call.
- On mount, call `getVoices()`; if it returns `[]`, attach a one-time `voiceschanged` listener AND a short-interval fallback poll (a few hundred ms, a handful of retries) to grab voices once available — do not assume the event alone is sufficient.
- Explicitly search the returned voice list for an `es-ES`/`es-*` voice; if none is found, do not throw — fall back to text-only silently (see below) rather than speaking in a wrong-language default voice.
- On every navigation (step change, back, jump), call `speechSynthesis.cancel()` **before** `speak()`, and guard against firing twice from the same render (Vue watcher/`onUpdated` re-entrancy) by tracking "last spoken step id" and no-op'ing repeats.
- Speak a **shorter, purpose-written utterance** distinct from the on-screen text where the on-screen text is long (e.g., on-screen shows the full conditional text for both Hero/Alter-Ego branches; speech should only read the one branch relevant "now," or a short summary, never the raw paragraph). Treat "what to speak" as a separate content field from "what to display," not a TTS-of-the-DOM.
- Stop speech immediately on `visibilitychange`/tab backgrounding and on route change/unmount (`speechSynthesis.cancel()` in the relevant lifecycle hook) so it doesn't keep talking into a locked screen or after leaving the step.
- Always design the UI so that voice is a nice-to-have layer over a fully readable/usable text-only interface — if speech synthesis is unsupported, blocked, or silently fails, the app must remain 100% functional through text and the "Siguiente" button alone.

**Warning signs:**
- Works on a laptop Chrome dev session, never actually tested on the target iPad in Safari before end of a phase.
- No fallback path exists if `window.speechSynthesis` is undefined or `getVoices()` stays empty.
- Reports of "it read the previous step and the new step at the same time."
- Long paragraphs read verbatim by TTS during a playtest, making players tune it out or mute the tablet.

**Phase to address:**
A dedicated TTS integration phase, tested specifically on the target iPad/tablet hardware (not just desktop browser), with an explicit "no speech = still playable" acceptance criterion.

---

### Pitfall 5: Users stuck on a stale/broken cached build after a deploy

**What goes wrong:**
After a content fix or bug fix is deployed, players opening the installed PWA at the table keep seeing the old (possibly wrong) version because the service worker is still serving previously cached assets, sometimes indefinitely, because nothing ever told the waiting worker to activate. In the worst case, a broken build gets fully precached before anyone notices, and offline mode then makes it hard to escape the broken version.

**Why it happens:**
The default service worker lifecycle keeps an old worker "in control" until all its tabs close, and workbox/vite-pwa's `generateSW`/`injectManifest` strategies precache the app shell aggressively by design — that's what makes offline work, but it's also what makes updates invisible unless explicitly handled. This is a widely reported issue in Nuxt PWA projects specifically (persisted root-page precache surviving new deploys; `updateServiceWorker()` not taking effect).

**How to avoid:**
- Use `@vite-pwa/nuxt` with `registerType: 'prompt'` (not silent `autoUpdate` for a rules-critical app) so the user is shown an explicit "Nueva versión disponible — Actualizar" affordance rather than being silently upgraded mid-session (which could invalidate in-progress state) or silently stuck on the old one.
- Implement the `skipWaiting`/`clientsClaim` message-based update flow explicitly, and call `cleanupOutdatedCaches()` so stale precache entries don't linger.
- Version the cache name/build id so a new deploy always produces a distinct cache, guaranteeing old caches are eventually evicted rather than reused.
- Never trigger the update prompt while mid-round with unsaved position risk — offer it, but let the group choose when (e.g., between rounds, or accept it may wait until app reopen).

**Warning signs:**
- After deploying a fix, the tablet (already installed/cached) still shows the bug until a hard reload or reinstall.
- No visible "update available" UI exists anywhere in the app.
- Testing was only ever done via `npm run dev`, never against a built + served + then-redeployed PWA.

**Phase to address:**
PWA/offline infrastructure phase — must include an explicit "deploy a v1, then deploy a v2, verify the update prompt appears and works while offline-cache is warm" test as an acceptance criterion, not just "it installs and works offline once."

---

### Pitfall 6: Screen sleeps or dims mid-game because Wake Lock isn't (fully) working

**What goes wrong:**
The tablet screen times out and locks mid-villain-phase because Wake Lock either isn't requested, isn't supported on that OS/browser version, or silently drops the moment the tab loses focus (e.g., user briefly swipes to another app, or the browser itself backgrounds the tab), and nothing re-acquires it.

**Why it happens:**
The Screen Wake Lock API is release-happy by design: a wake lock is automatically released whenever `document.visibilityState` becomes hidden, and there's no way to "keep it locked while backgrounded" — that's intentional browser behavior, not a bug to route around. Additionally, iOS/iPadOS Safari only gained Wake Lock support in iOS 16.4+, and installed (home-screen) PWAs specifically had a further bug where Wake Lock silently didn't work at all inside the installed-app context until it was fixed in iOS 18.4 — meaning an older iPad or an iPad not yet updated may behave as if Wake Lock doesn't exist, with zero error surfaced to the app.

**How to avoid:**
- Request the wake lock on the first user gesture (same "Siguiente"/setup tap that unlocks TTS) and re-request it on every `visibilitychange` event where `document.visibilityState === 'visible'` — treat "was released" as the expected steady state to recover from, not an error.
- Feature-detect (`'wakeLock' in navigator`) and degrade gracefully — the app must remain usable if Wake Lock is entirely unavailable (older/un-updated iPads); consider also documenting to the user "desactiva el bloqueo automático de pantalla en Ajustes" as a manual fallback rather than promising this always works.
- Do not treat Wake Lock as a substitute for the persistence work in Pitfall 8 — the screen **will** sleep on some devices regardless; surviving that gracefully via saved position matters more than fighting the OS.

**Warning signs:**
- Testing wake lock only on a modern, fully-updated tablet; never testing on the specific iPad model/OS version the group actually owns.
- No re-acquire logic on `visibilitychange`, only a one-time request at page load.

**Phase to address:**
Tablet-at-the-table UX phase, alongside the persistence phase (Pitfall 8) since both exist to solve the same underlying problem (the screen will sleep) from two complementary angles.

---

### Pitfall 7: SSR/hydration mismatches from reading browser-only state unguarded

**What goes wrong:**
A step position restored from `localStorage` renders differently on the server (which has no `localStorage`, no `window`, no `speechSynthesis`) than on the client during hydration, producing a Vue hydration mismatch warning/error, a flash of the wrong step, or an outright SSR crash if the code assumes `window` exists.

**Why it happens:**
Nuxt 4 (like Nuxt 3) still runs an initial render pass in a Node/Nitro SSR context where none of these browser globals exist; naively reading `localStorage.getItem(...)` in a `<script setup>` top-level or in a Pinia store initializer executes during SSR and throws or returns a default that then "flips" once the client rehydrates with the real value — this is a very well-documented Nuxt hydration-mismatch class of bug, not specific to this project, but especially relevant here because the entire app's state (current step, round, player count, difficulty) is meant to live only in the browser.

**How to avoid:**
- Given this project has **no server-rendered content that depends on saved progress** (it's a private, offline, no-SEO tool), the simplest and most robust choice is **`ssr: false`** for the interactive app shell, or at minimum wrap all persisted-state reads in `onMounted`/`import.meta.client` guards and never read `localStorage`/`speechSynthesis`/`window` during setup()'s synchronous body.
- If any SSR/prerendering is kept (e.g., for a static marketing/landing shell), isolate it strictly from the stateful game-runner component, which should be `<ClientOnly>` or client-only-rendered.
- Treat "restore saved position" as a **post-mount** operation that always starts from a neutral/loading placeholder, never as something baked into the first paint.

**Warning signs:**
- Any direct `localStorage`/`window`/`speechSynthesis` reference outside `onMounted`, an event handler, or an `import.meta.client` guard.
- Console warnings about hydration mismatch during dev, especially around the step-position component.
- A visible "flash" of step 1 before the real saved step appears.

**Phase to address:**
Framework/architecture setup phase (very early) — decide `ssr: false` vs. hybrid rendering **before** building the persistence and step-engine logic, since retrofitting SSR-safety onto code that assumes client-only globals is disruptive.

---

### Pitfall 8: A stale save from a previous session is silently resumed

**What goes wrong:**
The group finishes (or abandons) a game, and a week later opens the same URL to start a **new** game — but the app silently jumps back into the old saved position (e.g., "Ronda 4, Fase del villano, paso 2") because that's what's in `localStorage`, with no prompt. This is worse than losing progress: it actively misleads the group into thinking they're further into a new game than they are, or resuming rules state (villain stage, player count, difficulty) that no longer matches the physical table.

**Why it happens:**
Persistence was built to solve "the tablet locked itself" (a same-session interruption), but the exact same storage mechanism also silently answers "did we start a new game?" — these are different questions that naive `localStorage`-on-load code cannot distinguish.

**How to avoid:**
On app load, if a saved position exists, **always ask**: "Se detectó una partida guardada en Ronda X, paso Y — ¿Continuar o empezar una partida nueva?" rather than silently restoring. Only skip the prompt if there is no saved state at all (fresh browser/first ever use). Persist a minimal position (round number + step id + setup answers: player count, difficulty), not derived/redundant state, so the "what would we be resuming" summary shown in the prompt is trivial to construct and always accurate.

**Warning signs:**
- Reloading the tab after "finishing" a game still shows the old step with no prompt.
- The persistence code is a single `watch` that writes on every step change and a single `onMounted` that reads and applies it with no branching for "is this actually a resume or should we ask."

**Phase to address:**
Persistence/state phase — this must be a designed interaction (a resume/new-game prompt), not an afterthought bolted onto whatever `localStorage` shape the step engine happens to produce.

---

### Pitfall 9: Scope creep toward full game-state tracking, or building game #2 before game #1 is proven

**What goes wrong:**
Several closely related temptations, each individually reasonable-sounding, each explicitly excluded in `PROJECT.md`:
- Adding "just a little" villain HP / threat tracking because "it's already showing the number from the setup formula, why not just track the subtraction too" — this reintroduces exactly the state-desync-with-the-physical-table risk the project deliberately avoided.
- Starting the generic step-engine abstraction (phases, loops, conditionals) designed for **both** Marvel Champions and Warhammer 40k before a single real playthrough of Marvel Champions has validated that the engine's model (linear setup + repeating round loop) actually holds up at the table.
- Building an in-app content editor "since we'll need it eventually" — this is explicitly out of scope; content is meant to stay hand-authored JSON in the repo.

**Why it happens:**
These are all natural extensions of work already in progress, and each one individually seems small — the risk is compounding, not any single instance.

**How to avoid:**
Re-read the `Out of Scope` list in `PROJECT.md` at the start of each phase that touches the step engine or content model, and treat "does this require the app to track game-state numbers" or "does this only make sense once we have a second game" as hard stop questions. Sequence work so that Marvel Champions plays start-to-finish with real users **before** any Warhammer 40k content or further engine generalization begins — the roadmap should have an explicit milestone boundary here ("engine validated with one real playthrough") rather than parallelizing engine-generalization with content-authoring.

**Warning signs:**
- A PR/commit that adds any numeric game-state field (HP, threat, counters) to the step/session model.
- Engine code with hooks, config, or abstractions that only make sense for Warhammer 40k's turn structure, added before Marvel Champions has been played end-to-end with the app.
- Any UI surface for "edit this step's text" appearing in the deployed app rather than in the repo/JSON files.

**Phase to address:**
Roadmap sequencing itself (this is a cross-phase concern) — explicitly gate "generalize the engine" and "start Warhammer 40k content" behind a completed, played, real-world Marvel Champions milestone.

---

### Pitfall 10: Reproducing copyrighted rules text or card text verbatim

**What goes wrong:**
Content JSON ends up containing large verbatim excerpts of the official Rules Reference or "Aprende a jugar" PDF (or scanned/typed card text), which is a straightforward copyright concern once the app is reachable at a public URL — even if unlisted, a public URL is still public distribution, not private use, in copyright terms.

**Why it happens:**
It's fast and "safe" (in the sense of rules-accuracy) to copy-paste the official wording directly rather than rewrite it as a short imperative instruction — especially under this project's very rules-fidelity-anxious verification process, which can push toward "just quote it exactly to be safe."

**How to avoid:**
Write every step as an original, short, procedural instruction derived from the rule, not a copy of the rulebook's prose — this is also better UX (Pitfall 3) since rulebook prose is written for reference, not for a single tap-through instruction. Cite the source (page/section, per Pitfall 2) internally for verification, but the **displayed/spoken text itself should never be a verbatim quote** of Marvel/FFG/Asmodee's copyrighted rulebook text, card text, or any card art/imagery. This is `PROJECT.md`'s own stated constraint ("no se reproducen cartas, arte ni textos extensos con copyright") — treat it as a hard content-review gate, not just a stated intention.
This is not legal advice; if the project ever moves beyond "shared with friends" toward any wider/public/monetized distribution, get real legal review before that transition — the tolerance for a private hobby tool used by a known group of friends is meaningfully different from a publicly promoted or monetized product using the same IP names, terminology, and derived rules text.

**Warning signs:**
- Any step's `text` field that reads like it was copy-pasted rather than rewritten (long sentences, rulebook connective phrasing like "however" / "unless otherwise specified").
- Card names/villain names used as plain identifiers (generally fine, akin to referencing a product by name) vs. reproduced card ability text or flavor text (not fine).
- The URL being shared beyond the immediate friend group without revisiting this pitfall first.

**Phase to address:**
Content-authoring phase (ongoing content-review discipline) and again explicitly at any future "make this more public" milestone transition.

---

## Marvel Champions Rules Verification Checklist

This is a working checklist for the rules-verification phase. Each row states **what the official Rules Reference v1.7 actually says** (verified directly against the local PDF `mc_rulesreference_v17-compressed.pdf`), the exact page/section to re-check, and what to look for as a mismatch in the hand-written summary.

| # | Rules corner | What the Rules Reference v1.7 actually says | Source | Verification target for the hand-written summary |
|---|---|---|---|---|
| 1 | Villain phase step count/order | The villain phase has **6** numbered steps, not 4: (1) Place Threat, (2) Enemies Activate, (3) Deal Encounter Cards, (4) Reveal Encounter Cards, (5) Pass First Player Token, (6) End of Villain Phase and Round. | p.45, "Villain Phase" | Check whether the summary's "4 steps" collapses (5) and (6) into implicit bookkeeping, or actually omits/misorders one of them. Confirm token pass and end-of-round/end-of-phase delayed-effect resolution are both present as explicit steps, not skipped. |
| 2 | Acceleration: per-player or flat | Acceleration adds threat equal to the number of acceleration **icons/tokens currently in play**, added once during step 1 — it is **not** multiplied by number of players. Acceleration tokens are added when the encounter deck empties/reshuffles, or by specific card effects; they are functionally equivalent to icons but tracked separately. | p.5, "Acceleration Icon ()" / "Acceleration Token" | Confirm the summary does not scale accel threat by player count. Separately confirm it doesn't conflate this with **Heroic Mode**, which is the mechanic that actually scales with a chosen "heroic level" (extra encounter cards dealt in step 3, not extra threat in step 1). |
| 3 | Boost cards: dealt vs revealed vs discarded | Boost cards are a **different card flow** from "encounter cards dealt to players." When the villain (or a minion with the villainous keyword) attacks: give it **one facedown boost card** from the encounter deck at the start of the attack resolution (step 1 of "Attack (Enemy Activation)"), then during boost resolution, flip each boost card faceup one at a time in the order dealt, resolve any "Boost" ability (star icon), add ATK equal to boost icons, then **discard**. This entire cycle happens inside a single enemy activation, separate from the "Deal Encounter Cards"/"Reveal Encounter Cards" villain-phase steps (which deal cards to *players*, not to the attacking enemy). | p.8–9, "Attack (Enemy Activation)"; p.10, "Boost, Boost Icon" | Confirm the summary doesn't merge "boost cards to the villain" with "encounter cards dealt to players" as if they were the same deal/reveal cycle — they are mechanically and temporally distinct. |
| 4 | "Deal 1 encounter card each" vs revealing | Villain phase step 3 (Deal) gives every player their card(s) facedown, in player order, **before any revealing happens** (one card each, plus one additional per hazard icon in play, additional cards dealt to one player at a time in player order — not one extra to every player per icon). Step 4 (Reveal) is a **separate pass**: the first player reveals and fully resolves each of their dealt cards one at a time in the order dealt, then the next player does the same, and so on. | p.45, "Villain Phase" steps 3–4; p.21, "Hazard Icon" | Check that the summary models this as two distinct passes (deal-to-all, then reveal-per-player-in-order), not a single-pass "deal and immediately reveal" loop. Check the hazard-icon detail: extra cards go to specific players in player order, not "everyone gets +1." |
| 5 | Minion activation and boost cards | During step 2, minions engaged with a player activate **after** the villain, in the order that player chooses if multiple. Minions attack if the engaged player is in hero form, scheme if in alter-ego form — same branch as the villain. Critically: **only the villain, or a minion with the villainous keyword, receives a boost card when attacking** — an ordinary minion without that keyword gets **no** boost card (explicitly: "skip this step"). | p.6, "Activation"; p.8, "Attack (Enemy Activation)" step 1 | Confirm the summary doesn't state that all minions draw/receive boost cards — this is very likely a plausible-sounding but incorrect generalization from "the villain gets a boost card." |
| 6 | Obligation cards: "one per player" | An identity is associated with **one or more** obligation cards (not necessarily exactly one), all of which are **shuffled into the encounter deck** during setup (setup step 4 sets them aside temporarily just to gather them; setup step 10 shuffles them into the encounter deck alongside the scenario's listed encounter sets). Obligations then surface like any other encounter card via normal draws/reveals — they are not a separate deterministic "one extra card per player per round" mechanic. | p.29, "Obligation"; p.48, Appendix II Setup steps 4 & 10 | Confirm the summary doesn't claim exactly one obligation card per player, or that obligations are dealt on a fixed schedule rather than surfacing via normal encounter-deck shuffling/reveals. |
| 7 | Nemesis/"Archenemy" set removed from the encounter deck | The official term is **Nemesis Encounter Set** (not "Archenemy"). At setup, each played identity's nemesis set (including its "nemesis minion" and "nemesis side scheme") is **set aside out of play entirely** — it is explicitly **not** included when the encounter deck is built (setup step 10 only shuffles the main scheme's listed sets + obligations). Nemesis cards enter play only when a specific card effect instructs it. | p.29, "Nemesis Encounter Set"; p.48, Appendix II Setup steps 5 & 10 | Confirm the summary's terminology and mechanism match "set aside, not shuffled in, enters later only via a trigger" — not "shuffled in then later removed," and not just "unused." |
| 8 | Player-deck depletion vs encounter-deck depletion | These are **asymmetric**, not mirror-image mechanics. **Encounter deck empty:** immediately reshuffle its discard pile into a new deck and place **one acceleration token** next to the main scheme — no penalty to any specific player. If both the encounter deck and its discard pile are simultaneously empty, an infinite acceleration loop occurs and **the players lose the game**. **Player deck empty:** that player shuffles their own discard pile into a new deck **and immediately deals themself one facedown encounter card** from the top of the encounter deck — a personal penalty. If a player's discard pile is also empty, their deck doesn't reset until it has ≥1 card, then the encounter-card penalty still applies. | p.17, "Encounter Deck"; p.32, "Player Deck" | Confirm the summary doesn't describe these as symmetric, and doesn't omit the "deal yourself 1 facedown encounter card" penalty on player-deck reshuffle — this is a frequently-missed detail. |
| 9 | Hero vs Alter-Ego during the villain phase | During step 2, for **each player** in player order: if their identity is in **hero form**, the villain (and any engaged minions) **attacks** that player's hero; if in **alter-ego form**, it **schemes** instead (uses SCH against the main/side scheme) — the player is never simply "skipped." Separately: a player may voluntarily flip hero/alter-ego only **once per round, during their own turn** in the player phase — form is locked for the rest of that round by the time the villain phase begins. | p.6, "Activation"; p.20, "Form, Change Form"; p.45, "Villain Phase" | Confirm the summary states the hero/alter-ego branch correctly for both villain **and** minion activation, and correctly states that form can't be changed after the player phase ends to dodge an attack/scheme. |
| 10 | End-of-player-phase order | Confirmed as: (1) in player order, each player **may** discard any number and **must** discard down to hand size if over it; (2) **simultaneously**, each player draws up to hand size; (3) **simultaneously**, each player readies all their cards (and exhausted encounter cards are readied too); (4) "until end of player phase" effects end; (5) "when/after phase ends" effects resolve. | p.16–17, "End of Player Phase" | This one is likely already correct in the summary (discard → draw → ready) — verify specifically that draw and ready are simultaneous across players (not sequential per player), and that discard allows discarding any number voluntarily, not only exactly down to hand size. |
| 11 | Villain-phase start in Normal vs Expert | **Likely a wrong premise to begin with.** The Rules Reference shows **no structural difference** in the villain phase's steps/order between Standard and Expert Mode. Expert Mode only changes: (a) which villain stage cards are used (the scenario's listed "expert mode villain stages"), and (b) that the Expert encounter set is added to the encounter deck at setup. The mechanic that actually changes villain-phase **step 3** quantitatively (extra encounter cards per player) is **Heroic Mode** — a separate, combinable difficulty mode based on a chosen "heroic level," not "Expert" itself. | p.28ish, "Modes of Play" (Standard Mode / Expert Mode / Heroic Mode) | Treat this as the single highest-value correction to surface: check whether the hand-written summary invented a villain-phase-order difference for Expert that doesn't exist, and/or conflated "Expert" with "Heroic." |
| 12 | Stun / Confuse / Tough resolution timing | These are **replacement effects triggered at the moment of the specific action**, not passive pre-skips: a stunned character that **attempts** to attack **discards the stunned card instead of attacking** (costs like exhausting are still paid); a confused character that attempts to scheme/thwart discards the confused card instead; **Tough** prevents damage entirely when damage would be dealt, and status-card effects have **timing priority over all triggered abilities, including interrupts** — an interrupt cannot save a Tough card by reducing damage after the fact; only a constant ability, or DEF reducing an attack's damage to exactly 0 via basic defense, preserves Tough (per official FAQ). Characters with the **steady** keyword need **two** stacked stun/confuse cards before they're actually affected. | p.39–40, "Status Cards" / "Stun, Stunned" / "Confuse, Confused" / "Steady"; p.55, Appendix IV FAQ ("tough status card... interrupt ability") | Confirm the summary frames stun/confuse as replacing the specific action (attack/scheme/thwart) at the moment it's attempted, not as "this character does nothing this activation" — a stunned minion, for example, is still present/engaged, only its attack itself is replaced. |

**How to keep this in sync with official errata over time:** FFG/Asmodee periodically republish the Rules Reference with a "Summary of Notable Changes" page (v1.7's own front page lists exactly this, e.g. "Page 12: Revised rules around choosing an option on a card," "Page 63–67: Added entries to Appendix V: Errata"). Store the exact reference version each game's JSON was verified against as a top-level metadata field (e.g. `rulesVersion: "1.7"`), and when a new Rules Reference PDF is released, diff its "Summary of Notable Changes" page against the citations already recorded in the JSON's `source` fields (Pitfall 2) to see exactly which steps need re-checking — this turns a full re-read into a targeted diff.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Skip `source`/citation fields on steps "for now, add later" | Faster initial content authoring | Provenance is much harder to reconstruct after the fact; a wrong step becomes untraceable | Never for Marvel Champions rules-encoding steps; acceptable only for pure flavor/UX text with no rule content |
| Copy rulebook prose verbatim into step text "to be sure it's exact" | Zero risk of mis-paraphrasing a rule | Copyright exposure once public; also worse UX (Pitfall 3) since rulebook prose isn't instruction-shaped | Never — always paraphrase, cite the source separately |
| Use `autoUpdate` service-worker registration instead of `prompt` | Simpler code, no UI needed | Silent mid-session upgrades can invalidate in-progress state unpredictably | Only acceptable pre-launch/dev; switch to `prompt` before real use at the table |
| Read `localStorage` directly in component setup instead of guarding with `onMounted`/`ssr:false` | Slightly less boilerplate | Hydration mismatches, possible SSR crashes | Never once any SSR/prerendering is enabled; fine only if `ssr: false` globally |
| Persist the entire step/session object instead of a minimal position (round + step id + setup answers) | Nothing to compute on resume | Restoring a saved position that points at a step ID which no longer exists after a content edit; drift between saved shape and current schema | Never for production; acceptable only during early prototyping before content is versioned |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Web Speech API (`speechSynthesis`) | Calling `speak()` from a lifecycle hook/watcher instead of a user gesture; assuming `getVoices()` is populated on first call | First `speak()` must originate from the initial tap; poll/`voiceschanged`-listen for voices with a timeout fallback to text-only |
| Web Speech API voice selection | Assuming an `es-ES` voice always exists because `getVoices()` lists a Spanish-labeled entry | Verify the voice actually produces audio (or accept some devices will use a fallback Spanish variant/region); never hard-fail the app if the exact voice is missing |
| Service Worker / `@vite-pwa/nuxt` | Using default `generateSW`/`autoUpdate` and assuming updates "just work" | Explicit `registerType: 'prompt'`, `skipWaiting` message flow, `cleanupOutdatedCaches()`, and a real deploy-then-redeploy test |
| Screen Wake Lock API | Requesting once at page load and never re-acquiring | Re-request on every `visibilitychange` to `visible`; feature-detect and degrade gracefully on unsupported/buggy iOS versions |
| `localStorage` | Reading/writing without guarding for SSR context or multi-tab races | Client-only guarded reads/writes; treat resume as an explicit user choice, not silent |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Importing the entire game's JSON content as a single client bundle chunk | Slightly larger initial JS payload; slower first load especially on a middling tablet CPU | Keep per-game JSON reasonably small (this is a rules-flow, not a card database) and code-split by game (only load the selected game's JSON) | Noticeable once a second game (Warhammer 40k) is added and both are eagerly bundled |
| Long, unbounded TTS utterances | Speech takes 20–30+ seconds per step, players mute or ignore it | Author a separate, short "spoken" field distinct from the displayed text | Immediately, at first playtest, for any step with conditional branch text |
| Precaching every asset indiscriminately in the service worker | Slow/heavy install step on first PWA install, harder update diffs | Precache only the app shell + current game's JSON; avoid caching every possible future game's content by default | Once a second/third game's content exists and isn't gated behind selection |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Publishing scanned card art or lengthy verbatim rulebook excerpts to a public URL | Copyright/IP exposure from Marvel/FFG/Asmodee-owned content | Only original, short procedural text; no card scans or art assets in the repo or served content |
| Treating "unlisted URL" as equivalent to "private" | A public URL is still public distribution; search engines/crawlers or accidental sharing can expose it | Don't rely on obscurity for anything that matters; if ever shared more widely, do a fresh legal review before that transition (not legal advice) |
| Storing nothing sensitive, but still worth checking: no accidental PII in analytics/error logging if any is ever added | Low risk here since there's no backend/accounts, but easy to introduce later without noticing | Keep the "no backend, no accounts" constraint explicit in any future tooling decisions (e.g., don't bolt on a hosted analytics/error-tracking SaaS without re-checking this) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Steps sliced too finely (tap-fest) | Players get annoyed, start ignoring/rushing through the app | One step = one unmistakable physical action or decision point (see Pitfall 3) |
| Steps too coarse (paragraph wall) | The one forgettable detail gets buried and skipped anyway | Split any step with more than one imperative action; write instructions, not rulebook prose |
| Losing your place / no way to go back | Players stop trusting the app and revert to memory/rulebook, defeating its purpose | Persistent, always-visible "Atrás" alongside "Siguiente"; visible round/step indicator |
| Disorienting loop boundary (end of round → start of next round) | Players lose track of which round they're on, especially after a tablet-sleep interruption | Explicit "Ronda N" header always visible; a distinct, unmistakable "start of round" step, not an invisible wrap-around |
| Conditional branches shown as dense text | The relevant branch (Hero vs Alter-Ego, e.g.) gets lost among the irrelevant one | Visually separate/label each branch clearly (not just comma-separated prose) even though both are always shown as text per the project's zero-tap design decision |
| App demanding attention the game needs | Reading a whole paragraph aloud or requiring multi-step navigation interrupts the physical flow of play | Short spoken text distinct from displayed text (Pitfall 4); minimize required taps to resume the loop after checking a rule |
| Silent resume of a stale/previous game session | Group is misled about actual game state; may misplay believing they're further along | Always prompt "continuar vs. empezar nueva" when a saved position exists (Pitfall 8) |

## "Looks Done But Isn't" Checklist

- [ ] **Rules content "verified":** Often missing a `source` citation per rule-bearing step — verify every step that encodes a rule (not just flavor text) has a page/section reference into the Rules Reference v1.7.
- [ ] **Offline support:** Often missing a real "kill the wifi mid-session and keep playing" test — verify by actually toggling airplane mode on the target tablet mid-round, not just checking DevTools' offline throttle in a desktop browser.
- [ ] **TTS "working":** Often only tested on a desktop browser — verify specifically on the target iPad in Safari, with a real tap-triggered first utterance, and confirm the app remains fully usable with speech disabled/unsupported.
- [ ] **Service worker update flow:** Often only tested once (install and it works) — verify by deploying a v1, then a v2, and confirming the update prompt appears and the new version loads correctly, including while previously offline-cached.
- [ ] **Persistence "just works":** Often missing the resume-vs-new-game prompt — verify that reopening the app after a completed/abandoned game asks before jumping back into the old position.
- [ ] **Step engine handles both setup (linear) and round (looping) correctly:** Often only tested by walking forward once — verify jump-to-any-step, then continuing normally, returns to the correct point in the loop (not back to setup) per the explicit `PROJECT.md` requirement.
- [ ] **Wake Lock "working":** Often only tested on the developer's own up-to-date device — verify on the actual tablet hardware/OS version the group owns, and confirm graceful behavior if Wake Lock is entirely unsupported there.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| A wrong rules step reaches "verified" content without a citation | MEDIUM | Re-derive against the Rules Reference using the verification checklist above; retroactively add `source` fields; treat it as a signal to audit nearby steps for the same class of error |
| Stale service-worker cache stuck on a broken build | LOW–MEDIUM | Bump the cache/build version to force cache invalidation; as an emergency user-facing fallback, provide a documented "how to force-refresh this PWA" note (clear site data / reinstall) for the group |
| Persisted position points at a step ID removed by a content edit | LOW | On load, validate the saved step id against the current content; if missing, fall back to the nearest valid step (e.g., start of current round) and show the resume prompt rather than crashing |
| Engine over-generalized for Warhammer 40k before Marvel Champions validated it | HIGH | Willing to revert/simplify the engine abstraction back to what Marvel Champions actually needs once real usage reveals the wrong generalization; avoid sunk-cost pressure to keep unused flexibility |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|---------------|
| Rules-fidelity errors from the hand-written summary (Pitfall 1) | Dedicated rules-verification phase | Every step in the Marvel Champions JSON has a `source` citation and passes the checklist above |
| No per-step provenance (Pitfall 2) | Content schema design phase | Schema includes `source`/`rulesVersion` fields from the start; spot-check a sample of steps for citations |
| Wrong step granularity (Pitfall 3) | Content/step-model design + first real playtest milestone | Playtest feedback shows no "tap-fest" complaints and no missed sub-detail inside a step |
| Web Speech failures (Pitfall 4) | TTS integration phase | Manual test on the actual target iPad/tablet in Safari: gesture-triggered first utterance, no double-speak, graceful text-only fallback |
| Stale PWA cache after deploy (Pitfall 5) | PWA/offline infrastructure phase | Deploy v1 → v2 test; confirm update prompt and successful transition while previously offline |
| Screen sleep / Wake Lock gaps (Pitfall 6) | Tablet-at-the-table UX phase | Test on the actual owned tablet hardware/OS version; confirm re-acquire on visibility change |
| SSR/hydration mismatches (Pitfall 7) | Framework/architecture setup phase (early) | No hydration warnings in dev/build; `ssr: false` (or equivalent guarding) decided before persistence logic is built |
| Silent resume of stale session (Pitfall 8) | Persistence/state design phase | Reopening after a finished/abandoned game always shows a resume-or-new prompt |
| Scope creep (state tracking, W40k-first, in-app editor) (Pitfall 9) | Roadmap sequencing (cross-phase) | Milestone boundary exists: "Marvel Champions engine validated via real playthrough" gates any engine generalization or W40k content work |
| Copyrighted content reproduction (Pitfall 10) | Content-authoring phase (ongoing) + any future "go more public" milestone | Content review confirms no verbatim rulebook/card text or art; revisit before any wider distribution |

## Sources

- `mc_rulesreference_v17-compressed.pdf` (Marvel Champions Rules Reference, Version 1.7) — local copy at `~/Downloads/mc_rulesreference_v17-compressed.pdf`, read directly via `pdftotext`; all rules-fidelity citations above reference specific pages/sections of this document (HIGH confidence, primary official source).
- `Marvel-Champions_aprende_a_jugar.pdf` (Aprende a jugar / Learn to Play) — local copy at `~/Downloads/Marvel-Champions_aprende_a_jugar.pdf`, available as a secondary official source (not deeply excerpted here since the Rules Reference is authoritative for edge cases).
- MDN, `SpeechSynthesis: voiceschanged event` — https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event
- WebKit developer forum, "Web Speech Synthesis API: not all voices installed listed" — https://developer.apple.com/forums/thread/723503
- weboutloud.io, "The State of Speech Synthesis in Safari" — https://weboutloud.io/bulletin/speech_synthesis_in_safari/
- Chromium issue tracker, `SpeechSynthesis ignores language/voice setting` — https://issues.chromium.org/issues/331977824
- Mozilla Bugzilla #1522074, "speechSynthesis cancel wipes out speak calls following directly after" — https://bugzilla.mozilla.org/show_bug.cgi?id=1522074
- GitHub, `nuxt-community/pwa-module` issues #149 and #381 (stale precache after deploy) — https://github.com/nuxt-community/pwa-module/issues/149, https://github.com/nuxt-community/pwa-module/issues/381
- GitHub, `vite-pwa/vite-plugin-pwa` issue #772 (`updateServiceWorker()` not applying) — https://github.com/vite-pwa/vite-plugin-pwa/issues/772
- GitHub, `vite-pwa/nuxt` issues #79 and #140 (dynamic route / offline navigation issues) — https://github.com/vite-pwa/nuxt/issues/79, https://github.com/vite-pwa/nuxt/issues/140
- Chrome for Developers, "Stay awake with the Screen Wake Lock API" — https://developer.chrome.com/docs/capabilities/web-apis/wake-lock
- MDN, "Screen Wake Lock API" — https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- WebKit blog, "Updates to Storage Policy" (iOS storage eviction) — https://webkit.org/blog/14403/updates-to-storage-policy/
- GitHub, `nuxt/nuxt` discussion #25500, "Hydration Mismatch Using localStorage" — https://github.com/nuxt/nuxt/discussions/25500
- Nuxt official docs, "Nuxt and Hydration · Best Practices v4" — https://nuxt.com/docs/4.x/guide/best-practices/hydration
- Nuxt official docs, "Prerendering · Get Started with Nuxt v4" — https://nuxt.com/docs/4.x/getting-started/prerendering
- Project context: `.planning/PROJECT.md` (explicit Out of Scope list, constraints, and local PDF source-of-truth paths)

---
*Pitfalls research for: tablet-first offline Nuxt 4 PWA guiding Marvel Champions rules with Spanish TTS*
*Researched: 2026-08-28*
