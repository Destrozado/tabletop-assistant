---
phase: 09-hist-rico-y-estad-sticas
verified: 2026-09-22T17:10:00Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
covered_files: [".planning/REQUIREMENTS.md", ".planning/ROADMAP.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-37-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-37-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-38-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-38-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-39-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-39-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-40-PLAN.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-40-SUMMARY.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-REVIEW.md", ".planning/phases/09-hist-rico-y-estad-sticas/09-VERIFICATION.md", ".planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md", "app/components/ContentChangedNotice.vue", "app/components/ResumePrompt.vue", "app/composables/__tests__/afirmacionesRespaldadas.test.ts", "app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts", "app/composables/__tests__/useProgressMismatchMark.test.ts", "app/composables/__tests__/useStoredProgress.test.ts", "app/composables/__tests__/vocabularioDeAfirmaciones.ts", "app/composables/useProgressMismatchMark.ts", "app/composables/useStoredProgress.ts", "app/pages/[game]/index.vue"]
covered_digest: "v1:sha256:dbe65c37f342bdd5d727beb50f9acd57b2092dffa8fef70a8f02200792e12ae0"
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "CR-01 (09-REVIEW.md ronda 8, confirmado en 09-VERIFICATION.md ronda 8): `onResumeContinue` no llamaba a `clearProgressMismatch`. Cerrado por el plan 09-38 por DOS vías independientes, ambas confirmadas por lectura directa y por ejecución: (a) `onResumeContinue` (`app/pages/[game]/index.vue:546`) ahora llama a `clearProgressMismatch(gameId)`; (b) la marca (`useProgressMismatchMark.ts`) ahora exige una huella del referente (`huellaDelProgreso`, `useStoredProgress.ts`) en el momento de LEER, no solo de escribir — así que aunque (a) no existiera, el autoguardado que sigue a «Continuar» cambia `updatedAt` y por tanto la huella, invalidando la marca por construcción. Confirmado con un test ad-hoc ejecutado y retirado en esta misma verificación (ver Behavioral Spot-Checks) que reproduce el ciclo completo SIN llamar nunca a `clearProgressMismatch`, y el lector devuelve `null` igualmente."
    - "WR-01 (mismo informe): la rama `content-changed-notice` calculaba el aviso sin pintarlo ni retirarlo. Cerrado por el plan 09-38: `ContentChangedNotice.vue` ahora acepta y pinta `mismatchWarning` (confirmado por lectura del `.vue`, prop declarada y `v-if` en la plantilla), y `onContentChangedAcknowledge` (`index.vue:788`) llama a `clearProgressMismatch`."
    - "El hallazgo sobre la propia documentación (`deferred-items.md` afirmaba «no dice algo falso» sin cubrir el caso en que la marca persiste siendo falsa) — cerrado por el plan 09-40: la sección «La marca de progreso que no coincide vive en memoria» distingue ahora por escrito el Caso A (pérdida, aceptado) del Caso B (persistencia falsa, cerrado por 09-38 por construcción), y registra el nuevo camino de pérdida que introduce la huella (cualquier reescritura, incluido el propio autoguardado, invalida la marca) como coste conocido, no como sorpresa."
    - "WR-02/WR-03 de 09-REVIEW.md ronda 8 (evasiones del mecanismo de excepción auditada: `respaldoExiste` solo comprobaba existencia de ruta, no relevancia; el detector de motivo circular dependía de una única subcadena literal) — cerrado por el plan 09-39: `respaldoRespaldaA` exige ahora relevancia de contenido (raíz o identificador comprobable presente en el fichero citado) y `motivoNombraAlgoComprobable` es incondicional para toda entrada. Confirmado leyendo el código y los tests dedicados con el contraejemplo literal de la ronda 8 (`useVoiceAnnouncer.ts` sin relación, ahora `respaldoRespaldaA(...) === false`)."
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
advisory:
  - finding: "El gate de invariantes de ciclo de vida (`invariantesDeMarcaDeEstado.test.ts`, nuevo en este lote) tiene dos huecos estructurales propios, confirmados por lectura directa contra el código (no por aceptar `09-REVIEW.md` sin contrastar): (1) `indiceDeCierre`/`argumentosDeNivelSuperior` no cuentan `<`/`>` como profundidad, así que un parámetro o argumento con una coma dentro de un tipo genérico (`Record<string, string>`) inflaría el recuento de argumentos y podría hacer que Pata 1/Pata 2 den un veredicto equivocado sobre una firma futura. (2) `PATRON_ESTADO_DE_MODULO_MUTABLE` (línea 192) acepta `const X = ...` sin anotación de tipo pero RECHAZA `const X: Tipo = ...` — una marca de estado de módulo futura escrita con anotación de tipo explícita (estilo idiomático de TypeScript) evadiría el descubrimiento por completo, en contra de lo que el propio comentario del fichero (línea 191) afirma por escrito («una marca DÉCIMA... entra sola, sin editar ninguna lista»)."
    category: architectural
    reason: "Ninguna de las dos vías afecta a ningún fichero real de hoy (confirmado: ninguna marca ni llamada existente usa genéricos con coma ni `const` con anotación de tipo), así que no hay ningún BLOCKER de producción vivo — coincide con la propia clasificación de `09-REVIEW.md` (WARNING, no critical, 0 hallazgos críticos). Pero es la misma clase de sobre-promesa escrita que esta fase lleva nueve rondas cerrando, reproducida un nivel más abajo en la máquina construida para prevenirla. Se resolvería con los dos parches ya redactados por `09-REVIEW.md` (WR-01/WR-02): añadir `<`/`>` al tracking de profundidad, y permitir una anotación de tipo opcional en la rama `const` del regex de descubrimiento."
    evidence_status: "confirmado por lectura directa de línea (WR-01: líneas 94-128; WR-02: línea 192), sin evidencia de que exista hoy ningún fichero real afectado — no se ha intentado una mutación ejecutada de este hallazgo en esta ronda, a diferencia de CR-01/WR-01 de la ronda 8"
  - finding: "La 'segunda defensa' explícita (`clearProgressMismatch` en `onResumeContinue`/`onContentChangedAcknowledge`) no tiene ningún test que la ejerza directamente: borrar cualquiera de las dos llamadas no pone en rojo ningún test de la suite actual (WR-03 de `09-REVIEW.md`, confirmado por el propio razonamiento de esa revisión y no contradicho por nada encontrado en esta verificación)."
    category: other
    reason: "No es un BLOCKER porque la garantía de SC3 no depende hoy de esa segunda defensa: la validación de huella (defensa primaria) ya hace el caso imposible por construcción, confirmado en esta misma ronda con un test ad-hoc que reproduce el ciclo completo de CR-01 sin invocar `clearProgressMismatch` en ningún momento y obtiene `null` igualmente (ver Behavioral Spot-Checks). La defensa sin test sigue siendo deuda de cobertura genuina — un futuro refactor podría romperla sin aviso — pero no una afirmación falsa hoy."
    evidence_status: "confirmado por test ad-hoc ejecutado y retirado en esta verificación (ver Behavioral Spot-Checks); ningún test permanente en el árbol ejerce las dos llamadas de la página directamente"
