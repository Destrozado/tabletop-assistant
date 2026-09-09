---
phase: 08-valores-conocidos-dentro-del-paso
verified: 2026-09-09T17:05:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Con villano y héroes elegidos, el paso que cita la vida del villano la muestra entre paréntesis junto al texto («…al valor indicado (14)») — incluida la combinación Kang + Experto que antes fallaba"
  gaps_remaining: []
  regressions: []
deferred: []
human_verification: []
---

# Fase 8: Valores conocidos dentro del paso — Informe de verificación

**Objetivo de la fase:** Los pasos que citan un valor conocido (vida del villano, vida inicial
de identidad, tamaño de mano) lo muestran en pantalla —entre paréntesis o en una lista por
jugador según el caso— sin tocar ni un carácter del texto guardado ni de los 37 clips de voz
ya pregenerados.

**Verificado:** 2026-09-09T17:05:00Z
**Estado:** passed
**Reverificación:** Sí — tras el cierre de hueco del plan 08-04 (`gap_closure: true`)

## Logro del objetivo

### Verdades observables

| # | Verdad | Estado | Evidencia |
|---|--------|--------|-----------|
| 1 | Con villano y héroes elegidos, el paso que cita la vida del villano la muestra entre paréntesis junto al texto | ✓ VERIFICADO | El BLOCKER de la ronda anterior (Kang + Experto imprimía 45 mientras la carta física seguía en 36) está cerrado. Reordenación confirmada leyendo el JSON en vivo: `setup.escenario` se recorre `.01 → .04 → .02 → .03 → ...` (comprobado con `node -e` sobre `content/marvel-champions.json`, no solo citado del SUMMARY). El paso `.04` (sustitución de cartas por dificultad) precede ahora al paso `.02` (dial, `value: "villainHealth"`) en ambas dificultades. `computeInitialVillainHealth` (`engine/counters.ts:34`) sigue seleccionando `stage1.expert` solo si existe; para Kang ya se ha sustituido la carta en el momento en que `.02` se lee. Gate de CI ejecutable (`engine/__tests__/content.test.ts:289-347`, describe `CR-01/VAL-01`) que falla si un futuro cambio de contenido vuelve a colocar un paso `value:"villainHealth"` antes del paso de sustitución — demostrado mordiendo sobre una copia mutada en memoria. Checkpoint humano bloqueante de la Task 3 del plan 08-04 aprobado explícitamente ("aprobado"): Kang+Experto (3p) → 45 tras ver el orden de cabeceras `10 de 22` (colocar mazos) → `11 de 22` (sustitución) → `12 de 22` (dial); Kang+Normal (3p) → 36. |
| 2 | Un paso cuyo valor difiere por jugador muestra bajo el texto una lista compacta «Jugador N · Héroe → número», nunca un paréntesis en línea | ✓ VERIFICADO (regresión, sin cambios desde la ronda anterior) | `app/components/StepScreen.vue:136-148`: bloque `<div>` no interactivo (sin `<button>`, sin `›`, sin `@click`, sin `aria-label`); filas producidas solo para `heroHealth`/`handSizeAlterEgo` vía `resolveStepValueRows`/`buildStepValueCells`. Checkpoint humano previo (plan 08-03) sigue vigente y no se revoca. |
| 3 | Sin ninguna selección, esos mismos pasos se muestran exactamente igual que antes, sin hueco ni marcador | ✓ VERIFICADO (regresión) | `{{ actionText }}{{ stepValueSuffix ?? '' }}` (línea 77) renderiza cadena vacía sin selección; `stepValueRows` devuelve `null` (no `[]`) cuando no hay filas y `v-if="stepValueRows && stepValueRows.length"` saca el bloque del DOM por completo. |
| 4 | `git diff` sobre `content/marvel-champions.json` no toca ni un carácter de ningún campo `text` ni `speech` — el valor se añade solo en el renderizado | ✓ VERIFICADO (reconfirmado tras el plan 08-04) | Comparación id-a-id ejecutada de forma independiente en esta sesión entre `bcbe00c` (commit base, posterior a los planes 08-01/02/03) y el contenido actual: `text`, `speech`, `warning`, `warningDetail`, `options`, `optionsWarning`, `optionsWarningDetail`, `variants`, `title`, `citation` de los 32 ids — **0 diferencias**. El `git diff` textual de línea sí muestra `+`/`-` en líneas `"text"`/`"speech"` porque el plan 08-04 **movió de sitio** el objeto `setup.escenario.04` (reordenación, no reescritura) — el SUMMARY lo documenta explícitamente como matiz esperado, y la comparación semántica id-a-id (no el diff de líneas) es la que decide, y da 0 diferencias. |
| 5 | `npm test` sigue en verde con los clips de audio pregenerados intactos y el gate de deriva de voz sin pedir regenerar ni un clip; la locución sigue diciendo la frase genérica sin el número | ✓ VERIFICADO (reconfirmado) | Ejecutado en esta sesión de forma independiente: `npm test` → **567/567** (22 ficheros, incluidos los 4 tests nuevos de `CR-01/VAL-01`); `npx vitest run engine/__tests__/voice-drift.test.ts` → 8/8; `ls public/audio/*.m4a \| wc -l` = 35, `Object.keys(manifest.entries).length` = 35, `git status --porcelain public/audio scripts/voice/manifest.json` vacío; `contentVersion` = 14 (subida deliberada 13→14, documentada y aceptada por el humano en el checkpoint de la Task 3, con el efecto de invalidación de cursor de partida a medias explicado en el SUMMARY). |

