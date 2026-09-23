# Architecture Research

**Domain:** Data-driven guided-step engine for board game rules flows (static Nuxt 4 PWA, no backend)
**Researched:** 2026-08-28
**Confidence:** HIGH (Nuxt 4 structure/prerendering verified against current official docs; flow-model and schema design is original engineering derived directly from the stated constraints in PROJECT.md, cross-checked for internal consistency, not copied from a precedent — flagged MEDIUM only where noted)

---

## 1. The Step/Flow Model — Decision

### Candidates, compared honestly

| Model | Authoring ergonomics | Second game as data | Jump-to-any-step | Round counter | Verdict |
|---|---|---|---|---|---|
| **Flat array + `loopStart` pointer** | Poor. A human authoring 40+ steps in one flat list loses the rulebook's own structure (Setup / Round / Player Phase / Villain Phase / End of Round). Hard to eyeball-audit against the PDF section by section. | Works, but the file itself doesn't communicate "this is a section" — a second author has to infer where phases begin from naming conventions alone. | Trivial — it's just an index. | Trivial — one conditional at the wrap index. | Good runtime shape, bad authoring shape. |
| **Nested: game → section → phase → step, `repeats: true` on a section** | Good. Mirrors how the rulebook and the human summary are already organized. Easy to write, easy to review against the PDF ("does the `round` section, `villain` phase, have exactly 4 steps matching Rules Reference §2.3–2.6?"). | Works cleanly — a new game is a new tree with the same shape; W40k's "Command → Movement → Psychic → Shooting → Charge → Fight" round is just another `repeats:true` section with different phases. | Requires resolving a tree path to a position — awkward to do repeatedly at runtime. | Requires knowing which section is "the" repeating one and where it starts/ends — derivable, but not free at the leaf level. | Good authoring shape, needs a runtime step to become good runtime shape. |
| **Explicit state machine (XState-style statechart)** | Poor for this content. Authors would write states/transitions/guards in JSON instead of an ordered list of "what happens now" text — much harder to hand-write and to audit line-by-line against a rulebook page. | Technically works (a statechart can express anything), but a genuinely different-shaped statechart per game means the *transition logic*, not just the *content*, differs per game — which is exactly the coupling we're trying to avoid. | Works via targeted transitions, but you're modeling "jump to any of 40 states" as 40 explicit transitions or a dynamic `send({type: 'JUMP', target})` escape hatch that bypasses the statechart's whole value proposition. | Modeled as context + entry actions on the wrap transition — fine, but no better than a plain conditional. | Solves problems this project doesn't have. |

**Recommendation: nested authoring schema, flattened+expanded runtime engine.** Don't pick one model — use two, each optimized for what it's good at, connected by a pure transformation:

1. **Authors write** the nested `game → section (repeats?) → phase → step` shape (see §2). This is what goes in the JSON files and what gets diffed against the PDF.
2. **At load time**, a pure `flatten()` function walks the tree once and produces a flat, ordered array of step nodes, each carrying its section/phase lineage for breadcrumbs and grouping in the jump overlay. This is the runtime shape the engine actually navigates.
3. **At session-start time** (once player count / difficulty are known from the mini-setup), a pure `expand()` function walks the flat array once more and expands any `perPlayer` step into N runtime nodes (see §2), and computes exactly two integers: `loopStartIndex` and `loopEndIndex` — the first and last index belonging to the one section marked `repeats: true`.

Navigation (`next`, `prev`, `jumpTo`) then operates *only* on this flat, expanded array with two precomputed integers. That's the entire flow model. No tree walking happens during play.

**Is XState over-engineering here? Yes — explicitly.** XState earns its complexity when a flow has genuine branching (different next-states depending on runtime conditions), parallel/orthogonal regions, or side-effecting entry/exit actions that need formal modeling. This project's transition graph is a straight line with exactly one wrap edge. The "conditional branches" in the requirements (Héroe / Alter-Ego) are *not* flow branches at all — both are displayed simultaneously as text (per PROJECT.md: "los pasos condicionales muestran todas las ramas como texto"), so there is no runtime branching to model. Introducing a statechart library would (a) force authors to write transition graphs instead of ordered lists, directly hurting the "hand-authored JSON, audited against a PDF" workflow that is this project's actual bottleneck, and (b) add an API surface (guards, invoked services, history states, parallel states) this app will never use. If a future requirement introduces genuine flow branching (e.g. "skip step 4 entirely in solo mode"), the fix is a `skipIf` predicate evaluated once during `expand()` that filters a node out of the array — still no state machine library.

