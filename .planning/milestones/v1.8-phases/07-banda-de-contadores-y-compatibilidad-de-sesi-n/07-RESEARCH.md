# Phase 7: Banda de contadores y compatibilidad de sesión - Research

**Researched:** 2026-09-08
**Domain:** Vue 3 / Nuxt 4 client-only state extension (engine pure-function mutators + one new dumb component) + localStorage backward-compatibility testing. No new runtime dependency, no network, no backend.
**Confidence:** HIGH — every claim below is either read directly from this repo's source (`engine/`, `app/`) or copied verbatim from the already-locked `07-CONTEXT.md`/`07-UI-SPEC.md`. No ecosystem/library unknowns remain; the only residual uncertainty is real-device touch behavior, which is out of this phase's control (tablet model still unidentified, per `STATE.md`).

<user_constraints>
## User Constraints (from CONTEXT.md)

`07-CONTEXT.md` contains 22 locked decisions (D-01..D-22), gathered 2026-09-08, status "Ready for planning." The planner MUST honor all of them; none is open for re-litigation.

### Locked Decisions (D-01..D-22, copied from `07-CONTEXT.md` `<decisions>`)

**Presupuesto de altura y anatomía de la banda**
- **D-01 (decidido ANTES de construir):** La banda es un cuarto hijo flex `shrink-0` de altura fija `h-24` (96px), exactamente el mismo patrón y la misma altura que `NavBand.vue`. En tablet apaisada de 768px de alto eso son 12,5%. `StepScreen` sigue siendo el único `flex-1`. **Prohibido** que la banda lleve `flex-1` o quede sin tope de altura.
- **D-02:** Anatomía de cada celda: etiqueta encima (18px, `text-label`) y `▼ número ▲` en una sola línea, número a `text-display` (40px). Los `▼`/`▲` son zonas pulsables de los 96px completos de alto.
- **D-03:** La banda va arriba, justo bajo `AppHeader`, no encima de `NavBand` (evita el toque accidental cerca de SIGUIENTE). Orden final: `AppHeader` (h-16) → banda (h-24) → `StepScreen` (flex-1) → `NavBand` (h-24).
- **D-04:** La etiqueta de cada celda de jugador es el nombre del jugador; vacío → «Jugador N»; reutiliza `PLAYER_NAME_MAX_LENGTH` de `engine/selection.ts` (14), nunca otra cifra. Celda del villano: «VILLANO» fija. Descartado «Ana · Thor» (trunca) y el nombre del héroe como etiqueta.
- **D-05 (ancho estrecho):** Cuando el ancho no da para las celdas, la banda se parte en dos filas: villano arriba (h-24), jugadores abajo (h-24) = 192px. El número se mantiene a 40px en cualquier ancho.
- **D-06 (interpretación vinculante de HP-02):** El presupuesto ~15% se mide SOLO en tablet apaisada (el "viewport objetivo" que HP-02 nombra y que fija `CLAUDE.md`). Los 192px de D-05 en viewport estrecho NO son incumplimiento de HP-02. La verificación humana comprueba (a) 12,5% en apaisado y (b) dos filas en estrecho.

**Cuándo se ve la banda**
- **D-07:** La banda se ve solo durante el bucle de rondas, derivado de `section.repeats === true`, nunca del id `ronda` (TECH-04). «Durante la partida» de HP-01 = «durante el bucle de rondas».
- **D-08:** La banda no se puede plegar ni ocultar a mano. Nada nuevo en la cabecera.

**Valores: precarga, cambios y ausencia de dato**
- **D-09 (modelo de datos de la fase — HP-05/HP-08):** Un contador vale `null` mientras nadie haya pulsado ▼/▲; la banda pinta en su lugar el valor calculado en vivo desde catálogo+selección+nºjugadores+dificultad. El primer toque congela un número concreto.
- **D-10 (cierre del diferido de la Fase 6):** Si se cambia el héroe de un jugador a media ronda y su contador ya estaba tocado, se queda con la cifra que tenía, sin avisar ni preguntar.
- **D-11 (límite de alcance):** La precarga es la etapa I y nada más. La banda no sabe de etapas, no ofrece cambiarlas, no reacciona al villano llegando a 0. Descartado el salto automático de etapa.
- **D-12 (sin dato conocido, estado normal de SEL-09):** Una celda sin valor conocido muestra «—» (mismo símbolo que la rejilla de la Fase 6). ▲ arranca en 1; ▼ sobre «—» no hace nada. Regla dura: «—» NO es 0 — tratar `null`/sin-valor y `0` como estados distintos, nunca colapsarlos.

**Cifras de referencia (verificadas contra `content/marvel-characters.json`):** `difficulty` es `'normal'|'expert'`. `healthPerHero` true en 8/9 etapas (Kang II=18 es plana); `healthPerGroup` false en las nueve. Etapa I × 3 jugadores: Rhino 14×3=42, Kang normal 12×3=36, Kang experto 15×3=45, Ultron 17×3=51. Vida de héroe es cifra plana sin multiplicar (Thor 14, Iron Man 9, She-Hulk 15). `expert` se usa cuando `difficulty==='expert'` y la etapa lo trae; su ausencia (Rhino, Ultron) es un hecho del dominio, no un dato pendiente.

**Gestos del contador**
- **D-13 (HP-04/HP-10):** Un toque = ±1. NO hay repetición al mantener pulsado. Descartado repetición con tope duro y toque largo = ±5.
- **D-14 (regla dura de eventos, PITFALLS.md §13):** Cada ▼/▲ reutiliza literalmente el patrón de `NavBand.vue`: estado visual de pulsado en `@touchstart`/`@touchend`/`@mousedown`/`@mouseup` (ref con `scale-[0.98] brightness-95 transition-transform duration-75`), y la acción va SOLO en `@click`. Prohibido incrementar/decrementar desde `@touchstart`.
- **D-15 (HP-06/HP-07 — «derrotado»):** Cuando un contador de héroe llega a 0, la etiqueta de esa celda pasa a `ANA · SIN VIDA` en `text-warning` (reutiliza el renglón de etiqueta, sin coste de píxel nuevo). ▼ en 0 no hace nada; ▲ vuelve a subir por encima de 0 devolviendo la etiqueta al nombre. La partida no termina, no se abre ningún diálogo.
- **D-16 (la palabra exacta):** La palabra es «SIN VIDA», no «DERROTADO/A» ni «K.O.». Sin concordancia de género que resolver. Nota para el verificador: HP-06 usa la palabra «derrotado»; esta decisión la cumple en intención con otra palabra, diferencia deliberada.
- **D-17 (HP-09 + PITFALLS.md §13):** Los contadores NO se operan con teclado, decisión documentada. `useStepShortcuts` no cambia — su guarda `isEditableTarget` solo excluye `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable`, no botones, así que Espacio sigue avanzando el paso igual que en v1.7. Se cierra con un comentario de una línea en `useStepShortcuts.ts` y un test que fija el comportamiento. `shortcutsEnabled` no gana ninguna rama nueva.
- **D-18 (deshacer):** No hay deshacer más allá de que ▲ deshaga un ▼. Descartado destello de confirmación y pulsación larga para volver al valor precargado.

