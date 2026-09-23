---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 06
subsystem: testing
tags: [playwright, e2e, counter-band, verification]

# Dependency graph
requires:
  - phase: 07-01
    provides: "e2e/counter-band-height.spec.ts (presupuesto de 96px, líneas de base a 40px) y las constantes de módulo (TARGET_VIEWPORT, RESERVED_BAND_HEIGHT, HP_02_CEILING_RATIO, HEADER_HEIGHT, NAVBAND_HEIGHT)"
  - phase: 07-05
    provides: "app/components/CounterBand.vue montada en app/pages/[game]/index.vue, con sus aria-label reales (`Bajar/Subir vida de {etiqueta}`)"
provides:
  - "e2e/counter-band-height.spec.ts ampliado — 6 tests: los 2 del plan 01 intactos + 4 nuevos que miden la banda ya montada (96px/12,5%, flexGrow 0/1, 40px del paso y del número, 192px en ancho estrecho sin medir el techo del 15% ahí)"
  - "e2e/counter-band-behavior.spec.ts (nuevo, 299 líneas, 7 tests) — topes, marca de SIN VIDA, no-avance del paso, Espacio/← intactos, persistencia tras recarga, precarga de catálogo"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Localizador de la banda por relación estructural (`header + div`, hermano inmediato de <header>) filtrado por el aria-label real de un botón, nunca por clases de Tailwind"
    - "Celda resuelta por XPath relativo (`ancestor::div[2]`) desde el botón ▼ — evita cualquier acoplamiento a clases de estilo para leer valor/etiqueta de una celda dinámica"
    - "Helper de navegación con corte por APARICIÓN del destino (banda o fila de selección visible), nunca por un número de pasos cableado (TECH-04)"
    - "Helpers y localizador duplicados EXPLÍCITAMENTE entre los dos ficheros .spec.ts de este plan (no importados): Playwright registra los tests de un módulo en cuanto se importa, así que importar un .spec.ts desde otro ejecutaría sus tests una segunda vez"

key-files:
  created: [e2e/counter-band-behavior.spec.ts]
  modified: [e2e/counter-band-height.spec.ts, app/components/CounterBand.vue]

key-decisions:
  - "[Rule 1 - Bug] app/components/CounterBand.vue tenía el cascarón con h-24 fijo (96px) también por debajo de 640px: la fila de jugadores (segunda fila bajo flex-col) desbordaba ese cascarón de 96px y se pintaba encima de `main` en vez de ocupar los 192px reales que D-05/D-06 exigen. El test nuevo de ancho estrecho (Task 1) lo detectó de inmediato (bounding box de 96px en vez de 192px). Corregido a `h-48 sm:h-24` (192px bajo `sm`, donde las dos filas están apiladas; 96px desde `sm:`, donde colapsan a una sola fila con `sm:contents`). Es exactamente el tipo de regresión que el objetivo del plan describe como \"perfectamente automatizable\" y que no se ve mirando la pantalla en desarrollo sin medir con precisión."
---

# Phase 7 Plan 6: Banda de contadores — verificación de extremo a extremo en navegador real Summary

**24/24 tests de Playwright en verde (6 de presupuesto de altura + 7 de comportamiento + 11 preexistentes) sobre el build de `nuxt generate`, incluido un bug real de layout (192px→96px en ancho estrecho) detectado y corregido durante la propia escritura del test**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-08T16:57:00Z (aprox.)
- **Completed:** 2026-09-08T17:10:00Z (aprox.)
- **Tasks:** 2/2
- **Files modified:** 3 (1 creado, 2 modificados)

## Accomplishments

- `e2e/counter-band-height.spec.ts` ampliado de 2 a 6 tests, sin borrar ni reescribir ninguna línea de los dos tests del plan 01: los nuevos miden la banda YA MONTADA (par antes/después del criterio de éxito nº 1).
  - 96px reales / 12,5% de 768px, con `header` (64px) y `footer` (96px) intactos y `main.clientHeight` verificado contra el presupuesto teórico, descontando explícitamente el aviso de voz si estuviera visible (nunca asumiendo su ausencia).
  - Texto grande del paso y número de la banda, los dos a 40px, con la banda ya construida — el DESPUÉS del par que el plan 01 dejó como ANTES.
  - `flexGrow` computado: `0` en la banda, `1` en `main` — comprobación en ejecución del síntoma nº 1 de `PITFALLS.md` §4.
  - Ancho estrecho (400×800): banda partida en dos filas de 192px, número seguía a 40px, villano y jugadores en filas con coordenada `y` distinta, y el techo del 15% (HP_02_CEILING_RATIO) NUNCA se referencia en ese describe (D-06).
