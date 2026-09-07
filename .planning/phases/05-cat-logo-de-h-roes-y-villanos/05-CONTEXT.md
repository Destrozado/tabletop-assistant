# Phase 5: Catálogo de héroes y villanos - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Phase Boundary

El repo gana un fichero de datos versionado con **nombres y cifras** de los héroes
y villanos que el grupo tiene en casa, generado por un script re-ejecutable contra
la API pública de MarvelCDB, validado por Zod en un test de Vitest que corre en CI,
e importado estáticamente para que viaje dentro del bundle y nunca se pida por red.

**En alcance:** el fichero de catálogo commiteado, su esquema Zod y su test de CI,
el script de generación con su documentación de uso, y el guardarraíl que impide
que entre texto de carta o referencia a arte.

**Fuera de alcance — todo lo visual y todo lo que consume el catálogo:**
- Selectores, modales y filtro de búsqueda → **Fase 6**
- Banda de contadores y precarga de valores → **Fase 7**
- El número entre paréntesis dentro del paso → **Fase 8**

Esta fase no toca `content/marvel-champions.json`, ni el motor, ni ningún componente
de `app/`. Su entregable es dato + validación + procedimiento, nada más.

**Corrección de requisitos detectada en esta discusión (acción pendiente, no
aplicada desde aquí):** `CAT-01` y el criterio de éxito nº 1 del `ROADMAP.md` dicen
**18 héroes**. El grupo tiene **23** (los 18 de packs sueltos más los 5 del Core Set;
el usuario lo confirmó explícitamente al revisarse la lista). El recuento de villanos
sí es correcto: 3. Hay que corregir ambos ficheros antes de planificar, o el criterio
de éxito quedará imposible de cumplir tal como está escrito.

</domain>

<decisions>
## Implementation Decisions

### Qué entra en el catálogo

- **D-01:** El catálogo contiene **solo lo que el grupo tiene en casa: 23 héroes y
  3 villanos**, no todo lo que MarvelCDB conozca. Motivo: el selector de la Fase 6
  debe mostrar exactamente lo jugable — nadie debe poder elegir un héroe que no está
  en la mesa. Se acepta el coste conocido: comprar una caja obliga a añadir una fila
  al script, re-ejecutarlo y commitear el diff. **Descartado** meter los ~60 héroes
  de MarvelCDB y filtrar en la app: exigiría una pantalla de "qué cajas tengo" que
  no está en el alcance de v1.8 y engordaría el bundle sin beneficio en mesa.

- **D-02:** **Villanos (3):** Rhino, Kang, Ultron. **Klaw queda fuera a propósito**
  aunque venga en el Core Set — el grupo no lo juega. Que el catálogo tenga menos
  villanos que el Core Set es intencional, no un fallo de extracción; ningún test
  debe "corregirlo".

- **D-03:** **Héroes (23):**
  - Del Core Set (5): Spider-Man, Captain Marvel, She-Hulk, Iron Man, Black Panther.
  - De packs sueltos (18): Captain America, Ms. Marvel, Thor, Black Widow,
    Doctor Strange, Hulk, Ant-Man, Wasp, Quicksilver, Scarlet Witch, Drax,
    Valkyrie, Vision, Nova, Storm, Deadpool, Iceman, Jubilee.

  Los nombres los dictó el usuario en la discusión; **los códigos de carta de
  MarvelCDB están sin resolver** y son trabajo de la fase de research/planificación
  (resolverlos contra `GET /api/public/packs/` y los endpoints de pack).

- **D-04:** Qué entra se declara como una **lista explícita de ids de carta al
  principio del script**. Un héroe = una fila. Motivo: es la lectura literal de
  CAT-07 ("una sola fila"), da control exacto y produce diffs legibles.
  **Descartado** declarar códigos de pack y barrer sus héroes: un pack con dos
  héroes o con cartas atípicas entraría entero sin que nadie lo decida.
  **Descartado** un fichero de datos aparte con la lista: ceremonia innecesaria
  para 26 filas, y el script dejaría de ser autocontenido.

