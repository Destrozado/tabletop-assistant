# Phase 2: Bucle de ronda y reglas verificadas - Research

**Researched:** 2026-08-29
**Domain:** Content authoring + light engine/composable extension for an already-built pure-TS step engine (Vue 3 / Nuxt 4, no new libraries)
**Confidence:** HIGH (all engine code read directly, all Rules Reference claims verified page-by-page with `pdftotext`, no unverified package claims — this phase installs nothing new)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Numeración continuada desde `01-CONTEXT.md` (D-01…D-19) para que no haya colisiones entre fases.

#### Pasos por jugador y granularidad del bucle
- **D-20:** El reglamento dice «en orden de jugador, cada jugador resuelve: el villano activa contra él; luego cada esbirro enfrentado con él activa» (RR v1.7 p. 45, paso 2). Aun así, la app lo cuenta como **un único paso colectivo en plural**. **No se añade `perPlayer` al esquema y `expand.ts` no se toca**: D-02 y D-08 quedan intactas, y el número de pasos del bucle no depende del nº de jugadores. Esto contradice conscientemente la recomendación de `PITFALLS.md:63` («un paso por jugador»); la contradicción está evaluada y resuelta, no pasada por alto.
- **D-21:** La red contra el olvido de un jugador es la **línea `⚠` de recuento** en los pasos por jugador (activación de enemigos, reparto y revelado de encuentros): p. ej. «⚠ Uno por jugador, en orden de jugador — sin saltarse a nadie». Se usa el mecanismo que ya existe (D-05), sin esquema ni UI nuevos.
- **D-27:** La **fase de los jugadores son 4 pasos**: (1) jugad vuestros turnos en orden de jugador, (2) descartar, (3) robar hasta el tamaño de mano, (4) enderezar. Los tres últimos separados porque CONT-02 exige el orden correcto y cada uno es una acción física atómica (D-01 / CONT-11).
- **D-28:** Los pasos 4 y 5 del fin de fase del reglamento (terminan los efectos «hasta el final de la fase»; se resuelven los «cuando/después de que termine la fase») **no son pasos**: van como línea `⚠` en el paso de enderezar.
- **D-35:** El **paso 6 de la fase del villano («Fin de la fase del villano y de la ronda») sí es un paso real**, no un `⚠` del paso 5 — al contrario que en la fase de jugadores. Motivos: CONT-03 y el criterio de éxito nº 1 exigen los 6 pasos oficiales, y ese paso es la frontera visible del bucle, el toque en el que el contador salta a la ronda siguiente en vez de teletransportarse.

#### Estructura de datos del bucle
- **D-34:** La sección `RONDA` (`repeats: true`) tiene **dos fases: `JUGADORES` (4 pasos) y `VILLANO` (6 pasos)**. **No hay una tercera fase «Fin de ronda».** Pasar la ficha de jugador inicial (paso 5) y cerrar la ronda (paso 6) viven dentro de la fase del villano, como en el reglamento. La redacción del `ROADMAP.md` («fase de jugadores → fase del villano → fin de ronda») es descripción narrativa, no estructura de datos: **CONT-04 se satisface dentro de la fase del villano**.
- `loopStartIndex` cae en el primer paso de `JUGADORES` y `loopEndIndex` en el paso 6 de `VILLANO`. Ambos ya los calcula `expand.ts` a partir de `repeats: true`; no hay que cablear nada.
- **D-37:** El gate de CI **se endurece a exactamente una** sección con `repeats: true`. Resuelve el `TODO(fase 2)` literal de `engine/schema.ts` (hoy `> 1` falla; pasa a fallar también con `0`). Un fichero de contenido sin bucle debe romper el build, no llegar a la mesa con `loopEndIndex` vacío en silencio. **Revisar `engine/__tests__/fixtures/tiny-game.json`**, que puede no tener sección repetitiva.

#### Cabecera dentro del bucle
- **D-22:** Dentro del bucle el contador es **relativo a la fase**: `RONDA 4 · Villano · 3 de 6`. Es literalmente la maqueta de D-11, y el «de 6» coincide con los 6 pasos oficiales, así que el número enseña reglas. **`useGameSession.position` debe pasar a calcularse por `phaseId`** dentro del tramo repetitivo, no sobre toda la secuencia (hoy cuenta todos los nodos `kind:'step'` globalmente, lo que daría «8 de 45»).
- **D-23:** Durante la preparación la cabecera **se queda exactamente como está** (`PREPARACIÓN · 8 de 21`, contador global). La preparación sí es lineal y sí tiene meta. La asimetría entre tramos está aceptada a conciencia: cada tramo muestra lo que allí es útil.

#### Índice de salto en el bucle
- **D-24:** Estando en el bucle, el overlay muestra **los bloques de la ronda primero y la preparación al final, atenuada**, como zona de consulta. Un solo overlay (D-13 intacta) y saltar al setup sigue siendo posible, que es lo que FLOW-08 da por hecho. El reordenado debe derivarse de `sectionRepeats`, **nunca cablearse contra el id `ronda`** (TECH-04).
- **D-25:** Dentro del bucle **solo se marca el paso actual (`●`); no hay `✓`**. El `✓` significa «hecho y no vuelve», cierto en la preparación y falso en el bucle. Sigue siendo derivado del cursor sin estado nuevo (D-14 respetada), solo con una regla distinta según `sectionRepeats`.
- **D-26:** FLOW-08 se cumple **sin código nuevo**: `jumpTo()` ya no toca `round`, y para volver a la ronda se usa el propio índice. **Descartado** un botón «Volver a la ronda» y descartado recordar el punto de salida (estado nuevo que puede desincronizarse).

#### Contenido de la ronda: principio rector
- **D-31 (principio del usuario, gobierna TODO el contenido de la ronda):** **«Recordar mirar, no explicar lo que ya está impreso.»** Si la regla está escrita en el componente físico (carta de Estado, «Cuando se revela», habilidades, palabras clave), la app **recuerda mirarlo** y no lo reproduce. Si no está impresa en ningún sitio, la app **enuncia la consecuencia**. Encaja además con la restricción legal del proyecto (no reproducir textos con copyright) y con lo hecho en la Fase 1 (redacción propia, breve e imperativa).
  - *Caso real que lo motivó:* «ayer el villano tenía Confundido y Aturdido y ni nos dimos cuenta en toda una fase de villano». Lo que falló fue **mirar**, no saber la regla — la carta la lleva escrita.
- **D-29:** Las reglas condicionales (CONT-05/06/07) aparecen como **línea `⚠` en su paso ancla**, no como lista de recordatorios ni como pasos condicionales propios. Anclas: agotamiento del mazo de jugador → paso «robar»; agotamiento del mazo de encuentros → pasos de repartir/revelar; Aturdido/Confundido/Duro → paso «los enemigos activan»; cambio de fase del villano → paso «jugad vuestros turnos».
- **D-30:** Aplicación de D-31 a cada condicional:
  - **Estados (Aturdido/Confundido/Duro):** solo recordatorio de mirar («⚠ Atentos a los Estados en los personajes»). La carta lleva la regla.
  - **Agotamiento del mazo de jugador:** **enuncia la consecuencia** — barajas tu descarte y **te repartes a ti mismo una carta de encuentro boca abajo**. Nada en la mesa lo dice.
  - **Agotamiento del mazo de encuentros:** **enuncia la consecuencia** — barajas el descarte de encuentros y **colocas una ficha de aceleración** junto al esquema principal. Caso distinto del anterior y con castigo global y permanente (esto es literalmente lo que CONT-05 pide diferenciar).
  - **Cambio de fase del villano:** en pantalla solo «⚠ Atentos al dial del villano»; el procedimiento (retirar la fase, revelar la siguiente, ajustar el dial, qué se conserva) va **en el modal** (D-32).
- **D-33:** **ADAPT-04 se cumple con una sola frase colectiva**, sin campo `branches` ni UI nueva: «El villano ataca a cada héroe y avanza el esquema contra quien esté en Alter-Ego». Ambas ramas visibles a la vez y sin ningún toque, en el mismo registro plural de D-02.

