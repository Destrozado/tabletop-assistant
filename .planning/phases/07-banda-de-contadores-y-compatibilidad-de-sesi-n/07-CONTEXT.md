# Phase 7: Banda de contadores y compatibilidad de sesión - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Durante el **bucle de rondas** aparece una **banda fija de contadores de vida**: una
celda para el villano y una por jugador (tantas como el nº elegido en el mini-setup),
cada una ajustable **solo con ▼/▲**. Los valores arrancan precargados desde el catálogo
de la Fase 5 y la selección de la Fase 6 (villano × nº de jugadores × dificultad; vida
plana del héroe), se guardan dentro de la sesión en curso y sobreviven a recargar la
página. Un contador de héroe en 0 marca a esa persona en la propia banda, sin terminar
la partida ni abrir nada.

Además, esta fase **cierra formalmente COMP-01/COMP-02**: una partida guardada por la
versión de v1.7 ya desplegada se reanuda sin corromperse, y toda la interfaz nueva
(selección de la Fase 6 + contadores de esta) se pinta de forma defensiva cuando la
sesión reanudada no trae los campos nuevos.

**En alcance:**
- El componente de banda, su presupuesto de altura y su anatomía.
- Los campos `counters` en `SessionContext` y sus mutadores puros en `engine/`.
- El cálculo del valor precargado (villano por etapa I × nº de jugadores × dificultad;
  héroe plano).
- El estado «sin vida» a 0 y su reversibilidad.
- El test explícito de compatibilidad con una sesión de v1.7 construida a mano.

**Fuera de alcance:**
- **El número entre paréntesis dentro del texto del paso** (VAL-01..VAL-06) → **Fase 8**.
  Esta fase no toca ningún `text` ni `speech`, ni ninguno de los **35** clips de voz
  pregenerada. (El recuento real verificado es 35, no 37; `PROJECT.md` y el archivo de
  v1.7 siguen diciendo 37 y deberían corregirse fuera de esta fase — ver el `<domain>`
  de `06-CONTEXT.md`.)
- Registro de la partida en el histórico (HIST-\*) → **Fase 9**.
- COMP-03 (actualización de la PWA ya instalada) → **Fase 10**, per REQUIREMENTS.md.
- **Exclusiones permanentes que la existencia del stepper vuelve tentadoras**
  (`PITFALLS.md` §14, reconócelas y decline en el momento): contador de amenaza,
  fichas de estado (Aturdido / Confundido / Duro), cualquier pantalla que edite el
  catálogo, escenario y conjuntos modulares (CONF-02/03).

</domain>

<decisions>
## Implementation Decisions

Numeración local de la fase (las Fases 4, 5 y 6 también reiniciaron en D-01).

### Presupuesto de altura y anatomía de la banda

- **D-01 (HP-02, criterio de éxito nº 1 — decidido ANTES de construir):** La banda es
  un **cuarto hijo flex `shrink-0` de altura fija `h-24` (96px)**, exactamente el mismo
  patrón y la misma altura que `NavBand.vue` (`h-24 shrink-0`). En una tablet apaisada
  de 768px de alto eso son **12,5%**, con ~22px de margen bajo el techo de HP-02.
  `StepScreen` sigue siendo el único `flex-1`: es él quien crece y encoge, nunca la
  banda.
  **Prohibido** que la banda lleve `flex-1` o quede sin tope de altura — es el síntoma
  nº 1 que `PITFALLS.md` §4 pide vigilar.

- **D-02:** Anatomía de cada celda: **etiqueta encima (18px, `text-label`) y `▼ número ▲`
  en una sola línea**, con el número a **`text-display` (40px)**, el mismo tamaño que el
  texto del paso. Los **▼ y ▲ son zonas pulsables de los 96px completos de alto** — el
  objetivo táctil más grande posible sin gastar un píxel extra de presupuesto.

  ```
  ┌────────────┬────────────┬────────────┬────────────┐
  │  VILLANO   │    Ana     │   Bruno    │   Carla    │
  │ ▼   42   ▲ │ ▼   14   ▲ │ ▼   12   ▲ │ ▼    9   ▲ │
  └────────────┴────────────┴────────────┴────────────┘
     ^18px            ^40px
  ```

  **Descartado** número arriba con ▼/▲ como medias celdas debajo (`h-28` = 14,6%, roza
  el techo sin margen). **Descartado** todo en una línea sin etiqueta (`h-20` = 10,4%,
  pero el nombre compite con la cifra en el mismo renglón — justo lo que el tope de
  caracteres de D-15 de la Fase 6 quería evitar).

