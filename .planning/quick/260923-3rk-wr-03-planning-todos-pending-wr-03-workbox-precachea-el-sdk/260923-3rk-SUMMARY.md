---
status: complete
quick_id: 260923-3rk
todo: wr-03-workbox-precachea-el-sdk-de-firebase
requirements: [SYNC-05, COMP-03]
commits:
  - 682f746: "feat(quick-260923-3rk): excluir el SDK de Firebase del precacheo de Workbox"
  - 0c00f20: "fix(quick-260923-3rk): revertir guardas anticipadas de scripts/pwa/firebase-sdk-precache.ts"
  - de11b1b: "test(quick-260923-3rk): RED de las guardas de integridad y de HTML (proyecto Vitest build-tooling)"
  - 06588c6: "feat(quick-260923-3rk): guardas de integridad y de HTML en computeFirebaseSdkExclusions"
  - dc8ad79: "docs(quick-260923-3rk): cerrar todo WR-03 (SDK de Firebase fuera del precacheo)"
key-files:
  created:
    - scripts/pwa/firebase-sdk-precache.ts
    - scripts/pwa/__tests__/firebase-sdk-precache.test.ts
  modified:
    - nuxt.config.ts
    - e2e/bundle-budget.spec.ts
    - vitest.config.ts
    - .planning/todos/completed/wr-03-workbox-precachea-el-sdk-de-firebase.md (git mv desde pending/)
---

# Quick 260923-3rk: WR-03 — Workbox ya no precachea el SDK de Firebase

Hook `pwa:beforeBuildServiceWorker` + helper `scripts/pwa/firebase-sdk-precache.ts` excluyen del precacheo de Workbox el grafo diferido del SDK de Firebase (~715 KB), identificado por la marca de contenido `@firebase/` con cierre de fachadas por imports estáticos y dos guardas (integridad + HTML), verificado extremo a extremo contra `sw.js` real con los presets `static` y `vercel`.

## Qué se hizo

**Task 1 (tracer):** oráculo nuevo en `e2e/bundle-budget.spec.ts` (independiente del helper, lee `sw.js` real) + `scripts/pwa/firebase-sdk-precache.ts` (regla semilla `@firebase/` + cierre de fachadas por imports estáticos `./X.js`) + hook `pwa:beforeBuildServiceWorker` en `nuxt.config.ts` que amplía `workbox.globIgnores` en tiempo de build.

**Task 2 (TDD):** proyecto Vitest nuevo `build-tooling` (`scripts/**/*.test.ts`) + 22 tests unitarios de la regla y de dos guardas nuevas — guarda de integridad (un chunk no excluido que importa estáticamente uno excluido lanza, cita SYNC-05) y guarda de HTML (un chunk excluido referenciado por HTML de arranque lanza).

**Task 3:** regresión completa (Vitest, typecheck, preset de Vercel, los 4 specs del camino PWA) y cierre del todo WR-03 en `.planning/todos/completed/` (override de la orquestación: `completed/`, no `done/`).

## RED del oráculo (Task 1, antes de implementar B y C)

```
✘ Precacheo del service worker sin el SDK de Firebase (WR-03)
  Error: sw.js precachea chunks del SDK de Firebase: BcHXCJVE.js (31999 B),
  DLhGvpfH.js (555902 B), qDVyyMaW.js (127233 B) — cualquier visitante los
  descargaría al instalar la PWA.
  Expected: 0
  Received: 3
```

Mordía exactamente donde el plan esperaba (aserción 3, listando los tres chunks marcados con `@firebase/`). Tras implementar B y C: 2 passed, 0 flaky.

**Desviación documentada:** la primera versión del regex de imports estáticos (`(?:^|[;,}])\s*(?:import|export)...`) no reconocía la forma real de Rolldown sin espacio entre `}` y `from` (`import{a as b}from"./BcHXCJVE.js"`, exactamente la fachada de `firebase/app`), así que solo excluía 3 chunks (715 134 B) en vez de 4 (715 815 B). Corregido el regex en el helper y en el oráculo e2e (independientes, cada uno con su propia expresión) a `\b(?:import|export)(?!\()[^;()]*?["'\`]\.\/([\w.-]+\.js)["'\`]/g`, verificado contra el chunk real de la fachada.

## `[pwa] WR-03:` (línea del log de `npm run generate`)

```
[pwa] WR-03: 4 chunk(s) del SDK de Firebase excluidos del precacheo, 715815 bytes totales
```

Coincide exactamente con la medición de planificación (4 chunks: 3 semillas — `BcHXCJVE.js` 31 999 B, `qDVyyMaW.js` 127 233 B, `DLhGvpfH.js` 555 902 B — más la fachada `B6E8Dypd.js` 681 B, total 715 815 B).

## Entradas de `sw.js` — antes y después

| | Preset `static` |
|---|---|
| Antes (sin el hook, medido revirtiendo el fix temporalmente) | 76 entradas `url:"…"`, 3 chunks del SDK precacheados (`BcHXCJVE.js`, `DLhGvpfH.js`, `qDVyyMaW.js`) |
| Después | 72 entradas `url:"…"`, 0 chunks del SDK precacheados |

Rutas limpias (`/`, `marvel-champions`, `historico`, `estadisticas`) presentes en ambos casos — el transform de `@vite-pwa/nuxt` sigue activo.

