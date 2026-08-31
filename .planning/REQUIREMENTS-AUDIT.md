# Auditoría de los 15 requisitos sin marcar en REQUIREMENTS.md

**Fecha:** 2026-08-31
**Método:** verificación goal-backward independiente — sin fiarme de ningún SUMMARY.md ni de la 02-VERIFICATION.md previa por sí solos; cada veredicto de abajo está respaldado por un comando ejecutado en esta sesión (test, grep, script Node desechable) y su salida real.

**Estado de la suite en esta sesión (ejecutado por mí, no citado de memoria):**
- `npx vitest run` → **293 passed (293)**, 14 ficheros, ejecutado tras matar cualquier proceso residual en el puerto 4173.
- `npx playwright test` → **11 passed (11)**, 21.6s.

**Alcance:** de los 15 requisitos sin marcar, **VOZ-07 y VOZ-08 quedan fuera de esta auditoría por instrucción explícita** — ya adjudicados como "pendiente deliberado hasta prueba de escucha en tablet real" tanto por el equipo de la Fase 03.1 como por su verificador. No hay nada que reabrir: la única evidencia que los cerraría (una tablet real, en la mesa, escuchando) es exactamente la que motivó crear la Fase 03.1 después de que el borrador con voces de síntesis fallara ese mismo tipo de prueba. Se listan en la tabla resumen para que quede constancia, pero sin sección de evidencia propia.

Los 13 requisitos auditados en profundidad pertenecen todos a la **Fase 2** según `ROADMAP.md`/`REQUIREMENTS.md` (`FLOW-03/04/07/08, CONT-02..07, CONT-09, ADAPT-04, UI-09`).

---

## Tabla resumen

| Requisito | Fase | Veredicto | Evidencia (una línea) |
|---|---|---|---|
| FLOW-03 | 2 | **ENTREGADO** | `navigator.test.ts:145-151` — `next()` en `loopEndIndex=33` sobre el contenido real cierra en `cursor=24` (`ronda.jugadores.01`), no en preparación |
| FLOW-04 | 2 | **ENTREGADO** | mismo test — `round` pasa de 1 a 2 al cerrar el ciclo |
| FLOW-07 | 2 | **ENTREGADO** | `navigator.test.ts:178-192` — `jumpTo('ronda.villano.03')` + dos `next()` recorren `.04` y `.05` conservando `round` |
| FLOW-08 | 2 | **ENTREGADO** (con matiz de presentación, no de lógica) | `navigator.test.ts:194-212` — `jumpTo('setup.heroes.01')` no toca `round`; pero la ronda retenida desaparece de cabecera/índice mientras se está fuera del bucle (WR-06, sin test de regresión propio) |
| CONT-02 | 2 | **ENTREGADO** | `content.test.ts:307-317` — orden de ids `.02` descartar → `.03` robar → `.04` enderezar, verificado también página a página contra RR v1.7 p.17 en `02-CONTENT-REVIEW.md` |
| CONT-03 | 2 | **ENTREGADO** | `content.test.ts:282-294` (6 pasos `ronda.villano`) + orden confirmado contra RR p.45 en `02-CONTENT-REVIEW.md` |
| CONT-04 | 2 | **ENTREGADO** | `content.test.ts:318-322` — `ronda.villano.05` pasa la ficha de jugador inicial, `.06` cierra fase/ronda |
| CONT-05 | 2 | **ENTREGADO** | `content.test.ts:324-329` — avisos de mazo de jugador vs. mazo de encuentros son literalmente distintos (`toMatch`/`not.toBe`) |
| CONT-06 | 2 | **ENTREGADO** | `content.test.ts` — aviso de `ronda.jugadores.01` remite explícitamente a "dial del villano" |
| CONT-07 | 2 | **ENTREGADO**, reforzado post-cierre | `content.test.ts:568-575` — Aturdido/Confundido coexisten (`/a la vez/i`, `not.toMatch(/sustituye\|reemplaza/i)`); contenido real en línea 417 nombra los tres Estados y su resolución |
| CONT-09 | 2 | **ENTREGADO como proceso, con matiz honesto sobre "todo"** | Cadena completa en `02-CONTENT-REVIEW.md` (revisión→C1/C2→veredicto "aprobado"); ver sección propia abajo sobre el alcance real de "todo el contenido" |
| ADAPT-04 | 2 | **ENTREGADO** | `content.test.ts:344-355` — el campo `branches` no existe en `engine/types.ts`; gate que muerde confirma que añadirlo hace fallar la validación |
| VOZ-07 | 03.1 | **Pendiente deliberado — no reabierto** | Ya adjudicado; requiere prueba de escucha en tablet real |
| VOZ-08 | 03.1 | **Pendiente deliberado — no reabierto** | Ya adjudicado; requiere prueba de escucha en tablet real |
| UI-09 | 2 | **ENTREGADO funcionalmente, con un ítem de accesibilidad sin resolver desde la Fase 2** | `StepScreen.vue`/`app/pages/[game]/index.vue` confirman ambas superficies pulsables y cierre sin tocar `cursor`/`round`; el ítem `human_needed` de foco en iPad/Safari de `02-VERIFICATION.md` sigue abierto en `04-06-SUMMARY.md` |

