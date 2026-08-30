# Phase 3: Locución por voz y pantalla siempre encendida - Research

**Researched:** 2026-08-30
**Domain:** Web Speech API (`speechSynthesis`) + Screen Wake Lock API, wired into an existing Vue 3/Nuxt 4 pure-engine architecture, via `@vueuse/core` 14.4.0 (already installed, no new dependency)
**Confidence:** HIGH on architecture/wiring and on `@vueuse/core` internals (verified directly against the installed `node_modules/@vueuse/core@14.4.0` source, not just docs); MEDIUM on cross-browser `getVoices()`/`voiceschanged` timing (training knowledge + WebSearch, cross-referenced, never verified on a real target tablet — no device is available in this environment); LOW on exact iOS Safari 2026 gesture/Wake Lock edge-case behavior (STACK.md's own caveat, unresolved by this research — the blocking human tablet test in D-53 is where this actually gets confirmed).

## Summary

This phase adds two independent, degradable enhancement layers on top of a flow engine and UI that are both already built and untouched by this work: TTS narration per step (VOZ-01…06) and a screen wake lock while a game is in progress (UI-06/07/08). Both `03-CONTEXT.md` (D-38…D-53, locked) and `03-UI-SPEC.md` (visual/interaction contract, locked) have already resolved almost every design question this phase could raise. What remains genuinely open — and what this research resolves with concrete, source-verified answers — is the *implementation mechanics*: how `@vueuse/core`'s `useSpeechSynthesis`/`useWakeLock`/`useDocumentVisibility` actually behave (read directly from the installed `14.4.0` source, not assumed from docs), where the new voice composable lives without breaking the `engine/` purity rule, and the exact diff needed in `engine/__tests__/content.test.ts` to widen the DC-1 content gate.

The single most important finding, verified by reading `@vueuse/core`'s compiled source directly: **`useSpeechSynthesis`'s `speak()` already calls `synth.cancel()` internally before `synth.speak()`** — the cancel-then-speak pairing VOZ-04/D-45 requires is not something this phase needs to hand-roll, it comes for free from the library, *provided* the call is guarded behind `isSupported.value` (an unsupported browser has `synth === undefined`, and `speak()` will throw `TypeError` if called without that guard — a real landmine for VOZ-06). Equally, **`useWakeLock()` already re-requests automatically when the tab returns to the foreground** (verified via its internal `useDocumentVisibility` + sentinel `release`-event tracking) and **automatically releases the lock when the calling component unmounts** (via `tryOnScopeDispose`) — meaning navigating from the runner page back to the game selector releases the wake lock for free, with no code needed, while discarding progress *without* leaving the page (same component instance, same page) does need an explicit `.release()` call. Finally, because Vue `computed` refs are lazily-but-synchronously re-evaluated on `.value` access (never deferred to a microtask the way DOM updates or watchers are), calling `next()` and then reading `currentText.value.speech` in the very next line of the same click handler is safe and picks up the *new* step's line immediately — there is no reactivity-timing hazard for D-42's "synchronous inside the gesture handler" rule, as long as `speak()` is called directly in that same function body and never behind a `watch`.

**Primary recommendation:** build one new Vue composable, `useVoiceAnnouncer.ts` (not engine — plain functions/refs, no `~~/engine/*` import), that wraps `useSpeechSynthesis` and exposes `voiceState`, `toggle()`, and `announce()`; wire `announce()` as a plain synchronous call immediately after `next()`/`prev()`/`jumpTo()`/`onResumeContinue()`/`onContentChangedAcknowledge()` in `app/pages/[game]/index.vue`; call `useWakeLock()` directly in that same page's `<script setup>` and request/release it at the four points D-51 specifies; widen the existing DC-1 test in `engine/__tests__/content.test.ts` from `rondaSteps()` to all `kind:'step'` nodes plus a new D-41 variant-completeness assertion; and add a `vitest.config.ts` project for `app/**/*.test.ts` (environment `node`, no DOM needed) so the new pure helper functions (Spanish-voice detection, preference default/parse) get real Vitest coverage — this project does not exist yet and is a genuine Wave 0 gap.

## User Constraints (from CONTEXT.md)

### Locked Decisions

Numeración continuada desde `02-CONTEXT.md` (D-01…D-37).

**Contenido locutado**
- **D-38:** Se autoran a mano las 23 frases `speech` de la preparación y el gate de CI se endurece a exigir `speech` no vacío (≤120 caracteres, sin `⚠ × ›`) en TODO paso `kind:'step'`, no solo en los de la ronda. Descartado el fallback automático a `text`.
- **D-39:** La voz locuta solo la acción; el aviso `⚠` no se locuta.
- **D-40:** Solo hablan los pasos `kind:'step'`. Selector, mini-setup, reanudación y «Mesa lista» (`kind:'summary'`) quedan mudos. El gate de contenido no debe exigir `speech` en `kind:'summary'` (mismo trato que `citation`).
- **D-41:** Cada variante que declare `text` está obligada a declarar también `speech`, y el gate de CI lo exige (`engine/resolve.ts:15` hace `variant?.speech ?? node.step.speech`; sin gate, una variante sin `speech` propio locutaría lo contrario de lo que muestra en pantalla).

**Cuándo habla y cuándo calla**
- **D-42:** `speak()` se llama de forma síncrona dentro del propio manejador del toque que ya invoca `next()`/`prev()`/`jumpTo()` — nunca desde un `watch` sobre el nodo actual.
- **D-43:** «Continuar» de la reanudación locuta el paso recuperado, y lo mismo el CTA de reconocimiento del aviso de contenido cambiado. No se locuta al entrar al primer paso desde el mini-setup ni desde «Empezar a jugar» de Mesa lista.
- **D-44:** No hay botón de repetir locución.
- **D-45:** Una locución en curso se corta al silenciar (corte inmediato) y al ocultarse o bloquearse la tablet. No se corta al abrir el índice de salto ni el modal de detalle.

**Control de silencio**
- **D-46:** La preferencia de voz vive en su propia clave de almacenamiento, independiente de la partida, dentro de `usePersistedSession.ts` (único sitio de la app que toca `localStorage`). Debe sobrevivir a «Empezar partida nueva», al descarte de progreso y al cambio de juego.
- **D-47:** Por defecto, sin preferencia guardada, la voz está activada.
- **D-48:** El control es un icono en la cabecera, junto al `≡`, en el hueco reservado en `app/components/AppHeader.vue`. Mismo patrón táctil que `≡` (48×48). La banda inferior no se toca.
- **D-49:** El control aparece solo en las pantallas de paso.

**Sin voz disponible, y batería**
- **D-50:** Si no hay voz en español, la app muestra una sola vez un aviso breve y descartable, y no vuelve a mostrarse.
- **D-51:** El bloqueo de pantalla se pide solo con partida en curso —dentro del toque que arranca o reanuda— y se vuelve a pedir cada vez que la tablet regresa a primer plano. Se libera al salir al selector o al descartar la partida. Descartado un control manual.
- **D-52:** UI-07 se cumple con una línea fija y discreta en el mini-setup, bajo el botón de empezar. No obliga a persistir ningún «ya lo vio».
- **D-53:** La fase se da por buena con lógica pura testeada en Vitest + una prueba humana bloqueante en la tablet real, como tarea explícita del plan. No se añade Playwright en esta fase.

### Claude's Discretion (this research's job)

- Redacción concreta de las 23 frases `speech` de preparación + las 4 de variantes (registro fijado: imperativo, plural, breve; pasa por revisión humana de D-53).
- Iconografía concreta del control de voz — **already closed by `03-UI-SPEC.md`**, do not re-open (two hand-drawn SVGs, three states on/muted/unavailable — see UI-SPEC §Layout 1).
- Dónde vive el composable de voz y cómo se cablea sin romper `engine/` purity — **resolved below**.
- Cómo se detecta «no hay voz en español» (`getVoices()`/`voiceschanged` timing, Android generic-entry fallback) — **resolved below**. Whether the D-50 notice covers `isSupported === false` too, and whether dismissal persists across sessions — **already closed by `03-UI-SPEC.md`** (covers both causes in one message; session-only, never persisted).
- Mecanismo concreto de «al ocultarse la tablet» y su relación con el re-pedido del wake lock — **resolved below**: one shared browser primitive (`document.visibilitychange`), consumed through two separate reactive seams (`useDocumentVisibility()` for speech-cancel, `useWakeLock`'s own internal handling for re-request).
- Cobertura exacta de tests más allá de VOZ-01…06/UI-06/07/08 — **resolved below**.

### Deferred Ideas (OUT OF SCOPE)

- Botón/gesto de repetir locución (D-44).
- Locutar también el aviso `⚠` (D-39).
- Locutar «Mesa lista» y su lista de repaso (D-40).
- Selector de voz, velocidad o volumen — `getVoices()` too unreliable across Safari/Android (STACK.md).
- Playwright para humo de PWA/voz — Fase 4.
- Control manual del bloqueo de pantalla (D-51).
- Aviso de que el paquete de voz debe descargarse con conexión antes de jugar sin wifi — Fase 4 (offline).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOZ-01 | Al llegar a un paso, la app locuta una frase corta y curada, distinta del texto mostrado | Content retrofit section (23+4 speech lines, exact node ids); `resolveText()` already resolves `speech` per variant (no engine change needed) |
| VOZ-02 | El usuario puede silenciar/reactivar la voz desde un control siempre visible | `useVoiceAnnouncer.toggle()` wired to `AppHeader`'s new `voice-toggle` emit (UI-SPEC §Layout 1 already specifies markup/states) |
| VOZ-03 | La preferencia de silencio se conserva entre pasos y sesiones | `usePersistedSession.ts` extension, new key `tga:voice-enabled`, default `true` |
| VOZ-04 | Al navegar, cualquier locución en curso se corta antes de la nueva; nunca se encolan ni repiten | `useSpeechSynthesis().speak()` already does `cancel()`-then-`speak()` internally (verified in source) |
| VOZ-05 | Si no hay voz en español, la app lo indica y sigue siendo utilizable | Detection algorithm (bounded `voiceschanged` wait + `lang.startsWith('es')` check) below; UI already specified in `03-UI-SPEC.md` |
| VOZ-06 | Si la síntesis no está disponible o falla, el flujo sigue sin degradarse | `isSupported` guard before any `speak()`/`cancel()` call; try/catch around the call site (STACK.md's iOS flakiness note) |
| UI-06 | La pantalla no se apaga con partida en curso | `useWakeLock()` requested at the two D-51 entry points |
| UI-07 | El usuario sabe que la pantalla permanecerá encendida y que consume batería | Static caption in `MiniSetupScreen.vue` footer — **already fully specified in `03-UI-SPEC.md` §Layout 3**, copy included |
| UI-08 | Si el bloqueo de pantalla no está disponible, la app sigue funcionando con normalidad | `useWakeLock().isSupported` feature-detected; no dedicated failure UI (UI-SPEC's explicit asymmetry decision) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Speech content authoring (`speech` field, 27 new strings) | Content/Data (`content/marvel-champions.json`) | Engine (schema/gate) | Data-driven per TECH-04; engine only validates shape, never generates or hand-picks the string |
| Speech text resolution (variant vs. base) | Engine (`engine/resolve.ts`) | — | Already implemented (`resolveText`); zero engine change needed this phase |
| Content gate widening (DC-1 → all `kind:'step'`, D-41 variant rule) | Engine (`engine/__tests__/content.test.ts`, `engine/schema.ts` unchanged) | — | Same pattern as the existing `citation` gate: schema field stays optional, Vitest test enforces the practical requirement |
| Speech playback (`speak`/`cancel`, voice detection, mute state) | Browser/Client (new `app/composables/useVoiceAnnouncer.ts`) | — | Touches `window.speechSynthesis` directly; must never import `~~/engine/*` (D-42's own discretion note: "voice is not engine") |
| Wake lock request/release | Browser/Client (`app/pages/[game]/index.vue`, via `useWakeLock()`) | — | Tied 1:1 to page lifecycle and specific user-gesture entry points (D-51); no shared state with the engine |
| Voice preference persistence | Browser/Client (`usePersistedSession.ts`, extended) | — | D-46 explicitly keeps this the only localStorage seam; new key, same file, no new seam |
| Voice-unavailable notice / mute icon / battery caption (UI) | Browser/Client (Vue components: `AppHeader.vue`, new `VoiceUnavailableNotice.vue`, `MiniSetupScreen.vue`) | — | Presentational, dumb components per established pattern; visual contract fully fixed by `03-UI-SPEC.md` |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `@vueuse/core` | **14.4.0** [VERIFIED: installed, `node_modules/@vueuse/core/package.json`] | `useSpeechSynthesis`, `useWakeLock`, `useDocumentVisibility`, `useLocalStorage` | Already a `dependencies` entry (`^14.4.0` in `package.json`); zero new install. All four composables used by this phase are exported by the installed build (confirmed via `node_modules/@vueuse/core/dist/index.d.ts` export list) |
| `zod` | **4.4.3** [VERIFIED: installed, `node_modules/zod/package.json`] | No schema change required this phase — `TextBlockSchema.speech` is already `z.string().max(120).optional()` and stays that way; enforcement of "required in practice" happens in the Vitest content gate, mirroring the existing `citation` pattern | Confirms D-41's own note in `engine/types.ts:34` that `speech` stays optional in the type |
| Vitest | **4.1.11** [VERIFIED: installed, `package.json`] | New pure-function test coverage for voice-preference parsing and Spanish-voice detection | Existing `test` script (`vitest run`) unchanged; only `vitest.config.ts`'s `projects` array needs a new entry (see Validation section) |

**No new dependency is installed or recommended in this phase.** Every composable this phase needs (`useSpeechSynthesis`, `useWakeLock`, `useDocumentVisibility`) is already exported by the `@vueuse/core@14.4.0` build present in `node_modules`.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vueuse/core` `useSpeechSynthesis` | 14.4.0 | Reactive wrapper around `window.speechSynthesis`, with `isSupported`/`isPlaying`/`error` | Instantiate once, at composable setup time, with a reactive `text` getter — not called per-line with a string argument (see Code Examples) |
| `@vueuse/core` `useWakeLock` | 14.4.0 | Reactive Screen Wake Lock wrapper | Called directly in the runner page's `<script setup>`; no dedicated composable file needed — no reusable pure logic to extract |
| `@vueuse/core` `useDocumentVisibility` | 14.4.0 | Reactive `document.visibilityState` | The single shared visibility primitive for D-45's speech-cancel-on-hide; `useWakeLock` already consumes its own internal instance for re-request, so no manual listener is written anywhere in app code |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vueuse/core`'s `useSpeechSynthesis`/`useWakeLock` | Raw `window.speechSynthesis`/`navigator.wakeLock` hand-rolled | STACK.md already flags this as "legitimate simplification" if avoiding the dependency were a hard requirement — it is not here, the dependency is already installed and its `isSupported`/`isActive`/scope-dispose behavior (verified below) would have to be reimplemented by hand for no benefit |
| A dedicated Node vitest project for `app/**/*.test.ts` | Testing only inside `engine/` and leaving `app/composables/*` untested (today's status quo) | The codebase's own precedent (`usePersistedSession.ts`'s `isPersistedPosition()` is never unit-tested; only `engine/persistence.ts`'s pure functions are) shows this is an accepted gap for thin storage-touching code — but D-53 explicitly wants the preference-persistence *logic* covered, which requires either extracting it as a pure function under a new test project, or accepting it's covered only by the human tablet test. This research recommends the former (cheap, no new infra risk) |

**Installation:** none — no `npm install` needed for this phase.

**Version verification:**
```bash
$ cat node_modules/@vueuse/core/package.json | grep version
  "version": "14.4.0",
$ node -e "console.log(require('zod/package.json').version)"
4.4.3
```
Both match `package.json`'s `^14.4.0`/`^4.4.3` ranges exactly — no drift to account for.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** All libraries used (`@vueuse/core`, `zod`, `vitest`) are already `dependencies`/`devDependencies` in `package.json` and were installed in Phase 1. No `npm install`, no registry lookup, no slopcheck run was needed or performed. If the planner or executor discovers a need for any new package during this phase, that is itself a signal to stop and re-run this research — it was not anticipated here.

## Architecture Patterns

### System Architecture Diagram

```
User tap (Siguiente / Atrás / index jump / resume-continue / content-changed-ack)
        │
        ▼
app/pages/[game]/index.vue  ── click handler (synchronous, single function body) ──┐
        │                                                                          │
        ├─► useGameSession().next()/prev()/jumpTo()  ─► engine/navigator.ts (pure) │
        │        reassigns session.value ─► currentNode/currentText computeds     │
        │        recompute SYNCHRONOUSLY on next .value access (no microtask)     │
        │                                                                          │
        └─► useVoiceAnnouncer().announce()  ◄── reads currentNode.value.step.kind │
                 │                              and currentText.value.speech ─────┘
                 │  (both already resolved via useGameSession — never re-reads JSON)
                 ▼
        if kind !== 'step' → no-op (D-40)
        if voiceState !== 'on' → no-op (muted/unavailable)
        else → useSpeechSynthesis(text).speak()
                 │
                 ▼
        internally: synth.cancel(); synth.speak(new SpeechSynthesisUtterance(text))
                 (cancel-then-speak already built into @vueuse/core — VOZ-04 for free)

Separately, on mount of the runner page:
useWakeLock() instantiated ─► request('screen') called inside onConfirm()/onResumeContinue()
        │
        ├─ tab hidden → OS revokes lock → sentinel fires 'release' → requestedType set
        ├─ tab visible again → useWakeLock's internal whenever() → forceRequest() automatically
        └─ page component unmounts (navigateTo('/')) → tryOnScopeDispose → release() automatically

useDocumentVisibility() watched separately, inside useVoiceAnnouncer:
document hidden → watch fires → useSpeechSynthesis().stop() (cancels any in-flight utterance, D-45)
```

### Recommended Project Structure

```
app/
├── composables/
│   ├── useVoiceAnnouncer.ts       # NEW — voice state, toggle, announce(), detection
│   ├── usePersistedSession.ts     # EXTENDED — new tga:voice-enabled key (D-46)
│   ├── useGameSession.ts          # UNCHANGED — already exposes currentNode/currentText
│   └── __tests__/
│       └── useVoiceAnnouncer.test.ts  # NEW — pure-function tests (detection, transitions)
├── components/
│   ├── AppHeader.vue              # EXTENDED — voiceState prop, voice-toggle emit
│   ├── VoiceUnavailableNotice.vue # NEW — dumb component, no props, dismiss emit
│   └── MiniSetupScreen.vue        # EXTENDED — static battery caption row
├── pages/[game]/
│   └── index.vue                  # EXTENDED — announce() + useWakeLock() wiring at all D-42/D-43/D-51 call sites
content/
└── marvel-champions.json          # EXTENDED — 23 base + 4 variant speech strings
engine/
├── schema.ts                      # UNCHANGED (speech stays optional, same as citation)
└── __tests__/
    └── content.test.ts            # EXTENDED — DC-1 widened, new D-41 variant-completeness test
vitest.config.ts                   # EXTENDED — new 'app-logic' project, environment 'node'
```

### Pattern 1: One reactive `text` source feeding `useSpeechSynthesis`, never a per-call string argument

**What:** `useSpeechSynthesis(text: MaybeRefOrGetter<string>, options?)` binds its internal utterance to a reactive getter at setup time — `speak()` itself takes no arguments and re-reads whatever `text` currently resolves to.
**When to use:** Always, for this phase's one narrator instance. Do not call `useSpeechSynthesis()` fresh on every step (that would re-run its setup-time `isSupported` check and rebind listeners for no reason).
**Example:**
```typescript
// Source: node_modules/@vueuse/core/dist/index.js:6530 (installed 14.4.0, read directly)
// app/composables/useVoiceAnnouncer.ts
export function useVoiceAnnouncer(
  currentNode: ComputedRef<RuntimeStepNode | null>,
  currentText: ComputedRef<TextBlock>,
) {
  const spokenLine = computed(() => currentText.value.speech ?? '')
  const { speak, stop, isSupported } = useSpeechSynthesis(spokenLine, { lang: 'es-ES' })

  function announce() {
    if (!currentNode.value || currentNode.value.step.kind !== 'step') return // D-40
    if (voiceState.value !== 'on') return // muted or unavailable
    if (!spokenLine.value) return // defensive — WR-01-style guard against unvalidated raw JSON
    if (!isSupported.value) return // VOZ-06: never throw if synthesis is absent
    try {
      speak() // internally: synth.cancel(); synth.speak(new SpeechSynthesisUtterance(...))
    }
    catch {
      // STACK.md: cancel-then-speak pairing can be flaky right after the previous
      // utterance ends, specifically on iOS — never let this break next()/prev().
    }
  }
  // ...voiceState/toggle/detection below
  return { announce, voiceState, toggle, isSupported }
}
```
**Why this resolves the "ordering hazard":** `spokenLine` is a `computed` that reads `currentText.value.speech`, which is itself a `computed` inside `useGameSession` reading `session.value`. Vue computed refs are lazy-pull, not push-scheduled — reassigning `session.value` inside `next()` immediately invalidates the computed's cache, and the very next synchronous read of `.value` (whether by `spokenLine`'s own computed getter or by `useSpeechSynthesis`'s internal `utterance` computed) recomputes on the spot, in the same call stack, same tick, same user gesture. No `nextTick()`, no `watch`, no async gap — `next(); announce()` in the same function body is safe on iOS Safari.

### Pattern 2: Wake lock lifecycle tied to page lifecycle, not to game session lifecycle

**What:** `useWakeLock()` calls `tryOnScopeDispose(() => release())` internally — the lock is released for free when the component that instantiated the composable unmounts.
**When to use:** Instantiate `useWakeLock()` once, at the top level of `app/pages/[game]/index.vue`'s `<script setup>` (the runner page). Do **not** instantiate it inside a child component that might mount/unmount more often than the whole game session.
**Example:**
```typescript
// Source: node_modules/@vueuse/core/dist/index.js:8079-8122 (installed 14.4.0, read directly)
const { request, release, isActive, isSupported } = useWakeLock()

function onConfirm() {
  if (playerCount.value === null || difficulty.value === null) return
  start(gameId, { playerCount: playerCount.value, difficulty: difficulty.value })
  request('screen') // D-51: only requested with a game actually starting, inside the tap
}

function onResumeContinue() {
  awaitingResumeChoice.value = false
  request('screen') // D-51: re-requested on resume, also inside a tap
  announce()
}

function onDiscardConfirm() {
  clear(gameId)
  session.value = null
  release() // D-51: explicit release — same page component, no unmount, so scope-dispose won't fire
  awaitingResumeChoice.value = false
  awaitingDiscardConfirm.value = false
}

// "Volver al selector" (MiniSetupScreen's @back="navigateTo('/')") needs NO explicit
// release() call: navigateTo unmounts this page, which fires tryOnScopeDispose
// automatically. Verified in source — do not add a redundant release() there.
```
**Anti-pattern this avoids:** manually tracking "is a game in progress" to decide when to release — `useWakeLock`'s own scope-dispose already encodes exactly that lifecycle for the "leave the page" case; only the same-page "discard in place" case needs an explicit call, because the page component itself never unmounts for that transition.

### Anti-Patterns to Avoid

- **Calling `speak()` inside a `watch(currentNode, ...)`:** explicitly forbidden by D-42. iOS Safari silently drops synthesis calls made outside the direct call stack of a user gesture; a `watch` callback runs in a microtask/scheduler flush, outside that stack.
- **Calling `useSpeechSynthesis()` more than once, or re-creating it per step:** wastes the one-time `isSupported`/listener setup and can produce multiple independent `utterance` computeds fighting over the single global `window.speechSynthesis` queue.
- **Calling `speak()`/`cancel()` without checking `isSupported.value` first:** `useSpeechSynthesis`'s internal `speak()` does `synth.cancel()` unconditionally; if `synth` is `undefined` (API absent), this throws a `TypeError` that VOZ-06 requires the app to never surface as broken behavior.
- **Adding a second raw `visibilitychange` listener for the wake lock:** `useWakeLock` already has its own internal one; adding another anywhere in app code duplicates work D-45's own instruction ("conviene que no se implementen dos veces") explicitly warns against.
- **Re-reading `content/marvel-champions.json` directly from the voice composable to fetch `speech`:** violates the explicit CONTEXT.md rule that speech must arrive via `useGameSession`'s `currentText` computed, which already applies `resolveText()`'s variant-resolution logic (`engine/resolve.ts:15`) — reading the JSON separately would silently skip variant resolution.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Cancel-then-speak sequencing (VOZ-04) | A manual `speechSynthesis.cancel()` call before every `speak()` | `useSpeechSynthesis().speak()` (already does this internally — verified in source) | Duplicating it is harmless but redundant; the real risk is *forgetting* the `isSupported` guard around the call, not the cancel-pairing itself |
| Wake-lock re-request on tab-return (D-51) | A `visibilitychange` listener that calls `wakeLock.request()` again | `useWakeLock()`'s built-in `whenever(documentVisibility === 'visible' && requestedType, forceRequest)` | Already implemented, already tracks "was released while hidden" via the sentinel's own `release` event — a hand-rolled version would have to reimplement that exact state machine |
| Wake-lock release on page leave | An `onBeforeUnmount`/`onUnmounted` hook calling `.release()` | `useWakeLock()`'s own `tryOnScopeDispose(() => release())` | Free, automatic, already correct for the "navigate to selector" case — only the same-page "discard" transition needs a manual call |
| Detecting whether the device has a Spanish voice | A hand-rolled polling loop with `setInterval` | `speechSynthesis.onvoiceschanged` + a single bounded `setTimeout` fallback (Pattern below) | The bounded-timeout-plus-event-listener race is the documented workaround across every source consulted (MDN, weboutloud.io, multiple 2025 dev write-ups) — a naive poll wastes cycles and still needs the same bound |

**Key insight:** everything genuinely hard about this phase (cross-browser TTS quirks, wake-lock lifecycle) has already been solved inside `@vueuse/core@14.4.0`, which is already installed. The actual new work this phase requires is (1) authoring 27 short Spanish sentences, (2) widening one existing content gate, and (3) wiring four call sites in one page component — not building any new low-level browser API abstraction.

## Common Pitfalls

### Pitfall 1: `useSpeechSynthesis`'s `speak()` throws if the API is entirely absent

**What goes wrong:** `const synth = window && window.speechSynthesis` is `undefined` on a browser without Web Speech support; `speak()`'s first line, `synth.cancel()`, throws `TypeError: Cannot read properties of undefined (reading 'cancel')`.
**Why it happens:** `useSpeechSynthesis` does not guard its own `speak()`/`stop()` internally against `isSupported === false` — that check is left to the caller (confirmed by reading `node_modules/@vueuse/core/dist/index.js:6578-6585`).
**How to avoid:** Always check `isSupported.value` before calling `speak()`/`stop()`, and wrap the call in try/catch as an additional defensive layer (STACK.md's own note about iOS flakiness right after a previous utterance ends).
**Warning signs:** An uncaught exception surfacing in the browser console right after tapping "Siguiente" on a device/browser without TTS support — this would not roll back the navigation (since `next()` already committed before `announce()` runs), but it is exactly the kind of silent breakage VOZ-06 exists to prevent from *looking* broken to the user, and untrapped exceptions can pollute Vue's error-handling state.

### Pitfall 2: `getVoices()` empty array on first call, and `voiceschanged` may never fire

**What goes wrong:** Calling `speechSynthesis.getVoices()` immediately after page load frequently returns `[]` even on devices that do have voices installed, because voice lists load asynchronously. On some Safari versions the `voiceschanged` event that's supposed to signal "voices are ready now" is documented (multiple sources, 2025-era write-ups, cross-referenced with STACK.md's own MEDIUM-confidence flag) to not fire reliably at all.
**Why it happens:** Platform-level voice-engine initialization is asynchronous and its completion signal is inconsistently implemented across engines.
**How to avoid:** Race a `voiceschanged` listener against a bounded `setTimeout` (see Code Examples below) — whichever resolves first decides the detection outcome. Never wait indefinitely.
**Warning signs:** The voice-unavailable notice (D-50) appearing on a device that in fact has a working Spanish voice, simply because detection ran before the OS finished loading its voice list — an acceptable, bounded false positive per `03-UI-SPEC.md`'s own tolerance (the notice is dismissible and session-scoped, not a hard failure state).

### Pitfall 3: Android Chrome returns a voice for `es-ES` even without the voice pack downloaded, but it silently sounds wrong

**What goes wrong:** `getVoices()` on Android Chrome can return a generic language/region entry that matches `lang.startsWith('es')` in code, yet the actual on-device voice data was never downloaded, so speech synthesis falls back to a different (often English-sounding) voice or a low-quality default with no error thrown.
**Why it happens:** Android's TTS voice-pack download is a separate OS-level action (Settings → Languages → Text-to-Speech) from the browser reporting the voice as "available" in its voice list.
**How to avoid:** Nothing to fix in code (STACK.md is explicit about this) — this is exactly the case the D-50 notice's copy already addresses ("revisad Ajustes → Idiomas → Texto a voz"). Detection based on `lang.startsWith('es')` in `getVoices()` cannot distinguish "voice pack present" from "voice pack missing but entry listed" — do not attempt to build a more precise detector than this; it would be guessing.
**Warning signs:** User reports "the app spoke in English" despite the mute icon showing `on` (voice technically works, just not in Spanish) — this is the scenario the notice's generic wording is deliberately designed to cover without overclaiming a root cause.

### Pitfall 4: Content gate widening must not accidentally require `speech` on `kind:'summary'` or on variant objects that don't declare `text`

**What goes wrong:** A naive widening of `rondaSteps()` → `allSteps()` in the DC-1 test, without also filtering `(s.kind ?? 'step') === 'step'`, would break the existing, intentional exemption for `setup.mesa-lista.01` (the one `kind:'summary'` node in the file) — mirroring exactly the mistake CONT-08's `citation` gate already avoided (see `content.test.ts:73-87` for the precedent pattern to copy).
**Why it happens:** The two setup steps with `variants.difficulty` (`setup.encuentros.03`, `setup.escenario.04`) each declare `text` in **both** their `normal` and `expert` variant objects but **neither** variant currently declares `speech` — a test that only checks the *base* step's `speech` (not each variant's) would pass today even though D-41 explicitly targets exactly this gap.
**How to avoid:** Write two separate assertions: (1) every `kind:'step'` node (both `setup` and `ronda` sections) has non-empty `speech` ≤120 chars with no `⚠×›`; (2) for every step with `variants?.difficulty`, for each variant object (`normal`/`expert`) that declares its own `text`, that same variant object must also declare its own `speech`. Reuse the existing `allSteps()` helper (`content.test.ts:16`) — do not write a new tree-walk.
**Warning signs:** `npm test` passing green while `setup.encuentros.03`'s `expert` variant silently speaks the base step's (wrong, contradictory) `speech` line at the table — the exact bug D-41 exists to prevent.

## Code Examples

### Detecting "no Spanish voice available" (bounded, never blocks first paint)

```typescript
// Source: pattern synthesized from MDN's SpeechSynthesis.voiceschanged_event docs +
// multiple 2025 community write-ups on the Safari/voiceschanged race (WebSearch,
// cross-referenced — MEDIUM confidence, not verified on a real target tablet)
function hasSpanishVoice(voices: SpeechSynthesisVoice[]): boolean {
  return voices.some(v => v.lang.toLowerCase().startsWith('es'))
}

function detectVoiceAvailability(onResult: (available: boolean) => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onResult(false) // isSupported === false case — same notice, per 03-UI-SPEC.md
    return
  }
  const synth = window.speechSynthesis
  let settled = false
  const finish = (voices: SpeechSynthesisVoice[]) => {
    if (settled) return
    settled = true
    onResult(hasSpanishVoice(voices))
  }
  const immediate = synth.getVoices()
  if (immediate.length > 0) {
    finish(immediate) // Chrome desktop/Android often has this populated already
    return
  }
  synth.addEventListener('voiceschanged', () => finish(synth.getVoices()), { once: true })
  setTimeout(() => finish(synth.getVoices()), 2000) // bounded fallback — Safari may never fire the event
}
```

### Widened content gate (D-38/D-41), extending the existing DC-1 test

```typescript
// Source: engine/__tests__/content.test.ts — pattern to replace the current
// rondaSteps()-scoped DC-1 test (line 362) with, reusing allSteps() (line 16)
it('DC-1 (D-38): todo paso kind:step declara speech no vacío de <=120 caracteres, sin ⚠, × ni ›', () => {
  const steps = allSteps(marvelChampions).filter(s => (s.kind ?? 'step') === 'step')
  expect(steps.length).toBe(33) // 23 setup + 10 ronda
  for (const step of steps) {
    expect(step.speech).toBeDefined()
    expect(step.speech!.length).toBeGreaterThan(0)
    expect(step.speech!.length).toBeLessThanOrEqual(120)
    expect(step.speech).not.toMatch(/[⚠×›]/)
  }
})

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

### `AppHeader.vue` voice-toggle wiring (props/emit already fully specified in `03-UI-SPEC.md`)

```vue
<!-- New prop/emit only — existing sectionLabel/position/sessionContext/index-open untouched -->
<script setup lang="ts">
defineProps<{
  sectionLabel: string
  position: { current: number, total: number } | null
  sessionContext: string
  voiceState: 'on' | 'muted' | 'unavailable' // NEW
}>()
const emit = defineEmits<{
  'index-open': []
  'voice-toggle': [] // NEW
}>()
</script>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `speech` field authored only for the round loop (Phase 2, DC-1) | `speech` required on every `kind:'step'` node, both sections | This phase (D-38) | Content gate widens from 10 to 33 required lines; 4 additional variant-level lines |
| No voice UI surface in `AppHeader` | Third icon-state control (`on`/`muted`/`unavailable`) in the reserved header slot | This phase (D-48, `03-UI-SPEC.md`) | `AppHeader` gains its first new prop/emit since Phase 1 |

**Deprecated/outdated:** nothing in this phase deprecates prior work — Phase 1/2's engine, persistence, and UI patterns are extended, not replaced.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `getVoices()`/`voiceschanged` timing behavior described in Pitfall 2/Code Examples reflects current (2026) Safari/Chrome behavior, not just historical (2022-2025) write-ups | Common Pitfalls §2, Code Examples | If Safari's behavior has since improved, the bounded-timeout fallback is still harmless (just unnecessary) — low risk either way, confirmed safe to ship regardless |
| A2 | Wake Lock API request initiated inside an `async` function body still counts as "within the user gesture" on iOS Safari, even though `request()` returns a Promise | Pattern 2 / D-51 | If WebKit is stricter than assumed, the wake lock could silently fail to activate on iPad specifically — this is exactly what D-53's blocking human tablet test exists to catch; no code mitigation is proposed beyond calling `request()` synchronously as the first statement in the tap handler |
| A3 | Android TTS voice-pack absence produces a *listed-but-non-Spanish-sounding* voice rather than an outright missing `es-*` entry in `getVoices()` (STACK.md's own MEDIUM-confidence claim, not independently re-verified this session) | Common Pitfalls §3 | If wrong (i.e., Android actually omits the `es-*` entry entirely when the pack is missing), detection would correctly flag it as unavailable anyway — the risk is only in the *notice's wording* implying a cause that may not always be accurate, which `03-UI-SPEC.md` already mitigates by using deliberately generic copy |

## Open Questions

1. **Exact target tablet model/OS is still unknown** (carried over from `STATE.md`'s own blocker, unresolved by this research or by any prior phase).
   - What we know: iOS Safari 16.4+ supports Wake Lock (caniuse, HIGH confidence per STACK.md); Web Speech API's user-gesture requirement on iOS Safari is well-documented in general but not verified against a specific current build.
   - What's unclear: whether the actual tablet at the table has a Spanish TTS voice pack installed, and whether its browser/OS combination exhibits any of the flakier documented behaviors (voiceschanged never firing, wake lock partial breakage).
   - Recommendation: this is precisely what D-53's blocking human tablet test is for — do not attempt to resolve it further in planning; build all detection/fallback code defensively (as this research specifies) and verify for real once the plan reaches that task.

## Environment Availability

No new external tooling, CLI, runtime, or service is required by this phase — everything needed (`@vueuse/core`, `zod`, `vitest`) is already installed and version-verified above. The one genuine "environment" gap is not a dev-machine dependency but the target device itself:

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Real iPad/Android tablet for D-53's blocking human test | VOZ-01…06, UI-06/07/08 final sign-off | ✗ (not present in this environment) | — | None — this is a hard requirement of D-53, not something the plan can substitute with emulation (Phase 1's own D-19 precedent already flagged emulation as insufficient for physical-device-specific behavior) |
| `@vueuse/core` `useSpeechSynthesis`/`useWakeLock`/`useDocumentVisibility` | VOZ-01…06, UI-06/07/08 | ✓ | 14.4.0 | — |

**Missing dependencies with no fallback:** the real tablet for the D-53 human test — already an explicit, planned task per CONTEXT.md, not a gap this research needs to flag as new.

## Security Domain

This phase touches no authentication, session boundary, network call, or user-supplied input beyond taps on fixed UI controls — the app remains fully client-side, backend-less, single-tablet, single-group (per `PROJECT.md`'s Out of Scope table). No new ASVS-relevant surface is introduced.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | No auth in this app (Out of Scope, `PROJECT.md`) |
| V3 Session Management | No | No server session; `localStorage` only, already governed by existing `usePersistedSession.ts` conventions |
| V4 Access Control | No | Single local user, no roles |
| V5 Input Validation | Partial (existing, unchanged) | `engine/schema.ts`'s Zod validation of content JSON at CI time already covers the only "input" this phase adds (27 new `speech` strings) — no new validation surface, same gate mechanism widened |
| V6 Cryptography | No | Nothing encrypted or transmitted |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Malformed/oversized `speech` string reaching the browser (e.g., a 500-character line that reads for a full minute, echoing Dized's documented failure mode) | Denial of Service (of UX, not infrastructure) | The widened content gate (D-38, ≤120 chars) — already the mitigation this phase itself implements |
| `SpeechSynthesisUtterance(text)` constructed from content-authored strings, never user input | Tampering (N/A — no user-controlled string ever reaches the utterance constructor) | No mitigation needed; `speech` is always static, build-time content, never runtime user text |

## Sources

### Primary (HIGH confidence — verified directly against installed code in this session)
- `node_modules/@vueuse/core/dist/index.js` (installed v14.4.0) — read directly: `useSpeechSynthesis` (lines ~6530-6600, confirms internal `cancel()`-then-`speak()`), `useWakeLock` (lines ~8079-8122, confirms `tryOnScopeDispose` auto-release and internal visibility-based re-request), `useDocumentVisibility` (lines ~2774-2782), `useSupported` (lines ~327-333, confirms SSR-safety via `useMounted`)
- `node_modules/@vueuse/core/dist/index.d.ts` (installed v14.4.0) — type signatures for `UseSpeechSynthesisReturn`, `UseWakeLockReturn`, confirming `speak()` takes no arguments and `text` is bound at setup time
- This repo's own codebase, read directly: `app/pages/[game]/index.vue`, `app/composables/useGameSession.ts`, `app/composables/usePersistedSession.ts`, `app/components/AppHeader.vue`, `app/components/MiniSetupScreen.vue`, `engine/resolve.ts`, `engine/schema.ts`, `engine/types.ts`, `engine/__tests__/content.test.ts`, `content/marvel-champions.json`, `vitest.config.ts`, `package.json`

### Secondary (MEDIUM confidence — WebSearch cross-referenced with STACK.md)
- MDN `SpeechSynthesis: voiceschanged event` / `SpeechSynthesis: getVoices() method` — general async-loading behavior
- weboutloud.io "The State of Speech Synthesis in Safari" (already cited in STACK.md) — Safari-specific `getVoices()`/`voiceschanged` unreliability
- Multiple 2025 community write-ups (dev.to, Caktus Group, talkrapp.com) on the bounded-timeout-plus-`voiceschanged` race pattern for cross-browser voice detection

### Tertiary (LOW confidence — not independently re-verified this session)
- Apple Developer Forums threads on `AVSpeechSynthesisVoice`/`speechVoices()` returning zero or malformed voices on specific iPadOS betas (2019-2020 era threads found via WebSearch — directionally consistent with STACK.md's caveat but dated; flagged, not relied upon for any specific numeric claim)

## Metadata

**Confidence breakdown:**
- Standard stack / `@vueuse/core` internals: HIGH — verified by reading the actual installed source, not just documentation
- Architecture/wiring (composable placement, reactivity-ordering, wake-lock lifecycle): HIGH — derived from direct source reading plus this repo's own established patterns (`usePersistedSession.ts`, `resolveText()`, the `citation` gate precedent)
- Content retrofit scope (exact node ids/counts): HIGH — computed directly from `content/marvel-champions.json`
- Cross-browser voice detection timing: MEDIUM — WebSearch-sourced, cross-referenced across multiple write-ups, never verified against the actual target tablet (unknown model/OS)
- iOS-specific edge cases (gesture timing for Wake Lock specifically, not Speech): LOW — training knowledge, explicitly flagged as unresolved until D-53's human tablet test

**Research date:** 2026-08-30
**Valid until:** 30 days (stable stack, no fast-moving dependency; re-verify `@vueuse/core` behavior only if the version range in `package.json` changes)
