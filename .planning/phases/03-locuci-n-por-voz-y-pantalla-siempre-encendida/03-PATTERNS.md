# Phase 3: Locución por voz y pantalla siempre encendida - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 10 (2 content/engine, 1 test, 1 config, 2 composables, 3 components, 1 page)
**Analogs found:** 8 / 10 (2 have no in-repo analog — new browser-API surface, `@vueuse/core` internals cited instead)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `content/marvel-champions.json` | config/content | batch (content authoring) | itself (existing `ronda.*` steps' `speech` field) | exact — same file, same field, extend to `setup.*` |
| `engine/__tests__/content.test.ts` (DC-1 widen + D-41 variant test) | test | batch/validation | same file's own `citation` gate (lines 73-87) and existing DC-1 block (lines 362-372) | exact |
| `engine/schema.ts` / `engine/types.ts` | model/schema | validation | no change expected — `speech` already `z.string().max(120).optional()` | exact (no-op) |
| `app/composables/useVoiceAnnouncer.ts` (NEW) | hook/composable | event-driven (browser API wrapper) | `app/composables/useGameSession.ts` (composable shape: refs + computed + plain functions, no engine mutation) | role-match (no true analog — first browser-API composable in the app) |
| `app/composables/usePersistedSession.ts` (extended) | hook/composable, storage | CRUD (localStorage) | itself — extend with a second key following the exact `useLocalStorage` call shape already used for `tga:progress:<gameId>` | exact |
| `app/components/AppHeader.vue` (extended) | component | request-response (props in / emit out) | itself — the `≡` button is the literal pattern to copy for the new voice-toggle button | exact |
| `app/components/VoiceUnavailableNotice.vue` (NEW) | component | request-response (dumb, dismiss emit) | `app/components/ContentChangedNotice.vue` (single-CTA acknowledge shape) + `app/components/IndexOverlay.vue`'s `✕` button (dismiss box/glyph) | strong role-match |
| `app/components/MiniSetupScreen.vue` (extended) | component | request-response | itself — footer becomes two stacked rows, second row is static copy | exact |
| `app/pages/[game]/index.vue` (extended) | route/page (runner) | event-driven (click handlers → engine calls) | itself — the existing `onConfirm`/`onResumeContinue`/`onDiscardConfirm`/`onContentChangedAcknowledge`/`onIndexJumpTo` handlers, and `NavBand`'s `@back="prev"`/`@next="next"` wiring | exact |
| `vitest.config.ts` (extended) | config | batch (test runner config) | itself — the `engine` project entry is the literal template for a new sibling project | exact |

## Pattern Assignments

### `content/marvel-champions.json` (content, batch)

**Analog:** the file's own `ronda.*` steps, which already carry `speech`.

**Existing `speech` field shape** (e.g. lines ~390, 402, 416, 430, 450 — `ronda.jugadores.01/02/03/04`, `ronda.villano.01`):
```json
"speech": "Jugad vuestros turnos en orden de jugador.",
"speech": "En orden de jugador, descartad hasta bajar al tamaño de mano.",
"speech": "Robad a la vez hasta completar el tamaño de vuestra mano.",
"speech": "Enderezad todas vuestras cartas, incluidas las de encuentro agotadas.",
"speech": "Colocad amenaza en el esquema principal según su campo de aceleración.",
```
Register: imperative, plural, present tense, ≤120 chars, no `⚠ × ›`. Copy this register verbatim for the 23 new setup `speech` lines.

**The exact D-41 gap to close** (`setup.encuentros.03`, lines 112-131, and `setup.escenario.04`, lines 195-214) — both declare `text` on `normal`/`expert` variants with **no** `speech`:
```json
{
  "id": "setup.encuentros.03",
  "title": "Conjunto adicional según dificultad",
  "kind": "step",
  "text": "Añadid el conjunto de encuentro adicional que corresponda a la dificultad elegida.",
  "variants": {
    "difficulty": {
      "normal": { "text": "No añadáis ningún conjunto adicional en este paso." },
      "expert": { "text": "Añadid también el conjunto de encuentro Experto." }
    }
  },
  "citation": { "source": "rules-reference", "section": "Modes of Play — Expert Mode", "page": 28 }
}
```
Each `normal`/`expert` object here needs its own `"speech"` key added alongside `"text"` — do not add a `speech` to the base step object and rely on `engine/resolve.ts:15`'s fallback (`variant?.speech ?? node.step.speech`) to cover the variant; that fallback is exactly the D-41 bug (variant text says the opposite of the base).

### `engine/__tests__/content.test.ts` (test, batch/validation)

**Analog:** the file's own `citation` gate (already the same "every `kind:'step'`, not `summary`" shape) and the current DC-1 block.

**Helpers already available, reuse — do not write a new tree-walk** (lines 16-19, 34-56):
```typescript
function allSteps(game: GameDefinition) {
  return game.sections.flatMap(section =>
    section.phases.flatMap(phase => phase.steps))
}
function findStep(game: GameDefinition, id: string) {
  const step = allSteps(game).find(s => s.id === id)
  if (!step) throw new Error(`No se encontró el paso ${id}`)
  return step
}
function rondaSteps(game: GameDefinition) {
  const ronda = game.sections.find(s => s.id === 'ronda')
  if (!ronda) throw new Error('No se encontró la sección ronda')
  return ronda.phases.flatMap(p => p.steps)
}
```

**Precedent for "every `kind:'step'`, exempt `summary`"** — copy this exact filter shape (lines 73-87):
```typescript
it('cada paso con kind step lleva citation con source rules-reference o learn-to-play y page entero positivo (CONT-08/D-06)', () => {
  const steps = allSteps(marvelChampions).filter(s => (s.kind ?? 'step') === 'step')
  for (const step of steps) {
    expect(step.citation).toBeDefined()
    expect(['rules-reference', 'learn-to-play']).toContain(step.citation!.source)
    expect(Number.isInteger(step.citation!.page)).toBe(true)
    expect(step.citation!.page!).toBeGreaterThan(0)
  }
})

it('el paso kind summary no lleva citation', () => {
  const summarySteps = allSteps(marvelChampions).filter(s => s.kind === 'summary')
  expect(summarySteps[0].citation).toBeUndefined()
})
```

**Current DC-1 block to widen (lines 362-372) — this is the exact block D-38 replaces:**
```typescript
it('DC-1: los 10 pasos de la ronda declaran speech no vacío de <=120 caracteres, sin ⚠, × ni ›', () => {
  const steps = rondaSteps(marvelChampions)
  expect(steps).toHaveLength(10)
  for (const step of steps) {
    expect(step.speech).toBeDefined()
    expect(step.speech!.length).toBeGreaterThan(0)
    expect(step.speech!.length).toBeLessThanOrEqual(120)
    expect(step.speech).not.toMatch(/[⚠×›]/)
  }
  // Los pasos de setup siguen deliberadamente sin speech (retrofit es Fase 3, VOZ-01) — no se afirma aquí.
})
```
Replace `rondaSteps(marvelChampions)` with `allSteps(marvelChampions).filter(s => (s.kind ?? 'step') === 'step')` (same filter as the `citation` gate above), update the count expectation to 33 (confirmed by the existing count test at line 66-70: "33 kind step y 1 kind summary"), and delete the now-false trailing comment.

**New D-41 variant-completeness assertion** — no existing precedent walks `variants.difficulty`, but `engine/resolve.ts` and `content/marvel-champions.json`'s two variant steps (`setup.encuentros.03`, `setup.escenario.04`) are the concrete cases to assert against:
```typescript
it('D-41: toda variante de dificultad que declara text declara también speech', () => {
  for (const step of allSteps(marvelChampions)) {
    const variants = step.variants?.difficulty
    if (!variants) continue
    for (const [level, variant] of Object.entries(variants)) {
      if (variant?.text !== undefined) {
        expect(variant.speech, `${step.id} variant "${level}" has text but no speech`).toBeDefined()
      }
    }
  }
})
```

**Error handling / gate philosophy** (comment at lines 41-46 in the file, `findRawStep`) — gates that assert *absence* of a field must read raw JSON, not the Zod-validated object, because `strictObject` mode already throws rather than strips; for the DC-1/D-41 gates (asserting *presence*), reading the validated `marvelChampions` (not raw) is correct and matches the existing DC-1 pattern.

### `engine/schema.ts` / `engine/types.ts` (model, no change expected)

**Analog:** the field is already declared exactly as needed.
```typescript
// engine/schema.ts:60
speech: z.string().max(120).optional(), // DC-1 (02-01-PLAN.md): política de fase para el contenido de la ronda desde ya; el consumidor en tiempo de ejecución (TTS) sigue siendo Fase 3
```
```typescript
// engine/types.ts:34 (TextBlock interface)
speech?: string
```
No schema/type change is needed this phase — enforcement of "required in practice" happens exclusively in the Vitest gate (same pattern already used for `citation`), never by tightening the Zod field to non-optional. Do not make `speech` required in the schema — that would also force it on `kind:'summary'` nodes, which D-40 explicitly exempts.

---

### `app/composables/useVoiceAnnouncer.ts` (NEW — hook, event-driven)

**Analog:** `app/composables/useGameSession.ts` for composable *shape* (plain function returning refs/computed/functions, no class, no Pinia); no in-repo analog exists for wrapping a raw browser API — this is the first composable in the app to do so. Cite `@vueuse/core@14.4.0`'s installed source directly (per 03-RESEARCH.md, already verified against `node_modules`).

**Composable shape to copy** (structure only, from `useGameSession.ts`):
```typescript
import { computed, ref } from 'vue'
// ... own imports, never ~~/engine/* directly for anything beyond types passed in as params

export function useVoiceAnnouncer(/* currentNode, currentText computeds passed in, or read via useGameSession() internally */) {
  const session = ref(/* ... */)
  function someAction() { /* ... */ }
  const someComputed = computed(() => /* ... */)
  return { /* refs, computeds, functions */ }
}
```

**Core pattern — one reactive `text` source, `speak()` takes no arguments** (verified against installed `@vueuse/core` 14.4.0 source per 03-RESEARCH.md; `useSpeechSynthesis` already does `cancel()`-then-`speak()` internally):
```typescript
const spokenLine = computed(() => currentText.value.speech ?? '')
const { speak, stop, isSupported } = useSpeechSynthesis(spokenLine, { lang: 'es-ES' })

function announce() {
  if (!currentNode.value || currentNode.value.step.kind !== 'step') return // D-40
  if (voiceState.value !== 'on') return // muted or unavailable
  if (!spokenLine.value) return // defensive — WR-01-style guard against unvalidated raw JSON
  if (!isSupported.value) return // VOZ-06: never throw if synthesis is absent
  try { speak() }
  catch { /* STACK.md: cancel/speak pairing can be flaky right after previous utterance ends on iOS */ }
}
```

**Architectural constraint to enforce (from CONTEXT.md/RESEARCH.md, verified against `useGameSession.ts`'s own header comment):** this composable must read `currentNode`/`currentText` via `useGameSession()`'s computeds (or receive them as params) — never re-import `~~/content/marvel-champions.json` or `~~/engine/resolve` directly, or variant resolution (`engine/resolve.ts:15`) is silently skipped. Must not touch `session.value`, `cursor`, `round`, or `context` — those are `useGameSession`'s exclusive seam.

**Error handling pattern:** try/catch around `speak()`/`stop()` calls (STACK.md's iOS flakiness note), always gated behind `isSupported.value` first (VOZ-06) — mirrors the existing defensive-parse pattern in `usePersistedSession.ts`'s `load()` (JSON.parse wrapped in try/catch, corrupt data treated as absence, never surfaced as an error).

---

### `app/composables/usePersistedSession.ts` (extended — storage, CRUD)

**Analog:** the file itself — the exact `useLocalStorage` call shape used for game progress, applied to a second, independent key.

**Imports pattern** (lines 1-10, unchanged, no new imports needed — `useLocalStorage` is already auto-imported by `@vueuse/nuxt`):
```typescript
// app/composables/usePersistedSession.ts
// Única capa de TODA la app que toca localStorage. `useLocalStorage` de
// VueUse (auto-importado por @vueuse/nuxt) es SSR-safe: en el servidor no
// intenta acceder a ningún global de navegador y se limita a devolver el
// valor por defecto. Clave namespaced `tga:progress:<gameId>`.
import { toPersistedPosition } from '~~/engine/persistence'
import type { PersistedPosition } from '~~/engine/persistence'
import type { EngineSession } from '~~/engine/types'

const KEY_PREFIX = 'tga:progress:'
function storageKey(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`
}
```

**Storage key/read/write/clear shape to copy for the new `tga:voice-enabled` key** (D-46 — independent of `gameId`, so no per-game namespacing needed):
```typescript
function load(gameId: string): PersistedPosition | null {
  const raw = useLocalStorage<string>(storageKey(gameId), '', { writeDefaults: false }).value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return isPersistedPosition(parsed) ? parsed : null
  }
  catch { return null } // JSON corrupto: ausencia de dato
}

function save(session: EngineSession) {
  const persisted = toPersistedPosition(session)
  useLocalStorage<string>(storageKey(session.gameId), '').value = JSON.stringify(persisted)
}

function clear(gameId: string) {
  // Asignar null (no '') hace que useStorage llame a removeItem.
  useLocalStorage<string | null>(storageKey(gameId), '').value = null
}
```
For the boolean voice preference, the equivalent shape is a single fixed key (no per-game suffix) and `useLocalStorage<boolean>('tga:voice-enabled', true)` directly (VueUse serializes booleans natively — no manual `JSON.parse`/`stringify` needed for a primitive, unlike the `PersistedPosition` object above, which is hand-serialized because it must run through `isPersistedPosition`'s shape validation first). Expose `loadVoicePreference()`/`saveVoicePreference(enabled: boolean)` (or similar) from the same `usePersistedSession()` return object — **do not create a second composable file**; D-46 is explicit that this stays "dentro de la costura existente."

**Critical: this must remain the only file in the app that calls `useLocalStorage`/touches `localStorage` directly** — `useVoiceAnnouncer.ts` must call into `usePersistedSession()` for read/write, never call `useLocalStorage` itself.

---

### `app/components/AppHeader.vue` (extended — component, request-response)

**Analog:** itself — full file already read (32 lines), reproduced in relevant part below.

**Imports/props pattern** (lines 1-13):
```vue
<script setup lang="ts">
// Componente tonto: recibe props, emite eventos, no importa nada del motor
// puro ni de los composables (ARCHITECTURE.md §3/§5).
defineProps<{
  sectionLabel: string
  position: { current: number, total: number } | null
  sessionContext: string
}>()

const emit = defineEmits<{
  'index-open': []
}>()
</script>
```
Extend to add `voiceState: 'on' | 'muted' | 'unavailable'` prop and `'voice-toggle': []` emit (exact shape given in `03-RESEARCH.md`'s Code Examples and confirmed by `03-UI-SPEC.md` §Component Inventory).

**The exact `≡` button markup/tap-target to copy for the new voice-toggle button** (lines 17-30, the "reserved right-zone" comment names this phase explicitly):
```vue
<!--
  Zona derecha: contenedor flex que admite MÁS de dos hijos — la Fase 3
  insertará aquí el icono de silencio (VOZ-02) sin reorganizar el layout.
  shrink-0: nunca se encoge, aunque la etiqueta compuesta de la izquierda
  ...
-->
<div class="shrink-0 flex items-center gap-md">
  <span class="text-label font-bold text-secondary-text">{{ sessionContext }}</span>
  <button
    type="button"
    class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
    aria-label="Abrir índice"
    @click="emit('index-open')"
  >
    ≡
  </button>
</div>
```
The new voice-toggle `<button>` goes **between** the `sessionContext` `<span>` and this `≡` button (per `03-UI-SPEC.md` §Layout 1: "session context text → voice toggle → `≡`"), same `w-12 h-12 flex items-center justify-center` box, same `active:brightness-95` press feedback, but renders one of the two inline SVGs from `03-UI-SPEC.md` instead of a Unicode glyph, with `text-primary-text`/`text-secondary-text` + opacity/disabled varying by state (full 3-state table already fixed in `03-UI-SPEC.md` §Layout 1 — copy that table exactly, do not re-derive).

---

### `app/components/VoiceUnavailableNotice.vue` (NEW — component, dumb dismiss)

**Analog 1 — single-CTA acknowledge shape:** `app/components/ContentChangedNotice.vue` (full file, 44 lines, already read above). Copy the `role="dialog"` wrapper's *structure* but note `03-UI-SPEC.md` explicitly requires this new component to be a **non-modal banner**, not a `role="dialog"` overlay — do not copy the `fixed inset-0 z-40 bg-background` full-screen scrim wrapper; copy only the surface-panel/heading/body/button *internal* layout conventions:
```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ /* none for VoiceUnavailableNotice per 03-UI-SPEC.md §Component Inventory */ }>()

