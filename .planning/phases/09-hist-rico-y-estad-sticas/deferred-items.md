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

**Actualización (quick 260923-3rm) — CERRADO:** `usePersistedSession.ts` distingue ahora
`readHistoryState()` (`'ok' | 'read-failed' | 'uninterpretable'`, exactamente la propuesta de
arriba) de `readHistory()` (contrato sin cambios, sigue colapsando en `'unreadable'` para
`useHistorySync.ts`). `archiveUnreadableHistory(now)` es la acción explícita sugerida: copia el
blob a `tga:history:backup-<now>`, RELEE y compara byte a byte antes de retirar `tga:history`, y
solo devuelve `'archived'` tras una relectura final que confirma la clave ausente — nunca destruye
lo que no ha podido verificar (CR-03 intacto). `/historico` explica el estado (con copy distinta
según `'read-failed'`/`'uninterpretable'`, la segunda con botón «Apartarlo y empezar uno nuevo») y
`/estadisticas` explica su propia mitad. Fijado por test en
`app/composables/__tests__/usePersistedSession.test.ts` (`readHistoryState`/
`archiveUnreadableHistory`, los cinco resultados del `<behavior>`) y por
`e2e/unreadable-storage.spec.ts` (a) (navegador real: apartar de verdad, con el backup verificado
byte a byte en `localStorage`). Comandos y resultado: `npx vitest run
app/composables/__tests__/usePersistedSession.test.ts` (90 tests), `npx vitest run` (1259 tests,
0 fallos), `npm run typecheck` (exit 0), `npx playwright test e2e/unreadable-storage.spec.ts` (3
passed).

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

**Re-comprobado (quick 260923-3rm):** sigue cerrado; `Escape` sigue sin cerrar el diálogo A
PROPÓSITO (comprobado de nuevo en `e2e/game-outcome-dialog.spec.ts`, navegador real). La trampa
de foco nueva de WR-02 (ronda 4, más abajo en este fichero) lo complementa sin reabrirlo: ahora
además de no cerrarse con `Escape`, el foco tampoco puede salir del diálogo con `Tab`.

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

**Re-comprobado (quick 260923-3rm):** el cierre de 09-22 sigue siendo cierto,
ahora con OTRO mecanismo — la banda ya no se saca del flujo con `fixed` para
luego restarle altura por número de capa; en vez de eso vive EN FLUJO dentro
de un contenedor `shrink-0` de `app/app.vue`, así que la página (`flex-1
min-h-0`) resta exactamente su altura real, sea cual sea, en vez de flotar
por encima. La propiedad («ninguna pantalla `h-dvh`/`h-full` queda empujada
fuera del viewport mientras hay banda visible») queda fijada ahora por
`app/composables/__tests__/pilaDeAvisos.test.ts` (parte (c): ningún `.vue` de
`app/components/`/`app/pages/` usa `h-dvh` como clase — todas toman `h-full`
del envoltorio de `app/app.vue`) y por `e2e/notice-stack.spec.ts`
(navegador real: `document.documentElement.scrollHeight <=
window.innerHeight` con el aviso visible). La comprobación visual humana en
tablet real sigue **PENDIENTE** — no se declara hecha aquí ni en
`REQUIREMENTS.md` (mismo matiz honesto que dejó `09-22-SUMMARY.md`).

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

**Actualización (quick 260923-3rm) — CERRADO:** `engine/statistics.ts` añade
`entriesWithVillain` a `StatisticsSummary`, contado con el MISMO predicado que `extractVillainId`
(el que alimenta `villainRows`). `buildStatisticsView` sustituye `sampleCaption` por
`heroSampleCaption`/`villainSampleCaption` (misma forma de copy de 09-UI-SPEC, «villano anotado»
en singular tal como pedía la especificación), y `estadisticas.vue` pinta cada leyenda encima de
su propio `<h2>` en vez de un pie compartido. Fijado por test en
`engine/__tests__/statistics.test.ts` (`entriesWithVillain` con villano-sin-héroes y
héroes-sin-villano) y `app/composables/__tests__/useGameHistory.test.ts`
(`heroSampleCaption`/`villainSampleCaption`, incluido el singular «villano anotado»). Comandos y
resultado: `npx vitest run engine/__tests__/statistics.test.ts` (30 tests), `npx vitest run`
(1259 tests, 0 fallos), `npm run typecheck` (exit 0).

