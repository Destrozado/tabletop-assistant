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
  // WR-08 (09-REVIEW.md, ronda 3): `gameId` viene del parámetro de ruta
  // (`/[game]`), es decir, de la URL — dato no confiable. Un objeto literal
  // indexado directamente (`cataloguesById[gameId]`) resuelve por la cadena
  // de prototipos: `cataloguesById['constructor']` devuelve la función
  // `Object`, que es truthy, así que `?? null` nunca entra. Misma familia
  // de defecto que CR-02 (ronda 3) — un objeto literal indexado por dato
  // no confiable — y calcado del mismo fix en `useGameContent.ts`.
  // `Object.hasOwn` en el punto de LECTURA descarta la cadena de
  // prototipos sin tocar `cataloguesById`.
  function getCatalogue(gameId: string): CharacterCatalogue | null {
    return Object.hasOwn(cataloguesById, gameId) ? cataloguesById[gameId]! : null
  }

  return { getCatalogue }
}
