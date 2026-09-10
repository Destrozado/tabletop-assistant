# Phase 9: Histórico y estadísticas - Pattern Map

**Mapped:** 2026-09-10
**Files analyzed:** 13 (5 new engine/composable/component files, 4 new/modified pages, 4 modified existing files)
**Analogs found:** 13 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `engine/history.ts` (NEW) | utility (pure engine module) | transform | `engine/selection.ts` (normalization/mutators) + `engine/header.ts` (pure formatter role) | exact (combined) |
| `engine/statistics.ts` (NEW) | utility (pure engine module) | batch/transform (aggregation) | `engine/counters.ts` (`resolveCounterValues`-style aggregation over a collection) | role-match |
| `engine/__tests__/history.test.ts` (NEW) | test | transform | `engine/__tests__/selection.test.ts`, `engine/__tests__/header.test.ts` | exact |
| `engine/__tests__/statistics.test.ts` (NEW) | test | batch | `engine/__tests__/counters.test.ts` | role-match |
| `engine/types.ts` (MODIFIED — additive) | model | CRUD (type definitions) | itself, existing `SessionContext`/`HeroSelection`/`CounterState` additive pattern | exact |
| `app/composables/usePersistedSession.ts` (MODIFIED — additive) | service (storage seam) | file-I/O (localStorage CRUD) | itself — `VOICE_KEY`/`loadVoicePreference`/`saveVoicePreference` as the exact precedent for a second independent key | exact |
| `app/composables/__tests__/usePersistedSession.test.ts` (MODIFIED — additive) | test | file-I/O | itself, existing `describe('tga:voice-enabled — clave independiente...')` block | exact |
| `app/composables/useGameHistory.ts` (NEW, suggested name) | provider/composable (reactive seam) | request-response (wraps engine+storage for dumb components) | `app/composables/useGameSession.ts` (the only existing reactive seam over engine + storage) | role-match |
| `app/components/GameOutcomeDialog.vue` (NEW) | component (dumb dialog) | event-driven | `app/components/ConfirmDialog.vue` | exact |
| `app/components/HistoryEntryCard.vue` (NEW, or inline `v-for`) | component (dumb, presentational) | request-response (render already-formatted data) | `app/components/MesaListaScreen.vue` (dumb, pre-formatted strings by prop) / `app/components/CounterBand.vue` (list-row rendering) | role-match |
| `app/components/HistorySavedNotice.vue` (NEW) | component (dumb, transient notice) | event-driven | `app/components/UpdateBanner.vue` / `app/components/VoiceUnavailableNotice.vue` | exact |
| `app/pages/historico.vue` (NEW route) | route/page | request-response (read localStorage, render list) | `app/components/MesaListaScreen.vue` (custom `h-16` header pattern) + `app/pages/[game]/index.vue` (page-level composition) | role-match |
| `app/pages/estadisticas.vue` (NEW route) | route/page | request-response (read localStorage, render aggregation) | same as above | role-match |
| `app/components/GameSelectorScreen.vue` (MODIFIED — additive) | component (dumb) | event-driven | itself — extend existing button pattern | exact |
| `app/pages/[game]/index.vue` (MODIFIED — `onEndGameConfirm` insertion point) | route/page (controller-like) | event-driven | itself — `onEndGameRequest`/`onEndGameConfirm`/`onDiscardConfirm` | exact |
| `app/app.vue` (MODIFIED — additive) | provider (root layout) | event-driven | itself — existing `<UpdateBanner />` mount | exact |
| `nuxt.config.ts` (MODIFIED — additive) | config | batch (build-time route enumeration) | itself — existing `nitro.prerender.routes` array | exact |

## Pattern Assignments

### `engine/history.ts` (utility, transform) — NEW

**Analogs:** `engine/selection.ts` (defensive normalization + pure mutator discipline) and `engine/header.ts` (pure formatter that returns display-ready strings)