**Round counter placement (answering the "at the right boundary" requirement precisely):**

```
next(session):
  if session.cursor === session.loopEndIndex:
      cursor = loopStartIndex
      round  = session.round + 1        # crossing the wrap edge, and ONLY here
  else:
      cursor = min(cursor + 1, length - 1)
  return { ...session, cursor, round }

prev(session):
  if session.cursor === session.loopStartIndex and session.round > 1:
      cursor = loopEndIndex
      round  = session.round - 1        # symmetric undo of the wrap
  else:
      cursor = max(cursor - 1, 0)
  return { ...session, cursor, round }

jumpTo(session, runtimeId):
  cursor = indexOf(session.sequence, runtimeId)
  return { ...session, cursor }         # round is untouched — a jump is a look-around, not a round transition
```

This is the single most important correctness property in the whole system and it reduces to two `if` statements over two integers, fully unit-testable with plain objects — no Vue, no DOM, no mocking.

---

## 2. The JSON Content Schema

### Design choices made (per the explicit "no formula evaluator" constraint)

- **Player-count adaptation → token substitution**, not arithmetic. `{playerCount}` and `{n}` are replaced by literal string substitution against numbers already known from the mini-setup. No expression language.
- **Difficulty adaptation → variant text blocks**, not a formula. Normal/Experto differences in Marvel Champions are usually categorical rewordings ("Fase I" vs "Fase II", different draw counts stated as text), so a `variants.difficulty` object holding an alternate `TextBlock` is more honest than trying to template a single sentence two ways.
- **Conditional branches → always-shown labeled text blocks**, not a `when` condition evaluated against hidden state. This matches the explicit product decision that all branches are shown and the player reads the one that applies. There is no condition evaluator anywhere in this schema.
- **Per-player iteration → enumeration, not computation.** A step marked `perPlayer.enabled: true` is expanded by the engine into N runtime copies (one per player in turn order) at session-start; the JSON never states "for i in 1..playerCount" as logic, it just flags the step as a per-player template.
- **IDs are for reference (deep links, persistence, citations), never for ordering.** Canonical order is array position in the authored JSON. This avoids the trap of trying to sort by dotted-id strings, which breaks the moment an author inserts a step between two existing ones.

### Annotated example (Marvel Champions excerpt)

```jsonc
{
  "gameId": "marvel-champions",
  "title": "Marvel Champions: El Juego de Cartas",
  "locale": "es",
  "contentVersion": 1,               // bump on ANY structural or textual change to this file
  "sections": [
    {
      "id": "setup",
      "title": "Preparación de la partida",
      "repeats": false,               // walked exactly once, ever
      "phases": [
        {
          "id": "setup.mesa",
          "title": "Preparar la mesa",
          "steps": [
            {
              "id": "setup.mesa.01",  // stable, used for deep links + persisted position
              "title": "Elegid villano y héroes",
              "text": "Elegid el villano al que os enfrentaréis y un héroe por jugador.",
              "detail": "El villano determina el mazo de villano y el mazo de encuentro base que usaréis.",
              "citation": { "source": "rules-reference", "section": "1.1 Elegir un villano", "page": 4 }
            },
            {
              "id": "setup.mesa.02",
              "title": "Separad los Archienemigos",
              "text": "Separad del mazo de villano cualquier carta de Archienemigo y dejadla aparte por ahora.",
              "citation": { "source": "rules-reference", "section": "1.3", "page": 5 }
            }
          ]
        }
      ]
    },
    {
      "id": "round",
      "title": "Ronda",
      "repeats": true,                // exactly one section in the whole file may set this true
      "phases": [
        {
          "id": "round.player",
          "title": "Fase de jugadores",
          "steps": [
            {
              "id": "round.player.01",
              "title": "Cada jugador resuelve su turno",
              "text": "En orden de turno, cada jugador juega su turno completo.",
              "perPlayer": { "enabled": true, "ordinalTemplate": "Jugador {n} de {playerCount}: resuelve tu turno." },
              "citation": { "source": "rules-reference", "section": "2.2", "page": 9 }
            }
          ]
        },
        {
          "id": "round.villain",
          "title": "Fase del villano",
          "steps": [
            {
              "id": "round.villain.01",
              "title": "Avance del villano",
              "text": "El villano avanza a la Fase {villainPhaseLabel}.",
              // NOTE: {villainPhaseLabel} is NOT a computed token — it is resolved via the
              // difficulty variant below, which supplies the literal word for each mode.
              "variants": {
                "difficulty": {
                  "normal": { "text": "El villano avanza a la Fase I." },
                  "expert": { "text": "El villano avanza a la Fase II." }
                }
              },
              "citation": { "source": "rules-reference", "section": "2.3", "page": 10 }
            },
            {
              "id": "round.villain.02",
              "title": "Robo de cartas de encuentro",
              "text": "Cada jugador roba 1 carta de encuentro.",
              "branches": [
                { "label": "Si estás en forma de Héroe", "text": "Resuelve la carta de encuentro robada normalmente." },
                { "label": "Si estás en Alter Ego", "text": "Resuelve la carta de encuentro robada; algunos efectos pueden variar en Alter Ego — consulta el texto de la carta." }
              ],
              "citation": { "source": "rules-reference", "section": "2.4", "page": 10 }
            },
            { "id": "round.villain.03", "title": "El villano ataca", "text": "El villano ataca al jugador con más amenaza." },
            { "id": "round.villain.04", "title": "Efectos de \"Fin de la fase del villano\"", "text": "Resuelve cualquier efecto que se dispare al final de la fase del villano." }
          ]
        },
        {
          "id": "round.end",
          "title": "Fin de ronda",
          "steps": [
            { "id": "round.end.01", "title": "Comprobad condiciones de fin de partida", "text": "Comprobad si se ha cumplido alguna condición de victoria o derrota." },
            { "id": "round.end.02", "title": "Nueva ronda", "text": "Empieza una nueva ronda: volved a la Fase de jugadores." }
          ]
        }
      ]
    }
  ]
}
```

