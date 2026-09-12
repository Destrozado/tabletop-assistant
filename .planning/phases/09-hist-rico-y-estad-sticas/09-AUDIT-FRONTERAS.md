# Auditoría de fronteras — `usePersistedSession.ts` + `useGameHistory.ts` + `engine/history.ts`

**Encargo, citado palabra por palabra de `09-VERIFICATION.md` (§«Patrón recurrente…», final del documento):**

> «Esta es la tercera ronda consecutiva en la que la verificación (o el `09-REVIEW.md` que la
> precede) encuentra un defecto de la misma familia — una frontera de validación que se
> endurece por un lado del contrato lectura/escritura y deja sin cubrir un caso adyacente en el
> otro lado o en un módulo vecino. Antes de dar la fase por cerrada, valdría la pena una
> revisión específica y exhaustiva de TODAS las rutas de `usePersistedSession.ts` +
> `useGameHistory.ts` + `engine/history.ts` bajo el mismo criterio (¿qué pasa si esta operación
> falla a medias? ¿qué pasa si esta clave de objeto es un dato no confiable?), **en vez de
> cerrar un hallazgo a la vez**.»

Y del resumen ejecutivo de la misma verificación: dos BLOCKER (CR-01 ronda 3: `readRaw`
colapsa fallo de lectura y ausencia; CR-02 ronda 3: `heroNames[heroId]` resuelve por
`Object.prototype`), ambos con causa raíz **distinta** de las rondas 1 y 2, sobre los mismos
dos criterios de éxito (SC2/SC3) que ya habían fallado antes por otro motivo.

**Perímetro auditado:** los tres ficheros nombrados por el encargo, más los colaboradores
directos que los mismos dos criterios alcanzan: `app/composables/useHeroSearch.ts`,
`engine/statistics.ts` y `engine/selection.ts`. Total: **54 funciones/miembros** inventariados
(16 + 10 + 6 + 12 + 4 + 6, ver recuento §4).

---

## 1. Método

El encargo del verificador nombra dos preguntas. Este barrido añade una tercera, derivada de
mirar las tres rondas juntas en vez de una a una:

- **Q1 — ¿Qué pasa si esta operación falla a medias?** (la pregunta del verificador). Cubre
  lecturas/escrituras de `localStorage` que pueden lanzar, JSON que puede no parsear, y
  cualquier paso intermedio que pueda quedar sin completar.
- **Q2 — ¿Esta clave de objeto es un dato no confiable?** (la pregunta del verificador). Cubre
  todo acceso `objeto[clave]` donde `clave` puede venir, en última instancia, de
  `localStorage` o de la URL — el vector que CR-02 (ronda 3) y WR-08 ya explotaron una vez
  cada uno.
- **Q3 — ¿Puede el valor que devuelve esta función afirmar algo que no ha ocurrido?** (nueva,
  de este plan). Ninguna de las dos preguntas del verificador habría cazado por sí sola el
  patrón real de las tres rondas: la ronda 1 encontró `appendHistoryEntry` devolviendo `true`
  sobre un histórico que en realidad no se pudo escribir bien (una escritura a medias que
  Q1 sí cubre, pero el síntoma observable — un `✓` falso en pantalla — es que el **retorno**
  miente, no solo que la operación falló). La ronda 3 encontró `resume()` devolviendo
  `outcome: 'resumed'` sobre un `context` de relleno (WR-03, ya cerrado en 09-15): ahí no hay
  ningún fallo de lectura ni ninguna clave insegura — `context: {}` es un JSON perfectamente
  válido y `isPersistedPosition` lo acepta sin problema. Lo que falla es que el **valor
  devuelto por la función** (`outcome: 'resumed'`) afirma una continuidad que no existe. Sin
  esta tercera pregunta, una función que lee bien, indexa bien, pero **miente en lo que
  devuelve**, pasaría este barrido con las dos preguntas originales y reabriría una cuarta
  ronda.

Cada función del perímetro recibe una fila con las tres preguntas contestadas — «no aplica: …»
cuando una pregunta no tiene sentido para esa función concreta — y un veredicto único:

- **OK** — la función ya resuelve las tres preguntas de forma correcta, con la razón.
- **DEFECTO BF-xx** — el barrido reproduce un fallo con valores concretos; identificador
  correlativo, cerrado en la Task 2 con test de regresión en la Task 3.
