---
phase: 09-hist-rico-y-estad-sticas
plan: 15
subsystem: engine/persistence
tags: [resume, isValidContext, WR-03, gap-closure]
requires: ["09-12"]
provides:
  - "resume() con guarda única de context que degrada a outcome:'fresh'"
  - "isValidContext endurecido por rango (Number.isInteger, >0) y por valor ('normal'|'expert')"
affects:
  - "app/pages/[game]/index.vue (consumidor de ResumeOutcome, NO modificado en este plan)"
tech-stack:
  added: []
  patterns:
    - "Un único criterio de validación de context al principio de resume(), antes de formatVersion/contentVersion/runtimeId"
key-files:
  created: []
  modified:
    - engine/persistence.ts
    - engine/__tests__/persistence.test.ts
decisions:
  - "Endurecer isValidContext (descartado en 09-12) porque ahora el reinicio ante context inválido es EXPLÍCITO (outcome:'fresh', mini-setup vuelve a preguntar) en vez de SILENCIOSO (outcome:'resumed' con relleno) — la objeción original ya no aplica"
  - "El criterio de qué context puede entrar en la sesión viva vive en UN solo sitio (la guarda nueva en resume()); contentChangedFallback conserva su propia comprobación como defensa en profundidad, documentada como inalcanzable por construcción desde resume()"
metrics:
  duration: "~20min"
  completed: 2026-09-13
---

# Phase 09 Plan 15: Guarda única de context en resume() — degradación honesta a 'fresh' Summary

Un `context` persistido que no supera `isValidContext` (`{}`, `null`, `[]`, `playerCount` no
entero/no positivo, `difficulty` distinta de `'normal'`/`'expert'`) ya no se reanuda con la
etiqueta `'resumed'` adoptando en silencio el relleno de la página — `resume()` degrada
explícitamente a `outcome: 'fresh'`, y el mini-setup vuelve a preguntar nº de jugadores y
dificultad.

## What Was Built

**`engine/persistence.ts`:**
1. `isValidContext` pasó de validar por `typeof` (`playerCount` cualquier `number`, `difficulty`
   cualquier `string`) a validar por rango y por valor: `Number.isInteger(playerCount) &&
   playerCount > 0` (mismo criterio que `resolvePlayerSlots`/`emptySelection` en
   `engine/selection.ts`) y `difficulty === 'normal' || difficulty === 'expert'` (las dos únicas
   que `isGameHistoryEntry` acepta al escribir en el histórico).
2. Guarda única al principio de `resume()`, inmediatamente después de la comprobación
   `persisted === null` y ANTES de `formatVersion`/`contentVersion`/`runtimeId`: si
   `!isValidContext(persisted.context)`, devuelve `{ session: fresh, outcome: 'fresh' }`.
3. La rama `resumed` (el `return` final) ya no revalida `context` — lo adopta tal cual
   (`persisted.context`), porque llegar hasta ahí ya implica que la guarda de arriba lo aceptó.
   El comentario documenta explícitamente que el criterio vive en un único sitio.
4. `contentChangedFallback` conserva su propia comprobación de `isValidContext` como defensa en
   profundidad (inalcanzable DESDE `resume()` tras la guarda nueva, pero protege ante un llamador
   futuro que la invoque directamente).

**`engine/__tests__/persistence.test.ts`:**
- Los dos tests que fijaban el comportamiento antiguo (`context` ausente y `context: {}`)
  actualizados: la expectativa pasa de `'content-changed'`/`'resumed'` a `'fresh'`, con comentario
  explicando el cambio y cita a WR-03.
- Nuevo `describe` «WR-03 (ronda 3): un context que no se puede validar no es una partida
  reanudable» con 5 `it`: `playerCount: NaN`, `playerCount` fuera de rango (0, 2.5), `difficulty`
  inválida (string y numérica), `context: null`/`context: []`, y un anti-regresión que recorre
  las 8 combinaciones legítimas de `playerCount` (1-4) × `difficulty` (`normal`/`expert`)
  confirmando `'resumed'` con el context intacto.
- D-20 y D-21 (reanudación de sesiones de versiones anteriores) verificados en verde SIN editarlos.

## Verification Performed

- `npx vitest run` (suite completa): **686 tests pasados**, 0 fallos.
- `npx vitest run engine/__tests__/persistence.test.ts -t "D-20"` y `-t "D-21"`: ambos en verde.
- `grep -ric "firestore|firebase" app/ engine/`: 0 en todos los ficheros — SC5/STAT-04 intactos.
- `npm run build`: `✨ Build complete!` sin errores.
- **Prueba anti-tautología** (adaptada: el worktree prohíbe `git stash` por el riesgo de
  contaminar `refs/stash` compartido entre worktrees — ver Deviations): se sobrescribió
  temporalmente `engine/persistence.ts` con `git show HEAD~1:engine/persistence.ts` (la versión
  previa al fix de la Task 1), se ejecutó `npx vitest run engine/__tests__/persistence.test.ts`
  y **6 tests fallaron** contra el código previo (los 2 actualizados + 4 de los 5 nuevos; el 5º,
  el anti-regresión del camino feliz, sigue en verde porque prueba lo que ya funcionaba antes).
  Se restauró el fix con `git checkout -- engine/persistence.ts` y se reconfirmó verde.

