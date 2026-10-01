// engine/__tests__/encounterSets.test.ts
// Cobertura de engine/encounterSets.ts (quick 260925-mpj): resolución por
// defecto, validación defensiva (T-mpj-01), orden por villano y línea de
// conjuntos a reunir. Catálogo real cargado igual que
// engine/__tests__/stepValues.test.ts; sesión construida igual que
// engine/__tests__/selection.test.ts.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { expand } from '../expand'
import {
  orderModulesForVillain,
  resolveEncounterSetNames,
  resolveModuleIds,
  setModules,
  toggleModule,
} from '../encounterSets'
import { setVillain } from '../selection'
import type { CharacterCatalogue, EngineSession, GameDefinition, SessionContext } from '../types'

const fixturePath = fileURLToPath(new URL('./fixtures/tiny-game.json', import.meta.url))
const tinyGame: GameDefinition = JSON.parse(readFileSync(fixturePath, 'utf-8'))

const catalogueContentPath = fileURLToPath(new URL('../../content/marvel-characters.json', import.meta.url))
const catalogue: CharacterCatalogue = JSON.parse(readFileSync(catalogueContentPath, 'utf-8'))

function baseSession(playerCount = 2): EngineSession {
  const context: SessionContext = { playerCount, difficulty: 'normal' }
  return expand(tinyGame, context)
}

describe('orderModulesForVillain', () => {
  it('klaw: masters-of-evil primero con recommended true, resto en orden de catálogo con recommended false', () => {
    const options = orderModulesForVillain(catalogue, 'klaw')
    expect(options[0]).toMatchObject({ id: 'masters-of-evil', recommended: true })
    expect(options.slice(1).every(o => o.recommended === false)).toBe(true)
    expect(options.map(o => o.id)).toEqual([
      'masters-of-evil',
      'bomb-scare',
      'under-attack',
      'legions-of-hydra',
      'the-doomsday-chair',
      'temporal',
      'mot',
      'anachronauts',
      'trickster-magic',
      'hydra-assault',
      'weap-master',
      'hydra-patrol',
      'arcade',
      'crazy-gang',
      'shadow-king',
      'armadillo',
    ])
  })

  it('villano null: orden de catálogo, ninguno recommended', () => {
    const options = orderModulesForVillain(catalogue, null)
    expect(options.map(o => o.id)).toEqual(catalogue.modules.map(m => m.id))
    expect(options.every(o => o.recommended === false)).toBe(true)
  })

  it('villano desconocido: orden de catálogo, ninguno recommended', () => {
    const options = orderModulesForVillain(catalogue, 'villano-inventado')
    expect(options.map(o => o.id)).toEqual(catalogue.modules.map(m => m.id))
    expect(options.every(o => o.recommended === false)).toBe(true)
  })

  it('catálogo null: []', () => {
    expect(orderModulesForVillain(null, 'klaw')).toEqual([])
  })

  it('difficulty solo presente cuando el catálogo la trae', () => {
    const options = orderModulesForVillain(catalogue, 'kang')
    const temporal = options.find(o => o.id === 'temporal')!
    const bombScare = options.find(o => o.id === 'bomb-scare')!
    expect(temporal.difficulty).toBe(4)
    expect('difficulty' in bombScare).toBe(false)
  })
})

describe('Brigada de Demolición: villano sin recommendedModuleId (quick 261001-o3p)', () => {
  it('orderModulesForVillain: orden de catálogo, ninguno recommended', () => {
    const options = orderModulesForVillain(catalogue, 'brigada-de-demolicion')
    expect(options.map(o => o.id)).toEqual(catalogue.modules.map(m => m.id))
    expect(options.every(o => o.recommended === false)).toBe(true)
  })

  it('resolveModuleIds sin moduleIds devuelve []', () => {
    const session = setVillain(baseSession(), 'brigada-de-demolicion')
    expect(resolveModuleIds(session.context, catalogue)).toEqual([])
  })

  it('resolveEncounterSetNames: Normal y Experto sin módulos (el rótulo Normal/Experto se acepta, U-03)', () => {
    const session = setVillain(baseSession(), 'brigada-de-demolicion')
    expect(resolveEncounterSetNames(session.context, catalogue)).toEqual(['Brigada de demolición', 'Normal'])
    const expert: SessionContext = { ...session.context, difficulty: 'expert' }
    expect(resolveEncounterSetNames(expert, catalogue)).toEqual(['Brigada de demolición', 'Normal', 'Experto'])
  })

  it('toggleModule legions-of-hydra desde ese estado da [legions-of-hydra]', () => {
    const session = setVillain(baseSession(), 'brigada-de-demolicion')
    const result = toggleModule(session, 'legions-of-hydra', catalogue)
    expect(resolveModuleIds(result.context, catalogue)).toEqual(['legions-of-hydra'])
  })
})

