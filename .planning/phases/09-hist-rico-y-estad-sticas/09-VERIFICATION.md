---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-13T12:42:18Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "El BLOCKER literal de la ronda 5 (progresoAsegurado calculado solo a partir del booleano de save() de AHORA) está cerrado: existe una autoridad de lectura única (readStoredProgress, app/composables/useStoredProgress.ts) que hace una lectura real de tga:progress:<gameId> vía resume() del motor, con un tipo StoredProgress de tres valores ('resumable' | 'absent' | 'unknown'). Verificado leyendo el código, no el SUMMARY."
    - "npm run typecheck existe de verdad, corre en CI antes de los tests, y la barrera de tipos ya no es una figura retórica (confirmado por el orquestador; no reverificado por mí per las reglas de esta ronda)."
    - "La guarda de reentrada de WR-01 (ronda 4) está puesta en onOutcomeRecorded/onOutcomeDismiss."
  gaps_remaining:
    - "SC3 (ninguna afirmación de la interfaz sobre los datos del grupo puede carecer de comprobación real) sigue FALLANDO — sexta cara del mismo defecto de fondo, adjudicada por trazado de código independiente y confirmada con el propio test de regresión del cierre (avisoTrasRegistroFallido.test.ts, test 5), que graba la discrepancia como comportamiento ESPERADO en vez de detectarla. Ver Gap #1."
    - "El gate de clase que se supone protege esta garantía para siempre (afirmacionesRespaldadas.test.ts) inspecciona solo el 1,9% del template de app/pages/[game]/index.vue — el único fichero donde han vivido cinco de las seis caras de este defecto — por un regex perezoso que corta en el primer </template> anidado (el de ClientOnly#fallback). Confirmado de forma independiente, coincide con CR-03 de 09-REVIEW.md. Ver Gap #2."
  regressions: []
