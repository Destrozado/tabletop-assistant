---
quick_id: 260831-mgd
slug: quitar-guarda-orientacion
subsystem: UI / PWA
tags: [orientacion, playwright, requirements, css]
requires: []
provides:
  - "app usable en vertical (tablet y móvil) sin overlay de bloqueo"
  - "e2e/portrait-usable.spec.ts como regresión permanente"
affects:
  - app/app.vue
  - playwright.config.ts
  - .planning/REQUIREMENTS.md
tech-stack:
  added: []
  patterns:
    - "RED/GREEN con Playwright: la spec de regresión se escribe y se ve fallar con el bug todavía presente, antes de arreglarlo"
key-files:
  created:
    - e2e/portrait-usable.spec.ts
  modified:
    - app/app.vue
    - playwright.config.ts
    - .planning/REQUIREMENTS.md
decisions:
  - "El truncamiento de la cabecera en 412px (D-Q1) se deja tal cual: es una degradación aceptada, no un defecto a corregir en esta quick"
  - "Solo se assertó ausencia de scroll horizontal (D-Q4), nunca vertical, para no volver frágil la prueba ante pasos con texto largo en el futuro"
metrics:
  duration: "~25 min"
  completed: "2026-08-31"
---

# Quick 260831-mgd: Quitar guarda de orientación Summary

Se retira la guarda CSS `portrait:hidden`/`#orientation-guard` de `app/app.vue` que ocultaba
toda la app en vertical tras un cartel «Girad la tablet», resolviendo la contradicción con D-08
(el manifiesto ya no forzaba orientación, pero el CSS sí lo hacía).

## Qué se hizo

**Task 1 (RED):** se creó `e2e/portrait-usable.spec.ts` con 2 tests —tablet 820x1180 y móvil
412x915— y se ejecutó **con la guarda todavía puesta**. Falló exactamente por el motivo
correcto.

**Task 2 (GREEN):** se retiró el `class="portrait:hidden"` de `#app-root` y se borró entero el
bloque `#orientation-guard` (comentario, `<div>`, `<h1>Girad la tablet</h1>` y `<p>`) de
`app/app.vue`. Se actualizó el comentario de `playwright.config.ts` que justificaba el viewport
apaisado por la guarda (ahora explica que sigue siendo la orientación real de uso, pero ya no es
obligatorio). Se reescribieron dos líneas de `.planning/REQUIREMENTS.md`: UI-04 y la fila de
no-objetivo antes llamada «Modo retrato».

## Evidencia del RED (Task 1)

Salida literal de `npx playwright test e2e/portrait-usable.spec.ts` con la guarda puesta —
**2 failed**, ambos por el motivo correcto (`#app-root` resuelto pero `hidden`, no por selector
roto, timeout de navegación ni error de compilación):

```
1) [chromium] › e2e/portrait-usable.spec.ts:15:3 › Tablet en vertical (820x1180) › el selector, el mini-setup y la pantalla de juego son usables sin la guarda de orientación

    Error: expect(locator).toBeVisible() failed

    Locator:  locator('#app-root')
    Expected: visible
    Received: hidden
    Timeout:  5000ms

    Call log:
      - Expect "toBeVisible" with timeout 5000ms
      - waiting for locator('#app-root')
        14 × locator resolved to <div id="app-root" class="portrait:hidden">…</div>
           - unexpected value "hidden"

2) [chromium] › e2e/portrait-usable.spec.ts:70:3 › Móvil en vertical (412x915) › la app renderiza y no desborda horizontalmente (degradación de cabecera aceptada, D-Q1)

    Error: expect(locator).toBeVisible() failed

    Locator:  locator('#app-root')
    Expected: visible
    Received: hidden
    Timeout:  5000ms
      - waiting for locator('#app-root')
        14 × locator resolved to <div id="app-root" class="portrait:hidden">…</div>
           - unexpected value "hidden"

  2 failed
```

## Estado final tras el GREEN (Task 2)

