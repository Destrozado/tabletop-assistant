---
phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
plan: 08
subsystem: ui
tags: [vue, nuxt, tailwindcss-v4, composables, ssg]

requires:
  - phase: 01-07
    provides: "engine/ puro (expand, navigator, resolve, types) y content/ (marvel-champions.json, games-index.ts)"
provides:
  - "useGameContent(): getGame(gameId) + games, import estático del contenido, sin engine/schema, sin fetch en runtime"
  - "useGameSession(): única costura reactiva entre el motor puro y Vue — start/next/prev/jumpTo + computeds currentNode/currentText/sectionLabel/position/sessionContextLabel"
  - "AppHeader, StepScreen, NavBand: las tres bandas tontas de 01-UI-SPEC.md, con los tamaños de banda y tap-target del contrato"
  - "app/pages/[game]/index.vue: runner real que compone las tres bandas y recorre el contenido validado de Marvel Champions con SIGUIENTE/Atrás, prerenderizado a estático"
affects: ["01-02", "01-03", "01-04", "01-05", "01-06"]

tech-stack:
  added: []
  patterns: ["composable como única costura motor puro -> Vue (los componentes son tontos, nunca importan ~~/engine)", "guard de cliente (ClientOnly) alrededor de todo bloque cuyo estado dependerá de localStorage en planes futuros, aunque hoy sea determinista", "nitro.prerender.crawlLinks:false + routes explícitas cuando no todas las rutas de fichero existen todavía"]

key-files:
  created:
    - app/composables/useGameContent.ts
    - app/composables/useGameSession.ts
    - app/components/AppHeader.vue
    - app/components/StepScreen.vue
    - app/components/NavBand.vue
    - app/pages/[game]/index.vue
  modified:
    - nuxt.config.ts

key-decisions:
  - "position se calcula filtrando session.sequence por step.kind === 'step' y buscando el índice del runtimeId actual dentro de ese subconjunto; devuelve null si el nodo actual es kind 'summary' (D-03)"
  - "sectionLabel se deriva de currentNode.sectionTitle.toUpperCase(), nunca del id 'setup' ni codificado como 'PREPARACIÓN' — punto de extensión de D-11 para la cabecera de Fase 2"
  - "El runner monta las tres bandas dentro de <ClientOnly> con un fallback 'Cargando…': hoy el contexto de sesión es un STUB determinista sin localStorage, pero la estructura del guard queda lista para 01-02/01-04 sin reorganizar la página (Pitfall 7). Efecto secundario aceptado: el HTML estático de 'npm run generate' muestra el fallback, no el paso 1 — el paso 1 real solo aparece tras la hidratación en el navegador"
  - "nitro.prerender: crawlLinks:false y routes:['/marvel-champions'] (sin '/') — Nitro semilla el crawler en '/' por defecto incluso sin declararla en routes, y todavía no existe app/pages/index.vue (llega en 01-02); crawlLinks:false evita ese 404 sin tocar ninguna decisión estructural"

requirements-completed: [FLOW-01, FLOW-02, FLOW-05, UI-01, UI-02, UI-03, UI-05]

duration: 12min
completed: 2026-08-28
---

# Fase 1 Plan 08: Composables de la costura motor-Vue y runner de tres bandas Summary

**Los dos composables que son la única costura entre el motor puro y Vue, más las tres bandas tontas de `01-UI-SPEC.md` y la página `/[game]` que las compone — cierran el Esqueleto Andante recorriendo los 3 pasos reales del bloque HÉROES con SIGUIENTE/Atrás, prerenderizado a estático.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-08-28T13:56 (sesión)
- **Completed:** 2026-08-28T14:05
- **Tasks:** 2/2 completadas
- **Files modified:** 6 nuevos + 1 modificado (`nuxt.config.ts`)

## Accomplishments

