---
phase: 08-valores-conocidos-dentro-del-paso
reviewed: 2026-09-09T12:55:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/components/StepScreen.vue
  - app/composables/__tests__/useGameSession.test.ts
  - app/composables/useGameSession.ts
  - app/pages/[game]/index.vue
  - content/marvel-champions.json
  - engine/__tests__/stepValues.test.ts
  - engine/schema.ts
  - engine/stepValues.ts
  - engine/types.ts
findings:
  critical: 2
  warning: 6
  info: 6
  total: 14
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-09-09T12:55:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 8 adds an optional `value` key to step definitions and resolves it into either a
parenthesised figure (`villainHealth`) or a per-player list (`heroHealth`,
`handSizeAlterEgo`). The architectural constraints the phase set for itself are, mechanically,
honoured: `engine/stepValues.ts` imports nothing from Vue/Nuxt/DOM, never mentions
`resolveCounterValues` (and has a structural test proving it), `StepScreen.vue` does not import
`~~/engine/*`, all rendering is `{{ }}` interpolation, the JSON diff is exactly 4 additive
lines, and `contentVersion` stays at 13 (pinned by `engine/__tests__/content.test.ts:538`).
`npx vitest run` is green: 22 files, 563 tests.

That is where the good news stops. The review found one **content/engine interaction that
actively mis-guides the group in Expert mode** — the exact failure class CLAUDE.md calls worse
than having no assistant — plus a second, pre-existing blocker in the render path that makes
300 characters of authored content permanently unreachable. Beyond those: the new engine module
trusts the generated catalogue's shape and will throw inside a Vue computed if a regeneration
drops a key; the "single source of truth" claim for `StepValueKind` is false (the enum is typed
three times, one of them as bare string literals in the engine); the hard 90-character text
budget is enforced on `text` alone while the rendered string is now `text + suffix`; and the
new schema field shipped with zero schema tests where its Fase-6 sibling `selection` has three.

The purely presentational choices (suffix inside the same text node, non-interactive `<div>`
rows, no heading above the list) are consistent with the stated decisions and are not flagged
as defects.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01: Expert mode prints a villain-health figure that contradicts the card the step tells the group to read

**File:** `content/marvel-champions.json` (step `setup.escenario.02`, JSON line 177-180; step
`setup.escenario.04`, line ~305) + `engine/stepValues.ts:57-70`

**Issue:** `resolveStepValue` delegates to `computeInitialVillainHealth`, which selects
`stage1.expert` whenever `context.difficulty === 'expert'` (`engine/counters.ts:34`). The step
that consumes it, `setup.escenario.02`, has the text:

> "Ajustad el dial de vida del villano **al valor indicado en la carta de villano**."

But the expert villain cards are not on the table yet at that point: the substitution is
instructed two steps later, by `setup.escenario.04`'s `expert` variant ("Sustituid las cartas
de villano numeradas por las del modo Experto de este escenario"). Verified against the
catalogue (`content/marvel-characters.json`): Kang stage I is `health: 12, healthPerHero: true`
standard and `expert: { health: 15, healthPerHero: true }`. So at 3 players in Expert mode the
screen renders:

> Ajustad el dial de vida del villano al valor indicado en la carta de villano. **(45)**

…while the card physically in front of the group reads 12 per hero, i.e. 36. The step's own
sentence orders them to trust the card. A group that obeys the sentence sets 36 and is never
told to re-adjust the dial after the step-04 swap — the villain runs the entire game with 9
missing HP per player. A group that obeys the parenthesis sees a number that flatly contradicts
the card and loses confidence in the assistant. Both outcomes are the "guía mal" failure mode
CLAUDE.md names as the project's worst.

This also violates the phase's own stated invariant for the feature: the printed figure is
supposed to be "la vida inicial **impresa en la carta**" (`engine/stepValues.ts:8-16`). In
Expert mode, before step 04, it is not.

Nothing covers this: `engine/__tests__/stepValues.test.ts:44-48` asserts Kang expert returns 45
in isolation, but no test relates that figure to where `setup.escenario.02` sits in the
sequence, and `engine/__tests__/content.test.ts` has no ordering assertion for `value` steps.

**Fix:** content-only. Either reorder so the difficulty swap precedes the dial (preferred — it
also matches RR p.28, where Expert setup replaces the villain cards while building the villain
deck), or give the dial step an explicit `expert` variant. Reordering:

