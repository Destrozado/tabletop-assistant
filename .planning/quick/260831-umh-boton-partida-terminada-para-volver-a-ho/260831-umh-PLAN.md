---
quick_id: 260831-umh
slug: boton-partida-terminada-para-volver-a-ho
type: execute
autonomous: false
files_modified:
  - app/components/IndexOverlay.vue
  - app/composables/useStepShortcuts.ts
  - app/composables/__tests__/useStepShortcuts.test.ts
  - app/pages/[game]/index.vue

must_haves:
  truths:
    - "Durante la partida existe una salida alcanzable SIN barra de direcciones ni botón atrás del navegador: ≡ (índice) → «Partida terminada»"
    - "«Partida terminada» nunca borra nada de forma directa: siempre abre un diálogo de confirmación con el resumen de lo que se va a perder"
    - "Cancelar la confirmación devuelve al índice tal y como estaba, sin tocar cursor, ronda ni progreso guardado"
    - "Confirmar borra el progreso persistido de ESE juego y lleva a la pantalla de inicio (selector de juego)"
    - "Tras confirmar, cerrar la app y volver a entrar en ese mismo juego muestra el mini-setup (nº de jugadores / dificultad), NO la partida ni el aviso de «Partida guardada»"
    - "La preferencia de voz sobrevive a «Partida terminada» (D-46 sigue vigente)"
    - "Si estaba sonando la locución al confirmar, se corta: la voz no sigue hablando ya en la pantalla de inicio"
    - "El botón no compite visualmente con SIGUIENTE ni se puede pulsar por accidente a media partida: vive dentro del overlay del índice, a tres toques del borrado real"
    - "Con el diálogo de confirmación abierto, Espacio/Enter/flecha izquierda no avanzan ni retroceden por detrás"
  artifacts:
    - path: "app/components/IndexOverlay.vue"
      provides: "barra inferior fija del overlay con el botón «Partida terminada» y el emit end-game"
      contains: "end-game"
    - path: "app/composables/useStepShortcuts.ts"
      provides: "ShortcutState con el sexto banderín awaitingEndConfirm"
      exports: ["resolveShortcutAction", "shortcutsEnabled", "isEditableTarget", "useStepShortcuts"]
    - path: "app/composables/__tests__/useStepShortcuts.test.ts"
      provides: "test del sexto banderín (entorno node, sin DOM)"
      contains: "awaitingEndConfirm"
    - path: "app/pages/[game]/index.vue"
      provides: "estado awaitingEndConfirm, cuerpo del diálogo, manejadores y ConfirmDialog apilado sobre el índice"
      contains: "onEndGameConfirm"
  key_links:
    - from: "app/components/IndexOverlay.vue"
      to: "app/pages/[game]/index.vue"
      via: "emit('end-game') → @end-game=\"onEndGameRequest\""
      pattern: "end-game"
    - from: "app/pages/[game]/index.vue onEndGameConfirm"
      to: "usePersistedSession().clear(gameId)"
      via: "borrado de la clave tga:progress:<gameId> antes de navegar"
      pattern: "clear\\(gameId\\)"
    - from: "app/pages/[game]/index.vue onEndGameConfirm"
      to: "navigateTo('/')"
      via: "desmontaje de la página de juego (libera wake lock por scope, igual que el «Atrás» del mini-setup)"
      pattern: "navigateTo\\('/'\\)"
---

<objective>
Añadir una salida explícita de la partida en curso: un botón «Partida terminada» dentro del
overlay del índice que, previa confirmación, borra el progreso guardado de ese juego y devuelve
a la pantalla de inicio.

Purpose: hoy, con la app instalada como PWA (sin barra de direcciones ni botón atrás), la
pantalla de juego es una trampa: no hay ningún control que salga de ella. El único camino para
cerrar una partida es cerrar la app, volver a entrar en el juego, esperar al aviso de «Partida
guardada» y elegir «Empezar nueva» — que además deja al usuario en el mini-setup del mismo
juego, no en el inicio. El usuario lo describió así: «siempre que entras estás con la partida en
marcha y tienes que cerrarla forzando empezar una nueva recargando o algo así».

Output: un botón en la barra inferior del overlay del índice, un diálogo de confirmación
destructivo reutilizando `ConfirmDialog.vue`, y un manejador en la página de juego que borra,
calla la voz y navega — en ese orden y por razones concretas (ver D-U4).

