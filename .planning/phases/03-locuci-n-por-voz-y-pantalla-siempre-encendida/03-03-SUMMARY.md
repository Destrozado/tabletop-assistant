---
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
plan: 03
subsystem: ui
tags: [speechSynthesis, voiceschanged, vitest, vue, tdd]

requires:
  - phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
    provides: "useVoiceAnnouncer (plan 03-02): máquina de estados on/muted/unavailable, resolveVoiceState, shouldAnnounce, ref available"
provides:
  - "hasSpanishVoice y detectSpanishVoice: detección pura y acotada en el tiempo de voz española, exportadas a nivel de módulo"
  - "available alimentado de verdad dentro de useVoiceAnnouncer (ya no un ref(null) sin resolver)"
  - "showVoiceUnavailableNotice / dismissNotice: estado de sesión (no persistido) para la banda de aviso"
  - "VoiceUnavailableNotice.vue: banda no modal con la copia literal del UI-SPEC"
affects: ["03-04 (wake lock)", "03-05 (prueba humana en tablet)"]

tech-stack:
  added: []
  patterns:
    - "Carrera acotada con bandera settled: getVoices() inmediato si ya hay voces, si no listener voiceschanged {once:true} + setTimeout de respaldo, cb llamado como mucho una vez"
    - "Banda de aviso en flujo de documento (sin fixed/z-index/scrim/role=dialog), reutilizable por futuras fases (aviso de versión nueva, Fase 4)"

key-files:
  created:
    - app/components/VoiceUnavailableNotice.vue
  modified:
    - app/composables/useVoiceAnnouncer.ts
    - app/composables/__tests__/useVoiceAnnouncer.test.ts
    - app/pages/[game]/index.vue

key-decisions:
  - "hasSpanishVoice usa lang.toLowerCase().startsWith('es') deliberadamente grueso: en Android una entrada es-* genérica puede aparecer sin el paquete de voz descargado, y un detector más fino sería adivinar sobre una API que no expone esa información con fiabilidad"
  - "detectSpanishVoice trata synth undefined (isSupported === false) igual que 'sin voz española': misma banda, misma copia genérica, porque la app no puede distinguir la causa real"
  - "showVoiceUnavailableNotice/dismissNotice viven como ref/computed en memoria dentro de useVoiceAnnouncer, sin pasar por usePersistedSession — D-50 exige estado de sesión, no persistido"

requirements-completed: [VOZ-05, VOZ-06]

duration: ~25min
completed: 2026-08-30
---

# Phase 3 Plan 03: Detección de voz española y banda de aviso no modal Summary

**Detección acotada en el tiempo (2000ms, carrera contra `voiceschanged`) que alimenta de verdad el estado `unavailable` ya construido en el plan 03-02, más una banda `VoiceUnavailableNotice` en flujo de documento que explica una sola vez qué revisar en Ajustes, sin bloquear nunca el botón SIGUIENTE.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2 completadas
- **Files modified:** 4 (1 creado, 3 modificados)

## Accomplishments

- En un dispositivo sin voz española (o sin síntesis de voz en absoluto), el icono de la cabecera pasa a `unavailable` (atenuado y deshabilitado) en cuanto la detección se resuelve, sin parpadeo previo — mientras la detección está en curso, `available` sigue en `null` y el icono se pinta optimista `on`.
- La detección nunca bloquea la primera pintura: si `voiceschanged` no llega nunca (landmine documentada de Safari), un `setTimeout` de 2000ms resuelve igual la carrera, y una bandera `settled` garantiza que el resultado se aplique como mucho una vez.
- Nueva banda `VoiceUnavailableNotice.vue`, componente tonto sin props, con la copia literal fijada por el UI-SPEC (`Sin voz en este dispositivo` / instrucción de Ajustes → Idiomas → Texto a voz), cerrable con un `✕` idéntico al del índice y sin volver a aparecer en la sesión tras cerrarse.
- La banda vive en flujo de documento (sin `fixed`, sin `z-index`, sin scrim, sin `role="dialog"`): SIGUIENTE sigue siendo tocable y el flujo guiado sigue funcionando plenamente solo con texto, exactamente como exigen VOZ-05/VOZ-06.
- El descarte de la banda es estado de sesión puro (`ref` en memoria dentro del composable), nunca tocando `usePersistedSession` ni añadiendo ninguna clave nueva de `localStorage` (D-50).
- 11 tests puros nuevos (6 de `hasSpanishVoice`, 5 de `detectSpanishVoice`), con relojes falsos de Vitest para el caso del temporizador — 24 tests en total en el fichero, 180 en todo el proyecto.

