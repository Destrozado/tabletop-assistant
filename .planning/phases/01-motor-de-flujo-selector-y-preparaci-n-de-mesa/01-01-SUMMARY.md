---
phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa
plan: 01
subsystem: infra
tags: [nuxt, tailwindcss-v4, vitest, netlify, ci, ssg]

requires: []
provides:
  - "Proyecto Nuxt 4.5.2 en la raíz del repo con `nuxt generate` (SSG) funcionando, sin `ssr: false`"
  - "Tema oscuro tablet-first declarado una vez en `app/assets/css/main.css` (`@theme`) y disponible como utilidades Tailwind en toda la app"
  - "Guardia de orientación puramente CSS (`#app-root` / `#orientation-guard`) montada en `app/app.vue`"
  - "Gate de CI (`.github/workflows/ci.yml`) que ejecuta `npm run test` en cada push/PR"
  - "`netlify.toml` con el directorio de publicación real confirmado (`.output/public`) y cabeceras de caché preparadas, sin desplegar nada"
affects: ["01-07", "01-08", "02-06"]

tech-stack:
  added: ["nuxt@4.5.2", "@vueuse/core@14.4.0", "@vueuse/nuxt@14.4.0", "tailwindcss@4.3.3", "@tailwindcss/vite@4.3.3", "zod@4.4.3 (devDep)", "vitest@4.1.11 (devDep)", "@nuxt/test-utils@4.2.0 (devDep)"]
  patterns: ["Tailwind v4 CSS-first @theme para todos los design tokens", "vitest test.projects (no vitest.workspace.ts)", "guardia de orientación 100% CSS sin JS/listeners"]

key-files:
  created:
    - nuxt.config.ts
    - vitest.config.ts
    - app/assets/css/main.css
    - app/app.vue
    - netlify.toml
    - .github/workflows/ci.yml
    - public/fonts/inter-latin.woff2
  modified:
    - package.json

key-decisions:
  - "Directorio de publicación real de la build: `.output/public` (confirma la asunción [ASSUMED] A1 de 01-RESEARCH.md, no había que corregirla)"
  - "Inter quedó AUTOALOJADA (no en fallback): se descargó el woff2 variable del subset latin (v20, fonts.gstatic.com) durante la ejecución porque había red disponible; un solo fichero cubre los pesos 400 y 700 vía font-variation, sin necesitar dos descargas"
  - "Renombrado package.json de `tga-scaffold` (nombre del directorio temporal de scaffold) a `table-game-assistant`"
  - "`.gitignore`: `dist` sin barra final (no `dist/`) porque `nuxt generate` crea un symlink `dist -> .output/public`, y el patrón con barra final solo matchea directorios, no symlinks"

requirements-completed: [TECH-01, TECH-02, UI-04, UI-05]

duration: 25min
completed: 2026-08-28
---

# Fase 1 Plan 01: Scaffold de Nuxt 4, tokens de diseño y gates de CI/despliegue Summary

**Proyecto Nuxt 4.5.2 real en la raíz del repo, compilando a estático con Tailwind v4 (`@theme`), guardia de orientación 100% CSS y CI/despliegue preparados — primera de tres rebanadas del esqueleto andante de la Fase 1.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-28T11:33 (sesión), scaffold real ~13:34
- **Completed:** 2026-08-28T13:42
- **Tasks:** 2/2 completadas
- **Files modified:** 15 (13 nuevos + package.json modificado, sin contar node_modules/package-lock)

## Accomplishments

- Proyecto Nuxt 4 real (no un esqueleto vacío) que arranca en dev y compila a estático con `npm run generate`, produciendo `.output/public/index.html` con las rutas `/` y `/marvel-champions` prerenderizadas.
- Tema oscuro de `01-UI-SPEC.md` (color, spacing con namespace, tipografía) traducido literalmente a Tailwind v4 `@theme`, disponible en toda la app sin configuración adicional.
- Guardia de orientación (`#app-root` / `#orientation-guard`) verificada en HTML generado y en `npm run dev`: sin JS, sin `screen.orientation`, sin listeners — solo variantes `portrait:`/(implícito `landscape:` por ausencia).
- CI (`ci.yml`) y despliegue preparado (`netlify.toml`) cableados y verificados contra una build real, sin ejecutar ningún despliegue efectivo (D-17).

