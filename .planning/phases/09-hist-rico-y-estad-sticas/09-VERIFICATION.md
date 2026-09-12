---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-13T09:30:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "CR-01 (ronda 3): readRaw ahora discrimina 'absent'/'value'/'unreadable'; readEnvelope/appendHistoryEntry ya no tratan un fallo transitorio de LECTURA como histórico vacío. Verificado leyendo usePersistedSession.ts:148-156 y :214-228 directamente — el comentario del propio código documenta el contrato nuevo y coincide con lo escrito."
    - "CR-02 (ronda 3): resolveFrozenHeroName (engine/history.ts:33-39) usa Object.hasOwn antes de leer el valor y descarta la cadena de prototipos; verificado leyendo el código, un heroId 'constructor' ya no resuelve a la función Object."
  gaps_remaining: []
  regressions:
    - "CR-01 (ronda 4, NUEVO — no es un defecto de la ronda 3 reabierto, es una regresión distinta introducida por el propio cierre de 09-16): el aviso de fallo afirma como hecho comprobado que 'la partida... sigue guardada en el dispositivo', pero usePersistedSession.ts:281-284 (save()) descarta a propósito el booleano de writeRaw, así que nada en el código comprueba esa afirmación antes de pintarla. Reproducido por trazado de código independiente (ver Hallazgos abajo), no solo aceptado de 09-REVIEW.md."
gaps:
  - truth: "SC3 (garantía de durabilidad y no-confirmación-falsa): cuando el registro del histórico falla, la app NUNCA afirma sobre los datos del grupo algo que no ha comprobado — el histórico vive en localStorage como fuente de verdad y ninguna partida se pierde de forma silenciosa NI con una confirmación de estado falsa"
    status: failed
    reason: >
      Verificado de forma independiente por trazado de código real (no aceptación de
      09-REVIEW.md sin contrastar): `app/components/HistorySavedNotice.vue:55-57` pinta,
      cuando `record()` devuelve `false`, el texto «La partida no se ha perdido: sigue
      guardada en el dispositivo…». El único mecanismo que podría sostener esa afirmación es
      `finishGame(!guardado)` (`app/pages/[game]/index.vue:591-593`), que se limita a NO
      llamar a `clear(gameId)` — nunca comprueba que `tga:progress:<gameId>` exista ni que su
      contenido sea el de la partida recién jugada. El dato en sí lo escribe `save()`
      (`usePersistedSession.ts:281-284`), cuya firma es `: void` y que descarta a propósito
      el booleano que `writeRaw` le devuelve (comentario del propio fichero, línea ~185-196:
      "save()/saveVoicePreference() siguen IGNORANDO este booleano... VOZ-06/D-51"). Recorrido
      de los dos motivos que la propia copy del aviso enumera y que un grupo real reconocería
      como "lo mío": modo privado del navegador (`setItem` lanza en TODAS las llamadas del
      origen, incluidas las de `save()` durante toda la partida) y memoria llena/cuota (mismo
      origen, misma cuota). En ambos, `tga:progress:<gameId>` nunca llegó a escribirse en
      ningún momento de la partida — no es que se "pierda" al fallar el registro, es que
      jamás existió — y el aviso, pese a ello, afirma que "sigue guardada". El grupo, al leer
      eso, vuelve a `/`, entra otra vez en el juego esperando "Partida guardada · CONTINUAR" y
      se encuentra el mini-setup: la partida y su registro son irrecuperables, y la
      instrucción "pulsad Partida terminada otra vez" es imposible de seguir en ese estado.
      Esto es el mismo patrón exacto que las tres rondas anteriores de esta fase llevan
      cerrando en el motor (CR-01/CR-02 rondas 1-3: una función afirma "guardado"/"vacío" sin
      haberlo comprobado) — 09-16 corrigió la mitad del problema (dejó de atribuir una CAUSA
      técnica no comprobada) y lo sustituyó por una afirmación de ESTADO igual de no
      comprobada, esta vez en la superficie que el barrido de fronteras de 09-17 excluyó
      explícitamente de su perímetro (los `.vue`, §5 de 09-AUDIT-FRONTERAS.md). El propio
      09-16-SUMMARY.md declara el WARNING «cerrado» y afirma textualmente que «la partida
      sigue ahí y se puede reintentar» — esa afirmación de SUMMARY es la que este trazado de
      código independiente contradice.
    artifacts:
      - path: "app/composables/usePersistedSession.ts"
        issue: "save() (líneas 281-284) tiene firma `: void` y descarta el booleano de writeRaw() — nadie puede saber si el progreso se escribió de verdad, pese a que desde 09-16 la interfaz hace una promesa explícita sobre ese dato al usuario"
      - path: "app/pages/[game]/index.vue"
        issue: "onOutcomeRecorded (líneas 576-594) llama a finishGame(!guardado) basándose solo en el resultado de record() (el histórico), nunca en el de save() (el progreso) — finishGame(true) solo evita borrar, nunca verifica que haya algo que preservar"
      - path: "app/components/HistorySavedNotice.vue"
        issue: "línea 56: afirma 'sigue guardada en el dispositivo' como hecho, sin que ningún dato de retorno lo respalde"
    missing:
      - "save() debe devolver el booleano de writeRaw() (cambio de firma, ya sugerido en 09-REVIEW.md CR-01: `function save(session): boolean`)"
      - "onOutcomeRecorded debe reescribir el progreso SÍNCRONAMENTE cuando record() devuelve false y comprobar ese resultado antes de decidir qué aviso mostrar (p. ej. `const progresoAsegurado = guardado ? false : save(session.value)`), sin afirmar 'sigue guardada' salvo que progresoAsegurado sea true"
      - "Dos variantes de aviso de fallo distintas (recuperable / no recuperable) — o, como corrección mínima no negociable si se prefiere no ampliar la interfaz, retirar sin más la frase 'sigue guardada en el dispositivo' del texto único de fallo"
      - "Test de regresión: writeRaw simulado para que TODAS las llamadas de la partida (incluidas las de save() durante el autoguardado) fallen ⇒ el aviso de fallo NUNCA debe afirmar que la partida sigue guardada"