**Imports pattern** (`engine/selection.ts` lines 1-20, header comment style to copy):
```typescript
// engine/selection.ts
// Mutadores puros de la selección de villano/héroes (Fase 6). Mismo
// contrato que `next`/`prev`/`jumpTo` de engine/navigator.ts: reciben un
// `EngineSession` y devuelven uno NUEVO, nunca mutan su argumento.
import type { EngineSession, HeroSelection, SessionContext } from './types'
```
`engine/history.ts` should open the same way: a header comment explaining the file's contract (pure, no Vue/DOM, no zod), then `import { resolvePlayerSlots, resolveVillainId } from './selection'` and `import type { ... } from './types'` — never re-derive selection/villain from `context.selection` raw (see Anti-Patterns below, copied verbatim from RESEARCH.md).

**Core pure-function pattern** (`engine/selection.ts` lines 42-63, `resolvePlayerSlots`/`resolveVillainId` — defensive-by-type, never throws):
```typescript
export function resolvePlayerSlots(
  context: SessionContext,
): { heroId: string | null, playerName: string }[] {
  const length = Number.isInteger(context.playerCount) && context.playerCount > 0
    ? context.playerCount
    : 0
  const selection = context.selection
  const heroes = selection !== null && typeof selection === 'object' && Array.isArray(selection.heroes)
    ? selection.heroes
    : []
  return Array.from({ length }, (_, i) => {
    const entry = heroes[i]
    if (entry === null || typeof entry !== 'object') {
      return { heroId: null, playerName: '' }
    }
    const heroId = typeof entry.heroId === 'string' && entry.heroId.length > 0 ? entry.heroId : null
    const playerName = typeof entry.playerName === 'string'
      ? entry.playerName.slice(0, PLAYER_NAME_MAX_LENGTH)
      : ''
    return { heroId, playerName }
  })
}
```
`buildHistoryEntry` in `engine/history.ts` must call `resolvePlayerSlots(context)` and `resolveVillainId(context)` — never read `context.selection`/`context.selection.villainId` directly (RESEARCH.md Anti-Patterns, explicit).

**Formatter pattern (never `toLocaleDateString`)** — `engine/header.ts` establishes the precedent of "a pure engine function that returns display-ready strings" (`describeHeader` returns `sectionLabel`, already composed). `formatEntryDate`/`formatEntryDuration` in `engine/history.ts` follow the same shape: pure function, no Vue import, returns a finished string, deterministic across locales/CI (D-21). Concrete formatter code is already given in `09-RESEARCH.md` §Pattern 2 (`MONTHS_ES` array + `formatEntryDate`/`formatEntryDuration`) — copy that pattern verbatim, it is already vetted against D-09/D-10/D-21.

**Error handling / "no dato ilegible ≠ error" pattern** (`engine/selection.ts` comment lines 41-49): a value that cannot be trusted is normalized to a safe default, never thrown. Apply the same discipline to any malformed history entry encountered later by `loadHistory()` (see `usePersistedSession.ts` below), not inside `engine/history.ts` itself (which only builds, never reads back).

---

### `engine/statistics.ts` (utility, batch/aggregation) — NEW

**Analog:** `engine/counters.ts` — specifically `resolveCounterValues`'s pattern of deriving a computed row from a base state, and the discipline of iterating with `Number.isFinite`/`Array.isArray` guards rather than trusting shape.

**Core aggregation pattern to copy** (already fully specified in `09-RESEARCH.md` §Pattern 3, verified consistent with D-24/D-26):
```typescript
export interface StatRow {
  id: string
  name: string
  wins: number
  played: number
  pct: number
}

function buildRows(
  entries: GameHistoryEntry[],
  extractIds: (e: GameHistoryEntry) => { id: string, name: string }[],
): StatRow[] {
  const byId = new Map<string, { name: string, wins: number, played: number }>()
  for (const entry of entries) {
    const won = entry.result === 'won'
    const distinctIds = new Map(extractIds(entry).map(x => [x.id, x.name])) // D-26: una vez por id distinto
    for (const [id, name] of distinctIds) {
      const row = byId.get(id) ?? { name, wins: 0, played: 0 }
      row.played += 1
      if (won) row.wins += 1
      byId.set(id, row)
    }
  }
  return Array.from(byId.entries())
    .map(([id, r]) => ({ id, name: r.name, wins: r.wins, played: r.played, pct: r.played > 0 ? Math.round((r.wins / r.played) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || b.played - a.played || a.name.localeCompare(b.name, 'es')) // D-24
}
```
The `.sort()` cascade (`pct desc → played desc → name.localeCompare(..., 'es')`) is the exact D-24 tie-break contract — copy verbatim, do not re-derive.

