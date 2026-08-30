# Fase 3 — Dossier de revisión de contenido: las 27 frases `speech` nuevas (D-53 / VOZ-01)

## 1. Cabecera

- **Generado:** 2026-08-30 (Tarea 1 del plan `03-05`)
- **Fuente de verdad:** `~/Downloads/mc_rulesreference_v17-compressed.pdf` (Rules Reference v1.7), extraído con `pdftotext -layout -f <página> -l <página>` **página a página** — nunca en bloque, mismo método que `02-CONTENT-REVIEW.md` (el extractor desordena columnas en modo continuo).
- **Alcance revisado:** `content/marvel-champions.json`, `contentVersion: 11` al abrir esta revisión. 23 pasos `kind:'step'` de la sección `setup` + 4 objetos de variante de dificultad (`setup.encuentros.03` normal/expert, `setup.escenario.04` normal/expert) = **27 frases `speech` nuevas**, autoradas en el plan `03-01`.
- **Rol del reglamento en esta revisión:** secundario. Las 27 frases son reformulaciones de texto ya contrastado en las Fases 1 y 2, no reglas nuevas — el PDF se consulta solo donde comprimir una frase puede haber cambiado lo que dice la regla.
- **Contexto de registro (sin cambios, no forma parte del recuento de 27):** las 10 frases de la sección `ronda` ya fueron revisadas y aprobadas en la Fase 2 (`02-CONTENT-REVIEW.md`). Se listan en la sección 5 solo como línea base de comparación para VOZ-01.
- **Disciplina de cita:** como en la Fase 2, este documento se lee con el PDF delante. Ninguna fila transcribe más de dos líneas seguidas del Rules Reference; cada consulta cita página y epígrafe y resume en una línea (restricción legal de `PROJECT.md`: contenido para uso privado del grupo, sin reproducir textos extensos con copyright).

---

## 2. Tabla de las 23 frases base de preparación

