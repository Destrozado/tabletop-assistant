---
status: complete
quick_id: 260923-3rl
plan_head_before: dc8ad7905778b02c36cf1773157ca8c818bcc366
commits:
  - hash: 993b593
    message: "feat(quick-260923-3rl): borrado fallido visible de extremo a extremo (IN-11)"
  - hash: b1e9b78
    message: "feat(quick-260923-3rl): tope y limpieza del histórico + id por crypto.randomUUID (IN-04/IN-05/IN-12)"
  - hash: b33c6e3
    message: "feat(quick-260923-3rl): % de victorias sin extremos falsos (IN-13), spec offline sin throw de módulo (IN-07)"
requirements: [IN-04, IN-05, IN-07, IN-11, IN-12, IN-13]
files_modified:
  - app/composables/usePersistedSession.ts
  - app/composables/__tests__/usePersistedSession.test.ts
  - app/composables/useGameHistory.ts
  - app/composables/__tests__/useGameHistory.test.ts
  - app/pages/historico.vue
  - engine/history.ts
  - engine/__tests__/history.test.ts
  - engine/statistics.ts
  - engine/__tests__/statistics.test.ts
  - e2e/offline-flow.spec.ts
  - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
---

# Quick 260923-3rl: Cierre de la deuda INFO real de la Fase 9 (IN-04, IN-05, IN-07, IN-11, IN-12, IN-13)

Las seis INFO que `.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md` marcaba como
"deuda real" quedan cerradas: tope y poda del histórico, id por `crypto.randomUUID`, la spec
offline ya no aborta sin audio, el borrado fallido se avisa en `/historico`, una entrada
ilegible se descarta del disco al registrar, y el % de victorias nunca anuncia un extremo que
el recuento no respalda.

## Nota de orden respecto a 260923-3rm

Este ítem se ejecutó **antes** que 260923-3rm (el coordinador invirtió la dependencia declarada
en el PLAN.md para romper un ciclo). Se releyeron los cinco ficheros de código al empezar cada
tarea, tal como pedía el plan, y **ningún fichero llegó ya tocado por 3rm** — el árbol estaba
exactamente en el estado descrito por el plan al planificar (base `dc8ad79`). No hubo, por
tanto, ningún contrato de 3rm que conservar; este plan se aplicó sobre código limpio de la
Fase 9/10.

## Tareas y RED real

### Task 1 (tracer) — IN-11: borrado fallido visible de extremo a extremo

RED (antes de tocar `usePersistedSession.ts`/`useGameHistory.ts`), `npx vitest run
app/composables/__tests__/usePersistedSession.test.ts`: 10 fallos, todos `AssertionError:
expected undefined to be [true|false]` — `removeHistoryEntry` seguía devolviendo `void`.
`npx vitest run app/composables/__tests__/useGameHistory.test.ts`: 3 fallos (2×
`expected undefined to be [true|false]` en el ciclo record/reload/remove, 1×
`expected undefined to be "⚠ No se pudo borrar la partida"` por las constantes de copy
ausentes).

GREEN: `removeHistoryEntry` (`usePersistedSession.ts`) devuelve `boolean` — `false` ante un
envoltorio ilegible (CR-03) o un `setItem` que lanza, `true` en cualquier otro caso (incluido
"no había nada que borrar"). `useGameHistory().remove(id)` propaga ese booleano y exporta
`DELETE_FAILED_HEADING`/`DELETE_FAILED_BODY`. `/historico` pinta un aviso en línea (región viva
permanente, `role="status" aria-live="polite"`, sin `fixed`) cuando `remove()` devuelve `false`.

Verify del task (`vitest` + gates de Fase 9 + `npm run typecheck`): verde. Tracer feedback gate:
`AUTO_CHAIN`/`AUTO_CFG` en `false` (`.planning/config.json`), `human_verify_mode` sin fijar
(por defecto `end-of-phase`); el `<verify>` del task es automático — se re-ejecutó, pasó, se
continuó sin checkpoint.

### Task 2 — IN-04/IN-12 (tope y poda) + IN-05 (crypto.randomUUID)

