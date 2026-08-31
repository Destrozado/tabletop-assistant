---
phase: 04-instalaci-n-y-funcionamiento-offline
plan: 01
subsystem: infra
tags: [pwa, vite-pwa, workbox, nuxt4, vercel, service-worker, manifest]

# Dependency graph
requires:
  - phase: 03.1-locucion-tts-pregrabada
    provides: rutas prerenderizadas (/, /marvel-champions) y routeRules de caché ya escritas en nuxt.config.ts
provides:
  - "@vite-pwa/nuxt@1.1.1 instalado y funcionando con Nuxt 4.5.2 (Asunción A1 de 04-RESEARCH.md CONFIRMADA)"
  - "Bloque `pwa` mínimo en nuxt.config.ts: registerType prompt (D-03), manifiesto sin orientation (D-08)"
  - "sw.js y manifest.webmanifest reales generados por `nuxt generate`"
  - "Confirmación de que las 5 routeRules de caché sobreviven al preset vercel (.vercel/output/config.json)"
affects: [04-02-iconos-y-manifest, 04-03-verificacion-offline, 04-04-workbox-globpatterns, 04-05-banda-actualizacion, 04-06-ci-playwright]

# Tech tracking
tech-stack:
  added: ["@vite-pwa/nuxt@1.1.1 (wraps vite-plugin-pwa@1.3.0, workbox-window@7.4.1)"]
  patterns:
    - "Bloque `pwa` en nuxt.config.ts como propiedad hermana de modules/routeRules/nitro/app"
    - "registerType: 'prompt' nunca 'autoUpdate' (D-03)"
    - "Manifiesto sin `orientation` (D-08) y sin `icons` hasta el plan 04-02"

key-files:
  created: []
  modified:
    - nuxt.config.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Asunción A1 de 04-RESEARCH.md queda CONFIRMADA con evidencia de build real: @vite-pwa/nuxt@1.1.1 compila limpio con Nuxt 4.5.2 (nuxt generate y NITRO_PRESET=vercel nuxt generate), no reaparece el bug #204 (assets buscados en app/public)"
  - "No se ha tocado el bloque `workbox` (globPatterns queda para el plan 04-04) ni `icons` del manifiesto (plan 04-02), tal como exigía el plan"
  - "devOptions.enabled: false — el SW no se activa en `nuxt dev`, solo se verifica contra `nuxt generate` + `nuxi preview`/preset vercel"

patterns-established:
  - "Config PWA mínima viable: generateSW + manifest básico + client.registerPlugin, sin workbox custom todavía"

requirements-completed: [OFF-01, OFF-02, OFF-04]

# Metrics
duration: 15min
completed: 2026-08-31
---

# Fase 4 Plan 01: Instalación de @vite-pwa/nuxt y verificación de compatibilidad con Nuxt 4 Summary

**`@vite-pwa/nuxt@1.1.1` instalado y confirmado compatible con Nuxt 4.5.2: `nuxt generate` produce `sw.js` y `manifest.webmanifest` reales, y las 5 `routeRules` de caché sobreviven intactas al preset `vercel`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-31T11:57:00Z (aprox., tras `npm install` inicial del worktree)
- **Completed:** 2026-08-31T12:13:04Z
- **Tasks:** 2/2
- **Files modified:** 3 (`nuxt.config.ts`, `package.json`, `package-lock.json`)

## Accomplishments

- Cerrada la Asunción A1 de `04-RESEARCH.md` (bloqueante heredado de `STATE.md` sobre compatibilidad `@vite-pwa/nuxt`/Nuxt 4.5.x): **CONFIRMADA**, no refutada. `npm run generate` termina en verde y emite `.output/public/sw.js` (1228 bytes) y `.output/public/manifest.webmanifest` (267 bytes), ambos no vacíos.
- Manifiesto respeta D-08 (sin `orientation`) y D-03 (`registerType: 'prompt'`, cero apariciones de `'autoUpdate'`).
- Verificado contra un build real con el preset de producción (`NITRO_PRESET=vercel npm run generate`) que las 5 `routeRules` existentes (incluidas las dos `no-cache` de `/sw.js` y `/manifest.webmanifest`) se traducen correctamente a `.vercel/output/config.json` — el "stale service worker trap" documentado en `CLAUDE.md` sigue cerrado ahora que esos ficheros existen de verdad por primera vez.
- Suite de Vitest sigue en verde: 278/278 tests, mismo recuento que antes del cambio.

