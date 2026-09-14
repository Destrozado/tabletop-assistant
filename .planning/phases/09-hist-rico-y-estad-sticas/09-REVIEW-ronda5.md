---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - .github/workflows/ci.yml
  - app/composables/__tests__/afirmacionesRespaldadas.test.ts
  - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
  - app/composables/__tests__/useHistorySavedNotice.test.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - app/composables/__tests__/useStoredProgress.test.ts
  - app/composables/useHistorySavedNotice.ts
  - app/composables/usePersistedSession.ts
  - app/composables/useStoredProgress.ts
  - app/pages/[game]/index.vue
  - package.json
findings:
  critical: 3
  warning: 7
  info: 5
  total: 15
status: issues_found
---

# Phase 09: Code Review Report (ronda 5)

**Reviewed:** 2026-09-13
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Lo que la ronda 5 afirma haber hecho, lo ha hecho, y se comprueba fichero a fichero:
`readStoredProgress` (`useStoredProgress.ts:69-99`) no mira ningún booleano de escritura,
`planGameEnd` es total sobre los tres valores de `StoredProgress`, `failure-unknown`
existe, las guardas de reentrada de WR-01 (ronda 4) están puestas
(`index.vue:630`, `index.vue:661`), el orden D-U4 se conserva con la lectura intercalada
entre `save()` y `notifyHistorySaved()` (`index.vue:637-644`), los dos llamadores del
autoguardado siguen ignorando el resultado de `save()` (`index.vue:175-198`), y
`app/**/*` sí entra en `nuxt typecheck` (`.nuxt/tsconfig.app.json`), así que la barrera de
tipos es real. 387 tests en verde.

Y aun así **la clase sigue abierta, con tres caras nuevas**. Las tres tienen la misma
forma que las cinco anteriores: una frase de la app sobre los datos del grupo cuyo
respaldo mide una cosa distinta de la que la frase dice.

1. La autoridad contesta «¿hay ALGUNA partida reanudable para este juego?». La copy de
   `failure-recoverable` afirma «**esta** partida sigue guardada» y manda reintentar sobre
   ella. Y esa variante solo es alcanzable cuando la escritura del estado actual acaba de
   fallar — es decir, por construcción, lo que hay en el dispositivo **no** es la partida
   que acaba de terminar. El reintento que el aviso instruye registra en el histórico el
   snapshot viejo (ronda y selección de héroes/villano incluidas). El propio test 5 de
   `avisoTrasRegistroFallido.test.ts` graba esa discrepancia como comportamiento esperado.

2. `failure-unknown` no afirma la ausencia: se la hace deducir al grupo («si os pide
   jugadores y dificultad, esa partida ya no está»). Pero el mini-setup es exactamente lo
   que la app enseña cuando **no ha podido leer** el dispositivo y cuando la posición
   existe pero es inservible. La conflación prohibida no ha desaparecido: se ha
   externalizado a los ojos del usuario.

3. El gate de clase no vigila la clase. `extraerTemplate` corta en el **primer**
   `</template>`, así que en la página del runner inspecciona 485 de 4.833 caracteres de
   plantilla (10%); se ha comprobado inyectando «sigue guardada en el dispositivo» dentro
   del bloque de `ResumePrompt` y el gate sigue verde. Tampoco mira `<script setup>`, ni
   ninguna copy de `.ts` que no sea `NOTICE_BODY`, ni los literales de `NoticeVariant`
   —el gesto que `useHistorySavedNotice.ts:147-155` dice explícitamente que el gate
   persigue—. IN-03 de la ronda 4 (`endGameBody`) es un ejemplar vivo de la clase, sigue
   abierto, y el gate no lo ve por partida doble.

Hallazgos de la ronda 4 que siguen abiertos y que **no** se reabren aquí:
WR-02/03/04/05/06/07/08/10 e IN-03 … IN-08. Ninguno ha regresado; WR-10 sí queda
agravado (ver WR-06). IN-01 e IN-02 de la ronda 4 sí se cerraron.

---

## Critical Issues

### CR-01: `failure-recoverable` promete «esta partida» con una lectura que solo mide «alguna partida» — y el reintento que instruye registra el snapshot viejo

**File:** `app/composables/useStoredProgress.ts:69`, `app/pages/[game]/index.vue:638-644`,
`app/composables/useHistorySavedNotice.ts:142`,
`app/composables/__tests__/avisoTrasRegistroFallido.test.ts:187-224`

