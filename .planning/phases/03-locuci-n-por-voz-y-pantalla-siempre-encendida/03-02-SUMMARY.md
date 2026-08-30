---
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
plan: 02
subsystem: ui
tags: [vueuse, useSpeechSynthesis, tts, vitest, localStorage, vue]

requires:
  - phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
    provides: "useGameSession (currentNode/currentText computeds), usePersistedSession (única costura de localStorage), AppHeader.vue con hueco reservado para el icono de voz"
provides:
  - "useVoiceAnnouncer: composable de voz con máquina de estados on/muted/unavailable y announce()/toggle()/silence()"
  - "Clave de preferencia de voz tga:voice-enabled, independiente de la partida"
  - "Control de silencio de 3 estados en AppHeader.vue"
  - "Los cinco puntos de entrada por toque del runner locutan de forma síncrona (onNext/onBack/onIndexJumpTo/onResumeContinue/onContentChangedAcknowledge)"
  - "Proyecto de Vitest app-logic (environment node) que ejecuta tests de app/"
affects: ["03-03 (detección de voz española)", "03-04 (wake lock)", "03-05 (prueba humana en tablet)"]

tech-stack:
  added: []
  patterns:
    - "useSpeechSynthesis instanciado una sola vez con un getter reactivo (spokenLine), nunca re-creado por paso"
    - "announce() como sentencia síncrona dentro del propio manejador de toque, nunca en un watch (D-42, landmine de iOS Safari)"
    - "Helpers puros exportados a nivel de módulo (resolveVoiceState/shouldAnnounce) para testear la máquina de estados sin montar el composable"
    - "Segundo proyecto de Vitest (app-logic, environment node) con alias ~~/~ resueltos a mano para tests fuera de contexto Nuxt"

key-files:
  created:
    - app/composables/useVoiceAnnouncer.ts
    - app/composables/__tests__/useVoiceAnnouncer.test.ts
    - app/composables/__tests__/usePersistedSession.test.ts
  modified:
    - vitest.config.ts
    - app/composables/usePersistedSession.ts
    - app/components/AppHeader.vue
    - app/pages/[game]/index.vue

key-decisions:
  - "normalizeVoicePreference solo trata false === false como silencio explícito; cualquier otro valor (ausente, corrupto, editado a mano) activa la voz (D-47)"
  - "tga:voice-enabled vive en su propia clave sin sufijo de gameId para sobrevivir a «Empezar partida nueva» y al descarte de progreso (D-46)"
  - "resolveVoiceState trata available === null (detección aún sin resolver) como optimista → 'on', nunca como un tercer estado visual parpadeante"
  - "announce()/silence() envueltos en try/catch tras comprobar isSupported.value, replicando el patrón defensivo ya usado en usePersistedSession.load()"

patterns-established:
  - "Proyecto Vitest app-logic con environment:'node' para tests de funciones puras de app/ (sin DOM, sin montar componentes)"

requirements-completed: [VOZ-01, VOZ-02, VOZ-03, VOZ-04, VOZ-06]

duration: ~20min
completed: 2026-08-30
---

# Phase 3 Plan 02: Locución por voz — composable, cabecera y cableado síncrono Summary

**Composable `useVoiceAnnouncer` que envuelve `useSpeechSynthesis` de VueUse con una máquina de estados de tres valores (on/muted/unavailable), cableado en los cinco puntos de entrada por toque del runner y en un botón de silencio de 3 estados en la cabecera; la preferencia sobrevive a recargas y a partidas nuevas en su propia clave de `localStorage`.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3/3 completados
- **Files modified:** 7 (3 creados, 4 modificados)

