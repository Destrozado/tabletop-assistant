---
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
reviewed: 2026-08-30T20:05:58Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - app/components/AppHeader.vue
  - app/components/MiniSetupScreen.vue
  - app/components/VoiceUnavailableNotice.vue
  - app/composables/useVoiceAnnouncer.ts
  - app/composables/usePersistedSession.ts
  - app/composables/__tests__/useVoiceAnnouncer.test.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - app/pages/[game]/index.vue
  - engine/__tests__/content.test.ts
  - content/marvel-champions.json
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-08-30T20:05:58Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the TTS narration layer (`useVoiceAnnouncer`), the localStorage seam (`usePersistedSession`), the wake-lock wiring in the runner page, and the Marvel Champions content/schema additions from Phase 3.

The parts explicitly flagged as fragile in the domain risks held up well under direct inspection and, in one case, empirical reproduction:

- All 5 `announce()` call sites in `app/pages/[game]/index.vue` are genuinely synchronous inside their tap handlers — no `await`/`setTimeout`/`.then()` breaks the iOS gesture chain.
- `speak()`/`cancel()` pairing is handled correctly — VueUse's `useSpeechSynthesis.speak()` itself calls `synth.cancel()` before `synth.speak()` (verified by reading `node_modules/@vueuse/core/dist/index.js`), so repeated taps cannot queue stale narration, and `useVoiceAnnouncer`'s own `try/catch` around `speak()`/`stop()` covers the documented iOS post-utterance `TypeError`.
- `resolveVoiceState`/`shouldAnnounce`/`hasSpanishVoice`/`detectSpanishVoice` are pure, well-tested, and correctly bounded (2s race against `voiceschanged`, `settled` flag prevents double-invocation).
- `VOICE_KEY` (`tga:voice-enabled`) is genuinely independent from `tga:progress:<gameId>` — `clear(gameId)` cannot touch it, confirmed by reading the key construction and by the dedicated unit test.
- Wake lock request/release sites (`onConfirm`, `onResumeContinue`, `onContentChangedAcknowledge`, `onDiscardConfirm`) match VueUse's `useWakeLock()` semantics (idempotent `request()`, `tryOnScopeDispose`-backed release on unmount, explicit release on the one non-unmounting discard transition); all requests/releases are `.catch(() => {})`-guarded so a rejection can never block navigation.
- Content/schema additions (27 new `speech` strings, `contentVersion` 11, D-38/D-39/D-41 gates) are internally consistent and covered by passing gates; `npm test` is green at 180/180.

That said, two real defects surfaced under closer inspection of exactly the failure modes the domain risks called out — a dangling timer/listener in the voice-detection code, and (confirmed by direct reproduction against the installed Vue/VueUse versions, not by inference) an unbounded leak of `window` `storage` listeners and orphaned reactive effects every time `usePersistedSession()`'s functions are called from outside a component's synchronous `setup()`/lifecycle-hook scope — which is exactly how `save()` is invoked on every single game-step transition. Neither breaks functional correctness observed in tests, but both are genuine, provable robustness defects in code whose only other safety net is a single non-granular human tablet check (see IN-03).

## Warnings

### WR-01: `detectSpanishVoice`'s listener and fallback timer are never cleaned up if the component unmounts first

