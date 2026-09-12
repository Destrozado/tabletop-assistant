---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-12T13:15:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - app/app.vue
  - app/components/GameOutcomeDialog.vue
  - app/components/GameSelectorScreen.vue
  - app/components/HistoryEntryCard.vue
  - app/components/HistorySavedNotice.vue
  - app/composables/__tests__/useGameHistory.test.ts
  - app/composables/__tests__/useGameSession.test.ts
  - app/composables/__tests__/useHistorySavedNotice.test.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - app/composables/useGameHistory.ts
  - app/composables/useGameSession.ts
  - app/composables/useHistorySavedNotice.ts
  - app/composables/usePersistedSession.ts
  - app/pages/[game]/index.vue
  - app/pages/estadisticas.vue
  - app/pages/historico.vue
  - app/pages/index.vue
  - e2e/offline-flow.spec.ts
  - engine/__tests__/history.test.ts
  - engine/__tests__/statistics.test.ts
  - engine/history.ts
  - engine/statistics.ts
  - engine/types.ts
findings:
  critical: 1
  warning: 7
  info: 14
  total: 22
status: issues_found
---

# Phase 09: Code Review Report (re-revisión)

**Reviewed:** 2026-09-12
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found
**Ronda:** 2ª (re-revisión tras los cierres de hueco 09-09, 09-10 y 09-11)

## Summary

**Los tres BLOCKER de la ronda anterior están genuinamente cerrados**, verificado contra el
código actual, no contra los SUMMARY:

| Hallazgo previo | Estado | Evidencia en el código actual |
|---|---|---|
| CR-01 (`players: [null]` tumba `/historico`) | ✅ **CERRADO** (doble capa) | `usePersistedSession.ts:96-102` (`isHistoryPlayerEntry`) + `:132` (`players.every(...)`) rechazan la entrada en la frontera de almacenamiento; `useGameHistory.ts:111-113` normaliza además `entry.players` antes de desreferenciarlo. 4 tests de regresión (`useGameHistory.test.ts:169-215`) + 2 (`usePersistedSession.test.ts:364-380`). |
| CR-02 (`localeCompare` sobre no-string tumba `/estadisticas`) | ✅ **CERRADO** (doble capa) | `usePersistedSession.ts:127-131` valida por tipo `villainId`/`villainName`/`difficulty`/`lossCause`/`durationMs`; `engine/statistics.ts:99,105` coerciona con `String(...)` y desaparecen `as string`/`p.heroId!`. 5 tests con ambos órdenes de inserción (`statistics.test.ts:163-219`). |
| CR-03 (leer-modificar-escribir destruye el histórico) | ✅ **CERRADO** | `readEnvelope()` (`usePersistedSession.ts:194-220`) distingue `empty`/`ok`/`unreadable`; `appendHistoryEntry` aborta con `false` (`:295`) y `removeHistoryEntry` con `return` (`:321`) ante `unreadable`, y las entradas previas se conservan **en crudo**, sin filtrar (`:297`, `:324-330`). 4 tests que comparan el blob byte a byte (`usePersistedSession.test.ts:313-362`). |
| WR-01 (estadísticas sin filas ni estado vacío) | ✅ CERRADO | `useGameHistory.ts:204` (`isEmpty` = 0 filas) + `emptyTitle`/`emptyBody` por variante. |
| WR-04 (aviso de fallo sin intento de escritura) | ✅ CERRADO | `[game]/index.vue:570-573`: `notifyHistorySaved` vive dentro de `if (session.value)`. |
| WR-06 (orden por `localeCompare`) | ✅ CERRADO | `engine/history.ts:129-135`: `Date.parse` + `NEGATIVE_INFINITY`, sort estable. |
| WR-08 (colisión de id borra dos partidas) | ✅ CERRADO | Sufijo de 10 chars (`history.ts:60`) + `removeHistoryEntry` elimina **como máximo uno** (`usePersistedSession.ts:323-330`), con test. |

Suite en verde reproducida aquí: `npx vitest run` → 26 ficheros / 665 tests.

