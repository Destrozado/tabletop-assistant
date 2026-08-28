---
phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
plan: 02
subsystem: ui
tags: [vue, nuxt, tailwindcss-v4, ssg]

requires:
  - phase: 01-07
    provides: "content/games-index.ts (title/status) y engine/ puro"
  - phase: 01-08
    provides: "useGameContent, useGameSession, AppHeader/StepScreen/NavBand, runner [game]/index.vue con el STUB de contexto que este plan sustituye"
provides:
  - "app/pages/index.vue + GameSelectorScreen: ruta / real, selector de juego derivado de content/games-index.ts, sin ningún nombre de juego codificado"
  - "MiniSetupScreen + app/pages/[game]/index.vue: mini-setup real de una pantalla (jugadores + dificultad) que sustituye el STUB y arranca la sesión real vía useGameSession().start()"
affects: ["01-03", "01-04", "01-05", "01-06"]

tech-stack:
  added: []
  patterns: ["dos estados mutuamente excluyentes dentro del mismo guard de ClientOnly ya montado en 01-08 (MiniSetupScreen sin sesión / vista de paso con sesión), sin reorganizar la página", "estado pressed replicado a mano (mousedown/touchstart + mouseup/touchend) en componentes tontos nuevos, igual que NavBand"]

key-files:
  created:
    - app/pages/index.vue
    - app/components/GameSelectorScreen.vue
    - app/components/MiniSetupScreen.vue
  modified:
    - app/pages/[game]/index.vue
    - nuxt.config.ts

key-decisions:
  - "ADAPT-02 se implementó según D-10 (no según la redacción vigente de REQUIREMENTS.md, que quedó obsoleta): el nº de jugadores vive solo en sessionContextLabel de la cabecera (`3 jug · Normal`), nunca interpolado en el texto de un paso ni en content/. REQUIREMENTS.md debe reescribirse en la transición de fase con la redacción de D-10 citada en 01-CONTEXT.md."
  - "nuxt.config.ts recupera '/' en nitro.prerender.routes junto a '/marvel-champions'; crawlLinks se mantiene en false porque la navegación entre pantallas usa navigateTo() en un manejador de click, no <NuxtLink> con href real, así que el crawler no la descubriría por sí solo — cada ruta prerenderizable sigue enumerándose explícitamente."
  - "GameSelectorScreen y MiniSetupScreen replican a mano el patrón de estado pressed de NavBand (mousedown/touchstart -> brightness-95 scale-98, liberado en mouseup/touchend) en vez de depender de :active de Tailwind, para mantener el mismo comportamiento táctil ya validado en 01-08."

requirements-completed: [SEL-01, SEL-02, SEL-03, SEL-04, SETUP-01, SETUP-02, SETUP-03, ADAPT-02]

duration: 25min
completed: 2026-08-28
---

# Fase 1 Plan 02: Selector de juego y mini-setup real Summary

**Sustituye el contexto de sesión STUB del esqueleto por la entrada real de la app: ruta `/` con el selector de juego derivado de datos y mini-setup de una sola pantalla (jugadores + dificultad) que arranca la sesión real y aterriza directamente en el paso 1, con `3 jug · Normal` visible de forma permanente en la cabecera (D-10).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-28 (sesión)
- **Completed:** 2026-08-28
- **Tasks:** 2/2 completadas
- **Files modified:** 3 nuevos, 2 modificados

## Accomplishments

- `app/pages/index.vue` es ahora la ruta `/` real: compone `GameSelectorScreen` con `useGameContent().games` y navega con `navigateTo('/' + id)` al elegir un juego disponible. `npm run generate` produce `.output/public/index.html` con el título, el subtítulo literal de SEL-04 y ambas tarjetas de juego.
- `GameSelectorScreen.vue` no menciona ningún juego en código ni en comentarios (`grep -i "marvel|warhammer"` no devuelve nada) — toda la lista sale de la prop `games`, con el rótulo leído de `title` (nunca `name`, confirmado por grep). La tarjeta `coming-soon` no es un `<button>`, se renderiza al 40% de opacidad y lleva la etiqueta `PRÓXIMAMENTE`.
- `MiniSetupScreen.vue` implementa el único estado deshabilitado legítimo de la fase: el CTA `EMPEZAR PREPARACIÓN` no emite `confirm` mientras `playerCount` o `difficulty` sean `null`, con `:disabled` nativo + 40% de opacidad + `cursor-default`.
- `app/pages/[game]/index.vue` eliminó por completo el `// STUB` de 01-08: dentro del mismo guard de `ClientOnly`, ahora hay dos estados mutuamente excluyentes — `MiniSetupScreen` sin sesión iniciada, vista de paso (`AppHeader`+`StepScreen`+`NavBand`) tras `start(gameId, {playerCount, difficulty})`. No se introdujo ninguna pantalla intermedia (SETUP-03) ni ninguna lectura de `localStorage` (reservado para 01-04).
- ADAPT-02 se implementó según la redacción vigente de D-10, no según el texto obsoleto de `REQUIREMENTS.md`: el nº de jugadores solo aparece en `sessionContextLabel` de la cabecera; `grep -rn "playerCount" content/` no devuelve nada.
- `nuxt.config.ts` recupera `/` en `nitro.prerender.routes`; `npm run generate` prerenderiza 4 rutas de página (`/`, `/marvel-champions`, `/200.html`, `/404.html`) con código de salida 0.
- `npm run test` sigue en 29/29 tras ambas tareas — ningún cambio tocó `engine/`.

