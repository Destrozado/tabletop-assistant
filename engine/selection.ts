// engine/selection.ts
// Mutadores puros de la selección de villano/héroes (Fase 6). Mismo
// contrato que `next`/`prev`/`jumpTo` de engine/navigator.ts: reciben un
// `EngineSession` y devuelven uno NUEVO, nunca mutan su argumento.
//
// Regla dura de esta fase (Pitfall 1 / SEL-08): cada mutador devuelve un
// objeto NUEVO en TODOS los niveles que cambia — `session`, `context`,
// `selection`, `heroes` y la entrada tocada — porque el `watchDebounced`
// de `app/pages/[game]/index.vue` NO es profundo. Una mutación in situ
// (p. ej. `session.context.selection.heroes[i].heroId = x`) actualizaría
// la pantalla igual, por el proxy reactivo profundo del `ref`, pero NUNCA
// dispararía el guardado — la selección se perdería al recargar la
// página, un bug que solo se manifiesta en producción, nunca mirando la
// pantalla en desarrollo.
//
// `engine/persistence.ts` no se toca: `context` ya viaja entero dentro de
// `toPersistedPosition`/`resume()` (D-19), así que un mutador que reasigne
// correctamente no necesita ninguna fontanería de persistencia nueva.
import type { EngineSession, HeroSelection, SessionContext } from './types'

// Cifra fijada por 06-UI-SPEC.md §Typography, cerrando el rango 12-16 de
// D-15. El `<input>` de la Fase 6 replica esta misma cifra como
// `maxlength="14"`, y cualquier fase futura que muestre el nombre debe
// reutilizar esta constante, no elegir otra.
export const PLAYER_NAME_MAX_LENGTH = 14

// Devuelve una `HeroSelection` vacía con tantos huecos como `playerCount`.
// Si `playerCount` no es un entero finito positivo, el array va vacío.
// Nunca lanza.
export function emptySelection(playerCount: number): HeroSelection {
  const length = Number.isInteger(playerCount) && playerCount > 0 ? playerCount : 0
  return {
    villainId: null,
    heroes: Array.from({ length }, () => ({ heroId: null, playerName: '' })),
  }
}

// Normalización defensiva (DC-02): `localStorage` es editable a mano
// (DevTools), así que esta función no confía en NINGÚN campo persistido.
// Valida por TIPO, no por presencia. La longitud devuelta es SIEMPRE
// `playerCount` (0 si no es un entero positivo) — `playerCount` manda,
// nunca se deriva el número de huecos de `selection.heroes.length` (Q8).
// Esto cubre a la vez el caso "sin selección" (D-20) y el caso "array
// desajustado o localStorage manipulado" con la misma línea, sin un `if`
// especial para el segundo. Nunca lanza, nunca devuelve `undefined`
// dentro del array.
export function resolvePlayerSlots(
  context: SessionContext,
): { heroId: string | null, playerName: string }[] {
  const length = Number.isInteger(context.playerCount) && context.playerCount > 0
    ? context.playerCount
    : 0
  const selection = context.selection
  const heroes = selection !== null && typeof selection === 'object' && Array.isArray(selection.heroes)
    ? selection.heroes
    : []

  return Array.from({ length }, (_, i) => {
    const entry = heroes[i]
    if (entry === null || typeof entry !== 'object') {
      return { heroId: null, playerName: '' }
    }
    const heroId = typeof entry.heroId === 'string' && entry.heroId.length > 0 ? entry.heroId : null
    const playerName = typeof entry.playerName === 'string'
      ? entry.playerName.slice(0, PLAYER_NAME_MAX_LENGTH)
      : ''
    return { heroId, playerName }
  })
}

// Devuelve `context.selection.villainId` solo si es un `string` no vacío;
// `null` en cualquier otro caso (incluido `selection` ausente o de forma
// inesperada). Nunca lanza.
export function resolveVillainId(context: SessionContext): string | null {
  const selection = context.selection
  if (selection === null || typeof selection !== 'object') return null
  const villainId = selection.villainId
  return typeof villainId === 'string' && villainId.length > 0 ? villainId : null
}

// Fija `context.selection.villainId`. Si no había `selection`, parte de
// `emptySelection(playerCount)`. Conserva `heroes` normalizado a la
// longitud de `playerCount` (vía `resolvePlayerSlots`), de modo que un
// array persistido corrupto se sanee al primer cambio.
//
// D-05 (quick 260925-mpj): regla de `moduleIds` al cambiar de villano — si
// el `villainId` nuevo es DISTINTO del actual (`resolveVillainId`),
// `moduleIds` NO se copia a la selección nueva, así que
// `resolveModuleIds` (engine/encounterSets.ts) volverá a resolver el
// recomendado del villano nuevo la próxima vez que se lea. Si es el MISMO
// villano (incluida la idempotencia de tocar el ya elegido), `moduleIds` se
// conserva tal cual estuviera (personalizado o ausente) — cambiar de
// villano y volver al mismo no debe perder la personalización. No se
// importa `engine/encounterSets.ts` desde aquí para evitar un ciclo:
// `encounterSets.ts` importa de este módulo, no al revés.
export function setVillain(session: EngineSession, villainId: string | null): EngineSession {
  const heroes = resolvePlayerSlots(session.context)
  const current = session.context.selection
  const isSameVillain = resolveVillainId(session.context) === villainId
  const moduleIds = isSameVillain && current !== null && typeof current === 'object' && Array.isArray(current.moduleIds)
    ? current.moduleIds
    : undefined
  const selection: HeroSelection = moduleIds !== undefined
    ? { villainId, heroes, moduleIds }
    : { villainId, heroes }
  return {
    ...session,
    context: {
      ...session.context,
      selection,
    },
  }
}

// Fija el héroe de un hueco. Si `slot` no es un entero dentro de
// `[0, playerCount)`, devuelve la MISMA referencia de sesión sin clonar
// (mismo no-op que `jumpTo` con un `runtimeId` desconocido; nunca lanza).
export function setHero(session: EngineSession, slot: number, heroId: string | null): EngineSession {
  const { playerCount } = session.context
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerCount) {
    return session
  }
  const current = session.context.selection ?? emptySelection(playerCount)
  const heroes = resolvePlayerSlots(session.context).map((entry, i) =>
    i === slot ? { ...entry, heroId } : entry)
  return {
    ...session,
    context: {
      ...session.context,
      selection: { ...current, heroes },
    },
  }
}

// Fija el nombre de un jugador. Mismo contrato de `slot` que `setHero`. El
// nombre se recorta a `PLAYER_NAME_MAX_LENGTH` caracteres al escribir
// (defensa de escritura; el `maxlength` del `<input>` es la defensa de la
// interfaz, no la única). El valor se guarda tal cual el usuario lo
// escribe, sin `trim` ni sustitución por «Jugador N» — la resolución del
// rótulo por defecto es de la capa de interfaz (D-15), no del motor:
// guardar «Jugador 1» como dato haría indistinguible «no puso nombre» de
// «escribió justo ese texto».
export function setPlayerName(session: EngineSession, slot: number, playerName: string): EngineSession {
  const { playerCount } = session.context
  if (!Number.isInteger(slot) || slot < 0 || slot >= playerCount) {
    return session
  }
  const current = session.context.selection ?? emptySelection(playerCount)
  const trimmedName = playerName.slice(0, PLAYER_NAME_MAX_LENGTH)
  const heroes = resolvePlayerSlots(session.context).map((entry, i) =>
    i === slot ? { ...entry, playerName: trimmedName } : entry)
  return {
    ...session,
    context: {
      ...session.context,
      selection: { ...current, heroes },
    },
  }
}
