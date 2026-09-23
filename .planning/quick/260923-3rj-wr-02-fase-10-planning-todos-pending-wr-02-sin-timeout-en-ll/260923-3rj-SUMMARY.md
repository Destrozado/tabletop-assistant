---
quick_id: 260923-3rj
slug: wr-02-sin-timeout-en-llamadas-de-red-de-sync
status: complete
tags: [firestore, sync, timeout, wr-02, fase-10]
dependency-graph:
  requires: []
  provides:
    - "SYNC_NETWORK_TIMEOUT_MS y withTimeout en app/composables/useHistorySync.ts"
  affects:
    - app/composables/useHistorySync.ts
    - app/composables/__tests__/useHistorySync.test.ts
tech-stack:
  added: []
  patterns:
    - "Promise.race + setTimeout síncrono (withTimeout), mismo idioma de tipo que useHistorySavedNotice.ts"
key-files:
  created: []
  modified:
    - app/composables/useHistorySync.ts
    - app/composables/__tests__/useHistorySync.test.ts
    - .planning/todos/completed/wr-02-sin-timeout-en-llamadas-de-red-de-sync.md
decisions:
  - "Un timeout en setDoc corta el bucle (break) en vez de seguir con la siguiente entrada — evita N×15s de flushInFlight bloqueado en el escenario de atraso de D-08"
  - "El listener online se da de baja explícitamente (unsubscribe) si onAuthStateChanged nunca invoca su callback antes de vencer el plazo"
metrics:
  duration: ~35min
  completed: 2026-09-23
actuals:
  tokens: 33000
  tasks: 3
  commits: 3
plan_head_before: "411cb73f66df5aa50a7f4a45c7d21f826a4e1de"
---

# Quick 260923-3rj: WR-02 - timeout en llamadas de red de sync Summary

Cuatro esperas de red de `useHistorySync.ts` (import() del SDK, onAuthStateChanged,
signInAnonymously, setDoc) ganaron un tope de 15s vía `withTimeout` (Promise.race), cerrando el
riesgo de que una promesa colgada dejara `flushInFlight` enclavado para siempre.

## Qué se hizo

- `SYNC_NETWORK_TIMEOUT_MS = 15_000` y una clase de módulo `SyncTimeoutError` (`code:
  'sync-timeout'`) en `app/composables/useHistorySync.ts`.
- `withTimeout<T>(promise, ms)`: arma el `setTimeout` de forma síncrona, `Promise.race` contra
  una promesa que rechaza con `SyncTimeoutError` al vencer, `clearTimeout` en `.finally`.
- Envuelto en las cuatro esperas de red:
  - `Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])`
  - la espera de `onAuthStateChanged` en `ensureAnonymousUser` (con `unsubscribe` copiado a una
    variable exterior y dado de baja en el `catch` si vence el plazo)
  - `signInAnonymously(auth)`
  - `setDoc(...)` del bucle de `syncPending`
- Un timeout en `setDoc` corta la vuelta actual (`break` del bucle, decisión distinta de
  `permission-denied`/`unavailable`, que nunca interrumpen nada): las entradas subidas antes en
  esa misma vuelta siguen marcadas (D-04/WR-01 intacto, una sola escritura de `saveSyncedIds` por
  flush), las no intentadas quedan pendientes para el siguiente disparador (D-02).
- Seis tests nuevos (`describe` `WR-02`) con `vi.useFakeTimers({ toFake: ['setTimeout',
  'clearTimeout'] })`, instalados tras el `import()` dinámico y antes de `flush()`.
- Todo `wr-02-sin-timeout-en-llamadas-de-red-de-sync.md` movido a `.planning/todos/completed/`
  con `git mv`, `status: completed`, `resolved_by: 260923-3rj`, y sección `## Resolución`.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. Las cinco decisiones a criterio del
planner/ejecutor (clase `SyncTimeoutError` no exportada, `break` en vez de continuar tras un
timeout de `setDoc`, etc.) ya venían especificadas en el propio `<action>` de cada tarea.

