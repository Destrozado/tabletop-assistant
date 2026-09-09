# Requirements: TableGameAssistant — Milestone v1.8

**Defined:** 2026-09-07
**Milestone:** v1.8 — Elección de personajes, contadores en mesa e histórico de partidas
**Core Value:** Que un grupo pueda jugar una partida completa de Marvel Champions de principio a fin sin abrir el reglamento y sin olvidarse de ningún paso.
**Goal de este hito:** Que la app deje de ser solo un guion y pase a conocer *vuestra* partida — quién lleva a quién, cuánta vida queda, y quién ganó la última vez.

> Los requisitos de v1 (60/61 satisfechos) están archivados en `.planning/milestones/v1.7-REQUIREMENTS.md`. Este fichero cubre **solo** el hito v1.8.

---

## Requisitos v1.8

### CAT — Catálogo de héroes y villanos

- [x] **CAT-01**: El repo contiene un catálogo versionado de los 23 héroes disponibles con, por cada uno: nombre de héroe, nombre de alter ego, vida inicial y tamaño de mano
- [x] **CAT-02**: El repo contiene un catálogo versionado de los 3 villanos disponibles (Rhino, Ultron, Kang) con su vida por etapa, indicando explícitamente si esa cifra es por jugador o total
- [x] **CAT-03**: Un script committeado regenera el catálogo desde la API pública de MarvelCDB, y su uso está documentado de forma que otra persona pueda re-ejecutarlo
- [x] **CAT-04**: El script extrae únicamente una lista blanca de campos (nombres y cifras); ningún texto de carta, cita de sabor ni referencia a imagen entra en el repo
- [x] **CAT-05**: El catálogo se valida con un esquema Zod en un test de Vitest que corre en CI y falla la build si el catálogo está malformado
- [x] **CAT-06**: El catálogo viaja dentro del bundle y nunca se consulta por red en ejecución — la app sigue funcionando entera sin conexión
- [x] **CAT-07**: Añadir un héroe o villano nuevo cuando se compre una caja está documentado como un procedimiento de una sola fila

### SEL — Selección de villano, héroes y jugadores

- [x] **SEL-01**: En el paso «Decidid, como grupo, qué villano vais a enfrentar…» hay un selector de Villano
- [x] **SEL-02**: Tocar el selector de villano abre un modal con los 3 villanos y permite elegir uno
- [x] **SEL-03**: Hay un selector de héroe por jugador, tantos como el nº de jugadores elegido en el mini-setup
- [x] **SEL-04**: Tocar un selector de héroe abre un modal con los 23 héroes
- [x] **SEL-05**: El modal de héroes tiene un filtro de texto arriba que busca a la vez por nombre de héroe y por nombre de alter ego, insensible a mayúsculas y a acentos
- [x] **SEL-06**: Cada jugador tiene un nombre editable y opcional, con valor por defecto «Jugador 1»…«Jugador 4»
- [x] **SEL-07**: Si dos jugadores eligen el mismo héroe se marca visualmente como repetido, pero se puede continuar — la app no bloquea una regla que el Rules Reference no escribe
- [x] **SEL-08**: La selección (villano, héroes, nombres) se persiste con la sesión en curso y sobrevive a recargar la página a mitad de partida
- [x] **SEL-09**: Elegir es opcional: sin ninguna selección, la app se comporta exactamente como en v1.7

### HP — Banda de contadores

- [x] **HP-01**: Durante la partida hay una banda de contadores fija y siempre visible
- [x] **HP-02**: La banda ocupa como máximo ~15% de la altura de la pantalla, presupuesto fijado antes de implementarla y verificado en el viewport objetivo
- [x] **HP-03**: La banda contiene un contador «Vida villano» y un contador por jugador (HP1…HPN según el nº de jugadores)
- [x] **HP-04**: Cada contador se ajusta con ▲ y ▼, sin teclado y sin escribir cifras
- [x] **HP-05**: Los contadores arrancan precargados con el valor correcto según villano, héroe y nº de jugadores cuando ese valor se conoce
- [x] **HP-06**: Un contador de héroe que llega a 0 marca a ese jugador como «derrotado» visualmente, no baja de 0, y **no** termina la partida ni abre ningún diálogo — el Rules Reference v1.7 dice que los demás jugadores continúan
- [x] **HP-07**: Un jugador marcado como derrotado puede volver a subir por encima de 0
- [x] **HP-08**: El valor de todos los contadores se persiste con la sesión y sobrevive a recargar la página a mitad de partida
- [x] **HP-09**: Ajustar un contador nunca avanza el paso, y los atajos de teclado ya existentes (Espacio, Enter, ←) siguen comportándose igual que en v1.7
- [x] **HP-10**: Los contadores son legibles y accionables a un brazo de distancia en tablet horizontal (cifras grandes, objetivos táctiles suficientes, sin repetición descontrolada al mantener pulsado)

