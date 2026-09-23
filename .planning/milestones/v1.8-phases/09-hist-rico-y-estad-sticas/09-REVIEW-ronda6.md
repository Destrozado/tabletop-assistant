---
phase: 09-hist-rico-y-estad-sticas
reviewed: 2026-09-14T12:50:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - app/components/HistorySavedNotice.vue
  - app/components/MiniSetupScreen.vue
  - app/composables/__tests__/afirmacionesRespaldadas.test.ts
  - app/composables/__tests__/avisoTrasRegistroFallido.test.ts
  - app/composables/__tests__/useHistorySavedNotice.test.ts
  - app/composables/__tests__/useProgressMountPlan.test.ts
  - app/composables/__tests__/useStoredProgress.test.ts
  - app/composables/useHistorySavedNotice.ts
  - app/composables/useProgressMountPlan.ts
  - app/composables/useStoredProgress.ts
  - app/pages/[game]/index.vue
findings:
  critical: 3
  warning: 9
  info: 6
  total: 18
status: issues_found
---

# Phase 09: Code Review Report (ronda 6)

**Reviewed:** 2026-09-14
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Lo que la ronda 6 dice haber hecho, lo ha hecho, y se comprueba línea a línea:
`readStoredProgress` acepta `esperada` y produce `'stale'` (`useStoredProgress.ts:131-177`),
`esLaMismaPartida` excluye `updatedAt` por escrito y normaliza el `context` sin indexar
nunca por una clave no fiable (`useStoredProgress.ts:93-119`), `planProgressMount` es total
sobre los cuatro estados con guarda `never` (`useProgressMountPlan.ts:50-80`), el montaje ya
distingue `'absent'` de `'unknown'` y le da superficie propia
(`index.vue:176-189`, `MiniSetupScreen.vue:72-78`), `onOutcomeRecorded` envuelve `record()` y
`readStoredProgress()` en sendos `try/catch` (`index.vue:683-709`), y el gate de clase ya no
acota el bloque: barre el fichero entero menos comentarios y `<style>`, también `.ts`, y se
auto-verifica con SFC sintéticos. 441 tests en verde (`npx vitest run app/composables/__tests__`).

**Y aun así la clase sigue abierta, con la octava cara — esta vez dentro de la propia copy
que la ronda 6 escribió para cerrar la séptima.** `esLaMismaPartida` contesta «¿son
idénticos estos seis campos?». La frase que esa respuesta selecciona afirma tres cosas más
específicas: que lo que queda es *esta* partida, que es *anterior*, y que su *ronda* no es
la ronda en la que terminaron. Ninguna de las tres la establece la comparación — y la
tercera es literalmente falsa en el escenario canónico que el propio plan construyó (test 5
de `avisoTrasRegistroFallido.test.ts`: `cursor 2` frente a `cursor 3`, `round: 1` en ambos).
Es la misma forma exacta de las siete caras anteriores: el respaldo mide algo distinto de lo
que la frase dice.

La segunda cara viva está en `endGameBody`, la frase que el plan 09-30 reescribió
«para ser cierta en las cuatro salidas». Se verificó `preserveProgress` rama por rama, pero
la frase promete además un **reintento** («la app conservará el progreso para que podáis
reintentarlo») que dos de los cuatro estados del dispositivo contradicen: en `'absent'` el
aviso posterior dice «no hay nada que reintentar», y en `'stale'` el aviso posterior
deliberadamente *no* ordena el reintento porque hacerlo escribiría datos ajenos en el
histórico. El motivo escrito en `AFIRMACIONES_AUDITADAS` para ese fichero afirma que la
frase es cierta en las cuatro salidas; no lo es.

Sobre los tres puntos que el encargo pedía mirar de cerca:

1. **Copy sin respaldo** — dos hallazgos vivos (CR-01, CR-02), ambos en texto nuevo de esta
   ronda.
2. **Evasión del gate** — el gate es mucho mejor que el de la ronda 5, pero sigue siendo
   evadible por tres vías construibles y una accidental: un salto de línea dentro de la copy
   (WR-01), el literal `'success'` que Gate C no vigila (WR-02), `NOTICE_HEADING` que no
   vigila ni Gate A ni Gate B (WR-03), y el vocabulario cerrado de 11 subcadenas, del que
   `endGameBody` ya se sale hoy (WR-04). Gate S no puede detectar ninguna de ellas porque
   auto-verifica `regionVigilada`, no la decisión de Gate A (WR-05).
