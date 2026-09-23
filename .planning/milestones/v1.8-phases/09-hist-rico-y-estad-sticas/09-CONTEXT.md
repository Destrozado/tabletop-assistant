# Phase 9: Histórico y estadísticas - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega tres cosas y ninguna más:

1. **Registrar el resultado al terminar la partida** — un diálogo al confirmar «Partida
   terminada» que captura Ganada / Perdida (con su causa) o permite salir sin registrar
   nada, justo antes de que la sesión se destruya.
2. **Una pantalla de histórico** que lista las partidas registradas de la más reciente a
   la más antigua, con borrado por entrada tras confirmar.
3. **Una pantalla de estadísticas** con el % de victorias por héroe y por villano, con su
   estado vacío.

**Todo en `localStorage`, y Firestore NO existe en el código en esta fase.** Eso no es un
detalle de orden: es el criterio de éxito nº 5 del ROADMAP y la razón por la que las Fases
9 y 10 se separaron a propósito. Que «la pantalla lee exclusivamente localStorage»
(STAT-04) se verifica de forma trivial aquí porque no hay otra fuente que pudiera leer.
Cualquier línea que mencione Firebase, Firestore, sincronización o red pertenece a la
Fase 10.

**Fuera de esta fase, explícitamente:**
- **Editar** una entrada ya registrada — HIST-10, diferido a un hito posterior. Solo borrar.
- **Estadísticas por jugador** (rachas, % de cada persona) — STAT-06, diferido. La entrada
  guarda el nombre del jugador, pero **ninguna pantalla lo agrega**.
- **Desglose por dificultad** — STAT-07, diferido. La entrada guarda la dificultad; la
  pantalla de estadísticas no la cruza con nada.
- **Un tercer resultado «abandonada»** — HIST-02 fija dos resultados y una salida sin
  registrar. Salir sin registrar ES el caso de la partida abandonada.
- **Gráficas, insignias, rankings, exportar** — nada de esto tiene requisito.

`PITFALLS.md` §14 predice que cada fase de este hito atrae la exclusión adyacente. Aquí la
tentación tiene nombre: *ya que existe la tabla, un % por jugador es gratis*. No lo es —
es STAT-06 y está diferido.

</domain>

<decisions>
## Implementation Decisions

Numeración local de la fase (las Fases 4, 5, 6, 7 y 8 también reiniciaron en D-01).

### El flujo de fin de partida

- **D-01 (HIST-01/HIST-02/HIST-03):** Un **solo diálogo con cuatro botones**, sin pasos
  intermedios ni estado de «¿y la causa?»:

  ```
  ┌──────────────────────────────────────┐
  │  ¿Cómo terminó la partida?           │
  │                                      │
  │  Kang · 3 jug · Normal · ronda 7     │
  │                                      │
  │  ┌────────────────────────────────┐  │
  │  │           GANADA               │  │
  │  └────────────────────────────────┘  │
  │  ┌────────────────────────────────┐  │
  │  │  PERDIDA · plan principal      │  │
  │  └────────────────────────────────┘  │
  │  ┌────────────────────────────────┐  │
  │  │  PERDIDA · héroes eliminados   │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │              Salir sin registrar     │
  └──────────────────────────────────────┘
  ```

  Un toque = un registro. La causa de derrota **no es un campo aparte que se pueda
  contradecir**: elegir la derrota YA elige la causa, así que no existe el estado
  «perdida sin causa» ni hay que decidir si la causa es obligatoria. Es el mismo
  razonamiento estructural que D-02 de la Fase 8 (un enum plano en vez de
  `{ kind, scope }`, que crea estados imposibles).

  El diálogo **se apila sobre el índice sin cerrarlo**, igual que hoy hace el
  ConfirmDialog de «Partida terminada» (D-U3, `app/pages/[game]/index.vue:501`).

- **D-02:** Este diálogo **sustituye** al `ConfirmDialog` que hoy abre «Partida terminada»
  (`index.vue:732-741`, cuerpo `endGameBody`). Los cuatro botones **son** la confirmación,
  así que el número de toques no cambia respecto a hoy (Partida terminada → un botón). El
  cuerpo del diálogo **debe seguir diciendo que el progreso guardado se borrará**: ese
  aviso no desaparece, cambia de sitio.

