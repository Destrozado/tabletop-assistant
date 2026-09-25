// engine/__tests__/stepValues.test.ts
// Cobertura de engine/stepValues.ts (Fase 8, plan 02): fija D-04, D-05,
// D-11, D-13, D-14, D-15 y la batería defensiva. Mismo patrón de carga de
// catálogo real que engine/__tests__/counters.test.ts, para que las
// cifras se contrasten entre suites en vez de inventar valores nuevos.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveStepValue, resolveStepValueRows, resolveStepValueText } from '../stepValues'
import type { CharacterCatalogue, SessionContext } from '../types'

const catalogueContentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const catalogue: CharacterCatalogue = JSON.parse(readFileSync(catalogueContentPath, 'utf-8'))

const rhino = catalogue.villains.find(v => v.id === 'rhino')!
const kang = catalogue.villains.find(v => v.id === 'kang')!
const thor = catalogue.heroes.find(h => h.id === 'thor')!
const sheHulk = catalogue.heroes.find(h => h.id === 'she-hulk')!
const spiderMan = catalogue.heroes.find(h => h.id === 'spider-man')!

// Helper local: fabrica un SessionContext con una selección concreta, del
// mismo estilo que los fixtures de engine/__tests__/selection.test.ts.
function contextWith(
  playerCount: number,
  villainId: string | null,
  heroIds: (string | null)[],
  extra: Partial<SessionContext> = {},
): SessionContext {
  const heroes = heroIds.map(heroId => ({ heroId, playerName: '' }))
  return {
    playerCount,
    difficulty: 'normal',
    selection: { villainId, heroes },
    ...extra,
  }
}

describe('D-04/VAL-01 — resolveStepValue reutiliza computeInitialVillainHealth', () => {
  it('Rhino con 3 jugadores y dificultad normal devuelve 42', () => {
    const ctx = contextWith(3, 'rhino', [null, null, null])
    expect(resolveStepValue('villainHealth', ctx, catalogue)).toBe(42)
  })

  it('Kang en experto devuelve la cifra de experto (45), no la normal (36)', () => {
    const ctx = contextWith(3, 'kang', [null, null, null], { difficulty: 'expert' })
    expect(resolveStepValue('villainHealth', ctx, catalogue)).toBe(45)
    expect(resolveStepValue('villainHealth', ctx, catalogue)).not.toBe(36)
  })

  // Quick 260925-m2k: Ultron en Experto arranca en su propia etapa II
  // (expertStartStage: 2), sin cifras Expertas propias — a diferencia de
  // Kang, que sí las tiene.
  it('Ultron en experto arranca en la etapa II (66 con 3 jugadores), no en la etapa I (51)', () => {
    const ctx = contextWith(3, 'ultron', [null, null, null], { difficulty: 'expert' })
    expect(resolveStepValue('villainHealth', ctx, catalogue)).toBe(66)
    expect(resolveStepValue('villainHealth', ctx, catalogue)).not.toBe(51)
  })
})

describe('D-13 (regla dura) — nunca el contador congelado, siempre la cifra impresa', () => {
  it('villano a 38 de vida congelada: resolveStepValue sigue devolviendo 42', () => {
    const ctx = contextWith(3, 'rhino', [null, null, null], {
      counters: { villainHealth: 38, heroHealth: [] },
    })
    expect(resolveStepValue('villainHealth', ctx, catalogue)).toBe(42)
  })

  it('héroe con vida congelada distinta de la impresa: la fila sigue trayendo la impresa (14, no 8)', () => {
    const ctx = contextWith(1, null, ['thor'], {
      counters: { villainHealth: null, heroHealth: [8] },
    })
    const rows = resolveStepValueRows('heroHealth', ctx, catalogue)
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe(14)
    expect(rows[0].value).not.toBe(8)
  })
})

describe('D-05/VAL-02 — mano inicial usa handSizeAlterEgo, nunca la cara Héroe', () => {
  it('Spider-Man da 6 en la lista de mano inicial, y 6 no es la cifra de la cara Héroe (5)', () => {
    const ctx = contextWith(1, null, ['spider-man'])
    const rows = resolveStepValueRows('handSizeAlterEgo', ctx, catalogue)
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe(6)
    // RR v1.7 Apéndice II paso 1: el setup arranca con la cara Alter-Ego
    // boca arriba; la cifra de la cara Héroe (spiderMan.handSizeHero, 5) no
    // debe aparecer aquí.
    expect(rows[0].value).not.toBe(spiderMan.handSizeHero)
    expect(spiderMan.handSizeHero).toBe(5)
  })
})

