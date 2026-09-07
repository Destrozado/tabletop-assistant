---
phase: 05-cat-logo-de-h-roes-y-villanos
plan: 04
subsystem: content
tags: [zod, vitest, marvelcdb, gap-closure]

# Dependency graph
requires:
  - phase: 05-01/02/03
    provides: Contrato inicial del catálogo (CatalogueHero/HeroSchema) y content/marvel-characters.json committeado
provides:
  - CatalogueHero y HeroSchema con handSizeHero y handSizeAlterEgo (campo handSize legado eliminado por completo)
  - extractHero() del generador lee y valida las dos caras (card.hand_size y card.linked_card.hand_size)
  - content/marvel-characters.json regenerado con 23 héroes, los dos tamaños de mano por héroe, villanos byte-idénticos
  - Re-verificación contra el Rules Reference v1.7 (Apéndice III + entrada HAND SIZE) y determinismo D-10 reconfirmado con hashes
affects: [06-selección-de-personajes, 07-contadores-y-compatibilidad]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "z.strictObject rechaza claves legadas: renombrar un campo del contrato hace fallar CI en un catálogo sin regenerar, en vez de descartar la clave en silencio"

key-files:
  created: []
  modified:
    - engine/types.ts
    - engine/catalogueSchema.ts
    - engine/__tests__/catalogueSchema.test.ts
    - scripts/catalogue/fetch-marvelcdb.mjs
    - content/marvel-characters.json
    - engine/__tests__/characters.test.ts
    - .planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md

key-decisions:
  - "El campo handSize desaparece del repo sin alias de compatibilidad: no hay consumidores todavía (Fase 6 no existe), así que mantener el nombre ambiguo habría sido reintroducir el propio gap CR-01"
  - "El anexo fáctico de D-09 se corrige con un bloque nuevo añadido debajo del párrafo original, sin borrar ni reescribir la decisión del usuario — la decisión D-09 en sí (nadie edita el JSON a mano) sigue vigente"

requirements-completed: [CAT-01]

duration: 8min
completed: 2026-09-07
---

# Phase 05 Plan 04: Cierre del gap CR-01 (tamaño de mano por cara) Summary

**El catálogo de héroes pasa de un `handSize` ambiguo (siempre de alter ego) a `handSizeHero`/`handSizeAlterEgo` explícitos, con Spider-Man en 5/6 igual que el Rules Reference v1.7.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-07T21:14:00Z (aprox., tras el chequeo de rama del worktree)
- **Completed:** 2026-09-07T21:22:24Z
- **Tasks:** 3 completadas
- **Files modified:** 7

## Accomplishments
- `CatalogueHero`/`HeroSchema` guardan los dos tamaños de mano por separado; el esquema estricto rechaza la clave legada `handSize`, con test de regresión explícito
- `extractHero()` lee y valida `card.hand_size` (cara de héroe) y `card.linked_card.hand_size` (cara de alter ego), cada uno con su propia puerta de validación; el comentario junto a la extracción reemplaza la afirmación falsa de D-09 por la cita correcta del Rules Reference v1.7
- `content/marvel-characters.json` regenerado: 23 héroes con los dos campos, villanos byte-idénticos a antes del plan
- Re-verificación reproducida contra el PDF oficial (Apéndice III punto 14, entrada HAND SIZE, ejemplo impreso Spider-Man) y determinismo D-10 reconfirmado con dos ejecuciones consecutivas produciendo el mismo hash

## Task Commits

1. **Task 1: Contrato — CatalogueHero y HeroSchema pasan a dos tamaños de mano por cara** - `5a85804` (fix)
2. **Task 2: Generador — extraer las dos caras, borrar la afirmación falsa y regenerar el catálogo** - `6785e05` (fix)
3. **Task 3: Re-verificación — contrastar contra el PDF oficial y confirmar que el determinismo D-10 sigue en pie** - `cb1d3de` (docs)

_Nota: este plan no era TDD (no llevaba `tdd="true"`); cada tarea es un único commit atómico._

