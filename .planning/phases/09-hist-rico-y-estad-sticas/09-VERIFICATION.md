---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-19T02:20:00Z
status: gaps_found
score: 4/5 must-haves verified
covered_files: [".planning/REQUIREMENTS.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-32-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-32-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-33-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-33-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-34-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-34-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-35-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-35-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-36-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-36-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-REVIEW.md", "app/components/ContentChangedNotice.vue", "app/components/HistorySavedNotice.vue", "app/components/ResumePrompt.vue", "app/composables/__tests__/afirmacionesRespaldadas.test.ts", "app/composables/__tests__/avisoTrasRegistroFallido.test.ts", "app/composables/__tests__/useGameEndCopy.test.ts", "app/composables/__tests__/useHistorySavedNotice.test.ts", "app/composables/__tests__/useProgressMismatchMark.test.ts", "app/composables/useGameEndCopy.ts", "app/composables/useHistorySavedNotice.ts", "app/composables/useProgressMismatchMark.ts", "app/composables/useStoredProgress.ts", "app/pages/[game]/index.vue"]
covered_digest: "v1:sha256:0f73261f51e59609dba36c0355efe91465081cda168a474db5464b148bdec947"
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Los tres hallazgos LITERALES de la ronda 7 (CR-01/CR-02/CR-03 de la ronda 6 de `09-REVIEW.md`, adjudicados por el veredicto anterior) están genuinamente cerrados en su forma textual: `NOTICE_BODY['failure-stale']` (`useHistorySavedNotice.ts:77`) ya no afirma anterioridad temporal ni diferencia de ronda — confirmado leyendo el texto nuevo y el test 5 de `avisoTrasRegistroFallido.test.ts`, que fija por escrito el contraejemplo (round igual, runtimeId distinto) del propio escenario canónico."
    - "`endGameBody` (ahora `buildEndGameBody` en `app/composables/useGameEndCopy.ts`) ya no promete un reintento que dos de los cuatro estados del dispositivo contradecían; su única promesa («el progreso no se borrará y la app os avisará») está pinchada por un test puro (`useGameEndCopy.test.ts`) con aserciones negativas dedicadas contra 'conservar'/'reintentar' — confirmado por lectura directa del `.ts` y de `index.vue:504-506`, donde los dos `computed` quedan reducidos a la llamada."
    - "El motivo escrito falso en `AFIRMACIONES_AUDITADAS` que afirmaba 'cierto en las cuatro salidas' ya no existe: la entrada se movió a `useGameEndCopy.ts` con un motivo corregido, y el gate de clase ahora exige que todo `motivo` venga acompañado de un `respaldo` que resuelva a un fichero real (`respaldoExiste`) — confirmado leyendo `afirmacionesRespaldadas.test.ts:150-220`."
    - "El gate de clase cerró las cinco vías concretas que la ronda 7 documentó como evasión: (a) vocabulario cerrado de 11 subcadenas sustituido por `RAICES_SOBRE_LOS_DATOS_DEL_GRUPO` (raíces léxicas con test de subsunción contra las 11 subcadenas viejas); (b) Gate B ahora recorre `NOTICE_HEADING` además de `NOTICE_BODY`; (c) `LITERALES_VARIANTE` de Gate C incluye `'success'`, con test dedicado; (d) `normalizarEspacios` colapsa espacios/saltos de línea antes de comparar, con un caso de Gate S que ejercita una raíz partida en dos líneas; (e) la decisión de Gate A se extrajo a `frasesSinAuditarDe`, función pura exportada, y Gate S la ejerce con mutaciones sintéticas (confirmado leyendo el fichero, no solo el SUMMARY del plan 09-35)."
    - "Ningún `.vue` escribe ya a mano un literal de `NoticeVariant`: `isSuccessVariant(variant)` centraliza la comparación (`useHistorySavedNotice.ts`), consumida por `HistorySavedNotice.vue` — confirmado por lectura directa."
  gaps_remaining:
    - "SC3 SIGUE FALLANDO — novena cara del mismo defecto de fondo, esta vez dentro del propio mecanismo (`useProgressMismatchMark.ts`) que el lote 09-32..09-35 construyó para cerrar la octava. Confirmado por trazado de código independiente (no por importar el veredicto de `09-REVIEW.md` sin contrastar): `onResumeContinue` (`app/pages/[game]/index.vue`, función sin llamada a `clearProgressMismatch` en ningún punto de su cuerpo — verificado con `grep -n clearProgressMismatch` sobre el fichero completo, que solo devuelve las líneas de `onDiscardConfirm`, `finishGame` y `onOutcomeRecorded`) deja la marca puesta cuando el grupo pulsa «Continuar» sobre el snapshot ajeno. El autoguardado de 300 ms (`watchDebounced`, líneas 205-213) sobrescribe después ese mismo snapshot con progreso legítimo de la partida en curso — el referente de la marca deja de existir. Si el grupo abandona esa partida sin terminarla (navegación de cliente confirmada, sin recarga de documento) y vuelve a entrar, `onMounted` vuelve a leer `readProgressMismatchWarning(gameId)` y sigue devolviendo el aviso, ahora **falso**: ningún cierre de partida ha ocurrido desde entonces y lo que hay en disco no es ya el snapshot que la marca describía. `ResumePrompt` mostraría una frase de la clase exacta que esta fase lleva ocho rondas cerrando, pero esta vez producida por el propio mecanismo de mitigación. CONFIRMO CR-01 de `09-REVIEW.md` por lectura directa e independiente."
    - "Segundo hallazgo confirmado por separado: cuando el montaje resuelve `content-changed-notice` en vez de `resume-prompt` (mismo escenario de snapshot ajeno, pero con contenido desactualizado entre sesiones), `onMounted` calcula igualmente `avisoDiscrepancia.value = readProgressMismatchWarning(gameId)` (línea 202, ejecutada sin condición de rama), pero `<ContentChangedNotice>` (montada en la plantilla, líneas 844-849) no acepta ninguna prop de aviso y no lo pinta — confirmado leyendo `ContentChangedNotice.vue` completo (`defineProps<{ sessionContext, sectionLabel }>()`, sin `mismatchWarning`) y la plantilla de `index.vue`. Además `onContentChangedAcknowledge` (línea 746) tampoco retira la marca, así que el mismo problema de fondo del hallazgo anterior aplica también por esta rama. CONFIRMO WR-01 de `09-REVIEW.md` por lectura directa."
    - "Un tercer hallazgo, no de código sino de la propia documentación que este lote escribió para cerrar la ronda: `deferred-items.md` (sección «La marca de progreso que no coincide vive en memoria», añadida por el plan 09-36) evalúa el riesgo residual únicamente para el caso de PÉRDIDA de la marca (recarga completa) y concluye por escrito que «cuando la marca no está, la app no afirma nada — no dice algo falso» y que «lo que se pierde en ese caso es la advertencia, no la corrección». Esa evaluación no contempla el caso que CR-01 confirma — la marca SIGUE puesta pero ya es falsa — que es exactamente lo contrario de lo que el texto garantiza por escrito. Es la misma clase de anti-patrón que la ronda 7 encontró en `AFIRMACIONES_AUDITADAS` (un motivo/evaluación de riesgo escrito que no cubre el caso que de verdad importa), reproducida ahora en `deferred-items.md`."
    - "El gate de clase (`afirmacionesRespaldadas.test.ts`) mejoró de forma sustancial y cierra genuinamente las cinco vías literales que la ronda 7 documentó (ver gaps_closed), pero sigue sin poder cumplir su propósito declarado frente a la NOVENA cara: (1) estructuralmente, el gate audita texto (`NOTICE_BODY`/`NOTICE_HEADING`/literales de variante) contra su respaldo, no invariantes de ciclo de vida de estado — CR-01 no es una frase sin respaldo en el momento en que se escribe, es una frase que TENÍA respaldo y lo pierde por un camino de código que nunca la invalida; ningún gate de este fichero mira los puntos de invalidación de `useProgressMismatchMark`. (2) El propio mecanismo de auditoría que el lote reforzó tiene dos evasiones propias, confirmadas por lectura directa del test: `respaldoExiste` (líneas 167-176) solo comprueba que la ruta citada en `respaldo` existe en el árbol, nunca que su contenido respalde la `raiz`/motivo citados — una entrada de `AFIRMACIONES_AUDITADAS` podría citar cualquier fichero real no relacionado y pasaría igual (CONFIRMO WR-02). (3) El detector de motivo circular (líneas 967-979) solo se activa si el motivo contiene literalmente la subcadena `'la garantía real la da'` — cualquier motivo circular con otra redacción (p. ej. «eso ya lo cubre el otro gate») nunca entra en el `if` y pasa con solo el umbral de 40 caracteres, reproduciendo un nivel más arriba exactamente el patrón de vocabulario cerrado que este mismo lote sustituyó por raíces en Gate A/B (CONFIRMO WR-03). Ninguno de los tres es hipotético: (1) tiene una instancia real hoy en el árbol (CR-01)."
  regressions: []
