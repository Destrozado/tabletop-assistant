# Phase 2: Bucle de ronda y reglas verificadas - Context

**Gathered:** 2026-08-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Tras la pantalla «Mesa lista», el grupo entra en un bucle que se repite ronda tras ronda: **fase de los jugadores** (turnos + los tres pasos de fin de fase) y **fase del villano** (los 6 pasos oficiales del Rules Reference v1.7, que incluyen pasar la ficha de jugador inicial y cerrar la ronda). Al avanzar desde el último paso se vuelve al primer paso de la fase de jugadores y el contador de ronda se incrementa. Todo el contenido de la ronda queda verificado contra el Rules Reference v1.7, incluidos los cuatro errores ya confirmados del borrador.

Detrás: estrenar la maquinaria de bucle que la Fase 1 dejó construida pero sin usar (`loopStartIndex`/`loopEndIndex`, `next()`/`prev()` cíclicos), adaptar cabecera e índice al tramo repetitivo, y endurecer el gate de contenido en CI.

**Añadido al alcance durante esta discusión** (decisión explícita del usuario, reafirmada tras señalarle que amplía la fase): el aviso `⚠` pasa a ser **clicable y abre un modal** con la consecuencia detallada. Es un recorte deliberado de REF-01 —solo el aviso, nunca palabras clave enlazadas— y obliga a reflejar el cambio en `ROADMAP.md` y `REQUIREMENTS.md`.

**Fuera de esta fase:** la locución por voz y el wake lock son la Fase 3; la instalación PWA y el offline, la Fase 4. REF-01/REF-02 completos (corpus de reglas, keywords clicables, búsqueda) siguen en v2.

</domain>

<decisions>
## Implementation Decisions

Numeración continuada desde `01-CONTEXT.md` (D-01…D-19) para que no haya colisiones entre fases.

### Pasos por jugador y granularidad del bucle
- **D-20:** El reglamento dice «en orden de jugador, cada jugador resuelve: el villano activa contra él; luego cada esbirro enfrentado con él activa» (RR v1.7 p. 45, paso 2). Aun así, la app lo cuenta como **un único paso colectivo en plural**. **No se añade `perPlayer` al esquema y `expand.ts` no se toca**: D-02 y D-08 quedan intactas, y el número de pasos del bucle no depende del nº de jugadores. Esto contradice conscientemente la recomendación de `PITFALLS.md:63` («un paso por jugador»); la contradicción está evaluada y resuelta, no pasada por alto.
- **D-21:** La red contra el olvido de un jugador es la **línea `⚠` de recuento** en los pasos por jugador (activación de enemigos, reparto y revelado de encuentros): p. ej. «⚠ Uno por jugador, en orden de jugador — sin saltarse a nadie». Se usa el mecanismo que ya existe (D-05), sin esquema ni UI nuevos.
- **D-27:** La **fase de los jugadores son 4 pasos**: (1) jugad vuestros turnos en orden de jugador, (2) descartar, (3) robar hasta el tamaño de mano, (4) enderezar. Los tres últimos separados porque CONT-02 exige el orden correcto y cada uno es una acción física atómica (D-01 / CONT-11).
- **D-28:** Los pasos 4 y 5 del fin de fase del reglamento (terminan los efectos «hasta el final de la fase»; se resuelven los «cuando/después de que termine la fase») **no son pasos**: van como línea `⚠` en el paso de enderezar.
- **D-35:** El **paso 6 de la fase del villano («Fin de la fase del villano y de la ronda») sí es un paso real**, no un `⚠` del paso 5 — al contrario que en la fase de jugadores. Motivos: CONT-03 y el criterio de éxito nº 1 exigen los 6 pasos oficiales, y ese paso es la frontera visible del bucle, el toque en el que el contador salta a la ronda siguiente en vez de teletransportarse.

