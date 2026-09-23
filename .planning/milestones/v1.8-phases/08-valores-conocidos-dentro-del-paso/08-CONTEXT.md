# Phase 8: Valores conocidos dentro del paso - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Cuatro pasos de la **preparación** que citan una cifra que la app ya sabe calcular la
muestran en pantalla: **entre paréntesis** cuando el valor es único para toda la mesa
(vida del villano), o como **lista compacta por jugador** cuando difiere (vida inicial de
identidad, mano inicial). El valor se compone **en el renderizado**, a partir del catálogo
de la Fase 5 y la selección de la Fase 6 — nunca dentro del contenido guardado.

**En alcance:**
- Una clave nueva en el esquema de paso (`engine/schema.ts`) y su declaración en los
  cuatro pasos afectados de `content/marvel-champions.json`.
- Un módulo nuevo del motor que resuelve el valor a pintar, reutilizando las funciones de
  cálculo que la Fase 7 ya escribió.
- Dos superficies de renderizado en `StepScreen.vue`: el paréntesis dentro de la frase
  grande y la lista por jugador bajo ella.
- La costura reactiva correspondiente en `useGameSession.ts`.

**Fuera de alcance:**
- **`ronda.jugadores.02`** («Descartad o robad hasta el tamaño de vuestra mano»), el único
  paso candidato del bucle de ronda → ver **D-06**. Consecuencia estructural: **toda esta
  fase vive en la preparación**, así que la lista de valores y la banda de contadores de
  la Fase 7 **nunca coinciden en pantalla** (D-07 de la Fase 7: la banda solo existe donde
  `sectionRepeats === true`). El planner no necesita presupuesto de altura para nada.
- **Rastrear la cara Héroe / Alter-Ego de cada jugador** — capacidad nueva sin requisito,
  ver `<deferred>`.
- Cualquier cambio en `text` o `speech` de cualquier paso (VAL-04), y por tanto cualquier
  regeneración de audio (VAL-05) o cambio en la locución (VAL-06).
- Etapas II/III del villano, contador de amenaza, fichas de estado, editor de catálogo —
  exclusiones **permanentes** de `PROJECT.md` que `PITFALLS.md` §14 predice que reaparecen
  cada vez que se toca una cifra. Reconócelas y decline en el momento.

**Aviso al verificador — el criterio de éxito nº 5 del ROADMAP dice «37 clips»: son 35.**
Verificado hoy: 35 ficheros en `public/audio/`, 35 entradas en `scripts/voice/manifest.json`.
El «37» es un dato heredado y ya erróneo de v1.7 (la Fase 6 lo detectó, `PROJECT.md` y el
archivo de v1.7 siguen sin corregirse — sigue fuera de esta fase). **El criterio se cumple
con 35 clips intactos**, no debe fallar por buscar dos que no existen.

</domain>

<decisions>
## Implementation Decisions

Numeración local de la fase (las Fases 4, 5, 6 y 7 también reiniciaron en D-01).

### Cómo se marca un paso que lleva valor

- **D-01 (TECH-04):** El paso **declara la clave en el JSON**, calcada de
  `selection: "characters"` de la Fase 6. **No** hay tabla de ids en `engine/` ni en `app/`
  (cablearía identificadores de contenido fuera del contenido: es la disciplina que D-24 de
  la Fase 2, D-02 de la Fase 6 y D-07 de la Fase 7 impusieron tres veces seguidas), y **no**
  se deduce del texto del paso (una reescritura de una frase rompería el valor en silencio,
  sin que ningún test lo notara).

  **Consecuencias que el planner debe dar por sabidas, no redescubrir:**
  - Añadir una clave **no toca `text` ni `speech`**, así que VAL-04 se cumple por
    construcción.
  - **`contentVersion` NO se bumpea** (sigue en **13**). Precedente exacto y verificado: la
    Fase 6 añadió `selection` sin bumpearlo. Bumpear descartaría la partida en curso de
    cualquiera que esté jugando, a cambio de nada.
  - `StepSchema` es `z.strictObject` (CR-01 de la Fase 2): una clave no declarada en
    `engine/schema.ts` **lanza**. Declararla en el esquema no es opcional, y CI lo verifica
    solo.
  - El gate de deriva de voz solo hashea `speech` (`engine/__tests__/voice-drift.test.ts`),
    así que **una clave nueva no pide regenerar ni un clip**.

