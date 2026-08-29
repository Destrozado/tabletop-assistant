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

---

## Veredicto del usuario (Tarea 2, D-36) — 2026-08-29

El usuario completó la revisión humana obligatoria de CONT-09: cubrió tanto la **Parte A** (revisión de la tabla de los 10 pasos contra `~/Downloads/mc_rulesreference_v17-compressed.pdf`, con las cinco correcciones objetivas de la Tarea 1 y las cuatro correcciones confirmadas del borrador ya localizadas arriba) como la **Parte B** (partida jugada de principio a fin en la app, `npm run dev`, recorriendo el bucle de ronda, la cabecera, el índice y los 5 modales de aviso con consecuencia).

**Veredicto literal, sin editar:**

> "La ronda del jugador se me hace un poco pobre, el paso "Jugad vuestros turnos en orden de jugador, uno tras otro" Ignora muchas cosas, yo pondria algo ahora como "Jugad vuestros turnos en orden de jugador, uno tras otro. Opciones: - Cambiar Alter Ego / Heroe - Poner cartas en juego - Utilizar eventos - Activar acciones" un poco el listado de cosas que se pueden hacer, breves y concisas como todas, y que cada opcion sea clickable y tenga el popup que ha quedado muy bien. Por lo demas lo veo bastante bien. Izquierda esta bien. El aviso de los estados en los personajes esta perfecto, aunque solo esta cuando ataca el villano, cuando atacan los personajes no pone nada en ningun sitio."

### Preguntas abiertas — resolución

1. **`ronda.villano.05` (izquierda vs. sentido horario del reglamento).** RESUELTA, sin cambios: el usuario confirma «Izquierda está bien». La convención de mesa ya asumida por el texto es correcta y no requiere corrección.
2. **`ronda.villano.02` (granularidad/énfasis del aviso de Estados).** RESUELTA, sin cambios en ese paso: el usuario confirma que el aviso «Atentos a los Estados en los personajes» «está perfecto» tal y como está redactado hoy. La carencia real detectada no es de redacción en `ronda.villano.02`, sino de **cobertura**: ver Corrección C2 más abajo.

### Correcciones enumeradas por el usuario — C1 y C2

Ambas correcciones caen en el mismo paso, **`ronda.jugadores.01`**, y ambas piden la misma capacidad nueva: una lista de opciones del turno, breve y concisa, con cada opción clicable y con el mismo popup de consecuencia (`WarningDetailModal.vue`) que `warningDetail` estrenó en el plan `02-03`.

- **C1 — `ronda.jugadores.01`, campo `text` (contenido).** El paso «Jugad vuestros turnos en orden de jugador, uno tras otro.» se queda corto: el usuario pide enumerar las opciones del turno — Cambiar Alter-Ego / Héroe · Poner cartas en juego · Utilizar eventos · Activar acciones — cada una breve y concisa, y **clicable con su propio popup de detalle**.
- **C2 — fase `ronda.jugadores` (cobertura, converge en `ronda.jugadores.01`).** El aviso de Estados de `ronda.villano.02` («Atentos a los Estados en los personajes») le parece perfecto, pero solo existe en la fase del villano. Cuando atacan los personajes (parte de las «Opciones» de C1, en «Activar acciones»), no hay ningún recordatorio equivalente de Estados en ninguna parte del turno de jugador.

**Estas dos correcciones quedan PENDIENTES, no aprobadas, no aplicadas y no descartadas.** El esquema vigente de `content/marvel-champions.json` solo admite **un** `warning` + un `warningDetail` por paso, y `ronda.jugadores.01` ya gasta esa única capacidad en «Atentos al dial del villano». Aplicar C1/C2 con el esquema actual exigiría una de estas tres cosas, todas descartadas por falsear el veredicto o romper presupuestos vigentes:
- concatenar la lista de opciones dentro de `text` (rompería el presupuesto `text` ≤90 y no sería clicable, que es justamente lo que pide el usuario);
- sustituir el `warning`/`warningDetail` existente de «Atentos al dial del villano» por la lista de opciones (perdería el aviso que el propio usuario no ha objetado);
- desbordar los presupuestos de `text` ≤90 / `warning` ≤60 para forzar la lista dentro de los campos actuales.

