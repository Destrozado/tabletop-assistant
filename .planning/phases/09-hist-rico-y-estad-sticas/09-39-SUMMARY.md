---
phase: 09-hist-rico-y-estad-sticas
plan: 39
subsystem: testing
tags: [vitest, gate-de-clase, gate-de-invariantes, wr-02, wr-03, respaldo-comprobable, mutacion-ejecutada]

requires:
  - phase: 09-hist-rico-y-estad-sticas (planes 09-37, 09-38)
    provides: gate de invariantes de ciclo de vida de estado de módulo (invariantesDeMarcaDeEstado.test.ts), huella del referente que cierra CR-01/WR-01 en producción
provides:
  - respaldoRespaldaA/identificadoresComprobablesDe/motivoNombraAlgoComprobable en el módulo compartido, importadas por los dos gates sin copias
  - respaldoExiste reescrita sobre contenidoDelArbolPorRuta (una sola fuente de verdad de qué ficheros existen Y de su contenido)
  - Gate S (gate de clase) y el gate de invariantes exigen ahora, para toda excepción auditada de sus dos tablas, las cuatro condiciones de calidad — longitud, respaldo existente, respaldo relevante (WR-02) y motivo comprobable (WR-03) — con cierre de cobertura mutuamente vigilado en ambos ficheros
  - Corregida una entrada real de AFIRMACIONES_AUDITADAS (useProgressMountPlan.ts) que no pasaba la comprobación nueva
  - Añadida entrada de auditoría para useStoredProgress.ts (Gate A, falso positivo heredado del plan 09-38) y arreglados los 4 self-tests de fixture obsoletos de invariantesDeMarcaDeEstado.test.ts — npm test vuelve a estar en verde por completo
affects: [09-40]

actuals:
  tokens: 10524
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "respaldoRespaldaA(ruta, raiz, motivo): comprobación de RELEVANCIA de contenido, no solo de existencia — WR-02"
    - "motivoNombraAlgoComprobable(motivo)/identificadoresComprobablesDe(motivo): criterio ESTRUCTURAL (forma de identificador/nombre de fichero), nunca vocabulario cerrado — WR-03"
    - "Cierre de cobertura por recuento de ocurrencias (>=2: la cita + el it real), no por .toContain — un .toContain simple sería trivialmente cierto porque la propia cita se contiene a sí misma en el mismo fichero que se lee del glob"
    - "Tabla de excepciones auditadas como parámetro con valor por defecto (MARCAS_CON_REFERENTE_NO_PERSISTENTE / AFIRMACIONES_AUDITADAS), para que un caso sintético la ejerza sin tocar la tabla real"

key-files:
  modified:
    - app/composables/__tests__/vocabularioDeAfirmaciones.ts
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts
    - app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts

key-decisions:
  - "respaldoRespaldaA compara sobre el CONTENIDO RAW del respaldo (no regionVigilada): el respaldo típico es un fichero de test, donde comentarios y código son igual de válidos como evidencia de relación con la afirmación."
  - "MARCAS_CON_REFERENTE_NO_PERSISTENTE gana un campo `raiz` (misma forma que AfirmacionAuditada) para poder reusar respaldoRespaldaA literalmente, en vez de inventar una variante sin raíz que degeneraría en 'siempre true' si se le pasara raiz vacía."
  - "El it de cierre de cobertura exige >=2 ocurrencias del nombre citado (la propia cita + el it real), no un .toContain simple: la primera versión escrita fue probada por mutación y resultó SIEMPRE verde (la cita se contiene a sí misma), un hallazgo del propio proceso de este plan, corregido antes de comprometer el resultado."
  - "La entrada de Gate A para useStoredProgress.ts (falso positivo heredado del plan 09-38: huellaDelProgreso contiene la raíz 'progreso' pero es la propia autoridad calculando su huella, no una afirmación externa) y los 4 self-tests de fixture obsoletos de invariantesDeMarcaDeEstado.test.ts se corrigen en este plan porque ambos ficheros están en su files_modified y ambos bloqueaban el `npm test` exit 0 que las propias <verify> de este plan exigen — no una ampliación de alcance, una precondición de las tareas declaradas."

