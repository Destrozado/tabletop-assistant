---
status: complete
quick_id: 260923-3rn
plan_head_before: 0b4349ba302d50e56592f251e70dbf1983630234
commits:
  - hash: dff1c98
    message: "feat(quick-260923-3rn): Pata 6 del gate de invariantes — retirada explícita real (WR-03)"
  - hash: 5bc9be5
    message: "feat(quick-260923-3rn): cierra los dos huecos de parsing del gate (WR-01/WR-02)"
  - hash: 9f4b893
    message: "docs(quick-260923-3rn): registra el cierre de la deuda de la Fase 9 en deferred-items/ROADMAP"
requirements: []
files_modified:
  - app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts
  - .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md
  - .planning/ROADMAP.md
actuals:
  tokens: 11131
  tasks: 3
  commits: 3
---

# Quick 260923-3rn: Cierre de los follow-ups del gate de invariantes de la Fase 9 (WR-01/WR-02/WR-03)

Cierra la deuda no bloqueante que la ronda 10 de `09-VERIFICATION.md` (frontmatter `advisory`) y
el ROADMAP dejaron sobre `app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`: una
**Pata 6** nueva demuestra que toda función documentada en el comentario de
`clearProgressMismatch` como punto de retirada explícita (`onResumeContinue`,
`onContentChangedAcknowledge`, entre otras) la llama de verdad en su propio cuerpo, y dos arreglos
de parsing (`argumentosDeNivelSuperior`, `PATRON_ESTADO_DE_MODULO_MUTABLE`) cierran los huecos de
falso verde que un tipo genérico con coma o una anotación de tipo explícita dejaban abiertos en
las Patas 1/2 y en el descubrimiento. `app/pages/[game]/index.vue` queda sin cambios netos —
confirmado con `git diff --quiet HEAD -- 'app/pages/[game]/index.vue'` tras cada mutación en
disco.

## Nota de orden respecto a 260923-3rl y 260923-3rm

Este ítem se ejecutó, según indicó el coordinador, **después** de 260923-3rl y 260923-3rm (los dos
ya mergeados en `develop`). El precondition-check de la Task 1
(`grep -n "function onResumeContinue(\|function onContentChangedAcknowledge(\|clearProgressMismatch(gameId)" 'app/pages/[game]/index.vue'`)
confirmó que las dos funciones seguían declaradas y llamando a `clearProgressMismatch(gameId)`
tal como el plan asumía — 3rm había tocado `index.vue` sustancialmente (franja de avisos en
flujo, trampa de foco, `createOverwriteGuard`) pero ninguno de esos cambios tocó
`onResumeContinue`/`onContentChangedAcknowledge` ni el import de `useProgressMismatchMark`. Los
94 tests base del gate (medidos en 633ef20 por el planificador) habían crecido a 108 tras el
merge de 3rl/3rm (sin cambios de este quick); la suite completa había crecido de 1259 (3rm) a
1272 antes de empezar este quick.

## Tareas

### Task 1 — Pata 6: toda retirada explícita documentada existe de verdad (WR-03 / hallazgo 3)

Cuatro funciones puras nuevas en `invariantesDeMarcaDeEstado.test.ts`:
- `llamantesDocumentadosDelRetirador(fuenteDeLaMarca, retirador)`: sobre la fuente CRUDA (nunca
  `regionVigilada`), localiza `export function <retirador>(` y extrae los identificadores desnudos
  entre acentos graves del bloque de comentario `//` contiguo justo encima, descartando literales
  (`true`/`false`/`null`/`undefined`), el propio retirador y cualquier cita con punto
  (`Map.delete`).
- `consumidoresDeLaMarca(marca, ficheros)`: descubierto por IMPORT (nunca tecleado) — ficheros
  fuera de `/__tests__/` que no son la propia marca y cuyo especificador de import termina en
  `/<nombreDelMóduloSinExtensión>`.
- `cuerpoDeFuncionDeclarada(region, nombre)`: localiza `function <nombre>(` (exportada o no) y
  delimita su cuerpo con `indiceDeCierre` (misma profundidad para `( [ {`, así que ni
  `.catch(() => {})` ni `=>` truncan el cuerpo). Devuelve `null` si `nombre` está declarada como
  `const nombre = () => {…}`.
- `funcionesSinRetiradaDe(consumidores, llamantes, retirador, lector)`: para cada nombre
  documentado, busca su declaración en los consumidores (`regionVigilada` aplicada dentro, para
  que una llamada solo comentada no cuente); si no existe en ninguno, `sin-declarar`; si existe
  pero su cuerpo no llama al retirador, `sin-llamada`; si llama pero con una clave (primer
  argumento) distinta a la de la primera llamada al lector en el mismo fichero, `clave-distinta`.