const emit = defineEmits<{
  dismiss: [] // 'acknowledge' in ContentChangedNotice, 'dismiss' here per UI-SPEC
}>()
</script>
```
Heading/body text-role classes to copy verbatim:
```vue
<h1 class="text-heading font-bold text-primary-text">...</h1>
<p class="text-body font-normal text-secondary-text">...</p>
```

**Analog 2 — the exact dismiss `✕` button/box to copy:** `app/components/IndexOverlay.vue` lines 74-82:
```vue
<button
  type="button"
  class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
  aria-label="Cerrar índice"
  @click="emit('close')"
>
  ✕
</button>
```
Copy this exact button (same box, same glyph, same active state), only changing `aria-label` to `"Cerrar aviso"` and the emit to `emit('dismiss')`, per `03-UI-SPEC.md`'s explicit "parallel construction to `IndexOverlay`'s existing `aria-label=\"Cerrar índice\"`" instruction.

**Structural difference from both analogs (per `03-UI-SPEC.md` §Layout 2 — do not copy this part from either analog):** wrapper is `bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md`, inserted as a document-flow band between `AppHeader` and `StepScreen` in `app/pages/[game]/index.vue`'s template (no `fixed`, no `z-40/z-50`, no backdrop) — this is the one new "banner between header and content" shape in the app; there is no existing component with this exact non-modal-band structure, only the two modal/dialog analogs above for its *internal* content conventions.

