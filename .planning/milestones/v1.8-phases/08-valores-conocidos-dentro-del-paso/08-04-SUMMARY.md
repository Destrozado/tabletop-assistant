---
phase: 08-valores-conocidos-dentro-del-paso
plan: 04
subsystem: content
tags: [json-content, vitest, ci-gate, marvel-champions, persistence]

# Dependency graph
requires:
  - phase: 08-01, 08-02, 08-03
    provides: clave `value` en el esquema de paso, `engine/stepValues.ts`, y la costura en `useGameSession.ts`/`StepScreen.vue` que ya renderizaba paréntesis y lista por jugador
provides:
  - Fase `setup.escenario` reordenada para que la sustitución de cartas de villano por dificultad preceda al paso del dial, en ambas dificultades
  - Gate de CI en `engine/__tests__/content.test.ts` que hace fallar la build si un paso `value: "villainHealth"` vuelve a preceder al paso de sustitución
  - `contentVersion` en 14, con el efecto de invalidación de cursores guardados documentado y aceptado
  - Cierre verificado de VAL-01 (el hueco BLOCKER de `08-VERIFICATION.md`), con confirmación humana explícita en Kang + Experto y Kang + Normal
affects: [09-historico-y-estadisticas, cualquier plan futuro que reordene o divida pasos de `setup.escenario`]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reordenar contenido sin renumerar ids: el orden de lectura lo da la posición en `phase.steps[]` (recorrido de `engine/flatten.ts`), nunca el número del id — política ya escrita en el precedente CONT-02 (`<id_policy>` del quick 260831-pym), reaplicada aquí"
    - "Gate de invariante de orden derivado del dato, no de una lista de ids tecleada a mano: la función `villainHealthStepsBeforeSwap` localiza el paso de sustitución por su `variants.difficulty.expert.text` y calcula índices sobre `allSteps(game)`, con un test que la muerde sobre una copia mutada en memoria"

key-files:
  created: []
  modified:
    - content/marvel-champions.json
    - engine/__tests__/content.test.ts

key-decisions:
  - "Ruta A elegida: reordenar el objeto `setup.escenario.04` delante de `setup.escenario.02` sin renumerar ningún id — cero clips de audio nuevos, cero claves de manifiesto tocadas, y es la lectura más fiel al Rules Reference v1.7 (el modo Experto es un modificador global ya aplicado durante los pasos 8/9 del Apéndice II, no un paso numerado propio)"
  - "contentVersion sube de 13 a 14, apartándose deliberadamente de D-01 (que solo cubría el caso 'añadir una clave aditiva'): resecuenciar cambia el significado de un cursor guardado, y sin el bump una partida reanudada saltaría el paso de sustitución y reintroduciría el fallo en Experto"
  - "El orden de ids dentro de `setup.escenario` deja de ser monótono (`.01 .04 .02 .03 .05 …`) de forma deliberada, amparado por la `<id_policy>` ya establecida por el quick 260831-pym: los ids son identificadores estables, no números de posición"

patterns-established:
  - "Un gate de contenido puede fijar un invariante de orden de negocio (ninguna cifra de vida se anuncia antes de que la carta física correspondiente esté en mesa) sin tocar `engine/`, manteniendo D-13 (el motor no gana conocimiento de secuencia)"

requirements-completed: [VAL-01, VAL-04, VAL-05, VAL-06]

# Metrics
duration: N/A (sesión continuada con checkpoint humano bloqueante entre las Tasks 2 y 3)
completed: 2026-09-09
---

# Phase 8 Plan 4: Recolocar la sustitución de cartas por dificultad delante del dial — Summary

**En Experto con Kang, el paso del dial ahora imprime (45) DESPUÉS de que el grupo ya haya sustituido las cartas de etapa, no antes — cero clips regenerados, cero ids renombrados, `contentVersion` 13→14, y un gate de CI que impide que el orden vuelva a romperse.**

## Performance

- **Duration:** N/A — plan ejecutado en dos sesiones: Tasks 1 y 2 en la sesión anterior, Task 3 (checkpoint humano bloqueante) aprobada y cierre documental en esta sesión de continuación.
- **Tasks:** 3/3 completadas (2 `auto` + 1 `checkpoint:human-verify`, aprobado)
- **Files modified:** 2 (`content/marvel-champions.json`, `engine/__tests__/content.test.ts`)

## Accomplishments