describe('resolveModuleIds (T-mpj-01)', () => {
  it('selección sin moduleIds + villano rhino: recomendado (bomb-scare)', () => {
    const session = setVillain(baseSession(), 'rhino')
    expect(resolveModuleIds(session.context, catalogue)).toEqual(['bomb-scare'])
  })

  it('sin villano: []', () => {
    const session = baseSession()
    expect(resolveModuleIds(session.context, catalogue)).toEqual([])
  })

  it('moduleIds [] explícito: []', () => {
    const session = setModules(setVillain(baseSession(), 'rhino'), [])
    expect(resolveModuleIds(session.context, catalogue)).toEqual([])
  })

  it('moduleIds con desconocidos, no-string y duplicados: solo válidos, sin duplicados, en orden de orderModulesForVillain', () => {
    const session = setVillain(baseSession(), 'rhino')
    const context: SessionContext = {
      ...session.context,
      selection: {
        ...session.context.selection!,
        moduleIds: ['legions-of-hydra', 'nope', 42, 'legions-of-hydra', 'bomb-scare'] as unknown as string[],
      },
    }
    expect(resolveModuleIds(context, catalogue)).toEqual(['bomb-scare', 'legions-of-hydra'])
  })

  it('moduleIds no-array (string suelto): valor por defecto (recomendado del villano)', () => {
    const session = setVillain(baseSession(), 'rhino')
    const context: SessionContext = {
      ...session.context,
      selection: { ...session.context.selection!, moduleIds: 'bomb-scare' as unknown as string[] },
    }
    expect(resolveModuleIds(context, catalogue)).toEqual(['bomb-scare'])
  })

  it('selection ausente: []', () => {
    const context: SessionContext = { playerCount: 2, difficulty: 'normal' }
    expect(resolveModuleIds(context, catalogue)).toEqual([])
  })

  it('selection null: []', () => {
    const context = { playerCount: 2, difficulty: 'normal', selection: null } as unknown as SessionContext
    expect(resolveModuleIds(context, catalogue)).toEqual([])
  })

  it('catálogo null: []', () => {
    const session = setVillain(baseSession(), 'rhino')
    expect(resolveModuleIds(session.context, null)).toEqual([])
  })
})

describe('setVillain: regla D-05 sobre moduleIds', () => {
  it('de rhino a klaw con moduleIds personalizados: moduleIds desaparece, resolveModuleIds da el recomendado del villano nuevo', () => {
    const withRhino = setModules(setVillain(baseSession(), 'rhino'), ['legions-of-hydra'])
    const result = setVillain(withRhino, 'klaw')

    expect(result.context.selection!.moduleIds).toBeUndefined()
    expect(resolveModuleIds(result.context, catalogue)).toEqual(['masters-of-evil'])
  })

  it('de rhino a rhino (mismo villano): moduleIds se conserva', () => {
    const withRhino = setModules(setVillain(baseSession(), 'rhino'), ['legions-of-hydra'])
    const result = setVillain(withRhino, 'rhino')

    expect(result.context.selection!.moduleIds).toEqual(['legions-of-hydra'])
  })

  it('no muta el argumento y session/context/selection son objetos nuevos', () => {
    const withRhino = setModules(setVillain(baseSession(), 'rhino'), ['legions-of-hydra'])
    const snapshot = JSON.stringify(withRhino)
    const result = setVillain(withRhino, 'klaw')

    expect(JSON.stringify(withRhino)).toBe(snapshot)
    expect(result).not.toBe(withRhino)
    expect(result.context).not.toBe(withRhino.context)
    expect(result.context.selection).not.toBe(withRhino.context.selection)
  })
})

