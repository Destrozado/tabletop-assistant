---
phase: 09-hist-rico-y-estad-sticas
plan: 26
subsystem: ui
tags: [localstorage, persistence, typescript, vitest, resume, ui, gate]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-24 — npm run typecheck (vue-tsc, strict:true) real, colgado de CI, cubriendo app/** + transitivos"
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-25 — readStoredProgress (autoridad de lectura del progreso), StoredProgress, StoredProgressReport, PLACEHOLDER_CONTEXT"
provides:
  - "resolveNoticeVariant/planGameEnd tipados contra StoredProgress (nunca un boolean): pasar el resultado de una escritura donde va la respuesta de una lectura hace fallar npm run typecheck"
  - "planGameEnd(historyRecorded, stored): única decisión de fin de partida (variante del aviso + preserveProgress) en un solo sitio testeable (cierre de WR-09 de 09-REVIEW.md)"
  - "cuarta variante failure-unknown para stored === 'unknown': tabla TOTAL sobre los tres valores del dispositivo, ninguno se pliega sobre otro"
  - "app/pages/[game]/index.vue cableado: onMounted (ResumePrompt) y onOutcomeRecorded (aviso de fin de partida) obtienen su respuesta de la MISMA llamada a readStoredProgress — la contradicción exacta del BLOCKER de la ronda 5 ya no puede ocurrir"
  - "guarda de reentrada en onOutcomeRecorded/onOutcomeDismiss (WR-01 de 09-REVIEW.md): un segundo toque ya no borra en silencio el progreso que la primera invocación preservó"
  - "app/composables/__tests__/afirmacionesRespaldadas.test.ts (30 tests): gate ejecutable de clase — Gate A (ningún .vue afirma en su <template> sin auditoría), Gate B (NOTICE_BODY solo afirma desde variantes respaldadas, con cobertura total y sin solape de StoredProgress), Gate C (nadie fuera de los tres ficheros que conocen la autoridad nombra el estado del dispositivo)"
affects: ["09-27"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "planGameEnd() como única función que decide a la vez qué se le dice al grupo y qué se conserva en el dispositivo — evita que las dos decisiones se tomen en sitios distintos y puedan divergir"
    - "'no borrar' es siempre el lado seguro: preserveProgress depende SOLO de historyRecorded, nunca de stored — una lectura equivocada nunca puede autorizar un borrado"
    - "import.meta.glob (macro de Vite/Vitest) para recorridos recursivos de ficheros en tests bajo app/**, en vez de node:fs/node:url — ese árbol pasa por npm run typecheck (09-24) y no tiene @types/node instalado; mismo motivo y mismo patrón de sustitución que ya documentó 09-25"
    - "gate de clase ejecutable (barrido automatizado + lista de excepciones auditadas que arranca vacía) en vez de una prosa de auditoría manual, para que una regresión de la misma clase se detecte sin depender de que alguien repita el barrido"

key-files:
  created:
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts
  modified:
    - app/composables/useHistorySavedNotice.ts
    - app/composables/__tests__/useHistorySavedNotice.test.ts
    - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
    - app/pages/[game]/index.vue

key-decisions:
  - "Task 2 (afirmacionesRespaldadas.test.ts): import.meta.glob en vez de node:fs para el recorrido recursivo de .vue/.ts que el plan describía — desviación de la instrucción literal, necesaria porque node:fs/node:url no tienen tipos bajo app/composables/__tests__/ (cubierto por npm run typecheck, sin @types/node instalado); verificado empíricamente que import.meta.glob sí tiene tipos disponibles ahí (los aporta vite/client, referenciado por nuxt/app) y funciona igual bajo Vitest. Mismo patrón de sustitución que 09-25 ya aplicó para el fixture JSON."

requirements-completed: [HIST-06, HIST-09]

# Metrics
duration: ~10min
completed: 2026-09-13
---

# Phase 09 Plan 26: Los dos consumidores hablan por la autoridad — cierre del BLOCKER de la ronda 5 Summary

**`app/pages/[game]/index.vue` deja de componer `expand`/`load`/`resume` a mano: `ResumePrompt` y el aviso de fin de partida obtienen su respuesta de la MISMA llamada a `readStoredProgress`, `planGameEnd` tipado contra `StoredProgress` hace que confundir una escritura con una lectura rompa `npm run typecheck`, y un gate ejecutable de 30 tests impide que la clase entera del defecto vuelva a colarse.**

## Performance

- **Duration:** ~10 min (commits `5173caf` → `4b02c0e`)
- **Started:** 2026-09-13T14:00:07+02:00 (baseline de tests antes de tocar nada)
- **Completed:** 2026-09-13T14:09:45+02:00
- **Tasks:** 2
- **Files modified:** 5 (1 nuevo, 4 modificados)

## Accomplishments

- `resolveNoticeVariant`/`planGameEnd` (`useHistorySavedNotice.ts`) ya no aceptan un `boolean` de escritura en su segundo argumento: aceptan `StoredProgress` (`'resumable' | 'absent' | 'unknown'`, plan 09-25). El cambio de tipo es una barrera de verdad desde el plan 09-24 — demostrado, no afirmado, más abajo.
- Nueva variante `failure-unknown`: tabla TOTAL sobre los tres valores del dispositivo. Ningún estado se pliega sobre otro (afirmar presencia sin comprobar, ronda 4; afirmar ausencia sin comprobar, ronda 5, son la misma prohibición).
- `planGameEnd(historyRecorded, stored)`: única decisión de fin de partida — variante del aviso y `preserveProgress` salen del mismo sitio, y `preserveProgress` depende solo de `historyRecorded` (no borrar es siempre el lado seguro).
- `app/pages/[game]/index.vue`: `onMounted` y `onOutcomeRecorded` llaman los dos a `readStoredProgress(game)` — la página ya no compone `expand`/`load`/`resume` por su cuenta (`load` sale de la desestructuración de `usePersistedSession()`).
- Guarda de reentrada (`if (!awaitingEndConfirm.value) return`) en `onOutcomeRecorded` y `onOutcomeDismiss`: cierra WR-01 de `09-REVIEW.md` (un doble toque ya no cae en el `else` y borra en silencio el progreso preservado).
- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (nuevo, 30 tests): Gate A/B/C ejecutables, descritos abajo.
- `avisoTrasRegistroFallido.test.ts` reescrito con el escenario exacto de la ronda 5: un doble de `localStorage` que escribe con éxito 3 veces y falla en la 4ª (`createFakeLocalStorageFailingAfter`), que el doble anterior (lanzaba desde la primera llamada) no podía representar.
- Verificación final: `npm run typecheck` → 0, `npx vitest run` → 845/845 (30 ficheros, +36 sobre el baseline de 809), `npm run build` → 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: el aviso deja de aceptar booleanos de escritura — cuatro variantes tipadas contra la autoridad, y una sola decisión de fin de partida** — `5173caf` (feat)
2. **Task 2: los dos consumidores hablan por la autoridad, la reentrada deja de borrar progreso, y un gate impide que vuelva a colarse una afirmación sin respaldo** — `4b02c0e` (feat)

**Plan metadata:** pendiente (este commit, ver más abajo)

## Files Created/Modified

- `app/composables/useHistorySavedNotice.ts` — `NoticeVariant` con cuarta variante `failure-unknown`; `resolveNoticeVariant`/`planGameEnd` tipados contra `StoredProgress`; `GameEndPlan`/`planGameEnd` (nuevo); `notifyHistorySaved(variant: NoticeVariant)` recibe la variante ya decidida; `NOTICE_HEADING`/`NOTICE_BODY` con la cuarta entrada y `failure-unrecoverable` reescrito para afirmar solo lo que la lectura comprueba
- `app/composables/__tests__/useHistorySavedNotice.test.ts` — adaptado al contrato nuevo (sin borrar tests), tabla de verdad ampliada a las seis combinaciones de `historyRecorded × StoredProgress`, comprobación de que `failure-unknown` tiene cuerpo propio
- `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` — reescrito: nuevo doble `createFakeLocalStorageFailingAfter(n)`, 7 tests incluido "EL TEST DE LA RONDA 5" (progreso viejo escrito de verdad + escritura de cierre fallida → `failure-recoverable`, no `failure-unrecoverable`), importado `beforeEach` eliminado por no uso (IN-01 de `09-REVIEW.md`)
- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (nuevo) — el gate de clase: Gate A (recorrido de `app/**/*.vue`, extrae `<template>`, quita comentarios HTML, busca frases sobre datos del grupo), Gate B (cobertura total y biyectiva de `NOTICE_BODY` sobre `StoredProgress`), Gate C (los literales `'resumable'`/`'absent'`/`'unknown'` y las comparaciones `stored === '...'` solo en los tres ficheros que conocen la autoridad)
- `app/pages/[game]/index.vue` — `onMounted` y `onOutcomeRecorded` cableados a `readStoredProgress(game)`; `load`/`expand`/`resume` eliminados de la página; guarda de reentrada en `onOutcomeRecorded`/`onOutcomeDismiss`; comentario de cabecera actualizado

## Decisions Made

- **Task 2:** `import.meta.glob` en vez de `node:fs`/`node:url` para el recorrido recursivo del gate de clase — ver `key-decisions` arriba y la sección de Deviations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] El recorrido recursivo con `node:fs` que el plan describía rompía `npm run typecheck` bajo `app/composables/__tests__/`**

- **Found during:** Task 2, al diseñar `afirmacionesRespaldadas.test.ts` según la acción literal del plan (`node:fs` para listar `app/**/*.vue`/`app/**/*.ts`).
- **Issue:** Igual que documentó `09-25-SUMMARY.md` para el import del fixture JSON, `app/composables/__tests__/` SÍ está dentro del alcance de `npm run typecheck` (09-24), y el proyecto no tiene `@types/node` instalado — `readFileSync`/`readdirSync` con `node:fs` habría fallado con `TS2307: Cannot find module 'node:fs'`.
- **Fix:** Verificado empíricamente (fichero de humo temporal, borrado tras la comprobación) que `import.meta.glob` — macro de Vite, disponible bajo Vitest y con tipos ya resueltos en este proyecto vía `vite/client` (referenciado por `nuxt/app`) — recorre `app/**/*.vue` y `app/**/*.ts` de forma igual de recursiva y sin listas tecleadas a mano, sin depender de ningún módulo de Node. Usado para las tres listas de ficheros de los tres gates.
- **Files modified:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts`
- **Verification:** `npm run typecheck` → 0 con el fichero incluido; `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts` → 30/30.
- **Committed in:** `4b02c0e` (Task 2)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** El recorrido sigue siendo recursivo y automático (nunca una lista tecleada a mano, que era el requisito real del plan); solo cambió el mecanismo de listado de ficheros. Ningún fichero fuera de `files_modified` del plan quedó tocado. Sin scope creep.