**Puntuación:** 5/5 verdades verificadas (el hueco BLOCKER de la ronda anterior queda cerrado)

### Nota de documentación conocida (no es un fallo)

ROADMAP.md y REQUIREMENTS.md (VAL-05) siguen diciendo «37 clips». El recuento real y actual
es **35** ficheros `.m4a` frente a 35 entradas del manifiesto — verificado de forma
independiente en esta sesión (`ls public/audio/*.m4a | wc -l` = 35; claves del manifiesto = 35;
ambos sin tocar por este plan). Esta discrepancia ya está documentada como cifra heredada de un
ROADMAP erróneo en `STATE.md` (plan 08-03) y en la nota de cierre de hueco de
`REQUIREMENTS.md` (línea 63-70). Se confirma como discrepancia preexistente y documentada, no
como una regresión nueva de este ciclo.

## Juicio requerido: CR-03 (paso `setup.escenario.04`, variante Experto, manda sustituir cartas inexistentes para Rhino/Ultron)

**Hecho confirmado de forma independiente, no solo citado del `08-REVIEW.md`:**

```
$ node -e "... content/marvel-characters.json ..."
rhino:  stages[*].expert = false, false, false   (nunca tiene cifras de Experto)
ultron: stages[*].expert = false, false, false   (nunca tiene cifras de Experto)
kang:   stages[*].expert = true,  true,  true    (12/18/20 normal → 15/22/25 experto)
```

El texto de la variante `expert` de `setup.escenario.04` es incondicional para los tres
villanos:

> «Sustituid las cartas de villano numeradas por las del modo Experto de este escenario.»

`engine/types.ts:193-199` documenta en las propias palabras del repositorio que la ausencia de
`expert` en una etapa «es un hecho del dominio, no un dato pendiente: significa que el modo
Experto de ese escenario no sustituye las cartas de villano numeradas (caso de Rhino y Ultron)».
Es decir: en Experto con Rhino o Ultron (2 de los 3 villanos jugables), el asistente manda al
grupo a buscar cartas de etapa Experto que no existen.

**Origen temporal, confirmado con `git log`/`git show`:** este texto no lo escribió la Fase 8.
Lo autoró y contrastó contra el Rules Reference el commit `50c3439`
(`fix(01-06): recontrastar etapa del villano vs Modo Experto contra el Rules Reference`, Fase 1,
28 de agosto de 2026) — siete fases antes de la Fase 8. La búsqueda `git log -S` de la frase
exacta no encuentra ninguna introducción posterior; el texto ha sido idéntico desde entonces.
El plan 08-04 **movió de sitio** este objeto (antes leído después de `.02`, ahora antes), pero
no tocó ni un carácter de su `text`/`speech` — la corrección de VAL-04 confirma 0 diferencias
en el campo `variants` de este paso.