requirements-completed: []

coverage:
  - id: D1
    description: "WR-02 cerrado: respaldoRespaldaA exige relevancia de contenido, no solo existencia, para toda entrada de AFIRMACIONES_AUDITADAS — demostrado con el contraejemplo literal de la revisión, verde antes y rojo después"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#toda entrada de AFIRMACIONES_AUDITADAS tiene motivo y respaldo no vacíos, el respaldo resuelve a un fichero real y ESE fichero respalda de verdad la afirmación (WR-02)"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-03 cerrado: motivoNombraAlgoComprobable es incondicional para toda entrada, sin puerta de entrada por subcadena literal — demostrado con las tres redacciones circulares que 09-REVIEW.md enumera, fijadas como fixture permanente"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#todo motivo de AFIRMACIONES_AUDITADAS nombra algo comprobable — un fichero o un identificador de código, no solo prosa (WR-03: incondicional, sin puerta de entrada por subcadena)"
        status: pass
    human_judgment: false
  - id: D3
    description: "El gate de invariantes hereda las dos exigencias sobre MARCAS_CON_REFERENTE_NO_PERSISTENTE, con dos casos sintéticos que ponen rojo el gate de forma aislada"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts#una entrada sintética con un respaldo REAL pero SIN RELACIÓN pone rojo el gate de invariantes (WR-02, caso sintético)"
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts#una entrada sintética con un motivo de RELLENO sin identificadores pone rojo el gate de invariantes (WR-03, caso sintético)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cierre de cobertura en los dos ficheros: las cuatro condiciones de calidad de una excepción auditada tienen, cada una, un caso sintético que la pone roja de forma aislada, con un it que vigila que ninguna condición futura se quede sin él (demostrado por mutación ejecutada y revertida en los dos ficheros)"
    requirement: "HIST-06"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#cobertura: las cuatro condiciones de calidad de una excepción auditada tienen, cada una, un caso sintético que la pone roja de forma aislada — ninguna se queda sin él"
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts#cobertura: las cuatro condiciones de calidad de una excepción auditada tienen, cada una, un caso sintético que la pone roja de forma aislada — ninguna se queda sin él"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm test vuelve a estar en verde por completo (1096 passed, 0 failed) — el falso positivo de Gate A sobre useStoredProgress.ts y los 4 self-tests de fixture obsoletos, ambos heredados del plan 09-38, quedan corregidos"
    verification:
      - kind: unit
        ref: "npm test (1096 passed, 0 failed)"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false

duration: ~50min
completed: 2026-09-22
status: complete
plan_head_before: 653d6b6ba39eb1651e2e72b76ff3a7adcfadf008
commits: 3
---

# Phase 09 Plan 39: Las dos evasiones propias del mecanismo de excepción auditada, cerradas Summary

**`respaldoRespaldaA`/`motivoNombraAlgoComprobable` sustituyen la comprobación de "existe"/"contiene una subcadena literal" por relevancia de contenido y motivo estructuralmente comprobable, compartidas por los dos gates y demostradas por cinco mutaciones ejecutadas (dos por WR-02, dos por WR-03, una del cierre de cobertura); `npm test` pasa de 5 tests rojos a 0 — el árbol queda genuinamente en verde por primera vez desde el plan 09-37.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3 completadas
- **Files modified:** 3 (los tres de `files_modified`, ninguno más, ninguno menos)

## Accomplishments

