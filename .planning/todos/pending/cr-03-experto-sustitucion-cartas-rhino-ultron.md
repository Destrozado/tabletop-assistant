---
id: cr-03-experto-sustitucion-cartas-rhino-ultron
created: 2026-09-09
source: 08-REVIEW.md (CR-03), confirmado en 08-VERIFICATION.md
severity: critical
area: fidelidad de reglas
status: pending
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
