---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 10
subsystem: ui
tags: [playwright, e2e, tailwind, accessibility, tap-feedback]

# Dependency graph
requires:
  - phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n (plan 07-08)
    provides: "CounterBand.vue con overflow-hidden en la celda, flechas encogibles (min-w-0) y número con suelo de anchura responsivo — hueco CR-01 ya cerrado"
provides:
  - "CounterBand.vue: separador de celda por índice global (no :first-child), altura del cascarón derivada del número real de filas, limpieza del estado de pulsado en 4 rutas (mouseup/mouseleave/blur/touchcancel), transición que cubre transform y filter, flechas ▼/▲ fuera del recorrido de tabulación (tabindex=\"-1\")"
  - "NavBand.vue: mismo juego de 4 manejadores de limpieza de pulsado y la misma transición ampliada, para que la reutilización literal que declara CounterBand.vue siga siendo cierta"
  - "e2e/counter-band-behavior.spec.ts: 3 tests nuevos que miden borderLeftWidth real en dos viewports, el estado de pulsado tras soltar fuera/touchcancel, y tabIndex/recorrido de tabulación de las 8 flechas"
affects: [verificación de cierre de la Fase 7]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Índice global continuo a través de rowGroups en vez de :first-child para decidir el separador — first: se evalúa contra el árbol del DOM y sm:contents no cambia la parentela, así que dos celdas pueden ser :first-child a la vez"
    - "tabindex=\"-1\" para sacar un control nativo del recorrido de tabulación sin tocar el composable de atajos de teclado que hace preventDefault() sobre Espacio/Enter"

key-files:
  created: []
  modified:
    - app/components/CounterBand.vue
    - app/components/NavBand.vue
    - e2e/counter-band-behavior.spec.ts

key-decisions:
  - "El separador se decide por el índice GLOBAL de la celda (0 = sin borde, resto = con borde) más un reseteo acotado a max-sm:first: para el primer hijo de cada fila por debajo de 640px, en vez de eliminar first:border-l-0 sin más — así ambos viewports (1024x768 y 400x800) miden el patrón correcto sin depender de :first-child"
  - "La limpieza del pulsado se aplica a los 4 botones de ambos componentes (CounterBand y NavBand), no solo a los de la banda de contadores, porque el comentario de cabecera de CounterBand.vue afirma que reutiliza el patrón de NavBand literalmente — dejar los dos componentes con manejadores distintos habría convertido esa afirmación en falsa"
  - "tabindex=\"-1\" en el componente, sin tocar useStepShortcuts.ts ni añadir una guarda de BUTTON a isEditableTarget — la alternativa (excluir BUTTON) habría roto Espacio/Enter para todos los botones de la app, no solo los de la banda de contadores"

requirements-completed: [HP-03, HP-10]

# Metrics
duration: ~35min
completed: 2026-09-09
---

# Phase 07 Plan 10: Cierre de tres avisos de presentación (WR-01, WR-02/WR-09, WR-03) Summary

**Separador de celda por índice global, limpieza del estado de pulsado en 4 rutas de evento, y flechas fuera del recorrido de tabulación — los tres avisos que `07-REVIEW.md` confirmó con medición contra `CounterBand.vue`, sin tocar `useStepShortcuts.ts`**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3/3 completadas
- **Files modified:** 3 (0 creados, 3 modificados)

## Accomplishments

- **WR-01 (separador ausente entre VILLANO y Jugador 1):** `rowGroups` ahora anota cada celda con su índice global continuo a través de los dos grupos; el borde izquierdo se decide por ese índice en vez de `:first-child`, más un reseteo `max-sm:first:border-l-0` acotado a anchos estrechos. Medido: a 1024×768 VILLANO `0px` / Jugador 1-3 `1px`; a 400×800 VILLANO `0px` / Jugador 1 `0px` / Jugador 2-3 `1px`.
- **WR-04 (segundo defecto, por proximidad estricta):** la altura del cascarón (`shellHeightClass`) se deriva del número real de filas en `rowGroups` (`h-24` con una fila, `h-48` con dos) en vez de cablear `h-48` siempre.
- **WR-02 (pulsado que se queda pegado):** los cuatro botones de `CounterBand.vue` y `NavBand.vue` ganan `@mouseleave`, `@blur` y `@touchcancel` además de `@mouseup`/`@touchend`. La acción sigue atada solo a `@click` (D-14); ningún temporizador se introdujo (D-13, reafirmado por una aserción de comportamiento: mantener pulsado ~1s produce exactamente +1).
- **WR-09 (por proximidad estricta):** `transition-transform` → `transition-[transform,filter]` en los cuatro botones, para que `scale` y `brightness` se animen juntos en vez de que el brillo salte de golpe.
- **WR-03 (flechas enfocables pero inoperables):** `tabindex="-1"` en las dos flechas ▼/▲ de `CounterBand.vue`. Siguen siendo `<button>` nativos, siguen respondiendo al clic y siguen pudiendo recibir foco por código (el test preexistente de Espacio/← no se modificó, y sigue en verde). `useStepShortcuts.ts` no se tocó.