**Recuento:** 12 ENTREGADO sin reservas de fondo · 1 ENTREGADO con matiz de proceso (CONT-09) · 0 PARCIAL · 0 NO ENTREGADO · 2 pendientes deliberados no reabiertos (VOZ-07/08).

---

## Evidencia detallada

### FLOW-03 — "Al avanzar desde el último paso de la ronda, el usuario vuelve al primer paso de la ronda, no al de la preparación"

**ENTREGADO.**

Test dedicado y nombrado explícitamente con el ID del requisito, ejecutado por mí de forma aislada:

```
$ npx vitest run engine/__tests__/navigator.test.ts
 Test Files  1 passed (1)
      Tests  19 passed (19)
```

`engine/__tests__/navigator.test.ts:145-151`:
```ts
it('next() con cursor en loopEndIndex (33) cierra el bucle: cursor 24, round 2 (FLOW-03/04)', () => {
  const session = expand(marvelChampions, context)
  const atLoopEnd = { ...session, cursor: session.loopEndIndex!, round: 1 }
  const result = next(atLoopEnd)
  expect(result.cursor).toBe(session.loopStartIndex)
  expect(result.round).toBe(2)
})
```

Crítico: este test corre sobre `marvelChampions`, el contenido **real** del repo (importado del propio `content/marvel-champions.json`), no sobre un fixture sintético — confirmé con un script Node que `session.sequence.length === 34` y `loopStartIndex === 24` corresponden exactamente a la estructura real (7 fases de preparación + 2 fases de ronda de 4+6 pasos). `session.loopStartIndex` es el primer paso de `ronda.jugadores`, no de `setup`.

### FLOW-04 — "Al cerrar el ciclo de la ronda, el contador de ronda se incrementa"

**ENTREGADO.** Mismo test que FLOW-03 (línea `expect(result.round).toBe(2)`). Complementado por `engine/__tests__/navigator.test.ts:194-212` que además demuestra que un `next()` que cierra el bucle desde `round=4` produce `round=5`.

### FLOW-07 — "Tras saltar a un paso del bucle de ronda, seguir avanzando continúa correctamente por el bucle desde ese punto"

**ENTREGADO.**

