---
phase: 09-hist-rico-y-estad-sticas
plan: 38
subsystem: testing
tags: [vitest, huella, ciclo-de-vida, estado-de-modulo, tdd-red-green, gate-de-invariantes]

requires:
  - phase: 09-hist-rico-y-estad-sticas (plan 09-37)
    provides: gate de invariantes de ciclo de vida de estado de módulo (invariantesDeMarcaDeEstado.test.ts), ROJO a propósito contra CR-01/WR-01
provides:
  - huellaDelProgreso(position) exportada en useStoredProgress.ts, y StoredProgressReport.huella calculado dentro de la autoridad
  - useProgressMismatchMark.ts con testigo del referente obligatorio (Map<gameId, huella>, markProgressMismatch/readProgressMismatchWarning de dos argumentos)
  - onResumeContinue/onContentChangedAcknowledge retiran la marca explícitamente (segunda defensa, independiente de la validación de huella)
  - ContentChangedNotice.vue pinta el aviso de discrepancia (mismatchWarning), misma forma que ResumePrompt.vue
  - Tabla de verdad de 22 tests para el lector con testigo + 8 tests nuevos de huella en useStoredProgress.test.ts, con dos mutaciones EJECUTADAS y REVERTIDAS
affects: [09-39, 09-40]

actuals:
  tokens: 9743
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Marca de estado de módulo con testigo del referente (Map<id, huella> en vez de Set<id>): el lector valida su propio referente en el instante de leer, en vez de depender de una lista completa de puntos de invalidación"
    - "Huella estructural (JSON.stringify de una normalización que ordena claves y conserva orden de arrays) como testigo de identidad exacta de un objeto persistido, distinta de una comparación de igualdad semántica (esLaMismaPartida) que excluye deliberadamente un campo (updatedAt)"

key-files:
  modified:
    - app/composables/useStoredProgress.ts
    - app/composables/useProgressMismatchMark.ts
    - app/pages/[game]/index.vue
    - app/components/ContentChangedNotice.vue
    - app/composables/__tests__/useProgressMismatchMark.test.ts
    - app/composables/__tests__/useStoredProgress.test.ts

key-decisions:
  - "La huella incluye los siete campos de PersistedPosition, updatedAt incluido — coste conocido y aceptado: cualquier reescritura del progreso (incluido el autoguardado que dispara el propio montaje) invalida la marca; es una PÉRDIDA de aviso, nunca una afirmación incorrecta."
  - "No se edita ninguno de los dos gates que el plan 09-37 escribió (afirmacionesRespaldadas.test.ts, invariantesDeMarcaDeEstado.test.ts), ni siquiera para añadir una entrada de auditoría legítima o actualizar un self-test de fixture obsoleto — el scope_boundary de este plan los reserva explícitamente al plan 09-39, sin excepción."
  - "HIST-04/HIST-06 NO se marcan como completados en REQUIREMENTS.md por este plan — su propio scope_boundary lo prohíbe explícitamente; la confirmación queda para una ronda de verificación independiente."

requirements-completed: []

