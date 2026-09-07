# Phase 6: Selección de villano, héroes y jugadores - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

El paso `setup.heroes.01` («Decidid, como grupo, qué villano vais a enfrentar y qué
héroe llevará cada jugador») gana una **rejilla de selección** debajo de su texto:
una fila para el villano y una fila por jugador (tantas como el nº elegido en el
mini-setup). Cada fila abre un modal donde se elige el personaje del catálogo de la
Fase 5, y la fila de jugador permite además editar su nombre. La selección se guarda
dentro de la sesión en curso y sobrevive a recargar la página. Elegir es **opcional**
de principio a fin.

**En alcance:** la rejilla, los dos modales (villano y jugador), el filtro de texto
del modal de héroes con sus alias en español, el nombre de jugador, la marca de héroe
repetido, y la persistencia de todo ello dentro de `SessionContext`.

**Fuera de alcance — lo que consume esta selección:**
- Banda de contadores de vida y precarga de valores → **Fase 7**
- El número entre paréntesis dentro del texto del paso → **Fase 8**
- Registro de la partida en el histórico → **Fase 9**
- Cierre formal de la compatibilidad con partidas guardadas por v1.7 (COMP-01/02) →
  **Fase 7**

Esta fase no toca ningún campo `text` ni `speech` de ningún paso, ni ninguno de los
37 clips de voz pregenerada. Tampoco toca el catálogo (`content/marvel-characters.json`),
que es dato 100% derivado del script (D-09 de la Fase 5) y que ninguna pantalla puede
editar (Pitfall 14).

**Escenario y conjuntos modulares (CONF-02/03) siguen diferidos** a un hito posterior:
aquí se elige villano y héroe, nada más.

</domain>

<decisions>
## Implementation Decisions

Numeración local de la fase (las Fases 4 y 5 también reiniciaron en D-01).

### Anatomía del paso con selectores

- **D-01:** Los selectores viven **dentro del propio paso**, en una rejilla bajo la
  frase grande, **reutilizando el patrón `options[]` que `StepScreen.vue` ya tiene**
  desde la Fase 2 (botones con `›` a la derecha que abren un modal). Es la lectura
  literal de SEL-01/SEL-03 («en el paso … hay un selector»).
  **Descartado** un único botón «Elegir personajes» que abriera un overlay a pantalla
  completa (estilo `IndexOverlay`, D-13): cuesta un toque más por cada cambio y
  esconde el estado de la selección.
  **Descartado** convertir el paso entero en una pantalla de configuración: rompería
  la uniformidad «todo paso se ve igual» y degradaría el texto de dominante a
  encabezado.

  Maqueta acordada (3 jugadores):

  ```
  ┌──────────────────────────────────┐
  │  HÉROES · 3 de 21     3 jug ≡    │
  ├──────────────────────────────────┤
  │   Decidid, como grupo, qué       │
  │   villano vais a enfrentar y     │
  │   qué héroe llevará cada         │
  │   jugador.                       │
  │                                  │
  │   ELECCIÓN                       │
  │   Villano      —              ›  │
  │   Jugador 1    —              ›  │
  │   Jugador 2    —              ›  │
  │   Jugador 3    —              ›  │
  ├──────────────────────────────────┤
  │  ‹ ATRÁS            SIGUIENTE ›  │
  └──────────────────────────────────┘
  ```

  Una vez puestos los nombres, la etiqueta de cada fila de jugador es su nombre
  («Ana», «Bruno»), no «Jugador 1».

- **D-02:** Qué paso pinta la rejilla se declara **en los datos**, con una clave
  opcional nueva en el esquema del paso (la investigación/planificación fija su
  nombre exacto; `selection: 'characters'` es la propuesta de trabajo), declarada en
  `setup.heroes.01`. **Prohibido** cablear el id `setup.heroes.01` en la capa de
  `app/`: contradice TECH-04 y la disciplina que D-24 ya impuso al índice de salto
  («derivarse de los datos, nunca cablearse contra el id `ronda`»).
  **Consecuencia que el planner debe verificar explícitamente:** este cambio toca
  `content/marvel-champions.json` y `engine/schema.ts`, pero **ni un carácter de
  ningún `text` ni `speech`** — el gate de deriva de voz
  (`engine/__tests__/voice-drift.test.ts`) debe seguir verde sin regenerar ni un clip,
  igual que exige el criterio nº 5 de la Fase 8.