| id | title | text | warning | speech | =text | citation.section | citation.page | Veredicto |
|---|---|---|---|---|---|---|---|---|
| `setup.heroes.01` | Elegir villano y héroes | Decidid, como grupo, qué villano vais a enfrentar y qué héroe llevará cada jugador. | — | Decidid como grupo el villano al que os enfrentaréis y el héroe de cada jugador. | — | Apéndice II, pasos 1 y 8 (decisión de escenario adelantada) | 49 | contrastado |
| `setup.heroes.02` | Lado Alter-Ego | Colocad vuestra identidad por el lado Alter-Ego. | — | Colocad vuestra identidad por el lado Alter-Ego. | sí | Apéndice II, paso 1 | 49 | contrastado |
| `setup.heroes.03` | Ajustar dial de salud | Ajustad vuestro dial de salud a la vida inicial de vuestra identidad. | — | Ajustad el dial de salud a la vida inicial de vuestra identidad. | — | Apéndice II, paso 2 | 49 | contrastado |
| `setup.archienemigos.01` | Localizar Archienemigo | Localizad el conjunto de Archienemigo (Nemesis) de vuestra identidad. | — | Buscad el conjunto de Archienemigo (Nemesis) de vuestra identidad. | — | Nemesis Encounter Set | 29 | contrastado |
| `setup.archienemigos.02` | Apartar fuera de la partida | Apartadlas fuera de la partida. | No se barajan en el mazo de encuentros | Apartadlas fuera de la partida. | sí | Apéndice II, paso 5 | 49 | contrastado |
| `setup.encuentros.01` | Reunir conjuntos del escenario | Reunid los conjuntos de encuentro indicados en la carta de escenario. | — | Reunid los conjuntos de encuentro que indique la carta de escenario. | — | Apéndice II, paso 10 | 49 | contrastado |
| `setup.encuentros.02` | Añadir conjunto Estándar | Añadid el conjunto de encuentro Estándar. | — | Añadid el conjunto de encuentro Estándar. | sí | Standard Set | 39 | contrastado |
| `setup.encuentros.03` | Conjunto adicional según dificultad | Añadid el conjunto de encuentro adicional que corresponda a la dificultad elegida. | — | Añadid el conjunto de encuentro adicional según la dificultad elegida. | — | Modes of Play — Expert Mode | 28 | contrastado |
| `setup.encuentros.04` | Añadir Obligaciones | Añadid las cartas de Obligación: una o más por identidad en juego. | Puede haber más de una Obligación por identidad | Añadid las cartas de Obligación: una o más por identidad en juego. | sí | Obligation | 29 | contrastado |
| `setup.encuentros.05` | Formar el mazo de encuentros | Barajad todos los conjuntos reunidos junto con las Obligaciones para formar el mazo. | — | Barajad los conjuntos reunidos junto con las Obligaciones para formar el mazo. | — | Apéndice II, paso 10 | 49 | contrastado |
| `setup.escenario.01` | Colocar mazos de villano y escenario | Colocad el mazo de villano y el mazo de escenario principal en el centro de la mesa. | — | Colocad el mazo de villano y el de escenario principal en el centro de la mesa. | — | Apéndice II, paso 8 | 49 | contrastado |
| `setup.escenario.02` | Ajustar dial de vida del villano | Ajustad el dial de vida del villano al valor indicado en la carta de villano. | — | Ajustad el dial de vida del villano al valor indicado en la carta de villano. | sí | Apéndice II, paso 9; ver también anatomía de carta de Villano (p.52, punto 5) | 49 | contrastado |
| `setup.escenario.03` | Preparar reserva de fichas y estados | Preparad la reserva común de fichas de daño, amenaza, aceleración y cartas de estado. | — | Preparad la reserva común de fichas de daño, amenaza, aceleración y estado. | — | Apéndice II, paso 7 | 49 | contrastado |
| `setup.escenario.04` | Cartas de villano según dificultad | Comprobad qué cartas de villano numeradas (etapas) exige la dificultad elegida. | — | Comprobad qué cartas de villano numeradas exige la dificultad elegida. | — | Modes of Play — Expert Mode (p.28); ver también Appendix I: Deck Customization, "Encounter Decks" (p.48) y "Villain, Villain Deck" (p.45) | 28 | contrastado |
| `setup.escenario.05` | Poner en juego cartas de Preparación | Buscad en mazos y zona apartada cartas con palabra clave Preparación y ponedlas en juego. | — | Buscad cartas con palabra clave Preparación en mazos y aparte, y ponedlas en juego. | — | Apéndice II, paso 11 | 49 | contrastado |
| `setup.escenario.06` | Resolver Preparación del escenario (cara 1A) | Resolved cualquier habilidad de Preparación en la carta de escenario, cara 1A. | — | Resolved la habilidad de Preparación de la carta de escenario, cara 1A. | — | Apéndice II, paso 12a | 49 | duda de criterio — a decision humana |
| `setup.escenario.07` | Voltear a cara B y colocar amenaza | Voltead el escenario a su cara B y colocad la amenaza inicial indicada. | — | Voltead el escenario a su cara B y colocad la amenaza inicial indicada. | sí | Apéndice II, paso 12b (voltear a cara 1B); ver también "Main Scheme" (p.27) | 49 | contrastado |
| `setup.escenario.08` | Resolver Cuando se revela del escenario | Resolved cualquier habilidad de Cuando se revela en esa cara del escenario. | — | Resolved la habilidad de Cuando se revela de esa cara del escenario. | — | Apéndice II, paso 12b (resolver "When Revealed" al voltear); ver también "Main Scheme" (p.27) | 49 | duda de criterio — a decision humana |
| `setup.escenario.09` | Resolver Preparación y Cuando se revela del villano | Resolved cualquier habilidad de Preparación y de Cuando se revela en la carta de villano. | — | Resolved las habilidades de Preparación y de Cuando se revela en la carta de villano. | — | Apéndice II, paso 12c | 49 | duda de criterio — a decision humana |
| `setup.manos.01` | Barajar mazo de jugador | Barajad vuestro mazo de jugador. | — | Barajad vuestro mazo de jugador. | sí | Apéndice II, paso 6 | 49 | contrastado |
| `setup.manos.02` | Robar mano inicial | Robad cartas hasta completar vuestra mano inicial. | — | Robad hasta completar vuestra mano inicial. | — | Apéndice II, paso 14 | 49 | contrastado |
| `setup.manos.03` | Mulligan | Podéis descartar cartas de vuestra mano y robar de nuevo hasta vuestra mano inicial. | No barajéis las descartadas de vuelta al mazo todavía | Podéis descartar y robar de nuevo hasta vuestra mano inicial. | — | Apéndice II, paso 15 | 49 | contrastado |
| `setup.jugador-inicial.01` | Decidir jugador inicial | Resolved habilidades de Preparación en juego y decidid quién es el jugador inicial. | — | Resolved las habilidades de Preparación en juego y decidid el jugador inicial. | — | Apéndice II, pasos 16 y 3 (jugador inicial, reordenado) | 49 | contrastado |

