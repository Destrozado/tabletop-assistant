# Auditoría de afirmaciones de interfaz — Q4: ¿qué le afirma esta pantalla al grupo sobre sus datos?

**Encargo:** cerrar el agujero de proceso que `09-AUDIT-FRONTERAS.md` §5 dejó abierto a propósito
(«fuera de perímetro: los ficheros `.vue`») y que `09-VERIFICATION.md` (ronda 4) confirmó que era
exactamente por donde CR-01 (ronda 4) se coló: la afirmación sin respaldo no vivía ya en el motor
ni en la costura de almacenamiento — se había mudado al texto que la interfaz le muestra al grupo.

**Perímetro auditado:** exactamente los 24 ficheros que devuelve `find app -name "*.vue" | sort` a
fecha de este plan, en ese mismo orden. Ni una función más de las 54 ya auditadas por
`09-AUDIT-FRONTERAS.md` — esas no se repiten aquí.

---

## 1. Método

`09-AUDIT-FRONTERAS.md` (plan 09-17) formuló tres preguntas —Q1 (fallo a medias), Q2 (clave de
objeto no confiable), Q3 (el valor que una función le devuelve a OTRA función puede afirmar algo
que no ha ocurrido)— y las aplicó a 54 funciones de composables y motor. Ninguna de las tres cubre
la superficie que este documento audita, porque las tres miran una función pasándole un valor a
otra función. Ninguna mira **la última costura**: la que llega a los ojos del grupo sentado a la
mesa.

**Q4 — ¿puede esta frase que la pantalla muestra afirmar algo sobre los datos del grupo que no ha
ocurrido?** Nace directamente de CR-01 ronda 4 (`09-VERIFICATION.md`): `HistorySavedNotice.vue`
pintaba «la partida… sigue guardada en el dispositivo» sin que ningún valor de retorno lo
respaldara — `save()` descartaba a propósito el booleano de `writeRaw()` (decisión VOZ-06/D-51,
correcta para no bloquear `next()`/`prev()`, pero incompatible con la promesa nueva que la
interfaz hacía desde 09-16). El patrón es idéntico al de Q3, trasladado un nivel más arriba: de
«¿la función que devuelve el dato miente?» a «¿la pantalla que pinta el dato miente, aunque el
dato que recibe sea el correcto?». Sin Q4, una interfaz que compone una frase nueva a partir de
datos ya buenos —pero sin comprobar el booleano concreto que la sostiene— pasaría cualquier
barrido de Q1/Q2/Q3 sin que nadie lo notara hasta la quinta ronda.

**Criterio de inclusión** (para que el barrido sea reproducible y no una lista a ojo): entra en el
inventario **toda frase que la interfaz muestre y que afirme un hecho sobre el estado de los datos
persistidos del grupo** (histórico, progreso de partida, preferencia de voz): que existen, que se
guardaron, que se borraron, que siguen ahí, o que no hay ninguno. **NO** entran las etiquetas de
control («GANADA», «Cerrar aviso», «Histórico»), las preguntas («¿Cómo terminó la partida?»), el
contenido de las reglas del juego (texto de paso, opciones, avisos de turno) ni los textos que
describen una acción **futura** sin afirmar un estado **presente** («Se borrará el progreso
guardado…», «La pantalla se mantendrá encendida…»): esos son promesas de lo que la app va a hacer
a partir de un toque, no afirmaciones sobre lo que ya es cierto de los datos guardados.

**Veredictos, exactamente tres, uno por fila:**

- **RESPALDADA** — existe un valor de retorno concreto que sostiene la afirmación; se nombra la
  función y el fichero.
- **DEFECTO UI-xx** — la afirmación no tiene respaldo; identificador correlativo, con el escenario
  concreto en que resulta falsa. Por escribirse en este barrido, no por arreglarse aquí
  (`<scope_boundary>` de este plan: ningún fichero de código se toca).
- **ACEPTADO** — la afirmación es imprecisa o depende de una condición de baja probabilidad, pero
  el riesgo está evaluado explícitamente y es bajo. **La justificación tiene que ser de RIESGO,
  nunca de alcance de plan** — la regla que este mismo barrido nace de aplicar: el dictamen de
  `09-VERIFICATION.md` (ronda 4) sobre los dos diferidos reclasificados (WR-04, WR-05(b)) fue
  precisamente que su motivo de aplazamiento registrado «es una razón de ALCANCE DE PLAN, no una
  evaluación de riesgo aceptado», y por eso dejaron de ser diferidos válidos. Ningún `ACEPTADO` de
  este documento repite ese error: cada uno explica POR QUÉ el riesgo es bajo, nunca que "no
  entraba en el encargo".

