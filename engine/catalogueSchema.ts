// engine/catalogueSchema.ts
// engine/schema.ts y engine/catalogueSchema.ts son los dos únicos ficheros
// del repo (fuera de node_modules) que importan `zod`. `zod` es
// devDependency y no debe cruzar nunca a `app/` — este esquema corre solo en
// Node/CI (Vitest), nunca en el navegador (T-01-19).
//
// Valida `content/marvel-characters.json`, cuyo único escritor es
// `scripts/catalogue/fetch-marvelcdb.mjs` (D-09) — nadie edita ese fichero a
// mano.
//
// CR-01: TODOS los objetos de este esquema son `z.strictObject`, nunca
// `z.object`. Una clave desconocida silenciosamente descartada por el modo
// *strip* por defecto de Zod sería exactamente el agujero por el que
// entraría texto de carta o referencia a arte de MarvelCDB con copyright
// (CAT-04) sin que CI lo detectara nunca.
import { z } from 'zod'
import type { CharacterCatalogue } from './types'

// Kebab-case sin segmentos con punto — a diferencia del `idPattern` de
// engine/schema.ts, aquí no hay ids jerárquicos tipo `setup.mesa-lista`; los
// ids de personaje son un único segmento derivado de su nombre (DC-02).
const characterIdPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

// DC-02: esta función está duplicada a propósito en
// scripts/catalogue/fetch-marvelcdb.mjs; si las dos derivan, este esquema
// hace fallar CI, que es el comportamiento buscado. Ejemplo: "Ms. Marvel"
// produce "ms-marvel".
function slugifyCharacterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Base + banderas tal cual la API, sin precomputar por jugadores (D-11).
// `healthPerHero` varía entre etapas del mismo villano (Kang I true, II
// false, III true), por eso vive en la etapa y no en el villano.
//
// `expert` (gap de truth #8, 05-VERIFICATION.md): sub-objeto opcional con la
// misma tripleta base+banderas, para el set de villano de modo Experto
// cuando el escenario trae uno real (Kang, `card_set_code: exp_kang`). Al
// ser también `z.strictObject` en este quinto nivel de anidamiento, una
// clave `text`/`flavor`/`imagesrc` colada dentro de `expert` lanza en vez de
// descartarse en silencio (CAT-04), y un `expert` incompleto también lanza.
const ExpertVillainStageSchema = z.strictObject({
  health: z.number().int().positive(),
  healthPerHero: z.boolean(),
  healthPerGroup: z.boolean(),
})

const VillainStageSchema = z.strictObject({
  stage: z.number().int().positive(),
  health: z.number().int().positive(),
  healthPerHero: z.boolean(),
  healthPerGroup: z.boolean(),
  expert: ExpertVillainStageSchema.optional(),
})

const HeroSchema = z.strictObject({
  id: z.string().regex(characterIdPattern),
  name: z.string().min(1),
  alterEgo: z.string().min(1),
  health: z.number().int().positive(),
  // Al ser z.strictObject, un catálogo con la clave legada `handSize` falla
  // con "Unrecognized key" — un fichero sin regenerar no puede colarse.
  handSizeHero: z.number().int().positive(),
  handSizeAlterEgo: z.number().int().positive(),
})

const VillainSchema = z.strictObject({
  id: z.string().regex(characterIdPattern),
  name: z.string().min(1),
  stages: z.array(VillainStageSchema).min(1),
  // expertStartStage: etapa (1..n) con la que arranca la partida en modo
  // Experto, según la cara 1A del plan principal (RR v1.7 p.28, "listed
  // expert mode villain stages"). Campo del VILLANO, no de la etapa —
  // distinto de `expert` (cifras propias de un set de villano Experto por
  // etapa, caso Kang). Su ausencia significa "arranca en la etapa 1"
  // (comportamiento previo a este campo). El rango <= stages.length se
  // valida en el superRefine de más abajo, no aquí (necesita ver las dos
  // claves del villano a la vez).
  expertStartStage: z.number().int().positive().optional(),
})

export const CharacterCatalogueSchema = z.strictObject({
  gameId: z.string().regex(characterIdPattern),
  heroes: z.array(HeroSchema),
  villains: z.array(VillainSchema),
}).superRefine((catalogue, ctx) => {
  const heroIds = catalogue.heroes.map(h => h.id)
  const dupeHeroIds = heroIds.filter((id, i) => heroIds.indexOf(id) !== i)
  if (dupeHeroIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate hero ids: ${[...new Set(dupeHeroIds)].join(', ')}`,
    })
  }

  const villainIds = catalogue.villains.map(v => v.id)
  const dupeVillainIds = villainIds.filter((id, i) => villainIds.indexOf(id) !== i)
  if (dupeVillainIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Duplicate villain ids: ${[...new Set(dupeVillainIds)].join(', ')}`,
    })
  }

  // DC-02: el id es 100% derivado del nombre. Sin esta invariante, un id
  // editado a mano pasaría CI y solo se detectaría al re-ejecutar el script.
  for (const hero of catalogue.heroes) {
    const expected = slugifyCharacterName(hero.name)
    if (hero.id !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Hero "${hero.name}" has id "${hero.id}", expected slug "${expected}"`,
      })
    }
  }
  for (const villain of catalogue.villains) {
    const expected = slugifyCharacterName(villain.name)
    if (villain.id !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Villain "${villain.name}" has id "${villain.id}", expected slug "${expected}"`,
      })
    }
  }

  // DC-01: las etapas de cada villano deben ser consecutivas empezando en 1
  // y en orden (stages[i].stage === i + 1). NO se usa `.length(3)` porque
  // CAT-07 exige que un villano futuro con otro número de etapas sea una
  // fila más en el script, no una edición de este esquema.
  for (const villain of catalogue.villains) {
    const consecutive = villain.stages.every((s, i) => s.stage === i + 1)
    if (!consecutive) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Villain "${villain.name}" has non-consecutive stages: ${villain.stages.map(s => s.stage).join(', ')}`,
      })
    }
  }

  // expertStartStage no puede señalar una etapa que el villano no tiene.
  for (const villain of catalogue.villains) {
    if (villain.expertStartStage !== undefined && villain.expertStartStage > villain.stages.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Villain "${villain.name}" has expertStartStage ${villain.expertStartStage} but only ${villain.stages.length} stage(s)`,
      })
    }
  }
})

export function validateCharacterCatalogue(json: unknown): CharacterCatalogue {
  return CharacterCatalogueSchema.parse(json) as unknown as CharacterCatalogue
}
