---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-12T14:50:00Z
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
  - engine/__tests__/persistence.test.ts
  - engine/__tests__/statistics.test.ts
  - engine/history.ts
  - engine/persistence.ts
  - engine/statistics.ts
  - engine/types.ts
findings:
  critical: 2
  warning: 8
  info: 14
  total: 24
status: issues_found
---

# Fase 09: Informe de revisión de código (ronda 3)

**Reviewed:** 2026-09-12
**Depth:** standard
**Files Reviewed:** 23 (25 rutas en `files_reviewed_list`: `engine/persistence.ts` y su test entraron por cadena de llamada)
**Status:** issues_found
**Ronda:** 3ª (tras los cierres 09-09 … 09-12)

## Summary

Verificación previa, contra el código en disco (no contra los SUMMARY):

| Hallazgo de rondas anteriores | Estado hoy | Evidencia |
|---|---|---|
| CR-01 r1 (`players:[null]` tumba `/historico`) | CERRADO | `usePersistedSession.ts:96-102,140` + `useGameHistory.ts:111-113` |
| CR-02 r1 (`localeCompare` sobre no-string) | CERRADO | `usePersistedSession.ts:135-139` + `statistics.ts:99,105` |
| CR-03 r1 (leer-modificar-escribir destruye el histórico) | **CERRADO SOLO A MEDIAS** | `readEnvelope()` distingue JSON corrupto, pero no «no he podido leer» → ver CR-01 de esta ronda |
| CR-01 r2 (escritura sin el predicado de lectura) | CERRADO | `usePersistedSession.ts:311` + `history.ts:67-80` + 5 tests |
| WR-03 r2 (`NaN`/`Infinity` en la tarjeta) | CERRADO | `Number.isFinite` en `:133,134,139` |
| WR-01, WR-02, WR-04..WR-07 r2 | **SIGUEN ABIERTOS** | ver WR-01..WR-07 abajo |

Suite reproducida aquí: `npx vitest run` → **26 ficheros / 681 tests en verde**. Cero
referencias a Firebase/Firestore en `app/` y `engine/` (grep -ric = 0). Cero `v-html`,
`innerHTML` o `eval`. Cero artefactos de depuración.

**Lo que esta ronda encuentra y las dos anteriores no vieron.** El cierre de CR-03 (ronda 1)
se apoya en una premisa escrita de forma explícita en el propio código y que es **falsa
justo para el dato que la fase declara irreconstruible**:

> `usePersistedSession.ts:209-211`: «`readRaw` devolviendo `undefined` (clave ausente **O
> storage inaccesible**) es la ÚNICA vía a 'empty'»

Es decir: `readEnvelope()` protege el blob del histórico frente a un JSON que no supo
*interpretar*, pero lo sustituye alegremente cuando no ha sabido *leerlo*. Reproducido
ejecutando el módulo real con el mismo arnés de `localStorage` falso que usa la suite del
proyecto: **dos partidas registradas desaparecen para siempre y `appendHistoryEntry`
devuelve `true`**, así que el grupo ve «✓ Partida registrada» encima del borrado (CR-01).

El segundo hallazgo nuevo es de la misma familia y también reproducido: `engine/history.ts`
resuelve el nombre congelado con un acceso a un objeto literal, así que **la cadena de
prototipos de `Object` participa en la búsqueda**; un `heroId` llamado `constructor`
produce un `heroName` que es una función, la entrada no supera la frontera de escritura y la
partida se pierde con el aviso de fallo equivocado encima (CR-02).

El resto son avisos: seis heredados de la ronda 2 que siguen sin tocarse, uno nuevo sobre
`resume()` promoviendo a verdad el `context` de relleno de la página, y otro sobre el mismo
patrón de búsqueda por prototipo aplicado al parámetro de ruta.

## Structural Findings (fallow)

No se recibió bloque `<structural_findings>` en esta invocación; esta sección queda vacía a
propósito para que no se confunda con «no había nada que encontrar».

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: un `localStorage` que falla al LEER borra el histórico entero, y la app confirma el borrado con un ✓ — **BLOCKER**

**File:** `app/composables/usePersistedSession.ts:148-156` (`readRaw`), `:214-228` (`readEnvelope`), `:301-322` (`appendHistoryEntry`)