human_verification:
  - test: "Comprobación visual en tablet horizontal real (viewport ~1180×820, npm run dev): repetir el guion acumulado de rondas anteriores (DEV-02) — variante de aviso de fallo larga (20s), posible solapamiento con `UpdateBanner`, texto de `failure-stale`, aviso de discrepancia dentro de `ResumePrompt` — y comprobar AHORA TAMBIÉN, por primera vez desde que existe, que el mismo aviso de discrepancia (`PROGRESS_MISMATCH_WARNING`) se lee completo y sin desbordar dentro de `ContentChangedNotice.vue` (superficie de pantalla nueva del plan 09-38, nunca vista renderizada en un dispositivo físico)."
    expected: "Ningún control de cabecera queda tapado de forma invisible por las bandas fijas; el texto de `failure-stale`, y el aviso de `PROGRESS_MISMATCH_WARNING` dentro de `ResumePrompt` Y dentro de `ContentChangedNotice`, se leen completos, sin desbordar el modal ni el aviso, a un brazo de distancia."
    why_human: "El solapamiento y el desbordamiento son juicios visuales sobre un viewport físico que el grep de CSS no puede sustituir. Sigue PENDIENTE explícitamente bajo DEV-02 de REQUIREMENTS.md desde 09-22-SUMMARY.md; el punto de `ContentChangedNotice.vue` es superficie de pantalla estrictamente nueva desde el plan 09-38 (ronda 8) que ningún humano ha visto renderizada todavía."