- **D-03:** La banda va **arriba, justo bajo `AppHeader`**, no encima de `NavBand`. La
  razón es `PITFALLS.md` §13: el error más caro de un contador es el toque accidental, y
  un ▼ pegado al borde superior de SIGUIENTE (65% del ancho de `NavBand`) es exactamente
  eso. Orden final de la pila: `AppHeader` (h-16) → **banda (h-24)** → `StepScreen`
  (flex-1) → `NavBand` (h-24).

- **D-04:** La etiqueta de cada celda de jugador es **el nombre del jugador**, con la
  misma regla que D-15 de la Fase 6: vacío se muestra como «Jugador N», y se reutiliza
  **la constante `PLAYER_NAME_MAX_LENGTH` de `engine/selection.ts` (14)**, nunca otra
  cifra. La celda del villano lleva la etiqueta fija «VILLANO».
  **Descartado** «Ana · Thor» (con 4 jugadores la celda son ~204px y «Carla · Bruja
  Escarlata» se trunca con puntos suspensivos, que es lo que D-15 quiso evitar).
  **Descartado** el nombre del héroe como etiqueta: sin selección —estado normal y
  permanente por SEL-09— dejaría cuatro etiquetas vacías idénticas.

- **D-05 (ancho estrecho):** Cuando el ancho no da para las celdas, la banda **se parte
  en dos filas**: villano arriba (h-24), jugadores abajo (h-24) = 192px en ese viewport.
  El número se mantiene a 40px en cualquier ancho.

- **D-06 (interpretación vinculante de HP-02 — el verificador debe leerla):** El
  presupuesto del ~15% **se mide SOLO en tablet apaisada**, que es el «viewport
  objetivo» que HP-02 nombra literalmente y el que fija `CLAUDE.md` §Constraints. En
  apaisado se cumple con margen (12,5%). **Los 192px de D-05 en viewport estrecho no son
  un incumplimiento de HP-02**, son una decisión explícita. La verificación humana debe
  comprobar (a) el 12,5% en apaisado y (b) que las dos filas aparecen en estrecho — no
  debe medir el 15% fuera del viewport objetivo.

### Cuándo se ve la banda

- **D-07 (HP-01 vs `PITFALLS.md` §4):** La banda se ve **solo en la sección que repite**
  —el bucle de rondas—, y se deriva de **`section.repeats === true`**, nunca del id
  `ronda`. Es la misma disciplina que D-24 de la Fase 2 impuso al índice de salto y D-02
  de la Fase 6 a la rejilla de selección: **nunca cablear un id de contenido en `app/`**
  (TECH-04). «Durante la partida» de HP-01 se interpreta como «durante el bucle de
  rondas».
  Consecuencia gratuita: toda la preparación conserva el alto íntegro para el texto
  grande —que es donde `PITFALLS.md` §4 dice que más falta hace— y `‹ ATRÁS` desde el
  primer paso de ronda hace desaparecer la banda solo, sin código de transición.

- **D-08:** La banda **no se puede plegar ni ocultar a mano**. HP-01 dice «fija y siempre
  visible», y el problema de espacio que `PITFALLS.md` §4 quería resolver con un plegado
  ya lo resuelve D-07 por otra vía: la banda no existe durante el setup. Un plegado
  añadiría un estado que persistir, un gesto que descubrir, y la posibilidad de cerrarla
  sin querer sin saber recuperarla. **Nada nuevo en la cabecera**, que ya lleva sección,
  posición, contexto de partida, voz e índice (D-18 de la Fase 6 ya rechazó ampliarla).

### Valores: precarga, cambios y ausencia de dato

- **D-09 (el modelo de datos de esta fase — HP-05/HP-08):** Un contador vale **`null`
  mientras nadie haya pulsado ▼/▲ en él**, y la banda pinta en su lugar el **valor
  calculado en vivo** desde catálogo + selección + nº de jugadores + dificultad. El
  **primer toque congela un número concreto** en la sesión.

  ```
  context.counters = {
    villainHealth: null,        → pinta 42  (Rhino etapa I, 14 × 3 jug.)
    heroHealth: [null, 12, null] → pinta 14 / 12 / 9
  }
  ```

  Tres cosas salen gratis de este modelo y el planner debe apoyarse en ellas en vez de
  reimplementarlas:
  1. **Cierra el diferido explícito de la Fase 6** («qué pasa con un contador ya ajustado
     si se cambia de héroe a mitad de partida») sin ninguna regla nueva — ver D-10.
  2. **No existe ningún instante mágico de "precarga"** que pueda perderse, saltarse o
     duplicarse (retroceder al setup con `‹ ATRÁS` y volver a entrar no tiene efecto).
  3. Un contador nunca puede quedar en `undefined` ni `NaN` mirando a la pantalla, que
     es el fallo concreto que `PITFALLS.md` §3 describe.

