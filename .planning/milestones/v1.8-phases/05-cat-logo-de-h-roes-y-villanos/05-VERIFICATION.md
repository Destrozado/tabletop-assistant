---
phase: 05-cat-logo-de-h-roes-y-villanos
verified: 2026-09-07T23:40:00Z
status: passed
score: 8/8 must-haves verificados
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 6/8
  gaps_closed:
    - "CR-01 (05-VERIFICATION.md original): handSize por cara (handSizeHero/handSizeAlterEgo), Spider-Man 5/6 confirmado contra el RR v1.7 — ya cerrado en la ronda anterior, reconfirmado aquí sin regresión"
    - "CR-02 (05-VERIFICATION.md original): gate anti-copyright y gate de aislamiento estructuralmente independientes, con carga perezosa dentro de it() — ya cerrado en la ronda anterior, reconfirmado aquí sin regresión (estructura de characters.test.ts intacta tras la oleada 6)"
    - "Truth #8 / CAT-02 (gap nuevo de la ronda anterior): el catálogo de villanos ahora representa la salud de Kang en modo Experto (expert 15/22/25 por etapa, sub-objeto opcional), Rhino y Ultron correctamente sin la clave — verificado de forma independiente contra el código, los datos committeados y una regeneración en vivo desde la API"
  gaps_remaining: []
  regressions: []
gaps: []
deferred: []
human_verification: []
---

# Fase 5: Catálogo de héroes y villanos — Informe de re-verificación (tras oleada 6)

**Objetivo de la fase:** El repo tiene un catálogo fiable, reproducible y legal de los 23 héroes y 3 villanos disponibles —nombres y cifras, nunca texto de carta ni arte— validado en CI y disponible sin red, listo para alimentar la selección y los contadores de las fases siguientes.
**Verificado:** 2026-09-07T23:40:00Z
**Estado:** passed
**Re-verificación:** Sí — tras el cierre del gap de truth #8 (plan 05-06, dimensión de dificultad en la etapa de villano)

## Contexto de esta re-verificación

La re-verificación anterior (`05-VERIFICATION.md`, `score: 6/8`) dejó cerrados de forma
reproducida los dos gaps originales (CR-01 tamaño de mano, CR-02 gate anti-copyright
estructural) y encontró un gap nuevo: el catálogo de villanos modelaba una única tabla
de etapas, sin dimensión de dificultad, mientras `content/marvel-champions.json` ya
instruye sustituir cartas de villano en modo Experto. El plan 05-06 (oleada de cierre)
implementó la "salida buena" indicada por esa verificación: un sub-objeto `expert`
opcional por etapa. Esta re-verificación:

1. No acepta la palabra del SUMMARY de 05-06: reconstruye la evidencia leyendo el
   código y los datos directamente, y reproduce una mutación propia.
2. Hace un chequeo de regresión rápido sobre los dos gaps ya cerrados en la ronda
   anterior (CR-01, CR-02), que no fueron tocados por la oleada 6 salvo
   `characters.test.ts` (sí modificado; se revisó su estructura completa).
3. Lee `05-REVIEW.md` (revisión de código del estado final, 1 crítico / 15 warnings /
   13 info) y evalúa cada hallazgo relevante contra los must-haves de esta fase, sin
   heredar automáticamente su veredicto de severidad.

## Verificación independiente del cierre del gap de truth #8 (CAT-02, dificultad en la etapa de villano)

- **Contrato de tipos** (`engine/types.ts:144-154`): `VillainStage` conserva
  `stage/health/healthPerHero/healthPerGroup` sin cambios y añade
  `expert?: { health, healthPerHero, healthPerGroup }` como quinto campo opcional —
  confirmado leyendo el fichero directamente, no citando el SUMMARY.
- **Esquema Zod** (`engine/catalogueSchema.ts:45-57`): `ExpertVillainStageSchema` es un
  `z.strictObject` de los tres campos (quinto `z.strictObject` del fichero — confirmado
  con `grep -c "z.strictObject("` → 5), referenciado como
  `expert: ExpertVillainStageSchema.optional()` sin `.default()`.