`engine/__tests__/navigator.test.ts:178-192`:
```ts
it('jumpTo("ronda.villano.03") deja round intacto y dos next() seguidos recorren villano.04 y villano.05 (FLOW-07)', () => {
  const session = expand(marvelChampions, context)
  const atRound4 = { ...session, round: 4 }
  const jumped = jumpTo(atRound4, 'ronda.villano.03')
  expect(jumped.round).toBe(4)
  expect(jumped.sequence[jumped.cursor].runtimeId).toBe('ronda.villano.03')

  const advancedOnce = next(jumped)
  expect(advancedOnce.sequence[advancedOnce.cursor].runtimeId).toBe('ronda.villano.04')
  expect(advancedOnce.round).toBe(4)

  const advancedTwice = next(advancedOnce)
  expect(advancedTwice.sequence[advancedTwice.cursor].runtimeId).toBe('ronda.villano.05')
  expect(advancedTwice.round).toBe(4)
})
```
Este test pasa en verde en esta sesión (parte de los 19/19 de `navigator.test.ts`). Prueba exactamente la afirmación del requisito: saltar dentro del bucle y seguir avanzando recorre los pasos correctos en orden, sin desincronizar `round`.

### FLOW-08 — "Un salto a un paso de la preparación no rompe ni reinicia el contador de ronda"

**ENTREGADO, con un matiz de presentación ya documentado y no cerrado (WR-06).**

`engine/__tests__/navigator.test.ts:194-212` confirma con `jumpTo('setup.heroes.01')` que `round` permanece en 4 tras el salto, y que seguir avanzando hasta `loopEndIndex` y seguir incrementa a 5 con normalidad. La lógica del requisito —el contador no se rompe— está probada y en verde.

El matiz, ya identificado por la propia `02-VERIFICATION.md` (hallazgo WR-06) y confirmado por mí leyendo `engine/header.ts`/`engine/toc.ts`/`app/pages/[game]/index.vue`: mientras el cursor está fuera del bucle (en preparación), la ronda retenida **no se muestra** en ninguna superficie (cabecera, índice, resumen de reanudación). El contador existe y es correcto en el estado (`round` sigue siendo 4), pero visualmente desaparece hasta volver al bucle. Esto no contradice la letra del requisito ("no rompe ni reinicia"), pero es una brecha de UX que no tiene test de regresión propio — vale la pena anotarlo, no bloquear el checkbox por ello.

### CONT-02 — "El flujo cubre la fase de los jugadores, incluido el orden correcto de fin de fase (descartar, robar, preparar)"

**ENTREGADO.**

Inspección directa del contenido (script Node ejecutado en esta sesión):
```
=== phase ronda.jugadores Jugadores steps: 4
  - ronda.jugadores.02 | text: En orden de jugador, descartad hasta bajar al tamaño de vuestra mano.
  - ronda.jugadores.03 | text: Robad a la vez hasta completar el tamaño de vuestra mano.
  - ronda.jugadores.04 | text: Enderezad a la vez todas vuestras cartas...
```

Test dedicado, `engine/__tests__/content.test.ts:307-317`, con el ID del requisito en el nombre:
```ts
it('CONT-02: orden de fin de fase — descartar, robar, enderezar, en ese orden de ids', () => { ... })
```
En verde (55/55 en `content.test.ts`). Además, `02-CONTENT-REVIEW.md` (Corrección B) documenta que esta sección se contrastó página a página contra el Rules Reference v1.7 p.17 ("End of Player Phase", pasos 1-5), corrigiendo una cita de página equivocada durante ese proceso.

### CONT-03 — "El flujo cubre la fase del villano con sus 6 pasos oficiales, en el orden del reglamento"

**ENTREGADO.**

Script Node ejecutado en esta sesión confirma 6 pasos reales: `ronda.villano.01` (Colocar amenaza) → `.02` (Los enemigos activan) → `.03` (Repartir encuentro) → `.04` (Revelar encuentro) → `.05` (Pasar ficha) → `.06` (Fin de fase/ronda).

`engine/__tests__/content.test.ts:282-294` fija estructuralmente `villano.steps.length === 6` y `allRondaSteps[último].id === 'ronda.villano.06'`. `02-CONTENT-REVIEW.md` confirma el orden contra RR v1.7 p.45 (Place Threat → Enemies Activate → Deal Encounter Cards → Reveal Encounter Cards → Pass First Player Token → End of Villain Phase and Round) y documenta que el borrador original tenía solo 4 pasos — este es exactamente el error de fidelidad que la Fase 2 existe para corregir, y está corregido y bajo test estructural.