---

## INFO de `09-REVIEW.md` que son deuda real (IN-04, IN-05, IN-07, IN-11, IN-12, IN-13)

**Encontrado durante:** `09-REVIEW.md` (ronda 1), reconfirmados por `09-AUDIT-FRONTERAS.md`
(plan 09-17) como deuda que NO se cierra en este lote — arreglarlos cambiaría contratos
públicos ya fijados por test, fuera del alcance mínimo de un cierre de huecos.

- **IN-04** — `app/composables/usePersistedSession.ts:340-361` (`appendHistoryEntry`): el
  histórico crece sin tope ni poda. El día que tope la cuota de `localStorage`, el síntoma es
  el aviso de fallo de WR-02 arriba, sin explicación adicional. Propuesta: un tope (p. ej. 500
  entradas) o una poda explícita de las más antiguas al escribir.
  **CERRADO (quick 260923-3rl):** `HISTORY_MAX_ENTRIES = 500` en `appendHistoryEntry`
  (`app/composables/usePersistedSession.ts`) — cada registro corta el envoltorio a las 500
  entradas más recientes. Fijado por test en `app/composables/__tests__/usePersistedSession.test.ts`
  (500 entradas sembradas + 1 registro deja exactamente 500, la más antigua desaparece).
- **IN-05** — `engine/history.ts` (`buildHistoryEntry`, generación de `id`):
  `Math.random().toString(36).slice(2, 12)` da entre 0 y 10 caracteres
  (`Math.random() === 0` ⇒ sufijo vacío ⇒ `id` = `"1789…-"`), lo que incumpliría el regex que
  el test ya fija (`/^\d+-[a-z0-9]+$/`). Propuesta: `crypto.randomUUID()` (disponible en todos
  los navegadores objetivo, contexto seguro) — cambio de formato de `id` que exige actualizar
  el test existente, fuera del alcance mínimo de este plan.
  **CERRADO (quick 260923-3rl):** el id pasa a `crypto.randomUUID()`, con un respaldo que
  nunca lanza y nunca deja el sufijo vacío fuera de contexto seguro. Fijado por test en
  `engine/__tests__/history.test.ts` (formato UUID v4 con `crypto.randomUUID` disponible;
  `globalThis.crypto` sustituido por `undefined` y `Math.random` forzado a 0 para el respaldo).
- **IN-07** — `e2e/offline-flow.spec.ts:26-28`: un `throw` a nivel de módulo si
  `public/audio/` no tiene `.m4a` aborta la suite completa de Playwright, incluidos los tests
  de `/historico` y `/estadisticas` que no dependen del audio. Propuesta: mover la comprobación
  a `test.skip(condition, …)` dentro del test que la necesita. Vive en `e2e/`, fuera del
  perímetro de composables/motor que audita 09-17.
  **CERRADO (quick 260923-3rl):** la resolución del clip pasa a una función perezosa
  (`firstAudioClipId`) invocada solo dentro del test del paso 7, con `test.skip(...)` cuando no
  hay ningún `.m4a`; el resto de tests del fichero ya no depende de que exista audio. Fijado por
  la comprobación de listado de Playwright (0 tests antes del cambio, 5 después, desde dos
  directorios temporales sin `public/audio/`) y por la ejecución completa de
  `e2e/offline-flow.spec.ts` (5 passed, 0 skipped en este checkout).
- **IN-11** — `app/composables/usePersistedSession.ts:377-395`
  (`removeHistoryEntry`): devuelve `void` e ignora el booleano de `writeRaw`; un fallo de
  escritura deja la tarjeta visible sin explicación tras `reload()`, y el grupo cree que el
  botón de borrar no funciona. Propuesta: un aviso reutilizando `HistorySavedNotice`.
  **CERRADO (quick 260923-3rl):** `removeHistoryEntry`/`useGameHistory().remove(id)` devuelven
  `boolean`; `/historico` pinta un aviso en línea propio (no `HistorySavedNotice`, cuyas
  variantes son solo de fin de partida y Gate C prohíbe un `NoticeVariant` fuera de
  `useHistorySavedNotice.ts`) cuando el borrado falla. Fijado por test en
  `app/composables/__tests__/usePersistedSession.test.ts` y
  `app/composables/__tests__/useGameHistory.test.ts`.
