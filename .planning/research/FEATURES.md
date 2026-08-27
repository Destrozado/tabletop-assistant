# Feature Research

**Domain:** Web-based guided rules-flow / turn-tracker assistant for complex board games (Marvel Champions LCG first, Warhammer 40k later), used on a tablet at the table
**Researched:** 2026-08-28
**Confidence:** MEDIUM-HIGH (table-stakes tablet UX and TTS patterns are well-documented and cross-verified across multiple product categories; Marvel Champions-specific competitor landscape is confirmed directly from app stores/GitHub; some app-store review sentiment is WebSearch-derived and marked accordingly)

## Executive Framing

This product sits at the intersection of three existing product shapes, none of which is quite the same thing:

1. **Card/stat companion apps** (MC Companion, MC Card Codex, jwtr/mcc, Marvel Champions Tracker) — solve "manage cards/decks/counters," not "tell me what to do next."
2. **Interactive rules-teaching apps** (Dized) — solve "teach me the game via tutorial," multi-game, video-heavy, ad/subscription-funded.
3. **Wargame turn-sequence trackers** (40K Battle Flow, Wargame Toolbox, GrimSlate) — solve exactly the "guided phase-by-phase flow" problem this project wants, but for 40k, and without voice.

No product in the wild currently does "guided step-by-step flow, one Next button, TTS, for Marvel Champions." That is a genuine gap (see Q8 below), and the 40k wargame-tracker sub-genre is strong evidence that the *shape* of this product (phase flowchart → guided tracker → per-step reminders) is a proven, validated pattern in a directly adjacent domain.

## Answers to the Specific Questions Posed

**1. Navigation affordances beyond "Next":** Every guided-flow product studied (40K Battle Flow, Wargame Toolbox, recipe apps like "In the Kitchen"/Hestia/RecipeForLater) offers at minimum: Back/Previous, and a way to see "where am I" without stepping through everything again. 40K Battle Flow's core device is a **tappable, colour-coded flowchart of the whole round** that doubles as a jump-to-step index — you're never limited to linear Next/Back. This validates the project's planned "salto directo a cualquier paso" as correct, not a nice-to-have.

**2. Communicating "round 4, villain phase, step 3 of 4" in a forever-looping flow:** No product studied does this with a single opaque progress bar (a progress bar implies a finish line; a repeating round loop doesn't have one per round). The pattern that recurs is a **compound orientation string / header**: round counter + current phase name + step-within-phase, always visible, updated on every screen (this is effectively what 40K Battle Flow's colour-coded phase cards + round tracker do together). Second-order pattern from recipe/checklist apps: keep the "container" (round N) visually distinct from the "contents" (step X of Y within this phase), because users re-orient by first checking "which round," then "which phase," then "which step" — in that order of granularity.

**3. TTS — real differentiator or novelty?** Real, but only in the narrow "app as narrator" niche (One Night Ultimate Werewolf, Dead of Winter's app, BgVoice) that already validates hands-are-busy voice narration for board games — it is not a novelty, it is an established, well-liked pattern *when scoped to short lines*. What good implementations get right, and where the ones studied get it wrong:
   - **Read only the essential line, not the whole paragraph.** Dized's biggest voice complaint was a "robotic, repetitive" voiceover that read full text blocks aloud including capitalized words letter-by-letter — that's the fate of naively wiring TTS to a whole content blob instead of curating a short spoken line per step.
   - **Don't re-read on navigating back.** No product studied does this well by default — it's a documented Dized failure mode ("repeating the same instructions over again"). This is worth treating as an explicit design requirement, not an edge case.
   - **A mute toggle is assumed, not optional.** Every voice-narrator product (ONUW app, cooking apps) exposes an obvious way to shut the voice off — a group half-listening / half-reading physically cannot tolerate a voice they can't kill.
   - **Queueing/interruption:** cooking-app pattern (Hestia, Cookie, "In the Kitchen") is speak-current-step-only, cancel-and-restart-speech on any navigation, never queue multiple lines. Directly transferable to this project's Web Speech API usage.

**4. What users complain about (grounded in the products checked):**
   - **Losing your place / re-syncing state:** Gloomhaven Helper's most damaging complaint (WebSearch-sourced, MEDIUM confidence) was stat resets and disconnects mid-campaign, forcing players to "spend more time troubleshooting than playing" — the exact failure mode this project's browser-persisted progress is designed to prevent.
   - **Text/tap targets too small:** Gloomhaven Helper — "text and buttons are far too small on phones, making it almost unusable" (users were on the wrong device class: phone instead of tablet — a device-fit problem as much as a design one). Descent: Legends of the Dark app — text "very small and practically illegible on a phone," and rotate/zoom resets by accident. Direct confirmation that tablet-only, large-text, orientation-locked design is not optional polish, it's the baseline for this category.
   - **App disagreeing with / not matching the rulebook, or not covering what's needed:** Gloomhaven Helper users noted it "didn't help track character ability cards" — a scope mismatch, not a bug, but it reads as "the app doesn't actually help." Lesson: be explicit and narrow about what the guide claims to cover, so users don't expect it to also resolve things it deliberately doesn't (matches this project's decision to exclude rules-lookup from v1, as long as that boundary is communicated).
   - **Monetization/interruption friction:** Dized's reviews cite frequent video ads and subscription pushes "within minutes" of opening the app, directly breaking the promise of a frictionless companion. Strong anti-feature signal (see below).
   - **Battery/session-length:** Descent: Legends of the Dark app drains battery over 4+ hour sessions — relevant given Marvel Champions sessions can run long; screen-stays-awake + PWA needs to be paired with a user-visible reminder that the screen will not sleep (battery tradeoff), not silently assumed.

