# Phase 10: Respaldo en Firestore - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Esta fase entrega **una sola cosa**: que cada partida ya registrada en `localStorage` se
espeje a Firestore de forma silenciosa, nunca bloqueante, con autenticación anónima y
reglas de seguridad que solo permiten **crear** documentos con forma validada.

Es la última fase del hito y está aislada a propósito: si falla, se retrasa o se abandona
entera, las Fases 5 a 9 siguen funcionando exactamente igual. Nada de lo que hay hoy en
pantalla cambia.

**Fuera de esta fase, explícitamente:**

- **Leer de Firestore.** Ninguna pantalla, en ningún caso. El histórico y las
  estadísticas siguen leyendo `localStorage` y solo `localStorage`. En el momento en que
  una pantalla lea de la nube reaparecen todos los problemas clásicos de un motor de
  sincronización —duplicados, orden, sincronización parcial— sin que nadie haya decidido
  construir uno (`research/PITFALLS.md` §8). Es un criterio de éxito del hito, no una
  nota al pie.
- **Restaurar el histórico desde la nube.** Consecuencia directa de lo anterior. Es la
  tentación adyacente de esta fase (`research/PITFALLS.md` §14): *ya que los datos están
  arriba, bajarlos es gratis*. No lo es — es una capacidad nueva y es su propia fase.
- **Cuentas de usuario y autenticación real.** La auth anónima existe para que las reglas
  puedan hablar de propiedad, no como puerta de entrada a cuentas. El recordatorio de
  alcance del ROADMAP lo dice con esas palabras.
- **La persistencia IndexedDB propia de Firestore.** Desactivada a propósito, decisión ya
  registrada en el ROADMAP (ver `<decisions>` → «Ya decidido aguas arriba»).
- **Cualquier señal en pantalla** sobre el estado de la sincronización — ver D-07.
- **App Check, backoff exponencial, colas persistentes, telemetría.** Sofisticación de
  motor de sincronización para un respaldo de unas pocas decenas de documentos al año.

</domain>

<decisions>
## Implementation Decisions

Numeración local de la fase (las Fases 4 a 9 también reiniciaron en D-01).

### Ya decidido aguas arriba — no se rediscute, no se redescubre

Estas cinco no salen de esta conversación; vienen cerradas del ROADMAP, de los requisitos
y de la Fase 9. Se listan aquí para que ningún agente aguas abajo las reabra desde cero.

- **Mecanismo de cola: marca propia en `localStorage` + reintento manual.** La cola
  offline integrada de Firestore (`persistentLocalCache`) **no se activa** (SYNC-09).
  Decisión explícita del ROADMAP, que resuelve la disyuntiva abierta en
  `research/SUMMARY.md` §«Decision Required» a favor de la Opción B.
- **Nunca `await` en el camino de fin de partida** (SYNC-02). Las promesas de escritura de
  Firestore solo resuelven con el ACK del servidor, jamás con la escritura al caché local:
  un `await` ahí se cuelga para siempre sin red, que es literalmente el escenario para el
  que existe esta app (`research/PITFALLS.md` §2).
- **SDK diferido y solo en cliente** (SYNC-05): `import()` dinámico dentro del cuerpo de la
  función, nunca importación estática de nivel superior. Si nadie ha terminado nunca una
  partida, no se toca ni una línea de Firebase (`research/ARCHITECTURE.md:201`).
- **Write-only** (`research/PITFALLS.md` §8): frontera de una sola dirección.
- **La promesa aditiva heredada (D-14 de la Fase 9):** la marca de sincronizado se añade de forma **aditiva**, y una
  entrada sin marca cuenta como pendiente — así las partidas ya registradas antes de esta
  fase se suben solas cuando llegue.

### La marca de sincronizado y el reintento

