# Roadmap: TableGameAssistant

## Milestones

- ✅ **v1.7 — Asistente de Marvel Champions jugable de principio a fin** — Fases 1-4 (enviado 2026-08-31)
- 🚧 **v1.8 — Elección de personajes, contadores en mesa e histórico de partidas** — Fases 5-10 (en definición)

---

### v1.7 — Asistente de Marvel Champions jugable de principio a fin ✅

**Enviado:** 2026-08-31 · **5 fases, 30 planes** · 60/61 requisitos · [Archivo completo](milestones/v1.7-ROADMAP.md) · [Requisitos](milestones/v1.7-REQUIREMENTS.md)

Un grupo puede jugar una partida completa de Marvel Champions sin abrir el reglamento: motor de flujo de 33 pasos verificado contra el Rules Reference v1.7, locución en español pregenerada con Gemini TTS, y PWA instalable que funciona sin conexión. Desplegado en https://tabletop-assistant.vercel.app/ y en uso real.

**Deuda conocida al cierre** (detalle en el archivo): VOZ-08 (respaldo silencioso) nunca probado en dispositivo; el ítem de foco del modal en iPad/Safari de la Fase 2; el modelo y SO de la tablet de mesa, sin identificar desde la Fase 1; el control de silencio sin ejercitar en dispositivo. Las verificaciones de las fases 2, 03.1 y 4 quedan en `human_needed`, no en `passed`.

---

## Milestone v1.8: Elección de personajes, contadores en mesa e histórico de partidas 🚧

**Status:** En definición (roadmap recién creado, sin planificar)
**Phases:** 5-10 (continúan la numeración de v1.7, que cerró en la Fase 4)
**Requisitos:** 58, ver `.planning/REQUIREMENTS.md`

### Overview

Este hito no reescribe nada: añade tres capacidades nuevas sobre una app que ya está en uso real. El orden de fases sigue la única cadena de dependencia de datos real del hito — nada puede prellenar un número si no existe el catálogo, y nada puede prellenar un contador de héroe si no se sabe qué héroe lleva cada jugador — y dos decisiones de riesgo explícitas: el histórico y las estadísticas deben quedar enteramente correctos y verificados **sin conexión, antes de que Firestore exista siquiera en el código** (para no reabrir el problema de doble fuente de verdad), y Firestore va estrictamente el último y aislado, para que si esa pieza falla o se retrasa, las cinco fases anteriores sigan funcionando exactamente igual. La Fase 7 (contadores) es también donde se cierra la compatibilidad con las partidas que la versión de v1.7 ya desplegada tiene guardadas en la tablet de cualquiera que esté jugando ahora mismo. Seis fases, una más de las 3-5 típicas de la granularidad "coarse" configurada — igual que v1.7 necesitó una fase insertada, aquí la sexta fase (Firestore) se separa a propósito de la quinta (Histórico) porque son la única pareja de este hito con una razón estructural fuerte para no compartir fase: una debe demostrarse correcta offline antes de que la otra exista.

### Phases

- [x] **Phase 5: Catálogo de héroes y villanos** - Datos versionados, reproducibles y legales de los 23 héroes y 3 villanos, sin salir nunca del bundle (completed 2026-09-07)
- [x] **Phase 6: Selección de villano, héroes y jugadores** - Selectores con filtro en el paso de setup, opcional, persistente (completed 2026-09-08)
- [x] **Phase 7: Banda de contadores y compatibilidad de sesión** - Vida de villano y héroes en pantalla con ▲▼, sin romper partidas guardadas de v1.7 (verificación: gaps_found — CR-01 solape de zonas táctiles) (completed 2026-09-08)
- [x] **Phase 8: Valores conocidos dentro del paso** - El número entre paréntesis, sin tocar texto ni los 37 clips de voz (completed 2026-09-09)
- [ ] **Phase 9: Histórico y estadísticas** - Registro de resultado, listado, y % de victorias — 100% offline (12/12 planes ejecutados; verificación ronda 3: gaps_found 5/7 — 2 BLOCKER nuevos reproducidos de forma independiente: CR-01 un fallo de LECTURA transitorio de localStorage destruye el histórico y devuelve ✓, CR-02 heroNames resuelve por Object.prototype y pierde la partida con un aviso de fallo falso)
- [ ] **Phase 10: Respaldo en Firestore** - Subida silenciosa, nunca bloqueante, aislada del resto

