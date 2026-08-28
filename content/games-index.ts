// content/games-index.ts
// Índice de juegos disponibles en el selector (SEL-01..04). El rótulo visible
// que consume GameSelectorScreen (plan 01-02) es `title`, no `name`.
export interface GameIndexEntry {
  id: string
  title: string
  status: 'available' | 'coming-soon'
}

export const games: GameIndexEntry[] = [
  { id: 'marvel-champions', title: 'Marvel Champions', status: 'available' },
  { id: 'warhammer-40k', title: 'Warhammer 40.000', status: 'coming-soon' },
]
