# Phase 1: Motor de flujo, selector y preparación de mesa - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-28
**Phase:** 1-Motor de flujo, selector y preparación de mesa
**Areas discussed:** Granularidad de los pasos del setup, Anatomía del paso en pantalla, Orientación y salto entre pasos, Publicación y repositorio

---

## Granularidad de los pasos del setup

### ¿Cómo troceamos la preparación de mesa en pasos?

| Option | Description | Selected |
|--------|-------------|----------|
| Medio: un paso por decisión o acción con riesgo (~14) | Se parten los bloques donde la gente se equivoca y se dejan juntos los triviales | |
| Grueso: un paso por bloque del reglamento (~8) | Cada paso es un bloque completo con sub-acciones como viñetas | |
| Fino: un paso por acción física atómica (~24) | Imposible saltarse nada, pero son 24 toques antes de empezar | ✓ |

**User's choice:** Fino (~24)
**Notes:** Se presentaron maquetas con el listado real de pasos en cada granularidad. Claude advirtió del riesgo de festival de toques que señala la investigación; el usuario lo aceptó. Se acordó reevaluar la granularidad tras la primera prueba de flujo completo al final de la fase.

### ¿Cómo trata la app las acciones que hacen todos los jugadores a la vez?

| Option | Description | Selected |
|--------|-------------|----------|
| Un paso para toda la mesa, en segunda persona del plural | «Colocad vuestra identidad por el lado Alter-Ego». Un toque y todos lo hacen | ✓ |
| Un paso por jugador, enumerado | «Jugador 1 de 3: coloca tu identidad». Imposible que alguien se quede atrás | |
| Un paso para la mesa, con recordatorio de contar cabezas | Un toque, pero el texto nombra el número real | |

**User's choice:** Un paso para toda la mesa, en plural
**Notes:** Colapsa los pasos por jugador, dejando el recuento efectivo en ~21 en lugar de 24. La tercera opción quedó además invalidada después por la decisión de textos genéricos.

### ¿Qué pasa al pulsar Siguiente en el último paso del setup?

| Option | Description | Selected |
|--------|-------------|----------|
| Pantalla de «mesa lista» con resumen de comprobación | Confirma que todo está colocado; repaso rápido antes de empezar | ✓ |
| Un paso final simple: «¡A jugar!» | Cierra el flujo sin más | |
| Se queda en el último paso, sin avanzar más | El botón Siguiente se desactiva al llegar al final | |

**User's choice:** Pantalla de «mesa lista»
**Notes:** Sirve también de frontera limpia con la Fase 2.

---

## Anatomía del paso en pantalla

### ¿Qué ve el usuario en la pantalla de un paso?

| Option | Description | Selected |
|--------|-------------|----------|
| Frase de acción grande + aviso solo cuando hace falta | La acción domina; los pasos con trampa llevan una línea de aviso destacada | ✓ |
| Frase de acción sola, nada más | Máximo espacio para el texto; todo va dentro de la frase | |
| Acción + aviso + detalle desplegable con la cita | Añade un «¿Por qué?» plegado con explicación y referencia | |

**User's choice:** Acción grande + aviso condicional
**Notes:** Se presentaron maquetas ASCII de las tres pantallas. La maqueta seleccionada quedó recogida en CONTEXT.md como especificación.

### ¿Dónde vive la cita al reglamento (CONT-08)?

| Option | Description | Selected |
|--------|-------------|----------|
| Solo en los datos, para auditoría | En el JSON y en los tests, nunca en pantalla | ✓ |
| En los datos y visible discretamente al pie | Línea pequeña tipo «RR v1.7 p.14» | |
| En los datos y accesible bajo demanda | Se ve al pulsar un icono de información | |

**User's choice:** Solo en los datos
**Notes:** CONT-08 queda satisfecho como requisito de datos, no de UI.

### ¿Cómo se muestran las fórmulas de cantidades (ADAPT-03)?