**5. Tablet-at-the-table baseline (industry HIG + evidence from complaints above):**
   - Minimum tap target ~44×44pt (Apple HIG) / 48×48dp (Material) — non-negotiable given players' hands are busy with cards and touches will be imprecise/from an angle.
   - Landscape orientation, locked — matches how a tablet actually sits propped next to a table; Descent's "hard to rotate, resets to default" complaint shows orientation *flexibility* is a bug source, not a feature: locking it deliberately avoids that failure mode.
   - Large, short text — validated repeatedly (Gloomhaven Helper, Descent) as the single most complained-about miss when absent.
   - Dark mode for dim rooms — standard expectation for any at-the-table screen used in evening play; low implementation cost, meaningful comfort/glare win.
   - Screen-stays-awake (wake lock) — table stakes; confirmed pattern from "In the Kitchen" cooking app (auto-lock disabled while a recipe/step is open) and implied by every "put it down next to you and glance at it" use case. Must be paired with a note about battery cost (see Q4).
   - Single-hand reach — tablet propped beside the table, not held, so this matters less than in mobile-in-hand contexts, but primary controls (Next/Back) should still sit within a natural thumb zone at the bottom of the screen given a quick tap without picking the device up.
   - Glare — no product directly documents this, but it's a direct consequence of dark-mode + high-contrast text choices; treat as achieved via the same lever, not a separate feature.

**6. Anti-features actively disliked (see Anti-Features table below for the full list with alternatives).** Highlights: intrusive ads/subscriptions (Dized), forced account/login for a private single-group tool, stat-tracking state that can desync from the physical table (Gloomhaven Helper), and building a card-database/deckbuilder inside what's supposed to be a lean flow guide (scope creep visible in nearly every MC fan tool — they all tried to also be a card database).

**7. Multi-game entry point:** Dized is the clearest cautionary tale — it supports "numerous board games" but reviews call the navigation "clunky and bulky" with "unintuitive tab switching," and paid features that "don't scale properly on iPad." The lesson for a 2-game (soon) roster: keep the game picker to a single, dumb, obvious choice screen; if a game's content isn't ready (Warhammer 40k in v1), show it in the picker but gate it clearly ("próximamente") rather than let users into a half-built flow — exactly what PROJECT.md already plans. Do not try to make the picker "smart" (recently played, recommended, etc.) — that's solving a problem (many games, need triage) this project doesn't have yet.