### CONT-04 — "El flujo cubre el fin de ronda, incluido el paso de la ficha de jugador inicial"

**ENTREGADO.**

`ronda.villano.05.text`: "Pasad la ficha de jugador inicial al jugador de vuestra izquierda." — confirmado por lectura directa del JSON. `ronda.villano.06` ("Cerrad la fase y la ronda antes de empezar la siguiente") existe como paso `kind:'step'` real con `warningDetail` propio que cubre las dos cláusulas del cierre (efectos "hasta el final de..." que terminan, y efectos "cuando termine..." que se resuelven — Corrección E de `02-CONTENT-REVIEW.md`, que documenta que el borrador omitía por completo la primera mitad de esta regla).

`engine/__tests__/content.test.ts:318-322`:
```ts
it('CONT-04: ronda.villano.05 pasa la ficha de jugador inicial y ronda.villano.06 existe como paso real', () => { ... })
```
En verde.

### CONT-05 — "El flujo cubre el agotamiento del mazo de jugador y el del mazo de encuentros como casos distintos, con sus consecuencias correctas"

**ENTREGADO.**

Lectura directa del JSON confirma dos `warningDetail` distintos y no intercambiables:
- `ronda.jugadores.03.warningDetail`: "barajad vuestro descarte para formar uno nuevo y repartíos a vosotros mismos una carta de encuentro boca abajo..."
- `ronda.villano.04.warningDetail`: "barajad su pila de descartes para formar uno nuevo y colocad además una ficha de aceleración junto al mazo..."

`engine/__tests__/content.test.ts:324-329` lo fija con `toMatch`/`not.toBe` cruzados (el aviso de jugador no menciona "aceleración", el de encuentros sí, y no son literalmente iguales). Test en verde.

### CONT-06 — "El flujo cubre el cambio de fase del villano al agotarse su vida"

**ENTREGADO.**

`ronda.jugadores.01.warningDetail`: "Cuando el dial del villano llega a cero, retirad su etapa actual y revelad la siguiente, ajustando el dial a la vida impresa. Si el título de la nueva etapa es el mismo, conservad adjuntos, mejoras, cartas de Estado y fichas que no sean de daño; si el título es distinto, no se conserva nada." — confirmado leyendo el JSON.

Test `content.test.ts` con el ID en el nombre: `'CONT-06: aviso de cambio de fase del villano remite al dial del villano'`, en verde.

### CONT-07 — "El flujo recuerda, en el momento en que aplican, los estados Aturdido, Confundido y Duro con su resolución correcta"

**ENTREGADO — y con evidencia adicional de que se reforzó después de la Fase 2, no solo dentro de ella.**

`grep -n -i "aturdid\|confundid\|duro" content/marvel-champions.json` (ejecutado en esta sesión) localiza el contenido exacto:
```
"optionsWarningDetail": "Aturdido cancela el próximo ataque y Confundido el próximo intento de retirar amenaza: se descarta ese Estado en lugar de la acción, y los costes se pagan igual. Se pueden tener los dos a la vez; recibir uno no quita el otro y solo se van al gastarlos. Duro impide recibir daño hasta que se descarta."
"warningDetail": "...Aturdido o Confundido cancelan esa activación y se descartan."
```
Los tres Estados están nombrados, con su resolución explícita, en dos puntos del flujo (fase de jugadores y fase del villano — es decir, "en el momento en que aplican", cubriendo tanto cuando atacan los héroes como cuando ataca el villano).

