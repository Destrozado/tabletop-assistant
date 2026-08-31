---
phase: 04-instalaci-n-y-funcionamiento-offline
plan: 05
subsystem: pwa
tags: [vite-pwa, service-worker, vue, composable, playwright, update-prompt]

# Dependency graph
requires:
  - phase: 04-01-instalacion-vite-pwa
    provides: "@vite-pwa/nuxt@1.1.1 con registerType 'prompt' y client.registerPlugin:true, que expone $pwa en el cliente"
  - phase: 04-03-montaje-playwright-y-verificacion-offline
    provides: "playwright.config.ts, webServer contra build real (nuxt generate + nuxi preview), suite pwa-install.spec.ts/offline-flow.spec.ts ya existentes"
provides:
  - "app/composables/useUpdatePrompt.ts: shouldShowUpdateBanner (función pura) + buildUpdatePrompt (testeable con doble de $pwa) + useUpdatePrompt (cableado real con Nuxt)"
  - "app/components/UpdateBanner.vue: banda descartable no modal con botones Actualizar/Cerrar aviso"
  - "app/app.vue monta <UpdateBanner /> dentro de #app-root, envuelta en ClientOnly, visible en las dos rutas prerenderizadas"
  - "e2e/update-banner.spec.ts: prueba que la banda no aparece sin versión nueva y que la app NUNCA se recarga sola ni cambia de controlador espontáneamente"
affects: [04-06-checkpoint-humano-tablet]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lógica de banda descartable extraída en una función factory (buildUpdatePrompt) que acepta un doble de $pwa, separada del wrapper que llama a useNuxtApp() — permite testear con Vitest en node sin contexto de Nuxt"
    - "Normalización defensiva de $pwa.needRefresh (boolean puro O Ref<boolean> sin desenvolver) documentada en el propio composable"

key-files:
  created:
    - app/composables/useUpdatePrompt.ts
    - app/composables/__tests__/useUpdatePrompt.test.ts
    - app/components/UpdateBanner.vue
    - e2e/update-banner.spec.ts
    - .planning/phases/04-instalaci-n-y-funcionamiento-offline/deferred-items.md
  modified:
    - app/app.vue

key-decisions:
  - "$pwa.needRefresh se lee con un normalizador (readNeedRefresh) que admite boolean puro Y {value: boolean}: la versión instalada (@vite-pwa/nuxt 1.1.1) construye $pwa con reactive(...), que desenvuelve refs anidados, así que needRefresh llega como boolean puro en runtime — distinto de lo que sugería la documentación citada en 04-RESEARCH.md (Ref<boolean> sin desenvolver). Se admiten ambas formas para no acoplar el código a un detalle interno de una versión concreta."
  - "La lógica de useUpdatePrompt() se dividió en buildUpdatePrompt(pwa) (testeable, sin Nuxt) y useUpdatePrompt() (wrapper de una línea que llama a useNuxtApp()), no exigido literalmente por el contrato de interfaces pero permitido por él — así los 7 casos del bloque <behavior>, incluido el try/catch de applyUpdate(), se cubren con Vitest puro sin necesitar @nuxt/test-utils ni contexto de Nuxt real."
  - "Tarea 1 ejecutada con ciclo TDD real: commit RED (tests, con useUpdatePrompt.ts movido temporalmente fuera del árbol para confirmar el fallo por módulo inexistente) seguido de commit GREEN (implementación, 285/285 tests en verde)."

requirements-completed: [OFF-04]

# Metrics
duration: ~55min
completed: 2026-08-31
---

# Fase 4 Plan 05: Banda de "versión nueva" (OFF-04) Summary

**Composable `useUpdatePrompt` (función pura testeada + cableado con `$pwa`), banda `UpdateBanner.vue` montada globalmente en `app.vue`, y prueba Playwright que demuestra que la app nunca se recarga sola ni cambia de controlador de forma espontánea.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-08-31T12:57Z (aprox.)
- **Tasks:** 2/2
- **Files modified:** 6 (4 creados + `app/app.vue` modificado + `deferred-items.md` creado)