- **D-02:** La clave es un **enum plano de tres valores**:
  `"value": "villainHealth" | "heroHealth" | "handSizeAlterEgo"`.
  Que se pinte **paréntesis (VAL-01) o lista (VAL-02) se deriva del propio tipo** —
  `villainHealth` es único para la mesa, los otros dos son por jugador— así que **no hay un
  segundo campo de «alcance»** que pueda contradecir al primero, ni un refinamiento de Zod
  que validar.
  **Descartado** el objeto `{ kind, scope }` (crea un estado imposible que hay que
  defender). **Descartado** el array de valores por paso (ninguno de los pasos candidatos
  cita dos cifras; abriría el diseño de «¿dos paréntesis? ¿dos listas?» sin caso real).

- **D-03 (alcance exacto — cuatro pasos, todos de preparación):**

  | Paso | `value` | Forma |
  |---|---|---|
  | `setup.escenario.02` — «Ajustad el dial de vida del villano al valor indicado…» | `villainHealth` | paréntesis |
  | `setup.heroes.03` — «Ajustad vuestro dial de salud a la vida inicial de vuestra identidad.» | `heroHealth` | lista |
  | `setup.manos.02` — «Robad cartas hasta completar vuestra mano inicial.» | `handSizeAlterEgo` | lista |
  | `setup.manos.03` — Mulligan, «…y robar de nuevo hasta vuestra mano inicial.» | `handSizeAlterEgo` | lista |

  El **mulligan entra**: cuesta exactamente una clave más y es justo el momento en que
  alguien está contando cartas en la mano, donde la cifra vale más que en el paso anterior.
  **Ninguno de los cuatro** lleva rejilla `ELECCIÓN` (esa clave vive solo en
  `setup.heroes.01`) ni bloque `Opciones` — verificado en el contenido. Solo el mulligan
  lleva además una línea de aviso `⚠` (ver D-12).

- **D-04:** El cálculo vive en un **módulo nuevo del motor** (candidato natural:
  `engine/stepValues.ts`, hermano de `selection.ts` y `counters.ts`) que **reutiliza**
  `computeInitialVillainHealth` y `computeInitialHeroHealth` de `engine/counters.ts` en vez
  de reimplementar aritmética que ya está testeada.
  **Descartado** ampliar `engine/counters.ts`: ese módulo gobierna la semántica de
  *congelado al primer toque* (D-09 de la Fase 7), que aquí es explícitamente **la
  equivocada** (ver D-13), y `handSizeAlterEgo` no es un contador de nada.
  **Descartado** resolverlo como computed en `useGameSession.ts`: sacaría lógica pura de la
  capa que tiene tests unitarios.

### Qué cifra es la correcta (fidelidad de reglas)

- **D-05 (contrastado contra el Rules Reference v1.7, Apéndice II):** La mano inicial de
  `setup.manos.02` y del mulligan es **`handSizeAlterEgo`, no `handSizeHero`**.
  Fuente literal, Apéndice II paso 1: *«Each player selects one identity, placing their
  **alter-ego side face up**»*, y no hay ningún volteo a Héroe en los 16 pasos de
  preparación. El propio contenido ya lo dice: `setup.heroes.02` es «Colocad vuestra
  identidad por el lado Alter-Ego», dos pasos antes.
  Ejemplo comprobable: Spider-Man muestra **6**, no 5.
  **Esta es una corrección de fidelidad que la discusión destapó**, no una preferencia: la
  lectura ingenua («mano de héroe») habría dado la cifra equivocada en los 23 héroes.

