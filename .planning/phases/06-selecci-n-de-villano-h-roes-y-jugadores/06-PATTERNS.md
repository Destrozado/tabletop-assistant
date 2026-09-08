# Phase 6: Selección de villano, héroes y jugadores - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 12 (6 create, 6 modify)
**Analogs found:** 12 / 12 (one file — the player name `<input>` — has no true UI analog and is flagged explicitly)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `engine/selection.ts` (CREATE) | service (pure engine module) | transform (immutable state → new state) | `engine/navigator.ts` | exact |
| `app/composables/useHeroSearch.ts` (CREATE, name discretionary) | utility (pure) | transform (filter/normalize) | `engine/header.ts` (pure derivation module) + `useStepShortcuts.ts`'s pure-function half | role-match |
| `app/composables/useCharacterCatalogue.ts` (CREATE) | composable/provider | request-response (static lookup) | `app/composables/useGameContent.ts` | exact |
| Spanish hero-alias map (CREATE, e.g. `app/data/spanish-hero-aliases.ts` or embedded) | config (typed data module) | CRUD (read-only lookup) | `content/games-index.ts` | role-match |
| `app/components/VillainPickerModal.vue` (CREATE) | component (modal) | request-response (user picks → emit) | `app/components/WarningDetailModal.vue` (focus/dismiss) + `app/components/IndexOverlay.vue` (title bar, row list) | exact (composite) |
| `app/components/PlayerModal.vue` (CREATE) | component (modal + form) | request-response (user picks/types → emit) | same two, **plus no analog for the text input** (first one in the app) | role-match (input: no analog) |
| `engine/types.ts` (MODIFY) | model (types) | — | itself — extend `StepDefinition`/`SessionContext` following the `warningDetail`/`optionsWarning` optional-field convention | exact |
| `engine/schema.ts` (MODIFY) | model (validation) | — | itself — `z.strictObject` + `superRefine` dependent-field pattern (`warningDetail`/`optionsWarning`) | exact |
| `content/marvel-champions.json` (MODIFY) | config (content data) | — | itself — one new key on `setup.heroes.01` | exact |
| `app/composables/useGameSession.ts` (MODIFY) | composable (reactive seam) | event-driven (mutators reassigning a ref) | itself — existing `next`/`prev`/`jumpTo` wrappers | exact |
| `app/components/StepScreen.vue` (MODIFY) | component (dumb, extended) | request-response (props in, emits out) | itself — existing `options[]` grid block | exact |
| `app/pages/[game]/index.vue` (MODIFY) | route/page (composition root) | event-driven (wiring, focus mgmt) | itself — existing `activeDetail`/`detailTriggerEl` modal wiring, `atajosActivos`, `watchDebounced` | exact |

---

## Pattern Assignments

### `engine/selection.ts` (service, pure engine module) — CREATE

**Analog:** `engine/navigator.ts` (full file, 33 lines)

**Imports pattern** (`engine/navigator.ts:1-5`):
```typescript
// engine/navigator.ts
// next/prev/jumpTo puros sobre EngineSession. ...
import type { EngineSession } from './types'
```
Copy this shape exactly: type-only import of `EngineSession` (and now also `SessionContext`/a new `HeroSelection` type), no Vue/DOM import anywhere in `engine/`.

**Core pattern — pure function, `EngineSession` in, brand-new `EngineSession` out** (`engine/navigator.ts:25-32`, `jumpTo`):
```typescript
export function jumpTo(session: EngineSession, runtimeId: string): EngineSession {
  const cursor = session.sequence.findIndex(node => node.runtimeId === runtimeId)
  if (cursor === -1) {
    // runtimeId desconocido: no lanza, no deja un cursor inválido — sesión sin cambios.
    return session
  }
  // round no cambia — un salto es "mirar", no transicionar de ronda.
  return { ...session, cursor }
}
```
**This is the load-bearing pattern for the whole phase.** RESEARCH.md's own recommended shape for the new file (`06-RESEARCH.md` Q6, verbatim):
```typescript
// engine/selection.ts — NUEVO, puro, mismo estilo que engine/navigator.ts
export function setHero(session: EngineSession, slot: number, heroId: string | null): EngineSession {
  const current = session.context.selection ?? { villainId: null, heroes: [] }
  const heroes = current.heroes.map((h, i) => (i === slot ? { ...h, heroId } : h))
  return {
    ...session,
    context: { ...session.context, selection: { ...current, heroes } },
  }
}
```
Every mutator (`setVillain`, `setHero`, `setPlayerName`, `clearSlot`) must follow this exact shape: **spread at every level that changes** (`{ ...session, context: { ...session.context, selection: { ...current, heroes } } }`), never `session.context.selection.heroes[i].heroId = x`. See "Shared Patterns → Immutable session reassignment" below — this is Pitfall 1, the single highest-value thing to get right in this phase.