gaps:
  - truth: "SC3: «Partida terminada» borra la sesión en curso pero nunca el histórico, que vive en localStorage como fuente de verdad — y ninguna afirmación de la interfaz sobre esos datos puede carecer de comprobación real"
    status: failed
    reason: >
      Adjudicado por trazado de código independiente (no por aceptar 09-REVIEW.md sin
      contrastar) y confirmado leyendo el propio test de regresión del cierre de la ronda 5:
      `readStoredProgress(game)` (`app/composables/useStoredProgress.ts:69`) recibe
      ÚNICAMENTE el `GameDefinition`, nunca la sesión que acaba de terminar
      (`app/pages/[game]/index.vue:641`: `const { stored } = readStoredProgress(game)` — 
      `session.value` está a mano en el sitio de la llamada y no se pasa). Estructuralmente
      solo puede contestar «¿hay ALGUNA partida reanudable bajo `tga:progress:<gameId>`?»,
      nunca «¿es ÉSTA la partida que acaba de fallar al registrarse?». Pero la copy que esa
      respuesta selecciona sí habla de una partida concreta: `NOTICE_BODY['failure-recoverable']`
      (`useHistorySavedNotice.ts:142`) dice «La partida no se ha perdido: sigue guardada en el
      dispositivo. Volved a entrar en ella…». La rama que alcanza esa variante
      (`stored === 'resumable'`) se activa precisamente cuando `save(session.value)` (la
      escritura de cierre) ha fallado — es decir, por construcción, lo que hay en el
      dispositivo NO puede ser la sesión que acaba de terminar salvo coincidencia; es lo que
      dejó el último autoguardado ANTERIOR que sí funcionó. He confirmado, leyendo
      `avisoTrasRegistroFallido.test.ts:187-224` (test 5, el propio test de regresión que el
      plan 09-26 escribió para cerrar el BLOCKER de la ronda 5), que esta discrepancia está
      grabada como comportamiento ESPERADO y en verde: el doble de almacenamiento escribe con
      éxito tres autoguardados (`cursor: 0/1/2`) y falla en el cuarto (`cursor: 3`, la partida
      real); el test afirma que la variante correcta es `failure-recoverable` con ese estado
      — sin comprobar que `cursor: 2` (lo que hay en el dispositivo) coincide con `cursor: 3`
      (lo que acaba de terminar). El daño no se queda en la frase: el reintento que el aviso
      ordena pasa por `ResumePrompt` → «Partida terminada» → `record(session.value, outcome)`
      → `buildHistoryEntry` (`engine/history.ts:51,62,67,107`), que lee `session.round` y
      `session.context` (villano/héroes) TAL CUAL de lo que `resume()` restauró del snapshot
      viejo — confirmado leyendo `engine/history.ts`: no hay ninguna comparación con un
      estado «esperado». Si el grupo eligió héroes o avanzó de ronda después del último
      autoguardado que funcionó, el histórico —el único dato irreconstruible de la app— queda
      con la ronda equivocada y, potencialmente, `villainId`/`heroId` distintos de los reales,
      sin ningún aviso. Es la sexta cara del mismo defecto de fondo que las cinco rondas
      anteriores llevan cerrando: se ha cambiado el respaldo de un booleano de escritura a
      una lectura real (correcto, cierra el hallazgo literal de la ronda 5), pero esa lectura
      sigue contestando una pregunta distinta («¿hay algo?») de la que la frase hace («¿es
      ESTO?»). `09-AUDIT-AFIRMACIONES-UI.md` (adenda ronda 5, Q5) marca `HistorySavedNotice.vue`
      como RESPALDADA por comprobar que `stored` viene de una lectura real y no de un booleano
      de escritura — pero Q5 («¿el dato que respalda esta frase responde a la MISMA pregunta
      que la frase hace?»), la pregunta inventada explícitamente para cazar este patrón, no se
      aplicó hasta el fondo sobre esta fila: se quedó en «viene de una lectura», sin llegar a
      «¿de la lectura CORRECTA para la pregunta que el texto plantea?». Un segundo hallazgo
      relacionado (CR-02 de `09-REVIEW.md`, también confirmado por lectura directa): la
      variante `failure-unknown` (`NOTICE_BODY`, `useHistorySavedNotice.ts:144`) delega en el
      grupo una inferencia de ausencia («si os pide jugadores y dificultad, esa partida ya no
      está») que la app no puede respaldar, porque el mini-setup aparece por tres caminos
      distintos (ausencia genuina, fallo de lectura persistente, posición existente pero
      inservible) y `onMounted` (`index.vue:158-163`) consume `informe.outcome`, no
      `informe.stored` — con `'absent'` y `'unknown'` colapsando ambos a `outcome: 'fresh'`,
      así que el propio montaje tampoco puede distinguir los tres casos que la copy le pide al
      grupo que distinga por su cuenta.
    artifacts:
      - path: "app/composables/useStoredProgress.ts"
        issue: "líneas 69-98: readStoredProgress(game) no recibe la sesión que acaba de terminar ni ningún otro identificador de ronda/contexto con el que comparar lo leído; solo puede contestar 'hay algo' / 'no hay nada' / 'no sé', nunca 'es lo mismo que acaba de fallar'"
      - path: "app/composables/useHistorySavedNotice.ts"
        issue: "línea 142: NOTICE_BODY['failure-recoverable'] afirma 'la partida... sigue guardada... volved a entrar en ella', una afirmación sobre identidad de partida que la autoridad no comprueba"
      - path: "app/pages/[game]/index.vue"
        issue: "línea 641: readStoredProgress(game) se llama sin pasar session.value, pese a estar disponible en el mismo scope; línea 158-163 (onMounted): consume informe.outcome, no informe.stored, colapsando 'absent' y 'unknown' en el mismo camino observable (mini-setup)"
      - path: "app/composables/__tests__/avisoTrasRegistroFallido.test.ts"
        issue: "test 5 (líneas 187-224): reproduce exactamente el escenario de snapshot desactualizado y afirma como CORRECTO que la variante sea 'failure-recoverable', sin comprobar que el cursor recuperado coincida con el de la partida que terminó — el test protege la regresión de la ronda 5 pero consolida la de la ronda 6 como comportamiento esperado"
      - path: ".planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-AFIRMACIONES-UI.md"
        issue: "adenda ronda 5 (Q5): marca HistorySavedNotice.vue como RESPALDADA verificando que el dato viene de una lectura real, sin verificar que esa lectura conteste la MISMA pregunta que el texto plantea — la propia pregunta que Q5 dice perseguir"
    missing:
      - "readStoredProgress(game, expected?: EngineSession) debe poder comparar la posición leída (runtimeId/round/context) contra la sesión que acaba de terminar, y devolver un cuarto valor (p.ej. 'stale') cuando hay algo pero NO es esa partida — la propuesta de fix de CR-01 en 09-REVIEW.md (comparar enDisco contra objetivo) es concreta y no exige rediseñar el resto del cierre de la ronda 5"
      - "Una variante 'failure-stale' (o equivalente) cuya copy no prometa 'esta partida' ni instruya un reintento que arriesgue registrar el snapshot viejo en el histórico irreconstruible"
      - "onMounted debe consumir informe.stored (no informe.outcome) para no colapsar 'absent' y 'unknown' en el mismo camino, cerrando también CR-02"
      - "Test de regresión que siembre un snapshot ANTERIOR con cursor/ronda distintos de la partida que termina, y compruebe que la variante YA NO es 'failure-recoverable' sin más matices, o que el reintento instruido no pueda escribir en el histórico datos de una partida distinta"
      - "Sincronizar REQUIREMENTS.md: la nota de HIST-06 debe registrar que la ronda 6 encontró una séptima variante del mismo patrón (cambio de escritura a lectura real, pero lectura que contesta una pregunta distinta de la del texto), no dar el hueco por cerrado"
  - truth: "El gate automatizado que protege la garantía de SC3 para toda la clase de defecto (no solo el caso puntual de cada ronda) inspecciona de verdad las superficies de riesgo"
    status: failed
    reason: >
      Must-have propio del plan 09-26 («Existe un test que se pone ROJO si alguien añade una
      frase nueva sobre los datos del grupo a cualquier `.vue`... el gate protege la CLASE, no
      el caso concreto de la ronda 5»). Confirmado de forma independiente, coincidiendo con
      CR-03 de `09-REVIEW.md` y con el hecho ya verificado por el orquestador: `extraerTemplate`
      (`afirmacionesRespaldadas.test.ts:83-86`) usa `sfc.match(/<template[^>]*>([\s\S]*?)<\/template>/)`,
      un cuantificador perezoso que termina en el PRIMER `</template>` del fichero. Medido
      directamente con Node sobre el árbol actual: sobre `app/pages/[game]/index.vue` la
      captura son 761 caracteres (el cierre del `<template #fallback>` de `ClientOnly`, que
      solo contiene el mensaje «Cargando…»), frente a ~7.090+ caracteres de plantilla real
      hasta el último `</template>` del fichero — es decir, el gate deja fuera `ResumePrompt`,
      `ConfirmDialog`, `ContentChangedNotice` y `GameOutcomeDialog`, que es exactamente donde
      han vivido cinco de las seis caras de este defecto en toda la fase. El propio Gap #1 de
      esta ronda (CR-01) demuestra el efecto: una afirmación con un respaldo insuficiente pasó
      los tres gates (A, B y C) en verde. Además, ninguno de los tres gates mira `<script setup>`
      (WR-04 de `09-REVIEW.md`, confirmado: `endGameBody`, `app/pages/[game]/index.vue:469-471`,
      afirma «Se borrará el progreso guardado... Esta acción no se puede deshacer», falso en la
      rama donde `planGameEnd` decide `preserveProgress: true`, y ninguna de sus palabras está
      en la lista vigilada por el gate). Este hallazgo es distinto del Gap #1: aunque CR-01 no
      existiera, el gate seguiría sin poder detectar la siguiente cara del mismo patrón en el
      fichero donde más veces ha aparecido.
    artifacts:
      - path: "app/composables/__tests__/afirmacionesRespaldadas.test.ts"
        issue: "líneas 83-86: extraerTemplate corta en el primer </template>, cubriendo el 1,9% del template de app/pages/[game]/index.vue (761 de ~7.090+ caracteres, medido con Node); ninguno de los tres gates barre <script setup>, así que endGameBody (WR-04/IN-03, abierto desde la ronda 4) sigue invisible"
    missing:
      - "Sustituir el recorte por template por un régimen 'quitar comentarios y <style>, barrer el resto' (la propuesta de CR-03 en 09-REVIEW.md), o al menos usar un parser de SFC real en vez de una regex de límites"
      - "Extender el barrido de copy a <script setup> y a app/**/*.ts (no solo NOTICE_BODY), con la lista de frases ampliada que WR-04 de 09-REVIEW.md propone"
      - "Un test de auto-verificación del propio gate que compruebe que detecta una frase inyectada dentro de un <template> anidado, para que este hueco no pueda reabrirse en silencio"
