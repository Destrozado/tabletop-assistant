---
phase: 09-hist-rico-y-estad-sticas
plan: 17
subsystem: persistencia/composables/motor — barrido exhaustivo de las tres fronteras (petición explícita del verificador)
tags: [gap-closure, barrido, wr-01, wr-06, prototype-pollution, hist-04, hist-06, requirements-sync]
dependency-graph:
  requires: ["09-13", "09-14", "09-15", "09-16"]
  provides:
    - "09-AUDIT-FRONTERAS.md: inventario de 54 funciones con veredicto explícito bajo tres preguntas"
    - "buildHistoryCardView normaliza heroId/heroName/playerName/playerCount/round/villainId en su propia frontera"
    - "formatEntryDuration sin '1 h 0 min', sin '0 min' y sin negativos"
    - "resolveHeroSpanishName/buildTakenByMap/buildDuplicateWarningText sin resolución por Object.prototype"
  affects:
    - "app/composables/useGameHistory.ts"
    - "engine/history.ts"
    - "app/composables/useHeroSearch.ts"
    - ".planning/REQUIREMENTS.md (HIST-04/HIST-06)"
    - ".planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md"
tech-stack:
  added: []
  patterns:
    - "barrido con inventario completo + veredicto explícito por función (OK/DEFECTO BF-xx/ACEPTADO) en vez de cerrar un hallazgo a la vez"
    - "tercera pregunta de auditoría, además de las dos del verificador: '¿puede el valor que devuelve esta función afirmar algo que no ha ocurrido?'"
key-files:
  created:
    - .planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-FRONTERAS.md
  modified:
    - app/composables/useGameHistory.ts
    - engine/history.ts
    - app/composables/useHeroSearch.ts
    - engine/__tests__/history.test.ts
    - app/composables/__tests__/useGameHistory.test.ts
    - app/composables/__tests__/useHeroSearch.test.ts
    - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
    - .planning/REQUIREMENTS.md
decisions:
  - "El barrido usa TRES preguntas, no las dos que pide el verificador: se añade 'puede el valor devuelto afirmar algo que no ha ocurrido' — es la pregunta que habría cazado, en rondas anteriores, un appendHistoryEntry devolviendo true sobre un histórico no escrito y un resume() devolviendo outcome:'resumed' sobre un context de relleno"
  - "buildTakenByMap/buildDuplicateWarningText (BF-05/BF-06) resultaron ser ALCANZABLES HOY en producción (heroId manipulado en localStorage llega sin filtrar contra el catálogo), no solo latentes como el resto de mapas de useHeroSearch.ts — severidad reevaluada al alza durante el barrido"
  - "IN-04/IN-05/IN-07/IN-11/IN-12/IN-13 y WR-02/WR-04/WR-05(b)/WR-07 se registran en deferred-items.md sin tocar código: arreglarlos cambiaría contratos públicos ya fijados por test o exige superficie de interfaz nueva, fuera del alcance mínimo de un cierre de huecos"
requirements-completed: [HIST-04, HIST-06]
metrics:
  duration: "~90 min"
  completed: "2026-09-13"
---

# Phase 09 Plan 17: Barrido exhaustivo de las tres fronteras — cierre del patrón recurrente de tres rondas Summary

Petición explícita y nominal del verificador tras tres rondas consecutivas encontrando el mismo
patrón (una frontera de validación se endurece por un lado y deja sin cubrir un caso adyacente
en el otro lado o en un módulo vecino): un barrido escrito, con inventario completo y veredicto
por función, de `usePersistedSession.ts` + `useGameHistory.ts` + `engine/history.ts` y sus
colaboradores directos (`useHeroSearch.ts`, `engine/statistics.ts`, `engine/selection.ts`),
cerrando de una vez todos los defectos que encuentre en ese perímetro en vez de un hallazgo por
ronda.

## What Was Built

**Task 1** — `.planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-FRONTERAS.md`: barrido
escrito de 54 funciones/miembros de los 6 ficheros del perímetro. Cada función recibe una fila
con tres preguntas contestadas (las dos del verificador — «¿qué pasa si esta operación falla a
medias?», «¿esta clave de objeto es un dato no confiable?» — más una tercera de este plan,
derivada de mirar las tres rondas juntas: «¿puede el valor que devuelve esta función afirmar
algo que no ha ocurrido?») y un veredicto único (`OK`/`DEFECTO BF-xx`/`ACEPTADO`). Recuento
final: 43 OK, 5 funciones con 6 identificadores `BF-xx` (`buildHistoryCardView` acumula dos), 6
`ACEPTADO` con motivo y puntero a `deferred-items.md`.