### Estructura de datos del bucle
- **D-34:** La sección `RONDA` (`repeats: true`) tiene **dos fases: `JUGADORES` (4 pasos) y `VILLANO` (6 pasos)**. **No hay una tercera fase «Fin de ronda».** Pasar la ficha de jugador inicial (paso 5) y cerrar la ronda (paso 6) viven dentro de la fase del villano, como en el reglamento. La redacción del `ROADMAP.md` («fase de jugadores → fase del villano → fin de ronda») es descripción narrativa, no estructura de datos: **CONT-04 se satisface dentro de la fase del villano**.
- `loopStartIndex` cae en el primer paso de `JUGADORES` y `loopEndIndex` en el paso 6 de `VILLANO`. Ambos ya los calcula `expand.ts` a partir de `repeats: true`; no hay que cablear nada.
- **D-37:** El gate de CI **se endurece a exactamente una** sección con `repeats: true`. Resuelve el `TODO(fase 2)` literal de `engine/schema.ts` (hoy `> 1` falla; pasa a fallar también con `0`). Un fichero de contenido sin bucle debe romper el build, no llegar a la mesa con `loopEndIndex` vacío en silencio. **Revisar `engine/__tests__/fixtures/tiny-game.json`**, que puede no tener sección repetitiva.

### Cabecera dentro del bucle
- **D-22:** Dentro del bucle el contador es **relativo a la fase**: `RONDA 4 · Villano · 3 de 6`. Es literalmente la maqueta de D-11, y el «de 6» coincide con los 6 pasos oficiales, así que el número enseña reglas. **`useGameSession.position` debe pasar a calcularse por `phaseId`** dentro del tramo repetitivo, no sobre toda la secuencia (hoy cuenta todos los nodos `kind:'step'` globalmente, lo que daría «8 de 45»).
- **D-23:** Durante la preparación la cabecera **se queda exactamente como está** (`PREPARACIÓN · 8 de 21`, contador global). La preparación sí es lineal y sí tiene meta. La asimetría entre tramos está aceptada a conciencia: cada tramo muestra lo que allí es útil.

### Índice de salto en el bucle
- **D-24:** Estando en el bucle, el overlay muestra **los bloques de la ronda primero y la preparación al final, atenuada**, como zona de consulta. Un solo overlay (D-13 intacta) y saltar al setup sigue siendo posible, que es lo que FLOW-08 da por hecho. El reordenado debe derivarse de `sectionRepeats`, **nunca cablearse contra el id `ronda`** (TECH-04).
- **D-25:** Dentro del bucle **solo se marca el paso actual (`●`); no hay `✓`**. El `✓` significa «hecho y no vuelve», cierto en la preparación y falso en el bucle. Sigue siendo derivado del cursor sin estado nuevo (D-14 respetada), solo con una regla distinta según `sectionRepeats`.
- **D-26:** FLOW-08 se cumple **sin código nuevo**: `jumpTo()` ya no toca `round`, y para volver a la ronda se usa el propio índice. **Descartado** un botón «Volver a la ronda» y descartado recordar el punto de salida (estado nuevo que puede desincronizarse).

### Contenido de la ronda: principio rector
- **D-31 (principio del usuario, gobierna TODO el contenido de la ronda):** **«Recordar mirar, no explicar lo que ya está impreso.»** Si la regla está escrita en el componente físico (carta de Estado, «Cuando se revela», habilidades, palabras clave), la app **recuerda mirarlo** y no lo reproduce. Si no está impresa en ningún sitio, la app **enuncia la consecuencia**. Encaja además con la restricción legal del proyecto (no reproducir textos con copyright) y con lo hecho en la Fase 1 (redacción propia, breve e imperativa).
  - *Caso real que lo motivó:* «ayer el villano tenía Confundido y Aturdido y ni nos dimos cuenta en toda una fase de villano». Lo que falló fue **mirar**, no saber la regla — la carta la lleva escrita.
- **D-29:** Las reglas condicionales (CONT-05/06/07) aparecen como **línea `⚠` en su paso ancla**, no como lista de recordatorios ni como pasos condicionales propios. Anclas: agotamiento del mazo de jugador → paso «robar»; agotamiento del mazo de encuentros → pasos de repartir/revelar; Aturdido/Confundido/Duro → paso «los enemigos activan»; cambio de fase del villano → paso «jugad vuestros turnos».
- **D-30:** Aplicación de D-31 a cada condicional:
  - **Estados (Aturdido/Confundido/Duro):** solo recordatorio de mirar («⚠ Atentos a los Estados en los personajes»). La carta lleva la regla.
  - **Agotamiento del mazo de jugador:** **enuncia la consecuencia** — barajas tu descarte y **te repartes a ti mismo una carta de encuentro boca abajo**. Nada en la mesa lo dice.
  - **Agotamiento del mazo de encuentros:** **enuncia la consecuencia** — barajas el descarte de encuentros y **colocas una ficha de aceleración** junto al esquema principal. Caso distinto del anterior y con castigo global y permanente (esto es literalmente lo que CONT-05 pide diferenciar).
  - **Cambio de fase del villano:** en pantalla solo «⚠ Atentos al dial del villano»; el procedimiento (retirar la fase, revelar la siguiente, ajustar el dial, qué se conserva) va **en el modal** (D-32).