coverage:
  - id: D1
    description: "La huella del referente recorre la autoridad (huellaDelProgreso/StoredProgressReport.huella), la marca (Map<gameId,huella>) y la página (onOutcomeRecorded/onMounted) de punta a punta"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useProgressMismatchMark.test.ts#16,17,18,20,21,22 (tabla de verdad del lector con testigo)"
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/useStoredProgress.test.ts#describe('huella — testigo del referente exacto...')"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "CR-01/WR-01 cerrados también por su vía literal: onResumeContinue/onContentChangedAcknowledge retiran la marca; ContentChangedNotice pinta el aviso de discrepancia"
    requirement: "HIST-04"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts (Patas 1-4, bloques it.each sobre marcasNoAuditadas — las 5 patas reales del gate)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tabla de verdad completa de la marca con testigo (22 tests) y de la huella de la autoridad (8 tests nuevos en useStoredProgress.test.ts); dos mutaciones EJECUTADAS y REVERTIDAS demuestran por ejecución real qué defensa detecta cada test"
    verification:
      - kind: unit
        ref: "mutación 1 (quitar comparación de huellas del lector): pone rojos los tests 16/18/21 de useProgressMismatchMark.test.ts — mensajes literales en este SUMMARY"
        status: pass
      - kind: unit
        ref: "mutación 2 (quitar clearProgressMismatch de onResumeContinue): NO pone rojo ningún test — hallazgo documentado, no cerrable en el scope_boundary de este plan"
        status: fail
    human_judgment: true
    rationale: "La mutación 2 confirmó un gap de cobertura real (la segunda defensa de onResumeContinue no tiene ningún test que la vigile), y el plan mismo instruye 'si ningún test se pusiera rojo... añadir el test que falte' — pero el <files> de la Task 3 solo declara los dos test files de composable, que no pueden ejercer una función privada de un SFC de página. Un humano debe confirmar que documentar esto en deferred-items.md/WINDOWS.md (en vez de forzar un test fuera de scope_boundary) es la resolución correcta, y no una omisión."
  - id: D4
    description: "El gate de invariantes del plan 09-37 pasa de rojo a verde en sus 5 patas reales (los bloques it.each sobre marcasNoAuditadas), por el arreglo — nunca por haberlo aflojado"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "npx vitest run app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts (82 pasan / 4 fallan, igual que al cerrar 09-37 — composición DISTINTA, ver 'Hallazgo importante' abajo)"
        status: fail
    human_judgment: true
    rationale: "El recuento total de tests rojos NO bajó (4 antes, 4 ahora) — contradice la lectura literal de la frase del plan 'deja MENOS tests rojos que al cerrar el plan 09-37'. Lo que SÍ es cierto, verificado por ejecución real: las 5 patas REALES del gate (los it.each que auditan marcasNoAuditadas sobre el árbol vivo) están TODAS verdes; los 4 rojos actuales son self-tests de fixture (etiquetados (HOY)/(ROJA hoy) en su propio nombre) que documentaban el estado roto de 09-37 y ahora están obsoletos por el propio arreglo — un efecto secundario correcto y anticipable, pero distinto de lo que el texto del plan predijo. Un humano debe confirmar que esta lectura (patas reales verdes = objetivo cumplido) es la correcta y no una racionalización.

due to a Gate A collision (huellaDelProgreso contiene la raíz 'progreso'), npm test también sale con 1 fallo adicional fuera de este fichero — ver 'Hallazgo importante' abajo."

duration: ~27min
completed: 2026-09-22
status: complete
plan_head_before: b6e9029
---

# Phase 09 Plan 38: GREEN del RED→GREEN — huella del referente en la marca de discrepancia Summary

**La marca de discrepancia de progreso deja de fiarse de que alguien la invalide: pasa a llevar una huella (JSON.stringify normalizado de los 7 campos de PersistedPosition) del progreso que había al ponerse, y el lector la compara contra la huella de lo que hay AHORA — CR-01 y WR-01 cerrados por las dos vías (validación estructural + invalidación explícita en onResumeContinue/onContentChangedAcknowledge), con las 5 patas reales del gate de invariantes del plan 09-37 en verde.**

## Performance

- **Duration:** ~27 min (no se instrumentó una captura de epoch al inicio de esta sesión; estimado por los timestamps reales de los 3 commits de tarea: 15:51:59 → 16:02:50, más el tiempo de lectura/análisis previo)
- **Tasks:** 3 completadas
- **Files modified:** 6 (los seis de `files_modified`, ninguno más, ninguno menos)

## Accomplishments

