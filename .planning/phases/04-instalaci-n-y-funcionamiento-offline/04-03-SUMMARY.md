---
phase: 04-instalaci-n-y-funcionamiento-offline
plan: 03
subsystem: testing
tags: [playwright, e2e, service-worker, offline, workbox, pwa, vitest]

# Dependency graph
requires:
  - phase: 04-instalaci-n-y-funcionamiento-offline (plan 01)
    provides: "@vite-pwa/nuxt instalado, bloque `pwa` mínimo en nuxt.config.ts, sin `icons` ni `workbox`"
  - phase: 04-instalaci-n-y-funcionamiento-offline (plan 02)
    provides: "iconos PWA, `<NuxtPwaManifest />` en app.vue, manifest.webmanifest completo"
provides:
  - "playwright.config.ts — runner de navegador separado de Vitest, sirve un build real de `nuxt generate` en el puerto 4173"
  - "e2e/pwa-install.spec.ts — 4/4 tests en verde: SW registrado, manifest, iconos, apple-touch-icon"
  - "e2e/offline-flow.spec.ts — definición ejecutable de OFF-02/OFF-03, hoy en ROJO desde el paso 3 (más severo de lo previsto)"
  - "Hallazgo crítico para 04-04: sin `workbox.globPatterns`, el precache de Workbox solo contiene 5 entradas de metadatos de build — CERO HTML/JS/CSS/audio"
affects: [04-04-workbox-globpatterns, 04-05-banda-actualizacion, 04-06-ci-playwright]

# Tech tracking
tech-stack:
  added: ["@playwright/test@1.62.1 (devDependency), navegador Chromium 1234 (Chrome for Testing 151.0.7922.34) cacheado en ~/Library/Caches/ms-playwright"]
  patterns:
    - "playwright.config.ts hermano y separado de vitest.config.ts (testDir: './e2e', sufijo .spec.ts, sin colisión de globs)"
    - "webServer con PORT=4173 vía env, no 3000 (deviation documentada abajo)"
    - "workers: 1 / fullyParallel: false — el estado de Cache Storage/SW es compartido entre tests"

key-files:
  created:
    - playwright.config.ts
    - e2e/pwa-install.spec.ts
    - e2e/offline-flow.spec.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Puerto 4173 en vez de 3000 (desviación explícita del plan, Rule 3): `nuxi preview` para el preset `static` delega en `npx serve public` (confirmado en `.output/nitro.json`), que respeta la variable de entorno `PORT` pero ignora el flag `-p`/`--port` de `nuxi preview` (verificado empíricamente con ambos). Además, el puerto 3000 es el mismo que usa `npm run dev` por defecto — con `reuseExistingServer: !process.env.CI`, cualquier desarrollador con `nuxt dev` abierto haría que Playwright reutilizase por error ese servidor (sin SW, `devOptions.enabled:false`) en vez del build real. 4173 es el puerto de vista previa habitual de Vite/Nuxt y evita esa colisión de forma permanente."
  - "NO se ha añadido el bloque `workbox` a nuxt.config.ts pese a que el hallazgo de este plan lo hace tentador — es tarea explícita de 04-04, y añadirlo aquí habría destruido la evidencia rojo→verde que este plan existe para producir."
  - "El id de audio del paso 7 se deriva de `readdirSync('public/audio')` en tiempo de test, no está escrito a mano — la prueba sigue siendo válida según se generen más de los 37 clips."

requirements-completed: []

# Metrics
duration: ~55min
completed: 2026-08-31
---

# Fase 4 Plan 03: Playwright sobre un build real — instalación en verde, offline en rojo (más rojo de lo previsto) Summary

**Playwright montado y separado de Vitest contra un build real de `nuxt generate`; la suite de instalación (SW/manifest/iconos) pasa 4/4, pero la suite de flujo offline revela que, sin `workbox.globPatterns`, el precache de Workbox no cubre ni siquiera el HTML de las rutas — un hallazgo más amplio del que anticipaba el plan, documentado aquí íntegro para que 04-04 sepa exactamente qué construir.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-08-31T14:20:00Z (aprox., tras `npm install` inicial del worktree)
- **Completed:** 2026-08-31T15:15:00Z
- **Tasks:** 2/2
- **Files modified:** 5 (`playwright.config.ts`, `e2e/pwa-install.spec.ts`, `e2e/offline-flow.spec.ts` nuevos; `package.json`, `package-lock.json` modificados)

## Accomplishments