describe('setModules', () => {
  it('guarda una copia nueva, filtra no-strings y duplicados, conserva villainId y heroes', () => {
    const session = setVillain(baseSession(), 'rhino')
    const result = setModules(session, ['legions-of-hydra', 'legions-of-hydra', 42 as unknown as string, 'bomb-scare'])

    expect(result.context.selection!.moduleIds).toEqual(['legions-of-hydra', 'bomb-scare'])
    expect(result.context.selection!.villainId).toBe('rhino')
    expect(result.context.selection!.heroes).toEqual(session.context.selection!.heroes)
    expect(result).not.toBe(session)
    expect(result.context).not.toBe(session.context)
    expect(result.context.selection).not.toBe(session.context.selection)
  })

  it('sin selection previa, parte de emptySelection', () => {
    const session = baseSession()
    const result = setModules(session, ['bomb-scare'])

    expect(result.context.selection!.villainId).toBeNull()
    expect(result.context.selection!.moduleIds).toEqual(['bomb-scare'])
    expect(result.context.selection!.heroes).toHaveLength(session.context.playerCount)
  })
})

describe('toggleModule', () => {
  it('sobre rhino por defecto, toggle legions-of-hydra añade al recomendado: [bomb-scare, legions-of-hydra]', () => {
    const session = setVillain(baseSession(), 'rhino')
    const result = toggleModule(session, 'legions-of-hydra', catalogue)
    expect(resolveModuleIds(result.context, catalogue)).toEqual(['bomb-scare', 'legions-of-hydra'])
  })

  it('toggle de bomb-scare otra vez lo quita: [legions-of-hydra]', () => {
    const session = toggleModule(setVillain(baseSession(), 'rhino'), 'legions-of-hydra', catalogue)
    const result = toggleModule(session, 'bomb-scare', catalogue)
    expect(resolveModuleIds(result.context, catalogue)).toEqual(['legions-of-hydra'])
  })

  it('toggle de un id desconocido: misma referencia de sesión', () => {
    const session = setVillain(baseSession(), 'rhino')
    const result = toggleModule(session, 'no-existe', catalogue)
    expect(result).toBe(session)
  })

  it('catálogo null: misma referencia de sesión', () => {
    const session = setVillain(baseSession(), 'rhino')
    expect(toggleModule(session, 'bomb-scare', null)).toBe(session)
  })
})

describe('resolveEncounterSetNames', () => {
  it('rhino en Experto sin personalizar: [Rino, Normal, Experto, Amenaza de bomba]', () => {
    const session = setVillain(baseSession(), 'rhino')
    const context: SessionContext = { ...session.context, difficulty: 'expert' }
    expect(resolveEncounterSetNames(context, catalogue)).toEqual(['Rino', 'Normal', 'Experto', 'Amenaza de bomba'])
  })

  it('kang en Normal: [Kang, Normal, Temporal]', () => {
    const session = setVillain(baseSession(), 'kang')
    expect(resolveEncounterSetNames(session.context, catalogue)).toEqual(['Kang', 'Normal', 'Temporal'])
  })

  it('sin villano ni módulos: []', () => {
    const session = baseSession()
    expect(resolveEncounterSetNames(session.context, catalogue)).toEqual([])
  })

  it('sin villano, con legions-of-hydra elegido a mano en Experto: [Normal, Experto, Legiones de Hydra]', () => {
    const session = setModules(baseSession(), ['legions-of-hydra'])
    const context: SessionContext = { ...session.context, difficulty: 'expert' }
    expect(resolveEncounterSetNames(context, catalogue)).toEqual(['Normal', 'Experto', 'Legiones de Hydra'])
  })

  it('catálogo null: []', () => {
    const session = setVillain(baseSession(), 'rhino')
    expect(resolveEncounterSetNames(session.context, null)).toEqual([])
  })
})