**Issue:**

`readStoredProgress` recibe **solo** el `GameDefinition`:

```ts
// app/composables/useStoredProgress.ts:69
export function readStoredProgress(game: GameDefinition): StoredProgressReport
```

Estructuralmente no puede contestar más que «¿hay algo reanudable bajo
`tga:progress:<gameId>`?». La sesión que acaba de terminar está a mano en el sitio de la
llamada y **no se le pasa**:

```js
// app/pages/[game]/index.vue:638-644
const guardado = record(session.value, outcome)
if (!guardado) save(session.value)
const { stored } = readStoredProgress(game)   // ← session.value no entra aquí
const plan = planGameEnd(guardado, stored)
```

Pero la copy que esa respuesta selecciona sí habla de una partida concreta:

> «La partida no se ha perdido: **sigue guardada** en el dispositivo. Volved a entrar **en
> ella** y pulsad «Partida terminada» otra vez para reintentar el registro.»
> (`useHistorySavedNotice.ts:142`)

El camino que lleva a esa frase garantiza que la afirmación es falsa. `failure-recoverable`
solo se alcanza con `guardado === false`, y en esa rama se ejecuta `save(session.value)`
justo antes de la lectura. Hay dos casos y solo dos:

- `save()` funcionó → el dispositivo contiene la partida correcta. Pero entonces
  `appendHistoryEntry` ha fallado escribiendo en `tga:history` mientras `setItem` sí
  funciona en `tga:progress:*` — el caso raro (blob del histórico ilegible).
- `save()` falló (modo privado, cuota — los dos motivos que la propia copy nombra) → lo
  que hay en el dispositivo es **lo que dejó el último autoguardado que sí funcionó**, no
  la partida que acaba de terminar. La app afirma «sigue guardada» sobre un snapshot
  anterior sin haber comparado nada.

El daño no se queda en la frase: el reintento que el aviso ordena pasa por `ResumePrompt`
→ `onResumeContinue` → «Partida terminada» → `record(session.value, outcome)` →
`buildHistoryEntry`, que lee `session.round` y `session.context` tal cual
(`engine/history.ts:51,62,67`). Como `resume()` restaura `persisted.context` y
`persisted.round` del snapshot viejo, el reintento escribe en el histórico —el único dato
irreconstruible de la app (D-13)— una entrada con la **ronda equivocada** y con la
selección de héroes/villano **anterior** a que el almacenamiento se cayera. Si el grupo
eligió héroes después de que la cuota se agotara, la partida queda registrada con
`villainId: null` y `heroId: null` en todos los huecos, sin ningún aviso.

Que la discrepancia es real y no teórica lo demuestra el propio test de regresión de este
plan:

```js
// app/composables/__tests__/avisoTrasRegistroFallido.test.ts:194-218
const primerAutoguardado = save({ ...base, cursor: 0 })
const segundoAutoguardado = save({ ...base, cursor: 1 })
const tercerAutoguardado  = save({ ...base, cursor: 2 })   // ← lo último que hay en disco
// ...
const guardadoDeCierre = save({ ...base, cursor: 3 })      // ← falla: la partida real
expect(guardadoDeCierre).toBe(false)
const informe = readStoredProgress(tinyGame)
expect(planGameEnd(historyRecorded, informe.stored).variant).toBe('failure-recoverable')
```

El dispositivo tiene `cursor: 2`; la partida que terminó estaba en `cursor: 3`. El test
afirma que la promesa «esta partida sigue guardada» es correcta con esos números delante.
Es la sexta cara del mismo defecto: se ha cambiado el respaldo de una escritura a una
lectura, pero la lectura sigue contestando **otra pregunta** distinta de la que la frase
hace.

**Fix:** que la autoridad conteste la pregunta que la copy hace. Un cuarto valor, y la
comparación explícita en el único sitio que puede hacerla:

```ts
// app/composables/useStoredProgress.ts
export type StoredProgress = 'resumable' | 'stale' | 'absent' | 'unknown'

export function readStoredProgress(game: GameDefinition, esperada?: EngineSession): StoredProgressReport {
  // ... igual hasta obtener `result`
  if (result.outcome === 'fresh') return { stored: 'absent', ... }
  if (esperada) {
    const objetivo = toPersistedPosition(esperada)
    const enDisco = lectura.position!
    const esLaMisma = enDisco.runtimeId === objetivo.runtimeId
      && enDisco.round === objetivo.round
      && JSON.stringify(enDisco.context) === JSON.stringify(objetivo.context)
    if (!esLaMisma) return { stored: 'stale', ... }   // hay algo, pero NO es esta partida
  }
  return { stored: 'resumable', ... }
}
```