- **D-06 (`ronda.jugadores.02` queda fuera):** El único paso candidato del bucle de ronda
  **no se marca**. La p. 21 del Rules Reference dice que el tamaño de mano es *«the number
  of cards indicated by **their** hand size value»* — el de la cara boca arriba, y la app
  no sabe en qué forma está cada jugador. Enseñar una sola cifra sería falso cada vez que
  alguien se hubiera volteado (`CLAUDE.md`: un asistente que guía mal es peor que no tener
  asistente), y enseñar las dos etiquetadas mete dos números por fila —la densidad que
  VAL-02 existe para evitar— justo en el bucle de ronda, donde la banda de la Fase 7 ya
  ocupa 96px.
  Además, es la carta que esa persona tiene boca arriba delante en ese preciso instante: el
  único de los cinco pasos donde mirar la mesa es más rápido que leer la pantalla.
  **VAL-02 se cumple entero con los cuatro pasos de preparación** («vida inicial de
  identidad, tamaño de mano» — los dos casos están cubiertos).

- **D-07:** El valor del enum se llama **`handSizeAlterEgo`**, nombrando el campo exacto
  del catálogo, para que la conclusión de reglas de D-05 quede visible en el propio
  contenido y no escondida dentro de `stepValues.ts`. Si algún día entrara el paso de
  ronda, `handSizeHero` es el hermano obvio.
  **Descartado** `startingHandSize` (esconde cuál de las dos caras se usa) y `handSize`
  a secas (el catálogo tiene dos campos con ese prefijo — es exactamente la ambigüedad que
  D-05 acaba de resolver).

### Anatomía en pantalla

- **D-08 (VAL-01):** El paréntesis va **dentro del mismo `<p class="text-display">` de
  40px, con el mismo estilo**, interpolado detrás del texto separado por un espacio:
  «…al valor indicado en la carta de villano. **(42)**». Es literalmente lo que escribe
  VAL-01, no estrena ningún elemento ni token, y a un brazo de distancia se lee como una
  sola frase.
  **Descartado** destacar el número con `text-accent` (estrenaría color dentro de la frase
  grande, que hoy es de un solo color en toda la app). **Descartado** un bloque propio
  debajo (parte la lectura en dos y gasta alto vertical).

- **D-09 (VAL-02):** La lista reutiliza **la anatomía de fila de la rejilla `ELECCIÓN`**:
  mismo `max-w-[720px]`, mismo `border-b border-accent/50`, «Jugador 1 · Spider-Man» a la
  izquierda en `text-body` (20px) y **el número a la derecha en `text-heading` (28px)
  negrita**.
  **Regla dura: es un `<div>`/`<p>`, NUNCA un `<button>`, sin chevron `›` y sin `@click`.**
  D-32 de la Fase 2 prohíbe afordancia donde no hay acción, y esta lista no es pulsable.
  Es la jerarquía de la banda de contadores (etiqueta pequeña, cifra grande) aplicada a un
  bloque que la pantalla ya sabe pintar, sin componente ni tamaño tipográfico nuevos.

  ```
  Ajustad vuestro dial de salud a la vida
  inicial de vuestra identidad.                    ← text-display 40px

  Jugador 1 · Spider-Man                    10     ← 20px / 28px negrita
  Jugador 2 · Thor                          14
  Jugador 3 · She-Hulk                      15
  ```

- **D-10:** El bloque **no lleva rótulo** («VIDA INICIAL», «VALORES»…), a diferencia de
  `ELECCIÓN` y `Opciones`. La frase grande justo encima ya dice qué es la lista; un rótulo
  gastaría un renglón de 18px para repetirla y añadiría un literal por cada valor del enum.

- **D-11:** **Sin caso especial para un solo jugador.** Con `playerCount: 1` la lista es
  de una fila; no se colapsa a paréntesis. Una sola regla —`heroHealth` y
  `handSizeAlterEgo` son siempre lista, `villainHealth` es siempre paréntesis— y la pantalla
  se ve igual con 1 que con 4.

- **D-12 (orden en el `<template>`):** **frase grande → lista de valores → aviso `⚠`.**
  La lista ocupa el mismo hueco que la rejilla `ELECCIÓN` ocupa en `setup.heroes.01`: justo
  bajo la frase, antes de los avisos. El `⚠` del mulligan se queda último igual que en
  todos los demás pasos de la app, sin excepción nueva que recordar.

