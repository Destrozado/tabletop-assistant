# Deferred Items — Fase 9

## Filas HIST-02/03/04/05/06/07/08/09 desincronizadas en la tabla de trazabilidad

**Encontrado durante:** ejecución del plan 09-03 (fuera de alcance de este plan).

**Descripción:** `.planning/REQUIREMENTS.md` marca los checkboxes de `HIST-01`..`HIST-09` como
`[ ]` (sin marcar) y su fila en la tabla de trazabilidad (línea ~188-196) como `Pendiente`,
pese a que `09-01-SUMMARY.md` declara `requirements-completed: [HIST-02, HIST-03, HIST-04,
HIST-05]` y ese plan ya está mergeado en la base de este worktree (commit `5805683`). Esto es
el problema conocido documentado en la memoria del usuario
(`gsd-sdk-requirements-tabla-espanol.md`): `requirements.mark-complete` deja la tabla de
trazabilidad desincronizada en silencio si no se sincroniza a mano tras cada plan.

**Por qué no se corrige aquí:** el plan 09-03 no toca `engine/history.ts` ni ningún archivo
relacionado con HIST-*; corregir esas filas está fuera del límite de alcance de este plan
(regla de "Scope Boundary" del executor). Además, el checkbox `[ ]`/tabla de HIST-01..09
depende de qué plan de la fase 9 los cierra realmente (HIST-01/06/07/08/09 corresponden a
planes posteriores, 09-02/09-04 en adelante), así que no es evidente que HIST-02..05 debieran
marcarse aquí sin revisar el resto de la fase.

**Acción sugerida:** al cerrar la fase 9 completa (o en el siguiente plan que toque
`engine/history.ts`), sincronizar a mano la tabla de trazabilidad de `HIST-*` contra los
`requirements-completed` reales de cada SUMMARY de la fase.

**Actualización (09-17):** la Task 3 de este plan sincroniza a mano las filas HIST-04 y
HIST-06 (las dos que `09-VERIFICATION.md` marcó como PARCIALES en la ronda 3), añadiendo los
planes 09-13..09-17 a su columna de fase/plan. El resto de filas HIST-01/02/03/05/07/08/09 no
se toca aquí — sigue pendiente de una sincronización íntegra al cerrar la fase, tal como decía
la acción sugerida original.

---

## WR-02: un envoltorio `unreadable` permanente bloquea el registro para siempre, sin vía de salida en la interfaz

**Encontrado durante:** `09-REVIEW.md` (ronda 2 y ronda 3) y confirmado por el barrido
`09-AUDIT-FRONTERAS.md` (plan 09-17) sobre `appendHistoryEntry`/`readEnvelope`
(`app/composables/usePersistedSession.ts:214-228`, `:340-361`).

**Descripción:** con un `tga:history` corrupto (JSON inválido) o de `formatVersion`
desconocido (p. ej. tras un rollback de versión), `readEnvelope()` devuelve `'unreadable'` de
forma permanente — correcto y deliberado, para no machacar un dato que podría seguir
existiendo (CR-03, 09-13). Pero eso significa que `appendHistoryEntry` devuelve `false` en
**todas** las partidas futuras y `loadHistory()` devuelve `[]`, así que `/historico` dice
«Todavía no hay partidas registradas» (hay, no se saben leer) y no existe ninguna acción en la
interfaz para salir del bloqueo. 09-16 ya cerró la mitad del problema: el aviso de fallo ya no
atribuye una causa falsa («el dispositivo no permitió escribir») — lo que queda pendiente es
exclusivamente la salida del callejón.

**Por qué no se corrige aquí:** exige una superficie de interfaz nueva (una acción explícita en
`/historico`) que `09-UI-SPEC.md` no cubre — construirla a ciegas en un cierre de huecos
contradice el `<scope_boundary>` de este mismo plan.

**Acción sugerida:** distinguir el caso en el contrato de `appendHistoryEntry` (p. ej.
`'ok' | 'storage-failed' | 'unreadable'` en vez de `boolean`), y ofrecer en `/historico` una
acción explícita de archivado: renombrar la clave a `tga:history:backup-<ts>` y empezar limpio,
conservando el dato antiguo intacto para una futura herramienta de recuperación manual.

---

## WR-04: `GameOutcomeDialog` sin `Escape`, sin gestión de foco y sin salida no terminal

**Encontrado durante:** `09-REVIEW.md` (ronda 1), reconfirmado sin agravarse por
`09-AUDIT-FRONTERAS.md` (plan 09-17, fuera de su perímetro de composables/motor).

**Descripción:** `app/components/GameOutcomeDialog.vue:37-97` — `role="dialog"
aria-modal="true"` sin `aria-labelledby`, sin mover el foco al abrir, sin devolverlo al cerrar
y sin escuchar `Escape`, mientras que `WarningDetailModal.vue` (el patrón «bueno» del repo) sí
hace las tres cosas. Las cuatro acciones del diálogo terminan la partida: abrirlo por error no
tiene vuelta atrás sin registrar o descartar.