- **IN-12** — `app/composables/usePersistedSession.ts:319-323` (`loadHistory`): una entrada
  rechazada por `isGameHistoryEntry` es invisible (se filtra antes de pintar) y no se puede
  borrar (no hay tarjeta con su `id` para invocar `removeHistoryEntry`). Ocupa cuota para
  siempre. Va junto con IN-04: hace falta una vía de mantenimiento.
  **CERRADO (quick 260923-3rl):** `appendHistoryEntry` filtra las entradas previas por
  `isGameHistoryEntry` antes de reescribir el envoltorio, así que lo que la pantalla ya rechazaba
  también se descarta del disco en el siguiente registro con éxito; `removeHistoryEntry` sigue
  siendo conservador con lo que no reconoce (CR-03/WR-08 intactos), y la regla de subir
  `HISTORY_FORMAT_VERSION` ante un cambio de forma queda escrita junto a la constante. Fijado por
  test en `app/composables/__tests__/usePersistedSession.test.ts`.
- **IN-13** — `engine/statistics.ts:72` (`buildRows`, cálculo de `pct`): `Math.round` puede
  anunciar «100 %» sin pleno exacto (199 de 200 redondea a 100 %), y la etiqueta completa
  (`199 de 200 · 100 %`) desmiente al porcentaje en la misma línea. Propuesta: `Math.floor`
  para el tramo alto, o no redondear al alza por encima de 99.
  **CERRADO (quick 260923-3rl):** `winPercentage` (nueva, exportada) acota `100` a un pleno
  exacto y `0` a cero victorias; decisión propia: también se acota el extremo bajo (1 de 201 ya
  no pinta «0 %»), el mismo defecto en la misma línea. Fijado por test en
  `engine/__tests__/statistics.test.ts`.

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

**Actualización (quick 260923-3rm) — CERRADO:** `app/app.vue` sustituye el
mecanismo `fixed` de 09-22 por una franja EN FLUJO: un contenedor `shrink-0
flex flex-col` contiene, en este orden, `UpdateBanner` (versión nueva,
prioridad más alta) y `HistorySavedNotice` (aviso de registro), ambos ya sin
`fixed`/`inset-x-0`/`z-40`/`pointer-events-none`/`pointer-events-auto`. Si las
dos bandas están visibles a la vez se apilan una debajo de la otra en vez de
ocupar el mismo rectángulo — ninguna tapa a la otra. Evidencia:
`app/composables/__tests__/pilaDeAvisos.test.ts` (gate estructural — parte
(a): ninguna de las dos bandas lleva los tokens prohibidos; parte (b): la
franja tiene la forma exacta) y `e2e/notice-stack.spec.ts` (navegador real:
un toque en el encabezado del aviso cae dentro de `[role="status"]`).
Comandos y resultado reales: `npx vitest run app/composables/__tests__/pilaDeAvisos.test.ts`
(12 passed), `npx vitest run` (1195 tests, 0 fallos), `npm run typecheck`
(exit 0), `npx playwright test e2e/notice-stack.spec.ts e2e/counter-band-height.spec.ts
e2e/portrait-usable.spec.ts` (9 passed).

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

**Actualización (quick 260923-3rm) — CERRADO:** las bandas dejan de estar
posicionadas (`fixed`) y de tener `pointer-events` propios: al vivir EN
FLUJO dentro de la franja de `app/app.vue`, la cabecera `h-16` de
`/historico` (`‹ Atrás` / `Estadísticas ›`) queda SIEMPRE por debajo del
borde inferior de la franja, nunca superpuesta — no hace falta ningún
`pointer-events-auto`/`padding-top` porque ya no hay solape que resolver.
Evidencia: `app/composables/__tests__/pilaDeAvisos.test.ts` (parte (a): sin
`pointer-events-none`/`pointer-events-auto`) y `e2e/notice-stack.spec.ts`
(navegador real: el `boundingBox` de «Estadísticas ›» empieza en o por
debajo del borde inferior del aviso, y un toque en su centro cae en ese
botón, nunca en el aviso). Comandos y resultado: ver la entrada de WR-04
(ronda 4) de arriba (mismos comandos, misma ejecución).

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

