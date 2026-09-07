---
phase: 05-cat-logo-de-h-roes-y-villanos
verified: 2026-09-07T20:05:00Z
status: gaps_found
score: 5/7 must-haves verified
overrides_applied: 0
gaps:
  - truth: "El campo handSize del catálogo de héroes refleja correctamente el tamaño de mano según el Rules Reference oficial v1.7, tanto para el lado héroe como para el lado alter ego (CAT-01, CLAUDE.md §Constraints — fidelidad de reglas)"
    status: failed
    reason: >
      Verificado de forma independiente contra reference/mc_rulesreference_v17-compressed.pdf
      (pdftotext, Apéndice III "Card Anatomy" punto 14 y entrada "HAND SIZE"): cada CARA de una
      identidad imprime su propio Hand Size — el ejemplo impreso de Spider-Man muestra
      "HAND SIZE 5 / HIT POINTS 10" en el lado héroe y "HAND SIZE 6 / HIT POINTS 10" en el lado
      alter ego (Peter Parker). El motor debe comprobar el hand size de la cara ACTIVA al final de
      cada fase de jugador ("Each player checks their hand size at the end of the player phase").
      El catálogo committeado guarda un único `handSize` sin cualificar, tomado siempre de
      `linked_card.hand_size` (lado alter ego) y descarta el valor real del lado héroe
      (`card.hand_size`). El comentario D-09 en scripts/catalogue/fetch-marvelcdb.mjs:187-190
      afirma como hecho que el hand_size del lado héroe "es un modificador de habilidad ... no el
      tamaño de mano real" — esa afirmación es falsa según el Rules Reference oficial, y queda
      escrita como si fuera la regla de extracción autorizada, lista para propagarse a la Fase 7
      (paso de fin de fase de jugador, que corre en cada ronda).
    artifacts:
      - path: "scripts/catalogue/fetch-marvelcdb.mjs"
        issue: "extractHero() (líneas 169-199) solo lee card.linked_card.hand_size; nunca lee ni valida card.hand_size (lado héroe). Comentario D-09 (líneas 187-190) contiene una afirmación de reglas falsa."
      - path: "engine/types.ts"
        issue: "CatalogueHero (líneas 135-141) declara un único campo handSize sin distinguir lado héroe / lado alter ego."
      - path: "content/marvel-characters.json"
        issue: "Los 23 héroes almacenan solo el handSize de alter ego (p. ej. Spider-Man: 6); el valor de lado héroe (5) no está en ningún sitio del repo."
    missing:
      - "Renombrar/duplicar el campo para capturar ambos valores (p. ej. handSizeHero + handSizeAlterEgo), actualizando engine/types.ts, engine/catalogueSchema.ts y el script de generación."
      - "Corregir el comentario D-09 para citar el Rules Reference v1.7 en vez de la afirmación actual, y re-generar/re-contrastar el catálogo con ambos valores por héroe antes de commitear."
      - "Como mínimo aceptable si se difiere el fix: renombrar el campo actual a handSizeAlterEgo para que ninguna fase futura lo confunda con el valor de lado héroe, y documentar la limitación conocida."
  - truth: "El guardarraíl anti-copyright de engine/__tests__/characters.test.ts opera sobre el string crudo del fichero de forma ESTRUCTURALMENTE INDEPENDIENTE del objeto validado por Zod (must-have explícito de 05-03-PLAN.md, y afirmación literal del propio comentario de cabecera del fichero: 'segunda barrera INDEPENDIENTE de z.strictObject')"
    status: failed
    reason: >
      Verificado empíricamente con un fichero de prueba aislado que reproduce el patrón exacto
      del fichero real (const catalogue = validateCharacterCatalogue(rawCatalogue) en ámbito de
      módulo, línea 17 de characters.test.ts): cuando esa llamada lanza, Vitest reporta
      "Test Files 1 failed (1)" pero "Tests no tests" — es decir, NINGUNO de los 20 tests
      it.each(FORBIDDEN_KEYS) ni ninguna invariante de forma llega siquiera a registrarse o
      ejecutarse; toda la suite del fichero desaparece de la colección de tests en vez de fallar
      individualmente. El proceso global sigue terminando con exit code distinto de cero (así que
      'npm run test falla si el catálogo está malformado' se sostiene a nivel de build), pero el
      guardarraíl anti-copyright deja de ser una barrera independiente en el sentido que el propio
      plan y el propio comentario de cabecera prometen: en cuanto CUALQUIER violación de esquema
      no relacionada con copyright ocurre a la vez (id duplicado, health no entero, etc.), el
      guardarraíl específico de copyright nunca llega a ejecutarse ni a reportar qué clave se
      encontró — exactamente el escenario para el que el comentario dice que existe ('si algún día
      se relajara el esquema, o hubiera un bug en él'). El mismo patrón de acoplamiento existe en
      engine/__tests__/catalogue-isolation.test.ts (readFileSync + JSON.parse en ámbito de módulo,
      líneas 26-30).
    artifacts:
      - path: "engine/__tests__/characters.test.ts"
        issue: "Línea 17: const catalogue = validateCharacterCatalogue(rawCatalogue) se ejecuta en ámbito de módulo, no dentro de un it()/describe(). Un throw ahí impide que se colecten los 20 tests de FORBIDDEN_KEYS."
      - path: "engine/__tests__/catalogue-isolation.test.ts"
        issue: "Líneas 26-30: readFileSync + JSON.parse de package.json/ci.yml en ámbito de módulo; mismo riesgo de acoplamiento si alguno de esos ficheros falla al leerse/parsearse."
    missing:
      - "Mover validateCharacterCatalogue(rawCatalogue) (y el JSON.parse si aplica) dentro de una función lazy invocada solo por los tests que realmente necesitan el objeto validado (p. ej. loadValidatedCatalogue()), dejando que los tests de FORBIDDEN_KEYS operen exclusivamente sobre rawText sin depender de que el parseo/validación tenga éxito."
      - "Repetir la prueba de mutación (insertar una clave prohibida a la vez que se rompe algo no relacionado, p. ej. un id duplicado) y confirmar que el test de FORBIDDEN_KEYS correspondiente reporta individualmente el hallazgo en vez de que la suite entera desaparezca."
human_verification: []
---

# Phase 5: Catálogo de héroes y villanos — Verification Report

**Phase Goal:** El repo tiene un catálogo fiable, reproducible y legal de los 23 héroes y 3 villanos disponibles —nombres y cifras, nunca texto de carta ni arte— validado en CI y disponible sin red, listo para alimentar la selección y los contadores de las fases siguientes.
**Verified:** 2026-09-07T20:05:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Un test de Vitest en CI valida el catálogo completo contra un esquema Zod y falla la build si el contenido está malformado | ✓ VERIFIED (with caveat — see gap #6) | `npx vitest run --project engine` → 236/236 passing on current committed data. Mutation test reproduced independently: inserting `"flavor":"..."` into `content/marvel-characters.json` makes the suite exit 1 (Zod `Unrecognized key`). CI workflow (`.github/workflows/ci.yml`) runs `npm run test` on every push/PR. **However**, see gap #6 below — the specific *anti-copyright* sub-test does not independently execute in this scenario, even though the overall build does fail. |
| 2 | La vida de cada villano está modelada por etapa y por nº de jugadores desde el principio, no como cifra plana | ✓ VERIFIED | `content/marvel-characters.json`: each villain stage is `{stage, health, healthPerHero, healthPerGroup}` — base value + flags, never a precomputed per-player-count table. Confirmed on real data: Kang stages `12/true`, `18/false`, `20/true` (flag genuinely varies per stage, proving it's not villain-level). `engine/catalogueSchema.ts` schema and `engine/__tests__/catalogueSchema.test.ts` accept 2-stage and 4-stage synthetic villains, proving the shape isn't hardcoded to 3. |
| 3 | Script committeado y documentado regenera el catálogo desde MarvelCDB; re-ejecutar sobre el mismo origen produce el mismo resultado; documenta cómo añadir una fila | ✓ VERIFIED | `scripts/catalogue/fetch-marvelcdb.mjs` (276 lines) exists, `package.json` registers `catalogue:generate`. Header contains literal marker `CÓMO AÑADIR UN HÉROE O VILLANO NUEVO` with a 4-step numbered procedure. `05-02-SUMMARY.md` documents 3 consecutive empirical runs leaving `git diff` empty (D-10). **Minor gotcha noted (WARNING, not blocking):** `STAGE_MAP = { I: 1, II: 2, III: 3 }` has no `IV` entry, so a hypothetical future 4-stage villain would require editing this constant in addition to adding a row — a partial contradiction of the "one row" claim, though it doesn't affect any of the 3 currently-committed villains. |
| 4 | El catálogo committeado no contiene texto de carta/cita/arte; el script proyecta explícitamente lista blanca, nunca la respuesta completa | ✓ VERIFIED | `grep -c "\.\.\.card" scripts/catalogue/fetch-marvelcdb.mjs` → 0 (no raw spread). `grep -Ec '"(text|real_text|flavor|traits|imagesrc|illustrator|url|octgn_id|generatedAt)"' content/marvel-characters.json` → 0. Schema uses `z.strictObject` at all 4 nesting levels (confirmed: `grep -c "z.strictObject(" engine/catalogueSchema.ts` → 4), which is the primary barrier that actually prevents a forbidden key from ever being accepted. See gap #6 for the weakened *secondary* barrier. |
| 5 | Con la wifi apagada tras `nuxt generate`, el catálogo está disponible igual que el resto del contenido — viaja en el bundle, nunca se pide por red en ejecución | ✓ VERIFIED (scoped to this phase) | `content/marvel-characters.json` is a static JSON file containing zero URL-shaped substrings (`http`, `marvelcdb`, `api` all absent from the raw content). `engine/__tests__/catalogue-isolation.test.ts` gates that `package.json` (`build`/`generate`/`preview`/`dev`/`postinstall`/`test`) and `.github/workflows/ci.yml` never reference the generator script, and that no file under `app/` references it either. No `app/` consumer exists yet — expected, since Phase 6 is the one that imports this content; the phase's own scope note ("listo para alimentar... las fases siguientes") is honestly reflected in 05-03-SUMMARY.md. |
| 6 | (derived from CLAUDE.md §Constraints — fidelidad de reglas, CAT-01) El campo `handSize` refleja correctamente el Rules Reference v1.7 para lado héroe y lado alter ego | ✗ FAILED | See `gaps` in frontmatter (CR-01, independently re-verified against `reference/mc_rulesreference_v17-compressed.pdf`). |
| 7 | (05-03-PLAN.md must-have) El guardarraíl anti-copyright es estructuralmente independiente del objeto validado por Zod | ✗ FAILED | See `gaps` in frontmatter (CR-02, independently reproduced with an isolated Vitest probe: module-scope throw → "Tests no tests"). |

**Score:** 5/7 truths verified (2 confirmed gaps, both independently re-verified beyond the code review's claims)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `engine/types.ts` | `CharacterCatalogue`/`CatalogueHero`/`CatalogueVillain`/`VillainStage`, zero zod imports | ✓ VERIFIED | All 4 interfaces present; `grep -c "from 'zod'"` → 0 |
| `engine/catalogueSchema.ts` | `CharacterCatalogueSchema` (z.strictObject ×4) + `validateCharacterCatalogue()` | ✓ VERIFIED | 120 lines; 4 `z.strictObject(` occurrences; both exports present; `slugifyCharacterName` used 3× (declaration + 2 invariant uses) |
| `engine/__tests__/catalogueSchema.test.ts` | ≥80 lines, synthetic fixtures | ✓ VERIFIED | 182 lines; part of 236-test green suite |
| `scripts/catalogue/fetch-marvelcdb.mjs` | ≥150 lines, 32 literal codes, abort gates, whitelist | ✓ VERIFIED (with WR-05 caveat above) | 276 lines; `CÓMO AÑADIR UN HÉROE` marker present; no `...card` spread; no `RETRY_BACKOFFS_MS`/`generatedAt` |
| `content/marvel-characters.json` | 23 heroes + 3 villains, `"gameId": "marvel-champions"` | ✓ VERIFIED | 240 lines; `node -e` confirms 23/3, correct ids, order (`spider-man`…`jubilee`), Kang stage flags 12/true 18/false 20/true |
| `package.json` | `catalogue:generate` entry, not wired into build/generate/postinstall/test | ✓ VERIFIED | `"catalogue:generate": "node scripts/catalogue/fetch-marvelcdb.mjs"` present; none of `build/dev/generate/preview/test/postinstall` reference it |
| `engine/__tests__/characters.test.ts` | ≥90 lines, schema gate + FORBIDDEN_KEYS + shape invariants | ✓ VERIFIED as artifact / ✗ FAILED as wired-independent gate | 168 lines exist and pass on current data (see gap #7 for the structural coupling issue) |
| `engine/__tests__/catalogue-isolation.test.ts` | ≥70 lines, D-06/CAT-06/CAT-07 gates | ✓ VERIFIED (same module-scope caveat noted) | 117 lines; 4 mutation tests documented in 05-03-SUMMARY.md all reproduced logically consistent with the file content |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `engine/catalogueSchema.ts` | `engine/types.ts` | `import type { CharacterCatalogue }` | ✓ WIRED | Confirmed line 17 |
| `engine/__tests__/catalogueSchema.test.ts` | `engine/catalogueSchema.ts` | `import { CharacterCatalogueSchema }` | ✓ WIRED | Confirmed line 2 |
| `engine/schema.ts` | `engine/catalogueSchema.ts` | header no longer claims uniqueness | ✓ WIRED | Lines 1-6 name both files |
| `package.json` | `scripts/catalogue/fetch-marvelcdb.mjs` | `catalogue:generate` script | ✓ WIRED | Confirmed |
| `scripts/catalogue/fetch-marvelcdb.mjs` | `marvelcdb.com/api/public` | `fetch()` | ✓ WIRED | Confirmed literal endpoint |
| `scripts/catalogue/fetch-marvelcdb.mjs` | `content/marvel-characters.json` | single `writeFileSync` | ✓ WIRED | Confirmed one call site |
| `engine/__tests__/characters.test.ts` | `engine/catalogueSchema.ts` | `import { validateCharacterCatalogue }` | ✓ WIRED | Confirmed line 12 |
| `engine/__tests__/characters.test.ts` | `content/marvel-characters.json` | `readFileSync` + `JSON.parse` | ✓ WIRED (but see gap #7 for module-scope coupling) | Confirmed |
| `engine/__tests__/catalogue-isolation.test.ts` | `package.json` / `.github/workflows/ci.yml` | `readFileSync` + assertion | ✓ WIRED | Confirmed |

### Data-Flow Trace (Level 4)

Not applicable in the strict sense — this phase produces no rendered UI. The relevant "data flow" is script → JSON file → Vitest gate, which is traced above under Key Links. `content/marvel-characters.json` is real, MarvelCDB-sourced data (not a static stub) — spot-checked: Iron Man `health:9, handSize:6`, Hulk/Thor/Vision `handSize:5`, Kang stage flags vary correctly.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full engine suite passes on committed data | `npx vitest run --project engine` | `Test Files 12 passed (12)`, `Tests 236 passed (236)` | ✓ PASS |
| Schema rejects a synthetic forbidden key | isolated probe reproducing `characters.test.ts`'s module-scope pattern | `Test Files 1 failed`, `Tests no tests` | ✗ FAIL (documents gap #7) |
| Rules Reference contradicts D-09's hand-size claim | `pdftotext -layout reference/mc_rulesreference_v17-compressed.pdf` + grep "hand size" | Spider-Man example: `HAND SIZE 5 / HIT POINTS 10` (hero) vs `HAND SIZE 6 / HIT POINTS 10` (alter-ego); "Each player checks their hand size at the end of the player phase" | ✗ FAIL (documents gap #6) |
| CI actually runs the gate suite | `cat .github/workflows/ci.yml` | `Run tests` step: `run: npm run test`, runs on every push/PR | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` conventional probes declared or found for this phase. SKIPPED — not applicable (content/schema phase, not a migration/tooling phase).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| CAT-01 | 05-01, 05-02 | Catálogo de 23 héroes con nombre, alter ego, vida, tamaño de mano | ✗ BLOCKED | `handSize` stores only the alter-ego value under an unqualified name — see gap #6 |
| CAT-02 | 05-01, 05-02 | Catálogo de 3 villanos (Rhino/Ultron/Kang) con vida por etapa, indicando si es per-jugador o total | ✓ SATISFIED | `healthPerHero`/`healthPerGroup` flags present at stage level, confirmed on real data |
| CAT-03 | 05-02 | Script committeado regenera el catálogo, uso documentado | ✓ SATISFIED | Script + `catalogue:generate` + documented procedure; WR-05 noted as non-blocking limitation |
| CAT-04 | 05-01, 05-02, 05-03 | Solo lista blanca de campos; nada de texto/cita/arte entra al repo | ✓ SATISFIED | Primary barrier (`z.strictObject` + whitelist projection) holds; secondary barrier weakened (gap #7) but does not currently allow a leak to reach the committed file |
| CAT-05 | 05-01, 05-03 | Esquema Zod en test de Vitest en CI, falla la build si malformado | ✓ SATISFIED (build fails) / ✗ gap noted | Build-level failure confirmed; the specific "independent guardrail" must-have fails — gap #7 |
| CAT-06 | 05-03 | Catálogo en el bundle, nunca por red en ejecución | ✓ SATISFIED | No URL substrings, no `app/` reference yet (expected — no consumer until Phase 6) |
| CAT-07 | 05-02, 05-03 | Añadir héroe/villano nuevo es una fila, documentado | ✓ SATISFIED | Procedure documented + gate verifies marker exists; WR-05's `STAGE_MAP` caveat noted as non-blocking |

No orphaned requirements: all of CAT-01 through CAT-07 are claimed by at least one plan and cross-referenced above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/catalogue/fetch-marvelcdb.mjs` | 187-190 | False rules claim in comment (D-09) used to justify discarding real data | 🛑 BLOCKER | Confirmed against RR v17 — see gap #6 |
| `engine/__tests__/characters.test.ts` | 14-17 | Module-scope `validateCharacterCatalogue()` call couples the anti-copyright gate's execution to schema success | 🛑 BLOCKER | Confirmed empirically — see gap #7 |
| `engine/__tests__/catalogue-isolation.test.ts` | 26-30 | Same module-scope read/parse pattern (lower risk — inputs are well-formed `package.json`/`ci.yml`, not user data) | ⚠️ WARNING | Same class of defect as gap #7, not separately blocking since current files are always well-formed |
| `engine/__tests__/catalogue-isolation.test.ts` | 63-71 (approx.) | Allowlist of 6 script names instead of a denylist over all scripts; misses `pre*`/`prepare` npm lifecycle hooks | ⚠️ WARNING | Currently no `prebuild`/`prepare` entry exists in `package.json`, so no active false negative today — but the gate design is bypassable |
| `engine/__tests__/catalogue-isolation.test.ts` | ~98-105 | Case-sensitive substring match for `http`/`marvelcdb`/`api` (CAT-06 remote-reference gate) | ⚠️ WARNING | A capitalized `MarvelCDB` URL would evade all three checks; not present in current data |
| `scripts/catalogue/fetch-marvelcdb.mjs` | 65, 211 | `STAGE_MAP` hardcoded to `{I,II,III}`, no `IV` | ⚠️ WARNING | Contradicts "one row" CAT-07 claim only for a hypothetical future 4-stage villain; no current villain affected |
| `scripts/catalogue/fetch-marvelcdb.mjs` | ~180-197 | `alterEgo` (and `card.linked_card.name`) written verbatim from the network with zero pinning/validation | ⚠️ WARNING | Sole unvalidated value-level channel from MarvelCDB into the repo; `health`/`handSize`/`name`/`type_code` are all pinned, `linked_card.name` is not |
| `scripts/catalogue/fetch-marvelcdb.mjs` | `main()` | No pre-write self-consistency check (duplicate ids, out-of-order stages) before `writeCatalogue` | ⚠️ WARNING | A duplicated/misordered `HERO_CARDS`/`VILLAIN_STAGE_CARDS` row would write successfully and only be caught by the next `npm run test`, not by the generator itself |

TODO/FIXME/XXX/HACK/PLACEHOLDER debt-marker scan: none found (two false-positive grep hits on the substring "TODO" inside the Spanish word "TODOS" in comments — not actual debt markers).

### Human Verification Required

None. This phase's deliverables (schema, script, committed JSON, CI gates) are entirely verifiable by static analysis, grep, and running Vitest — no UI, no visual rendering, no external service integration requiring a human tester.

### Gaps Summary

Two BLOCKER-level gaps were found, both independently re-verified beyond the code review's original claims (not simply inherited):

1. **CR-01 (rules fidelity, CAT-01):** Confirmed directly against `reference/mc_rulesreference_v17-compressed.pdf` — Marvel Champions identity cards print a distinct Hand Size on each side (Spider-Man: hero side 5, alter-ego side 6), and the rules require checking the *active* side's hand size at the end of every player phase. The catalogue stores only the alter-ego value under an unqualified `handSize` field, and the script's own D-09 comment asserts — incorrectly — that the hero-side value is not real hand size. This is exactly the "asistente que guía mal" scenario `CLAUDE.md` explicitly forbids, and it will misinform Phase 7's per-round end-of-player-phase step for every hero whose hero-side and alter-ego-side hand sizes differ (at minimum Iron Man, Thor, Hulk, Vision — all sampled in `05-02-SUMMARY.md` itself as "anomalies" without recognizing the anomaly is the real rule).

2. **CR-02 (CI gate structural integrity, CAT-04/CAT-05):** Confirmed empirically with an isolated Vitest probe reproducing the exact module-scope pattern in `engine/__tests__/characters.test.ts:17`. When `validateCharacterCatalogue()` throws at module scope, Vitest reports "Tests no tests" for the whole file — none of the 20 `FORBIDDEN_KEYS` anti-copyright assertions or shape invariants are individually collected or run. The overall `npm run test` / CI build still fails (non-zero exit), so the roadmap's literal SC1 wording ("falla la build si el contenido está malformado") holds at the coarse level — but the specific must-have from `05-03-PLAN.md` ("el guardarraíl anti-copyright... para ser estructuralmente capaz de fallar [de forma independiente]") and the file's own header claim ("segunda barrera INDEPENDIENTE de z.strictObject") are demonstrably false. The same coupling pattern exists in `engine/__tests__/catalogue-isolation.test.ts`.

Neither gap is cosmetic: CR-01 is a data-correctness defect that the project's own constitution (`CLAUDE.md`) makes a hard gate ("un asistente que guía mal es peor que no tener asistente"), and CR-02 is a defect in the very mechanism the phase exists to install (a CI gate that is supposed to independently catch copyright leaks). Both are fixable within the scope of this phase without re-planning: CR-01 needs a script/schema field change plus a re-fetch (~48s, no new decisions required — the fix is already sketched in `05-REVIEW.md`); CR-02 needs the validated-object construction moved from module scope into a lazy per-test call.

No items were deferred to a later phase — neither gap is addressed by Phase 6, 7, 8, 9, or 10's stated goals/success criteria in `.planning/ROADMAP.md` (Phase 7's "Banda de contadores" goal assumes correct life/hand-size *values already exist* in the catalogue; it does not promise to fix the catalogue itself).

---

_Verified: 2026-09-07T20:05:00Z_
_Verifier: Claude (gsd-verifier)_