**Issue:**
`readRaw` colapsa tres situaciones distintas en un único `undefined`: clave ausente, sin
`window`, y **el storage lanzó al leer** (modo privado, contexto restringido, presión de
almacenamiento). `readEnvelope` mapea ese `undefined` a `{ kind: 'empty' }`, y
`appendHistoryEntry` trata `'empty'` como «no hay histórico todavía» y **construye el
envoltorio desde cero** con `previous = []` (`:316`). Resultado: una única lectura fallida
convierte N partidas registradas en 1.

Esto es exactamente la clase de destrucción que CR-03 (ronda 1) declaró cerrada. El arreglo
de entonces distinguió «JSON que no sé interpretar» de «no hay nada», pero dejó fuera «no he
podido leer», y lo dejó por escrito como si fuera inocuo (`:209-211`).

Peor que el borrado: `writeRaw` sí funciona en ese escenario, así que `appendHistoryEntry`
devuelve **`true`**, `notifyHistorySaved(true)` pinta «✓ Partida registrada»
(`[game]/index.vue:570-573`) y `finishGame()` destruye la sesión acto seguido. Nadie se
entera nunca.

**Reproducción ejecutada** (módulo real, arnés de `localStorage` falso calcado del de
`usePersistedSession.test.ts`; `getItem` lanza UNA vez, `setItem` normal):

```
appendHistoryEntry('partida-1') -> true
appendHistoryEntry('partida-2') -> true
loadHistory()                   -> ['partida-2', 'partida-1']
// getItem lanza SecurityError una sola vez:
appendHistoryEntry('partida-3') -> true      // ← confirma éxito
loadHistory()                   -> ['partida-3']   // partida-1 y partida-2 destruidas
```

La suite actual no lo detecta porque su test de fallo de lectura
(`usePersistedSession.test.ts:141-148`) solo cubre `load()` (progreso, dato reconstruible),
nunca `appendHistoryEntry` (histórico, dato irreconstruible).

**Fix:** que la imposibilidad de leer sea un estado propio, y que solo la ausencia real
autorice a crear el envoltorio desde cero:

```ts
// readRaw pasa a devolver un resultado discriminado
type RawRead = { kind: 'absent' } | { kind: 'value', raw: string } | { kind: 'unreadable' }

function readRaw(key: string): RawRead {
  if (typeof window === 'undefined') return { kind: 'unreadable' } // SSR: tampoco se escribe
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? { kind: 'absent' } : { kind: 'value', raw }
  }
  catch {
    return { kind: 'unreadable' } // NO es 'absent': nunca autoriza a machacar
  }
}

function readEnvelope(): EnvelopeRead {
  const read = readRaw(HISTORY_KEY)
  if (read.kind === 'unreadable') return { kind: 'unreadable' }
  if (read.kind === 'absent') return { kind: 'empty' }
  try { /* … parseo igual que hoy, sobre read.raw … */ }
  catch { return { kind: 'unreadable' } }
}
```

`loadVoicePreference`/`load` pueden seguir tratando ambos casos como ausencia (datos
reconstruibles); el que no puede es el histórico. Añadir el test de regresión del bloque de
arriba: `getItem` que lanza + `setItem` que funciona ⇒ `appendHistoryEntry === false` y blob
intacto byte a byte.

---

### CR-02: `heroNames[heroId]` busca por la cadena de prototipos — un `heroId` llamado `constructor` pierde la partida y culpa al dispositivo — **BLOCKER**

**File:** `engine/history.ts:41`; origen del mapa en `app/composables/useGameHistory.ts:63-68`

**Issue:**
`names.heroNames` es un objeto literal (`const heroNames: Record<string, string> = {}`), así
que `names.heroNames[slot.heroId]` **hereda de `Object.prototype`**. Con
`heroId ∈ {constructor, toString, valueOf, hasOwnProperty, __proto__, …}` el `?? null` de la
línea 41 nunca entra: el valor devuelto es una función, y esa función viaja como `heroName`
dentro de `GameHistoryEntry`.

Cadena completa, reproducida ejecutando `buildHistoryEntry` + `record()` reales con un
`context.selection.heroes[0].heroId = 'constructor'` (valor que `resolvePlayerSlots` acepta
sin pestañear: es un string no vacío, `engine/selection.ts:62`):

```
typeof entry.players[0].heroName  -> 'function'
record(session, 'won')            -> false        // isHistoryPlayerEntry lo rechaza
loadHistory().length              -> 0            // la partida no existe
```