**Compatibilidad con lo ya desplegado (COMP-01/COMP-02)**
- **D-19 (no se reabre — hereda D-19 de la Fase 6):** `counters` entra como campo OPCIONAL de `SessionContext`, igual que `selection`, y NO se bumpea `formatVersion` (sigue en 1). `engine/persistence.ts` NO se modifica: `toPersistedPosition`/`resume()` ya persisten/restauran `context` entero. **El planner no debe reabrir esto** — el bump no hace falta.
- **D-20 (regla dura de mutación — heredada de `engine/selection.ts`):** Los mutadores de contador son funciones puras que devuelven una sesión NUEVA, reasignando un objeto nuevo en TODOS los niveles que tocan (`session`, `context`, `counters`, el array, la entrada). El `watchDebounced` de `index.vue` NO es profundo — una mutación in situ perdería los contadores al recargar.
- **D-21 (el test que cierra el criterio de éxito nº 5):** Un test que construye a mano una `PersistedPosition` con forma de v1.7 (`formatVersion:1`, `context` con solo `playerCount`/`difficulty`, sin `selection` ni `counters`) y comprueba que (a) `resume()` la devuelve utilizable y no la descarta, y (b) todos los resolvedores de esta fase devuelven valores definidos, sin `undefined`/`NaN` llegando a la interfaz. Este caso NO lo cubre el gate `contentVersion`/`formatVersion`.
- **D-22 (calibración del esfuerzo):** El grupo no deja partidas a medias — hecho del proyecto, no del repo. Sigue siendo correcto no corromper una sesión guardada, pero no es criterio por el que sacrificar simplicidad. El planner no debe gastar esfuerzo defendiendo partidas a medias de v1.7 más allá de D-21.

### Claude's Discretion (from `07-CONTEXT.md`)

- La forma exacta de `counters` dentro de `SessionContext`: `ARCHITECTURE.md` §a propone `{ villainHealth: number|null, heroHealth: number[] }`; **D-09 obliga a que las entradas de `heroHealth` también admitan `null`** (`(number|null)[]`) — adóptese o mejórese respetando eso.
- Dónde vive el cálculo del valor precargado: debe ser función pura del motor (candidato natural `engine/counters.ts`, hermano de `engine/selection.ts`), consumida vía `useGameSession.ts`, nunca importada desde un componente.
- El nombre exacto del componente (`CounterBand.vue` es la propuesta de `ARCHITECTURE.md`) y si la celda es subcomponente propio. **Resolved by `07-UI-SPEC.md`:** the component is named `CounterBand.vue`, no separate cell subcomponent (single component owns all cells).
- El umbral concreto de ancho en que la banda pasa a dos filas, y si se resuelve con breakpoint de Tailwind o contenedor. **Resolved by `07-UI-SPEC.md`:** Tailwind `sm` (640px), matching `StepScreen`'s existing `grid-cols-1 sm:grid-cols-2` breakpoint.
- Cómo se deriva "la sección repite" hasta `app/` (computed nueva en `useGameSession.ts` vs campo ya expuesto), mientras no se cablee el id `ronda`.
- La normalización defensiva de `counters` leído de `localStorage`, que debe seguir el mismo contrato que `resolvePlayerSlots`: validar por TIPO, longitud siempre derivada de `playerCount`, nunca lanzar, nunca devolver `undefined` dentro del array.
- Si merece la pena `/gsd:ui-phase 7` antes de planificar. **Resolved:** yes — `07-UI-SPEC.md` already exists and is the visual contract of record for this phase.

### Deferred Ideas (OUT OF SCOPE)

- **Control de etapa del villano** (un toque en «II» recarga el contador) — descartado en D-11, sin requisito. El dato ya está en el catálogo (tres etapas + `expert` desde la Fase 5). Reconsiderable en un hito posterior si en uso real subir a mano resulta molesto.
- **Repetición al mantener pulsado** (D-13) — reconsiderable solo si aparece un caso real de movimiento grande y solo cuando exista una tablet identificada.
- **Deshacer más allá de ▲/▼, destello de confirmación, pulsación larga para volver al valor precargado** (D-18) — descartados por coherencia con D-17 de la Fase 6.
- **Contador de amenaza y fichas de estado** (Aturdido/Confundido/Duro) — exclusión PERMANENTE de `PROJECT.md`, no un diferido.
- **Operar los contadores con teclado** (D-17) — no es un diferido con fecha, es decisión de que la app es táctil.
- **Corregir el «37 clips» de `PROJECT.md`/v1.7** (el recuento real es 35) — pendiente, fuera de esta fase.
- **VAL-01..VAL-06** (el número entre paréntesis en el texto del paso) → Fase 8. Esta fase no toca ningún `text`/`speech` ni ninguno de los 35 clips de voz.
- **HIST-*** (registro de la partida en el histórico) → Fase 9.
- **COMP-03** (actualización de la PWA ya instalada) → Fase 10.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HP-01 | Banda de contadores fija y siempre visible durante la partida | Pattern 3 (`showsCounterBand` from `sectionRepeats`) + D-07/D-08 in User Constraints — visibility derivation is fully specified, no fold/hide affordance |
| HP-02 | Banda ≤~15% de altura, presupuesto fijado antes de implementar, verificado en viewport objetivo | D-01/D-06 already lock the exact mechanism (`h-24 shrink-0`, 12.5% at 1024×768) — this phase's job is implementation fidelity to the already-fixed `07-UI-SPEC.md` template, not new measurement design |
| HP-03 | Banda con «Vida villano» + un contador por jugador (HP1..HPN) | `resolveCounters`/`engine/counters.ts` skeleton (Code Examples) produces exactly `villainHealth` + `heroHealth[]` sized to `playerCount`; `CounterBand.vue`'s `cells` prop shape already fixed in `07-UI-SPEC.md` |
| HP-04 | Cada contador con ▲/▼, sin teclado, sin escribir cifras | Pattern 4 (press/click separation, `NavBand.vue` precedent) + D-13/D-14/D-17 — no `<input>` anywhere, glyph-only interaction |
| HP-05 | Precarga con valor correcto según villano, héroe, nº jugadores | Code Example "Precharge calculation" — verified reference figures directly against `content/marvel-characters.json` (Thor=14, Rhino/Kang/Ultron stage-1 figures) |
| HP-06 | Contador de héroe a 0 marca «derrotado» visualmente, no baja de 0, no termina partida ni abre diálogo | D-15/D-16 (User Constraints) + Pitfall 2 (null vs 0) — clamp-at-0 logic goes in `engine/counters.ts`'s decrement mutator, never in the component |
| HP-07 | Contador derrotado puede volver a subir por encima de 0 | Same mutator (`incrementHero`) — no special-case branch needed, plain `+1` from 0 already produces the reversal D-15 describes |
| HP-08 | Contadores persisten con la sesión, sobreviven a recargar | Pattern 1 (full reassignment) + Pitfall 1 + existing `watchDebounced`/`pagehide` mechanism (unchanged, confirmed by direct read of `index.vue`) |
| HP-09 | Ajustar un contador nunca avanza el paso; Espacio/Enter/← se comportan igual que v1.7 | Direct read of `useStepShortcuts.ts` confirms `isEditableTarget` doesn't exclude `<button>`, so no code change needed — only a documentation comment (D-17); Open Question 2 notes the pinning test may already exist |
| HP-10 | Contadores legibles y accionables a un brazo de distancia, sin repetición descontrolada | `07-UI-SPEC.md`'s already-fixed `text-display`(40px)/`text-heading`(28px) typography + D-13 (no repeat = no runaway) |
| COMP-01 | Añadir campos nuevos no corrompe ni pierde una partida v1.7 en curso | Runtime State Inventory + `engine/persistence.ts` read directly — `resume()`'s `formatVersion`/`contentVersion` gate is untouched and already tolerant; D-19 confirms no bump needed |
| COMP-02 | Interfaz renderiza selección y contadores defensivamente cuando la sesión reanudada no trae los campos nuevos | Pattern 2 (defensive normalization) + Code Example "Test skeleton for D-21" — direct extension of the already-shipped, already-tested `resolvePlayerSlots` contract |
</phase_requirements>

