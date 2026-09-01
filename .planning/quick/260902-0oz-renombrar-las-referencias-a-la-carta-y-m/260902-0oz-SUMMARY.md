---
quick_id: 260902-0oz
slug: renombrar-las-referencias-a-la-carta-y-m
phase: quick-260902-0oz
plan: "01"
subsystem: content
tags: [marvel-champions, rules-fidelity, voice-generation, content]
dependency-graph:
  requires: []
  provides:
    - "content/marvel-champions.json: 5 pasos de preparación renombrados a «Plan Principal» (contentVersion se mantiene en 13)"
  affects:
    - scripts/voice/manifest.json
    - public/audio/setup.encuentros.01.m4a
    - public/audio/setup.escenario.01.m4a
    - public/audio/setup.escenario.06.m4a
    - public/audio/setup.escenario.07.m4a
    - public/audio/setup.escenario.08.m4a
tech-stack:
  added: []
  patterns:
    - "reutiliza el flujo de regeneración sin --force de scripts/voice/generate.mjs (mismo patrón que 260901-jg1), sin cambios de diseño nuevos"
key-files:
  created: []
  modified:
    - content/marvel-champions.json
    - scripts/voice/manifest.json
    - public/audio/setup.encuentros.01.m4a
    - public/audio/setup.escenario.01.m4a
    - public/audio/setup.escenario.06.m4a
    - public/audio/setup.escenario.07.m4a
    - public/audio/setup.escenario.08.m4a
  deleted: []
decisions:
  - "contentVersion se mantiene en 13, no sube: ni ids ni secuencia cambian, y resume() (engine/persistence.ts:78) solo descarta partidas guardadas cuando contentVersion difiere — subirlo tiraría una partida en curso a cambio de nada"
  - "setup.escenario.07 corrige de paso «cara B» → «cara 1B» (título, text y speech), alineando el contenido con su propia citation (que ya decía «paso 12b (voltear a cara 1B)» y con el Rules Reference"
metrics:
  duration_minutes: 20
  completed: 2026-09-02
status: complete
---

# Phase quick-260902-0oz Plan 01: Renombrar las referencias a la carta y mazo de escenario como Plan Principal Summary

Renombrados los 5 pasos de preparación de Marvel Champions que llamaban «carta de escenario» / «mazo de escenario principal» / «el escenario» (en el sentido de la carta física) a su nombre real en español: **Plan Principal**. El usuario se había quedado bloqueado en `setup.encuentros.01` buscando una «carta de escenario» que no existe con ese nombre impreso en la caja — el bloque «Contenido:» está en la cara 1A del **Plan Principal**.

## Citas reconfirmadas contra el Rules Reference v1.7 antes de tocar el JSON

Releídas con `pdftotext -layout reference/mc_rulesreference_v17-compressed.pdf` + grep en Apéndice II (p.49), las cuatro citas del plan casaron exactamente, sin ningún matiz que forzara desviarse del `<content_spec>` literal:

- **Paso 8:** *"Select Scenario. Select a scenario and put its villain deck and main scheme deck into play near the center of the play area."* → legitima «mazo de villano y mazo de Plan Principal» en `setup.escenario.01`.
- **Paso 10:** *"Create the Encounter Deck. Shuffle the encounter sets listed on side 1A of the main scheme card with the obligation cards..."* → legitima «indicados en el Plan Principal, cara 1A» en `setup.encuentros.01`, el paso que bloqueó al usuario.
- **Paso 12a:** *"Resolve any 'Setup' abilities on main scheme card 1A."* → `setup.escenario.06`.
- **Paso 12b:** *"Flip the main scheme card to side 1B and resolve any 'When Revealed' abilities on that side."* → `setup.escenario.07`/`.08`; confirma que la cara es **1B**, no «B» a secas como decía el texto anterior.

## Los 5 pasos renombrados