Tests dedicados en `engine/__tests__/content.test.ts`, en verde:
```ts
it('jugadores.01.optionsWarningDetail explica Aturdido y Confundido, y afirma su coexistencia sin decir que se sustituyen', () => {
  expect(step.optionsWarningDetail).toMatch(/aturdido/i)
  expect(step.optionsWarningDetail).toMatch(/confundido/i)
  expect(step.optionsWarningDetail).toMatch(/a la vez/i)
  expect(step.optionsWarningDetail).not.toMatch(/sustituye|reemplaza/i)
})
```

**Historia relevante para la confianza en este veredicto:** el commit `3b2db30` (quick task `260831-fkb-regla-cartas-de-estado`, posterior al cierre formal de la Fase 2) corrigió explícitamente que "un Estado retira al otro" — un error de fidelidad detectado *después* del "aprobado" de `02-CONTENT-REVIEW.md`. Ese quick task cita Rules Reference p.39 (Status Cards), pasó por un `checkpoint:human-verify` con veredicto "Aprobado" del usuario, y su propio SUMMARY documenta honestamente una laguna deliberada no incluida por límite de caracteres (el matiz de "atacar sin objetivo válido solo para gastar el Estado"), registrada como deuda futura en `STATE.md`, no silenciada. Esto es exactamente el patrón de calidad que el proyecto quiere: el hueco se encontró, se corrigió con cita, se verificó con humano, y lo que no se cubrió se anotó en vez de ocultarse.

### CONT-09 — "Todo el contenido queda verificado contra el Rules Reference oficial v1.7 antes de considerarse definitivo, incluidos los errores ya detectados en el borrador"

**ENTREGADO como proceso — con un matiz honesto sobre el alcance de "todo".**

Este es un requisito de proceso/procedencia, no de código, tal y como pide la tarea que se trate. La cadena de evidencia que sostiene el veredicto:

1. **Fase 1 (`setup`, 23 pasos):** `01-VERIFICATION.md` documenta contenido "verificado tres veces contra el Rules Reference v1.7... página por página en esta sesión", con "eliminación de una regla fantasma y dos reversiones de sobreafirmación «por jugador»", confirmadas de forma independiente por el propio verificador de esa fase (no solo citadas del SUMMARY).
2. **Fase 2 (`ronda`, 10 pasos):** `02-CONTENT-REVIEW.md` — dossier completo con tabla de 10 pasos, 5 correcciones objetivas de citas/omisiones verificadas página a página contra el PDF (`pdftotext -layout -f N -l N`, método explícitamente elegido para evitar el desorden de columnas del modo continuo), veredicto humano literal transcrito ("aprobado", sin condiciones), y dos correcciones de fondo (C1/C2) que se difirieron hasta construir la capacidad de esquema necesaria y luego se aplicaron y re-verificaron en la app antes del cierre.
3. **Fase 3 (27 frases `speech` nuevas de la sección `setup`):** `03-SPEECH-REVIEW.md` — mismo método, con el reglamento en rol "secundario" porque son reformulaciones de texto ya contrastado, no reglas nuevas.
4. **Post-cierre (quick task `260831-fkb`):** cuando se detectó un error nuevo en `ronda.jugadores.01`/`ronda.villano.02` *después* de que CONT-09 se diera por cerrado, el proceso se repitió a escala menor: cita nueva a Status Cards (p.39), `checkpoint:human-verify` con "Aprobado", y la laguna que no se cubrió se documentó en vez de omitirse silenciosamente.

**El matiz honesto que pide la tarea:** el contenido de Marvel Champions v1 tiene exactamente dos secciones (`setup` y `ronda`, confirmado por inspección directa del JSON — no hay una tercera sección de contenido en el juego). Ambas están cubiertas por un dossier de revisión con veredicto humano transcrito. En ese sentido concreto, "todo el contenido" (de las dos secciones que existen) sí es una afirmación sustanciable con evidencia documental real, no una promesa vacía.

