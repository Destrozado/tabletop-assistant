# Phase 8: Valores conocidos dentro del paso - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 8-Valores conocidos dentro del paso
**Areas discussed:** Marcado y alcance de pasos, Mano Héroe vs Alter-Ego, Anatomía en pantalla, Selección parcial y origen del número

---

## Marcado y alcance de pasos

### ¿Cómo sabe la app que un paso concreto lleva un valor conocido?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Clave nueva en el JSON | `"value": "villainHealth"` en cada paso afectado, calcado de `selection: "characters"`. No toca `text`/`speech`, no bumpea `contentVersion`, `z.strictObject` + CI obligan a declararla en el esquema | ✓ |
| Tabla de ids en el motor | Mapa `{'setup.escenario.02': 'villainHealth', …}` en `engine/` o `app/`. No toca el JSON pero cablea ids de contenido, contra TECH-04 | |
| Deducirlo del propio texto | Buscar frases como «vida del villano» en el `text`. Una reescritura rompería el valor en silencio | |

**Notas:** Cuarta vez consecutiva (D-24 Fase 2, D-02 Fase 6, D-07 Fase 7) que se aplica la misma disciplina de no cablear ids de contenido en código.

### ¿Qué forma tiene esa clave nueva?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Enum plano | `"value": "villainHealth" \| "heroHealth" \| "handSize"`; paréntesis vs lista se deriva del tipo, sin segundo campo que pueda contradecir | ✓ |
| Objeto con tipo y alcance | `{ kind, scope }` — más explícito, pero crea un estado imposible que validar con refinamiento de Zod | |
| Array de valores por paso | `["heroHealth", "handSize"]` — ningún paso candidato cita dos cifras | |

### ¿Cuáles de los pasos de preparación llevan valor?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Los cuatro, mulligan incluido | `setup.escenario.02`, `setup.heroes.03`, `setup.manos.02`, `setup.manos.03` — el mulligan cuesta una clave y es cuando se cuentan cartas | ✓ |
| Los tres, sin el mulligan | El mulligan repite la cifra del paso anterior; dos listas seguidas es ruido | |
| Solo los dos diales | Solo los pasos que dicen «ajustad el dial»; la mano se cuenta con cartas, no con dial | |

### ¿Dónde vive el cálculo?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Módulo nuevo del motor | `engine/stepValues.ts`, reutilizando `computeInitialVillainHealth`/`computeInitialHeroHealth`. Separa el valor del paso (no congelable) del contador en mesa (congelable) | ✓ |
| Ampliar `engine/counters.ts` | Toda cifra de vida en un fichero, pero `counters.ts` ya carga la semántica de congelado y `handSize` no es un contador | |
| Directamente en `useGameSession.ts` | Sin fichero nuevo, pero saca lógica pura a la capa de Vue, sin test unitario propio | |

---

## Mano: Héroe vs Alter-Ego

**Hallazgo previo a las preguntas** — lectura del Rules Reference v1.7 durante la discusión:
- **Apéndice II, paso 1 (p. 49):** «Each player selects one identity, placing their **alter-ego side face up**.»
- **Hand Size (p. 21):** «the number of cards indicated by **their** hand size value.»

### ¿Qué cifra muestra la mano inicial de `setup.manos.02` y del mulligan?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| `handSizeAlterEgo` | Lo que dice el reglamento: en preparación se está en Alter-Ego y no hay volteo. Spider-Man = 6 | ✓ |
| Las dos cifras | «6 (AE) / 5 (H)» — cubre a quien haya volteado, pero duplica cada fila y sugiere una elección que el reglamento no ofrece | |
| `handSizeHero` | Incorrecta según el Apéndice II; listada solo para descartarla por escrito | |

**Notas:** El propio contenido ya lo corroboraba: `setup.heroes.02` es «Colocad vuestra identidad por el lado Alter-Ego», dos pasos antes. Sin esta lectura la fase habría mostrado la cifra equivocada en los 23 héroes.

### ¿Qué hacemos con `ronda.jugadores.02`?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Queda fuera | La app no sabe la forma; la carta está boca arriba delante de esa persona en ese instante. VAL-02 se cumple con los cuatro pasos de preparación | ✓ |
| Las dos cifras etiquetadas | «6 AE / 5 H» — nunca falso, pero dos números por fila en el bucle de ronda, donde la banda ya ocupa 96px | |
| Solo la cifra de Héroe | Una cifra por fila, pero falsa cada vez que alguien esté en Alter-Ego | |

**Notas:** Consecuencia estructural: toda la fase queda confinada a la preparación y nunca comparte pantalla con la banda de contadores de la Fase 7.

### ¿Cómo se llama el valor en el enum?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| `handSizeAlterEgo` | Nombra el campo exacto del catálogo; deja la conclusión de reglas visible en el contenido | ✓ |
| `startingHandSize` | Nombra lo que el paso dice, pero esconde cuál de las dos caras se usa | |
| `handSize` genérico | El catálogo tiene dos campos con ese prefijo — la ambigüedad que se acababa de resolver | |

---

## Anatomía en pantalla

**Comprobación previa:** ninguno de los cuatro pasos marcados lleva rejilla `ELECCIÓN` (solo `setup.heroes.01`) ni bloque `Opciones`; solo el mulligan lleva línea de aviso `⚠`.

