---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-14T13:10:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Gap #1 LITERAL de la ronda 6 (readStoredProgress(game) no recibía la sesión que acaba de terminar) está cerrado: readStoredProgress(game, esperada?) acepta ahora un segundo argumento opcional y esLaMismaPartida(enDisco, objetivo) compara seis campos (gameId/contentVersion/formatVersion/runtimeId/round/context) — confirmado leyendo app/composables/useStoredProgress.ts:110-177, no el SUMMARY. onOutcomeRecorded (index.vue:699-706) ya pasa session.value como esperada."
    - "El cuarto valor de StoredProgress ('stale') existe de verdad, es alcanzable (test 5 de avisoTrasRegistroFallido.test.ts lo dispara con un escenario real de tres autoguardados válidos + uno fallido) y tiene copy propia (NOTICE_BODY['failure-stale']) que ya NO promete 'sigue guardada' ni ordena el reintento — confirmado por lectura directa y por el propio test de regresión."
    - "onMounted ya distingue 'absent' de 'unknown' vía planProgressMount (useProgressMountPlan.ts), con superficie propia en pantalla (avisoProgresoNoComprobado / UNVERIFIED_PROGRESS_NOTICE) — confirmado leyendo index.vue:158-189 y MiniSetupScreen.vue."
    - "onOutcomeRecorded envuelve record() y readStoredProgress() en sendos try/catch con valores honestos de caída ('unknown') — confirmado leyendo index.vue:683-709."
    - "Gap #2 LITERAL de la ronda 6 (extraerTemplate cortaba en el primer </template> anidado, cubriendo el 1,9% de index.vue) está cerrado en su forma literal: regionVigilada ya no acota ningún bloque, barre el fichero completo (menos comentarios y <style>), y el barrido se extiende también a app/**/*.ts — confirmado leyendo afirmacionesRespaldadas.test.ts:157-238 y ejecutando el propio test (verde)."
  gaps_remaining:
    - "SC3 SIGUE FALLANDO — octava cara del mismo defecto de fondo. Confirmado por trazado de código independiente (no por importar el veredicto de 09-REVIEW.md sin contrastar): la copy nueva escrita para cerrar la séptima cara (NOTICE_BODY['failure-stale'], useHistorySavedNotice.ts:162) afirma tres hechos que esLaMismaPartida no establece — que lo de disco es 'una versión ANTERIOR' (updatedAt está excluido a propósito de la comparación, así que no hay orden temporal), que es 'de ESTA partida' (runtimeId identifica un paso, no una instancia; dos pestañas sobre el mismo gameId pueden dejar otra partida entera) y, el más grave, que 'NO es la ronda en la que habéis terminado' — literalmente falso en el escenario canónico que el propio plan 09-28 construyó como test de regresión (avisoTrasRegistroFallido.test.ts test 5: disco cursor 2 / partida que termina cursor 3, ambos con round:1, porque expand() fija round en 1 y ningún spread {...base, cursor:n} lo cambia). El propio test 5 pasa en verde sin comprobar el texto de 'no la ronda', repitiendo exactamente el patrón de las siete rondas anteriores: el respaldo mide algo distinto de lo que la frase dice. Un segundo hallazgo de la misma familia, confirmado por separado: endGameBody (index.vue:511) promete 'la app conservará el progreso para que podáis reintentarlo' ANTES de conocer el estado del dispositivo; esa promesa es falsa en 2 de los 4 estados posibles ('absent': el aviso posterior dice literalmente 'no hay nada que reintentar'; 'stale': el aviso posterior deliberadamente NO ordena reintentar porque hacerlo escribiría en el histórico datos de otra partida) — y el motivo escrito en AFIRMACIONES_AUDITADAS para ese fichero afirma por escrito que la frase 'es cierta en las cuatro salidas', lo cual es falso. Un tercer hallazgo relacionado: aunque el snapshot 'stale' se marca correctamente en el aviso (que se autocierra en 20s en la pantalla '/'), onMounted llama a readStoredProgress(game) SIN esperada (correcto y documentado, porque al montar no hay sesión con qué comparar), así que 'stale' es estructuralmente inalcanzable ahí — al reentrar, ResumePrompt vuelve a ofrecer 'Partida guardada · CONTINUAR' sobre ese mismo snapshot ajeno sin ninguna marca, y las otras tres variantes de fallo entrenan al grupo a hacer justo ese gesto ('Volved a entrar... pulsad Partida terminada otra vez'). Adjudicado independientemente por esta verificación: CONFIRMO los tres hallazgos (CR-01, CR-02, CR-03 de 09-REVIEW.md) por lectura directa de código y ejecución de tests, no por aceptar el informe de revisión sin contrastar."
    - "El gate de clase (afirmacionesRespaldadas.test.ts) mejoró de forma sustancial y CIERRA el hallazgo literal de la ronda 6 (ya no recorta el template, ya barre .ts, ya se auto-verifica con SFC sintéticos), pero sigue sin poder atrapar la clase de defecto que existe para prevenir: los tres hallazgos de esta ronda (CR-01/CR-02/CR-03) pasaron los tres gates en verde. Confirmado por lectura directa: (a) el vocabulario vigilado es una lista cerrada de 11 subcadenas literales y 'conservará'/'reintentarlo' — la frase exacta que hace daño en endGameBody — no está en ella, así que ni siquiera entra en el barrido pese a vivir en el fichero más vigilado del repo; (b) NOTICE_HEADING no lo recorre ni Gate A (por excepción auditada) ni Gate B (que solo itera NOTICE_BODY); (c) Gate C no vigila el literal 'success', el más peligroso de escribir a mano; (d) el propio comparador de Gate A/B no normaliza espacios en blanco, así que una copy partida en dos líneas evade el gate sin mala fe; (e) Gate S (auto-verificación) prueba regionVigilada, no la función de decisión de Gate A, así que un cambio que invierta la lógica de filtro seguiría en verde. Ninguno de estos cinco huecos es hipotético: (a) ya tiene una instancia real y sin detectar hoy mismo en el árbol (endGameBody)."
  regressions: []
