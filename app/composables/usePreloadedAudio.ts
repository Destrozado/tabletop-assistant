// app/composables/usePreloadedAudio.ts
// Única capa de la app que descarga y cachea los audios pregenerados en Cache
// Storage (ver CACHE_NAME más abajo). No es motor: no toca session/cursor/
// round; recibe los ids ya calculados por `collectAudioIds` (engine/audio.ts)
// — nunca los calcula ni los valida por su cuenta.
//
// El acceso de lectura (`getObjectUrl`) es SÍNCRONO a propósito (Pitfall 1 de
// 03.1-RESEARCH.md): un `await` colado entre el toque del usuario y
// `audioEl.play()` hace que WebKit deje de considerar la reproducción
// disparada por el gesto, y la silencia sin error visible en iOS. La decisión
// audio-o-respaldo del plan 03.1-05 tiene que poder leer este mapa sin
// esperar nada.
//
// Estado a nivel de MÓDULO, no dentro de la función que compone
// `usePreloadedAudio()`: dos consumidores distintos (esta página, que
// precarga, y `useVoiceAnnouncer`, que lee) tienen que ver el mismo mapa —
// si viviera dentro del cuerpo de la función cada `usePreloadedAudio()`
// tendría su propia copia y la precarga de uno nunca sería visible para
// el otro.
import { ref } from 'vue'

const CACHE_NAME = 'voice-audio-v1'
const preloaded = new Map<string, string>() // id -> object URL de blob

// null = precarga sin resolver todavía (no se ha llamado a `prefetchAll`, o
// sigue en vuelo); true = al menos un clip quedó disponible; false = la
// precarga terminó sin conseguir ninguno. Este tri-estado es el que el plan
// 03.1-05 usa para no pintar la banda de "sin voz española" mientras la
// precarga aún puede completarse.
export const audioAvailable = ref<boolean | null>(null)

// Una precarga a la vez: una segunda llamada a `prefetchAll` (p. ej. desde
// `onResumeContinue` justo después de `onConfirm`, o un segundo montaje de la
// página) devuelve la misma promesa en vez de disparar 36 descargas por
// duplicado.
let inFlight: Promise<void> | null = null

// Solo compone la URL estática del clip — no descarga ni comprueba nada.
// Exportada porque el plan 03.1-05 la usa como segundo escalón (intento
// directo por red cuando el blob todavía no está en el mapa).
export function staticUrlFor(id: string): string {
  return `/audio/${id}.m4a`
}

// SÍNCRONA, sin promesas, sin efectos: es la que se llama desde dentro del
// gesto del usuario (Pitfall 1). Si el id no está (precarga sin terminar,
// clip inexistente, fallo de red/caché), devuelve `undefined` y el llamador
// cae al respaldo — la ausencia nunca es un error.
export function getObjectUrl(id: string): string | undefined {
  return preloaded.get(id)
}

async function fetchAndCacheOne(id: string, cache: Cache | null): Promise<void> {
  const url = staticUrlFor(id)
  try {
    // Red primero, caché como respaldo (desviación consciente de
    // 03.1-RESEARCH.md, que proponía caché primero): el nombre del fichero
    // NO lleva huella, así que regenerar un clip reescribe la misma URL —
    // con caché primero, un audio regenerado no volvería a bajar nunca. Es
    // el mismo razonamiento del "stale service worker trap" de CLAUDE.md
    // aplicado al audio (T-03.1-15).
    let response: Response | undefined
    try {
      const fetched = await fetch(url)
      if (fetched.ok) {
        if (cache) {
          try {
            await cache.put(url, fetched.clone())
          }
          catch {
            // Escribir en Cache Storage puede fallar (cuota, modo privado):
            // D-07, la ausencia de caché nunca bloquea usar la respuesta ya
            // obtenida por red.
          }
        }
        response = fetched
      }
    }
    catch {
      // Sin red (o fetch rechazado): caer a lo que hubiera en caché.
    }
    if (!response && cache) {
      response = await cache.match(url)
    }
    if (!response || !response.ok) return // D-07: ausencia silenciosa, el respaldo ya lo cubre
    const blob = await response.blob()
    preloaded.set(id, URL.createObjectURL(blob))
  }
  catch {
    // Cualquier otro fallo (decodificación del blob, createObjectURL, etc.):
    // este id concreto simplemente no se registra. D-07/T-03.1-15: nunca
    // rompe el lote ni escala como error.
  }
}

// Descarga todos los `ids` en segundo plano y los deja accesibles por
// `getObjectUrl`. Dispara-y-olvida por diseño (D-09): la página la llama sin
// `await`, junto al wake lock, para no retrasar ni el primer paso ni el
// botón SIGUIENTE.
export async function prefetchAll(ids: string[]): Promise<void> {
  // La página prerrenderiza (`nuxt generate`): este cuerpo puede ejecutarse
  // durante el build, donde no existe `window`. Resolver sin hacer nada.
  if (typeof window === 'undefined') return

  if (inFlight) return inFlight

  inFlight = (async () => {
    let cache: Cache | null = null
    if ('caches' in window) {
      try {
        cache = await window.caches.open(CACHE_NAME)
      }
      catch {
        // Safari en modo privado (u otro contexto restringido) puede
        // rechazar `caches.open`: seguir sin caché, solo con `fetch` directo.
        cache = null
      }
    }

    await Promise.allSettled(ids.map(id => fetchAndCacheOne(id, cache)))

    audioAvailable.value = preloaded.size > 0
  })()

  try {
    await inFlight
  }
  finally {
    inFlight = null
  }
}

// NO se revocan los object URL creados aquí. El mapa es de módulo y vive lo
// que vive el documento; revocar en el `tryOnScopeDispose` de un consumidor
// (p. ej. `useVoiceAnnouncer`) dejaría al otro consumidor (esta misma página,
// en una futura precarga) con URLs muertas. Son ~700 KB en total para los 36
// clips — irrelevante en cualquier tablet.
export function usePreloadedAudio() {
  return { prefetchAll, getObjectUrl, staticUrlFor, audioAvailable }
}
