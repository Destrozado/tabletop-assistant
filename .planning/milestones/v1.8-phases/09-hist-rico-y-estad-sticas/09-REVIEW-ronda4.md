---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-13T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/components/GameOutcomeDialog.vue
  - app/components/HistorySavedNotice.vue
  - app/components/UpdateBanner.vue
  - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
  - app/composables/__tests__/useHistorySavedNotice.test.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - app/composables/useHistorySavedNotice.ts
  - app/composables/usePersistedSession.ts
  - app/pages/[game]/index.vue
findings:
  critical: 1
  warning: 10
  info: 8
  total: 19
status: issues_found
---

# Phase 09: Code Review Report (ronda 4)

**Reviewed:** 2026-09-13
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Ronda 4 (planes 09-18 … 09-23) cierra correctamente la mecánica que se propuso:
`save()` devuelve ya el booleano real de `writeRaw()`, `resolveNoticeVariant()` es una
función pura con tabla de verdad testeada, `NOTICE_HEADING`/`NOTICE_BODY` sacan la copy
del componente, y `HistorySavedNotice.vue` ya no contiene ninguna frase propia. Las
decisiones marcadas como deliberadas en el scope (orden D-U4, ausencia de `Escape`, foco
en el panel y no en un botón, autoguardado que ignora el booleano) se han respetado y no
se proponen cambios sobre ellas.

Pero el BLOCKER que la ronda se propuso cerrar **sigue abierto, invertido de signo**. La
ronda entera se construyó sobre la regla «ninguna afirmación de la interfaz sobre los
datos del grupo puede carecer de un valor de retorno real que la respalde». La variante
`failure-recoverable` cumple esa regla. La variante `failure-unrecoverable` **no**: afirma
«no hay nada que reintentar» apoyándose en `save() === false`, que solo prueba «no he
podido escribir AHORA», mientras el propio `finishGame(!guardado)` conserva deliberadamente
`tga:progress:<gameId>` — de modo que la app puede ofrecer «CONTINUAR» justo después de
haberle dicho al grupo que no queda nada. Es exactamente la misma clase de afirmación sin
respaldo que CR-01 de la ronda 3 y de la ronda 4, con el booleano puesto del otro lado.

Además, los dos arreglos de capa 40 (09-22) introducen dos consecuencias no analizadas:
las dos bandas `fixed top-0 inset-x-0 z-40` se solapan exactamente entre sí, y
`pointer-events-none` convierte «nunca bloquea la entrada» en «toques invisibles» sobre
la cabecera `h-16` de `/historico`. Y el foco restaurado en `GameOutcomeDialog` es, en
las cuatro salidas reales, un no-op sobre un nodo ya desprendido del DOM.

---

## Critical Issues

### CR-01: `failure-unrecoverable` afirma «no hay nada que reintentar» mientras la app conserva el progreso

**File:** `app/pages/[game]/index.vue:608-611`, `app/composables/useHistorySavedNotice.ts:39-42,80`

**Issue:**

```js
const guardado = record(session.value, outcome)
const progresoAsegurado = guardado ? false : save(session.value)
notifyHistorySaved(guardado, progresoAsegurado)
finishGame(!guardado)          // guardado === false  ⇒  finishGame(true)  ⇒  NO se llama a clear(gameId)
```

Con `guardado === false` y `save() === false` el grupo lee (`NOTICE_BODY['failure-unrecoverable']`):

> «Tampoco se ha podido conservar la partida en el dispositivo, así que esta vez no hay
> nada que reintentar.»

Pero `finishGame(!guardado)` es `finishGame(true)`, así que `clear(gameId)` **no se
ejecuta** (`index.vue:553`) y `tga:progress:<gameId>` se deja intacta.

`save() === false` prueba que `window.localStorage.setItem` ha lanzado **en esta llamada**
(`usePersistedSession.ts:212-224`). No prueba que la clave esté vacía. Combinación
alcanzable, y alcanzable por el escenario que la propia copy nombra («la memoria llena»):

