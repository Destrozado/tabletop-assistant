---
quick_id: 260831-pym
slug: retoques-contenido-playtest
phase: quick-260831-pym
plan: "01"
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - content/marvel-champions.json
  - engine/__tests__/content.test.ts
  - engine/__tests__/audio-ids.test.ts
  - engine/__tests__/voice-drift.test.ts
  - engine/__tests__/header.test.ts
  - engine/__tests__/navigator.test.ts
  - engine/__tests__/toc.test.ts
  - scripts/voice/generate.mjs
  - scripts/voice/manifest.json
  - public/audio/ronda.jugadores.02.m4a
  - public/audio/ronda.jugadores.03.m4a
  - public/audio/ronda.villano.02.m4a
  - public/audio/ronda.villano.03.m4a
  - public/audio/ronda.villano.04.m4a
  - app/components/IndexOverlay.vue
  - app/composables/usePreloadedAudio.ts
  - app/pages/[game]/index.vue
  - nuxt.config.ts
  - e2e/offline-flow.spec.ts
  - scripts/voice/styles.mjs

must_haves:
  truths:
    - "El paso de tamaño de mano es UNO solo y dice descartar o robar, más corto que cualquiera de los dos textos que sustituye"
    - "El aviso de mazo de jugador agotado (barajar el descarte y repartirse un encuentro) sobrevive intacto en el paso fusionado"
    - "El detalle del paso fusionado conserva el matiz perdido: descartar va en orden de jugador, robar es simultáneo"
    - "El detalle del paso fusionado sigue diciendo que ahí NO se pone ficha de aceleración (eso es del mazo de encuentros)"
    - "La carta de aumento aparece en el text grande de ronda.villano.02, no solo en su warningDetail"
    - "El warning de orden de activación y Estados de ronda.villano.02 sigue existiendo, con sus seis hechos en el detalle"
    - "ronda.villano.03 ya no dice 'en orden de jugador' en su text; ese matiz vive ahora en su warning, aplicado a las cartas extra"
    - "ronda.villano.04 ya no dice 'desde el jugador inicial' (redundante con 'en orden de jugador')"
    - "El manifiesto de voz cubre exactamente el catálogo del motor: ni sobra ronda.jugadores.03 ni falta nadie"
    - "scripts/voice/manifest.json solo ha sido escrito por scripts/voice/generate.mjs"
    - "npm run test verde con los recuentos NUEVOS y npx playwright test verde"
  artifacts:
    - path: "content/marvel-champions.json"
      provides: "los tres retoques de contenido y contentVersion 12"
      contains: "\"contentVersion\": 12"
    - path: "scripts/voice/generate.mjs"
      provides: "poda de entradas huérfanas del manifiesto (el script sigue siendo su único escritor)"
      contains: "orphan"
    - path: "scripts/voice/manifest.json"
      provides: "36 entradas, sin ronda.jugadores.03"
      contains: "ronda.jugadores.02"
  key_links:
    - from: "content/marvel-champions.json"
      to: "scripts/voice/manifest.json"
      via: "fingerprint(speech) por cada id del catálogo"
      pattern: "ronda\\.villano\\.0[234]"
    - from: "engine/audio.ts collectAudioIds"
      to: "public/audio/*.m4a"
      via: "gate de deriva de voice-drift.test.ts"
      pattern: "collectAudioIds"
---

<objective>
Tres retoques de contenido en `content/marvel-champions.json` detectados en un playtest real, más la regeneración de los audios afectados.

1. **Fusionar** `ronda.jugadores.02` + `ronda.jugadores.03` en un solo paso de tamaño de mano.
2. **Corregir** dos imprecisiones de reglas en `ronda.villano.03` y `.04` (ambas acortan el texto).
3. **Sacar la carta de aumento al texto grande** de `ronda.villano.02`.

Dos de los tres cambios hacen el contenido MÁS fiel al reglamento, no solo más cómodo. El tercero (la fusión) está respaldado por la propia entrada *Hand Size* del Rules Reference, que trata descartar y robar como una única comprobación.

Purpose: un grupo que lee solo el texto grande no puede seguir saltándose la carta de aumento (pasa varias veces por ronda y cambia cuánta amenaza y cuánto daño se aplican), y el fin de fase de jugadores deja de ser dos pantallas para lo que el reglamento resuelve en una.

Output: contenido corregido con `contentVersion: 12`, recuentos de los tests actualizados con motivo explícito, 4 clips regenerados, 1 clip huérfano retirado, suite verde.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@content/marvel-champions.json
@engine/audio.ts
@engine/schema.ts
@scripts/voice/generate.mjs

<rules_source>
El PDF oficial está en local, **no versionado**: `reference/mc_rulesreference_v17-compressed.pdf` (Rules Reference v1.7).
Se consulta página a página, nunca en bloque (el extractor desordena columnas si se le dan varias páginas):

```
pdftotext -layout -f <página> -l <página> reference/mc_rulesreference_v17-compressed.pdf -
```