- **D-03 (SEL-09, criterio de éxito nº 5):** La rejilla **se ve siempre**, con «—» en
  los huecos vacíos, y **`SIGUIENTE` avanza sin aviso, sin bloqueo y sin
  confirmación** aunque no se haya elegido nada. Elegir es una oferta visible, no una
  exigencia, y así es descubrible sin explicación.
  **Descartado** atenuar las filas vacías (un estado visual más que diseñar y probar)
  y **descartado** un botón que despliegue la rejilla (un toque más y un estado
  plegado/desplegado que persistir o recalcular).
  **Nota de interpretación para el verificador:** el criterio nº 5 dice «sin ningún
  hueco ni exigencia nueva». Se interpreta como **ninguna exigencia de comportamiento**
  — la app no pide nada, no bloquea nada y no avisa de nada. Las filas con «—» son
  visibles a propósito y no cuentan como incumplimiento.

- **D-04 (presupuesto de espacio, contra Pitfall 4):** El texto del paso **se mantiene
  a `text-display` sin excepción**; si con 4 jugadores la rejilla no cabe, es el área
  del paso la que hace scroll (`overflow-y-auto` ya existe en `StepScreen.vue`).
  **Descartado** reducir la tipografía solo en este paso: sería la primera excepción
  tipográfica de la app y erosiona justo lo que la app existe para hacer.
  **Descartado** comprimir la rejilla a dos columnas por defecto (deja las filas
  demasiado estrechas para el nombre del héroe); si la planificación quiere usar la
  segunda columna como mejora, puede, pero nunca a costa de D-04.

### Filtro, nombres en español y orden de la lista

- **D-05:** Se añade un **mapa de alias en español** (los ~23 nombres de héroe tal
  como aparecen en las cartas físicas del grupo). Vive **en la capa de UI**, nunca en
  `content/marvel-characters.json`, que sigue siendo 100% derivado del script (D-09 de
  la Fase 5). Esto **resuelve la idea que la Fase 5 dejó explícitamente aparcada para
  aquí** (`<deferred>` de `05-CONTEXT.md`), y la resuelve en su versión fuerte: los
  alias son **visibles y buscables**, no solo buscables, porque el problema real no es
  la búsqueda sino **el reconocimiento al hojear** (en la lista se leería *Scarlet
  Witch*, *Iceman*, *Wasp* y no *Bruja Escarlata*, *Hombre de Hielo*, *Avispa*).
  **Un héroe sin alias cae al nombre inglés y nunca falla** — la ausencia de una
  entrada no puede romper la lista ni el filtro.

- **D-06:** El nombre **español es el dominante** de cada fila; el nombre inglés del
  catálogo y el alter ego van debajo, en secundario. La lista se ordena
  **alfabéticamente por el nombre español**, que es el que se lee primero y por tanto
  el único que hace escaneable una lista de 23.

  ```
  ┌──────────────────────────────────┐
  │  Buscar héroe…                 ✕ │
  ├──────────────────────────────────┤
  │  Antman                          │
  │  Ant-Man · Scott Lang            │
  │                                  │
  │  Avispa                          │
  │  Wasp · Janet van Dyne           │
  │                                  │
  │  Bruja Escarlata                 │
  │  Scarlet Witch · Wanda Maximoff  │
  └──────────────────────────────────┘
  ```

- **D-07 (revisión humana bloqueante, dispositivo D-36):** Los alias los **propone
  Claude** y el **usuario los revisa contra las cartas físicas antes de darlos por
  buenos**. El plan debe llevar esa tarea de revisión de forma **explícita**, no como
  paso implícito — mismo mecanismo que la Fase 2 aplicó al contenido de la ronda,
  porque un alias es contenido escrito a mano y no derivado. Es un caso más suave que
  D-36 (un alias equivocado solo cuesta una búsqueda fallida, no una regla mal
  guiada), pero el dispositivo es el mismo.

- **D-08 (SEL-05):** El filtro busca simultáneamente por **nombre español, nombre
  inglés y alter ego**, insensible a mayúsculas y a acentos. SEL-05 solo exige los dos
  últimos; el español entra porque D-05 lo hace visible y sería incoherente mostrarlo
  y no poder buscarlo.

