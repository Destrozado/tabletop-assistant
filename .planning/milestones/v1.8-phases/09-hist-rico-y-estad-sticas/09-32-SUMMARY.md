---
phase: 09-hist-rico-y-estad-sticas
plan: 32
subsystem: ui
tags: [copywriting, vue, vitest, tdd, history-notice, game-end-dialog]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: readStoredProgress/esLaMismaPartida (plan 09-28), planGameEnd/StoredProgress (plan 09-26), planProgressMount (plan 09-29)
provides:
  - "NOTICE_BODY['failure-stale'] reescrita: ya no afirma anterioridad temporal ni diferencia de ronda, solo lo que esLaMismaPartida establece"
  - "app/composables/useGameEndCopy.ts: buildDiscardBody/buildEndGameBody como funciones puras con test propio, copy del diálogo de fin de partida sin promesa de reintento"
  - "isSuccessVariant(variant): única vía para que un .vue distinga el tono del aviso sin escribir NoticeVariant a mano"
  - "app/pages/[game]/index.vue: renombres guardado→registrado y avisoProgresoNoComprobado→avisoLecturaNoComprobada"
affects: [09-33, 09-34, 09-35, 09-36]

# Actuals (#2632)
actuals:
  tokens: 8081
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Copy sobre datos persistidos del grupo vive en un .ts con test puro (mismo patrón que NOTICE_BODY/useProgressMountPlan.ts), nunca como literal de plantilla ni computed inline en el SFC"
    - "Una comparación literal (variant === 'success') se centraliza en una única función exportada (isSuccessVariant) reutilizada internamente, en vez de repetirse en cada consumidor"

key-files:
  created:
    - app/composables/useGameEndCopy.ts
    - app/composables/__tests__/useGameEndCopy.test.ts
  modified:
    - app/composables/useHistorySavedNotice.ts
    - app/composables/__tests__/useHistorySavedNotice.test.ts
    - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
    - app/pages/[game]/index.vue
    - app/components/HistorySavedNotice.vue
    - app/composables/__tests__/afirmacionesRespaldadas.test.ts

key-decisions:
  - "Elegida la alternativa (A) del plan (retirar las afirmaciones no respaldadas) y rechazada (B) (motivo estructurado en esLaMismaPartida): (B) no arregla la afirmación de anterioridad, un 'motivo' único sería a su vez sin respaldo, multiplicaría la superficie de afirmación, y no cambiaría la acción del grupo — buildHistoryEntry solo lee round/context, así que en el escenario canónico el registro sería idéntico con o sin motivo"
  - "AFIRMACIONES_AUDITADAS (afirmacionesRespaldadas.test.ts) movida de app/pages/[game]/index.vue a app/composables/useGameEndCopy.ts: arreglo mínimo obligatorio por scope_boundary para dejar Gate A en verde tras mover la copy fuera del SFC (ver Deviations)"

requirements-completed: [HIST-06, HIST-09]

coverage:
  - id: D1
    description: "NOTICE_BODY['failure-stale'] ya no afirma anterioridad temporal ni diferencia de ronda; el test 5 de avisoTrasRegistroFallido.test.ts fija el contraejemplo (round igual, runtimeId distinto) en su escenario canónico"
    requirement: HIST-06
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySavedNotice.test.ts#failure-stale (plan 09-32) contiene la frase respaldada por esLaMismaPartida y ninguna otra"
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/avisoTrasRegistroFallido.test.ts#5. EL TEST DE LA RONDA 6/RONDA 7 (plan 09-32)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Diálogo de fin de partida (buildEndGameBody) deja de prometer un reintento contradicho en 2 de los 4 estados del dispositivo; su única promesa (el progreso no se borrará) está pinchada por un test puro"
    requirement: HIST-09
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useGameEndCopy.test.ts#2/3/4"
        status: pass
    human_judgment: false
  - id: D3
    description: "Copy del diálogo de fin de partida y del descarte sale del SFC (app/pages/[game]/index.vue) a useGameEndCopy.ts, con test puro"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useGameEndCopy.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Ningún componente .vue escribe a mano un literal de NoticeVariant: HistorySavedNotice.vue pregunta a isSuccessVariant(variant) en vez de comparar variant === 'success'"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useHistorySavedNotice.test.ts#isSuccessVariant (función pura, plan 09-32)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 32: Reescribir `failure-stale`, extraer `useGameEndCopy.ts`, `isSuccessVariant` Summary

**Reescritura de `NOTICE_BODY['failure-stale']` sin afirmar anterioridad ni ronda, extracción de la copy del diálogo de fin de partida a `useGameEndCopy.ts` con test puro, y `isSuccessVariant` como única vía para el tono del aviso — octava cara del defecto de fondo de la fase, cerrada.**

## Performance

