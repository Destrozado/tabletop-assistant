---
id: cr-03-experto-sustitucion-cartas-rhino-ultron
created: 2026-09-09
source: 08-REVIEW.md (CR-03), confirmado en 08-VERIFICATION.md
severity: critical
area: fidelidad de reglas
status: completed
resolved: 2026-09-23
resolved_by: quick-260923-3ri
---

# En Experto, la app manda sustituir cartas que no existen para Rhino y Ultron

## Qué pasa

La variante `expert` del paso `setup.escenario.04` de `content/marvel-champions.json` dice, sin
condición:

> «Sustituid las cartas de villano numeradas por las del modo Experto de este escenario.»

Eso solo es cierto para **Kang**. En `content/marvel-characters.json`, únicamente Kang tiene datos
`expert` en sus etapas; Rhino y Ultron no tienen ninguno. El propio repo ya lo dice por escrito en
`engine/types.ts:196-199`: la ausencia de `expert` «es un hecho del dominio, no un dato pendiente:
significa que el modo Experto de ese escenario no sustituye las cartas de villano numeradas (caso
de Rhino y Ultron, villanos del Core Set)».

Resultado: en Experto con 2 de los 3 villanos jugables, el asistente manda al grupo a buscar unas
cartas que no vienen en la caja. En Experto, para Rhino y Ultron, lo único que cambia es que se
añade el set de encuentros Experto (RR v1.7 p. 28).

## Por qué no se arregló en la Fase 8

Es un defecto **pre-existente**: el texto se autoró en el commit `50c3439` (Fase 1, 2026-08-28),
siete fases antes. La Fase 8 tenía VAL-04 como restricción explícita —no reescribir ni un carácter
de contenido autorado— así que arreglarlo dentro de la fase habría violado su propio contrato.
`08-VERIFICATION.md` lo enruta fuera de alcance de forma deliberada y razonada (veredicto (b)).

No afecta a la cifra que imprime la Fase 8: `engine/counters.ts:34` solo elige `stage1.expert` si
existe, así que para Rhino y Ultron el dial muestra la cifra estándar, que es la correcta.

## Coste a tener en cuenta antes de planificarlo

Cualquier arreglo que reescriba `speech` **cuesta clips de voz nuevos** (cuota de la API de
Gemini, regeneración, y actualizar `scripts/voice/manifest.json` y los recuentos de 35). Rutas
posibles, de menos a más coste:

- Condicionar el paso al villano elegido (requiere que el contenido sepa de la selección — hoy
  las variantes solo distinguen por `difficulty`, no por villano).
- Reescribir la variante `expert` a una redacción que sea cierta para los tres villanos
  (p. ej. «Si este escenario trae cartas de villano de modo Experto, sustituidlas ahora») — un
  clip nuevo, no tres.

Decidir la ruta antes de planificar; no es un cambio de una línea.

## Enlaces

- `.planning/phases/08-valores-conocidos-dentro-del-paso/08-REVIEW.md` — CR-03
- `.planning/phases/08-valores-conocidos-dentro-del-paso/08-VERIFICATION.md` — sección «Juicio requerido: CR-03»

## Resolución (quick 260923-3ri, 2026-09-23)

**Ruta elegida:** de las dos rutas que este mismo todo apuntaba en «Coste a tener en cuenta antes
de planificarlo», se eligió la de menor coste: reescribir la variante `expert` a una redacción
cierta para los tres villanos (un clip de voz nuevo, no tres, y sin condicionar el paso por
villano — el contenido hoy no distingue por villano, solo por `difficulty`).

**Texto anterior (`variants.difficulty.expert` de `setup.escenario.04`):**
- text/speech (idénticos): «Sustituid las cartas de villano numeradas por las del modo Experto de
  este escenario.»

**Texto nuevo:**
- text: «Usad las cartas de villano numeradas (etapas) que indica el escenario para Experto.»
- speech: «Usad las cartas de villano numeradas que indica el escenario para el modo Experto.»

**Justificación (RR v1.7 p. 28, Modes of Play — Expert Mode, cita breve para uso privado del
grupo, registrada en `.planning/phases/02-bucle-de-ronda-y-reglas-verificadas/02-RESEARCH.md:432`):**
«follow the content and setup instructions for the chosen scenario, using the listed expert mode
villain stages, and add the Expert encounter set to the encounter deck». La frase nueva es la
paráfrasis directa de «using the listed expert mode villain stages»: es cierta tanto si el
escenario de un villano concreto indica otras etapas en Experto (caso de Kang, set `exp_kang`)
como si no indica ningún cambio (caso conocido hoy de Rhino y Ultron), porque no afirma que
existan cartas «de modo Experto» — solo remite a lo que el escenario indique.

**Por qué se descartó la redacción condicional que proponía este mismo todo** («Si este escenario
trae cartas de villano de modo Experto, sustituidlas ahora»): esa redacción da por hecho que para
Rhino y Ultron el modo Experto no cambia nada en las cartas de villano, y RR p. 28 («the listed
expert mode villain stages») junto con RR p. 48, Appendix I — Encounter Decks («Expert mode …
uses a different combination of villain stages») no respaldan esa certeza — ver el todo nuevo
abierto más abajo. La redacción elegida no necesita esa suposición para ser cierta.

**`contentVersion`:** se mantiene en 14 (mismo razonamiento que el quick 260902-0oz: ni los ids ni
la secuencia de pasos cambian, y el texto se resuelve siempre fresco del contenido en cada carga,
así que subir la versión solo invalidaría una partida guardada en curso sin ganar nada a cambio).

**Generación de audio:** el clip `setup.escenario.04.expert` se regeneró con
`scripts/voice/generate.mjs` usando el respaldo `ffmpeg` añadido en la Task 1 de 260923-3ri (esta
máquina es Linux/WSL2, sin `afconvert`). Los recuentos de 35 clips y 35 entradas de manifiesto no
cambiaron; ninguna otra entrada del manifiesto se tocó.

**Duda de reglas que queda abierta:** la afirmación del apartado «Qué pasa» de este todo («en
Experto, para Rhino y Ultron, lo único que cambia es que se añade el set de encuentros Experto»)
queda SIN CONFIRMAR contra el reglamento físico o el PDF del Rules Reference — no se ha verificado
si la hoja de preparación del escenario de Rhino/Ultron indica en Experto una combinación de
etapas de villano distinta de la estándar. Se traslada, redactada como pregunta por verificar (no
como hecho), a
`.planning/todos/pending/experto-etapas-de-villano-rhino-ultron-por-verificar.md`.