- **D-10 (cierre del diferido de la Fase 6):** Si se cambia el héroe de un jugador a
  media ronda y **su contador ya estaba tocado, se queda con la cifra que tenía**, sin
  avisar, sin preguntar y sin diálogo. El caso real de un cambio a media partida es «nos
  equivocamos al apuntar quién lleva a quién», no «el personaje se transformó»: Ana lleva
  8 de vida de verdad sobre la mesa y recalcular a la vida completa del héroe nuevo le
  borraría el daño recibido. El caso benigno (te das cuenta antes de recibir daño) ya
  está cubierto por D-09: ese contador sigue en `null` y se recalcula solo.
  **Descartado** volver a `null` al cambiar de héroe (destructivo en el caso más
  frecuente). **Descartado** preguntar (D-13 de la Fase 6 eliminó a propósito todo lo que
  hubiera que confirmar).

- **D-11 (etapas del villano — límite de alcance):** **La precarga es la etapa I y nada
  más.** La banda no sabe de etapas, no ofrece cambiar de etapa y no reacciona a que el
  contador del villano llegue a 0. Cuando el grupo voltea a Kang II, sube el contador con
  ▲, igual que haría con el dial físico.
  Ningún requisito de la fase menciona etapas: HP-05 dice «según villano, héroe y nº de
  jugadores». `PITFALLS.md` §14 nombra exactamente esta tentación («una vez existe el
  stepper, todo lo adyacente parece gratis»). El catálogo **ya guarda las tres etapas**
  (D-11 de la Fase 5), así que el día que se quiera, el dato está listo y solo falta
  interfaz. Ver `<deferred>`.
  **Descartado** el salto automático de etapa al llegar a 0: el contador cambiaría solo
  bajo los dedos del grupo, que es justo el tipo de sorpresa que HP-06 prohíbe para los
  héroes.

- **D-12 (sin dato conocido — el estado normal de SEL-09):** Una celda cuyo valor no se
  conoce (nadie eligió villano, o ese jugador no tiene héroe) muestra **«—»**, el mismo
  símbolo que la rejilla de la Fase 6 usa para un hueco vacío (D-03), de modo que el
  símbolo significa lo mismo en toda la app. **▲ arranca en 1** y a partir de ahí es un
  número normal; **▼ sobre «—» no hace nada**.
  **Regla dura que se deriva de esto: «—» NO es 0.** Si el valor por defecto fuera 0,
  una partida sin selección arrancaría con los cuatro jugadores marcados como «SIN VIDA»
  por HP-06 — un fallo visible en la primera pantalla. El planner debe tratar `null` /
  «sin valor» y `0` como estados **distintos**, nunca colapsarlos.
  **Descartado** dejar las flechas inertes hasta elegir personaje: convertiría la
  selección en requisito de hecho, y SEL-09 dice que elegir es opcional de principio a
  fin.

**Cifras de referencia para el cálculo (verificadas contra `content/marvel-characters.json`):**
`difficulty` es `'normal' | 'expert'`. `healthPerHero` es `true` en 8 de las 9 etapas
(Kang II, 18, es plana); `healthPerGroup` es `false` en las nueve. Etapa I con 3
jugadores: Rhino 14×3=**42**, Kang normal 12×3=**36**, Kang experto 15×3=**45**, Ultron
17×3=**51**. La vida de héroe es una cifra plana, sin multiplicar (Thor 14, Iron Man 9,
She-Hulk 15). Cuando `difficulty === 'expert'` y la etapa trae `expert`, se usan sus
cifras — la ausencia de `expert` es un hecho del dominio, no un dato pendiente (Rhino y
Ultron), no un caso de error.

### Gestos del contador

- **D-13 (HP-04/HP-10):** **Un toque = ±1. No hay repetición al mantener pulsado.**
  Cumple HP-10 («sin repetición descontrolada») de la forma más barata posible —no hay
  repetición, luego no puede descontrolarse— y elimina de raíz todo `PITFALLS.md` §13:
  sin `setInterval` no hay fuga de temporizador, ni limpieza en `pointercancel` /
  `pointerleave` / desmontaje, ni dedo que se desliza fuera del botón, ni pestaña en
  segundo plano acelerando el intervalo. En uso real cada golpe baja 3-5 puntos, que son
  3-5 toques.
  **Descartado** repetición con tope duro (500ms/150ms/30 pasos): el bug de «el dedo se
  deslizó fuera y siguió bajando» solo aparece en dispositivo táctil real, que es
  justo lo que esta fase **no puede** probar (el modelo de la tablet de mesa sigue sin
  identificarse desde la Fase 1). **Descartado** toque largo = ±5: D-17 de la Fase 6 ya
  descartó la pulsación larga por invisible.

