---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-12T14:00:00Z
status: gaps_found
score: 5/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "CR-01 (ronda 1): entrada con players:[null]/[{}] tumbaba /historico (TypeError en buildHistoryCardView)"
    - "CR-02 (ronda 1): entrada con villainId/heroId no-string tumbaba /estadisticas (TypeError en localeCompare)"
    - "CR-03 (ronda 1): appendHistoryEntry/removeHistoryEntry destruían el histórico completo ante un blob formatVersion desconocido o JSON corrupto"
  gaps_remaining: []
  regressions:
    - "CR-01 (nuevo, ronda 2): appendHistoryEntry no valida la entrada que escribe con el mismo predicado que loadHistory usa para leerla — una partida puede registrarse con confirmación de éxito y quedar invisible para siempre"
gaps:
  - truth: "SC2: el registro guardado incluye resultado, causa, villano, héroe y nombre de cada jugador, fecha, dificultad, nº de jugadores, duración y nº de rondas — de forma FIABLE, no solo en el caso feliz"
    status: failed
    reason: >
      `appendHistoryEntry` (app/composables/usePersistedSession.ts:293-303) escribe
      CUALQUIER objeto que se le pase y devuelve `writeRaw(...)` sin comprobar en ningún
      momento que la entrada supere `isGameHistoryEntry` — el predicado que la propia
      Fase 9 (cierre 09-09) endureció para decidir qué se puede volver a LEER. Reproducido
      de forma independiente en esta verificación (test vitest desechable, creado y
      eliminado, `git status` limpio tras la prueba): una entrada con
      `difficulty: undefined` y `playerCount: undefined` se escribe con éxito
      (`appendHistoryEntry` devuelve `true`) pero `loadHistory()` inmediatamente después
      devuelve `[]` — la entrada nunca vuelve a aparecer.
      Cadena de alcanzabilidad verificada línea por línea: `isPersistedPosition`
      (usePersistedSession.ts:78-87) solo exige que `context` sea un objeto, sin mirar
      `difficulty`/`playerCount`; `resume()` (engine/persistence.ts, rama `resumed`,
      línea ~88) propaga `persisted.context` SIN pasar por `isValidContext` (que solo se
      aplica en la rama `content-changed`, línea 63); `buildHistoryEntry`
      (engine/history.ts:67-68) copia `context.difficulty`/`context.playerCount` tal
      cual; `JSON.stringify` elimina las claves `undefined`; el grupo ve «✓ Partida
      registrada» sobre un dato que ya está perdido. Esto contradice directamente el
      contrato D-03 que el propio fichero declara («el grupo tiene que enterarse si el
      dispositivo no dejó escribir») — aquí SÍ dejó escribir, y aun así el dato se pierde.
    artifacts:
      - path: "app/composables/usePersistedSession.ts"
        issue: "appendHistoryEntry (líneas 293-303) no invoca isGameHistoryEntry antes de escribir; isPersistedPosition (78-87) no valida la forma de context"
      - path: "engine/persistence.ts"
        issue: "resume() rama 'resumed' (línea ~88) no pasa persisted.context por isValidContext, a diferencia de contentChangedFallback (línea 63)"
      - path: "engine/history.ts"
        issue: "buildHistoryEntry (líneas 67-69) copia context.difficulty/playerCount/round sin normalizar ni acotar a un valor finito/válido"
    missing:
      - "appendHistoryEntry debe devolver false (y no escribir) cuando la entrada no supera isGameHistoryEntry — una línea, cierra el círculo lectura=escritura"
      - "Normalizar difficulty/playerCount/round en buildHistoryEntry con el mismo criterio defensivo que ya usa durationMs (líneas 52-57), en vez de propagar el hueco"
      - "Test: 'appendHistoryEntry de una entrada sin difficulty devuelve false y no escribe nada' y 'una entrada construida desde context: {} sobrevive a un ciclo record() → loadHistory()'"
  - truth: "SC3 (garantía de durabilidad): el histórico en localStorage es fuente de verdad — ninguna partida se pierde de forma silenciosa ni con una confirmación de éxito falsa"
    status: failed
    reason: >
      Mismo hallazgo que el gap anterior, visto desde el ángulo de SC3: la ronda 1 de esta
      verificación encontró que una ESCRITURA podía destruir entradas previas (CR-03,
      cerrado correctamente en 09-09/09-10: ahora un blob `unreadable` aborta la escritura
      sin machacarlo). Pero el cierre de CR-03 solo endureció el lado de LECTURA
      (`isGameHistoryEntry`) sin endurecer el lado de ESCRITURA (`appendHistoryEntry`), así
      que ha aparecido el gap simétrico: una entrada que la propia app construye a partir
      de un `context` persistido corrupto/parcial se escribe "con éxito" y jamás vuelve a
      leerse — no es destrucción del resto del histórico, pero SÍ es pérdida permanente y
      silenciosa de la partida que se acaba de jugar, con confirmación positiva encima. La
      garantía "vive en localStorage como fuente de verdad" exige que lo que se registra
      con éxito sea recuperable; hoy no lo es en este escenario.
    artifacts:
      - path: "app/composables/usePersistedSession.ts"
        issue: "appendHistoryEntry no comparte predicado con loadHistory (ver gap SC2 para detalle idéntico)"
    missing:
      - "Igual que el gap de SC2 — es la misma causa raíz, doble impacto (SC2 y SC3)"
