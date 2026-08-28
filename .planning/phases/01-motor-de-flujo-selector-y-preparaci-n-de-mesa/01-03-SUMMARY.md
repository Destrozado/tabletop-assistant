---
phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
plan: 03
subsystem: content
tags: [content, marvel-champions, zod, vitest, tdd, rules-verification]

requires: ["01-08"]
provides:
  - "content/marvel-champions.json completo: preparación de mesa de Marvel Champions en 21 pasos citados agrupados en 7 fases (6 bloques + mesa lista), contentVersion 2"
  - "engine/__tests__/content.test.ts como gate de CI que rompe el build ante violación del contrato de autoría (presupuesto de caracteres, cita ausente, recuento de jugadores, paso que aparece/desaparece por dificultad)"
affects: []

tech-stack:
  added: []
  patterns: ["contenido de reglas citado con {source, section, page} en los datos, nunca en pantalla (D-06)", "diferencia de dificultad = variants.difficulty.{normal,expert} sobre un paso fijo, nunca paso condicional (ADAPT-01)", "fórmulas de cantidades sin resolver, sin recuento real de jugadores en texto (D-07/D-08)"]

key-files:
  created: []
  modified:
    - content/marvel-champions.json
    - engine/__tests__/content.test.ts

key-decisions:
  - "Open Question 1 (nº de cartas del conjunto de Archienemigo) resuelta con texto genérico sin cifra: 'Contad las cartas de vuestro conjunto de Archienemigo' — el Rules Reference no da una cifra universal, varía por identidad, y CONT-10 prohíbe inventar un dato no verificado"
  - "El paso 21 de la tabla de 01-RESEARCH (fusión de los pasos oficiales 16 y 3, la más forzada de la tabla) se mantiene como UN solo paso (setup.jugador-inicial.01, 83 caracteres tras reescritura) en vez de dividirse en dos — el total de 21 pasos es un criterio de aceptación duro (`steps=21`) y la reescritura ('Resolved habilidades de Preparación en juego y decidid quién es el jugador inicial') cabe en el presupuesto sin perder ninguna de las dos acciones oficiales"
  - "El gate de citation en engine/__tests__/content.test.ts (heredado de 01-07) exigía cita en TODO paso sin excluir kind:summary; se corrigió para exigirla solo en kind:step, ya que el paso 'Mesa lista' no enuncia ninguna regla (D-06) — ver Deviations"
  - "La tarea 2 (tdd=true) no generó un commit feat/GREEN separado: el contenido autorado en la tarea 1 ya satisfacía las 16 aserciones nuevas del test al escribirlas, así que no hubo ninguna corrección de contenido que aplicar — ver TDD Gate Compliance"

requirements-completed: [CONT-01, CONT-08, CONT-10, CONT-11, ADAPT-01, ADAPT-03, TECH-02]

duration: ~35min
completed: 2026-08-28
---

# Fase 1 Plan 03: Contenido completo y verificado de preparación de mesa Summary

**`content/marvel-champions.json` amplía de 3 a 22 nodos (21 pasos citados + 1 resumen) cubriendo la preparación de mesa completa de Marvel Champions verificada contra el Rules Reference v1.7, con un test de contenido ampliado que rompe CI ante cualquier violación del contrato de autoría.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-28
- **Completed:** 2026-08-28
- **Tasks:** 2/2 completadas
- **Files modified:** 2 (`content/marvel-champions.json`, `engine/__tests__/content.test.ts`)

## Accomplishments