**Ficheros sin ninguna afirmación de este tipo** (rótulos de control, contenido de reglas,
promesas de acción futura, estado de sesión en memoria que no compromete ningún dato persistido)
llevan una única fila con veredicto `NO APLICA` — no es un hueco del barrido, es que la pregunta
Q4 no tiene nada que morder ahí.

**Comandos ejecutados** (además de la lectura íntegra de los 24 ficheros y de
`useHistorySavedNotice.ts`/`useGameHistory.ts`, que es donde vive el texto que varios de estos
componentes solo interpolan):

```
find app -name "*.vue" | sort
grep -n "Partida guardada\|CONTINUAR\|savedSummary" app/pages "app/pages/[game]/index.vue" app/components/ResumePrompt.vue
grep -n "function save\|function load\|function resume\|function clear" app/composables/usePersistedSession.ts
grep -n "export function resume\|outcome:" engine/persistence.ts
```

---

## 2. Inventario

Una fila por cada fichero de `find app -name "*.vue" | sort`, en ese orden. Los ficheros con
varias afirmaciones llevan una fila por afirmación.

| Fichero | Afirmación (texto literal o su origen) | Valor de retorno que la respalda | Veredicto |
|---|---|---|---|
| `app/app.vue` | — (sin afirmación de estado: solo monta `<NuxtPwaManifest/>`, la banda de actualización y el aviso de histórico) | — | NO APLICA |
| `app/components/AppHeader.vue` | — (componente tonto: `sectionLabel`/`position`/`sessionContext` describen la posición actual de la sesión en memoria, no un hecho sobre datos guardados; `voiceState` es una etiqueta de control del botón de silencio, no una afirmación de que la preferencia se guardó) | — | NO APLICA |
| `app/components/ConfirmDialog.vue` | — (genérico: `title`/`body` llegan enteros por prop desde quien lo monta; este fichero no compone ninguna frase propia) | — | NO APLICA |
| `app/components/ContentChangedNotice.vue` | «La partida guardada ya no coincide con el contenido actual» (solo se monta cuando `awaitingContentChangedAck` es `true`) | `resume(persisted, structural)` (`engine/persistence.ts:88-123`) devuelve `outcome: 'content-changed'` exactamente cuando el `context` persistido no encaja con la estructura del contenido actual (verificado en el código: líneas 108-123, tres rutas de `content-changed` distintas, todas explícitas); `app/pages/[game]/index.vue:159-164` solo activa este aviso con ese `outcome` concreto | RESPALDADA |
| `app/components/CounterBand.vue` | — (`displayValue`/`defeated` son el estado de vida EN CURSO calculado por el motor sobre la sesión en memoria; no es una afirmación sobre si algo se guardó, se borró o sigue ahí) | — | NO APLICA |
| `app/components/GameOutcomeDialog.vue` | — (`contextLine`/`warningBody` describen la partida que se está a punto de cerrar y una acción FUTURA — «Se borrará el progreso guardado…» —, no un hecho ya comprobado; excluido por la regla de acción futura del §1) | — | NO APLICA |
| `app/components/GameSelectorScreen.vue` | — (`PRÓXIMAMENTE`/títulos de juego y los rótulos «Histórico»/«Estadísticas» son etiquetas de navegación, no afirmaciones sobre datos) | — | NO APLICA |
| `app/components/HistoryEntryCard.vue` | `resultLabel`/`causeLabel`/`contextLine`/`playerLines`/`noSelectionLine`/`roundAndDurationLine` — toda la tarjeta de una partida registrada | `buildHistoryCardView` (`app/composables/useGameHistory.ts:103-207`); el propio componente no calcula ni interpola nada, solo renderiza el resultado. Nota: las guardas de tipo de esa función (BF-01/BF-02, ya cerradas por 09-17 y registradas en `09-AUDIT-FRONTERAS.md` §3) son las que sostienen que esta tarjeta nunca pinte `undefined`/`NaN` literal — este barrido no las repite, solo confirma que el componente que las consume no añade ninguna afirmación propia encima | RESPALDADA |
| `app/components/HistorySavedNotice.vue` | «✓ Partida registrada» / «⚠ No se pudo guardar la partida» + cuerpo (tres variantes, incluida «La partida no se ha perdido: sigue guardada en el dispositivo…») | `resolveNoticeVariant(historyRecorded, progressSecured)` (`app/composables/useHistorySavedNotice.ts:39-42`), alimentada por `NOTICE_HEADING`/`NOTICE_BODY` (líneas 66-81); `historyRecorded` es el booleano real de `record()` (`appendHistoryEntry`) y `progressSecured` es el booleano real de `save()` (plan 09-18, `usePersistedSession.ts:313`), cableados en `app/pages/[game]/index.vue:607-611` (`onOutcomeRecorded`: `guardado = record(...)`, `progresoAsegurado = guardado ? false : save(session.value)`). Esto es precisamente el cierre de CR-01 (ronda 4) — la variante `failure-unrecoverable` (líneas 77-80) YA NO contiene «sigue guardada» ni la instrucción de reintentar, exactamente lo que `missing:` de `09-VERIFICATION.md` pedía | RESPALDADA |
| `app/components/IndexOverlay.vue` | Marcas `✓`/`●` (paso hecho / paso actual) en la lista de pasos | `tableOfContents(session.value.sequence, session.value.cursor)` (`app/pages/[game]/index.vue:231-233`, `engine/toc.ts`); el propio componente no guarda ningún estado de qué se ha visitado, solo pinta lo que la posición real del cursor ya determina | RESPALDADA |
| `app/components/MesaListaScreen.vue` | — (`checklist` es contenido de reglas del juego —qué repasar antes de empezar—, no un dato del grupo) | — | NO APLICA |
| `app/components/MiniSetupScreen.vue` | — («La pantalla se mantendrá encendida…» es una promesa de comportamiento futuro, excluida por la regla del §1; el resto son etiquetas de control) | — | NO APLICA |
| `app/components/NavBand.vue` | — (rótulos de los dos botones fijos, sin ninguna afirmación de datos) | — | NO APLICA |
| `app/components/PlayerModal.vue` | «ya lo lleva {nombre}» junto al héroe de la lista | `buildTakenByMap(playerSlots.value, activeSelectionModal.value.slot)` (`app/pages/[game]/index.vue:376-380`, `app/composables/useHeroSearch.ts:150-171`), sobre `playerSlots` derivado en vivo de `session.context` — refleja la asignación real de héroes entre jugadores de ESTA partida. Nota: el riesgo de que esta misma función **lance** con un `heroId` heredado de `Object.prototype` (`localStorage` manipulado a mano) es BF-05, ya identificado y registrado por `09-AUDIT-FRONTERAS.md` §3 — es un riesgo de Q2 (clave no confiable), no de Q4 (esta fila no encuentra ninguna afirmación FALSA, solo confirma que, cuando el componente consigue pintarse, lo que dice es cierto) | RESPALDADA |
| `app/components/ResumePrompt.vue` | «Partida guardada» + `{{ savedSummary }}` (solo se monta cuando `awaitingResumeChoice` es `true`) | `resume(persisted, structural)` (`engine/persistence.ts:88-144`) devuelve `outcome: 'resumed'` únicamente cuando `isPersistedPosition(persisted)` ya validó las 5 propiedades del envoltorio (verificado como `OK` por `09-AUDIT-FRONTERAS.md` §2); `app/pages/[game]/index.vue:158-161` solo activa este aviso con ese `outcome` concreto. `resume()` no forma parte del perímetro de 54 funciones de `09-AUDIT-FRONTERAS.md` (vive en `engine/persistence.ts`, no en los 3+3 ficheros que ese barrido cubrió), pero `09-VERIFICATION.md` (ronda 4) ya la verificó de forma independiente («`resume()` degrada a `'fresh'` ante un `context` no validable») | RESPALDADA |
| `app/components/StepScreen.vue` | — (contenido de reglas del paso actual — texto, opciones, avisos — y valores de contador EN CURSO, no afirmaciones sobre histórico/progreso/voz) | — | NO APLICA |
| `app/components/UpdateBanner.vue` | «Podéis seguir jugando y aplicarla cuando queráis: la partida se reanuda en el mismo paso» | Depende de que el autoguardado (`watchDebounced` de 300 ms sobre `session` + el listener de `pagehide`, `app/pages/[game]/index.vue:172-195`) haya escrito con éxito ANTES de que `updateServiceWorker(true)` recargue la página — y ese autoguardado, igual que `save()`/`saveVoicePreference()` en el resto de la app, **ignora a propósito** el booleano de `writeRaw()` (decisión ya documentada y aceptada en `09-AUDIT-FRONTERAS.md` §2, fila `save`, motivo VOZ-06/D-51: un fallo de almacenamiento no puede bloquear la partida). Riesgo evaluado, no de alcance: exige que el modo privado del navegador o la cuota llena coincidan EXACTAMENTE con el instante de recarga; y aun si ocurriera, el resultado es volver al mini-setup (una fricción de configurar de nuevo), no una pérdida de datos ni una confirmación falsa sobre un resultado ya jugado — categoría de impacto muy distinta de CR-01 (ronda 4), que afirmaba sobre el desenlace de una partida ya terminada | ACEPTADO |
| `app/components/VillainPickerModal.vue` | `✓` junto al villano marcado como elegido | `selectedVillainId` (`resolveVillainId(session.context)`, `engine/selection.ts`, ya verificada `OK` por `09-AUDIT-FRONTERAS.md` §2), pasada por prop desde `app/pages/[game]/index.vue` — refleja la elección real de la sesión en curso | RESPALDADA |
| `app/components/VoiceUnavailableNotice.vue` | «Sin voz en este dispositivo» | Describe una capacidad del dispositivo (síntesis de voz no disponible), no un dato persistido del grupo — excluida por el criterio de inclusión del §1 (no es histórico, progreso ni preferencia GUARDADA, es disponibilidad de hardware/SO en este momento) | NO APLICA |
| `app/components/WarningDetailModal.vue` | — (`heading`/`body` son contenido de reglas del paso —el detalle de un aviso o de una opción del turno—, no un dato del grupo) | — | NO APLICA |
| `app/pages/[game]/index.vue` | — (el propio fichero de página no compone ninguna frase propia sobre datos persistidos fuera de las que ya delega en los componentes de arriba; «No encontramos ese juego»/«Cargando…» son estados neutros de carga/routing) | — | NO APLICA |
| `app/pages/estadisticas.vue` | `row.valueLabel` («{wins} de {played} · {pct} %») en las tablas de héroe/villano | `toStatRowView`/`aggregateStatistics` (`engine/statistics.ts`, `app/composables/useGameHistory.ts:230-236`), ya auditadas `OK`/`ACEPTADO` (IN-13, cosmético) por `09-AUDIT-FRONTERAS.md` §2 — este barrido confirma que la plantilla no añade ninguna afirmación propia encima de esas cifras | RESPALDADA |
| `app/pages/estadisticas.vue` | «Todavía no hay estadísticas» (estado vacío, `statisticsView.emptyTitle`/`emptyBody`) | `buildStatisticsView`/`isEmpty` (`app/composables/useGameHistory.ts:241-272`), sobre `entries.value` cargado por `loadHistory()`. `loadHistory()` colapsa a propósito `read.kind !== 'ok'` —lo que incluye un `tga:history` `'unreadable'`— al mismo `[]` que «no hay ninguna partida» (`09-AUDIT-FRONTERAS.md` §2, fila `loadHistory`, veredicto `OK` documentado como colapso deliberado). Con un histórico realmente ilegible, esta pantalla dice «Todavía no hay estadísticas» cuando en realidad SÍ hay partidas, solo que no se pueden leer — el mismo riesgo, exactamente, que WR-02 ya registra en `deferred-items.md` para `/historico`. Se ENLAZA aquí en vez de duplicarse: es la misma causa raíz (`readEnvelope`/`loadHistory`), la misma decisión de riesgo ya evaluada (recuperar un blob `unreadable` exige una superficie de interfaz nueva que `09-UI-SPEC.md` no cubre), solo que `/estadisticas` no se había nombrado explícitamente hasta este barrido | ACEPTADO — mismo riesgo que WR-02 (`deferred-items.md`), extendido aquí a `/estadisticas` |
| `app/pages/historico.vue` | Tarjetas de partida (delegadas en `HistoryEntryCard`, ver fila propia arriba) | `cardViews` (`app/composables/useGameHistory.ts:306`) | RESPALDADA |
| `app/pages/historico.vue` | «Todavía no hay partidas registradas» (estado vacío, `!isEmpty`) | `isEmpty` (`app/composables/useGameHistory.ts:308`), mismo `entries.value`/`loadHistory()` que la fila de `estadisticas.vue` de arriba. Este es el caso NOMBRADO explícitamente por el propio `<read_first>` de este plan y por WR-02 en `deferred-items.md`: con un `tga:history` `'unreadable'` de forma permanente, esta pantalla afirma «todavía no hay partidas» cuando en realidad SÍ las hay y no se pueden leer. **Se ENLAZA a WR-02 en vez de duplicarse** — el motivo de aplazamiento de WR-02 ya es de RIESGO (exige una superficie de interfaz nueva de archivado/recuperación, no construida a ciegas en un cierre de huecos), no de alcance, así que sigue siendo una razón de aplazamiento válida bajo el criterio que este mismo documento aplica | ACEPTADO — WR-02 (`deferred-items.md`), confirmado vigente por este barrido |
| `app/pages/index.vue` | — (compone `GameSelectorScreen` con el catálogo real de juegos y navega; ninguna frase propia) | — | NO APLICA |