**Precedent for "compute derived rows over a collection without mutating it"**: `engine/counters.ts::resolveCounterValues` (lines ~103-128) — same discipline of building a new array via `.map`, never touching the input.

---

### `engine/__tests__/history.test.ts` and `engine/__tests__/statistics.test.ts` — NEW

**Analog:** `engine/__tests__/selection.test.ts` (fixture-based, `describe`/`it` blocks named after the invariant being tested — referential-inequality, no-mutation) and `engine/__tests__/header.test.ts` (loads `content/marvel-champions.json` via `validateGameDefinition`, builds an `EngineSession` with `expand()`, then asserts exact string output).

**Imports pattern** (`engine/__tests__/selection.test.ts` lines 1-18):
```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import { /* functions under test */ } from '../selection'
import type { EngineSession, GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))
const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

function baseSession(): EngineSession {
  return expand(tinyGame, context)
}
```
For `history.test.ts`, build a hand-made `EngineSession`/`GameHistoryEntry[]` directly (per RESEARCH.md's "testeable entero contra una sesión y un histórico construidos a mano, sin UI y sin navegador") rather than using the `tiny-game.json` fixture, since `buildHistoryEntry` needs `session.context`/`round`/`gameId`, not a full step sequence.

**Test-naming convention** (`describe` blocks named after the invariant, Spanish prose): copy the style of `describe('desigualdad referencial (Pitfall 1 / SEL-08)', ...)` and `describe('la entrada no se modifica', ...)` — name each `describe` after the decision it verifies (e.g. `describe('D-26: atribución por héroe distinto, no por hueco', ...)`, `describe('D-10: durationMs null cuando no hay startedAt', ...)`).

---

### `engine/types.ts` (model, additive) — MODIFIED

**Analog:** itself — the existing additive-field precedent for `selection?: HeroSelection` and `counters?: CounterState` on `SessionContext` (lines ~135-155 of the current file).

**Pattern to copy exactly:**
```typescript
export interface SessionContext {
  playerCount: number
  difficulty: Difficulty
  selection?: HeroSelection
  counters?: CounterState
  startedAt?: number // epoch ms; D-07: fijado UNA VEZ en start(), nunca reescrito al reanudar
  [key: string]: unknown
}
```
Add `LossCause` and `GameHistoryEntry` as new top-level exports in this same file, following the exact comment-heavy documentation style already used for `HeroSelection`/`CounterState` (explain *why* each field is shaped the way it is, cite the D-numbers). **Never import zod here** (same reasoning already given for `CatalogueHero`/`CatalogueVillain`, DC-03 of Fase 5 — see file header comment: "para que `app/` (Fase 6) pueda tiparlas importando solo `~~/engine/types`, sin que ninguna de sus importaciones alcance un módulo que importa zod").

Full type shape already specified in `09-RESEARCH.md` §"Extensión de `engine/types.ts`" — copy verbatim.

---

### `app/composables/usePersistedSession.ts` (service, file-I/O) — MODIFIED (additive)

**Analog:** itself. `VOICE_KEY` is the exact precedent D-13/Pitfall-3 point to: an independent key living in the same file, with its own read/write functions, never touched by `clear(gameId)`.

**Constant + key pattern** (existing lines ~36-42):
```typescript
const VOICE_KEY = 'tga:voice-enabled'

function storageKey(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`
}
```
Add `const HISTORY_KEY = 'tga:history'` at the same level — **no `gameId` suffix**, exactly like `VOICE_KEY`.

**Read/parse defensive pattern** (existing `load()`, lines ~105-114):
```typescript
function load(gameId: string): PersistedPosition | null {
  const raw = readRaw(storageKey(gameId))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isPersistedPosition(parsed) ? parsed : null
  }
  catch {
    return null
  }
}
```
`loadHistory()` follows the same shape but validates **entry by entry** rather than the whole envelope (D-13's "una entrada rota no tira el resto"). Concrete implementation already given in `09-RESEARCH.md` §"Extensión de usePersistedSession.ts" (`isGameHistoryEntry`, `loadHistory`, `appendHistoryEntry`, `removeHistoryEntry`) — copy that code, it already follows this file's exact conventions (private validator function `isGameHistoryEntry` mirrors `isPersistedPosition`; reuses `readRaw`/`writeRaw`/`removeRaw` unchanged).

**The one deliberate signature break** (D-03, Pitfall 2): every existing function of this shape returns `void` (`save`, `clear`, `saveVoicePreference`). `appendHistoryEntry` must return `boolean` — the only function in this file with that signature, and it must be deliberate/commented as such, matching the header-comment discipline already used throughout this file (e.g. the comment block above `writeRaw` explaining why it swallows exceptions).

**`clear()` must NOT be touched** (Pitfall 3): the existing function is:
```typescript
function clear(gameId: string): void {
  removeRaw(storageKey(gameId))
}
```
Do not add any reference to `HISTORY_KEY` inside this function body — this is the exact mechanism that keeps HIST-09 true.

**Return shape** — the composable's `return { load, save, clear, loadVoicePreference, saveVoicePreference }` object gains `loadHistory, appendHistoryEntry, removeHistoryEntry` in the same flat style.

---

### `app/composables/__tests__/usePersistedSession.test.ts` (test, file-I/O) — MODIFIED (additive)

**Analog:** itself — the existing `describe('tga:voice-enabled — clave independiente de la partida (D-46)', ...)` block (lines ~62-68) is the literal template for a new `describe('tga:history — clave independiente de la partida (D-13)', ...)` block.

**Fake localStorage harness pattern** (lines 1-22, already in the file):
```typescript
function createFakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value) }),
    removeItem: vi.fn((key: string) => { store.delete(key) }),
  }
}
```
Reuse this exact harness. For the D-03 "writeRaw fails silently" test (Open Question 1 in RESEARCH.md), make `setItem` throw once via `vi.fn(() => { throw new Error('quota') })` to simulate private-mode/quota — this is the same technique the harness already supports, just configured to throw for one specific test.

**`clear()` isolation test pattern** (lines ~83-92, `D-46: clear() borra el progreso... pero NUNCA la preferencia de voz`): copy this exact test shape for the new `D-13`/HIST-09 case — `clear(gameId)` must not affect `loadHistory()`'s return value.

---

### `app/composables/useGameHistory.ts` (provider composable, suggested name) — NEW

**Analog:** `app/composables/useGameSession.ts` — the only existing "reactive seam wrapping engine + storage so screens stay dumb" precedent (RESEARCH.md Anti-Patterns: "esta fase necesita un composable hermano... que envuelva `loadHistory`/`appendHistoryEntry`/`removeHistoryEntry`/`aggregateStatistics` para que las pantallas sigan siendo tontas").

**Composable shape to mirror** (`useGameSession.ts` lines 129-148, the `start`/`next`/`prev` pattern — thin wrappers that call an engine pure function and reassign a ref):
```typescript
function start(gameId: string, context: SessionContext) {
  const { getGame } = useGameContent()
  const game = getGame(gameId)
  session.value = game ? expand(game, context) : null
}