---

### `app/components/MiniSetupScreen.vue` (extended — component, request-response)

**Analog:** itself — full file already read (footer section, lines ~86-104).

**Existing footer to extend** (currently a single-row `<footer>`):
```vue
<footer class="h-24 shrink-0 bg-surface flex items-center justify-end px-lg">
  <button
    type="button"
    class="h-14 px-2xl flex items-center justify-center gap-xs text-label font-bold transition-transform duration-75"
    :class="canConfirm
      ? (ctaPressed ? 'bg-accent text-on-accent brightness-95 scale-[0.98]' : 'bg-accent text-on-accent')
      : 'opacity-40 text-primary-text cursor-default'"
    :disabled="!canConfirm"
    @mousedown="canConfirm && (ctaPressed = true)"
    @touchstart="canConfirm && (ctaPressed = true)"
    @mouseup="ctaPressed = false"
    @touchend="ctaPressed = false"
    @click="onConfirmClick"
  >
    EMPEZAR PREPARACIÓN ›
  </button>
</footer>
```
Per `03-UI-SPEC.md` §Layout 3, restructure to `<footer class="... flex flex-col">` with the existing CTA row (unchanged, keep `justify-end`) on top and a new static caption row beneath:
```vue
<p class="text-body font-normal text-secondary-text text-center px-lg pb-md">
  La pantalla se mantendrá encendida durante la partida y esto consume más batería.
</p>
```
No new prop, no new emit, no computed — this is pure static template copy, same "no state" pattern the footer already follows for everything except `canConfirm`.

