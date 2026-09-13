---
phase: 09-hist-rico-y-estad-sticas
plan: 24
subsystem: testing
tags: [typescript, vue-tsc, ci, github-actions, nuxt]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "09-23 y anteriores — el código de app/ y engine/ sobre el que este plan instala el comprobador"
provides:
  - "Comprobador de tipos real (`npm run typecheck` → `nuxt typecheck` → `vue-tsc`) instalado, en verde, y colgado de CI"
  - "Inventario escrito del primer barrido (0 errores) con la clasificación de cobertura completa"
  - "Prueba de humo demostrada — no afirmada — de que la barrera falla cuando tiene que fallar, en `.ts` y en `.vue`"
affects: ["09-25", "09-26"]

# Tech tracking
tech-stack:
  added: ["typescript@5.9.3 (devDependency)", "vue-tsc@3.3.11 (devDependency)"]
  patterns:
    - "El typecheck vive en CI como paso propio (`npm run typecheck`), NUNCA en `nuxt.config.ts` — así un error de tipos preexistente no puede tumbar el despliegue de Vercel vía `nuxt build`"
    - "Prueba de humo obligatoria antes de dar por buena cualquier barrera automática: introducir el fallo, comprobar el rojo, revertir, comprobar el verde — con el `diff` como prueba de que no queda nada a medias"

key-files:
  created:
    - .planning/phases/09-hist-rico-y-estad-sticas/09-TYPECHECK-INVENTARIO.md
  modified:
    - package.json
    - package-lock.json
    - .github/workflows/ci.yml

key-decisions:
  - "Task 1: typescript@^5.9.3 + vue-tsc@^3.3.11 (option-a) — se descarta TypeScript 7 (latest) a propósito porque es la reescritura en Go, con una superficie interna distinta de la que consume @volar/typescript (base de vue-tsc); que el rango de peerDependencies lo admita no es prueba de que funcione"
  - "Task 3: opcion-a (dejar el alcance como está) — el primer barrido dio 0 errores con strict:true, así que no había nada que arreglar ni que suprimir; el alcance queda el que Nuxt genera de fábrica"
  - "El hueco de cobertura de 28 ficheros (engine/schema.ts, engine/catalogueSchema.ts, los 17 engine/__tests__/*.test.ts, los 7 e2e/*.spec.ts, playwright.config.ts, vitest.config.ts) se acepta explícitamente sin ampliarlo en este plan; verificado con tsc --listFilesOnly que es disjunto de la superficie de 09-25/09-26"

requirements-completed: [HIST-06]

# Metrics
duration: 8min (Task 4, agente de continuación — no incluye el tiempo humano de las Tasks 1 y 3)
completed: 2026-09-13
---

# Phase 09 Plan 24: Barrera de tipos real (typecheck) Summary

**`npm run typecheck` (typescript@5.9.3 + vue-tsc@3.3.11) instalado, colgado del job `test` de CI antes de los tests, y demostrado en rojo y en verde tanto en `.ts` como en `.vue` — con el primer barrido real dando 0 errores sobre el alcance que Nuxt genera de fábrica.**

## Performance

- **Duration (Task 4, esta sesión de continuación):** 8 min (`63946d3` → `9b18549`)
- **Started:** 2026-09-13T13:39:34+02:00 (commit de Task 2, punto de partida de esta sesión)
- **Completed:** 2026-09-13T13:47:09+02:00
- **Tasks:** 4 (2 checkpoints de decisión + 2 auto), de los cuales esta sesión ejecutó la Task 4
- **Files modified (Task 4):** 2 (`.github/workflows/ci.yml`, el inventario)

## Accomplishments
- Paso `Typecheck` (`npm run typecheck`) añadido al job `test` de `.github/workflows/ci.yml`, entre `Install dependencies` y `Run tests` — confirmado por orden de línea con `grep -n`.
- Prueba de humo real: un error de tipos deliberado en un fichero `.ts` cubierto (`useHistorySavedNotice.ts`) y otro en un fichero `.vue` cubierto (`HistorySavedNotice.vue`, vía la plantilla) hacen fallar `npm run typecheck` con código de salida 2 en ambos casos; revertidos, vuelve a 0. Evidencia literal más abajo.
- El inventario del primer barrido (Task 2) queda cerrado con la opción aplicada, el estado final y el resultado de las dos pruebas de humo.
- `npx vitest run` (796 tests) y `npm run build` siguen en verde tras todos los cambios de este plan — instalar y colgar el comprobador no ha alterado ni los tests ni la compilación de producción.

