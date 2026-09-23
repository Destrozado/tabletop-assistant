---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-19T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - app/components/HistorySavedNotice.vue
  - app/components/ResumePrompt.vue
  - app/composables/__tests__/afirmacionesRespaldadas.test.ts
  - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
  - app/composables/__tests__/useGameEndCopy.test.ts
  - app/composables/__tests__/useHistorySavedNotice.test.ts
  - app/composables/__tests__/useProgressMismatchMark.test.ts
  - app/composables/useGameEndCopy.ts
  - app/composables/useHistorySavedNotice.ts
  - app/composables/useProgressMismatchMark.ts
  - app/pages/[game]/index.vue
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Sentence-by-sentence, the copy in `useHistorySavedNotice.ts`, `useGameEndCopy.ts` and
`useProgressMismatchMark.ts` is well-earned: every claim traces to a specific field
`readStoredProgress`/`esLaMismaPartida`/`planGameEnd` actually establish, and the negative
assertions the previous seven rounds added (no "versión anterior", no "la ronda", no bare
"reintentar") are still true against the current text. `buildEndGameBody` makes no promise
ahead of the device read — both its sentences hold regardless of which of the four
`<GameOutcomeDialog>` exits fires, confirmed by walking `GameOutcomeDialog.vue` and
`onOutcomeRecorded`/`onOutcomeDismiss` directly. The four Gate A/B/C/S tests in
`afirmacionesRespaldadas.test.ts` are not vacuous: Gate S's synthetic mutation tests prove
`frasesSinAuditarDe`/`variantesSinRespaldoDe` actually return non-empty results, and a targeted
inversion of `frasesSinAuditarDe`'s filter direction would break at least one Gate S assertion.

However, the **new** mechanism this round shipped — `useProgressMismatchMark.ts`'s module-scoped
mark and its two consumers in `app/pages/[game]/index.vue` — has a lifecycle gap that
reintroduces exactly the class of defect this phase exists to close: the mark is never
invalidated once its own precondition (an untouched leftover autosave) stops being true, so a
later mount can show `PROGRESS_MISMATCH_WARNING` — a **true statement about a game that no
longer exists in that form** — as if it still described what's on disk. A second, related gap:
the mark is computed but never displayed at all when the mount lands on the
`content-changed-notice` branch instead of `resume-prompt`. Two further findings concern the
class-gate itself as enforcement code, not the copy it guards.

## Critical Issues

### CR-01: `PROGRESS_MISMATCH_WARNING` mark is not invalidated once the progress it describes has been overwritten, so a later mount can show a now-false claim

**File:** `app/pages/[game]/index.vue:202` (read), no corresponding clear in `onResumeContinue` (`app/pages/[game]/index.vue:527-537`)
**Also:** `app/composables/useProgressMismatchMark.ts:47-96`

**Issue:** `useProgressMismatchMark.ts` documents its own invariant precisely: *"esta marca está
puesta exactamente cuando el último cierre de partida de este gameId encontró discrepancia **y
el progreso que dejó sigue ahí**"* (lines 56-57, 98-101). Nothing in `app/pages/[game]/index.vue`
enforces the second half of that invariant once the group chooses to *continue* the flagged
session instead of discarding it.

Trace:
1. A game ends with `historyRecorded === false` and `stored === 'stale'`. `onOutcomeRecorded`
   (index.vue:717) calls `markProgressMismatch(gameId)`. `preserveProgress` is `true`, so the
   stale leftover autosave stays on disk untouched — the mark's precondition holds.
2. The group re-enters the same game. `onMounted` (index.vue:188-206) reads
   `readStoredProgress(game)` **without `esperada`** (by design — there is nothing to compare at
   mount time), finds the leftover autosave `resumable`, and sets
   `avisoDiscrepancia.value = readProgressMismatchWarning(gameId)` (line 202). `ResumePrompt`
   correctly shows the warning: at this instant it is true.
3. The group clicks "Continuar" → `onResumeContinue` (lines 527-537). This sets
   `session.value = informe.session` and starts playing — but calls neither
   `clearProgressMismatch` nor anything else that invalidates the mark. The mark is still set in
   `juegosConProgresoQueNoCoincide`.
4. The resumed session autosaves repeatedly via the 300ms `watchDebounced` (lines 212-219) as the
   group plays. Each autosave **overwrites** `tga:progress:<gameId>` on disk. The leftover
   autosave the mark was about no longer exists in any form — it has been replaced by legitimate,
   matching progress of the game now in progress.
