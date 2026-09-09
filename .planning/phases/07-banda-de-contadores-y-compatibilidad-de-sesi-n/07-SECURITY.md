---
phase: 07
slug: banda-de-contadores-y-compatibilidad-de-sesi-n
status: verified
threats_open: 0
asvs_level: n/a
created: 2026-09-09
register_authored_at_plan_time: true
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**ASVS: no aplica.** La app es un build estático prerenderizado (`nuxt generate`) servido por
Vercel, sin backend, sin autenticación, sin cuentas y sin llamadas de red en ejecución. Los
controles de ASVS giran alrededor de una frontera cliente↔servidor y de límites de
autorización que aquí no existen. La auditoría se juzgó contra la única frontera de confianza
que la propia fase declara: `localStorage → engine`.

El registro se escribió en tiempo de planificación (los 11 planes traen su bloque
`<threat_model>`), así que esta auditoría **verifica que cada mitigación existe**, no busca
amenazas nuevas.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `localStorage` (`tga:progress:<gameId>`) → `resume()` → `engine` | **La única entrada no confiable de toda la app.** Editable a mano desde las DevTools del propio dispositivo y corruptible por una escritura a medias. Desde esta fase ese objeto puede traer también `counters`. Es una frontera de **integridad del dato del propio usuario**, no de autenticación ni de autorización. | Posición de la partida, selección de villano/héroes, nombres de jugador, contadores de vida |
| `content/marvel-characters.json` → motor | Contenido versionado en el repo, generado por `scripts/catalogue/fetch-marvelcdb.mjs` desde la API pública de MarvelCDB. Frontera de confianza **interna**: confiable en el commit, pero su forma depende de una fuente externa que puede cambiar. Protegida por Zod (`z.strictObject`, `health: z.number().int().positive()`) y por un test de CI contra el fichero real. | Cifras de vida por héroe y por etapa/nº de jugadores/dificultad de villano |
| Nombre de jugador teclado → DOM | Texto libre arbitrario (máx. 14 caracteres) que acaba renderizado en la etiqueta de una celda. Única entrada de texto libre de la fase. | Mote elegido por el propio grupo |
| Dedo → DOM | Entrada del usuario legítimo. El hueco bloqueante CR-01 fue precisamente que esa entrada llegaba al destino equivocado: un fallo de integridad del dato del usuario, no de defensa frente a un tercero. | Toques en ▼/▲ |
| Ninguna otra | Sin backend, sin auth, sin red en ejecución, sin cuentas, sin servidor. No hay frontera cliente↔servidor que cruzar. | — |

---

## Threat Register

47 IDs únicos a lo largo de 11 planes: 31 entradas `mitigate` y 16 IDs `accept` (25 entradas
`accept` contando las reutilizaciones de `T-07-SC` / `T-07-07-SC` plan a plan).

Toda la evidencia de la columna derecha se comprobó leyendo o grepeando el código, no
tomándola de los SUMMARY ni del RESEARCH.

