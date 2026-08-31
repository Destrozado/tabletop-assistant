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
    // El viewport apaisado por defecto es la orientación real de uso (tablet
    // apoyada junto a la mesa) y la que asumen las specs de PWA/offline. Ya
    // NO es obligatorio para que la app sea visible: la guarda de
    // orientación por CSS que ocultaba #app-root en vertical se retiró en la
    // quick 260831-mgd, alineándose con D-08 de la Fase 4 (el manifiesto no
    // fuerza orientación, y ahora tampoco lo hace el CSS).
    // e2e/portrait-usable.spec.ts sobrescribe este viewport con `test.use`
    // para cubrir el caso vertical.
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
  // En CI se añade el reportero 'html' (sin abrir navegador) para que el step
  // "Upload Playwright report" de .github/workflows/ci.yml (04-06-PLAN.md)
  // tenga de verdad qué subir cuando un test falla — 'list' por sí solo no
  // genera ningún fichero en disco. En local se mantiene solo 'list', sin
  // carpeta playwright-report/ de por medio.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
})