- **Esqueleto Andante cerrado de extremo a extremo** (planes 01-01 + 01-07 + 01-08): contenido JSON validado → esquema Zod (solo en build/CI) → motor puro → composables → componentes Vue → build estático. `npm run generate` produce `.output/public/marvel-champions/index.html` con código de salida 0.
- `useGameSession` es la única costura reactiva del proyecto: ningún componente importa `~~/engine/*` directamente (`grep -rn "~~/engine" app/components/` no devuelve nada); las cinco computeds (`currentNode`, `currentText`, `sectionLabel`, `position`, `sessionContextLabel`) derivan siempre del `EngineSession` reasignado por las funciones puras del motor.
- `useGameContent` resuelve el contenido por import estático (`~~/content/marvel-champions.json`, `~~/content/games-index.ts`), sin `fetch`/`useFetch`/`$fetch` y sin importar `~~/engine/schema` — `grep -rn "zod" app/` no devuelve nada, confirmando que Zod nunca llega al bundle del navegador.
- Las tres bandas (`AppHeader` 64px, `StepScreen` centrado verticalmente, `NavBand` 96px) implementan literalmente los tamaños, colores y tipografía de `01-UI-SPEC.md`: `≡` y los botones de navegación en 48×48dp o más, `SIGUIENTE` con relleno `bg-accent`/`text-on-accent`, ningún estado `disabled` en esta fase, y prohibición dura de HTML crudo (`grep -rn "v-html" app/` no devuelve nada).
- Reproduje la lógica exacta del runner (`expand` → `next`/`prev` → `resolveText`) contra el `content/marvel-champions.json` real en un test desechable (no comiteado) para confirmar sin navegador que el recorrido de los 3 pasos de HÉROES con SIGUIENTE/Atrás y el clamp en los extremos funcionan tal como los usará la página; la suite real del motor sigue en 29/29 tras retirar ese test temporal.

## Task Commits

1. **Tarea 1: Los dos composables — la única costura entre el motor puro y Vue** - `ee7e547` (feat)
2. **Tarea 2: Las tres bandas de la UI y la página runner** - `7da0fd4` (feat)

_Plan de un solo tramo (`type: execute`), sin TDD — no aplica el flujo RED/GREEN/REFACTOR._

## Files Created/Modified

- `app/composables/useGameContent.ts` - `getGame(gameId)` + `games`, import estático del contenido, cero `fetch`, cero `zod`
- `app/composables/useGameSession.ts` - `ref<EngineSession|null>`, `start`/`next`/`prev`/`jumpTo` que reasignan el ref con el resultado de las funciones puras del motor, y las cinco computeds derivadas
- `app/components/AppHeader.vue` - banda de 64px (`h-16`), tres zonas, `≡` con `aria-label="Abrir índice"`, zona derecha lista para más de dos hijos
- `app/components/StepScreen.vue` - contenido centrado, columna máx. 960px, frase Display/700, línea de aviso opcional en `text-warning`
- `app/components/NavBand.vue` - banda de 96px (`h-24`), Atrás ~35%/sin relleno, SIGUIENTE ~65%/`bg-accent`, feedback pressed en `mousedown`/`touchstart`
- `app/pages/[game]/index.vue` - runner real: resuelve `GameDefinition` por parámetro de ruta, mensaje neutro si no existe, arranca la sesión bajo `<ClientOnly>` con el contexto STUB y cablea `next`/`back` de `NavBand` a `useGameSession`
- `nuxt.config.ts` - `nitro.prerender.crawlLinks: false` y `routes: ['/marvel-champions']` (ver Deviations)

## Decisions Made