Note the fixed field it replaces above — `{villainPhaseLabel}` in a comment is illustrative of the *wrong* approach (a token that would require computing which phase label applies); the actual schema instead uses a **difficulty variant with the full literal sentence**, which is the pattern actually recommended. Author files should not include ad-hoc computed tokens beyond `{playerCount}` and `{n}`.

### TypeScript types

```typescript
// engine/types.ts — zero Vue/Nuxt imports

export type Difficulty = 'normal' | 'expert'

export interface Citation {
  source: 'rules-reference' | 'learn-to-play'
  section: string        // human-readable rulebook section, e.g. "2.3 Fase del villano"
  page?: number
}

export interface TextBlock {
  text: string            // primary "what happens now" — shown big, spoken by default
  detail?: string         // optional elaboration — shown smaller, not spoken unless `speech` says so
  speech?: string         // override of what TTS reads, when `text` isn't speech-friendly
}

export interface Branch extends TextBlock {
  label: string           // "Si estás en Alter Ego" — always rendered, never conditionally hidden
}

export interface PerPlayerConfig {
  enabled: true
  ordinalTemplate?: string  // default "Jugador {n} de {playerCount}" if omitted
}

export interface StepDefinition extends TextBlock {
  id: string                // stable dotted id: "round.villain.02" — reference only, NOT sort order
  title: string              // short label for the jump/index overlay
  branches?: Branch[]
  variants?: {
    difficulty?: Partial<Record<Difficulty, Partial<TextBlock>>>
  }
  perPlayer?: PerPlayerConfig
  citation?: Citation
}

export interface PhaseDefinition {
  id: string
  title: string
  steps: StepDefinition[]
}

export interface SectionDefinition {
  id: string
  title: string
  repeats: boolean          // exactly one section per game may be `true`
  phases: PhaseDefinition[]
}

export interface GameDefinition {
  gameId: string
  title: string
  locale: 'es'
  contentVersion: number
  sections: SectionDefinition[]
}

// --- runtime shapes, produced by flatten()/expand(), never authored by hand ---

export interface FlatStepNode {
  step: StepDefinition
  sectionId: string
  sectionRepeats: boolean
  phaseId: string
  breadcrumb: string        // "Ronda › Fase del villano" — for the jump overlay
}

export interface RuntimeStepNode extends FlatStepNode {
  runtimeId: string          // step.id, or `${step.id}::p${playerIndex}` when per-player expanded
  playerIndex?: number       // 1-based; present only on expanded per-player nodes
}

export interface SessionContext {
  playerCount: number
  difficulty: Difficulty
}
```

### Zod validation sketch

