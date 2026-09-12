---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-13T00:58:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - app/app.vue
  - app/components/GameOutcomeDialog.vue
  - app/components/GameSelectorScreen.vue
  - app/components/HistoryEntryCard.vue
  - app/components/HistorySavedNotice.vue
  - app/composables/__tests__/useGameContent.test.ts
  - app/composables/__tests__/useGameHistory.test.ts
  - app/composables/__tests__/useGameSession.test.ts
  - app/composables/__tests__/useHeroSearch.test.ts
  - app/composables/__tests__/useHistorySavedNotice.test.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - app/composables/useCharacterCatalogue.ts
  - app/composables/useGameContent.ts
  - app/composables/useGameHistory.ts
  - app/composables/useGameSession.ts
  - app/composables/useHeroSearch.ts
  - app/composables/useHistorySavedNotice.ts
  - app/composables/usePersistedSession.ts
  - app/pages/[game]/index.vue
  - app/pages/estadisticas.vue
  - app/pages/historico.vue
  - app/pages/index.vue
  - e2e/offline-flow.spec.ts
  - engine/__tests__/history.test.ts
  - engine/__tests__/persistence.test.ts
  - engine/__tests__/statistics.test.ts
  - engine/history.ts
  - engine/persistence.ts
  - engine/statistics.ts
  - engine/types.ts
findings:
  critical: 1
  warning: 7
  info: 6
  total: 14
status: issues_found
---

# Fase 9: Informe de revisión de código (ronda 4)

**Revisado:** 2026-09-13T00:58:00Z
**Profundidad:** standard
**Ficheros revisados:** 30
**Estado:** issues_found

## Summary

Los cierres de 09-13..09-17 hacen lo que dicen que hacen: `readRaw` discrimina las tres vías,
`readEnvelope`/`appendHistoryEntry`/`removeHistoryEntry` ya no machacan un blob ilegible,
`resolveFrozenNames`/`resolveFrozenHeroName`/`buildTakenByMap`/`buildDuplicateWarningText`/
`resolveHeroSpanishName` están a salvo de la cadena de prototipos, `resume()` degrada a
`'fresh'`, y `finishGame(preserveProgress)` ya no borra lo que no se pudo guardar. Los 785
tests pasan (`npx vitest run`, 27 ficheros).

El valor de esta ronda está exactamente donde el encargo lo situaba: **en lo que el barrido de
`09-AUDIT-FRONTERAS.md` no recorrió**. Ese barrido declara su perímetro en la línea 20-22
(«los tres ficheros nombrados por el encargo, más `useHeroSearch.ts`, `engine/statistics.ts` y
`engine/selection.ts`») y excluye explícitamente los `.vue` (§5). Los hallazgos de abajo viven
en tres huecos de ese perímetro:

1. **La frontera que el barrido no nombró: el aviso al usuario.** El único resultado observable
   del gesto «terminar partida» es `HistorySavedNotice`, y su copy —reescrita en 09-16 para
   dejar de afirmar una causa no comprobada— afirma ahora un HECHO no comprobado sobre los
   datos del grupo («sigue guardada en el dispositivo»), que es **falso justo en los dos modos
   de fallo que la propia frase enumera**. Es literalmente la pregunta Q3 del barrido («¿puede
   este valor afirmar algo que no ha ocurrido?») aplicada a la capa que el barrido no miró.
   → CR-01.

2. **Predicados que dicen replicar a su productor y no lo hacen.** Los comentarios BF-01/BF-02
   afirman usar «el MISMO predicado» / «los mismos valores de repliegue» que
   `engine/statistics.ts` y `buildHistoryEntry`. Comprobado con código ejecutado: no es cierto
   en tres ejes distintos (finitud vs entero, `typeof string` vs cadena no vacía, `typeof
   string` vs «no nulo»). Consecuencia verificada: `round: 0`, `round: -5`, `playerCount: 2.5`,
   `heroId: ''` y `villainId: ''` **atraviesan la frontera de ESCRITURA (`appendHistoryEntry`
   devuelve `true`) y la de LECTURA (`loadHistory` los devuelve)** y se pintan como «Hasta la
   ronda -5», «2.5 jug», «Ana · » y «contra ». → WR-01, WR-02, WR-03.

