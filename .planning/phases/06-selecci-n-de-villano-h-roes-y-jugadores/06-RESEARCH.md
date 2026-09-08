# Phase 6: Selección de villano, héroes y jugadores - Research

**Researched:** 2026-09-08
**Domain:** Integración de UI+esquema+persistencia sobre un motor Nuxt 4 SSG ya en producción (TableGameAssistant)
**Confidence:** HIGH — casi todo lo que sigue está verificado leyendo el código real (`path:line`), no inferido. Las dos únicas áreas MEDIA/baja confianza son el comportamiento exacto de `Intl.Collator`/`normalize()` en un iPad físico (no verificable desde este entorno) y la cifra exacta de alias en español (pendiente de D-07, revisión humana).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Numeración local de la fase (las Fases 4 y 5 también reiniciaron en D-01).

#### Anatomía del paso con selectores

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

#### Filtro, nombres en español y orden de la lista

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

#### Nombre de jugador y teclado

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

#### Estado y edición de la selección

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

### Deferred Ideas (OUT OF SCOPE)

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

### UI-SPEC.md (approved design contract — also locked)

`06-UI-SPEC.md` (641 líneas, estado `draft` pendiente de aprobación formal pero
generado y ya usado como contrato de referencia) fija el contrato visual completo de
la rejilla y los dos modales nuevos — glifos, tipografía, color, layout exacto (incluidas
las maquetas ASCII con clases Tailwind literales), copy exacto de cada string, y 14
decisiones autónomas explícitamente registradas en su sección "Decisions Made Without
User Input". Ver el cuerpo de esta investigación (`Architecture Patterns`, `Code
Examples`) para cómo estos hallazgos técnicos encajan con ese contrato — no se repite
aquí el documento completo por espacio; el planner debe leer `06-UI-SPEC.md` íntegro
antes de planificar, no solo este resumen.
</user_constraints>

---

## Summary

Esta fase no abre ninguna incógnita arquitectónica real: `06-CONTEXT.md` y `06-UI-SPEC.md` ya fijaron las 20 decisiones y el contrato visual completo, y el propio `ARCHITECTURE.md` del hito ya diseñó la forma de `SessionContext.selection`/`HeroSelection` antes de que existiera esta fase. Lo que esta investigación aporta es la verificación línea a línea de seis afirmaciones concretas que el planner necesita dar por ciertas sin volver a comprobarlas: (1) el gate de deriva de voz es estructuralmente ciego a cualquier clave que no sea `text`/`speech`, así que la clave nueva de D-02 no puede tocarlo; (2) `resume()` no exige ningún bump de versión para este cambio, ni de `formatVersion` (ya resuelto por D-19) ni de `contentVersion` (nueva conclusión de esta investigación, con el mismo razonamiento que D-19 aplica); (3) no existe todavía ningún composable de acceso al catálogo desde `app/` — esta fase lo crea desde cero, calcado de `useGameContent.ts`; (4) `useStepShortcuts` ya protege un campo de texto por partida doble (guarda `isEditableTarget` + guarda `hasActiveDetail`), así que el riesgo real de D-12 es menor de lo que parece, pero sigue habiendo un cableado obligatorio en la página; (5) el `watchDebounced(session, …)` es explícitamente NO profundo — cualquier mutador que mute un array anidado en vez de reasignar `session.value` entero pasaría inadvertido en desarrollo (la UI se actualizaría igual, por el proxy reactivo del `ref`) pero perdería la partida al recargar, exactamente el tipo de bug que solo aparece en producción; y (6) no existe ningún entorno DOM/jsdom configurado en Vitest — los dos componentes `.vue` nuevos de esta fase no son testeables como componentes hoy, y no se debe inventar esa infraestructura para esta fase.

**Primary recommendation:** Sigue el patrón `next()`/`prev()`/`jumpTo()` al pie de la letra: añade una función pura nueva en `engine/` (p. ej. `engine/selection.ts`) que reciba un `EngineSession` y devuelva uno nuevo con `context.selection` reconstruido inmutablemente, y haz que los mutadores de `useGameSession.ts` solo llamen a esa función y reasignen `session.value`. No mutes `session.value.context.selection.heroes[i]` in situ bajo ninguna circunstancia — ver Pitfall 1 más abajo.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Declarar qué paso pinta la rejilla (D-02) | Contenido (`content/marvel-champions.json` + `engine/schema.ts`/`types.ts`) | — | Dato autorado, no un `if` cableado contra un id — mismo principio que TECH-04/D-24 ya exigen para el índice de salto |
| Guardar villano/héroe/nombre elegidos | Motor puro (`engine/`, nueva función de selección) | Composable reactivo (`useGameSession.ts`, único punto de reasignación de `session.value`) | Mismo reparto que `next`/`prev`/`jumpTo`: lógica pura en `engine/`, costura reactiva en el composable, cero lógica de motor en componentes |
| Persistir la selección entre recargas | Motor puro (`engine/persistence.ts`, sin cambios — D-19) + capa de storage (`usePersistedSession.ts`, sin cambios) | Página (`index.vue`, `watchDebounced`/`pagehide` ya existentes) | Aditivo por diseño: `context` viaja entero, nada nuevo que fontanear si los mutadores reasignan correctamente |
| Renderizar la rejilla y los dos modales | Componentes de UI (`StepScreen.vue` extendido, `VillainPickerModal.vue`, `PlayerModal.vue` nuevos) | Página (`app/pages/[game]/index.vue`, cablea props/emits y gestión de foco) | Componentes tontos: reciben listas ya resueltas/ordenadas, nunca importan `~~/engine/*` |
| Catálogo de personajes disponible sin red | Composable nuevo (`app/composables/useCharacterCatalogue.ts`) | Contenido (`content/marvel-characters.json`, ya existe de la Fase 5) | Import estático, mismo patrón que `useGameContent.ts` — nada de fetch en runtime |
| Filtro insensible a mayúsculas/acentos + alias español | Capa de UI (función pura co-localizada, p. ej. junto al composable del catálogo o en un módulo propio) | — | Nunca en `engine/` (no es lógica de motor, es presentación) ni en `content/marvel-characters.json` (D-05: el alias no es dato derivado del script) |
| Apagar atajos de teclado con un modal abierto | Función pura ya existente (`useStepShortcuts.ts::shortcutsEnabled`) | Página (`index.vue`, añade el nuevo estado al booleano `hasActiveDetail`-like que ya calcula) | D-Q2 (Fase 1): la condición vive entera en la función pura, nunca reimplementada en línea |

<phase_requirements>
## Phase Requirements

| ID | Descripción | Apoyo de esta investigación |
|----|-------------|------------------------------|
| SEL-01 | Selector de Villano dentro de `setup.heroes.01` | D-01/D-02 ya fijan la anatomía; esta investigación confirma que la clave de esquema no requiere bump de versión (Q1) y que el patrón `options[]` de `StepScreen.vue` es reutilizable tal cual (código citado abajo) |
| SEL-02 | Tocar el selector de villano abre modal con 3 villanos | `VillainPickerModal.vue` nuevo — contrato completo en `06-UI-SPEC.md` §3; catálogo de 3 villanos ya verificado en `content/marvel-characters.json` |
| SEL-03 | Un selector de héroe por jugador, según nº de mini-setup | Q8 resuelve dónde vive `playerCount` en tiempo de ejecución y la regla defensiva ante desajuste de longitud |
| SEL-04 | Tocar un selector de héroe abre modal con 23 héroes | `PlayerModal.vue` nuevo — mismo catálogo, 23 héroes verificados |
| SEL-05 | Filtro insensible a mayúsculas y acentos, dos campos (español añade un tercero, D-08) | Q4 — recomendación concreta de función pura + firma testeable |
| SEL-06 | Nombre editable y opcional por jugador, defecto «Jugador N» | D-15 (tope de 14, ya fijado en UI-SPEC); Q6 cubre la reactividad de guardarlo |
| SEL-07 | Marcar héroe repetido sin bloquear | D-16 (locked); Q6 cubre cómo el mutador debe reasignar para que el aviso persista igual que el resto |
| SEL-08 | Selección persiste con la sesión, sobrevive a recargar | Q1 (sin bump de versión), Q6 (reasignación obligatoria del `ref`), D-19 (arquitectura ya resuelta) |
| SEL-09 | Elegir es opcional — sin selección, la app se comporta como v1.7 | Q1 confirma que `resume()` no distingue sesiones con/sin `selection`; D-20 exige el test explícito de ese estado |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Sin backend: toda la selección vive en `SessionContext`/`localStorage`, nada nuevo que administrar.
- `zod` nunca cruza a `app/` (T-01-19) — la clave nueva de D-02 se valida en `engine/schema.ts`, Node/CI únicamente; ningún componente ni composable de `app/` puede importar `zod` ni `~~/engine/schema`.
- Interpolación de texto siempre, HTML crudo nunca (T-01-01) — el nombre que teclea el jugador se interpola, jamás se inyecta como HTML.
- Offline-first: el mapa de alias en español y el catálogo deben viajar en el bundle JS (Workbox ya cubre esto sin config nueva, verificado en la Fase 5 — CAT-06).
- Español, incluida la locución: esta fase no toca `text`/`speech`, así que no hay impacto en la locución (confirmado por Q2).
- Dispositivo objetivo: tablet horizontal a un brazo — tap targets `min-h-12` en toda fila/botón/input nuevo (ya fijado en `06-UI-SPEC.md`).

---

## Standard Stack

### Core

No se instala ningún paquete nuevo en esta fase. Todo se construye sobre lo ya presente:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 (Composition API) | `^3.5.41` (ya en `package.json`) | Componentes `VillainPickerModal.vue`/`PlayerModal.vue`, extensión de `StepScreen.vue` | Ya es la base de todo el árbol de componentes existente |
| `zod` | `^4.4.3` (ya en `package.json`, devDependency) | Validar la clave nueva de `setup.heroes.01` en `engine/schema.ts` | Ya es el único validador de contenido del repo; nunca cruza a `app/` |
| Vitest | `^4.1.11` (ya en `package.json`) | Tests de la clave de esquema, de la función pura de filtro/alias, y del caso de resume sin `selection` (D-20) | Ya es el runner del repo, con los dos proyectos (`engine`, `app-logic`) descritos abajo |

### Supporting

Ninguna librería nueva. `Intl.Collator`/`String.prototype.normalize` son API de plataforma (ECMAScript/Web estándar), no dependencias.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `normalize('NFD')` + strip de marcas combinantes para el filtro (recomendado, ver Q4) | `Intl.Collator('es', { sensitivity: 'base' })` | `Intl.Collator` es la API "correcta" lingüísticamente, pero (a) en colación española tradicional `ñ` se trata como letra distinta de `n` — lo contrario de lo que un filtro tolerante quiere — y (b) no ofrece un modo "contains"/substring nativo: comparar solo funciona por igualdad, así que buscar substrings exigiría probar cada ventana de la cadena, mucho más caro y menos legible que un `.includes()` tras normalizar. Ver Q4. |
| Cero librerías para el mapa de alias | Un `Map`/objeto plano JSON committeado | Un fichero de datos JSON separado (p. ej. `content/spanish-hero-aliases.json`) es una opción legítima de "dónde vive" (discrecional, D-05), pero **no** debe entrar en `content/marvel-characters.json` — D-05 es explícito. Un objeto TS embebido junto al composable que lo consume es la opción más simple si no hace falta reutilizarlo desde ningún otro sitio. |

**Installation:** N/A — no hay paquetes que instalar esta fase.

## Package Legitimacy Audit

No aplica: esta fase no instala ningún paquete externo nuevo. Todo el trabajo usa APIs de plataforma (`String.prototype.normalize`, `Intl.Collator` si se optase por él) y dependencias ya presentes en `package.json` (Vue, Zod, Vitest). No se ejecuta el protocolo de legitimidad de paquetes porque no hay superficie que auditar.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ content/marvel-champions.json                                       │
│   setup.heroes.01: { ..., selection: 'characters' }  ← D-02, nuevo   │
└───────────────┬───────────────────────────────────────────────────--┘
                │ import estático (build time, sin red)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ engine/ (puro, sin Vue/DOM)                                          │
│  schema.ts    → valida la clave nueva (z.strictObject, CR-01)        │
│  types.ts     → StepDefinition.selection?: 'characters'              │
│                 SessionContext.selection?: { villainId, heroes[] }    │
│  selection.ts → NUEVO: setVillain/setHero/setPlayerName/clearSlot,   │
│                 funciones puras EngineSession → EngineSession nuevo  │
│  persistence.ts → SIN CAMBIOS (D-19): context viaja entero          │
└───────────────┬───────────────────────────────────────────────────--┘
                │ única costura reactiva
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ app/composables/useGameSession.ts                                    │
│   session = ref<EngineSession|null>(null)                            │
│   setVillain(id) { session.value = engineSetVillain(session.value,id)}│
│   → reasigna session.value ENTERO cada vez (nunca muta anidado)      │
└───────────────┬───────────────────────────────────────────────────--┘
                │ props/computed ya resueltos (componentes tontos)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ app/pages/[game]/index.vue                                           │
│  - computa selectionRows[] para StepScreen                           │
│  - abre VillainPickerModal / PlayerModal, captura foco disparador    │
│  - añade el estado "modal abierto" a atajosActivos (shortcutsEnabled)│
│  - watchDebounced(session,...) YA guarda cualquier cambio (D-19)     │
└───────────────┬───────────────────────────────────────────────────--┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ StepScreen.vue (extendido) · VillainPickerModal.vue (nuevo) ·        │
│ PlayerModal.vue (nuevo) — reciben catálogo+alias ya ordenados desde  │
│ app/composables/useCharacterCatalogue.ts (NUEVO, calcado de          │
│ useGameContent.ts) + un módulo de filtro/alias puro (co-localizado)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
engine/
├── schema.ts               # + clave `selection` en StepSchema (extiende, no en TextBlockSchema)
├── types.ts                # + StepDefinition.selection, SessionContext.selection, HeroSelection
├── selection.ts             # NUEVO — funciones puras: setVillain, setHero, setPlayerName, clearSlot
└── __tests__/
    ├── schema.test.ts       # + caso: paso con selection:'characters' valida
    ├── selection.test.ts    # NUEVO — tests de las funciones puras de arriba
    └── persistence.test.ts  # + caso D-20: sesión persistida sin `selection` resuelve limpia

app/
├── composables/
│   ├── useCharacterCatalogue.ts   # NUEVO — import estático, calcado de useGameContent.ts
│   ├── useHeroSearch.ts           # NUEVO (nombre discrecional) — normalizeForSearch/matchesHeroQuery, PUROS
│   ├── useGameSession.ts          # + setVillain/setHero/setPlayerName/clearSlot (llaman a engine/selection.ts)
│   └── __tests__/
│       └── useHeroSearch.test.ts  # NUEVO — entorno node, sin DOM
└── components/
    ├── StepScreen.vue              # extendido — modo rejilla de selección
    ├── VillainPickerModal.vue      # NUEVO
    └── PlayerModal.vue             # NUEVO
```

---

## Research Questions — Findings

### Q1. La clave de esquema de D-02 y el bump de versión

**Dónde slotea la clave nueva.** `engine/schema.ts` tiene dos patrones de campo opcional dependiente ya establecidos, ambos dentro de `TextBlockSchema` (`engine/schema.ts:32-66`):
- `warningDetail` depende de `warning` (validado en `superRefine`, `schema.ts:137-142`).
- `optionsWarningDetail` depende de `optionsWarning` (`schema.ts:155-160`).

Ambos son pares "aviso corto + detalle largo", inyectables por variante de dificultad vía `TextBlockSchema.partial()` (`StepSchema.variants.difficulty.normal/expert`, `schema.ts:72-77`). **La clave de D-02 no encaja en ese patrón**: no tiene un campo "detalle" dependiente, no necesita variar por dificultad (la rejilla se pinta igual en normal/experto), y es una propiedad estructural del paso (qué UI renderiza), no contenido autorado con presupuesto de caracteres. Por eso **no va dentro de `TextBlockSchema`** — va en `StepSchema` directamente (`schema.ts:68-79`), como hermana de `kind` (que ya cumple exactamente ese rol: decidir qué componente/rama de render usar, `kind: z.enum(['step', 'summary']).default('step')`).

**Forma recomendada — enum de un solo miembro, no booleano:**
```typescript
// engine/schema.ts — dentro de StepSchema.extend({...})
selection: z.enum(['characters']).optional(),
```
```typescript
// engine/types.ts — dentro de StepDefinition
selection?: 'characters'
```
**Razonamiento:** un booleano (`selection: true`) sería más corto pero menos legible en el JSON crudo ("¿selection de qué?"), y migrar de booleano a enum más adelante (si Warhammer 40.000 necesita un segundo tipo de rejilla de selección) sería un cambio incompatible; añadir un segundo miembro a un enum ya existente es aditivo. Es la misma filosofía "generalidad cuando aparece la segunda necesidad real, no antes" que `ARCHITECTURE.md` ya aplicó explícitamente para no inventar un `characters[]` genérico cross-juego en la Fase 5. **No hace falta ninguna regla nueva en `superRefine`**: a diferencia de `warningDetail`/`optionsWarning`, no hay ningún campo dependiente que pueda quedar huérfano — es un flag solitario. [ASSUMED — decisión de diseño de esta investigación, no verificada contra ninguna fuente externa; `06-CONTEXT.md` la deja expresamente a discreción de research/planning]

**¿Requiere bump de `contentVersion` o `formatVersion`? No, ninguno de los dos — verificado leyendo `resume()` directamente.**

`engine/persistence.ts::resume()` (`persistence.ts:67-91`) evalúa, en este orden exacto:
1. `persisted.formatVersion !== 1` → fallback (`persistence.ts:74-76`)
2. `persisted.contentVersion !== fresh.contentVersion` → fallback (`persistence.ts:78-80`)
3. `runtimeId` no encontrado en la secuencia fresca → fallback (`persistence.ts:82-85`)
4. Si las tres pasan: `resumed`, con `context: persisted.context` restaurado **entero** (`persistence.ts:88`).

Ninguna de las tres comprobaciones inspecciona el contenido de un paso más allá de su `runtimeId` (un hash/id derivado de la posición en la secuencia, no de sus claves). Añadir `selection: 'characters'` a `setup.heroes.01` no cambia su `runtimeId`, no cambia `text`/`speech`, no cambia el número ni el orden de pasos — **no hay ninguna condición de las tres que se dispare**. `isValidContext()` (`persistence.ts:45-49`) tampoco se entera: solo exige `playerCount: number` y `difficulty: string`, lo mismo de siempre.

Sobre `formatVersion`: ya resuelto y cerrado por D-19 (no se toca). Sobre `contentVersion`: **esta investigación extiende el mismo razonamiento de D-19/`ARCHITECTURE.md` §c punto 2** ("Tagging existing steps with a new field... does not by itself require a `contentVersion` bump") — D-19 solo discutía `formatVersion` explícitamente, pero el argumento de fondo (nada de lo que rompe `resume()` cambia) se aplica igual de literal a `contentVersion`. **Recomendación: no tocar `contentVersion` (queda en `13`) para este cambio.** Es una extensión razonada de una decisión ya tomada, no una decisión nueva — pero se marca aquí como recomendación explícita, no como hecho ya bloqueado, para que el planner la confirme si quiere ser estricto. [VERIFIED: lectura directa de `persistence.ts` — el mecanismo; ASSUMED: la recomendación de no bumpear `contentVersion` "por higiene", que extiende D-19 sin ser literalmente D-19]

### Q2. El gate de deriva de voz — prueba de que es ciego a la clave nueva

Leído `engine/audio.ts` completo (48 líneas) y `engine/__tests__/voice-drift.test.ts` completo (134 líneas).

`collectSpeechEntries()` (`audio.ts:23-44`) recorre `sections → phases → steps` y por cada paso mira **únicamente** `step.speech` (línea 28) y, para cada variante de dificultad, `difficultyVariants[d]?.speech` (línea 34). No lee ninguna otra clave del `step` — ni `text`, ni `title`, ni `citation`, ni (tras esta fase) `selection`. `collectAudioIds()` (`audio.ts:46-48`) es un `.map(entry => entry.id)` sobre lo anterior — mismo alcance.

El test del gate (`voice-drift.test.ts`) hace tres cosas, ninguna de las cuales puede ver `selection`:
1. `findStaleAudio()` (líneas 44-46) compara `fingerprint(entry.speech)` contra el manifiesto — solo opera sobre las `SpeechEntry[]` de arriba, que ya excluyen `selection` por construcción.
2. El test "el manifiesto cubre exactamente el catálogo" (líneas 91-105) compara `collectAudioIds(game)` contra las claves del manifiesto — de nuevo, deriva de `collectSpeechEntries`, ciego a `selection`.
3. El test "hay exactamente 35 entradas" (línea 107-109) cuenta entradas del manifiesto, no pasos — añadir una clave a un paso no crea ni quita una entrada de audio.

**Conclusión, sin ambigüedad: añadir `selection: 'characters'` a `setup.heroes.01` no puede, estructuralmente, tocar ni un solo assert de `voice-drift.test.ts`**, porque el camino de datos que ese test ejercita (`audio.ts` → `speech`/`text.speech` únicamente) nunca pasa por la nueva clave. Esto es exactamente el mismo argumento que `ARCHITECTURE.md` §c ya demostró para `showsValue` (`ARCHITECTURE.md`, sección "Confirmed: `text` y `speech` are already independent"), aplicado aquí de forma literal a una segunda clave nueva. [VERIFIED: lectura directa de `engine/audio.ts` y `engine/__tests__/voice-drift.test.ts`]

**Lo único que SÍ rompería el gate** (para que quede explícito, igual que `ARCHITECTURE.md` lo lista): editar `step.speech` o `step.text` de `setup.heroes.01` a la vez que se añade `selection` — algo que ni D-02 ni ningún otro punto de `06-CONTEXT.md` pide, y que está prohibido explícitamente ("ni un carácter de ningún `text` ni `speech`").

### Q3. Cómo `app/` alcanza el catálogo

`app/composables/useGameContent.ts` (22 líneas completas) es el patrón exacto a calcar:
```typescript
// useGameContent.ts:7-13
import type { GameDefinition } from '~~/engine/types'
import { games as gamesIndex, type GameIndexEntry } from '~~/content/games-index'
import marvelChampions from '~~/content/marvel-champions.json'

const gamesById: Record<string, GameDefinition> = {
  'marvel-champions': marvelChampions as GameDefinition,
}
```
Import estático de JSON, tipado con un `as GameDefinition` (nunca validado con Zod en el navegador — el comentario de cabecera del fichero lo dice explícitamente: "NO importa `~~/engine/schema`"). `content/games-index.ts` (13 líneas) confirma que este directorio ya es el sitio establecido para índices/metadatos de juego servidos sin red.

**Hallazgo importante: no existe todavía ningún composable de catálogo.** Se buscó `useCharacterCatalogue`, `CharacterCatalogue`, `CatalogueHero` en todo `app/` y no aparece ninguna referencia — la Fase 5 dejó los tipos listos en `engine/types.ts` (confirmado por su propio resumen: *"...listas para que la Fase 6 las importe desde `app/` vía `~~/engine/types`"*, `05-01-SUMMARY.md:56`) pero **no creó el composable de acceso**. Esta fase debe crearlo desde cero.

**Recomendación concreta:**
```typescript
// app/composables/useCharacterCatalogue.ts — NUEVO, calcado de useGameContent.ts
import type { CharacterCatalogue } from '~~/engine/types'
import marvelCharacters from '~~/content/marvel-characters.json'

const cataloguesById: Record<string, CharacterCatalogue> = {
  'marvel-champions': marvelCharacters as CharacterCatalogue,
}

export function useCharacterCatalogue() {
  function getCatalogue(gameId: string): CharacterCatalogue | null {
    return cataloguesById[gameId] ?? null
  }
  return { getCatalogue }
}
```
Import estático + estructura `Record` idéntica a `useGameContent.ts` → mismo comportamiento de bundling (Workbox ya lo cubre por ir dentro de un chunk JS, verificado en la Fase 5, sin glob nuevo) y **cero import de `~~/engine/schema` o de `zod`**, cumpliendo T-01-19 literalmente igual que el composable que copia. [VERIFIED: lectura directa de `useGameContent.ts` y `content/games-index.ts`; VERIFIED: ausencia confirmada por grep en todo `app/`]

### Q4. Filtro insensible a mayúsculas y acentos en español

**Recomendación: `normalize('NFD')` + strip de marcas combinantes, no `Intl.Collator`.**

```typescript
// Firma pura recomendada, testeable sin DOM (mismo estilo que resolveShortcutAction)
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // marcas diacríticas combinantes, incluida la tilde de ñ
}

export function matchesHeroQuery(
  query: string,
  hero: { spanishAlias: string, catalogueName: string, alterEgo: string },
): boolean {
  if (!query.trim()) return true
  const q = normalizeForSearch(query)
  return [hero.spanishAlias, hero.catalogueName, hero.alterEgo]
    .some(field => normalizeForSearch(field).includes(q))
}
```

**El caso `ñ` — tradeoff real, no hipotético.** Se comprobó el catálogo de 23 héroes (`content/marvel-characters.json`): ninguno de los `name`/`alterEgo` en inglés contiene `ñ`, pero **al menos un alias español previsible sí** — la traducción clásica de "Spider-Man" es "Hombre Araña". Bajo NFD, `ñ` se descompone en `n` + U+0303 (tilde combinante), así que el strip de marcas la convierte en `n` plano: buscar "arana" (sin `ñ`) SÍ encontraría "Araña". Esto es **deseable aquí**: (a) no hay ningún par de alias en la lista de 23 que difiera solo en `n`/`ñ` (cero riesgo de colisión falsa), y (b) baja la fricción de un usuario que no se moleste en teclear `ñ` en un teclado de tablet. Confirmado por búsqueda: en colación española tradicional `ñ` se trata como letra distinta de `n` — que es exactamente lo que **no** se quiere para un filtro tolerante de errores. `Intl.Collator('es', { sensitivity: 'base' })` heredaría ese comportamiento "correcto" lingüísticamente pero **contraproducente** para búsqueda tolerante, y además no ofrece un modo "contains" nativo (solo compara igualdad completa, obligando a probar ventanas de substring a mano — mucho más caro que un `.includes()`). [MEDIUM confidence, WebSearch cruzado con MDN — no reverificado contra un iPad físico]

**Soporte de navegador:** `String.prototype.normalize()` — Chrome 34+, Firefox 31+, **Safari 10+**, Edge 12+ (todos los objetivos de esta app, iPad/Android, quedan muy por encima del mínimo). Es ECMAScript estándar desde ES2015, sin polyfill necesario en el rango de dispositivos de este proyecto. Funciona 100% offline (es JS de plataforma, cero red). [CITED: MDN `String.prototype.normalize()`, cruzado con búsqueda adicional sobre compatibilidad]

**No usar ninguna librería** (`fuse.js`, `diacritics`, etc.) — a N=23, un `.includes()` sobre string normalizado es `O(n)` trivial, ya es la conclusión explícita de `FEATURES.md §c` ("no special library needed at N=18/23") y de `06-UI-SPEC.md`'s Interaction & State Coverage ("No prefix-only restriction, no library").

### Q5. Apagar los atajos de teclado con un modal abierto (D-12)

`useStepShortcuts.ts` tiene **dos guardas independientes** que ya mitigan la trampa, no solo una — esto es un hallazgo que matiza el riesgo descrito en D-12 sin contradecirlo:

1. **`isEditableTarget(event.target)`** (`useStepShortcuts.ts:118-123`), comprobado dentro de `resolveShortcutAction()` (línea 72) **antes** de mirar el mapa de teclas. Cualquier `<input>`/`<textarea>`/`<select>` con foco hace que Espacio/Enter devuelvan `null` — **esto ya protegería el campo `Nombre` incluso si el modal no apagase nada más**, porque el evento de teclado llega con `event.target` siendo el propio `<input>`.
2. **`shortcutsEnabled(state)`** (`useStepShortcuts.ts:101-112`), que exige `!state.hasActiveDetail` entre otras seis condiciones — esta es la guarda que D-12 pide extender a los modales nuevos, y protege cosas que la guarda 1 no cubre (p. ej. `ArrowLeft` con el foco en el botón `✕` del modal, o en cualquier fila no-input dentro del modal).

**`hasActiveDetail` hoy solo cubre `WarningDetailModal`** (`app/pages/[game]/index.vue:406`, `hasActiveDetail: activeDetail.value !== null`, donde `activeDetail` es un `ref` tipado exclusivamente para el modal informativo de un botón, `index.vue:215`). Los modales nuevos son un tipo distinto (modal de elección, no informativo) y no caben en ese mismo `ref` sin forzar su tipo.

**Recomendación:** un `ref` nuevo (p. ej. `activeSelectionModal = ref<{ kind: 'villain' } | { kind: 'player', slot: number } | null>(null)`), y en el cómputo de `atajosActivos` (`index.vue:394-411`) cambiar la línea `hasActiveDetail: activeDetail.value !== null` por `hasActiveDetail: activeDetail.value !== null || activeSelectionModal.value !== null`. **Esto NO toca `shortcutsEnabled` en sí** (la función pura no cambia, D-Q2 intacto) — solo cambia qué se le pasa como argumento en el sitio de llamada, exactamente el patrón que `06-CONTEXT.md` deja a discreción ("bandera nueva o reutilizada... la condición vive por completo en la función pura"). **El test obligatorio que D-12 pide** ("escribir en el campo no avanza el paso") ya está parcialmente cubierto por los tests existentes de `isEditableTarget`/`resolveShortcutAction` (`useStepShortcuts.test.ts:86-88`) — lo que falta es un test de integración/manual que confirme que `activeSelectionModal` efectivamente se pone a no-`null` al abrir `PlayerModal` y a `null` al cerrarlo, ya que ese cableado vive en `index.vue`, fuera del alcance de los tests puros de `app-logic`. [VERIFIED: lectura directa de `useStepShortcuts.ts` y `index.vue`]

### Q6. Reactividad de escrituras anidadas en `SessionContext`

`session` es un `ref<EngineSession | null>(null)` (`useGameSession.ts:17`) — **no** un `shallowRef`. Como Vue 3 envuelve automáticamente el valor de un `ref` con `reactive()` cuando es un objeto, **la UI SÍ se actualizaría** aunque un mutador mutase `session.value.context.selection.heroes[0].heroId` in situ, porque las lecturas dentro de un componente pasan por el proxy reactivo profundo. **Pero el autoguardado NO lo haría.**

Confirmado leyendo el comentario propio del código, no solo infiriéndolo: `index.vue:120-123` dice literalmente *"`session` se reasigna por completo en cada next/prev/jumpTo (nunca se muta in situ), así que un watch no profundo ya detecta cada cambio de cursor/round/context"* — y el `watchDebounced(session, ..., { debounce: 300 })` (`index.vue:126-133`) no lleva `{ deep: true }`. Un `watch()` sobre un `ref` sin `deep` usa `() => source.value` como getter y solo dispara cuando **esa referencia** cambia, no cuando cambia una propiedad anidada del objeto que apunta.

**La trampa concreta para esta fase:** un mutador como
```typescript
// MAL — pasaría desapercibido en desarrollo, rompería SEL-08 en producción
function setHero(slot: number, heroId: string | null) {
  if (!session.value?.context.selection) return
  session.value.context.selection.heroes[slot].heroId = heroId // mutación anidada in situ
}
```
actualizaría la rejilla en pantalla (el proxy reactivo profundo del `ref` lo permite) pero **no dispararía `watchDebounced`**, así que recargar la página perdería el cambio — exactamente el bug que ningún test manual "mirando la pantalla" detectaría, porque solo se manifiesta al recargar.

**Patrón correcto, igual que `next`/`prev`/`jumpTo`:** una función pura en `engine/` que reciba `EngineSession` y devuelva un objeto **nuevo** en cada nivel que cambia, y un mutador en `useGameSession.ts` que solo reasigne:
```typescript
// engine/selection.ts — NUEVO, puro, mismo estilo que engine/navigator.ts
export function setHero(session: EngineSession, slot: number, heroId: string | null): EngineSession {
  const current = session.context.selection ?? { villainId: null, heroes: [] }
  const heroes = current.heroes.map((h, i) => (i === slot ? { ...h, heroId } : h))
  return {
    ...session,
    context: { ...session.context, selection: { ...current, heroes } },
  }
}
```
```typescript
// useGameSession.ts — mutador, solo reasigna
function setHero(slot: number, heroId: string | null) {
  if (!session.value) return
  session.value = engineSetHero(session.value, slot, heroId)
}
```
Con esto, `session.value` cambia de identidad en cada llamada → `watchDebounced` dispara → `save()` persiste → `pagehide` cubre el caso de recarga inmediata, **sin ninguna fontanería nueva**, exactamente lo que D-13/D-19 dan por hecho. [VERIFIED: lectura directa de `useGameSession.ts:17` y del comentario/código de `index.vue:120-133`]

### Q7. Superficie de test existente

`vitest.config.ts` (leído completo) define **dos** proyectos, ninguno con entorno DOM:

| Proyecto | `include` | `environment` | Alias `~`/`~~` |
|---|---|---|---|
| `engine` | `engine/**/*.test.ts` | `node` | no necesita (solo imports relativos) |
| `app-logic` | `app/**/*.test.ts` | `node` | sí, resueltos a mano (Nuxt no está arrancado) |

**No existe ningún proyecto `jsdom`/`happy-dom`/`nuxt`.** El propio comentario del config lo dice explícitamente: *"pure-function tests only... do not reach for 'nuxt' environment unless a composable genuinely needs a mocked Nuxt context"* (`vitest.config.ts`, comentario del proyecto `app-logic`). Confirmado además por `CLAUDE.md`: *"`@nuxt/test-utils` — Needed only if a composable/plugin must be unit-tested inside a mocked Nuxt context; the step-engine logic itself should be framework-agnostic pure functions and not need it"* y Playwright está explícitamente diferido ("post-v1 hardening phase").

Se listaron los 17 ficheros de test existentes (`engine/__tests__/*.test.ts` × 11, `app/composables/__tests__/*.test.ts` × 5): **ninguno monta un componente Vue.** Todos importan funciones puras y hacen aserciones sobre su valor de retorno.

**Conclusión para el plan: los componentes `.vue` nuevos de esta fase (`VillainPickerModal.vue`, `PlayerModal.vue`, la extensión de `StepScreen.vue`) no se pueden testear con Vitest tal y como está configurado hoy**, y **esta fase no debe inventar esa infraestructura** (sería un cambio de config nuevo, no pedido, fuera del patrón "componente tonto" que el proyecto ya sigue). En su lugar:
- Toda lógica testeable (normalización/filtro de búsqueda, fórmula de unión de nombres "A y B"/"A, B y C", detección de héroe repetido, las funciones puras nuevas de `engine/selection.ts`) debe vivir en módulos `.ts` puros, co-localizados junto al composable o en `engine/`, y testearse en el proyecto `engine`/`app-logic` existente — mismo patrón que `resolveShortcutAction`/`shortcutsEnabled`.
- Los `.vue` en sí quedan sin test automatizado esta fase (igual que `StepScreen.vue`, `WarningDetailModal.vue`, `IndexOverlay.vue` hoy no tienen test de componente) — la verificación de estos es manual/visual, coherente con el resto del proyecto.
- Si en el futuro hiciera falta test de componente de verdad, el camino documentado del proyecto es Playwright (ya en `package.json` como `@playwright/test`), no añadir un entorno jsdom a Vitest. [VERIFIED: lectura directa de `vitest.config.ts`, `package.json`, y listado completo de `*.test.ts`]

### Q8. `playerCount` vs. la longitud del array `selection.heroes`

`playerCount` vive en `session.value.context.playerCount` — es un campo **obligatorio** de `SessionContext` (`engine/types.ts:96`), fijado una única vez en `start(gameId, context)` (`useGameSession.ts:19-23`) a partir de `MiniSetupScreen` (`index.vue:155`, `start(gameId, { playerCount: playerCount.value, difficulty: difficulty.value })`), y **nunca cambia durante la vida de la sesión** — no hay ningún `next`/`prev`/`jumpTo` que lo toque, y no hay ninguna UI en el alcance de esta fase (ni de ninguna futura, según el roadmap) para cambiar el número de jugadores a mitad de partida.

`sessionContextLabel` (`useGameSession.ts:82-86`) ya lo lee como fuente de verdad para la cabecera (`${playerCount} jug · ...`), confirmando que es el sitio correcto también para derivar cuántas filas de jugador pinta la rejilla — **nunca** se debe derivar el número de filas de `selection.heroes.length` (eso sería invertir la dirección de verdad: `playerCount` manda, `heroes[]` se ajusta a él, no al revés).

**El desajuste sí puede ocurrir, aunque hoy `playerCount` sea inmutable en vivo:** una sesión guardada por una build anterior de esta misma fase (durante desarrollo, o un `localStorage` editado a mano) podría tener `selection.heroes.length !== context.playerCount` tras un `resume()` — `isValidContext()` no lo comprueba (solo mira `playerCount`/`difficulty`, `persistence.ts:45-49`), así que `resume()` restauraría ese array tal cual, desajustado.

**Regla defensiva recomendada:** la computed que construye las filas de jugador para `StepScreen` (en `useGameSession.ts` o en la página) debe **derivar siempre desde `playerCount`**, no leer `heroes.length` directamente:
```typescript
const playerRows = computed(() => {
  if (!session.value?.context.selection) {
    return Array.from({ length: session.value?.context.playerCount ?? 0 }, () => ({ heroId: null, playerName: '' }))
  }
  const { playerCount } = session.value.context
  const heroes = session.value.context.selection.heroes
  return Array.from({ length: playerCount }, (_, i) => heroes[i] ?? { heroId: null, playerName: '' })
})
```
Esto cubre a la vez el caso "sin selección" (D-20) y el caso "array desajustado" con la misma lógica — nunca hace falta un `if` especial para el segundo caso porque `Array.from({length: playerCount}, (_, i) => heroes[i] ?? default)` ya trunca/rellena automáticamente. [VERIFIED: lectura directa de `useGameSession.ts`, `index.vue:155`, `engine/types.ts:96`, `persistence.ts:45-49`]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Búsqueda tolerante a acentos | Un motor de búsqueda difusa/fuzzy propio | `String.prototype.normalize('NFD')` + regex de strip (Q4) | A N=23 cualquier cosa más compleja que un `.includes()` normalizado es sobre-ingeniería; ya es la conclusión de `FEATURES.md §c` |
| Reactividad "manual" de la selección (p. ej. un `watch` propio sobre `selection` con `{deep:true}` para forzar el guardado) | Un segundo `watchDebounced` específico para `selection` | Reasignar `session.value` entero en cada mutador (Q6) | El `watchDebounced` existente en `index.vue` ya cubre CUALQUIER cambio de `context` con tal de que la reasignación sea correcta — añadir un segundo watcher sería una superficie nueva para desincronizarse, no una necesidad real |
| Persistencia de la selección | Una clave de `localStorage` propia para `selection` | Extender `SessionContext` (ya lo hace `context` entero vía `toPersistedPosition`, D-19) | Exactamente el pitfall que `ARCHITECTURE.md` describe como "por qué NO un almacén paralelo" — desincronización de `resume()`/`clear()` |
| Foco/cierre de modal (Escape, velo, ✕) | Un hook de gestión de foco genérico nuevo | Copiar literalmente el patrón de `WarningDetailModal.vue` (`onMounted`/`onUnmounted` + `dismissButton.value?.focus()` + listener de `Escape`) | Ya es el precedente establecido en el propio repo, cero necesidad de generalizar a una tercera abstracción con dos casos de uso |

**Key insight:** Todo lo que esta fase necesita ya tiene un precedente literal en el propio repo (patrón `options[]`, patrón de modal, patrón de mutador puro+reasignación). El riesgo real no es "qué librería usar" — es no seguir esos precedentes al pie de la letra y crear una segunda forma de hacer lo mismo.

## Common Pitfalls

### Pitfall 1: Mutar `session.value.context.selection` in situ en vez de reasignar

**What goes wrong:** La UI se actualiza (proxy reactivo profundo del `ref`), el desarrollador ve la rejilla cambiar en pantalla, da el trabajo por hecho — pero `watchDebounced(session, ...)` nunca dispara porque no es `deep` y la referencia de `session.value` no cambió. Al recargar la página, la selección desaparece. SEL-08 falla en producción sin fallar en desarrollo.

**Why it happens:** Vue 3 hace que la mutación in situ "funcione" para el renderizado, lo cual oculta el bug hasta que alguien recarga de verdad a mitad de partida.

**How to avoid:** Todo mutador de selección pasa por una función pura en `engine/` que devuelve un `EngineSession` nuevo (Q6), igual que `next`/`prev`/`jumpTo`. Nunca escribir `session.value.context.algo = x` directamente en un manejador de evento.

**Warning signs:** Cualquier línea que haga `session.value.context....= ` (asignación de propiedad, no reasignación de `session.value` completo) en `useGameSession.ts` o en cualquier componente.

### Pitfall 2: Añadir la clave nueva dentro de `TextBlockSchema` en vez de `StepSchema`

**What goes wrong:** Si `selection` se añadiera a `TextBlockSchema`, heredaría automáticamente el mecanismo `.partial()` de variantes de dificultad (`StepSchema.variants.difficulty.normal/expert: TextBlockSchema.partial()`), permitiendo (sin sentido) declarar `selection` distinto por dificultad — una superficie de esquema que nadie pidió y que `superRefine` tendría que empezar a validar por huérfanos, igual que hace con `warningDetail`/`optionsWarning`.

**Why it happens:** `TextBlockSchema` es el sitio donde "ya viven los opcionales del paso", así que es la ubicación por defecto que alguien tecleando rápido probaría primero.

**How to avoid:** `selection` va en `StepSchema.extend({...})` (`schema.ts:68-79`), al lado de `kind`, no dentro de `TextBlockSchema`.

**Warning signs:** `selection` apareciendo dentro de `variants.difficulty.normal`/`expert` en el JSON de contenido — no tiene sentido semántico y sería una señal de que se metió en el schema equivocado.

### Pitfall 3: Bumpear `contentVersion` "por si acaso"

**What goes wrong:** Un bump de `contentVersion` sin necesidad fuerza `resume()` a caer por la rama `content-changed` (`persistence.ts:78-80`) para **cualquier** sesión en curso en el momento del despliegue — exactamente el escenario que D-19/`<specifics>` de `06-CONTEXT.md` dice explícitamente que no le importa a este grupo, pero que tampoco hay ninguna razón para provocar sin necesidad real.

**Why it happens:** `ARCHITECTURE.md` (documento de un milestone anterior a esta fase) sugería el bump "como higiene" para un campo distinto (`showsValue`); es fácil generalizar esa sugerencia sin releer si aplica aquí.

**How to avoid:** No tocar `contentVersion` (queda en `13`) — el análisis de Q1 demuestra que ninguna de las tres comprobaciones de `resume()` se dispara por esta clave.

**Warning signs:** Un diff que cambia `"contentVersion": 13` sin que ningún `text`/`speech`/estructura de pasos haya cambiado.

## Code Examples

### Extensión de `StepSchema` (D-02)

```typescript
// engine/schema.ts — dentro de StepSchema.extend({...}), sibling de `kind`
const StepSchema = TextBlockSchema.extend({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  kind: z.enum(['step', 'summary']).default('step'),
  // D-02 (Fase 6): declara que este paso pinta la rejilla de selección de
  // villano/héroes. Enum de un solo miembro (no booleano) para que un
  // segundo valor futuro (p. ej. Warhammer 40.000) sea aditivo, no un
  // cambio incompatible. Sin dependencia cruzada que validar en
  // superRefine — a diferencia de warningDetail/optionsWarning, es un
  // flag solitario.
  selection: z.enum(['characters']).optional(),
  variants: z.strictObject({ /* sin cambios */ }).optional(),
  citation: CitationSchema.optional(),
})
```

### Test de D-20 (resume sin `selection`)

```typescript
// engine/__tests__/persistence.test.ts — nuevo caso
it('D-20: resume() con context sin selection se restaura utilizable, sin undefined propagándose', () => {
  const persisted: PersistedPosition = {
    formatVersion: 1,
    gameId: 'marvel-champions',
    contentVersion: fresh.contentVersion,
    runtimeId: fresh.sequence[0].runtimeId,
    round: 1,
    context: { playerCount: 3, difficulty: 'normal' }, // sin `selection`, forma pre-Fase-6
    updatedAt: new Date().toISOString(),
  }
  const { session, outcome } = resume(persisted, fresh)
  expect(outcome).toBe('resumed')
  expect(session.context.selection).toBeUndefined() // estado normal, no un bug — StepScreen debe pintar '—'
})
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `selection` debe ser `z.enum(['characters']).optional()` en vez de booleano, y vivir en `StepSchema` no en `TextBlockSchema` | Q1 / Code Examples | Bajo — es una decisión de forma interna reversible antes de que se autore ningún segundo juego; no afecta a ningún requisito SEL-* directamente |
| A2 | No hace falta bumpear `contentVersion` (extensión razonada de D-19, no D-19 literal) | Q1, Pitfall 3 | Bajo — si el planner prefiere ser más conservador y bumpear igualmente, no rompe nada; solo fuerza un `content-changed` en sesiones activas durante el despliegue de esta fase, que el propio usuario ya dijo que no le importa |
| A3 | Tratar `ñ→n` como match válido en el filtro (NFD strip incluye la tilde de `ñ`) es la elección correcta para SEL-05/D-08, no un bug | Q4 | Medio — si algún alias español futuro sí necesitara distinguir `ñ`/`n` (no ocurre en los 23 actuales), habría que revisar la función; documentado explícitamente como decisión, no como descuido |
| A4 | Nombre y ubicación exactos de los ficheros nuevos (`engine/selection.ts`, `app/composables/useCharacterCatalogue.ts`, `app/composables/useHeroSearch.ts`) son sugerencias, no nombres bloqueados | Architecture Patterns / Q3 / Q4 | Bajo — `06-CONTEXT.md` deja esto expresamente a discreción del planner |

