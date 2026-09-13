---
phase: 09-hist-rico-y-estad-sticas
plan: 22
subsystem: ui
tags: [vue, tailwind, layout, accessibility, fixed-positioning]

requires:
  - phase: 09-hist-rico-y-estad-sticas (plan 09-20/09-21)
    provides: HistorySavedNotice.vue con heading/body derivados de useHistorySavedNotice() (sin copy propia)
provides:
  - HistorySavedNotice.vue y UpdateBanner.vue fuera del flujo de documento (fixed top-0 inset-x-0), sin sumar altura a las pantallas h-dvh
  - pointer-events-none en el contenedor de cada banda + pointer-events-auto en cada control pulsable, para cumplir 09-UI-SPEC.md §8 (never blocks input) de forma literal
affects: [09-hist-rico-y-estad-sticas, deferred-items.md]

tech-stack:
  added: []
  patterns:
    - "banda de aviso fuera de flujo: fixed top-0 inset-x-0 z-40 pointer-events-none en el contenedor, pointer-events-auto en cada control — patrón a replicar si aparece una tercera banda hermana"

key-files:
  created: []
  modified:
    - app/components/HistorySavedNotice.vue
    - app/components/UpdateBanner.vue

key-decisions:
  - "z-40 elegido porque deja la banda por debajo de los 6 diálogos z-50 (GameOutcomeDialog, WarningDetailModal, ConfirmDialog, VillainPickerModal, PlayerModal, IndexOverlay); frente a ResumePrompt.vue y ContentChangedNotice.vue (mismo z-40) la banda queda debajo únicamente por el orden de montaje en app.vue (se monta antes de <NuxtPage/>), no por el número — documentado explícitamente en el comentario de ambos componentes para que nadie reordene el montaje sin darse cuenta de que rompe esto"
  - "app/app.vue no se toca: la solución fixed no necesita cambiar el punto de montaje ni envolver <NuxtPage/> en flex/h-full, evitando la refactorización de las 10 apariciones de h-dvh de toda la app"

requirements-completed: [HIST-06]

duration: ~25min
completed: 2026-09-13
---

# Phase 09 Plan 22: Bandas de aviso fuera de flujo (WR-05(b)) Summary

**`HistorySavedNotice.vue` y `UpdateBanner.vue` pasan a `fixed top-0 inset-x-0 z-40 pointer-events-none` con `pointer-events-auto` en sus controles, así que dejan de sumar altura a las pantallas `h-dvh` y dejan de robar toques a la pantalla de debajo.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-13T09:00Z (aprox., worktree ya arrancado en el commit base)
- **Completed:** 2026-09-13T09:10:40Z
- **Tasks:** 1 (único task del plan)
- **Files modified:** 2

## Accomplishments
- Las dos bandas hermanas que el hallazgo WR-05(b) nombra (`HistorySavedNotice.vue`, `UpdateBanner.vue`) reciben el mismo tratamiento: fuera del flujo de documento, sin robar toques a la pantalla de destino.
- Ninguna pantalla `h-dvh` de la app se ha tocado; `app/app.vue` tampoco — la solución elegida (`fixed`) no lo necesitaba.
- El comentario de ambos ficheros documenta explícitamente por qué el nivel de apilamiento (z-40) no basta por sí solo frente a `ResumePrompt.vue`/`ContentChangedNotice.vue` (mismo z-40): el orden de montaje en `app.vue` es lo que decide.

## Task Commits

1. **Task 1: las dos bandas dejan de empujar la pantalla fuera de la tablet** - `43c51d4` (fix)

**Plan metadata:** (pendiente — commit de SUMMARY.md, ver más abajo en el flujo del executor)

## Files Created/Modified
- `app/components/HistorySavedNotice.vue` - contenedor de banda con `fixed top-0 inset-x-0 z-40 pointer-events-none`; botón `✕` con `pointer-events-auto`; comentario nuevo citando WR-05(b) y el matiz del orden de montaje
- `app/components/UpdateBanner.vue` - mismo tratamiento; CTA de recarga y botón `✕` con `pointer-events-auto`; mismo comentario adaptado