3. **El único parámetro sin guarda de todo `engine/history.ts`.** El barrido contestó Q1 para
   `buildHistoryEntry` con «no aplica: función pura» y solo auditó los campos de `context` y de
   `FrozenNames`. Nadie preguntó por `now`. `new Date(now).toISOString()` **lanza**
   `RangeError` con `NaN`/`Infinity`/fuera de rango, rompiendo la promesa de cabecera «nunca
   lanza» — el mismo perfil de alcanzabilidad que BF-04, que este mismo barrido sí cerró.
   → WR-04.

No se ha encontrado ninguna vulnerabilidad de seguridad: no hay `v-html`, `eval`, `innerHTML`,
interpolación en `navigateTo` con dato de usuario, ni credenciales. Tampoco artefactos de
depuración (`console.*`, `debugger`, `TODO`/`FIXME`) en ninguno de los 30 ficheros.

**Método de verificación de los hallazgos:** cada afirmación numérica de este informe está
ejecutada contra el código real, no deducida. Se usó un proyecto Vitest desechable fuera del
repo (alias `~`/`~~` apuntando a la raíz) que importa `buildHistoryCardView`,
`aggregateStatistics`, `buildStatisticsView`, `usePersistedSession` y `buildHistoryEntry` sin
tocar ni un fichero del repositorio. Las salidas literales se citan en cada hallazgo.

---

## Narrative Findings (AI reviewer)

### Critical Issues (BLOCKER)

#### CR-01: el aviso de fallo afirma que la partida «sigue guardada en el dispositivo» sin haberlo comprobado — y es falso precisamente en los dos modos de fallo que la propia frase nombra

**Ficheros:**
- `app/components/HistorySavedNotice.vue:55-57` (la afirmación)
- `app/pages/[game]/index.vue:576-597` (`onOutcomeRecorded`) y `:543-560` (`finishGame`)
- `app/composables/usePersistedSession.ts:281-284` (`save`, que descarta el booleano de `writeRaw`)

**Issue:**
El texto que se pinta cuando `record()` devuelve `false` es:

> «La partida no se ha perdido: **sigue guardada en el dispositivo**. Volved a entrar en la
> partida y pulsad «Partida terminada» otra vez para reintentar el registro. Si vuelve a fallar,
> puede deberse al **modo privado del navegador**, a la **memoria llena**, o a un histórico
> anterior que la app no consigue leer.»

La primera frase es una afirmación de hecho sobre los datos del grupo. Nada la comprueba.
El único mecanismo que la sostendría es `finishGame(true)` (09-16), que se limita a **no
borrar** `tga:progress:<gameId>` — no verifica que esa clave exista ni que su contenido
corresponda a la partida que se acaba de intentar registrar. Y el progreso se escribe por
`save()`, que **ignora a propósito el booleano de `writeRaw`** (`usePersistedSession.ts:281-284`,
justificado por VOZ-06/D-51). Es decir: el fallo de escritura del progreso es silencioso por
diseño, así que la app no sabe —y no puede saber con el código actual— si hay algo guardado.

Recorrido de los tres motivos que la propia copy enumera:

| Motivo del `false` | ¿`writeRaw` del histórico falla? | ¿`writeRaw` del progreso falla también? | ¿«sigue guardada en el dispositivo»? |
|---|---|---|---|
| Modo privado (`setItem` lanza) | sí | **sí — todas las llamadas a `save()` de toda la partida fallaron en silencio** | **FALSO** |
| Memoria llena / cuota | sí | **sí (misma cuota, mismo origen)** | **FALSO** |
| Histórico previo ilegible (`readEnvelope() === 'unreadable'`) | no se intenta escribir | no | cierto |

En los dos primeros casos —los dos que el usuario va a reconocer como «lo mío»— la partida se
ha perdido entera: `tga:progress:<gameId>` nunca llegó a escribirse, `session.value = null`
descarta además la escritura pendiente del `watchDebounced`, y `navigateTo('/')` desmonta la
página. El grupo lee «no se ha perdido», vuelve al juego, y se encuentra el **mini-setup**
(no «Partida guardada · CONTINUAR»), con la partida y su registro irrecuperables. La
instrucción «pulsad «Partida terminada» otra vez» es, en ese estado, imposible de seguir.

