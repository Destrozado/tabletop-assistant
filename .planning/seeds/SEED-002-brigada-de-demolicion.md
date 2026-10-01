---
id: SEED-002
status: dormant
planted: 2026-10-01
planted_during: entre hitos (v1.8 cerrado, siguiente sin definir)
trigger_when: al arrancar el siguiente hito, o antes si el grupo quiere jugar la Brigada de Demolición con el asistente (el grupo ya tiene la caja desde 2026-10-01)
scope: large
---

# SEED-002: Escenario «Brigada de Demolición» (The Wrecking Crew, pack `twc`)

Solo investigación; el usuario pidió explícitamente no implementar todavía
(2026-10-01). Este documento recoge qué dicen las reglas y qué tendría que
cambiar en la app.

## Fuentes contrastadas

- **Hoja de reglas de la caja** (librillo de 8 páginas del Scenario Pack). El
  usuario la aportó como imagen, procedente de
  https://hallofheroeslcg.com/wrecking-crew/. No se versiona por copyright: si
  hace falta volver a ella, se descarga de ahí o se guarda en `reference/`
  (fuera de git).
- **Cartas, vía API pública de MarvelCDB**: plan principal `07001`/`07001a`,
  villanos y planes secundarios.
- **Rules Reference v1.7**: solo trae una errata del escenario (carta #41, «I've
  Been Waiting For This!»). Las reglas propias del escenario **no** están en el
  RR, solo en la hoja de reglas.

## Reglas del escenario (resumen propio, no transcripción)

**Contenido.** Un plan principal, «Breakout» (en español «Fuga», sin confirmar
contra la carta física). Cuatro villanos, cada uno con su mazo de encuentro de
15 cartas y su plan secundario propio:

| Villano (es / en) | `card_set_code` | Vida A / B (por jugador) | Plan secundario (en) | Amenaza inicial |
|---|---|---|---|---|
| Destructor / Wrecker | `wrecker` | 14 / 18 | Day of Reckoning (`07004`) | 6 |
| Bola de Trueno / Thunderball | `thunderball` | 13 / 16 | Thunderstruck (`07019`) | 5 |
| Martinete / Piledriver | `piledriver` | 11 / 14 | Pile It On! (`07034`) | 3 |
| Bulldozer / Bulldozer | `bulldozer` | 12 / 15 | Clear the Road (`07048`) | 4 |

Nombres españoles de los sets según es.marvelcdb.com. El set común
`wrecking_crew` se llama «Brigada de demolición». Los nombres españoles de los
planes secundarios están pendientes de comprobar contra las cartas físicas.

**Preparación adicional (sustituye partes de la normal):**
1. Tras colocar el plan principal, se ponen en juego los 4 villanos: versión A
   en Estándar, versión B en Experto. Cada villano lleva su propio dial de vida.
2. Cada plan secundario va encima de su villano.
3. Cada mazo de encuentro de villano se baraja por separado y se coloca encima
   de su villano y su plan secundario, dejando hueco para una pila de descartes
   propia.
4. **No se usan las cartas de Némesis ni las Obligaciones.**
5. **No se usan otros conjuntos de encuentro**: ni módulos, ni Estándar, ni
   Experto.
6. La cara 1A pone en juego los 4 planes secundarios y deja el contador de
   villano activo en Destructor. Después se avanza a 1B.
7. Disposición final: 1 plan principal y 4 columnas con villano, plan
   secundario, mazo y descarte. Destructor lleva el contador de villano activo.

**Reglas nuevas en partida:**
- **Villano activo.** Solo el villano con el contador activa en la fase de
  villano. Cualquier carta que diga «el villano» se refiere al activo, y «el
  mazo de encuentros» al mazo del villano activo. Las cartas de aumento y las
  cartas de encuentro que se reparten a los jugadores salen del mazo del
  villano activo.
- **Plan principal (Fuga 1B), respuesta forzada:** tras el paso 1 de la fase
  de villano se pone 1 de amenaza en cada plan secundario. Después el contador
  activo pasa al villano cuyo plan tenga más amenaza; si hay empate, decide el
  jugador inicial. Si el plan principal se completa, los jugadores pierden.
- **Cada villano, al maquinar,** pone la amenaza en su plan secundario, no en
  el principal.
- **Se puede atacar a cualquier villano y frustrar cualquier plan**, sea cual
  sea el activo.
- **Descartes por mazo.** Una carta de encuentro que sale de juego va al
  descarte de su propio mazo. Cuando un mazo de villano se agota, se baraja su
  descarte y se pone una ficha de aceleración en el plan principal (regla
  normal).
- **Planes secundarios de firma.** No pueden salir de juego mientras su villano
  siga en juego, y no se descartan al quedarse sin amenaza. Se retiran cuando
  se derrota a su villano.
- **Villano derrotado.** Se retira junto con su plan secundario; las cartas de
  su mazo que estén en juego se quedan. Si era el activo, el contador pasa al
  villano con más amenaza en su plan (empate: decide el jugador inicial).
- **Victoria:** derrotar a los 4 villanos.
- **Dificultad ajustable:** se pueden mezclar villanos A y B. **Modo extremo:**
  cada villano A en juego con su B debajo; al derrotar al A entra el B, y solo
  se gana tras derrotar a los cuatro B.
- FAQ del RR (Siniestros Seis): con varios villanos, el daño de Arrollar
  (overkill) lo recibe el villano activo. Si hay que activar un villano y
  ninguno tiene el contador, se le pone al de menor orden de activación.

## Qué tendría que cambiar en la app

