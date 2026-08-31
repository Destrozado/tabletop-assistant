---
quick_id: 260831-fkb
slug: regla-cartas-de-estado
type: execute
autonomous: false
files_modified:
  - engine/types.ts
  - engine/schema.ts
  - app/components/StepScreen.vue
  - app/pages/[game]/index.vue
  - content/marvel-champions.json
  - engine/__tests__/content.test.ts

must_haves:
  truths:
    - "Desde el paso de turnos de los jugadores, el aviso de Estados se puede pulsar y abre un modal que explica la regla"
    - "El modal deja claro que un personaje puede tener Aturdido y Confundido a la vez y que recibir uno no quita el otro"
    - "En el paso de los enemigos activan, aviso y detalle hablan de lo mismo"
    - "No se pierde ningún hecho del warningDetail de orden de activación que ya existía"
    - "Ninguna clave speech del contenido cambia, así que ningún clip de audio queda obsoleto"
  artifacts:
    - path: "engine/types.ts"
      provides: "campo optionsWarningDetail en TextBlock"
      contains: "optionsWarningDetail"
    - path: "engine/schema.ts"
      provides: "validación y regla de dependencia de optionsWarningDetail"
      contains: "optionsWarningDetail"
    - path: "app/components/StepScreen.vue"
      provides: "afordancia pulsable del aviso de la lista de opciones"
      contains: "open-options-warning-detail"
    - path: "content/marvel-champions.json"
      provides: "explicación de la regla de Estados y aviso coherente en ronda.villano.02"
      contains: "optionsWarningDetail"
  key_links:
    - from: "app/components/StepScreen.vue"
      to: "app/pages/[game]/index.vue"
      via: "emit open-options-warning-detail -> activeDetail"
      pattern: "open-options-warning-detail"
    - from: "app/pages/[game]/index.vue"
      to: "WarningDetailModal.vue"
      via: "activeDetail con tone warning"
      pattern: "optionsWarningDetail"
---

<objective>
Explicar la regla de las cartas de Estado de Marvel Champions dentro del contenido de la app,
verificada contra el Rules Reference oficial v1.7 (Status Cards, p. 39).

Hoy dos avisos dicen "Atentos a los Estados en los personajes" y la regla no se explica en
ningún sitio de la app. Uno de esos dos avisos (`optionsWarning` en `ronda.jugadores.01`) ni
siquiera es pulsable: se pinta como `<p>` plano en `StepScreen.vue:49`. El otro
(`ronda.villano.02`) sí abre modal, pero su `warningDetail` habla del **orden de activación**
de villano y esbirros, no de los Estados: el aviso promete una cosa y el modal cuenta otra.

El error de reglas que esto deja pasar es concreto y extendido: creer que recibir un Estado
retira el anterior. **Falso.** Un personaje puede tener Aturdido y Confundido a la vez; un
Estado solo se va gastándolo (cancelando la acción que bloquea).

Purpose: es exactamente el tipo de error que esta app existe para evitar (CLAUDE.md, fidelidad
de reglas). Un asistente que guía mal es peor que no tener asistente.
Output: nuevo campo `optionsWarningDetail` de extremo a extremo, texto de la regla en el paso
de turnos de jugador, y `ronda.villano.02` con aviso y detalle por fin coherentes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@engine/types.ts
@engine/schema.ts
@app/components/StepScreen.vue
@engine/__tests__/content.test.ts

<interfaces>
<!-- Contratos ya existentes que el ejecutor NO necesita ir a buscar. -->

engine/types.ts — TextBlock (líneas 19-35):
  text: string
  warning?: string
  warningDetail?: string      // D-32, depende de warning (regla en schema.ts superRefine)
  options?: StepOption[]      // 2-8 entradas, cada una con detail obligatorio
  optionsWarning?: string     // C2/DC-11, hoy SIN detalle asociado — este plan lo cambia
  speech?: string             // PROHIBIDO TOCAR en este plan (ver <hard_constraints>)

engine/schema.ts — topes vigentes:
  text        max 90
  warning     max 60
  warningDetail max 320
  options[].label max 40 / options[].detail max 320
  optionsWarning max 60
  Todos los objetos son z.strictObject: una clave desconocida LANZA (no se ignora).
  superRefine ya contiene, por paso: warningDetail sin warning -> error;
  optionsWarning sin options -> error; labels duplicadas -> error; y las dos
  primeras repetidas por variante de dificultad.