- **D-01:** **La marca vive en una clave aparte, `tga:history:synced`, con los ids ya
  subidos** — no como campo dentro de la entrada.
  — **Reversibility:** costly — cambiar de sitio la marca después obliga a migrar el dato
  de una clave a otra en los dispositivos que ya la tengan escrita, y a decidir qué
  significa una entrada marcada en los dos sitios a la vez.

  La razón es el camino de escritura que la Fase 9 blindó: `appendHistoryEntry`
  (`app/composables/usePersistedSession.ts:409`) reescribe **el envoltorio entero** de
  `tga:history` en cada operación y aborta sin tocar nada si el blob resulta ilegible
  (CR-01/CR-03 de la Fase 9). Un ACK de Firestore llega en un momento arbitrario —
  perfectamente, mientras el grupo borra una entrada en `/historico`. Con la marca dentro
  de la entrada, cada ACK obligaría a releer y reescribir ese envoltorio, que es
  exactamente el escenario contra el que esos cierres existen.

  Con la clave aparte, **el camino de red nunca escribe en `tga:history`**. Un fallo al
  escribir la marca solo produce un reintento de más, que D-03 hace inocuo.

  **Descartado** el campo `syncedToFirestore` dentro de la entrada, que es lo que
  recomienda `research/ARCHITECTURE.md:217` — esa recomendación es anterior a los cierres
  CR-01/CR-03 de la Fase 9 y no los tuvo en cuenta.

- **D-02:** **El flush se dispara en dos momentos — al registrar una partida y al evento
  `online`.** Cada `record()` con éxito sube la nueva entrada **y arrastra las
  pendientes**; además un listener de `online` cubre el caso real de esta app: la wifi se
  cayó a mitad de partida y volvió antes de recoger la mesa.

  El listener es barato y **no importa Firebase hasta que hay algo que subir Y hay red**,
  así que no rompe el invariante «sin partidas terminadas, cero Firebase». Nada se
  dispara en el arranque de la app ni al cargar una ruta
  (`research/ARCHITECTURE.md:201`).

  **Descartado** un empujón al abrir `/historico`: metería carga de red en una pantalla
  que esta fase se compromete a mantener 100 % local.

- **D-03:** **`setDoc(doc(col, entry.id), …)` — el id local ES el id del documento.**
  — **Reversibility:** one-way — los documentos ya escritos con el id local quedan en la
  colección real; cambiar a ids autogenerados después convive con ellos para siempre o
  exige limpiar el respaldo a mano.

  Cada entrada ya nace con un `id` único (`buildHistoryEntry`), así que usarlo como id de
  documento hace **imposibles los duplicados en la nube** por construcción.

  Consecuencia aceptada conscientemente: con reglas solo-`create` (D-11), un reintento de
  algo que el servidor ya tenía se rechaza con `permission-denied`, y esa entrada queda
  marcada como pendiente **para siempre**, reintentándose una vez por partida futura. Es
  ruido acotado, invisible y sin coste real. **No se debe** «arreglar» tratando
  `permission-denied` como éxito: eso enmascararía unas reglas mal desplegadas, que es
  justo el fallo que la verificación humana de esta fase busca detectar.

  **Descartado** `addDoc` con id autogenerado: nunca se queda nada colgado, pero un ACK
  perdido deja la misma partida dos veces arriba, y como nada lee de la nube, nadie lo
  vería hasta el día de una hipotética restauración.

- **D-04:** **Poda perezosa de la lista de marcas, dentro del propio flush.** Al vaciar la
  cola se descarta cualquier id que ya no esté en `tga:history`. **`removeHistoryEntry` no
  se toca**: el camino de borrado que la Fase 9 cerró con CR-03/WR-08 sigue exactamente
  igual, sin una segunda escritura acoplada.

  Nota: borrar una partida en local **no** la borra en Firestore, y eso es deliberado —
  las reglas no permitirán `delete` (D-11). Un respaldo que se borra solo cuando borras el
  original no es un respaldo.

### Dónde se engancha la subida

