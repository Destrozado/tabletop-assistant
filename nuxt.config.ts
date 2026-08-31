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
      // NO declarar `icons` todavía: los PNG los produce el plan 04-02;
      // referenciar ficheros inexistentes rompería la instalabilidad.
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
    // NO añadir todavía el bloque `workbox`: la configuración de
    // `globPatterns` es del plan 04-04. Se dejan los defaults del plugin.
  },
})