| id | Campo | Antes | Después |
|---|---|---|---|
| `setup.encuentros.01` | title | Reunir conjuntos del escenario | Reunir conjuntos de encuentro |
| | text | ...indicados en la carta de escenario. | ...indicados en el Plan Principal, cara 1A. |
| | speech | ...que indique la carta de escenario. | ...que indique el Plan Principal, cara 1A. |
| `setup.escenario.01` | title | Colocar mazos de villano y escenario | Colocar mazos de villano y Plan Principal |
| | text | ...el mazo de escenario principal... | ...el mazo de Plan Principal... |
| | speech | ...el de escenario principal... | ...el de Plan Principal... |
| `setup.escenario.06` | title | Resolver Preparación del escenario (cara 1A) | Resolver Preparación del Plan Principal (1A) |
| | text | ...en la carta de escenario, cara 1A. | ...en el Plan Principal, cara 1A. |
| | speech | ...de la carta de escenario, cara 1A. | ...del Plan Principal, cara 1A. |
| `setup.escenario.07` | title | Voltear a cara B y colocar amenaza | Voltear a cara 1B y colocar amenaza |
| | text/speech | ...el escenario a su cara B... | ...el Plan Principal a su cara 1B... |
| `setup.escenario.08` | title | Resolver Cuando se revela del escenario | Resolver Cuando se revela del Plan Principal |
| | text/speech | ...esa cara del escenario. | ...esa cara del Plan Principal. |

Todas las sustituciones aplicadas literalmente según el `<content_spec>` del plan, sin ajustes. Longitudes medidas dentro de los topes de `engine/schema.ts` (`text`≤90, `speech`≤120): el texto más largo quedó en 80/90, la voz más larga en 77/120.

Guardarraíl de alcance respetado: ningún `id`, `kind`, `citation` ni el orden/número de pasos se tocó. Los usos legítimos de «escenario» (título de sección «ESCENARIO DEL VILLANO», id `setup.escenario` y sus subids `.NN`, `summaryLabel`, y las variantes de dificultad de `setup.escenario.04` donde «escenario» significa la caja entera) sobreviven intactos.

## Decisión: contentVersion se mantiene en 13

A diferencia de 260901-jg1 (que subió `contentVersion` porque fusionaba dos ids en uno), aquí ni los ids ni la secuencia cambian — solo el texto de 5 pasos existentes. `resume()` (`engine/persistence.ts:78`) descarta una partida guardada en cuanto `contentVersion` difiere del contenido fresco, sin mirar si el `runtimeId` sigue existiendo. Subir la versión aquí solo serviría para invalidar la partida de alguien a media mesa sin ningún beneficio, porque el texto de un paso siempre se resuelve fresco del contenido actual, nunca se persiste. `engine/__tests__/content.test.ts:537` (que exige `contentVersion` exactamente 13) no se tocó.

## Evidencia RED tras la Tarea 1 (antes de regenerar audio)

Con el contenido ya editado pero el manifiesto todavía sin regenerar, `npx vitest run` dio:

```
Test Files  1 failed | 13 passed (14)
     Tests  2 failed | 292 passed (294)

FAIL engine/__tests__/voice-drift.test.ts > D-04: cada frase speech tiene un audio con la huella al día
  Error: Audio desactualizado para: setup.encuentros.01, setup.escenario.01, setup.escenario.06, setup.escenario.07, setup.escenario.08

FAIL engine/__tests__/voice-drift.test.ts > el gate muerde: cambiar una frase speech en memoria hace que su audio quede desactualizado
  AssertionError: expected [ …(6) ] to have a length of 1 but got 6
```

Este patrón coincide con el esperado por el plan: **únicamente** `voice-drift.test.ts` en rojo, con exactamente las 5 huellas nombradas explícitamente por sus ids, **cero huérfanos** y **cero descuadres de recuento** (los tests "el manifiesto cubre exactamente el catálogo" y "hay exactamente 35 entradas" pasaron en verde, porque ningún id cambió). El segundo fallo ("el gate muerde" con 6 en vez de 1) es el efecto colateral esperado de que ese test mutase una entrada adicional en memoria sobre un manifiesto que ya tenía 5 entradas obsoletas por la Tarea 1 — misma causa raíz, no un problema nuevo. Las suites acotadas (`schema`, `content`, `navigator`, `header`, `audio-ids`) dieron 133/133 en verde.

