# Phase 6: Selección de villano, héroes y jugadores - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 6-Selección de villano, héroes y jugadores
**Areas discussed:** Anatomía del paso con selectores, Filtro y nombres en español, Nombre de jugador y teclado, Estado y edición de la selección

---

## Anatomía del paso con selectores

### ¿Dónde viven los selectores respecto al paso «Decidid, como grupo…»?

| Option | Description | Selected |
|--------|-------------|----------|
| Rejilla dentro del paso | Bajo la frase grande, rejilla de botones que abren su modal. Reutiliza el patrón `options[]` de la Fase 2. Lectura literal de SEL-01/SEL-03 | ✓ |
| Un botón → pantalla completa | El paso más un botón «Elegir personajes ›» que abre un overlay a pantalla completa (precedente IndexOverlay, D-13) | |
| El paso ES la pantalla de elección | `setup.heroes.01` deja de renderizarse como texto-grande y pasa a ser pantalla de configuración | |

**User's choice:** Rejilla dentro del paso
**Notes:** Se le mostró la maqueta ASCII con 3 jugadores y la eligió sobre las otras dos.

### ¿Cómo sabe la app qué paso pinta la rejilla de selección?

| Option | Description | Selected |
|--------|-------------|----------|
| Campo nuevo en el paso | Clave opcional en el esquema (p.ej. `selection: 'characters'`) declarada en `setup.heroes.01`. Respeta TECH-04 | ✓ |
| Cablear el id en la capa de app | `if (step.id === 'setup.heroes.01')`. Cero cambios en contenido, contradice la disciplina del proyecto | |
| Tú decides | Que lo resuelvan research/planning | |

**User's choice:** Campo nuevo en el paso
**Notes:** Se le advirtió que toca `content/marvel-champions.json` y `engine/schema.ts` pero ningún `text`/`speech`.

### Un grupo que no quiere elegir nada: ¿qué ve y qué pasa al pulsar SIGUIENTE?

| Option | Description | Selected |
|--------|-------------|----------|
| Rejilla visible, SIGUIENTE libre | Rejilla siempre visible con «—»; SIGUIENTE avanza sin aviso, sin bloqueo, sin confirmación | ✓ |
| Rejilla visible pero atenuada hasta tocarla | Filas vacías en texto secundario, se «encienden» al elegir | |
| Un único botón que despliega la rejilla | Por defecto solo «Elegir personajes»; tocarlo despliega las filas | |

**User's choice:** Rejilla visible, SIGUIENTE libre
**Notes:** Se planteó explícitamente la tensión con el criterio de éxito nº 5 («sin ningún hueco ni exigencia nueva»); la interpretación resultante quedó registrada en D-03.

### Si la rejilla y el texto grande no caben a la vez, ¿quién cede?

| Option | Description | Selected |
|--------|-------------|----------|
| El texto nunca se reduce; scroll si hace falta | `text-display` intacto; el área del paso hace scroll (`overflow-y-auto` ya existe) | ✓ |
| Filas más compactas, dos columnas | La rejilla usa las 2 columnas de StepScreen; 3 filas en vez de 5 con 4 jugadores | |
| El texto baja de tamaño solo en este paso | Primera excepción tipográfica de la app | |

**User's choice:** El texto nunca se reduce; scroll si hace falta
**Notes:** Se le presentó como el mismo riesgo que `PITFALLS.md` §4 documenta para la banda de contadores de la Fase 7.

---

## Filtro y nombres en español

### ¿Qué se hace con los nombres en español en el modal de héroes?

| Option | Description | Selected |
|--------|-------------|----------|
| Visibles en la fila y buscables | Mapa de alias en la capa de UI (23 entradas a mano, fuera del catálogo). Héroe sin alias cae al nombre inglés | ✓ |
| Solo buscables, no visibles | El mapa alimenta solo el filtro; la fila sigue en inglés | |
| Nada: solo inglés y alter ego | Se acepta la fricción de D-07/D-08 tal cual | |

**User's choice:** Visibles en la fila y buscables
**Notes:** Resuelve la idea que la Fase 5 dejó aparcada en su `<deferred>` («Alias en español para el filtro»), y la resuelve en su versión fuerte. El argumento presentado fue que el problema real es el reconocimiento al hojear, no la búsqueda.

### ¿Quién fija los 23 nombres en español?