```jsonc
// setup.escenario: move the current .04 (difficulty card swap) to run BEFORE the dial step,
// renumbering ids so the sequence reads:
//   setup.escenario.02  -> "Comprobad qué cartas de villano numeradas exige la dificultad…"
//   setup.escenario.03  -> "Ajustad el dial de vida del villano…"   "value": "villainHealth"
```

Variant alternative, if renumbering is too invasive for saved games:

```jsonc
{
  "id": "setup.escenario.02",
  "value": "villainHealth",
  "text": "Ajustad el dial de vida del villano al valor indicado en la carta de villano.",
  "variants": {
    "difficulty": {
      "expert": {
        "text": "Ajustad el dial del villano al valor de su carta de modo Experto.",
        "speech": "Ajustad el dial del villano al valor de su carta de modo Experto."
      }
    }
  }
}
```

Note the variant route needs a matching pregenerated audio id
(`setup.escenario.02.expert`, per `engine/resolve.ts:28-36`), so reordering is the cheaper fix.

#### CR-02: `optionsWarningDetail` never reaches `StepScreen` — authored content and an emit path are dead

**File:** `engine/resolve.ts:7-17` (root cause) → `app/pages/[game]/index.vue:706` →
`app/components/StepScreen.vue:23, 165-175`

**Issue:** `resolveText` rebuilds the `TextBlock` field by field and omits
`optionsWarningDetail`:

```ts
return {
  text: …, warning: …, warningDetail: …,
  options: …, optionsWarning: …, speech: …,   // optionsWarningDetail missing
}
```

Consequences, all confirmed empirically (temporary probe test against the real content, since
removed):

```
STEP ID: ronda.jugadores.01 | optionsWarningDetail => undefined
```

- `index.vue:706` passes `currentText.optionsWarningDetail ?? null`, i.e. **always `null`**.
- `StepScreen.vue:166` (`v-if="optionsWarningText && optionsWarningDetailText"`) can therefore
  never be true; the pulsable `⚠ … ›` branch is unreachable code and the
  `open-options-warning-detail` emit / its `onOpenOptionsWarningDetail` handler are dead.
