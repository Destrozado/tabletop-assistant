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
