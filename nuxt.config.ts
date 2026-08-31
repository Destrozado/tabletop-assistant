import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-28',
  devtools: { enabled: true },

  ssr: true,

  modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  // Cabeceras de caché declaradas aquí, no en configuración del host: Nitro las
  // traduce al preset de destino (Vercel, Netlify o estático), así que la app
  // sigue siendo portable y hay una única fuente de verdad.
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

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'TableGameAssistant',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        },
        // 04-RESEARCH.md Pitfall 2: iOS Safari ignora por completo el array
        // `icons` del manifiesto al añadir a pantalla de inicio; solo lee
        // `apple-mobile-web-app-capable` + `<link rel="apple-touch-icon">`
        // (declarado abajo en `link`). Por eso el `apple-touch-icon` no es
        // redundante con `manifest.icons`, es obligatorio para iOS.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // Equivalente estándar moderno para Android/Chrome.
        { name: 'mobile-web-app-capable', content: 'yes' },
        // Barra de estado translúcida para no romper el tema oscuro en iOS.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        // Ver comentario del meta `apple-mobile-web-app-capable` de arriba:
        // este link es el que iOS realmente usa como icono instalado.
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ],
    },
  },

  pwa: {
    // D-03 / CLAUDE.md §"What NOT to Use": NUNCA 'autoUpdate'. Ese modo
    // recarga sin avisar todas las pestañas abiertas en cuanto detecta una
    // build nueva, lo que interrumpiría una partida a mitad de paso. 'prompt'
    // deja que la app muestre una banda descartable ("Nueva versión
    // disponible") que el grupo decide cuándo aplicar (plan 04-05).
    registerType: 'prompt',
    // Nada en esta fase necesita un service worker a medida (`injectManifest`
    // + sw.ts propio): el precacheo por defecto de Workbox basta.
    strategies: 'generateSW',
    manifest: {
      name: 'TableGameAssistant',
      short_name: 'TableGame',
      description: 'Asistente de partidas para juegos de mesa complejos, paso a paso y en voz alta.',
      lang: 'es',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      // D-08: NO declarar `orientation`. Decisión explícita del usuario: si
      // alguien abre la app en un móvil en vertical, se acepta que se vea
      // peor antes que forzar una orientación con la que el sistema operativo
      // podría no ser consistente.
      background_color: '#14161C', // --color-background de app/assets/css/main.css
      theme_color: '#14161C',
      // Iconos generados por scripts/pwa/generate-icons.mjs (plan 04-02,
      // D-06: cero dependencias). Sin `orientation` (D-08).
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/icons/icon-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    // Valor por defecto, declarado explícito porque es lo que expone `$pwa`
    // en el cliente, del que depende el plan 04-05 (banda de actualización).
    client: {
      registerPlugin: true,
    },
    devOptions: {
      // Un service worker activo durante `nuxt dev` enmascararía cambios de
      // contenido y de audio mientras se desarrolla. Toda la verificación
      // real de esta fase corre contra `nuxt generate` + `nuxi preview`
      // (planes 04-03 y 04-04), no contra el servidor de desarrollo.
      enabled: false,
    },
    // Plan 04-04: sin este bloque, Workbox no escanea `.output/public` en
    // absoluto y el precache queda con solo 5 entradas de metadatos de build
    // (confirmado en 04-03-SUMMARY.md) — ni el HTML de "/" quedaba
    // precacheado, así que ni siquiera recargar la app sin red funcionaba.
    workbox: {
      globPatterns: [
        '**/*.{js,css,html}',
        // Un solo nivel (`audio/*.m4a`), NO `audio/**`. Dos motivos, ambos
        // deliberados: (a) un patrón recursivo arrastraría
        // `audio/_probe/*.m4a`, artefactos de elección de estilo de voz de
        // la Fase 03.1 que no pertenecen a producción (T-04-10/T-04-11); (b)
        // el glob que proponía 04-RESEARCH.md §Pattern 1 (`audio/setup*.m4a`)
        // es un error de la investigación, porque dejaría fuera los diez
        // clips `ronda.*` — es decir, toda la locución del bucle de ronda,
        // la parte más larga de la partida.
        'audio/*.m4a',
        'icons/*.png',
        'fonts/*.woff2',
        'favicon.ico',
        'manifest.webmanifest',
      ],
      // Redundantes a propósito con los `globPatterns` de arriba (el
      // `**/*.html` ya alcanzaría `voice-probe.html`; `audio/*.m4a` ya deja
      // fuera `_probe/` por ser de un solo nivel), pero declarados igual para
      // que la exclusión siga siendo correcta y legible tanto si estos
      // ficheros de desarrollo de la Fase 03.1 siguen en el repo como si el
      // plan 03.1-06 (aún sin ejecutar) ya los ha borrado. Un `globIgnores`
      // que apunta a algo inexistente es inofensivo.
      globIgnores: ['**/node_modules/**', 'voice-probe.html', 'audio/_probe/**'],
      // No se declara `navigateFallback`: cada una de las dos rutas
      // prerenderizadas (`/`, `/marvel-champions`) tiene su propio HTML real
      // precacheado, no hay un único shell de SPA al que caer.
      //
      // No se toca `maximumFileSizeToCacheInBytes`: el límite por defecto de
      // Workbox son 2 MiB por fichero; con los 36 clips reales el mayor pesa
      // ~173 KB y el total ronda 1,4 MB, muy por debajo del límite.
    },
    // Plan 04-04 Task 2: `experimental.enableWorkboxPayloadQueryParams`
    // mitiga que Workbox `generateSW` no resuelva `_payload.json?query`
    // offline (04-RESEARCH.md Pitfall 1). Comprobado empíricamente contra
    // este build (`nuxt generate` con preset `static`, el mismo que sirve
    // `playwright.config.ts`): la suite `e2e/offline-flow.spec.ts` navega de
    // "/" a "/marvel-champions" sin red (paso 4) y pasa sin activar esta
    // opción. NO se activa: es una decisión consciente documentada con su
    // evidencia (SUMMARY del plan 04-04), no un olvido.
  },
})