- **WR-02 cerrado — el respaldo tiene que respaldar, no solo existir.** `respaldoRespaldaA(ruta, raiz, motivo)` lee el CONTENIDO del fichero citado (vía el mapa único `contenidoDelArbolPorRuta`, del que `respaldoExiste` ahora también se deriva — una sola fuente de verdad) y exige que contenga la raíz o un identificador comprobable del motivo. `identificadoresComprobablesDe(motivo)` es ESTRUCTURAL: nombres de fichero (`.ts`/`.vue`) o palabras camelCase de al menos 8 caracteres con mayúscula interior — nunca una lista de palabras concretas.
- **WR-03 cerrado — todo motivo nombra algo comprobable, sin puerta de entrada literal.** Desaparece `FRASE_CIRCULAR` y el `if` que la usaba como puerta de entrada; `motivoNombraAlgoComprobable(motivo)` se exige de forma INCONDICIONAL para toda entrada. `REDACCIONES_CIRCULARES_DE_LA_RONDA_8` fija como fixture permanente las tres redacciones que `09-REVIEW.md` enumera (la frase literal original y las dos alternativas), las tres dando `false`.
- **IN-01 documentado, no retirado.** El umbral de 40 caracteres se conserva con un comentario explícito: mide longitud, no sustancia; la sustancia la comprueban ahora `respaldoRespaldaA` y `motivoNombraAlgoComprobable`.
- **El gate de invariantes hereda las dos exigencias.** `MARCAS_CON_REFERENTE_NO_PERSISTENTE` gana un campo `raiz` (misma forma que `AfirmacionAuditada`, para poder reusar `respaldoRespaldaA` sin degenerarlo con una raíz vacía). `excepcionesConRespaldoInsuficiente(tabla = MARCAS_CON_REFERENTE_NO_PERSISTENTE)` aplica las dos funciones compartidas; la entrada real de `useHistorySavedNotice.ts` pasa por vía de identificador (`planGameEnd`, nombrado en su motivo, medido dentro de `avisoTrasRegistroFallido.test.ts`).
- **Cierre de cobertura en los dos ficheros, con anti-recurrencia real.** Cada fichero declara una lista de las cuatro condiciones de calidad (longitud, respaldo existente, respaldo relevante, motivo comprobable) con el NOMBRE LITERAL del caso sintético que la pone roja de forma aislada, y un `it` de cierre que exige que ese nombre aparezca **al menos dos veces** en el propio fichero (la cita + el `it` real) — no un `.toContain` simple, que habría sido trivialmente cierto siempre porque la propia cita se contiene a sí misma. Este diseño se corrigió DURANTE la ejecución de este plan al descubrir, por mutación, que la primera versión nunca se ponía roja (ver «Deviations» abajo).
- **Corregida una entrada real que no pasaba la comprobación nueva.** De las 19 raíces auditadas (8 ficheros) de `AFIRMACIONES_AUDITADAS`, una (`useProgressMountPlan.ts`, raíz `guardar`) no pasaba `respaldoRespaldaA`: su motivo no nombraba ningún identificador comprobable y la raíz no aparecía en el respaldo citado. Se reescribió el motivo para nombrar `planProgressMount` (la función real que produce el aviso) — nunca se tocó el criterio.
- **`npm test` vuelve a estar en verde por completo.** De `5 failed | 1072 passed (1077)` (heredado del plan 09-38, documentado en `deferred-items.md` y `.planning/WINDOWS.md`) a **`1096 passed, 0 failed`**: se añadió la entrada de auditoría de Gate A para `useStoredProgress.ts` (el falso positivo de `huellaDelProgreso`) y se corrigieron los 4 self-tests de fixture `(HOY)`/`(ROJA hoy)` de `invariantesDeMarcaDeEstado.test.ts`, obsoletos desde que el plan 09-38 arregló la producción que describían.

## Task Commits

Cada tarea se ha commiteado atómicamente:

1. **Task 1: WR-02 — el respaldo tiene que respaldar, no solo existir** - `2c617be` (test)
2. **Task 2: WR-03 — todo motivo nombra algo comprobable, sin ninguna puerta de entrada literal** - `0a28d5b` (test)
3. **Task 3: el gate de invariantes hereda las dos exigencias, y ninguna condición se queda sin caso que la ponga roja** - `c27f22f` (test)

**Plan metadata:** pendiente (este commit).

## Medición de las ocho entradas de AFIRMACIONES_AUDITADAS (19 raíces, Task 1, exigido por acceptance_criteria)

Medido con `respaldoRespaldaA(afirmacion.respaldo, afirmacion.raiz, afirmacion.motivo)` sobre las 19 raíces auditadas de los 8 ficheros, ANTES de corregir ninguna entrada:

| Fichero | Raíz | Respaldo | Vía | Resultado |
|---|---|---|---|---|
| ResumePrompt.vue | guardad | useProgressMountPlan.test.ts | raíz | ✅ pasa |
| ResumePrompt.vue | progreso | useProgressMountPlan.test.ts | identificador (`useProgressMountPlan`) | ✅ pasa |
| ContentChangedNotice.vue | guardad | useProgressMountPlan.test.ts | raíz | ✅ pasa |
| useGameEndCopy.ts | guardad | useGameEndCopy.test.ts | raíz | ✅ pasa |
| useGameEndCopy.ts | progreso | useGameEndCopy.test.ts | raíz | ✅ pasa |
| useGameEndCopy.ts | se borrar | useGameEndCopy.test.ts | raíz | ✅ pasa |
| useHistorySavedNotice.ts | dispositivo | avisoTrasRegistroFallido.test.ts | raíz | ✅ pasa |
| useHistorySavedNotice.ts | guardad | avisoTrasRegistroFallido.test.ts | raíz | ✅ pasa |
| useHistorySavedNotice.ts | guardar | avisoTrasRegistroFallido.test.ts | identificador (`planGameEnd`) | ✅ pasa |
| useHistorySavedNotice.ts | reintent | avisoTrasRegistroFallido.test.ts | raíz | ✅ pasa |
| useHistorySavedNotice.ts | no se ha perdido | avisoTrasRegistroFallido.test.ts | raíz | ✅ pasa |
| useHistorySavedNotice.ts | no encontraréis | avisoTrasRegistroFallido.test.ts | identificador (`readStoredProgress`) | ✅ pasa |
| useProgressMountPlan.ts | guardad | useProgressMountPlan.test.ts | raíz | ✅ pasa |
| **useProgressMountPlan.ts** | **guardar** | useProgressMountPlan.test.ts | ninguna | ❌ **NO pasaba — corregido** |
| useProgressMountPlan.ts | dispositivo | useProgressMountPlan.test.ts | raíz | ✅ pasa |
| AppHeader.vue | dispositivo | useVoiceAnnouncer.test.ts | raíz | ✅ pasa |
| VoiceUnavailableNotice.vue | dispositivo | useVoiceAnnouncer.test.ts | raíz | ✅ pasa |
| useProgressMismatchMark.ts | guardad | useProgressMismatchMark.test.ts | raíz | ✅ pasa |
| useProgressMismatchMark.ts | progreso | useProgressMismatchMark.test.ts | raíz | ✅ pasa |

**Antes/después de la única corrección:**

- **Antes:** `motivo: '"al guardar la nueva podríais sustituirla" describe la consecuencia real de mini-setup tras stored === \'unknown\', la única rama que produce este aviso.'` — no nombraba ningún identificador comprobable, y la raíz `guardar` no aparece en `useProgressMountPlan.test.ts`.
- **Después:** `motivo: '"al guardar la nueva podríais sustituirla" es parte de UNVERIFIED_PROGRESS_NOTICE, la única cadena que planProgressMount devuelve para stored === \'unknown\', fijada rama por rama contra los cuatro valores de StoredProgress.'` — nombra `planProgressMount` (identificador real, presente en el respaldo citado). El criterio no se tocó; se corrigió la entrada.

**Entrada nueva (fuera de las ocho, necesaria para que `npm test` saliera 0 — ver «Deviations»):** `app/composables/useStoredProgress.ts`, raíz `progreso`, respaldo `useStoredProgress.test.ts`, motivo nombrando `huellaDelProgreso` como la propia autoridad calculando su huella.

## Las cinco ejecuciones de demostración (exigidas por `<verification>` del plan)

### 1. WR-02 — VERDE antes de la comprobación nueva (contraejemplo: respaldo de `useGameEndCopy.ts`/`guardad` apuntado a `useVoiceAnnouncer.ts`, fichero real sin relación)

```
Test Files  1 passed (1)
     Tests  1 passed | 85 skipped (86)
```