Ver `key-decisions` en el frontmatter. Resumen: `position`/`sectionLabel` derivadas genéricamente del nodo actual (nunca codificadas contra `'setup'`), el runner queda bajo un guard de cliente por adelantado aunque hoy no haya `localStorage`, y el prerender de Nitro se ajustó para no intentar generar `/` antes de que exista su página real.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npm run generate` fallaba con `[404] Page not found: /`**
- **Found during:** Tarea 2, primera verificación (`npm run generate`)
- **Issue:** El scaffold de 01-01 dejó `nitro.prerender.routes: ['/', '/marvel-champions']` cuando `app/pages/` no existía todavía y Nuxt servía un catch-all por defecto para cualquier ruta. Al añadir `app/pages/[game]/index.vue` en esta tarea, el enrutado por fichero pasó a ser real y `/` deja de tener ninguna página que la resuelva (llega en el plan 01-02, el selector) — Nitro además siembra su crawler en `/` por defecto aunque no esté en `routes`, así que quitar solo la entrada de la lista no bastó.
- **Fix:** `nuxt.config.ts` → `nitro.prerender.crawlLinks: false` (evita la siembra automática en `/`) y `routes: ['/marvel-champions']` (sin `/`, hasta que 01-02 aporte su página de fichero).
- **Files modified:** `nuxt.config.ts`
- **Verification:** `npm run generate` termina en código 0 y produce `.output/public/marvel-champions/index.html`; `.output/public/index.html` no se genera todavía (esperado, no es un requisito de esta rebanada)
- **Committed in:** `7da0fd4` (Tarea 2)

**2. [Rule 1 - Bug] Cuatro comentarios de código coincidían con los patrones literales de los propios gates de verificación**
- **Found during:** Tarea 1 y Tarea 2, al ejecutar los `grep` de `<verify>`
- **Issue:** Comentarios explicativos citaban literalmente las palabras `zod`, `useFetch`, `v-html`, `~~/engine` y `disabled` para explicar POR QUÉ el código no las usa — los propios gates automatizados (`grep -rn "zod" app/`, etc.) no distinguen comentario de código y marcaban falso positivo.
- **Fix:** Reescritos los comentarios sin las cadenas literales prohibidas (p. ej. "el validador de esquema" en vez de nombrar `zod`; "esa directiva de HTML crudo" en vez de `v-html`), sin cambiar ningún comportamiento.
- **Files modified:** `app/composables/useGameContent.ts`, `app/components/AppHeader.vue`, `app/components/StepScreen.vue`, `app/components/NavBand.vue`
- **Verification:** los cinco gates de grep del `<verify>` de ambas tareas pasan limpios
- **Committed in:** `ee7e547` (Tarea 1) y `7da0fd4` (Tarea 2)

---

**Total deviations:** 2 auto-fixed (1 bloqueante de build, 1 de higiene de comentarios sin impacto funcional). Ninguna es un cambio arquitectónico (Rule 4 no aplicó).
**Impact on plan:** Ninguno de los dos cambia el alcance ni las decisiones estructurales de `01-UI-SPEC.md`/`ARCHITECTURE.md`; son correcciones necesarias para que `npm run generate` termine en verde y para que los gates automatizados verifiquen código real y no prosa.

## Issues Encountered

- **Verificación visual interactiva (human-check) no ejecutable con automatización de navegador en este entorno:** `PITFALLS.md`/`STACK.md` deliberadamente diferieron Playwright a una fase posterior a la primera rebanada de la Fase 1, y no hay ninguna herramienta MCP de navegador disponible aquí. En su lugar: (a) `npm run dev` se levantó y `curl` confirmó que el servidor responde sin errores (el HTML inicial muestra el fallback "Cargando…" del guard de cliente, como se espera antes de la hidratación); (b) un test desechable (no comiteado, borrado tras ejecutar) reprodujo exactamente la secuencia `expand` → `next`/`next`/`next` (clamp) → `prev`/`prev` sobre el `content/marvel-champions.json` real, confirmando que el texto de los 3 pasos de HÉROES aparece en el orden correcto y que los extremos hacen clamp sin lanzar. La comprobación ocular real en Chrome con emulación de tablet (rotación, ausencia de warnings de hidratación, tamaños táctiles) queda pendiente de que el usuario la ejecute — instrucciones: `npm run dev`, abrir `http://localhost:3000/marvel-champions` con las DevTools de Chrome en modo dispositivo (tablet, horizontal).

## Next Phase Readiness

- **El Esqueleto Andante (01-01 + 01-07 + 01-08) queda cerrado.** A partir de aquí las rebanadas 01-02..01-06 solo añaden pantallas y contenido, sin renegociar la costura motor↔Vue ni la forma de las tres bandas.
- El plan `01-02` (selector + mini-setup) puede: añadir `app/pages/index.vue` (y devolver `/` a `nitro.prerender.routes`, o reactivar `crawlLinks`), sustituir el STUB `{ playerCount: 2, difficulty: 'normal' }` de `app/pages/[game]/index.vue` por el resultado real del mini-setup, y reutilizar `AppHeader`/`NavBand` tal cual sin tocar sus props.
- El plan `01-05` (índice de salto) puede implementar `onIndexOpen` en `app/pages/[game]/index.vue` (hoy vacío con comentario explícito) usando `jumpTo` de `useGameSession`, ya expuesto.
- El plan `01-04` (persistencia) puede introducir `localStorage` dentro de la estructura de guard de cliente ya montada en la página, sin reorganizarla.
- **Ajuste de layout respecto al contrato de UI:** ninguno estructural. Se usaron las utilidades numéricas por defecto de Tailwind (`h-16`=64px, `h-24`=96px, `w-12`/`h-12`=48px) junto a los tokens nombrados de `01-UI-SPEC.md` (`px-lg`, `bg-accent`, etc.) porque ambos sistemas coexisten en Tailwind v4 sin conflicto (los tokens nombrados se añaden a la escala, no la sustituyen) — no hizo falta declarar clases arbitrarias para los tamaños de banda.

## Self-Check

```
FOUND: app/composables/useGameContent.ts
FOUND: app/composables/useGameSession.ts
FOUND: app/components/AppHeader.vue
FOUND: app/components/StepScreen.vue
FOUND: app/components/NavBand.vue
FOUND: app/pages/[game]/index.vue
FOUND commit: ee7e547
FOUND commit: 7da0fd4
```

## Self-Check: PASSED

---
*Phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa*
*Plan: 08*
*Completed: 2026-08-28*