y una cuarta variante `failure-stale` cuya copy no prometa «esta partida» ni ordene un
reintento que falsearía el histórico:

```
'failure-stale': 'La partida no se ha registrado y el dispositivo solo conserva una
versión anterior de ella (no la ronda en la que habéis terminado). Al volver a entrar os
ofrecerá continuar desde ese punto anterior: si registráis desde ahí, los datos no serán
los de esta partida.'
```

`onOutcomeRecorded` pasa `session.value` (que ya tiene en la mano) como segundo
argumento. Gate B se actualiza a cuatro valores y la biyección vuelve a cerrarse sola.

---

### CR-02: el cuerpo de `failure-unknown` delega en el grupo una inferencia de ausencia que la app no puede respaldar

**File:** `app/composables/useHistorySavedNotice.ts:144`, `app/composables/useStoredProgress.ts:74-81`,
`app/pages/[game]/index.vue:160-163`, `engine/persistence.ts:103-105`

**Issue:**

La variante nueva existe, dice su cabecera, «porque un fallo de LECTURA no autoriza a
afirmar ni presencia (ronda 4) ni ausencia (ronda 5)». Su cuerpo, sin embargo, afirma
exactamente eso, solo que por boca del usuario:

> «Volved a entrar en el juego: si os ofrece continuar, pulsad «Partida terminada» otra
> vez …; **si os pide jugadores y dificultad, esa partida ya no está**.»

«Os pide jugadores y dificultad» = se muestra `MiniSetupScreen`, y eso ocurre siempre que
`readStoredProgress` devuelve `outcome: 'fresh'` (`index.vue:160-163`). La app llega a
`'fresh'` por **tres** caminos distintos, no por uno:

1. Ausencia genuina (`readProgress` → `{ read:'ok', position:null }` con la clave ausente).
2. **La lectura ha vuelto a fallar** — `readStoredProgress` devuelve
   `{ stored:'unknown', outcome:'fresh' }` (`useStoredProgress.ts:80`). En modo privado o
   en un contexto restringido, la causa del fallo es persistente: si falló al terminar la
   partida, va a volver a fallar al reentrar, así que este es el camino **más probable**
   justo después de ver este aviso.
3. La posición existe y es inservible: `context` fuera de rango (`engine/persistence.ts:103-105`,
   ruta cubierta por `useStoredProgress.test.ts:97-113`) o JSON corrupto. La partida
   **sigue en el dispositivo**; lo que no se puede es ofrecerla.

En los casos 2 y 3 el grupo lee «esa partida ya no está» y actúa en consecuencia (empieza
otra, deja de buscarla) sobre una ausencia que nadie ha comprobado. Es la misma frase
prohibida de `failure-unrecoverable` de la ronda 5, movida a la segunda persona. El
comentario de `useStoredProgress.ts:44-50` («plegarlo sobre 'absent' autoriza a afirmar
una ausencia no comprobada») describe con precisión lo que esta copy hace.

Peor: el aviso instruye al grupo a usar la aparición del mini-setup como oráculo, y el
mini-setup es precisamente la pantalla que la app enseña cuando **no sabe**.

**Fix:** no delegar la inferencia. El cuerpo puede describir qué hacer sin afirmar nada
del dispositivo:

```
'failure-unknown': 'No hemos podido comprobar si la partida sigue en el dispositivo.
Volved a entrar en el juego: si os ofrece continuar, pulsad «Partida terminada» otra vez
para reintentar el registro. Si no os la ofrece, puede que siga ahí y la app no consiga
leerla: el modo privado del navegador y la memoria llena son las dos causas habituales.'
```

Y cerrar el hueco de raíz en el montaje: cuando `stored === 'unknown'`, `onMounted` no
debería presentar el mini-setup como si hubiera comprobado el dispositivo (ver WR-02).

---

### CR-03: el gate de clase barre el 10% de la plantilla del runner — `extraerTemplate` corta en el primer `</template>`

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:83-86,104-119`

**Issue:**

```js
function extraerTemplate(sfc: string): string {
  const match = sfc.match(/<template[^>]*>([\s\S]*?)<\/template>/)
  return match ? quitarComentariosHtml(match[1]!) : ''
}
```

El cuantificador es perezoso, así que la captura termina en el **primer** `</template>` del
fichero. Cualquier SFC con un `<template>` anidado (slot con nombre, `<template #fallback>`,
`<template v-if>`) queda barrido solo hasta ahí. Medido sobre el árbol actual:

| Fichero | lo que el gate mira | plantilla real | cobertura |
|---|---|---|---|
| `app/pages/[game]/index.vue` | **485** | 4.833 | **10%** |
| `app/components/AppHeader.vue` | 272 | 2.232 | 12% |
| `app/components/WarningDetailModal.vue` | 429 | 928 | 46% |
| `app/components/GameSelectorScreen.vue` | 1.658 | 2.696 | 61% |
| `app/components/IndexOverlay.vue` | 2.045 | 2.871 | 71% |
| `app/pages/historico.vue` | 1.840 | 2.190 | 84% |

(caracteres, ya sin comentarios HTML, que es lo que `extraerTemplate` devuelve; los otros
19 SFC del árbol se barren enteros por no tener ningún `<template>` anidado)

En `app/pages/[game]/index.vue` el primer `</template>` es el cierre del
`<template #fallback>` de `ClientOnly` (`index.vue:736-740`), así que el gate solo ve el
mensaje de «juego desconocido» y el «Cargando…»; `ResumePrompt`, `ConfirmDialog`,
`ContentChangedNotice`, `GameOutcomeDialog` y todo lo demás quedan fuera. Es decir: **el
único fichero donde han vivido cinco de las seis caras de este defecto es el peor
cubierto por el gate que existe para cerrar la clase.**

Comprobado, no deducido — inyectando la frase en la región no barrida el gate sigue verde:

```
$ node -e "…inyectar 'Vuestra partida sigue guardada en el dispositivo' en el <ResumePrompt> …"
inyeccion aplicada: true
template extraido (chars): 485
frases detectadas por Gate A: []
frases realmente presentes en el fichero: [ 'en el dispositivo', 'sigue guardada' ]
```

**Fix:** no hace falta parsear el SFC. Basta con dejar de intentar acotar el bloque y
barrer todo lo que no sea `<script>`/`<style>`, o —más simple y sin falsos negativos—
barrer el fichero entero menos los comentarios:

```js
function quitarComentarios(sfc: string): string {
  return sfc
    .replace(/<!--[\s\S]*?-->/g, '')      // comentarios HTML
    .replace(/\/\*[\s\S]*?\*\//g, '')     // comentarios de bloque JS
    .replace(/^\s*\/\/.*$/gm, '')         // comentarios de línea JS
}

function regionVigilada(sfc: string): string {
  return quitarComentarios(sfc)
    .replace(/<style[\s\S]*?<\/style>/g, '')
}
```

Con eso el gate cubre también `<script setup>` (ver WR-04) y deja de depender de que
nadie use un slot con nombre. Añadir además un test de auto-verificación del propio gate
(inyectar una frase en una cadena de prueba con `<template #x>` anidado y comprobar que
el detector la ve) para que el hueco no pueda reabrirse en silencio.

---

## Warnings

### WR-01: «✓ Partida registrada» sigue respaldado por un booleano de ESCRITURA — el vecino que la ronda no endureció

**File:** `app/composables/useHistorySavedNotice.ts:60-65,115-120`,
`app/composables/usePersistedSession.ts:409-430`, `app/pages/[game]/index.vue:639`

**Issue:** La ronda ha movido el **segundo** argumento de `resolveNoticeVariant` de un
booleano de escritura a una lectura real. El **primero** sigue siendo un booleano de
escritura, y es el que sostiene la única afirmación de éxito que la app le hace al grupo:

```ts
if (historyRecorded) return 'success'        // useHistorySavedNotice.ts:61
'success': '✓ Partida registrada',           // useHistorySavedNotice.ts:116
```

`historyRecorded` es el retorno de `appendHistoryEntry` → `writeRaw` → «`setItem` no
lanzó». La cabecera de `save()` en el mismo fichero de almacenamiento ya deja escrito qué
vale ese booleano (`usePersistedSession.ts:336-339`): «eso es lo ÚNICO que afirma: no
afirma que el dato siga ahí más tarde, ni que sea legible después». «Partida registrada»
afirma justo lo segundo. Es la misma asimetría que el comentario de
`engine/history.ts:58-61` nombra como el patrón que «lleva tres rondas reabriendo esta
fase»: se endurece un lado del contrato y el vecino se queda sin revisar.