Hoy la app supone **un villano por partida** en el motor, el contenido, la
interfaz, el histórico y la sincronización.

**1. Modelo: el escenario como unidad seleccionable.** Recomendación: tratar
«Brigada de Demolición» como un único elemento seleccionable (un solo
`villainId`, p. ej. `wrecking-crew`) que dentro tiene 4 villanos. Así el
histórico (`engine/history.ts`), las estadísticas por villano
(`engine/statistics.ts`) y la sincronización (`engine/sync.ts`) siguen con un
solo id y casi no cambian. La alternativa de varios `villainId` por partida
toca los tres y el formato persistido.

**2. Catálogo** (`scripts/catalogue/fetch-marvelcdb.mjs` →
`content/marvel-characters.json`, generado, nunca a mano):
- Hacen falta 8 filas de etapa en `VILLAIN_STAGE_CARDS`. Aquí A/B no son
  etapas I/II: son Estándar/Experto del mismo villano. Encajarían como
  etapa 1 con `expert` (B = `07003`, `07018`, `07033`, `07047`), pero hoy un
  `CatalogueVillain` es un villano, no un grupo. Habría que añadir al
  esquema (`engine/catalogueSchema.ts`) una forma de «escenario con N
  villanos».
- `VILLAIN_SCENARIOS`: `recommendedModuleCode` no aplica porque no hay
  módulos. Hay que ver cómo lo trata `checkMainScheme`, que hoy aborta si no
  coincide.
- `ENCOUNTER_PACKS` gana `twc`. `EXCLUDED_MODULAR_CODES` probablemente gana
  los cinco sets del pack, porque no son módulos elegibles.

**3. Selección e interfaz:**
- `VillainPickerModal.vue`: el escenario aparece como una sola fila, con su
  nombre en español.
- Fila «Módulos» y `ModulePickerModal.vue`: se oculta o se deshabilita en
  este escenario, porque las reglas prohíben otros sets.
- `CounterBand.vue` + `engine/counters.ts`: hoy hay una vida de villano
  (`CounterState.villainHealth: number | null`). Hacen falta 4 vidas, con
  nombre, ajustables por separado, y marcar a cuál le toca. Es el cambio de
  pantalla más grande: la banda debe seguir legible a un brazo de distancia.
- Modo extremo (A y luego B): al llegar a 0 la vida de A, saltaría a la de B.
  Candidato a dejarlo fuera de la primera versión.
- ¿Seguir en la app qué villano es el activo? Las reglas lo resuelven en la
  mesa con un contador físico. La app podría limitarse a recordarlo en el
  paso (más simple) o llevar el contador ella (más estado y más riesgo de
  desincronizarse con la mesa). Decisión del usuario.

**4. Contenido de pasos** (`content/marvel-champions.json`, con
`contentVersion` subiendo):
- Hoy `variants` solo admite `difficulty`. Hace falta una dimensión nueva
  (p. ej. `variants.scenario['wrecking-crew']`) o una condición para
  saltarse pasos en este escenario. Es un cambio de motor
  (`engine/resolve.ts`, `engine/flatten.ts`, `engine/schema.ts`).
- **Pasos a omitir o cambiar en este escenario:**
  - `setup.archienemigos.01`: omitir, no hay Némesis.
  - `setup.encuentros.01`–`.05`: sustituir por «barajad por separado los 4
    mazos de villano» y omitir lo de Estándar, Experto y Obligaciones.
  - `setup.escenario.01`, `.04`, `.02`: 4 villanos, versión A o B según la
    dificultad, 4 diales.
  - `setup.escenario.06`: la 1A pone los 4 planes secundarios y el contador
    activo en Destructor.
- **Ronda:**
  - `ronda.villano.01`: la amenaza del plan principal se coloca igual.
  - Paso nuevo después del paso 1: 1 de amenaza en cada plan secundario y
    mover el contador activo.
  - `ronda.villano.02`: solo activa el villano activo, y la carta de aumento
    sale de su mazo.
  - `ronda.villano.03`: se reparte del mazo del villano activo.
  - Recordatorio de que la amenaza de cada villano va a su plan secundario.
- **Fin de partida:** victoria al derrotar a los 4 villanos;
  `GameOutcomeDialog.vue` / `useGameEndCopy.ts` lo tendrían que decir así.
- **Voz:** cada texto nuevo o variante necesita su clip pregenerado en
  `public/audio/` (`scripts/voice/`) y entrar en `engine/audio.ts`.
- **Citas:** no hay `Citation.source` para la hoja de reglas del escenario
  (hoy solo `rules-reference` | `learn-to-play`). Habría que añadir algo como
  `scenario-rules`.

**5. Tests:** esquema de catálogo, contadores con 4 vidas, resolución de
variantes por escenario, y garantizar que el resto de escenarios no cambia
(ningún paso desaparece en Rhino, Klaw, Ultron ni Kang).

## Tamaño y forma recomendada

Es una **fase, no un quick**: toca motor (variantes por escenario, contadores
múltiples), catálogo y esquema, tres componentes de interfaz, contenido con
voz, y una decisión de producto sobre el villano activo. Se puede entrar con
`/gsd-phase` (añadir fase) + `/gsd-discuss-phase` dentro del siguiente hito.

**Decisiones abiertas para la discusión:**
1. ¿La app lleva el contador de villano activo o solo lo recuerda en el paso?
2. ¿El modo extremo (A y luego B) entra en la primera versión?
3. ¿Se permite mezclar A y B por villano o solo todo A / todo B ligado a la
   dificultad?
4. Nombres españoles del plan principal y de los planes secundarios:
   contrastar con las cartas físicas del grupo.
