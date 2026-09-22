---
phase: 09-hist-rico-y-estad-sticas
plan: 40
subsystem: docs
tags: [documentacion, evaluacion-de-riesgo, trazabilidad, cierre-de-ronda]

requires:
  - phase: 09-hist-rico-y-estad-sticas (planes 09-37, 09-38, 09-39)
    provides: gate de invariantes de ciclo de vida de estado de módulo, huella del referente que cierra CR-01/WR-01 en producción, cierre de WR-02/WR-03 del mecanismo de excepción auditada
provides:
  - Evaluación de riesgo de la marca en memoria (deferred-items.md) reescrita distinguiendo Caso A (la marca se pierde) de Caso B (la marca persiste cuando ya no es cierta), con el mecanismo y las rutas que hacen el Caso B imposible por construcción
  - Camino de pérdida nuevo (updatedAt en la huella) registrado como coste conocido, con alternativa considerada
  - Párrafo «Ronda 8» en REQUIREMENTS.md y filas de trazabilidad HIST-04/HIST-06 sincronizadas con los planes 09-37..09-40, sin cerrar HIST-06
  - Guion de DEV-02 ampliado con el punto del aviso de discrepancia dentro de ContentChangedNotice.vue, sin marcarlo como realizado
  - Nota de cierre (ronda 8, planes 09-37..09-40) en deferred-items.md, con los seis hallazgos nombrados uno a uno y el párrafo de anti-recurrencia comprobable
affects: []

actuals:
  tokens: 9500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Evaluación de riesgo que distingue explícitamente el caso aceptado del caso inaceptable, nombrando el mecanismo y la ruta que hace el segundo imposible por construcción, en vez de una garantía absoluta sin respaldo"

key-files:
  modified:
    - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "La evaluación de riesgo de la marca en memoria se corrige, no se reescribe entera: se conservan las viñetas que seguían siendo ciertas (por qué no se escribe en localStorage, qué cubre la navegación de cliente) y solo se sustituye la conclusión final, que garantizaba en términos absolutos algo que el mecanismo previo no sostenía."
  - "HIST-06 NO se marca como completado en REQUIREMENTS.md por este plan — su propio scope_boundary lo prohíbe explícitamente. El párrafo Ronda 8 y las filas de trazabilidad registran lo que el lote 09-37..09-40 cierra, pero terminan diciendo por escrito que la confirmación queda para una ronda de verificación independiente."
  - "DEV-02 gana un punto de guion nuevo (el aviso de discrepancia dentro de ContentChangedNotice.vue) sin que eso implique que la comprobación se ha realizado; el texto lo dice explícitamente para que no se confunda añadir el punto con ejecutarlo."

requirements-completed: []

coverage:
  - id: D1
    description: "La evaluación de riesgo de la marca en memoria distingue por escrito el Caso A (pérdida, aceptado) del Caso B (persistencia incorrecta, inaceptable, cerrado por el plan 09-38), nombra el mecanismo (huellaDelProgreso) y las rutas que lo sostienen, y registra el camino de pérdida nuevo (updatedAt) como coste conocido"
    requirement: "HIST-06"
    verification:
      - kind: other
        ref: "grep -c \"no dice algo falso\" y grep -c \"lo que se pierde en ese caso es la advertencia, no la corrección\" sobre deferred-items.md → 0 los dos (garantía incorrecta retirada)"
        status: pass
      - kind: other
        ref: "grep -c \"Caso A\"/\"Caso B\"/\"huella\"/\"updatedAt\" sobre deferred-items.md → 6/5/16/3 (todos por encima del mínimo exigido)"
        status: pass
    human_judgment: false
  - id: D2
    description: "REQUIREMENTS.md registra la novena cara (ronda 8) y lo que el lote 09-37..09-40 hace con ella, sin dar HIST-06 por cerrado: la casilla sigue [ ] y la fila de trazabilidad lo dice"
    requirement: "HIST-06"
    verification:
      - kind: other
        ref: "grep -c \"^- \\[ \\] \\*\\*HIST-06\" .planning/REQUIREMENTS.md → 1; grep -cE \"^\\- \\[x\\] \\*\\*HIST-06\" → 0"
        status: pass
      - kind: other
        ref: "grep -c \"ronda 8\"/\"invariantesDeMarcaDeEstado\" sobre REQUIREMENTS.md → 3/1"
        status: pass
    human_judgment: false
  - id: D3
    description: "DEV-02 sigue nombrada como ABIERTA en los dos documentos, con el punto de guion nuevo (aviso de discrepancia en ContentChangedNotice.vue) sin dar la comprobación por hecha"
    verification:
      - kind: other
        ref: "grep -ci DEV-02 sobre REQUIREMENTS.md/deferred-items.md, ninguna línea con hecha/resuelta/verificada/completada"
        status: pass
    human_judgment: false
  - id: D4
    description: "El estado del árbol al cerrar el lote (npm test, npx tsc --noEmit) queda registrado, y ningún fichero de código se toca"
    verification:
      - kind: unit
        ref: "npm test (1096 passed, 0 failed)"
        status: pass
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
      - kind: other
        ref: "git diff --stat 33867ef..HEAD -- app/ engine/ package.json package-lock.json → vacío"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-22
