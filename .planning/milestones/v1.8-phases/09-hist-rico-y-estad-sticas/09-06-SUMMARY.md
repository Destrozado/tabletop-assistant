---
phase: 09-hist-rico-y-estad-sticas
plan: 06
subsystem: ui
tags: [vue, nuxt, historico, estadisticas, tailwind]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    plan: "09-05"
    provides: "useGameHistory(): cardViews, statisticsView, isEmpty, reload, remove, record — todas las cadenas ya formateadas que estas pantallas pintan"
provides:
  - "app/components/HistoryEntryCard.vue: tarjeta tonta de una entrada del histórico"
  - "app/pages/historico.vue: ruta /historico con lista, borrado confirmado y estado vacío"
  - "app/pages/estadisticas.vue: ruta /estadisticas con las dos tablas de % de victorias, línea de muestra y estado vacío"
affects: ["09-07", "09-08"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Página fina: composable (useGameHistory) + navigateTo en el script, un ref `cargado` puesto a true en onMounted tras reload() — mismo criterio que resumeResolved en app/pages/[game]/index.vue, para no afirmar 'no hay nada' antes de haber mirado localStorage"
    - "Cabecera propia de tres zonas (‹ Atrás / título / enlace cruzado), reutilizada literalmente entre historico.vue y estadisticas.vue"
    - "Filas de estadística son div, nunca button — sin aria-label ni afordancia falsa (D-09 de la Fase 8, aplicado aquí a D-25)"

key-files:
  created:
    - app/components/HistoryEntryCard.vue
    - app/pages/historico.vue
    - app/pages/estadisticas.vue
  modified: []

key-decisions: []

requirements-completed: [HIST-07, HIST-08, STAT-02, STAT-03, STAT-04, STAT-05]

# Metrics
duration: 40min
completed: 2026-09-10
---

# Phase 9 Plan 6: Pantallas de histórico y estadísticas Summary

**`/historico` (lista con borrado confirmado) y `/estadisticas` (dos tablas de % de victorias), más `HistoryEntryCard.vue`, la tarjeta tonta que las alimenta — las tres piezas solo pintan cadenas ya formateadas por `useGameHistory()`, sin calcular, ordenar ni importar nada del motor.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-10T10:05:00Z (tras corregir la base del worktree con `git reset --hard` al cierre de la ola 3)
- **Completed:** 2026-09-10T10:07:34Z
- **Tasks:** 3/3 completadas
- **Files modified:** 3 (los 3 nuevos)

## Accomplishments

- `HistoryEntryCard.vue`: tarjeta tonta que pinta resultado, fecha, causa (solo en derrota), contexto, filas de jugador o la línea colapsada `Sin héroes ni villano anotados` (D-12), ronda+duración y el control `Borrar` — que solo emite `delete`, nunca borra por su cuenta.
- `app/pages/historico.vue`: lista las partidas de más reciente a más antigua (HIST-07), abre el `ConfirmDialog` existente (`destructive: true`, cuerpo citando la partida concreta) al pulsar `Borrar` (HIST-08/D-20), y muestra un estado vacío propio (D-22) cuando no hay entradas. Cabecera de tres zonas con `‹ Atrás` a `/` y el enlace cruzado `Estadísticas ›` a `/estadisticas` (D-16/D-18).
- `app/pages/estadisticas.vue`: las dos tablas `% DE VICTORIAS POR HÉROE` / `% DE VICTORIAS POR VILLANO`, filas ya ordenadas por la cascada de D-24 (el componente no reordena nada), recuento y porcentaje al mismo peso visual (D-25), línea de muestra (D-12) solo cuando `sampleCaption` no es `null`, y un estado vacío que nunca pinta una cabecera de tabla sin filas ni un `0 %` (STAT-05). Cabecera simétrica con enlace cruzado `Histórico ›`.
- Las tres piezas verificadas con `npx nuxt build` (código 0) y los 638 tests del proyecto en verde (`npm test`); ningún grep de `~~/engine`, `v-html`, `firestore`/`firebase`/`fetch(` encuentra ninguna línea en los tres ficheros.

## Task Commits

Each task was committed atomically:

1. **Task 1: HistoryEntryCard.vue** - `3be6e45` (feat)
2. **Task 2: app/pages/historico.vue** - `de5fd56` (feat)
3. **Task 3: app/pages/estadisticas.vue** - `50d75dd` (feat)

**Plan metadata:** (pendiente — commit de cierre de este SUMMARY, lo hace el orquestador tras el merge)

## Files Created/Modified

- `app/components/HistoryEntryCard.vue` — tarjeta tonta de una entrada del histórico, props calcadas de `HistoryCardView` menos `id`, emite `delete`
- `app/pages/historico.vue` — ruta `/historico`: lista + estado vacío + `ConfirmDialog` de borrado
- `app/pages/estadisticas.vue` — ruta `/estadisticas`: dos tablas + línea de muestra + estado vacío

## Decisions Made

Ninguna decisión nueva. Todo lo construido sigue al pie de la letra `09-UI-SPEC.md` (§3, §4, §5, §6, §7) y las interfaces ya cerradas por `09-05-SUMMARY.md`.

## Deviations from Plan

### Nota de proceso: criterio mecánico de grep con falso positivo (mismo patrón ya documentado en 09-01/09-04/09-05)

- **Encontrado durante:** verificación de los criterios de aceptación de las Tasks 1 y 2.
- **Detalle:** los criterios de la Task 1 (`grep -Ec "~~/engine|useGameHistory|localStorage|Date\(" ...` debe devolver 0) y de la Task 2 (`grep -c "onMounted"` / `grep -c "reload()"` deben devolver 1) chocaban con los propios comentarios explicativos del código, que mencionaban esos nombres en prosa, y con el import nombrado de `onMounted`, que añade una línea más además de la llamada real.
- **No es un bug de código:** en los tres casos la funcionalidad es exactamente la que pide el criterio (ningún import real del motor en `HistoryEntryCard.vue`; un único `onMounted` real y una única llamada real a `reload()` dentro de él en `historico.vue`). Se ajustó la redacción de los comentarios para evitar los falsos positivos donde era trivial (Task 1, ahora en 0); donde el propio import nombrado de Vue hace inevitable un segundo match (Task 2, `onMounted` cuenta 2: import + llamada), se deja documentado aquí en vez de forzar un import por namespace que rompería la convención del resto del repo sin ganar nada.
- **No se modificó ninguna lógica para forzar un conteo exacto.**

## Issues Encountered

Ninguno.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/historico` y `/estadisticas` están completas y enlazadas entre sí (D-18) y con `/` (D-16); listas para que el plan 09-07 (los dos accesos secundarios en la pantalla de inicio, D-17) navegue hacia ellas.
- `HIST-07`, `HIST-08`, `STAT-02`, `STAT-03`, `STAT-04` y `STAT-05` quedan marcados como Satisfecho en `.planning/REQUIREMENTS.md` (edición restringida solo a las filas de estos 6 IDs, sin tocar ninguna otra fila del fichero — un plan hermano en la misma ola también escribe en él).
- Sin bloqueos conocidos.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno. Las tres mitigaciones del `<threat_model>` del plan están confirmadas:
- T-09-18: interpolación siempre con `{{ }}` en `HistoryEntryCard.vue`; `grep -Ec "v-html|innerHTML"` devuelve 0.
- T-09-19: `Borrar` nunca borra en su propio toque; abre el `ConfirmDialog` existente con `destructive: true`; cancelar deja la entrada intacta (verificado por lectura del código, sin prueba de interacción automatizada en este plan).
- T-09-20: las dos páginas solo importan `useGameHistory`; `grep -rEi "firestore|firebase|fetch\("` en los tres ficheros no devuelve ninguna línea.

## Self-Check

- FOUND: app/components/HistoryEntryCard.vue
- FOUND: app/pages/historico.vue
- FOUND: app/pages/estadisticas.vue
- FOUND commit: 3be6e45
- FOUND commit: de5fd56
- FOUND commit: 50d75dd

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-10*
