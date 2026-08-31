# Phase 4: Instalación y funcionamiento offline - Research

**Researched:** 2026-08-31
**Domain:** PWA (manifiesto de instalación, service worker/Workbox, flujo de actualización), pruebas de navegador con Playwright
**Confidence:** MEDIUM (alta en versiones y en las dos piezas verificadas por fuente primaria — el fix del bug de Nuxt 4 y la API zlib para iconos —, media en el resto por depender de una librería sin declaración explícita de soporte Nuxt 4)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Aviso de versión nueva (OFF-04)**
- **D-01:** La banda es descartable y no vuelve en toda la sesión. Una vez descartada, no reaparece hasta que se abra la app de nuevo. Motivo: coherencia con D-45 de la Fase 3 y con la banda de "sin voz española" — nada que atender a mitad de partida. Se acepta conscientemente que el grupo pueda terminar la tarde con una versión vieja.
- **D-02:** Pulsar "actualizar" aplica la actualización al momento, sin esperar al fin de ronda. La partida vive en `localStorage` y se reanuda en el mismo paso, así que recargar es seguro. Se descartó "aplicar al terminar la ronda".
- **D-03:** `registerType: 'prompt'`, nunca `'autoUpdate'`. Decisión heredada del documento de stack, no reabierta aquí.

**Precacheo (OFF-02, OFF-03)**
- **D-04:** Los 37 audios entran en el precacheo del service worker. Con una sola visita queda todo en local. Workbox versiona cada fichero por hash, así que un clip regenerado se actualiza solo en la siguiente versión. Coste aceptado: descarga en segundo plano la primera vez.
- **D-05:** La precarga de la Fase 03.1 (`usePreloadedAudio.ts`, D-09) se queda como segunda capa. Cubre la ventana de la primera visita, antes de que el service worker esté activo. **Las dos capas se solapan a propósito** — no es duplicación por descuido, y quien planifique no debe "simplificar" retirando una.

**Identidad instalada (OFF-01)**
- **D-06:** El icono se genera con la tipografía y los colores que la app ya usa — iniciales o un símbolo geométrico sobre fondo sólido, producido por código y versionado. Cero dependencias nuevas.
- **D-07:** El icono no puede llevar arte de Marvel Champions ni de Fantasy Flight Games.
- **D-08:** No se fuerza la orientación en el manifiesto. Que la app se vea peor en móvil es aceptable y esperado, no un defecto a corregir. No hay trabajo responsive en esta fase.

**Verificación (OFF-02, OFF-03)**
- **D-09:** Se añade Playwright con una suite pequeña: que el service worker se registra, que el flujo completo funciona con `setOffline(true)`, y que la banda de versión nueva aparece y no recarga sola. Se acepta la dependencia de desarrollo nueva y el coste en CI.
- **D-10:** OFF-03 se da por bueno con una prueba humana en la tablet real: empezar partida, activar modo avión a mitad, y terminarla incluida la voz. `setOffline` en un navegador de escritorio no es lo mismo que un Android/iOS perdiendo la wifi. Playwright complementa, no sustituye.

### Claude's Discretion
- Qué módulo PWA concreto y con qué configuración exacta (el stack apunta a `@vite-pwa/nuxt`, pero la versión y las opciones las fija la investigación).
- Estrategia de caché por tipo de recurso más allá de los audios.
- Cómo se genera el icono y en qué tamaños, mientras respete D-06 y D-07.
- Dónde vive la banda de actualización en el árbol de componentes y cómo se cablea con el registro del service worker.
- Estructura de la suite de Playwright y cómo se engancha a CI.

### Deferred Ideas (OUT OF SCOPE)
- `IndexOverlay` no se cierra con Escape — fuera de alcance aquí.
- El truco táctico de los Estados (descartar un Estado intentando una acción bloqueada sin objetivo válido) — candidato a un aviso propio futuro, no de esta fase.
- Modelo y versión de SO de la tablet de mesa: bloqueante abierto desde la Fase 1, no resuelto por esta investigación (ver Open Questions).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OFF-01 | El usuario puede instalar la app en la tablet y abrirla a pantalla completa, sin barra del navegador | Manifiesto (`@vite-pwa/nuxt` + `manifest.webmanifest`), meta tags iOS (`apple-mobile-web-app-capable`, `apple-touch-icon`), iconos generados sin dependencias (ver §Standard Stack, §Code Examples, §Pitfall "iOS ignora los iconos del manifiesto") |
| OFF-02 | Con la app ya visitada una vez, el flujo completo funciona sin conexión a internet | `strategies: 'generateSW'` + `workbox.globPatterns` cubriendo `_nuxt/**`, HTML prerenderizado, `audio/*.m4a`; pitfall de `_payload.json` con query params (ver §Common Pitfalls) |
| OFF-03 | Si se cae la conexión a mitad de partida, la app sigue funcionando sin interrupción | Precacheo total en el install del SW (no runtime caching bajo demanda); prueba Playwright `context.setOffline(true)` + prueba humana en tablet (D-10) |
| OFF-04 | Cuando hay una versión nueva publicada, la app avisa y espera la decisión del usuario; nunca se recarga sola a mitad de ronda | `registerType: 'prompt'`, API `$pwa.needRefresh` / `$pwa.updateServiceWorker(true)` (ver §Code Examples), patrón de banda descartable ya usado en `VoiceUnavailableNotice.vue` |
</phase_requirements>

## Summary

