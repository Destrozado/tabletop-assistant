---
id: wr-03-workbox-precachea-el-sdk-de-firebase
created: 2026-09-23
source: 10-REVIEW.md (WR-03), confirmado por el orquestador contra el código
severity: warning
area: PWA / presupuesto de descarga
status: pending
resolves_phase:
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