**File:** `app/composables/useVoiceAnnouncer.ts:81-115`
**Issue:** `detectSpanishVoice()` calls `synth.addEventListener('voiceschanged', () => finish(synth.getVoices()), { once: true })` and schedules `setTimeout(() => finish(synth.getVoices()), timeoutMs)` (default 2000ms), invoked from `onMounted` at line 111-115. Neither the listener nor the timer id is retained by the caller, and `useVoiceAnnouncer` has no `onUnmounted`/cleanup hook anywhere in the file. If the user navigates away from the game page (browser back, or tapping "Volver al selector" before the 2s window elapses, or before `voiceschanged` fires on a slow device), the closure stays alive: the `setTimeout` still fires later and writes to an orphaned `available` ref, and — if `voiceschanged` never fires at all — the listener stays registered on the long-lived `window.speechSynthesis` singleton indefinitely (removed only by its own `{ once: true }` firing, which may never happen on the Safari versions this exact code's comments cite as the reason for the fallback timer in the first place). This is precisely the failure mode called out in the domain risks for this review.
**Fix:** Have `detectSpanishVoice` return a cancel function, and call it from an `onUnmounted` hook in `useVoiceAnnouncer`:
```ts
export function detectSpanishVoice(
  synth: SpeechSynthesis | undefined,
  onResult: (available: boolean) => void,
  timeoutMs = 2000,
): () => void {
  if (!synth) { onResult(false); return () => {} }
  let settled = false
  function finish(voices: ReadonlyArray<{ lang: string }>) { /* ... */ }
  const onVoicesChanged = () => finish(synth.getVoices())
  synth.addEventListener('voiceschanged', onVoicesChanged, { once: true })
  const timer = setTimeout(() => finish(synth.getVoices()), timeoutMs)
  return () => {
    settled = true
    clearTimeout(timer)
    synth.removeEventListener('voiceschanged', onVoicesChanged)
  }
}

// in useVoiceAnnouncer:
onMounted(() => {
  const cancel = detectSpanishVoice(/* ... */)
  onUnmounted(cancel)
})
```

### WR-02: `usePersistedSession()`'s functions leak a `window` `storage` listener and reactive effects on every call made outside setup/lifecycle-hook scope — confirmed by reproduction

**File:** `app/composables/usePersistedSession.ts:56-89` (consumed from `app/pages/[game]/index.vue:105-112, 258-268`; `app/composables/useVoiceAnnouncer.ts:158-166`)
**Issue:** `load`, `save`, `clear`, `loadVoicePreference`, and `saveVoicePreference` each call `useLocalStorage(...)` fresh, inline, on every invocation — instead of creating one persistent ref per key when `usePersistedSession()` itself is set up. VueUse's `useStorage` (which `useLocalStorage` wraps) creates, per call: an internal `watchPausable(data, write, ...)` watcher and a `useEventListener(window, 'storage', onStorageEvent, { passive: true })` (an actual `window.addEventListener`) — verified by reading `node_modules/@vueuse/core/dist/index.js`. Both are only auto-disposed if they're registered on an active Vue `EffectScope`, and a `ReactiveEffect`/watcher only registers itself to `activeEffectScope` **at creation time**, which is only set while a component's own `setup()` body or a lifecycle hook wrapped via `setCurrentInstance` (e.g. `onMounted`) is *synchronously* executing — not while a `watch()`/`watchDebounced()` callback or a native DOM event handler is running later.

I confirmed this empirically against the exact installed `vue` package (not by inference): `getCurrentScope()` returns `undefined` inside a `watch()` callback body even when that `watch()` was itself created inside an active `effectScope`, and any effect created inside that callback is **not** added to `scope.effects` — meaning `scope.stop()` (Vue's unmount cleanup) cannot dispose it.

In this codebase, `save(value)` is invoked from the `watchDebounced(session, (value) => { ...; save(value) }, { debounce: 300 })` callback in `app/pages/[game]/index.vue:105-112` — i.e. on every "Siguiente"/"Atrás" step transition during an actual game. `saveVoicePreference()` runs inside the `toggle()` click handler (`useVoiceAnnouncer.ts:158-166`), and `clear()`/`load()` run inside click handlers / `onMounted` respectively. Every one of these calls that happens **outside** the initial synchronous `setup()`/`onMounted` execution (which, for `save()`, is *all* of them — it is never called during setup) creates a permanently orphaned watcher plus a permanent `window` `'storage'` listener. Over a multi-hour Marvel Champions session (the app's actual intended usage pattern — a tablet left running for a full game), this accumulates one leaked listener/watcher pair per step navigated, for the lifetime of the tab.

This does not currently corrupt data (the localStorage write itself still succeeds — see reproduction script referenced below), so it is not classified as data loss, but it is a genuine, unbounded resource leak in exactly the "single seam for localStorage" the file's own header comment describes as load-bearing.
**Fix:** Create the reactive refs once, inside the body of `usePersistedSession()`, keyed by a `Map<string, Ref<string | null>>` (progress can have multiple `gameId`s) plus one ref for `VOICE_KEY`, so they're registered to the calling component's effect scope exactly once:
```ts
export function usePersistedSession() {
  const progressRefs = new Map<string, ReturnType<typeof useLocalStorage<string>>>()
  function progressRef(gameId: string) {
    let r = progressRefs.get(gameId)
    if (!r) {
      r = useLocalStorage<string>(storageKey(gameId), '', { writeDefaults: false })
      progressRefs.set(gameId, r)
    }
    return r
  }
  const voiceRef = useLocalStorage<boolean>(VOICE_KEY, true, { writeDefaults: false })

  function load(gameId: string): PersistedPosition | null { /* use progressRef(gameId).value */ }
  function save(session: EngineSession) { /* use progressRef(session.gameId).value = ... */ }
  function clear(gameId: string) { progressRef(gameId).value = null }
  function loadVoicePreference(): boolean { return normalizeVoicePreference(voiceRef.value) }
  function saveVoicePreference(enabled: boolean): void { voiceRef.value = enabled }
  // ...
}
```
Note `usePersistedSession()` itself must then be called exactly once per consumer during synchronous `setup()` (it already is, in `app/pages/[game]/index.vue:38` and `useVoiceAnnouncer.ts:89`), so the refs created above are correctly scoped.

### WR-03: No automated test exercises the stateful composables this review had to reason about manually

**File:** `app/composables/__tests__/useVoiceAnnouncer.test.ts`, `app/composables/__tests__/usePersistedSession.test.ts`
**Issue:** Both test files explicitly (and correctly, per their own comments) restrict themselves to the pure helper functions (`resolveVoiceState`, `shouldAnnounce`, `hasSpanishVoice`, `detectSpanishVoice`, `normalizeVoicePreference`) because the plain `node` Vitest environment used for `app-logic` can't construct a `SpeechSynthesisUtterance` or a Nuxt-context `useLocalStorage`. As a result, `useVoiceAnnouncer()`'s actual composed behavior (`announce`, `toggle`, `silence`, the `onMounted`/`watch` wiring, and the leak described in WR-01) and every stateful function in `usePersistedSession()` (`load`/`save`/`clear`/`loadVoicePreference`/`saveVoicePreference`, and the leak described in WR-02) have zero automated coverage. The project's own Phase 3 human-verification checkpoint (03-05) was a single global "aprobado, lo veo bastante bien" verdict, explicitly not broken down per step (see 03-05-SUMMARY.md), and did not exercise a second device for the no-Spanish-voice path. Combined, this is why WR-01/WR-02 shipped past `npm test` (180/180 green) and the human checkpoint.
**Fix:** Add a `@nuxt/test-utils`-mounted (or a minimal `effectScope`-based) test that mounts `useVoiceAnnouncer`/`usePersistedSession` inside a real Vue effect scope, calls the debounced `save()`/`toggle()` path repeatedly, and asserts `scope.stop()` leaves no dangling `window` listeners (e.g. snapshot `getEventListeners` counts, or spy on `addEventListener`/`removeEventListener` symmetry) — this is exactly the kind of regression this review had to detect by reading VueUse internals rather than by a failing test.

## Info

### IN-01: `useVoiceAnnouncer()` exposes `available`, `isSupported`, and `silence`, none of which its only caller consumes

**File:** `app/composables/useVoiceAnnouncer.ts:178-187`, `app/pages/[game]/index.vue:44-50`
**Issue:** The composable's return object includes `available`, `isSupported`, and `silence`, but `app/pages/[game]/index.vue` (the only production call site) destructures only `voiceState`, `announce`, `toggle`, `showVoiceUnavailableNotice`, `dismissNotice`. `silence` is used internally by `toggle()`/the visibility watch, so it's not truly dead, but exposing it externally with no consumer is unnecessary public surface.
**Fix:** Either drop the unused exports from the return object until a real consumer exists, or add a short comment noting they're kept for test/future use, to make the intent explicit.

### IN-02: `detectSpanishVoice` doesn't guard `synth.getVoices()` against throwing

**File:** `app/composables/useVoiceAnnouncer.ts:75-82, 112-114`
**Issue:** `synth.getVoices()` is called directly (initial check, inside the `voiceschanged` handler, and inside the timeout callback) with no `try/catch`. Some hardened/embedded WebViews and permissions-policy-restricted contexts are known to throw rather than return `[]` when speech synthesis is disabled. Should this happen, the exception propagates out of an `onMounted` hook uncaught, leaving `available.value` stuck at `null` (the optimistic "on" state) rather than degrading to `false`/`unavailable` as the rest of the design intends. Low likelihood, but inconsistent with the project's explicit "TTS may never block or break the flow" requirement.
**Fix:** Wrap each `synth.getVoices()` call site in try/catch, treating a thrown error the same as an empty/failed detection (`onResult(false)`).

### IN-03: Residual QA gaps carried over from the Phase 3 human checkpoint (context, not a code defect)

**File:** n/a — process note referencing `.planning/phases/03-locuci-n-por-voz-y-pantalla-siempre-encendida/03-05-SUMMARY.md`
**Issue:** The one human verification pass for this phase gave a single global approval rather than a step-by-step one, left the tablet model/OS unknown, and explicitly did not verify the "no Spanish voice on a second device" sub-check. This doesn't block the phase per the project's own recorded decision, but it means the WR-01/WR-02 findings above were not — and structurally could not have been — caught by the human checkpoint either.
**Fix:** No code change; carry this forward as already tracked in `03-05-SUMMARY.md`'s "Brechas abiertas trasladadas" section.

---

_Reviewed: 2026-08-30T20:05:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
