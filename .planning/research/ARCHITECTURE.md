# Architecture Research — v1.8 Integration

**Domain:** Subsequent-milestone integration into an existing, shipped Nuxt 4 SSG codebase (TableGameAssistant)
**Researched:** 2026-09-07
**Confidence:** HIGH for everything grounded in code read directly (cited `path:line`); MEDIUM for Firestore SDK behavior (verified against training knowledge + official-pattern reasoning, not re-checked against 2026 Firebase JS SDK release notes); explicitly flagged where a design decision is left open for the phase planner.

This file answers the seven questions in the research brief directly, in order, with real file paths and line numbers. It does not restate the generic template sections that don't apply to a codebase-grounded integration doc (e.g. "Scaling Considerations 100k+ users" — not relevant to a friend-group hobby app) — see `## Template Cross-Reference` at the bottom for where template sections map.

---

## a) Where does the new state live?

**Recommendation: inside `EngineSession.context` (i.e. `SessionContext`, `engine/types.ts:95-99`), NOT a parallel store.**

### Why this works today, structurally, with almost no new code

- `SessionContext` already declares `[key: string]: unknown` (`engine/types.ts:98`) alongside its two required fields (`playerCount`, `difficulty`). Adding `selection`, `counters`, `startedAt` as new optional fields is additive and backward-compatible — no existing reader of `SessionContext` breaks.
- `engine/persistence.ts::toPersistedPosition` persists `context` **wholesale** (`persistence.ts:34`, `context: session.context`) — any new field added to `SessionContext` is persisted automatically, with zero new serialization code.
- `resume()` (`persistence.ts:67-91`) restores `context` wholesale on the happy path (`persistence.ts:88`, `context: persisted.context`) **and** on the `content-changed` fallback (`persistence.ts:62-65`, `contentChangedFallback` returns `{ ...fresh, cursor: 0, round: 1, context }` where `context` is the *persisted* one if it passes the minimal `isValidContext` check). This is exactly the resume behavior the milestone wants: don't force the group to re-pick heroes just because a content-text typo bumped `contentVersion`.
- `app/pages/[game]/index.vue:126-133` already has a single `watchDebounced(session, (v) => save(v), { debounce: 300 })` that fires on **any** reassignment of `session.value`. Since `EngineSession`/`useGameSession.ts` already follows a strict "never mutate in place, always reassign a new object" discipline (`useGameSession.ts:6-7` comment; `next`/`prev`/`jumpTo` all reassign `session.value`), a new counter-adjust or selection-set action that does `session.value = { ...session.value, context: { ...session.value.context, ... } }` gets autosave, debounce, and the existing `pagehide` flush (`index.vue:147-149`) **for free**. No new persistence plumbing is needed for selection/counters at all — only a type extension plus new mutator functions in `useGameSession.ts`.
- `usePersistedSession().clear(gameId)` (`usePersistedSession.ts:127-132`) removes the entire `tga:progress:<gameId>` key — selection and counters disappear automatically on "Partida terminada" and on "Empezar partida nueva" (discard), exactly as the milestone requires ("estado de la partida" is scoped 1:1 to the game in progress).

### Why NOT a parallel store

The codebase already has a precedent for a *second*, independent localStorage key inside the same composable: `VOICE_KEY` (`usePersistedSession.ts:39`, D-46). But that pattern exists for the **opposite** reason — a voice preference must **survive** `clear(gameId)` because it's a device-level preference, not part of any one game. Selection/counters are the reverse: they must be wiped by "Partida terminada." Building a second store for them would mean hand-rolling the exact save/clear/resume orchestration that `context` already gets from the engine for free, and would introduce a new failure mode: session and a parallel selection-store could desync (e.g. `resume()`'s `content-changed` fallback resets `cursor`/`round` but a parallel store wouldn't know to do the analogous thing).

### Recommended shape (extends, does not replace, `SessionContext`)

```typescript
// engine/types.ts — additive fields only
export interface HeroSelection {
  playerName: string          // defaults to "Jugador N" in the UI layer, not persisted as null
  heroId: string | null       // catalogue id (content/marvel-characters.json), null = not yet chosen
}

export interface SessionContext {
  playerCount: number
  difficulty: Difficulty
  selection?: {
    villainId: string | null
    heroes: HeroSelection[]   // length === playerCount
  }
  counters?: {
    villainHealth: number | null
    heroHealth: number[]      // length === playerCount, index-aligned with selection.heroes
  }
  startedAt?: string           // ISO timestamp, set once in useGameSession.start(), never on resume
  [key: string]: unknown
}
```

