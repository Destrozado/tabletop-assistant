// engine/encounterSets.ts
// Módulos de encuentro adicionales y línea de conjuntos a reunir (quick
// 260925-mpj, D-01/D-04/D-05/D-06/D-07). Módulo puro, hermano estructural de
// engine/selection.ts y engine/counters.ts: cero imports de Vue/Nuxt/DOM.
// Importa de `./selection` (nunca al revés, evita un ciclo: `selection.ts`
// no importa este módulo).
//
// T-mpj-01 (threat model de este quick): `context.selection.moduleIds` es
// editable a mano (DevTools) o viene de una versión anterior sin este campo.
// `resolveModuleIds` es la ÚNICA puerta de lectura: valida por TIPO, nunca
// por presencia, y nunca lanza.
import { emptySelection, resolvePlayerSlots, resolveVillainId } from './selection'
import type { CharacterCatalogue, EngineSession, HeroSelection, SessionContext } from './types'

// ModuleOption: forma ya resuelta para pintar el modal «Módulos» —
// `difficulty` solo presente cuando el catálogo la trae (asignación
// condicional, nunca `undefined` explícito, mismo patrón que
// `scripts/catalogue/fetch-marvelcdb.mjs`).
export interface ModuleOption {
  id: string
  name: string
  difficulty?: number
  recommended: boolean
}

// D-04: el recomendado del villano actual va primero (si existe en
// `catalogue.modules`); el resto conserva el orden del catálogo. Sin
// villano, con un villano desconocido, o con un recomendado que ya no
// existe en `modules` (catálogo regenerado sin ese módulo): orden de
// catálogo tal cual, ninguno marcado `recommended`. Catálogo `null` → `[]`.
export function orderModulesForVillain(
  catalogue: CharacterCatalogue | null,
  villainId: string | null,
): ModuleOption[] {
  if (catalogue === null) return []

  const villain = villainId !== null ? catalogue.villains.find(v => v.id === villainId) ?? null : null
  const recommendedId = villain?.recommendedModuleId ?? null
  const recommendedExists = recommendedId !== null && catalogue.modules.some(m => m.id === recommendedId)

  const ordered = recommendedExists
    ? [
        catalogue.modules.find(m => m.id === recommendedId)!,
        ...catalogue.modules.filter(m => m.id !== recommendedId),
      ]
    : catalogue.modules

  return ordered.map((module) => {
    const option: ModuleOption = { id: module.id, name: module.name, recommended: module.id === recommendedId }
    if (module.difficulty !== undefined) option.difficulty = module.difficulty
    return option
  })
}

// T-mpj-01/D-06 (regla dura): validación por TIPO, no por presencia.
// - `context.selection.moduleIds` es un array → conserva solo los `string`
//   que existen de verdad en `catalogue.modules`, sin duplicados, en el
//   orden de `orderModulesForVillain` (recomendado primero, luego orden de
//   catálogo) — así la lista que ve el modal y la que resuelve este
//   siempre coinciden en orden.
// - `moduleIds` ausente o de forma inesperada (no-array: `undefined`,
//   `null`, un string suelto, un número…): cae al RECOMENDADO del villano
//   actual, si ese villano y ese módulo existen en el catálogo; si no, `[]`.
// - `catalogue` `null` → `[]`. Nunca lanza.
export function resolveModuleIds(
  context: SessionContext,
  catalogue: CharacterCatalogue | null,
): string[] {
  if (catalogue === null) return []

  const selection = context.selection
  const rawModuleIds = selection !== null && typeof selection === 'object'
    ? (selection as { moduleIds?: unknown }).moduleIds
    : undefined

  if (Array.isArray(rawModuleIds)) {
    const validIds = new Set(
      rawModuleIds.filter((id): id is string => typeof id === 'string' && catalogue.modules.some(m => m.id === id)),
    )
    const villainId = resolveVillainId(context)
    return orderModulesForVillain(catalogue, villainId)
      .map(option => option.id)
      .filter(id => validIds.has(id))
  }

  // Sin moduleIds utilizable: recomendado del villano actual, si existe.
  const villainId = resolveVillainId(context)
  const villain = villainId !== null ? catalogue.villains.find(v => v.id === villainId) ?? null : null
  if (villain === null) return []
  return catalogue.modules.some(m => m.id === villain.recommendedModuleId)
    ? [villain.recommendedModuleId]
    : []
}

