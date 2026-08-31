import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-28',
  devtools: { enabled: true },

  ssr: true,

  modules: ['@vueuse/nuxt'],

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
})
