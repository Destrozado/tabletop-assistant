---
phase: 08-valores-conocidos-dentro-del-paso
plan: 03
subsystem: app
tags: [vue, composable, stepscreen, marvel-champions]

# Dependency graph
requires:
  - phase: 08-valores-conocidos-dentro-del-paso
    plan: 01
    provides: "StepValueKind y StepDefinition.value? declarados en tipo y esquema, aplicados a los cuatro pasos de D-03"
  - phase: 08-valores-conocidos-dentro-del-paso
    plan: 02
    provides: "engine/stepValues.ts: resolveStepValue/resolveStepValueRows, puros"
provides:
  - "useGameSession.ts expone stepValueSuffix (string | null) y stepValueRows (StepValueCell[] | null)"
  - "StepScreen.vue pinta el sufijo dentro de actionText y una lista sin afordancia bajo la frase"
  - "app/pages/[game]/index.vue pasa ambos props ya resueltos, sin importar el motor"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildStepValueSuffix/buildStepValueCells puros, hermanos de buildCounterCells, testeados sin montar Vue"
    - "null (no array vacío) como señal de 'el bloque no existe en el DOM', igual que selectionRows"

key-files:
  created: []
  modified:
    - app/composables/useGameSession.ts
    - app/composables/__tests__/useGameSession.test.ts
    - app/components/StepScreen.vue
    - app/pages/[game]/index.vue

key-decisions:
  - "D-08: el sufijo se interpola en el MISMO nodo de texto que actionText, sin span ni text-accent"
  - "D-09/D-32: la lista de valores es un <div>, nunca un <button> — sin chevron, sin @click, sin aria-label"
  - "D-10: sin rótulo (a diferencia de ELECCIÓN/Opciones)"
  - "D-14/D-15: stepValueRows es null (no []) cuando no hay ninguna fila conocida"

requirements-completed: [VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06]

# Metrics
duration: ~40min
completed: 2026-09-09
---

# Phase 08 Plan 03: Costura reactiva y render en pantalla Summary

**`useGameSession.ts` expone `stepValueSuffix`/`stepValueRows` derivados de `engine/stepValues.ts`, y `StepScreen.vue` los pinta: el paréntesis interpolado dentro de la frase grande (D-08) y una lista sin afordancia bajo ella (D-09/D-10/D-32) — verificado por el humano en el checkpoint bloqueante de la Task 3 con «Aprobado!».**

## Performance

- **Started:** 2026-09-09
- **Completed:** 2026-09-09
- **Tasks:** 3/3 completed

## Accomplishments

- `buildStepValueSuffix`/`buildStepValueCells` (funciones puras) y las computeds `stepValueSuffix`/`stepValueRows` añadidas a `useGameSession.ts`, junto a `counterCells`, sin comparar contra ningún id de contenido (D-01/TECH-04).
- 6 tests nuevos en `useGameSession.test.ts` (18/18 en el fichero) que fijan el formato del sufijo (`' (42)'`, `' (0)'`, `null`) y la ausencia por fila (D-14/D-15).
- `StepScreen.vue`: el sufijo se interpola en el mismo `<p>` de `actionText` (`{{ actionText }}{{ stepValueSuffix ?? '' }}`), y la lista de valores se pinta como bloque de `<div>` (nunca `<button>`) entre la frase grande y los avisos `⚠` (D-12), reutilizando la anatomía de fila de `selectionRows` sin su afordancia pulsable.
- `app/pages/[game]/index.vue` desestructura y pasa `stepValueSuffix`/`stepValueRows` ya resueltos, sin importar `~~/engine/*` para esta feature.
- `npm test`: 563/563 verde (555 base + 8 nuevos: 6 de `buildStepValueSuffix`/`buildStepValueCells` + los ya existentes de `stepValues.ts`/`voice-drift.test.ts` sin cambios). `npm run generate` completa sin error (SSG + PWA, 64 entradas de precache).

## Task Commits

1. **Task 1: Costura reactiva en `useGameSession.ts` (+ tests de las funciones puras)** - `1a99bdd` (feat)
2. **Task 2: Las dos superficies en `StepScreen.vue` y el paso de props en la página** - `1308551` (feat)
3. **Task 3: Verificación mecánica de VAL-04/05/06 y lectura humana de legibilidad** - checkpoint bloqueante, sin commit de código propio (ver "Verificación humana del checkpoint" abajo); cerrado con el commit de este SUMMARY

## Files Created/Modified

- `app/composables/useGameSession.ts` - `StepValueCell`, `buildStepValueSuffix`, `buildStepValueCells`, computeds `stepValueSuffix`/`stepValueRows`, añadidas al objeto de retorno tras `counterCells`
- `app/composables/__tests__/useGameSession.test.ts` - 6 tests nuevos (`buildStepValueSuffix`/`buildStepValueCells`)
- `app/components/StepScreen.vue` - props `stepValueSuffix`/`stepValueRows` (default `null`), sufijo interpolado en `actionText`, bloque de lista sin afordancia entre la frase y los avisos
- `app/pages/[game]/index.vue` - desestructuración y paso de los dos props nuevos a `<StepScreen>`

