# Phase 2: Bucle de ronda y reglas verificadas - Pattern Map

**Mapped:** 2026-08-29
**Files analyzed:** 13 (2 new, 11 modified)
**Analogs found:** 13 / 13 (all files have a strong in-repo analog — this phase extends Phase 1's own architecture, it does not import a new pattern from outside the repo)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `content/marvel-champions.json` (add `ronda` section) | config/content | batch (static JSON) | itself — `setup` section, same file | exact (extend existing shape) |
| `engine/schema.ts` (D-37 gate + `warningDetail` field) | model/config (Zod schema) | transform (validate) | itself — `superRefine`/`TextBlockSchema` in same file | exact |
| `engine/resolve.ts` (merge `warningDetail`) | service (pure fn) | transform | itself — same file, same merge pattern for `text`/`warning`/`speech` | exact |
| `engine/types.ts` (`TextBlock.warningDetail?`) | model (TS interfaces) | transform | itself — same file | exact |
| `engine/header.ts` (NEW — D-22/D-23 per-phase position + section label) | service (pure fn) | transform | `engine/toc.ts` (pure fn over `RuntimeStepNode[]`+cursor, zero Vue/DOM, TECH-04-compliant) | exact (role+dataflow) |
| `engine/toc.ts` (D-24/D-25 reorder + dimmed + no-`✓`-in-loop) | service (pure fn) | transform | itself — same file, extend `tableOfContents()` | exact |
| `engine/navigator.ts` | service (pure fn) | transform | **no change needed** — already correct; read-only reference for header.ts/tests | exact (unchanged) |
| `engine/expand.ts` | service (pure fn) | transform | **no change needed** — already correct; read-only reference | exact (unchanged) |
| `app/composables/useGameSession.ts` (`sectionLabel`/`position` → call `engine/header.ts`) | hook/composable | request-response (reactive seam) | itself — same file, same computed-wrapping-pure-fn pattern already used for `resolveText` | exact |
| `app/components/StepScreen.vue` (clickable `⚠`) | component | request-response (props in / event out) | itself — same file (extend `<p>` → conditional `<button>`) plus `ConfirmDialog.vue`'s pressed-state button styling | exact |
| `app/components/WarningDetailModal.vue` (NEW) | component | request-response (props in / event out) | `app/components/ConfirmDialog.vue` (dialog chrome precedent) | role-match (dialog shape, but single-button informational, not confirm/cancel) |
| `app/components/AppHeader.vue` (CSS fix only) | component | request-response | itself — same file, 2-class fix | exact (no contract change) |
| `app/components/IndexOverlay.vue` (dimmed blocks) | component | request-response | itself — same file, extend `blocks` prop + row rendering | exact |
| `app/pages/[game]/index.vue` (wire modal open/close, pass `dimmed`) | route/page | request-response | itself — same file, same wiring pattern already used for `ConfirmDialog`/`IndexOverlay` | exact |
| `engine/__tests__/schema.test.ts` (invert zero-repeats test, add `warningDetail` tests) | test | transform | itself — same file | exact |
| `engine/__tests__/navigator.test.ts` (extend vs. real content) | test | transform | itself — same file, same fixture-based `describe`/`it` shape | exact |
| `engine/__tests__/content.test.ts` (update hardcoded counts, add ronda assertions) | test | transform | itself — same file, same "gate that bites" hardcoded-list pattern | exact |
| `engine/__tests__/toc.test.ts` (dimmed/reorder assertions) | test | transform | itself — same file | exact |
| `engine/__tests__/fixtures/tiny-game.json` | test fixture | batch | **no change needed** — already has one `repeats:true` section, satisfies D-37 | exact (unchanged, confirmed by RESEARCH.md) |

## Pattern Assignments

### `content/marvel-champions.json` — add `ronda` section (content, batch)

**Analog:** itself, the existing `setup` section (same file)

**Shape to copy** (`content/marvel-champions.json` lines 1-19, section/phase/step nesting):
```json
{
  "id": "setup",
  "title": "Preparación",
  "repeats": false,
  "phases": [
    {
      "id": "setup.heroes",
      "title": "HÉROES",
      "summaryLabel": "Héroes elegidos y dial ajustado",
      "steps": [
        {
          "id": "setup.heroes.01",
          "title": "Elegir villano y héroes",
          "kind": "step",
          "text": "Decidid, como grupo, qué villano vais a enfrentar y qué héroe llevará cada jugador.",
          "citation": { "source": "rules-reference", "section": "Apéndice II, pasos 1 y 8 (decisión de escenario adelantada)", "page": 49 }
        }
      ]
    }
  ]
}
```

**Concrete new section to author, following that exact shape:**
```json
{
  "id": "ronda",
  "title": "Ronda",
  "repeats": true,
  "phases": [
    {
      "id": "ronda.jugadores",
      "title": "Jugadores",
      "summaryLabel": "…",
      "steps": [ /* 4 steps per D-27, one with citation p.16-17 */ ]
    },
    {
      "id": "ronda.villano",
      "title": "Villano",
      "summaryLabel": "…",
      "steps": [ /* 6 steps per D-34/D-35, citations p.45 */ ]
    }
  ]
}
```

**Critical, non-negotiable data-authoring rules (from CONTEXT.md/UI-SPEC.md, not optional style):**
- `phases[].title` for `ronda.jugadores`/`ronda.villano` MUST be Title Case (`"Jugadores"`, `"Villano"`), **not** the existing all-caps convention (`"HÉROES"`) — the header formula in `engine/header.ts` will NOT `.toUpperCase()` this field inside the repeating branch (Pitfall 5 / UI-SPEC §Layout 2).
- `warningDetail` may only appear on a text block that also declares `warning` on the same block — content-gate rule to add to `content.test.ts` and/or `schema.ts` `superRefine`.
- `warningDetail` hard cap: 320 chars (UI-SPEC §Typography — the number this phase's schema `.max()` must use).
- The tightened `schema.ts` gate (D-37) and this content MUST land in the same commit/task — see Pitfall 1 below and `engine/schema.ts`'s Pattern Assignment.
- Reuse the exact `citation` shape (`source`/`section`/`page`) already used throughout `setup` — every `kind:'step'` node needs one (enforced by `content.test.ts`'s existing citation gate, line 48-57).

---

### `engine/schema.ts` — D-37 gate hardening + `warningDetail` field (model/config, transform)

**Analog:** itself (same file) — both changes are localized edits to existing structures.

**Current `superRefine` gate to change** (`engine/schema.ts` lines 64-72):
```typescript
}).superRefine((game, ctx) => {
  const repeating = game.sections.filter(s => s.repeats)
  // "<= 1" en Fase 1 — TODO(fase 2): endurecer a === 1 cuando exista la sección "round"
  if (repeating.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `At most one section may have repeats:true, found ${repeating.length}`,
    })
  }
```
**D-37 change:** flip `repeating.length > 1` to `repeating.length !== 1` (message text must be updated to reflect "exactly one", not "at most one"). Land this in the SAME task/commit as the `ronda` content — see Pitfall below.

**Current `TextBlockSchema`** to extend (`engine/schema.ts` lines 18-22):
```typescript
const TextBlockSchema = z.object({
  text: z.string().min(1).max(90), // presupuesto duro de 01-UI-SPEC.md
  warning: z.string().max(60).optional(), // NO "detail" — línea de aviso de trampa (D-05)
  speech: z.string().optional(), // reservado para Fase 3, sin usar aquí
})
```
**D-32 change:** add one line, no `.default()` (Pattern 3 of RESEARCH.md — needs zero runtime fallback, unlike `kind`):
```typescript
  warningDetail: z.string().max(320).optional(), // NEW (D-32) — 320-char cap per 02-UI-SPEC.md §Typography
```
Also add a `superRefine` (or dedicated check) enforcing "no `warningDetail` without `warning` on the same block" — see UI-SPEC.md line 76 and RESEARCH.md Pattern 3.

**Pitfall (from RESEARCH.md, must be respected):** tightening the gate to `!== 1` in a commit that does NOT also add the `ronda` section breaks `content.test.ts`'s very first test immediately (today's content has zero repeating sections). Sequence or combine these two changes in the same task.

---

### `engine/types.ts` / `engine/resolve.ts` — `warningDetail` plumbing (model + service, transform)

**Analog:** itself, same file, same merge-field pattern.

**`engine/types.ts`** (lines 14-18), add one field to `TextBlock`:
```typescript
export interface TextBlock {
  text: string
  warning?: string
  warningDetail?: string // NEW (D-32)
  speech?: string
}
```

**`engine/resolve.ts`** (full file, lines 7-14) — copy the exact merge pattern used for `warning`/`speech`:
```typescript
export function resolveText(node: RuntimeStepNode, context: SessionContext): TextBlock {
  const variant = node.step.variants?.difficulty?.[context.difficulty]
  return {
    text: variant?.text ?? node.step.text,
    warning: variant?.warning ?? node.step.warning,
    warningDetail: variant?.warningDetail ?? node.step.warningDetail, // NEW — same ?? pattern
    speech: variant?.speech ?? node.step.speech,
  }
}
```
No new fallback logic needed at the `useGameSession.ts` layer — `warningDetail` is `.optional()` without `.default()`, so raw-browser-JSON and Node-validated JSON never diverge (unlike `kind`'s `?? 'step'` — see WR-01 precedent in `useGameSession.ts` lines 56-62, do NOT copy that fallback pattern here, it doesn't apply).

---

### `engine/header.ts` (NEW) — D-22/D-23 per-phase header derivation (service, transform)

**Analog:** `engine/toc.ts` (full file, 44 lines) — closest existing pure `engine/` function operating on `RuntimeStepNode[]` + cursor, zero Vue/DOM, same TECH-04 "never hardcode against an id" discipline.

**File-header comment convention to copy** (`engine/toc.ts` lines 1-8):
```typescript
// engine/toc.ts
// Índice de salto (FLOW-06, D-13): agrupa la secuencia aplanada por
// `phaseId` CONSECUTIVO (posición en el array, nunca un mapa por clave —
// romperia si una fase apareciera dos veces) y deriva las marcas `done`/
// `current`/null a partir de `cursor`, sin ningún estado adicional (D-14).
// Puro: misma entrada -> misma salida, nunca muta `sequence`. Cero imports
// de Vue/Nuxt/DOM y cero conocimiento de los bloques de un juego concreto
// (TECH-04): las etiquetas de grupo salen siempre de `phaseTitle`.
import type { RuntimeStepNode } from './types'
```
Write an equivalent header comment for `engine/header.ts` naming D-22/D-23, `EngineSession`, and the phaseId-not-sectionId scoping rule (RESEARCH.md's "Critical detail that must not be lost").

**Existing computeds this file replaces (source of the exact logic to port)** — `app/composables/useGameSession.ts` lines 51-72:
```typescript
const sectionLabel = computed<string>(() => {
  if (!currentNode.value) return ''
  return currentNode.value.sectionTitle.toUpperCase()
})

const position = computed<{ current: number, total: number } | null>(() => {
  if (!session.value || !currentNode.value) return null
  if (currentNode.value.step.kind === 'summary') return null

  const stepNodes = session.value.sequence.filter(node => (node.step.kind ?? 'step') === 'step')
  const index = stepNodes.findIndex(node => node.runtimeId === currentNode.value!.runtimeId)
  if (index === -1) return null

  return { current: index + 1, total: stepNodes.length }
})
```
Port this logic into a pure `engine/header.ts` function taking `EngineSession` (see RESEARCH.md Pattern 1 for the full sketch), branching on `node.sectionRepeats` (already stamped by `flatten.ts`, no new field needed) to scope by `phaseId` (D-22, inside the loop) vs. the whole sequence (D-23, unchanged setup behavior). **Filter by `phaseId`, never `sectionId`** — RESEARCH.md flags this as the single easiest mistake (would produce "de 10" instead of "de 6").

**Testing pattern to copy** — `engine/__tests__/toc.test.ts` (full file): plain `describe`/`it`, load `tiny-game.json` fixture via `flatten`+manual `runtimeId` mapping AND the real `content/marvel-champions.json` via `validateGameDefinition`, assert both structural shape and purity (`JSON.parse(JSON.stringify(...))` snapshot equality after calling the function twice with the same input — see `toc.test.ts` lines 84-93). Write `engine/__tests__/header.test.ts` following this exact structure.

**Consumer-side change** — `app/composables/useGameSession.ts` must replace the inline computed bodies above with thin wrappers calling the new `engine/header.ts` function, following the exact "computed wraps a pure engine import" pattern already used one function below for `currentText`:
```typescript
// useGameSession.ts lines 44-47 — the exact wrapping pattern to replicate for header.ts
const currentText = computed<TextBlock>(() => {
  if (!session.value || !currentNode.value) return { text: '' }
  return resolveText(currentNode.value, session.value.context)
})
```

---

### `engine/toc.ts` — D-24/D-25 reorder + dimmed + no-`✓`-in-loop (service, transform)

**Analog:** itself (same file, extend in place).

**Current full grouping logic to extend** (`engine/toc.ts` lines 26-43):
```typescript
export function tableOfContents(sequence: RuntimeStepNode[], cursor: number): TocBlock[] {
  const blocks: WorkingBlock[] = []

  sequence.forEach((node, index) => {
    const mark: TocRow['mark'] = index < cursor ? 'done' : index === cursor ? 'current' : null
    const row: TocRow = { id: node.runtimeId, label: node.step.title, mark }

    const currentBlock = blocks[blocks.length - 1]
    if (currentBlock && currentBlock.phaseId === node.phaseId) {
      currentBlock.steps.push(row)
    }
    else {
      blocks.push({ phaseId: node.phaseId, label: node.phaseTitle, steps: [row] })
    }
  })

  return blocks.map(({ label, steps }) => ({ label, steps }))
}
```
Required changes (see RESEARCH.md Pattern 2 for the full sketch):
1. Compute `insideLoop = sequence[cursor]?.sectionRepeats === true` up front.
2. Mark rule: when `node.sectionRepeats` is true, never emit `'done'` — only `'current'` or `null` (D-25).
3. Add a `dimmed: boolean` field to `TocBlock`/`WorkingBlock`, and — only when `insideLoop` — partition and reorder blocks so repeating-section blocks render first and non-repeating blocks render last with `dimmed: true` (D-24). When NOT inside the loop, behavior is byte-identical to today (natural order, `dimmed: false` throughout) — this preserves every existing `toc.test.ts` assertion for the setup-only case.
4. **TECH-04 compliance:** the reordering/dimming condition must reference `node.sectionRepeats` only — never `'ronda'`, `'setup'`, or any literal id (already true of the field's origin: `flatten.ts` line 16 stamps `sectionRepeats: section.repeats` from authored data).

**Testing pattern to copy:** `engine/__tests__/toc.test.ts` lines 38-58 (mark assertions with `.filter(r => r.mark === 'done')` counts) — add equivalent counts for `dimmed`, and a test asserting zero `'done'` marks anywhere inside a repeating-section block regardless of how many times the loop has been passed through.

---

### `app/components/StepScreen.vue` — clickable `⚠` (component, request-response)

**Analog:** itself (same file) for the prop/template shape; `app/components/ConfirmDialog.vue` for the pressed-state button styling convention.

**Current full file** (`app/components/StepScreen.vue`, 21 lines):
```vue
<script setup lang="ts">
// Componente tonto. Renderiza SIEMPRE con interpolación de texto — prohibida
// la directiva de HTML crudo en toda la app (T-01-01 del threat model: el
// texto de contenido nunca se trata como HTML confiado).
defineProps<{
  actionText: string
  warningText: string | null
}>()
</script>

<template>
  <main class="flex-1 bg-background flex items-center justify-center px-2xl overflow-y-auto">
    <div class="w-full max-w-[960px] flex flex-col items-center gap-lg text-center">
      <p class="text-display font-bold text-primary-text">{{ actionText }}</p>
      <p v-if="warningText" class="text-body font-normal text-warning">
        ⚠ {{ warningText }}
      </p>
    </div>
  </main>
</template>
```

**Change contract (per 02-UI-SPEC.md §Component Inventory and §Layout 1):** add a third prop `warningDetailText: string | null` and one new emit `open-warning-detail: []`. Render:
- `warningText && warningDetailText` → `<button type="button" class="text-body font-normal text-warning border-b border-warning/50 min-h-12 px-md py-sm" @click="emit('open-warning-detail')">⚠ {{ warningText }} ›</button>` (clickable case, UI-SPEC's exact affordance rule: bottom border + trailing `›`, `min-h-12`)
- `warningText` only (no detail) → keep the existing plain `<p>` exactly as-is, unchanged (no false affordance — D-32's explicit requirement).

**Pressed-state button convention to copy from `ConfirmDialog.vue`** (lines 21-22, 41-46) if the new button needs the same tap-feedback treatment as other buttons in the app:
```typescript
const confirmPressed = ref(false)
```
```vue
@mousedown="confirmPressed = true"
@touchstart="confirmPressed = true"
@mouseup="confirmPressed = false"
@touchend="confirmPressed = false"
```
(UI-SPEC.md says reuse the same "4% darken + 2% scale-down" press feedback already standard across the app — `active:brightness-95` used elsewhere, e.g. `AppHeader.vue` line 29, is the simpler CSS-only equivalent and may be preferred over the ref-based approach for a single non-destructive button.)

**Text interpolation rule (non-negotiable, T-01-01):** the modal body and this button's text must render via `{{ }}` only, exactly like every existing content field in this file — never `v-html`.

---

### `app/components/WarningDetailModal.vue` (NEW) — dialog component (request-response)

**Analog:** `app/components/ConfirmDialog.vue` (full file, 67 lines) — closest dialog precedent in the repo. Diverges deliberately per 02-UI-SPEC.md: single-dismiss informational modal, not confirm/cancel; translucent scrim not opaque; primary-text body not secondary-text.

**Chrome to copy verbatim** (`ConfirmDialog.vue` lines 26-30, adapted):
```vue
<div role="dialog" aria-modal="true" class="fixed inset-0 z-50 bg-background/80 flex items-center justify-center px-xl">
  <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
    <h1 class="text-heading font-bold text-primary-text">
      ⚠ {{ heading }}
    </h1>
```
Note the two deliberate divergences from `ConfirmDialog`: `bg-background/80` (not opaque `bg-background`) and body uses `text-primary-text` (not `text-secondary-text` — `ConfirmDialog` line 32 uses secondary for its body, this modal must NOT copy that line, per UI-SPEC.md's explicit "Why the modal's body uses Primary text" rationale).

**Props/emits contract** (from UI-SPEC.md §Component Inventory):
```typescript
defineProps<{
  heading: string   // the warning text, reused verbatim
  body: string      // warningDetail
}>()
const emit = defineEmits<{ dismiss: [] }>()
```

**Single-button footer** (adapt `ConfirmDialog.vue` lines 49-63's accent-fill button, drop the cancel button and the `destructive` conditional entirely):
```vue
<div class="flex justify-end pt-sm">
  <button type="button" class="min-h-12 px-lg bg-accent text-on-accent text-label font-bold transition-transform duration-75" @click="emit('dismiss')">
    Entendido
  </button>
</div>
```

**New behavior not present in `ConfirmDialog.vue` (must be added, not copied — `ConfirmDialog` has no equivalent, flagged as a known gap in UI-SPEC.md, not a pattern to copy):**
- Dismiss on scrim click (`@click.self` on the outer `fixed inset-0` div) and on `Esc` keydown (`onMounted`/`onUnmounted` with `window.addEventListener('keydown', ...)`), in addition to the button.
- Focus management: on mount, focus the "Entendido" button; on unmount, return focus to the `⚠` trigger element (ref must be held at the call site in `app/pages/[game]/index.vue`, per UI-SPEC.md's "the ref lives at the call site, not inside the modal" — the modal itself stays a dumb, stateless-of-session component).

---

### `app/components/AppHeader.vue` — CSS-only fix (component, request-response)

**Analog:** itself (same file), 2-class change, no contract change.

**Current template** (`app/components/AppHeader.vue` lines 15-37) — the exact lines to touch:
```vue
<header class="h-16 shrink-0 bg-surface flex items-center justify-between px-lg gap-md">
  <div class="text-label font-bold text-primary-text truncate">
    {{ sectionLabel }}<template v-if="position"> · {{ position.current }} de {{ position.total }}</template>
  </div>

  <div class="flex items-center gap-md">
```
**Fix (UI-SPEC.md §Layout 2):** add `min-w-0 flex-1` to the left `div`, add `shrink-0` to the right `div`. No prop, no template-logic, no emit changes — same `sectionLabel`/`position`/`sessionContext` props as today.

---

### `app/components/IndexOverlay.vue` — dimmed blocks + plain title source (component, request-response)

**Analog:** itself (same file), extend `blocks` prop shape and row styling.

**Current props + row rendering** (`app/components/IndexOverlay.vue` lines 10-16, 78-97):
```typescript
const props = defineProps<{
  title: string
  blocks: {
    label: string
    steps: { id: string, label: string, mark: 'done' | 'current' | null }[]
  }[]
}>()
```
```vue
<div v-for="block in numberedBlocks" :key="block.label" class="mt-lg">
  <h2 class="text-label font-bold uppercase text-secondary-text px-sm">
    {{ block.label }}
  </h2>
  <button
    v-for="row in block.steps"
    :key="row.id"
    type="button"
    class="w-full min-h-12 flex items-center gap-md px-sm text-left transition-transform duration-75 active:brightness-95"
    :class="row.mark === 'current' ? 'text-primary-text' : row.mark === 'done' ? 'text-primary-text' : 'text-secondary-text'"
    @click="onRowClick(row)"
  >
```
**Change:** add `dimmed: boolean` to each block in the `blocks` prop shape. When `block.dimmed` is true, force row text color to `text-secondary-text` regardless of `mark` (overriding the existing `done`→`text-primary-text` branch), and the block's `<h2>` label already uses `text-secondary-text` unconditionally today — no change needed there except confirming it stays secondary for dimmed blocks too (it already is). Add the divider caption (`"PREPARACIÓN (CONSULTA)"`, per UI-SPEC.md §Layout 3) immediately before the first dimmed block, using the same `border-t border-background` hairline treatment already used under the title bar (`IndexOverlay.vue` line 62: `border-b border-background`).

**Caller-side contract clarification (page-level, not this component):** `app/pages/[game]/index.vue` currently passes `:title="sectionLabel"` (line 274). Per UI-SPEC.md and RESEARCH.md Pattern 2/Pitfall 4, once `sectionLabel` becomes the composed `"RONDA 4 · Villano"` string, `IndexOverlay`'s `title` must instead be sourced from the plain, uppercased section title (`node.sectionTitle.toUpperCase()`) — a new computed distinct from the header's `sectionLabel`, likely added alongside `sectionLabel`/`position` in `useGameSession.ts` or derived inline in the page from `currentNode`.

**Testing pattern:** `engine/__tests__/toc.test.ts` covers the underlying data; no separate component test exists for `IndexOverlay.vue` in this repo (no component test infra used in Phase 1) — do not introduce one unless the plan explicitly adds `@nuxt/test-utils` component testing, which RESEARCH.md's Standard Stack does not call for this phase.

---

### `app/pages/[game]/index.vue` — wire the new modal + dimmed IndexOverlay (page, request-response)

**Analog:** itself (same file) — same wiring pattern already used for `ConfirmDialog`/`IndexOverlay`.

**Existing wiring pattern to copy** (`app/pages/[game]/index.vue` lines 214-223, `ConfirmDialog` stacked on top of `ResumePrompt`):
```vue
<ConfirmDialog
  v-if="awaitingDiscardConfirm"
  title="¿Empezar una partida nueva?"
  :body="discardBody"
  confirm-label="Sí, empezar nueva"
  cancel-label="Cancelar"
  :destructive="true"
  @confirm="onDiscardConfirm"
  @cancel="onDiscardCancel"
/>
```
**New wiring for `WarningDetailModal`**, same `v-if` + local `ref` pattern (add `isWarningDetailOpen = ref(false)` alongside `isIndexOpen`, and a handler `onOpenWarningDetail`/`onDismissWarningDetail`), stacked inside the existing `v-else` step-screen block (lines 260-279):
```vue
<StepScreen
  :action-text="currentText.text"
  :warning-text="currentText.warning ?? null"
  :warning-detail-text="currentText.warningDetail ?? null"
  @open-warning-detail="isWarningDetailOpen = true"
/>
<WarningDetailModal
  v-if="isWarningDetailOpen"
  :heading="currentText.warning ?? ''"
  :body="currentText.warningDetail ?? ''"
  @dismiss="isWarningDetailOpen = false"
/>
```
**`IndexOverlay` title fix** (line 274) — replace `:title="sectionLabel"` with the new plain-section-title computed (see `IndexOverlay.vue` pattern assignment above).

**Existing debounced-save / non-mutation pattern (unchanged, do not touch):** the `watchDebounced(session, ...)` block (lines 82-89) and the NO-OP comment at the bottom of the file (lines 173-179) explain exactly why `next()`/`prev()` on "mesa lista" will finally start navigating once `ronda` exists — read this comment before touching any navigation wiring, it documents the exact mechanism this phase activates.

---

### Tests — `engine/__tests__/schema.test.ts`, `navigator.test.ts`, `content.test.ts`, `toc.test.ts` (test, transform)

**Analog:** itself in each case — same file, same `describe`/`it` conventions, extend in place.

**Must invert (not just add to)** — `engine/__tests__/schema.test.ts` lines 60-64:
```typescript
it('NO lanza con cero secciones repeats:true', () => {
  const game = baseGame()
  expect(game.sections.every(s => s.repeats === false)).toBe(true)
  expect(() => GameDefinitionSchema.parse(game)).not.toThrow()
})
```
Per D-37, this must become an assertion that it DOES throw with zero repeating sections (rename the test too, e.g. `'lanza ZodError con cero secciones repeats:true'`). This is Pitfall 2 from RESEARCH.md — a silent no-op edit here would mask a broken gate.

**Fixture confirmation:** `engine/__tests__/fixtures/tiny-game.json` already has exactly one `repeats:true` section (`"loop"`) — **no change needed**, already satisfies D-37 (confirmed directly by reading the file in this session).

**Hardcoded-count tests that MUST be updated the moment `ronda` content lands** (`engine/__tests__/content.test.ts`, "gate that bites" pattern, lines 41-46, 100-108, 127-138): the `24 nodos`/`23 kind step`/`exactamente 3 pasos declaran warning`/`exactamente 2 pasos declaran variants.difficulty` assertions all have hardcoded counts/id-lists that will fail by design once round content is added — budget explicit time to update them plus add equivalent new assertions for `ronda`'s step counts, `warningDetail` count, and the four confirmed-error content checks (D-36).

**New navigator tests against real content** (extend `engine/__tests__/navigator.test.ts`, same `describe('next')`/`describe('prev')`/`describe('jumpTo')` structure at lines 51-127, but using `expand(marvelChampions, context)` the way `content.test.ts` already does at lines 140-150, instead of only the `tiny-game.json` fixture) — covers FLOW-03/04/07/08 against the real 10-step loop, not just the 3-step fixture loop.

## Shared Patterns

### Pure `engine/` function convention
**Source:** `engine/toc.ts`, `engine/resolve.ts`, `engine/navigator.ts` (all of `engine/`)
**Apply to:** `engine/header.ts` (new), all `engine/schema.ts`/`engine/toc.ts` edits
```typescript
// File-header comment convention (every engine/ file has one):
// engine/<name>.ts
// <one paragraph: what it derives, from what, and the invariant it preserves>
// Puro: misma entrada -> misma salida. Cero imports de Vue/Nuxt/DOM.
```
Every `engine/` file: no Vue/Nuxt/DOM import, takes plain data in, returns plain data out, documents the invariant it preserves in a comment (D-14, TECH-04, WR-01 etc. referenced by id).

### Reactive-seam-only rule (composable wraps engine, components never import engine)
**Source:** `app/composables/useGameSession.ts` (whole file)
**Apply to:** any component needing new engine-derived data (header info, dimmed blocks) — the wrapping must happen in `useGameSession.ts` (or a page-level computed calling an `engine/` import, as `app/pages/[game]/index.vue` already does for `expand`/`resume`/`tableOfContents`), never inside a `.vue` component's `<script setup>`.
```typescript
// The exact wrap-a-pure-function-in-a-computed pattern to replicate:
const currentText = computed<TextBlock>(() => {
  if (!session.value || !currentNode.value) return { text: '' }
  return resolveText(currentNode.value, session.value.context)
})
```

### Text interpolation only, never v-html (T-01-01)
**Source:** `app/components/StepScreen.vue` line 2-4 comment, enforced project-wide
**Apply to:** `WarningDetailModal.vue`'s body/heading, `StepScreen.vue`'s clickable warning button — both render authored content via `{{ }}` only.

### Dialog chrome convention (dialog role, fixed overlay, surface panel, accent-filled primary button)
**Source:** `app/components/ConfirmDialog.vue` (whole file), `app/components/ResumePrompt.vue` (whole file)
**Apply to:** `WarningDetailModal.vue`
```vue
<div role="dialog" aria-modal="true" class="fixed inset-0 z-50 ... flex items-center justify-center px-xl">
  <div class="w-full max-w-[640px] bg-surface p-2xl flex flex-col gap-lg">
```
Both existing dialogs share this exact shell; only the backdrop opacity, body text color, and button count differ per this phase's explicit divergences (see `WarningDetailModal.vue`'s Pattern Assignment above).

### "Gate that bites" content test convention
**Source:** `engine/__tests__/content.test.ts` (whole file, esp. lines 100-108, 127-138)
**Apply to:** all new `content.test.ts` assertions for `ronda` content — hardcode exact counts/id-lists rather than loose regex checks, so any future content drift fails loudly and must be consciously updated (RESEARCH.md Pitfall 6 explicitly names this as intentional project convention, not a bug to route around).

## No Analog Found

None. Every file in this phase's change set has a same-file or same-repo-file-role analog — Phase 2 is explicitly scoped by RESEARCH.md as "content + targeted logic," extending Phase 1's own established engine/component/composable patterns rather than introducing a new architectural shape.

## Metadata

**Analog search scope:** `engine/`, `engine/__tests__/`, `app/components/`, `app/composables/`, `app/pages/`, `content/marvel-champions.json` — entire application source tree (small enough this phase to read in full rather than sample).
**Files scanned:** 29 (all files under `engine/` and `app/`, per the `find` listing) + `content/marvel-champions.json` (head/tail) + 3 phase-input docs (CONTEXT.md, RESEARCH.md, UI-SPEC.md).
**Pattern extraction date:** 2026-08-29