- Cerrado el único hueco BLOCKER que dejó `08-VERIFICATION.md`: en Experto con Kang, la cifra de vida del villano que la pantalla imprime ya coincide con la carta física que el grupo tiene delante en el momento en que se lee, porque la sustitución de cartas por dificultad ahora precede al paso del dial en la secuencia aplanada.
- Añadido un gate ejecutable en `engine/__tests__/content.test.ts` (`describe` etiquetado `CR-01/VAL-01`) que hace fallar `npm test` si algún paso `value: "villainHealth"` vuelve a preceder al paso de sustitución por dificultad — demostrado mordiendo sobre una copia mutada en memoria, sin tocar nunca el fichero real.
- Verificación humana bloqueante superada: Kang + Experto (3 jugadores) muestra el orden a→b→c y la cifra 45; Kang + Normal muestra 36; los tres pasos suenan con su locución pregenerada sin decir el número; retroceder y volver a avanzar mantiene el orden y la cifra.

## Task Commits

Cada task se commiteó atómicamente (Tasks 1 y 2, sesión previa; Task 3 es un checkpoint humano sin cambio de código):

1. **Task 1: Recolocar el paso de dificultad delante del dial y bumpear contentVersion** - `ad1c755` (fix)
2. **Task 2: Gate en CI — ningún paso `villainHealth` puede preceder al de sustitución por dificultad** - `de4a78b` (test)
3. **Task 3: Lectura humana de la preparación en Experto con Kang** - checkpoint aprobado por el usuario ("aprobado"), sin commit de código propio

**Plan metadata:** (este commit — docs: complete plan)

## Files Created/Modified

- `content/marvel-champions.json` — objeto `setup.escenario.04` movido inmediatamente después de `setup.escenario.01` y antes de `setup.escenario.02` (ningún id renombrado); `contentVersion` 13 → 14
- `engine/__tests__/content.test.ts` — `describe` nuevo `CR-01/VAL-01` con la función pura `villainHealthStepsBeforeSwap(game)`, 4 tests (identidad del paso de sustitución, no-vacuidad de `villainHealth`, el invariante en vacío sobre el contenido real, y el test que muerde sobre una copia mutada); aserción de `contentVersion` actualizada a 14

## Ruta elegida y rutas rechazadas (registro explícito requerido por `<output>` del plan)

**Ruta A — reordenar sin renumerar ids (ELEGIDA).** `setup.escenario.04` pasa a leerse
inmediatamente después de `setup.escenario.01` y antes de `setup.escenario.02`, sin cambiar
ningún id. El orden de lectura lo produce `engine/flatten.ts` recorriendo `phase.steps[]` en
orden de documento — el número del id no participa en ninguna decisión de orden del motor. Es
la ruta de coste cero en audio (cero clips nuevos, cero claves de manifiesto tocadas) y la más
fiel al Rules Reference v1.7: el modo Experto (p. 28, Modes of Play) es un modificador global
ya aplicado mientras se ejecutan los pasos 8 y 9 del Apéndice II, no un paso numerado propio —
el orden anterior (dial → sustitución) era el que se apartaba del reglamento.

**Rutas rechazadas:**

- **B — dar a `setup.escenario.02` una variante `difficulty`.** Rechazada: cuesta dos clips
  nuevos (`.02.normal`/`.02.expert`, cuota de la API de Gemini), sube el recuento de audio de
  35 a 37, y reescribe texto autorado de verdad, rompiendo VAL-04 en su forma real (no solo en
  su forma diff). Peor resultado a mayor coste.
- **C — suprimir o matizar la cifra en Experto.** Rechazada: reabre el problema que VAL-01
  existe para resolver (dejar de decir el número justo donde es menos obvio), y exigiría que
  `engine/stepValues.ts` supiera dónde está el paso en la secuencia — violando D-13 (el motor
  es puro y sin conocimiento de secuencia).
- **D — añadir un paso nuevo de reajuste tras la sustitución.** Rechazada: un id nuevo implica
  un clip nuevo (mismo coste que B), un paso más que leer en voz alta en mesa, y deja en pie la
  contradicción original (el grupo ve primero un número equivocado y luego se le pide
  corregirlo).
- **A' — renumerar los ids tras reordenar.** Rechazada: renombraría claves del manifiesto de
  voz y ficheros `.m4a` (incluido `setup.escenario.04.expert.m4a`), obligando a mover/regenerar
  audio, y contradice la `<id_policy>` ya establecida por el quick 260831-pym.

## El bump de `contentVersion` (13 → 14) y por qué se aparta de D-01