**Este plan cita el reglamento de memoria del planificador. NO te fíes.** Cada tarea de contenido
lleva su propio paso de re-verificación con el comando exacto: extrae la página, léela, y solo
entonces aplica el cambio. Si alguna cita NO se sostiene, **para y dilo** en vez de aplicar el
cambio igualmente. Un asistente que guía mal es peor que no tener asistente (CLAUDE.md).
</rules_source>

<current_state>
Suite base: **14 ficheros, 293 tests, verde.** `public/audio/` tiene 37 `.m4a`, el manifiesto 37 entradas, estilo `plano-agil`, voz `Rasalgethi`.

Estructura aplanada HOY (34 nodos): índices `0-22` setup `kind:step`, `23` setup `kind:summary`,
`24-27` fase `ronda.jugadores` (4 pasos), `28-33` fase `ronda.villano` (6 pasos).

Estructura aplanada DESPUÉS (33 nodos): `0-22` setup, `23` summary,
`24-26` `ronda.jugadores` (**3** pasos), `27-32` `ronda.villano` (6 pasos).
`loopStartIndex` sigue siendo **24** (el paso que desaparece está dentro del bucle, no antes);
`loopEndIndex` pasa de 33 a **32**.
</current_state>

<id_policy>
**El id superviviente de la fusión es `ronda.jugadores.02`. `ronda.jugadores.03` desaparece.**

`ronda.jugadores.04` **NO se renumera**: la fase queda con los ids `01`, `02`, `04` y un hueco
deliberado en el `03`. Motivo: renumerar obligaría a regenerar un clip más y a mover un `.m4a`
sin ninguna ganancia — los ids son identificadores opacos (nombre de fichero de audio y clave del
manifiesto), no una numeración de cara al usuario. El hueco queda documentado en el test de
CONT-02, que lista los tres ids literalmente.
</id_policy>
</context>

<tasks>

<task type="auto">
  <name>Tarea 1: aplicar los tres retoques al contenido y subir contentVersion a 12</name>

  <read_first>
    - `content/marvel-champions.json` — sección `ronda`, fases `ronda.jugadores` y `ronda.villano`
    - `engine/schema.ts` líneas 27-70 — límites duros: `text` ≤90, `warning` ≤60, `warningDetail` ≤320, `speech` ≤120
    - `reference/mc_rulesreference_v17-compressed.pdf` páginas 17, 21, 23, 32, 45 y 9/10/38 (ver comandos abajo)
  </read_first>

  <files>content/marvel-champions.json</files>

  <action>
**Paso 0 — re-verificar las citas ANTES de tocar nada.** Ejecuta y lee de verdad:

```
pdftotext -layout -f 17 -l 17 reference/mc_rulesreference_v17-compressed.pdf -   # End of Player Phase pasos 1 y 2; Encounter Deck
pdftotext -layout -f 21 -l 21 reference/mc_rulesreference_v17-compressed.pdf -   # Hand Size; Hazard Icon
pdftotext -layout -f 23 -l 23 reference/mc_rulesreference_v17-compressed.pdf -   # In Player Order
pdftotext -layout -f 32 -l 32 reference/mc_rulesreference_v17-compressed.pdf -   # Player Deck (mazo agotado)
pdftotext -layout -f 45 -l 45 reference/mc_rulesreference_v17-compressed.pdf -   # Villain Phase pasos 1-6
pdftotext -layout -f  9 -l  9 reference/mc_rulesreference_v17-compressed.pdf -   # Attack (Enemy Activation): carta de aumento
pdftotext -layout -f 10 -l 10 reference/mc_rulesreference_v17-compressed.pdf -   # Boost, Boost Icon
pdftotext -layout -f 38 -l 38 reference/mc_rulesreference_v17-compressed.pdf -   # Scheme (Enemy Activation): carta de aumento
```

Lo que cada página tiene que confirmar (si alguna no lo confirma, **para**):
- p. 21 *Hand Size*: la comprobación de tamaño de mano es UNA sola, "either discarding down to or drawing up to" — es lo que legitima la fusión.
- p. 17 *End of Player Phase*: el paso 1 (descartar) dice "In player order"; el paso 2 (robar) dice "simultaneously". Ese contraste es el matiz que la fusión debe conservar en el detalle.
- p. 32 *Player Deck*: al vaciarse, se baraja el descarte y el jugador **se reparte a sí mismo una carta de encuentro boca abajo**. No se menciona ninguna ficha de aceleración — esa es la regla del mazo de encuentros (p. 17 *Encounter Deck*). Son dos reglas distintas.
- p. 21 *Hazard Icon*: "Additional cards are dealt in player order" — el orden de jugador se ata a las cartas EXTRA, no al reparto base.
- p. 23 *In Player Order*: ya define que empieza el primer jugador y sigue en sentido horario — "desde el jugador inicial" es redundante.
- p. 9 y p. 38: villano y esbirros con la palabra clave Villano reciben una carta de aumento boca abajo tanto al **atacar** como al **avanzar el esquema**; se voltea, se resuelven sus habilidades "Boost" y el valor del enemigo sube 1 por cada icono de aumento **antes** de aplicar amenaza/daño.