## Decisions Made
- **z-40, no z-50:** deja la banda por debajo de los 6 diálogos de decisión (`z-50`), que es lo correcto — un diálogo que exige una decisión no puede quedar tapado por un aviso informativo.
- **El matiz obligatorio del plan:** frente a `ResumePrompt.vue` y `ContentChangedNotice.vue` (ambos también `z-40`), la banda NO queda por debajo por jerarquía numérica sino porque `app/app.vue` la monta ANTES de `<NuxtPage/>` (a igual z-index, pinta encima el que va después en el DOM). Documentado en los dos ficheros, nombrando explícitamente ambos componentes y el orden de montaje, tal como exigía la acceptance del plan.
- **`app/app.vue` intacto** y **ningún `h-dvh` convertido a `h-full`** — decisión ya tomada por el propio plan (vía `fixed` en vez de envolver `<NuxtPage/>`), respetada al pie de la letra.
- Durante la redacción de los comentarios se detectó que escribir literalmente `pointer-events-none`, `pointer-events-auto` y `z-50` en la prosa del comentario rompía los criterios de aceptación de recuento exacto (`grep -c` esperaba 1/1/2 ocurrencias, contando solo las clases reales). Se reescribieron los comentarios parafraseando esos conceptos («eventos de puntero desactivados a nivel de contenedor», «capa 50») en vez de repetir las clases Tailwind literales — mismo contenido explicativo, sin duplicar el string exacto que el verificador cuenta.

## Deviations from Plan

None - plan ejecutado tal como estaba escrito. El único ajuste fue de redacción de comentarios (ver "Decisions Made" arriba), no de comportamiento ni de alcance: no cambia ninguna clase Tailwind, ningún fichero tocado, ni ningún criterio de aceptación — todos los `grep -c` del plan pasan con el valor exacto exigido.

## Issues Encountered
Ninguno bloqueante. `npm run build` y `npx vitest run` (796 tests, 28 ficheros) terminan en verde sin cambios adicionales.

## User Setup Required
None - no requiere configuración de servicios externos.

## Manual Verification (comprobación humana OBLIGATORIA por el plan)

**Estado: `human_verification` — PENDIENTE, no realizada por este ejecutor.**

El plan exige una comprobación visual en viewport de tablet horizontal con `npm run dev`, con el aviso de fallo largo (variante `failure-recoverable` o `failure-unrecoverable`, no la corta de éxito) visible sobre `/`, verificando:
1. que los botones «Histórico»/«Estadísticas» del selector siguen dentro del viewport y responden al toque;
2. que la banda no tapa el `<h1>` ni el párrafo del selector.

Este ejecutor corre en un agente headless dentro de un worktree paralelo y no puede realizar una inspección visual real ni un juicio humano sobre la disposición en pantalla. Aunque `npx playwright` está instalado en el entorno y `npm run dev`/`npm run build` arrancan sin problema, disparar la variante de fallo real requiere completar un flujo de partida entero hasta el diálogo de resultado con el almacenamiento fallando a propósito — automatizarlo con capturas de pantalla no sustituye el juicio humano que el propio plan pide, y las instrucciones de este agente son explícitas: no fabricar una verificación visual, registrarla como pendiente.

**Verificación estructural sí realizada (no sustituye el punto anterior, pero da confianza objetiva):**
- `grep -n "h-dvh" app/components/GameSelectorScreen.vue` confirma que el contenedor raíz de esa pantalla sigue siendo `h-dvh ... items-center justify-center` en la misma línea — el contenido está centrado verticalmente, así que una banda `fixed top-0` se superpone a espacio vacío antes del `<h1>`, no directamente sobre él. Esto es la comprobación de "descarte de solape por centrado" del plan, hecha por grep, no por ojo humano.
- `npm run build` genera el prerender completo sin error.
- `npx vitest run` pasa 796/796 tests, incluidos los de `useHistorySavedNotice.ts` y `useUpdatePrompt.ts`, que no se han tocado.

**Queda pendiente para el usuario:** abrir `npm run dev`, emular un viewport de tablet horizontal, forzar la variante de fallo (p. ej. deshabilitando `localStorage` desde las herramientas de desarrollador antes de terminar una partida) y confirmar los dos puntos de arriba a simple vista, antes de dar WR-05(b) por cerrado del todo en `deferred-items.md` (cierre formal que corresponde al plan 09-23).

## Next Phase Readiness
- Las dos bandas quedan listas para que el plan 09-23 cierre formalmente la entrada WR-05(b) en `deferred-items.md`, condicionado a que la comprobación humana pendiente (arriba) se realice primero.
- No hay bloqueantes de código: build y tests en verde, `git diff --stat` reduce a exactamente los dos ficheros de banda como exigía el plan.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*
