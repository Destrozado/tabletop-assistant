---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-12T15:00:00Z
status: gaps_found
score: 5/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "CR-01 (ronda 2): appendHistoryEntry no validaba la entrada que escribía con el mismo predicado que loadHistory usa para leerla — cerrado por 09-12, verificado de forma independiente en esta ronda (test desechable: una entrada construida desde context:{}/round:NaN sobrevive al ciclo record()→loadHistory())"
  gaps_remaining: []
  regressions:
    - "CR-01 (nuevo, ronda 3): readRaw colapsa 'clave ausente', 'sin window' y 'getItem lanzó' en el mismo undefined; readEnvelope traduce ese undefined a {kind:'empty'}; appendHistoryEntry reconstruye el envoltorio desde previous=[] — un fallo de LECTURA transitorio (modo privado, cuota, contexto restringido) destruye el histórico completo y appendHistoryEntry devuelve true (falso ✓ 'Partida registrada')"
    - "CR-02 (nuevo, ronda 3): heroNames es un objeto literal ({}), así que heroNames[heroId] resuelve por la cadena de prototipos; un heroId de valor 'constructor' (alcanzable porque resolvePlayerSlots solo exige string no vacío, sin contrastar contra el catálogo) produce un heroName de tipo function, la entrada no supera isHistoryPlayerEntry, appendHistoryEntry devuelve false, y finishGame() destruye igualmente la sesión — el grupo ve un aviso de fallo de almacenamiento falso y pierde la partida jugada"