## Issues Encountered

Durante la redacción de `useHistorySavedNotice.ts` (Task 1) el primer borrador nombró el parámetro de `notifyHistorySaved` `variant` mientras el estado de módulo también se llamaba `variant` — el parámetro habría ensombrecido al `ref` dentro del cuerpo de la función, dejando `notifyHistorySaved` sin efecto real. Detectado y corregido antes de ejecutar ningún test (renombrado el `ref` de módulo a `activeVariant`); no llegó a commitearse en ese estado.

## User Setup Required

None - no se requiere configuración externa.

## Demostraciones exigidas (honestidad — cinco rondas de verificación cerradas en falso obligan a esto)

### 1. La barrera de tipos: pasar un `boolean` donde va `StoredProgress`

Se sustituyó temporalmente, en el test 5 de `avisoTrasRegistroFallido.test.ts`
(`planGameEnd(historyRecorded, informe.stored)` → `planGameEnd(historyRecorded, guardadoDeCierre)`,
donde `guardadoDeCierre` es el `boolean` que devuelve `save()`), reproduciendo literalmente el
código anterior a este plan.

**ROJO — `npm run typecheck`:**
```
app/composables/__tests__/avisoTrasRegistroFallido.test.ts(218,41): error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'StoredProgress'.
app/pages/[game]/index.vue(610,34): error TS2554: Expected 1 arguments, but got 2.
```
(El segundo error es el esperado en ese punto intermedio: la Task 2 aún no había cableado `index.vue`.)