## Accomplishments

- `registerType: 'prompt'` (04-01) tiene ahora superficie visible real: sin este plan, "prompt" equivalía en la práctica a "nunca se actualiza".
- La regla "cuándo se muestra la banda" está aislada en una función pura (`shouldShowUpdateBanner`) y testeada con los 7 casos exigidos por el plan, incluido el tri-estado `null`/`undefined` y el try/catch de `applyUpdate()` (síncrono y asíncrono).
- La banda vive en `app.vue`, el único punto compartido por las dos rutas prerenderizadas — aparece tanto en el selector de juego como en la pantalla de partida.
- Playwright demuestra la garantía dura de OFF-04: un marcador en `window` sobrevive 10s reales con el service worker activo, sin ningún `controllerchange` espontáneo — la app no se recarga sola.
- Ninguna afordancia de depuración/demo se ha colado en producción para forzar la banda (verificado por grep, ver más abajo).
- 285/285 tests de Vitest en verde (278 antes de este plan + 7 nuevos).

## Task Commits

Cada tarea se comprometió atómicamente, con ciclo TDD real en la Task 1:

1. **Task 1 (RED): tests de useUpdatePrompt** — `c0861bd` (test) — confirmado en rojo moviendo temporalmente `useUpdatePrompt.ts` fuera del árbol de trabajo antes de comprometer.
2. **Task 1 (GREEN): implementación de useUpdatePrompt** — `7d9c869` (feat) — 285/285 tests en verde tras restaurar el fichero.
3. **Task 2: banda, montaje global y prueba de no-recarga** — `5aa4025` (feat)

**Plan metadata:** (pendiente, se añade en el commit final de este plan por el orquestador)

## Files Created/Modified

- `app/composables/useUpdatePrompt.ts` - `shouldShowUpdateBanner` (función pura, tri-estado), `buildUpdatePrompt` (factory testeable con un doble de `$pwa`), `useUpdatePrompt` (wrapper real que llama a `useNuxtApp()` dentro de su cuerpo, nunca en el ámbito del módulo).
- `app/composables/__tests__/useUpdatePrompt.test.ts` - 7 tests numerados en español cubriendo los 7 casos del bloque `<behavior>` del plan.
- `app/components/UpdateBanner.vue` - banda no modal, calcada de `VoiceUnavailableNotice.vue`, con `h2`/`p`/botón "Actualizar" y botón de cierre `aria-label="Cerrar aviso"`.
- `app/app.vue` - monta `<UpdateBanner />` dentro de `#app-root`, envuelta en `<ClientOnly>`, antes de `<NuxtPage />`. Guardia de orientación (`#orientation-guard`, clase `portrait:hidden`, textos "Girad la tablet"/"Esta aplicación se usa en horizontal") sin tocar — `git diff app/app.vue` no muestra ninguna línea eliminada, solo la inserción del bloque nuevo.
- `e2e/update-banner.spec.ts` - 3 tests: banda ausente sin versión nueva, marcador de `window` + ausencia de `controllerchange` durante 10s con SW activo, `registration.waiting === null` sin build nueva.
- `.planning/phases/04-instalaci-n-y-funcionamiento-offline/deferred-items.md` (nuevo) - documenta un fallo preexistente y ajeno detectado en `e2e/offline-flow.spec.ts` (ver "Deviations" más abajo).

## Decisions Made

- **`$pwa.needRefresh` en runtime es `boolean` puro, no `Ref<boolean>` sin desenvolver.** Confirmado leyendo `node_modules/@vite-pwa/nuxt/dist/runtime/plugins/pwa.client.js`: el plugin construye `$pwa` con `reactive({ ...needRefresh, updateServiceWorker, ... })`, y `reactive()` desenvuelve automáticamente los refs anidados de nivel superior. El ejemplo de 04-RESEARCH.md (`$pwa?.needRefresh?.value`) documentaba la API oficial de forma genérica, pero con la versión instalada ese `.value` no existe — se implementó un normalizador (`readNeedRefresh`) que admite las dos formas (`boolean` directo o `{ value: boolean }`) para no romper si una versión futura del módulo cambia esta implementación interna.
- **`buildUpdatePrompt(pwa)` extra, no exigido por el contrato de interfaces pero permitido por él**, para poder testear con Vitest puro (sin `@nuxt/test-utils`) el descarte de sesión y el try/catch de `applyUpdate()` sin invocar `useNuxtApp()`.
- **Ciclo TDD real en la Task 1**: se comprobó el fallo RED de verdad (moviendo el fichero de implementación fuera del árbol antes del primer commit), no solo se escribieron test+implementación juntos.