### De dónde sale el número, y qué pasa cuando no se sabe

- **D-13 (regla dura):** El valor pintado sale **siempre del catálogo**
  (`computeInitialVillainHealth` / `computeInitialHeroHealth` / `hero.handSizeAlterEgo`) y
  **nunca de `resolveCounterValues`**. El caso concreto: el grupo vuelve con `‹ ATRÁS`
  desde la ronda a `setup.escenario.02` con el villano ya a 38 de 42 → el paso pinta **42**,
  porque dice literalmente «ajustad el dial al valor **indicado**», es decir la vida inicial
  impresa. Pintar 38 respondería a otra pregunta.
  **`engine/stepValues.ts` no debe importar `resolveCounterValues` en ninguna rama.**

- **D-14 (selección parcial — fila a fila, no todo o nada):** Con cuatro jugadores y solo
  dos con héroe elegido, la lista pinta **solo las dos filas que se saben**. La numeración
  («Jugador 1 …», «Jugador 3 …») ya deja ver quién falta sin escribir un hueco.
  Es VAL-03 aplicado por fila: donde no hay valor, no hay marcador.
  **Consecuencia deliberada: aquí NO se usa «—».** En la banda de contadores (D-12 de la
  Fase 7) y en la rejilla de selección (D-03 de la Fase 6) «—» significa «esto no lo sé»
  porque son superficies **fijas** que siempre están; esta lista es **contenido opcional
  del paso**, y VAL-03 pide expresamente «sin hueco ni marcador». La diferencia es
  intencionada, no una incoherencia a corregir.
  **Descartado** exigir los cuatro héroes para pintar nada: castigaría al grupo que eligió
  tres de cuatro perdiendo tres cifras correctas, y SEL-09 dice que elegir es opcional de
  principio a fin.

- **D-15 (consecuencia de D-14, VAL-03):** Sin **ninguna** selección —el estado normal y
  permanente por SEL-09— los cuatro pasos se pintan **exactamente como hoy**: sin
  paréntesis, sin bloque de lista, sin renglón vacío, sin espaciado reservado. El bloque no
  existe en el DOM, no es que exista vacío.

### Cómo se garantizan VAL-04 / VAL-05 / VAL-06

- **D-16:** **El gate de voz que ya existe, más una revisión explícita del `git diff` en la
  verificación.** Cero código nuevo.
  - `engine/__tests__/voice-drift.test.ts` ya hashea **todos** los `speech` contra
    `scripts/voice/manifest.json`: si alguien tocara uno, el test pide regenerar ese clip y
    la fase falla sola. Eso cubre **VAL-05 y VAL-06** con una red automática.
  - Para los `text`, la verificación de fase comprueba el `git diff` de
    `content/marvel-champions.json` y confirma que las únicas líneas añadidas son las cuatro
    claves `"value"` de D-03.
  **Descartado** un test que congele una huella de cada `text`: mordería también en CI, pero
  **congelaría el contenido para siempre**. Este proyecto ya ha hecho tres correcciones
  legítimas de redacción (los quicks `260831-fkb`, `260901-jg1`, `260902-0oz`); un fixture
  así se convertiría en un trámite que se actualiza sin mirar, que es peor que no tenerlo.

### Claude's Discretion

El usuario no discutió estas y quedan a criterio de research/planning, siempre que respeten
las decisiones de arriba:

- **La forma exacta de los props nuevos de `StepScreen.vue`.** El precedente es
  `selectionRows`: forma en línea, `null` cuando no aplica, ya resuelta por el llamante y
  sin importar ningún tipo del motor. Candidato natural: un `valueSuffix: string | null`
  (p. ej. `" (42)"` o `null`) y un `valueRows: { key, label, value }[] | null`.
- **Los nombres exactos** del módulo (`engine/stepValues.ts`), de la clave del esquema
  (`value`) y de las computed de `useGameSession.ts`.