**Error handling / no-throw contract** (`engine/navigator.ts:26-30`, comment): unknown/invalid input returns the session unchanged, never throws — same defensive contract `jumpTo` already has for an unknown `runtimeId`. Apply the same style to `setHero`/`clearSlot` for an out-of-range `slot`.

**Test pattern to copy** (`engine/__tests__/navigator.test.ts:1-11`):
```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { flatten } from '../flatten'
import { expand } from '../expand'
import { next, prev, jumpTo } from '../navigator'
import { validateGameDefinition } from '../schema'
import type { GameDefinition, SessionContext } from '../types'
```
New file `engine/__tests__/selection.test.ts` should follow this same import shape and build sessions via `expand()` on a fixture, asserting on the returned `EngineSession` object (never mutating the input and checking the input is unchanged is a good extra assertion given Pitfall 1).

---

### `app/composables/useHeroSearch.ts` (utility, pure) — CREATE

**Analog:** No direct precedent for search/filter, but the **pure-function-with-duck-typed-input, fully tested, zero DOM** convention is already established twice: `engine/header.ts` (pure derivation) and the pure half of `app/composables/useStepShortcuts.ts` (`resolveShortcutAction`, `isEditableTarget`).

**Core pattern — pure, total function, node-testable** (`app/composables/useStepShortcuts.ts:114-123`, `isEditableTarget`):
```typescript
// Contrato: acepta la forma de pato (tagName?/isContentEditable?) para poder
// pasarle `event.target` real en el cableado sin un cast a un tipo del DOM.
export function isEditableTarget(target: { tagName?: string, isContentEditable?: boolean } | null): boolean {
  if (!target) return false
  if (target.isContentEditable) return true
  const tag = target.tagName?.toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
```
Same total-function discipline (never throws, returns a sensible default for missing/invalid input) applies to `normalizeForSearch`/`matchesHeroQuery`.