No se propone convertir esto en BLOCKER porque hoy la simetría
`isGameHistoryEntry` (escritura, `usePersistedSession.ts:419`) / `loadHistory`
(lectura, `usePersistedSession.ts:388-392`) hace que una entrada escrita sea legible en la
práctica. Pero es el hueco mejor colocado para que la ronda 6 reabra la fase, y es
barato de cerrar.

**Fix:** releer después de escribir, en la única función que puede hacerlo sin mentir:

```ts
function appendHistoryEntry(entry: GameHistoryEntry): boolean {
  // ... igual hasta writeRaw
  if (!writeRaw(HISTORY_KEY, JSON.stringify(envelope))) return false
  // D-13: el histórico es irreconstruible — «✓ Partida registrada» solo puede
  // decirse tras COMPROBAR que la entrada se lee de vuelta.
  return loadHistory().some(e => e.id === entry.id)
}
```

### WR-02: el consumidor de montaje descarta la respuesta de la autoridad — `absent` y `unknown` vuelven a colapsarse

**File:** `app/pages/[game]/index.vue:158-168`, `app/composables/useStoredProgress.ts:44-50,74-81`

**Issue:** La afirmación nº 2 de este plan dice que los dos consumidores «obtienen su
respuesta de la misma llamada a la misma función». Comparten la función, pero **no el
campo**: `onOutcomeRecorded` consume `stored` (tres valores) y `onMounted` consume
`outcome` (tres valores, pero otros):

```js
const informe = readStoredProgress(game)
if (informe.outcome === 'fresh') { resumeResolved.value = true; return }   // ← nunca mira informe.stored
```

`stored: 'absent'` y `stored: 'unknown'` producen los dos `outcome: 'fresh'`
(`useStoredProgress.ts:80` y `useStoredProgress.ts:95`), así que el consumidor de montaje
**no puede distinguir** «he comprobado el dispositivo y no hay nada» de «no he podido
comprobarlo» — que es literalmente la distinción que `StoredProgress` se creó para
imponer. La convergencia de los dos consumidores es nominal, no estructural.

Consecuencias observables, en orden de gravedad:

1. Con `stored: 'unknown'` la app presenta el mini-setup sin ninguna señal, el grupo
   empieza otra partida, y el primer `watchDebounced` que consiga escribir **machaca**
   `tga:progress:<gameId>` — destruyendo una partida que quizá seguía ahí y que solo era
   ilegible en ese instante. Es el mismo patrón que CR-01 de la ronda 3 cerró para
   `tga:history` (un fallo transitorio de lectura autorizando una escritura destructiva),
   aplicado ahora al progreso.
2. Es lo que hace posible CR-02: la app enseña el mini-setup en un estado de
   desconocimiento y el aviso enseña a leerlo como ausencia.

**Fix:** hacer que el montaje consuma `stored`, no `outcome`, y que `unknown` tenga
superficie propia:

```js
const informe = readStoredProgress(game)
if (informe.stored === 'unknown') {
  // No se ha podido leer: se deja empezar, pero sin afirmar que no había nada,
  // y sin que el autoguardado machaque lo que no se ha podido mirar.
  lecturaFallida.value = true
  resumeResolved.value = true
  return
}
```

con `lecturaFallida` cortando el autoguardado destructivo (o exigiendo una confirmación
antes del primer `save()` de la partida nueva).