## Task Commits

1. **Task 1: Instalar @vite-pwa/nuxt y verificar que Nuxt 4.5.2 genera sw.js y manifest.webmanifest** - `02a67c6` (feat)
2. **Task 2: Verificar que las cabeceras no-cache de /sw.js y /manifest.webmanifest sobreviven al preset de Vercel** - sin commit (camino feliz, cero cambios de código; ver más abajo)

**Plan metadata:** (pendiente, se añade en el commit final de este plan)

## Verificación de compatibilidad Nuxt 4 (Asunción A1) — evidencia literal

Versión exacta instalada (leída de `package-lock.json` / `node_modules/@vite-pwa/nuxt/package.json`, no del texto del plan):

```
@vite-pwa/nuxt: 1.1.1
```

Salida relevante de `npm run generate` (Nuxt 4.5.2, Nitro 2.13.4, Vite 8.2.2, preset `static`):

```
[nitro] ℹ Prerendering 4 routes
[nitro]   ├─ /200.html (32ms)
[nitro]   ├─ /404.html (33ms)
[nitro]   ├─ /marvel-champions (51ms)
[nitro]   ├─ / (52ms)
[nitro]   ├─ /marvel-champions/_payload.json (1ms)
[nitro]   ├─ /_payload.json (0ms)
[nitro] ℹ Prerendered 6 routes in 0.583 seconds
[nitro] ✔ Generated public .output/public

PWA v1.3.0
mode      generateSW
precache  5 entries (0.31 KiB)
files generated
  ../.output/public/sw.js
  ../.output/public/workbox-2fbc6a65.js
```

No apareció ningún error de resolución de rutas de assets ni el bug histórico #204 (`app/public` vs `public/`). Ningún warning de glob patterns sin coincidencias en el build por defecto (preset `static`). **Veredicto: A1 CONFIRMADA** — no hace falta workaround ni versión alternativa; los planes 04-02 a 04-06 pueden continuar sobre esta base.

Contenido de `.output/public/manifest.webmanifest`:

```json
{"name":"TableGameAssistant","short_name":"TableGame","description":"Asistente de partidas para juegos de mesa complejos, paso a paso y en voz alta.","start_url":"/","display":"standalone","background_color":"#14161C","theme_color":"#14161C","lang":"es","scope":"/"}
```

`display: "standalone"` presente, `orientation` ausente (D-08 respetada).

## Verificación de cabeceras contra el preset Vercel (Task 2)

`NITRO_PRESET=vercel npm run generate` escribe `.vercel/output/config.json` (fichero ignorado por git). Fragmento relevante que prueba las cabeceras `no-cache`:

```json
{
  "headers": { "cache-control": "no-cache" },
  "src": "/sw.js"
},
{
  "headers": { "cache-control": "no-cache" },
  "src": "/manifest.webmanifest"
},
{
  "headers": { "cache-control": "public, max-age=0, must-revalidate" },
  "src": "/audio/(.*)"
}
```

Las reglas de `/_nuxt/(.*)` y `/fonts/(.*)` también aparecen con `cache-control: public, max-age=31536000, immutable`. Las 5 reglas de `routeRules` sobreviven intactas al preset — ninguna corrección fue necesaria (`registerWebManifestInRouteRules` no está activado por defecto en esta configuración mínima, así que `nuxt.config.ts` sigue siendo la única fuente de verdad de estas cabeceras). No se creó `vercel.json` ni `netlify.toml` (`ls vercel.json netlify.toml 2>/dev/null | wc -l` → `0`).

Tras la verificación se volvió a ejecutar `npm run generate` sin preset: `.output/public/sw.js` y `.output/public/manifest.webmanifest` existen de nuevo y no están vacíos, dejando el árbol en el estado que esperan los planes siguientes.

**Task 2 no generó ningún cambio de código** (camino feliz explícito en el propio plan: "en el camino feliz no hay cambios de código"), por lo que no hay un commit de Task 2 independiente — la verificación queda documentada aquí y confirmada por los comandos de `<verify>` ejecutados.