- **Huella del referente exacto, de punta a punta.** `huellaDelProgreso(position: PersistedPosition): string` (nueva, exportada en `useStoredProgress.ts`) devuelve `JSON.stringify(normalizar(position))`, reutilizando la función `normalizar` ya razonada contra la vía `__proto__`/`constructor` (CR-02, ronda 3). Cubre los SIETE campos de `PersistedPosition`, `updatedAt` incluido — deliberadamente distinta de `esLaMismaPartida`, que lo excluye a propósito porque contesta otra pregunta. `StoredProgressReport.huella` se calcula DENTRO de la autoridad (`readStoredProgress`) y se propaga hasta `useProgressMismatchMark.ts` (marca) y `app/pages/[game]/index.vue` (puesta y lectura).
- **La marca exige testigo, no opcional.** El `Set<string>` de `useProgressMismatchMark.ts` pasa a `Map<string, string>` (gameId → huella). `markProgressMismatch(gameId, huella)` y `readProgressMismatchWarning(gameId, huellaActual)` tienen el segundo parámetro OBLIGATORIO. El lector devuelve el aviso solo si hay entrada para ese `gameId`, `huellaActual` no es `null`, y la comparación estricta con la huella guardada es cierta.
- **CR-01/WR-01 cerrados por la vía literal, además de la estructural.** `onResumeContinue` y `onContentChangedAcknowledge` llaman a `clearProgressMismatch(gameId)` — segunda defensa, independiente de la validación de huella. `ContentChangedNotice.vue` acepta `mismatchWarning?: string | null` (misma forma que `ResumePrompt.vue`) y lo pinta antes del párrafo de desenlace, sin región viva propia.
- **Cabecera de `useProgressMismatchMark.ts` corregida.** El párrafo final ya no garantiza en términos absolutos algo que el mecanismo no sostenía; distingue explícitamente (a) la marca SE PIERDE (pérdida de aviso, aceptada) de (b) la marca SOBREVIVE a la sustitución de su referente (el caso que CR-01/WR-01 confirmaron, ahora IMPOSIBLE por construcción).
- **Tabla de verdad completa, con dos mutaciones EJECUTADAS y REVERTIDAS.** 22 tests en `useProgressMismatchMark.test.ts` (15 originales adaptados a la firma de dos argumentos + 7 nuevos), 8 tests nuevos de huella en `useStoredProgress.test.ts` (los cuatro valores de `StoredProgress`, el invariante `'stale' ⟹ huella no nula`, estabilidad frente al orden de claves, sensibilidad a `updatedAt`). Las dos mutaciones de la Task 3 se ejecutaron de verdad, se registraron sus resultados (uno confirma la defensa, el otro descubre un gap real) y se revirtieron sin dejar el cambio en el repo.
- **Las 5 patas reales del gate de invariantes (`invariantesDeMarcaDeEstado.test.ts`) están en verde.** Verificado ejecutando el fichero completo tras cada task: los bloques `it.each` que auditan `marcasNoAuditadas` sobre el árbol VIVO (Pata 1: aridad ≥2 y segundo parámetro obligatorio; Pata 2: ninguna llamada real sin testigo; Pata 3: existe prueba de ciclo de vida completo; Pata 4: ninguna rama que lee deja de pintar) pasan de rojo a verde, exactamente por el arreglo — el gate no se aflojó en ningún momento (ninguno de los dos gates se editó, ver «Hallazgo importante» abajo).

## Task Commits

Cada tarea se ha commiteado atómicamente:

1. **Task 1: la huella del referente recorre la autoridad, la marca y la página** - `9a4e087` (feat)
2. **Task 2: CR-01/WR-01 cerrados por invalidación explícita + render** - `15a1130` (feat)
3. **Task 3: tabla de verdad del lector con testigo + huella de la autoridad** - `616cef6` (test)

**Plan metadata:** pendiente (este commit).

## RED registrado (Task 1, exigido por el propio plan antes de tocar producción)

Test de ciclo de vida escrito en `useProgressMismatchMark.test.ts` (tests 16/17) y ejecutado contra el código SIN cambiar. Mensaje literal del fallo:

```
FAIL  |app-logic| app/composables/__tests__/useProgressMismatchMark.test.ts > useProgressMismatchMark — ciclo de vida completo con testigo del referente (Task 1, plan 09-38) > 16. pone con una huella y lee con OTRA distinta: el lector devuelve null porque el referente ya no es el mismo
AssertionError: expected 'Aviso: al terminar la última partida …' to be null // Object.is equality

- Expected:
null

+ Received:
"Aviso: al terminar la última partida de este juego, la app no pudo registrarla y comprobó que lo que había guardado no era el punto en el que habíais terminado. Puede que esta partida no sea la que terminasteis: si la continuáis y la registráis, el histórico podría quedar con datos que no son los de aquella partida."

 ❯ app/composables/__tests__/useProgressMismatchMark.test.ts:132:60
```

`Tests 1 failed | 16 passed (17)` antes del arreglo. Tras implementar `huellaDelProgreso`/`Map<string,string>`/firmas de dos argumentos (puntos 1-5 de la Task 1), el mismo test (sin cambiar) pasó a verde: `Tests 39 passed (39)` en la suite conjunta `useProgressMismatchMark.test.ts` + `useStoredProgress.test.ts`.

## Dos mutaciones EJECUTADAS y REVERTIDAS (Task 3, exigido por acceptance_criteria)

