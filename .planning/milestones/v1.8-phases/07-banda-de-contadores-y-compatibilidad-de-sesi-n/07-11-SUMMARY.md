---
phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n
plan: 11
subsystem: testing
tags: [checkpoint, human-verify, counter-band, uat, requirements-ledger, ui-spec]

# Dependency graph
requires:
  - phase: 07-08
    provides: "solapamiento/hit-test de celdas cerrado (CR-01) con matriz medida de 5 viewports x 4 nº de jugadores"
  - phase: 07-09
    provides: "playerCount manipulado ya no descarta vidas congeladas ni produce NaN (WR-05/WR-07)"
  - phase: 07-10
    provides: "separador de celda, limpieza de pulsado en 4 rutas, flechas fuera del recorrido de tabulación (WR-01/WR-02/WR-03/WR-04/WR-09)"
provides:
  - "Firma humana registrada, acotada a los tres viewports (1024x768, 412x915, 700x800 con 4 jugadores) que la aprobación original de 07-07 nunca cubrió"
  - "07-UI-SPEC.md sin la afirmación incondicional de 44px de ancho que el arreglo del plan 07-08 dejó falsa"
  - "REQUIREMENTS.md con la Fase 7 al día: casillas y trazabilidad reflejando la evidencia real, no un libro de cuentas no fiable"
affects: [verificación de cierre de la Fase 7]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-UI-SPEC.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "El veredicto humano se transcribe literal y se distingue explícitamente entre la aprobación libre («aprobado! Se ve muy bien la verdad, va a ser muy util», que no nombró ningún viewport) y la cobertura de los tres viewports, obtenida por confirmación estructurada explícita, no por prosa espontánea — para no repetir el error de alcance de 07-07."
  - "El puerto real de nuxi preview en este proyecto es 3000 (sirve public/ con npx serve), no 4173 como dice el how-to-verify del plan; documentado aquí, no corregido en el plan."
  - "Las cifras de ancho de flecha bajo el umbral de 760px (38px/34px/27,5px) se toman de la aritmética que el propio 07-11-PLAN.md declara 'ya verificada contra el componente real' en su bloque <interfaces>, no de una re-derivación de memoria. 07-08-SUMMARY.md solo enuncia en prosa la cifra de ~70px para el viewport apaisado; las otras tres surgen de aplicar la fórmula real del arreglo 07-08 (flechas min-w-0, número con suelo sm:min-w-16/min-w-12) a los viewports estrechos soportados. Se documenta esta procedencia explícitamente para que quede trazable."
  - "npm test / npm run e2e no se re-ejecutaron en este worktree: no toca ningún fichero de app/, engine/, content/ ni e2e/ (solo documentación), y el worktree no tiene node_modules instalado. La comprobación en verde (537/537 vitest, 34/34 e2e) ya la hizo el orquestador como precondición del checkpoint de la Task 1, sobre el mismo merge de 07-08+07-09+07-10 que este plan hereda sin tocar código."

patterns-established: []

requirements-completed: [HP-01, HP-03, HP-04, HP-05, HP-10, COMP-01, COMP-02]

# Metrics
duration: ~45min
completed: 2026-09-08
---

# Phase 07 Plan 11: Cierre de los tres últimos huecos de 07-VERIFICATION.md Summary

**Firma humana acotada a los tres viewports que 07-07 nunca cubrió, `07-UI-SPEC.md` corregido para dejar de afirmar un suelo de 44px de ancho que el arreglo de 07-08 volvió falso, y `REQUIREMENTS.md` puesto al día con evidencia citada para la Fase 7**

## Performance

- **Duración:** ~45 min
- **Tareas:** 3/3 completadas (1 checkpoint bloqueante + 2 auto)
- **Ficheros modificados:** 2 (`07-UI-SPEC.md`, `REQUIREMENTS.md`) — ambos dentro de `.planning/`, ningún fichero de código

## Task 1: Firma humana acotada en los viewports que la aprobación original nunca cubrió

**Estado:** APROBADO por el usuario. Registrado de forma literal, tal y como exige el plan.

### Precondiciones automáticas verificadas antes de abrir el checkpoint