### Phase Details

### Phase 5: Catálogo de héroes y villanos

**Goal**: El repo tiene un catálogo fiable, reproducible y legal de los 23 héroes y 3 villanos disponibles —nombres y cifras, nunca texto de carta ni arte— validado en CI y disponible sin red, listo para alimentar la selección y los contadores de las fases siguientes.
**Depends on**: Nada nuevo — se apoya en el motor y el esquema de contenido de v1.7 ya en producción (primera fase de este hito).
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07
**Success Criteria** (what must be TRUE):

  1. Un test de Vitest en CI valida el catálogo completo (23 héroes + 3 villanos) contra un esquema Zod y falla la build si el contenido está malformado.
  2. La vida de cada villano está modelada por etapa y por nº de jugadores desde el principio, no como una cifra plana que solo sirve para un caso.
  3. Existe un script committeado y documentado que regenera el catálogo desde la API pública de MarvelCDB; volver a ejecutarlo sobre el mismo origen produce el mismo resultado, y el propio fichero documenta cómo añadir un héroe o villano nuevo en una sola fila.
  4. El catálogo committeado no contiene ningún texto de carta, cita de sabor ni referencia a imagen — el script proyecta explícitamente una lista blanca de campos, nunca la respuesta completa de la API.
  5. Con la wifi apagada tras `nuxt generate`, el catálogo está disponible igual que el resto del contenido — viaja dentro del bundle, nunca se pide por red en ejecución.

**Plans**: 6 plans (los tres últimos son cierre de gaps de 05-VERIFICATION.md)

- [x] 05-01-PLAN.md — Contrato del catálogo: tipos sin zod, esquema Zod estricto y sus tests unitarios
- [x] 05-02-PLAN.md — Script de generación contra MarvelCDB y catálogo committeado (23 héroes + 3 villanos)
- [x] 05-03-PLAN.md — Gates de CI: validación del fichero real, guardarraíl anti-copyright y aislamiento de build
- [x] 05-04-PLAN.md — Cierre del gap CR-01: tamaño de mano por cara (handSizeHero / handSizeAlterEgo) contrastado con el Rules Reference v1.7
- [x] 05-05-PLAN.md — Cierre del gap CR-02: carga perezosa en los gates para que el guardarraíl anti-copyright pueda fallar por sí solo
- [x] 05-06-PLAN.md — Cierre del gap de truth #8 (CAT-02): dimensión de dificultad en la etapa de villano — salud de Kang en modo Experto (exp_kang 15/22/25) en tipos, esquema, generador y tests

**Verificación humana**: No bloqueante — este catálogo se verifica entero por Vitest/CI y por inspección directa del JSON; no depende de la tablet de mesa (D-36 no aplica igual que a las reglas: un valor de vida equivocado se corrige con las flechas en mesa, per decisión explícita del usuario).

### Phase 6: Selección de villano, héroes y jugadores