- **D-03 (el hueco que esto cierra, no es cosmético):** Tras registrar, se vuelve al
  inicio **con un aviso breve «Partida registrada»**. Motivo estructural:
  `writeRaw()` en `usePersistedSession.ts:88-99` **falla en silencio por diseño** (modo
  privado, cuota, contexto restringido) — sin aviso, el grupo creería que la partida quedó
  guardada cuando no lo está, en el único dato de la app que no se puede reconstruir.

  **Consecuencia obligatoria para el planner:** `appendHistoryEntry()` **devuelve si logró
  escribir** (no `void`), y el aviso refleja ese resultado. Si falla, el aviso lo dice; no
  se inventa un éxito. Esto NO contradice VOZ-06/D-51 («un fallo de almacenamiento nunca
  rompe la interacción»): la interacción no se rompe, se informa.

- **D-04:** **El mismo diálogo, siempre.** También si se pulsa «Partida terminada» a medio
  montar la mesa. Cero casos especiales: quien está en preparación toca «Salir sin
  registrar», que es lo natural. La app no adivina intenciones. Una partida registrada
  desde el setup guardaría `round: 1` y unos minutos de duración, y eso es un dato honesto,
  no un error.

- **D-05 (la otra salida, que NO registra):** `onDiscardConfirm` (`index.vue:485-497`,
  «Empezar partida nueva» desde el `ResumePrompt`) **no se toca y no registra nada**.
  HIST-01 habla de «al terminar la partida»; descartar una partida para empezar otra es
  abandonarla, no terminarla, y no hay resultado que registrar. Es la única ruta de la app
  que destruye una sesión sin pasar por el diálogo nuevo, y así se queda.

### Las dos causas de derrota, contrastadas con el reglamento

- **D-06 (fidelidad de reglas — contrastado en esta discusión, no dado por bueno):** El
  Rules Reference v1.7 dice, en «Winning the Game» (p. 46):

  > *«If the final villain stage is defeated, the players win the game. If the **final
  > stage of the main scheme deck is completed**, the villain wins the game.»*

  y en «Eliminated»:

  > *«If all players are **eliminated**, the game ends and the players lose.»*

  De ahí dos correcciones sobre la redacción heredada de `REQUIREMENTS.md` («todos los
  héroes derrotados»):

  1. La causa no es «el plan principal se completó» sino que se completa **su etapa
     final**. El proyecto ya renombró «carta/mazo de escenario» como **Plan Principal**
     (quick `260902-0oz`), así que la redacción coherente es **«Se completó el Plan
     Principal»**, y el detalle de la tarjeta del histórico puede ser «Se completó la
     etapa final del Plan Principal».
  2. El término oficial es **eliminado**, no *derrotado*: un héroe a 0 puntos de vida es
     *defeated*, y el jugador queda *eliminated*; la partida se pierde cuando **todos**
     lo están. Es exactamente la distinción por la que la Fase 7 eligió la palabra «SIN
     VIDA» y rechazó «DERROTADO» (D-16 de la Fase 7). La etiqueta es **«Todos los héroes
     eliminados»**.

  **Las claves del dato NO son la etiqueta de pantalla** (misma disciplina que
  `handSizeAlterEgo` en D-07 de la Fase 8): el enum guardado es
  `'mainSchemeCompleted' | 'heroesEliminated'`, y la redacción española vive en la capa
  que pinta.

  **Nota de alcance, no de trabajo:** el RR añade que «algunos escenarios tienen
  condiciones alternativas de victoria o derrota». Los 3 villanos jugables del catálogo se
  rigen por las dos condiciones estándar, así que el enum de dos valores es correcto hoy.
  Si algún día entra un escenario con condición alternativa, el enum gana un valor — no
  es un problema que esta fase deba resolver por anticipado.

### El reloj y las rondas

- **D-07 (HIST-05):** `startedAt` **se fija una sola vez en `start()`** de
  `useGameSession.ts:129-132`, dentro del `context` que recibe `expand()`. Es campo
  **aditivo** de `SessionContext`, exactamente igual que `selection` (D-19 de la Fase 6) y
  `counters` (D-19 de la Fase 7): **no se bumpea `formatVersion` ni `contentVersion`**, y
  `engine/persistence.ts` no se toca (`toPersistedPosition` ya persiste `context` entero y
  `resume()` ya lo restaura entero).

  **Regla dura:** la ruta de reanudación **nunca** reescribe `startedAt`. Solo se escribe
  al crear la sesión de verdad.

- **D-08:** La duración es **reloj de pared sin tope**: `Date.now() - startedAt`. Sin
  temporizadores, sin acumular tiempo activo, sin pausas por bloqueo de tablet, sin
  umbral de cordura. Razón concreta de proyecto: **este grupo siempre termina de una
  sentada lo que empieza**, así que el caso patológico (partida dejada a medias y
  reanudada al día siguiente, que marcaría 14 h) es marginal y no justifica meter estado
  de temporizador en el `context`, en la persistencia y en el ciclo de vida de la página.

