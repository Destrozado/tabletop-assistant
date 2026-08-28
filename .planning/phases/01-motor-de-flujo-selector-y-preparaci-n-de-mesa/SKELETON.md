# Walking Skeleton — TableGameAssistant

**Phase:** 1
**Generated:** 2026-08-28

## Capability Proven End-to-End

Un usuario abre `/marvel-champions` en un navegador con emulación de tablet en horizontal, ve el primer paso real de la preparación de mesa —leído del JSON de contenido versionado a través del cargador tipado y del motor puro— y avanza con SIGUIENTE, con la posición guardada en el navegador; la misma app se compila a estático desplegable con `npm run generate`.

### El esqueleto es la composición de tres planes, no un plan único

El Esqueleto Andante se entrega en **tres planes secuenciales**. Ninguno de los tres cierra el esqueleto por sí solo; los tres juntos sí, y antes de que empiece ninguna rebanada de anchura:

| Orden | Plan | Ola | Qué aporta al esqueleto |
|---|---|---|---|
| 1.º | `01-01-PLAN.md` | 1 | Scaffold de Nuxt 4 con SSG, tokens de diseño, guardia de orientación, gates de CI y `netlify.toml` preparado |
| 2.º | `01-07-PLAN.md` | 2 | Motor de flujo puro con sus tests, esquema Zod validado en CI y el primer contenido real (bloque HÉROES, 3 pasos citados) |
| 3.º | `01-08-PLAN.md` | 3 | Composables, las tres bandas de la UI y la página runner: el paso real en pantalla con SIGUIENTE/Atrás, prerenderizado a estático |

Se separaron así porque el motor es la pieza más crítica en corrección de todo el proyecto (TECH-03) y no debe ejecutarse arrastrada dentro de un plan de casi treinta ficheros: el riesgo no era el alcance sino el volumen. La escritura y lectura reales de `localStorage` —la otra mitad del elemento «datos» del esqueleto clásico— llega en el plan 01-04.

Los números 07 y 08 son **posteriores en numeración pero anteriores en ejecución** a 01-02..01-06: se eligieron para no renumerar planes ya verificados. La verdad de la ejecución son `wave` y `depends_on`, nunca el número de fichero.

> Esta app no tiene base de datos. El elemento «lectura y escritura reales de datos» del esqueleto andante clásico se corresponde aquí con dos cosas: la lectura real del contenido JSON a través del esquema Zod validado en CI, y la escritura y lectura reales del estado de sesión en `localStorage`.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Nuxt 4.5.x con `nuxt generate` (SSG, prerenderizado completo) | Decisión de usuario (Nuxt última versión) fijada en `CLAUDE.md`. `ssr: false` (SPA) queda descartado explícitamente: el prerenderizado da primer pintado instantáneo en la mesa y una salida estable y hasheada que el service worker de la Fase 4 podrá precachear sin lógica adicional |
| Capa de datos | Ficheros JSON versionados en `content/`, importados estáticamente en build; sin backend, sin base de datos, sin fetch en runtime | Restricción dura del proyecto: nada que administrar ni pagar. El fetch en runtime introduciría un estado de carga y una ruta de invalidación de caché ajena a la del propio build |
| Validación de contenido | Zod 4.x ejecutado solo en Node/CI dentro de una suite de Vitest; `zod` es devDependency y **nunca** se importa desde `app/` | Un fichero mal formado debe romper el build, no llegar a la tablet (TECH-02). Mantenerlo fuera del bundle de cliente evita peso innecesario en un dispositivo que además debe funcionar offline |
| Motor de flujo | Módulo TypeScript puro en `engine/`, en la raíz del repo (fuera de `srcDir`, que en Nuxt 4 es `app/`), con cero imports de Vue, Nuxt o DOM; se importa con el alias `~~/engine/...` | La corrección del cierre de bucle, el salto y la reanudación es la propiedad más importante del sistema y debe testearse con Vitest en entorno `node`, sin montar componentes. La frontera de pureza es un hecho físico del árbol de directorios, no una convención |
| Modelo de flujo | Autoría anidada (juego → sección → fase → paso) aplanada a un array ordenado en carga, más `loopStartIndex`/`loopEndIndex` calculados al iniciar sesión | El árbol se audita línea a línea contra el PDF del reglamento; el array es lo que la navegación necesita. En esta fase no hay sección repetible (llega en la Fase 2), así que ambos índices quedan `undefined` y el cierre de bucle se prueba contra un fixture |
| Estado y reactividad | Un composable único sobre `useLocalStorage` de VueUse como costura entre el motor puro y Vue; sin Pinia | Un solo motor de pasos activo a la vez; Pinia añadiría stores y devtools para un problema que no existe. Nada por encima del composable importa el motor directamente, y nada por debajo importa Vue |
| Persistencia | `localStorage`, clave `tga:progress:<gameId>`, forma `PersistedPosition` con `formatVersion` y `contentVersion`; lectura siempre post-montaje | Payload de decenas de bytes: IndexedDB sería complejidad sin problema que resolver. La lectura post-montaje evita desajustes de hidratación bajo prerenderizado |
| Autenticación | Ninguna, por diseño | Una sola tablet, un solo grupo, nada que sincronizar. No hay cuentas, ni sesiones de servidor, ni secretos en todo el proyecto |
| Estilos | Tailwind CSS v4 mediante `@tailwindcss/vite`, con los tokens de `01-UI-SPEC.md` declarados una sola vez en `@theme`; sin librería de componentes ni de iconos | El módulo comunitario `@nuxtjs/tailwindcss` está construido sobre la tubería PostCSS de v3 y no es el camino documentado para v4. La superficie de UI de la fase (6 pantallas, un solo tema oscuro, cromo de tablet a medida) no encaja con las primitivas de una librería general |
| Objetivo de despliegue | Netlify conectado a un repositorio de GitHub, despliegue automático por push, `netlify.toml` versionado | Netlify permite fijar cabeceras de respuesta, que es lo que hará falta para forzar `Cache-Control: no-cache` sobre `/sw.js` en la Fase 4. GitHub Pages queda descartado precisamente por no poder hacerlo |
| Estructura de directorios | `engine/` y `content/` en la raíz; `app/` como `srcDir` de Nuxt con `pages/`, `components/` y `composables/`; `netlify.toml`, `nuxt.config.ts` y `vitest.config.ts` en la raíz | Mantiene visible la frontera entre lógica pura, datos y aplicación; permitiría extraer `engine/` como paquete propio sin reescribir nada |

