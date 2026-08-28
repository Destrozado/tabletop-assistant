// engine/schema.ts
// Único fichero del repo (fuera de node_modules) que importa `zod`. `zod` es
// devDependency y no debe cruzar nunca a `app/` — este esquema corre solo en
// Node/CI (Vitest), nunca en el navegador (T-01-19).
import { z } from 'zod'
import type { GameDefinition } from './types'

// Admite guiones dentro de cada segmento además de puntos entre segmentos
// (ids autorados como "setup.jugador-inicial", "setup.mesa-lista", "warhammer-40k").
const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)*$/

const CitationSchema = z.object({
  source: z.enum(['rules-reference', 'learn-to-play']),
  section: z.string().min(1),
  page: z.number().int().positive().optional(),
})

const TextBlockSchema = z.object({
  text: z.string().min(1).max(90), // presupuesto duro de 01-UI-SPEC.md
  warning: z.string().max(60).optional(), // NO "detail" — línea de aviso de trampa (D-05)
  speech: z.string().optional(), // reservado para Fase 3, sin usar aquí
})

const StepSchema = TextBlockSchema.extend({
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  kind: z.enum(['step', 'summary']).default('step'),
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
  title: z.string().min(1), // rótulo de bloque autorado — fuente del índice de salto
  summaryLabel: z.string().optional(),
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
  // "<= 1" en Fase 1 — TODO(fase 2): endurecer a === 1 cuando exista la sección "round"
  if (repeating.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `At most one section may have repeats:true, found ${repeating.length}`,
    })
  }

  const allIds = game.sections.flatMap(s =>
    [s.id, ...s.phases.flatMap(p => [p.id, ...p.steps.map(st => st.id)])])
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i)
  if (dupes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate ids: ${[...new Set(dupes)].join(', ')}`,
    })
  }
})

export function validateGameDefinition(json: unknown): GameDefinition {
  return GameDefinitionSchema.parse(json) as unknown as GameDefinition
}