**Por qué no se corrige aquí:** vive en un fichero `.vue` de pantalla, explícitamente fuera del
perímetro de este plan (`<scope_boundary>` §FUERA de alcance: «Los ficheros `.vue` de pantalla
… quedan fuera del perímetro que el verificador nombra»).

**Acción sugerida:** copiar el bloque de `WarningDetailModal.vue` (`onMounted` → `focus()`,
`keydown`/`Escape` → `dismiss`, `aria-labelledby` apuntando al `<h1>`). Decidir antes qué
significa `Escape` frente a D-01 (si un quinto botón/atajo está permitido) — si no, que
`Escape` equivalga a «Salir sin registrar» de forma documentada.

**Actualización (ronda 4, plan 09-19) — CERRADO:** `09-VERIFICATION.md` (ronda 4, «Sobre los dos
diferidos reclasificados») reclasificó esta entrada de «diferido» a «hallazgo real», porque su
motivo de aplazamiento registrado arriba era literalmente «vive en un fichero `.vue`… fuera del
perímetro de este plan» — una razón de ALCANCE DE PLAN, no una evaluación de riesgo aceptado. El
plan 09-19 cierra las dos piezas accionables: `GameOutcomeDialog.vue` gana
`aria-labelledby="game-outcome-heading"` (nombre accesible) y foco gestionado — el panel entra en
foco al abrirse (`tabindex="-1"`, nunca ningún botón de resultado, para no empujar hacia ninguna
opción, D-02) y vuelve al elemento previamente activo al cerrarse. La parte de `Escape` queda
**resuelta, no pendiente**: el propio componente documenta por escrito que `Escape` y el toque
sobre el velo NO cierran el diálogo A PROPÓSITO, contrastado contra `09-UI-SPEC.md` §Layout 2
(«no backdrop-tap-dismiss and no Escape-to-dismiss on this dialog»), porque las cuatro salidas de
este diálogo terminan la partida (D-01/HIST-02) y un cierre accidental por `Escape` la terminaría
sin querer — la salida por teclado sigue existiendo vía `Tab` hasta el botón «Salir sin
registrar» + `Enter`. Verificado por `npm run build` (exit 0) y `npx vitest run` (785 tests, exit
0) según `09-19-SUMMARY.md`.

---

## WR-05 (b): `HistorySavedNotice`/`UpdateBanner` empujan fuera del viewport las pantallas `h-dvh`

**Encontrado durante:** `09-REVIEW.md` (ronda 1). La mitad (a) — `role="status" aria-live`
— ya se cerró en el plan 09-16; esta entrada cubre solo la mitad (b), maquetación.

**Descripción:** la banda se monta como hermano **encima** de `<NuxtPage/>` dentro de
`#app-root` (`app/app.vue:32`), y todas las pantallas usan `h-dvh`. Mientras el aviso está
visible (6 s en éxito, 20 s en fallo) el contenido mide `banner + 100dvh` y la fila inferior
del selector queda por debajo del borde de la tablet. Aplica igual a `UpdateBanner`.

**Por qué no se corrige aquí:** vive en `.vue`/`app.vue`, fuera del perímetro de este plan.

**Acción sugerida:** sacar la banda del flujo (`fixed top-0 inset-x-0 z-40`) o envolver
`<NuxtPage/>` en un contenedor `flex flex-col h-dvh` con `min-h-0` para que el aviso reste
altura en vez de sumarla.

**Actualización (ronda 4, plan 09-22) — CERRADO:** `09-VERIFICATION.md` (ronda 4, «Sobre los dos
diferidos reclasificados») reclasificó esta entrada de «diferido» a «hallazgo real» por el mismo
motivo que WR-04: el aplazamiento original era de ALCANCE DE PLAN («vive en `.vue`/`app.vue`,
fuera del perímetro de este plan»), no una evaluación de riesgo. El plan 09-22 cierra la parte de
código: `HistorySavedNotice.vue` y `UpdateBanner.vue` pasan a `fixed top-0 inset-x-0 z-40` con
`pointer-events-none` en el contenedor y `pointer-events-auto` en cada control pulsable, así que
dejan de sumar altura a las pantallas `h-dvh` y dejan de robar toques a la pantalla de debajo —
`app/app.vue` no se toca. Verificado por `npm run build` (exit 0) y `npx vitest run` (796 tests,
exit 0) según `09-22-SUMMARY.md`, más una comprobación estructural por `grep` (el contenedor raíz
de `GameSelectorScreen.vue` sigue centrado verticalmente, así que la banda se superpone a espacio
vacío, no al `<h1>`). **Con un matiz honesto que no se retira aquí:** el propio `09-22-SUMMARY.md`
deja registrada como **PENDIENTE** la comprobación visual humana obligatoria del plan (viewport de
tablet horizontal, `npm run dev`, variante de aviso larga) — el ejecutor de ese plan corría en un
agente headless sin juicio visual real y lo documentó así explícitamente en vez de fabricarlo. Esa
comprobación humana sigue sin realizarse; lo que este cierre da por CERRADO es el hallazgo de
maquetación en sí (el código deja de empujar la pantalla fuera del viewport, con evidencia
estructural y de test), no la verificación humana en dispositivo real, que sigue abierta bajo el
mismo ítem `DEV-02` de `REQUIREMENTS.md` (guion de pruebas pendiente en la tablet real) — no se
abre una entrada nueva por esto, ya existe.