- **ACEPTADO** — el barrido confirma el comportamiento (a veces imperfecto) pero su cierre
  exige superficie de interfaz nueva, pertenece a otra fase, o ya está registrado como deuda
  explícita por un plan anterior de este mismo lote; se registra en `deferred-items.md`.

**Comandos ejecutados durante el barrido** (además de la lectura íntegra de los seis
ficheros):

```
grep -n "\[" app/composables/usePersistedSession.ts app/composables/useGameHistory.ts engine/history.ts app/composables/useHeroSearch.ts engine/statistics.ts engine/selection.ts
grep -rn "Record<string" app/ engine/
grep -n "??\|||" app/composables/useGameHistory.ts engine/history.ts app/composables/useHeroSearch.ts
grep -n "return true\|return false\|outcome:" app/composables/usePersistedSession.ts engine/persistence.ts
grep -rn "resolveHeroSpanishName\|buildTakenByMap\|buildDuplicateWarningText" app/
```

El tercer comando localizó los cuatro `Record<string, …>` de `useHeroSearch.ts`
(`spanishHeroAliases` en su declaración, `labelsByHeroId`/`result` en `buildTakenByMap`,
`slotIndexesByHeroId` en `buildDuplicateWarningText`) como los únicos objetos literales del
perímetro que sobreviven tras los cierres de 09-14 (que ya convirtió `heroNames`,
`gamesById` y `cataloguesById` en mapas sin prototipo). El quinto comando confirmó que
`playerSlots` — y por tanto el `heroId` que llega a `buildTakenByMap`/
`buildDuplicateWarningText` desde `app/pages/[game]/index.vue:378,429` — viene de
`resolvePlayerSlots(session.context)`, que solo exige «cadena no vacía» (`engine/selection.ts:63`)
sin contrastar contra el catálogo: el mismo vector de entrada no confiable que CR-02 (ronda 3)
ya explotó una vez, alcanzando esta vez un sitio **distinto** del que cerró 09-14.

---

## 2. Inventario y veredicto

### `app/composables/usePersistedSession.ts` (16 funciones)