status: complete
plan_head_before: 33867ef70308771d0e38c078aafac0332bd93932
commits: 3
---

# Phase 09 Plan 40: Cierre de documentación de la ronda 8 — la evaluación de riesgo de la marca dice el caso que importaba Summary

**La evaluación de riesgo de `useProgressMismatchMark.ts` en `deferred-items.md` distingue por fin el Caso A (la marca se pierde, aceptado) del Caso B (la marca persiste cuando ya no es cierta, cerrado por el plan 09-38), nombrando el mecanismo de huella y sus rutas; `REQUIREMENTS.md` registra la novena cara con su párrafo Ronda 8 sin marcar HIST-06 ni DEV-02.**

## Performance

- **Duration:** ~20 min (no se instrumentó una captura de epoch al inicio de esta sesión; estimado por el trabajo real realizado)
- **Tasks:** 3 completadas
- **Files modified:** 2 (los dos de `files_modified`, ninguno más, ninguno menos)

## Accomplishments

- **La garantía incorrecta desaparece, con los dos casos nombrados y separados.** La sección «La marca de progreso que no coincide vive en memoria» de `deferred-items.md` solo evaluaba el Caso A (la marca se pierde) y concluía que la app «no afirma nada — no dice algo falso —», una garantía que se leía como si cubriera también el Caso B (la marca persiste cuando ya no es cierta). Reescrita para nombrar los dos casos por separado, decir explícitamente cuál no se contemplaba antes, y decir por qué la propia fase persigue ese patrón desde la ronda 1. `grep -c "no dice algo falso"` y `grep -c "lo que se pierde en ese caso es la advertencia, no la corrección"` sobre el fichero: **0 los dos**, la garantía incorrecta ya no está.
- **El mecanismo se nombra, no se promete.** La sección cita `readProgressMismatchWarning`/`app/composables/useProgressMismatchMark.ts`, `huellaDelProgreso`/`app/composables/useStoredProgress.ts` y `app/composables/__tests__/useProgressMismatchMark.test.ts` como las rutas concretas que sostienen que el Caso B es imposible por construcción — no una intención.
- **El coste nuevo, registrado antes de que lo descubra la ronda siguiente.** La huella cubre los siete campos de `PersistedPosition`, `updatedAt` incluido, así que el propio autoguardado que dispara el montaje ya cambia la huella: si el grupo entra, ve el aviso y sale sin elegir, al volver a entrar ya no lo verá. Registrado en su propia viñeta, con la alternativa considerada (excluir `updatedAt`) y por qué hoy se prefiere la garantía estructural del Caso B sobre esa cobertura adicional del Caso A. Se corrige de paso una imprecisión heredada: la sección seguía describiendo la marca como `Set<string>` cuando el plan 09-38 ya la había convertido en `Map<string, string>`.
- **`REQUIREMENTS.md` registra la novena cara sin dar nada por cerrado.** Medición previa (Task 2, punto 1): la garantía incorrecta que ronda 8 encontró en `deferred-items.md` no aparecía en `REQUIREMENTS.md` — cero coincidencias, verificado por `grep`, nunca asumido. El párrafo «Ronda 8» nuevo nombra CR-01, WR-01, el gate de invariantes (`app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`) y el cierre de WR-02/WR-03 por el plan 09-39, terminando con la frase explícita de que **nada de esto da HIST-06 por cerrado**. Las filas de trazabilidad de HIST-04 y HIST-06 se sincronizan a mano con los planes 09-37..09-40 — pegadas íntegras abajo.
- **DEV-02 gana un punto de guion, no una comprobación.** El ítem diferido de comprobación visual humana en tablet añade el aviso de discrepancia dentro de `ContentChangedNotice.vue` (nuevo con el plan 09-38) a su lista de puntos pendientes, con la frase explícita de que añadir el punto al guion no es realizar la comprobación.
- **Nota de cierre de la ronda 8, con los seis hallazgos nombrados uno a uno.** Sección nueva al final de `deferred-items.md`: CR-01 y WR-01 cerrados por el plan 09-38; el hallazgo de esta misma documentación cerrado por este plan (09-40); WR-02 y WR-03 cerrados por el plan 09-39; IN-01 documentado (no retirado) por el plan 09-39. Lo que sigue ABIERTO se repasa uno a uno (solape de banners, toques invisibles sobre `/historico`, blob ilegible, sonda de cobertura sin clasificar, DEV-02). El párrafo de anti-recurrencia nombra las cuatro propiedades comprobables (a-d) con sus rutas, y termina con la advertencia honesta de que esto cubre la clase de defecto de las nueve rondas — y no es una promesa de que no haya una décima de otra clase.

