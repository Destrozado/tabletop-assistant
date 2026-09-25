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