---

## 3. Defectos

Ningún `DEFECTO UI-xx` nuevo. Los tres BLOCKER/afirmaciones sin respaldo que las rondas 3 y 4 de
`09-VERIFICATION.md` encontraron en esta misma superficie (`.vue`) — CR-01 ronda 4
(`HistorySavedNotice.vue`), y las dos piezas accionables de WR-04/WR-05(b) — ya están cerrados por
los planes 09-18 (`save()` devuelve el resultado real), 09-19 (foco y nombre accesible en
`GameOutcomeDialog.vue`) y 09-22 (las bandas fuera de flujo). Este barrido los ha vuelto a leer
directamente en el código (no ha aceptado los SUMMARY sin contrastar) y confirma que las
afirmaciones actuales de esas tres superficies están respaldadas. Las dos afirmaciones que este
barrido añade como `ACEPTADO` (`UpdateBanner.vue`, y el estado vacío compartido de
`estadisticas.vue`/`historico.vue`) llevan razón de riesgo explícita, no de alcance — ninguna
exige un cambio de código bajo el `<scope_boundary>` de este plan.

---

## 4. Recuento

- **Ficheros auditados:** 24 (coincide exactamente con `find app -name "*.vue" | wc -l`).
- **Afirmaciones inventariadas:** 12 (filas con veredicto distinto de `NO APLICA`).
- **Desglose por veredicto:**
  - `RESPALDADA`: 9 (`ContentChangedNotice.vue`, `HistoryEntryCard.vue`, `HistorySavedNotice.vue`, `IndexOverlay.vue`, `PlayerModal.vue`, `ResumePrompt.vue`, `VillainPickerModal.vue`, `estadisticas.vue` [filas de tabla], `historico.vue` [tarjetas])
  - `DEFECTO UI-xx`: 0
  - `ACEPTADO`: 3 (`UpdateBanner.vue`, `estadisticas.vue` [estado vacío], `historico.vue` [estado vacío])
  - `NO APLICA`: 14 (`app.vue`, `AppHeader.vue`, `ConfirmDialog.vue`, `CounterBand.vue`, `GameOutcomeDialog.vue`, `GameSelectorScreen.vue`, `MesaListaScreen.vue`, `MiniSetupScreen.vue`, `NavBand.vue`, `StepScreen.vue`, `VoiceUnavailableNotice.vue`, `WarningDetailModal.vue`, `app/pages/[game]/index.vue`, `app/pages/index.vue`)

