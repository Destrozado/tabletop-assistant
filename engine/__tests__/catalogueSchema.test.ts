import { describe, expect, it } from 'vitest'
import { CharacterCatalogueSchema } from '../catalogueSchema'

// Catálogo sintético mínimo válido — NO los datos reales, que se validan en
// el plan 05-03. gameId 'marvel-champions', un héroe (Spider-Man) y un
// villano de tres etapas (Rhino), con valores verificados en 05-RESEARCH.md.
function baseCatalogue() {
  return {
    gameId: 'marvel-champions',
    heroes: [
      { id: 'spider-man', name: 'Spider-Man', alterEgo: 'Peter Parker', health: 10, handSizeHero: 5, handSizeAlterEgo: 6 },
    ],
    villains: [
      {
        id: 'rhino',
        name: 'Rhino',
        stages: [
          { stage: 1, health: 14, healthPerHero: true, healthPerGroup: false },
          { stage: 2, health: 15, healthPerHero: true, healthPerGroup: false },
          { stage: 3, health: 16, healthPerHero: true, healthPerGroup: false },
        ],
        encounterSetName: 'Rino',
        recommendedModuleId: 'bomb-scare',
      },
    ],
    baseSets: { standard: 'Normal', expert: 'Experto' },
    modules: [
      { id: 'bomb-scare', name: 'Amenaza de bomba' },
    ],
  }
}