| Función | Q1 fallo a medias | Q2 dato no confiable como clave/campo | Q3 afirma lo que no ocurrió | Veredicto |
|---|---|---|---|---|
| `normalizeVoicePreference` | no aplica: sin I/O, solo compara con `false` | no aplica: no indexa nada | devuelve exactamente `value !== false`, no afirma nada más | OK |
| `isPersistedPosition` | no aplica: solo inspecciona un valor ya en memoria | usa `in`/acceso de propiedad fija (`formatVersion`, `context`…), nunca una clave variable — sin riesgo de prototipo | type guard puro: si devuelve `true` es porque las 5 propiedades existen de verdad | OK |
| `isHistoryPlayerEntry` | no aplica | accede a propiedades fijas (`heroId`, `heroName`, `playerName`), no indexado por variable | igual que arriba | OK |
| `isGameHistoryEntry` | no aplica | propiedades fijas; `round`/`playerCount`/`durationMs` ya usan `Number.isFinite` (cierre WR-03/09-12) | rechaza toda forma que no cumpla — no puede decir «esto es válido» sobre algo que no lo es | OK |
| `readRaw` | **cerrado en 09-13**: tres vías discriminadas (`absent`/`value`/`unreadable`); `'unreadable'` nunca se confunde con `'absent'` | no aplica: `key` es una constante interna (`HISTORY_KEY`/`VOICE_KEY`/`storageKey(gameId)`), no dato externo | el tipo de retorno declara explícitamente qué sabe y qué no sabe — ya no puede afirmar «vacío» sobre un fallo de lectura | OK |
| `writeRaw` | `try/catch` envuelve `setItem`; devuelve `false` ante cualquier fallo (cuota, modo privado) | no aplica | el booleano devuelto refleja el resultado real de la escritura, nunca inventado | OK |
| `removeRaw` | `try/catch` silencioso, documentado (D-03: un fallo al borrar no debe romper «Empezar partida nueva») | no aplica | devuelve `void`: no hay nada que pueda afirmar de más | OK |
| `readEnvelope` | **cerrado en 09-13** (CR-03): `'unreadable'` de lectura Y de parseo desembocan en la misma variante, nunca en `'empty'` | `parsed.formatVersion`/`parsed.entries` son propiedades fijas, no indexado por clave variable | el `kind` devuelto es exactamente lo que se pudo confirmar | OK |
| `load` | `read.kind !== 'value'` (incluye `'unreadable'`) cae a `null` — decisión explícita: progreso es RECONSTRUIBLE, colapsar es seguro aquí (documentado en el propio fichero) | no aplica | `null` significa «no hay progreso reanudable», cierto en los dos casos que colapsa | OK |
| `save` | ignora el booleano de `writeRaw` a propósito (VOZ-06/D-51: un fallo de storage no puede romper `next()`/`prev()`) | no aplica | devuelve `void`, no afirma éxito | OK |
| `clear` | ídem `removeRaw` | no aplica | `void` | OK |
| `loadVoicePreference` | mismo colapso deliberado que `load` (preferencia reconstruible) | no aplica | `boolean` con valor por defecto documentado (D-47) | OK |
| `saveVoicePreference` | ignora el resultado de `writeRaw` a propósito, mismo criterio que `save` | no aplica | `void` | OK |
| `loadHistory` | `read.kind !== 'ok'` (incluye `'unreadable'`) devuelve `[]` — de cara a pantalla ambos casos son indistinguibles a propósito (solo importa a la escritura) | no aplica: filtra con `isGameHistoryEntry`, sin indexar por clave | `[]` no afirma «no hay partidas», afirma «no hay partidas *legibles* para pintar», que es literalmente cierto | OK |
| `appendHistoryEntry` | **cerrado en 09-13**: aborta con `false` sin llamar a `writeRaw` si `read.kind === 'unreadable'` | `isGameHistoryEntry` ya filtra por forma antes de construir el envoltorio | el booleano devuelto ahora sí refleja si se escribió de verdad (antes del cierre de 09-12/09-13/09-14 podía devolver `false` con causa incorrecta atribuida) | ACEPTADO — comportamiento correcto; lo que queda abierto es la AUSENCIA de una vía de recuperación en la interfaz cuando el bloqueo es permanente (WR-02), que la app crece sin poda (IN-04) y que una entrada rechazada por forma queda invisible e imborrable (IN-12) — los tres exigen superficie de interfaz nueva, registrados en `deferred-items.md` |
| `removeHistoryEntry` | `read.kind !== 'ok'` (incluye `'unreadable'`) es no-op silencioso | opera sobre `read.entries` en crudo comparando `id` por igualdad, sin indexar objeto por clave | devuelve `void` e ignora el booleano de `writeRaw` — un fallo de escritura deja la tarjeta visible sin explicación (IN-11) | ACEPTADO — comportamiento documentado en el propio código, pero el fallo silencioso ante un `writeRaw` que falla es deuda real (IN-11), registrado en `deferred-items.md` |

### `app/composables/useGameHistory.ts` (10 funciones/miembros)

| Función | Q1 fallo a medias | Q2 dato no confiable como clave/campo | Q3 afirma lo que no ocurrió | Veredicto |
|---|---|---|---|---|
| `resolveFrozenNames` | no aplica: no toca storage directamente | **cerrado en 09-14**: `heroNames` se construye con `Object.create(null)`; `heroId` solo entra si existe en el catálogo | devuelve solo lo que pudo resolver contra el catálogo real | OK |
| `buildHistoryCardView` | no aplica: función pura sobre un `entry` ya en memoria | `players` se filtra por `typeof === 'object'` pero **NO** normaliza `heroId`/`heroName`/`playerName` por tipo antes de usarlos — ver BF-01 | `hasAnyHero`/`playerLines` pueden interpolar `undefined` literal en pantalla (WR-01); `contextLine`/`roundAndDurationLine` interpolan `entry.playerCount`/`entry.round` sin `Number.isFinite`, y `villainDisplayName` sin comprobar que `villainId`/`villainName` sean realmente `string` — ver BF-02 | **DEFECTO BF-01, BF-02** |
| `toStatRowView` | no aplica | propiedades fijas (`row.id`, `row.name`…) | compone una cadena fiel a los números recibidos, no inventa nada | OK |
| `buildStatisticsView` | no aplica | no indexa por clave variable | `isEmpty`/`emptyTitle`/`emptyBody` son coherentes entre sí (WR-01 de ronda 2, ya cerrado); **pero** `sampleCaption` declara solo la muestra de héroes e ignora la de villanos — la leyenda no describe lo que la tabla de villanos agrega debajo (WR-07) | ACEPTADO — WR-07, exige exponer `entriesWithVillain` en `StatisticsSummary` (cambio de forma acordado como fuera de este plan por el `<scope_boundary>`), registrado en `deferred-items.md` |
| `record` | delega en `appendHistoryEntry`, ya endurecido | delega en `resolveFrozenNames`, ya endurecido | el booleano devuelto es exactamente el de `appendHistoryEntry` | OK |
| `reload` | `loadHistory()` nunca lanza; reasignación completa del `ref` | no aplica | `void` | OK |
| `remove` | delega en `removeHistoryEntry` | no aplica | `void` — hereda el mismo silencio ante fallo de escritura que IN-11 señala en la capa de abajo | ACEPTADO (mismo IN-11 que `removeHistoryEntry`) |
| `cardViews` (computed) | no aplica | no aplica | mapea `entries.value` con `buildHistoryCardView` sin alterar nada más | OK |
| `statisticsView` (computed) | no aplica | no aplica | compone `aggregateStatistics` + `buildStatisticsView` sin alterar nada más | OK |
| `isEmpty` (computed) | no aplica | no aplica | `entries.value.length === 0`, literal | OK |