Casos sintéticos cubren las nueve viñetas del `<behavior>` (identificadores dotted/literales
descartados, sin comentario → `[]`, llamada en OTRA función, llamada solo en comentario, llamada
DESPUÉS de `pedir().catch(() => {})`, clave distinta, nombre no declarado). Un `it.each` PERMANENTE
en memoria (`['onResumeContinue', 'onContentChangedAcknowledge']`) copia `regionVigilada` del
`index.vue` real y quita, de esa copia, la llamada al retirador dentro del cuerpo de cada función
(offsets de `cuerpoDeFuncionDeclarada` + `llamadasA`), exige que la copia difiera del original y
que el resultado sea exactamente `[{ nombre, motivo: 'sin-llamada' }]`. El `it.each` invariante
final recorre `marcasNoAuditadas` (mismo patrón que las Patas 1/2/4).

**Mutaciones EN DISCO M1/M2 (ejecutadas y revertidas, `app/pages/[game]/index.vue`):**

M1 — se borró la línea `clearProgressMismatch(gameId)` de `onResumeContinue`.
`npx vitest run app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`: **4 failed, 104
passed de 108.** Títulos literales que se pusieron rojos:
- `Pata 6 — funcionesSinRetiradaDe (Task 1, quick 260923-3rn) > sobre los consumidores/llamantes reales de useProgressMismatchMark.ts (clearProgressMismatch / readProgressMismatchWarning) da [] — la segunda defensa está intacta hoy` — `AssertionError: expected [ { …(2) } ] to deeply equal []`, con `{ motivo: 'sin-llamada', nombre: 'onResumeContinue' }`.
- `Pata 6 — mutación PERMANENTE en memoria: ... > quitar la llamada a clearProgressMismatch del cuerpo de onResumeContinue pone roja la pata` — `Error: no se encontró ninguna llamada a clearProgressMismatch dentro de onResumeContinue` (la llamada ya faltaba en disco, así que la mutación en memoria no encontró nada que quitar — confirma que M1 actuó).
- `Pata 6 — mutación PERMANENTE en memoria: ... > quitar la llamada a clearProgressMismatch del cuerpo de onContentChangedAcknowledge pone roja la pata` — devolvió DOS entradas (`onContentChangedAcknowledge` + `onResumeContinue`) en vez de una sola, porque el bug de M1 ya estaba presente en disco.
- `Pata 6 — invariante: ... > app/composables/useProgressMismatchMark.ts: retirador no nulo, llamantes documentados no vacíos, consumidores no vacíos, y funcionesSinRetiradaDe da []` — `Error: onResumeContinue: documentada en el comentario de clearProgressMismatch como punto de retirada explícita (segunda defensa de CR-01/WR-01, 09-REVIEW.md WR-03) pero su cuerpo no llama a clearProgressMismatch — esa defensa queda sin efecto sin que nada lo note.`

Revertido con `git checkout -- 'app/pages/[game]/index.vue'`; vuelta a 108 passed.

M2 — se borró la línea `clearProgressMismatch(gameId)` de `onContentChangedAcknowledge` (con
`onResumeContinue` intacto). Mismo resultado simétrico: **4 failed, 104 passed de 108**, con los
mismos cuatro `it` (ahora nombrando `onContentChangedAcknowledge` en vez de
`onResumeContinue` en los mensajes de error). Revertido; vuelta a 108 passed.

`git diff --quiet HEAD -- 'app/pages/[game]/index.vue'` → exit 0 tras la Task 1.

### Task 2 — Cierre de los dos huecos de parsing del gate (WR-01/WR-02)

**RED previo** (casos (a)-(j) añadidos ANTES del arreglo): `npx vitest run
invariantesDeMarcaDeEstado.test.ts` → **7 failed, 113 passed de 120**, exactamente los siete que
el plan predijo:
- `Descubrimiento — marcasDeEstadoDeModuloDe (Task 1) > const con anotación de tipo genérica (Map<string, string>) más raíz vigilada SÍ se descubre (WR-02, caso sintético)` — g
- `... > const con anotación de tipo (Ref<string | null>) más raíz vigilada SÍ se descubre (WR-02, caso sintético)` — h
- `... > const con anotación de tipo que contiene => (Map<string, () => void>) más raíz vigilada SÍ se descubre — el caso que separa este arreglo de la regex literal de la review (WR-02, caso sintético)` — i
- `Pata 1 — contratoDeLaMarcaDe (Task 1) > lector con un único parámetro de tipo genérico con coma (Record<string, string>) da aridadDelLector=1, no 2 (WR-01, caso sintético)` — a
- `... > lector con id + un segundo parámetro de tipo genérico con coma da aridadDelLector=2, no 3 (WR-01, caso sintético)` — b
- `... > => no cierra la profundidad angular: un único parámetro con una función flecha dentro de un genérico (m: Map<string, () => void>) da aridadDelLector=1, no 2 (WR-01, caso sintético)` — e (primer caso)
- `Pata 2 — lecturasSinTestigoDe (Task 1) > una llamada de un solo argumento que contiene un genérico con coma (x as Map<string, string>) SÍ se marca sin testigo — el genérico no cuenta como un segundo argumento (WR-01, caso sintético)` — c

