---
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
plan: 04
subsystem: ui
tags: [vueuse, useWakeLock, tailwind, vue]

requires:
  - phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
    provides: "app/pages/[game]/index.vue con los manejadores onConfirm/onResumeContinue/onContentChangedAcknowledge/onDiscardConfirm ya cableados por los planes 03-02 y 03-03 (announce() dentro de los mismos toques)"
provides:
  - "useWakeLock() instanciado una vez en el runner, con los cinco puntos de D-51 cableados: tres peticiones (onConfirm, onResumeContinue, onContentChangedAcknowledge), una liberación explícita (onDiscardConfirm) y un no-op documentado (@back de MiniSetupScreen, vía tryOnScopeDispose)"
  - "Línea fija de coste de batería bajo el CTA del mini-setup, sin estado ni persistencia"
affects: ["03-05 (prueba humana en tablet)"]

tech-stack:
  added: []
  patterns:
    - "useWakeLock() atado al ciclo de vida de la página del runner (no de un componente hijo), con .catch(() => {}) en cada request/release para degradación silenciosa (UI-08)"
    - "Footer de dos filas apiladas (CTA + copia estática) sin introducir ningún token nuevo (Body/secondary-text ya existentes)"

key-files:
  created: []
  modified:
    - app/pages/[game]/index.vue
    - app/components/MiniSetupScreen.vue

key-decisions:
  - "Se omitió extraer isSupported de useWakeLock(): request()/release() ya degradan en silencio sin lanzar en navegadores sin soporte (verificado leyendo node_modules/@vueuse/core/dist/index.js), así que comprobarlo antes de llamar no aporta nada que .catch(() => {}) no cubra ya, y evita una variable sin uso"
  - "El footer del mini-setup pasa de altura fija (h-24) a mínima (min-h-24) porque el CTA de 56px más la línea de cuerpo con su interlineado no caben en 96px fijos — decisión ya fijada por el propio plan (03-UI-SPEC §Layout 3), no una desviación"

requirements-completed: [UI-06, UI-07, UI-08]

duration: ~20min
completed: 2026-08-30
---

# Phase 3 Plan 04: Bloqueo de pantalla siempre encendida y aviso de batería Summary

**`useWakeLock()` de VueUse cableado en los tres toques que abren o reanudan partida y liberado explícitamente al descartarla, más una línea estática bajo el CTA del mini-setup que avisa del coste de batería antes de empezar.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2 completadas
- **Files modified:** 2

## Accomplishments

- Al tocar «EMPEZAR PREPARACIÓN», «Continuar» de la reanudación, o el CTA de reconocimiento del aviso de contenido cambiado, la tablet pide el bloqueo de pantalla dentro del propio toque — los tres gestos que D-43/D-51 clasifican como apertura de partida en curso.
- Al descartar el progreso con «Empezar partida nueva», el bloqueo se libera explícitamente: esa transición no desmonta la página, así que el `tryOnScopeDispose` interno de `useWakeLock` no se dispara solo ahí.
- Al volver al selector (`navigateTo('/')`), la página se desmonta y `useWakeLock` libera el bloqueo por su cuenta — no se añadió ninguna llamada redundante, solo un comentario explicando la ausencia deliberada.
- Ningún fallo o falta de soporte del dispositivo produce aviso alguno (UI-08): cada `request()`/`release()` va envuelto en `.catch(() => {})`.
- No se añadió ningún listener de visibilidad propio ni ningún control manual de bloqueo — `useWakeLock` ya trae el suyo interno para re-pedir al volver a primer plano.
- Quien configura la partida lee, justo bajo el botón de empezar, la copia literal del UI-SPEC: «La pantalla se mantendrá encendida durante la partida y esto consume más batería.» — una sola vez, sin icono, sin control de descarte y sin persistir nada.

## Task Commits

Cada tarea se comprometió atómicamente:

1. **Task 1: Bloqueo de pantalla pedido y liberado exactamente mientras hay partida en curso** — `b3b6ad6` (feat)
2. **Task 2: Línea fija de coste de batería en el mini-setup** — `57009ec` (feat)

## Files Created/Modified