- **D-05:** **La llamada dispara-y-olvida sale de `record()`** (`app/composables/useGameHistory.ts:286`),
  justo después de que `appendHistoryEntry` devuelva `true`.

  `record()` **sigue siendo síncrona de cara a su llamador** y sigue devolviendo su
  booleano: el orden bloqueado D-U4 de `onOutcomeRecorded`
  (`app/pages/[game]/index.vue:696`) —`silence() → record() → save() →
  notifyHistorySaved() → finishGame()`— no cambia ni una línea. La página, que ya es la
  más cargada del proyecto y lleva cuatro rondas de revisión encima, no crece.

  **La cabecera de `record()` hay que reescribirla.** Hoy dice que la firma «es totalmente
  síncrona por diseño» y que «una fase futura es quien podría cambiar esto, no esta». Esta
  es esa fase: sigue siendo síncrona, pero deja de ser libre de efectos, y el comentario
  debe decirlo sin ambigüedad.

  **Descartado** engancharlo en la página tras D-U4: dejaría `useGameHistory.ts` intacto,
  pero cualquier futuro llamador de `record()` se quedaría sin respaldo, y obligaría a
  encajar un sexto paso en una secuencia cuyo orden es el resultado de tres cierres
  distintos de la Fase 9.

- **D-06:** **Si el guardado local falla (`record()` devuelve `false`), no se sube nada.**
  Mantiene el invariante del hito —`localStorage` es la fuente de verdad y Firestore es su
  sombra, nunca la única copia— y es además lo único coherente técnicamente: si
  `localStorage` no admite la entrada, tampoco admitirá la marca de sincronizado, con lo
  que esa partida se reintentaría eternamente. El grupo ya tiene su camino de
  recuperación: el aviso recuperable de la Fase 9 (`09-20`, `progresoAsegurado`).

- **D-07:** **Invisible del todo.** Ninguna pantalla menciona la nube: ni un punto, ni un
  icono, ni un contador de pendientes. Es lo que pide el ROADMAP con la palabra
  «silenciosa», y evita que el grupo se pregunte a mitad de partida si algo va mal por una
  marca que de todos modos no pueden arreglar. La marca vive solo en `localStorage`,
  inspeccionable desde devtools.

  **Descartados** un indicio discreto en las tarjetas de `/historico` y un contador al pie
  de `/estadisticas`: los dos meten estado de red en pantallas que esta fase se
  compromete a mantener puramente locales.

- **D-08:** **El atraso inicial se sube de golpe, sin tope por ráfaga.** El día del
  despliegue, **todas** las partidas registradas en la Fase 9 cuentan como pendientes
  (consecuencia directa de D-01 + D-14), así que la primera partida que termine tras
  actualizar arrastra el histórico entero. Un grupo de amigos tendrá decenas de partidas,
  no miles, frente al límite gratuito de 20.000 escrituras/día. Un tope sería código y
  estado nuevos para un problema que este proyecto no tiene — el mismo razonamiento con el
  que ya se descartaron IndexedDB y Pinia.

### El documento y las reglas

- **D-09:** **Sube una proyección con lista blanca explícita**, con los campos nombrados uno a
  uno en el código — el mismo patrón que `scripts/catalogue/fetch-marvelcdb.mjs` aplica a
  la respuesta de MarvelCDB (criterio de éxito 4 de la Fase 5).

  Así las reglas pueden exigir `hasOnly([...])` sobre una lista que existe de verdad en un
  sitio concreto, y el día que una fase futura añada un campo a la entrada local, **no se
  filtra solo** a la nube.

  **Los `playerName` sí suben** — se ofreció explícitamente excluirlos y se decidió
  incluirlos: el respaldo es una copia fiel de la partida, con quién jugó.

  **Descartado** subir la entrada entera (`setDoc(ref, entry)`): cualquier campo futuro
  empezaría a subirse sin que nadie lo decida.