- **Datos committeados** (`content/marvel-characters.json`, leídos con Python, no con
  grep superficial): Kang lleva `expert` en sus tres etapas con
  `{15,true,false} / {22,false,false} / {25,true,false}` — coincide exactamente con la
  tabla de la API citada en el plan. Rhino y Ultron no llevan la clave `expert` en
  ninguna etapa.
- **Generador** (`scripts/catalogue/fetch-marvelcdb.mjs`): las tres filas de Kang
  declaran `expertCode: '11034'/'11035'/'11039'` y `expectedExpertSetCode: 'exp_kang'`;
  `extractVillainStage` valida que `expertCode`/`expectedExpertSetCode` viajen juntos y
  que `expertCode !== code`.
- **Regeneración en vivo ejecutada por este verificador** (no solo citada del SUMMARY):
  `npm run catalogue:generate` contra la API pública de MarvelCDB → `git status
  --porcelain content/marvel-characters.json` vacío tras la regeneración. Esto
  reconfirma D-10 (determinismo byte a byte) **y** que la API en vivo sigue devolviendo
  las mismas cifras 15/22/25 hoy, no solo en el momento de la planificación.
- **Mutación propia reproducida por este verificador** (no aceptada del SUMMARY): se
  borró `kang.stages[0].expert` de `content/marvel-characters.json` y se ejecutó
  `npx vitest run --project engine engine/__tests__/characters.test.ts`:
  - Resultado: `Test Files 1 failed (1)`, `Tests 1 failed | 36 passed (37)`.
  - El test falla individualmente por nombre (`Kang: expert.health y sus banderas son
    15/22/25...`) con el mensaje `kang etapa 1: no lleva expert: expected undefined to
    be defined` — exactamente lo documentado en 05-06-SUMMARY.md, reproducido de forma
    independiente.
  - Fichero revertido con éxito (`git status --porcelain` vacío tras revertir).
- **Suite completa reconfirmada por este verificador:** `npx vitest run --project
  engine` → `Test Files 12 passed (12)`, `Tests 251 passed (251)` (239 previos + 12
  nuevos: 9 en `catalogueSchema.test.ts` describe `expert`, 3 en `characters.test.ts`
  describe `CAT-02`). `npm run test` (suite completa del repo) → `Test Files 17 passed
  (17)`, `Tests 374 passed (374)`, coincide con lo declarado en el contexto de esta
  tarea.

**Conclusión: el gap de truth #8 está cerrado de verdad**, con evidencia reproducida de
forma independiente por este verificador (código, datos, regeneración en vivo y
mutación), no solo citada del SUMMARY de 05-06.

## Chequeo de regresión de los gaps ya cerrados en la ronda anterior

- **CR-01 (handSize por cara):** `engine/types.ts` y `engine/catalogueSchema.ts` siguen
  declarando `handSizeHero`/`handSizeAlterEgo`; ningún cambio de la oleada 6 tocó estos
  campos. Sin regresión.
- **CR-02 (gate estructuralmente independiente):** la oleada 6 sí modificó
  `engine/__tests__/characters.test.ts` (añadió el describe `CAT-02` y reescribió el
  gate D-11). Se releyó el fichero completo: `readFileSync`/`JSON.parse`/
  `validateCharacterCatalogue(` solo aparecen dentro de los cuerpos de
  `readRawCatalogueText()` y `loadValidatedCatalogue()`, ambas invocadas únicamente
  dentro de `it()` — la estructura de CR-02 sigue intacta. `engine/__tests__/
  catalogue-isolation.test.ts` no está en `files_modified` de ninguno de los planes de
  la oleada 6; se releyó igualmente y su estructura de lectores perezosos no cambió.

Sin regresiones.

## Hallazgo nuevo de `05-REVIEW.md` (revisión post-oleada-6): ¿gap de Fase 05?