app/pages/[game]/index.vue — el modal ya es compartido por dos disparadores:
  const activeDetail = ref<{ heading: string, body: string, tone: 'warning' | 'neutral' } | null>(null)
  function onOpenWarningDetail()  // heading = warning,      body = warningDetail, tone 'warning'
  function onOpenOptionDetail(i)  // heading = option.label, body = option.detail, tone 'neutral'
  function onDismissDetail()      // devuelve el foco a detailTriggerEl
  detailTriggerEl se captura leyendo document.activeElement en el instante del emit.

app/components/StepScreen.vue — el botón de aviso con detalle ya existe y es el patrón a
copiar para el nuevo (clases exactas en el fichero, líneas 54-63): min-h-12 px-md py-sm
text-body font-normal text-warning border-b border-warning/50, contenido "⚠ {texto} ›".
El glifo ⚠ y el chevron › los antepone SIEMPRE la plantilla, nunca el JSON.
</interfaces>

<content_actual>
ronda.jugadores.01 "Turnos de los jugadores"
  warning: "Atentos al dial del villano"  + warningDetail (dial del villano, 292 car.)
  options: 6 entradas pulsables
  optionsWarning: "Atentos a los Estados en los personajes"   <- MUDO, sin salida
  citation.section: "Player Phase (p. 33) / Player Turn (p. 34); ver también Villain Defeat (p. 45)"

ronda.villano.02 "Los enemigos activan"
  warning: "Atentos a los Estados en los personajes"
  warningDetail (248 car.): "En orden de jugador: primero activa el villano contra ese
    jugador y después cada esbirro enfrentado con él, en el orden que ese jugador elija.
    Sin saltarse a nadie. Solo el villano y los esbirros con la palabra clave Villano
    roban carta de aumento."     <- valioso, NO SE PIERDE
  citation.section: "Villain Phase, paso 2; ver también Boost Cards (p. 9) y Stunned/Confused/Tough"
</content_actual>
</context>

<decisions>
Decisiones de diseño tomadas en la planificación. El ejecutor las aplica, no las revisita.

**D-Q1 — La explicación canónica de los Estados vive en `ronda.jugadores.01`, en un campo
nuevo `optionsWarningDetail`.**
Es el sitio roto (aviso sin salida) y además es el sitio accionable: los Estados cancelan
justo las acciones que el jugador está eligiendo en ese momento (atacar, retirar amenaza).
Es también el único hueco libre de 320 caracteres de toda la ronda: los slots
`warning`/`warningDetail` de ese paso ya los ocupa el dial del villano, contenido verificado
que no se desplaza.

**D-Q2 — `ronda.villano.02` conserva su `warningDetail` de orden de activación; se reformula
su `warning` para que aviso y detalle sean coherentes, sin dejar de mencionar los Estados.**
Motivo no negociable: existe el requisito **CONT-07**, con gate propio en
`content.test.ts` ("aviso de los enemigos activan remite a los Estados", `warning` debe casar
`/estados/i`). Así que el aviso de ese paso no puede dejar de hablar de Estados. La salida es
que el aviso hable de las dos cosas —orden de activación y Estados— y que el detalle también,
añadiendo una frase corta de enganche que remite al concepto ya explicado a fondo en el paso
de turnos de jugador.

Alternativas rechazadas, para que no se reabran:
- *Meter la regla entera de Estados en el `warningDetail` de villano.02 y mover el texto de
  orden de activación a otro paso*: no hay ningún otro paso donde el orden de activación sea
  coherente (villano.01 es colocar amenaza, villano.03 repartir encuentros). Moverlo es
  perderlo de facto.
- *Añadir un paso nuevo para los Estados*: obligaría a autorar una clave `speech` nueva y por
  tanto un clip de audio nuevo — imposible hoy (cuota de la API agotada, 9/37 clips) y
  rompería el recuento duro de 34 nodos.
- *Añadir una 7.ª entrada a `options[]` de jugadores.01*: `options` son cosas que **puedes
  hacer** en tu turno; una regla de Estados no lo es. Falsearía la semántica del bloque.
- *Dejar `optionsWarning` mudo y explicar la regla solo donde ya hay modal*: deja intacto el
  defecto nº1 del encargo (aviso sin salida) y entierra la regla en la fase del villano, que
  no es donde el jugador decide atacar.