### WR-03: el gate no vigila los literales de `NoticeVariant`, que es el gesto que el composable dice que persigue

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:159,177-189`,
`app/composables/useHistorySavedNotice.ts:147-155`

**Issue:** `useHistorySavedNotice.ts:150-154` afirma por escrito:

> «escribir aquí una variante a mano en vez de obtenerla de `planGameEnd` es exactamente
> el gesto que el gate de clase (`afirmacionesRespaldadas.test.ts`) persigue»

El gate no persigue ese gesto. Gate C vigila tres literales y una comparación:

```js
const LITERALES = ['\'resumable\'', '\'absent\'', '\'unknown\'']
const patronComparacion = /stored\s*===\s*'/
```

`notifyHistorySaved` es una función exportada que acepta cualquier `NoticeVariant`
(`useHistorySavedNotice.ts:155`). Un llamador nuevo puede escribir
`notifyHistorySaved('failure-recoverable')` sin leer nada del dispositivo: no contiene
ninguno de los tres literales, no compara `stored`, y si vive en un `<script setup>`
tampoco lo ve Gate A (WR-04). Los tres gates quedan verdes mientras la app afirma «la
partida sigue guardada en el dispositivo» sin haber mirado.

**Fix:** añadir los literales de variante al conjunto vigilado, con la misma lista de
excepciones auditadas:

```js
const LITERALES_VARIANTE = ['\'failure-recoverable\'', '\'failure-unrecoverable\'', '\'failure-unknown\'']
// permitidos solo en useHistorySavedNotice.ts (los define) y en los __tests__ (ya excluidos)
```

Y, mejor aún, cerrar la puerta en vez de vigilarla: hacer que `notifyHistorySaved` acepte
un `GameEndPlan` (el tipo que solo `planGameEnd` produce) en vez de una `NoticeVariant`
suelta, para que el typecheck impida construirla a mano fuera del composable.

### WR-04: Gate A no mira `<script setup>` ni ninguna copy de `.ts` fuera de `NOTICE_BODY` — IN-03 de la ronda 4 es un ejemplar vivo e invisible

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:104-119`,
`app/pages/[game]/index.vue:465-471`

**Issue:** Gate A solo inspecciona la región `<template>` (y mal, ver CR-03). Toda la copy
que un SFC calcule en `<script setup>` queda fuera del barrido, y toda la copy que viva en
un `.ts` queda fuera salvo `NOTICE_BODY`, que Gate B mira por nombre.

El ejemplar está en el repo, señalado y abierto desde la ronda 4 (IN-03):

```js
// app/pages/[game]/index.vue:469-471
const endGameBody = computed(() =>
  `Se borrará el progreso guardado (${savedSummary.value}) y volveréis a la pantalla de inicio. Esta acción no se puede deshacer.`,
)
```

Es una afirmación sobre los datos persistidos del grupo («se borrará el progreso
guardado»), es falsa en el camino de fallo (donde `planGameEnd` devuelve
`preserveProgress: true` y `clear()` no se ejecuta), vive en `<script setup>` y ninguna de
sus palabras está en `FRASES_SOBRE_LOS_DATOS_DEL_GRUPO`. Doble fallo de cobertura sobre
un caso que la fase ya tenía documentado.

Precedente del propio repo que el gate tampoco cubre: `emptyTitle`/`emptyBody` de
`statisticsView` en `useGameHistory.ts` calculan copy visible fuera del componente — el
mismo patrón, la misma invisibilidad.

**Fix:** el mismo de CR-03 (barrer el fichero entero menos comentarios y `<style>`) más
extender el barrido de copy a `app/**/*.ts` con la misma lista de frases, y ampliar
`FRASES_SOBRE_LOS_DATOS_DEL_GRUPO` con los verbos que hoy se escapan: `'se borrará'`,
`'progreso guardado'`, `'partida guardada'`, `'ya no está'`, `'no encontraréis'`.
Con esa lista ampliada, `endGameBody`, `ResumePrompt.vue:26` y
`ContentChangedNotice.vue:27` entran al gate y se auditan de una vez (los dos últimos son
legítimos y van a `FICHEROS_CON_AFIRMACION_AUDITADA` con su motivo escrito, que es
exactamente para lo que esa lista existe y hoy está vacía).

### WR-05: `HistorySavedNotice.vue` sigue documentando el contrato derogado e instruye a reintroducirlo

**File:** `app/components/HistorySavedNotice.vue:63-78`

**Issue:** El componente que pinta el aviso conserva intacto el comentario de la ronda 4:

```
El texto lo decide `resolveNoticeVariant` (useHistorySavedNotice.ts) a
partir de dos valores de retorno reales — lo que devuelve `record()`
(appendHistoryEntry) y lo que devuelve `save()` (usePersistedSession)
…
Regla para el futuro: ninguna frase que esta banda muestre puede escribirse
aquí; si hace falta una nueva, se añade como variante en el composable,
con el booleano que la respalde.
```

Las dos afirmaciones son falsas desde este plan: el segundo argumento ya no es lo que
devuelve `save()` sino `StoredProgress`, y la regla que este fichero le da al siguiente que
lo toque —«con el **booleano** que la respalde»— es la prescripción literal del BLOCKER de
la ronda 5. En un proyecto donde el comentario es la defensa principal (y donde varios
ficheros dicen explícitamente «quien vaya a cambiar esto debe leer X primero»), dejar la
instrucción derogada en pie es dejar puesta la trampa.