GREEN: `argumentosDeNivelSuperior` gana profundidad angular independiente (un `<` la abre solo si
el carácter anterior es de identificador; un `>` la cierra solo si esa profundidad es >0 y el
carácter anterior no es `=`, para que `=>` nunca la cierre); `PATRON_ESTADO_DE_MODULO_MUTABLE`
acepta una anotación de tipo opcional (`:[^\n]*?` perezoso) entre el identificador y el `=` de la
rama `const`. `npx vitest run`: **120 passed, 0 failed.**

**Mutaciones ejecutadas contra el propio fichero de test, y revertidas:**

M3 — `argumentosDeNivelSuperior` vuelta temporalmente a su forma vieja (sin profundidad angular).
**4 failed, 116 passed de 120** — exactamente (a), (b), (c) y (e-primer caso), los mismos cuatro
títulos del RED previo listados arriba (menos los de WR-02, que no dependen de esta función).
Revertido; vuelta a 120 passed.

M4 — `PATRON_ESTADO_DE_MODULO_MUTABLE` vuelta temporalmente a su forma vieja (sin anotación de
tipo). **3 failed, 117 passed de 120** — exactamente (g), (h) e (i), los tres títulos de
descubrimiento listados arriba. Revertido; vuelta a 120 passed.

M4b — `PATRON_ESTADO_DE_MODULO_MUTABLE` sustituida temporalmente por la regex literal que
`09-REVIEW.md` propone (`:[^=\n]*` greedy sobre clase negada, en vez del cuantificador perezoso
adoptado). **1 failed, 119 passed de 120** — únicamente:
`Descubrimiento — marcasDeEstadoDeModuloDe (Task 1) > const con anotación de tipo que contiene => (Map<string, () => void>) más raíz vigilada SÍ se descubre — el caso que separa este arreglo de la regex literal de la review (WR-02, caso sintético)`
— los casos (g)/(h) (sin `=>` en la anotación) se quedaron en VERDE, confirmando por qué esa regex
no se adoptó: para en la primera flecha y solo evade el descubrimiento cuando la anotación
contiene una función flecha. Revertido; vuelta a 120 passed.

`git diff --stat` tras revertir las tres mutaciones confirmó que el único fichero con cambios netos
era `invariantesDeMarcaDeEstado.test.ts` (las 148 líneas del arreglo GREEN + los casos RED), sin
ningún residuo de M3/M4/M4b.

### Task 3 — Registro del cierre en `deferred-items.md` y ROADMAP

`deferred-items.md`: párrafo **«Actualización (quick 260923-3rn) — CERRADO:»** insertado tras el
«Acción sugerida:» del hallazgo 3 (Ronda 8 / plan 09-38), citando la Pata 6, los cuatro `it` que
M1/M2 pusieron rojos y el límite declarado (presencia, no alcanzabilidad). Sección nueva **«##
Huecos de parsing del gate de invariantes (09-REVIEW.md WR-01/WR-02; advisory de
09-VERIFICATION.md ronda 10) — CERRADO (quick 260923-3rn)»** con los dos huecos, sus arreglos, por
qué `indiceDeCierre` no se tocó, por qué no se adoptó la regex literal de la review, la salida de
M3/M4/M4b, y un bloque **«Observado al cerrar y NO cerrado aquí»** con las tres evasiones
adyacentes (export const/let a columna 0, contenedores no enumerados por el patrón, coma dentro
de string/template en `argumentosDeNivelSuperior`) — escritas explícitamente como abiertas, no
como cerradas.

`.planning/ROADMAP.md`: la línea de la Fase 9 (único `Edit` acotado a esa línea, nunca `Write`
del fichero entero) registra que las tres piezas de deuda no bloqueante (dos huecos de parsing +
falta de test directo) quedaron cerradas por esta quick, citando la Pata 6 y los dos arreglos de
parsing con remisión a `deferred-items.md`.