Esto es exactamente el defecto de la familia que lleva tres rondas reabriendo la fase, en la
frontera que el barrido excluyó: 09-16 cerró la mitad correcta del problema (dejar de atribuir
una causa técnica no comprobada) y la sustituyó por una **afirmación de estado igual de no
comprobada**, esta vez sobre los datos y no sobre la causa.

**Fix:**
Comprobar antes de afirmar. `save()` ya tiene el booleano a mano; solo hay que dejar de tirarlo
**para este llamador** (el criterio de VOZ-06/D-51 sigue valiendo para `next()`/`prev()`, que
siguen sin mirarlo):

```ts
// app/composables/usePersistedSession.ts
// D-03 / CR-01 (ronda 4): mismo criterio que appendHistoryEntry — quien necesita
// AFIRMAR algo sobre el dato guardado tiene que poder comprobarlo. next()/prev()
// siguen ignorando el retorno (VOZ-06/D-51): la firma cambia, su uso no.
function save(session: EngineSession): boolean {
  const persisted = toPersistedPosition(session)
  return writeRaw(storageKey(session.gameId), JSON.stringify(persisted))
}
```

```ts
// app/pages/[game]/index.vue — onOutcomeRecorded
if (session.value) {
  const guardado = record(session.value, outcome)
  // Si el registro falló, el progreso es lo ÚNICO que permite reintentarlo:
  // se reescribe AQUÍ, síncronamente, y se comprueba. Nunca se afirma que la
  // partida sobrevive sin haber confirmado esta escritura.
  const progresoAsegurado = guardado ? false : save(session.value)
  notifyHistorySaved(guardado, progresoAsegurado)
  finishGame(!guardado && progresoAsegurado)
}
else {
  finishGame()
}
```

```ts
// app/composables/useHistorySavedNotice.ts
type NoticeVariant = 'success' | 'failure-recoverable' | 'failure-lost'

export function notifyHistorySaved(saved: boolean, progressSecured = false): void {
  clearPendingTimeout()
  const nextVariant: NoticeVariant = saved
    ? 'success'
    : (progressSecured ? 'failure-recoverable' : 'failure-lost')
  // …resto igual
}
```

Y dos textos distintos en `HistorySavedNotice.vue`: el actual solo para
`failure-recoverable`, y para `failure-lost` uno que no afirme nada que no se haya comprobado
(p. ej. «No se ha podido guardar nada en este dispositivo. Es posible que el navegador esté en
modo privado o sin espacio; anotad el resultado a mano si queréis conservarlo»).

Si por alcance se prefiere no ampliar la superficie de la interfaz, la corrección **mínima** y
no negociable es retirar la primera frase: la app no puede afirmar un hecho sobre los datos del
grupo que no ha comprobado. Eso es lo que arreglaron las tres rondas anteriores en el motor.

---

### Warnings

#### WR-01: `round`/`playerCount` se validan por FINITUD en las dos fronteras y por ENTERO EN RANGO solo en el productor — «Hasta la ronda -5» y «2.5 jug» se escriben, se leen y se pintan

**Ficheros:**
- `app/composables/usePersistedSession.ts:139-140` (`isGameHistoryEntry`)
- `app/composables/useGameHistory.ts:162-163` (`safePlayerCount`/`safeRound`, cierre BF-02)
- Productor de referencia: `engine/history.ts:100-107` (`Number.isInteger(...) && > 0` / `>= 1`)

**Issue:**
El comentario de BF-02 (`useGameHistory.ts:156-161`) dice textualmente: «en caso contrario, el
mismo repliegue que `buildHistoryEntry` ya aplica en origen (09-12): `players.length` y `1`
respectivamente». El repliegue es el mismo; **el predicado que decide cuándo replegar, no**:

| | productor (`buildHistoryEntry`) | frontera de almacenamiento (`isGameHistoryEntry`) | frontera de vista (`buildHistoryCardView`) |
|---|---|---|---|
| `round` | `Number.isInteger(r) && r >= 1` | `Number.isFinite(r)` | `Number.isFinite(r)` |
| `playerCount` | `Number.isInteger(p) && p > 0` | `Number.isFinite(p)` | `Number.isFinite(p)` |

`Number.isFinite` acepta `0`, los negativos y los no enteros. Ejecutado contra el código actual
(`appendHistoryEntry` con un `window.localStorage` de mentira, y después `loadHistory`):

```
append:round0   true      → loadHistory() lo devuelve
append:roundNeg true      → loadHistory() lo devuelve
append:pc2.5    true      → loadHistory() lo devuelve
```