### 2. WR-02 — ROJO después de la comprobación nueva (mismo contraejemplo, sin cambiar)

```
FAIL app/composables/__tests__/afirmacionesRespaldadas.test.ts > Respaldo comprobable de cada excepción auditada (plan 09-34, Task 2, cierre del agravante de la ronda 8) > toda entrada de AFIRMACIONES_AUDITADAS tiene motivo y respaldo no vacíos, el respaldo resuelve a un fichero real y ESE fichero respalda de verdad la afirmación (WR-02)
AssertionError: app/composables/useGameEndCopy.ts (raíz «guardad»): el respaldo citado (app/composables/useVoiceAnnouncer.ts) no contiene ni la raíz ni ningún identificador comprobable del motivo — cita un fichero real, pero no lo respalda (WR-02).: expected false to be true
```

### 3. WR-03 — VERDE antes del cambio (motivo circular alternativo añadido a una entrada de `useProgressMismatchMark.ts`: "eso ya lo cubre el otro gate de este fichero, así que no hace falta repetir nada más aquí en detalle")

```
Test Files  1 passed (1)
     Tests  1 passed | 89 skipped (90)
```

### 4. WR-03 — ROJO después del cambio (mismo motivo circular, sin cambiar)

```
FAIL app/composables/__tests__/afirmacionesRespaldadas.test.ts > Gate S — auto-verificación del propio gate (09-30, ampliada en el plan 09-35) > todo motivo de AFIRMACIONES_AUDITADAS nombra algo comprobable — un fichero o un identificador de código, no solo prosa (WR-03: incondicional, sin puerta de entrada por subcadena)
AssertionError: app/composables/useProgressMismatchMark.ts (raíz «progreso»): el motivo no nombra ningún fichero ni identificador comprobable — no basta con que sea largo (IN-01) ni con que evite una frase circular concreta (WR-03): tiene que nombrar algo que se puede ir a mirar.: expected false to be true
```

### 5. Mutación del cierre de cobertura — ROJO al renombrar el `it` real citado (demostrada en los DOS ficheros; se pega la de `afirmacionesRespaldadas.test.ts`, la exigida literalmente por el plan)

```
FAIL app/composables/__tests__/afirmacionesRespaldadas.test.ts > Gate S — auto-verificación del propio gate (09-30, ampliada en el plan 09-35) > cobertura: las cuatro condiciones de calidad de una excepción auditada tienen, cada una, un caso sintético que la pone roja de forma aislada — ninguna se queda sin él
AssertionError: condición «respaldo relevante (respaldoRespaldaA, WR-02)»: el caso sintético citado ("respaldoRespaldaA es false para un fichero REAL del árbol sin ninguna relación con la raíz ni con el motivo (el contraejemplo exacto de WR-02)") no existe como un it(...) real en el fichero — solo se encuentra la propia cita de la lista de cobertura.: expected 1 to be greater than or equal to 2
```

**Bonus (no exigido, ejecutado por rigor):** la misma mutación repetida en `invariantesDeMarcaDeEstado.test.ts` (renombrando el `it` del caso WR-03) produjo el mismo tipo de fallo:

```
FAIL app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts > Cierre de cobertura — las cuatro condiciones de calidad heredadas del gate de clase (Task 3) > cobertura: las cuatro condiciones de calidad de una excepción auditada tienen, cada una, un caso sintético que la pone roja de forma aislada — ninguna se queda sin él
AssertionError: condición «motivo comprobable (motivoNombraAlgoComprobable, WR-03)»: el caso sintético citado ("una entrada sintética con un motivo de RELLENO sin identificadores pone rojo el gate de invariantes (WR-03, caso sintético)") no existe como un it(...) real en el fichero — solo se encuentra la propia cita de la lista de cobertura.: expected 1 to be greater than or equal to 2
```

Las cinco/siete mutaciones se revirtieron inmediatamente después de registrar su salida; `git diff --stat` confirmó cero cambios tras cada reversión.

## Files Created/Modified