### `engine/history.ts` (6 funciones, 5 exportadas + 1 privada)

| Función | Q1 fallo a medias | Q2 dato no confiable como clave/campo | Q3 afirma lo que no ocurrió | Veredicto |
|---|---|---|---|---|
| `buildHistoryEntry` | no aplica: función pura | `resolveFrozenHeroName` ya endurecida (ver abajo); `villainId`/`villainName` llevan guarda de tipo (cierre 09-14) | `difficulty`/`playerCount`/`round`/`durationMs` se normalizan en origen (cierre 09-12): nunca produce una entrada con una cifra imposible | OK |
| `describeLossCause` | no aplica | no indexa: `switch`/ternario sobre un `LossCause` ya validado por el tipo | las dos cadenas están contrastadas contra el Rules Reference (D-06) | OK |
| `formatEntryDate` | no aplica | no indexa | `'—'` ante fecha no parseable — no inventa una fecha | OK |
| `formatEntryDuration` | no aplica: función pura | no aplica | **DEFECTO BF-03** (WR-06): pinta «1 h 0 min», dos negativos en formato «-2 h -40 min», y «0 min» para una partida de 20 s — tres cifras que afirman algo que ninguna mesa real anotaría así | **DEFECTO BF-03** |
| `sortEntriesByRecency` | no aplica | no aplica | ordena por instante real (`Date.parse`), no por colación de cadena; una fecha no parseable cae al final sin alterar el resto — ya endurecida en una ronda anterior (test `describe('WR-06: orden cronológico…')`, nombre de test heredado que no debe confundirse con el BF-03 de este plan) | OK |
| `resolveFrozenHeroName` (privada) | no aplica | **cerrado en 09-14**: `Object.hasOwn` + `typeof === 'string'` antes de aceptar el nombre | devuelve `null` si no puede confirmar el nombre, nunca un valor heredado de `Object.prototype` | OK |

### `app/composables/useHeroSearch.ts` (12 funciones)