y `buildHistoryCardView` sobre esas mismas entradas produce:

```
A1 "Hasta la ronda 0 · 1 h 40 min" | "Kang · Normal · 2.5 jug"
A2 "Hasta la ronda -5 · 1 h 40 min"
```

Nótese que `appendHistoryEntry` **devuelve `true`**: la guarda cuyo comentario declara
(`usePersistedSession.ts:341-350`) que su valor es «impedir que un llamador futuro (un respaldo
remoto, un import) reintroduzca el hueco por otra puerta» deja pasar exactamente eso. Es el
mismo defecto que BF-03 cerró para `durationMs` (negativos → «—») aplicado a los dos campos
hermanos, que se quedaron sin tocar: `durationMs: -1000` también sigue superando
`isGameHistoryEntry` (`append:durNeg true`), aunque `formatEntryDuration` ya lo degrada a «—»
después.

**Fix:** un solo predicado, el del productor, en las tres capas.

```ts
// app/composables/usePersistedSession.ts — isGameHistoryEntry
&& Number.isInteger(candidate.round) && (candidate.round as number) >= 1
&& Number.isInteger(candidate.playerCount) && (candidate.playerCount as number) > 0
&& (candidate.durationMs === null
  || (Number.isFinite(candidate.durationMs) && (candidate.durationMs as number) >= 0))
```

```ts
// app/composables/useGameHistory.ts — buildHistoryCardView
const safePlayerCount = Number.isInteger(entry.playerCount) && entry.playerCount > 0
  ? entry.playerCount
  : players.length
const safeRound = Number.isInteger(entry.round) && entry.round >= 1 ? entry.round : 1
```

#### WR-02: la cadena vacía atraviesa las dos fronteras — «Ana · », « · Normal · 3 jug», «contra » y una fila de estadísticas sin nombre

**Ficheros:**
- `app/composables/usePersistedSession.ts:105-107` (`isHistoryPlayerEntry`) y `:141-142` (`villainId`/`villainName`)
- `app/composables/useGameHistory.ts:120-123`, `:143-150`, `:169`, `:172`, `:188`
- `engine/statistics.ts:98-99` y `:104-106`
- Productores de referencia: `engine/selection.ts:63` y `:78` (`typeof === 'string' && length > 0`)

**Issue:**
Los tres módulos aceptan un `heroId`/`villainId` con `typeof === 'string'`. `resolvePlayerSlots`
y `resolveVillainId` —los productores cuyo criterio el código dice replicar— exigen además
`length > 0`. La cadena vacía es, por tanto, un valor que **ningún camino de la app puede
producir pero las dos fronteras aceptan**, y `??` no la atrapa porque `''` no es nullish.

Ejecutado (ambas entradas devuelven `true` en `appendHistoryEntry` y salen de `loadHistory`):

```
B1 ["Ana · "] | null | "Sin villano · Normal · 3 jug"          ← heroId: ''
B2 heroRows:[{"id":"","name":"","wins":1,"played":1,"pct":100}], entriesWithHeroes:1
C1 " · Normal · 3 jug"
   | "Borrar partida del 12 sep 2026 contra "
   | "Ganada del 12 sep 2026 contra . Esta acción no se puede deshacer."   ← villainId: ''
```

Tres superficies rotas a la vez: la tarjeta del histórico con un separador colgando, el
`aria-label` del botón de borrar y el cuerpo del `ConfirmDialog` (el texto que el grupo lee
justo antes de una acción irreversible, D-20) terminando en «contra », y una fila de
`/estadisticas` con nombre vacío que el `<span class="truncate">` pinta como un hueco mudo con
un «1 de 1 · 100 %» al lado.

**Fix:** exigir cadena NO VACÍA en las tres capas, y no confiar en `??` para elegir el
respaldo.

```ts
// usePersistedSession.ts — isHistoryPlayerEntry / isGameHistoryEntry
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0
// heroId / heroName / villainId / villainName: `null` o `isNonEmptyString(...)`
```

```ts
// useGameHistory.ts — buildHistoryCardView
const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const hasVillain = isNonEmpty(entry.villainId)
const villainDisplayName = hasVillain
  ? (isNonEmpty(entry.villainName) ? entry.villainName : entry.villainId)
  : null
// …y en players: heroId/heroName solo se aceptan si isNonEmpty(...)
```