**ROJO — `npx vitest run avisoTrasRegistroFallido.test.ts` (además del tipo, el valor también falla):**
```
AssertionError: expected 'failure-unknown' to be 'failure-recoverable'
 ❯ app/composables/__tests__/avisoTrasRegistroFallido.test.ts:218:68
Tests  1 failed | 6 passed (7)
```

Revertido el cambio, confirmado el **VERDE**:
```
Test Files  2 passed (2)
     Tests  22 passed (22)
```
(`useHistorySavedNotice.test.ts` + `avisoTrasRegistroFallido.test.ts`, EXIT=0)

### 2. El gate de clase — Gate A (ningún `.vue` afirma sin respaldo)

Se añadió temporalmente `<p>La partida sigue guardada en el dispositivo.</p>` dentro del
`<template>` de `app/components/ResumePrompt.vue`.

**ROJO:**
```
FAIL app/composables/__tests__/afirmacionesRespaldadas.test.ts > Gate A … > /app/components/ResumePrompt.vue no afirma nada sobre los datos del grupo en su <template> sin auditoría
Error: app/components/ResumePrompt.vue afirma en su <template> sobre los datos guardados del grupo (en el dispositivo, sigue guardada) sin pasar por la autoridad. …
Tests  1 failed | 29 passed (30)
```