Esto NO es «un botón y un navigateTo»: hay tres trampas reales en esta pantalla concreta.
(1) El autoguardado es un `watchDebounced` de 300 ms: una escritura pendiente disparada antes de
confirmar puede resucitar la clave que acabamos de borrar. (2) El bloqueo de pantalla se libera
de dos maneras distintas según si la transición desmonta la página o no — el proyecto ya tiene
las dos, documentadas, y elegir la equivocada deja la tablet sin apagarse o añade una llamada
redundante. (3) La locución en curso (`<audio>` pregenerado o `speechSynthesis`) no se corta sola
al cambiar de ruta.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@app/pages/[game]/index.vue
@app/components/IndexOverlay.vue
@app/components/ConfirmDialog.vue
@app/composables/useStepShortcuts.ts

<interfaces>
<!-- Contratos YA existentes, verificados en el código. El ejecutor NO necesita ir a buscarlos. -->

app/pages/[game]/index.vue — piezas que este plan REUTILIZA tal cual (números de línea del
estado actual del fichero, antes de tocarlo):

  línea 46   const { load, save, clear } = usePersistedSession()
  líneas 62-68  const { voiceState, announce, toggle: toggleVoice, showVoiceUnavailableNotice,
                        dismissNotice } = useVoiceAnnouncer(...)
                → NO desestructura `silence` todavía. Este plan lo añade (ver D-U4).
  línea 76   const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()
  línea 89   const awaitingDiscardConfirm = ref(false)   ← el banderín hermano del que añadimos
  líneas 123-130  watchDebounced(session, (value) => { if (!value) return; save(value) },
                                  { debounce: 300 })
  línea 181  const isIndexOpen = ref(false)
  líneas 276-283  const savedSummary = computed(...)  → "PREPARACIÓN · 8 de 23 · 3 jug · Normal",
                  compuesto SIEMPRE con sectionLabel/position/sessionContextLabel del composable
  líneas 285-287  const discardBody = computed(...)  → el patrón exacto a imitar
  líneas 312-322  function onDiscardConfirm() { clear(gameId); session.value = null; ...;
                  releaseWakeLock().catch(() => {}) }
                  ← liberación EXPLÍCITA porque esa transición NO desmonta la página
  líneas 353-363  const atajosActivos = computed(() => shortcutsEnabled({ ...siete campos... }))
  línea 432  @back="navigateTo('/')"  (mini-setup)
  líneas 434-439  comentario: SIN liberación explícita a propósito — navigateTo desmonta la
                  página y el tryOnScopeDispose interno de useWakeLock ya libera solo
  líneas 454-493  el `div v-else` de la pantalla de paso: AppHeader, VoiceUnavailableNotice,
                  StepScreen, NavBand, IndexOverlay (479-485), WarningDetailModal (486-492)

app/components/ConfirmDialog.vue — componente tonto YA existente, genérico y reutilizable:
  props: title, body, confirmLabel, cancelLabel, destructive (todas requeridas)
  emits: confirm, cancel
  raíz: `<div role="dialog" aria-modal="true" class="fixed inset-0 z-50 bg-background ...">`
  `destructive: true` → botón de confirmar con `bg-destructive text-on-accent`.
  NO se modifica en este plan.

app/components/IndexOverlay.vue — estructura actual:
  raíz: `fixed inset-0 z-50 bg-surface flex flex-col transition-all duration-[180ms] ease-out`
  hijo 1 (líneas 71-83): barra de título `h-16 shrink-0 ... border-b border-background` con el ✕
  hijo 2 (líneas 86-125): cuerpo `flex-1 overflow-y-auto px-lg pb-lg` con los bloques de pasos
  emits actuales: 'jump-to' [id: string], 'close' []
  `onRowClick` (55-62) emite 'close' SIEMPRE y además 'jump-to' si la fila no es la actual.

app/components/ResumePrompt.vue líneas 43-54 — el patrón visual exacto del botón destructivo NO
  relleno («Empezar nueva»), a copiar en la barra inferior del índice:
  `min-h-12 px-lg border border-destructive text-destructive text-label font-bold
   transition-transform duration-75` + ref `pressed` con mousedown/touchstart/mouseup/touchend
   → `brightness-95 scale-[0.98]`.

app/composables/usePersistedSession.ts — `clear(gameId)` hace `removeItem('tga:progress:'+gameId)`
  y NADA MÁS. Por D-46 nunca toca `tga:voice-enabled`. Es SSR-safe y ya falla en silencio ante
  cualquier excepción del storage. NO se modifica en este plan.