- **D-09:** El campo de filtro **no toma el foco al abrir el modal**: la lista se ve
  entera y el teclado de la tablet no aparece hasta que alguien toca el campo.
  Coherente con el entorno del proyecto (manos ocupadas, mirada a un brazo): lo normal
  aquí es reconocer y tocar, no teclear.

- **D-10:** El **modal de villano no lleva filtro** — son 3 entradas. Si villano y
  héroe comparten componente, el buscador es una opción de ese componente, no un
  elemento fijo.

### Nombre de jugador y teclado

- **D-11:** El nombre se edita **dentro del mismo modal del héroe**: campo de nombre
  arriba, buscador y lista de héroes debajo. Un solo toque en la fila resuelve las dos
  cosas en la misma visita.
  **Descartado** editar el nombre inline en la fila de la rejilla: metería un campo de
  texto en la pantalla del paso y pondría dos objetivos táctiles pequeños en una fila
  que se usa a un brazo de distancia.
  **Descartado** un modal propio solo para el nombre: más toques y más superficie sin
  ganancia.

  ```
  ┌──────────────────────────────────┐
  │  JUGADOR 1                     ✕ │
  ├──────────────────────────────────┤
  │  Nombre                          │
  │  ┌────────────────────────────┐  │
  │  │ Jugador 1                  │  │
  │  └────────────────────────────┘  │
  │                                  │
  │  Héroe                           │
  │  ┌────────────────────────────┐  │
  │  │ Buscar héroe…              │  │
  │  └────────────────────────────┘  │
  │   Sin elegir                     │
  │   Antman · Ant-Man               │
  │   Avispa · Wasp                  │
  └──────────────────────────────────┘
  ```

- **D-12 (trampa concreta, verificar en el plan):** `useStepShortcuts` está activo
  durante la partida y **Espacio/Enter avanzan el paso** (quick 260831-g2s). Un campo
  de texto haría que escribir «Bruno» avanzase la preparación en cada espacio.
  `shortcutsEnabled` (`app/composables/useStepShortcuts.ts`, función pura ya testeada)
  ya se apaga cuando hay un modal abierto vía la bandera `hasActiveDetail`; **D-11 se
  eligió en parte por esto**, porque el campo nace protegido dentro de un modal.
  El plan debe **verificar explícitamente** que el modal de jugador entra en esa misma
  condición (bandera nueva o reutilizada, decisión de research/planning) y llevar un
  test de que escribir en el campo no avanza el paso. **D-Q2 sigue vigente:** la
  condición vive por completo en la función pura, nunca reimplementada en línea.

- **D-13:** **Todo se guarda al instante y cerrar es cerrar.** Escribir el nombre lo
  guarda según se escribe; tocar un héroe lo guarda y **cierra el modal**. Las tres
  vías de cierre (Escape, tocar el velo, `✕`) hacen exactamente lo mismo, porque no
  hay nada que confirmar ni que descartar.
  **Descartado** un botón «Listo» explícito: añade un toque y obliga a decidir qué
  significa tocar el velo (¿guardar o descartar?), que es justo el estado ambiguo que
  esta decisión elimina.
  Consecuencia gratuita: cada cambio reasigna `session.value`, así que el
  `watchDebounced` de 300 ms y el flush de `pagehide` que ya existen en
  `app/pages/[game]/index.vue` cubren la persistencia sin fontanería nueva.

- **D-14:** Los nombres **no se recuerdan entre partidas**: cada partida arranca en
  «Jugador 1»…«Jugador 4» (SEL-06 literal). **Descartada** una clave de localStorage
  propia que sobreviva a «Partida terminada» (patrón D-46 de la preferencia de voz):
  metería una segunda regla de ciclo de vida y obligaría a decidir qué pasa cuando la
  partida siguiente es de 3 jugadores en vez de 4. Todo lo de esta fase vive en la
  sesión y muere con ella. Ver `<deferred>`.

- **D-15:** Un nombre **vacío se muestra como «Jugador N»** — nunca hay un hueco
  anónimo en pantalla ni, después, en la banda de contadores de la Fase 7. El campo
  lleva un **tope corto de caracteres** (del orden de 12-16; la cifra exacta la fija la
  planificación midiendo contra la fila y contra el presupuesto de la Fase 7), para
  que ni la fila ni la futura banda revienten y para no tener que resolver el recorte
  con puntos suspensivos en cada sitio que muestre el nombre.