---

## WR-07: `sampleCaption` declara la muestra de héroes e ignora la de villanos

**Encontrado durante:** `09-REVIEW.md` (ronda 1), confirmado por `09-AUDIT-FRONTERAS.md`
(plan 09-17) sobre `buildStatisticsView`/`aggregateStatistics`.

**Descripción:** `entriesWithHeroes` (`engine/statistics.ts`) solo cuenta entradas con al
menos un `heroId`. Una partida con villano anotado y sin héroes alimenta la tabla «% DE
VICTORIAS POR VILLANO» pero cuenta como «sin anotar» en la leyenda (`useGameHistory.ts:206-208`),
así que el pie que hay encima de las dos tablas puede decir «12 partidas registradas · 10 con
héroes anotados» mientras la tabla de villanos agrega 12. La leyenda no describe la muestra
que el lector tiene delante de la tabla de villanos.

**Por qué no se corrige aquí:** exige exponer un campo nuevo `entriesWithVillain` en
`StatisticsSummary` (cambio de forma) y separar la leyenda por tabla — el `<scope_boundary>`
de este plan lo señala explícitamente como uno de los WARNING que quedan fuera de este cierre.

**Acción sugerida:** añadir `entriesWithVillain` a `StatisticsSummary` (mismo criterio que
`entriesWithHeroes`) y que `buildStatisticsView` exponga una leyenda por tabla en vez de una
única `sampleCaption` compartida.

---

## INFO de `09-REVIEW.md` que son deuda real (IN-04, IN-05, IN-07, IN-11, IN-12, IN-13)

**Encontrado durante:** `09-REVIEW.md` (ronda 1), reconfirmados por `09-AUDIT-FRONTERAS.md`
(plan 09-17) como deuda que NO se cierra en este lote — arreglarlos cambiaría contratos
públicos ya fijados por test, fuera del alcance mínimo de un cierre de huecos.

- **IN-04** — `app/composables/usePersistedSession.ts:340-361` (`appendHistoryEntry`): el
  histórico crece sin tope ni poda. El día que tope la cuota de `localStorage`, el síntoma es
  el aviso de fallo de WR-02 arriba, sin explicación adicional. Propuesta: un tope (p. ej. 500
  entradas) o una poda explícita de las más antiguas al escribir.
- **IN-05** — `engine/history.ts` (`buildHistoryEntry`, generación de `id`):
  `Math.random().toString(36).slice(2, 12)` da entre 0 y 10 caracteres
  (`Math.random() === 0` ⇒ sufijo vacío ⇒ `id` = `"1789…-"`), lo que incumpliría el regex que
  el test ya fija (`/^\d+-[a-z0-9]+$/`). Propuesta: `crypto.randomUUID()` (disponible en todos
  los navegadores objetivo, contexto seguro) — cambio de formato de `id` que exige actualizar
  el test existente, fuera del alcance mínimo de este plan.
- **IN-07** — `e2e/offline-flow.spec.ts:26-28`: un `throw` a nivel de módulo si
  `public/audio/` no tiene `.m4a` aborta la suite completa de Playwright, incluidos los tests
  de `/historico` y `/estadisticas` que no dependen del audio. Propuesta: mover la comprobación
  a `test.skip(condition, …)` dentro del test que la necesita. Vive en `e2e/`, fuera del
  perímetro de composables/motor que audita 09-17.
- **IN-11** — `app/composables/usePersistedSession.ts:377-395`
  (`removeHistoryEntry`): devuelve `void` e ignora el booleano de `writeRaw`; un fallo de
  escritura deja la tarjeta visible sin explicación tras `reload()`, y el grupo cree que el
  botón de borrar no funciona. Propuesta: un aviso reutilizando `HistorySavedNotice`.
- **IN-12** — `app/composables/usePersistedSession.ts:319-323` (`loadHistory`): una entrada
  rechazada por `isGameHistoryEntry` es invisible (se filtra antes de pintar) y no se puede
  borrar (no hay tarjeta con su `id` para invocar `removeHistoryEntry`). Ocupa cuota para
  siempre. Va junto con IN-04: hace falta una vía de mantenimiento.
- **IN-13** — `engine/statistics.ts:72` (`buildRows`, cálculo de `pct`): `Math.round` puede
  anunciar «100 %» sin pleno exacto (199 de 200 redondea a 100 %), y la etiqueta completa
  (`199 de 200 · 100 %`) desmiente al porcentaje en la misma línea. Propuesta: `Math.floor`
  para el tramo alto, o no redondear al alza por encima de 99.

---

## WR-04 (ronda 4) — `UpdateBanner` e `HistorySavedNotice` comparten posición y capa, y la segunda tapa por completo a la primera

**Encontrado durante:** `09-REVIEW.md` (ronda 4), entrada WR-04.