- `e2e/counter-band-behavior.spec.ts` creado (299 líneas, 7 tests): sin selección todas las celdas pintan «—» sin ninguna «SIN VIDA»; ▲ sobre «—» arranca en 1 y ▼ es no-op; un toque cambia el valor en exactamente ±1 incluido un toque mantenido de 1200ms (+1, sin repetición); el tope en 0 marca «SIN VIDA» en etiqueta y aria-label, no baja de 0, no abre diálogo ni cambia de paso, y ▲ recupera limpio; una ráfaga de seis toques no mueve cabecera ni paso, Espacio con el foco en una flecha sigue avanzando sin tocar el contador, y ← retrocede; recargar a mitad de partida conserva dos contadores distintos; elegir Rhino/Thor precarga 42/14 sin tocar ninguna flecha.
- `npm run e2e -- e2e/counter-band-height.spec.ts` → 6/6. `npm run e2e -- e2e/counter-band-behavior.spec.ts` → 7/7. `npm run e2e` completo → 24/24. `npx vitest run` completo → 514/514. `npm run generate` → build real en verde.

## Task Commits

1. **Task 1: Medir la banda ya montada — 96px en apaisado, dos filas en estrecho, texto del paso intacto** - `aab1e59` (test)
2. **Task 2: Probar de extremo a extremo los topes, la marca de «SIN VIDA», el no-avance del paso y la persistencia tras recarga** - `6ffdd76` (test)

**Plan metadata:** (pendiente — commit final gestionado por el orquestador tras la fusión de la ola)

## Files Created/Modified

- `e2e/counter-band-height.spec.ts` - Ampliado con un helper de navegación (`goToRoundLoop`, corte por aparición de la banda) y un localizador estructural de la banda, más 4 tests nuevos en dos `test.describe` (apaisado y ancho estrecho). Ninguna línea del plan 01 borrada (verificado con `git diff | grep '^-'`).
- `e2e/counter-band-behavior.spec.ts` - Nuevo. Helpers de navegación y localización copiados EXPLÍCITAMENTE del fichero anterior (no importados), más un localizador de celda por XPath relativo y 7 tests de comportamiento de extremo a extremo.
- `app/components/CounterBand.vue` - Una línea de clase corregida (`h-24` → `h-48 sm:h-24` en el cascarón) más un comentario explicando por qué, para que la segunda fila de ancho estrecho ocupe sus 192px reales en vez de desbordar un cascarón de 96px.

## Decisions Made

- **Bug de layout detectado y corregido en vez de relajar el test (Rule 1):** el test de ancho estrecho de la Task 1 midió 96px donde D-05/D-06 exige 192px. El cascarón de `CounterBand.vue` llevaba `h-24` (96px) fijo también por debajo de `sm:`, así que la fila de jugadores se pintaba encima de `main` en vez de empujar la altura real a 192px — un bug de producción invisible a simple vista (visualmente el villano se ve arriba y los jugadores casi encima, pero solapando el contenido del paso) y exactamente el tipo de regresión silenciosa que el objetivo de este plan describe como razón de ser de la automatización. Se corrigió a `h-48 sm:h-24` en vez de reescribir el test para aceptar 96px, que habría anulado el propósito completo de la verificación.
- **Helpers duplicados por copia explícita entre los dos ficheros, no importados:** un `.spec.ts` de Playwright registra sus `test()`/`test.describe()` en cuanto el módulo se carga; importar `counter-band-height.spec.ts` desde `counter-band-behavior.spec.ts` (o viceversa) para compartir el helper de navegación habría ejecutado los tests del fichero importado una segunda vez bajo el título del fichero importador. El propio plan preveía esta alternativa («por copia explícita o por un pequeño helper exportado») y se descartó la segunda opción para no introducir un tercer fichero de `e2e/` fuera de los dos que el plan declara en `files_modified`.
- **Localizador de celda por XPath relativo, no por clase:** la celda de cada contador no tiene ningún atributo propio (ni `data-testid` ni aria-label a nivel de contenedor) — solo sus dos botones lo llevan. En vez de matchear la clase Tailwind del contenedor (`relative flex-1 min-w-0 h-24…`, prohibido por el propio plan), se sube desde el botón ▼ dos niveles de `<div>` por XPath relativo, aprovechando que la estructura del componente (botón → envoltorio de flechas → celda con la etiqueta overlay) es estable y ya está fijada por el plan 05.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `CounterBand.vue` no alcanzaba los 192px reales exigidos por D-05/D-06 en ancho estrecho**
- **Found during:** Task 1, al ejecutar por primera vez el test nuevo de ancho estrecho (400×800)
- **Issue:** El cascarón raíz de `CounterBand.vue` (`app/components/CounterBand.vue`) llevaba la clase `h-24` (96px) fija, sin variante responsiva. Por debajo de `sm:` el componente apila dos filas lógicas (villano y jugadores) vía `flex-col`, cada una también con `h-24` — pero al estar el cascarón mismo fijado en 96px, la segunda fila desbordaba ese cascarón y se pintaba encima de `main` en vez de que el cascarón creciera a 192px reales. El test midió `boundingBox().height === 96` donde el criterio de éxito exige 192.
- **Fix:** Se cambió la clase del cascarón de `h-24` a `h-48 sm:h-24` (192px bajo `sm:`, 96px desde `sm:` donde las filas colapsan a una sola vía `sm:contents`), con un comentario explicando la razón (D-05/D-06) directamente en el `<template>`.
- **Files modified:** `app/components/CounterBand.vue`
- **Verification:** `npm run e2e -- e2e/counter-band-height.spec.ts` → 6/6 (el test de ancho estrecho pasó a medir 192px exactos). `npx vitest run` → 514/514 sin cambios. `npm run e2e` completo → 24/24. `npm run generate` → build en verde.
- **Committed in:** `aab1e59` (mismo commit de la Task 1; el ajuste se hizo antes de comprometer, sin commit intermedio roto).