gaps:
  - truth: "SC3: «Partida terminada» borra la sesión en curso pero nunca el histórico, que vive en localStorage como fuente de verdad — y ninguna afirmación de la interfaz sobre esos datos puede carecer de comprobación real"
    status: failed
    reason: >
      Confirmado por trazado de código independiente y por ejecución directa de los tests
      existentes (no por importar el veredicto de `09-REVIEW.md` sin contrastar). Tres
      hallazgos, los tres verificados por lectura del código fuente:

      (1) `NOTICE_BODY['failure-stale']` (`useHistorySavedNotice.ts:162`) afirma «no la ronda
      en la que habéis terminado», pero `esLaMismaPartida` (`useStoredProgress.ts:110-119`) es
      una comparación de desigualdad sobre seis campos que no distingue CUÁL difiere. En el
      escenario canónico que el propio plan 09-28 construyó como test de regresión
      (`avisoTrasRegistroFallido.test.ts:187-224`, test 5), la diferencia real está en
      `runtimeId` (cursor 2 en disco frente a cursor 3 en la partida que termina), mientras que
      `round` es idéntico en ambos (1, fijado por `expand()` en `engine/expand.ts:36`, y ningún
      `{ ...base, cursor: n }` lo toca). La frase «no la ronda» es, por tanto, literalmente
      falsa en el escenario que el propio cierre usa como prueba de que funciona. El test 5
      pasa en verde porque solo comprueba que el cuerpo NO contiene «sigue guardada» / «no se ha
      perdido» / «Partida terminada» — nunca comprueba la afirmación positiva sobre la ronda que
      el texto sí hace.

      (2) `endGameBody` (`app/pages/[game]/index.vue:510-511`) promete «la app conservará el
      progreso para que podáis reintentarlo» — una promesa emitida ANTES de conocer el estado
      real del dispositivo. Es falsa en 2 de los 4 estados posibles: con `stored === 'absent'`
      el aviso inmediatamente posterior dice literalmente «esta vez no hay nada que reintentar»
      (`useHistorySavedNotice.ts:163`); con `stored === 'stale'` el aviso posterior deliberada y
      correctamente NO ordena el reintento, porque hacerlo escribiría en el histórico —dato
      irreconstruible— la ronda y selección de un autoguardado ajeno. El motivo escrito en
      `AFIRMACIONES_AUDITADAS` (`afirmacionesRespaldadas.test.ts:119-125`) afirma por escrito que
      `endGameBody` fue «reescrito... para ser cierto en las cuatro salidas»: es un motivo falso
      sellando una excepción auditada, lo cual es peor que no tener excepción.

      (3) Aunque `planGameEnd(false, 'stale').preserveProgress` es `true` (correcto: conservar
      el snapshot ajeno es el lado seguro), la única mitigación construida es una banda
      informativa que se autocierra en 20s en la pantalla `/`. Al reentrar al juego, `onMounted`
      llama a `readStoredProgress(game)` SIN `esperada` (documentado y correcto: al montar no hay
      sesión con qué comparar), así que `'stale'` es estructuralmente inalcanzable ahí —
      `ResumePrompt` vuelve a ofrecer «Partida guardada · CONTINUAR» sobre el mismo snapshot
      ajeno, sin ninguna marca que distinga «es tuyo» de «es de otra partida». Las otras tres
      variantes de fallo entrenan activamente al grupo a hacer justo ese gesto («Volved a entrar
      en ella y pulsad "Partida terminada" otra vez»), así que el camino de menor resistencia
      lleva directo a escribir en el histórico —irreconstruible— datos de una partida distinta.

      Estos tres hallazgos coinciden con CR-01, CR-02 y CR-03 de `09-REVIEW.md`; los he
      adjudicado de forma independiente releyendo el código y ejecutando
      `npx vitest run app/composables/__tests__/{afirmacionesRespaldadas,avisoTrasRegistroFallido,useStoredProgress,useProgressMountPlan,useHistorySavedNotice}.test.ts`
      (114/114 en verde) — confirmo los tres: un test suite en verde no es evidencia de que SC3
      se cumpla, es evidencia de que los tests afirman lo mismo que la copy, y la copy es la que
      falla.
    artifacts:
      - path: "app/composables/useHistorySavedNotice.ts"
        issue: "línea 162: NOTICE_BODY['failure-stale'] afirma 'una versión anterior de esta partida... no la ronda en la que habéis terminado', tres hechos (anterioridad temporal, identidad de partida, diferencia de ronda) que esLaMismaPartida no establece y que son falsos en el escenario canónico de prueba del propio cierre"
      - path: "app/composables/useStoredProgress.ts"
        issue: "líneas 110-119: esLaMismaPartida es una comparación de desigualdad sobre 6 campos (¬false ⟹ 'al menos uno difiere'), no identifica CUÁL difiere ni en qué dirección; updatedAt excluido por escrito impide cualquier afirmación de anterioridad/posterioridad"
      - path: "app/pages/[game]/index.vue"
        issue: "línea 510-511: endGameBody promete 'la app conservará el progreso para que podáis reintentarlo' antes de que planGameEnd conozca el estado real del dispositivo; falso quial stored es 'absent' o 'stale'. Línea 176 (onMounted): readStoredProgress(game) sin esperada hace 'stale' inalcanzable al reentrar, así que ResumePrompt vuelve a ofrecer el snapshot ajeno sin marca"
      - path: "app/composables/__tests__/afirmacionesRespaldadas.test.ts"
        issue: "líneas 119-125: el motivo escrito de la excepción auditada para app/pages/[game]/index.vue afirma que endGameBody 'es cierto en las cuatro salidas', lo cual es falso; un motivo escrito falso sella el hueco con un sello de verificado"
      - path: "app/composables/__tests__/avisoTrasRegistroFallido.test.ts"
        issue: "test 5 (líneas 187-224): reproduce el escenario canónico (cursor 2 vs cursor 3, mismo round) y comprueba que la copy NO contiene ciertas frases prohibidas, pero nunca comprueba la afirmación positiva sobre 'ronda distinta' que el texto de failure-stale sí hace — pasa en verde con una afirmación falsa dentro"
    missing:
      - "Que NOTICE_BODY['failure-stale'] no afirme más de lo que esLaMismaPartida establece: retirar 'no la ronda en la que habéis terminado' y 'una versión anterior', o hacer que esLaMismaPartida devuelva qué campo difirió (p. ej. { iguales: false, motivo: 'round' | 'runtimeId' | 'context' | ... }) y elegir la copy a partir de ese motivo, con un test por motivo"
      - "Retirar la promesa de reintento de endGameBody (se emite antes de conocer el estado del dispositivo) y corregir el motivo escrito en AFIRMACIONES_AUDITADAS para que describa la comprobación real (preserveProgress), no una que no se hizo"
      - "Un test que fije el texto: en el montaje del test 5, NOTICE_BODY[variante] NO puede contener 'no la ronda'"
      - "Una marca persistente (junto al progreso, o clave hermana) que sobreviva al aviso de 20s y que ResumePrompt pueda leer para avisar de que el snapshot ofrecido no es el de la última partida que terminó el grupo — o, alternativa más barata, documentar esto como deuda explícita en vez de darlo por cerrado"
      - "Sincronizar REQUIREMENTS.md: la nota de HIST-06 debe registrar que esta ronda (7ª) encontró una octava variante del mismo patrón, dentro de la propia copy escrita para cerrar la séptima — no dar el hueco por cerrado"
  - truth: "El gate automatizado que protege la garantía de SC3 para toda la clase de defecto (no solo el caso puntual de cada ronda) inspecciona de verdad las superficies de riesgo y detendría la siguiente cara del defecto"
    status: failed
    reason: >
      El hallazgo LITERAL de la ronda 6 (extraerTemplate cortaba en el primer </template>
      anidado) está genuinamente cerrado: regionVigilada barre el fichero completo menos
      comentarios/<style>, se extiende a .ts, y hay un Gate S de auto-verificación con SFC
      sintéticos. Confirmado leyendo el código y ejecutando los tests. Pero el gate sigue sin
      poder cumplir su propósito declarado («proteger la CLASE, no el caso concreto») porque los
      tres hallazgos de esta misma ronda (CR-01/CR-02/CR-03) pasaron los tres gates en verde.
      Adjudicado por lectura directa, cinco vías concretas:
      (a) el vocabulario vigilado (FRASES_SOBRE_LOS_DATOS_DEL_GRUPO) es una lista cerrada de 11
      subcadenas literales; ni 'conservará' ni 'reintentarlo' están en ella, así que la frase
      exacta de endGameBody que hace daño (CR-02) ni siquiera entra en el barrido, pese a vivir
      en el fichero más vigilado del repo (afirmacionesRespaldadas.test.ts:76-88 vs index.vue:511);
      (b) NOTICE_HEADING no lo recorre ni Gate A (excepción auditada con motivo explícitamente
      circular: 'la garantía real la da Gate B') ni Gate B (que solo itera
      Object.entries(NOTICE_BODY), afirmacionesRespaldadas.test.ts, bucle de Gate B) — un titular
      nuevo pasaría ambos gates sin que ninguno lo mire;
      (c) Gate C vigila LITERALES_VARIANTE = ['failure-recoverable', 'failure-stale',
      'failure-unrecoverable', 'failure-unknown'] pero no 'success', el literal más peligroso de
      escribir a mano porque pinta '✓ Partida registrada' sin haber pasado por record();
      (d) el comparador (contieneFraseSobreLosDatosDelGrupo) hace region.toLowerCase().includes(frase)
      sin normalizar espacios en blanco, así que una copy partida en dos líneas por un
      formateador evade el gate sin mala fe;
      (e) Gate S (la auto-verificación que se supone impide que este hueco se reabra en
      silencio) prueba regionVigilada (la extracción de texto) y dos coberturas puntuales sobre
      index.vue, pero no invoca ninguna función exportada que ejecute la DECISIÓN de Gate A —
      esa lógica vive inline dentro de un it.each — así que un cambio futuro que invierta el
      filtro de frasesSinAuditar o cambie `?? []` por `?? FRASES_SOBRE_LOS_DATOS_DEL_GRUPO`
      dejaría Gate S en verde mientras Gate A deja de detectar nada.
      Ninguno de los cinco es hipotético: (a) tiene una instancia real y sin detectar hoy mismo
      en el árbol (endGameBody, confirmado leyendo el código).
    artifacts:
      - path: "app/composables/__tests__/afirmacionesRespaldadas.test.ts"
        issue: "líneas 76-88 (vocabulario cerrado, sin 'conservará'/'reintentarlo'); líneas 118-139 (NOTICE_HEADING fuera de Gate A por excepción circular y fuera de Gate B por diseño); línea 380 (LITERALES_VARIANTE sin 'success'); líneas 94-98 (comparador sin normalizar espacios); líneas 245-265,399-498 (Gate S prueba regionVigilada, no la función de decisión de Gate A, que no está extraída como función invocable)"
    missing:
      - "Ampliar FRASES_SOBRE_LOS_DATOS_DEL_GRUPO con 'conservará'/'conservar' y las vecinas obvias ('sigue guardado', 'está guardada', 'se ha conservado', 'no se ha borrado', 'queda en el dispositivo'), o invertir el criterio: ningún .vue puede tener texto literal en nodo de plantilla salvo lista blanca de rótulos, y la copy sobre datos persistidos entra siempre por prop/computed desde un .ts con test puro"
      - "Que Gate B recorra { ...NOTICE_HEADING, ...NOTICE_BODY }, no solo NOTICE_BODY"
      - "Añadir 'success' a LITERALES_VARIANTE de Gate C"
      - "Normalizar espacios en blanco (regex /\\s+/g → ' ') antes de comparar en contieneFraseSobreLosDatosDelGrupo, y un caso de Gate S con la frase partida en dos líneas"
      - "Extraer la decisión de Gate A a una función pura exportada (p. ej. frasesSinAuditarDe(ruta, contenido)) y que Gate S la ejerza con casos sintéticos que demuestren que SE PONE ROJA ante una frase sin auditar, no solo que regionVigilada extrae bien el texto"