### Estado y edición de la selección

- **D-16 (SEL-07):** El héroe repetido se marca **en los dos sitios**:
  - **En el modal**, el héroe que ya lleva otro jugador sale marcado («ya: Ana») y
    **sigue siendo elegible** — avisa antes de equivocarse.
  - **En la rejilla**, una línea `⚠` bajo las filas implicadas mantiene el estado
    visible al cerrar el modal («⚠ Ana y Bruno llevan el mismo héroe»).

  **Nunca se bloquea.** `PROJECT.md` lo lista como exclusión permanente: *«El Rules
  Reference no lo prohíbe por escrito. Aviso suave, nunca bloqueo»*.
  **Regla D-32 que aplica aquí:** este `⚠` **no tiene detalle, así que no es
  pulsable** — sin borde, sin chevron, sin afordancia falsa. No abre
  `WarningDetailModal`.

- **D-17:** Se puede **vaciar** un hueco ya elegido: el modal abre con una entrada
  **«Sin elegir»** antes de la lista, que devuelve el hueco a «—». Misma mecánica que
  elegir un héroe (tocar guarda y cierra), cero gestos nuevos, y hace reversible
  cualquier toque accidental.
  **Descartado** un gesto de mantener pulsado: es invisible y hay que descubrirlo o
  explicarlo, justo lo que esta app evita.

- **D-18:** Cambiar la selección con la partida ya en la ronda se hace **con el índice
  existente, sin código nuevo**: `≡` → saltar a «Decidid, como grupo…» → cambiar →
  `≡` → volver a la ronda. Es exactamente lo que D-26 ya decidió que bastaba (y que
  rechazó un botón «Volver a la ronda»), apoyado en D-24 (el overlay muestra la
  preparación al final, atenuada, como zona de consulta) y en que `jumpTo()` no toca
  `round`.
  **Descartado** un acceso directo en la cabecera: ya lleva sección, posición,
  contexto de partida, voz e índice.

- **D-19 (Claude decidió — el usuario delegó, ver `<specifics>`):** `selection` entra
  como **campo opcional de `SessionContext`, sin tocar `formatVersion`**.
  Esto **resuelve un conflicto explícito entre dos documentos de investigación**, y el
  planner no debe reabrirlo:
  - `.planning/research/ARCHITECTURE.md` §a dice **no bumpear `formatVersion`** — el
    envoltorio `PersistedPosition` no cambia de forma porque `context` crezca por
    dentro; `toPersistedPosition` persiste `context` **entero** y `resume()` lo
    restaura entero en los dos caminos.
  - `.planning/research/PITFALLS.md` §3 dice lo contrario: tratarlo como
    `formatVersion: 2` desde el primer día.

  **Gana ARCHITECTURE.md**, por dos razones independientes:
  1. Es aditivo y no requiere ni una línea de fontanería de persistencia nueva.
  2. El renderizado defensivo ante `selection === undefined` **hace falta de todas
     formas por D-03/SEL-09** — «sin selección» es un estado normal y permanente de la
     app, no un caso de compatibilidad. Ese trabajo no se ahorra bumpeando la versión;
     bumpear solo añadiría el efecto de descartar la partida en curso.

  El bump de `formatVersion`, si alguna vez hace falta, se queda donde el roadmap lo
  puso: **Fase 7 (COMP-01/02)**.

  **La premisa que PITFALLS.md §3 usa para llamarlo «el riesgo más alto del hito» no
  se sostiene en el uso real de este grupo** — ver `<specifics>`. El planner **no debe
  gastar esfuerzo** en defender partidas a medias de v1.7.

- **D-20:** Aun así, la fase incluye **un test que construye a mano una sesión
  persistida sin `selection`** y comprueba que `resume()` la devuelve utilizable y que
  la rejilla se pinta con «—», sin ningún `undefined` propagándose a la interfaz. No
  es un test de compatibilidad con v1.7: es el test del estado normal de D-03.

### Claude's Discretion

El usuario no discutió estas y quedan a criterio de research/planning, siempre que
respeten las decisiones de arriba:

- **Nombre exacto y forma de la clave nueva del esquema** de D-02 (`selection:
  'characters'` es propuesta de trabajo, no decisión), y si es un enum o un booleano.
- **Si el modal de villano y el de jugador son un componente o dos.** El de villano no
  lleva filtro ni campo de nombre (D-10/D-11); si compartir componente exige
  condicionales por todas partes, dos componentes es legítimo.
  **Lo que no es discrecional:** `WarningDetailModal.vue` **no se retrofita** para
  esto — es un componente informativo de un solo botón y su cabecera lo dice
  explícitamente. Un modal de elección es superficie nueva.
- **Dónde vive el mapa de alias** (fichero en `app/`, `content/` con un tipo propio, o
  junto al composable que lo consume), mientras **no entre en
  `content/marvel-characters.json`** (D-05).
- **La cifra exacta del tope de caracteres del nombre** (D-15).
- **Cómo se apagan los atajos con el modal de jugador abierto** (bandera nueva vs.
  reutilizar `hasActiveDetail`), mientras la condición siga viviendo entera en
  `shortcutsEnabled` (D-12/D-Q2).
- **Forma exacta de los tipos `selection` / `HeroSelection`** dentro de
  `SessionContext` — `ARCHITECTURE.md` §a trae una propuesta completa; adóptese o
  mejórese, respetando D-19.
- **Cómo se accede al catálogo desde `app/`** (composable análogo a `useGameContent`,
  import estático directo, etc.), mientras siga viajando en el bundle y sin red
  (CAT-06, ya verificado en la Fase 5).
- **Si merece la pena `/gsd:ui-phase 6`** antes de planificar: esta fase estrena dos
  modales, un campo de texto y una rejilla, y el `UI hint: yes` del roadmap lo sugiere.
  Las Fases 1 y 2 tuvieron su `UI-SPEC.md`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Investigación del hito v1.8
- `.planning/research/ARCHITECTURE.md` §a «Where does the new state live?» —
  **la decisión de D-19 sale de aquí**: forma propuesta de `selection` /
  `HeroSelection` dentro de `SessionContext`, por qué NO un almacén paralelo, y el
  análisis detallado de las implicaciones de `contentVersion`/`formatVersion`
  (puntos 1-4). Su punto 3 es la fuente del renderizado defensivo de D-20.
- `.planning/research/PITFALLS.md` §3 (bump de forma persistida) — **leído y
  deliberadamente no seguido**, ver D-19; §4 (la superficie nueva se come el texto
  grande) — aplicado a la rejilla en D-04 aunque el pitfall hable de la banda de
  contadores; §14 (creep de alcance) — en particular, ninguna pantalla puede editar el
  catálogo y escenario/conjuntos modulares siguen fuera.
- `.planning/research/FEATURES.md` §c «Pickers with a filter» — el filtro sobre dos
  campos y la insensibilidad a acentos como convención establecida, sin librería, a
  N=23; y §«Open Questions» 7-10, que son exactamente las cuatro preguntas que este
  documento cierra (7→D-16, 8→D-06, 9→D-14, 10→D-03).
- `.planning/research/SUMMARY.md` — síntesis y niveles de confianza.

### Requisitos y alcance
- `.planning/REQUIREMENTS.md` §SEL — SEL-01..SEL-09, los nueve requisitos de esta fase.
- `.planning/ROADMAP.md` §«Phase 6» — los 5 criterios de éxito. Ver la nota de
  interpretación del criterio nº 5 en D-03.
- `.planning/ROADMAP.md` §«Recordatorio de alcance para las seis fases» — «la selección
  es de héroe y villano dentro del setup; el escenario y los conjuntos modulares
  (CONF-02/03) siguen diferidos».
- `.planning/PROJECT.md` §«Fuera de alcance» — la fila «Bloquear héroes duplicados»
  (*aviso suave, nunca bloqueo*), que es la fuente de D-16.

