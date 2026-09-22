---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-22T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/components/ContentChangedNotice.vue
  - app/composables/__tests__/afirmacionesRespaldadas.test.ts
  - app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts
  - app/composables/__tests__/useProgressMismatchMark.test.ts
  - app/composables/__tests__/useStoredProgress.test.ts
  - app/composables/__tests__/vocabularioDeAfirmaciones.ts
  - app/composables/useProgressMismatchMark.ts
  - app/composables/useStoredProgress.ts
  - app/pages/[game]/index.vue
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This is the ninth review pass over the same defect class (a claim about the group's stored progress outliving or misdescribing its referent). I traced the fingerprint mechanism (`huellaDelProgreso` in `useStoredProgress.ts`, the `Map<string,string>` in `useProgressMismatchMark.ts`, and the two call sites in `app/pages/[game]/index.vue`) end to end against every branch the code and its own comments claim to cover, and traced the five "patas" of `invariantesDeMarcaDeEstado.test.ts` against the actual regex/parsing code that implements them.

**On the specific questions raised in the phase context:**

1. **Fingerprint mechanism.** For the concrete scenario CR-01 originally described (mark set on a stale snapshot, "Continuar" resumes it, the 300 ms autosave later overwrites it with legitimate progress, a later mount re-reads the mark), the fingerprint comparison in `readProgressMismatchWarning` does correctly invalidate the mark on its own — the autosave changes `updatedAt` (and usually `cursor`/`round`), which changes `huellaDelProgreso`'s output, so a later read no longer matches. I could not construct a scenario where the *current, real* application code shows a warning that misdescribes what is currently on disk. However, the "segunda defensa" (`clearProgressMismatch` in `onResumeContinue`/`onContentChangedAcknowledge`) that the comments describe as independent of this mechanism has **zero test coverage** — see WR-03 below, which is a real, confirmed gap, exactly as the phase context predicted.
2. **Escape hatches in the gates.** I found two structural blind spots in `invariantesDeMarcaDeEstado.test.ts`'s own parsing machinery (not in `respaldoRespaldaA`'s already-self-documented substring heuristic) that are the same *shape* of trap as the previously-fixed self-referential `.toContain` — see WR-01 and WR-02.
3. **`onResumeContinue`.** Confirmed by direct inspection, not just by the phase context's framing: removing either `clearProgressMismatch` call in `app/pages/[game]/index.vue` (lines 546 and 788) does not make any of the five patas, nor any other test in scope, fail. See WR-03.

No BLOCKER-level issue was found in the code paths that real users actually exercise today; the warnings below concern the reliability of the anti-recurrence machinery itself and test-coverage gaps, which is exactly where nine rounds of history says this defect class hides.

## Warnings

### WR-01: Angle brackets are not tracked as nesting depth, so a generic type in a parameter/argument list can defeat both Pata 1 and Pata 2

**File:** `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts:94-128`

**Issue:** `indiceDeCierre` and `argumentosDeNivelSuperior` track nesting depth only for `(`, `[`, `{` (and their closers). Neither function accounts for `<`/`>`. Both Pata 1's arity check (`contratoDeLaMarcaDe`, via `extraerFuncionesExportadas`) and Pata 2's witness check (`lecturasSinTestigoDe`, via `llamadasA`) rely on `argumentosDeNivelSuperior` to split a parameter/argument list on top-level commas.

A parameter or argument whose *type* contains a comma inside angle brackets — e.g. `function leer(id: string, testigo: Record<string, string>): string | null` or a call site `lector(gameId, x as Map<string, string>)` — has that internal comma treated as a top-level separator, because `<`/`>` never change `profundidad`. This *inflates* the apparent argument count.

Concretely, a single-parameter lector such as `function leer(claves: Record<string, string>): string | null` would be parsed as having **two** parameters (`'claves: Record<string'`, `'string>'`), so `contrato.aridadDelLector` would read `2` and `segundoParametroOpcional` would read `false` — i.e. Pata 1 would report this lector as satisfying "aridad >= 2, segundo parámetro obligatorio" even though it takes no witness parameter at all. Symmetrically, a call site with only one real argument whose type/expression contains an internal comma inside `<>` would not be flagged by `lecturasSinTestigoDe` as missing a witness.

This is exactly the shape of trap the plan 09-39 note already found once (`.toContain(citation)` on a self-citing file) — a place where the detector can be satisfied by something other than the property it claims to check. It does not affect any of the current real files (none of their signatures contain a comma inside `<>`), but it means a future 10th mark with an entirely ordinary TypeScript signature could reintroduce the CR-01 shape of bug while both patas stay green.