## Task Commits

Cada tarea se ha commiteado atómicamente:

1. **Task 1: la evaluación de riesgo de la marca dice por fin el caso que importaba** - `dacbdb8` (docs)
2. **Task 2: la trazabilidad registra la novena cara sin dar nada por cerrado** - `c4fd665` (docs)
3. **Task 3: nota de cierre de la ronda 8** - `d61e31e` (docs)

**Plan metadata:** pendiente (este commit).

## Medición del punto 1 de la Task 2 (exigido por acceptance_criteria)

Búsqueda sobre `.planning/REQUIREMENTS.md` de la garantía incorrecta que la ronda 8 encontró en `deferred-items.md` (la que concluía que la ausencia de la marca no puede producir ninguna afirmación incorrecta), ejecutada ANTES de escribir el párrafo Ronda 8:

```
grep -n "no dice algo falso\|no puede producir ninguna afirmación incorrecta\|ausencia de la marca" .planning/REQUIREMENTS.md
```

**Resultado: CERO COINCIDENCIAS.** No estaba en `REQUIREMENTS.md` — solo vivía en `deferred-items.md`, corregida por la Task 1. Se registra la medición en vez de omitirla, tal como exige el propio plan.

## Filas de trazabilidad pegadas íntegras (exigido por acceptance_criteria)

**HIST-04:**
```
| HIST-04 | Fase 9 (09-13..09-17, 09-28, 09-33, 09-37..09-40) | Satisfecho (flujo normal) — matiz de riesgo: el registro podía construirse a partir de un `session` desactualizado en la rama de reintento tras un fallo de escritura; ese camino es el que 09-28 cierra (`esLaMismaPartida`), la rama de reintento sobre un snapshot que no coincide queda además señalizada al reentrar (plan 09-33, aviso en `ResumePrompt`), y la marca que señaliza esa discrepancia pasa a validar su propio referente por huella (`huellaDelProgreso`, plan 09-38) en vez de depender de que se la invalide a mano — sin afirmar que el riesgo desaparezca del todo — ver nota de cierre de hueco (rondas 3, 6, 7 y 8) abajo |
```

**HIST-06:**
```
| HIST-06 | Fase 9 (09-13..09-40) | Reabierto en la ronda 5; séptima variante en la ronda 6; octava variante encontrada en la ronda 7 (planes 09-32..09-35); novena variante encontrada y cerrada en la ronda 8 (planes 09-37..09-40) — sigue pendiente de confirmación por una ronda de verificación independiente — ver nota de cierre de hueco abajo |
```

## Líneas de DEV-02 encontradas (exigido por acceptance_criteria, ninguna contiene hecha/resuelta/verificada/completada)

`grep -ci "DEV-02"` sobre `.planning/REQUIREMENTS.md` → 1 línea (más las apariciones dentro de `deferred-items.md`, que ya la citaban desde rondas anteriores). Línea completa de `REQUIREMENTS.md`:

```
- **DEV-02**: Ejecutar en ella el guion de pruebas pendiente: VOZ-08 (respaldo silencioso), foco del modal de detalle en Safari, control de silencio con audio pregenerado, instalación PWA, el aviso de lectura no comprobada en el mini-setup (ronda 6, `09-31`), la variante `failure-stale` del aviso de guardado (20 s, texto largo, reescrito de nuevo en la ronda 7 por el plan 09-32 para no afirmar anterioridad ni diferencia de ronda), el aviso de progreso que no coincide dentro del modal de reanudación (`ResumePrompt`, ronda 7, plan 09-33) y —nuevo en la ronda 8, plan 09-38— el mismo aviso de discrepancia pintado también dentro de la pantalla de contenido cambiado (`ContentChangedNotice.vue`), que nadie ha visto renderizado en un dispositivo físico — sigue PENDIENTE, ninguno de estos puntos se ha comprobado en dispositivo real; añadir este último punto al guion no es realizar la comprobación
```

## Párrafo de anti-recurrencia pegado íntegro (exigido por acceptance_criteria)

