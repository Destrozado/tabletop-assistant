# Fase 4: Instalación y funcionamiento offline - Mapa de patrones

**Mapeado:** 2026-08-31
**Ficheros analizados:** 12 (nuevos o modificados)
**Analogías encontradas:** 10 / 12

## Clasificación de ficheros

| Fichero nuevo/modificado | Rol | Flujo de datos | Analogía más cercana | Calidad |
|---|---|---|---|---|
| `nuxt.config.ts` (modificar) | config | request-response | el propio fichero, sección `routeRules`/`nitro.prerender` ya existente | exacta (edición in-place) |
| `app/components/UpdateBanner.vue` | component | event-driven | `app/components/VoiceUnavailableNotice.vue` | exacta |
| `scripts/pwa/generate-icons.mjs` | utility (script Node) | file-I/O / batch | `scripts/voice/generate.mjs` | exacta |
| `.github/workflows/ci.yml` (modificar) | config (CI) | batch | el propio fichero, job `test` ya existente | exacta (añadir step, no crear) |
| `e2e/pwa-install.spec.ts` | test (Playwright) | event-driven | ningún analog E2E existe — usar `app/composables/__tests__/*.test.ts` solo como referencia de estilo de aserciones | sin analog E2E directo |
| `e2e/offline-flow.spec.ts` | test (Playwright) | event-driven | idem | sin analog E2E directo |
| `e2e/update-banner.spec.ts` | test (Playwright) | event-driven | idem | sin analog E2E directo |
| `playwright.config.ts` | config | — | `vitest.config.ts` (config de runner de test hermano) | rol-match |
| `app/app.vue` (posible modificación, a discreción) | component raíz | event-driven | el propio fichero (guardia de orientación) | exacta |
| `public/icons/*.png` (generados) | asset (no código) | file-I/O | `public/audio/*.m4a` (generados por script, versionados) | rol-match |
| — (no hay fichero de plugin nuevo: `$pwa` lo inyecta el propio módulo) | — | — | — | n/a |
| `package.json` (modificar) | config | — | el propio fichero, bloque `scripts` (`voice:generate`) | exacta |

## Asignaciones de patrón

### `app/components/UpdateBanner.vue` (component, event-driven)

**Analogía:** `app/components/VoiceUnavailableNotice.vue` — CONTEXT.md lo señala explícitamente como "el precedente exacto de la banda de actualización: no modal, descartable, no bloquea el botón SIGUIENTE".

**Estructura completa del analog** (`app/components/VoiceUnavailableNotice.vue`, líneas 1-31):
```vue
<script setup lang="ts">
// Componente tonto: recibe props, emite eventos, no importa nada del motor
// puro ni de los composables (ARCHITECTURE.md §3/§5). Sin props — el mensaje
// es el mismo sea cual sea la causa (UI-SPEC §Layout 2): sin síntesis en
// absoluto o sin voz española, ambas producen silencio total desde el punto
// de vista del usuario y la app no puede distinguirlas con fiabilidad.
const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div class="bg-surface border-b border-background px-2xl py-lg flex items-start justify-between gap-md">
    <div class="flex flex-col gap-sm">
      <h2 class="text-heading font-bold text-primary-text">
        Sin voz en este dispositivo
      </h2>
      <p class="text-body font-normal text-secondary-text">
        El juego sigue funcionando solo con texto. Si el dispositivo es Android, revisad Ajustes → Idiomas → Texto a voz — puede faltar el paquete de voz en español.
      </p>
    </div>
    <button
      type="button"
      class="w-12 h-12 flex items-center justify-center text-primary-text text-heading leading-none active:brightness-95"
      aria-label="Cerrar aviso"
      @click="emit('dismiss')"
    >
      ✕
    </button>
  </div>
</template>
```

