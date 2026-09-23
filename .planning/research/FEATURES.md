# Feature Research — v1.8 (Character selection, live counters, game history)

**Domain:** Board-game companion / score-and-state tracker layer added on top of an existing step-by-step guided-flow app (Marvel Champions, co-op)
**Researched:** 2026-09-07
**Confidence:** MEDIUM-HIGH — touch/stepper UX and history-app patterns are well-documented and cross-verified across multiple product categories (Nielsen Norman Group, HIG/Material, BG Stats). Marvel Champions-specific rules claims below were checked directly against the local Rules Reference v1.7 PDF (`~/Downloads/mc_rulesreference_v17-compressed.pdf`), not just WebSearch — these are flagged HIGH confidence but **still require the project's own D-36 human sign-off** before being encoded as app behaviour, per project convention. Direct competitor apps for Marvel Champions specifically (MC Digital Tracker, MC Companion, M Champions Deck Builder, jwtr/mcc) were only reachable via search-result summaries, not live-tested — flagged MEDIUM.

---

## 0. Rules-accuracy findings that gate several feature decisions

These are not "features" but they determine what a correct feature MUST do. Verified directly against `mc_rulesreference_v17-compressed.pdf` (local, v1.7) on 2026-09-07.

| Claim | Finding | Confidence | Needs human verification (D-36)? |
|---|---|---|---|
| A single hero being defeated (reduced to 0 HP) ends the whole game | **FALSE.** RR, "Player Elimination": *"When a player is eliminated, the remaining players continue to play the game... considered to win or lose along with the rest of the group... If all players are eliminated, the game ends and the players lose."* Losing one hero is a mid-game event, not a game-over event, except in named scenarios with an explicit alternate loss condition. | HIGH (direct RR quote) | Yes — confirm no scenario-specific alternate loss condition applies to any of the 3 villains in scope (Rhino, Ultron, Kang) before the app assumes "one hero at 0 ≠ game over" universally. |
| The game has exactly two generic loss triggers | RR, "Winning the Game": win = final villain stage defeated; lose = final main-scheme stage completed ("the villain wins the game"), **plus** RR "Player Elimination": all players eliminated → lose, **plus** RR "Encounter Deck": a specific deck-empty infinite-acceleration edge case → lose. Scenario cards can add alternate win/loss conditions on top. | HIGH | Yes, same as above — this app captures only a `result` + optional `reason`, so getting the enum right matters. |
| Duplicate heroes (two players picking the same identity) are illegal | **NOT confirmed as a hard rule.** RR's uniqueness rule (Deck Building, "Unique") only restricts *card titles inside a single deck*; it says nothing that forbids two players from bringing the same hero identity. Community consensus (BoardGameGeek thread, MEDIUM confidence, not RR text) is that it's *physically/practically awkward* rather than illegal: you'd need a second physical hero pack, and any of that hero's non-identity "unique" signature ally cards can't be played by both copies at once, because unique cards share a title regardless of whose deck they're in. | MEDIUM (RR silent; practical constraint inferred) | Yes — this is exactly the kind of "confident but wrong" claim the project's own philosophy warns against. Do not hard-code a duplicate-hero block as an "official rule" in code comments or UI copy without explicit sign-off. |