En pantalla eso es: `notifyHistorySaved(false)` → «⚠ No se pudo guardar la partida. **El
dispositivo no permitió escribir en su almacenamiento** (modo privado, cuota agotada…)»
(`HistorySavedNotice.vue:30-32`) — un diagnóstico falso que manda al grupo a revisar ajustes
del navegador — e inmediatamente después `finishGame()` (`[game]/index.vue:574`) destruye la
sesión. La partida es irrecuperable.

Precondición: un `heroId` con nombre de propiedad de `Object.prototype` en el
`localStorage`. El proyecto trata explícitamente ese vector como dentro de su modelo de
amenaza (`engine/__tests__/persistence.test.ts:183-184`: «`localStorage` es editable desde
DevTools — esta es la defensa de la que depende que la interfaz no reviente con datos
manipulados»), y el coste del arreglo es una línea.

**Fix:** mapa sin prototipo en el productor y guarda de tipo en el consumidor (las dos, no
una):

```ts
// app/composables/useGameHistory.ts
const heroNames: Record<string, string> = Object.create(null)

// engine/history.ts
const frozen = Object.hasOwn(names.heroNames, slot.heroId) ? names.heroNames[slot.heroId] : null
const heroName = slot.heroId !== null && typeof frozen === 'string' ? frozen : null
```

Mismo repaso conviene en cualquier otro `Record<string, …>` indexado por dato de usuario:
`buildTakenByMap`/`labelsByHeroId` (`useHeroSearch.ts:154-163`) y `spanishHeroAliases`
(`:66`) comparten la forma, aunque hoy sus claves vengan del catálogo.

---

## Warnings

### WR-01: la defensa en profundidad de `buildHistoryCardView` cubre `null` pero no `undefined` (sigue abierto desde la ronda 2) — **WARNING**

**File:** `app/composables/useGameHistory.ts:113` y `:126`

**Issue:** `engine/statistics.ts:98` y `:124` comprueban `p.heroId !== null && p.heroId !== undefined`;
su gemelo de la capa de vista solo comprueba `!== null`. Con `heroId: undefined` (`players:
[{ playerName: 'Ana' }]`), `hasAnyHero` sale `true` y la línea 126 entra por la rama del
héroe: `` `${label} · ${player.heroName ?? player.heroId}` `` interpola `undefined` y la
tarjeta pinta literalmente «Ana · undefined». Es el mismo patrón «un módulo tiene la guarda
y el gemelo la olvidó» que produjo el CR-01 de la ronda 1.

**Fix:** usar el mismo predicado en los dos sitios (idealmente extraído a una función
compartida, p. ej. `hasHero(player)`), o normalizar `heroId ?? null` al filtrar en `:111-113`.

---

### WR-02: un envoltorio ilegible bloquea el registro para siempre, en silencio y con diagnóstico falso (sigue abierto desde la ronda 2) — **WARNING**

**File:** `app/composables/usePersistedSession.ts:214-228`, `:301-322`; `app/pages/historico.vue:79-86`

**Issue:** con un blob `unreadable` (JSON corrupto o `formatVersion` desconocido tras un
rollback de versión), `appendHistoryEntry` devuelve `false` en **todas** las partidas
futuras y `loadHistory()` devuelve `[]`. La interfaz entonces afirma dos cosas falsas: la
pantalla dice «Todavía no hay partidas registradas» (hay, no se saben leer) y el aviso dice
que el dispositivo no dejó escribir (sí deja; es la app la que se niega). No existe ninguna
vía en la interfaz para salir del bloqueo.

**Fix:** distinguir el caso en el contrato de `appendHistoryEntry` (p. ej.
`'ok' | 'storage-failed' | 'unreadable'`), dar copy propia a `HistorySavedNotice`
(«no se pudo leer el histórico guardado») y ofrecer una acción explícita de archivado
(renombrar la clave a `tga:history:backup-<ts>` y empezar limpio) en `/historico`. El dato
antiguo se conserva, que es lo que CR-03 protege; lo que no puede quedarse es el callejón sin
salida.

---

### WR-03 (NUEVO): `resume()` asciende a verdad el `context` de relleno de la página — **WARNING**

**File:** `engine/persistence.ts:94` y `:63`; origen del relleno en `app/pages/[game]/index.vue:149`