3. **Motivos escritos en `AFIRMACIONES_AUDITADAS`** — cuatro de las cinco entradas tienen un
   motivo real y comprobable. La de `index.vue` afirma un hecho falso (CR-02), y la lista
   hermana `FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO` conserva una entrada
   marcada `TODO(09-30)` como «provisional» que el plan 09-30 no llegó a convertir en
   definitiva (WR-10).
4. **Ventana de cierre de partida** — `onOutcomeRecorded` está bien blindado y no encuentro
   camino por el que el grupo se quede mirando el paso en curso. El montaje es la cara que
   quedó sin blindar (WR-06).

---

## Critical Issues

### CR-01: `failure-stale` afirma una diferencia de ronda que `esLaMismaPartida` no comprueba — y es falsa en el escenario canónico del propio plan

**File:** `app/composables/useHistorySavedNotice.ts:162`, `app/composables/useStoredProgress.ts:110-119`,
`app/composables/__tests__/avisoTrasRegistroFallido.test.ts:201-254`,
`app/composables/__tests__/useStoredProgress.test.ts:229-245`

**Issue:**

La única comprobación que respalda la variante es ésta:

```ts
// app/composables/useStoredProgress.ts:110-119
export function esLaMismaPartida(enDisco, objetivo): boolean {
  return enDisco.gameId === objetivo.gameId
    && enDisco.contentVersion === objetivo.contentVersion
    && enDisco.formatVersion === objetivo.formatVersion
    && enDisco.runtimeId === objetivo.runtimeId
    && enDisco.round === objetivo.round
    && JSON.stringify(normalizar(enDisco.context)) === JSON.stringify(normalizar(objetivo.context))
}
```

Es una comprobación de **desigualdad sobre seis campos**: cuando devuelve `false`, lo único
establecido es «al menos uno de estos seis difiere». No dice cuál, no dice en qué dirección,
y no dice que lo de disco pertenezca a la misma partida.

La frase que esa respuesta selecciona afirma tres hechos más:

> «En el dispositivo solo queda **una versión anterior de esta partida** —**no la ronda en la
> que habéis terminado**—, así que volver a entrar y registrarla desde ahí guardaría en el
> histórico datos que no son los de esta partida. **Suele deberse al modo privado del
> navegador o a la memoria llena.**»

Rama por rama:

- **«no la ronda en la que habéis terminado»** — falso siempre que la diferencia esté en
  `runtimeId` (cursor), que es el caso **normal** y el que el plan construyó como escenario
  canónico. En `avisoTrasRegistroFallido.test.ts:201-254` el disco tiene `{ ...base, cursor: 2 }`
  y la partida que termina es `{ ...base, cursor: 3 }`; `expand()` fija `round: 1`
  (`engine/expand.ts:36`) y ningún `{ ...base, cursor: n }` la cambia. La ronda de disco **es
  exactamente** la ronda en la que terminaron. El test afirma `'failure-stale'` en verde sin
  mirar el texto que esa variante pinta.
- **«una versión anterior»** — nada compara instantes. `updatedAt` está excluido de la
  comparación por escrito (`useStoredProgress.ts:107-109`), así que la función no puede saber
  si lo de disco es anterior o posterior. Con dos pestañas abiertas sobre el mismo `gameId`,
  lo de disco es **posterior**.
- **«de esta partida»** — `runtimeId` identifica un **paso**, no una instancia de partida.
  Dos pestañas jugando el mismo `gameId` comparten la clave `tga:progress:<gameId>`: lo que
  queda puede ser otra partida entera, no una versión de ésta.
- **«Suele deberse al modo privado o a la memoria llena»** — falso en la rama de
  `contentVersion`, que el propio `useStoredProgress.test.ts:229-245` ejercita: ahí el
  desajuste lo produce un despliegue de contenido nuevo a media partida, no el
  almacenamiento.

Es la octava cara: respaldo que mide «seis campos difieren», frase que afirma «ronda
distinta de la misma partida, por culpa del almacenamiento».

**Fix:** que la frase no afirme más de lo que la comparación establece. Opción mínima —
reescribir el cuerpo:

```ts
'failure-stale': 'La partida no se ha registrado. Lo que queda guardado en el dispositivo para este juego no coincide con la partida que acabáis de terminar, así que registrarla desde ahí guardaría en el histórico datos que no son los de esta partida.',
```