## Summary

Phase 7 is almost entirely **code archaeology, not framework research**. `07-CONTEXT.md` (22 decisions) and `07-UI-SPEC.md` (compiled visual contract) already resolved every open design question; this document's job is to hand the planner exact file names, function signatures, and line-level precedents so no task has to "discover" the pattern from scratch.

The phase adds one new engine module (`engine/counters.ts`, a direct sibling of `engine/selection.ts` — same pure-mutator-returns-new-session shape, same defensive-normalization contract), one new field on `SessionContext` (`counters?`, optional, additive, **no `formatVersion` bump** — confirmed both by `07-CONTEXT.md` D-19 and by reading `engine/persistence.ts` directly: `context` already travels whole through `toPersistedPosition`/`resume()`), one new dumb component (`app/components/CounterBand.vue`, whose full JSX-equivalent template is already written in `07-UI-SPEC.md` §Layout — this is not draft, it is the target output), a handful of new computeds in `app/composables/useGameSession.ts`, one insertion point in `app/pages/[game]/index.vue`, and one documentation-only comment (no logic change) in `app/composables/useStepShortcuts.ts`.

The riskiest requirement, COMP-01/COMP-02, is **already fully modeled by an existing precedent**: `engine/__tests__/persistence.test.ts`'s `D-20` test block builds a hand-crafted pre-Phase-6 `PersistedPosition` (missing `selection`) and asserts `resume()` returns it usable with no `undefined`/`NaN` reaching resolvers. The Phase 7 test (D-21) is the same pattern extended one field further (also missing `counters`), in the same file, calling the new `engine/counters.ts` resolver instead of `resolvePlayerSlots`. There is no new persistence mechanism to design.

