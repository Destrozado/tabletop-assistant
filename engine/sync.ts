// engine/sync.ts
// Fase 10: proyección PURA de una entrada del histórico al documento que
// sube a Firestore (D-09). Mismo contrato de pureza que `engine/history.ts`:
// cero Vue, cero SDK de Firebase, cero DOM — solo importaciones relativas
// dentro de `engine/`, igual que el resto de este directorio.
//
// D-09: `buildSyncPayload` construye el documento CAMPO A CAMPO, nunca con
// un `spread` de `entry` (`{ ...entry }`). El motivo es un acoplamiento que
// hay que dejar escrito, mismo patrón que `scripts/catalogue/fetch-marvelcdb.mjs`
// documenta para su propia lista blanca (`extractHero`): `SYNC_PAYLOAD_FIELDS`
// es la MISMA lista que `firestore.rules` valida con `hasOnly()` (plan
// 10-02). Añadir un campo aquí sin añadirlo a las reglas hace que la
// escritura se rechace en producción; añadirlo a las reglas sin añadirlo
// aquí deja esa parte de la regla muerta — un campo futuro de
// `GameHistoryEntry` no puede empezar a viajar a la nube solo porque exista
// en la entrada local. `SYNC_PAYLOAD_FIELDS` se exporta para que el gate del
// plan 10-02 pueda comparar las dos listas mecánicamente en vez de fiarse de
// este comentario.
import type { GameHistoryEntry, HistoryPlayerEntry } from './types'

// Los doce campos de `GameHistoryEntry` que cruzan la frontera hacia
// Firestore, en el mismo orden en que se declaran en `engine/types.ts`. El
// cliente añade además `uid` y `createdAt` FUERA de esta proyección (D-12,
// ver `app/composables/useHistorySync.ts`) — esos dos no forman parte del
// documento local y no pertenecen a esta lista.
export const SYNC_PAYLOAD_FIELDS = [
  'id',
  'gameId',
  'result',
  'lossCause',
  'villainId',
  'villainName',
  'players',
  'difficulty',
  'playerCount',
  'round',
  'durationMs',
  'recordedAt',
] as const

interface SyncPlayerEntry {
  heroId: string | null
  heroName: string | null
  playerName: string
}

// Mismos doce campos que `GameHistoryEntry` (`engine/types.ts:200-213`), con
// el mismo nombre y el mismo tipo — es literalmente la proyección de esa
// interfaz, sin `uid` ni `createdAt` (D-12: esos los añade el módulo de red,
// no esta función pura).
export interface FirestoreHistoryPayload {
  id: string
  gameId: string
  result: 'won' | 'lost'
  lossCause: GameHistoryEntry['lossCause']
  villainId: string | null
  villainName: string | null
  players: SyncPlayerEntry[]
  difficulty: GameHistoryEntry['difficulty']
  playerCount: number
  round: number
  durationMs: number | null
  recordedAt: string
}

function buildSyncPlayerEntry(player: HistoryPlayerEntry): SyncPlayerEntry {
  return {
    heroId: player.heroId,
    heroName: player.heroName,
    playerName: player.playerName,
  }
}

// D-09: proyección por lista blanca explícita, campo a campo — nunca un
// `spread` de `entry`. Reconstruye también cada elemento de `players` campo
// a campo, por el mismo motivo: un campo futuro añadido a
// `HistoryPlayerEntry` no debe empezar a viajar solo porque `entry.players`
// lo trae.
export function buildSyncPayload(entry: GameHistoryEntry): FirestoreHistoryPayload {
  return {
    id: entry.id,
    gameId: entry.gameId,
    result: entry.result,
    lossCause: entry.lossCause,
    villainId: entry.villainId,
    villainName: entry.villainName,
    players: entry.players.map(buildSyncPlayerEntry),
    difficulty: entry.difficulty,
    playerCount: entry.playerCount,
    round: entry.round,
    durationMs: entry.durationMs,
    recordedAt: entry.recordedAt,
  }
}