## Task Commits

1. **Task 1: decidir versiones (checkpoint:decision)** — resuelto por el usuario, sin commit propio (no modifica ficheros)
2. **Task 2: instalar + script + primer barrido + inventario** — `63946d3` (feat)
3. **Task 3: decisión del usuario sobre el inventario (checkpoint:decision)** — resuelto por el usuario, sin commit propio (no modifica ficheros)
4. **Task 4: aplicar la decisión + prueba de humo + CI** — `9b18549` (feat)

**Plan metadata:** pendiente (este commit, ver más abajo)

## Files Created/Modified
- `.planning/phases/09-hist-rico-y-estad-sticas/09-TYPECHECK-INVENTARIO.md` — inventario del primer barrido (Task 2) + sección de cierre con la opción aplicada y la evidencia de las pruebas de humo (Task 4)
- `.github/workflows/ci.yml` — paso `Typecheck` (`npm run typecheck`) en el job `test`, antes de `Run tests`
- `package.json` / `package-lock.json` — `typescript@^5.9.3`, `vue-tsc@^3.3.11` como devDependencies, script `"typecheck": "nuxt typecheck"` (todo de la Task 2, previamente commiteado)

## Decisions Made

- **Task 1 (usuario):** `option-a` — `typescript@^5.9.3` + `vue-tsc@^3.3.11`. TypeScript 7 (`latest`) descartado a propósito: es la reescritura nativa en Go, con superficie interna distinta de la que consume `@volar/typescript` (base de `vue-tsc`); el rango de `peerDependencies` lo admite formalmente pero eso no es prueba de que funcione.
- **Task 3 (usuario):** `opcion-a` ("arreglar todo ahora y que el typecheck cubra el proyecto entero"). Como el primer barrido dio 0 errores, esta opción no exigió ninguna corrección real: el coste fue nulo en la práctica, tal como anticipaba la recomendación del ejecutor en el propio inventario.

## Alcance real del comprobador — declarado sin adornos

**`npm run typecheck` NO cubre el repositorio entero.** Cubre el grafo de tipos que arranca en
`.nuxt/tsconfig.json` (generado por Nuxt con `include: ../app/**/*`, más `.nuxt/`, `content/` y
`nuxt.config.ts`), más cualquier fichero que ese grafo importe transitivamente — así es como
`engine/history.ts` y `engine/persistence.ts` entran sin estar en `include`.

**Quedan fuera, verificado con `vue-tsc --noEmit -p .nuxt/tsconfig.json --listFiles` (Task 2) y
confirmado de nuevo con `tsc --listFilesOnly` (orquestador, cierre de esta Task 4) — 28 ficheros:**
- `engine/schema.ts`, `engine/catalogueSchema.ts` (2)
- `engine/__tests__/*.test.ts` (17)
- `e2e/*.spec.ts` (7)
- `playwright.config.ts`, `vitest.config.ts` (2)

Ninguno de estos 28 ficheros pasa nunca por `npm run typecheck`: Vitest y Playwright los ejecutan
vía esbuild/SWC, que transpila sin comprobar tipos — la misma mecánica que este plan documenta en
su objetivo para `nuxt build`.

**Dato verificado que sostiene 09-25 y 09-26:** ese conjunto de 28 ficheros sin cubrir es
**disjunto** de la superficie que esos dos planes tocan. Dentro del grafo de tipos que
`npm run typecheck` SÍ recorre están `app/composables/usePersistedSession.ts`,
`app/composables/useHistorySavedNotice.ts`, los 11 `app/composables/__tests__/*.test.ts`,
`app/pages/[game]/index.vue` (vía `vue-tsc`), `engine/history.ts` y `engine/persistence.ts`; y
`app/composables/useStoredProgress.ts`, al nacer bajo `app/**`, también quedará cubierto en
cuanto exista. Esta afirmación no es una promesa: está respaldada por la orden de listado de
ficheros citada arriba, no por inspección visual de rutas.