```
(a) el descubrimiento de marcas de app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts
es un glob sobre app/composables/**, así que cualquier composable nuevo con estado de módulo
mutable y una raíz vigilada entra solo en la auditoría, sin que nadie edite ninguna lista;
(b) una vez dentro, tiene que demostrar que su lector valida el referente, que su fichero
hermano de tests (app/composables/__tests__/*.test.ts) recorre el ciclo completo de vida, y
que todas las ramas de montaje que lo leen lo pintan;
(c) toda excepción auditada de los dos gates (app/composables/__tests__/afirmacionesRespaldadas.test.ts,
app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts) tiene que citar un respaldo cuyo
contenido tenga que ver con lo que afirma (respaldoRespaldaA,
app/composables/__tests__/vocabularioDeAfirmaciones.ts) y nombrar algo comprobable
(motivoNombraAlgoComprobable, mismo fichero);
(d) toda condición de calidad de esas excepciones tiene un caso sintético que la pone roja,
vigilado por su propio test de cierre de cobertura en ambos gates.

Esto cubre la clase de defecto que las nueve rondas de esta fase han encontrado — y no es una
promesa de que no haya una décima de otra clase: decir lo contrario sería, una vez más, una
afirmación sin respaldo.
```

Nombra tres rutas de fichero o más (cuatro, de hecho): `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`, `app/composables/__tests__/afirmacionesRespaldadas.test.ts`, `app/composables/__tests__/vocabularioDeAfirmaciones.ts` y `app/composables/__tests__/*.test.ts`.

## Recuentos exigidos por acceptance_criteria (Task 1)

- `grep -c "fuera del alcance de este plan"` sobre `deferred-items.md`: **0 antes, 0 después** — no aumenta.
- `git diff --stat -- .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` (Task 1, commit `dacbdb8` en solitario): `1 file changed, 61 insertions(+), 23 deletions(-)` — acotado a la sección de la marca.
- `git diff --stat -- app/ engine/ package.json package-lock.json` sobre todo el rango del plan (`33867ef..HEAD`): **vacío**.

## Files Created/Modified

- `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` — sección de la marca en memoria reescrita (Task 1) + nota de cierre de la ronda 8 nueva (Task 3)
- `.planning/REQUIREMENTS.md` — párrafo Ronda 8, filas de trazabilidad HIST-04/HIST-06, guion de DEV-02 (Task 2)

## Decisions Made

Ver `key-decisions` en el frontmatter.

## Deviations from Plan

None - plan executed exactly as written. Las únicas correcciones fueron dentro del propio proceso de escritura de este plan (no deviaciones de las Reglas 1-4, que se aplican a código): al redactar el párrafo de anti-recurrencia de la Task 3, la primera versión partía la frase «no es una promesa» en dos líneas separadas por el propio salto de línea del Markdown, lo que hacía que `grep -c "no es una promesa"` devolviera 0 en vez de 1 — el criterio de aceptación de la propia Task 3 lo detectó antes de comprometer el resultado, y se corrigió reescribiendo la frase en una sola línea sin cambiar su significado.

## Issues Encountered

Ninguno más allá de la corrección de redacción documentada arriba en «Deviations». No hubo bloqueos de compilación, dependencias ni auth gates — este plan no toca ningún fichero de código.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- La documentación de la fase 9 dice ahora exactamente lo que el árbol hace, incluidos sus costes: la evaluación de riesgo de la marca en memoria distingue los dos casos, nombra el mecanismo y las rutas, y registra el coste nuevo del camino de pérdida por `updatedAt`.
- `REQUIREMENTS.md` registra la novena cara y las dos vías de cierre (validación de huella + invalidación explícita) con el gate nuevo por ruta, sin marcar HIST-06 ni DEV-02.
- **HIST-06 sigue `[ ]` en `REQUIREMENTS.md`** y **DEV-02 sigue nombrada como ABIERTA** en los dos documentos, tal como exige el `scope_boundary` de este plan.
- El lote 09-37..09-40 queda cerrado por completo. La confirmación de HIST-06 y de las comprobaciones humanas pendientes (DEV-02) queda para una ronda de verificación independiente — no la produce este plan.
- `npm test` (1096 passed, 0 failed) y `npx tsc --noEmit` (exit 0) quedan registrados como el estado del árbol al cerrar el lote; ningún fichero de código se tocó en ninguna de las tres tareas.

## Self-Check: PASSED

- `[ -f .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md ]` → FOUND
- `[ -f .planning/REQUIREMENTS.md ]` → FOUND
- `git log --oneline --all | grep -q dacbdb8` → FOUND
- `git log --oneline --all | grep -q c4fd665` → FOUND
- `git log --oneline --all | grep -q d61e31e` → FOUND
- Re-ejecutado `grep -c "no dice algo falso"` sobre deferred-items.md → 0
- Re-ejecutado `grep -cE "^\- \[x\] \*\*HIST-06"` sobre REQUIREMENTS.md → 0
- Re-ejecutado `npm test` → 1096 tests, 0 fallos
- Re-ejecutado `npx tsc --noEmit` → exit 0
- `git diff --name-only 33867ef..HEAD` → exactamente los 2 ficheros de `files_modified`
- `git diff --stat 33867ef..HEAD -- app/ engine/ package.json package-lock.json` → vacío

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-22*