---

### `app/pages/[game]/index.vue` (extended — page/route runner, event-driven)

**Analog:** itself — the file's own existing handler bodies are the exact wiring points D-42/D-43/D-51 specify.

**Imports pattern** (lines 1-14, existing):
```typescript
import { computed, onMounted, ref } from 'vue'
import { expand } from '~~/engine/expand'
import { resume } from '~~/engine/persistence'
import { tableOfContents } from '~~/engine/toc'
import { useGameContent } from '~/composables/useGameContent'
import { useGameSession } from '~/composables/useGameSession'
import { usePersistedSession } from '~/composables/usePersistedSession'
```
Add `import { useVoiceAnnouncer } from '~/composables/useVoiceAnnouncer'` alongside the other composable imports — never import `useSpeechSynthesis`/`useWakeLock` directly here; those stay wrapped inside the new composable / called once at page top-level per RESEARCH.md Pattern 2.

**Handler bodies where `announce()` must be wired synchronously (D-42/D-43) — exact current bodies to extend, each is a plain function, no `watch` anywhere in this file today:**
```typescript
function onIndexJumpTo(runtimeId: string) {
  jumpTo(runtimeId)
  // ADD: announce() immediately after, same function body
}

function onResumeContinue() {
  awaitingResumeChoice.value = false
  // ADD: announce() — D-43, this IS a tap, locutes the recovered step
}

function onContentChangedAcknowledge() {
  awaitingContentChangedAck.value = false
  // ADD: announce() — D-43, same reasoning as onResumeContinue
}
```
`next()`/`prev()` themselves are not called from a named handler in this file — they're wired directly as `@next="next"` / `@back="prev"` on `NavBand` in the template (see below). D-42 requires `announce()` to run synchronously in the *same gesture*, so either (a) wrap them in new local handlers `function onNext() { next(); announce() }` / `function onBack() { prev(); announce() }` and rewire the template to `@next="onNext"` / `@back="onBack"`, or (b) call `announce()` from inside `useGameSession`'s own `next`/`prev` — **do not do (b)**, it would make voice part of the engine seam, which CONTEXT.md explicitly forbids ("Voice is NOT engine — it must not touch cursor/round/context"). Use (a).