deferred: []
human_verification:
  - test: "Comprobación visual en tablet horizontal real (viewport ~1180×820, npm run dev): terminar una partida con la variante de aviso de fallo (larga, 20s) visible y observar si tapa controles de la cabecera de /historico, y provocar (o simular con devtools) una detección de actualización de PWA simultánea al aviso de histórico para confirmar visualmente si una banda tapa por completo a la otra"
    expected: "Ninguna banda debería impedir ver o tocar los controles de cabecera de /historico, y si ambas bandas coinciden en el tiempo, ambas deberían seguir siendo visibles y utilizables (apiladas, no superpuestas)"
    why_human: "Es un juicio visual sobre solapamiento real en un viewport físico — greppear el CSS ya demuestra que ambas bandas comparten exactamente `fixed top-0 inset-x-0 z-40` con fondo opaco y se montan como hermanas (confirmado de nuevo en app/app.vue y en los dos componentes: sin cambios desde la ronda 5), pero solo un humano puede confirmar el impacto real en pantalla y decidir si es aceptable. Este ítem sigue PENDIENTE explícitamente bajo DEV-02 de REQUIREMENTS.md desde 09-22-SUMMARY.md; no se abre una entrada nueva por esto."
---

# Fase 9: Histórico y estadísticas — Informe de verificación (6ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-13
**Estado:** gaps_found (1 BLOCKER de contenido — sexta cara del defecto de fondo, reproducido de forma independiente y confirmado con el propio test de regresión del cierre — más 1 BLOCKER de proceso — el gate de clase no vigila donde más ha hecho falta)
**Re-verificación:** Sí — tras el lote de cierre 09-24..09-27