**Cómo se calcula la visibilidad (composable, no el componente)** — `app/composables/useVoiceAnnouncer.ts` líneas 391-395:
```typescript
// D-50: descarte de la banda como estado de sesión, nunca persistido — no
// pasa por usePersistedSession ni añade ninguna clave de localStorage. Si en
// una sesión futura el dispositivo ya tiene voz española, el aviso
// simplemente no vuelve a salir.
const noticeDismissed = ref(false)
function dismissNotice(): void {
  noticeDismissed.value = true
}
const showVoiceUnavailableNotice = computed(() => available.value === false && !noticeDismissed.value)
```
Esto es exactamente D-01 de la fase 4 (banda descartable, no persistida, no vuelve hasta reabrir la app). El componente `UpdateBanner.vue` puede llevar este mismo `computed`/`ref` local en su propio `<script setup>` (RESEARCH.md Pattern 2 ya lo propone así) — no hace falta un composable dedicado como `useVoiceAnnouncer.ts`, porque `$pwa` ya lo expone el módulo; basta con un `ref` de descarte local en el componente, igual de simple que el de arriba.

**Dónde se monta** — `app/pages/[game]/index.vue` líneas 445-450 (analog de montaje):
```vue
      <VoiceUnavailableNotice
        v-if="showVoiceUnavailableNotice"
        @dismiss="dismissNotice"
      />
```
**Aviso importante para el planificador:** `VoiceUnavailableNotice` se monta SOLO dentro de la pantalla de juego (`app/pages/[game]/index.vue`, justo bajo `AppHeader`, antes de `StepScreen`) — no es un componente global. La banda de actualización, en cambio, debería poder aparecer también en el selector de juego (`app/pages/index.vue` o donde viva `GameSelectorScreen.vue`), porque una versión nueva puede detectarse en cualquier pantalla. El sitio más natural para un componente verdaderamente global es `app/app.vue` (líneas 1-25, ver más abajo) — no hay `app/layouts/` en este proyecto, así que `app.vue` es el único punto de montaje compartido por todas las rutas. Esto queda a discreción del planificador (CONTEXT.md lo dice explícitamente), pero `app.vue` es la opción más consistente con "no bloquea el botón SIGUIENTE" en NINGUNA pantalla, no solo en la de juego.

**Patrón de emisión / recepción de eventos:** `dismiss: []` como único evento sin payload, igual que el analog. Para el botón de actualizar, añadir un segundo evento `update: []` (sin payload) — el propio RESEARCH.md Pattern 2 ya escribe `update()`/`dismiss()` como funciones locales en vez de emits si el componente maneja `$pwa` directamente; cualquiera de los dos enfoques es coherente con "componente tonto" siempre que no importe composables del motor.

---

### El try/catch de las APIs del navegador — convención transversal

CONTEXT.md: "Todo el código de APIs del navegador sigue la forma `try { ... } catch { /* comentario citando la decisión */ }` — sin logging, sin error visible."

**Instancia 1** — `app/composables/useVoiceAnnouncer.ts` líneas 103-110 (respaldo de síntesis):
```typescript
function speakFallback(): void {
  try {
    speak()
  }
  catch {
    // El emparejamiento cancelar/hablar de VueUse puede fallar en iOS justo
    // tras terminar la locución anterior (03-RESEARCH.md). VOZ-06 exige que
    // esto jamás rompa next()/prev().
```

**Instancia 2** — `app/composables/usePersistedSession.ts` líneas 85-92 (escritura en localStorage):
```typescript
function writeRaw(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  }
  catch {
    // Fallo silencioso (privado/cuota): VOZ-06/D-51 exigen que un fallo de
    // almacenamiento nunca rompa next()/prev()/toggle().
  }
}
```

**Instancia 3** — `app/composables/usePreloadedAudio.ts` líneas 65-71 (Cache Storage):
```typescript
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
```

**Aplicación al código de esta fase:** cualquier `try`/`catch` que envuelva `$pwa.updateServiceWorker(true)`, el registro del service worker (si se toca a mano en algún punto, aunque el módulo ya lo hace por dentro), o llamadas a APIs nuevas del navegador (p. ej. comprobar `navigator.serviceWorker`) debe seguir esta forma exacta: bloque `catch` vacío de ejecución, con un comentario que cite la decisión (D-02, D-03, etc.), sin `console.error`, sin re-lanzar, sin mostrar error visible al usuario.

---

### Composable representativo + su test — forma y convenciones de Vitest

