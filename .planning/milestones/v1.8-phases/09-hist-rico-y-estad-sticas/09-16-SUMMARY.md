---
phase: 09-hist-rico-y-estad-sticas
plan: 16
subsystem: ui — cola de fin de partida y aviso de histórico
tags: [gap-closure, warning, cr-02-amplificador, hist-02, hist-06, hist-09, wr-02, wr-05, accesibilidad]
dependency-graph:
  requires:
    - phase: "09-13"
      provides: "readRaw discriminado de tres vías; el false de record() ya no puede deberse a un fallo de LECTURA disfrazado de histórico vacío"
    - phase: "09-14"
      provides: "cierre de CR-02 (prototype pollution) y WR-08; una de las causas conocidas del false ya no existe"
  provides:
    - "finishGame(preserveProgress) — el borrado de tga:progress:<gameId> queda condicionado al resultado de record(), no incondicional"
    - "aviso de fallo dentro de una región role=status/aria-live=polite permanente, con copy que no atribuye causa"
  affects: ["app/pages/[game]/index.vue", "app/components/HistorySavedNotice.vue", "cualquier futuro llamador de finishGame"]
tech-stack:
  added: []
  patterns: ["parámetro booleano con valor por defecto para no romper llamadores existentes al condicionar un efecto destructivo", "región aria-live permanente que envuelve contenido v-if, en vez de aria-live coincidiendo con el v-if"]
key-files:
  created: []
  modified:
    - app/pages/[game]/index.vue
    - app/components/HistorySavedNotice.vue
key-decisions:
  - "finishGame recibe preserveProgress con valor por defecto false: onDiscardConfirm no pasa por finishGame (llamador distinto) y onOutcomeDismiss sigue llamando sin argumento a propósito (HIST-02), así que el default preserva el comportamiento histórico para todo el mundo salvo onOutcomeRecorded"
  - "onOutcomeRecorded se divide en dos ramas explícitas (if/else) en vez de una expresión ternaria compacta para que la ausencia de sesión (WR-04, sin intento de escritura) y el resultado de record() no se mezclen en una sola condición"
  - "la región aria-live envuelve el div con v-if en vez de llevar el atributo sobre el propio elemento con v-if — la única forma en que un lector de pantalla anuncia el cambio, según WR-05"
  - "la copy nueva no cambia el tipo de retorno de record()/appendHistoryEntry (sigue boolean): enumera las causas posibles en condicional al final, no las distingue por tipo — decisión explícita heredada del scope_boundary del plan"
requirements-completed: [HIST-02, HIST-06, HIST-09]
duration: ~20min
completed: 2026-09-13
---

# Phase 09 Plan 16: Cierre del amplificador de CR-02 — un registro fallido ya no destruye la partida Summary

`finishGame()` deja de invocarse incondicionalmente tras `record()`: ahora recibe un parámetro explícito (`preserveProgress`) que `onOutcomeRecorded` fija según el resultado de la escritura, así que un `record()` que devuelve `false` conserva `tga:progress:<gameId>` en vez de borrarlo — y el aviso de fallo, dentro de una región `role="status" aria-live="polite"` permanente, deja de afirmar una causa técnica que la app no conoce y en su lugar dice lo que sí sabe: la partida sigue ahí y se puede reintentar.

## Performance

- **Duration:** ~20 min
- **Tasks:** 2/2 completadas
- **Files modified:** 2

## Accomplishments

- **Task 1** — `app/pages/[game]/index.vue`: `finishGame(preserveProgress = false)` pone `clear(gameId)` detrás de una guarda; `onOutcomeRecorded` llama a `finishGame(!guardado)` cuando hubo intento de escritura, y a `finishGame()` sin argumento cuando no lo hubo (rama WR-04, sin sesión). `onOutcomeDismiss` no se toca: sigue llamando a `finishGame()` sin argumento, incondicional (HIST-02).
- **Task 2** — `app/components/HistorySavedNotice.vue`: la banda pasa a vivir dentro de un `<div role="status" aria-live="polite">` que se renderiza siempre (sin clases, sin `v-if`); el `v-if="variant !== null"` se mueve al elemento interior, sin tocar ninguna de sus clases. La copy de la rama de fallo deja de afirmar «el dispositivo no permitió escribir…» y pasa a decir: la partida no se ha perdido → volved a entrar y pulsad «Partida terminada» → si vuelve a fallar, puede ser el modo privado, la memoria llena o un histórico anterior ilegible (en condicional, al final).

