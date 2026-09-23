# Phase 9: Histórico y estadísticas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 9-Histórico y estadísticas
**Areas discussed:** Flujo de fin de partida, Duración y rondas, Forma del dato guardado, Cuántas pantallas y acceso, Anatomía del histórico, Anatomía de las estadísticas

El usuario seleccionó **las seis** áreas propuestas y eligió la opción recomendada en las 22 preguntas. Ninguna quedó delegada con un «tú decides».

---

## Flujo de fin de partida

### ¿Qué aparece al confirmar «Partida terminada»?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Un diálogo, cuatro botones | Un solo paso: GANADA / PERDIDA · plan principal / PERDIDA · héroes derrotados / Salir sin registrar | ✓ |
| Dos pasos: resultado, luego causa | Primer diálogo el resultado; si es Perdida, un segundo con la causa | |
| Pantalla completa nueva | Una pantalla propia al estilo `MesaListaScreen.vue` | |

**Notas:** el argumento decisivo fue que la causa deja de ser un campo separable — elegir la derrota ya elige la causa, así que no existe el estado «perdida sin causa» (mismo razonamiento que D-02 de la Fase 8 sobre el enum plano).

### ¿Qué pasa con el ConfirmDialog actual de «se borrará el progreso»?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Lo sustituye | Los cuatro botones son la confirmación; el cuerpo sigue avisando del borrado | ✓ |
| Se mantiene delante | Confirmar primero, resultado después (tres toques) | |
| Solo detrás de «Salir sin registrar» | Registrar va directo; salir sin registrar pide confirmación extra | |

**Notas:** se conservan los mismos dos toques que hoy.

### ¿Qué ve el grupo tras registrar?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Inicio + aviso breve | «Partida registrada»; obliga a que `appendHistoryEntry` informe de si logró escribir | ✓ |
| Directo al inicio, sin aviso | Exactamente lo de hoy; un fallo de escritura pasa inadvertido | |
| Va al histórico | Aterriza en el listado con la partida nueva arriba | |

**Notas:** la razón no fue estética — `writeRaw()` falla en silencio por diseño (modo privado, cuota), y el histórico es el único dato de la app que no se puede reconstruir.

### ¿Y si se pulsa «Partida terminada» durante la preparación?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| El mismo diálogo, siempre | Cero casos especiales; se toca «Salir sin registrar» | ✓ |
| Solo «salir sin registrar» en setup | Reducir el diálogo mientras `sectionRepeats === false` | |
| Tú decides | — | |

---

## Duración y rondas

### ¿Cuándo arranca el reloj?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Al confirmar el mini-setup | `startedAt` se fija una vez en `start()`, dentro del `context` | ✓ |
| Al entrar en la primera ronda | Mide «partida jugada» sin el montaje; exige escribir a mitad de sesión | |
| Al primer «Siguiente» | Exige una guarda condicional en cada `next()` | |

### ¿Cómo se mide la duración?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Reloj de pared, sin tope | `Date.now() - startedAt` y punto | ✓ |
| Reloj de pared con tope de cordura | Duración desconocida si sale una cifra imposible | |
| Solo tiempo activo | Acumular entre pasos y pausar por inactividad | |

**Notas:** aceptable porque **este grupo siempre termina de una sentada lo que empieza** — un hecho del grupo, no del código. Si ese hábito cambiara, es la primera decisión a revisar.

### ¿Qué se guarda como rondas?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| `round` tal cual, leído como «ronda 7» | La misma cifra que la cabecera mostró toda la partida | ✓ |
| `round - 1`: rondas completadas | Más exacto como métrica, contradice la pantalla | |
| `round` tal cual, leído como «7 rondas» | Misma cifra, rótulo de recuento | |

### ¿Qué duración se guarda sin `startedAt`?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Desconocida, y se dice | `durationMs: null` y «—» en pantalla | ✓ |
| Rellenar el reloj al reanudar | Toda entrada tiene cifra, pero es falsa | |
| Tú decides | — | |