describe('Trickster Takeover (quick 261001-obf)', () => {
  it.each(['loki', 'enchantress'])('%s: trickster-magic primero y recomendado, sin difficulty', (id) => {
    const options = orderModulesForVillain(catalogue, id)
    expect(options[0]).toMatchObject({ id: 'trickster-magic', recommended: true })
    expect(options.slice(1).every(o => o.recommended === false)).toBe(true)
    expect('difficulty' in options[0]!).toBe(false)
  })

  it('setVillain enchantress sin moduleIds: resolveModuleIds da [trickster-magic]', () => {
    const session = setVillain(baseSession(), 'enchantress')
    expect(resolveModuleIds(session.context, catalogue)).toEqual(['trickster-magic'])
  })

  it('resolveEncounterSetNames de enchantress y loki', () => {
    const ench = setVillain(baseSession(), 'enchantress')
    expect(resolveEncounterSetNames(ench.context, catalogue)).toEqual(['Encantadora', 'Normal', 'Magia embaucadora'])
    const expert: SessionContext = { ...ench.context, difficulty: 'expert' }
    expect(resolveEncounterSetNames(expert, catalogue)).toEqual(['Encantadora', 'Normal', 'Experto', 'Magia embaucadora'])
    const loki = setVillain(baseSession(), 'loki')
    expect(resolveEncounterSetNames(loki.context, catalogue)).toEqual(['Dios de las mentiras', 'Normal', 'Magia embaucadora'])
  })
})

describe('varios recomendados y conjuntos fijos (quick 261002-2am)', () => {
  function synthetic(patch: Record<string, unknown>): CharacterCatalogue {
    const c = structuredClone(catalogue)
    const v = c.villains.find(x => x.id === 'klaw')!
    Object.assign(v, patch)
    return c
  }
  const klawSession = () => setVillain(baseSession(), 'klaw')

  it('orderModulesForVillain: todos los recomendados primero, en orden', () => {
    const c = synthetic({ additionalRecommendedModuleIds: ['legions-of-hydra', 'bomb-scare'] })
    const options = orderModulesForVillain(c, 'klaw')
    expect(options.slice(0, 3).map(o => o.id)).toEqual(['masters-of-evil', 'legions-of-hydra', 'bomb-scare'])
    expect(options.slice(0, 3).every(o => o.recommended)).toBe(true)
    expect(options.slice(3).every(o => !o.recommended)).toBe(true)
    expect(options.slice(3).map(o => o.id)).toEqual(
      c.modules.map(m => m.id).filter(id => !['masters-of-evil', 'legions-of-hydra', 'bomb-scare'].includes(id)),
    )
  })

  it('resolveModuleIds sin moduleIds devuelve todos los recomendados', () => {
    const c = synthetic({ additionalRecommendedModuleIds: ['legions-of-hydra', 'bomb-scare'] })
    expect(resolveModuleIds(klawSession().context, c)).toEqual(['masters-of-evil', 'legions-of-hydra', 'bomb-scare'])
  })

  it('resolveEncounterSetNames inserta el conjunto fijo tras el del villano', () => {
    const c = synthetic({ fixedEncounterSetNames: ['Conjunto fijo'] })
    const s = klawSession()
    const v = c.villains.find(x => x.id === 'klaw')!
    const moduleName = c.modules.find(m => m.id === 'masters-of-evil')!.name
    expect(resolveEncounterSetNames(s.context, c)).toEqual([v.encounterSetName, 'Conjunto fijo', 'Normal', moduleName])
    const expert = { ...s.context, difficulty: 'expert' as const }
    expect(resolveEncounterSetNames(expert, c)).toEqual([v.encounterSetName, 'Conjunto fijo', 'Normal', 'Experto', moduleName])
  })

  it('no repite un nombre ya presente como conjunto fijo', () => {
    const c = synthetic({ fixedEncounterSetNames: ['Amenaza de bomba'] })
    const s = toggleModule(klawSession(), 'bomb-scare', c)
    const names = resolveEncounterSetNames(s.context, c)
    expect(names.filter(n => n === 'Amenaza de bomba')).toHaveLength(1)
    expect(names.indexOf('Amenaza de bomba')).toBe(1)
  })
})