## Task Commits

Ejecutadas como un solo repositorio (sin `sub_repos` configurado):

1. **Task 1: Un registro que no se pudo guardar deja de llevarse la partida por delante** - `0a08593` (fix)
2. **Task 2: El aviso deja de atribuir una causa que la app no conoce, y se puede oír** - `598fc1a` (fix)

**Plan metadata:** pendiente (commit final gestionado por este mismo agente, ver más abajo)

## Files Created/Modified

- `app/pages/[game]/index.vue` — `finishGame` con parámetro `preserveProgress`; `onOutcomeRecorded` condiciona el borrado del progreso al resultado de `record()`.
- `app/components/HistorySavedNotice.vue` — región `aria-live` permanente envolviendo el contenido; copy de fallo reescrita sin atribuir causa.

## Decisions Made

Ver `key-decisions` en el frontmatter. Ninguna decisión se apartó del plan; las cuatro documentan matices de implementación ya previstos en el `<scope_boundary>` y las `<action>` de cada tarea.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Entorno de worktree sin `node_modules` operativo ni `.nuxt/tsconfig.app.json`**
- **Encontrado durante:** verificación de la Task 1 (`npx vitest run`).
- **Problema:** el worktree se creó con `node_modules/` prácticamente vacío (solo caché de Vite) y sin directorio `.nuxt`, así que tanto `vitest` como `nuxt build` fallaban por resolución de módulos y por `tsconfig.app.json` inexistente — nada relacionado con el código de este plan (mismo patrón de entorno ya documentado en 09-14-SUMMARY.md).
- **Fix:** copia física (`cp -R`, no symlink — el symlink ya se descartó en 09-14 por errores de resolución ESM al cruzarlo) de `node_modules` desde el repo principal (mismos ficheros, ningún `npm install` nuevo ni modificado), seguida de `npx nuxi prepare` para regenerar `.nuxt/` (directorio generado, ignorado por git, nunca commiteado).
- **Ficheros afectados:** ninguno del repositorio — solo el árbol de trabajo del worktree (`node_modules/`, `.nuxt/`, `.output/`, todos en `.gitignore`).
- **Commit:** N/A (cambio de entorno local, no de repositorio).

---

**Total deviations:** 1 auto-fixed (Rule 3, entorno).
**Impact on plan:** Ninguno sobre el código del plan; ambas tareas se ejecutaron exactamente como estaba escrito.

## Verification Results

- `npx vitest run`: **27 ficheros, 745 tests, código 0** (línea base tras 09-14 era 733; +12 tests correspondientes a los `it.each` ya existentes en el repo tras el merge de olas previas — ningún test nuevo añadido por este plan, ninguno editado).
- `npm run build`: código 0, tanto tras la Task 1 como tras la Task 2.
- Todos los `acceptance_criteria` de grep de ambas tareas, verificados con los mismos comandos del plan:
  - `preserveProgress` → 3 apariciones.
  - `clear(gameId)` fuera de comentarios → exactamente 2 (guarda de `finishGame`, `onDiscardConfirm` intacto).
  - `session.value = null` antes que `clear(gameId)` dentro de `finishGame`, y `clear(gameId)` dentro de una guarda que menciona `preserveProgress`.
  - `onOutcomeRecorded`: una llamada a `record(`, una a `notifyHistorySaved(`, ambas antes que cualquier `finishGame(`.
  - `onOutcomeDismiss`: exactamente 1 `finishGame()` sin argumento.
  - `tga:history` en `index.vue` → 0 (tuve que corregir un comentario propio que introducía la clave literal; ver nota abajo).
  - `role="status"` → 1; `aria-live="polite"` → 1; la línea de `aria-live` precede a la de `v-if="variant !== null"`.
  - `El dispositivo no permitió escribir` → 0; `Partida terminada` → ≥1; `WR-02` → ≥1; `WR-05` → ≥1.
  - `✓ Partida registrada` → 1 (rama de éxito intacta); `aria-label="Cerrar aviso"` → 1 (botón de cierre intacto).