**Current template wiring for `next`/`prev` (to be changed to `onNext`/`onBack` per above):**
```vue
<NavBand @back="prev" @next="next" />
```

**No-announce call site — copy this exact reasoning, do not add `announce()` here (D-40/D-43):**
```vue
<!--
  D-03: "mesa lista" es un paso autorado más (kind:summary) ...
-->
<MesaListaScreen
  v-else-if="currentNode?.step.kind === 'summary'"
  :checklist="checklist"
  :session-context="sessionContextLabel"
  @back="prev"
  @start="next"
/>
```
`@start="next"` here is the documented no-op (comment at file end, "NO-OP INTENCIONAL") — do not attach `announce()` to it; D-43 explicitly excludes "Empezar a jugar" from mesa-lista, and the mini-setup's `@confirm="onConfirm"` similarly must stay un-announced.

**Wake lock wiring (D-51) — the exact tap-triggered handlers to extend, per `03-RESEARCH.md` Pattern 2 (already source-verified against `@vueuse/core`):**
```typescript
const { request, release, isActive, isSupported } = useWakeLock() // top-level, once

function onConfirm() {
  if (playerCount.value === null || difficulty.value === null) return
  start(gameId, { playerCount: playerCount.value, difficulty: difficulty.value })
  // ADD: request('screen')
}

function onResumeContinue() {
  awaitingResumeChoice.value = false
  // ADD: request('screen')
  // ADD: announce()
}

function onDiscardConfirm() {
  clear(gameId)
  session.value = null
  // ADD: release() — explicit, same-page transition, scope-dispose won't fire
  awaitingResumeChoice.value = false
  awaitingDiscardConfirm.value = false
}
```
`@back="navigateTo('/')"` on `MiniSetupScreen` needs **no** explicit `release()` call — `navigateTo` unmounts this page component, and `useWakeLock`'s own `tryOnScopeDispose` releases automatically (verified in `@vueuse/core` source per RESEARCH.md; do not add a redundant call here).