## Accomplishments
- Al tocar SIGUIENTE, ‹ Atrás, un paso del índice, «Continuar» de la reanudación o el CTA de contenido cambiado, la tablet dice en español la frase corta (`speech`) del paso al que llega — llamada síncrona, dentro del mismo gesto de toque, nunca en un `watch` (landmine de iOS Safari).
- El icono de voz de la cabecera tiene tres estados reales (on/muted/unavailable), reutiliza exactamente la caja táctil 48×48 del `≡`, y dos SVG monocromos hechos a mano en vez de emoji `🔊`/`🔇`.
- Silenciar corta la locución en curso al instante (sin dejar terminar la frase) y persiste la preferencia en `tga:voice-enabled`, una clave independiente del progreso de partida que sobrevive a «Empezar partida nueva» y al descarte de progreso.
- Ocultar/bloquear la tablet corta la locución en curso vía `useDocumentVisibility`, sin relocutar al volver — sin añadir un segundo listener manual de `visibilitychange`.
- En un navegador sin síntesis de voz (`isSupported === false`), `announce()`/`silence()` nunca llaman a `speak()`/`stop()`: la navegación sigue funcionando exactamente igual, sin excepciones.
- Nuevo proyecto de Vitest `app-logic` (environment `node`) que por fin ejecuta tests reales de `app/`, con los alias `~`/`~~` resueltos a mano para tests fuera de un contexto Nuxt.

## Task Commits

Cada tarea se comprometió atómicamente, con ciclo RED→GREEN explícito para las Tareas 1 y 2 (`tdd="true"`):

1. **Task 1: Proyecto app-logic y clave de preferencia de voz** — `2b7e284` (test, RED) → `f75789e` (feat, GREEN)
2. **Task 2: Composable useVoiceAnnouncer** — `717e912` (test, RED) → `e4a7364` (feat, GREEN)
3. **Task 3: Control de silencio en la cabecera y cableado del runner** — `3638163` (feat)

_Nota: las Tareas 1 y 2 confirmaron RED de verdad (test falla contra el código sin implementar) antes de aplicar la implementación y confirmar GREEN — verificado ejecutando `npx vitest run --project app-logic` en ambos estados._

## Files Created/Modified
- `vitest.config.ts` — segundo proyecto `app-logic` (environment `node`, alias `~`/`~~` resueltos con `fileURLToPath`)
- `app/composables/usePersistedSession.ts` — `VOICE_KEY`, `normalizeVoicePreference`, `loadVoicePreference`/`saveVoicePreference`; `clear(gameId)` sin tocar
- `app/composables/__tests__/usePersistedSession.test.ts` — 7 tests puros de `normalizeVoicePreference` y separación de prefijo de clave
- `app/composables/useVoiceAnnouncer.ts` — máquina de estados, `announce()`/`toggle()`/`silence()`, corte por visibilidad
- `app/composables/__tests__/useVoiceAnnouncer.test.ts` — 13 tests puros de `resolveVoiceState`/`shouldAnnounce`
- `app/components/AppHeader.vue` — prop `voiceState`, emit `voice-toggle`, botón de 3 estados con 2 SVG inline
- `app/pages/[game]/index.vue` — instancia `useVoiceAnnouncer`, `onNext`/`onBack` nuevos, `announce()` en 5 puntos de entrada

