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

  // WR-08 (09-REVIEW.md, ronda 3): `gameId` viene del parámetro de ruta
  // (`/[game]`), es decir, de la URL — dato no confiable. Un objeto literal
  // indexado directamente (`gamesById[gameId]`) resuelve por la cadena de
  // prototipos: `gamesById['constructor']` devuelve la función `Object`,
  // que es truthy, así que `?? null` nunca entra, la guarda `v-if="!game"`
  // de la pantalla de juego no se dispara, `expand()` revienta sobre
  // `game.sections` y la pantalla se queda en «Cargando…» sin salida.
  // Misma familia de defecto que CR-02 (ronda 3) en `engine/history.ts` —
  // un objeto literal indexado por dato no confiable — pero aquí el dato
  // no confiable es la URL, no `localStorage`. `Object.hasOwn` en el punto
  // de LECTURA descarta la cadena de prototipos sin tocar `gamesById`.
  function getGame(gameId: string): GameDefinition | null {
    return Object.hasOwn(gamesById, gameId) ? gamesById[gameId]! : null
  }

  return { games, getGame }
}