- **D-10:** **Colección plana `history/{id}`, con `uid` como campo del documento.**
  — **Reversibility:** one-way — reorganizar la colección después deja los documentos ya
  escritos en la ruta antigua, y moverlos exige leerlos y reescribirlos a mano con
  permisos de propietario.

  La auth anónima genera un uid nuevo cada vez que se borran los datos del navegador, así
  que agrupar por uid fragmentaría el respaldo en trozos sin sentido justo cuando más
  falta hiciera verlo entero.

  **Descartada** la subcolección `users/{uid}/history/{id}`, que expresaría «no leer los
  de otros» directamente en la ruta pero repartiría tu propio respaldo entre tantos
  subárboles como veces haya rotado el uid.

- **D-11:** **Las reglas permiten `create` y nada más. Ni `read`, ni `update`, ni `delete`.**
  — **Reversibility:** reversible — es un fichero que se redespliega en un minuto.

  **Esto resuelve un conflicto real entre documentos del proyecto.**
  `research/PITFALLS.md:104` recomienda `allow read: if true` con el argumento de que «las
  estadísticas necesitan leer». **Ese argumento quedó obsoleto en la Fase 9**, que cerró
  las estadísticas leyendo exclusivamente `localStorage` (STAT-04), y contradice SYNC-07.
  Se resuelve a favor de SYNC-07: `PITFALLS.md:104` queda expresamente superado en este
  punto y **no debe reintroducirse**.

  Con esto, un hostil que encuentre el proyecto en el repo público solo puede **añadir
  basura**: nunca leer las partidas del grupo, nunca corromper ni borrar las reales. La
  lectura y el borrado los haces tú desde la consola de Firebase, que se salta las reglas
  por ser propietario del proyecto.

  Las reglas deben además validar la **forma** del documento —`hasOnly()` sobre la lista
  blanca de D-09, tipos por campo y un tope de tamaño— tal como detalla
  `research/PITFALLS.md` §5. Escribirlas y revisarlas **antes** de la primera escritura
  real, no después de que «ya funcione».

- **D-12:** **El cliente añade `uid` y `createdAt` de servidor** (`serverTimestamp()`),
  validado en la regla con `request.resource.data.createdAt == request.time` para que
  nadie pueda antedatar basura. `uid` es lo que hace expresable la propiedad en la regla;
  `createdAt` distingue «cuándo se jugó» (`recordedAt`, del reloj de la tablet) de «cuándo
  llegó al respaldo».

  **Descartada** la versión de la app como tercer metadato: hoy no está expuesta al
  cliente en ningún sitio y habría que inventar el mecanismo.

### Configuración, forks y entornos

- **D-13:** **La config de Firebase vive en `runtimeConfig.public`, alimentada por variables
  de entorno en Vercel** — `nuxt.config.ts` no tiene hoy `runtimeConfig` en absoluto, así
  que es una sección nueva. Es lo que recomienda `research/ARCHITECTURE.md:204`.

  Las claves web de Firebase **no son un secreto** (la seguridad la dan las reglas), así
  que esto no es una decisión de seguridad sino de qué pasa en un build que no sea el
  tuyo: `Destrozado/tabletop-assistant` es un repo **público**. Con las claves
  committeadas, cualquiera que lo clone escribiría en tu proyecto al terminar una partida
  — basura en el respaldo y cuota consumida, el abuso exacto que `research/PITFALLS.md`
  §5 describe.

  **Guarda de configuración obligatoria:** si el `projectId` viene vacío o indefinido, el
  código cortocircuita a no-op **antes** de que se ejecute el `import()` dinámico. Un
  build mal configurado degrada a «la sincronización nunca ocurre», nunca a una excepción.