---

## Forma del dato guardado

### ¿Ids o nombres?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Id + nombre congelado | Agrupa por id (estable), muestra el nombre visto en pantalla | ✓ |
| Solo ids | Dato más pequeño; un id huérfano deja un hueco permanente | |
| Solo nombres | Legible sin catálogo; agrupar por texto es frágil | |

**Notas:** el nombre congelado es el **alias español**, no el inglés de MarvelCDB.

### ¿Una partida sin selección (SEL-09)?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Se registra con nulos, fuera del % | Con una línea que declara la muestra («12 registradas · 10 con héroes anotados») | ✓ |
| Se registra y va a «Sin especificar» | Una fila que no es un héroe ni un villano | |
| No se puede registrar sin selección | Convertiría SEL-09 en obligatorio por la puerta de atrás | |

### ¿Cómo se guarda en localStorage?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Envoltorio con versión + filtro por entrada | `tga:history` → `{ formatVersion: 1, entries: [] }`; descarta entradas rotas sin tirar el resto | ✓ |
| Array plano, versión por entrada | Conviven formas distintas sin migrar | |
| Una clave por partida | Aislamiento real; listar exige recorrer por prefijo | |

### ¿La marca `syncedToFirestore` se escribe ya?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| La añade la Fase 10 | Esta fase no menciona Firestore en ninguna línea; una entrada sin el campo se tratará como pendiente | ✓ |
| Se escribe ya como `false` | Ahorra compatibilidad futura, ensucia el aislamiento buscado | |
| Tú decides | — | |

---

## Cuántas pantallas y acceso

### ¿Dos pantallas o una?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Dos rutas separadas | `/historico` y `/estadisticas`, cada una a pantalla completa | ✓ |
| Una ruta con dos vistas | Pestañas: patrón que la app no tiene en ninguna parte | |
| Una pantalla, el % arriba del listado | Lo más simple; «la pantalla de estadísticas» dejaría de ser una pantalla | |

### ¿Dónde van los accesos desde el inicio?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Dos botones bajo las tarjetas | Tratamiento secundario, sin cambiar la estructura del bloque centrado | ✓ |
| Una barra fija al pie | Añade una estructura que la pantalla no tiene hoy | |
| Arriba a la derecha | La zona menos alcanzable en una tablet en mesa | |

### ¿Histórico global o por juego?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Un histórico, con `gameId` en cada entrada | El día que exista W40K basta con etiquetar o filtrar | ✓ |
| Una clave y unas pantallas por juego | El acceso «desde el inicio» tendría que preguntar el juego primero | |
| Global y sin `gameId` | Migración imposible en un histórico que no se puede editar | |

### ¿Salto directo entre las dos pantallas?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sí, un acceso cruzado en cada una | Ver el 40 % de Kang y saltar a las partidas que lo componen | ✓ |
| No: «Atrás» al inicio y ya | Menos controles que verificar | |
| Tú decides | — | |

---

## Anatomía del histórico

### ¿Cómo se ve una partida?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Tarjeta con todo visible | Cero toques para leerlo; coherente con D-32 (sin afordancia falsa) | ✓ |
| Fila compacta + detalle a un toque | Caben más partidas; añade un modal | |
| Dos líneas, todo visible, sin tarjeta | Reutiliza la anatomía de fila de `ELECCIÓN`; aprieta más | |

### ¿Cómo se borra?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Botón en la tarjeta + ConfirmDialog | `destructive: true`, cuerpo citando la partida concreta | ✓ |
| Modo «borrar» que se activa antes | Imposible tocarlo por accidente; un estado de pantalla más | |
| Tú decides | — | |

### ¿Formato de fecha y duración?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| «12 sep 2026» y «1 h 40 min» | Formateado por una función pura del motor, no por `toLocaleDateString` | ✓ |
| Relativa arriba, absoluta debajo | Más natural, más difícil de fijar en un test | |
| «12/09/2026» y «1:40» | Lo más corto, lo más confundible | |