| Option | Description | Selected |
|--------|-------------|----------|
| Claude propone, tú revisas en el plan | Tarea explícita de revisión humana bloqueante en el plan (dispositivo D-36) | ✓ |
| Los dictas tú ahora mismo | Lista fijada en el CONTEXT.md como fuente única, igual que D-03 de la Fase 5 | |
| Sin revisión formal | Se corrigen sobre la marcha si alguno chirría en mesa | |

**User's choice:** Claude propone, tú revisas en el plan

### ¿Qué nombre manda en cada fila y en qué orden sale la lista?

| Option | Description | Selected |
|--------|-------------|----------|
| Español manda, orden alfabético español | Nombre español grande; inglés y alter ego debajo en secundario | ✓ |
| Inglés manda, orden alfabético inglés | Coincide 1:1 con el fichero committeado | |
| Español manda, Core Set primero | Agrupado como lo dictó D-03 de la Fase 5, cada bloque alfabético | |

**User's choice:** Español manda, orden alfabético español
**Notes:** Se le mostraron maquetas ASCII de las dos primeras.

### Al abrir el modal de héroes, ¿el campo de filtro toma el foco?

| Option | Description | Selected |
|--------|-------------|----------|
| No autofoco | El modal abre mostrando los 23 y el teclado no aparece | ✓ |
| Sí autofoco | Se puede empezar a escribir sin tocar nada; en tablet tapa la lista | |
| Sin campo de filtro para el villano | Confirmar además que ambos modales comparten componente con el filtro opcional | |

**User's choice:** No autofoco
**Notes:** La tercera opción no se eligió, pero el hecho que enunciaba (el modal de villano son 3 entradas y no lleva buscador) quedó registrado igualmente como D-10.

---

## Nombre de jugador y teclado

### ¿Dónde se edita el nombre del jugador?

| Option | Description | Selected |
|--------|-------------|----------|
| Dentro del modal del héroe | Campo de nombre arriba y lista de héroes debajo; hereda foco y apagado de atajos de los modales | ✓ |
| Inline en la fila de la rejilla | Dos zonas táctiles por fila; mete un campo de texto en la pantalla del paso | |
| Modal propio para el nombre | Separado del de héroe; más toques y más superficie | |

**User's choice:** Dentro del modal del héroe
**Notes:** Se le advirtió antes de preguntar que `useStepShortcuts` hace que Espacio/Enter avancen el paso, y que un campo dentro de un modal nace protegido por la bandera `hasActiveDetail` que ya existe.

### ¿Cómo se cierra y se confirma el modal de jugador?

| Option | Description | Selected |
|--------|-------------|----------|
| Todo se guarda al instante; cerrar es cerrar | Tocar un héroe guarda y cierra; las tres vías de cierre son equivalentes; sin botón «Listo» | ✓ |
| Botón «Listo» explícito | Tocar un héroe lo marca pero no cierra; hay que decidir qué hace tocar el velo | |
| Guardado al instante, pero el héroe no cierra | Permite corregir sin reabrir; cuesta siempre un toque de cierre | |

**User's choice:** Todo se guarda al instante; cerrar es cerrar

### ¿Se recuerdan los nombres de los jugadores de una partida a la siguiente?

| Option | Description | Selected |
|--------|-------------|----------|
| No: cada partida arranca en «Jugador N» | SEL-06 literal, cero estado nuevo | ✓ |
| Sí, en su propia clave persistente | Patrón D-46; ahorra teclear, añade una segunda regla de ciclo de vida | |
| Diferirlo y ver si molesta | Decidido con uso real encima | |

**User's choice:** No: cada partida arranca en «Jugador N»
**Notes:** La alternativa quedó anotada en `<deferred>` de CONTEXT.md.

### ¿Qué pasa si alguien borra el nombre entero, o escribe uno larguísimo?

| Option | Description | Selected |
|--------|-------------|----------|
| Vacío vuelve al defecto; tope de caracteres | «Jugador N» al vaciar; tope corto (~12-16) para que la fila y la banda de la Fase 7 no revienten | ✓ |
| Vacío vuelve al defecto; sin tope | Recorte con puntos suspensivos donde no quepa | |
| Se permite el vacío tal cual | La fila queda sin etiqueta | |

**User's choice:** Vacío vuelve al defecto; tope de caracteres

---

## Estado y edición de la selección

### ¿Dónde se marca que dos jugadores llevan el mismo héroe?