gaps:
  - truth: "SC2: el registro guardado incluye resultado, causa, villano, héroe y nombre de cada jugador, fecha, dificultad, nº de jugadores, duración y nº de rondas — de forma FIABLE ante datos de localStorage manipulados o parciales"
    status: failed
    reason: >
      Reproducido de forma independiente en esta verificación (test vitest desechable,
      creado y eliminado; `git status` limpio tras la prueba salvo
      `GEMINI_QUICK_START.md`, preexistente y ajeno a esta fase):
      `app/composables/useGameHistory.ts:63` construye `heroNames` como objeto literal
      (`const heroNames: Record<string, string> = {}`). `engine/history.ts:41` lo indexa
      directamente: `names.heroNames[slot.heroId] ?? null`. Un `heroId` de valor
      `'constructor'` (alcanzable: `resolvePlayerSlots`, `engine/selection.ts:63`, solo
      exige `typeof entry.heroId === 'string' && entry.heroId.length > 0`, sin contrastar
      contra el catálogo de héroes — y el propio proyecto declara `localStorage`
      manipulable desde DevTools como dentro de su modelo de amenaza,
      `engine/__tests__/persistence.test.ts:181-183`) resuelve a través de
      `Object.prototype`: el valor devuelto es la función `Object`, no `undefined`, así
      que el `?? null` nunca entra. `heroName` queda con `typeof === 'function'`.
      `isHistoryPlayerEntry` (`usePersistedSession.ts:99-100`) exige
      `heroName === null || typeof heroName === 'string'`, así que la entrada entera es
      rechazada por `isGameHistoryEntry` vía `candidate.players.every(isHistoryPlayerEntry)`.
      `appendHistoryEntry` devuelve `false`; `notifyHistorySaved(false)` pinta un aviso que
      dice literalmente que el dispositivo no dejó escribir (modo privado/cuota) — un
      diagnóstico falso, la causa real es un choque de nombre de propiedad, no de
      almacenamiento — y `finishGame()` (`[game]/index.vue:574`) se ejecuta de todos modos,
      sin condicionarse al resultado de `record()`: la sesión se destruye y la partida
      jugada es irrecuperable.
    artifacts:
      - path: "app/composables/useGameHistory.ts"
        issue: "heroNames (línea 63) es un objeto literal en vez de Object.create(null), así que su indexado hereda de Object.prototype"
      - path: "engine/history.ts"
        issue: "buildHistoryEntry (línea 41) indexa names.heroNames[slot.heroId] sin comprobar Object.hasOwn antes de aceptar el resultado como heroName"
      - path: "app/pages/[game]/index.vue"
        issue: "finishGame() (línea 574) se invoca incondicionalmente tras record(), sin distinguir un resultado 'guardado' de uno 'rechazado por forma de dato' — cualquier false destruye la sesión igual"
    missing:
      - "heroNames debe construirse con Object.create(null) (o Map) en useGameHistory.ts:63"
      - "buildHistoryEntry debe usar Object.hasOwn(names.heroNames, slot.heroId) antes de leer el valor, y tratar cualquier resultado no-string como ausencia de nombre congelado (null), nunca como el heroName literal"
      - "Test: 'un heroId igual a constructor/toString/valueOf/hasOwnProperty/__proto__ no produce un heroName de tipo function' cubriendo tanto useGameHistory.ts como engine/history.ts"
  - truth: "SC3 (garantía de durabilidad): el histórico en localStorage es fuente de verdad — ninguna partida se pierde de forma silenciosa ni con una confirmación de éxito falsa, ni siquiera ante un fallo transitorio de LECTURA del propio storage"
    status: failed
    reason: >
      Reproducido de forma independiente en esta verificación (test vitest desechable,
      creado y eliminado; `git status` limpio salvo el fichero preexistente y ajeno ya
      señalado): `readRaw` (`usePersistedSession.ts:148-156`) colapsa tres situaciones
      distintas en un único valor `undefined` — clave ausente, `window` inexistente (SSR),
      Y `window.localStorage.getItem` lanzando (modo privado, cuota, contexto
      restringido). `readEnvelope` (`:214-228`) traduce ese `undefined` a
      `{ kind: 'empty' }` en la línea 216, exactamente el mismo camino que toma una clave
      genuinamente ausente. `appendHistoryEntry` (`:301-322`) trata `'empty'` como «no
      hay histórico todavía» y reconstruye el envoltorio con `previous = []` (línea 316).
      Secuencia reproducida contra el módulo real con un `localStorage` falso cuyo
      `getItem` lanza una única vez: dos partidas ya registradas (`appendHistoryEntry`
      devuelto `true` para ambas, confirmadas presentes vía `loadHistory()`) desaparecen
      por completo tras una tercera llamada a `appendHistoryEntry` que coincide con el
      fallo transitoro de lectura; esa tercera llamada devuelve `true` (el `writeRaw`
      posterior si funciona) y `loadHistory()` a partir de ahí solo devuelve la entrada
      más reciente. El propio comentario del código (`:209-211`) declara esta
      colapsación como intencional y segura — es la premisa falsa exacta que CR-03
      (ronda 1) se propuso eliminar, pero solo lo hizo para "no sé interpretar el JSON",
      no para "no he podido leer el storage".
    artifacts:
      - path: "app/composables/usePersistedSession.ts"
        issue: "readRaw (148-156) no distingue 'clave ausente' de 'getItem lanzó'; readEnvelope (214-228) trata ambos como 'empty', autorizando a appendHistoryEntry (301-322) a reconstruir el envoltorio con previous=[] sobre un histórico que en realidad seguía existiendo en disco"
    missing:
      - "readRaw debe devolver un resultado discriminado (p. ej. {kind:'absent'|'value'|'unreadable'}) en vez de undefined, de modo que un getItem que lanza NUNCA autorice a appendHistoryEntry/removeHistoryEntry a tratar el histórico como vacío"
      - "readEnvelope debe propagar ese 'unreadable' de lectura exactamente igual que ya propaga el 'unreadable' de JSON corrupto — solo 'absent' (clave realmente ausente) debe seguir produciendo 'empty'"
      - "Test de regresión: getItem que lanza UNA vez + setItem que funciona ⇒ appendHistoryEntry === false y el blob previo permanece intacto byte a byte (no true con destrucción silenciosa)"
deferred: []
human_verification: []
---