```ts
// engine/statistics.ts — extractHeroIds / extractVillainId
.filter(p => p !== null && typeof p === 'object' && isNonEmpty(String(p.heroId ?? '')))
```

#### WR-03: `buildHistoryCardView` y `engine/statistics.ts` siguen discrepando sobre «este hueco tiene héroe», pese al comentario de BF-01 que afirma paridad

**Ficheros:** `app/composables/useGameHistory.ts:130-150` (el comentario y la normalización),
`engine/statistics.ts:98` y `:124`

**Issue:**
El comentario de BF-01 fija una regla explícita: «el módulo que pinta y el módulo que agrega
deben decidir "este hueco tiene héroe" con el mismo criterio, o la pantalla y la estadística
cuentan cosas distintas sobre la misma partida». El cierre normaliza la vista con
`typeof player.heroId === 'string' ? … : null`, que es **más estricto** que el predicado que
dice replicar (`heroId !== null && heroId !== undefined`). Con un `heroId` de tipo equivocado
las dos superficies vuelven a contar cosas distintas, en la dirección contraria a la que el
defecto original tenía:

```
D1 playerLines: null | noSelectionLine: "Sin héroes ni villano anotados"   ← la tarjeta
D2 heroRows:[{"id":"7","name":"7","wins":1,"played":1,"pct":100}], entriesWithHeroes:1
```

La misma partida: «sin héroes anotados» en `/historico`, un héroe llamado «7» con 100 % de
victorias en `/estadisticas`, y contada como «con héroes anotados» en la leyenda de muestra.

Hoy no es observable a través de la app (`isHistoryPlayerEntry` descarta la entrada entera
antes de que `cardViews`/`statisticsView` la vean, `append:hero7 false` en la comprobación
ejecutada), así que es defensa en profundidad — exactamente la misma categoría que el propio
comentario invoca para justificar su existencia. Lo que sí es un defecto hoy es **el comentario
afirmando una paridad que no existe**: es la instrucción que leerá quien toque esto la próxima
vez, y le dirá que los dos lados ya coinciden cuando no coinciden.

**Fix:** o bien igualar los predicados de verdad (con WR-02 aplicado, «cadena no vacía» en los
dos lados, que es el criterio del productor), o bien —si la asimetría se quiere a propósito—
reescribir el comentario para que diga cuál es más estricto y por qué. No dejar el texto
afirmando lo que el código no hace.

#### WR-04: `buildHistoryEntry` lanza `RangeError` con un `now` hostil — el único parámetro sin guarda del fichero, y su cabecera promete «nunca lanza»

**Fichero:** `engine/history.ts:121` (`recordedAt: new Date(now).toISOString()`) y `:110` (`id`)

**Issue:**
`engine/history.ts:2-5` declara «Mismo contrato de pureza que `engine/selection.ts`
(normalización defensiva, nunca muta su argumento, **nunca lanza**)». `buildHistoryEntry`
valida `context.startedAt` por finitud (`:79-84`), `names.heroNames` con `Object.hasOwn` +
`typeof` (`:33-39`, cierre 09-14), `names.villainName` por tipo (`:63`, cierre 09-14),
`context.difficulty`/`playerCount`/`round` en origen (`:94-107`, cierre 09-12). El parámetro
`now` —hermano directo de `startedAt`, con el que se resta en la misma función— no tiene
ninguna guarda. Ejecutado:

```
THROW NaN               RangeError: Invalid time value
THROW Infinity          RangeError: Invalid time value
THROW 8640000000000001  RangeError: Invalid time value   (fuera del rango de Date)
THROW -8640000000000001 RangeError: Invalid time value
```

`useGameHistory.record` (`:289`) no envuelve la llamada en `try`, y
`onOutcomeRecorded` (`app/pages/[game]/index.vue:591`) tampoco: la excepción subiría al
manejador del click, el diálogo se quedaría abierto con `awaitingEndConfirm` en `true` y sin
ningún camino de salida salvo recargar.

