// engine/types.ts
// Contratos de datos y de runtime del motor de flujo. Cero imports de Vue/Nuxt/DOM:
// este módulo se importa desde `app/` con el alias `~~/engine/types` pero no depende
// de ningún runtime de navegador.

export type Difficulty = 'normal' | 'expert'

// D-01/D-02/D-07/D-05 (Fase 8); ampliado en el quick 260925-mpj con
// 'encounterSets' (D-07 de ese quick): los valores conocidos que un paso
// puede declarar que trae consigo. Ya no son solo tres — 'encounterSets' no
// produce un número (paréntesis) ni una lista de filas por jugador, sino
// una LÍNEA DE TEXTO (los conjuntos de encuentro a reunir); ese tercer tipo
// de forma de salida vive en `resolveStepValueText` (engine/stepValues.ts),
// hermana de `resolveStepValue`/`resolveStepValueRows`. El propio tipo sigue
// fijando cuántos miembros hay y cuáles son — un segundo campo de «alcance»
// solo podría contradecir a este sin que nada lo impidiera. Se exporta como
// alias único para que `StepDefinition.value` y `StepSchema`
// (engine/schema.ts) citen el mismo enum sin teclearlo dos veces.
// `handSizeAlterEgo` (no `handSizeHero` ni `startingHandSize`) porque el
// setup arranca con la cara de Alter-Ego boca arriba (Rules Reference v1.7,
// Apéndice II, paso 1); `handSizeHero` daría la cifra equivocada en los 23
// héroes durante el setup.
export type StepValueKind = 'villainHealth' | 'heroHealth' | 'handSizeAlterEgo' | 'encounterSets'

export interface Citation {
  source: 'rules-reference' | 'learn-to-play'
  section: string
  page?: number
}

export interface StepOption {
  label: string
  detail: string
}

export interface TextBlock {
  text: string
  warning?: string
  // D-32: consecuencia detallada del aviso, opcional y dependiente de
  // `warning` (un paso no puede declarar el campo siguiente sin este —
  // regla de esquema en engine/schema.ts). Alimenta WarningDetailModal.vue.
  warningDetail?: string
  // C1/DC-10 (02-05-PLAN.md): lista pulsable de opciones del turno, entre
  // 2 y 8 entradas; cada entrada lleva su propio `detail` obligatorio (sin
  // afordancia falsa, D-32) y alimenta el mismo modal reutilizado con
  // `tone: 'neutral'`.
  options?: StepOption[]
  // C2/DC-11: recordatorio siempre visible, sin afordancia, dependiente de
  // que el paso declare la lista anterior (regla de esquema en schema.ts).
  optionsWarning?: string
  // Quick 260831-fkb: equivalente de `warningDetail` pero para el aviso de la
  // lista de opciones — depende de `optionsWarning` (regla de esquema en
  // engine/schema.ts) igual que `warningDetail` depende de `warning`. Sin
  // valor por defecto a propósito, misma razón que `warningDetail`: `app/`
  // nunca debe añadirle un `?? fallback` (no copiar el patrón de `kind`, WR-01).
  optionsWarningDetail?: string
  speech?: string
}

export interface StepDefinition extends TextBlock {
  id: string
  title: string
  kind: 'step' | 'summary'
  // D-02 (Fase 6): declara EN LOS DATOS que este paso pinta la rejilla de
  // selección de villano/héroes — nunca se cablea el id `setup.heroes.01`
  // en `app/` (TECH-04/D-24, misma disciplina que ya exige el índice de
  // salto). Enum de un solo miembro, no booleano, para que un segundo tipo
  // de rejilla (p. ej. Warhammer 40.000) sea aditivo en vez de un cambio
  // incompatible. No vive dentro de `TextBlock` porque no tiene ningún
  // campo dependiente y no debe poder variar por dificultad (Pitfall 2 de
  // 06-RESEARCH.md).
  selection?: 'characters'
  // D-01 (Fase 8): la clave vive EN EL DATO, nunca una tabla de ids en
  // `engine/` ni en `app/` — misma disciplina de TECH-04/D-24 que ya impuso
  // `selection`. D-02: enum plano de tres valores (`StepValueKind`); que se
  // pinte entre paréntesis o en una lista se DERIVA del propio tipo, por eso
  // no hay un segundo campo de «alcance» que pueda contradecirlo. Fuera de
  // `TextBlock`, igual que `selection`: no debe poder variar por dificultad.
  value?: StepValueKind
  variants?: {
    difficulty?: Partial<Record<Difficulty, Partial<TextBlock>>>
  }
  citation?: Citation
}