## Decisions Made

- Import combinado `import { resolveStepValue, resolveStepValueRows, type StepValueRow } from '~~/engine/stepValues'` (en vez de una línea de tipo separada) para que el criterio de aceptación `grep -c "from '~~/engine/stepValues'"` devuelva exactamente `1`.
- El comentario de `buildStepValueCells` describe el marcador de ausencia sin citar el carácter `'—'` entre comillas simples, para no hacer subir el conteo del criterio "el único uso sigue siendo el de `buildCounterCells`" (mismo patrón que 08-02 aplicó a `handSizeHero`/`'—'` en `engine/stepValues.ts`).

## Deviations from Plan

### Auto-fixed Issues

Ninguna — Tasks 1 y 2 se ejecutaron según el plan, con dos ajustes de redacción de comentarios (ver "Decisions Made") para satisfacer criterios de aceptación literales sin cambiar el comportamiento.

## Issues Encountered

- **Criterio literal no alcanzable, preexistente al plan (Task 2):** `grep -cE "~~/engine" app/pages/[game]/index.vue` devuelve `6`, no `0`. La página YA importaba de `~~/engine/*` antes de este plan (`collectAudioIds` de `~~/engine/audio`, `expand` de `~~/engine/expand`, `resume` de `~~/engine/persistence`, `PLAYER_NAME_MAX_LENGTH` de `~~/engine/selection`, `tableOfContents` de `~~/engine/toc`, más una mención en comentario) — verificado con `git show HEAD~2:'app/pages/[game]/index.vue' | grep -c '~~/engine'` = `6`, idéntico antes y después de este plan. Esta Task 3 (`useGameSession.ts` y `stepValueSuffix`/`stepValueRows`) no añade ningún import nuevo de `~~/engine/*` a la página — el criterio real que importa ("esta feature no importa el motor en la página") se cumple; el grep literal cuenta imports preexistentes de otras features, fuera del alcance de este plan (Scope Boundary).
- **Criterio literal de conteo de contexto (heredado de 08-01, reconfirmado aquí):** `git diff content/marvel-champions.json | grep -c '"text"\|"speech"'` (sin `-U0`, comparado contra el commit anterior al inicio de la fase) devuelve `8` por líneas de contexto sin modificar alrededor de cada inserción de `"value"`. Con `-U0` (sin contexto) el diff real muestra únicamente 4 líneas añadidas `"value": "..."` y 0 eliminadas — confirmado en la sección "Comprobaciones mecánicas" abajo.

## Comprobaciones mecánicas (VAL-04/VAL-05/VAL-06) — ejecutadas antes de pedir nada al humano

Todas ejecutadas el 2026-09-09, comparando `content/marvel-champions.json` contra el commit
inmediato anterior al inicio de la Fase 8 (`7ea3ca5^` = `41c2d4a`, el primer commit de la fase
es `7ea3ca5`), tal como exige el `<what-built>` de la Task 3 ("el `git diff` de toda la fase").

**Reejecutadas en la sesión de cierre (agente de continuación, 2026-09-09T10:44:38Z), tras
confirmar que los commits `1a99bdd` y `1308551` de las Tasks 1 y 2 ya estaban en el árbol —
mismos resultados que la primera pasada, evidencia fresca, no reciclada:**

**1. `git diff -U0 <base> -- content/marvel-champions.json | grep '^+[^+]'` → exactamente 4 líneas, las cuatro `"value":`**
```
+              "value": "heroHealth",
+              "value": "villainHealth",
+              "value": "handSizeAlterEgo",
+              "value": "handSizeAlterEgo",
```

**2. `git diff -U0 <base> -- content/marvel-champions.json | grep -c '^-[^-]'` → `0`**
```
0
```

**3. `git diff <base> -- content/marvel-champions.json | grep -c '"text"\|"speech"'` → `8` (con contexto; ver "Issues Encountered" — 0 líneas `+`/`-` de texto/voz)**
```
8
```

**4. `grep -c '"contentVersion": 13,' content/marvel-champions.json` → `1`**
```
1
```

**5. Recuento de clips vs. manifiesto (hoy 35 = 35; el ROADMAP dice «37», dato heredado ya erróneo — ver aviso del `<domain>` de la fase)**
```
$ ls public/audio/*.m4a | wc -l
      35
$ node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('scripts/voice/manifest.json','utf8')).entries).length)"
35
$ git status --porcelain public/audio scripts/voice/manifest.json
(vacío)
```

