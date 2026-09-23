---
phase: quick-260923-3ri
plan: "01"
subsystem: content
tags: [marvel-champions, rules-fidelity, voice-generation, content, cr-03]

requires: []
provides:
  - "scripts/voice/convert.mjs: constructor puro buildM4aCommand (afconvert | ffmpeg)"
  - "scripts/voice/generate.mjs corre en Linux/WSL (ffmpeg de respaldo), sin cambiar macOS"
  - "variante expert de setup.escenario.04 cierta para Rhino, Ultron y Kang"
  - "todo CR-03 cerrado en .planning/todos/completed/ con resolución razonada"
  - "nuevo todo pendiente: combinación de etapas de villano en Experto para Rhino/Ultron, por verificar contra el reglamento"
affects: [voice-generation, marvel-champions-content, fase-8-valores-conocidos]

actuals:
  tokens: 5800
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "buildM4aCommand(converter, wavPath, m4aPath) como capa pura entre generate.mjs y el binario del sistema, para poder elegir entre afconvert/ffmpeg sin duplicar los argumentos de conversión"

key-files:
  created:
    - scripts/voice/convert.mjs
    - engine/__tests__/voice-convert.test.ts
    - .planning/todos/pending/experto-etapas-de-villano-rhino-ultron-por-verificar.md
  modified:
    - scripts/voice/generate.mjs
    - content/marvel-champions.json
    - public/audio/setup.escenario.04.expert.m4a
    - scripts/voice/manifest.json
    - .planning/todos/completed/cr-03-experto-sustitucion-cartas-rhino-ultron.md

key-decisions:
  - "DQ-1: variante expert reescrita a una redacción cierta para los tres villanos (paráfrasis de RR v1.7 p.28), en vez de la redacción condicional que el propio todo sugería"
  - "DQ-2: ffmpeg como respaldo de afconvert en generate.mjs, elegido por orden de preferencia (afconvert primero); macOS sin cambios"
  - "DQ-3: contentVersion se mantiene en 14 — ids y secuencia no cambian"
  - "DQ-4: todo CR-03 cerrado en .planning/todos/completed/ (directorio creado en este plan)"
  - "DQ-5: PROJECT.md y STATE.md no se tocan (ficheros compartidos del lote); la anotación de PROJECT.md la hace el coordinador"

patterns-established:
  - "Conversor de audio elegido en tiempo de ejecución por disponibilidad en el PATH, nunca hardcodeado a la plataforma"

requirements-completed: []

coverage:
  - id: D1
    description: "generador de voz funciona en Linux/WSL con ffmpeg de respaldo, sin cambiar el comportamiento en macOS"
    verification:
      - kind: unit
        ref: "engine/__tests__/voice-convert.test.ts (4 tests: afconvert, ffmpeg, conversor desconocido, SUPPORTED_CONVERTERS)"
        status: pass
      - kind: integration
        ref: "conversión real WAV sintético -> M4A vía ffmpeg, gate ffprobe 5 propiedades (AAC LC, 24kHz, mono, M4A) — ejecutado manualmente en esta máquina"
        status: pass
    human_judgment: false
  - id: D2
    description: "variante expert de setup.escenario.04 reescrita con una redacción cierta para Rhino, Ultron y Kang, con su clip de voz regenerado y alineado"
    verification:
      - kind: unit
        ref: "engine/__tests__/content.test.ts (findDifficultySwapStep, presupuestos de longitud), engine/__tests__/voice-drift.test.ts (D-04, 35 entradas), engine/__tests__/audio-ids.test.ts"
        status: pass
    human_judgment: true
    rationale: "La fidelidad de la redacción a las reglas del juego y la calidad/pronunciación del clip generado con ffmpeg (primer clip que no usa afconvert) requieren juicio humano; se deja anotado como comprobación no bloqueante para la próxima partida."
  - id: D3
    description: "todo CR-03 cerrado con resolución razonada; duda de reglas sobre etapas de villano en Experto para Rhino/Ultron capturada como todo nuevo, no perdida"
    verification:
      - kind: other
        ref: "grep de status/resolved_by/sección de Resolución en el todo cerrado; grep de status: pending en el todo nuevo"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-23
status: complete
---

# Quick 260923-3ri: Cerrar CR-03 (experto: sustitución de cartas de villano) Summary

**Reescrita la variante `expert` de `setup.escenario.04` a una redacción cierta para Rhino, Ultron y Kang; generador de voz con respaldo ffmpeg para Linux/WSL; CR-03 cerrado con resolución razonada.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3/3 completadas
- **Files modified:** 8 (más 1 movimiento de fichero pending->completed)

## Accomplishments

- `scripts/voice/generate.mjs` ya no exige `afconvert` a ciegas: elige el primer conversor disponible (`afconvert` en macOS, `ffmpeg` en Linux/WSL) a través del nuevo `scripts/voice/convert.mjs`, sin cambiar ni un argumento de la rama `afconvert`.
- CR-03 cerrado: la variante `expert` de `setup.escenario.04` ya no manda buscar cartas «del modo Experto» inexistentes para Rhino/Ultron; ahora dice, cierta para los tres villanos, que se usen las cartas de villano numeradas que indica el escenario para Experto.
- Un solo clip de voz regenerado (`setup.escenario.04.expert`, con ffmpeg); las otras 34 entradas del manifiesto y sus `.m4a` quedan intactos; `contentVersion` sigue en 14.
- Duda de reglas que CR-03 destapaba (si Rhino/Ultron cambian de combinación de etapas en Experto) capturada como todo nuevo `por-verificar`, redactada como pregunta, no como hecho.

## Task Commits