## Task Commits

Ciclo TDD explícito RED→GREEN para la Task 1 (`tdd="true"`):

1. **Task 1: Detección acotada de voz española** — `2bda69f` (test, RED: 11 tests nuevos fallan con `detectSpanishVoice is not a function`, los 13 previos siguen en verde) → `0eb848f` (feat, GREEN: 24/24 tests en verde, `npm test` completo en verde con 180 tests)
2. **Task 2: Banda VoiceUnavailableNotice y su cableado no modal** — `93b5926` (feat: componente nuevo + cableado en `app/pages/[game]/index.vue`, `npm test && npm run build` en verde)

_RED confirmado ejecutando `npx vitest run --project app-logic` con la implementación temporalmente revertida a la versión de HEAD (sin `hasSpanishVoice`/`detectSpanishVoice`) antes de comprometer el commit de test; GREEN confirmado restaurando la implementación y re-ejecutando la suite completa._

## Files Created/Modified

- `app/composables/useVoiceAnnouncer.ts` — `hasSpanishVoice`, `detectSpanishVoice` exportadas a nivel de módulo; `onMounted` que llama a `detectSpanishVoice` y alimenta `available`; `noticeDismissed`/`dismissNotice`/`showVoiceUnavailableNotice`
- `app/composables/__tests__/useVoiceAnnouncer.test.ts` — 11 tests nuevos (los 13 de 03-02 intactos)
- `app/components/VoiceUnavailableNotice.vue` (nuevo) — banda no modal, sin props, un emit `dismiss`
- `app/pages/[game]/index.vue` — extrae `showVoiceUnavailableNotice`/`dismissNotice` del composable, monta `<VoiceUnavailableNotice>` entre `<AppHeader>` y `<StepScreen>`, solo en la rama de pantalla de paso

## Decisions Made

