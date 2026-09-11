---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-11T00:00:00Z
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
  critical: 3
  warning: 8
  info: 11
  total: 22
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-11
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Fase 9 añade el histórico (entrada, persistencia, pantalla, borrado) y las estadísticas.
La arquitectura declarada se respeta: ningún componente importa `~~/engine/*`, la lectura
del reloj real vive solo en `useGameHistory.record()`, `clear(gameId)` no toca
`tga:history` (HIST-09 verificado con test), el orden de `onOutcomeRecorded`
(`record()` → `finishGame()`) es el correcto y las rutas nuevas están enumeradas en
`nitro.prerender.routes`. No hay XSS (todo pasa por interpolación de Vue, cero `v-html`),
ni secretos, ni llamadas de red, ni `eval`. Las 641 pruebas unitarias pasan.

El problema central de la fase es **la lectura defensiva, que está a medias**. La invariante
del proyecto —«una entrada corrupta en localStorage no debe tumbar la pantalla»— se cumple
en `engine/statistics.ts` (que sí comprueba `p !== null && typeof p === 'object'`) pero
**no** en `app/composables/useGameHistory.ts`, y el validador de almacenamiento
(`isGameHistoryEntry`) solo comprueba 7 de los 12 campos de `GameHistoryEntry`. El resultado
son dos caminos concretos y demostrables de caída de pantalla completa (CR-01, CR-02).
Aparte, las dos funciones de escritura del histórico usan un patrón leer-modificar-escribir
que **destruye todo el histórico** que el lector no sepa parsear (CR-03), lo que anula de
hecho el punto de migración `formatVersion` que D-13 dice estar reservando — sobre el único
dato que el propio proyecto declara irreconstruible.

Los avisos se concentran en estados de pantalla no cubiertos (estadísticas con partidas
pero sin filas), en copy que miente (aviso de fallo de almacenamiento cuando no hubo
escritura) y en la desaparición del único camino de cancelación de una acción destructiva.

## Critical Issues

### CR-01: `buildHistoryCardView` desreferencia huecos de jugador sin guarda — una entrada corrupta tumba `/historico`

**File:** `app/composables/useGameHistory.ts:104` y `app/composables/useGameHistory.ts:115-118`
(habilitado por `app/composables/usePersistedSession.ts:96-106`)

**Issue:** `isGameHistoryEntry` acepta cualquier `players` que sea un array
(`Array.isArray(candidate.players)`), sin validar sus elementos. Una entrada con
`players: [null]` (edición manual en DevTools, formato heredado, o cualquier futuro bug de
escritura) **pasa la validación** y llega a:

```ts
const hasAnyHero = entry.players.some(player => player.heroId !== null)   // línea 104
```

`player.heroId` sobre `null` lanza `TypeError: Cannot read properties of null`. El throw
ocurre dentro de la computed `cardViews` (línea 225) durante el render, así que **no rompe
una tarjeta: rompe la pantalla `/historico` entera**, y el usuario no tiene forma de borrar
la entrada que la rompe porque el botón de borrar está dentro de la propia lista.

Lo mismo aplica a la línea 117 (`player.heroId`, `player.heroName`) en el `.map`.

Que `engine/statistics.ts:87` y `:112` sí lleven exactamente esa guarda
(`p !== null && typeof p === 'object'`) demuestra que el peligro se conocía en un módulo y
se olvidó en el otro. Ningún test cubre este caso (`useGameHistory.test.ts` solo alimenta
entradas bien formadas).

**Fix:** normalizar el array de jugadores en un solo sitio, dentro de
`buildHistoryCardView`, antes de usarlo:

```ts
// Misma guarda que engine/statistics.ts ya aplica: una entrada corrupta
// nunca puede tumbar la pantalla (lectura defensiva, D-13).
const players = (Array.isArray(entry.players) ? entry.players : [])
  .filter((p): p is HistoryPlayerEntry => p !== null && typeof p === 'object')

const hasAnyHero = players.some(player => player.heroId !== null)
// …y usar `players` (no `entry.players`) en el .map de la línea 115.
```

y endurecer además `isGameHistoryEntry` (ver CR-02), para que el dato ilegible no llegue
siquiera hasta aquí. Añadir un test con `players: [null]` y otro con `players: [{}]`.

---

### CR-02: `isGameHistoryEntry` no valida tipos de ids/nombres — `localeCompare` sobre un no-string tumba `/estadisticas`