- `app/composables/__tests__/vocabularioDeAfirmaciones.ts` — `contenidoDelArbolPorRuta` (mapa único ruta→contenido, del que ahora se deriva `respaldoExiste`); `identificadoresComprobablesDe`/`motivoNombraAlgoComprobable`/`respaldoRespaldaA` nuevas
- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — Gate S exige `respaldoRespaldaA`/`motivoNombraAlgoComprobable` para toda entrada; entrada nueva de auditoría (`useStoredProgress.ts`); entrada corregida (`useProgressMountPlan.ts`/`guardar`); fixture `REDACCIONES_CIRCULARES_DE_LA_RONDA_8`; cierre de cobertura de las 4 condiciones de calidad
- `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` — `MARCAS_CON_REFERENTE_NO_PERSISTENTE` gana `raiz`; `excepcionesConRespaldoInsuficiente` nueva; dos casos sintéticos; cierre de cobertura; los 4 self-tests de fixture `(HOY)`/`(ROJA hoy)` actualizados al estado arreglado por el plan 09-38

## Decisions Made

Ver `key-decisions` en el frontmatter. La más relevante para una ronda futura: el diseño del `it` de cierre de cobertura se corrigió a mitad de este mismo plan tras descubrir, por mutación real, que la primera versión (`.toContain`) nunca podía ponerse roja — un hallazgo del propio proceso TDD de este plan, documentado en «Deviations» para que quede explícito por qué el diseño final exige un recuento de ocurrencias en vez de una simple pertenencia.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gate A marcaba `useStoredProgress.ts` como afirmación sin auditar (falso positivo heredado del plan 09-38)**
- **Found during:** Task 1, al ejecutar `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts` (el propio `<verify>` de la Task 1)
- **Issue:** `huellaDelProgreso` (nueva en el plan 09-38) contiene, en código real, la subcadena «progreso» — una raíz vigilada — pero es la propia autoridad calculando su huella, no una afirmación externa sin respaldo. Documentado como hallazgo abierto en `deferred-items.md`/`.planning/WINDOWS.md` (ronda 8), reservado explícitamente al plan 09-39 por el `scope_boundary` del plan 09-38.
- **Fix:** Entrada nueva en `AFIRMACIONES_AUDITADAS['app/composables/useStoredProgress.ts']` (raíz `progreso`, respaldo `useStoredProgress.test.ts`, motivo nombrando `huellaDelProgreso`).
- **Files modified:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts`
- **Verification:** `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts` pasa de 1 fallo a 0.
- **Committed in:** `2c617be` (Task 1)

**2. [Rule 1 - Bug] Cuatro self-tests de fixture `(HOY)`/`(ROJA hoy)` de `invariantesDeMarcaDeEstado.test.ts`, obsoletos desde el plan 09-38**
- **Found during:** Task 3, al ejecutar `npx vitest run app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` (el propio `<verify>` de la Task 3, que exige `npm test` en 0)
- **Issue:** Cuatro tests comprobaban el resultado de las funciones puras del gate (`contratoDeLaMarcaDe`, `lecturasSinTestigoDe`, `faltaPruebaDeCicloDeVidaEn`, `ramasQueLeenSinPintarDe`) contra el contenido REAL de ficheros de producción/test, con un valor esperado hardcodeado que describía el estado ROTO documentado por el plan 09-37 — ya obsoleto tras el arreglo del plan 09-38. Documentado como hallazgo 2 de la ronda 8 en `deferred-items.md`/`.planning/WINDOWS.md`, reservado explícitamente al plan 09-39.
- **Fix:** Los cuatro valores esperados se actualizaron al estado arreglado (aridadDelLector=2, cero llamadas sin testigo, ciclo de vida demostrado, cero ramas sin pintar), con comentario explicando el cambio.
- **Files modified:** `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`
- **Verification:** `npm test` pasa de `5 failed | 1072 passed (1077)` a `1096 passed, 0 failed`.
- **Committed in:** `c27f22f` (Task 3)

**3. [Rule 1 - Bug, autodetectado] Primera versión del `it` de cierre de cobertura nunca podía ponerse roja**
- **Found during:** Task 3, al ejecutar la mutación de demostración exigida por el propio `<acceptance_criteria>` de la tarea
- **Issue:** La primera implementación usaba `expect(contenidoPropio).toContain(casoSintetico)`. Como `casoSintetico` es un literal escrito DENTRO del propio `contenidoPropio` (la lista de cobertura vive en el mismo fichero que se lee del glob), la aserción era trivialmente cierta siempre — borrar o renombrar el `it` real citado no la afectaba, porque la CITA seguía presente por sí misma.
- **Fix:** Se cambió a un recuento de ocurrencias no superpuestas (`contenidoPropio.split(casoSintetico).length - 1 >= 2`): una para la cita, otra para el `it(...)` real. Verificado por la mutación exigida: renombrar el `it` real hace caer el recuento a 1 y el test se pone rojo.
- **Files modified:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts`, `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`
- **Verification:** Mutación ejecutada y revertida en los dos ficheros (ver sección de arriba); ambas ponen rojo el test corregido.
- **Committed in:** `c27f22f` (Task 3) — la primera versión (con el defecto) nunca se commiteó; se corrigió antes del commit de Task 3.