# Fase 9: Histórico y estadísticas — Informe de verificación (3ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-12
**Estado:** gaps_found (2 BLOCKER nuevos; el BLOCKER de la ronda anterior está genuinamente cerrado)
**Re-verificación:** Sí — tras el cierre del plan 09-12 (cierre del gap de la ronda 2)

## Resumen ejecutivo

El plan 09-12 cerró exactamente lo que la ronda 2 de esta verificación pedía: `buildHistoryEntry`
ya no propaga un `context` parcial (normaliza `difficulty`/`playerCount`/`round` en el punto de
construcción, igual criterio que ya aplicaba a `durationMs`), la rama `resumed` de `resume()`
valida `context` con `isValidContext` igual que su rama hermana `contentChangedFallback`, y
`appendHistoryEntry` se somete al mismo predicado (`isGameHistoryEntry`) que `loadHistory` antes
de escribir. Reproducido de forma independiente en esta ronda con un test desechable: una
entrada construida desde `context: {}` / `round: NaN` sobrevive íntegra al ciclo
`record() → loadHistory()`. Este cierre es real, no una afirmación de SUMMARY sin contrastar.

Sin embargo, `09-REVIEW.md` (3ª ronda, ejecutada justo antes de esta verificación) encontró
**dos BLOCKER nuevos**, distintos de los cerrados por 09-12, y esta verificación los ha
**reproducido de forma independiente** ejecutando los módulos de producción reales (no
narración de SUMMARY, no conteo de marcadores PASS):

1. **CR-01 (ronda 3):** un fallo TRANSITORIO de *lectura* de `localStorage` (modo privado,
   cuota, contexto restringido — `getItem` lanza) se interpreta como "histórico vacío" en vez
   de "no he podido comprobar qué había", y `appendHistoryEntry` reconstruye el envoltorio
   desde cero. Reproducido: dos partidas previamente registradas desaparecen por completo tras
   un único fallo transitorio de lectura, y la app confirma «✓ Partida registrada» sobre el
   borrado.
2. **CR-02 (ronda 3):** el mapa de nombres congelados de héroe es un objeto literal
   (`{}`), así que su indexado hereda de `Object.prototype`. Un `heroId` de valor
   `'constructor'` (alcanzable: el motor solo exige que sea una cadena no vacía, y el propio
   proyecto trata `localStorage` manipulado desde DevTools como dentro de su modelo de
   amenaza) produce un `heroName` de tipo `function`. La entrada es rechazada,
   `appendHistoryEntry` devuelve `false`, la interfaz muestra un aviso de fallo de
   almacenamiento **falso** (la causa real no tiene nada que ver con cuota ni modo privado), y
   `finishGame()` destruye la sesión de todos modos porque no está condicionado al resultado
   de `record()` — la partida jugada es irrecuperable.

Ambos hallazgos son de la MISMA familia que CR-03 (ronda 1) y el CR-01 de la ronda 2 ya
cerrados: un lado de una simetría lectura/escritura se endurece y el otro lado (o un caso
límite adyacente) queda sin tocar. El patrón se repite por tercera vez consecutiva sobre el
mismo fichero (`usePersistedSession.ts`) y su vecino directo (`useGameHistory.ts`/
`engine/history.ts`).

**Conclusión: el objetivo de la fase sigue sin considerarse plenamente alcanzado.** El camino
feliz completo (registrar, listar, borrar, agregar estadísticas, todo sin red, con los tres
BLOCKER de la ronda 1 y el BLOCKER de la ronda 2 genuinamente cerrados y con tests de
regresión) funciona. Pero la garantía central de la fase — «lo que el grupo ve confirmado
como *registrado*, lo está de verdad; lo que ve como *fallo*, es un fallo real» — sigue sin
sostenerse ante dos escenarios reproducibles y verificados de forma independiente en esta
ronda, con datos exactamente del tipo que `localStorage` (editable a mano, sujeto a fallos
transitorios de plataforma) puede producir en una tablet real.