El bloqueante abierto en STATE.md ("`@vite-pwa/nuxt` compatibility with Nuxt 4.5.x is inferred, not directly confirmed") se puede cerrar con **confianza MEDIA-ALTA, no total**: el bug conocido y documentado de Nuxt 4 (el plugin buscaba los assets del manifiesto en `app/public` en vez de `public/`, issue [#204](https://github.com/vite-pwa/nuxt/issues/204)) se corrigió en la PR [#218](https://github.com/vite-pwa/nuxt/pull/218), mergeada el 2025-10-18 y publicada en la versión **1.0.7** ese mismo día — cuatro versiones y cuatro meses antes de la **1.1.1** (publicada 2026-02-06) que es la que hoy resuelve `npm view @vite-pwa/nuxt version`. El propio glob-pattern error de Nuxt 4 (issue [#176](https://github.com/vite-pwa/nuxt/issues/176)) también aparece cerrado. Lo que NO existe es una declaración oficial de "esto soporta Nuxt 4": la documentación del módulo (README, guía en vite-pwa-org.netlify.app) sigue hablando de "Nuxt 3" en 2026-08-31, y hay un issue abierto sin respuesta ([#222](https://github.com/vite-pwa/nuxt/issues/222), diciembre 2025, "Nuxt 4 friendly?"). La recomendación práctica: no tratar esto como un "sí" cerrado, sino como una **verificación de 10-15 minutos en Wave 0** — instalar el paquete, configuración mínima, `npm run generate`, comprobar que `.output/public/sw.js` y `manifest.webmanifest` existen y no están vacíos — antes de construir el resto de la fase encima.

El resto del trabajo de esta fase es configuración conocida y bien documentada de Workbox/`@vite-pwa/nuxt`: `registerType: 'prompt'` (ya decidido, D-03), `strategies: 'generateSW'` con `globPatterns` que alcancen `audio/*.m4a` (holgadamente por debajo del límite de 2 MiB por fichero de Workbox — el clip más grande de los 9 existentes pesa 47 KB), y la API `$pwa.needRefresh`/`$pwa.updateServiceWorker(true)` para la banda de actualización, que sigue el mismo patrón no-modal-descartable que `VoiceUnavailableNotice.vue` de la Fase 3. El icono se puede generar con **cero dependencias nuevas** usando `zlib.deflateSync` + `zlib.crc32` de Node (ambos verificados disponibles en el Node 22.17.1 de este entorno) para escribir un PNG a mano — evita `@vite-pwa/assets-generator` (que exige `sharp`, un binario nativo, y contradice D-06). El hallazgo más importante y menos obvio de esta investigación es que Nuxt, con `nuxt generate`, genera por defecto ficheros `_payload.json` para la navegación cliente entre rutas prerenderizadas, y el propio código fuente de `@vite-pwa/nuxt` documenta que Workbox en modo `generateSW` no resuelve esas peticiones si llevan query string estando offline — con una opción (`experimental.enableWorkboxPayloadQueryParams`) pensada exactamente para este caso. Es el candidato más probable a que "funciona todo offline salvo saltar entre el selector y la partida".

**Primary recommendation:** Instalar `@vite-pwa/nuxt@1.1.1` (que trae `vite-plugin-pwa@^1.2.0` y exige `workbox-window@^7.4.1`) con `strategies: 'generateSW'`, `registerType: 'prompt'`, `manifest.display: 'standalone'` (sin `orientation`), iconos PNG generados por un script Node de cero dependencias, y `globPatterns` incluyendo explícitamente `audio/setup*.m4a`/`audio/*.m4a` con exclusión de `audio/_probe/**`; verificar en Wave 0 tanto la compatibilidad real con Nuxt 4.5.x como el comportamiento offline de la navegación cliente entre `/` y `/marvel-champions`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Manifiesto de instalación e iconos | CDN / Static | Browser / Client | El manifiesto y los PNG son ficheros estáticos servidos desde `public/`; el navegador (Browser/Client) es quien los lee para decidir si ofrece "Instalar" / "Añadir a pantalla de inicio" |
| Precacheo y servido offline (service worker) | Browser / Client | CDN / Static | El service worker vive y se ejecuta en el navegador; intercepta peticiones que en condiciones normales irían al CDN/host estático (Vercel), sustituyéndolas por Cache Storage cuando no hay red |
| Cabeceras de caché (`/sw.js`, `/manifest.webmanifest`, `/audio/**`) | CDN / Static | — | Ya declaradas en `nitro.routeRules` (Nitro las traduce al preset del host); es responsabilidad exclusiva de la capa de despliegue, no del código cliente |
| Banda de "versión nueva" (OFF-04) | Browser / Client | — | Componente Vue tonto que lee el estado reactivo `$pwa.needRefresh` expuesto por el plugin cliente del módulo; mismo patrón que `VoiceUnavailableNotice.vue` |
| Precarga de audio (`usePreloadedAudio.ts`, D-05) | Browser / Client | — | Segunda capa deliberada, independiente del service worker, que ya existe y no se toca más allá de verificar que no colisiona |
| Suite de Playwright (D-09) | Testing (fuera de los tiers de producción) | — | No forma parte del árbol de ejecución de la app; corre contra un build estático servido localmente (`nuxi preview`), verificando el mismo comportamiento Browser/Client desde fuera |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `@vite-pwa/nuxt` | **1.1.1** `[VERIFIED: npm registry]` — publicado 2026-02-06, confirmado con `npm view @vite-pwa/nuxt version` | Módulo Nuxt que envuelve `vite-plugin-pwa`: genera el manifiesto, el service worker (Workbox) y expone `$pwa` en el cliente | Es el módulo que ya apunta CLAUDE.md/el documento de stack; sigue siendo el único módulo PWA "zero-config" de primera línea para Nuxt (listado oficial en nuxt.com/modules). No reabrir esta elección — solo fijar versión y config |
| `vite-plugin-pwa` | **1.3.0** (dependencia transitiva de `@vite-pwa/nuxt`, que fija `^1.2.0`) `[VERIFIED: npm registry]` | Motor real de generación del service worker vía Workbox | Se instala solo por ser dependencia de `@vite-pwa/nuxt`; no añadir como dependencia directa |
| `workbox-window` | **7.4.1** (peer dependency exigida por `vite-plugin-pwa`: `^7.4.1`) `[VERIFIED: npm registry]` | Cliente ligero que el plugin del módulo usa para registrar/observar el service worker desde el navegador | Peer obligatoria, no opcional — `npm install` la resuelve sola porque ya está en el árbol de `vite-plugin-pwa` |
| `@playwright/test` | **1.62.1** `[VERIFIED: npm registry]`, publicado por Microsoft, 58.3M descargas/semana | Runner de pruebas de navegador para D-09 (registro del SW, `setOffline`, banda de actualización) | Estándar de facto para pruebas end-to-end de PWA en 2026; soporta `context.setOffline` y contextos de Chromium/WebKit reales |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Ninguna adicional | — | — | D-06 exige "cero dependencias nuevas" para el icono; Node ya trae `zlib.deflateSync` + `zlib.crc32` (confirmado disponible en Node 22.17.1 vía `node -e "console.log(typeof require('zlib').crc32)"` → `function`), suficiente para escribir un PNG plano a mano sin `sharp`/`canvas`/`@vite-pwa/assets-generator` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Icono generado a mano con `zlib` | `@vite-pwa/assets-generator` (peer dep declarada por `@vite-pwa/nuxt`: `^1.0.0`) | Automatiza tamaños/maskable/inyección de `<link>`, pero exige `sharp` (binario nativo, instalación pesada) y contradice D-06 ("cero dependencias nuevas"). Descartado por decisión explícita del usuario, no por investigación |
| Icono PNG puro | Icono SVG referenciado en el manifiesto | Chrome acepta SVG en `icons[].type: image/svg+xml`, pero iOS Safari **ignora los iconos del manifiesto por completo** (lee `apple-touch-icon`, que debe ser PNG) — usar SVG no resolvería nada en un dispositivo iOS y añadiría una segunda ruta de generación. No usar SVG aquí |
| `strategies: 'generateSW'` | `strategies: 'injectManifest'` | `injectManifest` da control total sobre el service worker (necesario para lógica custom, p. ej. notificaciones push) pero exige mantener un fichero `sw.ts` a mano; nada en esta fase necesita esa lógica custom — usar `generateSW` (el modo zero-config) |
| `npx nuxi preview` para servir el build en Playwright | `npx serve .output/public` | `serve` es lo que documentan los ejemplos genéricos de Nuxt, pero añadiría una dependencia nueva solo para esto; `nuxi preview` ya viene con `nuxt` (confirmado en la documentación oficial de despliegue) y sirve el mismo `.output/public` sin instalar nada más |

**Installation:**
```bash
npm install @vite-pwa/nuxt
npm install -D @playwright/test
npx playwright install chromium
```

**Version verification:** confirmado en este entorno el 2026-08-31 vía `npm view <pkg> version`:
- `@vite-pwa/nuxt` → 1.1.1 (publicado 2026-02-06)
- `vite-plugin-pwa` → 1.3.0
- `workbox-window` → 7.4.1
- `@playwright/test` → 1.62.1

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|--------------|-----------|-------------|
| `@vite-pwa/nuxt` | npm | ~3.5 años (creado 2023-01-27, última publicación 2026-02-06) | 156,881/semana | github.com/vite-pwa/nuxt | [OK] | Approved |
| `@playwright/test` | npm | ~6 años (creado 2020-09-24) | 58,362,881/semana | github.com/microsoft/playwright | [OK] | Approved |

Verificado con `slopcheck install @vite-pwa/nuxt @playwright/test` (paquete `slopcheck` 0.6.1 instalado vía `pip3`) → `2 OK`. Nota de proceso: este comando ejecuta un `npm install` real; se revirtió inmediatamente con `git checkout -- package.json package-lock.json` tras la comprobación, dejando el repo sin cambios — la instalación real le corresponde al plan de ejecución, no a esta investigación.

**Verificación adicional de postinstall (paquetes Node.js):**
```bash
npm view @vite-pwa/nuxt scripts.postinstall   # (vacío)
npm view @playwright/test scripts.postinstall # (vacío en el propio metadata de npm view;
                                               # @playwright/test SÍ recomienda `npx playwright install`
                                               # como paso MANUAL post-instalación — no es un script
                                               # automático que se dispare solo, es documentación del
                                               # propio paquete. Sin binarios de navegador cacheados en
                                               # este entorno — ver §Environment Availability.)
```

**Packages removed due to slopcheck [SLOP] verdict:** ninguno.
**Packages flagged as suspicious [SUS]:** ninguno.

## Architecture Patterns

### System Architecture Diagram

```
Primera visita (con red)                    Visitas siguientes (con o sin red)
──────────────────────────                  ───────────────────────────────────
Tablet abre la URL                          Tablet abre la URL / icono instalado
        │                                            │
        ▼                                            ▼
  HTML prerenderizado                      Browser pide '/' o '/marvel-champions'
  (nuxt generate, 2 rutas)                           │
        │                                            ▼
        ├──▶ registra Service Worker         Service Worker (Workbox, activo)
        │      (workbox-window vía              intercepta TODAS las peticiones
        │       $pwa, registerType:                    │
        │       'prompt')                    ┌─────────┴─────────┐
        │                                     │                   │
        ├──▶ usePreloadedAudio.prefetchAll    ¿en Cache Storage    ¿sin red?
        │      (D-05, capa independiente,      del precache SW?         │
        │       fetch + Cache Storage propia,          │                ▼
        │       'voice-audio-v1')              sí ──▶ responde     responde igual
        │                                      desde caché, no     desde caché —
        ▼                                      toca la red         100% offline
  Wake Lock + primer paso                              │           (OFF-02/OFF-03)
                                                        ▼
                                              usePreloadedAudio /
                                              useVoiceAnnouncer leen
                                              igual que siempre —
                                              no saben si el SW
                                              sirvió el .m4a o fue
                                              a red (D-05: capas
                                              independientes)

Publicación de una versión nueva
─────────────────────────────────
Deploy a Vercel → nuevo build.js + nuevo /sw.js (hash distinto)
        │
        ▼
Tablet con la app abierta comprueba /sw.js (routeRule: no-cache, así que SIEMPRE
pide la red para este fichero) → detecta que hay un SW nuevo "waiting"
        │
        ▼
$pwa.needRefresh.value = true  ──▶  <UpdateBanner> aparece (no modal, descartable)
        │                                   │
        │                          usuario descarta ──▶ noticeDismissed = true,
        │                                                no vuelve hasta reabrir
        │                                                la app (D-01)
        ▼
usuario pulsa "Actualizar"
        │
        ▼
$pwa.updateServiceWorker(true)  ──▶  skipWaiting + clients.claim + reload
                                      inmediato (D-02: seguro porque la partida
                                      vive en localStorage y se reanuda igual)
```

### Recommended Project Structure

```
nuxt.config.ts              # añade modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'] y bloque `pwa: {...}`
scripts/
└── pwa/
    └── generate-icons.mjs  # script Node de cero dependencias (zlib) — genera public/icons/*.png
public/
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   └── apple-touch-icon.png   # 180×180, sin canal alfa (iOS lo prefiere opaco)
├── audio/                     # SIN TOCAR — ya existe, 03.1 lo puebla
└── ...
app/
└── components/
    └── UpdateBanner.vue    # mismo patrón que VoiceUnavailableNotice.vue: sin props,
                             # emits('dismiss'|'update'), texto fijo, sin lógica de SW dentro
e2e/                         # Playwright vive AQUÍ, separado de app/**/__tests__ y engine/__tests__
├── pwa-install.spec.ts
├── offline-flow.spec.ts
└── update-banner.spec.ts
playwright.config.ts         # testDir: './e2e' — vitest.config.ts NO necesita tocarse si
                              # Playwright vive fuera de las rutas `include` ya declaradas
                              # (engine/**/*.test.ts, app/**/*.test.ts)
```

### Pattern 1: Configuración mínima de `@vite-pwa/nuxt` para este proyecto

**What:** Bloque `pwa` en `nuxt.config.ts` con `generateSW`, manifiesto sin orientación forzada, y el precacheo de audio explícito.
**When to use:** Siempre — es la única configuración que necesita esta fase (no hay push notifications ni lógica custom que justifique `injectManifest`).
**Example:**
```typescript
// Source: https://vite-pwa-org.netlify.app/frameworks/nuxt.html (WebFetch, 2026-08-31)
//         + tipos leídos directamente de node_modules/@vite-pwa/nuxt (fuente oficial del paquete)
export default defineNuxtConfig({
  modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'prompt', // D-03 — NUNCA 'autoUpdate'
    strategies: 'generateSW',
    manifest: {
      name: 'TableGameAssistant',
      short_name: 'TableGame',
      display: 'standalone', // D-08: sin `orientation`, no forzar nada
      background_color: '#14161C', // --color-background del tema
      theme_color: '#14161C',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Los 37 clips (D-04) — patrón explícito, NO 'audio/**/*' a secas, para no
      // arrastrar public/audio/_probe/ (artefacto de la 03.1 pendiente de limpieza
      // en el plan 03.1-06, que puede seguir sin ejecutarse cuando esta fase corra).
      globPatterns: ['**/*.{js,css,html}', 'icons/*.png', 'manifest.webmanifest', 'audio/setup*.m4a'],
      // Ver §Common Pitfalls — verificar en Wave 0 si hace falta esta línea:
      // navigateFallback no se declara: cada una de las 2 rutas prerenderizadas
      // ya tiene su propio HTML real precacheado, no un único shell de SPA.
    },
    devOptions: {
      enabled: true, // permite probar el SW en `nuxt dev` sin tener que generar cada vez
      type: 'module',
    },
    client: {
      registerPlugin: true, // default — expone $pwa
    },
  },
})
```

### Pattern 2: Banda de actualización con `$pwa`

**What:** Componente de banda descartable que se cablea al estado reactivo del módulo.
**When to use:** OFF-04 completo (D-01, D-02, D-03).
**Example:**
```vue
<!-- Source: https://vite-pwa-org.netlify.app/frameworks/nuxt.html (WebFetch, 2026-08-31) —
     nombres de propiedad ($pwa.needRefresh, $pwa.updateServiceWorker) confirmados por la
     documentación oficial del módulo; forma del componente calcada de
     app/components/VoiceUnavailableNotice.vue (patrón ya verificado en producción) -->
<script setup lang="ts">
const { $pwa } = useNuxtApp()
const dismissed = ref(false) // D-01: estado de SESIÓN, nunca persistido — igual que noticeDismissed
// de useVoiceAnnouncer.ts (D-50)
const showBanner = computed(() => ($pwa?.needRefresh?.value ?? false) && !dismissed.value)

function update(): void {
  $pwa?.updateServiceWorker(true) // D-02: aplica y recarga al momento
}
function dismiss(): void {
  dismissed.value = true // D-01: no vuelve hasta reabrir la app
}
</script>
```

### Pattern 3: Generación de PNG sin dependencias

**What:** Escribir manualmente los chunks IHDR/IDAT/IEND de un PNG usando solo `node:zlib`.
**When to use:** D-06 — icono generado por código, cero dependencias nuevas.
**Example:**
```javascript
// Source: node:zlib API oficial (nodejs.org/api/zlib.html) — zlib.crc32() y
// zlib.deflateSync() confirmados disponibles ejecutando
// `node -e "console.log(typeof require('zlib').crc32)"` → 'function' en este
// entorno (Node v22.17.1), 2026-08-31.
import { deflateSync, crc32 } from 'node:zlib'

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput) >>> 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function writePng(width, height, rgbaPixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(6, 9) // color type 6 = RGBA
  // filter byte (0) por cada fila + los píxeles RGBA de esa fila
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    raw[rowStart] = 0 // sin filtro
    rgbaPixels[y].copy(raw, rowStart + 1)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
```
**Nota:** este snippet es una prueba de concepto para orientar al planificador, no código listo para producción — falta el trazado del símbolo geométrico en sí (p. ej. un triángulo "▶" blanco centrado sobre fondo `--color-accent`, con el padding de seguridad del 10-15% para la variante maskable). El planificador debe convertir esto en una tarea de implementación real con sus propios tests.

### Anti-Patterns to Avoid

- **`registerType: 'autoUpdate'`:** descartado explícitamente en CLAUDE.md y D-03 — recarga todas las pestañas abiertas en cuanto detecta build nuevo, exactamente lo que OFF-04 prohíbe.
- **`globPatterns: ['audio/**']` sin exclusión:** arrastraría `public/audio/_probe/*.m4a` (artefactos de prueba de estilo de voz de la 03.1, pendientes de limpieza en el plan 03.1-06 que hoy sigue sin ejecutar) al precacheo de producción — ficheros que no pertenecen ahí y que confunden cualquier auditoría de "¿cuántos audios se precachean?".
- **Confiar en `nuxi preview` para verificar cabeceras HTTP de producción:** el servidor estático de `nuxi preview` no aplica las reglas del preset de despliegue (`NITRO_PRESET=vercel`); las cabeceras `no-cache` de `/sw.js` y `/manifest.webmanifest` solo se pueden verificar de verdad inspeccionando `.vercel/output/config.json` tras un build con ese preset, o contra el despliegue real — no contra una petición Playwright a `localhost` servido por `nuxi preview`. Ver Pitfall correspondiente.
- **Añadir `@vite-pwa/assets-generator` "para que sea más fácil":** requiere `sharp` (dependencia nativa) y contradice D-06 explícitamente. No es una simplificación válida aquí.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Generación del service worker y el precache manifest | Un `sw.js` manual con `self.addEventListener('install', ...)` | `@vite-pwa/nuxt` con `strategies: 'generateSW'` | Workbox resuelve versionado por hash, `skipWaiting`/`clientsClaim` coordinados con `registerType`, y el propio módulo ya sabe leer la salida de `nuxt generate` (tras el fix de #204/#218) — reimplementarlo a mano reintroduce exactamente los bugs que Workbox ya tiene resueltos desde hace años |
| Detección de "hay versión nueva" | Un `setInterval` haciendo `fetch('/version.json')` a mano | `workbox-window` vía `$pwa.needRefresh` (ya integrado en el módulo) | `workbox-window` ya escucha el evento nativo `updatefound`/`statechange` del `ServiceWorkerRegistration`; un polling manual duplicaría lógica ya resuelta y podría desincronizarse del ciclo de vida real del SW |
| Icono con texto/tipografía renderizada por código | Rasterizar una fuente TTF a mano (parseo de glifos) | Un símbolo geométrico simple (D-06 ya lo permite: "iniciales O un símbolo geométrico") | Parsear/rasterizar fuentes sin dependencias es un problema mucho más grande que dibujar formas geométricas simples con relleno de píxeles — la propia decisión D-06 evita este problema al permitir la alternativa geométrica |

**Key insight:** el patrón general de esta fase es "configurar una librería madura correctamente", no "escribir infraestructura nueva" — el único código genuinamente nuevo no cubierto por una librería es el generador de iconos (por la restricción D-06 de cero dependencias) y el componente de banda (que es una copia de un patrón ya existente en el repo).

## Common Pitfalls

### Pitfall 1: `_payload.json` con query string no se resuelve offline en modo `generateSW`

**What goes wrong:** navegar del selector (`/`) a la partida (`/marvel-champions`) — o viceversa — mientras no hay red puede fallar o quedarse en blanco, aunque ambas páginas SÍ estén precacheadas como HTML.
**Why it happens:** `nuxt generate` tiene `experimental.payloadExtraction` en `true` por defecto para SSG (confirmado, WebSearch sobre la documentación oficial de Nuxt 4), lo que genera un `_payload.json` por ruta que Nuxt pide al navegar del lado del cliente. El propio código fuente de `@vite-pwa/nuxt` (leído directamente de `src/types.ts` en el tag `v1.1.1`, `[CITED: github.com/vite-pwa/nuxt]`) documenta este problema explícitamente: *"Nuxt SSG will generate a payload.json file and will fetch it with a query parameter. The service worker cannot resolve the payload.json request with query parameters, and you won't get the payload when offline."* y ofrece `experimental.enableWorkboxPayloadQueryParams: true` como arreglo para `generateSW`.
**How to avoid:** activar `pwa.experimental.enableWorkboxPayloadQueryParams: true` si la prueba de navegación offline entre rutas falla; si no hace falta (porque este proyecto solo tiene 2 rutas y casi toda la navegación real es DENTRO de `/marvel-champions` vía estado de Vue, no cambios de URL), documentarlo como decisión consciente de no activarlo.
**Warning signs:** la prueba Playwright de "flujo completo offline" (D-09) o la prueba humana (D-10) fallan específicamente al saltar entre el selector y la pantalla de juego, pero no dentro de la pantalla de juego misma.

### Pitfall 2: iOS Safari ignora los iconos del manifiesto

**What goes wrong:** el icono de instalación sale genérico/en blanco en un iPad aunque el `manifest.webmanifest` tenga `icons` bien declarados.
**Why it happens:** iOS Safari, al añadir a pantalla de inicio, lee `<link rel="apple-touch-icon">`, no el array `icons` del Web App Manifest `[MEDIUM confidence — WebSearch, consistente entre varias fuentes]`.
**How to avoid:** declarar explícitamente `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` (180×180, PNG opaco, sin canal alfa recomendado) en `app.head.link` de `nuxt.config.ts` — el módulo NO lo añade automáticamente sin `@vite-pwa/assets-generator`, que D-06 descarta.
**Warning signs:** instalar en un iPad real (parte de la prueba humana D-10, y del bloqueante de "modelo de tablet desconocido") y comprobar el icono en la pantalla de inicio, no solo en el escritorio/Android.

### Pitfall 3: `@vite-pwa/nuxt` sin declaración oficial de soporte Nuxt 4

**What goes wrong:** un fallo de build o de resolución de rutas que parezca un bug del proyecto puede en realidad ser una interacción no probada oficialmente entre el módulo y la estructura de carpetas `app/` de Nuxt 4.
**Why it happens:** la documentación del módulo (README, guía oficial) sigue redactada en términos de "Nuxt 3" a fecha 2026-08-31; el bug de directorio (`app/public` vs `public/`) que SÍ afectaba a Nuxt 4 está confirmado arreglado (PR #218, versión 1.0.7, 2025-10-18), pero un issue posterior preguntando "¿esto es compatible con Nuxt 4?" (#222, diciembre 2025) sigue sin respuesta de mantenedores `[MEDIUM confidence]`.
**How to avoid:** la verificación de Wave 0 descrita en el Summary — no asumir que "no hay incompatibilidades conocidas" equivale a "está probado y confirmado".
**Warning signs:** errores de resolución de rutas de assets, warnings de glob patterns sin coincidencias durante `nuxt generate`, o un `manifest.webmanifest`/`sw.js` vacíos o ausentes en `.output/public/` tras el build.

### Pitfall 4: el watchdog de audio y el service worker no deberían interactuar, pero conviene confirmarlo

**What goes wrong (hipotético, a vigilar, no un bug conocido):** el bug ya resuelto `audio-corta-y-reinicia` (ver `.planning/debug/resolved/audio-corta-y-reinicia.md`) demostró que el camino de audio pregenerado es sensible a temporización fina (el evento `playing` de `<audio>` puede no reflejar a tiempo que el clip realmente suena). Interceptar `/audio/*.m4a` con un service worker añade una capa más entre el `fetch`/`<audio src>` y la respuesta.
**Why it happens:** una vez el SW está activo, TODAS las peticiones a `/audio/*.m4a` — incluidas las que hace `usePreloadedAudio.ts` con `fetch()` normal — pasan primero por el `fetch` handler del SW. Si el SW sirve desde su propio Cache Storage (el precache de Workbox, `workbox-precache-v2-...`, un cache DISTINTO del `voice-audio-v1` que usa `usePreloadedAudio.ts`), la latencia de esa respuesta cambia (normalmente MÁS rápida, no más lenta) respecto a antes de que existiera el SW.
**How to avoid:** no tocar `useVoiceAnnouncer.ts` ni `usePreloadedAudio.ts` (fuera de alcance explícito de esta fase, per CONTEXT.md); simplemente incluir en la prueba humana bloqueante (D-10) el mismo guion de reproducción del bug ya resuelto (avanzar por los pasos con clip real) para confirmar que el SW activo no lo reintroduce.
**Warning signs:** el síntoma sería idéntico al bug ya documentado ("suena ~1s, se corta, reinicia con otra voz") apareciendo de nuevo SOLO después de instalar el módulo PWA.

## Code Examples

### Detectar y aplicar una actualización (patrón `$pwa`)
```typescript
// Source: https://vite-pwa-org.netlify.app/frameworks/nuxt.html (WebFetch, 2026-08-31)
const { $pwa } = useNuxtApp()
watch(() => $pwa?.needRefresh?.value, (needsRefresh) => {
  if (needsRefresh) {
    // mostrar banda — NUNCA llamar aquí a updateServiceWorker automáticamente (D-01/D-03)
  }
})
```

### Generación mínima de manifiesto sin `orientation` (D-08)
```typescript
// Source: config propia derivada de https://vite-pwa-org.netlify.app/frameworks/nuxt.html
manifest: {
  name: 'TableGameAssistant',
  short_name: 'TableGame',
  display: 'standalone',
  // NO declarar `orientation` — D-08, decisión explícita del usuario
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Módulo `@nuxtjs/pwa` (Nuxt 2/PWA module histórico) | `@vite-pwa/nuxt` sobre `vite-plugin-pwa`/Workbox | Con la migración de Nuxt a Vite (Nuxt 3+) | El módulo antiguo está discontinuado; toda la documentación y el ecosistema actual de PWA + Nuxt gira en torno a `@vite-pwa/nuxt` |
| `registerType: 'autoUpdate'` como default recomendado en tutoriales antiguos | `registerType: 'prompt'` con banda de decisión del usuario | Práctica extendida tras reportes de recargas sorpresa en producción (discusiones en GitHub del propio proyecto vite-plugin-pwa) | Ya reflejado en CLAUDE.md/D-03 — no es un cambio a introducir, es la base de la que parte esta fase |

**Deprecated/outdated:** ninguna funcionalidad usada en esta fase está marcada como deprecada en las versiones investigadas (1.1.1 / 1.3.0 / 7.4.1 / 1.62.1, todas activamente mantenidas y publicadas en los últimos 7 meses).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `@vite-pwa/nuxt@1.1.1` funciona sin fricción con Nuxt 4.5.2 + `nuxt generate` + preset `vercel` | Summary, Pattern 1, Pitfall 3 | Si falla, toda la fase se retrasa hasta encontrar workaround o versión alternativa; mitigado por la verificación de Wave 0 ya recomendada |
| A2 | `experimental.payloadExtraction` sigue en `true` por defecto para este proyecto concreto (no hay override en `nuxt.config.ts` actual, confirmado por grep) y por tanto el Pitfall 1 (`_payload.json` offline) es aplicable | Common Pitfalls #1 | Si el proyecto no genera `_payload.json` en la práctica, la mitigación (`enableWorkboxPayloadQueryParams`) sería trabajo innecesario; bajo riesgo, se descubre en la primera prueba offline |
| A3 | El símbolo geométrico recomendado (triángulo "▶" u otro trazo simple) es suficiente para D-06 sin necesitar rasterizar texto | Pattern 3, Don't Hand-Roll | Bajo riesgo — D-06 permite explícitamente esta alternativa; si el usuario prefiere iniciales con tipografía real, haría falta un enfoque distinto (posible checkpoint de discusión) |
| A4 | `nuxi preview` sirve correctamente `/sw.js` con el content-type correcto para que Playwright pueda registrar el SW en pruebas locales | Anti-Patterns, Environment Availability | Si `nuxi preview` no sirve bien los ficheros del SW en modo estático, la suite de Playwright necesitaría un servidor estático alternativo (`serve`, nueva dependencia) — bajo riesgo, fácil de detectar en la primera ejecución de la suite |
| A5 | El tamaño total de los 37 audios rondará ~1-1.3 MB (extrapolado de los 9 ficheros reales existentes, que pesan 306 KB en total, ~34 KB de media) en vez de los "~650 KB" estimados en CONTEXT.md D-04 | Summary (implícito), no bloqueante | Ninguno — ambas cifras están muy por debajo de cualquier límite relevante (2 MiB por fichero); es una discrepancia de estimación, no un riesgo técnico |

**Ningún ítem de esta tabla bloquea empezar a planificar** — todos son verificables con una prueba barata en Wave 0 o durante la ejecución normal de la fase.

## Open Questions (RESOLVED)

> Las tres preguntas quedan cerradas por mecanismos verificables dentro de los
> planes de la fase, no al aire. El plan que cierra cada una se indica debajo.

1. **¿`@vite-pwa/nuxt@1.1.1` compila limpio con Nuxt 4.5.2 + preset `vercel`?**
   - What we know: el bug de directorio de Nuxt 4 (#204) está arreglado desde la 1.0.7 (2025-10-18); no hay issues abiertos de build roto contra Nuxt 4.5.x específicamente.
   - What's unclear: no existe una declaración oficial de "Nuxt 4 soportado"; el issue #222 preguntando esto sigue sin respuesta.
   - **RESOLVED por `04-01` Task 1** (spike de ola 0): instala, configura al mínimo, corre `npm run generate` y comprueba que `.output/public/sw.js` y `.output/public/manifest.webmanifest` no están vacíos, con camino de fallo explícito de 4 pasos que revierte los cambios y devuelve `## BLOCKED` si la asunción A1 resulta falsa.

2. **Modelo y SO de la tablet de mesa — bloqueante heredado, no resuelto aquí.**
   - What we know: es la misma incógnita abierta desde la Fase 1 y arrastrada por las Fases 3/03.1; el móvil Android usado para depurar el audio comparte SO con la tablet, pero no está confirmado que comparta versión de navegador/OS.
   - What's unclear: si es iPadOS o Android, y qué versión — determina si el Pitfall 2 (iconos iOS) y el comportamiento de `context.setOffline` en modo avión real aplican tal cual.
   - **RESOLVED por `04-06` Task 2** (diferida a propósito al checkpoint humano): no bloquea planificar ni ejecutar el resto de la fase, porque el código cubre ambos casos; el plan obliga a registrar en el SUMMARY el modelo y SO reales del dispositivo usado, cerrando por fin el bloqueante heredado de la Fase 1.

3. **¿Hace falta `experimental.enableWorkboxPayloadQueryParams: true` en este proyecto concreto?**
   - What we know: el mecanismo y el riesgo están documentados por la fuente oficial del módulo (ver Pitfall 1).
   - What's unclear: si el patrón de navegación real de esta app (mayormente `navigateTo()` dentro de una sola pantalla dinámica `[game]/index.vue`, con solo 2 rutas prerenderizadas) llega a disparar el escenario problemático en la práctica.
   - **RESOLVED por `04-04` Task 2** (empíricamente, no por conjetura): la opción queda DESACTIVADA por defecto y solo se activa si la spec de navegación offline de `04-03` la revela necesaria; la decisión tomada se documenta en el plan con su evidencia.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Todo el proyecto, generación de iconos con `zlib` | ✓ | v22.17.1 | — |
| Node.js (versión mínima declarada por Nuxt 4.5.2) | `nuxt`/`@nuxt/vite-builder`/`@nuxt/nitro-server` — `engines.node: "^22.19.0 \|\| ^24.11.0 \|\| >=26.0.0"` | ✗ (parcial) | requerido ≥22.19.0, instalado 22.17.1 | `npm` avisa (`EBADENGINE`) pero no bloquea la instalación ni la ejecución local hoy; preexistente al alcance de esta fase, no introducido por el módulo PWA — documentar, no resolver aquí |
| npm | Instalación de paquetes | ✓ | 11.12.1 | — |
| Navegadores de Playwright (Chromium) | Suite Playwright (D-09) | ✗ | — (`~/Library/Caches/ms-playwright` no existe en este entorno) | `npx playwright install chromium` como paso explícito, tanto en desarrollo como en `.github/workflows/ci.yml` |
| `.github/workflows/ci.yml` | Wiring de la suite Playwright a CI (D-09) | ✓ (el fichero SÍ existe — contradice la premisa "no existe todavía" del brief de investigación) | corre solo `npm run test` (Vitest) hoy, en `ubuntu-latest`/Node 22, sin paso de Playwright | Añadir un job o step nuevo: `npx playwright install --with-deps chromium` + `npx playwright test`, después de `npm run generate` para tener un `.output/public` real que servir |
| Vercel CLI | No requerida — el despliegue es vía git push, per CLAUDE.md | ✗ | — | No aplica ningún fallback: el flujo de despliegue no pasa por esta máquina |

**Missing dependencies with no fallback:** ninguna — todas tienen un paso de instalación explícito y barato (`npx playwright install chromium`).

**Missing dependencies with fallback:** el desajuste de versión de Node (22.17.1 vs el floor `^22.19.0` que declara `nuxt@4.5.2`) es preexistente al alcance de esta fase — no bloquea `npm run generate` ni `npm run test` hoy (son solo `npm warn EBADENGINE`), pero conviene que quien ejecute el plan actualice el Node local antes de depurar cualquier fallo raro de build, para descartarlo como causa.

**Corrección de premisa del brief de investigación:** el fichero `.github/workflows/ci.yml` **ya existe** (410 bytes, corre `npm run test` en `ubuntu-latest` con Node 22). No hace falta crear el workflow desde cero — la tarea real es añadirle el paso de Playwright (instalación de navegadores + `npx playwright test`), probablemente después de un `npm run generate` para tener un build real que servir con `nuxi preview`.

## Security Domain

> `security_enforcement` no aparece en `.planning/config.json` → se trata como activado por defecto, pero esta fase no introduce superficie de autenticación, sesión ni backend — el análisis ASVS es mayormente "no aplica" por diseño del proyecto (sin backend, sin credenciales, contenido estático).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | No hay usuarios ni login — fuera del modelo del proyecto (`CLAUDE.md`: "sin backend") |
| V3 Session Management | No | El único "estado de sesión" es `localStorage` local al dispositivo, ya cubierto por decisiones de Fases 1-3 |
| V4 Access Control | No | Contenido público, sin roles ni permisos |
| V5 Input Validation | No (no hay entrada de usuario nueva en esta fase) | El contenido validado por Zod ya existe de fases anteriores; esta fase no añade formularios ni parsers nuevos |
| V6 Cryptography | No | Nada que cifrar; el service worker no maneja secretos |
| V14 Configuration (aplica parcialmente) | Sí | Cabeceras de seguridad/caché ya declaradas en `nitro.routeRules`; el service worker añade una superficie nueva a vigilar: un `globPatterns` demasiado amplio podría precachear ficheros no destinados a distribución pública (ninguno detectado en este repo — `public/` solo contiene assets ya públicos) |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Service worker "envenenado" sirviendo contenido obsoleto o manipulado indefinidamente (el "stale service worker trap" que CLAUDE.md ya nombra) | Tampering / Denial of Service (percibido) | `registerType: 'prompt'` + cabecera `no-cache` en `/sw.js` (ya declarada) garantizan que el navegador siempre re-consulta si hay un SW nuevo, aunque la aplicación real de la actualización quede en manos del usuario (D-01/D-02) |
| Precacheo accidental de ficheros de desarrollo/depuración (`public/voice-probe.html`, `public/audio/_probe/**`) quedando servidos "para siempre" vía Cache Storage aunque se borren del repo | Information Disclosure (menor — contenido no sensible, pero sí confuso/no destinado a producción) | `globPatterns` explícito (no un `**/*` genérico) que excluya rutas de depuración — ver Pattern 1 y Anti-Patterns |

## Sources

### Primary (HIGH confidence)
- `npm view @vite-pwa/nuxt version / time / dependencies / --json` — versión 1.1.1, fecha de publicación 2026-02-06, dependencia `@nuxt/kit: ^3.9.0`, `vite-plugin-pwa: ^1.2.0` — ejecutado 2026-08-31.
- `npm view vite-plugin-pwa --json`, `npm view workbox-window version`, `npm view @playwright/test version` — 1.3.0 / 7.4.1 / 1.62.1 — ejecutado 2026-08-31.
- `curl https://raw.githubusercontent.com/vite-pwa/nuxt/v1.1.1/src/types.ts` — código fuente oficial del paquete en su tag de versión exacto: confirma `registerWebManifestInRouteRules`, `experimental.enableWorkboxPayloadQueryParams` y su docstring completo sobre el problema de `_payload.json`.
- `node -e "console.log(typeof require('zlib').crc32)"` → `function` — confirmado en este entorno (Node v22.17.1) que `zlib.crc32` está disponible sin dependencias.
- `slopcheck install @vite-pwa/nuxt @playwright/test` (slopcheck 0.6.1) → `2 OK`.
- `api.npmjs.org/downloads/point/last-week/<pkg>` — cifras de descargas semanales de los 4 paquetes relevantes, ejecutado 2026-08-31.
- Lectura directa de `nuxt.config.ts`, `package.json`, `app/composables/usePreloadedAudio.ts`, `app/composables/useVoiceAnnouncer.ts`, `.planning/debug/resolved/audio-corta-y-reinicia.md`, `.github/workflows/ci.yml`, `public/` (listado real de ficheros) — todos leídos en este repo el 2026-08-31.

### Secondary (MEDIUM confidence)
- https://vite-pwa-org.netlify.app/frameworks/nuxt.html (WebFetch, 2026-08-31) — forma de configuración, propiedades `$pwa` (`needRefresh`, `offlineReady`, `updateServiceWorker`, `swActivated`), confirma que la doc sigue orientada a "Nuxt 3".
- https://github.com/vite-pwa/nuxt/issues/204, /pull/218, /issues/176, /issues/222 (WebFetch, 2026-08-31) — historial del bug de directorio Nuxt 4, su fix (versión 1.0.7, 2025-10-18), y la pregunta sin responder sobre soporte oficial de Nuxt 4.
- https://github.com/vite-pwa/nuxt/releases (WebFetch, 2026-08-31) — changelog de 1.0.6 → 1.1.1, sin menciones explícitas de Nuxt 4.
- Nuxt docs oficiales (WebSearch, resumen) — `experimental.payloadExtraction` por defecto `true` para `nuxt generate` (salvo `ssr:false`), comportamiento de `_payload.json` en navegación cliente.
- WebSearch sobre iconos PWA/iOS (múltiples fuentes de blog 2026, consistentes entre sí) — iOS Safari ignora `icons` del manifiesto y usa `apple-touch-icon`; recomendación de PNG 192/512 + maskable 512 con purpose.
- https://developer.chrome.com/docs/workbox/modules/workbox-precaching y búsqueda relacionada — comportamiento de `__WB_REVISION__`/query param para URLs sin hash en el nombre de fichero.

### Tertiary (LOW confidence)
- https://github.com/microsoft/playwright/issues/2311 — reporte antiguo (2020) y sin resolución documentada sobre `context.setOffline` con service workers activos; se interpreta con cautela como motivo de D-10 (la prueba humana complementa, no sustituye, a Playwright), no como un bug bloqueante confirmado en la versión actual.

## Metadata

**Confidence breakdown:**
- Standard stack (versiones): HIGH — todo verificado con `npm view` contra el registro real, en la fecha de esta investigación.
- Compatibilidad Nuxt 4.5.x de `@vite-pwa/nuxt`: MEDIUM — evidencia fuerte de que el bug conocido está arreglado (fuente primaria: PR/versión), pero sin declaración oficial de soporte; de ahí la recomendación de spike en Wave 0.
- Generación de iconos sin dependencias: HIGH — API de Node confirmada ejecutándose en este entorno, técnica de encoding PNG estándar y bien documentada.
- Pitfall de `_payload.json`/offline: MEDIUM-HIGH — la causa raíz y el fix están documentados por la fuente primaria del propio módulo; lo que no está confirmado es si el escenario concreto de este proyecto (solo 2 rutas) lo dispara en la práctica.
- Pruebas Playwright + `setOffline` con SW: LOW-MEDIUM — apoyado en un solo reporte antiguo sin resolución clara; mitigado porque D-10 ya asume que Playwright no es la prueba definitiva.

**Research date:** 2026-08-31
**Valid until:** ~30 días (2026-09-30) — el ecosistema PWA/Workbox se mueve con publicaciones frecuentes; re-verificar versión de `@vite-pwa/nuxt` si la ejecución de esta fase se retrasa más allá de esa fecha, dado que 1.1.1 llevaba solo ~7 meses de antigüedad en el momento de esta investigación.