- `@playwright/test@1.62.1` instalado en `devDependencies` (confirmado por lectura de `node_modules/@playwright/test/package.json`), navegador Chromium (Chrome for Testing 151.0.7922.34, `playwright chromium v1234`) descargado con `npx playwright install chromium` — no había ninguno cacheado en este entorno, tal como anticipaba `04-RESEARCH.md` §Environment Availability.
- `playwright.config.ts` creado, hermano y completamente separado de `vitest.config.ts`: `testDir: './e2e'`, viewport apaisado `1280×800` (comentado el motivo: `#app-root` se oculta con `portrait:hidden`), un único proyecto `chromium`, `webServer` que corre `npm run generate && npx nuxi preview` sirviendo el `.output/public` real, `workers: 1`/`fullyParallel: false` (Cache Storage/SW compartidos entre tests).
- `e2e/pwa-install.spec.ts`: **4/4 tests en verde**. Service worker registrado y activo con `scriptURL` terminado en `/sw.js`; `manifest.webmanifest` responde 200 con `display: standalone`, `start_url`/`scope: '/'` y sin `orientation` (D-08); 3 iconos declarados con uno `maskable`, cada `src` responde 200 con `content-type: image/png`; `<link rel="apple-touch-icon">` presente en el HTML y su `href` responde 200 (Pitfall 2 de `04-RESEARCH.md`).
- `e2e/offline-flow.spec.ts`: recorrido completo (selector → mini-setup → preparación → avance/retroceso → audio → recarga) con `context.setOffline(true)`, escrito exactamente con la estructura de un único test secuencial que pide el plan. **Falla, como estaba previsto que ocurriera con algo — pero antes y más ampliamente de lo que el plan anticipaba** (ver sección dedicada abajo). Ninguna aserción fue relajada, comentada ni marcada `.skip()`/`.fixme()` para maquillar el resultado (`grep -c "test.skip\|test.fixme\|\.skip("` → `0`); el id de audio se deriva de `public/audio/` en tiempo de ejecución, no está escrito a mano (`grep -c "setup.heroes.01.m4a"` → `0`).
- `npm run test` (Vitest) sigue en verde: **278/278**, mismo recuento que antes de este plan. `vitest.config.ts` sin ningún cambio (`git diff --name-only vitest.config.ts` vacío) — confirmado por lectura que los globs `engine/**/*.test.ts` y `app/**/*.test.ts` no alcanzan `e2e/*.spec.ts`, así que no había nada que "arreglar".
- Scripts `"e2e": "playwright test"` y `"e2e:install": "playwright install chromium"` añadidos a `package.json`. `"test"` (Vitest) sin tocar.
- CI (`.github/workflows/ci.yml`) **NO se ha tocado**, tal como exige el plan explícitamente — ese enganche es del plan 04-06.

## Task Commits

1. **Task 1: Montar Playwright sobre un build real y escribir la prueba de instalación** - `f7431d7` (feat)
2. **Task 2: Escribir la prueba de flujo completo sin conexión (roja hasta el plan 04-04)** - `6896eb5` (test)

**Plan metadata:** (pendiente, se añade en el commit final de este plan)

## Comando exacto que corre la suite, y cómo sirve el build

```bash
npx playwright test e2e/pwa-install.spec.ts --reporter=list   # 4/4 verde
npx playwright test e2e/offline-flow.spec.ts --reporter=list  # 2/2 rojo (ver detalle abajo)
npm run e2e                                                    # ambos ficheros, mismo webServer
```

`playwright.config.ts` orquesta automáticamente:
1. `npm run generate` — genera `.output/public` con el preset **`static`** (por defecto, sin `NITRO_PRESET`). El log de build confirma: `Prerendering 4 routes` → `/200.html`, `/404.html`, `/marvel-champions`, `/` → y además genera `/marvel-champions/_payload.json` y `/_payload.json` (preset `static`, a diferencia del preset `vercel` donde 04-01-SUMMARY.md observó que esos ficheros NO aparecían).
2. `PORT=4173 npx nuxi preview` — para el preset `static`, `nuxi preview` delega internamente en `npx serve public` (confirmado leyendo `.output/nitro.json` → `"commands": {"preview": "npx serve public"}`); `serve` respeta la variable de entorno `PORT` (verificado) pero **ignora** el flag `-p`/`-port` que sí acepta `nuxi preview` en su propio `--help` (verificado también, sin efecto en la práctica para el preset `static`).