---

# Fase 9: Histórico y estadísticas — Informe de verificación (9ª ronda)

**Objetivo de la fase:** Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.

**Verificado:** 2026-09-22
**Estado:** human_needed (todos los must-haves de código están VERIFIED; queda una comprobación visual humana pendiente, DEV-02, ampliada esta ronda con una superficie de pantalla nueva)
**Re-verificación:** Sí — tras el lote de cierre 09-37..09-40 (gap_closure de la ronda 8) y el code review de esta sesión (`09-REVIEW.md`)

## Resumen ejecutivo

Esta ronda parte de `09-VERIFICATION.md` (ronda 8, `gaps_found`, 4/5), que dejó dos hallazgos
abiertos: (1) SC3 fallaba por NOVENA vez, esta vez dentro del propio mecanismo construido para
cerrar la octava (`onResumeContinue` no invalidaba la marca de discrepancia, la rama
`content-changed-notice` no la pintaba ni la retiraba, y `deferred-items.md` documentaba una
garantía que no cubría ese caso); (2) el gate de clase, aun cerrando las cinco vías literales de
la ronda 7, seguía sin poder atrapar esta clase de defecto porque solo audita texto, no
invariantes de ciclo de vida de estado.

**He confirmado, por trazado de código independiente y por un test de comportamiento ejecutado
en esta misma verificación (no por aceptar los SUMMARY de los planes 09-37..09-40 sin
contrastar), que los dos hallazgos están cerrados en la forma que importa:**

1. **CR-01/WR-01 (producción):** `onResumeContinue` (`app/pages/[game]/index.vue:546`) y
   `onContentChangedAcknowledge` (`:788`) llaman ahora a `clearProgressMismatch`, confirmado por
   lectura directa. Pero además — y esto es lo que hace la garantía estructural, no solo
   disciplinar — `useProgressMismatchMark.ts` exige desde el plan 09-38 una huella del referente
   (`huellaDelProgreso`, `useStoredProgress.ts`, los siete campos de `PersistedPosition`,
   `updatedAt` incluido) en el momento de LEER. Escribí y ejecuté un test ad-hoc (ver
   *Behavioral Spot-Checks*) que reproduce el ciclo completo de CR-01 **sin llamar nunca a
   `clearProgressMismatch`** — marca con una huella, simula el autoguardado que cambia
   `updatedAt`, lee con la huella nueva — y el lector devuelve `null` igualmente. Esto confirma
   independientemente la afirmación central de `09-REVIEW.md`: el mecanismo primario ya hace el
   caso imposible por construcción; la llamada explícita en la página es una segunda defensa
   genuinamente redundante hoy, no la única barrera.
   `ContentChangedNotice.vue` acepta y pinta la prop `mismatchWarning` (confirmado leyendo el
   `.vue` completo: `defineProps` la declara, la plantilla la pinta con `v-if`).
2. **La evaluación de riesgo (`deferred-items.md`):** la sección de la marca en memoria distingue
   ahora por escrito el Caso A (la marca se pierde — aceptado) del Caso B (la marca persiste
   siendo falsa — el que CR-01 confirmó, cerrado por 09-38), y documenta el nuevo camino de
   pérdida que la huella introduce (cualquier reescritura invalida la marca) como coste conocido,
   no como afirmación absoluta sin matiz. Ya no dice «no dice algo falso» sin cualificar el caso.