`05-REVIEW.md` (revisado 2026-09-07T23:30:00Z, cubre explícitamente el estado final
incluida la oleada 6) confirma en su propio texto que "el CR-01 del informe anterior...
**está resuelto**" y reporta un **CR-01 nuevo** con el mismo número pero distinto
contenido: `content/marvel-champions.json` (paso `setup.escenario.04`, variante
`expert`) instruye **sin condición** "Sustituid las cartas de villano numeradas por las
del modo Experto de este escenario", lo cual es falso para Rhino y Ultron (que —
correctamente, según el catálogo de esta fase y el RR v1.7 p.28: "using the **listed**
expert mode villain stages"— no tienen ningún set de villano Experto).

**Evaluado contra el alcance de la Fase 05 y desestimado como gap de esta fase:**

1. El propio informe de revisión etiqueta el fichero síntoma como "consumidor
   afectado... **fuera del scope de esta revisión**" y el fix propuesto dice
   literalmente "fichero fuera de scope, pero es donde vive el síntoma".
2. `content/marvel-champions.json` es contenido de las Fases 1-3 (confirmado con
   `git log --follow`: commits `feat(01-...)`, `feat(02-...)`, `content(03-01)`), no un
   artefacto de la Fase 05. Ninguno de los requisitos CAT-01 a CAT-07 cubre el texto de
   los pasos de escenario.
3. El catálogo de la Fase 05 en sí **es fiel**: no afirma que Rhino/Ultron tengan set
   Experto (el test `'Rhino y Ultron: ninguna etapa lleva la clave expert'` lo fija como
   invariante correcta) — el defecto vive enteramente en el paso narrado por otra fase,
   que no cruza su afirmación contra este catálogo.

Por tanto **no se cuenta como gap de la Fase 05** (instrucción explícita de esta
verificación: no heredar automáticamente el veredicto de severidad de la revisión
quirúrgica cuando el propio hallazgo señala alcance fuera de fase). Se deja constancia
en la sección de anti-patrones como nota informativa de calidad cruzada entre fases,
recomendable para una fase de contenido de escenario (Fase 2/3) o para la Fase 6/7 antes
de narrar el paso en una partida real de Rhino/Ultron en modo Experto.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria + derivadas de CLAUDE.md)

| # | Truth | Estado | Evidencia |
|---|-------|--------|-----------|
| 1 | Un test de Vitest en CI valida el catálogo completo contra un esquema Zod y falla la build si el contenido está malformado | ✓ VERIFICADO | `npx vitest run --project engine` → 251/251 verde; `ci.yml` ejecuta `npm run test` en cada push/PR |
| 2 | La vida de cada villano está modelada por etapa y por nº de jugadores desde el principio, no como cifra plana | ✓ VERIFICADO | Cada etapa `{stage, health, healthPerHero, healthPerGroup}` confirmada leyendo el JSON directamente |
| 3 | Script committeado y documentado regenera el catálogo desde MarvelCDB; reproducible; documenta cómo añadir una fila | ✓ VERIFICADO | `npm run catalogue:generate` ejecutado en vivo por este verificador → sin diff (determinismo D-10 reconfirmado con datos de la API de hoy) |
| 4 | El catálogo committeado no contiene texto de carta/cita/arte; el script proyecta lista blanca explícita | ✓ VERIFICADO | `grep -c` de claves prohibidas → 0; `z.strictObject` en 5 niveles de anidamiento (incluido `expert`) |
| 5 | Con la wifi apagada tras `nuxt generate`, el catálogo está disponible igual que el resto del contenido | ✓ VERIFICADO | Sin subcadenas `http`/`marvelcdb`/`api` en el JSON committeado (confirmado: 0 coincidencias) |
| 6 (derivada, CAT-01) | El campo de tamaño de mano refleja correctamente el RR v1.7 para lado héroe y lado alter ego | ✓ VERIFICADO (sin regresión) | `handSizeHero`/`handSizeAlterEgo` intactos, no tocados por la oleada 6 |
| 7 (05-03-PLAN.md must-have) | El guardarraíl anti-copyright es estructuralmente independiente del objeto validado por Zod | ✓ VERIFICADO (sin regresión) | Releído `characters.test.ts` completo tras la oleada 6: estructura de carga perezosa intacta |
| 8 (derivada, CLAUDE.md fidelidad de reglas + CAT-02) | El catálogo de villanos representa fielmente todas las cifras que el contenido de la app ya instruye usar, incluida la salud de Kang en modo Experto | ✓ VERIFICADO | Gap cerrado — ver sección dedicada arriba: `expert` 15/22/25 en Kang, ausente en Rhino/Ultron, mutación propia reproducida, regeneración en vivo sin diff |