## Task Commits

1. **Tarea 1: Selector de juego en la ruta /** - `f88afe5` (feat)
2. **Tarea 2: Mini-setup de una pantalla y entrada real al paso 1** - `ba278fd` (feat)

_Plan de un solo tramo (`type: execute`), sin TDD — no aplica el flujo RED/GREEN/REFACTOR._

## Files Created/Modified

- `app/pages/index.vue` - ruta `/`, compone `GameSelectorScreen`, navega al confirmar selección
- `app/components/GameSelectorScreen.vue` - tarjetas derivadas de `games: {id, title, status}[]`, tarjeta coming-soon no pulsable, estado pressed replicado de `NavBand`
- `app/components/MiniSetupScreen.vue` - segmentado 1-4 jugadores + Normal/Experto, CTA con estado deshabilitado hasta elegir ambos, afordancia de vuelta al selector en cabecera propia (no `NavBand`)
- `app/pages/[game]/index.vue` - STUB eliminado; dos estados mutuamente excluyentes bajo el mismo `ClientOnly` (mini-setup / vista de paso)
- `nuxt.config.ts` - `/` restaurada a `nitro.prerender.routes`

## Decisions Made

Ver `key-decisions` en el frontmatter. Resumen: ADAPT-02 sigue D-10 (cabecera, no texto de paso) y no la redacción obsoleta de `REQUIREMENTS.md` — **queda pendiente reescribir esa entrada en `REQUIREMENTS.md` en la transición de fase**, tal como pedía el `<output>` del plan. `crawlLinks:false` se mantiene junto a las rutas explícitas porque la navegación no usa `<NuxtLink>`.

## Deviations from Plan

None - plan ejecutado tal como estaba escrito. Los dos ajustes de `nuxt.config.ts` y el patrón de estado pressed ya estaban explícitamente indicados en las instrucciones de las tareas, no son desviaciones.

## Issues Encountered

- **Verificación visual interactiva (human-check) no ejecutable con automatización de navegador en este entorno**, misma limitación documentada en 01-08: no hay herramienta MCP de navegador disponible. En su lugar: (a) `npm run generate` prerenderiza `/` y `/marvel-champions` con código de salida 0 y el contenido esperado en el HTML estático de `/` (el selector no depende de hidratación); (b) `npm run dev` + `curl` confirmaron que `/marvel-champions` responde sin errores de servidor — el HTML inicial muestra el fallback "Cargando…" del guard de cliente, como se espera antes de la hidratación (el mini-setup y el paso 1 solo existen tras hidratar en el navegador, igual que documentó 01-08). La comprobación ocular real (tap en Marvel Champions → elegir 3/Experto → CTA se activa solo con ambos → cabecera con `3 jug · Experto`, sin warnings de hidratación) queda **pendiente de verificación humana** — instrucciones: `npm run dev`, abrir `http://localhost:3000/` con las DevTools de Chrome en modo dispositivo (tablet, horizontal), recorrer `/` → Marvel Champions → mini-setup → paso 1.

## Next Phase Readiness

- El selector y el mini-setup quedan cerrados; los planes 01-03 (contenido restante + mesa lista), 01-04 (persistencia), 01-05 (índice de salto) y 01-06 pueden apoyarse en la misma costura `useGameSession` y en el guard de `ClientOnly` ya montado en `app/pages/[game]/index.vue` sin reorganizar la página.
- El plan `01-04` puede introducir la lectura/escritura de `localStorage` (resume-vs-new, SETUP-04/05) dentro del mismo guard: hoy hay dos estados (`!session` / `session`), el prompt de reanudación se insertaría como un tercer estado previo a ambos.
- **Recordatorio para la transición de fase:** `REQUIREMENTS.md` debe reescribir ADAPT-02 con la redacción de D-10 ("el número de jugadores se expone en la cabecera permanente de la sesión, no sustituido dentro del texto de los pasos"), tal como señalaba `01-CONTEXT.md` D-10 y el `<output>` de este plan.

## Self-Check

```
FOUND: app/pages/index.vue
FOUND: app/components/GameSelectorScreen.vue
FOUND: app/components/MiniSetupScreen.vue
FOUND: app/pages/[game]/index.vue (STUB eliminado, start( presente)
FOUND commit: f88afe5
FOUND commit: ba278fd
```

## Self-Check: PASSED

---
*Phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa*
*Plan: 02*
*Completed: 2026-08-28*