1. Durante la partida el `watchDebounced` de `index.vue:163-171` escribe
   `tga:progress:marvel-champions` con éxito varias veces.
2. Más tarde el origen se queda sin cuota (el propio `tga:history` crece, otra pestaña
   escribe, el navegador estrecha el presupuesto).
3. Al terminar: `record()` → `false`, `save()` → `false` → variante `failure-unrecoverable`.
4. La clave de progreso **sigue ahí**, con la posición del último autoguardado que sí
   funcionó.
5. El grupo vuelve a `/`, entra otra vez en el juego y `onMounted` → `load(gameId)` →
   `resume(...)` → `outcome: 'resumed'` → **`ResumePrompt` con «CONTINUAR»**.

Resultado: la app le acaba de decir «no hay nada que reintentar» y acto seguido le ofrece
reanudar esa misma partida. La afirmación es falsa y contradice el comportamiento
observable de la propia app, que es precisamente el defecto que esta ronda existía para
cerrar. El test 2/3 de `avisoTrasRegistroFallido.test.ts` no lo atrapa porque su doble
(`createFakeLocalStorage`) lanza en `setItem` **desde la primera llamada**, de modo que
nunca existe el estado «hay un progreso viejo escrito y ahora no se puede escribir».

**Fix:** respaldar la afirmación con una lectura real, no con el resultado de la escritura.
`load()` ya distingue «hay una posición reanudable» de «no hay nada»:

```js
// app/pages/[game]/index.vue
if (session.value) {
  const guardado = record(session.value, outcome)
  // "hay algo que reintentar" = la escritura de ahora funcionó, O ya existe
  // una posición reanudable en el dispositivo de un autoguardado anterior.
  const progresoAsegurado = guardado
    ? false
    : (save(session.value) || load(gameId) !== null)
  notifyHistorySaved(guardado, progresoAsegurado)
  finishGame(!guardado)
}
```

Y añadir el test de regresión que falta (doble con `setItem` que funciona N veces y luego
lanza):

```js
it('progreso viejo escrito + setItem caído al final ⇒ recuperable, no "no hay nada que reintentar"', () => {
  // save() ok durante la partida, luego setItem lanza
  expect(save(makeSession('marvel-champions', 3))).toBe(true)
  romperSetItem()
  const historyRecorded = appendHistoryEntry(makeEntry())      // false
  const progressSecured = save(makeSession('marvel-champions', 4)) || load('marvel-champions') !== null
  expect(resolveNoticeVariant(historyRecorded, progressSecured)).toBe('failure-recoverable')
})
```

Alternativa mínima si se prefiere no leer: hacer que el comportamiento coincida con la
frase (`finishGame(progresoAsegurado)` en vez de `finishGame(!guardado)`) — pero esto
**destruye** un progreso viejo recuperable, así que es peor. La lectura es la correcta.

---

## Warnings

### WR-01: `onOutcomeRecorded` no es reentrante — una segunda invocación borra el progreso que la primera preservó

**File:** `app/pages/[game]/index.vue:593-616`

**Issue:** `onOutcomeRecorded` no tiene guarda de reentrada. `finishGame()` pone
`session.value = null` de forma **síncrona** (`index.vue:551`) y `navigateTo('/')` es
asíncrono, así que entre la primera y la segunda invocación la página sigue montada con
`session.value === null`. Una segunda entrada cae en el `else` (`index.vue:612-614`) y
llama a `finishGame()` **sin argumento** → `preserveProgress = false` → `clear(gameId)`,
destruyendo justo la clave que la primera invocación conservó adrede como red de
seguridad del reintento. Además el segundo paso no emite ningún aviso, así que el borrado
es silencioso.