## Resumen ejecutivo

El lote 09-24..09-27 hace exactamente lo que dice que hace respecto al BLOCKER LITERAL que la
ronda 5 encontró: existe ahora una autoridad de lectura única (`readStoredProgress`), un tipo
`StoredProgress` de tres valores que impide colapsar «no hay nada» con «no he podido
comprobarlo», una barrera de tipos real (`npm run typecheck`, en CI), y una guarda de
reentrada. Todo esto lo he confirmado leyendo el código directamente, no aceptando el SUMMARY.

Pero **la clase de defecto que esta fase lleva cinco rondas cerrando sigue abierta, en una
sexta variante que el propio cierre de la ronda 5 introdujo**: `readStoredProgress(game)` ya
no se apoya en un booleano de escritura (correcto, eso cierra el hallazgo literal de la ronda
5), pero sigue contestando una pregunta distinta de la que el texto de la interfaz hace. El
texto de `failure-recoverable` promete «esta partida sigue guardada»; la autoridad solo puede
comprobar «hay ALGUNA partida reanudable», porque nunca recibe la sesión que acaba de terminar
para compararla. He confirmado, no deducido, que esta discrepancia es real: el propio test de
regresión que el plan 09-26 escribió para cerrar el BLOCKER de la ronda 5
(`avisoTrasRegistroFallido.test.ts`, test 5) siembra tres autoguardados válidos y uno fallido
posterior, y afirma como comportamiento CORRECTO que se muestre «sigue guardada» — sin
comprobar que lo guardado es la misma partida. El reintento que el aviso instruye puede
registrar en el histórico —el único dato irreconstruible de la app— una ronda y una selección
de héroes/villano distintas de las reales.

Adicionalmente, he confirmado de forma independiente el hallazgo del orquestador (CR-03 de
`09-REVIEW.md`): el gate de clase (`afirmacionesRespaldadas.test.ts`) que se supone impide que
esta clase de defecto reaparezca inspecciona solo 761 de aproximadamente 7.090+ caracteres de
plantilla de `app/pages/[game]/index.vue` — el fichero donde han vivido cinco de las seis caras
de este defecto — porque su regex de extracción corta en el primer `</template>` anidado (el
del `<template #fallback>` de `ClientOnly`). Esto no es un hallazgo cosmético: explica
mecánicamente por qué ni Q5 de `09-AUDIT-AFIRMACIONES-UI.md` ni los tres gates automatizados
detuvieron la sexta cara del defecto antes de que llegara a esta verificación.