**Preset usado: `static`** (el mismo camino feliz confirmado por 04-01). No se ha probado el preset `vercel` en este plan — el Pitfall 1 de `_payload.json` sigue siendo relevante porque el preset real de despliegue es `vercel` (CLAUDE.md §Hosting), y 04-01-SUMMARY.md ya advirtió que el comportamiento de `_payload.json` difiere entre presets. Queda para 04-04 decidir si repite esta verificación contra un build `vercel`.

## Task 1 — resultado literal (verde)

```
Running 4 tests using 1 worker

  ✓  1 [chromium] › e2e/pwa-install.spec.ts:11:3 › ... 1. al cargar "/", el service worker acaba registrado y activo... (149ms)
  ✓  2 [chromium] › e2e/pwa-install.spec.ts:23:3 › ... 2. GET /manifest.webmanifest responde 200... (59ms)
  ✓  3 [chromium] › e2e/pwa-install.spec.ts:35:3 › ... 3. el manifiesto declara 3 iconos, uno maskable... (58ms)
  ✓  4 [chromium] › e2e/pwa-install.spec.ts:50:3 › ... 4. el HTML de "/" contiene un <link rel="apple-touch-icon">... (95ms)

  4 passed (3.8s)
```
Código de salida: `0`.

## Task 2 — resultado literal (rojo, y por qué es MÁS rojo de lo previsto)

El plan preveía: *"Los pasos 1 a 6 y 8 deberían pasar ya (el precacheo por defecto del plugin cubre HTML, JS y CSS). El paso 7 está previsto que FALLE"*. **Esta asunción del plan resultó ser falsa en este build.** El fallo real ocurre ya en el **paso 3** (recargar la app sin red), antes incluso de llegar a interactuar con el selector de juego:

```
Running 2 tests using 1 worker

  ✘  1 [chromium] › ... selector -> mini-setup -> preparación con la red cortada... (1.4s)
  ✘  2 [chromium] › ... la ruta /marvel-champions se puede abrir directamente sin red... (1.2s)

  1) Error: page.reload: net::ERR_INTERNET_DISCONNECTED
     Call log:
       - waiting for navigation until "load"
     > 50 |     await page.reload()

  2) Error: page.goto: net::ERR_INTERNET_DISCONNECTED at http://localhost:4173/marvel-champions
     Call log:
       - navigating to "http://localhost:4173/marvel-champions", waiting until "load"
     > 121 |     await page.goto('/marvel-champions')

  2 failed
```
Código de salida: `1` (se esperaba un fallo — pero no este, ni aquí).

### Diagnóstico (investigación manual fuera del fichero de test, para documentar la causa raíz a 04-04)

Con el service worker activo (`navigator.serviceWorker.controller !== null` confirmado) se inspeccionó `caches.keys()`/`cache.keys()` desde dentro de la página. El precache de Workbox contiene **exactamente 5 entradas**, ninguna de ellas HTML/JS/CSS/audio:

```json
{
  "workbox-precache-v2-http://localhost:4173/": [
    "http://localhost:4173/_payload.json?__WB_REVISION__=...",
    "http://localhost:4173/marvel-champions/_payload.json?__WB_REVISION__=...",
    "http://localhost:4173/_nuxt/builds/latest.json?__WB_REVISION__=...",
    "http://localhost:4173/_nuxt/builds/meta/....json",
    "http://localhost:4173/manifest.webmanifest?__WB_REVISION__=..."
  ]
}
```

Esto coincide con lo que ya había registrado (sin analizarlo a fondo) `04-01-SUMMARY.md`: *"precache 5 entries (0.31 KiB)"*. La causa: `nuxt.config.ts` **no declara `pwa.workbox.globPatterns`** — a propósito, por instrucción explícita de los planes 04-01/04-02 (*"NO añadir todavía el bloque `workbox`: la configuración de `globPatterns` es del plan 04-04"*). Sin `globPatterns`, el escaneo de ficheros de Workbox sobre `.output/public` **no encuentra ningún fichero que precachear** — las 5 entradas que sí aparecen no vienen de ese escaneo, sino de una inyección directa que hace el propio `@vite-pwa/nuxt` (metadatos de build de Nuxt + `_payload.json` de cada ruta + el propio manifest). El propio `sw.js` generado registra `NavigationRoute(createHandlerBoundToURL("/"))`, pero la URL `"/"` **no está en el precache manifest** — esa ruta de navegación queda efectivamente sin destino cacheado, y por eso `page.reload()`/`page.goto()` sin red fallan con `ERR_INTERNET_DISCONNECTED` en vez de servirse desde caché.