Vías de reentrada: un segundo toque antes de que Vue desmonte el diálogo, un `click`
duplicado (touch + emulación de ratón), un `navigateTo` que tarde, o cualquier llamador
futuro.

**Fix:**

```js
function onOutcomeRecorded(outcome: GameOutcome) {
  if (!awaitingEndConfirm.value) return   // ya se procesó este cierre de partida
  awaitingEndConfirm.value = false
  ...
}
```

Aplicar la misma guarda a `onOutcomeDismiss` (`index.vue:623`).

### WR-02: `GameOutcomeDialog` declara `aria-modal="true"` pero no atrapa el foco — se puede avanzar la partida por detrás del diálogo

**File:** `app/components/GameOutcomeDialog.vue:83-84`

**Issue:** El diálogo se pinta sobre `fixed inset-0 z-50 bg-background` (opaco: el
contenido de debajo deja de verse) pero `StepScreen`, `NavBand`, `AppHeader` e
`IndexOverlay` siguen en el DOM, sin `inert` ni `aria-hidden`, y **siguen siendo
tabulables**. `aria-modal` solo afecta al árbol de accesibilidad; no impide `Tab`.
Un usuario de teclado que tabule más allá del último botón sale del diálogo a un
«SIGUIENTE» que no puede ver, y `Enter` ejecuta `onNext()` → `next()` + `announce()`:
la partida avanza y la app locuta con el diálogo de cierre abierto.

Esto no lo cubre la guarda de atajos: `shortcutsEnabled({ awaitingEndConfirm: ... })`
desactiva los atajos globales, pero un `Enter` sobre un botón con foco es un click real,
no un atajo. `ConfirmDialog.vue` y `WarningDetailModal.vue` tienen el mismo hueco, pero
este diálogo es el único cuyas cuatro salidas son terminales.

**Fix:** ciclar el foco dentro del panel:

```js
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !panel.value) return
  const focusables = panel.value.querySelectorAll<HTMLElement>('button:not([disabled])')
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
```

(`WarningDetailModal.vue:43,47` ya usa exactamente este patrón de alta/baja de listener.)

### WR-03: la restauración de foco de `GameOutcomeDialog` es inalcanzable en las cuatro salidas reales

**File:** `app/components/GameOutcomeDialog.vue:75-79`

**Issue:** `previouslyFocused` es, en la práctica, el botón «Partida terminada» de
`IndexOverlay`. Las cuatro salidas del diálogo (`onOutcomeRecorded` / `onOutcomeDismiss`)
ponen `isIndexOpen.value = false` **en la misma invocación** que cierra el diálogo, así
que `IndexOverlay` y `GameOutcomeDialog` se desmontan en el mismo flush. Cuando
`onUnmounted` ejecuta `previouslyFocused.focus()`, el nodo ya está desprendido del DOM y
`focus()` es un no-op: el foco cae en `<body>`. Y acto seguido `navigateTo('/')` monta
otra pantalla. El comentario de las líneas 53-56 («el foco vuelve a donde estaba al
cerrarse») describe un comportamiento que ningún camino de la app produce, así que el
bloque es código muerto que además deja al usuario de teclado sin punto de foco en la
pantalla de destino.

**Fix:** o bien comprobar que el nodo sigue conectado y documentar que esto solo protege
a llamadores futuros:

```js
onUnmounted(() => {
  if (previouslyFocused?.isConnected) previouslyFocused.focus()
})
```

o bien resolver el problema real: dar foco a un destino en `/` (p. ej. el `<h1>` de
`GameSelectorScreen` con `tabindex="-1"`) tras la navegación.

### WR-04: `UpdateBanner` y `HistorySavedNotice` se solapan exactamente — misma posición, mismo z-index, sin coordinación

**File:** `app/components/UpdateBanner.vue:41-44`, `app/components/HistorySavedNotice.vue:58-61`, `app/app.vue:23-33`