deferred: []
human_verification: []
---

# Fase 9: Histórico y estadísticas — Informe de verificación (4ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-13
**Estado:** gaps_found (1 BLOCKER nuevo, distinto de los dos cerrados por 09-13/09-14; ambos BLOCKER de la ronda 3 están genuinamente cerrados)
**Re-verificación:** Sí — tras el lote de cierre 09-13..09-17

## Resumen ejecutivo

El lote 09-13..09-17 hace lo que dice que hace en el motor y la costura de almacenamiento:
`readRaw` ya discrimina "clave ausente" de "no he podido leer" (CR-01 ronda 3, cerrado, verificado
leyendo `usePersistedSession.ts:148-228` directamente); `resolveFrozenHeroName` y sus hermanos ya
usan `Object.hasOwn` antes de indexar un objeto literal con una clave de dato no confiable (CR-02
ronda 3, cerrado, verificado en `engine/history.ts:33-39`); `resume()` degrada a `'fresh'` ante un
`context` no validable; y `09-AUDIT-FRONTERAS.md` es un inventario real de 54 funciones con
veredicto explícito, no una afirmación vacía.

Pero esta ronda ha reproducido, por trazado de código INDEPENDIENTE (no por aceptar el hallazgo de
`09-REVIEW.md` sin contrastar), exactamente el patrón que las tres rondas anteriores llevan
cerrando: una función afirma sobre el estado de los datos del grupo algo que no ha comprobado.
09-16 introdujo `finishGame(preserveProgress)` para dejar de destruir la partida tras un registro
fallido, y reescribió el aviso de fallo para dejar de atribuir una causa técnica no comprobada —
ambas cosas correctas y verificadas. Pero el texto nuevo del aviso («la partida... sigue guardada
en el dispositivo») es una afirmación de HECHO sobre el dato del grupo que nada en el código
comprueba: `save()` (la función que realmente escribe el progreso) descarta a propósito el
booleano que le devuelve `writeRaw()`, precisamente por una decisión de diseño anterior (VOZ-06/
D-51) que ya no encaja con la nueva promesa que la interfaz hace al usuario desde 09-16. En los
dos modos de fallo que la propia frase del aviso nombra (modo privado, memoria llena/cuota), la
partida NO sigue guardada — nunca llegó a estarlo — y el grupo lee una garantía falsa justo en el
momento en que más la necesita.