### Contexto de fases anteriores que sigue vinculante
- `.planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md` — **la fuente
  única** de la lista de 23 héroes y 3 villanos (D-02/D-03 de esa fase); D-07/D-08
  (nombres en inglés, alter ego sin traducir) y su `<deferred>` «Alias en español para
  el filtro», que **esta fase resuelve en D-05**; D-09 (nadie edita el catálogo a mano)
  y D-11 (`expert` en la etapa de villano, que la Fase 7 consumirá, no esta).
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTEXT.md` — D-32
  (regla dura: un `⚠` sin detalle no es pulsable → D-16), D-24/D-26 (índice de salto,
  derivar de datos y no cablear ids → D-02/D-18), D-36 (revisión humana bloqueante del
  contenido escrito a mano → D-07).
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-CONTEXT.md` —
  D-05 (anatomía del paso: frase grande dominante + aviso) y D-11 (estructura de la
  cabecera), que D-01/D-04 respetan.

### Restricciones vigentes del proyecto
- `CLAUDE.md` §Constraints — tablet apaisada legible a un brazo, offline, español,
  restricción legal (los alias de D-05 son nombres propios de personaje, no texto de
  carta ni arte).
- `CLAUDE.md` §«Version Compatibility» — `zod` sigue siendo Node/test-time; el campo
  nuevo de D-02 se valida en `engine/schema.ts`, que nunca cruza a `app/`.