deferred: []
human_verification: []
---

# Fase 9: Histórico y estadísticas — Informe de verificación (2ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-12
**Estado:** gaps_found (1 BLOCKER nuevo; los 3 BLOCKER de la ronda anterior están cerrados)
**Re-verificación:** Sí — tras el cierre de gaps de los planes 09-09, 09-10 y 09-11

## Resumen ejecutivo

Los tres BLOCKER de la verificación anterior (CR-01/CR-02/CR-03 de la 1ª ronda: entrada con
`players` nulos tumbando `/historico`, `villainId`/`heroId` no-string tumbando
`/estadisticas`, y una escritura leer-modificar-escribir destruyendo el histórico completo
ante un blob ilegible) están **genuinamente cerrados**, verificado contra el código actual
(no contra los SUMMARY): `isHistoryPlayerEntry` + `isGameHistoryEntry` endurecidos
(`app/composables/usePersistedSession.ts:96-133`), `String(...)` explícito en
`engine/statistics.ts:99/105`, y `readEnvelope()` (`usePersistedSession.ts:194-220`) que
distingue `empty`/`ok`/`unreadable` y aborta la escritura ante un blob ilegible en vez de
machacarlo. Los cierres vienen acompañados de tests de regresión dedicados
(`usePersistedSession.test.ts:313-407`, `statistics.test.ts:163-219`) y la suite completa
sigue en verde: `npx vitest run` → 26 ficheros / 665 tests, reproducido en esta verificación.

Sin embargo, `09-REVIEW.md` (2ª ronda, ejecutada tras los tres cierres) encontró un BLOCKER
**nuevo**, y esta verificación lo ha reproducido de forma independiente contra el código de
producción real (test vitest desechable, creado y eliminado, `git status` limpio salvo el
fichero preexistente sin seguir `GEMINI_QUICK_START.md`, ajeno a esta fase): el cierre de
CR-03 endureció el predicado de **lectura** (`isGameHistoryEntry`) pero `appendHistoryEntry`
sigue escribiendo sin comprobar que lo que persiste supere ese mismo predicado. Resultado:
una partida jugada a partir de una sesión reanudada con `context` parcial (`difficulty`/
`playerCount` ausentes — alcanzable porque `isPersistedPosition` no valida esos dos campos y
la rama `resumed` de `engine/persistence.ts` no pasa por `isValidContext`) se guarda con
**«✓ Partida registrada»** y desaparece para siempre en el siguiente `loadHistory()`. Es el
mismo dato irreconstruible que CR-03 protegía, perdido ahora por el otro extremo del mismo
circuito, con una confirmación de éxito falsa encima — el inverso exacto del contrato D-03
que este mismo fichero declara por escrito.

