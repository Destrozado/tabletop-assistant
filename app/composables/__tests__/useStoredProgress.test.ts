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
import { toPersistedPosition } from '~~/engine/persistence'
import type { PersistedPosition } from '~~/engine/persistence'
import { usePersistedSession } from '../usePersistedSession'
import { esLaMismaPartida, huellaDelProgreso, PLACEHOLDER_CONTEXT, readStoredProgress } from '../useStoredProgress'

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

  it('sin segundo argumento, tres autoguardados y cierre fallido: sigue devolviendo resumable (la firma opcional no cambia el comportamiento del montaje)', () => {
    const { save } = usePersistedSession()
    save(expand(tinyGame, { playerCount: 2, difficulty: 'normal' }))
    save({ ...expand(tinyGame, { playerCount: 2, difficulty: 'normal' }), cursor: 1 })
    save({ ...expand(tinyGame, { playerCount: 2, difficulty: 'normal' }), cursor: 2 })

    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('resumable')
  })

  describe('con `esperada` — la autoridad contesta «¿es ESTO lo que hay?» (plan 09-28, séptima cara del defecto)', () => {
    it('lo que hay en disco es idéntico a `esperada` → resumable', () => {
      const { save } = usePersistedSession()
      const session = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
      save(session)

      const report = readStoredProgress(tinyGame, session)
      expect(report.stored).toBe('resumable')
    })

    it('lo que hay en disco es OTRO runtimeId → stale', () => {
      const { save } = usePersistedSession()
      const enDisco = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
      save(enDisco)

      const esperada = { ...enDisco, cursor: 1 }
      const report = readStoredProgress(tinyGame, esperada)
      expect(report.stored).toBe('stale')
    })

    it('mismo runtimeId pero OTRA round → stale', () => {
      const { save } = usePersistedSession()
      const enDisco = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
      save(enDisco)

      const esperada = { ...enDisco, round: enDisco.round + 1 }
      const report = readStoredProgress(tinyGame, esperada)
      expect(report.stored).toBe('stale')
    })

    it('mismo runtimeId y round pero OTRO context (playerCount distinto) → stale', () => {
      const { save } = usePersistedSession()
      const enDisco = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
      save(enDisco)

      const esperada = { ...enDisco, context: { playerCount: 3, difficulty: 'normal' as const } }
      const report = readStoredProgress(tinyGame, esperada)
      expect(report.stored).toBe('stale')
    })

    it('`updatedAt` distinto (dos escrituras de la misma posición en instantes distintos) NO produce stale', () => {
      const { save } = usePersistedSession()
      const session = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
      save(session)
      // Segunda escritura de la MISMA posición: `save()` fija su propio
      // `updatedAt` internamente, así que basta con volver a guardar para
      // que la clave en disco tenga un `updatedAt` distinto del de la
      // primera vez.
      save(session)

      const report = readStoredProgress(tinyGame, session)
      expect(report.stored).toBe('resumable')
    })

    it('un `context` con las mismas claves en distinto orden de serialización NO produce stale', () => {
      const { save } = usePersistedSession()
      const enDisco = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
      save(enDisco)

      const esperada = { ...enDisco, context: { difficulty: 'normal' as const, playerCount: 2 } }
      const report = readStoredProgress(tinyGame, esperada)
      expect(report.stored).toBe('resumable')
    })

    it('clave ausente + esperada → absent, no stale: no hay nada que comparar', () => {
      const esperada = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
      const report = readStoredProgress(tinyGame, esperada)
      expect(report.stored).toBe('absent')
    })

    it('getItem que lanza + esperada → unknown, no stale: no se ha podido leer', () => {
      fakeStorage.getItem.mockImplementation(() => {
        throw new Error('SecurityError')
      })
      const esperada = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })

      const report = readStoredProgress(tinyGame, esperada)
      expect(report.stored).toBe('unknown')
    })

    it('contentVersion distinto + esperada → stale y outcome content-changed: hay algo que ofrecer, pero no es esta partida', () => {
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

      const report = readStoredProgress(tinyGame, structural)
      expect(report.outcome).toBe('content-changed')
      expect(report.stored).toBe('stale')
    })
  })
})