**Lo que la ronda anterior no vio y esta sí.** El endurecimiento de 09-09 puso un validador
estricto en la **lectura** del histórico, pero **no puso ninguno en la escritura**: `record()`
puede persistir una entrada con éxito (`appendHistoryEntry` → `true` → «✓ Partida registrada»)
que `loadHistory()` rechazará para siempre, porque el predicado que escribe y el que lee no
son el mismo. Es el mismo dato irreconstruible que CR-03 protegía, perdido por la otra punta y
con una confirmación falsa encima (CR-01 nuevo).

Además, la defensa en profundidad añadida en `buildHistoryCardView` por 09-11 **se quedó a
medias respecto a su propio modelo declarado**: `engine/statistics.ts` comprueba `!== null &&
!== undefined` (líneas 98 y 124), pero `useGameHistory.ts` solo comprueba `!== null` (líneas
113 y 126) — exactamente el mismo patrón de «un módulo tiene la guarda y el gemelo la olvidó»
que produjo CR-01 en la ronda anterior (WR-01 nuevo).

Por último, el cierre de CR-03 cambió «destrucción silenciosa» por **«bloqueo permanente
silencioso con diagnóstico falso»**: ante un blob ilegible el grupo ve «no hay partidas
registradas» (mentira) y, al terminar cada partida, «el dispositivo no permitió escribir en su
almacenamiento» (falso), sin ninguna vía de recuperación en la interfaz (WR-02 nuevo).

`WR-02`, `WR-03`, `WR-05` y `WR-07` de la ronda anterior siguen abiertos tal cual (quedaron
explícitamente fuera del `<scope_boundary>` de 09-11); se renumeran aquí y se mantienen. Sin
XSS (cero `v-html`/`innerHTML`), sin `eval`, sin secretos, sin llamadas de red, sin artefactos
de depuración en los 23 ficheros.

## Critical Issues

### CR-01: el camino de escritura no valida con el mismo predicado que el de lectura — una partida puede registrarse «con éxito» y quedar invisible para siempre

**File:** `app/composables/usePersistedSession.ts:293-303` (escritura) frente a
`app/composables/usePersistedSession.ts:117-133` (lectura), con origen del dato en
`engine/history.ts:59-72` y `app/pages/[game]/index.vue:570-573`

**Issue:** `appendHistoryEntry` escribe **cualquier** objeto que le pasen y devuelve el
resultado de `writeRaw` (`true` = «el `setItem` no lanzó»), sin comprobar en ningún momento
que lo que acaba de persistir supere `isGameHistoryEntry` — el predicado que 09-09 acaba de
endurecer y que decide qué se puede volver a leer.

`buildHistoryEntry` copia tres campos **tal cual** desde el contexto de la sesión viva, sin
normalizarlos ni comprobarlos (`engine/history.ts:67-69`):

```ts
difficulty: context.difficulty,   // tipado Difficulty; en ejecución puede ser undefined
playerCount: context.playerCount, // tipado number;    en ejecución puede ser undefined
round,                            // viene de persisted.round, nunca validado como número
```

Y ese contexto llega sin validar desde `localStorage`: `isPersistedPosition`
(`usePersistedSession.ts:78-87`) solo exige que `context` **sea un objeto** — no mira
`difficulty` ni `playerCount` —, y el camino feliz de `resume()`
(`engine/persistence.ts:87-90`) restaura `context: persisted.context` **sin pasar por**
`isValidContext` (que sí se aplica, pero solo en la rama `content-changed`, línea 63). La
página adopta esa sesión sin más (`[game]/index.vue:158`).

Cadena completa, cada eslabón verificable por lectura directa:

1. `tga:progress:marvel-champions` contiene `context: {}` (blob de una build anterior, edición
   manual en DevTools, escritura interrumpida — el modelo de amenaza declarado de esta fase).
2. `resume()` devuelve `outcome: 'resumed'` con ese `context` intacto.
3. El grupo juega y pulsa «Partida terminada» → `record()` construye la entrada con
   `difficulty: undefined`, `playerCount: undefined`.
4. `JSON.stringify` **elimina las claves con valor `undefined`**, así que el blob persistido no
   tiene `difficulty` ni `playerCount`.
5. `writeRaw` devuelve `true` → `notifyHistorySaved(true)` → el grupo lee **«✓ Partida
   registrada»**.
6. En el siguiente `loadHistory()`, `isGameHistoryEntry` falla en
   `candidate.difficulty === 'normal' || candidate.difficulty === 'expert'` (línea 129) y en
   `typeof candidate.playerCount === 'number'` (línea 126) → **la entrada se descarta y no
   aparece nunca en `/historico` ni cuenta en `/estadisticas`**.