> **Evidencia de los requisitos reabiertos por `07-VERIFICATION.md` (CR-01) y cerrados en el cierre de huecos de la Fase 7:**
> - **HP-03** — matriz de solapamiento/hit-test `e2e/counter-band-overlap.spec.ts` (5 viewports × 4 nº de jugadores, `elementFromPoint`), plan 07-08; firma humana del plan 07-11 (Task 1) sobre 1024x768/412x915/700x800 con 4 jugadores.
> - **HP-04** — mismas dos evidencias que HP-03: el mecanismo ▲/▼ ya era correcto en aislamiento, lo que fallaba era el hit-test de la celda, cerrado por la misma matriz y la misma firma humana.
> - **HP-10** — firma humana del plan 07-11 (Task 1), acotada a 1024x768/412x915/700x800; ámbito real del objetivo táctil tras el arreglo: **96px de alto siempre** (D-02, incondicional) y **44px de ancho desde 760px de ancho de viewport** (por debajo, la flecha encoge a propósito — ~38px a 700x800, ~34px a 660x800, ~27,5px a 412x915), ver la viñeta «Touch targets» enmendada en `07-UI-SPEC.md`.

### VAL — Valores conocidos dentro del paso

- [x] **VAL-01**: Un paso que cita un valor único y conocido lo muestra entre paréntesis, p. ej. «Ajustad el dial de vida del villano al valor indicado (14)»
- [x] **VAL-02**: Un paso cuyo valor difiere por jugador (vida inicial de identidad, tamaño de mano) muestra bajo el texto una lista compacta «Jugador N · Héroe → número», nunca un paréntesis con todos los valores en línea
- [x] **VAL-03**: Si el valor no se conoce (sin selección), el paso se muestra exactamente como hoy, sin hueco ni marcador
- [x] **VAL-04**: Ni el texto almacenado en `content/marvel-champions.json` ni el campo `speech` cambian — el valor se añade en el renderizado
- [x] **VAL-05**: Los 37 clips de audio pregenerados siguen siendo válidos y el gate de deriva de voz sigue en verde sin regenerar ni un clip
- [x] **VAL-06**: La locución sigue diciendo la frase genérica, sin el número

> **Nota de cierre de hueco (VAL-01), plan 08-04:** el checkpoint humano del plan 08-03 verificó
> Rhino en Normal y marcó VAL-01 como satisfecho sin haber ejercitado nunca la combinación
> Kang + Experto — la única en la que la cifra podía discrepar (`08-VERIFICATION.md`, gap
> BLOCKER). El plan 08-04 reordenó `setup.escenario` para que la sustitución de cartas por
> dificultad preceda al paso del dial, añadió un gate de CI que impide que ese orden vuelva a
> romperse, y un checkpoint humano nuevo confirmó Kang + Experto (45) y Kang + Normal (36) con
> el orden correcto. VAL-01 queda satisfecho de verdad, no solo marcado. El recuento de «37
> clips» en VAL-05 es una cifra heredada de un ROADMAP ya erróneo (el recuento real en disco es
> 35; ver nota en `STATE.md`, plan 08-03) — no se corrige aquí por quedar fuera del alcance del
> plan 08-04.

### HIST — Histórico de partidas

- [ ] **HIST-01**: Al pulsar «Partida terminada» la app ofrece registrar el resultado
- [ ] **HIST-02**: Los resultados posibles son Ganada y Perdida, y siempre se puede cerrar la partida sin registrar nada
- [ ] **HIST-03**: Si el resultado es Perdida, se puede indicar la causa: plan principal completado o todos los héroes derrotados
- [ ] **HIST-04**: El registro guarda resultado, causa, villano, héroe y nombre de cada jugador, fecha, dificultad, nº de jugadores, duración y nº de rondas jugadas
- [ ] **HIST-05**: El motor expone el instante de inicio de la partida y la ronda actual, para poder calcular duración y rondas sin que el usuario los teclee
- [ ] **HIST-06**: El histórico vive en localStorage y es la fuente de verdad de la app
- [ ] **HIST-07**: Hay una pantalla que lista las partidas registradas, de la más reciente a la más antigua
- [ ] **HIST-08**: Una entrada del histórico se puede borrar, con confirmación previa
- [ ] **HIST-09**: «Partida terminada» borra la sesión en curso pero nunca el histórico

