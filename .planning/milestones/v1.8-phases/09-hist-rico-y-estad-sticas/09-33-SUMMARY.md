---
phase: 09-hist-rico-y-estad-sticas
plan: 33
subsystem: ui
tags: [tdd, vue, vitest, resume-prompt, history-notice, module-state]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: readStoredProgress/StoredProgress (plan 09-25/09-28), planGameEnd/GameEndPlan (plan 09-26), NOTICE_BODY['failure-stale'] reescrita (plan 09-32)
provides:
  - "app/composables/useProgressMismatchMark.ts: marca en memoria por gameId (segunda excepción de estado de módulo en app/composables/, tras useHistorySavedNotice.ts) que transporta la discrepancia comprobada al cerrar una partida hasta el modal de reanudación, sin escribir nada en el dispositivo"
  - "GameEndPlan.progressMismatch (useHistorySavedNotice.ts): planGameEnd es el único productor de esta decisión, calculada como !historyRecorded && stored === 'stale'"
  - "ResumePrompt.vue: prop opcional mismatchWarning, pintada sin copy propia y sin región de accesibilidad añadida"
  - "app/pages/[game]/index.vue cableado en los cuatro puntos: onOutcomeRecorded (poner/retirar), finishGame y onDiscardConfirm (retirar al borrar el progreso), onMounted (leer hacia el modal)"
affects: [09-34, 09-36]

# Actuals (#2632)
actuals:
  tokens: 6320
  tasks: 3
  commits: 5

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Segunda excepción de estado de módulo en app/composables/ (la primera es useHistorySavedNotice.ts): quien pone un hecho y quien lo lee son invocaciones distintas del mismo componente de página, así que un ref no basta"
    - "Decisión deliberada de NO persistir un hecho de interfaz en localStorage cuando ponerlo implicaría una tercera escritura justo después de que dos escrituras seguidas ya hayan fallado — documentado como límite aceptado, no disfrazado"
    - "Texto de aviso con comprobación de respaldo oración a oración escrita justo encima de la constante, con tests dedicados por cada aserción positiva y negativa (mismo patrón que NOTICE_BODY['failure-stale'], plan 09-32)"

key-files:
  created:
    - app/composables/useProgressMismatchMark.ts
    - app/composables/__tests__/useProgressMismatchMark.test.ts
  modified:
    - app/composables/useHistorySavedNotice.ts
    - app/composables/__tests__/useHistorySavedNotice.test.ts
    - app/components/ResumePrompt.vue
    - app/pages/[game]/index.vue

key-decisions:
  - "Estado de módulo (Set<string>) en vez de localStorage para la marca de discrepancia: 'stale' solo es alcanzable cuando el registro en el histórico Y el guardado de cierre ya han fallado, así que una tercera escritura ahí sería la operación menos fiable del sistema — una marca que no se puede escribir en su propio escenario no es una mitigación. Se acepta como límite explícito (deuda del plan 09-36) que una recarga completa del navegador pierde la marca; cuando no está, la app no afirma nada."
  - "Texto provisional en la Task 1 (GREEN), texto definitivo con respaldo oración a oración en la Task 3 (su propio ciclo RED→GREEN): mantiene el RED de la Task 3 genuino en vez de precomputar el texto final desde el principio, que habría producido un 'unexpected GREEN' en esa tarea."

requirements-completed: [HIST-04, HIST-06, HIST-09]