- `npm run test` → **293 passed (293)** — sin cambios respecto a la base.
- `npx playwright test` → **11 passed (11)** — los 9 existentes (offline-flow ×2, pwa-install
  ×4, update-banner ×3) más los 2 nuevos de `portrait-usable.spec.ts`, todos en verde.
- `npm run generate` → completa sin error, genera `.output/public` con service worker y
  precache de 66 entradas.

### Confirmaciones de las prohibiciones duras

- `grep -c "NuxtPwaManifest" app/app.vue` → `1`, y aparece en la línea 12, **antes** de
  `id="app-root"` en la línea 13. `<NuxtPwaManifest />` no se movió ni se envolvió.
- El manifiesto sigue **sin** `orientation`: el test 2 de `e2e/pwa-install.spec.ts`
  (`expect(manifest).not.toHaveProperty('orientation')`) está entre los 11 en verde y no se
  tocó.
- `<ClientOnly><UpdateBanner /></ClientOnly>` y el comentario "Rule 2 (04-02)" quedan byte a
  byte idénticos (confirmado con `git diff app/app.vue`: el único contenido borrado es el
  bloque de la guarda y el atributo `class` de `#app-root`).
- `grep -rn "portrait:hidden\|portrait:flex"` en `app/`, `e2e/`, `playwright.config.ts` y
  `nuxt.config.ts` no devuelve nada — sin referencias vivas a la guarda.

## Wording nuevo

**UI-04** (`.planning/REQUIREMENTS.md` línea 73):
> `- [x] **UI-04**: La interfaz está optimizada para horizontal y en vertical sigue siendo utilizable: no hay ninguna guarda que oculte la app al rotar el dispositivo (D-08, Fase 4)`

**Fila de no-objetivo** (antes «Modo retrato», línea 144):
> `| Trabajo responsive para retrato y móvil | Usar la app en vertical está permitido y no se bloquea (D-08, Fase 4), pero el diseño se optimiza para la tablet en horizontal, que es como se usa junto a la mesa. En pantallas estrechas se ve peor —la cabecera llega a truncar `PREPARACIÓN · 1 de 23`— y eso es aceptable y esperado, no un defecto a corregir |`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - ajuste de redacción] Se evitó repetir el literal `portrait:hidden` en comentarios de prosa**
- **Encontrado durante:** Task 2, al verificar el criterio de aceptación
  `grep -rn "portrait:hidden\|portrait:flex" ... playwright.config.ts ... e2e/` — el propio
  texto de la `<action>` de la Tarea 2 pedía escribir esa cadena literal en el comentario nuevo
  de `playwright.config.ts`, lo que habría hecho fallar mecánicamente su propio criterio de
  aceptación (que barre `e2e/` y `playwright.config.ts` en busca de exactamente esa cadena).
- **Fix:** se reformuló el comentario de `playwright.config.ts` y la línea de comentario
  equivalente en `e2e/portrait-usable.spec.ts` (Task 1, ya escrita) para describir la guarda
  retirada sin citar el nombre exacto de la clase de Tailwind, preservando el mismo significado.
- **Ficheros modificados:** `playwright.config.ts`, `e2e/portrait-usable.spec.ts`.
- **Commit:** `1cf1eda` (Task 2).

Ningún otro desvío. El resto del plan se ejecutó tal cual estaba escrito, incluyendo el orden
RED → GREEN, las 5 prohibiciones y las 5 decisiones (D-Q1 a D-Q5).

## Known Stubs

Ninguno. Este cambio no introduce datos simulados ni componentes sin fuente de datos.

## Threat Flags

Ninguno. El cambio solo retira CSS y actualiza documentación/comentarios; no añade superficie de
red, autenticación, acceso a ficheros ni cambios de esquema.

## Self-Check: PASSED

- FOUND: `e2e/portrait-usable.spec.ts`
- FOUND: `app/app.vue` (sin `portrait:hidden` ni `#orientation-guard`)
- FOUND: `playwright.config.ts` (comentario actualizado, `1280x800` intacto)
- FOUND: `.planning/REQUIREMENTS.md` (UI-04 y fila de no-objetivo reescritas)
- FOUND commit `ab29f1d` (RED)
- FOUND commit `1cf1eda` (GREEN)
