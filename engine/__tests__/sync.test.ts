// engine/__tests__/sync.test.ts
// Cobertura de la lista blanca de D-09: ningún campo extra sobrevive a la
// proyección, y los doce campos esperados se copian con su valor.
import { describe, expect, it } from 'vitest'
import { buildSyncPayload, SYNC_PAYLOAD_FIELDS } from '../sync'
import type { GameHistoryEntry } from '../types'

function baseEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    id: 'entry-1',
    gameId: 'marvel-champions',
    result: 'won',
    lossCause: null,
    villainId: 'rhino',
    villainName: 'Rhino',
    players: [
      { heroId: 'spider-man', heroName: 'Spider-Man', playerName: 'Ana' },
      { heroId: null, heroName: null, playerName: 'Luis' },
    ],
    difficulty: 'normal',
    playerCount: 2,
    round: 5,
    durationMs: 1_800_000,
    recordedAt: '2026-09-22T12:00:00.000Z',
    ...overrides,
  }
}

describe('SYNC_PAYLOAD_FIELDS — la lista blanca declarada', () => {
  it('tiene exactamente los doce nombres esperados, en orden', () => {
    expect(SYNC_PAYLOAD_FIELDS).toEqual([
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
    ])
  })
})

describe('buildSyncPayload — D-09: proyección por lista blanca, nunca spread', () => {
  it('copia los doce campos con su valor exacto', () => {
    const entry = baseEntry()
    const payload = buildSyncPayload(entry)

    expect(payload.id).toBe(entry.id)
    expect(payload.gameId).toBe(entry.gameId)
    expect(payload.result).toBe(entry.result)
    expect(payload.lossCause).toBe(entry.lossCause)
    expect(payload.villainId).toBe(entry.villainId)
    expect(payload.villainName).toBe(entry.villainName)
    expect(payload.difficulty).toBe(entry.difficulty)
    expect(payload.playerCount).toBe(entry.playerCount)
    expect(payload.round).toBe(entry.round)
    expect(payload.durationMs).toBe(entry.durationMs)
    expect(payload.recordedAt).toBe(entry.recordedAt)
  })

  it('Object.keys() de la salida es exactamente SYNC_PAYLOAD_FIELDS, incluso con un campo extra inyectado en la entrada', () => {
    const entry = { ...baseEntry(), unexpectedField: 'basura-inyectada' } as GameHistoryEntry & { unexpectedField: string }
    const payload = buildSyncPayload(entry)

    expect(Object.keys(payload).sort()).toEqual([...SYNC_PAYLOAD_FIELDS].sort())
    expect(payload).not.toHaveProperty('unexpectedField')
  })

  it('un campo extra inyectado en la entrada NO aparece en la salida', () => {
    const entry = { ...baseEntry(), secretToken: 'no-deberia-subir' } as GameHistoryEntry & { secretToken: string }
    const payload = buildSyncPayload(entry)

    expect(JSON.stringify(payload)).not.toContain('secretToken')
    expect(JSON.stringify(payload)).not.toContain('no-deberia-subir')
  })

  it('cada jugador sale con exactamente sus tres campos, ni uno más', () => {
    const entry = baseEntry({
      players: [
        { heroId: 'thor', heroName: 'Thor', playerName: 'Marcos' } as GameHistoryEntry['players'][number] & { extra?: string },
      ],
    })
    ;(entry.players[0] as unknown as { extra: string }).extra = 'basura'

    const payload = buildSyncPayload(entry)

    expect(payload.players).toHaveLength(1)
    expect(Object.keys(payload.players[0]!).sort()).toEqual(['heroId', 'heroName', 'playerName'])
    expect(payload.players[0]).toEqual({ heroId: 'thor', heroName: 'Thor', playerName: 'Marcos' })
  })

  it('reconstruye varios jugadores manteniendo heroId/heroName null cuando el hueco no tenía héroe', () => {
    const entry = baseEntry()
    const payload = buildSyncPayload(entry)

    expect(payload.players).toEqual([
      { heroId: 'spider-man', heroName: 'Spider-Man', playerName: 'Ana' },
      { heroId: null, heroName: null, playerName: 'Luis' },
    ])
  })
})