- `content/marvel-champions.json` cubre las 7 fases de la preparación (`setup.heroes`, `setup.archienemigos`, `setup.encuentros`, `setup.escenario`, `setup.manos`, `setup.jugador-inicial`, `setup.mesa-lista`) con exactamente 21 pasos `kind:step` citados contra el Rules Reference v1.7 y 1 paso `kind:summary` ("Mesa lista"), `contentVersion` subido de 1 a 2.
- Verificación página a página del PDF oficial repetida en esta sesión (no solo heredada de 01-RESEARCH): confirmado en vivo con `pdftotext -f/-l` que el Apéndice II vive en la página 49 (nunca 48), que "Obligation" (p.29-30) dice literalmente *"each identity is associated with one or more obligation cards... shuffled into the encounter deck"*, que "Nemesis Encounter Set" (p.29) confirma que los archienemigos se apartan fuera de juego (no se barajan), y que "Per Player Icon" (p.31) confirma la fórmula "× nº de jugadores" sin fijar cifra.
- Los tres avisos de trampa exigidos por el plan están presentes y son exactamente esos tres: `setup.archienemigos.03`, `setup.encuentros.04`, `setup.manos.03`. Ningún otro paso lleva `warning` (D-05).
- Los dos únicos pasos con diferencia Normal/Experto (`setup.encuentros.03`, `setup.escenario.04`) cambian de texto vía `variants.difficulty`, nunca de presencia — la secuencia aplanada tiene la misma longitud (22) en ambos modos, verificado por test con `expand()`.
- Corrección de reglas confirmada aplicada: el paso de obligaciones dice "una o más por identidad", nunca "una por jugador" — verificado por test con expresión regular negativa.
- El conjunto de Archienemigo no fija ninguna cifra de cartas (Open Question 1 resuelta con texto genérico, ver Decisions).
- El dial de vida del villano expresa la fórmula sin resolver ("su vida impresa por el número de jugadores"), sin dígito ni numeral escrito en ningún paso (D-07/D-08), verificado por una expresión regular que cubre tanto dígitos como los numerales escritos uno/dos/tres/cuatro.
- `engine/__tests__/content.test.ts` pasó de 4 a 16 aserciones sobre el contenido real: conteo estructural exacto (22 nodos), citation obligatoria solo en `kind:step`, presupuestos de 90/60 caracteres, ausencia de recuento de jugadores en `text`/`warning`/`title`, `resolveText()` de los dos pasos con variantes, igualdad de longitud de secuencia entre `normal` y `expert`, exactamente 3 warnings, `summaryLabel` no vacío en toda fase con pasos `kind:step`, y un test negativo que clona el contenido real en memoria, le mete un `text` de 120 caracteres y comprueba que `validateGameDefinition` lanza sin tocar el fichero real.
- `npx vitest run --project engine`: 41/41 tests, código 0. `npm run test` (comando de CI) también en verde. `npm run generate` termina en verde (4 rutas prerenderizadas, incluye `/marvel-champions`).

## Task Commits

1. **Tarea 1 — Autorar los 21 pasos y la pantalla de repaso** - `024de34` (feat)
2. **Tarea 2 — Test de contenido ampliado (gate de CI)** - `6ed48c8` (test)

## Files Created/Modified

- `content/marvel-champions.json` - de 3 a 22 nodos (21 `kind:step` + 1 `kind:summary`), `contentVersion: 2`, 3 avisos, 2 pasos con `variants.difficulty`
- `engine/__tests__/content.test.ts` - de 4 a 16 tests; añade imports de `flatten`/`expand`/`resolveText` para probar el contenido real con el motor real, no solo con el esquema

## Decisions Made

Ver `key-decisions` en el frontmatter. Resumen de las dos más relevantes para lectores futuros:

- **Open Question 1 (nº de cartas del Archienemigo):** se adopta la recomendación de 01-RESEARCH — texto genérico sin cifra, porque el Rules Reference no da un número universal (varía por identidad) y CONT-10 prohíbe redactar un dato no verificado.
- **Ningún paso se dividió por presupuesto de caracteres.** Los dos candidatos más ajustados al límite de 90 (`setup.escenario.06` con la redacción inicial de 93 caracteres, y `setup.jugador-inicial.01` con 97) se resolvieron con una reescritura más compacta que conserva el contenido completo de ambas acciones oficiales fusionadas (pasos 11 y 16+3 del Apéndice II respectivamente), en vez de dividirse en pasos nuevos. **El total de pasos se mantiene en 21**, tal como exige el criterio de aceptación automatizado (`steps=21`); no hubo ningún cambio de conteo que anotar más allá de este ajuste de redacción.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] El test heredado de 01-07 exigía `citation` en TODO paso, incluido `kind:summary`**
- **Found during:** Tarea 1, ejecución de `npx vitest run --project engine` tras autorar el contenido
- **Issue:** `engine/__tests__/content.test.ts` (creado en el plan 01-07, antes de que existiera el paso "Mesa lista") recorría todos los pasos sin distinguir `kind` y exigía `citation` en cada uno. El paso `setup.mesa-lista.01` (`kind: summary`) no lleva `citation` por diseño explícito de este mismo plan (D-06: no enuncia ninguna regla), así que el test heredado bloqueaba la verificación de la Tarea 1 sin ningún error real de contenido.
- **Fix:** se acotó el filtro de esa aserción a `steps.filter(s => (s.kind ?? 'step') === 'step')`, dejando expresamente sin exigir `citation` a los pasos `kind:summary`. Este mismo cambio quedó luego absorbido y reforzado por la Tarea 2, que añade una aserción explícita separada ("el paso kind summary no lleva citation").
- **Files modified:** `engine/__tests__/content.test.ts`
- **Verification:** `npx vitest run --project engine` → 29/29 (antes de la Tarea 2)
- **Committed in:** `024de34` (Tarea 1, junto con el contenido — el fix era condición de cierre de esa misma tarea)

