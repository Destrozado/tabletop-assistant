// Tests del composable de precarga de audio (D-07/D-09/T-03.1-15). Entorno
// `node` del proyecto `app-logic`: se simulan a mano `window.caches`,
// `globalThis.fetch` y `URL.createObjectURL` (mismo estilo de globales
// falsos que `usePersistedSession.test.ts`), sin jsdom ni contexto de Nuxt.
// `Blob` ya existe de forma nativa en Node 22.
//
// El estado del composable (el `Map` de object URLs, `audioAvailable`,
// `inFlight`) vive a nivel de MÓDULO por diseño (dos consumidores distintos
// tienen que compartirlo), así que cada test parte de un módulo limpio con
// `vi.resetModules()` + `await import('../usePreloadedAudio')` — la
// alternativa habría sido exportar un `__resetForTests()`, pero
// `resetModules` no exige tocar el fichero de producción solo para hacerlo
// testeable.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function createFakeCache() {
  const store = new Map<string, Response>()
  return {
    match: vi.fn(async (url: string) => store.get(url)),
    put: vi.fn(async (url: string, response: Response) => {
      store.set(url, response)
    }),
    _store: store,
  }
}

function makeOkResponse(body: string): Response {
  return new Response(new Blob([body]), { status: 200 })
}

function makeNotFoundResponse(): Response {
  return new Response(null, { status: 404 })
}

describe('usePreloadedAudio (D-07: ausencia silenciosa; D-09: precarga en segundo plano)', () => {
  let fakeCache: ReturnType<typeof createFakeCache>
  let fetchMock: ReturnType<typeof vi.fn>
  let createObjectUrlMock: ReturnType<typeof vi.fn>
  let cachesOpenMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    fakeCache = createFakeCache()
    cachesOpenMock = vi.fn(async () => fakeCache)
    fetchMock = vi.fn()
    createObjectUrlMock = vi.fn((blob: Blob) => `blob:fake-${(blob as unknown as { size: number }).size}-${Math.random()}`)

    ;(globalThis as unknown as { window: unknown }).window = {
      caches: { open: cachesOpenMock },
    }
    globalThis.fetch = fetchMock as unknown as typeof fetch
    ;(globalThis.URL as unknown as { createObjectURL: typeof createObjectUrlMock }).createObjectURL = createObjectUrlMock
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    vi.restoreAllMocks()
  })

  it('1. con red disponible, prefetchAll deja getObjectUrl devolviendo una cadena y audioAvailable en true', async () => {
    fetchMock.mockImplementation(async () => makeOkResponse('a'))
    const { prefetchAll, getObjectUrl, audioAvailable } = await import('../usePreloadedAudio')

    await prefetchAll(['a', 'b'])

    expect(typeof getObjectUrl('a')).toBe('string')
    expect(typeof getObjectUrl('b')).toBe('string')
    expect(audioAvailable.value).toBe(true)
  })

  it('2. fetch es el primer intento: con una entrada en caché Y red disponible, se llama a fetch y se hace cache.put', async () => {
    fakeCache._store.set('/audio/a.m4a', makeOkResponse('cached'))
    fetchMock.mockImplementation(async () => makeOkResponse('fresh'))
    const { prefetchAll } = await import('../usePreloadedAudio')

    await prefetchAll(['a'])

    expect(fetchMock).toHaveBeenCalledWith('/audio/a.m4a')
    expect(fakeCache.put).toHaveBeenCalled()
  })

  it('3. con fetch rechazando y una entrada en caché, se usa la de caché y audioAvailable acaba en true (camino offline)', async () => {
    fakeCache._store.set('/audio/a.m4a', makeOkResponse('cached'))
    fetchMock.mockImplementation(async () => {
      throw new Error('sin red')
    })
    const { prefetchAll, getObjectUrl, audioAvailable } = await import('../usePreloadedAudio')

    await prefetchAll(['a'])

    expect(typeof getObjectUrl('a')).toBe('string')
    expect(audioAvailable.value).toBe(true)
  })

  it('4. con fetch rechazando y sin caché, prefetchAll RESUELVE, getObjectUrl devuelve undefined y audioAvailable acaba en false', async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error('sin red')
    })
    const { prefetchAll, getObjectUrl, audioAvailable } = await import('../usePreloadedAudio')

    await expect(prefetchAll(['a'])).resolves.toBeUndefined()
    expect(getObjectUrl('a')).toBeUndefined()
    expect(audioAvailable.value).toBe(false)
  })

  it('5. un id que responde 404 no registra nada y no rompe los demás ids del mismo lote', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/audio/missing.m4a') return makeNotFoundResponse()
      return makeOkResponse('ok')
    })
    const { prefetchAll, getObjectUrl, audioAvailable } = await import('../usePreloadedAudio')

    await prefetchAll(['missing', 'present'])

    expect(getObjectUrl('missing')).toBeUndefined()
    expect(typeof getObjectUrl('present')).toBe('string')
    expect(audioAvailable.value).toBe(true)
  })

  it('6. sin caches en window, funciona igual usando solo fetch', async () => {
    ;(globalThis as unknown as { window: unknown }).window = {}
    fetchMock.mockImplementation(async () => makeOkResponse('a'))
    const { prefetchAll, getObjectUrl, audioAvailable } = await import('../usePreloadedAudio')

    await prefetchAll(['a'])

    expect(typeof getObjectUrl('a')).toBe('string')
    expect(audioAvailable.value).toBe(true)
    expect(cachesOpenMock).not.toHaveBeenCalled()
  })

  it('7. sin window (SSR), prefetchAll resuelve sin llamar a fetch', async () => {
    delete (globalThis as { window?: unknown }).window
    const { prefetchAll } = await import('../usePreloadedAudio')

    await expect(prefetchAll(['a'])).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('8. dos llamadas solapadas a prefetchAll no duplican las peticiones de fetch', async () => {
    let resolveFetch: (value: Response) => void = () => {}
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve
    }))
    const { prefetchAll } = await import('../usePreloadedAudio')

    const first = prefetchAll(['a'])
    const second = prefetchAll(['a'])

    // `fetch` no se llama de forma síncrona: hay un `await window.caches.open(...)`
    // por delante en `prefetchAll`. Se deja drenar la cola de microtareas hasta
    // que el mock capture su propio `resolve` antes de invocarlo.
    await vi.waitFor(() => {
      if (fetchMock.mock.calls.length === 0) throw new Error('fetch aún no llamado')
    })
    resolveFetch(makeOkResponse('a'))
    await Promise.all([first, second])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('9. getObjectUrl es síncrona: su valor de retorno no es una promesa', async () => {
    fetchMock.mockImplementation(async () => makeOkResponse('a'))
    const { prefetchAll, getObjectUrl } = await import('../usePreloadedAudio')

    await prefetchAll(['a'])
    const result = getObjectUrl('a')

    expect(typeof (result as unknown as { then?: unknown })?.then).not.toBe('function')
  })
})
