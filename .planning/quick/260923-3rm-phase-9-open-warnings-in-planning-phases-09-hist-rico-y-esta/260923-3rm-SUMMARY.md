---
status: complete
quick_id: 260923-3rm
plan_head_before: b33c6e3
commits:
  - hash: 501b95e
    message: "feat(quick-260923-3rm): franja de avisos en flujo — WR-04/WR-05 ronda 4"
  - hash: 1e1e072
    message: "feat(quick-260923-3rm): trampa de foco + instante de fin congelado (WR-02/WR-03/WR-06 ronda 4)"
  - hash: 0b4349b
    message: "feat(quick-260923-3rm): nunca pisar lo no leído + leyenda por tabla (WR-02, WR-02 r6, WR-07)"
requirements: []
files_modified:
  - app/app.vue
  - app/components/UpdateBanner.vue
  - app/components/HistorySavedNotice.vue
  - app/components/GameSelectorScreen.vue
  - app/components/MiniSetupScreen.vue
  - app/components/MesaListaScreen.vue
  - app/components/GameOutcomeDialog.vue
  - app/pages/historico.vue
  - app/pages/estadisticas.vue
  - app/pages/[game]/index.vue
  - app/composables/useDialogFocusTrap.ts
  - app/composables/useGameHistory.ts
  - app/composables/usePersistedSession.ts
  - app/composables/useStoredProgress.ts
  - app/composables/useProgressMountPlan.ts
  - app/composables/__tests__/pilaDeAvisos.test.ts
  - app/composables/__tests__/useDialogFocusTrap.test.ts
  - app/composables/__tests__/useGameHistory.test.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - app/composables/__tests__/useStoredProgress.test.ts
  - app/composables/__tests__/useProgressMountPlan.test.ts
  - app/composables/__tests__/afirmacionesRespaldadas.test.ts
  - engine/types.ts
  - engine/history.ts
  - engine/statistics.ts
  - engine/__tests__/history.test.ts
  - engine/__tests__/statistics.test.ts
  - e2e/notice-stack.spec.ts
  - e2e/game-outcome-dialog.spec.ts
  - e2e/unreadable-storage.spec.ts
  - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
---

# Quick 260923-3rm: Cierre de los últimos WARNING reales de la Fase 9

Los siete WARNING de la Fase 9 que seguían abiertos quedan cerrados en código con test que
los fija: la franja de avisos ya no se solapa ni tapa la cabecera de `/historico`, el diálogo
de fin de partida atrapa el foco y restaura con seguridad, un reintento de registro deja de
inflar la duración de la partida, un histórico ilegible tiene explicación y salida en la
interfaz, un progreso no leído deja de sobrescribirse sin copia, y cada tabla de estadísticas
describe su propia muestra. WR-04 y WR-05(b) (ya cerrados por planes anteriores) se
re-comprueban contra el mecanismo nuevo.

## Nota de orden respecto a 260923-3rl y 260923-3rn

Este ítem se ejecutó, según indicó el coordinador, **después** de 260923-3rl (ya mergeado en
el árbol de partida) y **antes** de 260923-3rn (que aún no ha corrido). El paso 0 de la Task 1
(re-comprobación contra el árbol actual) confirmó que los siete WARNING seguían abiertos y que
WR-04/WR-05(b) seguían cerrados por 09-19/09-22 respectivamente — exactamente el estado que el
plan asumía al planificar. Todo lo que 3rl cambió en `usePersistedSession.ts` (`removeHistoryEntry`
booleano, `HISTORY_MAX_ENTRIES`, poda por `isGameHistoryEntry`), `useGameHistory.ts` (borrado
fallido, `DELETE_FAILED_HEADING/BODY`), `historico.vue` (aviso de borrado en línea), `engine/history.ts`
(`generateHistoryEntryId` con `crypto.randomUUID`) y `engine/statistics.ts` (`winPercentage`) se
conservó intacto — se editó ALREDEDOR de ese código, nunca sustituyéndolo. Como 3rn no ha
corrido todavía, la implementación se hizo contra el árbol actual sin depender de sus tests
nuevos; se mantuvieron en verde los gates de la Fase 9 que sí existen hoy
(`afirmacionesRespaldadas.test.ts`, `invariantesDeMarcaDeEstado.test.ts`).

## Warnings — closed / already-closed / left open