- **D-14 (regla dura de eventos, `PITFALLS.md` §13):** Cada botón ▼/▲ reutiliza
  **literalmente** el patrón de `NavBand.vue`: el **estado visual de pulsado** va en
  `@touchstart`/`@touchend`/`@mousedown`/`@mouseup` (un `ref` que aplica
  `scale-[0.98] brightness-95` con `transition-transform duration-75`) y **la acción va
  solo en `@click`**. **Prohibido** incrementar o decrementar desde `@touchstart`: es el
  camino directo al doble conteo fantasma de Safari en iOS.

- **D-15 (HP-06/HP-07 — «derrotado»):** Cuando un contador de héroe llega a 0, **la
  etiqueta de esa celda pasa a `ANA · SIN VIDA` en `text-warning`**. Reutiliza el renglón
  de etiqueta que ya existe, así que **no cuesta ni un píxel del presupuesto de D-01**, y
  usa el token de aviso que la app ya emplea para los `⚠` de los pasos. **▼ en 0 no hace
  nada** (no baja de 0) y **▲ vuelve a subir por encima de 0** devolviendo la etiqueta al
  nombre. **La partida no termina y no se abre ningún diálogo** — el Rules Reference v1.7
  dice que los demás jugadores continúan.
  **Descartado** pintar solo el 0 en color de aviso (a un brazo de distancia, distinguir
  un 0 naranja de un 0 normal es mucho más débil que leer la palabra). **Descartado**
  pintar la celda entera con fondo de aviso: 96px de fondo naranja competirían con el
  texto grande del paso, que es lo que la app existe para hacer leer.

- **D-16 (la palabra exacta):** La palabra es **«SIN VIDA»**, no «DERROTADO/A». La app no
  sabe el género de quien juega y «DERROTADA» solo vale para Ana. «SIN VIDA» no tiene
  género, son 8 caracteres (caben con cualquier nombre en una celda de ~204px) y describe
  **el estado del contador**, no a la persona — que es literalmente lo que la banda mide.
  Un solo literal en el código, sin concordancia que resolver nunca.
  **Descartado** «DERROTADO» invariable (es el término del reglamento y la palabra
  literal de HP-06, pero se lee como un error para media mesa, y este grupo son amigos
  concretos, no usuarios anónimos). **Descartado** «K.O.»: rompe el registro del resto de
  la app, que habla en el español de las cartas y no en jerga.
  **Nota para el verificador:** HP-06 usa la palabra «derrotado». Esta decisión la cumple
  en su intención (marca visual clara, sin diálogo, sin fin de partida) con otra palabra,
  y la diferencia es deliberada.

- **D-17 (HP-09 + `PITFALLS.md` §13):** **Los contadores no se operan con teclado, y eso
  se documenta como decisión.** `useStepShortcuts` escucha `keydown` globalmente y su
  guarda `isEditableTarget` solo excluye `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable`,
  no botones — así que con el foco en un ▲, Espacio sigue avanzando el paso, exactamente
  como en v1.7 (su `preventDefault()` ya suprime la activación nativa del botón enfocado,
  per el comentario D-Q1 del propio fichero). **Espacio / Enter / ← se comportan idénticos
  a v1.7 sin ni una excepción nueva**, que es HP-09 al pie de la letra, y `shortcutsEnabled`
  sigue siendo la misma función pura sin una rama más (D-Q2 sigue vigente).
  Se cierra con **un comentario de una línea en `app/composables/useStepShortcuts.ts`** y
  **un test que fija el comportamiento**, para que se lea como decisión y no como un
  descuido que nadie vio — que es lo que `PITFALLS.md` §13 pide expresamente.

- **D-18 (deshacer):** **No hay deshacer más allá de que ▲ deshaga un ▼.** Un contador es
  lo único de esta app cuya operación inversa **es** el otro botón, a un toque y siempre
  visible. El estado de pulsado de D-14 confirma que el toque registró, y el número
  cambiando delante confirma el resultado. Sin repetición al mantener (D-13), un toque
  accidental cuesta exactamente un toque corregirlo.
  **Descartado** un destello del número al cambiar (animación nueva que no existe en
  ningún otro sitio de la app, justo al lado del texto que se quiere leer).
  **Descartado** la pulsación larga para volver al valor precargado —la sugerencia
  literal de `PITFALLS.md` §13— por chocar con D-17 de la Fase 6 y con D-13 de esta.