**Issue:** Las dos bandas son ahora `fixed top-0 inset-x-0 z-40` con fondo opaco
(`bg-surface`) y se montan como hermanas dentro del mismo `<ClientOnly>`. Si las dos están
visibles a la vez ocupan **exactamente el mismo rectángulo**: `HistorySavedNotice` va
después en el DOM, así que tapa por completo a `UpdateBanner`, incluyendo su CTA
«Actualizar» y su `✕`. Los comentarios de ambas bandas analizan con detalle el
apilamiento frente a `ResumePrompt`/`ContentChangedNotice` pero **no se analizan la una
a la otra**, pese a que el propio comentario dice «el hallazgo WR-05(b) nombra a las dos».

Combinación alcanzable y nada exótica: el service worker detecta una versión nueva a
media partida (`registerType: 'prompt'` la deja visible hasta que se descarte), el grupo
sigue jugando y termina la partida → `navigateTo('/')` con las dos bandas activas. Si la
que queda debajo es el aviso de histórico, el grupo pierde **el único resultado
observable del gesto «terminar partida»** (incluido el aviso de fallo de guardado).

**Fix:** decidir una prioridad explícita en vez de dejarla al orden del DOM. Lo más simple
es apilarlas verticalmente con un contenedor único:

```html
<!-- app/app.vue -->
<div class="fixed top-0 inset-x-0 z-40 flex flex-col pointer-events-none">
  <UpdateBanner />
  <HistorySavedNotice />
</div>
```
quitando `fixed top-0 inset-x-0 z-40` de cada banda. Alternativa: que `UpdateBanner` no se
pinte mientras `useHistorySavedNotice().variant !== null`.

### WR-05: `pointer-events-none` convierte «nunca bloquea la entrada» en toques invisibles sobre la cabecera de `/historico`

**File:** `app/components/HistorySavedNotice.vue:60`, `app/components/UpdateBanner.vue:43`

**Issue:** El contenedor deja pasar los toques, pero **sigue tapando visualmente** lo que
hay debajo. `/historico` (`app/pages/historico.vue:40-57`) tiene una cabecera `h-16` con
«Volver» arriba a la izquierda y «Estadísticas» arriba a la derecha — exactamente la
franja que la banda ocupa. La banda de fallo dura 20 s (`FAILURE_AUTO_DISMISS_MS`), y el
gesto más probable justo después de registrar una partida es ir a `/` → «Histórico».
Durante esos segundos, un toque sobre el texto de la banda **activa un botón que no se
ve**: el grupo cree tocar el aviso y acaba navegando a `/estadisticas` o volviendo a `/`.

`pointer-events-none` no tiene ninguna consecuencia sobre el anuncio de `aria-live`
(la región viva de la línea 28 está fuera y funciona bien), pero sí sobre el hit-testing,
que es donde está el daño.

**Fix:** no basta con dejar pasar los toques; hay que dejar de tapar. Empujar el contenido
de debajo con un espaciador reservado, o —más barato y suficiente— devolver
`pointer-events-auto` al contenedor y añadir `padding-top` a las pantallas mientras haya
banda visible. Si se mantiene `pointer-events-none`, al menos limitar la banda al ancho
que no solapa controles (`max-w-[…] mx-auto` centrada) para que los extremos de la
cabecera sigan visibles.

### WR-06: el camino de reintento que el aviso anuncia registra una duración inflada

**File:** `app/composables/useHistorySavedNotice.ts:79`, `engine/history.ts:77-83`

**Issue:** `NOTICE_BODY['failure-recoverable']` instruye: «Volved a entrar en ella y
pulsad "Partida terminada" otra vez para reintentar el registro». Ese reintento pasa por
`resume()`, que restaura `persisted.context` tal cual, y `startedAt` vive dentro de
`SessionContext` (`engine/types.ts:171`, `useGameSession.ts:143`), así que se persiste con
el resto del contexto. `buildHistoryEntry` calcula `durationMs = now - context.startedAt`
con `now = Date.now()` **en el momento del reintento**. Si el grupo reintenta al día
siguiente (que es justo lo que el aviso les invita a hacer), la partida queda registrada
con `durationMs` de más de 24 h y `recordedAt` del día equivocado. `/estadisticas` agrega
sobre esos valores.