describe('VAL-02 — vida inicial de identidad por jugador, en orden de hueco', () => {
  it('Thor / She-Hulk devuelven 14 y 15, con slot base 0 y heroName del catálogo', () => {
    const ctx = contextWith(2, null, ['thor', 'she-hulk'])
    const rows = resolveStepValueRows('heroHealth', ctx, catalogue)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ slot: 0, heroId: 'thor', heroName: thor.name, value: 14 })
    expect(rows[1]).toMatchObject({ slot: 1, heroId: 'she-hulk', heroName: sheHulk.name, value: 15 })
  })
})

describe('D-14 — selección parcial: solo las filas cuyo héroe se conoce', () => {
  it('4 jugadores, solo los huecos 0 y 2 con héroe: exactamente dos filas, slot 0 y 2', () => {
    const ctx = contextWith(4, null, ['thor', null, 'she-hulk', null])
    const rows = resolveStepValueRows('heroHealth', ctx, catalogue)
    expect(rows).toHaveLength(2)
    expect(rows.map(r => r.slot)).toEqual([0, 2])
    expect(rows.every(r => Number.isFinite(r.value))).toBe(true)
  })
})

describe('D-15/VAL-03 — sin ninguna selección, nada que pintar', () => {
  it('sin selección: resolveStepValue es null y resolveStepValueRows es [] para los dos kinds por jugador', () => {
    const ctx: SessionContext = { playerCount: 3, difficulty: 'normal' }
    expect(resolveStepValue('villainHealth', ctx, catalogue)).toBeNull()
    expect(resolveStepValueRows('heroHealth', ctx, catalogue)).toEqual([])
    expect(resolveStepValueRows('handSizeAlterEgo', ctx, catalogue)).toEqual([])
  })
})

describe('D-11 — sin caso especial para un solo jugador', () => {
  it('playerCount 1 con héroe elegido: resolveStepValueRows devuelve una fila (no colapsa a valor único)', () => {
    const ctx = contextWith(1, null, ['thor'])
    const rows = resolveStepValueRows('heroHealth', ctx, catalogue)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ slot: 0, heroId: 'thor', value: 14 })
  })

  it('playerCount 1: resolveStepValue sigue devolviendo null para heroHealth y handSizeAlterEgo', () => {
    const ctx = contextWith(1, null, ['thor'])
    expect(resolveStepValue('heroHealth', ctx, catalogue)).toBeNull()
    expect(resolveStepValue('handSizeAlterEgo', ctx, catalogue)).toBeNull()
  })
})

describe('D-02 — la forma de salida se deriva del propio miembro del enum', () => {
  it('villainHealth nunca produce filas, heroHealth/handSizeAlterEgo nunca producen un único valor', () => {
    const ctx = contextWith(3, 'rhino', ['thor', 'she-hulk', 'spider-man'])
    expect(resolveStepValueRows('villainHealth', ctx, catalogue)).toEqual([])
    expect(resolveStepValue('heroHealth', ctx, catalogue)).toBeNull()
    expect(resolveStepValue('handSizeAlterEgo', ctx, catalogue)).toBeNull()
  })

  it('un kind desconocido, undefined y null dan null y []', () => {
    const ctx = contextWith(3, 'rhino', ['thor', 'she-hulk', 'spider-man'])
    for (const kind of ['threat', undefined, null] as const) {
      expect(resolveStepValue(kind, ctx, catalogue)).toBeNull()
      expect(resolveStepValueRows(kind, ctx, catalogue)).toEqual([])
    }
  })
})

