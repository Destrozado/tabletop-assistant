// Tests puros de las funciones de useHeroSearch.ts. NO se monta ningún
// componente, no se importa la librería de montaje de componentes de Vue y
// no se toca el DOM: el proyecto `app-logic` corre en entorno node
// (06-RESEARCH.md Q7).
import { describe, expect, it } from 'vitest'
import marvelCharacters from '~~/content/marvel-characters.json'
import { spanishHeroAliases } from '~/data/spanish-hero-aliases'
import {
  buildDuplicateWarningText,
  buildHeroOptions,
  buildTakenByMap,
  buildVillainOptions,
  filterHeroOptions,
  findHeroOption,
  findVillainOption,
  joinNames,
  matchesHeroQuery,
  normalizeForSearch,
  resolveHeroSpanishName,
  resolvePlayerLabel,
} from '../useHeroSearch'
import type { HeroOption, SelectionSlot } from '../useHeroSearch'

// Helper local: construye una HeroOption con todo por defecto y sobrescribe
// solo el campo relevante, para que cada test se lea de un vistazo.
function heroOption(overrides: Partial<HeroOption> = {}): HeroOption {
  return {
    id: 'test-hero',
    spanishName: 'Nombre Español',
    catalogueName: 'English Name',
    alterEgo: 'Alter Ego',
    ...overrides,
  }
}

function slot(overrides: Partial<SelectionSlot> = {}): SelectionSlot {
  return {
    heroId: null,
    playerName: '',
    ...overrides,
  }
}

describe('normalizeForSearch', () => {
  it('minúsculas y sin acentos', () => {
    expect(normalizeForSearch('Bruja Escarlata')).toBe('bruja escarlata')
  })

  it('pliega tildes', () => {
    expect(normalizeForSearch('Capitán América')).toBe('capitan america')
  })

  it('caso ñ (DC-05, deliberado): "ARAÑA" -> "arana"', () => {
    // La tilde de la ñ se pliega igual que cualquier otra marca diacrítica
    // combinante — teclear "arana" debe encontrar "Hombre Araña".
    expect(normalizeForSearch('ARAÑA')).toBe('arana')
  })

  it('entrada vacía -> cadena vacía', () => {
    expect(normalizeForSearch('')).toBe('')
  })

  it('undefined no lanza', () => {
    expect(() => normalizeForSearch(undefined as unknown as string)).not.toThrow()
    expect(normalizeForSearch(undefined as unknown as string)).toBe('')
  })
})

describe('resolveHeroSpanishName', () => {
  it('id presente en el mapa devuelve su alias', () => {
    expect(resolveHeroSpanishName('thor', 'Thor')).toBe('Thor')
    expect(resolveHeroSpanishName('scarlet-witch', 'Scarlet Witch')).toBe('Bruja Escarlata')
  })

  it('id ausente devuelve el catalogueName recibido (D-05, nunca falla)', () => {
    expect(resolveHeroSpanishName('no-existe', 'Some Catalogue Name')).toBe('Some Catalogue Name')
  })

  it('un alias de cadena vacía también cae al nombre inglés', () => {
    expect(resolveHeroSpanishName('', 'Fallback Name')).toBe('Fallback Name')
  })
})

describe('el mapa de alias contra el catálogo real', () => {
  const heroIds = marvelCharacters.heroes.map(h => h.id)

  it('toda clave del mapa corresponde a un id de héroe del catálogo (ningún alias huérfano)', () => {
    for (const aliasId of Object.keys(spanishHeroAliases)) {
      expect(heroIds).toContain(aliasId)
    }
  })

  it('ningún valor del mapa es cadena vacía', () => {
    for (const [id, value] of Object.entries(spanishHeroAliases)) {
      expect(value.trim(), `alias de "${id}" está vacío`).not.toBe('')
    }
  })

  // Recordatorio, no bloqueo de comportamiento (D-05): si algún día un héroe
  // nuevo entra sin alias, la app sigue funcionando (resolveHeroSpanishName
  // cae al nombre inglés del catálogo) — este test solo documenta el estado
  // actual de los 23 héroes conocidos.
  it('los 23 héroes conocidos tienen entrada en el mapa', () => {
    expect(heroIds.length).toBe(23)
    for (const id of heroIds) {
      expect(Object.prototype.hasOwnProperty.call(spanishHeroAliases, id), `falta alias para "${id}"`).toBe(true)
    }
  })
})

