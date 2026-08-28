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

El despliegue es automático por push: una vez conectado el repositorio de GitHub a Netlify (ver `netlify.toml`, comando de build `npm run generate`, directorio de publicación `.output/public`), cada push a `main` que pase el gate de CI (`.github/workflows/ci.yml`) se publica solo. No hace falta ningún paso manual adicional tras la conexión inicial.

## Estructura relevante

- `engine/` — motor de flujo puro en TypeScript (sin Vue/Nuxt/DOM), testeado con Vitest.
- `content/*.json` — contenido de cada juego (pasos de preparación, citas al reglamento oficial), validado con Zod en CI.
- `app/` — páginas y componentes Nuxt (UI tablet-first, tema oscuro).
- `netlify.toml` — configuración de build y cabeceras de caché para el despliegue.