| Option | Description | Selected |
|--------|-------------|----------|
| En la rejilla y en el modal | El modal marca «ya: Ana» sin bloquear; la rejilla lleva un `⚠` sin afordancia | ✓ |
| Solo en la rejilla | El modal es una lista tonta; el aviso llega después de elegir | |
| Solo en el modal | Avisa en el momento justo; el estado deja de ser visible al cerrar | |

**User's choice:** En la rejilla y en el modal
**Notes:** Se le recordó la exclusión permanente de `PROJECT.md` («aviso suave, nunca bloqueo») y la regla D-32 de que un `⚠` sin detalle no lleva afordancia de toque. Vio la maqueta ASCII de ambos sitios.

### ¿Se puede vaciar un hueco ya elegido, o solo cambiarlo por otro?

| Option | Description | Selected |
|--------|-------------|----------|
| Sí: «Sin elegir» como primera entrada | Devuelve el hueco a «—»; misma mecánica que elegir, cero gestos nuevos | ✓ |
| No: solo se puede cambiar por otro | Deja sin salida el toque accidental | |
| Sí, con un gesto aparte | Mantener pulsada la fila; gesto invisible que hay que descubrir | |

**User's choice:** Sí: «Sin elegir» como primera entrada

### ¿Cómo se cambia la selección una vez empezada la ronda?

| Option | Description | Selected |
|--------|-------------|----------|
| Con el índice, sin código nuevo | `≡` → saltar al paso → cambiar → `≡` → volver. Es lo que D-26 ya decidió que bastaba | ✓ |
| Acceso directo desde la cabecera | Más rápido; un control más en una cabecera ya cargada | |
| No se puede cambiar tras pasar el paso | Convierte un toque equivocado en irreversible | |

**User's choice:** Con el índice, sin código nuevo

### ¿Cómo entra `selection` en la sesión persistida en esta fase?

| Option | Description | Selected |
|--------|-------------|----------|
| Aditivo, sin tocar `formatVersion` | Campo opcional de `SessionContext`; la rejilla pinta «—» cuando no hay selección | ✓ (por delegación) |
| `formatVersion: 2` ya en esta fase | Cierra la compatibilidad aquí; pierde cualquier partida a medias al actualizar | |
| Tú decides | Que lo resuelvan research/planning | ✓ (elegida) |

**User's choice:** «Decide tú, ya te digo que lo de las partidas a medias da igual, no te preocupes por eso lo más mínimo porque es una app propia que usamos nosotros y no tenemos nada a medias y cuando la empezamos la terminamos no va a ser un problema.»

**Notes:** Es la única decisión que el usuario delegó, y vino acompañada de un hecho del proyecto que no es derivable del repo: **el grupo no deja partidas a medio jugar**. Eso desactiva la premisa de `PITFALLS.md` §3, que califica ese escenario como el riesgo más alto del hito, y rebaja también el peso de COMP-01/COMP-02 en la Fase 7.

Claude decidió **aditivo, sin tocar `formatVersion`** (D-19), resolviendo un conflicto explícito entre `ARCHITECTURE.md` §a (no bumpear) y `PITFALLS.md` §3 (bumpear desde el primer día), a favor del primero — pero por una razón distinta a la de proteger partidas a medias: el renderizado defensivo ante «sin selección» hace falta igualmente por D-03/SEL-09, así que bumpear no ahorraría ese trabajo y solo añadiría el efecto de descartar la sesión en curso.

---

## Claude's Discretion

Una sola decisión delegada explícitamente por el usuario: la forma de entrar `selection` en la sesión persistida (resuelta en D-19).

El resto de los ítems listados en `<decisions>` § «Claude's Discretion» de CONTEXT.md no se discutieron y quedan al ámbito de research/planning: nombre exacto de la clave del esquema, si los dos modales son un componente o dos, dónde vive el mapa de alias, la cifra del tope de caracteres, cómo se apagan los atajos con el modal abierto, la forma exacta de los tipos de `selection`, cómo accede `app/` al catálogo, y si merece la pena `/gsd:ui-phase 6`.

## Deferred Ideas

- Recordar los nombres de jugador entre partidas (descartado en D-14; reconsiderable si molesta en mesa).
- Acceso directo a la selección desde la cabecera durante la partida (descartado en D-18).
- Qué pasa con un contador ya ajustado si se cambia de héroe a mitad de partida — no es de esta fase; anotado para la Fase 7.
- Escenario y conjuntos modulares concretos (CONF-02/03) — siguen diferidos a un hito posterior.
- Una pantalla para editar el catálogo desde la app — exclusión permanente; anotada para que se reconozca y se rechace en el momento.