**File:** `app/composables/usePersistedSession.ts:96-106`, explotado en
`engine/statistics.ts:81`, `engine/statistics.ts:88` y `engine/statistics.ts:93`

**Issue:** el validador no comprueba `villainId`, `villainName`, `heroId`, `heroName`,
`difficulty`, `lossCause` ni `durationMs`. Una entrada con `villainId: 5, villainName: null`
(o `heroId` numérico) supera la validación y llega a:

```ts
// engine/statistics.ts:93
return [{ id: entry.villainId, name: entry.villainName ?? entry.villainId }]   // name: number
// engine/statistics.ts:81
... || a.name.localeCompare(b.name, 'es')                                      // TypeError
```

`Number.prototype.localeCompare` no existe → `TypeError: a.name.localeCompare is not a
function` → la computed `statisticsView` lanza y **`/estadisticas` se cae entera**. Requiere
≥2 filas para que `Array.prototype.sort` invoque el comparador, condición trivial de
cumplir. El mismo camino existe para héroes vía `p.heroName ?? p.heroId!` (línea 88).

Nótese que la aserción no nula `p.heroId as string` (línea 88) y `p.heroId!` son
precisamente el punto donde el tipo se está afirmando sin comprobarlo: el dato viene de
`localStorage`, no del compilador.

**Fix:** validar por tipo en la frontera de almacenamiento, que es donde el resto del
fichero ya declara hacerlo:

```ts
function isHistoryPlayerEntry(value: unknown): value is HistoryPlayerEntry {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return (p.heroId === null || typeof p.heroId === 'string')
    && (p.heroName === null || typeof p.heroName === 'string')
    && typeof p.playerName === 'string'
}

function isGameHistoryEntry(value: unknown): value is GameHistoryEntry {
  // …comprobaciones actuales…
    && (candidate.villainId === null || typeof candidate.villainId === 'string')
    && (candidate.villainName === null || typeof candidate.villainName === 'string')
    && (candidate.difficulty === 'normal' || candidate.difficulty === 'expert')
    && (candidate.durationMs === null || typeof candidate.durationMs === 'number')
    && (candidate.players as unknown[]).every(isHistoryPlayerEntry)
}
```

Y, como defensa en profundidad, hacer `String(...)` explícito en `extractHeroIds`/
`extractVillainId` antes de meter el valor en `name`.

---

### CR-03: `appendHistoryEntry`/`removeHistoryEntry` destruyen todo histórico que el lector no sepa parsear

**File:** `app/composables/usePersistedSession.ts:227-234` y
`app/composables/usePersistedSession.ts:240-247`

**Issue:** ambas funciones hacen leer-modificar-escribir usando `loadHistory()` como base y
reescriben la clave completa:

```ts
const current = loadHistory()                        // [] si formatVersion ≠ 1, o si el JSON no parsea
const envelope = { formatVersion: 1, entries: [entry, ...current] }
return writeRaw(HISTORY_KEY, JSON.stringify(envelope))   // sobrescribe TODO
```

`loadHistory()` devuelve `[]` en tres situaciones distintas que **no son «no hay histórico»**:
JSON no parseable (línea 214), `formatVersion` distinto de 1 (línea 210) y envoltorio sin
`entries` array (línea 211). Además descarta entrada a entrada todo lo que no pase
`isGameHistoryEntry` (línea 212). En cualquiera de esos casos, el primer registro de partida
posterior (o el primer borrado) **sustituye el blob entero por una sola entrada**: pérdida
total y silenciosa.

Esto contradice de forma directa dos cosas que el propio fichero afirma: (a) el comentario
de la línea 50-53 dice que `formatVersion` es «el punto de migración futuro» — con este
código, un despliegue que escriba v2 y un *rollback* posterior a esta versión borran todo el
histórico del grupo en la siguiente partida; y (b) el comentario de la línea 202-203 promete
«tres entradas con una rota devuelven las dos buenas», cierto al leer pero falso al
persistir: la entrada rota desaparece para siempre en la siguiente escritura.

Es el único dato de la app que el proyecto declara irreconstruible, así que la pérdida no
tiene recuperación posible.

**Fix:** no reescribir nunca un blob que no se ha podido interpretar. Separar «leer el
envoltorio en crudo» de «leer las entradas válidas», y abortar la escritura (devolviendo
`false`) cuando el blob existente no es un envoltorio v1 legible:

```ts
type EnvelopeRead =
  | { kind: 'empty' }                              // sin clave: se puede crear
  | { kind: 'ok', entries: unknown[] }             // v1 legible
  | { kind: 'unreadable' }                         // JSON roto o formatVersion desconocido

function readEnvelope(): EnvelopeRead { /* … */ }

function appendHistoryEntry(entry: GameHistoryEntry): boolean {
  const read = readEnvelope()
  if (read.kind === 'unreadable') return false     // nunca machacar lo que no entendemos
  const entries = read.kind === 'ok' ? read.entries : []
  return writeRaw(HISTORY_KEY, JSON.stringify({ formatVersion: 1, entries: [entry, ...entries] }))
}
```

Conservar además las entradas que no pasan `isGameHistoryEntry` al reescribir (filtrarlas
solo de cara a la pantalla, no de cara al disco). Tests a añadir: «con
`formatVersion: 2` guardado, `appendHistoryEntry` devuelve `false` y el blob v2 sigue
intacto» y «una entrada ilegible sobrevive a un `removeHistoryEntry` de otra entrada».

## Warnings

### WR-01: `/estadisticas` tiene un estado sin definir: hay partidas pero ninguna fila

**File:** `app/pages/estadisticas.vue:46-87` y `app/composables/useGameHistory.ts:180-191`

**Issue:** `isEmpty` es `summary.totalEntries === 0`. Si el grupo registra partidas sin
elegir héroe ni villano (SEL-09/D-12 lo permite de principio a fin y `buildHistoryCardView`
tiene rama propia para ello), `isEmpty` es `false`, `heroRows` y `villainRows` están vacíos y
los dos `v-if="…length > 0"` fallan. La pantalla queda con la cabecera y una sola línea
pequeña («3 partidas registradas · 0 con héroes anotados»), sin encabezado, sin tablas y sin
estado vacío: un callejón sin salida que parece una pantalla rota.

**Fix:** que `isEmpty` signifique «no hay nada que enseñar»:

```ts
isEmpty: summary.heroRows.length === 0 && summary.villainRows.length === 0,
```

y ajustar el texto del estado vacío para que cubra también «hay partidas, pero ninguna con
héroe o villano anotado» (o añadir una tercera variante de copy para ese caso).

---

### WR-02: `sampleCaption` declara la muestra de héroes pero ignora la de villanos

**File:** `app/composables/useGameHistory.ts:181-183` (dato en `engine/statistics.ts:110-113`)

**Issue:** `sampleCaption` es `null` cuando `totalEntries === entriesWithHeroes`. Con 10
partidas todas con héroes pero solo 3 con villano anotado, el rótulo no aparece y la tabla
«% DE VICTORIAS POR VILLANO» presenta porcentajes calculados sobre 3 partidas como si
cubriesen las 10 — exactamente el efecto de «que el % parezca comerse partidas» que D-12
dice estar evitando, resuelto solo para la mitad de las tablas.

**Fix:** exponer también `entriesWithVillain` en `StatisticsSummary` y componer la leyenda
con las dos cifras, o mover la leyenda a un pie por tabla:

```ts
entriesWithVillain: validEntries.filter(e => e.villainId !== null && e.villainId !== undefined).length
// …caption: `${total} partidas registradas · ${conHeroes} con héroes · ${conVillano} con villano`
```

---

### WR-03: `GameOutcomeDialog` elimina el único camino de cancelación de una acción destructiva e irreversible

**File:** `app/components/GameOutcomeDialog.vue:36-99`, disparado desde
`app/pages/[game]/index.vue:524-526`

**Issue:** las cuatro opciones del diálogo terminan la partida; ninguna vuelve al juego. El
diálogo es `fixed inset-0` (tapa todo), no maneja `Escape`, no tiene trampa de foco y los
atajos de teclado quedan desactivados mientras está abierto
(`awaitingEndConfirm` en `shortcutsEnabled`). Consecuencia: **un toque accidental en
«Partida terminada» dentro del `IndexOverlay` deja al grupo sin ninguna vía de vuelta**;
cualquiera de las cuatro salidas ejecuta `finishGame()`, que borra el progreso guardado
(`clear(gameId)`) y navega fuera. El `ConfirmDialog` anterior sí tenía «Cancelar».

Los comentarios de reconciliación (fichero, líneas 7-15; página, líneas 569-580) defienden la
decisión citando HIST-02 («siempre se pueda cerrar la partida sin registrar nada») y D-01
(«exactamente cuatro opciones»). Pero HIST-02 exige que *exista* una salida sin registro, no
que *desaparezca* la salida sin terminar; y D-01 fija las opciones de registro, no prohíbe un
camino de cancelación. Una acción destructiva sin vuelta atrás, tras un solo toque, en una
tablet apoyada en una mesa con gente alrededor, es un riesgo real de pérdida de partida.

