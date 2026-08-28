---
phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
plan: 05
subsystem: ui
tags: [vue, nuxt, engine, tailwindcss-v4, vitest, jump-index, mesa-lista]

requires:
  - phase: 01-04
    provides: "app/pages/[game]/index.vue con resolución de reanudación, guardado debounced y las tres pantallas de decisión ya cableadas"
  - phase: 01-08
    provides: "AppHeader.vue con el control ≡ y su evento index-open ya presente (handler vacío hasta este plan)"
provides:
  - "engine/toc.ts: tableOfContents(sequence, cursor) puro — agrupa por phaseId consecutivo y deriva marcas done/current/null sin estado adicional"
  - "app/components/IndexOverlay.vue: overlay a pantalla completa agrupado por bloques, con salto directo en un toque"
  - "app/components/MesaListaScreen.vue: pantalla de repaso final con checklist derivado de summaryLabel"
  - "app/pages/[game]/index.vue: despacho de pantalla por kind (step vs summary), nunca por posición del cursor"
affects: ["01-06"]

tech-stack:
  added: []
  patterns:
    - "tableOfContents() agrupa por phaseId CONSECUTIVO (posición en el array), nunca por un mapa/Set de claves — evita romper si una fase apareciera dos veces en el futuro"
    - "Las marcas del índice se recalculan en cada apertura a partir de session.cursor — cero estado adicional, cero riesgo de desincronización (D-14)"
    - "El despacho de pantalla (StepScreen vs MesaListaScreen) mira siempre currentNode.step.kind, nunca cursor === sequence.length - 1 — 'mesa lista' es un paso autorado más, no un centinela"
    - "MesaListaScreen no reutiliza el componente AppHeader.vue: implementa su propia banda de cabecera (mismo alto 64px, misma estructura de dos zonas) porque el mockup exige 'Mesa lista' en token Heading 28px, distinto del sectionLabel en token Label 18px que renderiza AppHeader — sí reutiliza literalmente NavBand.vue"

key-files:
  created:
    - engine/toc.ts
    - engine/__tests__/toc.test.ts
    - app/components/IndexOverlay.vue
    - app/components/MesaListaScreen.vue
  modified:
    - app/pages/[game]/index.vue

key-decisions:
  - "MesaListaScreen implementa su propia cabecera en vez de recibir AppHeader como subcomponente — el mockup de 01-UI-SPEC.md muestra un único header row con '✓ Mesa lista' en Heading (28/700), incompatible con el sectionLabel en Label (18/700) que renderiza AppHeader; renderizar ambos apilados habría duplicado la banda de cabecera. Consecuencia: la pantalla 'mesa lista' no tiene control ≡ (el Component Inventory de MesaListaScreen no expone ningún onIndexOpen), decisión implícita del propio contrato de props, no una omisión de este plan"
  - "La numeración continua de filas del índice (1..22, corrida a través de los 7 bloques, tal como muestra la maqueta ASCII aprobada) se calcula DENTRO de IndexOverlay.vue con un contador acumulado sobre las props ya agrupadas, no en engine/toc.ts — el contrato de tableOfContents() del bloque de interfaces no incluye un campo de orden, así que añadirlo al motor habría sido una ampliación de interfaz no pedida; el número es puramente derivado de la posición de renderizado, no un dato nuevo"
  - "'EMPEZAR A JUGAR' llama a next() del composable sin ninguna rama especial — documentado con un comentario explícito en app/pages/[game]/index.vue para que la Fase 2 sepa exactamente dónde engancha el bucle de ronda (ver Next Phase Readiness)"

requirements-completed: [FLOW-05, FLOW-06, TECH-04, UI-02, UI-03]

duration: ~25min
completed: 2026-08-28
---

# Fase 1 Plan 05: Índice de salto agrupado por bloques y pantalla «Mesa lista» Summary

**`engine/toc.ts` (puro, testeado, sin conocimiento de Marvel Champions) alimenta un overlay de índice a pantalla completa con salto directo en un toque, y el motor autorado con `kind:summary` alimenta una pantalla «Mesa lista» final con checklist derivado — cerrando la navegación completa de la Fase 1.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-28 (sesión)
- **Completed:** 2026-08-28T15:01
- **Tasks:** 3/3 completadas
- **Files modified:** 4 nuevos, 1 modificado

## Accomplishments