### Compatibilidad con lo ya desplegado (COMP-01/COMP-02)

- **D-19 (no se reabre — hereda D-19 de la Fase 6):** `counters` entra como **campo
  opcional de `SessionContext`, exactamente igual que `selection`, y NO se bumpea
  `formatVersion`** (sigue en `1`). `engine/persistence.ts` **no se modifica**:
  `toPersistedPosition` ya persiste `context` entero y `resume()` lo restaura entero en
  los dos caminos, así que no hace falta ni una línea de fontanería de persistencia nueva
  y **HP-08 sale gratis** — siempre que los mutadores reasignen (ver D-20).
  Esto **resuelve el conflicto** entre `.planning/research/ARCHITECTURE.md` §a (no
  bumpear) y `.planning/research/PITFALLS.md` §3 (tratarlo como `formatVersion: 2` desde
  el día uno) a favor del primero, por las dos razones que la Fase 6 ya dio y que siguen
  valiendo aquí: es aditivo, y el renderizado defensivo hace falta **de todas formas**
  porque «sin selección / sin contador tocado» es un estado normal y permanente (D-09 y
  D-12), no un caso de compatibilidad. Bumpear no ahorraría ese trabajo; solo añadiría el
  efecto de **descartar la partida en curso**.
  **El planner no debe reabrir esto.** El roadmap dejaba el bump «si alguna vez hace
  falta» en esta fase: la respuesta es que no hace falta.

- **D-20 (regla dura de mutación — heredada de `engine/selection.ts`):** Los mutadores de
  contador viven en el motor como **funciones puras que devuelven una sesión NUEVA**, y
  **reasignan un objeto nuevo en TODOS los niveles que tocan** (`session`, `context`,
  `counters`, el array y la entrada). El `watchDebounced(session, …, 300ms)` de
  `app/pages/[game]/index.vue` **no es profundo**: una mutación in situ actualizaría la
  pantalla igual (por el proxy reactivo del `ref`) pero **nunca dispararía el guardado**
  — los contadores se perderían al recargar, un bug que solo se manifiesta en producción.
  Es literalmente la advertencia que encabeza `engine/selection.ts`.

- **D-21 (el test que cierra el criterio de éxito nº 5):** La fase incluye un test que
  **construye a mano una `PersistedPosition` con la forma de v1.7** —`formatVersion: 1`,
  `context` con solo `playerCount` y `difficulty`, sin `selection` ni `counters`— y
  comprueba que (a) `resume()` la devuelve utilizable y no la descarta, y (b) todos los
  resolvedores de esta fase devuelven valores definidos, con la banda pintando «—» y
  **sin ningún `undefined` ni `NaN` llegando a la interfaz**. El roadmap dice
  explícitamente que **este caso no lo cubre el gate `contentVersion`/`formatVersion`** y
  que debe probarse aparte. Es hermano del test de D-20 de la Fase 6, ampliado a
  `counters`.

- **D-22 (calibración del esfuerzo — hecho del proyecto, no del repo):** El grupo **no
  deja partidas a medias** (frase textual del usuario en la Fase 6). Eso desactiva la
  premisa con la que `PITFALLS.md` §3 califica a COMP-01/02 como «el riesgo más alto del
  hito». Sigue siendo correcto no corromper una sesión guardada —y D-21 lo demuestra—
  pero **no es un criterio por el que valga la pena sacrificar simplicidad**. El planner
  no debe gastar esfuerzo en defender partidas a medias de v1.7 más allá de D-21.

### Claude's Discretion

El usuario no discutió estas y quedan a criterio de research/planning, siempre que
respeten las decisiones de arriba:

- **La forma exacta de `counters` dentro de `SessionContext`.**
  `.planning/research/ARCHITECTURE.md` §a propone
  `{ villainHealth: number | null, heroHealth: number[] }`; **D-09 obliga a que las
  entradas de `heroHealth` también admitan `null`** (`(number | null)[]`), porque «sin
  tocar» es un estado por contador, no global. Adóptese o mejórese respetando eso.
- **Dónde vive el cálculo del valor precargado.** Debe ser una función pura del motor
  (candidato natural: `engine/counters.ts`, hermano de `engine/selection.ts`) consumida
  a través de `useGameSession.ts`, nunca importada desde un componente.