3. **El gate de clase (`afirmacionesRespaldadas.test.ts`):** las dos evasiones de su propio
   mecanismo de auditoría (WR-02/WR-03 de la ronda 8) están cerradas — `respaldoRespaldaA` exige
   relevancia de contenido, `motivoNombraAlgoComprobable` es incondicional — confirmado con el
   contraejemplo literal de la ronda 8 (`useVoiceAnnouncer.ts`, sin relación, ahora rechazado).
4. **El gate de invariantes de ciclo de vida (`invariantesDeMarcaDeEstado.test.ts`, nuevo):**
   existe, descubre marcas por glob (no por lista tecleada), y sus cinco patas pasan contra el
   árbol real (`npx vitest run` sobre los cuatro ficheros relevantes → 242/242, confirmado en
   esta verificación).

**Pero una revisión de código fresca de esta misma sesión (`09-REVIEW.md`, 0 críticos / 3
warnings / 3 info) encontró dos huecos estructurales propios en esa máquina nueva** —
confirmados aquí por lectura directa de línea, no por aceptar el informe: el partidor de
argumentos del gate de invariantes no cuenta `<`/`>` como profundidad (una firma con un genérico
con coma podría inflar el recuento), y el regex de descubrimiento acepta `const X = ...` pero
rechaza `const X: Tipo = ...` (una marca futura con anotación de tipo evadiría el descubrimiento
por completo). Ninguna de las dos afecta a ningún fichero real de hoy, y ninguna produce una
afirmación falsa que el grupo pueda ver — se reportan como hallazgos ADVISORY (no BLOCKER), en
la misma línea de severidad que la propia revisión les asignó (WARNING, no crítico). Se listan en
el frontmatter para que no se pierdan, y quedan como candidatos naturales para un futuro
gap-closure si el proyecto decide cerrarlos antes de que una marca real los alcance.