app/composables/useStepShortcuts.ts:
  líneas 13-16  comentario de cabecera: «Hay cinco estados de overlay ... que deben desactivar
                el atajo» → pasa a ser SEIS
  líneas 46-54  interface ShortcutState { resumeResolved, hasSession, awaitingResumeChoice,
                awaitingContentChangedAck, awaitingDiscardConfirm, isIndexOpen, hasActiveDetail }
  líneas 91-105 comentario de contrato («ninguno de los cinco overlays») + shortcutsEnabled
  D-Q4 vigente: con cualquier overlay abierto las teclas no hacen NADA.

app/composables/__tests__/useStepShortcuts.test.ts:
  líneas 23-33  helper `shortcutState(overrides)` con todos los banderines en su valor «activo»
  líneas 90-118 describe('shortcutsEnabled ...') con un `it` por banderín, todos con la misma
                forma: `expect(shortcutsEnabled(shortcutState({ X: true }))).toBe(false)`

app/composables/useVoiceAnnouncer.ts — expone `silence()` en su objeto de retorno (corte
  síncrono: `stopAudio()` del `<audio>` pregenerado + `stop()` de speechSynthesis, ambos
  envueltos en try/catch, no-op si no hay nada sonando). Ya se usa desde `toggle()` y desde el
  watch de visibilidad. NO se modifica en este plan.

vitest.config.ts — proyecto `app-logic`: incluye `app/**/*.test.ts`, entorno **node** (SIN
  jsdom). Por eso en este plan NO se testean componentes ni plantillas: solo la función pura
  `shortcutsEnabled`. No introducir @vue/test-utils ni cambiar el entorno.

Estado de la suite HOY (medido antes de planificar): `npm run test` → 14 ficheros, 293 tests,
todos en verde, 551 ms.

Dependencias: CERO nuevas. `package.json` no se toca.
</interfaces>
</context>

<decisions>
Decisiones tomadas en la planificación. El ejecutor las aplica, no las revisita.

**D-U1 — El botón vive en la BARRA INFERIOR del overlay del índice (≡), no en la cabecera ni en
la banda de navegación.**

La restricción del encargo es doble y tira en direcciones opuestas: tiene que ser *alcanzable*
(hoy la pantalla de juego no tiene ninguna salida cuando la app corre instalada como PWA, sin
barra de direcciones ni botón atrás) y tiene que ser *imposible de pulsar por accidente* con la
tablet en la mesa entre seis manos. El overlay del índice resuelve las dos: ya es el menú de
facto de la app, se abre con un toque deliberado en el ≡, y deja el borrado real a tres toques
(≡ → «Partida terminada» → «Sí, terminar»).

Alternativas rechazadas, para que no se reabran:
- *Un ✕ o «Salir» en `AppHeader.vue`*: la cabecera ya tiene tres controles (etiqueta de contexto,
  voz, índice) apretados en la esquina superior derecha, que es justo donde se apoyan los dedos
  al sujetar una tablet. Meter ahí el único control destructivo de la pantalla de juego es
  pedir el mal-toque, y aunque la confirmación lo haría recuperable, un diálogo destructivo
  apareciendo a media partida es exactamente el ruido que el proyecto evita.
- *Un tercer botón en `NavBand.vue`*: prohibido por el encargo («no debe competir visualmente
  con SIGUIENTE») y por el diseño de la banda — SIGUIENTE ocupa el 65 % del ancho y es el único
  destino de color de acento de la pantalla. Cualquier añadido ahí le roba peso.
- *Un gesto (mantener pulsado, deslizar)*: invisible, no descubrible, y sin equivalente de
  teclado para el caso del portátil. La app está diseñada para leerse y tocarse a un brazo de
  distancia, no para memorizar gestos.

**D-U2 — Etiqueta literal «Partida terminada», con el estilo destructivo NO relleno.**
Son las palabras del usuario en el encargo; no se «mejora» a «Salir», «Terminar partida» ni
«Abandonar». El estilo es el de «Empezar nueva» en `ResumePrompt.vue` (borde y texto en
`destructive`, fondo transparente): el rojo RELLENO queda reservado, en toda la app, para el
botón de confirmar del diálogo destructivo — que es donde ocurre el borrado de verdad.