**Guard-of-client precedent already established in this file (copy for any new voice/wake-lock state read)** — the existing `resumeResolved`/`ClientOnly` pattern (lines ~44-79 and template lines ~200-215):
```typescript
const resumeResolved = ref(false)
onMounted(() => {
  // ... browser-storage reads only happen here, never during SSR ...
  resumeResolved.value = true
})
```
```vue
<ClientOnly v-else>
  <template #fallback>...</template>
  <div v-if="!resumeResolved" ...>Cargando…</div>
  <!-- ... -->
</ClientOnly>
```
Voice-availability detection (D-50) and voice-preference load must follow this same "only inside `onMounted`/`ClientOnly`" discipline — mirrors the file's own comment: "Pitfall 7: la resolución de reanudación ... ocurre solo tras montar, dentro de onMounted — nunca durante SSR."

---

### `vitest.config.ts` (extended — config, batch)

**Analog:** itself — the existing `engine` project entry is the literal template for the new sibling project.

**Full current file (18 lines) — the exact structure to extend:**
```typescript
import { defineConfig } from 'vitest/config'

// Source: https://nuxt.com/docs/4.x/getting-started/testing
export default defineConfig({
  test: {
    // `test.projects` (Vitest workspaces-in-config), NOT a separate vitest.workspace.ts.
    // `engine/` doesn't exist yet — it lands in plan 01-07. An empty match set here
    // must not fail the `test` script, hence `passWithNoTests`.
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'engine',
          include: ['engine/**/*.test.ts'],
          environment: 'node', // engine/ never touches the DOM — no jsdom cost
          passWithNoTests: true,
        },
      },
      // Future (Fase 4+): { test: { name: 'nuxt', environment: 'nuxt', include: ['app/**/*.test.ts'] } }
    ],
  },
})
```
The file's own trailing comment already anticipates this exact addition. Add a second entry to the `projects` array, copying the `engine` entry's shape (`name`, `include`, `environment`, `passWithNoTests`):
```typescript
{
  test: {
    name: 'app-logic',
    include: ['app/**/*.test.ts'],
    environment: 'node', // pure-function tests only (voice-preference parsing, Spanish-voice detection) — no DOM/jsdom needed per RESEARCH.md; do not reach for 'nuxt' environment unless a composable genuinely needs a mocked Nuxt context
    passWithNoTests: true,
  },
},
```
Per `03-RESEARCH.md`, the comment's own placeholder said `environment: 'nuxt'` for a hypothetical future project — override that suggestion with `'node'` for this phase specifically, since the new tests target pure helper functions (detection/parsing), not DOM-mounted components, matching the `engine` project's own `environment: 'node'` rationale comment.