| Función | Q1 fallo a medias | Q2 dato no confiable como clave/campo | Q3 afirma lo que no ocurrió | Veredicto |
|---|---|---|---|---|
| `normalizeForSearch` | no aplica | no indexa: solo transforma la cadena recibida | `String(value ?? '')` nunca lanza ni inventa contenido | OK |
| `resolveHeroSpanishName` | no aplica: sin I/O | **`spanishHeroAliases[heroId]` es un objeto literal indexado por `heroId`** — ver BF-04 | con un `heroId` de `Object.prototype`, `alias` es una función; `alias.trim()` **lanza**, en vez de devolver limpiamente `catalogueName` (D-05 promete «nunca falla») | **DEFECTO BF-04** |
| `buildHeroOptions` | no aplica | itera `heroes` (array del catálogo, confiable) y llama a `resolveHeroSpanishName` con `hero.id` — siempre un id real del catálogo, nunca dato de usuario | ordena y proyecta sin inventar campos | OK — no alcanzable hoy por este camino (mismo argumento que BF-04: `hero.id` es de confianza aquí), el riesgo vive en la función de abajo, no en esta |
| `buildVillainOptions` | no aplica | itera `villains` del catálogo, confiable | ordena y proyecta sin inventar campos | OK |
| `matchesHeroQuery` | no aplica | no indexa | comparación de subcadenas, no afirma coincidencia falsa | OK |
| `filterHeroOptions` | no aplica | no indexa | filtra preservando orden, no reordena ni inventa | OK |
| `findHeroOption` / `findVillainOption` | no aplica | `.find()` sobre array, no acceso `[clave]` | `null` si no existe — nunca devuelve un valor no solicitado | OK |
| `resolvePlayerLabel` | no aplica | no indexa | «Jugador N» solo cuando el nombre está vacío/solo espacios — fiel al dato | OK |
| `joinNames` | no aplica | no indexa | concatena exactamente los nombres recibidos | OK |
| `buildTakenByMap` | no aplica: función pura | **`labelsByHeroId`/`result` son objetos literales indexados por `slot.heroId`**, que llega sin filtrar por catálogo desde `resolvePlayerSlots` (ver §1, comando 5) — ver BF-05 | con `heroId: 'constructor'` (u otra de las 8 claves), `labelsByHeroId['constructor']` es la función `Object` (truthy): la comprobación `if (!labelsByHeroId[slot.heroId])` no crea el array, y `.push(label)` sobre la función **lanza** `TypeError` | **DEFECTO BF-05** |
| `buildDuplicateWarningText` | no aplica | **`slotIndexesByHeroId` es un objeto literal indexado por `slot.heroId`**, mismo vector que arriba — ver BF-06 | mismo síntoma que BF-05: `.push` sobre un valor heredado de `Object.prototype` lanza | **DEFECTO BF-06** |

### `engine/statistics.ts` (4 funciones)

| Función | Q1 fallo a medias | Q2 dato no confiable como clave/campo | Q3 afirma lo que no ocurrió | Veredicto |
|---|---|---|---|---|
| `buildRows` | no aplica | usa `Map`, no objeto literal — el propio comentario de `09-REVIEW.md`/CR-02 lo señala como candidato OK, confirmado aquí por escrito | `pct = Math.round((wins/played)*100)` puede anunciar «100 %» sin pleno exacto (199/200 → 100 %, IN-13) | ACEPTADO — IN-13, cosmético, deuda registrada en `deferred-items.md` |
| `extractHeroIds` | no aplica | ya filtra `p.heroId !== null && p.heroId !== undefined` y coacciona con `String(...)` (comentario CR-02 «defensa en profundidad») — este es el predicado que WR-01 señala que su gemelo de la vista (`buildHistoryCardView`) no replicaba | no inventa nombres: `String(p.heroName ?? p.heroId)` | OK |
| `extractVillainId` | no aplica | mismo patrón que `extractHeroIds`, ya endurecido | igual | OK |
| `aggregateStatistics` | no aplica | delega en `buildRows`/`extractHeroIds`/`extractVillainId`, ya revisadas | `entriesWithHeroes` es exacto para lo que cuenta, pero no existe un `entriesWithVillain` hermano — la falta de ese campo es la raíz de WR-07 (ver `buildStatisticsView` arriba) | ACEPTADO — WR-07, mismo motivo que arriba |

### `engine/selection.ts` (6 funciones)

| Función | Q1 fallo a medias | Q2 dato no confiable como clave/campo | Q3 afirma lo que no ocurrió | Veredicto |
|---|---|---|---|---|
| `emptySelection` | no aplica | no indexa | longitud saneada por `Number.isInteger`/`> 0`, coherente con lo pedido | OK |
| `resolvePlayerSlots` | no aplica | accede a `heroes[i]` por **índice numérico de array**, no por clave de objeto — sin riesgo de prototipo; valida `heroId`/`playerName` por tipo antes de aceptarlos | longitud siempre `= playerCount` saneado, nunca de `selection.heroes.length` (Q8 del propio comentario) | OK |
| `resolveVillainId` | no aplica | accede a `selection.villainId`, propiedad fija | `string` no vacío o `null`, fiel al dato | OK |
| `setVillain` | no aplica | no indexa | devuelve sesión nueva con exactamente el cambio pedido | OK |
| `setHero` | no aplica | índice de array validado por rango antes de escribir | ante `slot` inválido devuelve la MISMA referencia (no-op documentado) — no afirma un cambio que no hizo porque no cambia nada observable | OK |
| `setPlayerName` | no aplica | índice de array validado por rango | mismo criterio que `setHero` | OK |

---

## 3. Defectos

### BF-01 — `buildHistoryCardView` no normaliza `heroId`/`heroName`/`playerName` de un hueco de jugador (WR-01)

