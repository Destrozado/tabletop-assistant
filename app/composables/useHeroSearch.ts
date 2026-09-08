// app/composables/useHeroSearch.ts
//
// Toda la lógica PURA de la Fase 6 (selección de villano, héroes y
// jugadores) vive aquí, no dentro de los `.vue`: `vitest.config.ts` no
// declara ningún entorno DOM/jsdom y `@vue/test-utils` no está instalado
// (06-RESEARCH.md Q7) — los componentes `VillainPickerModal.vue` y
// `PlayerModal.vue` no son testeables como componentes hoy, así que quedan
// TONTOS y todo lo que decide algo (filtrar, ordenar, rotular, avisar) vive
// en este módulo, cubierto por tests en el proyecto `app-logic` (entorno
// node).
//
// Filtrar y ordenar usan mecanismos DISTINTOS a propósito (DC-05/DC-06):
// filtrar es tolerancia a errores de tecleo (pliega acentos y `ñ`→`n`
// normalizando a forma de descomposición Unicode), ordenar es un problema
// lingüístico (comparación de cadenas consciente del alfabeto español,
// donde `Á` debe caer junto a `A`). Que nadie los unifique más adelante.
//
// Ninguna función de este fichero lanza nunca: todas son totales y, ante
// una entrada nula/indefinida/de forma inesperada, devuelven el valor
// neutro correspondiente (`''`, `[]`, `null`, `{}`).
//
// El nombre empieza por `use` para seguir la convención de la carpeta, pero
// esto NO es un composable con estado: no hay estado reactivo ni ciclo de
// vida de componente, y no se importa nada del framework de UI (mismo caso
// que la mitad pura de `useStepShortcuts.ts`).
import type { CatalogueHero, CatalogueVillain } from '~~/engine/types'
import { spanishHeroAliases } from '~/data/spanish-hero-aliases'

export interface HeroOption {
  id: string
  spanishName: string
  catalogueName: string
  alterEgo: string
}

export interface VillainOption {
  id: string
  name: string
}

export interface SelectionSlot {
  heroId: string | null
  playerName: string
}

// Marcas diacríticas combinantes (rango U+0300–U+036F). Tras normalizar a la
// forma de descomposición Unicode, una letra con tilde/diéresis se
// descompone en la letra base + una marca de este rango; retirarlas pliega
// también la tilde de `ñ` a `n` (DC-05), que es DELIBERADO: teclear «arana»
// encuentra «Hombre Araña». No hay ningún par de alias de los 23 que
// difiera solo en `n`/`ñ`, así que no hay riesgo de colisión falsa, y esto
// reduce fricción en un teclado de tablet.
const COMBINING_MARKS_REGEX = /[̀-ͯ]/g

export function normalizeForSearch(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
}

// D-05: la ausencia de alias NUNCA rompe nada — un héroe sin entrada en
// `spanishHeroAliases` (o con entrada de cadena vacía) cae a su nombre
// inglés del catálogo.
export function resolveHeroSpanishName(heroId: string, catalogueName: string): string {
  const alias = spanishHeroAliases[heroId]
  return alias && alias.trim() !== '' ? alias : catalogueName
}

export function buildHeroOptions(heroes: CatalogueHero[] | null | undefined): HeroOption[] {
  if (!heroes || heroes.length === 0) return []
  return heroes
    .map((hero): HeroOption => ({
      id: hero.id,
      spanishName: resolveHeroSpanishName(hero.id, hero.name),
      catalogueName: hero.name,
      alterEgo: hero.alterEgo,
    }))
    .sort((a, b) => a.spanishName.localeCompare(b.spanishName, 'es'))
}