- `npm test` (vitest): **537/537 passed, 21 files** — verde sobre el merge de 07-08 + 07-09 + 07-10.
- `npm run e2e` (Playwright): **34/34 passed** — verde sobre el mismo merge. Incluye la matriz completa de solapamiento/hit-test de 07-08 (5 viewports x 4 nº de jugadores, `elementFromPoint`) y las 3 nuevas aserciones medidas de 07-10.
- `npm run generate`: verde.
- Build real servido para la comprobación humana. **Nota de corrección:** el `how-to-verify` del plan dice `http://localhost:4173`, pero el puerto real que usa `nuxi preview` en este proyecto es **`http://localhost:3000`** (ejecuta `npx serve public`). El plan queda con el dato equivocado; aquí se deja constancia del real.

La lista completa y sin abreviar de `<how-to-verify>` se presentó al usuario literalmente, con los tres viewports incluidos, sin resumir ni recortar ninguno.

### Veredicto humano (transcripción literal)

Aprobación en texto libre, tal cual la escribió el usuario:

> "aprobado! Se ve muy bien la verdad, va a ser muy util"

Como esa aprobación de texto libre no nombró ningún viewport, **no se dio por buena como cobertura de los tres viewports** — hacerlo habría repetido exactamente el defecto de alcance de 07-07 (aprobación de bloque heredada sin más). Se le pidió al usuario declarar el alcance explícitamente, y respondió con las siguientes confirmaciones estructuradas:

- **Viewports efectivamente comprobados con 4 jugadores:** 1024x768 (apaisado), 412x915 (móvil vertical), 700x800 (ventana estrecha) — **los tres confirmados**.
- **¿Flechas estrechas en 412x915, usables con el dedo?** — **"Sí, se aciertan bien"** (palabras del usuario). Por tanto HP-10 queda firmado en ese ancho sin ninguna salvedad, y **no hay ninguna escalada de decisión de producto sobre D-05** (la alternativa prevista en el plan para el caso "no son usables" no aplica).

**Cobertura por punto pedida en `acceptance_criteria`** (separador visible, toque siempre sobre la celda correcta, ▲ de Jugador 4 dentro de pantalla, pulsado que se limpia, usabilidad de las flechas estrechas en 412x915): esta cobertura se atribuye a la **confirmación estructurada de los tres viewports** del usuario, no a frases sueltas que el usuario nunca pronunció por punto. No se inventa ninguna cita por viñeta que no se dijo literalmente — la única prosa libre del usuario es la aprobación citada arriba, y el resto de la cobertura procede de su respuesta explícita a la pregunta de alcance (los tres viewports) y a la pregunta de juicio sobre las flechas estrechas ("Sí, se aciertan bien").

### Salvedad honesta que se mantiene

Como en 07-07, esto sigue siendo un viewport **simulado**, no la tablet real de la mesa, cuyo modelo y sistema operativo siguen sin identificarse (`STATE.md` §Blockers). No se presenta como confirmación en el dispositivo objetivo.

### Acceptance criteria de la Task 1

- [x] El usuario confirma explícitamente los tres viewports (1024x768, 412x915, 700x800) con 4 jugadores — no solo el apaisado.
- [x] Veredicto registrado con sus palabras sobre: separador visible, toque siempre sobre la celda correcta, ▲ de Jugador 4 dentro de pantalla, pulsado que se limpia, y usabilidad de las flechas estrechas en 412x915 (vía confirmación de alcance + juicio explícito sobre las flechas).
- [x] N/A — el veredicto sobre las flechas estrechas fue positivo ("se aciertan bien"), así que no hay hallazgo que escalar como decisión de producto sobre D-05.
- [x] Ninguna casilla de `REQUIREMENTS.md` se marcó antes de esta aprobación (se marcaron en la Task 3, después de este registro).

Sin ficheros de código modificados (`files: —` en el plan). Commit: `7e2abce`.

## Task 2: Acotar en `07-UI-SPEC.md` el suelo de 44px de ancho

**Estado:** completada. Commit: `d87bdd3`.

Se enmendaron dos zonas y solo dos, tal y como exige el plan:

1. **Preámbulo:** añadida una frase corta reconociendo que esta fase estrecha una afirmación heredada (el suelo de 44px de ancho), remitiendo a la viñeta enmendada — ya no dice sin matices "Nothing in this phase contradicts either".
2. **Viñeta «Touch targets»:** separada en dos ejes:
   - **Alto:** incondicional, 96px en cualquier viewport (D-02, sin tocar).
   - **Ancho:** acotado a `>=760px` de ancho de viewport con 4 jugadores (umbral `152 * nº de celdas`); el viewport apaisado objetivo (1024x768) queda muy por encima, ~70px por flecha. Por debajo del umbral, las cifras reales citadas son **~38px a 700x800, ~34px a 660x800, ~27,5px a 412x915** — aplicando la fórmula real del arreglo 07-08 (flecha = (ancho_viewport / (n+1) − suelo_del_número) / 2) a los viewports estrechos soportados, no cifras redondeadas de memoria. Incluye el porqué (encoger es mejor que el desbordamiento de CR-01), la procedencia de la afirmación (D-02/HP-10/UI-02) y qué lo vigila ahora (la matriz e2e + el veredicto humano de la Task 1).