**Fix:** añadir un cierre no destructivo que no cuente como quinta «opción de resultado»
(el mismo `✕`/velo que ya usan `WarningDetailModal`, `VillainPickerModal` y `PlayerModal`),
más `@keydown.esc`, y emitir `cancel` (≠ `dismiss`):

```vue
<button type="button" class="…" aria-label="Cerrar" @click="emit('cancel')">✕</button>
```

con `function onOutcomeCancel() { awaitingEndConfirm.value = false }` en la página. Si la
decisión de producto es firme en mantener las cuatro salidas, hace falta al menos que el
registro de esa decisión reconozca el riesgo en el propio `09-SUMMARY`, porque el código tal
como está degrada una salvaguarda que existía antes de esta fase.

---

### WR-04: el aviso de fallo de almacenamiento se muestra cuando no hubo ningún fallo

**File:** `app/pages/[game]/index.vue:564-565`

**Issue:**

```ts
const guardado = session.value ? record(session.value, outcome) : false
notifyHistorySaved(guardado)
```

Cuando `session.value` es `null`, `record()` ni siquiera se llama, pero se pinta el aviso
«⚠ No se pudo guardar la partida — El dispositivo no permitió escribir en su almacenamiento
(modo privado, cuota agotada…)», que afirma un diagnóstico falso e induce al grupo a tocar
ajustes del navegador sin motivo. El booleano de `appendHistoryEntry` está pensado para
distinguir «escribí» de «no me dejaron escribir», no para cubrir «no había nada que
escribir».

**Fix:** no notificar cuando no hay sesión (o notificar una variante distinta):

```ts
if (!session.value) { finishGame(); return }
notifyHistorySaved(record(session.value, outcome))
finishGame()
```

---

### WR-05: `HistorySavedNotice` no se anuncia a lectores de pantalla y empuja la pantalla `h-dvh` fuera del viewport

**File:** `app/components/HistorySavedNotice.vue:17-43`, montado en `app/app.vue:23-33`

**Issue:** dos defectos en la misma superficie:

1. La banda aparece y desaparece sola (6 s / 20 s) sin `role="status"` ni `aria-live`: es la
   única confirmación de que la partida quedó registrada, y para un usuario con lector de
   pantalla no existe. Además, el estado de éxito se distingue del de fallo únicamente por un
   glifo (`✓`/`⚠`) y un color — no hay texto que diferencie por sí solo.
2. `#app-root` (`app/app.vue:13`) es un bloque sin altura fija y todas las páginas usan
   `h-dvh`. Al añadir la banda por encima, el alto total pasa de `100dvh`, así que al volver
   a `/` tras registrar una partida el selector queda desplazado y sus dos accesos
   secundarios («Histórico» / «Estadísticas», `GameSelectorScreen.vue:68-93`) caen por debajo
   del pliegue. `UpdateBanner` tiene el mismo problema, pero aparece rara vez; esta banda
   aparece **al final de cada partida**.

**Fix:**

```vue
<div v-if="variant !== null" role="status" aria-live="polite" class="…">
```

y hacer que el contenedor de `app.vue` gestione la altura, p. ej.
`<div id="app-root" class="h-dvh flex flex-col">` con `<NuxtPage class="flex-1 min-h-0" />`,
o cambiar las pantallas de `h-dvh` a `min-h-0 flex-1`.

---

### WR-06: el orden «de la más reciente a la más antigua» depende de `localeCompare` y de un `recordedAt` nunca validado como fecha

**File:** `engine/history.ts:115-117` (dato admitido en
`app/composables/usePersistedSession.ts:104`)

**Issue:** `b.recordedAt.localeCompare(a.recordedAt)` usa la colación del locale del host
para comparar marcas de tiempo, cuando lo que se quiere es un orden cronológico. Sobre
cadenas ISO bien formadas suele coincidir, pero: (a) el orden pasa a depender del ICU del
dispositivo, y (b) `isGameHistoryEntry` solo exige `typeof recordedAt === 'string'`, así que
una entrada con `recordedAt: "ayer"` se ordena en una posición arbitraria. HIST-07 se vende
como «garantía mecánica»; con esta comparación no lo es. El orden además no es solo cosmético:
`engine/statistics.ts:35-41` documenta que **el nombre congelado ganador depende de que el
primer elemento sea el más reciente**.