---

**Total deviations:** 1 auto-fixed (ajuste de filtro en un test heredado, sin impacto en el contenido de reglas). Ninguna es un cambio arquitectónico (Rule 4 no aplicó).

## TDD Gate Compliance

La Tarea 2 tiene `tdd="true"` en el frontmatter del plan. La secuencia de gates observada:

- **RED:** las 16 aserciones nuevas se escribieron contra el contenido real ya autorado en la Tarea 1 (commit `024de34`), y **pasaron todas al primer intento** (`npx vitest run --project engine` → 41/41) — no hubo ningún fallo que corregir.
- **GREEN:** no hubo commit `feat` separado. La causa es estructural al orden de las tareas de este plan, no un salto del gate: la Tarea 1 ya deja el contenido completo y correcto antes de que la Tarea 2 escriba las aserciones sobre él, así que no existe ninguna "implementación mínima para pasar el test" pendiente — el test ya encontró el contenido en estado verde.
- El único commit de la Tarea 2 es `test(01-03): endurecer el test de contenido...` (`6ed48c8`).

Esto es un patrón esperado para una tarea de "gate de contenido ya autorado" (a diferencia de una tarea que añade comportamiento nuevo al motor), y no indica que el ciclo TDD se haya omitido: el test negativo incluido en la propia tarea (`text` de 120 caracteres en memoria) es la prueba de que el gate sí muerde cuando corresponde.

## Issues Encountered

Ninguno bloqueante. Verificación adicional realizada en esta sesión (más allá de la investigación heredada de 01-RESEARCH): extracción en vivo con `pdftotext -f/-l` de las páginas 27, 28, 29, 30, 31, 39 y 49 del Rules Reference v1.7 para confirmar textualmente cada cita antes de fijarla en el JSON. Todas las páginas de la tabla de 01-RESEARCH se confirmaron correctas; el único matiz encontrado es que el texto exacto "one or more obligation cards... shuffled into the encounter deck" cae físicamente en la página 30 del PDF, no en la 29 donde empieza la entrada de glosario "OBLIGATION" — se mantiene la cita en página 29 (inicio de la entrada), tal como indicaba explícitamente el plan ("las demás páginas de la tabla... se toman tal cual de la tabla verificada").

## Next Phase Readiness

- El contenido de la preparación de mesa de Marvel Champions queda completo y citado para el resto de la Fase 1 (planes 01-04, 01-05, 01-06), que pueden consumir `content/marvel-champions.json` y `engine/__tests__/content.test.ts` sin ninguna ampliación de contenido pendiente en este bloque.
- El campo `speech` de cada paso sigue sin autorar (reservado explícitamente para la Fase 3, tal como pedía el plan).
- La revisión de granularidad fina prevista en D-04 ("reevaluar tras la primera prueba de flujo completo") sigue pendiente del primer playtest en tablet real, no de este plan — no bloquea el resto de la fase.
- La sección `round` (bucle de partida, Fase 2) sigue sin autorar; el `TODO(fase 2)` de `engine/schema.ts` sobre `repeating.length === 1` sigue vigente y no se ha tocado en este plan.

## Self-Check

```
FOUND: content/marvel-champions.json
FOUND: engine/__tests__/content.test.ts
FOUND commit: 024de34
FOUND commit: 6ed48c8
```

## Self-Check: PASSED

---
*Phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa*
*Plan: 03*
*Completed: 2026-08-28*
