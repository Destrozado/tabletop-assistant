# Phase 1: Motor de flujo, selector y preparación de mesa - Research

**Researched:** 2026-08-28
**Domain:** Motor de flujo puro en TypeScript + scaffold Nuxt 4 SSG + Tailwind v4 + contenido JSON/Zod verificado (Marvel Champions, preparación de mesa)
**Confidence:** HIGH en stack/arquitectura/reglas de preparación (verificado en vivo contra `npm view`, documentación oficial de Nuxt/Tailwind, y el PDF oficial del Rules Reference v1.7 vía `pdftotext`); MEDIA en la propuesta concreta de 21 pasos (es una síntesis razonada del apéndice oficial, pendiente de que el ejecutor la contraste paso a paso al autorizar el contenido final).

## Summary

Esta fase no parte de cero en investigación: `ARCHITECTURE.md`, `STACK.md` y `PITFALLS.md` ya dejaron resuelto el 90% de las decisiones técnicas (modelo de flujo aplanado, esquema Zod, versiones de paquetes, Netlify, `nuxt generate`). Este documento no repite esa investigación — la reverifica donde el tiempo transcurrido lo justifica (todas las versiones de paquetes siguen siendo las mismas, comprobado en vivo hoy), la ajusta donde `01-CONTEXT.md`/`01-UI-SPEC.md` tomaron decisiones posteriores que la investigación previa no pudo anticipar (el campo `detail` de `ARCHITECTURE.md` choca con D-05; la pantalla "mesa lista" de D-03 no existía cuando se diseñó el esquema; la restricción "exactamente una sección con `repeats:true`" no se sostiene si esta fase solo tiene la sección `setup`), y la completa donde el encargo explícito de esta fase lo pedía: un desglose verificado, con cita de página, del Apéndice II del Rules Reference v1.7, y una traducción concreta de los tokens de `01-UI-SPEC.md` a Tailwind v4.

**Primary recommendation:** ejecutar el scaffold con `npm create nuxt@latest` (no `nuxi init`, que sigue funcionando pero ya no es el comando documentado), instalar solo el subconjunto de paquetes que esta fase necesita (nada de `@vite-pwa/nuxt`, que es Fase 4), construir el `engine/` exactamente como propone `ARCHITECTURE.md` con las tres correcciones señaladas en «Hallazgos y ajustes sobre la investigación previa», y autorar el contenido de la preparación de mesa siguiendo la tabla de 21 pasos verificada contra el PDF oficial más abajo — no como contenido cerrado, sino como el punto de partida verificado que el equipo de autoría debe revisar paso a paso antes de fijarlo (CONT-09 pertenece a la Fase 2, pero nada impide dejar cada paso de esta fase ya citado desde el primer commit).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Selector de juego (SEL-01..04) | Browser / Client (componente Vue prerenderizado) | — | Contenido 100% estático conocido en build; sin fetch, sin backend |
| Mini-setup y validación de campos (SETUP-01..03) | Browser / Client | — | Formulario puro, estado efímero hasta confirmar |
| Motor de flujo (next/prev/jumpTo, cierre de bucle, expand) | Browser / Client — pero **como módulo TypeScript puro sin Vue**, no como "lógica de componente" | — | Debe ser testeable con Vitest sin DOM ni mount; ver `engine/` en Arquitectura |
| Prompt de reanudación / partida guardada (SETUP-04/05) | Browser / Client | — | Depende de `localStorage`, inexistente en el render prerenderizado (SSR) |
| Persistencia de progreso (PERS-01..03) | Browser / Client (`localStorage`) | — | Sin backend; ver Pitfall 7/8 de `PITFALLS.md` |
| Validación de contenido JSON (TECH-02) | Build / CI (Node, Vitest) | — | Debe fallar el build, nunca llegar al navegador — Zod corre solo en Node/test-time |
| Contenido de Marvel Champions (JSON versionado) | Build / Static bundle | CDN (tras `nuxt generate`) | Import estático en build, no fetch en runtime (evita estado de red que romper offline en Fase 4) |
| Servido de la app (HTML/JS/CSS prerenderizados) | CDN / Static (Netlify) | — | `nuxt generate` produce ficheros estáticos; sin servidor Node en producción |
| Cabecera de sesión persistente (FLOW-05, D-11) | Browser / Client | — | Deriva de estado reactivo del motor, no de la ruta |

No hay tier de Base de Datos/Storage servidor en este proyecto — es una restricción explícita del proyecto (`CLAUDE.md`, `PROJECT.md`), no un olvido.

<phase_requirements>
## Phase Requirements

| ID | Descripción | Soporte en esta investigación |
|----|-------------|-------------------------------|
| SEL-01 | Pantalla que pregunta a qué juego jugar | `## Pantallas y rutas`, componente `GameSelectorScreen` ya especificado en `01-UI-SPEC.md`; ruta `/` |
| SEL-02 | Elegir Marvel Champions y entrar en su flujo | Ruta `/[game]`, `content/games-index.ts` |
| SEL-03 | Warhammer 40.000 visible pero bloqueado | `status: 'coming-soon'` en `games-index.ts`, ya en `ARCHITECTURE.md` §4 |
| SEL-04 | Entender desde la primera pantalla que es guía, no buscador | Subtítulo ya redactado en `01-UI-SPEC.md`, sin trabajo de investigación adicional |
| SETUP-01/02/03 | Mini-setup de una pantalla, confirmar pasa a paso 1 | `MiniSetupForm`, ver `## Motor de flujo` para el punto de entrada `cursor=0` |
| SETUP-04/05 | Prompt explícito continuar/nueva, nunca reanuda en silencio | `## Persistencia y versionado de contenido`, `resume()` puro, Pitfall 8 |
| FLOW-01/02 | Siguiente prominente, Atrás | `## Motor de flujo`, `next()`/`prev()` puros |
| FLOW-05 | Cabecera con fase y posición | `AppHeader` (ya en `01-UI-SPEC.md`), datos derivados de `FlatStepNode` |
| FLOW-06 | Índice de salto | `## Índice de salto = fases del esquema`, mapeo directo blocks↔phases |
| CONT-01 | Preparación de mesa completa paso a paso | `## Preparación de mesa de Marvel Champions verificada` (21 pasos) |
| CONT-08 | Cita de origen por paso con regla | Campo `citation` en el esquema, tabla de 21 pasos con página/sección |
| CONT-10 | Imperativo, breve, sin copiar texto con copyright | Redacción propia en la tabla de 21 pasos; ninguna cita es copia literal |
| CONT-11 | Un paso = una acción física inequívoca | Presupuesto de caracteres (`01-UI-SPEC.md`) + regla de re-split; ver Pitfall "granularidad" |
| ADAPT-01 | Variantes por dificultad | Confirmado con cita oficial (p.28, "Modes of Play") que SÍ hay diferencias de dificultad en el propio setup — ver hallazgo dedicado |
| ADAPT-02 (reescrito por D-10) | Nº de jugadores en cabecera, no en el texto del paso | Ya resuelto por diseño: `SessionContext` nunca se interpola en `text` |
| ADAPT-03 | Fórmulas tal cual | Confirmado con cita oficial del "Per Player Icon" (multiplicador por jugador) |
| UI-01..05 | Legibilidad, tamaño táctil, pulgar, orientación, tema oscuro | Ya resuelto en `01-UI-SPEC.md`; esta investigación traduce esos tokens a Tailwind v4 `@theme` |
| PERS-01/02/03 | Guardar posición, recuperar exacto, detectar contenido desactualizado | `## Persistencia y versionado`, ajuste del `formatVersion`/`contentVersion` |
| TECH-01 | Contenido en fichero versionado, sin backend | Ya satisfecho por diseño |
| TECH-02 | Contenido mal formado falla CI | `## Validación de contenido en CI` |
| TECH-03 | Motor cubierto por tests: cierre de bucle, salto, reanudación desactualizada | `## Estrategia de tests del motor` |
| TECH-04 | Añadir juego = añadir fichero, sin tocar motor | Confirmado; ver `## Índice de salto = fases del esquema` (nada hardcodeado a Marvel Champions) |
| TECH-05 | App publicada en URL | `## Despliegue preparado, no ejecutado` — no bloquea el resto de la fase (D-17) |

</phase_requirements>

---

## Hallazgos y ajustes sobre la investigación previa

Estos tres puntos son el valor añadido más importante de esta investigación: `ARCHITECTURE.md` es de alta calidad pero se escribió **antes** de `01-CONTEXT.md`/`01-UI-SPEC.md`, y esas dos decisiones locked crean fricciones puntuales y concretas que el planner debe resolver, no ignorar.

### 1. El campo `detail` de `ARCHITECTURE.md` contradice D-05 — usar `warning`, no `detail`