La capacidad que sí las resuelve correctamente — un campo tipo `options[]` en el esquema de contenido, con render clicable reutilizando `WarningDetailModal.vue` para cada opción — se construye en un plan aparte, **`02-05`**, que el orquestador lanza después de esta tarea. **La fase 02 no se da por completa hasta que `02-05` incorpore C1 y C2.**

### Resto del contenido — aprobado

Fuera de C1/C2, el usuario confirma explícitamente: «por lo demás lo veo bastante bien». Esto cubre:
- Las 5 correcciones objetivas de citas y omisiones aplicadas en la Tarea 1 (Correcciones A–E arriba), que siguen en pie sin cambios.
- Las 4 correcciones confirmadas del borrador (6 pasos de villano, obligaciones «una o más», Boost Cards solo villano/esbirros con palabra clave, Modo Experto no altera estructura), verificadas contra el reglamento y bajo gate en `content.test.ts`.
- El bucle de ronda, la cabecera relativa, el índice reordenado y los 5 modales de aviso con consecuencia (`Atentos al dial del villano`, `Mazo agotado…`, `Terminan aquí los efectos…`, `Atentos a los Estados…`, `Encuentros agotado…`), todos comprobados en partida real durante la Parte B.

### Sin cambios en esta tarea

Por la razón de esquema explicada arriba, **esta tarea (Tarea 3) no modifica `content/marvel-champions.json`, no toca `contentVersion` (sigue en 9) y no modifica `engine/__tests__/content.test.ts`**. `npx vitest run` reconfirmado en verde (109/109) al cerrar la tarea, sin ningún cambio de contenido ni de test. CONT-09 queda satisfecho en cuanto a *proceso* (la revisión humana ocurrió y produjo veredicto explícito, versionado, con fecha), pero **el contenido de `ronda.jugadores.01` no es definitivo todavía**: sigue pendiente de C1/C2 hasta que `02-05` añada la capacidad de esquema/UI necesaria.

*Sección añadida por la Tarea 3 del plan `02-04-PLAN.md`.*

---

## C1 y C2 — de PENDIENTES a APLICADAS (Tarea 3 del plan `02-05`) — 2026-08-29

El plan `02-05` construyó la capacidad de esquema que faltaba (`options[]` + `optionsWarning`, DC-10/DC-11) y aplicó C1 y C2 sobre `ronda.jugadores.01`. **Esta sección deja constancia del cambio; no cierra CONT-09 por sí sola** — eso corresponde a la Tarea 4 del propio `02-05`, el visto bueno del usuario en la app, todavía pendiente al escribir esto.

- **C1 aplicada — campo `options[]` de `ronda.jugadores.01`.** Las seis opciones del turno (Rules Reference v1.7, «Player Turn», p. 34): Cambiar Alter-Ego / Héroe · Poner cartas en juego · Utilizar eventos · Usar un poder básico · Activar aliados · Activar habilidades «Acción». Las dos últimas no estaban en el borrador del usuario (que nombraba solo cuatro) y son justo por donde atacan los héroes — el eje donde C2 tiene sentido. Cada una lleva su propio `detail` obligatorio y abre el mismo `WarningDetailModal.vue` que estrenó `02-03`, ahora con `tone: 'neutral'` (DC-12): sin el glifo `⚠`, porque una opción no es una trampa.
- **C2 aplicada — campo `optionsWarning` de `ronda.jugadores.01`.** Cadena idéntica carácter a carácter a `ronda.villano.02.warning`: «Atentos a los Estados en los personajes». No es una opción de la lista (DC-11): es una línea siempre visible bajo la rejilla, sin borde ni chevron, porque D-30 la fija como puro recordatorio de mirar (sin consecuencia enunciada, y por tanto sin detalle posible sin fingir una afordancia falsa). `content.test.ts` la deja bajo gate de igualdad exacta con `ronda.villano.02.warning`: tocar uno sin el otro rompe la suite.
- **`contentVersion` 9 → 10.** Única consecuencia esperada: una partida guardada con contenido de la versión 9 mostrará el aviso de «contenido cambiado» al reanudar, en vez de reanudar en un paso que ya no es el mismo (PERS-03).
- **Nada de lo ya aprobado se ha tocado.** `ronda.villano.02` no cambia ni una letra (el usuario dijo que está perfecto); `ronda.villano.05` sigue diciendo «izquierda» (el usuario dijo que está bien); el aviso «Atentos al dial del villano» y su `warningDetail` en `ronda.jugadores.01` siguen intactos — la lista se suma, no sustituye.
- `npx vitest run`: 133/133 en verde (109 de línea base + 24 nuevos entre `schema.test.ts`, `resolve.test.ts` y `content.test.ts`, incluidos los gates que muerden de C1/C2). `npx nuxt build` sin errores.