**D-U3 — La confirmación se APILA sobre el índice; el índice NO se cierra al pedirla.**
`onEndGameRequest` solo pone `awaitingEndConfirm = true` y deja `isIndexOpen` en true. En la
plantilla, el `ConfirmDialog` se coloca como hermano JUSTO DESPUÉS de `<IndexOverlay>` dentro
del `div v-else` de la pantalla de paso: ambos son `fixed inset-0 z-50`, así que el que va
después en el DOM pinta encima, sin tocar ningún z-index. Es el mismo apilamiento que ya existe
entre `ResumePrompt` (z-40) y su `ConfirmDialog` de descarte. Cancelar devuelve al índice tal y
como estaba — no al paso — porque cancelar significa «no era esto», no «cierra el menú».

**D-U4 — Orden EXACTO del manejador de confirmación. No es cosmético: cada línea evita un fallo
concreto.**

```
onEndGameConfirm():
  1. awaitingEndConfirm = false ; isIndexOpen = false
  2. silence()                  ← corta la locución en curso
  3. session.value = null       ← ANTES de clear(): reprograma el debounce pendiente
  4. clear(gameId)              ← borra tga:progress:<gameId>
  5. navigateTo('/')            ← desmonta la página; el wake lock se libera solo
```

- **Por qué `session.value = null` antes de `clear()`:** el autoguardado es
  `watchDebounced(session, ..., { debounce: 300 })`. Si el usuario avanzó un paso menos de 300 ms
  antes de confirmar, hay una escritura PENDIENTE con la sesión antigua que se ejecutaría
  *después* del borrado y resucitaría la clave. Asignar `null` vuelve a disparar el watch, lo
  que reemplaza esa invocación pendiente por una nueva con `null`, que la guarda `if (!value)
  return` descarta. Es el mismo truco que `onDiscardConfirm` aplica ya, y hay que conservar la
  relación de orden aunque el desmontaje posterior también desecharía el watcher: no dependas
  del desmontaje para la corrección de los datos.
- **Por qué `silence()` y no confiar en el desmontaje:** el `tryOnScopeDispose` de
  `useVoiceAnnouncer` pausa el elemento `<audio>`, pero `speechSynthesis` (el camino de respaldo)
  no se detiene solo al cambiar de ruta — la locución seguiría oyéndose ya en el selector de
  juego. `silence()` corta los dos caminos, es síncrono y es no-op si no había nada sonando.
- **Por qué NO se llama a `releaseWakeLock()`:** ver D-U5.

**D-U5 — NADA de `releaseWakeLock()` explícito aquí. No es un olvido.**
El proyecto ya tiene las dos variantes documentadas en el propio fichero: `onDiscardConfirm`
(líneas 317-321) SÍ libera a mano porque esa transición se queda en la misma ruta y no desmonta
la página; el «Atrás» del mini-setup (líneas 434-439) NO libera porque `navigateTo` desmonta la
página y el `tryOnScopeDispose` interno de `useWakeLock` ya lo hace. `onEndGameConfirm` es del
segundo tipo. Añadir la llamada sería redundante sobre un bloqueo que ya se está liberando, y
contradiría un comentario existente que un lector futuro usará como referencia.

**D-U6 — `ShortcutState` gana un SEXTO banderín, `awaitingEndConfirm`.**
Hoy es estrictamente redundante (el diálogo solo se muestra con `isIndexOpen === true`, que ya
desactiva el atajo por D-Q4), pero el contrato de `shortcutsEnabled` es «ningún overlay abierto»,
no «el índice abierto»: si mañana se decide cerrar el índice al confirmar, el atajo quedaría
activo por detrás de un diálogo DESTRUCTIVO y un Espacio lo confirmaría. Es una línea en una
función pura ya testeada, con su test al lado. Se añade. Actualiza también los dos comentarios
que dicen «cinco» (cabecera del fichero, líneas 13-16; contrato de `shortcutsEnabled`, líneas
91-94) a «seis» — un comentario que miente es peor que ninguno.

**D-U7 — «Partida terminada» borra SOLO `tga:progress:<gameId>`. Prohibido ampliarlo.**
`clear(gameId)` ya hace exactamente eso y D-46 depende de ello: la preferencia de voz vive en
`tga:voice-enabled`, fuera del prefijo, y debe sobrevivir. No añadas un `localStorage.clear()`,
ni borres la clave de otro juego, ni «de paso» limpies nada más. Si otro juego tuviera progreso
guardado, sigue guardado — es lo correcto.

**D-U8 — Fuera de alcance, y anotado a propósito:**
- `MesaListaScreen.vue` tiene cabecera propia SIN ≡, así que desde «Mesa lista» no se llega al
  botón. No es una trampa: esa pantalla tiene «‹ Atrás», que devuelve al último paso, donde el ≡
  sí está. No añadas el botón ahí.