- **D-33:** **ADAPT-04 se cumple con una sola frase colectiva**, sin campo `branches` ni UI nueva: «El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego». Ambas ramas visibles a la vez y sin ningún toque, en el mismo registro plural de D-02.

### El aviso clicable (superficie nueva en esta fase)
- **D-32:** El `⚠` **es clicable y abre un modal** con la consecuencia detallada, que se cierra fácilmente para seguir jugando. Racional del usuario: *el recordatorio lo quieres siempre; las consecuencias solo si dudas.* En pantalla queda lo breve y conciso; el detalle está a un toque.
  - **Límite duro:** **solo el aviso `⚠`**. Nada de palabras clave enlazadas dentro del texto del paso, ni diccionario de keywords, ni búsqueda — eso es REF-01 entero y sigue en v2.
  - **Forma:** un campo **opcional** nuevo junto a `warning` en `TextBlockSchema`. Un `⚠` sin ese campo **no es clicable** (sin afordancia falsa). `warning` mantiene su tope de 60 caracteres: el principio D-31 lo hace suficiente.
  - **El texto del detalle lo escribe el autor del paso**, con redacción propia; no hay corpus de reglas nuevo que mantener.
  - **Deuda de alcance a saldar:** el `ROADMAP.md` de la Fase 2 (5 criterios de éxito, todos de bucle y contenido) y `REQUIREMENTS.md` no contemplan esta superficie. Hay que reflejarla — es un REF-01 recortado adelantado a v1.

### Verificación del contenido (CONT-09)
- **D-36:** Se repite el dispositivo de la Fase 1 —citas en datos (D-06), gate de esquema en CI, reverificación automática— **más una tarea explícita del plan en la que el usuario revisa a mano el contenido de la ronda contra el reglamento antes de darlo por definitivo**. Motivo: en `01-06` los tres errores de fidelidad los cazó la revisión humana del usuario, no la reverificación automática. Esa tarea debe existir en el plan, no ser un paso implícito.
- Los **cuatro errores confirmados del borrador** están fijados y son de contenido obligatorio en esta fase: 6 pasos oficiales de la fase del villano (no 4); obligaciones «una o más por identidad» (no una por jugador); **solo el villano y los esbirros con la palabra clave Villano roban cartas de aumento**; el **Modo Experto no altera la estructura de la fase del villano** (eso es el Modo Heroico, un eje aparte y combinable).