- **D-14:** **Un solo proyecto de Firebase, y en local no se configura.** Sin variables en
  `.env`, la guarda de D-13 convierte la sincronización en un no-op: `npm run dev` y los
  tests e2e nunca ensucian el respaldo real, sin montar un segundo proyecto. Para probar
  la subida de verdad se rellena `.env` un rato.

  **Descartados** un proyecto de desarrollo aparte (dos juegos de reglas que mantener
  sincronizadas, dos sitios que administrar — justo lo que «sin backend, nada que
  administrar» evita) y el emulador de Firestore (una herramienta y un flujo más en un
  proyecto que hasta ahora se prueba entero con Vitest y Playwright).

- **D-15:** **`firestore.rules` vive committeado en el repo y se despliega a mano** con
  `firebase deploy --only firestore:rules`, usando `firebase-tools` como herramienta
  puntual y **nunca como dependencia del proyecto** (`research/SUMMARY.md:24`).

  Esto es lo que hace honesta la verificación humana que exige el ROADMAP: el fichero
  committeado **es** lo que se revisa, y lo desplegado sale de él.

  **Descartado** escribirlas en la consola con una copia en el repo (pueden divergir sin
  que nada avise — el fallo exacto contra el que existe esa verificación) y el despliegue
  automático desde CI (exigiría una cuenta de servicio con permisos en un repo público
  para un fichero que cambiará una o dos veces en la vida del proyecto).

- **D-16:** **Gate automatizado en CI para el criterio de éxito 3.** Un test que, sobre la
  salida de `nuxt generate`, falle si la cadena `firebase` aparece en los chunks iniciales
  de `/` y `/marvel-champions`, o si su tamaño crece por encima de un techo. Es el «fail
  loudly at build» que el proyecto ya aplica al catálogo y al presupuesto de precacheo de
  audio de la Fase 4, y protege el criterio **para siempre**, no solo el día del merge.

  **Descartada** la comparación manual documentada: daría la fase por buena igual, pero
  nada impediría que un cambio futuro volviera a meter Firebase en el arranque sin que
  saltara ninguna alarma.

### Claude's Discretion

El usuario eligió una opción concreta en las dieciséis preguntas; no hay ningún «tú
decides» pendiente. Queda a criterio del planner, por ser detalle de implementación y no
decisión de producto:

- El nombre y la ubicación exacta del composable de sincronización (`research/ARCHITECTURE.md:238`
  propone `app/composables/useHistorySync.client.ts`) — **verificar antes** que el sufijo
  `.client.ts` se comporta como se espera para un composable en Nuxt 4, dado que
  `useGameHistory.ts` sí participa del prerender aunque `record()` no se invoque en él.
- Dónde se registra y se limpia el listener `online` de D-02.
- El nombre exacto de la clave de marcas (se asume `tga:history:synced`, siguiendo el
  prefijo `tga:` de todo el proyecto) y su formato interno.
- La forma de probar el composable en Vitest sin tocar Firestore real (inyección del
  cliente, doble de prueba, etc.).
- Si un fallo deja rastro diagnosticable en consola solo en desarrollo, o silencio
  absoluto también ahí.
- El comportamiento exacto si la auth anónima está deshabilitada en la consola de
  Firebase — se asume que cae en el mismo camino que cualquier otro fallo (no-op
  silencioso, pendiente que se reintenta).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Alcance y requisitos de la fase
- `.planning/ROADMAP.md` §«Phase 10: Respaldo en Firestore» (líneas 330-344) — goal, los
  cinco criterios de éxito y las dos verificaciones humanas exigidas.
- `.planning/ROADMAP.md` §«Decisión registrada de este hito: Firestore sin persistencia
  offline propia» (línea 348) — **la disyuntiva del mecanismo de cola ya está resuelta;
  no se redescubre desde cero.**
- `.planning/ROADMAP.md` §«Recordatorio de alcance para las seis fases» (línea 356) —
  Firestore es respaldo de escritura, nunca fuente de lectura, y no es la puerta de
  entrada a cuentas de usuario.
- `.planning/REQUIREMENTS.md` líneas 269-277 y 283 — SYNC-01…SYNC-09 y COMP-03.