describe('buildHeroOptions', () => {
  const heroOptions = buildHeroOptions(marvelCharacters.heroes)

  it('devuelve 23 opciones', () => {
    expect(heroOptions.length).toBe(23)
  })

  it('ordena por spanishName según localeCompare(\'es\')', () => {
    const sortedCopy = [...heroOptions].sort((a, b) => a.spanishName.localeCompare(b.spanishName, 'es'))
    expect(heroOptions.map(h => h.id)).toEqual(sortedCopy.map(h => h.id))
  })

  it('no muta el array de entrada', () => {
    const before = JSON.stringify(marvelCharacters.heroes)
    buildHeroOptions(marvelCharacters.heroes)
    const after = JSON.stringify(marvelCharacters.heroes)
    expect(after).toBe(before)
  })

  it('array vacío devuelve []', () => {
    expect(buildHeroOptions([])).toEqual([])
  })

  it('undefined devuelve [] (tolerante)', () => {
    expect(buildHeroOptions(undefined)).toEqual([])
  })
})

describe('buildVillainOptions', () => {
  const villainOptions = buildVillainOptions(marvelCharacters.villains)

  // Quick 260925-mpj: Klaw entra al catálogo (D-02), así que el recuento ya
  // no es fijo — se deriva del propio fichero real (CAT-07), nunca tecleado
  // a mano, para que comprar una caja nueva no obligue a tocar este test.
  it('devuelve tantas opciones como villanos en el catálogo, ordenadas por name', () => {
    expect(villainOptions.length).toBe(marvelCharacters.villains.length)
    const sortedCopy = [...villainOptions].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    expect(villainOptions.map(v => v.id)).toEqual(sortedCopy.map(v => v.id))
  })

  it('no muta el array de entrada', () => {
    const before = JSON.stringify(marvelCharacters.villains)
    buildVillainOptions(marvelCharacters.villains)
    const after = JSON.stringify(marvelCharacters.villains)
    expect(after).toBe(before)
  })

  it('array vacío devuelve []', () => {
    expect(buildVillainOptions([])).toEqual([])
  })
})

describe('matchesHeroQuery / filterHeroOptions (SEL-05/D-08)', () => {
  const scarletWitch = heroOption({
    id: 'scarlet-witch',
    spanishName: 'Bruja Escarlata',
    catalogueName: 'Scarlet Witch',
    alterEgo: 'Wanda Maximoff',
  })
  const allOptions = [scarletWitch, heroOption({ id: 'other', spanishName: 'Otro', catalogueName: 'Other', alterEgo: 'Someone' })]

  it('consulta vacía devuelve true (y filterHeroOptions devuelve todo)', () => {
    expect(matchesHeroQuery('', scarletWitch)).toBe(true)
    expect(filterHeroOptions(allOptions, '')).toEqual(allOptions)
  })

  it('consulta solo espacios devuelve true (y filterHeroOptions devuelve todo)', () => {
    expect(matchesHeroQuery('   ', scarletWitch)).toBe(true)
    expect(filterHeroOptions(allOptions, '   ')).toEqual(allOptions)
  })

  it('"bruja" encuentra por nombre español', () => {
    expect(matchesHeroQuery('bruja', scarletWitch)).toBe(true)
  })

  it('"scarlet" encuentra por nombre inglés', () => {
    expect(matchesHeroQuery('scarlet', scarletWitch)).toBe(true)
  })

  it('"wanda" encuentra por alter ego', () => {
    expect(matchesHeroQuery('wanda', scarletWitch)).toBe(true)
  })

  it('"BRUJA" (mayúsculas) encuentra igual', () => {
    expect(matchesHeroQuery('BRUJA', scarletWitch)).toBe(true)
  })

  it('"brúja" (con acento distinto) encuentra igual', () => {
    expect(matchesHeroQuery('brúja', scarletWitch)).toBe(true)
  })

  it('"escarlata" encuentra por subcadena, no solo por prefijo', () => {
    expect(matchesHeroQuery('escarlata', scarletWitch)).toBe(true)
  })

  it('"zzz" no encuentra nada', () => {
    expect(matchesHeroQuery('zzz', scarletWitch)).toBe(false)
    expect(filterHeroOptions(allOptions, 'zzz')).toEqual([])
  })

  it('filterHeroOptions preserva el orden de entrada', () => {
    const orderedOptions = [
      heroOption({ id: 'second', spanishName: 'Zebra', catalogueName: 'Zebra', alterEgo: 'Zed' }),
      heroOption({ id: 'first', spanishName: 'Alfa', catalogueName: 'Alfa', alterEgo: 'Aitor' }),
    ]
    // Ambas opciones contienen "a": el resultado debe conservar el orden de
    // entrada (segundo antes que primero), no reordenar alfabéticamente.
    expect(filterHeroOptions(orderedOptions, 'a').map(o => o.id)).toEqual(['second', 'first'])
  })
})