**Descripción:** `UpdateBanner.vue:41-44` y `HistorySavedNotice.vue:58-61` son ambos
`fixed top-0 inset-x-0 z-40` con fondo opaco, montados como hermanos dentro del mismo
`<ClientOnly>` en `app/app.vue:23-33`. Si las dos están visibles a la vez ocupan
exactamente el mismo rectángulo; `HistorySavedNotice` va después en el DOM, así que tapa
por completo a `UpdateBanner`, incluyendo su CTA «Actualizar» y su `✕`. La combinación es
alcanzable sin nada exótico: el service worker detecta una versión nueva a media
partida (`registerType: 'prompt'` la deja visible hasta que se descarte), el grupo sigue
jugando y termina la partida.

**Por qué no se corrige aquí (evaluación de riesgo):** ambas bandas son transitorias y
ninguna afirma nada sobre los datos del grupo; la de actualización vuelve a ofrecerse en
cada carga por diseño (`registerType: 'prompt'`, elegido en `CLAUDE.md` precisamente para
no interrumpir una partida), así que el peor caso es retrasar una actualización hasta la
siguiente apertura de la app — nada se pierde de forma irreversible.

**Acción sugerida:** apilarlas en un contenedor común en `app/app.vue` en vez de
superponerlas.

---

## WR-05 (ronda 4) — `pointer-events-none` deja toques invisibles sobre la cabecera de `/historico`

**Encontrado durante:** `09-REVIEW.md` (ronda 4), entrada WR-05.

**Descripción:** `HistorySavedNotice.vue:60` y `UpdateBanner.vue:43` dejan pasar los
toques (`pointer-events-none` en el contenedor) pero siguen tapando visualmente la
cabecera `h-16` de `/historico` (`app/pages/historico.vue:40-57`), donde viven «Volver» y
«Estadísticas». Un toque sobre el texto de la banda activa un botón que no se ve: el
grupo cree tocar el aviso y acaba navegando a un sitio distinto del que quería.

**Por qué no se corrige aquí (evaluación de riesgo):** la ventana dura 20 s como máximo y
los dos controles afectados («Volver» y «Estadísticas») son navegaciones no destructivas
y reversibles con un toque; no hay pérdida de datos ni acción irreversible detrás. Queda
además dentro del guion de la comprobación humana pendiente (DEV-02), que es quien mejor
puede juzgar el impacto real en la tablet.

**Acción sugerida:** devolver `pointer-events-auto` al contenedor y añadir `padding-top` a
las pantallas mientras haya banda visible, o limitar la banda al ancho que no solapa los
controles de la cabecera.

**Nota:** la comprobación visual humana en tablet horizontal sigue **ABIERTA** bajo
`DEV-02` (`REQUIREMENTS.md`, pendiente desde `09-22-SUMMARY.md`). No se abre una entrada
nueva por ella — ya existe — pero no puede desaparecer del radar: en ningún sitio de este
documento ni de `REQUIREMENTS.md` puede aparecer como hecha.

---

## WR-06 (ronda 4) — el reintento que anuncia la variante recuperable registra una duración inflada

**Encontrado durante:** `09-REVIEW.md` (ronda 4), entrada WR-06.

**Descripción:** `NOTICE_BODY['failure-recoverable']` (`useHistorySavedNotice.ts:79`)
instruye a volver a entrar en la partida y pulsar «Partida terminada» otra vez para
reintentar el registro. Ese reintento restaura `persisted.context` tal cual vía
`resume()`, y `buildHistoryEntry` (`engine/history.ts:77-83`) calcula
`durationMs = now - context.startedAt` con `now = Date.now()` **en el momento del
reintento**. Si el grupo reintenta al día siguiente —justo lo que el aviso invita a
hacer—, la partida queda registrada con una duración de más de 24 h.

**Por qué no se corrige aquí (evaluación de riesgo):** solo se alcanza tras un fallo de
escritura del histórico Y un reintento muy posterior; D-08 define la duración como reloj
de pared sin tope y se decidió con un hecho conocido del grupo (las partidas se terminan
de una sentada), y la duración no se agrega en `/estadisticas` —que solo calcula % de
victorias por héroe y villano—, así que el radio de impacto es la etiqueta de duración de
UNA tarjeta del histórico.

**Acción sugerida:** congelar el instante de referencia al reanudar, o acumular la
duración en vez de derivarla de `startedAt` en el momento del registro.

---

## WR-02 (ronda 4) — `GameOutcomeDialog` declara `aria-modal` sin atrapar el foco (y WR-03, la restauración de foco inalcanzable)

**Encontrado durante:** `09-REVIEW.md` (ronda 4), entradas WR-02 y WR-03.

**Descripción:** `GameOutcomeDialog.vue:83-84` declara `role="dialog" aria-modal="true"`
sobre un panel opaco, pero `StepScreen`, `NavBand`, `AppHeader` e `IndexOverlay` siguen en
el DOM sin `inert`/`aria-hidden` y siguen siendo tabulables — `Tab` puede sacar el foco
del diálogo hacia un «SIGUIENTE» invisible, y `Enter` avanzaría la partida con el diálogo
de cierre abierto (WR-02). Además, la restauración de foco al cerrar
(`previouslyFocused.focus()`) es inalcanzable en las cuatro salidas reales porque
`IndexOverlay` y `GameOutcomeDialog` se desmontan en el mismo flush, dejando el nodo
desprendido del DOM (WR-03).