**Implicación para 04-04, más amplia que "añadir audio":** el plan 04-04 no solo necesita añadir `audio/*.m4a` al precacheo — necesita **establecer `globPatterns` desde cero** para que HTML/JS/CSS (y los iconos) queden precacheados, siguiendo el `Pattern 1` de `04-RESEARCH.md` (`globPatterns: ['**/*.{js,css,html}', 'icons/*.png', 'manifest.webmanifest', 'audio/setup*.m4a']` o equivalente). Sin esa base, el offline actual no funciona en absoluto para NINGUNA navegación, ni siquiera cargar `/` de nuevo — no es solo "el audio falta".

### Estado de cada paso del test secuencial

| Paso | Descripción | Estado real | Motivo |
|---|---|---|---|
| 1 | Primera visita con red + recarga hasta que el SW controla la página | ✅ Verificado por separado (confirmado con el script de diagnóstico: `navigator.serviceWorker.controller !== null` tras recargar) | — |
| 2 | Cortar la red (`context.setOffline(true)`) | ✅ (llamada de Playwright, no falla nunca por sí sola) | — |
| **3** | **La app arranca sin red (`page.reload()` + botón del selector visible)** | ❌ **FALLA — `net::ERR_INTERNET_DISCONNECTED`** | Ver diagnóstico arriba: `"/"` no está en el precache, pese al `NavigationRoute` registrado |
| 4 | Navegación entre las 2 rutas prerenderizadas (Pitfall 1, `_payload.json`) | ⛔ No alcanzado (el test aborta en el paso 3) | Bloqueado por el paso 3 |
| 5 | Mini-setup sin red | ⛔ No alcanzado | Idem |
| 6 | Avanzar/retroceder pasos sin red | ⛔ No alcanzado | Idem |
| 7 | `fetch('/audio/<id>.m4a')` sin red | ⛔ No alcanzado como aserción del test, pero **confirmado por el reporte de `caches.keys()` que tampoco estaría cacheado** — coincide con la expectativa original del plan, solo que por una causa más amplia | Precache vacío de audio también |
| 8 | Recarga sin red con reanudación de partida | ⛔ No alcanzado | Idem |
| — | `/marvel-champions` accesible por `page.goto` directo sin red | ❌ **FALLA — mismo `ERR_INTERNET_DISCONNECTED`** | Misma causa raíz |

**Ningún paso llegó a ejecutarse como "verde" dentro del test de Playwright compilado**, porque la estructura pedida por el plan es un único test secuencial y el primer fallo aborta el resto — tal como exige `04-03-PLAN.md` (*"en un solo test secuencial para que el estado del service worker sea el real"*). Los pasos 1 y 2 se confirmaron aparte, con un script de diagnóstico desechable (no comprometido en el repo), precisamente para poder documentar aquí con precisión dónde empieza el fallo real sin alterar la estructura del fichero de test que el plan pide.

## Navegación offline entre rutas — independiente del audio

**No funciona hoy**, y no es por el Pitfall 1 (`_payload.json` con query string) específicamente — es más básico: ni siquiera el HTML de `/` está precacheado. Cuando 04-04 añada `globPatterns` cubriendo `**/*.html`, sí puede entonces aparecer el Pitfall 1 concreto (navegar del lado del cliente entre `/` y `/marvel-champions` pidiendo `_payload.json?query`) — pero eso todavía no se ha podido observar en este plan porque el fallo ocurre un nivel antes. Recomendación explícita para 04-04: repetir la prueba de navegación cliente-a-cliente (sin recargar la página, solo pulsando el botón del selector) una vez el HTML esté precacheado, para aislar si el Pitfall 1 aparece o no — el hallazgo A2 de `04-RESEARCH.md` sigue sin confirmar ni refutar en este preset.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Puerto 3000 sustituido por 4173 en `playwright.config.ts`**
- **Found during:** Task 1, al intentar verificar `nuxi preview` contra `http://localhost:3000` tal como especificaba el plan.
- **Issue:** `nuxi preview` para el preset `static` delega en `npx serve public` (`.output/nitro.json` → `commands.preview`); `serve` ignora el flag `-p`/`--port` que sí expone `nuxi preview --help`, y por tanto la única forma fiable de fijar el puerto es la variable de entorno `PORT`. Además, en este entorno concreto el puerto 3000 ya estaba ocupado por un proceso `nuxt dev` de otro checkout del mismo repo — con `reuseExistingServer: !process.env.CI`, Playwright habría reutilizado ese servidor de desarrollo (sin service worker, `devOptions.enabled:false`) en vez de levantar el build real, invalidando toda la suite en silencio. Este riesgo no es exclusivo de este entorno: cualquier desarrollador con `npm run dev` abierto en otra pestaña de terminal (puerto 3000 por defecto) sufriría la misma colisión silenciosa.
- **Fix:** `baseURL`/`webServer.url` cambiados a `http://localhost:4173` (puerto de vista previa habitual de Vite/Nuxt), y `webServer.env: { PORT: '4173' }` para que `serve` lo respete.
- **Files modified:** `playwright.config.ts`
- **Verification:** `curl http://localhost:4173/sw.js` → `200 application/javascript`; `curl http://localhost:4173/manifest.webmanifest` → `200 application/manifest+json`; ambas rutas de icono → `200 image/png`. Confirmado también que `npx playwright test e2e/pwa-install.spec.ts` pasa 4/4 contra este puerto.
- **Committed in:** `f7431d7` (Task 1)