**Paso 1 — CAMBIO 1: fusionar.** Sustituye los DOS objetos `ronda.jugadores.02` y `ronda.jugadores.03` por este ÚNICO objeto, exactamente (copia literal, no parafrasees):

```json
{
  "id": "ronda.jugadores.02",
  "title": "Ajustar el tamaño de mano",
  "kind": "step",
  "text": "Descartad o robad hasta el tamaño de vuestra mano.",
  "warning": "Mazo agotado: barajad el descarte y repartíos un encuentro",
  "warningDetail": "El descarte va en orden de jugador; el robo es simultáneo. Si tu mazo se queda sin cartas, barajad vuestro descarte para formar uno nuevo y repartíos a vosotros mismos una carta de encuentro boca abajo: aquí no se pone ficha de aceleración, eso es solo del mazo de encuentros.",
  "speech": "Descartad o robad hasta el tamaño de vuestra mano.",
  "citation": {
    "source": "rules-reference",
    "section": "End of Player Phase, pasos 1 y 2; ver también Hand Size (p. 21) y Player Deck, mazo agotado (p. 32)",
    "page": 17
  }
}
```

Comprobaciones de este bloque (todas ya verificadas por el planificador, verifícalas tú también):
- `text` = 50 caracteres, más corto que los 69 de `.02` y que los 56 de `.03` que sustituye. Requisito explícito del encargo.
- `warning` = 58 ≤ 60, **literal e intacto** el de `.03`.
- `warningDetail` = 276 ≤ 320, sin salto de línea. Empieza con el matiz que la fusión habría perdido (orden de jugador vs. simultáneo) y desmonta explícitamente la confusión mazo-de-jugador / mazo-de-encuentros.
- Se pierde a propósito la última frase del detalle viejo ("Si tampoco tenéis descarte, el mazo no se rehace..."): no aparece en la p. 32 del Rules Reference, era una inferencia. Anótalo en el SUMMARY.

**Paso 2 — CAMBIO 2a: `ronda.villano.03`.** Tres campos, sustitución exacta:

| campo | ANTES | DESPUÉS |
|---|---|---|
| `text` | `Repartid una carta de encuentro a cada jugador, en orden de jugador.` | `Repartid una carta de encuentro a cada jugador.` |
| `warning` | `Una a cada jugador, más una por cada icono de peligro` | `Una más por icono de peligro, en orden de jugador` |
| `speech` | `Repartid una carta de encuentro a cada jugador, en orden de jugador.` | `Repartid una carta de encuentro a cada jugador.` |
| `citation.section` | `Villain Phase, paso 3` | `Villain Phase, paso 3; ver también Hazard Icon (p. 21) e In Player Order (p. 23)` |

(`citation.page` sigue siendo 45.) El "en orden de jugador" no se borra: se traslada al `warning`, donde queda atado a las cartas extra por icono de peligro, que es a lo único a lo que el reglamento se lo ata. `warning` = 49 ≤ 60.

**Paso 3 — CAMBIO 2b: `ronda.villano.04`.** Solo texto y locución; `warning` y `warningDetail` se quedan como están:

| campo | ANTES | DESPUÉS |
|---|---|---|
| `text` | `Revelad las cartas de encuentro una a una, en orden de jugador desde el jugador inicial.` | `Revelad las cartas de encuentro una a una, en orden de jugador.` |
| `speech` | igual que el `text` de antes | `Revelad las cartas de encuentro una a una, en orden de jugador.` |
| `citation.section` | `Villain Phase, paso 4; ver también Encounter Deck, mazo agotado` | `Villain Phase, paso 4; ver también Encounter Deck, mazo agotado, e In Player Order (p. 23)` |

La asimetría resultante con `.03` es correcta y merece una línea en el SUMMARY: en el paso 3 el orden apenas importa (reparto), en el paso 4 importa de verdad (cada jugador resuelve del todo sus cartas antes de que empiece el siguiente).

**Paso 4 — CAMBIO 3: `ronda.villano.02`, la carta de aumento al texto grande.**

| campo | ANTES | DESPUÉS |
|---|---|---|
| `text` | `El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego.` | `Con carta de aumento: el villano ataca al héroe y avanza el esquema contra el Alter-Ego.` |
| `speech` | `El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego.` | `Con carta de aumento, el villano ataca al héroe y avanza el esquema contra quien esté en Alter-Ego.` |
| `citation.section` | `Villain Phase, paso 2; ver también Boost Cards (p. 9) y Status Cards (p. 39)` | `Villain Phase, paso 2; ver también Attack (Enemy Activation) (p. 9), Boost, Boost Icon (p. 10), Scheme (Enemy Activation) (p. 38) y Status Cards (p. 39)` |

`warning` (`Orden de activación; y los Estados pueden cancelarla`) y `warningDetail` **NO se tocan**: el detalle es lo que sigue precisando quién roba aumento (solo villano y esbirros con la palabra clave Villano) y quién no.

`text` = 88 ≤ 90 y sigue casando con `/héroe/i` y `/alter-ego/i` (gate ADAPT-04/D-33).
`speech` = 99 ≤ 120 y no contiene su propio `warning` (gate D-39).