**Si esta tabla estuviera vacía:** no lo está — hay cuatro asunciones, todas de bajo/medio riesgo y todas explícitamente delegadas a discreción de research/planning por `06-CONTEXT.md`.

## Open Questions

1. **¿Merece la pena un test de integración (más allá de los tests puros) que confirme que abrir `PlayerModal`/`VillainPickerModal` efectivamente desactiva los atajos de teclado en el navegador real?**
   - Lo que sabemos: la lógica pura (`isEditableTarget`, `shortcutsEnabled`) ya está testeada y correcta; lo que falta es el cableado en `index.vue` (el nuevo `ref` `activeSelectionModal` alimentando `atajosActivos`).
   - Lo que no está claro: como no hay entorno de test de componentes (Q7), este cableado no es testeable automáticamente hoy.
   - Recomendación: verificación manual explícita en la fase (teclear un espacio dentro del campo Nombre con el modal abierto y confirmar que el paso no avanza), documentada como paso de verificación humana, no como test automatizado — coherente con cómo el resto del proyecto verifica el árbol de componentes.

2. **¿Dónde vive exactamente el mapa de alias español — fichero TS separado o embebido en el composable de búsqueda?**
   - Lo que sabemos: D-05 solo prohíbe que entre en `content/marvel-characters.json`; todo lo demás es discrecional.
   - Lo que no está claro: si el mapa completo de 23 alias (pendiente de D-07, revisión humana contra las cartas físicas) resulta largo, un fichero propio (`app/data/spanish-hero-aliases.ts` o similar) es más legible que embebido; si es corto, un objeto inline junto al composable basta.
   - Recomendación: empezar embebido junto a `useCharacterCatalogue.ts` o `useHeroSearch.ts`; extraerlo a fichero propio solo si crece incómodo — decisión de bajo coste, reversible.