- **El nombre exacto del componente** (`CounterBand.vue` es la propuesta de
  `ARCHITECTURE.md`) y si la celda es un subcomponente propio.
- **El umbral concreto de ancho** en el que la banda pasa a dos filas (D-05), y si se
  resuelve con un breakpoint de Tailwind o con un contenedor.
- **Cómo se deriva «la sección repite» hasta `app/`** (computed nueva en
  `useGameSession.ts` vs campo ya expuesto), mientras no se cablee el id `ronda`.
- **La normalización defensiva de `counters` leído de `localStorage`**, que debe seguir
  el mismo contrato que `resolvePlayerSlots` de `engine/selection.ts`: validar por TIPO
  y no por presencia, longitud siempre derivada de `playerCount` (nunca de
  `counters.heroHealth.length`), nunca lanzar, nunca devolver `undefined` dentro del
  array.
- **Si merece la pena `/gsd:ui-phase 7`** antes de planificar: el roadmap trae
  `UI hint: yes`, la fase estrena un componente persistente nuevo con un presupuesto de
  altura que es criterio de éxito, y las Fases 1, 2 y 6 tuvieron su `UI-SPEC.md`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y alcance
- `.planning/REQUIREMENTS.md` §HP — HP-01..HP-10, y §COMP — COMP-01/COMP-02 (COMP-03 es
  de la Fase 10, no de aquí).
- `.planning/ROADMAP.md` §«Phase 7» — los 5 criterios de éxito. Ver **D-06** para la
  interpretación vinculante del criterio nº 1 y **D-16** para la del nº 3.
- `.planning/PROJECT.md` §«Fuera de alcance» — las exclusiones que siguen vigentes
  aunque el stepper ya exista (amenaza, estados, editor de catálogo).

### Investigación del hito v1.8
- `.planning/research/PITFALLS.md` §4 (la banda se come el texto grande) — origen de
  D-01/D-03/D-07; §13 (UX táctil de los contadores: mis-taps, hold-repeat desbocado,
  doble conteo fantasma, pérdida al recargar, interacción con los atajos) — **el pitfall
  más largo del documento y el más relevante de esta fase**, origen de D-13/D-14/D-17/D-18;
  §3 (bump de forma persistida) — **leído y deliberadamente no seguido**, ver D-19 y
  D-22; §11 (vida de villano plana) — ya resuelto en el catálogo de la Fase 5, ver las
  cifras de referencia en `<decisions>`; §14 (creep de alcance) — origen de D-11 y del
  `<domain>`.
- `.planning/research/ARCHITECTURE.md` §a «Where does the new state live?» — forma
  propuesta de `counters`, por qué NO un almacén paralelo, persistencia gratis vía
  `watchDebounced` + `pagehide`, y su punto 3, que es la fuente del renderizado defensivo
  de D-12/D-21. Su Chunk 3 describe justo esta fase.
- `.planning/research/SUMMARY.md` — síntesis y niveles de confianza.

### Contexto de fases anteriores que sigue vinculante
- `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-CONTEXT.md` —
  **la fuente de la que cuelga media fase**: D-19 (campo aditivo sin bump, que D-19 de
  aquí hereda), D-15 (nombre vacío → «Jugador N», tope de 14 caracteres → D-04), D-12/D-Q2
  (los atajos y `shortcutsEnabled` → D-17), D-13 (nada que confirmar → D-10), D-17
  (pulsación larga descartada por invisible → D-13/D-18), D-03/SEL-09 (elegir es opcional
  → D-12), D-18 (no ampliar la cabecera → D-08), y su `<deferred>` «qué pasa con un
  contador ya ajustado si se cambia de héroe», que **esta fase cierra en D-10**.
- `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-UI-SPEC.md` — el
  contrato visual vigente (tipografía, tokens, la cifra de `PLAYER_NAME_MAX_LENGTH`).
- `.planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md` — D-11 (`expert` vive
  en la etapa, no en el villano) y D-02/D-03 (23 héroes, 3 villanos), que alimentan el
  cálculo de D-09. D-09 de esa fase: nadie edita el catálogo a mano.
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTEXT.md` — D-24/D-26
  (derivar de los datos, nunca cablear el id `ronda` → D-07).
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-CONTEXT.md` —
  D-05 (anatomía del paso: la frase grande es la dominante) y D-11 (estructura de la
  cabecera), que D-01 y D-08 respetan.

### Restricciones vigentes del proyecto
- `CLAUDE.md` §Constraints — **tablet apaisada legible a un brazo de distancia** (la
  fuente literal del «viewport objetivo» de D-06), offline, español.
