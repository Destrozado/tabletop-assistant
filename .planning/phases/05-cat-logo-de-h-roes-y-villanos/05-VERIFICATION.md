---
phase: 05-cat-logo-de-h-roes-y-villanos
verified: 2026-09-07T22:05:00Z
status: gaps_found
score: 6/8 must-haves verificados
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 5/7
  gaps_closed:
    - "CR-01: el campo handSize del catálogo distingue lado héroe (handSizeHero) y lado alter ego (handSizeAlterEgo), Spider-Man 5/6 confirmado contra el Rules Reference v1.7"
    - "CR-02: el guardarraíl anti-copyright y el gate de aislamiento leen/validan de forma perezosa dentro de cada it(), reproducido con una mutación real: 34 tests siguen colectándose, la clave prohibida se nombra en su propio fallo, sin 'no tests'"
  gaps_remaining: []
  regressions: []
gaps:
  - truth: "El catálogo committeado de villanos representa fielmente todas las cifras que el propio contenido de la app ya instruye usar, incluida la salud de Kang en modo Experto (CLAUDE.md §Constraints — fidelidad de reglas; CAT-02)"
    status: failed
    reason: >
      Confirmado de forma independiente contra `05-REVIEW.md` (hallazgo CR-01 de esa
      revisión, verificado en vivo por el revisor contra la propia API de MarvelCDB, y
      recontrastado aquí leyendo `content/marvel-champions.json` y
      `scripts/catalogue/fetch-marvelcdb.mjs`): `VillainStage`/`VillainSchema` modelan una
      única tabla de etapas por villano, sin ninguna dimensión de dificultad. El pack
      `toafk` trae un segundo conjunto paralelo de Kang bajo `card_set_code: exp_kang`
      (15/22/25 en vez de 12/18/20 committeados), y el script lo excluye a propósito
      (`scripts/catalogue/fetch-marvelcdb.mjs:123-126`). El problema no es teórico:
      `content/marvel-champions.json` (variante `expert` del escenario de Kang) ya
      instruye literalmente "Sustituid las cartas de villano numeradas por las del modo
      Experto de este escenario" — y la app pide la dificultad al usuario desde el propio
      mini-setup (`Difficulty = 'normal' | 'expert'`, `engine/types.ts:6`). En cuanto la
      Fase 6/7 lea este catálogo en una partida en modo Experto, narrará 12/18/20 cuando
      la mesa tiene físicamente las cartas de 15/22/25 — exactamente "un asistente que guía
      mal", el fallo que CLAUDE.md declara peor que no tener asistente.
      `05-RESEARCH.md:445` sí registró la existencia de `exp_kang` ("fuera de alcance de
      D-02/D-03 salvo decisión futura explícita"), pero esa deferencia **no llegó al
      contrato**: ni el esquema, ni `engine/types.ts`, ni un solo test dejan constancia de
      que `stages` es solo modo estándar. Revisado el ROADMAP.md completo: el objetivo y
      los criterios de éxito de la Fase 7 ("Vida de villano y héroes en pantalla... según
      villano, héroe y nº de jugadores cuando se conoce") no mencionan dificultad en
      absoluto — ninguna fase posterior reclama explícitamente resolver este hueco. No es
      un diferido válido: es una limitación conocida que se quedó fuera del contrato de
      datos sin ningún marcador, lista para congelarse en la forma que la Fase 6 va a
      importar.
    artifacts:
      - path: "content/marvel-characters.json"
        issue: "villains[kang].stages solo lleva la tabla estándar (12/18/20); no existe ningún campo ni fila para el modo Experto (15/22/25)."
      - path: "engine/catalogueSchema.ts"
        issue: "VillainStageSchema (líneas 34-39) no declara ninguna dimensión de dificultad; nada distingue 'esto es solo modo estándar'."
      - path: "engine/types.ts"
        issue: "VillainStage (líneas ~124-129) no documenta ni modela la limitación de alcance a modo estándar."
      - path: "scripts/catalogue/fetch-marvelcdb.mjs"
        issue: "líneas 123-126: el comentario presenta la exclusión de los códigos exp_kang como una protección, no como un hueco de alcance del contrato."
    missing:
      - "Salida buena: modelar la dificultad en la etapa (campo opcional `expert` con health/healthPerHero/healthPerGroup) y añadir las filas exp_kang (11034/11035/11039) al generador, regenerando el catálogo."
      - "Mínimo aceptable si se difiere: renombrar el campo a algo que no se lea como universal (p. ej. `standardStages`) y añadir un test ejecutable que fije la limitación, para que la Fase 7 no pueda pintar salud de villano en partidas Expertas sin tropezar con un aviso explícito."
human_verification: []
---

# Fase 5: Catálogo de héroes y villanos — Informe de re-verificación

**Objetivo de la fase:** El repo tiene un catálogo fiable, reproducible y legal de los 23 héroes y 3 villanos disponibles —nombres y cifras, nunca texto de carta ni arte— validado en CI y disponible sin red, listo para alimentar la selección y los contadores de las fases siguientes.
**Verificado:** 2026-09-07T22:05:00Z
**Estado:** gaps_found
**Re-verificación:** Sí — tras cierre de gaps CR-01 (05-04) y CR-02 (05-05)

## Contexto de esta re-verificación

La verificación inicial (05-VERIFICATION.md previo) encontró 2 gaps BLOCKER (CR-01,
CR-02) sobre 7 truths. Se ejecutaron dos planes de cierre (05-04, 05-05). Esta
re-verificación reproduce empíricamente ambos cierres (no se acepta la palabra de los
SUMMARY) y además incorpora los hallazgos de una revisión de código fresca
(`05-REVIEW.md`, 1 crítico / 7 warnings / 9 info) que se ejecutó después del cierre de
gaps, evaluando cada uno contra el objetivo de fase y el propio `05-RESEARCH.md` para
decidir si son gaps reales de la Fase 05 o alcance correctamente diferido.

## Gaps cerrados (verificados de forma independiente, no solo leídos en el SUMMARY)

### CR-01 — tamaño de mano por cara ✓ CERRADO

- **Contrato:** `engine/types.ts` y `engine/catalogueSchema.ts` declaran `handSizeHero` +
  `handSizeAlterEgo`; la clave legada `handSize` ya no existe en ningún fichero del repo
  (`grep -n handSize` no devuelve ningún campo sin cualificar).
- **Datos:** `content/marvel-characters.json` guarda los 23 héroes con los dos campos.
  Spider-Man: `handSizeHero: 5`, `handSizeAlterEgo: 6`.
- **Verificación independiente contra el PDF oficial:** `pdftotext -layout
  reference/mc_rulesreference_v17-compressed.pdf -` → línea 3679: `HAND SIZE 5 / HIT
  POINTS 10 ... HAND SIZE 6 / HIT POINTS 10` (ejemplo impreso de la carta de Spider-Man,
  Apéndice III) — coincide exactamente con 5/6. Confirma que el fix es correcto, no solo
  que compila.
- **Comentario D-09:** corregido en `scripts/catalogue/fetch-marvelcdb.mjs:197-210`; ya
  no afirma que el hand_size del lado héroe sea "un modificador de habilidad, no el
  tamaño de mano real" — cita el RR v1.7 y explica por qué se guardan los dos valores.
- **Esquema rechaza la clave legada:** `engine/__tests__/catalogueSchema.test.ts:63-67`
  inserta `handSize` en un héroe sintético y confirma `ZodError` (probado en la suite
  verde, 239/239).

### CR-02 — gate anti-copyright estructuralmente independiente ✓ CERRADO

- **Código:** ninguna lectura de fichero, `JSON.parse` ni llamada a
  `validateCharacterCatalogue()` ocurre en ámbito de módulo o de `describe()` en
  `engine/__tests__/characters.test.ts` ni en `engine/__tests__/catalogue-isolation.test.ts`
  — confirmado leyendo los dos ficheros completos. Toda la carga vive dentro de
  `loadValidatedCatalogue()` (no memoizada) o de lectores perezosos por-fichero, llamados
  únicamente dentro de cuerpos de `it()`.
- **Reproducción propia de la mutación (no se aceptó la palabra del SUMMARY):** se
  insertó en `content/marvel-characters.json` una copia mutada de Spider-Man con
  `"flavor": "cita de sabor con copyright"` (violación de copyright) y un `id` duplicado
  respecto a otro héroe ya presente (violación de esquema no relacionada), y se ejecutó
  `npx vitest run --project engine engine/__tests__/characters.test.ts` directamente
  desde este verificador:
  - Resultado: `Test Files 1 failed (1)`, `Tests 14 failed | 20 passed (34)`.
  - **Sin ningún "no tests"** — se colectan y ejecutan los 34 tests, igual que en el
    baseline.
  - El test `el fichero committeado no contiene la clave "flavor": de la API de
    MarvelCDB` falla **individualmente**, con mensaje `Se encontró la clave prohibida
    "flavor": en content/marvel-characters.json` — exactamente el comportamiento que CR-02
    exige.
  - Fichero revertido con éxito (`git status --porcelain content/marvel-characters.json`
    vacío tras revertir); `npm run test`/`vitest --project engine` vuelven a 239/239 verde.
- **Prueba B (aislamiento de `package.json`) reproducida de forma independiente:** se
  corrompió `package.json` (quitando la llave de cierre) y se ejecutó Vitest
  directamente. Resultado idéntico al documentado en 05-05-SUMMARY.md: Vite/rolldown
  falla al arrancar (`[UNHANDLEABLE_ERROR]... JSONError ... at bundleConfigFile ...
  createVitest`) **antes** de colectar ningún test — confirma que la limitación
  documentada en el SUMMARY es real, no una excusa fabricada, y que el límite de fallo
  está en la cadena de herramientas (Vite necesita parsear `package.json` para arrancar
  su propio config), no en el gate que este plan reestructuró. `package.json` restaurado
  y verificado limpio (`git status --porcelain` vacío).

**Conclusión sobre los dos gaps originales: ambos cerrados de verdad, con evidencia
reproducida por este verificador, no solo citada del SUMMARY.**

## Hallazgo nuevo de `05-REVIEW.md`: ¿gap de Fase 05 o alcance diferido?

El crítico de la revisión (CR-01 de `05-REVIEW.md`, distinto del CR-01 de gap-closure ya
cerrado) señala que el catálogo de villanos no puede representar la salud de Kang en modo
Experto (15/22/25), mientras `content/marvel-champions.json` ya instruye el cambio de
cartas para ese modo. Se ha verificado:

1. **`05-RESEARCH.md:445-448` sí documenta el hueco** como conocido, calificándolo "fuera
   de alcance de D-02/D-03... salvo decisión futura explícita".
2. **Pero esa deferencia nunca llegó al contrato de datos**: `VillainStage`/`VillainSchema`
   no llevan ningún marcador de "solo modo estándar", ni existe un test que lo documente
   o lo bloquee.
3. **Revisado `.planning/ROADMAP.md` completo (Fases 6-10):** ninguna fase posterior
   reclama explícitamente resolver la salud de villano por dificultad. El objetivo/success
   criteria de la Fase 7 ("Vida de villano y héroes en pantalla... según villano, héroe y
   nº de jugadores cuando se conoce") no menciona dificultad en ningún punto.

**Veredicto: esto es un gap real de la Fase 05, no un diferido válido.** La diferencia
entre "documentado como límite conocido en research" y "diferido explícitamente a una
fase futura con criterio de éxito propio" es exactamente la que separa un diferido
aceptable (Paso 9b de este proceso) de un hueco silencioso. Aquí no hay ninguna fase
posterior que reclame esta responsabilidad — Phase 7 asumirá implícitamente que las
cifras del catálogo son universales. Es además exactamente el escenario que CLAUDE.md
declara peor que no tener asistente ("un asistente que guía mal"), y el coste de
arreglarlo solo crece: la forma que se congele en esta fase es la que la Fase 6 va a
importar. Se añade como gap nuevo (ver frontmatter) — no se re-abren CR-01/CR-02, que
están cerrados.

**Nota de alcance:** el hallazgo NO afecta a Rhino ni a Ultron —ambos son pack `core`
sin `card_set_code` alternativo conocido— y no invalida ninguno de los cierres de CR-01
ni CR-02 verificados arriba.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria + derivadas de CLAUDE.md)

| # | Truth | Estado | Evidencia |
|---|-------|--------|-----------|
| 1 | Un test de Vitest en CI valida el catálogo completo contra un esquema Zod y falla la build si el contenido está malformado | ✓ VERIFICADO | `npx vitest run --project engine` → 239/239 en verde sobre datos actuales; mutación propia (flavor + id duplicado) → `Test Files 1 failed`, CI (`ci.yml`) ejecuta `npm run test` en cada push/PR. |
| 2 | La vida de cada villano está modelada por etapa y por nº de jugadores desde el principio, no como cifra plana | ✓ VERIFICADO | `content/marvel-characters.json`: cada etapa `{stage, health, healthPerHero, healthPerGroup}`; Kang confirmado con flags que varían por etapa (12/true, 18/false, 20/true) — la forma nunca es una cifra plana. (Nota: esto no cubre el hueco de dificultad, ver gap nuevo arriba — la truth tal como está literalmente escrita en el ROADMAP sí se cumple). |
| 3 | Script committeado y documentado regenera el catálogo desde MarvelCDB; reproducible; documenta cómo añadir una fila | ✓ VERIFICADO | `scripts/catalogue/fetch-marvelcdb.mjs` existe, `package.json` registra `catalogue:generate`; marcador `CÓMO AÑADIR UN HÉROE O VILLANO NUEVO` presente; determinismo D-10 reconfirmado en 05-04-SUMMARY.md (dos ejecuciones, mismo hash) y por la revisión de código independiente (byte-idéntico contra la API en vivo). |
| 4 | El catálogo committeado no contiene texto de carta/cita/arte; el script proyecta lista blanca explícita | ✓ VERIFICADO | `grep -Ec` de 20 claves prohibidas sobre `content/marvel-characters.json` → 0; `z.strictObject` en los 4 niveles de anidamiento (`grep -c "z.strictObject("` → 4); mutación propia confirma que insertar `flavor` hace fallar el gate nombrando la clave. |
| 5 | Con la wifi apagada tras `nuxt generate`, el catálogo está disponible igual que el resto del contenido | ✓ VERIFICADO (con alcance esperado) | `content/marvel-characters.json` no contiene subcadenas `http`/`marvelcdb`/`api` (`grep -c` → 0); `catalogue-isolation.test.ts` confirma que ningún fichero de `app/` referencia el script generador. No hay consumidor en `app/` todavía — esperado, la Fase 6 aún no existe. |
| 6 (derivada, CAT-01) | El campo de tamaño de mano refleja correctamente el RR v1.7 para lado héroe y lado alter ego | ✓ VERIFICADO (CR-01 cerrado) | Ver sección "Gaps cerrados" arriba — reverificado contra el PDF oficial de forma independiente. |
| 7 (05-03-PLAN.md must-have) | El guardarraíl anti-copyright es estructuralmente independiente del objeto validado por Zod | ✓ VERIFICADO (CR-02 cerrado) | Ver sección "Gaps cerrados" arriba — mutación reproducida por este verificador, sin "no tests". |
| 8 (derivada, CLAUDE.md fidelidad de reglas + CAT-02) | El catálogo de villanos representa fielmente todas las cifras que el contenido de la app ya instruye usar, incluida la salud de Kang en modo Experto | ✗ FALLIDO | Ver gap nuevo en frontmatter — confirmado contra `05-REVIEW.md`, `content/marvel-champions.json` y el ROADMAP completo de fases posteriores. |

**Puntuación:** 6/8 truths verificadas (2 gaps originales cerrados con evidencia
reproducida por este verificador; 1 gap nuevo encontrado por la revisión de código y
confirmado como no diferido a ninguna fase posterior)

### Artefactos requeridos

| Artefacto | Esperado | Estado | Detalles |
|-----------|----------|--------|----------|
| `engine/types.ts` | `CatalogueHero` con `handSizeHero`/`handSizeAlterEgo`, cero imports de zod | ✓ VERIFICADO | Confirmado; comentario cita RR v1.7 Apéndice III |
| `engine/catalogueSchema.ts` | `HeroSchema` con los dos campos dentro de `z.strictObject` | ✓ VERIFICADO | Líneas 46-54; clave legada `handSize` rechazada por strictObject |
| `scripts/catalogue/fetch-marvelcdb.mjs` | `extractHero()` lee y valida las dos caras | ✓ VERIFICADO | Líneas 181-190; D-09 corregido líneas 197-210 |
| `content/marvel-characters.json` | 23 héroes + 3 villanos, dos tamaños de mano por héroe | ✓ VERIFICADO | 23/3 confirmado; Spider-Man 5/6 |
| `engine/__tests__/characters.test.ts` | Guardarraíl anti-copyright con acceso perezoso | ✓ VERIFICADO (CR-02 cerrado) | Sin lecturas/validación en ámbito de módulo; reproducido con mutación propia |
| `engine/__tests__/catalogue-isolation.test.ts` | Lectores perezosos por fichero | ✓ VERIFICADO (CR-02 cerrado) | 5 lectores perezosos, todos invocados dentro de `it()` |
| `content/marvel-characters.json` (villanos, dimensión Experto) | Representar toda cifra que el contenido ya instruye usar | ✗ FALTA | Kang: solo tabla estándar (12/18/20); exp_kang (15/22/25) ausente sin marcador de alcance |

### Verificación de Key Links

| Desde | Hacia | Vía | Estado | Detalles |
|-------|-------|-----|--------|----------|
| `engine/catalogueSchema.ts` | `engine/types.ts` | `import type { CharacterCatalogue }` | ✓ WIRED | Confirmado |
| `engine/__tests__/characters.test.ts` | `engine/catalogueSchema.ts` | `import { validateCharacterCatalogue }` | ✓ WIRED | Confirmado, invocado dentro de `it()` únicamente |
| `engine/__tests__/characters.test.ts` | `content/marvel-characters.json` | lector perezoso `readRawCatalogueText()` dentro de `it()` | ✓ WIRED | Confirmado con mutación propia |
| `engine/__tests__/catalogue-isolation.test.ts` | `package.json` / `.github/workflows/ci.yml` | lectores perezosos por fichero dentro de `it()` | ✓ WIRED | Confirmado con corrupción propia de `package.json` |
| `package.json` | `scripts/catalogue/fetch-marvelcdb.mjs` | `catalogue:generate` | ✓ WIRED | No referenciado desde build/dev/generate/preview/test/postinstall |

### Behavioral Spot-Checks (ejecutados por este verificador, no citados del SUMMARY)

| Comportamiento | Comando | Resultado | Estado |
|-----------------|---------|-----------|--------|
| Suite completa del proyecto `engine` pasa sobre datos committeados | `npx vitest run --project engine` | `Test Files 12 passed (12)`, `Tests 239 passed (239)` | ✓ PASS |
| Mutación de copyright + id duplicado no colapsa la colección de tests (CR-02) | mutación propia + `npx vitest run --project engine engine/__tests__/characters.test.ts` | `14 failed \| 20 passed (34)`, sin "no tests"; clave `flavor` nombrada individualmente | ✓ PASS |
| `package.json` corrupto falla en el arranque de Vite, no en la colección del gate | corrupción propia + mismo comando contra `catalogue-isolation.test.ts` | `[UNHANDLEABLE_ERROR]` en `bundleConfigFile`/`createVitest`, antes de colectar tests | ✓ PASS (confirma la limitación documentada, no un defecto del gate) |
| Rules Reference confirma Spider-Man 5 (héroe) / 6 (alter ego) | `pdftotext -layout reference/mc_rulesreference_v17-compressed.pdf -` + grep | Línea 3679: `HAND SIZE 5 / HIT POINTS 10 ... HAND SIZE 6 / HIT POINTS 10` | ✓ PASS |
| Reversión limpia tras cada mutación propia | `git status --porcelain content/marvel-characters.json package.json` | Vacío en ambos casos | ✓ PASS |

### Probe Execution

No se declaran ni encuentran probes `scripts/*/tests/probe-*.sh` convencionales para
esta fase. SKIPPED — no aplica (fase de contenido/esquema, no de migración/tooling).

### Requirements Coverage

| Requisito | Plan(es) origen | Descripción | Estado | Evidencia |
|-----------|------------------|-------------|--------|-----------|
| CAT-01 | 05-01, 05-02, 05-04 | Catálogo de 23 héroes con nombre, alter ego, vida, tamaño de mano | ✓ SATISFECHO | `handSizeHero`/`handSizeAlterEgo` verificados contra RR v1.7; CR-01 cerrado |
| CAT-02 | 05-01, 05-02 | Catálogo de 3 villanos con vida por etapa, per-jugador o total | ⚠️ PARCIAL | La forma por etapa es correcta y verificada; falta representar el modo Experto de Kang (gap nuevo) |
| CAT-03 | 05-02 | Script committeado regenera el catálogo, uso documentado | ✓ SATISFECHO | Confirmado, determinismo D-10 reconfirmado dos veces (05-04 y revisión de código) |
| CAT-04 | 05-01, 05-02, 05-03, 05-05 | Solo lista blanca de campos; nada de texto/cita/arte | ✓ SATISFECHO | Gate anti-copyright estructuralmente independiente, verificado con mutación propia |
| CAT-05 | 05-01, 05-03, 05-05 | Esquema Zod en test de Vitest en CI, falla la build si malformado | ✓ SATISFECHO | Build falla verificado con mutación propia; gate específico ya no colapsa (CR-02 cerrado) |
| CAT-06 | 05-03 | Catálogo en el bundle, nunca por red en ejecución | ✓ SATISFECHO | Sin subcadenas de red; sin consumidor en `app/` todavía (esperado) |
| CAT-07 | 05-02, 05-03 | Añadir héroe/villano nuevo es una fila, documentado | ✓ SATISFECHO | Procedimiento documentado; `STAGE_MAP` sin `IV` es limitación menor no bloqueante (WR-03 de la revisión) |

No hay requisitos huérfanos: CAT-01 a CAT-07 están reclamados por al menos un plan.

### Anti-patrones encontrados (de `05-REVIEW.md`, clasificados contra el objetivo de fase)

| Fichero | Línea | Patrón | Severidad | Impacto |
|---------|-------|--------|-----------|---------|
| `content/marvel-characters.json` + `scripts/catalogue/fetch-marvelcdb.mjs` | 123-126 | Hueco de fidelidad: salud de Kang Experto no representable | 🛑 BLOCKER | Ver gap nuevo — confirmado, no diferido a ninguna fase |
| `scripts/catalogue/fetch-marvelcdb.mjs` | 111-130 | `villainName`/`expectedSetCode` sin puerta cruzada (WR-01) | ⚠️ WARNING | No afecta a los 3 villanos actuales; riesgo latente para futuras filas |
| `scripts/catalogue/fetch-marvelcdb.mjs` | 211 | `alterEgo` sin fijar ni acotar (WR-02) | ⚠️ WARNING | Único valor-canal sin pin; no bloquea el objetivo de esta fase |
| `scripts/catalogue/fetch-marvelcdb.mjs` | 65, 229-232 | `STAGE_MAP` solo I/II/III (WR-03) | ⚠️ WARNING | Contradice "una fila" solo para un hipotético villano de 4 etapas; ninguno actual afectado |
| `engine/__tests__/characters.test.ts` | 83-105 | `findForbiddenKey` no ejercitado por el gate real (WR-04) | ⚠️ WARNING | El gate real sigue mordiendo (`.not.toContain`), confirmado con mutación propia; la duplicación de lógica es un desliz de mantenimiento, no un agujero activo |
| `engine/catalogueSchema.ts` | 121-123 | Sin typecheck en CI; doble cast `as unknown as` (WR-05) | ⚠️ WARNING | Confirmado: no existe `typescript` en `node_modules`, no hay script `typecheck`, `ci.yml` solo corre `npm run test` + Playwright. Verificado que HOY `engine/types.ts` y `engine/catalogueSchema.ts` coinciden campo a campo (sin deriva activa) — el riesgo es de proceso futuro, no un defecto presente. No bloquea SC1 (que exige el gate Zod/Vitest, presente y probado) |
| `engine/schema.ts` | 164-201 | Duplicidad de labels no comprobada en variantes de dificultad (WR-06) | ⚠️ WARNING (fuera de alcance de Fase 5 — `engine/schema.ts` es de fases previas) | Informativo, no se re-evalúa aquí |

Sin marcadores de deuda (`TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER`) en los ficheros
tocados por esta fase, más allá de falsos positivos ya descartados en la verificación
inicial (subcadena "TODO" dentro de "TODOS").

### Verificación humana requerida

Ninguna. Todos los artefactos de esta fase (esquema, script, JSON committeado, gates de
CI) son verificables por análisis estático, grep y ejecución de Vitest — sin UI, sin
renderizado visual, sin integración de servicio externo que requiera un probador humano.

### Resumen de gaps

**Gaps originales (CR-01, CR-02): ambos cerrados y re-verificados de forma
independiente por este verificador**, no aceptados por la palabra de los SUMMARY:
reproducción propia de la mutación de copyright+id-duplicado (sin "no tests", 34 tests
colectados, clave nombrada individualmente) y de la corrupción de `package.json`
(confirmado el límite real en Vite/rolldown, no en el gate).

**Gap nuevo (no numerado en el ciclo anterior, añadido en esta re-verificación):** el
catálogo de villanos committeado no puede representar la salud de Kang en modo Experto
(15/22/25 frente a los 12/18/20 committeados), pese a que `content/marvel-champions.json`
ya instruye ese cambio de cartas para el escenario en dificultad Experta. `05-RESEARCH.md`
documentó el hueco como conocido, pero esa documentación nunca llegó al contrato de
datos (esquema/tipos/tests), y ninguna fase posterior del ROADMAP reclama resolverlo
explícitamente en sus criterios de éxito — no califica como diferido válido según el
criterio conservador de este proceso. Es exactamente el escenario "asistente que guía
mal" que `CLAUDE.md` declara peor que no tener asistente, y el coste de corregirlo crece
con cada fase que congele la forma actual del catálogo.

No se difirió ningún ítem a una fase posterior: se revisaron los objetivos y criterios de
éxito de las Fases 6 a 10 en `.planning/ROADMAP.md` y ninguno menciona dificultad como
dimensión de la salud de villano.

---

_Verificado: 2026-09-07T22:05:00Z_
_Verificador: Claude (gsd-verifier)_