## Deviations from Plan

### Fuera de alcance detectado (no arreglado, Regla de scope boundary)

**1. `e2e/offline-flow.spec.ts` tiene un locator de botón desactualizado**
- **Encontrado durante:** verificación de la Task 2 (`npx playwright test`).
- **Síntoma:** el test "selector -> mini-setup -> preparación con la red cortada..." busca un botón `'Marvel Champions: El Juego de Cartas'`, pero el DOM real renderiza `"Marvel Champions"` a secas.
- **Confirmado NO relacionado con este plan:** se movieron temporalmente `app/app.vue`, `app/components/UpdateBanner.vue` y `e2e/update-banner.spec.ts` fuera del árbol de trabajo (dejando el repo en el estado exacto del commit `7d9c869`, sin ningún cambio de la Task 2) y se volvió a ejecutar `npx playwright test e2e/offline-flow.spec.ts`: el mismo test falla exactamente igual.
- **Acción tomada:** documentado en `deferred-items.md`, NO arreglado — el fichero es propiedad del plan 04-03 (ya cerrado), fuera de la lista `<files>` de este plan.
- **Impacto en el acceptance criteria de la Task 2** ("los tres ficheros spec en verde"): `pwa-install.spec.ts` (4/4) y `update-banner.spec.ts` (3/3, los dos específicos de este plan) están en verde; `offline-flow.spec.ts` tiene 1/2 tests rotos por esta causa ajena y preexistente, no por OFF-04 ni por la banda de actualización.

---

**Total deviations:** 1 hallazgo fuera de alcance documentado, 0 auto-fixes de código de producción de este plan.
**Impacto en el plan:** Ninguno sobre el alcance de OFF-04 — la banda y la garantía de no-recarga están completas y verificadas; el fallo ajeno queda declarado para quien corresponda (plan 04-06 o mantenimiento de 04-03).

## Issues Encountered

Ninguno bloqueante. La única fricción fue confirmar el comportamiento real de `$pwa.needRefresh` (ver "Decisions Made" arriba), resuelta leyendo el código fuente del plugin instalado en `node_modules` en vez de fiarse solo de la documentación citada en 04-RESEARCH.md.

## Cobertura de Vitest vs. checkpoint humano (para el plan 04-06)

- **Cubierto por Vitest (7/7 casos del bloque `<behavior>`):** los 5 casos de `shouldShowUpdateBanner` (función pura, sin Nuxt) + el descarte de sesión (`dismissUpdate()` sticky, caso 6) + `applyUpdate()` nunca lanza, ni con `$pwa` undefined, ni con `updateServiceWorker` reventando de forma síncrona, ni con una promesa rechazada (caso 7). Los dos últimos usan `buildUpdatePrompt(pwaDouble)`, sin invocar `useNuxtApp()`.
- **NO cubierto por Vitest, y explícitamente fuera de alcance de este plan:** que `useUpdatePrompt()` en sí (el wrapper que llama a `useNuxtApp()`) funcione dentro de un componente Vue real montado por Nuxt, y sobre todo, que la banda **APAREZCA DE VERDAD** cuando se publica una versión nueva real. Esto requeriría dos builds distintas servidas desde el mismo origen o una afordancia de depuración en producción — ambas prohibidas por el plan (T-04-15). Queda para el checkpoint humano del plan 04-06.

### Cómo un humano puede disparar la banda en la tablet real tras un despliegue real (pasos para 04-06)