Revertido (`diff` contra copia de seguridad: fichero idéntico al original), confirmado el
**VERDE:** `Test Files 1 passed (1)` / `Tests 30 passed (30)`.

### 3. El gate de clase — Gate C (procedencia del estado del dispositivo)

Se sustituyó temporalmente, en `app/pages/[game]/index.vue`,
`planGameEnd(guardado, stored)` por `planGameEnd(guardado, 'absent')` (inventar el estado del
dispositivo en vez de preguntárselo a la autoridad).

**ROJO:**
```
FAIL app/composables/__tests__/afirmacionesRespaldadas.test.ts > Gate C … > los literales 'resumable', 'absent' y 'unknown' solo aparecen en los ficheros que conocen la autoridad
Error: app/pages/[game]/index.vue nombra el estado del dispositivo ('resumable'/'absent'/'unknown') sin ser uno de los ficheros que conocen la autoridad. …
Tests  1 failed | 29 passed (30)
```

Revertido (`diff` contra copia de seguridad: fichero idéntico al original), confirmado el
**VERDE:** `Test Files 1 passed (1)` / `Tests 30 passed (30)`.

Ningún error de humo quedó commiteado en ninguna de las tres demostraciones: los tres ficheros
tocados (`avisoTrasRegistroFallido.test.ts`, `ResumePrompt.vue`, `index.vue`) se restauraron con
`diff` confirmando identidad byte a byte contra su copia de seguridad antes de ejecutar cualquier
comando de verificación en verde, y antes de hacer ningún `git add`/`git commit`.

## Invariantes comprobados citando el código resultante (no recordados)

**D-U4** (`silence()` → `record()` → `save()` → `notifyHistorySaved()` → `finishGame()`, con la
lectura de la autoridad intercalada entre `save()` y `notifyHistorySaved()`), verificado por
número de línea creciente en el código real (`grep -n "function onOutcomeRecorded" -A 25`):

```
637:  silence()
638:  if (session.value && game) {
639:    const guardado = record(session.value, outcome)
640:    if (!guardado) save(session.value)
641:    const { stored } = readStoredProgress(game)
642:    const plan = planGameEnd(guardado, stored)
643:    notifyHistorySaved(plan.variant)
644:    finishGame(plan.preserveProgress)
645:  } else {
646:    finishGame()
647:  }
```

**VOZ-06/D-51** (los dos llamadores del autoguardado siguen ignorando el resultado de `save()`),
verificado con grep sobre el código real, fuera de comentarios:

```
$ grep -v '^\s*//' "app/pages/[game]/index.vue" | grep -cF "save(value)"
1   # watchDebounced del autoguardado — sigue sin mirar el retorno
$ grep -v '^\s*//' "app/pages/[game]/index.vue" | grep -cF "if (session.value) save(session.value)"
1   # pagehide — sigue sin mirar el retorno
```