El fichero no estaba en el alcance de los planes 09-24…09-27, y ese es justo el problema:
la ronda cambió el contrato y no barrió quién lo documentaba.

**Fix:** reescribir el comentario apuntando a la autoridad:

```
El texto lo decide `planGameEnd` (useHistorySavedNotice.ts) a partir de DOS
preguntas distintas: si el histórico llegó a escribirse (`record()`) y qué
hay ahora mismo en el dispositivo (`readStoredProgress`, la autoridad de
lectura). Regla para el futuro: ninguna frase que esta banda muestre puede
escribirse aquí; si hace falta una nueva, se añade como variante en el
composable, respaldada por una LECTURA real — nunca por el booleano de una
escritura.
```

Y hacer un `grep` de cierre por `save()`/«booleano» en comentarios de `app/` antes de dar
la ronda por cerrada.

### WR-06: la ronda 5 ensancha la ventana sin protección que WR-10 (ronda 4) describe

**File:** `app/pages/[game]/index.vue:637-647`

**Issue:** No se reabre WR-10 (sigue abierto tal cual: `record()` no está envuelto en
`try/catch`). Lo que sí es nuevo es que esta ronda **añade tres llamadas más** dentro de la
ventana desprotegida, entre `silence()` y `notifyHistorySaved()`:

```js
silence()                                     // efecto ya ejecutado
if (session.value && game) {
  const guardado = record(session.value, outcome)      // WR-10: puede lanzar
  if (!guardado) save(session.value)                   // (blindado)
  const { stored } = readStoredProgress(game)          // NUEVO: expand() + resume() + JSON.parse
  const plan = planGameEnd(guardado, stored)           // NUEVO
  notifyHistorySaved(plan.variant)
  finishGame(plan.preserveProgress)
}
```

`readStoredProgress` llama a `expand(game, PLACEHOLDER_CONTEXT)` y a `resume()`; ninguna de
las dos declara «nunca lanza» en su cabecera del mismo modo que lo hacen las funciones de
almacenamiento. Si cualquiera de las tres líneas nuevas lanza, el resultado es el que WR-10
describe y que la doctrina VOZ-06/D-51 prohíbe: `awaitingEndConfirm` ya está en `false`, la
locución ya está cortada, el diálogo ha desaparecido, **no** hay aviso, **no** se navega a
`/` y el grupo se queda mirando el paso en curso sin ninguna señal — con la diferencia de
que ahora la partida acaba de registrarse (o no) y nadie se entera de cuál de las dos.

**Fix:** cerrar WR-10 con el alcance ampliado, no solo sobre `record()`:

```js
let guardado = false
let stored: StoredProgress = 'unknown'
try { guardado = record(session.value, outcome) } catch { guardado = false }
try { ({ stored } = readStoredProgress(game)) } catch { stored = 'unknown' }
const plan = planGameEnd(guardado, stored)
notifyHistorySaved(plan.variant)
finishGame(plan.preserveProgress)
```

`'unknown'` es el valor correcto ante una excepción de lectura: es precisamente «no he
podido comprobarlo», que es lo que ha pasado.

### WR-07: `PLACEHOLDER_CONTEXT` es un objeto de módulo mutable que se cuela dentro de las sesiones devueltas

**File:** `app/composables/useStoredProgress.ts:64,71,80`

**Issue:**

```ts
export const PLACEHOLDER_CONTEXT: SessionContext = { playerCount: 1, difficulty: 'normal' }
// ...
const structural = expand(game, PLACEHOLDER_CONTEXT)
```

`expand` guarda el `context` recibido **por referencia** (`engine/expand.ts:36`), así que
`structural.context === PLACEHOLDER_CONTEXT`. Esa sesión se devuelve al llamador en la rama
`'unknown'` (`useStoredProgress.ts:80`) y, vía `resume()`, en la rama `'fresh'` y como
`fresh.context` dentro de `contentChangedFallback` (`engine/persistence.ts:84`). Un único
objeto compartido por todas las llamadas de toda la vida de la página queda alcanzable
desde fuera del módulo, y encima exportado.

