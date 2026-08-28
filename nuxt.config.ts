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

  nitro: {
    prerender: {
      // Nitro semilla el crawler en '/' por defecto incluso cuando `routes`
      // no la incluye; `crawlLinks: false` evita ese 404 mientras no exista
      // app/pages/index.vue (el selector de juego llega en el plan 01-02,
      // que puede volver a activar crawlLinks o añadir '/' explícitamente).
      crawlLinks: false,
      routes: ['/marvel-champions'],
    },
  },

  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        },
      ],
    },
  },
})