**Por qué no se corrige aquí (evaluación de riesgo):** el dispositivo objetivo del
proyecto es una tablet apoyada en la mesa y el uso real es táctil; la navegación por
`Tab` no es un modo de uso de este grupo, y el diálogo es opaco, así que el escenario
exige un teclado físico Y tabular a ciegas más allá del último botón.

**Acción sugerida:** el ciclo de foco de `WarningDetailModal.vue`, que ya es el patrón
bueno del repo.

---

## WR-02 (ronda 6) — tras una lectura fallida del progreso, el primer autoguardado de la partida nueva sobrescribe lo que no se pudo leer

**Encontrado durante:** `09-REVIEW.md` (ronda 5, WR-02) y confirmado por `09-VERIFICATION.md`
(ronda 6) como WARNING.

**Descripción:** con `stored === 'unknown'` al montar, la app enseña el mini-setup; el grupo
empieza otra partida y el primer `watchDebounced` que consiga escribir machaca
`tga:progress:<gameId>`, destruyendo una posición que quizá seguía ahí y que solo era
ilegible en ese instante. El plan 09-29 cierra la mitad honesta —la app **avisa** antes, con
`UNVERIFIED_PROGRESS_NOTICE`— pero no corta ni condiciona el autoguardado.

**Por qué no se corrige aquí (evaluación de RIESGO, no de alcance):** en las dos causas
realistas de un fallo de lectura —modo privado y cuota— la **escritura falla igual**, así
que no hay nada que destruir; el escenario dañino exige una lectura que falla y una
escritura posterior que funciona, es decir un fallo transitorio. El radio de impacto es el
PROGRESO de una partida (`tga:progress:<gameId>`), nunca el histórico (`tga:history`, otra
clave, intacta por HIST-09), que es el único dato irreconstruible. Y el grupo ha recibido
el aviso antes de empezar, así que la acción es informada. Cortar el autoguardado a cambio
dejaría sin guardar una partida que el grupo sí ha empezado a propósito — un daño cierto
para evitar uno improbable.

**Supuesto NO verificado (hallazgo del verificador de planes, ronda 6):** la frase «en las
dos causas realistas la escritura falla igual» asume que las causas de un fallo de LECTURA
coinciden con las de un fallo de ESCRITURA. Pero `usePersistedSession.ts` solo marca
`read: 'failed'` cuando `getItem` lanza o no hay `window` — un disparador más estrecho y
menos correlacionado con `QuotaExceededError` en `setItem` de lo que la justificación
supone, así que «la lectura falla y la escritura posterior funciona» puede ser menos raro
de lo que este texto sugiere. El diferimiento se mantiene (la mitigación de 09-29 sigue en
pie y el radio sigue siendo el progreso, nunca `tga:history`), pero esta entrada deja
constar por escrito que esta correlación está SUPUESTA y no comprobada contra el código,
para que una ronda futura pueda revisarla sin tener que volver a deducirla.

**Acción sugerida:** si alguna vez se aborda, archivar el blob ilegible bajo
`tga:progress:<gameId>:backup-<ts>` antes del primer `save()` de la partida nueva, en vez
de condicionar el autoguardado.

---

## La marca de progreso que no coincide vive en memoria (ronda 7)

**Encontrado durante:** plan 09-33 (cierre del tercer hallazgo de SC3 en `09-VERIFICATION.md`
ronda 7); evaluado explícitamente por riesgo en el plan 09-36.

**Descripción:** `useProgressMismatchMark.ts` transporta desde el cierre de una partida hasta
el modal de reanudación el hecho, ya comprobado, de que el progreso guardado en el dispositivo
no corresponde al punto en el que el grupo acaba de terminar (`stored === 'stale'`). La marca
es un `Set<string>` de estado de MÓDULO, nunca `localStorage`.

**Por qué no se corrige aquí (evaluación de riesgo, no de alcance de plan):**
- `'stale'` solo es alcanzable cuando el registro en el histórico **y** el guardado de cierre
  han fallado los dos; escribir la marca en `localStorage` en ese instante exacto sería la
  operación menos fiable de todo el sistema, y una marca que no se puede escribir en su propio
  escenario no es una mitigación — es otra afirmación sin respaldo.
- Lo que la marca en memoria SÍ cubre: el recorrido real del grupo, `/{juego}` → `/` →
  `/{juego}`, que es navegación de cliente de `vue-router` tras la hidratación del prerender de
  Nuxt, nunca una recarga de documento — comprobado en `09-33-SUMMARY.md` por razonamiento
  directo desde `nuxt.config.ts` (`ssr: true` + `nitro.prerender`) y un `grep -rn "external:
  true" app/` sin resultados, no observado en un navegador real (entorno de ejecución sin
  navegador disponible).
- Lo que NO cubre: una recarga completa del navegador, cerrar la pestaña, o reabrir la app al
  día siguiente. En esos casos el estado de módulo se vacía y el modal de reanudación vuelve a
  ofrecer el snapshot sin ningún aviso.