**D-Q3 — `contentVersion` se queda en 11. No se sube.**
`engine/persistence.ts:78`: si `contentVersion` no coincide, `resume()` cae en
`contentChangedFallback` → **cursor 0, round 1**. Subirla castigaría a cualquier grupo con una
partida a medias, mandándolos al paso 1, a cambio de una corrección que es solo de texto.
Y no hay riesgo que justifique ese castigo: este plan no añade, quita ni reordena ningún paso,
así que la secuencia aplanada es idéntica y todo `runtimeId` persistido sigue resolviendo.
Regla que queda escrita para el futuro: **se sube `contentVersion` cuando cambia la secuencia
aplanada (ids, orden o recuento), no cuando cambia el texto de un paso existente.**
El gate `contentVersion es exactamente 11` se queda tal cual, verde y sin tocar.

**D-Q4 — Cero cambios en cualquier clave `speech`.**
`engine/audio.ts::collectSpeechEntries()` deriva ids y huellas de audio SOLO de `step.id` y de
`speech` (y de `variants.difficulty[*].speech`). `warning`, `warningDetail` y
`optionsWarningDetail` no entran ahí. Con `speech` intacto, la salida de `collectAudioIds()`
es byte a byte la misma, no hay clip obsoleto y el gate de deriva pendiente de 03.1-03 no se
ve afectado. Tampoco se toca `text` de ningún paso: hoy `text` y `speech` de villano.02 son
la misma frase y no deben divergir.

**D-Q5 — Solo paráfrasis, nunca cita literal del reglamento.**
Restricción legal de CLAUDE.md: no se reproducen textos extensos con copyright. La regla se
reescribe con nuestras palabras y en registro de mesa. Sí se actualizan las `citation` para
apuntar a Status Cards (p. 39), como hace el resto del fichero.

**D-Q6 — Se retira el gate de igualdad C2.**
Hoy `content.test.ts` exige `jugadores.01.optionsWarning === villano.02.warning`. Esa
duplicación literal tenía sentido cuando los dos sitios solo sabían dar la alarma. A partir de
este plan cada sitio dice algo distinto y propio: uno encabeza la explicación de la regla, el
otro encabeza el orden de activación. El gate se sustituye por dos gates independientes (cada
aviso casa `/estados/i` y cada uno tiene su propio detalle no vacío), que es lo que de verdad
se quiere proteger.
</decisions>

<hard_constraints>
1. **NO tocar ninguna clave `speech`** del JSON, ni base ni de variante. Ni añadir, ni editar,
   ni borrar. Verificable (ver Task 3).
2. **NO tocar ninguna clave `text`** de ningún paso.
3. **NO subir `contentVersion`** (D-Q3).
4. **Cero dependencias npm nuevas.**
5. Topes de esquema que el texto nuevo debe respetar: `optionsWarning` ≤ 60, el nuevo
   `optionsWarningDetail` ≤ 320, sin salto de línea, sin el glifo `⚠` (lo antepone la
   plantilla).
6. **Trampa del gate D-08**: ningún campo puede casar
   `/(\d+\s*jugadores?)|(\b(un|dos|tres|cuatro)\s+jugadores?\b)/i`. Concretamente: "ese
   jugador" y "orden de jugador" son seguros; **"un jugador" rompe el test**.
7. `npm run test` debe quedar en verde (hoy 241/241; este plan añade tests, no debe romper
   ninguno).
</hard_constraints>

<tasks>

<task type="auto">
  <name>Task 1: Añadir el contrato optionsWarningDetail y su afordancia pulsable</name>
  <files>engine/types.ts, engine/schema.ts, app/components/StepScreen.vue, app/pages/[game]/index.vue</files>
  <action>
Extiende el modelo con un campo hermano de `optionsWarning`, siguiendo exactamente el patrón
que `warning`/`warningDetail` ya establecen (D-32/DC-8).

1. `engine/types.ts`: añade `optionsWarningDetail?: string` a `TextBlock`, justo después de
   `optionsWarning`. Comenta que es el equivalente de `warningDetail` para el aviso de la
   lista de opciones, que depende de `optionsWarning` (regla de esquema) y que, igual que
   `warningDetail`, **no lleva valor por defecto** a propósito — `app/` nunca debe añadirle un
   `?? fallback` (no copiar el patrón de `kind`, WR-01).