```typescript
// engine/schema.ts
import { z } from 'zod'

const idPattern = /^[a-z0-9]+(\.[a-z0-9]+)*$/

const CitationSchema = z.object({
  source: z.enum(['rules-reference', 'learn-to-play']),
  section: z.string().min(1),
  page: z.number().int().positive().optional(),
})

const TextBlockSchema = z.object({
  text: z.string().min(1),
  detail: z.string().optional(),
  speech: z.string().optional(),
})

const BranchSchema = TextBlockSchema.extend({
  label: z.string().min(1),
})

const DifficultyVariantSchema = z.object({
  normal: TextBlockSchema.partial().optional(),
  expert: TextBlockSchema.partial().optional(),
})

const PerPlayerSchema = z.object({
  enabled: z.literal(true),
  ordinalTemplate: z.string().optional(),
})

const StepSchema = TextBlockSchema.extend({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  branches: z.array(BranchSchema).optional(),
  variants: z.object({ difficulty: DifficultyVariantSchema.optional() }).optional(),
  perPlayer: PerPlayerSchema.optional(),
  citation: CitationSchema.optional(),
})

const PhaseSchema = z.object({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  steps: z.array(StepSchema).min(1),
})

const SectionSchema = z.object({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  repeats: z.boolean(),
  phases: z.array(PhaseSchema).min(1),
})

export const GameDefinitionSchema = z.object({
  gameId: z.string().regex(idPattern),
  title: z.string().min(1),
  locale: z.literal('es'),
  contentVersion: z.number().int().positive(),
  sections: z.array(SectionSchema).min(1),
}).superRefine((game, ctx) => {
  const repeating = game.sections.filter(s => s.repeats)
  if (repeating.length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: `Expected exactly one section with repeats:true, found ${repeating.length}` })
  }
  const allIds = game.sections.flatMap(s =>
    [s.id, ...s.phases.flatMap(p => [p.id, ...p.steps.map(st => st.id)])])
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i)
  if (dupes.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate ids: ${[...new Set(dupes)].join(', ')}` })
  }
})