7. Y como 09-09 decidió —correctamente— no filtrar de cara al disco, la entrada muerta se
   queda ahí ocupando espacio para siempre, sin ninguna vía de la interfaz para verla ni
   borrarla.

Mismo resultado con un `round` que no sea número (línea 125) o con cualquier campo futuro que
se añada al validador de lectura y no al constructor.

Esto es pérdida silenciosa del único dato que el proyecto declara irreconstruible, **y encima
con confirmación de éxito**, que es precisamente lo que D-03 dice estar protegiendo («el grupo
tiene que enterarse si el dispositivo no dejó escribir», `usePersistedSession.ts:150-160`).
Ningún test lo cubre: los tests de `appendHistoryEntry` siempre le pasan entradas bien
formadas.

**Fix:** cerrar el círculo haciendo que la escritura se someta al mismo predicado que la
lectura — una línea, y convierte el fallo silencioso en un fallo honesto que el aviso de D-03
ya sabe pintar:

```ts
function appendHistoryEntry(entry: GameHistoryEntry): boolean {
  // El predicado que decide qué se puede LEER debe decidir también qué se
  // puede ESCRIBIR: una entrada que no vaya a superar isGameHistoryEntry no
  // es "guardada", es perdida en silencio con un ✓ encima.
  if (!isGameHistoryEntry(entry)) return false

  const read = readEnvelope()
  if (read.kind === 'unreadable') return false
  // …resto igual…
}
```

y, como segunda línea, normalizar en el motor en vez de propagar el hueco
(`engine/history.ts`), igual que ya se hace con `durationMs` (líneas 52-57):

```ts
difficulty: context.difficulty === 'expert' ? 'expert' : 'normal',
playerCount: Number.isFinite(context.playerCount) ? context.playerCount : players.length,
round: Number.isFinite(round) ? round : 1,
```

Tests a añadir: «`appendHistoryEntry` de una entrada sin `difficulty` devuelve `false` y no
escribe nada» y «una entrada construida desde un `context: {}` sobrevive a un ciclo
`record()` → `loadHistory()`».

## Warnings

### WR-01: la defensa en profundidad de `buildHistoryCardView` cubre `null` pero no `undefined` — puede pintar la cadena literal «undefined»

**File:** `app/composables/useGameHistory.ts:111-113` y `app/composables/useGameHistory.ts:126`
(contrastar con `engine/statistics.ts:98` y `engine/statistics.ts:124`)

**Issue:** el filtro que 09-11 añadió deja pasar cualquier objeto no nulo, y las dos
comprobaciones posteriores usan `!== null` a secas:

```ts
const players = (Array.isArray(entry.players) ? entry.players : [])
  .filter((player): player is HistoryPlayerEntry => player !== null && typeof player === 'object')
const hasAnyHero = players.some(player => player.heroId !== null)              // línea 113
// …
return player.heroId !== null ? `${label} · ${player.heroName ?? player.heroId}` : label  // línea 126
```

Con `players: [{}]`: `{}` supera el filtro; `undefined !== null` es **`true`**, así que
`hasAnyHero` es `true` y la línea 126 evalúa `undefined ?? undefined` → `undefined` → la
tarjeta renderiza **`"Jugador 1 · undefined"`**. Su propio modelo declarado —
`engine/statistics.ts`, citado literalmente en el comentario de las líneas 106-110 — sí
comprueba las dos cosas (`p.heroId !== null && p.heroId !== undefined`, líneas 98 y 124). Es
exactamente el patrón «un módulo tiene la guarda, el gemelo la olvidó» que generó CR-01 en la
ronda anterior, reproducido dentro del propio arreglo de CR-01.

El test que debería haberlo cazado (`useGameHistory.test.ts:180-189`, «players: [{}] no
lanza») solo afirma `not.toThrow()` y que tres campos son `string` — nunca mira
`playerLines`, así que pasa en verde con la salida rota.

Hoy la frontera de almacenamiento (09-09) impide que ese dato llegue aquí en producción, pero
esta capa está declarada por escrito como independiente de aquella («defensa en profundidad,
independiente de la validación de storage», 09-11-SUMMARY): si no lo es, no defiende nada.