Y, si se quiere conservar el detalle «ronda distinta», que deje de ser prosa y pase a ser
dato: que `esLaMismaPartida` devuelva **qué** campo difirió (p. ej.
`{ iguales: false, motivo: 'round' | 'runtimeId' | 'context' | 'contentVersion' | ... }`) y
que la copy se elija a partir de ese motivo, con un test por motivo. Añadir además un test
que fije el texto: en el montaje del test 5, `NOTICE_BODY[variante]` **no** puede contener
«no la ronda».

---

### CR-02: `endGameBody` promete un reintento que dos de los cuatro estados del dispositivo contradicen — y su motivo auditado afirma lo contrario

**File:** `app/pages/[game]/index.vue:510-512`,
`app/composables/useHistorySavedNotice.ts:163`,
`app/composables/__tests__/afirmacionesRespaldadas.test.ts:119-125`

**Issue:**

```js
// app/pages/[game]/index.vue:510-512
const endGameBody = computed(() =>
  `El progreso guardado de esta partida (${savedSummary.value}) se borrará y volveréis a la pantalla de inicio. Si el registro en el histórico falla, la app conservará el progreso para que podáis reintentarlo.`,
)
```

El comentario que la acompaña (`index.vue:492-509`) hace la comprobación de veracidad rama
por rama… **de `preserveProgress`**, no de la frase. Y la frase dice dos cosas, no una:

1. «la app conservará el progreso» → cierto: `planGameEnd(false, stored).preserveProgress`
   es `true` en los cuatro estados, así que `clear()` no se llama. Sin objeción.
2. «**para que podáis reintentarlo**» → **falso en dos de los cuatro estados**:
   - `stored === 'absent'` → el aviso inmediatamente posterior dice literalmente «esta vez
     **no hay nada que reintentar**» (`useHistorySavedNotice.ts:163`). No hay nada que
     conservar y no hay reintento posible: la clave puede no haberse escrito nunca (modo
     privado/cuota), que es justo el defecto que cerró la ronda 4.
   - `stored === 'stale'` → el aviso posterior **prohíbe de hecho** el reintento, porque
     hacerlo escribe en el histórico —el único dato irreconstruible (D-13)— los datos de
     otro autoguardado. `failure-stale` es la única variante de fallo que a propósito no
     ordena reintentar (`useHistorySavedNotice.ts:139-146`).

O sea: el diálogo promete el reintento **antes** de pulsar, y el aviso lo desmiente o lo
prohíbe **tres segundos después**. Es exactamente la contradicción de dos superficies sobre
el mismo dato que el BLOCKER de la ronda 5 describía entre el aviso y `ResumePrompt`.

Agravante: el motivo escrito de la excepción auditada afirma lo contrario de lo que ocurre.

```ts
// app/composables/__tests__/afirmacionesRespaldadas.test.ts:122-125
// `endGameBody`: reescrito en la Task 2 de este mismo plan (09-30) para
// ser cierto en las cuatro salidas de <GameOutcomeDialog> — ver el
// comentario que acompaña a `endGameBody` en este fichero.
'app/pages/[game]/index.vue': ['se borrará', 'progreso guardado'],
```

Un motivo escrito que afirma un hecho falso es peor que no tener excepción: sella el hueco
con un sello de verificado. Es el punto 3 del encargo de esta ronda.

**Fix:** retirar la promesa de reintento del diálogo, que se emite **antes** de conocer el
estado del dispositivo y por tanto no puede respaldarla:

```js
const endGameBody = computed(() =>
  `El progreso guardado de esta partida (${savedSummary.value}) se borrará y volveréis a la pantalla de inicio. Si el registro en el histórico falla, la app no lo borrará y os dirá qué hacer.`,
)
```

(«os dirá qué hacer» sí es cierto en las cuatro: las cuatro variantes de fallo tienen
cuerpo propio.) Y corregir el motivo de `AFIRMACIONES_AUDITADAS` para que describa la
comprobación que de verdad se hizo (`preserveProgress`), no una que no se hizo.

---

### CR-03: `'stale'` deja armada la trampa que su propio aviso denuncia: `ResumePrompt` vuelve a ofrecer el snapshot ajeno sin ninguna marca, y la única advertencia se autocierra a los 20 s en otra pantalla

**File:** `app/composables/useHistorySavedNotice.ts:89-94`, `app/composables/useProgressMountPlan.ts:52-64`,
`app/pages/[game]/index.vue:186`, `app/composables/useHistorySavedNotice.ts:35`

**Issue:**

La cadena completa, tal como queda tras esta ronda:

1. `planGameEnd(false, 'stale').preserveProgress` es `true` (`useHistorySavedNotice.ts:92`):
   el snapshot ajeno se **conserva**.
2. `notifyHistorySaved('failure-stale')` pinta el aviso en `/`, con autocierre a los
   `FAILURE_AUTO_DISMISS_MS = 20000` (`useHistorySavedNotice.ts:35`).
3. El grupo vuelve a entrar en el juego. `onMounted` llama a `readStoredProgress(game)` **sin
   `esperada`** (`index.vue:176`, correcto y documentado), así que `'stale'` es inalcanzable
   allí: el informe dice `'resumable'`.
4. `planProgressMount` devuelve `resume-prompt` y `ResumePrompt` se pinta con
   `savedSummary` — «Partida guardada … CONTINUAR» — **sin ninguna traza** de que ese
   progreso ya se identificó como ajeno a la partida que terminó.
5. Un toque en «Partida terminada» escribe en el histórico la ronda y la selección de
   héroes/villano del autoguardado anterior. El histórico es el único dato que no se puede
   reconstruir (D-13).

El código lo sabe y lo dice por escrito (`useStoredProgress.ts:46-53`), pero la única
mitigación construida es una banda informativa que se autocierra sola en 20 segundos, en una
pantalla distinta de aquella donde se toma la decisión peligrosa. Peor: las otras tres
variantes de fallo **entrenan** al grupo a hacer exactamente ese gesto («Volved a entrar en
ella y pulsad “Partida terminada” otra vez»), así que el camino de menor resistencia lleva
directo a la corrupción.

`preserveProgress: true` para `'stale'` está bien razonado (`useHistorySavedNotice.ts:78-83`:
«no borrar es siempre el lado seguro»), pero conservar el dato y **volver a ofrecerlo sin
marca** no son la misma decisión, y aquí se han tomado como si lo fueran.

**Fix:** que el hallazgo sobreviva al aviso. Mínimo viable sin tocar el histórico: al
detectar `'stale'` en `onOutcomeRecorded`, escribir una marca junto al progreso (un campo
`registroPendienteDeOtraPartida: true` en `PersistedPosition`, o una clave hermana
`tga:progress-stale:<gameId>`), y que `planProgressMount` la traduzca a un aviso persistente
dentro de `ResumePrompt` («este progreso no es el de la última partida que terminasteis; si
lo registráis, el histórico guardará datos de antes»). Alternativa más barata si se acepta
la deuda: dejarlo documentado como deuda **explícita** en `09-VERIFICATION.md` con el gesto
concreto que la produce, en vez de darse por cerrado con la variante de copy.

---

## Warnings

### WR-01: Gate A se evade con un salto de línea — el barrido compara subcadenas sobre el fuente crudo, sin normalizar espacios

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:94-98,245-265`
**Issue:** `contieneFraseSobreLosDatosDelGrupo` hace `region.toLowerCase().includes(frase)`.
`regionVigilada` quita comentarios y `<style>`, pero **no normaliza espacios en blanco**. En
HTML, el texto de un párrafo se colapsa al renderizar, así que estas dos son idénticas para
el grupo y distintas para el gate:

```html
<p>La partida sigue guardada en el dispositivo.</p>          <!-- gate ROJO -->
<p>
  La partida sigue guardada
  en el dispositivo.
</p>                                                          <!-- gate VERDE -->
```

No hace falta mala fe: basta con que alguien —o un formateador— parta una línea de copy
larga. Hoy toda la copy vigilada del repo vive en una sola línea por pura convención, y nada
la obliga (IN-05 de la ronda 5 dejó constancia de que el workflow de CI no tiene paso de
lint).
**Fix:** normalizar antes de comparar, en `regionVigilada` o en el comparador:

```ts
function contieneFraseSobreLosDatosDelGrupo(region: string, frase: string): boolean {
  const normalizar = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
  return normalizar(region).includes(normalizar(frase))
}
```

Y añadir a Gate S un SFC sintético con la frase partida en dos líneas.

---

### WR-02: Gate C no vigila el literal `'success'` — el más peligroso de fabricar a mano

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:380`
**Issue:**

```ts
const LITERALES_VARIANTE = ['\'failure-recoverable\'', '\'failure-stale\'', '\'failure-unrecoverable\'', '\'failure-unknown\'']
```