**Puntuación:** 8/8 truths verificadas

### Artefactos requeridos

| Artefacto | Esperado | Estado | Detalles |
|-----------|----------|--------|----------|
| `engine/types.ts` | `CatalogueHero` con `handSizeHero`/`handSizeAlterEgo`; `VillainStage` con `expert?` opcional | ✓ VERIFICADO | Ambos confirmados leyendo el fichero |
| `engine/catalogueSchema.ts` | `HeroSchema`/`VillainStageSchema` con los campos correctos, `ExpertVillainStageSchema` como quinto `z.strictObject` | ✓ VERIFICADO | Confirmado, `grep -c "z.strictObject("` → 5 |
| `scripts/catalogue/fetch-marvelcdb.mjs` | `extractHero()` lee ambas caras; filas de Kang con `expertCode`/`expectedExpertSetCode` | ✓ VERIFICADO | Confirmado |
| `content/marvel-characters.json` | 23 héroes + 3 villanos; Kang con `expert` en sus 3 etapas; Rhino/Ultron sin `expert` | ✓ VERIFICADO | Confirmado leyendo el JSON con Python |
| `engine/__tests__/characters.test.ts` | Guardarraíl anti-copyright perezoso; describe `CAT-02` con cifras fijadas de Kang y ausencia en Rhino/Ultron | ✓ VERIFICADO | Confirmado; mutación propia reproducida |
| `engine/__tests__/catalogueSchema.test.ts` | Tests unitarios de `expert`: acepta ausente/presente/mixto, rechaza clave desconocida/campo faltante/tipo inválido | ✓ VERIFICADO | 9 tests confirmados en el describe `expert` |
| `engine/__tests__/catalogue-isolation.test.ts` | Lectores perezosos por fichero, sin cambios de esta oleada | ✓ VERIFICADO (sin regresión) | Estructura releída, intacta |

### Verificación de Key Links

| Desde | Hacia | Vía | Estado | Detalles |
|-------|-------|-----|--------|----------|
| `scripts/catalogue/fetch-marvelcdb.mjs` | `content/marvel-characters.json` | `extractVillainStage` escribe `expert` cuando la fila declara `expertCode` | ✓ WIRED | Confirmado con regeneración en vivo, sin diff |
| `engine/catalogueSchema.ts` | `engine/types.ts` | `VillainStageSchema`/`VillainStage` declaran el mismo `expert` opcional, campo a campo | ✓ WIRED | Confirmado |
| `engine/__tests__/characters.test.ts` | `content/marvel-characters.json` | `loadValidatedCatalogue()` dentro de `it()`, aserciones sobre `villain.stages[n].expert` | ✓ WIRED | Confirmado con mutación propia (borrado de `expert`) |
| `engine/__tests__/characters.test.ts` | `content/marvel-characters.json` | gate anti-copyright perezoso, `.not.toContain(key)` por clave | ✓ WIRED | Estructura intacta tras la oleada 6 (sin regresión) |
| `package.json` | `scripts/catalogue/fetch-marvelcdb.mjs` | `catalogue:generate` | ✓ WIRED | Ejecutado en vivo por este verificador |

### Behavioral Spot-Checks (ejecutados por este verificador, no citados del SUMMARY)