Ninguno de los dos llamadores del autoguardado (el `watchDebounced` de las líneas ~176-183 ni el
`pagehide` de la línea ~197) se tocó en este plan — confirmado también por el `diff` del commit
`4b02c0e`, que no incluye ninguna línea en ese rango salvo el import y la cabecera.

## Verificación final del plan

```
$ npm run typecheck   → EXIT=0
$ npx vitest run      → 30 Test Files passed (30), 845 Tests passed (845) → EXIT=0
$ npm run build       → ✨ Build complete! → EXIT=0
```

Recuento de tests: 809 (baseline, cierre de 09-25) → 845 (cierre de este plan), +36. Ningún test
existente se ha borrado; los +36 se reparten en +3 (`useHistorySavedNotice.test.ts`, tabla de
verdad ampliada a `StoredProgress`), +3 (`avisoTrasRegistroFallido.test.ts`, el nuevo test de la
ronda 5 más el doble que lo hace posible) y +30 (`afirmacionesRespaldadas.test.ts`, nuevo).

```
$ grep -rn "notifyHistorySaved" app --include='*.ts' --include='*.vue'
```
Una única definición (`useHistorySavedNotice.ts:155`, un argumento) y una única llamada real
(`app/pages/[game]/index.vue:643`, con `plan.variant`) — el resto de coincidencias son imports,
comentarios y el propio test.

```
$ grep -rn "readStoredProgress" app --include='*.ts' --include='*.vue'
```
La definición (`useStoredProgress.ts:69`), su test (`useStoredProgress.test.ts`), los dos
consumidores de `app/pages/[game]/index.vue` (`:158` montaje, `:641` fin de partida) y los tests
que la ejercitan (`avisoTrasRegistroFallido.test.ts`) — ningún otro sitio se inventa el estado del
dispositivo, confirmado además por el Gate C del propio gate de clase.

## Declaración obligatoria de alcance (DEV-02, comprobación humana pendiente)

**Este plan NO incluye ninguna comprobación en tablet real.** La deuda DEV-02
(`REQUIREMENTS.md`, pendiente desde `09-22-SUMMARY.md`) sigue exactamente igual de abierta que
antes de este plan: todo lo verificado arriba es código, tipos y tests automatizados en este
entorno de desarrollo, nunca una observación en el dispositivo de mesa (cuyo modelo/SO siguen sin
identificarse, bloqueante abierto desde la Fase 1). Este plan no la cierra ni pretende cerrarla.

La actualización de la documentación de fase (`REQUIREMENTS.md`, `deferred-items.md`,
`09-AUDIT-AFIRMACIONES-UI.md`) para que describa este código ya existente queda, tal como fija el
`scope_boundary` de este plan, para el plan **09-27** — escribirla aquí habría repetido la nota de
cierre prematura que motivó la ronda 5.

## Next Phase Readiness

- El BLOCKER de la ronda 5 (`09-VERIFICATION.md`) está cerrado en código, tipos y tests: los dos
  consumidores obtienen su respuesta de la misma lectura del mismo dispositivo, y tres barreras
  independientes (tipos, gate de clase, test de regresión con el doble que falla tarde) impiden que
  vuelva a abrirse por la misma costura o por una costura nueva de la misma clase.
- WR-01 y WR-09 de `09-REVIEW.md` quedan cerrados como efecto colateral de la misma tarea (la
  guarda de reentrada y `planGameEnd` respectivamente).
- Plan 09-27 puede escribir la documentación de fase describiendo código ya existente y verificado,
  no una intención.
- Sigue pendiente, sin suavizar: DEV-02 (comprobación en tablet real) y WR-04 de `09-REVIEW.md`
  (solape de `UpdateBanner`/`HistorySavedNotice`, aplazado con evaluación de riesgo por el propio
  `scope_boundary` de este plan, a documentar en `deferred-items.md` por el plan 09-27).

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*

## Self-Check: PASSED

Todos los ficheros citados (los 5 de `files_modified` + este SUMMARY) existen en disco; los dos
commits de task (`5173caf`, `4b02c0e`) existen en `git log`.