- `CLAUDE.md` §«Version Compatibility» — `zod` sigue siendo Node/test-time y nunca cruza
  a `app/`.

### Reglamento
- `reference/mc_rulesreference_v17-compressed.pdf` — fuera de control de versiones
  (`.gitignore`), consultar con `pdftotext`. **Relevancia acotada:** el único punto de
  reglas de esta fase ya está resuelto y viene dado por HP-06 — un héroe derrotado no
  termina la partida, los demás continúan. No hay ninguna otra regla que verificar aquí,
  y los valores numéricos salen del catálogo de la Fase 5, no del PDF.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`app/components/NavBand.vue`** — **el modelo literal de esta fase por partida doble.**
  (a) `h-24 shrink-0` es la altura y el patrón de layout que D-01 copia; (b) su
  separación entre estado visual de pulsado (`@touchstart`/`@touchend`/`@mousedown`/
  `@mouseup` sobre un `ref`, con `scale-[0.98] brightness-95 transition-transform
  duration-75`) y acción (`@click` únicamente) es exactamente lo que D-14 exige.
- **`engine/selection.ts`** — **el hermano directo del módulo que hay que escribir.**
  Mutadores puros que devuelven una sesión nueva, `resolvePlayerSlots` como modelo de
  normalización defensiva (valida por TIPO, longitud derivada de `playerCount`, nunca
  lanza), no-op silencioso con `slot` fuera de rango, y `PLAYER_NAME_MAX_LENGTH`, que D-04
  reutiliza en vez de teclear otro número. Su comentario de cabecera es la fuente de D-20.
- **`app/composables/useGameSession.ts`** — la **única costura reactiva** entre motor y
  Vue. Los mutadores de contador y la computed del valor calculado en vivo (D-09) se
  exponen aquí; `showsSelectionGrid` es el precedente exacto de cómo derivar una condición
  de visibilidad del nodo actual (D-07 es su análogo con `section.repeats`).
- **`app/components/StepScreen.vue`** — componente tonto, `flex-1`, con `overflow-y-auto`.
  **No se toca en esta fase**: la banda es un hermano en `app/pages/[game]/index.vue`, no
  un hijo suyo.
- **`content/marvel-characters.json` + `engine/types.ts`** (`CatalogueHero`,
  `CatalogueVillain`, `VillainStage`) — tipados a propósito sin `zod` para que `app/`
  pueda importarlos (DC-03 de la Fase 5). `app/composables/useCharacterCatalogue.ts` ya
  es el acceso establecido desde la capa de app.
- **Token `text-warning`** — ya en uso para los avisos `⚠` de los pasos; D-15 lo reutiliza
  sin introducir color nuevo.

### Established Patterns
- **Componentes tontos**: ningún componente importa `~~/engine/*`. Si el componente de
  banda necesita algo del motor, falta una computed en `useGameSession.ts`.
- **Nunca mutar in situ, siempre reasignar** — ver D-20; el `watchDebounced` no es
  profundo.
- **Persistencia gratis**: `toPersistedPosition` guarda `context` entero
  (`engine/persistence.ts:34`), y `watchDebounced(session, …, 300ms)` +
  `useEventListener('pagehide', …)` de `app/pages/[game]/index.vue` cubren HP-08 sin una
  línea nueva.
- **`clear(gameId)` borra los contadores solos**: «Partida terminada» y «Empezar partida
  nueva» eliminan la clave `tga:progress:<gameId>` entera. Nada que añadir, y nada de
  esta fase debe sobrevivir a ese borrado.
- **Escala tipográfica fija** (`app/assets/css/main.css`): `display 40px / heading 28px /
  body 20px / label 18px`. D-02 usa `display` para la cifra y `label` para la etiqueta,
  sin introducir tamaños nuevos.
- **`z.strictObject` en todo el esquema del contenido** (CR-01 de la Fase 2) — relevante
  solo si esta fase acabara tocando `engine/schema.ts`, que en principio **no debe**:
  `counters` vive en `SessionContext`, que no se valida con `zod`.
- **Interpolación siempre, HTML crudo nunca** (T-01-01): el nombre que teclea el jugador
  se pinta interpolado también en la etiqueta de la banda.

### Integration Points
- **`engine/types.ts`** — `SessionContext` gana `counters?`, campo opcional, junto a
  `selection?` (D-19). `formatVersion` **no se toca**.
- **Nuevo módulo del motor** (p. ej. `engine/counters.ts`) — mutadores puros, resolución
  defensiva y cálculo del valor precargado.