**Fix:** comparar por instante, con las no-fechas al final y de forma estable:

```ts
export function sortEntriesByRecency(entries: GameHistoryEntry[]): GameHistoryEntry[] {
  const at = (e: GameHistoryEntry) => {
    const t = Date.parse(e.recordedAt)
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
  }
  return [...entries].sort((a, b) => at(b) - at(a))
}
```

y validar `!Number.isNaN(Date.parse(candidate.recordedAt))` en `isGameHistoryEntry`.

---

### WR-07: `formatEntryDuration` produce «1 h 0 min» y cifras negativas con datos fuera de rango

**File:** `engine/history.ts:102-109`

**Issue:** dos casos sin cubrir:

- `formatEntryDuration(3_599_000)` (59 min 59 s) → `Math.round` da 60 min → `"1 h 0 min"`.
  El formato nunca produce «1 h» a secas, y la pantalla enseña un «0 min» que el propio
  contrato de copy evita en todas partes.
- Un `durationMs` negativo (posible: el campo no se valida al leer, CR-02) da
  `"-2 h -40 min"`. `buildHistoryEntry` protege el negativo al escribir, pero la función de
  formateo se documenta como total («nunca 0, nunca inventado») y no lo es.

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

---

### WR-08: el `id` de la entrada se genera con `Math.random()` y una colisión borra varias partidas a la vez

**File:** `engine/history.ts:60` (consumido en
`app/composables/usePersistedSession.ts:244`)

**Issue:** `` `${now}-${Math.random().toString(36).slice(2, 8)}` ``. El sufijo no tiene
longitud fija (`Math.random()` puede devolver una representación corta; en el caso límite
`0` el sufijo queda vacío y el id es `"1757…-"`), no hay ninguna comprobación de unicidad al
insertar, y `removeHistoryEntry` borra **por igualdad de id**:
`current.filter(e => e.id !== id)`. Dos entradas con el mismo id (mismo milisegundo + mismo
sufijo) desaparecen juntas al borrar una sola tarjeta, sobre el dato irreconstruible de la app.

**Fix:** usar un identificador con garantía de unicidad y longitud, inyectado por el llamador
igual que el reloj (para mantener `engine/` puro y testeable):