- `ResumePrompt` conserva su comportamiento actual: «Empezar nueva» borra el progreso y deja al
  usuario en el mini-setup del MISMO juego, no en el inicio. Son dos gestos distintos («quiero
  otra partida de esto» vs. «hemos terminado») y los dos siguen teniendo sentido. No los unifiques.
- Sin test de Playwright: el comportamiento clave («volver a entrar muestra el mini-setup») lo
  cubre el checkpoint humano de forma directa y barata; montar un e2e con build completo para
  esto es desproporcionado. Anótalo en el SUMMARY como candidato si alguna vez se amplía la
  suite de `e2e/`.
</decisions>

<tasks>

<task type="auto">
  <name>Task 1: Barra inferior del índice con el botón «Partida terminada»</name>
  <files>app/components/IndexOverlay.vue</files>
  <action>
Añade a `IndexOverlay.vue` una barra inferior fija y un emit nuevo. El componente sigue siendo
TONTO: no importa nada del motor ni de los composables, no borra nada, no navega — solo emite
(ARCHITECTURE.md §3/§5).

1. En `defineEmits`, añade `'end-game': []` junto a los dos existentes (`'jump-to'`, `'close'`).
   Mantén el orden alfabético/actual del bloque tal y como quede legible; no toques las firmas
   existentes.

2. Añade un ref local `endPressed` (mismo patrón de pulsado que `ResumePrompt.vue`) al lado del
   `entered` que ya existe.

3. En la plantilla, como TERCER hijo del contenedor raíz `flex flex-col` — es decir, hermano
   DESPUÉS del cuerpo desplazable `flex-1 overflow-y-auto`, no dentro de él — añade la barra:
   contenedor `shrink-0` con separador superior `border-t border-background`, padding horizontal
   `px-lg` y vertical `py-md`, y el contenido alineado a la derecha (`flex justify-end`). Dentro,
   un `<button type="button">` con el texto literal `Partida terminada` y exactamente las clases
   del botón destructivo NO relleno de `ResumePrompt.vue` líneas 43-54: `min-h-12 px-lg border
   border-destructive text-destructive text-label font-bold transition-transform duration-75`,
   más el `:class` de pulsado `endPressed ? 'brightness-95 scale-[0.98]' : ''` y los cuatro
   manejadores `@mousedown`/`@touchstart`/`@mouseup`/`@touchend`. El `@click` emite `end-game`.

   Importante: `shrink-0` en la barra es lo que impide que se comprima cuando la lista de pasos
   es larga; el cuerpo ya es `flex-1 overflow-y-auto`, así que la barra queda siempre visible al
   pie del overlay sin `position: fixed` propio. No conviertas la barra en `fixed` ni le pongas
   z-index: es un hijo más del flex column.

4. NO toques `onRowClick`, ni la numeración, ni el divisor de D-24, ni la transición de entrada.
   `end-game` NO debe emitir `close`: quien decide qué pasa con el overlay es la página (D-U3).

5. Documenta arriba, en el comentario de cabecera del componente que ya existe, una línea
   explicando por qué el botón vive aquí (D-U1: única salida alcanzable de la pantalla de juego
   con la app instalada como PWA; deliberadamente a tres toques del borrado real).
  </action>
  <verify>
    <automated>grep -q "'end-game'" app/components/IndexOverlay.vue &amp;&amp; grep -q "Partida terminada" app/components/IndexOverlay.vue &amp;&amp; grep -q "border-destructive" app/components/IndexOverlay.vue &amp;&amp; echo OK</automated>
  </verify>
  <done>
`IndexOverlay.vue` declara el emit `end-game`, renderiza una barra inferior `shrink-0` con el
botón «Partida terminada» en estilo destructivo no relleno, y el resto del componente (filas,
numeración, divisor, cierre con ✕) queda intacto. No compila nada nuevo todavía: el consumidor
llega en la Task 2.
  </done>
</task>

<task type="auto">
  <name>Task 2: Cablear el borrado + la navegación en la página de juego, y el sexto banderín del atajo</name>
  <files>app/composables/useStepShortcuts.ts, app/composables/__tests__/useStepShortcuts.test.ts, app/pages/[game]/index.vue</files>
  <action>
