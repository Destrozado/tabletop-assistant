# Phase 7: Banda de contadores y compatibilidad de sesión - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 8 (3 create, 5 modify)
**Analogs found:** 8 / 8 — every file in this phase has an exact, already-shipped,
already-verified analog inside this same repo (Phase 6). This phase is a structural
copy, not a new pattern.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `engine/counters.ts` (CREATE) | service (pure engine module) | transform (immutable state → new state) | `engine/selection.ts` (full file) | exact |
| `engine/__tests__/counters.test.ts` (CREATE) | test | transform / CRUD | `engine/__tests__/selection.test.ts` (full file) | exact |
| `engine/types.ts` (MODIFY — `SessionContext.counters?`) | model (types) | — | itself — the existing `selection?: HeroSelection` field and its header comment | exact |
| `engine/__tests__/persistence.test.ts` (MODIFY — add D-21 `describe` block) | test | request-response (resume) | itself — the existing `D-20` `describe` block, same file | exact |
| `app/components/CounterBand.vue` (CREATE) | component (dumb) | request-response (props in, emits out) | `app/components/NavBand.vue` (full file, 49 lines) | exact |
| `app/composables/useGameSession.ts` (MODIFY — new computeds + 4 mutator wrappers) | composable (reactive seam) | event-driven (mutators reassigning a ref) | itself — existing `setVillain`/`setHero`/`setPlayerName` wrappers + `showsSelectionGrid` computed | exact |
| `app/composables/useStepShortcuts.ts` (MODIFY — one comment line, zero logic) | utility (pure, documented) | — | itself — the existing `D-Q1` comment block style | exact |
| `app/pages/[game]/index.vue` (MODIFY — mount `<CounterBand>` as new sibling) | route/page (composition root) | event-driven (wiring, template composition) | itself — existing `AppHeader`/`VoiceUnavailableNotice`/`StepScreen`/`NavBand` template stack and `watchDebounced`/`pagehide` block | exact |

No files in this phase lack an analog. `content/marvel-characters.json` (read-only data
source, not modified) and `app/composables/useCharacterCatalogue.ts` (unmodified,
already-established access point) are reference sources, not files this phase creates or
edits — listed under Shared Patterns below.

---

## Pattern Assignments

### `engine/counters.ts` (service, pure engine module) — CREATE

**Analog:** `engine/selection.ts` (full file, 140 lines, this repo)

**Header-comment pattern to copy verbatim in spirit** (`engine/selection.ts:1-18`):
```typescript
// engine/selection.ts
// Mutadores puros de la selección de villano/héroes (Fase 6). Mismo
// contrato que `next`/`prev`/`jumpTo` de engine/navigator.ts: reciben un
// `EngineSession` y devuelven uno NUEVO, nunca mutan su argumento.
//
// Regla dura de esta fase (Pitfall 1 / SEL-08): cada mutador devuelve un
// objeto NUEVO en TODOS los niveles que cambia — `session`, `context`,
// `selection`, `heroes` y la entrada tocada — porque el `watchDebounced`
// de `app/pages/[game]/index.vue` NO es profundo. ...
import type { EngineSession, HeroSelection, SessionContext } from './types'
```
`engine/counters.ts`'s header should state the same non-negotiable reassignment
contract, adapted to `counters`/`villainHealth`/`heroHealth`.

**Constant-reuse pattern** (`engine/selection.ts:20-25`):
```typescript
export const PLAYER_NAME_MAX_LENGTH = 14
```
D-04 requires `engine/counters.ts` to `import { PLAYER_NAME_MAX_LENGTH } from './selection'`
(or wherever the label-building lives) rather than declaring a second constant.