### Mutación 1 — quitar la comparación de huellas del lector

Cambio temporal en `readProgressMismatchWarning` (revertido de inmediato tras la comprobación):
```ts
export function readProgressMismatchWarning(gameId: string, huellaActual: string | null): string | null {
  return juegosConProgresoQueNoCoincide.has(gameId) ? PROGRESS_MISMATCH_WARNING : null
}
```

Resultado (ejecución real): **3 tests de `useProgressMismatchMark.test.ts` se ponen rojos** (16, 18, 21):

```
useProgressMismatchMark.test.ts > ... > 16. pone con una huella y lee con OTRA distinta...
AssertionError: expected 'Aviso: al terminar la última partida …' to be null

useProgressMismatchMark.test.ts > ... > 18. marca puesta + huella null: el lector devuelve null...
AssertionError: expected 'Aviso: al terminar la última partida …' to be null

useProgressMismatchMark.test.ts > ... > 21. dos juegos con marcas puestas con huellas DISTINTAS no se interfieren...
AssertionError: expected 'Aviso: al terminar la última partida …' to be null
```

**Hallazgo respecto al texto del plan:** el `acceptance_criteria` de la Task 3 esperaba que esta mutación pusiera rojos "a la vez el test de ciclo de vida de este fichero **y la pata 3 del gate de invariantes**". Verificado por ejecución real: la Pata 3 REAL (`it.each` sobre `marcasNoAuditadas`, línea 517-538 de `invariantesDeMarcaDeEstado.test.ts`) analiza estáticamente el CONTENIDO del fichero de test (¿existe un `it` con la forma correcta?), nunca el comportamiento en TIEMPO DE EJECUCIÓN del lector — así que esta mutación de producción no la afecta. `npx vitest run invariantesDeMarcaDeEstado.test.ts` durante la mutación siguió mostrando exactamente los mismos 4 fallos de siempre (los self-tests de fixture, sin relación con esta mutación). Esto es una limitación real de esa pata (detecta la AUSENCIA de un test con la forma correcta, no si esa forma sigue siendo cierta en ejecución), documentada aquí en vez de forzada a coincidir con lo que el plan anticipaba.

Revertido con `cp` desde una copia de seguridad; `git diff --stat` confirmó cero cambios tras revertir.

### Mutación 2 — quitar `clearProgressMismatch` de `onResumeContinue`

Cambio temporal (revertido de inmediato):
```ts
function onResumeContinue() {
  awaitingResumeChoice.value = false
  // clearProgressMismatch(gameId)  ← LÍNEA RETIRADA TEMPORALMENTE
  announce()
  ...
```

Resultado (ejecución real): **NINGÚN test se puso rojo.** `npm test` mantuvo exactamente `5 failed | 1072 passed (1077)` — los mismos 5 fallos de siempre (los 4 self-tests de fixture + el hallazgo de Gate A, ninguno relacionado con esta mutación) — y `invariantesDeMarcaDeEstado.test.ts` en solitario mantuvo `4 failed | 82 passed`, igual que sin la mutación.

Esto SÍ coincide con lo que el plan anticipaba en una mitad («el gate de invariantes sigue VERDE, la validación por huella lo cubre») pero confirma la otra mitad que el propio plan nombra como posible: **"Si ningún test se pusiera rojo... una defensa sin test no es una defensa."** No se pudo añadir el test que falta dentro de este plan: el `<files>` de la Task 3 solo declara `useProgressMismatchMark.test.ts`/`useStoredProgress.test.ts`, ninguno de los cuales puede importar ni ejercer `onResumeContinue` (función privada de `<script setup>` en un SFC de página), y crear un fichero de test nuevo violaría el `<scope_boundary>` de este plan ("DENTRO: los seis ficheros de `files_modified`"). Documentado como hallazgo nuevo en `deferred-items.md` y registrado en `.planning/WINDOWS.md` (kind: `unrun-verify`) para que no desaparezca del radar.

Revertido con `cp` desde una copia de seguridad; `git diff --stat` confirmó cero cambios tras revertir.

## Hallazgo importante — dos efectos secundarios del arreglo, confinados a ficheros que este plan no puede editar