**Issue:** la página construye la sesión estructural con un `context` explícitamente
declarado *placeholder*: `expand(game, { playerCount: 1, difficulty: 'normal' })`. Si el
`context` persistido no supera `isValidContext` (basta con `context: {}` o `context: []`,
que sí superan `isPersistedPosition`, `:86`), `resume()` adopta `fresh.context` y **devuelve
`outcome: 'resumed'`**. El grupo ve «Partida guardada … CONTINUAR», continúa en el paso
correcto, y a partir de ahí toda la sesión miente: la banda de contadores pinta 1 héroe en
lugar de 4, la cabecera dice «1 jug · Normal», y al terminar, `buildHistoryEntry` escribe esa
mentira en el histórico (`playerCount: 1`, `difficulty: 'normal'`) sin ninguna marca de
degradación. El test `engine/__tests__/persistence.test.ts:291-297` fija este comportamiento
como correcto.

Un `context` que no se puede validar no es una partida reanudable: es una partida cuya
configuración se ha perdido.

**Fix:** tratar el `context` inválido como cambio de forma, no como reanudación:

```ts
const validContext = isValidContext(persisted.context)
if (!validContext) {
  // sin configuración fiable no hay reanudación: que el mini-setup vuelva a preguntar
  return { session: fresh, outcome: 'fresh' }
}
```

(y el mismo criterio en `contentChangedFallback`, que hoy devuelve el relleno con la pantalla
«el contenido ha cambiado» y un CTA que abre partida). Actualizar los dos tests que fijan el
comportamiento actual.

---

### WR-04: `GameOutcomeDialog` no tiene `Escape`, ni gestión de foco, ni salida no terminal (sigue abierto desde la ronda 1) — **WARNING**

**File:** `app/components/GameOutcomeDialog.vue:37-97`

**Issue:** `role="dialog" aria-modal="true"` sin `aria-labelledby`, sin mover el foco al
abrir, sin devolverlo al cerrar y sin escuchar `Escape` — mientras que `WarningDetailModal.vue`
(el patrón «bueno» del repo) sí hace las tres cosas. Y las cuatro acciones del diálogo
terminan la partida: abrirlo por error desde el índice (`onEndGameRequest`,
`[game]/index.vue:524`) no tiene vuelta atrás. Para un lector de pantalla, el diálogo
aparece sin anunciarse y con el foco todavía en el botón del overlay que hay detrás.

**Fix:** copiar el bloque de `WarningDetailModal.vue` (`onMounted` → `focus()`,
`keydown`/`Escape` → `dismiss`, `aria-labelledby` apuntando al `<h1>`). Si D-01 prohíbe un
quinto botón, al menos que `Escape` equivalga a «Salir sin registrar» de forma documentada,
o que el diálogo se abra tras una confirmación explícita.

---

### WR-05: `HistorySavedNotice` no se anuncia y empuja fuera del viewport las pantallas `h-dvh` (sigue abierto desde la ronda 1) — **WARNING**

**File:** `app/components/HistorySavedNotice.vue:17-19`; punto de montaje en `app/app.vue:32`

**Issue:** (a) el aviso no lleva `role="status"`/`aria-live="polite"`, así que el único
resultado del gesto «terminar partida» es invisible para un lector de pantalla; (b) se monta
como hermano **encima** de `<NuxtPage/>` dentro de `#app-root`, y todas las pantallas usan
`h-dvh` (`pages/index.vue` → `GameSelectorScreen.vue:26`, `historico.vue:40`,
`estadisticas.vue:23`): mientras el aviso está visible (6 s en éxito, **20 s** en fallo) el
contenido mide `banner + 100dvh` y la fila inferior —los accesos «Histórico»/«Estadísticas»
del selector— queda por debajo del borde de la tablet. No hay ninguna regla global de
`overflow` en `main.css` que lo contenga.

**Fix:** `role="status" aria-live="polite"` en el contenedor, y sacar la banda del flujo
(`fixed top-0 inset-x-0 z-40`) o envolver `<NuxtPage/>` en un contenedor
`flex flex-col h-dvh` con `min-h-0` para que el aviso reste altura en vez de sumarla. Aplica
igual a `UpdateBanner`.

---

### WR-06: `formatEntryDuration` pinta «1 h 0 min» y duraciones negativas (sigue abierto desde la ronda 1) — **WARNING**