describe('CharacterCatalogueSchema', () => {
  it('acepta un catálogo mínimo válido', () => {
    expect(() => CharacterCatalogueSchema.parse(baseCatalogue())).not.toThrow()
  })

  // CR-01 / CAT-04: una clave desconocida silenciosamente descartada sería
  // el agujero por el que entraría texto de carta o arte con copyright de
  // MarvelCDB. Usar nombres de clave reales de su API, no genéricos, para
  // que el test diga en voz alta contra qué protege.
  describe('claves desconocidas rechazadas (CR-01 / CAT-04)', () => {
    it('lanza ZodError con una clave "text" en la raíz del catálogo', () => {
      const catalogue = { ...baseCatalogue(), text: 'Texto de carta con copyright.' }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con una clave "flavor" en un héroe', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.heroes[0] as any).flavor = 'Texto de sabor con copyright.'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con una clave "imagesrc" en un villano', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0] as any).imagesrc = '/cards/01094a.png'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con una clave "illustrator" en una etapa de villano', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).illustrator = 'Some Artist'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    // CR-01: la clave legada handSize ya no existe en el contrato — un
    // héroe que la traiga (además de los dos campos nuevos) tiene que
    // rechazarse, para que un catálogo sin regenerar no pase CI en silencio.
    it('lanza ZodError con la clave handSize legada en un héroe', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.heroes[0] as any).handSize = 6
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })
  })

  describe('tipos y rangos', () => {
    it('lanza ZodError con health 0 en un héroe', () => {
      const catalogue = baseCatalogue()
      catalogue.heroes[0].health = 0
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con health no entero (10.5) en un héroe', () => {
      const catalogue = baseCatalogue()
      catalogue.heroes[0].health = 10.5
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con handSizeHero negativo', () => {
      const catalogue = baseCatalogue()
      catalogue.heroes[0].handSizeHero = -1
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con handSizeAlterEgo negativo', () => {
      const catalogue = baseCatalogue()
      catalogue.heroes[0].handSizeAlterEgo = -1
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con healthPerHero como string en vez de booleano', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).healthPerHero = 'true'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con un héroe sin alterEgo', () => {
      const catalogue = baseCatalogue()
      delete (catalogue.heroes[0] as any).alterEgo
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })
  })

  describe('DC-02: id derivado del nombre', () => {
    it('lanza ZodError si el id de un héroe no es el slug de su name', () => {
      const catalogue = baseCatalogue()
      catalogue.heroes[0].id = 'spiderman'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('no lanza con name "Ms. Marvel" e id "ms-marvel"', () => {
      const catalogue = baseCatalogue()
      catalogue.heroes[0] = { id: 'ms-marvel', name: 'Ms. Marvel', alterEgo: 'Kamala Khan', health: 10, handSizeHero: 5, handSizeAlterEgo: 6 }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
    })
  })

  describe('DC-01: etapas de villano', () => {
    it('lanza ZodError si las etapas tienen un hueco (1, 3)', () => {
      const catalogue = baseCatalogue()
      catalogue.villains[0].stages = [
        { stage: 1, health: 14, healthPerHero: true, healthPerGroup: false },
        { stage: 3, health: 16, healthPerHero: true, healthPerGroup: false },
      ]
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError si las etapas están desordenadas (2, 1, 3)', () => {
      const catalogue = baseCatalogue()
      catalogue.villains[0].stages = [
        { stage: 2, health: 15, healthPerHero: true, healthPerGroup: false },
        { stage: 1, health: 14, healthPerHero: true, healthPerGroup: false },
        { stage: 3, health: 16, healthPerHero: true, healthPerGroup: false },
      ]
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError si hay una etapa duplicada (1, 1, 2)', () => {
      const catalogue = baseCatalogue()
      catalogue.villains[0].stages = [
        { stage: 1, health: 14, healthPerHero: true, healthPerGroup: false },
        { stage: 1, health: 14, healthPerHero: true, healthPerGroup: false },
        { stage: 2, health: 15, healthPerHero: true, healthPerGroup: false },
      ]
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    // CAT-07: comprar una caja es añadir filas al script, no editar el
    // esquema. Estos dos tests positivos son la prueba viva de que DC-01 no
    // fijó la longitud a 3.
    it('no lanza con un villano de 2 etapas (1, 2)', () => {
      const catalogue = baseCatalogue()
      catalogue.villains[0].stages = [
        { stage: 1, health: 14, healthPerHero: true, healthPerGroup: false },
        { stage: 2, health: 15, healthPerHero: true, healthPerGroup: false },
      ]
      expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
    })

    it('no lanza con un villano de 4 etapas (1, 2, 3, 4)', () => {
      const catalogue = baseCatalogue()
      catalogue.villains[0].stages = [
        { stage: 1, health: 14, healthPerHero: true, healthPerGroup: false },
        { stage: 2, health: 15, healthPerHero: true, healthPerGroup: false },
        { stage: 3, health: 16, healthPerHero: true, healthPerGroup: false },
        { stage: 4, health: 17, healthPerHero: true, healthPerGroup: false },
      ]
      expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
    })
  })

  // Gap de truth #8 (05-VERIFICATION.md): dimensión de dificultad en la
  // etapa de villano, sub-objeto `expert` opcional. baseCatalogue() ya
  // prueba la ausencia (Rhino sin `expert` en ninguna etapa); este describe
  // cubre presencia, mixto por etapa y rechazo.
  describe('expert: dimensión de dificultad en la etapa de villano', () => {
    it('no lanza con una etapa que lleva un expert válido', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 15, healthPerHero: true, healthPerGroup: false }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
    })

    it('no lanza con un villano mixto: etapa 1 con expert, etapa 2 sin él', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 15, healthPerHero: true, healthPerGroup: false }
      // stages[1] se queda sin expert a propósito: la opcionalidad es por
      // etapa, no por villano.
      expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
    })

    it('lanza ZodError con una clave "flavor" dentro de expert', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 15, healthPerHero: true, healthPerGroup: false, flavor: 'Texto de sabor con copyright.' }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con una clave "illustrator" dentro de expert', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 15, healthPerHero: true, healthPerGroup: false, illustrator: 'Some Artist' }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError si a expert le falta healthPerGroup', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 15, healthPerHero: true }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con expert.health a 0', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 0, healthPerHero: true, healthPerGroup: false }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con expert.health no entero', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 15.5, healthPerHero: true, healthPerGroup: false }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con expert.healthPerHero como string en vez de booleano', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = { health: 15, healthPerHero: 'true', healthPerGroup: false }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con un expert anidado dentro de expert', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0].stages[0] as any).expert = {
        health: 15,
        healthPerHero: true,
        healthPerGroup: false,
        expert: { health: 15, healthPerHero: true, healthPerGroup: false },
      }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })
  })

  // expertStartStage: etapa (1..n) con la que arranca la partida en modo
  // Experto según la cara 1A del plan principal (RR v1.7 p.28, "listed
  // expert mode villain stages"). Campo del VILLANO, no de la etapa —
  // distinto de `expert` (cifras propias de un set Experto por etapa,
  // caso Kang). Opcional: su ausencia significa "arranca en la etapa 1",
  // igual que el comportamiento previo a este campo.
  describe('expertStartStage', () => {
    it('acepta un villano con expertStartStage: 2 y 3 etapas', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0] as any).expertStartStage = 2
      expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
    })

    it('acepta un villano SIN expertStartStage (baseCatalogue actual sigue válido)', () => {
      expect(() => CharacterCatalogueSchema.parse(baseCatalogue())).not.toThrow()
    })

    it('lanza ZodError con expertStartStage: 0', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0] as any).expertStartStage = 0
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con expertStartStage: 1.5', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0] as any).expertStartStage = 1.5
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con expertStartStage: "2" (string, no número)', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0] as any).expertStartStage = '2'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con expertStartStage: 4 en un villano de 3 etapas (fuera de rango)', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.villains[0] as any).expertStartStage = 4
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })
  })

  // Quick 260925-mpj (D-01/D-03/D-04/D-07): módulos de encuentro, sets base
  // informativos y el módulo recomendado por villano.
  describe('baseSets/modules/encounterSetName/recommendedModuleId (quick 260925-mpj)', () => {
    it('acepta un catálogo con baseSets, modules y los dos campos nuevos del villano', () => {
      expect(() => CharacterCatalogueSchema.parse(baseCatalogue())).not.toThrow()
    })

    it('acepta un módulo con difficulty entera positiva', () => {
      const catalogue = baseCatalogue()
      catalogue.modules[0] = { ...catalogue.modules[0], difficulty: 4 }
      expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
    })

    it.each([0, -1, 1.5])('lanza ZodError con un módulo con difficulty %s', (difficulty) => {
      const catalogue = baseCatalogue()
      catalogue.modules[0] = { ...catalogue.modules[0], difficulty } as any
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con una clave desconocida ("text") dentro de un módulo', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.modules[0] as any).text = 'Texto de carta con copyright.'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con ids de módulo duplicados', () => {
      const catalogue = baseCatalogue()
      catalogue.modules.push({ ...catalogue.modules[0] })
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError si el recommendedModuleId de un villano no está en modules', () => {
      const catalogue = baseCatalogue()
      catalogue.villains[0].recommendedModuleId = 'no-existe'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con un villano sin encounterSetName', () => {
      const catalogue = baseCatalogue()
      delete (catalogue.villains[0] as any).encounterSetName
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con un villano sin recommendedModuleId', () => {
      const catalogue = baseCatalogue()
      delete (catalogue.villains[0] as any).recommendedModuleId
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError con una clave desconocida ("text") en baseSets', () => {
      const catalogue = baseCatalogue()
      ;(catalogue.baseSets as any).text = 'Texto de carta con copyright.'
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })
  })

  describe('unicidad de ids', () => {
    it('lanza ZodError si dos héroes comparten id', () => {
      const catalogue = baseCatalogue()
      catalogue.heroes.push({ id: 'spider-man', name: 'Spider-Man', alterEgo: 'Peter Parker', health: 10, handSizeHero: 5, handSizeAlterEgo: 6 })
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })

    it('lanza ZodError si dos villanos comparten id', () => {
      const catalogue = baseCatalogue()
      catalogue.villains.push({ ...catalogue.villains[0] })
      expect(() => CharacterCatalogueSchema.parse(catalogue)).toThrow()
    })
  })

  // D-05: el esquema no impone el recuento de 23 héroes + 3 villanos.
  it('D-05: un catálogo con un solo héroe y un solo villano valida sin problema', () => {
    const catalogue = baseCatalogue()
    expect(catalogue.heroes).toHaveLength(1)
    expect(catalogue.villains).toHaveLength(1)
    expect(() => CharacterCatalogueSchema.parse(catalogue)).not.toThrow()
  })
})
