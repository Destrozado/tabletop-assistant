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