## Security Domain

`security_enforcement` no aparece en `.planning/config.json` → tratado como activo por defecto. Esta fase no introduce autenticación, sesión de servidor, ni criptografía (la app sigue sin backend) — la superficie de seguridad relevante es mínima:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — sin backend, sin cuentas |
| V3 Session Management | no | N/A — `SessionContext` es estado de cliente en `localStorage`, no una sesión de servidor |
| V4 Access Control | no | N/A |
| V5 Input Validation | sí | El nombre de jugador (único input de texto libre de toda la app hasta ahora) se interpola siempre como texto (T-01-01, ya establecido), nunca como HTML; `maxlength="14"` en el propio `<input>` acota la longitud en el cliente. No hace falta sanitización adicional porque Vue interpola por defecto de forma segura (`{{ }}`, nunca `v-html`) |
| V6 Cryptography | no | N/A — nada que cifrar |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS vía nombre de jugador tecleado a mano (único input libre nuevo de esta fase) | Tampering/Elevation | Interpolación de texto de Vue (`{{ playerName }}`), nunca `v-html` — ya es la convención establecida en todo el proyecto (T-01-01); no se necesita ninguna librería de sanitización porque no se renderiza HTML crudo en ningún punto |
| Corrupción de `localStorage` editado a mano (nombre/heroId inválido inyectado manualmente) | Tampering | `isValidContext()`/`isPersistedPosition()` ya tratan cualquier forma inesperada como "ausencia de dato", nunca como error — mismo criterio defensivo que Q8 recomienda extender a `selection.heroes` (rellenar/truncar por `playerCount`, nunca confiar ciegamente en la longitud persistida) |

