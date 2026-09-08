---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 05
subsystem: ui
tags: [vue, tailwind, component, counter-band]

# Dependency graph
requires:
  - phase: 07-01
    provides: "e2e/counter-band-height.spec.ts (presupuesto de altura de 96px) y CounterState/SessionContext.counters? en engine/types.ts"
  - phase: 07-04
    provides: "showsCounterBand, counterCells, incrementCounter, decrementCounter en useGameSession.ts, con el contrato de CounterCell ya fijado"
provides:
  - "app/components/CounterBand.vue — banda de contadores montada, dumb component, altura fija 96px, partido en dos filas bajo 640px"
  - "app/pages/[game]/index.vue — <CounterBand> montada como hermano inmediato de AppHeader, antes de VoiceUnavailableNotice"
affects: ["07-06"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plantilla de celda escrita UNA sola vez y compartida por la fila de villano y la fila de jugadores vía v-for anidado sobre un computed rowGroups — necesario para que grep de acceptance_criteria que exigen conteos EXACTOS (text-warning=1, @click=2, emit(=2) se cumplan sin duplicar markup"
    - "pressedKey: ref<string | null> compartido y con clave (`${key}:down`/`${key}:up`), mismo patrón de separación visual/acción que NavBand.vue pero para un número dinámico de botones"

key-files:
  created: [app/components/CounterBand.vue]
  modified: ["app/pages/[game]/index.vue"]

key-decisions:
  - "Rediseño de la primera versión del componente: un primer borrador duplicaba la plantilla de celda (bloque villano + bloque jugadores por separado), lo que producía 2 ocurrencias de text-warning, 4 de @click y 4 de emit( — todos los tres acceptance_criteria de conteo EXACTO fallaban. Se sustituyó por un único bloque de celda instanciado por v-for anidado sobre un computed `rowGroups` (agrupa villano y jugadores en dos filas lógicas), preservando el partido en dos filas de D-05/D-06 sin duplicar markup."
  - "Dos comentarios de cabecera (script del componente y el insertado en index.vue) repitieron literalmente palabras que sus propios acceptance_criteria comprobaban en conteo exacto/cero (disabled, ~~/engine, z-index) — mismo patrón de auto-fix ya documentado en 07-04-SUMMARY.md. Se reescribieron en prosa equivalente sin citar el literal exacto."
---

# Phase 7 Plan 5: Banda de contadores — componente y montaje Summary

**`CounterBand.vue` (dumb component, 96px fijos, plantilla de celda única compartida por villano/jugadores) montado como hermano inmediato de `AppHeader` en `app/pages/[game]/index.vue`**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-08T16:40:00Z (aprox.)
- **Completed:** 2026-09-08T16:55:00Z
- **Tasks:** 2/2
- **Files modified:** 2 (1 creado, 1 modificado)

## Accomplishments

- `CounterBand.vue` creado como componente tonto: sin import de `~~/engine/*` ni de ningún composable, props `cells`/emits `increment`,`decrement` tal cual el contrato ya fijado por el plan 04 y `07-UI-SPEC.md`.
- Cascarón `h-24 shrink-0 bg-surface`, nunca `flex-1` — `StepScreen` sigue siendo el único hijo `flex-1` de la pila.
- Celda villano y celdas de jugador comparten una única plantilla (glifo ▼/número/glifo ▲ a `h-24` completo + etiqueta overlay `pointer-events-none`), instanciada por `v-for` anidado sobre un `computed rowGroups` que agrupa villano (fila 1) y jugadores (fila 2) para el partido bajo 640px (D-05/D-06) y colapsa a una sola fila desde `sm:` (`sm:contents`).
- `pressedKey` único y con clave separa el feedback visual (`@mousedown`/`@touchstart`/`@mouseup`/`@touchend`) de la acción (`@click` únicamente, D-14) — ninguna línea con `@touchstart` contiene `emit(`.
- Sin `disabled`/`opacity-`, sin temporizadores de ningún tipo, sin `v-html`, sin `<input>`, sin mención de etapas/amenaza/aturdido/confundido/duro del villano.
- `<CounterBand v-if="showsCounterBand" :cells="counterCells" @increment="incrementCounter" @decrement="decrementCounter" />` montada en `app/pages/[game]/index.vue` como hermano inmediato tras `</AppHeader>` y antes de `<VoiceUnavailableNotice>`, con un comentario documentando la decisión D-03 de colocación.
- `watchDebounced`/`pagehide`, `StepScreen`, `AppHeader`, `NavBand` y `VoiceUnavailableNotice` sin tocar. Ninguna cadena nueva `'ronda'` ni referencia a `z-index`/`deep: true` en el diff.
- `npm run generate` en verde (build SSG real) tras ambas tareas.
- `npx vitest run` completo: 514/514 en verde.
- `npm run e2e -- e2e/counter-band-height.spec.ts`: 2/2 en verde, con la banda ya montada.

## Task Commits

1. **Task 1: Crear `app/components/CounterBand.vue` según la plantilla ya fijada** - `e54dba3` (feat)
2. **Task 2: Montar la banda en `app/pages/[game]/index.vue` justo bajo `AppHeader`** - `0ab2ca7` (feat)

**Plan metadata:** (pendiente — commit final gestionado por el orquestador tras la fusión de la ola)

## Files Created/Modified

- `app/components/CounterBand.vue` - Componente nuevo, 91 líneas. Cascarón fijo + celda única compartida por villano/jugadores vía `v-for` anidado.
- `app/pages/[game]/index.vue` - Cuatro nombres añadidos a la desestructuración existente de `useGameSession()`; `<CounterBand>` insertada como hermano inmediato de `AppHeader`, con comentario D-03.

## Decisions Made

- **Plantilla de celda única, no duplicada por tipo de celda:** el primer borrador del componente escribía el bloque completo de celda dos veces (una para el villano, otra para jugadores dentro de un `v-for`), lo que producía conteos duplicados en varios `acceptance_criteria` de conteo EXACTO (`text-warning` debía ser exactamente 1, `@click` exactamente 2, `emit(` exactamente 2 — el borrador producía 2, 4 y 4 respectivamente). Se corrigió introduciendo un `computed rowGroups` que agrupa las celdas en dos filas lógicas (villano / jugadores) y un único bloque de plantilla de celda instanciado por `v-for` anidado sobre esas filas — el partido visual en dos filas bajo 640px (D-05/D-06) se mantiene intacto porque cada fila lógica es su propio wrapper `sm:contents`, pero la celda en sí se escribe una sola vez en el fichero.
- **Comentarios reescritos para no duplicar literales que sus propios gates comprueban:** igual que documentó 07-04-SUMMARY.md, dos comentarios explicativos (uno en `CounterBand.vue`, otro insertado en `index.vue`) citaban textualmente palabras que los `acceptance_criteria` comprueban en conteo exacto o cero (`disabled`, `~~/engine`, `z-index`), haciendo que el grep contara la mención en prosa además de(o en vez de) la ausencia/presencia real en código. Se reescribieron para describir la misma regla sin repetir el literal exacto.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plantilla de celda duplicada producía conteos incorrectos en gates de conteo exacto**
- **Found during:** Task 1, verificación de `acceptance_criteria` tras el primer borrador
- **Issue:** El borrador inicial escribía la celda de villano y las celdas de jugador como dos bloques de plantilla independientes (uno fuera del `v-for`, otro dentro), duplicando cada literal exacto (`text-warning`, `@click`, `emit(`) que sus propios `acceptance_criteria` exigían contar en exactamente 1 o 2 ocurrencias.
- **Fix:** Se introdujo un `computed rowGroups` (villano y jugadores agrupados en dos "filas lógicas") y se reescribió la plantilla para que la celda se instancie una única vez vía `v-for` anidado sobre esas filas, preservando el partido en dos filas bajo 640px sin duplicar markup.
- **Files modified:** `app/components/CounterBand.vue`
- **Verification:** Los 15 grep de `acceptance_criteria` de la Task 1 se re-ejecutaron uno a uno tras el rediseño — todos devuelven el conteo exacto esperado.
- **Committed in:** `e54dba3` (commit de la Task 1; el ajuste se hizo antes de comprometer, no hubo commit intermedio roto)

**2. [Rule 1 - Bug] Comentarios propios duplicaban literales que sus propios gates comprobaban**
- **Found during:** Task 1 y Task 2, verificación de `acceptance_criteria`
- **Issue:** Un comentario de cabecera en `CounterBand.vue` citaba `disabled` y `~~/engine/*` en prosa explicativa, y un comentario insertado en `index.vue` (Task 2) citaba `z-index` — haciendo que los grep de `acceptance_criteria` (`disabled|opacity-` = 0, `~~/engine` = 0, `z-index|z-\[|deep: true` en el diff = 0) fallaran por la mención en prosa, no por código real.
- **Fix:** Se reescribieron los tres comentarios para describir la misma regla sin repetir el literal exacto (p. ej. "sin ningún import del motor" en vez de citar `~~/engine`; "sin tocar su apilamiento" en vez de citar `z-index`).
- **Files modified:** `app/components/CounterBand.vue`, `app/pages/[game]/index.vue`
- **Verification:** Los grep correspondientes se re-ejecutaron y devuelven 0 tras el ajuste.
- **Committed in:** `e54dba3` (CounterBand.vue) y `0ab2ca7` (index.vue) — ambos ajustes se hicieron antes de comprometer, sin commits intermedios rotos.

---

**Total deviations:** 2 auto-fijadas (1 bug estructural de plantilla duplicada, 1 bug de documentación repetido en dos ficheros)
**Impact on plan:** Ambos auto-fixes son necesarios para que el componente cumpliera literalmente los `acceptance_criteria` del plan tal como están redactados (conteos exactos); ninguno cambia el contrato de props/emits ni el comportamiento visual/interactivo pactado en `07-UI-SPEC.md`.

## Issues Encountered

- `node_modules` no existía al arrancar el worktree (no symlink, directorio ausente) — se ejecutó `npm ci` real con el `package-lock.json` ya presente en el repo (mismo caso ya documentado en 07-01-SUMMARY.md, ninguna instalación de paquete nuevo o distinto, no aplica la exclusión de Rule 3).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- La banda existe, mide 96px fijos, se pinta solo durante el bucle de rondas justo bajo `AppHeader`, sin plegado y sin nada nuevo en `AppHeader`.
- Un toque en ▼/▲ emite exactamente un cambio; no hay temporizadores, `disabled`, atenuado, destello ni `<input>`.
- El componente no importa el motor y no usa `v-html`; la persistencia de la página (`watchDebounced`/`pagehide`) no se ha tocado.
- Plan 06 (extensión de `e2e/counter-band-height.spec.ts` con la banda ya montada, y demás verificación de fase) puede apoyarse en este componente y montaje tal como quedaron fijados aquí, sin reinterpretar su forma.
- Sin bloqueos para el plan 06 de esta ola.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-08*