- **D-09 (HIST-04):** Se guarda **`round` tal cual** —el valor del motor, que empieza en 1
  y sube al cerrar cada vuelta— y se lee como **«hasta la ronda N»**, no como «N rondas».
  Es exactamente la cifra que la cabecera mostró toda la partida
  (`RONDA 7 · Fase de los jugadores`, `engine/header.ts:54`), así que el registro nunca
  contradice lo que el grupo tenía delante. Nada de `round - 1`.

- **D-10 (compatibilidad, COMP-02):** Una partida guardada por la versión hoy desplegada
  se reanudará **sin `startedAt`**. En ese caso se guarda **`durationMs: null`** y el
  histórico pinta **«—»**. Misma postura defensiva que D-12 de la Fase 7: «—» significa
  «no se sabe» y **nunca** se confunde con un cero, y nunca se inventa una cifra
  rellenando el reloj al reanudar. Caso transitorio: solo afecta a las partidas que estén
  en vuelo el día del despliegue.

### Forma del dato guardado

- **D-11:** Cada entrada guarda **id + nombre congelado** de villano y de cada héroe:

  ```json
  {
    "villainId": "kang",
    "villainName": "Kang",
    "players": [
      { "heroId": "thor",     "heroName": "Thor",  "playerName": "Ana" },
      { "heroId": "she-hulk", "heroName": "Hulka", "playerName": "" }
    ]
  }
  ```

  El nombre congelado es **el que el grupo vio en pantalla**, es decir el alias español de
  `app/data/spanish-hero-aliases.ts`, no el nombre inglés de MarvelCDB. Razón: el catálogo
  se regenera con `npm run catalogue:generate` desde una API de terceros, así que un id
  puede quedar huérfano — y el histórico **no se puede editar** (HIST-10 diferido), así
  que un hueco sería permanente. Las **estadísticas agrupan por `id`**, que es estable;
  la **pantalla muestra el nombre congelado**, que es legible pase lo que pase.

- **D-12 (SEL-09):** Elegir villano y héroes es opcional de principio a fin, así que una
  entrada puede tener **`villainId: null` y todos los héroes nulos**. Se registra igual
  (fecha, resultado, causa, dificultad, nº de jugadores, rondas, duración) y **queda fuera
  del % de victorias**, porque no hay a quién atribuirla. Para que el % no parezca que se
  come partidas, la pantalla de estadísticas puede declarar la muestra en una línea
  («12 partidas registradas · 10 con héroes anotados»). **Descartada** una fila «Sin
  especificar» en una tabla que promete ser de héroes y villanos, y **descartado** exigir
  la selección antes de registrar (convertiría SEL-09 en obligatorio por la puerta de
  atrás).

- **D-13 (HIST-06):** El histórico vive en **una clave `tga:history`** con envoltorio:

  ```
  tga:history  →  { "formatVersion": 1, "entries": [ … ] }
  ```

  `formatVersion` reutiliza a propósito el nombre del campo que ya usa
  `PersistedPosition` (`engine/persistence.ts:9-17`), para que el patrón de migración sea
  el que el proyecto ya conoce. **La lectura valida entrada a entrada y descarta las
  inválidas sin tirar el resto** — el criterio de `isPersistedPosition`
  (`usePersistedSession.ts:61-71`) aplicado en bucle:

  ```
  loadHistory()
    JSON corrupto        → []
    formatVersion ≠ 1    → []        (punto de migración futuro)
    3 entradas, 1 rota   → las 2 buenas
  ```

  **Descartada** una clave por partida (`tga:history:<id>`): listar exigiría recorrer
  `localStorage` por prefijo y borrar dejaría de ser un splice.

- **D-14 (la Fase 10 no se adelanta):** **No se escribe `syncedToFirestore` en esta
  fase.** La Fase 10 lo añadirá como campo **aditivo opcional**, y una entrada que no lo
  traiga se tratará como pendiente — así las partidas registradas ahora se suben solas
  cuando llegue. Esta fase no menciona Firestore en ninguna línea de código ni de dato,
  que es literalmente el criterio de éxito nº 5.

- **D-15:** Cada entrada guarda su **`gameId`**, y hay **un solo histórico** para toda la
  app, no uno por juego. El selector ya anuncia Warhammer 40.000 como «PRÓXIMAMENTE»: con
  `gameId` por entrada, el día que exista basta con etiquetar o filtrar, sin migrar nada
  ni duplicar pantallas. Es también lo que hace que «accesible desde el inicio» (STAT-01)
  tenga sentido: el inicio todavía no sabe de qué juego hablas.