**Actualización (quick 260923-3rm) — CERRADO:** `freezeEndInstant` (`engine/history.ts`)
congela el instante del PRIMER «Partida terminada» en `context.endedAt`, sellado por
`stampEndOfGame` (`useGameHistory.ts`, `Date.now()` leído ahí y solo ahí) justo antes de
`record()` en `onOutcomeRecorded` (`app/pages/[game]/index.vue`). `buildHistoryEntry` usa
ese sello para `durationMs`/`recordedAt` mientras siga describiendo la posición actual
(mismo `runtimeId`+`round`); D-07 (`startedAt` nunca se reescribe) y D-08 (reloj de pared
sin tope, sin acumular tiempo activo) quedan intactos — lo único que cambia es CUÁNDO se
lee ese reloj. Dos residuos conocidos, sin esconderlos:
(a) si el guardado del fallo (`save()`) tampoco llega a escribirse, el reintento no lleva
sello en disco y mide como antes (D-08 sin sello, camino ya existente);
(b) tras una reanudación con «el contenido ha cambiado» (`ContentChangedNotice`) la
posición cambia (otra `round`/`runtimeId` de reinicio de sección) y el sello deja de
aplicar por diseño — `freezeEndInstant` lo sustituye por uno nuevo, D-08 tal cual.
Fijado por test en `engine/__tests__/history.test.ts` (`freezeEndInstant`/`buildHistoryEntry`
con sello válido, de otra posición, y cinco variantes de sello corrupto que nunca lanzan) y
por `app/composables/__tests__/useGameHistory.test.ts` (`stampEndOfGame`). Comandos y
resultado: `npx vitest run engine/__tests__/history.test.ts` (76 tests), `npx vitest run`
(1224 tests, 0 fallos), `npm run typecheck` (exit 0).

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

**Actualización (quick 260923-3rm) — CERRADO:** `useDialogFocusTrap.ts` (composable nuevo)
atrapa el foco dentro de `GameOutcomeDialog.vue`: `Tab`/`Shift+Tab` ciclan SOLO entre sus
botones, incluso cuando el foco llega desde fuera del diálogo (`nextTrappedIndex`, función
pura con tabla de verdad completa), y la restauración de foco al cerrar (WR-03) solo llama
a `.focus()` cuando el nodo previamente enfocado SIGUE conectado al DOM
(`resolveRestoreTarget`) — en las cuatro salidas reales de este diálogo el botón que lo
abrió se desmonta en el mismo flush, así que la restauración es un no-op intencional ahí, y
protege un futuro cierre no terminal. Fijado por test en
`app/composables/__tests__/useDialogFocusTrap.test.ts` (las dos funciones puras, tabla de
verdad completa) y por `e2e/game-outcome-dialog.spec.ts` (navegador real: 12 `Tab` + 12
`Shift+Tab` comprobando tras CADA pulsación que el foco sigue dentro del diálogo y en un
`BUTTON`; `Escape` sigue sin cerrar; «Salir sin registrar» + `Enter` sí cierra). Comandos y
resultado: `npx vitest run app/composables/__tests__/useDialogFocusTrap.test.ts` (10 tests),
`npx playwright test e2e/game-outcome-dialog.spec.ts` (1 passed).

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