### Comportamiento ante fallo del script

- **D-05:** Si un id de la lista **no aparece** en MarvelCDB (id mal escrito, carta
  retirada, API cambiada), el script **aborta sin escribir nada** e informa de cuál
  falta. Motivo: es el mismo principio de "fail loudly at build" del gate de esquema.
  Un catálogo escrito a medias con 22 héroes **pasaría el esquema Zod sin protestar**
  y el héroe desaparecería del selector en silencio. **Descartado** escribir lo
  encontrado con un aviso por consola, por esa misma razón.
  **Descartado también** fijar el recuento exacto (23+3) dentro del test de Vitest:
  endurece de más y convertiría "comprar una caja" en tocar el test además de la
  lista, contra el espíritu de CAT-07.

- **D-06:** **Kang recibe el mismo trato.** Su escenario tiene una estructura de
  etapas distinta a la de Rhino/Ultron; si el script no consigue mapear sus etapas
  limpiamente, **aborta** en vez de escribir a Kang parcial. Motivo: la decisión se
  toma con los datos de la API delante en tiempo de desarrollo, no en mesa a mitad
  de partida.

### Nombres e idioma

- **D-07:** El catálogo guarda **únicamente el nombre de MarvelCDB, en inglés, tal
  cual, en una sola columna** — sin etiqueta traducida. Se toma **sabiendo que las
  cartas físicas del grupo están en español** ("Hulka", "Bruja Escarlata",
  "Capitán América"), y aceptando conscientemente esa fricción de traducción mental
  en mesa. Motivo: mantiene el script 100% reproducible y "añadir un héroe" en una
  sola fila; una segunda columna a mano obligaría al script a preservar contenido
  escrito por humanos, que es exactamente lo que D-09 descarta.
  **Descartado** guardar solo el nombre español a mano: rompe CAT-03 (el catálogo
  dejaría de ser regenerable).

