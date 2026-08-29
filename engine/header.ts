// engine/header.ts
// Deriva la etiqueta de cabecera y la posición relativa de un nodo actual
// (D-11 de la Fase 1, extendido por D-22/D-23 de la Fase 2). Dos tramos:
// - Tramo repetitivo (`node.sectionRepeats === true`, D-22): el contador es
//   relativo a la FASE actual de ese tramo, NUNCA a la sección entera — una
//   sección repetible puede agrupar varias fases (p. ej. 4+6=10 pasos);
//   filtrar por el id de sección daría "3 de 10" en vez del "3 de 6" que
//   exige la maqueta aprobada. Por eso el filtro de posición usa SIEMPRE
//   `phaseId`, nunca el id de sección.
// - Tramo lineal (`node.sectionRepeats === false`, D-23): sin cambios frente
//   a la Fase 1 — contador global sobre toda la secuencia.
// `plainSectionTitle` es siempre el nombre plano de la sección
// (`sectionTitle.toUpperCase()`), en ambos tramos: es la fuente del título
// del overlay del índice, que nunca debe reutilizar la etiqueta compuesta
// (que en el tramo repetitivo lleva la ronda y la fase) como cabecera de
// barra de título (Pitfall 4 de 02-RESEARCH.md).
// Puro: misma entrada -> misma salida, nunca muta `session.sequence`. Cero
// imports de Vue/Nuxt/DOM y cero conocimiento de los bloques de un juego
// concreto (TECH-04): decide únicamente por `node.sectionRepeats`.
import type { EngineSession } from './types'

export interface HeaderInfo {
  sectionLabel: string
  plainSectionTitle: string
  position: { current: number, total: number } | null
}

export function describeHeader(session: EngineSession): HeaderInfo | null {
  const node = session.sequence[session.cursor]
  if (!node) return null

  const plainSectionTitle = node.sectionTitle.toUpperCase()

  // Fallback ?? 'step' (WR-01): el `.default('step')` de GameDefinitionSchema
  // solo se aplica en Vitest/CI (validateGameDefinition); el contenido real
  // llega al navegador como JSON crudo sin pasar por Zod, así que un paso que
  // omita `kind` confiando en ese default llegaría aquí con `kind: undefined`
  // si no se replica el mismo fallback en tiempo de ejecución. Se replica en
  // TODOS los filtros de este fichero.
  if ((node.step.kind ?? 'step') === 'summary') {
    // Los resúmenes no llevan contador de posición en ningún tramo (D-03).
    return { sectionLabel: plainSectionTitle, plainSectionTitle, position: null }
  }

  if (node.sectionRepeats) {
    const phaseSteps = session.sequence.filter(
      n => n.phaseId === node.phaseId && (n.step.kind ?? 'step') === 'step',
    )
    const index = phaseSteps.findIndex(n => n.runtimeId === node.runtimeId)
    return {
      // `phaseTitle` va SIN .toUpperCase() (convención Title Case autorada en
      // 02-01 para los títulos de fase del tramo repetitivo), a diferencia
      // de `plainSectionTitle`.
      sectionLabel: `${plainSectionTitle} ${session.round} · ${node.phaseTitle}`,
      plainSectionTitle,
      position: index === -1 ? null : { current: index + 1, total: phaseSteps.length },
    }
  }

  // D-23: contador global del tramo NO repetitivo. En la Fase 1 esto
  // filtraba toda `session.sequence` sin distinción, porque el setup era la
  // única sección — ahora que el bucle coexiste con el setup, hay que
  // excluir explícitamente los nodos del tramo repetitivo (`!n.sectionRepeats`)
  // para seguir dando "8 de 23" y no "8 de 33". Sigue sin referenciar ningún
  // id de sección ni id concreto: la exclusión es por la misma bandera
  // `sectionRepeats` que ya usa la rama de arriba (TECH-04).
  const sectionSteps = session.sequence.filter(
    n => !n.sectionRepeats && (n.step.kind ?? 'step') === 'step',
  )
  const index = sectionSteps.findIndex(n => n.runtimeId === node.runtimeId)
  return {
    sectionLabel: plainSectionTitle,
    plainSectionTitle,
    position: index === -1 ? null : { current: index + 1, total: sectionSteps.length },
  }
}