**8. Existing Marvel Champions app landscape — direct answer: no product does what this project wants to build.** Named and assessed below (Competitor Feature Analysis). The closest conceptual match is an early prototype ("Marvel Champions Digital," kitze.io) which bundles deck management + campaign tracking + encounter setup + a tablet-first touch UI, but it is (a) not publicly released, (b) fundamentally an organizational/tracking tool rather than a round-by-round "what happens now" narrator, and (c) shows no evidence of a voice/TTS feature or of modeling the setup→round-loop structure this project needs. Everything else in the MC ecosystem is either a card database/deckbuilder (MC Companion, MC Card Codex, marvelcdb.com-linked tools) or a stat/HP/threat counter replacing physical dials (jwtr/mcc, Marvel Champions Tracker "tactical HUD") — i.e., tools this project has deliberately decided *not* to be.

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Primary "Siguiente" (Next) button as main interaction | Core interaction model of every guided-flow product studied (cooking apps, 40K Battle Flow) | LOW | Already in PROJECT.md scope |
| Back / previous-step navigation | Universal in guided-flow and checklist apps; users misclick or the table moves faster than expected | LOW | Already in scope |
| Jump-to-any-step / step overview | 40K Battle Flow's core UX device (tappable flowchart); prevents forced re-stepping through a whole phase to fix a missed step | MEDIUM | Requires the step-flow engine to support arbitrary jumps and correct re-entry into the loop — already in PROJECT.md scope, correctly flagged as non-trivial |
| Persistent "where am I" orientation (round + phase + step) | Directly answers the "forever loop" disorientation problem (Q2); no product studied gets away without this | MEDIUM | Needs a stable header/chrome that survives navigation, distinct from the step content itself |
| Round counter, distinct from step index | Users re-orient at round-granularity first, then phase, then step (see Q2) | LOW | Data model implication: round number must be first-class state, not derived only from step position |
| Progress persistence across reload/lock (browser storage) | Gloomhaven Helper's biggest failure mode (losing state) is the exact thing local persistence fixes | MEDIUM | Already in scope; validated by evidence, not just intuition |
| Large, short, high-contrast text | The single most common complaint across Gloomhaven Helper, Descent app reviews when absent | LOW-MEDIUM | Content-writing discipline as much as CSS |
| Big tap targets (44-48pt/dp minimum) | Standard HIG/Material guidance; hands busy with cards, imprecise touches | LOW | Standard responsive/CSS work |
| Landscape orientation, locked | Matches how a tablet sits at a table; unlocked orientation is a documented bug source (Descent app) | LOW | CSS/viewport meta + explicit lock, not "let it rotate" |
| Dark mode | Standard expectation for evening/dim-room play | LOW | Straightforward with a component library; low cost, real comfort win |
| Screen-stays-awake (wake lock) | "In the Kitchen" cooking-app pattern; without it the guide locks mid-round | LOW-MEDIUM | Use Screen Wake Lock API; must degrade gracefully if unsupported, and battery cost should be visible/expected, not silent |
| Offline availability (PWA + cache) | Wifi dropping mid-session is a real table risk; matches the explicit constraint in PROJECT.md | MEDIUM | Already in scope |
| Conditional branches shown as full text (no extra taps) | Directly answers the "too many taps" complaint pattern; avoids interaction cost when hands are full | LOW | Already in scope, and well-justified by the table-stakes evidence above |
| Clear scope boundary communicated to the user | Prevents the "app doesn't cover X" disappointment seen in Gloomhaven Helper reviews | LOW | A one-line "esto es una guía de flujo, no un buscador de reglas" framing goes a long way |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| TTS narration of the current step, scoped to a short essential line (not the full paragraph) | No MC tool does this at all; the closest analog (Dized) does it badly (robotic, repeats full text). Getting this right is a genuine differentiator, not a checkbox | MEDIUM | Requires curating a separate "spoken line" per step, distinct from the on-screen text, per the Q3 findings — a content-authoring decision, not just an engineering one |
| Cancel-and-don't-repeat speech on Back/jump navigation | Directly fixes Dized's most-cited voice complaint; nobody else in this space handles this well | LOW-MEDIUM | Cancel any in-flight utterance on any navigation event before starting a new one |
| Obvious, always-visible mute toggle | Table stakes for voice-enabled apps generally, but a real differentiator against Dized specifically, whose voice complaints suggest no easy off-switch was salient | LOW | Simple persistent UI toggle |
| Generic step-flow engine (setup-linear + round-loop) reusable across games | Nothing in the competitor landscape is built this way — every MC tool is single-purpose (counters OR cards OR log), and 40k tools are 40k-only | HIGH | This is the architectural bet the whole project depends on; see ARCHITECTURE.md research for detail |
| Difficulty/player-count-aware step text (e.g., "Fase II" in Experto) | No competitor personalizes step text this way; most either don't adapt at all or require manual toggles mid-play | MEDIUM | Needs the content schema to carry variants keyed by player count/difficulty |
| Content verified against the official Rules Reference before shipping | Directly targets the "app disagrees with the rulebook" failure mode that undermines trust in this whole category | MEDIUM (process, not code) | This is a content-QA process commitment, already reflected in PROJECT.md constraints |
| Ad-free, account-free, zero-friction open | Direct contrast with Dized's most complained-about anti-pattern (ads/subscription within minutes) | LOW | Free by construction (no backend, no monetization plan) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Automatic HP/threat/number calculation | Feels like "the app should do the math" | Introduces state that must track the physical dials; if it drifts (misclick, missed step) the app now actively contradicts the table, which is worse than not tracking at all — this is precisely the Gloomhaven Helper failure mode (stat resets, disconnects, distrust) | Show the formula as text; let the group do the arithmetic on the physical dial, same as PROJECT.md already decided |
| Live HP/threat/status counters per player | Every dedicated tracker in the MC ecosystem (jwtr/mcc, Marvel Champions Tracker) does exactly this, so it looks like "what these apps are for" | It's a different product category (state tracker) with different failure modes (desync, has to be babysat every card played) than a phase/round guide (glanced at once per phase). Merging them multiplies surface area for exactly the bugs users complain about most | Keep this app strictly a narrator of "what happens now"; a counter app is a legitimately separate tool a user could run alongside, not inside, this one |
| Full in-app rules lookup / keyword glossary | Common in the space (Dized bundles FAQ/search, 40K Battle Flow bundles per-phase rules notes, MC Card Codex focuses on rulings) and does reduce table disputes | Full scope (every keyword, every card interaction) is a large, ongoing content-maintenance burden and directly competes for attention with getting the core flow verified and correct first | Defer to v1.x; the flow already carries the rules text needed for its own steps as branches, which covers the "what do I do now" need — a standalone glossary is additive, not blocking |
| Web-based content editor for authoring games | Feels like it would let the user (or others) add games without a dev cycle | Adds a whole CMS/admin surface, auth, and validation layer to a project that explicitly has "no backend"; also a step-flow schema is exactly the kind of structured content that benefits from being reviewed like code (PR review against the official rulebook), not edited live | Author content as versioned JSON in the repo, reviewed like code — already the plan, and correctly so |
| Ads / subscriptions / monetization prompts | None requested by this project, but worth flagging explicitly because it's the top complaint in the closest multi-game competitor (Dized) | Directly breaks trust in exactly the "frictionless companion" promise this product is making | N/A — not a commercial product; irrelevant by design |
| Accounts / login / cloud sync | Feels necessary "to not lose progress across devices" | No backend, single-tablet, single-session use case; adds real infrastructure for a benefit (multi-device sync) nobody in this group needs | Browser-local persistence only, as already planned |
| Card database / deck builder inside the flow app | Nearly every existing MC fan tool (MC Companion, MC Card Codex, marvelcdb.com-linked tools) tries to be this, because it's the most obvious "what else could this app do" extension | Scope creep away from the actual observed problem (process mistakes during setup/round transitions, not card knowledge); duplicates tools that already exist and are decent at this (marvelcdb.com) | Explicitly not this app's job; if the group wants deck-building help, point them at marvelcdb.com |
| Multi-language support in v1 | Common in apps aiming at a broad public audience (BgVoice ships bilingual CN/EN) | This is a private tool for one Spanish-speaking group; i18n adds real translation/content-maintenance work with zero current demand | Spanish-only v1, structured so a language layer could be added later without a rewrite (already the plan) |
| Video-based tutorials (à la Dized) | Looks richer/more "produced" than plain text+voice | High production cost per game, and directly conflicts with the "glanceable, hands-busy" design goal — video demands sustained visual attention the format this project needs does not | Short text + short TTS line per step |

