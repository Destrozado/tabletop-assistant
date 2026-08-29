# Fase 2 — Dossier de revisión de contenido: sección `ronda` (CONT-09 / D-36)

**Generado:** 2026-08-29 (Tarea 1 del plan `02-04`)
**Fuente de verdad:** `~/Downloads/mc_rulesreference_v17-compressed.pdf` (Rules Reference v1.7), extraído con `pdftotext -layout -f <página> -l <página>` página a página (no en bloque, para evitar el desorden de columnas del extractor en modo continuo — ver nota metodológica al final).
**Contenido revisado:** `content/marvel-champions.json`, sección `ronda` (`contentVersion: 9` al cerrar esta tarea), 2 fases, 10 pasos `kind:'step'`.

Este documento está pensado para leerse con el PDF delante. No reproduce párrafos largos del reglamento: cita página y epígrafe, resume en una línea. Ninguna fila transcribe más de dos líneas seguidas del Rules Reference.

---

## Tabla de los 10 pasos

| id | title | text | warning | warningDetail | speech | citation.section | citation.page | Veredicto |
|---|---|---|---|---|---|---|---|---|
| `ronda.jugadores.01` | Turnos de los jugadores | Jugad vuestros turnos en orden de jugador, uno tras otro. | Atentos al dial del villano | Cuando el dial del villano llega a cero, retirad su etapa actual y revelad la siguiente, ajustando el dial a la vida impresa... | Jugad vuestros turnos en orden de jugador. | Player Phase (p. 33) / Player Turn (p. 34); ver también Villain Defeat (p. 45) | 33 | **discrepancia — corregida** (ver Corrección A) |
| `ronda.jugadores.02` | Descartar hasta el tamaño de mano | En orden de jugador, descartad hasta bajar al tamaño de vuestra mano. | — | — | En orden de jugador, descartad hasta bajar al tamaño de mano. | End of Player Phase, paso 1 | 17 | **discrepancia — corregida** (ver Corrección B) |
| `ronda.jugadores.03` | Robar hasta el tamaño de mano | Robad a la vez hasta completar el tamaño de vuestra mano. | Mazo agotado: barajad el descarte y repartíos un encuentro | Si tu mazo de jugador se queda sin cartas, barajad vuestro descarte para formar uno nuevo y repartíos a vosotros mismos una carta de encuentro boca abajo... | Robad a la vez hasta completar el tamaño de vuestra mano. | End of Player Phase, paso 2; ver también Player Deck, mazo agotado (p. 32) | 17 | **discrepancia — corregida** (ver Corrección B) |
| `ronda.jugadores.04` | Enderezar | Enderezad a la vez todas vuestras cartas, incluidas las de encuentro agotadas. | Terminan aquí los efectos «hasta el final de la fase» | Aquí terminan los efectos que duraban «hasta el final de la fase» y se resuelven los que dicen «cuando termine la fase»... | Enderezad todas vuestras cartas, incluidas las de encuentro agotadas. | End of Player Phase, pasos 3, 4 y 5 | 17 | **discrepancia — corregida** (ver Corrección B) |
| `ronda.villano.01` | Colocar amenaza | Colocad amenaza en el esquema principal según su campo de aceleración. | Sumad los iconos y fichas de aceleración en juego | — | Colocad amenaza en el esquema principal según su campo de aceleración. | Villain Phase, paso 1 | 45 | **contrastado** |
| `ronda.villano.02` | Los enemigos activan | El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego. | Atentos a los Estados en los personajes | En orden de jugador: primero activa el villano contra ese jugador y después cada esbirro enfrentado con él... Solo el villano y los esbirros con la palabra clave Villano roban carta de aumento. | El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego. | Villain Phase, paso 2; ver también Boost Cards (p. 9) y Stunned/Confused/Tough | 45 | **discrepancia — corregida** (ver Corrección C, página) |
| `ronda.villano.03` | Repartir cartas de encuentro | Repartid una carta de encuentro a cada jugador, en orden de jugador. | Una a cada jugador, más una por cada icono de peligro | — | Repartid una carta de encuentro a cada jugador, en orden de jugador. | Villain Phase, paso 3 | 45 | **contrastado** |
| `ronda.villano.04` | Revelar cartas de encuentro | Revelad las cartas de encuentro una a una, en orden de jugador desde el jugador inicial. | Encuentros agotado: barajad y poned ficha de aceleración | Si el mazo de encuentros se queda sin cartas, barajad su pila de descartes para formar uno nuevo y colocad además una ficha de aceleración... | Revelad las cartas de encuentro una a una, en orden de jugador desde el jugador inicial. | Villain Phase, paso 4; ver también Encounter Deck, mazo agotado | 45 | **discrepancia — corregida** (ver Corrección D, omisión) |
| `ronda.villano.05` | Pasar la ficha de jugador inicial | Pasad la ficha de jugador inicial al jugador de vuestra izquierda. | — | — | Pasad la ficha de jugador inicial al jugador de vuestra izquierda. | Villain Phase, paso 5 | 45 | **contrastado** |
| `ronda.villano.06` | Fin de la fase del villano y de la ronda | Cerrad la fase y la ronda antes de empezar la siguiente. | Terminan y se resuelven los efectos de fin de fase/ronda | Aquí terminan los efectos que duraban «hasta el final de la fase» o «hasta el final de la ronda», y se resuelven los que dicen «cuando termine»... | Cerrad la fase y la ronda antes de empezar la siguiente. | Villain Phase, paso 6; ver también Round Overview (p. 4) | 45 | **discrepancia — corregida** (ver Corrección E, omisión) |