`ARCHITECTURE.md` §2 define `TextBlock.detail` como "elaboración opcional, mostrada más pequeña". Pero D-05 es explícito: **"Nada de detalle desplegable ni bloques '¿Por qué?' en v1"**. Lo que sí existe es la **línea de aviso de trampa** (`⚠ NO se barajan en el mazo de encuentros`), que es un concepto distinto: no es una elaboración opcional del texto, es una advertencia condicional con semántica y color propios (ámbar, icono fijo) definida en `01-UI-SPEC.md`.

**Recomendación:** en el esquema del planner, sustituir `detail?: string` por `warning?: string` (la línea de aviso, presupuesto ≤60 caracteres por `01-UI-SPEC.md`), y no implementar ningún campo de detalle expandible. Si en el futuro se quisiera un "¿Por qué?" (ya anotado como candidato diferido en `01-CONTEXT.md` §deferred), sería un campo nuevo, no una reutilización de `detail`.

```typescript
// engine/types.ts — corregido respecto a ARCHITECTURE.md
export interface TextBlock {
  text: string       // frase de acción dominante — se muestra grande, se locuta por defecto
  warning?: string   // línea de aviso de trampa (D-05) — solo si el paso tiene trampa; ≤60 caracteres
  speech?: string    // override de lo que locuta la Fase 3 — campo reservado, no usado en Fase 1
}
```

### 2. "Mesa lista" (D-03) no rompe el modelo de array plano — se autora como un paso más, no como estado nuevo del motor

`ARCHITECTURE.md` no conocía la pantalla "mesa lista" (decidida después, en D-03). Dos formas de encajarla:

- **Rechazada:** tratar `cursor === length` como un estado "fuera de array" (un centinela). Obligaría a tocar `next()`/`prev()` — que hoy hacen `cursor = min(cursor+1, length-1)` — para permitir avanzar un índice más allá del último real, y a enseñar a todos los componentes de arriba a distinguir "estoy en un paso" de "estoy en el final". Complejidad evitable.
- **Recomendada:** "mesa lista" es **el último paso autorado de la sección `setup`**, con un campo discriminador `kind: 'step' | 'summary'` (por defecto `'step'`) en `StepDefinition`. El composable decide qué componente renderizar (`StepDisplay` vs `MesaListaScreen`) mirando `kind`, no la posición del cursor. `checklist` se deriva de los títulos de las fases hermanas (`phases.map(p => p.title)`), tal como exige `01-UI-SPEC.md` ("nunca hand-typed twice"). Esto significa que **`next()`/`prev()`/`jumpTo()` no cambian ni una línea** respecto al pseudocódigo de `ARCHITECTURE.md` §1 — la pantalla "mesa lista" es pura autoría de contenido, cero cambio de motor.

Consecuencia directa: pulsar "EMPEZAR A JUGAR" desde "mesa lista" en esta fase es, con el motor tal cual, un `next()` que queda clampeado en el mismo índice (no hay más pasos después del último). Es el comportamiento correcto para esta fase — el slot está "reservado" (per `01-UI-SPEC.md`) sin necesitar lógica especial. Recomendación explícita para el plan: dejarlo así (no-op) y anotarlo como comportamiento intencional en el plan, no como bug pendiente.

### 3. La regla "exactamente una sección con `repeats:true`" no se cumple en esta fase — relajarla ahora, cerrarla en Fase 2

El `superRefine` de `ARCHITECTURE.md` exige `repeating.length === 1`. El contenido real de esta fase (`content/marvel-champions.json`) solo tiene la sección `setup` (`repeats: false`) — la sección `round` (`repeats: true`) no se autora hasta la Fase 2. Con la regla tal cual, la validación Zod fallaría siempre en CI durante esta fase entera.

**Recomendación:** relajar la invariante en esta fase a `repeating.length <= 1` (cero o una), y dejar una nota `// TODO(fase 2): endurecer a === 1 cuando exista la sección "round"` junto al `superRefine`. Esto no relaja nada peligroso: con cero secciones repetibles, `expand()` simplemente no calcula `loopStartIndex`/`loopEndIndex` (quedan `undefined`), y el motor de esta fase nunca los necesita porque no hay bucle que cerrar todavía — el cierre de bucle se prueba en el fixture de test (ver `## Estrategia de tests del motor`), no contra el contenido real de Marvel Champions.

### 4. Los bloques del índice (D-13) son las `phases` del esquema — no un concepto nuevo

`01-CONTEXT.md` deja como discreción "cómo se agrupan los pasos en bloques", pero `ARCHITECTURE.md` ya tiene exactamente el concepto correcto: `PhaseDefinition`. Los seis bloques aprobados por el usuario (Héroes, Archienemigos, Mazo de encuentros, Escenario del villano, Manos iniciales, Jugador inicial) son, uno a uno, las seis `phases` de la sección `setup`. `IndexOverlay`'s prop `blocks` se deriva directamente agrupando la secuencia aplanada por `phaseId`+`phase.title` — el helper que `ARCHITECTURE.md` §7 ya preveía como "small engine addition: listSteps()/table-of-contents helper" (paso 6 del build order) es exactamente esto, y confirma TECH-04 sin ningún concepto nuevo:

```typescript
// engine/toc.ts — nuevo, pequeño, puro
export function tableOfContents(sequence: RuntimeStepNode[], cursor: number) {
  const byPhase = groupConsecutiveBy(sequence, n => n.phaseId)
  return byPhase.map(group => ({
    label: group[0].phaseTitle,          // "HÉROES", "ARCHIENEMIGOS", ...
    steps: group.map(node => ({
      id: node.runtimeId,
      label: node.step.title,
      mark: indexOf(node) < cursor ? 'done' : indexOf(node) === cursor ? 'current' : null,
    })),
  }))
}
```

### 5. Difficulty variants deben ser cambio de TEXTO en un paso fijo, nunca la presencia/ausencia del paso

Consecuencia directa de FLOW-05/D-11: la cabecera muestra `PREPARACIÓN · 8 de 21` — un denominador **fijo**. Si un paso apareciera o desapareciera según la dificultad elegida (p. ej. "solo en Experto añadid el conjunto Experto"), el total dejaría de ser 21 en un modo y 20 en otro, rompiendo la cabecera y el índice (que asumen una secuencia de longitud constante una vez fijados `playerCount`/`difficulty` en `expand()` — de hecho `expand()` ya se ejecuta *después* del mini-setup, así que en teoría la longitud sí podría depender de `difficulty`, pero **no debería**: nada en `01-UI-SPEC.md` ni en `01-CONTEXT.md` contempla una cabecera con denominador variable, y el índice de salto asume la misma lista de bloques para cualquier partida). **Regla dura para la autoría de contenido:** una diferencia de dificultad es siempre `variants.difficulty.{normal,expert}.text` sobre un paso que existe siempre, nunca un paso condicionalmente incluido. Ver el paso "Conjunto de encuentro adicional" en la tabla de 21 pasos más abajo como ejemplo aplicado.

---

## Preparación de mesa de Marvel Champions verificada (CONT-01, CONT-08, CONT-10, CONT-11)

Fuente primaria: `/Users/vcompanyb/Downloads/mc_rulesreference_v17-compressed.pdf` (Rules Reference v1.7), extraído con `pdftotext -layout` en esta misma sesión de investigación y confirmado página por página con extracción `-f/-l` individual (no solo el volcado corrido, que desplaza los números de página en algunos tramos — ver nota de discrepancia abajo).

### El Apéndice II: Setup oficial tiene 16 pasos — confirmado en PDF página 49 (`[VERIFIED: PDF oficial]`)

```
APPENDIX II: SETUP — Rules Reference v1.7, página 49 (confirmado por extracción -f 49 -l 49)
1.  Select Identities
2.  Set Hit Points
3.  Select First Player
4.  Set Aside Obligations
5.  Set Aside Nemesis Sets
6.  Shuffle Player Decks
7.  Collect Tokens and Status Cards
8.  Select Scenario
9.  Set the Villain's Hit Points
10. Create the Encounter Deck
11. Put Setup Cards Into Play
12. Resolve Scenario Setup and When Revealed Abilities (a/b/c)
13. Campaign Setup (solo si se juega en campaña — fuera de alcance v1)
14. Draw Cards
15. Resolve Mulligans
16. Resolve Player Setup Abilities
```

**Nota de discrepancia con `PITFALLS.md`:** ese documento cita el Apéndice II como "p.48" en dos filas de su checklist (obligaciones y nemesis). La extracción página-por-página de esta sesión confirma que el Apéndice II: Setup empieza en la **página 49** (la página 48 es "Appendix I: Deck Customization / Encounter Decks", una sección distinta). Es un desfase de una página, probablemente por cómo `pdftotext -layout` en modo corrido intercala pies de página de columnas vecinas. Usar **página 49** como cita canónica para cualquier paso de esta tabla que remita al Apéndice II.

### Los 16 pasos oficiales no se corresponden 1:1 con los 21 pasos finos que pide D-01 — desglose propuesto