### Las dos pantallas y cómo se llega

- **D-16 (HIST-07/STAT-01):** **Dos rutas separadas**, cada una a pantalla completa con su
  «Atrás»: `/historico` y `/estadisticas` (nombres exactos a discreción del planner).
  **Descartadas las pestañas**: la app no tiene ese patrón en ninguna parte, y cada
  requisito cae así en una pantalla identificable.

  **Consecuencia mecánica obligatoria:** ambas rutas deben enumerarse en
  `nitro.prerender.routes` de `nuxt.config.ts` (hoy `['/', '/marvel-champions']`), porque
  `crawlLinks: false` y la navegación usa `navigateTo()` en manejadores de click, no
  `<NuxtLink>` con `href` real — el crawler no las descubriría. El `globPatterns` de
  Workbox ya incluye `**/*.{js,css,html}`, así que el HTML prerenderizado de cada ruta
  nueva se precachea solo (`PITFALLS.md` §9), pero **hay que comprobarlo, no suponerlo**:
  no hay `navigateFallback` que salve una ruta olvidada.

- **D-17:** Los accesos van en **dos botones con tratamiento secundario debajo de las
  tarjetas de juego** del inicio (`GameSelectorScreen.vue`), sin cambiar la estructura del
  bloque centrado — no compiten con «¿A qué juego vais a jugar?», que sigue siendo el
  centro de la pantalla.

- **D-18:** Las dos pantallas **se enlazan entre sí**, además del «Atrás» al inicio. Mirar
  el 40 % de Kang y querer ver qué partidas lo componen es el gesto natural; sin el cruce
  son tres toques.

### Anatomía del histórico

- **D-19 (HIST-07):** Cada partida es una **tarjeta con todo visible** — nada escondido
  detrás de un toque:

  ```
  ┌────────────────────────────────────┐
  │ GANADA              12 sep 2026    │
  │ Kang · Normal · 3 jug              │
  │ Ana · Thor                         │
  │ Jugador 2 · Hulka                  │
  │ Luis · Spider-Man                  │
  │ Hasta la ronda 7 · 1 h 40 min      │
  │                            Borrar  │
  └────────────────────────────────────┘
  ┌────────────────────────────────────┐
  │ PERDIDA              9 sep 2026    │
  │ Se completó el Plan Principal      │
  │ Rhino · Experto · 2 jug            │
  │ …                                  │
  └────────────────────────────────────┘
  ```

  Coherente con una app que se lee a un brazo de distancia y que hasta ahora nunca ha
  escondido información tras un toque salvo el aviso `⚠` (D-32 de la Fase 2). El nombre de
  jugador vacío se pinta **«Jugador N»** reutilizando `resolvePlayerLabel`
  (D-15 de la Fase 6). **Descartado** el modal de detalle: superficie táctil de más y
  afordancia de toque donde no hay acción.

- **D-20 (HIST-08):** El botón **«Borrar» vive en cada tarjeta** y abre el
  **`ConfirmDialog.vue` que ya existe** con `destructive: true` (el relleno rojo es reserva
  de color del contrato de la Fase 1) y el cuerpo **citando la partida concreta**
  («Ganada del 12 sep 2026 contra Kang»). Cero componentes nuevos, superficie ya
  verificada en táctil.

- **D-21:** Fecha **«12 sep 2026»** y duración **«1 h 40 min»** (y **«—»** cuando no se
  sabe, D-10). Mes abreviado en letra: sin ambigüedad día/mes y legible a distancia.
  **El formateo lo hace una función pura del motor** (mismo papel que `describeHeader`),
  **no `toLocaleDateString`**, para que los tests comparen cadenas exactas sin depender
  del locale del entorno de CI.

- **D-22 (estado vacío del histórico):** «Todavía no hay partidas registradas», y debajo,
  en secundario, la explicación de que al terminar una partida la app pregunta cómo acabó
  — la primera vez que alguien abre esta pantalla no sabe todavía que ese diálogo existe.

### Anatomía de las estadísticas

- **D-23 (STAT-02/STAT-03):** La tabla lista **solo a quien ha jugado** al menos una
  partida registrada. Los 23 héroes del catálogo con 20 filas a «0 de 0» enterrarían las
  3 filas con dato. Los villanos, al ser 3, salen todos por el mismo criterio.

  ```
  % DE VICTORIAS POR HÉROE
  ────────────────────────────────
  Thor            3 de 4  ·  75 %
  Hulka           1 de 2  ·  50 %
  Spider-Man      2 de 5  ·  40 %

  % DE VICTORIAS POR VILLANO
  ────────────────────────────────
  Rhino           3 de 3  · 100 %
  Kang            2 de 5  ·  40 %
  ```