**6. `npx vitest run engine/__tests__/voice-drift.test.ts` → código 0, sin pedir regenerar ningún clip (VAL-05/VAL-06)**
```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

**7. `npm test` → código 0**
```
 Test Files  22 passed (22)
      Tests  563 passed (563)
```

**8. `grep -rn "handSizeHero" app/ engine/stepValues.ts` → ninguna coincidencia (D-05)**
```
(sin salida)
```

**9. Gate de build estático, no exigido literalmente por `<what-built>` pero sí por el
`<verification>` del plan (`npm run generate` completa) — reejecutado en la sesión de cierre:**
```
[nitro] ℹ Prerendering 4 routes
[nitro]   ├─ /404.html (19ms)
[nitro]   ├─ /200.html (19ms)
[nitro]   ├─ / (36ms)
[nitro]   ├─ /marvel-champions (37ms)
[nitro]   ├─ /_payload.json (0ms)
[nitro]   ├─ /marvel-champions/_payload.json (0ms)
[nitro] ℹ Prerendered 6 routes in 0.563 seconds
[nitro] ✔ Generated public .output/public

PWA v1.3.0
mode      generateSW
precache  64 entries (1683.14 KiB)
```
`git status --short` tras el build no muestra ningún fichero nuevo fuera de `.output/`
(ignorado) — confirma que el build no ha dejado nada sin commitear.

**Typecheck (`npx tsc --noEmit`), documentado como SKIPPED:** `tsc` y `vue-tsc` no están
instalados en este entorno (`which tsc vue-tsc` → "not found"; `npx tsc --version` resuelve al
paquete `typescript` no instalado, no al compilador). No es un fallo del plan: es una carencia
del entorno de ejecución de esta sesión, documentada tal cual la piden las
`<environment_facts>` de la continuación en vez de instalar nada por iniciativa propia. Las
dos superficies nuevas están cubiertas de todos modos por `npm test` (563/563, incluidos los
tests puros de Task 1) y por el hecho de que `npm run generate` compila con Vite/Rollup sin
error — un error de tipos en una interpolación de plantilla Vue suele fallar también en ese
paso de compilación, aunque no sea un sustituto estricto de `vue-tsc`.

## Verificación humana del checkpoint (Task 3)

**Veredicto: «Aprobado!»**

El humano confirmó explícitamente los 8 puntos de `<how-to-verify>` del plan:
1. El paréntesis de villano (` (42)`) se lee como una sola frase, mismo tamaño/color que el
   resto — sin bloque aparte ni número de otro color.
2. La lista por jugador se pinta sin ninguna afordancia (sin rótulo, sin chevron `›`, sin
   reacción al tacto).
3. La mano inicial muestra 6 para Spider-Man (cara Alter-Ego), no 5.
4. El aviso de mulligan (`⚠`) aparece DEBAJO de la lista, nunca encima.
5. La locución del botón de escucha/repetición dice la frase genérica sin ningún número.
6. Una partida nueva sin ninguna selección pinta los cuatro pasos exactamente como antes de
   la fase — sin paréntesis, sin lista, sin renglón vacío ni hueco reservado.
7. Con selección parcial (4 jugadores, héroe solo en el 1 y el 3) la lista trae únicamente
   esas dos filas, sin `'—'` ni fila en blanco.

No se ha registrado ninguna diferencia observada ni corrección de contenido pedida por el
humano. No se inventa ningún hallazgo humano más allá de esta aprobación explícita.

## User Setup Required

Ninguno. El checkpoint bloqueante de la Task 3 quedó resuelto con la aprobación humana
(«Aprobado!»); no se requiere ninguna acción adicional del usuario para cerrar el plan.

## Next Phase Readiness

Plan 08-03 completo — las tres tasks cerradas (dos con commit de código, una de verificación
con commit del propio SUMMARY). Con esto la Fase 8 (valores-conocidos-dentro-del-paso) queda
completa: los tres planes (08-01 tipo/esquema/contenido, 08-02 motor puro, 08-03 costura y
render) están terminados y verificados. Sin bloqueos conocidos para el siguiente hito.

## Self-Check: PASSED

- FOUND: app/composables/useGameSession.ts
- FOUND: app/composables/__tests__/useGameSession.test.ts
- FOUND: app/components/StepScreen.vue
- FOUND: app/pages/[game]/index.vue
- FOUND commit: 1a99bdd
- FOUND commit: 1308551
- Fresh re-run evidence (2026-09-09T10:44:38Z): `npm test` 563/563, `npx vitest run engine/__tests__/voice-drift.test.ts` 8/8, `npm run generate` completes (64 precache entries), content diff still exactly 4 added `"value":` lines / 0 removed, 35 `.m4a` = 35 manifest entries, `git status --porcelain public/audio scripts/voice/manifest.json` empty, `handSizeHero` grep empty.