deferred: []
human_verification:
  - test: "Comprobación visual en tablet horizontal real (viewport ~1180×820, npm run dev): terminar una partida con la variante de aviso de fallo (larga, 20s) visible y observar si tapa controles de la cabecera de /historico, y provocar (o simular con devtools) una detección de actualización de PWA simultánea al aviso de histórico para confirmar visualmente si una banda tapa por completo a la otra"
    expected: "Ninguna banda debería impedir ver o tocar los controles de cabecera de /historico, y si ambas bandas coinciden en el tiempo, ambas deberían seguir siendo visibles y utilizables (apiladas, no superpuestas)"
    why_human: "Es un juicio visual sobre solapamiento real en un viewport físico — greppear el CSS ya demuestra que ambas bandas comparten exactamente `fixed top-0 inset-x-0 z-40` con fondo opaco y se montan como hermanas (confirmado de nuevo en app/app.vue y en los dos componentes: sin cambios desde la ronda 5), pero solo un humano puede confirmar el impacto real en pantalla y decidir si es aceptable. Sigue PENDIENTE explícitamente bajo DEV-02 de REQUIREMENTS.md desde 09-22-SUMMARY.md; no es un hallazgo nuevo de esta ronda."
---

# Fase 9: Histórico y estadísticas — Informe de verificación (7ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-14
**Estado:** gaps_found (SC3 sigue sin cumplirse — octava cara del mismo defecto de fondo, más el gate de clase que sigue sin poder detener la clase de defecto que existe para prevenir)
**Re-verificación:** Sí — tras el lote de cierre 09-28..09-31 y el code review de la ronda 6 (`09-REVIEW.md`)