export function validateGameDefinition(json: unknown) {
  return GameDefinitionSchema.parse(json) // throws with a readable message on malformed content
}
```

This validation is what an author (or a CI check) runs against a game JSON before it ships — it catches the two structural mistakes that would otherwise silently break navigation: more/fewer than one repeating section, and duplicate ids that would make `jumpTo` ambiguous.

---

## 3. Component Boundaries

```
┌──────────────────────────────────────────────────────────────────────┐
│  content/*.json                                                       │
│  Hand-authored, nested game→section→phase→step. Source of truth,      │
│  auditable line-by-line against the official PDF via `citation`.      │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ (static import at build time — no fetch)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  engine/  (pure TypeScript — zero Vue, zero Nuxt, zero DOM)           │
│  ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐ │
│  │ schema.ts  │ │flatten.ts │ │expand.ts │ │navigator.ts│ │resolve.ts│ │
│  │ (Zod)      │ │(tree→list)│ │(per-player│ │(next/prev/ │ │(variant+ │ │
│  │            │ │           │ │ + loop    │ │ jumpTo)    │ │ token    │ │
│  │            │ │           │ │ bounds)   │ │            │ │ resolve) │ │
│  └────────────┘ └───────────┘ └──────────┘ └───────────┘ └─────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ persistence.ts — pure resume(persisted, freshSession) → session│   │
│  └────────────────────────────────────────────────────────────────┘   │
│  Unit-tested directly with vitest, no mounting, no Nuxt test-utils.   │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ imported explicitly (no auto-import magic)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  app/composables/  — thin reactive adapter (the ONLY layer that      │
│  knows both "engine" and "Vue reactivity" exist)                     │
│  useGameContent(gameId)   → loads + validates the right JSON          │
│  useGameSession(gameId)   → reactive session, wraps next/prev/jumpTo  │
│  usePersistedSession()    → localStorage read/write, calls resume()  │
│  useSpeech()               → Web Speech API wrapper, independent      │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ reactive refs / computed
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  app/components/  — presentational, dumb, framework-idiomatic        │
│  StepDisplay · NextPrevControls · StepIndexOverlay ·                 │
│  MiniSetupForm · SpeechToggle                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Rule that makes this work:** nothing above the composable layer imports Vue, and nothing below the composable layer imports anything Vue-adjacent. The composable layer is the single seam. This is what lets `engine/` be tested with plain `vitest` fixtures (a hand-written 6-step fake game) with zero mounting, zero jsdom, in milliseconds — which matters because the round-boundary logic in §1 is exactly the kind of off-by-one bug that needs fast, cheap, exhaustive tests, not component tests.

---

## 4. Nuxt 4 Project Layout

Nuxt 4's default `srcDir` is `app/` (confirmed against current docs: `~` resolves to `app/`, `~~` resolves to project root; `server/`, `shared/`, `public/`, `modules/`, `layers/` live at the project root, outside `srcDir`). Recommended layout:

```
TableGameAssistant/
├── engine/                        # pure TS, framework-free — root-level, NOT inside app/
│   ├── types.ts
│   ├── schema.ts                  # Zod validation
│   ├── flatten.ts                 # tree → ordered FlatStepNode[]
│   ├── expand.ts                  # per-player expansion + loop bounds
│   ├── resolve.ts                 # variant + token → final TextBlock
│   ├── navigator.ts               # next/prev/jumpTo — pure functions over EngineSession
│   ├── persistence.ts             # pure resume(persisted, fresh) logic
│   └── __tests__/
│       ├── navigator.test.ts      # exhaustive round-boundary + jump tests
│       ├── expand.test.ts
│       └── fixtures/tiny-game.json  # 6-step fake game, not real content — fast, deliberate
│
├── content/
│   ├── games-index.ts             # [{ id, title, status: 'available'|'coming-soon' }, ...]
│   ├── marvel-champions.json      # real content, verified against Rules Reference v17
│   └── warhammer-40k.json         # added later, same schema
│
├── app/                            # Nuxt 4 srcDir
│   ├── app.vue
│   ├── pages/
│   │   ├── index.vue               # "¿A qué juego vas a jugar?" — reads content/games-index.ts
│   │   └── [game]/
│   │       └── index.vue           # single runner page: mini-setup OR step display, same route
│   ├── components/
│   │   ├── setup/
│   │   │   └── MiniSetupForm.vue   # nº jugadores + Normal/Experto
│   │   └── runner/
│   │       ├── StepDisplay.vue     # renders resolved TextBlock + branches
│   │       ├── NextPrevControls.vue
│   │       ├── StepIndexOverlay.vue  # jump-to-any-step, grouped by breadcrumb
│   │       └── SpeechToggle.vue
│   ├── composables/
│   │   ├── useGameContent.ts
│   │   ├── useGameSession.ts
│   │   ├── usePersistedSession.ts
│   │   └── useSpeech.ts
│   ├── app.config.ts
│   └── error.vue
│
├── public/
│   ├── manifest.webmanifest         # PWA
│   └── icons/
│
├── nuxt.config.ts                   # ssr: true (default), nitro.prerender.routes explicit list
└── vitest.config.ts                  # points at engine/**/*.test.ts, no jsdom needed for engine
```

**Why `engine/` lives outside `app/`, not in `app/utils/` or `shared/`:** `app/utils/` is Nuxt's auto-import convenience folder for the *application*; putting the engine there works mechanically but blurs the boundary (it becomes "just some app code"). `shared/` is Nuxt's convention for code shared between the client app and a Nitro *server* — this project has no server, so that convention doesn't describe our situation, even though it would also work as a neutral folder. A genuinely separate, root-level `engine/` makes the purity boundary a physical fact: it's outside `srcDir` entirely, nothing about it is Nuxt-flavored, and it could be extracted into its own npm package later with zero rewrite if the guided-flow concept ever needed to power something other than this Nuxt app. Import it via the `~~` (rootDir) alias Nuxt already provides: `import { next } from '~~/engine/navigator'`.

**Routing shape:** a single `/` selector page (statically lists games from `content/games-index.ts`, including Warhammer 40k as `coming-soon` so it's visible but not clickable-through-to-content) and a single dynamic `/[game]` runner page. The runner page checks `usePersistedSession()` on mount: if a valid saved session exists, render `StepDisplay` directly (resume in place); if not, render `MiniSetupForm` first. This avoids a `/[game]/setup` vs `/[game]/play` split that would need its own persistence-driven redirect logic for no real benefit.

**Prerendering a dynamic `[game]` route:** `nuxt generate` (Nuxt's static-site build) crawls links reachable from `/`, so `/marvel-champions` and `/warhammer-40k` will be discovered automatically because the selector page renders real `<NuxtLink>` anchors to them. Still, add them explicitly to `nitro.prerender.routes` in `nuxt.config.ts` (computed from `content/games-index.ts`, so it's one array, not duplicated data) as cheap insurance against crawler discovery gaps. Set `ssr: true` (Nuxt's default) so `nuxt generate` produces fully static HTML+payload per game route deployable to any static host — no Node runtime needed, consistent with the "no backend" constraint. `server/` stays empty/unused.

**Content loading:** static `import` of the JSON files at build time (`import marvelChampions from '~~/content/marvel-champions.json'`), not a runtime `fetch`/`useFetch`. This means game content is baked into the JS bundle Nuxt already prerenders and the service worker already has to cache — there is no separate network request to fail offline, and no separate cache-invalidation path to design for content. `useGameContent(gameId)` becomes a synchronous lookup + `validateGameDefinition()` call, not an async operation.

---

## 5. Data Flow

```
User presses "Siguiente"
        │
        ▼