Faltan `'success'` (y, por coherencia, el tipo entero). El test existe porque
`useHistorySavedNotice.ts:167-174` dice que «escribir aquí una variante a mano en vez de
obtenerla de `planGameEnd` es exactamente el gesto que el gate persigue» — pero un llamador
futuro puede escribir `notifyHistorySaved('success')` sin haber llamado a `record()` ni haber
leído nada, y los cuatro tests de Gate C siguen en verde. `'success'` pinta
«✓ Partida registrada» (`useHistorySavedNotice.ts:119`): es precisamente la afirmación que más
daño hace si es falsa, porque el grupo deja de mirar el histórico.
**Fix:** añadir `'success'` a `LITERALES_VARIANTE`. Si `resolveAutoDismissMs('success')` en
los tests molesta, el filtro de `/__tests__/` ya los excluye del barrido.

---

### WR-03: `NOTICE_HEADING` no lo vigila ni Gate A ni Gate B — la excepción auditada delega en un gate que no lo mira

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:127-139,268-276`,
`app/composables/useHistorySavedNotice.ts:118-124`
**Issue:** El motivo escrito de la excepción de `useHistorySavedNotice.ts` dice que auditarla
en Gate A «sería circular — la garantía real la da Gate B». Pero Gate B solo recorre
`NOTICE_BODY`:

```ts
for (const [variante, cuerpo] of Object.entries(NOTICE_BODY)) { ... }
```

`NOTICE_HEADING` (cinco cadenas visibles, la primera línea que el grupo lee, en negrita y
tamaño `text-heading`) no lo mira nadie. Y la excepción de Gate A para ese fichero lista cinco
frases (`'en el dispositivo'`, `'sigue guardada'`, `'nada que reintentar'`,
`'no se ha perdido'`, `'no encontraréis'`), así que un titular como
`'⚠ La partida sigue guardada'` pasa Gate A por excepción y Gate B por no existir. Hueco
real, y creado por el propio texto de la auditoría.
**Fix:** que Gate B recorra `{ ...NOTICE_HEADING, ...NOTICE_BODY }` (o dos bucles con el mismo
criterio), y ajustar el motivo escrito para que diga «Gate B audita `NOTICE_HEADING` y
`NOTICE_BODY` entrada por entrada».

---

### WR-04: el vocabulario de Gate A es una lista cerrada de 11 subcadenas, y hoy ya hay una afirmación real fuera de ella

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:76-88`, `app/pages/[game]/index.vue:511`
**Issue:** `FRASES_SOBRE_LOS_DATOS_DEL_GRUPO` es una lista de 11 subcadenas literales. El
criterio de inclusión que pretende hacer ejecutable (`09-AUDIT-AFIRMACIONES-UI.md` §1) es
semántico —«frase que afirma un hecho sobre los datos persistidos del grupo»— y una lista de
subcadenas no puede serlo. No es una objeción teórica: **«conservará el progreso»**, en
`endGameBody` (CR-02), es una afirmación sobre los datos persistidos, está en el fichero
más vigilado del repo, y no dispara nada. Otras vecinas obvias que hoy pasarían: «sigue
guardado», «está guardada», «se ha conservado», «no se ha borrado», «queda en el
dispositivo».
**Fix:** no perseguir la lista perfecta. Invertir el criterio en la superficie donde sí es
viable: **ningún `.vue` de `app/` puede contener texto literal en un nodo de texto de
plantilla salvo el que esté en una lista blanca** (rótulos de botón, títulos de pantalla), y
toda copy sobre datos persistidos entra por prop/computed desde un `.ts` con test puro
—que es exactamente la disciplina que `MiniSetupScreen.vue:18-23` ya aplica bien—. Como
mínimo, ampliar la lista con las vecinas de arriba y añadir «conservar»/«conservará» ahora
mismo.

---