gaps:
  - truth: "SC3: «Partida terminada» borra la sesión en curso pero nunca el histórico, que vive en localStorage como fuente de verdad — y ninguna afirmación de la interfaz sobre esos datos puede carecer de comprobación real"
    status: failed
    reason: >
      Confirmado por trazado de código independiente, no por aceptar el veredicto de
      `09-REVIEW.md` sin contrastar. El lote 09-32..09-35 cerró genuinamente las tres caras
      literales que la ronda 7 dejó documentadas (copy de `failure-stale` sin afirmaciones no
      respaldadas; `endGameBody` sin promesa de reintento falsa; una marca en memoria que hace
      viajar en el tiempo el conocimiento de que el snapshot guardado no coincide). Pero el propio
      mecanismo construido para cerrar el tercer hallazgo introduce una NOVENA cara del mismo
      defecto de fondo:

      (1) `onResumeContinue` (`app/pages/[game]/index.vue`) no llama a `clearProgressMismatch`.
      Cuando el grupo pulsa «Continuar» sobre un snapshot que la app ya identificó como ajeno, la
      marca queda puesta. El autoguardado de 300 ms sobrescribe después ese snapshot con progreso
      legítimo de la partida en curso — el referente de la marca ya no existe. Si el grupo
      abandona esa partida sin terminarla (navegación de cliente, sin recarga) y reentra, el
      modal de reanudación vuelve a mostrar el aviso «la app no pudo registrarla y comprobó que
      lo que había guardado no era el punto en el que habíais terminado» — una frase que en ese
      momento es literalmente falsa: ningún cierre de partida ha ocurrido desde el momento en que
      la marca se puso. Confirmado leyendo `app/pages/[game]/index.vue` completo: las únicas tres
      llamadas a `clearProgressMismatch` en todo el fichero son `onDiscardConfirm`, `finishGame` y
      la rama `else` de `onOutcomeRecorded` — ninguna cubre `onResumeContinue`.

      (2) Cuando el montaje resuelve `content-changed-notice` en vez de `resume-prompt`,
      `onMounted` calcula igualmente el aviso de discrepancia, pero `<ContentChangedNotice>` no
      tiene ninguna prop para mostrarlo y `onContentChangedAcknowledge` tampoco retira la marca —
      confirmado leyendo `ContentChangedNotice.vue` completo (sin prop `mismatchWarning`) y el
      cuerpo de `onContentChangedAcknowledge` (`index.vue:746-748`, solo cierra el `ref` de la
      pantalla, no la marca).

      (3) La documentación que el propio lote escribió para cerrar la ronda
      (`deferred-items.md`, sección de la marca en memoria) evalúa el riesgo residual solo para
      el caso de PÉRDIDA de la marca y concluye por escrito que «cuando la marca no está, la app
      no afirma nada — no dice algo falso»; no contempla el caso, confirmado arriba, en el que la
      marca SIGUE puesta y ya es falsa — lo contrario exacto de la garantía escrita. Es el mismo
      patrón de motivo/evaluación de riesgo que no cubre el caso que importa, ya visto en rondas
      anteriores con `AFIRMACIONES_AUDITADAS`.

      `npm test` (976/976) y `npm run typecheck` (exit 0) están en verde: ninguno de los tres
      hallazgos rompe ningún test existente, porque ningún test ejercita el camino
      «Continuar» → autoguardado → navegar fuera sin terminar → reentrar. Un test suite en verde
      vuelve a no ser evidencia de que SC3 se cumpla.
    artifacts:
      - path: "app/pages/[game]/index.vue"
        issue: "onResumeContinue no llama a clearProgressMismatch(gameId): tras continuar sobre un snapshot marcado como ajeno, la marca sobrevive al autoguardado que sustituye su referente por progreso legítimo. onContentChangedAcknowledge tampoco la retira."
      - path: "app/composables/useProgressMismatchMark.ts"
        issue: "Documenta su propio invariante ('la marca está puesta exactamente cuando... el progreso que dejó sigue ahí') sin que ningún llamante lo haga cumplir en el camino de continuar la partida"
      - path: "app/components/ContentChangedNotice.vue"
        issue: "No acepta ninguna prop de aviso de discrepancia; el aviso calculado en onMounted para esta rama no tiene ningún destino de render"
      - path: ".planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md"
        issue: "La entrada 'La marca de progreso que no coincide vive en memoria' evalúa el riesgo residual solo para la pérdida de la marca y afirma por escrito 'no dice algo falso', sin cubrir el caso confirmado en el que la marca persiste y ya es falsa"
    missing:
      - "Llamar a clearProgressMismatch(gameId) en onResumeContinue, en el mismo instante en que continuar supera al snapshot que la marca describía (fix propuesto literalmente por CR-01 de 09-REVIEW.md)"
      - "Decidir y aplicar una de las dos vías de WR-01 para la rama content-changed-notice: extender ContentChangedNotice con la misma prop opcional que ResumePrompt, o al menos retirar la marca en onContentChangedAcknowledge para que no pueda resurgir después como afirmación falsa"
      - "Corregir la evaluación de riesgo de deferred-items.md para que distinga explícitamente 'la marca se pierde' (aceptado) de 'la marca persiste y deja de ser cierta' (el caso que CR-01 confirma, no evaluado hoy)"
      - "Un test de extremo a extremo sobre useProgressMismatchMark que reproduzca el camino completo: marcar → onResumeContinue → autoguardado → clearProgressMismatch ya no puesta, para que la novena cara no dependa de que otra ronda de verificación la vuelva a encontrar a mano"
  - truth: "El gate automatizado que protege la garantía de SC3 para toda la clase de defecto (no solo el caso puntual de cada ronda) inspecciona de verdad las superficies de riesgo y detendría la siguiente cara del defecto"
    status: failed
    reason: >
      El gate de clase (`afirmacionesRespaldadas.test.ts`) cerró de verdad las cinco vías
      concretas que la ronda 7 dejó documentadas (vocabulario por raíces con test de subsunción,
      NOTICE_HEADING dentro de Gate B, 'success' en Gate C, normalización de espacios, decisión
      de Gate A extraída a función pura y ejercida por Gate S) — confirmado leyendo el fichero
      completo y las pruebas dedicadas a cada vía. Pero sigue sin poder cumplir su propósito
      declarado frente a la clase de defecto que existe para prevenir, por dos razones distintas,
      ninguna hipotética:

      (1) Estructuralmente, el gate audita TEXTO (NOTICE_BODY/NOTICE_HEADING/literales de
      variante) contra su respaldo en el momento en que se escribe. CR-01 no es una frase sin
      respaldo al escribirse — es una frase que SÍ tenía respaldo y lo pierde por un camino de
      código (onResumeContinue → autoguardado) que ningún gate de este fichero recorre: el gate no
      mira invariantes de ciclo de vida de estado de módulo, solo compara cadenas de texto contra
      un mapa de excepciones auditadas. La clase de defecto que esta ronda encuentra (una
      afirmación que ERA cierta y deja de serlo sin que nada la invalide) es estructuralmente
      invisible para un gate que solo compara texto contra respaldo estático.

      (2) El propio mecanismo de auditoría que este lote reforzó (`respaldoExiste`,
      el detector de motivo circular) tiene dos evasiones confirmadas por lectura directa:
      `respaldoExiste` solo comprueba que la ruta citada existe en el árbol, nunca que su
      contenido respalde la raíz/motivo citados — una cita a un fichero real pero no relacionado
      pasaría igual (WR-02). El detector de motivo circular solo se activa si el motivo contiene
      la subcadena literal 'la garantía real la da' — cualquier motivo circular con otra
      redacción nunca entra en esa comprobación y pasa solo con el umbral de 40 caracteres,
      reproduciendo un nivel más arriba el mismo patrón de vocabulario cerrado que este lote
      sustituyó por raíces en Gate A/B (WR-03). El umbral de longitud (40 caracteres) es además
      trivialmente rellenable con prosa sin sustancia (INFO-01 de 09-REVIEW.md, confirmado).

      Ninguno de los dos es hipotético: (1) tiene una instancia real y sin detectar hoy mismo en
      el árbol (CR-01, la marca de useProgressMismatchMark.ts).
    artifacts:
      - path: "app/composables/__tests__/afirmacionesRespaldadas.test.ts"
        issue: "líneas 167-176 (respaldoExiste solo comprueba existencia de ruta, no relevancia de contenido); líneas 967-979 (detector de motivo circular gateado tras una subcadena literal única, evasible con otra redacción); líneas 959-965 (umbral de 40 caracteres, gameable por relleno); el fichero entero no tiene ningún gate que recorra invariantes de ciclo de vida de estado de módulo (useProgressMismatchMark.ts no está cubierto por ninguna vía de Gate A/B/C/S para el defecto de CR-01, que no es de texto sino de invalidación)"
    missing:
      - "Aplicar el fix de WR-03: hacer incondicional la comprobación de 'nombra un fichero o identificador comprobable' para todo motivo de AFIRMACIONES_AUDITADAS, no solo cuando coincide con la frase circular conocida"
      - "Aplicar el fix de WR-02: una comprobación mínima de relevancia de contenido (que el fichero de respaldo contenga la raíz o el símbolo exportado que el motivo nombra), no solo su existencia en el árbol"
      - "Reconocer por escrito, en el propio fichero del gate, que su alcance es texto-contra-respaldo y que NO cubre invariantes de estado de módulo como el de useProgressMismatchMark.ts — y decidir si esa clase de invariante necesita su propio gate (p. ej. un test que reproduzca el camino continuar→autoguardado→reentrar) en vez de asumir que Gate A/B/C/S ya la cubre"