**A) `app/composables/useStepShortcuts.ts` (D-U6)**
- Añade `awaitingEndConfirm: boolean` a la interfaz `ShortcutState` (líneas 46-54), junto a
  `awaitingDiscardConfirm`.
- Añade `&& !state.awaitingEndConfirm` a `shortcutsEnabled` (líneas 95-105).
- Actualiza los DOS comentarios que hablan de «cinco»: la trampa 3 de la cabecera del fichero
  (líneas 13-16) y el contrato de `shortcutsEnabled` (líneas 91-94). Pasan a SEIS estados de
  overlay, nombrando el nuevo («confirmación de partida terminada»). Añade media línea de por
  qué es deliberadamente redundante hoy (D-U6): el diálogo solo aparece con el índice abierto,
  pero el contrato es «ningún overlay», y un Espacio no puede poder confirmar un borrado.
- NO toques `resolveShortcutAction` ni `isEditableTarget`.

**B) `app/composables/__tests__/useStepShortcuts.test.ts`**
- Añade `awaitingEndConfirm: false` al helper `shortcutState()` (líneas 23-33).
- Añade un `it` en el `describe('shortcutsEnabled ...')` con exactamente la misma forma que sus
  hermanos: `expect(shortcutsEnabled(shortcutState({ awaitingEndConfirm: true }))).toBe(false)`,
  con un nombre en español coherente con los demás (p. ej. «con la confirmación de partida
  terminada abierta -> false»).
- Si el `describe` tiene un test de «todo en su sitio -> true», compruébalo: sigue en verde sin
  cambios porque el helper aporta el nuevo campo en false.

**C) `app/pages/[game]/index.vue`**
- Desestructura `silence` del retorno de `useVoiceAnnouncer` (líneas 62-68), junto a `announce`.
- Añade `const awaitingEndConfirm = ref(false)` junto a `awaitingDiscardConfirm` (línea 89).
- Añade un computed `endGameBody`, hermano de `discardBody` (líneas 285-287), que reutilice
  `savedSummary.value` — nunca cadenas tecleadas a mano. Texto:
  `Se borrará el progreso guardado (${savedSummary.value}) y volveréis a la pantalla de inicio.
  Esta acción no se puede deshacer.`
- Añade tres manejadores, junto a los de descarte (líneas 304-322), cada uno con su comentario
  citando la decisión que aplica:
  * `onEndGameRequest()` → `awaitingEndConfirm.value = true`. NO cierra el índice (D-U3).
  * `onEndGameCancel()` → `awaitingEndConfirm.value = false`. Nada más: no toca cursor, ronda,
    contexto ni almacenamiento.
  * `onEndGameConfirm()` → EXACTAMENTE el orden de D-U4: bajar `awaitingEndConfirm` e
    `isIndexOpen`; `silence()`; `session.value = null`; `clear(gameId)`; `navigateTo('/')`.
    Comenta en el código las dos razones no obvias: (1) `session.value = null` va ANTES de
    `clear()` para que el `watchDebounced` pendiente se reprograme con `null` y su guarda lo
    descarte, en vez de resucitar la clave 300 ms después; (2) NO se llama a `releaseWakeLock()`
    porque `navigateTo` desmonta la página y el `tryOnScopeDispose` interno de `useWakeLock` ya
    libera — mismo razonamiento que el comentario existente de las líneas 434-439, y lo contrario
    del caso de `onDiscardConfirm`, que sí libera a mano porque no desmonta.
- Añade `awaitingEndConfirm: awaitingEndConfirm.value` al objeto que `atajosActivos` pasa a
  `shortcutsEnabled` (líneas 353-363).
- Plantilla: en `<IndexOverlay>` (líneas 479-485) añade `@end-game="onEndGameRequest"`.
  INMEDIATAMENTE DESPUÉS de `</IndexOverlay>`, como hermano y antes de `<WarningDetailModal>`,
  añade el `ConfirmDialog` (D-U3):
  `v-if="awaitingEndConfirm"`, `title="¿Dar la partida por terminada?"`, `:body="endGameBody"`,
  `confirm-label="Sí, terminar"`, `cancel-label="Cancelar"`, `:destructive="true"`,
  `@confirm="onEndGameConfirm"`, `@cancel="onEndGameCancel"`.
  El orden en el DOM es lo que hace que el diálogo pinte sobre el índice sin tocar z-index — no
  lo muevas ni le añadas una clase de z.