### Claude's Discretion
El usuario no delegó ninguna decisión de forma explícita. Estas quedan sin fijar y son del ámbito de research/planner:
- **Frase locutable (`speech`) del contenido de la ronda — DECIDIR EN PLANIFICACIÓN.** Hallazgo de esta discusión: el contenido actual tiene **24 pasos, 3 con `warning` y 0 con `speech`**. El campo existe en el esquema desde la Fase 1 pero **ningún paso lo usa**, pese a que el `ROADMAP.md` dice que el esquema con «frase corta locutable» se diseña desde la Fase 1 porque «retro-adaptarlo después sería caro». Si la ronda se escribe también sin `speech`, la Fase 3 hereda ~45 pasos que locutar de golpe. Se ofreció discutirlo y el usuario cerró la discusión sin abordarlo: **el planner debe decidirlo explícitamente**, y la inclinación por defecto (del propio roadmap) es redactar `speech` ya.
- **Reanudación dentro del bucle.** `usePersistedSession` ya persiste `round`, pero `ResumePrompt.vue` no lo menciona: al reanudar se indica el paso sin decir que se iba por la ronda 4. `PITFALLS.md:179` avisa de exactamente este riesgo. No se discutió; queda a criterio del planner si entra aquí o se anota.
- **Detalle de la UI del modal del `⚠`** (apertura, cierre, tamaño táctil a un brazo de distancia, foco y accesibilidad). La Fase 1 tuvo `01-UI-SPEC.md`; **valorar `/gsd:ui-phase 2`** antes de planificar, ya que esta fase estrena superficie de UI que ninguna spec cubre.
- Redacción concreta de cada paso, recuento final de pasos del bucle y reparto exacto de los `⚠`.
- Cómo se representa el número de ronda en `sectionLabel` (hoy `sectionTitle.toUpperCase()`) y dónde vive la lógica de «tramo repetitivo» compartida por cabecera, índice y marcas.
- Alcance de los tests del bucle más allá de lo que exigen FLOW-03/04/07/08.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto y alcance del proyecto
- `.planning/PROJECT.md` — Core value, restricciones (incluida la legal), y los errores confirmados del borrador de reglas. **Ojo: «Pantalla de consulta de reglas» figura en Out of Scope; D-32 abre una excepción acotada y hay que reflejarla**
- `.planning/REQUIREMENTS.md` — Los 12 requisitos de esta fase (FLOW-03/04/07/08, CONT-02…07, CONT-09, ADAPT-04). **REF-01/REF-02 en `REQUIREMENTS.md:109-110` (v2) son el destino natural de la idea completa que D-32 recorta**
- `.planning/ROADMAP.md` — Fase 2 con sus 5 criterios de éxito. **La deuda de alcance de D-32 se salda aquí**
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-CONTEXT.md` — **Lectura obligatoria.** D-01…D-19 siguen vigentes; esta fase numera desde D-20 y no re-litiga ninguna
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-UI-SPEC.md` — Presupuestos de texto (90 caracteres en `text`, 60 en `warning`), escala tipográfica y maquetas de las tres bandas

### Investigación del proyecto
- `.planning/research/ARCHITECTURE.md` — Modelo de flujo (árbol autorado aplanado a array + `loopStartIndex`/`loopEndIndex`), esquema JSON y estrategia de persistencia
- `.planning/research/PITFALLS.md` — **§63 recomienda un paso por jugador; D-20 lo descarta a conciencia.** `§179` describe el riesgo de reanudación engañosa, relevante para la reanudación dentro del bucle
- `.planning/research/STACK.md` — Versiones verificadas y decisiones de stack
- `.planning/research/FEATURES.md` — Table stakes de UI en tablet y anti-features

### Reglamento oficial (fuente de verdad de CONT-09)
- `~/Downloads/mc_rulesreference_v17-compressed.pdf` — **Rules Reference v1.7, en inglés.** Extraíble con `pdftotext -layout` (validado en esta discusión). Entradas clave para esta fase:
  - **«Round Overview» (p. 4)** — los 10 hitos de la ronda
  - **«Villain Phase» (p. 45)** — **los 6 pasos oficiales, literal**: 1) Colocar amenaza (campo de aceleración del esquema principal + iconos y fichas de aceleración activos) · 2) Los enemigos activan (en orden de jugador: el villano activa contra el jugador; luego cada esbirro enfrentado con él, en el orden que ese jugador elija) · 3) Repartir cartas de encuentro (una a cada jugador + una adicional por cada icono de peligro en juego, en orden de jugador) · 4) Revelar cartas de encuentro (el primer jugador revela las suyas de una en una en el orden en que se repartieron, y luego cada jugador en orden) · 5) Pasar la ficha de jugador inicial al jugador de la izquierda · 6) Fin de la fase del villano y de la ronda (terminan los efectos «hasta el final de la fase/ronda»; se resuelven los «cuando/después de que termine»)
  - **«End of Player Phase» (p. 17)** — los 5 pasos: 1) descartar (en orden de jugador; obligatorio bajar al tamaño de mano) · 2) robar hasta el tamaño de mano (simultáneo) · 3) enderezar todas las cartas, incluidas las de encuentro agotadas (simultáneo) · 4) terminan los efectos «hasta el final de la fase» · 5) efectos «cuando/después de que termine la fase»
  - **«Player Phase» / «Player Turn» (pp. 32-33)** — el turno es libre: cambiar de forma (una vez por turno), jugar cartas, usar el poder básico, activar aliados, disparar habilidades «Acción»
  - **«Encounter Deck»** — mazo de encuentros agotado: se baraja el descarte **y se coloca una ficha de aceleración** junto al mazo de esquema principal
  - **«Player Deck» (p. 32)** — mazo de jugador agotado: barajas tu descarte **y te repartes a ti mismo una carta de encuentro boca abajo**. Si además no tienes descarte, el mazo no se reinicia hasta que haya al menos una carta en él
  - **«Villain Defeat» (p. 44)** — dial a cero: se retira la fase actual, se revela la siguiente y se ajusta el dial. Si la nueva fase tiene el mismo título, se conservan adjuntos, mejoras, cartas de Estado, contadores y fichas que no sean de daño; si el título es distinto, no se conservan
