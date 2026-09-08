---
phase: 06-selecci-n-de-villano-h-roes-y-jugadores
plan: 02
subsystem: app-logic
tags: [seleccion-heroes, catalogo, filtro, i18n-alias, tests]
dependency-graph:
  requires: []
  provides:
    - app/composables/useCharacterCatalogue.ts
    - app/data/spanish-hero-aliases.ts
    - app/composables/useHeroSearch.ts
  affects:
    - 06-04-PLAN.md (StepScreen.vue extendido consumirá buildHeroOptions/buildVillainOptions)
    - 06-05-PLAN.md / 06-06-PLAN.md (VillainPickerModal.vue / PlayerModal.vue consumirán las funciones puras)
    - 06-03-PLAN.md (revisión humana bloqueante D-07 de los 23 alias)
tech-stack:
  added: []
  patterns:
    - "Composable sin estado (useHeroSearch): funciones puras exportadas, sin ref/computed/onMounted, mismo patrón que la mitad pura de useStepShortcuts.ts"
    - "Import estático de catálogo calcado de useGameContent.ts, sin zod ni referencia al script generador"
    - "Filtrar (normalize('NFD') + strip de marcas) y ordenar (localeCompare('es')) como mecanismos deliberadamente distintos (DC-05/DC-06)"
key-files:
  created:
    - app/composables/useCharacterCatalogue.ts
    - app/data/spanish-hero-aliases.ts
    - app/composables/useHeroSearch.ts
    - app/composables/__tests__/useHeroSearch.test.ts
  modified: []
decisions:
  - "El plan's Task 1 acceptance-criteria grep script (id+':' sin comillas) no detecta claves de objeto correctamente entrecomilladas; verificado el requisito real (los 23 ids del catálogo aparecen como clave) con un regex consciente de comillas — ver Deviations"
metrics:
  duration: "~45min"
  completed: "2026-09-08"
---

# Phase 6 Plan 02: Catálogo, alias en español y lógica pura de selección — Summary

Composable de acceso al catálogo, mapa de 23 alias en español pendiente de revisión humana, y un módulo de doce funciones puras (filtro insensible a acentos/mayúsculas, orden alfabético español, rótulos por defecto y detección de héroe repetido) con 51 tests en el proyecto `app-logic`.

## What Was Built

1. **`app/composables/useCharacterCatalogue.ts`** — acceso a `content/marvel-characters.json` por import estático, calcado literalmente de `useGameContent.ts`. No importa `zod` ni el validador de esquema del catálogo (T-01-19); pasa el gate `engine/__tests__/catalogue-isolation.test.ts` sin cambios.

2. **`app/data/spanish-hero-aliases.ts`** — `export const spanishHeroAliases: Record<string, string>` con las 23 entradas de héroe en el orden del catálogo. Cabecera marcada visiblemente **PENDIENTE DE REVISIÓN HUMANA (D-07)**: los alias los ha propuesto Claude a partir del nombre habitual en español de cada personaje; 20 de las 23 líneas llevan `// D-07: confirmar` porque su traducción no es literal o admite variante conocida (p. ej. `quicksilver: 'Mercurio'`, `deadpool: 'Masacre'`); las 3 restantes (Iron Man, Thor, Hulk, Drax, Nova — nombres que coinciden con el inglés) no lo llevan. El plan 06-03 (revisión bloqueante contra las cartas físicas) es quien retira esta marca, no este plan.

3. **`app/composables/useHeroSearch.ts`** — módulo de funciones puras exportadas (sin `ref`/`computed`/`onMounted`, sin import de Vue):
   - `normalizeForSearch` — minúsculas + NFD + strip de marcas combinantes; pliega `ñ`→`n` a propósito (DC-05).
   - `resolveHeroSpanishName` — alias si existe y no está vacío, si no el nombre inglés del catálogo (D-05, nunca falla).
   - `buildHeroOptions` / `buildVillainOptions` — copia ordenada con `localeCompare('es')`, nunca mutan el array recibido.
   - `matchesHeroQuery` / `filterHeroOptions` — SEL-05/D-08: subcadena, no prefijo, sobre nombre español + inglés + alter ego.
   - `findHeroOption` / `findVillainOption` — un id inexistente se comporta como «sin elegir», nunca revienta.
   - `resolvePlayerLabel` — «Jugador N» si el nombre está vacío o solo espacios (D-15/SEL-06).
   - `joinNames` — fórmula única compartida (`A` / `A y B` / `A, B y C`).
   - `buildTakenByMap` — texto ya unido de los rótulos de los demás huecos que llevan el mismo héroe, nunca el propio hueco.
   - `buildDuplicateWarningText` — las cuatro variantes literales del Copywriting Contract (pareja, trío, los 4, dos parejas separadas por `·`), sin el glifo de aviso (lo pone el componente); avisa, nunca bloquea (SEL-07/D-16).