Ningún veredicto queda vacío: 4 pasos contrastados sin cambios, 6 con al menos una discrepancia objetiva encontrada y ya corregida en esta misma tarea (ninguna discrepancia de criterio quedó pendiente de esta lista — las preguntas abiertas, si las hay, están en su propia sección más abajo).

---

## Correcciones objetivas aplicadas en esta tarea

Todas verificadas extrayendo la página física exacta del PDF con `pdftotext -layout -f N -l N` (no en bloque — ver nota metodológica) y comparando el número de página impreso en el pie de cada página con el que aparecía en la cita. `git diff content/marvel-champions.json` referencia estos cinco cambios; `npx vitest run` sigue en verde (109/109) tras aplicarlos.

### Corrección A — `ronda.jugadores.01`: tres páginas de cita equivocadas
- **Antes:** `"section": "Player Phase / Player Turn; ver también Villain Defeat (p. 44)"`, `"page": 32`.
- **Comprobado:** "Player Phase" (párrafo "During the player phase, each player... takes one turn") vive en la página **33**, no en la 32 (esa es "Player Deck"). "Player Turn" vive en la página **34**. "Villain Defeat" vive en la página **45**, no en la 44 (esa página es "Unique Icon"–"Victory X", sin ninguna mención a "Villain Defeat").
- **Corregido a:** `"section": "Player Phase (p. 33) / Player Turn (p. 34); ver también Villain Defeat (p. 45)"`, `"page": 33`.
- **Campo:** `citation`.

### Corrección B — `ronda.jugadores.02`, `.03`, `.04`: "End of Player Phase" citaba la página 16, la sección real está en la 17
- **Antes:** los tres pasos citaban `"page": 16`.
- **Comprobado:** la página física 16 contiene "Delayed Effect" a "Empty Deck"; el epígrafe "End of Player Phase" con sus 5 pasos numerados empieza en la página física **17** (confirmado también por el índice del propio documento, que lista "End of Player Phase.......17").
- **Corregido a:** `"page": 17` en los tres pasos. La referencia "ver también Player Deck, mazo agotado (p. 32)" de `ronda.jugadores.03` ya era correcta y no se tocó.
- **Campo:** `citation` en `ronda.jugadores.02`, `ronda.jugadores.03`, `ronda.jugadores.04`.

### Corrección C — `ronda.villano.02`: "Boost Cards" citaba la página 8, el procedimiento está en la 9
- **Antes:** `"...ver también Boost Cards (p. 8)..."`.
- **Comprobado:** la página física 8 contiene "Aspect Card" a "Attack (Enemy Activation)"; el procedimiento de robar carta de aumento ("If a villain, or a minion with the villainous keyword, is attacking, give it one facedown boost card...") está en la página física **9**.
- **Corregido a:** `"...ver también Boost Cards (p. 9)..."`.
- **Campo:** `citation`.