### WR-05: Gate S auto-verifica `regionVigilada`, no la decisión de Gate A — la lógica del gate no es testeable

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:245-265,399-498`
**Issue:** Los siete tests de Gate S prueban `regionVigilada` (que la región incluye lo que
debe e ignora comentarios y `<style>`) y dos coberturas reales sobre `index.vue`. Ninguno
prueba que Gate A **se ponga rojo** ante un fichero con una frase sin auditar, porque esa
lógica vive inline dentro del `it.each` y no hay función que invocar. Si mañana alguien
rompe `contieneFraseSobreLosDatosDelGrupo`, invierte el `filter` de `frasesSinAuditar`, o
cambia `?? []` por `?? FRASES_SOBRE_LOS_DATOS_DEL_GRUPO`, Gate S sigue verde y Gate A deja
de detectar nada. Es el mismo tipo de agujero que la ronda 5 encontró en `extraerTemplate`:
el detector sin detector.
**Fix:** extraer la decisión a una función pura exportada y que Gate S la ejerza con casos
sintéticos:

```ts
export function frasesSinAuditarDe(ruta: string, contenido: string): string[] { ... }
// Gate S:
expect(frasesSinAuditarDe('app/components/Falso.vue', sfcConFraseNoAuditada)).toEqual(['en el dispositivo'])
expect(frasesSinAuditarDe('app/components/ResumePrompt.vue', '<p>Partida guardada</p>')).toEqual([])
```

---

### WR-06: `onMounted` no tiene el blindaje que sí tiene `onOutcomeRecorded`; una excepción deja al grupo en «Cargando…» para siempre

**File:** `app/pages/[game]/index.vue:151-189`, `app/composables/useProgressMountPlan.ts:75-78`
**Issue:** La ventana de cierre de partida quedó blindada esta ronda (`index.vue:683-709`, dos
`try/catch` con valores honestos). El montaje, no:

```js
onMounted(() => {
  if (!game) { resumeResolved.value = true; return }
  const informe = readStoredProgress(game)          // sin try/catch
  const plan = planProgressMount(informe.stored, informe.outcome)   // lanza por diseño
  ...
  resumeResolved.value = true                        // solo se alcanza si nada lanzó
})
```

`resumeResolved` es la bandera que la plantilla usa para salir del estado de carga
(`index.vue:808-810`). Si cualquiera de las dos líneas lanza, se queda en `false`
**permanentemente**: la pantalla se queda en «Cargando…» sin cabecera, sin botón «‹» y sin
mini-setup. No hay salida desde la tablet salvo teclear la URL. Es el análogo exacto, en el
montaje, del defecto que el `catch` del cierre de partida (WR-10 ronda 4 / WR-06 ronda 5)
existe para impedir; y `planProgressMount` contiene un `throw` **deliberado** en su rama
`default`. La probabilidad hoy es baja (el typecheck cubre el quinto valor, `readProgress`
atrapa el parseo), pero el coste de la línea que falta es cero y la consecuencia es total.
**Fix:**

```js
let informe: StoredProgressReport
try { informe = readStoredProgress(game) }
catch { informe = { stored: 'unknown', outcome: 'fresh', session: expandStructural } }
```

o, más simple y sin recomponer la sesión: envolver el bloque entero y, en el `catch`, aplicar
el plan de `'unknown'` (mini-setup + `UNVERIFIED_PROGRESS_NOTICE`), que es el resultado
honesto ante «no he podido comprobarlo». Con `resumeResolved.value = true` en un `finally`.

---

### WR-07: el aviso del mini-setup usa `v-if` sobre el propio `role="status"` — el anti-patrón que `HistorySavedNotice.vue` documenta a lo largo de 10 líneas

**File:** `app/components/MiniSetupScreen.vue:67-78`, `app/components/HistorySavedNotice.vue:17-28`
**Issue:**

```html
<p v-if="unverifiedProgressNotice" role="status" ...>{{ unverifiedProgressNotice }}</p>
```

`HistorySavedNotice.vue:17-27` explica por qué esto no funciona, con nombre y número de
hallazgo (WR-05, ronda 3): «un lector de pantalla solo anuncia los cambios de una región
`aria-live` que YA estaba en el DOM cuando el contenido cambió; poner `aria-live` sobre el
mismo elemento que lleva el `v-if` no anuncia nada». Aquí es peor todavía: el `<p>` existe
desde el primer render de la pantalla, así que ni siquiera hay un cambio que anunciar. La
regla que el repo se dio a sí mismo no se aplicó al estrenar la superficie nueva.

Agravante menor pero del mismo tipo que esta fase persigue: el comentario que lo justifica
(`MiniSetupScreen.vue:68-69`) dice «`role="status"`, mismo patrón que
`VoiceUnavailableNotice.vue`». `VoiceUnavailableNotice.vue` **no tiene** `role` ni
`aria-live` en ningún elemento (comprobado leyendo el fichero entero). El motivo escrito
cita un precedente que no existe.
**Fix:** región permanente + contenido condicional, igual que `HistorySavedNotice.vue`:

```html
<div role="status" aria-live="polite">
  <p v-if="unverifiedProgressNotice" class="...">{{ unverifiedProgressNotice }}</p>
