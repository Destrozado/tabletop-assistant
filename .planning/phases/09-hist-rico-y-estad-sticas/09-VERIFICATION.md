---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-13T09:39:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "BLOCKER ronda 4 tal como estaba enunciado (progresoAsegurado no comprobaba nada): save() ahora devuelve `boolean` real (usePersistedSession.ts:313), y onOutcomeRecorded lo consulta síncronamente antes de elegir variante. Verificado leyendo el código directamente, no solo el SUMMARY."
  gaps_remaining:
    - "SC3 (garantía de no-confirmación-falsa) sigue FALLANDO — no por el mismo mecanismo que la ronda 4 encontró, sino por uno adyacente que el propio cierre de la ronda 4 introdujo: la variante 'failure-unrecoverable' afirma 'no hay nada que reintentar' basándose solo en si LA ÚLTIMA escritura de save() tuvo éxito, no en si `tga:progress:<gameId>` contiene datos recuperables de un autoguardado anterior. Ver Hallazgo CR-01 (adjudicado) abajo."
  regressions:
    - "Ninguna respecto al mecanismo que la ronda 4 cerró (guardado/finishGame/preserveProgress); el hallazgo nuevo es una consecuencia no analizada del propio diseño del cierre de la ronda 4 (mismo patrón de fondo: afirmar sobre un dato sin haberlo comprobado del todo), no una regresión de una pieza que antes funcionaba."