---

## Visto bueno del usuario en la app (Tarea 4 del plan `02-05`) — cierre de CONT-09 — 2026-08-29

El usuario verificó en la app, con `npm run dev`, el guion completo de la Tarea 4: **Parte A** (la lista de las seis opciones de `ronda.jugadores.01`, cada una tocada y comprobada contra su panel de detalle), **Parte B** (el recordatorio «Atentos a los Estados en los personajes» siempre visible en la fase de jugadores, sin toque, y su gemelo intacto en `ronda.villano.02`), y **Parte C** (no-regresión: el aviso «Atentos al dial del villano ›» sigue abriendo su panel con el triángulo de aviso, la ronda completa avanza y la lista de opciones reaparece en la vuelta, y el cambio de `contentVersion` avisa correctamente al recargar en mitad de partida).

**Veredicto literal, sin editar:**

> "aprobado"

Es una aprobación incondicional: sin correcciones, sin reservas y sin preguntas pendientes. El usuario confirma explícitamente las seis opciones tal como quedaron autoradas — incluidas `Usar un poder básico` y `Activar aliados`, las dos que no estaban en su borrador original y que se añadieron desde el Rules Reference p. 34 porque son justo por donde atacan los héroes —, sus seis detalles, y la línea «Atentos a los Estados en los personajes» como superficie siempre visible y no pulsable en la fase de jugadores.

### CONT-09 — CERRADO

Con este visto bueno, **CONT-09 queda cerrado**: el contenido de la sección `ronda` es definitivo, revisado por una persona contra el Rules Reference v1.7, con las dos correcciones que trajo esa revisión humana (C1, C2) incorporadas al esquema y al contenido, y verificadas por el propio usuario en la app — no solo en el diff.

La cadena completa de evidencia de CONT-09, de punta a punta, vive en este mismo documento:
1. **Primera revisión (`02-04`, Tarea 1):** las 5 correcciones objetivas de citas/omisiones contra el PDF, y la tabla de los 10 pasos con verificación página a página.
2. **Veredicto humano (`02-04`, Tarea 2/D-36):** aprobación de fondo con dos correcciones pendientes, C1 y C2, diferidas por exigir una capacidad de esquema que no existía (`ronda.jugadores.01` §«Veredicto del usuario»).
3. **Capacidad construida (`02-05`, Tareas 1–3):** `options[]`/`optionsWarning` de punta a punta en el esquema, la UI y el contenido; C1/C2 pasan de PENDIENTES a APLICADAS (sección de arriba, «C1 y C2 — de PENDIENTES a APLICADAS»).
4. **Visto bueno final (`02-05`, Tarea 4, esta sección):** el usuario confirma en la app, con «aprobado» sin condiciones, que C1 y C2 le resuelven lo que pidió.

No queda ninguna corrección abierta, ni de esquema ni de contenido, sobre la sección `ronda`.

**Pendiente de la Tarea 4:** el visto bueno del usuario, en la app y no en el diff, de que C1 y C2 le resuelven lo que pidió. Esta sección registra qué se construyó y por qué; el veredicto del usuario se transcribirá literal, con fecha, a continuación de este párrafo cuando llegue — **CONT-09 no se da por cerrada hasta entonces.**