**Recommended shape** (from `06-RESEARCH.md` Q4, already vetted against the real catalogue's 23 heroes):
```typescript
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // marcas diacríticas combinantes, incluida la tilde de ñ
}

export function matchesHeroQuery(
  query: string,
  hero: { spanishAlias: string, catalogueName: string, alterEgo: string },
): boolean {
  if (!query.trim()) return true
  const q = normalizeForSearch(query)
  return [hero.spanishAlias, hero.catalogueName, hero.alterEgo]
    .some(field => normalizeForSearch(field).includes(q))
}
```

**Test pattern to copy** (`app/composables/__tests__/useStepShortcuts.test.ts:1-19`):
```typescript
import { describe, expect, it } from 'vitest'
import { isEditableTarget, resolveShortcutAction, shortcutsEnabled } from '../useStepShortcuts'
import type { ShortcutKeyEvent, ShortcutState } from '../useStepShortcuts'

// Helper local: todo en false/vacío por defecto, se sobrescribe solo el
// campo relevante para que cada test se lea de un vistazo.
function keyEvent(overrides: Partial<ShortcutKeyEvent> & { key: string }): ShortcutKeyEvent {
  return { repeat: false, ctrlKey: false, /* ... */ ...overrides }
}
```
This file lives in `app/composables/__tests__/`, runs in the `app-logic` Vitest project (`environment: 'node'`, no DOM) — same project the new `useHeroSearch.test.ts` must target. **Do not** invent a jsdom/component-test environment (see Shared Patterns → No component-test environment).

Also co-locate the name-join formula here (`A` / `A y B` / `A, B y C`, shared by the `ya:` marker and the grid's `⚠` line, per UI-SPEC's Decision 9) and the duplicate-hero detection function — both are pure and must be unit-testable the same way.

---

### `app/composables/useCharacterCatalogue.ts` (composable/provider) — CREATE

**Analog:** `app/composables/useGameContent.ts` (full file, 22 lines)

**Full pattern to copy verbatim, only renaming types/variables** (`app/composables/useGameContent.ts:1-23`):
```typescript
// app/composables/useGameContent.ts
// Acceso al contenido de juegos. Import ESTÁTICO en build (Anti-Patrón 3 de
// ARCHITECTURE.md: sin llamadas de red en tiempo de ejecución — el contenido se
// conoce en build y debe funcionar sin conexión, offline-first). NO importa
// `~~/engine/schema`: la validación de esquema es exclusiva de build/CI
// (TECH-02); el validador de esquema no debe entrar en el bundle del navegador.
import type { GameDefinition } from '~~/engine/types'
import { games as gamesIndex, type GameIndexEntry } from '~~/content/games-index'
import marvelChampions from '~~/content/marvel-champions.json'

const gamesById: Record<string, GameDefinition> = {
  'marvel-champions': marvelChampions as GameDefinition,
}

export function useGameContent() {
  const games: GameIndexEntry[] = gamesIndex

  function getGame(gameId: string): GameDefinition | null {
    return gamesById[gameId] ?? null
  }

  return { games, getGame }
}
```
Apply directly (RESEARCH.md Q3 already gives this exact recommendation, verified as **not yet existing anywhere in `app/`**):
```typescript
import type { CharacterCatalogue } from '~~/engine/types'
import marvelCharacters from '~~/content/marvel-characters.json'

const cataloguesById: Record<string, CharacterCatalogue> = {
  'marvel-champions': marvelCharacters as CharacterCatalogue,
}

export function useCharacterCatalogue() {
  function getCatalogue(gameId: string): CharacterCatalogue | null {
    return cataloguesById[gameId] ?? null
  }
  return { getCatalogue }
}
```
**Critical constraint carried over:** never import `~~/engine/schema` or `zod` here (T-01-19) — same header-comment discipline as the analog.

---

### Spanish hero-alias map (CREATE — location discretionary per CONTEXT.md, e.g. `app/data/spanish-hero-aliases.ts`)

**Analog:** `content/games-index.ts` (full file, 13 lines) — the established shape for a small, typed, committed data module living outside `content/marvel-*.json`.

```typescript
// content/games-index.ts
export interface GameIndexEntry {
  id: string
  title: string
  status: 'available' | 'coming-soon'
}

export const games: GameIndexEntry[] = [
  { id: 'marvel-champions', title: 'Marvel Champions', status: 'available' },
  { id: 'warhammer-40k', title: 'Warhammer 40.000', status: 'coming-soon' },
]
```
Apply the same shape: a plain exported `Record<string, string>` or array keyed by catalogue hero `id` (from `content/marvel-characters.json`, e.g. `'spider-man'`, `'captain-marvel'`), mapping to the Spanish alias string. **Must never live in `content/marvel-champions.json` or `content/marvel-characters.json`** (D-05) — this is UI-layer data, versioned by commit, same lifecycle as the catalogue but a separate file/module. A missing entry must fall back to the catalogue's English `name` — never throw, never render `undefined`.

---

### `app/components/VillainPickerModal.vue` (component) — CREATE

**Analogs:** `app/components/WarningDetailModal.vue` (focus/dismiss mechanics, full file 80 lines) + `app/components/IndexOverlay.vue` (title bar, scrollable row list)

**Focus + three-dismiss-paths pattern to copy verbatim** (`app/components/WarningDetailModal.vue:14-48`):
```typescript
import { onMounted, onUnmounted, ref } from 'vue'

const emit = defineEmits<{
  dismiss: []
}>()

const dismissButton = ref<HTMLButtonElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('dismiss')
  }
}

onMounted(() => {
  dismissButton.value?.focus()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
```
Template scrim/panel/`click.self` shell (`app/components/WarningDetailModal.vue:51-59`):
```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="warning-detail-heading"
  class="fixed inset-0 z-50 bg-background/80 flex items-center justify-center px-xl"
  @click.self="emit('dismiss')"
>
  <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
```
For `VillainPickerModal.vue`, per `06-UI-SPEC.md` §Layout 3, add `max-h-[80vh]` and change the inner panel to `flex flex-col` (WarningDetailModal's panel isn't scrollable; this one is) — take the title-bar markup instead from `IndexOverlay.vue:79-91`:
```html
<div class="h-16 shrink-0 flex items-center justify-between px-lg border-b border-background">
  <h1 class="text-heading font-bold text-primary-text truncate">
    {{ title }}
  </h1>
  <button
    type="button"
    class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
    aria-label="Cerrar índice"
    @click="emit('close')"
  >
    ✕
  </button>
</div>
```
and the scrollable-body wrapper from `IndexOverlay.vue:93-94` (`class="flex-1 overflow-y-auto ..."`).

**Row anatomy** — reuses `StepScreen.vue`'s `options[]` row button class list (see StepScreen section below) with a trailing `✓` (accent) instead of `›`, per `06-UI-SPEC.md` §Layout 3's exact markup (already fully specified there — copy that markup directly, it is a design contract, not just a suggestion).

**No filter field** (D-10) — this is the one deliberate simplification vs. `PlayerModal.vue`.

---

### `app/components/PlayerModal.vue` (component) — CREATE

**Analogs:** same two as above (`WarningDetailModal.vue` for focus/dismiss, `IndexOverlay.vue` for title bar/scroll), **plus explicitly: no analog exists for the text inputs.**

**Flag for the executor:** `PlayerModal.vue`'s `Nombre` field and the hero-filter field are **the first text `<input>` elements in the entire app.** There is no existing `<input>` anywhere in `app/components/` or `app/pages/` to copy interaction/focus-guard behavior from — `06-UI-SPEC.md` §Spacing Scale explicitly calls this out too ("These are the first text inputs in the app, so there was no precedent to inherit"). The full visual contract for both inputs is already specified in `06-UI-SPEC.md` §Layout 4 (verbatim Tailwind class list below) — use that as the source of truth, not a codebase analog:
```html
<input class="w-full min-h-12 px-md bg-background text-body font-normal
              text-primary-text placeholder:text-secondary-text
              border-b-2 border-transparent focus:border-accent outline-none" />
```

**Focus/dismiss mechanics:** identical copy from `WarningDetailModal.vue` as `VillainPickerModal.vue` above, with one addition — on open, focus goes to the `✕` button, **never** to the Nombre or filter field (D-09): do **not** call `.focus()` on either input in `onMounted`, only on `dismissButton`.

**The real trap this component must not reproduce (D-12, verified in `06-RESEARCH.md` Q5):** `useStepShortcuts`'s `shortcutsEnabled` already turns off Espacio/Enter whenever `hasActiveDetail`-equivalent is true (see Shared Patterns below) — this component itself needs no special-case code, but **the page must be told this modal is open**, exactly the same way it's already told about `WarningDetailModal` via `activeDetail`. See `app/pages/[game]/index.vue` pattern assignment below.

**Hero row anatomy, ✓/`ya:` co-occurrence** — fully specified markup already exists in `06-UI-SPEC.md` §Layout 4 (two-line row, `flex flex-col items-start gap-xs`), copy that block verbatim; it is a locked design contract, not something to reinvent from a codebase analog.

---

### `engine/types.ts` (MODIFY)

**Analog:** the existing `warningDetail`/`optionsWarning` dependent-optional-field additions in `TextBlock` (`engine/types.ts:19-41`):
```typescript
export interface TextBlock {
  text: string
  warning?: string
  // D-32: consecuencia detallada del aviso, opcional y dependiente de
  // `warning` (un paso no puede declarar el campo siguiente sin este —
  // regla de esquema en engine/schema.ts). Alimenta WarningDetailModal.vue.
  warningDetail?: string
  options?: StepOption[]
  optionsWarning?: string
  optionsWarningDetail?: string
  speech?: string
}
```
The comment-every-field discipline (why the field exists, what schema rule guards it, what UI it feeds) is the convention to continue. Apply to `StepDefinition` (add `selection?: 'characters'` as a sibling of `kind`, per D-02/Q1 — **not** inside `TextBlock`, since it has no dependent-field pair and doesn't vary by difficulty) and to `SessionContext` (add `selection?: HeroSelection`, a new exported interface, per D-19 — additive, `formatVersion`/`contentVersion` untouched).

Recommended new type shape (from `06-RESEARCH.md` Code Examples, already vetted against `resume()`):
```typescript
export interface HeroSelection {
  villainId: string | null
  heroes: { heroId: string | null, playerName: string }[]
}

export interface SessionContext {
  playerCount: number
  difficulty: Difficulty
  selection?: HeroSelection
  [key: string]: unknown
}
```

---

### `engine/schema.ts` (MODIFY)

**Analog:** the existing `z.strictObject` pattern + the `kind` field's placement in `StepSchema` (not `TextBlockSchema`) — `engine/schema.ts:68-79`:
```typescript
const StepSchema = TextBlockSchema.extend({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  kind: z.enum(['step', 'summary']).default('step'),
  variants: z.strictObject({ /* ... */ }).optional(),
  citation: CitationSchema.optional(),
})
```
Add as a sibling of `kind`, **not** inside `TextBlockSchema` (Pitfall 2 explicitly warns against this — it would wrongly inherit the `.partial()` per-difficulty-variant mechanism):
```typescript
selection: z.enum(['characters']).optional(),
```
**No new `superRefine` rule needed** — unlike `warningDetail`/`optionsWarning`, this is a solitary flag with no dependent field that could be orphaned.

**Dependent-field validation pattern for reference** (if any future field of this phase needs it) — `engine/schema.ts:137-142`:
```typescript
if (step.warningDetail !== undefined && step.warning === undefined) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Step "${step.id}" declares warningDetail without warning`,
  })
}
```

---

### `content/marvel-champions.json` (MODIFY)

**Change:** add `"selection": "characters"` to the single step object below, **no other key touched, zero characters of `text`/`speech` changed** (verified voice-drift-gate-safe per RESEARCH.md Q2):
```json
{
  "id": "setup.heroes.01",
  "title": "Elegir villano y héroes",
  "kind": "step",
  "text": "Decidid, como grupo, qué villano vais a enfrentar y qué héroe llevará cada jugador.",
  "speech": "Decidid como grupo el villano al que os enfrentaréis y el héroe de cada jugador.",
  "citation": { "source": "rules-reference", "section": "Apéndice II, pasos 1 y 8 (decisión de escenario adelantada)", "page": 49 }
}
```
becomes (only the new key added):
```json
{
  "id": "setup.heroes.01",
  "title": "Elegir villano y héroes",
  "kind": "step",
  "selection": "characters",
  "text": "...",
  "speech": "...",
  "citation": { "...": "..." }
}
```

---

### `app/composables/useGameSession.ts` (MODIFY)

**Analog:** itself — the existing `next`/`prev`/`jumpTo` wrappers (`app/composables/useGameSession.ts:25-38`):
```typescript
function next() {
  if (!session.value) return
  session.value = engineNext(session.value)
}