describe('Batería defensiva (calcada de resolveCounters/resolvePlayerSlots)', () => {
  it('playerCount 2.5, NaN, "3", 0 y negativo: nunca lanza, siempre null/[]', () => {
    const badPlayerCounts: unknown[] = [2.5, Number.NaN, '3', 0, -1]
    for (const playerCount of badPlayerCounts) {
      const ctx = { playerCount, difficulty: 'normal', selection: { villainId: 'rhino', heroes: [{ heroId: 'thor', playerName: '' }] } } as unknown as SessionContext
      expect(() => resolveStepValue('villainHealth', ctx, catalogue)).not.toThrow()
      expect(() => resolveStepValueRows('heroHealth', ctx, catalogue)).not.toThrow()
      const rows = resolveStepValueRows('heroHealth', ctx, catalogue)
      expect(Array.isArray(rows)).toBe(true)
      expect(rows.every(r => r !== undefined && Number.isFinite(r.value))).toBe(true)
    }
  })

  it('selection a null, a un número, y con heroes que no es un array: nunca lanza, siempre []', () => {
    const badSelections: unknown[] = [null, 42, { villainId: 'rhino', heroes: 'no-es-un-array' }]
    for (const selection of badSelections) {
      const ctx = { playerCount: 3, difficulty: 'normal', selection } as unknown as SessionContext
      expect(() => resolveStepValue('villainHealth', ctx, catalogue)).not.toThrow()
      expect(() => resolveStepValueRows('heroHealth', ctx, catalogue)).not.toThrow()
      expect(resolveStepValueRows('heroHealth', ctx, catalogue)).toEqual([])
    }
  })

  it('heroId apuntando a un héroe inexistente: la fila se descarta, sin lanzar', () => {
    const ctx = contextWith(1, null, ['heroe-inventado'])
    expect(() => resolveStepValueRows('heroHealth', ctx, catalogue)).not.toThrow()
    expect(resolveStepValueRows('heroHealth', ctx, catalogue)).toEqual([])
  })

  it('villainId apuntando a un villano inexistente: resolveStepValue es null, sin lanzar', () => {
    const ctx = contextWith(3, 'villano-inventado', [null, null, null])
    expect(() => resolveStepValue('villainHealth', ctx, catalogue)).not.toThrow()
    expect(resolveStepValue('villainHealth', ctx, catalogue)).toBeNull()
  })

  it('catalogue a null: todo resuelve null/[], sin lanzar', () => {
    const ctx = contextWith(3, 'rhino', ['thor', 'she-hulk', 'spider-man'])
    expect(() => resolveStepValue('villainHealth', ctx, null)).not.toThrow()
    expect(() => resolveStepValueRows('heroHealth', ctx, null)).not.toThrow()
    expect(resolveStepValue('villainHealth', ctx, null)).toBeNull()
    expect(resolveStepValueRows('heroHealth', ctx, null)).toEqual([])
  })
})

// Quick 260925-mpj (D-07): resolveStepValueText produce la línea de
// conjuntos a reunir para el kind 'encounterSets' — cobertura mínima aquí
// (resolveEncounterSetNames ya tiene su propia suite en
// engine/__tests__/encounterSets.test.ts).
describe("resolveStepValueText (D-07) — 'encounterSets' produce una línea, cualquier otro kind da null", () => {
  it("rhino en Experto sin personalizar: 'Rino · Normal · Experto · Amenaza de bomba'", () => {
    const ctx = contextWith(2, 'rhino', [null, null], { difficulty: 'expert' })
    expect(resolveStepValueText('encounterSets', ctx, catalogue)).toBe('Rino · Normal · Experto · Amenaza de bomba')
  })

  it('sin nombres que unir: null', () => {
    const ctx: SessionContext = { playerCount: 2, difficulty: 'normal' }
    expect(resolveStepValueText('encounterSets', ctx, catalogue)).toBeNull()
  })

  it('cualquier otro kind (incluidos villainHealth/heroHealth/handSizeAlterEgo/undefined/null) da null', () => {
    const ctx = contextWith(3, 'rhino', ['thor', 'she-hulk', 'spider-man'])
    for (const kind of ['villainHealth', 'heroHealth', 'handSizeAlterEgo', undefined, null] as const) {
      expect(resolveStepValueText(kind, ctx, catalogue)).toBeNull()
    }
  })

  it('resolveStepValue y resolveStepValueRows con "encounterSets" devuelven null y []', () => {
    const ctx = contextWith(2, 'rhino', [null, null], { difficulty: 'expert' })
    expect(resolveStepValue('encounterSets', ctx, catalogue)).toBeNull()
    expect(resolveStepValueRows('encounterSets', ctx, catalogue)).toEqual([])
  })
})

describe('D-13, guardarraíl estructural — el código fuente nunca llama a resolveCounterValues', () => {
  it('quitando los comentarios, la cadena resolveCounterValues no aparece en el fichero', () => {
    const sourcePath = fileURLToPath(new URL('../stepValues.ts', import.meta.url))
    const source = readFileSync(sourcePath, 'utf-8')
    const withoutComments = source
      .split('\n')
      .filter(line => !/^\s*\/\//.test(line) && !/^\s*\*/.test(line))
      .join('\n')
    expect(withoutComments).not.toContain('resolveCounterValues')
  })
})