No he encontrado evidencia de que ninguno de los dos hallazgos esté cubierto por planes ya
cerrados, ni de que sean un riesgo aceptado documentado en `deferred-items.md` — no aparecen
ahí. La nota de cierre de hueco que `REQUIREMENTS.md` mantiene sobre HIST-06 ya reconoce que
sigue reabierto (`[ ]`), correctamente, a la espera de esta ronda.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria del ROADMAP) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o cerrar sin registrar | ✓ VERIFIED | Sin cambios desde la ronda 5; `onOutcomeDismiss` sigue terminando sin registrar, sin condiciones |
| 2 | SC2: el registro incluye resultado/causa/villano/héroe/nombres/fecha/dificultad/nº jugadores/duración/rondas, calculados por el motor | ✓ VERIFIED (flujo normal) | `buildHistoryEntry` (`engine/history.ts`) normaliza los campos en origen; sin cambios desde la ronda 5. Ver matiz en Gap #1: en la RAMA DE REINTENTO tras un fallo de escritura, el registro puede construirse a partir de un `session` desactualizado |
| 3 | SC3: histórico listable/borrable con confirmación; «Partida terminada» borra solo la sesión, nunca el histórico — sin confirmaciones falsas ante un fallo | ✗ FAILED | Mecánica de listar/borrar/no-tocar-histórico sigue VERIFICADA. La garantía de «ninguna afirmación no comprobada» FALLA de nuevo, sexta variante — ver Gap #1, adjudicado por trazado de código propio y por el propio test de regresión del cierre |
| 4 | SC4: pantalla de estadísticas accesible desde inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | Sin cambios desde la ronda 5 |
| 5 | SC5: estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -rn "firestore\|firebase"` sobre `app/` y `engine/` sigue sin producir ningún resultado |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/composables/useStoredProgress.ts` `readStoredProgress()` | Autoridad única de lectura del progreso, sin booleanos de escritura | ✓ VERIFIED (para la pregunta que SÍ contesta) / ✗ INSUFICIENTE (para la pregunta que el texto plantea) | Lectura real vía `resume()`, confirmado leyendo el código — pero no recibe la sesión a comparar (línea 69), así que no puede distinguir «esta partida» de «alguna partida» |
| `app/composables/useHistorySavedNotice.ts` `planGameEnd`/`resolveNoticeVariant` | Tabla total sobre los tres valores de `StoredProgress`, copy como dato | ✓ VERIFIED (mecánicamente) | Total sobre los tres valores, tal y como afirma; el defecto no está en que falte una rama, sino en que la autoridad que alimenta la tabla mide lo equivocado |
| `app/pages/[game]/index.vue` `onOutcomeRecorded` | La variante de aviso refleja con precisión si LA PARTIDA QUE ACABA DE TERMINAR es recuperable | ✗ STUB (respecto a la promesa del texto) | Línea 641: `readStoredProgress(game)` sin pasar `session.value`; no hay forma de que la respuesta distinga la partida actual de un autoguardado anterior |
| `app/composables/__tests__/avisoTrasRegistroFallido.test.ts` | Cubre la costura real que la ronda 5 debía cerrar, sin abrir una nueva | ⚠ CONTRAPRODUCENTE | El test 5 (líneas 187-224) reproduce el escenario exacto de la ronda 6 y afirma el resultado incorrecto (`failure-recoverable` sin comprobar identidad de partida) como el comportamiento esperado — protege la regresión de la ronda 5 mientras fija en verde la de la ronda 6 |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (gate de clase) | Impide que CUALQUIER afirmación nueva sobre los datos del grupo pase sin respaldo, en cualquier `.vue` | ✗ INSUFICIENTE | `extraerTemplate` cubre el 1,9% del template de `index.vue` (761 de ~7.090+ caracteres, medido con Node de forma independiente); ninguno de los tres gates mira `<script setup>` |
| `.planning/phases/09-hist-rico-y-estad-sticas/09-AUDIT-AFIRMACIONES-UI.md` | Barrido con Q5 («¿el dato responde la MISMA pregunta que la frase?») aplicado hasta el fondo | ⚠ INCOMPLETO | Q5 se aplicó parcialmente sobre `HistorySavedNotice.vue`: comprobó que el dato viene de una lectura real, no que esa lectura conteste la pregunta exacta que el texto plantea |
| `app/pages/estadisticas.vue`, `app/pages/historico.vue` | Pantallas completas, wireadas a `useGameHistory` | ✓ VERIFIED | Sin cambios desde la ronda 5 |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `HistorySavedNotice.vue` (variant `failure-recoverable`) | Identidad de LA partida que acaba de terminar | Afirmación de texto → dato verificado | ✗ NOT_WIRED | La variante depende de `readStoredProgress(game)`, que no recibe ni compara `session.value`; el enlace mide «hay algo reanudable», no «es esto» |
| `[game]/index.vue` `onMounted` | `readStoredProgress().stored` | Distinguir `absent` de `unknown` | ✗ NOT_WIRED | `onMounted` (línea 158-163) consume `informe.outcome`, no `informe.stored`; ambos valores colapsan al mismo `outcome: 'fresh'` (WR-02 de `09-REVIEW.md`, confirmado leyendo el código) |
| `[game]/index.vue` `onOutcomeRecorded` | `record()`/`save()`/`readStoredProgress()` → `finishGame(plan.preserveProgress)` | orden `silence()`→`record()`→`save()`→lectura→`notifyHistorySaved()`→`finishGame()` | ✓ WIRED | Orden D-U4 verificado literalmente en el código, líneas 637-644; la guarda de reentrada (línea 630) también confirmada |
| `afirmacionesRespaldadas.test.ts` Gate A | `<template>` completo de cada `.vue` | `import.meta.glob` + `extraerTemplate` | ✗ PARTIAL | El recorrido de ficheros es correcto (recursivo, sin lista a mano); la EXTRACCIÓN del contenido de cada fichero es la que falla en los `.vue` con `<template>` anidado |
| `app/pages/index.vue` | `/historico`, `/estadisticas` | `navigateTo` | ✓ WIRED | Sin cambios desde la ronda 5 |
| `useGameHistory().statisticsView` | `engine/statistics.aggregateStatistics` | import + llamada | ✓ WIRED | Sin cambios desde la ronda 5 |

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| HIST-01 | 09-02, 09-07 | Ofrecer registrar el resultado | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| HIST-02 | 09-01, 09-02, 09-07, 09-16 | Ganada/Perdida, siempre se puede cerrar sin registrar | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| HIST-03 | 09-01, 09-02, 09-07 | Causa si Perdida | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| HIST-04 | 09-01, 09-05, 09-12, 09-14, 09-15, 09-17 | Registro completo | ✓ SATISFIED (flujo normal) / ⚠ en riesgo en la rama de reintento tras fallo de escritura | Ver Gap #1: `buildHistoryEntry` puede construir el registro a partir de un `session` desactualizado si el grupo sigue la instrucción de reintento de `failure-recoverable` |
| HIST-05 | 09-01, 09-07 | Motor expone inicio/ronda | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| HIST-06 | 09-04, 09-09, 09-12, 09-13, 09-16, 09-17, 09-18, 09-20, 09-21, 09-23, 09-24, 09-25, 09-26, 09-27 | Histórico en localStorage, fuente de verdad | ✗ NO CONFIRMADO — reabierto correctamente en `REQUIREMENTS.md` (`[ ]`) | El HISTÓRICO en sí (`tga:history`) sigue protegido frente a fallos de lectura/escritura ya cerrados en rondas 1-4. La reserva sigue siendo sobre el mecanismo adyacente de recuperación del PROGRESO: la lectura ya es real (cierre del hallazgo literal de la ronda 5), pero contesta una pregunta distinta de la que el texto plantea (Gap #1), y puede llevar a escribir en el histórico —irreconstruible— datos de una partida distinta a la que terminó |
| HIST-07 | 09-05, 09-06, 09-08, 09-10, 09-11, 09-17 | Pantalla lista más reciente→antigua | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| HIST-08 | 09-05, 09-06, 09-09, 09-11 | Borrado con confirmación | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| HIST-09 | 09-04, 09-07, 09-08, 09-16, 09-18, 09-20, 09-23 | «Partida terminada» borra sesión, nunca histórico | ✓ SATISFIED (literal) | `clear(gameId)` solo toca `tga:progress:<gameId>`; el requisito literal se cumple. La promesa AÑADIDA sobre identidad de la partida preservada (que sea LA misma) es la que sigue sin sostenerse |
| STAT-01 | 09-08 | Pantalla accesible desde inicio | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| STAT-02 | 09-03, 09-06, 09-08, 09-11 | % victorias por héroe | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| STAT-03 | 09-03, 09-06, 09-08, 09-11 | % victorias por villano | ✓ SATISFIED | Sin cambios desde la ronda 5 |
| STAT-04 | 09-04, 09-08, 09-11 | Solo localStorage, nunca Firestore | ✓ SATISFIED | Ver truth #5 |
| STAT-05 | 09-02, 09-06, 09-08, 09-10, 09-11 | Estado vacío claro | ✓ SATISFIED | Sin cambios desde la ronda 5 |

Ningún requisito huérfano: los 14 IDs de la fase (HIST-01..09, STAT-01..05) aparecen en al menos
un frontmatter de plan y en `.planning/REQUIREMENTS.md`, con fila propia en la tabla de
trazabilidad (líneas 255-268). HIST-06 sigue marcado `[ ]` (reabierto) en la lista de checkboxes
de la sección HIST — coherente con esta verificación, que confirma que NO debe cerrarse todavía.

### Anti-Patrones Encontrados

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/composables/useStoredProgress.ts` + `app/pages/[game]/index.vue` | `useStoredProgress.ts:69`; `index.vue:641` | Afirmación de UI respaldada por una lectura que contesta una pregunta distinta de la que el texto hace (misma clase, sexta cara) | 🛑 BLOCKER | Objeto del Gap #1 — riesgo de corrupción silenciosa del histórico (dato irreconstruible) en el camino de reintento |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` | 83-86 | El gate de clase inspecciona el 1,9% de la plantilla del fichero de mayor riesgo por un regex perezoso | 🛑 BLOCKER | Objeto del Gap #2 — explica mecánicamente por qué el Gap #1 no fue atrapado antes de esta verificación; sin este fix, la séptima cara tampoco se detectaría a tiempo |
| `app/pages/[game]/index.vue` | 158-163 | `onMounted` consume `informe.outcome`, no `informe.stored`; `'absent'` y `'unknown'` colapsan al mismo camino observable | ⚠ WARNING | WR-02 de `09-REVIEW.md`, confirmado: un fallo de lectura transitorio en el progreso puede mostrarse como «no hay nada», y el primer autoguardado de una partida nueva machacaría una posición vieja que quizá seguía ahí |
| `app/pages/[game]/index.vue` | 469-471 | `endGameBody` (`<script setup>`) afirma «Se borrará el progreso guardado... no se puede deshacer», falso cuando `planGameEnd` decide `preserveProgress: true` | ⚠ WARNING (heredado, abierto desde la ronda 4 como IN-03) | Ninguno de los tres gates del fichero de test mira `<script setup>`, así que este caso conocido sigue invisible al gate (WR-04 de `09-REVIEW.md`) |
| `app/components/HistorySavedNotice.vue` | 63-78 | Comentario documenta el contrato DEROGADO («con el booleano que la respalde») e instruye a reintroducirlo | ⚠ WARNING | WR-05 de `09-REVIEW.md`, confirmado: el segundo argumento ya no es un booleano sino `StoredProgress`; dejar la instrucción vieja en pie es dejar la trampa puesta para quien toque el fichero después |
| `app/components/UpdateBanner.vue` + `app/components/HistorySavedNotice.vue` | ambas `fixed top-0 inset-x-0 z-40` | Dos bandas idénticas en posición/z-index, montadas como hermanas en `app.vue`, sin coordinación entre sí | ⚠ WARNING | Sin cambios desde la ronda 5; sigue abierto y sigue fuera del alcance de los planes de esta ronda |
| `app/pages/[game]/index.vue` | 637-647 | `readStoredProgress`/`resume`/`expand` (dentro de `onOutcomeRecorded`) no están envueltos en `try/catch`, a diferencia de las funciones de almacenamiento | ⚠ WARNING | WR-06 de `09-REVIEW.md`: si cualquiera de las tres líneas nuevas lanza, se reproduce el patrón que WR-10 (ronda 4) describe — diálogo cerrado, sin aviso, sin navegación |

No se han encontrado marcadores de deuda (`TODO`/`FIXME`/`TBD`/`XXX`/`HACK`) sin referencia en
los ficheros tocados por el lote 09-24..09-27 (las únicas coincidencias de grep son la palabra
española «TODOS», no el marcador).

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
cambios desde la ronda 5), pero el impacto real en un dispositivo físico y la decisión de si
es aceptable requieren juicio humano. Sigue marcado como PENDIENTE bajo `DEV-02` de
`REQUIREMENTS.md` desde `09-22-SUMMARY.md`; no es un hallazgo nuevo de esta ronda.