coverage:
  - id: D1
    description: "El modal de reanudación (ResumePrompt) muestra un aviso cuando el último cierre de esta partida comprobó que el progreso guardado no correspondía al punto de fin de partida, en vez de volver a ofrecer 'CONTINUAR' sin ninguna marca"
    requirement: HIST-04
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useProgressMismatchMark.test.ts#useProgressMismatchMark — camino completo (Task 1, plan 09-33)"
        status: pass
      - kind: unit
        ref: "app/composables/__tests__/useProgressMismatchMark.test.ts#useProgressMismatchMark — tabla de verdad completa del ciclo de vida (Task 2, plan 09-33)"
        status: pass
    human_judgment: true
    rationale: "El cableado de index.vue/ResumePrompt.vue (onMounted → readProgressMismatchWarning → prop → v-if en el modal real) no tiene test de componente montado en este repo (el proyecto app-logic de Vitest no monta componentes); la lógica pura que decide y transporta el aviso está 100% cubierta por test, pero que el modal lo pinte correctamente en pantalla es responsabilidad del checkpoint humano de fin de fase."
  - id: D2
    description: "La marca no escribe nada en el dispositivo: es estado de módulo en memoria, documentado por qué (dos escrituras ya fallidas) y qué límite acepta (una recarga completa la pierde)"
    requirement: HIST-09
    verification:
      - kind: unit
        ref: "grep -c localStorage app/composables/useProgressMismatchMark.ts → 0 (plan-level <verification>)"
        status: pass
    human_judgment: false
  - id: D3
    description: "La marca se retira en cuanto deja de ser cierta: progreso borrado (finishGame/onDiscardConfirm) o un cierre posterior sin discrepancia (el else obligatorio de onOutcomeRecorded)"
    requirement: HIST-06
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useProgressMismatchMark.test.ts#5,6,7,9 (Task 2)"
        status: pass
    human_judgment: false
  - id: D4
    description: "El texto del aviso tiene prohibidas por aserción negativa las tres afirmaciones que 09-VERIFICATION.md ronda 7 encontró sin respaldo (anterioridad, diferencia de ronda, instrucción de reintento)"
    verification:
      - kind: unit
        ref: "app/composables/__tests__/useProgressMismatchMark.test.ts#PROGRESS_MISMATCH_WARNING — respaldo oración a oración (Task 3, plan 09-33)"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 33: Marca en memoria de discrepancia + aviso en ResumePrompt Summary

**Una marca en memoria (`Set<string>` por gameId, nunca `localStorage`) transporta desde el cierre de partida hasta el modal de reanudación el hecho, ya comprobado, de que el progreso guardado no corresponde al punto de fin de partida — cierre del tercer hallazgo de SC3 en `09-VERIFICATION.md` ronda 7.**

## Performance

- **Duration:** ~10 min (commits entre 2026-09-18T22:39:24Z y 2026-09-18T22:46:17Z)
- **Started:** 2026-09-18T22:37:00Z
- **Completed:** 2026-09-18T22:47:00Z
- **Tasks:** 3
- **Files modified:** 6 (2 creados, 4 modificados)

## Accomplishments

- `app/composables/useProgressMismatchMark.ts` (nuevo, con test puro): `markProgressMismatch`/`clearProgressMismatch`/`readProgressMismatchWarning` sobre un `Set<string>` de módulo — segunda excepción de estado de módulo en `app/composables/` (la primera es `useHistorySavedNotice.ts`, citada por el mismo razonamiento). Documenta por escrito por qué NO se persiste en `localStorage`: la marca solo es alcanzable cuando el registro en el histórico Y el guardado de cierre ya han fallado, así que una tercera escritura ahí sería la operación menos fiable del sistema — y acepta el límite resultante (una recarga completa del navegador la pierde) como deuda explícita del plan 09-36, no como algo disfrazado.
- `GameEndPlan.progressMismatch` (`useHistorySavedNotice.ts`): `planGameEnd` sigue siendo el único productor de la decisión de fin de partida — ahora incluye si hubo discrepancia, calculada como `!historyRecorded && stored === 'stale'`, con tabla de verdad total sobre los ocho pares registro×dispositivo.
- `app/pages/[game]/index.vue` cableado en los cuatro puntos exactos que el plan pedía: `onOutcomeRecorded` pone o retira la marca en el mismo instante en que `planGameEnd` decide (el `else` es obligatorio: un cierre posterior sin discrepancia debe retirar una marca anterior); `finishGame` y `onDiscardConfirm` la retiran cuando el progreso que describen se borra; `onMounted` la lee hacia `avisoProgresoAjeno`, pasado como prop a `ResumePrompt`.
- `ResumePrompt.vue` gana la prop opcional `mismatchWarning`, pintada con un `<p v-if>` ANTES del párrafo de decisión, sin copy propia (el texto llega ya decidido) y sin añadir ninguna región de accesibilidad nueva — el modal, `role="dialog" aria-modal="true"`, ya se anuncia entero al aparecer.
- `PROGRESS_MISMATCH_WARNING`: texto final con comprobación de respaldo oración a oración, y tres aserciones negativas dedicadas (`anterior`, `la ronda`, cualquier forma de `reintentar`) que blindan contra las tres afirmaciones que la ronda 7 encontró sin respaldo en `failure-stale`.