**Conclusión: las cinco Success Criteria del ROADMAP están VERIFICADAS.** El defecto que esta
fase persiguió durante nueve rondas —una afirmación de la interfaz sobre los datos guardados del
grupo que no está respaldada, o que lo estuvo y dejó de estarlo sin invalidarse— está cerrado en
producción por una garantía estructural (comparación de huella), no solo por disciplina de
invalidación manual, y lo he confirmado con un test de comportamiento propio, no solo con lectura
de código. Lo único que impide un `passed` es la comprobación visual humana en tablet (DEV-02),
que sigue pendiente y gana esta ronda un punto de guion nuevo (`ContentChangedNotice.vue`) sin que
nadie lo haya marcado como realizado.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria del ROADMAP) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: al pulsar «Partida terminada» se puede registrar Ganada/Perdida (con causa) o cerrar sin registrar | ✓ VERIFIED | Regresión rápida: `onOutcomeDismiss` (`index.vue:770`) sigue terminando sin registrar, sin condiciones. Sin cambios de este lote. |
| 2 | SC2: el registro incluye resultado/causa/villano/héroe/nombres/fecha/dificultad/nº jugadores/duración/rondas, calculados por el motor | ✓ VERIFIED (flujo normal) | `buildHistoryEntry` (`engine/history.ts`) sin cambios en este lote. |
| 3 | SC3: histórico listable/borrable con confirmación; «Partida terminada» borra solo la sesión, nunca el histórico — sin confirmaciones falsas ante un fallo | ✓ VERIFIED | Novena cara cerrada: doble defensa (huella estructural + invalidación explícita) confirmada por lectura de `onResumeContinue`/`onContentChangedAcknowledge`/`ContentChangedNotice.vue` y por test de comportamiento ad-hoc ejecutado en esta ronda (ver Behavioral Spot-Checks) que demuestra que la defensa primaria por sí sola ya cierra el caso. |
| 4 | SC4: pantalla de estadísticas accesible desde inicio, % victorias por héroe/villano, estado vacío claro | ✓ VERIFIED | Regresión rápida: `app/pages/estadisticas.vue` presente (91 líneas), sin cambios en este lote. |
| 5 | SC5: estadísticas lee exclusivamente localStorage, nunca Firestore | ✓ VERIFIED | `grep -rniE "firestore|firebase" app/ engine/` sin resultados, ejecutado de nuevo en esta ronda. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app/composables/useStoredProgress.ts` `huellaDelProgreso`/`StoredProgressReport.huella` | Testigo exacto (7 campos, `updatedAt` incluido) del referente en el momento de leer | ✓ VERIFIED | Confirmado por lectura y por test ad-hoc: dos posiciones idénticas salvo `updatedAt` producen huellas distintas. |
| `app/composables/useProgressMismatchMark.ts` | Marca (`Map<gameId, huella>`) que solo afirma cuando la huella coincide en lectura ESTRICTA | ✓ VERIFIED | `readProgressMismatchWarning` exige `huellaActual !== null` y comparación `===`; confirmado por lectura y por `useProgressMismatchMark.test.ts` (tests 16-22, 22/22 en verde). |
| `app/pages/[game]/index.vue` `onResumeContinue`/`onContentChangedAcknowledge` | Invalidan la marca al continuar/reconocer sobre un snapshot marcado | ✓ VERIFIED | `clearProgressMismatch(gameId)` presente en el cuerpo de ambas (líneas 546 y 788); confirmado por lectura completa del fichero. |
| `app/components/ContentChangedNotice.vue` | Pinta el aviso de discrepancia en su propia rama de montaje | ✓ VERIFIED | `mismatchWarning?: string \| null` en `defineProps`, `<p v-if="mismatchWarning">` en la plantilla; confirmado por lectura del `.vue` completo. |
| `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` | Evaluación de riesgo honesta que distingue pérdida de persistencia-falsa | ✓ VERIFIED | Sección «La marca de progreso que no coincide vive en memoria» reescrita con Caso A/Caso B; ya no contiene la garantía sin cualificar de la ronda 7/8. |
| `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` (gate de invariantes) | Descubre marcas por glob y exige lector-con-testigo, ciclo de vida probado, y pintado en toda rama de montaje | ⚠ VERIFIED CON RESERVA (ver advisory) | Las cinco patas pasan contra el árbol real (242/242 en la suite de 4 ficheros). Dos huecos propios de parsing (`<`/`>` sin profundidad; `const` con anotación de tipo rechazado) no afectan a ningún fichero real hoy — ver `advisory`. |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` (gate de clase) | Impide que cualquier afirmación nueva sobre los datos del grupo pase sin respaldo RELEVANTE | ✓ VERIFIED | `respaldoRespaldaA`/`motivoNombraAlgoComprobable` cierran WR-02/WR-03 de la ronda 8; confirmado con el contraejemplo literal (`useVoiceAnnouncer.ts`) devolviendo `false`. |
| `app/pages/estadisticas.vue`, `app/pages/historico.vue` | Pantallas completas, wireadas a `useGameHistory` | ✓ VERIFIED | Sin cambios desde rondas anteriores (91 y 101 líneas, presentes). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `onResumeContinue` | `clearProgressMismatch` | invalidación al continuar sobre el snapshot marcado | ✓ WIRED | `index.vue:546`, confirmado por lectura. |
| `onContentChangedAcknowledge` | `clearProgressMismatch` | invalidación al reconocer el cambio de contenido | ✓ WIRED | `index.vue:788`, confirmado por lectura. |
| `onMounted` (ambas ramas) | `readProgressMismatchWarning(gameId, informe.huella)` | huella calculada por la misma llamada a `readStoredProgress` | ✓ WIRED | `index.vue:188-208`, confirmado por lectura. |
| `onMounted` (rama `content-changed-notice`) | `<ContentChangedNotice :mismatch-warning="avisoDiscrepancia">` | prop de aviso | ✓ WIRED | `index.vue:889`, confirmado por lectura. |
| `onOutcomeRecorded` | `markProgressMismatch`/`clearProgressMismatch` | `plan.progressMismatch && huella !== null` decide, if/else obligatorio | ✓ WIRED | `index.vue:751-752`, sin cambios de fondo desde la ronda 8. |
| Fingerprint (defensa primaria) | invariante de CR-01 sin depender de la defensa explícita | huella distinta tras autoguardado ⇒ lector devuelve `null` | ✓ WIRED (confirmado por comportamiento) | Test ad-hoc ejecutado en esta verificación: ciclo completo sin invocar `clearProgressMismatch`, resultado `null`. Ver Behavioral Spot-Checks. |
| `invariantesDeMarcaDeEstado.test.ts`/`afirmacionesRespaldadas.test.ts` | `vocabularioDeAfirmaciones.ts` | import compartido, sin copias | ✓ WIRED | Confirmado leyendo los imports de ambos ficheros. |
| `app/pages/index.vue` | `/historico`, `/estadisticas` | `navigateTo` | ✓ WIRED | Sin cambios desde rondas anteriores. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Suite completa del área tocada por el lote (4 ficheros: gate de invariantes, gate de clase, `useProgressMismatchMark`, `useStoredProgress`) | `npx vitest run app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts app/composables/__tests__/afirmacionesRespaldadas.test.ts app/composables/__tests__/useProgressMismatchMark.test.ts app/composables/__tests__/useStoredProgress.test.ts` | 4 archivos, 242 tests, 0 fallos | ✓ PASS |
| `npx tsc --noEmit` | tipos del proyecto completo | exit 0 | ✓ PASS |
| Ausencia de `firestore`/`firebase` en `app/`/`engine/` (SC5) | `grep -rniE "firestore\|firebase" app/ engine/` | sin resultados | ✓ PASS |
| **CR-01 sin la segunda defensa (test ad-hoc, escrito y retirado en esta verificación, sin tocar ningún fichero de producción):** ¿el mecanismo primario (huella) por sí solo, sin ninguna llamada a `clearProgressMismatch`, invalida la marca cuando el referente cambia? | `npx vitest run` sobre un fichero de test temporal (`app/composables/__tests__/adhoc-verification-09-scratch.test.ts`, creado y eliminado en esta sesión de verificación) que marca con `huellaDelProgreso(posVieja)`, simula el autoguardado (`updatedAt` distinto) y lee con `huellaDelProgreso(posNueva)` sin llamar nunca a `clearProgressMismatch` | 1 test, 0 fallos: `readProgressMismatchWarning` devuelve `null` tras el cambio de huella, pese a no invalidar explícitamente | ✓ PASS — confirma independientemente la afirmación central de `09-REVIEW.md` sobre la defensa primaria |