### `contentVersion` / `formatVersion` resume-gate implications — read this carefully

This is the sharpest correctness risk in part (a), and it is **not** solved by bumping `contentVersion`:

1. `PersistedPosition.formatVersion` (`persistence.ts:10`, literal `1`) describes the **outer envelope** shape (`gameId`, `contentVersion`, `runtimeId`, `round`, `context`, `updatedAt`) — it does not, and should not, change just because `context`'s *internal* shape grows a field. **Do not bump `formatVersion` for this milestone.**
2. `contentVersion` gates whether the *step sequence* (`GameDefinition.sections`) is trusted to still match what was persisted. Tagging existing steps with a new `showsValue` field (part c) or adding new UI around `setup.heroes.01` does **not by itself require a `contentVersion` bump**, because it doesn't change `text`/`speech`/step structure that `resume()`'s `runtimeId` lookup depends on. It's still reasonable to bump `contentVersion` as a matter of hygiene when shipping v1.8 (forces a clean break from any lingering v1.7 in-progress session on a tester's device), but understand exactly what it does and does not fix — see point 3.
3. **The real gap:** neither the `resumed` branch (`persistence.ts:87-90`) nor the `content-changed` fallback (`persistence.ts:62-65`) validates that `persisted.context` contains the *new* fields (`selection`, `counters`, `startedAt`). `isValidContext` (`persistence.ts:45-49`) only checks `playerCount: number` and `difficulty: string`. A session saved by the v1.7 build (or an early v1.8 session saved before the player made a selection) will resume successfully with `context.selection === undefined` and `context.counters === undefined` — **regardless of whether `contentVersion` was bumped**, because both resume paths copy `persisted.context` through verbatim. **This means the app layer (not the engine) must treat "no selection yet" as a normal, expected state to render defensively** (e.g. `CounterBand` shows placeholders/dashes, `displayText` falls back to plain text with no parenthetical, the hero/villain picker opens pre-populated with nothing chosen) rather than assuming a resumed session always has fresh-v1.8 shape. This is a genuine, previously-nonexistent invariant this milestone introduces and it should be an explicit test case in whichever phase builds selection/counters.
4. No change to `isPersistedPosition` (`usePersistedSession.ts:60-69`) is required — it validates only the four/five envelope keys and that `context` is an object, which remains true regardless of what's inside `context`.

---

## b) How does game history relate to session state?

**Boundary:** `EngineSession`/`context` is *current-game-scoped* and dies with "Partida terminada." History is a *separate, additive, append-only* log that must survive every `clear(gameId)` call — same survival requirement as `VOICE_KEY`, different lifecycle from `context`.

### Where "Partida terminada" lives today

Confirmed by grep: the button lives in `app/components/IndexOverlay.vue:139-152` (emits `end-game`), handled in `app/pages/[game]/index.vue`:

- `onEndGameRequest` (`index.vue:335-337`) — opens confirmation, does not close the index overlay (D-U3).
- `onEndGameConfirm` (`index.vue:343-366`) — **the exact hook point**. Current order (D-U4, "exact order, not cosmetic"):
  1. `awaitingEndConfirm.value = false`
  2. `isIndexOpen.value = false`
  3. `silence()` — stop any in-flight speech
  4. `session.value = null` (before `clear`, to prevent a pending debounced save from resurrecting the key)
  5. `clear(gameId)`
  6. `navigateTo('/')`

This is the **only** place a finished game is currently detected. There is a second, distinct path — `onDiscardConfirm` (`index.vue:319-329`), reached from "Empezar partida nueva" inside `ResumePrompt` — which **abandons** an in-progress game without a result. Per the milestone spec ("Registro de resultado... al terminar la partida"), only the `onEndGameConfirm` path should produce a history entry; the discard path is out of scope (no "abandoned" outcome category is requested) and should be left untouched.

### The insertion point

Everything a history entry needs (villain, per-player heroes/names, difficulty, playerCount, round count, duration) is about to be destroyed by step 4-5 above. The new outcome-capture UI must be inserted **between step 2 (`isIndexOpen.value = false`) and step 4 (`session.value = null`)**, i.e.:

```
onEndGameConfirm (unchanged: steps 1-3)
  → NEW: awaitingOutcomeChoice.value = true  (blocks steps 4-6)
  → NEW: user picks "Ganado" / "Perdido" in a new small screen/modal
  → NEW: onOutcomeChosen(outcome) reads session.context + session.round + Date.now() - context.startedAt
         → builds a plain history-entry object (pure function, see engine/history.ts below)
         → calls usePersistedSession().appendHistoryEntry(entry)   [localStorage write, synchronous, always happens]
         → fire-and-forget mirrors to Firestore (see part e)        [never blocks the next line]
  → THEN: existing steps 4-6 run exactly as today (session.value = null; clear(gameId); navigateTo('/'))
```

`duration` requires a `startedAt` timestamp that doesn't exist anywhere today. Set it once, in `useGameSession.ts::start()`, as part of the initial `context` object passed to `expand()`. Because `context` round-trips wholesale through persistence (part a), `startedAt` survives resume unchanged — it must **not** be reset in the resume path, only set at genuine session creation.

### Where the localStorage write lives

`usePersistedSession.ts`'s own header comment states it is the app's **only** localStorage seam (`usePersistedSession.ts:1-2`, and repeated in `CLAUDE.md`'s architecture table). Two options: open a second file that touches `window.localStorage`, or extend this file. **Recommend extending `usePersistedSession.ts`** with a new key (`HISTORY_KEY = 'tga:history'`) and two new exported functions (`appendHistoryEntry(entry)`, `loadHistory()`), reusing the existing private `readRaw`/`writeRaw` helpers (`usePersistedSession.ts:76-105`) which already implement the correct defensive behavior (SSR-safe, private-mode/quota-safe, JSON-corruption-safe). This keeps the "one seam" claim literally true and matches the file's own established pattern of multiple independent keys living in one composable (`KEY_PREFIX + gameId`, `VOICE_KEY`, now `HISTORY_KEY`).

---

## c) How do known numbers reach step text without touching stored content?

This is the sharpest constraint. The mechanism must leave `speech` (and therefore the 37 audio clips and the voice-drift gate) completely untouched while adding a computed number to what's shown on screen.

### Confirmed: `text` and `speech` are already independent at every layer that matters

- `engine/resolve.ts::resolveText` returns a `TextBlock` with `text` and `speech` as **separate fields**, resolved independently per difficulty variant (`resolve.ts:9-16`). Its header comment is explicit: *"No hace aritmética ni sustituye tokens numéricos... el nº de jugadores nunca entra en el texto de un paso"* (`resolve.ts:3-4`) — this is an existing, deliberate invariant of this exact file. **Do not add the arithmetic inside `resolveText`.**
- `app/composables/useVoiceAnnouncer.ts:268` reads **only** `currentText.value.speech` (`// Única fuente de la frase locutada — nunca currentText.value.text`, its own comment). It never touches `.text`.
- `engine/audio.ts::collectSpeechEntries`/`collectAudioIds` (`audio.ts:23-48`) walk `step.speech` and `step.variants.difficulty[x].speech` **only** — they never read `step.text` and would never read a new `showsValue` field either, since they don't inspect it.
- `engine/__tests__/voice-drift.test.ts` fingerprints `entry.speech` exclusively (`voice-drift.test.ts:45`, `fingerprint(entry.speech)`) against the frozen `scripts/voice/manifest.json`, and separately asserts the manifest's id-set matches `collectAudioIds(game)` exactly (`voice-drift.test.ts:91-105`).

**Conclusion: a new content field that never assigns to `text` or `speech`, and is never read by `engine/audio.ts`, is structurally invisible to the voice-drift gate.** It cannot register as requiring a new clip and cannot change any existing fingerprint.

### Recommended mechanism

1. **New optional content field**, added to `TextBlockSchema`/`StepSchema` (`engine/schema.ts:31-78`) and `TextBlock`/`StepDefinition` (`engine/types.ts:19-51`):
   ```typescript
   showsValue?: 'villainHealth' | 'heroHealth' | 'handSize'
   ```
   Authored per-step in `content/marvel-champions.json`, sibling to `text`/`speech`, never inside them.

2. **New pure resolver**, `engine/valueDisplay.ts` (framework-agnostic, unit-tested like the rest of `engine/`), that takes the current node, the session context (for `selection`/`playerCount`/`difficulty`), and the catalogue (part d), and returns either `null` (nothing to show — e.g. selection not made yet, part a's resume gap) or a **pre-formatted string** ready to append in parentheses. Two distinct shapes are needed, discovered by reading the actual content (see the two concrete examples below) — not one:
   - **Single shared value** (villain health): returns e.g. `"14"`.
   - **Per-player list** (hero health, hand size): returns e.g. `"Jugador 1: 10 · Jugador 2: 8"`.

3. **New computed in `useGameSession.ts`**, alongside `currentText`:
   ```typescript
   const displayText = computed<string>(() => {
     if (!session.value || !currentNode.value) return currentText.value.text
     const suffix = resolveKnownValue(currentNode.value, session.value.context, catalogue)
     return suffix !== null ? `${currentText.value.text} (${suffix})` : currentText.value.text
   })
   ```
   `currentText` itself is **not modified** — `useVoiceAnnouncer` keeps consuming the original, unsuffixed `currentText` exactly as today (`index.vue:63-70` passes `currentText` to `useVoiceAnnouncer`, unchanged).

4. **One binding change** in `app/pages/[game]/index.vue`: `StepScreen`'s `action-text` prop (`index.vue:513`, currently `currentText.text`) switches to `displayText`. `StepScreen.vue` itself needs no change — `actionText` is already a plain `string` prop (`StepScreen.vue:5-6`).

### Two concrete steps this applies to, found by reading the actual content (not hypothetical)

- `setup.escenario.02` — *"Ajustad el dial de vida del villano al valor indicado en la carta de villano."* (`content/marvel-champions.json:176-178`). This is villain stage-1 health, a **single shared value** — clean case, matches the milestone's own `(14)` example exactly.
- `setup.heroes.03` — *"Ajustad vuestro dial de salud a la vida inicial de vuestra identidad."* (`content/marvel-champions.json:46-48`) and `ronda.jugadores.02` — *"Descartad o robad hasta el tamaño de vuestra mano."* (`content/marvel-champions.json:414-419`, this one repeats every round). **Both are per-player-variable values shown in one shared instruction line** — each player has a different hero with a different health/hand-size number, but the text is read once for the whole table. A bare `(14)` is ambiguous here; **`valueDisplay.ts` must return the per-player-list format** for `showsValue: 'heroHealth' | 'handSize'`, using `selection.heroes[].playerName` from part (a) to label each value. **Flag for the phase planner:** the milestone's own spec text uses the singular "un valor... (14)" example, which only unambiguously describes the villain-health case; the hero-health/hand-size cases need this explicit multi-value design decided before Chunk 4 (part g) is built, not discovered mid-implementation.

### What would break the voice-drift gate (explicitly, as required)

1. Writing the literal number into `step.text` in the JSON directly (defeats the whole point — this is the CLAUDE.md-forbidden path the milestone exists to avoid).
2. Also editing `step.speech` "to explain the number out loud" — any speech-string edit changes its fingerprint against the frozen manifest and fails `voice-drift.test.ts`'s D-04 check until `npm run voice:generate` is rerun (real money, per `CLAUDE.md`/`STACK.md`).
3. Implementing the number append **inside** `resolveText()` itself rather than in the new separate `displayText` layer — would not, on its own, touch `.speech` or break the gate mechanically, but it violates `resolve.ts`'s own stated invariant (point 3, above) and risks a future caller of `resolveText().text` (there is currently exactly one: `StepScreen`'s `actionText`) picking up numbers it didn't ask for.
4. Adding `showsValue` to the schema **without** `z.strictObject` semantics being preserved — per `schema.ts:12-24` (CR-01), any new field must be added to the existing `z.strictObject`-based schemas, not a plain `z.object`, or the "clicked build is honest" guarantee the project already relies on regresses silently for this new field too.

---

## d) Where does the hero/villain catalogue live?

**New file: `content/marvel-characters.json`** — same tier as `content/marvel-champions.json` (plain committed JSON, `content/games-index.ts:1-13` shows this directory is already the established home for per-game static data).

### Schema and test

- **New schema**, e.g. `engine/catalogueSchema.ts` (a second small Zod file, not folded into `engine/schema.ts`). Note: `engine/schema.ts`'s own header comment currently claims to be *"Único fichero del repo (fuera de node_modules) que importa zod"* (`schema.ts:1-4`) — **this comment becomes false the moment a second schema file is added and must be updated explicitly**, flagged here so it isn't missed.
- **New test**, e.g. `engine/__tests__/characters.test.ts`, validating `content/marvel-characters.json` against the new schema at CI time — mirrors the existing `content.test.ts`/`schema.test.ts` "fail loudly at build" pattern (`CLAUDE.md`).
- **New composable**, `app/composables/useCharacterCatalogue.ts`, statically importing the JSON exactly like `useGameContent.ts:9` imports `marvel-champions.json` — same offline guarantee, same "no runtime fetch" discipline (`useGameContent.ts:1-6` header comment, Anti-Patrón 3).

### Shape — Marvel-specific now, generic-enough-later by staying per-game, not by over-abstracting today

`PROJECT.md`'s own milestone description is explicit about the numbers needed: *"vida, tamaño de mano, vida de villano por etapa y por jugador"* (`.planning/PROJECT.md:35`). This confirms villain health is tiered by **both stage and player count** (consistent with `setup.escenario.02`/`setup.escenario.04`'s existing stage/difficulty-card content, `content/marvel-champions.json:174-220`), while hero health and hand size are flat per-hero numbers:

```json
{
  "gameId": "marvel-champions",
  "villains": [
    {
      "id": "rhino",
      "name": "Rhino",
      "healthByStage": { "1": { "1": 10, "2": 14, "3": 18, "4": 22 } }
    }
  ],
  "heroes": [
    { "id": "spider-man", "name": "Spider-Man", "alterEgo": "Peter Parker", "health": 10, "handSize": 5 }
  ]
}
```

**Recommendation: keep this file per-game and Marvel-vocabulary-specific (`villains`/`heroes`) rather than inventing a generic `characters[]`/`factions[]` taxonomy now.** Warhammer 40.000 content is an explicit future milestone (`PROJECT.md:47`, "Candidatos para hitos posteriores") whose actual shape isn't designed yet — this project's own established practice is to add fields/files when a second real need appears, not to guess an abstraction in advance (the `GameDefinitionSchema` itself grew incrementally this way: `variants`, `options`, `optionsWarning` etc. were each added when a concrete need arrived, per the inline history comments throughout `engine/schema.ts`). When W40K content is actually designed, a parallel `content/warhammer-characters.json` with its own schema, informed by real W40K rules, is cheap to add later and won't be constrained by a premature Marvel-shaped generic type. **Generality is achieved at the `GameDefinition`/`showsValue`/catalogue-composable-interface level (each game gets its own catalogue file + its own lookup composable, same pattern), not by forcing one shared JSON shape across two unrelated games.**