## Resumen ejecutivo

El lote 09-28..09-31 cierra genuinamente los DOS hallazgos LITERALES que la ronda 6 dejó
abiertos, y lo he confirmado leyendo el código, no el SUMMARY:

- **Gap #1 literal (ronda 6):** `readStoredProgress(game)` no recibía la sesión que acababa de
  terminar. Ahora `readStoredProgress(game, esperada?)` sí la recibe, `esLaMismaPartida`
  compara seis campos, y existe un cuarto valor de `StoredProgress` (`'stale'`) alcanzable de
  verdad, con copy propia que ya no promete «sigue guardada» ni ordena el reintento peligroso.
- **Gap #2 literal (ronda 6):** el gate de clase (`afirmacionesRespaldadas.test.ts`) ya no
  recorta la plantilla en el primer `</template>` anidado; barre el fichero completo (menos
  comentarios y `<style>`), también `.ts`, y tiene un Gate S de auto-verificación.

**Pero el objetivo de la fase (SC3: «ninguna afirmación de la interfaz sobre los datos del
grupo puede carecer de comprobación real») sigue sin alcanzarse.** He adjudicado
independientemente, releyendo el código fuente y ejecutando los tests yo mismo (no importando
el veredicto de `09-REVIEW.md` sin contrastar), los tres hallazgos críticos de esa revisión, y
los tres se confirman:

1. La copy nueva que cierra la séptima cara (`NOTICE_BODY['failure-stale']`) afirma «no la
   ronda en la que habéis terminado» — y esto es **literalmente falso** en el escenario
   canónico que el propio plan 09-28 usa como test de regresión (`avisoTrasRegistroFallido.test.ts`
   test 5): en ese escenario la diferencia está en `runtimeId` (cursor), no en `round`, que es
   idéntico en disco y en la partida que termina (`round: 1` en ambos, fijado por `expand()`).
   El test pasa en verde porque solo comprueba ausencia de ciertas frases prohibidas, nunca la
   afirmación positiva que el texto sí hace.
2. `endGameBody` promete «la app conservará el progreso para que podáis reintentarlo» —una
   promesa falsa en 2 de los 4 estados del dispositivo (`absent`, `stale`)— y el motivo escrito
   de la excepción auditada que la protege afirma por escrito que es «cierta en las cuatro
   salidas», lo cual he confirmado que no lo es.
3. El snapshot `'stale'` queda correctamente marcado en el aviso de 20 segundos, pero
   `onMounted` no puede distinguirlo al reentrar (llama a `readStoredProgress` sin `esperada`,
   correcto y documentado), así que `ResumePrompt` vuelve a ofrecer ese mismo snapshot ajeno sin
   ninguna marca, y las otras tres variantes de fallo entrenan al grupo a hacer justo el gesto
   que lo registraría en el histórico irreconstruible.

