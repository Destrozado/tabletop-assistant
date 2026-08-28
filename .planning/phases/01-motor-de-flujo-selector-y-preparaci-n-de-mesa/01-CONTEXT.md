# Phase 1: Motor de flujo, selector y preparación de mesa - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Un grupo abre la app en una tablet (emulada en Chrome de escritorio durante esta fase), elige Marvel Champions en el selector, indica nº de jugadores y dificultad en una sola pantalla, y recorre paso a paso toda la preparación de mesa con «Siguiente»/«Atrás», cabecera de orientación permanente y salto directo a cualquier paso, con el progreso persistido y el contenido de la preparación verificado contra el Rules Reference oficial v1.7.

Detrás: el motor de flujo puro en TypeScript (sin Vue ni Nuxt), el esquema JSON del contenido validado con Zod en CI, el scaffold de Nuxt 4 con SSG, y la base de UI tablet-first.

**Fuera de esta fase:** el bucle de ronda (fase de jugadores, fase del villano, fin de ronda) es la Fase 2. La locución por voz y el wake lock son la Fase 3. La instalación PWA y el funcionamiento offline son la Fase 4. El despliegue público a Netlify se prepara aquí pero se ejecuta conjuntamente cuando el usuario tenga las cuentas creadas.

</domain>

<decisions>
## Implementation Decisions

### Granularidad de los pasos del setup
- **D-01:** Granularidad **fina**: un paso por acción física atómica, no un paso por bloque del reglamento. El usuario eligió esto sobre las alternativas media (~14) y gruesa (~8) porque su dolor real son los olvidos, no los toques.
- **D-02:** Las acciones que todos los jugadores hacen simultáneamente son **un solo paso para toda la mesa, redactado en segunda persona del plural** («Colocad vuestra identidad por el lado Alter-Ego»), no un paso por jugador. Esto colapsa los pasos por jugador y deja el recuento efectivo en torno a 21 pasos, no 24.
- **D-03:** Al pulsar «Siguiente» en el último paso del setup se llega a una **pantalla de «mesa lista» con resumen de comprobación**, que sirve de repaso rápido antes de empezar y de frontera limpia con la Fase 2.
- **D-04 (riesgo aceptado, a revisar):** La investigación advierte que la granularidad fina puede degenerar en un festival de toques. El usuario acepta el riesgo con conocimiento. **La granularidad debe reevaluarse tras la primera prueba de flujo completo al final de esta fase**, y CONT-11 («un paso = una acción física inequívoca») es el criterio de esa revisión.

### Anatomía del paso en pantalla
- **D-05:** Cada paso muestra una **frase de acción grande y dominante**, y debajo una **línea de aviso destacada solo cuando el paso tiene trampa** (p. ej. «⚠ NO se barajan en el mazo de encuentros»). Los pasos triviales no llevan aviso. Nada de detalle desplegable ni bloques «¿Por qué?» en v1.
- **D-06:** La **cita al reglamento vive solo en los datos** (campo del JSON), nunca en pantalla. Existe para trazar y corregir un paso mal contado y para auditoría; no ensucia la vista de mesa. Esto satisface CONT-08 como requisito de datos, no de UI.
- **D-07:** Las **fórmulas aritméticas se muestran genéricas, sin sustituir** («Ajustad el dial del villano a su vida impresa × nº de jugadores»). La multiplicación la hace el grupo en la mesa.
- **D-08:** **Ningún texto de paso menciona el número real de jugadores**, ni siquiera en recuentos que no requieren operación. Todo el contenido de los pasos es genérico y no depende del nº de jugadores.
- **D-09:** El nº de jugadores **sí se pide en el mini-setup y se muestra permanentemente en la cabecera** («3 jug · Normal»), como recordatorio de contexto de partida.
- **D-10 (requisito a reescribir):** **ADAPT-02 queda desactualizado** por D-08/D-09. Su redacción actual («los pasos que dependen del número de jugadores lo enuncian con el número real de la partida») contradice la decisión tomada. Debe reescribirse como: *el número de jugadores se expone en la cabecera permanente de la sesión, no sustituido dentro del texto de los pasos*. El planner debe reflejar esta redacción; ADAPT-01 (variantes por dificultad) y ADAPT-03 (fórmulas tal cual) quedan intactos.

