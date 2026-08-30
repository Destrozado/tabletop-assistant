import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Source: https://nuxt.com/docs/4.x/getting-started/testing
export default defineConfig({
  test: {
    // `test.projects` (Vitest workspaces-in-config), NOT a separate vitest.workspace.ts.
    // `engine/` doesn't exist yet — it lands in plan 01-07. An empty match set here
    // must not fail the `test` script, hence `passWithNoTests`.
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'engine',
          include: ['engine/**/*.test.ts'],
          environment: 'node', // engine/ never touches the DOM — no jsdom cost
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: 'app-logic',
          include: ['app/**/*.test.ts'],
          environment: 'node', // pure-function tests only (voice-preference parsing, voice-state machine) — no DOM/jsdom needed per RESEARCH.md; do not reach for 'nuxt' environment unless a composable genuinely needs a mocked Nuxt context
          passWithNoTests: true,
        },
        resolve: {
          // Nuxt injects `~`/`~~` at app-build time; a plain Vite/Vitest project
          // doesn't, so tests importing composables that use `~~/engine/*` need
          // the same aliases resolved by hand. `engine/`'s own project doesn't
          // need this because it only uses relative imports.
          alias: {
            '~~': fileURLToPath(new URL('./', import.meta.url)),
            '~': fileURLToPath(new URL('./app/', import.meta.url)),
          },
        },
      },
    ],
  },
})
