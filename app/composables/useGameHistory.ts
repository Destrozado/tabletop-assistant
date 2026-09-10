// app/composables/useGameHistory.ts
// La SEGUNDA costura reactiva de la app (la primera es useGameSession.ts):
// envuelve el motor puro del histórico (`~~/engine/history`,
// `~~/engine/statistics`) y la capa de almacenamiento (`usePersistedSession`)
// para que las pantallas de `/historico` y `/estadisticas` — y la pantalla
// de juego, al registrar — sigan siendo tontas. Ningún componente ni página
// puede importar `~~/engine/*`: si una pantalla necesitara algo del motor
// que no esté ya aquí, falta una computed en este fichero, no un import
// nuevo en el componente.
//
// Aquí viven además las dos cosas que el motor no puede hacer por
// disciplina propia: resolver el alias español congelado (D-11, los datos
// de alias viven en `app/data/`, fuera del alcance de `engine/`) y leer el
// reloj real, invocado aquí y solo aquí — el motor lo recibe siempre
// inyectado como argumento.
import { buildHistoryEntry } from '~~/engine/history'
import type { FrozenNames } from '~~/engine/history'
import { resolvePlayerSlots, resolveVillainId } from '~~/engine/selection'
import type { CharacterCatalogue, EngineSession, GameOutcome, SessionContext } from '~~/engine/types'
import { useCharacterCatalogue } from './useCharacterCatalogue'
import { resolveHeroSpanishName } from './useHeroSearch'
import { usePersistedSession } from './usePersistedSession'

// resolveFrozenNames: responde a la Open Question 2 de 09-RESEARCH.md — el
// alias español (D-11) se resuelve AQUÍ, en la capa de interfaz, y llega al
// motor como dato plano vía `FrozenNames`. Nunca al revés.
//
// - `villainName`: busca `resolveVillainId(context)` en `catalogue.villains`
//   por `id`. `null` si no hay villano elegido o si el id ya no existe en
//   el catálogo. Los villanos no llevan alias español (`buildVillainOptions`
//   ya usa `villain.name` tal cual) — el nombre del catálogo ES el que se
//   vio en pantalla.
// - `heroNames`: por cada hueco con `heroId` no nulo, busca el héroe en
//   `catalogue.heroes` y resuelve su alias con `resolveHeroSpanishName`. Un
//   `heroId` que ya no exista en el catálogo (regenerado desde una API de
//   terceros, D-11) simplemente no entra en el mapa — `buildHistoryEntry`
//   dejará su `heroName` en `null` para ese hueco.
export function resolveFrozenNames(
  context: SessionContext,
  catalogue: CharacterCatalogue | null,
): FrozenNames {
  const villainId = resolveVillainId(context)
  const villainName = villainId !== null
    ? (catalogue?.villains.find(villain => villain.id === villainId)?.name ?? null)
    : null

  const heroNames: Record<string, string> = {}
  for (const slot of resolvePlayerSlots(context)) {
    if (slot.heroId === null) continue
    const hero = catalogue?.heroes.find(candidate => candidate.id === slot.heroId)
    if (hero) heroNames[slot.heroId] = resolveHeroSpanishName(slot.heroId, hero.name)
  }

  return { villainName, heroNames }
}

export function useGameHistory() {
  const { getCatalogue } = useCharacterCatalogue()
  const { appendHistoryEntry } = usePersistedSession()

  // record: resuelve el catálogo, congela los nombres en esta capa (D-11) y
  // construye la entrada con el motor puro. El reloj real se lee AQUÍ y
  // solo aquí — el resto del fichero, y todo `engine/`, lo reciben
  // inyectado. Ninguna escritura de este fichero espera nada de red: la
  // firma es totalmente síncrona por diseño (una fase futura es quien
  // podría cambiar esto, no esta).
  function record(session: EngineSession, outcome: GameOutcome): boolean {
    const catalogue = getCatalogue(session.gameId)
    const names = resolveFrozenNames(session.context, catalogue)
    const entry = buildHistoryEntry(session, outcome, Date.now(), names)
    return appendHistoryEntry(entry)
  }

  return {
    record,
  }
}