**File:** `engine/history.ts:125-132`

**Issue:** con exactamente 3 600 000 ms sale «1 h 0 min» (el minuto redundante que ningún
reloj de mesa escribe). Y `Number.isFinite` deja pasar los negativos: un `durationMs:
-6000000` manipulado produce «-2 h -40 min», porque `Math.floor(-100/60) = -2` y
`-100 % 60 = -40`. Además una partida de 20 s se registra como «0 min».

**Fix:**

```ts
if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) return '—'
const totalMinutes = Math.max(1, Math.round(durationMs / 60000)) // nunca «0 min»
const hours = Math.floor(totalMinutes / 60)
const minutes = totalMinutes % 60
if (hours === 0) return `${minutes} min`
return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
```

---

### WR-07: `sampleCaption` declara la muestra de héroes e ignora la de villanos (sigue abierto desde la ronda 1) — **WARNING**

**File:** `app/composables/useGameHistory.ts:196-198`; origen en `engine/statistics.ts:122-125`

**Issue:** `entriesWithHeroes` solo cuenta entradas con al menos un `heroId`. Una partida con
villano anotado y sin héroes alimenta la tabla «% DE VICTORIAS POR VILLANO» pero cuenta como
«sin anotar» en la leyenda, así que el pie que hay **encima de las dos tablas** dice «12
partidas registradas · 10 con héroes anotados» mientras la tabla de villanos agrega 12. La
leyenda no describe la muestra que el lector tiene delante.

**Fix:** exponer también `entriesWithVillain` en `StatisticsSummary` y que la leyenda declare
la muestra de cada tabla por separado (o colocar el pie solo sobre la de héroes).

---

### WR-08 (NUEVO): el parámetro de ruta se usa como clave de objeto literal — `/constructor` esquiva la pantalla «No encontramos ese juego» — **WARNING**

**File:** `app/pages/[game]/index.vue:44`, `:47`, `:56`, `:149` (consumidores: `useGameContent.ts:19`, `useCharacterCatalogue.ts:19`)