## Task Commits

Cada tarea se comprometió atómicamente:

1. **Task 1: Separador independiente de `:first-child` y altura del cascarón derivada** - `e5e2395` (fix)
2. **Task 2: El estado de pulsado se limpia siempre, y se anima entero** - `31e6799` (fix)
3. **Task 3: Las flechas salen del recorrido de tabulación, sin tocar los atajos** - `78cb88f` (fix)

## Mediciones registradas

**WR-01 — `borderLeftWidth` computado (nuevo test, 3 jugadores):**

| Viewport | VILLANO | Jugador 1 | Jugador 2 | Jugador 3 |
|----------|---------|-----------|-----------|-----------|
| 1024×768 | `0px`   | `1px`     | `1px`     | `1px`     |
| 400×800  | `0px`   | `0px`     | `1px`     | `1px`     |

**WR-02 — estado de pulsado (nuevo test, botón ▲ de VILLANO):**

- Tras `mousedown`: `pressed = true`.
- Tras mover el puntero fuera del botón (sin soltar): `pressed = false` (antes de `mouseup`).
- Soltar fuera del botón: el valor del contador no cambió.
- Tras `touchstart`: `pressed = true`. Tras `touchcancel`: `pressed = false`, valor sin cambios.
- Mantener pulsado ~1s y soltar sobre el botón: valor cambió en exactamente `+1`.

**WR-03 — `tabIndex` y recorrido de tabulación (nuevo test, 3 jugadores):**

- Los 8 botones de contador (VILLANO + 3 jugadores × 2 flechas) miden `tabIndex === -1`.
- 15 pulsaciones de tabulador desde `body`: ninguna deja el foco en una flecha de contador.
- En esa misma pasada el foco sí llega al botón «SIGUIENTE» de `NavBand`.

**Verificación completa:**

- `npm run generate` → verde (6 rutas prerenderizadas, PWA precache de 64 entradas).
- `npm run e2e` completo → **34/34 passed** (~40s): los 24 tests preexistentes + los 7 del plan 07-08 + los 3 nuevos de este plan.
- `npm run test` (Vitest) → **537/537 passed** — este plan no tocó `engine/` ni composables.

## Files Created/Modified

- `app/components/CounterBand.vue` (modificado) - `rowGroups` anota índice global por celda; separador basado en índice + `max-sm:first:border-l-0`; `shellHeightClass` deriva `h-24`/`h-48`; los cuatro botones ganan `@mouseleave`/`@blur`/`@touchcancel`; `transition-[transform,filter]`; `tabindex="-1"` en ambas flechas
- `app/components/NavBand.vue` (modificado) - mismo juego de 4 manejadores de limpieza de pulsado y misma transición ampliada en los dos botones, para mantener la reutilización literal declarada en `CounterBand.vue`
- `e2e/counter-band-behavior.spec.ts` (modificado) - 3 tests nuevos (WR-01, WR-02, WR-03); los 7 tests preexistentes no se modificaron (verificado: `git diff` del fichero no contiene ninguna línea eliminada, solo adiciones)

## Decisions Made

Ver `key-decisions` en el frontmatter.

## Deviations from Plan

None - plan executed exactly as written. Las tres correcciones, su triaje explícito de lo diferido (WR-04 primer defecto, WR-06, WR-08, IN-01, IN-02) y la secuencia de tareas coinciden con `07-10-PLAN.md`.

## Issues Encountered

Ninguno de contenido. Nota operativa: el worktree de este agente arrancó con `HEAD` apuntando a un commit de una sesión anterior no relacionada (`quick-260902-0oz`) en vez del commit base esperado (`6aab3c8`, fin de la ola 1 de este cierre de huecos). Se corrigió con el `git reset --hard` al commit base que el propio protocolo de arranque del ejecutor prescribe para este caso (working tree estaba limpio antes del reset, sin pérdida de trabajo).

## Known Stubs

None. No se introdujo ningún dato vacío, texto de relleno ni componente sin fuente de datos.

## User Setup Required

None - no se requiere configuración externa.

## Next Phase Readiness

- Los tres avisos WARNING de `07-REVIEW.md` que este plan se propuso cerrar (WR-01, WR-02, WR-03) quedan cerrados con prueba de regresión ejecutable, más WR-04 (segundo defecto) y WR-09 por proximidad estricta.
- Diferidos explícitamente y registrados en el `<objective>` del plan: WR-04 (primer defecto, cambio de contrato de datos), WR-05/WR-06/WR-07 (motor y tooling, fuera del alcance de este componente — corresponden a los planes 07-09 y posteriores si no están ya cerrados), WR-08, IN-01, IN-02.
- La matriz de solapamiento del plan 07-08 (`e2e/counter-band-overlap.spec.ts`) sigue en verde sin haberse tocado.
- La verificación de cierre de la Fase 7 debe reconfirmar formalmente que estos tres avisos ya no aparecen al releer el código actual.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-09*

## Self-Check: PASSED

Todos los ficheros modificados verificados presentes en disco; los tres commits de tarea (e5e2395, 31e6799, 78cb88f) verificados presentes en `git log`.