Comprobación de suma: 9 (RESPALDADA) + 0 (DEFECTO) + 3 (ACEPTADO) = 12 afirmaciones; 12
afirmaciones + 14 `NO APLICA` = 26 filas totales sobre 24 ficheros (dos ficheros —
`estadisticas.vue`, `historico.vue` — aportan 2 filas cada uno). ✓

---

## 5. La regla que este barrido deja escrita para el futuro

**Ninguna frase que la interfaz muestre al grupo sobre el estado de sus datos puede carecer de un
valor de retorno real que la respalde; si hace falta una frase nueva, primero el booleano que la
sostiene y el test que lo fija, después el texto.**

Esta es la extensión de perímetro que Q4 aporta a `09-AUDIT-FRONTERAS.md`: aquel documento cubría
Q1/Q2/Q3 sobre composables y motor y dejó explícitamente fuera —por diseño, en su §5— los ficheros
`.vue`. Esa exclusión, hecha por motivo de ALCANCE DE PLAN y no de riesgo evaluado, fue exactamente
el hueco por el que CR-01 (ronda 4) se coló. Este documento cierra esa exclusión con una cuarta
pregunta explícita, y dictamina que en adelante ninguna superficie de interfaz puede quedar fuera
de un barrido de afirmaciones por el mismo motivo que ya se demostró insuficiente una vez.