**Goal**: Un grupo puede elegir, dentro del paso «Decidid, como grupo…», qué villano enfrenta y qué héroe lleva cada jugador —con nombre opcional—, sin que elegir sea obligatorio y sin perder la selección si la página se recarga a mitad de partida.
**Depends on**: Phase 5 (necesita nombres e ids del catálogo para poblar los selectores).
**Requirements**: SEL-01, SEL-02, SEL-03, SEL-04, SEL-05, SEL-06, SEL-07, SEL-08, SEL-09
**Success Criteria** (what must be TRUE):

  1. Un grupo puede tocar el selector de Villano en «Decidid, como grupo…» y elegir uno de los 3 villanos en un modal.
  2. Un grupo puede tocar un selector de héroe por jugador (tantos como el nº elegido en el mini-setup) y filtrar los 23 héroes escribiendo el nombre del héroe o del alter ego, insensible a mayúsculas y a acentos.
  3. Cada jugador tiene un nombre editable con valor por defecto «Jugador 1»…«Jugador 4», y elegir el mismo héroe en dos huecos se marca visualmente como repetido sin bloquear la partida.
  4. Recargar la página a mitad de partida conserva exactamente la selección hecha (villano, héroes, nombres).
  5. Un grupo que no toca ningún selector juega exactamente como en v1.7, sin ningún hueco ni exigencia nueva.

**Plans**: 7 plans
Plans:

- [x] 06-01-PLAN.md — Contrato del motor: clave `selection` en datos/esquema/tipos y mutadores puros con reasignación (ola 1)
- [x] 06-02-PLAN.md — Catálogo en `app/`, mapa de 23 alias en español y funciones puras de filtro, rótulos y repetidos (ola 1)
- [x] 06-03-PLAN.md — Revisión humana bloqueante de los alias contra las cartas físicas (D-07) (ola 2)
- [x] 06-04-PLAN.md — `VillainPickerModal.vue` y `PlayerModal.vue` según el contrato de `06-UI-SPEC.md` (ola 2)
- [x] 06-05-PLAN.md — Rejilla de selección en `StepScreen.vue` y costura reactiva en `useGameSession.ts` (ola 2)
- [x] 06-06-PLAN.md — Cableado en `app/pages/[game]/index.vue`: modales, foco y supresión de atajos (D-12) (ola 3)
- [x] 06-07-PLAN.md — Gates mecánicos y revisión humana en navegador de las tres superficies nuevas (ola 4)

**UI hint**: yes
**Verificación humana**: Sí — picker/modal/filtro es superficie táctil nueva; verificable en navegador/viewport simulado (portátil o móvil), no en la tablet real de mesa porque su modelo y SO siguen sin conocerse (deuda heredada de v1.7). No es bloqueante para cerrar la fase, pero debe quedar anotado como pendiente de confirmar en dispositivo real cuando la tablet aparezca.

### Phase 7: Banda de contadores y compatibilidad de sesión

**Goal**: Durante la partida hay una banda de contadores de vida siempre visible y fácil de tocar, precargada con los valores correctos, dentro de un presupuesto de altura decidido antes de construirla — y la sesión ampliada con selección y contadores convive sin corromperse con las partidas que la versión de v1.7 ya desplegada tiene guardadas ahora mismo en una tablet real.
**Depends on**: Phase 6 (necesita saber quién juega para prellenar cada contador).
**Requirements**: HP-01, HP-02, HP-03, HP-04, HP-05, HP-06, HP-07, HP-08, HP-09, HP-10, COMP-01, COMP-02
**Success Criteria** (what must be TRUE):

  1. El presupuesto de altura de la banda (≤~15% de la pantalla) se decide y se mide contra el viewport objetivo *antes* de construir el componente, no después — la banda nunca reduce el tamaño del texto grande del paso.
  2. Durante la partida hay una banda fija con «Vida villano» y un contador por jugador, ajustable solo con ▲/▼ (sin teclado, sin escribir cifras), precargada con el valor correcto según villano, héroe y nº de jugadores cuando se conoce — por ejemplo, un grupo puede elegir a Thor y ver 14 en su contador al empezar.
  3. Un contador de héroe que llega a 0 se marca como derrotado sin bajar de 0, sin terminar la partida ni abrir ningún diálogo, y puede volver a subir por encima de 0.
  4. Recargar la página a mitad de partida conserva el valor exacto de todos los contadores, y tocar ▲/▼ nunca avanza el paso ni cambia el comportamiento de Espacio/Enter/← ya existentes.
  5. Una partida guardada por la versión de v1.7 ya desplegada se reanuda sin corromperse ni perderse tras este cambio, y toda la interfaz nueva (selección, contadores) se renderiza de forma defensiva cuando la sesión reanudada no trae los campos nuevos — este caso no lo cubre el gate `contentVersion`/`formatVersion` y debe probarse explícitamente.