### Investigación del hito
- `.planning/research/ARCHITECTURE.md` §e «Where does Firestore sit?» (líneas 194-219) —
  import dinámico, guarda de configuración, tabla de modos de fallo, y la frontera
  unidireccional. **Ojo:** su recomendación de la marca como campo dentro de la entrada
  (línea 217) queda superada por D-01.
- `.planning/research/PITFALLS.md` §2 (`await` que cuelga sin red), §5 (reglas abiertas en
  repo público — **su `allow read: if true` de la línea 104 queda superado por D-11**),
  §6 (SDK cargado con avidez), §7 (fallo silencioso de persistencia), §8 (doble fuente de
  verdad), §14 (tentación de alcance adyacente).
- `.planning/research/SUMMARY.md` §«Decision Required: Firestore Offline Persistence
  Mechanism» (líneas 72-87) — las dos opciones y por qué gana la B; línea 24 sobre
  `firebase-tools` como herramienta dev, no dependencia.

### Contexto de la fase anterior (dependencia directa)
- `.planning/phases/09-hist-rico-y-estad-sticas/09-CONTEXT.md` §D-14 (líneas 233-237) —
  la promesa aditiva que esta fase cumple; §D-13/D-15 sobre el envoltorio de
  `tga:history` y el `gameId` por entrada.
- `.planning/phases/09-hist-rico-y-estad-sticas/09-VERIFICATION.md` — los cierres CR-01 y
  CR-03 que justifican D-01.

### Proyecto
- `.planning/PROJECT.md` línea 109 — qué se revirtió y qué sigue excluido («backend propio
  y cuentas de usuario» siguen fuera); línea 159 — la decisión clave de v1.8.
- `CLAUDE.md` — stack, `nuxt generate`, `registerType: 'prompt'`, cabeceras de caché en
  `nitro.routeRules`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`app/composables/useGameHistory.ts:286` (`record()`)** — el punto de enganche de D-05.
  Hoy: resuelve el catálogo, congela nombres, construye la entrada con el motor puro y
  devuelve el booleano de `appendHistoryEntry`. Su cabecera (líneas 280-285) declara la
  firma «totalmente síncrona por diseño» y anticipa literalmente esta fase: «una fase
  futura es quien podría cambiar esto, no esta».
- **`app/composables/usePersistedSession.ts`** — la **única** costura de `localStorage`
  declarada del proyecto. La clave de marcas de D-01 debe nacer aquí, junto a
  `KEY_PREFIX` (línea 37), `VOICE_KEY` (45) y `HISTORY_KEY` (53); ningún otro fichero
  toca `window.localStorage`.
- **`readRaw` / `writeRaw` / `readEnvelope`** (`usePersistedSession.ts:212-265`) — el
  patrón de lectura de tres vías (`absent` / `value` / `unreadable`) y de fallo silencioso
  en escritura. La clave de marcas es **reconstruible** (a lo sumo se resube algo que
  D-03 hace inocuo), así que puede colapsar `unreadable` y `absent` como hacen
  `load`/`loadVoicePreference`, al contrario que `tga:history`.
- **`scripts/catalogue/fetch-marvelcdb.mjs`** — el precedente de proyección con lista
  blanca explícita que D-09 replica.
- **`e2e/offline-flow.spec.ts`** — el patrón de `context.setOffline(true)` que la
  verificación (a) del ROADMAP extiende.
- **`nuxt.config.ts:103` (`registerType: 'prompt'`)** y `e2e/update-banner.spec.ts` — el
  camino de actualización de COMP-03 ya existe y esta fase **no lo toca**; solo hay que
  no romperlo.

### Established Patterns

- **Dispara-y-olvida con `.catch()`:** `prefetchAll(audioIds.value).catch(() => {})` en
  `app/pages/[game]/index.vue:164` es el idioma exacto que D-05 debe copiar.