**Gates completos (re-ejecutados al final de la Task 3):**
```
npx vitest run          # Test Files 40 passed (40) | Tests 1284 passed (1284)
npx tsc --noEmit         # exit 0
npm run typecheck        # exit 0 (nuxt typecheck)
grep -c "260923-3rn" .planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md   # 6
grep -c "260923-3rn" .planning/ROADMAP.md                                              # 1
git diff --quiet HEAD -- 'app/pages/[game]/index.vue'                                  # exit 0
```
`git diff --name-only HEAD` (antes del commit de la Task 3) mostró exactamente los dos ficheros de
`files_modified` de esa tarea (`deferred-items.md`, `ROADMAP.md`); `index.vue` no aparece en
ningún momento del historial de este quick fuera de las mutaciones M1/M2, siempre revertidas.

## Nota sobre `covered_digest` de `09-VERIFICATION.md`

Igual que 260923-3rl y 260923-3rm, este ítem cambia ficheros que forman parte del
`covered_files` de `09-VERIFICATION.md` (`invariantesDeMarcaDeEstado.test.ts`,
`deferred-items.md`), así que el `covered_digest` de esa acta queda desfasado por diseño. No se
ha tocado `09-VERIFICATION.md`: es el acta histórica de la ronda 10. Volver a sellarlo es una
decisión del usuario al cerrar el lote de quicks (260923-3ri..3rn), con el mismo patrón que el
commit 633ef20 ya estableció. Tampoco se ha tocado `STATE.md`.

## Decisiones propias (discreción documentada en el plan)

1. **Vía elegida para WR-03 (hallazgo 3): pata nueva en el gate, no montaje de página.** Ya
   decidido explícitamente en el `<objective>` del plan — documentado aquí solo para trazabilidad:
   montar `app/pages/[game]/index.vue` exigiría `@vue/test-utils`/`happy-dom` (no instalados) y el
   entorno `nuxt` de Vitest (que `vitest.config.ts` evita por escrito).
2. **`funcionesSinRetiradaDe` busca la clave del lector en TODO el fichero consumidor, no dentro
   del cuerpo de la función que se audita.** El `<behavior>` describe la clave como "el primer
   argumento de la primera llamada al lector en ese mismo consumidor" sin acotarla al cuerpo de
   cada función — en el árbol real, `readProgressMismatchWarning` se llama una única vez, en
   `onMounted`, nunca dentro de las cinco funciones que retiran la marca; acotar la búsqueda al
   cuerpo de cada función habría hecho que ninguna de las cinco encontrara nunca una llamada al
   lector, cayendo siempre en la rama "sin lector: basta cualquier llamada con argumento" en vez
   de comprobar la clave de verdad. Buscar en todo el fichero es lo que hace que la comprobación de
   clave-distinta sea real.

## Known Stubs

Ninguno.

## Threat Flags

Ninguno — las cuatro mitigaciones del `<threat_model>` del plan (T-3rn-01..T-3rn-04) se
implementaron tal como estaban descritas: la heurística angular de `argumentosDeNivelSuperior`
solo puede INFRA-contar (nunca sobre-contar) por construcción — confirmado por el residuo
documentado de `a<b, c>d` y por M3 volviendo a poner rojos los casos (a)/(b)/(c)/(e) sin el
arreglo (T-3rn-01); las mutaciones M1/M2 se revirtieron con `git checkout --` y la verificación de
las Tasks 1 y 3 exigió `git diff --quiet HEAD -- 'app/pages/[game]/index.vue'` en ambos puntos
(T-3rn-02); el límite de alcanzabilidad de la Pata 6 (llamada presente pero bajo `if (false)`)
queda aceptado por escrito en el propio comentario de la pata, sin que la garantía de SC3 dependa
de ella (T-3rn-03); el caso (j) (`const x: number = 5`) fija que la anotación de tipo por sí sola
no basta sin `new Set`/`new Map`/`ref`, y el test de descubrimiento sobre el árbol real sigue
fijado a los mismos dos ficheros (T-3rn-04).

## Self-Check: PASSED

Ficheros comprobados con `[ -f ... ]`: los tres de `files_modified`
(`app/composables/__tests__/invariantesDeMarcaDeEstado.test.ts`,
`.planning/phases/09-hist-rico-y-estad-sticas/deferred-items.md`, `.planning/ROADMAP.md`) — los
tres `FOUND`. Commits comprobados con `git log --oneline --all | grep`: `dff1c98`, `5bc9be5`,
`9f4b893` — los tres `FOUND`.