function prev() {
  if (!session.value) return
  session.value = enginePrev(session.value)
}

function jumpTo(runtimeId: string) {
  if (!session.value) return
  session.value = engineJumpTo(session.value, runtimeId)
}
```
New mutators must follow this exact shape — guard clause on `!session.value`, then **reassign** `session.value` to the return value of the pure `engine/selection.ts` function, never mutate a nested property:
```typescript
function setHero(slot: number, heroId: string | null) {
  if (!session.value) return
  session.value = engineSetHero(session.value, slot, heroId)
}
```
Also add the `playerRows` computed here (per RESEARCH.md Q8), deriving row count from `context.playerCount`, never from `selection.heroes.length` directly — defends against both "no selection yet" (D-20) and a stale/mismatched persisted array in one stroke:
```typescript
const playerRows = computed(() => {
  if (!session.value?.context.selection) {
    return Array.from({ length: session.value?.context.playerCount ?? 0 }, () => ({ heroId: null, playerName: '' }))
  }
  const { playerCount } = session.value.context
  const heroes = session.value.context.selection.heroes
  return Array.from({ length: playerCount }, (_, i) => heroes[i] ?? { heroId: null, playerName: '' })
})
```

---

### `app/components/StepScreen.vue` (MODIFY)

**Analog:** itself — the existing `options[]` grid block (`app/components/StepScreen.vue:38-53`), which D-01 explicitly says to reuse:
```html
<div v-if="options && options.length" class="w-full flex flex-col items-center gap-sm">
  <p class="text-label font-bold uppercase text-secondary-text">
    Opciones
  </p>
  <div class="w-full max-w-[720px] grid grid-cols-1 sm:grid-cols-2 gap-x-lg">
    <button
      v-for="(option, index) in options"
      :key="option.label"
      type="button"
      class="w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left text-body font-normal text-primary-text border-b border-accent/50 transition-transform duration-75 active:brightness-95"
      @click="emit('open-option-detail', index)"
    >
      <span>{{ option.label }}</span>
      <span class="text-accent">›</span>
    </button>
  </div>