Ningún veredicto queda vacío: 20 filas `contrastado`, 3 filas `duda de criterio — a decisión humana` (sección 8), 0 filas `discrepancia` — no se encontró ninguna diferencia objetiva de significado entre `speech`/`text` y el Rules Reference en esta revisión.

---

## 3. Tabla de las 4 frases de variante

Esta tabla comprueba específicamente el bug que D-41 cierra: que la frase de cada variante diga lo que dice **su propio** `text`, no lo que dice el `text` (o `speech`) del paso base.

| id | dificultad | text (de la variante) | speech (de la variante) | =text | Veredicto |
|---|---|---|---|---|---|
| `setup.encuentros.03` | normal | No añadáis ningún conjunto adicional en este paso. | No añadáis ningún conjunto adicional en este paso. | sí | contrastado |
| `setup.encuentros.03` | expert | Añadid también el conjunto de encuentro Experto. | Añadid también el conjunto de encuentro Experto. | sí | contrastado |
| `setup.escenario.04` | normal | Dejad las cartas de villano numeradas (etapas) tal como vienen con el escenario. | Dejad las cartas de villano numeradas tal como vienen con el escenario. | — | contrastado |
| `setup.escenario.04` | expert | Sustituid las cartas de villano numeradas por las del modo Experto de este escenario. | Sustituid las cartas de villano numeradas por las del modo Experto de este escenario. | sí | contrastado |

Las cuatro dicen lo que dice **su propia** variante: la variante `normal` de `setup.encuentros.03` niega explícitamente lo que la variante `expert` afirma, y ninguna de las dos hereda la frase base ("según la dificultad elegida"). Mismo patrón verificado en `setup.escenario.04`: `normal` dice "dejad... tal como vienen" y `expert` dice "sustituid... por las del modo Experto", frases opuestas entre sí y ninguna es copia del `speech` base. Confirmado leyendo `engine/resolve.ts:15` (`speech: variant?.speech ?? node.step.speech`): las 4 variantes declaran su propio `speech`, así que el fallback nunca se ejercita para estos 2 pasos — exactamente lo que D-41 exige.

---

## 4. Criterios de veredicto

Cada fila de las tablas 2 y 3 lleva exactamente uno de estos tres veredictos, sin dejar ninguna vacía:

- **`contrastado`** — la frase dice lo mismo que su `text` (el de su propia variante, si aplica), en registro imperativo-plural, sin incorporar el `warning` (D-39), sin aritmética resuelta ni cifras de jugadores (D-07/D-08), de 120 caracteres o menos y sin los glifos prohibidos `⚠ × ›`.
- **`discrepancia — corregida`** — se encontró una diferencia objetiva de significado respecto al `text` o al Rules Reference; se corrige en la Tarea 3 y tiene su entrada propia en la sección 7.
- **`duda de criterio — a decisión humana`** — la frase es defendible pero el matiz es opinable; se lleva a la revisión humana de la Tarea 2 en vez de resolverse aquí (sección 8).