NextPrevControls.vue  — emits @next
        │
        ▼
useGameSession()  — calls engine navigator.next(session)  [pure, synchronous]
        │
        ▼
new EngineSession { cursor, round, ... }  — assigned to a reactive ref
        │
        ├──▶ computed currentNode = session.sequence[session.cursor]
        │           │
        │           ▼
        │    engine resolve.ts → resolveText(currentNode, session.context)
        │           │
        │           ▼
        │    { text, detail, speech, branches }  — final, display-ready
        │           │
        │           ├──▶ StepDisplay.vue renders text/detail/branches (big, tablet-first)
        │           └──▶ watcher on `speech` calls useSpeech().speak(speech) if voice is on
        │
        └──▶ debounced watcher on { session.cursor/round/context } →
             usePersistedSession().save({ gameId, contentVersion, runtimeId, round, context })
             → localStorage["tga:progress:<gameId>"]
```

**Where the round counter lives:** inside the reactive `EngineSession` object owned by `useGameSession()`, specifically the `round: number` field — it is never derived from a step id string, never recomputed from scratch on render; it only changes via the two boundary-crossing branches in `next()`/`prev()` shown in §1. It is part of what gets persisted, so a reload mid-round resumes at the correct round number, not round 1.

**Where persistence hooks in:** at the composable layer only. `engine/persistence.ts` exposes pure `resume(persisted, freshSession) → EngineSession`; `usePersistedSession()` is the only place that touches `localStorage` (the actual I/O), calling `resume()` on mount and a debounced `save()` on every session change. The engine never does I/O and is never aware `localStorage` exists.

**Where variant/token resolution happens:** lazily, in a `computed`, every time the cursor changes — not baked into the expanded sequence. `expand()` only decides *how many* runtime nodes exist (structural, depends on `playerCount` for per-player steps); `resolve()` decides *what text* a given node shows (depends on `difficulty` and the numeric tokens), and is cheap enough to recompute on every navigation without memoization concerns.

---

## 6. Persistence and Content Versioning

**Persisted shape** (one entry per game, namespaced key `tga:progress:<gameId>` in `localStorage`):

```typescript
interface PersistedPosition {
  formatVersion: 1            // versions the STORAGE SHAPE itself, independent of content
  gameId: string
  contentVersion: number      // copied from the GameDefinition that was active when saved
  runtimeId: string           // e.g. "round.villain.02" or "round.player.01::p2"
  round: number
  context: SessionContext     // { playerCount, difficulty } — kept even on fallback
  updatedAt: string           // ISO timestamp, informational
}
```

**Strategy — conservative fallback, never a crash:**

1. On load, read `PersistedPosition` for the current `gameId`. If absent → fresh session, show `MiniSetupForm`.
2. If present, compare `persisted.contentVersion` to the freshly-loaded `GameDefinition.contentVersion`.
   - **Mismatch** → do not attempt to resolve `runtimeId` against the new structure at all, even if it happens to still exist (a coincidental id match after a restructure is worse than an honest reset — it could land the user on a step that used to mean something else). Fall back to session start (`cursor = 0, round = 1`), but **keep** `persisted.context` (playerCount/difficulty are still meaningful) so the player doesn't have to redo the mini-setup. Optionally show a one-line notice ("Se actualizó el contenido; empezamos desde el principio").
   - **Match** → look up `persisted.runtimeId` in the freshly expanded `sequence`. Found → resume exactly (cursor + round + context restored). **Not found** (defensive — e.g. manual storage tampering, or a same-version content diff that shouldn't happen but might) → same fallback as mismatch.
3. **Versioning discipline:** bump `contentVersion` on *any* edit to that game's JSON that could shift meaning — reordering, inserting, deleting, or renaming a step id. Bumping too eagerly (e.g. on a pure typo fix) only costs an unnecessary reset to session start, which is cheap and safe; failing to bump when structure changed risks a subtly wrong resume, which is the worse failure mode. Recommend: bump on every deploy that touches that game's content file, full stop — don't try to be clever about "was this change structural."

This keeps the fallback logic entirely inside `engine/persistence.ts` as a pure function (`resume(persisted, freshSession): EngineSession`), fully unit-testable with fixtures for "version matches," "version mismatch," and "id vanished" without touching `localStorage` in the test at all.

---

## 7. Suggested Build Order

```
1. engine/ core                         ──┐
   (types, schema, flatten, expand,        │  parallelizable — no shared dependency,
    resolve, navigator, persistence)        │  can all start day one
   + unit tests against a hand-written      │
   6-step fixture (NOT real content)       │
                                            │