## Stack Touched in Phase 1

- [ ] Scaffold del proyecto (framework, build, runner de tests, workflow de CI) — plan 01-01
- [ ] Estilos y orientación — tokens de `01-UI-SPEC.md` en `@theme` y guardia de orientación por CSS — plan 01-01
- [ ] Motor puro y validación de contenido — `engine/` con tests y esquema Zod en CI — plan 01-07
- [ ] Rutas — `/[game]` (runner) en el plan 01-08 y `/` (selector) en el plan 01-02, ambas prerenderizadas
- [ ] Datos — lectura real de `content/marvel-champions.json` a través del esquema validado (planes 01-07 y 01-08); escritura y lectura reales de `localStorage` (plan 01-04)
- [ ] UI — pantalla de paso con SIGUIENTE/Atrás cableados al motor — plan 01-08
- [ ] Despliegue — `netlify.toml` y comandos locales documentados en el plan 01-01; publicación efectiva en el plan 01-06 (paso conjunto, D-16/D-17)

## Out of Scope (Deferred to Later Slices)

Explícitamente fuera del esqueleto y de la Fase 1 entera, para que ninguna fase posterior renegocie el minimalismo de esta:

- Bucle de ronda: fase de jugadores, fase del villano y fin de ronda (Fase 2). Ni siquiera una sección `round` vacía «para que el esquema no falle»: la invariante Zod queda relajada a «cero o una» sección repetible en esta fase, con un TODO para endurecerla en la Fase 2
- Ramas condicionales Héroe/Alter-Ego mostradas simultáneamente (ADAPT-04, Fase 2): el esquema de esta fase no lleva campo `branches`
- Locución por voz y bloqueo de pantalla (Fase 3). El campo `speech` **sí** existe ya en el esquema desde el primer commit (plan 01-07), para no retro-adaptar el contenido después, pero no se autora ni se consume en esta fase
- Instalación como PWA, service worker y funcionamiento offline (Fase 4). `@vite-pwa/nuxt` no se instala aquí; el `netlify.toml` sí deja preparadas las cabeceras de caché que ese módulo necesitará
- Bloqueo real de orientación por API o manifest: en esta fase la orientación se resuelve con un overlay bloqueante puramente CSS, porque `screen.orientation.lock()` solo funciona de forma fiable en contexto instalado o a pantalla completa
- Expansión por jugador (`perPlayer`) y sustitución de tokens numéricos: las decisiones D-02 y D-08 las dejan sin ningún caso de uso; el motor no las implementa
- Contenido de Warhammer 40.000 (v2): aparece en el selector como «Próximamente» y su fichero no existe
- Selección de héroes, escenario o conjuntos modulares concretos; contadores de vida o amenaza; editor de contenido; cuentas de usuario — fuera de alcance de todo el v1

## Subsequent Slice Plan

Cada fase posterior añade una rebanada vertical sobre este esqueleto sin alterar sus decisiones arquitectónicas:

- **Fase 2 — Bucle de ronda:** se autora la sección `round` con `repeats: true`; `expand()` empieza a calcular `loopStartIndex`/`loopEndIndex` sobre contenido real y la invariante Zod se endurece a «exactamente una». La cabecera pasa de `PREPARACIÓN · 8 de 21` a `RONDA 4 · Villano · 3 de 6` cambiando solo el contenido de la zona izquierda, sin tocar la estructura del componente
- **Fase 3 — Voz y pantalla encendida:** se cura el campo `speech` ya existente y se añaden `useSpeech()` y el wake lock como composables independientes; el hueco de 44×44dp reservado en la zona derecha de la cabecera aloja el control de silencio
- **Fase 4 — Instalación y offline:** se instala `@vite-pwa/nuxt` con `registerType: 'prompt'`, se añade el manifest (que puede declarar `orientation: landscape` como bloqueo real por encima del overlay CSS de esta fase) y entran en vigor las cabeceras de caché ya escritas en `netlify.toml`