## Files Created/Modified
- `engine/types.ts` - `CatalogueHero` con `handSizeHero`/`handSizeAlterEgo`; comentario reescrito citando RR v1.7 Apéndice III
- `engine/catalogueSchema.ts` - `HeroSchema` con los dos campos como `z.number().int().positive()` dentro de `z.strictObject`
- `engine/__tests__/catalogueSchema.test.ts` - los tres héroes literales actualizados; tests de rango divididos por campo; test de regresión de la clave legada `handSize`
- `scripts/catalogue/fetch-marvelcdb.mjs` - `extractHero()` lee las dos caras con sus propias puertas de validación; comentario D-09 reemplazado
- `content/marvel-characters.json` - regenerado con los 23 héroes y los dos campos; 3 villanos sin cambios
- `engine/__tests__/characters.test.ts` - invariante de forma cubre `handSizeHero`/`handSizeAlterEgo`; test de regresión contra la clave legada
- `.planning/phases/05-cat-logo-de-h-roes-y-villanos/05-CONTEXT.md` - bloque de corrección bajo el "caso concreto" de D-09

## Decisions Made
- Sin alias de compatibilidad para `handSize`: no hay consumidores en el repo todavía (la Fase 6 aún no existe), así que dejar vivo el nombre ambiguo habría reintroducido el propio gap CR-01 que este plan cierra
- El anexo fáctico de D-09 se corrige con un bloque nuevo, sin tocar el párrafo original — registro histórico intacto de la decisión del usuario

## Deviations from Plan

**Ninguna deviación de código respecto al plan.** Una única fricción de entorno, no de contenido: el `node_modules` del worktree no traía `.nuxt/` generado (falta el paso `postinstall: nuxt prepare` en este checkout), lo que hacía fallar Vitest con `TSCONFIG_ERROR` al cargar `.nuxt/tsconfig.app.json`. Se resolvió ejecutando `npx nuxi prepare` antes de correr los tests — genera solo ficheros ya declarados en `.gitignore` (`.nuxt/`), no toca ningún fichero versionado ni forma parte de los `files_modified` del plan. No se documenta como Regla 1-3 de deviation porque no es un cambio de código: es un paso de arranque de entorno de desarrollo, equivalente a lo que `npm install` ya habría hecho.

## Issues Encountered
Ninguno más allá de lo anterior.

## User Setup Required
None - no se requiere configuración externa. El fichero PDF de referencia (`reference/mc_rulesreference_v17-compressed.pdf`) ya estaba presente en el checkout principal del repo (fuera de control de versiones, según `reference/README.md`); la Task 3 lo usó directamente sin necesidad de descarga.

## Verificación contra el Rules Reference v1.7 (evidencia reproducida, Task 3)

Citas localizadas con `pdftotext -layout` sobre el PDF oficial (no se copia texto largo, solo referencias de línea y fragmentos cortos, conforme a la restricción legal de `CLAUDE.md`):
- Línea 3679: `HAND SIZE 5 / HIT POINTS 10` (cara de héroe) junto con `HAND SIZE 6 / HIT POINTS 10` (cara de alter ego) — ejemplo impreso de Spider-Man, Apéndice III
- Línea 3631: `14. Hand Size. The number of cards this card's...` — anatomía de carta, punto 14
- Línea 1483: `Each player checks their hand size at the end of the player...` — entrada "HAND SIZE"

Cinco héroes contrastados (`handSizeHero`/`handSizeAlterEgo`), con su nivel de confianza:
| Héroe | Valor | Confianza |
|---|---|---|
| spider-man | 5/6 | ALTA — impreso literalmente en el Rules Reference v1.7 |
| iron-man | 1/6 | MEDIA — API pública de MarvelCDB; el 1 es el valor impreso real de la cara de héroe, no un error (la habilidad que lo modifica se resuelve en la Fase 7, nunca en el catálogo) |
| thor | 4/5 | MEDIA — API pública de MarvelCDB, sin confirmación directa contra el cartón físico |
| hulk | 4/5 | MEDIA — ídem |
| vision | 5/5 | MEDIA — ídem |

Determinismo D-10: dos ejecuciones consecutivas de `npm run catalogue:generate` produjeron el mismo hash:
`5a2bfdbb8d6d0e98111a8d674527dcd9032d047e7e22a5500a738989d5713701` (ambas ejecuciones, `content/marvel-characters.json`)

## Next Phase Readiness
- El gap CR-01 de `05-VERIFICATION.md` queda cerrado: la Fase 6/7 puede leer el tamaño de mano de la cara activa sin volver a tocar el catálogo ni re-descargar nada
- `npm run test` en verde (17 ficheros, 362 tests); `npx vitest run --project engine` en verde (12 ficheros, 239 tests)
- Queda pendiente el otro gap BLOCKER de `05-VERIFICATION.md` (CR-02, carga perezosa de puertas), asignado al plan 05-05

---
*Phase: 05-cat-logo-de-h-roes-y-villanos*
*Completed: 2026-09-07*
