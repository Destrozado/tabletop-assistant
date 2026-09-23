---
phase: 09-hist-rico-y-estad-sticas
plan: 37
subsystem: testing
tags: [vitest, gate-de-clase, ciclo-de-vida, estado-de-modulo, tdd-red]

requires:
  - phase: 09-hist-rico-y-estad-sticas (planes 09-32..09-36)
    provides: useProgressMismatchMark.ts, useHistorySavedNotice.ts, el gate de clase afirmacionesRespaldadas.test.ts, y el hallazgo CR-01/WR-01 de 09-VERIFICATION.md ronda 8
provides:
  - Vocabulario compartido de afirmaciones (vocabularioDeAfirmaciones.ts): una sola implementación de raíces léxicas, regionVigilada y respaldoExiste, importada por los dos gates
  - Gate de invariantes de ciclo de vida de estado de módulo (invariantesDeMarcaDeEstado.test.ts): descubrimiento por glob + 5 patas, ROJO hoy contra CR-01/WR-01
  - Declaración de alcance mutua entre el gate de clase y el gate de invariantes, cada uno citando al otro por ruta y vigilado por un test
affects: [09-38, 09-39, 09-40]

actuals:
  tokens: 14400
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Gate de invariantes de ciclo de vida (glob + predicados sobre contenido de fichero, nunca lista tecleada) como complemento al gate de clase (texto contra respaldo)"
    - "Parser mínimo de balanceo de paréntesis/corchetes/llaves para contar argumentos de nivel superior sin split(',') — reutilizado en las 4 patas"

key-files:
  created:
    - app/composables/__tests__/vocabularioDeAfirmaciones.ts
    - app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts
  modified:
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts

key-decisions:
  - "El vocabulario de raíces léxicas y regionVigilada/respaldoExiste se MUEVEN (no se copian) a vocabularioDeAfirmaciones.ts, para que los dos gates compartan una sola implementación (cierre de T-09-37-02)."
  - "useHistorySavedNotice.ts entra en el descubrimiento de marcas de estado de módulo pero se audita en MARCAS_CON_REFERENTE_NO_PERSISTENTE con motivo comprobable: su aviso es transitorio y decidido fresco en cada pintado, a diferencia de useProgressMismatchMark.ts, que transporta un hecho en el tiempo."
  - "HIST-04/HIST-06 NO se marcan como completados en REQUIREMENTS.md por este plan: su propio scope_boundary lo prohíbe explícitamente ('No se escribe en ningún sitio que HIST-06 quede cerrado') — el gate construido aquí queda ROJO a propósito, y el arreglo (plan 09-38) es quien podría, en su momento, dejarlos listos para una ronda de verificación independiente."

requirements-completed: []

coverage:
  - id: D1
    description: "Vocabulario compartido de afirmaciones (raíces léxicas, regionVigilada, respaldoExiste) movido a un módulo único, importado por los dos gates sin copias"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Gate A/B/C/S (85→86 tests, todos en verde)"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gate de invariantes de ciclo de vida de estado de módulo (invariantesDeMarcaDeEstado.test.ts): descubrimiento por glob + 5 patas, con auto-verificación sintética por pata"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts (82/86 tests en verde; los 4 rojos son la comprobación real contra CR-01/WR-01, por diseño de este plan)"
        status: fail
    human_judgment: true
    rationale: "El plan exige DELIBERADAMENTE que 4 tests queden en rojo (comprobación real de CR-01/WR-01 contra el árbol sin arreglar) — 'status: fail' en la entrada de verificación automática es el resultado ESPERADO de este plan, no un defecto. Requiere juicio humano para confirmar que los 4 rojos son exactamente los enumerados abajo y ninguno más, y que el arreglo (plan 09-38) es la vía correcta — no algo que este SUMMARY pueda autocertificar."
  - id: D3
    description: "Los dos gates declaran por escrito su alcance y se citan mutuamente por ruta, con un test que vigila la cita en cada dirección"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Gate S — la cabecera declara por escrito su alcance y cita a invariantesDeMarcaDeEstado.test.ts"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-22
