# TableGameAssistant

Web-asistente para juegos de mesa complejos, pensada para usarse en una tablet apoyada junto a la partida: eliges el juego, indicas nº de jugadores y dificultad, y pulsas «Siguiente» paso a paso hasta terminar la preparación de mesa. Primer juego soportado: Marvel Champions (Warhammer 40.000 llegará después).

## Requisitos

- **Node 22** (probado con 22.17.1; Nuxt/Nitro declaran un rango de motor ligeramente superior, `npm install` puede emitir warnings `EBADENGINE` — no bloquean nada).
- npm (incluido con Node).

## Comandos

```bash
npm install       # instala dependencias
npm run dev       # servidor de desarrollo en http://localhost:3000
npm run test      # suite de Vitest (motor + contenido) — debe terminar en verde antes de cualquier commit
npm run generate  # build estático de producción (SSG) en .output/public
```

## Despliegue

La app está publicada en **https://tabletop-assistant.vercel.app/**

El despliegue es automático por push: Vercel detecta Nuxt y construye con el preset `vercel` de Nitro, así que cada push a `main` se publica solo. El gate de CI (`.github/workflows/ci.yml`) ejecuta `npm run test` en paralelo; si la validación de contenido falla, el fallo es visible en el commit.

Las cabeceras de caché **no** viven en configuración del host, sino en `nitro.routeRules` dentro de `nuxt.config.ts`: Nitro las traduce al preset de destino, de modo que hay una única fuente de verdad y cambiar de hosting no obliga a reescribirlas. Ahí está declarado el `Cache-Control: no-cache` de `/sw.js` y `/manifest.webmanifest` que evita que la tablet se quede con una versión vieja cuando llegue el service worker en la Fase 4.

## Estructura relevante

- `engine/` — motor de flujo puro en TypeScript (sin Vue/Nuxt/DOM), testeado con Vitest.
- `content/*.json` — contenido de cada juego (pasos de preparación, citas al reglamento oficial), validado con Zod en CI.
- `app/` — páginas y componentes Nuxt (UI tablet-first, tema oscuro).
- `nuxt.config.ts` — configuración de Nuxt, rutas prerenderizadas y cabeceras de caché (`routeRules`).