gaps:
  - truth: "SC3: «Partida terminada» borra la sesión en curso pero nunca el histórico, que vive en localStorage como fuente de verdad — y ninguna afirmación de la interfaz sobre esos datos puede carecer de comprobación real"
    status: failed
    reason: >
      Adjudicado por trazado de código independiente (no por aceptar 09-REVIEW.md sin
      contrastar): en `app/pages/[game]/index.vue:607-611`,
      `progresoAsegurado = guardado ? false : save(session.value)` solo pregunta si LA
      ESCRITURA DE AHORA MISMO tuvo éxito. `save()` (`usePersistedSession.ts:313`) devuelve
      con precisión el resultado de `writeRaw()` PARA ESA LLAMADA — el propio comentario del
      código lo dice explícitamente: "no afirma que el dato siga ahí más tarde". Pero
      `notifyHistorySaved(guardado, progresoAsegurado)` con `progresoAsegurado === false`
      selecciona la variante `failure-unrecoverable`, cuyo texto
      (`useHistorySavedNotice.ts` NOTICE_BODY) es una afirmación categórica: "no hay nada que
      reintentar". Esa frase es falsa en un escenario alcanzable y no exótico: durante la
      partida, el `watchDebounced` de autoguardado (`index.vue:163-171`) escribe
      `tga:progress:<gameId>` con éxito varias veces (la cuota aún no estaba agotada);
      más tarde, al terminar la partida, la cuota SÍ se agota (el propio `tga:history`
      crece con cada partida — sin tope, ver IN-04 de `deferred-items.md`) y la escritura
      final de `save()` falla. El resultado es exactamente la combinación que dispara
      `failure-unrecoverable`: `record()` → false, `save()` (ahora) → false. Pero
      `tga:progress:<gameId>` SIGUE conteniendo la posición del último autoguardado que sí
      funcionó — y `finishGame(!guardado)` = `finishGame(true)` no la borra (`clear(gameId)`
      no se llama). El grupo lee "no hay nada que reintentar", vuelve a `/`, entra otra vez en
      el juego, y `resume()` (`engine/persistence.ts:88`) encuentra la clave, devuelve
      `outcome: 'resumed'`, y `ResumePrompt` ofrece «Continuar». La app acaba de decirle al
      grupo que no queda nada y acto seguido le ofrece justo eso. Es el mismo defecto de
      fondo que las cuatro rondas anteriores de esta fase llevan cerrando (una función afirma
      sobre el estado real de un dato del grupo sin haberlo comprobado del todo), en una
      variante distinta del mismo par record()/save(). El test de regresión que la ronda 4
      añadió (`avisoTrasRegistroFallido.test.ts`) NO cubre este escenario: su doble
      `createFakeLocalStorage()` hace que `setItem` lance desde la PRIMERA llamada (`IN-02`
      del propio 09-REVIEW.md lo señala), así que nunca existe el estado «hay un progreso
      viejo escrito y ahora la escritura falla» — el test 4 del mismo fichero sí siembra un
      estado previo, pero solo para la clave del histórico rota, no para «progreso viejo +
      escritura de progreso caída ahora». `09-AUDIT-AFIRMACIONES-UI.md` marca
      `HistorySavedNotice.vue` como RESPALDADA porque comprueba que el texto depende de un
      booleano real — pero no audita si ESE booleano concreto responde a la pregunta que el
      texto plantea («¿hay algo que reintentar?»); por eso el barrido de cierre de la ronda 4
      no lo detectó, y por eso la nota de cierre de hueco en `REQUIREMENTS.md` (línea ~92-103,
      "queda cerrada por el lote 09-18/09-20/09-21") es prematura.
    artifacts:
      - path: "app/pages/[game]/index.vue"
        issue: "líneas 607-611: progresoAsegurado se calcula solo a partir del resultado de LA escritura actual (save()), nunca de si ya existe una posición reanudable en el dispositivo de un autoguardado anterior (load(gameId) !== null)"
      - path: "app/composables/useHistorySavedNotice.ts"
        issue: "NOTICE_BODY['failure-unrecoverable'] afirma categóricamente 'esta vez no hay nada que reintentar' basándose en una señal (save() de AHORA) que no descarta progreso recuperable de ANTES"
      - path: "app/composables/__tests__/avisoTrasRegistroFallido.test.ts"
        issue: "el doble de localStorage falla desde la primera llamada (IN-02 de 09-REVIEW.md); no existe ningún test que siembre progreso viejo y luego rompa solo la escritura final, que es exactamente el escenario que dispara el defecto"
    missing:
      - "Respaldar 'no hay nada que reintentar' con una lectura real del dispositivo, no solo con el resultado de la escritura: progresoAsegurado = guardado ? false : (save(session.value) || load(gameId) !== null) — load() ya distingue 'hay posición reanudable' de 'no hay nada' (engine/persistence.ts)"
      - "Test de regresión: doble de localStorage cuyo setItem funcione N veces y luego lance en la llamada N+1 (progreso viejo YA escrito + escritura final caída) ⇒ resolveNoticeVariant debe devolver 'failure-recoverable', no 'failure-unrecoverable'"
      - "Sincronizar REQUIREMENTS.md: la nota de cierre de hueco sobre HIST-06 (ronda 4) da por cerrado un problema que sigue abierto en una variante distinta; debe reflejar que la ronda 5 encontró una regresión de signo invertido, no una confirmación de cierre"
deferred: []
human_verification:
  - test: "Comprobación visual en tablet horizontal real (viewport ~1180×820, npm run dev): terminar una partida con la variante de aviso de fallo (larga, 20s) visible y observar si tapa controles de la cabecera de /historico, y provocar (o simular con devtools) una detección de actualización de PWA simultánea al aviso de histórico para confirmar visualmente si una banda tapa por completo a la otra"
    expected: "Ninguna banda debería impedir ver o tocar los controles de cabecera de /historico, y si ambas bandas coinciden en el tiempo, ambas deberían seguir siendo visibles y utilizables (apiladas, no superpuestas)"
    why_human: "Es un juicio visual sobre solapamiento real en un viewport físico — greppear el CSS ya demuestra que ambas bandas comparten exactamente `fixed top-0 inset-x-0 z-40` con fondo opaco y se montan como hermanas (confirmado en app/app.vue: <UpdateBanner/> antes que <HistorySavedNotice/>), pero solo un humano puede confirmar el impacto real en pantalla y decidir si es aceptable. Este ítem estaba PENDIENTE explícitamente en 09-22-SUMMARY.md y sigue abierto bajo DEV-02 de REQUIREMENTS.md; no se abre una entrada nueva por esto."