### Reglamento
- `reference/mc_rulesreference_v17-compressed.pdf` — fuera de control de versiones
  (`.gitignore`), consultar con `pdftotext`. **Relevancia mínima en esta fase:** no hay
  ninguna regla que verificar aquí; el único punto de reglas ya está resuelto (el RR no
  prohíbe héroes duplicados, de ahí D-16).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/StepScreen.vue`: **el patrón que D-01 reutiliza.** Ya tiene una
  rejilla de opciones pulsables (`options[]`, rejilla `grid-cols-1 sm:grid-cols-2`,
  botones `min-h-12` con `›`) y ya distingue un `⚠` pulsable de uno que no lo es
  — que es exactamente la distinción que D-16 necesita. Sigue siendo **componente
  tonto**: recibe la selección ya resuelta en línea, no importa nada del motor.
- `app/components/WarningDetailModal.vue`: precedente de gestión de foco, `role="dialog"`
  / `aria-modal`, cierre por Escape / velo / botón, y velo translúcido `bg-background/80`.
  **Referencia de patrón, no componente a extender** (ver Claude's Discretion).
- `app/components/MiniSetupScreen.vue`: precedente del botón seleccionado
  (`bg-accent text-on-accent` vs `bg-surface text-primary-text`) que la rejilla puede
  reutilizar para «elegido» vs «—».
- `app/composables/useGameSession.ts`: **la única costura reactiva** entre motor y Vue.
  Los mutadores nuevos (fijar villano, fijar héroe/nombre de un jugador, vaciar) van
  aquí, reasignando `session.value` entero, nunca mutando in situ.
- `app/composables/useStepShortcuts.ts` + `shortcutsEnabled`: función pura ya testeada
  donde vive la condición de D-12.
- `content/marvel-characters.json` + `engine/types.ts` (`CatalogueHero`,
  `CatalogueVillain`, `CharacterCatalogue`): el catálogo de la Fase 5, tipado sin tocar
  `zod` a propósito para que `app/` pueda importarlo (DC-03 de la Fase 5).

### Established Patterns
- **Componentes tontos**: ningún componente importa `~~/engine/*` (ARCHITECTURE §3/§5);
  si un componente necesita algo del motor, falta una computed en `useGameSession`.
- **Persistencia gratis**: `toPersistedPosition` guarda `context` **entero**
  (`engine/persistence.ts:34`) y el `watchDebounced(session, …, 300ms)` +
  `useEventListener('pagehide', …)` de `app/pages/[game]/index.vue` ya cubren SEL-08
  sin una línea nueva de fontanería — **siempre que** los mutadores reasignen
  `session.value`.
- **`clear(gameId)` borra la selección sola**: «Partida terminada» y «Empezar partida
  nueva» eliminan la clave `tga:progress:<gameId>` entera; nada que añadir para que la
  selección desaparezca (y ver D-14: nada debe sobrevivir a ese borrado).
- **Zod nunca cruza a `app/`** (T-01-19): el campo nuevo de D-02 se valida en
  `engine/schema.ts`, en Node/CI.
- **Interpolación de texto siempre, HTML crudo nunca** (T-01-01): los nombres de héroe
  y, sobre todo, **el nombre que teclea el jugador** se pintan interpolados.
- **`z.strictObject` en todo el esquema** (CR-01 de la Fase 2): la clave nueva de D-02
  debe declararse o el contenido falla en CI — que es el comportamiento buscado.

### Integration Points
- **`content/marvel-champions.json`** — el paso `setup.heroes.01` gana la clave de
  D-02. Ni un carácter de `text`/`speech` cambia.
- **`engine/schema.ts` + `engine/types.ts`** — la clave nueva del paso, y los campos
  `selection` / `HeroSelection` de `SessionContext` (D-19).
- **`app/pages/[game]/index.vue`** — cablea la rejilla y los modales, y captura el
  disparador para devolver el foco al cerrar (mismo mecanismo que `activeDetail` /
  `detailTriggerEl` ya usa).
- **`app/composables/useGameSession.ts`** — mutadores nuevos de selección.
- **`engine/persistence.ts`** — **no se modifica** (D-19). Sí se añade el test de D-20
  en `engine/__tests__/persistence.test.ts`.
- **Workbox** — no necesita nada: el catálogo ya viaja dentro de un chunk JS y el mapa
  de alias de D-05 viajará igual. Verificado en la Fase 5.

</code_context>

<specifics>
## Specific Ideas

- **Hecho del proyecto aportado por el usuario en esta discusión, no derivable del
  repo:** *«lo de las partidas a medias da igual, no te preocupes por eso lo más
  mínimo porque es una app propia que usamos nosotros y no tenemos nada a medias y
  cuando la empezamos la terminamos, no va a ser un problema»*.
  El grupo **no deja partidas a medio jugar**. Esto desactiva la premisa de
  `PITFALLS.md` §3, que califica «una tablet con una sesión de v1.7 en curso cuando
  llegue v1.8» como el escenario de reproducción realista y el riesgo más alto del
  hito. **Consecuencia que se extiende más allá de esta fase:** rebaja también el peso
  de COMP-01/COMP-02 en la **Fase 7**. Sigue siendo correcto no corromper una sesión
  guardada, pero no es un criterio por el que valga la pena sacrificar simplicidad.
- El usuario delegó explícitamente **una sola** decisión («tú decides»): la de D-19,
  la forma de entrar `selection` en la sesión persistida. Todas las demás las eligió él.
- Las tres maquetas ASCII de `<decisions>` (rejilla del paso, modal de héroes, modal de
  jugador) son las que el usuario vio y aprobó al elegir cada opción. Son la
  descripción más concreta que existe de esta interfaz — no hay `UI-SPEC.md` todavía.

</specifics>

<deferred>
## Deferred Ideas

- **Recordar los nombres de jugador entre partidas** — descartado en D-14 para esta
  fase por meter una segunda regla de ciclo de vida (una clave de localStorage que
  sobreviva a «Partida terminada», patrón D-46) y por obligar a decidir qué pasa
  cuando la partida siguiente tiene otro nº de jugadores. Reconsiderable en un hito
  posterior **si reteclear los nombres molesta de verdad en mesa** — decisión con uso
  real encima, no por anticipado.
- **Acceso directo a la selección desde la cabecera durante la partida** — descartado
  en D-18 a favor del índice existente. Solo merece la pena si en uso real resulta que
  se cambia de héroe a menudo a mitad de partida, cosa que no es esperable.
- **Qué pasa con un contador ya ajustado si se cambia de héroe a mitad de partida** —
  **no es de esta fase**: aquí no hay contadores. Anotado para la **Fase 7**, que es
  quien precarga valores a partir de esta selección y quien debe decidir si un cambio
  de héroe reinicia el contador, lo deja como está, o pregunta.
- **Escenario y conjuntos modulares concretos (CONF-02/03)** — siguen diferidos a un
  hito posterior, como dice el recordatorio de alcance del roadmap. Anotado aquí para
  que se reconozca y se rechace en el momento, no se redescubra.
- **Una pantalla para editar el catálogo desde la app** — exclusión permanente
  (`PROJECT.md`, Pitfall 14). El mapa de alias de D-05 **no** es una grieta en esa
  exclusión: es una tabla de traducción de la capa de UI, versionada en el repo y
  editada por commit, igual que el catálogo.

</deferred>

---

*Phase: 6-Selección de villano, héroes y jugadores*
*Context gathered: 2026-09-08*