- **D-24:** Orden por **% descendente**; a igualdad de %, primero quien tiene **más
  partidas jugadas**; a igualdad de ambas, **alfabético**. Los tres criterios en cascada,
  para que el orden sea **determinista y testeable**, no dependiente del orden de
  inserción.

- **D-25 (STAT-05):** **Sin umbral mínimo de partidas.** «1 de 1 · 100 %» no engaña a
  nadie porque **el recuento va delante del porcentaje y con el mismo peso visual** — la
  defensa contra el % engañoso es enseñar el dato entero, no esconder filas. Para un grupo
  de amigos, ocultar información que ellos mismos generaron es peor que un porcentaje
  ruidoso. **Descartados** el umbral que sustituye el % por «—» y el bloque aparte de
  «pocas partidas».

- **D-26 (la regla de atribución, que hay que escribir porque no es obvia):** Marvel
  Champions es cooperativo: **el grupo gana o pierde junto, así que el resultado se
  atribuye a TODOS los héroes que jugaron esa partida** (una victoria a 3 jugadores es una
  victoria para los 3 héroes). Y como la app permite elegir el mismo héroe en dos huecos
  (SEL-07 lo marca, no lo bloquea), **una partida cuenta UNA vez por héroe distinto**, no
  una por hueco: el denominador de un héroe son las partidas en las que estuvo. Así el %
  se lee como «de cada 4 partidas con Thor, ganamos 3», que es lo que la tabla promete.

### Claude's Discretion

El usuario eligió las 26 decisiones tal como se le presentaron, todas coincidiendo con la
recomendación. Nada quedó delegado con un «tú decides», pero estas áreas quedan
explícitamente abiertas al planner y a la fase de UI:

- **Nombres de ficheros, rutas y símbolos.** Candidatos naturales, no obligaciones:
  `engine/history.ts` (`buildHistoryEntry`, formateadores puros de D-21),
  `engine/statistics.ts` (agregación de D-23/D-24/D-26), `app/pages/historico.vue`,
  `app/pages/estadisticas.vue`, `app/components/GameOutcomeDialog.vue`. Los nombres
  exactos de las rutas (`/historico`, `/estadisticas`) son sugerencia.
- **La redacción exacta de los botones y rótulos**, dentro de lo que D-06 fija sobre las
  dos causas. La fase de UI (`/gsd:ui-phase 9`, «UI hint: yes» en el ROADMAP) es donde se
  cierra la tipografía y el espaciado dentro de la escala fija ya existente
  (`display 40 / heading 28 / body 20 / label 18`) — **ningún tamaño nuevo**.
- **El estado vacío de estadísticas** (STAT-05): debe existir y ser claro; espejo natural
  de D-22, con la coletilla de que las estadísticas aparecen al registrar la primera
  partida.
- **Cómo se genera el `id` de una entrada** (timestamp + sufijo aleatorio es suficiente;
  no hace falta `crypto.randomUUID`, que además exige contexto seguro).
- **Si hay tope de entradas guardadas.** No hay requisito y el volumen real es de decenas
  de partidas; si se pone, debe ser un número justificado por escrito, no un número
  redondo por si acaso.
- **Si el histórico se valida con Zod en un test de CI.** Atención: `zod` es
  Node/test-time y **nunca cruza a `app/`** (CLAUDE.md §Version Compatibility), así que la
  defensa en ejecución es a mano (D-13) y cualquier esquema Zod solo puede vivir en un
  test sobre una entrada construida a mano.
- **Si la entrada guarda los contadores finales de vida.** HIST-04 no los pide y ninguna
  pantalla los usaría; la recomendación es **no** guardarlos.
- **Cómo se muestra el aviso de D-03** (banda, línea en el inicio, otro mecanismo) y
  cuánto dura.
- **La supresión de atajos de teclado mientras el diálogo nuevo está abierto** se hereda
  de lo ya establecido (D-12 de la Fase 6, D-17 de la Fase 7): `useStepShortcuts` no debe
  actuar con un overlay abierto. No es una decisión nueva, es una trampa conocida que el
  plan debe verificar.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y alcance
- `.planning/REQUIREMENTS.md` §HIST (líneas 76-84) y §STAT (líneas 88-92) — los 14
  requisitos de esta fase. Y §«Requisitos diferidos» (líneas 120-128) — **STAT-06,
  STAT-07 y HIST-10 son la lista literal de lo que esta fase NO hace**.
