---
phase: 02-bucle-de-ronda-y-reglas-verificadas
plan: 01
subsystem: content + engine schema
tags: [round-loop, content-authoring, zod-schema, ci-gate]
dependency_graph:
  requires: []
  provides:
    - "content/marvel-champions.json: sección ronda (repeats:true, 2 fases, 10 pasos, contentVersion 7)"
    - "engine/schema.ts: gate D-37 (exactamente una sección repeats:true) + TextBlockSchema.speech con tope de 120"
    - "cobertura automática de FLOW-03/04/07/08 contra el contenido real"
  affects:
    - "engine/__tests__/content.test.ts (gates 'que muerden' actualizados)"
    - "engine/__tests__/toc.test.ts (7 bloques -> 9 bloques)"
tech_stack:
  added: []
  patterns:
    - "Ciclo RED/GREEN dentro del plan: tarea 1 escribe tests en rojo contra el bucle real, tarea 2 los pone en verde autorando contenido + endureciendo el gate en el mismo commit (Pitfall 1 de 02-RESEARCH.md)"
    - "Gate que muerde (engine/__tests__/content.test.ts): recuentos y listas de ids cableados a mano, deben actualizarse a conciencia cuando el contenido cambia"
key_files:
  created: []
  modified:
    - content/marvel-champions.json
    - engine/schema.ts
    - engine/__tests__/schema.test.ts
    - engine/__tests__/navigator.test.ts
    - engine/__tests__/content.test.ts
    - engine/__tests__/toc.test.ts
decisions:
  - "DC-1 aplicada: los 10 pasos de la ronda declaran speech no vacío (política de fase); los 23 pasos kind:step de la preparación siguen deliberadamente sin speech (retrofit es Fase 3 / VOZ-01)"
  - "DC-2 respetada: engine/expand.ts, engine/navigator.ts y engine/__tests__/fixtures/tiny-game.json no se tocan — el bucle se activa solo con el dato nuevo"
  - "DC-3 / D-34 aplicada: la sección ronda tiene exactamente 2 fases (jugadores 4 pasos, villano 6 pasos), sin una tercera fase 'Fin de ronda'; CONT-04 se satisface dentro de ronda.villano"
metrics:
  duration: "~55min"
  completed: "2026-08-29"
---

# Phase 2 Plan 01: Bucle de ronda — contenido, gate D-37 y cobertura de motor Summary

Autoría de la sección `ronda` de Marvel Champions (2 fases, 10 pasos, citados contra el Rules Reference v1.7) que enciende por primera vez `loopStartIndex`/`loopEndIndex` en `engine/expand.ts`, endurecimiento del gate de esquema a exactamente una sección `repeats:true` (D-37), y cobertura automática de FLOW-03/04/07/08 contra el contenido real en vez de solo el fixture.

## What Was Built

- **`content/marvel-champions.json`**: `contentVersion` 6 → 7 (fuerza el desenlace `content-changed` en partidas guardadas contra la v6, PERS-03). Nueva sección `ronda` (`repeats: true`) con dos fases:
  - `ronda.jugadores` (Title Case, D-27): 4 pasos — turnos de los jugadores, descartar, robar, enderezar.
  - `ronda.villano` (Title Case): 6 pasos oficiales del Rules Reference p.45 — colocar amenaza, los enemigos activan, repartir encuentros, revelar encuentros, pasar ficha de jugador inicial, fin de fase y de ronda (D-35: el paso 6 es un paso real, no un `⚠`).
  - Los 10 pasos declaran `speech` (DC-1), citación `rules-reference` con página, y ningún paso declara `variants.difficulty` (cuarto error confirmado del borrador: el Modo Experto no toca la estructura de la fase del villano).
  - Reglas condicionales ancladas como `⚠` (D-29/D-30): agotamiento de mazo de jugador (`ronda.jugadores.03`), Estados (`ronda.villano.02`), agotamiento de mazo de encuentros (`ronda.villano.04`), cambio de fase del villano (`ronda.jugadores.01`).
  - ADAPT-04 (D-33) resuelto con frase colectiva única en `ronda.villano.02` ("cada héroe... quien esté en Alter-Ego"), sin campo `branches`.

- **`engine/schema.ts`**: `superRefine` pasa de `repeating.length > 1` a `repeating.length !== 1` (D-37, resuelve el `TODO(fase 2)` literal). `TextBlockSchema.speech` gana `.max(120)` y deja de estar "reservado para Fase 3, sin usar aquí" — el contenido de la ronda lo usa desde ahora, aunque el consumidor en tiempo de ejecución (TTS) sigue siendo Fase 3.