### Gaps Summary

El objetivo de la fase sigue sin alcanzarse en su criterio de éxito nº 3 (SC3): la garantía de
que ninguna afirmación de la interfaz sobre los datos del grupo carece de comprobación real.
Seis rondas de verificación han encontrado y cerrado seis variantes concretas de este mismo
defecto de fondo (CR-01/CR-02 rondas 1-3 en el motor y la capa de almacenamiento; CR-01 ronda
4 en el aviso de fallo del registro basado en un booleano de escritura descartado; el BLOCKER
literal de la ronda 5, el mismo aviso basado en un booleano de escritura real pero que
certificaba solo «la escritura de AHORA»). Esta sexta ronda encuentra una séptima cara,
introducida por el propio cierre de la quinta: la autoridad de lectura ya no se apoya en
ningún booleano de escritura —eso queda genuinamente cerrado—, pero la lectura que la
sustituye contesta «¿hay algo reanudable?» en vez de «¿es ESTO lo que acaba de terminar?», que
es la pregunta exacta que el texto de `failure-recoverable` plantea. Lo he confirmado no solo
leyendo el código, sino leyendo el propio test de regresión que el lote de cierre escribió
para demostrar que el BLOCKER de la ronda 5 quedaba cerrado (`avisoTrasRegistroFallido.test.ts`,
test 5): ese test siembra el escenario exacto de esta séptima cara (autoguardados previos
válidos + fallo de la escritura de cierre) y fija como comportamiento CORRECTO exactamente la
respuesta que produce el defecto.