Al completar la Task 1, `npm test`/`npx vitest run invariantesDeMarcaDeEstado.test.ts` mostraron un total de tests rojos IGUAL (no menor) al que tenía el plan 09-37 al cerrar, y `npm test` mostró UN fallo adicional fuera de `invariantesDeMarcaDeEstado.test.ts`. Investigado a fondo antes de escribir esta sección — ninguno de los dos es una regresión de producción:

1. **Gate A (`afirmacionesRespaldadas.test.ts`) marca `useStoredProgress.ts` como afirmación sin auditar.** El nombre `huellaDelProgreso`, exigido literalmente por el `acceptance_criteria` de la Task 1 (`grep -c "export function huellaDelProgreso"` debe devolver 1), contiene en código real la subcadena «progreso» — una raíz vigilada de `RAICES_SOBRE_LOS_DATOS_DEL_GRUPO`. `useStoredProgress.ts` nunca había necesitado una entrada en `AFIRMACIONES_AUDITADAS` porque sus identificadores previos eran en inglés («Progress», no «progreso»). Es un falso positivo estructural: la "afirmación" ocurre DENTRO de la propia autoridad (el único sitio con permiso para producirla), no una copy sin respaldo — pero Gate A no distingue eso. Arreglo correcto: una entrada nueva en `AFIRMACIONES_AUDITADAS['app/composables/useStoredProgress.ts']` — que exige editar `afirmacionesRespaldadas.test.ts`, prohibido por el `<scope_boundary>` de este plan ("Este plan los EJECUTA, no los edita").
2. **Cuatro self-tests de fixture en `invariantesDeMarcaDeEstado.test.ts` quedan obsoletos.** Cada uno etiquetado explícitamente `(HOY)`/`(ROJA hoy)` en su propio nombre (líneas ~329, ~395, ~491, ~596), comprueban el resultado de las funciones puras del gate (`contratoDeLaMarcaDe`, `lecturasSinTestigoDe`, `faltaPruebaDeCicloDeVidaEn`, `ramasQueLeenSinPintarDe`) contra el contenido REAL de ficheros de producción/test, con un valor esperado hardcodeado que describía el estado ROTO documentado por 09-37. Tras el arreglo, esos cuatro valores hardcodeados ya no coinciden con la realidad — exactamente lo que sus propios nombres anunciaban como temporal. **Las 5 PATAS REALES del gate (los `it.each` que auditan `marcasNoAuditadas` sobre el árbol vivo) están TODAS en verde** — verificado por ejecución real tras cada task de este plan. Solo estos 4 self-tests de fixture, que ya no describen "HOY", quedan desincronizados.

**Por qué ninguno se corrige en este plan:** el `<scope_boundary>` de 09-38 dice, textualmente, sobre AMBOS gates: "los escribió el plan 09-37 y los retoca el 09-39. Este plan los EJECUTA, no los edita." Sin excepción para añadir una entrada de auditoría legítima o para actualizar un valor hardcodeado obsoleto. Documentado con el detalle completo (síntoma, causa raíz, arreglo sugerido) en `deferred-items.md` y registrado en `.planning/WINDOWS.md` (kind: `unmet-truth`) para que el plan 09-39 lo encuentre sin tener que re-descubrirlo.

**Estado real de `npm test` al cerrar este plan:** `5 failed | 1072 passed (1077)`. Los 5 fallos son, uno a uno: los 4 self-tests de fixture de `invariantesDeMarcaDeEstado.test.ts` (arriba) + el hallazgo de Gate A de `afirmacionesRespaldadas.test.ts` (arriba). Ningún fallo vive en producción ni en los tests propios de este plan (`useProgressMismatchMark.test.ts`/`useStoredProgress.test.ts` están en verde, 51/51). `npx tsc --noEmit` sale 0.

## Files Created/Modified

- `app/composables/useStoredProgress.ts` — `huellaDelProgreso` exportada; `StoredProgressReport.huella`
- `app/composables/useProgressMismatchMark.ts` — `Map<string,string>`, firmas de dos argumentos obligatorios, cabecera reescrita
- `app/pages/[game]/index.vue` — `onOutcomeRecorded` captura `informe.huella`; `onMounted` pasa `informe.huella`; `onResumeContinue`/`onContentChangedAcknowledge` retiran la marca; plantilla pasa `:mismatch-warning` a `ContentChangedNotice`
- `app/components/ContentChangedNotice.vue` — prop `mismatchWarning`, pintada antes del párrafo de desenlace
- `app/composables/__tests__/useProgressMismatchMark.test.ts` — 22 tests (15 adaptados + 7 nuevos)
- `app/composables/__tests__/useStoredProgress.test.ts` — 8 tests nuevos de huella