#### El aviso clicable (superficie nueva en esta fase)
- **D-32:** El `⚠` **es clicable y abre un modal** con la consecuencia detallada, que se cierra fácilmente para seguir jugando. Racional del usuario: *el recordatorio lo quieres siempre; las consecuencias solo si dudas.* En pantalla queda lo breve y conciso; el detalle está a un toque.
  - **Límite duro:** **solo el aviso `⚠`**. Nada de palabras clave enlazadas dentro del texto del paso, ni diccionario de keywords, ni búsqueda — eso es REF-01 entero y sigue en v2.
  - **Forma:** un campo **opcional** nuevo junto a `warning` en `TextBlockSchema`. Un `⚠` sin ese campo **no es clicable** (sin afordancia falsa). `warning` mantiene su tope de 60 caracteres: el principio D-31 lo hace suficiente.
  - **El texto del detalle lo escribe el autor del paso**, con redacción propia; no hay corpus de reglas nuevo que mantener.
  - **Deuda de alcance a saldar:** el `ROADMAP.md` de la Fase 2 (5 criterios de éxito, todos de bucle y contenido) y `REQUIREMENTS.md` no contemplan esta superficie. Hay que reflejarla — es un REF-01 recortado adelantado a v1.

#### Verificación del contenido (CONT-09)
- **D-36:** Se repite el dispositivo de la Fase 1 —citas en datos (D-06), gate de esquema en CI, reverificación automática— **más una tarea explícita del plan en la que el usuario revisa a mano el contenido de la ronda contra el reglamento antes de darlo por definitivo**. Motivo: en `01-06` los tres errores de fidelidad los cazó la revisión humana del usuario, no la reverificación automática. Esa tarea debe existir en el plan, no ser un paso implícito.
- Los **cuatro errores confirmados del borrador** están fijados y son de contenido obligatorio en esta fase: 6 pasos oficiales de la fase del villano (no 4); obligaciones «una o más por identidad» (no una por jugador); **solo el villano y los esbirros con la palabra clave Villano roban cartas de aumento**; el **Modo Experto no altera la estructura de la fase del villano** (eso es el Modo Heroico, un eje aparte y combinable).

### Claude's Discretion

El usuario no delegó ninguna decisión de forma explícita. Estas quedan sin fijar y son del ámbito de research/planner:
- **Frase locutable (`speech`) del contenido de la ronda — DECIDIR EN PLANIFICACIÓN.** Hallazgo de esta discusión: el contenido actual tiene **24 pasos, 3 con `warning` y 0 con `speech`**. El campo existe en el esquema desde la Fase 1 pero **ningún paso lo usa**, pese a que el `ROADMAP.md` dice que el esquema con «frase corta locutable» se diseña desde la Fase 1 porque «retro-adaptarlo después sería caro». Si la ronda se escribe también sin `speech`, la Fase 3 hereda ~45 pasos que locutar de golpe. Se ofreció discutirlo y el usuario cerró la discusión sin abordarlo: **el planner debe decidirlo explícitamente**, y la inclinación por defecto (del propio roadmap) es redactar `speech` ya.
- **Reanudación dentro del bucle.** `usePersistedSession` ya persiste `round`, pero `ResumePrompt.vue` no lo menciona: al reanudar se indica el paso sin decir que se iba por la ronda 4. `PITFALLS.md:179` avisa de exactamente este riesgo. No se discutió; queda a criterio del planner si entra aquí o se anota.
- **Detalle de la UI del modal del `⚠`** (apertura, cierre, tamaño táctil a un brazo de distancia, foco y accesibilidad). La Fase 1 tuvo `01-UI-SPEC.md`; **valorar `/gsd:ui-phase 2`** antes de planificar, ya que esta fase estrena superficie de UI que ninguna spec cubre.
- Redacción concreta de cada paso, recuento final de pasos del bucle y reparto exacto de los `⚠`.
- Cómo se representa el número de ronda en `sectionLabel` (hoy `sectionTitle.toUpperCase()`) y dónde vive la lógica de «tramo repetitivo» compartida por cabecera, índice y marcas.
- Alcance de los tests del bucle más allá de lo que exigen FLOW-03/04/07/08.

### Deferred Ideas (OUT OF SCOPE)

- **REF-01/REF-02 completos: cualquier palabra clave de cualquier texto es clicable y abre su regla.** Idea del usuario en esta discusión, con corpus de reglas y búsqueda por término. Ya existía como `REF-01`/`REF-02` en `REQUIREMENTS.md:109-110` (v2) y como idea aplazada de la Fase 1. **Queda reforzada por el caso real del villano Confundido+Aturdido.** D-32 adelanta a v1 solo el trozo más barato (el aviso clicable); el resto —diccionario de keywords, marcado dentro del texto del paso, búsqueda— sigue fuera. Cuando llegue: redacción propia + cita, nunca texto literal del Rules Reference.
- **Fase 2.1 dedicada a lo clicable** — se ofreció como alternativa para no desviar la Fase 2; el usuario prefirió acotar el alcance dentro de la propia fase (solo el `⚠`). Sigue siendo la salida natural si el modal crece durante la planificación.
- **Campo `branches[]` en el esquema para las ramas Héroe/Alter-Ego** — descartado por D-33 a favor de una frase colectiva. Reconsiderable si aparecen pasos con ramas que no quepan en una sola frase.
- **Botón «Volver a la ronda»** tras saltar a la preparación — descartado por D-26 (estado nuevo que puede desincronizarse). Reconsiderable si en mesa resulta incómodo buscar el sitio en el índice.
- **Un paso por jugador (`perPlayer`)** — descartado por D-20 pese a la recomendación de `PITFALLS.md:63`. Reconsiderable si tras jugar una partida se sigue olvidando activar contra alguien y el `⚠` de recuento no basta.
- **Subir el tope de 60 caracteres de `warning`** — se planteó y dejó de hacer falta al aparecer el principio D-31 y el modal de D-32.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLOW-03 | Al avanzar desde el último paso de la ronda, el usuario vuelve al primer paso de la ronda, no al de la preparación | `engine/navigator.ts`'s `next()` already implements this (wraps at `loopEndIndex` to `loopStartIndex`); satisfied purely by adding the `ronda` section to content — see Summary and Architecture Patterns |
| FLOW-04 | Al cerrar el ciclo de la ronda, el contador de ronda se incrementa | Same `next()` function increments `round` only on the wrap edge — already unit-tested against the fixture in `navigator.test.ts`; needs an equivalent test against real `marvel-champions.json` content (Common Pitfalls / test-surface notes) |
| FLOW-07 | Tras saltar a un paso del bucle de ronda, seguir avanzando continúa correctamente por el bucle desde ese punto | `jumpTo()` already leaves `round` untouched and repositions `cursor`; a subsequent `next()` uses the same wrap logic regardless of how `cursor` got there — already covered by one `navigator.test.ts` case with the tiny fixture, needs the equivalent against real content |
| FLOW-08 | Un salto a un paso de la preparación no rompe ni reinicia el contador de ronda | Same `jumpTo()` — `round` is never touched by jumps in either direction (D-26 confirms no new code needed) |
| CONT-02 | El flujo cubre la fase de los jugadores, incluido el orden correcto de fin de fase (descartar, robar, preparar) | Verified against Rules Reference "End of Player Phase" p.16 (5 steps: discard, draw, ready, until-end-of-phase effects end, when/after effects) — maps to D-27's 4-step JUGADORES phase + D-28's `⚠`-folded steps 4/5. See Code Examples |
| CONT-03 | El flujo cubre la fase del villano con sus 6 pasos oficiales, en el orden del reglamento | Verified against Rules Reference "Villain Phase" p.45 — exact 6-step structure quoted in Code Examples, matches D-34/D-35's authoring plan exactly |
| CONT-04 | El flujo cubre el fin de ronda, incluido el paso de la ficha de jugador inicial | Confirmed: "Pass First Player Token" is villain-phase step 5 (p.45), "End of Villain Phase and Round" is step 6 — both live inside VILLANO per D-34, no third phase needed |
| CONT-05 | El flujo cubre el agotamiento del mazo de jugador y el del mazo de encuentros como casos distintos, con sus consecuencias correctas | Verified against Rules Reference "Player Deck" (p.32, deal self a facedown encounter card) vs. "Encounter Deck" (glossary, shuffle + acceleration token) — two genuinely distinct, correctly differentiated consequences. See Code Examples for exact quotes |
| CONT-06 | El flujo cubre el cambio de fase del villano al agotarse su vida | Verified against "Villain Defeat" (p.44): remove current stage, reveal next, adjust dial; same-title stages keep attachments/status/counters/non-damage-tokens, different-title stages don't |
| CONT-07 | El flujo recuerda, en el momento en que aplican, los estados Aturdido, Confundido y Duro con su resolución correcta | Verified against Stunned/Confused/Tough glossary entries — all three are fully printed on physical status cards, supporting D-31's "recordar mirar" framing for these three specifically (D-30) |
| CONT-09 | Todo el contenido queda verificado contra el Rules Reference oficial v1.7 antes de considerarse definitivo, incluidos los errores ya detectados en el borrador | All four confirmed draft errors independently re-verified page-by-page in this session (see State of the Art table); D-36's human-review task is the mechanism that must exist in the plan, per Phase 1 precedent |
| ADAPT-04 | Los pasos con ramas condicionales muestran todas las ramas como texto simultáneamente, sin requerir ningún toque para elegir | D-33 resolves this with a single collective sentence, no schema/UI change — consistent with the existing `resolve.ts`/`TextBlockSchema` pattern (no `branches[]` field exists or is needed) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Nuxt 4.x (already scaffolded, no version change this phase).
- **Sin backend:** all round content lives in `content/marvel-champions.json`; all session state stays client-side via `useLocalStorage` — nothing in this phase introduces a server, API route, or database.
- **Dispositivo objetivo:** tablet en horizontal, legible a un brazo de distancia — the new `⚠` modal and any new text (round `text`/`warning`/`warningDetail`) must respect the same tablet-first legibility bar as Phase 1's step screen; no new text budget is defined yet for `warningDetail` (see Open Questions).
- **Offline:** out of scope for this phase (PWA/offline is Phase 4) — nothing in this phase should introduce a network dependency.
- **Idioma:** todo el contenido nuevo (textos de paso, avisos, detalle del modal) en español, redacción propia.
- **Fidelidad de reglas:** el contenido de la ronda debe contrastarse con el Rules Reference oficial v1.7 antes de darse por bueno (CONT-09) — this research independently re-verified every claim in `02-CONTEXT.md`'s canonical refs against the PDF in this session (see Sources).
- **Legal:** no reproducir cartas, arte ni textos extensos con copyright — confirmed no verbatim Rules Reference text is reproduced anywhere in this RESEARCH.md's content-authoring guidance; all quotations here are for the author's/reviewer's reference only, and the app's actual Spanish text must remain original per D-31.
- **`zod` solo en `engine/`, nunca en `app/`** (T-01-19): the new `warningDetail` field is added to `engine/schema.ts`'s `TextBlockSchema` only; no Zod import crosses into `app/`.
- **Interpolación de texto, nunca `v-html`** (T-01-01): the new clickable-`⚠`/modal component must render `warningDetail` via `{{ }}` interpolation exactly like every other content field — see Security Domain.
- **GSD Workflow Enforcement:** file-changing work for this phase must go through the GSD phase-planning/execution flow (`/gsd:plan-phase` → execution), not direct ad-hoc edits — this research document is an input to that flow, not a substitute for it.