Hoy no hay corrupción: los tres setters del motor clonan
(`engine/selection.ts:87-93,107-113`) y el único camino que asigna la sesión a
`session.value` (`index.vue:165`) se salta la rama `'fresh'`. Es decir, el fallo es latente,
no vivo — pero la protección depende de que nadie escriba nunca `session.context.x = …`, y
el propio `useGameSession.ts:175` documenta que ese gesto es justo el que hay que vigilar.
Además `useStoredProgress.test.ts:65` compara contra este objeto, así que una mutación
futura degradaría el test en silencio en vez de romperlo.

**Fix:** congelar y/o construir uno nuevo por llamada:

```ts
export const PLACEHOLDER_CONTEXT: SessionContext = Object.freeze({ playerCount: 1, difficulty: 'normal' })
// y en readStoredProgress:
const structural = expand(game, { ...PLACEHOLDER_CONTEXT })
```

---

## Info

### IN-01: `readStoredProgress` se invoca también en el camino de éxito, y se descartan dos de sus tres campos

**File:** `app/pages/[game]/index.vue:641`
**Issue:** Con `guardado === true`, `resolveNoticeVariant` devuelve `'success'` sin mirar
`stored` (`useHistorySavedNotice.ts:61`), así que la lectura completa —`expand()` sobre
todo el juego, `JSON.parse`, `resume()`— se ejecuta para nada. Y en las dos ramas se tiran
`outcome` y `session` del informe.
**Fix:** `const { stored } = guardado ? { stored: 'absent' as const } : readStoredProgress(game)` no sirve
(volvería a inventar un estado). Mejor: mover la lectura dentro de `planGameEnd` como
callback perezoso, o dejarla como está y documentar el coste. No es un bug; es ruido en la
secuencia más delicada de la app.

### IN-02: la rama «JSON válido, forma inservible» de `readProgress` no tiene test propio

**File:** `app/composables/usePersistedSession.ts:311-314`, `app/composables/__tests__/usePersistedSession.test.ts:603-653`
**Issue:** El `describe` de `readProgress` cubre clave ausente, `save()` previo, JSON
corrupto, `getItem` que lanza y ausencia de `window`. No cubre el caso que el comentario
nombra explícitamente: un JSON **válido** cuya forma rechaza `isPersistedPosition` (p. ej.
`{"formatVersion":1}` sin `context`), que debe dar `{ read:'ok', position:null }`.
**Fix:** un test más, con `fakeStorage.setItem('tga:progress:x', '{"formatVersion":1}')`.

### IN-03: el segundo test de Gate C puede pasar en vacío

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:177-189`
**Issue:** El primer test de Gate C se protege con
`expect(ficherosVigilados().length).toBeGreaterThan(0)` (líneas 172-174) precisamente para
no pasar por no encontrar nada que mirar. El segundo no lleva esa guarda, así que si el
glob dejara de resolver, pasaría en verde sin una sola aserción ejecutada.
**Fix:** repetir la misma guarda, o extraerla a un `beforeAll` compartido del `describe`.

### IN-04: `createFakeLocalStorage` conserva el `Map` muerto que IN-02 (ronda 4) señaló

**File:** `app/composables/__tests__/avisoTrasRegistroFallido.test.ts:30-41`
**Issue:** IN-02 de la ronda 4 se cerró añadiendo `createFakeLocalStorageFailingAfter`
(líneas 70-86), que es la respuesta correcta. Pero el doble original sigue con
`const store = new Map()` que su propio `setItem` no puede poblar nunca — estado
inalcanzable, sin la nota que IN-02 pedía («documentar la limitación en la cabecera del
doble»).
**Fix:** una línea de comentario en la cabecera de `createFakeLocalStorage`: «`setItem`
lanza SIEMPRE, así que el `Map` nunca se puebla y `getItem` devuelve siempre `null`; para
el escenario “progreso viejo escrito + escritura caída”, usar
`createFakeLocalStorageFailingAfter`».

### IN-05: Gate C solo reconoce comillas simples, y CI no tiene paso de lint

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:159,178`, `.github/workflows/ci.yml:26-36`
**Issue:** `LITERALES` y `patronComparacion` están escritos con comilla simple literal, así
que `stored === "absent"` o `` stored === `absent` `` evaden los dos tests. No hay ningún
paso de lint en el workflow (`typecheck` → `test` → Playwright), de modo que nada del
pipeline obliga a la comilla simple: la evasión es perfectamente construible y compila.
**Fix:** normalizar antes de comparar (`contenido.replace(/["`]/g, "'")`) o usar una regex
que acepte las tres comillas. Y, aparte, añadir el paso de lint al workflow si el repo
tiene configuración de ESLint.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