- The 300-character detail authored at `content/marvel-champions.json:410` ("Aturdido cancela
  el próximo ataque…") never displays. TypeScript cannot catch this because the field is
  optional on `TextBlock`.

`engine/schema.ts:168-173` even validates that `optionsWarningDetail` requires
`optionsWarning`, so the build gate confirms the content is well-formed while the runtime
silently discards it.

This is **pre-existing** (introduced by "Quick 260831-fkb", not by Phase 8) and `engine/resolve.ts`
is outside the submitted file list. It is reported here because the broken contract lives in two
of the reviewed files and because a phase whose whole job is "surface a value inside the step"
shipped without noticing that a sibling field is being dropped one function away.

**Fix:**

```ts
// engine/resolve.ts
return {
  text: variant?.text ?? node.step.text,
  warning: variant?.warning ?? node.step.warning,
  warningDetail: variant?.warningDetail ?? node.step.warningDetail,
  options: variant?.options ?? node.step.options,
  optionsWarning: variant?.optionsWarning ?? node.step.optionsWarning,
  optionsWarningDetail: variant?.optionsWarningDetail ?? node.step.optionsWarningDetail,
  speech: variant?.speech ?? node.step.speech,
}
```

Add a regression test asserting every optional key of `TextBlock` survives `resolveText` — a
key-set comparison, not one assertion per field, so the next added field cannot be forgotten
the same way.

### Warnings

#### WR-01: `catalogue.villains` / `catalogue.heroes` are assumed to be arrays; a bad regeneration throws inside a Vue computed

**File:** `engine/stepValues.ts:66, 98`

**Issue:** Both lookups guard only against `catalogue === null`:

```ts
const villain = catalogue !== null ? catalogue.villains.find(v => v.id === villainId) ?? null : null
…
const hero = catalogue !== null ? catalogue.heroes.find(h => h.id === slot.heroId) ?? null : null
```

If `content/marvel-characters.json` is regenerated with `heroes`/`villains` missing, renamed, or
serialised as an object, `.find` is `undefined` and both functions throw `TypeError`. The
phase's defensive contract says the module "must never throw" with a manipulated `catalogue`,
and `engine/__tests__/stepValues.test.ts:180-186` only exercises `catalogue: null`. The risk is
not hypothetical: per `engine/types.ts:181-183` the file's sole writer is
`scripts/catalogue/fetch-marvelcdb.mjs`, driven by a third-party API, and `engine/counters.ts:35-40`
already carries an explicit guard (WR-07) against that same script emitting an unusable
`health`. A throw here happens inside `stepValueSuffix`/`stepValueRows`, i.e. during render of
the step screen — the group's tablet blanks mid-setup.

**Fix:**

```ts
const villains = Array.isArray(catalogue?.villains) ? catalogue.villains : []
const villain = villains.find(v => v?.id === villainId) ?? null
// …and, in resolveStepValueRows:
const heroes = Array.isArray(catalogue?.heroes) ? catalogue.heroes : []
const hero = heroes.find(h => h?.id === slot.heroId) ?? null
```

Extend the defensive suite with `{ gameId: 'marvel-champions' }` (no arrays) and
`{ heroes: {}, villains: 42 }` cases.

#### WR-02: `StepValueKind` is written three times, and the engine's copy is untyped string literals

**File:** `engine/types.ts:13-18`, `engine/schema.ts:84`, `engine/stepValues.ts:62, 91, 105`

**Issue:** `engine/types.ts:13-14` claims the enum exists "para que `StepDefinition.value` y
`StepSchema` (engine/schema.ts) citen el mismo enum **sin teclearlo dos veces**". It is in fact
typed three times, and none of the three is derived from another:

1. `export type StepValueKind = 'villainHealth' | 'heroHealth' | 'handSizeAlterEgo'`
2. `value: z.enum(['villainHealth', 'heroHealth', 'handSizeAlterEgo']).optional()`
3. bare literals in `stepValues.ts` (`kind !== 'villainHealth'`,
   `kind !== 'heroHealth' && kind !== 'handSizeAlterEgo'`, `kind === 'heroHealth'`)

Because both engine entry points take `kind: string | null | undefined` (a deliberate choice —
raw JSON reaches the browser unvalidated — but a lossy one), copy 3 has **no compile-time link**
to copy 1. Adding a fourth kind to `types.ts` and `schema.ts` and authoring content that uses it
compiles clean, passes CI, and renders nothing at the table: `resolveStepValue` returns `null`,
`resolveStepValueRows` returns `[]`, `stepValueRows` becomes `null`, and the block does not
exist in the DOM. That is a silent-failure path in a codebase whose stated gate is "fail loudly
at build".

**Fix:** derive all three from one tuple, and make the engine's dispatch exhaustive so a new
member breaks the build:

```ts
// engine/stepValueKinds.ts (new — keeps engine/types.ts type-only)
export const STEP_VALUE_KINDS = ['villainHealth', 'heroHealth', 'handSizeAlterEgo'] as const
export type StepValueKind = typeof STEP_VALUE_KINDS[number]

// engine/schema.ts
value: z.enum(STEP_VALUE_KINDS).optional(),

// engine/stepValues.ts — exhaustive shape map; a 4th kind without an entry is a type error
const OUTPUT_SHAPE = {
  villainHealth: 'single',
  heroHealth: 'rows',
  handSizeAlterEgo: 'rows',
} satisfies Record<StepValueKind, 'single' | 'rows'>
```

#### WR-03: the hard 90-character text budget is enforced on `text` alone, but the rendered string is `text + suffix`

**File:** `engine/schema.ts:33` vs `app/components/StepScreen.vue:77`

**Issue:** `text: z.string().min(1).max(90) // presupuesto duro de 01-UI-SPEC.md` is the build
gate for the big sentence. Phase 8 changed what is actually rendered to
`{{ actionText }}{{ stepValueSuffix ?? '' }}`, adding up to 6 characters (`' (108)'` — Ultron
stage I is 27 per hero, 108 at 4 players) that the gate never sees. No `superRefine` rule
reduces the cap for steps declaring `value: 'villainHealth'`.

Today's corpus escapes by luck, not by design: `setup.escenario.02` is 77 chars (→ 82 rendered),
but the longest `text` in the corpus is **89 of 90**. The day someone adds
`"value": "villainHealth"` to a step near the cap, the rendered line is 95 characters, CI stays
green, and the overflow only shows up on the tablet.

**Fix:** in `GameDefinitionSchema.superRefine`, budget the rendered length:

```ts
const SUFFIX_BUDGET = 6 // ' (108)' — worst case villainHealth at 4 players
if (step.value === 'villainHealth' && step.text.length > 90 - SUFFIX_BUDGET) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Step "${step.id}" declares value:"villainHealth"; text must be <= ${90 - SUFFIX_BUDGET} chars to leave room for the suffix (is ${step.text.length})`,
  })
}
```

Apply the same rule to `variants.difficulty.*.text`, which can also override the sentence.

#### WR-04: the new schema field shipped with no schema tests and no content assertions

**File:** `engine/schema.ts:80-84` (untested), `engine/__tests__/schema.test.ts` (no `value`
case), `engine/__tests__/content.test.ts` (no `value` case)

**Issue:** `selection`, the Fase-6 sibling this field is explicitly modelled on, has three schema
tests (`engine/__tests__/schema.test.ts:212-229`): accepts the valid literal, rejects an
out-of-enum value, rejects declaration inside a difficulty variant. `value` has **zero**. So:

- No test proves a typo (`"value": "villainhealth"`, `"heroHP"`) fails CI. It would, via
  `z.enum`, but that is unverified and a future refactor to `z.string()` would pass unnoticed.
- The invariant documented at `engine/types.ts:72-73` — "Fuera de `TextBlock`, igual que
  `selection`: **no debe poder variar por dificultad**" — is unverified. It currently holds only
  as a side effect of `TextBlockSchema.partial()` being strict; nothing pins it.
- `engine/__tests__/content.test.ts` contains 55 assertions pinning content facts (down to
  `contentVersion === 13`) but none pinning the 4 new keys. Deleting `"value": "villainHealth"`
  from `setup.escenario.02` keeps CI green and silently removes the feature from the table.

**Fix:** mirror the `selection` block verbatim for `value`, and add a content assertion:

```ts
it('exactamente estos 4 pasos declaran value, y con este kind (VAL-01/02)', () => {
  const withValue = allSteps(marvelChampions)
    .filter(s => s.value !== undefined)
    .map(s => [s.id, s.value])
  expect(withValue).toEqual([
    ['setup.heroes.03', 'heroHealth'],
    ['setup.escenario.02', 'villainHealth'],
    ['setup.manos.02', 'handSizeAlterEgo'],
    ['setup.manos.03', 'handSizeAlterEgo'],
  ])
})
```

Add an ordering assertion too — every `value` step must come after the step declaring
`selection: 'characters'`, otherwise it can only ever render nothing (D-15). That assertion is
also the mechanical guard that would have caught CR-01's sibling class of ordering bug.

#### WR-05: the reactive seam added to `useGameSession` is completely untested

**File:** `app/composables/useGameSession.ts:271-284`

**Issue:** `app/composables/__tests__/useGameSession.test.ts` covers only the two new pure
builders (`buildStepValueSuffix`, `buildStepValueCells`). The wiring that actually decides what
the table sees is untested:

```ts
const value = resolveStepValue(currentNode.value?.step.value, session.value.context, catalogue)
…
const rows = resolveStepValueRows(currentNode.value?.step.value, session.value.context, catalogue)
```

Swapping those two calls compiles and every test still passes, yet the villain step would render
an empty list and the hero steps a missing parenthesis. Likewise nothing pins the deliberate
`cells.length ? cells : null` choice (`:284`) — returning `[]` instead of `null` is documented as
mattering ("`null` es lo que hace que el bloque de lista no exista en el DOM") but is only
enforced by `StepScreen.vue`'s belt-and-braces `v-if="stepValueRows && stepValueRows.length"`.

**Fix:** the module is importable without a Nuxt context (both dependencies are static JSON
imports), so a plain Vitest test can drive it:

```ts
const s = useGameSession()
s.start('marvel-champions', { playerCount: 2, difficulty: 'normal',
  selection: { villainId: 'rhino', heroes: [{ heroId: 'thor', playerName: '' }, { heroId: 'she-hulk', playerName: '' }] } })