## Task Commits

1. **Tarea 1: Scaffold de Nuxt 4, configuración de build/tests y tokens de diseño** - `b63323b` (feat)
2. **Tarea 2: Guardia de orientación y gates de CI y despliegue** - `50c2ffe` (feat)

_Plan de un solo tramo (`type: execute`), sin TDD — no aplica el flujo RED/GREEN/REFACTOR._

## Files Created/Modified

- `package.json` - scaffold Nuxt 4 + dependencias exactas de 01-RESEARCH; añadido script `test`; renombrado a `table-game-assistant`
- `package-lock.json` - lockfile de las 600+ dependencias transitivas
- `nuxt.config.ts` - `ssr: true`, módulo `@vueuse/nuxt`, plugin `@tailwindcss/vite`, `nitro.prerender.routes`, meta viewport de tablet
- `tsconfig.json` - tal cual lo generó el scaffold (referencias a `.nuxt/tsconfig.*.json`), sin cambios necesarios
- `vitest.config.ts` - `test.projects` con el proyecto `engine` (`environment: node`, `passWithNoTests: true`)
- `.gitignore` - `node_modules/`, `.nuxt/`, `.output/`, `dist` (sin barra, ver Decisiones), etc.
- `app/assets/css/main.css` - `@import "tailwindcss"` + `@theme` con los 8 `--color-*`, 7 `--spacing-*` y 4 `--text-*` (+ `--line-height`) + `@font-face` de Inter autoalojada
- `app/app.vue` - `#app-root` (`portrait:hidden`, contiene `<NuxtPage />`) y `#orientation-guard` (`hidden portrait:flex`) con los textos exactos de `01-UI-SPEC.md`
- `netlify.toml` - `command = "npm run generate"`, `publish = ".output/public"`, cabeceras `no-cache` para `/sw.js` y `/manifest.webmanifest`, `immutable` para `/_nuxt/*`
- `.github/workflows/ci.yml` - job `ubuntu-latest`: checkout, setup-node 22, `npm ci`, `npm run test`; `permissions: contents: read` explícito
- `public/fonts/inter-latin.woff2` - fuente Inter autoalojada (subset latin, variable 400-700, ~48KB)
- `public/favicon.ico`, `public/robots.txt`, `README.md` - artefactos por defecto del scaffold de Nuxt, sin modificar

## Decisions Made

- Ver `key-decisions` en el frontmatter. Resumen: directorio de publicación confirmado como `.output/public`; Inter quedó autoalojada de verdad (había red disponible en esta sesión); `package.json` renombrado a un nombre estable de proyecto; ajuste de `.gitignore` para cubrir el symlink `dist`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.gitignore` no cubría el symlink `dist` que crea `nuxt generate`**
- **Found during:** Tarea 1, verificación post-build
- **Issue:** `nuxt generate` crea un symlink `dist -> .output/public` para compatibilidad; el patrón `dist/` de `.gitignore` (con barra final) solo matchea directorios reales, no symlinks, así que `dist` aparecía como archivo no trackeado en `git status`
- **Fix:** Cambiado el patrón a `dist` (sin barra final) en `.gitignore`
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` deja de listar `dist`
- **Committed in:** `b63323b` (Tarea 1)