Hoy el único llamador pasa `Date.now()`, así que es **latente** — el mismo perfil exacto que
BF-04 (`resolveHeroSpanishName`), que este barrido sí clasificó como DEFECTO y cerró con el
argumento textual de que es «el tipo de "alcanzable el día que alguien quite el filtro" que
este barrido existe para cerrar». Por su propio criterio, esto debía haberse cerrado en el
mismo lote. El barrido no lo vio porque contestó Q1 para esta función con «no aplica: función
pura» y solo auditó los campos de `context` y `FrozenNames`; ninguna de las tres preguntas
apunta a un parámetro escalar inyectado.

**Fix:**

```ts
export function buildHistoryEntry(
  session: EngineSession,
  outcome: GameOutcome,
  now: number,
  names: FrozenNames,
): GameHistoryEntry {
  // El reloj llega inyectado (determinismo en test), así que es dato de un
  // llamador — misma categoría que `context.startedAt`, que ya lleva guarda
  // tres líneas más abajo. `new Date(now).toISOString()` LANZA con NaN,
  // Infinity o fuera del rango de Date, y la cabecera de este fichero promete
  // que nunca lanza. Sin fecha fiable no hay entrada: `recordedAt` se deja
  // como cadena vacía, que `formatEntryDate` ya degrada a «—» (D-21) y que
  // `isGameHistoryEntry` sigue aceptando como `string`.
  const safeNow = Number.isFinite(now) && Math.abs(now) <= 8.64e15 ? now : Number.NaN
  const recordedAt = Number.isNaN(safeNow) ? '' : new Date(safeNow).toISOString()
  // …y `id` deja de poder empezar por "NaN-": usar `Date.now()` no sirve aquí
  // (rompería el determinismo); usar `Number.isNaN(safeNow) ? 0 : safeNow`.
```

Con un test que fije `expect(() => buildHistoryEntry(s, 'won', Number.NaN, names)).not.toThrow()`
para los cuatro valores de arriba.

#### WR-05: la banda de aviso empuja fuera del viewport la pantalla a la que ella misma manda volver — el diferido WR-05(b) se agravó en 09-16 y su motivo de aplazamiento ya no sostiene

**Ficheros:** `app/app.vue:23-34`, `app/components/HistorySavedNotice.vue:29-31`,
`app/pages/index.vue` → `GameSelectorScreen.vue:26` (`h-dvh`)

**Issue:**
Registrado como diferido en `deferred-items.md` §«WR-05 (b)» con este motivo literal: «vive en
`.vue`/`app.vue`, **fuera del perímetro de este plan**». Ese es un motivo de alcance de plan,
no de riesgo, y no aplica a esta revisión, cuyo perímetro son los 30 ficheros de la fase,
`.vue` incluidos. Además el diferido se evaluó antes de que 09-16 sustituyera la copy de fallo
por un párrafo de tres frases: la banda ya no mide una línea, y la variante de fallo permanece
**20 segundos**.

La cadena completa es la que importa: `finishGame` navega a `/`; `GameSelectorScreen` es
`h-dvh … justify-center` con la fila «Histórico / Estadísticas» al final; la banda es hermano
**anterior** de `<NuxtPage/>` dentro de `#app-root`, que no tiene contenedor de altura. El
documento mide `banda + 100dvh`, así que durante esos 20 s la parte inferior queda por debajo
del borde de la tablet. Y el propio texto de la banda dice «Volved a entrar en la partida y
pulsad "Partida terminada" otra vez»: el aviso desplaza justo el control que pide pulsar.

**Fix (el que ya propone el registro, sin cambios):**

```html
<!-- app/app.vue -->
<div id="app-root" class="flex flex-col h-dvh">
  <ClientOnly>
    <UpdateBanner />
    <HistorySavedNotice />
  </ClientOnly>
  <div class="flex-1 min-h-0 overflow-y-auto">
    <NuxtPage />
  </div>
</div>
```

(o `fixed top-0 inset-x-0 z-40` sobre la banda). Aplica igual a `UpdateBanner`.

#### WR-06: el contrato escrito de `writeRaw`/`save` quedó obsoleto en 09-16 y ahora describe mal quién depende del resultado de la escritura

**Fichero:** `app/composables/usePersistedSession.ts:185-196` (comentario de `writeRaw`) y
`:281-284` (`save`)