Erratum de cita encontrado al planificar y corregido arriba: la entrada `BOOST, BOOST ICON` del glosario está en la **p. 10**, no en la 9; la p. 9 es donde vive el paso de aumento del *ataque*. Re-verifícalo con los dos `pdftotext` de arriba antes de escribirlo.

**Paso 5 — `contentVersion`: `11` → `12`.**
Esto hace que `usePersistedSession` devuelva `content-changed` para cualquier partida guardada. Es lo correcto y ya está cubierto por `engine/__tests__/persistence.test.ts` — **no toques nada de persistencia**. El usuario ha renunciado explícitamente a migrar partidas guardadas ("está en pruebas y solo lo estoy usando yo"); lo único exigible es que no reviente, y el camino de fallback ya existe.

**NO toques ningún test en esta tarea.** Al terminarla la suite estará en rojo a propósito. Es la tarea 2 quien la arregla.
  </action>

  <verify>
    <automated>node -e "const g=require('./content/marvel-champions.json');const s=g.sections.flatMap(x=>x.phases).flatMap(p=>p.steps);const f=i=>s.find(x=>x.id===i);console.assert(g.contentVersion===12,'contentVersion');console.assert(!f('ronda.jugadores.03'),'ronda.jugadores.03 debe haber desaparecido');const j=f('ronda.jugadores.02');console.assert(j.text.length===50&&j.text.length<56,'text fusionado no es mas corto');console.assert(j.warning.length<=60&&/barajad el descarte/i.test(j.warning)&&!/aceleración/i.test(j.warning),'warning fusionado');console.assert(j.warningDetail.length<=320&&/orden de jugador/i.test(j.warningDetail)&&/simultáneo/i.test(j.warningDetail)&&/aceleración/i.test(j.warningDetail),'detalle fusionado: '+j.warningDetail.length);const v2=f('ronda.villano.02');console.assert(v2.text.length<=90&&/carta de aumento/i.test(v2.text)&&/héroe/i.test(v2.text)&&/alter-ego/i.test(v2.text),'villano.02 text');console.assert(/estados/i.test(v2.warning)&&/palabra clave Villano/i.test(v2.warningDetail),'villano.02 warning intacto');const v3=f('ronda.villano.03');console.assert(!/en orden de jugador/i.test(v3.text)&&/orden de jugador/i.test(v3.warning)&&v3.warning.length<=60,'villano.03');const v4=f('ronda.villano.04');console.assert(!/jugador inicial/i.test(v4.text)&&/en orden de jugador/i.test(v4.text),'villano.04');console.log('OK contenido')"</automated>
    <automated>npx vitest run engine/__tests__/schema.test.ts</automated>
  </verify>

  <done>
`content/marvel-champions.json` valida contra el esquema, tiene `contentVersion: 12`, no contiene
`ronda.jugadores.03`, y las cuatro citas del reglamento han sido re-extraídas del PDF y confirmadas
una a una. `npm run test` completo está en ROJO y eso es lo esperado en este punto.
  </done>
</task>

<task type="auto">
  <name>Tarea 2: actualizar los recuentos e índices cableados en los tests, cada uno con su motivo</name>

  <read_first>
    - `engine/__tests__/content.test.ts` líneas 66-71, 90-99, 184-200, 256-261, 282-295, 307-319, 327-334, 425-436, 536-538
    - `engine/__tests__/audio-ids.test.ts` líneas 23-27
    - `engine/__tests__/voice-drift.test.ts` líneas 107-109
    - `engine/__tests__/header.test.ts` líneas 17-24, 53-80
    - `engine/__tests__/navigator.test.ts` líneas 137-150
    - `engine/__tests__/toc.test.ts` líneas 90-95, 108-115, 120-126
  </read_first>

  <files>engine/__tests__/content.test.ts, engine/__tests__/audio-ids.test.ts, engine/__tests__/voice-drift.test.ts, engine/__tests__/header.test.ts, engine/__tests__/navigator.test.ts, engine/__tests__/toc.test.ts, app/components/IndexOverlay.vue, app/composables/usePreloadedAudio.ts, app/pages/[game]/index.vue, nuxt.config.ts, e2e/offline-flow.spec.ts, scripts/voice/styles.mjs, scripts/voice/generate.mjs</files>

  <action>
**Prohibido el buscar-y-reemplazar ciego de "37", "34" o "33".** Cada número cambia por un motivo
distinto y hay al menos tres sitios donde el número **NO** cambia aunque lo parezca. Ve uno a uno.

### `engine/__tests__/content.test.ts`

