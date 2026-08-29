# Phase 2: Bucle de ronda y reglas verificadas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-29
**Phase:** 2-Bucle de ronda y reglas verificadas
**Areas discussed:** Pasos por jugador, Cabecera en la ronda, Índice en el bucle, Fase de jugadores, Reglas condicionales, Ramas Héroe/Alter-Ego, Fin de ronda, Verificación v1.7

**Nota de método:** antes de la primera pregunta se extrajo el Rules Reference v1.7 con `pdftotext -layout` para que las opciones se apoyaran en el texto oficial y no en el borrador. De ahí salieron los dos hallazgos que reorientaron la discusión: cuatro de los seis pasos de la fase del villano son explícitamente «en orden de jugador», y el «fin de ronda» no es un tramo aparte en el reglamento.

---

## Pasos por jugador

| Option | Description | Selected |
|--------|-------------|----------|
| Un paso colectivo | Un solo paso en plural para toda la mesa; respeta D-02/D-08; cero cambios en el motor | ✓ |
| Un paso por jugador | Campo `perPlayer`, expansión en `expand.ts`; cumple `PITFALLS.md:63` pero revisa D-08 | |
| Híbrido selectivo | Colectivo por defecto, expansión solo en 2-3 pasos críticos | |

**User's choice:** Un paso colectivo
**Notes:** Se le expuso la contradicción entre `PITFALLS.md:63` (recomienda un paso por jugador) y D-02/D-08 de la Fase 1. Optó por mantener las decisiones de la Fase 1 intactas.

| Option | Description | Selected |
|--------|-------------|----------|
| Línea ⚠ de recuento | Aviso «uno por jugador, sin saltarse a nadie» usando el mecanismo de D-05 | ✓ |
| Redacción del propio paso | El recuento dentro de la frase de acción, dejando el ⚠ libre | |
| Ambas cosas | Acción y aviso reforzándose | |

**User's choice:** Línea ⚠ de recuento

---

## Cabecera en la ronda

| Option | Description | Selected |
|--------|-------------|----------|
| Relativo a la fase | `RONDA 4 · Villano · 3 de 6`; coincide con D-11 y con los 6 pasos oficiales | ✓ |
| Relativo a la ronda | `9 de 14`; denominador estable pero se aleja de la maqueta | |
| Sin contador en el bucle | Solo `RONDA 4 · Villano`; coherente con D-12 | |

**User's choice:** Relativo a la fase

| Option | Description | Selected |
|--------|-------------|----------|
| Se queda igual | `PREPARACIÓN · 8 de 21`; asimetría entre tramos aceptada | ✓ |
| Simétrica con la ronda | Sección · bloque · posición en todos los tramos | |

**User's choice:** Se queda igual

---

## Índice en el bucle

| Option | Description | Selected |
|--------|-------------|----------|
| Ronda arriba, setup abajo | Bloques de la ronda primero, preparación atenuada al final | ✓ |
| Solo la ronda | Más limpio, pero deja FLOW-08 sin puerta de entrada | |
| Todo en orden natural | Lo que ya hace `tableOfContents()` hoy; 21 filas cumplidas por delante | |

**User's choice:** Ronda arriba, setup abajo

| Option | Description | Selected |
|--------|-------------|----------|
| Solo ● en el bucle | El ✓ significa «hecho y no vuelve»: cierto en el setup, falso en el bucle | ✓ |
| ✓ igual que ahora | Una sola regla en todo el código | |

**User's choice:** Solo ● en el bucle

| Option | Description | Selected |
|--------|-------------|----------|
| Por el índice, sin más | Cero código y cero estado nuevos; `jumpTo()` ya cumple FLOW-08 | ✓ |
| Botón «Volver a la ronda» | Retorno directo, a costa de recordar el punto de salida | |

**User's choice:** Por el índice, sin más

---

## Fase de jugadores

| Option | Description | Selected |
|--------|-------------|----------|
| Turnos + los 3 de fin | 4 pasos; cumple CONT-02 al pie de la letra | ✓ |
| Turnos + un paso de fin | 2 pasos; diluye el orden que CONT-02 pide | |
| Turno desglosado también | Pasos-recordatorio del turno libre; el festival de toques de D-04 | |

**User's choice:** Turnos + los 3 de fin

| Option | Description | Selected |
|--------|-------------|----------|
| No, fuera | Los pasos 4-5 del reglamento son sincronización, no acción física | |
| Como línea ⚠ | Cubre CONT-02 entero sin añadir toques | ✓ |
| Sí, un paso propio | Fidelidad máxima, un toque más por ronda | |

**User's choice:** Como línea ⚠

---

## Reglas condicionales

| Option | Description | Selected |
|--------|-------------|----------|
| Campo `reminders[]` nuevo | Lista de condicionales por paso; único hueco para los tres Estados juntos | |
| Solo línea ⚠ | Cero código nuevo, pero 60 caracteres compartidos | ✓ |
| Pasos condicionales | Imposibles de olvidar, inútiles la mayoría de rondas | |

**User's choice:** Solo línea ⚠
**Notes:** Al elegir esto quedaba un problema abierto: Aturdido, Confundido y Duro caen los tres en el mismo paso y no caben en 60 caracteres con su resolución correcta (CONT-07).

| Option | Description | Selected |
|--------|-------------|----------|
| Subir el tope de `warning` | De 60 a ~120 caracteres | |
| Repartir en más pasos | Dividir el paso ancla para ganar avisos | |
| Comprimir y priorizar | Mantener 60 y sacrificar detalle | |