```
New `selectionRows` grid reuses this exact row button class list (`min-h-12 px-md py-sm flex items-center justify-between gap-md text-left text-body font-normal border-b border-accent/50 transition-transform duration-75 active:brightness-95`) but **single-column only** (`grid-cols-1`, no `sm:grid-cols-2` — D-04 explicitly rejects 2-column here), and adds a middle "current value" span the `options[]` row doesn't have (per `06-UI-SPEC.md` §Layout 1's fully-specified markup — use that markup verbatim, it's an approved contract, not a free variation).

**Clickable-vs-non-clickable `⚠` distinction — the second most important pattern, copy verbatim** (`app/components/StepScreen.vue:54-64`):
```html
<button
  v-if="optionsWarningText && optionsWarningDetailText"
  type="button"
  class="min-h-12 px-md py-sm text-body font-normal text-warning border-b border-warning/50 transition-transform duration-75 active:brightness-95"
  @click="emit('open-options-warning-detail')"
>
  ⚠ {{ optionsWarningText }} ›
</button>
<p v-else-if="optionsWarningText" class="text-body font-normal text-warning">
  ⚠ {{ optionsWarningText }}
</p>
```
The repeated-hero `⚠` line (D-16) **must use only the `<p>` branch** — a plain `<p class="text-body font-normal text-warning">⚠ {{ duplicateWarningText }}</p>`, **never** the `<button>` branch: no border, no chevron, not clickable, exactly D-32's rule (already codified in this exact component for `optionsWarningText`/`warningText` with no detail).

**Props/emits convention to extend** (`app/components/StepScreen.vue:5-30`): add `selectionRows: {...}[] | null` and `duplicateWarningText: string | null` as new optional props (null = not a selection step), and a new `select-row: [key: string]` emit, following the existing `defineProps<{...}>()` / `defineEmits<{...}>()` style exactly.

---

### `app/pages/[game]/index.vue` (MODIFY)

**Analog:** itself — the existing `activeDetail`/`detailTriggerEl` modal wiring and focus-return (`app/pages/[game]/index.vue:215-256`):
```typescript
const activeDetail = ref<{ heading: string, body: string, tone: 'warning' | 'neutral' } | null>(null)
const detailTriggerEl = ref<HTMLElement | null>(null)