- `~/Downloads/Marvel-Champions_aprende_a_jugar.pdf` — «Aprende a jugar». Útil para el orden narrativo; **el Rules Reference manda en caso de conflicto**

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`engine/navigator.ts`** — `next()`/`prev()` **ya implementan el bucle completo** (cierre en `loopEndIndex` con `round + 1`, retroceso en `loopStartIndex` con `round - 1`) y `jumpTo()` **ya no toca `round`**. Los guards comparan con `!== undefined`, no por veracidad. **FLOW-03/04/07/08 son casi todo contenido, no motor nuevo** — pero hoy no hay ninguna sección con `repeats:true`, así que esa maquinaria **no se ha ejecutado nunca con datos reales**
- **`engine/expand.ts`** — deriva `loopStartIndex`/`loopEndIndex` del primer y último nodo de la única sección con `repeats:true`. Añadir la sección `RONDA` al JSON basta para activarlo. Comentario explícito: «No expande por jugador: no existe `perPlayer`» — D-20 lo confirma
- **`engine/toc.ts`** — `tableOfContents()` agrupa por `phaseId` **consecutivo** (por posición, nunca por mapa) y deriva las marcas del `cursor`. D-24 y D-25 se implementan aquí; ya recibe `sectionRepeats` en cada `RuntimeStepNode`
- **`app/components/AppHeader.vue`** — componente tonto ya dimensionado para D-11; la zona derecha admite más de dos hijos
- **`app/components/IndexOverlay.vue`**, **`StepScreen.vue`**, **`NavBand.vue`**, **`ConfirmDialog.vue`** — `ConfirmDialog` es el precedente más cercano para el modal de D-32 (patrón de diálogo ya existente en el repo)
- **`engine/__tests__/navigator.test.ts`** — ya cubre cierre de bucle, salto y reanudación; ampliar en vez de reescribir

### Established Patterns
- **Motor puro en `engine/`**, cero imports de Vue/Nuxt/DOM. Los componentes **nunca** importan `~~/engine/*`: si un componente necesita algo del motor, falta una `computed` en `useGameSession.ts` (única costura reactiva)
- **`usePersistedSession.ts` es la única costura de `localStorage`** de toda la app
- **Componentes presentacionales tontos**: props y eventos, sin lógica
- **Renderizado siempre por interpolación de texto**; prohibida la directiva de HTML crudo (amenaza T-01-01). **Aplica también al texto del modal de D-32**
- **`zod` es devDependency y solo vive en `engine/schema.ts`**; nunca cruza a `app/` (T-01-19). El contenido llega al navegador como JSON crudo sin pasar por Zod — de ahí el fallback `?? 'step'` de `kind` en `useGameSession.ts` (WR-01). **Cualquier campo nuevo con `.default()` necesita el mismo fallback en runtime**
- **Etiquetas del índice y de la cabecera siempre derivadas de los datos** (`phaseTitle`, `sectionTitle`, `sectionRepeats`), nunca cableadas contra ids concretos (TECH-04) — el motor debe seguir sirviendo para Warhammer 40.000