### Orientación y salto entre pasos
- **D-11:** La cabecera muestra **sección + posición a la izquierda** (`PREPARACIÓN · 8 de 21`) y **contexto de partida a la derecha** (`3 jug · Normal`), con el control de índice (`≡`) en el extremo. En la Fase 2 el hueco izquierdo pasa a `RONDA 4 · Villano · 3 de 6` sin cambiar la estructura de la cabecera — diséñala para admitir ese cambio.
- **D-12:** **Descartada la barra de progreso.** Implica una meta, y el bucle de ronda de la Fase 2 no tiene meta: funcionaría en el setup y chirriaría después.
- **D-13:** El índice de salto (FLOW-06) es un **overlay a pantalla completa** con los pasos **agrupados por bloques** (Héroes, Archienemigos, Mazo de encuentros, Escenario del villano, Manos iniciales, Jugador inicial). Se abre desde el `≡`. Descartados el panel lateral fijo (roba un tercio del ancho al texto del paso) y la lista de bloques con despliegue en dos toques.
- **D-14:** Las marcas del índice son **derivadas de la posición, sin estado adicional**: todo paso anterior al actual sale con `✓`, el actual con `●`. Saltar hacia atrás retira los `✓` posteriores. Nada que persistir, nada que pueda desincronizarse.

### Publicación y repositorio
- **D-15:** Camino elegido: **repo en GitHub + Netlify conectado al repo** (despliegue automático por push). Descartados el arrastrar-carpeta manual y el solo-red-local.
- **D-16:** **Reparto de trabajo:** el repo git local ya existe y está activo — seguir commiteando todo ahí con normalidad. El usuario creará **por su cuenta y en paralelo** el repo en GitHub y la cuenta de Netlify. El despliegue se hará **conjuntamente** cuando esas cuentas estén listas. Claude no tiene credenciales de GitHub ni de Netlify (ni `gh` ni la CLI de Netlify están instaladas).
- **D-17:** **TECH-05 no bloquea el resto de la fase.** Prepárese la configuración de despliegue (`netlify.toml`, script de build, `.gitignore`) como entregable de la fase, pero el despliegue efectivo y la verificación de la URL quedan como paso final conjunto.
- **D-18:** Durante esta fase se prueba en **emulación de tablet en Chrome de escritorio**, no en la tablet real. Sin servidor local expuesto por IP, sin túneles. La prueba en tablet real llega cuando la app esté publicada.
- **D-19 (limitación registrada):** **UI-01 («legible a un brazo de distancia») no es verificable en emulación** — el tamaño en píxeles se emula, la distancia física no. Dimensiónese con criterios objetivos (tamaños mínimos en `rem`, ratios de contraste WCAG) y déjese constancia de que la validación real queda pendiente de la primera partida en tablet.

### Claude's Discretion
El usuario no delegó explícitamente ninguna decisión, pero estas quedan sin fijar y son del ámbito de research/planner:
- Estructura de directorios concreta y ubicación exacta del directorio `engine/` (la investigación recomienda fuera de `srcDir` de Nuxt; ver ARCHITECTURE.md)
- Forma exacta del esquema JSON (nombres de campos, tipos, esquema Zod) — ARCHITECTURE.md trae una propuesta completa; adóptese o mejórese
- Modelo de rutas (`/` selector + `/[game]` runner) y cómo interactúa con el prerenderizado
- Alcance de los tests más allá de lo que exige TECH-03 (motor: cierre de bucle, salto, reanudación desactualizada)
- Diseño visual concreto: tipografía, escala tipográfica, paleta del tema oscuro, espaciados
- Formato interno del campo de cita (documento/página/sección)
- Cómo se agrupan los pasos en bloques dentro del esquema (los bloques del índice deben derivarse de los datos, no estar codificados)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto y alcance del proyecto
- `.planning/PROJECT.md` — Qué es el proyecto, core value, restricciones, decisiones clave y la nota sobre los errores confirmados del borrador de reglas
- `.planning/REQUIREMENTS.md` — Los 58 requisitos v1; los 33 de esta fase. **Atención a D-10: ADAPT-02 requiere reescritura**
- `.planning/ROADMAP.md` — Fase 1 con sus 5 criterios de éxito y la frontera con las Fases 2-4

