// app/composables/useCharacterCatalogue.ts
// Acceso al catálogo de personajes (Fase 5). Import ESTÁTICO en build
// (Anti-Patrón 3 de ARCHITECTURE.md: sin llamadas de red en tiempo de
// ejecución — el catálogo se conoce en build y debe funcionar sin conexión,
// offline-first; CAT-06, ya verificado en la Fase 5). Este fichero NO
// importa el validador de esquema del catálogo (paquete de validación
// Node-only) ni nada de esa familia: la validación de esquema es exclusiva
// de build/CI (T-01-19); el validador no debe entrar en el bundle del
// navegador. Calcado literalmente de `app/composables/useGameContent.ts`.
import type { CharacterCatalogue } from '~~/engine/types'
import marvelCharacters from '~~/content/marvel-characters.json'

const cataloguesById: Record<string, CharacterCatalogue> = {
  'marvel-champions': marvelCharacters as CharacterCatalogue,
}

export function useCharacterCatalogue() {
  function getCatalogue(gameId: string): CharacterCatalogue | null {
    return cataloguesById[gameId] ?? null
  }

  return { getCatalogue }
}