**Comprobación de la suposición de navegación** (`<flagged_assumptions>` del plan): `nuxt.config.ts` declara `ssr: true` + `nitro.prerender` (SSG/prerender, nunca `ssr: false`/SPA) — cada ruta prerenderizada tiene su propio HTML, pero la navegación DESPUÉS de la hidratación la resuelve `vue-router` en cliente. La propia página ya dependía de esto antes de este plan: `navigateTo('/')` en `finishGame()` y en `@back` del mini-setup son navegación de cliente sin recarga, y `grep -rn "external: true" app/` no encuentra ningún resultado en todo el repo — ningún punto de la app fuerza una navegación de documento completo. El recorrido `/{juego}` → `/` → `/{juego}` es, por tanto, tres navegaciones de `vue-router`, nunca una carga completa del documento: el estado de módulo de `useProgressMismatchMark.ts` sobrevive intacto. No se comprobó con `npm run dev` en un navegador real (entorno de ejecución sin navegador disponible); la comprobación es por razonamiento directo desde la configuración y el código ya existente, tal como el propio `<flagged_assumptions>` del plan permite.

## Task Commits

1. **Task 1: un solo camino completo — la discrepancia comprobada al cerrar llega al modal de reanudación** (tracer, TDD)
   - `41b60b6` (test) — RED: `useProgressMismatchMark.ts` como stub (`markProgressMismatch` no añade nada al conjunto) + `GameEndPlan.progressMismatch` real + 2 tests del camino completo; ambos fallan por assertion real (`readProgressMismatchWarning` devuelve `null` en vez del aviso) — `RED_EVIDENCE_OK` verificado con `gsd_run check tdd-red-evidence`.
   - `e2f9de6` (feat) — GREEN: `markProgressMismatch` completo, documentación íntegra del fichero, y cableado de los cuatro puntos de `index.vue` + la prop de `ResumePrompt.vue`. `npm test`: 922/922. `npm run typecheck`: 0.
   - Tracer feedback gate: `<verify>` (solo automatizado, `HUMAN_VERIFY_MODE=end-of-phase`) re-ejecutado tras el GREEN — pasa, `⚡ Tracer verified end-to-end — expanding`, sin checkpoint.
2. **Task 2: las dos tablas de verdad — cuándo hay discrepancia y cuándo hay marca** (auto, TDD)
   - `2be6981` (test) — 9 tests nuevos (tabla total de `progressMismatch` sobre los ocho pares registro×dispositivo, y ciclo de vida completo de la marca: estado inicial, poner/leer, retirar, idempotencia, retirada de lo inexistente, aislamiento entre dos `gameId`). Los 9 pasan sin ningún cambio de producción — ver "TDD Gate Compliance" más abajo.
3. **Task 3: el texto del aviso, oración a oración, contra lo que la app comprobó de verdad** (auto, TDD)
   - `857b6db` (test) — RED: 6 tests nuevos sobre `PROGRESS_MISMATCH_WARNING`; los 3 positivos fallan contra el texto provisional de la Task 1 — `RED_EVIDENCE_OK` verificado.
   - `9571a46` (feat) — GREEN: texto definitivo + comprobación de respaldo oración a oración. `npm test`: 945/945. `npm run typecheck`: 0.

**Plan metadata:** (pendiente — commit de cierre de este plan, ver más abajo)

## Files Created/Modified

- `app/composables/useProgressMismatchMark.ts` (nuevo) - marca en memoria por `gameId`, texto del aviso con respaldo oración a oración
- `app/composables/__tests__/useProgressMismatchMark.test.ts` (nuevo) - 15 tests: camino completo, ciclo de vida total, respaldo del texto
- `app/composables/useHistorySavedNotice.ts` - `GameEndPlan.progressMismatch` + su cálculo en `planGameEnd`
- `app/composables/__tests__/useHistorySavedNotice.test.ts` - 8 tests nuevos de la tabla de verdad de `progressMismatch`
- `app/components/ResumePrompt.vue` - prop opcional `mismatchWarning`, renderizada sin copy propia
- `app/pages/[game]/index.vue` - cableado en `onOutcomeRecorded`/`finishGame`/`onDiscardConfirm`/`onMounted`, y `:mismatch-warning` en el uso de `<ResumePrompt>`