function onOpenWarningDetail() {
  detailTriggerEl.value = document.activeElement as HTMLElement | null
  activeDetail.value = {
    heading: currentText.value.warning ?? '',
    body: currentText.value.warningDetail ?? '',
    tone: 'warning',
  }
}

function onDismissDetail() {
  activeDetail.value = null
  detailTriggerEl.value?.focus()
}
```
New modal wiring (`activeSelectionModal`) must follow this exact shape: capture `document.activeElement` at the moment the grid row is tapped, store it, and call `.focus()` on it when the modal closes — same "capture at call site, componente tonto emits without focus payload" discipline the comment at `index.vue:208-214` documents.

**Recommended new ref (per RESEARCH.md Q5, already reasoned against the codebase's actual `atajosActivos` computed):**
```typescript
const activeSelectionModal = ref<{ kind: 'villain' } | { kind: 'player', slot: number } | null>(null)
```

**`atajosActivos` computed — add the new flag here, do not touch `shortcutsEnabled` itself** (`app/pages/[game]/index.vue:397-411`):
```typescript
const atajosActivos = computed(() =>
  shortcutsEnabled({
    resumeResolved: resumeResolved.value,
    hasSession: session.value !== null,
    awaitingResumeChoice: awaitingResumeChoice.value,
    awaitingContentChangedAck: awaitingContentChangedAck.value,
    awaitingDiscardConfirm: awaitingDiscardConfirm.value,
    awaitingEndConfirm: awaitingEndConfirm.value,
    isIndexOpen: isIndexOpen.value,
    hasActiveDetail: activeDetail.value !== null,
  }),
)
```
Change only the last line to:
```typescript
hasActiveDetail: activeDetail.value !== null || activeSelectionModal.value !== null,
```
**Do not reimplement any part of this condition inline anywhere else** (D-Q2) — `shortcutsEnabled` itself (in `useStepShortcuts.ts`) stays untouched.

**The persistence "free lunch" — no new plumbing needed** (`app/pages/[game]/index.vue:120-133`):
```typescript
// PERS-01: guardado automático al cambiar de paso, con debounce para no
// escribir en cada tecla de una ráfaga de taps. `session` se reasigna por
// completo en cada next/prev/jumpTo (nunca se muta in situ), así que un watch
// no profundo ya detecta cada cambio de cursor/round/context.
watchDebounced(
  session,
  (value) => {
    if (!value) return
    save(value)
  },
  { debounce: 300 },
)
```
plus the `pagehide` flush (`app/pages/[game]/index.vue:147-149`):
```typescript
useEventListener('pagehide', () => {
  if (session.value) save(session.value)
})
```
**Both already cover SEL-08 for the new selection mutators with zero new code here** — but **only if** every mutator added to `useGameSession.ts` reassigns `session.value` per the pattern above. This `watchDebounced` is confirmed **not deep** — this is exactly the trap the emphasis section calls out (see Shared Patterns below).

---

## Shared Patterns

### Immutable session reassignment (the phase's single highest-value pattern)

**Source:** `engine/navigator.ts` (pure functions) + `app/composables/useGameSession.ts:25-38` (reassignment) + `app/pages/[game]/index.vue:120-133` (non-deep `watchDebounced`) + `app/pages/[game]/index.vue:126-129` comment.

**Apply to:** `engine/selection.ts` (new pure functions), `useGameSession.ts` (new mutators), any component handler that calls a mutator.

The mechanism, end to end:
1. A pure function in `engine/` takes an `EngineSession` and returns **a brand-new object at every level that changes** — never mutates its argument.
2. `useGameSession.ts`'s mutator does exactly one thing: `session.value = engine<Fn>(session.value, ...)`. It never writes `session.value.context.something = x`.
3. `app/pages/[game]/index.vue`'s `watchDebounced(session, ..., { debounce: 300 })` has **no `{ deep: true }`** — it only fires when `session.value`'s reference itself changes, which only happens if step 2 is followed correctly.

**Why this matters more than usual here:** Vue 3 wraps a `ref`'s object value in a deep reactive proxy, so an in-place nested mutation (`session.value.context.selection.heroes[0].heroId = x`) **would still update the on-screen grid** — the bug is invisible while developing and manually clicking through the app. It only manifests as data loss **after a page reload**, because the non-deep `watchDebounced` never fired and nothing was persisted. This is Pitfall 1 from RESEARCH.md, verified directly against `useGameSession.ts:17` and the code comment at `index.vue:120-123`.

```typescript
// CORRECT — engine/selection.ts
export function setHero(session: EngineSession, slot: number, heroId: string | null): EngineSession {
  const current = session.context.selection ?? { villainId: null, heroes: [] }
  const heroes = current.heroes.map((h, i) => (i === slot ? { ...h, heroId } : h))
  return { ...session, context: { ...session.context, selection: { ...current, heroes } } }
}