## Summary

Phase 2 is overwhelmingly a **content + targeted logic** phase, not a new-engine phase. `engine/navigator.ts` already implements the full loop-closing, loop-reopening and jump-without-round-mutation logic (`next`/`prev`/`jumpTo`), and `engine/expand.ts` already derives `loopStartIndex`/`loopEndIndex` from whichever section has `repeats:true`. None of that machinery has ever run against real content, because `content/marvel-champions.json` today has exactly one section (`setup`, `repeats:false`) and zero repeating sections. Adding the `RONDA` section (JUGADORES 4 steps + VILLANO 6 steps, per D-27/D-34/D-35) is what switches this machinery on for the first time — FLOW-03/04/07/08 are satisfied by data, not by new navigator code.

The real engineering work in this phase is four narrow, well-scoped changes, all confirmed by reading the actual code: (1) `engine/schema.ts`'s `superRefine` must flip from `> 1` to `!== 1` (D-37) — and this **must land in the same change as the RONDA content**, because tightening the gate first breaks CI against today's zero-repeating-section content, and a `schema.test.ts` test that currently asserts "zero repeating sections does NOT throw" must be inverted; (2) `useGameSession`'s `sectionLabel`/`position` computeds must branch on `sectionRepeats` (D-22/D-23) — recommended as a new pure `engine/` function, not inline Vue logic, so it's covered by fast Vitest tests like everything else in `engine/`; (3) `engine/toc.ts`'s `tableOfContents()` needs a `sectionRepeats`-aware marking rule (no `✓` inside the loop, D-25) and a reordering pass (loop blocks first, setup blocks last and dimmed, D-24) — both derivable from data already present on `RuntimeStepNode`, no new state; (4) `engine/schema.ts`'s `TextBlockSchema` needs one new optional field for the clickable `⚠` detail (D-32), which — unlike `kind`'s `.default('step')` — needs **no** runtime fallback, because it carries no Zod default.

Every Rules Reference claim in `PROJECT.md`/`CONTEXT.md`'s "four confirmed draft errors" was independently re-verified in this session against `~/Downloads/mc_rulesreference_v17-compressed.pdf` with `pdftotext -layout`, page by page: Villain Phase's 6 official steps (p.45), Round Overview's 10 milestones (p.4), End of Player Phase's steps (p.16), Player Deck exhaustion (p.32), Encounter Deck exhaustion, boost-card eligibility restricted to villain + villainous-keyword minions (p.8), and Expert Mode vs. Heroic Mode (p.28) all match the canonical refs in `02-CONTEXT.md` exactly. This research adds page-precise quotations (not reproduced verbatim in the app, per the legal constraint) that the content-authoring task can cite directly.

**Primary recommendation:** Author the `RONDA` section content and harden `engine/schema.ts`'s repeating-section gate in the same task/commit (never split across a wave boundary), extract the D-22/D-23/D-24/D-25 header/index logic into new pure `engine/` functions rather than inline Vue computeds, and treat D-32's new field as a plain `.optional()` field needing zero runtime fallback.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Round-loop content (JUGADORES/VILLANO steps, `⚠` lines, citations) | Content (`content/marvel-champions.json`) | Engine (`engine/schema.ts` validates) | Pure data; the loop navigator is already built and only reacts to `repeats:true` existing in the data |
| Loop close/reopen, round increment, jump-without-round-mutation | Engine (`engine/navigator.ts`, `engine/expand.ts`) | — | Already implemented and unit-tested against a fixture; this phase only needs it exercised against real content |
| Content-gate hardening (exactly one repeating section) | Engine (`engine/schema.ts`, Node/CI only) | — | `zod` never ships to the browser (T-01-19); this is a build-time/CI concern |
| Header round/phase-relative counter (D-22/D-23) | Engine (new pure function, recommended) | Composable (`useGameSession.ts`, thin wrapper) | Pure derivation from `EngineSession` + `RuntimeStepNode` data — no DOM/Vue needed, should be Vitest-testable like `toc.ts` |
| Index-overlay reordering + no-`✓`-inside-loop rule (D-24/D-25) | Engine (`engine/toc.ts`) | Component (`IndexOverlay.vue` renders `dimmed`/`mark`) | `tableOfContents()` is already pure and already receives `sectionRepeats` per node; extending it keeps TECH-04 (never hardcode against an id) intact |
| Clickable `⚠` modal open/close/focus | Component (new modal component, precedent: `ConfirmDialog.vue`) | Composable (local `ref` for open/closed — ephemeral UI state, not session state) | D-26 already rejected persisting any "where did I jump from" state; the modal's open/closed state is the same category — ephemeral, not persisted |
| Rules verification against Rules Reference v1.7 (CONT-09) | Human review task (explicit plan step, D-36) + CI content gate | Content authoring | D-36 explicitly requires a human-review task in the plan, not just automated re-verification — Phase 1's three real errors were all caught by human review, not by the schema gate |
| `speech` field authoring for round content | Content (`content/marvel-champions.json`) | — | No runtime consumer exists yet (Phase 3 wires TTS); this phase only decides whether to write the field now or defer |

## Standard Stack

No new libraries this phase. All work uses the stack already installed and verified in Phase 1.