**Fix:** usar el mismo predicado que el gemelo, en un solo sitio:

```ts
const hasHero = (player: HistoryPlayerEntry) => player.heroId !== null && player.heroId !== undefined
const hasAnyHero = players.some(hasHero)
// …
return hasHero(player) ? `${label} · ${player.heroName ?? player.heroId}` : label
```

y reforzar los dos tests de CR-01 para que afirmen el **contenido** de `playerLines`, no solo
que no lanzan. Aplicar el mismo criterio a `entry.villainId !== null` (línea 103), que con
`undefined` toma la rama «hay selección» en vez de la rama D-12.

---

### WR-02: un blob ilegible bloquea el registro para siempre, en silencio y con un diagnóstico falso

**File:** `app/composables/usePersistedSession.ts:293-295` y `:319-321`, superficie en
`app/components/HistorySavedNotice.vue:26-33`

**Issue:** el arreglo de CR-03 es correcto en lo esencial (no destruir lo que no se entiende),
pero deja al grupo en un callejón sin salida que nadie ve:

- `loadHistory()` devuelve `[]` ante `unreadable` (línea 274) → `/historico` pinta **«Todavía
  no hay partidas registradas»**, que es falso: el blob existe y puede tener docenas de
  partidas.
- `appendHistoryEntry` devuelve `false` en **todas** las partidas siguientes → el aviso pinta
  «⚠ No se pudo guardar la partida — **El dispositivo no permitió escribir en su
  almacenamiento (modo privado, cuota agotada u otro bloqueo similar). Revisad el modo privado
  del navegador o el espacio libre**», un diagnóstico que es falso en este caso y que manda al
  grupo a trastear ajustes del navegador que no van a arreglar nada.
- `removeHistoryEntry` no hace nada y no lo dice (devuelve `void`).
- No existe ninguna vía en la interfaz para ver, exportar o descartar ese blob.

El escenario que el propio comentario de las líneas 188-190 anticipa («tras un rollback de
versión») deja así la app permanentemente incapaz de registrar una partida, sin que nadie
pueda saber por qué. Se cambió pérdida silenciosa por inutilización silenciosa.

**Fix:** distinguir el motivo hasta la superficie, que es barato porque el aviso ya tiene dos
variantes:

```ts
export type AppendResult = 'saved' | 'storage-blocked' | 'history-unreadable'
```

con copy propia para `history-unreadable` («El histórico guardado está en un formato que esta
versión no entiende; no se ha tocado nada»), y un acceso en `/historico` —tras
`ConfirmDialog` destructivo— que permita exportar el blob en crudo y/o descartarlo a mano. Como
mínimo, no afirmar una causa que el código sabe que no es la real.

---

### WR-03: `isGameHistoryEntry` valida los números con `typeof`, así que `NaN`/`Infinity` pasan y la tarjeta pinta «Hasta la ronda NaN»

**File:** `app/composables/usePersistedSession.ts:125-126` y `:131`, consumido en
`app/composables/useGameHistory.ts:134` y `:140`

**Issue:** `typeof NaN === 'number'` es `true`. Una entrada con `round: NaN` o
`playerCount: NaN` supera el validador recién endurecido y produce en pantalla
`"Hasta la ronda NaN · —"` y `"Normal · NaN jug"`. Lo mismo con `Infinity`. El propio motor de
esta fase ya usa el criterio correcto dos ficheros más allá (`engine/history.ts:54`,
`Number.isFinite(context.startedAt)`, y `:103`, `!Number.isFinite(durationMs)`), así que el
estándar existe y está fijado dentro de la misma fase — este validador simplemente no lo
aplica.

**Fix:**

```ts
&& Number.isFinite(candidate.round)
&& Number.isFinite(candidate.playerCount)
&& (candidate.durationMs === null || Number.isFinite(candidate.durationMs))
```

(`Number.isFinite` ya implica `typeof === 'number'`, así que sustituye a las tres
comprobaciones actuales sin añadir ninguna).

---

### WR-04: `sampleCaption` declara la muestra de héroes e ignora la de villanos *(sigue abierto — era WR-02 en la ronda 1)*

**File:** `app/composables/useGameHistory.ts:196-198` (dato en `engine/statistics.ts:22-27` y
`:122-125`)

