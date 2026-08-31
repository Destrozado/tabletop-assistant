---
phase: 04-instalaci-n-y-funcionamiento-offline
plan: 02
subsystem: infra
tags: [pwa, icons, png, zlib, manifest, apple-touch-icon, nuxt4, vite-pwa]

# Dependency graph
requires:
  - phase: 04-instalaci-n-y-funcionamiento-offline (plan 01)
    provides: "@vite-pwa/nuxt instalado y bloque `pwa` mínimo en nuxt.config.ts, sin `icons` ni `workbox`"
provides:
  - "scripts/pwa/generate-icons.mjs — generador de PNG de cero dependencias (node:zlib + node:fs)"
  - "Cuatro iconos PNG versionados en public/icons/ (192, 512, 512 maskable, apple-touch-icon 180)"
  - "nuxt.config.ts pwa.manifest.icons con 3 entradas (192/512/512-maskable)"
  - "app.head con apple-touch-icon y meta etiquetas de pantalla completa iOS/Android"
  - "<NuxtPwaManifest /> en app.vue — el `<link rel=\"manifest\">` que faltaba desde el plan 04-01"
affects: [04-03-verificacion-offline, 04-04-workbox-globpatterns, 04-05-banda-actualizacion, 04-06-ci-playwright]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generación de PNG de cero dependencias escribiendo a mano IHDR/IDAT/IEND con node:zlib (crc32 + deflateSync)"
    - "Icono geométrico (triángulo por aritmética de coordenadas) en vez de tipografía rasterizada — evita arte con copyright (D-07) y parseo de fuentes"
    - "`<NuxtPwaManifest />` colocado en app.vue: componente auto-importado de @vite-pwa/nuxt que hay que insertar a mano, el módulo no lo hace solo"

key-files:
  created:
    - scripts/pwa/generate-icons.mjs
    - public/icons/icon-192.png
    - public/icons/icon-512.png
    - public/icons/icon-512-maskable.png
    - public/icons/apple-touch-icon.png
  modified:
    - package.json
    - nuxt.config.ts
    - app/app.vue

key-decisions:
  - "Icono: fondo sólido --color-accent (#2F81F7) con triángulo --color-on-accent (#0B1220) apuntando a la derecha — el mismo símbolo de avance del botón SIGUIENTE, sin ningún píxel de Marvel Champions ni Fantasy Flight Games (D-07)"
  - "Todos los píxeles con alfa 255 (tipo de color RGBA 6 en las 4 variantes) para que apple-touch-icon.png quede opaco de hecho sin mantener una segunda ruta de codificación"
  - "Rule 2: añadido <NuxtPwaManifest /> en app.vue, no contemplado explícitamente por el plan — sin él el navegador nunca recibe <link rel=\"manifest\"> y la instalabilidad quedaría rota con independencia del trabajo de iconos"

requirements-completed: [OFF-01]

# Metrics
duration: 20min
completed: 2026-08-31
---

# Fase 4 Plan 02: Iconos y manifest PWA Summary

**Iconos PWA generados por código (triángulo geométrico sobre colores del tema, cero dependencias, `node:zlib` a mano) cableados al manifiesto y a las meta etiquetas de pantalla completa de iOS, más el `<link rel="manifest">` que faltaba desde el plan anterior.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-31T12:04:00Z (aprox., tras `npm install` inicial del worktree)
- **Completed:** 2026-08-31T12:24:24Z
- **Tasks:** 2/2
- **Files modified:** 7 (`scripts/pwa/generate-icons.mjs` nuevo, 4 PNG nuevos, `package.json`, `nuxt.config.ts`, `app/app.vue`)

## Accomplishments

- `scripts/pwa/generate-icons.mjs`: CLI de Node de cero dependencias (solo `node:zlib` y `node:fs`) que escribe a mano los chunks `IHDR`/`IDAT`/`IEND` de un PNG y rellena cada píxel por comprobación geométrica de un triángulo isósceles — sin leer ninguna imagen de entrada ni hacer peticiones de red (`grep -c "readFileSync\|fetch(" scripts/pwa/generate-icons.mjs` → `0`).
- Cuatro PNG versionados en `public/icons/`, regenerables de forma determinista (verificado ejecutando el script dos veces: el árbol de git queda idéntico byte a byte, ver tabla abajo).
- `nuxt.config.ts` completa el manifiesto con `icons` (192, 512, 512 maskable) y añade `apple-touch-icon` + tres meta etiquetas de pantalla completa en `app.head`, sin tocar ninguna línea preexistente (`git diff nuxt.config.ts` solo añade).
- Verificado contra un build real (`npm run generate`): ambas rutas prerenderizadas (`index.html` y `marvel-champions/index.html`) llevan `rel="apple-touch-icon"`, las tres meta de pantalla completa, y `.output/public/manifest.webmanifest` expone las 3 entradas de `icons` sin `orientation` (D-08).
- **Hallazgo out-of-scope corregido (Rule 2):** el módulo `@vite-pwa/nuxt` registra `NuxtPwaManifest`/`VitePwaManifest` como componente auto-importado pero no lo coloca en ningún sitio del árbol de componentes; sin usarlo explícitamente, el `<link rel="manifest">` nunca aparecía en el HTML generado (confirmado por inspección directa de `.output/public/index.html` antes del fix — cero coincidencias de `rel="manifest"`). Se añadió `<NuxtPwaManifest />` a `app/app.vue`; tras el fix, ambas rutas prerenderizadas llevan `rel="manifest" href="/manifest.webmanifest"`.
- Suite de Vitest sigue en verde: 278/278 tests, sin cambios de recuento.