**Fix:** congelar el instante del desenlace la primera vez que se intenta registrar y
persistirlo, o marcar la duración como no fiable en el reintento:

```js
// al fallar el registro, sellar el fin de partida en el context antes de save()
const sellada = { ...session.value, context: { ...session.value.context, endedAt: Date.now() } }
const progresoAsegurado = save(sellada)
```
y hacer que `buildHistoryEntry` prefiera `context.endedAt` sobre `now` cuando exista.
Como mínimo, documentarlo como limitación conocida en `deferred-items.md` — hoy no está
en ningún sitio.

### WR-07: los tres botones de resultado son `bg-surface` sobre un panel `bg-surface` — sin borde ni relleno que los distinga

**File:** `app/components/GameOutcomeDialog.vue:84,100,112,124`

**Issue:** El panel es `bg-surface p-2xl` y los tres botones de registro son también
`bg-surface text-primary-text`, sin `border`, sin `bg-accent`, sin ningún token que los
separe del fondo (`--color-surface: #1E212B` en ambos casos). Visualmente son tres líneas
de texto en negrita sobre el mismo color, sin afordancia de botón, en la única pantalla
donde se registra una partida y con la restricción de proyecto «legible a un brazo de
distancia» en una tablet.

El precedente de `ConfirmDialog.vue` no lo justifica: allí `bg-surface` es el botón
**secundario** («Cancelar») y el primario lleva `bg-accent`/`bg-destructive`. Aquí no hay
ningún botón con relleno. D-02 exige que los tres tengan **el mismo peso visual entre
sí** — no que no se vean.

**Fix:** dar afordancia idéntica a los tres sin jerarquizarlos, p. ej.
`border-2 border-secondary-text` o `bg-background` sobre el panel `bg-surface`:

```html
class="min-h-12 px-lg bg-background border-2 border-transparent text-primary-text text-body font-bold transition-transform duration-75 focus-visible:border-accent"
```

### WR-08: la distinción cromática éxito/fallo depende de `::first-letter` aplicado a un glifo que no es una letra

**File:** `app/components/HistorySavedNotice.vue:79-84`

**Issue:** `:class="variant === 'success' ? 'first-letter:text-accent' : 'first-letter:text-warning'"`
sobre un `<h2>` cuyo primer carácter es `✓` (U+2713) o `⚠` (U+26A0). Ambos son categoría
Unicode `So` (Symbol, other), no `Ps/Pe/Pi/Pf/Po`; la definición de `::first-letter` en
CSS solo incluye puntuación antes de la primera letra, así que el comportamiento con un
símbolo inicial no está garantizado y difiere entre motores. Si el pseudo-elemento no
aplica, las dos variantes de encabezado se pintan en `text-primary-text` idéntico y la
única diferencia entre «registrada» y «no se pudo guardar» queda en un glifo pequeño.
No hay ningún test ni comprobación manual registrada que verifique que el color se aplica
en Safari de iPad, que es el dispositivo objetivo.

**Fix:** no depender de `::first-letter`; envolver el glifo en su propio `<span>`:

```html
<h2 class="text-heading font-bold text-primary-text">
  <span :class="variant === 'success' ? 'text-accent' : 'text-warning'" aria-hidden="true">
    {{ variant === 'success' ? '✓' : '⚠' }}
  </span>
  {{ heading }}
</h2>
```
(separando el glifo de `NOTICE_HEADING`, que pasaría a ser solo texto).

### WR-09: el punto exacto que esta ronda vino a arreglar no tiene ni un test

**File:** `app/pages/[game]/index.vue:593-616`