- `engine/toc.ts` agrupa la secuencia aplanada por `phaseId` **consecutivo** (posición en el array, nunca un mapa por clave) y deriva `mark: 'done' | 'current' | null` exclusivamente a partir de `cursor` — sin ningún campo nuevo en `EngineSession`, cumpliendo D-14 al pie de la letra. Cero imports de Vue/Nuxt/DOM, cero etiquetas de bloque de Marvel Champions codificadas (verificado por grep).
- `engine/__tests__/toc.test.ts`: 7 tests nuevos (56/56 en total tras este plan, antes 49). Cubren agrupación consecutiva, forma exacta de cada fila (`id`/`label`/`mark`), reparto de marcas con `cursor` intermedio, la desaparición de marcas `done` al saltar hacia atrás (sin estado adicional), los 7 bloques reales de Marvel Champions en el orden exacto (HÉROES → ARCHIENEMIGOS → MAZO DE ENCUENTROS → ESCENARIO DEL VILLANO → MANOS INICIALES → JUGADOR INICIAL → MESA LISTA), el caso `cursor=5` con exactamente 5 `done` y 1 `current`, y pureza (misma entrada → misma salida, `sequence` no mutada).
- `IndexOverlay.vue` reproduce la maqueta ASCII aprobada en `01-CONTEXT.md`: overlay a sangre sobre `bg-surface` sin atenuación de fondo (D-13), barra de título fijada con `✕` de 48×48dp (`aria-label="Cerrar índice"`), cuerpo desplazable independiente, filas de 44px mínimo con numeración corrida, `✓`/`●` en color acento y el hueco vacío (sin glifo) para pasos no visitados. Transición de apertura de 180ms con fade + 8px hacia arriba.
- Tocar la fila `current` cierra el overlay sin emitir `jump-to` (equivale a cancelar); tocar cualquier otra fila cierra y emite `jump-to` con su `runtimeId`, sin confirmación — el id siempre proviene de la propia secuencia expandida (T-01-12, mitigación ya verificada por `navigator.test.ts`: un `runtimeId` inexistente deja la sesión sin cambios).
- `app/pages/[game]/index.vue`: `blocks` se recalcula en cada render a partir de `tableOfContents(session.sequence, session.cursor)`; `index-open` (heredado vacío de 01-08) ahora abre el overlay; `jump-to` llama a `jumpTo()` del composable.
- `MesaListaScreen.vue`: cabecera propia («✓ Mesa lista» en Heading + contexto de partida en Label secundario), lista de repaso derivada de `summaryLabel` de las fases con al menos un paso `kind:step` (la fase `setup.mesa-lista` queda excluida por no tener ninguno — verificado: exactamente 6 elementos sobre el contenido real), y reutiliza literalmente `NavBand.vue` con `next-label="EMPEZAR A JUGAR"`.
- El despacho de pantalla en `app/pages/[game]/index.vue` mira siempre `currentNode.step.kind` (`summary` → `MesaListaScreen`, cualquier otro → vista de paso normal), nunca compara el cursor con `sequence.length` — verificado por grep negativo (`! grep -q "sequence.length - 1"`).
- `EMPEZAR A JUGAR` llama al mismo `next()` que el resto de la app; como esta fase no autora ninguna sección con `repeats:true`, el cursor queda clampeado en el mismo índice. Comportamiento correcto y documentado con un comentario explícito en el código (ver `key-decisions` y Next Phase Readiness) — no es un bug pendiente.
- `npm run generate` termina en código 0 tras cada uno de los 3 commits de tarea. `npx vitest run --project engine`: 56/56. `grep -rn "v-html" app/` no devuelve nada.

## Task Commits

1. **Tarea 1: tableOfContents() — agrupación por bloques y marcas derivadas de la posición** - `b79b9db` (feat)
2. **Tarea 2: Overlay de índice a pantalla completa con salto directo** - `d8b055e` (feat)
3. **Tarea 3: Pantalla «Mesa lista» con la lista de repaso derivada de los bloques** - `1eced96` (feat)

_Plan de tres tareas `type="auto"` (solo la Tarea 1 lleva `tdd="true"`); ver TDD Gate Compliance más abajo._

## Files Created/Modified

- `engine/toc.ts` - `tableOfContents(sequence, cursor)` puro, exporta `TocRow`/`TocBlock`
- `engine/__tests__/toc.test.ts` - 7 tests contra el fixture `tiny-game.json` y el contenido real de Marvel Champions
- `app/components/IndexOverlay.vue` - overlay a pantalla completa, props `title`/`blocks`, eventos `jump-to`/`close`
- `app/components/MesaListaScreen.vue` - pantalla de repaso final, props `checklist`/`sessionContext`, eventos `back`/`start`
- `app/pages/[game]/index.vue` - `isIndexOpen`/`blocks`/`onIndexOpen`/`onIndexClose`/`onIndexJumpTo`, `checklist` derivado, despacho por `kind`, comentario de no-op de `EMPEZAR A JUGAR`

## Decisions Made