**Fichero/línea:** `app/composables/useGameHistory.ts:121-137` (bloque `players`/`hasAnyHero`/`playerLines`).

**Qué falla:** el filtro de `players` solo descarta `null` y no-objetos (`:121-122`); no comprueba el TIPO de `heroId`/`heroName`/`playerName`. `hasAnyHero` (`:123`) solo excluye `heroId === null`, así que `heroId: undefined` cuenta como «tiene héroe». La interpolación de `:136`
(`` `${label} · ${player.heroName ?? player.heroId}` ``) entonces produce literalmente la
cadena `undefined` cuando ambos campos son `undefined`.

**Reproducción concreta:** `buildHistoryCardView(makeEntry({ players: [{ playerName: 'Ana' }] as never } ))` → `view.playerLines` contiene `'Ana · undefined'`.

**Alcanzable hoy:** sí, directamente — la función es exportada y se llama con un `entry` que
viene en última instancia de `localStorage` (editable a mano); y el propio test file de la
Fase 9 ya demuestra que `players: [{}]`/`players: [null]` llegan hasta aquí sin pasar por
`isHistoryPlayerEntry` (esa validación solo se aplica en la frontera de *escritura*, nunca en
la de *lectura* que consume esta función).

**Arreglo propuesto:** normalizar cada hueco a `{ heroId: typeof === 'string' ? valor : null, heroName: typeof === 'string' ? valor : null, playerName: typeof === 'string' ? valor : '' }` antes de calcular `hasAnyHero`/`playerLines`, replicando el predicado de `engine/statistics.ts:98` (`heroId !== null && heroId !== undefined`, que tras la normalización se colapsa a `!== null`).

### BF-02 — `buildHistoryCardView` interpola `playerCount`/`round`/`villainId`/`villainName` sin defensa de tipo

**Fichero/línea:** `app/composables/useGameHistory.ts:133,144,150,113-114`.

**Qué falla:** `contextLine` interpola `entry.playerCount` y `roundAndDurationLine` interpola
`entry.round` directamente, sin `Number.isFinite`; `villainDisplayName` acepta
`entry.villainId`/`entry.villainName` de cualquier tipo con tal de que `villainId !== null`.

**Reproducción concreta:** `buildHistoryCardView(makeEntry({ playerCount: Number.NaN as never, round: Number.NaN as never }))` → `contextLine` contiene la subcadena `'NaN'`; `buildHistoryCardView(makeEntry({ villainId: 7 as never, villainName: undefined as never }))` → `contextLine` empieza por `'7 ·'` (un número que no es ningún nombre de villano) en vez de degradar a «Sin villano» o al menos a una cadena `string`.

**Alcanzable hoy:** solo llamando a la función directamente con un `entry` corrupto (la
frontera de `usePersistedSession.ts` ya filtra por `isGameHistoryEntry` antes de que
`useGameHistory().cardViews` la reciba) — exactamente la misma categoría de «defensa en
profundidad de una función exportada y testeada directamente» que ya motiva el resto de
guardas de este fichero (comentario CR-01 en `:116-120`).

**Arreglo propuesto:** `Number.isFinite(entry.playerCount) ? entry.playerCount : players.length`;
`Number.isFinite(entry.round) ? entry.round : 1` (mismos valores de repliegue que
`buildHistoryEntry` ya usa, 09-12); `hasVillain = typeof entry.villainId === 'string'`;
`villainDisplayName` solo acepta `entry.villainName` si es `string`.

### BF-03 — `formatEntryDuration` pinta cifras imposibles (WR-06)

**Fichero/línea:** `engine/history.ts:152-159`.

**Qué falla:** con `durationMs === 3_600_000` (exactamente 1h) sale `'1 h 0 min'`;
`Number.isFinite` deja pasar negativos, y `durationMs === -6_000_000` produce `'-2 h -40 min'`
(`Math.floor(-100/60) === -2`, `-100 % 60 === -40`); y `durationMs === 20_000` (20 s) produce
`'0 min'`.

**Reproducción concreta:** `formatEntryDuration(3_600_000)` → `'1 h 0 min'` (debería ser
`'1 h'`); `formatEntryDuration(-6_000_000)` → `'-2 h -40 min'` (debería ser `'—'`);
`formatEntryDuration(20_000)` → `'0 min'` (debería ser `'1 min'`).