status: complete
plan_head_before: 4d854c295d9890993199d76a1858a1616292b4f6
---

# Phase 09 Plan 37: Gate de invariantes de ciclo de vida de estado de módulo Summary

**Nuevo gate ejecutable (`invariantesDeMarcaDeEstado.test.ts`, descubrimiento por glob + 5 patas) que audita el ciclo de vida de las marcas de estado de módulo — no texto — y queda ROJO hoy por CR-01 y WR-01, con los mensajes de fallo literales registrados; el vocabulario de raíces léxicas se unifica en `vocabularioDeAfirmaciones.ts`, compartido por los dos gates sin copias.**

## Performance

- **Duration:** ~25 min (no se instrumentó una captura de epoch al inicio de esta sesión; estimado por el trabajo real realizado)
- **Tasks:** 3 completadas
- **Files modified:** 3 (2 creados, 1 modificado)

## Accomplishments

- **Vocabulario compartido, sin copias.** `RAICES_SOBRE_LOS_DATOS_DEL_GRUPO`, `normalizarEspacios`, `contieneRaizSobreLosDatosDelGrupo`, `quitarComentarios`, `regionVigilada`, `rutaRelativa`, `ficherosVueDelArbol`/`ficherosTsDelArbol`/`ficherosEngineDelArbol` y `respaldoExiste` se MUEVEN de `afirmacionesRespaldadas.test.ts` a `vocabularioDeAfirmaciones.ts`. El gate de clase sigue en verde: **85 tests antes del movimiento, 86 después** (+1 por el nuevo test de Gate S que vigila la cita cruzada de Task 3) — ninguna comprobación cambió de sentido.
- **Descubrimiento por glob, nunca lista tecleada.** `marcasDeEstadoDeModuloDe(ficheros)` exige, para cada fichero, (a) una línea de estado de módulo mutable a columna 0 (`const X = new Set/Map(...)`, `const X = ref(...)`, `let X`) y (b) alguna raíz vigilada en `regionVigilada(contenido)`. Sobre `app/composables/` (sin `__tests__/`) devuelve exactamente `useHistorySavedNotice.ts` y `useProgressMismatchMark.ts`; `usePreloadedAudio.ts` (que también tiene estado de módulo, un `Map`) queda fuera correctamente, porque no contiene ninguna raíz.
- **Cinco patas, con auto-verificación sintética por pata:**
  1. `contratoDeLaMarcaDe(fuente)` clasifica ponedor/retirador/lector POR LO QUE HACEN (`.add`/`.set`, `.delete`, `.has`/`.get` + retorno no-void) — nunca por nombre.
  2. `lecturasSinTestigoDe(fuente, lector)` cuenta argumentos de nivel superior sin `split(',')`, para no confundir `lector(f(a, b))` con una llamada de dos argumentos.
  3. `faltaPruebaDeCicloDeVidaEn(fuenteDelTest, ponedor, lector)` trocea por `it(` y exige un bloque que ponga con un testigo y lea DESPUÉS con OTRO distinto esperando `null` — leer con el mismo testigo no cuenta (caso sintético negativo dedicado).
  4. `ramasQueLeenSinPintarDe(fuenteDelConsumidor, lector)` identifica el ref del aviso y las ramas de decisión de montaje (`===`, nunca un literal — `resumeResolved` queda fuera por diseño) y exige que cada rama pinte el binding en su segmento de plantilla.
  5. Cobertura del descubrimiento: no vacío, y toda marca descubierta o bien auditada (con motivo/respaldo comprobables) o bien sometida a las patas 1/2/4 — nunca huérfana.
- **ROJO hoy, con los mensajes literales registrados** (ver sección de abajo) — exactamente por CR-01 (pata 1 y 2) y WR-01 (patas 3 y 4), tal como exige el plan. Ningún otro fichero de la suite se ve afectado: `npm test` pasa de 1063 tests (todos en verde antes de este plan) a 1063 tests con 4 en rojo, los 4 nombrados abajo.
- **Alcance declarado por escrito y citado mutuamente.** `afirmacionesRespaldadas.test.ts` declara en su cabecera que audita texto-contra-respaldo y NO invariantes de ciclo de vida, citando a `invariantesDeMarcaDeEstado.test.ts`; un `it` nuevo de Gate S vigila esa cita por grep interno sobre su propio contenido (leído del glob, nunca de memoria). `invariantesDeMarcaDeEstado.test.ts` declara la vía simétrica en su cabecera.