### STAT — Estadísticas

- [ ] **STAT-01**: Hay una pantalla de estadísticas accesible desde el inicio
- [ ] **STAT-02**: Muestra el porcentaje de victorias por héroe
- [ ] **STAT-03**: Muestra el porcentaje de victorias por villano
- [ ] **STAT-04**: La pantalla lee exclusivamente localStorage y **nunca** consulta Firestore
- [ ] **STAT-05**: Con el histórico vacío muestra un estado vacío claro, no un error ni porcentajes engañosos

### SYNC — Respaldo en Firestore

- [ ] **SYNC-01**: Cada partida registrada se sube a Firebase Firestore como respaldo duradero
- [ ] **SYNC-02**: La subida es «dispara y olvida»: no se hace `await` de la escritura en el flujo de fin de partida, porque la promesa de Firestore solo se resuelve cuando el servidor confirma y colgaría sin red
- [ ] **SYNC-03**: Cada registro lleva una marca de sincronizado; los pendientes se reintentan cuando vuelve la red
- [ ] **SYNC-04**: Sin conexión, registrar el resultado, listar el histórico y ver las estadísticas funcionan exactamente igual
- [ ] **SYNC-05**: El SDK de Firebase se carga de forma diferida y solo en cliente; no participa del arranque, del prerender ni del primer pintado
- [ ] **SYNC-06**: No hay cuentas de usuario: la escritura usa autenticación anónima
- [ ] **SYNC-07**: Las reglas de seguridad de Firestore permiten añadir registros pero no leer ni borrar los de otros, y limitan los campos aceptados
- [ ] **SYNC-08**: Un fallo de Firestore (cuota agotada, reglas, red, proyecto caído) nunca impide jugar, ni registrar el resultado localmente, ni ver las estadísticas
- [ ] **SYNC-09**: No se activa la persistencia IndexedDB de Firestore — la cola de reintentos es propia y vive en localStorage

### COMP — Compatibilidad con lo ya desplegado

- [x] **COMP-01**: Añadir los campos nuevos a la sesión persistida no corrompe ni pierde una partida en curso guardada por la versión desplegada de v1.7
- [x] **COMP-02**: La interfaz renderiza selección y contadores de forma defensiva cuando la sesión reanudada no trae los campos nuevos — el gate `contentVersion`/`formatVersion` no cubre este caso, verificado en `engine/persistence.ts`
- [ ] **COMP-03**: Una PWA ya instalada recibe la actualización por el camino existente (`registerType: 'prompt'`, banda descartable), sin recarga forzada a mitad de ronda

---

## Requisitos diferidos (v2 o posterior)

### Deuda de dispositivo real (heredada de v1.7)

- **DEV-01**: Identificar el modelo y SO/navegador de la tablet de mesa
- **DEV-02**: Ejecutar en ella el guion de pruebas pendiente: VOZ-08 (respaldo silencioso), foco del modal de detalle en Safari, control de silencio con audio pregenerado, instalación PWA

### Ampliación de alcance

- **W40K-01/02**: Warhammer 40.000 como segundo juego
- **REF-01/02**: Palabras clave enlazadas dentro del texto del paso y búsqueda por término
- **CONF-02/03**: Selección de escenario y conjuntos modulares; Modo Heroico como eje de dificultad independiente
- **STAT-06**: Estadísticas por jugador (rachas, % de victorias de cada persona)
- **STAT-07**: Desglose por dificultad
- **HIST-10**: Editar el resultado de una partida ya registrada (por ahora solo se puede borrar)

---

## Fuera de alcance

| Feature | Razón |
|---------|-------|
| Contadores de amenaza y de estados (Aturdido/Confundido/Duro) | Solo se revierte la exclusión de v1 para la **vida**. La amenaza y los estados siguen en las fichas físicas |
| Que la app deduzca que la partida está perdida | Aunque los N contadores lleguen a 0, la app no declara derrota: sería inferir una condición de fin de partida, justo lo que D-36 exige verificar a mano. El grupo lo declara al pulsar «Partida terminada» |
| Bloquear héroes duplicados | El Rules Reference no lo prohíbe por escrito. Aviso suave, nunca bloqueo |
| Sincronización multi-dispositivo en vivo | Firestore es respaldo, no fuente de verdad. En cuanto una pantalla lea de Firestore reaparecen todos los problemas de doble fuente sin que nadie haya decidido construir un motor de sincronización |
| Cuentas de usuario / login | Cuatro amigos y una tablet. La autenticación anónima basta para escribir |
| Constructor de mazos, listado de cartas, aspectos | Eso es MarvelCDB, y hacerlo aquí sería reproducir contenido con copyright |
| Edición del catálogo desde la web | El catálogo es dato versionado que regenera un script; añadir un héroe es un commit |
| Librería de gráficos para las estadísticas | Porcentajes sobre unas decenas de partidas: HTML y Tailwind sobran. Una librería de charts sería peso sin ganancia |
| Gamificación (logros, insignias, niveles) | Es un registro para cuatro amigos, no un producto de retención |
| Introducir cifras por teclado en los contadores | Contradice el motivo de existir de la banda: manos ocupadas, tablet a un brazo, cero escritura |
| Persistencia IndexedDB de Firestore | Un segundo almacén IndexedDB conviviendo con el service worker de la PWA, más bundle, y errores conocidos con varias pestañas — para escribir un puñado de documentos diminutos al mes |