| línea aprox. | ANTES | DESPUÉS | Motivo |
|---|---|---|---|
| 66 (título del `it`) | `exactamente 34 nodos: 33 kind step y 1 kind summary` | `exactamente 33 nodos: 32 kind step y 1 kind summary` | la fase `ronda.jugadores` pierde un paso al fusionarse `.02` y `.03` |
| 68 | `expect(steps.length).toBe(34)` | `toBe(33)` | idem |
| 69 | `...=== 'step').length).toBe(33)` | `toBe(32)` | el paso que desaparece era `kind:step` |
| 70 | `kind === 'summary'...toBe(1)` | **sin cambio** | ningún `summary` se toca |
| 92 | `expect(steps).toHaveLength(33)` | `toHaveLength(32)` | mismo recuento de pasos `kind:step` que la línea 69 |
| 184 (título) | `exactamente 11 pasos declaran warning` | **sin cambio: siguen siendo 11** | **trampa.** `ronda.jugadores.03` tenía `warning` y `ronda.jugadores.02` no. Al fusionarse, el `warning` se traslada al `.02`. Se pierde un id de la lista y se gana otro: el total no se mueve |
| 189 | `'ronda.jugadores.03',` | `'ronda.jugadores.02',` | el `warning` viaja con la fusión. **Ojo al orden**: la lista está ordenada con `.sort()`, y `'ronda.jugadores.02'` va justo donde estaba `'ronda.jugadores.03'` (entre `.01` y `.04`), así que basta cambiar la cadena en su sitio |
| 260 | `expect(normalSession.sequence.length).toBe(34)` | `toBe(33)` | mismo motivo que la línea 68 |
| 282 (título) | `jugadores tiene 4 pasos kind step` | `jugadores tiene 3 pasos kind step` | la fase pierde uno |
| 290 | `expect(jugadores.steps.filter(...)).toHaveLength(4)` | `toHaveLength(3)` | idem |
| 291 | `villano...toHaveLength(6)` | **sin cambio** | la fase del villano no pierde ni gana pasos |
| 307 (título) | `orden de fin de fase — descartar, robar, enderezar, en ese orden de ids` | `orden de fin de fase — descartar o robar, y enderezar, en ese orden de ids` | son dos pasos, no tres |
| 310-315 | lista de 4 ids `01, 02, 03, 04` | lista de **3** ids: `'ronda.jugadores.01'`, `'ronda.jugadores.02'`, `'ronda.jugadores.04'` | hueco deliberado en el `03`, ver `<id_policy>`. Añade un comentario de una línea encima de la lista que lo diga, para que quien lo lea dentro de seis meses no crea que falta un paso |
| 316-318 | `.02 → /descartad/i`, `.03 → /robad/i`, `.04 → /enderezad/i` | `.02 → /descartad/i` **y** `.02 → /robad/i` (dos aserciones sobre el mismo paso), `.04 → /enderezad/i` | el paso fusionado tiene que seguir demostrando que cubre las dos mitades de la regla, no solo una |
| 328 | `findStep(marvelChampions, 'ronda.jugadores.03').warning!` | `'ronda.jugadores.02'` | el gate CONT-05 (mazo de jugador vs. mazo de encuentros son avisos distintos) sigue vivo, solo cambia de id. Las aserciones de dentro **no se tocan** |
| 430 | `'ronda.jugadores.03',` (lista de `warningDetail`) | `'ronda.jugadores.02',` | el `warningDetail` viaja con la fusión. **El total sigue siendo 6**, por la misma razón que el de `warning`: se pierde un id y se gana otro |
| 537 | `expect(marvelChampions.contentVersion).toBe(11)` | `toBe(12)` | el contenido ha cambiado; el título del `it` también dice 11, cámbialo |

### `engine/__tests__/audio-ids.test.ts`

| línea | ANTES | DESPUÉS | Motivo |
|---|---|---|---|
| 24 (título) | `exactamente 37 entradas ... (33 base + 4 de variante)` | `exactamente 36 entradas ... (32 base + 4 de variante)` | 32 pasos con `speech` propio (uno menos) + las mismas 4 entradas de variante de dificultad, que viven en `setup` y no se tocan |
| 26 | `expect(entries).toHaveLength(37)` | `toHaveLength(36)` | idem |

### `engine/__tests__/voice-drift.test.ts`

| línea | ANTES | DESPUÉS | Motivo |
|---|---|---|---|
| 107 (título) | `hay exactamente 37 entradas` | `hay exactamente 36 entradas` | el manifiesto tiene que igualar el catálogo del motor, que encoge en uno |
| 108 | `toHaveLength(37)` | `toHaveLength(36)` | idem |

**Nada más de este fichero se toca.** El gate `D-04` (huella al día) y el gate `el manifiesto cubre
exactamente el catálogo del motor` seguirán en ROJO al acabar esta tarea. Es correcto: los ficheros
de audio aún no se han regenerado. **No los saltes, no los marques `.skip`, no los relajes, no
comentes ninguna aserción.** Los arregla la tarea 3 regenerando audio, que es lo que el gate pide.

### `engine/__tests__/header.test.ts` — índices absolutos, aquí es donde más fácil es equivocarse

Comentario estructural de las líneas 17-19: `24-27 fase repetible A (4 pasos), 28-33 fase repetible B (6 pasos)` → `24-26 fase repetible A (3 pasos), 27-32 fase repetible B (6 pasos)`.