// FrozenEndInstant (WR-06 ronda 4, quick 260923-3rm): el instante
// congelado del PRIMER «Partida terminada» en una posición dada — sellado
// para que un reintento de registro (tras un fallo de escritura del
// histórico) mida la duración y la fecha hasta ESE instante, nunca hasta el
// momento del reintento (D-08: reloj de pared sin tope, sin acumular tiempo
// activo ni descontar pausas — el sello no cambia esa regla, solo fija en
// qué instante se aplica). `runtimeId`/`round` son el TESTIGO de la
// posición en la que se selló: si la sesión avanza a otro nodo o cambia de
// ronda antes del reintento, el sello deja de aplicar (D-08 tal cual, sin
// sello).
export interface FrozenEndInstant {
  at: number
  runtimeId: string
  round: number
}

// D-19 (Fase 6): la selección de la partida en curso. Vive dentro de
// `SessionContext` y por tanto viaja entera en `toPersistedPosition` sin
// una línea de fontanería nueva (`engine/persistence.ts` no se toca).
// `playerName` vacío significa «sin nombre puesto» y se muestra como
// «Jugador N» en la interfaz (D-15) — el motor nunca guarda el valor por
// defecto, solo la interfaz lo resuelve.
// `moduleIds` (quick 260925-mpj, D-06): campo ADITIVO — no bumpea
// `formatVersion` ni `contentVersion`. `undefined` = «el grupo no ha
// personalizado la selección de módulos para este villano» → el motor
// resuelve el recomendado del villano (`resolveModuleIds`,
// engine/encounterSets.ts). `[]` explícito = «el grupo desmarcó todo a
// propósito» y se respeta tal cual, sin caer al recomendado. La validación
// defensiva de lo persistido (ids desconocidos descartados, forma
// inesperada → valor por defecto) vive en `resolveModuleIds`, no aquí — este
// tipo solo fija la forma, igual que `HeroSelection` con `resolvePlayerSlots`.
export interface HeroSelection {
  villainId: string | null
  heroes: { heroId: string | null, playerName: string }[]
  moduleIds?: string[]
}

// D-09/D-12 (Fase 7): estado de los contadores en mesa. `.planning/research/
// ARCHITECTURE.md` §a proponía `heroHealth: number[]`; D-09 lo ensancha a
// propósito a `(number | null)[]` porque `null` y `0` son estados DISTINTOS
// que no se colapsan nunca: `null` significa «nadie ha pulsado ▼/▲ en este
// contador todavía» y se pinta con el valor calculado en vivo (precarga
// derivada del catálogo), mientras `0` significa «tocado y bajado hasta
// cero» y marca «SIN VIDA» en la interfaz (D-11/D-15). Lo mismo aplica a
// `villainHealth`. La validación por TIPO (no por presencia) de este campo
// la implementa `resolveCounters` en `engine/counters.ts` (plan 02); este
// tipo solo fija la forma.
export interface CounterState {
  villainHealth: number | null
  heroHealth: (number | null)[]
}

export interface PhaseDefinition {
  id: string
  title: string
  summaryLabel?: string
  steps: StepDefinition[]
}

export interface SectionDefinition {
  id: string
  title: string
  repeats: boolean
  phases: PhaseDefinition[]
}

export interface GameDefinition {
  gameId: string
  title: string
  locale: 'es'
  contentVersion: number
  // Opcionales (WR-06 review): rango de nº de jugadores válido para este
  // juego. `MiniSetupScreen` deriva su rango de botones de estos valores en
  // vez de tener un rango tecleado a mano — así añadir un juego con un rango
  // distinto (p. ej. Warhammer 40.000) no exige tocar el componente.
  minPlayers?: number
  maxPlayers?: number
  sections: SectionDefinition[]
}