**Defensive normalization pattern to copy — `resolvePlayerSlots`** (`engine/selection.ts:38-69`):
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
`resolveCounters(context) → { villainHealth: number|null, heroHealth: (number|null)[] }`
is the structural twin: length always derived from `context.playerCount` (never from
`counters.heroHealth.length`, per the Claude's-Discretion trap named in `07-CONTEXT.md`),
each entry validated by `typeof x === 'number' ? x : null`, never throws, never returns
`undefined` inside the array. RESEARCH.md already drafted this exact function
(`resolveCounters` skeleton) — treat that draft as the target output, cross-checked
against this analog's actual shape.

**Mutator pattern to copy — `setHero`'s no-op-on-invalid-slot + full reassignment**
(`engine/selection.ts:96-114`):
```typescript
export function setHero(session: EngineSession, slot: number, heroId: string | null): EngineSession {
  const { playerCount } = session.context
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerCount) {
    return session // no-op, never throws
  }
  const current = session.context.selection ?? emptySelection(playerCount)
  const heroes = resolvePlayerSlots(session.context).map((entry, i) =>
    i === slot ? { ...entry, heroId } : entry)
  return {
    ...session,
    context: {
      ...session.context,
      selection: { ...current, heroes },
    },
  }
}
```
`incrementHero(session, slot)` / `decrementHero(session, slot)` follow this exact
5-level-reassignment shape (`session` → `context` → `counters` → `heroHealth` array →
the touched entry), reading the current array via `resolveCounters`-style defensive
getter, computing the new value (`null` → live-calculated value ± 1, clamped at 0 on
decrement per D-15, never clamped on increment per D-11/D-18), and validating `slot`
range with the identical no-op-same-reference guard. `incrementVillain`/`decrementVillain`
are the same shape without the `slot` parameter (single value, no array indexing).

**Error handling / validation style:** No `try/catch` anywhere in this file — validation
is entirely "check the type/range, return early with the unchanged reference," never a
thrown exception. `engine/counters.ts` must follow this exact style: no `throw`
statement anywhere, matching the header comment's "nunca lanza" discipline that
`engine/persistence.ts::isValidContext` and `resolvePlayerSlots` both already establish.

---

### `engine/__tests__/counters.test.ts` (test) — CREATE

**Analog:** `engine/__tests__/selection.test.ts` (full file, 292 lines, this repo)

**Fixture/setup pattern** (`engine/__tests__/selection.test.ts:1-22`):
```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import {
  PLAYER_NAME_MAX_LENGTH,
  emptySelection,
  resolvePlayerSlots,
  resolveVillainId,
  setHero,
  setPlayerName,
  setVillain,
} from '../selection'
import type { EngineSession, GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

const context: SessionContext = { playerCount: 3, difficulty: 'normal' }

function baseSession(): EngineSession {
  return expand(tinyGame, context)
}
```
Reuse `tinyGame`/`expand`/`baseSession()` identically; the counters test file needs the
real `content/marvel-characters.json` catalogue too (for precharge-value assertions),
loaded the same way `persistence.test.ts` loads `marvel-champions.json` (see below).

**Referential-inequality test block to copy the shape of** (`engine/__tests__/selection.test.ts:25-40`):
```typescript
describe('desigualdad referencial (Pitfall 1 / SEL-08)', () => {
  it('setVillain devuelve objetos nuevos en los cinco niveles', () => {
    const session = setHero(setVillain(baseSession(), 'ultron'), 0, 'thor')
    const result = setVillain(session, 'rhino')

    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.selection).not.toBe(session.context.selection)
    expect(result.context.selection!.heroes).not.toBe(session.context.selection!.heroes)
    expect(result.context.selection!.heroes[0]).not.toBe(session.context.selection!.heroes[0])
    expect(result.context.selection!.heroes[0]).toEqual(session.context.selection!.heroes[0])
  })
  // ...
})
```
`incrementHero`/`decrementHero`/`incrementVillain`/`decrementVillain` each need the same
`not.toBe` chain at every level (`session` → `context` → `counters` → `heroHealth` →
touched entry), per Pitfall 1 in RESEARCH.md — write this test **before** wiring the
composable, exactly as RESEARCH.md's "How to avoid" note recommends.

**Other describe blocks to mirror structurally:** `arranque sin selección` (→ "arranque
sin counters"), `no-op defensivo` (→ slot-out-of-range no-op, `▼` on `null`/`0` no-op),
`resolvePlayerSlots` describe block's exhaustive malformed-input coverage (→
`resolveCounters` with wrong types/lengths/`null` entries — same 8-case shape: wrong
type, too short, too long, `null` selection, non-array `heroes`, `null` entry, non-string
`heroId`, oversized `playerName`/out-of-range number).

---

### `engine/types.ts` (model, types) — MODIFY

**Analog:** itself — the existing `selection?: HeroSelection` field and its header comment
(`engine/types.ts:115-124`):
```typescript
export interface SessionContext {
  playerCount: number
  difficulty: Difficulty
  // D-19 (Fase 6): campo ADITIVO — no bumpea `formatVersion` ni
  // `contentVersion`. `undefined` es un estado normal y permanente de la
  // app (D-03/SEL-09: elegir villano/héroes es opcional de principio a
  // fin), no un caso de compatibilidad con partidas antiguas.
  selection?: HeroSelection
  [key: string]: unknown
}
```
Add `counters?: CounterState` (or whatever interface name `engine/counters.ts` exports)
immediately after `selection?`, with a comment following the exact same rhetorical shape
(field is additive, `formatVersion` untouched, `undefined`/no-value is a normal
permanent state per D-09/D-12, not a compatibility edge case). Per D-09, widen
`heroHealth` to `(number | null)[]` — do not copy `HeroSelection.heroes`'s
non-nullable-per-entry shape verbatim; the nullability requirement is new to this phase
and is the one place `engine/types.ts`'s existing shape must NOT be copied literally.

**Adjacent read-only reference — `CatalogueVillain`/`VillainStage`/`CatalogueHero`**
(`engine/types.ts:169-212`, already shipped by Phase 5, unmodified this phase):
```typescript
export interface VillainStage {
  stage: number
  health: number
  healthPerHero: boolean
  healthPerGroup: boolean
  expert?: {
    health: number
    healthPerHero: boolean
    healthPerGroup: boolean
  }
}

export interface CatalogueHero {
  id: string
  name: string
  alterEgo: string
  health: number
  handSizeHero: number
  handSizeAlterEgo: number
}

export interface CatalogueVillain {
  id: string
  name: string
  stages: VillainStage[]
}
```
`engine/counters.ts`'s precharge calculation reads `villain.stages[0]` and
`hero.health` through these exact interfaces — no new type needed, no `zod` import
(catalogue types are hand-written per DC-03 of Phase 5, specifically so `app/` and
`engine/counters.ts` can import them without touching the Node-only schema module).

---

### `engine/__tests__/persistence.test.ts` (test) — MODIFY (add D-21 `describe` block)

**Analog:** itself — the existing `D-20` `describe` block, same file
(`engine/__tests__/persistence.test.ts:142-175`, first sub-test):
```typescript
describe('D-20: resume() de una sesión persistida sin `selection` (Fase 6)', () => {
  const fresh = expand(marvelChampions, { playerCount: 3, difficulty: 'normal' })

  it('resume() devuelve "resumed" (ni content-changed ni fresh) — la clave nueva del paso no dispara ninguna de las tres comprobaciones', () => {
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: { playerCount: 3, difficulty: 'normal' }, // sin `selection`, forma pre-Fase-6
      updatedAt: '2026-09-08T00:00:00.000Z',
    }
    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')

    expect(session.context.selection).toBeUndefined()

    const slots = resolvePlayerSlots(session.context)
    expect(slots).toHaveLength(3)
    expect(slots).toEqual([
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
      { heroId: null, playerName: '' },
    ])

    expect(resolveVillainId(session.context)).toBeNull()
  })
  // ...second it(): "localStorage manipulado" — corrupt/misshapen selection normalizes without throwing
})
```
Add a **new**, adjacent `describe('D-21: resume() de una sesión persistida con forma de
v1.7 (sin selection, sin counters)', ...)` block in the same file, same fixture setup
(`marvelChampions` already loaded at file top via `validateGameDefinition` +
`readFileSync`, no new import needed beyond `resolveCounters` from
`engine/counters.ts`). RESEARCH.md's "Test skeleton for D-21" section already contains
the near-final version of this test — treat it as the target, cross-checked against this
real analog's exact style (`expect(outcome).toBe('resumed')`, then assert every
resolver's output is fully defined with no `undefined`/`NaN`). This is the literal test
that proves COMP-01/COMP-02 for the counters half of the interface, exactly as D-20 already
proved it for `selection`.

**Imports already present in this file that the D-21 block can reuse directly**
(`engine/__tests__/persistence.test.ts:1-24`):
```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import { next } from '../navigator'
import { resume, toPersistedPosition } from '../persistence'
import type { PersistedPosition } from '../persistence'
import { validateGameDefinition } from '../schema'
import { resolvePlayerSlots, resolveVillainId } from '../selection'
import type { GameDefinition, SessionContext } from '../types'
// ...
const contentPath = fileURLToPath(new URL('../../content/marvel-champions.json', import.meta.url))
const rawMarvelChampions: unknown = JSON.parse(readFileSync(contentPath, 'utf-8'))
const marvelChampions: GameDefinition = validateGameDefinition(rawMarvelChampions)
```
Only new import needed: `resolveCounters` (or whatever the resolver is named) from
`../counters`.

---

### `app/components/CounterBand.vue` (component, dumb) — CREATE

**Analog:** `app/components/NavBand.vue` (full file, 49 lines, this repo)

**Full analog file** (`app/components/NavBand.vue:1-49`):
```vue
<script setup lang="ts">
// Componente tonto. Ningún estado inactivo en esta fase (01-UI-SPEC
// §Disabled states): en el primer y el último paso los botones siguen
// activos y el motor hace clamp — no declarar ese atributo aquí.
import { ref } from 'vue'

withDefaults(defineProps<{
  nextLabel?: string
}>(), {
  nextLabel: 'SIGUIENTE',
})

const emit = defineEmits<{
  back: []
  next: []
}>()

const backPressed = ref(false)
const nextPressed = ref(false)
</script>

<template>
  <footer class="h-24 shrink-0 bg-surface flex">
    <button
      type="button"
      class="basis-[35%] flex items-center justify-center text-label font-bold text-primary-text transition-transform duration-75"
      :class="backPressed ? 'brightness-95 scale-[0.98]' : ''"
      @mousedown="backPressed = true"
      @mouseup="backPressed = false"
      @touchstart="backPressed = true"
      @touchend="backPressed = false"
      @click="emit('back')"
    >
      ‹ Atrás
    </button>
    <button
      type="button"
      class="basis-[65%] flex items-center justify-center gap-xs bg-accent text-label font-bold text-on-accent transition-transform duration-75"
      :class="nextPressed ? 'brightness-95 scale-[0.98]' : ''"
      @mousedown="nextPressed = true"
      @mouseup="nextPressed = false"
      @touchstart="nextPressed = true"
      @touchend="nextPressed = false"
      @click="emit('next')"
    >
      {{ nextLabel }} ›
    </button>
  </footer>
</template>
```

**What to copy exactly:**
1. `h-24 shrink-0 bg-surface` — the fixed-height, non-growing chrome-band shell (D-01).
2. The **pressed-state / action separation** (D-14, non-negotiable): `@mousedown`/
   `@touchstart` set a ref, `@mouseup`/`@touchend` clear it, and `@click` — **only**
   `@click` — fires the emit. `NavBand` uses two independent `ref<boolean>`; `CounterBand`
   needs one shared `ref<string | null>` keyed by `${cell.key}:down` / `${cell.key}:up`
   instead (dynamic button count), but the four-event wiring pattern is identical.
3. `transition-transform duration-75` + `brightness-95 scale-[0.98]` class toggle —
   the exact visual feedback classes, unchanged.
4. Dumb-component discipline: no import from `~~/engine/*` anywhere in this file — all
   values arrive fully resolved via props (`cells`), matching `NavBand`'s zero-import
   script block beyond `ref`.

**Full target template already written and locked:** `07-UI-SPEC.md` §Layout §2 (lines
181-256 of that document) contains the complete, ready-to-use `<template>` block for
each cell — including `aria-label`s, the `pointer-events-none` label overlay, the
divider classes, and the narrow-viewport two-row wrapper approach (§Layout §3). This is
not a sketch to reinterpret; copy it verbatim into `CounterBand.vue`.

**Props/emits contract** (from `07-UI-SPEC.md` §Component Inventory, already locked):
```
cells: { key: string, label: string, displayValue: string, defeated: boolean }[]
emits: increment: [key: string], decrement: [key: string]
```

---

### `app/composables/useGameSession.ts` (composable, reactive seam) — MODIFY

**Analog:** itself — the existing `setVillain`/`setHero`/`setPlayerName` wrapper pattern
and `showsSelectionGrid` computed, same file (`app/composables/useGameSession.ts:59-72`
and `:122-137`):
```typescript
function setVillain(villainId: string | null) {
  if (!session.value) return
  session.value = engineSetVillain(session.value, villainId)
}

function setHero(slot: number, heroId: string | null) {
  if (!session.value) return
  session.value = engineSetHero(session.value, slot, heroId)
}
```
```typescript
const showsSelectionGrid = computed<boolean>(() => currentNode.value?.step.selection === 'characters')

const playerSlots = computed(() => (session.value ? resolvePlayerSlots(session.value.context) : []))

const selectedVillainId = computed(() => (session.value ? resolveVillainId(session.value.context) : null))
```
Four new one-liner wrapper functions (`incrementVillainCounter`/`decrementVillainCounter`/
`incrementHeroCounter(slot)`/`decrementHeroCounter(slot)`) follow the `if (!session.value)
return` + single reassignment shape exactly. A new `showsCounterBand` computed follows
the `showsSelectionGrid` one-liner shape exactly:
```typescript
const showsCounterBand = computed<boolean>(() => currentNode.value?.sectionRepeats === true)
```
(`sectionRepeats` is already a field on `RuntimeStepNode`, populated by
`engine/flatten.ts:16` — `sectionRepeats: section.repeats` — confirmed by direct grep;
no engine change needed to expose it, it already flows through `currentNode`.)

A new `counterCells` computed (feeding `CounterBand`'s `cells` prop) follows the
`playerSlots`/`selectedVillainId` shape: `computed(() => session.value ?
resolveCounters(session.value.context) transformed into the CellViewModel[] shape : [])`
— the transform from `resolveCounters`'s raw `{ villainHealth, heroHealth }` into
`{ key, label, displayValue, defeated }[]` (adding player labels via
`resolvePlayerLabel`-equivalent fallback logic, `'—'` for `null`, `defeated = value ===
0` for hero cells only per D-11/D-15) lives here, never in the component.

**Imports pattern to extend** (`app/composables/useGameSession.ts:13-19`):
```typescript
import {
  resolvePlayerSlots,
  resolveVillainId,
  setHero as engineSetHero,
  setPlayerName as engineSetPlayerName,
  setVillain as engineSetVillain,
} from '~~/engine/selection'
```
Add a matching import block from `~~/engine/counters` with aliased names
(`incrementVillain as engineIncrementVillain`, etc.) — same aliasing convention already
established for the four existing engine-function imports.

---

### `app/composables/useStepShortcuts.ts` (utility, pure + documented) — MODIFY (comment only)

**Analog:** itself — the file's own `D-Q1` comment-as-documented-decision style
(`app/composables/useStepShortcuts.ts:114-123`):
```typescript
// Contrato: acepta la forma de pato (tagName?/isContentEditable?) para poder
// pasarle `event.target` real en el cableado sin un cast a un tipo del DOM.
// Un `<button>` NO es editable: el doble avance que produciría lo resuelve
// `preventDefault()` (D-Q1), no esta guarda.
export function isEditableTarget(target: { tagName?: string, isContentEditable?: boolean } | null): boolean {
  if (!target) return false
  if (target.isContentEditable) return true
  const tag = target.tagName?.toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
```
Per D-17, add **one line** directly above or inside this function's comment block
explicitly noting that `▼`/`▲` buttons are `<button>` elements, therefore not excluded
by this guard, and that this is an intentional decision (the app is touch-only for
counters) — not a gap. **Zero change to `shortcutsEnabled`'s branches.** No new test
file needed: `app/composables/__tests__/useStepShortcuts.test.ts:163-165` already
contains the exact pinning test —
```typescript
it('BUTTON -> false (no es editable; el doble avance lo resuelve preventDefault, D-Q1)', () => {
  expect(isEditableTarget({ tagName: 'BUTTON' })).toBe(false)
})
```
— per Open Question 2 in RESEARCH.md, optionally add a one-line comment inside this
existing test referencing D-17 for cross-traceability; do not duplicate the test.

---

### `app/pages/[game]/index.vue` (route/page, composition root) — MODIFY

**Analog:** itself — the existing template stack and `watchDebounced`/`pagehide` block,
same file.

**Insertion point — current template order** (`app/pages/[game]/index.vue:666-693`):
```vue
<AppHeader
  :section-label="sectionLabel"
  :position="position"
  :session-context="sessionContextLabel"
  :voice-state="voiceState"
  @index-open="onIndexOpen"
  @voice-toggle="toggleVoice"
/>
<VoiceUnavailableNotice
  v-if="showVoiceUnavailableNotice"
  @dismiss="dismissNotice"
/>
<StepScreen
  :action-text="currentText.text"
  ...
/>
<NavBand @back="onBack" @next="onNext" />
```
Insert `<CounterBand v-if="showsCounterBand" :cells="counterCells" @increment="onCounterIncrement" @decrement="onCounterDecrement" />`
as the **immediate next sibling after `<AppHeader>`**, before `<VoiceUnavailableNotice>`
— per RESEARCH.md's Open Question 1 recommendation, which reads D-03's "directly under
AppHeader" as authoritative over the pre-existing, undocumented notice component's
position. This keeps the band's position stable regardless of TTS availability, and
requires no change to `VoiceUnavailableNotice.vue`/`StepScreen.vue`/`NavBand.vue`.

**Persistence — nothing to change here, only to confirm still holds**
(`app/pages/[game]/index.vue:158-165`):
```typescript
watchDebounced(
  session,
  (value) => {
    if (!value) return
    save(value)
  },
  { debounce: 300 },
)
```
and (`app/pages/[game]/index.vue:179-181`):
```typescript
useEventListener('pagehide', () => {
  if (session.value) save(session.value)
})
```
Both are untouched by this phase (D-19/D-20); they already persist whatever
`session.value` holds, including `counters`, **as long as every new mutator reassigns
correctly** — see the `engine/counters.ts` pattern assignment above.

---

## Shared Patterns

### Pure-mutator full reassignment (the load-bearing pattern of this entire phase)
**Source:** `engine/selection.ts` (whole file) + its header comment, lines 1-18.
**Apply to:** Every function in `engine/counters.ts` (`incrementVillain`,
`decrementVillain`, `incrementHero`, `decrementHero`) and every wrapper in
`useGameSession.ts` that calls them.
```typescript
return {
  ...session,
  context: {
    ...session.context,
    selection: { ...current, heroes },   // ← counters.ts: `counters: { ...current, heroHealth: [...] }`
  },
}
```
Non-negotiable because `watchDebounced(session, save, { debounce: 300 })` in
`app/pages/[game]/index.vue` is **not** `{ deep: true }` — an in-place nested mutation
repaints the screen (Vue's deep reactive proxy) but never triggers a save, a bug
invisible in `npm run dev` and real only after a hard reload in production.

### Defensive normalization — validate by type, never by presence
**Source:** `engine/selection.ts::resolvePlayerSlots`, lines 38-69.
**Apply to:** `engine/counters.ts`'s `resolveCounters` and any component-facing
transform in `useGameSession.ts`'s `counterCells` computed.
Length is **always** `context.playerCount` (falling back to `0` if not a positive
integer) — never `context.counters?.heroHealth.length`. Each entry is validated by
`typeof`, never trusted by presence. Never throws. Never leaves `undefined` inside the
returned array.

### Visibility derived from a data flag, never a hardcoded content id (TECH-04)
**Source:** `app/composables/useGameSession.ts::showsSelectionGrid`, line 130; the flag
itself from `engine/flatten.ts:16` (`sectionRepeats: section.repeats`).
**Apply to:** The new `showsCounterBand` computed and the `v-if` gating `<CounterBand>`
in `app/pages/[game]/index.vue`.
```typescript
const showsCounterBand = computed<boolean>(() => currentNode.value?.sectionRepeats === true)
```
Confirmed: zero occurrences of the literal string `'ronda'` anywhere in `app/` today
(same discipline `06-VERIFICATION.md` already checked for `'setup.heroes.01'`) — this
phase must not introduce the first one.

### Press-feedback separated from action (D-14, iOS Safari ghost-tap defense)
**Source:** `app/components/NavBand.vue` (whole file, 49 lines) — the shipped,
human-verified proof this pattern works in this exact codebase.
**Apply to:** Both `▼` and `▲` buttons in every cell of `CounterBand.vue`.
Visual "pressed" state toggles on `@touchstart`/`@touchend`/`@mousedown`/`@mouseup`; the
actual increment/decrement action fires **only** on `@click`. Never wire the action to
`@touchstart`.

### `PLAYER_NAME_MAX_LENGTH` reuse (D-04)
**Source:** `engine/selection.ts:25`, `export const PLAYER_NAME_MAX_LENGTH = 14`.
**Apply to:** Any player-cell label built in `useGameSession.ts`'s `counterCells`
computed — import and reuse this exact constant, never a second `14` typed by hand.

### Player-name-empty fallback (`Jugador N`)
**Source:** established in Phase 6 (per `07-CONTEXT.md`'s cross-reference to D-15 of
Phase 6) and already used for grid rows via `app/composables/useHeroSearch.ts`'s
`resolvePlayerLabel`. Reuse the same fallback string/logic for a counter cell whose
player has no name, rather than reinventing a second "Jugador N" string.

### `text-warning` label-only color rule (D-15/D-16)
**Source:** existing app-wide reservation for `⚠` warnings, e.g.
`app/components/StepScreen.vue:94-96` (`<p v-if="duplicateWarningText" class="text-body
font-normal text-warning">⚠ {{ duplicateWarningText }}</p>`).
**Apply to:** The defeated hero cell's **label only** (`{name} · SIN VIDA`) in
`CounterBand.vue` — per the hard rule in `07-UI-SPEC.md`, the counter's numeric value is
**never** `text-warning`, not even at 0.

### Precharge calculation (villain stage-I × player count × difficulty; hero flat)
**Source:** `content/marvel-characters.json` (read directly, this session — Rhino
stage 1: `{ "stage": 1, "health": 14, "healthPerHero": true, "healthPerGroup": false }`)
consumed through `CatalogueVillain`/`VillainStage`/`CatalogueHero` in `engine/types.ts:169-212`.
**Apply to:** `engine/counters.ts`'s `computeInitialVillainHealth`/`computeInitialHeroHealth`
(RESEARCH.md's Code Examples section already has a verified-correct draft of both
functions — treat it as the target, not a sketch to redesign). Access the catalogue the
same way `app/composables/useCharacterCatalogue.ts` already does elsewhere in `app/`
(static import, no network, no `zod` in the client bundle).

### Interpolation always, raw HTML never (T-01-01)
**Source:** app-wide convention, confirmed via `grep -rn "v-html" app/` returning empty
(per `06-VERIFICATION.md`'s own gate).
**Apply to:** The player-name label rendered inside `CounterBand.vue`'s cell overlay —
plain `{{ cell.label }}` interpolation, never `v-html`.

---

## No Analog Found

None. Every file this phase creates or modifies has an exact, already-shipped Phase 6
analog inside this same repository — this phase is explicitly scoped as a structural
copy of Phase 6's pattern (per `07-RESEARCH.md`'s own framing), not new pattern design.

---

## Metadata

**Analog search scope:** `engine/`, `engine/__tests__/`, `app/components/`,
`app/composables/`, `app/composables/__tests__/`, `app/pages/[game]/`,
`content/marvel-characters.json`, and `.planning/phases/06-.../06-PATTERNS.md` (for
PATTERNS.md structural conventions).
**Files scanned:** `engine/selection.ts`, `engine/persistence.ts`, `engine/types.ts`,
`engine/flatten.ts` (grep only), `engine/__tests__/selection.test.ts`,
`engine/__tests__/persistence.test.ts`, `app/components/NavBand.vue`,
`app/components/AppHeader.vue`, `app/components/StepScreen.vue`,
`app/components/VoiceUnavailableNotice.vue`, `app/composables/useGameSession.ts`,
`app/composables/useStepShortcuts.ts`, `app/composables/__tests__/useStepShortcuts.test.ts`,
`app/composables/useCharacterCatalogue.ts`, `app/pages/[game]/index.vue` (targeted
reads), `content/marvel-characters.json` (targeted reads).
**Pattern extraction date:** 2026-09-08