**Analog elegido:** `app/composables/usePreloadedAudio.ts` + `app/composables/__tests__/usePreloadedAudio.test.ts` — mismo dominio (Cache Storage / fetch / feature-detection de APIs de navegador) que tocará el registro del SW.

**Guardia SSR / feature detection** (`usePreloadedAudio.ts` líneas 100-104):
```typescript
export async function prefetchAll(ids: string[]): Promise<void> {
  // La página prerrenderiza (`nuxt generate`): este cuerpo puede ejecutarse
  // durante el build, donde no existe `window`. Resolver sin hacer nada.
  if (typeof window === 'undefined') return
```
El proyecto usa `typeof window === 'undefined'` como guardia de cliente, NO `import.meta.client` (no aparece en ninguna parte del código fuente de `app/`) ni `ClientOnly` a nivel de composable — `ClientOnly` sí se usa a nivel de plantilla en `app/pages/[game]/index.vue` línea 367 y 478, para envolver bloques enteros de UI que dependen de `onMounted`. Para el registro/lectura del SW, seguir el mismo patrón: guardia `typeof window === 'undefined'` dentro de las funciones del composable, y si el componente `UpdateBanner.vue` necesita evitar el flash de hidratación, envolverlo en `<ClientOnly>` en el punto de montaje (igual que la plantilla de `[game]/index.vue`).

**Estado de módulo, tri-estado `boolean | null`** (`usePreloadedAudio.ts` línea 30):
```typescript
export const audioAvailable = ref<boolean | null>(null)
```
Si el planificador decide envolver la lectura de `$pwa.needRefresh` en un composable propio en vez de leer `$pwa` directamente desde el componente (RESEARCH.md Pattern 2 sugiere leerlo directo vía `useNuxtApp()`), este es el patrón de tri-estado a seguir para distinguir "sin decidir todavía" de "false real".

**Forma del test** (`app/composables/__tests__/usePreloadedAudio.test.ts` líneas 1-58):
```typescript
// Tests del composable de precarga de audio (D-07/D-09/T-03.1-15). Entorno
// `node` del proyecto `app-logic`: se simulan a mano `window.caches`,
// `globalThis.fetch` y `URL.createObjectURL` (mismo estilo de globales
// falsos que `usePersistedSession.test.ts`), sin jsdom ni contexto de Nuxt.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('usePreloadedAudio (D-07: ausencia silenciosa; D-09: precarga en segundo plano)', () => {
  beforeEach(() => {
    vi.resetModules()
    // ... mocks de window.caches, fetch, URL.createObjectURL asignados a globalThis
    ;(globalThis as unknown as { window: unknown }).window = {
      caches: { open: cachesOpenMock },
    }
    globalThis.fetch = fetchMock as unknown as typeof fetch
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
    expect(audioAvailable.value).toBe(true)
  })
```
Nombres de test numerados con descripción larga en español, `vi.resetModules()` + `await import(...)` dinámico cuando el composable tiene estado de módulo, mocks manuales de globales del navegador asignados a `globalThis`/`window` en `beforeEach` y limpiados en `afterEach`. Este es el molde a seguir para cualquier test unitario del lado Vitest de esta fase (p. ej. si se decide testear una función pura de "¿hay `needRefresh`?" fuera de Playwright).

**Convención de nombre de fichero de test:** `<composable>.test.ts` dentro de `app/composables/__tests__/`, capturado por el glob `app/**/*.test.ts` de `vitest.config.ts` (ver más abajo). Playwright usa `.spec.ts`, un sufijo distinto, precisamente para no colisionar con este glob.

---

### `nuxt.config.ts` — bloques existentes a extender, verbatim