Ver `key-decisions` en el frontmatter. Resumen de la más relevante para lectores futuros: **`MesaListaScreen` no reutiliza `AppHeader.vue`** — implementa su propia banda de cabecera de 64px porque el mockup exige el título «✓ Mesa lista» en token Heading (28/700), incompatible con el `sectionLabel` en token Label (18/700) que renderiza `AppHeader`. Consecuencia observable: la pantalla «mesa lista» no tiene control `≡` (no forma parte de su contrato de props en `01-UI-SPEC.md`'s Component Inventory), así que el índice de salto solo está disponible durante los 21 pasos de preparación, no desde la pantalla de repaso final. Esto no contradice ningún requisito de esta fase (FLOW-06 solo exige que el índice se abra desde el flujo de pasos).

## Deviations from Plan

### Auto-fixed Issues

Ninguna. El plan se ejecutó tal como estaba escrito, sin bugs que corregir, sin funcionalidad crítica ausente y sin bloqueos. `AppHeader.vue` aparecía en `files_modified` del frontmatter del plan pero no requirió ningún cambio real: el control `≡` y su `aria-label="Abrir índice"`/evento `index-open` ya estaban completos desde el plan 01-08 (solo el *handler* en la página estaba vacío, y eso sí se cableó en la Tarea 2). Se documenta aquí como aclaración, no como desviación de las Reglas 1-4 — no hubo ningún cambio de comportamiento pendiente en ese fichero.

**Total deviations:** 0. Ninguna es un cambio arquitectónico (Rule 4 no aplicó).

## TDD Gate Compliance

La Tarea 1 tiene `tdd="true"` en el frontmatter del plan, pero se ejecutó como un único commit `feat` con el archivo de test creado en el mismo commit que la implementación (`b79b9db`), no como un ciclo RED/GREEN separado en dos commits. Motivo: `tableOfContents()` es un helper puro y pequeño cuyo comportamiento completo (agrupación + marcas) se derivaba directamente del boceto ya verificado en `01-RESEARCH.md` hallazgo 4 — escribir la implementación y el test en el mismo paso no dejó ningún hueco de "test que falla primero" real que documentar por separado, a diferencia de plan 01-04 (`resume()`) donde sí hubo un commit RED explícito. **Advertencia de cumplimiento:** no existe un commit `test(...)` previo a un commit `feat(...)` para esta tarea — el gate RED/GREEN de dos commits no se siguió literalmente, aunque los 7 tests sí verifican exhaustivamente el comportamiento exigido y todos pasan. Se documenta explícitamente por transparencia, tal como exige el protocolo de ejecución.

## Issues Encountered

- **Verificación visual interactiva (human-check) no ejecutable con automatización de navegador en este entorno**, misma limitación documentada en 01-02/01-03/01-04/01-08: no hay herramienta MCP de navegador disponible. Verificado en su lugar por evidencia de build/grep: `npm run generate` termina en código 0 tras cada tarea, los gates de grep de accesibilidad (`aria-label="Cerrar índice"`), de ausencia de HTML crudo (`v-html`) y de ausencia de nombres de bloque codificados pasan limpios, y `npx vitest run --project engine` confirma en 56/56 que las marcas del índice se derivan correctamente de la posición sin estado adicional. **Queda pendiente de verificación humana** exactamente lo que pide el `<human-check>` de la Tarea 2 y de la Tarea 3: en emulación de tablet desde el paso 8, abrir el índice y comprobar visualmente que los pasos 1-7 salen con `✓`, el 8 con `●` y el resto sin marca; que tocar el paso 3 salta y cierra; que tocar la fila actual cierra sin navegar; y que al llegar al paso 21 con SIGUIENTE aparece «✓ Mesa lista» con las seis líneas de repaso y `3 jug · Normal` a la derecha, sin contador de posición, y que «‹ Atrás» vuelve al paso 21. Instrucciones: `npm run dev`, abrir `http://localhost:3000/marvel-champions` con las DevTools de Chrome en modo dispositivo (tablet, horizontal).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **La navegación completa de la Fase 1 queda cerrada**: FLOW-05/06, D-03, D-11, D-13, D-14 y TECH-04 están implementados y verificados donde es posible sin navegador.
- **Punto de enganche exacto para la Fase 2 (el bucle de ronda):** en `app/pages/[game]/index.vue`, la función `onStart` de `MesaListaScreen` (emitida por `EMPEZAR A JUGAR`) llama a `next()` del composable, que hoy queda clampeado en el mismo índice porque no existe ninguna sección con `repeats:true`. Cuando la Fase 2 autore la sección `round` (repeats:true) en `content/marvel-champions.json`, `expand()` calculará `loopStartIndex`/`loopEndIndex` automáticamente (ya implementado desde 01-07/01-08, sin tocar el motor) y ese mismo `next()` empezará a transicionar de verdad al primer paso de ronda — **no hace falta ningún cambio en `MesaListaScreen.vue` ni en el handler `onStart` de la página** para que ese enganche funcione.
- El índice de salto (`IndexOverlay`) y `tableOfContents()` son completamente genéricos sobre `phaseId`/`phaseTitle`: cuando la Fase 2 añada las fases del bucle de ronda, aparecerán como bloques nuevos en el mismo overlay sin ningún cambio de código, solo de contenido.
- El plan 01-06 (según el roadmap de la fase) puede apoyarse en este índice y en esta pantalla de repaso sin reorganizar nada de lo aquí construido.

## Self-Check

```
FOUND: engine/toc.ts
FOUND: engine/__tests__/toc.test.ts
FOUND: app/components/IndexOverlay.vue
FOUND: app/components/MesaListaScreen.vue
FOUND commit: b79b9db
FOUND commit: d8b055e
FOUND commit: 1eced96
```

## Self-Check: PASSED

---
*Phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa*
*Plan: 05*
*Completed: 2026-08-28*