## Logros por criterio de éxito (ROADMAP)

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o salir sin registrar | ✓ VERIFIED | `app/components/GameOutcomeDialog.vue` cableado en `app/pages/[game]/index.vue:788-793` (`@record="onOutcomeRecorded"`, `@dismiss="onOutcomeDismiss"`); sin cambios respecto a rondas anteriores |
| 2 | SC2: el registro guarda resultado, causa, villano, héroe, nombre de cada jugador, fecha, dificultad, nº jugadores, duración y rondas, calculados por el motor — de forma FIABLE | ✗ **FAILED (BLOCKER nuevo, CR-02 r3)** | El BLOCKER de la ronda 2 (context parcial sin normalizar) está cerrado y confirmado; pero un `heroId` que coincide con una clave de `Object.prototype` produce un `heroName` no-string, rechaza la entrada, y destruye la partida con un diagnóstico falso — ver gaps |
| 3a | SC3 (camino feliz): hay pantalla `/historico` que lista de más reciente a más antigua, con borrado tras confirmar | ✓ VERIFIED | `app/pages/historico.vue` + `useGameHistory().cardViews`/`.reload()`/`.remove()`; sin cambios de fondo |
| 3b | SC3 (garantía de durabilidad): el histórico en localStorage es fuente de verdad — lo confirmado como registrado es recuperable, y una escritura nunca destruye lo que no sabe interpretar NI lo que no ha sabido leer | ✗ **FAILED (BLOCKER nuevo, CR-01 r3)** | Un fallo transitorio de LECTURA (`getItem` lanza) se trata como "vacío" en vez de "no sé qué había", y `appendHistoryEntry` reconstruye el envoltorio destruyendo el histórico previo con confirmación de éxito encima — ver gaps |
| 4a | SC4 (camino feliz): pantalla `/estadisticas` accesible desde el inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | `app/pages/estadisticas.vue:46` (`v-if="statisticsView.isEmpty"`); sin cambios respecto a la ronda anterior |
| 4b | SC4 (robustez): la pantalla no se cae ni produce porcentajes engañosos ante una entrada con tipos inconsistentes | ✓ VERIFIED | Cierres de CR-02 (ronda 1) y WR-03 (ronda 2) siguen en pie; sin regresión detectada en esta ronda |
| 5 | SC5: la pantalla de estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -ric "firestore\|firebase" app/ engine/` → 0 en los 68 ficheros listados, reproducido en esta ronda; Firestore no existe todavía en el repo |

**Score:** 5/7 truths verified (2 FAILED, ambos BLOCKER — mismos dos criterios de éxito
fallidos que la ronda anterior, causa raíz distinta y ya cerrada la de la ronda 2)

### Artefactos requeridos

| Artefacto | Esperado | Estado | Detalles |
|-----------|----------|--------|----------|
| `engine/history.ts` | `buildHistoryEntry`, `describeLossCause`, `formatEntryDate`, `formatEntryDuration`, `sortEntriesByRecency` | ⚠️ VERIFIED con defecto | Normalización de `difficulty`/`playerCount`/`round` (cierre 09-12) confirmada; `heroName` (línea 41) sigue leyendo `names.heroNames[slot.heroId]` sin `Object.hasOwn` — origen de CR-02 (r3) |
| `engine/persistence.ts` | `resume()` valida `context` en la rama `resumed` igual que `contentChangedFallback` | ✓ VERIFIED | Confirmado línea a línea (`:94` usa `isValidContext`, igual criterio que `:63`); cierre 09-12 sólido |
| `app/composables/usePersistedSession.ts` | `HISTORY_KEY`, `loadHistory`, `appendHistoryEntry`, `removeHistoryEntry`, validación simétrica lectura/escritura | ⚠️ VERIFIED con defecto | Simetría lectura=escritura del PREDICADO de forma (`isGameHistoryEntry`) confirmada y cerrada (09-12); pero `readRaw`/`readEnvelope` siguen colapsando "no puedo leer" en "no hay nada" — origen de CR-01 (r3) |
| `app/composables/useGameHistory.ts` | `record/reload/remove` + vistas formateadas, robustas ante datos parciales | ⚠️ VERIFIED con defecto | `heroNames` (línea 63) es objeto literal, habilita CR-02 (r3) |
| `app/pages/historico.vue` | lista + borrado confirmado | ✓ VERIFIED | Sin cambios relevantes |
| `app/pages/estadisticas.vue` | dos tablas + estado vacío correcto en ambos casos | ✓ VERIFIED | Sin cambios relevantes |
| `app/components/GameOutcomeDialog.vue` | diálogo 4 opciones | ✓ VERIFIED (con warnings de accesibilidad no bloqueantes, heredados) | Sin cambios de fondo |
| `nuxt.config.ts` | `/historico`, `/estadisticas` en `prerender.routes` | ✓ VERIFIED | `routes: ['/', '/marvel-champions', '/historico', '/estadisticas']` |

### Verificación de enlaces clave

| Desde | Hacia | Vía | Estado | Detalles |
|-------|-------|-----|--------|----------|
| `app/pages/[game]/index.vue` (`onOutcomeRecorded`) | `useGameHistory().record()` | orden `silence()` → `record()` → `notifyHistorySaved()` → `finishGame()` | ⚠️ WIRED sin condicionar | `finishGame()` (línea 574) se ejecuta SIEMPRE, incluso cuando `record()` devuelve `false` por una entrada rechazada — la sesión se pierde igual que si el registro hubiera tenido éxito |
| `record()` (`useGameHistory.ts`) | `usePersistedSession().appendHistoryEntry()` | escritura directa de `GameHistoryEntry` | ⚠️ WIRED pero con dos fugas nuevas (ver gaps) | La cadena de llamadas es correcta; los dos defectos viven en los extremos (construcción del nombre congelado, lectura previa a la escritura) |
| `engine/persistence.ts` (`resume()`, rama `resumed`) | `SessionContext` restaurado | `isValidContext(persisted.context) ? persisted.context : fresh.context` | ✓ WIRED y validado | Cierre 09-12 confirmado — ya no es el origen del `context` parcial que motivó la ronda 2 |
| `finishGame()` | `usePersistedSession().clear(gameId)` | `HISTORY_KEY` sin sufijo de `gameId` | ✓ WIRED | Sin cambios; HIST-09 sigue confirmado |
| `app/pages/historico.vue` / `estadisticas.vue` | `useGameHistory()` → `usePersistedSession()` | `loadHistory/appendHistoryEntry/removeHistoryEntry` | ✓ WIRED (lectura de disco robusta) | La robustez de lectura de un blob YA EN DISCO sigue cerrada; los dos defectos nuevos viven en la frontera de ESCRITURA (predicado de forma de héroe, colapso lectura-previa-a-escritura) |

### Traza de flujo de datos (Nivel 4)

| Artefacto | Variable de datos | Origen | Datos reales | Estado |
|-----------|-------------------|--------|---------------|--------|
| `historico.vue` (`cardViews`) | `entries` (ref) | `useGameHistory().reload()` → `loadHistory()` → `window.localStorage.getItem('tga:history')` | Sí | ✓ FLOWING |
| `estadisticas.vue` (`statisticsView`) | `entries` (computed sobre el mismo ref) | Mismo origen | Sí | ✓ FLOWING |
| `record()` → `appendHistoryEntry` | `GameHistoryEntry` construido al terminar la partida | `buildHistoryEntry(session, outcome, now, names)` | Puede desaparecer para siempre (CR-02 r3) o destruir entradas previas (CR-01 r3) sin que ninguna vista lo refleje jamás | ✗ **DISCONNECTED** en ambos escenarios nuevos |

### Comprobaciones de comportamiento (spot-checks)

Ejecutadas contra el código de producción real en esta verificación (test vitest desechable
por caso, creado y eliminado inmediatamente después de confirmar el resultado; `git status`
limpio salvo `GEMINI_QUICK_START.md`, preexistente y ajeno a esta fase):

| Comportamiento | Comando | Resultado | Estado |
|----------------|---------|-----------|--------|
| Regresión ronda 2: `appendHistoryEntry` de una entrada construida desde `context: {}`/`round: NaN` sobrevive a `record() → loadHistory()` | test ad-hoc contra `usePersistedSession.ts` + `engine/history.ts` reales | `difficulty: 'normal'`, `playerCount` entero, `round: 1`; `loadHistory()` la recupera | ✓ PASS — cierre 09-12 confirmado, sin regresión |
| CR-01 (r3): `getItem` lanza una única vez tras dos escrituras previas exitosas; `setItem` funciona | test ad-hoc contra `usePersistedSession.ts` real, `localStorage` en memoria | `appendHistoryEntry('partida-3')` devuelve `true`; `loadHistory()` inmediatamente después solo devuelve `['partida-3']` — las dos partidas previas desaparecieron | ✗ FAIL confirmado — BLOCKER nuevo reproducido de forma independiente |
| CR-02 (r3): `heroId: 'constructor'` a través de `buildHistoryEntry` con `heroNames: {}` | test ad-hoc contra `engine/history.ts` real | `typeof entry.players[0].heroName === 'function'` | ✗ FAIL confirmado — BLOCKER nuevo reproducido de forma independiente |
| Suite completa de tests unitarios de la fase | `npx vitest run` (ejecutada de nuevo en esta verificación) | 26 archivos, 681 tests, todos en verde | ✓ PASS (ninguno de los dos casos nuevos está cubierto por la suite existente — por eso pasa en verde a pesar del BLOCKER) |
| `grep -ric "firestore\|firebase" app/ engine/` | — | 0 en 68 ficheros | ✓ PASS — SC5 sigue trivialmente cierto |

Los tres ficheros de test temporales (`__repro-cr01-r3.test.ts`, `__repro-cr02-r3.test.ts`,
`__repro-regression-r2.test.ts`) se crearon en `app/composables/__tests__/` y se eliminaron
tras confirmar cada resultado; `git status --short` tras cada eliminación mostró únicamente
`GEMINI_QUICK_START.md` (sin seguimiento, preexistente, ajeno a esta verificación).

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
| HIST-04 | 09-01, 09-05, 09-12 | Guardar los 10 campos exigidos, calculados por el motor | ⚠️ PARCIAL | El defecto de la ronda 2 (context parcial sin normalizar) está cerrado; pero un `heroId` con nombre de propiedad de `Object.prototype` sigue produciendo un `heroName` inválido que descarta la entrada entera (CR-02 r3) — `REQUIREMENTS.md` marca "Satisfecho", este hallazgo lo matiza de nuevo |
| HIST-05 | 09-01, 09-07 | Motor expone `startedAt`/ronda | ✓ SATISFECHO | Sin cambios |
| HIST-06 | 09-04, 09-09, 09-10, 09-12 | Histórico en localStorage, fuente de verdad | ⚠️ PARCIAL | El defecto de la ronda 2 está cerrado; pero un fallo TRANSITORIO de lectura (no de escritura) sigue pudiendo destruir el histórico completo con confirmación de éxito falsa encima (CR-01 r3) — `REQUIREMENTS.md` marca "Satisfecho", este hallazgo lo matiza de nuevo |
| HIST-07 | 09-05, 09-06, 09-08, 09-10 | Pantalla lista de más reciente a más antigua | ✓ SATISFECHO | Sin cambios |
| HIST-08 | 09-05, 09-06, 09-08, 09-09 | Borrado con confirmación previa | ✓ SATISFECHO | Sin cambios |
| HIST-09 | 09-04, 09-07, 09-08 | «Partida terminada» nunca borra el histórico | ✓ SATISFECHO | Sin cambios |
| STAT-01 | 09-08 | Pantalla de estadísticas accesible desde el inicio | ✓ SATISFECHO | Sin cambios |
| STAT-02 | 09-03, 09-05, 09-06 | % victorias por héroe | ✓ SATISFECHO | Sin cambios |
| STAT-03 | 09-03, 09-05, 09-06 | % victorias por villano | ✓ SATISFECHO | Sin cambios |
| STAT-04 | 09-04, 09-06, 09-08 | Solo localStorage, nunca Firestore | ✓ SATISFECHO | Sin referencias a Firestore/Firebase en el repo |
| STAT-05 | 09-03, 09-05, 09-06, 09-08, 09-11 | Estado vacío claro sin histórico | ✓ SATISFECHO | Sin cambios |

Sin requisitos huérfanos: los 14 IDs de fase (HIST-01..09, STAT-01..05) aparecen declarados en
al menos un `requirements:` de PLAN. **Nota de trazabilidad (ya señalada en la ronda 2 y
reincidente):** `REQUIREMENTS.md` marca HIST-04 y HIST-06 como `[x]`/"Satisfecho" pese a que
esta verificación encuentra, de nuevo, defectos reproducibles sobre esos mismos dos
requisitos — la sincronización de esa tabla sigue sin reflejar hallazgos de verificación
(ver `gsd-sdk-requirements-tabla-espanol.md` en la memoria del usuario: `mark-complete` no
revierte filas cuando aparece un hallazgo posterior).

### Anti-patrones encontrados

Ningún `TODO`/`FIXME`/`HACK`/`XXX`/`TBD`/"placeholder" en los ficheros clave de la fase
(comprobado en esta ronda sobre los 9 ficheros más relevantes). Los dos BLOCKER no son código
sin terminar: son la misma clase de asimetría estructural que las dos rondas anteriores ya
encontraron dos veces — un lado de un contrato de datos se endurece y un caso adyacente queda
sin cubrir.

| Archivo | Línea | Patrón | Severidad | Impacto |
|---------|-------|--------|-----------|---------|
| `app/composables/usePersistedSession.ts` | 148-156 (`readRaw`), 214-228 (`readEnvelope`), 301-322 (`appendHistoryEntry`) | Un fallo de LECTURA transitorio se colapsa en el mismo `undefined`/`'empty'` que una clave genuinamente ausente | 🛑 BLOCKER (nuevo, CR-01 r3) | Destrucción completa del histórico con confirmación de éxito falsa |
| `app/composables/useGameHistory.ts` | 63 (`heroNames`) + `engine/history.ts:41` (`buildHistoryEntry`) | Objeto literal indexado por dato no confiable (`heroId`), sin `Object.hasOwn` ni `Object.create(null)` — la cadena de prototipos participa en la búsqueda | 🛑 BLOCKER (nuevo, CR-02 r3) | Pérdida silenciosa de la partida jugada con diagnóstico de fallo falso |
| `app/pages/[game]/index.vue` | 556-574 (`onOutcomeRecorded`) | `finishGame()` se invoca incondicionalmente tras `record()`, sin distinguir "registrado" de "rechazado" | ⚠️ WARNING (habilita el impacto de CR-02, no crea el defecto) | Convierte cualquier rechazo silencioso de `record()` en pérdida irreversible de la sesión |
| `engine/persistence.ts` | 94 (rama `resumed` de `resume()`) | Ante `context` inválido, adopta `fresh.context` pero conserva `outcome: 'resumed'` en vez de degradar a `'content-changed'`/`'fresh'` | ⚠️ WARNING (WR-03 de `09-REVIEW.md`, nuevo esta ronda) | El grupo cree estar continuando su partida con los datos correctos cuando en realidad `playerCount`/`difficulty` se han sustituido en silencio por los de una sesión nueva — la entrada resultante en el histórico queda con datos incorrectos, no ausentes |
| `app/composables/usePersistedSession.ts` | 214-228, 301-322 | Un blob `unreadable` (JSON corrupto o `formatVersion` desconocido) bloquea el registro para siempre sin vía de recuperación en la interfaz (heredado, sigue abierto desde la ronda 2) | ⚠️ WARNING (WR-02 de `09-REVIEW.md`) | Ver informe de la ronda 2 — sin cambios |
| `app/components/GameOutcomeDialog.vue` | 36-98 | Sin `Escape`, sin gestión de foco, sin salida no terminal (heredado, sigue abierto desde la ronda 1) | ⚠️ WARNING (WR-04/WR-05 de `09-REVIEW.md`) | Ver informes de rondas anteriores — sin cambios |

## Verificación humana requerida

Ninguna. Los dos BLOCKER de esta ronda son deterministas y reproducibles en código — se han
reproducido de forma independiente con tests desechables contra los módulos reales de
producción en esta misma verificación (no simulación, no narración de SUMMARY ni de
`09-REVIEW.md`). No dependen de juicio subjetivo humano ni de comportamiento visual/tiempo
real, y `09-REVIEW.md` ya incluye una propuesta de fix concreta y acotada para cada uno.

## Resumen de gaps

Dos BLOCKER, sobre los mismos dos criterios de éxito que fallaron en la ronda anterior (SC2 y
SC3), con causa raíz **distinta** en ambos casos — la causa de la ronda 2 (`context` parcial
sin normalizar en `buildHistoryEntry`/`resume()`) está genuinamente cerrada por el plan 09-12
y confirmada con test de regresión independiente en esta ronda:

1. **CR-01 (r3):** `readRaw`/`readEnvelope` tratan un fallo TRANSITORIO de *lectura* de
   `localStorage` exactamente igual que una clave ausente, así que `appendHistoryEntry`
   reconstruye el envoltorio del histórico completo desde cero cuando en realidad el dato
   seguía existiendo en disco — la app confirma «✓ Partida registrada» sobre una destrucción
   silenciosa del resto del histórico.
2. **CR-02 (r3):** el mapa de nombres congelados de héroe (`useGameHistory.ts`) es un objeto
   literal indexado por un dato no confiable (`heroId`, que puede venir de `localStorage`
   manipulado), así que hereda de `Object.prototype`; un `heroId` como `'constructor'`
   produce un `heroName` no-string, la entrada se rechaza, la app confirma un fallo de
   almacenamiento **falso**, y la sesión se destruye igual porque `finishGame()` no está
   condicionado al resultado de `record()`.

Ambos fixes propuestos en `09-REVIEW.md` (CR-01/CR-02, 3ª ronda) son acotados: un resultado
discriminado de tres vías en `readRaw` (en vez de dos), y `Object.create(null)` +
`Object.hasOwn` en la construcción/lectura del mapa de nombres congelados. Ninguno requiere
replantear el diseño de la fase ni toca Firestore (que sigue sin existir en el repo — SC5
sigue trivialmente cierto).

No se han encontrado gaps diferidos a fases posteriores: la Fase 10 (Respaldo en Firestore)
depende de que `appendHistoryEntry`/`loadHistory` sean la fuente de verdad fiable que
sincronizar, así que cerrar estos dos BLOCKER sigue siendo precondición razonable antes de
esa fase, no trabajo que quepa posponer a ella.

**Patrón recurrente a señalar para la planificación del próximo cierre:** esta es la tercera
ronda consecutiva en la que la verificación (o el `09-REVIEW.md` que la precede) encuentra un
defecto de la misma familia — una frontera de validación que se endurece por un lado del
contrato lectura/escritura y deja sin cubrir un caso adyacente en el otro lado o en un módulo
vecino. Antes de dar la fase por cerrada, valdría la pena una revisión específica y exhaustiva
de TODAS las rutas de `usePersistedSession.ts` + `useGameHistory.ts` + `engine/history.ts`
bajo el mismo criterio (¿qué pasa si esta operación falla a medias? ¿qué pasa si esta clave de
objeto es un dato no confiable?), en vez de cerrar un hallazgo a la vez.

---

_Verificado: 2026-09-12_
_Verificador: Claude (gsd-verifier)_