| Option | Description | Selected |
|--------|-------------|----------|
| Fórmula con el número real sustituido | «vida impresa × 3» | |
| Fórmula genérica, sin sustituir | «vida impresa × nº de jugadores» | ✓ |
| Fórmula sustituida y destacada como aviso | La acción arriba, «× 3 jugadores» en la línea de aviso | |

**User's choice:** Fórmula genérica

### ¿Los recuentos sin operación nombran el número real de jugadores?

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, esa es la frontera | Fórmulas genéricas, pero recuentos con el número real | |
| Todo genérico, sin excepciones | Ningún paso menciona el número de jugadores | ✓ |
| Que el número de jugadores se vea siempre en la cabecera | Textos genéricos, contexto en la cabecera | |

**User's choice:** Todo genérico
**Notes:** Claude propuso la frontera «multiplicar es cosa vuestra, contar cabezas lo hace la app»; el usuario la rechazó en favor de textos completamente genéricos.

### Si ningún texto menciona jugadores, ¿qué función tiene el número y qué hacemos con ADAPT-02?

| Option | Description | Selected |
|--------|-------------|----------|
| Se sigue pidiendo y se muestra en la cabecera | Textos genéricos, contexto permanente en cabecera; ADAPT-02 se reescribe | ✓ |
| Quitar el número de jugadores del mini-setup | SETUP-01 y ADAPT-02 se retiran de v1 | |
| Guardarlo aunque hoy no se use | Se guarda para la Fase 2; ADAPT-02 se aplaza | |

**User's choice:** Pedirlo y mostrarlo en la cabecera
**Notes:** Claude señaló que la decisión anterior dejaba el número de jugadores sin función alguna y en contradicción con ADAPT-02. La resolución convierte la tercera opción de la pregunta anterior en la solución. Consecuencia registrada: **ADAPT-02 requiere reescritura**.

---

## Orientación y salto entre pasos

### ¿Qué muestra la cabecera durante la preparación, donde aún no hay ronda?

| Option | Description | Selected |
|--------|-------------|----------|
| Sección + posición + contexto de partida | «PREPARACIÓN · 8 de 21» y «3 jug · Normal» | ✓ |
| Solo la posición, con barra de progreso | «Paso 8 de 21» con barra al 38% | |
| Bloque de fase con los sub-bloques visibles | Migas de pan de los grupos de la preparación | |

**User's choice:** Sección + posición + contexto
**Notes:** Se descartó la barra de progreso porque implica una meta y el bucle de ronda de la Fase 2 no la tiene. Se mostró además la maqueta de cómo mutará la cabecera en la Fase 2, para dimensionarla ahora.

### ¿Qué forma tiene el índice de salto (FLOW-06)?

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay a pantalla completa, agrupado por bloques | Lista de los 21 pasos agrupados, el actual marcado | ✓ |
| Panel lateral fijo, siempre visible | Lista permanente a la izquierda, paso a la derecha | |
| Lista de bloques, y los pasos al abrir uno | Primero los 6 bloques, dos toques para saltar | |

**User's choice:** Overlay a pantalla completa
**Notes:** El panel lateral se descartó por robar un tercio del ancho al texto del paso.

### ¿Qué significa el ✓ en el índice?

| Option | Description | Selected |
|--------|-------------|----------|
| Todo lo anterior a tu posición | Derivado de la posición, sin estado extra | ✓ |
| Los pasos por los que has pasado | Estado propio persistido de pasos visitados | |
| Sin marcas, solo la posición actual | Cero estado, cero ambigüedad, menos información | |

**User's choice:** Derivado de la posición
**Notes:** Claude planteó la pregunta al detectar que la maqueta del overlay mostraba ✓, lo que implicaba una decisión de motor sin fijar. La opción elegida no necesita persistencia y no puede desincronizarse.

---

## Publicación y repositorio