### Requirements Coverage

| Requirement | Source Plan(s) | Descripción | Status | Evidencia |
|---|---|---|---|---|
| HIST-01 | 09-02, 09-07 (+ otros) | Ofrecer registrar el resultado | ✓ SATISFIED | Sin cambios. |
| HIST-02 | 09-01, 09-02, 09-07, 09-16 | Ganada/Perdida, siempre se puede cerrar sin registrar | ✓ SATISFIED | Sin cambios. |
| HIST-03 | 09-01, 09-02, 09-07 | Causa si Perdida | ✓ SATISFIED | Sin cambios. |
| HIST-04 | 09-01, 09-05, 09-12, 09-14, 09-15, 09-17, 09-28, 09-33, 09-37, 09-38, 09-40 | Registro completo | ✓ SATISFIED | La señal de discrepancia en la rama de reintento ya no depende de invalidación manual: la huella la hace correcta por construcción, confirmado por test de comportamiento en esta ronda. |
| HIST-05 | 09-01, 09-07 | Motor expone inicio/ronda | ✓ SATISFIED | Sin cambios. |
| HIST-06 | 09-04..09-40 (26 planes) | Histórico en localStorage, fuente de verdad, sin afirmaciones no respaldadas sobre los datos del grupo | ✓ SATISFIED | Confirmado por esta ronda de verificación independiente: la novena cara (CR-01/WR-01 de la ronda 8) está cerrada en producción por una garantía estructural, verificada con test de comportamiento propio, no solo por lectura de código o por aceptar el SUMMARY del lote. |
| HIST-07 | 09-05, 09-06, 09-08, 09-10, 09-11, 09-17 | Pantalla lista más reciente→antigua | ✓ SATISFIED | Sin cambios. |
| HIST-08 | 09-05, 09-06, 09-09, 09-11 | Borrado con confirmación | ✓ SATISFIED | Sin cambios. |
| HIST-09 | 09-04..09-36 (23 planes) | «Partida terminada» borra sesión, nunca histórico | ✓ SATISFIED | `clear(gameId)` solo toca `tga:progress:<gameId>`. |
| STAT-01 | 09-08 | Pantalla accesible desde inicio | ✓ SATISFIED | Sin cambios. |
| STAT-02 | 09-03, 09-06, 09-08, 09-11 | % victorias por héroe | ✓ SATISFIED | Sin cambios. |
| STAT-03 | 09-03, 09-06, 09-08, 09-11 | % victorias por villano | ✓ SATISFIED | Sin cambios. |
| STAT-04 | 09-04, 09-08, 09-11 | Solo localStorage, nunca Firestore | ✓ SATISFIED | Ver truth #5. |
| STAT-05 | 09-02, 09-06, 09-08, 09-10, 09-11 | Estado vacío claro | ✓ SATISFIED | Sin cambios. |