// CORRECT — useGameSession.ts
function setHero(slot: number, heroId: string | null) {
  if (!session.value) return
  session.value = engineSetHero(session.value, slot, heroId)
}
```
```typescript
// WRONG — passes visually, breaks SEL-08 silently on reload
function setHero(slot: number, heroId: string | null) {
  if (!session.value?.context.selection) return
  session.value.context.selection.heroes[slot].heroId = heroId // in-place nested mutation
}
```

### `options[]` grid row markup and clickable-vs-non-clickable `⚠`

**Source:** `app/components/StepScreen.vue:38-77` (full block, already quoted above under its own file entry).

**Apply to:** the new selection grid inside `StepScreen.vue` (D-01, D-16) and both new modals' row anatomy (`VillainPickerModal.vue`, `PlayerModal.vue`), per `06-UI-SPEC.md` §Layout 1-4's fully specified markup.

Two rules to preserve verbatim:
1. Row button class list: `w-full min-h-12 px-md py-sm flex items-center justify-between gap-md text-left text-body font-normal border-b border-accent/50 transition-transform duration-75 active:brightness-95`, trailing `<span class="text-accent">›</span>` (or `✓` inside a modal).
2. A `⚠` line with no detail is **always** a plain `<p class="text-body font-normal text-warning">`, never a `<button>` — no border, no chevron. This is D-32, applied here to the repeated-hero warning line, and it must not open `WarningDetailModal.vue` (which stays un-retrofitted per CONTEXT.md's explicit "no discrecional" note).

### Modal focus/dismiss (three equivalent paths)

**Source:** `app/components/WarningDetailModal.vue:14-48, 51-59` (full pattern, already quoted above).

**Apply to:** `VillainPickerModal.vue`, `PlayerModal.vue` — `onMounted` focuses a safe default element (the `✕` button, **not** any text input for `PlayerModal.vue`, per D-09), a `window`-level `keydown` listener maps `Escape` to `emit('dismiss')`, `@click.self` on the scrim does the same, and `onUnmounted` removes the listener. Title bar borrowed from `IndexOverlay.vue:79-91` (`h-16 shrink-0 flex items-center justify-between px-lg border-b border-background`).

### `z.strictObject` + `StepSchema` sibling-of-`kind` placement for new step-level flags

**Source:** `engine/schema.ts:68-79` (`StepSchema.extend({...})`) and the dependent-field `superRefine` pattern at `engine/schema.ts:137-142`.

**Apply to:** `selection: z.enum(['characters']).optional()` in `engine/schema.ts`, mirrored by `selection?: 'characters'` in `engine/types.ts`'s `StepDefinition`. No `superRefine` rule needed for this specific field (it has no dependent sibling), but any future dependent field must follow the `warningDetail`/`warning` orphan-check pattern shown there.

### Keyboard-shortcut suppression while a modal is open

**Source:** `app/composables/useStepShortcuts.ts:101-112` (`shortcutsEnabled`, pure, already tested) + `app/pages/[game]/index.vue:397-411` (`atajosActivos`, the only call site that needs to change).

**Apply to:** both new modals, via `app/pages/[game]/index.vue`'s new `activeSelectionModal` ref feeding into the existing `hasActiveDetail` argument of `shortcutsEnabled`. **Never** re-implement any part of `shortcutsEnabled`'s condition inline in a component or in `index.vue` — the function itself does not change, only what gets passed to it.

---

## No Analog Found

| File/Element | Role | Data Flow | Reason |
|---|---|---|---|
| `PlayerModal.vue`'s `Nombre` `<input>` and hero-filter `<input>` | component (form field) | request-response | These are the app's first text `<input>` elements — no existing component anywhere in `app/` uses one. `06-UI-SPEC.md` §Layout 4 and §Spacing Scale ("first text inputs in the app") already supply a complete, locked visual/behavioral contract (class list, `maxlength="14"`, no-autofocus, `@input` save-on-keystroke) — use that document as the source of truth for this one element, not a codebase analog. |

---

## Metadata

**Analog search scope:** `engine/*.ts` (schema, types, navigator, persistence, header, audio), `engine/__tests__/*.test.ts`, `app/composables/*.ts` (useGameContent, useGameSession, useStepShortcuts) and their `__tests__/`, `app/components/*.vue` (StepScreen, WarningDetailModal, IndexOverlay, MiniSetupScreen), `app/pages/[game]/index.vue`, `content/*.json`, `content/games-index.ts`.
**Files scanned:** 16 read in full or in targeted non-overlapping sections; 2 additional files sampled via Python/JSON for content shape only (`content/marvel-champions.json`'s `setup.heroes.01` step, `content/marvel-characters.json`'s hero/villain shape and counts).
**Pattern extraction date:** 2026-09-08