**2. [Rule 2 - Missing Critical] `permissions: contents: read` explícito en `ci.yml`**
- **Found during:** Tarea 2, antes de comitear
- **Issue:** El plan no especificaba el bloque `permissions`; el threat model (T-01-18) exige que el workflow "no declare permissions de escritura" — dejarlo implícito depende de la configuración del repositorio/organización en GitHub, que puede cambiar
- **Fix:** Añadido `permissions: contents: read` a nivel de workflow, principio de mínimo privilegio explícito en el propio fichero versionado
- **Files modified:** `.github/workflows/ci.yml`
- **Verification:** El job solo necesita leer el repo y ejecutar tests; no hay paso que requiera escritura
- **Committed in:** `50c2ffe` (Tarea 2)

**3. [Rule 2 - Missing Critical] `package.json` renombrado de `tga-scaffold` a `table-game-assistant`**
- **Found during:** Tarea 1
- **Issue:** El scaffold se generó en un directorio temporal llamado `tga-scaffold` (nombre del scratchpad de sesión, no del proyecto); el campo `name` heredó ese nombre temporal
- **Fix:** Renombrado a `table-game-assistant`, consistente con el nombre real del repositorio
- **Files modified:** `package.json`
- **Verification:** No afecta a ningún script ni build; `npm run generate` sigue funcionando igual
- **Committed in:** `b63323b` (Tarea 1)

---

**Total deviations:** 3 auto-fixed (1 bloqueante, 2 de funcionalidad crítica menor). Ninguna es un cambio arquitectónico ni requirió detenerse a preguntar (Rule 4 no aplicó en ningún caso).
**Impact on plan:** Ninguno de los tres cambia el alcance ni las decisiones estructurales fijadas por `SKELETON.md`/`CLAUDE.md`; son correcciones de higiene de repo y seguridad de mínimo privilegio.

## Issues Encountered

- **Node 22.17.1 vs el rango de motor declarado por Nuxt 4.5.2/Nitro (`^22.19.0 || ^24.11.0 || >=26.0.0`):** `npm install` emite warnings `EBADENGINE` para `nuxt`, `@nuxt/nitro-server`, `@nuxt/vite-builder` y `undici`, pero no bloquea la instalación ni el build — `npm run dev`, `npm run generate` y `npm run test` funcionan correctamente con la versión de Node instalada en esta máquina (gestionada por `nvm`, única versión disponible: 22.17.1). No se auto-actualizó Node porque no es un archivo del plan y el software funciona pese al warning; se deja constancia aquí por si una versión futura de Nuxt/Nitro convierte el warning en un error real. Si eso ocurre, la vía de arreglo es `nvm install 22.19.0` (o superior) y `nvm use`.
- **`npm run dev` emite `[NUXT_E4014] No pages found`** porque `pages/` todavía no existe (llega en los planes 01-02/01-08). Es el estado intermedio esperado de esta rebanada — `<NuxtPage />` está correctamente montado dentro de `#app-root`, listo para que las páginas se añadan sin tocar `app.vue`.

## Next Phase Readiness

- El plan `01-07` puede añadir `engine/` con sus tests (`vitest.config.ts` ya tiene el proyecto `engine` apuntando ahí) y el esquema Zod sin renegociar ninguna decisión de esta rebanada.
- El plan `01-08` puede añadir `app/pages/` y los composables sin tocar `app/app.vue`: `#app-root` con `<NuxtPage />` ya está listo para recibir rutas reales.
- El despliegue efectivo (Netlify conectado a GitHub) queda pendiente del paso conjunto D-16/D-17 — `netlify.toml` ya está versionado con el `publish` correcto confirmado por una build real.

## Self-Check

- `FOUND: nuxt.config.ts`
- `FOUND: vitest.config.ts`
- `FOUND: app/assets/css/main.css`
- `FOUND: app/app.vue`
- `FOUND: netlify.toml`
- `FOUND: .github/workflows/ci.yml`
- `FOUND: public/fonts/inter-latin.woff2`
- `FOUND commit: b63323b`
- `FOUND commit: 50c2ffe`

## Self-Check: PASSED

---
*Phase: 01-motor-de-flujo-selector-y-preparaci-n-de-mesa*
*Plan: 01*
*Completed: 2026-08-28*