D-01 (`08-CONTEXT.md`) fijaba «no subir `contentVersion`» para el caso de añadir una clave
aditiva al esquema (lo que hizo el plan 08-01). Este plan no añade una clave: **resecuencia**
el orden de lectura, y eso cambia el *significado* de un cursor guardado. Sin el bump, una
partida reanudada con `runtimeId === 'setup.escenario.02'` o `'.03'` aterrizaría en una
posición que ahora queda **después** del paso de sustitución por dificultad y nunca lo vería,
reintroduciendo en Experto exactamente el fallo que este plan cierra. Con el bump,
`engine/persistence.ts:resume()` compara `persisted.contentVersion !== fresh.contentVersion`
y devuelve `content-changed`, reiniciando en el paso 1 pero **conservando** `context` (villano,
héroes, jugadores, dificultad) — la postura ya documentada en ARCHITECTURE.md, Anti-Patrón 4:
«una coincidencia casual de id tras una reestructuración es peor que un reinicio honesto». El
humano confirmó explícitamente esta reversión y su coste en el checkpoint de la Task 3 (ver
más abajo).

## Orden de ids no monótono, deliberado

Tras este plan, `phases[setup.escenario].steps[]` se lee en el orden
`.01 → .04 → .02 → .03 → .05 → .06 → .07 → .08 → .09`. Es «feo de mirar» en el JSON crudo y es
**correcto**: los ids son identificadores estables usados como claves (persistencia, manifiesto
de voz), no números de posición. Esta política ya está escrita y pinchada por un test previo a
este plan — `engine/__tests__/content.test.ts`, test «CONT-02: orden de fin de fase», con el
comentario literal *«Hueco deliberado en el 03: la fusión de .02+.03 conserva el id .02 como
superviviente y no renumera .04 (ver `<id_policy>` del plan 260831-pym)»*. Este plan reaplica
la misma política a un caso nuevo, no la inventa.

## Matiz de VAL-04 (para que la reverificación de fase no lo lea como regresión)

VAL-04 exige que `git diff` sobre `content/marvel-champions.json` no toque ni un carácter de
ningún campo `text`/`speech`. Ese criterio, en su forma literal de fase completa, **ya fue
verificado y satisfecho** por `08-VERIFICATION.md` contra el commit base `41c2d4a` (el diff de
la Fase 8 original: 4 líneas añadidas, todas `"value":`). Esa verificación no se revoca.

Este plan es un cambio nuevo encima de la fase, y hay que decirlo sin rodeos: **mover un objeto
JSON de sitio produce un `git diff` textual con líneas `+`/`-` que sí contienen `"text"` y
`"speech"`**, porque el bloque desaparece de una posición y reaparece en otra. Un
`git diff bcbe00c -- content/marvel-champions.json | grep '^[+-].*"text"'` **da salida** — eso
es esperado y no es una reescritura de contenido.

La garantía real que VAL-04 persigue —«el valor se añade solo en el renderizado, no se
reescribe contenido»— se comprobó de forma ejecutable id a id contra `bcbe00c`: para cada id de
paso, `text`, `speech`, `warning`, `warningDetail`, `options`, `optionsWarning`,
`optionsWarningDetail`, `variants`, `title` y `citation` son byte-idénticos. Resultado real de
esta sesión:

```
OK 32 pasos byte-idénticos
```

Cero ids difieren, ninguno aparece ni desaparece. Solo cambió la posición de un objeto dentro
del array y `contentVersion`. VAL-05 y VAL-06 se mantienen en su forma literal original (35
clips en disco — no 37; ver nota debajo —, gate de voz verde, locución genérica sin número).

**Nota sobre el recuento de audio:** el ROADMAP y VAL-05 heredan la cifra «37 clips» de un
recuento ya erróneo documentado en el STATE.md del plan 08-03 («recuento real de audio es 35
clips, no 37, dato heredado del ROADMAP ya erróneo»). El recuento real en disco hoy es 35
(`ls public/audio/*.m4a | wc -l` = 35, `Object.keys(manifest.entries).length` = 35), y este
plan los deja exactamente igual — no se regenera ni se borra ningún clip. Corregir la cifra de
«37» a «35» en el texto de VAL-05/ROADMAP queda fuera del alcance de este cierre de hueco.

## Aprobación humana de la Task 3 (checkpoint bloqueante)

El humano ejecutó el recorrido descrito en `<how-to-verify>` y respondió **"aprobado"**.
Hechos confirmados y registrados:

- Cabeceras reales verificadas en el tramo lineal (`PREPARACIÓN`, contador global de 22
  pasos): `10 de 22` = `setup.escenario.01` (colocar mazos), `11 de 22` =
  `setup.escenario.04` (sustitución por dificultad), `12 de 22` = `setup.escenario.02` (dial,
  con la cifra entre paréntesis). La fase ESCENARIO DEL VILLANO ocupa del 10 al 18 de 22.
- El total de pasos se mantiene en 22 en ambas dificultades: reordenar no añadió ni quitó
  pasos.
- El humano no planteó ninguna objeción de redacción sobre si el nuevo orden se lee natural en
  voz alta (punto 9 del `<how-to-verify>`); no hay seguimiento de naturalidad que registrar.
