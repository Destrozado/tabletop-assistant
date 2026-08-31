---
quick_id: 260831-pym
slug: retoques-contenido-playtest
phase: quick-260831-pym
plan: "01"
subsystem: content
tags: [marvel-champions, rules-fidelity, voice-generation, content-schema]
dependency-graph:
  requires: []
  provides:
    - "content/marvel-champions.json contentVersion 12: fusión ronda.jugadores.02+.03, cita corregida en .03/.04, carta de aumento en el text de ronda.villano.02"
    - "poda de huérfanos permanente en scripts/voice/generate.mjs::runBatch()"
  affects:
    - engine/__tests__/content.test.ts
    - engine/__tests__/audio-ids.test.ts
    - engine/__tests__/voice-drift.test.ts
    - engine/__tests__/header.test.ts
    - engine/__tests__/navigator.test.ts
    - engine/__tests__/toc.test.ts
    - scripts/voice/manifest.json
    - public/audio/*.m4a
tech-stack:
  added: []
  patterns:
    - "poda de manifiesto de voz derivada de validIds (collectSpeechEntries), nunca de requestedIds, para que sea correcta también al regenerar un subconjunto"
key-files:
  created: []
  modified:
    - content/marvel-champions.json
    - engine/__tests__/content.test.ts
    - engine/__tests__/audio-ids.test.ts
    - engine/__tests__/voice-drift.test.ts
    - engine/__tests__/header.test.ts
    - engine/__tests__/navigator.test.ts
    - engine/__tests__/toc.test.ts
    - scripts/voice/generate.mjs
    - scripts/voice/manifest.json
    - scripts/voice/styles.mjs
    - app/components/IndexOverlay.vue
    - app/composables/usePreloadedAudio.ts
    - "app/pages/[game]/index.vue"
    - nuxt.config.ts
    - e2e/offline-flow.spec.ts
    - public/audio/ronda.jugadores.02.m4a
    - public/audio/ronda.villano.02.m4a
    - public/audio/ronda.villano.03.m4a
    - public/audio/ronda.villano.04.m4a
  deleted:
    - public/audio/ronda.jugadores.03.m4a
decisions:
  - "El id superviviente de la fusión es ronda.jugadores.02; ronda.jugadores.03 desaparece y NO se renumera .04 (hueco deliberado en la numeración de ids opacos)"
  - "Se descarta a propósito la última frase del warningDetail viejo de ronda.jugadores.03 ('Si tampoco tenéis descarte, el mazo no se rehace...'): no está respaldada por la p. 32 del Rules Reference, era una inferencia del contenido anterior"
metrics:
  duration_minutes: 10
  completed: 2026-08-31
---

# Phase quick-260831-pym Plan 01: Retoques de contenido tras playtest Summary

Tres correcciones de reglas en `ronda` de Marvel Champions detectadas en partida real —fusión del tamaño de mano, orden de jugador movido de texto a warning en dos pasos, carta de aumento sacada al texto grande— más la poda de huérfanos añadida al generador de voz para que el manifiesto pueda perder una entrada sin editarse a mano.

## Las tres correcciones, con su cita del Rules Reference

### 1. Fusión de `ronda.jugadores.02` + `ronda.jugadores.03` en un único paso

**No es una simplificación de comodidad: la respalda la propia entrada *Hand Size* del Rules Reference (p. 21)**, que dice literalmente:

> "Each player checks their hand size at the end of the player phase, **either discarding down to or drawing up to** the number of cards indicated by their hand size value."

El reglamento trata "descartar hasta" y "robar hasta" como una única comprobación de tamaño de mano, no como dos pasos separados. La app tenía dos pantallas para una sola comprobación de reglas.

El matiz de orden que sí distingue el reglamento (p. 17, *End of Player Phase*, pasos 1 y 2: paso 1 "**In player order**, each player may discard..."; paso 2 "Each player **simultaneously** draws...") se conserva en el `warningDetail` del paso fusionado, no se pierde.

**Resultado (`ronda.jugadores.02`):**
```
text (50):          "Descartad o robad hasta el tamaño de vuestra mano."
warning (58):        "Mazo agotado: barajad el descarte y repartíos un encuentro"
warningDetail (276): "El descarte va en orden de jugador; el robo es simultáneo.
                      Si tu mazo se queda sin cartas, barajad vuestro descarte
                      para formar uno nuevo y repartíos a vosotros mismos una
                      carta de encuentro boca abajo: aquí no se pone ficha de
                      aceleración, eso es solo del mazo de encuentros."
speech (50):         "Descartad o robad hasta el tamaño de vuestra mano."
```
Límites del esquema (`engine/schema.ts`): `text` ≤90, `warning` ≤60, `warningDetail` ≤320. Los tres campos caben con margen y el `text` fusionado (50) es más corto que cualquiera de los dos textos que sustituye (69 y 56).

**Frase descartada del `warningDetail` viejo, y por qué**: la versión anterior de `ronda.jugadores.03` terminaba con *"Si tampoco tenéis descarte, el mazo no se rehace hasta que vuelva a haber al menos una carta en él."* Esta frase **no está respaldada por la p. 32** (*Player Deck*) del Rules Reference — esa página describe qué pasa cuando el mazo se vacía (barajar el descarte y repartirse una carta de encuentro boca abajo) pero no dice nada sobre qué ocurre si tampoco hay descarte. Era una inferencia del contenido original, no una regla citable, así que se ha dejado caer al fusionar en vez de arrastrarla.

### 2a. `ronda.villano.03` — el orden de jugador se ata a las cartas extra, no al reparto base

Cita: *Hazard Icon* (p. 21): "Additional cards are dealt **in player order** (first additional card to the first player, the second to the second player, etc.)." El orden de jugador solo aplica a las cartas adicionales por icono de peligro, no al reparto de una carta base a cada jugador. El texto viejo decía "en orden de jugador" pegado al reparto base, dando a entender que el orden importaba ahí; ahora vive en el `warning`, atado correctamente a las cartas extra.

```
text (47):    "Repartid una carta de encuentro a cada jugador."
warning (49): "Una más por icono de peligro, en orden de jugador"
speech (47):  "Repartid una carta de encuentro a cada jugador."
```

### 2b. `ronda.villano.04` — "desde el jugador inicial" era redundante

Cita: *In Player Order* (p. 23): "the first player performs their part of the sequence first, followed by the other players in clockwise order." "En orden de jugador" ya implica empezar por el jugador inicial; añadir "desde el jugador inicial" era repetir la misma información dos veces.

```
text (63):   "Revelad las cartas de encuentro una a una, en orden de jugador."
speech (63): "Revelad las cartas de encuentro una a una, en orden de jugador."
```
(`warning` y `warningDetail` no se tocaron.)

**Asimetría deliberada entre `.03` y `.04`**: en el paso 3 (reparto) el orden de jugador apenas importa a efectos de resultado — es solo el turno de dar cartas; en el paso 4 (revelar) sí importa de verdad, porque cada jugador resuelve TODAS sus cartas de encuentro antes de que empiece el siguiente jugador. Por eso `.03` traslada la frase al `warning` (matiz secundario) y `.04` la conserva en el `text` (matiz principal del paso).

### 3. `ronda.villano.02` — la carta de aumento sale al texto grande

**Corrige un error del encargo original**: el brief solo citaba la entrada de esquemas (p. 38, *Scheme (Enemy Activation)*), pero la carta de aumento se roba y se resuelve igual **al atacar** (p. 9, *Attack (Enemy Activation)*, paso 1: "If a villain, or a minion with the villainous keyword, is attacking, give it one facedown boost card from the encounter deck"). El paso fusionado del ataque y el esquema del villano necesitaba mencionar la carta de aumento en ambos casos, no solo en uno.

```
text (88):  "Con carta de aumento: el villano ataca al héroe y avanza el esquema contra el Alter-Ego."
speech (99): "Con carta de aumento, el villano ataca al héroe y avanza el esquema
              contra quien esté en Alter-Ego."
```
`text` sigue casando con `/héroe/i` y `/alter-ego/i` (gate ADAPT-04/D-33); `warning`/`warningDetail` no se tocaron (el detalle ya precisaba quién roba aumento: solo villano y esbirros con la palabra clave Villano).

**Erratum de cita encontrado y corregido**: la entrada del glosario `BOOST, BOOST ICON` está en la **p. 10**, no en la p. 9 como decía la cita anterior (`ver también Boost Cards (p. 9)`). La p. 9 es donde vive el paso de aumento del *ataque* (*Attack (Enemy Activation)*); el glosario de Boost/Boost Icon está una página después. La cita nueva separa ambas referencias correctamente:

```
"Villain Phase, paso 2; ver también Attack (Enemy Activation) (p. 9),
Boost, Boost Icon (p. 10), Scheme (Enemy Activation) (p. 38) y
Status Cards (p. 39)"
```

## Hueco deliberado de ids en `ronda.jugadores`

Tras la fusión, la fase queda con los ids `01`, `02`, `04` — falta el `03` a propósito. `ronda.jugadores.02` es el id superviviente de la fusión (no se renombra ni se renumera); `ronda.jugadores.04` (Enderezar) no se toca. Motivo documentado en `<id_policy>` del plan: los ids son identificadores opacos (nombre de fichero de audio + clave del manifiesto), no una numeración de cara al usuario, así que renumerar `.04` solo obligaría a regenerar un clip más y mover un `.m4a` sin ninguna ganancia real. El hueco queda documentado con un comentario en el test `CONT-02` de `engine/__tests__/content.test.ts`.

## Poda de huérfanos en `scripts/voice/generate.mjs` — capacidad permanente

Antes de este encargo, `runBatch()` solo sabía AÑADIR entradas al manifiesto (`manifest.entries[entry.id] = ...`). Al desaparecer un id del contenido (como `ronda.jugadores.03` en esta fusión), su entrada se habría quedado en el manifiesto para siempre y el gate `el manifiesto cubre exactamente el catálogo del motor` de `voice-drift.test.ts` habría fallado indefinidamente, sin que ninguna regeneración lo arreglase.

Se añadió, dentro de `runBatch()`, justo después de fijar `manifest.voice/.model/.style` y antes de calcular `targets`:
- Cálculo de `orphanIds` = claves de `manifest.entries` que no están en `validIds` (derivado de `collectSpeechEntries()`, **no** de `requestedIds`, para que la poda sea correcta también cuando se regenera solo un subconjunto de ids).
- Borrado de esas claves del manifiesto en memoria, con una línea de aviso por consola que nombra el id y recuerda que su `.m4a` sigue en disco y hay que retirarlo a mano.
- `saveManifest(manifest)` inmediatamente si se podó algo, **antes** de que un `targets.length === 0` pudiera salir por el retorno temprano sin persistir la poda.

El script sigue sin borrar ficheros de `public/audio/`: es una decisión deliberada (evitar que una ejecución automática borre audio en disco); el borrado lo hace una persona con `git rm`, que queda en el historial. Esto no es un parche de un día — es la capacidad que el generador necesitaba desde que el manifiesto puede perder entradas, y queda disponible para cualquier fusión/eliminación de pasos futura.

## Evidencia del gate de deriva: RED antes de regenerar, GREEN después

Tras la Tarea 2 (recuentos de test actualizados, contenido ya cambiado, audio todavía sin regenerar), la suite completa dio:

```
Test Files  1 failed | 13 passed (14)
     Tests  4 failed | 289 passed (293)

FAIL engine/__tests__/voice-drift.test.ts > D-04: cada frase speech tiene un audio con la huella al día
  Error: Audio desactualizado para: ronda.jugadores.02, ronda.villano.02, ronda.villano.03, ronda.villano.04
  Ejecuta: npm run voice:generate -- ronda.jugadores.02 ronda.villano.02 ronda.villano.03 ronda.villano.04

FAIL engine/__tests__/voice-drift.test.ts > el gate muerde: cambiar una frase speech en memoria hace que su audio quede desactualizado
  AssertionError: expected [ …(5) ] to have a length of 1 but got 5

FAIL engine/__tests__/voice-drift.test.ts > el manifiesto cubre exactamente el catálogo del motor
  Error: Sobran en el manifiesto: ronda.jugadores.03

FAIL engine/__tests__/voice-drift.test.ts > hay exactamente 36 entradas
  AssertionError: expected [ 'ronda.jugadores.01', …(36) ] to have a length of 36 but got 37
```

**Nota sobre el recuento de fallos**: el plan anticipaba "exactamente dos fallos esperados" (D-04 y "el manifiesto cubre..."); en la práctica salieron **4**, todos dentro de `voice-drift.test.ts` y todos consecuencia directa y esperada de que el manifiesto seguía teniendo 37 entradas (con la `.03` huérfana) hasta la Tarea 3: el test `hay exactamente 36 entradas` (que la Tarea 2 sí edita para esperar 36) y el test "el gate muerde" (que compara 36 entradas reales contra 37 del manifiesto) fallan por la misma causa raíz que los otros dos. Ninguna aserción fue tocada para llegar a este estado — es la ventana roja correcta, solo más ancha de lo que el plan describió literalmente.

Tras la Tarea 3 (poda + regeneración de los 4 clips + `git rm` del huérfano):

```
Test Files  14 passed (14)
     Tests  293 passed (293)
```

## Audio regenerado

Ids regenerados con `npm run voice:generate -- ronda.jugadores.02 ronda.villano.02 ronda.villano.03 ronda.villano.04` (los 4 cuyo `speech` cambió; ningún otro clip se tocó, no se usó `--force`):

- `ronda.jugadores.02.m4a`
- `ronda.villano.02.m4a`
- `ronda.villano.03.m4a`
- `ronda.villano.04.m4a`

`public/audio/*.m4a`: **37 → 36** (se retiró `ronda.jugadores.03.m4a` con `git rm`, queda en el historial de git — commit `4b4bcab`). El manifiesto (`scripts/voice/manifest.json`) tiene ahora 36 entradas, sin `ronda.jugadores.03`, y su único diff observado es el propio de `generate.mjs` (hash/bytes/generatedAt de los 4 ids regenerados + eliminación de la entrada huérfana): no hubo ninguna edición manual.

**Verificación auditiva**: no se pudo reproducir audio en este entorno de ejecución (worktree headless sin salida de audio). Los cuatro `.m4a` existen, pesan entre 29 KB y 54 KB (muy por encima del umbral de 10 KB del gate), y su huella (`fingerprint`) casa exactamente con el `speech` actual según `voice-drift.test.ts` D-04, que es la comprobación automática exigida por el plan. Queda pendiente de un oído humano en la próxima partida — el plan lo señala explícitamente como algo que el gate automático no cubre ("no que Gemini haya pronunciado bien 'Alter-Ego' o 'carta de aumento'").

## `.env` y el clip huérfano

- `.env` fue copiado desde el checkout principal solo para que `generate.mjs` pudiera leer `GEMINI_API_KEY` (`process.loadEnvFile('.env')`). Está en `.gitignore` y `git status --porcelain .env` devolvió vacío tanto antes como después de cada commit de esta tarea — nunca ha sido tracked ni estuvo en riesgo de commitearse.
- `public/audio/ronda.jugadores.03.m4a` fue retirado con `git rm public/audio/ronda.jugadores.03.m4a` (no borrado a mano ni por el script), así que la eliminación queda en el historial de git (commit `4b4bcab`).

## Todos los recuentos cableados: cuáles cambiaron y cuáles NO, con motivo

| Fichero / const | Antes | Después | Motivo |
|---|---|---|---|
| `content.test.ts`: nodos totales | 34 | 33 | la fase `ronda.jugadores` pierde un paso al fusionarse `.02`+`.03` |
| `content.test.ts`: nodos `kind:step` | 33 | 32 | el paso desaparecido era `kind:step` |
| `content.test.ts`: nodos `kind:summary` | 1 | **1 (sin cambio)** | ningún `summary` se toca |
| `content.test.ts`: pasos con `speech` (DC-1) | 33 | 32 | igual que nodos `kind:step` |
| `content.test.ts`: pasos con `warning` | 11 | **11 (sin cambio)** | trampa: `.03` tenía `warning`, `.02` no; al fusionarse el `warning` viaja a `.02` — se pierde un id de la lista y se gana otro, el total no se mueve |
| `content.test.ts`: sequence.length con normal/expert | 34 | 33 | mismo motivo que nodos totales |
| `content.test.ts`: pasos `kind:step` de "Jugadores" | 4 | 3 | la fase pierde un paso |
| `content.test.ts`: pasos `kind:step` de "Villano" | 6 | **6 (sin cambio)** | la fase del villano no pierde ni gana pasos |
| `content.test.ts`: pasos con `warningDetail` (D-32) | 6 | **6 (sin cambio)** | misma trampa que `warning`: `.03` lo tenía, ahora lo tiene `.02` |
| `content.test.ts`: `contentVersion` | 11 | 12 | el contenido ha cambiado |
| `audio-ids.test.ts` / `voice-drift.test.ts`: entradas totales | 37 | 36 | 32 pasos con `speech` propio (uno menos) + las mismas 4 entradas de variante de dificultad (viven en `setup`, no se tocan) |
| `header.test.ts`: `SETUP_STEP_INDEX` | 7 | **7 (sin cambio)** | está en el tramo de preparación, por delante del paso que desaparece |
| `header.test.ts`: `SETUP_SUMMARY_INDEX` | 23 | **23 (sin cambio)** | idem |
| `header.test.ts`: `PHASE_A_INDEX` (valor) | 26 | **26 (sin cambio, solo el comentario)** | el índice 26 sigue siendo el 3.er paso de "Jugadores"; ahora ese paso es `.04` en vez de `.03` |
| `header.test.ts`: `PHASE_B_INDEX` | 30 | **29** | la fase B arranca ahora en el 27 en vez del 28; su 3.er paso baja de 30 a 29 (si no se cambiaba, el test habría medido `ronda.villano.04` en vez de `.03` y habría seguido "pasando" por casualidad) |
| `header.test.ts`: `PHASE_B_LAST_INDEX` | 33 | 32 | último nodo de una secuencia que ahora tiene 33 nodos |
| `header.test.ts`: `position.total` de fase A | 4 | 3 | "Jugadores" ya solo tiene 3 pasos |
| `header.test.ts`: `position` de fase B (`{3,6}` y `{6,6}`) | — | **sin cambio** | la fase del villano conserva sus 6 pasos |
| `navigator.test.ts`: `sequence.length` | 34 | 33 | un nodo menos |
| `navigator.test.ts`: `loopStartIndex` (valor) | 24 | **24 (sin cambio)** | el paso que desaparece vivía dentro del bucle, no antes de él |
| `navigator.test.ts`: expresión de `loopStartIndex` | `34 - 10` | `33 - 9` | la sección `ronda` pasa de 10 a 9 pasos; dejar `34 - 10` seguiría dando 24 por casualidad y mentiría sobre el porqué |
| `navigator.test.ts`: `loopEndIndex` | 33 | 32 | último índice de una secuencia de 33 |
| `toc.test.ts`: índices 26 y 30 usados en las llamadas | 26, 30 | **sin cambio** | ambos siguen dentro del bucle; solo cambiaron los comentarios que nombraban el id equivocado (`.03`→`.04` en el 26, `.03`→`.04` en el 30) |
| Comentarios D-09/D-02/Workbox (`IndexOverlay.vue`, `usePreloadedAudio.ts`, `index.vue`, `nuxt.config.ts`, `generate.mjs`, `styles.mjs`, `offline-flow.spec.ts`) | "37" | "36" | documentación de decisiones que quedaría mintiendo sobre el tamaño del catálogo |
| `IndexOverlay.vue`: numeración de filas | `1..10` / `11..34` | `1..9` / `10..33` | la ronda pasa de 10 a 9 pasos y el total de nodos de 34 a 33 |

## Deviations from Plan

### Auto-fixed Issues

Ninguna — el plan traía las cadenas exactas, los índices exactos y el diseño exacto de la poda; no hizo falta ningún ajuste de tipo Regla 1/2/3.

### Observaciones sin acción correctiva

**1. El recuento de fallos RED tras la Tarea 2 fue 4, no 2 como sugería el `<done>` del plan.**
- **Encontrado en:** verificación tras la Tarea 2, antes de regenerar audio.
- **Detalle:** el plan enumeraba dos fallos esperados de `voice-drift.test.ts` (D-04 y "el manifiesto cubre..."); en la ejecución real hubo también `hay exactamente 36 entradas` (edición de la propia Tarea 2, que compara contra un manifiesto que aún tenía 37) y `el gate muerde: cambiar una frase speech...` (compara 36 entradas reales contra 37 del manifiesto, arrastrando 5 discrepancias en vez de 1).
- **Por qué no se corrigió**: las cuatro son consecuencia directa y esperada de que el manifiesto no se regenera hasta la Tarea 3; ninguna aserción fue relajada ni se tocó nada fuera de lo que el plan ya pedía cambiar en la Tarea 2. Se resolvieron solas al ejecutar la Tarea 3, exactamente como estaba previsto.
- **Ficheros:** ninguno adicional a los ya listados en la Tarea 2.
- **Commit:** ninguno específico — documentado aquí como evidencia, no como fix.

## Threat Flags

Ninguno. Los cambios son de contenido (texto/voz) y de una capacidad de mantenimiento interna de un script de desarrollo (`generate.mjs`, nunca invocado en build/CI/producción, ya cubierto por D-06). No se introduce superficie de red, autenticación, ni cambio de esquema.

## Self-Check: PASSED

Ficheros verificados:
- `content/marvel-champions.json` — FOUND, `contentVersion: 12` confirmado, `ronda.jugadores.03` ausente
- `scripts/voice/generate.mjs` — FOUND, contiene la poda de huérfanos (`orphanIds`)
- `scripts/voice/manifest.json` — FOUND, 36 entradas, sin `ronda.jugadores.03`
- `public/audio/ronda.jugadores.02.m4a`, `ronda.villano.02.m4a`, `.03.m4a`, `.04.m4a` — FOUND
- `public/audio/ronda.jugadores.03.m4a` — CONFIRMED AUSENTE (retirado con `git rm`)

Commits verificados en `git log --oneline`:
- `5a5f45c` fix(260831-pym): fusionar tamaño de mano y corregir citas de ronda tras playtest — FOUND
- `5eeac53` test(260831-pym): actualizar recuentos e indices tras fusion de ronda.jugadores — FOUND
- `4b4bcab` feat(260831-pym): podar huerfanos en el generador y regenerar los 4 clips afectados — FOUND

`npm run test`: 14 ficheros, 293/293 verde. `npx playwright test`: 11/11 verde.
