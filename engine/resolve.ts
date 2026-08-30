// engine/resolve.ts
// Fusiona la variante de dificultad sobre el TextBlock base, campo a campo.
// No hace aritmética ni sustituye tokens numéricos (D-07/D-08): las fórmulas
// se devuelven tal cual y el nº de jugadores nunca entra en el texto de un paso.
import type { RuntimeStepNode, SessionContext, TextBlock } from './types'

export function resolveText(node: RuntimeStepNode, context: SessionContext): TextBlock {
  const variant = node.step.variants?.difficulty?.[context.difficulty]
  return {
    text: variant?.text ?? node.step.text,
    warning: variant?.warning ?? node.step.warning,
    warningDetail: variant?.warningDetail ?? node.step.warningDetail,
    options: variant?.options ?? node.step.options,
    optionsWarning: variant?.optionsWarning ?? node.step.optionsWarning,
    speech: variant?.speech ?? node.step.speech,
  }
}

// resolveAudioId (VOZ-07): qué identificador de audio pregenerado corresponde
// AHORA al paso actual, para el camino de reproducción de la Fase 3.1. Refleja
// EXACTAMENTE la rama de variante de resolveText (`speech: variant?.speech ??
// node.step.speech`) en vez de reimplementar la detección de variantes: si algún
// día una variante define `text` pero no `speech`, resolveText cae al `speech`
// base y este debe caer al id base con él. Por eso la condición mira
// `?.speech !== undefined`, nunca la mera existencia del objeto de variante.
// Sin try/catch: función pura sobre datos ya validados por el esquema Zod: la
// defensividad vive en el sitio de llamada (misma convención que resolveText).
export function resolveAudioId(node: RuntimeStepNode, context: SessionContext): string | null {
  const variant = node.step.variants?.difficulty?.[context.difficulty]
  if (variant?.speech !== undefined) {
    return `${node.step.id}.${context.difficulty}`
  }
  if (node.step.speech !== undefined) {
    return node.step.id
  }
  return null
}