Dicho esto, dos reservas que cualquier persona razonable debería tener presentes antes de marcar la casilla sin condiciones:
- **No es una auditoría independiente de tercero.** El mismo proceso (Claude autorando, Claude comprobando página del PDF, el propio usuario del proyecto dando el "aprobado") es juez y parte. Es el proceso correcto y proporcionado para un proyecto de hobby de un grupo de amigos — el propio `CLAUDE.md` no exige más — pero "verificado contra el Rules Reference" no equivale a "verificado por alguien ajeno al proyecto".
- **El gate automático que debía proteger el contenido futuro (CR-01 de `02-REVIEW.md`) tuvo que corregirse aparte.** `engine/schema.ts` usa hoy `z.strictObject` en los seis esquemas de objeto (confirmado leyendo el fichero: comentario explícito "CR-01 (revisión 02): TODOS los objetos de este esquema son z.strictObject, nunca z.object"), lo cual demuestra que en el momento del cierre original de la Fase 2 el gate automático **no** protegía contra campos desconocidos — se arregló en un momento posterior no cubierto por esta auditoría de los 13 requisitos (no forma parte de ningún ID de REQUIREMENTS.md, pero es relevante para juzgar cuánto pesa la palabra "gate" en la promesa de CONT-09). Hoy el gate sí es sólido; en el momento del "aprobado" original, no lo era del todo.

Con esas dos reservas anotadas (no como bloqueo, sino como contexto), la afirmación "todo el contenido queda verificado" es defendible tal y como está escrita hoy en el repo.

### ADAPT-04 — "Los pasos con ramas condicionales muestran todas las ramas como texto simultáneamente, sin requerir ningún toque para elegir"

**ENTREGADO.**

`ronda.villano.02.text`: "El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego." — una única frase colectiva que cubre ambas ramas (Héroe y Alter-Ego) a la vez, sin ningún campo de rama seleccionable.

Confirmé con `grep -n "branches" engine/types.ts engine/schema.ts` que el campo `branches` **no existe en absoluto** en el modelo de tipos ni en el esquema — no es que esté vacío, es que la capacidad de "ramas que hay que elegir" fue deliberadamente descartada del diseño (D-33).

`engine/__tests__/content.test.ts:344-355`, dos tests en verde:
```ts
it('ADAPT-04 (D-33): ronda.villano.02 muestra la rama héroe y la rama alter-ego a la vez, sin campo branches', () => {
  expect(step.text).toMatch(/héroe/i)
  expect(step.text).toMatch(/alter-ego/i)
  expect(step.branches).toBeUndefined()
})

it('gate CR-01/D-33 que muerde: añadir branches a un paso de una copia en memoria hace fallar la validación', () => {
  mutated.branches = [{ label: 'Héroe' }]
  expect(() => validateGameDefinition(mutated)).toThrow()
})
```
El segundo test es un "gate que muerde" real: inyecta el campo prohibido y comprueba que la validación falla, no solo que hoy no está presente. Con `z.strictObject` (confirmado vigente en `engine/schema.ts`), esta protección es sólida hoy.

### UI-09 — Avisos `⚠` y opciones del turno pulsables, con cierre que no pierde posición ni ronda

**ENTREGADO funcionalmente, con un ítem de accesibilidad conocido y sin resolver desde la Fase 2.**

Confirmé en `app/components/StepScreen.vue`:
```vue
<button v-if="warningText && warningDetailText" @click="emit('open-warning-detail')">⚠ {{ warningText }} ›</button>
<p v-else-if="warningText">⚠ {{ warningText }}</p>
```
misma estructura para `optionsWarningText`/`optionsWarningDetailText`, y una rejilla de opciones pulsable para `ronda.jugadores.01.options` (6 entradas, cada una con su propio `detail`, confirmado leyendo el JSON).

En `app/pages/[game]/index.vue`:
```ts
function onDismissDetail() {
  activeDetail.value = null
}
```
Confirmé que esta función **no** toca `cursor` ni `round` — el cierre del panel nunca mueve la posición ni la ronda, que es exactamente lo que exige la letra del requisito.

