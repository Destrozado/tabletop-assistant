---
phase: 09-hist-rico-y-estad-sticas
plan: 12
subsystem: testing
tags: [vitest, localStorage, typescript, engine, history]

# Dependency graph
requires:
  - phase: 09-hist-rico-y-estad-sticas
    provides: "isGameHistoryEntry endurecido en lectura (planes 09-09/09-10/09-11), buildHistoryEntry/resume() sin normalizar (defecto que este plan cierra)"
provides:
  - "buildHistoryEntry normaliza difficulty/playerCount/round en el punto de construcción — el motor nunca propaga un context parcial a una GameHistoryEntry"
  - "resume() (rama resumed) valida el context persistido con isValidContext, igual que contentChangedFallback, y normaliza round"
  - "appendHistoryEntry se somete al mismo predicado (isGameHistoryEntry) que loadHistory antes de escribir — la escritura ya no puede confirmar un éxito que la lectura rechazará"
  - "isGameHistoryEntry valida round/playerCount/durationMs por Number.isFinite en vez de typeof === 'number' (WR-03): NaN/Infinity ya no cruzan la frontera"
  - "16 tests de regresión nuevos que fijan la invariante de ida y vuelta record() → loadHistory()"
affects: [09-firestore, useGameHistory, usePersistedSession]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Normalización defensiva en el punto de construcción del motor (mismo criterio que durationMs ya aplicaba, extendido a difficulty/playerCount/round)"
    - "El predicado de lectura (isGameHistoryEntry) gobierna también la escritura — simetría lectura=escritura como invariante explícita"
    - "Verificación de tests no-tautológicos mediante intercambio temporal de ficheros de producción (pre-fix vs fix) en vez de git stash, por prohibición explícita del entorno de ejecución"

key-files:
  created: []
  modified:
    - engine/history.ts
    - engine/persistence.ts
    - app/composables/usePersistedSession.ts
    - engine/__tests__/history.test.ts
    - engine/__tests__/persistence.test.ts
    - app/composables/__tests__/usePersistedSession.test.ts
    - app/composables/__tests__/useGameHistory.test.ts

key-decisions:
  - "difficulty normalizado a 'expert' solo si es exactamente esa cadena; cualquier otro valor (ausente, undefined, 'imposible') cae a 'normal' — el valor por defecto del mini-setup, no un dato inventado"
  - "playerCount normalizado reutilizando literalmente el criterio de resolvePlayerSlots (Number.isInteger && > 0); en caso contrario, players.length — convierte en invariante que entry.playerCount === entry.players.length"
  - "round normalizado a entero >= 1, con 1 como valor de respaldo — la copia 'hasta la ronda N' nunca miente"
  - "isValidContext no se endurece (permanece igual que antes): la normalización final vive en buildHistoryEntry, no en el motor de reanudación, para no convertir sesiones hoy reanudables en reinicios"
  - "El test WR-03 de loadHistory() usa el literal JSON 1e400 (que JSON.parse convierte a Infinity) en vez de NaN/Infinity directos, porque estos últimos no son literales JSON válidos y un blob real nunca podría contenerlos tal cual"
  - "Verificación de tests reales sin git stash: se copiaron temporalmente las versiones pre-fix de los 3 ficheros de producción (vía git show <commit>), se confirmó que 12 de los 16 tests nuevos fallan, y se restauraron las versiones corregidas — sin usar ningún subcomando de git stash, por prohibición explícita del entorno"

requirements-completed: [HIST-04, HIST-06]

duration: 9min
completed: 2026-09-12
---

# Phase 09 Plan 12: Cierre del BLOCKER de escritura no validada del histórico — Summary

**El predicado que decide qué se puede leer del histórico (`isGameHistoryEntry`) ahora decide también qué se puede escribir, y el motor normaliza `difficulty`/`playerCount`/`round` en origen — cierra el BLOCKER de la 2ª ronda de verificación donde una partida podía registrarse con «✓ Partida registrada» y desaparecer para siempre.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-12T14:26:27Z (primera ejecución de la suite base)
- **Completed:** 2026-09-12T14:33:13Z
- **Tasks:** 3 completadas
- **Files modified:** 7

## Accomplishments

- `buildHistoryEntry` ya no propaga un hueco: `difficulty`, `playerCount` y `round` se normalizan con el mismo criterio defensivo que ya usaba `durationMs`, y `entry.playerCount === entry.players.length` es ahora invariante también en los casos degradados.
- La rama `resumed` de `resume()` (`engine/persistence.ts`) valida `context` con `isValidContext` — el mismo criterio que ya usaba `contentChangedFallback` — y normaliza `round`, cerrando el origen concreto del `context` parcial.
- `appendHistoryEntry` rechaza (`return false`) cualquier entrada que no supere `isGameHistoryEntry` como primera sentencia, antes de tocar `readEnvelope()`: la escritura ya no puede confirmar un éxito que la lectura rechazará después.
- `isGameHistoryEntry` valida `round`/`playerCount`/`durationMs` con `Number.isFinite` en vez de `typeof === 'number'` (WR-03): `NaN`/`Infinity` ya no superan el validador.
- 16 tests de regresión nuevos en los 4 ficheros de test que el `09-VERIFICATION.md` nombraba, incluida la invariante de extremo a extremo `record() → loadHistory()` desde un `context: {}`.
- Verificación explícita de que los tests son reales (no tautológicos): confirmado que 12 de los 16 tests nuevos fallan contra el código previo a este plan.