- `.planning/ROADMAP.md` §«Phase 9» — los 5 criterios de éxito. El nº 5 («la pantalla lee
  exclusivamente localStorage, verificable de forma trivial porque Firestore ni siquiera
  existe todavía») es el que gobierna D-14.
- `.planning/ROADMAP.md` §«Recordatorio de alcance para las seis fases» — las cuatro
  tentaciones adyacentes ya excluidas.
- `.planning/PROJECT.md` §«Fuera de alcance» — exclusiones permanentes vigentes.

### Investigación del hito v1.8
- `.planning/research/ARCHITECTURE.md` §b («How does game history relate to session
  state?») — **la referencia principal de esta fase**: el punto de inserción exacto en
  `onEndGameConfirm`, el argumento de por qué `startedAt` va en `start()`, y por qué la
  escritura de localStorage extiende `usePersistedSession.ts` en vez de abrir un segundo
  fichero.
- `.planning/research/ARCHITECTURE.md` §g «Chunk 5» — el orden de construcción: las
  funciones puras (`buildHistoryEntry`, agregación) se pueden construir y testear contra
  una sesión de mentira **antes** de que exista una sola pantalla.
- `.planning/research/PITFALLS.md` §8 (doble fuente de verdad), §9 (precache de rutas
  nuevas: **directamente aplicable a D-16**), §14 (creep de alcance).
- `.planning/research/FEATURES.md` §d/§e (el conjunto mínimo de campos de un registro; la
  causa de derrota como diferenciador barato) y §«Open Questions» 11-17 — **las preguntas
  11 a 17 son literalmente las áreas que esta discusión ha cerrado**; consultarlas evita
  redescubrirlas.

### Contexto de fases anteriores que sigue vinculante
- `.planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-CONTEXT.md` —
  D-12 («—» ≠ 0, que D-10 hereda), D-16 (por qué «SIN VIDA» y no «DERROTADO», que D-06
  extiende), D-19 (campo aditivo sin bump de versión, que D-07 copia), D-17 (los overlays
  suprimen atajos).
- `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-CONTEXT.md` — D-15
  (nombre vacío → «Jugador N»), D-16 (héroe repetido se marca, no se bloquea — origen de
  la segunda mitad de D-26), D-19 (`selection` como campo aditivo), SEL-09 (elegir es
  opcional, origen de D-12).
- `.planning/phases/08-valores-conocidos-dentro-del-paso/08-CONTEXT.md` — D-02 (enum plano
  en vez de objeto con estados imposibles, el razonamiento de D-01) y D-07 (la clave del
  dato nombra el campo, no la etiqueta de pantalla — el razonamiento de D-06).