**Issue:** Toda la cobertura nueva vive en las dos piezas puras
(`resolveNoticeVariant`, `save`), y `avisoTrasRegistroFallido.test.ts` reconoce
explícitamente que el defecto vivía «en la costura entre lo que uno escribe y lo que el
otro afirma» — pero esa costura es `onOutcomeRecorded`, y ese archivo no la toca: recompone
a mano `appendHistoryEntry` + `save` + `resolveNoticeVariant` en el orden que el test
elige, no en el que la página ejecuta. Nada verifica que:

- el orden D-U4 (`silence()` → `record()` → `save()` → `notifyHistorySaved()` → `finishGame()`) se mantenga,
- `progresoAsegurado` sea `guardado ? false : save(...)` y no al revés,
- `finishGame(!guardado)` reciba el booleano correcto,
- la rama `session.value === null` no emita aviso.

Todo eso está protegido solo por comentarios. El fichero que el equipo ya declara como
«segunda costura reactiva» es exactamente donde CR-01 (ronda 4) y CR-01 (esta ronda) han
aparecido las dos veces.

**Fix:** extraer la secuencia a una función pura testeable y dejar en la página solo el
cableado:

```ts
// app/composables/useGameEndOutcome.ts
export function planGameEnd(historyRecorded: boolean, progressWriteOk: boolean, progressOnDevice: boolean) {
  const progressSecured = historyRecorded ? false : (progressWriteOk || progressOnDevice)
  return {
    variant: resolveNoticeVariant(historyRecorded, progressSecured),
    preserveProgress: !historyRecorded,
  }
}
```
y testear `planGameEnd` contra las cuatro combinaciones × `progressOnDevice`.

### WR-10: la secuencia crítica de cierre de partida no tiene red ante una excepción

**File:** `app/pages/[game]/index.vue:605-615`

**Issue:** `save()`, `clear()` y `writeRaw()` están todos blindados con `try/catch`
(`usePersistedSession.ts:175-234`), pero `record()` no lo está de extremo a extremo:
`appendHistoryEntry` captura el fallo de `setItem`, no el de `JSON.stringify(envelope)`
(que puede lanzar `RangeError: Invalid string length` con un histórico muy grande), ni el
de `getCatalogue`/`buildHistoryEntry`. Si `record()` lanza, la ejecución aborta **después**
de `awaitingEndConfirm.value = false` y `silence()`, y **antes** de `notifyHistorySaved()`
y `finishGame()`: el diálogo se cierra, no aparece ningún aviso, la partida no termina y
no se navega a ningún sitio. El grupo se queda mirando el paso en curso sin ninguna señal
de qué ha pasado — el resultado que la doctrina VOZ-06/D-51 de todo el fichero prohíbe.

**Fix:**

```js
let guardado = false
try { guardado = record(session.value, outcome) }
catch { guardado = false }   // un fallo inesperado se trata como "no registrado"
```

---

## Info

### IN-01: import `beforeEach` sin usar

**File:** `app/composables/__tests__/avisoTrasRegistroFallido.test.ts:16`
**Issue:** `beforeEach` se importa pero el fichero no lo invoca en ningún sitio (solo usa `afterEach`).
**Fix:** `import { afterEach, describe, expect, it } from 'vitest'`.

### IN-02: `store` muerto dentro de `createFakeLocalStorage`

**File:** `app/composables/__tests__/avisoTrasRegistroFallido.test.ts:23-34`
**Issue:** `setItem` siempre lanza, así que el `Map` nunca recibe nada y `getItem` siempre devuelve `null`. El doble tiene estado que no puede cambiar, lo que oculta que este doble **no puede** representar el escenario «progreso viejo escrito + escritura caída» (ver CR-01).
**Fix:** documentar la limitación en la cabecera del doble y añadir la variante que sí permita sembrar valores antes de romper `setItem`.