deferred: []
human_verification:
  - test: "Comprobación visual en tablet horizontal real (viewport ~1180×820, npm run dev): terminar una partida con la variante de aviso de fallo (larga, 20s) visible y observar si tapa controles de la cabecera de /historico, y provocar (o simular con devtools) una detección de actualización de PWA simultánea al aviso de histórico para confirmar visualmente si una banda tapa por completo a la otra. Añadido por esta ronda: comprobar también que el texto reescrito de NOTICE_BODY['failure-stale'] (útil-composables/useHistorySavedNotice.ts) se lee bien a un brazo de distancia con su longitud nueva, y que el aviso nuevo de discrepancia dentro de ResumePrompt (PROGRESS_MISMATCH_WARNING, useProgressMismatchMark.ts) no desborda ni se corta visualmente dentro del modal de reanudación en el mismo viewport."
    expected: "Ninguna banda debería impedir ver o tocar los controles de cabecera de /historico, y si ambas bandas coinciden en el tiempo, ambas deberían seguir siendo visibles y utilizables (apiladas, no superpuestas). El texto de failure-stale y el aviso de ResumePrompt deben leerse completos, sin desbordar el modal ni el aviso."
    why_human: "Es un juicio visual sobre solapamiento y desbordamiento real en un viewport físico — greppear el CSS ya demuestra que ambas bandas comparten exactamente `fixed top-0 inset-x-0 z-40` con fondo opaco y se montan como hermanas (sin cambios de estructura CSS desde la ronda 5), pero solo un humano puede confirmar el impacto real en pantalla. Sigue PENDIENTE explícitamente bajo DEV-02 de REQUIREMENTS.md desde 09-22-SUMMARY.md; los dos puntos de guion añadidos por esta ronda (texto de failure-stale reescrito, aviso nuevo de ResumePrompt) son superficie de pantalla nueva desde la ronda 7 que nadie ha visto renderizada todavía en un dispositivo físico."