### ¿Cómo se pinta el paréntesis de VAL-01?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Dentro de la misma frase, mismo estilo | Un solo `<p>` de `text-display` 40px, número interpolado detrás. Literalmente lo que escribe VAL-01 | ✓ |
| Mismo `<p>`, número destacado | `(42)` en `text-accent` — estrena color dentro de la frase grande, hoy de un solo color | |
| Bloque propio bajo la frase | Más prominente, pero parte la lectura en dos y gasta alto | |

### ¿Qué anatomía tiene la lista por jugador?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Filas calcadas de `ELECCIÓN`, cifra grande | `max-w-[720px]`, `border-b border-accent/50`, nombre 20px izquierda / número 28px negrita derecha, sin chevron ni `<button>` (D-32) | ✓ |
| Filas planas, todo a 20px | Menos alto, pero la cifra pesa lo mismo que el nombre del héroe | |
| Lista compacta sin bordes | El bloque más pequeño posible, pero estrena un patrón que no existe en ninguna otra pantalla | |

### ¿Lleva rótulo el bloque?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sin rótulo | La frase grande de encima ya dice qué es; ahorra un renglón y una redacción que mantener | ✓ |
| Rótulo por tipo de valor | «VIDA INICIAL» / «MANO INICIAL» — coherente con los otros bloques, pero un literal por valor del enum | |
| Rótulo fijo genérico | Un solo literal, pero dice menos que la frase que ya está encima | |

### Con un solo jugador, ¿lista o paréntesis?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Sigue siendo lista de una fila | Una sola regla, sin rama especial; la pantalla se ve igual con 1 que con 4 | ✓ |
| Se colapsa a paréntesis | Más ligero en solitario, pero añade una rama y una pantalla que cambia de forma | |

---

## Selección parcial y origen del número

### Volviendo con `‹ ATRÁS` a `setup.escenario.02` con el villano ya a 38 de 42, ¿qué número pinta?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Siempre el del catálogo | 42 — el paso dice «al valor **indicado**», la vida inicial impresa. `stepValues.ts` nunca llama a `resolveCounterValues` | ✓ |
| El mismo que pinta la banda | 38 — un solo número en toda la app, pero contradiría la frase del propio paso | |
| Catálogo, salvo si ya se tocó | Intenta las dos cosas y añade una rama impredecible desde la pantalla | |

### Cuatro jugadores, solo dos con héroe. ¿Qué pinta la lista?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Solo las filas que se saben | La numeración ya deja ver quién falta; VAL-03 aplicado fila a fila | ✓ |
| Las cuatro filas con «—» | Coherente con la banda y la rejilla, pero VAL-03 pide «sin hueco ni marcador» y esta lista es contenido opcional, no una banda fija | |
| Nada hasta que estén los cuatro | Nunca a medias, pero castiga a quien eligió tres de cuatro, contra SEL-09 | |

### ¿Cómo se garantiza VAL-04?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Gate de voz + revisión del diff | `voice-drift.test.ts` ya hashea todos los `speech` (cubre VAL-05/VAL-06); para `text`, revisión explícita del `git diff`. Cero código nuevo | ✓ |
| Test de huellas de todos los `text` | Muerde en CI, pero congela el contenido para siempre — el proyecto ya ha hecho tres correcciones legítimas de redacción | |
| Solo revisión del `git diff` | Más simple, pero deja `speech` sin la red automática que ya existe gratis | |

### El mulligan lleva además un aviso `⚠`. ¿En qué orden?

| Opción | Descripción | Elegida |
|--------|-------------|---------|
| Frase → lista → aviso | La lista ocupa el hueco de `ELECCIÓN`; el `⚠` se queda último como en toda la app | ✓ |
| Frase → aviso → lista | El aviso pegado a su frase, pero mueve el `⚠` de sitio solo en este paso | |

---

## Claude's Discretion

El usuario eligió las dieciséis opciones presentadas (todas coincidiendo con la recomendación) y no delegó ninguna con un «tú decides». Quedan abiertas a research/planning, por no haberse discutido:

- Forma exacta de los props nuevos de `StepScreen.vue` (precedente: `selectionRows`).
- Nombres del módulo, de la clave del esquema y de las computed.
- Formato exacto de la etiqueta de fila («Jugador 1 · Spider-Man») y su truncado.
- Normalización defensiva de `playerCount`/`selection` manipulados (contrato ya establecido).
- Si merece la pena `/gsd:ui-phase 8` — el ROADMAP no trae `UI hint` para esta fase.
- Ubicación de los tests.

## Deferred Ideas

- `ronda.jugadores.02` con las dos cifras etiquetadas — reconsiderable con partidas encima.
- Rastrear la cara Héroe / Alter-Ego de cada jugador — capacidad nueva, su propia fase.
- Test de huellas de todos los `text` — descartado por congelar el contenido.
- Corregir el «37 clips» de `PROJECT.md`, del archivo de v1.7 y del criterio de éxito nº 5 del ROADMAP (el real es 35, verificado hoy) — pendiente desde la Fase 6, candidato a `/gsd:quick`.
- Contador de amenaza, fichas de estado, etapas II/III, editor de catálogo — exclusiones permanentes, no diferidos.