- **Por qué el riesgo residual es aceptable hoy, dicho como riesgo y no como excusa:** cuando la
  marca no está, la app no afirma nada — no dice algo falso —, y la copy del aviso de fin de
  partida (`endGameBody`, plan 09-32) ya no ordena el reintento en esa variante. Lo que se
  pierde en ese caso es la advertencia, no la corrección: el peor desenlace posible sigue siendo
  el mismo que antes de este lote (un registro que podría llevar datos de otra partida), nunca
  uno peor.

**Acción sugerida:** si algún día deja de ser aceptable, una clave hermana
(`tga:progress-mismatch:<gameId>`) escrita **en el siguiente arranque con éxito** — cuando el
almacenamiento vuelve a funcionar —, en vez de en el instante del fallo, que es precisamente el
instante menos fiable.

---

## La sonda de cobertura de bordes no clasificó ninguna fila (ronda 7)

**Encontrado durante:** plan 09-36, al preparar el cierre de la ronda 7.

**Descripción:** la sonda determinista de cobertura de bordes se ejecutó sobre los 14 IDs de la
fase (HIST-01..HIST-09, STAT-01..STAT-05) y devolvió las 14 filas como
`unclassified`/`unresolved`. Se registra como HECHO, no como problema resuelto: ninguna
garantía de este lote (09-32..09-35) se apoya en esa sonda, porque la sonda no dijo nada sobre
ninguna de las 14 filas — no hay que confundir «la sonda no dijo nada» con «la sonda dijo que
estaba bien».

**Por qué no se corrige aquí (evaluación de riesgo):** clasificar las 14 filas exigiría
reconstruir o repactar el criterio de la sonda misma, un cambio de herramienta ajeno al
contenido de este plan (cuatro ficheros de `.planning/`); y la garantía real de este lote no
depende de la sonda — depende de los tests y de las cuatro mutaciones ejecutadas que
`09-35-SUMMARY.md` registra con su mensaje de error real.

**Acción sugerida:** revisar el criterio de clasificación de la sonda antes de apoyar ninguna
garantía futura en ella; hasta entonces, tratar las 14 filas como información ausente, no como
aprobación.

---

## Nota de cierre (ronda 6, plan 09-31) — qué NO se difiere de la ronda 5

Para que ningún WARNING de la ronda 5 reaparezca aquí como «pendiente» sin serlo, y para
que ninguno de los que sigue abierto se dé por cerrado por descuido, un repaso explícito:
WR-05, WR-06 y WR-07 quedaron cerrados por el plan 09-28, y WR-03/WR-04 (los huecos del
gate) e IN-03/IN-05 quedaron cerrados por el plan 09-30. Nombrados uno a uno abajo, con su
plan:

- **WR-05** (comentario derogado en `HistorySavedNotice.vue` que instruía reintroducir el
  booleano) — **CERRADO por el plan 09-28.**
- **WR-06** (la ventana de `readStoredProgress`/`resume`/`expand` en `onOutcomeRecorded` sin
  `try/catch`) — **CERRADO por el plan 09-28.**
- **WR-07** (`PLACEHOLDER_CONTEXT` mutable y compartido entre llamadas) — **CERRADO por el
  plan 09-28.**
- **WR-03** (el gate no vigilaba los literales de `NoticeVariant` fuera de
  `useHistorySavedNotice.ts`) e **IN-03** (el gate no barría `<script setup>`, dejando
  invisible `endGameBody`) — **CERRADOS por el plan 09-30.**
- **WR-04** (`extraerTemplate` cortaba en el primer `</template>` anidado, cubriendo el
  1,9% de la plantilla de `index.vue`) — **CERRADO por el plan 09-30** (`regionVigilada`,
  barrido de `.ts`, Gate S).
- **IN-05** (evasión de Gate C por comillas dobles/backtick sin normalizar) — **CERRADO por
  el plan 09-30** (`normalizarComillas`).

Lo que sigue **ABIERTO**, sin cambios de este lote:

- **WR-04 (ronda 4)** — solapamiento `UpdateBanner`/`HistorySavedNotice` (más arriba en
  este fichero). Sigue abierto; este lote no lo toca.
- **WR-05 (ronda 4)** — `pointer-events-none` deja toques invisibles sobre la cabecera de
  `/historico` (más arriba en este fichero). Sigue abierto; este lote no lo toca.
- **WR-02 (ronda 6)**, arriba — nuevo en este lote, evaluado y diferido con riesgo, no
  cerrado.
- **La comprobación visual humana en tablet horizontal, `DEV-02` (`REQUIREMENTS.md`)** —
  sigue **ABIERTA** desde `09-22-SUMMARY.md`. En ningún sitio de este documento ni de
  `REQUIREMENTS.md` puede aparecer como hecha; el guion de esa comprobación gana dos puntos
  nuevos con este lote (aviso de lectura no comprobada del mini-setup, variante
  `failure-stale`), pero la comprobación en sí no se ha realizado. **Actualización (ronda 7,
  plan 09-36):** el lote 09-32..09-35 añade dos puntos MÁS al mismo guion —el texto reescrito
  de `failure-stale` (ya no afirma anterioridad ni diferencia de ronda) y el aviso nuevo de
  progreso que no coincide dentro del modal de reanudación (`ResumePrompt`, plan 09-33)—; la
  comprobación en tablet real sigue sin realizarse, en ningún sitio de este documento ni de
  `REQUIREMENTS.md` puede aparecer como hecha.