**Issue:** sin cambios respecto a la ronda anterior. `sampleCaption` es `null` cuando
`totalEntries === entriesWithHeroes`, y `StatisticsSummary` sigue sin exponer
`entriesWithVillain`. Con 10 partidas todas con héroe pero solo 3 con villano anotado, el
rótulo desaparece y la tabla «% DE VICTORIAS POR VILLANO» presenta porcentajes calculados sobre
3 partidas como si cubrieran las 10 — el efecto «que el % parezca comerse partidas» que D-12
dice evitar, resuelto solo para una de las dos tablas.

**Fix:**

```ts
// engine/statistics.ts
entriesWithVillain: validEntries.filter(e => e.villainId !== null && e.villainId !== undefined).length
// useGameHistory.ts: componer la leyenda con las dos cifras, o mover la leyenda a un pie por tabla.
```

---

### WR-05: `GameOutcomeDialog` sigue sin camino de cancelación, sin `Escape` y sin trampa de foco *(sigue abierto — era WR-03 en la ronda 1)*

**File:** `app/components/GameOutcomeDialog.vue:36-98`, disparado desde
`app/pages/[game]/index.vue:524-526`

**Issue:** verificado en el código actual: las cuatro salidas siguen llamando a `finishGame()`
(líneas 556-589 de la página), que borra el progreso y navega fuera. El diálogo es
`fixed inset-0`, no maneja `@keydown.esc`, no tiene trampa de foco, no declara
`aria-labelledby` sobre su `<h1>` y los atajos de teclado quedan desactivados mientras está
abierto. Un toque accidental en «Partida terminada» dentro del `IndexOverlay` deja al grupo sin
ninguna vía de vuelta, sobre una acción destructiva e irreversible, en una tablet apoyada en
una mesa con gente alrededor. El `ConfirmDialog` que este diálogo sustituyó sí tenía
«Cancelar».

Los comentarios de reconciliación (fichero, líneas 7-15; página, líneas 576-582) defienden la
decisión citando HIST-02 y D-01; el argumento sigue sin sostenerse: HIST-02 exige que *exista*
una salida sin registro, no que *desaparezca* la salida sin terminar, y D-01 fija las opciones
de **registro**, no prohíbe una cancelación.

**Fix:** un cierre no destructivo que no cuente como quinta «opción de resultado» (el mismo
`✕`/velo de `WarningDetailModal`/`VillainPickerModal`/`PlayerModal`), más `@keydown.esc`, con
`emit('cancel')` ≠ `dismiss` y `function onOutcomeCancel() { awaitingEndConfirm.value = false }`
en la página. Si la decisión de producto es firme, que el registro de la decisión reconozca
explícitamente que degrada una salvaguarda que existía antes de esta fase.

---

### WR-06: `HistorySavedNotice` no se anuncia a lectores de pantalla y empuja las pantallas `h-dvh` fuera del viewport *(sigue abierto — era WR-05 en la ronda 1)*

**File:** `app/components/HistorySavedNotice.vue:16-42`, montado en `app/app.vue:23-33`

**Issue:** sin cambios. (1) La banda aparece y desaparece sola (6 s / 20 s) sin `role="status"`
ni `aria-live`: es la única confirmación de que la partida quedó registrada, y para un lector
de pantalla no existe. (2) `#app-root` (`app/app.vue:13`) sigue siendo un `div` sin altura ni
`flex`, y las tres pantallas nuevas usan `h-dvh` (`historico.vue:40`, `estadisticas.vue:23`,
`GameSelectorScreen.vue:26`); al añadir la banda por encima, el alto total supera `100dvh` y al
volver a `/` tras registrar una partida los dos accesos secundarios («Histórico» /
«Estadísticas», `GameSelectorScreen.vue:68-93`) caen por debajo del pliegue. Esta banda aparece
**al final de cada partida**, no rara vez.

**Fix:**

```vue
<div v-if="variant !== null" role="status" aria-live="polite" class="…">
```

y que `app.vue` gestione la altura (`<div id="app-root" class="h-dvh flex flex-col">` con
`<NuxtPage class="flex-1 min-h-0" />`), o cambiar las pantallas de `h-dvh` a `min-h-0 flex-1`.

---