### Core (unchanged from Phase 1, re-confirmed present)
| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `^4.4.3` (devDependency only, `engine/schema.ts` only) | Content schema validation in CI | Already the project's only validation layer (T-01-19); this phase extends the existing schema, does not add a new one |
| `vitest` | `^4.1.11` | Engine unit tests | Already running 61 passing tests across 6 files; this phase adds test cases, no new test infra |
| `@vueuse/core`/`@vueuse/nuxt` | `^14.4.0` | `useLocalStorage` (persistence) | Already the only localStorage seam (`usePersistedSession.ts`); no new composable needed for this phase's persistence-adjacent question (see Open Questions) |

**Version verification:** `npm view zod version` / `npm view vitest version` not re-run — `package.json` already pins these and Phase 1 verified them; nothing in this phase's scope changes the dependency graph. Confirmed via `npx vitest run` in this session: 6 test files, 61 tests, all passing on the current `main`-branch checkout before any Phase 2 change.

### Alternatives Considered
None — this phase is scoped to content authoring and extending already-chosen patterns (pure `engine/` functions, thin composable wrappers, hand-rolled Tailwind components). Introducing any new library (e.g., a modal/dialog library for D-32) would contradict `01-UI-SPEC.md`'s explicit "no component library" decision, which this phase's `02-CONTEXT.md` discretion section does not reopen.

**Installation:** none required.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new packages. No `npm install`, no new `dependencies`/`devDependencies` entries. Skip the slopcheck/registry-verification protocol entirely — there is nothing to audit.

## Architecture Patterns

### System flow through the phase's new/changed pieces

```
content/marvel-champions.json (NEW: "ronda" section, repeats:true)
        │  (static import, build-time)
        ▼
engine/schema.ts  ──validateGameDefinition()──▶  CI gate (Vitest, Node-only)
   │  D-37: superRefine flips ">1 fails" to "!==1 fails"
   │  D-32: TextBlockSchema gains one new optional field (no .default())
        │  (raw JSON, no Zod, ships to browser as-is)
        ▼
engine/flatten.ts → engine/expand.ts
   │  repeats:true on "ronda" → loopStartIndex/loopEndIndex now DEFINED
   │  (first time ever — today both are always undefined)
        ▼
engine/navigator.ts  (UNCHANGED — already correct)
   next()/prev()/jumpTo() close/reopen the loop, increment/decrement round,
   never mutate round on a jump
        │
        ▼
engine/toc.ts + NEW engine/header.ts (recommended)
   │  D-22/D-23: per-phase-scoped position INSIDE the loop,
   │             whole-section-scoped position OUTSIDE it (setup, unchanged)
   │  D-24/D-25: reorder blocks + suppress "✓" when sectionRepeats===true
        │  (pure functions, called from the page — never touched by components directly)
        ▼
app/composables/useGameSession.ts  (thin wrapper — computed() calls into engine/header.ts)
        │
        ▼
app/components/AppHeader.vue (UNCHANGED props contract) · IndexOverlay.vue (extended: dimmed) ·
StepScreen.vue (extended: clickable ⚠ + emits open-warning-detail) · NEW WarningDetailModal.vue
```

A reader can trace "author adds a `ronda` section to the JSON" all the way to "tablet shows `RONDA 4 · Villano · 3 de 6`" by following this chain — no step is skipped, and every arrow after `engine/schema.ts` already exists in the codebase except the two `engine/` additions and the two component extensions.

### Pattern 1: Extract per-phase header info into a pure `engine/` function, not an inline Vue `computed`

**What:** Today `useGameSession.ts`'s `sectionLabel` and `position` computeds contain the actual D-11/D-22/D-23 branching logic inline, directly in the Vue composable. This phase's logic (branch on `sectionRepeats`, scope by `phaseId` vs. the whole sequence) is pure data derivation with zero Vue/DOM dependency — exactly the kind of logic the project's own established pattern (`engine/toc.ts`) says belongs in `engine/`, tested with plain Vitest fixtures.

**When to use:** Any time header/index text depends on `EngineSession` + the current `RuntimeStepNode`'s `sectionRepeats`/`phaseId`/`sectionTitle`/`phaseTitle` — i.e., exactly the D-22/D-23 requirement.

**Example (sketch, following the existing `engine/toc.ts` style and comment conventions):**
```typescript
// engine/header.ts (NEW — sketch, not existing code)
// Deriva la etiqueta de sección y la posición relativa de la cabecera (D-11/D-22/D-23).
// Puro: misma entrada -> misma salida. Nunca cablea contra 'ronda' ni ningún id
// concreto (TECH-04) — decide únicamente por node.sectionRepeats.
import type { EngineSession } from './types'

export interface HeaderInfo {
  sectionLabel: string
  position: { current: number, total: number } | null
}

export function describeHeader(session: EngineSession): HeaderInfo | null {
  const node = session.sequence[session.cursor]
  if (!node) return null
  if (node.step.kind === 'summary') {
    return { sectionLabel: node.sectionTitle.toUpperCase(), position: null }
  }

  if (node.sectionRepeats) {
    // D-22: contador relativo a la FASE (JUGADORES o VILLANO), no a la sección.
    const phaseSteps = session.sequence.filter(
      n => n.phaseId === node.phaseId && (n.step.kind ?? 'step') === 'step',
    )
    const index = phaseSteps.findIndex(n => n.runtimeId === node.runtimeId)
    return {
      sectionLabel: `${node.sectionTitle.toUpperCase()} ${session.round} · ${node.phaseTitle}`,
      position: index === -1 ? null : { current: index + 1, total: phaseSteps.length },
    }
  }

  // D-23: sin cambios — contador global de TODA la sección (comportamiento actual).
  const sectionSteps = session.sequence.filter(
    n => (n.step.kind ?? 'step') === 'step',
  )
  const index = sectionSteps.findIndex(n => n.runtimeId === node.runtimeId)
  return {
    sectionLabel: node.sectionTitle.toUpperCase(),
    position: index === -1 ? null : { current: index + 1, total: sectionSteps.length },
  }
}
```

**Critical detail that must not be lost:** the per-phase scope for D-22 must filter by `phaseId`, **not** `sectionId`. The `ronda` section contains two phases (JUGADORES: 4 steps, VILLANO: 6 steps = 10 total). Filtering by `sectionId` would produce `"8 de 10"` while inside VILLANO — wrong. The approved mockup (`RONDA 4 · Villano · 3 de 6`) requires the `6`, which only comes from scoping to `phaseId`.

**A second detail:** `phaseTitle` is used **without** `.toUpperCase()` in the repeating branch (`· Villano`, title case), while `sectionTitle` **is** uppercased (`RONDA`). This means content authors must write the `ronda.jugadores`/`ronda.villano` phase `title` fields in Title Case (`"Jugadores"`, `"Villano"`), unlike the existing all-caps convention used for setup phase titles (`"HÉROES"`, `"ARCHIENEMIGOS"`). This is a data-authoring convention the plan must state explicitly, not something the code can silently correct — flag it in the content-authoring task.

### Pattern 2: `IndexOverlay` reordering + suppressed `✓` are both derivable from `sectionRepeats` already on `RuntimeStepNode`

**What:** `engine/toc.ts`'s `tableOfContents(sequence, cursor)` already receives everything it needs — `flatten.ts` already stamps `sectionRepeats: boolean` onto every `FlatStepNode`/`RuntimeStepNode`. D-24 (reorder: loop blocks first, setup blocks last + dimmed, only when currently inside the loop) and D-25 (no `✓` for rows belonging to a repeating section) are both pure functions of that existing field plus `cursor`.

**When to use:** Exactly this case — extending `tableOfContents()`.

**Example (sketch):**
```typescript
// engine/toc.ts — sketch of the extension, not a full replacement
export interface TocBlock {
  label: string
  steps: TocRow[]
  dimmed: boolean   // NEW — D-24: true only for non-repeating blocks, and only
                     // when the CURRENT node is inside a repeating section
}

export function tableOfContents(sequence: RuntimeStepNode[], cursor: number): TocBlock[] {
  const currentNode = sequence[cursor]
  const insideLoop = currentNode?.sectionRepeats === true

  // ... existing grouping-by-consecutive-phaseId loop, BUT:
  //   mark: node.sectionRepeats
  //     ? (index === cursor ? 'current' : null)   // D-25: never 'done' inside the loop
  //     : (index < cursor ? 'done' : index === cursor ? 'current' : null)  // unchanged

  // ... after grouping, if insideLoop: partition blocks into
  //   repeatingBlocks (their nodes' sectionRepeats===true) and
  //   nonRepeatingBlocks (sectionRepeats===false), and return
  //   [...repeatingBlocks, ...nonRepeatingBlocks.map(b => ({ ...b, dimmed: true }))]
  //   else: return blocks as-is, dimmed:false throughout.
}
```