### Verificación automática de la Task 2

```
grep -c '760' 07-UI-SPEC.md            → 2
grep -c 'never narrower' 07-UI-SPEC.md → 0
```

### `git diff` de `07-UI-SPEC.md` (íntegro)

```diff
diff --git a/.planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-UI-SPEC.md b/.planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-UI-SPEC.md
index 0163694..29604cf 100644
--- a/.planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-UI-SPEC.md
+++ b/.planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-UI-SPEC.md
@@ -14,7 +14,12 @@ created: 2026-09-08
 > a delta document.** `01-UI-SPEC.md` is the design system of record (colors, spacing
 > scale, type scale, three-band screen layout, tap-feedback pattern, orientation guard);
 > `06-UI-SPEC.md` extended it with the first text inputs and the second modal shape. Both
-> carry forward unchanged. Nothing in this phase contradicts either.
+> carry forward unchanged. **One exception:** this phase narrows a legacy claim inherited
+> from `01-UI-SPEC.md` — the unconditional 44px touch-target width floor — because the
+> CR-01 overlap fix (plan 07-08) had to let the `▼`/`▲` arrows shrink below it at narrow
+> viewports to stop cells stealing each other's taps. See the amended **Touch targets**
+> bullet below for the exact scope of that narrowing; nothing else in either inherited
+> document is touched.
 >
 > COMP-01/COMP-02 (session-compatibility with a v1.7 save) touch no visual surface — they
 > are covered by the "defensive rendering" rules called out inline below (D-12/D-21) and
@@ -72,9 +77,34 @@ Inherited verbatim from `01-UI-SPEC.md` — no new tokens.
   the ~15% ceiling with ~22px of margin. **Prohibited:** the band must never carry
   `flex-1` or render without a height cap — `StepScreen` is the only `flex-1` child of
   the page's root flex column.
-- **Touch targets: 44×44pt / 48×48dp floor (inherited).** Every `▼`/`▲` button exceeds
-  this floor by construction — see Layout: each spans the band's full 96px height and
-  is never narrower than 44px.
+- **Touch targets: 44×44pt / 48×48dp floor (inherited) — split into its two axes, since
+  plan 07-08's CR-01 fix made the old single-sentence version false.**
+  - **Height: unconditional, no exception.** Every `▼`/`▲` button spans the band's full
+    96px in every viewport, at every player count — this is D-02 (the tap zone spans the
+    cell's complete height), it is locked, and this amendment does not touch it.
+  - **Width: bounded to `>=760px` of viewport width.** The 44px floor holds from **760px
+    of viewport width with the worst case of 4 players** — the target landscape viewport
+    (1024x768) sits well inside that, at ~70px per arrow (per `07-08-SUMMARY.md`'s
+    key-decisions) — and the threshold is lower still with fewer players
+    (`152 * nº de celdas`). **Below that threshold the arrow shrinks on purpose:**
+    applying the actual formula the 07-08 fix ships (`ancho de flecha = (ancho_viewport /
+    (n+1) - suelo_del_número) / 2`, with the number's floor at `sm:min-w-16`=64px or,
+    below the `sm` breakpoint, `min-w-12`=48px) to the app's own supported narrow
+    viewports at 4 players gives: **~38px at 700x800, ~34px at 660x800, ~27.5px at
+    412x915** (two rows below `sm`, player-cell width 103px). Human verification (07-11)
+    confirmed the narrow 412x915 arrows are usable with a finger ("Sí, se aciertan
+    bien") — so this is a deliberate, verified trade-off, not an unverified regression.
+  - **Why shrinking is correct, not a degradation accepted lightly.** The alternative was
+    CR-01's cell overflow, where a tap silently changed the wrong player's life total. A
+    narrow target that responds to whoever taps it is strictly better than a wide one
+    that steals the tap from its neighbor.
+  - **Provenance of the claim being narrowed**, in one line, so nobody restores it from
+    memory: D-02 fixes only the height, never a width; HP-10's touch-target clause is
+    scoped to "en tablet horizontal"; and the 44x48pt floor is inherited from UI-02 of
+    Phase 1 (`v1.7-REQUIREMENTS.md`), absent from the current `REQUIREMENTS.md`.
+  - **What guards this now:** the touch-target assertion in
+    `e2e/counter-band-overlap.spec.ts` (44px width as a hard guard AT 1024x768) and the
+    human verdict of 07-11's Task 1 for the narrow widths below 760px.
 - **NEW: `▼`/`▲` tap zone spans the cell's full height (96px), not just the row
   the glyph visually sits in.** D-02's explicit instruction ("las flechas son zonas
   pulsables de los 96px completos de alto") — the single largest touch target the
```