### Disposición `mitigate` — 31 entradas, todas verificadas en código

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-01 | Tampering | Contrato de tipo de `CounterState` | mitigate | `engine/types.ts:83-85` — `heroHealth: (number \| null)[]`; el compilador nunca promete un número donde puede no haberlo | closed |
| T-07-02 | DoS (datos propios) | `formatVersion` / partida guardada en la tablet real | mitigate | `git diff engine/types.ts \| grep -c formatVersion` = 0; `engine/persistence.ts:74` sigue filtrando por `formatVersion !== 1`. **El daño de mayor severidad realista de la fase, evitado por diseño** | closed |
| T-07-04 | Tampering | `resolveCounters` leyendo `context.counters` | mitigate | `engine/counters.ts:83-103` — `Number.isFinite` + `Math.trunc` + `Math.max(0,…)`, nunca `typeof === 'number'` (que aceptaría `NaN`/`Infinity`) | closed |
| T-07-05 | Tampering | Ensanchado del objeto persistido en los mutadores | mitigate | `grep -c '\.\.\.session.context.counters' engine/counters.ts` = 0 — el `counters` nuevo se construye desde el literal saneado, así que ninguna clave desconocida (incluida una `__proto__` como propiedad propia) se propaga | closed |
| T-07-06 | DoS (datos propios) | Un normalizador que lanzase con datos corruptos | mitigate | `grep -cE 'throw\|try {\|catch' engine/counters.ts` = 0 — contrato «nunca lanza». Lanzar dejaría la partida real irrecuperable en la pantalla de carga | closed |
| T-07-07 | Tampering | `slot` fuera de rango | mitigate | `engine/counters.ts:181,199` — `!Number.isInteger(slot) \|\| slot < 0 \|\| slot >= length`, con no-op de misma referencia | closed |
| T-07-09 | DoS (datos propios) | Sesión con forma de v1.7 en la tablet del grupo | mitigate | `engine/__tests__/persistence.test.ts:221` — el `describe` D-21 construye a mano la forma exacta de v1.7 y asserta `outcome === 'resumed'`. `git log -- engine/persistence.ts` solo muestra commits de la Fase 1 (`ea8e6f0`, `d458e5e`): el fichero no se tocó | closed |
| T-07-10 | Tampering | `context.counters` manipulado desde DevTools | mitigate | El mismo bloque D-21 inyecta `counters` con cadena, `NaN`, negativo y longitud desajustada a través de `resume()` y asserta normalización sin lanzar | closed |
| T-07-11 | Tampering | Añadir `BUTTON` a `isEditableTarget` «por seguridad» | mitigate | `app/composables/useStepShortcuts.ts:128-133` — `isEditableTarget` sigue comprobando solo `INPUT`/`TEXTAREA`/`SELECT`/`isContentEditable`; sin `BUTTON`. Añadirlo habría roto HP-09 sin ningún test rojo | closed |
| T-07-13 | Tampering | `counterCells` con un `context` corrupto | mitigate | `grep -c 'session.value.context.counters' app/composables/useGameSession.ts` = 0; `counterCells` (líneas 213-218) pasa siempre por `resolveCounterValues`/`resolvePlayerSlots` | closed |
| T-07-14 | Tampering / EoP (XSS) | Nombre de jugador en la etiqueta de celda | mitigate | El composable devuelve cadena plana; se consume por interpolación (ver T-07-17) | closed |
| T-07-15 | DoS (datos propios) | Mutadores que mutasen en sitio | mitigate | `useGameSession.ts:233-251` — los cuatro mutadores reasignan `session.value` completo. Una escritura anidada actualizaría la pantalla pero perdería los contadores al recargar (`watchDebounced` no es profundo) | closed |
| T-07-17 | Tampering / EoP (XSS) | Etiqueta de celda → DOM | mitigate | `grep -rn "v-html" app/` → 0 coincidencias; `CounterBand.vue:160` usa `{{ entry.cell.label }}` | closed |
| T-07-18 | DoS (datos propios) | `watchDebounced` / `pagehide` de la página | mitigate | `git log -S"watchDebounced" -- app/pages/[game]/index.vue` — último toque anterior a la Fase 7 (`ded6cf1`); código intacto en 162/183 | closed |
| T-07-19 | DoS (usabilidad) | Un ▼ pegado al borde de SIGUIENTE | mitigate | `app/pages/[game]/index.vue:671-713` — orden `AppHeader → CounterBand → … → NavBand` (D-03). Mantiene toda flecha a ≥96px de la zona pulsable de SIGUIENTE | closed |
| T-07-20 | Tampering | Doble conteo fantasma en `@touchstart` (Safari iOS) | mitigate | `CounterBand.vue:126,129,148,151` — `@touchstart` solo mueve `pressedKey`; exactamente 2 `emit(`, ambos en `@click` | closed |
| T-07-21 | DoS (fuga de temporizador) | Repetición al mantener pulsado | mitigate | `grep -n 'setInterval\|setTimeout\|requestAnimationFrame' CounterBand.vue` = 0 — D-13 elimina la repetición de raíz, así que no hay temporizador que limpiar | closed |
| T-07-23 | DoS (datos propios) | Pérdida silenciosa de contadores al recargar | mitigate | `e2e/counter-band-behavior.spec.ts:91,281` — patrón escribir → recargar → volver a leer. Único gate capaz de cazar una rotura de D-20, invisible en `npm run dev` | closed |
| T-07-24 | Tampering | Doble conteo o repetición desbocada | mitigate | `counter-band-behavior.spec.ts:186` (aritmética exacta `+3`), `:197-200` (mantener 1200ms → `+1`) | closed |
| T-07-25 | Tampering | Regresión que avanzase el paso desde un contador | mitigate | `counter-band-behavior.spec.ts:220,233-255` — texto del paso invariante + Espacio sigue avanzando con el foco en una flecha | closed |
| T-07-26 | DoS (usabilidad) | La banda comiéndose el texto grande del paso | mitigate | `e2e/counter-band-height.spec.ts:81-84,244-247` — `fontSize` fijo en `'40px'` antes y después de montar la banda | closed |
| T-07-27 | Tampering (higiene de test) | Contaminación de estado entre specs → falsos verdes | mitigate | `localStorage.clear()` + patrón `.isVisible().catch(...)` presente en los 3 specs de la banda | closed |
| T-07-29 | Repudiation (trazabilidad) | El propio registro de la verificación humana | mitigate | `07-VERIFICATION.md` da veredicto por verdad (1-5) con evidencia, viewport y navegador anotados | closed |
| T-07-08-01 | Tampering (integridad del dato) | `CounterBand.vue` — **hueco bloqueante CR-01** | mitigate | `CounterBand.vue:103,119,134,141` — `min-w-0` / `overflow-hidden` / `shrink-0`; fijado por la prueba de impacto `elementFromPoint` de `e2e/counter-band-overlap.spec.ts:218` sobre 5 viewports × 4 nº de jugadores | closed |
| T-07-09-01 | Tampering | `playerCount` manipulado en los mutadores de villano | mitigate | `engine/counters.ts:63-72` — un solo `resolveHeroHealthLength`; `counters.test.ts:338-379` `it.each(manipulatedPlayerCounts)` sobre `[2.5, NaN, '3', null]` | closed |
| T-07-09-02 | Tampering (datos de terceros) | `computeInitialVillainHealth` sobre el catálogo | mitigate | `engine/counters.ts:40` — `if (!Number.isFinite(figures.health)) return null`. **Cerrada con residuo registrado** — ver §Riesgos Aceptados, R-07-01 | closed |
| T-07-10-01 | Tampering (integridad de interacción) | Estado de pulsado de `CounterBand.vue` / `NavBand.vue` | mitigate | `CounterBand.vue:123-128,145-150` — `@mouseup` / `@mouseleave` / `@blur` / `@touchend` / `@touchcancel` ponen `pressedKey = null`. Un botón hundido tras un `touchcancel` induce a un toque de más sobre la vida de alguien | closed |
| T-07-10-02 | DoS (accesibilidad) | Flechas enfocables e inoperables | mitigate | `CounterBand.vue:118,140` — `tabindex="-1"` en ambas flechas, sin tocar `useStepShortcuts.ts` (D-17/HP-09 intactas). Un usuario de teclado o de conmutador quedaba atrapado recorriendo hasta 10 controles muertos | closed |
| T-07-10-04 | Spoofing (visual) | Separador ausente entre VILLANO y Jugador 1 | mitigate | `CounterBand.vue:48,104` — separador indexado por `globalIndex`, no por `:first-child`. Dos contadores sin separación se leen como uno solo: misma familia de fallo que CR-01, por la vía visual | closed |
| T-07-11-01 | Repudiation (ledger del proyecto) | `.planning/REQUIREMENTS.md` | mitigate | `REQUIREMENTS.md:38-52,97-98,159-163` — HP-01..HP-10, COMP-01 y COMP-02 marcados con su evidencia citada, solo tras la firma humana | closed |
| T-07-11-03 | Repudiation (contrato de diseño) | `07-UI-SPEC.md` | mitigate | `07-UI-SPEC.md:83-107` — suelo de anchura acotado a `>=760px`, con procedencia D-02/HP-10/UI-02 escrita al lado. Un contrato que afirmase el suelo duro invitaría al siguiente ejecutor a «restaurarlo» y reabrir CR-01 | closed |