**Actualización (quick 260923-3rm) — CERRADO:** exactamente la acción sugerida arriba.
`backupProgressBeforeOverwrite(gameId, now)` (`usePersistedSession.ts`) copia el crudo de
`tga:progress:<gameId>` a `tga:progress:<gameId>:backup-<now>`, releído y comparado byte a byte,
ANTES de que pueda escribirse nada — nunca escribe la clave principal. `createOverwriteGuard`
envuelve `save` con esa copia: se arma en `onMounted` (`app/pages/[game]/index.vue`) exactamente
cuando `planProgressMount` devolvió un aviso de lectura no verificada, y los tres llamadores del
autoguardado (`watchDebounced`, `pagehide`, el guardado tras registro fallido) pasan por
`progressWriter.save(...)` en vez de `save(...)` directo. El «Supuesto NO verificado» de arriba
deja de sostener nada: el guardián ya NO depende de que lectura y escritura fallen juntas —
mientras la clave siga sin poder leerse, sencillamente no se escribe encima, punto. Coste
aceptado, registrado por escrito: las copias se acumulan en la cuota una vez por episodio de
lectura fallida (T-3rm-02 del threat model de este plan) — riesgo evaluado, no una garantía
nueva. `UNVERIFIED_PROGRESS_NOTICE` se reescribe para describir la mitigación real en vez de
advertir de un riesgo que ya no corre («antes de guardar la nueva, la app aparta una copia de la
que hubiera, y mientras no consiga leerla no guarda encima»). Fijado por test en
`app/composables/__tests__/usePersistedSession.test.ts` (`backupProgressBeforeOverwrite`/
`createOverwriteGuard`, el `<behavior>` completo: sin armar, armado con backup, armado con
lectura caída, armado con escritura del backup caída) y por `e2e/unreadable-storage.spec.ts` (b)
y (c) (navegador real: el backup aparece con el blob anterior byte a byte, y con la lectura
SIEMPRE caída la clave principal nunca se sobrescribe). Comandos y resultado: `npx vitest run
app/composables/__tests__/usePersistedSession.test.ts` (90 tests), `npx vitest run` (1259 tests,
0 fallos), `npm run typecheck` (exit 0), `npx playwright test e2e/unreadable-storage.spec.ts` (3
passed).

---

## La marca de progreso que no coincide vive en memoria (evaluada en la ronda 7, corregida en la ronda 8)

**Encontrado durante:** plan 09-33 (cierre del tercer hallazgo de SC3 en `09-VERIFICATION.md`
ronda 7); evaluado explícitamente por riesgo en el plan 09-36; **la propia evaluación de riesgo,
corregida en la ronda 8 (plan 09-40)** porque solo cubría la mitad del problema — ver más abajo.

**Descripción:** `useProgressMismatchMark.ts` transporta desde el cierre de una partida hasta
el modal de reanudación el hecho, ya comprobado, de que el progreso guardado en el dispositivo
no corresponde al punto en el que el grupo acaba de terminar (`stored === 'stale'`). La marca
es un `Map<string, string>` de estado de MÓDULO (gameId → huella, desde el plan 09-38), nunca
`localStorage`.

**La evaluación de riesgo tiene que distinguir DOS casos, y la versión anterior de esta entrada
solo distinguía uno:**

- **Caso A, la marca se pierde.** Recarga completa del navegador, pestaña cerrada, o —nuevo
  desde el plan 09-38— cualquier reescritura del progreso que cambie su huella. Desenlace: el
  grupo no recibe una advertencia que le habría sido útil. Es una PÉRDIDA de aviso, evaluada y
  aceptada por escrito: el peor desenlace sigue siendo el mismo que antes de todo este trabajo
  (un registro que podría llevar datos de otra partida), nunca uno peor.
- **Caso B, la marca persiste cuando ya no es cierta.** Es el que la ronda 8 confirmó por
  trazado de código: continuar sobre el snapshot marcado, dejar que el autoguardado lo
  sustituya, salir sin terminar y volver a entrar. Desenlace: la app enseña una frase que en ese
  momento es falsa. **Inaceptable**, y por eso no se difiere: lo cierra el plan 09-38.

**Lo que esta entrada afirmaba hasta la ronda 7, y que era incorrecto:** la versión anterior
solo contemplaba el Caso A y concluía que, cuando la marca no está, «la app no afirma nada» y
que lo único que se pierde en ese caso es la advertencia — una garantía que se leía como si
cubriera también el Caso B, cuando solo hablaba del Caso A. Es exactamente el patrón que esta
fase persigue desde la ronda 1: un texto de cierre que no cubre el caso que de verdad importa,
esta vez dentro de la propia documentación que sellaba el hallazgo anterior.