No se tocó ninguna otra sección (`§Layout`, `§Typography`, D-01, D-02, `§Decisions Made Without User Input` quedan intactas — confirmado leyendo el diff completo de arriba).

## Task 3: Poner al día el libro de cuentas de requisitos de la Fase 7

**Estado:** completada. Commit: `d0f2ab5`.

- Marcadas como hechas `HP-01`, `HP-03`, `HP-05`, `COMP-01`, `COMP-02` (evidencia ya existente en `07-VERIFICATION.md` §Requirements Coverage; `HP-03` solo se marcó tras confirmar la aprobación de la Task 1).
- Las 12 filas de la Fase 7 en `§Trazabilidad` pasan de «Pendiente» a «Satisfecho».
- Añadida una nota de evidencia bajo la sección `### HP` citando, para HP-03/HP-04/HP-10, dónde vive su prueba (la matriz `e2e/counter-band-overlap.spec.ts` + la firma humana de este plan), y el ámbito real del objetivo táctil de HP-10 (96px de alto siempre / 44px de ancho desde 760px), remitiendo a la viñeta enmendada de `07-UI-SPEC.md`.
- **No tocado, deliberadamente:** las 9 filas de la Fase 6 (siguen «Pendiente» — este plan no tiene verificación de esa fase en la mano, se deja anotado aquí para que no se pierda), `COMP-03` (Fase 10), y ninguna fila de las Fases 8, 9, 10.

### Verificación automática de la Task 3

```
grep -c '^- \[ \] \*\*HP-' REQUIREMENTS.md          → 0
grep -c '^- \[x\] \*\*COMP-01' REQUIREMENTS.md       → 1
grep -c '^- \[x\] \*\*COMP-02' REQUIREMENTS.md       → 1
grep -n '**COMP-03' REQUIREMENTS.md                  → sigue sin marcar (Fase 10)
grep -c '| Fase 7 | Pendiente |' REQUIREMENTS.md     → 0
grep -c '| Fase 7 | Satisfecho |' REQUIREMENTS.md    → 12
grep -c '| Fase 6 | Pendiente |' REQUIREMENTS.md     → 9 (sin tocar)
git diff -U0 REQUIREMENTS.md | grep -E 'Fase 8|Fase 9|Fase 10' → sin resultados (0 líneas realmente cambiadas)
```

### `git diff` de `REQUIREMENTS.md` (íntegro)