</div>
```

Y corregir el comentario: el precedente real es `HistorySavedNotice.vue`, no
`VoiceUnavailableNotice.vue`.

---

### WR-08: `planProgressMount` acepta pares `(stored, outcome)` contradictorios y el test de totalidad solo comprueba que no lanza

**File:** `app/composables/useProgressMountPlan.ts:50-64`, `app/composables/__tests__/useProgressMountPlan.test.ts:61-70`
**Issue:** La firma es `planProgressMount(stored, outcome)`, dos argumentos independientes,
cuando lo que los produce es un único `StoredProgressReport` con un invariante escrito
(`useStoredProgress.ts:160-165`: `('resumable' | 'stale') ⟺ outcome !== 'fresh'`). Nada en el
tipo impide `planProgressMount('resumable', 'fresh')`, que devuelve `resume-prompt` — y en
`index.vue:185-186` eso pintaría `ResumePrompt` sobre una sesión estructural con
`PLACEHOLDER_CONTEXT` (`playerCount: 1`), es decir «Partida guardada · 1 jug · Normal»: una
afirmación inventada, la clase exacta de esta fase, servida por la función que se presenta
como blindaje contra ella. El test 8 recorre las 12 combinaciones pero solo afirma
`toBeDefined()` — pasa igual de verde con una combinación imposible que con una legítima.
**Fix:** pasar el informe entero, que es indivisible por construcción:

```ts
export function planProgressMount(informe: Pick<StoredProgressReport, 'stored' | 'outcome'>): ProgressMountPlan
```

Si se prefiere no cambiar la firma, al menos añadir un test que fije qué hace con los pares
imposibles, y no devolver `resume-prompt` cuando `outcome === 'fresh'`.

---

### WR-09: el test que se declara exhaustivo sobre `preserveProgress` sigue sin cubrir `'stale'`, y su título sigue diciendo «las tres variantes»

**File:** `app/composables/__tests__/avisoTrasRegistroFallido.test.ts:320-325`
**Issue:**

```ts
it('9. planGameEnd().preserveProgress es true en las tres variantes de fallo y false en success ...', () => {
  expect(planGameEnd(false, 'resumable').preserveProgress).toBe(true)
  expect(planGameEnd(false, 'absent').preserveProgress).toBe(true)
  expect(planGameEnd(false, 'unknown').preserveProgress).toBe(true)
  expect(planGameEnd(true, 'absent').preserveProgress).toBe(false)
})
```

El cuarto valor de `StoredProgress` es el hallazgo entero de esta ronda y no aparece. Sí está
cubierto en `useHistorySavedNotice.test.ts:150-152`, así que no hay hueco de comportamiento —
pero sí un test que se presenta como tabla completa y ya no lo es, que es cómo se cuela el
siguiente hueco. Mismo patrón que el propio fichero denuncia en su cabecera sobre el test 5
anterior.
**Fix:** recorrer `TODOS_LOS_ESTADOS_DEL_DISPOSITIVO` en vez de enumerar a mano, y corregir el
título («las cuatro variantes de fallo»).

---

### WR-10: `FICHEROS_QUE_PUEDEN_NOMBRAR_EL_ESTADO_DEL_DISPOSITIVO` dice «los cuatro», lista cinco, y conserva un `TODO(09-30)` que el plan 09-30 no cerró

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:157-194`
**Issue:** El bloque se abre con «Los **cuatro** únicos ficheros con motivo legítimo» y a
continuación enumera **cinco** entradas. La quinta (`useProgressMountPlan.ts:178-187`) dice
literalmente:

> «(plan 09-29, TODO(09-30) — entrada **provisional** … la entrada definitiva de auditoría
> (con el razonamiento completo, igual que las de arriba) la escribe el plan 09-30, que es
> quien reforma este fichero»

El plan 09-30 reformó el fichero y dejó la entrada provisional tal cual. Esta lista es
precisamente el mecanismo que impide que alguien se invente el estado del dispositivo; una de
sus cinco entradas está marcada por escrito como no auditada, y el encabezado ya no cuadra
con el contenido. Es el punto 3 del encargo: excepciones con motivo real, no ensanchamiento
silencioso.
**Fix:** corregir el encabezado a «cinco» y reescribir la entrada de `useProgressMountPlan.ts`
con su razonamiento definitivo (traduce `StoredProgress` a `MountAction` mediante un `switch`
total con guarda `never`; no compara ni inventa estados: los consume), retirando el `TODO`.
Mejor aún: derivar el número del `length` del array para que no pueda volver a desincronizarse.

---

## Info

### IN-01: Gate C busca literales sobre el fuente crudo con comentarios; el cuarto test sí los quita

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:324-343,379-396`
**Issue:** Los dos primeros tests de Gate C hacen `contenido.includes("'absent'")` sobre el
fichero **con** comentarios; el de `NoticeVariant` aplica `quitarComentarios` primero, con un
motivo escrito («vigilar esos comentarios pondría el gate rojo por narrativa»). El mismo
argumento vale para los literales de `StoredProgress`: cualquier fichero nuevo de `app/` que
narre en un comentario «…cuando la lectura devuelve `'unknown'`…» pone el gate rojo sin haber
escrito una línea de código.
**Fix:** aplicar `quitarComentarios` también en los dos primeros tests, por coherencia.

### IN-02: el barrido solo cubre `/app/**/*.{vue,ts}`

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:234-238,304-306`
**Issue:** Quedan fuera `engine/`, `content/**/*.json` (que es donde vive el texto de los
pasos que la app **lee en voz alta**), `server/`, y cualquier `.js`/`.mjs`/`.tsx` dentro de
`app/`. Una frase sobre el progreso guardado dentro de un paso autorado no la ve ningún gate.
**Fix:** añadir `content/**/*.json` al glob de Gate A (aplicando el barrido sobre los valores
de texto), o dejar constancia por escrito de que la copy de contenido queda fuera del alcance
y por qué.

### IN-03: `normalizar` recursa sin cota sobre entrada declarada «no fiable»

**File:** `app/composables/useStoredProgress.ts:93-101`
**Issue:** El comentario declara explícitamente que el `context` viene de `JSON.parse` de
`localStorage` y es entrada no fiable (otra pestaña, una extensión, DevTools). La defensa
construida —no indexar nunca por una clave del dato— es correcta y cierra la vía
`__proto__`. Pero no hay cota de profundidad: un `context` anidado ~10.000 niveles produce
`RangeError: Maximum call stack size exceeded`. Hoy sin impacto: el único sitio que pasa
`esperada` es `onOutcomeRecorded`, que ya envuelve la llamada en `try/catch`
(`index.vue:699-706`) y degrada a `'unknown'`.
**Fix:** ninguno urgente. Si se quiere blindar, cortar a una profundidad fija (p. ej. 8) y
tratar lo que la supere como «distinto».

### IN-04: `esLaMismaPartida` compara vía `JSON.stringify`, que colapsa `undefined`/`null` y `NaN`

**File:** `app/composables/useStoredProgress.ts:117`
**Issue:** `JSON.stringify([['a', undefined]])` da `[["a",null]]`, igual que para `null`; y
`NaN`/`Infinity` también se serializan como `null`. Dos `context` distinguibles comparan como
iguales. Escenario rebuscado (el `context` real son dos campos escalares validados por
rango), pero la función se presenta como comparación exacta de seis campos.
**Fix:** documentar la limitación en el comentario de `esLaMismaPartida`, o comparar
estructuralmente sin pasar por `JSON.stringify`.

### IN-05: Gate S conserva la regex borrada para demostrar que fallaba

**File:** `app/composables/__tests__/afirmacionesRespaldadas.test.ts:426-427`
**Issue:** El test reimplementa `/<template[^>]*>([\s\S]*?)<\/template>/` —código que ya no
existe en el repo— para afirmar que no captura la frase. Es un monumento útil el día en que
se escribió y ruido a partir del mes que viene: nada garantiza que la regex del test siga
siendo la que se borró.
**Fix:** si se conserva, dejar una línea de comentario que diga que es una regex histórica
reproducida a mano y que no corresponde a ningún código vivo.

### IN-06: `useProgressMountPlan.test.ts` test 9 compara con sensibilidad a mayúsculas

**File:** `app/composables/__tests__/useProgressMountPlan.test.ts:72-76`
**Issue:** `expect(UNVERIFIED_PROGRESS_NOTICE).not.toContain('ya no está')` es sensible a
mayúsculas, mientras que el gate de clase adoptó explícitamente la comparación insensible
(WR-04/09-30, `afirmacionesRespaldadas.test.ts:90-98`) porque «Partida guardada» se escapaba
por la mayúscula inicial. Aquí, una copy que empezara por «Ya no está…» pasaría el test.
**Fix:** aplicar `.toLowerCase()` a la constante antes de las tres aserciones, o reusar
`contieneFraseSobreLosDatosDelGrupo` exportándola.

---

_Reviewed: 2026-09-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