## Task Commits

Cada tarea se ha commiteado atómicamente:

1. **Task 1: vocabulario compartido, descubrimiento de marcas y contrato del lector** - `c490976` (test)
2. **Task 2: la prueba de ciclo de vida obligatoria y la rama de montaje que lee sin pintar** - `33ce35c` (test)
3. **Task 3: cobertura del descubrimiento y declaración escrita del alcance de cada gate** - `29c7d18` (test)

## Mensajes de fallo literales de los 4 tests rojos (exigido por acceptance_criteria)

**Pata 1 — `contratoDeLaMarcaDe` (Task 1):**
```
AssertionError: app/composables/useProgressMismatchMark.ts: su lector (readProgressMismatchWarning) tiene aridadDelLector=1 y segundoParametroOpcional=false — se exige aridad >= 2 y segundo parámetro NO opcional para que la sustitución del referente sea detectable: expected false to be true
```

**Pata 2 — `lecturasSinTestigoDe` (Task 1):**
```
Error: app/pages/[game]/index.vue llama a readProgressMismatchWarning sin testigo del referente (readProgressMismatchWarning(gameId)). Una llamada a readProgressMismatchWarning tiene que pasar el testigo del referente de la marca app/composables/useProgressMismatchMark.ts, o la marca podría sobrevivir a la destrucción de su propio referente (CR-01).
```

**Pata 3 — `faltaPruebaDeCicloDeVidaEn` (Task 2):**
```
AssertionError: app/composables/__tests__/useProgressMismatchMark.test.ts no contiene ningún `it` que ponga la marca de app/composables/useProgressMismatchMark.ts y la lea con un testigo distinto esperando null — falta la prueba de ciclo de vida completo: expected true to be false
```

**Pata 4 — `ramasQueLeenSinPintarDe` (Task 2):**
```
Error: app/pages/[game]/index.vue: la(s) rama(s) awaitingContentChangedAck calculan el aviso de app/composables/useProgressMismatchMark.ts (vía readProgressMismatchWarning) pero no lo pintan en la plantilla — la rama tiene destino de cálculo y no destino de render (WR-01).
```

**Salida real de `npm test 2>&1 | tail -6` al cerrar este plan:**
```
 Test Files  1 failed | 33 passed (34)
      Tests  4 failed | 1059 passed (1063)
   Start at  15:37:25
   Duration  796ms (transform 5.74s, setup 0ms, import 8.16s, tests 591ms, environment 3ms)
```
Un único fichero rojo (`invariantesDeMarcaDeEstado.test.ts`, el gate nuevo de este plan); los otros 33 ficheros de la suite están en verde.

## Files Created/Modified

- `app/composables/__tests__/vocabularioDeAfirmaciones.ts` — vocabulario compartido: raíces léxicas, `regionVigilada`, descubrimiento de ficheros del árbol vía `import.meta.glob`, `respaldoExiste`
- `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` — el gate nuevo: descubrimiento + 5 patas + auto-verificación sintética
- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — importa el vocabulario compartido (ya no lo declara localmente); añade la declaración de alcance y el test de Gate S que la vigila

**Recuento de tests de `afirmacionesRespaldadas.test.ts` antes/después del movimiento (Task 1):** 45 `it(` en ambas versiones (antes y después de mover el vocabulario — comprobado con `git show HEAD~3:... | grep -c "  it("` vs el árbol de trabajo tras Task 1); la ejecución real reporta **85 tests pasando** antes de Task 3 y **86** después de añadir el test de Gate S de Task 3 (+1, exactamente el nuevo).

## Decisions Made