- El humano aceptó explícitamente la reversión de D-01 (bump `contentVersion` 13 → 14) y su
  coste real: una partida guardada a medias se reinicia en el paso 1, conservando villano,
  héroes, jugadores y dificultad, en vez de reanudarse en un cursor cuyo significado cambió.

## Verificación mecánica ejecutada en esta sesión (evidencia literal)

```
$ node -e "...steps.map(s=>s.id).join(' ')..."
setup.escenario.01 setup.escenario.04 setup.escenario.02 setup.escenario.03 setup.escenario.05 setup.escenario.06 setup.escenario.07 setup.escenario.08 setup.escenario.09

$ grep -n '"contentVersion"' content/marvel-champions.json | head -1
5:  "contentVersion": 14,

$ ls public/audio/*.m4a | wc -l
35
$ node -e "console.log(Object.keys(require('./scripts/voice/manifest.json').entries).length)"
35
$ git status --porcelain public/audio scripts/voice/manifest.json
(vacío)

$ node -e "...comparación id a id contra bcbe00c..."
OK 32 pasos byte-idénticos

$ npx vitest run engine/__tests__/voice-drift.test.ts
Test Files  1 passed (1) — Tests 8 passed (8)

$ npx vitest run engine/__tests__/audio-ids.test.ts
Test Files  1 passed (1) — Tests 10 passed (10)

$ npm test
Test Files  22 passed (22) — Tests 567 passed (567)

$ npm run generate
[nitro] ℹ Prerendered 6 routes in 0.542 seconds
[nitro] ✔ Generated public .output/public
PWA v1.3.0 — precache 64 entries (1683.14 KiB) — files generated

$ git diff --name-only bcbe00c -- . (excluyendo .planning/)
content/marvel-champions.json
engine/__tests__/content.test.ts
```

Todos los puntos de `<verification>` del plan quedan cubiertos: (1) `npm test` verde con 4
tests nuevos respecto a los 563 previos (563+4=567 ✓); (2) gate de voz 8/8 verde; (3) 35/35
clips y manifiesto sin cambios de estado; (4) comparación id a id sin diferencias; (5) `npm run
generate` completa sin error; (6) el diff de código fuente respecto a `bcbe00c` lista
exactamente los dos ficheros esperados; (7) checkpoint humano aprobado.

## Decisions Made

- Ruta A (reordenar sin renumerar) sobre B/C/D/A', por coste de audio cero y fidelidad al
  Rules Reference — ver sección dedicada arriba.
- Bump de `contentVersion` 13→14, apartándose de D-01 conscientemente — ver sección dedicada.
- Orden de ids no monótono en `setup.escenario`, amparado por la `<id_policy>` ya vigente.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito, incluidas las dos desviaciones
respecto a decisiones previas (D-01) que el propio plan documenta, justifica y encarga
registrar en este SUMMARY — no son desviaciones del ejecutor, son la razón de ser del plan.

## Issues Encountered

None.

## User Setup Required

None - no se requiere configuración externa.

## Next Phase Readiness

- El hueco BLOCKER de `08-VERIFICATION.md` queda cerrado con evidencia mecánica y humana. La
  Fase 8 (planes 08-01 a 08-04) queda completa: VAL-01 a VAL-06 satisfechos.
- Para la Fase 9 (Histórico y estadísticas): ninguna dependencia nueva se introduce; el motor
  (`engine/stepValues.ts`) sigue sin conocimiento de secuencia (D-13 intacto), y el patrón de
  gate de contenido derivado del dato (no de una lista de ids tecleada) queda disponible como
  precedente para futuros invariantes de orden.
- Pendiente fuera de alcance (no bloqueante): corregir la cifra «37 clips» heredada y errónea
  en VAL-05/ROADMAP a la cifra real (35), y sincronizar manualmente la tabla de trazabilidad de
  `REQUIREMENTS.md` — recordatorio ya registrado como patrón conocido (`requirements
  mark-complete` deja filas obsoletas en silencio).

## Self-Check: PASSED

- `content/marvel-champions.json` — FOUND, `contentVersion` = 14, orden de `setup.escenario`
  verificado literal.
- `engine/__tests__/content.test.ts` — FOUND, contiene el describe `CR-01/VAL-01` (verificado
  vía `npm test` en verde con el recuento de tests incrementado en 4 respecto a 563).
- Commit `ad1c755` — FOUND en `git log --oneline --all`.
- Commit `de4a78b` — FOUND en `git log --oneline --all`.
- `npm test` — 567/567 verde en esta sesión.
- `npm run generate` — completa sin error en esta sesión.

---
*Phase: 08-valores-conocidos-dentro-del-paso*
*Completed: 2026-09-09*