### Investigación del proyecto (leer antes de planificar)
- `.planning/research/SUMMARY.md` — Síntesis y orden de construcción convergente de las cuatro investigaciones
- `.planning/research/ARCHITECTURE.md` — **La más importante para esta fase.** Decisión del modelo de flujo (árbol anidado en autoría, aplanado a array + `loopStartIndex`/`loopEndIndex` en ejecución), esquema JSON completo con tipos TypeScript y boceto de Zod, fronteras de componentes, layout de Nuxt 4, estrategia de persistencia y versionado de contenido
- `.planning/research/STACK.md` — Versiones verificadas (Nuxt 4.5.2, `@vite-pwa/nuxt` 1.1.1, `@vueuse/core` 14.4.0, Zod 4.4.3), decisión SSG frente a SPA, Tailwind v4 por plugin de Vite, por qué NO `@nuxt/content` ni Pinia, elección de Netlify
- `.planning/research/PITFALLS.md` — **Contiene la lista de verificación de reglas de Marvel Champions con citas de página y sección.** Es el listado literal de tareas para la verificación del contenido del setup en esta fase. También los riesgos de hidratación SSR al restaurar estado persistido y la trampa de la reanudación silenciosa
- `.planning/research/FEATURES.md` — Table stakes de la UI en tablet con la evidencia que los respalda, y anti-features a no construir

### Reglamento oficial (fuente de verdad del contenido)
- `/Users/vcompanyb/Downloads/mc_rulesreference_v17-compressed.pdf` — **Rules Reference v1.7. Fuente de verdad para CONT-08 y CONT-09.** Extraíble con `pdftotext` (ya validado durante la investigación)
- `/Users/vcompanyb/Downloads/Marvel-Champions_aprende_a_jugar.pdf` — «Aprende a jugar». Útil para el orden narrativo de la preparación; el Rules Reference manda en caso de conflicto

### Errores confirmados del borrador (a no reproducir)
Verificados contra el Rules Reference v1.7 durante la investigación. Los cuatro afectan sobre todo a la Fase 2, pero **uno toca el setup de esta fase**:
- **Obligaciones:** son «una o más por identidad» barajadas en el mazo de encuentros, **no exactamente una por jugador**. Esto afecta directamente al paso de construcción del mazo de encuentros de esta fase
- (Fase 2) La fase del villano son 6 pasos oficiales, no 4
- (Fase 2) Solo el villano y los esbirros con la palabra clave Villano roban cartas de aumento
- (Fase 2) El Modo Experto no altera la estructura de la fase del villano; eso es el Modo Heroico, un eje de dificultad aparte y combinable

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
Ninguno. Repositorio vacío: solo `.planning/` y `CLAUDE.md`. Sin `package.json`, sin código fuente, sin mapas de codebase en `.planning/codebase/`. Todo se crea desde cero en esta fase.

### Established Patterns
Sin patrones de código previos. Los patrones vinculantes vienen de la investigación, no del código existente:
- Motor puro en TypeScript, cero imports de Vue/Nuxt/DOM, en un directorio fuera del `srcDir` de Nuxt para que la frontera de pureza sea un hecho físico y no una convención
- Composable único sobre `useLocalStorage` como única costura entre el motor puro y la reactividad de Vue; sin Pinia
- Componentes presentacionales tontos
- Contenido como JSON tipado validado por Zod en una suite de Vitest que corre en CI; un fichero mal formado rompe el build

### Integration Points
- **Repositorio git local:** ya inicializado, 6 commits de documentación de planificación. El código de la app se suma a este mismo repo
- **Sin remoto configurado:** el usuario creará el repo en GitHub y la cuenta de Netlify en paralelo (D-16)
- **Herramientas ausentes en la máquina:** `gh` y la CLI de Netlify no están instaladas. No asumir su disponibilidad en ninguna tarea
- **Estructura de fases de la app:** la cabecera y el motor de esta fase deben admitir el bucle de ronda de la Fase 2 sin rediseño (D-11), y el esquema de contenido debe incluir ya el campo de frase locutable que la Fase 3 consumirá, aunque aquí no se use