- **Duration:** ~12 min (commits entre 2026-09-19T00:12:43+02:00 y 00:22:19+02:00, más el cierre de plan)
- **Started:** 2026-09-18T22:12:00Z
- **Completed:** 2026-09-18T22:26:00Z
- **Tasks:** 3
- **Files modified:** 8 (2 creados, 6 modificados)

## Accomplishments

- `NOTICE_BODY['failure-stale']` reescrita: las cuatro oraciones del texto nuevo se pueden señalar, una a una, a un hecho que `readStoredProgress`/`esLaMismaPartida` establecen. Retiradas las dos afirmaciones sin respaldo («una versión anterior» — anterioridad temporal imposible de afirmar porque `updatedAt` está excluido de la comparación; «no la ronda en la que habéis terminado» — falsa en el escenario canónico, donde la única diferencia real es `runtimeId` y las dos rondas son iguales). El test 5 de `avisoTrasRegistroFallido.test.ts` fija el contraejemplo por escrito: lee la posición en disco y la de la partida que termina, y afirma que sus `round` son iguales y sus `runtimeId` distintos.
- `app/composables/useGameEndCopy.ts` (nuevo, con test puro): `buildDiscardBody`/`buildEndGameBody` como funciones puras. `buildEndGameBody` deja de prometer «la app conservará el progreso para que podáis reintentarlo» — falsa en 2 de los 4 estados del dispositivo — y solo promete lo que `preserveProgress = !historyRecorded` garantiza en las cuatro salidas de `<GameOutcomeDialog>`. El comentario de veracidad rama por rama del `.vue` antiguo se traslada y corrige junto a la función.
- `app/pages/[game]/index.vue` ya no contiene copy propia sobre los datos guardados del grupo: los dos `computed` (`discardBody`/`endGameBody`) quedan reducidos a la llamada a `useGameEndCopy.ts`.
- `isSuccessVariant(variant)` exportado desde `useHistorySavedNotice.ts` (reutilizado internamente por `resolveAutoDismissMs`) y consumido por `HistorySavedNotice.vue`, que deja de escribir `variant === 'success'` a mano — el componente sigue sin decidir nada, solo pregunta.
- Dos renombres sin cambio de comportamiento en `index.vue`: `guardado` → `registrado` (es el resultado de `record()`, no de una escritura) y `avisoProgresoNoComprobado` → `avisoLecturaNoComprobada` (lo no comprobado es la LECTURA del dispositivo).

## Task Commits

Cada task siguió el ciclo RED → GREEN (sin REFACTOR: las implementaciones ya salieron limpias):

1. **Task 1: el camino completo de `failure-stale`, de la lectura fallida al texto que lee el grupo**
   - `18c02dc` (test) — RED: 5 aserciones nuevas fallan por assertion real contra el texto anterior.
   - `a19047b` (feat) — GREEN: `NOTICE_BODY['failure-stale']` reescrita; 37/37 tests en verde.
2. **Task 2: la copy del diálogo de fin de partida sale del SFC a un `.ts` con test puro**
   - `88ece21` (test) — RED: `useGameEndCopy.ts` como stub (cadena vacía) + 7 tests; 3 fallan por assertion real.
   - `e09f661` (feat) — GREEN: implementación real + cableado de `index.vue` + arreglo mínimo de Gate A/C (ver Deviations); 913/913 en verde.
3. **Task 3: ningún `.vue` decide el tono del aviso escribiendo a mano un literal de `NoticeVariant`**
   - `2638547` (test) — RED: 7 tests de `isSuccessVariant` fallan con `TypeError: isSuccessVariant is not a function`.
   - `4ed53f6` (feat) — GREEN: `isSuccessVariant` exportado y consumido por `HistorySavedNotice.vue`; 919/919 en verde.

**Plan metadata:** (pendiente — commit de cierre de este plan, ver más abajo)

## Files Created/Modified

- `app/composables/useGameEndCopy.ts` (nuevo) - `buildDiscardBody`/`buildEndGameBody`, copy del diálogo de fin de partida y del descarte como funciones puras con su comprobación de veracidad
- `app/composables/__tests__/useGameEndCopy.test.ts` (nuevo) - test puro de las dos funciones de arriba
- `app/composables/useHistorySavedNotice.ts` - `NOTICE_BODY['failure-stale']` reescrita + comentario justificativo; `isSuccessVariant` exportado
- `app/composables/__tests__/useHistorySavedNotice.test.ts` - 13 tests nuevos (6 de `failure-stale`, 7 de `isSuccessVariant`)
- `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` - test 5 ampliado con la aserción de texto que faltaba y el contraejemplo escrito (round igual, runtimeId distinto)
- `app/pages/[game]/index.vue` - `discardBody`/`endGameBody` reducidos a la llamada; renombres `guardado`→`registrado`, `avisoProgresoNoComprobado`→`avisoLecturaNoComprobada`
- `app/components/HistorySavedNotice.vue` - usa `isSuccessVariant(variant)` en vez de comparar `variant === 'success'`
- `app/composables/__tests__/afirmacionesRespaldadas.test.ts` - entrada de `AFIRMACIONES_AUDITADAS` movida de `index.vue` a `useGameEndCopy.ts` (arreglo mínimo de gate, ver Deviations)