## Nota para planes descendentes: `_payload.json`

- Con el preset **`static`** (comando `npm run generate` normal), sí aparecen `_payload.json` y `marvel-champions/_payload.json` en `.output/public/` (payload extraction activo, confirma Assumption A2 de `04-RESEARCH.md`).
- Con el preset **`vercel`** (`NITRO_PRESET=vercel npm run generate`), el prerenderer NO generó ficheros `_payload.json` en esta ejecución — Workbox incluso mostró un warning de que el patrón `**/_payload.json` no encontró coincidencias en `.vercel/output/static`. Esta diferencia entre presets es relevante para el plan **04-04**, que decide sobre `enableWorkboxPayloadQueryParams`: la app real se despliega con el preset `vercel` (ver `CLAUDE.md` §Hosting), así que conviene verificar en ese plan si el comportamiento observado aquí (ausencia de `_payload.json` bajo `vercel`) se mantiene o es incidental a esta build concreta.
- Solo se reporta la observación, tal como pedía el contexto de ejecución — no se ha tomado ninguna decisión sobre `enableWorkboxPayloadQueryParams` en este plan.

## Files Created/Modified

- `nuxt.config.ts` - Añadido `'@vite-pwa/nuxt'` al array `modules` y bloque `pwa` nuevo (registerType, strategies, manifest sin orientation, client, devOptions). Las 5 `routeRules` preexistentes no se tocaron (`git diff nuxt.config.ts` no muestra líneas eliminadas dentro de ese bloque).
- `package.json` - `@vite-pwa/nuxt: ^1.1.1` añadido a `dependencies` (no `devDependencies`), coherente con `@vueuse/nuxt`/`@tailwindcss/vite`.
- `package-lock.json` - Lockfile actualizado por `npm install @vite-pwa/nuxt@1.1.1`.

## Decisions Made

- Instalar exactamente la versión `1.1.1` fijada por el plan (sin `^` implícito de "latest"), coherente con el resto del `package.json` que usa rangos `^` pero con la versión auditada por `04-RESEARCH.md` §Package Legitimacy Audit.
- No fue necesario ejecutar el "camino de fallo" del plan (pasos 1-4 de reversión/BLOCKED): el spike de ola 0 tuvo éxito al primer intento.
- No se tocó `workbox.globPatterns` ni `manifest.icons`: quedan explícitamente para los planes 04-04 y 04-02 respectivamente, tal como exige el plan.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito. El único ajuste fue puramente organizativo: Task 2 no produjo commit propio porque no hubo cambios de código en el camino feliz (previsto explícitamente por el propio plan), no una desviación de las reglas de deviation.

## Issues Encountered

None. El `npm install` inicial del worktree mostró warnings `EBADENGINE` (Node 22.17.1 vs el rango `^22.18.0`/`^22.19.0` que piden `nuxt`/`@nuxt/vite-builder`/`undici`) — son warnings preexistentes del entorno, no causados por este plan, y no bloquearon build ni tests (fuera de alcance, no se registra en `deferred-items.md` porque no es un fallo, solo un warning informativo de compatibilidad de motor).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- El bloqueante de `STATE.md` sobre compatibilidad `@vite-pwa/nuxt`/Nuxt 4.5.x queda resuelto con evidencia de build (no solo inferencia).
- `nuxt.config.ts` tiene ya la base mínima (`pwa` block) sobre la que el plan 04-02 puede añadir `icons` al manifiesto y `<link rel="apple-touch-icon">`, y el plan 04-04 puede añadir `workbox.globPatterns` explícito.
- Ningún blocker nuevo. La diferencia de comportamiento de `_payload.json` entre preset `static` y `vercel` (ver nota arriba) es la única información no trivial a tener en cuenta en 04-04.

---
*Phase: 04-instalaci-n-y-funcionamiento-offline*
*Completed: 2026-08-31*

## Self-Check: PASSED

- FOUND: nuxt.config.ts
- FOUND: package.json
- FOUND: .planning/phases/04-instalaci-n-y-funcionamiento-offline/04-01-SUMMARY.md
- FOUND: commit 02a67c6