| # | Warning | Estado | Task | Evidencia |
|---|---|---|---|---|
| 1 | WR-04 (ronda 4) — solape `UpdateBanner`/`HistorySavedNotice` | **CERRADO** | Task 1 | `pilaDeAvisos.test.ts` (a)/(b), `e2e/notice-stack.spec.ts` |
| 2 | WR-05 (ronda 4) — toques invisibles sobre la cabecera de `/historico` | **CERRADO** | Task 1 | `pilaDeAvisos.test.ts` (a), `e2e/notice-stack.spec.ts` |
| 3 | WR-05(b) — pantallas `h-dvh` empujadas por los avisos | **YA CERRADO (09-22), RE-COMPROBADO** con el mecanismo nuevo (franja en flujo, no `fixed`) | Task 1 | `pilaDeAvisos.test.ts` (c), `e2e/notice-stack.spec.ts` |
| 4 | WR-04 (ronda 1) — `GameOutcomeDialog` sin `Escape`/foco | **YA CERRADO (09-19), RE-COMPROBADO** | Task 2 | `e2e/game-outcome-dialog.spec.ts` (Escape sigue sin cerrar) |
| 5 | WR-02 (ronda 4) + WR-03 (ronda 4) — sin trampa de foco / restauración inalcanzable | **CERRADO** | Task 2 | `useDialogFocusTrap.test.ts`, `e2e/game-outcome-dialog.spec.ts` |
| 6 | WR-06 (ronda 4) — reintento de registro con duración inflada | **CERRADO** | Task 2 | `engine/__tests__/history.test.ts` (`freezeEndInstant`/`buildHistoryEntry`) |
| 7 | WR-02 (primera entrada) — histórico `unreadable` permanente sin salida | **CERRADO** | Task 3 | `usePersistedSession.test.ts`, `e2e/unreadable-storage.spec.ts` (a) |
| 8 | WR-02 (ronda 6) — autoguardado sobrescribe progreso no leído | **CERRADO** | Task 3 | `usePersistedSession.test.ts`, `e2e/unreadable-storage.spec.ts` (b)/(c) |
| 9 | WR-07 — `sampleCaption` ignora la muestra de villanos | **CERRADO** | Task 3 | `engine/__tests__/statistics.test.ts`, `useGameHistory.test.ts` |