// Los villanos no llevan capa de alias (06-UI-SPEC.md §Layout 3): se
// ordenan por su `name` de catálogo tal cual.
export function buildVillainOptions(villains: CatalogueVillain[] | null | undefined): VillainOption[] {
  if (!villains || villains.length === 0) return []
  return villains
    .map((villain): VillainOption => ({ id: villain.id, name: villain.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

// D-08/SEL-05: busca simultáneamente por nombre español, nombre inglés y
// alter ego, insensible a mayúsculas y a acentos, como subcadena en
// cualquier posición (no solo como prefijo).
export function matchesHeroQuery(query: string, hero: HeroOption): boolean {
  if (!query || !query.trim()) return true
  const normalizedQuery = normalizeForSearch(query)
  return [hero.spanishName, hero.catalogueName, hero.alterEgo]
    .some(field => normalizeForSearch(field).includes(normalizedQuery))
}

export function filterHeroOptions(options: HeroOption[], query: string): HeroOption[] {
  return options.filter(option => matchesHeroQuery(query, option))
}

// Un id que no existe en el catálogo (localStorage manipulado, o un
// catálogo que cambió entre despliegues) debe comportarse exactamente como
// «sin elegir» — la rejilla pintará «—» y nada revienta.
export function findHeroOption(options: HeroOption[], heroId: string | null): HeroOption | null {
  if (!heroId) return null
  return options.find(option => option.id === heroId) ?? null
}

export function findVillainOption(options: VillainOption[], villainId: string | null): VillainOption | null {
  if (!villainId) return null
  return options.find(option => option.id === villainId) ?? null
}

// D-15/SEL-06: un nombre vacío (o solo espacios) se rotula «Jugador N» —
// nunca hay un hueco anónimo en pantalla. No se recortan espacios
// interiores de un nombre no vacío.
export function resolvePlayerLabel(slotIndex: number, playerName: string): string {
  const trimmed = String(playerName ?? '').trim()
  return trimmed !== '' ? playerName : `Jugador ${slotIndex + 1}`
}

// Fórmula única compartida por el marcador `ya:` y por la línea `⚠`
// (06-UI-SPEC.md, decisión 9): 0 nombres → ''; 1 → «A»; 2 → «A y B»;
// 3 o más → «A, B y C» (comas entre todos menos el último, que va con « y »).
export function joinNames(names: string[] | null | undefined): string {
  if (!names || names.length === 0) return ''
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  const allButLast = names.slice(0, -1)
  const last = names[names.length - 1]
  return `${allButLast.join(', ')} y ${last}`
}

// Devuelve, para cada `heroId` elegido por ALGÚN hueco distinto de
// `currentSlotIndex`, el texto ya unido (`joinNames`) de los rótulos de los
// demás huecos que llevan ese mismo héroe, en orden de hueco. Se devuelve la
// cadena ya compuesta, no un array, para que `PlayerModal.vue` siga siendo
// tonto y no tenga que componer nada. El hueco `currentSlotIndex` nunca
// aparece en ningún valor. Los huecos con `heroId` `null` no generan entrada.
export function buildTakenByMap(
  slots: SelectionSlot[] | null | undefined,
  currentSlotIndex: number,
): Record<string, string> {
  if (!slots || slots.length === 0) return {}

  const labelsByHeroId: Record<string, string[]> = {}
  slots.forEach((slot, index) => {
    if (index === currentSlotIndex) return
    if (!slot.heroId) return
    const label = resolvePlayerLabel(index, slot.playerName)
    if (!labelsByHeroId[slot.heroId]) labelsByHeroId[slot.heroId] = []
    labelsByHeroId[slot.heroId]!.push(label)
  })

  const result: Record<string, string> = {}
  for (const heroId of Object.keys(labelsByHeroId)) {
    result[heroId] = joinNames(labelsByHeroId[heroId])
  }
  return result
}

// SEL-07/D-16: este texto AVISA, nunca bloquea — exclusión permanente de
// `PROJECT.md`. La línea que lo pinta es un `<p>` sin afordancia, jamás un
// `<button>` (D-32): sin borde, sin chevron, no abre `WarningDetailModal`.
export function buildDuplicateWarningText(slots: SelectionSlot[] | null | undefined): string | null {
  if (!slots || slots.length === 0) return null

  // Agrupa por heroId, en orden de primera aparición, ignorando huecos sin héroe.
  const slotIndexesByHeroId: Record<string, number[]> = {}
  const heroIdOrder: string[] = []
  slots.forEach((slot, index) => {
    if (!slot.heroId) return
    if (!slotIndexesByHeroId[slot.heroId]) {
      slotIndexesByHeroId[slot.heroId] = []
      heroIdOrder.push(slot.heroId)
    }
    slotIndexesByHeroId[slot.heroId]!.push(index)
  })

  const duplicateGroups = heroIdOrder
    .map(heroId => slotIndexesByHeroId[heroId]!)
    .filter(indexes => indexes.length > 1)

  if (duplicateGroups.length === 0) return null

  if (duplicateGroups.length === 1) {
    const group = duplicateGroups[0]!
    if (group.length === slots.length && slots.length === 4) {
      return 'Los 4 jugadores llevan el mismo héroe'
    }
    const labels = group.map(index => resolvePlayerLabel(index, slots[index]!.playerName))
    return `${joinNames(labels)} llevan el mismo héroe`
  }

  // Dos o más grupos: el prefijo fijo + cada grupo formateado con joinNames,
  // unidos entre sí por " · " (espacio, punto medio U+00B7, espacio).
  const groupTexts = duplicateGroups.map((group) => {
    const labels = group.map(index => resolvePlayerLabel(index, slots[index]!.playerName))
    return joinNames(labels)
  })
  return `Héroes repetidos: ${groupTexts.join(' · ')}`
}