**Conclusión: el objetivo de la fase sigue sin considerarse plenamente alcanzado.** El
camino feliz (registrar, listar, borrar, agregar estadísticas, todo sin red) funciona y está
bien probado, incluyendo ahora los casos de dato corrupto en LECTURA que motivaron la ronda
anterior. Pero la garantía central de la fase — que lo que el grupo ve confirmado como
«registrado» efectivamente lo está — no se sostiene en un escenario reproducible y
verificado independientemente en esta ronda.

## Logros por criterio de éxito (ROADMAP)

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o salir sin registrar | ✓ VERIFIED | `app/components/GameOutcomeDialog.vue` (4 botones) cableado en `app/pages/[game]/index.vue` (`onOutcomeRecorded`/`onOutcomeDismiss`); sin cambios respecto a la ronda anterior |
| 2 | SC2: el registro guarda resultado, causa, villano, héroe, nombre de cada jugador, fecha, dificultad, nº jugadores, duración y rondas, calculados por el motor — de forma FIABLE | ✗ **FAILED (BLOCKER nuevo)** | `GameHistoryEntry` tiene los 10 campos y `buildHistoryEntry()` los rellena en el camino feliz, pero `appendHistoryEntry` no valida antes de escribir: reproducido de forma independiente que una entrada con `difficulty`/`playerCount` `undefined` se "guarda" y desaparece para siempre (ver gaps) |
| 3a | SC3 (camino feliz): hay pantalla `/historico` que lista de más reciente a más antigua, con borrado tras confirmar | ✓ VERIFIED | `app/pages/historico.vue` + `useGameHistory().cardViews`/`.reload()`/`.remove()`; checkpoint humano de `09-08-PLAN.md` aprobado el 2026-09-11 |
| 3b | SC3 (garantía de durabilidad): el histórico en localStorage es fuente de verdad — lo confirmado como registrado es recuperable, y una escritura nunca destruye lo que no sabe interpretar | ✗ **FAILED (BLOCKER nuevo)** | CR-03 (destrucción del resto del histórico) cerrado y confirmado; pero apareció el gap simétrico (ver gap SC2): la propia entrada nueva puede perderse en silencio con confirmación positiva |
| 4a | SC4 (camino feliz): pantalla `/estadisticas` accesible desde el inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | `app/pages/estadisticas.vue` + `useGameHistory().statisticsView`; `isEmpty` ahora cubre también "hay partidas pero 0 filas" (WR-01 cerrado por 09-11) |
| 4b | SC4 (robustez): la pantalla no se cae ni produce porcentajes engañosos ante una entrada con tipos inconsistentes | ✓ VERIFIED | CR-02 cerrado: `engine/statistics.ts:99/105` coerciona con `String(...)`; confirmado con 5 tests de ambos órdenes de inserción (`statistics.test.ts:163-219`); el residual WR-01 de `09-REVIEW.md` (`undefined !== null` en `useGameHistory.ts:113/126`) es hoy inalcanzable en producción porque `isHistoryPlayerEntry` ya rechaza un `heroId` ausente antes de llegar aquí — queda como defensa en profundidad incompleta, no como fallo observable |
| 5 | SC5: la pantalla de estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -ril "firestore\|firebase" app/ engine/` → sin resultados; Firestore no existe todavía en el repo; `aggregateStatistics` tiene un único parámetro sin rama de red |

**Score:** 5/7 truths verified (2 FAILED, ambos BLOCKER — mismos dos criterios de éxito que la ronda anterior, causa raíz distinta y ya reparada la anterior)

### Artefactos requeridos

| Artefacto | Esperado | Estado | Detalles |
|-----------|----------|--------|----------|
| `engine/history.ts` | `buildHistoryEntry`, `describeLossCause`, `formatEntryDate`, `formatEntryDuration`, `sortEntriesByRecency` | ✓ VERIFIED (con defecto, ver gap) | Los 5 exports existen y están cubiertos por tests; `buildHistoryEntry` no normaliza `difficulty`/`playerCount`/`round` ante un `context` parcial |
| `engine/statistics.ts` | `aggregateStatistics` puro, sin fuente de red, robusto ante tipos inconsistentes | ✓ VERIFIED | CR-02 cerrado: `String(...)` en `extractHeroIds`/`extractVillainId` |
| `app/composables/usePersistedSession.ts` | `HISTORY_KEY`, `loadHistory`, `appendHistoryEntry`, `removeHistoryEntry`, validación simétrica lectura/escritura | ⚠️ WIRED con defecto (ver gaps) | Lectura endurecida (CR-01/CR-02/CR-03 cerrados); escritura (`appendHistoryEntry`) sigue sin validar contra el mismo predicado — BLOCKER nuevo |
| `app/composables/useGameHistory.ts` | `record/reload/remove` + vistas formateadas, robustas ante datos parciales | ✓ VERIFIED (con defecto menor no bloqueante) | CR-01 (ronda 1) cerrado con filtro `!== null`; WR-01 (`!== undefined` ausente) es inalcanzable hoy en producción, ver nota en la tabla de truths |
| `app/pages/historico.vue` | lista + borrado confirmado | ✓ VERIFIED | Sin cambios relevantes respecto a la ronda anterior |
| `app/pages/estadisticas.vue` | dos tablas + estado vacío correcto en ambos casos | ✓ VERIFIED | `isEmpty` ahora cubre "0 filas con partidas" (WR-01 ronda 1 cerrado) |
| `app/components/GameOutcomeDialog.vue` | diálogo 4 opciones | ✓ VERIFIED (con warnings de accesibilidad no bloqueantes, ver abajo) | Sin cambios de fondo |
| `nuxt.config.ts` | `/historico`, `/estadisticas` en `prerender.routes` | ✓ VERIFIED | `routes: ['/', '/marvel-champions', '/historico', '/estadisticas']` |

### Verificación de enlaces clave

| Desde | Hacia | Vía | Estado | Detalles |
|-------|-------|-----|--------|----------|
| `app/pages/[game]/index.vue` (`onOutcomeRecorded`) | `useGameHistory().record()` | orden `silence()` → `record()` → `finishGame()` | ✓ WIRED | Sin cambios; `session.value` se lee antes de que `finishGame()` lo ponga a null |
| `record()` (`useGameHistory.ts`) | `usePersistedSession().appendHistoryEntry()` | escritura directa de `GameHistoryEntry` | ⚠️ WIRED pero sin validar (BLOCKER) | La cadena de llamadas es correcta; el defecto es que el eslabón final no verifica que lo escrito sea legible después |
| `engine/persistence.ts` (`resume()`, rama `resumed`) | `SessionContext` restaurado | `persisted.context` propagado tal cual | ⚠️ WIRED sin validar | A diferencia de `contentChangedFallback`, esta rama no pasa por `isValidContext` — es el origen de la entrada malformada que llega a `buildHistoryEntry` |
| `finishGame()` | `usePersistedSession().clear(gameId)` | `HISTORY_KEY` sin sufijo de `gameId` | ✓ WIRED | Sin cambios; HIST-09 sigue confirmado |
| `app/pages/historico.vue` / `estadisticas.vue` | `useGameHistory()` → `usePersistedSession()` | `loadHistory/appendHistoryEntry/removeHistoryEntry` | ✓ WIRED (lectura robusta) | La robustez de LECTURA está cerrada; el defecto vive en la frontera de ESCRITURA, aguas arriba de estas dos pantallas |

### Traza de flujo de datos (Nivel 4)

| Artefacto | Variable de datos | Origen | Datos reales | Estado |
|-----------|-------------------|--------|---------------|--------|
| `historico.vue` (`cardViews`) | `entries` (ref) | `useGameHistory().reload()` → `loadHistory()` → `window.localStorage.getItem('tga:history')` | Sí, lee `localStorage` real | ✓ FLOWING — robusto ante entradas corruptas ya presentes en disco (CR-01/CR-02 cerrados) |
| `estadisticas.vue` (`statisticsView`) | `entries` (computed sobre el mismo ref) | Mismo origen | Sí | ✓ FLOWING — robusto ante tipos inconsistentes (CR-02 cerrado) |
| `record()` → `appendHistoryEntry` | `GameHistoryEntry` construido en el momento de terminar la partida | `buildHistoryEntry(session, outcome, now, names)` | Puede ser una entrada que NUNCA vuelve a fluir hacia las dos vistas de arriba (ver gap SC2/SC3) | ✗ **DISCONNECTED en el caso `context` parcial** — el dato se escribe pero no vuelve a leerse jamás |

### Comprobaciones de comportamiento (spot-checks)

Ejecutadas contra el código de producción real en esta verificación (no simulación de lo que
dicen los SUMMARY ni el `09-REVIEW.md`):

| Comportamiento | Comando | Resultado | Estado |
|----------------|---------|-----------|--------|
| `appendHistoryEntry` con entrada `{difficulty: undefined, playerCount: undefined, ...}` (simula un `context` de sesión reanudada sin validar) | test vitest ad-hoc desechable contra `usePersistedSession.ts` real, `localStorage` en memoria | `appendHistoryEntry` devuelve `true`; `loadHistory()` inmediatamente después devuelve `[]` | ✓ FAIL confirmado — BLOCKER nuevo reproducido de forma independiente |
| Suite completa de tests unitarios de la fase | `npx vitest run` | 26 archivos, 665 tests, todos en verde | ✓ PASS (camino feliz + regresión de CR-01/CR-02/CR-03 de la ronda 1 cubiertos; el caso nuevo no está cubierto por ningún test existente) |
| `npm run build` (nuxt build) | — | Verde | ✓ PASS (evidencia ya recogida por el orquestador) |
| `npm run e2e` (Playwright, build real `nuxt generate`) | — | 36/36 specs en verde, incluyendo `/historico` y `/estadisticas` con la red cortada | ✓ PASS (evidencia ya recogida por el orquestador) |

El fichero de test temporal se creó en `app/composables/__tests__/__repro-cr01-write.test.ts`
y se eliminó tras confirmar el resultado; `git status` queda limpio (solo
`GEMINI_QUICK_START.md` sin seguimiento, preexistente y ajeno a esta verificación).

### Ejecución de sondas (probes)

No se declaran probes de tipo `scripts/*/tests/probe-*.sh` para esta fase (proyecto Nuxt de
contenido estático, no migración/CLI). Paso omitido: `Step 7c: SKIPPED (no hay probes
declarados ni convención scripts/*/tests/probe-*.sh en este proyecto)`.

### Cobertura de requisitos

| Requisito | Plan de origen | Descripción | Estado | Evidencia |
|-----------|-----------------|-------------|--------|-----------|
| HIST-01 | 09-02, 09-07 | Ofrecer registrar el resultado al terminar | ✓ SATISFECHO | Sin cambios |
| HIST-02 | 09-01, 09-02, 09-07 | Ganada/Perdida, siempre se puede salir sin registrar | ✓ SATISFECHO | Sin cambios |
| HIST-03 | 09-01, 09-02, 09-07 | Causa de derrota (plan principal / héroes derrotados) | ✓ SATISFECHO | Sin cambios |
| HIST-04 | 09-01, 09-05 | Guardar los 10 campos exigidos, calculados por el motor | ⚠️ PARCIAL | Campos presentes en el tipo y en el camino feliz; en el escenario de `context` parcial reanudado, `difficulty`/`playerCount` pueden faltar y la entrada se pierde en silencio (ver gap) — trazabilidad ya sincronizada a "Satisfecho" en `REQUIREMENTS.md`, este hallazgo la matiza |
| HIST-05 | 09-01, 09-07 | Motor expone `startedAt`/ronda | ✓ SATISFECHO | Sin cambios |
| HIST-06 | 09-04, 09-09, 09-10 | Histórico en localStorage, fuente de verdad | ⚠️ PARCIAL — ver gap SC3 | Destrucción del resto del histórico (CR-03) cerrada; pérdida silenciosa de la entrada nueva con confirmación de éxito (BLOCKER nuevo) sigue abierta |
| HIST-07 | 09-05, 09-06, 09-08, 09-10 | Pantalla lista de más reciente a más antigua | ✓ SATISFECHO | `sortEntriesByRecency` por instante (`Date.parse`), WR-06 ronda 1 cerrado |
| HIST-08 | 09-05, 09-06, 09-08, 09-09 | Borrado con confirmación previa | ✓ SATISFECHO | Sin cambios de fondo |
| HIST-09 | 09-04, 09-07, 09-08 | «Partida terminada» nunca borra el histórico | ✓ SATISFECHO | Sin cambios |
| STAT-01 | 09-08 | Pantalla de estadísticas accesible desde el inicio | ✓ SATISFECHO | Sin cambios |
| STAT-02 | 09-03, 09-05, 09-06 | % victorias por héroe | ✓ SATISFECHO | CR-02 cerrado |
| STAT-03 | 09-03, 09-05, 09-06 | % victorias por villano | ✓ SATISFECHO | CR-02 cerrado |
| STAT-04 | 09-04, 09-06, 09-08 | Solo localStorage, nunca Firestore | ✓ SATISFECHO | Sin referencias a Firestore/Firebase en el repo |
| STAT-05 | 09-03, 09-05, 09-06, 09-08, 09-11 | Estado vacío claro sin histórico | ✓ SATISFECHO | WR-01 ronda 1 cerrado (cubre también "hay partidas pero 0 filas") |

Sin requisitos huérfanos: los 14 IDs de fase (HIST-01..09, STAT-01..05) aparecen declarados
en al menos un `requirements:` de PLAN, y la tabla de trazabilidad de `REQUIREMENTS.md` ya
está sincronizada (todos `[x]`/"Satisfecho"), corrigiendo el desajuste que la ronda anterior
había señalado para HIST-04.

### Anti-patrones encontrados

Ningún `TODO`/`FIXME`/`HACK`/`XXX`/`TBD`/"placeholder" en los ficheros clave de la fase. Los
defectos encontrados no son código sin terminar: son huecos de validación defensiva
asimétrica (un lado del contrato se endureció, el otro no) en código por lo demás completo y
probado.

| Archivo | Línea | Patrón | Severidad | Impacto |
|---------|-------|--------|-----------|---------|
| `app/composables/usePersistedSession.ts` | 293-303 (`appendHistoryEntry`) | Escritura que no se somete al mismo predicado (`isGameHistoryEntry`) que la lectura (`loadHistory`) aplica sobre el mismo dato | 🛑 BLOCKER (nuevo) | Pérdida silenciosa y permanente de la partida recién jugada, con confirmación de éxito falsa |
| `engine/persistence.ts` | ~88 (rama `resumed` de `resume()`) | `persisted.context` se propaga sin pasar por `isValidContext`, a diferencia de `contentChangedFallback` (línea 63) | 🛑 BLOCKER (habilita el anterior) | Origen concreto del `context` parcial que alcanza `buildHistoryEntry` |
| `app/composables/usePersistedSession.ts` | 125-126, 131 (`isGameHistoryEntry`) | `typeof === 'number'` acepta `NaN`/`Infinity` en `round`/`playerCount`/`durationMs` | ⚠️ WARNING (WR-03 de `09-REVIEW.md`) | «Hasta la ronda NaN» en pantalla si ese dato llegara a superar la frontera |
| `app/composables/usePersistedSession.ts` | 274, 293-295, 319-321 | Un blob `unreadable` bloquea el registro para siempre sin ninguna vía de recuperación en la interfaz, y con un diagnóstico de fallo genérico que no es la causa real | ⚠️ WARNING (WR-02 de `09-REVIEW.md`) | No es pérdida de datos (mejora real sobre CR-03), pero sí inutilización silenciosa sin diagnóstico honesto |
| `app/components/GameOutcomeDialog.vue` | 36-98 | Sin camino de cancelación de una acción destructiva, sin `Escape`, sin trampa de foco | ⚠️ WARNING (WR-05 de `09-REVIEW.md`, abierto desde la ronda 1) | Un toque accidental termina la partida sin vuelta atrás |
| `app/components/HistorySavedNotice.vue` | 16-42 | Sin `role="status"`/`aria-live`; interacción con `h-dvh` en las pantallas nuevas | ⚠️ WARNING (WR-06 de `09-REVIEW.md`, abierto desde la ronda 1) | Confirmación de registro invisible para lectores de pantalla; posible desbordamiento visual |
| `engine/history.ts` | 102-109 (`formatEntryDuration`) | Nunca produce «1 h» a secas (siempre «1 h 0 min»); un negativo residual no se filtra | ⚠️ WARNING (WR-07 de `09-REVIEW.md`, abierto desde la ronda 1) | Cosmético, no bloqueante |
| `app/composables/useGameHistory.ts` | 113, 126 | `!== null` sin `!== undefined`, a diferencia del gemelo en `engine/statistics.ts` | ℹ️ INFO (WR-01 de `09-REVIEW.md`) | Hoy inalcanzable en producción porque la frontera de storage ya bloquea el caso; defensa en profundidad incompleta si esa frontera cambiara |

## Verificación humana requerida

Ninguna. El checkpoint bloqueante de `09-08-PLAN.md` (aprobado el 2026-09-11) ya cubrió el
camino feliz completo. El BLOCKER nuevo de esta ronda es determinista y reproducible en
código (se ha reproducido de forma independiente con un test desechable en esta misma
verificación); no depende de juicio subjetivo humano ni de comportamiento visual/tiempo
real — es corregible con un cambio acotado y ya viene con propuesta de fix concreta en
`09-REVIEW.md`.

## Resumen de gaps

Un único BLOCKER, con dos manifestaciones sobre los criterios de éxito (SC2 y SC3): la
frontera de validación de `app/composables/usePersistedSession.ts` se endureció en la
ronda anterior solo por el lado de LECTURA (`isGameHistoryEntry`, usado por `loadHistory`),
dejando sin tocar el lado de ESCRITURA (`appendHistoryEntry`, que persiste lo que le pasen
sin comprobar nada). El origen concreto del dato que explota esta asimetría es
`engine/persistence.ts`, cuya rama `resumed` de `resume()` no valida `persisted.context`
con el mismo criterio que sí aplica su rama hermana `content-changed`
(`contentChangedFallback`). El resultado observable es el inverso exacto del contrato D-03
que la propia fase declara: el grupo ve «✓ Partida registrada» sobre una partida que
`loadHistory()` rechazará para siempre, sin ninguna vía en la interfaz para saberlo o
recuperarla.

El fix propuesto en `09-REVIEW.md` (CR-01, 2ª ronda) es acotado: someter `appendHistoryEntry`
al mismo predicado `isGameHistoryEntry` que ya usa `loadHistory`, y normalizar
`difficulty`/`playerCount`/`round` en `buildHistoryEntry` con el mismo criterio defensivo que
ya usa `durationMs`. No requiere replantear el diseño de la fase ni tocar Firestore (que no
existe todavía en el repo, confirmado — SC5 sigue trivialmente cierto).

No se han encontrado gaps diferidos a fases posteriores: la Fase 10 (Respaldo en Firestore)
solo añade sincronización remota sobre `appendHistoryEntry` ya existente, y corregir su
frontera de validación es una precondición razonable antes de sincronizar ese dato a un
backend remoto, no un trabajo que quepa posponer a esa fase.

---

_Verificado: 2026-09-12_
_Verificador: Claude (gsd-verifier)_