## Sources

### Primary (HIGH confidence — lectura directa de código)
- `engine/schema.ts` (216 líneas, completo) — patrones de campo opcional dependiente, `z.strictObject`/CR-01
- `engine/types.ts` (193 líneas, completo) — `SessionContext`, `StepDefinition`, catálogo de Fase 5
- `engine/persistence.ts` (91 líneas, completo) — `resume()`, `isValidContext()`, `toPersistedPosition()`
- `engine/audio.ts` (48 líneas, completo) — `collectSpeechEntries`/`collectAudioIds`
- `engine/__tests__/voice-drift.test.ts` (134 líneas, completo) — gate de deriva contenido↔audio
- `app/composables/useGameContent.ts` (22 líneas, completo) — patrón de import estático de contenido
- `content/games-index.ts` (13 líneas, completo)
- `app/composables/useStepShortcuts.ts` (169 líneas, completo) + `app/composables/__tests__/useStepShortcuts.test.ts` — `shortcutsEnabled`/`isEditableTarget`
- `app/composables/useGameSession.ts` (102 líneas, completo) — única costura reactiva, mutadores existentes
- `app/pages/[game]/index.vue` (fragmentos leídos: 1-60, 190-260, 380-420, 490-560) — `watchDebounced`, `activeDetail`, `atajosActivos`
- `app/components/StepScreen.vue` (80 líneas, completo) — patrón `options[]` a reutilizar
- `app/components/WarningDetailModal.vue` (80 líneas, completo) — precedente de foco/cierre de modal
- `app/components/IndexOverlay.vue` (fragmentos) — patrón de barra de título `h-16`
- `vitest.config.ts` (completo) — dos proyectos, ambos `environment: 'node'`, sin DOM
- `package.json` (completo) — dependencias reales, sin paquete nuevo necesario
- `content/marvel-characters.json` (verificado con script: 23 héroes, 3 villanos, campos exactos)
- `engine/catalogueSchema.ts` (fragmento) — confirma segundo fichero que importa zod
- `.planning/REQUIREMENTS.md` §SEL — los 9 requisitos literales
- `.planning/config.json` — `nyquist_validation: false`, sin `security_enforcement` explícito

### Secondary (MEDIUM confidence — WebSearch verificado contra MDN)
- MDN `String.prototype.normalize()` — soporte de navegador (Safari 10+, universal en el rango de esta app) y patrón NFD+strip de marcas combinantes
- MDN `Intl.Collator` — comportamiento de `sensitivity: 'base'` y tratamiento de `ñ` como letra distinta de `n` en colación española tradicional

### Tertiary
- Ninguna fuente de baja confianza sin verificación cruzada usada en este documento.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no hay paquete nuevo, todo verificado contra `package.json` real
- Architecture: HIGH — patrón `next`/`prev`/`jumpTo` y arquitectura de `SessionContext` ya verificados línea a línea, no inferidos
- Pitfalls: HIGH para los mecanismos de código (reactividad, gate de voz, resume); MEDIA para el comportamiento exacto de `normalize()` en un iPad físico (no verificable desde este entorno)

**Research date:** 2026-09-08
**Valid until:** 30 días — el código base es estable y la investigación está anclada a líneas concretas ya committeadas, no a versiones de librerías externas que puedan cambiar
