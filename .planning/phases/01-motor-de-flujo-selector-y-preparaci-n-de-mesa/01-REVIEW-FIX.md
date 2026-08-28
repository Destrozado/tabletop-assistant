---
phase: 01-motor-de-flujo-selector-y-preparacion-de-mesa
fixed_at: 2026-08-28T22:18:00Z
review_path: .planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Fase 01: Informe de corrección de revisión de código

**Corregido en:** 2026-08-28T22:18:00Z
**Revisión origen:** `.planning/phases/01-motor-de-flujo-selector-y-preparaci-n-de-mesa/01-REVIEW.md`
**Iteración:** 1

**Resumen:**
- Hallazgos en alcance: 9 (1 Critical, 6 Warning, 2 Info — alcance completo aprobado por el usuario)
- Corregidos: 9
- Omitidos: 0

Baseline antes de tocar nada: `npm run test` → 56/56 verde, `npm run generate` → exit 0 (verificado en un worktree aislado con `npm install` limpio). Al terminar: `npm run test` → 61/61 verde (56 originales + 1 test de CR-01 + 3 tests de WR-06 + 1 test de contenido de WR-06), `npm run generate` → exit 0. Verificado también por grep que ninguna invariante arquitectónica se rompió: solo `engine/schema.ts` importa `zod`, solo `usePersistedSession.ts` toca `localStorage`, ningún `v-html`, y ningún componente importa `~~/engine` directamente.

## Issues corregidos

### CR-01: Datos persistidos parcialmente corruptos hacían crashear la app en el flujo "contenido cambiado"

**Ficheros modificados:** `app/composables/usePersistedSession.ts`, `engine/persistence.ts`, `engine/__tests__/persistence.test.ts`
**Commit:** `ea8e6f0`
**Fix aplicado:** Se escribió primero un test en `engine/__tests__/persistence.test.ts` que reproduce el crash (persisted con solo `formatVersion`, sin `context`) — confirmado que fallaba antes del fix (`expected undefined to be defined`). Luego se aplicaron dos capas de defensa:
1. `usePersistedSession.load()` ahora valida la forma COMPLETA de `PersistedPosition` (formatVersion, contentVersion, runtimeId, round, y que `context` sea un objeto), no solo la presencia de `formatVersion`. Un objeto parcial se trata como ausencia de dato.
2. `engine/persistence.ts`: `contentChangedFallback` ya no confía ciegamente en `persisted.context`; si no tiene forma de `SessionContext` válida, cae al `context` de la sesión fresca en vez de propagar `undefined` — última línea de defensa del motor, tal como sugería el propio hallazgo.
`usePersistedSession.ts` sigue siendo el ÚNICO fichero que toca `localStorage` (invariante intacta).

### WR-01: El valor por defecto de `kind` solo existía en Zod, nunca en el bundle del navegador

**Fichero modificado:** `app/composables/useGameSession.ts`
**Commit:** `b099fa0`
**Fix aplicado:** La computed `position` comparaba `node.step.kind === 'step'` con igualdad estricta. Se unificó con el mismo fallback `(node.step.kind ?? 'step') === 'step'` que ya usan `app/pages/[game]/index.vue` y `engine/__tests__/content.test.ts`. Se conservó el `.default('step')` de Zod (hay un test explícito en `schema.test.ts` — `'aplica kind: "step" por defecto...'` — que documenta esa elección como intencional), en vez de eliminarlo, para no romper ese contrato ya testeado.

### WR-02: El test de citas era más estricto que su propio nombre y que el esquema

**Fichero modificado:** `engine/__tests__/content.test.ts`
**Commit:** `518f023`
**Fix aplicado:** `expect(step.citation!.source).toBe('rules-reference')` → `expect(['rules-reference', 'learn-to-play']).toContain(step.citation!.source)`, exactamente como sugería el hallazgo.

### WR-03: `checklist` en "mesa lista" recorría TODAS las secciones del juego, no solo la sección actual

**Fichero modificado:** `app/pages/[game]/index.vue`
**Commit:** `fba9e59`
**Fix aplicado:** La computed `checklist` ahora se deriva de `game.sections.find(s => s.id === currentNode.value.sectionId)` en vez de `game.sections.flatMap(...)` sobre el array completo — acotada a la sección del nodo `summary` actual. Verificado con `npm run generate` (prerender exitoso) tras limpiar un problema de entorno no relacionado (ver nota de verificación abajo).

### WR-04: Ninguna fila del `IndexOverlay` alcanzaba el mínimo de 48px de target táctil

**Fichero modificado:** `app/components/IndexOverlay.vue`
**Commit:** `19aa486`
**Fix aplicado:** `min-h-11` (44px) → `min-h-12` (48px) en las filas pulsables del índice de salto. Verificado por `grep` que ningún otro control del proyecto (`NavBand`, `ConfirmDialog`, `ResumePrompt`, `MiniSetupScreen`, `AppHeader`) usa `min-h-11`/`h-11`/`w-11` — `IndexOverlay` era efectivamente la única excepción, como afirmaba el hallazgo.

### WR-05: Faltaba `lang="es"` (y título de página) en la configuración de la app

**Fichero modificado:** `nuxt.config.ts`
**Commit:** `c041ba9`
**Fix aplicado:** Se añadió `htmlAttrs: { lang: 'es' }` y `title: 'TableGameAssistant'` dentro de `app.head`, junto al meta `viewport` existente. Verificado inspeccionando el HTML generado por `npm run generate`: `lang="es"` y `<title>TableGameAssistant</title>` presentes en el output prerenderizado.