| Comportamiento | Comando | Resultado | Estado |
|-----------------|---------|-----------|--------|
| Suite del proyecto `engine` pasa sobre datos committeados | `npx vitest run --project engine` | `Test Files 12 passed (12)`, `Tests 251 passed (251)` | ✓ PASS |
| Suite completa del repo pasa | `npm run test` | `Test Files 17 passed (17)`, `Tests 374 passed (374)` | ✓ PASS |
| Borrar `kang.stages[0].expert` hace fallar el test de fidelidad Experta por nombre, sin colapsar la colección | mutación propia + `npx vitest run --project engine engine/__tests__/characters.test.ts` | `1 failed \| 36 passed (37)`, mensaje `kang etapa 1: no lleva expert` | ✓ PASS |
| Regenerar el catálogo desde la API en vivo reproduce el fichero byte a byte (D-10) | `npm run catalogue:generate` + `git status --porcelain` | Sin diferencias | ✓ PASS |
| Reversión limpia tras la mutación propia | `git status --porcelain content/marvel-characters.json` | Vacío | ✓ PASS |
| Sin subcadenas de red en el catálogo committeado | `grep -c -E "http|marvelcdb|api" content/marvel-characters.json` | `0` | ✓ PASS |

### Probe Execution

No se declaran ni encuentran probes `scripts/*/tests/probe-*.sh` convencionales para
esta fase. SKIPPED — no aplica (fase de contenido/esquema, no de migración/tooling).

### Requirements Coverage

| Requisito | Plan(es) origen | Descripción | Estado | Evidencia |
|-----------|------------------|-------------|--------|-----------|
| CAT-01 | 05-01, 05-02, 05-04 | Catálogo de 23 héroes con nombre, alter ego, vida, tamaño de mano | ✓ SATISFECHO | Sin regresión; verificado contra RR v1.7 en la ronda anterior |
| CAT-02 | 05-01, 05-02, 05-06 | Catálogo de 3 villanos con vida por etapa, per-jugador o total, incluida la dimensión Experta | ✓ SATISFECHO | Gap de truth #8 cerrado: `expert` presente en Kang, ausente en Rhino/Ultron, fijado por tests y verificado en vivo |
| CAT-03 | 05-02, 05-06 | Script committeado regenera el catálogo, uso documentado | ✓ SATISFECHO | Regeneración en vivo ejecutada por este verificador, sin diff |
| CAT-04 | 05-01, 05-02, 05-03, 05-05 | Solo lista blanca de campos; nada de texto/cita/arte | ✓ SATISFECHO | 0 claves prohibidas; `z.strictObject` en 5 niveles |
| CAT-05 | 05-01, 05-03, 05-05, 05-06 | Esquema Zod en test de Vitest en CI, falla la build si malformado | ✓ SATISFECHO | Mutación propia (borrado de `expert`) hace fallar el test correspondiente por nombre |
| CAT-06 | 05-03 | Catálogo en el bundle, nunca por red en ejecución | ✓ SATISFECHO | Sin subcadenas de red; sin consumidor en `app/` todavía (esperado, Fase 6 no existe aún) |
| CAT-07 | 05-02, 05-03, 05-06 | Añadir héroe/villano nuevo es una fila, documentado | ✓ SATISFECHO | Procedimiento documentado, ampliado con el caso `expertCode` |

No hay requisitos huérfanos: CAT-01 a CAT-07 están reclamados por al menos un plan y
todos tienen evidencia de satisfacción en el código actual.

**Nota de bookkeeping (no bloqueante):** `.planning/REQUIREMENTS.md` sigue marcando
CAT-01/02/03 como checkbox sin marcar y la tabla de trazabilidad como "Pendiente" para
las siete. Esto es una discrepancia de sincronización documental (el checklist no se
actualizó tras el cierre de gaps), no un hueco del código — se señala para que se
actualice junto con el cierre formal de la fase.

### Anti-patrones encontrados