```ts
// llamador (useGameHistory.record):
const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).padStart(8, '0').slice(-8)}`
buildHistoryEntry(session, outcome, Date.now(), names, id)
```

Como mínimo, `padStart` para fijar la longitud del sufijo y dedupe defensivo en
`appendHistoryEntry`.

## Info

### IN-01: import duplicado desde el mismo módulo

**File:** `engine/history.ts:11-12`
**Issue:** dos `import type … from './types'` consecutivos.
**Fix:** fusionarlos en `import type { EngineSession, GameHistoryEntry, GameOutcome, LossCause } from './types'`.

---

### IN-02: guarda muerta en `buildRows`

**File:** `engine/statistics.ts:49`
**Issue:** `if (entry === null || typeof entry !== 'object') continue` no puede darse:
`aggregateStatistics` ya filtra exactamente eso en la línea 105 antes de llamar. Código
inalcanzable que sugiere una protección que en realidad vive en otro sitio.
**Fix:** eliminar la línea 49 y dejar el filtro único de `aggregateStatistics`, o tipar
`buildRows` como receptor de entradas ya validadas.

---

### IN-03: `aggregateStatistics` tiene una precondición de orden que la firma no expresa

**File:** `engine/statistics.ts:35-41` y `engine/statistics.ts:103`
**Issue:** la corrección del «nombre congelado más reciente gana» depende de que `entries`
llegue ordenado de más reciente a más antigua. Una función declarada pura y con un único
parámetro no puede comunicar esa precondición, y hoy solo se cumple porque
`useGameHistory.reload()` ordena antes (línea 217). Cualquier llamador futuro que pase
`loadHistory()` sin ordenar congela el nombre equivocado, en silencio.
**Fix:** ordenar dentro de `aggregateStatistics` (`sortEntriesByRecency(list)`), que además la
hace idempotente respecto al orden de entrada.

---

### IN-04: el espacio de claves de `pressedId` mezcla ids de juego con literales de navegación

**File:** `app/components/GameSelectorScreen.vue:22`, `:72`, `:84`
**Issue:** `pressedId` usa el `game.id` para las tarjetas y los literales `'history'` /
`'statistics'` para los accesos secundarios. Un juego con `id: 'history'` haría que pulsar la
tarjeta animase también el botón «Histórico».
**Fix:** prefijar (`nav:history`, `nav:statistics`) o usar un segundo ref para los accesos.

---

### IN-05: `first-letter:text-accent` no colorea el glifo como se pretende

**File:** `app/components/HistorySavedNotice.vue:22` y `:27`
**Issue:** `::first-letter` solo arrastra puntuación (categorías Ps/Pe/Pi/Pf/Po) anterior a la
primera letra; `✓` (U+2713) y `⚠` (U+26A0) son símbolos y además van seguidos de un espacio,
así que el resultado depende del navegador y probablemente colorea la «P» de «Partida» en vez
del glifo.
**Fix:** envolver el glifo en su propio `<span class="text-accent">` / `<span class="text-warning">`.

---

### IN-06: `MONTHS_ES` se exporta y nadie la consume fuera del módulo

**File:** `engine/history.ts:88`
**Issue:** export público sin ningún consumidor (ni siquiera los tests). Amplía la superficie
de API del motor sin motivo.
**Fix:** quitar el `export` (seguiría usándose en `formatEntryDate`).

---

### IN-07: `describeLossCause` no distingue valores desconocidos y nadie comprueba la coherencia `result`/`lossCause`

**File:** `engine/history.ts:80-84`, usado en `app/composables/useGameHistory.ts:96`
**Issue:** la función es un ternario binario: cualquier valor distinto de
`'mainSchemeCompleted'` se etiqueta «Todos los héroes eliminados». Combinado con CR-02
(`lossCause` no se valida al leer), una entrada con `result: 'won'` y un `lossCause` residual
se pinta como «GANADA» + «Todos los héroes eliminados» a la vez.
**Fix:** `switch` exhaustivo con `default` que devuelva `null`, y que
`buildHistoryCardView` fuerce `causeLabel = null` cuando `entry.result === 'won'`.

---

### IN-08: el fichero e2e aborta la suite completa en tiempo de import si falta `public/audio/`

**File:** `e2e/offline-flow.spec.ts:21-28`
**Issue:** `readdirSync` y el `throw` de nivel de módulo se ejecutan al cargar el fichero, de
modo que las dos pruebas nuevas de esta fase (`/historico` y `/estadisticas` offline, líneas
137-154), que no tienen nada que ver con el audio, no llegan a ejecutarse en un clon sin
clips generados. Precede a esta fase, pero las pruebas nuevas heredan el acoplamiento.
**Fix:** mover el descubrimiento del clip a `test.beforeAll` del `describe` que lo necesita, o
usar `test.skip(!firstAudioFile, …)` en esa prueba concreta.

---

### IN-09: cabecera duplicada literalmente entre las dos pantallas nuevas

**File:** `app/pages/historico.vue:41-59` y `app/pages/estadisticas.vue:24-42`
**Issue:** el mismo bloque de cabecera de tres zonas (clases incluidas) aparece dos veces, con
el título y el enlace cruzado como únicas diferencias. Dos copias que hay que mantener
sincronizadas.
**Fix:** extraer un `SectionHeader.vue` tonto con props `title`, `linkLabel`, `linkTo`.

---

### IN-10: asimetría no señalizada al usuario entre fallo de escritura al registrar y al borrar

**File:** `app/composables/usePersistedSession.ts:240-247` y `app/composables/useGameHistory.ts:220-223`
**Issue:** `appendHistoryEntry` devuelve `boolean` y se avisa; `removeHistoryEntry` devuelve
`void` y `remove()` lo ignora. En modo privado o con la cuota llena, el usuario pulsa «Sí,
borrar», la tarjeta reaparece tras el `reload()` y no recibe ninguna explicación —
indistinguible de un bug. Está documentado como deliberado («estado observable y
recuperable»), pero el usuario no puede observar *el motivo*.
**Fix:** propagar el booleano y reutilizar la variante `failure` del aviso ya existente.

---

### IN-11: `useGameHistory` devuelve `entries` como ref mutable

**File:** `app/composables/useGameHistory.ts:229-237`
**Issue:** el ref de entradas se expone sin `readonly()`, así que cualquier pantalla puede
escribir en él y desincronizarlo de `localStorage`; hoy `historico.vue` solo consume
`cardViews`/`isEmpty`, así que la exposición no aporta nada.
**Fix:** devolver `readonly(entries)` o no devolverlo.

---

_Reviewed: 2026-09-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