| const | ANTES | DESPUÉS | Motivo |
|---|---|---|---|
| `SETUP_STEP_INDEX` | `7` | **sin cambio** | está en el tramo de preparación, por delante del paso que desaparece |
| `SETUP_SUMMARY_INDEX` | `23` | **sin cambio** | idem |
| `PHASE_A_INDEX` | `26 // ronda.jugadores.03` | `26 // ronda.jugadores.04` — **el número no cambia, el comentario sí** | el índice 26 sigue siendo el 3.er paso de "Jugadores", pero ahora ese paso es `.04`, no `.03` |
| `PHASE_B_INDEX` | `30 // ronda.villano.03` | `29 // ronda.villano.03` | la fase B arranca ahora en el 27 en vez de en el 28, así que su 3.er paso baja del 30 al 29. Si lo dejas en 30 el test pasaría a medir `ronda.villano.04` y el `it` que se llama `"3 de 6", NUNCA "7 de 10"` estaría midiendo otra cosa |
| `PHASE_B_LAST_INDEX` | `33 // ronda.villano.06` | `32 // ronda.villano.06` | último nodo de la secuencia, que ahora tiene 33 nodos |

Y una aserción de cuerpo:

| línea ~60 | `position: { current: 3, total: 4 }` | `position: { current: 3, total: 3 }` | "Jugadores" ya solo tiene 3 pasos; sigue siendo el 3.º, pero ahora es el último |

Las aserciones de `PHASE_B_INDEX` (`{ current: 3, total: 6 }`) y `PHASE_B_LAST_INDEX`
(`{ current: 6, total: 6 }`) **no cambian**: la fase del villano conserva sus 6 pasos.

### `engine/__tests__/navigator.test.ts`

| línea | ANTES | DESPUÉS | Motivo |
|---|---|---|---|
| 138 (título) | `sequence.length 34 y los índices de bucle 24/33` | `sequence.length 33 y los índices de bucle 24/32` | ver tabla |
| 140 | `toHaveLength(34)` | `toHaveLength(33)` | un nodo menos |
| 141 | `expect(session.loopStartIndex).toBe(34 - 10)` | `toBe(33 - 9)` | **el valor sigue siendo 24**, pero la expresión tiene que reflejar los recuentos nuevos: la sección `ronda` pasa de 10 a 9 pasos. Dejar `34 - 10` seguiría dando 24 por casualidad y mentiría sobre el porqué |
| 142 | `expect(session.loopEndIndex).toBe(33)` | `toBe(32)` | último índice de una secuencia de 33 |
| 145 (título) | `next() con cursor en loopEndIndex (33)` | `... (32)` | el cuerpo usa `session.loopEndIndex!`, así que pasaría igual; el número del título quedaría mintiendo |

### `engine/__tests__/toc.test.ts` — solo comentarios, ninguna aserción se mueve

| línea | ANTES | DESPUÉS | Motivo |
|---|---|---|---|
| 91 | `// Índice 26 = ronda.jugadores.03 ...: dentro del bucle.` | `// Índice 26 = ronda.jugadores.04 ...: dentro del bucle.` | el índice 26 sigue dentro del bucle y el test sigue pasando; solo el id era otro |
| 110-111 | `// Índice 30 = ronda.villano.03: ya se recorrieron ronda.jugadores.01-04 y ronda.villano.01-02...` | `// Índice 30 = ronda.villano.04: ya se recorrieron ronda.jugadores.01, .02 y .04, y ronda.villano.01-03...` | el índice 30 sigue dentro de la fase del villano y las aserciones son genéricas (0 filas `done`, 1 `current`), así que el test pasa igual; el comentario era lo único incorrecto |
| 123 | `tableOfContents(session.sequence, 26)` | **sin cambio** | el 26 sigue dentro del bucle, que es lo único que ese test necesita |

### Comentarios de código que declaran el tamaño del catálogo como un hecho

No son gates, pero son la documentación de decisiones (D-09, D-02, Workbox) y quedarían mintiendo.
Actualiza `37` → `36` en cada uno, respetando la redacción de alrededor:

- `app/pages/[game]/index.vue` líneas ~48, ~53, ~54 (D-09: "precarga de los 37 audios", "Los 37 ids COMPLETOS", `"los 37"`)
- `app/composables/usePreloadedAudio.ts` líneas ~34 y ~136 ("37 descargas", "~700 KB en total para los 37")
- `nuxt.config.ts` línea ~175 ("con los 37 clips reales")
- `scripts/voice/generate.mjs` líneas ~5 y ~76 ("las 37 frases `speech`", "regenerar las 37 sin mirar huellas")
- `scripts/voice/styles.mjs` línea ~8 ("antes de generar las 37 frases")
- `e2e/offline-flow.spec.ts` línea ~19: `(hoy 9 de 37, ver 04-CONTEXT.md)` → doblemente obsoleto (los 37 ya están generados). Déjalo en algo como `(hoy los 36 del catálogo)`
- `app/components/IndexOverlay.vue` línea ~37: `numera la ronda como 1..10 y la preparación como 11..34` → `1..9` y `10..33`
  </action>

  <verify>
    <automated>npx vitest run engine/__tests__/content.test.ts engine/__tests__/audio-ids.test.ts engine/__tests__/header.test.ts engine/__tests__/navigator.test.ts engine/__tests__/toc.test.ts</automated>
    <automated>! grep -rn "\.skip\|\.todo\|xit(" engine/__tests__/voice-drift.test.ts</automated>
    <automated>grep -c "37" engine/__tests__/voice-drift.test.ts engine/__tests__/audio-ids.test.ts | grep -q ":0" && echo "sin 37 residual en los tests de audio"</automated>
  </verify>

  <done>