---

## 5. Recuento de frases idénticas al `text` (VOZ-01)

VOZ-01 pide una frase locutada *distinta* del texto en pantalla. La Fase 2 sentó el precedente de que una `speech` puede coincidir literalmente con su `text` cuando el `text` ya es corto e imperativo (7 de los 10 pasos de la ronda lo hacen), y por eso el plan `03-01` no puso un gate `speech !== text` en CI: rompería contenido ya enviado. El riesgo que queda abierto es el contrario — que la mayoría de las 27 frases nuevas acaben siendo copias literales y "curada" se quede en nominal — y este recuento es lo único que lo hace visible.

Frases identicas al text: 10 de 27

IDs afectados (7 de los 23 pasos base + 3 de las 4 variantes):
- `setup.heroes.02`
- `setup.archienemigos.02`
- `setup.encuentros.02`
- `setup.encuentros.04`
- `setup.escenario.02`
- `setup.escenario.07`
- `setup.manos.01`
- `setup.encuentros.03` (normal)
- `setup.encuentros.03` (expert)
- `setup.escenario.04` (expert)

Línea base de comparación, ya enviada y aprobada en la Fase 2, recalculada del contenido real (no copiada de memoria):

Frases identicas al text en ronda: 7 de 10

(`ronda.jugadores.03`, `ronda.villano.01`, `ronda.villano.02`, `ronda.villano.03`, `ronda.villano.04`, `ronda.villano.05`, `ronda.villano.06`)

**Pregunta cerrada para la revisión humana de la Tarea 2 (obligatoria, sin gate automático que la cubra):**

> ¿Es aceptable que 10 de las 27 frases nuevas coincidan literalmente con el texto en pantalla (proporción similar a las 7 de 10 ya aprobadas en la ronda), o hay que reformular alguna para que "curada" no se quede en nominal? Si hay que reformular, ¿cuáles de las 10 listadas arriba?

Que una fila lleve la marca `=text` **no** la convierte automáticamente en `discrepancia`: las 10 marcadas arriba son, cada una, la formulación más corta posible del `text` sin perder significado (`text` ya era imperativo-plural y breve en los 10 casos). Lo que esta sección impide es que el conjunto pase sin que nadie mire el número.

---

## 6. Consulta acotada al Rules Reference

Páginas extraídas con `pdftotext -layout -f <página> -l <página>` (una llamada por página, nunca en bloque):