## Audio regenerado

`npm run voice:generate -- setup.encuentros.01 setup.escenario.01 setup.escenario.06 setup.escenario.07 setup.escenario.08` (sin `--force`, solo los 5 ids cuyo `speech` cambió):

- `public/audio/*.m4a`: se mantiene en **35** (ningún id cambió, así que no hay huérfanos que podar).
- `scripts/voice/manifest.json`: se mantiene en **35** entradas; el único diff observado fue el propio del generador (hash/bytes/`generatedAt` de los 5 ids regenerados + `generatedAt` de cabecera) — `git diff --stat` confirma 16 líneas +/- exactas (5 entradas × 3 campos + 1 de cabecera), sin ninguna edición manual.
- Los 5 clips pesan entre 38.508 y 45.942 bytes en disco (muy por encima del umbral de 10 KB del gate; el campo `bytes` del manifiesto registra el tamaño del PCM intermedio, no el fichero final, comportamiento preexistente del script).

Tras la Tarea 2:

```
Test Files  14 passed (14)
     Tests  294 passed (294)
```

**Verificación auditiva**: no se pudo reproducir audio en este entorno de ejecución (worktree headless sin salida de audio). **Queda pendiente de un oído humano en la próxima partida** que Gemini pronuncie bien «Plan Principal» y, sobre todo, «cara 1A» / «cara 1B» (riesgo real de que lea «uno A»/«uno B» de forma rara) — mismo tratamiento que 260901-jg1 dio a «Archienemigo».

## Deviations from Plan

Ninguna. El plan se ejecutó tal cual estaba escrito; las cuatro citas casaron sin matices y el patrón RED/GREEN salió exactamente como se anticipaba.

### Notas de entorno (sin acción correctiva, ya documentadas por 260901-jg1)

- El worktree es un checkout fresco: `.env` (gitignored, `GEMINI_API_KEY`) y `reference/mc_rulesreference_v17-compressed.pdf` (gitignored, contenido con copyright) no se propagan entre worktrees. Ambos se copiaron desde el checkout principal (`/Users/vcompanyb/TableGameAssistant`), nunca se imprimió su contenido, y `git status --short` confirma que ninguno quedó trackeado.

## Threat Flags

Ninguno. Cambios de contenido (texto/voz) puramente estáticos; ninguna superficie de red, autenticación o esquema nueva. El generador de voz sigue sin invocarse desde build/CI/producción (D-06, heredado).

## Self-Check: PASSED

Ficheros verificados:
- `content/marvel-champions.json` — FOUND, `contentVersion: 13` confirmado, los 5 ids mencionan «Plan Principal»
- `public/audio/setup.encuentros.01.m4a` — FOUND (45.942 bytes)
- `public/audio/setup.escenario.01.m4a` — FOUND (38.508 bytes)
- `public/audio/setup.escenario.06.m4a` — FOUND (42.193 bytes)
- `public/audio/setup.escenario.07.m4a` — FOUND (44.720 bytes)
- `public/audio/setup.escenario.08.m4a` — FOUND (42.004 bytes)
- `scripts/voice/manifest.json` — FOUND, 35 entradas
- `ls public/audio/*.m4a | wc -l` → 35

Commits verificados en `git log --oneline`:
- `0e767a4` fix(260902-0oz): renombrar carta y mazo de escenario como Plan Principal — FOUND
- `87bed2d` feat(260902-0oz): regenerar los 5 clips de Plan Principal y cerrar la suite en verde — FOUND

`npm test`: 14 ficheros, 294/294 verde.