export interface FlatStepNode {
  step: StepDefinition
  sectionId: string
  sectionTitle: string
  sectionRepeats: boolean
  phaseId: string
  phaseTitle: string
  breadcrumb: string
}

export interface RuntimeStepNode extends FlatStepNode {
  runtimeId: string
}

export interface SessionContext {
  playerCount: number
  difficulty: Difficulty
  // D-19 (Fase 6): campo ADITIVO — no bumpea `formatVersion` ni
  // `contentVersion`. `undefined` es un estado normal y permanente de la
  // app (D-03/SEL-09: elegir villano/héroes es opcional de principio a
  // fin), no un caso de compatibilidad con partidas antiguas.
  selection?: HeroSelection
  // D-19 (Fase 7, mismo campo aditivo): tampoco bumpea la versión del
  // formato de persistencia (que sigue igual) ni `contentVersion`.
  // `undefined` es un estado normal y permanente de la app (D-09/D-12: nadie
  // ha tocado ningún contador todavía), no un caso de compatibilidad con
  // partidas antiguas. `engine/persistence.ts` NO se modifica en esta fase:
  // `toPersistedPosition` ya persiste `context` entero y `resume()` ya lo
  // restaura entero.
  counters?: CounterState
  // D-07 (Fase 9): epoch ms fijado UNA SOLA VEZ en `start()` de
  // `app/composables/useGameSession.ts`, nunca reescrito al reanudar. Campo
  // ADITIVO, igual que `selection` (D-19 Fase 6) y `counters` (D-19 Fase 7):
  // no bumpea `formatVersion` ni `contentVersion`, y `engine/persistence.ts`
  // no se toca. `undefined` es el estado real de una sesión guardada por
  // v1.7, la primera versión sin este campo (D-10).
  startedAt?: number
  // endedAt (WR-06 ronda 4, quick 260923-3rm): campo ADITIVO igual que
  // `selection`/`counters`/`startedAt` — no bumpea `formatVersion` ni
  // `contentVersion`, y `engine/persistence.ts` no se toca (ya persiste
  // `context` entero). Sellado la PRIMERA vez que el grupo pulsa un
  // resultado en `GameOutcomeDialog` en la posición actual
  // (`stampEndOfGame`, `useGameHistory.ts`); solo válido mientras la sesión
  // siga en esa misma posición (`freezeEndInstant`, `engine/history.ts`,
  // que es quien decide si el sello sigue aplicando o hay que sustituirlo).
  // `undefined` es el estado normal de cualquier partida en curso que no ha
  // llegado a ese diálogo todavía.
  endedAt?: FrozenEndInstant
  [key: string]: unknown
}

// D-06 (Fase 9): enum plano — la clave del dato NO es la etiqueta de
// pantalla (misma disciplina que `handSizeAlterEgo`, D-07 de la Fase 8); la
// redacción española vive en `describeLossCause` de `engine/history.ts`.
export type LossCause = 'mainSchemeCompleted' | 'heroesEliminated'

// D-01 (Fase 9): los tres únicos valores que el diálogo de fin de partida
// puede emitir. Elegir la derrota YA elige su causa, así que no existe el
// estado «perdida sin causa».
export type GameOutcome = 'won' | LossCause

// D-11 (Fase 9): `heroName` es el nombre CONGELADO que el grupo vio en
// pantalla (alias español), resuelto por la capa `app/` antes de llamar al
// motor; `null` cuando ese hueco no tenía héroe (SEL-09/D-12).
export interface HistoryPlayerEntry {
  heroId: string | null
  heroName: string | null
  playerName: string
}