**Issue:** mismo defecto raíz que CR-02, esta vez alimentado directamente desde la URL:
`getGame(gameId)` es `gamesById[gameId] ?? null` sobre un objeto literal, así que
`getGame('constructor')` devuelve la **función `Object`**, que es truthy. La guarda
`v-if="!game"` (`:646`) no se dispara, `onMounted` llega a `expand(game, …)` y revienta en
`engine/expand.ts:16` (`game.sections.find` sobre `undefined`); `resumeResolved` se queda en
`false` y la pantalla se queda en «Cargando…» para siempre. Igual con
`getCatalogue('constructor')` (`:56`), que devolvería un `catalogue` truthy a
`buildHeroOptions`. Vale para `constructor`, `toString`, `valueOf`, `hasOwnProperty`,
`__proto__`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`.

Es preexistente (no lo introduce la Fase 9), pero la ruta vive en un fichero de esta entrega
y la corrección es la misma línea que CR-02.

**Fix:** `const gamesById: Record<string, GameDefinition> = Object.assign(Object.create(null), { 'marvel-champions': … })`,
o `Object.hasOwn(gamesById, gameId) ? gamesById[gameId] : null` en los dos composables.

---

## Info

_Tier INFO: no bloquean la entrega; se listan porque son deuda real, no estilo._

### IN-01: guarda muerta en `buildRows`
**File:** `engine/statistics.ts:49` — `aggregateStatistics` ya filtró nulos/no-objetos en `:117`
antes de llamar, así que la línea nunca es falsa. Deja creer que `buildRows` es seguro ante
cualquier array, cuando su seguridad depende del llamador. Borrarla o hacer que `buildRows`
sea realmente autónomo.

### IN-02: import duplicado del mismo módulo
**File:** `engine/history.ts:11-12` — dos `import type … from './types'` seguidos. Fusionar.

### IN-03: `MONTHS_ES` se exporta y nadie la consume fuera del módulo
**File:** `engine/history.ts:111` — `grep -rn "MONTHS_ES" app/ engine/` solo la encuentra en su
propio fichero. Quitar el `export` o documentar por qué es API pública.

### IN-04: el histórico crece sin tope ni poda
**File:** `app/composables/usePersistedSession.ts:301-322` — nada acota `entries`. Con el
cuerpo de `localStorage` compartido con el progreso y el audio precacheado, el día que tope
la cuota el síntoma es el aviso de fallo de CR-01/WR-02, sin explicación. Un tope (p. ej.
500) o una poda explícita evitarían llegar ahí.

### IN-05: los ids de entrada tienen longitud variable y pueden quedar vacíos
**File:** `engine/history.ts:83` — `Math.random().toString(36).slice(2, 12)` da entre 0 y 10
caracteres (`Math.random() === 0` ⇒ sufijo vacío ⇒ `id` = `"1789…-"`). El test `:294` fija
`/^\d+-[a-z0-9]+$/`, que ese caso incumpliría. `crypto.randomUUID()` (disponible en todos los
navegadores objetivo, contexto seguro) elimina el borde.

### IN-06: `aggregateStatistics` tiene una precondición de orden que su firma no expresa
**File:** `engine/statistics.ts:38-41` — «el primer nombre visto gana» solo es «el más
reciente» si el llamador ordenó antes. `useGameHistory` devuelve `entries` como **ref
mutable** (`:264-272`), así que cualquier pantalla puede romper la precondición sin que nada
avise. Ordenar dentro de `aggregateStatistics` (o aceptar `readonly` + documentar en la firma).

### IN-07: el fichero e2e aborta la suite entera en tiempo de import
**File:** `e2e/offline-flow.spec.ts:26-28` — un `throw` a nivel de módulo si `public/audio/` no
tiene `.m4a`: se cae la colección completa de Playwright, incluidos los tres tests nuevos de
`/historico` y `/estadisticas`, que no dependen del audio. Mover la comprobación a un
`test.skip(condition, …)` dentro del test que la necesita.

### IN-08: el espacio de claves de `pressedId` mezcla ids de juego con literales de navegación
**File:** `app/components/GameSelectorScreen.vue:22,72,84` — un juego con `id: 'history'`
encendería a la vez su tarjeta y el botón «Histórico». Prefijar (`game:${id}`) o usar un ref
aparte.

### IN-09: cabecera duplicada literalmente entre las dos pantallas nuevas
**File:** `app/pages/historico.vue:41-59` y `app/pages/estadisticas.vue:24-42` — 19 líneas
idénticas salvo título y destino. Un `AppSecondaryHeader` con dos props evita que la próxima
pantalla copie una tercera vez.

### IN-10: helper de test mal escrito y definido después de su uso
**File:** `engine/__tests__/statistics.test.ts:39,48` — `makEntryConVarios` (falta la `e`),
declarada tras el `describe` que la usa (funciona por hoisting). Renombrar y subirla junto a
los demás helpers.

### IN-11: `removeHistoryEntry` se traga el fallo de escritura
**File:** `app/composables/usePersistedSession.ts:338-356` — devuelve `void` e ignora el
booleano de `writeRaw`. El comentario lo justifica («la entrada sigue visible»), pero
`historico.vue:32-36` llama a `reload()` justo después y la tarjeta reaparece sin ninguna
explicación: el grupo cree que el botón no funciona. Un aviso reutilizando
`HistorySavedNotice` cerraría el hueco.

### IN-12: una entrada rechazada por `isGameHistoryEntry` es invisible **y** no se puede borrar
**File:** `app/composables/usePersistedSession.ts:280-284` — `loadHistory` la filtra, así que
nunca se pinta una tarjeta con su `id` y no hay forma de invocar `removeHistoryEntry` sobre
ella. Ocupa cuota para siempre. Va con IN-04/WR-02: hace falta una vía de mantenimiento.

### IN-13: `Math.round` en `pct` puede anunciar «100 %» sin pleno
**File:** `engine/statistics.ts:72` — 199 de 200 redondea a 100 %. La etiqueta completa
(`199 de 200 · 100 %`, `useGameHistory.ts:188`) desmiente al porcentaje en la misma línea.
`Math.floor` para el tramo alto (o no redondear al alza por encima de 99) evita la
contradicción.

### IN-14: `first-letter:text-accent` no colorea el glifo que pretende colorear
**File:** `app/components/HistorySavedNotice.vue:22,27` — `::first-letter` se aplica a la
primera **letra** (admitiendo puntuación previa, no símbolos): con «✓ Partida registrada» el
color cae sobre la `P`, no sobre el ✓. Envolver el glifo en un `<span>` con la clase.

---

_Reviewed: 2026-09-12T14:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