### WR-06: `MiniSetupScreen` hardcodeaba el rango de jugadores `[1,2,3,4]`

**Ficheros modificados:** `engine/types.ts`, `engine/schema.ts`, `content/marvel-champions.json`, `app/components/MiniSetupScreen.vue`, `app/pages/[game]/index.vue`, `engine/__tests__/schema.test.ts`, `engine/__tests__/content.test.ts`
**Commit:** `650cb3b`
**Fix aplicado:** Se añadieron `minPlayers`/`maxPlayers` opcionales a `GameDefinition`/`GameDefinitionSchema` (con una validación `superRefine` de que `minPlayers <= maxPlayers`), `content/marvel-champions.json` ahora declara `"minPlayers": 1, "maxPlayers": 4`, y `MiniSetupScreen` deriva su rango de botones (`playerCountOptions`) de las nuevas props `min-players`/`max-players` en vez de la lista tecleada `[1, 2, 3, 4]`. La página llamante pasa `game.minPlayers ?? 1` / `game.maxPlayers ?? 4` (fallback defensivo si el contenido no los declara). Se añadieron 4 tests nuevos cubriendo el campo opcional, la validación de rango inválido, y que el contenido real de Marvel Champions declara 1..4. No se tocó `contentVersion` (sigue en 6): añadir estos dos campos de metadatos no cambia la secuencia aplanada de pasos, así que no hay razón funcional para invalidar sesiones guardadas existentes.

### IN-01: Import `flatten` sin usar en `content.test.ts`

**Fichero modificado:** `engine/__tests__/content.test.ts`
**Commit:** `25ecd69`
**Fix aplicado:** Eliminada la línea `import { flatten } from '../flatten'`.

### IN-02: Comentario de `engine/toc.ts` nombraba "Marvel Champions" dentro del motor puro

**Fichero modificado:** `engine/toc.ts`
**Commit:** `b15aa5f`
**Fix aplicado:** "...cero conocimiento de los bloques de Marvel Champions (TECH-04)" → "...cero conocimiento de los bloques de un juego concreto (TECH-04)". Verificado por `grep -rin "marvel" engine/` que las únicas menciones restantes de "Marvel" en `engine/` están en los ficheros de test (`engine/__tests__/*.test.ts`), que legítimamente cargan y validan el contenido real de Marvel Champions como fixture de test — no son una violación de la invariante, que se refiere a la lógica del motor en sí, no a los tests de contenido.

## Issues omitidos

Ninguno — los 9 hallazgos en alcance se corrigieron.

## Notas de verificación

- **Entorno de worktree aislado:** este fixer se ejecutó en un `git worktree` separado (`gsd-reviewfix/01-*`) para no interferir con la sesión en curso, con `npm install` limpio (no un symlink a `node_modules` del repo principal — un symlink compartiendo `node_modules/.cache/nuxt` entre dos directorios de trabajo distintos causaba un error espurio `Package import specifier "#internal/nuxt/paths" is not defined` en `npm run generate`, no relacionado con ningún cambio de código; confirmado reproduciéndolo también sin ningún cambio aplicado, y resuelto con una instalación de `node_modules` propia y aislada para el worktree).
- `npm install` en el worktree solo emitió warnings `EBADENGINE` (Node 22.17.1 por debajo del rango declarado por Nuxt/Nitro) — advertencias, no fallos, tal como se documentó en el contexto de la tarea.
- No se dispuso de un type-checker de TypeScript funcional en este entorno (`npx vue-tsc`/`tsc` fallaron por incompatibilidades de resolución de módulos ajenas a este trabajo) — Tier 2 de verificación no disponible; se aceptó Tier 1 (relectura de cada fichero modificado) + Tier 3 (suite de tests completa + `npm run generate`) como evidencia, según la estrategia de verificación de 3 niveles.
- Todos los commits se hicieron en la rama temporal `gsd-reviewfix/01-*` dentro del worktree aislado; el flujo de limpieza transaccional (fast-forward de `master` → eliminación del worktree → borrado de la rama temporal → borrado del sentinel de recuperación) se ejecutó sin incidentes.

## Findings que NO se cambiaron pese a estar "en alcance" (ninguno)

No hay ningún hallazgo que se haya juzgado indebido de cambiar. Los 9 se corrigieron según lo descrito arriba. Sí se tomaron dos decisiones de diseño dentro del alcance de un hallazgo, documentadas explícitamente:
- **WR-01:** se optó por replicar el fallback `?? 'step'` en el sitio que le faltaba, en vez de eliminar el `.default('step')` de Zod, porque ese default ya está testeado explícitamente como comportamiento intencional en `schema.test.ts` — eliminarlo habría sido un cambio de alcance mayor al que pedía el hallazgo.
- **WR-06:** `minPlayers`/`maxPlayers` se añadieron como campos OPCIONALES (no obligatorios) en el esquema, para no forzar a todas las fixtures/tests existentes (`schema.test.ts`'s `baseGame()`, `tiny-game.json`) a declararlos. El contenido real de Marvel Champions sí los declara; la página llamante aplica un fallback defensivo (`?? 1` / `?? 4`) para contenido que no los declare.

---

_Corregido: 2026-08-28T22:18:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteración: 1_