4. **`app/composables/__tests__/useHeroSearch.test.ts`** — 51 tests, incluidos: el caso `ñ` (`'ARAÑA'` → `'arana'`), el mapa de alias contra el catálogo real (ningún alias huérfano, ninguno vacío, los 23 héroes cubiertos), las cinco variantes de `matchesHeroQuery` (español/inglés/alter ego/mayúsculas/acento/subcadena), y las cuatro cadenas literales exactas del aviso de repetido.

## Verification

- `npm test`: **18 ficheros / 425 tests en verde** (baseline antes de este plan: 17/374 — +1 fichero, +51 tests).
- `npx vitest run --project engine engine/__tests__/catalogue-isolation.test.ts`: verde, 12/12.
- `grep -rc "v-html" app/` y `grep -rEc "from 'zod'" app/`: ninguna coincidencia.
- `git status --porcelain engine/ content/`: vacío — este plan no tocó el motor ni el contenido.
- Cabecera de `app/data/spanish-hero-aliases.ts` declara explícitamente el estado PENDIENTE de la revisión D-07.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking issue] `.nuxt/` no existía; `npm test` fallaba en las 17 suites por un tsconfig ausente**
- **Found during:** verificación del baseline, antes de Task 1.
- **Issue:** `vitest` resuelve `.nuxt/tsconfig.app.json` (generado por Nuxt) y el directorio no existía en el worktree recién creado; las 17 suites existentes fallaban con `[TSCONFIG_ERROR] Tsconfig not found`.
- **Fix:** `npx nuxt prepare` (genera `.nuxt/` con los tipos/tsconfig). No es un cambio de código versionado — `.nuxt/` está en `.gitignore` — así que no hay commit asociado; se documenta aquí porque sin este paso el baseline de 17/374 exigido no era observable.
- **Files modified:** ninguno (directorio generado, gitignored).
- **Commit:** N/A.

**2. [Rule 1 - bug propio, detectado antes de commitear] Comentarios de cabecera contenían literalmente las cadenas prohibidas por los gates de acceptance-criteria**
- **Found during:** Task 1 (verificación de acceptance criteria) y Task 3 (verificación de acceptance criteria).
- **Issue:** al explicar en prosa qué NO se importa/qué NO debe aparecer, los comentarios de `useCharacterCatalogue.ts` y `spanish-hero-aliases.ts` citaban literalmente `engine/catalogueSchema` y `fetch-marvelcdb.mjs`; y `useHeroSearch.ts` citaba literalmente `normalize('NFD')`/`localeCompare`/`Héroes repetidos: ` dentro de comentarios explicativos, además de `onMounted`/`from 'vue'` al describir qué NO se usa. Cada uno de estos hacía que el grep de acceptance-criteria correspondiente devolviera un conteo mayor del exigido (falso positivo: el código es correcto, pero el texto explicativo activa el propio gate que describe).
- **Fix:** reescritos los comentarios para transmitir el mismo significado sin reproducir la cadena literal exacta (p. ej. "el validador de esquema del catálogo" en vez de la ruta literal; "normalizando a la forma de descomposición Unicode" en vez de citar la llamada exacta una segunda vez).
- **Files modified:** `app/composables/useCharacterCatalogue.ts`, `app/data/spanish-hero-aliases.ts`, `app/composables/useHeroSearch.ts`.
- **Commit:** incluido en `6cd94aa` y `f4c188d`.