| Fichero | Línea | Patrón | Severidad | Impacto sobre esta fase |
|---------|-------|--------|-----------|---------|
| `content/marvel-champions.json` (Fase 1-3, fuera de esta fase) + step `setup.escenario.04` | ~210-213 | Instrucción incondicional de sustituir cartas de villano Experto, falsa para Rhino/Ultron | ℹ️ INFO (cross-fase) | No es un artefacto de la Fase 05; el catálogo de esta fase es fiel y no afirma lo contrario. Recomendado como seguimiento antes de que la Fase 6/7 narre este paso en una partida real. |
| `engine/catalogueSchema.ts:56` + `engine/types.ts` | — | `expert` opcional **por etapa**, no por villano: un futuro villano con datos mixtos (algunas etapas con `expert`, otras sin) pasaría el esquema | ⚠️ WARNING | No afecta a los datos actuales (Kang: 3/3 etapas con `expert`; Rhino/Ultron: 0/3) — riesgo latente para altas futuras, no un defecto presente |
| `scripts/catalogue/fetch-marvelcdb.mjs:275-309` | — | Nada valida que `expectedExpertSetCode` sea distinto de `expectedSetCode` | ⚠️ WARNING | No afecta a las filas actuales de Kang (sets distintos, confirmados); riesgo latente para futuras filas |
| `engine/__tests__/characters.test.ts:83-105` | — | El test "el gate muerde" ejercita una función auxiliar (`findForbiddenKey`) distinta de la que usa el gate real (`.not.toContain`); el comentario que dice que es la misma implementación es inexacto | ⚠️ WARNING | El gate real sigue mordiendo — confirmado en la ronda anterior con mutación directa sobre el gate real (`.not.toContain`), no sobre el auxiliar. Desliz de comentario/mantenimiento, no agujero funcional |
| — | — | Sin typecheck en CI (`tsc` no configurado) | ⚠️ WARNING (heredado, ya evaluado en la ronda anterior) | `engine/types.ts` y `engine/catalogueSchema.ts` siguen coincidiendo campo a campo hoy; riesgo de proceso futuro, no defecto presente |
| — | — | `STAGE_MAP` solo I/II/III | ⚠️ WARNING (heredado) | Ningún villano actual tiene 4+ etapas |

Sin marcadores de deuda (`TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER`) en los ficheros
modificados por la oleada 6, más allá del falso positivo ya descartado ("TODO" dentro de
"TODOS" en un comentario de `catalogueSchema.ts`).

### Verificación humana requerida

Ninguna. Todos los artefactos de esta fase (esquema, script, JSON committeado, gates de
CI) son verificables por análisis estático, grep, lectura directa del JSON y ejecución
de Vitest — sin UI, sin renderizado visual, sin integración de servicio externo que
requiera un probador humano. La única llamada de red hecha en esta verificación
(`npm run catalogue:generate` contra la API pública de MarvelCDB) fue ejecutada por el
propio verificador, no delegada a un humano.

### Resumen

**Los tres gaps de las dos rondas anteriores están cerrados con evidencia reproducida
de forma independiente por este verificador** (no aceptada de los SUMMARY):

- CR-01 (handSize por cara): sin regresión, campos intactos.
- CR-02 (gate estructuralmente independiente): sin regresión, estructura de carga
  perezosa releída completa tras la oleada 6.
- Truth #8 / CAT-02 (dificultad en la etapa de villano): cerrado en la oleada 6,
  reconfirmado aquí con lectura directa del código y los datos, regeneración en vivo
  desde la API (sin diff) y una mutación propia que hace fallar el test de fidelidad de
  Kang por su nombre.

El hallazgo crítico nuevo de `05-REVIEW.md` (instrucción incondicional en
`content/marvel-champions.json`) se evaluó y se desestimó como gap de la Fase 05: el
propio informe señala que el fichero síntoma está fuera de su alcance de revisión, es
contenido de las Fases 1-3, y el catálogo de esta fase no afirma nada falso — es fiel a
lo que el reglamento y los datos de MarvelCDB dicen. Se deja como nota informativa de
seguimiento cruzado entre fases, no como bloqueante de esta verificación.

**Objetivo de la Fase 05 alcanzado: el catálogo de 23 héroes y 3 villanos es fiable,
reproducible y legal, está validado en CI, funciona sin red, y ahora también representa
correctamente la dimensión de dificultad allí donde el juego la exige (Kang) y la omite
correctamente donde no existe (Rhino, Ultron).**

---

_Verificado: 2026-09-07T23:40:00Z_
_Verificador: Claude (gsd-verifier)_
