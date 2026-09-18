---
phase: 09-hist-rico-y-estad-sticas
plan: 34
subsystem: testing
tags: [vitest, tdd, gate-de-clase, copywriting, static-analysis]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "useGameEndCopy.ts/isSuccessVariant (plan 09-32), useProgressMismatchMark.ts/PROGRESS_MISMATCH_WARNING (plan 09-33)"
provides:
  - "RAICES_SOBRE_LOS_DATOS_DEL_GRUPO: criterio de Gate A/B por raíz léxica, sustituyendo la lista cerrada de 11 subcadenas literales que ocho rondas de verificación demostraron incapaz de alcanzar a la copy nueva a tiempo"
  - "frasesSinAuditarDe(ruta, contenido): la decisión de Gate A extraída a función pura exportada, lista para que el plan 09-35 la ejerza y demuestre que se pone roja"
  - "AfirmacionAuditada { raiz, motivo, respaldo } + respaldoExiste(ruta): toda excepción auditada nombra un fichero real que la respalda, comprobado por gate — un motivo falso o circular ya no puede sellar un hueco"
  - "app/pages/[game]/index.vue confirmado sin ninguna excepción auditada, con test explícito"
  - "Gate B audita NOTICE_HEADING además de NOTICE_BODY; Gate C vigila también el literal 'success'"
affects: [09-35, 09-36]

# Actuals (#2632)
actuals:
  tokens: 10258
  tasks: 3
  commits: 6
plan_head_before: 2374ea99e65cb50e7070586669ce8bfb6e839f7c

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vocabulario vigilado por RAÍZ léxica en vez de por subcadena literal, con un test de subsunción que demuestra mecánicamente que el criterio nuevo cubre todo lo que cubría el viejo — evita que la lista cerrada vuelva a demostrarse incapaz de alcanzar la copy nueva"
    - "Decisión de gate extraída a función pura exportada (frasesSinAuditarDe) en vez de vivir inline en un it.each, para que otro gate pueda ejercerla y demostrar que se pone roja"
    - "Excepción auditada con respaldo comprobable ({ raiz, motivo, respaldo }) en vez de solo un motivo en prosa: el respaldo es una ruta de fichero real que un gate resuelve contra el árbol, así que un motivo falso o circular deja de poder sellar un hueco"

key-files:
  created: []
  modified:
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts
    - app/pages/[game]/index.vue

key-decisions:
  - "Criterio de Gate A/B pasa de FRASES_SOBRE_LOS_DATOS_DEL_GRUPO (11 subcadenas cerradas) a RAICES_SOBRE_LOS_DATOS_DEL_GRUPO (10 raíces léxicas), con VOCABULARIO_CERRADO_HASTA_LA_RONDA_7 conservado solo como constante de comprobación y un test de subsunción que demuestra que ninguna de las 11 subcadenas viejas queda sin cubrir"
  - "AFIRMACIONES_AUDITADAS pasa de Record<string, string[]> a Record<string, AfirmacionAuditada[]>: cada entrada lleva {raiz, motivo, respaldo}, y un gate nuevo (respaldoExiste) falla si el respaldo no resuelve a un fichero real de app/ o engine/"
  - "Gate B concatena entries en vez de usar el spread { ...NOTICE_HEADING, ...NOTICE_BODY } que la propia verificación proponía — ambos registros comparten las mismas cinco claves NoticeVariant, así que el spread habría descartado los cinco titulares y dejado el mismo hueco con otra forma"
  - "app/pages/[game]/index.vue confirmado como el primer fichero de este gate que no necesita NINGUNA excepción auditada: el único hit residual bajo el criterio nuevo (raíz 'progreso') era el nombre del ref avisoProgresoAjeno, ruido de identificador, renombrado a avisoDiscrepancia en vez de auditado"

requirements-completed: [HIST-06]