- `hasSpanishVoice` compara solo el prefijo `es` en minúsculas, sin exigir ninguna propiedad adicional (`localService`, nombre de voz concreto): 03-RESEARCH.md documenta que un detector más fino adivinaría sobre una API cuyo comportamiento en Android no es fiable, y la copia genérica de la banda ya cubre ese caso.
- `detectSpanishVoice(undefined, ...)` resuelve `false` de inmediato: el UI-SPEC decide expresamente tratar "sin síntesis en absoluto" igual que "sin voz española", porque ambos son indistinguibles con fiabilidad desde el punto de vista de la app y producen el mismo silencio total.
- El comentario de cabecera del composable y el comentario junto al `setTimeout` se reescribieron para no citar literalmente las cadenas `useLocalStorage` ni `voiceschanged` fuera de su única ocurrencia real de código — evita el mismo problema de conteo por grep que ya documentó el plan 03-02 (Deviation #2 de esa SUMMARY).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/` ausente rompía la resolución de `tsconfig.app.json` al ejecutar Vitest**
- **Found during:** Verificación inicial de `npx vitest run --project app-logic` antes de cualquier cambio de código
- **Issue:** Mismo problema documentado en 03-02-SUMMARY.md: el worktree no tenía `.nuxt/` generado tras el `git reset --hard` a la base de la fase.
- **Fix:** `npx nuxt prepare` (regenera un directorio de build gitignorado, no instala ningún paquete).
- **Files modified:** ninguno versionado
- **Verification:** `npx vitest run --project app-logic` volvió a ejecutarse con normalidad.

**2. [Rule 1 - Bug] Comentarios propios inflaban los grep de verificación de `voiceschanged` y `useLocalStorage`**
- **Found during:** Verificación de criterios de aceptación de la Task 1
- **Issue:** El comentario sobre el `setTimeout` citaba literalmente `` `voiceschanged` `` (2ª coincidencia además del `addEventListener` real), y el comentario de cabecera del fichero citaba `useLocalStorage` (coincidencia inesperada dado que el criterio exige 0 coincidencias de `useLocalStorage\|tga:`).
- **Fix:** Reescritos ambos comentarios para transmitir el mismo significado sin repetir las cadenas literales evaluadas por grep.
- **Files modified:** `app/composables/useVoiceAnnouncer.ts`
- **Verification:** `grep -n "voiceschanged" app/composables/useVoiceAnnouncer.ts` → 1 coincidencia; `grep -rn "useLocalStorage\|tga:" app/composables/useVoiceAnnouncer.ts` → vacío.
- **Committed in:** `0eb848f`

### Notas de verificación (sin cambio de código)

**3. `grep -n "VoiceUnavailableNotice" app/pages/[game]/index.vue` devuelve 2 coincidencias, no 1**
- **Found during:** Verificación de criterios de aceptación de la Task 2
- **Issue:** El criterio del plan esperaba exactamente 1 coincidencia. La cadena `showVoiceUnavailableNotice` (el nombre del computed extraído del composable, fijado literalmente por la interfaz del propio plan en la sección `<action>` de la Task 1) contiene `VoiceUnavailableNotice` como subcadena, además de la etiqueta `<VoiceUnavailableNotice>` real en el template. Ambas coincidencias son legítimas y no hay margen para renombrar sin contradecir el contrato de nombres que el propio plan fija para el composable y el componente.
- **Decisión:** No se modificó nada. Se verificó manualmente (lectura directa del fichero) que `<VoiceUnavailableNotice v-if="showVoiceUnavailableNotice" @dismiss="dismissNotice" />` está correctamente situado entre `<AppHeader>` y `<StepScreen>`, dentro de `<div v-else class="h-dvh flex flex-col">`, tal como exige el resto del criterio de aceptación.
- **Files modified:** ninguno

---

**Total deviations:** 2 auto-fijadas (1× Regla 3, 1× Regla 1) + 1 nota de verificación sin cambio de código.
**Impact on plan:** Ninguna afecta el alcance ni el comportamiento entregado.

## Issues Encountered

Ninguno bloqueante. El worktree partió correctamente alineado con la base esperada (`96f591f`) tras el `git reset --hard` inicial — a diferencia de 03-02, no hubo desajuste de commit base.

## User Setup Required

Ninguno — no hay configuración de servicios externos. La verificación conductual real (dispositivo Android sin paquete de voz, iPad con `voiceschanged` que nunca dispara) es responsabilidad explícita del plan 03-05 (prueba humana en tablet), no de este plan.

## Next Phase Readiness

- `useVoiceAnnouncer` ya expone toda la superficie que 03-04 (wake lock) y 03-05 (prueba humana) necesitan; ningún cambio pendiente en su API pública.
- `VoiceUnavailableNotice.vue` establece el patrón de "banda en flujo de documento, sin modal" que la nota de Compatibilidad Futura de la Fase 1 anticipaba y que la Fase 4 reutilizará para el aviso de versión nueva del service worker.
- Ningún bloqueador para 03-04/03-05.

---
*Phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida*
*Completed: 2026-08-30*

## Self-Check: PASSED

- Ficheros creados/modificados verificados presentes en disco: `app/composables/useVoiceAnnouncer.ts`, `app/composables/__tests__/useVoiceAnnouncer.test.ts`, `app/components/VoiceUnavailableNotice.vue`, `app/pages/[game]/index.vue`.
- Los 3 commits citados en este SUMMARY (`2bda69f`, `0eb848f`, `93b5926`) verificados presentes en `git log --oneline --all`.
- `npm test` (180 tests) y `npm run build` (prerenderiza `/` y `/marvel-champions`) verificados en verde tras el último commit.