- **Cómo se formatea la etiqueta de fila** «Jugador 1 · Spider-Man»: debe reutilizar
  `resolvePlayerLabel` de `useHeroSearch.ts` para el nombre (misma regla que D-04 de la
  Fase 7) y el nombre del héroe del catálogo, pero el separador y el truncado quedan
  abiertos. Ojo con `PLAYER_NAME_MAX_LENGTH` (14) y con nombres de héroe largos («Bruja
  Escarlata») en el ancho de 720px.
- **La normalización defensiva** de un `playerCount` o una `selection` manipulados en
  `localStorage`: debe seguir el contrato ya establecido por `resolvePlayerSlots`
  (`engine/selection.ts`) y `resolveCounters` (`engine/counters.ts`) — validar por TIPO,
  nunca lanzar, nunca devolver `undefined`. No hay que inventar un contrato nuevo.
- **Si merece la pena `/gsd:ui-phase 8`.** El ROADMAP **no** trae `UI hint` para esta fase
  (a diferencia de las Fases 6, 7 y 9), y D-08/D-09/D-10/D-12 ya fijan tipografía,
  anatomía y orden reutilizando bloques existentes. Probablemente no haga falta.
- **Dónde viven los tests**: `engine/__tests__/stepValues.test.ts` para las funciones puras,
  y si hace falta ampliar `app/composables/__tests__/useGameSession.test.ts`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y alcance
- `.planning/REQUIREMENTS.md` §VAL — VAL-01..VAL-06 (líneas 56-61).
- `.planning/ROADMAP.md` §«Phase 8» — los 5 criterios de éxito. **Ver el aviso del
  `<domain>` sobre el «37 clips» del criterio nº 5: son 35.**
- `.planning/PROJECT.md` §«Fuera de alcance» — exclusiones permanentes que siguen vigentes.

### Investigación del hito v1.8
- `.planning/research/PITFALLS.md` §14 (creep de alcance: «una vez existe la cifra, todo lo
  adyacente parece gratis») — origen del `<domain>` de esta fase.
- `.planning/research/ARCHITECTURE.md` — disciplina de dónde vive el estado y por qué los
  componentes no importan `~~/engine/*`.

### Contexto de fases anteriores que sigue vinculante
- `.planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-CONTEXT.md` —
  **la referencia principal**: D-07 (la banda solo existe donde `sectionRepeats === true`,
  que es lo que hace que esta fase y la banda nunca coincidan), D-09 (semántica de congelado
  que D-13 rechaza expresamente para el valor del paso), D-12 («—» ≠ 0, y por qué aquí NO
  se usa «—»), D-19 (campo aditivo sin bump), D-04 (`resolvePlayerLabel` y
  `PLAYER_NAME_MAX_LENGTH`), y sus «Cifras de referencia para el cálculo» ya verificadas.
- `.planning/phases/06-selecci-n-de-villano-h-roes-y-jugadores/06-CONTEXT.md` — D-02
  (`selection: "characters"`, el precedente literal de D-01), D-15 (nombre vacío →
  «Jugador N»), D-19 (no bumpear `contentVersion` al añadir una clave), SEL-09 (elegir es
  opcional).
- `.planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md` — forma del catálogo,
  D-11 (`expert` vive en la etapa), y el plan `05-04` que añadió `handSizeHero` /
  `handSizeAlterEgo` contrastados contra el Rules Reference.
- `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-CONTEXT.md` — D-24/D-26
  (derivar del dato, nunca cablear un id de contenido) y **D-32 (sin afordancia falsa: sin
  borde pulsable, sin chevron, sin `@click` donde no hay acción)**, que D-09 aplica.
- `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-CONTEXT.md` — D-05
  (la frase grande es la dominante de la pantalla), que D-08 respeta.

### Restricciones vigentes del proyecto
- `CLAUDE.md` §Constraints — **fidelidad de reglas contrastada contra el Rules Reference
  oficial** (la razón por la que D-05 existe), tablet apaisada legible a un brazo, offline,
  español.
- `CLAUDE.md` §«Version Compatibility» — `zod` sigue siendo Node/test-time y nunca cruza a
  `app/`. `engine/schema.ts` (con zod) se toca; `engine/types.ts` (sin zod) también, y ese
  sí lo importa `app/`.

