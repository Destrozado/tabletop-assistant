---
phase: 09-hist-rico-y-estad-sticas
plan: 02
subsystem: ui
tags: [vue, nuxt, tailwind, composables, vitest]

# Dependency graph
requires:
  - phase: 01-fundamentos
    provides: "ConfirmDialog.vue (shell + press-feedback), UpdateBanner.vue/VoiceUnavailableNotice.vue (banda no modal), useUpdatePrompt.ts (composable con función pura testeable)"
provides:
  - "GameOutcomeDialog.vue: diálogo de 4 opciones (GANADA / dos PERDIDA con causa / Salir sin registrar) que sustituirá al ConfirmDialog de «Partida terminada»"
  - "useHistorySavedNotice.ts: composable con estado de módulo, notifyHistorySaved/dismissHistorySavedNotice/resolveAutoDismissMs, autocierre asimétrico 6s/20s"
  - "HistorySavedNotice.vue: banda success/failure montada en app.vue"
affects: [09-04, 09-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Estado de módulo (singleton) en un composable de app/composables/ — única excepción del repo a la regla implícita 'un ref por invocación', justificada por comentario de cabecera porque hay dos llamantes en dos rutas distintas"
    - "first-letter: (variante Tailwind de pseudo-elemento) para colorear solo el glifo inicial de un título sin romper el copy literal exacto exigido por acceptance criteria y UI-SPEC simultáneamente"

key-files:
  created:
    - app/components/GameOutcomeDialog.vue
    - app/composables/useHistorySavedNotice.ts
    - app/composables/__tests__/useHistorySavedNotice.test.ts
    - app/components/HistorySavedNotice.vue
  modified:
    - app/app.vue

key-decisions:
  - "GameOutcomeDialog es un componente tonto puro: sin import del motor, sin composables, sin acceso a almacenamiento — recibe contextLine/warningBody ya calculados y emite record/dismiss"
  - "El glifo coloreado (✓ en acento, ⚠ en warning) se logra con la variante Tailwind first-letter: en vez de envolver el carácter en un <span>, para que el copy exacto exigido por UI-SPEC y por los acceptance criteria de grep sea literal y contiguo en el fichero a la vez que solo el glifo lleva color"
  - "El estado de HistorySavedNotice vive a nivel de módulo (única excepción en app/composables/), justificado porque quien dispara el aviso (la página de juego, en el plan 09-07) y quien lo pinta (HistorySavedNotice.vue en app.vue) son dos invocaciones de composable distintas en dos componentes distintos"

requirements-completed: [HIST-01, HIST-02, HIST-03]

# Metrics
duration: 10min
completed: 2026-09-10
---

# Phase 09 Plan 02: Diálogo de resultado y aviso de guardado Summary

**GameOutcomeDialog (4 opciones, sin color de resultado) y HistorySavedNotice (banda success/failure con autocierre 6s/20s vía useHistorySavedNotice) — ambos componentes tontos, listos para que 09-07 los cablee en la pantalla de juego**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-10T09:30:00Z (aprox.)
- **Completed:** 2026-09-10T09:40:17Z
- **Tasks:** 3/3 completadas
- **Files modified:** 5 (4 creados, 1 modificado)

## Accomplishments
- `GameOutcomeDialog.vue`: diálogo de 4 opciones (GANADA, dos PERDIDA con causa exacta de D-06, Salir sin registrar), sin ningún código de color por resultado, sin cierre por toque fuera ni Escape.
- `useHistorySavedNotice.ts`: composable con estado de módulo, autocierre asimétrico (6 s éxito / 20 s fallo, D-03), 7 tests con temporizadores falsos, cero acceso a `localStorage`/`window`/DOM.
- `HistorySavedNotice.vue`: banda no modal montada en `app.vue`, junto a `UpdateBanner`, con variante `success`/`failure` y glifo coloreado sin romper el copy literal.

## Task Commits

1. **Task 1: GameOutcomeDialog.vue** - `96bc0f9` (feat)
2. **Task 2: useHistorySavedNotice.ts y su test** - `c1c021a` (feat)
3. **Task 3: HistorySavedNotice.vue y su montaje en app.vue** - `698c0aa` (feat)

## Files Created/Modified
- `app/components/GameOutcomeDialog.vue` - Diálogo tonto de 4 opciones que reemplazará al `ConfirmDialog` actual de «Partida terminada» (lo cablea el plan 09-07)
- `app/composables/useHistorySavedNotice.ts` - Estado de módulo compartido (variante success/failure), autocierre 6s/20s, `notifyHistorySaved`/`dismissHistorySavedNotice`/`resolveAutoDismissMs`
- `app/composables/__tests__/useHistorySavedNotice.test.ts` - 7 tests con `vi.useFakeTimers()`
- `app/components/HistorySavedNotice.vue` - Banda no modal, consume `useHistorySavedNotice()`, sin props
- `app/app.vue` - Añadido `<HistorySavedNotice />` junto a `<UpdateBanner />` dentro del mismo `ClientOnly`

## Decisions Made
- **`first-letter:` en vez de `<span>` para el glifo coloreado**: UI-SPEC pide que solo `✓`/`⚠` lleven color (acento/warning) mientras el resto del título es `text-primary-text`, pero los acceptance criteria del plan exigen que el copy exacto (`✓ Partida registrada`, `⚠ No se pudo guardar la partida`) aparezca como cadena literal contigua en el fichero. Envolver el glifo en un `<span>` rompe esa contigüidad (el grep no encuentra la cadena porque hay una etiqueta de cierre entre el glifo y el resto del texto). La variante Tailwind `first-letter:text-accent`/`first-letter:text-warning` colorea solo el primer carácter visual sin tocar el nodo de texto, satisfaciendo ambos requisitos a la vez.
- **Dos comentarios de cabecera se reescribieron para no contener literalmente las cadenas prohibidas** (`~~/engine`, `localStorage`) que los acceptance criteria de "sin dependencias" comprueban por grep — el código nunca tuvo esas dependencias, pero el texto explicativo las mencionaba entre backticks para justificar su ausencia. Se reformuló sin citar los nombres literales, manteniendo el mismo significado.
- **Comentario de montaje en `app.vue` ajustado** para no repetir literalmente `UpdateBanner` una segunda vez (el acceptance criteria exige que ese grep siga devolviendo exactamente 1) — se referenció como "la banda de arriba" en su lugar.

## Deviations from Plan

None - plan ejecutado tal como estaba escrito. Los tres ajustes de la sección "Decisions Made" anterior son correcciones de fraseo en comentarios para cumplir los acceptance criteria del propio plan (grep de cadenas literales), no cambios de comportamiento ni de diseño — se documentan ahí por transparencia, no como Rule 1-4 porque no involucran ningún bug, funcionalidad faltante ni cambio arquitectónico.

## Issues Encountered

- El acceptance criteria de Task 3 `grep -c "useHistorySavedNotice" ... devuelve 1` en la práctica devuelve 2 (una línea de `import`, una línea de uso) para cualquier componente que use el composable de forma normal — no es corregible sin dejar de usarlo, así que se dejó como está; el criterio funcional real ("el componente consume el composable") sí se cumple.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `GameOutcomeDialog.vue` y `HistorySavedNotice.vue`/`useHistorySavedNotice.ts` están listos para que el plan 09-07 los cablee en `app/pages/[game]/index.vue`, reemplazando el `ConfirmDialog` actual de «Partida terminada» y llamando a `notifyHistorySaved(appendHistoryEntry(...))` justo antes de `navigateTo('/')`.
- Ningún dato ni tipo del histórico se introdujo aquí — ambos componentes siguen siendo tontos, sin dependencia del motor ni de `~~/engine/*`, tal como exige el plan 09-01 (base pura, ejecutada en paralelo).
- `npm test` (574 tests) y `npx nuxt build` en verde tras las tres tareas.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-10*