2. Content research + authoring            │  (reading the two PDFs, drafting
   (Marvel Champions JSON, verified          │  Marvel Champions JSON) — independent
   against Rules Reference v17)              │  research work; final zod-parse +
                                            │  flatten sanity-check depends on (1)
3. Nuxt scaffold                           │  (pages/index.vue, [game]/index.vue
   (routing skeleton, empty placeholders)  ──┘  skeleton, nuxt.config prerender list)
        │
        ▼ (needs 1 + 3)
4. Composable/store adapter layer
   (useGameContent, useGameSession, usePersistedSession)
        │
        ▼ (needs 4)
5. Presentational components
   (StepDisplay, NextPrevControls, MiniSetupForm)
        │
        ▼ (needs 4 + a small engine addition: listSteps()/table-of-contents helper)
6. Jump/index overlay (StepIndexOverlay)
        │
        ▼ (can slip later — lower priority than 1-5)

Independent tracks, mergeable whenever convenient:
7. useSpeech() (Web Speech API wrapper) — zero dependency on engine or content;
   build anytime, wire into StepDisplay's speech watcher last.
8. Persistence wiring end-to-end — needs (1)'s persistence.ts + (4); do this AFTER
   next/prev/jump already work manually, so there's something meaningful to persist.
9. PWA/offline shell (manifest, service worker) — mostly infrastructure, can start
   after (3) exists, but finalize after content is stable-ish; since content is
   statically imported into the JS bundle (not fetched), the service worker's job
   shrinks to "cache the app shell," which is the default behavior of most Nuxt
   PWA setups — no custom content-caching strategy needed.
10. Warhammer 40k content — pure content addition once (1) is proven against
    Marvel Champions. Should require zero changes to 1, 4-9 (see §8).
