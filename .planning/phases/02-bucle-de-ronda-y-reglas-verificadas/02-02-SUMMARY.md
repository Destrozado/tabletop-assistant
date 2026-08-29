---
phase: 02-bucle-de-ronda-y-reglas-verificadas
plan: 02
subsystem: engine + ui (header/index)
tags: [header, index-overlay, round-loop, pure-function, tailwind]
dependency_graph:
  requires:
    - phase: "02-01"
      provides: "sección ronda (repeats:true, 2 fases, 10 pasos) que enciende loopStartIndex/loopEndIndex"
  provides:
    - "engine/header.ts: describeHeader(session) — sectionLabel/plainSectionTitle/position derivados por fase dentro del bucle, por sección fuera de él (D-22/D-23)"
    - "engine/toc.ts: tableOfContents() reordena bloques (bucle primero, preparación al final atenuada) y suprime ✓ dentro del bucle (D-24/D-25)"
    - "cabecera y overlay del índice dicen la verdad dentro del bucle; reanudación dentro del bucle menciona ronda y fase sin código nuevo (DC-4)"
  affects:
    - "app/composables/useGameSession.ts (sectionLabel/plainSectionTitle/position envuelven describeHeader)"
    - "app/components/AppHeader.vue (fix de layout min-w-0/shrink-0)"
    - "app/components/IndexOverlay.vue (prop blocks gana dimmed)"
    - "app/pages/[game]/index.vue (IndexOverlay recibe plainSectionTitle, no sectionLabel)"
tech_stack:
  added: []
  patterns:
    - "Segunda función pura en engine/ que sigue la disciplina de engine/toc.ts: cero Vue/Nuxt/DOM, cero conocimiento de un juego concreto (TECH-04), decide solo por sectionRepeats/phaseId"
    - "Una sola derivación compartida (describeHeader) alimenta cabecera, título del overlay y resumen de reanudación — evita que las tres pantallas se desincronicen entre sí"
    - "Atenuado por token de color (text-secondary-text), nunca por opacidad — preserva el contraste AA en una zona que sigue siendo pulsable"
key_files:
  created:
    - engine/header.ts
    - engine/__tests__/header.test.ts
  modified:
    - engine/toc.ts
    - engine/__tests__/toc.test.ts
    - app/composables/useGameSession.ts
    - app/components/AppHeader.vue
    - app/components/IndexOverlay.vue
    - app/pages/[game]/index.vue
decisions:
  - "D-22/D-23 aplicadas: dentro del bucle, position se filtra por phaseId (nunca por el id de sección) dando '3 de 6' en vez de '3 de 10'; fuera del bucle, position excluye explícitamente los nodos sectionRepeats:true (bandera, no id) para seguir dando '8 de 23' y no '8 de 33' ahora que la sección ronda coexiste con la preparación"
  - "Los nodos kind:'summary' devuelven position:null y sectionLabel plano en ambos tramos, sin bifurcar por sectionRepeats — decisión de diseño no cubierta explícitamente por el behavior del plan, tomada por simplicidad ya que hoy solo existe un nodo summary y vive en el tramo lineal"
  - "D-24/D-25 aplicadas: tableOfContents() calcula insideLoop una sola vez a partir de sequence[cursor]?.sectionRepeats; el reordenado y el atenuado leen únicamente esa bandera, nunca un id de sección literal"
  - "DC-4 verificada sin código nuevo: savedSummary en app/pages/[game]/index.vue sigue componiéndose de sectionLabel+position+sessionContextLabel; al recalcularse sectionLabel con la ronda, el aviso de partida guardada la menciona automáticamente"
metrics:
  duration: "~25min"
  completed: "2026-08-29"
---

# Phase 2 Plan 02: Cabecera e índice del bucle — contador relativo a la fase y ✓ sin mentir Summary

Nueva función pura `engine/header.ts` (`describeHeader`) que compone `RONDA 4 · Villano · 3 de 6` dentro del bucle contando por fase y no por sección, extensión de `engine/toc.ts` para reordenar el índice (bucle primero, preparación atenuada al final) y suprimir `✓` dentro del bucle, y el cableado mínimo en `useGameSession.ts`/`AppHeader.vue`/`IndexOverlay.vue`/`index.vue` para que cabecera, overlay y resumen de reanudación usen esa única fuente de verdad.

## What Was Built