**Efecto sobre VAL-01 (la cifra del dial), comprobado, no supuesto:** `computeInitialVillainHealth`
(`engine/counters.ts:34`) solo activa la rama `expert` cuando `stage1.expert` existe. Para
Rhino/Ultron, `stage1.expert` es siempre `undefined`, así que `figures = stage1` en ambas
dificultades — **la cifra del dial no cambia con la dificultad para esos dos villanos**, con o
sin la instrucción de sustitución. El defecto de CR-03 no reintroduce ni agrava el BLOCKER que
el plan 08-04 cerró (VAL-01 sigue siendo correcto en las 3×2 combinaciones villano×dificultad);
es un problema distinto y ortogonal, limitado a la corrección del propio texto de `.04`.

**Veredicto: (b) — defecto de fidelidad de contenido preexistente, fuera del alcance de la
Fase 8.** Razones:

1. El texto es de la Fase 1, no de la Fase 8; la Fase 8 tiene la restricción explícita (VAL-04)
   de no reescribir ni un carácter de contenido autorado — arreglar CR-03 dentro de esta fase
   habría exigido violar su propia restricción de alcance.
2. La reordenación que hizo el plan 08-04 no creó ni empeoró el defecto: el grupo recibiría la
   misma instrucción incondicional y errónea estuviera `.04` antes o después de `.02` — solo
   cambió el orden relativo de dos pasos, no la veracidad del texto de ninguno de los dos.
3. El objetivo observable de la Fase 8 (VAL-01 a VAL-06) trata de si un valor conocido se
   muestra en pantalla, no de si cada paso adyacente es correcto según el Rules Reference; la
   cifra que Fase 8 añade (VAL-01) sigue siendo correcta en todas las combinaciones
   villano×dificultad, incluida esta.
4. Ninguna fase posterior del ROADMAP (Fase 9: histórico y estadísticas; Fase 10: respaldo en
   Firestore) menciona ni roza este ámbito — no hay evidencia de que esté deliberadamente
   diferido a un trabajo futuro ya planificado.

**No se trata como un gap de la Fase 8** (no bloquea el cierre de esta fase), pero **tampoco se
descarta**: por el mandato explícito de CLAUDE.md («un asistente que guía mal es peor que no
tener asistente»), este es un defecto real, reproducible y con impacto directo en la fidelidad
de reglas para 2 de 3 villanos jugables en Experto. Se registra aquí como hallazgo enrutado que
requiere una decisión humana y, salvo que se decida lo contrario, un plan de cierre de hueco
dedicado (quick-fix o gap-plan) — **no** una reapertura de la Fase 8. La corrección sugerida por
`08-REVIEW.md` (condicionar el texto de la variante `expert` de `.04` a que el escenario
realmente traiga cartas de Experto) es contenido puro y no exige tocar `engine/`.

### Artefactos requeridos

| Artefacto | Esperado | Estado | Detalles |
|-----------|----------|--------|----------|
| `content/marvel-champions.json` | `setup.escenario.04` antes de `setup.escenario.02`; `contentVersion` = 14 | ✓ VERIFICADO | Orden confirmado por lectura directa del JSON: `.01 .04 .02 .03 .05 .06 .07 .08 .09`; `contentVersion` = 14 |
| `engine/__tests__/content.test.ts` | Gate `CR-01/VAL-01`, aserción `contentVersion === 14` | ✓ VERIFICADO | `describe('CR-01/VAL-01: ...')` con 4 tests (identidad, no-vacuidad, invariante real, gate que muerde); `contentVersion` fijado a 14 en línea 606 |
| `engine/stepValues.ts` | Sin cambios respecto a la ronda anterior; sigue sin conocimiento de secuencia (D-13) | ✓ VERIFICADO | No está en `files_modified` del plan 08-04; comportamiento intacto por diseño |
| `app/components/StepScreen.vue` / `app/composables/useGameSession.ts` | Sin cambios respecto a la ronda anterior | ✓ VERIFICADO | No están en `files_modified` del plan 08-04; se releyó el bloque relevante y coincide byte a byte con lo ya verificado |

### Verificación de enlaces clave