| Comando | Epígrafe encontrado | Qué confirma |
|---|---|---|
| `pdftotext -layout -f 28 -l 28` | MODES OF PLAY — Expert Mode | "add the Expert encounter set to the encounter deck" — confirma `setup.encuentros.03` y sus 2 variantes; "using the listed expert mode villain stages" — confirma el eje de `setup.escenario.04` |
| `pdftotext -layout -f 29 -l 29` | NEMESIS ENCOUNTER SET / OBLIGATION | "each player sets aside the cards from their associated nemesis set, out of play" — confirma `setup.archienemigos.01/.02` y el `warning` "No se barajan en el mazo de encuentros"; "each identity is associated with one or more obligation cards" — confirma literalmente "una o más por identidad" de `setup.encuentros.04` |
| `pdftotext -layout -f 30 -l 30` | OBLIGATION (continuación) | Confirma que las obligaciones sin destinatario específico van al área de juego del jugador que las revela — sin contradicción con el texto del paso |
| `pdftotext -layout -f 27 -l 27` | MAIN SCHEME, MAIN SCHEME DECK | Colocación de amenaza inicial y resolución de habilidades "When Revealed" al voltear el escenario — confirma `setup.escenario.07`/`.08` |
| `pdftotext -layout -f 38 -l 38` | SETUP (KEYWORD) / SETUP (TRIGGERED ABILITY) | Confirma que "Preparación" es **dos cosas distintas** en el reglamento: una palabra clave impresa en cartas (se buscan y se ponen en juego, paso 11) y un tipo de habilidad disparada que se resuelve en un momento distinto (pasos 12a/12c) — exactamente la distinción que `setup.escenario.05` (palabra clave) vs `.06`/`.09` (habilidad) recoge, y que `02-CONTEXT.md` señala como punto habitual de confusión |
| `pdftotext -layout -f 39 -l 39` | STANDARD SET | "an encounter set that is added to most scenarios" — confirma `setup.encuentros.02` |
| `pdftotext -layout -f 45 -l 45` | VILLAIN, VILLAIN DECK | "represented by a sequential deck of one or more cards... reducing the hit points of each stage" — confirma "cartas de villano numeradas (etapas)" de `setup.escenario.04` y sus variantes |
| `pdftotext -layout -f 46 -l 46` | WHEN REVEALED (continuación) | Confirma que las habilidades "When Revealed" se resuelven durante el mismo paso ("Resolve Scenario Setup and When Revealed Abilities") que las de "Setup", pero son dos tipos de habilidad distintos con distinto disparador — confirma la distinción de `setup.escenario.06/.08/.09` |
| `pdftotext -layout -f 48 -l 48` | APPENDIX I: DECK CUSTOMIZATION — Encounter Decks | "Expert mode... uses a different combination of villain stages and adds the expert encounter set" — segunda confirmación cruzada de `setup.encuentros.03`/`setup.escenario.04` |
| `pdftotext -layout -f 49 -l 49` | APPENDIX II: SETUP | Los 16 pasos oficiales de preparación, base de casi todas las citas de la tabla 2 — verificado que la numeración citada en `content/marvel-champions.json` corresponde exactamente a este listado |

**Ningún candidato de la lista inicial del plan produjo una discrepancia objetiva.** Los 23 pasos base y las 4 variantes dicen, cada uno, lo mismo que dice el paso oficial correspondiente del Rules Reference v1.7. Las únicas dudas encontradas (sección 8) son de matiz gramatical, no de contenido de la regla.

---

## 7. Correcciones objetivas propuestas

**Ninguna.** Esta revisión no encontró ninguna fila con veredicto `discrepancia`: las 27 frases nuevas dicen lo mismo que su `text` y lo mismo que el Rules Reference v1.7 en los puntos consultados en la sección 6. Si la revisión humana de la Tarea 2 encuentra una discrepancia que esta lectura no detectó, se documentará aquí antes de aplicarse en la Tarea 3, con el mismo formato de la Fase 2 (**Antes**, **Comprobado**, **Propuesto**, **Campo**).

---

## 8. Preguntas abiertas para la revisión humana

Tres filas de la tabla 2 llevan veredicto `duda de criterio — a decisión humana`. Las tres comparten el mismo patrón: el `text` usa "cualquier habilidad" (matiz condicional — puede no haber ninguna que resolver) y la `speech` comprime a "la habilidad"/"las habilidades" (matiz definido — asume que existe). El paso en sí es un no-op inocuo si no hay ninguna habilidad que resolver, así que no cambia el resultado de la partida, pero es exactamente el tipo de matiz que `03-CONTEXT.md` avisa que puede perderse al acortar.

**Pregunta 1 — `setup.escenario.06`.** `text`: "Resolved **cualquier** habilidad de Preparación en la carta de escenario, cara 1A." `speech`: "Resolved **la** habilidad de Preparación de la carta de escenario, cara 1A."
> ¿Es aceptable perder el matiz "cualquier" (puede no haber ninguna habilidad) en la frase locutada, dado que el paso es un no-op inocuo cuando no hay habilidad que resolver? Opciones: (a) Aceptable tal como está; (b) Reformular a "Resolved cualquier habilidad de Preparación..." pese a acercarse más al límite de 120 caracteres.