**Alcanzable hoy:** sí — `durationMs` sale de `now - startedAt` (`buildHistoryEntry`); una
partida de exactamente 1h, o de menos de 1 min, son duraciones reales de mesa, no casos de
laboratorio.

**Arreglo propuesto (ya validado por `09-REVIEW.md` WR-06):** `durationMs < 0` también
degrada a `'—'`; `totalMinutes = Math.max(1, Math.round(durationMs / 60000))`; y devolver
`` `${hours} h` `` (sin minutos) cuando `minutes === 0` y `hours > 0`.

### BF-04 — `resolveHeroSpanishName` lanza con una clave heredada de `Object.prototype`

**Fichero/línea:** `app/composables/useHeroSearch.ts:65-68`.

**Qué falla:** `spanishHeroAliases[heroId]` (objeto literal) resuelve `heroId: 'constructor'`
a la función `Object`; `alias.trim()` no existe en una función → `TypeError`.

**Reproducción concreta:** `resolveHeroSpanishName('constructor', 'Fallback')` lanza
`TypeError: alias.trim is not a function` contra el código previo a este plan.

**Alcanzable hoy en producción:** no — los dos llamadores actuales (`buildHeroOptions` con
`hero.id` del catálogo, y `resolveFrozenNames` con un `heroId` que ya superó `if (hero)`
contra el catálogo) nunca pasan una clave de `Object.prototype`. Es exactamente el caso que
el propio `09-REVIEW.md` describe al pie de CR-02: «mismo repaso conviene en cualquier otro
`Record<string, …>` indexado por dato de usuario … aunque hoy sus claves vengan del
catálogo» — alcanzable el día que un llamador futuro (o un cambio en `resolveFrozenNames`)
deje de filtrar contra el catálogo antes de llamar.

**Arreglo propuesto:** `Object.hasOwn(spanishHeroAliases, heroId)` antes de leer el valor;
aceptar el alias solo si `typeof === 'string'` y no vacío.

### BF-05 — `buildTakenByMap` lanza con un `heroId` heredado de `Object.prototype` (REACHABLE, no solo latente)

**Fichero/línea:** `app/composables/useHeroSearch.ts:150-157` (`labelsByHeroId`, `result`).

**Qué falla:** `labelsByHeroId`/`result` son objetos literales; `slot.heroId` llega desde
`playerSlots.value` en `app/pages/[game]/index.vue:378`, que a su vez viene de
`resolvePlayerSlots(session.context)` — y `resolvePlayerSlots` (`engine/selection.ts:63`)
solo exige `typeof === 'string' && length > 0`, **sin contrastar contra el catálogo de
héroes**. Con `slot.heroId === 'constructor'`, `labelsByHeroId['constructor']` es la función
`Object` (truthy), así que `if (!labelsByHeroId[slot.heroId])` NO crea el array, y
`labelsByHeroId[slot.heroId]!.push(label)` intenta invocar `.push` sobre la función —
**lanza** `TypeError: labelsByHeroId[slot.heroId].push is not a function`.

**Reproducción concreta:** `buildTakenByMap([{ heroId: 'constructor', playerName: 'Ana' }, { heroId: 'thor', playerName: 'Luis' }], 1)` lanza contra el código previo a este plan.

**Alcanzable hoy en producción:** **sí, directamente** — a diferencia de BF-04, aquí no hay
ningún filtro contra el catálogo entre el dato editable en `localStorage`
(`context.selection.heroes[i].heroId`) y esta función: basta con abrir DevTools, escribir
`'constructor'` en ese campo, recargar, y tocar el selector de héroe de OTRO jugador para que
`PlayerModal` invoque `buildTakenByMap` y la pantalla de selección reviente. Es el mismo
vector exacto que CR-02 (ronda 3) — un `heroId` no contrastado contra el catálogo indexando
un objeto literal — alcanzando un sitio que 09-14 no tocó porque no formaba parte de su
alcance (`useGameHistory.ts`/`engine/history.ts`).

**Arreglo propuesto:** `labelsByHeroId`/`result` construidos con `Object.create(null)`, mismo
patrón que `resolveFrozenNames` ya aplica desde 09-14.

### BF-06 — `buildDuplicateWarningText` con el mismo defecto que BF-05

**Fichero/línea:** `app/composables/useHeroSearch.ts:173-181` (`slotIndexesByHeroId`).