## Task Commits

Each task was committed atomically:

1. **Task 1: Generador de iconos PNG de cero dependencias y los cuatro ficheros versionados** - `564fb68` (feat)
2. **Task 2: Cablear los iconos al manifiesto y añadir las meta etiquetas de pantalla completa en iOS** - `53936a8` (feat, incluye el fix de Rule 2 en `app/app.vue`)

**Plan metadata:** (pendiente, se añade en el commit final de este plan)

## Diseño exacto del icono

- **Fondo:** `#2F81F7` (`--color-accent` de `app/assets/css/main.css`), cubre todo el lienzo.
- **Símbolo:** triángulo isósceles relleno de `#0B1220` (`--color-on-accent`), apuntando a la derecha, centrado, inscrito en un cuadrado cuyo lado es una fracción del lado del lienzo:
  - `icon-192.png` y `icon-512.png` y `apple-touch-icon.png`: triángulo al ~52% del lado.
  - `icon-512-maskable.png`: triángulo reducido al ~34% del lado, para quedar holgadamente dentro del círculo seguro del 80% de los lanzadores maskable.
- **Codificación:** todas las variantes en profundidad de bit 8, tipo de color 6 (RGBA), alfa 255 en el 100% de los píxeles — confirmado con un escaneo completo de `apple-touch-icon.png` (`allOpaque = true`).
- **Sin arte externo:** ningún píxel procede de un fichero leído ni de una petición de red (D-07); el relleno se decide por aritmética de coordenadas (comprobación de signo de tres productos vectoriales).

## Tamaño en bytes de cada PNG (regenerado, git-tracked)

| Fichero | Dimensiones | Bytes |
|---|---|---|
| `public/icons/icon-192.png` | 192×192 | 861 |
| `public/icons/icon-512.png` | 512×512 | 3896 |
| `public/icons/icon-512-maskable.png` | 512×512 | 3280 |
| `public/icons/apple-touch-icon.png` | 180×180 | 786 |

## Confirmación de regeneración determinista

Tras el commit de Task 1, se ejecutó `node scripts/pwa/generate-icons.mjs` una segunda vez con los PNG ya en el índice de git (`git add`), y `git status --porcelain public/icons` no mostró ningún fichero modificado (`M`) — los cuatro binarios quedaron byte a byte idénticos a la primera generación. Confirmado también con `node -e` decodificando `icon-192.png` con `zlib.inflateSync`: el píxel central `(96,96)` es `#0B1220` con alfa `ff` (dentro del triángulo) y la esquina `(0,0)` es `#2F81F7` con alfa `ff` (fondo).

## Colores usados y su fuente

Los tres valores hexadecimales usados en el script (`#2F81F7`, `#0B1220`) se copiaron literalmente de `app/assets/css/main.css` §`@theme` (`--color-accent` y `--color-on-accent`), tal como exigía `<interfaces>` del plan — ninguno se inventó.

## Files Created/Modified