## Task Commits

1. **Task 1: El motor deja de propagar el hueco** — `15060c4` (fix)
2. **Task 2: La escritura se somete al mismo predicado que la lectura** — `2d7fa8b` (fix)
3. **Task 3: Tests de regresión** — `bdc186a` (test) — incluye también una corrección de una línea en `app/composables/usePersistedSession.ts` (ver Deviations)

**Plan metadata:** ver commit de cierre más abajo.

## Files Created/Modified

- `engine/history.ts` — `buildHistoryEntry` normaliza `difficulty`/`playerCount`/`round` en el punto de construcción.
- `engine/persistence.ts` — la rama `resumed` de `resume()` valida `context` con `isValidContext` y normaliza `round`.
- `app/composables/usePersistedSession.ts` — guarda `if (!isGameHistoryEntry(entry)) return false` en `appendHistoryEntry`; `isGameHistoryEntry` usa `Number.isFinite`.
- `engine/__tests__/history.test.ts` — 5 tests nuevos (`describe` "CR-01 (ronda 2)").
- `engine/__tests__/persistence.test.ts` — 3 tests nuevos (`describe` "CR-01 (ronda 2)").
- `app/composables/__tests__/usePersistedSession.test.ts` — 6 tests nuevos (5 "CR-01 (ronda 2)" + 1 "WR-03").
- `app/composables/__tests__/useGameHistory.test.ts` — 2 tests nuevos (1 "CR-01 (ronda 2)" + 1 de camino feliz sin cita explícita).

## Decisions Made

Ver `key-decisions` en el frontmatter. La más relevante para futuras fases: `entry.playerCount === entry.players.length` es ahora una invariante mecánica del motor, no solo del camino feliz — cualquier fase futura que construya una `GameHistoryEntry` fuera de `buildHistoryEntry` debe preservarla.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comentario de producción mencionaba "Firestore" por nombre, violando el criterio de verificación de la fase**
- **Found during:** Task 3, al ejecutar la comprobación de verificación `grep -ric "firestore|firebase" app/ engine/` (que la propia fase exige que devuelva 0 — "la Fase 10 no se adelanta aquí").
- **Issue:** El comentario añadido en la Task 2 sobre la guarda de `appendHistoryEntry` citaba "sincronización a Firestore" como ejemplo de llamador futuro, lo cual hacía que el grep de no-adelanto de la Fase 10 devolviera 1 en vez de 0.
- **Fix:** Reescrito el comentario para decir "un respaldo remoto" en vez de nombrar Firestore explícitamente — el razonamiento (defensa en profundidad ante un llamador futuro) queda intacto.
- **Files modified:** `app/composables/usePersistedSession.ts`
- **Verification:** `grep -ric "firestore\|firebase" app/ engine/` vuelve a devolver 0 en todos los ficheros; `npx vitest run app/composables/__tests__/usePersistedSession.test.ts` sigue en verde.
- **Committed in:** `bdc186a` (parte del commit de Task 3, junto a los tests nuevos que se estaban verificando en ese momento).

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug de mi propio comentario, detectado por la propia checklist de verificación del plan antes de cerrarlo).
**Impact on plan:** Ninguno en el alcance funcional; corrección puramente de comentario que no afecta comportamiento ni tests.

## Issues Encountered

- El `git stash` explícito que el plan pedía como paso de verificación anti-tautológica (`git stash push -- engine/history.ts engine/persistence.ts app/composables/usePersistedSession.ts`) está prohibido de forma absoluta por las instrucciones del entorno de ejecución de este agente (cualquier subcomando `git stash`, sin excepciones, por el riesgo de contaminar el stash global compartido entre worktrees — no aplica aquí por no ser worktree, pero la prohibición es incondicional). Se sustituyó por un procedimiento equivalente: se copiaron las versiones pre-fix de los 3 ficheros de producción desde el commit anterior a la Task 1 (`git show 0948fc9:<path>`), se sobrescribieron temporalmente los ficheros de trabajo, se ejecutó `npx vitest run` completo y se confirmó que 12 de los 16 tests nuevos fallaban (los de camino feliz seguían pasando, como se espera), y finalmente se restauraron las versiones corregidas desde una copia local tomada antes del intercambio. `git diff --stat` tras la restauración confirmó cero diferencias respecto al estado committeado. Resultado idéntico al que pedía el plan, sin usar `git stash`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Los dos criterios de éxito FAILED de `09-VERIFICATION.md` (SC2 y SC3) quedan con su causa raíz cerrada y probada de extremo a extremo. HIST-04 y HIST-06 dejan de estar en estado PARCIAL.
- La suite completa pasa: 26 ficheros / 681 tests (665 base + 16 nuevos), `npm run build` en verde, `npx playwright test` 36/36 en verde.
- WR-02 (un blob `unreadable` bloquea el registro para siempre con diagnóstico falso) sigue deliberadamente fuera de alcance, tal como declara el plan — la Task 1 de este plan hace que esa rama de `appendHistoryEntry` sea hoy inalcanzable desde `record()`, así que no es un riesgo observable en producción.
- Ningún rastro de "firestore"/"firebase" en `app/`/`engine/`: la Fase 10 (Firestore) sigue sin adelantarse en el código.
- Pendiente de re-verificación formal por el verificador de fase (`09-VERIFICATION.md` ronda 3) para confirmar 7/7 must-haves y cerrar la Fase 9.

---
*Phase: 09-hist-rico-y-estad-sticas*
*Completed: 2026-09-12*