---

# Fase 9: Histórico y estadísticas — Informe de verificación (8ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-19
**Estado:** gaps_found (SC3 sigue sin cumplirse — novena cara del mismo defecto de fondo, esta vez dentro del propio mecanismo construido para cerrar la octava; el gate de clase sigue sin poder detener esta clase concreta de fallo)
**Re-verificación:** Sí — tras el lote de cierre 09-32..09-36 y el code review de la ronda 7 (`09-REVIEW.md`)

## Resumen ejecutivo

El lote 09-32..09-36 cierra genuinamente los tres hallazgos LITERALES que la ronda 7 dejó
documentados, confirmado leyendo el código fuente, no los SUMMARY:

- **Hallazgo 1 (copy de `failure-stale`):** cerrado. La frase nueva ya no afirma anterioridad
  temporal ni diferencia de ronda; el test 5 de `avisoTrasRegistroFallido.test.ts` fija por
  escrito el contraejemplo del propio escenario canónico.
- **Hallazgo 2 (promesa de reintento de `endGameBody`):** cerrado. `buildEndGameBody`
  (`app/composables/useGameEndCopy.ts`, nuevo) solo promete lo que `preserveProgress` garantiza
  en las cuatro salidas, con test puro y aserciones negativas dedicadas. El motivo falso de
  `AFIRMACIONES_AUDITADAS` que sellaba el hueco («cierto en las cuatro salidas») ya no existe.