- NO toques `usePersistedSession.ts`, `ConfirmDialog.vue`, `NavBand.vue`, `AppHeader.vue`,
  `MesaListaScreen.vue` ni nada de `content/`.
  </action>
  <verify>
    <automated>npm run test &amp;&amp; grep -q "awaitingEndConfirm" app/composables/useStepShortcuts.ts &amp;&amp; grep -q "awaitingEndConfirm" app/composables/__tests__/useStepShortcuts.test.ts &amp;&amp; grep -q "onEndGameConfirm" "app/pages/[game]/index.vue" &amp;&amp; npm run generate</automated>
  </verify>
  <done>
`npm run test` en verde con 14 ficheros y ≥294 tests (293 de base + el nuevo). `npm run generate`
completa sin error (garantiza que la plantilla nueva compila y que nada toca `window` durante el
prerender). En la app, ≡ → «Partida terminada» abre el diálogo por encima del índice; Cancelar
vuelve al índice intacto; Confirmar borra `tga:progress:<gameId>`, calla la voz y navega a `/`.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Un botón «Partida terminada» en la barra inferior del overlay del índice (≡) de la pantalla de
juego. Al pulsarlo aparece un diálogo de confirmación destructivo con el resumen de la partida
que se va a perder. Al confirmar: se corta la locución, se borra el progreso guardado de ese
juego y la app vuelve a la pantalla de inicio (selector de juego). La preferencia de voz NO se
borra. Nada más de la interfaz ha cambiado: misma cabecera, mismo SIGUIENTE, mismo índice.
  </what-built>
  <how-to-verify>
Con `npm run dev` abierto en el navegador (idealmente también en la tablet):

1. **Camino feliz.** Entra en Marvel Champions, elige 3 jugadores / Normal y avanza 5 o 6 pasos
   con SIGUIENTE. Pulsa **≡**. Comprueba que el botón «Partida terminada» está abajo del todo,
   con borde rojo y fondo transparente, y que **la lista de pasos sigue pudiendo desplazarse por
   detrás sin que el botón se mueva ni se encoja**.
2. **Cancelar no rompe nada.** Pulsa «Partida terminada» → aparece el diálogo por ENCIMA del
   índice, con el resumen correcto (p. ej. «PREPARACIÓN · 6 de 23 · 3 jug · Normal»). Pulsa
   «Cancelar»: vuelves al índice tal y como estaba (no al paso). Cierra el índice con ✕ y
   comprueba que sigues en el MISMO paso de antes.
3. **Confirmar lleva al inicio.** ≡ → «Partida terminada» → «Sí, terminar». Debes acabar en el
   selector de juego.
4. **Lo importante: ya no hay partida.** Vuelve a entrar en Marvel Champions. Debe aparecer el
   **mini-setup** (nº de jugadores / dificultad). Si aparece «Partida guardada · ¿Continuar o
   empezar nueva?», el borrado ha fallado — repórtalo.
5. **Sobrevive a cerrar la app.** Repite: empieza otra partida, avanza unos pasos, termínala con
   el botón, **cierra del todo la pestaña/la app y vuelve a abrirla**. Entra en el juego: otra
   vez mini-setup, no partida en curso.
6. **La voz no se queda hablando.** Con la voz activada, pulsa SIGUIENTE y, MIENTRAS está
   locutando, haz ≡ → «Partida terminada» → «Sí, terminar». La voz debe cortarse; no debe seguir
   hablando ya en el selector.
7. **La preferencia de voz sobrevive.** Silencia la voz con el icono de la cabecera, termina la
   partida, empieza una nueva y comprueba que la voz **sigue silenciada** (no debe reactivarse
   sola).
8. **Carrera del autoguardado.** Pulsa SIGUIENTE y, sin esperar, encadena lo más rápido que
   puedas ≡ → «Partida terminada» → «Sí, terminar». Espera 2-3 segundos en el selector, vuelve a
   entrar en el juego: mini-setup, nunca «Partida guardada».
9. **Nada por detrás del diálogo (si usas portátil).** Con el diálogo de confirmación abierto,
   pulsa Espacio y la flecha izquierda varias veces: no debe pasar absolutamente nada (ni
   avanzar, ni retroceder, ni confirmar). Cancela y comprueba que sigues en el mismo paso.
10. **En la tablet, a un brazo de distancia:** ¿el botón se lee bien y NO compite con SIGUIENTE?
    ¿Te parece que podríais pulsarlo por accidente a media partida?
  </how-to-verify>
  <resume-signal>Escribe "aprobado" o describe qué falla (indicando el número del paso)</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| toque del usuario → `localStorage` | única entrada nueva; acción DESTRUCTIVA sobre datos del usuario. No cruza red ni contenido de reglas |