Ningún requisito huérfano: los 14 IDs de la fase aparecen en al menos un frontmatter de plan
(medido de nuevo en esta ronda sobre 09-37..09-40: HIST-04 en 09-37/09-38/09-40, HIST-06 en las
cuatro, ningún otro ID nuevo) y en `.planning/REQUIREMENTS.md` con fila propia en la tabla de
trazabilidad. **Esta verificación determina que HIST-04 y HIST-06 quedan SATISFIED por primera
vez en esta fase** — el checkbox `[ ]` de `REQUIREMENTS.md`/`ROADMAP.md` sigue sin marcar porque
esta verificación no edita esos ficheros; la sincronización de esas casillas es un paso posterior
(fuera del alcance de este informe), pero la determinación de fondo que las condiciona —una
ronda de verificación independiente que confirme la novena cara cerrada— es la que este
documento entrega.

### Anti-Patrones Encontrados

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` | 94-128 (`indiceDeCierre`/`argumentosDeNivelSuperior`) | No cuentan `<`/`>` como profundidad de anidamiento | ⚠ WARNING | Un parámetro/argumento futuro con una coma dentro de un genérico podría inflar el recuento de aridad y falsear el veredicto de Pata 1/2 sobre una firma que sí cumple. No afecta a ningún fichero real hoy (confirmado). |
| `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts` | 192 (`PATRON_ESTADO_DE_MODULO_MUTABLE`) | Acepta `const X = ...` sin tipo pero rechaza `const X: Tipo = ...` | ⚠ WARNING | Una marca de estado de módulo futura escrita con anotación de tipo explícita evadiría el descubrimiento por completo — contradice literalmente el comentario del propio fichero (línea 191). No afecta a ningún fichero real hoy. |
| `app/pages/[game]/index.vue` + `useProgressMismatchMark.ts` | `onResumeContinue`/`onContentChangedAcknowledge` | La segunda defensa (`clearProgressMismatch` explícito) no tiene ningún test que la ejerza directamente | ⚠ WARNING | Confirmado (no contradicho por esta ronda): borrar cualquiera de las dos llamadas no pone en rojo ningún test permanente del árbol. No es un BLOCKER porque la defensa primaria (huella) ya cierra el caso por sí sola, confirmado con test ad-hoc en esta ronda. |
| `app/components/UpdateBanner.vue` + `app/components/HistorySavedNotice.vue` | ambas `fixed top-0 inset-x-0 z-40` | Dos bandas idénticas en posición/z-index, montadas como hermanas, sin coordinación | ⚠ WARNING | Sin cambios; sigue abierto desde la ronda 4, fuera del alcance de este lote. |
| `app/composables/__tests__/afirmacionesRespaldadas.test.ts` | 959-965 (umbral de longitud) | `motivo.length >= 40` mide forma, no sustancia | ℹ️ INFO | Documentado explícitamente como tal; ya no es la única defensa (WR-02/WR-03 la complementan). Sin cambios de severidad desde la ronda 8. |

No se han encontrado marcadores de deuda (`TODO`/`FIXME`/`TBD`/`XXX`/`HACK`) sin referencia en
ninguno de los ficheros tocados por el lote 09-37..09-40, ni en `deferred-items.md`/
`REQUIREMENTS.md` (comprobado con `grep` en esta ronda).

### Human Verification Required

### 1. Comprobación visual en tablet horizontal real

**Test:** Con `npm run dev` en un viewport de tablet horizontal (~1180×820), repetir el guion
acumulado de DEV-02 (variante de aviso de fallo de 20s, posible solapamiento con `UpdateBanner`,
texto de `failure-stale`, aviso de discrepancia en `ResumePrompt`) y comprobar, por primera vez,
que `PROGRESS_MISMATCH_WARNING` también se lee completo y sin desbordar dentro de
`ContentChangedNotice.vue`.
**Expected:** Ningún control de cabecera queda tapado de forma invisible; los tres avisos de
texto largo (`failure-stale`, `ResumePrompt`, `ContentChangedNotice`) se leen completos, sin
desbordar, a un brazo de distancia.
**Why human:** Solapamiento y desbordamiento en un viewport físico requieren juicio visual real.
Sigue marcado como PENDIENTE bajo `DEV-02` de `REQUIREMENTS.md` desde `09-22-SUMMARY.md`; el
punto de `ContentChangedNotice.vue` es superficie de pantalla estrictamente nueva desde el plan
09-38 (ronda 8) que nadie ha visto renderizada en un dispositivo físico todavía.

### Gaps Summary

Sin gaps. Las cinco Success Criteria del ROADMAP para la Fase 9 están VERIFICADAS, incluida SC3
en su forma completa («sin confirmaciones falsas ante un fallo»), que había fallado en las ocho
rondas anteriores de verificación de esta misma fase. El cierre de esta novena y última cara
confirmada se apoya en una garantía ESTRUCTURAL (comparación de huella del referente en el
momento de leer, no solo disciplina de invalidación manual en cada punto de código), y esta
verificación la confirma con un test de comportamiento propio ejecutado y retirado en esta misma
sesión — no solo con lectura de código ni con el veredicto de `09-REVIEW.md` sin contrastar.

Dos huecos estructurales quedan documentados como ADVISORY en el frontmatter (huecos de parsing
en el gate de invariantes recién construido, y ausencia de test directo sobre la segunda defensa
de la página) — ninguno de los dos tiene hoy una instancia real en el árbol ni produce una
afirmación falsa visible para el grupo; ambos tienen parche ya redactado por `09-REVIEW.md` si el
proyecto decide cerrarlos antes de que una marca futura los alcance.

Lo único que impide un `passed` limpio es la comprobación visual humana en tablet (`DEV-02`),
que sigue pendiente desde `09-22-SUMMARY.md` y gana en esta ronda un punto de guion nuevo
(`ContentChangedNotice.vue`) — añadir el punto al guion no es realizar la comprobación, y no se
escribe aquí que se haya realizado.

---

_Verificado: 2026-09-22T17:10:00Z_
_Verificador: Claude (gsd-verifier)_