### Offline constraint

Committed + statically imported means the catalogue is bundled into the prerendered JS output at `nuxt generate` time exactly like `marvel-champions.json` already is. It is automatically covered by `@vite-pwa/nuxt`'s existing `workbox.globPatterns: ['**/*.{js,css,html}', ...]` (`nuxt.config.ts:147`) because it ships inside a JS chunk, not as a standalone `public/` asset — **no new Workbox glob entry is needed** (unlike the `.m4a` audio clips, which needed their own `audio/*.m4a` glob because they're separate static files, `nuxt.config.ts:156`).

---

## e) Where does Firestore sit?

**Seam: a new, lazily-imported, client-only composable — never a plugin, never loaded at boot.**

### Design

- **New file**, e.g. `app/composables/useHistorySync.client.ts` (Nuxt's `.client.` suffix convention gives a hard guarantee against accidental SSR execution, rather than relying on caller discipline alone — safer than relying solely on the fact that its only real caller sits inside the page's existing `<ClientOnly>` boundary, `index.vue:428`).
- **Invoked only from the new history-write hook** (part b's `onOutcomeChosen`), never at route load, never at app boot. If nobody has ever finished a game, **zero Firebase code, config, or network request is ever touched** — this satisfies "cold offline start" trivially by construction, not by a runtime network-detection branch.
- **Dynamic import inside the function body**: `const { initializeApp } = await import('firebase/app')`, `const { getFirestore, addDoc, ... } = await import('firebase/firestore')` — not static top-level imports. This keeps Firebase's SDK weight out of the prerendered critical-path bundle entirely; Vite/Nuxt code-splits it into its own chunk fetched only on first history write.
- **Fire-and-forget, exactly matching the existing idiom already used for audio preloading**: `prefetchAll(audioIds.value).catch(() => {})` (`index.vue:164`). The Firestore mirror call should be invoked the same way from the history-write hook — never `await`ed in the critical path that leads to `navigateTo('/')`.
- **Config guard before any import happens**: read Firebase project config from `runtimeConfig.public.firebase*` (`nuxt.config.ts` addition); if the project id is empty/undefined (e.g. a fork without Firebase configured, or a build where env vars weren't set), short-circuit to a no-op **before** the dynamic import runs, so a misconfigured build degrades to "sync silently never happens" rather than throwing.

### Explicit non-blocking failure modes (as required)

| Failure | Handling |
|---|---|
| Dynamic import of the Firebase chunk fails (offline at the moment of first write) | catch, log nothing user-visible, treat as "sync skipped, retry later" |
| `addDoc`/`setDoc` rejects (offline, quota, security-rule denial, project misconfigured) | catch, same treatment, never surfaces to the group, never blocks `navigateTo('/')` |
| Firebase env vars missing/invalid | short-circuit before import, per the config guard above |
| Firestore SDK's own offline queue/IndexedDB layer misbehaves | irrelevant if never enabled — see below |

### Coexistence with Workbox and with the project's existing "no IndexedDB" decision

`STACK.md`'s existing decision explicitly rejects IndexedDB for the app's **own** progress persistence ("solving a problem this app doesn't have"). That decision is about the app's own storage layer, not about a third-party SDK's internals, but it's worth deliberately **not** compounding it: **do not call `enableIndexedDbPersistence`/enable Firestore's multi-tab offline persistence.** Since localStorage (via `usePersistedSession.ts`, extended per part b) is already the durable source of truth and Firestore is explicitly "a durable backup, never-blocking" per the milestone spec, there is no need to also pay for Firestore's own offline write-queue complexity. If a write fails offline, it's simply skipped — recommend a lightweight `syncedToFirestore: boolean` flag on each localStorage history entry (`usePersistedSession.ts`'s new `appendHistoryEntry`), with an opportunistic `flushPending()` retry (e.g. triggered by a `window` `online` event listener, or attempted once more the next time a game starts) rather than adopting Firestore's built-in offline queue. This keeps the retry logic small, hand-rolled, and consistent with the project's stated preference for "no dependency for a job this small" (same reasoning `STACK.md` gives for skipping IndexedDB and Pinia).

Firestore traffic goes to `firestore.googleapis.com`, a cross-origin host that the existing `generateSW` Workbox config (`nuxt.config.ts:145-177`) never touches — its `globPatterns`/`globIgnores` only cover same-origin build output. **No `runtimeCaching` entry should be added** for Firestore; that would be over-engineering a best-effort, ok-to-fail write path that the app must function perfectly without.

---

## f) New vs modified files

### NEW

| File | Reason |
|---|---|
| `content/marvel-characters.json` | Villain/hero numeric catalogue (18 heroes, 3 villains), MarvelCDB-sourced |
| `scripts/marvelcdb/<fetch-script>.mjs` | Committed, documented procedure that produces the catalogue offline — never runs at app runtime |
| `engine/catalogueSchema.ts` | Zod schema for the catalogue, Node/CI-only (mirrors `engine/schema.ts`'s role) |
| `engine/__tests__/characters.test.ts` | Validates the catalogue at CI time (mirrors `content.test.ts`) |
| `engine/valueDisplay.ts` | Pure resolver: `showsValue` + selection + catalogue → parenthetical string or `null` |
| `engine/__tests__/valueDisplay.test.ts` | Unit tests for the above (same pure-function pattern as `resolve.test.ts`) |
| `engine/history.ts` | Pure `buildHistoryEntry(session, outcome, catalogue)` — keeps the page component thin, same role `engine/header.ts::describeHeader` already plays for header strings |
| `engine/statistics.ts` (optional but recommended) | Pure win% aggregation over `loadHistory()`'s output, unit-testable without any UI |
| `app/composables/useCharacterCatalogue.ts` | Static import + lookup helpers over the catalogue (mirrors `useGameContent.ts`) |
| `app/composables/useHistorySync.client.ts` | Lazy Firebase/Firestore mirror, fire-and-forget, client-only by file suffix |
| `app/components/HeroVillainPicker.vue` | Modal: per-player hero pick + name-filter + optional player name, invoked at `setup.heroes.01` |
| `app/components/CounterBand.vue` | Fixed villain HP + HP1..HP4 band with ▲▼, visible during the round loop |
| `app/components/GameOutcomeScreen.vue` (or a small extension of `ConfirmDialog.vue` — design choice) | Captures ganado/perdido, inserted into the end-game flow per part (b) |
| `app/pages/estadisticas.vue` | Win % per hero / per villain screen, reads `loadHistory()` + `engine/statistics.ts` |

### MODIFIED

| File | Change |
|---|---|
| `engine/types.ts` | Extend `SessionContext` with `selection`/`counters`/`startedAt`; add `showsValue` to `TextBlock`/`StepDefinition` |
| `engine/schema.ts` | Add `showsValue: z.enum([...]).optional()` to `TextBlockSchema` (`schema.ts:31-65`), preserving `z.strictObject` semantics (CR-01); update the file's own "único fichero que importa zod" header comment once `catalogueSchema.ts` exists |
| `content/marvel-champions.json` | Tag `setup.escenario.02` with `showsValue: 'villainHealth'`; tag `setup.heroes.03` and `ronda.jugadores.02` with `showsValue: 'heroHealth'` / `'handSize'` respectively; consider a `contentVersion` bump for hygiene (part a explains exactly what this does and doesn't guarantee) |
| `app/composables/useGameSession.ts` | Add `displayText` computed (part c); add selection/counter mutator functions that reassign `session.value` with an updated `context`, following the file's existing "never mutate in place" convention (`useGameSession.ts:6-7`) |
| `app/composables/usePersistedSession.ts` | Add `HISTORY_KEY`, `appendHistoryEntry(entry)`, `loadHistory()`, reusing existing `readRaw`/`writeRaw` (part b) — the one required change to keep "only localStorage seam" literally true |
| `app/pages/[game]/index.vue` | Wire `HeroVillainPicker` into the `setup.heroes.01` rendering path; render `CounterBand` during the round loop; insert the new outcome-choice state into `onEndGameConfirm` (part b); rebind `StepScreen`'s `action-text` from `currentText.text` (`index.vue:513`) to the new `displayText` |
| `nuxt.config.ts` | Add `runtimeConfig.public.firebase*` entries; no PWA/Workbox/`routeRules` changes needed (parts d and e explain why) |
| `package.json` | Add `firebase` dependency (dynamically imported, never a static top-level import) |

### Confirmed NOT modified (worth stating explicitly, since "no change needed" is itself a finding)

- `engine/resolve.ts` — no arithmetic added here; `showsValue` is read directly off `node.step` in the new `valueDisplay.ts`, not through `resolveText`'s output (part c).
- `engine/audio.ts` and `scripts/voice/generate.mjs` — neither reads `text` or `showsValue`, so neither needs to change or regenerate anything (part c).
- `engine/persistence.ts` — `context` is already generic/opaque; `isValidContext`'s minimal two-field guard remains correct and sufficient (part a).
- `app/components/StepScreen.vue` — remains a dumb component receiving `actionText: string`; no prop/slot changes needed if `displayText` is fully resolved upstream in the composable (part c). *If* the hero/villain picker or counter band end up composed as children of `StepScreen` rather than page-level siblings (a layout decision for the phase planner), this assumption would need revisiting.

---

## g) Suggested build order

Dependency graph (not a strict linear chain — chunks 3 and 4 can run in parallel once chunk 2 lands):

```
Chunk 1 (catalogue)
    │
    ▼
Chunk 2 (selection + picker UI)
    │
    ├──────────────┐
    ▼              ▼
Chunk 3        Chunk 4
(counters)     (showsValue)
    │              │
    └──────┬───────┘
           ▼
     Chunk 5 (history + statistics)
           │
           ▼
     Chunk 6 (Firestore backup)
```

**Chunk 1 — Catalogue.** `content/marvel-characters.json`, `scripts/marvelcdb/...`, `engine/catalogueSchema.ts`, `engine/__tests__/characters.test.ts`, `app/composables/useCharacterCatalogue.ts`. **Fully independent** — zero dependency on session state, selection UI, or Firestore. Testable entirely via Vitest with no UI at all. Build and validate this first because everything else (numbers to show, numbers to prefill counters with) reads from it.

**Chunk 2 — Selection state + picker UI.** Depends on Chunk 1 (needs hero/villain names+ids to populate the picker's filter/list). `engine/types.ts` (`SessionContext.selection`), `useGameSession.ts` selection mutator, `HeroVillainPicker.vue`, wiring at `setup.heroes.01` in `index.vue`. Persistence needs **no new code** — part (a) established that `context` extensions are saved/resumed for free by the existing debounced watcher and `resume()`. Testable: unit-test the mutator purely; manually verify persistence survives a reload using the app's existing resume flow.

**Chunk 3 — Counters + CounterBand.** Depends on Chunk 2 (initial HP values are "prefilled from the selection and player count," per `PROJECT.md:36`) and Chunk 1 (for the actual numbers). Independent of Chunk 4/5/6. `SessionContext.counters`, counter mutator, `CounterBand.vue`, wiring into the round-loop rendering. Same free-persistence argument as Chunk 2.

**Chunk 4 — `showsValue` rendering.** Depends on Chunk 1 (catalogue numbers) and Chunk 2 (which villain/hero is selected). **Does not depend on Chunk 3** — the three concrete steps identified in part (c) (`setup.heroes.03`, `setup.escenario.02`, `ronda.jugadores.02`) all read static catalogue base values, not live counters (setup-phase steps run once before any counter changes; `ronda.jugadores.02`'s hand size is a fixed per-hero number, not a decrementing counter). `engine/types.ts` (`TextBlock.showsValue`), `engine/schema.ts`, the three content-JSON tags, `engine/valueDisplay.ts` + tests, `useGameSession.ts`'s `displayText`, the `StepScreen` prop rebind. **Gate check for this chunk specifically: run `npm test` after the content-JSON edit and confirm `engine/__tests__/voice-drift.test.ts` is unchanged/still green with zero regeneration** — this is the concrete, mechanical verification that part (c)'s reasoning held.

**Chunk 5 — History capture + statistics.** Depends on Chunks 2/3 for the *data* it records (villain/heroes/names/duration/rounds), but `engine/history.ts`'s `buildHistoryEntry` and `engine/statistics.ts`'s aggregation are pure functions that can be built and unit-tested against a hand-built fixture session **before** Chunks 2-4 are fully wired into the UI — don't block this chunk's engine-level work on the others' UI work. `usePersistedSession.ts` additions (`HISTORY_KEY`), the new outcome-choice UI + `onEndGameConfirm` flow change, `app/pages/estadisticas.vue`. This chunk should ship and be verified as fully correct **entirely offline, with zero Firestore involvement**, before Chunk 6 is touched — it's the "localStorage as source of truth" half of the milestone and must stand on its own.

**Chunk 6 — Firestore backup.** Strictly last; depends only on Chunk 5's `appendHistoryEntry` call site existing as the hook point. `package.json` (`firebase` dep), `useHistorySync.client.ts`, `nuxt.config.ts` runtime config, wiring the fire-and-forget call into the Chunk 5 hook, the `syncedToFirestore`/`flushPending()` retry design (part e). If this chunk is deferred, delayed, or fails entirely in production, **Chunks 1-5 remain fully functional** — this is the one chunk that touches network/third-party config and the one place "cold offline start" needs explicit manual or Playwright verification (the project already has this pattern in `e2e/offline-flow.spec.ts`).

---

## Template Cross-Reference

The generic research template's "System Overview" diagram / "Scaling Considerations 100k+ users" / "External Services integration pattern table" sections are collapsed into the question-by-question answers above, since this is a codebase-grounded integration doc for a single-digit-user hobby app, not a from-scratch ecosystem survey. The one template section worth calling out on its own:

### Internal boundary this milestone must not blur

| Boundary | Rule |
|---|---|
| `~~/engine/*` ↔ `app/composables/useGameSession.ts` | **Unchanged by this milestone.** `useGameSession.ts:2-4`'s own comment states it is the *only* reactive seam between the pure engine and Vue — no component may import `~~/engine/*` directly. `valueDisplay.ts`/`history.ts`/`statistics.ts` (new pure engine modules) must be consumed through `useGameSession.ts` (or a new sibling composable following the identical pattern), never imported directly into `HeroVillainPicker.vue`/`CounterBand.vue`/`estadisticas.vue`. |
| `usePersistedSession.ts` ↔ everything else | **Extended, not duplicated.** Remains the only file that touches `window.localStorage` (part b). |
| `useHistorySync.client.ts` ↔ Firestore | **New boundary, intentionally thin and one-directional.** The app never reads from Firestore at runtime (no "restore history from cloud" feature in this milestone) — it only writes, fire-and-forget. This keeps the failure surface small: Firestore being unreachable can never prevent the app from displaying its own (correct, local) history/statistics. |

---

*Architecture research for: TableGameAssistant v1.8 (Elección de personajes, contadores en mesa e histórico de partidas)*
*Researched: 2026-09-07*