describe('resolvePlayerLabel (SEL-06/D-15)', () => {
  it('(\'\', 0) -> "Jugador 1"', () => {
    expect(resolvePlayerLabel(0, '')).toBe('Jugador 1')
  })

  it('(\'   \', 3) -> "Jugador 4"', () => {
    expect(resolvePlayerLabel(3, '   ')).toBe('Jugador 4')
  })

  it('(\'Ana\', 0) -> "Ana"', () => {
    expect(resolvePlayerLabel(0, 'Ana')).toBe('Ana')
  })
})

describe('joinNames', () => {
  it('[] -> \'\'', () => {
    expect(joinNames([])).toBe('')
  })

  it('[\'Ana\'] -> \'Ana\'', () => {
    expect(joinNames(['Ana'])).toBe('Ana')
  })

  it('[\'Ana\',\'Bruno\'] -> \'Ana y Bruno\'', () => {
    expect(joinNames(['Ana', 'Bruno'])).toBe('Ana y Bruno')
  })

  it('[\'Ana\',\'Bruno\',\'Carla\'] -> \'Ana, Bruno y Carla\'', () => {
    expect(joinNames(['Ana', 'Bruno', 'Carla'])).toBe('Ana, Bruno y Carla')
  })
})

describe('buildTakenByMap', () => {
  it('con 3 huecos donde 0 y 2 llevan thor, el mapa para el hueco 0 excluye el propio', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: null, playerName: '' }),
      slot({ heroId: 'thor', playerName: 'Carla' }),
    ]
    const forSlot0 = buildTakenByMap(slots, 0)
    expect(forSlot0.thor).toBe('Carla')
  })

  it('al pedirlo para el hueco 1 (sin héroe), el valor es la cadena unida de los dos que lo llevan', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: null, playerName: '' }),
      slot({ heroId: 'thor', playerName: 'Carla' }),
    ]
    const forSlot1 = buildTakenByMap(slots, 1)
    expect(forSlot1.thor).toBe('Ana y Carla')
  })

  it('un hueco con heroId null no genera entrada', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: null, playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
    ]
    const forSlot1 = buildTakenByMap(slots, 1)
    expect(Object.keys(forSlot1)).not.toContain('null')
    expect(Object.keys(forSlot1).length).toBe(0)
  })

  it('los rótulos respetan el nombre puesto y caen a "Jugador N" si está vacío', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: '' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
    ]
    const forSlot1 = buildTakenByMap(slots, 1)
    expect(forSlot1.thor).toBe('Jugador 1')
  })
})

describe('buildDuplicateWarningText (SEL-07)', () => {
  it('sin repetidos -> null', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: 'hulk', playerName: 'Bruno' }),
    ]
    expect(buildDuplicateWarningText(slots)).toBeNull()
  })

  it('con nulls repetidos (dos huecos sin héroe) -> null', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: null, playerName: 'Ana' }),
      slot({ heroId: null, playerName: 'Bruno' }),
    ]
    expect(buildDuplicateWarningText(slots)).toBeNull()
  })

  it('una pareja -> "Ana y Bruno llevan el mismo héroe"', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
    ]
    expect(buildDuplicateWarningText(slots)).toBe('Ana y Bruno llevan el mismo héroe')
  })

  it('un trío -> "Ana, Bruno y Carla llevan el mismo héroe"', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
      slot({ heroId: 'thor', playerName: 'Carla' }),
    ]
    expect(buildDuplicateWarningText(slots)).toBe('Ana, Bruno y Carla llevan el mismo héroe')
  })

  it('cuatro huecos con el mismo héroe usan la variante "los 4 jugadores"', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
      slot({ heroId: 'thor', playerName: 'Carla' }),
      slot({ heroId: 'thor', playerName: 'Dani' }),
    ]
    expect(buildDuplicateWarningText(slots)).toBe('Los 4 jugadores llevan el mismo héroe')
  })

  it('dos parejas distintas en 4 huecos usan el prefijo "Héroes repetidos" con los dos grupos unidos por un punto medio', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
      slot({ heroId: 'hulk', playerName: 'Carla' }),
      slot({ heroId: 'hulk', playerName: 'Dani' }),
    ]
    expect(buildDuplicateWarningText(slots)).toBe('Héroes repetidos: Ana y Bruno · Carla y Dani')
  })

  it('ninguna de las cadenas devueltas lleva el glifo de aviso (lo pone el componente)', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
    ]
    // U+26A0 (glifo de aviso) referenciado por su código de escape a
    // propósito: este fichero no debe contener el carácter literal, ni
    // siquiera dentro de una aserción de "no lo contiene".
    expect(buildDuplicateWarningText(slots)).not.toContain('\u26A0')
  })
})