- **`engine/header.ts`** (nuevo): `describeHeader(session: EngineSession): HeaderInfo | null` deriva `sectionLabel`/`plainSectionTitle`/`position` de un nodo actual. Dentro del tramo repetitivo (`sectionRepeats:true`), `sectionLabel` compone `"{SECCIÓN} {ronda} · {Fase}"` (fase en Title Case, sin mayúsculas forzadas) y `position` se filtra por `phaseId` — nunca por el id de sección, evitando el error de denominador (`3 de 10` en vez de `3 de 6`). Fuera del bucle, `position` cuenta sobre todos los nodos `kind:'step'` que NO pertenecen al tramo repetitivo (filtro por la bandera `sectionRepeats`, no por id), preservando `PREPARACIÓN · 8 de 23` ahora que la sección `ronda` coexiste con la preparación en la misma secuencia. `plainSectionTitle` es siempre el nombre plano de sección, fuente única del título del `IndexOverlay`.

- **`engine/toc.ts`**: `tableOfContents()` calcula `insideLoop = sequence[cursor]?.sectionRepeats === true` al principio. Regla de marca: dentro del tramo repetitivo nunca se emite `'done'`, solo `'current'` en el cursor y `null` en cualquier otra fila — incluidas las ya recorridas en la misma pasada de ronda (D-25). Tras agrupar, si `insideLoop`, los bloques se particionan y reordenan: los del tramo repetitivo primero en su orden natural, los del tramo lineal después con `dimmed: true` (D-24). Fuera del bucle el comportamiento es byte a byte el de antes (`dimmed: false` en todo, orden natural).

- **`app/composables/useGameSession.ts`**: `sectionLabel`/`position` dejaron de tener lógica inline y ahora envuelven `describeHeader` (mismo patrón que `currentText`/`resolveText`). Nuevo `plainSectionTitle` exportado, derivado de la misma llamada compartida (`headerInfo` computed) — una sola fuente para las tres pantallas que la consumen.

- **`app/components/AppHeader.vue`**: fix de layout de dos clases (`min-w-0 flex-1` en la zona izquierda, `shrink-0` en la derecha) para que `truncate` recorte la etiqueta compuesta larga en vez de comprimir `3 jug · Normal ≡` (T-02-06).

- **`app/components/IndexOverlay.vue`**: prop `blocks` gana `dimmed: boolean`. Cuando `block.dimmed`, filas y glifo `✓`/`●` fuerzan `text-secondary-text` (token de color, nunca opacidad — preserva 6.9:1 de contraste). Divisor `PREPARACIÓN (CONSULTA)` (hairline + rótulo centrado) se inserta solo antes del primer bloque atenuado. `onRowClick` sin cambios: una fila atenuada sigue cerrando el overlay y saltando (FLOW-08).

- **`app/pages/[game]/index.vue`**: `IndexOverlay` recibe `:title="plainSectionTitle"` en vez de `:title="sectionLabel"` — la barra de título del overlay vuelve a ser un nombre plano de sección (`RONDA`, `PREPARACIÓN`), nunca la etiqueta compuesta con ronda y fase.

## Verification Performed

