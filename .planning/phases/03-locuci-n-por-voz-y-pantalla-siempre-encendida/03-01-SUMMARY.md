---
phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida
plan: 01
subsystem: content
tags: [zod, vitest, tts-content, json]

# Dependency graph
requires:
  - phase: 02-bucle-de-ronda-y-reglas-verificadas
    provides: contenido de la sección ronda verificado (10 pasos con speech, precedente de registro y patrón de gate DC-1)
provides:
  - 27 frases `speech` nuevas (23 de los pasos de `setup` + 4 de variantes de dificultad), en el mismo registro imperativo/plural que las 10 de `ronda`
  - Gate de contenido endurecido: `speech` obligatoria en TODO paso `kind:'step'` (33/33), no solo en `ronda`
  - Gate D-41 nuevo: toda variante de dificultad con `text` propio exige `speech` propia
  - Gate D-39 nuevo: ninguna `speech` puede repetir el `warning` de su paso como subcadena
  - `contentVersion` en 11
affects: [03-02, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate de contenido de nivel superior (no anidado en describe de sección) que recorre allSteps(...).filter(kind==='step'), mismo filtro que el gate de citation — patrón reutilizable para cualquier campo futuro que deba ser obligatorio en todo paso salvo summary"
    - "Mensajes de aserción parametrizados (expect(x, `mensaje con ${id}`)) para que el rojo señale el id exacto sin tener que leer el stack trace"

key-files:
  created: []
  modified:
    - content/marvel-champions.json
    - engine/__tests__/content.test.ts

key-decisions:
  - "Ninguna speech nueva excede el text de su propio paso; 7 de las 23 coinciden literalmente con text cuando este ya era imperativo-plural y corto, evitando mayoría de coincidencias literales (precedente 7/10 de ronda)"
  - "setup.encuentros.04 mantiene speech idéntica a text ('una o más por identidad') por ser caso sensible a fidelidad de reglas señalado explícitamente en el plan"
  - "setup.escenario.05 y setup.escenario.09 conservan sus palabras clave completas (Preparación, Cuando se revela, dos habilidades distintas) en vez de comprimir de forma arriesgada"
  - "Las 4 speech de variante expresan el significado de SU PROPIA variante, nunca el del paso base — ningún speech se dejó heredar vía el fallback de engine/resolve.ts:15"

requirements-completed: [VOZ-01]

# Metrics
duration: 21min
completed: 2026-08-30
---

# Phase 3 Plan 01: Retrofit de contenido locutable Summary

**27 frases `speech` nuevas autoradas a mano (23 de preparación + 4 de variantes de dificultad) y gate de CI endurecido de 10 a 33 pasos obligatorios, cerrando el retrofit que el ROADMAP anticipaba desde la Fase 1.**

## Performance

- **Duration:** 21 min (17:04–17:25 aprox.)
- **Started:** 2026-08-30T15:04:00Z (aprox.)
- **Completed:** 2026-08-30T15:25:09Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Los 33 pasos `kind:'step'` del contenido (23 de `setup` + 10 de `ronda`) declaran ahora `speech`; el único `kind:'summary'` (`setup.mesa-lista.01`) sigue mudo a propósito (D-40)
- Las dos variantes de dificultad con `text` propio (`setup.encuentros.03`, `setup.escenario.04`) declaran `speech` propia y coherente con su propio significado, cerrando el bug latente de `engine/resolve.ts:15` que habría locutado la regla contraria a la mostrada en pantalla
- Gate de contenido endurecido de forma irreversible: un paso nuevo o una variante nueva sin `speech` hace fallar `npm test` señalando el id exacto
- `contentVersion` sube de 10 a 11, marcando esta carga de contenido para PERS-03

## Task Commits

Each task was committed atomically:

1. **Task 1: Endurecer el gate de contenido (D-38/D-40/D-41) — estado ROJO esperado** - `b2db91a` (test)
2. **Task 2: Autorar las 23 frases speech de la sección de preparación (D-38/D-39)** - `c99a81c` (content/feat)
3. **Task 3: Autorar las 4 frases de variante, subir contentVersion y poner el gate en verde (D-41)** - `8a43185` (content/feat)

**Plan metadata:** (pendiente — este SUMMARY se commitea junto con el cierre del plan)

_Nota: Task 1 dejó `npm test` deliberadamente en rojo (patrón MVP: test que falla primero); Tasks 2 y 3 lo devolvieron a verde._

## Files Created/Modified
- `engine/__tests__/content.test.ts` - Sustituye el gate DC-1 (10 pasos de ronda) por un gate ampliado a los 33 pasos `kind:'step'`, movido al `describe` de nivel superior junto al gate de `citation`; añade D-41 (variantes) y D-39 (no-eco del warning); actualiza la aserción de `contentVersion` a 11
- `content/marvel-champions.json` - Añade 27 claves `speech` nuevas (23 en pasos base de `setup`, 4 en variantes de dificultad de `setup.encuentros.03`/`setup.escenario.04`); sube `contentVersion` de 10 a 11

## Decisions Made
- Registro fijado por las 10 frases ya escritas de `ronda`: imperativo, plural, presente, sin relleno — se replicó sin desviaciones para las 23 nuevas
- Reformulación por defecto, coincidencia literal solo cuando el `text` ya era corto e imperativo-plural (7/23 casos), evitando que la mayoría coincida byte a byte con su `text` (auditado en el dossier de 03-05)
- Se conservó la formulación larga en los tres casos de riesgo de fidelidad señalados por el plan (`setup.encuentros.04`, `setup.escenario.05`, `setup.escenario.09`) en vez de comprimir y arriesgar el significado
- Ninguna variante de dificultad hereda `speech` del paso base: las 4 frases de variante son autoradas de forma independiente, alineadas con el `text` de su propia variante

## Tabla completa: 27 frases autoradas (id · text · speech)

### 23 pasos base de `setup`

| id | text | speech |
|----|------|--------|
| setup.heroes.01 | Decidid, como grupo, qué villano vais a enfrentar y qué héroe llevará cada jugador. | Decidid como grupo el villano al que os enfrentaréis y el héroe de cada jugador. |
| setup.heroes.02 | Colocad vuestra identidad por el lado Alter-Ego. | Colocad vuestra identidad por el lado Alter-Ego. |
| setup.heroes.03 | Ajustad vuestro dial de salud a la vida inicial de vuestra identidad. | Ajustad el dial de salud a la vida inicial de vuestra identidad. |
| setup.archienemigos.01 | Localizad el conjunto de Archienemigo (Nemesis) de vuestra identidad. | Buscad el conjunto de Archienemigo (Nemesis) de vuestra identidad. |
| setup.archienemigos.02 | Apartadlas fuera de la partida. | Apartadlas fuera de la partida. |
| setup.encuentros.01 | Reunid los conjuntos de encuentro indicados en la carta de escenario. | Reunid los conjuntos de encuentro que indique la carta de escenario. |
| setup.encuentros.02 | Añadid el conjunto de encuentro Estándar. | Añadid el conjunto de encuentro Estándar. |
| setup.encuentros.03 | Añadid el conjunto de encuentro adicional que corresponda a la dificultad elegida. | Añadid el conjunto de encuentro adicional según la dificultad elegida. |
| setup.encuentros.04 | Añadid las cartas de Obligación: una o más por identidad en juego. | Añadid las cartas de Obligación: una o más por identidad en juego. |
| setup.encuentros.05 | Barajad todos los conjuntos reunidos junto con las Obligaciones para formar el mazo. | Barajad los conjuntos reunidos junto con las Obligaciones para formar el mazo. |
| setup.escenario.01 | Colocad el mazo de villano y el mazo de escenario principal en el centro de la mesa. | Colocad el mazo de villano y el de escenario principal en el centro de la mesa. |
| setup.escenario.02 | Ajustad el dial de vida del villano al valor indicado en la carta de villano. | Ajustad el dial de vida del villano al valor indicado en la carta de villano. |
| setup.escenario.03 | Preparad la reserva común de fichas de daño, amenaza, aceleración y cartas de estado. | Preparad la reserva común de fichas de daño, amenaza, aceleración y estado. |
| setup.escenario.04 | Comprobad qué cartas de villano numeradas (etapas) exige la dificultad elegida. | Comprobad qué cartas de villano numeradas exige la dificultad elegida. |
| setup.escenario.05 | Buscad en mazos y zona apartada cartas con palabra clave Preparación y ponedlas en juego. | Buscad cartas con palabra clave Preparación en mazos y aparte, y ponedlas en juego. |
| setup.escenario.06 | Resolved cualquier habilidad de Preparación en la carta de escenario, cara 1A. | Resolved la habilidad de Preparación de la carta de escenario, cara 1A. |
| setup.escenario.07 | Voltead el escenario a su cara B y colocad la amenaza inicial indicada. | Voltead el escenario a su cara B y colocad la amenaza inicial indicada. |
| setup.escenario.08 | Resolved cualquier habilidad de Cuando se revela en esa cara del escenario. | Resolved la habilidad de Cuando se revela de esa cara del escenario. |
| setup.escenario.09 | Resolved cualquier habilidad de Preparación y de Cuando se revela en la carta de villano. | Resolved las habilidades de Preparación y de Cuando se revela en la carta de villano. |
| setup.manos.01 | Barajad vuestro mazo de jugador. | Barajad vuestro mazo de jugador. |
| setup.manos.02 | Robad cartas hasta completar vuestra mano inicial. | Robad hasta completar vuestra mano inicial. |
| setup.manos.03 | Podéis descartar cartas de vuestra mano y robar de nuevo hasta vuestra mano inicial. | Podéis descartar y robar de nuevo hasta vuestra mano inicial. |
| setup.jugador-inicial.01 | Resolved habilidades de Preparación en juego y decidid quién es el jugador inicial. | Resolved las habilidades de Preparación en juego y decidid el jugador inicial. |

### 4 variantes de dificultad

| id · variante | text | speech |
|----|------|--------|
| setup.encuentros.03 · normal | No añadáis ningún conjunto adicional en este paso. | No añadáis ningún conjunto adicional en este paso. |
| setup.encuentros.03 · expert | Añadid también el conjunto de encuentro Experto. | Añadid también el conjunto de encuentro Experto. |
| setup.escenario.04 · normal | Dejad las cartas de villano numeradas (etapas) tal como vienen con el escenario. | Dejad las cartas de villano numeradas tal como vienen con el escenario. |
| setup.escenario.04 · expert | Sustituid las cartas de villano numeradas por las del modo Experto de este escenario. | Sustituid las cartas de villano numeradas por las del modo Experto de este escenario. |

**Recuento de coincidencias literales speech==text:** 7 de 23 en los pasos base (heroes.02, archienemigos.02, encuentros.02, encuentros.04 — caso sensible a fidelidad de reglas, mantenido a propósito —, escenario.02, escenario.07, manos.01) + 3 de 4 en variantes (encuentros.03.normal, encuentros.03.expert, escenario.04.expert). Todas las coincidencias literales corresponden a frases que ya eran cortas e imperativo-plural en origen; ninguna se dejó igual por pereza de reformular.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ejecutado `nuxt prepare` para generar `.nuxt/tsconfig.app.json`**
- **Found during:** Task 1 (primera ejecución de `npx vitest run --project engine`)
- **Issue:** El worktree es un checkout fresco sin `.nuxt/` generado; Vitest fallaba con `TSCONFIG_ERROR: Failed to load tsconfig '.nuxt/tsconfig.app.json'` antes de poder ejecutar ningún test, bloqueando la verificación del estado ROJO exigido por la tarea
- **Fix:** `npx nuxt prepare` (mismo comando que ya corre como `postinstall` en `package.json`, no instala ningún paquete nuevo — solo regenera tipos/tsconfig derivados)
- **Files modified:** ninguno versionado (`.nuxt/` está fuera de control de versiones)
- **Verification:** `npx vitest run --project engine engine/__tests__/content.test.ts` pasó a ejecutar los 51 tests (3 fallando, como exigía el estado ROJO de la Tarea 1)
- **Committed in:** n/a (no genera cambios versionados)

---

**Total deviations:** 1 auto-fixed (1 blocking, sin instalación de paquetes)
**Impact on plan:** Ninguno sobre el alcance del contenido o del gate; solo desbloqueó la ejecución de la batería de tests en un checkout de worktree fresco.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - este plan solo autora contenido JSON y endurece un gate de Vitest; no toca componentes ni introduce datos vacíos/placeholder.

## Threat Flags

None - las mitigaciones T-03-01 (límite de 120 caracteres) y T-03-02 (gate D-41 de variantes) están implementadas exactamente como las describe el `threat_model` del plan, sin superficie nueva.

## Next Phase Readiness
- Los 33 pasos y las 4 variantes de dificultad tienen frase locutable lista para que 03-02 construya `useVoiceAnnouncer.ts` y conecte `SpeechSynthesisUtterance` sobre `resolveText(node, context).speech`
- `contentVersion: 11` ejercitará el camino "El contenido ha cambiado" (D-43) en cualquier sesión guardada con la versión 10, útil para la prueba de tablet del plan 03-05
- El dossier de revisión humana de 03-05 puede citar directamente la tabla de este SUMMARY (27 frases, recuento de coincidencias literales) sin tener que releer el JSON

## Self-Check: PASSED

- FOUND: content/marvel-champions.json
- FOUND: engine/__tests__/content.test.ts
- FOUND: .planning/phases/03-locuci-n-por-voz-y-pantalla-siempre-encendida/03-01-SUMMARY.md
- FOUND commit: b2db91a (Task 1)
- FOUND commit: c99a81c (Task 2)
- FOUND commit: 8a43185 (Task 3)
- FOUND commit: a085524 (docs: summary)

---
*Phase: 03-locuci-n-por-voz-y-pantalla-siempre-encendida*
*Completed: 2026-08-30*