## Preset de producción (`NITRO_PRESET=vercel`)

Misma exclusión: 4 chunks, 715 815 bytes. La comprobación de `<verify>` de la Task 3 (script node autónomo sobre `.vercel/output/static/sw.js` + `_nuxt/`):

```
OK .vercel/output/static 3 chunks SDK fuera de 67 entradas
```

(RED en la planificación — la misma comprobación fallaba antes con `SDK precacheado: BcHXCJVE.js,DLhGvpfH.js,qDVyyMaW.js`). `.vercel/` no existía antes de esta ejecución; se borró con `rm -rf .vercel` tras la comprobación.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Regex de imports estáticos no reconocía la forma real sin espacio antes de `from`**
- **Found during:** Task 1, tras implementar B y C — el primer `npm run generate` solo excluía 3 chunks (715 134 B), no los 4 (715 815 B) medidos en planificación.
- **Issue:** `import{a as b}from"./X.js"` (salida real de Rolldown para la fachada de `firebase/app`, sin espacio entre `}` y `from`) no coincidía con el regex original, que exigía `\s+` tras `import`/antes de `from`.
- **Fix:** regex reescrito a `\b(?:import|export)(?!\()[^;()]*?["'\`]\.\/([\w.-]+\.js)["'\`]/g` en `scripts/pwa/firebase-sdk-precache.ts` y, de forma independiente, en `e2e/bundle-budget.spec.ts`.
- **Files modified:** scripts/pwa/firebase-sdk-precache.ts, e2e/bundle-budget.spec.ts
- **Commit:** 682f746 (incluido en el mismo commit de Task 1, corregido antes de confirmar el GREEN)

**2. [Corrección de alcance de proceso, sin Rule numerada] Guardas implementadas por adelantado en Task 1, revertidas para permitir RED genuino en Task 2**
- **Found during:** revisión propia antes de escribir el test RED de la Task 2.
- **Issue:** el helper de la Task 1 (commit 682f746) ya incluía las dos guardas (integridad + HTML) que el plan reserva explícitamente para el ciclo RED→GREEN de la Task 2 (`tdd="true"`). Escribir el test RED contra un código que ya las implementaba habría dado un GREEN inesperado, no un RED genuino.
- **Fix:** commit de revertido (0c00f20) que reduce `computeFirebaseSdkExclusions` a la firma de un solo parámetro sin throw, confirmado que el oráculo de la Task 1 seguía en verde (no ejercita las guardas). Después, ciclo RED (de11b1b, 3 tests fallando) → GREEN (06588c6, 22/22) genuino.
- **Files modified:** scripts/pwa/firebase-sdk-precache.ts
- **Commits:** 0c00f20 (revertir), de11b1b (RED), 06588c6 (GREEN)

## Resultado de `npm run test` / `npm run typecheck`

- `npm run test`: 38 ficheros, 1161/1161 tests, verde.
- `npm run typecheck` (`nuxt typecheck`, `vue-tsc` real): exit 0, sin salida — verde.

## Resultado de los specs e2e del camino PWA (Task 3)

Comando: `CI=1 npx playwright test e2e/bundle-budget.spec.ts e2e/update-banner.spec.ts e2e/offline-flow.spec.ts e2e/pwa-install.spec.ts`

**15 passed, 0 failed, 0 flaky** (1 reintento configurado por `CI=1`; ninguno lo necesitó):

- `bundle-budget.spec.ts`: 2/2 (presupuesto de bundle inicial D-16/SYNC-05 + WR-03 nuevo).
- `offline-flow.spec.ts`: 5/5 (flujo completo sin red, las 4 rutas por `page.goto` directo, fin de partida sin red).
- `pwa-install.spec.ts`: 4/4 (registro del SW, manifiesto, iconos, apple-touch-icon).
- `update-banner.spec.ts`: 4/4 (sin recarga sola, banda no aparece sin build nueva, `registration.waiting` null, guarda de texto COMP-03 sobre `nuxt.config.ts`).

No se editó `e2e/offline-flow.spec.ts` (pertenece a 260923-3rl); solo se ejecutó completo.

## Autenticación / gates de humano

Ninguno. Sin instalación de paquetes nuevos (no aplica el gate de legitimidad de paquetes, confirmado también en el `<threat_model>` del plan).

## Known Stubs

Ninguno.

## Todo cerrado

`.planning/todos/completed/wr-03-workbox-precachea-el-sdk-de-firebase.md` (movido de `pending/` con `git mv`, `status: completed`, `resolved: 2026-09-23`, `resolved_by: quick-260923-3rk`, sección `## Resolución` con las cifras reales medidas en esta ejecución).

## Self-Check

- `scripts/pwa/firebase-sdk-precache.ts` existe: FOUND
- `scripts/pwa/__tests__/firebase-sdk-precache.test.ts` existe: FOUND
- `.planning/todos/completed/wr-03-workbox-precachea-el-sdk-de-firebase.md` existe: FOUND
- `.planning/todos/pending/wr-03-workbox-precachea-el-sdk-de-firebase.md` ya no existe: CONFIRMADO
- Commits 682f746, 0c00f20, de11b1b, 06588c6, dc8ad79 presentes en `git log`: FOUND (los 5)
- `.vercel/` no existe tras la ejecución: CONFIRMADO

## Self-Check: PASSED