Ningún hallazgo nuevo, distinto de WR-02 (ronda 6) arriba, aparece en los SUMMARY de los
planes 09-28/09-29/09-30: la medición del punto 1 de la Task 3 de 09-30 (barrido ampliado
a `.vue`+`.ts` con el vocabulario ampliado de WR-04) coincidió EXACTAMENTE con los ficheros
y frases previstos por el propio WR-04 — «ningún fichero ni frase apareció fuera de lo
anticipado», según el propio `09-30-SUMMARY.md`.

---

## Nota de cierre (ronda 7, planes 09-32..09-36) — qué cierra este lote y qué sigue abierto

Repaso explícito, nombrado uno a uno con su plan, para que nada de lo cerrado reaparezca como
pendiente y nada de lo abierto se dé por cerrado por descuido:

- **La copy de `failure-stale` que afirmaba anterioridad temporal y diferencia de ronda** —
  **CERRADO por el plan 09-32**: `NOTICE_BODY['failure-stale']` reescrita sin esas dos
  afirmaciones; `useGameEndCopy.ts` extrae la copy del diálogo de fin de partida sin promesa de
  reintento.
- **El tercer hallazgo de SC3 (snapshot `'stale'` reofrecido sin marca al reentrar)** —
  **CERRADO SOLO A MEDIAS por el plan 09-33**: la discrepancia comprobada al cerrar viaja hasta
  `ResumePrompt` mediante una marca en memoria. Sigue como deuda explícita (ver «La marca de
  progreso que no coincide vive en memoria (ronda 7)» arriba): una recarga completa del
  navegador la pierde.
- **El gate de clase evadible por cinco vías** (vocabulario cerrado, `NOTICE_HEADING` fuera de
  Gate A/B, `'success'` sin vigilar en Gate C, comparador sin normalizar espacios, Gate S sin
  ejercer la decisión de Gate A) — **CERRADO por los planes 09-34 y 09-35**: criterio por
  raíces léxicas con respaldo comprobable (09-34); Gate S ejerciendo directamente
  `frasesSinAuditarDe`/`variantesSinRespaldoDe`/`respaldoExiste`, con cuatro mutaciones
  EJECUTADAS y revertidas (09-35).
- **HIST-06** — sigue **ABIERTO**, `[ ]` en `REQUIREMENTS.md`. Este lote cierra la octava cara
  concreta que la ronda 7 encontró; no cierra el requisito, que solo lo cierra una ronda de
  verificación independiente.
- **La sonda de cobertura de bordes** — sigue sin clasificar ninguna de las 14 filas (entrada
  nueva arriba, «ronda 7»). Ninguna garantía de este lote se apoya en ella.
- **`DEV-02`** (comprobación visual humana en tablet) — sigue **ABIERTA**, con dos puntos más de
  guion (ver la entrada de la nota de cierre de la ronda 6, ampliada arriba).
- **`WR-04` (ronda 4, solapamiento `UpdateBanner`/`HistorySavedNotice`) y `WR-05` (ronda 4,
  `pointer-events-none` tapa la cabecera de `/historico`)** — siguen **ABIERTOS**; este lote no
  los toca.
- **`WR-02` (ronda 6, autoguardado sobrescribe una lectura fallida)** — sigue **ABIERTO**; este
  lote no lo toca.

Ningún hallazgo nuevo, distinto de los dos registrados arriba (la marca en memoria y la sonda
sin clasificar), aparece en los SUMMARY de los planes 09-32/09-33/09-34/09-35.

---

## Ronda 8 / plan 09-38 — Gate A trata `huellaDelProgreso` como afirmación sin auditar, y self-tests de fixture del gate de invariantes quedan obsoletos por el propio arreglo

**Encontrado durante:** ejecución del plan 09-38 (GREEN del RED→GREEN de CR-01/WR-01).

**Descripción (hallazgo 1 — Gate A, `afirmacionesRespaldadas.test.ts`):** el nombre exigido por
el propio plan 09-38 para la función nueva de la autoridad —
`huellaDelProgreso` (`app/composables/useStoredProgress.ts`)— contiene, en código real (no
comentario), la subcadena «progreso», una de las raíces léxicas de
`RAICES_SOBRE_LOS_DATOS_DEL_GRUPO`. `useStoredProgress.ts` nunca había necesitado una entrada
en `AFIRMACIONES_AUDITADAS` (Gate A) porque sus identificadores previos usaban el inglés
(«Progress»), no «progreso». La coincidencia es un falso positivo de una heurística basada en
subcadenas — la afirmación real ocurre DENTRO de la autoridad, el único sitio con permiso para
producirla — pero el gate no distingue eso de una copy sin respaldo. `npm test` sale con 1 test
más en rojo: `Gate A > /app/composables/useStoredProgress.ts no afirma nada ... sin auditoría`.

