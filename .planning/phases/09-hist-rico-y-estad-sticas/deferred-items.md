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