---

## Trazabilidad

| Requisito | Fase | Estado |
|-----------|------|--------|
| CAT-01 | Fase 5 | Satisfecho |
| CAT-02 | Fase 5 | Satisfecho |
| CAT-03 | Fase 5 | Satisfecho |
| CAT-04 | Fase 5 | Satisfecho |
| CAT-05 | Fase 5 | Satisfecho |
| CAT-06 | Fase 5 | Satisfecho |
| CAT-07 | Fase 5 | Satisfecho |
| SEL-01 | Fase 6 | Pendiente |
| SEL-02 | Fase 6 | Pendiente |
| SEL-03 | Fase 6 | Pendiente |
| SEL-04 | Fase 6 | Pendiente |
| SEL-05 | Fase 6 | Pendiente |
| SEL-06 | Fase 6 | Pendiente |
| SEL-07 | Fase 6 | Pendiente |
| SEL-08 | Fase 6 | Pendiente |
| SEL-09 | Fase 6 | Pendiente |
| HP-01 | Fase 7 | Satisfecho |
| HP-02 | Fase 7 | Satisfecho |
| HP-03 | Fase 7 | Satisfecho |
| HP-04 | Fase 7 | Satisfecho |
| HP-05 | Fase 7 | Satisfecho |
| HP-06 | Fase 7 | Satisfecho |
| HP-07 | Fase 7 | Satisfecho |
| HP-08 | Fase 7 | Satisfecho |
| HP-09 | Fase 7 | Satisfecho |
| HP-10 | Fase 7 | Satisfecho |
| COMP-01 | Fase 7 | Satisfecho |
| COMP-02 | Fase 7 | Satisfecho |
| VAL-01 | Fase 8 | Satisfecho |
| VAL-02 | Fase 8 | Satisfecho |
| VAL-03 | Fase 8 | Satisfecho |
| VAL-04 | Fase 8 | Satisfecho |
| VAL-05 | Fase 8 | Satisfecho |
| VAL-06 | Fase 8 | Satisfecho |
| HIST-01 | Fase 9 | Pendiente |
| HIST-02 | Fase 9 | Pendiente |
| HIST-03 | Fase 9 | Pendiente |
| HIST-04 | Fase 9 | Pendiente |
| HIST-05 | Fase 9 | Pendiente |
| HIST-06 | Fase 9 | Pendiente |
| HIST-07 | Fase 9 | Pendiente |
| HIST-08 | Fase 9 | Pendiente |
| HIST-09 | Fase 9 | Pendiente |
| STAT-01 | Fase 9 | Pendiente |
| STAT-02 | Fase 9 | Pendiente |
| STAT-03 | Fase 9 | Pendiente |
| STAT-04 | Fase 9 | Pendiente |
| STAT-05 | Fase 9 | Pendiente |
| SYNC-01 | Fase 10 | Pendiente |
| SYNC-02 | Fase 10 | Pendiente |
| SYNC-03 | Fase 10 | Pendiente |
| SYNC-04 | Fase 10 | Pendiente |
| SYNC-05 | Fase 10 | Pendiente |
| SYNC-06 | Fase 10 | Pendiente |
| SYNC-07 | Fase 10 | Pendiente |
| SYNC-08 | Fase 10 | Pendiente |
| SYNC-09 | Fase 10 | Pendiente |
| COMP-03 | Fase 10 | Pendiente |

**Cobertura:**
- Requisitos v1.8: 58 en total
- Mapeados a fases: 58
- Sin mapear: 0 ✓

---
*Requisitos definidos: 2026-09-07*
*Última actualización: 2026-09-07 tras crear el roadmap del hito v1.8 (fases 5-10, cobertura 58/58)*