**El mecanismo que hace el Caso B imposible por construcción, no por intención (ronda 8, plan
09-38):** el lector de la marca (`readProgressMismatchWarning`,
`app/composables/useProgressMismatchMark.ts`) compara la huella del progreso que había cuando se
puso (`huellaDelProgreso`, `app/composables/useStoredProgress.ts`) con la huella del progreso
que hay al leer, y no devuelve nada si no coinciden. La tabla de verdad completa de ese lector
—incluida la prueba de ciclo de vida que pone con una huella y lee con otra distinta esperando
`null`— está fijada por test en
`app/composables/__tests__/useProgressMismatchMark.test.ts`. Sin esas rutas, esta afirmación no
se podría ir a comprobar y sería otra vez el mismo defecto que esta entrada corrige.

**El camino de pérdida NUEVO que introduce la validación por huella (Caso A, coste conocido,
registrado aquí para que no lo descubra la ronda siguiente):** la huella cubre los siete campos
de la posición persistida, `updatedAt` incluido, así que el propio autoguardado que dispara el
montaje al restaurar la sesión ya cambia la huella. Consecuencia concreta: si el grupo entra, ve
el aviso y sale sin elegir ni continuar, al volver a entrar ya no lo verá — el aviso solo
sobrevive hasta el primer autoguardado tras el montaje, no hasta que el grupo actúe sobre él. Es
Caso A, se acepta. **Alternativa considerada:** excluir `updatedAt` de la huella evitaría este
camino de pérdida concreto, al precio de que la garantía del Caso B volviera a depender de que
todos los caminos de invalidación estén enumerados a mano — exactamente el mecanismo que CR-01
demostró que falla. Hoy se prefiere la garantía estructural (Caso B imposible por construcción)
sobre esta cobertura adicional del Caso A.

**Lo que sigue siendo cierto, conservado de la ronda 7:**
- No se escribe en el almacenamiento persistente del navegador: `'stale'` solo es alcanzable
  cuando el registro en el histórico **y** el guardado de cierre han fallado los dos; una
  tercera escritura justo en ese instante sería la operación menos fiable de todo el sistema, y
  una marca que no se puede escribir en su propio escenario no es una mitigación — es otra
  afirmación sin respaldo.
- Lo que la marca en memoria SÍ cubre: el recorrido real del grupo, `/{juego}` → `/` →
  `/{juego}`, que es navegación de cliente de `vue-router` tras la hidratación del prerender de
  Nuxt, nunca una recarga de documento — comprobado en `09-33-SUMMARY.md` por razonamiento
  directo desde `nuxt.config.ts` (`ssr: true` + `nitro.prerender`) y un `grep -rn "external:
  true" app/` sin resultados, no observado en un navegador real (entorno de ejecución sin
  navegador disponible).
- Lo que NO cubre: una recarga completa del navegador, cerrar la pestaña, reabrir la app al día
  siguiente, o —ahora también, ver el camino de pérdida nuevo arriba— cualquier reescritura del
  progreso que cambie su huella.

**Acción sugerida:** si algún día el camino de pérdida nuevo deja de ser aceptable, la
alternativa concreta es excluir `updatedAt` de `huellaDelProgreso`
(`app/composables/useStoredProgress.ts`), con el coste de cobertura ya señalado arriba.

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

---

## Nota de cierre (ronda 8, planes 09-37..09-40) — qué cierra este lote, qué sigue abierto y qué atraparía la décima cara

Repaso explícito, nombrado uno a uno con su plan, para que nada de lo cerrado reaparezca como
pendiente y nada de lo abierto se dé por cerrado por descuido:

- **CR-01** (la marca de discrepancia de `useProgressMismatchMark.ts` no se invalidaba al
  continuar sobre el snapshot marcado) — **CERRADO por el plan 09-38**: validación de huella del
  referente (`huellaDelProgreso`, `app/composables/useStoredProgress.ts`) más invalidación
  explícita en `onResumeContinue`/`onContentChangedAcknowledge`.
- **WR-01** (la rama `awaitingContentChangedAck` de `app/pages/[game]/index.vue` calculaba el
  aviso de discrepancia sin pintarlo ni retirarlo) — **CERRADO por el plan 09-38**:
  `ContentChangedNotice.vue` gana la prop `mismatchWarning` y la pinta, misma forma que
  `ResumePrompt.vue`.