- **`app/composables/useGameSession.ts`** — mutadores expuestos + computed del valor
  pintado (número tocado, o valor calculado, o «—») + la condición de visibilidad de D-07.
- **`app/pages/[game]/index.vue`** — la banda entra como **cuarto hijo del
  `<div class="h-dvh flex flex-col">`, entre `AppHeader` y `StepScreen`** (D-03), con
  `v-if` sobre la condición de D-07. Ojo con el bloque de overlays `fixed inset-0 z-50`
  al final del template: `IndexOverlay`, `ConfirmDialog`, `WarningDetailModal`,
  `VillainPickerModal` y `PlayerModal` siguen pintando por encima de la banda sin tocar
  ningún `z-index` (la disciplina D-U3 de orden en el DOM que ya documenta ese fichero).
- **`app/composables/useStepShortcuts.ts`** — **una línea de comentario, nada más**
  (D-17). La condición de `shortcutsEnabled` no cambia.
- **`engine/persistence.ts`** — **no se modifica** (D-19). Sí se añade el test de D-21 en
  `engine/__tests__/persistence.test.ts`.
- **Workbox** — nada que hacer: no hay activo nuevo que precachear.
- **Los 35 clips de voz y `engine/__tests__/voice-drift.test.ts`** — deben seguir verdes
  sin regenerar ni uno. Esta fase no toca ningún `text` ni `speech`.

</code_context>

<specifics>
## Specific Ideas

- **Las cuatro maquetas ASCII de `<decisions>`** (anatomía de la celda, pila de la
  pantalla, banda sin selección, y celda «SIN VIDA») son las que el usuario vio y aprobó
  al elegir cada opción. Son la descripción más concreta que existe de esta interfaz
  mientras no haya `UI-SPEC.md`.
- **El usuario eligió las once decisiones que se le presentaron**, incluidas dos contra
  la recomendación explícita de Claude —el partido en dos filas en ancho estrecho (D-05,
  frente a «una fila siempre, número encoge») y, en consecuencia, la interpretación de
  HP-02 de D-06—. Nada quedó delegado con un «tú decides».
- **Hecho del proyecto que no se deriva del repo** (aportado en la Fase 6 y que sigue
  gobernando aquí): *«lo de las partidas a medias da igual… es una app propia que usamos
  nosotros y no tenemos nada a medias y cuando la empezamos la terminamos»*. Es la fuente
  de D-22.
- **La palabra «SIN VIDA» de D-16 se eligió por una razón concreta**: la app no puede
  saber el género de quien juega, y el grupo son amigos concretos. Es una decisión de
  producto, no un detalle de copia — cualquier futura pantalla que muestre este estado
  debe usar el mismo literal.

</specifics>

<deferred>
## Deferred Ideas

- **Control de etapa del villano** (un toque en «II» recarga el contador a 18 / 45 en vez
  de subir de uno en uno) — descartado en D-11 por no tener requisito y por
  `PITFALLS.md` §14. **El dato ya está**: el catálogo guarda las tres etapas con su
  `expert` desde la Fase 5. Reconsiderable en un hito posterior **si en uso real subir a
  mano a la etapa II resulta molesto** — decisión con partidas encima, no por anticipado.
- **Repetición al mantener pulsado** (D-13) — reconsiderable solo si aparece un caso real
  de movimiento grande y **solo cuando exista una tablet identificada** en la que probar
  el deslizamiento del dedo fuera del botón, que es donde vive el bug.
- **Deshacer más allá de ▲/▼**, destello de confirmación, pulsación larga para volver al
  valor precargado (D-18) — descartados por coherencia con D-17 de la Fase 6.
- **Contador de amenaza y fichas de estado** (Aturdido / Confundido / Duro) — exclusión
  **permanente** de `PROJECT.md`, no un diferido. Anotada aquí porque `PITFALLS.md` §14
  predice que aparecerá en cuanto exista el stepper, para que se reconozca y se rechace en
  el momento en vez de redescubrirse.
- **Operar los contadores con teclado** (D-17) — no es un diferido con fecha: es una
  decisión de que la app es táctil. Anotada para que la próxima persona que toque
  `useStepShortcuts.ts` la lea como decisión.
- **Corregir el «37 clips» de `PROJECT.md` y del archivo de v1.7** (el recuento real es
  35, verificado en la Fase 6) — sigue pendiente y sigue fuera de esta fase.

</deferred>

---

*Phase: 7-Banda de contadores y compatibilidad de sesión*
*Context gathered: 2026-09-08*