## Decisions Made

- **Estado de módulo, no `localStorage`**, para la marca: justificada en detalle en el propio fichero y en el `<objective>` del plan — dos escrituras (histórico y guardado de cierre) ya han fallado en el instante en que la marca se pone; una tercera ahí sería la operación menos fiable del sistema.
- **Texto provisional en la Task 1, definitivo en la Task 3**: mantiene el ciclo RED→GREEN de la Task 3 genuino (los 3 tests positivos fallan de verdad contra el texto provisional) en vez de escribir el texto final desde el principio, que habría producido un "unexpected GREEN" prohibido por las Fail-Fast Rules de TDD.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Comentarios que citaban literalmente `localStorage` y `role="status"` rompían las propias comprobaciones de aceptación de la Task 1**
- **Found during:** Task 1, al verificar los criterios de aceptación tras el primer GREEN.
- **Issue:** El criterio de aceptación (`grep -c "localStorage\|usePersistedSession\|window\." app/composables/useProgressMismatchMark.ts` → 0) y el de `ResumePrompt.vue` (`grep -c 'role="status"'` → 0) son `grep` planos sobre el fichero completo, sin distinguir comentario de código — a diferencia de los gates de `afirmacionesRespaldadas.test.ts`, que sí aplican `quitarComentarios` antes de comparar. Los comentarios explicativos que el propio plan pide escribir ("Por qué NO va a `localStorage`", "por qué NO lleva `role=\"status\"`") contenían, literalmente, esas mismas cadenas, y los criterios fallaban aunque el código en sí fuera correcto.
- **Fix:** Reescritos ambos comentarios en prosa sin usar las cadenas literales vigiladas ("el almacenamiento persistente del navegador" en vez de `localStorage`; descripción sin la sintaxis `role="status"` en vez de nombrarlo literalmente), sin perder ningún contenido explicativo.
- **Files modified:** `app/composables/useProgressMismatchMark.ts`, `app/components/ResumePrompt.vue`
- **Verification:** los dos `grep` pasan a devolver 0; `npm test` y `npm run typecheck` siguen en verde.
- **Committed in:** `e2f9de6` (parte del commit GREEN de la Task 1)

**2. [Documentado, no un fix — acceptance criterion del plan factualmente impreciso] El recuento exacto de `afterEach` en `useProgressMismatchMark.test.ts`**
- **Found during:** Task 2, al verificar los criterios de aceptación.
- **Issue:** El criterio dice `grep -c "afterEach" ... devuelve 1`. Con el import nombrado (`import { afterEach, describe, expect, it } from 'vitest'`, mismo estilo que `useHistorySavedNotice.test.ts` y el resto del repo) más la propia invocación `afterEach(() => {...})`, el recuento estructuralmente mínimo es 2 líneas — una menos exigiría un `import * as vitest` inusual solo para bajar un recuento de `grep`, contrario a la convención ya establecida en el repo.
- **Por qué no se "arregla":** arreglarlo de verdad requeriría escribir código no idiomático solo para satisfacer un `grep` literal, exactamente el tipo de sustitución que el criterio pretendía evitar en primer lugar (que exista un enganche de limpieza real). Se redujeron los usos superfluos del término en comentarios (de 4 a 2) para acercarse al recuento pedido sin sacrificar legibilidad ni convención.
- **Files modified:** ninguno adicional — es un hallazgo sobre el propio texto del plan, mismo patrón que el hallazgo 2 del SUMMARY del plan 09-32.
- **Verification:** `grep -c "afterEach" app/composables/__tests__/useProgressMismatchMark.test.ts` → 2 (medido, no narrado); el enganche de limpieza existe y funciona (los tests de aislamiento del Task 2 lo confirman).
- **Committed in:** N/A (hallazgo, no cambio de código adicional)

---

**Total deviations:** 1 auto-fixed (1 crítico, Rule 2) + 1 documentado sin fix (criterio de plan factualmente impreciso).
**Impact on plan:** El arreglo de los comentarios era necesario para que los propios criterios de aceptación del plan pasaran sin perder ningún contenido explicativo pedido por el plan; no cambia ningún comportamiento. El hallazgo sobre `afterEach` no afecta a la corrección del enganche de limpieza en sí, solo al recuento literal de un `grep` que no puede llegar a exactamente 1 con código idiomático.