// D-15 (Fase 9): la entrada completa de una partida registrada. `gameId`
// porque hay UN SOLO histórico para toda la app (D-15); `lossCause` es
// `null` cuando `result === 'won'` (D-06); `round` es el valor del motor
// tal cual, se lee «hasta la ronda N», nunca `round - 1` (D-09); `durationMs`
// es un reloj de pared sin tope, `null` cuando no se puede saber (D-08/D-10).
// `recordedAt` (WR-06 ronda 4, quick 260923-3rm): la fecha ISO del INSTANTE
// DEL DESENLACE — el sello de `context.endedAt` cuando sigue aplicando a la
// posición actual (`freezeEndInstant`), o el momento del registro cuando no
// hay sello válido (D-08 tal cual, camino sin cambios). Antes de este quick
// era siempre «el momento del registro»; un reintento muy posterior a un
// fallo de escritura ya no infla ni la duración ni la fecha de la tarjeta.
export interface GameHistoryEntry {
  id: string
  gameId: string
  result: 'won' | 'lost'
  lossCause: LossCause | null
  villainId: string | null
  villainName: string | null
  players: HistoryPlayerEntry[]
  difficulty: Difficulty
  playerCount: number
  round: number
  durationMs: number | null
  recordedAt: string
}

export interface EngineSession {
  gameId: string
  contentVersion: number
  sequence: RuntimeStepNode[]
  cursor: number
  round: number
  context: SessionContext
  loopStartIndex?: number
  loopEndIndex?: number
}

// --- Catálogo de personajes (Fase 5) ---
// Contrato de `content/marvel-characters.json`. El único escritor de ese
// fichero es `scripts/catalogue/fetch-marvelcdb.mjs` (D-09): nadie lo edita a
// mano. Estas interfaces viven aquí —y no como `z.infer` dentro de
// `engine/catalogueSchema.ts`— para que `app/` (Fase 6) pueda tiparlas
// importando solo `~~/engine/types`, sin que ninguna de sus importaciones
// alcance un módulo que importa zod (T-01-19, DC-03).

// Cifras tal cual las da MarvelCDB (`health` / `health_per_hero` /
// `health_per_group`); la multiplicación por número de jugadores la hace la
// Fase 7, nunca aquí (D-11). `stage` es entero 1..n; MarvelCDB lo sirve como
// numeral romano en string y el script lo mapea a entero.
//
// Los cuatro campos planos (`stage`, `health`, `healthPerHero`,
// `healthPerGroup`) son las cifras del set de villano ESTÁNDAR del
// escenario. `expert` —quinto campo, opcional y al final— lleva las cifras
// del set de villano de MODO EXPERTO cuando el escenario trae uno propio,
// con cifras distintas de las etapas normales (Kang: `card_set_code`
// `exp_kang`, 15/22/25 frente a 12/18/20 estándar). Su ausencia significa
// que ese escenario no trae un set de villano Experto con cifras propias —
// NO que el modo Experto no cambie nada: Rhino y Ultron (Core Set) sí
// cambian de etapa en Experto (cara 1A del plan principal: "Rhino (II) and
// Rhino (III) instead for expert mode."; RR v1.7 p.28, "listed expert mode
// villain stages"), pero lo hacen reutilizando sus propias etapas II y
// III, sin cifras Expertas nuevas. Ese caso se modela con
// `expertStartStage` en `CatalogueVillain`, no con `expert` en la etapa.
//
// `expert` vive en la ETAPA y no en el villano porque las banderas difieren
// por etapa dentro del mismo villano en los dos sets (Kang I true / II
// false / III true) — la misma asimetría por etapa que ya justifica D-11.
//
// Quien consuma este catálogo en la Fase 6/7 debe leer `expert` cuando la
// sesión está en `difficulty: 'expert'` y hay `expert` disponible, porque
// `content/marvel-champions.json` (paso `setup.escenario.04`, variante
// `expert`) ya instruye al grupo sustituir esas cartas físicas en la mesa.
// La multiplicación por número de jugadores sigue siendo de la Fase 7,
// nunca de aquí, también para `expert` (D-11 intacto).
export interface VillainStage {
  stage: number
  health: number
  healthPerHero: boolean
  healthPerGroup: boolean
  expert?: {
    health: number
    healthPerHero: boolean
    healthPerGroup: boolean
  }
}

