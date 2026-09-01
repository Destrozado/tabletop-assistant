---
quick_id: 260901-jg1
slug: fusionar-pasos-de-apartar-el-conjunto-de
phase: quick-260901-jg1
plan: "01"
subsystem: content
tags: [marvel-champions, rules-fidelity, voice-generation, content-schema]
dependency-graph:
  requires: []
  provides:
    - "content/marvel-champions.json contentVersion 13: fusión setup.archienemigos.01+.02 en un único paso"
  affects:
    - engine/__tests__/content.test.ts
    - engine/__tests__/audio-ids.test.ts
    - engine/__tests__/voice-drift.test.ts
    - engine/__tests__/header.test.ts
    - engine/__tests__/navigator.test.ts
    - scripts/voice/manifest.json
    - public/audio/*.m4a
tech-stack:
  added: []
  patterns:
    - "reutiliza la poda de huérfanos de runBatch() (scripts/voice/generate.mjs) añadida en 260831-pym, sin cambios de diseño nuevos"
key-files:
  created: []
  modified:
    - content/marvel-champions.json
    - engine/__tests__/content.test.ts
    - engine/__tests__/audio-ids.test.ts
    - engine/__tests__/voice-drift.test.ts
    - engine/__tests__/navigator.test.ts
    - engine/__tests__/header.test.ts
    - scripts/voice/manifest.json
    - scripts/voice/styles.mjs
    - app/composables/usePreloadedAudio.ts
    - "app/pages/[game]/index.vue"
    - scripts/voice/generate.mjs
    - e2e/offline-flow.spec.ts
    - public/audio/setup.archienemigos.01.m4a
  deleted:
    - public/audio/setup.archienemigos.02.m4a
decisions:
  - "El id superviviente de la fusión es setup.archienemigos.01; setup.archienemigos.02 desaparece sin dejar hueco (la fase queda con un único paso .01), misma política de ids opacos que 260831-pym"
  - "El aviso ⚠ 'No se barajan en el mazo de encuentros' viaja del .02 desaparecido al .01 superviviente; el total de pasos con warning en el fichero sigue siendo 11"
  - "Cita compuesta en el paso fusionado: Apéndice II paso 5 (p.49, instrucción de preparación) + Nemesis Encounter Set (p.29, la regla 'out of play' que legitima el warning), ambas recontrastadas contra el Rules Reference v1.7 antes de tocar el JSON"
metrics:
  duration_minutes: 25
  completed: 2026-09-01
status: complete
---

# Phase quick-260901-jg1 Plan 01: Fusionar pasos de apartar el conjunto de archienemigo Summary

Fusión de `setup.archienemigos.01` ("Localizar Archienemigo") + `setup.archienemigos.02` ("Apartar fuera de la partida") en un único paso `setup.archienemigos.01` que dice las dos cosas y conserva el aviso — la recomendación que 01-06-SUMMARY.md había dejado abierta ("considerar fusionar `setup.archienemigos.01`/`.02`"), aplicada aquí con el mismo procedimiento que 260831-pym.

## Las citas, recontrastadas contra el Rules Reference v1.7 antes de tocar nada

Antes de editar el JSON se releyeron ambas páginas con `pdftotext -layout`:

- **p. 49, Apéndice II, paso 5** ("Set Aside Nemesis Sets"): *"For each identity being played, set aside their nemesis and the encounter cards of that nemesis."* — confirma el paso de preparación que manda apartar el conjunto de Némesis.
- **p. 29, Nemesis Encounter Set**: *"At the start of the game, each player sets aside the cards from their associated nemesis set, **out of play**."* — confirma literalmente que las cartas quedan fuera de la partida y por tanto no entran en el mazo de encuentros, que es lo que legitima conservar el `warning` tal cual y meter «fuera de la partida» en el texto fusionado.

Ambas quedaron confirmadas sin matices — no hizo falta ningún ajuste de contenido respecto al `<content_spec>` literal del plan.

## El paso fusionado

```json
{
  "id": "setup.archienemigos.01",
  "title": "Localizar y apartar Archienemigo",
  "kind": "step",
  "text": "Localizad y apartad fuera de la partida vuestro conjunto de Archienemigo (Némesis).",
  "warning": "No se barajan en el mazo de encuentros",
  "speech": "Localizad y apartad fuera de la partida vuestro conjunto de Archienemigo.",
  "citation": {
    "source": "rules-reference",
    "section": "Apéndice II, paso 5; Nemesis Encounter Set (p. 29)",
    "page": 49
  }
}
```

Medidas dentro de los topes de `engine/schema.ts`: `text` 83/90, `warning` 38/60, `speech` 73/120, `title` 32.

`contentVersion` sube de 12 a 13 — esto por sí solo invalida cualquier partida guardada que apuntase a `setup.archienemigos.02` (`resume()` en `engine/persistence.ts:78` descarta la sesión en cuanto `persisted.contentVersion !== fresh.contentVersion`, antes de resolver `runtimeId`). No hizo falta ningún código de migración ni de manejo de id desconocido.

## Tabla de recuentos, antes/después

| Magnitud | Antes | Después | Fichero |
|---|---|---|---|
| nodos aplanados totales | 33 | 32 | content.test.ts |
| pasos `kind:step` | 32 | 31 | content.test.ts |
| pasos con `warning` (total, no cambia — solo el id) | 11 | 11 (`.02`→`.01`) | content.test.ts |
| `contentVersion` | 12 | 13 | content.test.ts |
| entradas de audio (`collectSpeechEntries`) | 36 | 35 | audio-ids.test.ts |
| entradas del manifiesto | 36 | 35 | voice-drift.test.ts |
| `sequence.length` (normal/expert) | 33 | 32 | navigator.test.ts |
| `loopStartIndex` | 24 | 23 (el paso perdido vive ANTES del bucle, así que sí baja) | navigator.test.ts |
| `loopEndIndex` | 32 | 31 | navigator.test.ts |
| `SETUP_STEP_INDEX` (setup.encuentros.03) | 7 (8º paso) | 6 (7º paso) | header.test.ts |
| `SETUP_SUMMARY_INDEX` | 23 | 22 | header.test.ts |
| `PHASE_A_INDEX` | 26 | 25 | header.test.ts |
| `PHASE_B_INDEX` | 29 | 28 | header.test.ts |
| `PHASE_B_LAST_INDEX` | 32 | 31 | header.test.ts |
| posición de cabecera en `SETUP_STEP_INDEX` | `{8, 23}` | `{7, 22}` | header.test.ts |
| ficheros `.m4a` en `public/audio/` | 36 | 35 | disco |

## Evidencia RED tras la Tarea 2 (antes de regenerar audio)

Con el contenido ya fusionado y `contentVersion:13`, pero el manifiesto todavía sin regenerar, `npm test` dio exactamente el patrón esperado (idéntico en forma al de 260831-pym): **4 fallos, todos dentro de `voice-drift.test.ts`, 290/294 tests en verde**.

```
Test Files  1 failed | 13 passed (14)
     Tests  4 failed | 290 passed (294)

FAIL engine/__tests__/voice-drift.test.ts > D-04: cada frase speech tiene un audio con la huella al día
  Error: Audio desactualizado para: setup.archienemigos.01
  Ejecuta: npm run voice:generate -- setup.archienemigos.01

FAIL engine/__tests__/voice-drift.test.ts > el gate muerde: cambiar una frase speech en memoria hace que su audio quede desactualizado
  AssertionError: expected [ …(2) ] to have a length of 1 but got 2

FAIL engine/__tests__/voice-drift.test.ts > el manifiesto cubre exactamente el catálogo del motor
  Error: Sobran en el manifiesto: setup.archienemigos.02

FAIL engine/__tests__/voice-drift.test.ts > hay exactamente 35 entradas
  AssertionError: expected [ 'ronda.jugadores.01', …(35) ] to have a length of 35 but got 36
```

Este rojo es exactamente la evidencia de que el gate de deriva muerde de verdad — mismo patrón de 4 fallos que 260831-pym dejó documentado (huella desactualizada + entrada huérfana + recuento de entradas descuadrado dos veces por la misma causa raíz).

Tras la Tarea 3 (regeneración + `git rm` del huérfano):

```
Test Files  14 passed (14)
     Tests  294 passed (294)
```

## Audio regenerado

`npm run voice:generate -- setup.archienemigos.01` (sin `--force`, un único clip afectado — el único cuyo `speech` cambió):

- La misma ejecución podó sola la entrada huérfana `setup.archienemigos.02` del manifiesto (`runBatch()`, capacidad añadida en 260831-pym, reutilizada sin cambios).
- `public/audio/setup.archienemigos.02.m4a` retirado con `git rm` (queda en el historial de git, commit `0d7061e`).
- `public/audio/*.m4a`: **36 → 35**. `scripts/voice/manifest.json` tiene ahora 35 entradas; su único diff observado fue el propio del generador (hash/bytes/generatedAt de `setup.archienemigos.01`, desaparición del bloque `.02`, `generatedAt` de cabecera) — sin ninguna edición manual.

**Verificación auditiva**: no se pudo reproducir audio en este entorno de ejecución (worktree headless sin salida de audio). El clip nuevo pesa 167.566 bytes (muy por encima del umbral de 10 KB del gate) y su huella (`fingerprint`) casa exactamente con el `speech` actual según `voice-drift.test.ts` D-04. **Queda pendiente de un oído humano en la próxima partida** que Gemini haya pronunciado bien «Archienemigo» — el gate automático no cubre eso, igual que en 260831-pym.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.nuxt/tsconfig.app.json` ausente al arrancar Vitest en el worktree**
- **Encontrado en:** primer intento de `npx vitest run` para la Tarea 2.
- **Issue:** el worktree es un checkout fresco y `.nuxt/` (gitignored, generado) no existía; Vitest fallaba con `TSCONFIG_ERROR: Tsconfig not found` en los 4 ficheros de test antes de ejecutar ningún test.
- **Fix:** `npx nuxt prepare` — regenera `.nuxt/` (incluido su `tsconfig.app.json`) sin tocar ningún fichero versionado.
- **Ficheros modificados:** ninguno versionado (`.nuxt/` sigue gitignored).
- **Commit:** ninguno (no hay nada que commitear).

**2. [Rule 3 - Blocking] `.env` ausente en el worktree para `npm run voice:generate`**
- **Encontrado en:** antes de la Tarea 3, al comprobar los prerrequisitos de la regeneración de audio.
- **Issue:** el worktree es un checkout fresco; `.env` (gitignored, contiene `GEMINI_API_KEY`) no se propaga automáticamente entre worktrees.
- **Fix:** copiado desde el checkout principal (`cp /Users/vcompanyb/TableGameAssistant/.env .`), igual que documentó 260831-pym para el mismo caso. Nunca se imprimió su contenido; `git status --short .env` confirma que sigue sin trackear.
- **Ficheros modificados:** ninguno versionado.
- **Commit:** ninguno (no hay nada que commitear).

### Observaciones sin acción correctiva

**1. Comentario `~700 KB en total para los 35 clips` de `usePreloadedAudio.ts` se deja como aproximación, no recalculado.**
- El peso real actual de `public/audio/` es 1,4 MB (verificado con `du -sk`), no 700 KB — pero esa discrepancia ya existía ANTES de esta tarea (STATE.md la registra en 03.1-03: "37 ficheros .m4a... 1,4 MB en total"). El cambio neto de esta tarea es pequeño (retirar un `.m4a` de ~100 KB, regenerar uno de 250→167 KB), no "un cambio apreciable" que justifique recalcular la cifra según el propio criterio del plan ("ajusta también esa cifra si el peso total cambia de forma apreciable, si no déjala como aproximación"). Se deja tal cual, solo se actualizó "36"→"35".

## Threat Flags

Ninguno. Cambios de contenido (texto/voz) y de mantenimiento del catálogo de audio; ninguna superficie de red, autenticación o esquema nueva. El generador de voz sigue sin invocarse desde build/CI/producción (D-06).

## Self-Check: PASSED

Ficheros verificados:
- `content/marvel-champions.json` — FOUND, `contentVersion: 13` confirmado, fase `setup.archienemigos` con 1 solo paso `setup.archienemigos.01`
- `public/audio/setup.archienemigos.01.m4a` — FOUND
- `public/audio/setup.archienemigos.02.m4a` — CONFIRMED AUSENTE (retirado con `git rm`)
- `scripts/voice/manifest.json` — FOUND, 35 entradas, sin `setup.archienemigos.02`
- `ls public/audio/*.m4a | wc -l` → 35

Commits verificados en `git log --oneline`:
- `f95194b` fix(260901-jg1): fusionar pasos de archienemigo y subir contentVersion a 13 — FOUND
- `e5c0086` test(260901-jg1): actualizar recuentos e indices tras fusion de setup.archienemigos — FOUND
- `0d7061e` feat(260901-jg1): regenerar clip fusionado, retirar huerfano y cerrar la suite en verde — FOUND

`npm test`: 14 ficheros, 294/294 verde.