2. `engine/schema.ts`: en `TextBlockSchema`, añade
   `optionsWarningDetail: z.string().max(320).optional()` tras `optionsWarning`. Mismo tope de
   320 que `warningDetail` y que `options[].detail`: es el mismo panel y el mismo presupuesto
   de lectura.
   En el `superRefine`, junto a la regla ya existente "optionsWarning sin options", añade la
   regla espejo de DC-8: si `step.optionsWarningDetail !== undefined` y
   `step.optionsWarning === undefined`, `ctx.addIssue` con mensaje
   `Step "<id>" declares optionsWarningDetail without optionsWarning` — un detalle cuyo
   disparador nunca se pinta es interfaz inalcanzable.
   Añade también la variante por dificultad, copiando la forma de las dos que ya hay:
   `const effectiveOptionsWarning = variant.optionsWarning ?? step.optionsWarning`, y si
   `variant.optionsWarningDetail !== undefined && effectiveOptionsWarning === undefined`,
   emite el issue equivalente con `variant "<level>"`.

3. `app/components/StepScreen.vue`: añade el prop `optionsWarningDetailText: string | null` y
   el emit `'open-options-warning-detail': []`. Dentro del bloque de opciones, sustituye el
   `<p v-if="optionsWarningText">` de la línea 49 por el mismo par condicional que ya usa el
   aviso principal (líneas 54-63):
   - `<button v-if="optionsWarningText && optionsWarningDetailText" type="button" @click="emit('open-options-warning-detail')">` con las clases EXACTAS del botón de aviso ya existente y el contenido `⚠ {{ optionsWarningText }} ›`;
   - `<p v-else-if="optionsWarningText">` idéntico al de hoy, para que un aviso sin detalle
     siga sin afordancia falsa (D-32).
   El componente sigue siendo tonto: nada de importar tipos del motor, nada de v-html.

4. `app/pages/[game]/index.vue`: bindea `:options-warning-detail-text="currentText.optionsWarningDetail ?? null"`
   y `@open-options-warning-detail="onOpenOptionsWarningDetail"` en `<StepScreen>`. Añade
   `onOpenOptionsWarningDetail()` junto a `onOpenWarningDetail`, con la misma mecánica:
   captura `document.activeElement` en `detailTriggerEl` y asigna `activeDetail` con
   `heading: currentText.value.optionsWarning ?? ''`,
   `body: currentText.value.optionsWarningDetail ?? ''` y `tone: 'warning'` (es un aviso, no
   una opción neutra). No añade estado nuevo: sigue habiendo un solo `activeDetail`, así que
   "dos modales abiertos" sigue siendo un estado imposible.
  </action>
  <verify>
    <automated>npm run test 2>&amp;1 | tail -5 &amp;&amp; npm run build 2>&amp;1 | tail -5</automated>
  </verify>
  <done>
`optionsWarningDetail` existe en tipos y esquema con su regla de dependencia (base y variante);
`StepScreen.vue` pinta botón cuando hay detalle y `<p>` plano cuando no; la página abre el
modal compartido con tone 'warning'. `npm run test` verde y `npm run build` sin errores.
Todavía ningún paso del contenido declara el campo — eso es Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Autorar la regla de Estados y hacer coherente el aviso de villano.02</name>
  <files>content/marvel-champions.json, engine/__tests__/content.test.ts</files>
  <action>
**2.1 — `ronda.jugadores.01`** (paso de turnos de los jugadores; perspectiva héroes y aliados):

- `optionsWarning`: reescríbelo para que anticipe el error concreto, no solo dé la alarma.
  Objetivo ≤ 60 caracteres, debe seguir casando `/estados/i`.
  Redacción propuesta: `Atentos a los Estados: no se quitan entre sí` (44 car.).
- `optionsWarningDetail` (NUEVO, ≤ 320, una sola línea, sin `⚠`).
  Redacción propuesta (296 car. aprox. — **cuenta los caracteres antes de guardar**):
  `Aturdido cancela el próximo ataque y Confundido el próximo intento de retirar amenaza: se descarta ese Estado en lugar de la acción, y los costes se pagan igual. Se pueden tener los dos a la vez; recibir uno no quita el otro y solo se van al gastarlos. Duro impide recibir daño hasta que se descarta.`

  Prioridad del presupuesto de 320 caracteres, si hubiera que recortar: (1) que los dos
  Estados coexisten y que recibir uno no quita el otro —esto es el motivo del encargo y **no
  se recorta nunca**—; (2) qué cancela cada uno, que se descarta el Estado en lugar de la
  acción y que los costes se pagan igual; (3) Duro. Quedan deliberadamente fuera por
  presupuesto, y no son deuda: la excepción Steady (palabra clave de pocos personajes) y que
  se puede intentar el ataque aunque no haya objetivo válido solo para gastar el Aturdido.