**Why this stays TECH-04-compliant:** nothing here references `'ronda'`, `'setup'`, or any literal id — the reordering condition is `currentNode.sectionRepeats`, which is exactly the field the schema/flatten layer already derives from `repeats: true` in the authored JSON. Warhammer 40.000's round section would trigger the identical behavior with zero code changes.

**Overlay title caveat:** `app/pages/[game]/index.vue` currently passes `:title="sectionLabel"` to `IndexOverlay`. Once `sectionLabel` becomes the fully composed `"RONDA 4 · Villano"` string (Pattern 1), reusing it verbatim as the overlay's title bar text would show that whole composed string instead of a plain `"RONDA"` label matching the setup case's plain `"PREPARACIÓN"` title. Decide explicitly whether `IndexOverlay` needs its own plain-section-name prop (e.g., `node.sectionTitle.toUpperCase()` directly, not routed through the header's composed label) — this is a two-line fix but easy to silently get wrong by reusing the header prop unchanged.

### Pattern 3: The new `⚠` detail field needs **no** runtime fallback (unlike `kind`)

**What:** `useGameSession.ts` already documents (WR-01) why `kind` needs a `?? 'step'` fallback at runtime: `kind: z.enum(['step', 'summary']).default('step')` applies its `.default()` only when content passes through `validateGameDefinition()` in Node/Vitest — the browser receives the raw JSON file directly, un-parsed by Zod, so a step that omits `kind` relying on the schema default would arrive in the browser as `kind: undefined` unless the same fallback is replicated in `app/`.

**Why this doesn't apply to D-32's new field:** a plain `.optional()` field (no `.default()`) is `undefined` when absent **in both** the Node-validated and the raw-browser-JSON cases — there is no divergence to guard against. Adding a defensive `?? someDefault` for this field would be unnecessary code solving a problem that doesn't exist for optional-without-default fields.

**Example:**
```typescript
// engine/schema.ts — sketch of the D-32 addition to TextBlockSchema
const TextBlockSchema = z.object({
  text: z.string().min(1).max(90),
  warning: z.string().max(60).optional(),
  warningDetail: z.string().optional(), // NEW (D-32) — no .default(), no runtime fallback needed
  speech: z.string().optional(),
})
```

Recommended field name: `warningDetail` (scoped explicitly to the `warning` line), not `detail` — the codebase's existing comment in `schema.ts` (`// NO "detail" — línea de aviso de trampa (D-05)`) already rejected a general-purpose `detail` field in Phase 1 for a different, broader idea (an always-visible "¿Por qué?" elaboration on every step). Reusing the name `detail` for D-32's much narrower, `warning`-gated field risks confusing future readers into thinking Phase 1's rejected idea was resurrected. `warningDetail` also self-documents the validation rule below.

**Validation rule worth adding to the schema or the content-test gate:** a step should not declare `warningDetail` without also declaring `warning` (D-32: "Un `⚠` sin ese campo no es clicable" implies the inverse constraint too — a detail with no visible `⚠` trigger is unreachable UI). Add either a `StepSchema.superRefine` check or a `content.test.ts` assertion mirroring the existing "gate that bites" pattern (see the 120-character mutation test at the end of `content.test.ts`).

**`resolveText()` must also merge the new field per difficulty variant**, since it's added to `TextBlockSchema` (which `variants.difficulty` already wraps):
```typescript
// engine/resolve.ts — one line added
export function resolveText(node: RuntimeStepNode, context: SessionContext): TextBlock {
  const variant = node.step.variants?.difficulty?.[context.difficulty]
  return {
    text: variant?.text ?? node.step.text,
    warning: variant?.warning ?? node.step.warning,
    warningDetail: variant?.warningDetail ?? node.step.warningDetail, // NEW
    speech: variant?.speech ?? node.step.speech,
  }
}
```

### Pattern 4: `StepScreen.vue`'s `⚠` line becomes conditionally clickable, `ConfirmDialog.vue` is the closest precedent for the new modal

**What:** `StepScreen.vue` currently renders the warning as a plain, non-interactive `<p>`. D-32 requires it to become a `<button>` (clickable, with proper `aria` semantics) **only** when `warningDetail` is present on the resolved text block — "sin afordancia falsa" when it's absent.

**Example (contract sketch, not full component code):**
```vue
<!-- StepScreen.vue — sketch of the prop/emit contract change -->
<script setup lang="ts">
defineProps<{
  actionText: string
  warningText: string | null
  warningDetailText: string | null   // NEW — null means "not clickable"
}>()
const emit = defineEmits<{ 'open-warning-detail': [] }>()
</script>
<template>
  <!-- ... -->
  <button
    v-if="warningText && warningDetailText"
    type="button"
    class="text-body font-normal text-warning"
    @click="emit('open-warning-detail')"
  >⚠ {{ warningText }}</button>
  <p v-else-if="warningText" class="text-body font-normal text-warning">⚠ {{ warningText }}</p>
</template>
```

`ConfirmDialog.vue` is the closest existing precedent (a centered, `role="dialog" aria-modal="true"` overlay component with a fixed-size body and buttons in the bottom band) but has two buttons (confirm/cancel, one destructive). D-32's modal is purely informational with "se cierra fácilmente" — a single dismiss action, not a confirm/cancel pair. Recommend either a new minimal single-button component (e.g. `WarningDetailModal.vue`) reusing `ConfirmDialog`'s visual chrome (`role="dialog"`, `fixed inset-0 z-50`, same padding/typography tokens) or extending `ConfirmDialog` with an optional single-button "info" mode. This is exactly the kind of new-surface UI decision `02-CONTEXT.md`'s discretion section flags for `/gsd:ui-phase 2` — research recommends treating it there rather than guessing tap-target sizing, focus trapping, and dismiss affordance (tap outside? explicit close button? both?) without a UI spec pass, since `01-UI-SPEC.md` covers none of this new surface.

### Anti-Patterns to Avoid
- **Re-litigating `perPlayer`/`branches[]`/a third "fin de ronda" phase/a "volver a la ronda" button:** all four are explicitly rejected by D-20, D-33, D-34, D-26 respectively. Any plan or code that reintroduces them contradicts locked decisions.
- **Scoping D-22's per-phase position filter by `sectionId` instead of `phaseId`:** produces the wrong denominator (`"de 10"` instead of `"de 6"`). See Pattern 1.
- **Adding a runtime `?? fallback` for the new `warningDetail` field:** unnecessary — see Pattern 3. Only fields with a Zod `.default()` (currently only `kind`) need that pattern.
- **Hardcoding the reordering/dimming condition against the id `'ronda'`:** violates TECH-04 and D-24's explicit instruction ("nunca cablearse contra el id `ronda`"). Use `sectionRepeats` only.
- **Tightening `engine/schema.ts`'s repeating-section gate before the `ronda` content exists in the same change:** breaks `content.test.ts`'s `validateGameDefinition(rawMarvelChampions)` assertion immediately, since today's content has zero repeating sections. See Common Pitfalls.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loop closing/reopening, round increment/decrement | A new state machine, a new "isLastStep" check, a new round-tracking `ref` | `engine/navigator.ts`'s existing `next`/`prev` — already correct, already tested against a fixture with a repeating section | The exact logic this phase needs (wrap at `loopEndIndex`, unwrap at `loopStartIndex`, never touch `round` on `jumpTo`) is already implemented and matches `ARCHITECTURE.md §1`'s pseudocode verbatim |
| Per-phase / per-section position counters | A second navigator, a `computed` chain duplicated per screen | One new pure `engine/header.ts` function (Pattern 1), consumed by both the composable's `sectionLabel`/`position` and by `savedSummary` in the page | A single source of truth avoids the header, the index overlay title, and the resume-prompt summary drifting out of sync — they already share the same composable computeds today |
| Detecting "is the cursor currently inside the loop" | A boolean tracked in `EngineSession` | `sequence[cursor].sectionRepeats` (already present) | No new state to keep in sync with `cursor`; it's already derived per-node by `flatten.ts` |
| Rules content correctness | Trusting the AI-authored draft or a single automated re-check | The explicit human-review task (D-36) plus the existing CI content gate pattern (`content.test.ts`'s hardcoded-count assertions) | Phase 1's three real fidelity errors were all caught by human review, not by schema validation or automated re-verification — the schema gate catches *malformed* content, not *incorrect* content |

**Key insight:** almost nothing in this phase should be new engine machinery. The single biggest risk is treating this as a "build the loop" phase when the loop is already built — the actual risk surface is (a) content accuracy against the Rules Reference, and (b) getting the two data-derived UI branches (D-22/D-23 header, D-24/D-25 index) exactly right on the first pass, since both are easy to get subtly wrong (see Common Pitfalls) in ways that unit tests would catch immediately if written before the UI wiring.

## Common Pitfalls

### Pitfall 1: Hardening the CI content gate (D-37) before authoring the `ronda` section breaks the build

**What goes wrong:** `engine/schema.ts`'s `superRefine` currently fails only when `repeating.length > 1`. Today's `content/marvel-champions.json` has `repeating.length === 0` (only `setup`, `repeats:false`) — that passes both the old and a naive first attempt at the new rule if done in the wrong order. If the gate is tightened to `!== 1` in a commit that does **not** also add the `ronda` section, `content.test.ts`'s very first test (`'valida contra GameDefinitionSchema'`, which calls `validateGameDefinition(rawMarvelChampions)`) starts throwing immediately, and CI goes red.

**Why it happens:** the schema change and the content change are naturally two different "kinds" of work (engine vs. content) that a planner might be tempted to split into separate tasks or waves for parallelism.

**How to avoid:** land the `superRefine` change and the `ronda` section's first pass (even a minimal placeholder version, if content is refined in a later task) in the same task, or explicitly sequence the content-authoring task before the schema-hardening task within the same wave, never split across a wave boundary that could leave `main` red.

**Warning signs:** `npx vitest run` failing on `content.test.ts`'s schema-validation test after a schema-only commit.

### Pitfall 2: `engine/schema.test.ts` has an existing test that directly contradicts D-37 and must be inverted, not just left alone

**What goes wrong:** `engine/__tests__/schema.test.ts` contains a test literally named `'NO lanza con cero secciones repeats:true'` that asserts `expect(() => GameDefinitionSchema.parse(game)).not.toThrow()` for a game with zero repeating sections. After D-37's hardening, a game with zero repeating sections **must** throw. If this test is not updated, it will fail the moment the schema change lands — but more subtly, if the schema change is written in a way that only checks `> 1` still (an easy copy-paste-preserving mistake), this existing test will keep passing and mask the fact that the hardening never actually happened.

**Why it happens:** the existing test was written correctly for Phase 1's relaxed invariant; nothing forces it to be revisited just because `schema.ts`'s comment says `TODO(fase 2)`.

**How to avoid:** explicitly include "invert `schema.test.ts`'s zero-repeating-sections test to expect a throw" as a task/verification step, not just "hardened the superRefine."

**Warning signs:** `npx vitest run` shows 61 (or however many) tests still passing after the schema change with no visible diff to `schema.test.ts` — a strong signal the old test wasn't touched.

### Pitfall 3: One-player-per-step granularity (PITFALLS.md §63) is deliberately overridden by D-20 — do not "fix" it during planning or content authoring

**What goes wrong:** `PITFALLS.md`'s general guidance for step-granularity design explicitly recommends "El villano activa contra [Jugador]" as a separate step per player, in player order. A planner or content author unfamiliar with `02-CONTEXT.md` might "correct" the round content toward that general guidance, silently reintroducing `perPlayer` expansion logic into `engine/expand.ts` (which today explicitly does not support it — see its header comment: "No expande por jugador: no existe `perPlayer`").

**Why it happens:** the general pitfall guidance and the project's actual decision are in direct, acknowledged tension — `02-CONTEXT.md` D-20 states this explicitly ("Esto contradice conscientemente la recomendación de PITFALLS.md:63... la contradicción está evaluada y resuelta, no pasada por alto").

**How to avoid:** author "Los enemigos activan" as one collective plural step per D-21, backed by a `⚠` recount line ("Uno por jugador, en orden de jugador — sin saltarse a nadie"), and do not touch `engine/expand.ts`.

### Pitfall 4: Reusing `sectionLabel` verbatim as `IndexOverlay`'s `title` prop once it becomes the composed D-22 string

Covered in Pattern 2's "Overlay title caveat" above — restated here because it's easy to miss if the `IndexOverlay` prop wiring in `app/pages/[game]/index.vue` isn't revisited when `sectionLabel`'s formula changes.

### Pitfall 5: Content author writes `ronda`'s phase titles in the existing all-caps convention

Covered in Pattern 1 — the mockup's `"· Villano"` (title case) requires the phase's authored `title` field to be `"Villano"`/`"Jugadores"`, not `"VILLANO"`/`"JUGADORES"` like every existing setup phase title. Since `sectionLabel`'s formula does not apply `.toUpperCase()` to `phaseTitle` in the repeating-section branch, an all-caps-authored phase title would render as `RONDA 4 · VILLANO` — visually inconsistent with the approved mockup.

### Pitfall 6: Hardcoded-exact-count content tests will fail the moment round content is added — this is intentional, not a regression

**What goes wrong:** `content.test.ts` has tests like `'exactamente 3 pasos declaran warning (D-05)'` and `'exactamente 2 pasos declaran variants.difficulty'` with hardcoded id lists. The moment the `ronda` section adds any step with a `warning` or a `variants.difficulty`, these tests fail by design.

**Why it happens:** this is the project's own established "gate that bites" pattern from Phase 1 — a deliberate, tight assertion that must be consciously updated whenever content changes, not a loose regex that silently tolerates drift.

**How to avoid:** budget explicit task time to update these exact-count assertions (and add equivalent ones for the new content: exact JUGADORES/VILLANO step counts, exact `warning` count including the round's new `⚠` lines, exact `warningDetail` count, the specific "una o más por identidad"-style content-correctness assertions for each of the four confirmed rule fixes) rather than treating a red `content.test.ts` as a bug introduced by the content authoring.

### Pitfall 7: TTS/voice-related pitfalls from `STACK.md`/`PITFALLS.md` do not apply to this phase's `speech` field decision

`STACK.md`'s Web Speech gotchas (Safari gesture requirement, `getVoices()` async loading, Android voice-pack gaps) are all about **consuming** `speech` at runtime — irrelevant to Phase 2, which only decides whether to **author** the field now. Do not let TTS platform risk influence the authoring decision; the only real trade-off is authoring cost now (blind, unverifiable against a real device) vs. authoring cost later (batched, ~34 steps at once, per `02-CONTEXT.md`'s discretion note). See Assumptions Log.

## Code Examples

See Architecture Patterns 1-4 above for the four concrete sketches (per-phase header derivation, `toc.ts` reordering, schema field addition, `StepScreen.vue` clickable-warning contract). All are sketches consistent with the existing codebase's exact style and comment conventions, not copy-paste-ready final code — the planner/executor should write the real versions against the actual current file contents.

### Existing test fixture already has a repeating section — no fixture change needed for D-37

`engine/__tests__/fixtures/tiny-game.json` (used by `navigator.test.ts`, `toc.test.ts`) already contains a section `"loop"` with `"repeats": true` alongside `"intro"` with `"repeats": false` — i.e., it already satisfies the tightened "exactly one repeating section" rule. `02-CONTEXT.md`'s discretion note flagging "revisar tiny-game.json, que puede no tener sección repetitiva" is resolved: **it does have one.** No fixture change is required for D-37; only `schema.test.ts`'s inline test-case games (built with `baseGame()` + manual section pushes) need the assertion inversion described in Pitfall 2.

### Rules Reference quotations for content authoring (paraphrase in the app, cite here for the author)

Extracted directly with `pdftotext -layout ~/Downloads/mc_rulesreference_v17-compressed.pdf` in this session — page numbers below are the PDF's own printed page numbers (confirmed against the footer text, not the PDF viewer's page index), and match `02-CONTEXT.md`'s canonical refs exactly:

- **Villain Phase, p.45** — six steps, verbatim structure (do not reproduce this wording in the app; write original short imperative Spanish per D-31): 1) Place Threat (main scheme's acceleration field + active acceleration icons/tokens); 2) Enemies Activate (in player order: villain activates against player, then each engaged minion activates in that player's chosen order); 3) Deal Encounter Cards (one per player + one per hazard icon in play, dealt in player order); 4) Reveal Encounter Cards (first player reveals theirs one at a time in dealt order, then each player in turn); 5) Pass First Player Token (to the next clockwise player); 6) End of Villain Phase and Round (until-end-of-phase/round effects end; when/after-phase/round-ends effects resolve).
- **Round Overview, p.4** — 10 milestones confirming the two-phase, no-third-phase structure D-34 requires: 1 Player phase begins, 2 each player takes a turn, 3 Player phase ends, 4 Villain phase begins, 5 Place threat, 6 Villain/minions activate, 7 Deal encounter cards, 8 Reveal/resolve encounter cards, 9 Pass first player token, 10 End the round → proceed to step 1 of the next round.
- **End of Player Phase, p.16** — 5 steps: 1) in player order, discard any number, must discard down to hand size; 2) simultaneously draw up to hand size; 3) simultaneously ready all cards (including exhausted encounter cards); 4) until-end-of-phase effects end; 5) when/after-phase-ends effects resolve. Matches D-27's 4-step player-phase authoring (turns, descartar, robar, enderezar) plus D-28's "steps 4/5 become a `⚠` on the enderezar step" decision.
- **Player Deck, p.32** — if a player's deck empties, that player shuffles their discard pile into a new deck and **immediately deals themself one facedown encounter card from the top of the encounter deck**; if the deck empties with an empty discard pile too, it does not reset until at least one card exists in the discard pile, then the facedown-encounter-card deal happens. Matches D-30's authored consequence exactly.
- **Encounter Deck** (glossary entry, unpaginated in extraction but confirmed present) — if the encounter deck is empty, the encounter discard pile is immediately shuffled into a new deck, **and an acceleration token is placed next to the main scheme deck**. Matches D-30's second (distinct, global/permanent) consequence exactly.
- **Boost cards / who draws them, p.8** — "If a villain, or a minion with the villainous keyword, is attacking, give it one facedown boost card... (If a minion without the villainous keyword is attacking, skip this step.)" — confirms the confirmed draft error: **only** villain + villainous-keyword minions draw boost cards, not all minions.
- **Modes of Play, p.28** — Expert Mode: "follow the content and setup instructions for the chosen scenario, using the listed expert mode villain stages, and add the Expert encounter set to the encounter deck" — no mention of villain-phase step structure. Heroic Mode: "during step three of each villain phase, deal X additional encounter cards to each player, where X is the chosen heroic level" — Heroic Mode is the one that touches villain-phase *quantities* (not structure), confirming the fourth draft error (Expert ≠ structural change; that's conflated with Heroic).
- **Stunned, p.~41** — "Stun is a status that cancels a character's next attack... If a stunned identity or ally attempts to attack... discard the stunned card instead." **Confused, p.~13** — same pattern for scheme/thwart. **Tough, p.42** — "prevents a character from taking damage... discard a tough status card from that character instead [of taking damage]." All three are printed on the physical status cards, consistent with D-31's "recordar mirar, no explicar" principle — the app's `⚠` should say "Atentos a los Estados en los personajes," not restate any of this text.

## State of the Art

| Old (borrador) | Corrected (Rules Reference v1.7) | Verified at | Impact |
|--------------|------------------|--------------|--------|
| Fase del villano: 4 pasos | 6 pasos oficiales (Place Threat, Enemies Activate, Deal, Reveal, Pass First Player Token, End of Villain Phase and Round) | p.45, this session | CONT-03, success criterion 1; drives the 6-step VILLANO phase authoring and the `"3 de 6"` denominator |
| Obligaciones: una por jugador | Una o más por identidad | p.29 (glossary, existing setup.encuentros.04 citation, unchanged from Phase 1) | Already fixed in setup content; round content must not reintroduce the "por jugador" framing anywhere |
| Todos los esbirros roban cartas de aumento | Solo el villano y los esbirros con palabra clave Villano (villainous keyword) | p.8, this session | CONT-09's fourth confirmed error; affects the "los enemigos activan" step's `⚠` wording if it mentions boost cards at all |
| Modo Experto altera la estructura de la fase del villano | Modo Experto solo cambia etapas de villano + añade el conjunto Experto; Modo Heroico (eje aparte) añade cartas de encuentro extra en el paso 3 | p.28, this session | CONT-09's fourth confirmed error; round content must not gate any villain-phase *step* on difficulty — only the general setup-side `variants.difficulty` pattern already used for non-structural text, if used at all in round content |

**Not deprecated, still current:** the entire `engine/` architecture from Phase 1 (`flatten`/`expand`/`navigator`/`resolve`/`persistence`/`toc`). Nothing here needs replacing — it needs exercising against real content for the first time.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Authoring `speech` for the round content now (rather than deferring to Phase 3) is net-positive, because ~10 new round steps plus the existing 24 setup steps means Phase 3 would otherwise face authoring ~34 short TTS lines in one batch, vs. incrementally now | Summary / Pitfall 7 | If wrong: writing `speech` now costs authoring time this phase for a field with zero runtime consumer until Phase 3, and once real-device TTS testing happens in Phase 3 (target tablet still unknown per `STATE.md`'s blocker), some or all of these lines may need rewriting anyway — meaning the "expensive to retrofit" framing from `ROADMAP.md` could be partially moot if revision cost ≈ origination cost. This is a product-scope trade-off, not a verified technical fact — the planner must decide explicitly, as `02-CONTEXT.md` already states |
| A2 | The new D-32 field should be named `warningDetail`, distinct from Phase 1's rejected general-purpose `detail` field | Pattern 3 | Low risk — a naming choice, easily renamed later since it's a fresh field with no existing consumers. Flagged only because the schema.ts comment history makes `detail` a specifically loaded, previously-rejected name |
| A3 | `IndexOverlay`'s `title` prop needs its own plain-section-name source, distinct from the header's composed `sectionLabel`, once D-22 changes `sectionLabel`'s formula | Pattern 2 | Low-medium risk — if not addressed, the overlay's title bar shows `"RONDA 4 · Villano"` instead of a plain `"RONDA"` while inside the loop; a cosmetic inconsistency, not a functional break, but visible on every loop-phase index-overlay open |
| A4 | A new single-dismiss-button modal component (not `ConfirmDialog.vue` reused as-is) is the right shape for D-32's `⚠` detail modal | Pattern 4 | Low risk — either approach (new component or extended `ConfirmDialog`) satisfies D-32's functional requirement; this is a UI-implementation-shape preference, explicitly deferred to `/gsd:ui-phase 2` per `02-CONTEXT.md`'s own discretion note |

**None of these are compliance, retention, or security-critical** — all four are either a product trade-off already flagged as the planner's explicit decision in `02-CONTEXT.md`, or a low-risk naming/shape preference easily revised.

## Open Questions (RESUELTAS EN PLANIFICACION)

> **Retro-anotado el 2026-08-29 durante `/gsd:plan-phase 2`.** Las tres preguntas
> abiertas de esta seccion quedaron cerradas antes de ejecutar: la 1 y la 3 por el
> planner en los propios PLAN.md (bloques `<decisions_closed_here>`), y la 2 por
> `02-UI-SPEC.md`. Se conservan aqui con su razonamiento original para que se vea
> de donde salio cada decision; la resolucion va anotada bajo cada una.

1. **Should the `speech` field decision (A1) be made per-step or as a phase-wide policy?**
   - What we know: the field exists in the schema since Phase 1, zero steps use it today, and `02-CONTEXT.md` explicitly defers the decision to planning.
   - What's unclear: whether "author it now" means every one of the ~10 new round steps gets a `speech` override, or only the ones where `text` (already ≤90 chars, imperative, plural) would read awkwardly aloud as-is.
   - Recommendation: decide as a phase-wide policy in the plan (not per-step ad hoc), and if the decision is "yes, author now," default to omitting `speech` when `text` already reads naturally as a spoken sentence — reserve explicit `speech` overrides for steps where the on-screen text is not TTS-friendly (e.g., a formula shown as-is, per D-07/ADAPT-03, would need a spoken paraphrase since Web Speech cannot sensibly read `"× nº de jugadores"` aloud).
   - **RESUELTA — DC-1 (`02-01-PLAN.md`): se autora `speech` AHORA, como politica de fase, en los 10 pasos de la ronda**, con tope ≤120 caracteres cableado en el esquema. La preparacion sigue deliberadamente sin `speech` (es trabajo de la Fase 3). El planner descarto la recomendacion de «solo donde haga falta» por una razon concreta: es un juicio que un ejecutor resuelve como «nunca», y entonces la Fase 3 heredaria ~45 pasos que locutar de golpe — exactamente lo que el `ROADMAP.md` dice que hay que evitar.

2. **Exact character budget for `warningDetail`'s modal content — not established by `01-UI-SPEC.md`.**
   - What we know: `text` is capped at 90 chars, `warning` at 60 — both hard UI-SPEC budgets. The modal is new surface `01-UI-SPEC.md` never covered.
   - What's unclear: whether a Zod `.max()` cap should exist on `warningDetail` at all, and if so what value, or whether it should be an unbounded free-text field sized generously for a short paragraph (the D-30 authored consequences — e.g. the villain-defeat procedure — run to 2-3 sentences).
   - Recommendation: resolve via `/gsd:ui-phase 2` as `02-CONTEXT.md` itself suggests, rather than guessing a number here; content authoring can proceed once a budget exists, but should not block on it if the plan sequences UI-spec work first.
   - **RESUELTA — `02-UI-SPEC.md` (generado por `/gsd:ui-phase 2` antes de planificar, como recomendaba esta pregunta): `warningDetail` ≤ 320 caracteres, cap en Zod (`.max(320)`).** El numero sale del peor caso real: el procedimiento de cambio de fase del villano (D-30), que ronda los 250 caracteres. Si el campo existe pero no hay `warning`, el `superRefine` de raiz lo rechaza (DC-8).

3. **Does REF-01/REQUIREMENTS.md/ROADMAP.md documentation debt (D-32's "deuda de alcance a saldar") get its own task in this phase's plan, or land as a housekeeping edit alongside another task?**
   - What we know: `02-CONTEXT.md` explicitly states the `ROADMAP.md`/`REQUIREMENTS.md` scope-debt from adding the clickable-`⚠`-modal surface must be reflected somewhere, and that it wasn't accounted for when those documents were written.
   - What's unclear: whether this needs a dedicated plan task or is folded into the D-32 implementation task's file list.
   - Recommendation: fold it into the same task that implements the modal, since it's a small, mechanical documentation update (updating the phase 2 roadmap description and possibly adding a v1-scoped requirement id), not independent work.
   - **RESUELTA — `02-03-PLAN.md` Tarea 3: se pliega a la tarea del modal, como recomendaba esta pregunta.** Actualiza `ROADMAP.md`, `REQUIREMENTS.md` (con un `UI-09` nuevo de alcance v1) y `PROJECT.md` — este ultimo para acotar la linea de Out of Scope «Pantalla de consulta de reglas», que D-32 contradecia en silencio. REF-01/REF-02 siguen en v2 sin promocionar.

## Environment Availability

No new external dependencies. This phase's only "external tool" is `pdftotext`, used purely as a research/verification aid against the local Rules Reference PDF — it is not a runtime or build dependency of the app.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `pdftotext` (poppler) | CONT-09 human-review task (D-36) — re-verifying content against the PDF during content authoring | ✓ (confirmed this session: `/opt/homebrew/bin/pdftotext`) | not queried | Manual PDF reading in a viewer if unavailable — not a blocker either way, since it's a research aid, not a build step |
| `~/Downloads/mc_rulesreference_v17-compressed.pdf` | CONT-09 (source of truth) | ✓ (confirmed present, 3.6MB) | v1.7 | — |
| `~/Downloads/Marvel-Champions_aprende_a_jugar.pdf` | Narrative-order cross-reference only (Rules Reference wins on conflict per D-36/canonical refs) | ✓ (confirmed present, 32MB) | — | Not needed if Rules Reference alone answers a question, as it did for every claim checked in this session |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — everything needed is already present.

## Security Domain

`security_enforcement` is absent from `.planning/config.json`'s `workflow` block, which per policy means enabled by default. This phase, however, touches no new attack surface beyond what Phase 1 already established and mitigated.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No accounts, no backend (TECH-01) — out of scope for the whole project |
| V3 Session Management | No | "Session" here means `EngineSession` (in-memory step-engine state), not an auth session; no cookies, no tokens |
| V4 Access Control | No | Single-tablet, single-group, no multi-tenant data |
| V5 Input Validation | Yes | `engine/schema.ts`'s Zod `GameDefinitionSchema`, extended this phase with the new `warningDetail` field and the tightened repeating-section invariant — validates content at build/CI time (T-01-02), never at runtime in the browser |
| V6 Cryptography | No | No secrets, no crypto in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Reflected/stored XSS via game content rendered as HTML | Tampering / Elevation of Privilege | Already established project-wide rule (T-01-01, re-confirmed in `StepScreen.vue`'s comment): **all** content — including the new `warningDetail` modal body — renders via Vue text interpolation (`{{ }}`), never `v-html`. This phase's new modal component must follow the identical rule; no new templating pattern is introduced |
| Malformed content silently reaching the tablet | Tampering | `engine/schema.ts`'s CI gate (T-01-02/TECH-02), extended this phase — a step declaring `warningDetail` with an inconsistent/missing `warning`, or a game with the wrong repeating-section count, fails the build before it ships |
| `localStorage` tampering (a user or extension edits saved JSON) | Tampering | Already handled by `usePersistedSession.ts`'s `isPersistedPosition()` full-shape validation and `engine/persistence.ts`'s conservative `contentChangedFallback` — this phase adds no new persisted fields (round-loop position already round-trips through the existing `PersistedPosition` shape: `runtimeId` + `round`) |

No new threat surface: this phase's only new persisted-adjacent behavior (round number becoming visible sooner, in the resume prompt) is a display change, not a new data path — see the Architecture Patterns discussion of `savedSummary`.

## Sources

### Primary (HIGH confidence)
- `~/Downloads/mc_rulesreference_v17-compressed.pdf`, read via `pdftotext -layout` in this session (whole document, plus targeted `-f`/`-l` page extractions to confirm printed page numbers) — Villain Phase (p.45), Round Overview (p.4), End of Player Phase (p.16), Player Deck (p.32), Encounter Deck (unpaginated glossary entry, confirmed present), Boost card eligibility (p.8), Modes of Play / Expert vs. Heroic (p.28), Stunned/Confused/Tough status definitions
- Direct reads of `engine/schema.ts`, `engine/types.ts`, `engine/flatten.ts`, `engine/expand.ts`, `engine/navigator.ts`, `engine/resolve.ts`, `engine/persistence.ts`, `engine/toc.ts`, and all six `engine/__tests__/*.test.ts` files in this session
- Direct reads of `app/composables/useGameSession.ts`, `app/composables/usePersistedSession.ts`, `app/pages/[game]/index.vue`, and all six Phase-1 components in this session
- `npx vitest run` executed in this session: 6 test files, 61 tests, all passing on the pre-Phase-2 checkout — confirms the baseline this phase extends

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`, `.planning/research/STACK.md` — Phase 1 research, re-read for continuity; all claims cross-checked against the actual current code (some diverged slightly from the original architecture sketch, e.g. `TextBlock` dropped `detail` in favor of `warning` during Phase 1 — noted where relevant)

### Tertiary (LOW confidence)
- None used unverified in this research — no WebSearch was needed; every claim was either read directly from local code/files or extracted directly from the local PDF.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing versions already verified in Phase 1 and confirmed still installed/passing via `npx vitest run`
- Architecture: HIGH — all patterns derived from reading actual current source files, not from the (partially superseded) `ARCHITECTURE.md` sketch
- Rules content (CONT-09): HIGH — every claim independently re-verified against the source PDF with page numbers in this session, not taken on faith from `02-CONTEXT.md`'s canonical refs (though all matched exactly)
- Pitfalls: HIGH — all seven pitfalls are either directly observed in the current test/schema code (Pitfalls 1, 2, 5, 6) or directly quoted from `02-CONTEXT.md`'s own explicit decisions (Pitfalls 3, 4) or cross-referenced against `STACK.md` (Pitfall 7)

**Research date:** 2026-08-29
**Valid until:** No expiry driver identified — this research is tied to the current state of `engine/`/`app/`/`content/` in this repo, not to any external, time-sensitive API or library version. Re-research only if the Phase 2 plan is deferred long enough for Phase 1's code to be substantially refactored first.