**Qué falla y cómo se reproduce:** idéntico a BF-05 pero sobre `slotIndexesByHeroId`;
`buildDuplicateWarningText([{ heroId: 'constructor', playerName: 'Ana' }, { heroId: 'constructor', playerName: 'Luis' }])` lanza contra el código previo a este plan.

**Alcanzable hoy en producción:** sí, mismo vector que BF-05 — esta función se invoca desde
la misma pantalla (`[game]/index.vue:429`) sobre el mismo `playerSlots.value`.

**Arreglo propuesto:** `slotIndexesByHeroId` construido con `Object.create(null)`.

---

## 4. Recuento

| Fichero | Funciones auditadas | OK | DEFECTO | ACEPTADO |
|---|---|---|---|---|
| `usePersistedSession.ts` | 16 | 14 | 0 | 2 (`appendHistoryEntry`, `removeHistoryEntry`) |
| `useGameHistory.ts` | 10 | 7 | 1 (`buildHistoryCardView`, BF-01+BF-02) | 2 (`buildStatisticsView`, `remove`) |
| `engine/history.ts` | 6 | 5 | 1 (`formatEntryDuration`, BF-03) | 0 |
| `useHeroSearch.ts` | 12 | 9 | 3 (`resolveHeroSpanishName` BF-04, `buildTakenByMap` BF-05, `buildDuplicateWarningText` BF-06) | 0 |
| `engine/statistics.ts` | 4 | 2 | 0 | 2 (`buildRows`, `aggregateStatistics`) |
| `engine/selection.ts` | 6 | 6 | 0 | 0 |
| **Total** | **54** | **43** | **5 funciones (6 identificadores BF-xx: `buildHistoryCardView` acumula BF-01 y BF-02)** | **6** |

Comprobación de suma: 43 (OK) + 5 (funciones con DEFECTO) + 6 (ACEPTADO) = 54. ✓ Identificadores
`BF-xx` totales: 6 (BF-01 a BF-06), uno de ellos (`buildHistoryCardView`) acumula dos
identificadores porque el barrido encontró dos fallos independientes en la misma función.

---

## 5. Fuera de perímetro

Todo lo marcado `ACEPTADO` arriba, más las siguientes conclusiones del barrido, se registran
en `deferred-items.md` (Task 3 de este plan) con fichero, línea, motivo y propuesta:

- **WR-02** (`appendHistoryEntry`/`readEnvelope`, `usePersistedSession.ts`): la ausencia de
  vía de recuperación ante un blob `unreadable` permanente exige una superficie de interfaz
  nueva (`09-UI-SPEC.md` no la cubre) — no se construye a ciegas en un cierre de huecos.
- **WR-07** (`buildStatisticsView`/`aggregateStatistics`): exponer `entriesWithVillain` es un
  cambio de forma de `StatisticsSummary` explícitamente señalado en el `<scope_boundary>` de
  este mismo plan como "lo que 09-13..09-16 dejaron fuera y este plan también aplaza".
- **WR-04** (`GameOutcomeDialog.vue`) y **WR-05 (b)** (maquetación de `HistorySavedNotice`
  sobre pantallas `h-dvh`): viven en ficheros `.vue`, explícitamente fuera del perímetro de
  este plan (`<scope_boundary>` §FUERA de alcance).
- **IN-04** (histórico sin poda), **IN-05** (longitud variable del `id`), **IN-11**
  (`removeHistoryEntry` traga el fallo de escritura), **IN-12** (entrada rechazada invisible e
  imborrable), **IN-13** (`Math.round` puede anunciar 100 % sin pleno): deuda de nivel INFO ya
  señalada por `09-REVIEW.md`, que este plan registra formalmente en vez de tocar código que
  no está roto — arreglarlas cambiaría contratos (`removeHistoryEntry` pasaría a devolver
  algo distinto de `void`; el formato del `id` cambiaría el regex que el test ya fija) fuera
  del alcance mínimo de esta ronda.
- **IN-07** (el fichero e2e aborta la suite en tiempo de import): vive en `e2e/`, fuera del
  perímetro de composables/motor que audita este plan.
- **Sincronización de `REQUIREMENTS.md`** (HIST-04/HIST-06): no es un defecto de código, es
  el problema de sincronización manual documentado en `deferred-items.md` desde el plan 09-03
  — se resuelve en la Task 3 de este mismo plan, no aquí.

Ningún hallazgo de este barrido requiere Firestore/Firebase (SC5/STAT-04 siguen sin tocarse) ni
toca ningún fichero `.vue` de pantalla.