- `app/pages/[game]/index.vue` — `useWakeLock()` instanciado una vez; `requestWakeLock('screen')` en `onConfirm`/`onResumeContinue`/`onContentChangedAcknowledge`; `releaseWakeLock()` en `onDiscardConfirm`; comentario junto a `@back` de `MiniSetupScreen` explicando la ausencia deliberada de liberación ahí
- `app/components/MiniSetupScreen.vue` — footer reestructurado a dos filas (`min-h-24 flex flex-col`): el CTA sin cambios envuelto en su propia fila, y una nueva línea `<p>` con la copia de coste de batería

## Decisions Made

- No se desestructuró `isSupported` de `useWakeLock()`: el código fuente de VueUse (`node_modules/@vueuse/core/dist/index.js`) confirma que `request()`/`release()` ya degradan en silencio sin lanzar cuando `navigator.wakeLock` no existe, así que el `.catch(() => {})` ya cubre toda la superficie de fallo relevante para UI-08, y añadir una variable sin uso habría sido ruido.
- El cambio de `h-24` a `min-h-24` en el footer del mini-setup es el que el propio plan/UI-SPEC exige explícitamente (el CTA de 56px + una línea de cuerpo con interlineado no caben en 96px fijos), no una desviación de este plan.

## Deviations from Plan

### Notas de verificación (sin cambio de código)

**1. `git diff app/components/MiniSetupScreen.vue` muestra líneas "eliminadas" que contienen `canConfirm`, `ctaPressed`, `:disabled`, `@mousedown`, `@touchstart`, `@mouseup`, `@touchend` y `@click`**
- **Found during:** Verificación de criterios de aceptación de la Task 2
- **Issue:** El criterio del plan esperaba que el diff no mostrara ninguna línea eliminada con esas cadenas. Pero el propio plan exige envolver el `<button>` existente en un nuevo `<div class="flex items-center justify-end">`, lo que aumenta su indentación en dos espacios. Git diff es por línea completa: cada línea del botón (clases, `:disabled`, los cinco manejadores) aparece como "eliminada" (indentación vieja) y "añadida" (indentación nueva), aunque el contenido semántico no cambió ni un carácter.
- **Decisión:** No se modificó nada. Se verificó manualmente, línea por línea, que el `<button>` conserva exactamente las mismas clases condicionales, el mismo `:disabled="!canConfirm"`, los mismos cinco manejadores de toque/ratón y el mismo texto `EMPEZAR PREPARACIÓN ›` — solo cambió su indentación al anidarse un nivel más, tal como el propio plan pide explícitamente en su `<action>`.
- **Files modified:** ninguno

---

**Total deviations:** 0 auto-fijadas + 1 nota de verificación sin cambio de código (artefacto esperado del propio requisito del plan de anidar el botón).
**Impact on plan:** Ninguna afecta el alcance ni el comportamiento entregado.

## Issues Encountered

Ninguno bloqueante. El worktree partió en el commit base correcto (`af6c1889`, «update tracking after wave 2») tras el `git reset --hard` inicial del protocolo de arranque del agente — sin desajuste de commit base a diferencia de 03-02. `node_modules/` no existía en el worktree (está gitignorado); se ejecutó `npm ci --prefer-offline` para poder correr `npm test`/`npm run build`, sin instalar ningún paquete nuevo fuera de lo ya fijado en `package-lock.json`.

## User Setup Required

Ninguno — no hay configuración de servicios externos. La verificación conductual real (bloqueo de pantalla funcionando en un iPad/tablet real, comportamiento del issue parcialmente roto de iOS documentado en `STACK.md`) es responsabilidad explícita del plan 03-05 (prueba humana en tablet), no de este plan.

## Next Phase Readiness

- El runner ya tiene las dos capacidades independientes de la fase (voz y bloqueo de pantalla) completamente cableadas en los mismos cinco puntos de toque, sin duplicar ningún listener de visibilidad.
- Ningún bloqueador para 03-05 (prueba humana en tablet real, que deberá confirmar tanto la locución como el bloqueo de pantalla en dispositivos reales).

---
*Phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida*
*Completed: 2026-08-30*

## Self-Check: PASSED

- Ficheros modificados verificados presentes en disco: `app/pages/[game]/index.vue`, `app/components/MiniSetupScreen.vue`.
- Los 3 commits citados en este SUMMARY (`b3b6ad6`, `57009ec`, `d2d8d89`) verificados presentes en `git log --oneline --all`.
- `npm test` (180 tests) y `npm run build` (prerenderiza `/` y `/marvel-champions`) verificados en verde tras el último commit de código (`57009ec`).