### ¿Cómo llega la app a una URL que puedas abrir en la tablet?

| Option | Description | Selected |
|--------|-------------|----------|
| Repo en GitHub + Netlify conectado al repo | Cada push despliega solo; permite fijar la cabecera Cache-Control de la Fase 4 | ✓ |
| Netlify por arrastrar la carpeta, sin repo remoto | Cero configuración, despliegue manual | |
| Solo red local por ahora | Se sirve desde la máquina del usuario; TECH-05 se aplaza | |

**User's choice:** GitHub + Netlify
**Notes:** Claude comprobó el estado real antes de preguntar: repo local sin remoto, sin `gh` ni CLI de Netlify instaladas.

### ¿Cómo encajamos la creación del repo y la conexión con Netlify?

| Option | Description | Selected |
|--------|-------------|----------|
| Yo lo dejo listo, tú haces los dos clics | Claude prepara la configuración y da los pasos exactos | |
| Tú creas el repo ahora, antes de planificar | Para que la fase pueda hacer push y verificar el despliegue | |
| Dejar la publicación para el final de la fase | El despliegue es la última tarea | |
| **(Respuesta libre del usuario)** | | ✓ |

**User's choice:** Respuesta libre — «Deja el repo ya creado y así vas commiteando todo y tal, y mientras trabajas en las fases yo creo el repo en github y creo la cuenta de netlify y cuando esté para desplegar ya vemos eso de nuevo y lo desplegamos juntos»
**Notes:** El repo local ya estaba inicializado con 6 commits de planificación. El usuario se encarga de GitHub y Netlify en paralelo; el despliegue será conjunto. TECH-05 no bloquea el resto de la fase.

### Mientras no haya URL pública, ¿cómo pruebas en la tablet?

| Option | Description | Selected |
|--------|-------------|----------|
| Servidor local y la IP de tu máquina | Abrir http://192.168.x.x:3000 desde la tablet en el mismo wifi | |
| Esperar a tener Netlify listo | La prueba de mesa no se hace hasta que exista la URL | |
| Túnel temporal a internet | ngrok/cloudflared para una URL efímera | |
| **(Respuesta libre del usuario)** | | ✓ |

**User's choice:** Respuesta libre — «Por ahora simulo la tablet en el Chrome en el PC no nos compliquemos, cuando esté pública ya lo probamos en el tablet»
**Notes:** Claude registró la limitación derivada: UI-01 («legible a un brazo de distancia») no es verificable en emulación, porque se emula el tamaño en píxeles pero no la distancia física. Se dimensionará con criterios objetivos y la validación real queda pendiente.

---

## Claude's Discretion

El usuario no delegó explícitamente ninguna decisión con un «tú decides». Estas quedan sin fijar por no haberse discutido, y son del ámbito de research/planner:

- Estructura de directorios y ubicación exacta del directorio `engine/`
- Forma exacta del esquema JSON: nombres de campos, tipos, esquema Zod
- Modelo de rutas y su interacción con el prerenderizado
- Alcance de los tests más allá de lo que exige TECH-03
- Diseño visual concreto: tipografía, escala, paleta del tema oscuro, espaciados
- Formato interno del campo de cita
- Cómo se representan los bloques de agrupación en el esquema de datos

## Deferred Ideas

Nada surgió fuera del alcance de la fase. Las siguientes quedan aplazadas por decisiones tomadas aquí, no por scope creep:

- Detalle desplegable «¿Por qué?» con la cita visible — descartado para v1; candidato natural si en la mesa surgen discusiones de reglas
- Panel lateral fijo con el índice siempre visible — reconsiderable si el overlay resulta incómodo
- Marcar los pasos efectivamente visitados — requeriría estado persistido propio
- Prueba en tablet real y validación de UI-01 — aplazada a cuando la app esté publicada
- Servidor local por IP y túneles temporales — descartados explícitamente por el usuario