5. The group navigates away without finishing (browser back button or any client-side route to
   `/`, both confirmed SPA-only navigation — no `window.location`/`location.href` calls exist
   anywhere in `app/`, and the only path into `/{game}` is from `/pages/index.vue`'s
   `navigateTo('/' + gameId)`, so `[game]/index.vue` fully unmounts and remounts on this round
   trip) and re-enters the same game again.
6. `onMounted` runs again. `readProgressMismatchWarning(gameId)` (line 202) **still returns
   `PROGRESS_MISMATCH_WARNING`**, because nothing ever cleared it in step 3. `ResumePrompt` now
   displays: *"al terminar la última partida de este juego, la app no pudo registrarla y comprobó
   que lo que había guardado no era el punto en el que habíais terminado"* — but no game has
   "just ended" since step 1, and the progress on disk is not the stale snapshot the mark was
   ever compared against. The sentence is now **false**, shown as if it were a fresh, respaldada
   claim.

This is the same class of defect eight rounds of `09-VERIFICATION.md` already closed elsewhere
(a sentence the app shows measures something other than what is currently true), reintroduced in
the one piece of state this round added that is explicitly *not* backed by a fresh read on every
display (by design, per the file's own "no localStorage" rationale) — which makes it the reader's
job to re-validate on every consumption, and that re-validation is missing.

**Fix:** Clear the mark at the point where continuing supersedes the snapshot it was compared
against, not only at discard/re-record time:

```ts
// app/pages/[game]/index.vue
function onResumeContinue() {
  awaitingResumeChoice.value = false
  // The mismatch mark (if any) described the leftover autosave that is about
  // to be resumed and re-saved under the group's own play — from this point
  // it no longer refers to "a snapshot left over from another game", it
  // refers to "the game currently in progress". Clear it here so a later
  // mount before this game ends can't show it as if it were still true.
  clearProgressMismatch(gameId)
  announce()
  requestWakeLock('screen').catch(() => {})
  prefetchAll(audioIds.value).catch(() => {})
}
```

The same reasoning applies to `onContentChangedAcknowledge` (see WR-01 below): whichever
resumption path is taken invalidates the comparison the mark was based on.

## Warnings

### WR-01: The mismatch warning is silently dropped whenever the mount resolves to `content-changed-notice` instead of `resume-prompt`

**File:** `app/pages/[game]/index.vue:196-206`, `app/components/ContentChangedNotice.vue:1-46`

**Issue:** `onMounted` computes `avisoDiscrepancia.value = readProgressMismatchWarning(gameId)`
(line 202) unconditionally whenever `plan.action` is `'resume-prompt'` **or**
`'content-changed-notice'` — the comment above it says so explicitly: *"se llega aquí solo cuando
plan.action es 'resume-prompt' o 'content-changed-notice'"* (lines 198-200). But the template only
ever passes `avisoDiscrepancia` to `<ResumePrompt>` (line 827); `<ContentChangedNotice>`
(lines 844-849) accepts no such prop and has no rendering path for it at all.

Reaching `content-changed-notice` while a mismatch mark is still set is realistic, not
hypothetical: it's the leftover-autosave scenario from CR-01, except this time the leftover
autosave's `contentVersion`/`formatVersion` no longer matches the currently-loaded game content
(e.g. content shipped between sessions), so `resume()` returns `'content-changed'` instead of
`'resumed'`. In that case the group is shown "El contenido ha cambiado… Volvemos al inicio de
{sección}" with **zero indication** that the position being carried over might not correspond to
the game they last tried (and failed) to register — the exact safety net Plan 09-33 built.

**Fix:** Either surface the warning on this path too (extend `ContentChangedNotice` with the same
optional prop `ResumePrompt` has), or, at minimum, treat it consistently with CR-01's fix and
clear the mark in `onContentChangedAcknowledge` so it cannot resurface later as a false claim
(same reasoning as CR-01: once acknowledged/resumed, the mark's referent is gone either way).

### WR-02: `respaldoExiste` only proves the audited path exists — it never checks that the file actually backs the specific `raiz` it's cited for

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:167-176, 552-560, 947-957`

**Issue:** `AfirmacionAuditada.respaldo` is documented as needing to name "un fichero real del
repo que EJERCE la comprobación que el motivo describe" (lines 156-160), explicitly replacing an
unverifiable prose `motivo` with something "comprobable". But `respaldoExiste(ruta)` (line
174-176) only checks `rutasConRespaldoPosible.has(ruta)` — i.e. that the path exists anywhere
under `app/**` or `engine/**`. It never opens the file and checks that its content is related to
the `raiz`/frase in question. Concretely, every entry in `AFIRMACIONES_AUDITADAS` for
`'app/composables/useGameEndCopy.ts'` could have its `respaldo` field pointed at, say,
`'app/composables/useVoiceAnnouncer.ts'` (a real, unrelated file) instead of
`useGameEndCopy.test.ts`, and every test in this describe block (`respaldoExiste` returns `true`,
motivo length ≥ 40, no circular phrase) would still pass. The gate is checking "a citation was
provided and points somewhere real", not "the citation supports the claim" — a materially weaker
guarantee than the file's own stated purpose.

**Fix:** Add a minimal relevance check — e.g. read each audited `respaldo` file's content (the
existing `import.meta.glob` maps already loaded for Gate A/C give you the raw source) and assert
it contains either the literal `raiz` or a recognizable reference to the exported symbol the
`motivo` names (e.g. `buildEndGameBody`, `planGameEnd`). This doesn't need to be exhaustive
static analysis — even a substring check on the respaldo file's content closes the gap that a
pure path-existence check leaves open.

### WR-03: The circular-motivo detector is itself a single hardcoded substring match, exactly the evasion class this file exists to close

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:967-979`

**Issue:** This file's entire premise (documented at the top, lines 69-83) is that a *closed
vocabulary of literal substrings* (`VOCABULARIO_CERRADO_HASTA_LA_RONDA_7`) failed to catch new
phrasings of the same underlying claim, which is why Gate A/B moved to lexical *roots*. The test
that guards against a circular `motivo` (*"la garantía real la da..."*, the literal phrase ronda 8
found) reintroduces the same closed-vocabulary pattern one level up:

```ts
const FRASE_CIRCULAR = 'la garantía real la da'
...
if (afirmacion.motivo.toLowerCase().includes(FRASE_CIRCULAR)) {
  // only here does it require naming a file/identifier
}
```

Any equivalently circular motivo phrased differently — e.g. "el respaldo real lo garantiza Gate B
más abajo" or "eso ya lo cubre el otro gate de este fichero" — never enters the `if`, so it never
has to name a file or identifier, and passes with only the length ≥ 40 check (trivially satisfied
by padding). The specific defect ronda 8 found (a motivo that delegates its guarantee without
naming what backs it) is therefore still reachable through the exact same class-gate that exists
to close it, just phrased one word differently.

**Fix:** Make the "must name a file or identifier" check unconditional for every
`AfirmacionAuditada` entry, not gated behind matching one literal phrase first:

```ts
it('todo motivo de AFIRMACIONES_AUDITADAS nombra un fichero o un identificador comprobable (no solo prosa)', () => {
  for (const [ruta, afirmaciones] of Object.entries(AFIRMACIONES_AUDITADAS)) {
    for (const afirmacion of afirmaciones) {
      const nombraFichero = /\.(ts|vue)\b/.test(afirmacion.motivo)
      const nombraIdentificadorCamelCase = (afirmacion.motivo.match(/\b[a-z][a-zA-Z0-9]*\b/g) ?? [])
        .some(palabra => palabra.length >= 8 && /[A-Z]/.test(palabra))
      expect(nombraFichero || nombraIdentificadorCamelCase, `${ruta} (${afirmacion.raiz}): motivo sin fichero ni identificador`).toBe(true)
    }
  }
})
```

## Info

### IN-01: `motivo.length >= 40` is a length threshold, not a substance check, and is easily satisfied by padding

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:959-965`

**Issue:** The test enforcing a minimum `motivo` length ("un motivo de una palabra no es un
motivo") only measures character count. A 40+ character motivo consisting entirely of filler
prose with no verifiable claim (e.g. "Esto es correcto porque se ha comprobado con mucho
cuidado.") passes this check identically to a motivo that names the real mechanism. Combined with
WR-02/WR-03, none of Gate S's three "quality" checks on `AfirmacionAuditada` (length, respaldo
existence, non-circularity) actually verifies that the exception is *substantively* justified —
only that it has the right shape. Not a blocker on its own, but worth tightening alongside WR-02
so the three checks compound into something closer to enforcement rather than three independent,
individually-gameable heuristics.

**Fix:** No standalone action required if WR-02's content-relevance check is added — a `motivo`
that must also correspond to real content in a real `respaldo` file is much harder to game via
padding alone. Consider it addressed as a side effect of WR-02's fix rather than requiring its own
test.

---

_Reviewed: 2026-09-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