s.jumpTo(/* runtimeId of setup.escenario.02 */)
expect(s.stepValueSuffix.value).toBe(' (28)')
expect(s.stepValueRows.value).toBeNull()
s.jumpTo(/* runtimeId of setup.heroes.03 */)
expect(s.stepValueSuffix.value).toBeNull()
expect(s.stepValueRows.value).toHaveLength(2)
```

#### WR-06: the defensive test asserts only "does not throw" for the single-value path, not the documented "never NaN"

**File:** `engine/__tests__/stepValues.test.ts:146-156`

**Issue:** For manipulated `playerCount` (`2.5`, `NaN`, `'3'`, `0`, `-1`), the rows path is
asserted properly (`rows.every(r => r !== undefined && Number.isFinite(r.value))`), but
`resolveStepValue` is only wrapped in `expect(…).not.toThrow()`. The documented contract is
stronger — "never return `undefined`, never propagate `NaN`" — and the NaN-propagation risk lives
precisely on that path (`figures.health * playerCount` in `engine/counters.ts:41`). The guard that
saves it is `Number.isInteger(playerCount)` in a *different* module; if that guard were relaxed,
`resolveStepValue` would return `NaN`, `Number.isFinite(NaN)` in `buildStepValueSuffix` would
correctly suppress the suffix — but nothing in this suite would fail, and any future consumer
that formats the raw number would print `(NaN)`.

**Fix:**

```ts
const single = resolveStepValue('villainHealth', ctx, catalogue)
expect(single === null || Number.isFinite(single)).toBe(true)
expect(Number.isNaN(single as number)).toBe(false)
```

### Info

#### IN-01: `justify-center` + `overflow-y-auto` on the same element clips overflow unscrollably

**File:** `app/components/StepScreen.vue:69`

**Issue:** `<main class="flex-1 … flex items-center justify-center … overflow-y-auto">` is the
classic centred-flex-overflow trap: in Chromium and WebKit, once the child is taller than the
container, `justify-content: center` pushes the leading edge past the scroll origin and it cannot
be reached. Phase 8 injects up to 4 rows of `min-h-12` + `py-sm` (~56px each) into that container.
Measured against the tokens (`--text-display: 2.5rem`, line-height 1.2), the worst current case is
roughly 2 display lines (~96px) + `gap-lg` + 4 rows (~224px) ≈ 330px, which fits the target
landscape tablet — so this is latent, not reproduced, and is listed as Info rather than Warning.

**Fix:** if the block ever grows, drop `justify-center` and centre with `my-auto` on the inner
`<div>` instead, which keeps both edges scrollable.

#### IN-02: `currentNode.value?.step.value` reads as a double ref-unwrap and is duplicated

**File:** `app/composables/useGameSession.ts:274, 281`

**Issue:** `step.value` is a plain data field, but next to a `ComputedRef`'s `.value` the
expression is easy to misread (and easy to "fix" wrongly in a later refactor). It is also read
twice.

**Fix:**

```ts
const stepValueKind = computed(() => currentNode.value?.step.value)
// …then use `stepValueKind.value` in both computeds.
```

#### IN-03: `slot` names two different things inside a 10-line loop

**File:** `engine/stepValues.ts:96-117`

**Issue:** The loop variable `slot` is the slot *object* (`{ heroId, playerName }`), while the
emitted field `slot:` is the slot *index*. `slot: index` next to `slot.playerName` in the same
object literal is avoidable ambiguity in the one place where an off-by-one would silently
mislabel a player.

**Fix:** rename the loop variable to `entry` and the index to `slotIndex`; emit
`slot: slotIndex, playerName: entry.playerName`.

#### IN-04: nothing prevents a step declaring both `selection` and `value`

**File:** `engine/schema.ts:79-84`, `app/components/StepScreen.vue:88-147`

**Issue:** `StepScreen.vue:127-129` documents that the value list "ocupa el mismo hueco que la
rejilla `ELECCIÓN`", but the two blocks are independent `v-if`s and the schema has no rule
excluding them. A step declaring both renders the pulsable grid and the non-pulsable list stacked
— the exact affordance ambiguity D-32 exists to prevent.

**Fix:** add to `superRefine`: `if (step.selection !== undefined && step.value !== undefined)`
→ `addIssue`.

#### IN-05: the structural guardrail strips comments with a line-prefix regex

**File:** `engine/__tests__/stepValues.test.ts:189-198`

**Issue:** The D-13 guard removes only lines matching `/^\s*\/\//` and `/^\s*\*/`. A trailing
inline `// … resolveCounterValues …`, or a `/* … resolveCounterValues … */` block whose opener
carries text, survives the filter and fails the test. It errs in the safe direction (false
positive, never false negative), but it will eventually fail for a comment rather than a call,
and the failure message will not say so.

**Fix:** strip block comments and trailing comments too, e.g.
`source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')`, and assert on that.

#### IN-06: the value is display-only and is never spoken

**File:** `app/composables/useGameSession.ts:271-284`, `engine/resolve.ts:28-36`

**Issue:** The narration path is keyed on pregenerated audio ids (`resolveAudioId` → step id), so
a dynamic number structurally cannot enter the audio; `currentText.speech` / `currentText.text`
also carry no suffix. A group relying on the voice hears "Ajustad el dial de vida del villano al
valor indicado en la carta" and never hears "42". This looks like an unavoidable consequence of
the pregenerated-audio decision rather than an oversight, but the product promise is "texto grande
**y en voz alta**", and nothing in the phase artefacts records the trade-off.

**Fix:** documentation only — record in the phase summary (and in the `stepValueSuffix` comment)
that the figure is deliberately visual-only because audio is pregenerated at build time.

---

_Reviewed: 2026-09-09T12:55:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
