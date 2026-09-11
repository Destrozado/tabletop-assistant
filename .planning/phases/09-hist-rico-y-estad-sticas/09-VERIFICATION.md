---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-11T22:00:00Z
status: gaps_found
score: 5/7 must-haves verified
overrides_applied: 0
gaps:
  - truth: "El histórico vive en localStorage como fuente de verdad (SC3): una escritura nunca destruye entradas previas que el lector no sepa interpretar"
    status: failed
    reason: >
      appendHistoryEntry() y removeHistoryEntry() (app/composables/usePersistedSession.ts)
      usan loadHistory() como base de un patrón leer-modificar-escribir y reescriben la
      clave `tga:history` completa. loadHistory() devuelve `[]` (no solo "vacío", sino
      "no puedo interpretar esto") ante JSON corrupto, ante un `formatVersion` distinto de 1,
      o ante un envoltorio sin `entries` array. Reproducido de forma independiente contra el
      código real (sin mocks de la función bajo prueba): con un blob `formatVersion: 2` de
      2 entradas ya en `tga:history`, la siguiente llamada a appendHistoryEntry() devuelve
      `true` (escritura "exitosa") pero sustituye el blob completo por una sola entrada —
      las 2 previas desaparecen para siempre, sin ningún aviso al grupo. Esto contradice
      directamente el propio comentario del fichero (líneas 50-53) que llama a
      `formatVersion` "el punto de migración futuro", y el must-have D-13 declarado en
      09-04-PLAN.md ("la lectura valida entrada a entrada y descarta las inválidas sin
      tirar el resto").
    artifacts:
      - path: "app/composables/usePersistedSession.ts"
        issue: "appendHistoryEntry (líneas ~227-234) y removeHistoryEntry (líneas ~240-247) reescriben tga:history completo a partir de loadHistory(), que no distingue 'histórico vacío' de 'blob ilegible'"
    missing:
      - "Separar 'leer el envoltorio en crudo' de 'leer las entradas válidas' y abortar la escritura (devolver false) cuando el blob existente no es un envoltorio v1 legible, en vez de sobrescribirlo con loadHistory() filtrado"
      - "Test: con formatVersion 2 guardado, appendHistoryEntry devuelve false y el blob v2 sigue intacto"
  - truth: "La pantalla /historico lista las partidas registradas sin caerse ante una entrada del histórico con datos inconsistentes (SC3)"
    status: failed
    reason: >
      isGameHistoryEntry() (app/composables/usePersistedSession.ts) acepta cualquier
      `players` que sea un array sin validar sus elementos — `players: [null]` pasa la
      validación de almacenamiento. buildHistoryCardView() (app/composables/useGameHistory.ts,
      línea ~104) hace `player.heroId !== null` sobre cada elemento sin comprobar antes que
      no sea null, lo que lanza `TypeError: Cannot read properties of null`. Reproducido de
      forma independiente: una entrada con `players: [null]` sobrevive a loadHistory() y al
      pasarla a buildHistoryCardView() (llamada por la computed `cardViews` que /historico
      renderiza) lanza TypeError — la pantalla completa se cae, incluido el botón de borrar
      que permitiría eliminar la entrada causante. `engine/statistics.ts` sí aplica la
      guarda `p !== null && typeof p === 'object'` en el mismo tipo de dato; useGameHistory.ts
      no la tiene.
    artifacts:
      - path: "app/composables/useGameHistory.ts"
        issue: "buildHistoryCardView líneas 104 y 115-118 desreferencian entry.players sin filtrar elementos null/no-objeto"
      - path: "app/composables/usePersistedSession.ts"
        issue: "isGameHistoryEntry no valida el contenido de cada elemento de players"
    missing:
      - "Filtrar players con la misma guarda que ya usa engine/statistics.ts antes de usarlos en buildHistoryCardView"
      - "Endurecer isGameHistoryEntry para rechazar entradas con elementos de players que no sean objetos válidos"
  - truth: "La pantalla /estadisticas muestra el % de victorias sin caerse ante una entrada con villainId o heroId no-string (SC4)"
    status: failed
    reason: >
      isGameHistoryEntry() no valida el tipo de villainId/villainName/heroId/heroName. Una
      entrada con villainId numérico y villainName null pasa la validación de
      almacenamiento; engine/statistics.ts construye `name: entry.villainName ?? entry.villainId`
      (un número) y luego ordena con `a.name.localeCompare(b.name, 'es')` — Number no tiene
      localeCompare, así que sort lanza TypeError en cuanto hay ≥2 filas y el motor de
      ordenación invoca el comparador con la fila corrupta como primer argumento.
      Reproducido de forma independiente contra aggregateStatistics() real: con 2 entradas
      de villano (una con villainId numérico, orden de inserción tal que la fila corrupta
      cae como primer argumento del comparador), aggregateStatistics() lanza TypeError,
      lo que rompe la computed `statisticsView` que /estadisticas renderiza.
    artifacts:
      - path: "engine/statistics.ts"
        issue: "buildRows línea ~81: a.name.localeCompare(b.name, 'es') asume name siempre string; extractHeroIds/extractVillainId (líneas 88/93) pueden producir name numérico si la entrada de origen no fue validada por tipo"
      - path: "app/composables/usePersistedSession.ts"
        issue: "isGameHistoryEntry no valida el tipo de villainId/villainName/heroId/heroName/difficulty/lossCause/durationMs"
    missing:
      - "Validar tipos en isGameHistoryEntry/isHistoryPlayerEntry en la frontera de almacenamiento (igual que ya hace engine/statistics.ts para Array.isArray/typeof)"
      - "Defensa en profundidad: String(...) explícito en extractHeroIds/extractVillainId antes de usar el valor como name"
human_verification: []
---

# Fase 9: Histórico y estadísticas — Informe de verificación

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-11
**Estado:** gaps_found (3 BLOCKER)
**Re-verificación:** No — verificación inicial

## Resumen ejecutivo

El flujo feliz de la fase (registrar resultado, listar histórico, borrar una entrada,
consultar estadísticas, todo sin red) está construido, cableado correctamente y fue
verificado por un humano jugando una partida real completa (checkpoint bloqueante de
`09-08-PLAN.md`, aprobado literalmente el 2026-09-11). El código de agregación no lee
Firestore ni nada que no sea `localStorage` (SC5 trivialmente cierto porque Firestore no
existe todavía en el repo). El campo HIST-04, marcado "Pendiente" en `REQUIREMENTS.md`, está
en realidad **satisfecho en el código** — es un caso de la tabla de trazabilidad
desincronizada que `deferred-items.md` ya documentó (ver sección dedicada más abajo).

Sin embargo, he reproducido de forma independiente (contra las funciones de producción
reales, sin mocks del código bajo prueba, con tests vitest desechables que borré tras
ejecutarlos) los tres hallazgos CRÍTICOS de `09-REVIEW.md`. Los tres son alcanzables sin
necesitar edición manual malintencionada en DevTools — el escenario de CR-03 en particular
(un `formatVersion` desconocido ya en `localStorage`, p. ej. tras un *rollback* de versión)
es exactamente el caso que el propio comentario del código dice estar anticipando como
"punto de migración futuro". Los tres inciden directamente sobre el Criterio de Éxito nº 3
del ROADMAP ("el histórico... vive en localStorage como fuente de verdad") y el nº 4
("estado vacío claro, no un error"): la garantía de durabilidad y la robustez de las dos
pantallas ante datos inconsistentes no se sostienen, aunque el camino feliz sí funcione.
La verificación humana aprobada NO ejercitó ningún caso de dato corrupto o fallo de
almacenamiento — el propio checkpoint (11 pasos) es explícito sobre qué cubrió, y no
incluye estos casos.

**Conclusión: el objetivo de la fase NO se considera plenamente alcanzado.** El registro,
listado y borrado funcionan en el camino feliz, pero la garantía central de la fase —que el
histórico es una fuente de verdad duradera en localStorage, resistente a los datos que ella
misma puede llegar a contener— falla de forma demostrable y reproducible.

## Logros por criterio de éxito (ROADMAP)

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o salir sin registrar | ✓ VERIFIED | `app/components/GameOutcomeDialog.vue` (4 botones: GANADA, 2×PERDIDA, "Salir sin registrar") cableado en `app/pages/[game]/index.vue:556-580` (`onOutcomeRecorded`/`onOutcomeDismiss`) |
| 2 | SC2: el registro guarda resultado, causa, villano, héroe, nombre de cada jugador, fecha, dificultad, nº jugadores, duración y rondas, calculados por el motor | ✓ VERIFIED | `engine/types.ts:200-213` (`GameHistoryEntry`) contiene los 10 campos exigidos; `engine/history.ts:buildHistoryEntry()` los calcula todos a partir de la sesión — duración vía `Date.now() - context.startedAt`, ronda tal cual del motor, nunca tecleados por el usuario. Ver nota HIST-04 más abajo |
| 3a | SC3 (camino feliz): hay pantalla `/historico` que lista de más reciente a más antigua, con borrado tras confirmar | ✓ VERIFIED | `app/pages/historico.vue` + `useGameHistory().cardViews`/`.reload()`/`.remove()`; `sortEntriesByRecency` en `engine/history.ts`; `ConfirmDialog` con `destructive:true` antes de `remove(id)`; comprobado también por el checkpoint humano de `09-08-PLAN.md` |
| 3b | SC3 (garantía de durabilidad): el histórico en localStorage es fuente de verdad — una escritura nunca destruye lo que no sabe interpretar; la pantalla nunca se cae ante una entrada inconsistente | ✗ **FAILED (BLOCKER)** | Reproducido de forma independiente (ver gaps): `appendHistoryEntry`/`removeHistoryEntry` sobrescriben el histórico completo a partir de `loadHistory()`, que trata "formatVersion desconocido"/"JSON corrupto" igual que "vacío" — el siguiente registro o borrado destruye entradas previas sin aviso (CR-03). `buildHistoryCardView` lanza `TypeError` ante `players:[null]`, que sí supera la validación de `isGameHistoryEntry` (CR-01) |
| 4a | SC4 (camino feliz): pantalla `/estadisticas` accesible desde el inicio, muestra % victorias por héroe/villano, estado vacío claro sin histórico | ✓ VERIFIED | `app/pages/estadisticas.vue` + `useGameHistory().statisticsView`; enlace "Estadísticas" en `GameSelectorScreen.vue:91`; `isEmpty` muestra copy dedicado cuando `totalEntries===0`; verificado también por el checkpoint humano |
| 4b | SC4 (robustez): la pantalla no se cae ni produce porcentajes engañosos ante una entrada con tipos inconsistentes | ✗ **FAILED (BLOCKER)** | Reproducido de forma independiente (ver gaps): `aggregateStatistics()` real lanza `TypeError` en `a.name.localeCompare` cuando `villainId`/`heroId` no son string (no validado por `isGameHistoryEntry`) y hay ≥2 filas — rompe la computed que pinta la pantalla entera, no solo una fila |
| 5 | SC5: la pantalla de estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -ril "firestore\|firebase" app/ engine/` → sin resultados; Firestore no existe todavía en el repo (confirmado); `aggregateStatistics` tiene un único parámetro sin rama de red (`engine/statistics.ts`) |

**Score:** 5/7 truths verified (2 FAILED, ambos BLOCKER)

### Nota específica: HIST-04 ("Pendiente" en REQUIREMENTS.md)

`REQUIREMENTS.md` marca `HIST-04` como `[ ]`/"Pendiente" en la tabla de trazabilidad
(línea 191), pero:

- `09-01-PLAN.md` lo declara en `requirements:` y en sus `must_haves.truths` ("HIST-04: la
  entrada contiene resultado, causa, villano, héroe y nombre por jugador, fecha, dificultad,
  nº de jugadores, duración y ronda"), y `09-01-SUMMARY.md` declara
  `requirements-completed: [HIST-02, HIST-03, HIST-04, HIST-05]`.
- `09-05-PLAN.md` también lo declara en `requirements:`, y `09-05-SUMMARY.md` declara
  `requirements-completed: [HIST-04, HIST-07, HIST-08, STAT-02, STAT-03, STAT-05]`.
- El propio `deferred-items.md` de esta fase ya documentó este desajuste como un problema
  conocido (`requirements.mark-complete` no sincroniza la tabla), citando la memoria del
  usuario sobre el mismo problema.

**Verificación directa del código** (no solo de lo que dicen los SUMMARY): `GameHistoryEntry`
(`engine/types.ts:200-213`) tiene los 10 campos exigidos por HIST-04, y `buildHistoryEntry()`
(`engine/history.ts:26-67`) los rellena todos a partir de la sesión en vivo — `result`,
`lossCause`, `villainId`/`villainName`, `players[].heroId/heroName/playerName`, `difficulty`,
`playerCount`, `round`, `durationMs`, `recordedAt` — sin que el usuario teclee ninguno.
`record()` en `app/composables/useGameHistory.ts:205-210` invoca `buildHistoryEntry` y
persiste el resultado vía `appendHistoryEntry`. **Conclusión: HIST-04 está satisfecho en el
código.** El "Pendiente" en `REQUIREMENTS.md` es un defecto de sincronización de la tabla de
trazabilidad, no una funcionalidad ausente — se recomienda corregir la fila a "Satisfecho" al
cerrar esta fase, tal y como ya sugería `deferred-items.md`.

### Artefactos requeridos

| Artefacto | Esperado | Estado | Detalles |
|-----------|----------|--------|----------|
| `engine/history.ts` | `buildHistoryEntry`, `describeLossCause`, `formatEntryDate`, `formatEntryDuration`, `sortEntriesByRecency` | ✓ VERIFIED | Los 5 exports existen y están cubiertos por `engine/__tests__/history.test.ts` |
| `engine/statistics.ts` | `aggregateStatistics` puro, sin fuente de red | ✓ VERIFIED (con defecto, ver gap 3) | Un solo parámetro, sin red; pero `localeCompare` no soporta `name` no-string |
| `app/composables/usePersistedSession.ts` | `HISTORY_KEY='tga:history'`, `loadHistory`, `appendHistoryEntry`, `removeHistoryEntry` | ⚠️ WIRED pero con defecto (ver gaps 1 y 2) | Escritura destructiva ante blob ilegible; validación de entrada incompleta |
| `app/composables/useGameHistory.ts` | `record/reload/remove` + vistas formateadas | ⚠️ WIRED pero con defecto (ver gap 2) | `buildHistoryCardView` no filtra `players` nulos |
| `app/pages/historico.vue` | lista + borrado confirmado | ✓ VERIFIED (camino feliz) | Consume `cardViews`/`isEmpty`/`remove` correctamente |
| `app/pages/estadisticas.vue` | dos tablas + estado vacío | ✓ VERIFIED (camino feliz), ⚠️ WR-01 (estado indefinido con partidas sin héroe/villano) | `isEmpty` solo cubre `totalEntries===0`, no "0 filas con partidas" |
| `app/components/GameOutcomeDialog.vue` | diálogo 4 opciones | ✓ VERIFIED | Sin opción de cancelar y volver a jugar (WR-03, ver Warnings) — deliberado según comentario del código, riesgo real mencionado en la revisión |
| `nuxt.config.ts` | `/historico`, `/estadisticas` en `prerender.routes` | ✓ VERIFIED | `routes: ['/', '/marvel-champions', '/historico', '/estadisticas']` |

### Verificación de enlaces clave

| Desde | Hacia | Vía | Estado | Detalles |
|-------|-------|-----|--------|----------|
| `app/pages/[game]/index.vue` (`onOutcomeRecorded`) | `useGameHistory().record()` | orden `silence()` → `record()` → `finishGame()` | ✓ WIRED | Confirmado línea por línea: `session.value` se lee ANTES de `finishGame()` lo ponga a null (líneas 556-566) |
| `useGameSession.ts` (`start()`) | `SessionContext.startedAt` | `withStartedAt` | ✓ WIRED | `startedAt` se fija una sola vez en `start()` |
| `finishGame()` | `usePersistedSession().clear(gameId)` | `HISTORY_KEY` sin sufijo de `gameId` | ✓ WIRED | `clear()` solo hace `removeRaw(storageKey(gameId))`, nunca toca `tga:history` — HIST-09 confirmado por test y por lectura directa |
| `app/pages/historico.vue` / `estadisticas.vue` | `useGameHistory()` → `usePersistedSession()` | `loadHistory/appendHistoryEntry/removeHistoryEntry` | ⚠️ WIRED con defecto | La cadena de wiring es correcta; el defecto está en la robustez de lectura/escritura en sí (gaps 1-3), no en el cableado |

### Traza de flujo de datos (Nivel 4)

| Artefacto | Variable de datos | Origen | Datos reales | Estado |
|-----------|-------------------|--------|---------------|--------|
| `historico.vue` (`cardViews`) | `entries` (ref) | `useGameHistory().reload()` → `loadHistory()` → `window.localStorage.getItem('tga:history')` | Sí, lee `localStorage` real, no estático | ✓ FLOWING (camino feliz) / ✗ se cae ante entrada `players:[null]` (gap 2) |
| `estadisticas.vue` (`statisticsView`) | `entries` (computed sobre el mismo ref) | Mismo origen | Sí | ✓ FLOWING (camino feliz) / ✗ se cae ante `villainId`/`heroId` no-string (gap 3) |

### Comprobaciones de comportamiento (spot-checks)

Ejecutadas realmente contra el código de producción (no simulación de lo que dice el
SUMMARY), con tests vitest desechables creados y eliminados durante esta verificación:

| Comportamiento | Comando | Resultado | Estado |
|----------------|---------|-----------|--------|
| `buildHistoryCardView` con `players:[null]` (entrada que ya pasó `isGameHistoryEntry`) | test vitest ad-hoc contra `useGameHistory.ts` real | `TypeError: Cannot read properties of null` | ✓ FAIL confirmado (CR-01) |
| `aggregateStatistics` con `villainId` numérico y ≥2 filas de villano | test vitest ad-hoc contra `engine/statistics.ts` real | `TypeError: a.name.localeCompare is not a function` (según orden de inserción) | ✓ FAIL confirmado (CR-02) |
| `appendHistoryEntry` sobre un blob `formatVersion:2` ya existente | test vitest ad-hoc contra `usePersistedSession.ts` real, con `window`/`localStorage` de mentira (mismo patrón que `usePersistedSession.test.ts`) | Escritura "exitosa" (`true`) mientras las 2 entradas previas desaparecen del blob resultante | ✓ FAIL confirmado (CR-03) |
| Suite completa de tests unitarios de la fase | `npx vitest run` | 26 archivos, 641 tests, todos en verde | ✓ PASS (camino feliz cubierto; ninguno de los 3 casos anteriores está cubierto por un test existente) |

Los tres ficheros de test temporales se crearon en `engine/__tests__/` y
`app/composables/__tests__/` y se eliminaron tras confirmar el resultado; `git status` queda
limpio (solo el `GEMINI_QUICK_START.md` sin seguimiento, preexistente y ajeno a esta
verificación).

### Ejecución de sondas (probes)

No se declaran probes de tipo `scripts/*/tests/probe-*.sh` para esta fase (proyecto Nuxt de
contenido estático, no migración/CLI). Paso omitido: `Step 7c: SKIPPED (no hay probes
declarados ni convención scripts/*/tests/probe-*.sh en este proyecto)`.

### Cobertura de requisitos

| Requisito | Plan de origen | Descripción | Estado | Evidencia |
|-----------|-----------------|-------------|--------|-----------|
| HIST-01 | 09-02, 09-07 | Ofrecer registrar el resultado al terminar | ✓ SATISFECHO | `GameOutcomeDialog.vue` cableado |
| HIST-02 | 09-01, 09-02, 09-07 | Ganada/Perdida, siempre se puede salir sin registrar | ✓ SATISFECHO | 4º botón "Salir sin registrar" → `onOutcomeDismiss` |
| HIST-03 | 09-01, 09-02, 09-07 | Causa de derrota (plan principal / héroes derrotados) | ✓ SATISFECHO | 2 botones PERDIDA con causa distinta |
| HIST-04 | 09-01, 09-05 (marcado "Pendiente" en REQUIREMENTS.md — ver nota dedicada) | Guardar los 10 campos exigidos, calculados por el motor | ✓ SATISFECHO EN CÓDIGO (tabla de trazabilidad desincronizada) | `GameHistoryEntry` + `buildHistoryEntry()` |
| HIST-05 | 09-01, 09-07 | Motor expone `startedAt`/ronda | ✓ SATISFECHO | `SessionContext.startedAt`, `withStartedAt` en `useGameSession.ts` |
| HIST-06 | 09-04 | Histórico en localStorage, fuente de verdad | ⚠️ PARCIAL — ver gap 1 (CR-03) | Vive en `tga:history`, pero la escritura puede destruirlo |
| HIST-07 | 09-05, 09-06, 09-08 | Pantalla lista de más reciente a más antigua | ✓ SATISFECHO (camino feliz); ver WR-06 (orden por `localeCompare` de cadena, no por instante) | `sortEntriesByRecency` |
| HIST-08 | 09-05, 09-06, 09-08 | Borrado con confirmación previa | ✓ SATISFECHO | `ConfirmDialog` + `remove(id)` |
| HIST-09 | 09-04, 09-07, 09-08 | «Partida terminada» nunca borra el histórico | ✓ SATISFECHO | `clear(gameId)` no toca `HISTORY_KEY`; test dedicado existente |
| STAT-01 | 09-08 | Pantalla de estadísticas accesible desde el inicio | ✓ SATISFECHO | Enlace en `GameSelectorScreen.vue` |
| STAT-02 | 09-03, 09-05, 09-06 | % victorias por héroe | ✓ SATISFECHO (camino feliz); ver gap 3 (CR-02) | `aggregateStatistics` + `buildStatisticsView` |
| STAT-03 | 09-03, 09-05, 09-06 | % victorias por villano | ✓ SATISFECHO (camino feliz); ver gap 3 (CR-02) | Idem |
| STAT-04 | 09-04, 09-06, 09-08 | Solo localStorage, nunca Firestore | ✓ SATISFECHO | Sin referencias a Firestore/Firebase en el repo |
| STAT-05 | 09-03, 09-05, 09-06, 09-08 | Estado vacío claro sin histórico | ✓ SATISFECHO para histórico vacío; ⚠️ WR-01 para "hay partidas pero 0 filas" | `isEmpty` cubre solo `totalEntries===0` |

Sin requisitos huérfanos: los 14 IDs de fase (HIST-01..09, STAT-01..05) aparecen declarados
en al menos un `requirements:` de PLAN.

### Anti-patrones encontrados

Ningún `TODO`/`FIXME`/`HACK`/`XXX`/`TBD`/"placeholder" en los ficheros clave de la fase
(`engine/history.ts`, `engine/statistics.ts`, `useGameHistory.ts`, `usePersistedSession.ts`,
páginas y componentes nuevos). Los defectos encontrados no son stubs ni código sin terminar:
son huecos reales de validación defensiva en código por lo demás completo y probado.

| Archivo | Línea | Patrón | Severidad | Impacto |
|---------|-------|--------|-----------|---------|
| `app/composables/usePersistedSession.ts` | ~227-247 | Lectura-modificación-escritura que confía en `loadHistory()` para decidir qué reescribir | 🛑 BLOCKER | CR-03 — pérdida silenciosa del histórico completo |
| `app/composables/useGameHistory.ts` | 104, 115-118 | Desreferencia sin guarda de `player.heroId`/`heroName` sobre elementos de `entry.players` | 🛑 BLOCKER | CR-01 — `/historico` se cae ante una entrada con hueco de jugador nulo |
| `app/composables/usePersistedSession.ts` | 96-106 (`isGameHistoryEntry`) | Validación de forma incompleta (solo 7 de 12 campos, sin tipos de id/nombre) | 🛑 BLOCKER (habilita CR-01/CR-02) | Deja pasar datos que rompen ambas pantallas nuevas |
| `engine/statistics.ts` | ~81 | `a.name.localeCompare(b.name,'es')` asume `name` siempre string | 🛑 BLOCKER | CR-02 — `/estadisticas` se cae con `villainId`/`heroId` no-string |
| `app/components/GameOutcomeDialog.vue` | 36-99 | Sin camino de cancelación de una acción destructiva | ⚠️ WARNING | WR-03 — un toque accidental termina la partida sin vuelta atrás |
| `app/pages/[game]/index.vue` | 564-565 | Aviso de fallo de guardado cuando no hubo escritura (`session.value` nulo) | ⚠️ WARNING | WR-04 — diagnóstico falso al grupo |
| `app/pages/estadisticas.vue` | `isEmpty` | No cubre "hay partidas, pero 0 filas" | ⚠️ WARNING | WR-01 — pantalla sin tablas ni estado vacío en ese caso |
| `engine/history.ts` | 115-117 | `sortEntriesByRecency` usa `localeCompare` de cadena en vez de `Date.parse` | ⚠️ WARNING | WR-06 — orden depende del ICU del dispositivo y de que `recordedAt` sea siempre fecha válida |
| `engine/history.ts` | 60 | `id` generado con `Math.random()` sin garantía de unicidad/longitud | ⚠️ WARNING | WR-08 — colisión borraría varias partidas a la vez |

## Verificación humana requerida

Ninguna verificación humana adicional pendiente para esta fase: el checkpoint bloqueante de
`09-08-PLAN.md` (11 pasos, ciclo completo: registrar, no registrar, listar, borrar, agregar,
abrir sin red) ya se ejecutó y fue aprobado explícitamente por el usuario ("aprobado",
2026-09-11). Ese checkpoint es evidencia real del camino feliz, pero — como el propio
enunciado de esta verificación pedía comprobar — **no ejercitó ningún caso de dato corrupto
ni de fallo de almacenamiento**; los tres BLOCKER de esta verificación son precisamente casos
que ese checkpoint no podía descubrir por diseño (requieren un estado de `localStorage` que
un humano jugando una partida normal no puede producir).

No se añaden nuevos items de verificación humana: los tres gaps son reproducibles y
corregibles de forma determinista en código; no dependen de juicio subjetivo humano.

## Resumen de gaps

Los tres BLOCKER comparten una causa raíz común: **la frontera de validación de
`app/composables/usePersistedSession.ts` (`isGameHistoryEntry`) es más laxa que lo que el
resto del sistema (motor `engine/statistics.ts`, y la propia promesa de D-13) asume**. Un
dato que supera esa frontera con una forma parcialmente inválida puede (a) tumbar
`/historico`, (b) tumbar `/estadisticas`, y (c) ser destruido — junto con todo lo demás — en
la siguiente escritura. Los tres son corregibles con cambios acotados y ya vienen con
propuesta de fix concreta en `09-REVIEW.md`, que esta verificación confirma como certera
tras reproducir cada uno de forma independiente contra el código real.

No se han encontrado gaps diferidos a fases posteriores: la Fase 10 (Respaldo en Firestore)
solo añade sincronización remota sobre `appendHistoryEntry` ya existente y su alcance
declarado excluye explícitamente tocar la robustez de lectura/escritura local.

---

_Verificado: 2026-09-11_
_Verificador: Claude (gsd-verifier)_