- **El hallazgo sobre esta misma documentación** (la evaluación de riesgo de la marca en memoria
  solo cubría el Caso A —la marca se pierde— y se leía como si cubriera también el Caso B —la
  marca persiste cuando ya no es cierta—) — **CERRADO por este plan (09-40)**: la sección de
  arriba («La marca de progreso que no coincide vive en memoria») distingue los dos casos por
  escrito, nombra el mecanismo y las rutas que sostienen la garantía, y registra el coste nuevo
  (el camino de pérdida por `updatedAt`) antes de que nadie lo descubra.
- **WR-02** (el mecanismo de excepción auditada de los dos gates aceptaba un respaldo que
  existía pero no respaldaba nada — el contraejemplo de `useGameEndCopy.ts`/`guardad` apuntando a
  un fichero real sin relación) — **CERRADO por el plan 09-39**: `respaldoRespaldaA` exige que el
  respaldo citado contenga la raíz o un identificador comprobable del motivo, demostrado por
  mutación ejecutada y revertida.
- **WR-03** (un motivo circular pasaba el gate por evitar una única frase concreta, sin exigir
  que nombrara algo comprobable) — **CERRADO por el plan 09-39**: `motivoNombraAlgoComprobable`
  es incondicional para toda entrada, sin puerta de entrada por subcadena literal; las tres
  redacciones circulares de `09-REVIEW.md` quedan fijadas como fixture permanente, las tres en
  rojo.
- **IN-01** (el umbral de longitud de 40 caracteres mide forma, no sustancia) — **DOCUMENTADO,
  no retirado, por el plan 09-39**: el umbral se conserva con un comentario explícito de que mide
  longitud, no sustancia; la sustancia la comprueban ahora `respaldoRespaldaA` y
  `motivoNombraAlgoComprobable`.

Lo que sigue **ABIERTO**, nombrado uno a uno para que nada se dé por cerrado por descuido:

- **El solape `UpdateBanner`/`HistorySavedNotice`** (WR-04, ronda 4, más arriba en este fichero)
  — sigue abierto; este lote no lo toca.
- **Los toques invisibles sobre la cabecera de `/historico`** (WR-05, ronda 4, más arriba en
  este fichero) — sigue abierto; este lote no lo toca.
- **La vía de recuperación de un blob permanentemente ilegible** (el primer `WR-02` de este
  fichero, más arriba) — sigue abierto; este lote no lo toca.
- **La sonda de cobertura de bordes** — las 14 filas HIST-01..09/STAT-01..05 siguen sin
  clasificar (ronda 7, más arriba en este fichero); ninguna garantía de este lote se apoya en
  ella.
- **La comprobación visual humana en tablet (`DEV-02`)** — sigue **ABIERTA**. Su guion gana en
  esta ronda el punto del aviso de discrepancia dentro de `ContentChangedNotice.vue`
  (`REQUIREMENTS.md`); añadir el punto al guion no es realizar la comprobación, y no se escribe
  aquí que se haya realizado.

**Párrafo de anti-recurrencia, escrito como propiedad comprobable — qué haría falta para que la
DÉCIMA cara de este defecto la encuentre una ejecución de la suite y no otra ronda de revisión
humana:**

(a) el descubrimiento de marcas de `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`
es un glob sobre `app/composables/**`, así que cualquier composable nuevo con estado de módulo
mutable y una raíz vigilada entra solo en la auditoría, sin que nadie edite ninguna lista;
(b) una vez dentro, tiene que demostrar que su lector valida el referente, que su fichero
hermano de tests (`app/composables/__tests__/*.test.ts`) recorre el ciclo completo de vida, y
que todas las ramas de montaje que lo leen lo pintan;
(c) toda excepción auditada de los dos gates
(`app/composables/__tests__/afirmacionesRespaldadas.test.ts`,
`app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`) tiene que citar un respaldo cuyo
contenido tenga que ver con lo que afirma (`respaldoRespaldaA`,
`app/composables/__tests__/vocabularioDeAfirmaciones.ts`) y nombrar algo comprobable
(`motivoNombraAlgoComprobable`, mismo fichero);
(d) toda condición de calidad de esas excepciones tiene un caso sintético que la pone roja,
vigilado por su propio test de cierre de cobertura en ambos gates.

Esto cubre la clase de defecto que las nueve rondas de esta fase han encontrado — y **no es una promesa** de que no haya una décima de otra clase: decir lo contrario sería, una vez más, una
afirmación sin respaldo.