**Task 2** — cierre de los 6 `BF-xx` en los tres ficheros de producción donde viven:

- `app/composables/useGameHistory.ts` (`buildHistoryCardView`): **BF-01** normaliza
  `heroId`/`heroName`/`playerName` de cada hueco de jugador con el mismo predicado que
  `engine/statistics.ts:98` usa (WR-01) — un hueco con `heroId: undefined` ya no pinta
  «Ana · undefined». **BF-02** aplica la misma disciplina de defensa en profundidad a
  `playerCount`/`round` (repliegue a `players.length`/`1`, mismo criterio que
  `buildHistoryEntry` desde 09-12) y a `villainId`/`villainName` (solo se aceptan si son
  realmente `string`).
- `engine/history.ts` (`formatEntryDuration`): **BF-03** (WR-06) — «—» también para
  negativos, mínimo «1 min» (nunca «0 min»), y «N h» sin el minuto redundante cuando la
  duración es un múltiplo exacto de hora.
- `app/composables/useHeroSearch.ts`: **BF-04** `resolveHeroSpanishName` usa
  `Object.hasOwn` antes de leer `spanishHeroAliases` (dejaba de lanzar con una clave de
  `Object.prototype`, hoy latente). **BF-05**/**BF-06** `buildTakenByMap` y
  `buildDuplicateWarningText` construyen sus mapas internos con `Object.create(null)` — el
  barrido confirmó que este vector es **alcanzable hoy en producción**, no solo latente: un
  `heroId` editado a `'constructor'` en `localStorage` llega sin filtrar contra el catálogo
  hasta estos dos mapas (a través de `resolvePlayerSlots`, que solo exige «cadena no vacía») y
  antes de este plan hacía `TypeError` al abrir el selector de héroe de otro jugador.

**Task 3** — 21 tests nuevos de regresión (uno o más por cada `BF-xx`), registro de lo
aplazado en `deferred-items.md` (WR-02, WR-04, WR-05(b), WR-07, IN-04/05/07/11/12/13) y
sincronización manual de las filas HIST-04/HIST-06 en `REQUIREMENTS.md` con los planes
09-13..09-17 y una nota explicando qué cerró cada ronda y qué queda fuera (WR-02).

## Verification Results

- `npx vitest run`: **27 ficheros, 785 tests, código 0** (línea base tras 09-16: 745; +40 tests
  — 21 de comportamiento nuevo listados en las acceptance criteria de la Task 3, más los
  `it.each` de las 8 claves de `Object.prototype` que se expanden en varios `it` cada uno).
- `npm run build`: código 0, verificado tres veces (tras Task 2, tras Task 3, y en la
  restauración final de la prueba anti-tautología).
- `grep -v '^ *//' engine/history.ts | grep -c "durationMs < 0"` → 1.
- `grep -v '^ *//' app/composables/useHeroSearch.ts | grep -c "Object.create(null)"` → 4.
- `grep -c "BF-"` sobre los tres ficheros de producción → 3+1+5 = 9 identificadores citados en
  comentario (más que los 6 `BF-xx` porque BF-01/BF-02 y BF-05/BF-06 se citan varias veces en
  el mismo bloque de comentario contiguo).
- `grep -ric "firestore|firebase" app/ engine/` → 0 en todos los ficheros — SC5/STAT-04
  siguen triviales, Fase 10 no se adelanta.
- `grep -rn "TODO|FIXME|HACK|XXX|TBD" app/composables/ engine/ | grep -v __tests__` → solo
  falsos positivos preexistentes de la palabra «TODOS» en comentarios ajenos a este plan
  (`useStepShortcuts.ts:127`, `engine/header.ts:39`, `engine/selection.ts:7`, etc.) — ninguno
  introducido por este plan.
- **Prueba anti-tautología** (sustituyendo `git stash`, prohibido en modo worktree — ver
  Deviations): con los 4 ficheros de producción sobrescritos temporalmente al contenido del
  commit previo a la Task 2 (`git show 4469f70:<path> > <path>`), `npx vitest run` dio **34
  tests fallidos** en los tres ficheros de test tocados por la Task 3, confirmando que los
  tests nuevos dependen genuinamente del fix. Restaurado con `git checkout -- <4 ficheros>`,
  la suite completa volvió a 27/785 en verde.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Entorno de worktree sin `node_modules`/`.nuxt`**