- **Hallazgo 3 (snapshot `'stale'` reofrecido sin marca):** cerrado en su forma directa. Una
  marca en memoria (`app/composables/useProgressMismatchMark.ts`, nuevo) transporta el hecho
  comprobado al cerrar hasta el modal de reanudación.

El gate de clase (`afirmacionesRespaldadas.test.ts`) también cerró las cinco vías de evasión
concretas que la ronda 7 documentó: vocabulario por raíces léxicas (con test de subsunción
contra las 11 subcadenas viejas), `NOTICE_HEADING` dentro de Gate B, `'success'` vigilado en
Gate C, normalización de espacios/saltos de línea, y la decisión de Gate A extraída a una
función pura (`frasesSinAuditarDe`) que Gate S ejerce con mutaciones sintéticas. Confirmado
leyendo el fichero completo, no el SUMMARY del plan 09-34/09-35.

**Pero el objetivo de la fase (SC3) sigue sin alcanzarse.** El propio mecanismo construido para
cerrar el tercer hallazgo de la ronda 7 introduce una **novena cara** del mismo defecto de
fondo. He adjudicado independientemente, releyendo el código fuente (no importando el veredicto
de `09-REVIEW.md` sin contrastar), los tres hallazgos de esa revisión, y los confirmo:

1. **CR-01 (crítico, confirmado):** `onResumeContinue` no llama a `clearProgressMismatch`. Tras
   pulsar «Continuar» sobre un snapshot ya identificado como ajeno, la marca sobrevive al
   autoguardado de 300 ms que sustituye ese snapshot por progreso legítimo de la partida en
   curso. Si el grupo abandona esa partida sin terminarla y reentra, el modal de reanudación
   vuelve a mostrar el aviso — ahora **falso**: ningún cierre de partida ha ocurrido desde
   entonces. Confirmado leyendo el fichero completo: las únicas tres llamadas a
   `clearProgressMismatch` son `onDiscardConfirm`, `finishGame` y la rama `else` de
   `onOutcomeRecorded` — ninguna cubre `onResumeContinue`.
2. **WR-01 (confirmado):** en la rama `content-changed-notice`, el aviso se calcula pero
   `<ContentChangedNotice>` no tiene ninguna prop para mostrarlo, y `onContentChangedAcknowledge`
   tampoco retira la marca — mismo problema de fondo, segunda rama sin cubrir.
3. **Hallazgo adicional de esta ronda, sobre la propia documentación del lote:**
   `deferred-items.md` evalúa el riesgo residual de la marca solo para el caso de PÉRDIDA
   (recarga completa) y afirma por escrito que «cuando la marca no está, la app no afirma
   nada — no dice algo falso». Esa afirmación no cubre el caso que CR-01 confirma: la marca
   SIGUE puesta y ya es falsa. Es el mismo patrón — un texto que sella un hueco sin cubrir el
   caso que de verdad importa — que rondas anteriores encontraron en `AFIRMACIONES_AUDITADAS`.

`npm test` (976/976) y `npm run typecheck` (exit 0) están en verde: ninguno de los tres
hallazgos rompe ningún test existente porque ningún test ejercita el camino completo
«continuar → autoguardado → salir sin terminar → reentrar». Un test suite en verde vuelve a no
ser evidencia de que SC3 se cumpla.

Un segundo hallazgo, sobre el gate de clase mismo: aunque cerró las cinco vías de la ronda 7,
sigue sin poder atrapar esta novena cara por dos razones. Estructuralmente, el gate audita texto
contra respaldo en el momento en que se escribe — CR-01 es una frase que SÍ tenía respaldo y lo
pierde por un camino de código que ningún gate de este fichero recorre; no es un defecto de
copy sin respaldo, es un defecto de invalidación de estado. Además, el propio mecanismo de
auditoría reforzado por este lote tiene dos evasiones confirmadas por lectura directa:
`respaldoExiste` (WR-02) solo comprueba que la ruta citada existe, nunca que su contenido
respalde la afirmación; el detector de motivo circular (WR-03) solo se activa ante una subcadena
literal única, reproduciendo un nivel más arriba el mismo patrón de vocabulario cerrado que este
lote sustituyó por raíces en Gate A/B.