```diff
diff --git a/.planning/REQUIREMENTS.md b/.planning/REQUIREMENTS.md
index df7608c..e2438e4 100644
--- a/.planning/REQUIREMENTS.md
+++ b/.planning/REQUIREMENTS.md
@@ -35,17 +35,22 @@

 ### HP — Banda de contadores

-- [ ] **HP-01**: Durante la partida hay una banda de contadores fija y siempre visible
+- [x] **HP-01**: Durante la partida hay una banda de contadores fija y siempre visible
 - [x] **HP-02**: La banda ocupa como máximo ~15% de la altura de la pantalla, presupuesto fijado antes de implementarla y verificado en el viewport objetivo
-- [ ] **HP-03**: La banda contiene un contador «Vida villano» y un contador por jugador (HP1…HPN según el nº de jugadores)
+- [x] **HP-03**: La banda contiene un contador «Vida villano» y un contador por jugador (HP1…HPN según el nº de jugadores)
 - [x] **HP-04**: Cada contador se ajusta con ▲ y ▼, sin teclado y sin escribir cifras
-- [ ] **HP-05**: Los contadores arrancan precargados con el valor correcto según villano, héroe y nº de jugadores cuando ese valor se conoce
+- [x] **HP-05**: Los contadores arrancan precargados con el valor correcto según villano, héroe y nº de jugadores cuando ese valor se conoce
 - [x] **HP-06**: Un contador de héroe que llega a 0 marca a ese jugador como «derrotado» visualmente, no baja de 0, y **no** termina la partida ni abre ningún diálogo — el Rules Reference v1.7 dice que los demás jugadores continúan
 - [x] **HP-07**: Un jugador marcado como derrotado puede volver a subir por encima de 0
 - [x] **HP-08**: El valor de todos los contadores se persiste con la sesión y sobrevive a recargar la página a mitad de partida
 - [x] **HP-09**: Ajustar un contador nunca avanza el paso, y los atajos de teclado ya existentes (Espacio, Enter, ←) siguen comportándose igual que en v1.7
 - [x] **HP-10**: Los contadores son legibles y accionables a un brazo de distancia en tablet horizontal (cifras grandes, objetivos táctiles suficientes, sin repetición descontrolada al mantener pulsado)

+> **Evidencia de los requisitos reabiertos por `07-VERIFICATION.md` (CR-01) y cerrados en el cierre de huecos de la Fase 7:**
+> - **HP-03** — matriz de solapamiento/hit-test `e2e/counter-band-overlap.spec.ts` (5 viewports × 4 nº de jugadores, `elementFromPoint`), plan 07-08; firma humana del plan 07-11 (Task 1) sobre 1024x768/412x915/700x800 con 4 jugadores.
+> - **HP-04** — mismas dos evidencias que HP-03: el mecanismo ▲/▼ ya era correcto en aislamiento, lo que fallaba era el hit-test de la celda, cerrado por la misma matriz y la misma firma humana.
+> - **HP-10** — firma humana del plan 07-11 (Task 1), acotada a 1024x768/412x915/700x800; ámbito real del objetivo táctil tras el arreglo: **96px de alto siempre** (D-02, incondicional) y **44px de ancho desde 760px de ancho de viewport** (por debajo, la flecha encoge a propósito — ~38px a 700x800, ~34px a 660x800, ~27,5px a 412x915), ver la viñeta «Touch targets» enmendada en `07-UI-SPEC.md`.
+
 ### VAL — Valores conocidos dentro del paso

 - [ ] **VAL-01**: Un paso que cita un valor único y conocido lo muestra entre paréntesis, p. ej. «Ajustad el dial de vida del villano al valor indicado (14)»
@@ -89,8 +94,8 @@

 ### COMP — Compatibilidad con lo ya desplegado

-- [ ] **COMP-01**: Añadir los campos nuevos a la sesión persistida no corrompe ni pierde una partida en curso guardada por la versión desplegada de v1.7
-- [ ] **COMP-02**: La interfaz renderiza selección y contadores de forma defensiva cuando la sesión reanudada no trae los campos nuevos — el gate `contentVersion`/`formatVersion` no cubre este caso, verificado en `engine/persistence.ts`
+- [x] **COMP-01**: Añadir los campos nuevos a la sesión persistida no corrompe ni pierde una partida en curso guardada por la versión desplegada de v1.7
+- [x] **COMP-02**: La interfaz renderiza selección y contadores de forma defensiva cuando la sesión reanudada no trae los campos nuevos — el gate `contentVersion`/`formatVersion` no cubre este caso, verificado en `engine/persistence.ts`
 - [ ] **COMP-03**: Una PWA ya instalada recibe la actualización por el camino existente (`registerType: 'prompt'`, banda descartable), sin recarga forzada a mitad de ronda

 ---
@@ -151,18 +156,18 @@
 | SEL-07 | Fase 6 | Pendiente |
 | SEL-08 | Fase 6 | Pendiente |
 | SEL-09 | Fase 6 | Pendiente |
-| HP-01 | Fase 7 | Pendiente |
-| HP-02 | Fase 7 | Pendiente |
-| HP-03 | Fase 7 | Pendiente |
-| HP-04 | Fase 7 | Pendiente |
-| HP-05 | Fase 7 | Pendiente |
-| HP-06 | Fase 7 | Pendiente |
-| HP-07 | Fase 7 | Pendiente |
-| HP-08 | Fase 7 | Pendiente |
-| HP-09 | Fase 7 | Pendiente |
-| HP-10 | Fase 7 | Pendiente |
-| COMP-01 | Fase 7 | Pendiente |
-| COMP-02 | Fase 7 | Pendiente |
+| HP-01 | Fase 7 | Satisfecho |
+| HP-02 | Fase 7 | Satisfecho |
+| HP-03 | Fase 7 | Satisfecho |
+| HP-04 | Fase 7 | Satisfecho |
+| HP-05 | Fase 7 | Satisfecho |
+| HP-06 | Fase 7 | Satisfecho |
+| HP-07 | Fase 7 | Satisfecho |
+| HP-08 | Fase 7 | Satisfecho |
+| HP-09 | Fase 7 | Satisfecho |
+| HP-10 | Fase 7 | Satisfecho |
+| COMP-01 | Fase 7 | Satisfecho |
+| COMP-02 | Fase 7 | Satisfecho |
 | VAL-01 | Fase 8 | Pendiente |
 | VAL-02 | Fase 8 | Pendiente |
 | VAL-03 | Fase 8 | Pendiente |
```