D-01 pide granularidad fina (~21 pasos) agrupados en los 6 bloques de D-13, con las acciones simultáneas de todos los jugadores colapsadas en un paso plural (D-02). La correspondencia entre el Apéndice II oficial y los 6 bloques **no es un simple reagrupamiento in situ**: dos reordenamientos son necesarios y ambos son seguros (ninguna acción posterior depende de una acción que en la nueva secuencia ocurre después):

1. **"Select First Player" (paso oficial 3) se mueve al final**, al bloque JUGADOR INICIAL. Nada en los pasos 4-16 depende de quién sea el primer jugador — es una decisión que solo importa cuando arranca la partida real (Fase 2). El propio bloque `01-CONTEXT.md` ya asume este movimiento (el bloque "Jugador inicial" es el último bloque en el índice aprobado).
2. **La elección de escenario/villano (parte de "Select Scenario", paso oficial 8) se adelanta y se funde con la decisión de héroes**, en el primer paso del bloque HÉROES. Esto es necesario porque el bloque MAZO DE ENCUENTROS (que en el índice aprobado va **antes** que ESCENARIO DEL VILLANO) necesita saber ya qué escenario se juega para poder reunir "los conjuntos de encuentro indicados en la carta de escenario" (paso oficial 10, cita textual) — si el orden de bloques del índice aprobado se respeta literalmente, la decisión de qué villano se enfrenta tiene que haberse tomado antes, no en mitad del bloque de Escenario del villano.

Estos dos ajustes de orden son responsabilidad de la autoría de contenido, no del motor — el motor no impone ningún orden salvo el que dicte el array `phases`/`steps` autorado.

### Tabla de 21 pasos propuesta (borrador verificado, pendiente de repaso final por quien autore el contenido)

Convención de citas: `RR v1.7, p.<página>, <sección/paso oficial>`. Ningún texto de esta tabla es copia literal del reglamento (CONT-10) — son redacciones propias derivadas de la regla, en imperativo plural.