// Fija `context.selection.moduleIds`. Mismo contrato que `setHero`/
// `setPlayerName` de engine/selection.ts: objeto NUEVO en `session`/
// `context`/`selection` y array NUEVO; sin `selection` previa parte de
// `emptySelection(playerCount)` (conserva `villainId: null`). Filtra
// entradas no-`string` y duplicados AL ESCRIBIR (defensa de escritura, igual
// que `setPlayerName` recorta el nombre al escribir); NO valida contra el
// catálogo — eso lo hace `resolveModuleIds` al leer, igual que `setHero` no
// valida `heroId` contra el catálogo de héroes.
export function setModules(session: EngineSession, moduleIds: string[]): EngineSession {
  const { playerCount } = session.context
  const current = session.context.selection ?? emptySelection(playerCount)
  const heroes = resolvePlayerSlots(session.context)
  const filtered = Array.isArray(moduleIds) ? moduleIds.filter((id): id is string => typeof id === 'string') : []
  const uniqueModuleIds = [...new Set(filtered)]
  const selection: HeroSelection = { ...current, heroes, moduleIds: uniqueModuleIds }
  return {
    ...session,
    context: {
      ...session.context,
      selection,
    },
  }
}

// Toca un módulo: si `moduleId` no existe en `catalogue.modules` (catálogo
// `null` incluido), devuelve la MISMA referencia de sesión sin clonar
// (mismo no-op que `jumpTo` con un `runtimeId` desconocido). Si existe,
// parte de `resolveModuleIds` (así el primer toque convierte el valor por
// defecto — el recomendado — en una selección explícita) y añade o quita,
// delegando en `setModules` para la forma de la escritura.
export function toggleModule(
  session: EngineSession,
  moduleId: string,
  catalogue: CharacterCatalogue | null,
): EngineSession {
  if (catalogue === null || !catalogue.modules.some(m => m.id === moduleId)) return session

  const current = resolveModuleIds(session.context, catalogue)
  const next = current.includes(moduleId)
    ? current.filter(id => id !== moduleId)
    : [...current, moduleId]
  return setModules(session, next)
}

// D-07: la línea de conjuntos a reunir — [nombre español del set del
// villano (si hay villano en el catálogo), «Normal», «Experto» SOLO en
// dificultad Experta, ...nombres de los módulos de `resolveModuleIds`, en
// ese orden]. Sin villano Y sin ningún módulo: `[]` (nada que reunir, D-07
// del quick: la línea del paso no debe pintar nada). Catálogo `null` → `[]`.
// La línea "Kang Experto" (`exp_kang`) NUNCA aparece aquí — queda fuera de
// `catalogue.modules` (D-01) porque la sustitución de cartas de villano en
// Experto ya la cubre el paso `setup.escenario.04`.
export function resolveEncounterSetNames(
  context: SessionContext,
  catalogue: CharacterCatalogue | null,
): string[] {
  if (catalogue === null) return []

  const villainId = resolveVillainId(context)
  const villain = villainId !== null ? catalogue.villains.find(v => v.id === villainId) ?? null : null
  const moduleIds = resolveModuleIds(context, catalogue)

  if (villain === null && moduleIds.length === 0) return []

  const names: string[] = []
  if (villain !== null) names.push(villain.encounterSetName)
  names.push(catalogue.baseSets.standard)
  if (context.difficulty === 'expert') names.push(catalogue.baseSets.expert)
  for (const moduleId of moduleIds) {
    const module = catalogue.modules.find(m => m.id === moduleId)
    if (module) names.push(module.name)
  }
  return names
}