Ningún WARNING queda sin tratar. Los dos ya cerrados por planes anteriores (#3, #4) se
re-comprueban contra el árbol actual y siguen cerrados; los siete restantes se cierran en
este quick.

## Tareas

### Task 1 — Franja de avisos en flujo (WR-04 r4, WR-05 r4, re-comprobación WR-05(b))

`app/app.vue` sustituye el mecanismo `fixed top-0 inset-x-0 z-40 pointer-events-none` de 09-22
por una franja EN FLUJO: `#app-root` pasa a `h-dvh flex flex-col` con dos hijos — un
`shrink-0` que envuelve `<ClientOnly><UpdateBanner /><HistorySavedNotice /></ClientOnly>`, y un
`flex-1 min-h-0` que envuelve `<NuxtPage />`. `UpdateBanner.vue`/`HistorySavedNotice.vue`
pierden las cuatro utilidades de posicionamiento/puntero. Las diez apariciones de `h-dvh` en
pantallas (`GameSelectorScreen`, `MiniSetupScreen`, `MesaListaScreen`, `historico.vue`,
`estadisticas.vue`, y las cinco de `[game]/index.vue`) pasan a `h-full`, tomando su altura del
envoltorio en vez del viewport directamente.

Verify del task ejecutado tal cual el plan:
```
npx vitest run app/composables/__tests__/pilaDeAvisos.test.ts   # 12 passed
npx vitest run                                                   # 1195 passed
npm run typecheck                                                # exit 0
npx playwright test e2e/notice-stack.spec.ts e2e/counter-band-height.spec.ts e2e/portrait-usable.spec.ts   # 9 passed
```
Commit: `501b95e`

### Task 2 — Trampa de foco (WR-02/WR-03 r4) + instante de fin congelado (WR-06 r4)

`app/composables/useDialogFocusTrap.ts` (nuevo): `nextTrappedIndex` (ciclo Tab/Shift+Tab sobre
N botones, tabla de verdad completa) y `resolveRestoreTarget` (nunca `.focus()` sobre un nodo
desprendido) más el cableado `useDialogFocusTrap(container)`. `GameOutcomeDialog.vue` lo usa en
vez de su `onMounted`/`onUnmounted` manuales.

`engine/history.ts` gana `freezeEndInstant(session, now)`: sella `context.endedAt` (nuevo campo
aditivo en `engine/types.ts`, `FrozenEndInstant`) la PRIMERA vez que el grupo pulsa un
resultado en una posición, y lo sustituye si la posición cambia. `buildHistoryEntry` usa ese
sello (validado contra `runtimeId`/`round`/límites cronológicos) para `durationMs`/`recordedAt`
en vez de `now` cuando el sello sigue aplicando — un reintento de registro tras un fallo de
escritura ya no infla la duración con el tiempo hasta el reintento. `useGameHistory.ts` gana
`stampEndOfGame(session)` (lee `Date.now()` ahí y solo ahí); `app/pages/[game]/index.vue`
lo llama al principio de `onOutcomeRecorded`, antes de `record()`. `useStoredProgress.ts`
excluye `context.endedAt` de `esLaMismaPartida` (el sello no es una marca de posición).

RED real por comportamiento (confirmado ejecutando cada suite antes de implementar): las diez
funciones/comportamientos nuevos partieron de "no existe el módulo"/"la función no usa el
sello" y pasaron a verde tras la implementación — ver los commits para el diff exacto.

Verify del task:
```
npx vitest run app/composables/__tests__/useDialogFocusTrap.test.ts engine/__tests__/history.test.ts app/composables/__tests__/useStoredProgress.test.ts   # 116 passed
npx vitest run                                                   # 1224 passed
npm run typecheck                                                # exit 0
npx playwright test e2e/game-outcome-dialog.spec.ts e2e/offline-flow.spec.ts   # 6 passed
```
Commit: `1e1e072`

### Task 3 — Nunca pisar lo no leído (WR-02, WR-02 r6) + leyenda por tabla (WR-07)

`usePersistedSession.ts`: `interpretHistoryRaw` es ahora la ÚNICA interpretación del blob de
`tga:history`, compartida por `readEnvelope` y por el archivado — no pueden divergir. Nuevo
`HistoryState`/`readHistoryState()` distingue `'read-failed'` de `'uninterpretable'` (`readHistory()`,
el contrato de `useHistorySync.ts`, sigue colapsando los dos en `'unreadable'`, sin cambios).
`archiveUnreadableHistory(now)` copia el blob a `tga:history:backup-<now>`, releído y comparado
byte a byte, y SOLO entonces retira `tga:history` — confirmado con una relectura final antes de
devolver `'archived'`. `backupProgressBeforeOverwrite(gameId, now)` hace lo mismo para
`tga:progress:<gameId>`; `createOverwriteGuard(clock)` arma/desarma un guardián de escritura
(flag en cierre, nunca estado de módulo) que copia antes de la primera escritura tras armarse.

`useGameHistory.ts`: `historyReadState`/`unreadableView`/`archiveUnreadable()` +
`buildUnreadableHistoryView`/`archiveResultMessage` (copy exacta del plan). `heroSampleCaption`/
`villainSampleCaption` sustituyen a `sampleCaption` (`engine/statistics.ts` gana
`entriesWithVillain`, mismo predicado que `extractVillainId`). `historico.vue` pinta el estado
ilegible con su botón «Apartarlo y empezar uno nuevo» (banda de resultado independiente de
`unreadableView`, para que no desaparezca justo cuando el archivado tiene éxito — desviación
propia, ver más abajo). `estadisticas.vue` pinta su propia mitad y una leyenda por tabla.
`app/pages/[game]/index.vue`: `progressWriter = createOverwriteGuard()` sustituye a `save()`
directo en los tres llamadores del autoguardado; se arma en `onMounted` cuando
`planProgressMount` devuelve un aviso de lectura no verificada. `UNVERIFIED_PROGRESS_NOTICE`
se reescribe para describir la mitigación real («antes de guardar la nueva, la app aparta una
copia…») en vez de advertir de un riesgo que ya no corre; su entrada en `AFIRMACIONES_AUDITADAS`
(`afirmacionesRespaldadas.test.ts`) se reescribe para citar `createOverwriteGuard`/
`backupProgressBeforeOverwrite` con respaldo en `usePersistedSession.test.ts` — sin añadir
ninguna entrada auditada nueva.

Verify del task:
```
npx vitest run app/composables/__tests__/usePersistedSession.test.ts app/composables/__tests__/useGameHistory.test.ts engine/__tests__/statistics.test.ts app/composables/__tests__/useProgressMountPlan.test.ts app/composables/__tests__/afirmacionesRespaldadas.test.ts app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts app/composables/__tests__/useHistorySync.test.ts   # 407 passed
npx vitest run                                                   # 1259 passed
npm run typecheck                                                # exit 0
npx playwright test e2e/unreadable-storage.spec.ts e2e/offline-flow.spec.ts e2e/update-banner.spec.ts e2e/notice-stack.spec.ts e2e/game-outcome-dialog.spec.ts   # 14 passed
```
Commit: `0b4349b`

## Decisiones propias (discreción documentada en el plan)

1. **Banda de resultado de archivado independiente de `unreadableView` (Task 3).** El plan
   sugería pintar `archiveResultMessage(resultado)` "en una línea `role='status'`" dentro del
   bloque del estado ilegible. Al implementarlo así, el propio ÉXITO del archivado (que pone
   `unreadableView` a `null`) hacía desaparecer el mensaje de éxito en el mismo instante en que
   aparecía — descubierto por el primer fallo real de `e2e/unreadable-storage.spec.ts` (a). Se
   movió a una banda propia, en la misma región `shrink-0`/`role="status"` que ya usa el aviso
   de borrado fallido (IN-11, quick 3rl), independiente de `unreadableView`. Documentado en el
   propio comentario del template.
2. **`archiveUnreadableHistory`/`backupProgressBeforeOverwrite` releen y comparan byte a byte
   antes de retirar/sobrescribir nada**, más allá de lo mínimo que el `<behavior>` pedía
   literalmente — mismo criterio de verificación que CR-03 (Fase 9) ya exige en el resto del
   fichero: nunca destruir lo que no se ha podido confirmar.
3. **`resolveRestoreTarget`/`nextTrappedIndex` genéricos** (no atados a `HTMLElement`) para que
   el test puro pudiera ejercerlos con objetos sintéticos sin jsdom.

## Verificación de fin de plan (los tres verify de las tareas, re-ejecutados juntos)

- `npx vitest run` (suite completa): **40 test files, 1259 tests, 0 fallos.**
- `npm run typecheck` (`nuxt typecheck`): **exit 0.**
- `npx playwright test e2e/notice-stack.spec.ts e2e/game-outcome-dialog.spec.ts e2e/unreadable-storage.spec.ts e2e/offline-flow.spec.ts e2e/update-banner.spec.ts e2e/counter-band-height.spec.ts e2e/portrait-usable.spec.ts`: **22 passed, 0 failed** (verificación completa del plan, puerto 4173 libre antes de cada ejecución).
- `git diff --stat` no incluye `app/composables/useHistorySync.ts`, `nuxt.config.ts` ni `content/*.json` — confirmado con `git diff --stat HEAD -- app/composables/useHistorySync.ts nuxt.config.ts 'content/*.json'` (sin salida).
- `deferred-items.md`: las siete entradas WARNING llevan «CERRADO (quick 260923-3rm)» o «Actualización (quick 260923-3rm) — CERRADO», WR-04 y WR-05(b) llevan «Re-comprobado (quick 260923-3rm)», y la «Nota de cierre (quick 260923-3rm)» final declara **PENDIENTE** (no hecha) la comprobación humana en tablet real, sin tocar `REQUIREMENTS.md`.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno — las mitigaciones del `<threat_model>` del plan (T-3rm-01..T-3rm-07) se implementaron
tal como estaban descritas: `archiveUnreadableHistory`/`createOverwriteGuard` nunca escriben sin
verificar antes (T-3rm-01/T-3rm-02), el sello de `freezeEndInstant` se valida contra
posición/límites cronológicos y nunca lanza (T-3rm-03), la trampa de foco cicla incluso con foco
previo fuera del diálogo (T-3rm-04), las copias `…:backup-<ts>` no salen del propio navegador
(T-3rm-05, riesgo aceptado), y la cuota de `localStorage` crece a lo sumo una copia por episodio
de lectura fallida (T-3rm-06, riesgo aceptado, registrado en deferred-items.md).

## Self-Check: PASSED

Ficheros comprobados con `[ -f ... ]`: los 14 ficheros nuevos/`.spec.ts` de este quick
(`app/composables/useDialogFocusTrap.ts`, `app/composables/__tests__/pilaDeAvisos.test.ts`,
`app/composables/__tests__/useDialogFocusTrap.test.ts`, `e2e/notice-stack.spec.ts`,
`e2e/game-outcome-dialog.spec.ts`, `e2e/unreadable-storage.spec.ts` y los ficheros modificados
listados en `files_modified`) — todos `FOUND`. Commits comprobados con
`git log --oneline --all | grep`: `501b95e`, `1e1e072`, `0b4349b` — los tres `FOUND`.