coverage:
  - id: D1
    description: "El vocabulario vigilado de Gate A/B deja de ser una lista cerrada de subcadenas literales y pasa a ser un conjunto de raíces léxicas que cubre las flexiones por construcción, con un test de subsunción que demuestra que no pierde ninguna cobertura del criterio anterior"
    requirement: HIST-06
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Criterio por raíces léxicas (plan 09-34, cierre de la vía (a) de 09-VERIFICATION.md ronda 8) — cada una de las 11 subcadenas del vocabulario cerrado de la ronda 7 contiene al menos una raíz nueva"
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Criterio por raíces léxicas — la instancia real y sin detectar de la ronda 7 (endGameBody con \"conservará ... reintentarlo\") SÍ contiene una raíz nueva"
        status: pass
    human_judgment: false
  - id: D2
    description: "Una copy partida en dos líneas por un formateador ya no evade el gate: normalizarEspacios colapsa los espacios en blanco (incluidos saltos de línea) antes de comparar"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Criterio por raíces léxicas — contieneRaizSobreLosDatosDelGrupo detecta una RAÍZ partida en dos líneas por un formateador"
        status: pass
    human_judgment: false
  - id: D3
    description: "La decisión de Gate A (frasesSinAuditarDe) es una función pura exportada, no inline dentro de un it.each, lista para que el plan 09-35 la ejerza"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Criterio por raíces léxicas — frasesSinAuditarDe (5 tests de comportamiento)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cada excepción auditada en AFIRMACIONES_AUDITADAS nombra un fichero real que la respalda, comprobado por respaldoExiste; un motivo falso o circular ya no puede sellar un hueco"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Respaldo comprobable de cada excepción auditada — toda entrada de AFIRMACIONES_AUDITADAS tiene motivo y respaldo no vacíos, y el respaldo resuelve a un fichero real"
        status: pass
    human_judgment: false
  - id: D5
    description: "app/pages/[game]/index.vue —el fichero donde han vivido cinco de las ocho caras del defecto— no tiene ninguna excepción auditada, porque ya no contiene ninguna afirmación sobre los datos guardados del grupo"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Respaldo comprobable de cada excepción auditada — AFIRMACIONES_AUDITADAS no tiene ninguna clave para app/pages/[game]/index.vue; frasesSinAuditarDe sobre el contenido REAL devuelve []"
        status: pass
    human_judgment: false
  - id: D6
    description: "Gate B audita NOTICE_HEADING además de NOTICE_BODY (concatenación de entries, no spread); Gate C vigila también el literal 'success', el más peligroso de escribir a mano"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/afirmacionesRespaldadas.test.ts#Gate B — toda entrada de NOTICE_HEADING y de NOTICE_BODY...; Gate C — LITERALES_VARIANTE vigila también 'success'"
        status: pass
      - kind: manual_procedural
        ref: "Inyección temporal de const debugVariant = 'success' en app/components/HistorySavedNotice.vue, gate ejecutado en ROJO, revertido — ver sección 'Prueba manual de Gate C' de este SUMMARY"
        status: pass
    human_judgment: false

duration: 23min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 34: El gate de clase pasa de subcadenas cerradas a raíces léxicas, con respaldo comprobable Summary

**El vocabulario vigilado de `afirmacionesRespaldadas.test.ts` deja de ser una lista cerrada de 11 subcadenas y pasa a ser un conjunto de 10 raíces léxicas (con test de subsunción); la decisión de Gate A sale a `frasesSinAuditarDe`, cada excepción auditada lleva `{raiz, motivo, respaldo}` comprobado por gate, Gate B audita también los titulares y Gate C vigila `'success'`.**

## Performance

- **Duration:** ~23 min (commits entre 2026-09-19T01:00:59+02:00 y 01:14:19+02:00, más lectura/medición previa)
- **Started:** 2026-09-18T22:52:00Z
- **Completed:** 2026-09-18T23:15:00Z
- **Tasks:** 3
- **Files modified:** 2 (`afirmacionesRespaldadas.test.ts`, `app/pages/[game]/index.vue`)

## Re-medición real (el planificador pidió no copiar a ciegas)

**Estado de `AFIRMACIONES_AUDITADAS` al empezar este plan** (tras 09-32/09-33, antes de tocar nada): la entrada de `app/pages/[game]/index.vue` ya NO estaba — se había MOVIDO a `app/composables/useGameEndCopy.ts` en el plan 09-32 (Task 2, arreglo mínimo de Gate A), confirmado leyendo el fichero antes de actuar. Los dos renombres que el plan 09-32 reportó (`guardado`→`registrado`, `avisoProgresoNoComprobado`→`avisoLecturaNoComprobada`) también estaban presentes, confirmados por `grep`.

**Medición real de ficheros golpeados por el criterio de raíces nuevo, sobre el árbol tal como estaba tras 09-32/09-33** (antes de cualquier cambio de este plan): **8 ficheros**, no 7 — la propia `<flagged_assumptions>` del plan avisaba de que la lista de 7 era pre-09-32/33 y que había que re-medir:

```
AppHeader.vue                    → dispositivo
ContentChangedNotice.vue         → guardad
ResumePrompt.vue                 → guardad, progreso
VoiceUnavailableNotice.vue       → dispositivo
useGameEndCopy.ts                → guardad, progreso, se borrar
useHistorySavedNotice.ts         → guardad, guardar, dispositivo, reintent, no se ha perdido, no encontraréis
useProgressMismatchMark.ts       → guardad, progreso
useProgressMountPlan.ts          → guardad, guardar, dispositivo
app/pages/[game]/index.vue       → progreso  (¡residual!)
```

`app/pages/[game]/index.vue` SÍ tenía un hit residual bajo el criterio nuevo: la raíz `progreso` aparecía en el propio NOMBRE del ref `avisoProgresoAjeno` (plan 09-33) — ruido de identificador, no copy que el grupo lea. Siguiendo la Task 2 del plan (punto 3: "si el hit es ruido de código, el arreglo correcto es renombrar el identificador"), se renombró a `avisoDiscrepancia` en la Task 1 (documentado como deviation, ver más abajo) — necesario para que Task 1 pudiera dejar `npm test` en verde. Tras el renombre, el recuento final y definitivo es **8 ficheros, 0 residuales en `index.vue`**, exactamente el conjunto que quedó auditado en `AFIRMACIONES_AUDITADAS` (ver frontmatter `provides` y la sección de más abajo).

Este recuento de 8 (no 7) coincide exactamente con la aritmética que la propia `<flagged_assumptions>` predecía: 7 ficheros originales − 1 (`index.vue` cae a cero) + 2 (`useGameEndCopy.ts` y `useProgressMismatchMark.ts`, nuevos tras 09-32/09-33) = 8.

## Estado final de `AFIRMACIONES_AUDITADAS` (8 ficheros, 21 entradas `{raiz, motivo, respaldo}`)

| Fichero | Raíces auditadas | Respaldo |
|---|---|---|
| `app/components/ResumePrompt.vue` | guardad, progreso | `useProgressMountPlan.test.ts` |
| `app/components/ContentChangedNotice.vue` | guardad | `useProgressMountPlan.test.ts` |
| `app/composables/useGameEndCopy.ts` | guardad, progreso, se borrar | `useGameEndCopy.test.ts` |
| `app/composables/useHistorySavedNotice.ts` | dispositivo, guardad, guardar, reintent, no se ha perdido, no encontraréis | `avisoTrasRegistroFallido.test.ts` |
| `app/composables/useProgressMountPlan.ts` | guardad, guardar, dispositivo | `useProgressMountPlan.test.ts` |
| `app/components/AppHeader.vue` | dispositivo | `useVoiceAnnouncer.test.ts` |
| `app/components/VoiceUnavailableNotice.vue` | dispositivo | `useVoiceAnnouncer.test.ts` |
| `app/composables/useProgressMismatchMark.ts` | guardad, progreso | `useProgressMismatchMark.test.ts` |

`app/pages/[game]/index.vue` **no tiene clave** en `AFIRMACIONES_AUDITADAS` — confirmado por dos tests dedicados (ver Task 2 más abajo).

**Nota sobre `useHistorySavedNotice.ts`:** el motivo de esta entrada YA NO es circular. La ronda 8 (`09-VERIFICATION.md`) señaló que el motivo anterior ("la garantía real la da Gate B") delegaba sin decir en qué consistía la garantía. El respaldo nuevo (`avisoTrasRegistroFallido.test.ts`) es el test de COSTURA que recorre almacenamiento → autoridad → decisión → copy de punta a punta — un fichero concreto que EJERCE el camino, no otro gate del mismo fichero.

## Accomplishments

- **Task 1 — criterio por raíces + decisión extraída.** `RAICES_SOBRE_LOS_DATOS_DEL_GRUPO` (10 raíces) sustituye a `FRASES_SOBRE_LOS_DATOS_DEL_GRUPO` (11 subcadenas cerradas) como criterio de Gate A/B. `VOCABULARIO_CERRADO_HASTA_LA_RONDA_7` conserva las 11 subcadenas exactas SOLO como constante de comprobación, con un test de subsunción que demuestra mecánicamente que las 11 quedan cubiertas por al menos una raíz nueva — incluida la instancia real y sin detectar de la ronda 7 ("la app conservará el progreso para que podáis reintentarlo"). `normalizarEspacios` colapsa cualquier run de espacios en blanco antes de comparar, así que una copy partida en dos líneas por un formateador ya no evade el gate. `frasesSinAuditarDe(ruta, contenido)` — la decisión completa de Gate A — sale a una función pura exportada; el `it.each` de Gate A solo la llama, sin ninguna copia de la lógica.
- **Task 2 — respaldo comprobable.** `AFIRMACIONES_AUDITADAS` pasa de `Record<string, string[]>` a `Record<string, AfirmacionAuditada[]>` con `{raiz, motivo, respaldo}`. `respaldoExiste(ruta)` (gate nuevo) comprueba que cada `respaldo` resuelve a un fichero real de `app/` o `engine/` (glob propio, sin filtrar `__tests__` — el respaldo típico es justamente un test). Las 21 entradas re-medidas tienen motivo y respaldo comprobables; `app/pages/[game]/index.vue` confirmado sin excepción con un test explícito sobre su contenido REAL (vía el mismo glob de Gate A).
- **Task 3 — Gate B/Gate C ampliados, WR-10 cerrado.** Gate B recorre `[...Object.entries(NOTICE_HEADING), ...Object.entries(NOTICE_BODY)]` (concatenación de entries, NO el spread `{ ...NOTICE_HEADING, ...NOTICE_BODY }` que la propia verificación proponía y que habría descartado los cinco titulares por compartir claves). `LITERALES_VARIANTE` (promovido a ámbito de módulo) vigila también `'success'`. La cabecera de `FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO` corregida de "cuatro" a "CINCO" (WR-10), y el marcador `TODO(09-30)` de `useProgressMountPlan.ts` sustituido por su motivo definitivo.

## Prueba manual de Gate C (ejecutada, no dejada en el repo)

Siguiendo el acceptance criterion de la Task 3, se inyectó temporalmente `const debugVariant = 'success'` en `app/components/HistorySavedNotice.vue` (después de la línea `const { variant, heading, body, dismiss } = useHistorySavedNotice()`), se ejecutó `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts`, y el gate se puso ROJO con:

```
Error: app/components/HistorySavedNotice.vue nombra un literal de NoticeVariant ('failure-recoverable'/'failure-stale'/'failure-unrecoverable'/'failure-unknown'/'success') sin ser useHistorySavedNotice.ts, que es quien lo define. Escribir aquí una variante a mano en vez de obtenerla de planGameEnd es exactamente el gesto que este gate persigue (WR-03, 09-REVIEW.md ronda 6; ampliado a 'success' en el plan 09-34, vía (c) de 09-VERIFICATION.md ronda 8): afirmar sobre el dispositivo sin haber pasado por readStoredProgress, o pintar el éxito sin haber pasado por record().
```

Resultado: `1 failed | 68 passed (69)`. Revertido inmediatamente con `cp` desde una copia de respaldo; `git diff --stat -- app/components/HistorySavedNotice.vue` vacío antes del commit GREEN de la Task 3.

## Task Commits

Cada task siguió el ciclo RED → GREEN (sin REFACTOR: las implementaciones ya salieron limpias):

1. **Task 1: el criterio pasa de subcadenas cerradas a raíces léxicas, y la decisión sale a una función pura**
   - `59f53a7` (test) — RED: 2 tests fallan por assertion real contra los stubs de `normalizarEspacios`/`frasesSinAuditarDe`; `RED_EVIDENCE_OK` verificado con `gsd_run check tdd-red-evidence`.
   - `f4fb6f1` (feat) — GREEN: implementación real + `AFIRMACIONES_AUDITADAS` migrada a valores por raíz + renombre `avisoProgresoAjeno`→`avisoDiscrepancia` en `index.vue` (deviation, ver abajo). `npm test`: 954/954.
2. **Task 2: cada excepción auditada nombra un respaldo real, y un gate comprueba que existe**
   - `35978ba` (test) — RED: 1 test falla contra el stub de `respaldoExiste`; `RED_EVIDENCE_OK` verificado.
   - `5e20de0` (feat) — GREEN: `respaldoExiste` real + `AFIRMACIONES_AUDITADAS` migrada a `AfirmacionAuditada[]` con 21 entradas + tests de `index.vue` sin excepción. `npm test`: 959/959.
3. **Task 3: Gate B mira también los titulares, Gate C vigila `'success'`, y la lista de ficheros deja de contradecirse**
   - `4c2c3a5` (test) — RED: 1 test falla porque `LITERALES_VARIANTE` todavía no contiene `'success'`; `RED_EVIDENCE_OK` verificado.
   - `578eac5` (feat) — GREEN: `'success'` añadido, Gate B concatena `NOTICE_HEADING`+`NOTICE_BODY`, WR-10 cerrado, prueba manual ejecutada y revertida. `npm test`: 960/960.

**Plan metadata:** (commit de cierre de este plan, ver más abajo)

## Files Created/Modified

- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — el gate de clase completo, reescrito por raíces con respaldo comprobable (69 tests, antes 54)
- `app/pages/[game]/index.vue` — renombre `avisoProgresoAjeno`→`avisoDiscrepancia` (deviation, ver abajo)

## Decisions Made

- **Raíces en vez de la inversión completa del criterio** (`<alternativa_rechazada>` del plan): rechazada la propuesta de `09-REVIEW.md §WR-04`/`09-VERIFICATION.md` de exigir lista blanca de rótulos en TODO literal de plantilla de los 24 `.vue` de la app. La segunda mitad de esa propuesta (copy sobre datos persistidos sale a un `.ts` con test puro) ya se está aplicando donde importa (planes 09-32/09-33); la primera mitad tendría un coste que el propio patrón desaconseja (auditar cientos de literales que no afirman nada sobre los datos del grupo). El criterio por raíces consigue la cobertura que faltaba manteniendo la lista de excepciones auditable de verdad (8 ficheros, 21 entradas, medidas).
- **Concatenación de entries en Gate B, no spread**: ver key-decisions del frontmatter — la propia verificación proponía un `missing:` que habría sido un error (descartar los titulares al compartir claves con los cuerpos).
- **Renombre de identificador en vez de auditoría para el hit residual de `index.vue`**: siguiendo literalmente la Task 2 del plan, un hit de raíz que es ruido de código (el propio nombre de un `ref`) se arregla renombrando, no auditando — deja `index.vue` genuinamente sin necesitar ninguna excepción, en vez de una excepción que existiría solo para tapar un nombre de variable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Renombrado `avisoProgresoAjeno` → `avisoDiscrepancia` en `app/pages/[game]/index.vue`**
- **Found during:** Task 1, al re-medir el árbol con el criterio de raíces nuevo antes de escribir el GREEN.
- **Issue:** Bajo el criterio por raíces, el propio NOMBRE del `ref` `avisoProgresoAjeno` (introducido en el plan 09-33) contiene la raíz `progreso`, dejando `index.vue` con un hit sin auditar — el único fichero de los 9 candidatos que el plan pedía explícitamente dejar en cero (Task 2, punto 4: "el fichero donde han vivido cinco de las ocho caras del defecto no necesita ninguna excepción auditada").
- **Fix:** Renombrado el `ref` (y sus 3 usos) a `avisoDiscrepancia`, un nombre sin ninguna raíz vigilada. Es ruido de identificador, no copy que el grupo lea — exactamente el caso que la Task 2 del plan (punto 3) pide resolver renombrando, no auditando. Se adelantó a la Task 1 porque esa task exige la suite completa en verde al terminar (`type="tracer"`), y sin el renombre `index.vue` habría quedado en rojo entre Task 1 y Task 2.
- **Files modified:** `app/pages/[game]/index.vue` (líneas 161, 202, 827 — 3 ocurrencias, sin cambio de comportamiento)
- **Verification:** `npm test` → 954/954 tras el renombre; `npm run typecheck` → 0. Medición del criterio de raíces sobre `index.vue` tras el renombre: 0 hits.
- **Committed in:** `f4fb6f1` (parte del commit GREEN de la Task 1)

**2. [Documentado, no un fix — acceptance criterion del plan factualmente incompleto] El recuento literal de `grep -cE "TODO|FIXME|TBD|XXX|HACK"` sobre el fichero completo**
- **Found during:** Task 3, al verificar los criterios de aceptación tras el GREEN.
- **Issue:** El criterio dice que ese `grep` debe devolver 0 tras cerrar WR-10 (retirar el marcador `TODO(09-30)`). El marcador real SÍ se retiró (confirmado: 0 ocurrencias de las palabras como marcador de trabajo pendiente). Pero el `grep` es un `-cE` SIN límite de palabra sobre el fichero completo, y la constante `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO` — declarada desde el plan 09-26/09-30, usada 4 veces, sin relación alguna con este plan ni con WR-10 — contiene la subcadena literal "TODO" dentro de su propio nombre ("**TODO**S_LOS_ESTADOS..."). El recuento real, medido ANTES de que este plan tocara nada (`git show` del commit previo a la Task 1), ya era 5 (4 de `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO` + 1 del marcador real `TODO(09-30)`); tras retirar el marcador real, el recuento baja a 4, nunca a 0, porque los 4 restantes son inherentes a un identificador preexistente y fuera de alcance.
- **Por qué no se "arregla":** renombrar `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO` (usado en Gate B, sin relación con WR-10) para bajar un recuento de `grep` sería tocar código no relacionado solo para satisfacer un patrón de texto demasiado amplio — exactamente el tipo de sustitución que el `<phase_context>` de este dispatch prohíbe ("no se debilita ninguna aserción... no se edita código no relacionado para forzar que el número cuadre"). La intención real del criterio — que no quede ningún MARCADOR de trabajo pendiente sin cerrar — SÍ está satisfecha y comprobada con una versión de la misma expresión que respeta límites de palabra: `grep -cE "\bTODO\b|\bFIXME\b|\bTBD\b|\bXXX\b|\bHACK\b" app/composables/__tests__/afirmacionesRespaldadas.test.ts` → **0** (medido).
- **Files modified:** ninguno adicional — es un hallazgo sobre el propio texto del plan, mismo patrón que los hallazgos ya documentados en los `SUMMARY` de los planes 09-32 y 09-33.
- **Verification:** `grep -cE "TODO|FIXME|TBD|XXX|HACK" app/composables/__tests__/afirmacionesRespaldadas.test.ts` → 4 (medido, no narrado; era 5 antes de este plan). `grep -cE "\bTODO\b|\bFIXME\b|\bTBD\b|\bXXX\b|\bHACK\b" ...` → 0 (medido).
- **Committed in:** N/A (hallazgo, no cambio de código)

---

**Total deviations:** 1 auto-fixed (1 bloqueante, Rule 3) + 1 documentado sin fix (criterio de plan factualmente incompleto por falta de límite de palabra).
**Impact on plan:** El renombre de `avisoProgresoAjeno` era necesario para que `index.vue` quedara genuinamente sin excepción (el objetivo explícito de la Task 2) y para que la Task 1 (tracer) pudiera cerrar con la suite completa en verde; no cambia ningún comportamiento observable. El hallazgo sobre el `grep` de marcadores no afecta a la corrección de WR-10: el marcador real fue retirado y una versión con límite de palabra del mismo criterio confirma 0.

## Issues Encountered

- Mismo patrón que `09-32-SUMMARY.md`/`09-33-SUMMARY.md`: el reporter TAP por defecto de Vitest anida jerárquicamente y no produce las líneas de resumen `# tests`/`# pass`/`# fail` que `gsd_run check tdd-red-evidence` espera. Se repitió la misma solución: `npx vitest run --reporter=tap-flat`, seguido de las tres líneas de resumen calculadas por conteo real de `ok`/`not ok` del propio output. Las tres verificaciones RED de este plan devolvieron `RED_EVIDENCE_OK`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El plan 09-35 (Gate S ejerce la decisión de Gate A, vía (e) de `09-VERIFICATION.md` ronda 8) puede importar/ejercer `frasesSinAuditarDe` directamente: es una función pura exportada, sin ninguna lógica duplicada en el `it.each` de Gate A.
- El plan 09-36 (`.planning/**`) puede citar este SUMMARY y sus 6 commits al cerrar la ronda 8 de verificación de la fase, incluyendo las 8 entradas de `AFIRMACIONES_AUDITADAS` re-medidas y su respaldo comprobable.
- Recuento de tests del gate: 54 antes de este plan → 69 después (15 tests nuevos: 9 de la Task 1 sobre el criterio por raíces, 4 de la Task 2 sobre respaldo comprobable, 1 de la Task 3 sobre `'success'`, más el ajuste de los tests existentes de Gate A/B/S a las constantes nuevas).
- Ningún bloqueante nuevo. Las 14 filas de la sonda de bordes (`<flagged_assumptions>` del plan) siguen `unclassified`/`unresolved`, sin cambio en este plan.

## Self-Check: PASSED

- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` — FOUND, 69 tests, todos en verde
- `app/pages/[game]/index.vue` — FOUND, renombre confirmado (`grep -c avisoDiscrepancia` → 3, `grep -c avisoProgresoAjeno` → 0)
- Commits `59f53a7`, `f4fb6f1`, `35978ba`, `5e20de0`, `4c2c3a5`, `578eac5` — all FOUND in `git log --oneline --all`
- `npm test` — 960/960 passed
- `npm run typecheck` — exit 0
- Plan-level `<verification>`: `git diff -- package.json package-lock.json` vacío; `git diff --stat -- engine/` vacío; `git diff --stat` (desde `2374ea9`) muestra únicamente `afirmacionesRespaldadas.test.ts` y `app/pages/[game]/index.vue`, cada renombre nombrado arriba

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-19*