---

# Fase 9: Histórico y estadísticas — Informe de verificación (5ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-13
**Estado:** gaps_found (1 BLOCKER — reproducción independiente del que reporta `09-REVIEW.md`, distinto del que la ronda 4 se propuso cerrar)
**Re-verificación:** Sí — tras el lote de cierre 09-18..09-23

## Resumen ejecutivo

El lote 09-18..09-23 hace exactamente lo que dice que hace respecto al defecto que la ronda 4
identificó: `save()` ya devuelve el booleano real de `writeRaw()` (`usePersistedSession.ts:313`,
verificado leyendo el código), `resolveNoticeVariant()` es una función pura con tabla de verdad
testeada (`useHistorySavedNotice.ts:39-42`), y `HistorySavedNotice.vue` ya no contiene ninguna
frase propia — solo interpola `NOTICE_HEADING`/`NOTICE_BODY`. Las decisiones deliberadas del
alcance (orden D-U4, ausencia de `Escape`, foco en el panel) se han respetado.

Pero he adjudicado por trazado de código INDEPENDIENTE — no por aceptar `09-REVIEW.md` sin
contrastar — que el BLOCKER que esta ronda se propuso cerrar sigue abierto, con el signo
invertido: la variante `failure-unrecoverable` afirma «no hay nada que reintentar» apoyándose
únicamente en si LA ESCRITURA DE AHORA MISMO de `save()` tuvo éxito, no en si
`tga:progress:<gameId>` ya contiene una posición recuperable de un autoguardado ANTERIOR que sí
funcionó. En el escenario que la propia copy nombra (cuota agotada), esa combinación es
perfectamente alcanzable — y produce exactamente la contradicción que las cuatro rondas
anteriores de esta fase llevan cerrando: la interfaz afirma algo sobre un dato del grupo que no
ha comprobado del todo, y esa afirmación es demostrablemente falsa: el grupo puede volver a
entrar en la partida y ver «Continuar» justo después de que la app le dijera que no había nada
que reintentar. He confirmado que el test de regresión de la ronda 4
(`avisoTrasRegistroFallido.test.ts`) no ejercita este camino (su doble de `localStorage` falla
desde la primera llamada, nunca deja progreso viejo escrito) y que
`09-AUDIT-AFIRMACIONES-UI.md` marca esta superficie como RESPALDADA por comprobar que el texto
depende de un booleano real, sin auditar si ESE booleano concreto responde a la pregunta que el
texto plantea.