### Reglamento
- `reference/mc_rulesreference_v17-compressed.pdf` — fuera de control de versiones
  (`.gitignore`), consultar con `pdftotext`. **Los dos pasajes que gobiernan esta fase ya
  están extraídos y citados en D-05 y D-06**: Apéndice II paso 1 (p. 49, cara de Alter-Ego
  boca arriba) y «Hand Size» (p. 21, la cifra es la de la cara boca arriba). No hay ninguna
  otra regla que verificar aquí — el resto de cifras salen del catálogo de la Fase 5.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`engine/counters.ts`** — **la fuente de la aritmética de esta fase.**
  `computeInitialVillainHealth(villain, playerCount, difficulty)` ya resuelve etapa I ×
  `healthPerHero` × nº de jugadores × `expert`, con guardas contra `NaN` y `playerCount`
  manipulado; `computeInitialHeroHealth(hero)` devuelve la cifra plana. D-04 las reutiliza.
  **Lo que NO se reutiliza es `resolveCounterValues`** (semántica de congelado, ver D-13).
- **`content/marvel-characters.json` + `engine/types.ts`** (`CatalogueHero` con
  `health`, `handSizeHero`, `handSizeAlterEgo`; `CatalogueVillain` con `stages`) — tipados
  a propósito **sin zod** para que `app/` pueda importarlos (DC-03 de la Fase 5).
  `app/composables/useCharacterCatalogue.ts` es el acceso ya establecido desde la capa de
  app; `useGameSession.ts` ya lo usa con `getCatalogue(session.value.gameId)`.
- **`app/components/StepScreen.vue`** — el bloque `selectionRows` (líneas del `v-if`
  `selectionRows && selectionRows.length`) es **el molde literal** de D-09: `max-w-[720px]`,
  `grid-cols-1`, `border-b border-accent/50`, `truncate`, interpolación siempre. Copiar su
  estructura **quitando** `<button>`, `@click`, `aria-label` y el chevron `›`.
- **`app/composables/useHeroSearch.ts`** → `resolvePlayerLabel(i, playerName)` — «Jugador N»
  cuando el nombre está vacío. Un solo sitio, ya testeado, reutilizado por la banda de la
  Fase 7 y ahora por esta lista.
- **`engine/selection.ts`** → `resolvePlayerSlots(context)` y `resolveVillainId(context)` —
  normalización defensiva ya escrita: longitud derivada de `playerCount`, valida por tipo,
  nunca lanza.

### Established Patterns
- **Componentes tontos**: ningún componente importa `~~/engine/*`. Si `StepScreen.vue`
  necesita algo del motor, falta una computed en `useGameSession.ts`
  (`showsSelectionGrid`/`showsCounterBand` son los dos precedentes de derivar visibilidad de
  una clave del dato).
- **`z.strictObject` en todo `engine/schema.ts`** (CR-01 de la Fase 2): la clave `value` de
  D-01 **debe** declararse en `StepSchema` o el contenido dejará de validar. Precedente
  exacto y a copiar: `selection: z.enum(['characters']).optional()` en `engine/schema.ts:79`.
- **Interpolación siempre, HTML crudo nunca** (T-01-01): tanto el paréntesis de D-08 como
  las filas de D-09 se pintan con `{{ }}`.
- **Escala tipográfica fija** (`app/assets/css/main.css`): `display 40px / heading 28px /
  body 20px / label 18px`. D-08 usa `display`, D-09 usa `heading` y `body`. **Ningún tamaño
  nuevo.**
- **Funciones puras del motor con test propio** — `selection.ts`, `counters.ts`, `header.ts`
  y `toc.ts` tienen todas su `engine/__tests__/*.test.ts`. `stepValues.ts` también debe
  tenerlo.

### Integration Points
- **`engine/schema.ts`** — `StepSchema` gana `value: z.enum([...]).optional()`, junto a
  `selection`. **`GameDefinitionSchema.contentVersion` no se toca** (sigue en 13).