**Implication for this milestone:** the counter band and the eventual result-capture flow must not assume "hero HP = 0 → game over" or "hero HP = 0 → that player is done, ignore them." Both are behaviours the app needs to explicitly decide, not RAW-mandated shortcuts.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Tap-a-slot → modal list → pick one (villain and hero pickers) | This is the exact pattern used by the one directly comparable tool found, "Marvel Champions Digital Tracker" (gameswithtony.com) — pick villain/heroes first, other lists filter from that. Modal-list-pick is also the near-universal mobile pattern for "select one of N named things" (contact pickers, emoji pickers). | LOW | Reuses the existing `WarningDetailModal.vue` interaction shape (tap → modal → dismiss) already proven in v1.7 for options/warnings — same affordance vocabulary, not a new UI language. |
| Filter box at top of a picker list with >12 items | Standard once a list exceeds roughly a screenful (~7-8 rows) on a tablet; both dedicated MC companion tools (M Champions Deck Builder, jwtr/mcc) and general deckbuilders (MarvelCDB) put a search/filter box above any list of this size. 18 heroes is exactly the size where "no filter" starts to feel broken. | LOW | Villain list (3 items) does NOT need a filter — don't add one just for consistency; 3 items fits on screen with zero search. |
| Filter matches on BOTH hero name and alter-ego name | Explicitly requested by the milestone, and the correct baseline: players think of "Ms. Marvel" and "Kamala Khan" interchangeably, and Spanish alter-ego names often carry accents ("Araña Escarlata"-style names are common in the ES card pool). A filter that only matches one of the two fields will feel broken to at least half the players who type the "wrong" name. | LOW-MEDIUM | Implementation: normalize both the query and both target fields with Unicode NFD + strip combining marks + lowercase before `.includes()`. This is a ~5-line utility, not a library — no need for a fuzzy-search dependency (Fuse.js etc.) at N=18. |
| Accent-insensitive matching | Spanish alter-ego/hero names contain accents (é, í, ó, ñ) that a typing-fast, table-side user will often omit or mistype. Every general-purpose picker/search UX guide treats this as baseline for non-English locales, not a stretch feature. | LOW | Same normalization step as above covers this for free — do not treat as a separate feature, it's the same one fix. |
| Optional editable player name, default "Jugador N" | Table stakes for any multi-player companion app — BG Stats, Board Games Tracker, and every co-op scorer default to numbered/generic labels and let you rename. Not renaming should never block play. | LOW | Free-text input, no validation needed beyond a max length to protect the fixed-width counter band layout. |
| Fixed, always-visible counter band with ▲▼ steppers, no keyboard | This *is* the differentiator vs. a plain rulebook, but the stepper interaction pattern itself is table stakes once you decide to have live counters at all — every board-game life/health tracker (Magic/D&D life counters, "M Champions Deck Builder"'s own counters tab) uses tap-to-increment arrows, never a keyboard, specifically because keyboards are slow and error-prone one-handed at arm's length. | MEDIUM | Depends on the picker (needs to know starting HP per hero+difficulty and villain HP per stage+player-count) and on a data source — already decided (MarvelCDB catalog) per PROJECT.md, not re-litigated here. |
| Minimum 44–48px touch targets on stepper buttons, ≥10px gap between adjacent targets | Apple HIG (44×44pt) and Material (48×48dp) agree; NN/g's stepper-specific guidance repeats the same floor. This is non-negotiable given the existing project constraint "tablet a un brazo de distancia, manos ocupadas con cartas." | LOW | Pure CSS/layout — no new dependency. Re-use whatever spacing scale v1.7 already established for the "Siguiente" button (already sized for exactly this environment). |
| Disable (don't hide) a stepper button at its bound | NN/g's stepper guideline explicitly: "when at min or max, disable the relevant button, don't hide it" — hiding causes mis-taps into the wrong control when a button reappears. | LOW | Applies once min/max bounds are decided (see open questions) — implementation is trivial once the bound itself is decided. |
| Step text shows the known numeric value in parentheses | Explicitly scoped by the milestone; matches the general UX pattern of "show computed/known values inline, don't make the user re-derive them" — same principle as showing "(14)" next to "ajustad el dial al valor indicado." | LOW-MEDIUM | **Engine dependency:** `StepDefinition`/`TextBlock` currently has no notion of a value slot — `engine/types.ts` has no field for it. This needs either (a) a new optional field like `valueRef` resolved against `SessionContext` at render time, or (b) a small hardcoded map of step-id → value-getter in the UI layer. Either way it's new engine/schema surface, not purely a content edit — flag for roadmap phase-1 of this milestone. |
| Win/loss result captured when the game ends | Every comparable score-tracking app (BG Stats, Board Games Tracker, Skorio) treats "who won" as the single non-negotiable field of a play log — a history with no result is not a history. | LOW | **Existing dependency:** the "Partida terminada" button already exists from v1.7 as an end-of-session action with no data-capture behind it; this milestone must decide whether pressing it now *always* opens a result-capture flow (see Open Questions). |
| Result includes villain, heroes, player names, date, difficulty, player count, duration, rounds | This is exactly the "minimal useful entry" that generalist board-game loggers converge on (game, players, result, date, duration, plus whatever the game's own scoring axis is — here, villain/hero stand in for "which variant/character was played," a pattern also used by asymmetric-game trackers). | LOW-MEDIUM | **Engine dependency:** duration and rounds-played are not currently tracked anywhere. `EngineSession.round` exists and can be read at end-of-game, but there is no session start timestamp today — needs to be added (e.g., stamped on first `Siguiente` press or on mini-setup completion; see Open Questions for *when* the clock should start). |
| History persists across reloads without needing network | Directly required by the project's own "sin conexión a mitad de partida" constraint, and matches every board-game logger's assumption (BG Stats, Board Games Tracker all work fully offline, sync is an add-on not a requirement). | LOW | Already the architecture decision in PROJECT.md (localStorage source of truth + Firestore backup) — not re-argued here, just confirmed as the expected baseline from comparable apps too. |
| Basic stats screen: win % per hero, win % per villain | This is the smallest slice of "stats people actually check" that WebSearch on BG Stats turned up repeatedly ("who wins more," "win percentage") — it's the floor, not a stretch goal. | LOW-MEDIUM | Pure aggregation over the history array — no new data source needed once history entries exist. |

### Differentiators (Competitive Advantage — Not Required, But Valuable)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| Loss reason captured (scheme completed vs. all heroes eliminated) | Marvel Champions has two genuinely distinct RAW loss conditions (confirmed HIGH confidence above); no companion app or generic board-game logger found in this research distinctly tracks *why* a co-op loss happened. For a 4-friend group, "we lost to the scheme again" vs. "we got wiped" is exactly the kind of detail that makes a history feel like *their* history instead of a generic W/L tally. Not requested explicitly in the current milestone scope — worth flagging as a near-zero-cost add while the result-capture UI is being built anyway. | LOW | Single enum field (`won \| lost-scheme \| lost-heroes \| abandoned`) captured at the same moment as win/loss — no engine dependency beyond what result-capture already needs. |
| Abandoned/unfinished game as a distinct history entry type | Groups occasionally stop a session without reaching an official win/loss (someone has to leave, it's late). Generic score-tracking apps studied don't clearly solve this (BG Stats' handling wasn't confirmed in this research). For a hobby group playing "occasionally," an honest "no encajó, lo dejamos a medias" entry is more useful than forcing a false win/loss, or than silently dropping the session from history. | LOW | Requires deciding what "Partida terminada" does when neither the villain nor the scheme has actually resolved (see Open Questions) — this is a UI/flow decision layered on top of the enum above, not new engine work. |
| Recently-used ordering in the hero/villain picker | With repeat play by the same 4 friends, "your last hero" or "heroes not yet played" surfacing near the top saves a filter-and-scroll each session. Common pattern in "recent contacts"-style pickers. | LOW-MEDIUM | At only 18 heroes and infrequent (not daily) play, the value is modest — treat as a "if there's time" polish item, not a milestone-blocking feature. |
| Soft warning (not hard block) on duplicate hero pick | Given the rules finding above is MEDIUM confidence and not a hard RAW prohibition, a dismissible "⚠ Dos jugadores llevan el mismo héroe — algunas cartas Único pueden chocar" nudge respects the existing project pattern (D-32: warnings are informative, not blocking) without asserting a rule that isn't actually written down. | LOW | Reuses the existing warning/detail modal pattern from v1.7 — same component, same tone system (`warning`/`neutral`) already built. |
| Per-player win rate / streaks / per-difficulty breakdown | BG Stats power users do look at head-to-head and per-player win rate — but that's for competitive games with many players in a shared pool; for a fixed group of ~4 friends always co-oping together, per-player win rate is nearly identical to the group's overall win rate (everyone wins or loses together every game) and adds little signal. Worth deferring past v1.8, revisit only if a specific friend group question comes up ("does X favor certain heroes and does that correlate with wins"). | MEDIUM | Not in current milestone scope (PROJECT.md only commits to win % per hero/villain) — listed here so the roadmap doesn't accidentally scope-creep it in. |

### Anti-Features (Would Be a Mistake Here)

| Feature | Why It Looks Appealing | Why It's Wrong For This App | Do Instead |
|---|---|---|---|
| Full card/deck database + deckbuilder (what jwtr/mcc, M Champions Deck Builder, MarvelCDB itself already are) | "Since we're touching hero/villain data anyway, why not let people build decks too?" | This is a different, much bigger product (card text, images/legal exposure per this project's own copyright constraint, deck import/export, FAQ/errata tracking) that already exists well-built elsewhere. Building it here trades a focused "run the game" tool for a mediocre clone of MarvelCDB. | Link out to MarvelCDB if deck-building is ever wanted; this app only ever stores *names and numbers* per its own data-sourcing decision. |
| Automatic threat/scheme/status-card tracking (full game-state simulation) | "We already have HP counters, why not track everything?" | Explicitly and repeatedly ruled out in PROJECT.md's "Out of Scope" (threat, status-card counters excluded by name) precisely because it would require re-implementing large parts of the rules engine and would desync from the physical table the instant one card ability breaks the assumption — the exact risk the original "guía pura, sin calcular cifras" decision was designed to avoid, and it's only partially reverted for HP, not threat/state. | Keep the counter band to exactly Vida Villano + HP1-4, as scoped. Anything else stays on the physical dials/tokens. |
| User accounts / login / multi-device real-time sync of a live game | "Firestore is already in the stack, why not let a second tablet see the same live counters?" | Contradicts the explicit "sin backend / sin cuentas" constraint that v1.8 only partially and deliberately relaxes (Firestore is a *durable backup of history after the fact*, not a live sync layer for in-progress state). A live multi-device sync also silently reintroduces the offline-reliability risk the whole PWA architecture exists to avoid — if the wifi drops mid-round, a "shared live state" design breaks exactly when it matters most. | Firestore write happens once, at the end of a finished/abandoned game, as a backup — never as the source of truth during play. |
| Gamification: badges, achievements, ELO/rating, leaderboards | "Stats screens elsewhere have this, wouldn't it be fun?" | This is BG Stats' own "vanity metric" territory (H-index, fives/dimes/centuries) built for a large, comparison-driven community of strangers on BGG. A private group of 4 friends doesn't need a rating system to know who's "better" — it can read as try-hard for a hobby app whose stated Core Value is finishing the actual game, not scoring the group. | Two plain percentages (win % per hero, win % per villain) as scoped — nothing more, unless the group explicitly asks for it later. |
| Voice-picker UI surfaced for TTS while building the new picker UI | "We're building pickers/modals anyway, TTS voice choice could reuse the same pattern." | Already an explicit anti-feature from the v1.7 stack decision (`getVoices()` is unreliable across Safari/Android) — unrelated to this milestone but worth re-flagging since new modal/picker infrastructure is being built right now and it would be easy to bolt one on "since the plumbing's there." | Leave TTS voice selection untouched; it's out of scope for v1.8 entirely. |
| Numeric keyboard / free-text entry as a counter fallback "for power users" | "What if someone wants to jump straight to 7 instead of tapping six times?" | Explicitly excluded by the milestone spec itself ("sin teclado") — a keyboard reintroduces exactly the fumbling-at-arm's-length failure mode the ▲▼ stepper exists to prevent, and MC's HP swings are rarely large enough (single-digit damage per hit in most cases) to make batch entry worth the added surface. | Tapping (with press-and-hold repeat, see below) is sufficient; if a group truly needs a big jump, multiple quick taps or a long-press-to-repeat get there fast enough. |
| Custom/freeform hero or villain text entry as an escape hatch for unlisted content | "What if a new expansion hero isn't in the catalog yet?" | Silently breaks the entire premise of prefilled HP values and parenthetical numbers — a freeform entry has no starting HP to prefill, so half the milestone's value (no math, no guessing) evaporates the moment it's used. | When new content ships, add it to the JSON catalog like any other content update (matches the existing "content is a JSON file the developer edits" project convention) — no runtime escape hatch. |

---

## a) Board-game companion / helper apps — what they get right and what people complain about

- **"Marvel Champions Digital Tracker"** (gameswithtony.com, found via WebSearch, MEDIUM confidence — not independently used): select module/aspect/heroes/villain first, and *all other lists auto-filter from that selection*. This validates a "pick coarse thing first, narrow the rest" flow, but this milestone's scope is simpler (villain + one hero per slot, no aspects/modules), so the auto-filter behaviour isn't directly needed here — noted for later if module/aspect selection is ever added (candidate milestone, per PROJECT.md's "Ampliar configuración avanzada").
- **"M Champions Deck Builder"** (App Store listing, MEDIUM confidence): ships a dedicated "counters tab with a health tracker for villain tracking" as a separate concern from deck-building — validates that a lightweight, always-visible HP counter is a recognized, standalone feature in this exact game's companion-app ecosystem, not a novel idea this project is inventing from scratch.
- **BG Stats / Board Game Stats** (general, HIGH confidence — official site + store listings): the pattern that recurs across every review/description found is "log fast, look at stats rarely but specifically" — the specific stats people mention wanting are *who wins more*, *win percentage*, *how often we play this*, *how long it takes*. Nobody in the sources surfaced quoted wanting deep statistical/rating features; those exist in the app (H-index, "fives/dimes/centuries") but read as bonus trivia, not the reason people open the app.
- **What users complain about, generally** (carried over from this project's own v1.7 FEATURES research, still applicable): small touch targets on the wrong device class, losing state/re-syncing, and apps that quietly don't cover what a group actually needed (scope mismatch). None of the newly-searched sources contradicted this; it reinforces the existing "big buttons, no data loss, be explicit about scope" baseline this app already follows.

## b) Counter/stepper UX at arm's length

- Touch targets ≥44×44pt/48×48dp, ≥10px separation (Apple HIG / Material / NN/g, HIGH confidence, all three converge on the same number).
- Press-and-hold-to-repeat is the documented expected behaviour for any +/- stepper doing more than trivial single-digit ranges (NN/g, HIGH confidence). MC's typical HP pools run into the 10s (heroes) to 40s+ (villain stages across a game) — repeat-on-hold materially reduces tap count for villain HP especially.
- Buttons must disable, not hide, at a bound (NN/g, HIGH confidence) — prevents mis-taps when a control reappears mid-sequence.
- "Undo of a mis-tap" in this domain is inherently solved by the stepper itself being reversible one tap at a time — no dedicated undo button was found as a pattern in any life/HP counter reviewed; the open question is only about the *bound* behaviour (see below), not about needing extra undo affordance.
- **What happens at 0 is explicitly NOT solved by any generic pattern** — this is domain-specific to Marvel Champions' co-op structure and must be decided by this project, not copied from a generic tracker. See Section 0 above (rules finding) and the Open Questions list below.

## c) Pickers with a filter

- Filter-over-a-list-of-N is standard past ~12 items; accent/diacritic-insensitive matching is standard for any non-English-locale name search (both LOW-complexity, well-understood patterns, HIGH confidence on the UX convention, MEDIUM on any specific competitor's exact implementation since none were directly testable in this research pass).
- Matching both a "display name" and an "alternate name" field simultaneously (hero name + alter-ego) is a straightforward two-field `OR` filter — no special library needed at N=18.
- Duplicate-hero enforcement: see Section 0 — this is a rules-accuracy question, not a UX pattern question, and the finding here is that a hard block would be asserting a stricter rule than what's actually written.

## d) Game-history logging — the minimal useful entry

- The milestone's own listed field set (result, villano, héroes, nombres, fecha, dificultad, nº jugadores, duración, rondas) already matches what generalist board-game loggers converge on as "the minimum that makes a history worth having" — nothing in this research suggests a field is missing *except* loss reason (see Differentiators) and an explicit abandoned/unfinished marker (see Differentiators and Open Questions).
- Editing/deleting a past entry: every general-purpose logger reviewed treats this as assumed baseline CRUD (you can always fix a mis-logged play) — for a from-scratch localStorage array this is genuinely LOW complexity (it's array splice/update), so there's no real reason to ship v1.8 without it once entries exist at all. Treat as table stakes, not differentiator, despite not being explicitly named in the milestone bullet list.
- Per-player and streak/rating breakdowns read as the "vanity metric" end of the spectrum for a fixed 4-person co-op group specifically (see Anti-Features/Differentiators reasoning above) — don't build these now.

## e) Result capture for a co-op game

- Confirmed HIGH confidence (Section 0): the group wins or loses together, and there are two distinct RAW loss triggers (scheme completed vs. all heroes eliminated) plus scenario-specific alternates. Capturing *which* loss happened is cheap (one enum) and adds real value distinct from a generic win/loss — recommended as a Differentiator to build alongside result capture, not deferred, since the marginal cost once you're already building the "how did it end" UI is close to zero.
- Abandoned/unfinished sessions are a real, expected occurrence for an "occasionally, with friends" group and are not obviously handled by any generic tracker studied — recommend the app explicitly support a third outcome ("no terminada") rather than forcing every "Partida terminada" press into a Win/Loss binary.

## f) Anti-features — blunt version

See the Anti-Features table above. In one line each: don't build a deckbuilder, don't simulate the whole game state, don't add accounts or live multi-device sync, don't gamify with ratings/badges, don't add a voice picker while you're at it, don't add a keyboard fallback to the counters, and don't add a freeform "type in a hero name" escape hatch for content that isn't in the catalog. Every one of these is solving a problem this specific 4-friend hobby app does not have, at the cost of exactly the scope discipline that got v1.7 shipped in 5 phases.

---

## Feature Dependencies

```
Villain/hero picker (setup.heroes.01)
    └──requires──> Hero/villain data catalog (18 heroes + 3 villains: name, alter-ego, HP, hand size, villain HP per stage per player-count)
                       [already decided: MarvelCDB-sourced, per PROJECT.md — not re-researched here]

Fixed counter band (Vida Villano + HP1-4)
    └──requires──> Villain/hero picker having already run (needs the chosen identities + player count to prefill starting values)
    └──requires──> Engine/schema extension: SessionContext needs to carry villain id, per-slot hero id + player name
                       (SessionContext already has an open `[key: string]: unknown` index — extensible without a schema-breaking change)

Parenthetical numeric value in step text (e.g. "…(14)")
    └──requires──> Fixed counter band's data (same starting-value lookup)
    └──requires──> NEW engine/schema surface: StepDefinition/TextBlock has no value-slot concept today — needs either
                    a `valueRef`-style field resolved against SessionContext, or a hardcoded step-id → getter map in the UI layer

Result capture (win/loss/abandoned + loss reason)
    └──requires──> Fixed counter band existing (duration/rounds/final HP state are meaningless without it)
    └──requires──> Engine extension: session start timestamp (does not exist today — EngineSession has `round` but no `startedAt`)
    └──enhances──> "Partida terminada" button (already exists from v1.7, currently has no data-capture behaviour behind it)

Persistent history (localStorage + Firestore backup)
    └──requires──> Result capture (a history is a list of captured results)

Stats screen (win % per hero, per villain)
    └──requires──> Persistent history (pure aggregation, no new data source)

Loss reason capture ──enhances──> Result capture (same UI moment, near-zero marginal cost)
Abandoned/unfinished outcome ──enhances──> Result capture (needs a decision on what "Partida terminada" does mid-game)
Duplicate-hero soft warning ──enhances──> Villain/hero picker (reuses existing warning/modal component from v1.7)
```

### Dependency Notes

- **Counter band requires picker to run first:** the app cannot prefill a starting HP value before it knows which villain/hero/player-count combination was chosen — this fixes the ordering (picker must ship in the same phase as, or before, the counter band).
- **Parenthetical values require a genuinely new engine concept:** this is the one piece of this milestone that isn't "just UI on top of existing data" — `engine/types.ts` today has zero notion of a value binding inside step text. This should be called out to the roadmapper as needing its own design decision (content-driven vs. UI-layer-hardcoded), not folded silently into "add the picker."
- **Result capture requires a session-start timestamp that doesn't exist yet:** `EngineSession` has `round` and `cursor` but no `startedAt` — duration cannot be computed without adding this, and *when* the clock starts is itself an open question (see below).
- **Firestore is a one-way, end-of-game backup, not a live-state dependency:** nothing about the counter band or the picker needs Firestore; only the final history write does. This keeps the "offline mid-game" constraint intact by construction, provided the implementation is disciplined about not touching Firestore before the game ends.

---

## MVP Definition

### Launch With (v1.8)

- [ ] Villain picker (3 items, no filter needed) + hero picker (18 items, filter by name+alter-ego, accent-insensitive) — essential, this is the milestone's stated headline feature
- [ ] Optional player name per slot, default "Jugador N" — essential, near-zero cost, expected by every comparable app
- [ ] Fixed counter band, ▲▼ steppers, prefilled starting values, 44-48px targets — essential, the second headline feature
- [ ] A decided (not left implicit) behaviour for what happens at 0 HP, for both heroes and villain — essential; shipping without deciding this is shipping a guess
- [ ] Parenthetical numeric values on the steps that reference them — essential, explicitly scoped, but needs its own small design task for the engine/schema change it requires
- [ ] Result capture: win / loss (+ recommended: loss reason, + recommended: abandoned) with the full field set from the milestone bullet — essential
- [ ] Persistent history in localStorage, Firestore backup — essential per milestone scope
- [ ] Basic stats: win % per hero, win % per villain — essential per milestone scope
- [ ] Edit/delete a mis-logged history entry — treat as essential despite not being named explicitly; it's cheap and the alternative (a wrong entry stuck forever) is a worse UX than the cost of building it

### Add After Validation (v1.8.x / soon after)

- [ ] Soft (non-blocking) warning on duplicate hero selection — add once the picker exists and the rules question (Section 0) gets a human decision
- [ ] Recently-used ordering in the hero picker — add if the group's repeat-play pattern makes re-selecting the same heroes each time noticeably annoying
- [ ] Press-and-hold repeat on the steppers — nice ergonomic win, safe to add slightly after first ship once real villain-HP tap counts are observed at the table

### Future Consideration (v2+)

- [ ] Per-player win rate / streaks / per-difficulty breakdown — defer until the group specifically asks a question the two current percentages can't answer
- [ ] Module/aspect selection with auto-filtering lists (à la MC Digital Tracker) — defer to the "Ampliar configuración avanzada" candidate milestone already listed in PROJECT.md
- [ ] Any BGG-style import/export or account system — not aligned with this app's private, offline, no-backend-account posture; revisit only if the constraint itself changes

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Villain/hero picker + filter | HIGH | MEDIUM | P1 |
| Fixed HP counter band | HIGH | MEDIUM | P1 |
| Decide-and-implement 0-HP behaviour | HIGH (correctness risk if skipped) | LOW (once decided) | P1 |
| Parenthetical numeric values in step text | MEDIUM | MEDIUM (new engine surface) | P1 |
| Win/loss result capture + history | HIGH | MEDIUM | P1 |
| Firestore backup | MEDIUM (durability, not gameplay) | LOW-MEDIUM | P1 |
| Stats screen (2 percentages) | MEDIUM | LOW | P1 |
| Edit/delete history entry | MEDIUM | LOW | P1 |
| Loss reason capture | MEDIUM-HIGH (genuine differentiator, near-zero cost) | LOW | P1 (recommend pulling into launch scope) |
| Abandoned/unfinished outcome | MEDIUM | LOW | P2 |
| Duplicate-hero soft warning | LOW-MEDIUM | LOW | P2 |
| Recently-used picker ordering | LOW | LOW-MEDIUM | P3 |
| Press-and-hold stepper repeat | LOW-MEDIUM | LOW-MEDIUM | P3 |
| Per-player/streak/rating stats | LOW (for this group size) | MEDIUM-HIGH | P3 (do not build without explicit ask) |

**Priority key:** P1 must-have for this milestone; P2 should-have, add when possible within the milestone or immediately after; P3 explicitly deferred.

---

## Competitor Feature Analysis

| Feature | MC Digital Tracker (gameswithtony.com) | M Champions Deck Builder / jwtr/mcc | BG Stats | Our Approach |
|---|---|---|---|---|
| Hero/villain selection | Pick first, auto-filters everything else | Not confirmed as a selection flow (deck-builder-first tools) | N/A (generic games, not MC-specific) | Tap-slot → modal → filtered list, scoped to just villain + 1 hero/player (no module/aspect yet) |
| HP tracking | Not confirmed | Dedicated counters tab with health tracker (confirmed by App Store listing) | Generic score entry, not HP-specific | Fixed always-visible band, ▲▼ only, prefilled from data |
| History/stats | Not confirmed | Not confirmed as a feature of these tools | Full-featured: win rate, H-index, per-player, trends | Deliberately minimal: win/loss (+reason), win % per hero/villain only |
| Offline-first | Not confirmed | Not confirmed | Confirmed offline-capable, cloud sync optional | Already the app's core architecture (localStorage source of truth, Firestore backup) |

---

## Open Questions — Concrete Behaviour the App Must Decide

*(Collected in one place per the research brief — these are not answered by "how comparable tools do it" because either no comparable tool solves this exact co-op-specific problem, or the answer is a genuine product decision for this group, not a UX convention.)*

**Counters (villain/hero HP):**
1. When a hero's HP counter reaches 0, does the app show anything different (grey out the row, a small "Eliminado/a" label) or stay visually identical to any other value? Rules fact (HIGH confidence): the game does NOT end, so this must not trigger a game-over state.
2. Can a hero's HP counter go below 0? (Most stepper patterns clamp at a floor — recommend clamping at 0, but this is undecided.)
3. Can a hero's HP counter go above its starting/max value (e.g. if a card ability "heals" past what the app prefilled)? Does the ▲ button cap at the starting value, or is it uncapped like a free-scrolling dial?
4. Does villain HP reaching 0 do anything beyond stopping there (e.g. surface a "¿Termina la partida?" prompt, or stay purely passive and let the group press "Partida terminada" themselves)?
5. Can villain HP go negative? (Same clamping question as #2, mirrored for the villain.)
6. Is press-and-hold-to-repeat in scope for v1.8, or is single-tap-only acceptable for launch given MC's typical per-hit damage values?

**Pickers (villain/hero selection):**
7. Is picking the same hero for two player slots blocked, warned-and-allowed, or fully unrestricted? (Section 0: not a hard RAW rule — needs a human product decision, not a rules citation.)
8. What is the default sort order of the 18-hero list (alphabetical vs. some curated order)?
9. Is a player name remembered/suggested across sessions (so re-entering "Ana" every game isn't needed), or does every new game start from "Jugador N" every time?
10. Can the group proceed past `setup.heroes.01` (press "Siguiente") with some slots unpicked, or is a full villain + per-player hero selection required before continuing? (Ties into the app's existing philosophy of never hard-blocking the flow.)

**History and result capture:**
11. Does pressing "Partida terminada" always open a mandatory Win/Loss (/Abandoned) prompt, or can the group dismiss it and log nothing? (Existing v1.7 button currently has no data behind it at all — this changes its behaviour.)
12. Is loss reason (scheme completed vs. all heroes eliminated vs. other/scenario-specific) captured as a required field, an optional field, or not captured at all in v1.8 launch scope?
13. Is there a distinct "abandoned/unfinished" outcome, and if so, how is it triggered — a third button choice, or a follow-up question after "Partida terminada" ("¿Terminasteis la partida?")?
14. When does the "duration" clock start — first "Siguiente" press of the whole flow, the moment `setup.heroes.01` selections are completed, or something else? And does it pause if the tab/device sleeps mid-game (wake lock loss), or just measure wall-clock start-to-end?
15. Is "rondas jugadas" the engine's `round` counter value at the moment of ending (which may be a round in progress, not a completed one) — and if the game ends mid-round, is that reported as N or N-1 rounds played?
16. Is editing or deleting a past history entry included in v1.8, given it's cheap to build and the alternative (a permanently wrong entry) is worse UX than most other things in scope?
17. Is per-player win rate explicitly out of scope for v1.8 (current milestone text only commits to per-hero/per-villain), or is it silently expected to come along "for free" once the data model has player names in it? Worth confirming explicitly so the roadmap doesn't under- or over-build the stats screen.

---

## Sources

- Local Rules Reference v1.7 PDF (`~/Downloads/mc_rulesreference_v17-compressed.pdf`), consulted directly via `pdftotext -layout` and grep — HIGH confidence source for all rules claims in Section 0 (Player Elimination, Winning the Game, Villain Defeat, Unique/deck-building entries).
- BoardGameGeek thread "Duplicate character question" (WebSearch summary) — MEDIUM confidence, community discussion not official errata, used only to characterize the *practical* (not rules-mandated) friction of duplicate hero picks.
- `.planning/research/v1.7/FEATURES.md` (this project's own prior research) — reused for the "what users complain about generally" section and to avoid re-deriving already-established tablet/TTS baselines.
- `content/marvel-champions.json`, `engine/types.ts` (this repo) — read directly to determine what the engine currently models (`SessionContext`, `EngineSession.round`, `TextBlock`/`StepDefinition` shape) and to locate `setup.heroes.01`, `setup.heroes.03`, `setup.escenario.02`.
- WebSearch: "BG Stats board game score tracking app features" and "BG Stats win rate statistics" — MEDIUM confidence, aggregated app-store/marketing copy, used for "what stats people actually check" and general history-app field conventions.
- WebSearch: "Marvel Champions app companion hero villain picker health tracker" — MEDIUM confidence (search-result summaries of App Store/GitHub listings for MC Digital Tracker, M Champions Deck Builder, jwtr/mcc; none independently installed/tested).
- WebSearch/NN-G: "Design Guidelines for Input Steppers" (nngroup.com), Apple HIG and Material touch-target guidance (aggregated via WebSearch) — HIGH confidence, converging figures across independent sources (44×44pt / 48×48dp / ≥10px spacing / disable-not-hide at bounds / press-and-hold repeat expected).
- WebFetch attempt on marvelcdb.com search page — inconclusive (page content didn't expose search-implementation details); not relied on for any claim above.

---
*Feature research for: TableGameAssistant v1.8 (Marvel Champions companion features — character selection, live counters, game history)*
*Researched: 2026-09-07*
