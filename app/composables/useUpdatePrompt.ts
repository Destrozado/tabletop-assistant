// app/composables/useUpdatePrompt.ts
//
// Superficie visible de `registerType: 'prompt'` (plan 04-01, D-03): sin este
// composable y sin `UpdateBanner.vue`, 'prompt' equivaldría en la práctica a
// "nunca se actualiza" — nadie llegaría nunca a ver `$pwa.needRefresh` puesto
// a `true`. OFF-04 exige que el grupo decida cuándo se aplica una versión
// nueva; este fichero es el único punto que traduce el estado reactivo del
// módulo PWA en la decisión "¿se pinta la banda o no?", y en la acción
// "aplicar ahora" cuando el grupo lo pide.
//
// Convenciones del repo seguidas aquí: imports explícitos de `vue` (nada de
// auto-imports, ningún composable del repo lo hace), tri-estado
// `boolean | null | undefined` para "aún no se sabe" (mismo patrón que
// `audioAvailable` en usePreloadedAudio.ts), y `try { } catch { /* comentario
// citando la decisión */ }` de cuerpo vacío para cualquier API del navegador
// (mismo estilo que la capa de persistencia y la de precarga de audio del
// repo, y que el respaldo de síntesis de voz).
import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'

// Forma mínima de `$pwa` que este fichero necesita. Se declara aquí (en vez
// de importar el tipo completo `PwaInjection` de @vite-pwa/nuxt) para poder
// construir un doble de pruebas sin contexto de Nuxt: `needRefresh` admite
// las dos formas que puede llegar a tomar según cómo el módulo construya el
// objeto reactivo inyectado (ver `readNeedRefresh` más abajo).
export interface UpdatePwaLike {
  needRefresh?: boolean | { value: boolean }
  updateServiceWorker: (reloadPage?: boolean) => unknown
}

// Función PURA a nivel de módulo, sin dependencia de Nuxt ni del navegador:
// es la que se testea directamente. D-01: una vez descartada (`dismissed`),
// la banda no vuelve aunque `needRefresh` siga o vuelva a ponerse a `true`
// en la misma sesión — por eso `dismissed` corta el resultado
// incondicionalmente. El tri-estado (`null`/`undefined` = "aún no se sabe")
// sigue el precedente de `audioAvailable` en usePreloadedAudio.ts: mientras
// no se sepa si hay versión nueva, la banda nunca se pinta "por si acaso", y
// `$pwa` puede no estar inyectado del todo (prerender, SW no soportado) sin
// que eso rompa ni pinte nada.
export function shouldShowUpdateBanner(
  needRefresh: boolean | null | undefined,
  dismissed: boolean,
): boolean {
  return needRefresh === true && !dismissed
}

// `$pwa.needRefresh` puede llegar de dos formas distintas según cómo el
// módulo construya el objeto reactivo inyectado: la documentación oficial
// citada en 04-RESEARCH.md lo describe como `Ref<boolean>` sin desenvolver,
// pero la versión instalada (@vite-pwa/nuxt 1.1.1) construye `$pwa` con
// `reactive({ ...needRefresh... })` (ver
// node_modules/@vite-pwa/nuxt/dist/runtime/plugins/pwa.client.js), y
// `reactive()` DESENVUELVE los refs anidados de forma automática — en la
// práctica, con la versión instalada, `$pwa.needRefresh` ya llega como
// `boolean` puro, no como `{ value }`. Se admiten ambas formas aquí para no
// acoplar este fichero a un detalle interno de una versión concreta del
// módulo (ver 04-05-SUMMARY.md para la confirmación en runtime).
function readNeedRefresh(pwa: UpdatePwaLike | undefined): boolean | undefined {
  const raw = pwa?.needRefresh
  if (raw === undefined) return undefined
  if (typeof raw === 'boolean') return raw
  return raw.value
}

// D-02/D-03: aplicar la actualización nunca puede lanzar ni romper
// next()/prev() a mitad de partida. `updateServiceWorker` puede fallar de
// forma síncrona (excepción) o asíncrona (promesa rechazada) — se cubren las
// dos formas, igual que el resto de APIs de navegador del repo.
function applyUpdateWith(pwa: UpdatePwaLike | undefined): void {
  try {
    const result = pwa?.updateServiceWorker(true)
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => {
        // Fallo asíncrono de updateServiceWorker (promesa rechazada): D-02/
        // D-03, una actualización fallida nunca puede romper la pantalla de
        // juego ni mostrarse como error visible.
      })
    }
  }
  catch {
    // Fallo síncrono de updateServiceWorker: misma decisión que arriba.
  }
}

// Construye el estado y las acciones de la banda a partir de un `$pwa` ya
// resuelto. Separado de `useUpdatePrompt()` a propósito: es lo que permite
// testear el descarte de sesión (D-01) y el try/catch de `applyUpdate`
// (D-02/D-03) con un doble de `$pwa`, sin depender del hook de acceso a la
// app de Nuxt y por tanto sin necesitar un contexto de Nuxt real en el test.
export function buildUpdatePrompt(pwa: UpdatePwaLike | undefined): {
  showUpdateBanner: ComputedRef<boolean>
  dismissUpdate: () => void
  applyUpdate: () => void
} {
  // D-01: descarte como estado de SESIÓN, nunca persistido en disco — no
  // pasa por la capa de persistencia de partida ni añade ninguna clave al
  // almacenamiento del navegador. Mismo patrón que `noticeDismissed` en
  // useVoiceAnnouncer.ts (líneas 391-395): si en una sesión futura (recargar
  // la app) hay otra vez una versión nueva, la banda simplemente vuelve a
  // aparecer.
  const dismissed = ref(false)

  const showUpdateBanner = computed(() =>
    shouldShowUpdateBanner(readNeedRefresh(pwa), dismissed.value))

  function dismissUpdate(): void {
    dismissed.value = true
  }

  function applyUpdate(): void {
    applyUpdateWith(pwa)
  }

  return { showUpdateBanner, dismissUpdate, applyUpdate }
}

// El cableado real con Nuxt. El hook de acceso a la app de Nuxt (línea de
// abajo) solo se llama AQUÍ, dentro del cuerpo de la función — nunca en el
// ámbito del módulo — precisamente para que este fichero se pueda importar
// desde un test de Vitest en entorno `node` sin contexto de Nuxt sin que
// reviente: importar el módulo no ejecuta `useUpdatePrompt()`, solo lo
// declara.
export function useUpdatePrompt(): {
  showUpdateBanner: ComputedRef<boolean>
  dismissUpdate: () => void
  applyUpdate: () => void
} {
  const { $pwa } = useNuxtApp()
  return buildUpdatePrompt($pwa)
}