Un segundo hallazgo, de proceso más que de contenido, agrava la situación: el gate automatizado
que el plan 09-26 introdujo explícitamente para «proteger la CLASE, no el caso concreto»
inspecciona solo el 1,9% de la plantilla del único fichero donde han vivido cinco de las seis
caras de este defecto, por un regex perezoso que corta en el primer `</template>` anidado. Esto
explica mecánicamente por qué ninguno de los tres gates, ni la adenda Q5 del barrido de
afirmaciones, detuvo la séptima cara antes de esta verificación — y significa que, sin
corregirlo, una octava cara tampoco sería detectada a tiempo por el propio mecanismo que existe
para evitarlo.

La corrección propuesta para el primer hallazgo es acotada (pasar `session.value` a
`readStoredProgress` y comparar contra lo leído; el propio `09-REVIEW.md` la desarrolla con
código concreto) y no exige rediseñar el resto del cierre de la ronda 5. La del segundo también
es acotada (sustituir el recorte de plantilla por un barrido del fichero completo menos
comentarios/`<style>`). Ninguna de las dos exige revertir trabajo ya cerrado — pero ambas son
necesarias antes de dar la fase por completa, porque repiten exactamente el patrón que el grupo
lleva seis rondas pidiendo que se cierre de raíz, y porque la segunda es la razón estructural
por la que la primera no se detuvo sola.

Adicionalmente, un WARNING no cerrado (solapamiento mutuo entre `UpdateBanner` y
`HistorySavedNotice`) y la comprobación visual humana pendiente desde 09-22 siguen abiertos; no
bloquean el objetivo de la fase por sí solos.

---

_Verificado: 2026-09-13T12:42:18Z_
_Verificador: Claude (gsd-verifier)_