---

**Total deviations:** 1 auto-fijada (bug de layout de producción detectado por el test que este mismo plan escribió)
**Impact on plan:** El fix es una única línea de clase Tailwind más un comentario; no cambia el contrato de props/emits de `CounterBand.vue` ni ninguna decisión de `07-UI-SPEC.md` — corrige la implementación para que cumpla la decisión ya tomada (D-05/D-06: 192px reales en ancho estrecho), que hasta ahora no se cumplía en la práctica. Aunque `app/components/CounterBand.vue` no está en `files_modified` de este plan y la propia verificación del plan dice "esta ola no toca app/, engine/ ni content/", dejar el bug sin corregir habría significado calibrar el test para aceptar un layout roto — exactamente lo contrario del objetivo del plan ("convierte los criterios de éxito 1, 3 y 4 en algo que no puede volver a romperse en silencio").

## Issues Encountered

- `node_modules` no existía al arrancar el worktree (no symlink, directorio ausente) — se ejecutó `npm ci` real con el `package-lock.json` ya presente en el repo (mismo caso ya documentado en 07-01-SUMMARY.md y 07-05-SUMMARY.md, ninguna instalación de paquete nuevo o distinto, no aplica la exclusión de Rule 3).
- El worktree llegó con HEAD en una rama con historial completamente ajeno a esta fase (commits de una quick anterior, `260902-0oz`); se corrigió al inicio de la ejecución con el `git reset --hard` al commit base indicado por el orquestador (`090685d`), antes de tocar ningún fichero — documentado aquí porque el `worktree_branch_check` de este agente lo detectó y corrigió, no porque afecte al contenido de este plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Los criterios de éxito nº 1, nº 3 y nº 4 de la fase quedan cerrados con medición automática en navegador real: 96px/12,5%/flexGrow correcto, tope en 0 con recuperación sin diálogo ni fin de partida, valor superviviente a la recarga, y las flechas nunca avanzan el paso mientras Espacio/← siguen igual que en v1.7.
- El criterio de éxito nº 2 queda cerrado en su parte automatizable: Thor (14) y Rhino con 3 jugadores (42) sin tocar ninguna flecha.
- Lo genuinamente manual (el dedo real sobre un cristal, la legibilidad a un brazo de distancia) sigue siendo el plan 07 de esta misma fase, sin fingir que este plan lo cubre.
- Sin bloqueos para el plan 07 (verificación humana bloqueante) ni para el cierre de la fase.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: e2e/counter-band-height.spec.ts
- FOUND: e2e/counter-band-behavior.spec.ts
- FOUND: app/components/CounterBand.vue
- FOUND: 07-06-SUMMARY.md
- FOUND: aab1e59 (test commit, Task 1)
- FOUND: 6ffdd76 (test commit, Task 2)