### WR-07: `formatEntryDuration` produce «1 h 0 min» y cifras negativas *(sigue abierto — era WR-07 en la ronda 1)*

**File:** `engine/history.ts:102-109`

**Issue:** verificado sin cambios. `formatEntryDuration(3_599_000)` (59 min 59 s) →
`Math.round(59.98) = 60` → `hours = 1, minutes = 0` → `"1 h 0 min"`; el formato nunca produce
«1 h» a secas y pinta un «0 min» que el contrato de copy evita en todas partes.
`formatEntryDuration(-10_000_000)` → `"-3 h -47 min"`: `Number.isFinite(-10_000_000)` es
`true`, así que la guarda de la línea 103 no lo atrapa. `buildHistoryEntry` protege el negativo
al escribir (líneas 52-57), pero la función se documenta como total («nunca 0, nunca
inventado») y con el validador actual (`typeof === 'number'`, ver WR-03) un negativo sí puede
llegar desde `localStorage`.

**Fix:**

```ts
export function formatEntryDuration(durationMs: number | null): string {
  if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) return '—'
  const totalMinutes = Math.round(durationMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}
```

## Info

### IN-01: filtrar huecos inválidos renumera a los jugadores sin nombre

**File:** `app/composables/useGameHistory.ts:111-112` y `:124-125`
**Issue:** el filtro de CR-01 compacta el array, y `resolvePlayerLabel(index, …)` usa el
índice **del array ya filtrado**. Con `players: [{…}, null, {…}]` y jugadores sin nombre, el
tercer hueco se etiqueta «Jugador 2». Además `contextLine` sigue diciendo
`${entry.playerCount} jug` mientras `playerLines` tiene menos filas. Efecto nulo hoy (la
frontera de 09-09 rechaza esas entradas antes), pero la capa se declara independiente.
**Fix:** filtrar conservando el índice original (`entry.players.map((p, i) => …)` y descartar
después) o pintar un hueco explícito.

---

### IN-02: una entrada rechazada por `isGameHistoryEntry` es invisible **y** no se puede borrar

**File:** `app/composables/usePersistedSession.ts:272-276` y `app/pages/historico.vue:63-77`
**Issue:** al filtrarse de cara a la pantalla y conservarse en disco (decisión correcta de
09-09), una entrada inválida ya no aparece en ninguna lista, así que no tiene botón «Borrar»:
queda ocupando cuota indefinidamente sin ninguna vía de la interfaz para retirarla.
**Fix:** una sección plegada «N entradas que esta versión no sabe leer» con borrado individual,
o un botón de mantenimiento en `/historico`.

---

### IN-03: import duplicado desde el mismo módulo

**File:** `engine/history.ts:11-12`
**Issue:** dos `import type … from './types'` consecutivos. Sin cambios desde la ronda 1.
**Fix:** `import type { EngineSession, GameHistoryEntry, GameOutcome, LossCause } from './types'`.

---

### IN-04: guarda muerta en `buildRows`

**File:** `engine/statistics.ts:49`
**Issue:** `if (entry === null || typeof entry !== 'object') continue` sigue siendo
inalcanzable: `aggregateStatistics` filtra exactamente eso en la línea 117 antes de llamar.
Sugiere una protección que en realidad vive en otro sitio.
**Fix:** eliminar la línea o documentar `buildRows` como receptor de entradas ya validadas.

---

### IN-05: `aggregateStatistics` tiene una precondición de orden que su firma no expresa

**File:** `engine/statistics.ts:35-41` y `:115`
**Issue:** «el nombre congelado más reciente gana» depende de que `entries` llegue ordenado, y
hoy eso solo se cumple porque `useGameHistory.reload()` ordena antes (línea 252). Cualquier
llamador futuro que pase `loadHistory()` sin ordenar congela el nombre equivocado en silencio.
**Fix:** ordenar dentro (`sortEntriesByRecency(list)`), que además la hace idempotente.

---

### IN-06: el espacio de claves de `pressedId` mezcla ids de juego con literales de navegación

**File:** `app/components/GameSelectorScreen.vue:22`, `:72`, `:84`
**Issue:** un juego con `id: 'history'` animaría también el botón «Histórico».
**Fix:** prefijar (`nav:history`, `nav:statistics`) o usar un segundo ref.

---

### IN-07: `first-letter:text-accent` no colorea el glifo