**Issue:**
El comentario afirma: «El ÚNICO llamador de este fichero que MIRA el resultado es
`appendHistoryEntry` — el histórico es el único dato de la app que no se puede reconstruir».
Las dos mitades dejaron de ser ciertas en 09-16. Desde que existe
`finishGame(preserveProgress)` (`app/pages/[game]/index.vue:543-560`), el progreso **dejó de
ser un dato meramente reconstruible en ese camino**: pasó a ser la red de seguridad explícita
del registro fallido, y la interfaz lo declara por escrito al usuario
(`HistorySavedNotice.vue:56`). Un dato del que la app hace una promesa no puede seguir
escribiéndose con un fallo silencioso.

Esto no es solo documentación: es el mecanismo que hace posible CR-01. Se registra aparte
porque el comentario es lo que va a leer quien intente arreglar CR-01, y hoy le dice
explícitamente que no toque esta firma.

**Fix:** aplicar el cambio de firma de CR-01 (`save` devuelve `boolean`) y reescribir el
comentario para que enumere los DOS llamadores que miran el resultado y por qué, dejando claro
que `next()`/`prev()`/`toggle()` siguen ignorándolo (VOZ-06/D-51 intacto).

#### WR-07: `GameOutcomeDialog` sigue sin `aria-labelledby`, sin gestión de foco y sin `Escape`, y las cuatro salidas terminan la partida — el diferido WR-04 se apoya en un motivo de alcance, no de riesgo

**Fichero:** `app/components/GameOutcomeDialog.vue:37-97`

**Issue:**
Registrado como diferido en `deferred-items.md` §WR-04, con motivo literal: «vive en un fichero
`.vue` de pantalla, explícitamente fuera del perímetro de este plan». Igual que WR-05: es
alcance de plan, no evaluación de riesgo, y no aplica a esta revisión.

Los hechos no han cambiado desde la ronda 1 y siguen siendo los peores de todos los modales del
repo: `role="dialog" aria-modal="true"` sin nombre accesible (`:37`), el foco nunca se mueve al
abrir ni se devuelve al cerrar, no hay listener de `Escape`, y **ninguna de las cuatro acciones
es reversible** — las cuatro terminan la partida (nota de reconciliación en `:7-15`). Abrirlo
por error desde `IndexOverlay` no tiene vuelta atrás. `WarningDetailModal.vue`, el patrón bueno
del repo, sí hace las tres cosas; `[game]/index.vue` ya tiene el mecanismo de captura/retorno
de foco montado para los otros modales (`:266-302`, `:320-338`), así que el coste de
replicarlo aquí es bajo y el riesgo de no hacerlo es terminar una partida sin querer.

**Fix:** el del registro, sin cambios — `onMounted` → `focus()` en el `<h1>`,
`aria-labelledby` apuntando a ese `<h1>`, y `keydown`/`Escape` → `dismiss`. Decidir antes qué
significa `Escape` frente a D-01 (cuatro opciones exactas); si no se puede añadir una quinta,
que equivalga de forma documentada a «Salir sin registrar».

---

### Info

#### IN-01: estilo de llave inconsistente con el resto del repo

**Fichero:** `app/pages/[game]/index.vue:594`
**Issue:** `} else {` en la misma línea, mientras todo el repositorio usa `else` en línea propia
(p. ej. `app/composables/useGameHistory.ts:176`, `engine/history.ts`, `usePersistedSession.ts`).
No hay ESLint en el proyecto (`package.json` no declara ni dependencia ni script), así que nada
lo detecta.
**Fix:** poner `else` en su propia línea; o, mejor, añadir `@antfu/eslint-config` + un script
`lint` y un paso en CI.

#### IN-02: `MONTHS_ES` se exporta sin ningún consumidor externo

**Fichero:** `engine/history.ts:138`
**Issue:** solo lo usa `formatEntryDate` en la línea 147 del mismo fichero; ningún `.vue`,
composable ni test lo importa. Superficie pública innecesaria en un módulo cuya disciplina
declarada es que el formateo no salga de aquí.
**Fix:** quitar `export`.

#### IN-03: `:key="entry.id"` y `removeHistoryEntry` asumen unicidad de `id` que nada garantiza