### ¿Estado vacío?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Mensaje + cómo se registran | La primera vez nadie sabe que el diálogo existe | ✓ |
| Solo el mensaje | Sobrio y suficiente | |
| Mensaje + botón al selector | Duplica el destino del «Atrás» | |

---

## Anatomía de las estadísticas

### ¿Qué héroes aparecen?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo los jugados | 20 filas a «0 de 0» enterrarían las 3 con dato | ✓ |
| Los 23, con los no jugados al final | Se ve a quién no habéis probado nunca | |
| Tú decides | — | |

### ¿En qué orden?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Por % descendente | Desempate por partidas jugadas y luego alfabético, para que sea determinista | ✓ |
| Por partidas jugadas descendente | Ordena por fiabilidad del dato antes que por el dato | |
| Alfabético | Estable; no destaca nada | |

### ¿Umbral mínimo de partidas?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sin umbral: el recuento delante del % | La defensa es enseñar el dato entero, no esconder filas | ✓ |
| Con menos de 3 partidas, sin % | Exige elegir un umbral arbitrario | |
| Bloque aparte de «pocas partidas» | Dos tablas donde había una | |

### ¿Cómo se atribuye una victoria?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Una vez por héroe distinto | El denominador son las partidas en que el héroe estuvo, no los huecos que ocupó | ✓ |
| Una vez por hueco | Un héroe duplicado sumaría dos partidas | |
| Tú decides | — | |

**Notas:** se fijó también la regla cooperativa explícita — el resultado se atribuye a **todos** los héroes que jugaron esa partida.

---

## Verificación de reglas hecha durante la discusión

No fue una pregunta al usuario, sino una consulta al reglamento antes de escribir el contexto (mismo patrón que D-05/D-06 de la Fase 8). `pdftotext` sobre `reference/mc_rulesreference_v17-compressed.pdf`:

- «Winning the Game» (p. 46): *«If the final villain stage is defeated, the players win the game. If the **final stage of the main scheme deck is completed**, the villain wins the game.»*
- «Eliminated»: *«If all players are **eliminated**, the game ends and the players lose.»*

Consecuencia: la redacción heredada de `REQUIREMENTS.md` («todos los héroes derrotados») se corrige a **«Todos los héroes eliminados»**, y la causa del plan principal se refiere a la **etapa final** del Plan Principal. Recogido como D-06 en CONTEXT.md.

## Claude's Discretion

El usuario no delegó ninguna decisión, pero quedaron explícitamente abiertas al planner y a la fase de UI: nombres de ficheros, rutas y símbolos; la redacción exacta de botones y rótulos dentro de lo que D-06 fija; el estado vacío de estadísticas (espejo de D-22); la generación del `id` de entrada; si hay tope de entradas; si el histórico se valida con Zod en un test de CI; si la entrada guarda los contadores finales de vida (recomendación: no); la forma concreta del aviso de D-03; y la supresión de atajos de teclado con el diálogo abierto (heredada, no nueva).

## Deferred Ideas

Recogidas íntegras en la sección `<deferred>` de CONTEXT.md. Resumen: STAT-06 (% por jugador) y STAT-07 (por dificultad) — el dato estará guardado desde el primer día, así que la tentación será literal; HIST-10 (editar una entrada); el tercer resultado «no terminada» que `FEATURES.md` §e recomendaba (descartado, no diferido); registrar la partida descartada desde «Empezar partida nueva»; total general, gráficas, exportar y filtros; el tope de duración de cordura como arreglo concreto si aparece un «19 h»; el «37 clips» que en realidad son 35, pendiente desde la Fase 6; y el todo `cr-03-experto-sustitucion-cartas-rhino-ultron`, revisado y **no** plegado a esta fase (es contenido autorado y fidelidad de reglas, sin relación con el histórico).