- `.planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md` — forma del catálogo y
  el hecho de que se regenera desde una API de terceros, que es lo que justifica D-11.
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTEXT.md` — D-32 (sin
  afordancia falsa: nada pulsable donde no hay acción), que D-19 aplica.

### Restricciones vigentes del proyecto
- `CLAUDE.md` §Constraints — offline, español, tablet apaisada legible a un brazo,
  fidelidad de reglas.
- `CLAUDE.md` §«Version Compatibility» — `zod` es Node/test-time y **nunca** cruza a
  `app/`.
- `CLAUDE.md` §«Hosting: Vercel» — las cabeceras viven en `nitro.routeRules`, no en
  configuración del host; **no** añadir `vercel.json`.

### Reglamento
- `reference/mc_rulesreference_v17-compressed.pdf` — fuera de control de versiones
  (`.gitignore`), consultar con `pdftotext`. **Los dos pasajes que gobiernan esta fase ya
  están extraídos y citados textualmente en D-06** («Winning the Game», p. 46, y
  «Eliminated»). **No hay ninguna otra regla que verificar en esta fase**: no se autora ni
  se reescribe ni un paso de contenido, así que D-36 (revisión humana bloqueante del texto
  de reglas) no aplica más allá de la redacción de las dos causas, ya contrastada.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`app/composables/usePersistedSession.ts`** — la **única** costura de `localStorage` de
  toda la app (lo declara su propia cabecera y la tabla de arquitectura de `CLAUDE.md`).
  Se **extiende**, no se duplica: una clave `tga:history` nueva y las funciones de lectura
  y escritura, reutilizando los helpers privados `readRaw`/`writeRaw`/`removeRaw`
  (líneas 76-105), que ya son SSR-safe, a prueba de modo privado/cuota y de JSON corrupto.
  Precedente exacto de una segunda clave independiente conviviendo en el mismo fichero:
  `VOICE_KEY` (D-46), que sobrevive a `clear(gameId)` — **el mismo requisito de
  supervivencia que HIST-09 exige al histórico**.
- **`app/components/ConfirmDialog.vue`** — componente tonto y genérico con
  `destructive: boolean`; ya es la única superficie destructiva de la app. D-20 lo
  reutiliza tal cual para el borrado.
- **`app/composables/useHeroSearch.ts`** → `resolvePlayerLabel(i, playerName)` — «Jugador
  N» cuando el nombre está vacío. Un solo sitio, ya testeado, reutilizado por la banda de
  la Fase 7 y por la lista de valores de la Fase 8; ahora también por la tarjeta de D-19.
- **`engine/selection.ts`** → `resolvePlayerSlots(context)` / `resolveVillainId(context)` —
  normalización defensiva ya escrita: longitud derivada de `playerCount`, validación por
  tipo, nunca lanza. Es de donde `buildHistoryEntry` debe leer la selección, no de
  `context.selection` en crudo.
- **`app/composables/useCharacterCatalogue.ts`** y `app/data/spanish-hero-aliases.ts` — de
  donde salen los nombres que D-11 congela (el **alias español**, no el inglés).
- **`engine/header.ts`** → `describeHeader` — el precedente de «una función pura del motor
  que devuelve cadenas ya listas para pintar». D-21 lo imita para fecha y duración.

### Established Patterns
- **Componentes tontos**: ningún componente importa `~~/engine/*`. Si una pantalla
  necesita algo del motor, falta una computed en el composable
  (`app/composables/useGameSession.ts` es la única costura reactiva).
- **Funciones puras del motor con test propio** — `selection.ts`, `counters.ts`,
  `header.ts`, `toc.ts`, `stepValues.ts` tienen todas su `engine/__tests__/*.test.ts`. Lo
  nuevo de esta fase también debe tenerlo, y **se puede testear entero contra una sesión y
  un histórico construidos a mano, sin UI y sin navegador**.
- **Mutación por reasignación, nunca in situ** — el motor devuelve objetos nuevos y el
  composable reasigna el ref (D-20 de la Fase 7, `engine/selection.ts`). Añadir o borrar
  una entrada del histórico devuelve un array nuevo.
- **Interpolación siempre, HTML crudo nunca** (T-01-01).
- **Escala tipográfica fija** en `app/assets/css/main.css`
  (`display 40 / heading 28 / body 20 / label 18`) — **ningún tamaño nuevo**.
- **Un dato ilegible se trata como ausencia, nunca como error** (`isPersistedPosition`,
  `normalizeVoicePreference`) — es el criterio que D-13 extiende al histórico.

### Integration Points
- **`app/pages/[game]/index.vue:510-531`** (`onEndGameConfirm`) — **el punto de enganche
  de toda la fase**. El orden actual es explícitamente «exacto, no cosmético» (D-U4):
  `awaitingEndConfirm = false` → `isIndexOpen = false` → `silence()` →
  `session.value = null` → `clear(gameId)` → `navigateTo('/')`. El diálogo de D-01 se
  inserta **después de `silence()` y antes de `session.value = null`**, porque los pasos 4
  y 5 destruyen exactamente los datos que la entrada necesita. Los pasos 4-6 se ejecutan
  después, **sin cambiar una línea**.
- **`app/components/IndexOverlay.vue:139-152`** — el botón «Partida terminada» que emite
  `end-game`. No cambia.
- **`engine/types.ts`** — `SessionContext` gana `startedAt?: number` (o ISO string, a
  discreción). Este fichero **lo importa `app/`**, así que nada de `zod` aquí. Aquí vive
  también el tipo de la entrada del histórico, sin `zod`, por el mismo motivo (precedente:
  `CatalogueHero`/`CatalogueVillain`, DC-03 de la Fase 5).
- **`app/composables/useGameSession.ts:129-132`** (`start()`) — el único sitio donde se
  fija `startedAt` (D-07).
- **`nuxt.config.ts`** → `nitro.prerender.routes` — **hay que añadir las dos rutas
  nuevas** (D-16). `routeRules` y el bloque `pwa`/`workbox` **no** necesitan cambios: el
  `globPatterns` ya cubre `**/*.{js,css,html}`. Comprobarlo sobre una build real, no
  suponerlo.
- **`app/components/GameSelectorScreen.vue`** — gana los dos accesos de D-17. Es un
  componente tonto con la lista de juegos por prop: los accesos nuevos son emits o enlaces
  nuevos, sin que el componente mencione ningún juego concreto (TECH-04).
- **`engine/persistence.ts`** — **NO se toca.** `toPersistedPosition` ya persiste
  `context` entero y `resume()` ya lo restaura entero, así que `startedAt` viaja gratis
  (D-07).
- **`content/marvel-champions.json`, `content/marvel-characters.json`, `public/audio/*`,
  `scripts/voice/manifest.json`, `engine/__tests__/voice-drift.test.ts`** — **nada de esto
  se toca.** Esta fase no autora contenido, no cambia `contentVersion` (sigue en 14) y no
  regenera ni un clip de voz.

</code_context>

<specifics>
## Specific Ideas

- **Las cuatro maquetas ASCII de D-01, D-19 y D-23** son la descripción más concreta que
  existe del diálogo, la tarjeta y la tabla, y son las que el usuario vio al elegir esas
  opciones frente a las alternativas (dos pasos vs un paso; tarjeta vs fila con modal;
  solo jugados vs los 23). Trátense como el contrato visual de partida, no como adorno.
- **D-06 no salió de una preferencia sino de abrir el PDF durante la discusión** — igual
  que D-05/D-06 de la Fase 8. «Winning the Game» (p. 46) y «Eliminated» están citados
  textualmente en la decisión para que nadie tenga que volver a abrirlo. Sin esa lectura,
  la app habría dicho «todos los héroes derrotados», contradiciendo tanto el reglamento
  como la palabra que la Fase 7 eligió con cuidado.
- **La decisión con más consecuencias estructurales es D-03**, y no se tomó por estética:
  salió de mirar `writeRaw()` y ver que falla en silencio por diseño. Es la única de las
  26 que cambia una firma de función (`appendHistoryEntry` no puede ser `void`).
- **D-08 se decidió con un hecho del grupo, no del código:** este grupo siempre termina
  de una sentada lo que empieza, y eso es lo que hace aceptable un reloj de pared sin
  ninguna protección. Si ese hábito cambiara, D-08 es la primera decisión a revisar.

</specifics>

<deferred>
## Deferred Ideas

- **% de victorias por jugador y rachas** (STAT-06) — diferido con requisito propio. La
  entrada de D-11 guarda `playerName`, así que **el dato estará ahí desde el primer día** y
  la tentación de «ya que está…» será literal. Reconócela y decline en el momento:
  `PITFALLS.md` §14.
- **Desglose por dificultad** (STAT-07) — ídem: la entrada guarda `difficulty` y ninguna
  pantalla la cruza con nada en esta fase.
- **Editar una entrada ya registrada** (HIST-10) — diferido. Es la razón por la que D-11
  congela los nombres: una entrada equivocada no se puede arreglar, solo borrar.
- **Un tercer resultado «no terminada»** que `FEATURES.md` §e recomendaba como
  diferenciador — **descartado, no diferido**: HIST-02 fija dos resultados y una salida sin
  registrar, y «Salir sin registrar» cubre el caso.
- **Registrar también la partida que se descarta** desde «Empezar partida nueva» (D-05) —
  sin requisito. Reconsiderable solo si en uso real el grupo echa de menos ese registro,
  con partidas encima y no por anticipado.
- **Total general de victorias del grupo**, gráficas, exportar el histórico, filtros por
  fecha — nada tiene requisito en ningún hito. Anotado para que no se cuele como «lo que
  faltaba».
- **Un tope de duración de cordura** (la alternativa de D-08) — anotado como el arreglo
  concreto si alguna vez aparece un «19 h 04 min» en el histórico.
- **Corregir el «37 clips» de `PROJECT.md`, del archivo de v1.7 y del criterio de éxito
  nº 5 del ROADMAP de la Fase 8** (el recuento real y verificado es **35**) — pendiente
  desde la Fase 6, sigue fuera de esta fase. Candidato claro a `/gsd:quick`.
- **`cr-03-experto-sustitucion-cartas-rhino-ultron`**
  (`.planning/todos/pending/`) — el todo abierto más grave del proyecto (en Experto, la app
  manda sustituir cartas que no existen para Rhino y Ultron). **Revisado y NO plegado a
  esta fase**: es contenido autorado y fidelidad de reglas, sin relación con el histórico.
  Sigue esperando su propio quick o fase.
- **Contador de amenaza, fichas de estado, editor de catálogo** — exclusiones
  **permanentes** de `PROJECT.md`, no diferidos.

</deferred>

---

*Phase: 9-Histórico y estadísticas*
*Context gathered: 2026-09-09*
