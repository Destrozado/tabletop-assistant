// app/composables/__tests__/useStoredProgress.test.ts
// Tabla de verdad de la autoridad de lectura (CR-01 ronda 5). Mismo patrón
// que `usePersistedSession.test.ts`: entorno `node` del proyecto `app-logic`,
// doble de `localStorage` instalado en `globalThis.window` en `beforeEach` y
// retirado en `afterEach` — no hace falta jsdom/happy-dom.
//
// Carga del fixture vía import de módulo JSON (`resolveJsonModule`), NO con
// `readFileSync`/`fileURLToPath` (el patrón de `engine/__tests__/audio-ids.test.ts`):
// ese fichero vive fuera del alcance de `npm run typecheck` (09-24), pero
// este test vive bajo `app/composables/__tests__/`, que SÍ está cubierto —
// `node:fs`/`node:url` no tienen tipos ahí sin `@types/node` (no instalado),
// mientras que el resto de `app/composables/*.ts` ya importa JSON de
// contenido exactamente así (`useGameContent.ts`, `useCharacterCatalogue.ts`).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import rawTinyGame from '../../../engine/__tests__/fixtures/tiny-game.json'
import { expand } from '~~/engine/expand'
import { validateGameDefinition } from '~~/engine/schema'
import type { PersistedPosition } from '~~/engine/persistence'
import { usePersistedSession } from '../usePersistedSession'
import { PLACEHOLDER_CONTEXT, readStoredProgress } from '../useStoredProgress'

const tinyGame = validateGameDefinition(rawTinyGame)

function createFakeLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
  }
}

describe('readStoredProgress — la autoridad sobre lo que hay en el dispositivo (CR-01 ronda 5)', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: fakeStorage }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    vi.restoreAllMocks()
  })

  it('sin nada escrito → absent/fresh', () => {
    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('absent')
    expect(report.outcome).toBe('fresh')
  })

  it('tras save() de una sesión real → resumable/resumed, con el context persistido (no el placeholder)', () => {
    const { save } = usePersistedSession()
    const session = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    save(session)

    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('resumable')
    expect(report.outcome).toBe('resumed')
    expect(report.session.context.playerCount).toBe(2)
    expect(report.session.context.playerCount).not.toBe(PLACEHOLDER_CONTEXT.playerCount)
  })

  it('progreso en una posición avanzada → la sesión devuelta apunta al mismo runtimeId guardado', () => {
    const { save } = usePersistedSession()
    const structural = expand(tinyGame, { playerCount: 3, difficulty: 'normal' })
    const targetRuntimeId = structural.sequence[1]!.runtimeId
    const advanced = { ...structural, cursor: 1 }
    save(advanced)

    const report = readStoredProgress(tinyGame)
    expect(report.session.sequence[report.session.cursor]!.runtimeId).toBe(targetRuntimeId)
  })

  it('contentVersion distinto → content-changed/resumable — hay partida que ofrecer, aunque sea con aviso', () => {
    const structural = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: tinyGame.gameId,
      contentVersion: 99,
      runtimeId: structural.sequence[0]!.runtimeId,
      round: 1,
      context: { playerCount: 2, difficulty: 'normal' },
      updatedAt: new Date().toISOString(),
    }
    fakeStorage.setItem(`tga:progress:${tinyGame.gameId}`, JSON.stringify(persisted))

    const report = readStoredProgress(tinyGame)
    expect(report.outcome).toBe('content-changed')
    expect(report.stored).toBe('resumable')
  })

  it('context inválido (playerCount fuera de rango, WR-03 ronda 3) → fresh/absent — lectura correcta, nada que ofrecer', () => {
    const structural = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    const persisted: PersistedPosition = {
      formatVersion: 1,
      gameId: tinyGame.gameId,
      contentVersion: tinyGame.contentVersion,
      runtimeId: structural.sequence[0]!.runtimeId,
      round: 1,
      context: { playerCount: 0, difficulty: 'normal' },
      updatedAt: new Date().toISOString(),
    }
    fakeStorage.setItem(`tga:progress:${tinyGame.gameId}`, JSON.stringify(persisted))

    const report = readStoredProgress(tinyGame)
    expect(report.outcome).toBe('fresh')
    expect(report.stored).toBe('absent')
  })

  it('JSON corrupto en la clave del progreso → absent — lectura correcta, contenido inservible', () => {
    fakeStorage.setItem(`tga:progress:${tinyGame.gameId}`, '{ esto no es JSON')

    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('absent')
  })

  it('el test que cierra la clase: getItem que lanza → unknown, nunca absent ni resumable', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })

    // Este es el valor que impide que la interfaz afirme una ausencia que
    // nadie ha comprobado — el BLOCKER literal de la ronda 5.
    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('unknown')
  })

  it('la autoridad no escribe nada en el dispositivo', () => {
    readStoredProgress(tinyGame)
    expect(fakeStorage.setItem).not.toHaveBeenCalled()
  })
})