- **`engine/types.ts`** — el tipo del paso gana el mismo campo opcional (este fichero sí lo
  importa `app/`, así que nada de zod aquí).
- **`content/marvel-champions.json`** — cuatro claves `"value"` añadidas (D-03). **Ni un
  carácter de ningún `text` ni `speech`.**
- **Nuevo `engine/stepValues.ts`** — resolución pura; importa de `counters.ts` y
  `selection.ts`, nunca `resolveCounterValues`.
- **`app/composables/useGameSession.ts`** — computeds nuevas que resuelven el sufijo y las
  filas ya listas para pintar, al lado de `currentText` y `counterCells`.
- **`app/pages/[game]/index.vue`** — pasa los props nuevos a `<StepScreen>`; nada más.
- **`app/components/StepScreen.vue`** — el `<p>` de `actionText` gana el sufijo (D-08) y un
  bloque nuevo entre él y los avisos (D-12).
- **`engine/__tests__/voice-drift.test.ts`, `public/audio/*.m4a` (35),
  `scripts/voice/manifest.json`** — **no se tocan y deben seguir verdes sin regenerar nada**
  (D-16).
- **Workbox / PWA** — nada que hacer: ningún activo nuevo que precachear.

</code_context>

<specifics>
## Specific Ideas

- **La maqueta ASCII de D-09** es la descripción más concreta que existe de la lista, y es
  la que el usuario vio al elegir esa opción frente a las filas planas y la lista sin
  bordes.
- **El usuario eligió las dieciséis decisiones que se le presentaron**, todas coincidiendo
  con la recomendación. Nada quedó delegado con un «tú decides», pero varias áreas
  (nombres de fichero, forma de los props, tests) quedaron explícitamente abiertas en
  `Claude's Discretion`.
- **D-05 y D-06 no salieron de una preferencia sino de abrir el PDF durante la discusión.**
  El Apéndice II paso 1 («alter-ego side face up») y la p. 21 («*their* hand size value»)
  están citados textualmente en las decisiones para que nadie tenga que volver a abrirlo.
  Sin esa lectura, la fase habría mostrado `handSizeHero` en los 23 héroes.
- **La decisión con más consecuencias estructurales es D-06**, y no se tomó por reglas sino
  por honestidad: la app no puede saber la forma de cada jugador, así que no dice nada. El
  efecto lateral —que toda la fase quede confinada a la preparación y no comparta nunca
  pantalla con la banda de contadores— es un regalo, no el motivo.

</specifics>

<deferred>
## Deferred Ideas

- **`ronda.jugadores.02` con las dos cifras etiquetadas** («Ana · Thor → 6 AE / 5 H»,
  D-06) — reconsiderable **con partidas encima**, si en uso real el grupo echa de menos la
  cifra al final de la fase de jugador. El dato ya está en el catálogo desde la Fase 5.
- **Rastrear la cara Héroe / Alter-Ego de cada jugador** (un toggle por jugador, o derivarlo
  del paso de la ronda) — es lo único que permitiría dar **una** cifra correcta en
  `ronda.jugadores.02`. Capacidad nueva, sin requisito en ningún hito; sería su propia fase.
- **Test de huellas de todos los `text`** (D-16) — descartado por congelar el contenido para
  siempre. Anotado para que no se redescubra como «lo que faltaba» en una revisión futura.
- **Corregir el «37 clips» de `PROJECT.md`, del archivo de v1.7 y del criterio de éxito nº 5
  del ROADMAP** (el recuento real y verificado hoy es **35**) — sigue pendiente desde la
  Fase 6 y sigue fuera de esta fase. Candidato claro a `/gsd:quick`.
- **Contador de amenaza, fichas de estado, etapas II/III del villano, editor de catálogo** —
  exclusiones **permanentes** de `PROJECT.md`, no diferidos. Anotadas porque
  `PITFALLS.md` §14 predice que reaparecen cada vez que se toca una cifra: reconócelas y
  decline en el momento.

</deferred>

---

*Phase: 8-Valores conocidos dentro del paso*
*Context gathered: 2026-09-09*