| # | Bloque | Texto del paso (propuesto) | Aviso (D-05) | Cita (CONT-08) |
|---|--------|------------------------------|--------------|-----------------|
| 1 | HÉROES | Decidid, como grupo, qué villano vais a enfrentar y qué héroe llevará cada jugador. | — | RR p.49, Apéndice II paso 1 (decisión de identidad) + p.49 paso 8 (decisión de escenario, adelantada — ver nota de reordenamiento) |
| 2 | HÉROES | Colocad vuestra identidad por el lado Alter-Ego. | — | RR p.49, Apéndice II paso 1 |
| 3 | HÉROES | Ajustad vuestro dial de salud a la vida inicial de vuestra identidad. | — | RR p.49, Apéndice II paso 2 |
| 4 | ARCHIENEMIGOS | Localizad el conjunto de Archienemigo (Nemesis) de vuestra identidad. | — | RR p.29, "Nemesis Encounter Set" |
| 5 | ARCHIENEMIGOS | Contad las cartas de vuestro conjunto de Archienemigo. | — | RR p.29, "Nemesis Encounter Set" — **ver nota**: el número de cartas por conjunto varía según la identidad, no fijar "5" en el texto salvo que se verifique caso por caso |
| 6 | ARCHIENEMIGOS | Apartadlas fuera de la partida. | ⚠ NO se barajan en el mazo de encuentros | RR p.49, Apéndice II paso 5 ("set aside... out of play"); RR p.29 confirma que solo entran en juego por efecto de una carta concreta |
| 7 | MAZO DE ENCUENTROS | Reunid los conjuntos de encuentro indicados en la carta de escenario. | — | RR p.49, Apéndice II paso 10 ("sets listed on side 1A of the main scheme card") |
| 8 | MAZO DE ENCUENTROS | Añadid el conjunto de encuentro Estándar. | — | RR p.39, "Standard Set" ("added to most scenarios") |
| 9 | MAZO DE ENCUENTROS | Conjunto de encuentro adicional según la dificultad. | — | RR p.28, "Modes of Play — Expert Mode": variante Normal = "No añadáis ningún conjunto adicional en este paso." / variante Experto = "Añadid también el conjunto de encuentro Experto." **(ejemplo aplicado de ADAPT-01, ver hallazgo #5 — un único paso, texto que cambia, nunca un paso que aparece/desaparece)** |
| 10 | MAZO DE ENCUENTROS | Añadid las cartas de Obligación de cada identidad en juego. | ⚠ Puede haber más de una Obligación por identidad, no solo una por jugador | RR p.29, "Obligation": *"Each identity is associated with one or more obligation cards. If an identity is being played, all of that identity's associated obligation cards are shuffled into the encounter deck during setup."* — **esta es la corrección confirmada del borrador (D-canónico); el paso debe reflejar "una o más", nunca "una por jugador"** |
| 11 | MAZO DE ENCUENTROS | Barajad todos los conjuntos reunidos junto con las Obligaciones para formar el mazo de encuentros. | — | RR p.49, Apéndice II paso 10 |
| 12 | ESCENARIO DEL VILLANO | Colocad el mazo de villano y el mazo de escenario principal en el centro de la mesa. | — | RR p.49, Apéndice II paso 8 |
| 13 | ESCENARIO DEL VILLANO | Ajustad el dial de vida del villano a su vida impresa × nº de jugadores. | — | RR p.49, Apéndice II paso 9; multiplicador confirmado por RR "Per Player Icon" (glosario, índice p.31) |
| 14 | ESCENARIO DEL VILLANO | Preparad la reserva común de fichas de daño, amenaza, aceleración y cartas de estado. | — | RR p.49, Apéndice II paso 7 |
| 15 | ESCENARIO DEL VILLANO | Escenario según la dificultad. | — | RR p.28, "Modes of Play — Expert Mode": variante Normal = "Usad el escenario del villano en su cara estándar." / variante Experto = "Usad la cara del escenario del villano indicada para el modo Experto." |
| 16 | ESCENARIO DEL VILLANO | Voltead el escenario a su cara B y colocad la amenaza inicial indicada. | — | RR p.49, Apéndice II paso 12b; RR p.27, "Main Scheme" (colocar amenaza igual al valor de amenaza inicial al voltear) |
| 17 | ESCENARIO DEL VILLANO | Buscad cualquier carta con la palabra clave "Preparación" en mazos y zona apartada, y ponedla en juego. | — | RR p.49, Apéndice II paso 11 |
| 18 | MANOS INICIALES | Barajad vuestro mazo de jugador. | — | RR p.49, Apéndice II paso 6 |
| 19 | MANOS INICIALES | Robad cartas hasta completar vuestra mano inicial. | — | RR p.49, Apéndice II paso 14 |
| 20 | MANOS INICIALES | Podéis descartar cualquier número de cartas de vuestra mano y robar de nuevo hasta vuestra mano inicial (mulligan). | ⚠ No barajéis las cartas descartadas de vuelta al mazo en este momento | RR p.49, Apéndice II paso 15 |
| 21 | JUGADOR INICIAL | Resolved las habilidades de "Preparación" de vuestras cartas en juego y decidid quién es el jugador inicial. | — | RR p.49, Apéndice II pasos 16 y 3 (jugador inicial, reordenado — ver nota de reordenamiento) |

**Total: 21 pasos**, exactamente el objetivo de D-01. Notas importantes para quien autore el contenido definitivo:

- El paso 5 deja explícitamente sin verificar el número de cartas por conjunto de Archienemigo — no está en el Rules Reference como cifra general (varía por identidad). No inventar un número; verificarlo identidad por identidad al escribir el contenido real, o dejar el texto sin cifra como aquí.
- El paso 9 y el paso 15 son los dos únicos puntos donde el **propio setup** (no solo el bucle de ronda de Fase 2) tiene diferencia Normal/Experto — confirmado con cita textual de la página 28 ("Modes of Play"). Esto es un hallazgo nuevo respecto a `PITFALLS.md`/`ARCHITECTURE.md`, que solo hablaban de diferencias de dificultad durante la ronda.
- El paso 21 fusiona dos pasos oficiales no consecutivos (16 y 3) porque D-13 exige que "Jugador inicial" sea el último bloque — es la fusión más forzada de la tabla y la más recomendable de repasar con el grupo real durante el playtest (D-04).
- Ningún paso de esta tabla menciona el número real de jugadores en el texto (cumple D-08); el multiplicador se expresa como fórmula (`× nº de jugadores`), cumpliendo ADAPT-03 y D-07.

---

## Standard Stack

### Core (ya verificado por `STACK.md`, reverificado hoy en vivo — `[VERIFIED: npm registry]`)

| Library | Version | Purpose | Verificación |
|---------|---------|---------|---------------|
| nuxt | 4.5.2 | Framework de la app | `npm view nuxt version` → 4.5.2 (2026-08-28) |
| @vueuse/core | 14.4.0 | `useLocalStorage` (esta fase); `useSpeechSynthesis`/`useWakeLock` no se usan hasta Fase 3 | `npm view` → 14.4.0 |
| @vueuse/nuxt | 14.4.0 | Auto-import de VueUse en Nuxt | `npm view` → 14.4.0 |
| tailwindcss | 4.3.3 | Motor CSS | `npm view` → 4.3.3 |
| @tailwindcss/vite | 4.3.3 | Integración oficial con Vite/Nuxt | `npm view` → 4.3.3 |
| zod | 4.4.3 | Validación de contenido (Node/CI only) | `npm view` → 4.4.3 |
| vitest | 4.1.11 | Test runner del motor y del contenido | `npm view` → 4.1.11 |
| @nuxt/test-utils | 4.2.0 | Solo si se necesitan tests con contexto Nuxt (no necesario para `engine/`) | `npm view` → 4.2.0 |

**Ajuste de alcance respecto a `STACK.md` — no instalar `@vite-pwa/nuxt` en esta fase.** `01-CONTEXT.md` es explícito: "La instalación PWA y el funcionamiento offline son la Fase 4." `STACK.md` lista `@vite-pwa/nuxt` en el mismo bloque de instalación que el resto porque describe el proyecto completo, no esta fase. Instalarlo ahora sin usarlo añade una dependencia y una superficie de configuración (`registerType`, manifest) que no aporta nada hasta que exista un service worker que registrar, y complica innecesariamente el "Package Legitimacy Audit" de una fase que no lo necesita.

### Comando de scaffold actualizado (`[CITED: nuxt.com/docs/4.x/getting-started/installation]`)

`STACK.md` documentó `npx nuxi@latest init <nombre>`. La documentación oficial de Nuxt, revisada hoy, documenta como comando principal:

```bash
npm create nuxt@latest table-game-assistant
```

Ambos comandos siguen funcionando (`create-nuxt` invoca `nuxi init` internamente), pero `npm create nuxt@latest` es el que aparece en la página de instalación oficial vigente — usar este en el plan para evitar que quede documentado un comando que la propia Nuxt ya no destaca.

### Instalación mínima de esta fase

```bash
npm create nuxt@latest table-game-assistant
cd table-game-assistant
npm install @vueuse/core @vueuse/nuxt
npm install tailwindcss @tailwindcss/vite
npm install -D zod vitest @nuxt/test-utils
```

(`@vite-pwa/nuxt` y `@playwright/test` quedan fuera de esta fase — Fase 4 y post-v1 respectivamente, según `STACK.md` y `01-CONTEXT.md`.)

### Alternatives Considered

Ninguna nueva — `STACK.md` ya cerró esta discusión (Tailwind v4 frente a Nuxt UI, Zod frente a Valibot, composable frente a Pinia, Netlify frente a alternativas). Esta investigación no encontró motivo para reabrirla.

## Package Legitimacy Audit

Ejecutado con `slopcheck 0.6.1` (instalado en esta sesión vía `pip3 install slopcheck --break-system-packages`) contra los 9 paquetes que instala esta fase, más verificación cruzada de antigüedad y descargas semanales vía la API pública de npm.

| Package | Registry | Antigüedad | Descargas/semana | Repo fuente | slopcheck | Disposición |
|---------|----------|------------|-------------------|--------------|-----------|-------------|
| nuxt | npm | 9 años (creado 2016-10-26) | 1 984 356 | github.com/nuxt/nuxt | **[SUS]** — "Suspiciously close to 'next'. Could be a typosquat." | Aprobado — falso positivo, ver nota |
| vitest | npm | 4,7 años (creado 2021-12-03) | 97 341 085 | github.com/vitest-dev/vitest | **[SUS]** — "Suspiciously close to 'vite'. Could be a typosquat." | Aprobado — falso positivo, ver nota |
| @vueuse/core | npm | 6,7 años | 10 787 008 | (VueUse) | [OK] | Aprobado |
| @vueuse/nuxt | npm | 4,8 años | 544 449 | (VueUse) | [OK] | Aprobado |
| tailwindcss | npm | 8,9 años | 127 096 734 | (Tailwind Labs) | [OK] | Aprobado |
| @tailwindcss/vite | npm | 1,6 años | 46 610 358 | (Tailwind Labs) | [OK] | Aprobado |
| zod | npm | 6,5 años | 273 858 187 | (Colin McDonnell) | [OK] | Aprobado |
| @nuxt/test-utils | npm | 5,9 años | 693 292 | (nuxt) | [OK] — nota de heurística: "Name ends with '-utils' — classic LLM naming pattern... but package is established" | Aprobado |

**Paquetes eliminados por veredicto [SLOP]:** ninguno.
**Paquetes marcados [SUS]:** `nuxt`, `vitest`. **Nota explícita — falso positivo confirmado, no requiere checkpoint humano adicional:** la heurística de `slopcheck` marca ambos solo por similitud léxica con `next`/`vite`, sin relación real de typosquatting. Verificación cruzada: ambos tienen `repository.url` apuntando a los repos oficiales (`github.com/nuxt/nuxt`, `github.com/vitest-dev/vitest`), 9 y casi 5 años de antigüedad respectivamente, decenas de millones de descargas semanales, y son exactamente los paquetes que documentan `nuxt.com` y `vitest.dev` — la misma fuente oficial que ya cita `STACK.md`. Ninguno tiene script `postinstall` (`npm view <pkg> scripts.postinstall` → vacío para los 9 paquetes). El planner puede tratarlos como `[VERIFIED: npm registry]` sin gate adicional; se documentan aquí en vez de re-etiquetarlos silenciosamente para que quede constancia de por qué se descartó la alerta.

---

## Architecture Patterns

### System Architecture Diagram

```
Usuario en tablet
      │ toca "Marvel Champions" en /
      ▼
GameSelectorScreen (SEL-01..04) ──lee── content/games-index.ts (import estático)
      │ navega a /marvel-champions
      ▼
[runner page] ── onMounted ── usePersistedSession() ──lee── localStorage["tga:progress:marvel-champions"]
      │                                  │
      │                        ¿hay posición guardada?
      │                          │              │
      │                         no             sí
      │                          ▼              ▼
      │                 MiniSetupForm    ResumePrompt (SETUP-04, bloqueante)
      │                          │              │            │
      │                    confirmar      "Continuar"   "Empezar nueva" → ConfirmDialog → descarta y cae a MiniSetupForm
      │                          ▼              ▼
      │                 useGameSession().start({playerCount, difficulty})
      │                          │
      │                          ▼
      │              engine.expand(flatten(content), context) → sequence[], cursor=0
      │                          │
      │         ┌────────────────┼─────────────────────┐
      │         ▼                ▼                      ▼
      │   AppHeader        currentNode = sequence[cursor]   StepIndexOverlay (FLOW-06)
      │   (sectionLabel,         │                          (agrupa sequence por phaseId)
      │    position, ≡)          ▼
      │                  resolve.ts → TextBlock final (variants.difficulty + tokens)
      │                          │
      │            kind==='summary'? ──sí──▶ MesaListaScreen (D-03)
      │                          │no
      │                          ▼
      │                    StepDisplay (texto + warning si existe)
      │                          │
      │                    NavBand: Atrás/Siguiente
      │                          │
      │              tap Siguiente ─▶ navigator.next(session) [puro] ─▶ nuevo cursor/round
      │                          │
      │              debounced watch ─▶ usePersistedSession().save(...) ─▶ localStorage
      ▼
(build time, no en runtime) content/*.json ──Zod GameDefinitionSchema── Vitest suite en CI ──falla el build si es inválido (TECH-02)
```

### Recommended Project Structure

Igual que `ARCHITECTURE.md` §4, con dos añadidos: `engine/toc.ts` (hallazgo #4) y el rename `detail`→`warning` reflejado en `engine/types.ts` (hallazgo #1).

```
TableGameAssistant/
├── engine/
│   ├── types.ts            # StepDefinition.warning (no .detail), kind: 'step'|'summary'
│   ├── schema.ts            # Zod — repeating.length <= 1 en esta fase (hallazgo #3)
│   ├── flatten.ts
│   ├── expand.ts
│   ├── resolve.ts
│   ├── navigator.ts
│   ├── toc.ts               # NUEVO — agrupa por phaseId para el índice (hallazgo #4)
│   ├── persistence.ts
│   └── __tests__/
│       ├── navigator.test.ts
│       ├── expand.test.ts
│       ├── persistence.test.ts
│       └── fixtures/tiny-game.json   # SÍ debe incluir una sección repeats:true, aunque el
│                                       # contenido real de esta fase no la tenga — es la
│                                       # única forma de probar el cierre de bucle (TECH-03)
│                                       # antes de que exista en Marvel Champions (Fase 2)
├── content/
│   ├── games-index.ts
│   └── marvel-champions.json   # solo sección "setup", repeats:false — ver hallazgo #3
├── app/
│   ├── app.vue                  # incluye <meta viewport> de 01-UI-SPEC + #app-root/#orientation-guard
│   ├── assets/css/main.css      # @import "tailwindcss"; @theme { ... } — ver sección Tailwind abajo
│   ├── pages/
│   │   ├── index.vue
│   │   └── [game]/index.vue
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── StepDisplay.vue
│   │   ├── MesaListaScreen.vue
│   │   ├── NavBand.vue
│   │   ├── StepIndexOverlay.vue
│   │   ├── GameSelectorScreen.vue
│   │   ├── MiniSetupForm.vue
│   │   ├── ResumePrompt.vue
│   │   ├── ConfirmDialog.vue
│   │   ├── ContentChangedNotice.vue
│   │   └── OrientationGuardOverlay.vue
│   └── composables/
│       ├── useGameContent.ts
│       ├── useGameSession.ts
│       └── usePersistedSession.ts
├── public/icons/
├── netlify.toml              # preparado, no ejecutado (D-17) — ver sección dedicada
├── nuxt.config.ts
└── vitest.config.ts           # test.projects: [{name:'engine', environment:'node', include:['engine/**/*.test.ts']}]
```

### Pattern 1: Vitest "projects" para separar tests del motor (Node) de futuros tests de componentes (Nuxt)

**What:** un único `vitest.config.ts` con `test.projects`, no un `vitest.workspace.ts` (mecanismo antiguo) ni dos configs separados.
**When to use:** desde el primer commit de tests de esta fase, aunque hoy solo exista el proyecto `engine`.
**Example:**
```typescript
// Source: https://nuxt.com/docs/4.x/getting-started/testing (WebFetch, 2026-08-28)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'engine',
          include: ['engine/**/*.test.ts'],
          environment: 'node',   // engine/ no toca el DOM — no paga coste de jsdom
        },
      },
      // futuro (Fase 4+): { test: { name: 'nuxt', environment: 'nuxt', include: ['app/**/*.test.ts'] } }
    ],
  },
})
```
Esto resuelve directamente TECH-03 sin acoplar el motor a `@nuxt/test-utils`: el proyecto `engine` corre en `node`, rápido, sin mount.

### Pattern 2: Mapeo de tokens de `01-UI-SPEC.md` a Tailwind v4 `@theme`

**What:** Tailwind v4 usa CSS-first config; cada namespace (`--color-*`, `--text-*`, `--spacing-*`, `--font-weight-*`) genera utilidades nombradas automáticamente.
**When to use:** en `app/assets/css/main.css`, una sola vez, antes de escribir ningún componente.
**Example:**
```css
/* Source: https://tailwindcss.com/docs/theme (WebFetch, 2026-08-28) */
@import "tailwindcss";

@theme {
  /* Color — 01-UI-SPEC.md §Color */
  --color-background: #14161C;   /* Dominante 60% */
  --color-surface: #1E212B;      /* Secundario 30% */
  --color-primary-text: #F2F3F5;
  --color-secondary-text: #9AA0AC;
  --color-accent: #2F81F7;
  --color-warning: #FFB020;
  --color-destructive: #FF5C5C;
  --color-on-accent: #0B1220;    /* texto sobre fill de accent/destructive */

  /* Spacing — 01-UI-SPEC.md §Spacing Scale (named, no numeric) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;

  /* Typography — 01-UI-SPEC.md §Typography (4 tamaños exactos) */
  --text-display: 2.5rem;
  --text-display--line-height: 1.2;
  --text-heading: 1.75rem;
  --text-heading--line-height: 1.25;
  --text-body: 1.25rem;
  --text-body--line-height: 1.5;
  --text-label: 1.125rem;
  --text-label--line-height: 1.2;
}
```
Genera directamente `bg-background`, `text-primary-text`, `p-lg`, `gap-2xl`, `text-display`, `text-label` — sin capa de traducción adicional. `font-bold`/`font-normal` (pesos 700/400 del contrato) ya existen en Tailwind por defecto, no requieren `--font-weight-*` custom.

`portrait:`/`landscape:` (usados por `OrientationGuardOverlay` en `01-UI-SPEC.md`) son variantes de Tailwind ya incluidas de fábrica desde v3 — no requieren configuración adicional en v4.

### Anti-Patterns to Avoid

- **No usar `--spacing` (escalar único) para el spacing scale nombrado.** `--spacing` (sin namespace) es el multiplicador base de las utilidades numéricas (`p-1`, `p-2`...). Los tokens nombrados de `01-UI-SPEC.md` (`xs`, `sm`, `md`...) necesitan el namespace `--spacing-xs`, `--spacing-sm`, etc. — confundir ambos produce utilidades `p-4` en vez de `p-md`.
- **No usar `ssr: false`.** `CLAUDE.md` lo descarta explícitamente a favor de `nuxt generate`. `PITFALLS.md` (escrito antes que `CLAUDE.md`) sugería `ssr:false` como opción "más simple" para evitar hidratación — ver sección dedicada más abajo para cómo resolver esa fricción sin `ssr:false`.
- **No hacer fetch del JSON de contenido en runtime.** Ya cubierto por `ARCHITECTURE.md` Anti-Patrón 3 — import estático, siempre.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Reactividad de `localStorage` con SSR-safety | Un wrapper manual de `localStorage.getItem/setItem` con guards de `typeof window` | `@vueuse/core`'s `useLocalStorage` | Ya maneja el caso "SSR devuelve el valor por defecto, cliente hidrata con el real" sin código propio — ver Pitfall de hidratación abajo, igualmente hay que envolver la LECTURA inicial en `onMounted`, VueUse no elimina esa responsabilidad |
| Validación de esquema de contenido | Un validador manual de "¿tiene esta clave, es este tipo?" | Zod (`GameDefinitionSchema.superRefine`) | Mensajes de error legibles, inferencia de tipos TS gratis, ya especificado en `ARCHITECTURE.md` §2 |
| Selección de fuente Sans para legibilidad tablet | Diseñar una escala tipográfica desde cero | Los 4 tamaños/2 pesos exactos ya fijados en `01-UI-SPEC.md` + Inter autoalojada | Ya resuelto y verificado (contraste WCAG) por el UI-checker; no hay decisión de diseño pendiente en esta fase |
| Comparación de versión de contenido para detectar "guardado obsoleto" | Un diff estructural del JSON viejo contra el nuevo | Comparación entera simple de `contentVersion` (número que se bumpea a mano) | `ARCHITECTURE.md` §6 ya lo resolvió: "bump on every deploy that touches that game's content file, full stop" — cualquier heurística más lista introduce falsos negativos |

**Key insight:** esta fase no tiene ningún problema genuinamente nuevo que resolver con una librería — toda la superficie de "no reinventar la rueda" ya estaba cubierta por `ARCHITECTURE.md`/`STACK.md`. El trabajo real de esta fase es de **ajuste y aplicación**, no de elección de herramientas.

---

## Motor de flujo (resumen operativo para el planner)

Sin cambios respecto al pseudocódigo de `ARCHITECTURE.md` §1 — se reproduce aquí solo para que el planner no tenga que saltar entre documentos, con la corrección de que en esta fase `loopStartIndex`/`loopEndIndex` pueden ser `undefined` (hallazgo #3):

```typescript
function next(session: EngineSession): EngineSession {
  if (session.loopEndIndex !== undefined && session.cursor === session.loopEndIndex) {
    return { ...session, cursor: session.loopStartIndex!, round: session.round + 1 }
  }
  return { ...session, cursor: Math.min(session.cursor + 1, session.sequence.length - 1) }
}

function prev(session: EngineSession): EngineSession {
  if (session.loopStartIndex !== undefined && session.cursor === session.loopStartIndex && session.round > 1) {
    return { ...session, cursor: session.loopEndIndex!, round: session.round - 1 }
  }
  return { ...session, cursor: Math.max(session.cursor - 1, 0) }
}

function jumpTo(session: EngineSession, runtimeId: string): EngineSession {
  const cursor = session.sequence.findIndex(n => n.runtimeId === runtimeId)
  return { ...session, cursor }   // round no cambia — un salto es "mirar", no transicionar de ronda
}
```

Sin sección `repeats:true` en el contenido real de esta fase, `next()` en el último paso (índice 20, "mesa lista") queda clampeado ahí — comportamiento correcto (hallazgo #2).

---

## Persistencia y versionado de contenido

Sin cambios de fondo respecto a `ARCHITECTURE.md` §6. Resumen de la forma persistida y su ciclo de vida, con el ajuste de nombre de campo (`warning` no `detail`, irrelevante para el shape persistido) y una precisión sobre PERS-03:

```typescript
interface PersistedPosition {
  formatVersion: 1
  gameId: string
  contentVersion: number
  runtimeId: string
  round: number
  context: { playerCount: number; difficulty: 'normal' | 'expert' }
  updatedAt: string
}
```

**Regla de decisión al cargar (PERS-01/02/03, SETUP-04):**
1. Sin registro guardado → `MiniSetupForm` directo, sin preguntar nada.
2. Registro guardado, `contentVersion` coincide, `runtimeId` existe en la secuencia actual → `ResumePrompt` mostrando el resumen (`"PREPARACIÓN · 8 de 21 · 3 jug · Normal"`); el usuario decide.
3. Registro guardado pero `contentVersion` no coincide, o `runtimeId` ya no existe → **no** se ofrece "Continuar" normal; se aplica directamente el flujo de `ContentChangedNotice` (D-específico de `01-UI-SPEC.md`): vuelve al inicio de la sección actual, conservando `playerCount`/`difficulty`, con un único botón "ENTENDIDO". Esto es management explícito de PERS-03, y `01-UI-SPEC.md` ya especificó la pantalla — esta investigación solo conecta esa pantalla con la lógica de `persistence.ts` que decide cuándo mostrarla.

**Nota de disciplina de versión:** dado que en esta fase el contenido son 21 pasos de una sola sección, cualquier edición de `content/marvel-champions.json` (incluida una corrección de texto tras revisar el playtest, D-04) debe ir acompañada de un incremento de `contentVersion` — no hay atajo seguro ("es solo un typo") porque el propio `PERS-03` depende de que el número cambie siempre que el fichero cambie.

---

## Resolución de la tensión SSR/hidratación (Pitfall 7 de `PITFALLS.md` vs. decisión `nuxt generate` de `CLAUDE.md`)

`PITFALLS.md` (anterior a `CLAUDE.md`) proponía `ssr: false` como la vía "más simple y robusta" para evitar el Pitfall de hidratación de `localStorage`. `CLAUDE.md` cierra esa decisión de forma explícita a favor de `nuxt generate` (`ssr: true` + prerender), por las razones ya dadas allí (primer pintado instantáneo, service worker más limpio de cachear en Fase 4). **Esto no es una contradicción real** — `PITFALLS.md` ya ofrecía la alternativa exacta que hace falta: *"If any SSR/prerendering is kept... isolate it strictly from the stateful game-runner component, which should be `<ClientOnly>` or client-only-rendered."*

Aplicado a esta fase:
- La página `/` (selector) se prerenderiza sin problema — no lee `localStorage`.
- La página `/[game]` (runner) debe envolver el bloque que decide "¿reanudo o empiezo?" en un guard de cliente (`<ClientOnly>` o `v-if="mounted"` fijado en `onMounted`), mostrando un placeholder neutro (no "step 1", no el `MiniSetupForm`, un simple estado de carga) hasta que el cliente confirme si hay o no una posición guardada. Esto es exactamente la recomendación de `PITFALLS.md` Pitfall 7 ("treat 'restore saved position' as a post-mount operation... never baked into first paint"), sin necesitar `ssr:false`.

**Recomendación para el plan:** una tarea explícita de verificación (`checkpoint` o test) que confirme la ausencia de warnings de hidratación en `npm run dev` al cargar `/marvel-champions` con y sin una posición guardada en `localStorage` — es barato de comprobar y es exactamente el tipo de regresión silenciosa que este pitfall describe.

---

## Despliegue preparado, no ejecutado (D-16/D-17, TECH-05)

Sin `gh` ni la CLI de Netlify instaladas en esta máquina (confirmado en esta sesión: `command -v gh` y `command -v netlify` fallan ambos). El repo local no tiene remoto configurado. Nada de esto bloquea el resto de la fase (D-17) — el entregable es la configuración, no el despliegue.

### `netlify.toml` recomendado

Verificado contra la documentación oficial de Nitro (`nitro.build/deploy/providers/netlify`, WebFetch 2026-08-28): Nitro **autodetecta** el entorno de build de Netlify y no requiere `netlify.toml` para que el sitio se sirva — pero **no** genera automáticamente cabeceras de caché personalizadas, y esas cabeceras son exactamente lo que `CLAUDE.md` pide dejar preparado para el `sw.js`/`manifest.webmanifest` que llegarán en Fase 4. La documentación oficial de `vite-pwa-org` para Netlify tampoco incluye una regla de `Cache-Control` para `sw.js` en su ejemplo (confirmado por WebFetch de esa página en esta sesión) — es, como ya señalaba `CLAUDE.md`, una brecha real de la documentación oficial que el propio proyecto debe cerrar a mano.

```toml
# netlify.toml — preparado en Fase 1, no desplegado (D-17)
[build]
  command = "npm run generate"
  publish = ".output/public"

# Aún no existen /sw.js ni /manifest.webmanifest en Fase 1 (llegan en Fase 4 con @vite-pwa/nuxt),
# pero declarar la regla ahora es barato y evita olvidarla cuando ese módulo se instale.
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Cache-Control = "no-cache"
    Content-Type = "application/manifest+json"

[[headers]]
  for = "/_nuxt/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**Confianza:** `[CITED: nitro.build/deploy/providers/netlify, vite-pwa-org.netlify.app/deployment/netlify]` para la forma general del fichero; `[ASSUMED]` la ruta exacta `.output/public` como publish dir cuando el preset de Nitro es completamente estático (el doc oficial de Nitro menciona genéricamente `dist` para el preset `netlify` con funciones; para el modo 100% estático de `nuxt generate` el directorio de salida estándar de Nuxt es `.output/public` — esto debe confirmarse con una build real de prueba antes de fijar el `netlify.toml`, ya que Nitro podría autodetectar el publish dir igualmente sin que este valor importe).

### `.gitignore` mínimo esperado

```
node_modules/
.nuxt/
.output/
.data/
dist/
*.log
.DS_Store
```

---

## Common Pitfalls

### Pitfall 1: Modelar una diferencia de dificultad como paso presente/ausente

**What goes wrong:** el índice y la cabecera (`8 de 21`) asumen una secuencia de longitud fija por partida. Si "añadir el conjunto Experto" se modela como un paso que solo existe en modo Experto, el denominador cambia según la dificultad y el índice ya no coincide entre partidas Normal y Experto.
**Why it happens:** parece natural: "en Normal este paso no aplica, quítalo".
**How to avoid:** siempre `variants.difficulty.{normal,expert}.text` sobre un paso que existe siempre (ver hallazgo #5 y pasos 9/15 de la tabla de 21).
**Warning signs:** cualquier lógica de contenido que decida "incluir este step si difficulty === 'expert'" en vez de "usar este texto si difficulty === 'expert'".

### Pitfall 2: Copiar la cifra "5 cartas" del Archienemigo sin verificar la identidad concreta

**What goes wrong:** el mockup aprobado en `01-CONTEXT.md` usa "Contad las 5 cartas" como ejemplo ilustrativo del diseño de pantalla, no como dato de reglas verificado — el Rules Reference no fija un número universal de cartas por conjunto de Nemesis (varía por identidad).
**Why it happens:** la maqueta aprobada es fácil de confundir con contenido verificado porque está redactada como si lo fuera.
**How to avoid:** dejar el paso 5 genérico ("Contad las cartas de vuestro conjunto de Archienemigo") salvo que se verifique el número exacto para cada héroe incluido en el contenido real, identidad por identidad.
**Warning signs:** un número hardcodeado en el texto de un paso sin una cita de página que lo respalde específicamente (viola CONT-08 en espíritu, aunque el campo `citation` exista).

### Pitfall 3: Reordenar pasos oficiales sin verificar dependencias físicas

**What goes wrong:** D-13 obliga a un orden de bloques (Mazo de encuentros antes que Escenario del villano; Jugador inicial al final) que no coincide con el orden literal del Apéndice II oficial. Reordenar sin comprobar dependencias podría, en teoría, colocar un paso antes de que su prerrequisito físico exista (p. ej. barajar el mazo de encuentros antes de saber qué conjuntos lo componen).
**Why it happens:** el índice de salto (D-13) es una decisión de UX tomada antes de que existiera el desglose completo de 21 pasos; nadie comprobó las 16 dependencias oficiales contra el nuevo orden hasta esta investigación.
**How to avoid:** los dos reordenamientos identificados en esta investigación (mover "elegir primer jugador" al final; adelantar la elección de escenario/villano al primer paso) ya están verificados como seguros — cualquier reordenamiento ADICIONAL que se le ocurra a quien autore el contenido final debe pasar la misma pregunta: "¿depende algún paso posterior de que esta acción ya se haya hecho?"
**Warning signs:** un paso que dice "el conjunto indicado en la carta de escenario" en un punto de la secuencia donde el escenario todavía no se ha decidido.

### Pitfall 4: Confundir el `--spacing` escalar de Tailwind v4 con el namespace `--spacing-*`

**What goes wrong:** declarar `--spacing: 24px` en vez de `--spacing-lg: 24px` cambia el multiplicador BASE de todas las utilidades numéricas (`p-1` pasaría a valer 24px en vez de 0.25rem), rompiendo cualquier utilidad numérica usada en cualquier parte de la app.
**Why it happens:** la documentación de Tailwind v4 usa `--spacing` (sin sufijo) en su ejemplo introductorio, y es fácil copiarlo sin fijarse en que los tokens NOMBRADOS de `01-UI-SPEC.md` necesitan el namespace con sufijo.
**How to avoid:** usar siempre `--spacing-xs`, `--spacing-sm`, etc. — nunca redefinir el `--spacing` escalar salvo que se quiera cambiar deliberadamente la base de TODA la escala numérica de Tailwind.
**Warning signs:** cualquier utilidad `p-1`/`p-2`/`gap-4` etc. que de repente tenga un tamaño inesperado tras tocar el tema.

### Pitfall 5: Dejar `content/marvel-champions.json` con la sección `round` a medias "por si acaso"

**What goes wrong:** la tentación de adelantar trabajo de Fase 2 añadiendo una sección `round` vacía o con un placeholder para "que el schema no falle" reintroduce exactamente el problema que el hallazgo #3 resuelve de forma más simple (relajar la invariante), y further, viola el pitfall de scope-creep ya documentado en `PITFALLS.md` Pitfall 9 ("Starting the generic step-engine abstraction... before a single real playthrough... has validated").
**How to avoid:** aplicar el hallazgo #3 (relajar `repeating.length <= 1`), no añadir contenido de relleno de la Fase 2.

---

## Code Examples

### Zod schema ajustado para esta fase (`engine/schema.ts`)

```typescript
// Ajustes respecto a ARCHITECTURE.md §2: TextBlockSchema.detail → .warning con .max(60);
// StepSchema.text con .max(90) (presupuesto de caracteres de 01-UI-SPEC.md);
// superRefine relajado a "cero o una" sección repeats:true (hallazgo #3)
import { z } from 'zod'

const idPattern = /^[a-z0-9]+(\.[a-z0-9]+)*$/

const CitationSchema = z.object({
  source: z.enum(['rules-reference', 'learn-to-play']),
  section: z.string().min(1),
  page: z.number().int().positive().optional(),
})

const TextBlockSchema = z.object({
  text: z.string().min(1).max(90),      // presupuesto duro de 01-UI-SPEC.md
  warning: z.string().max(60).optional(), // NO "detail" — ver hallazgo #1
  speech: z.string().optional(),          // reservado para Fase 3, sin usar aquí
})

const StepSchema = TextBlockSchema.extend({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  kind: z.enum(['step', 'summary']).default('step'),   // NUEVO — ver hallazgo #2
  variants: z.object({
    difficulty: z.object({
      normal: TextBlockSchema.partial().optional(),
      expert: TextBlockSchema.partial().optional(),
    }).optional(),
  }).optional(),
  citation: CitationSchema.optional(),
})

const PhaseSchema = z.object({
  id: z.string().regex(idPattern),
  title: z.string().min(1),     // "HÉROES", "ARCHIENEMIGOS"... — fuente del índice (hallazgo #4)
  steps: z.array(StepSchema).min(1),
})

const SectionSchema = z.object({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  repeats: z.boolean(),
  phases: z.array(PhaseSchema).min(1),
})

export const GameDefinitionSchema = z.object({
  gameId: z.string().regex(idPattern),
  title: z.string().min(1),
  locale: z.literal('es'),
  contentVersion: z.number().int().positive(),
  sections: z.array(SectionSchema).min(1),
}).superRefine((game, ctx) => {
  const repeating = game.sections.filter(s => s.repeats)
  if (repeating.length > 1) {   // "<= 1" en Fase 1 — TODO(fase 2): endurecer a === 1
    ctx.addIssue({ code: z.ZodIssueCode.custom,
      message: `At most one section may have repeats:true, found ${repeating.length}` })
  }
  const allIds = game.sections.flatMap(s =>
    [s.id, ...s.phases.flatMap(p => [p.id, ...p.steps.map(st => st.id)])])
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i)
  if (dupes.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate ids: ${[...new Set(dupes)].join(', ')}` })
  }
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `npx nuxi@latest init` (documentado en `STACK.md`) | `npm create nuxt@latest` | Documentación oficial vigente hoy | Ambos funcionan; usar el vigente en las instrucciones del plan |
| `vitest.workspace.ts` para separar entornos de test | `test.projects` dentro de un único `vitest.config.ts` | Documentado como recomendación actual de Nuxt Testing | Un solo fichero de config para el proyecto `engine` (node) y futuros proyectos `nuxt` (Fase 4+) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | El directorio de publicación de Netlify para `nuxt generate` es `.output/public` | Despliegue preparado | Bajo — Nitro autodetecta el preset de Netlify igualmente; si el valor es incorrecto, una build de prueba (aunque no se despliegue de verdad esta fase) lo revela de inmediato |
| A2 | El número de cartas del conjunto de Archienemigo (Nemesis) varía por identidad y no debe fijarse en "5" | Preparación de mesa verificada, paso 5 | Bajo — el propio Rules Reference no lo contradice ni lo confirma como cifra universal; dejar el texto genérico es la opción segura por diseño |
| A3 | Mover "elegir primer jugador" al final y adelantar la elección de escenario/villano al primer paso no viola ninguna dependencia física de las 16 reglas oficiales de setup | Preparación de mesa verificada | Medio — si el playtest real (D-04) revela que el grupo prefiere decidir el primer jugador antes (p. ej. porque afecta a qué mano se reparte primero — no confirmado en el Rules Reference que esto importe), el orden de bloques tendría que revisarse; no bloquea la implementación, es un ajuste de contenido |

**Todas las demás afirmaciones de este documento están `[VERIFIED]` (npm registry, extracción directa del PDF oficial) o `[CITED]` (documentación oficial de Nuxt/Tailwind/Nitro consultada hoy).**

## Open Questions (RESOLVED)

> Ambas preguntas quedaron cerradas durante la planificación de la Fase 1. Se conservan íntegras abajo como registro de la investigación; las líneas `**RESOLVED:**` son la única adición.

1. **¿La cifra de cartas del conjunto de Archienemigo se verifica antes de fijar el contenido, o se deja genérica indefinidamente?**
   - What we know: el Rules Reference no da una cifra universal; probablemente cada héroe imprime su propio conjunto con un número distinto de cartas.
   - What's unclear: si el equipo de autoría de contenido quiere invertir tiempo en verificar caja por caja (fuera del alcance del Rules Reference, que no lista card lists) o prefiere el texto genérico permanentemente.
   - Recommendation: dejar el texto genérico (paso 5 de la tabla) salvo que surja una razón concreta para necesitar la cifra exacta en pantalla.
   - **RESOLVED:** se adopta la recomendación del investigador. `01-03-PLAN.md` (tarea 1, fila 5 de la tabla de 21 pasos) autora el texto en forma genérica, sin cifra; la asunción A2 queda cerrada por decisión, no por verificación. Si algún día se quiere la cifra exacta, es una edición de contenido con incremento de `contentVersion`, no un cambio de diseño.

2. **¿El orden "Mazo de encuentros antes que Escenario del villano" sobrevive al playtest de D-04?**
   - What we know: es seguro en términos de reglas (ninguna dependencia física violada, según esta investigación).
   - What's unclear: si es la secuencia más natural de jugar en la mesa real — el bloque "Mazo de encuentros" pide reunir cartas de un escenario cuyo mazo de villano físico todavía no se ha sacado de la caja/apartado.
   - Recommendation: es exactamente el tipo de ajuste que D-04 (revisión de granularidad tras el primer playtest) ya contempla — no bloquear la Fase 1 por esto, solo anotarlo como candidato a revisar.
   - **RESOLVED:** se difiere explícitamente al usuario, no se decide en planificación. `01-06-PLAN.md` (tarea 2) es un `checkpoint:human-verify` bloqueante en el que el grupo recorre la preparación entera y juzga granularidad y orden de bloques (D-04); el orden «Mazo de encuentros antes que Escenario del villano» y la asunción A3 se ponen ahí a prueba de forma expresa.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Scaffold Nuxt 4, Vitest, npm scripts | ✓ | v22.17.1 | — |
| npm | Instalación de dependencias | ✓ | 11.12.1 | — |
| git | Control de versiones (repo ya inicializado) | ✓ | 2.49.0 | — |
| `gh` (GitHub CLI) | Crear/gestionar el repo remoto (D-16) | ✗ | — | El usuario crea el repo por su cuenta en paralelo (D-16); ninguna tarea de esta fase debe asumir `gh` disponible |
| Netlify CLI | Desplegar/verificar el sitio (TECH-05) | ✗ | — | D-17: el despliegue efectivo queda como paso final conjunto, fuera del alcance ejecutable de esta fase |
| `pdftotext` (poppler) | Extraer y verificar el Rules Reference v1.7 | ✓ | 26.02.0 | — (ya usado en esta misma investigación) |

**Missing dependencies with no fallback:** ninguna — las dos ausencias (`gh`, Netlify CLI) tienen fallback explícito y ya aceptado por decisión de usuario (D-16/D-17), no bloquean ninguna tarea ejecutable de esta fase.

## Validation Architecture — nota

`workflow.nyquist_validation` está `false` en `.planning/config.json`; se omite la sección formal de Validation Architecture (framework de tests end-to-end, mapa requisito→test automatizado) según el criterio de la plantilla. Como sustituto mínimo, ver `## Estrategia de tests del motor` abajo, que cubre directamente el texto explícito de TECH-03 y no depende de Nyquist.

## Estrategia de tests del motor (TECH-03)

| Comportamiento exigido por TECH-03 | Cómo se prueba | Dónde |
|---|---|---|
| Cierre de bucle | Fixture de 6 pasos con una sección `repeats:true` de 3 pasos; llamar `next()` repetidamente y comprobar que el `round` se incrementa exactamente al cruzar `loopEndIndex→loopStartIndex`, nunca antes/después | `engine/__tests__/navigator.test.ts` — **el contenido real de Marvel Champions de esta fase no puede cubrir este caso (no tiene sección repetible, hallazgo #3), por lo que el fixture es obligatorio, no opcional** |
| Salto entre pasos | `jumpTo()` a un id arbitrario del fixture, comprobar que `round` no cambia y que un `next()` posterior continúa correctamente desde el nuevo cursor (incluyendo saltar dentro y fuera del tramo repetible) | `engine/__tests__/navigator.test.ts` |
| Reanudación con contenido desactualizado | `resume()` con `contentVersion` no coincidente y con `runtimeId` inexistente — ambos casos deben caer a inicio de sección conservando `context`, nunca lanzar ni devolver un cursor inválido | `engine/__tests__/persistence.test.ts` |
| Contenido mal formado falla el build (TECH-02, relacionado) | Un fichero de fixture deliberadamente inválido (sin `id`, con dos secciones `repeats:true`, con un `text` de 120 caracteres) debe hacer fallar `GameDefinitionSchema.parse()` con un `ZodError` capturado por el test | `engine/__tests__/schema.test.ts` |

Comando de ejecución rápida por tarea: `npx vitest run --project engine`. Comando de suite completa (gate de fase, antes de dar la fase por cerrada): `npx vitest run`.

## Security Domain

Sin backend, sin autenticación, sin cuentas, sin llamadas de red en runtime (el contenido se importa en build, no se sirve por API) — la superficie ASVS L1 aplicable a esta fase es deliberadamente pequeña. No forzar controles que no aplican (p. ej. V2 Autenticación, V3 Sesión de servidor) solo por completar la plantilla.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No hay cuentas ni login — fuera de alcance por diseño del proyecto |
| V3 Session Management | No (en el sentido de sesión de servidor) | La "sesión de partida" vive solo en `localStorage` del navegador — ver V-storage abajo, no es una sesión ASVS clásica |
| V4 Access Control | No | Contenido público, sin roles ni permisos |
| V5 Input Validation | Sí, parcialmente | El único input de usuario real es el mini-setup (nº jugadores 1-4, dificultad enum) — validar con guards simples de tipo/rango en el composable, no necesita Zod en runtime (Zod es Node/CI-only por diseño de `STACK.md`) |
| V6 Cryptography | No | Nada que cifrar; no hay secretos ni credenciales en esta app |
| V12 Files and Resources (adaptado a almacenamiento local) | Sí | Ver "manipulación de `localStorage`" abajo |
| V5.3 Output Encoding / XSS | Sí | Ninguna interpolación de contenido debe usar `v-html` — todo el texto de los pasos (incluido el `citation`, aunque no se muestre en pantalla) se renderiza como texto plano interpolado (`{{ }}`), nunca HTML crudo |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Manipulación manual de `localStorage["tga:progress:marvel-champions"]` por el usuario (editar el `runtimeId` a mano en DevTools) | Tampering | El motor ya trata cualquier `runtimeId` no encontrado en la secuencia actual como "reanudación inválida" y cae al inicio de la sección (mismo camino que PERS-03) — no hay necesidad de defensas adicionales, es un beneficio colateral del diseño de `persistence.ts` ya especificado en `ARCHITECTURE.md` §6 |
| Contenido JSON corrupto o manipulado llegando al bundle | Tampering | Mitigado en build-time por Zod + Vitest en CI (TECH-02) — el contenido nunca se descarga en runtime, así que no hay superficie de manipulación post-build salvo comprometer el propio repo/CI, fuera del alcance de esta fase |
| XSS vía interpolación de texto de contenido (si algún paso incluyera HTML pensado como "enriquecido") | Tampering / Elevation of Privilege (en el sentido de ejecución de script no confiado) | Nunca usar `v-html` para renderizar `text`/`warning`/`title` — Vue interpola por defecto como texto seguro; esta regla debe quedar explícita en el plan como restricción de implementación, no asumida tácitamente |
| Cache de service worker sirviendo una versión desactualizada/rota | Tampering / Denial of Service (parcial) | **Diferido a Fase 4** (`@vite-pwa/nuxt` no se instala en esta fase) — mencionado aquí solo para que el plan de Fase 1 no intente resolverlo prematuramente ni lo dé por resuelto |

**Nota explícita para el `<threat_model>` del plan:** esta fase no tiene superficie de red, autenticación ni backend que amenazar — el threat model debe decir esto explícitamente (igual que aquí) en vez de rellenar categorías ASVS que no aplican con controles genéricos de plantilla. Las dos superficies genuinamente reales son (a) manipulación de estado persistido en `localStorage`, ya mitigada por diseño, y (b) disciplina de no usar `v-html`, que sí requiere una línea explícita en el plan porque es una decisión de implementación, no algo que el framework impida por sí solo.

---

## Sources

### Primary (HIGH confidence)
- `/Users/vcompanyb/Downloads/mc_rulesreference_v17-compressed.pdf` (Rules Reference v1.7) — extraído con `pdftotext -layout` y verificación página-por-página (`-f/-l`) en esta sesión; todas las citas de la tabla de 21 pasos remiten a esta extracción directa.
- npm registry (`npm view <pkg> version`, `npm view <pkg> scripts.postinstall`, `npm view <pkg> repository.url`), verificado en vivo 2026-08-28.
- `slopcheck 0.6.1` (instalado y ejecutado en esta sesión) — audit de los 9 paquetes de esta fase.
- api.npmjs.org/downloads/point/last-week — descargas semanales verificadas en vivo para el Package Legitimacy Audit.
- https://nuxt.com/docs/4.x/getting-started/installation, /getting-started/testing, /directory-structure — WebFetch 2026-08-28.
- https://tailwindcss.com/docs/theme, /docs/functions-and-directives — WebFetch 2026-08-28, tabla de namespaces `--spacing-*`/`--text-*`/`--color-*` confirmada.
- https://nitro.build/deploy/providers/netlify — WebFetch 2026-08-28.
- https://vite-pwa-org.netlify.app/deployment/netlify — WebFetch 2026-08-28, confirma que el ejemplo oficial NO cubre cabeceras de `sw.js`.

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md`, `STACK.md`, `PITFALLS.md`, `FEATURES.md`, `SUMMARY.md` — investigación previa del proyecto, reutilizada y ajustada, no reproducida en bruto.
- WebSearch, "netlify.toml headers Cache-Control no-cache sw.js manifest.webmanifest" — usado solo como orientación inicial antes de confirmar con WebFetch directo a fuentes oficiales.

### Tertiary (LOW confidence)
- Ninguna afirmación de este documento se apoya solo en una fuente no verificable — donde la investigación previa (`PITFALLS.md`) tenía una cita de página que esta sesión no pudo reproducir exactamente (Apéndice II en "p.48"), se señaló explícitamente la discrepancia en vez de repetirla sin comprobar.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — todas las versiones reverificadas en vivo hoy, coinciden exactamente con `STACK.md`
- Preparación de mesa (contenido): MEDIUM — 16 pasos oficiales y sus citas son HIGH (extracción directa del PDF); la síntesis a 21 pasos con dos reordenamientos es una propuesta razonada, no una verificación de que sea la única secuencia correcta — requiere repaso del equipo de autoría antes de fijarse
- Arquitectura/motor: HIGH — pseudocódigo y esquema ya probados en `ARCHITECTURE.md`; los tres ajustes de esta investigación son correcciones puntuales y acotadas, no un rediseño
- Pitfalls: HIGH — todos verificados contra fuente primaria (PDF oficial) o documentación oficial vigente

**Research date:** 2026-08-28
**Valid until:** 30 días para las decisiones de stack/arquitectura (paquetes ya estables); sin caducidad para las citas del Rules Reference v1.7 salvo que FFG/Asmodee publique una nueva versión del documento (verificar `rulesVersion` antes de cualquier reautoría de contenido futura).