**Plans**: 11 plans (9 olas) — los 4 últimos son cierre de huecos de `07-VERIFICATION.md`
Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Presupuesto de altura medido en el viewport objetivo ANTES de construir la banda, y contrato de datos `CounterState`/`counters?` (ola 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — `engine/counters.ts` con test primero: precarga desde la etapa I, normalización defensiva y los cuatro mutadores con reasignación (ola 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-03-PLAN.md — Compatibilidad COMP-01/02: test D-21 de una sesión con forma de v1.7, y la decisión D-17 escrita en `useStepShortcuts.ts` (ola 3)
- [x] 07-04-PLAN.md — Costura reactiva en `useGameSession.ts`: visibilidad por `sectionRepeats`, celdas con «—»/«Jugador N»/«· SIN VIDA» y mutadores expuestos (ola 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-05-PLAN.md — `CounterBand.vue` según `07-UI-SPEC.md` y su montaje justo bajo `AppHeader` en la página (ola 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 07-06-PLAN.md — Pruebas en navegador real: 96px/12,5%, dos filas en estrecho, topes y «SIN VIDA», no-avance del paso y persistencia tras recarga (ola 5)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 07-07-PLAN.md — Verificación humana bloqueante en viewport apaisado simulado: legibilidad, tacto del toque, mantener pulsado y cambio de héroe a media ronda (ola 6)

**Wave 7** *(cierre de huecos — `/gsd:execute-phase 07 --gaps-only`)*

- [x] 07-08-PLAN.md — Celdas que ya no se solapan: spec de regresión con prueba de impacto (`elementFromPoint`) sobre 5 viewports × 1-4 jugadores, y arreglo del layout de la celda (ola 7)
- [x] 07-09-PLAN.md — Endurecimiento del motor: una sola definición de `playerCount` válido y guardas por tipo, para que un `localStorage` manipulado no descarte vidas ni pinte «NaN» (ola 7)

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 07-10-PLAN.md — Separador VILLANO/Jugador 1, pulsado que no se queda pegado y flechas fuera del recorrido de tabulación, con el triaje de los avisos restantes por escrito (ola 8)

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 07-11-PLAN.md — Firma humana acotada a los viewports que la aprobación original no cubrió, y puesta al día del ledger de requisitos (ola 9)

**UI hint**: yes
**Verificación humana**: Sí, y de las más sensibles del hito — toques repetidos, mantener pulsado, recarga a mitad de partida, y el presupuesto de altura solo se confirman de verdad en un dispositivo táctil real. Igual que en la Fase 6, se verifica en viewport simulado (portátil/móvil) porque el modelo y SO de la tablet de mesa siguen sin conocerse; esto es honesto, no una confirmación real en el dispositivo objetivo.

### Phase 8: Valores conocidos dentro del paso

**Goal**: Los pasos que citan un valor conocido (vida del villano, vida inicial de identidad, tamaño de mano) lo muestran en pantalla —entre paréntesis o en una lista por jugador según el caso— sin tocar ni un carácter del texto guardado ni de los 37 clips de voz ya pregenerados.
**Depends on**: Phase 5 (cifras del catálogo) y Phase 6 (selección hecha) — no depende de la Fase 7 y puede ejecutarse en paralelo con ella.
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06
**Success Criteria** (what must be TRUE):

  1. Con villano y héroes elegidos, el paso que cita la vida del villano la muestra entre paréntesis junto al texto («…al valor indicado (14)»).
  2. Un paso cuyo valor difiere por jugador (vida inicial de identidad, tamaño de mano) muestra bajo el texto una lista compacta «Jugador N · Héroe → número», nunca un paréntesis con todos los valores en línea.
  3. Sin ninguna selección hecha, esos mismos pasos se muestran exactamente igual que hoy, sin hueco ni marcador.
  4. `git diff` sobre `content/marvel-champions.json` no toca ni un carácter de ningún campo `text` ni `speech` de ningún paso — el valor se añade solo en el renderizado.
  5. Tras el cambio, `npm test` sigue en verde con los 37 clips de audio pregenerados intactos y el gate de deriva de voz (`engine/__tests__/voice-drift.test.ts`) sin pedir regenerar ni un clip, y la locución de esos pasos sigue diciendo la frase genérica, sin el número.

**Plans**: 4 plans (4 olas secuenciales: dato → motor → pantalla → cierre de hueco)

- [x] 08-01-PLAN.md — Contrato del dato: clave `value` en `engine/schema.ts` y `engine/types.ts`, y las cuatro marcas de D-03 en el contenido sin tocar `text` ni `speech`
- [x] 08-02-PLAN.md — `engine/stepValues.ts`: resolutor puro que reutiliza `engine/counters.ts` y nunca lee el contador congelado (D-13), con su suite propia
- [x] 08-03-PLAN.md — Costura en `useGameSession.ts` y las dos superficies de `StepScreen.vue` (paréntesis y lista por jugador), más la verificación de VAL-04/05/06
- [x] 08-04-PLAN.md — Cierre del hueco de `08-VERIFICATION.md` (CR-01): recolocar el paso de sustitución de cartas por dificultad delante del paso del dial, sin renumerar ids ni regenerar clips, más el gate de orden en CI

**Verificación humana**: No bloqueante para dispositivo — el criterio decisivo (VAL-04/VAL-05) es mecánico y lo verifica `npm test`, no un humano en una tablet. Sí conviene una lectura humana rápida de que el paréntesis/lista queda legible en pantalla, pero no requiere la tablet objetivo.

### Phase 9: Histórico y estadísticas

**Goal**: Al terminar una partida el grupo puede registrar si ganó o perdió (y por qué), consultar después el histórico completo, y ver un resumen de porcentaje de victorias por héroe y por villano — todo ello construido y verificado enteramente sin conexión, antes de que Firestore exista en el código.
**Depends on**: Phase 6 y Phase 7 (necesita villano/héroes/nombres/contadores como datos a registrar).
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, HIST-06, HIST-07, HIST-08, HIST-09, STAT-01, STAT-02, STAT-03, STAT-04, STAT-05
**Success Criteria** (what must be TRUE):

  1. Al pulsar «Partida terminada» el grupo puede registrar Ganada o Perdida (indicando la causa si es Perdida: plan principal completado o todos los héroes derrotados), o cerrar la partida sin registrar nada.
  2. El registro guardado incluye resultado, causa, villano, héroe y nombre de cada jugador, fecha, dificultad, nº de jugadores, duración y nº de rondas — duración y rondas calculadas por el motor, sin que nadie las teclee.
  3. Hay una pantalla que lista las partidas registradas de la más reciente a la más antigua, con opción de borrar una entrada tras confirmar; «Partida terminada» borra la sesión en curso pero nunca el histórico, que vive en localStorage como fuente de verdad.
  4. Hay una pantalla de estadísticas accesible desde el inicio que muestra el % de victorias por héroe y por villano, con un estado vacío claro (no un error ni porcentajes engañosos) cuando el histórico está vacío.
  5. La pantalla de estadísticas lee exclusivamente localStorage — verificable en esta fase de forma trivial, porque Firestore ni siquiera existe todavía en el código en este punto del hito.

**Plans**: 12 plans (8 olas)
- [x] 09-01-PLAN.md — Motor: tipos aditivos del histórico, `buildHistoryEntry` y formateadores puros (ola 1)
- [x] 09-02-PLAN.md — `GameOutcomeDialog` y el aviso de guardado montado en `app.vue` (ola 1)
- [x] 09-03-PLAN.md — Motor: `aggregateStatistics` con la cascada de orden de D-24 (ola 2)
- [x] 09-04-PLAN.md — Costura de almacenamiento: clave `tga:history` y escritura que informa de fallo (ola 2)
- [x] 09-05-PLAN.md — Costura reactiva `useGameHistory` con las vistas ya formateadas (ola 3)
- [x] 09-06-PLAN.md — Pantallas `/historico` y `/estadisticas` con sus estados vacíos (ola 4)
- [x] 09-07-PLAN.md — Fin de partida: `startedAt` en `start()` y cableado del diálogo en `index.vue` (ola 4)
- [x] 09-08-PLAN.md — Accesos desde el inicio, prerender de las dos rutas y verificación humana (ola 5)
- [x] 09-09-PLAN.md — Cierre de huecos: escritura no destructiva de `tga:history` y frontera de tipos (CR-03) (ola 6)
- [x] 09-10-PLAN.md — Cierre de huecos: motor que no lanza ante ids no-string y orden cronológico real (CR-02) (ola 6)
- [x] 09-11-PLAN.md — Cierre de huecos: `/historico` y `/estadisticas` que no se caen ante datos inconsistentes (CR-01) (ola 7)
- [x] 09-12-PLAN.md — Cierre de huecos: la escritura del histórico valida con el mismo predicado que la lectura (CR-01 ronda 2 + WR-03) (ola 8)
**UI hint**: yes
**Verificación humana**: Sí, recomendable pero no bloqueante por dispositivo — el flujo de fin de partida y las dos pantallas nuevas se verifican jugando una partida real de principio a fin (puede hacerse en portátil/móvil, no requiere la tablet de mesa) y comprobando que el registro y las estadísticas resultantes coinciden con lo jugado.

### Phase 10: Respaldo en Firestore

**Goal**: Cada partida registrada se respalda en Firestore de forma silenciosa y nunca bloqueante, con autenticación anónima y reglas de seguridad que solo permiten crear registros con forma válida — y si Firestore falla por cualquier motivo (cuota, reglas, red, proyecto caído), jugar, registrar el resultado localmente y ver las estadísticas siguen funcionando exactamente igual. Estrictamente la última fase del hito, aislada a propósito: si falla o se retrasa, las cinco fases anteriores no se ven afectadas.
**Depends on**: Phase 9 (necesita el punto de enganche `appendHistoryEntry` ya existiendo).
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, SYNC-08, SYNC-09, COMP-03
**Success Criteria** (what must be TRUE):

  1. Cada partida registrada localmente se intenta subir a Firestore de forma «dispara y olvida» — el flujo de fin de partida nunca hace `await` de esa escritura — y con la wifi apagada, registrar el resultado, listar el histórico y ver las estadísticas funcionan exactamente igual que con red, sin ningún bloqueo visible.
  2. Cada registro lleva una marca de sincronizado propia en localStorage (no la persistencia IndexedDB integrada de Firestore, que queda deliberadamente desactivada) y los pendientes se reintentan cuando vuelve la red.
  3. El SDK de Firebase se carga de forma diferida y solo en cliente — no participa del arranque, del prerender ni del primer pintado; verificable comparando el tamaño de los chunks iniciales de `/` y `/marvel-champions` antes y después de esta fase.
  4. La escritura usa autenticación anónima (sin cuentas de usuario) y las reglas de seguridad desplegadas en Firestore permiten crear registros con forma validada pero nunca leer ni borrar los de otros.
  5. Un fallo de Firestore nunca impide jugar, registrar localmente ni ver las estadísticas; y una PWA ya instalada recibe cualquier actualización de esta fase por el camino existente (`registerType: 'prompt'`, banda descartable), sin recargarse sola a mitad de ronda.

**Plans**: TBD
**Verificación humana**: Sí, dos verificaciones distintas: (a) un test e2e offline (extensión de `e2e/offline-flow.spec.ts` con `context.setOffline(true)`) confirmando que el fin de partida no se cuelga sin red — automatizable, no requiere dispositivo; (b) una revisión manual del fichero de reglas de Firestore realmente desplegado, antes del primer escritura real, no después de "ya funciona". Ninguna de las dos requiere la tablet de mesa.

### Decisión registrada de este hito: Firestore sin persistencia offline propia

La investigación (`research/SUMMARY.md`) dejó abierta una disyuntiva entre dos mecanismos: activar la cola offline integrada de Firestore (`persistentLocalCache`, más código de SDK, un segundo almacén IndexedDB) o usar una marca `syncedToFirestore` propia en localStorage con reintento manual. El roadmap adopta la segunda opción (recomendada por `ARCHITECTURE.md` y por `SUMMARY.md`) porque mantiene coherencia con la postura ya explícita del proyecto de no usar IndexedDB para un trabajo de este tamaño (la misma razón por la que ya se descartó para el progreso de partida), falla de forma visible en vez de silenciosa, y Firestore aquí es explícitamente un respaldo de bajo volumen, no una función que necesite la sofisticación de un motor de sincronización completo. Se registra aquí como decisión explícita del roadmap, no como algo que se resuelva silenciosamente durante la Fase 10 — el plan de esa fase puede revisarla si aparece información nueva, pero no debe redescubrir la disyuntiva desde cero.

### Recordatorio de alcance para las seis fases (Pitfall 14 de `research/PITFALLS.md`)

Cada fase de este hito comparte infraestructura con una tentación de alcance adyacente ya excluida explícitamente en `PROJECT.md`. Se listan aquí una vez para que cada plan de fase las reconozca y las rechace en el momento, no las redescubra:

- La banda de contadores (Fase 7) es solo para vida — un contador de amenaza o chips de estado (Aturdido/Confundido/Duro) usando el mismo stepper es exactamente el tipo de "casi gratis" que sigue fuera de alcance.
- El catálogo (Fase 5) es dato versionado que regenera un script — ninguna pantalla de la app debe permitir editarlo.
- Firestore (Fase 10) es respaldo de escritura, nunca fuente de lectura para ninguna pantalla — y no es la puerta de entrada a cuentas de usuario ni autenticación real.
- La selección (Fase 6) es de héroe y villano dentro del setup — el escenario y los conjuntos modulares (CONF-02/03) siguen diferidos a un hito posterior.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Motor de flujo, selector y preparación de mesa | v1.7 | 8/8 | Complete | 2026-08-28 |
| 2. Bucle de ronda y reglas verificadas | v1.7 | 5/5 | Complete | 2026-08-29 |
| 3. Locución por voz y pantalla siempre encendida | v1.7 | 5/5 | Complete | 2026-08-30 |
| 03.1. Voz pregenerada en español con Gemini TTS | v1.7 | 6/6 | Complete | 2026-08-31 |
| 4. Instalación y funcionamiento offline | v1.7 | 6/6 | Complete | 2026-08-31 |
| 5. Catálogo de héroes y villanos | v1.8 | 6/6 | Complete   | 2026-09-07 |
| 6. Selección de villano, héroes y jugadores | v1.8 | 7/7 | Complete   | 2026-09-08 |
| 7. Banda de contadores y compatibilidad de sesión | v1.8 | 11/11 | Complete   | 2026-09-08 |
| 8. Valores conocidos dentro del paso | v1.8 | 4/4 | Complete   | 2026-09-09 |
| 9. Histórico y estadísticas | v1.8 | 12/12 | Complete   | 2026-09-12 |
| 10. Respaldo en Firestore | v1.8 | 0/TBD | Not started | - |

---

## Próximo milestone (tras v1.8)

Sin definir. Ver "Candidatos para hitos posteriores" en `.planning/PROJECT.md` — el principal es Warhammer 40.000 como segundo juego, la prueba real de si el motor y el esquema de contenido son de verdad agnósticos al juego. También pendiente: cerrar la deuda de dispositivo real (tablet de mesa) heredada de v1.7, que este hito v1.8 tampoco resuelve — sigue viéndose viewport-simulada, no confirmada en el dispositivo objetivo.