## Shared Patterns

### Dumb-component contract (props in / events out, no engine import)
**Source:** `app/components/AppHeader.vue:1-3`, `app/components/MiniSetupScreen.vue:1-3`, `app/components/ContentChangedNotice.vue:1-3` (each opens with an identical comment citing `ARCHITECTURE.md §3/§5`)
**Apply to:** `AppHeader.vue` (extended), `VoiceUnavailableNotice.vue` (new), `MiniSetupScreen.vue` (extended) — none of these three may import `~~/engine/*` or call `useLocalStorage`/`useSpeechSynthesis`/`useWakeLock` directly; all browser-API/storage access stays in the page (`index.vue`) and composables.
```vue
<script setup lang="ts">
// Componente tonto: recibe props, emite eventos, no importa nada del motor
// puro ni de los composables (ARCHITECTURE.md §3/§5).
```

### Single localStorage seam
**Source:** `app/composables/usePersistedSession.ts` (file header comment, lines 1-11)
**Apply to:** the new voice-preference key (D-46) — must be added to this file, never to a new file or read directly from `useVoiceAnnouncer.ts` or `index.vue` via a raw `useLocalStorage` call.

### Client-only guard for any browser-API/storage read
**Source:** `app/pages/[game]/index.vue`'s `resumeResolved`/`onMounted`/`ClientOnly` pattern (lines ~44-79, template ~200-215)
**Apply to:** voice-preference load, Spanish-voice detection, and wake-lock `isSupported` checks — all three must be deferred to `onMounted` or gated by `ClientOnly`, consistent with `ssr: true` remaining on (per CLAUDE.md/CONTEXT.md's explicit constraint).

### Synchronous-in-gesture-handler discipline (no `watch` on navigation state)
**Source:** `app/pages/[game]/index.vue` — the entire file has zero `watch(session, ...)` or `watch(currentNode, ...)` calls; `watchDebounced(session, ...)` exists only for the unrelated auto-save concern (PERS-01), never for anything gesture-timing-sensitive.
**Apply to:** every `announce()` call site (D-42) — must be a plain statement inside `onIndexJumpTo`, the new `onNext`/`onBack` wrappers, `onResumeContinue`, and `onContentChangedAcknowledge`; never inside a `watch`.

### Tap-target box (48×48, `active:brightness-95`)
**Source:** `app/components/AppHeader.vue`'s `≡` button and `app/components/IndexOverlay.vue`'s `✕` button (identical class string in both: `w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95`)
**Apply to:** the new voice-toggle button in `AppHeader.vue` and the new dismiss button in `VoiceUnavailableNotice.vue` — copy this exact class string, varying only `aria-label`, the SVG/glyph content, and (for the voice toggle's `unavailable` state) color/opacity/`disabled` per `03-UI-SPEC.md`'s state table.

### Disabled-state recipe (40% opacity, no press feedback)
**Source:** `app/components/MiniSetupScreen.vue`'s CTA (`:class="canConfirm ? (...) : 'opacity-40 text-primary-text cursor-default'"`, `:disabled="!canConfirm"`)
**Apply to:** the voice-toggle's `unavailable` state per `03-UI-SPEC.md` §Layout 1 (`text-secondary-text` @ 40% opacity, `disabled`, no press feedback) — same recipe, different color role.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/composables/useVoiceAnnouncer.ts` core `speak`/`stop`/`isSupported` wiring | hook | event-driven | No existing composable in this repo wraps a raw browser API (`window.speechSynthesis`) — `useGameSession.ts` and `usePersistedSession.ts` are the closest shape-analogs (plain function, refs+computed+functions returned) but neither touches a live browser API surface. Use `03-RESEARCH.md`'s Code Examples (source-verified against installed `@vueuse/core@14.4.0`) as the primary reference instead of an in-repo analog. |
| Wake lock request/release call sites in `index.vue` | page logic | event-driven | Same reason — first `useWakeLock()` usage in the app. `03-RESEARCH.md` Pattern 2 (source-verified) is the reference; the page's *existing* handler-function shapes (given above) are the wiring analog, just not the wake-lock API itself. |

## Metadata

**Analog search scope:** `app/`, `engine/`, `content/`, `vitest.config.ts` (entire app + engine tree, no `node_modules` search needed — confirmed via grep that no prior `useSpeechSynthesis`/`useWakeLock`/`useDocumentVisibility` usage exists in `app/`)
**Files scanned:** 27 (full `app/`+`engine/`+`content/` file listing) plus targeted greps for `speech`, `kind`, `variants`, `useLocalStorage` usage
**Pattern extraction date:** 2026-08-30