## Feature Dependencies

```
Setup-flow engine (linear steps)
    └──requires──> Step content schema (JSON, versioned)
                       └──requires──> Rules verified against official Rules Reference

Round-loop engine (repeating steps)
    └──requires──> Setup-flow engine (shares the same step-rendering component)
    └──requires──> Round counter as first-class state (not derived)

Jump-to-any-step navigation
    └──requires──> Round-loop engine (must know how to re-enter the loop correctly after a jump)
    └──enhances──> Persistent orientation header (round/phase/step)

Persistent orientation header (round/phase/step)
    └──requires──> Round counter + phase/step position as explicit, addressable state

Progress persistence (browser storage)
    └──requires──> Round-loop engine + step content schema (needs a stable step-ID scheme to resume into)

Difficulty/player-count-aware step text
    └──requires──> Step content schema supporting text variants keyed by setup answers
    └──enhances──> Mini-setup screen (player count + difficulty)

TTS narration (spoken line per step)
    └──requires──> Step content schema carrying a distinct "spoken line" field, separate from displayed text
    └──conflicts (if done naively)──> "read the whole paragraph" (breaks the "essential line only" table-stakes lesson)

Cancel-and-don't-repeat speech on navigation
    └──requires──> TTS narration
    └──conflicts──> Any speech-queueing approach (queueing is wrong for this use case; always cancel-then-speak)

Multi-game entry point ("¿A qué juego vas a jugar?")
    └──requires──> Generic step-flow engine (game-agnostic core)
    └──conflicts──> Exposing a game with unverified/incomplete content as if it were ready (Warhammer 40k must be visibly gated, not silently broken)
```