// BF-04/BF-05/BF-06 (09-17, barrido de fronteras — párrafo final de CR-02 en
// 09-REVIEW.md): las ocho claves heredadas de Object.prototype — declarada
// aquí y en engine/__tests__/history.test.ts y
// app/composables/__tests__/useGameHistory.test.ts (deliberadamente
// duplicada: cada fichero de test es autocontenido).
const PROTOTYPE_KEYS = [
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  '__proto__',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
] as const

describe('BF-04 (09-17): resolveHeroSpanishName no lanza con una clave de Object.prototype', () => {
  it.each(PROTOTYPE_KEYS)('resolveHeroSpanishName("%s", "Fallback") no lanza y devuelve "Fallback"', (heroId) => {
    expect(() => resolveHeroSpanishName(heroId, 'Fallback')).not.toThrow()
    expect(resolveHeroSpanishName(heroId, 'Fallback')).toBe('Fallback')
  })

  it('camino feliz intacto: un id real del catálogo sigue devolviendo su alias', () => {
    expect(resolveHeroSpanishName('thor', 'Thor')).toBe('Thor')
  })
})

describe('BF-05/BF-06 (09-17): los mapas indexados por heroId no resuelven por Object.prototype', () => {
  it.each(PROTOTYPE_KEYS)('buildTakenByMap con un hueco de heroId "%s" no lanza, y el mapa devuelto no tiene prototipo', (heroId) => {
    const slots: SelectionSlot[] = [
      slot({ heroId, playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Luis' }),
    ]
    let result: Record<string, string> = {}
    expect(() => {
      result = buildTakenByMap(slots, 1)
    }).not.toThrow()
    expect(Object.getPrototypeOf(result)).toBeNull()
    // La clave se registra como propiedad PROPIA del mapa (Object.create(null)
    // permite añadirla sin colisión con la cadena de prototipos), no como una
    // entrada heredada — así se distingue de un mapa que "ya tenía" esa clave
    // por herencia.
    expect(Object.hasOwn(result, heroId)).toBe(true)
    expect(result[heroId]).toBe('Ana')
  })

  it.each(PROTOTYPE_KEYS)('buildDuplicateWarningText con dos huecos de heroId "%s" no lanza', (heroId) => {
    const slots: SelectionSlot[] = [
      slot({ heroId, playerName: 'Ana' }),
      slot({ heroId, playerName: 'Luis' }),
    ]
    expect(() => buildDuplicateWarningText(slots)).not.toThrow()
  })

  it('camino feliz intacto: buildTakenByMap sigue devolviendo la etiqueta correcta con héroes reales', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: null, playerName: '' }),
      slot({ heroId: 'thor', playerName: 'Carla' }),
    ]
    expect(buildTakenByMap(slots, 0).thor).toBe('Carla')
  })

  it('camino feliz intacto: buildDuplicateWarningText sigue avisando con héroes reales repetidos', () => {
    const slots: SelectionSlot[] = [
      slot({ heroId: 'thor', playerName: 'Ana' }),
      slot({ heroId: 'thor', playerName: 'Bruno' }),
    ]
    expect(buildDuplicateWarningText(slots)).toBe('Ana y Bruno llevan el mismo héroe')
  })
})

describe('findHeroOption / findVillainOption', () => {
  const heroOptions = [heroOption({ id: 'thor', spanishName: 'Thor' }), heroOption({ id: 'hulk', spanishName: 'Hulk' })]
  const villainOptions = [{ id: 'kang', name: 'Kang' }, { id: 'rhino', name: 'Rhino' }]

  it('encuentra por id', () => {
    expect(findHeroOption(heroOptions, 'thor')?.id).toBe('thor')
    expect(findVillainOption(villainOptions, 'kang')?.id).toBe('kang')
  })

  // Un id inexistente se comporta como «sin elegir», que es la defensa ante
  // un localStorage manipulado o un catálogo que cambió entre despliegues.
  it('devuelve null con null', () => {
    expect(findHeroOption(heroOptions, null)).toBeNull()
    expect(findVillainOption(villainOptions, null)).toBeNull()
  })

  it('devuelve null con \'\'', () => {
    expect(findHeroOption(heroOptions, '')).toBeNull()
    expect(findVillainOption(villainOptions, '')).toBeNull()
  })

  it('devuelve null con un id inexistente', () => {
    expect(findHeroOption(heroOptions, 'no-existe')).toBeNull()
    expect(findVillainOption(villainOptions, 'no-existe')).toBeNull()
  })
})