## Decisions Made
- `normalizeVoicePreference` implementada como `value !== false` (no una lista de casos válidos): cualquier valor que no sea el booleano `false` exacto activa la voz, incluidos `undefined`, `null`, `'false'` (string) y `0` — exactamente el contrato defensivo de D-47.
- La detección de voz española (`available`) queda como `ref<boolean | null>(null)` sin resolver en este plan — es el enganche real que el plan 03-03 completará, no un stub de decisión: `null` ya alimenta correctamente la rama optimista `'on'` de `resolveVoiceState` según el UI-SPEC.
- El `catch` vacío en `announce()`/`silence()` es deliberado (no decorativo): documenta la landmine de iOS conocida (el emparejamiento cancelar/hablar puede fallar justo tras terminar la locución anterior) sin que VOZ-06 se rompa.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.nuxt/` ausente rompía la resolución de `tsconfig.app.json` al ejecutar Vitest**
- **Found during:** Verificación RED de la Tarea 1 (`npx vitest run --project app-logic`)
- **Issue:** El worktree no tenía `.nuxt/` generado; Vite fallaba con `TSCONFIG_ERROR: Failed to load tsconfig '.nuxt/tsconfig.app.json'` antes incluso de poder confirmar el estado RED del test.
- **Fix:** Se ejecutó `npx nuxt prepare` para regenerar `.nuxt/` (directorio de build, gitignorado, sin instalar ningún paquete nuevo).
- **Files modified:** ninguno (solo genera `.nuxt/`, ya en `.gitignore`)
- **Verification:** `npx vitest run --project app-logic` volvió a ejecutarse con normalidad tras la regeneración.
- **Committed in:** N/A (no produce cambios versionables)

**2. [Rule 1 - Bug] Un comentario propio inflaba el conteo de `announce()` a 6 en vez de 5**
- **Found during:** Verificación de criterios de aceptación de la Tarea 3
- **Issue:** El comentario explicativo sobre D-42 citaba literalmente `` `announce()` `` entre backticks, y `grep -c "announce()"` lo contaba como una sexta ocurrencia además de las 5 llamadas reales.
- **Fix:** Reescrito el comentario sin los paréntesis literales (``la locución`` en vez de `` `announce()` ``).
- **Files modified:** `app/pages/[game]/index.vue`
- **Verification:** `grep -c "announce()" app/pages/[game]/index.vue` → 5
- **Committed in:** `3638163` (parte del commit de la Tarea 3)

**3. [Ninguna acción — nota de verificación] `npx nuxt typecheck`/`npx vue-tsc` no disponibles**
- **Found during:** Verificación de la Tarea 3
- **Issue:** Ni `typescript` ni `vue-tsc` están instalados en `node_modules` (no forman parte de `package.json` en este momento del proyecto). El comando de verificación del plan cae a `npx vue-tsc`, que intentaría descargar un paquete no auditado vía `npx` — explícitamente excluido del auto-fix de la Regla 3 (instalación de paquetes).
- **Decisión:** No se ejecutó `npx vue-tsc`. Se verificó en su lugar `npm test` (verde, 167 tests) y `npm run build` (verde, prerenderiza `/` y `/marvel-champions` sin error), que son los dos criterios de aceptación con gate real de esta tarea. El typecheck en sí queda fuera de este plan; si el proyecto adopta `vue-tsc` en una fase futura, debe pasar por el research/gate de paquetes nuevos, no por un `npx` implícito.
- **Files modified:** ninguno

---

**Total deviations:** 2 auto-fijadas (1× Regla 3, 1× Regla 1) + 1 nota de verificación sin cambio de código.
**Impact on plan:** Ninguna afecta el alcance ni el comportamiento entregado; ambas eran necesarias para completar la verificación tal como la describe el propio plan.

## Issues Encountered

El worktree partió en un commit base (`a661f8e`, «UI design contract») anterior al commit esperado por el orquestador (`16eeaf0`, «pattern map»). Como `a661f8e` es ancestro directo de `16eeaf0` (rama `main` había avanzado con commits puramente documentales entre la creación del worktree y el arranque de este agente), se hizo fast-forward con `git reset --hard 16eeaf0...` antes de empezar cualquier tarea — sin pérdida de commits, solo alineación con la base esperada.

## User Setup Required

Ninguno — no hay configuración de servicios externos que requiera intervención manual. La verificación conductual pendiente (D-46 en un `localStorage` real de navegador, comportamiento de `speak()` en un dispositivo real) es responsabilidad explícita del plan 03-05 (prueba humana en tablet), no de este plan.

## Next Phase Readiness

- `useVoiceAnnouncer` expone `available`/`isSupported` ya listos para que el plan 03-03 conecte la detección real de voz española (hoy `available` es `ref(null)`, alimentando correctamente el estado optimista `'on'`).
- El corte de locución por visibilidad usa `useDocumentVisibility` sin un listener manual de `visibilitychange`, dejando el terreno limpio para que 03-04 use `useWakeLock` sin duplicar esa costura (ambos comparten el mismo evento, tal como anticipa `03-CONTEXT.md`).
- Ningún bloqueador para 03-03/03-04/03-05.

---
*Phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida*
*Completed: 2026-08-30*

## Self-Check: PASSED

- Todos los ficheros creados (`app/composables/useVoiceAnnouncer.ts`, `app/composables/__tests__/useVoiceAnnouncer.test.ts`, `app/composables/__tests__/usePersistedSession.test.ts`) verificados presentes en disco.
- Los 6 commits citados en este SUMMARY (`2b7e284`, `f75789e`, `717e912`, `e4a7364`, `3638163`, `f857793`) verificados presentes en `git log --oneline --all`.