No he encontrado evidencia de que este hallazgo esté cubierto por planes ya cerrados, ni de que
sea un riesgo aceptado documentado en `deferred-items.md` — no aparece ahí. La nota de cierre de
hueco que `REQUIREMENTS.md` añadió sobre HIST-06 (ronda 4) da el problema por cerrado; mi
verificación independiente concluye que no lo está.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria del ROADMAP) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o cerrar sin registrar | ✓ VERIFIED | `GameOutcomeDialog.vue` expone las 4 salidas; `onOutcomeDismiss` (`[game]/index.vue:623-628`) termina sin registrar, sin condiciones |
| 2 | SC2: el registro incluye resultado/causa/villano/héroe/nombres/fecha/dificultad/nº jugadores/duración/rondas, calculados por el motor | ✓ VERIFIED | `buildHistoryEntry` (`engine/history.ts`) normaliza los campos en origen; sin cambios respecto a la ronda 4, donde ya se verificó línea a línea |
| 3 | SC3: histórico listable/borrable con confirmación; «Partida terminada» borra solo la sesión, nunca el histórico — sin confirmaciones falsas ante un fallo | ✗ FAILED | Mecánica de listar/borrar/no-tocar-histórico sigue VERIFICADA. La garantía de "ninguna afirmación no comprobada" FALLA de nuevo, en variante distinta a la de la ronda 4 — ver Gap #1 arriba, adjudicado por trazado de código propio |
| 4 | SC4: pantalla de estadísticas accesible desde inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | `app/pages/index.vue` enlaza a `/estadisticas`; `estadisticas.vue` usa `statisticsView.isEmpty`/`emptyTitle`/`emptyBody` y `heroRows`/`villainRows` vía `aggregateStatistics` — sin cambios desde la ronda 4 |
| 5 | SC5: estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -rn "firestore\|firebase"` sobre `app/` y `engine/` no produce ningún resultado |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/composables/usePersistedSession.ts` `save()` | Devuelve booleano real de la escritura (cierre BLOCKER ronda 4) | ✓ VERIFIED | Línea 313: `function save(session): boolean { ... return writeRaw(...) }` — comprobado leyendo el código, coincide con el comentario |
| `app/composables/useHistorySavedNotice.ts` | Tres variantes puras, testeadas, sin copy suelta en el componente | ✓ VERIFIED | `resolveNoticeVariant`, `NOTICE_HEADING`, `NOTICE_BODY` exportados y usados tal cual en `HistorySavedNotice.vue` |
| `app/components/HistorySavedNotice.vue` | Sin copy propia, solo interpola | ✓ VERIFIED | `{{ heading }}` / `{{ body }}`, ninguna frase hardcodeada |
| `app/pages/[game]/index.vue` `onOutcomeRecorded` | La variante de aviso refleja con precisión si hay algo recuperable en el dispositivo | ✗ STUB (respecto a la promesa del texto) | Líneas 607-611: `progresoAsegurado` solo mira el resultado de la escritura de AHORA, nunca si ya hay una posición reanudable escrita antes — insuficiente para sostener «no hay nada que reintentar» |
| `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` | Cubre la costura real que la ronda 4 debía cerrar | ✗ INSUFICIENTE | 4 tests, ninguno siembra «progreso viejo + escritura de progreso caída ahora»; el doble de storage falla desde la primera llamada (confirmado leyendo el fichero) |
| `.planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-AFIRMACIONES-UI.md` | Barrido de 24 `.vue` que confirma ninguna afirmación sin respaldo | ⚠ INCOMPLETO | Marca `HistorySavedNotice.vue` RESPALDADA por depender de un booleano real, sin auditar si ese booleano responde a la pregunta concreta del texto |
| `app/pages/estadisticas.vue`, `app/pages/historico.vue` | Pantallas completas, wireadas a `useGameHistory` | ✓ VERIFIED | Sin cambios desde la ronda 4; releídas para confirmar que no hay regresión |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `HistorySavedNotice.vue` (variant `failure-unrecoverable`) | Estado real de `tga:progress:<gameId>` | Afirmación de texto → dato verificado | ✗ NOT_WIRED (parcial) | La variante depende de `save()` (escritura de ahora), no de `load(gameId)` (estado real acumulado) — el enlace existe pero mide la señal equivocada para la pregunta que el texto responde |
| `[game]/index.vue` `onOutcomeRecorded` | `record()`/`save()` → `finishGame(!guardado)` | orden `silence()`→`record()`→`save()`→`notifyHistorySaved()`→`finishGame()` | ✓ WIRED | Orden D-U4 verificado literalmente en el código, líneas 607-616 |
| `app/pages/index.vue` | `/historico`, `/estadisticas` | `navigateTo` | ✓ WIRED | Sin cambios desde ronda 4 |
| `useGameHistory().statisticsView` | `engine/statistics.aggregateStatistics` | import + llamada | ✓ WIRED | Sin cambios desde ronda 4 |

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| HIST-01 | 09-02, 09-07 | Ofrecer registrar el resultado | ✓ SATISFIED | Sin cambios desde ronda 4 |
| HIST-02 | 09-01, 09-02, 09-07, 09-16 | Ganada/Perdida, siempre se puede cerrar sin registrar | ✓ SATISFIED | `onOutcomeDismiss` sin condiciones |
| HIST-03 | 09-01, 09-02, 09-07 | Causa si Perdida | ✓ SATISFIED | Sin cambios desde ronda 4 |
| HIST-04 | 09-01, 09-05, 09-12, 09-14, 09-15, 09-17 | Registro completo | ✓ SATISFIED (flujo normal) | Sin cambios desde ronda 4 |
| HIST-05 | 09-01, 09-07 | Motor expone inicio/ronda | ✓ SATISFIED | Sin cambios desde ronda 4 |
| HIST-06 | 09-04, 09-09, 09-12, 09-13, 09-16, 09-17, 09-18, 09-20, 09-21, 09-23 | Histórico en localStorage, fuente de verdad | ⚠ SATISFIED con reserva (misma reserva, forma distinta) | El HISTÓRICO en sí (`tga:history`) sigue protegido; la reserva sigue siendo sobre el mecanismo adyacente de recuperación del PROGRESO — la ronda 4 cerró la mitad del problema (save() ya devuelve un booleano real) pero ese booleano no basta para sostener «no hay nada que reintentar» (ver Gap #1). `REQUIREMENTS.md` da esto por cerrado; mi verificación independiente no lo confirma |
| HIST-07 | 09-05, 09-06, 09-08, 09-10, 09-11, 09-17 | Pantalla lista más reciente→antigua | ✓ SATISFIED | Sin cambios desde ronda 4 |
| HIST-08 | 09-05, 09-06, 09-09, 09-11 | Borrado con confirmación | ✓ SATISFIED | Sin cambios desde ronda 4 |
| HIST-09 | 09-04, 09-07, 09-08, 09-16, 09-18, 09-20, 09-23 | «Partida terminada» borra sesión, nunca histórico | ✓ SATISFIED (literal) | `clear(gameId)` solo toca `tga:progress:<gameId>`; el requisito literal se cumple. La promesa de interfaz AÑADIDA sobre ese progreso preservado (que sea fiable) es la que sigue sin sostenerse del todo |
| STAT-01 | 09-08 | Pantalla accesible desde inicio | ✓ SATISFIED | Sin cambios desde ronda 4 |
| STAT-02 | 09-03, 09-06, 09-08, 09-11 | % victorias por héroe | ✓ SATISFIED | Sin cambios desde ronda 4 |
| STAT-03 | 09-03, 09-06, 09-08, 09-11 | % victorias por villano | ✓ SATISFIED | Sin cambios desde ronda 4 |
| STAT-04 | 09-04, 09-08, 09-11 | Solo localStorage, nunca Firestore | ✓ SATISFIED | Ver truth #5 |
| STAT-05 | 09-02, 09-06, 09-08, 09-10, 09-11 | Estado vacío claro | ✓ SATISFIED | Sin cambios desde ronda 4 |

Ningún requisito huérfano: los 14 IDs de la fase (HIST-01..09, STAT-01..05) aparecen en al menos
un frontmatter de plan y en `.planning/REQUIREMENTS.md`, con fila propia en la tabla de
trazabilidad (líneas 219-232).

### Anti-Patrones Encontrados

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/pages/[game]/index.vue` | 607-611 | Afirmación de UI respaldada por una señal insuficiente (misma escritura, no estado acumulado) | 🛑 BLOCKER | Objeto de esta verificación — ver Gap #1 |
| `app/pages/[game]/index.vue` | 593-616 | `onOutcomeRecorded` sin guarda de reentrada (WR-01 de `09-REVIEW.md`) | ⚠ WARNING | Una segunda invocación (doble toque, `click` duplicado) cae en el `else` y llama a `finishGame()` sin argumento, borrando el progreso que la primera invocación preservó a propósito. No confirmado como alcanzado en esta ronda porque exige una condición de carrera de interacción, pero el código no tiene ninguna guarda que lo impida — confirmado leyendo `index.vue:593-628`, no hay `if (!awaitingEndConfirm.value) return` ni equivalente |
| `app/components/UpdateBanner.vue` + `app/components/HistorySavedNotice.vue` | ambas `fixed top-0 inset-x-0 z-40` | Dos bandas idénticas en posición/z-index, montadas como hermanas en `app.vue`, sin coordinación entre sí | ⚠ WARNING | Confirmado leyendo ambos ficheros y `app.vue`: si ambas están visibles a la vez, `HistorySavedNotice` (montada después) tapa por completo a `UpdateBanner`, incluida su CTA «Actualizar». Escenario alcanzable: SW detecta versión nueva a media partida, el grupo termina la partida con las dos bandas activas |
| `app/components/GameOutcomeDialog.vue` | 83-84 | `aria-modal="true"` sin trampa de foco (`Tab` sale del diálogo) | ⚠ WARNING | Heredado, no introducido esta ronda; confirmado que no hay `keydown`/ciclo de foco en el fichero |
| `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` | 16 | `import { beforeEach ... }` sin usar | ℹ INFO | Cosmético |

No se han encontrado marcadores de deuda (`TODO`/`FIXME`/`TBD`/`XXX`/`HACK`) sin referencia en
los ficheros tocados por el lote 09-18..09-23.

### Human Verification Required

### 1. Comprobación visual en tablet horizontal real

**Test:** Con `npm run dev` en un viewport de tablet horizontal (~1180×820), terminar una
partida provocando la variante de aviso de fallo (20s de duración) y, si es posible, forzar
también la detección de una actualización de PWA en el mismo momento.
**Expected:** Ningún control de cabecera queda tapado de forma invisible por las bandas; si
`UpdateBanner` e `HistorySavedNotice` coinciden en el tiempo, ambas deberían seguir siendo
visibles/utilizables, no una tapando por completo a la otra.
**Why human:** El solapamiento exacto de CSS ya está confirmado por lectura de código (mismo
`fixed top-0 inset-x-0 z-40`, mismo fondo opaco, montaje como hermanas en `app.vue`), pero el
impacto real en un dispositivo físico y la decisión de si es aceptable requieren juicio humano.
Este ítem ya estaba marcado como PENDIENTE en `09-22-SUMMARY.md` (DEV-02 de `REQUIREMENTS.md`);
no es un hallazgo nuevo de esta ronda, se reitera porque sigue sin resolverse y el nuevo hallazgo
de solapamiento MUTUO entre las dos bandas (distinto del empuje fuera del viewport ya cerrado)
lo hace más relevante que antes.

### Gaps Summary

El objetivo de la fase sigue sin alcanzarse en su criterio de éxito nº 3 (SC3): la garantía de
que ninguna afirmación de la interfaz sobre los datos del grupo carece de comprobación real.
Cuatro rondas de verificación han encontrado y cerrado variantes concretas de este mismo defecto
de fondo (CR-01/CR-02 rondas 1-3 en el motor y la capa de almacenamiento; CR-01 ronda 4 en el
aviso de fallo del registro). Esta quinta ronda encuentra una quinta variante, introducida por
el propio cierre de la cuarta: `save()` ahora sí devuelve un booleano real, pero ese booleano
solo certifica la escritura de AHORA, y la interfaz lo usa para hacer una afirmación sobre TODO
el estado del dispositivo («no hay nada que reintentar»), que puede ser falsa si un
autoguardado anterior sí tuvo éxito. La corrección propuesta en `missing:` es acotada (una
comparación adicional con `load(gameId)`, ya disponible) y no exige rediseñar nada del trabajo
ya cerrado del lote 09-18..09-23 — pero es necesaria antes de dar la fase por completa, porque
repite exactamente el patrón que el grupo lleva cuatro rondas pidiendo que se cierre de raíz, y
la fila de `REQUIREMENTS.md` que da esto por resuelto necesita corregirse en el mismo lote.

Adicionalmente, un WARNING no cerrado (solapamiento mutuo entre `UpdateBanner` y
`HistorySavedNotice`, ambas `fixed top-0 inset-x-0 z-40`) y la comprobación visual humana
pendiente desde 09-22 siguen abiertos; no bloquean el objetivo de la fase por sí solos, pero
conviene resolverlos en el mismo lote de cierre dado que tocan el mismo área de superficie.

---

_Verificado: 2026-09-13T09:39:00Z_
_Verificador: Claude (gsd-verifier)_