```

**Critical path for the roadmap:** 1 → (2 in parallel) → 3 → 4 → 5, with 7 buildable anytime and 6/8/9 following once 5 lands. Nothing about the "no calculation" or "hand-authored JSON" constraints is threatened by this ordering — the engine's correctness (round boundary, jump, persistence fallback) is fully verifiable in step 1 before a single line of real Marvel Champions content or a single Vue component exists, which is exactly the leverage point worth spending roadmap phase 1 on.

---

## 8. Extensibility Check: Adding Warhammer 40k

Concretely, adding W40k under this architecture requires:

1. Write `content/warhammer-40k.json` conforming to the same `GameDefinitionSchema`: `sections = [ Setup(repeats:false, phases=[...]), BattleRound(repeats:true, phases=[Command, Movement, Psychic, Shooting, Charge, Fight, Morale-or-whatever-the-current-edition-uses, ...]) ]`. (The exact current-edition W40k phase list is a *content research* question for whenever that milestone starts, not an architecture question — out of scope here.)
2. Flip its entry in `content/games-index.ts` from `status: 'coming-soon'` to `status: 'available'`.
3. Add its route to `nitro.prerender.routes` (or trust the crawler, since it's already linked from `/`).

**That's it — zero changes to `engine/`, `app/composables/`, or `app/components/`.** Nothing in those layers knows the words "villano," "héroe," "Command phase," or "Morale." `StepDisplay.vue` renders whatever `title`/`text`/`detail`/`branches` a resolved node has; `navigator.ts` only knows "one section repeats, here are its bounds"; `MiniSetupForm.vue` only knows "player count + difficulty," both of which W40k also needs.

**Honest limitation, stated rather than hidden:** this model assumes exactly one repeating section per game and a flat `playerCount + difficulty` session context. Two situations would require touching engine code:

- **A game with two independent repeating cycles** (e.g. a repeating sub-phase nested inside the repeating round — not the case for either Marvel Champions or the currently-known W40k round structure). The fix is a small, contained generalization: `expand()` would track an array of `(loopStartIndex, loopEndIndex)` pairs instead of one, and `navigator.ts`'s two `if` branches would loop over that array instead of comparing against a single pair. The *schema* doesn't need to change at all — `repeats: true` already generalizes to "more than one section may set this," it's only the runtime engine's bookkeeping that would grow. This is a bounded, testable extension, not a rewrite.
- **A game needing a third mini-setup question** beyond player count/difficulty (e.g. a faction picker). The fix, if designed for now rather than later, is to make `SessionContext` an open bag (`{ playerCount: number; difficulty: Difficulty; [key: string]: unknown }`) from day one, so a new field is additive to the type and to `MiniSetupForm.vue`, not a breaking change to the engine's function signatures. Recommend doing this now, even though only two fields exist today — it costs nothing and forecloses a future partial-rewrite.

Neither situation applies to the two games actually in scope. The honest takeaway: **adding W40k as specified is pure data + a registry flip; the architecture only needs engine changes if a future game's structure genuinely doesn't fit "one setup, one repeating round," which is a real but currently-hypothetical risk, flagged and designed around rather than ignored.**

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Formula evaluator for player-count/difficulty text
**What people do:** build a small expression language (`"{playerCount * 2} cartas"`) or embed conditionals (`{{#if expert}}...{{/if}}`) directly in content strings.
**Why it's wrong:** directly contradicts the stated "no calculation" philosophy, and turns every content file into code that needs its own test suite. It also makes citation-auditing against the PDF harder — a reviewer has to mentally execute the formula to know what a player will actually see.
**Instead:** literal variant text blocks (`variants.difficulty`) and literal token substitution (`{playerCount}`, `{n}`) against numbers already known — both shown in §2.

### Anti-Pattern 2: Ordering steps by sorting their `id` strings
**What people do:** rely on dotted ids like `round.villain.02` sorting correctly, then later need to insert a step between `.02` and `.03` and either renumber everything (breaking persisted positions and citations) or invent fragile decimal ids (`.025`).
**Why it's wrong:** couples content authoring convenience to a fragile string-sort invariant that will eventually break.
**Instead:** order = array position in the authored JSON, full stop. Ids exist only for lookup (persistence, deep links, uniqueness checks), never for ordering.

### Anti-Pattern 3: Fetching content JSON at runtime instead of importing it
**What people do:** `useFetch('/content/marvel-champions.json')`, treating content like a CMS response.
**Why it's wrong:** adds an async loading state, a network dependency the PWA then has to work around via service-worker caching rules, and a cache-invalidation problem completely disjoint from Nuxt's own build-output caching.
**Instead:** static `import` at build time. Content is part of the JS bundle Nuxt already prerenders and the service worker already has to cache as "the app."

### Anti-Pattern 4: Silently resuming a stale persisted step id after a content change
**What people do:** on version mismatch, still try `sequence.findIndex(id)` and resume if it happens to match.
**Why it's wrong:** a coincidental id survival after a restructure can land the user mid-flow with the wrong `round` number or wrong surrounding context, which is worse than a full reset for a "guides you so you don't miss a step" product.
**Instead:** version mismatch → unconditional fallback to session start, keep only `playerCount`/`difficulty` (see §6).

---

## Sources

- [Nuxt Directory Structure v4](https://nuxt.com/docs/4.x/directory-structure) — `app/` as default `srcDir`, `server/`/`shared/`/`public/`/`modules/`/`layers/` remain at project root, `~` → `srcDir`, `~~` → `rootDir`. HIGH confidence, official docs.
- [Nuxt v4 Upgrade Guide](https://nuxt.com/docs/4.x/getting-started/upgrade) — confirms the `app/` migration shape and automated codemod. HIGH confidence.
- [Nuxt Prerendering v4](https://nuxt.com/docs/4.x/getting-started/prerendering) and [Nuxt Deployment v4](https://nuxt.com/docs/4.x/getting-started/deployment) — `nuxt generate` crawls linked routes at build time; unlinked dynamic routes need explicit `nitro.prerender.routes`. HIGH confidence, official docs.
- Flow-model comparison (flat array vs nested-with-repeats vs XState/statecharts) and the full schema/engine design in §1–§8 are original architecture reasoning derived directly from the constraints in `.planning/PROJECT.md`, not sourced from an existing precedent — internally verified for consistency (round-boundary logic traced through explicit pseudocode, extensibility walkthrough checked against both target games), but MEDIUM confidence in the sense that no third-party "guided rules engine" reference implementation was found to benchmark against; this is a from-scratch design for a niche product category.

---
*Architecture research for: data-driven guided-step engine for board game rules flows, static Nuxt 4 PWA, no backend*
*Researched: 2026-08-28*
