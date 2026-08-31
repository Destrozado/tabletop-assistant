import { defineConfig, devices } from '@playwright/test'

// Config de Playwright para la fase 4 (D-09). Hermano y completamente
// separado de vitest.config.ts: los globs de Vitest son `engine/**/*.test.ts`
// y `app/**/*.test.ts`, mientras que las specs de Playwright viven en `e2e/`
// con el sufijo `.spec.ts` (04-PATTERNS.md, confirmado por lectura de
// vitest.config.ts: no hay colisión, no hace falta tocar ese fichero).
export default defineConfig({
  testDir: './e2e',

  use: {
    baseURL: 'http://localhost:4173',
    // El viewport apaisado NO es decorativo: app/app.vue oculta #app-root con
    // la clase `portrait:hidden` (guardia de orientación UI-04). Un viewport
    // vertical dejaría toda la app invisible y cualquier aserción fallaría
    // por el motivo equivocado (confundir "app oculta por orientación" con
    // "app rota").
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Sirve el build REAL de `nuxt generate` (.output/public), que es la única
  // forma de que exista un service worker que registrar — `devOptions.enabled:
  // false` en nuxt.config.ts significa que no hay SW en absoluto en `nuxt dev`.
  //
  // Puerto 4173 (no 3000, desviación del plan documentada en el SUMMARY): para
  // el preset `static`, `nuxi preview` delega en `npx serve public` (confirmado
  // leyendo `.output/nitro.json` -> `commands.preview`), que respeta la
  // variable de entorno `PORT` pero ignora el flag `-p`/`--port` de `nuxi
  // preview` (verificado empíricamente). `npm run dev` (Nuxt) también escucha
  // por defecto en el puerto 3000, así que cualquier desarrollador con
  // `nuxt dev` abierto a la vez que corre `npm run e2e` haría que
  // `reuseExistingServer` (ver abajo) reutilizase por error ese servidor de
  // desarrollo -- sin SW porque `devOptions.enabled:false` -- en vez de
  // levantar el build real. 4173 es el puerto de vista previa habitual de
  // Vite/Nuxt y evita esa colisión de forma permanente, no solo en este
  // entorno concreto.
  webServer: {
    command: 'npm run generate && npx nuxi preview',
    url: 'http://localhost:4173',
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
    env: { PORT: '4173' },
  },

  // Las pruebas comparten el estado del service worker y de Cache Storage del
  // mismo navegador/perfil — correrlas en paralelo produce fallos
  // intermitentes que no significan nada real.
  workers: 1,
  fullyParallel: false,

  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
})