## Decisions Made

- **Alternativa (A) elegida sobre (B)** (`<alternativa_rechazada>` del plan): retirar las afirmaciones sin respaldo de `failure-stale` en vez de hacer que `esLaMismaPartida` devuelva un motivo estructurado. (B) no arregla la afirmación de anterioridad (necesita `updatedAt`, excluido por escrito), un motivo único sería a su vez una afirmación sin respaldo cuando varios campos difieren a la vez, multiplicaría por seis la superficie de afirmación, y no cambiaría la acción del grupo — `buildHistoryEntry` solo lee `round`/`context`, así que en el escenario canónico (solo difiere `runtimeId`) el registro sería idéntico con o sin motivo.
- **Sin caché ni memoización nueva**: ambas funciones de `useGameEndCopy.ts` son puras sobre `savedSummary`, sin estado de módulo — mismo criterio que el resto del fichero de composables de copy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `afirmacionesRespaldadas.test.ts` (Gate A y Gate C) se puso en rojo al mover la copy fuera del SFC; arreglo mínimo aplicado dentro de este plan por autorización explícita del `scope_boundary`**

- **Found during:** Task 2, tras cablear `index.vue` y ejecutar `npm test`.
- **Issue:** Dos gates existentes (`app/composables/__tests__/afirmacionesRespaldadas.test.ts`, que el `scope_boundary` de este plan asigna al plan 09-34) se rompieron como consecuencia directa de mover la copy:
  - **Gate C** (`normalizarComillas` + `LITERALES`): el comentario nuevo de `useGameEndCopy.ts` usaba backticks alrededor de las palabras sueltas `` `absent` `` y `` `stale` ``, que tras normalizar comillas se leen como los literales vigilados de `StoredProgress`.
  - **Gate A** (`AFIRMACIONES_AUDITADAS`): la entrada auditada `'app/pages/[game]/index.vue': ['se borrará', 'progreso guardado']` dejó de aplicar porque esas frases ya no viven en ese fichero — ahora viven, literalmente, en `useGameEndCopy.ts`, que no estaba en el mapa.