describe('huella — testigo del referente exacto para useProgressMismatchMark.ts (Task 3, plan 09-38)', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage()
    ;(globalThis as unknown as { window: unknown }).window = { localStorage: fakeStorage }
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    vi.restoreAllMocks()
  })

  it('\'absent\' (sin nada escrito): huella es null', () => {
    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('absent')
    expect(report.huella).toBe(null)
  })

  it('\'resumable\' (tras save() de una sesión real): huella NO es null', () => {
    const { save } = usePersistedSession()
    save(expand(tinyGame, { playerCount: 2, difficulty: 'normal' }))

    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('resumable')
    expect(report.huella).not.toBe(null)
  })

  it('\'stale\' (contentVersion distinto + esperada): huella NO es null', () => {
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

    const report = readStoredProgress(tinyGame, structural)
    expect(report.stored).toBe('stale')
    expect(report.huella).not.toBe(null)
  })

  it('\'unknown\' (getItem que lanza): huella es null', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError')
    })

    const report = readStoredProgress(tinyGame)
    expect(report.stored).toBe('unknown')
    expect(report.huella).toBe(null)
  })

  // Invariante (Task 1, punto 4 del <behavior>): el escenario canónico de
  // useProgressMismatchMark.ts SIEMPRE tiene un referente que huellar. Es
  // justo lo que impide que el `&& huella !== null` de `onOutcomeRecorded`
  // (app/pages/[game]/index.vue) sea un agujero silencioso: si esta
  // aserción alguna vez fallara, esa rama dejaría de poner la marca
  // exactamente en el caso para el que existe.
  it('invariante: stored === \'stale\' implica huella no nula (nunca hay \'stale\' sin referente que huellar)', () => {
    const structural = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    const enDisco = { ...structural, cursor: 1 }
    const { save } = usePersistedSession()
    save(enDisco)

    const esperada = structural
    const report = readStoredProgress(tinyGame, esperada)
    expect(report.stored).toBe('stale')
    expect(report.huella).not.toBe(null)
  })

  it('huellaDelProgreso: estable frente al orden de claves del `context` (mismas claves, otro orden de serialización)', () => {
    const base: PersistedPosition = {
      formatVersion: 1,
      gameId: 'tiny-game',
      contentVersion: 1,
      runtimeId: 'r1',
      round: 1,
      context: { playerCount: 2, difficulty: 'normal' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const mismoContextOtroOrden: PersistedPosition = {
      ...base,
      context: { difficulty: 'normal', playerCount: 2 },
    }

    expect(huellaDelProgreso(base)).toBe(huellaDelProgreso(mismoContextOtroOrden))
  })

  it('huellaDelProgreso: SENSIBLE a `updatedAt` (a diferencia de esLaMismaPartida, que lo excluye a propósito)', () => {
    const base: PersistedPosition = {
      formatVersion: 1,
      gameId: 'tiny-game',
      contentVersion: 1,
      runtimeId: 'r1',
      round: 1,
      context: { playerCount: 2, difficulty: 'normal' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const otroUpdatedAt: PersistedPosition = { ...base, updatedAt: '2026-06-01T00:00:00.000Z' }

    expect(huellaDelProgreso(base)).not.toBe(huellaDelProgreso(otroUpdatedAt))
    // Contraste explícito con esLaMismaPartida (plan 09-28), que SÍ excluye
    // updatedAt porque contesta otra pregunta — las dos funciones conviven
    // a propósito, ver el comentario de huellaDelProgreso en useStoredProgress.ts.
    expect(esLaMismaPartida(base, otroUpdatedAt)).toBe(true)
  })
})

describe('esLaMismaPartida — comparación normalizada, sin `updatedAt` (plan 09-28)', () => {
  it('`updatedAt` distinto devuelve true (queda excluido de la comparación)', () => {
    const enDisco: PersistedPosition = {
      formatVersion: 1,
      gameId: 'tiny-game',
      contentVersion: 1,
      runtimeId: 'r1',
      round: 1,
      context: { playerCount: 2, difficulty: 'normal' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const objetivo: PersistedPosition = { ...enDisco, updatedAt: '2026-06-01T00:00:00.000Z' }

    expect(esLaMismaPartida(enDisco, objetivo)).toBe(true)
  })

  it('un `context` con las mismas claves construidas en otro orden devuelve true', () => {
    const enDisco: PersistedPosition = {
      formatVersion: 1,
      gameId: 'tiny-game',
      contentVersion: 1,
      runtimeId: 'r1',
      round: 1,
      context: { playerCount: 2, difficulty: 'normal' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const objetivo: PersistedPosition = {
      ...enDisco,
      context: { difficulty: 'normal', playerCount: 2 },
    }

    expect(esLaMismaPartida(enDisco, objetivo)).toBe(true)
  })

  it('un `context` con el mismo `playerCount` pero distinta `difficulty` devuelve false', () => {
    const enDisco: PersistedPosition = {
      formatVersion: 1,
      gameId: 'tiny-game',
      contentVersion: 1,
      runtimeId: 'r1',
      round: 1,
      context: { playerCount: 2, difficulty: 'normal' },
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const objetivo: PersistedPosition = { ...enDisco, context: { playerCount: 2, difficulty: 'expert' } }

    expect(esLaMismaPartida(enDisco, objetivo)).toBe(false)
  })

  it('`toPersistedPosition` de una sesión recién guardada compara igual consigo misma', () => {
    const session = expand(tinyGame, { playerCount: 2, difficulty: 'normal' })
    expect(esLaMismaPartida(toPersistedPosition(session), toPersistedPosition(session))).toBe(true)
  })
})