- `scripts/pwa/generate-icons.mjs` (nuevo) — generador de PNG de cero dependencias, invocable con `npm run icons:generate`, nunca enganchado a `build`/`generate`/`postinstall`.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png` (nuevos) — los cuatro binarios versionados.
- `package.json` — añadido `"icons:generate": "node scripts/pwa/generate-icons.mjs"` al bloque `scripts`; `dependencies`/`devDependencies` sin cambios.
- `nuxt.config.ts` — `pwa.manifest.icons` (3 entradas) y `app.head.link`/`app.head.meta` con `apple-touch-icon` y las tres meta etiquetas de pantalla completa.
- `app/app.vue` — añadido `<NuxtPwaManifest />` (Rule 2, ver Deviations).

## Decisions Made

- Triángulo apuntando a la derecha como símbolo del icono: es literalmente el mismo glifo que usa el botón "SIGUIENTE ›" de la app, trivial de rasterizar con aritmética, y no puede confundirse con arte de Marvel Champions/FFG (D-06/D-07).
- Un único tipo de color (RGBA, tipo 6) para las 4 variantes en vez de RGB (tipo 2) + una ruta aparte para el opaco: alfa 255 en todos los píxeles ya deja `apple-touch-icon.png` opaco de hecho, así el script no mantiene dos caminos de codificación PNG.
- No se añadió meta `theme-color` a mano (instrucción explícita del plan). Se verificó en el HTML generado: la asunción del plan de que el módulo lo inyecta solo **no se cumplió** en esta build (`grep -io theme-color .output/public/index.html` no encontró nada, con o sin `<NuxtPwaManifest />`). Como el `<verify>` de este plan no exige la presencia de ese meta y el `manifest.theme_color` ya existe desde el plan 04-01 para cuando el sistema operativo lo necesite tras instalar, se documenta la discrepancia aquí en vez de añadir código fuera del alcance explícito de esta tarea — queda como observación para 04-05/04-06 si el checkpoint humano detecta que hace falta.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `<NuxtPwaManifest />` no estaba colocado en ningún componente**
- **Found during:** Task 2, al verificar el HTML generado (`.output/public/index.html`) antes de dar la tarea por cerrada.
- **Issue:** `@vite-pwa/nuxt` registra `NuxtPwaManifest`/`VitePwaManifest` como componente auto-importado (confirmado leyendo `node_modules/@vite-pwa/nuxt/dist/shared/nuxt.*.mjs`, línea `addComponent({ name: "VitePwaManifest", ... })`), pero no lo inserta automáticamente en ningún layout ni página. Sin usarlo explícitamente, el HTML prerenderizado no contenía ningún `<link rel="manifest">`, lo que significa que el navegador no puede descubrir el manifiesto en absoluto — rompiendo la instalabilidad de la PWA con total independencia de que los iconos y las meta etiquetas de este plan estuvieran bien declarados.
- **Fix:** añadido `<NuxtPwaManifest />` al `<template>` de `app/app.vue` (no renderiza nada visualmente, solo llama a `useHead` para inyectar el link).
- **Files modified:** `app/app.vue`
- **Verification:** tras `npm run generate`, `grep -o 'rel="manifest"[^>]*' .output/public/index.html` y el mismo grep contra `marvel-champions/index.html` devuelven `rel="manifest" href="/manifest.webmanifest"` en ambos; antes del fix, ninguno de los dos ficheros contenía esa cadena.
- **Committed in:** `53936a8` (parte del commit de Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Necesario para que OFF-01 quede realmente cerrado — sin este fix, todo el trabajo de iconos y meta etiquetas de este plan habría sido insuficiente para que Chrome ofreciera instalar la app, porque el navegador nunca habría encontrado el manifiesto. Cero scope creep: es una corrección directa a la funcionalidad que el propio objetivo del plan pide ("dar identidad instalada a la app").

## Issues Encountered

- El worktree venía con commits ajenos a esta fase por delante del punto de partida esperado (`9773a3d`, fin de 04-01); se corrigió con `git reset --hard 9773a3d9f712115a44c1b996799a1f8c4c0b9af0` como exige el protocolo de arranque del executor, antes de tocar ningún fichero. No es un problema de este plan, es higiene de worktree.
- `npm install` inicial mostró los mismos warnings `EBADENGINE` (Node 22.17.1 vs `^22.19.0`) ya documentados en 04-01-SUMMARY.md — preexistentes, no bloquean build ni tests, fuera de alcance de este plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- OFF-01 queda cubierto por código: el manifiesto ahora es descubrible (`<link rel="manifest">` vía `<NuxtPwaManifest />`), tiene los 3 iconos que Chrome necesita, y iOS tiene su `apple-touch-icon` + meta etiquetas de pantalla completa. La confirmación final en un dispositivo real sigue siendo el checkpoint humano de 04-06, como estaba previsto.
- Ninguna dependencia nueva entró en `package.json` en este plan (`dependencies`/`devDependencies` idénticos a 04-01, solo se añadió un script npm).
- El plan 04-04 puede seguir precacheando `public/icons/*` vía globs de Workbox: los cuatro ficheros y sus tamaños en bytes quedan registrados arriba.
- Se deja documentada para 04-05/04-06 la discrepancia sobre `theme-color`: el módulo no lo inyecta automáticamente en esta configuración (a diferencia de lo que asumía la redacción de este plan); no se ha tocado nada al respecto porque no es parte del contrato de verificación de este plan.

---
*Phase: 04-instalaci-n-y-funcionamiento-offline*
*Completed: 2026-08-31*

## Self-Check: PASSED

- FOUND: scripts/pwa/generate-icons.mjs
- FOUND: public/icons/icon-192.png
- FOUND: public/icons/icon-512.png
- FOUND: public/icons/icon-512-maskable.png
- FOUND: public/icons/apple-touch-icon.png
- FOUND: commit 564fb68
- FOUND: commit 53936a8