### Corrección D — `ronda.villano.04`: el texto omitía que el revelado continúa con cada jugador en orden
- **Antes:** `"text": "Revelad las cartas de encuentro una a una, empezando por el jugador inicial."` — solo mencionaba quién empieza, no que el proceso se repite con cada jugador.
- **Comprobado (Villain Phase, paso 4, p. 45):** *"The first player reveals each of their encounter cards, one card at a time in the order in which they were dealt... Each player repeats this process in player order, until no dealt encounter cards remain."* El texto anterior no decía que el resto de jugadores también revela — alguien siguiendo la app al pie de la letra podría parar tras el primer jugador.
- **Corregido a:** `"text": "Revelad las cartas de encuentro una a una, en orden de jugador desde el jugador inicial."` (88/90 caracteres). `speech` actualizado igual.
- **Campo:** `text`, `speech`.

### Corrección E — `ronda.villano.06`: faltaba por completo la mitad de la regla de cierre
- **Antes:** `"warning": "Resolved los «cuando termine la fase o la ronda»"`, sin `warningDetail`.
- **Comprobado (Villain Phase, paso 6, p. 45):** el paso tiene **dos** cláusulas: 6a *"Any effects that last 'until the end of the villain phase' or 'until the end of the round' end"* (los efectos temporales **terminan**) y 6b *"Resolve any 'when/after the villain phase ends' or 'when/after the round ends' effects"* (se **resuelven** los condicionados). El `warning` anterior solo cubría 6b; 6a no aparecía en ningún campo del paso — el mismo patrón de "condición omitida" que ya se corrigió en `ronda.jugadores.04` para el cierre de la fase de jugadores, pero aquí faltaba entera.
- **Corregido a:** `"warning": "Terminan y se resuelven los efectos de fin de fase/ronda"` (56/60 caracteres) + nuevo `"warningDetail"` que explica ambas cláusulas (251/320 caracteres).
- **Campo:** `warning` (reescrito), `warningDetail` (nuevo).
- **Efecto colateral en tests:** `engine/__tests__/content.test.ts` tenía un gate que muerde con la lista cableada de los 5 ids con `warningDetail` (test `D-32`); se actualizó a 6 ids añadiendo `ronda.villano.06`, y el título del test pasó de "exactamente 5" a "exactamente 6". `npx vitest run` reconfirmado en verde tras el cambio (109/109).

**Ninguna de las cinco correcciones es de criterio: las cinco son de hecho** (página impresa verificable, o cláusula del reglamento ausente del campo correspondiente) — por eso se aplicaron directamente en esta tarea en vez de llevarse a preguntas abiertas.

---

## Las cuatro correcciones confirmadas del borrador — dónde viven ahora

Estas cuatro son los errores de fidelidad ya confirmados por `02-RESEARCH.md` antes de planificar esta fase (no descubiertos en esta tarea); esta sección solo localiza en qué paso y campo concreto vive cada una hoy, tal y como pide el criterio de aceptación de la Tarea 1.

1. **La fase del villano tiene 6 pasos oficiales, no 4.**
   Vive en la **estructura** de la fase `ronda.villano`: 6 pasos `kind:'step'` (`ronda.villano.01` a `.06`), en el orden exacto del Rules Reference p. 45 (Place Threat → Enemies Activate → Deal Encounter Cards → Reveal Encounter Cards → Pass First Player Token → End of Villain Phase and Round). Verificable con `engine/__tests__/content.test.ts` ("existe una sección ronda... villano exactamente 6").

2. **Las obligaciones son «una o más por identidad», no «una por jugador».**
   No hay ningún paso de obligaciones en la sección `ronda` (las obligaciones se reparten en la preparación, Fase 1). Lo que sí vive aquí es la garantía de que **ningún campo de la ronda reintroduce el error**: el test `'error confirmado nº2: ningún text ni warning de la ronda dice "una por jugador"'` en `content.test.ts` recorre los 10 pasos y falla si aparece esa frase.