</code_context>

<specifics>
## Specific Ideas

- **Maquetas concretas aprobadas por el usuario.** El usuario eligió entre maquetas ASCII y seleccionó estas tres, que son especificación, no inspiración:

  Pantalla de paso:
  ```
  ┌────────────────────────────────────────┐
  │ PREPARACIÓN · 8 de 21   3 jug · Normal ≡│
  ├────────────────────────────────────────┤
  │                                        │
  │  Apartad las 5 cartas de              │
  │  Archienemigo fuera de la             │
  │  partida                               │
  │                                        │
  │  ⚠  NO se barajan en el mazo          │
  │     de encuentros                      │
  │                                        │
  ├────────────────────────────────────────┤
  │  ‹ Atrás      │    SIGUIENTE  ›        │
  └────────────────────────────────────────┘
  ```

  Overlay de índice:
  ```
  ┌───────────────────────────────────────┐
  │  PREPARACIÓN                      ✕  │
  ├───────────────────────────────────────┤
  │  HÉROES                               │
  │   1 ✓ Decidid héroes                 │
  │   2 ✓ Identidad en Alter-Ego         │
  │   3 ✓ Ajustad el dial                │
  │                                       │
  │  ARCHIENEMIGOS                        │
  │   4 ✓ Localizad el conjunto          │
  │   5 ✓ Contad las 5 cartas            │
  │   6 ● Apartadlas fuera               │
  │                                       │
  │  MAZO DE ENCUENTROS                   │
  │   7   Cartas del escenario           │
  │   8   Conjunto Estándar              │
  │   9   Conjunto modular               │
  └───────────────────────────────────────┘
  ```

  Cabecera en Fase 2 (para dimensionar ahora, no para implementar aquí):
  ```
  ┌─────────────────────────────────────────────┐
  │ RONDA 4 · Villano · 3 de 6  3 jug · Normal ≡│
  └─────────────────────────────────────────────┘
  ```

- **«Siguiente» es el elemento más prominente de la pantalla**, con «Atrás» claramente secundario a su izquierda, ambos al alcance del pulgar en la banda inferior.
- **Los bloques del setup** que el usuario vio y validó: Héroes, Archienemigos, Mazo de encuentros, Escenario del villano, Manos iniciales, Jugador inicial. Deben derivarse de la estructura de los datos.
- **Redacción de los pasos:** imperativo, plural, breve. «Apartad las 5 cartas de Archienemigo fuera de la partida», no «Las cartas de Archienemigo deben apartarse».

</specifics>

<deferred>
## Deferred Ideas

Nada surgió fuera del alcance de la fase: la discusión se mantuvo dentro del dominio. Las siguientes quedan explícitamente aplazadas por decisiones tomadas aquí, no por creep:

- **Detalle desplegable «¿Por qué?» con la cita visible** — descartado para v1 por D-05/D-06 (la cita vive solo en datos). Si en la mesa surgen discusiones de reglas que el flujo no zanja, es el candidato natural a reconsiderar, y encaja con REF-01/REF-02 ya diferidos a v2.
- **Panel lateral fijo con el índice siempre visible** — descartado por D-13 (roba un tercio del ancho al texto del paso). Reconsiderable si tras la prueba de mesa el overlay resulta incómodo.
- **Marcar los pasos efectivamente visitados** — descartado por D-14 en favor de marcas derivadas de la posición. Requeriría estado persistido propio.
- **Prueba en tablet real y validación de UI-01** — aplazada a cuando la app esté publicada (D-18/D-19).
- **Servidor local por IP y túneles temporales** — descartados explícitamente por el usuario a favor de la emulación en Chrome.

</deferred>

---

*Phase: 1-Motor de flujo, selector y preparación de mesa*
*Context gathered: 2026-08-28*