**Primary recommendation:** Write `engine/counters.ts` as a line-by-line structural copy of `engine/selection.ts` (same defensive-normalization contract, same reassign-at-every-level rule), wire it through `useGameSession.ts` exactly as `setVillain`/`setHero`/`setPlayerName` are wired today, drop `CounterBand.vue` in verbatim from `07-UI-SPEC.md`'s template, and add exactly the tests the codebase already has precedent for (`engine/__tests__/counters.test.ts` mirroring `selection.test.ts`; one more `describe` block in `engine/__tests__/persistence.test.ts` mirroring its own D-20 block). Do not re-litigate any visual or interaction decision — they are locked.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Precharge value calculation (villain stage I × player count × difficulty; hero flat) | Engine (pure TS, `engine/counters.ts`) | — | Deterministic function of catalogue + context, no I/O, no DOM — same tier as `resolvePlayerSlots`/`resolveVillainId` |
| Counter mutation (▲/▼ → new value) | Engine (pure TS, `engine/counters.ts`) | Composable (`useGameSession.ts`, single-statement wrapper) | Mutators must return a brand-new `EngineSession` at every touched level (watchDebounced isn't deep) — this discipline lives in the engine, never in a component |
| "Section repeats" → band visibility | Engine (`RuntimeStepNode.sectionRepeats`, already computed by `flatten.ts`) | Composable (`useGameSession.ts` new computed) | Data already carries this flag; `app/` must never compare against the content id `ronda` (TECH-04) |
| Band rendering (cells, glyphs, press-feedback) | Browser / Client (`CounterBand.vue`) | — | Dumb component, no `~~/engine/*` import, receives fully-resolved `cells` prop |
| localStorage read/write of `counters` | Browser / Client (`usePersistedSession.ts`, unchanged) + Engine (`persistence.ts`, unchanged) | — | `context` already serializes/deserializes whole; nothing new to write here |
| v1.7-shaped session tolerance | Engine (`engine/persistence.ts::resume()` unchanged + `engine/counters.ts`'s defensive resolver) | — | Same contract `resolvePlayerSlots` already proved for `selection` |

## Standard Stack

No new library, no new package. This phase's entire surface is Vue 3 SFC + plain TypeScript, using dependencies already in `package.json`.

### Core (already installed, versions confirmed via `npm view` 2026-09-08)
| Library | Installed / Latest | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nuxt` | `^4.5.2` installed / `4.5.2` latest [VERIFIED: npm registry] | App framework, unchanged | Already the project's framework; this phase touches no config |
| `vue` | `^3.5.41` (per `package.json`, confirmed in `06-RESEARCH.md`) | Component/composable layer | `CounterBand.vue` is a plain SFC, `<script setup>` |
| `@vueuse/core` | `^14.4.0` installed [VERIFIED: npm registry] | Not newly used by this phase — `useLocalStorage`/`watchDebounced` already wired in `index.vue`/`usePersistedSession.ts` | No new composable from this package is needed; `pressedKey` visual state is a plain `ref` (mirrors `NavBand.vue`, which also doesn't use VueUse for this) |
| `zod` | `^4.4.3` installed, Node/test-only | Unchanged — `SessionContext` (where `counters` lives) is **not** Zod-validated; only `GameDefinition`/content is | Confirmed: `engine/schema.ts` validates `StepDefinition`/`SectionDefinition`/`GameDefinition`, never `SessionContext` |
| `vitest` | `^4.1.11` installed / `5.0.0` latest on registry [VERIFIED: npm registry] | Test runner, unchanged config | `vitest.config.ts` already has two projects (`engine`, `app-logic`); no new project needed — `engine/counters.ts` tests go in the existing `engine` project |

### Supporting
None new.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `ref<string|null>` for `pressedKey` visual press-state | A VueUse composable (`usePointer`, etc.) | Rejected by precedent: `NavBand.vue` — the component this one is explicitly modeled on — uses a plain `ref` per button; `CounterBand` needs one shared keyed ref instead (dynamic number of buttons), but the mechanism stays a plain ref, not a new dependency |
| Hand-rolled `engine/counters.ts` mutators | A state-management library (Pinia) | Already rejected project-wide in `CLAUDE.md`'s Alternatives Considered table; nothing about counters changes that calculus (still one active session) |

**Installation:** None required — no `npm install` command needed for this phase.

**Version verification:** Confirmed via `npm view nuxt version` → `4.5.2`, `npm view @vueuse/core version` → `14.4.0`, `npm view vitest version` → `5.0.0` (project pins `^4.1.11`, a deliberate existing pin, not something this phase should touch), run 2026-09-08. All match or exceed what's already installed; no drift to reconcile.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** Every file this phase creates or edits (`engine/counters.ts`, `app/components/CounterBand.vue`, edits to `engine/types.ts`, `app/composables/useGameSession.ts`, `app/pages/[game]/index.vue`, `app/composables/useStepShortcuts.ts`) uses only dependencies already present in `package.json`. No `pip`/`npm install`/`cargo` command is part of this phase's scope. (Same posture as Phase 6 — see `06-RESEARCH.md`'s own "No aplica" note for this section, which this phase inherits verbatim.)

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  content/marvel-characters.json (Phase 5, static import,            │
│  CatalogueHero.health / CatalogueVillain.stages[0])                  │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ (build-time bundle, no network)
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  engine/counters.ts (NEW — pure TS, Node-testable, no DOM)            │
│  - computeInitialVillainHealth(villain, stage 1, playerCount, diff)   │
│  - computeInitialHeroHealth(hero)                                     │
│  - resolveCounters(context, catalogue, villainId, heroIds) → cells    │
│  - incrementVillain / decrementVillain / incrementHero / decrementHero │
│    (each: EngineSession → NEW EngineSession, full reassignment)       │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ consumed only from
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  app/composables/useGameSession.ts (the ONLY reactive seam)           │
│  - counterCells: computed<CellViewModel[]>                            │
│  - showsCounterBand: computed<boolean> (from                          │
│    currentNode.value?.sectionRepeats === true)                        │
│  - incrementVillainCounter() / decrementVillainCounter() /             │
│    incrementHeroCounter(slot) / decrementHeroCounter(slot)             │
│    (each: single `session.value = engineFn(...)` reassignment,        │
│    same shape as setVillain/setHero/setPlayerName already there)      │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ props down / events up
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  app/components/CounterBand.vue (NEW — dumb component)                │
│  props: cells[]  emits: increment(key) / decrement(key)                │
│  no import from ~~/engine/*                                           │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ mounted as 2nd child of the root flex column
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  app/pages/[game]/index.vue                                          │
│  <AppHeader/> → <CounterBand v-if="showsCounterBand"/> →              │
│  <VoiceUnavailableNotice v-if="..."/> → <StepScreen/> → <NavBand/>    │
│  watchDebounced(session, save, 300ms) — NOT deep — persists           │
│  `counters` for free IF mutators reassign correctly                   │
│  useEventListener('pagehide', ...) — flush-on-unload, unchanged       │
└───────────────┬───────────────────────────────────────────────────────┘
                 │ save() / resume()
                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  engine/persistence.ts (UNCHANGED — toPersistedPosition/resume())     │
│  `context` (containing `counters?`) persists/restores whole,          │
│  formatVersion stays 1                                                │
└─────────────────────────────────────────────────────────────────────┘
                 ▲
                 │ a v1.7-shaped object (no `selection`, no `counters`,
                 │ formatVersion:1) must resume() as 'resumed', not crash
                 │ — proven by a hand-built PersistedPosition test (D-21),
                 │ same file, same pattern as the existing D-20 test
```

### Recommended Project Structure

No new directories. Files touched/added, all inside the existing tree:

```
engine/
├── counters.ts              # NEW — pure mutators + resolver, sibling of selection.ts
├── types.ts                 # EDIT — SessionContext gains `counters?`
├── __tests__/
│   ├── counters.test.ts     # NEW — mirrors selection.test.ts's structure
│   └── persistence.test.ts  # EDIT — add D-21 describe block (v1.7-shaped, no counters)
app/
├── components/
│   └── CounterBand.vue      # NEW — template already fixed in 07-UI-SPEC.md §Layout
├── composables/
│   └── useGameSession.ts    # EDIT — new computeds + 4 new mutator wrappers
├── composables/
│   └── useStepShortcuts.ts  # EDIT — ONE comment line only, zero logic change
└── pages/[game]/index.vue   # EDIT — mount <CounterBand> as new sibling
```

### Pattern 1: Pure engine mutator with full reassignment (the load-bearing pattern of this entire phase)

**What:** Every function that changes a counter value takes an `EngineSession` and returns a **new** one, reassigning the object at every level it touches (`session`, `context`, `counters`, the array, the entry) — never mutating in place.

**When to use:** Every one of the four counter mutators (`incrementVillain`, `decrementVillain`, `incrementHero`, `decrementHero`).

**Why this is non-negotiable, not a style preference:** `app/pages/[game]/index.vue` runs `watchDebounced(session, save, { debounce: 300 })` **without** `{ deep: true }` (confirmed by reading the file directly). Vue's reactive proxy means an in-place mutation (`session.value.context.counters!.heroHealth[0] = 5`) still repaints the screen correctly — the bug is invisible in `npm run dev`. But the watcher never fires, so the change is silently dropped on reload. This exact failure mode is called out in `engine/selection.ts`'s own header comment and is the reason `06-VERIFICATION.md` explicitly traced every mutator by hand looking for `.push`/`.splice`/nested-property writes.

**Example (existing precedent, `engine/selection.ts`, to be copied structurally):**
```typescript
// Source: engine/selection.ts (this repo), the direct template for engine/counters.ts
export function setHero(session: EngineSession, slot: number, heroId: string | null): EngineSession {
  const { playerCount } = session.context
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerCount) {
    return session // no-op, never throws
  }
  const current = session.context.selection ?? emptySelection(playerCount)
  const heroes = resolvePlayerSlots(session.context).map((entry, i) =>
    i === slot ? { ...entry, heroId } : entry)
  return {
    ...session,
    context: {
      ...session.context,
      selection: { ...current, heroes },
    },
  }
}
```
An `incrementHero(session, slot)` in `engine/counters.ts` follows this exact shape: validate `slot` range (no-op/same-reference return if out of range, never throw), read the current `(number|null)[]` via a `resolveCounters`-style defensive getter (never trust `heroHealth.length`, always derive length from `playerCount`), compute the new value (from `null` → live-calculated value + 1, or `n` → `n + 1`, clamped nowhere on increment), and reassign `session`/`context`/`counters`/`heroHealth`/the entry.

### Pattern 2: Defensive normalization — validate by type, never by presence

**What:** A resolver function that reads `context.counters` and always returns a fully-populated, correctly-typed structure, regardless of what's actually stored (missing entirely, wrong length, wrong types, `null` entries from manual localStorage editing).

**When to use:** The function `useGameSession.ts`'s `counterCells` computed calls to turn `context.counters` (which may be `undefined` — v1.7 session, or Phase-6-only session with no `counters` key at all) into a `CellViewModel[]` that `CounterBand.vue` can render with zero `undefined`/`NaN`.

**Example (existing precedent, `engine/selection.ts::resolvePlayerSlots`, the literal contract `07-CONTEXT.md`'s Claude's Discretion section names as the model to follow):**
```typescript
// Source: engine/selection.ts (this repo)
export function resolvePlayerSlots(
  context: SessionContext,
): { heroId: string | null, playerName: string }[] {
  const length = Number.isInteger(context.playerCount) && context.playerCount > 0
    ? context.playerCount
    : 0
  const selection = context.selection
  const heroes = selection !== null && typeof selection === 'object' && Array.isArray(selection.heroes)
    ? selection.heroes
    : []

  return Array.from({ length }, (_, i) => {
    const entry = heroes[i]
    if (entry === null || typeof entry !== 'object') {
      return { heroId: null, playerName: '' }
    }
    // ...type-checked field extraction, never throws
  })
}
```
`engine/counters.ts` needs the equivalent for `heroHealth`: length always `= playerCount` (never `context.counters?.heroHealth.length`), each entry validated as `typeof x === 'number' ? x : null` (never trusting presence), `villainHealth` validated the same way. This is precisely what closes COMP-02 for the counters half of the interface — the same discipline the existing test suite already proved for `selection`.

### Pattern 3: Deriving visibility from a data flag, never a hardcoded content id (TECH-04)

**What:** `showsCounterBand` reads `currentNode.value?.sectionRepeats === true` — the exact field `RuntimeStepNode` already carries (populated by `engine/flatten.ts:16`, `sectionRepeats: section.repeats`).

**When to use:** The `v-if` gating `<CounterBand>` in `app/pages/[game]/index.vue`.

**Example (existing precedent, `useGameSession.ts::showsSelectionGrid`, the exact analog `07-CONTEXT.md` D-07 names):**
```typescript
// Source: app/composables/useGameSession.ts (this repo)
const showsSelectionGrid = computed<boolean>(() => currentNode.value?.step.selection === 'characters')
```
The new computed is a one-line sibling:
```typescript
const showsCounterBand = computed<boolean>(() => currentNode.value?.sectionRepeats === true)
```
No content-id comparison (`'ronda'`) may appear anywhere in `app/` — confirmed there is currently zero occurrence of the literal string `'ronda'` inside `app/` (same discipline `06-VERIFICATION.md` checked for `'setup.heroes.01'`).

### Pattern 4: Press-feedback separated from action (D-14, copied from `NavBand.vue`)

**What:** Visual "pressed" state (`scale-[0.98] brightness-95`) toggles on `@touchstart`/`@touchend`/`@mousedown`/`@mouseup`; the actual increment/decrement action fires **only** on `@click`.

**When to use:** Both `▼` and `▲` buttons in every cell of `CounterBand.vue`.

**Why:** Firing the action from `@touchstart` is the documented iOS Safari ghost-double-tap trap (`PITFALLS.md` §13, already cited in `07-CONTEXT.md` D-14). `NavBand.vue` (read in full, above) is the existing, shipped, human-verified proof this pattern works in this exact codebase.

**Example:** See the full component template already written in `07-UI-SPEC.md` §Layout §2 — it is the literal target output, not a sketch. Do not deviate from its event-handler wiring.

### Anti-Patterns to Avoid
- **`setInterval`/`requestAnimationFrame`-based press-and-hold repeat:** Explicitly rejected in `07-CONTEXT.md` D-13/D-18 and `07-UI-SPEC.md`. One tap = one step, no exceptions. Do not add this even as a "future-proofing" abstraction.
- **Collapsing `null` (never-touched) and `0` (touched, at floor) into the same rendered state:** `07-CONTEXT.md` D-12 calls this out as a hard rule — a `null` villain/hero counter renders `—`, never `0`. Conflating them would make every unstarted game show all heroes as "SIN VIDA" on the very first screen.
- **Deriving `heroHealth` array length from `counters.heroHealth.length` instead of `context.playerCount`:** `07-CONTEXT.md`'s Claude's Discretion section names this explicitly as the trap to avoid, mirroring the existing `Q8` rule already enforced for `selection.heroes`.
- **Bumping `formatVersion` "just to be safe":** `07-CONTEXT.md` D-19 explicitly closes this door — bumping would **discard the in-progress v1.7 game on the tablet right now**, which is strictly worse than the additive-field approach that already works. Do not reopen this in planning.
- **Adding a disabled/dimmed state to `▼`/`▲` at the `—` or `0` boundary:** `07-UI-SPEC.md` explicitly forbids `disabled` attributes or `opacity-40` here — boundaries are silent no-ops, buttons always look identically tappable.
- **Nesting `CounterBand` inside `StepScreen.vue`:** `07-CONTEXT.md`'s own Integration Points note is explicit — the band is a sibling in the page template, `StepScreen.vue` is not touched at all this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Villain-stage-I × player-count × difficulty math | A new lookup table or hardcoded per-villain switch statement in a component | `CatalogueVillain.stages[0]` (already includes `health`/`healthPerHero`/`healthPerGroup`/optional `expert`) read through a pure function in `engine/counters.ts` | The catalogue already encodes every number needed (Phase 5); duplicating it in `app/` risks drift the day the catalogue script re-runs |
| Defensive array normalization for a persisted-but-untrusted array | A hand-rolled `try/catch` around array access in the component | The exact `resolvePlayerSlots`-style pattern (validate by type, derive length from `playerCount`, never throw) | Already proven correct by the existing test suite and human verification for the structurally identical `selection.heroes` case |
| Detecting "round loop" screens | A new boolean flag threaded through `content/marvel-champions.json` steps, or a hardcoded id list | `RuntimeStepNode.sectionRepeats`, already computed once in `engine/flatten.ts` from the single `repeats: true` section | Recomputing this per-step would duplicate logic that already exists and is already schema-validated (`schema.ts` enforces exactly one repeating section) |
| Player name truncation/display fallback | A second "max 14 chars" constant, or a second "Jugador N" fallback string | `PLAYER_NAME_MAX_LENGTH` from `engine/selection.ts` + the existing `resolvePlayerLabel`-style fallback pattern already used in `useHeroSearch.ts` | `07-CONTEXT.md` D-04 explicitly requires reusing this exact constant, "nunca otra cifra" |

**Key insight:** Nothing in this phase is a genuinely new problem — it is the same "pure mutator + defensive resolver + dumb component" shape Phase 6 already solved and shipped for `selection`, applied to a second, structurally similar field (`counters`). The engineering risk is copy-paste discipline (don't skip a reassignment level), not algorithm design.

## Runtime State Inventory

> This is not a rename/refactor/migration phase in the traditional sense, but COMP-01/COMP-02 explicitly concern a real, already-deployed runtime artifact (a v1.7 session in a real tablet's `localStorage`). Answering the five categories explicitly per the protocol:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | A single `localStorage` key, `tga:progress:<gameId>` (confirmed pattern from `07-CONTEXT.md`'s Established Patterns note: "`clear(gameId)` borra los contadores solos"), holding one JSON-serialized `PersistedPosition`. A v1.7-shaped value has `formatVersion: 1`, `context: { playerCount, difficulty }` only — no `selection`, no `counters`. | Code edit only, no data migration: `resume()` in `engine/persistence.ts` already accepts this shape unmodified (formatVersion matches, contentVersion gate decides fresh-vs-resumed based on content changes, unrelated to the new fields) — the new fields are read defensively by `engine/counters.ts`'s resolver, never assumed present. |
| Live service config | None found. This app has no backend, no n8n/Datadog/Cloudflare-style external service config (confirmed by `CLAUDE.md`: "Sin backend: contenido en ficheros JSON del repo, estado en el navegador"). | None. |
| OS-registered state | None found. No Task Scheduler/pm2/launchd/systemd registration exists for this project — it is a client-side PWA served from Vercel, not a background service. | None. |
| Secrets/env vars | None found relevant to this phase. No SOPS keys, no `.env` entries reference `counters`/`selection`/`context` by name. | None. |
| Build artifacts | None found requiring action. No egg-info/compiled-binary/Docker-tag artifact exists for `counters` — it is source-only TypeScript, rebuilt fresh by `nuxt build`/`nuxt generate` on every deploy. The PWA precache manifest (Workbox) will regenerate automatically on the next deploy; no asset needs manual re-registration (confirmed by `07-CONTEXT.md`'s Integration Points: "Workbox — nada que hacer: no hay activo nuevo que precachear"). | None — verified by reading `07-CONTEXT.md` directly; this is the one item the context doc itself already ruled out. |

**Canonical question answered:** After every file in the repo is updated for Phase 7, the only runtime artifact that still has the "old" (v1.7 or Phase-6-only) shape is the single serialized `PersistedPosition` object sitting in the group's actual tablet's `localStorage` right now. Nothing else in the runtime environment references the old shape. The fix is exclusively "read defensively," never "migrate the stored bytes" — confirmed correct by `07-CONTEXT.md` D-19/D-22 and by `engine/persistence.ts`'s existing, unmodified `resume()` logic.

## Common Pitfalls

### Pitfall 1: Reassignment discipline broken by a "convenience" nested write
**What goes wrong:** A mutator like `incrementHero` is written as `session.context.counters!.heroHealth[slot]! += 1` for brevity, or a computed helper mutates the array returned by the resolver before spreading it.
**Why it happens:** It "looks" correct in the dev server because Vue's `ref` is a deep reactive proxy — the screen updates immediately regardless of whether the watcher fired.
**How to avoid:** Every mutator must end with a `return { ...session, context: { ...session.context, counters: { ...current, heroHealth: [...heroesArray-with-new-entry] } } }` shape — the same nested-spread depth `setHero` already demonstrates in `engine/selection.ts`. Write the counters test (mirroring `selection.test.ts`'s "desigualdad referencial" describe block) *before* wiring the composable, so a broken reassignment fails a fast unit test instead of only manifesting after a real reload.
**Warning signs:** A test asserting `result.context.counters).not.toBe(session.context.counters)` (and the same for the array and the touched entry) failing, or — in manual testing — a counter value that's correct on screen but reverts after a hard refresh.

### Pitfall 2: Conflating "no value known" (`null`) with "value is zero" (defeated)
**What goes wrong:** A component or resolver defaults an unset counter to `0` instead of `null`/`—`, which makes every hero look defeated (`SIN VIDA`) the instant a new game starts with no selection made.
**Why it happens:** `0` is the "obvious" numeric default; distinguishing "never touched, showing a live-calculated placeholder" from "touched and reduced all the way to zero" requires an explicit tri-state (`number | null` per entry), which is easy to collapse by accident when writing quick prototype code.
**How to avoid:** `SessionContext.counters` must be typed `{ villainHealth: number | null, heroHealth: (number | null)[] }` (per `07-CONTEXT.md`'s Claude's Discretion section, explicitly widening `ARCHITECTURE.md`'s original `heroHealth: number[]` proposal). `CounterBand`'s `defeated` prop must be computed as `livingValue === 0` on the *resolved* display value (never on a raw `null`), and the resolver must never coerce `null → 0`.
**Warning signs:** A fresh game (no villain/hero chosen) rendering any cell as `SIN VIDA` on the very first round-loop step is an instant sign this pitfall has been hit.

### Pitfall 3: The `watchDebounced` window losing the very last tap before a reload
**What goes wrong:** A rapid burst of ▲/▼ taps followed by an immediate page reload (or the tab being closed) within the 300ms debounce window could, in principle, drop the final counter change.
**Why it happens:** This is a **pre-existing, already-identified** risk in the codebase, not new to this phase — `app/pages/[game]/index.vue`'s own comment block (read directly, around the `pagehide` listener) documents this exact scenario for `selection` changes and states it is mitigated by `useEventListener('pagehide', () => { if (session.value) save(session.value) })`, which already covers "recarga, cierre o navegación fuera" for whatever `session.value` currently holds.
**How to avoid:** Nothing new to build — confirm (do not re-implement) that the existing `pagehide` handler still fires correctly once `counters` mutators are wired in, since it saves whatever `session.value` is at that instant regardless of which mutator produced it. No phase-7-specific code is needed here; this is a verification step, not a construction step.
**Warning signs:** None expected if the reassignment discipline (Pitfall 1) holds, since `pagehide`'s `save()` call is agnostic to which field changed.

### Pitfall 4: Height-budget scope creep from "while we're at it" additions
**What goes wrong:** During implementation, it becomes tempting to also surface villain-stage switching, threat count, or status tokens (Aturdido/Confundido/Duro) in or near the new band, since the affordance now exists.
**Why it happens:** `07-CONTEXT.md`'s own `<domain>` section names this as a predicted temptation, citing `PITFALLS.md` §14 — "una vez existe el stepper, todo lo adyacente parece gratis."
**How to avoid:** These are explicitly out of scope (D-11 for villain stages — permanently deferred, catalogue data already supports it whenever wanted; threat/status tokens — permanent `PROJECT.md` exclusion, not a deferred idea). The planner should not create tasks for either, even as "small" additions.
**Warning signs:** Any task description mentioning "stage," "amenaza," "aturdido," "confundido," or "duro" in this phase's plan is a scope-creep signal and should be rejected per `07-CONTEXT.md`'s own explicit instruction to "reconocerlas y declinar en el momento."

## Code Examples

### Precharge calculation (verified reference figures, cross-checked against `content/marvel-characters.json` directly in this session)

```typescript
// Source: content/marvel-characters.json (this repo, read directly 2026-09-08)
// Thor: { "id": "thor", "health": 14, ... }               -> flat hero health, no multiplication
// Rhino stage 1: { "stage": 1, "health": 14, "healthPerHero": true, "healthPerGroup": false }
// Kang stage 1 (normal): { "health": 12, "healthPerHero": true, expert: { "health": 15, "healthPerHero": true } }
// Ultron stage 1: { "health": 17, "healthPerHero": true, "healthPerGroup": false }
//
// With 3 players: Rhino 14×3=42, Kang normal 12×3=36, Kang expert 15×3=45, Ultron 17×3=51
// (all confirmed by direct inspection of the JSON, matching 07-CONTEXT.md's own reference figures exactly)

function computeInitialVillainHealth(
  villain: CatalogueVillain,
  playerCount: number,
  difficulty: Difficulty,
): number | null {
  const stage1 = villain.stages[0] // D-11: precharge is ALWAYS stage I
  if (!stage1) return null
  const figures = difficulty === 'expert' && stage1.expert ? stage1.expert : stage1
  if (figures.healthPerHero) return figures.health * playerCount
  if (figures.healthPerGroup) return figures.health // no known case yet, but modeled per the type
  return figures.health // flat fallback, not currently exercised by the catalogue but a safe default
}

function computeInitialHeroHealth(hero: CatalogueHero): number {
  return hero.health // always flat, never multiplied (per engine/types.ts's own VillainStage comment)
}
```

### Defensive resolver skeleton (structural copy of `resolvePlayerSlots`)

```typescript
// Source: pattern lifted directly from engine/selection.ts::resolvePlayerSlots (this repo)
export interface CounterState {
  villainHealth: number | null
  heroHealth: (number | null)[]
}

export function resolveCounters(context: SessionContext): CounterState {
  const length = Number.isInteger(context.playerCount) && context.playerCount > 0
    ? context.playerCount
    : 0
  const raw = context.counters
  const villainHealth = raw !== null && typeof raw === 'object' && (typeof raw.villainHealth === 'number' || raw.villainHealth === null)
    ? raw.villainHealth
    : null
  const heroHealthRaw = raw !== null && typeof raw === 'object' && Array.isArray(raw.heroHealth) ? raw.heroHealth : []
  const heroHealth = Array.from({ length }, (_, i) => {
    const entry = heroHealthRaw[i]
    return typeof entry === 'number' ? entry : null
  })
  return { villainHealth, heroHealth }
}
```

### Test skeleton for D-21 (COMP-01/COMP-02 closing test — same file, same pattern as the existing D-20 block)

```typescript
// Source: pattern lifted directly from engine/__tests__/persistence.test.ts's existing
// "D-20: resume() de una sesión persistida sin `selection`" describe block (this repo)
describe('D-21: resume() de una sesión persistida con forma de v1.7 (sin selection, sin counters)', () => {
  it('resume() devuelve "resumed", y todos los resolvedores de esta fase devuelven valores definidos', () => {
    const fresh = expand(marvelChampions, { playerCount: 3, difficulty: 'normal' })
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: 'marvel-champions',
      contentVersion: marvelChampions.contentVersion,
      runtimeId: fresh.sequence[0].runtimeId,
      round: 1,
      context: { playerCount: 3, difficulty: 'normal' }, // v1.7 shape: no selection, no counters
      updatedAt: '2026-09-08T00:00:00.000Z',
    }
    const { session, outcome } = resume(persisted, fresh)
    expect(outcome).toBe('resumed')

    const counters = resolveCounters(session.context)
    expect(counters.villainHealth).toBeNull()
    expect(counters.heroHealth).toEqual([null, null, null])
    // No undefined, no NaN anywhere in the resolved shape — the actual proof this test exists for.
  })
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| No counter/vida tracking in-app; group used physical dial | In-app fixed ▲/▼ counter band, `SessionContext.counters` | Phase 7 (this phase, v1.8) | `PROJECT.md`'s own "Fuera de alcance" history log records this as a deliberate **reversal** of an earlier v1 decision to keep counters physical-only — confirmed directly in `PROJECT.md` line 71: "Contadores en vivo de vida... revertido en v1.8" |
| N/A (villain stage math was previously irrelevant to `app/`) | Villain health computed from catalogue stage-1 figures × player count × difficulty, in-engine | Phase 5 (catalogue) landed the data; Phase 7 is the first consumer | The catalogue was purpose-built in Phase 5 anticipating this exact consumer — no retrofitting needed |

**Deprecated/outdated:** Nothing in this phase deprecates an existing pattern — it is purely additive on top of Phase 6's already-shipped `selection` mechanism.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Target viewport for the ≤15% height-budget measurement is 1024×768 (tablet landscape) | Inherited from `07-UI-SPEC.md` (itself `[ASSUMED]`, citing `STATE.md`'s "tablet model/OS unknown" blocker) | If the group's real tablet has a materially different aspect ratio, the 96px/12.5% figure could land differently — but D-06 already scopes verification to "measured only in tablet-landscape," and D-05's two-row narrow fallback exists precisely because exact viewport dimensions were never confirmable. Not a blocking risk for this phase's plan, but the human verification step should note the actual device once known (tracked as pre-existing `STATE.md` blocker, not new to this phase). |
| A2 | `slopcheck`/package-registry verification steps do not apply | Package Legitimacy Audit | None — verified directly by reading `package.json` and confirming zero new dependencies are needed; this is a factual finding, not an assumption, but flagged here per protocol since no `slopcheck` command was actually run (there is nothing to check). |

**If this table is empty:** N/A — see A1/A2 above. All *design* claims in this document (data shapes, file locations, function contracts) are `[VERIFIED: local codebase]` via direct file reads in this research session, not `[ASSUMED]`.

## Open Questions

1. **Where exactly does `<CounterBand>` mount relative to the existing, undocumented `<VoiceUnavailableNotice v-if="showVoiceUnavailableNotice">` in `app/pages/[game]/index.vue`?**
   - What we know: `07-CONTEXT.md`/`07-UI-SPEC.md`'s Layout diagrams show `AppHeader → CounterBand → StepScreen → NavBand` as a simplified stack, and D-03 requires the band to be "justo bajo `AppHeader`." Reading the actual current template shows a **fifth** element already present between `AppHeader` and `StepScreen`: a conditionally-rendered `<VoiceUnavailableNotice>` banner (non-fixed height, dismissible), which neither `07-CONTEXT.md` nor `07-UI-SPEC.md` mentions because it predates Phase 6/7's discussion.
   - What's unclear: Whether `CounterBand` should render before or after `VoiceUnavailableNotice` in the template order when both are visible simultaneously (a round-loop step with no TTS voice available). Both orderings satisfy D-03's literal wording ("directly under AppHeader" is arguably satisfied by "first child after AppHeader" specifically, which would put `CounterBand` *before* the notice).
   - Recommendation: Mount `<CounterBand v-if="showsCounterBand">` as the **immediate** next sibling after `<AppHeader>`, before `<VoiceUnavailableNotice>` — this reads `07-CONTEXT.md`'s literal ordering as authoritative when a conflict exists, keeps the band's position stable regardless of TTS availability (a state entirely unrelated to counters), and does not require moving or restyling the existing notice component. The planner should call this out explicitly as a one-line placement decision rather than silently guessing.

2. **Is a dedicated new test for `useStepShortcuts.ts`'s D-17 documentation comment actually needed, or does one already exist?**
   - What we know: `app/composables/__tests__/useStepShortcuts.test.ts` (read in full) **already contains** the exact test `07-CONTEXT.md` D-17 asks for: `it('BUTTON -> false (no es editable; el doble avance lo resuelve preventDefault, D-Q1)', () => { expect(isEditableTarget({ tagName: 'BUTTON' })).toBe(false) })`. This test was written during Phase 6 (or earlier) and already pins the exact behavior D-17 wants documented for Phase 7's ▲/▼ buttons.
   - What's unclear: Whether `07-CONTEXT.md`'s instruction to add "un test que fija el comportamiento" means the planner should treat this existing test as satisfying that requirement (with a possible added comment referencing D-17 alongside the existing D-Q1 reference), or whether a net-new, Phase-7-specifically-named test is still expected for traceability.
   - Recommendation: Treat the existing test as already satisfying the behavioral pin. The only new artifact needed for D-17 is the one-line code comment in `useStepShortcuts.ts` itself (as `07-CONTEXT.md` states verbatim: "un comentario de una línea"). Optionally, add a one-line comment *inside* the existing test referencing D-17 for cross-traceability, but do not duplicate the test logic. This saves a task in planning.

## Environment Availability

Skipped — this phase has no external tool/service/runtime dependency beyond what's already installed and verified working (Node 22.17.1, npm scripts, Vitest, Nuxt). No new CLI, database, or network dependency is introduced.

## Validation Architecture

Skipped — `.planning/config.json` has `workflow.nyquist_validation: false` explicitly set.

## Security Domain

`.planning/config.json` has no `security_enforcement` key, so per protocol this section is included, scoped honestly to what actually applies to a client-only, backend-less hobby app.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth exists or is planned anywhere in this project (`CLAUDE.md`: "Sin backend") |
| V3 Session Management | No | "Session" here means `EngineSession`/game-progress state, not an auth session — no session-fixation/hijacking surface exists client-side-only |
| V4 Access Control | No | Single-user-per-device app, no roles, no server to enforce access control against |
| V5 Input Validation | Yes | Counter values are validated by TYPE, not by trusting `localStorage` presence (`resolveCounters`, this phase's own defensive resolver, mirroring `resolvePlayerSlots`). Player names (already validated in Phase 6, unchanged this phase) are length-capped and always rendered via Vue's default text interpolation, never `v-html` (confirmed: `grep -rn "v-html" app/` returns empty, per `06-VERIFICATION.md`'s own gate). |
| V6 Cryptography | No | No secrets, no encrypted data, no crypto operations anywhere in this client-only app |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Manually-edited `localStorage` (DevTools) producing malformed `counters` (wrong type, negative number, string instead of number, mismatched array length) | Tampering | `resolveCounters`'s type-checked, length-derived-from-`playerCount` normalization (this phase's core defensive pattern) — never throws, never propagates `undefined`/`NaN` to the render layer |
| A future regression re-introducing `v-html` for player names/counter labels | Tampering / Elevation of Privilege (XSS) | Continue the existing project-wide convention: plain Vue interpolation only (`T-01-01`, already enforced and gated in Phase 6's verification) — `CounterBand`'s cell label prop is a plain string, rendered the same way |

## Sources

### Primary (HIGH confidence — direct file reads in this repo, this session)
- `engine/types.ts` — `SessionContext`, `HeroSelection`, `CatalogueHero`, `CatalogueVillain`, `VillainStage`, `RuntimeStepNode.sectionRepeats` (full file read)
- `engine/persistence.ts` — `toPersistedPosition`, `resume()`, `isValidContext`, `contentChangedFallback` (full file read)
- `engine/selection.ts` — `PLAYER_NAME_MAX_LENGTH`, `emptySelection`, `resolvePlayerSlots`, `resolveVillainId`, `setVillain`, `setHero`, `setPlayerName` (full file read)
- `engine/expand.ts`, `engine/flatten.ts`, `engine/header.ts`, `engine/toc.ts`, `engine/schema.ts` — `sectionRepeats`/`repeats` derivation and schema enforcement (grepped and spot-read)
- `engine/__tests__/persistence.test.ts` — the existing D-20 test block, the direct template for D-21 (full file read)
- `engine/__tests__/selection.test.ts` — reassignment-discipline test pattern (partial read, representative sample)
- `app/composables/useGameSession.ts` — full file read, all existing computeds and mutator wrappers
- `app/composables/useStepShortcuts.ts` — full file read, confirms the D-17 claim about `isEditableTarget` not excluding `BUTTON`
- `app/composables/__tests__/useStepShortcuts.test.ts` — grepped, confirms the `BUTTON -> false` test already exists
- `app/composables/useCharacterCatalogue.ts` — full file read
- `app/components/NavBand.vue` — full file read, the literal template for `CounterBand`'s press/click pattern
- `app/components/VoiceUnavailableNotice.vue` — full file read (Open Question 1)
- `app/pages/[game]/index.vue` — targeted reads (imports, `watchDebounced`, `pagehide`, template stack order)
- `content/marvel-characters.json` — full villains array + heroes sample read directly, confirming Thor=14, Rhino stage1=14/perHero, Kang stage1=12(normal)/15(expert)/perHero, Ultron stage1=17/perHero — matches `07-CONTEXT.md`'s own reference figures exactly
- `app/assets/css/main.css` — full `@theme` block read, confirms all typography/color/spacing tokens `07-UI-SPEC.md` cites already exist, none new
- `vitest.config.ts` — full file read, confirms the two-project (`engine`/`app-logic`) test structure
- `.planning/config.json` — full file read, confirms `nyquist_validation: false`, no `security_enforcement` key
- `.planning/phases/06-.../06-VERIFICATION.md` — full file read, confirms Phase 6's shipped mutator/persistence pattern was independently verified line-by-line, giving high confidence the same pattern is safe to replicate

### Secondary (MEDIUM confidence)
- `npm view nuxt version` / `npm view @vueuse/core version` / `npm view vitest version` — registry check run 2026-09-08, confirms no drift from what's installed (no official-docs cross-reference needed since these are unchanged dependencies, not new)

### Tertiary (LOW confidence)
- None — no WebSearch was needed for this phase; every question was answerable from this repo's own source and its already-thorough `07-CONTEXT.md`/`07-UI-SPEC.md`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all versions confirmed against the live npm registry
- Architecture: HIGH — every pattern is copied from an already-shipped, already-verified sibling (`engine/selection.ts` + its full verification report)
- Pitfalls: HIGH — all four pitfalls are either directly observed in this repo's existing code comments/tests or are the documented, already-mitigated `pagehide`/debounce interaction

**Research date:** 2026-09-08
**Valid until:** No expiry driver identified — this research is tied to the current state of this specific repository, not to an external ecosystem that moves on its own timeline. Re-research only if `engine/selection.ts`, `engine/persistence.ts`, or `app/pages/[game]/index.vue` change materially before Phase 7 is planned/executed.
