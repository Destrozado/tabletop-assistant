---
id: wr-03-workbox-precachea-el-sdk-de-firebase
created: 2026-09-23
source: 10-REVIEW.md (WR-03), confirmado por el orquestador contra el código
severity: warning
area: PWA / presupuesto de descarga
status: completed
resolves_phase:
resolved: 2026-09-23
resolved_by: quick-260923-3rk
---

# Workbox precachea los chunks del SDK de Firebase para todo el mundo

## Qué pasa

En `nuxt.config.ts`, `workbox.globPatterns` incluye `'**/*.{js,css,html}'`, que alcanza **todos**
los chunks `_nuxt/*.js`, incluidos los tres que contienen el SDK de Firebase (medidos por
`e2e/bundle-budget.spec.ts`: 31.999, 127.233 y 555.902 bytes). `globIgnores` no excluye ninguno, y
los tres están por debajo del `maximumFileSizeToCacheInBytes` por defecto de Workbox.

Resultado: al instalar el service worker, **cualquier visitante** se descarga y precachea ~715 KB
de SDK de Firebase, aunque el SDK no se ejecute nunca en el arranque (SYNC-05 sigue siendo cierto:
no está en los chunks *iniciales*) y aunque el respaldo esté sin configurar.

Contradice el espíritu de D-13: sin las cuatro variables `NUXT_PUBLIC_FIREBASE_*`, la
sincronización es un no-op completo — pero su coste de descarga no lo es.

Además, precachear el SDK *para uso offline* no tiene sentido por construcción: sin red no hay
nada que sincronizar, así que tener el SDK disponible sin red no habilita nada.

## Por qué no se arregló en la Fase 10

Deuda consciente al cerrar la fase. Toca `nuxt.config.ts`, que es territorio de COMP-03: cualquier
cambio ahí obliga a volver a pasar el gate de regresión del camino de actualización de la PWA
(`e2e/update-banner.spec.ts`, test 4).

## Arreglo sugerido

Identificar los chunks del SDK por su marca real —`@firebase/`, nunca `firebase` a secas, que
también aparece en el literal `import('firebase/...')` de un chunk inicial— y excluirlos vía
`globIgnores`. Después, volver a correr `npx playwright test e2e/update-banner.spec.ts` y
`e2e/offline-flow.spec.ts` completos.

Relacionado: [[wr-02-sin-timeout-en-llamadas-de-red-de-sync]]

## Resolución (quick 260923-3rk, 2026-09-23)

Mecanismo: hook `pwa:beforeBuildServiceWorker` de `@vite-pwa/nuxt` (declarado en
`nuxt.config.ts`) que llama a `excludeFirebaseSdkFromPrecache` (nuevo
`scripts/pwa/firebase-sdk-precache.ts`) justo antes de que Workbox genere `sw.js`.
El helper identifica los chunks del SDK por CONTENIDO — semillas que incluyen la
marca de ámbito `@firebase/` (nunca `firebase` a secas, que también aparece en el
`import('firebase/...')` diferido de `useHistorySync.ts` y en la fachada de
`firebase/app`) — y cierra las fachadas hasta punto fijo siguiendo sus imports
estáticos (`./X.js`). Amplía `options.workbox.globIgnores` con un array NUEVO
(nunca `push` sobre la referencia que declara `nuxt.config.ts`, así que el hook es
idempotente si corre más de una vez). Dos guardas con `throw` (aborta `nuxt
generate`, nunca degrada a precachear todo): (i) integridad — un chunk no excluido
que importara estáticamente uno excluido quedaría varado sin red; (ii) HTML — un
chunk excluido referenciado por el HTML de arranque de alguna ruta rompería su
arranque sin red.

Cifras REALES medidas en esta ejecución (coinciden con las de la planificación):
4 chunks excluidos, 715 815 bytes totales (3 semillas: 31 999 + 127 233 + 555 902 B,
más la fachada de `firebase/app`, 681 B). Entradas de precacheo de `sw.js`: 76 antes
de la exclusión (incluye `manifest.webmanifest` duplicado) → 72 después. Verificado
también contra el preset de producción `NITRO_PRESET=vercel`: misma exclusión (4
chunks, 715 815 B), comprobación `OK` (RED antes de este arreglo, con los 3 chunks
semilla precacheados).

Tests que lo demuestran:
- `e2e/bundle-budget.spec.ts` (bloque nuevo WR-03): oráculo independiente sobre el
  `sw.js` real — RED confirmado antes de implementar (3 chunks marcados
  filtrando), GREEN después (2/2 tests, 0 flaky).
- `scripts/pwa/__tests__/firebase-sdk-precache.test.ts` (proyecto Vitest nuevo
  `build-tooling`): 22/22 tests, incluidas las dos guardas con ciclo RED→GREEN
  real (3 casos en RED antes de implementarlas).
- Comprobación del preset de Vercel (Task 3): `OK` sobre `.vercel/output/static`.
- `e2e/update-banner.spec.ts` y `e2e/offline-flow.spec.ts` completos, más
  `pwa-install.spec.ts`: 15/15 tests en verde, 0 flaky — el camino de actualización
  (COMP-03) y el arranque sin red no cambiaron.

Compromiso aceptado: tras un despliegue que cambie el hash del SDK, una pestaña
con la build vieja puede recibir un 404 en el `import()` diferido de
`useHistorySync.ts` hasta que se aplique la banda de actualización — `flush()`
ya captura ese rechazo (WR-02) y las partidas quedan pendientes sin pérdida de
datos.