**Nota de trazabilidad:** `REQUIREMENTS.md` sigue marcando HIST-06 como `[ ]` (correctamente,
tal como el plan 09-36 documenta explícitamente que debía quedar pendiente de esta
verificación). `ROADMAP.md` cuenta 36/36 planes según el plan 09-36; no se ha revisado en esta
ronda si esa entrada marca o no la Fase 9 como completa — el SUMMARY del plan 09-36 afirma que
no lo hace («sin marcar la fase como verificada ni completa»), confirmado con
`grep -c "^- \[ \] \*\*Phase 9:" ROADMAP.md` → 1.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria del ROADMAP) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o cerrar sin registrar | ✓ VERIFIED | Sin cambios desde rondas anteriores; `onOutcomeDismiss` (`index.vue:736`) sigue terminando sin registrar, sin condiciones. Regresión rápida confirmada en el árbol actual |
| 2 | SC2: el registro incluye resultado/causa/villano/héroe/nombres/fecha/dificultad/nº jugadores/duración/rondas, calculados por el motor | ✓ VERIFIED (flujo normal) | `buildHistoryEntry` (`engine/history.ts`) sin cambios en este lote. Mismo matiz que rondas anteriores en la rama de reintento — ver gap de SC3 |
| 3 | SC3: histórico listable/borrable con confirmación; «Partida terminada» borra solo la sesión, nunca el histórico — sin confirmaciones falsas ante un fallo | ✗ FAILED | Mecánica de listar/borrar/no-tocar-histórico sigue VERIFICADA sin cambios. La garantía de «ninguna afirmación no comprobada» FALLA de nuevo, novena variante — confirmado por trazado de código independiente sobre `onResumeContinue`/`useProgressMismatchMark.ts`/`ContentChangedNotice.vue` |
| 4 | SC4: pantalla de estadísticas accesible desde inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | Sin cambios desde rondas anteriores. Regresión rápida: `app/pages/estadisticas.vue` presente (91 líneas), sin cambios en este lote |
| 5 | SC5: estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -rniE "firestore|firebase" app/ engine/` sigue sin producir ningún resultado, ejecutado de nuevo en esta ronda |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/composables/useHistorySavedNotice.ts` `NOTICE_BODY['failure-stale']` | Copy que afirma exactamente lo que `esLaMismaPartida` comprobó | ✓ VERIFIED | Reescrita (línea 77); confirmado por lectura y por `useHistorySavedNotice.test.ts`/`avisoTrasRegistroFallido.test.ts` en verde |
| `app/composables/useGameEndCopy.ts` `buildEndGameBody`/`buildDiscardBody` | Copy del diálogo de fin de partida sin promesa falsa, con test puro | ✓ VERIFIED | Fichero nuevo, confirmado por lectura; `index.vue` reducido a la llamada |
| `app/composables/useHistorySavedNotice.ts` `isSuccessVariant` | Única vía para distinguir el tono del aviso sin literal a mano | ✓ VERIFIED | Confirmado por lectura de `useHistorySavedNotice.ts` y `HistorySavedNotice.vue` |
| `app/composables/useProgressMismatchMark.ts` | Marca en memoria que hace viajar el conocimiento de discrepancia hasta el modal de reanudación | ⚠ INSUFICIENTE (invariante documentado, no forzado en todos los caminos) | La marca se pone y se lee correctamente (confirmado con `useProgressMismatchMark.test.ts`), pero `onResumeContinue` y `onContentChangedAcknowledge` no la invalidan cuando su referente deja de existir — CR-01/WR-01 |
| `app/pages/[game]/index.vue` `onResumeContinue` | No dejar sobrevivir una marca cuyo referente el propio flujo va a sustituir | ✗ STUB (para este camino) | Ninguna llamada a `clearProgressMismatch` en su cuerpo, confirmado por lectura completa del fichero |
| `app/components/ContentChangedNotice.vue` | Mostrar (o al menos no dejar resurgir) el aviso de discrepancia en su propia rama de montaje | ✗ STUB | Sin prop `mismatchWarning`; `onContentChangedAcknowledge` no retira la marca |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (gate de clase) | Impide que CUALQUIER afirmación nueva sobre los datos del grupo pase sin respaldo, en cualquier `.vue`/`.ts` | ⚠ MEJORADO PERO INSUFICIENTE | Las cinco vías literales de la ronda 7 están cerradas (confirmado). Pero `respaldoExiste` (WR-02) y el detector de motivo circular (WR-03) tienen evasiones propias, y el gate en su conjunto no cubre invariantes de ciclo de vida de estado de módulo — la clase de defecto de CR-01 |
| `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` | Evaluación de riesgo honesta del residuo aceptado de la marca en memoria | ✗ STUB (respecto a la garantía escrita) | Afirma «no dice algo falso» sin cubrir el caso, confirmado en esta ronda, en el que la marca persiste y ya es falsa |
| `app/pages/estadisticas.vue`, `app/pages/historico.vue` | Pantallas completas, wireadas a `useGameHistory` | ✓ VERIFIED | Sin cambios desde rondas anteriores (91 y 101 líneas, presentes) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `onOutcomeRecorded` | `markProgressMismatch`/`clearProgressMismatch` | `planGameEnd(...).progressMismatch` decide, `if/else` obligatorio pone o retira | ✓ WIRED | Confirmado literalmente en `index.vue:709-718` |
| `onResumeContinue` | `clearProgressMismatch` | invalidación al continuar sobre el snapshot marcado | ✗ NOT_WIRED | Ninguna llamada en el cuerpo de la función — CR-01 |
| `onMounted` (rama `content-changed-notice`) | `<ContentChangedNotice>` | prop de aviso de discrepancia | ✗ NOT_WIRED | El aviso se calcula pero no tiene destino de render en esa rama — WR-01 |
| `onContentChangedAcknowledge` | `clearProgressMismatch` | invalidación al reconocer el cambio de contenido | ✗ NOT_WIRED | Sin llamada; mismo defecto de fondo que CR-01 en esta segunda rama |
| `afirmacionesRespaldadas.test.ts` Gate A/B/C/S | Las cinco vías de evasión de la ronda 7 (a-e) | Vocabulario por raíces, NOTICE_HEADING, 'success', normalización de espacios, decisión extraída | ✓ WIRED | Confirmado leyendo el fichero completo y ejecutando `npm test` (976/976) |
| `afirmacionesRespaldadas.test.ts` `respaldoExiste` | El contenido real del fichero de respaldo citado | Relevancia de contenido, no solo existencia de ruta | ✗ NOT_WIRED | Solo comprueba `rutasConRespaldoPosible.has(ruta)` — WR-02, confirmado leyendo líneas 167-176 |
| `afirmacionesRespaldadas.test.ts` detector de motivo circular | Cualquier motivo circular, no solo una frase literal | Comprobación de fichero/identificador nombrado, incondicional | ✗ PARTIAL | Gateada tras `FRASE_CIRCULAR`, una única subcadena — WR-03, confirmado leyendo líneas 967-979 |
| `app/pages/index.vue` | `/historico`, `/estadisticas` | `navigateTo` | ✓ WIRED | Sin cambios desde rondas anteriores |
| `useGameHistory().statisticsView` | `engine/statistics.aggregateStatistics` | import + llamada | ✓ WIRED | Sin cambios desde rondas anteriores |

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| HIST-01 | 09-02, 09-07 (+ otros) | Ofrecer registrar el resultado | ✓ SATISFIED | Sin cambios |
| HIST-02 | 09-01, 09-02, 09-07, 09-16 | Ganada/Perdida, siempre se puede cerrar sin registrar | ✓ SATISFIED | Sin cambios |
| HIST-03 | 09-01, 09-02, 09-07 | Causa si Perdida | ✓ SATISFIED | Sin cambios |
| HIST-04 | 09-01, 09-05, 09-12, 09-14, 09-15, 09-17, 09-28, 09-33 (+ otros) | Registro completo | ✓ SATISFIED (flujo normal) / ⚠ en riesgo en la rama de reintento | Ver gap SC3: la marca que debía señalizar el reintento sobre un snapshot ajeno no se invalida en `onResumeContinue`, así que la señal puede sobrevivir falsa o faltar cuando importaría |
| HIST-05 | 09-01, 09-07 | Motor expone inicio/ronda | ✓ SATISFIED | Sin cambios |
| HIST-06 | 09-04..09-36 (24 planes) | Histórico en localStorage, fuente de verdad | ✗ NO CONFIRMADO — sigue reabierto correctamente en `REQUIREMENTS.md` (`[ ]`) | El HISTÓRICO en sí sigue protegido; la reserva sigue siendo sobre el mecanismo de recuperación del PROGRESO adyacente — novena cara confirmada en esta ronda (gap SC3) |
| HIST-07 | 09-05, 09-06, 09-08, 09-10, 09-11, 09-17 | Pantalla lista más reciente→antigua | ✓ SATISFIED | Sin cambios |
| HIST-08 | 09-05, 09-06, 09-09, 09-11 | Borrado con confirmación | ✓ SATISFIED | Sin cambios |
| HIST-09 | 09-04..09-36 (23 planes) | «Partida terminada» borra sesión, nunca histórico | ✓ SATISFIED (literal) | `clear(gameId)` solo toca `tga:progress:<gameId>`; el requisito literal se cumple |
| STAT-01 | 09-08 | Pantalla accesible desde inicio | ✓ SATISFIED | Sin cambios |
| STAT-02 | 09-03, 09-06, 09-08, 09-11 | % victorias por héroe | ✓ SATISFIED | Sin cambios |
| STAT-03 | 09-03, 09-06, 09-08, 09-11 | % victorias por villano | ✓ SATISFIED | Sin cambios |
| STAT-04 | 09-04, 09-08, 09-11 | Solo localStorage, nunca Firestore | ✓ SATISFIED | Ver truth #5 |
| STAT-05 | 09-02, 09-06, 09-08, 09-10, 09-11 | Estado vacío claro | ✓ SATISFIED | Sin cambios |