---

## Nota de cierre (quick 260923-3rm) — los últimos WARNING reales de la Fase 9

Este lote cierra los siete WARNING que seguían abiertos de rondas anteriores y re-comprueba los
dos que ya estaban cerrados por un mecanismo distinto. Repaso explícito, uno a uno, con su tarea:

**Cerrados en este lote:**

- **WR-04 (ronda 4)** — solapamiento `UpdateBanner`/`HistorySavedNotice` — **CERRADO (Task 1)**:
  franja en flujo en `app/app.vue`, sin `fixed`/`z-40`/`pointer-events` en ninguna de las dos
  bandas.
- **WR-05 (ronda 4)** — toques invisibles sobre la cabecera de `/historico` — **CERRADO (Task
  1)**: la franja resta altura en vez de superponerse, así que no hay nada que atravesar.
- **WR-02 (ronda 4) + WR-03 (ronda 4)** — `GameOutcomeDialog` sin trampa de foco y restauración
  inalcanzable — **CERRADOS (Task 2)**: `useDialogFocusTrap.ts`
  (`nextTrappedIndex`/`resolveRestoreTarget`).
- **WR-06 (ronda 4)** — reintento de registro con duración inflada — **CERRADO (Task 2)**:
  `freezeEndInstant`/`stampEndOfGame`, con los dos residuos conocidos escritos en su propia
  entrada arriba.
- **WR-02 (primera entrada, «un envoltorio `unreadable` permanente…»)** — sin salida en la
  interfaz — **CERRADO (Task 3)**: `readHistoryState`/`archiveUnreadableHistory` + la acción
  «Apartarlo y empezar uno nuevo» en `/historico`.
- **WR-02 (ronda 6)** — el primer autoguardado sobrescribía un progreso no leído — **CERRADO
  (Task 3)**: `backupProgressBeforeOverwrite`/`createOverwriteGuard`.
- **WR-07** — `sampleCaption` ignoraba la muestra de villanos — **CERRADO (Task 3)**:
  `entriesWithVillain` + `heroSampleCaption`/`villainSampleCaption` por tabla.

**Re-comprobados (ya estaban cerrados por otro mecanismo, se confirma que la propiedad se
mantiene con el nuevo):**

- **WR-04** (`GameOutcomeDialog` sin `Escape`/foco, ronda 1) — sigue **CERRADO** por 09-19;
  `Escape` sigue sin cerrar A PROPÓSITO; la trampa de foco nueva de WR-02 (ronda 4) lo
  complementa sin reabrirlo.
- **WR-05 (b)** (pantallas `h-dvh` empujadas por los avisos) — sigue **CERRADO**, ahora por el
  mecanismo de franja en flujo de la Task 1 en vez del `fixed`+`pointer-events` de 09-22; la
  propiedad («ninguna pantalla se sale del viewport») la fija ahora
  `app/composables/__tests__/pilaDeAvisos.test.ts` parte (c) y `e2e/notice-stack.spec.ts`.

**Lo que sigue abierto, sin que este lote lo toque:**

- **La sonda de cobertura de bordes** (ronda 7) — las 14 filas HIST-01..09/STAT-01..05 siguen sin
  clasificar; ninguna garantía de este lote se apoya en ella.
- **`DEV-02`** (comprobación visual humana en tablet horizontal) — sigue **ABIERTA**, y su guion
  gana en este lote CUATRO puntos nuevos que nadie ha comprobado todavía en un dispositivo real:
  la franja de avisos en flujo con la banda de versión nueva real (nunca simulada en Playwright,
  T-04-15) visible a la vez que el aviso de registro; la pantalla de histórico ilegible y su
  diálogo de archivado; el estado ilegible de `/estadisticas`; y el foco del diálogo de fin de
  partida con un teclado físico conectado a la tablet (la spec de Playwright demuestra el
  comportamiento con teclado emulado de escritorio, no con un teclado Bluetooth real sobre la
  tablet objetivo). **No se declara realizada aquí ni en `REQUIREMENTS.md`** — sigue PENDIENTE.

Ningún hallazgo nuevo, distinto de los que ya trae cada entrada cerrada arriba, aparece en la
ejecución de este lote.