function next() {
  if (!session.value) return
  session.value = engineNext(session.value)
}
```
`useGameHistory()` should expose thin wrappers in the same style: `entries` (computed/ref from `loadHistory()`), `remove(id)` (calls `removeHistoryEntry(id)` then reloads/reassigns `entries`), and `statistics` (computed via `aggregateStatistics(entries.value)`). No component should import `~~/engine/*` or `usePersistedSession` directly for history data — same "componentes tontos" discipline `useGameSession` already enforces for step navigation.

---

### `app/components/GameOutcomeDialog.vue` (component, event-driven) — NEW

**Analog:** `app/components/ConfirmDialog.vue` (full file already read, 56 lines)

**Full shell pattern to copy** (`ConfirmDialog.vue` lines 1-24, props/emits/state shape):
```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  destructive: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmPressed = ref(false)
const cancelPressed = ref(false)
</script>
```
`GameOutcomeDialog.vue` replaces this 2-button contract with a 4-emit contract per `09-UI-SPEC.md` Component Inventory: `contextLine: string`, `warningBody: string` props; emits `record: ['won' | 'mainSchemeCompleted' | 'heroesEliminated']` and `dismiss: []`.

**Overlay shell markup to copy exactly** (`ConfirmDialog.vue` lines 26-27, `09-UI-SPEC.md` §Layout 2 extends it with `max-h-[90dvh] overflow-y-auto`):
```html
<div role="dialog" aria-modal="true" class="fixed inset-0 z-50 bg-background flex items-center justify-center px-xl">
  <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg max-h-[90dvh] overflow-y-auto">
```

**Press-feedback button pattern** (`ConfirmDialog.vue` lines 39-52, the `mousedown`/`touchstart`/`mouseup`/`touchend` + `brightness-95 scale-[0.98]` pattern) — reuse verbatim for each of the four buttons, but per the Color hard rule in `09-UI-SPEC.md`, all three recording buttons use the **same neutral chrome** (`bg-surface text-primary-text`), never the `destructive ? 'bg-destructive' : 'bg-accent'` branch `ConfirmDialog` uses for its confirm button — no result is color-coded.

**Wiring pattern in the page** (`app/pages/[game]/index.vue` lines 732-741, existing `ConfirmDialog` instance to be replaced):
```html
<ConfirmDialog
  v-if="awaitingEndConfirm"
  title="¿Dar la partida por terminada?"
  :body="endGameBody"
  confirm-label="Sí, terminar"
  cancel-label="Cancelar"
  :destructive="true"
  @confirm="onEndGameConfirm"
  @cancel="onEndGameCancel"
/>
```
This whole block is swapped for `<GameOutcomeDialog v-if="awaitingEndConfirm" :context-line="..." :warning-body="endGameBody" @record="onOutcomeRecorded" @dismiss="onEndGameCancel" />` — same `v-if="awaitingEndConfirm"` flag, same stacking position (D-U3: right after `IndexOverlay`, before `WarningDetailModal`).

---

### `app/components/HistorySavedNotice.vue` (component, event-driven, transient) — NEW

**Analog:** `app/components/UpdateBanner.vue` (full file, 34 lines) and `app/components/VoiceUnavailableNotice.vue` (full file, 27 lines) — both are the exact "transient dismissible banner mounted in `app.vue`" precedent D-03/09-UI-SPEC §8 point to.

**Shell pattern to copy exactly** (`VoiceUnavailableNotice.vue` lines 11-27):
```html
<div class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md">
  <div class="flex flex-col gap-sm">
    <h2 class="text-heading font-bold text-primary-text">
      {{ heading }}
    </h2>
    <p class="text-body font-normal text-secondary-text">
      {{ body }}
    </p>
  </div>
  <button
    type="button"
    class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
    aria-label="Cerrar aviso"
    @click="emit('dismiss')"
  >
    ✕
  </button>
</div>
```
`HistorySavedNotice.vue` needs a `variant: 'success' | 'failure'` prop (per Component Inventory) controlling the `✓`/accent vs `⚠`/warning glyph+color and whether the second paragraph renders — everything else (dismiss button, banner shell, `bg-surface border-b border-background px-2xl py-lg` chrome) copies verbatim.

**"Composable does the logic, component stays dumb" split** (`UpdateBanner.vue` lines 1-11):
```vue
<script setup lang="ts">
import { useUpdatePrompt } from '~/composables/useUpdatePrompt'
const { showUpdateBanner, dismissUpdate, applyUpdate } = useUpdatePrompt()
</script>
```
Follow the same split: a `useHistorySavedNotice` (or similar) composable owns the auto-dismiss timer and the pending success/failure state; the component itself only reads reactive values and emits dismiss.

**Mount point** (`app/app.vue`, existing):
```html
<ClientOnly>
  <UpdateBanner />
</ClientOnly>
<NuxtPage />
```
Add `<HistorySavedNotice />` alongside `<UpdateBanner />` inside the same `<ClientOnly>` wrapper, same reasoning already documented in the surrounding comment ("app.vue es el único punto compartido por las dos rutas").

---

### `app/pages/historico.vue` and `app/pages/estadisticas.vue` (routes) — NEW

**Analog for the custom 3-zone header:** `app/components/MesaListaScreen.vue` (lines 19-24) — the only existing precedent for a page-specific header instead of reusing `AppHeader.vue`:
```html
<div class="h-dvh flex flex-col">
  <header class="h-16 shrink-0 bg-surface flex items-center justify-between px-lg gap-md">
    <h1 class="text-heading font-bold text-primary-text truncate">
      ✓ Mesa lista
    </h1>
    <span class="text-label font-bold text-secondary-text">{{ sessionContext }}</span>
  </header>
  <main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
```
`historico.vue`/`estadisticas.vue` extend this to 3 zones (`‹ Atrás` left, title center, cross-link right) per `09-UI-SPEC.md` §3 — same `h-16 shrink-0 bg-surface flex items-center justify-between px-lg` header shell, same `flex-1 ... overflow-y-auto` body shell (UI-SPEC specifies `px-2xl py-lg` on the body, matching `VillainPickerModal`'s list-area pattern).

**Analog for page-level composition (route + composable wiring):** `app/pages/index.vue` (full file, 14 lines) — the simplest existing page, showing the "thin page, all logic in composable" discipline:
```vue
<script setup lang="ts">
import { useGameContent } from '~/composables/useGameContent'
const { games } = useGameContent()
function onSelect(gameId: string) {
  navigateTo('/' + gameId)
}
</script>
<template>
  <GameSelectorScreen :games="games" @select="onSelect" />
</template>
```
Both new pages should be similarly thin: call `useGameHistory()` (or equivalent), pass already-formatted data down to `HistoryEntryCard`/table rows as props, handle `navigateTo('/')` / `navigateTo('/estadisticas')` / `navigateTo('/historico')` in the page, never inside a dumb component.

**Delete-confirmation wiring reuses `ConfirmDialog.vue` unmodified** — same `v-if`/`@confirm`/`@cancel` wiring pattern already shown above for the outcome dialog's predecessor.

---

### `app/components/GameSelectorScreen.vue` (component, event-driven) — MODIFIED (additive)

**Analog:** itself — the existing button pattern (lines 32-44) for the "available" game card is the template for the two new secondary buttons, though per D-17/UI-SPEC §1 the new buttons use `ConfirmDialog`'s *non-destructive button* chrome (`min-h-12 px-lg bg-surface text-primary-text text-label font-bold`), not the larger `text-heading` game-card chrome:
```html
<button
  type="button"
  class="min-w-[220px] min-h-[120px] px-2xl py-lg flex items-center justify-center bg-surface text-heading font-bold text-primary-text border-2 transition-transform duration-75 focus-visible:outline-none"
  :class="pressedId === game.id ? 'brightness-95 scale-[0.98] border-accent' : 'border-transparent focus-visible:border-accent'"
  @mousedown="pressedId = game.id"
  @touchstart="pressedId = game.id"
  @mouseup="pressedId = null"
  @touchend="pressedId = null"
  @click="emit('select', game.id)"
>
```
Reuse the same `pressedId`-ref press-feedback mechanism (`mousedown`/`touchstart`/`mouseup`/`touchend`) but at `ConfirmDialog`-button scale for the two new controls, inserted as a `flex gap-md` row below the existing game-card row, per UI-SPEC's explicit "block's structure is not restructured" (D-17). New emits: `open-history: []`, `open-statistics: []` (or the page wires `navigateTo` directly — UI-SPEC leaves either acceptable). Component remains dumb (TECH-04) — mentions no specific game.

---

## Shared Patterns

### Pure-function-with-own-test discipline (applies to `engine/history.ts`, `engine/statistics.ts`)
**Source:** every existing `engine/*.ts` module (`selection.ts`, `counters.ts`, `header.ts`, `toc.ts`, `stepValues.ts`) pairs with `engine/__tests__/*.test.ts`. No exceptions in this codebase.
**Apply to:** both new engine files — each needs its own `__tests__` sibling, testable "sin UI y sin navegador" against a hand-built session/history.

### Reassignment, never in-place mutation (applies to `usePersistedSession.ts` history functions, `useGameHistory.ts`)
**Source:** `engine/selection.ts`/`engine/counters.ts` header comments — "cada mutador devuelve un objeto NUEVO en TODOS los niveles que cambia... porque el `watchDebounced` de `app/pages/[game]/index.vue` NO es profundo."
**Apply to:** `removeHistoryEntry` must build a new `entries` array via `.filter()`, never `.splice()` — same reasoning applies to any reactive `ref` wrapping the history array in `useGameHistory.ts`.
```typescript
function removeHistoryEntry(id: string): void {
  const current = loadHistory()
  const envelope: HistoryEnvelope = {
    formatVersion: HISTORY_FORMAT_VERSION,
    entries: current.filter(e => e.id !== id),
  }
  writeRaw(HISTORY_KEY, JSON.stringify(envelope))
}
```

### "Componentes tontos, sin `~~/engine/*` import" (applies to every new component and every new page)
**Source:** `RESEARCH.md` Anti-Patterns, verified against every existing component in `app/components/` (none imports `~~/engine/*` directly — only `useGameSession.ts`, and now also `useGameHistory.ts`, have that privilege).
**Apply to:** `HistoryEntryCard.vue`, `historico.vue`, `estadisticas.vue`, `GameOutcomeDialog.vue` — all consume already-formatted strings/props from a composable, never call `buildHistoryEntry`/`aggregateStatistics`/`formatEntryDate` themselves.

### Dismissible-banner shell (applies to `HistorySavedNotice.vue`)
**Source:** `app/components/UpdateBanner.vue`, `app/components/VoiceUnavailableNotice.vue`
```html
<div class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md">
  <div class="flex flex-col gap-sm">
    <h2 class="text-heading font-bold text-primary-text">...</h2>
    <p class="text-body font-normal text-secondary-text">...</p>
  </div>
  <button type="button" class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95" aria-label="Cerrar aviso" @click="emit('dismiss')">✕</button>
</div>
```

### "Jugador N" fallback label (applies to `HistoryEntryCard.vue` player rows)
**Source:** `app/composables/useHeroSearch.ts` lines 121-124
```typescript
export function resolvePlayerLabel(slotIndex: number, playerName: string): string {
  const trimmed = String(playerName ?? '').trim()
  return trimmed !== '' ? playerName : `Jugador ${slotIndex + 1}`
}
```
**Apply to:** every player row in `HistoryEntryCard.vue` — never re-derive this fallback locally.

### Frozen Spanish alias resolution (applies to `engine/history.ts`'s caller, likely `useGameHistory.ts` or `onEndGameConfirm`'s replacement handler in `index.vue`)
**Source:** `app/composables/useHeroSearch.ts` lines 65-68
```typescript
export function resolveHeroSpanishName(heroId: string, catalogueName: string): string {
  const alias = spanishHeroAliases[heroId]
  return alias && alias.trim() !== '' ? alias : catalogueName
}
```
**Apply to:** whichever layer resolves `heroName` for `buildHistoryEntry`'s `players[]` — must be `app/` code that calls this function, never `engine/history.ts` itself (which cannot import `app/data/spanish-hero-aliases.ts` — frontier rule already established for zod, DC-03 of Fase 5).

### `formatVersion`-envelope migration point (applies to `usePersistedSession.ts`'s history functions)
**Source:** `engine/persistence.ts`'s `PersistedPosition.formatVersion: 1`
```typescript
export interface PersistedPosition {
  formatVersion: 1
  ...
}
```
**Apply to:** the new `HistoryEnvelope { formatVersion: 1, entries: GameHistoryEntry[] }` wrapper in `usePersistedSession.ts` — same migration-point philosophy, reusing the field name on purpose (D-13).

### Integration point: `onEndGameConfirm` insertion order (applies to `app/pages/[game]/index.vue`)
**Source:** existing function, lines 510-532 (already read in full) — comment `D-U4: orden EXACTO, no cosmético.`
```typescript
function onEndGameConfirm() {
  awaitingEndConfirm.value = false
  isIndexOpen.value = false
  silence()
  // <-- GameOutcomeDialog's record/dismiss handler inserts HERE, reading
  //     session.value.context/round/gameId BEFORE the next two lines run.
  session.value = null
  clear(gameId)
  navigateTo('/')
}
```
**Apply to:** the new outcome-recording handler must run (and finish calling `buildHistoryEntry`+`appendHistoryEntry`) strictly between `silence()` and `session.value = null` — never after. This is the single most load-bearing integration point of the whole phase (Pitfall 1).

### `nitro.prerender.routes` extension (applies to `nuxt.config.ts`)
**Source:** existing array, already read in full
```typescript
nitro: {
  prerender: {
    crawlLinks: false,
    routes: ['/', '/marvel-champions'],
  },
},
```
**Apply to:** append `'/historico'` and `'/estadisticas'` to this exact array. No other block in `nuxt.config.ts` needs touching (Pitfall 4) — verify against a real `nuxt generate` build's `.output/public` directory, per RESEARCH.md's explicit warning not to assume.

## No Analog Found

None. Every file classified in this phase has at least a role-match analog already in the repo — this phase is explicitly scoped (by `09-CONTEXT.md`/`09-RESEARCH.md`) as pure composition over Phase 1/6/7 patterns, introducing zero new architectural shapes.

## Metadata

**Analog search scope:** `engine/`, `engine/__tests__/`, `app/composables/`, `app/composables/__tests__/`, `app/components/`, `app/pages/`, `nuxt.config.ts` — entire relevant surface of the repo for this phase.
**Files scanned:** `engine/selection.ts`, `engine/counters.ts`, `engine/header.ts`, `engine/types.ts`, `engine/persistence.ts`, `engine/__tests__/selection.test.ts`, `engine/__tests__/header.test.ts`, `app/composables/usePersistedSession.ts`, `app/composables/__tests__/usePersistedSession.test.ts`, `app/composables/useGameSession.ts`, `app/composables/useHeroSearch.ts`, `app/composables/useCharacterCatalogue.ts`, `app/data/spanish-hero-aliases.ts`, `app/components/ConfirmDialog.vue`, `app/components/UpdateBanner.vue`, `app/components/VoiceUnavailableNotice.vue`, `app/components/GameSelectorScreen.vue`, `app/components/MesaListaScreen.vue`, `app/components/IndexOverlay.vue`, `app/components/VillainPickerModal.vue`, `app/composables/useStepShortcuts.ts`, `app/pages/index.vue`, `app/pages/[game]/index.vue`, `app/app.vue`, `nuxt.config.ts` — all read directly in this session, not from memory.
**Pattern extraction date:** 2026-09-10