### Disposición `accept` — 16 IDs únicos

| Threat ID(s) | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-07-03, T-07-08, T-07-12, T-07-16, T-07-22, T-07-28, T-07-08-02, T-07-09-04, T-07-10-03, T-07-11-02 | Spoofing / Repudiation / Information Disclosure / Elevation of Privilege | — | accept | Contrastado contra `CLAUDE.md`: sin backend, sin auth, sin cuentas, sin PII ni secretos. La afirmación «no hay superficie» del registro se sostiene para un dispositivo compartido a propósito entre amigos. Los contadores son puntos de vida de una partida de mesa | closed |
| T-07-30 | DoS (datos propios, máquina de quien verifica) | Partida de la persona que verifica | accept | `git log --name-only` de los commits de 07-07 y 07-11 confirma que solo tocan `.planning/*.md`; `clear(gameId)` borra la clave entera por diseño. Es una máquina de desarrollo, no la tablet de mesa | closed |
| T-07-31 | Tampering | Ficheros del repo | accept | Misma comprobación de alcance: el commit `f773251` de 07-07 solo toca su propio SUMMARY.md | closed |
| T-07-08-03 | DoS (tiempo de CI) | Bucle de la matriz en Playwright | accept | `e2e/counter-band-overlap.spec.ts:141-146` — un solo `page.goto` por `playerCount` (bucle exterior) y `page.setViewportSize` sin navegar (bucle interior). Coincide con el diseño declarado | closed |
| T-07-09-03 | DoS (cuelgue) | Mutadores puros | accept | `engine/counters.ts` — 0 bucles `for`/`while`, 0 recursión; solo `.map`/`Array.from` sobre arrays acotados. Una entrada manipulada produce un no-op o un `null`, nunca un cuelgue | closed |
| T-07-SC (planes 01-07), T-07-07-SC (planes 08-11) | Tampering (cadena de suministro) | Dependencias npm | accept | **Verificado por historia de git, no por la prosa del RESEARCH:** `git log --oneline -- package.json package-lock.json` — último toque `0f4dc8e` (Fase 5), anterior a todo el rango de commits de la Fase 7 (`48b15ae`…HEAD). Cero cambios de paquete en la fase | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-07-01 | T-07-09-02 | **Residuo de la guarda anti-NaN de vida, asimétrica.** `computeInitialVillainHealth` (`engine/counters.ts:40`) tiene su guarda `Number.isFinite`; su gemela `computeInitialHeroHealth` (`engine/counters.ts:45-47`) no — devuelve `hero.health` en crudo. Se confirmó además que `NaN ?? null` evalúa a `NaN` (solo `undefined`/`null` disparan `??`), así que un NaN se pintaría como el literal «NaN» en cuerpo 40px sobre la banda. **Por qué se acepta en vez de bloquear:** la amenaza tal como está *literalmente acotada* en el registro nombra solo `computeInitialVillainHealth`, y esa mitigación existe y está testeada. La asimetría es real y contradice el contrato «nunca propaga NaN» que la cabecera del propio módulo declara, pero **no es alcanzable desde la frontera de confianza declarada de la app**: `computeInitialHeroHealth` se invoca (`useGameSession.ts:133`) con un `hero` que sale exclusivamente de `catalogue.heroes.find(...)` sobre el `CharacterCatalogue` importado estáticamente, nunca de `localStorage`. Llegar ahí exigiría un `content/marvel-characters.json` que ya hubiese pasado un esquema Zod que garantiza `health: z.number().int().positive()` (`engine/catalogueSchema.ts:63`, `z.strictObject`) y un test de CI que valida el fichero real (`engine/__tests__/characters.test.ts:14,53`). Eso es un control de integridad de build/CI verificado presente y ejercitado, no documentación-como-evidencia. Tres lecturas independientes de código (`07-REVIEW.md` WR-07, `07-VERIFICATION.md` y esta auditoría) llegaron a la misma conclusión por separado. **Seguimiento recomendado, no bloqueante:** replicar la guarda de una línea en `computeInitialHeroHealth` por simetría de contrato y defensa en profundidad, por si el script de generación (`scripts/catalogue/fetch-marvelcdb.mjs`) o su gate de CI llegan a regresar. | Víctor Company Bernal (vía verificación de la Fase 7) | 2026-09-09 |
| R-07-02 | T-07-03, T-07-08, T-07-12, T-07-16, T-07-22, T-07-28, T-07-08-02, T-07-09-04, T-07-10-03, T-07-11-02 | **Sin superficie de Spoofing / Repudiation / Information Disclosure / Elevation of Privilege.** Decisión explícita y repetida a lo largo de los 11 planes: no hay identidades que suplantar, roles que elevar, auditoría que falsificar ni datos sensibles que filtrar. Un dispositivo, un grupo de amigos, sin cuentas. Varios planes argumentan literalmente que inventar una amenaza donde no hay superficie sería ruido; la auditoría comprobó ese razonamiento contra `CLAUDE.md` en vez de exigir mitigaciones reflejas. | Víctor Company Bernal (constraints del proyecto) | 2026-09-09 |
| R-07-03 | T-07-SC, T-07-07-SC | **Cadena de suministro sin auditar porque no hay nada que auditar.** Cero dependencias nuevas en toda la fase, confirmado contra la historia de git y no contra la prosa de `07-RESEARCH.md`. Nota relacionada: la sugerencia de WR-06 de añadir `typescript`/`vue-tsc` se difirió deliberadamente porque abriría este vector sin auditoría previa. | Víctor Company Bernal (vía `07-RESEARCH.md` §A2) | 2026-09-09 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-09 | 47 | 47 | 0 | gsd-security-auditor (verificación de mitigaciones; registro escrito en tiempo de planificación) |

**Alcance de esta auditoría.** `register_authored_at_plan_time: true`, así que el auditor
verificó que cada mitigación declarada existe y **no** hizo barrido de amenazas nuevas. Los
otros avisos de `07-REVIEW.md` —el patrón de pulsado pegado y la transición de brillo en
`ConfirmDialog.vue`, `ResumePrompt.vue`, `GameSelectorScreen.vue` y `ContentChangedNotice.vue`—
caen fuera del conjunto de artefactos declarado de la Fase 7 y quedan **fuera del alcance de
esta auditoría**: se anotan para que no se pierdan, no se puntúan contra esta fase.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-09