## TDD Gate Compliance

- **Task 1** (tracer, TDD): RED (`41b60b6`) → GREEN (`e2f9de6`). Completo, sin violación.
- **Task 2** (auto, TDD): solo commit `test` (`2be6981`) — **sin commit `feat` correspondiente, por diseño, no por omisión**. Los 9 tests nuevos verifican la tabla de verdad completa de `progressMismatch` (ocho pares registro×dispositivo) y el ciclo de vida completo de la marca (idempotencia, retirada segura, aislamiento entre `gameId`); TODOS pasaron en su primera ejecución, sin ningún cambio de código de producción. Esto no es un "unexpected GREEN" en el sentido que la Fail-Fast Rule 1 previene (una funcionalidad que "ya existía por accidente" sin que nadie se percatara): es la consecuencia estructural, inevitable y deliberada de las dos estructuras de datos que la Task 1 ya implementó correctamente — un `Set<string>` garantiza por construcción la idempotencia de `add`, la seguridad de `delete` sobre una clave ausente, y el aislamiento entre claves distintas; una fórmula booleana simple (`!historyRecorded && stored === 'stale'`) sobre un tipo de cuatro valores es, por definición, total. No existe una versión "parcialmente correcta" de ninguna de las dos que pasara menos pruebas — cualquier implementación correcta de la Task 1 ya satisfacía estas propiedades. Se documenta aquí en vez de forzar un cambio de producción artificial solo para producir un commit `feat`.
- **Task 3** (auto, TDD): RED (`857b6db`) → GREEN (`9571a46`). Completo, sin violación — este es el ciclo TDD "de libro" del plan: 3 aserciones positivas fallan contra el texto provisional, pasan tras fijar el texto definitivo.

## Issues Encountered

- Mismo hallazgo que `09-32-SUMMARY.md` documentó para `check tdd-red-evidence`: el reporter TAP por defecto de Vitest anida jerárquicamente y no produce las líneas de resumen `# tests`/`# pass`/`# fail` que el gate espera. Se repitió la misma solución: `npx vitest run --reporter=tap-flat`, seguido de las tres líneas de resumen calculadas por conteo real de `ok`/`not ok` del propio output. Las dos verificaciones de este plan (RED de la Task 1 y RED de la Task 3) devolvieron `RED_EVIDENCE_OK`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El plan 09-34 (gate de clase `afirmacionesRespaldadas.test.ts`) puede citar `useProgressMismatchMark.ts` como un fichero más que NO nombra ningún literal de `StoredProgress`/`NoticeVariant` a mano — comprobado por los tres tests de Gate C, que siguen en verde sin necesidad de añadir esta ruta a ninguna lista de excepción.
- El plan 09-36 (`.planning/**`) puede citar este SUMMARY y sus commits al cerrar la ronda 8 de verificación de la fase, y en particular la limitación aceptada por escrito (una recarga completa del navegador pierde la marca) como deuda explícita que ese plan documenta.
- La comprobación de la suposición de navegación (`<flagged_assumptions>`) se hizo por razonamiento desde la configuración y el código existente, no observando el recorrido real en un navegador — si `/gsd-verify-work` de esta fase dispone de un navegador, sería la comprobación humana adicional más barata de ejecutar antes de cerrar la ronda 8 por completo.
- Ningún bloqueante nuevo.

## Self-Check: PASSED

- `app/composables/useProgressMismatchMark.ts` — FOUND
- `app/composables/__tests__/useProgressMismatchMark.test.ts` — FOUND
- Commits `41b60b6`, `e2f9de6`, `2be6981`, `857b6db`, `9571a46` — all FOUND in `git log --oneline --all`
- `npm test` — 945/945 passed
- `npm run typecheck` — exit 0
- Plan-level `<verification>`: `git diff -- package.json package-lock.json` empty, `git diff --stat -- engine/` empty, `grep -rEi "firestore|firebase" app/ engine/` no matches, `grep -c "localStorage" app/composables/useProgressMismatchMark.ts` → 0

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-19*