**Descripción (hallazgo 2 — self-tests de fixture, `invariantesDeMarcaDeEstado.test.ts`):**
cuatro tests de ESE mismo fichero, cada uno etiquetado explícitamente `(HOY)`/`(ROJA hoy)` en
su propio nombre, comprueban el resultado de las funciones puras del gate (`contratoDeLaMarcaDe`,
`lecturasSinTestigoDe`, `faltaPruebaDeCicloDeVidaEn`, `ramasQueLeenSinPintarDe`) contra el
contenido REAL de los ficheros de producción/test, con un valor esperado hardcodeado que
describía el estado ROTO (pre-09-38). Tras el arreglo, esos cuatro self-tests-de-fixture se
vuelven falsos por construcción — exactamente el resultado que su propio nombre («HOY») avisaba
que era temporal. Importante: las CINCO PATAS reales (los bloques `it.each` que ejercen el
invariante sobre `marcasNoAuditadas`, la comprobación de verdad de este gate) están TODAS EN
VERDE — CR-01/WR-01 están genuinamente cerrados en producción. Solo los cuatro self-tests de
fixture, que documentaban el estado de "HOY" de 09-37, se quedan desincronizados con la realidad
nueva.

**Por qué no se corrige aquí:** el `<scope_boundary>` del propio plan 09-38 dice, textualmente,
que tanto `afirmacionesRespaldadas.test.ts` como `invariantesDeMarcaDeEstado.test.ts` "los
escribió el plan 09-37 y los retoca el 09-39. Este plan los EJECUTA, no los edita." — prohibición
explícita, sin excepción para añadir una entrada de auditoría nueva o para actualizar un valor
esperado obsoleto. `09-38-SUMMARY.md` documenta con precisión, con mensajes de test literales,
exactamente qué 5 tests quedan en rojo y por qué ninguno de los dos hallazgos indica una
regresión de producción.

**Acción sugerida (para el plan 09-39, que ya retoca ambos gates por scope_boundary):**
1. Añadir una entrada a `AFIRMACIONES_AUDITADAS['app/composables/useStoredProgress.ts']` para la
   raíz `'progreso'`, con motivo («`huellaDelProgreso` es la propia autoridad calculando su
   huella, no una afirmación externa sin respaldo») y respaldo
   `app/composables/__tests__/useStoredProgress.test.ts`.
2. Actualizar los cuatro valores hardcodeados de los self-tests `(HOY)`/`(ROJA hoy)` de
   `invariantesDeMarcaDeEstado.test.ts` (líneas ~329, ~395, ~491, ~596 al cerrar el plan 09-38)
   para que reflejen el estado ARREGLADO (aridadDelLector=2, sin llamadas sin testigo, con prueba
   de ciclo de vida, sin ramas sin pintar) — o retirarlos si ya no aportan nada una vez que las
   patas reales `it.each` cubren lo mismo sobre el árbol vivo.

**Encontrado durante (hallazgo 3 — gap de cobertura de la segunda defensa):** la Task 3 del plan
09-38 ejecutó la mutación exigida por su propio `<acceptance_criteria>`: quitar la llamada a
`clearProgressMismatch(gameId)` de `onResumeContinue`
(`app/pages/[game]/index.vue`) y comprobar qué test se pone rojo. Resultado real: NINGÚN test se
puso rojo — ni en `invariantesDeMarcaDeEstado.test.ts` (la validación de huella cubre el
escenario canónico, así que el gate de invariantes sigue en verde, tal como el plan anticipaba)
NI en ningún test de `useProgressMismatchMark.test.ts`/`useStoredProgress.test.ts` (que solo
pueden ejercer la API pública del composable, nunca la función privada `onResumeContinue` de la
página). El plan 09-38 mismo anticipó este desenlace por escrito («Si ningún test se pusiera
rojo, escribirlo así en el SUMMARY y añadir el test que falte») pero el `<files>` de la Task 3
solo declara los dos test files de composable — ninguno puede importar ni ejercer una función
`<script setup>` privada de un SFC de página.

**Por qué no se corrige aquí:** el `<scope_boundary>` de 09-38 limita este plan a los seis
ficheros de `files_modified`; ninguno es un test de página, y crear uno nuevo violaría
literalmente esa restricción ("DENTRO: los seis ficheros de `files_modified`").

**Acción sugerida:** un test de integración (Vue Test Utils / `@nuxt/test-utils`, montando
`app/pages/[game]/index.vue` con una sesión marcada y simulando el clic de «Continuar») que
falle si `onResumeContinue` deja de llamar a `clearProgressMismatch`. Alternativamente, una pata
NUEVA en `invariantesDeMarcaDeEstado.test.ts` (fuera del alcance de 09-38 y 09-39 tal como están
escritos hoy) que exija, para cada rama de invalidación explícita documentada en el propio
comentario del `retirador`, una llamada real en el fichero que la documenta — hoy la Pata 2 solo
vigila LECTURAS sin testigo, nunca la AUSENCIA de una llamada de retirada esperada.