| De | A | Vía | Estado | Detalles |
|----|---|-----|--------|----------|
| `content/marvel-champions.json` | `engine/flatten.ts` | orden de lectura por posición en `phase.steps[]`, no por id | ✓ CABLEADO | Confirmado con lectura directa del array `steps` — el motor no participa en la decisión de orden (D-13 intacto) |
| `engine/__tests__/content.test.ts` | `content/marvel-champions.json` | gate de orden ejecutable sobre el contenido real | ✓ CABLEADO | `npx vitest run engine/__tests__/content.test.ts` → 59/59 verde, incluido el describe nuevo |
| `content/marvel-champions.json` (base `bcbe00c`) | contenido actual | comparación semántica id a id | ✓ CABLEADO | 32/32 ids byte-idénticos en los campos autorados; 0 diferencias |

### Comprobaciones de comportamiento

| Comportamiento | Comando | Resultado | Estado |
|-----------------|---------|-----------|--------|
| Orden real de `setup.escenario` en el JSON en vivo | `node -e` sobre `content/marvel-champions.json` | `.01 .04 .02 .03 .05 .06 .07 .08 .09` | ✓ PASA |
| Kang no tiene cifra de dial dependiente de un paso posterior sin sustituir | Trazado manual: `computeInitialVillainHealth` + posición de `.04` vs `.02` | En el momento de leer `.02`, `.04` ya se ejecutó | ✓ PASA |
| Rhino/Ultron: la cifra del dial no depende de la dificultad | Lectura de `content/marvel-characters.json` + `engine/counters.ts:34` | `stage1.expert` ausente ⇒ `figures = stage1` en ambas dificultades | ✓ PASA |
| Suite completa de tests | `npm test` | 567/567 (22 ficheros) | ✓ PASA |
| Gate de deriva de voz | `npx vitest run engine/__tests__/voice-drift.test.ts` | 8/8 | ✓ PASA |
| Clips y manifiesto sin tocar | `ls public/audio/*.m4a \| wc -l` = 35; manifiesto = 35; `git status --porcelain` vacío | 35 = 35, limpio | ✓ PASA |
| Comparación semántica de contenido id a id contra `bcbe00c` | script `node -e` de esta sesión | 32 ids, 0 diferencias | ✓ PASA |
| Ausencia de marcadores de deuda en ficheros tocados por 08-04 | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` sobre `content/marvel-champions.json` y `engine/__tests__/content.test.ts` | sin resultados | ✓ PASA |
| Commits documentados existen | `git show --stat ad1c755`, `git show --stat de4a78b` | ambos encontrados con el contenido descrito | ✓ PASA |

### Ejecución de probes

No se han declarado probes en formato `scripts/*/tests/probe-*.sh` ni convencionales para esta
fase; ningún PLAN los menciona. Paso 7c: OMITIDO (sin probes declarados ni convencionales).

### Cobertura de requisitos

| Requisito | Plan origen | Descripción | Estado | Evidencia |
|-----------|------------|--------------|--------|-----------|
| VAL-01 | 08-02, 08-03, 08-04 | Vida del villano mostrada entre paréntesis | ✓ SATISFECHO | Cerrado el hueco BLOCKER de Kang+Experto; verificado en código, gate de CI y checkpoint humano |
| VAL-02 | 08-02, 08-03 | Lista compacta por jugador, nunca paréntesis en línea | ✓ SATISFECHO | Regresión confirmada, sin cambios desde la ronda anterior |
| VAL-03 | 08-02, 08-03 | Sin selección, render idéntico al previo | ✓ SATISFECHO | Regresión confirmada |
| VAL-04 | 08-01, 08-04 | `text`/`speech` sin tocar, valor añadido solo en render | ✓ SATISFECHO | Comparación id-a-id independiente contra `bcbe00c`: 0 diferencias en 32 ids |
| VAL-05 | 08-01, 08-03, 08-04 | Clips de audio pregenerados válidos, gate de deriva verde | ✓ SATISFECHO | 35=35 clips/manifiesto, gate verde; cifra «37» del ROADMAP confirmada como discrepancia documental preexistente, no regresión |
| VAL-06 | 08-01, 08-03, 08-04 | Locución sigue diciendo la frase genérica, sin número | ✓ SATISFECHO | Garantía estructural: ids de audio ligados al id de paso, `speech` sin tocar (VAL-04) |

Sin requisitos huérfanos: `REQUIREMENTS.md` solo mapea VAL-01 a VAL-06 a la Fase 8, y los seis
aparecen en el frontmatter `requirements` de al menos un plan (08-01 a 08-04).

### Antipatrones encontrados

No se encuentran marcadores `TODO`/`FIXME`/`HACK`/`TBD`/`XXX`/placeholder en los ficheros
modificados por el plan 08-04 (`content/marvel-champions.json`,
`engine/__tests__/content.test.ts`).

El `08-REVIEW.md` de esta ronda (revisión independiente de código, no repetida aquí en su
totalidad) confirma que **CR-01 de la ronda anterior queda cerrado** con evidencia mecánica, y
añade tres hallazgos nuevos que se dejan documentados para trazabilidad pero que **no bloquean
el objetivo de esta fase**:

- **CR-01 (nuevo numerado en esta ronda): `/constructor` da 500 en producción** —
  preexistente (`app/composables/useGameContent.ts`/`useCharacterCatalogue.ts`, objeto literal
  sin `Object.create(null)`), no introducido por ningún plan de la Fase 8, y ninguno de esos
  ficheros está en `files_modified` de 08-01 a 08-04. Fuera de alcance de esta verificación de
  fase; requiere su propio quick-fix.
- **CR-02: `optionsWarningDetail` muerto en `engine/resolve.ts`** — confirmado preexistente
  (viene de la quick `260831-fkb`, antes de la Fase 8); `engine/resolve.ts` no está en
  `files_modified` de ningún plan 08-0x. Fuera de alcance.
- **CR-03: instrucción de sustitución de cartas Experto incondicional para villanos sin
  cifras Experto** — juzgado arriba en la sección dedicada. Veredicto: fuera de alcance de la
  Fase 8, defecto real que requiere plan propio.

Las advertencias WR-01 a WR-08 (guarda de array en `catalogue.villains`/`.heroes`, invalidación
de `context.counters` al saltar `contentVersion`, `StepValueKind` triplicado sin enlace de
compilación, presupuesto de 90 caracteres sin contar el sufijo, cobertura de test de la costura
reactiva, `overflow-y-auto`+`items-center`, batería defensiva que no afirma el valor devuelto)
son hallazgos de robustez/cobertura de test, no fallos funcionales observados en las
combinaciones reales verificadas; no bloquean el objetivo de la fase pero quedan registradas en
`08-REVIEW.md` para que no se pierdan.

### Verificación humana requerida

Ninguna pendiente. El checkpoint bloqueante de la Task 3 del plan 08-04 ya se ejecutó y fue
aprobado explícitamente por el humano ("aprobado"), cubriendo exactamente la combinación que
dejó abierto el hueco de la ronda anterior (Kang + Experto) además de Kang + Normal como
contraste. Esa aprobación es genuina y no necesita repetirse.

### Resumen de hallazgos

El único hueco BLOCKER de la ronda anterior — la cifra de vida del villano en Experto+Kang
contradiciendo la carta física en el momento en que se lee — queda cerrado con evidencia
mecánica (reordenación confirmada por lectura directa del contenido, gate de CI que impide la
regresión, `npm test` 567/567) y humana (checkpoint aprobado explícitamente sobre la
combinación exacta que antes fallaba). Las cinco verdades observables de la Fase 8 (VAL-01 a
VAL-06) se sostienen todas bajo reverificación directa contra el código, no solo contra la
narrativa del SUMMARY.

Un hallazgo nuevo de esta ronda (CR-03) queda documentado, comprobado de forma independiente y
enrutado explícitamente fuera del alcance de la Fase 8: el texto incondicional de la variante
Experto de `setup.escenario.04` ordena sustituir cartas de villano numeradas que no existen
para Rhino y Ultron. Es un defecto de fidelidad de reglas real y preexistente (autorado en la
Fase 1), no introducido ni agravado por la reordenación de esta fase, y no afecta la corrección
de la cifra que la Fase 8 muestra en pantalla (VAL-01) para ningún villano. Se recomienda abrir
un plan de cierre de hueco o quick-fix dedicado para condicionar ese texto al dato real del
catálogo (`stage.expert` presente), en línea con la corrección sugerida por `08-REVIEW.md`, y
que un humano decida si se prioriza antes de continuar con la Fase 9.

---

*Verificado: 2026-09-09T17:05:00Z*
*Verificador: Claude (gsd-verifier)*