### Integration Points
- **`content/marvel-champions.json`** — hoy: 1 sección (`setup`, `repeats:false`), 7 fases, 24 pasos (21 `kind:step` + el `summary` «Mesa lista»), 3 con `warning`, **0 con `speech`**. Esta fase añade la sección `RONDA`
- **`useGameSession.position`** — hoy cuenta todos los nodos `kind:'step'` de la secuencia completa; D-22 obliga a recalcularlo por fase dentro del tramo repetitivo
- **`useGameSession.sectionLabel`** — hoy `sectionTitle.toUpperCase()`; debe pasar a componer `RONDA {n} · {phaseTitle}` en el tramo repetitivo, derivándolo de `sectionRepeats`
- **`engine/schema.ts`** — dos cambios: el `TODO(fase 2)` de `superRefine` (D-37) y el campo opcional de detalle del aviso (D-32)
- **`engine/__tests__/content.test.ts`** — el gate exige `citation` solo en `kind:'step'`, nunca en `kind:'summary'`. El contenido de la ronda entra por ahí
- **Despliegue en Vercel** desde `Destrozado/tabletop-assistant`, auto-deploy en push a `main`; cabeceras en `nitro.routeRules`, **no** en `vercel.json`

</code_context>

<specifics>
## Specific Ideas

- **El caso real que originó el principio D-31:** «ayer el villano tenía Confundido y Aturdido y ni nos dimos cuenta en toda una fase de villano». La conclusión del usuario, textual: *«las cartas físicas llevan la regla escrita; solo hace falta el recordatorio de checkearlo. Si eso no te hace mirar si está aturdido ya es culpa nuestra.»* Es el criterio que decide qué se escribe y qué no en todo el contenido de la ronda.
- **Racional textual de D-32:** *«el recordatorio lo quieres siempre, pero las consecuencias solo si no te las sabes; así tienes lo importante, breve y conciso, en pantalla, y las consecuencias solo si dudas, en un modal que se cierra fácilmente y continúas.»*
- **Cabecera objetivo del bucle**, aprobada ya en la Fase 1 y confirmada aquí:
  ```
  ┌─────────────────────────────────────────────┐
  │ RONDA 4 · Villano · 3 de 6  3 jug · Normal ≡│
  └─────────────────────────────────────────────┘
  ```
- **Redacción:** imperativo, plural, breve — como en la Fase 1. «Repartid una carta de encuentro a cada jugador», no «Se reparte una carta a cada jugador».
- **Nota legal para cuando llegue REF-01:** el usuario planteó que el modal mostrase la regla «literalmente». Eso chocaría con la restricción del proyecto de no reproducir textos con copyright. La versión viable es **redacción propia + cita**, como ya se hace desde D-06.

</specifics>

<deferred>
## Deferred Ideas

- **REF-01/REF-02 completos: cualquier palabra clave de cualquier texto es clicable y abre su regla.** Idea del usuario en esta discusión, con corpus de reglas y búsqueda por término. Ya existía como `REF-01`/`REF-02` en `REQUIREMENTS.md:109-110` (v2) y como idea aplazada de la Fase 1. **Queda reforzada por el caso real del villano Confundido+Aturdido.** D-32 adelanta a v1 solo el trozo más barato (el aviso clicable); el resto —diccionario de keywords, marcado dentro del texto del paso, búsqueda— sigue fuera. Cuando llegue: redacción propia + cita, nunca texto literal del Rules Reference.
- **Fase 2.1 dedicada a lo clicable** — se ofreció como alternativa para no desviar la Fase 2; el usuario prefirió acotar el alcance dentro de la propia fase (solo el `⚠`). Sigue siendo la salida natural si el modal crece durante la planificación.
- **Campo `branches[]` en el esquema para las ramas Héroe/Alter-Ego** — descartado por D-33 a favor de una frase colectiva. Reconsiderable si aparecen pasos con ramas que no quepan en una sola frase.
- **Botón «Volver a la ronda»** tras saltar a la preparación — descartado por D-26 (estado nuevo que puede desincronizarse). Reconsiderable si en mesa resulta incómodo buscar el sitio en el índice.
- **Un paso por jugador (`perPlayer`)** — descartado por D-20 pese a la recomendación de `PITFALLS.md:63`. Reconsiderable si tras jugar una partida se sigue olvidando activar contra alguien y el `⚠` de recuento no basta.
- **Subir el tope de 60 caracteres de `warning`** — se planteó y dejó de hacer falta al aparecer el principio D-31 y el modal de D-32.

</deferred>

---

*Phase: 2-Bucle de ronda y reglas verificadas*
*Context gathered: 2026-08-29*