- `citation.section`: añade al final `; ver también Status Cards (p. 39)`. **No cambies
  `page`** (sigue 33) ni la parte inicial: hay un gate que exige que la sección case
  `/Player Turn \(p\. 34\)/`.

**2.2 — `ronda.villano.02`** (paso de los enemigos activan; perspectiva villano y esbirros):

- `warning`: reformúlalo para que encabece honestamente lo que hay dentro del modal — orden de
  activación **y** Estados. ≤ 60 caracteres y **debe seguir casando `/estados/i`**, porque el
  requisito CONT-07 tiene gate propio.
  Redacción propuesta: `Orden de activación; y los Estados pueden cancelarla` (51 car.).
- `warningDetail`: conserva los cinco hechos que ya estaban y añade el enganche de Estados,
  todo dentro de 320. Los cinco hechos que **tienen que sobrevivir**: (a) se resuelve en orden
  de jugador; (b) primero el villano contra ese jugador y después sus esbirros enfrentados;
  (c) el orden de los esbirros lo elige ese jugador; (d) no se salta a nadie; (e) solo el
  villano y los esbirros con la palabra clave Villano roban carta de aumento.
  Redacción propuesta (296 car. aprox. — **cuenta los caracteres antes de guardar**):
  `En orden de jugador: activa el villano contra ese jugador y luego cada esbirro enfrentado con él, en el orden que ese jugador elija, sin saltarse a nadie. Solo el villano y los esbirros con la palabra clave Villano roban carta de aumento. Aturdido o Confundido cancelan esa activación y se descartan.`
  Esto compacta la redacción, no elimina ningún hecho. Si al contar te pasas de 320, recorta
  de la redacción, nunca de la lista (a)-(e).
- `citation.section`: sustituye el vago `Stunned/Confused/Tough` por la referencia con página:
  `Villain Phase, paso 2; ver también Boost Cards (p. 9) y Status Cards (p. 39)`.
  **No cambies `page`** (sigue 45).

**2.3 — `engine/__tests__/content.test.ts`**, dentro del `describe` de options/optionsWarning:

- **Sustituye** el test `C2 bajo gate de igualdad: ... es exactamente igual a ...` por dos
  aserciones independientes (D-Q6): `jugadores.01.optionsWarning` casa `/estados/i` y declara
  un `optionsWarningDetail` no vacío; `villano.02.warning` casa `/estados/i` y declara un
  `warningDetail` no vacío. Deja un comentario explicando por qué se retira la igualdad.
- **Sustituye** el test `ronda.villano.02 intacto: su warning sigue siendo exactamente
  "Atentos a los Estados en los personajes"` por uno que proteja lo que de verdad importa: que
  su `warningDetail` sigue conteniendo los cinco hechos —regex sobre `/orden de jugador/i`,
  `/esbirro/i`, `/sin saltarse/i`, `/palabra clave Villano/i` y `/carta de aumento/i`— y que
  ya no habla de otra cosa que su aviso: que casa también `/aturdido|confundido/i`.
- **Nuevo test (la regla en sí)**: `jugadores.01.optionsWarningDetail` menciona `/aturdido/i`,
  `/confundido/i` y afirma la coexistencia (`/a la vez/i`), y **no** dice `/sustituye|reemplaza/i`
  (el error que se está corrigiendo).
- **Nuevo test genérico**: todo paso que declara `optionsWarningDetail` declara también
  `optionsWarning`; ninguno supera 320 caracteres ni contiene `\n`.
- **Nuevo gate que muerde**: sobre una copia en memoria de `rawMarvelChampions`, borra
  `optionsWarning` de `ronda.jugadores.01` dejando su `optionsWarningDetail` huérfano y espera
  que `validateGameDefinition` lance.
- **Extiende** el test de D-08 (recuento de jugadores): añade `optionsWarningDetail` al bucle,
  tanto en el bloque base como en las variantes de dificultad.
