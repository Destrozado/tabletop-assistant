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

export interface TextBlock {
  text: string
  warning?: string
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