3. **Solo el villano y los esbirros con la palabra clave Villano roban carta de aumento.**
   Vive en `ronda.villano.02.warningDetail`: *"Solo el villano y los esbirros con la palabra clave Villano roban carta de aumento."* — verificado contra Boost Cards, p. 9 (Corrección C de arriba corrigió la página de esta misma cita). Test dedicado: `'error confirmado nº3 (positivo, 02-03): ronda.villano.02.warningDetail casa con "palabra clave Villano" y con "carta de aumento"'`.

4. **El Modo Experto no altera la estructura de la fase del villano (eso es el Modo Heroico, un eje aparte).**
   Vive en la **ausencia** deliberada de `variants.difficulty` en los 10 pasos de la ronda, y en que ningún `text`/`warning` menciona "experto" ni "heroico". Verificado contra Modes of Play, p. 28 (Expert Mode no toca la estructura de pasos; Heroic Mode solo añade cartas de encuentro extra en el paso 3, una cantidad, no una estructura). Test dedicado: `'error confirmado nº4: ningún paso de la ronda declara variants.difficulty ni menciona "experto"/"heroico"'`.

---

## Preguntas abiertas para el usuario (Tarea 2)

Ninguna discrepancia de criterio quedó pendiente de las cinco correcciones anteriores — todas eran de hecho y ya se aplicaron. Aun así, quedan dos puntos donde el reglamento admite más de una lectura razonable, o donde D-31 deja margen de duda, y que conviene que el usuario confirme durante el playtest de la Tarea 2:

1. **`ronda.villano.05` — "al jugador de vuestra izquierda".** El Rules Reference dice literalmente "pass the first player token to the **next clockwise player**" (p. 45), sin definir explícitamente si eso es la izquierda o la derecha de la persona sentada — depende de la orientación física de la mesa. El texto asume la convención habitual de mesa (pasar a la izquierda = sentido horario visto desde arriba), que es la lectura estándar en la inmensa mayoría de juegos de cartas. **Si en vuestra mesa esa convención se ha interpretado alguna vez al revés, decidlo aquí antes de dar el paso por bueno.**
2. **`ronda.villano.02` — granularidad del recordatorio de Estados vs. el propio caso real que motivó D-31.** El `warning` dice "Atentos a los Estados en los personajes" (recordar mirar, D-31) en vez de enunciar qué hace cada Estado — que es justo el criterio elegido conscientemente porque la carta física ya lo dice. El caso real que motivó D-31 fue no daros cuenta de que el villano tenía Confundido y Aturdido en toda una fase. **Confirmad en la Tarea 2 (parte B, punto 10) si ese único recordatorio en el paso es suficiente para que no se os vuelva a pasar, o si el aviso necesita más énfasis** (esto es una cuestión de granularidad/énfasis, D-04/CONT-11, no de fidelidad de reglas — corresponde a vuestro criterio, no al mío).

---

## Nota metodológica: por qué la extracción es página a página, no en bloque

Un primer intento de extraer todo el documento de una vez (`pdftotext -layout` sin `-f`/`-l`) produjo una lectura de columnas ligeramente desordenada en los límites de página (el texto de dos páginas contiguas se entremezclaba de forma distinta a como aparecería extrayendo cada página por separado). Esto llevó a una primera hipótesis de página equivocada para "Boost Cards" (parecía estar en la p. 8 en la extracción en bloque). **Todas las páginas citadas en este dossier están reverificadas con `pdftotext -layout -f <página> -l <página>` página por página**, comprobando además que el número de pie de página coincide exactamente con el número reclamado, antes de dar cualquier cita por buena o por corregida. Esto afecta solo al método de verificación de esta tarea, no al contenido versionado (el archivo `.txt` intermedio se generó fuera del repo, en el scratchpad de la sesión, y no se ha comiteado).

---

*Dossier producido por la Tarea 1 del plan `02-04-PLAN.md`. Pendiente de la sección final con el veredicto literal del usuario y las correcciones que salgan de la Tarea 2 (D-36) — esa sección la añade la Tarea 3.*