1. **Task 1 (RED): buildM4aCommand aún no existe** - `9038b42` (test)
2. **Task 1 (GREEN): ffmpeg de respaldo en el generador de voz** - `156ec83` (feat)
3. **Task 2: reescribir variante expert y regenerar su clip** - `6708402` (fix)
4. **Task 3: cerrar CR-03 y capturar duda de reglas** - `411cb73` (docs)

_El coordinador del lote hace el commit de metadatos (SUMMARY.md); no está incluido aquí._

## Files Created/Modified

- `scripts/voice/convert.mjs` - constructor puro `buildM4aCommand(converter, wavPath, m4aPath)` para afconvert/ffmpeg
- `engine/__tests__/voice-convert.test.ts` - 4 tests puros de `convert.mjs` (sin procesos, sin disco, sin red)
- `scripts/voice/generate.mjs` - elige conversor disponible en el PATH en vez de exigir afconvert; delega la conversión en `buildM4aCommand`
- `content/marvel-champions.json` - variante `expert` de `setup.escenario.04` reescrita (text + speech), 2 líneas cambiadas
- `public/audio/setup.escenario.04.expert.m4a` - clip regenerado (AAC LC, 24kHz, mono, 4.09s, generado con ffmpeg)
- `scripts/voice/manifest.json` - 1 entrada actualizada (huella + generatedAt), 34 intactas, 35 en total
- `.planning/todos/completed/cr-03-experto-sustitucion-cartas-rhino-ultron.md` - todo movido y cerrado con sección de Resolución
- `.planning/todos/pending/experto-etapas-de-villano-rhino-ultron-por-verificar.md` - nuevo todo con la duda de reglas abierta

## Decisions Made

- **DQ-1 (redacción):** se reescribió la variante `expert` a «Usad las cartas de villano numeradas (etapas) que indica el escenario para Experto» (text) / «Usad las cartas de villano numeradas que indica el escenario para el modo Experto» (speech) — paráfrasis directa de RR v1.7 p. 28 («using the listed expert mode villain stages»), cierta para los tres villanos. Se descartó la redacción condicional que el propio todo sugería porque asumía sin respaldo que Rhino/Ultron no cambian nada en Experto.
- **DQ-2 (ffmpeg de respaldo):** preferido a un `afconvert` falso en el PATH o a abortar el ítem; en macOS el comportamiento no cambia (mismos argumentos, misma prioridad).
- **DQ-3 (contentVersion 14):** ids y secuencia no cambian; el texto se resuelve fresco del contenido en cada carga, así que subir la versión invalidaría partidas en curso sin ganar nada.
- **DQ-4 (todo cerrado en completed/):** convención de las herramientas GSD; el directorio `.planning/todos/completed/` no existía y se creó en este plan.
- **DQ-5 (PROJECT.md/STATE.md sin tocar):** son ficheros compartidos por los ítems paralelos del lote 260923-3r*; la anotación de CR-03 como resuelto en PROJECT.md la hace el coordinador tras la fusión.

## Deviations from Plan

None de las Rules 1-4 (ningún bug, funcionalidad crítica faltante, bloqueo o cambio arquitectónico auto-resuelto fuera de lo ya planificado). Una nota de proceso, no una desviación de código:

**Nota: el paso 2 de la Task 2 (comprobación en rojo antes de gastar cuota) predijo "exactamente 1 test debe fallar (D-04)"; en la práctica fallaron 2.** `npx vitest run engine/__tests__/voice-drift.test.ts` dio 2 tests en rojo: `D-04` (como se esperaba, nombrando únicamente `setup.escenario.04.expert` como id obsoleto — verificado) y, además, `el gate muerde: cambiar una frase speech en memoria...`. Esta segunda prueba muta en memoria la PRIMERA entrada del recorrido (`setup.heroes.01`, no relacionada con este cambio) y espera `stale.length === 1`; como el contenido ya tenía una entrada genuinamente desalineada (`setup.escenario.04.expert`, por el cambio del Paso 1, todavía sin regenerar), el recuento subió a 2. No es una regresión de código ni indica que algún otro id quedara desalineado sin querer: `content.test.ts` y `audio-ids.test.ts` (los tests que el propio Paso 2 pedía comprobar en verde) pasaron sin problema, y tras regenerar el clip en el Paso 3 la suite completa (1133/1133) volvió a verde, incluidas las 8 pruebas de `voice-drift.test.ts`. Se continuó con la Task 2 sin PARAR, porque la regla de parada exige comprobar "que el drift nombre cualquier OTRO id" (no lo hizo) — la segunda prueba fallando es un efecto mecánico esperado de editar contenido antes de regenerar audio, no un dato nuevo sobre el estado del sistema.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CR-03 cerrado; la Fase 8 ya no tiene deuda pendiente sobre esta pregunta.
- **Comprobación humana NO bloqueante pendiente:** escuchar el clip `setup.escenario.04.expert` en la tablet en la próxima partida — es el primer clip generado con la conversión `ffmpeg` de esta máquina en vez de `afconvert`.
- Queda un todo nuevo por verificar (severidad `high`): si Rhino/Ultron cambian de combinación de etapas de villano en modo Experto (RR v1.7 p. 28/p. 48). No bloquea nada hoy; requiere el PDF del Rules Reference o el reglamento físico para resolverse. No tocar `engine/counters.ts` ni el catálogo hasta confirmarlo.
- Al cerrar el lote 260923-3r*, el coordinador debe anotar CR-03 como resuelto en `.planning/PROJECT.md` (no se toca aquí por DQ-5).

## Self-Check: PASSED

Todos los ficheros creados/movidos existen en disco y los 4 hashes de commit (`9038b42`, `156ec83`, `6708402`, `411cb73`) se encuentran en el historial de `develop`.

---
*Quick task: 260923-3ri*
*Completed: 2026-09-23*