Ningún requisito huérfano: los 14 IDs de la fase aparecen en al menos un frontmatter de plan
(medido: HIST-06 en 24 planes, HIST-09 en 23, el resto entre 2 y 12) y en `.planning/REQUIREMENTS.md`
con fila propia en la tabla de trazabilidad. HIST-06 sigue marcado `[ ]` — coherente con esta
verificación.

### Anti-Patrones Encontrados

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/pages/[game]/index.vue` | `onResumeContinue` (sin llamada a `clearProgressMismatch`) | Una marca de discrepancia sobrevive al camino que sustituye su referente por progreso legítimo | 🛑 BLOCKER | Novena cara del defecto: un aviso que era cierto puede mostrarse después como si lo siguiera siendo, cuando ya no lo es (CR-01) |
| `app/pages/[game]/index.vue` + `app/components/ContentChangedNotice.vue` | `onMounted:202`, `ContentChangedNotice.vue` completo, `onContentChangedAcknowledge:746-748` | El aviso de discrepancia se calcula mas no se muestra ni se invalida en la rama `content-changed-notice` | ⚠ WARNING | Mismo defecto de fondo por una segunda rama sin cubrir (WR-01) |
| `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` | sección «La marca de progreso que no coincide vive en memoria» | Evaluación de riesgo escrita que cubre solo la pérdida de la marca, no su persistencia falsa | ⚠ WARNING | Un texto de cierre que no cubre el caso que de verdad importa, mismo patrón que motivos falsos de rondas anteriores |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` | 167-176 (`respaldoExiste`) | Solo comprueba existencia de la ruta citada, nunca relevancia de su contenido | ⚠ WARNING | Una cita a un fichero real pero no relacionado pasaría el gate (WR-02, confirmado) |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` | 967-979 (detector de motivo circular) | Gateado tras una única subcadena literal (`'la garantía real la da'`) | ⚠ WARNING | Cualquier motivo circular con otra redacción evade la comprobación, reproduciendo el vocabulario cerrado un nivel más arriba (WR-03, confirmado) |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` | 959-965 (umbral de longitud) | `motivo.length >= 40` es un umbral de longitud, no de sustancia | ℹ️ INFO | Rellenable con prosa sin contenido verificable (INFO-01, confirmado) |
| `app/components/UpdateBanner.vue` + `app/components/HistorySavedNotice.vue` | ambas `fixed top-0 inset-x-0 z-40` | Dos bandas idénticas en posición/z-index, montadas como hermanas, sin coordinación | ⚠ WARNING | Sin cambios; sigue abierto y fuera del alcance de los planes de esta ronda |