Este hueco no se abre como entrada nueva en `deferred-items.md`: no es una exclusión introducida
por este plan (`opcion-a` no excluye nada respecto al comportamiento de fábrica de
`nuxt typecheck`), es el comportamiento de fábrica del `include` que Nuxt genera, ya descrito en
el §5 del inventario antes de que la Task 4 tocara nada, y el usuario lo ha visto y aceptado
explícitamente en el checkpoint de la Task 3.

## Prueba de humo — evidencia literal

**1. `.ts` cubierto** (`app/composables/useHistorySavedNotice.ts`, `resolveAutoDismissMs`):
cambio temporal para devolver `'PRUEBA_DE_HUMO_09_24'` (string) en una función declarada `: number`.

```
$ npm run typecheck
app/composables/useHistorySavedNotice.ts(30,3): error TS2322: Type 'string' is not assignable to type 'number'.
EXIT_CODE=2
```

**2. `.vue` cubierto** (`app/components/HistorySavedNotice.vue`): `@click="dismiss"` cambiado
temporalmente a `@click="dismiss('PRUEBA_DE_HUMO_09_24')"` (la función es `() => void`, cero
argumentos).

```
$ npm run typecheck
app/components/HistorySavedNotice.vue(93,25): error TS2554: Expected 0 arguments, but got 1.
EXIT_CODE=2
```

El error señala una línea dentro de `<template>`, lo que demuestra que `vue-tsc` comprueba las
plantillas y no solo el bloque `<script setup lang="ts">` — el requisito explícito de esta prueba.

**3. Verde final**, tras revertir ambos cambios (confirmado por `diff` contra copia de seguridad:
ficheros idénticos al original en ambos casos):

```
$ npm run typecheck
EXIT_CODE=0
```

Ningún error de humo quedó commiteado: los dos ficheros no aparecen modificados en el commit de
la Task 4 (`git diff --stat -- app/composables/useHistorySavedNotice.ts app/components/HistorySavedNotice.vue` da vacío; el último commit que los toca sigue siendo `43c51d4`, de un plan anterior).

## Verificación final del plan (los tres comandos de `<verification>`)

```
$ npm run typecheck            → EXIT_CODE=0
$ npx vitest run                → 28 Test Files passed (28), 796 Tests passed (796) → EXIT_CODE=0
$ npm run build                 → ✨ Build complete! → EXIT_CODE=0
```

```
$ grep -c "npm run typecheck" .github/workflows/ci.yml   → 1
$ grep -n "Install dependencies\|Typecheck\|Run tests" .github/workflows/ci.yml
23:      - name: Install dependencies
26:      - name: Typecheck
29:      - name: Run tests
```

Orden creciente confirmado: instalación → typecheck → tests.

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito. La Task 4 no tuvo correcciones de tipos
que aplicar porque el recuento del primer barrido fue 0 (dato de la Task 2, no una omisión de
esta tarea).

## Issues Encountered

Ninguno. El `.planning/STATE.md` aparece modificado en el árbol de trabajo (timestamps y
contadores de progreso) por actividad previa a esta sesión de continuación, ajena a la Task 4;
no se ha tocado ni commiteado en el commit `9b18549` — su actualización correcta se deja al paso
de `state_updates` de este mismo plan, más abajo en el flujo del ejecutor.

## User Setup Required

None — no se requiere configuración externa. Los dos paquetes nuevos (`typescript`, `vue-tsc`)
son devDependencies verificadas por el usuario en el checkpoint de la Task 1 antes de instalarse.

## Next Phase Readiness

`npm run typecheck` es ahora una barrera real, verde, colgada de CI, y su alcance (y sus límites)
quedan escritos con precisión en este documento y en el inventario. Los planes 09-25 y 09-26
pueden apoyarse en esta barrera para su propia superficie de ficheros — verificado como disjunta
del hueco de cobertura — sin heredar la afirmación sin comprobar que motivó este plan.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*