- **Fix:** (a) reescrita la prosa del comentario de `useGameEndCopy.ts` sin backticks alrededor de los nombres de estado sueltos (se sustituyó por descripciones en prosa: "sin nada reanudable", "un autoguardado que no coincide con el punto de fin de partida"); (b) movida la entrada de `AFIRMACIONES_AUDITADAS` de `'app/pages/[game]/index.vue'` a `'app/composables/useGameEndCopy.ts'`, con el motivo actualizado para referenciar las funciones nuevas (`buildDiscardBody`/`buildEndGameBody`). La entrada de `index.vue` se sustituyó en vez de duplicarse: `grep -n "se borrará\|progreso guardado" 'app/pages/[game]/index.vue'` confirma 0 coincidencias tras el cambio, así que dejar la entrada vieja habría sido una excepción sin uso, no una excepción real.
- **Files modified:** `app/composables/useGameEndCopy.ts` (prosa del comentario), `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (entrada del mapa movida)
- **Verification:** `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts` → 53/53 en verde. `npm test` → 913/913 tras este fix (Task 2), 919/919 tras Task 3.
- **Committed in:** `e09f661` (parte del commit GREEN de Task 2, según instruye el `scope_boundary`: "el arreglo MÍNIMO... entra aquí y se anota literalmente en el SUMMARY")

**2. [Documentado, no un fix — acceptance criterion del plan factualmente incorrecto] El criterio de aceptación sobre el recuento de "reintentar" en `useHistorySavedNotice.ts`**

- **Found during:** Task 1, al verificar los criterios de aceptación tras el GREEN.
- **Issue:** El criterio dice: `grep -v "^\s*//" app/composables/useHistorySavedNotice.ts | grep -c "reintentar"` devuelve 1 — la ÚNICA aparición fuera de comentarios es la de `failure-recoverable`. La medición real, tanto ANTES como DESPUÉS del cambio de este plan, es **3**: `failure-recoverable` ("reintentar el registro"), `failure-unrecoverable` ("no hay nada que **reintentar**") y `failure-unknown` ("reintentar el registro") contienen las tres la palabra — ninguna de las tres se toca en este plan (el `scope_boundary` prohíbe cambiar ni un carácter de las otras cuatro entradas de `NOTICE_BODY`). El criterio del plan parece haber contado solo la entrada `failure-recoverable` sin tener en cuenta que `failure-unrecoverable`/`failure-unknown` también usan la palabra (en formas distintas: instrucción de reintento vs. negación de que haya algo que reintentar).
- **Por qué no se "arregla":** arreglarlo requeriría o bien reescribir las otras cuatro entradas de `NOTICE_BODY` (prohibido por el `scope_boundary` de este mismo plan) o bien debilitar el propio criterio de aceptación (prohibido por el `<phase_context>` de este dispatch: "no se debilita ninguna aserción para que pase"). El intento real —que `failure-stale` no ordene ningún reintento— SÍ está satisfecho y fijado por una aserción de test dedicada y correcta: `expect(NOTICE_BODY['failure-stale']).not.toMatch(/reintentar/i)` (test añadido en Task 1), que pasa.
- **Files modified:** ninguno — es un hallazgo sobre el propio texto del plan, no una acción de código.
- **Verification:** `grep -v "^\s*//" app/composables/useHistorySavedNotice.ts | grep -c "reintentar"` → 3 (medido, no narrado). `npx vitest run app/composables/__tests__/useHistorySavedNotice.test.ts` → pasa la aserción real (`not.toMatch(/reintentar/i)` sobre `failure-stale` específicamente).
- **Committed in:** N/A (hallazgo, no cambio de código)

---

**Total deviations:** 1 auto-fixed (1 bloqueante, Rule 3) + 1 documentado sin fix (criterio de plan incorrecto).
**Impact on plan:** El arreglo de Gate A/C era obligatorio para no dejar la suite en rojo y estaba explícitamente autorizado por el `scope_boundary` del propio plan; no amplía el alcance de este plan más allá de mantener los gates existentes coherentes con el movimiento de código que este plan ya hacía. El hallazgo sobre el criterio de "reintentar" no cambia ningún comportamiento: la intención real del criterio (que `failure-stale` no ordene reintento) está satisfecha y probada; solo su recuento literal, tal como está escrito en el `.md` del plan, no corresponde a los datos reales de un fichero que este plan no tiene permiso de tocar en sus otras cuatro entradas.

## Issues Encountered

- El gate `check tdd-red-evidence` de `gsd-tools` está construido para el formato TAP de `node --test` (`# tests N`/`# pass N`/`# fail N` a nivel de línea, `ok N - nombre` sin indentar). El reporter TAP por defecto de Vitest anida jerárquicamente (indentado, sin líneas de resumen `# tests/pass/fail`), así que no es compatible tal cual. Solución aplicada en las tres tareas: usar `npx vitest run --reporter=tap-flat` (que sí produce `ok N - <nombre completo>` sin indentar) y añadir manualmente las tres líneas de resumen `# tests`/`# pass`/`# fail` calculadas por conteo real de líneas `ok`/`not ok` del propio output —nunca inventadas— antes de pasar el registro a `gsd_run check tdd-red-evidence`. Las tres verificaciones devolvieron `RED_EVIDENCE_OK`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El plan 09-33 (marca en memoria del snapshot que no coincide y aviso de `ResumePrompt`) puede apoyarse en la copy ya corregida de `failure-stale` sin heredar ninguna de las dos afirmaciones retiradas.
- El plan 09-34 (gate de clase `afirmacionesRespaldadas.test.ts`) puede extender Gate C a `'success'` sin abrir ninguna excepción nueva: `HistorySavedNotice.vue` ya no nombra ningún literal de `NoticeVariant`. La entrada de `AFIRMACIONES_AUDITADAS` para la copy del diálogo de fin de partida ya apunta al fichero correcto (`useGameEndCopy.ts`), así que 09-34 no tiene que descubrir ese desplazamiento por su cuenta.
- El plan 09-36 (`.planning/**`) puede citar este SUMMARY y sus commits al cerrar la ronda 8 de verificación de la fase.
- Ningún bloqueante nuevo. La comprobación humana pendiente sobre el solape visual de `UpdateBanner`/`HistorySavedNotice` en tablet real (DEV-02, registrada en `<flagged_assumptions>` del plan) sigue abierta — este plan no la tocaba ni la daba por resuelta.

## Self-Check: PASSED

- `app/composables/useGameEndCopy.ts` — FOUND
- `app/composables/__tests__/useGameEndCopy.test.ts` — FOUND
- Commits `18c02dc`, `a19047b`, `88ece21`, `e09f661`, `2638547`, `4ed53f6` — all FOUND in `git log --oneline --all`
- `npm test` — 919/919 passed
- `npm run typecheck` — exit 0
- Plan-level `<verification>`: `git diff -- package.json package-lock.json` empty, `git diff --stat -- engine/` empty, `grep -rEi "firestore|firebase" app/ engine/` no matches

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-19*