describe('The Rise of Red Skull (quick 261002-2am)', () => {
  const sess = (id: string, difficulty: 'normal' | 'expert' = 'normal') => {
    const s = setVillain(baseSession(), id)
    return difficulty === 'expert' ? { ...s, context: { ...s.context, difficulty } } : s
  }

  it('orderModulesForVillain: crossbones y red-skull ponen sus recomendados primero', () => {
    const cb = orderModulesForVillain(catalogue, 'crossbones')
    expect(cb.slice(0, 3).map(o => o.id)).toEqual(['hydra-assault', 'weap-master', 'legions-of-hydra'])
    expect(cb.slice(0, 3).every(o => o.recommended)).toBe(true)
    expect(cb.slice(3).every(o => !o.recommended)).toBe(true)
    const rs = orderModulesForVillain(catalogue, 'red-skull')
    expect(rs.slice(0, 2).map(o => o.id)).toEqual(['hydra-assault', 'hydra-patrol'])
    expect(rs.slice(0, 2).every(o => o.recommended)).toBe(true)
    expect(rs.slice(2).every(o => !o.recommended)).toBe(true)
  })

  it.each([
    ['crossbones', ['hydra-assault', 'weap-master', 'legions-of-hydra']],
    ['red-skull', ['hydra-assault', 'hydra-patrol']],
    ['taskmaster', ['weap-master']],
    ['zola', ['under-attack']],
    ['absorbing-man', ['hydra-patrol']],
  ])('resolveModuleIds por defecto de %s', (id, expected) => {
    expect(resolveModuleIds(sess(id).context, catalogue)).toEqual(expected)
  })

  it.each([
    ['crossbones', ['Calavera', 'Armas Experimentales', 'Normal', 'Asalto de Hydra', 'Maestro de armas', 'Legiones de Hydra']],
    ['taskmaster', ['Supervisor', 'Patrulla de Hydra', 'Normal', 'Maestro de armas']],
    ['red-skull', ['Cráneo Rojo', 'Normal', 'Asalto de Hydra', 'Patrulla de Hydra']],
    ['zola', ['Zola', 'Normal', 'Civiles en peligro']],
    ['absorbing-man', ['Hombre absorbente', 'Normal', 'Patrulla de Hydra']],
  ])('línea de conjuntos en Normal de %s', (id, expected) => {
    expect(resolveEncounterSetNames(sess(id).context, catalogue)).toEqual(expected)
  })

  it('crossbones en expert inserta Experto tras Normal', () => {
    const names = resolveEncounterSetNames(sess('crossbones', 'expert').context, catalogue)
    expect(names.indexOf('Experto')).toBe(names.indexOf('Normal') + 1)
  })

  it('taskmaster con Patrulla de Hydra marcada no la repite', () => {
    const s = toggleModule(sess('taskmaster'), 'hydra-patrol', catalogue)
    expect(resolveModuleIds(s.context, catalogue)).toContain('hydra-patrol')
    const names = resolveEncounterSetNames(s.context, catalogue)
    expect(names.filter(n => n === 'Patrulla de Hydra')).toHaveLength(1)
  })

  it('ningún módulo de packs de héroe es recomendado para ningún villano', () => {
    const heroModules = ['arcade', 'crazy-gang', 'shadow-king', 'armadillo']
    for (const v of catalogue.villains) {
      const ids = [v.recommendedModuleId, ...(v.additionalRecommendedModuleIds ?? [])]
      for (const m of heroModules) expect(ids, `villano ${v.id}`).not.toContain(m)
    }
  })

  it('el selector nunca ofrece Armas Experimentales ni los de campaña', () => {
    const names = orderModulesForVillain(catalogue, 'crossbones').map(o => o.name)
    for (const banned of ['Armas Experimentales', 'Campaña de Hydra', 'Campaña en Experto']) {
      expect(names).not.toContain(banned)
    }
  })
})