**Ficheros:** `app/pages/historico.vue:66`, `app/composables/usePersistedSession.ts:378-395`,
`engine/history.ts:110`
**Issue:** `appendHistoryEntry` no comprueba que el `id` no exista ya. Con dos entradas del
mismo `id`, Vue avisa por clave duplicada y `removeHistoryEntry` borra **la primera
coincidencia del array en disco**, que tras `sortEntriesByRecency` no tiene por qué ser la
tarjeta pulsada: el grupo borraría una partida distinta de la que pidió. La probabilidad real
es despreciable (exige mismo milisegundo y mismo sufijo aleatorio), y WR-08 ya garantizó que
nunca se lleva dos por delante, así que se registra como Info y no como Warning.
**Fix:** va con IN-05 de `deferred-items.md` (`crypto.randomUUID()`); mientras tanto,
`appendHistoryEntry` puede rechazar un `id` ya presente en `read.entries`.

#### IN-04: la página de juego instancia `useGameHistory()` entero solo para `record`

**Fichero:** `app/pages/[game]/index.vue:92`
**Issue:** arrastra `engine/statistics`, `buildHistoryCardView`, `buildStatisticsView` y una
segunda instancia de `useCharacterCatalogue()` (la primera ya está en `useGameSession`, y una
tercera en `:55`) al chunk de la pantalla que más importa que arranque rápido en la mesa.
**Fix:** exportar `record` como función suelta del módulo, o un `useHistoryRecorder()` mínimo.

#### IN-05: CI no tiene ni typecheck ni lint

**Fichero:** `.github/workflows/ci.yml`
**Issue:** el workflow ejecuta `npm run test` y Playwright. No hay `vue-tsc`/`nuxi typecheck`
ni linter en el repo, así que un error de tipos en cualquiera de los 30 ficheros de esta fase
—incluidos los `as never` que los tests usan para inyectar datos hostiles— no rompe nada.
Varias de las guardas de esta fase existen precisamente porque «el tipo TypeScript es una
promesa de compilación»; hoy ni siquiera esa promesa se comprueba.
**Fix:** `npx nuxi typecheck` como paso de CI antes de `npm run test`.

#### IN-06: un test fija como comportamiento correcto una entrada de `playerCount: 0`

**Fichero:** `app/composables/__tests__/useGameHistory.test.ts:545-566`
**Issue:** el test «una entrada construida desde `context: {}` sobrevive a un ciclo record() →
loadHistory()» afirma `expect(entry.playerCount).toBe(0)`. Una partida de 0 jugadores no
existe, y la tarjeta la pinta como «Normal · 0 jug». Es el caso límite de WR-01 congelado en
un test, así que arreglar WR-01 exige tocar esta aserción — conviene hacerlo en el mismo
cambio para que no bloquee la corrección.
**Fix:** al endurecer `isGameHistoryEntry`, cambiar la expectativa a que la entrada se rechaza
(`record()` → `false`) o a que `playerCount` se replega a un mínimo de 1, según lo que se
decida en WR-01.

---

## Sobre los hallazgos diferidos

Se ha leído `deferred-items.md` completo. **No se repiten como nuevos** WR-02, WR-05(a),
IN-04, IN-05, IN-07, IN-11, IN-12 ni IN-13: el análisis de esta ronda los confirma tal como
están descritos y sus motivos de aplazamiento (superficie de interfaz nueva, cambio de forma de
`StatisticsSummary`, contratos ya fijados por test) se sostienen.

**Dos aplazamientos se consideran mal clasificados** y se han elevado a hallazgo con su cita:

- **WR-04** (`GameOutcomeDialog`) → elevado aquí como **WR-07**. Motivo registrado: «vive en un
  fichero `.vue` de pantalla, explícitamente fuera del perímetro de este plan». Es alcance de
  plan, no riesgo; el perímetro de esta revisión incluye los `.vue`.
- **WR-05 (b)** (maquetación de la banda sobre pantallas `h-dvh`) → elevado aquí como **WR-05**.
  Mismo motivo de alcance, y además el diferido se evaluó antes de que 09-16 alargara la copy
  de fallo a un párrafo de tres frases con 20 s de permanencia, lo que agrava el síntoma sobre
  la pantalla exacta a la que el aviso manda volver.

**WR-07 del registro** (`sampleCaption` ignora la muestra de villanos) sigue correctamente
diferido, pero conviene anotar que **WR-02 de este informe lo empeora**: un `heroId: ''`
incrementa `entriesWithHeroes`, así que la leyenda no solo describe una muestra distinta de la
que la tabla de villanos agrega, sino que además puede contar como «con héroes anotados» una
partida cuya única fila de héroe es un hueco sin nombre.

---

_Reviewed: 2026-09-13T00:58:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