### IN-03: `endGameBody` afirma un borrado que el camino de fallo no ejecuta

**File:** `app/pages/[game]/index.vue:466-468`, `app/components/GameOutcomeDialog.vue:93-95`
**Issue:** «Se borrará el progreso guardado (…). Esta acción no se puede deshacer» se muestra siempre, pero con `guardado === false` el progreso se conserva a propósito. La contradicción va en la dirección segura (se promete más destrucción de la que ocurre), pero sigue siendo una afirmación que el código no siempre cumple.
**Fix:** reformular en condicional («Volveréis a la pantalla de inicio y el progreso guardado se borrará una vez registrada la partida»).

### IN-04: comprobación redundante de `focus`

**File:** `app/components/GameOutcomeDialog.vue:76`
**Issue:** `typeof previouslyFocused.focus === 'function'` es redundante: `previouslyFocused` solo se asigna tras `document.activeElement instanceof HTMLElement` (línea 71), y todo `HTMLElement` tiene `focus`.
**Fix:** `if (previouslyFocused) previouslyFocused.focus()` (o la versión con `isConnected` de WR-03).

### IN-05: estado de módulo sin punto de reinicio explícito

**File:** `app/composables/useHistorySavedNotice.ts:48-49`
**Issue:** El `ref` y el `timeoutId` viven en el ámbito del módulo (justificado por escrito, y correcto para el caso de dos llamadores). Hoy es seguro en prerender porque nadie escribe durante SSR y la banda va dentro de `<ClientOnly>`, pero no hay ningún `reset()` para tests distinto de `dismissHistorySavedNotice()`, ni ninguna nota de que el temporizador sobrevive a HMR.
**Fix:** exportar un `__resetHistorySavedNoticeForTests()` explícito y dejar constancia en el comentario de por qué el estado es seguro bajo `nuxt generate`.

### IN-06: `UpdateBanner` no tiene región viva

**File:** `app/components/UpdateBanner.vue:41-44`
**Issue:** `HistorySavedNotice` recibió el arreglo de `role="status"`/`aria-live` permanente en WR-05 (ronda 3); `UpdateBanner`, que WR-05(b) nombra junto a ella, solo recibió la mitad de maquetación en 09-22. Su aparición no se anuncia a ningún lector de pantalla.
**Fix:** envolver el `v-if` en un `<div role="status" aria-live="polite">` permanente, igual que `HistorySavedNotice.vue:28`.

### IN-07: el estado de pulsado se queda pegado si el dedo/ratón sale del botón

**File:** `app/components/GameOutcomeDialog.vue:102-105,114-117,126-129`
**Issue:** `@mousedown`/`@touchstart` activan el feedback pero solo `@mouseup`/`@touchend` lo desactivan. Un `mousedown` seguido de soltar fuera del botón, o un `touchcancel` (scroll dentro del panel `overflow-y-auto`), deja el botón visualmente pulsado de forma permanente. Es el mismo patrón que `ConfirmDialog.vue`, así que el defecto es heredado, no introducido aquí.
**Fix:** añadir `@mouseleave` y `@touchcancel` a los tres botones (y al precedente).

### IN-08: `tabindex="-1"` en el panel y no en el elemento `role="dialog"`

**File:** `app/components/GameOutcomeDialog.vue:83-84`
**Issue:** `aria-labelledby` está en el `div[role=dialog]` (línea 83) pero el foco inicial va a un `div` genérico hijo (línea 84). Varios lectores de pantalla anuncian el nombre y el rol del diálogo al recibir foco el propio elemento con `role="dialog"`; con el foco en un hijo sin rol el anuncio depende del modo de exploración. La decisión de D-02 (no enfocar ningún botón) se mantiene igual moviendo el `tabindex`.
**Fix:** poner `ref="panel" tabindex="-1"` en el `div[role=dialog]` de la línea 83 y quitarlos del hijo.

---

_Reviewed: 2026-09-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