Los cinco ficheros de test de la primera verificación pasan. `voice-drift.test.ts` sigue en rojo con
exactamente dos fallos esperados (`D-04: cada frase speech tiene un audio con la huella al día` y
`el manifiesto cubre exactamente el catálogo del motor`), y ninguna de sus aserciones ha sido
silenciada. Ningún recuento se ha cambiado sin que su motivo esté en el SUMMARY.
  </done>
</task>

<task type="auto">
  <name>Tarea 3: enseñar al generador a podar huérfanos, regenerar los 4 clips afectados y cerrar el gate de deriva</name>

  <read_first>
    - `scripts/voice/generate.mjs` sección `── 10. Modo lote` (función `runBatch`), en concreto `loadManifest()`, `validIds`, `targets` y el retorno temprano `if (targets.length === 0)`
    - `engine/__tests__/voice-drift.test.ts` líneas 91-105 (el gate de igualdad exacta entre claves del manifiesto y catálogo del motor)
    - `.env` — debe contener `GEMINI_API_KEY` (no imprimas su valor)
  </read_first>

  <files>scripts/voice/generate.mjs, scripts/voice/manifest.json, public/audio/*.m4a</files>

  <action>
**Regla que no se negocia: `scripts/voice/manifest.json` NO se edita a mano, nunca, ni con `sed`,
ni con `node -e`, ni "solo para borrar una línea".** `scripts/voice/generate.mjs` es su único
escritor (lo dice su propia cabecera). Si el manifiesto necesita perder una entrada, es el
generador quien tiene que saber hacerlo — que es justo lo que añade el paso 1.

**Paso 1 — poda de huérfanos en `scripts/voice/generate.mjs`.**

Hoy `runBatch()` solo sabe AÑADIR entradas al manifiesto (`manifest.entries[entry.id] = ...`).
Al desaparecer `ronda.jugadores.03` del contenido, su entrada se quedaría dentro para siempre y el
gate `el manifiesto cubre exactamente el catálogo del motor` fallaría con
`Sobran en el manifiesto: ronda.jugadores.03` haga lo que haga la regeneración.

Dentro de `runBatch()`, justo después del bloque que hace `manifest.voice / .model / .style` y
**antes** de calcular `targets`, añade la poda:

- Calcula los ids que están en `manifest.entries` pero no en `validIds` (el conjunto ya existe unas
  líneas más arriba, derivado de `collectSpeechEntries()`, no de `requestedIds` — así la poda es
  correcta también cuando se regenera un subconjunto).
- Bórralos de `manifest.entries`.
- Por cada uno, imprime una línea que nombre el id y recuerde que su `.m4a` sigue en disco y hay que
  retirarlo a mano.
- Si se ha podado algo, llama a `saveManifest(manifest)` **ahí mismo**, sin esperar al bucle de
  generación: si no, un `targets.length === 0` saldría por el `return` temprano
  (`'Nada que generar: todo al día.'`) sin haber persistido la poda.

Comenta el bloque explicando el porqué (que el gate exige igualdad exacta y que por eso la poda vive
aquí y no en una edición manual). El generador **no** borra ficheros de `public/audio/`: borrar
ficheros en cada ejecución es un pie de escopeta; avisa y que el borrado lo haga una persona con
`git rm`, que queda en el historial.

**Paso 2 — regenerar. Requiere macOS (`afconvert`) y `GEMINI_API_KEY` en `.env`; ambos confirmados
hoy.** Cuatro ids, no más:

```
npm run voice:generate -- ronda.jugadores.02 ronda.villano.02 ronda.villano.03 ronda.villano.04
```

Son exactamente los cuatro pasos cuyo `speech` ha cambiado en la tarea 1. Los otros 32 conservan su
huella y no se tocan (nada de `--force`: regeneraría los 36 y quemaría cuota para nada).

La salida debe mostrar la línea de poda de `ronda.jugadores.03` y `4/4 clips generados`.
Si el script sale con `Id desconocido`, es que la tarea 1 no dejó el contenido como debía — para y
revísalo, no toques el manifiesto.

**Paso 3 — retirar el clip huérfano.**

```
git rm public/audio/ronda.jugadores.03.m4a
```

Motivo de que se borre y no se deje ahí: `nuxt.config.ts` precachea `audio/*.m4a` con Workbox, así
que un clip sin dueño se descargaría en cada instalación de la PWA y se guardaría en la caché
offline para siempre sin que nadie llegue nunca a reproducirlo.

**Paso 4 — cerrar la ventana roja.** `npm run test` completo. `voice-drift.test.ts` tiene que pasar
entero ahora: sus dos fallos esperados de la tarea 2 se resuelven porque el audio se ha regenerado y
el manifiesto se ha podado — que es exactamente lo que el gate pedía. Si siguen en rojo, el fallo es
real: **arréglalo por el lado del audio, jamás relajando el test.**

**Paso 5 — e2e.** `npx playwright test`. Esperado: 11/11. Estas pruebas no navegan por ids concretos
(pulsan SIGUIENTE y comprueban que el texto cambia), así que el riesgo es bajo, pero el reparto de
clips precacheados sí cambia y hay que verlo en verde antes de dar el trabajo por cerrado.
  </action>

  <verify>
    <automated>npm run test</automated>
    <automated>node -e "const m=require('./scripts/voice/manifest.json');const k=Object.keys(m.entries);console.assert(k.length===36,'manifiesto: '+k.length);console.assert(!k.includes('ronda.jugadores.03'),'huerfano sin podar');console.log('OK manifiesto', k.length)"</automated>
    <automated>test ! -f public/audio/ronda.jugadores.03.m4a &amp;&amp; test $(ls public/audio/*.m4a | wc -l) -eq 36 &amp;&amp; echo "OK 36 clips, huerfano borrado"</automated>
    <automated>npx playwright test</automated>
    <automated>git diff --stat scripts/voice/manifest.json &amp;&amp; git log --oneline -1</automated>
  </verify>

  <done>
`npm run test` verde con **14 ficheros y 293 tests** (ningún test se añade ni se quita en este
encargo: solo cambian valores dentro de los que ya había). `npx playwright test` verde 11/11.
`public/audio/` tiene 36 `.m4a` y el manifiesto 36 entradas, ambas coincidiendo exactamente con
`collectAudioIds()`. El único diff de `scripts/voice/manifest.json` es obra de `generate.mjs`.
  </done>
</task>

</tasks>

<verification>
Además de los gates automáticos:

1. **Escucha los 4 clips nuevos** (`public/audio/ronda.jugadores.02.m4a`, `ronda.villano.02.m4a`,
   `.03.m4a`, `.04.m4a`). El gate de deriva solo demuestra que el fichero existe, pesa más de 10 KB
   y su huella casa con el texto — no que Gemini haya pronunciado bien "Alter-Ego" o "carta de
   aumento". Si alguno suena mal, se regenera ese id; no se toca el manifiesto.
2. **Comprueba el diff completo** de `content/marvel-champions.json`: debe verse un objeto menos en
   `ronda.jugadores`, y ningún cambio fuera de la sección `ronda` salvo `contentVersion`.
3. **Ninguna partida guardada se migra.** Al subir `contentVersion` a 12 la app cae al flujo
   `content-changed`, que ya existe y ya está probado. Decisión explícita del usuario.
</verification>

<success_criteria>
- [ ] Las tres correcciones aplicadas con las cadenas literales de este plan, sin parafrasear
- [ ] Cada cita del Rules Reference re-extraída del PDF local y confirmada antes de aplicarse
- [ ] El aviso de mazo de jugador agotado sobrevive **literal** en el paso fusionado
- [ ] El `warningDetail` fusionado conserva el matiz orden-de-jugador / simultáneo y cabe en 320 caracteres
- [ ] La carta de aumento está en el `text` de `ronda.villano.02`, y su `warning` y `warningDetail` siguen intactos
- [ ] `contentVersion: 12`
- [ ] Todos los recuentos cableados actualizados uno a uno, con motivo, incluidos los tres que **no** cambian aunque lo parezca (11 warnings, 6 warningDetail, `loopStartIndex` 24)
- [ ] `PHASE_B_INDEX` bajado de 30 a 29 y `PHASE_B_LAST_INDEX` de 33 a 32 en `header.test.ts`
- [ ] `voice-drift.test.ts` nunca fue silenciado, saltado ni relajado durante la ventana roja
- [ ] `scripts/voice/manifest.json` solo escrito por `scripts/voice/generate.mjs`
- [ ] `public/audio/ronda.jugadores.03.m4a` retirado con `git rm`
- [ ] `npm run test` 293/293 y `npx playwright test` 11/11
</success_criteria>

<output>
Crea `.planning/quick/260831-pym-retoques-contenido-playtest/260831-pym-SUMMARY.md` al terminar.

Que recoja explícitamente:
- Las tres correcciones, con la cita del Rules Reference que sostiene cada una (página y epígrafe)
- Que la fusión **no** es una simplificación: la respalda la entrada *Hand Size* (p. 21)
- La asimetría deliberada entre `ronda.villano.03` (sin "en orden de jugador" en el texto) y `.04` (con él)
- La frase del `warningDetail` viejo que se ha dejado caer y por qué (no está en la p. 32)
- El erratum de cita encontrado: `BOOST, BOOST ICON` está en la p. 10, no en la 9
- El hueco deliberado de ids `01, 02, 04` en `ronda.jugadores` y por qué no se renumeró
- La poda de huérfanos añadida a `generate.mjs` como capacidad permanente, no como parche de un día
</output>