Es la **octava cara del mismo defecto de fondo** que esta fase lleva siete rondas cerrando:
cada cierre repara el caso puntual encontrado y, en el propio texto que escribe para repararlo,
introduce una afirmación nueva que su respaldo no sostiene del todo.

Un segundo hallazgo agrava la situación, también confirmado por lectura directa: el gate de
clase que existe explícitamente para «proteger la CLASE, no el caso concreto» dejó pasar los
tres hallazgos de arriba en verde, por cinco vías concretas (vocabulario cerrado de 11
subcadenas sin la frase que hace daño en `endGameBody`; `NOTICE_HEADING` fuera del alcance de
los dos gates que auditan copy; el literal `'success'` sin vigilar en Gate C; el comparador sin
normalizar espacios; y Gate S que autoverifica la extracción de texto, no la lógica de
decisión). Ninguna de las cinco es hipotética: la primera tiene una instancia real y sin
detectar hoy mismo en el árbol.

No he encontrado evidencia de que ninguno de los tres hallazgos esté cubierto por planes ya
cerrados ni en `deferred-items.md` — no aparecen ahí, son nuevos de esta ronda. `REQUIREMENTS.md`
sigue marcando HIST-06 como `[ ]` (reabierto), correctamente.

**Nota de trazabilidad para el orquestador:** `.planning/ROADMAP.md` línea 36 marca la Fase 9
como `[x]` completada, con una nota «(27/27 planes ejecutados...)» y «verificación ronda 6:
gaps_found 4/5» — pese a que la ronda 6 desmarcó explícitamente la fase como no completa. El
recuento de planes real es 31/31 (09-01..09-31), no 27/27. Esta entrada del ROADMAP está
desincronizada con el estado real de la fase y debe corregirse junto con el resultado de esta
verificación.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria del ROADMAP) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o cerrar sin registrar | ✓ VERIFIED | Sin cambios desde rondas anteriores; `onOutcomeDismiss` (`index.vue:725`) sigue terminando sin registrar, sin condiciones. Regresión rápida: presente y sin cambios en el árbol actual |
| 2 | SC2: el registro incluye resultado/causa/villano/héroe/nombres/fecha/dificultad/nº jugadores/duración/rondas, calculados por el motor | ✓ VERIFIED (flujo normal) | `buildHistoryEntry` (`engine/history.ts`) normaliza los campos en origen; sin cambios desde rondas anteriores. Matiz idéntico al de rondas 5-6: en la RAMA DE REINTENTO de un fallo previo, el registro puede construirse a partir de un `session` restaurado que no es el de la partida que terminó — ver Gap sobre SC3 |
| 3 | SC3: histórico listable/borrable con confirmación; «Partida terminada» borra solo la sesión, nunca el histórico — sin confirmaciones falsas ante un fallo | ✗ FAILED | Mecánica de listar/borrar/no-tocar-histórico sigue VERIFICADA sin cambios. La garantía de «ninguna afirmación no comprobada» FALLA de nuevo, octava variante — confirmado por trazado de código independiente, releyendo el código fuente y ejecutando los tests yo mismo (no aceptando `09-REVIEW.md` por su veredicto) |
| 4 | SC4: pantalla de estadísticas accesible desde inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | Sin cambios desde rondas anteriores. Regresión rápida: `app/pages/estadisticas.vue` presente (91 líneas), sin cambios en este lote |
| 5 | SC5: estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -rn "firestore\|firebase" app/ engine/` (insensible a mayúsculas) sigue sin producir ningún resultado, ejecutado de nuevo en esta ronda |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/composables/useStoredProgress.ts` `readStoredProgress(game, esperada?)` | Autoridad de lectura que distingue «hay algo» de «es ESTO» | ✓ VERIFIED (mecánicamente) / ✗ INSUFICIENTE (la copy que consume su respuesta afirma más de lo que establece) | `esLaMismaPartida` compara 6 campos y produce `'stale'` correctamente cuando difieren (líneas 110-177, confirmado leyendo el código y con `avisoTrasRegistroFallido.test.ts` test 5 en verde) — pero la comparación no distingue CUÁL campo difiere, y la copy de `failure-stale` sí hace una afirmación sobre cuál («la ronda») |
| `app/composables/useHistorySavedNotice.ts` `NOTICE_BODY['failure-stale']` | Copy que afirma exactamente lo que `esLaMismaPartida` comprobó, ni una palabra más | ✗ STUB (respecto a la promesa del texto) | Línea 162: afirma «no la ronda en la que habéis terminado» — falso en el escenario canónico donde la diferencia real es de `runtimeId`, no de `round` |
| `app/pages/[game]/index.vue` `endGameBody` | Frase cierta en las cuatro salidas de `<GameOutcomeDialog>` | ✗ STUB | Líneas 510-511: promete reintento posible en los 4 estados; falso en `'absent'` y `'stale'`. El motivo auditado en `afirmacionesRespaldadas.test.ts:119-125` que la respalda afirma por escrito lo contrario de lo verificado |
| `app/pages/[game]/index.vue` `onMounted` | No reofrecer un snapshot ya identificado como ajeno sin marca | ✗ STUB (para el caso `'stale'`) | Línea 176: `readStoredProgress(game)` sin `esperada` (correcto, documentado) hace `'stale'` inalcanzable al reentrar; `ResumePrompt` vuelve a ofrecer el snapshot ajeno sin ninguna traza de que ya se identificó como no correspondiente |
| `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` | Cubre la costura real de la séptima cara sin dejar pasar la octava | ⚠ INSUFICIENTE | El test 5 comprueba ausencia de frases prohibidas, nunca la afirmación positiva («no la ronda») que la copy nueva sí hace; pasa en verde con una afirmación falsa dentro |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (gate de clase) | Impide que CUALQUIER afirmación nueva sobre los datos del grupo pase sin respaldo, en cualquier `.vue`/`.ts` | ⚠ MEJORADO PERO INSUFICIENTE | El hallazgo literal de la ronda 6 (recorte de plantilla) está cerrado (confirmado: `regionVigilada` barre el fichero completo, `.ts` incluido, con Gate S). Pero los tres hallazgos de esta ronda pasaron los tres gates: vocabulario cerrado sin «conservará»/«reintentarlo» (a), `NOTICE_HEADING` fuera de Gate A y Gate B (b), `'success'` sin vigilar en Gate C (c), comparador sin normalizar espacios (d), Gate S que autoverifica extracción de texto, no la lógica de decisión de Gate A (e) |
| `app/pages/estadisticas.vue`, `app/pages/historico.vue` | Pantallas completas, wireadas a `useGameHistory` | ✓ VERIFIED | Sin cambios desde rondas anteriores (91 y 101 líneas respectivamente, presentes) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `NOTICE_BODY['failure-stale']` | Identidad y anterioridad de LA versión en disco frente a la partida que termina | Afirmación de texto → dato verificado | ✗ NOT_WIRED | La comparación (`esLaMismaPartida`) solo produce «igual»/«distinto»; el texto afirma «anterior» (sin comparación de `updatedAt`, excluida por escrito) y «no es la ronda» (falso cuando la diferencia real es de `runtimeId`, como en el escenario canónico de prueba) |
| `endGameBody` | Los cuatro estados posibles de `stored` en el momento en que el fallo puede ocurrir | Promesa emitida antes de conocer el estado → estado real tras `readStoredProgress` | ✗ NOT_WIRED | La promesa de reintento se emite en el diálogo, antes de llamar a `readStoredProgress`; es incompatible con `'absent'` y `'stale'` |
| `[game]/index.vue` `onMounted` | `readStoredProgress(game)` sin `esperada` → `'stale'` | Distinguir snapshot ajeno de propio al reentrar | ✗ NOT_WIRED | `'stale'` es estructuralmente inalcanzable en el montaje (documentado y correcto por diseño); no hay marca persistente que sobreviva al aviso de 20s, así que `ResumePrompt` vuelve a ofrecer el snapshot ajeno sin distinción |
| `afirmacionesRespaldadas.test.ts` Gate A/B/C | Los tres hallazgos nuevos de esta ronda (CR-01/CR-02/CR-03) | Vocabulario vigilado + recorrido de ficheros | ✗ NOT_WIRED | Los tres pasaron los tres gates en verde; confirmado por ejecución directa de los tests (114/114 verde) |
| `afirmacionesRespaldadas.test.ts` Gate S | La lógica de decisión de Gate A (`frasesSinAuditar`) | Auto-verificación | ✗ PARTIAL | Gate S prueba `regionVigilada` (extracción de texto) y dos coberturas puntuales; no invoca ninguna función exportada que ejerza la decisión completa de Gate A |
| `app/pages/index.vue` | `/historico`, `/estadisticas` | `navigateTo` | ✓ WIRED | Sin cambios desde rondas anteriores |
| `useGameHistory().statisticsView` | `engine/statistics.aggregateStatistics` | import + llamada | ✓ WIRED | Sin cambios desde rondas anteriores |
| `[game]/index.vue` `onOutcomeRecorded` | `record()`/`save()`/`readStoredProgress()` → `finishGame(plan.preserveProgress)` | orden `silence()`→`record()`→`save()`→lectura→`notifyHistorySaved()`→`finishGame()`, con guarda de reentrada y try/catch | ✓ WIRED | Confirmado literalmente en el código, líneas 683-709; los `try/catch` de esta ronda están correctamente puestos (WR-06 de `09-REVIEW.md` señala que el mismo blindaje falta en `onMounted`, no en `onOutcomeRecorded`) |

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| HIST-01 | 09-02, 09-07 | Ofrecer registrar el resultado | ✓ SATISFIED | Sin cambios |
| HIST-02 | 09-01, 09-02, 09-07, 09-16 | Ganada/Perdida, siempre se puede cerrar sin registrar | ✓ SATISFIED | Sin cambios |
| HIST-03 | 09-01, 09-02, 09-07 | Causa si Perdida | ✓ SATISFIED | Sin cambios |
| HIST-04 | 09-01, 09-05, 09-12, 09-14, 09-15, 09-17, 09-28, 09-31 | Registro completo | ✓ SATISFIED (flujo normal) / ⚠ en riesgo en la rama de reintento tras snapshot ajeno | Ver gap SC3: el reintento sobre un snapshot `'stale'` sin marca puede escribir en el histórico una ronda/selección que no es la de la partida que terminó |
| HIST-05 | 09-01, 09-07 | Motor expone inicio/ronda | ✓ SATISFIED | Sin cambios |
| HIST-06 | 09-04, 09-09, 09-12, 09-13, 09-16, 09-17, 09-18, 09-20, 09-21, 09-23, 09-24, 09-25, 09-26, 09-27, 09-28, 09-29, 09-30, 09-31 | Histórico en localStorage, fuente de verdad | ✗ NO CONFIRMADO — sigue reabierto correctamente en `REQUIREMENTS.md` (`[ ]`) | El HISTÓRICO en sí (`tga:history`) sigue protegido frente a fallos de lectura/escritura cerrados en rondas 1-4. La reserva sigue siendo sobre el mecanismo de recuperación del PROGRESO adyacente: cierra la séptima cara e introduce evidencia de una octava (ver gap SC3) |
| HIST-07 | 09-05, 09-06, 09-08, 09-10, 09-11, 09-17 | Pantalla lista más reciente→antigua | ✓ SATISFIED | Sin cambios |
| HIST-08 | 09-05, 09-06, 09-09, 09-11 | Borrado con confirmación | ✓ SATISFIED | Sin cambios |
| HIST-09 | 09-04, 09-07, 09-08, 09-16, 09-18, 09-20, 09-23, 09-28, 09-29, 09-30, 09-31 | «Partida terminada» borra sesión, nunca histórico | ✓ SATISFIED (literal) | `clear(gameId)` solo toca `tga:progress:<gameId>`; el requisito literal se cumple. La promesa AÑADIDA sobre identidad de la partida preservada sigue sin sostenerse del todo |
| STAT-01 | 09-08 | Pantalla accesible desde inicio | ✓ SATISFIED | Sin cambios |
| STAT-02 | 09-03, 09-06, 09-08, 09-11 | % victorias por héroe | ✓ SATISFIED | Sin cambios |
| STAT-03 | 09-03, 09-06, 09-08, 09-11 | % victorias por villano | ✓ SATISFIED | Sin cambios |
| STAT-04 | 09-04, 09-08, 09-11 | Solo localStorage, nunca Firestore | ✓ SATISFIED | Ver truth #5 |
| STAT-05 | 09-02, 09-06, 09-08, 09-10, 09-11 | Estado vacío claro | ✓ SATISFIED | Sin cambios |