- **No toques** el test `contentVersion es exactamente 11` (D-Q3): se queda verde tal cual.
  </action>
  <verify>
    <automated>test "$(git diff -U0 content/marvel-champions.json | grep -E '^[+-]' | grep -c '"speech"')" = "0" &amp;&amp; test "$(git diff -U0 content/marvel-champions.json | grep -E '^[+-]' | grep -c '"contentVersion"')" = "0" &amp;&amp; npm run test 2>&amp;1 | tail -5</automated>
  </verify>
  <done>
`ronda.jugadores.01` tiene un `optionsWarningDetail` que explica la regla y desmonta el error
de "un Estado quita al otro"; `ronda.villano.02` tiene aviso y detalle hablando de lo mismo,
con los cinco hechos de orden de activación intactos; ambas `citation` apuntan a Status Cards
(p. 39). El diff del JSON no contiene ninguna línea `"speech"` ni `"contentVersion"`.
`npm run test` verde, con más tests que antes y ninguno roto.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
El aviso de Estados del paso "Turnos de los jugadores" pasa de ser una línea muerta a un botón
que abre el modal con la regla; el aviso del paso "Los enemigos activan" ya no promete una cosa
y cuenta otra.
  </what-built>
  <how-to-verify>
1. `npm run dev` y abre `http://localhost:3000/marvel-champions` en una ventana apaisada tipo
   tablet (~1280×800). Elige nº de jugadores y dificultad.
2. Salta con el índice al paso **"Turnos de los jugadores"** (sección Ronda → Jugadores).
3. Bajo la lista de 6 opciones, la línea `⚠ Atentos a los Estados: no se quitan entre sí`
   debe verse ahora con chevron `›` y subrayado, igual que un aviso pulsable. Púlsala.
   - El modal debe abrirse con ese mismo texto de encabezado y el cuerpo con la regla.
   - Léelo a un brazo de distancia: ¿se entiende que Aturdido y Confundido conviven?
   - Ciérralo: el foco debe volver a la línea del aviso.
4. En ese mismo paso, comprueba que el aviso del **dial del villano** (más abajo, fuera del
   bloque de opciones) sigue pulsando y abriendo su propio modal, sin mezclarse con el nuevo.
   Dos ⚠ pulsables en la misma pantalla: confirma que no resulta confuso en apaisado.
5. Avanza a **"Los enemigos activan"** y pulsa su `⚠`: el encabezado debe hablar de orden de
   activación y Estados, y el cuerpo debe contar el orden de activación completo (villano,
   luego esbirros elegidos por ese jugador, sin saltarse a nadie, carta de aumento) más la
   frase de Estados. Aviso y detalle ya no se contradicen.
6. Contraste de reglas: confirma que la explicación coincide con lo verificado en el Rules
   Reference v1.7 p. 39 y que no repite el error del vídeo (un Estado NO retira al otro).
  </how-to-verify>
  <resume-signal>Escribe "aprobado" o describe qué texto o afordancia hay que ajustar</resume-signal>
</task>

</tasks>

<verification>
- `npm run test` verde (241 tests hoy, más los nuevos de Task 2).
- `npm run build` sin errores.
- `git diff content/marvel-champions.json` no contiene ninguna línea con `"speech"`:
  ningún clip de `public/audio/` queda obsoleto y el bloqueo de cuota de 03.1-03 no se agrava.
- `contentVersion` sigue siendo 11: una partida guardada a medias se reanuda en su sitio.
- Cero dependencias npm nuevas (`git diff package.json` vacío).
</verification>

<success_criteria>
- Desde el paso de turnos de los jugadores se puede pulsar el aviso de Estados y leer la regla.
- La regla deja explícito que Aturdido y Confundido conviven y que un Estado solo se va al
  gastarlo cancelando la acción que bloquea.
- El `warningDetail` de orden de activación de `ronda.villano.02` conserva sus cinco hechos y
  ahora su aviso lo encabeza honestamente.
- CONT-07 sigue satisfecho: el aviso de "los enemigos activan" sigue remitiendo a los Estados.
- Ninguna clave `speech` ni `text` cambió; `contentVersion` sigue en 11.
- Nada del contenido reproduce texto literal del Rules Reference; las citas apuntan a
  Status Cards (p. 39).
</success_criteria>

<output>
Crear `.planning/quick/260831-fkb-regla-cartas-de-estado/260831-fkb-SUMMARY.md` al terminar.
</output>
</content>
</invoke>