- **Encontrado durante:** primer intento de `npx vitest run`.
- **Problema:** mismo patrón ya documentado en `09-14-SUMMARY.md`/`09-16-SUMMARY.md` — el
  worktree se creó sin `node_modules` operativo ni `.nuxt/tsconfig.app.json`.
- **Fix:** copia física (`cp -R`, no symlink) de `node_modules` desde el repo principal
  (mismos ficheros, ningún `npm install` nuevo) y `npx nuxi prepare` para regenerar `.nuxt/`.
- **Ficheros afectados:** ninguno del repositorio — solo el árbol de trabajo del worktree,
  todo ignorado por `.gitignore`.
- **Commit:** N/A (cambio de entorno local).

### Ajuste durante la escritura de un test (Task 3, no es una desviación del plan)

Al escribir el test «un hueco con `heroId: 7` (tipo equivocado)» para BF-01/BF-02, mi primera
expectativa asumía que la tarjeta seguiría pintando `playerLines` con la etiqueta del jugador
(como en el caso «hueco sin héroe» de WR-01). Pero con `heroId: 7` normalizado a `null` y sin
villano en la misma entrada, la función entra por la rama D-12 («nada elegido») en vez de la
rama «hay héroe/villano parcial»: `playerLines` es `null` y `noSelectionLine` es la cadena fija
«Sin héroes ni villano anotados». Corregido el test para afirmar exactamente ese
comportamiento (que es el correcto: un `heroId` de tipo inválido en la ÚNICA entrada de
`players` deja la partida sin ningún héroe legítimamente elegido) antes de comprometer la
tarea — verificado ejecutando la suite tras el ajuste.

### Nota sobre la prueba anti-tautología (aclaración, no desviación)

El plan pide `git stash push -- <4 ficheros>` / `npx vitest run` / `git stash pop`. **`git
stash` está prohibido en modo worktree** (`refs/stash` es compartido entre el checkout
principal y todos los worktrees enlazados — un `pop` posterior podría aplicar WIP de una
sesión de otro worktree, #3542). Sustituido por el equivalente funcional exacto sin tocar
ninguna referencia compartida: `git show <commit previo a la Task 2>:<path>` sobrescribe cada
uno de los 4 ficheros de producción con su contenido anterior al fix, se ejecuta la suite
(34 tests fallidos, confirmando la dependencia real), y `git checkout -- <4 ficheros>` restaura
el estado commiteado (confirmado con `git status --short` sin diferencias tras la
restauración). El resultado observable es idéntico al que pedía el plan.

## Known Stubs

Ninguno. Este plan no introduce ninguna pantalla ni flujo nuevo — corrige funciones puras ya
existentes y añade tests de regresión.

## Threat Flags

Ninguno nuevo. Los ocho hallazgos de amenaza del `<threat_model>` del propio plan
(T-09-17-01 a T-09-17-08, más T-09-17-SC) ya estaban registrados con sus disposiciones antes
de ejecutar. T-09-17-01 (el patrón de las tres rondas) y T-09-17-02 (contaminación por cadena
de prototipos) quedan cerrados por las Tasks 1-3; T-09-17-03/04 (WR-01/WR-06) igual;
T-09-17-05/06 (WR-02/IN-04) quedan `transfer` — registrados en `deferred-items.md`, tal como
sus propias filas de disposición ya anticipaban. Ningún paquete instalado.

## Self-Check: PASSED

- `.planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-FRONTERAS.md` — FOUND (343 líneas)
- `app/composables/useGameHistory.ts` — FOUND (modificado, commit fb097c6)
- `engine/history.ts` — FOUND (modificado, commit fb097c6)
- `app/composables/useHeroSearch.ts` — FOUND (modificado, commit fb097c6)
- `engine/__tests__/history.test.ts` — FOUND (modificado, commit 8eda6e7)
- `app/composables/__tests__/useGameHistory.test.ts` — FOUND (modificado, commit 8eda6e7)
- `app/composables/__tests__/useHeroSearch.test.ts` — FOUND (modificado, commit 8eda6e7)
- `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` — FOUND (modificado, commit 8eda6e7)
- `.planning/REQUIREMENTS.md` — FOUND (modificado, commit 8eda6e7)
- Commit `4469f70` (Task 1) — FOUND en `git log --oneline`
- Commit `fb097c6` (Task 2) — FOUND en `git log --oneline`
- Commit `8eda6e7` (Task 3) — FOUND en `git log --oneline`
