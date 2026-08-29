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
  warning: z.string().max(60).optional(), // línea de aviso de trampa (D-05)
  // D-32: consecuencia detallada del aviso, autorada aparte de `warning`.
  // No es el `detail` de propósito general que se rechazó en la Fase 1 (esa
  // idea, una elaboración "¿Por qué?" siempre visible en todos los pasos,
  // sigue rechazada — DC-6 de 02-03-PLAN.md); este campo es mucho más
  // estrecho: solo alimenta el modal que abre el `⚠` cuando existe.
  // Sin `.default()` a propósito: a diferencia de `kind` (WR-01), un campo
  // opcional sin valor por defecto llega como `undefined` tanto en el JSON
  // validado por Zod en Node como en el JSON crudo que recibe el navegador
  // — no hay divergencia que compensar, así que `app/` nunca debe añadir un
  // `?? fallback` para este campo (no copiar el patrón de `kind`).
  warningDetail: z.string().max(320).optional(),
  speech: z.string().max(120).optional(), // DC-1 (02-01-PLAN.md): política de fase para el contenido de la ronda desde ya; el consumidor en tiempo de ejecución (TTS) sigue siendo Fase 3
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
  // Opcionales (WR-06): rango de nº de jugadores válido para este juego.
  // Sin valor por defecto a propósito — a diferencia de `kind` (WR-01), no
  // hay ningún sitio en tiempo de ejecución que necesite un fallback
  // silencioso; MiniSetupScreen.vue recibe minPlayers/maxPlayers ya
  // resueltos desde la página que lo invoca.
  minPlayers: z.number().int().positive().optional(),
  maxPlayers: z.number().int().positive().optional(),
  sections: z.array(SectionSchema).min(1),
}).superRefine((game, ctx) => {
  const repeating = game.sections.filter(s => s.repeats)
  // D-37: exactamente una sección repeats:true, ni cero ni dos. Una sección sin
  // bucle dejaría loopStartIndex/loopEndIndex indefinidos (engine/expand.ts) y
  // el juego llegaría a la mesa sin ronda, en silencio.
  if (repeating.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Exactly one section must have repeats:true, found ${repeating.length}`,
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

  // D-32/DC-8: warningDetail sin warning visible es interfaz inalcanzable —
  // el ⚠ que abriría su modal nunca se pinta. Se aplica al bloque base y,
  // por separado, a cada variante de dificultad (una variante hereda
  // warning del base solo si ella misma no lo sobrescribe).
  for (const section of game.sections) {
    for (const phase of section.phases) {
      for (const step of phase.steps) {
        if (step.warningDetail !== undefined && step.warning === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Step "${step.id}" declares warningDetail without warning`,
          })
        }
        const difficultyVariants = step.variants?.difficulty
        if (difficultyVariants) {
          for (const [level, variant] of Object.entries(difficultyVariants)) {
            if (!variant) continue
            const effectiveWarning = variant.warning ?? step.warning
            if (variant.warningDetail !== undefined && effectiveWarning === undefined) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Step "${step.id}" variant "${level}" declares warningDetail without warning`,
              })
            }
          }
        }
      }
    }
  }

  if (game.minPlayers !== undefined && game.maxPlayers !== undefined && game.minPlayers > game.maxPlayers) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `minPlayers (${game.minPlayers}) must be <= maxPlayers (${game.maxPlayers})`,
    })
  }
})

export function validateGameDefinition(json: unknown): GameDefinition {
  return GameDefinitionSchema.parse(json) as unknown as GameDefinition
}