**User's choice:** *(ninguna — respuesta libre)* «Yo no explicaría los estados en sí; las cartas físicas llevan la regla escrita, simplemente hace falta un recordatorio de "atento a Estados en el personaje". Ayer el villano tenía Confundido y Aturdido y ni nos dimos cuenta en toda una fase de villano.»
**Notes:** Mejor que las tres opciones ofrecidas: desactiva el problema de los 60 caracteres de raíz y se convirtió en el principio rector D-31 de todo el contenido de la ronda.

| Option | Description | Selected |
|--------|-------------|----------|
| Todo el contenido | El principio gobierna toda la redacción de la ronda | ✓ |
| Solo las condicionales | Se queda en CONT-05/06/07 | |

**User's choice:** Todo el contenido

| Option | Description | Selected |
|--------|-------------|----------|
| Enunciar la consecuencia | Coherente con los agotamientos de mazo | |
| Solo recordar mirar | Mismo caso que los Estados | |

**User's choice:** *(ninguna — respuesta libre)* Propuso que el aviso fuera clicable y abriera un modal con la consecuencia: «el recordatorio lo quieres siempre, pero las consecuencias solo si no te las sabes».
**Notes:** Se le señaló que eso es literalmente REF-01/REF-02 (`REQUIREMENTS.md:109-110`, v2) y que ampliaría el alcance de la fase; también que mostrar la regla «literalmente» chocaría con la restricción legal del proyecto. **Reafirmó la idea**, así que se aceptó como decisión suya y se pasó a acotarla.

| Option | Description | Selected |
|--------|-------------|----------|
| Solo el aviso ⚠ | Campo opcional + modal; cero corpus y cero enlazado | ✓ |
| Aviso + palabras clave | Diccionario de keywords; media REF-01 | |
| Mejor como Fase 2.1 | Insertar lo clicable como fase propia después | |

**User's choice:** Solo el aviso ⚠

---

## Ramas Héroe/Alter-Ego

| Option | Description | Selected |
|--------|-------------|----------|
| Una frase que cubre ambas | Registro colectivo de D-02; cumple ADAPT-04 sin añadir nada | ✓ |
| Campo `branches[]` nuevo | Dos bloques etiquetados; jerarquía visual explícita | |
| Dentro de `text` con tope mayor | Estructura dentro de texto plano; difícil de validar | |

**User's choice:** Una frase que cubre ambas

---

## Fin de ronda

| Option | Description | Selected |
|--------|-------------|----------|
| Dos fases, como el reglamento | RONDA = JUGADORES + VILLANO; ficha y cierre dentro del villano | ✓ |
| Tres fases, como el borrador | Añade FIN DE RONDA; rompería el «de 6» y CONT-03 | |

**User's choice:** Dos fases, como el reglamento

| Option | Description | Selected |
|--------|-------------|----------|
| Paso de verdad | 6 pasos reales; el 6 es la frontera visible del bucle | ✓ |
| ⚠ del paso 5 | Un toque menos, pero contradice CONT-03 y el criterio 1 | |

**User's choice:** Paso de verdad
**Notes:** Se le expuso que era inconsistente con lo decidido para la fase de jugadores (allí sí plegó los pasos 4-5 a un ⚠). Aceptó la asimetría porque CONT-03 exige los 6 y el paso 6 gana función propia.

---

## Verificación v1.7

| Option | Description | Selected |
|--------|-------------|----------|
| Patrón Fase 1 + revisión tuya | Citas + gate CI + reverificación + tarea explícita de revisión humana | ✓ |
| Doble pasada de agente | Redactor y verificador independientes antes de llegar al usuario | |
| Solo el patrón de la Fase 1 | El dispositivo que dejó pasar tres errores en 01-06 | |

**User's choice:** Patrón Fase 1 + revisión tuya

| Option | Description | Selected |
|--------|-------------|----------|
| Endurecer a exactamente una | Resuelve el `TODO(fase 2)` de `schema.ts` | ✓ |
| Dejarlo en como mucho una | Más laxo para un juego futuro sin bucle | |

**User's choice:** Endurecer a exactamente una

---

## Claude's Discretion

El usuario no delegó ninguna decisión explícitamente. En el gate final se le ofrecieron tres zonas grises adicionales y eligió «Listo para el contexto» sin abordarlas, así que quedan a criterio del planner:

- **Frase locutable (`speech`) del contenido de la ronda.** Hallazgo de la discusión: el contenido actual tiene 24 pasos, 3 con `warning` y **0 con `speech`**, pese a que el roadmap dice que el campo se diseña desde la Fase 1 «porque retro-adaptarlo después sería caro». Sin decidir, la Fase 3 hereda ~45 pasos que locutar de golpe.
- **Reanudación dentro del bucle.** `ResumePrompt.vue` no menciona la ronda; `PITFALLS.md:179` avisa de ese riesgo.
- **Detalle de UI del modal del ⚠.** Superficie nueva sin spec; valorar `/gsd:ui-phase 2`.

## Deferred Ideas

- **REF-01/REF-02 completos** — keywords clicables en cualquier texto, con corpus de reglas y búsqueda por término. Ya existían como v2; reforzados por el caso real del villano Confundido+Aturdido. D-32 adelanta solo el aviso clicable.
- **Nota legal asociada** — cuando llegue REF-01, redacción propia + cita, nunca texto literal del Rules Reference.
- **Fase 2.1 dedicada a lo clicable** — ofrecida y descartada a favor de acotar dentro de la Fase 2.
- **Campo `branches[]`** — descartado por D-33.
- **Botón «Volver a la ronda»** — descartado por D-26.
- **`perPlayer`** — descartado por D-20; reconsiderable si el ⚠ de recuento no basta en mesa.
- **Subir el tope de 60 caracteres de `warning`** — dejó de hacer falta al aparecer D-31 y D-32.