---

**Total deviations:** 3 auto-fijados (2 correcciones de tests heredadas del plan 09-38, ambas necesarias para que las propias `<verify>` de este plan salieran 0; 1 corrección de diseño autodetectada por el propio proceso de mutación que el plan exige ejecutar). **Impacto:** ninguno sobre el alcance de este plan — ningún fichero de producción se tocó (`git diff --stat -- app/components/ app/pages/ app/composables/*.ts engine/` vacío en todo el rango del plan), y las tres correcciones viven exclusivamente en los ficheros de `files_modified`.

## Issues Encountered

Ninguno más allá de lo documentado en «Deviations». No hubo bloqueos de compilación, dependencias ni auth gates.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Las dos evasiones propias del mecanismo de excepción auditada (WR-02, WR-03) están cerradas, compartidas por los dos gates, y demostradas por mutación ejecutada.
- `npm test` está en verde por completo (1096 passed, 0 failed) y `npx tsc --noEmit` sale 0 — la primera vez que el árbol completo pasa desde que el plan 09-37 introdujo el gate de invariantes.
- **HIST-06 sigue `[ ]` en `REQUIREMENTS.md`**, tal como exige el `scope_boundary` de este plan («No se escribe en ningún sitio que HIST-06 quede cerrado») — la confirmación queda para una ronda de verificación independiente.
- El plan 09-40 (`.planning/**`) puede empezar sin bloqueos de este plan. Los dos hallazgos de la ronda 8 que `deferred-items.md`/`.planning/WINDOWS.md` reservaban a este plan (falso positivo de Gate A sobre `useStoredProgress.ts`, self-tests de fixture obsoletos) están corregidos en código; su cierre formal en `.planning/**` (deferred-items.md, WINDOWS.md) queda para el plan 09-40, cuyo alcance es exactamente ese directorio.
- La sonda de cobertura de bordes (14 filas HIST-01..09/STAT-01..05, sin clasificar desde la ronda 7) sigue sin resolverse — ninguna garantía de este plan se apoya en ella.

## Self-Check: PASSED

- `[ -f app/composables/__tests__/vocabularioDeAfirmaciones.ts ]` → FOUND
- `[ -f app/composables/__tests__/afirmacionesRespaldadas.test.ts ]` → FOUND
- `[ -f app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts ]` → FOUND
- `git log --oneline --all | grep -q 2c617be` → FOUND
- `git log --oneline --all | grep -q 0a28d5b` → FOUND
- `git log --oneline --all | grep -q c27f22f` → FOUND
- Re-ejecutado `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` → 191 tests, 0 fallos
- Re-ejecutado `npm test` → 1096 tests, 0 fallos
- Re-ejecutado `npx tsc --noEmit` → exit 0
- `git diff --name-only 653d6b6..HEAD` → exactamente los 3 ficheros de `files_modified`
- `git diff --stat 653d6b6..HEAD -- app/components/ app/pages/ engine/ package.json package-lock.json` → vacío

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-22*