- **D-08:** Atenuante registrado, no trabajo de esta fase: **los nombres de alter ego
  no se traducen** (Peter Parker, Carol Danvers, T'Challa, Jennifer Walters), así que
  el filtro por alter ego de SEL-05 seguirá encontrando lo que el grupo tiene en la
  mano aunque las cartas estén en español. La fricción se limita a los nombres de
  héroe. Ver `<deferred>` para la idea de alias en español en la Fase 6.

### Corrección de cifras y reproducibilidad

- **D-09:** **No hay capa de overrides y nadie edita el JSON a mano, nunca.** Un
  número equivocado significa que la **regla de extracción** está mal, y se corrige
  en el script. El JSON commiteado es 100% derivado. Motivo: cualquier corrección
  fuera del script la pisa la siguiente ejecución en silencio, que es justo el fallo
  que CAT-03 y CAT-07 existen para evitar.

  **Caso concreto que esta decisión obliga a resolver bien:** el `hand_size` correcto
  vive en la carta de **alter ego** (`linked_card`), no en la de héroe — la de héroe
  lleva un modificador de habilidad que casualmente usa el mismo nombre de campo
  (Iron Man expone `hand_size: 1`, que es "+1 por mejora Tech"; Tony Stark expone el
  6 real). El script debe leer el `linked_card`.

  **Corrección (gap CR-01 de 05-VERIFICATION.md):** la premisa fáctica del "caso
  concreto" de arriba —que el `hand_size` del lado héroe sería un modificador de
  habilidad y no un tamaño de mano real— quedó refutada contra el Rules Reference
  v1.7 (Apéndice III, anatomía de carta, punto 14; y la entrada "HAND SIZE"). El
  ejemplo impreso de Spider-Man trae `HAND SIZE 5` en la cara de héroe y
  `HAND SIZE 6` en la cara de alter ego: los dos son valores reales y distintos, no
  uno "correcto" y otro descartable. El catálogo pasa a guardar los dos como
  `handSizeHero` y `handSizeAlterEgo`. La decisión D-09 en sí sigue vigente y sin
  cambios: el fix se aplicó en el script y se regeneró el fichero, que es
  literalmente el procedimiento que D-09 exige.

- **D-10:** El fichero es **determinista puro: sin `generatedAt` ni ninguna marca
  temporal**. Re-ejecutar el script sin cambios en MarvelCDB debe dejar `git diff`
  **vacío**. Motivo: eso hace la reproducibilidad del criterio de éxito nº 3
  *comprobable* en vez de meramente afirmada; la fecha de generación ya la guarda el
  commit. **Descartado explícitamente** el patrón de `scripts/voice/manifest.json`
  (que sí lleva `generatedAt`), y descartada también la variante "sin fecha pero con
  versión de packs": no aporta lo suficiente frente a documentar los endpoints en la
  cabecera del script.

### Vida de villano

- **D-11:** La vida del villano se guarda **por etapa, como base + banderas, tal como
  la da la API**: `{ health, healthPerHero, healthPerGroup }`. La multiplicación por
  nº de jugadores (14 × 3) la hace la app en la **Fase 7**, en un solo sitio y con
  test. Motivo: es la proyección fiel y mínima de la fuente, y cubre el caso raro de
  escalado por grupo sin inventar nada.
  **Descartado** precomputar la tabla `healthByStage[etapa][jugadores]`: son ~36
  números derivados por villano y un cambio de base produce un diff ilegible.
  **Descartado** guardar ambas cosas: dos representaciones del mismo hecho que pueden
  divergir sin que nadie lo note.

  **Nota para el planner sobre el criterio de éxito nº 2 del roadmap** ("modelada por
  etapa y por nº de jugadores desde el principio, no una cifra plana"): base + banderas
  **sí lo satisface**. Lo que ese criterio (y el Pitfall 10) prohíben es un
  `villainHealth: number` único que solo sirve para un nº de jugadores y una etapa;
  `{health, healthPerHero, healthPerGroup}` **por etapa** modela ambas dimensiones sin
  materializar la tabla. No reabrir esta disyuntiva.

  Detalle de la API ya verificado por la investigación: la etapa llega como numeral
  romano en string (`"stage": "I" | "II" | "III"`), no como entero — hay que mapearla
  explícitamente.

### Claude's Discretion

El usuario no quiso discutir estas y quedan a criterio de research/planning, siempre
que respeten las decisiones de arriba:

- **Nombre y ubicación del fichero** (la investigación propone
  `content/marvel-characters.json`, mismo escalón que `content/marvel-champions.json`).
- **Un fichero o dos** (héroes y villanos juntos vs. separados).
- **Nombre y ubicación del script** (la investigación propone
  `scripts/catalogue/` o `scripts/marvelcdb/`, siguiendo `scripts/voice/`).
- **Qué cifras de héroe entran además de vida y tamaño de mano** — CAT-01 exige
  nombre de héroe, nombre de alter ego, vida y tamaño de mano como mínimo; añadir
  algo más (p. ej. aspecto) solo si la Fase 6/7/8 lo necesita de verdad, no "por si
  acaso" (contradiría D-01 y la disciplina de lista blanca de CAT-04).
- **Forma exacta del guardarraíl anti-copyright de CAT-04** (proyección de lista
  blanca en el script + algún test que rechace claves como `text`, `flavor`,
  `imagesrc`). Que exista no es discrecional; su forma sí.
- **Estructura del esquema Zod** — la investigación propone un segundo fichero
  (`engine/catalogueSchema.ts`) en vez de ampliar `engine/schema.ts`.
- **Cómo se documenta el procedimiento de CAT-03/CAT-07** (cabecera del script,
  entrada en `package.json`, o ambas — `scripts/voice/generate.mjs` es el precedente).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Investigación del hito v1.8
- `.planning/research/ARCHITECTURE.md` §d "Where does the hero/villain catalogue
  live?" — ubicación del fichero, esquema y test propuestos, composable de acceso, y
  la **advertencia explícita** de que la cabecera de `engine/schema.ts` ("único
  fichero del repo que importa zod") se vuelve falsa al añadir un segundo esquema y
  debe actualizarse.
- `.planning/research/STACK.md` §c "MarvelCDB data extraction" — endpoints públicos
  verificados en vivo (`/api/public/cards/{pack_code}.json`,
  `/api/public/card/{code}.json`, `/api/public/packs/`), ausencia de clave de API, y
  el detalle de codificación de vida (`health` + `health_per_hero` /
  `health_per_group`), etapa romana, y la trampa del `hand_size` del `linked_card`.
- `.planning/research/PITFALLS.md` Pitfall 10 (vida plana), Pitfall 11 (scrape
  irreproducible sin camino para el héroe siguiente), Pitfall 12 (arrastrar texto de
  carta o arte al repo público), Pitfall 14 (creep de alcance — en particular:
  **ninguna pantalla de la app debe poder editar el catálogo**).
- `.planning/research/SUMMARY.md` — síntesis y niveles de confianza.

### Requisitos y alcance
- `.planning/REQUIREMENTS.md` §CAT — CAT-01..CAT-07. **Ojo: CAT-01 dice 18 héroes y
  son 23** (ver `<domain>`).
- `.planning/ROADMAP.md` §"Phase 5" — criterios de éxito. **Mismo error de recuento en
  el criterio nº 1.** El §"Recordatorio de alcance para las seis fases" aplica
  directamente aquí: el catálogo es dato versionado que regenera un script.
- `.planning/PROJECT.md:35` y `:121` — la decisión de origen (MarvelCDB, solo nombres
  y cifras, procedimiento documentado en el repo) y su justificación.

### Restricciones vigentes del proyecto
- `CLAUDE.md` §Constraints — restricción legal (no se reproducen cartas, arte ni
  textos extensos con copyright), offline, sin backend.
- `CLAUDE.md` §"Version Compatibility" — `zod@4.4.3` solo en Node/Vitest, nunca en el
  bundle del navegador.

### Contexto de fases anteriores que sigue vinculante
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTEXT.md` — D-36
  (revisión humana del contenido). **No aplica a las cifras de este catálogo**: el
  roadmap decidió explícitamente que un valor de vida equivocado se corrige con las
  flechas en mesa. Sí aplica su espíritu a la *forma* del esquema (Pitfall 10).
- `.planning/phases/04-instalaci-n-y-funcionamiento-offline/04-CONTEXT.md` — la
  configuración de Workbox vigente.

### Reglamento
- `reference/mc_rulesreference_v17-compressed.pdf` — **fuera de control de versiones**
  (`.gitignore`), consultar con `pdftotext`. Relevante aquí **solo** para contrastar
  la *forma* del modelo de vida de villano por etapa y por jugadores (comprobación
  estructural única, no revisión número a número).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/voice/generate.mjs`: el patrón de referencia para el script de catálogo —
  `.mjs` plano sin dependencias nuevas (Node 18+ trae `fetch` global), invocado a
  mano vía `package.json`, con una cabecera larga que explica sus restricciones. Su
  D-06 ("este script NUNCA se invoca desde `build`, `generate` ni CI") **se hereda
  tal cual**: el script de catálogo tampoco corre en Vercel ni en CI.
- `engine/schema.ts`: el patrón del esquema Zod, incluida la decisión CR-01 de usar
  `z.strictObject` en **todos** los objetos (una clave desconocida lanza, no se
  descarta en silencio). Esa disciplina es justo el guardarraíl que CAT-04 necesita
  contra `text`/`flavor`/`imagesrc`.
- `engine/__tests__/content.test.ts` y `schema.test.ts`: el patrón del test de CI que
  falla la build si el contenido está malformado.
- `app/composables/useGameContent.ts`: el patrón de import estático del JSON, con la
  cabecera que documenta por qué no puede haber red en ejecución (Anti-Patrón 3) y
  por qué no importa `~~/engine/schema`.
- `content/games-index.ts`: precedente de dato tipado por juego viviendo en `content/`.

### Established Patterns
- **Zod nunca cruza a `app/`** (T-01-19): es devDependency y solo corre en Node/CI.
  El navegador consume el JSON crudo, no el objeto validado — por eso `strictObject`
  es lo que hace honesta la puerta de build.
- **Contenido estático importado en build**, cero red en ejecución.
- **Scripts de generación invocados a mano**, nunca desde el build de despliegue (D-06
  de la Fase 3.1) — meter una llamada de red al build rompería "sin backend".
- **Datos por juego, no abstracción genérica anticipada**: `ARCHITECTURE.md` §d
  recomienda explícitamente mantener el vocabulario Marvel (`heroes`/`villains`) en vez
  de inventar un `characters[]` genérico para un Warhammer 40.000 cuya forma real aún
  no está diseñada. El propio `GameDefinitionSchema` creció así, campo a campo.

### Integration Points
- **Ninguno en esta fase.** El catálogo no se consume todavía: la Fase 6 (selectores),
  la 7 (contadores) y la 8 (paréntesis) son sus tres consumidores. Esta fase entrega
  el dato y su validación, y ahí se detiene.
- **Workbox no necesita nada nuevo:** al importarse estáticamente, el catálogo viaja
  dentro de un chunk JS y ya lo cubre el `globPatterns` existente de
  `nuxt.config.ts` — a diferencia de los `.m4a`, que sí necesitaron su propio patrón
  por ser ficheros sueltos en `public/`.
- **`engine/schema.ts:1-4`** afirma ser el único fichero del repo que importa `zod`.
  Añadir un segundo esquema hace falsa esa cabecera y **hay que actualizarla en el
  mismo cambio**.

</code_context>

<specifics>
## Specific Ideas

- La lista de héroes y villanos la dictó el usuario textualmente en la discusión; está
  transcrita en D-02 y D-03 y es la **única** fuente de esa lista — no existe en
  ningún otro sitio del repo. Si un agente posterior necesita confirmarla, es aquí.
- El usuario confirmó al ser preguntado que los 5 héroes del Core Set faltaban de su
  primera lista; el recuento correcto (23) sale de esa corrección, no de una inferencia.
- La exclusión de Klaw es deliberada y del usuario, no una omisión.

</specifics>

<deferred>
## Deferred Ideas

- **Alias en español para el filtro de héroes** — como las cartas del grupo están en
  español pero el catálogo guarda nombres ingleses (D-07/D-08), buscar "Hulka" en el
  selector no encontrará nada. Idea para la **Fase 6**, y solo si molesta de verdad en
  mesa: un mapa de alias vivo en la capa de UI (no en el catálogo, que debe seguir
  siendo 100% derivado del script). No se toma ninguna decisión sobre ella ahora.
- **Que el catálogo tenga todos los héroes de MarvelCDB con una pantalla de "qué cajas
  tengo"** — descartado por D-01 para v1.8. Reconsiderable en un hito posterior si la
  colección crece hasta hacer molesto el ciclo "comprar caja → editar script → commit".
- **Cualquier UI para añadir o editar héroes desde la app** — sigue explícitamente
  fuera de alcance (Pitfall 14 y la exclusión permanente "editor de juegos desde la
  web" de `PROJECT.md`). Anotado aquí para que se reconozca y se rechace en el momento,
  no se redescubra.

</deferred>

---

*Phase: 5-Catálogo de héroes y villanos*
*Context gathered: 2026-09-07*