- **Guardas de SSR a mano:** `typeof window === 'undefined'` en toda la capa de
  persistencia. No hay plugins (`app/plugins/` no existe) y no hay `runtimeConfig` en
  `nuxt.config.ts` — las dos cosas serían nuevas en esta fase.
- **Ningún componente ni página importa `~~/engine/*`:** la disciplina de
  `useGameHistory.ts` (líneas 6-9) se extiende igual al nuevo módulo de sincronización.
- **`isGameHistoryEntry`** (`usePersistedSession.ts:131`) valida por campos requeridos y
  **no rechaza campos extra** — relevante si alguien reabriera D-01, pero irrelevante con
  la marca fuera de la entrada.
- **Vitest en CI como gate que falla la build** — el precedente para D-16.

### Integration Points

1. **`record()`** → nueva llamada dispara-y-olvida tras el `true` local (D-05, D-06).
2. **`usePersistedSession.ts`** → nueva clave `tga:history:synced` con su lector y su
   escritor (D-01, D-04).
3. **`nuxt.config.ts`** → `runtimeConfig.public` nuevo con la config de Firebase (D-13).
   **Sin cambios en PWA/Workbox ni en `routeRules`**: `firestore.googleapis.com` es
   cross-origin y los `globPatterns` actuales (líneas 151-174) solo cubren salida de build
   del mismo origen — **no se añade ningún `runtimeCaching`**
   (`research/ARCHITECTURE.md:219`).
4. **`package.json`** → dependencia `firebase`, importada **solo** dinámicamente.
5. **Raíz del repo** → `firestore.rules` nuevo (D-15) y `.env.example` (D-13/D-14).
6. **`e2e/offline-flow.spec.ts`** → extensión con la verificación (a) del ROADMAP.

</code_context>

<specifics>
## Specific Ideas

- **«Silenciosa» es literal.** D-07 no es una preferencia estética: la app no debe dar al
  grupo, en mitad de una partida, una señal que no puedan accionar.
- **El respaldo es una copia fiel, con nombres.** Se ofreció explícitamente subir una
  proyección sin `playerName` y se rechazó: el respaldo guarda quién jugó.
- **La inspección real será desde la consola de Firebase.** D-10 y D-11 están elegidos con
  ese uso en mente: una lista plana de todas las partidas de todos los dispositivos, y
  cero lectura desde la app.
- **Un reintento eternamente rechazado es aceptable** (D-03). No se debe «arreglar»
  tratando `permission-denied` como éxito.

</specifics>

<deferred>
## Deferred Ideas

- **Restaurar el histórico desde Firestore.** La capacidad que hace tentadora la opción
  «`create` + `read` de los propios» de D-11. Si algún día se quiere, es su propia fase, y
  empieza por redesplegar reglas — no por relajar estas.
- **Indicio de pendiente en `/historico` o contador en `/estadisticas`** (rechazados en
  D-07). Si el respaldo alguna vez resulta poco fiable y hace falta verlo desde la tablet,
  vuelve a la mesa como decisión de producto.
- **Versión de la app como metadato del documento** (rechazada en D-12). Requiere exponer
  la versión al cliente primero.
- **Emulador de Firestore y tests automatizados de las reglas** (rechazados en D-14). La
  forma correcta de probar reglas; hoy la revisión humana del ROADMAP cubre el riesgo.
- **App Check.** No se planteó como opción; queda anotado como la siguiente palanca si la
  basura en el respaldo llegara a ser un problema real.

### Reviewed Todos (not folded)

- `cr-03-experto-sustitucion-cartas-rhino-ultron.md` — único todo pendiente del proyecto.
  No cruza con esta fase (es contenido de reglas de Marvel Champions, no sincronización);
  el emparejador automático no le dio ninguna coincidencia.

</deferred>

---

*Phase: 10-Respaldo en Firestore*
*Context gathered: 2026-09-22*