**El matiz que sí hay que anotar:** `02-VERIFICATION.md` (Fase 2, estado `human_needed`) dejó un ítem de verificación humana sin resolver: el modal (`WarningDetailModal.vue`) no implementa focus-trap y captura el disparador con `document.activeElement`, que en Safari/WebKit es `<body>` tras un toque — un comportamiento que no se puede probar con Vitest/jsdom y que requiere un iPad real o un lector de accesibilidad. Confirmé que **este ítem sigue abierto**: `WarningDetailModal.vue` (leído en esta sesión) sigue sin `inert` ni focus-trap, y `04-06-SUMMARY.md` (Fase 4, la última completada) lo menciona explícitamente como "Item `human_needed` de la Fase 2 (trampa de foco del modal en un iPad/Safari real) sigue abierto a nivel de hito". No aparece registrado en ningún `deferred-items.md` ni en `STATE.md` bajo ese nombre — es un cabo suelto real, aunque no invalida la letra de UI-09 (que no menciona foco de teclado ni accesibilidad WebKit).

### VOZ-07 / VOZ-08 — no reabiertos

Por instrucción explícita de esta tarea, no se reabren. Registro solo la constancia pedida: tanto `.planning/phases/03.1-.../03.1-VERIFICATION.md` como el propio commit `12ed250` ("fix(03.1): VOZ-07 sigue pendiente — no se entrega hasta que la reproducción funcione en la tablet") documentan que la decisión de mantenerlos pendientes es deliberada y está tomada por la razón correcta: la app usa audio pregenerado servido desde el navegador, y la única prueba que cierra estos dos requisitos es escuchar ese audio en el dispositivo objetivo real, algo que ningún test automatizado ni navegador de escritorio puede sustituir — es, de hecho, el mismo tipo de brecha (prueba de escritorio ≠ prueba de tablet real) que aparece también en el ítem de accesibilidad de UI-09 de arriba.

---

## Recomendación de cierre

**El orquestador puede marcar con seguridad las 12 casillas siguientes**, cada una con cita de test ejecutado en verde en esta sesión y, donde aplica, con el dossier de revisión humana correspondiente:

- FLOW-03, FLOW-04, FLOW-07, FLOW-08
- CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07
- ADAPT-04
- UI-09

**CONT-09 se puede marcar también**, pero con la reserva anotada arriba transcrita a algún sitio visible (aunque sea una nota en `STATE.md` o en la propia línea de `REQUIREMENTS.md`): es una afirmación de proceso, verificada y con veredicto humano, cubriendo el 100% de las secciones de contenido que existen hoy (`setup` + `ronda`) — pero no es una auditoría de tercero independiente, y el gate automático que debía sostenerla estructuralmente no estaba completo en el momento del "aprobado" original (se completó después, fuera del alcance de la Fase 2).

**No se puede marcar ninguna casilla nueva para VOZ-07 ni VOZ-08.** Siguen exactamente donde estaban: pendientes de una prueba de escucha en la tablet real de la mesa, sin sustituto posible con las herramientas de este entorno.

**Ningún ítem requiere trabajo de código adicional para cerrar su checkbox.** El único cabo suelto real que sí merece una decisión humana explícita (no de código) es el foco de teclado del modal en iPad/Safari (afecta a la calidad de UI-09 más allá de la letra del requisito) — recomiendo que quede registrado en `STATE.md` como concern abierto si no lo está ya, en vez de perderse entre fases.

---

## AUDIT COMPLETE

**ENTREGADO:** 12 (FLOW-03, FLOW-04, FLOW-07, FLOW-08, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, ADAPT-04, UI-09)
**ENTREGADO con matiz de proceso:** 1 (CONT-09)
**PARCIAL:** 0
**NO ENTREGADO:** 0
**Pendiente deliberado, no reabierto (fuera de alcance de esta auditoría):** 2 (VOZ-07, VOZ-08)