**File:** `app/components/HistorySavedNotice.vue:22` y `:27`
**Issue:** `::first-letter` no aplica a símbolos (`✓` U+2713, `⚠` U+26A0) seguidos de espacio;
el resultado depende del navegador y probablemente colorea la «P» de «Partida».
**Fix:** envolver el glifo en su propio `<span class="text-accent">`/`<span class="text-warning">`.

---

### IN-08: `MONTHS_ES` se exporta y nadie la consume fuera del módulo

**File:** `engine/history.ts:88`
**Issue:** confirmado por grep en todo el repo: el único uso es `formatEntryDate` (línea 97).
Export público sin consumidor.
**Fix:** quitar el `export`.

---

### IN-09: `describeLossCause` no distingue valores desconocidos y nadie comprueba la coherencia `result`/`lossCause`

**File:** `engine/history.ts:80-84`, usado en `app/composables/useGameHistory.ts:97`
**Issue:** mitigado a medias por 09-09 (`lossCause` ya solo admite los dos valores conocidos o
`null`), pero la combinación `result: 'won'` + `lossCause: 'heroesEliminated'` sigue superando
el validador y pinta «GANADA» junto a «Todos los héroes eliminados».
**Fix:** validar la coherencia en `isGameHistoryEntry` (`result === 'won'` ⇒ `lossCause === null`)
y forzar `causeLabel = null` cuando `entry.result === 'won'`.

---

### IN-10: el fichero e2e aborta la suite completa en tiempo de import si falta `public/audio/`

**File:** `e2e/offline-flow.spec.ts:21-28`
**Issue:** sin cambios. `readdirSync` + `throw` de nivel de módulo impiden que se ejecuten las
dos pruebas de esta fase (`/historico` y `/estadisticas` offline, líneas 137-154), que no
tienen nada que ver con el audio, en un clon sin clips generados.
**Fix:** mover el descubrimiento a `test.beforeAll` del `describe` que lo necesita, o
`test.skip(!firstAudioFile, …)` en esa prueba concreta.

---

### IN-11: cabecera duplicada literalmente entre las dos pantallas nuevas

**File:** `app/pages/historico.vue:41-59` y `app/pages/estadisticas.vue:24-42`
**Issue:** el mismo bloque de tres zonas, clases incluidas, dos veces.
**Fix:** extraer un `SectionHeader.vue` tonto con props `title`, `linkLabel`, `linkTo`.

---

### IN-12: asimetría no señalizada entre fallo de escritura al registrar y al borrar

**File:** `app/composables/usePersistedSession.ts:319-337` y `app/composables/useGameHistory.ts:255-258`
**Issue:** `appendHistoryEntry` devuelve `boolean` y se avisa; `removeHistoryEntry` devuelve
`void` y `remove()` lo ignora — y tras 09-09 hay **dos** motivos distintos de no-borrado
(storage bloqueado y blob ilegible), ambos indistinguibles de un bug para el usuario: pulsa
«Sí, borrar», la tarjeta reaparece y nadie explica nada.
**Fix:** propagar el resultado y reutilizar la variante `failure` del aviso (ver WR-02).

---

### IN-13: `useGameHistory` devuelve `entries` como ref mutable

**File:** `app/composables/useGameHistory.ts:264-272`
**Issue:** el ref se expone sin `readonly()`, así que cualquier pantalla puede escribirlo y
desincronizarlo de `localStorage`; hoy ninguna de las dos páginas lo consume.
**Fix:** devolver `readonly(entries)` o no devolverlo.

---

### IN-14: el histórico crece sin tope y sin poda

**File:** `app/composables/usePersistedSession.ts:293-303`
**Issue:** cada partida antepone una entrada y nada la retira nunca. En el límite de cuota,
`writeRaw` empieza a devolver `false` de forma permanente y el grupo solo ve el aviso genérico
de fallo de almacenamiento. Volumen real bajísimo (unos cientos de bytes por partida), pero no
hay ninguna señal antes de tocar el techo.
**Fix:** nada urgente; si acaso, avisar cuando el blob supere un umbral, o exponer un
export/purga junto al arreglo de WR-02.

---

_Reviewed: 2026-09-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Ronda: 2 (re-revisión de CR-01/CR-02/CR-03 + hallazgos nuevos)_