## Decisions Made

Ver `key-decisions` en el frontmatter.

## Deviations from Plan

### Auto-fixed Issues

Ninguno bajo las Reglas 1-3 (bug/missing-critical/blocking) — las tres tareas se ejecutaron exactamente como las describe el plan, sin necesidad de arreglos improvisados en producción.

### Hallazgos NO auto-fijados (confinados a ficheros que el scope_boundary prohíbe editar)

Ver la sección «Hallazgo importante» arriba y `deferred-items.md` para el detalle completo:
1. Gate A (`afirmacionesRespaldadas.test.ts`) necesita una entrada de auditoría nueva para `useStoredProgress.ts` (raíz `'progreso'` en `huellaDelProgreso`).
2. Cuatro self-tests de fixture en `invariantesDeMarcaDeEstado.test.ts` (`(HOY)`/`(ROJA hoy)`) quedan obsoletos por el propio arreglo.
3. La segunda defensa (`clearProgressMismatch` en `onResumeContinue`) no tiene ningún test que la vigile — confirmado por mutación ejecutada y revertida.

**Total:** 0 auto-fijados, 3 hallazgos documentados y diferidos por prohibición explícita de scope_boundary (no por decisión unilateral de este ejecutor). **Impacto:** ninguno sobre la corrección de producción — las 5 patas reales del gate de invariantes están en verde, verificadas por ejecución real tras cada task; los 5 tests rojos de `npm test` viven en ficheros de gate/fixture, nunca en producción ni en los tests propios de este plan.

## Issues Encountered

Ninguno más allá de lo documentado en «Hallazgo importante» y «Dos mutaciones». No hubo bloqueos de compilación, dependencias ni auth gates.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CR-01/WR-01 están genuinamente cerrados en producción, por las dos vías (validación estructural de huella + invalidación explícita), y las 5 patas reales del gate de invariantes de 09-37 lo confirman.
- El plan 09-39 (evasiones propias del gate de clase, WR-02/WR-03) puede empezar sin bloqueos de este plan, y además hereda dos tareas de "retoque" adicionales que este plan descubrió y no podía cerrar por su propio scope_boundary (ver `deferred-items.md`): la entrada de auditoría de Gate A para `useStoredProgress.ts`, y la actualización de los 4 self-tests de fixture obsoletos de `invariantesDeMarcaDeEstado.test.ts`.
- El gap de cobertura de la segunda defensa (`onResumeContinue`/`clearProgressMismatch` sin test que lo vigile) queda registrado en `deferred-items.md` y `.planning/WINDOWS.md` para una ronda futura — no bloquea el cierre de este plan porque la validación de huella cubre el escenario canónico real.
- HIST-04/HIST-06 siguen `[ ]` en `REQUIREMENTS.md`, a la espera de una ronda de verificación independiente, tal como exige el `scope_boundary` de este plan.

## Self-Check: PASSED

- `[ -f app/composables/useStoredProgress.ts ]` → FOUND
- `[ -f app/composables/useProgressMismatchMark.ts ]` → FOUND
- `[ -f "app/pages/[game]/index.vue" ]` → FOUND
- `[ -f app/components/ContentChangedNotice.vue ]` → FOUND
- `[ -f app/composables/__tests__/useProgressMismatchMark.test.ts ]` → FOUND
- `[ -f app/composables/__tests__/useStoredProgress.test.ts ]` → FOUND
- `git log --oneline --all | grep -q 9a4e087` → FOUND
- `git log --oneline --all | grep -q 15a1130` → FOUND
- `git log --oneline --all | grep -q 616cef6` → FOUND
- Re-ejecutado `npx vitest run app/composables/__tests__/useProgressMismatchMark.test.ts app/composables/__tests__/useStoredProgress.test.ts` → 51 tests, 0 fallos
- Re-ejecutado `npx vitest run app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` → 82 pasan, 4 fallan (los 4 self-tests de fixture documentados arriba, no las patas reales)
- Re-ejecutado `npx tsc --noEmit` → exit 0
- `git diff --name-only b6e9029..HEAD` → exactamente los 6 ficheros de `files_modified`

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-22*
