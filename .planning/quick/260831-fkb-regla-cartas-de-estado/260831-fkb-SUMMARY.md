---
quick_id: 260831-fkb
slug: regla-cartas-de-estado
subsystem: content
tags: [zod, vue, marvel-champions, rules-fidelity, tts-audio-integrity]

# Dependency graph
requires:
  - phase: 01-07 / schema
    provides: "TextBlock, TextBlockSchema, patrón warning/warningDetail (D-32/DC-8) que este quick replica para options"
provides:
  - "Campo optionsWarningDetail de extremo a extremo (tipos, esquema, componente, página) como hermano pulsable de optionsWarning"
  - "Regla de Estados (Aturdido/Confundido coexisten, no se sustituyen) autorada en ronda.jugadores.01"
  - "ronda.villano.02 con warning y warningDetail coherentes entre sí (antes prometían orden de activación y contaban Estados)"
affects: [content-verification, engine-schema, step-screen-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "optionsWarningDetail sigue el mismo patrón que warningDetail: opcional, sin fallback en app/, con regla de dependencia en superRefine (base y variante por dificultad)"

key-files:
  created: []
  modified:
    - engine/types.ts
    - engine/schema.ts
    - app/components/StepScreen.vue
    - app/pages/[game]/index.vue
    - content/marvel-champions.json
    - engine/__tests__/content.test.ts

key-decisions:
  - "D-Q1: la explicación canónica de los Estados vive en ronda.jugadores.01 (optionsWarningDetail nuevo), no en villano.02 — es el sitio roto (aviso mudo) y el sitio accionable"
  - "D-Q2: ronda.villano.02 conserva su warningDetail de orden de activación; se reformula warning para hablar de las dos cosas, porque CONT-07 exige que ese warning case /estados/i"
  - "D-Q3: contentVersion se queda en 11 — no sube por cambios de texto, solo por cambios de secuencia; partidas a medias no se reinician"
  - "D-Q4: cero cambios en cualquier clave speech ni text — ninguna huella de audio se invalida, ningún clip queda obsoleto"
  - "D-Q5: paráfrasis únicamente, nunca cita literal del Rules Reference (restricción legal de CLAUDE.md)"
  - "D-Q6: se retira el gate de igualdad literal C2 (jugadores.01.optionsWarning === villano.02.warning) por dos gates independientes, porque cada aviso ya dice algo propio y distinto"

patterns-established:
  - "optionsWarningDetail espeja exactamente warningDetail: mismo tope de 320 caracteres, misma regla de dependencia en superRefine, misma variante por dificultad, mismo botón reutilizado en StepScreen.vue"

requirements-completed: []

# Metrics
duration: N/A (sesión previa + continuación)
completed: 2026-08-31
---

# Quick Task 260831-fkb: Regla de cartas de Estado Summary

**Campo `optionsWarningDetail` de extremo a extremo (tipos → esquema → UI → contenido) para desmontar el error de que Aturdido/Confundido se sustituyen entre sí, y aviso de `ronda.villano.02` reescrito para dejar de contradecir su propio modal.**

## Performance

- **Tasks:** 3 (2 `auto` + 1 `checkpoint:human-verify`, aprobado por el usuario)
- **Files modified:** 6

## Accomplishments

- El aviso "Atentos a los Estados en los personajes" del paso "Turnos de los jugadores" pasa de
  ser un `<p>` mudo a un botón pulsable (`⚠ … ›`) que abre el modal compartido con la regla
  completa de Estados.
- La regla deja explícito, en lenguaje de mesa (no cita literal del reglamento), que un
  personaje puede tener Aturdido y Confundido a la vez, que recibir uno no retira el otro, y
  que cada Estado solo se gasta cancelando la acción concreta que bloquea.
- `ronda.villano.02` deja de prometer una cosa en el aviso y contar otra en el detalle: su
  `warning` ahora habla de orden de activación **y** Estados (satisfaciendo CONT-07, que exige
  `/estados/i` ahí), y su `warningDetail` conserva los cinco hechos de orden de activación que
  ya existían, añadiendo solo el enganche de que Aturdido/Confundido cancelan esa activación.
- Ambas `citation.section` apuntan ahora también a Status Cards (Rules Reference v1.7, p. 39).
- Contrato genérico `optionsWarningDetail` disponible para cualquier paso futuro que necesite un
  aviso pulsable bajo su lista de opciones, con la misma regla de dependencia y el mismo tope de
  320 caracteres que `warningDetail`.

## Task Commits

1. **Task 1: Contrato `optionsWarningDetail` y su afordancia pulsable** — `eb6ca6b` (feat)
   `engine/types.ts`, `engine/schema.ts`, `app/components/StepScreen.vue`, `app/pages/[game]/index.vue`
2. **Task 2: Autorar la regla de Estados y hacer coherente el aviso de villano.02** — `3b2db30` (feat)
   `content/marvel-champions.json`, `engine/__tests__/content.test.ts`
3. **Task 3: checkpoint:human-verify** — sin commit propio (checkpoint de verificación); aprobado
   por el usuario con "Aprobado" tras revisar en apaisado el botón pulsable, el modal, la
   coexistencia Aturdido/Confundido y la coherencia del aviso de villano.02.

**Plan metadata:** este commit (`docs(quick-260831-fkb): ...`)

## Files Created/Modified

- `engine/types.ts` — `optionsWarningDetail?: string` en `TextBlock`, comentado como equivalente
  de `warningDetail` para la lista de opciones, sin fallback en `app/`.
- `engine/schema.ts` — `optionsWarningDetail` en `TextBlockSchema` (max 320) + regla de
  dependencia en `superRefine` (base y variante por dificultad), espejo de DC-8.
- `app/components/StepScreen.vue` — botón pulsable (mismas clases que el aviso principal) cuando
  hay `optionsWarningText` + `optionsWarningDetailText`; `<p>` plano si no hay detalle.
- `app/pages/[game]/index.vue` — `onOpenOptionsWarningDetail()`, mismo mecanismo de foco y mismo
  `activeDetail` compartido (tone `'warning'`).
- `content/marvel-champions.json` — `ronda.jugadores.01.optionsWarning` reformulado +
  `optionsWarningDetail` nuevo con la regla de Estados; `ronda.villano.02.warning` y
  `warningDetail` reformulados para ser coherentes entre sí; ambas `citation.section` actualizadas.
- `engine/__tests__/content.test.ts` — gate C2 de igualdad literal sustituido por dos gates
  independientes (D-Q6); test de literalidad de `villano.02.warning` sustituido por uno que
  protege los cinco hechos de orden de activación; tests nuevos de la regla de Estados en sí, del
  contrato genérico `optionsWarningDetail`/`optionsWarning`, del gate de dependencia huérfano, y
  extensión de D-08 (recuento de jugadores) a `optionsWarningDetail`.

## Decisions Made

Ver `key-decisions` en el frontmatter (D-Q1 a D-Q6, tomadas en planificación y aplicadas sin
revisitar). Las dos más relevantes para quien retome este contenido:

- **D-Q3** — `contentVersion` se queda en 11. `engine/persistence.ts:78` manda a
  `contentChangedFallback` (cursor 0, round 1) si `contentVersion` no coincide; subirla por un
  cambio puramente de texto castigaría a cualquier grupo con partida a medias sin motivo, porque
  este plan no añade, quita ni reordena ningún paso — la secuencia aplanada es idéntica.
- **D-Q4** — cero cambios en `speech`. `collectSpeechEntries()` deriva ids y huellas de audio
  solo de `step.id` y `speech` (y `variants.difficulty[*].speech`); `warning`, `warningDetail` y
  `optionsWarningDetail` quedan fuera de esa derivación por diseño, así que tocarlos no invalida
  ningún clip de audio ya generado ni agrava el bloqueo de cuota de 03.1-03.

## Hallazgo que cambió el diseño respecto al encargo original

El encargo original planteaba reformular libremente el aviso de `ronda.villano.02`. Al planificar
se encontró que **CONT-07** tiene un gate propio en `content.test.ts` que exige que ese `warning`
case `/estados/i` — no se puede dejar de mencionar Estados ahí sin romper el test. La salida
(D-Q2) fue que el aviso hable de las dos cosas a la vez (orden de activación y Estados) y que el
detalle haga lo mismo, en vez de mover la mención de Estados a otro sitio.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito, incluyendo las redacciones propuestas
para `optionsWarning`, `optionsWarningDetail`, `warning` y `warningDetail` (ver diff de
`content/marvel-champions.json` en el commit `3b2db30`, que coincide carácter por carácter con
lo especificado en el PLAN.md).

## Issues Encountered

None.

## Deuda anotada, no silenciada

El Rules Reference v1.7 p. 39 dice explícitamente que un personaje con un Estado que le impide
una acción **puede intentar esa acción igualmente** aunque no tenga objetivo válido, solo para
poder descartar el Estado (p. ej. intentar atacar sin objetivo válido, únicamente para gastar el
Aturdido; simétrico para Confundido y el intento de retirar amenaza). Es, con diferencia, el
detalle táctico más útil de la regla —explica una jugada legal que de otro modo parece absurda o
prohibida— y **no se incluyó** en `optionsWarningDetail` por el límite de 320 caracteres del
campo. Se priorizó, según la prioridad fijada en el PLAN.md, que quedara claro que Aturdido y
Confundido coexisten y que un Estado no retira al otro, que era el motivo concreto del encargo
(el error del vídeo). Este detalle **no** entraba en las exclusiones ya previstas por el plan
(Steady y "atacar sin objetivo" — que en realidad es exactamente este mismo hecho, ya anticipado
como fuera de presupuesto en la redacción propuesta del PLAN.md).

Sitio natural para retomarlo si se quiere ampliar la cobertura: un aviso propio en el paso de
atacar (o de retirar amenaza), donde el jugador ya está eligiendo la acción concreta que un
Estado bloquearía — mismo patrón `optionsWarning`/`optionsWarningDetail` que este quick acaba de
construir, aplicado a un paso distinto. Registrado también como concern en `STATE.md`.

## Verificación (realizada por el orquestador antes de este cierre)

- `npm run test`: 245/245 verde (confirmado de nuevo en este cierre).
- `contentVersion` sigue en 11.
- Cero líneas añadidas/quitadas que toquen `"speech"` o `"text"` en el diff de
  `content/marvel-champions.json`.
- **Huellas de audio recalculadas antes (`782b963`) y después (`HEAD`) del cambio: idénticas**
  (sha256 de `id|speech` de las 37 entradas, `3a315005063e4348…`). Ningún clip de la fase 03.1
  queda invalidado y no se necesita cuota de API adicional.
- `package.json` y `package-lock.json` sin cambios (cero dependencias npm nuevas).

## User Setup Required

None - no requiere configuración de servicio externo.

## Next Phase Readiness

- El contrato `optionsWarningDetail` queda disponible para reutilizarse en cualquier otro paso
  que necesite un aviso pulsable bajo su lista de opciones (mismo patrón, mismo tope, misma
  regla de dependencia).
- El detalle táctico de "atacar sin objetivo válido solo para gastar el Aturdido" queda
  pendiente como posible contenido futuro (ver "Deuda anotada" arriba) — no bloquea nada de lo
  planeado para 03.1-06 ni para el resto del milestone.
- No afecta al bloqueo activo de 03.1-03 (cuota de Gemini TTS, 9/37 clips): este quick no tocó
  ninguna clave `speech`, así que ese trabajo pendiente sigue exactamente igual.

---
*Quick task: 260831-fkb-regla-cartas-de-estado*
*Completed: 2026-08-31*