// `name` es el nombre inglés de MarvelCDB verbatim, en una sola columna, sin
// etiqueta traducida (D-07). `alterEgo` sale siempre de la carta de alter
// ego (`linked_card`), igual que `health`, que no cambia con este campo.
//
// Cada CARA de la carta de identidad imprime su propio tamaño de mano
// (Rules Reference v1.7, Apéndice III, anatomía de carta, punto 14): el
// ejemplo impreso de Spider-Man trae "HAND SIZE 5" en la cara de héroe y
// "HAND SIZE 6" en la cara de alter ego, dos valores reales y distintos, no
// uno "correcto" y otro descartable. El chequeo de final de fase de jugador
// (entrada "HAND SIZE" del RR v1.7) usa el tamaño de mano de la cara ACTIVA
// en cada ronda, por eso se guardan los dos: `handSizeHero` (de
// `card.hand_size`) y `handSizeAlterEgo` (de `card.linked_card.hand_size`).
// El setup (Apéndice II, paso 1) arranca con la cara de alter ego boca
// arriba, así que el número correcto DURANTE EL SETUP es
// `handSizeAlterEgo`.
export interface CatalogueHero {
  id: string
  name: string
  alterEgo: string
  health: number
  handSizeHero: number
  handSizeAlterEgo: number
}

// `name` lo declara el script, no se lee de la carta de etapa — la etapa II
// de Kang tiene cuatro alternativas narrativas con nombres distintos y
// cifras idénticas.
//
// `expertStartStage` (opcional): etapa (1..n) con la que empieza la
// partida en modo Experto, según la cara 1A del plan principal ("listed
// expert mode villain stages", RR v1.7 p.28). Ausente = 1 (arranca en la
// etapa I, igual que en Normal). Rhino, Ultron y Klaw: 2 (etapa II). Kang: no
// hace falta declararlo porque su Experto no cambia de etapa, va con sus
// propias cifras `expert` en la etapa I — aun así el script lo anota
// explícitamente en 1 (dato explícito, no implícito).
//
// `encounterSetName` (quick 260925-mpj, D-07): nombre ESPAÑOL del set de
// villano de este escenario tal cual lo da `card_set_name` de
// es.marvelcdb.com (p. ej. Rhino → «Rino») — es el nombre impreso en las
// cartas españolas de la caja, distinto de `name` (siempre el inglés de
// MarvelCDB, D-02 anterior sin cambios). Lo usa `setup.encuentros.01` para
// nombrar en pantalla qué conjunto de encuentro sacar de la caja.
//
// `recommendedModuleId` (D-03): id (kebab-case, ver `CatalogueModule.id`)
// del módulo de encuentro recomendado por la cara 1A del plan principal de
// este escenario. Dato A MANO en `scripts/catalogue/fetch-marvelcdb.mjs`,
// comprobado por el script contra el texto de esa misma carta antes de
// escribir (aborta sin escribir si no coincide) — nunca se deriva
// automáticamente del texto de la carta, por la misma razón que
// `expertStartStage` es dato a mano comprobado, no derivado.
export interface CatalogueVillain {
  id: string
  name: string
  stages: VillainStage[]
  expertStartStage?: number
  encounterSetName: string
  recommendedModuleId: string
}

// Módulo de encuentro adicional (quick 260925-mpj, D-01/D-04): una de las
// cajas del grupo (Core Set + «Antiguo y futuro Kang» por ahora). `name` es
// el nombre español de `card_set_name` (es.marvelcdb.com). `difficulty`
// (opcional): el número «Dificultad N» que el escenario de Kang imprime en
// sus tres módulos adicionales (4/6/8, dato a mano tomado del reglamento del
// grupo); ausente cuando la dificultad del módulo no se conoce (los cinco
// módulos del Core Set) — su ausencia NO significa "dificultad 0", significa
// "dato no disponible", así que la interfaz nunca debe pintar "Dificultad" en
// ese caso.
export interface CatalogueModule {
  id: string
  name: string
  difficulty?: number
}

// Nombres españoles de los dos sets base informativos (D-04): «Normal»
// siempre presente en la mesa, «Experto» solo cuando la partida es Experto.
// Ninguno es pulsable en el modal — son informativos, no parte de la
// selección de módulos adicionales.
export interface CatalogueBaseSets {
  standard: string
  expert: string
}

export interface CharacterCatalogue {
  gameId: string
  heroes: CatalogueHero[]
  villains: CatalogueVillain[]
  baseSets: CatalogueBaseSets
  modules: CatalogueModule[]
}