RED, `npx vitest run app/composables/__tests__/usePersistedSession.test.ts`: 4 fallos nuevos
(`HISTORY_MAX_ENTRIES` no exportado; el filtrado IN-12 no descartaba `{ id: 'rota' }`; el tope
de 500 no existía — 501 entradas en vez de 500; la poda D-04 no aplicaba porque no había tope).
RED, `npx vitest run engine/__tests__/history.test.ts`: 2 fallos — el id seguía con el formato
`<now>-<base36>` en vez de UUID v4, y sin `crypto.randomUUID` el sufijo quedaba vacío
(`'1789214400000-'` en vez de `'...-0000000000'`).

GREEN: `HISTORY_MAX_ENTRIES = 500` (constante primitiva, no estado de módulo). `appendHistoryEntry`
filtra las previas por `isGameHistoryEntry` antes de anteponer la nueva y corta el resultado a
`HISTORY_MAX_ENTRIES` — `removeHistoryEntry` no se toca (test CR-03 "una entrada ilegible
sobrevive... a un removeHistoryEntry" sigue igual). `engine/history.ts`: nueva
`generateHistoryEntryId(now)` usa `globalThis.crypto.randomUUID()` invocado como método (nunca
una referencia suelta) cuando existe, con respaldo `<now>-<sufijo>` rellenado con `'0'` a la
derecha hasta 10 caracteres cuando no.

`npx vitest run` de los 6 ficheros del `<verify>` de la tarea (usePersistedSession, history,
useGameHistory, useHistorySync, afirmacionesRespaldadas, invariantesDeMarcaDeEstado): 394
passed, 0 failed — incluidos los tests CR-03 (formatVersion 2 / JSON corrupto) y el D-04 de
`useHistorySync.test.ts` sin editarlos. `grep -c "SYNCED_KEY" app/composables/usePersistedSession.ts`
= 4, idéntico al valor de antes de esta tarea (tuve que quitar una mención literal de
`SYNCED_KEY` de un comentario nuevo para no subir ese conteo — la lógica ya no la tocaba, solo
el texto del comentario la nombraba).

### Task 3 — IN-13 (% sin extremos falsos), IN-07 (spec offline sin throw de módulo), cierre en deferred-items.md

RED, `npx vitest run engine/__tests__/statistics.test.ts`: 10 fallos —
`TypeError: winPercentage is not a function` en los 9 casos puros, y
`expected pct 100 to match 99` en el test de `aggregateStatistics` con 199/200.

Antes de tocar `e2e/offline-flow.spec.ts`, comprobación del listado (mensaje real, dos
directorios temporales sin `public/audio/` con contenido):
- `T1` (`public/audio/` vacío): `Error: No se encontró ningún clip .m4a en public/audio/ — el
  paso 7 necesita al menos uno.` → `Total: 0 tests in 0 files`.
- `T2` (sin `public/audio/`): `Error: ENOENT: no such file or directory, scandir
  '.../public/audio'` → `Total: 0 tests in 0 files`.

GREEN: `winPercentage(wins, played)` (nueva, exportada) — `0` si `played` no es positivo, `100`
solo si `wins >= played`, `0` solo si `wins <= 0`, y en cualquier otro caso el redondeo acotado
a `1..99`. `buildRows` la usa en vez del `Math.round` directo. `e2e/offline-flow.spec.ts`: la
resolución del clip pasa de nivel de módulo a `firstAudioClipId()` (perezosa, `try/catch`),
invocada solo al principio del primer test, con `test.skip(audioId === null, ...)`.

Listado tras el cambio, desde los mismos dos directorios temporales y desde la raíz: los tres
dan `Total: 5 tests in 1 file`. `grep -v '^\s*//' e2e/offline-flow.spec.ts | grep -c 'throw new
Error'` = 0.

Ejecución completa desde la raíz, `npx playwright test e2e/offline-flow.spec.ts`:

```
Running 5 tests using 1 worker

  ✓  1 … selector -> mini-setup -> preparación con la red cortada, navegación, avance/retroceso, audio y recarga (863ms)
  ✓  2 … la ruta /marvel-champions se puede abrir directamente sin red (page.goto), no solo por navegación desde el selector (292ms)
  ✓  3 … la ruta /historico se puede abrir directamente sin red (D-16/Pitfall 4) (296ms)
  ✓  4 … la ruta /estadisticas se puede abrir directamente sin red (D-16/Pitfall 4) (279ms)
  ✓  5 … terminar una partida sin red registra el resultado, vuelve al inicio en un plazo corto, y el histórico/estadísticas siguen funcionando (SYNC-04/SYNC-08) (1.1s)

  5 passed (9.3s)
```

5 passed, 0 skipped — en este checkout los 35 clips existen, así que el test del paso 7 no sale
como skipped (comportamiento correcto: el skip solo se dispara sin ningún `.m4a`).

`deferred-items.md`: las seis viñetas de la sección "INFO de `09-REVIEW.md` que son deuda real"
ganan una línea `**CERRADO (quick 260923-3rl):**` cada una, nombrando qué se hizo y qué test lo
fija. `git diff --stat` de ese fichero: un único hunk dentro de esa sección (30 líneas
insertadas, 0 eliminadas); ninguna sección WR tocada.

## Decisiones propias (discreción documentada en el plan)

1. **Aviso en línea en vez de reutilizar `HistorySavedNotice` (IN-11).** La propuesta original
   de IN-11 era reutilizar ese componente. No se hizo: sus variantes (`NoticeVariant`) son
   exclusivamente desenlaces de fin de partida producidos por `planGameEnd`, y el Gate C de la
   Fase 9 prohíbe escribir un `NoticeVariant` fuera de `useHistorySavedNotice.ts`. `/historico`
   gana su propia banda, con el mismo lenguaje visual (mismo `bg-surface`/`border-b`/tipografía
   que `HistorySavedNotice.vue`), región viva permanente, sin `fixed` (dentro del flujo, para no
   repetir la clase de defecto de WR-05(b)/WR-05 ronda 4 ya abiertos en este mismo fichero).

2. **UUID puro, sin prefijo de instante (IN-05).** `crypto.randomUUID()` se usa tal cual, sin
   anteponer `now-`. El orden del histórico lo da `recordedAt` vía `sortEntriesByRecency`, nunca
   el id; `firestore.rules` (D-03, Fase 10) solo exige que el id de documento sea `string`. Los
   ids antiguos (formato `<now>-<sufijo>`) en `localStorage` y en Firestore no se migran — ambos
   formatos son igual de válidos como `string` y nada del resto del sistema distingue de qué
   generador salió un id.

3. **Acotar también el extremo bajo del % de victorias (IN-13).** IN-13 solo pedía corregir el
   «100 %» falso. Se acota igual el «0 %» falso (1 de 201 pasa a pintar «1 %», no «0 %») porque
   es el mismo defecto en la misma línea, y la propia cabecera de `engine/history.ts` (IN-05)
   registra como antipatrón de esta fase endurecer un lado de un contrato y dejar el vecino sin
   revisar.

## Verificación de fin de plan

- `npm test` (suite completa Vitest, proyectos `engine`+`app-logic`): **38 test files, 1183
  tests, 0 fallos.**
- `npx vitest run app/composables/__tests__/afirmacionesRespaldadas.test.ts
  app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`: **193 tests, 0 fallos** — sin
  ninguna entrada nueva en `AFIRMACIONES_AUDITADAS` ni excepción nueva del gate de invariantes
  (la copy nueva no contiene ninguna raíz de `RAICES_SOBRE_LOS_DATOS_DEL_GRUPO`; el estado nuevo
  es un `ref` local del `<script setup>` de `historico.vue`, no estado de módulo).
- `npm run typecheck` (`nuxt typecheck`): **exit 0.**
- `npx playwright test e2e/offline-flow.spec.ts`: **5 passed, 0 skipped** (ver salida literal
  arriba).
- `git diff --stat dc8ad79..HEAD`: exactamente los 11 ficheros de `files_modified`, ninguno más.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno — las seis mitigaciones del `<threat_model>` del plan (T-3rl-01..T-3rl-07) se
implementaron tal como estaban descritas: el tope/poda de IN-04 no toca `tga:history:synced`
(D-04 intacto, fijado por test), y el descarte de IN-12 solo actúa dentro de un envoltorio
`formatVersion` legible (un envoltorio de versión desconocida o JSON corrupto sigue abortando
sin escribir).

## Self-Check: PASSED

Ficheros comprobados con `[ -f ... ]`: los 7 ficheros de código de `files_modified` (los otros
4 son ficheros de test ya usados en los propios comandos `vitest run` de arriba) — todos
`FOUND`. Commits comprobados con `git log --oneline --all | grep`: `993b593`, `b1e9b78`,
`b33c6e3` — los tres `FOUND`.