Ver `key-decisions` en el frontmatter. La más relevante para el resto de este lote: **HIST-04/HIST-06 no se marcan como completados en `REQUIREMENTS.md`** por este plan — su propio `scope_boundary` lo prohíbe explícitamente y el patrón ya establecido en 09-27 (STATE.md) es que un requisito no se remarca porque un plan diga haberlo cerrado, sino cuando una ronda de verificación independiente lo confirme. Este plan construye un gate que queda ROJO a propósito; no cierra el defecto (eso es 09-38).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `llamadasA` confundía la propia declaración del lector con una llamada sin testigo**
- **Found during:** Task 1, al ejecutar por primera vez la pata 2 contra el árbol real
- **Issue:** El patrón `\bnombre\(` usado para encontrar llamadas a una función también coincidía con su propia `export function nombre(...)` — así que `useProgressMismatchMark.ts` se marcaba a sí mismo como "llamada sin testigo" por su propia definición de `readProgressMismatchWarning`, un falso positivo que el plan no pedía (solo pedía que `index.vue` se pusiera rojo).
- **Fix:** `llamadasA` ahora comprueba que los 9 caracteres inmediatamente anteriores a la coincidencia no sean `'function '`, excluyendo así toda declaración de función de la búsqueda de llamadas.
- **Files modified:** `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`
- **Verification:** Tras el fix, la pata 2 solo se pone roja por `app/pages/[game]/index.vue` (la llamada real de la línea ~202), exactamente lo que el plan exige.
- **Committed in:** `c490976` (parte del commit de Task 1, antes de que existiera ningún commit previo que revertir)

---

**Total deviations:** 1 auto-fixed (1 bug de la propia lógica del gate, corregido antes de comprometer ningún resultado). **Impact:** ninguno sobre el alcance del plan — el fix era necesario para que la pata 2 midiera lo que el plan pide medir (llamadas reales, no declaraciones) y no introdujo ningún cambio de producción.

## Issues Encountered

Una nota sobre `<verification>` del propio plan: la línea `git diff --stat -- app/components/ app/pages/ app/composables/*.ts engine/` (ejecutada literalmente con el pathspec sin comillas expandido por git, no por el shell) SÍ reporta cambios — porque el fnmatch de git para pathspecs no ancla `*` a un solo segmento de ruta, así que `app/composables/*.ts` también casa con `app/composables/__tests__/afirmacionesRespaldadas.test.ts`. El propio texto del plan ya lo anticipa entre paréntesis («`app/composables/__tests__/` sí cambia, y es lo único de `app/composables/` que puede cambiar»), así que esto no es una regresión: se confirma por separado que `git diff --name-only` sobre el rango completo del plan lista EXACTAMENTE los tres ficheros de `files_modified`, ninguno de producción.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El gate de invariantes existe, está commiteado, y documenta con precisión (mensajes literales) las dos caras concretas que el plan 09-38 tiene que cerrar: aridad del lector (pata 1/2) y binding de render en `ContentChangedNotice` (pata 3/4).
- El plan 09-38 puede empezar sin bloqueos: los tres ficheros de este plan están completos y en verde salvo las 4 comprobaciones rojas deliberadas.
- Los planes 09-39 (evasiones propias del gate de clase, WR-02/WR-03) y 09-40 (`.planning/**`) no dependen de que 09-38 se ejecute primero, pero sí de que este plan (09-37) esté cerrado — lo está.
- **HIST-04/HIST-06 siguen `[ ]` en `REQUIREMENTS.md`**, a la espera de una ronda de verificación independiente tras 09-38, tal como exige el `scope_boundary` de este plan.

## Self-Check: PASSED

- `[ -f app/composables/__tests__/vocabularioDeAfirmaciones.ts ]` → FOUND
- `[ -f app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts ]` → FOUND
- `git log --oneline --all | grep -q c490976` → FOUND
- `git log --oneline --all | grep -q 33ce35c` → FOUND
- `git log --oneline --all | grep -q 29c7d18` → FOUND
- Re-ejecutado `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts` → 86 tests, 0 fallos
- Re-ejecutado `npx vitest run app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` → 82 pasan, 4 fallan (los 4 esperados)
- Re-ejecutado `npx tsc --noEmit` → exit 0
- `git diff --name-only ${plan_head_before}..HEAD` → exactamente los 3 ficheros de `files_modified`

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-22*