| pantalla de juego → ruta `/` | cambio de ruta que desmonta la página y sus recursos (wake lock, `<audio>`, listeners) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-umh-01 | Denial of Service | pérdida accidental del progreso de la partida | mitigate | tres toques deliberados (≡ → botón → confirmar), botón fuera de la banda de navegación y del alcance de los pulgares (D-U1), y `ConfirmDialog` destructivo que muestra el resumen exacto de lo que se pierde |
| T-umh-02 | Tampering | resurrección de la clave borrada por el `watchDebounced` de 300 ms | mitigate | `session.value = null` ANTES de `clear(gameId)` reprograma la invocación pendiente con `null`, que la guarda `if (!value) return` descarta (D-U4) |
| T-umh-03 | Elevation of Privilege | atajo de teclado actuando por detrás del diálogo destructivo | mitigate | sexto banderín `awaitingEndConfirm` en `shortcutsEnabled`, con test (D-U6) |
| T-umh-04 | Information Disclosure | borrado excesivo (preferencia de voz, progreso de otro juego) | mitigate | se reutiliza `clear(gameId)` sin modificarlo: `removeItem('tga:progress:'+gameId)` y nada más; D-46 y D-U7 lo prohíben expresamente |
| T-umh-05 | Denial of Service | wake lock huérfano (tablet que no se apaga tras salir) | accept | `navigateTo('/')` desmonta la página y el `tryOnScopeDispose` interno de `useWakeLock` libera; verificado como patrón ya vigente para el «Atrás» del mini-setup (D-U5) |
| T-umh-06 | Tampering | instalaciones npm | accept | este plan no instala nada: cero dependencias nuevas, `package.json` no se toca |
</threat_model>

<verification>
- `npm run test` en verde: 14 ficheros, **≥294 tests** (base medida: 293).
- `npm run generate` completa sin error.
- `git diff --stat` limita el cambio a EXACTAMENTE cuatro ficheros:
  `app/components/IndexOverlay.vue`, `app/composables/useStepShortcuts.ts`,
  `app/composables/__tests__/useStepShortcuts.test.ts`, `app/pages/[game]/index.vue`.
  **`content/marvel-champions.json`, `package.json` y `app/composables/usePersistedSession.ts`
  NO aparecen.**
- `grep -v '^\s*//' app/composables/useStepShortcuts.ts | grep -c awaitingEndConfirm` devuelve 2
  (la propiedad de la interfaz y la guarda de `shortcutsEnabled`), no más.
- `grep -n "localStorage" "app/pages/[game]/index.vue"` no devuelve NADA: la página sigue sin
  tocar el almacenamiento directamente, solo a través de `usePersistedSession`.
- Checkpoint humano aprobado (los 10 pasos).
</verification>

<success_criteria>
- Durante la partida hay una salida alcanzable sin barra de direcciones ni botón atrás, y solo
  se llega al borrado real tras tres toques deliberados con confirmación explícita.
- Confirmar borra el progreso de ese juego y deja la app en la pantalla de inicio; volver a
  entrar en el juego (incluso tras cerrar la app) muestra el mini-setup, nunca la partida.
- Cancelar es inocuo al 100 %: ni progreso, ni cursor, ni ronda, ni almacenamiento tocados.
- La preferencia de voz sobrevive; la locución en curso se corta al salir.
- La interfaz de juego queda idéntica: mismo SIGUIENTE, misma cabecera, mismo índice, ningún
  control nuevo en la pantalla de paso.
- El sexto banderín del atajo está en una función pura testeada, y los comentarios que decían
  «cinco» dicen ahora «seis».
</success_criteria>

<output>
Crea `.planning/quick/260831-umh-boton-partida-terminada-para-volver-a-ho/260831-umh-SUMMARY.md`
al terminar.

Anota en él, para el futuro: (a) que desde `MesaListaScreen` no se llega al botón porque esa
pantalla no tiene ≡ — decisión consciente (D-U8), no un hueco; (b) que `ResumePrompt` sigue
teniendo su propio «Empezar nueva» con semántica distinta (misma partida nueva vs. volver al
inicio) y que unificarlos sería una decisión de producto, no una limpieza; (c) que no hay
cobertura de Playwright para este flujo y que el candidato natural sería un spec en `e2e/` que
compruebe que tras terminar la partida y recargar aparece el mini-setup.
</output>