**2. [Rule 1 - Bug] Comentario en `e2e/offline-flow.spec.ts` que contenía literalmente `.skip()` disparaba en falso el grep de verificación de "sin skips"**
- **Found during:** Task 2, al ejecutar la propia comprobación de aceptación `grep -c "test.skip\|test.fixme\|\.skip("`.
- **Issue:** un comentario explicativo citaba `.skip()` como ejemplo de lo que NO había que hacer, pero el propio grep mecánico de verificación no distingue comentarios de código real, así que devolvía `1` en vez de `0`.
- **Fix:** reformulado el comentario para no contener el patrón literal, sin cambiar su significado.
- **Files modified:** `e2e/offline-flow.spec.ts`
- **Verification:** `grep -c "test.skip\|test.fixme\|\.skip(" e2e/offline-flow.spec.ts` → `0`.
- **Committed in:** `6896eb5` (Task 2)

---

**Total deviations:** 2 auto-fixed (Rule 3, Rule 1). Ninguna afecta al contrato del plan ni relaja ninguna aserción de producto — ambas son correcciones de infraestructura de test.

## Hallazgo NO corregido a propósito (para 04-04)

El fallo de `e2e/offline-flow.spec.ts` en el paso 3 (precache vacío de HTML/JS/CSS por falta de `workbox.globPatterns`) **no se ha corregido**, tal como exige explícitamente `04-03-PLAN.md`: *"NO adelantar la configuración de precacheo a este plan"*. Este es el resultado esperado del enfoque "test antes que configuración" — simplemente resultó ser un rojo más amplio del que el propio plan anticipaba (basado en una asunción de RESEARCH.md que no se cumplió en este build: *"el precacheo por defecto del plugin cubre HTML, JS y CSS"*). Queda documentado íntegro arriba para que 04-04 lo tome como punto de partida exacto.

## Issues Encountered

- Ninguno bloqueante fuera de lo ya documentado en Deviations. Los warnings `EBADENGINE` (Node 22.17.1 vs `^22.19.0`) siguen presentes, preexistentes, no relacionados con este plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Para 04-04:** el trabajo no es "añadir audio a `globPatterns`", es "crear `globPatterns` desde cero" cubriendo como mínimo `**/*.{js,css,html}` + iconos + manifest + audio — sin eso, ni siquiera la carga de `/` sin red funciona. El `Pattern 1` de `04-RESEARCH.md` ya proponía exactamente esta forma; este plan confirma empíricamente que hace falta, no es opcional.
- Una vez 04-04 añada ese `globPatterns`, la recomendación es re-ejecutar `npx playwright test e2e/offline-flow.spec.ts` tal cual — ningún cambio de código en el fichero de test debería hacer falta para que los pasos 1-6 y 8 empiecen a pasar; el paso 7 (audio) es el que debe pasar a verde específicamente cuando se añada el patrón de audio.
- Pendiente confirmar contra el preset `vercel` si el Pitfall 1 de `_payload.json` con query string aparece o no una vez el HTML esté precacheado (no se pudo observar en este plan porque el fallo ocurre un nivel antes) — recomendado como parte de la verificación de 04-04.
- CI (`.github/workflows/ci.yml`) sigue sin el paso de Playwright, tal como exige este plan — lo añade 04-06 cuando toda la suite esté en verde.

---
*Phase: 04-instalaci-n-y-funcionamiento-offline*
*Completed: 2026-08-31*

## Self-Check: PASSED

- FOUND: playwright.config.ts
- FOUND: e2e/pwa-install.spec.ts
- FOUND: e2e/offline-flow.spec.ts
- FOUND: commit f7431d7
- FOUND: commit 6896eb5