- `npx vitest run`: 7 archivos, 95 tests, todos en verde (línea base tras 02-01: 82; +9 de `header.test.ts`, +4 nuevos en `toc.test.ts` — el resto de tests preexistentes de `toc.test.ts` quedaron actualizados/reforzados sin perder cobertura).
- Todos los casos de `<behavior>` de la tarea 1 cubiertos explícitamente en `header.test.ts`: paso de preparación índice 7 (`8 de 23`), nodo `kind:'summary'`, fase jugadores ronda 4 (`3 de 4`), fase villano ronda 4 (`3 de 6`, nunca `7 de 10`), fase villano ronda 12 último paso (`6 de 6`), cursor fuera de rango, secuencia vacía, pureza, y el fixture `tiny-game.json` (`BUCLE 2 · Turno`) como prueba TECH-04.
- Todos los casos de `<behavior>` de la tarea 3 cubiertos en `toc.test.ts`: orden natural + `dimmed:false` fuera del bucle (sobre contenido real), reordenado con `Jugadores`/`Villano` primero y las 7 secciones de preparación después con `dimmed:true`, cero `'done'` en el tramo repetitivo con cursor avanzado dentro de la fase del villano (verificando que pasos ya recorridos en esta ronda tampoco llevan `'done'`), preparación conserva `'done'` pero cambia de atenuado, y el mismo reordenado sobre `tiny-game.json`.
- Grep de disciplina TECH-04/D-24/D-25 en ambos ficheros de motor: cero referencias a `'ronda'`/`'setup'`/`Villano`/`Jugadores` en `engine/header.ts` y `engine/toc.ts`; `sectionId` aparece 0 veces en `engine/header.ts`; `phaseId` ≥1, `sectionRepeats` ≥2 en cada fichero según corresponde.
- `grep -q "PREPARACIÓN (CONSULTA)"` en `IndexOverlay.vue` — presente; `grep -c "opacity-"` no aumentó respecto a la línea base (1, sin cambios — el atenuado es 100% por token de color).
- `npx nuxt build` completo (client + server + prerender de `/` y `/marvel-champions`) sin errores — sustituye la comprobación de tipos que `npx nuxt typecheck` no puede ejecutar en este repo (ver Deviations).
- `git diff --diff-filter=D --name-only` tras cada commit: sin eliminaciones inesperadas en ninguna de las tres tareas.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/tsconfig.app.json` no existía, bloqueando `vitest`**
- **Found during:** Tarea 1, primer intento de `npx vitest run engine/__tests__/header.test.ts`.
- **Issue:** Mismo síntoma documentado en `02-01-SUMMARY.md` — infraestructura de tipos de Nuxt nunca generada en este worktree concreto (cada worktree la necesita por separado).
- **Fix:** `npx nuxi prepare` (genera `.nuxt/` localmente; directorio ya en `.gitignore`, no se commitea).
- **Files modified:** ninguno versionado.
- **Commit:** N/A (no versionado).

No hay deviations de Rule 1, 2 ni 4 — el plan no dejó ningún bug ni funcionalidad crítica sin cubrir, y ningún cambio exigió una decisión arquitectónica.

### Deferred (documented, not auto-fixed)

**`npx nuxt typecheck` no es ejecutable en este repo.** El proyecto nunca instaló `typescript`/`vue-tsc` (confirmado con `git log --all -p -- package.json`: ningún commit los añadió jamás, desde el scaffold de la Fase 1). El comando del plan `npx vitest run && npx nuxt typecheck` no puede completarse como está escrito — no es una regresión de esta tarea, es una condición preexistente de todo el proyecto, y añadir un type checker es una instalación de paquete explícitamente excluida del auto-fix de Rule 3 (requeriría un checkpoint de legitimidad de paquete). Documentado en `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/deferred-items.md`. Mitigación aplicada: `npx nuxt build` completo (client+server+prerender) sin errores sobre los seis ficheros `.vue`/`.ts` tocados, más una relectura manual de cada cambio de tipo (formas de prop, tipos de retorno de `computed`, campos de `EngineSession`/`RuntimeStepNode`/`TocBlock`).

## Known Stubs

Ninguno. Este plan extiende funciones puras existentes y cablea componentes ya conectados a datos reales; no introduce ningún componente con datos sin conectar.

## Threat Flags

Ninguno. Los cambios de este plan caen dentro de las mitigaciones ya registradas en el `threat_model` del plan: T-02-01 (interpolación `{{ }}` exclusiva en `AppHeader.vue`/`IndexOverlay.vue`, sin plantilla nueva de renderizado), T-02-03 (`engine/header.ts` no importa `zod`, `useGameSession.ts` solo importa `describeHeader`), T-02-06 (fix de layout `min-w-0 flex-1`/`shrink-0` aplicado tal cual lo especifica el plan). No se introduce superficie nueva (sin endpoints, sin rutas de auth, sin cambios de esquema).

## Self-Check: PASSED

- `engine/header.ts` — FOUND
- `engine/__tests__/header.test.ts` — FOUND
- `engine/toc.ts` — FOUND (modificado)
- `engine/__tests__/toc.test.ts` — FOUND (modificado)
- `app/composables/useGameSession.ts` — FOUND (modificado)
- `app/components/AppHeader.vue` — FOUND (modificado)
- `app/components/IndexOverlay.vue` — FOUND (modificado)
- `app/pages/[game]/index.vue` — FOUND (modificado)
- Commit `0eda5bf` (feat: engine/header.ts) — FOUND en `git log`
- Commit `1795d75` (feat: cablear cabecera + fix AppHeader) — FOUND en `git log`
- Commit `d197c32` (feat: índice del bucle D-24/D-25) — FOUND en `git log`
- `npx vitest run` — 95/95 en verde al cierre del plan
- `npx nuxt build` — completo sin errores al cierre del plan

## Next Phase Readiness

Cabecera e índice ya dicen la verdad dentro del bucle; `02-03` (el aviso `⚠` clicable con su modal, D-32) puede construirse sobre `StepScreen.vue`/`app/pages/[game]/index.vue` sin ninguna dependencia pendiente de este plan. Sin bloqueos.

---
*Phase: 02-bucle-de-ronda-y-reglas-verificadas*
*Completed: 2026-08-29*