**Fix:** Track `<`/`>` alongside `(`/`[`/`{` in both `indiceDeCierre` and `argumentosDeNivelSuperior` (a parameter/argument list is never itself a comparison expression, so treating every `<`/`>` there as depth-changing is safe in this context):

```ts
function indiceDeCierre(region: string, aperturaIndex: number): number {
  let profundidad = 1
  let i = aperturaIndex + 1
  while (i < region.length && profundidad > 0) {
    const c = region[i]
    if (c === '(' || c === '[' || c === '{' || c === '<') profundidad++
    else if (c === ')' || c === ']' || c === '}' || c === '>') profundidad--
    if (profundidad === 0) break
    i++
  }
  return i
}
```
(and the matching change in `argumentosDeNivelSuperior`'s depth tracking loop).

### WR-02: The module-state discovery regex accepts untyped `const`/`let` but rejects `const` with an explicit type annotation, letting a plausible future mark evade discovery entirely

**File:** `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts:192`

**Issue:**
```ts
const PATRON_ESTADO_DE_MODULO_MUTABLE = /^(const [A-Za-z_$][\w$]* = (new (Set|Map)\b|ref[<(])|let [A-Za-z_$])/m
```
The `const` alternative requires the identifier to be followed immediately by `=` (no type annotation permitted in between). The `let` alternative has no such restriction — it matches on `let <identifier>` alone, regardless of what follows.

This asymmetry means a state declaration written with an explicit type annotation — an entirely idiomatic TypeScript style, e.g. `const juegosConProgresoQueNoCoincide: Map<string, string> = new Map()` — does **not** match the `const` branch (there is a `: Map<string, string>` between the identifier and `=`), and is silently excluded from `marcasDeEstadoDeModuloDe`'s discovery. A composable author who adds type annotations for clarity (both real marks in the tree today happen not to do this) would produce a mark that is invisible to all five patas — the exact "closed vocabulary" failure mode this whole gap-closure batch (09-37..09-40) was written to eliminate, reproduced one level down in the detector that replaced the closed vocabulary.

The comment at line 191 explicitly claims "una marca DÉCIMA en una ronda futura entra sola, sin editar ninguna lista" — this claim is false for a common and unremarkable authoring style.

**Fix:** Allow an optional type annotation in the `const` branch, mirroring the `let` branch's leniency:

```ts
const PATRON_ESTADO_DE_MODULO_MUTABLE = /^(const [A-Za-z_$][\w$]*\s*(?::[^=]+)?=\s*(new (Set|Map)\b|ref[<(])|let [A-Za-z_$])/m
```

### WR-03: The documented "second defense" (`clearProgressMismatch` in `onResumeContinue`/`onContentChangedAcknowledge`) has no test coverage — confirmed by direct inspection

**File:** `app/pages/[game]/index.vue:546` (`onResumeContinue`) and `app/pages/[game]/index.vue:788` (`onContentChangedAcknowledge`)

**Issue:** Both call sites are described in their own comments as an independent safety net, not a duplicate of the fingerprint validation:

> "Esta llamada es la SEGUNDA defensa (plan 09-38): la primera es la validación de huella de useProgressMismatchMark.ts (Task 1) — las dos son independientes a propósito, no una sustituye a la otra."

I checked every pata of `invariantesDeMarcaDeEstado.test.ts` against what it actually asserts:
- Pata 1/2 (`contratoDeLaMarcaDe`/`lecturasSinTestigoDe`) only check that calls to the **reader** (`readProgressMismatchWarning`) pass a witness argument — they say nothing about calls to the **retirador** (`clearProgressMismatch`).
- Pata 3 (`faltaPruebaDeCicloDeVidaEn`) only checks that `useProgressMismatchMark.test.ts` demonstrates the lifecycle via `markProgressMismatch`/`readProgressMismatchWarning` — it never inspects `app/pages/[game]/index.vue` or `clearProgressMismatch`.
- Pata 4 (`ramasQueLeenSinPintarDe`) only checks that a rendered branch binds the reader's output as a prop — again, nothing about `clearProgressMismatch`.
- `useProgressMismatchMark.test.ts` itself only exercises the module's own three exports in isolation; it has no notion of `app/pages/[game]/index.vue`'s call sites at all.

Deleting either line 546 or line 788 therefore does not turn any test in the current suite red, which is precisely what the phase context flagged as a risk. Reasoning through the actual runtime consequence: I could not construct a scenario where the fingerprint mechanism alone lets a truly *stale* (i.e. semantically wrong) warning through — the autosave that follows resuming changes the on-disk fingerprint before any subsequent mount can re-read it in the paths I traced. So today the two lines function as a currently-redundant, unverified safety net rather than a load-bearing fix. That is still worth flagging: a mechanism explicitly documented as "independent, not a substitute" that regresses silently on removal is a real coverage gap, and given this phase's history (nine rounds finding new faces of the same defect), an untested "independent defense" is exactly the kind of thing likely to matter the next time the surrounding code is refactored.

**Fix:** Add an explicit assertion (e.g. a Pata 6, or a dedicated unit-style check similar to `lecturasSinTestigoDe`) that scans `app/pages/[game]/index.vue` for a call to the discovered mark's `retirador` inside the bodies of `onResumeContinue` and `onContentChangedAcknowledge` (or, more generally, inside every function that resumes a session whose fingerprint could coincide with the marked one before the next autosave). At minimum, add a regression test in `useProgressMismatchMark.test.ts` or a new integration-style test that fails if these two call sites are removed — today nothing does.

## Info

### IN-01: `respaldoRespaldaA` treats any textual mention of the root/identifier in the cited file as "backing," including unrelated comments or prose

**File:** `app/composables/__tests__/vocabularioDeAfirmaciones.ts:177-195`

**Issue:** `respaldoRespaldaA` returns `true` if the cited file's raw content contains the root word (via `contieneRaizSobreLosDatosDelGrupo`) or any "comprobable" identifier from the motivo — a plain substring/identifier search over the whole file, not a check that the file actually *tests* the claim. A `respaldo` entry can cite a real, topically-adjacent test file that merely mentions the word (in a comment, a `describe` title discussing a different aspect, or an unrelated fixture) and pass this check without genuinely exercising the claimed behavior. The authors document this trade-off explicitly ("esto NO es análisis estático exhaustivo"), so this is not a hidden defect, but it is the same class of evidence-substitution this batch has repeatedly had to patch (WR-02 of round 8, closed in 09-39), one level removed.

**Fix:** No change required to ship; if tightened further, consider requiring the identifier/root to appear specifically within an `it(`/`test(` block of the cited file, not anywhere in its content.

### IN-02: The "cierre de cobertura" self-checks verify a raw substring count, not that the cited `it(...)` title is a live, executing test

**File:** `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts:846-866`, `app/composables/__tests__/afirmacionesRespaldadas.test.ts:1104-1123`

**Issue:** Both files' final "cobertura" test counts occurrences of a literal string (`casoSintetico`) in the file's own raw content and requires `>= 2` (one from the citation list, one presumably from the real `it(...)` title). This correctly catches a renamed/deleted `it` (the count drops to 1), which is its stated purpose, and I verified all cited titles do match real `it(...)` blocks today. But the check is still a pure substring count: a stray comment elsewhere in the file containing the exact same string would also satisfy it, independent of whether the corresponding test still exists as a real, executing block. Low severity — it is strictly better than the citation-only trap it replaced, just not airtight.

**Fix:** None required; note for future hardening only (e.g. require the second occurrence to be immediately preceded by `it(` or `it.each(...)(`).

### IN-03: `useStoredProgress.test.ts`'s `huella` table has no case for "a position was read from disk but `resume()` rejected it (`stored: 'absent'`, `huella` non-null)"

**File:** `app/composables/__tests__/useStoredProgress.test.ts:249-359`

**Issue:** `readStoredProgress`'s `huella` is computed from `lectura.position` alone, before `resume()` decides the outcome:

```ts
const huella = lectura.read === 'failed' || lectura.position === null ? null : huellaDelProgreso(lectura.position)
```

So when a position exists on disk but is structurally invalid (e.g. the `playerCount` out-of-range case already covered by the `'context inválido... → fresh/absent'` test at line 98 of this same file), `stored` ends up `'absent'` while `huella` is **not** null — `stored === 'absent'` does not imply `huella === null`. This is consistent with the field's own documented contract (`huella` is about "was a referent read," not about `stored`), and it is currently harmless because `app/pages/[game]/index.vue`'s `onMounted` returns from the `mini-setup` branch (which is what an `'absent'`/`'fresh'` outcome produces) before it ever reads `readProgressMismatchWarning`. Still, the existing "huella — testigo del referente exacto" describe block tests `'absent'`/`'resumable'`/`'stale'`/`'unknown'` but not this fifth, distinct combination, so the table is not actually exhaustive over the code paths that produce `huella`.

**Fix:** Add a test alongside the existing four, reusing the fixture from the `'context inválido'` test (line 98), asserting `report.stored === 'absent'` and `report.huella !== null` — to make the documented invariant ("huella depends only on whether a position was read, never on `stored`") explicit and machine-checked rather than incidental.

---

_Reviewed: 2026-09-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