1. Tener la app ya instalada/abierta en la tablet (con una build anterior servida y controlada por el service worker).
2. Publicar una build nueva en Vercel (push a `main`).
3. En la tablet, sin cerrar la pestaña, esperar a que el navegador compruebe `sw.js` (Workbox lo hace en cada `page.goto`/foco de pestaña gracias a las cabeceras `no-cache` de `/sw.js`) o forzar una recarga manual de la página (NO de la app instalada como tal, solo un refresco normal) para que el navegador descubra el `sw.js` nuevo.
4. En cuanto el nuevo service worker queda en estado `waiting`, `$pwa.needRefresh` pasa a `true` y la banda "Nueva versión disponible" debería aparecer en la parte superior de cualquier pantalla (selector o partida en curso), sin bloquear el botón SIGUIENTE.
5. Verificar: (a) que la banda se puede cerrar con el botón "✕" (`aria-label="Cerrar aviso"`) y no vuelve a aparecer en esa sesión aunque se navegue entre pantallas; (b) que pulsar "Actualizar" aplica la versión nueva de inmediato y la partida en curso se reanuda en el mismo paso tras el refresco.

### Texto final de la banda (verbatim, para que el tester humano sepa qué buscar)

- Título (`h2`): **"Nueva versión disponible"**
- Cuerpo (`p`): **"Podéis seguir jugando y aplicarla cuando queráis: la partida se reanuda en el mismo paso."**
- Botón de acción: **"Actualizar"**
- Botón de cierre: icono **"✕"**, `aria-label="Cerrar aviso"`

### Confirmación: el descarte es solo en memoria (D-01)

```
$ grep -c "localStorage\|usePersistedSession" app/composables/useUpdatePrompt.ts
0
```
El `ref(false)` de `dismissed` vive dentro de `buildUpdatePrompt()`, se recrea con cada montaje del componente (una vez por sesión de app real, ya que `UpdateBanner` se monta una sola vez en `app.vue`) y nunca se escribe en ningún almacenamiento del navegador.

## Propiedades reales de `$pwa` usadas (para 04-06)

- `$pwa.needRefresh` — existe en runtime como `boolean` puro (no `Ref<boolean>` sin desenvolver, ver "Decisions Made"). Usado para decidir si se pinta la banda.
- `$pwa.updateServiceWorker(true)` — existe, `(reloadPage?: boolean) => Promise<void>`. Usado en `applyUpdate()` dentro de un `try/catch` que también cubre el caso de promesa rechazada.
- `$pwa.offlineReady` — existe en la interfaz `PwaInjection` del módulo instalado pero **no se usa** en este plan (fuera del alcance de OFF-04; es la señal de "ya funciona offline", no de "hay versión nueva").

## User Setup Required

Ninguno — no se ha añadido ninguna dependencia nueva ni configuración de servicio externo.

## Next Phase Readiness

- OFF-04 queda cubierto por código y por Vitest; el plan 04-06 puede ejecutar su checkpoint humano contra un despliegue real siguiendo los pasos documentados arriba.
- `nuxt.config.ts` no se ha tocado en este plan (propiedad exclusiva del plan 04-04, que corre en paralelo) — sin conflictos de fichero.
- Pendiente para 04-06 o para quien cierre la fase: el locator desactualizado de `e2e/offline-flow.spec.ts` documentado en `deferred-items.md`.

---
*Phase: 04-instalaci-n-y-funcionamiento-offline*
*Completed: 2026-08-31*

## Self-Check: PASSED

Ficheros verificados con `ls -la` (existen todos):
- `app/composables/useUpdatePrompt.ts`
- `app/composables/__tests__/useUpdatePrompt.test.ts`
- `app/components/UpdateBanner.vue`
- `e2e/update-banner.spec.ts`
- `app/app.vue`
- `.planning/phases/04-instalaci-n-y-funcionamiento-offline/deferred-items.md`
- `.planning/phases/04-instalaci-n-y-funcionamiento-offline/04-05-SUMMARY.md`

Commits verificados con `git log --oneline --all` (existen todos): `c0861bd` (test, RED), `7d9c869` (feat, GREEN), `5aa4025` (feat, Task 2).