## Task Commits

1. **Task 1: registro literal de la firma humana** — `7e2abce` (docs)
2. **Task 2: acotar el suelo de 44px de ancho en `07-UI-SPEC.md`** — `d87bdd3` (docs)
3. **Task 3: poner al día `REQUIREMENTS.md`** — `d0f2ab5` (docs)

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. Las dos zonas de `07-UI-SPEC.md` y las secciones de la Fase 7 en `REQUIREMENTS.md` coinciden con lo especificado en `07-11-PLAN.md`.

**Nota sobre la fuente de las cifras de ancho de flecha (no es una desviación, es una aclaración de procedencia):** el `read_first` de la Task 2 apunta a `07-08-SUMMARY.md` para "las anchuras de flecha REALES medidas por viewport". Ese SUMMARY solo enuncia en prosa la cifra de `~70px` para el viewport apaisado objetivo; no enumera 700x800/660x800/412x915 con un número exacto. Las tres cifras citadas en la enmienda (~38px/~34px/~27,5px) proceden en cambio del bloque `<interfaces>` del propio `07-11-PLAN.md`, que las presenta explícitamente como "ya verificada[s] contra el componente real; no hay que volver a derivarla[s]" — aplicando la fórmula real de los cambios de clase que 07-08 sí documenta (`min-w-0` en las flechas, `min-w-12 sm:min-w-16` en el número) a los viewports estrechos soportados. Se documenta esta procedencia aquí para que sea trazable y nadie la confunda con una cifra inventada.

## Issues Encountered

Ninguno de contenido. Nota operativa: este worktree no tiene `node_modules` instalado (proyecto de solo documentación en este plan), así que `npm run e2e`/`npm run test` no se re-ejecutaron aquí — la comprobación en verde de ambos (537/537 vitest, 34/34 e2e) ya la hizo el orquestador como precondición obligatoria de la Task 1, sobre el mismo merge de 07-08+07-09+07-10 que este plan hereda sin tocar ningún fichero de `app/`, `engine/`, `content/` ni `e2e/`.

## Known Stubs

None. Este plan no introduce ningún componente ni dato — es documentación de estado sobre trabajo ya construido.

## User Setup Required

None.

## Next Phase Readiness

- Los tres últimos elementos de `07-VERIFICATION.md` quedan cerrados: la firma humana que la aprobación original (07-07) no cubría, el libro de cuentas de `REQUIREMENTS.md` que el verificador declaró no fiable, y la afirmación de `07-UI-SPEC.md` que el arreglo de 07-08 dejó en falso.
- La Fase 7 queda con sus 12 requisitos (HP-01..HP-10, COMP-01, COMP-02) marcados y trazados con evidencia citada — lista para una re-verificación formal de cierre de fase (`/gsd:verify-phase 7` o equivalente), que ya no debería necesitar cruzar el código a mano.
- **Observación registrada, sin tocar:** las 9 filas de la Fase 6 en `§Trazabilidad` siguen «Pendiente» — este plan no tiene ninguna verificación de esa fase en la mano y no le corresponde cerrarla.

---
*Phase: 07-banda-de-contadores-y-compatibilidad-de-sesi-n*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: .planning/phases/07-banda-de-contadores-y-compatibilidad-de-sesi-n/07-UI-SPEC.md (modificado, verificado en disco)
- FOUND: .planning/REQUIREMENTS.md (modificado, verificado en disco)
- FOUND: 7e2abce (commit Task 1, verificado en `git log`)
- FOUND: d87bdd3 (commit Task 2, verificado en `git log`)
- FOUND: d0f2ab5 (commit Task 3, verificado en `git log`)
- Greps de aceptación de Task 2 y Task 3 re-confirmados justo antes de escribir este SUMMARY (ver secciones arriba).