Ningún requisito huérfano: los 14 IDs de la fase (HIST-01..09, STAT-01..05) aparecen en al menos
un frontmatter de plan (verificado: 31 de los 31 ficheros `*-PLAN.md` de la fase declaran
`requirements:`) y en `.planning/REQUIREMENTS.md` con fila propia en la tabla de trazabilidad.
HIST-06 sigue marcado `[ ]` (reabierto) — coherente con esta verificación.

### Anti-Patrones Encontrados

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/composables/useHistorySavedNotice.ts` | 162 | Afirmación de UI («no la ronda en la que habéis terminado») que la comparación que la respalda no establece — misma clase, octava cara | 🛑 BLOCKER | Falsa en el escenario canónico de prueba del propio cierre; ver gap SC3 |
| `app/pages/[game]/index.vue` | 510-511 | `endGameBody` promete un reintento que dos de los cuatro estados del dispositivo contradicen; su motivo auditado afirma lo contrario | 🛑 BLOCKER | El motivo escrito sella el hueco con un sello de verificado falso |
| `app/composables/useHistorySavedNotice.ts` + `useProgressMountPlan.ts` + `index.vue` | `useHistorySavedNotice.ts:89-94`, `useProgressMountPlan.ts:52-64`, `index.vue:176` | Snapshot `'stale'` correctamente conservado pero vuelto a ofrecer sin marca al reentrar; la única mitigación se autocierra en 20s en otra pantalla | 🛑 BLOCKER | El camino de menor resistencia (seguir la instrucción de reintento de las otras tres variantes) lleva a escribir en el histórico —irreconstruible— datos de una partida distinta |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` | 76-88, 118-139, 380, 94-98, 245-265 | El gate de clase mejoró sustancialmente pero sigue siendo evadible por cinco vías concretas, una con instancia real hoy | ⚠ WARNING | Explica mecánicamente por qué CR-01/CR-02/CR-03 no fueron atrapados antes de esta verificación |
| `app/pages/[game]/index.vue` | 151-189 (`onMounted`) | Sin el mismo blindaje `try/catch` que sí tiene `onOutcomeRecorded`; una excepción deja `resumeResolved` en `false` para siempre | ⚠ WARNING (WR-06 de `09-REVIEW.md`, confirmado) | Riesgo bajo hoy (typecheck cubre el 5º valor, `readProgress` atrapa el parseo) pero coste de la línea que falta es cero |
| `app/components/MiniSetupScreen.vue` | 67-78 | `v-if` sobre el propio `role="status"` — el anti-patrón que `HistorySavedNotice.vue` documenta explícitamente en 10 líneas de comentario | ⚠ WARNING (WR-07 de `09-REVIEW.md`, confirmado; cita un precedente — `VoiceUnavailableNotice.vue`— que no tiene el `role` que se le atribuye) | Un lector de pantalla no anuncia el aviso de progreso no comprobado al aparecer |
| `app/composables/useProgressMountPlan.ts` | 50-64 | `planProgressMount(stored, outcome)` acepta pares contradictorios; el test de totalidad solo comprueba `toBeDefined()` | ⚠ WARNING (WR-08 de `09-REVIEW.md`, confirmado) | `planProgressMount('resumable', 'fresh')` pintaría `ResumePrompt` sobre `PLACEHOLDER_CONTEXT` («1 jug · Normal»), una afirmación inventada |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` | 157-194 | `FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO` dice «los cuatro», lista cinco, y conserva un `TODO(09-30)` sin cerrar | ⚠ WARNING (WR-10 de `09-REVIEW.md`, confirmado por lectura directa) | El encabezado no cuadra con el contenido; una de las cinco entradas está marcada por escrito como no auditada |
| `app/components/UpdateBanner.vue` + `app/components/HistorySavedNotice.vue` | ambas `fixed top-0 inset-x-0 z-40` | Dos bandas idénticas en posición/z-index, montadas como hermanas, sin coordinación | ⚠ WARNING | Sin cambios; sigue abierto y fuera del alcance de los planes de esta ronda |
| `.planning/ROADMAP.md` | 36 | Fase 9 marcada `[x]` con nota «(27/27 planes ejecutados...)» y «verificación ronda 6: gaps_found 4/5» — desincronizada con el estado real (31/31 planes, ronda 6 desmarcó la fase explícitamente) | ℹ️ INFO (tracking) | No es un hallazgo de código; corregir junto con el resultado de esta verificación |

No se han encontrado marcadores de deuda (`TODO`/`FIXME`/`TBD`/`XXX`/`HACK`) sin referencia
salvo el ya conocido `TODO(09-30)` de `afirmacionesRespaldadas.test.ts:178` (WR-10, listado
arriba, incluido en el gap del gate).

### Human Verification Required

### 1. Comprobación visual en tablet horizontal real

**Test:** Con `npm run dev` en un viewport de tablet horizontal (~1180×820), terminar una
partida provocando la variante de aviso de fallo (20s de duración) y, si es posible, forzar
también la detección de una actualización de PWA en el mismo momento.
**Expected:** Ningún control de cabecera queda tapado de forma invisible por las bandas; si
`UpdateBanner` e `HistorySavedNotice` coinciden en el tiempo, ambas deberían seguir siendo
visibles/utilizables, no una tapando por completo a la otra.
**Why human:** El solapamiento exacto de CSS ya está confirmado por lectura de código (mismo
`fixed top-0 inset-x-0 z-40`, mismo fondo opaco, montaje como hermanas en `app.vue`, sin
cambios desde rondas anteriores), pero el impacto real en un dispositivo físico y la decisión
de si es aceptable requieren juicio humano. Sigue marcado como PENDIENTE bajo `DEV-02` de
`REQUIREMENTS.md` desde `09-22-SUMMARY.md`; no es un hallazgo nuevo de esta ronda.

### Gaps Summary

El objetivo de la fase sigue sin alcanzarse en su criterio de éxito nº 3 (SC3): la garantía de
que ninguna afirmación de la interfaz sobre los datos del grupo carece de comprobación real.
Siete rondas de verificación han encontrado y cerrado siete variantes concretas de este mismo
defecto de fondo; esta octava ronda de verificación (7ª de re-verificación con gaps) encuentra
una octava, introducida por el propio cierre de la séptima. El lote 09-28..09-31 cerró de
verdad los dos hallazgos LITERALES que la ronda 6 dejó documentados (la autoridad de lectura ya
compara identidad de partida en vez de limitarse a «¿hay algo?», y el gate de clase ya barre el
fichero completo en vez de cortar en el primer `</template>`). Pero al escribir la copy y las
excepciones auditadas para cerrar esos dos hallazgos, se introdujeron tres afirmaciones nuevas
que su respaldo no sostiene del todo — confirmadas de forma independiente por esta verificación,
releyendo el código fuente y ejecutando los tests yo mismo, no por aceptar el veredicto de
`09-REVIEW.md` sin contrastar:

1. La copy de `failure-stale` afirma «no la ronda en la que habéis terminado», falso en el
   escenario canónico que el propio plan usa como prueba de regresión.
2. `endGameBody` promete un reintento que dos de los cuatro estados del dispositivo contradicen,
   con un motivo auditado que afirma por escrito lo contrario de lo verificado.
3. El snapshot `'stale'` se conserva correctamente pero se vuelve a ofrecer sin marca al
   reentrar, con las otras tres variantes de fallo entrenando al grupo a hacer justo el gesto
   que lo registraría en el histórico irreconstruible.

El gate de clase mejoró de forma sustancial y cerró el hueco mecánico de la ronda 6, pero sigue
sin poder cumplir su propósito declarado: los tres hallazgos de arriba pasaron los tres gates en
verde, por cinco vías concretas y no hipotéticas (una de ellas, el vocabulario cerrado sin
«conservará», tiene una instancia real sin detectar hoy mismo en el árbol).

Ninguno de los tres hallazgos de contenido ni el hallazgo de proceso están cubiertos por planes
ya cerrados ni documentados como riesgo aceptado en `deferred-items.md`. `REQUIREMENTS.md` sigue
marcando HIST-06 como `[ ]` (reabierto), correctamente, a la espera de esta ronda.

Las correcciones propuestas son acotadas en los tres casos de contenido (reescribir la frase de
`failure-stale` para no afirmar más de lo comprobado; retirar la promesa de reintento de
`endGameBody`; añadir una marca persistente o documentar la deuda explícitamente para el caso
`'stale'` al reentrar) y en el caso de proceso (ampliar el vocabulario vigilado, hacer que Gate B
recorra también `NOTICE_HEADING`, añadir `'success'` a Gate C, normalizar espacios, y extraer la
lógica de decisión de Gate A a una función que Gate S pueda ejercer). Ninguna exige revertir
trabajo ya cerrado ni rediseñar el resto de los cierres anteriores — pero el patrón de que cada
cierre introduce una cara nueva del mismo defecto, ya en su octava iteración, sugiere que la
corrección puntual por ronda ha dejado de ser suficiente y que valdría la pena, en el siguiente
lote de cierre, tratar `FRASES_SOBRE_LOS_DATOS_DEL_GRUPO` como lo que WR-04 de `09-REVIEW.md`
propone: invertir el criterio (ningún `.vue` puede llevar texto literal salvo lista blanca) en
vez de seguir ampliando una lista de subcadenas que el propio patrón demuestra, ronda tras
ronda, que no puede alcanzar a la copy nueva a tiempo.

Adicionalmente, un WARNING no cerrado (solapamiento mutuo entre `UpdateBanner` y
`HistorySavedNotice`) y la comprobación visual humana pendiente desde 09-22 siguen abiertos; no
bloquean el objetivo de la fase por sí solos. Se añade además una nota de trazabilidad para el
orquestador: `.planning/ROADMAP.md` línea 36 marca la Fase 9 como completada con un recuento de
planes obsoleto (27/27 en vez de 31/31) y cita el resultado de la ronda 6 como si la fase
estuviera cerrada, pese a que esa misma ronda desmarcó explícitamente la fase.

---

_Verificado: 2026-09-14T13:10:00Z_
_Verificador: Claude (gsd-verifier)_
