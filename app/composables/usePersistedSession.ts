// app/composables/usePersistedSession.ts
// Única capa de TODA la app que toca localStorage. `useLocalStorage` de
// VueUse (auto-importado por @vueuse/nuxt) es SSR-safe: en el servidor no
// intenta acceder a ningún global de navegador y se limita a devolver el
// valor por defecto. Clave namespaced `tga:progress:<gameId>`.
//
// El motor (`~~/engine/persistence`) es quien define la FORMA de lo
// persistido y la regla de reanudación; este composable solo serializa y
// deserializa objetos planos — cualquier fallo de parseo (JSON corrupto) se
// trata como ausencia de dato, nunca como error.
import { toPersistedPosition } from '~~/engine/persistence'
import type { PersistedPosition } from '~~/engine/persistence'
import type { EngineSession } from '~~/engine/types'

const KEY_PREFIX = 'tga:progress:'

function storageKey(gameId: string): string {
  return `${KEY_PREFIX}${gameId}`
}

// Valida la FORMA completa de `PersistedPosition`, no solo la presencia de
// `formatVersion` (CR-01): un objeto parcial (residuo de una build anterior
// con otra forma de dato, edición manual en DevTools, o una escritura a
// medias) debe tratarse como ausencia de dato, nunca como una sesión
// resumible a medio construir. `context` en concreto debe ser un objeto —
// es justo el campo cuya ausencia hacía crashear la pantalla "El contenido
// ha cambiado" en `useGameSession.ts`.
function isPersistedPosition(value: unknown): value is PersistedPosition {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return 'formatVersion' in candidate
    && 'contentVersion' in candidate
    && 'runtimeId' in candidate
    && 'round' in candidate
    && 'context' in candidate
    && typeof candidate.context === 'object' && candidate.context !== null
}

export function usePersistedSession() {
  function load(gameId: string): PersistedPosition | null {
    const raw = useLocalStorage<string>(storageKey(gameId), '', { writeDefaults: false }).value
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw)
      return isPersistedPosition(parsed) ? parsed : null
    }
    catch {
      // JSON corrupto (edición manual, cuota parcial, etc.): ausencia de dato.
      return null
    }
  }

  function save(session: EngineSession) {
    const persisted = toPersistedPosition(session)
    useLocalStorage<string>(storageKey(session.gameId), '').value = JSON.stringify(persisted)
  }

  function clear(gameId: string) {
    // Asignar null (no '') hace que useStorage llame a removeItem: la clave
    // desaparece de verdad, no queda como cadena vacía (SETUP-05).
    useLocalStorage<string | null>(storageKey(gameId), '').value = null
  }

  return { load, save, clear }
}