**`routeRules`, las cuatro reglas ya escritas** (líneas 21-50), incluido el comentario que anticipa la Fase 4:
```typescript
routeRules: {
  // Assets con hash en el nombre: seguros de cachear indefinidamente.
  '/_nuxt/**': {
    headers: { 'cache-control': 'public, max-age=31536000, immutable' },
  },
  // Fuente autoalojada: el nombre es estable, pero un año de caché sigue
  // siendo correcto porque sustituirla implicaría cambiar el fichero.
  '/fonts/**': {
    headers: { 'cache-control': 'public, max-age=31536000, immutable' },
  },
  // Service worker y manifest: NUNCA cacheados. Es el cierre del "stale
  // service worker trap" descrito en CLAUDE.md — si el host sirve /sw.js con
  // caché larga, el navegador jamás se entera de que hay una build nueva y la
  // tablet se queda con una versión vieja a mitad de partida. Ninguno de los
  // dos ficheros existe todavía (llegan en la Fase 4 con @vite-pwa/nuxt); la
  // regla se declara ya para que no se olvide al instalar el módulo.
  '/sw.js': { headers: { 'cache-control': 'no-cache' } },
  '/manifest.webmanifest': { headers: { 'cache-control': 'no-cache' } },
  // Audios pregenerados (VOZ-07, plan 03.1-04): a propósito SIN `immutable`
  // como `/fonts/**`. El nombre del clip (`<id>.m4a`) es estable pero su
  // CONTENIDO cambia al regenerar una frase (D-10/D-11) — con una caché
  // larga, un clip regenerado se serviría para siempre desde una copia
  // rancia, el mismo fallo que las reglas de `/sw.js` existen para evitar
  // (T-03.1-15). `must-revalidate` es barato aquí: la precarga
  // (`usePreloadedAudio.ts`) solo va a red la primera vez de cada sesión y
  // el respaldo de Cache Storage cubre el caso sin red.
  '/audio/**': {
    headers: { 'cache-control': 'public, max-age=0, must-revalidate' },
  },
},
```
**El comentario de las líneas 34-36 (`'Ninguno de los dos ficheros existe todavía... llegan en la Fase 4 con @vite-pwa/nuxt'`) es la confirmación explícita, ya en el repo, de que esta fase es la destinataria prevista de este bloque — no crear reglas nuevas para `/sw.js`/`/manifest.webmanifest`, ya están.**

**`nitro.prerender`** (líneas 52-62):
```typescript
nitro: {
  prerender: {
    // '/' ya existe (selector de juego, plan 01-02): se declara explícita
    // junto a la ruta de juego. Se mantiene crawlLinks:false porque la
    // navegación entre pantallas usa navigateTo() en un manejador de click,
    // no un <NuxtLink> con href real en el HTML — el crawler no lo
    // descubriría solo, así que cada ruta prerenderizable se enumera aquí.
    crawlLinks: false,
    routes: ['/', '/marvel-champions'],
  },
},
```
Relevante para el Pitfall 1 de RESEARCH.md (`_payload.json` con query string offline): solo hay 2 rutas prerenderizadas, exactamente las que hoy ya enumera este bloque — no hace falta tocarlo, pero el planificador debe saber que la navegación offline entre `/` y `/marvel-champions` pasa por estas dos entradas.

**`modules`** (línea 10, único módulo hoy):
```typescript
modules: ['@vueuse/nuxt'],
```
El módulo PWA se añade aquí: `modules: ['@vueuse/nuxt', '@vite-pwa/nuxt']`, y el bloque `pwa: {...}` se añade como propiedad hermana de `modules`/`routeRules`/`nitro` al nivel raíz del objeto de `defineNuxtConfig`.

---

### `scripts/voice/generate.mjs` — patrón de script Node de cero dependencias

**Analog para** `scripts/pwa/generate-icons.mjs`.

**Shebang + cabecera de documentación** (líneas 1-16):
```javascript
#!/usr/bin/env node
// scripts/voice/generate.mjs
//
// Qué es: CLI invocado A MANO por el desarrollador para generar los audios de
// locución (Gemini TTS -> PCM -> WAV -> AAC/M4A) de las 37 frases `speech` de
// content/marvel-champions.json.
//
// D-06: este script NUNCA se invoca desde `build`, `generate`, ni desde CI, ni
// desde Vercel. ...
```
Para `generate-icons.mjs` el paralelo es: script invocado a mano, que SÍ puede (a diferencia del de voz) ejecutarse en CI/build si se desea, porque no depende de una clave de API — pero igualmente debe documentar en la cabecera que produce ficheros versionados en `public/icons/`, no generados en cada build.

**Imports de Node puro, sin dependencias externas** (líneas 18-23):
```javascript
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
```
Para el icono: `import { deflateSync, crc32 } from 'node:zlib'` + `writeFileSync`/`mkdirSync` de `node:fs` (RESEARCH.md Pattern 3 ya lo especifica).

**Constantes de rutas de salida, agrupadas** (líneas 58-63):
```javascript
const AUDIO_DIR = 'public/audio'
const MANIFEST_PATH = 'scripts/voice/manifest.json'
const CONTENT_PATH = 'content/marvel-champions.json'
const ID_PATTERN = /^[a-z0-9]+(?:\.[a-z0-9-]+)*$/
const RETRY_BACKOFFS_MS = [5000, 15000, 45000] // ante 429/5xx: 5s, 15s, 45s
```
Análogo esperado en `generate-icons.mjs`: `const ICONS_DIR = 'public/icons'` y una lista de `{ name, size, maskable }` para los 4 tamaños que pide RESEARCH.md (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`).

**Parseo de argumentos, sin librería** (líneas 74-78):
```javascript
const rawArgs = process.argv.slice(2)
const force = rawArgs.includes('--force') // D-11: regenerar las 37 sin mirar huellas
const probeMode = rawArgs.includes('--probe')
const delayArg = rawArgs.find(arg => arg.startsWith('--delay='))
const delayMs = delayArg ? Number(delayArg.slice('--delay='.length)) : 1500
```
Mismo patrón de `process.argv.slice(2)` + `.includes()`/`.find()` manual, sin `yargs`/`commander`.

**Progreso por consola, numerado** (líneas 252-260, 284):
```javascript
console.log(`Generando ${targets.length} de ${entries.length} clips totales (estilo activo: ${ACTIVE_STYLE}).`)
if (targets.length === 0) {
  console.log('Nada que generar: todo al día.')
}
// ...
console.log(`[${completed + 1}/${targets.length}] ${entry.id}...`)
// ...
console.log(`Hecho: ${completed}/${targets.length} clips generados.`)
```

**Fallo explícito con `process.exit(1)` y mensaje en español, sin stack trace crudo** (líneas 41-47):
```javascript
if (!GEMINI_API_KEY) {
  console.error([
    'Falta la clave de la API de Gemini.',
    'Ponla en un fichero .env en la raíz del repo, en la variable',
    'GEMINI_API_KEY=tu-clave-aqui',
    '(el fichero .env ya está en .gitignore; su valor nunca se imprime).',
  ].join('\n'))
  process.exit(1)
}
```

**Cómo se engancha a `package.json`** (líneas 12-13 del propio `package.json`):
```json
"voice:generate": "node scripts/voice/generate.mjs",
"voice:probe": "node scripts/voice/generate.mjs --probe"
```
Análogo esperado: `"icons:generate": "node scripts/pwa/generate-icons.mjs"`. Nada de esto se invoca desde `build`/`generate`/`postinstall` (mismo D-06 de "cero dependencias nuevas" + generado y versionado, no construido en cada deploy).

---

### `.github/workflows/ci.yml` — verbatim, corrección de premisa de RESEARCH.md

**El fichero YA EXISTE** (contradice cualquier supuesto de "crear el workflow desde cero"). Contenido completo actual:
```yaml
name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test
```
La tarea de esta fase es **añadir pasos al job `test` existente** (o un job nuevo en el mismo fichero), no crear el workflow. El orden natural de los pasos nuevos, siguiendo la misma convención `name:`/`uses:`/`run:` ya establecida:
1. Un paso `npm run generate` (para tener `.output/public` real que servir con `nuxi preview`, tal como advierte RESEARCH.md sobre `nuxi preview` no aplicando cabeceras del preset Vercel — aquí solo hace falta un build servible, no las cabeceras reales).
2. `npx playwright install --with-deps chromium`.
3. `npx playwright test`.

Mantener `permissions: contents: read` y el estilo de nombres de step en español-neutro/inglés como los ya existentes ("Checkout", "Setup Node", "Install dependencies", "Run tests" — todos en inglés pese a que el resto del proyecto documenta en español; seguir esa misma convención en inglés para los nombres de step nuevos, p. ej. "Install Playwright browsers", "Run E2E tests").

---

### `app/app.vue` — árbol de componentes raíz

**Contenido completo actual** (25 líneas):
```vue
<template>
  <div>
    <div id="app-root" class="portrait:hidden">
      <NuxtPage />
    </div>

    <!--
      Guardia de orientación (UI-04): puramente CSS, sin JS.
      La visibilidad la decide solo la variante `portrait:` de Tailwind:
      `#app-root` se oculta en vertical, este overlay se muestra en su lugar.
      Nada se reorganiza porque la app entera queda oculta.
    -->
    <div
      id="orientation-guard"
      class="hidden portrait:flex bg-background text-primary-text fixed inset-0 flex-col items-center justify-center gap-md p-lg"
    >
      <h1 class="text-heading font-bold text-primary-text text-center">
        Girad la tablet
      </h1>
      <p class="text-body font-normal text-secondary-text text-center max-w-[400px]">
        Esta aplicación se usa en horizontal.
      </p>
    </div>
  </div>
</template>
```
No hay `app/layouts/`; `app.vue` es el único componente raíz compartido por TODAS las rutas (`/` y `/marvel-champions`). Es puramente markup — no tiene `<script setup>` propio hoy. Si `UpdateBanner.vue` se monta aquí (opción recomendada, ver arriba), haría falta añadir un `<script setup>` a este fichero (`const { $pwa } = useNuxtApp()`, o simplemente `<UpdateBanner />` sin lógica si toda la lógica vive dentro del propio componente, que es la forma "componente tonto" que ya siguen `VoiceUnavailableNotice`/`ContentChangedNotice`). Colocación sugerida: dentro de `#app-root`, antes de `<NuxtPage />`, para que la banda quede fija en la parte superior de cualquier pantalla sin que cada página tenga que montarla por separado.

---

### `vitest.config.ts` — patrones de test EXISTENTES que Playwright debe evitar colisionar

**Contenido completo actual:**
```typescript
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'engine',
          include: ['engine/**/*.test.ts'],
          environment: 'node',
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: 'app-logic',
          include: ['app/**/*.test.ts'],
          environment: 'node',
          passWithNoTests: true,
        },
        resolve: {
          alias: {
            '~~': fileURLToPath(new URL('./', import.meta.url)),
            '~': fileURLToPath(new URL('./app/', import.meta.url)),
          },
        },
      },
    ],
  },
})
```
**Globs Vitest activos hoy:** `engine/**/*.test.ts` y `app/**/*.test.ts`. Playwright (RESEARCH.md: `e2e/*.spec.ts`) usa el sufijo `.spec.ts` y vive fuera de `engine/` y `app/`, así que **no colisiona con ninguno de los dos globs** — no hace falta tocar `vitest.config.ts` para excluir nada. `playwright.config.ts` es un fichero de configuración hermano y separado (`testDir: './e2e'`), nunca una entrada dentro de `test.projects` de este fichero.

---

## Patrones compartidos

### Try/catch de APIs de navegador
**Fuente:** `app/composables/usePersistedSession.ts` líneas 85-92, `usePreloadedAudio.ts` líneas 65-71, `useVoiceAnnouncer.ts` líneas 103-110 (ver excerpts arriba).
**Aplicar a:** cualquier código de esta fase que toque `navigator.serviceWorker`, `$pwa.updateServiceWorker`, o cualquier API del navegador nueva. Bloque `catch` vacío de lógica, comentario citando la decisión (D-XX), sin logging ni error visible.

### Banda descartable, no modal, estado de sesión
**Fuente:** `app/composables/useVoiceAnnouncer.ts` líneas 391-395 (`noticeDismissed`/`showVoiceUnavailableNotice`) + `app/components/VoiceUnavailableNotice.vue` completo.
**Aplicar a:** `UpdateBanner.vue` (D-01/D-02/D-03 de la Fase 4). `ref` local sin persistir, `computed` que combina la condición real (`$pwa?.needRefresh?.value`) con el flag de descarte.

### Guardia SSR / cliente
**Fuente:** `usePreloadedAudio.ts` línea 103 (`if (typeof window === 'undefined') return`), `usePersistedSession.ts` líneas 77/87/98.
**Aplicar a:** cualquier lectura de `$pwa`/`navigator.serviceWorker` que pudiera ejecutarse durante el prerender de `nuxt generate` — usar `typeof window === 'undefined'`, NO `import.meta.client` (sin precedente en el repo) salvo que se necesite en un `<script setup>` de componente, donde `ClientOnly` (ya usado en `app/pages/[game]/index.vue` líneas 367/478) es la opción preferida a nivel de plantilla.

### Script Node de cero dependencias, versionado en `public/`
**Fuente:** `scripts/voice/generate.mjs` completo (292 líneas) — shebang, imports `node:*`, constantes de ruta, parseo de argv manual, progreso por `console.log` numerado, escritura con `writeFileSync`, wiring en `package.json` bajo `scripts`.
**Aplicar a:** `scripts/pwa/generate-icons.mjs` (D-06).

### CI: añadir un step a un job existente, no crear workflow
**Fuente:** `.github/workflows/ci.yml` completo (27 líneas, arriba).
**Aplicar a:** el paso de Playwright (D-09) — insertar steps nuevos tras `Run tests`, o un job Playwright separado en el mismo fichero.

## Sin analogía encontrada

| Fichero | Rol | Flujo de datos | Motivo |
|---|---|---|---|
| `e2e/pwa-install.spec.ts` | test | event-driven | Ninguna suite Playwright existe en el repo — usar los ejemplos de la documentación oficial de `@vite-pwa/nuxt`/Playwright citados en RESEARCH.md §Code Examples como base, y el estilo de nombres/aserciones de `usePreloadedAudio.test.ts` solo como referencia de tono (español, descripciones largas) |
| `e2e/offline-flow.spec.ts` | test | event-driven | Idem |
| `e2e/update-banner.spec.ts` | test | event-driven | Idem |
| `playwright.config.ts` | config | — | Ningún fichero de config de Playwright existe; `vitest.config.ts` sirve solo como referencia de "config de runner de test hermano al lado del código", no de forma concreta (API completamente distinta) |
| `scripts/pwa/generate-icons.mjs` (el trazado del símbolo geométrico en sí, no el andamiaje del script) | utility | file-I/O | RESEARCH.md Pattern 3 es explícito: el snippet de `zlib`/PNG es una prueba de concepto, no código de producción — no hay analog de "dibujar un triángulo en un buffer RGBA" en el repo, es lógica genuinamente nueva |

## Nota sobre artefactos de la Fase 03.1 a excluir del precacheo

`public/audio/_probe/` existe hoy con 4 clips (`estilo-monitor.m4a`, `estilo-pausado.m4a`, `estilo-plano-agil.m4a`, `estilo-plano.m4a`, ~432 KB en total) — artefactos de desarrollo de la elección de estilo de voz (plan 03.1-06 pendiente de limpieza). El `globPatterns` de Workbox en `nuxt.config.ts` debe ser explícito (`audio/setup*.m4a` o equivalente) y NO usar `audio/**` a secas, o arrastrará estos ficheros de prueba al precacheo de producción — exactamente el Anti-Pattern que RESEARCH.md ya señala. `public/voice-probe.html` (página de desarrollo para probar estilos, 3.2 KB) es otro artefacto de la 03.1 que conviene no precachear explícitamente si el `globPatterns` usa un patrón amplio tipo `**/*.{js,css,html}` — el planificador debe decidir si excluirlo con `globIgnores` o dejarlo (es inofensivo si queda cacheado, solo no forma parte del flujo real de la app).

## Metadatos

**Alcance de búsqueda de analogías:** `app/components/`, `app/composables/`, `app/composables/__tests__/`, `app/pages/`, `scripts/voice/`, `.github/workflows/`, raíz del repo (`nuxt.config.ts`, `vitest.config.ts`, `package.json`, `public/`).
**Ficheros escaneados:** ~25 (componentes, composables, tests, config, script de voz, workflow CI).
**Fecha de extracción de patrones:** 2026-08-31