**3. [Rule 1 - bug en el propio test, no en el código de producción] `it()` con literal duplicado y glifo de aviso en el fichero de test**
- **Found during:** Task 3 (verificación de acceptance criteria).
- **Issue:** dos descripciones de `it()` citaban el texto literal exacto esperado (`"Los 4 jugadores llevan el mismo héroe"` y `"Héroes repetidos: Ana y Bruno · Carla y Dani"`), duplicando la cadena que la propia aserción de abajo ya contiene y haciendo que el conteo de acceptance-criteria pidiera exactamente 1 devolviera 2; y una descripción + una aserción usaban el glifo de aviso literal, cuando la acceptance-criteria exige 0 apariciones de ese carácter en todo el fichero de test.
- **Fix:** reescritas las descripciones de `it()` para no repetir el literal (describen el comportamiento, no citan la cadena exacta); sustituido el glifo literal por su código de escape Unicode (`'⚠'`) en la única aserción que lo necesitaba, preservando el comportamiento del test.
- **Files modified:** `app/composables/__tests__/useHeroSearch.test.ts`.
- **Commit:** incluido en `25f0900`.

### Documented but not code-changed

**4. [Verificación del plan, no un bug de mi código] El script de acceptance-criteria de la Task 1 (`node -e ...` con regex `(^|\s)id:`) no detecta claves de objeto entrecomilladas**
- **Found during:** verificación de la Task 1.
- **Issue:** la acceptance-criteria de la Task 1 usa un regex `(^|\s)${id}:` para comprobar que los 23 ids del catálogo aparecen como clave en `spanish-hero-aliases.ts`. Como los ids contienen guiones (`spider-man`), son claves de objeto TypeScript válidas SOLO entrecomilladas (`'spider-man': 'Spider-Man'`) — la forma sin comillas del pseudocódigo del plan (`spider-man: 'Spider-Man'`) es sintácticamente inválida en JS/TS (el guion se interpretaría como resta). Con comillas, el carácter inmediatamente anterior a `:` es la comilla de cierre, no un espacio, así que el regex literal del plan nunca casa y el script siempre reporta los 23 ids como "missing", pese a que las 23 claves sí existen.
- **Resolution:** verificado el requisito real con un regex consciente de comillas (`` `'${id}':` ``) — confirma que las 23 claves están presentes. La Task 3 además cubre esto con un test real (`el mapa de alias contra el catálogo real`) que importa ambos ficheros y comprueba la cobertura completa sin depender de un regex de texto plano.
- **No se modifica el código de producción**: la tabla de alias es correcta; el script de verificación del plan tiene un defecto de diseño (asume sintaxis de clave sin comillas, imposible con ids que llevan guion).
- **Files modified:** ninguno.
- **Commit:** N/A (hallazgo de verificación, documentado aquí).

## Known Stubs

Ninguno. Los tres ficheros nuevos y su suite de tests son funcionalidad completa y consumible tal cual — nada queda con datos vacíos o placeholder salvo la marca deliberada de PENDIENTE de D-07 en `spanish-hero-aliases.ts`, que es el contrato explícito de este plan (el plan 06-03 la resuelve).

## Threat Flags

Ninguno. Este plan no introduce endpoints, rutas de autenticación, ni cambios de esquema de persistencia — es lógica pura de lectura del catálogo ya existente y un mapa de datos estático nuevo. El threat model del plan (T-06-05, T-06-06, T-06-07) queda cubierto: `findHeroOption`/`findVillainOption` devuelven `null` ante un id inexistente (Task 3, bloque 10); el catálogo se alcanza sin red ni `zod` (Task 1, gate de aislamiento verde); y `buildDuplicateWarningText`/`resolvePlayerLabel` devuelven únicamente texto plano, sin markup.

## Self-Check: PASSED

- FOUND: `app/composables/useCharacterCatalogue.ts`
- FOUND: `app/data/spanish-hero-aliases.ts`
- FOUND: `app/composables/useHeroSearch.ts`
- FOUND: `app/composables/__tests__/useHeroSearch.test.ts`
- FOUND commit `6cd94aa` (Task 1)
- FOUND commit `f4c188d` (Task 2)
- FOUND commit `25f0900` (Task 3)
