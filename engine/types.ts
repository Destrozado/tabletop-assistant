// engine/types.ts
// Contratos de datos y de runtime del motor de flujo. Cero imports de Vue/Nuxt/DOM:
// este módulo se importa desde `app/` con el alias `~~/engine/types` pero no depende
// de ningún runtime de navegador.

export type Difficulty = 'normal' | 'expert'

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
  variants?: {
    difficulty?: Partial<Record<Difficulty, Partial<TextBlock>>>
  }
  citation?: Citation
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
  [key: string]: unknown
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
export interface VillainStage {
  stage: number
  health: number
  healthPerHero: boolean
  healthPerGroup: boolean
}

// `name` es el nombre inglés de MarvelCDB verbatim, en una sola columna, sin
// etiqueta traducida (D-07). `alterEgo` y `handSize` salen siempre de la
// carta de alter ego (`linked_card`), nunca del lado héroe, donde
// `hand_size` es un modificador de habilidad (D-09).
export interface CatalogueHero {
  id: string
  name: string
  alterEgo: string
  health: number
  handSize: number
}

// `name` lo declara el script, no se lee de la carta de etapa — la etapa II
// de Kang tiene cuatro alternativas narrativas con nombres distintos y
// cifras idénticas.
export interface CatalogueVillain {
  id: string
  name: string
  stages: VillainStage[]
}

export interface CharacterCatalogue {
  gameId: string
  heroes: CatalogueHero[]
  villains: CatalogueVillain[]
}