## Verification

Comandos ejecutados y resultado exacto:

```
$ npx vitest run app/composables/__tests__/useHistorySync.test.ts
Test Files  1 passed (1)
     Tests  25 passed (25)
```

```
$ npx vitest run
Test Files  37 passed (37)
     Tests  1139 passed (1139)
```

```
$ npx tsc --noEmit
(sin salida, exit 0 — vacuo por diseño: tsconfig.json raíz tiene files: [] y solo references)
```

```
$ npm run typecheck
> nuxt typecheck
(sin salida, exit 0)
```

Grep de código (sin comentarios), tal y como exige el `<verify>` de la Task 2:

```
$ grep -v '^[[:space:]]*//' app/composables/useHistorySync.ts | grep -o 'withTimeout(' | wc -l
5   (>= 4 exigido: import(), espera de auth, signInAnonymously, setDoc, + la definición misma)
$ grep -v '^[[:space:]]*//' app/composables/useHistorySync.ts | grep -q 'Promise.race'  → match
$ grep -v '^[[:space:]]*//' app/composables/useHistorySync.ts | grep -q 'instanceof SyncTimeoutError'  → match
$ grep -nE '^import .*firebase' app/composables/useHistorySync.ts  → sin coincidencias (SYNC-05 intacto)
```

Todo cerrado:

```
$ test -f .planning/todos/completed/wr-02-sin-timeout-en-llamadas-de-red-de-sync.md && \
  test ! -e .planning/todos/pending/wr-02-sin-timeout-en-llamadas-de-red-de-sync.md && \
  grep -q '^status: completed' .planning/todos/completed/wr-02-... && \
  grep -q '^resolved_by: 260923-3rj' .planning/todos/completed/wr-02-...
TODO_FIELDS_OK
```

## Must-Haves Verification

- ✅ Un `setDoc` colgado vence el plazo, libera `flushInFlight`, y un `online` posterior dispara
  un flush nuevo que vuelve a llamar a `setDoc` (test WR-02/1).
- ✅ Una escritura vencida NUNCA añade su id a `tga:history:synced` (test WR-02/1, WR-02/5).
- ✅ La espera de `onAuthStateChanged` (con baja del listener), `signInAnonymously` y el
  `import()` del SDK también tienen tope (tests WR-02/2, WR-02/3, WR-02/4).
- ✅ Un `setDoc` que vence corta el recorrido de esa vuelta; las entradas subidas antes siguen
  marcadas; `tga:history:synced` se escribe una sola vez por flush; los rechazos no-timeout
  siguen sin interrumpir el recorrido (test WR-02/5).
- ✅ `flush()` sigue síncrona, `void`, nunca lanza; `record()` y el orden D-U4 no cambian
  (sin tests nuevos de `record()`, comportamiento no tocado — verificado por los 1139 tests en
  verde, incluida la suite existente de `useGameHistory`).
- ✅ Un flush que termina con éxito no deja ningún temporizador armado (test WR-02/6).

## Known Stubs

None.

## Threat Flags

None — el `<threat_model>` del plan ya cubre toda la superficie tocada (T-3rj-01..05, todos con
disposición `mitigate` salvo T-3rj-04, `accept` documentado en el propio plan).

## Self-Check: PASSED

- `app/composables/useHistorySync.ts` — FOUND
- `app/composables/__tests__/useHistorySync.test.ts` — FOUND
- `.planning/todos/completed/wr-02-sin-timeout-en-llamadas-de-red-de-sync.md` — FOUND
- `.planning/todos/pending/wr-02-sin-timeout-en-llamadas-de-red-de-sync.md` — CONFIRMED ABSENT
- Commit `9ba61e1` — FOUND (`git log --oneline --all | grep 9ba61e1`)
- Commit `374b8b1` — FOUND
- Commit `3edb0a3` — FOUND