**Verificación humana recomendada (no bloqueante, según el plan):** no ejecutada en este pase —
requiere abrir la app en dispositivo con una partida en curso y editar `localStorage` en
DevTools. Queda pendiente, igual que el resto de la deuda de dispositivo real ya documentada en
`PROJECT.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/` no generado antes de poder correr Vitest**
- **Found during:** primer intento de `npx vitest run engine/__tests__/persistence.test.ts`
- **Issue:** `Tsconfig not found` — `.nuxt/tsconfig.app.json` no existía en el worktree recién
  creado (directorio gitignorado, no committeado).
- **Fix:** `npx nuxi prepare` para regenerar `.nuxt/` antes de ejecutar los tests.
- **Files modified:** ninguno (solo genera artefactos ignorados por git).
- **Commit:** N/A (no versionado).

**2. [Rule 3 - Blocking issue / seguridad del worktree] Prueba anti-tautología sin `git stash`**
- **Found during:** Task 2, al intentar `git stash push -- engine/persistence.ts` tal como pedía
  la acción del plan.
- **Issue:** el fix de la Task 1 ya estaba COMMITTEADO en ese punto (commit `0507333`), así que
  `git stash push` devolvió «No local changes to save» — no hay nada que stashear porque el
  cambio no es un working-tree diff, es un commit. Además, las instrucciones de este ejecutor
  prohíben `git stash` de forma absoluta dentro de un worktree (refs/stash es compartido entre
  todos los worktrees del repo; un `pop` posterior podría aplicar WIP de un worktree hermano).
- **Fix:** en vez de stash, se usó `git show HEAD~1:engine/persistence.ts > engine/persistence.ts`
  (sobrescritura temporal desde un ref de solo lectura) para materializar la versión previa al
  fix, se corrieron los tests, y se restauró con `git checkout -- engine/persistence.ts`
  (checkout de un fichero específico, explícitamente permitido). Mismo resultado que pedía el
  plan — confirmar que los tests nuevos/actualizados fallan contra el código viejo — sin tocar
  `refs/stash`.
- **Files modified:** `engine/persistence.ts` (sobrescrito y restaurado en el mismo turno, sin
  commit intermedio).
- **Commit:** N/A (operación de verificación, no de cambio de código).

### Discrepancias de las acceptance criteria numéricas (no auto-fixables, documentadas)

El plan fija dos umbrales exactos en las acceptance criteria de la Task 2 que asumen un estado
del fichero de test distinto al que realmente existía en el repo al empezar a ejecutar este plan:

1. **«21 `it(` antes de este plan … debe devolver al menos 26»**: el recuento real de `it(` en
   `engine/__tests__/persistence.test.ts` ANTES de este plan era **16**, no 21 (verificado con
   `git show HEAD~1:... | grep -c "  it("`). Este plan añade exactamente los 5 `it` que la propia
   acción describe (uno por cada uno de los 5 puntos del `describe` nuevo, tal y como el texto de
   la Task 2 los enumera), dejando el fichero en **21** `it` totales — cumple al pie de la letra
   lo que la acción pide, pero no alcanza el umbral «al menos 26» porque ese umbral se calculó
   sobre una baseline equivocada.
2. **«`toBe('content-changed')` … exactamente 4»**: el recuento real es **3** (los tres casos
   legítimos de cambio de contenido que sí existen: `contentVersion` distinta, `runtimeId`
   inexistente, `formatVersion` distinto de 1). El texto del plan cita «formatVersion,
   contentVersion, runtimeId inexistente y el de `:66`» como si fueran cuatro casos distintos,
   pero `:66` ES el test de `contentVersion` — el mismo caso citado dos veces, no un cuarto caso
   independiente.

**No se han inventado tests ni assertions adicionales para forzar estos dos números**: hacerlo
habría sido inflar la cobertura de forma artificial para cuadrar con un recuento de origen
erróneo, en vez de cubrir un caso real no cubierto. Todas las demás acceptance criteria de la
Task 2 (comportamiento, D-20/D-21, `git diff` sin `it` eliminados, anti-tautología, `npm run
build`) se cumplen tal cual. Ningún caso de negocio queda sin test: los 5 sabores de `context`
inválido (`NaN`, fuera de rango, `difficulty` inválida, `null`/`[]`) y el anti-regresión de las 8
combinaciones legítimas están todos cubiertos.

## Known Stubs

Ninguno — este plan no introduce superficie de interfaz nueva.

## Self-Check: PASSED

- `engine/persistence.ts`: FOUND
- `engine/__tests__/persistence.test.ts`: FOUND
- Commit `0507333` (Task 1): FOUND en `git log --oneline`
- Commit `7a117cc` (Task 2): FOUND en `git log --oneline`