- **Tests**: 82 tests en verde (línea base 61).
  - `engine/__tests__/navigator.test.ts`: nuevo `describe('bucle de ronda sobre el contenido real (FLOW-03/04/07/08)')` que carga `content/marvel-champions.json` real y prueba `sequence.length===34`, `loopStartIndex===24`, `loopEndIndex===33`, cierre de bucle con incremento de ronda, el ex-NO-OP `setup.mesa-lista.01 → ronda.jugadores.01`, apertura de bucle con decremento de ronda, salida sin decrementar en ronda 1, `jumpTo` sin mutar `round` en ambas direcciones (dentro y fuera del bucle).
  - `engine/__tests__/schema.test.ts`: `baseGame()` incluye ahora una sección `repeats:true` de serie (obligatorio tras D-37, Pitfall 2 de 02-RESEARCH.md); el test `'NO lanza con cero secciones repeats:true'` se invirtió a `'lanza ZodError con cero secciones repeats:true'`.
  - `engine/__tests__/content.test.ts`: recuentos cableados actualizados (34 nodos / 33 step / 1 summary; 11 pasos con `warning`); nuevo bloque `describe('sección ronda ...')` con 13 aserciones cableadas por id (helper `findStep`/`rondaSteps`, nunca por índice) cubriendo D-34/D-35, Title Case, CONT-02/04/05/06/07, ADAPT-04, los cuatro errores confirmados del borrador, política DC-1 de `speech`, ausencia del glifo `⚠` autorado, y el gate D-37 que muerde.
  - `engine/__tests__/toc.test.ts`: "7 bloques" → 9 bloques, con `Jugadores` y `Villano` al final en orden natural (sin reordenado — eso es `02-02`).

## Verification Performed

- `npx vitest run`: 6 archivos, 82 tests, todos en verde.
- `node -e "..."` estructural sobre el JSON real: `contentVersion===7`, exactamente 1 sección `repeats:true`, 2 fases (4+6 pasos), presupuestos de `text`/`warning`/`speech` respetados, todos citados, ningún paso de la ronda con `variants`.
- `git diff --name-only` por tarea: tarea 1 tocó solo los dos ficheros de test previstos; tarea 2 tocó solo `content/marvel-champions.json` y `engine/schema.ts`; tarea 3 tocó solo `content.test.ts` y `toc.test.ts`.
- Prueba de mordida manual reproducible: se recortó `ronda.villano` a 5 pasos en una copia temporal del JSON real, `content.test.ts` falló (6 tests), se revirtió con `cp` y volvió a verde (31/31) — confirmado que `content/marvel-champions.json` quedó byte-idéntico al commit tras la restauración (`git diff --stat` vacío).
- `engine/expand.ts`, `engine/navigator.ts` y `engine/__tests__/fixtures/tiny-game.json` confirmados sin modificar (`git diff <base>..HEAD --stat` no los lista).
- Infra: `.nuxt/tsconfig.app.json` no existía al empezar (bloqueaba `vitest` con `TSCONFIG_ERROR`); se ejecutó `npx nuxi prepare` para generarlo (Regla 3 — blocking issue, no es un `npm install` de paquete nuevo, es preparación de tipos local; no se commitea, `.nuxt/` es generado).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/tsconfig.app.json` no existía, bloqueando `vitest`**
- **Found during:** Tarea 1, primer intento de `npx vitest run`.
- **Issue:** `Failed to load tsconfig '.nuxt/tsconfig.app.json': Tsconfig not found` — infraestructura de tipos de Nuxt nunca generada en este worktree.
- **Fix:** `npx nuxi prepare` (genera `.nuxt/` localmente; no se commitea, ya está en `.gitignore` del proyecto).
- **Files modified:** ninguno versionado (`.nuxt/` es directorio generado).
- **Commit:** N/A (no versionado).

**2. [Rule 1 - Bug] Bucle no acotado en un test propio causaba cuelgue del proceso**
- **Found during:** Tarea 1, primera ejecución de `navigator.test.ts` tras escribir el test de `jumpTo('setup.heroes.01')` + avance hasta `loopEndIndex`.
- **Issue:** Antes de que la tarea 2 autorase la sección `ronda`, `session.loopEndIndex` es `undefined`. Un `while (advancing.cursor !== session.loopEndIndex)` nunca termina porque `next()` clampa el cursor en el último índice del array (un número) y ese número nunca es `=== undefined`. El proceso de `vitest` (worker `forks.js`) quedó al 100% de CPU sin salir.
- **Fix:** se sustituyó el `while` no acotado por un `for` acotado por `sequence.length`, con la misma condición de parada, de modo que el test converge (falla por la razón correcta) tanto antes como después de que exista `loopEndIndex`.
- **Files modified:** `engine/__tests__/navigator.test.ts`.
- **Commit:** `e7b4f94` (incluido en el mismo commit de la tarea 1, detectado y corregido antes de cerrarla).

No hay deviations de Rule 2 ni Rule 4 — el plan no dejó ninguna funcionalidad crítica sin cubrir ni exigió ningún cambio arquitectónico.

## Known Stubs

Ninguno. Este plan es contenido + esquema; no introduce componentes con datos sin conectar.

## Threat Flags

Ninguno. Los cambios de este plan caen exactamente dentro de las mitigaciones ya registradas en el `threat_model` del plan (T-02-02 gate D-37, T-02-03 `zod` confinado a `engine/schema.ts`, T-02-05 `contentVersion` a 7): no se introduce superficie nueva (sin endpoints, sin rutas de auth, sin cambios de esquema en fronteras de confianza fuera de lo ya registrado).

## Self-Check: PASSED

- `content/marvel-champions.json` — FOUND
- `engine/schema.ts` — FOUND
- `engine/__tests__/schema.test.ts` — FOUND
- `engine/__tests__/navigator.test.ts` — FOUND
- `engine/__tests__/content.test.ts` — FOUND
- `engine/__tests__/toc.test.ts` — FOUND
- Commit `e7b4f94` (test: tests en rojo) — FOUND en `git log`
- Commit `5be7835` (feat: sección ronda + gate D-37) — FOUND en `git log`
- Commit `bdbb2b7` (test: gates que muerden) — FOUND en `git log`
- `npx vitest run` — 82/82 en verde al cierre del plan
