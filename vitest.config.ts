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
      // Future (Fase 4+): { test: { name: 'nuxt', environment: 'nuxt', include: ['app/**/*.test.ts'] } }
    ],
  },
})