- `grep -ric "firestore|firebase" app/ engine/` → 0 (SC5/STAT-04 intactos, Fase 10 no se adelanta).

### Nota de autocorrección durante la Task 1 (no es una desviación del plan, es un ajuste dentro del propio grep de verificación)

Al escribir el comentario nuevo sobre la guarda de `clear(gameId)` en `finishGame`, redacté inicialmente una frase que citaba literalmente la clave `` `tga:history` `` para explicar que ninguna rama la toca. Eso hacía que `grep -c "tga:history" "app/pages/[game]/index.vue"` devolviera `1` en vez del `0` exigido por el criterio de aceptación (HIST-09 «por construcción»: la página no debe ni siquiera mencionar la clave del histórico). Corregido antes de comprometer la tarea, sustituyendo la mención literal por «el histórico» en prosa. Verificado de nuevo tras el cambio: `0`.

## Known Stubs

Ninguno. Este plan no introduce ninguna pantalla ni flujo nuevo — solo condiciona un borrado existente y reescribe una copy existente.

## Threat Flags

Ninguno nuevo. Los seis hallazgos de amenaza del `<threat_model>` del propio plan (T-09-16-01 a T-09-16-06, más T-09-16-SC) ya estaban registrados con sus disposiciones (`mitigate`/`accept`) antes de ejecutar, y quedan cerrados por las Tasks 1 y 2 tal como se planificó. No se ha instalado ningún paquete.

## Verificación humana recomendada (no bloqueante, ROADMAP §Fase 9)

**No ejecutada por este agente** — requiere DevTools interactivo, un lector de pantalla activo (VoiceOver/TalkBack) y varias vueltas de partida real; el propio plan la marca como no bloqueante porque ninguna de las dos tareas tiene arnés de test unitario capaz de montar componentes (`vitest.config.ts` usa entorno `node` en los dos proyectos, a propósito). Los siete pasos descritos en `<verification>` del plan (forzar el fallo de `localStorage.setItem` para `'tga:history'`, confirmar que el progreso sobrevive y es reanudable, confirmar que «Salir sin registrar» sigue borrando sin condiciones, confirmar el anuncio por lector de pantalla) quedan pendientes de una sesión manual del grupo, tal como el propio plan anticipa. Recomendado antes de dar por cerrado el WARNING en la próxima ronda de verificación.

## Issues Encountered

Ninguno más allá de la deviation de entorno documentada arriba.

## User Setup Required

None - no requiere configuración de servicio externo.

## Next Phase Readiness

- El WARNING «amplificador del impacto de CR-02» de `09-VERIFICATION.md` (`app/pages/[game]/index.vue:556-574`) queda cerrado: cualquier `false` futuro de `record()` — conocido o todavía sin descubrir — deja de convertirse en pérdida irreversible de la partida jugada.
- La mitad de WR-02 relativa a la copy queda cerrada; la otra mitad (una vía de interfaz para archivar un blob `unreadable` permanente) sigue registrada en `deferred-items.md`, a resolver en 09-17.
- La mitad (b) de WR-05 (maquetación de la banda sobre pantallas `h-dvh`) y WR-04 (accesibilidad de `GameOutcomeDialog`) siguen registradas en `deferred-items.md`, sin agravarse por este plan.
- Sin bloqueos para 09-17.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-13*

## Self-Check: PASSED

- `app/pages/[game]/index.vue` — FOUND (modificado, commit 0a08593)
- `app/components/HistorySavedNotice.vue` — FOUND (modificado, commit 598fc1a)
- Commit 0a08593 (`fix(09-16): finishGame no borra el progreso cuando record() falla`) — FOUND en `git log --oneline`
- Commit 598fc1a (`fix(09-16): aviso de fallo deja de atribuir causa y se puede oír`) — FOUND en `git log --oneline`