**Pregunta 2 — `setup.escenario.08`.** `text`: "Resolved **cualquier** habilidad de Cuando se revela en esa cara del escenario." `speech`: "Resolved **la** habilidad de Cuando se revela de esa cara del escenario."
> Misma pregunta que la 1, aplicada a este paso. Opciones: (a) Aceptable; (b) Reformular.

**Pregunta 3 — `setup.escenario.09`.** `text`: "Resolved **cualquier** habilidad de Preparación y de Cuando se revela en la carta de villano." `speech`: "Resolved **las** habilidades de Preparación y de Cuando se revela en la carta de villano."
> Misma pregunta, con la variante de que aquí la `speech` ya cambia a plural ("las habilidades") porque son dos categorías. Opciones: (a) Aceptable; (b) Reformular.

No hay más preguntas abiertas de criterio: el resto de la tabla 2 y toda la tabla 3 quedaron `contrastado` sin reservas tras la consulta de la sección 6.

---

## 9. Acta de la prueba en tablet

*(Sección vacía — la rellena la Tarea 2, con un humano jugando en la tablet real. Ningún hueco puede quedar en blanco al cerrar esa tarea.)*

**Modelo de tablet:** _(pendiente)_
**Versión de SO / navegador:** _(pendiente)_
**Fecha de la prueba:** _(pendiente)_

### Criterio 1 — frase corta y curada, control de silencio, preferencia persistida (VOZ-01/02/03)
**Veredicto:** _(pendiente: aprobado / aprobado con correcciones / rechazado)_
**Detalle:** _(pendiente)_

### Criterio 2 — nunca encola, nunca repite (VOZ-04)
**Veredicto:** _(pendiente)_
**Detalle:** _(pendiente)_

### Criterio 3 — sin voz española, sigue siendo usable (VOZ-05/06)
**Veredicto:** _(pendiente)_
**Detalle:** _(pendiente)_

### Criterio 4 — la pantalla no se apaga y el usuario lo sabe (UI-06/07/08)
**Veredicto:** _(pendiente)_
**Detalle:** _(pendiente)_

### D-46 — la preferencia de voz sobrevive a «Empezar partida nueva» (paso 7 del guion, única comprobación de comportamiento de D-46 en toda la fase)
**Veredicto:** _(pendiente)_
**Detalle:** _(pendiente)_

### Respuesta a la pregunta de la sección 5 (VOZ-01 — recuento de frases idénticas al `text`)
**Respuesta:** _(pendiente — obligatoria aunque la respuesta sea "ninguna, correcto")_

### Respuestas a las preguntas abiertas de la sección 8
**Pregunta 1 (`setup.escenario.06`):** _(pendiente)_
**Pregunta 2 (`setup.escenario.08`):** _(pendiente)_
**Pregunta 3 (`setup.escenario.09`):** _(pendiente)_

### Lista de correcciones pedidas (por id de paso y campo, para aplicar en la Tarea 3)
_(pendiente — "ninguna" si no hay correcciones)_

---

## 10. Nota metodológica final

Cada página consultada en la sección 6 se extrajo por separado con `pdftotext -layout -f N -l N`, nunca en un único comando sobre el documento completo. La Fase 2 (`02-CONTENT-REVIEW.md`, nota metodológica final) documentó que la extracción en bloque desordena ligeramente las columnas en los límites de página, lo que en aquella revisión produjo una hipótesis de página equivocada para una cita ("Boost Cards" parecía estar en la p. 8 en la extracción en bloque, y en realidad está en la p. 9). Esta revisión reutiliza el mismo método preventivo: cada cita de la tabla 6 se verificó comprobando que el número de pie de página impreso coincide exactamente con el número reclamado, antes de dar cualquier fila por `contrastado`. El fichero `.txt` intermedio de cada extracción se generó fuera del repositorio, en el scratchpad de la sesión, y no se ha comiteado.