No se han encontrado marcadores de deuda (`TODO`/`FIXME`/`TBD`/`XXX`/`HACK`) sin referencia en
ninguno de los ficheros tocados por el lote 09-32..09-36 (la única coincidencia de `grep` sobre
"TODO" es la constante `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO`, no un marcador de deuda).

### Human Verification Required

### 1. Comprobación visual en tablet horizontal real

**Test:** Con `npm run dev` en un viewport de tablet horizontal (~1180×820), terminar una
partida provocando la variante de aviso de fallo (20s de duración) y, si es posible, forzar
también la detección de una actualización de PWA en el mismo momento. Añadido por esta ronda:
comprobar también que el texto reescrito de `NOTICE_BODY['failure-stale']` se lee completo a un
brazo de distancia, y que el aviso nuevo de discrepancia dentro de `ResumePrompt`
(`PROGRESS_MISMATCH_WARNING`) no desborda ni se corta visualmente dentro del modal.
**Expected:** Ningún control de cabecera queda tapado de forma invisible por las bandas; si
`UpdateBanner` e `HistorySavedNotice` coinciden en el tiempo, ambas deberían seguir siendo
visibles/utilizables. El texto de `failure-stale` y el aviso de `ResumePrompt` deben leerse
completos, sin desbordar.
**Why human:** El solapamiento exacto de CSS ya está confirmado por lectura de código, sin
cambios estructurales desde la ronda 5, pero el impacto real en un dispositivo físico requiere
juicio humano. Sigue marcado como PENDIENTE bajo `DEV-02` de `REQUIREMENTS.md` desde
`09-22-SUMMARY.md`. Los dos puntos añadidos por esta ronda son superficie de pantalla nueva
desde la ronda 7 que nadie ha visto renderizada todavía en un dispositivo físico.

### Gaps Summary

El objetivo de la fase sigue sin alcanzarse en su criterio de éxito nº 3 (SC3). El lote
09-32..09-36 cerró de verdad los tres hallazgos literales de la ronda 7 y las cinco vías de
evasión del gate de clase que esa misma ronda documentó — confirmado por lectura directa del
código, no por aceptar los SUMMARY. Pero el propio mecanismo construido para cerrar el tercer
hallazgo (`useProgressMismatchMark.ts`) introduce una **novena cara** del mismo defecto: la
marca que transporta el conocimiento de discrepancia no se invalida en `onResumeContinue` ni en
`onContentChangedAcknowledge`, así que puede sobrevivir a la sustitución de su propio referente
por progreso legítimo y resurgir después como una afirmación falsa. La documentación que el lote
escribió para cerrar la ronda (`deferred-items.md`) evalúa el riesgo residual sin cubrir
precisamente ese caso, afirmando por escrito una garantía («nunca dice algo falso») que no se
sostiene.

El gate de clase mejoró de forma sustancial y cerró el hueco mecánico de la ronda 7 en su forma
literal, pero sigue sin poder cumplir su propósito declarado frente a esta novena cara: es
estructuralmente un gate de texto-contra-respaldo, y esta cara del defecto es un fallo de
invalidación de estado, no una frase sin respaldo al escribirse. Además, el propio mecanismo de
auditoría reforzado por el lote (`respaldoExiste`, el detector de motivo circular) tiene dos
evasiones propias confirmadas por lectura directa, ninguna hipotética.

Las correcciones propuestas son acotadas: una llamada a `clearProgressMismatch` en
`onResumeContinue` (y la misma decisión para `onContentChangedAcknowledge`), corregir el texto
de `deferred-items.md` para que distinga pérdida de persistencia-falsa de la marca, y dos
arreglos ya redactados por `09-REVIEW.md` (WR-02/WR-03) para el gate de clase. Ninguna exige
revertir trabajo ya cerrado — pero el patrón de que cada cierre de esta fase introduce una cara
nueva del mismo defecto, ya en su novena iteración, sigue sugiriendo que la corrección puntual
por ronda no es suficiente por sí sola: el gate necesitaría, además de auditar texto, un test que
recorra el ciclo de vida completo de cualquier estado de módulo nuevo (poner → todos los caminos
que superan su referente → leer) antes de darlo por cerrado.

Adicionalmente, un WARNING no cerrado (solapamiento mutuo entre `UpdateBanner` y
`HistorySavedNotice`) y la comprobación visual humana pendiente desde 09-22 siguen abiertos; no
bloquean el objetivo de la fase por sí solos.

---

_Verificado: 2026-09-19T02:20:00Z_
_Verificador: Claude (gsd-verifier)_