### Dependency Notes

- **Jump-to-any-step requires the round-loop engine to model re-entry correctly:** this is the single highest-risk dependency in the whole feature set — PROJECT.md already flags it, and the competitor evidence (40K Battle Flow's flowchart-as-navigation) confirms it's both expected and buildable, but it needs deliberate design (what does "Siguiente" do immediately after a manual jump?).
- **TTS's "essential line only" requirement is a content dependency, not just code:** each step needs both a full displayed text and a shorter spoken variant. Skipping this and just piping the displayed text into the TTS engine is exactly the mistake Dized made (robotic, repetitive full-paragraph reading).
- **Multi-game entry point conflicts with exposing half-finished content:** the picker must gate Warhammer 40k clearly rather than let it look playable, per the Dized cautionary lesson about inconsistent multi-game quality eroding trust in the whole app.

## MVP Definition

### Launch With (v1)

- [ ] Game picker (Marvel Champions playable, Warhammer 40k visibly gated) — establishes the multi-game shape without the Dized trap
- [ ] Mini-setup (player count + difficulty) — minimum state needed to personalize text
- [ ] Setup-flow guide (linear steps) — the first proof that the engine + content model works
- [ ] Round-loop guide (players phase → villain phase → end of round, looping) — the actual core value
- [ ] Next / Back / jump-to-step navigation with correct loop re-entry — table stakes, validated by 40K Battle Flow precedent
- [ ] Persistent round/phase/step orientation header — answers Q2, non-negotiable for a forever-looping flow
- [ ] Browser-persisted progress (survive reload/lock) — directly targets the #1 competitor failure mode (Gloomhaven Helper)
- [ ] TTS of a curated short spoken line per step, with mute toggle and cancel-on-navigate — the actual differentiator, done right from day one rather than bolted on later (retrofitting "don't re-read on back" is much harder after step data already conflates displayed and spoken text)
- [ ] Tablet-first layout: large text, big tap targets, locked landscape, dark mode, wake lock
- [ ] Offline PWA with cached content
- [ ] Marvel Champions content verified against the official Rules Reference v17 before considered done

### Add After Validation (v1.x)

- [ ] In-app rules/keyword quick-reference (states, deck exhaustion, card limits) — add once the core flow is trusted and stable; trigger: users still reach for the physical rulebook mid-game for things outside the turn structure
- [ ] Hero/scenario/modular-set selection in the mini-setup — trigger: player-count/difficulty alone proves insufficiently specific once real play reveals more variation needed
- [ ] Warhammer 40k content — trigger: engine validated end-to-end with Marvel Champions content

### Future Consideration (v2+)

- [ ] Higher-quality pre-generated audio — defer until browser TTS quality is a proven, felt limitation in real play, not a hypothetical one
- [ ] Multi-language — defer indefinitely unless a non-Spanish-speaking player actually joins the group
- [ ] Any form of stat/counter tracking — defer indefinitely; treat as a fundamentally separate tool if ever built, not a feature bolted onto this one, per the Anti-Features analysis

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Round-loop guide with correct phase sequencing | HIGH | HIGH | P1 |
| Next/Back/jump-to-step navigation | HIGH | MEDIUM | P1 |
| Persistent orientation header (round/phase/step) | HIGH | LOW-MEDIUM | P1 |
| Progress persistence (browser storage) | HIGH | MEDIUM | P1 |
| TTS with curated short lines + mute + cancel-on-nav | MEDIUM-HIGH | MEDIUM | P1 |
| Tablet UI baseline (text size, targets, landscape, dark mode, wake lock) | HIGH | LOW | P1 |
| Offline PWA | HIGH | MEDIUM | P1 |
| Content verified against official rulebook | HIGH | MEDIUM (process) | P1 |
| Difficulty/player-count-aware text | MEDIUM | MEDIUM | P1 |
| Multi-game picker with gating for unfinished games | MEDIUM | LOW | P1 |
| In-app rules/keyword quick reference | MEDIUM | MEDIUM-HIGH | P2 |
| Hero/scenario/modular-set selection | LOW-MEDIUM | MEDIUM | P2 |
| Warhammer 40k content | HIGH (long-term) | HIGH | P2 |
| Pre-generated high-quality audio | LOW | MEDIUM-HIGH | P3 |
| Multi-language | LOW (for this group) | MEDIUM | P3 |
| Live HP/threat counters | N/A (deliberately excluded) | N/A | Rejected |
| Content editor UI | N/A (deliberately excluded) | N/A | Rejected |

## Competitor Feature Analysis

| Product | Category | What It Does | Strengths | Weaknesses / Gap vs. This Project |
|---------|----------|---------------|-----------|-------------------------------------|
| **MC Companion** (danidevca, Google Play) | Card DB / deck builder | Card database, deck-building tools, gameplay guides, stat tracking | Comprehensive card reference | Not a round-flow guide; no TTS; not what a "what do I do now" user needs |
| **MC Card Codex — LCG Companion** (App Store) | Card DB / rulings | Card synergies, rule interactions, hero tactics reference | Focused rulings/strategy help | Reference tool, not a step-by-step narrator; player must already know the turn structure |
| **jwtr/mcc** (GitHub, marvel-champions-companion.netlify.app) | Stat/counter tracker | Explicitly "replace the need for using counters to modify hero and villain stats" | Solves the exact HP/threat-tracking problem this project deliberately excludes | This is precisely the anti-feature category; confirms the exclusion is a real design fork in the ecosystem, not an oversight |
| **Marvel Champions Tracker** / **Marvel Tracker** | Game log / "tactical HUD" | Tracks games played, stats, sharing with friends | Post-game stats | Not a mid-game guide at all |
| **Marvel Champions Digital** (kitze.io prototype) | Deck mgmt + campaign tracker | "Keeps deck management, campaign progress, and encounter setups in one focused experience," tablet-first touch UI, rules quick-search | Closest conceptual neighbor; tablet-first design intent matches this project | Not public; heavier scope (deckbuilder + campaign) than a lean flow guide; no evidence of TTS or of modeling the linear-setup + round-loop structure specifically |
| **Dized** (multi-game) | Interactive tutorial/rules companion | Video-based tutorials, rules/FAQ search, supports many games | Proves the "teach/guide during play" concept has market appeal | Reviews cite intrusive ads/subscription prompts, robotic and repetitive TTS, clunky multi-game navigation — a direct cautionary tale on several of this project's key risk areas (voice UX, multi-game picker, monetization) |
| **Gloomhaven Helper** (discontinued) / **X-haven Assistant** (successor) | Companion app for a specific game (state + monster AI) | Automates monster AI, tracks stats | Proves demand for a "the app runs the game state for us" companion | Text/buttons too small on phone (device-fit issue), and later versions suffered stat resets/disconnects that eroded trust — direct evidence for this project's persistence and tablet-only decisions |
| **Mansions of Madness app** | Official FFG companion (different genre: hybrid digital board game) | Drives the entire game state, narrative, tile reveals | High production value, positively reviewed (4.2/5) | Different problem shape — the app *is* the game engine, not a lightweight guide alongside a physical game with independent state |
| **Descent: Legends of the Dark app** | Official FFG companion (hybrid) | Setup, inventory/skill tracking, combat resolution, narrative | Well-integrated hybrid physical/digital experience when it works | Battery drain over long sessions; illegible on phone; accidental rotation/zoom resets — reinforces tablet-only, locked-orientation, wake-lock-aware design needs |
| **40K Battle Flow** (wargametoolbox.org) | Wargame turn-sequence tracker | Tappable, colour-coded flowchart of the whole round; guided turn tracker with round/phase navigation; per-phase rules reminders; CP/VP counters; attack resolver | Directly validates the "guided phase tracker with a jump-capable overview" shape this project wants, in the closest adjacent domain (40k) | No voice/TTS; bundles combat-math tools this project deliberately excludes; browser-only with no offline/PWA claim found |
| **Wargame Toolbox** | Wargame turn-sequence tracker | Same shape as 40K Battle Flow (tappable phase flowchart, guided tracker, stratagem reminders) | Second independent confirmation the "phase flowchart as navigator" pattern is proven in this adjacent domain | Same limitations as above |
| **BgVoice — Board Game Assistant** | Voice-guided social-deduction moderator | AI voice guidance, step-by-step instructions, adjustable speed/volume, bilingual (CN/EN), for Avalon/Werewolf/Secret Hitler/Codenames | Proves "app narrates what to do next, out loud" is a real, executed pattern for board games, not a hypothetical | Deprecated with too few reviews to assess quality; different genre (game master automation for social deduction, where the app *drives* hidden information) rather than a rules/flow guide for a game with public state like Marvel Champions |
| **One Night Ultimate Werewolf app** | Voice-guided moderator | Fully automates night-phase narration with a professional voice actor recording, eliminates the need for a human moderator | Long-lived, well-regarded, free — strong precedent that voice narration in board games is accepted and valued, not gimmicky | Pre-recorded/scripted narration for a fixed role set, not a general-purpose flexible TTS engine reading arbitrary step content — doesn't directly validate browser TTS quality, only validates the *concept* of voice narration |

## Sources

- 40K Battle Flow — https://40kflow.wargametoolbox.org/ (MEDIUM confidence, WebFetch-summarized)
- Wargame Toolbox — https://wargametoolbox.org/ (MEDIUM confidence)
- GrimSlate / Battle Tracker — https://grimslate.com/features/battle-mode , https://battle-tracker.com/ (MEDIUM confidence)
- Gloomhaven Helper — http://en.esotericsoftware.com/gloomhaven-helper ; discontinuation and X-haven Assistant context (MEDIUM confidence, WebSearch-derived review sentiment)
- Mansions of Madness app — App Store / Google Play listings (MEDIUM confidence)
- Descent: Legends of the Dark app — App Store listing + BGG thread "Companion App (PC) is terrible" (MEDIUM confidence, WebSearch-derived)
- Dized — Board Game Companion, App Store listing and aggregated reviews via appshunter.io (MEDIUM confidence, WebSearch-derived review sentiment)
- MC Companion (danidevca) — Google Play listing (LOW-MEDIUM confidence, limited page content retrieved)
- MC Card Codex / LCG Companion — App Store listing (LOW confidence, title/description only)
- jwtr/mcc — https://github.com/jwtr/mcc (HIGH confidence, README fetched directly)
- Marvel Champions Digital (kitze.io) — https://www.kitze.io/projects/marvel-champions-digital (MEDIUM confidence, prototype/not public)
- Marvel Champions Tracker — https://marvelchampionstracker.com/ (LOW confidence, page had minimal content)
- BgVoice — Board Game Assistant, App Store listing (MEDIUM confidence)
- One Night Ultimate Werewolf app — WebSearch summary of narrator/moderator functionality (MEDIUM confidence)
- Recipe/cooking hands-free apps ("In the Kitchen," Hestia, Cookie Voice Recipes, RecipeForLater) — WebSearch summary, used as cross-domain UX analog for wake-lock, large text, and Next/Previous voice navigation patterns (MEDIUM confidence)
- Apple Human Interface Guidelines and Material Design tap-target/typography conventions — general industry knowledge (HIGH confidence, not independently re-verified this session but well-established and consistent with all evidence gathered)
- BoardGameGeek thread "General consensus on companion App for board games" (thread 2067373) and "iOS and Android Marvel Champions app" (thread 3296681) — attempted direct fetch, blocked by BGG (403); only WebSearch snippets available, so not relied upon as a primary source in this report

---
*Feature research for: board game companion / guided-flow rules assistant (Marvel Champions, then Warhammer 40k)*
*Researched: 2026-08-28*
