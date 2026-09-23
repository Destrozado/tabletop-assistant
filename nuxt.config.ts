import tailwindcss from '@tailwindcss/vite'
import { excludeFirebaseSdkFromPrecache } from './scripts/pwa/firebase-sdk-precache'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-28',
  devtools: { enabled: true },

  ssr: true,

  modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  // D-13 (Fase 10): sección nueva — este fichero no tenía `runtimeConfig` en
  // absoluto antes de esta fase. Las cuatro claves alimentan la config web
  // de Firebase; NO son un secreto (la seguridad real la dan las reglas de
  // Firestore, plan 10-02), pero con `nuxt generate` (SSG puro, sin servidor
  // en producción) estos valores se HORNEAN en el payload en tiempo de
  // BUILD — cambiar una variable de entorno en Vercel sin disparar un nuevo
  // build/deploy no tiene ningún efecto sobre el sitio ya servido.
  // Deliberadamente NO se declaran `storageBucket` ni `messagingSenderId`:
  // Cloud Storage y Cloud Messaging son OPT-OUT (`COVERAGE.md`), así que no
  // hay nada que configurar para ellos.
  runtimeConfig: {
    public: {
      // Convención de Nuxt: `NUXT_PUBLIC_<CLAVE_EN_MAYÚSCULAS_CON_GUION_BAJO>`
      // sobreescribe cada valor por defecto de abajo.
      firebaseApiKey: '', // NUXT_PUBLIC_FIREBASE_API_KEY
      firebaseAuthDomain: '', // NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN
      firebaseProjectId: '', // NUXT_PUBLIC_FIREBASE_PROJECT_ID — vacío = guarda de configuración (D-13) corta antes del import() dinámico
      firebaseAppId: '', // NUXT_PUBLIC_FIREBASE_APP_ID
    },
  },

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
      // D-16/09-RESEARCH.md Pitfall 4: el histórico y las estadísticas (plan
      // 09-08) se añaden por el mismo motivo — sin enumerarlas aquí no
      // tendrían HTML que Workbox pudiera precachear y fallarían la primera
      // vez que se abrieran con la red cortada, exactamente el mismo fallo
      // que ya obligó a declarar '/marvel-champions' a mano.
      crawlLinks: false,
      routes: ['/', '/marvel-champions', '/historico', '/estadisticas'],
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
      //
      // Los chunks del SDK de Firebase (WR-03) se añaden a esta lista en
      // TIEMPO DE BUILD, vía el hook `pwa:beforeBuildServiceWorker` de abajo
      // — no están declarados aquí a mano porque sus nombres cambian de
      // hash en cada build.
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

  // WR-03 (260923-3rk): sin este hook, `workbox.globPatterns` (arriba,
  // '**/*.{js,css,html}') precachearía TODOS los `_nuxt/*.js`, incluidos los
  // que contienen el SDK de Firebase (~715 KB) — contradice D-13: sin las
  // variables `NUXT_PUBLIC_FIREBASE_*` la sincronización es un no-op
  // completo, pero descargar el SDK para nada no lo es. Tampoco tiene
  // sentido precachearlo para uso offline: sin red no hay nada que
  // sincronizar.
  //
  // Por qué se identifica por MARCA DE CONTENIDO (`@firebase/`) y no por
  // nombre de chunk: los nombres son `[hash].js` sin ninguna convención
  // legible; forzar un nombre estable con `manualChunks`/`chunkFileNames`
  // tocaría el troceado de Vite 8/Rolldown del que depende el gate de
  // e2e/bundle-budget.spec.ts (D-16/SYNC-05), fuera de alcance de este
  // arreglo.
  //
  // TRAMPA evitada (ver <interfaces> del plan 260923-3rk): declarar
  // `workbox.manifestTransforms` a mano desactivaría el transform propio de
  // @vite-pwa/nuxt que convierte `marvel-champions/index.html` en la URL
  // limpia `marvel-champions` — rompería la navegación sin red. Por eso se
  // usa este hook más `globIgnores`, nunca `manifestTransforms`.
  //
  // Compromiso aceptado: sin red, el SDK ya no está precacheado, lo que no
  // habilita nada porque sin red no hay nada que sincronizar. Tras un
  // despliegue que cambie el hash del SDK, una pestaña con la build vieja
  // podría no encontrar su chunk del SDK hasta aplicar la banda de
  // actualización (COMP-03) — `syncPending` (useHistorySync.ts) ya captura
  // ese fallo de import() y las partidas siguen pendientes, sin pérdida de
  // datos.
  hooks: {
    'pwa:beforeBuildServiceWorker'(options) {
      excludeFirebaseSdkFromPrecache(options)
    },
  },
})
