// app/composables/useGameContent.ts
// Acceso al contenido de juegos. Import ESTÁTICO en build (Anti-Patrón 3 de
// ARCHITECTURE.md: sin llamadas de red en tiempo de ejecución — el contenido se
// conoce en build y debe funcionar sin conexión, offline-first). NO importa
// `~~/engine/schema`: la validación de esquema es exclusiva de build/CI
// (TECH-02); el validador de esquema no debe entrar en el bundle del navegador.
import type { GameDefinition } from '~~/engine/types'
import { games as gamesIndex, type GameIndexEntry } from '~~/content/games-index'
import marvelChampions from '~~/content/marvel-champions.json'

const gamesById: Record<string, GameDefinition> = {
  'marvel-champions': marvelChampions as GameDefinition,
}

export function useGameContent() {
  const games: GameIndexEntry[] = gamesIndex

  function getGame(gameId: string): GameDefinition | null {
    return gamesById[gameId] ?? null
  }

  return { games, getGame }
}