Este hallazgo es el mismo defecto de fondo de CR-01/CR-02 de las tres rondas previas (afirmar sin
comprobar), en una superficie nueva (el aviso de la interfaz) que `09-AUDIT-FRONTERAS.md` excluyó
explícitamente de su perímetro por diseño (§5, "fuera de alcance: los `.vue`"). No es una
regresión del cierre de la ronda 3 — los dos BLOCKER de esa ronda están genuinamente cerrados —
sino un defecto nuevo introducido por el propio 09-16 al resolver el anterior.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria del ROADMAP) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o cerrar sin registrar | ✓ VERIFIED | `GameOutcomeDialog.vue` expone las 4 salidas; `onOutcomeDismiss` (`[game]/index.vue:602-608`) termina sin registrar, sin condiciones, cumpliendo HIST-02 literalmente (nota de reconciliación en el propio fichero, líneas 599-601) |
| 2 | SC2: el registro incluye resultado/causa/villano/héroe/nombres/fecha/dificultad/nº jugadores/duración/rondas, calculados por el motor | ✓ VERIFIED | `buildHistoryEntry` (`engine/history.ts:90-121`) normaliza `difficulty`/`playerCount`/`round`/`durationMs` en origen (cierre 09-12); para el flujo normal (motor → `record()`) los valores son siempre correctos. WR-01/WR-02 (ver Anti-Patrones) son gaps de defensa en profundidad ante `localStorage` manipulado, no del cálculo del motor — no invalidan esta verdad para la partida normal |
| 3 | SC3: histórico listable/borrable con confirmación; «Partida terminada» borra solo la sesión, nunca el histórico, que es fuente de verdad — sin confirmaciones falsas ante un fallo | ✗ FAILED | Mecánica de listar/borrar/no-tocar-histórico VERIFICADA (`historico.vue`, `usePersistedSession.ts` `clear()`/`removeHistoryEntry`). Pero la garantía de "ninguna confirmación falsa" — el criterio que las 3 rondas anteriores establecieron como parte de esta misma verdad — FALLA: ver Gap #1 abajo |
| 4 | SC4: pantalla de estadísticas accesible desde inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | `app/pages/index.vue:19` enlaza a `/estadisticas`; `estadisticas.vue` usa `statisticsView.isEmpty`/`emptyTitle`/`emptyBody` para el estado vacío y `heroRows`/villainRows para los porcentajes, vía `aggregateStatistics` (`engine/statistics.ts`) |
| 5 | SC5: estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -rn "firestore\|firebase"` sobre `app/` y `engine/` no produce ningún resultado — Firestore no existe todavía en el código, confirmando la premisa literal del criterio |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/composables/usePersistedSession.ts` | `readRaw`/`readEnvelope` discriminan lectura fallida de ausencia real (CR-01 r3) | ✓ VERIFIED | Líneas 148-156 (`readRaw`) y 214-228 (`readEnvelope`) leídas directamente: tipo `RawRead`/`EnvelopeRead` con 3 variantes, comentario y código coinciden |
| `app/composables/usePersistedSession.ts` | `save()` afirma de forma fiable si el progreso quedó escrito (necesario para sostener la copy de 09-16) | ✗ STUB (respecto a la promesa de la interfaz) | Línea 281-284: `function save(session): void` descarta el booleano de `writeRaw`; no hay forma de que ningún llamador sepa si el progreso se escribió |
| `engine/history.ts` | `resolveFrozenHeroName`/`buildHistoryEntry` no resuelven por `Object.prototype` (CR-02 r3) | ✓ VERIFIED | Líneas 21-39: `Object.hasOwn` antes de leer el valor, `typeof value === 'string'` como segunda guarda |
| `app/components/HistorySavedNotice.vue` | Aviso de fallo no afirma nada no comprobado | ✗ FAILED | Línea 56: «sigue guardada en el dispositivo» sin verificación previa |
| `app/pages/[game]/index.vue` | `finishGame(preserveProgress)` condiciona el borrado del progreso al resultado del registro | ✓ VERIFIED (mecánica) / ✗ insuficiente (garantía) | Líneas 543-560/576-594: hace lo que dice (no borra si `!guardado`), pero "no borrar" ≠ "hay algo que preservar" |
| `app/pages/estadisticas.vue`, `app/pages/historico.vue` | Pantallas completas, wireadas a `useGameHistory` | ✓ VERIFIED | Ambas leídas: cabecera cruzada, `onMounted`→`reload()`, estado vacío, `ConfirmDialog` en `historico.vue` |
| `.planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-FRONTERAS.md` | Barrido escrito y exhaustivo de las 3 fronteras (must_have de 09-17) | ✓ VERIFIED | Documento de 30 KB con inventario de 54 funciones, 3 preguntas por función y veredicto explícito |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `HistorySavedNotice.vue` (variant `failure`) | `usePersistedSession.save()` | Afirmación de texto → dato real | ✗ NOT_WIRED | El texto no lee ningún resultado de `save()`; `save()` ni siquiera expone uno |
| `[game]/index.vue` `onOutcomeRecorded` | `record()` → `finishGame(!guardado)` | orden `silence()`→`record()`→`notifyHistorySaved()`→`finishGame()` | ✓ WIRED | Orden verificado literalmente en el código (líneas 576-594), coincide con D-U4 |
| `app/pages/index.vue` | `/historico`, `/estadisticas` | `navigateTo` | ✓ WIRED | Líneas 15 y 19 |
| `useGameHistory().statisticsView` | `engine/statistics.aggregateStatistics` | import + llamada | ✓ WIRED | Confirmado en `useGameHistory.ts` y consumido en `estadisticas.vue` |

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| HIST-01 | 09-02, 09-07 | Ofrecer registrar el resultado | ✓ SATISFIED | `GameOutcomeDialog` cableado en `[game]/index.vue:814` |
| HIST-02 | 09-01, 09-02, 09-07, 09-16 | Ganada/Perdida, siempre se puede cerrar sin registrar | ✓ SATISFIED | `onOutcomeDismiss` sin condiciones (ver truth #1) |
| HIST-03 | 09-01, 09-02, 09-07 | Causa si Perdida | ✓ SATISFIED | `describeLossCause` (`engine/history.ts:123-127`), contrastado con Rules Reference v1.7 p.46 por comentario |
| HIST-04 | 09-01, 09-05, 09-12, 09-14, 09-15, 09-17 | Registro completo | ✓ SATISFIED (flujo normal) | Ver truth #2 |
| HIST-05 | 09-01, 09-07 | Motor expone inicio/ronda | ✓ SATISFIED | `context.startedAt`/`round` consumidos en `buildHistoryEntry` |
| HIST-06 | 09-04, 09-09, 09-12, 09-13, 09-16, 09-17 | Histórico en localStorage, fuente de verdad | ⚠ SATISFIED con reserva | El HISTÓRICO en sí (`tga:history`) está protegido (CR-01/CR-03 cerrados); la reserva es sobre el mecanismo ADYACENTE de recuperación del PROGRESO que 09-16 añadió y cuya promesa no se sostiene (ver Gap #1) |
| HIST-07 | 09-05, 09-06, 09-08, 09-10, 09-11, 09-17 | Pantalla lista más reciente→antigua | ✓ SATISFIED | `historico.vue` + `sortEntriesByRecency` |
| HIST-08 | 09-05, 09-06, 09-09, 09-11 | Borrado con confirmación | ✓ SATISFIED | `ConfirmDialog` en `historico.vue`, `removeHistoryEntry` |
| HIST-09 | 09-04, 09-07, 09-08, 09-16 | «Partida terminada» borra sesión, nunca histórico | ✓ SATISFIED (literal) | `clear(gameId)` solo toca `tga:progress:<gameId>`; nunca `tga:history` — verificado en el código. La promesa AÑADIDA por 09-16 (que el progreso preservado sea fiable) es la que falla, no el requisito literal |
| STAT-01 | 09-08 | Pantalla accesible desde inicio | ✓ SATISFIED | Ver truth #4 |
| STAT-02/03 | 09-03, 09-05, 09-06, 09-10, 09-11 | % por héroe/villano | ✓ SATISFIED | `aggregateStatistics`, `heroRows`/villainRows |
| STAT-04 | 09-04, 09-06, 09-08 | Solo localStorage, nunca Firestore | ✓ SATISFIED | Ver truth #5 |
| STAT-05 | 09-03, 09-05, 09-06, 09-08, 09-11 | Estado vacío claro | ✓ SATISFIED | `isEmpty`/`emptyTitle`/`emptyBody` |

Sin requisitos huérfanos: los 14 IDs de `Phase Requirements` en ROADMAP.md aparecen todos en al
menos un `requirements:` de plan, y `REQUIREMENTS.md` los marca todos "Satisfecho" — nota: esa
tabla, al igual que los SUMMARY, es una afirmación que este informe contrasta y en un punto
(HIST-06/HIST-09) matiza en vez de aceptar sin más.

### Anti-Patterns Found (hallazgos de `09-REVIEW.md`, contrastados de forma independiente contra el código real)

| Archivo | Línea | Patrón | Severidad | Impacto | Contrastado |
|---|---|---|---|---|---|
| `usePersistedSession.ts` | 281-284 | `save()` descarta el booleano de `writeRaw` pese a que la interfaz ya promete algo sobre ese dato desde 09-16 | 🛑 BLOCKER | Causa raíz de CR-01 (ronda 4) | Sí — código leído, firma `: void` confirmada |
| `HistorySavedNotice.vue` | 55-57 | Afirma "sigue guardada en el dispositivo" sin comprobación | 🛑 BLOCKER | El grupo no reintenta y pierde la partida creyendo que está a salvo | Sí — texto citado verbatim, coincide |
| `usePersistedSession.ts` (`isGameHistoryEntry`) / `useGameHistory.ts` | 139-140 / 162-163 | `Number.isFinite` en las fronteras de lectura vs `Number.isInteger(...)>=1`/`>0` en el productor — round 0/negativo, playerCount 2.5 atraviesan ambas fronteras | ⚠ WARNING | «Hasta la ronda -5», «2.5 jug» se pintan; solo alcanzable con `localStorage` manipulado, no desde el flujo normal | Sí — `Number.isFinite(entry.round)` confirmado en `useGameHistory.ts:163` y en `isGameHistoryEntry` |
| `usePersistedSession.ts` / `useGameHistory.ts` | 105-107, 141-142 / 130-150 | Cadena vacía (`''`) pasa la validación de tipo pero no la del productor (`length > 0`) | ⚠ WARNING | «Ana · », «contra », fila de estadística sin nombre — solo con dato manipulado | Sí — `typeof entry.villainId === 'string'` sin `.length > 0` confirmado en `useGameHistory.ts:120` |
| `engine/history.ts` | 121 | `new Date(now).toISOString()` lanza `RangeError` con `now` no finito; único parámetro de la función sin guarda | ⚠ WARNING (latente) | Hoy inalcanzable (único llamador pasa `Date.now()`); confirmado por lectura de `useGameHistory.ts:289` sin `try/catch` alrededor | Sí — comportamiento estándar de `Date`, y ausencia de guarda confirmada por lectura |
| `GameOutcomeDialog.vue` | 37-97 | Sin `aria-labelledby`, sin gestión de foco, sin `Escape`; las 4 salidas terminan la partida | ⚠ WARNING (reclasificado desde "diferido") | Diferido en `deferred-items.md` por "fuera del perímetro del plan .vue" — motivo de ALCANCE, no de riesgo; se ratifica como hallazgo real, no bloqueante para esta fase | Sí — `deferred-items.md:61-80` leído, motivo confirmado literal |
| `app.vue` / `HistorySavedNotice.vue` / `GameSelectorScreen.vue` | 23-34 / 29-31 / 26 | La banda de aviso empuja la pantalla `h-dvh` de destino fuera del viewport durante 20s en el caso de fallo | ⚠ WARNING (reclasificado desde "diferido") | Mismo motivo de alcance, agravado por 09-16 (texto de 3 frases, 20s) | Sí — `deferred-items.md:96` leído; motivo confirmado literal |

No se han encontrado `TBD`/`FIXME`/`XXX` sin referencia de seguimiento en los ficheros de esta
fase, ni `console.*`/`debugger`/`v-html`/`eval` — confirmado por lectura directa de
`09-REVIEW.md` §Summary y contrastado con una búsqueda propia sobre los mismos 30 ficheros.

### Sobre los dos diferidos reclasificados (WR-04→GameOutcomeDialog, WR-05(b)→layout)

Se ha leído `deferred-items.md` completo y se dictamina de forma independiente, tal como pide el
encargo: en ambos casos el motivo de aplazamiento registrado es literalmente "vive en un fichero
`.vue`..., fuera del perímetro de este plan" — es una razón de ALCANCE DE PLAN, no una evaluación
de riesgo aceptado. Un aplazamiento válido necesita justificar por qué el riesgo es bajo o por qué
otra fase lo cubre; "no entraba en el encargo de este plan concreto" no es eso. Se ratifica el
juicio de `09-REVIEW.md`: ambos pasan de "diferido" a "hallazgo" (WARNING, no BLOCKER — ninguno de
los dos rompe un Success Criteria del ROADMAP por sí mismo) en este informe. No se re-abren como
gaps bloqueantes de esta ronda porque no impiden que el grupo complete el flujo objetivo de la
fase, pero deben entrar en el próximo lote de cierre igual que CR-01, no quedar aplazados de nuevo
con el mismo motivo de alcance.

### Human Verification Required

Ninguno. Todos los truths y hallazgos de esta ronda son verificables por lectura y trazado de
código (firma de funciones, texto literal de la interfaz, orden de llamadas) sin necesidad de
ejecutar la app en un dispositivo real.

### Gaps Summary

Un solo BLOCKER bloquea el cierre de la fase: el aviso de fallo introducido por 09-16 afirma un
hecho sobre los datos del grupo («sigue guardada en el dispositivo») que ningún dato del código
comprueba, porque `save()` descarta a propósito el resultado de la escritura que sostendría esa
afirmación. Es el mismo patrón de fondo que las tres rondas anteriores llevan cerrando en el
motor y en la costura de almacenamiento (afirmar sin comprobar), reaparecido en una superficie
nueva — el aviso de la interfaz — que el barrido de fronteras de 09-17 excluyó explícitamente de
su perímetro. La corrección que propone `09-REVIEW.md` (CR-01, cambiar la firma de `save()` a
`boolean` y condicionar la copy al resultado) es concreta y de alcance acotado a dos ficheros.

Además, dos diferidos de `deferred-items.md` (GameOutcomeDialog sin foco/Escape;
HistorySavedNotice empujando la pantalla `h-dvh`) se reclasifican en este informe de "aplazado"
a "hallazgo real, no bloqueante" porque su motivo de aplazamiento fue de alcance de plan, no de
riesgo — deben incorporarse al próximo lote de cierre en vez de aplazarse de nuevo por el mismo
motivo.

---

_Verified: 2026-09-13T09:30:00Z_
_Verifier: Claude (gsd-verifier)_
